from flask import Blueprint, jsonify

from .auth import require_api_key
from .extensions import db
from .models import Incident, ResponseAction
from .services.playbook_engine import build_playbook_actions

playbooks_api = Blueprint("playbooks_api", __name__)


@playbooks_api.post("/execute/<int:incident_id>")
@require_api_key(roles=["analyst", "admin"])
def execute_playbook(incident_id):
    incident = Incident.query.get_or_404(incident_id)

    actions = build_playbook_actions(incident)
    created_actions = []
    for action in actions:
        record = ResponseAction(
            incident_id=incident.id,
            action_type=action["action_type"],
            action_status=action["action_status"],
            details=action["details"],
        )
        db.session.add(record)
        created_actions.append(record)

    incident.status = "mitigated"
    db.session.commit()

    return jsonify(
        {
            "incident_id": incident.id,
            "incident_status": incident.status,
            "actions": [
                {
                    "id": action.id,
                    "action_type": action.action_type,
                    "action_status": action.action_status,
                    "details": action.details,
                }
                for action in created_actions
            ],
        }
    )


@playbooks_api.get("/actions/<int:incident_id>")
@require_api_key(roles=["analyst", "admin"])
def get_playbook_actions(incident_id):
    actions = ResponseAction.query.filter_by(incident_id=incident_id).order_by(
        ResponseAction.created_at.desc()
    )
    return jsonify(
        [
            {
                "id": action.id,
                "action_type": action.action_type,
                "action_status": action.action_status,
                "details": action.details,
                "created_at": action.created_at.isoformat(),
            }
            for action in actions
        ]
    )
