from flask import Blueprint, jsonify, request

from .auth import require_api_key
from .extensions import db
from .models import Alert, Incident
from .services.threat_engine import (
    build_recommended_response,
    calculate_exploitability_score,
    classify_attack_context,
    normalize_attack_type,
)

alerts_api = Blueprint("alerts_api", __name__)


@alerts_api.post("")
@require_api_key(roles=["analyst", "admin"])
def ingest_alert():
    data = request.get_json(silent=True) or {}
    attack_type = normalize_attack_type(data.get("attack_type"))
    endpoint = data.get("endpoint", "/")

    exploitability_score = calculate_exploitability_score(data)
    confidence_score = max(
        float(data.get("scanner_confidence", 0.0)), float(data.get("waf_confidence", 0.0))
    )
    status = "suppressed" if exploitability_score < 0.35 else "triaged"

    alert = Alert(
        attack_type=attack_type,
        source=data.get("source", "unknown"),
        source_ip=data.get("source_ip"),
        endpoint=endpoint,
        http_method=data.get("http_method", "GET"),
        payload=data.get("payload"),
        context=classify_attack_context(data),
        confidence_score=confidence_score,
        exploitability_score=exploitability_score,
        status=status,
    )
    db.session.add(alert)
    db.session.flush()

    incident = None
    if exploitability_score >= 0.35:
        response_plan = build_recommended_response(attack_type)
        incident = Incident(
            title=f"{attack_type} detected on {endpoint}",
            attack_type=attack_type,
            severity=response_plan["severity"],
            status="open",
            context=classify_attack_context(data),
            recommended_response=response_plan["controls"] + response_plan["root_cause_fixes"],
            alert_id=alert.id,
        )
        db.session.add(incident)

    db.session.commit()

    return (
        jsonify(
            {
                "alert": {
                    "id": alert.id,
                    "attack_type": alert.attack_type,
                    "exploitability_score": alert.exploitability_score,
                    "status": alert.status,
                },
                "incident": {
                    "id": incident.id,
                    "severity": incident.severity,
                    "status": incident.status,
                }
                if incident
                else None,
            }
        ),
        201,
    )


@alerts_api.get("")
@require_api_key(roles=["analyst", "admin"])
def list_alerts():
    alerts = Alert.query.order_by(Alert.created_at.desc()).limit(100).all()
    return jsonify(
        [
            {
                "id": alert.id,
                "attack_type": alert.attack_type,
                "endpoint": alert.endpoint,
                "source_ip": alert.source_ip,
                "confidence_score": alert.confidence_score,
                "exploitability_score": alert.exploitability_score,
                "status": alert.status,
                "created_at": alert.created_at.isoformat(),
            }
            for alert in alerts
        ]
    )


@alerts_api.get("/incidents")
@require_api_key(roles=["analyst", "admin"])
def list_incidents():
    incidents = Incident.query.order_by(Incident.created_at.desc()).limit(100).all()
    return jsonify(
        [
            {
                "id": incident.id,
                "title": incident.title,
                "attack_type": incident.attack_type,
                "severity": incident.severity,
                "status": incident.status,
                "recommended_response": incident.recommended_response,
                "created_at": incident.created_at.isoformat(),
            }
            for incident in incidents
        ]
    )
