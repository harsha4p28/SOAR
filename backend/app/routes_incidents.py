from flask import Blueprint, jsonify

from .auth import require_api_key
from .extensions import db
from .models import Incident
from .services.remediation import remediation_plan_for

incidents_api = Blueprint("incidents_api", __name__)


@incidents_api.get("/<int:incident_id>/remediation-plan")
@require_api_key(roles=["analyst", "admin"])
def get_remediation_plan(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    plan = remediation_plan_for(incident.attack_type)
    return jsonify(
        {
            "incident_id": incident.id,
            "attack_type": incident.attack_type,
            "severity": incident.severity,
            "status": incident.status,
            "code_fixes": plan["code_fixes"],
            "verification": plan["verification"],
        }
    )


@incidents_api.post("/<int:incident_id>/close")
@require_api_key(roles=["analyst", "admin"])
def close_incident(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    incident.status = "closed"
    db.session.commit()
    return jsonify({"message": "Incident closed", "incident_id": incident.id})
