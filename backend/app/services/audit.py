from flask import g

from ..extensions import db
from ..models import AuditEvent


def record_event(event_type, entity_type, entity_id=None, details=None, actor_id=None):
    event = AuditEvent(
        actor_id=actor_id if actor_id is not None else getattr(getattr(g, 'current_user', None), 'id', None),
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details or {},
    )
    db.session.add(event)
    return event
