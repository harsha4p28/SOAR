from flask import Blueprint, jsonify, request

from .auth import require_api_key
from .extensions import db
from .models import IntegrationConnector
from .services.audit import record_event
from .services.connectors import (
    build_connector_summary,
    normalize_connector_category,
    stamp_check_time,
)

connectors_api = Blueprint("connectors_api", __name__)


@connectors_api.get("")
@require_api_key(roles=["analyst", "admin"])
def list_connectors():
    connectors = IntegrationConnector.query.order_by(IntegrationConnector.created_at.desc()).all()
    return jsonify([build_connector_summary(connector) for connector in connectors])


@connectors_api.post("")
@require_api_key(roles=["admin"])
def create_connector():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    base_url = data.get("base_url", "").strip()
    category = normalize_connector_category(data.get("category"))

    if not name or not base_url:
        return jsonify({"error": "name and base_url are required"}), 400

    connector = IntegrationConnector(
        name=name,
        category=category,
        base_url=base_url,
        auth_type=data.get("auth_type", "token"),
        config=data.get("config", {}),
        status="unknown",
    )
    db.session.add(connector)
    db.session.flush()
    record_event(
        "connector_registered",
        "integration_connector",
        connector.id,
        {"name": connector.name, "category": connector.category},
    )
    db.session.commit()
    return jsonify(build_connector_summary(connector)), 201


@connectors_api.post("/<int:connector_id>/check")
@require_api_key(roles=["analyst", "admin"])
def check_connector(connector_id):
    connector = IntegrationConnector.query.get_or_404(connector_id)
    stamp_check_time(connector)
    record_event(
        "connector_health_checked",
        "integration_connector",
        connector.id,
        {"status": connector.status, "base_url": connector.base_url},
    )
    db.session.commit()
    return jsonify(build_connector_summary(connector))
