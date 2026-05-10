from flask import Blueprint, jsonify
from flask import g, request

from .auth import require_api_key
from .extensions import db
from .models import ActionApproval, Incident, ResponseAction
from .services.audit import record_event
from .services.playbook_engine import build_playbook_actions, execute_playbook_on_lab_app

playbooks_api = Blueprint("playbooks_api", __name__)


def _execute_playbook_for_incident(incident):
    execution_summary = execute_playbook_on_lab_app(incident)
    actions = build_playbook_actions(incident, execution_summary)
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

    incident.status = "mitigated" if execution_summary["success"] else "in_review"
    record_event(
        "playbook_executed",
        "incident",
        incident.id,
        {
            "actions": [action["action_type"] for action in actions],
            "result_status": incident.status,
            "execution_summary": execution_summary,
        },
    )

    return created_actions, execution_summary


@playbooks_api.post("/execute/<int:incident_id>")
@require_api_key(roles=["analyst", "admin"])
def execute_playbook(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    if incident.status == "closed":
        return jsonify({"incident_id": incident.id, "message": "Incident already closed"}), 409

    data = request.get_json(silent=True) or {}
    approval_required = incident.severity in {"critical", "high"} and not data.get(
        "force_execute", False
    )

    existing_pending_approval = (
        ActionApproval.query.filter_by(
            incident_id=incident.id,
            approval_type="playbook_execution",
            approval_status="pending",
        )
        .order_by(ActionApproval.created_at.desc())
        .first()
    )

    if approval_required:
        if existing_pending_approval:
            return (
                jsonify(
                    {
                        "incident_id": incident.id,
                        "approval_required": True,
                        "message": "Approval already pending",
                        "approval": {
                            "id": existing_pending_approval.id,
                            "status": existing_pending_approval.approval_status,
                            "approval_type": existing_pending_approval.approval_type,
                        },
                    }
                ),
                202,
            )

        approval = ActionApproval(
            incident_id=incident.id,
            requested_by_id=g.current_user.id,
            approval_type="playbook_execution",
            approval_status="pending",
            details={"severity": incident.severity, "attack_type": incident.attack_type},
        )
        db.session.add(approval)
        db.session.flush()
        record_event(
            "playbook_approval_requested",
            "incident",
            incident.id,
            {"severity": incident.severity, "approval_id": approval.id},
        )
        db.session.commit()
        return jsonify(
            {
                "incident_id": incident.id,
                "approval_required": True,
                "message": "Approval required before execution",
                "approval": {
                    "id": approval.id,
                    "status": approval.approval_status,
                    "approval_type": approval.approval_type,
                },
            }
        ), 202

    created_actions, execution_summary = _execute_playbook_for_incident(incident)
    db.session.commit()

    return jsonify(
        {
            "incident_id": incident.id,
            "incident_status": incident.status,
            "execution_summary": execution_summary,
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


@playbooks_api.get("/approvals")
@require_api_key(roles=["analyst", "admin"])
def list_approvals():
    approvals = ActionApproval.query.order_by(ActionApproval.created_at.desc()).limit(100).all()
    return jsonify(
        [
            {
                "id": approval.id,
                "incident_id": approval.incident_id,
                "approval_type": approval.approval_type,
                "approval_status": approval.approval_status,
                "details": approval.details,
                "requested_by": approval.requested_by.username,
                "created_at": approval.created_at.isoformat(),
            }
            for approval in approvals
        ]
    )


@playbooks_api.post("/approvals/<int:approval_id>/decision")
@require_api_key(roles=["admin"])
def decide_approval(approval_id):
    approval = ActionApproval.query.get_or_404(approval_id)
    data = request.get_json(silent=True) or {}
    decision = data.get("decision")
    if decision not in {"approved", "rejected"}:
        return jsonify({"error": "decision must be approved or rejected"}), 400

    if approval.approval_status != "pending":
        return jsonify(
            {
                "message": "Approval already decided",
                "approval_id": approval.id,
                "approval_status": approval.approval_status,
            }
        )

    approval.approval_status = decision
    record_event(
        "playbook_approval_decided",
        "incident",
        approval.incident_id,
        {"approval_id": approval.id, "decision": decision},
    )

    incident = approval.incident
    if decision == "approved" and incident.status != "closed":
        _execute_playbook_for_incident(incident)

    db.session.commit()
    return jsonify(
        {
            "message": "Approval updated",
            "approval_id": approval.id,
            "approval_status": approval.approval_status,
        }
    )
