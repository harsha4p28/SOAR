from flask import Blueprint, jsonify

from .auth import require_api_key
from .models import AuditEvent

audit_api = Blueprint("audit_api", __name__)


@audit_api.get("")
@require_api_key(roles=["analyst", "admin"])
def list_audit_events():
    events = AuditEvent.query.order_by(AuditEvent.created_at.desc()).limit(200).all()
    return jsonify(
        [
            {
                "id": event.id,
                "event_type": event.event_type,
                "entity_type": event.entity_type,
                "entity_id": event.entity_id,
                "details": event.details,
                "actor": event.actor.username if event.actor else None,
                "created_at": event.created_at.isoformat(),
            }
            for event in events
        ]
    )