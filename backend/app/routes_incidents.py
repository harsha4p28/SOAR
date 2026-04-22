from flask import Blueprint, g, jsonify, request

from .auth import require_api_key
from .extensions import db
from .models import Incident, IncidentNote, ResponseAction
from .services.audit import record_event
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
    record_event("incident_closed", "incident", incident.id, {"status": incident.status})
    db.session.commit()
    return jsonify({"message": "Incident closed", "incident_id": incident.id})


@incidents_api.get("/<int:incident_id>/timeline")
@require_api_key(roles=["analyst", "admin"])
def get_timeline(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    return jsonify(
        {
            "incident": {
                "id": incident.id,
                "title": incident.title,
                "attack_type": incident.attack_type,
                "severity": incident.severity,
                "status": incident.status,
                "owner": incident.owner.username if incident.owner else None,
                "created_at": incident.created_at.isoformat(),
                "updated_at": incident.updated_at.isoformat(),
            },
            "alert": {
                "id": incident.alert.id,
                "endpoint": incident.alert.endpoint,
                "source": incident.alert.source,
                "source_ip": incident.alert.source_ip,
                "exploitability_score": incident.alert.exploitability_score,
                "created_at": incident.alert.created_at.isoformat(),
            },
            "actions": [
                {
                    "id": action.id,
                    "action_type": action.action_type,
                    "action_status": action.action_status,
                    "details": action.details,
                    "created_at": action.created_at.isoformat(),
                }
                for action in incident.response_actions
            ],
            "notes": [
                {
                    "id": note.id,
                    "note": note.note,
                    "author": note.author.username,
                    "created_at": note.created_at.isoformat(),
                }
                for note in incident.notes
            ],
        }
    )


@incidents_api.post("/<int:incident_id>/assign")
@require_api_key(roles=["admin"])
def assign_incident(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    data = request.get_json(silent=True) or {}
    owner_id = data.get("owner_id")
    incident.owner_id = owner_id
    incident.status = data.get("status", incident.status)
    record_event(
        "incident_assigned",
        "incident",
        incident.id,
        {"owner_id": owner_id, "status": incident.status},
    )
    db.session.commit()
    return jsonify({"message": "Incident assigned", "incident_id": incident.id})


@incidents_api.post("/<int:incident_id>/notes")
@require_api_key(roles=["analyst", "admin"])
def add_note(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    data = request.get_json(silent=True) or {}
    note_text = data.get("note", "").strip()
    if not note_text:
        return jsonify({"error": "Note is required"}), 400

    note = IncidentNote(incident_id=incident.id, author_id=g.current_user.id, note=note_text)
    incident.status = data.get("status", incident.status)
    db.session.add(note)
    db.session.flush()
    record_event(
        "incident_note_added",
        "incident",
        incident.id,
        {"note_id": note.id, "status": incident.status},
    )
    db.session.commit()
    return jsonify(
        {
            "message": "Note added",
            "note": {
                "id": note.id,
                "note": note.note,
                "author": g.current_user.username,
                "created_at": note.created_at.isoformat(),
            },
        }
    )


@incidents_api.patch("/<int:incident_id>/status")
@require_api_key(roles=["analyst", "admin"])
def update_status(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if not status:
        return jsonify({"error": "Status is required"}), 400

    incident.status = status
    record_event("incident_status_updated", "incident", incident.id, {"status": status})
    db.session.commit()
    return jsonify({"message": "Incident status updated", "incident_id": incident.id, "status": incident.status})
