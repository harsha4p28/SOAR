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
