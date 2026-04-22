from datetime import datetime, timedelta

from sqlalchemy import func
from flask import Blueprint, jsonify

from .auth import require_api_key
from .models import Alert, Incident, ResponseAction

dashboard_api = Blueprint("dashboard_api", __name__)


@dashboard_api.get("/metrics")
@require_api_key(roles=["analyst", "admin"])
def get_metrics():
    total_alerts = Alert.query.count()
    suppressed_alerts = Alert.query.filter_by(status="suppressed").count()
    open_incidents = Incident.query.filter(Incident.status.in_(["open", "mitigated"])).count()
    closed_incidents = Incident.query.filter_by(status="closed").count()
    total_actions = ResponseAction.query.count()

    severity_rows = (
        Incident.query.with_entities(Incident.severity, func.count(Incident.id))
        .group_by(Incident.severity)
        .all()
    )
    by_severity = {row[0]: row[1] for row in severity_rows}

    false_positive_rate = round((suppressed_alerts / total_alerts), 2) if total_alerts else 0

    return jsonify(
        {
            "total_alerts": total_alerts,
            "suppressed_alerts": suppressed_alerts,
            "false_positive_rate": false_positive_rate,
            "open_incidents": open_incidents,
            "closed_incidents": closed_incidents,
            "total_response_actions": total_actions,
            "incidents_by_severity": by_severity,
        }
    )


@dashboard_api.get("/overview")
@require_api_key(roles=["analyst", "admin"])
def get_overview():
    total_alerts = Alert.query.count()
    total_incidents = Incident.query.count()
    total_actions = ResponseAction.query.count()

    triaged_alerts = Alert.query.filter_by(status="triaged").count()
    mitigated_incidents = Incident.query.filter_by(status="mitigated").count()
    unresolved_incidents = Incident.query.filter(Incident.status.in_(["open", "in_review"])).count()

    attack_rows = (
        Alert.query.with_entities(Alert.attack_type, func.count(Alert.id))
        .group_by(Alert.attack_type)
        .order_by(func.count(Alert.id).desc())
        .all()
    )

    action_rows = (
        ResponseAction.query.with_entities(ResponseAction.action_type, func.count(ResponseAction.id))
        .group_by(ResponseAction.action_type)
        .order_by(func.count(ResponseAction.id).desc())
        .all()
    )

    return jsonify(
        {
            "kpis": {
                "total_alerts": total_alerts,
                "total_incidents": total_incidents,
                "total_playbook_actions": total_actions,
                "triaged_alerts": triaged_alerts,
                "mitigated_incidents": mitigated_incidents,
                "unresolved_incidents": unresolved_incidents,
            },
            "attack_distribution": [
                {"name": row[0], "value": row[1]} for row in attack_rows
            ],
            "action_distribution": [
                {"name": row[0], "value": row[1]} for row in action_rows
            ],
        }
    )


@dashboard_api.get("/timeseries")
@require_api_key(roles=["analyst", "admin"])
def get_timeseries():
    days = 7
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=days - 1)

    alert_rows = (
        Alert.query.with_entities(func.date(Alert.created_at), func.count(Alert.id))
        .filter(Alert.created_at >= start_date)
        .group_by(func.date(Alert.created_at))
        .all()
    )
    incident_rows = (
        Incident.query.with_entities(func.date(Incident.created_at), func.count(Incident.id))
        .filter(Incident.created_at >= start_date)
        .group_by(func.date(Incident.created_at))
        .all()
    )
    action_rows = (
        ResponseAction.query.with_entities(func.date(ResponseAction.created_at), func.count(ResponseAction.id))
        .filter(ResponseAction.created_at >= start_date)
        .group_by(func.date(ResponseAction.created_at))
        .all()
    )

    alert_map = {str(row[0]): row[1] for row in alert_rows}
    incident_map = {str(row[0]): row[1] for row in incident_rows}
    action_map = {str(row[0]): row[1] for row in action_rows}

    points = []
    for offset in range(days):
        day = start_date + timedelta(days=offset)
        day_key = str(day)
        points.append(
            {
                "date": day_key,
                "alerts": alert_map.get(day_key, 0),
                "incidents": incident_map.get(day_key, 0),
                "actions": action_map.get(day_key, 0),
            }
        )

    return jsonify({"points": points})
