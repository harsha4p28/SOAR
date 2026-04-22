from flask import Blueprint, current_app, g, jsonify, request

from .auth import require_api_key
from .extensions import db
from .models import User
from .services.audit import record_event
from .security import generate_api_token, hash_api_token

auth_api = Blueprint("auth_api", __name__)


@auth_api.post("/bootstrap-admin")
def bootstrap_admin():
    if User.query.count() > 0:
        return jsonify({"error": "Bootstrap already completed"}), 409

    data = request.get_json(silent=True) or {}
    username = data.get("username", "admin")
    email = data.get("email", "admin@example.com")

    raw_token = generate_api_token()
    admin_user = User(
        username=username,
        email=email,
        role="admin",
        api_token_hash=hash_api_token(raw_token),
        is_active=True,
    )
    db.session.add(admin_user)
    record_event(
        "admin_bootstrap_completed",
        "user",
        admin_user.id,
        {"username": admin_user.username, "role": admin_user.role},
        actor_id=admin_user.id,
    )
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Admin bootstrapped",
                "user": {
                    "id": admin_user.id,
                    "username": admin_user.username,
                    "role": admin_user.role,
                },
                "api_token": raw_token,
            }
        ),
        201,
    )


@auth_api.get("/me")
@require_api_key()
def get_profile():
    user = g.current_user
    return jsonify(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        }
    )


@auth_api.post("/tokens/rotate")
@require_api_key()
def rotate_token():
    user = g.current_user
    raw_token = generate_api_token()
    user.api_token_hash = hash_api_token(raw_token)
    record_event("token_rotated", "user", user.id, {"username": user.username})
    db.session.commit()

    return jsonify({"message": "Token rotated", "api_token": raw_token})


@auth_api.post("/dev-token")
def issue_dev_token():
    if not current_app.config.get("ALLOW_DEV_TOKEN_ISSUE", False):
        return jsonify({"error": "Dev token issuance disabled"}), 403

    if request.remote_addr not in {"127.0.0.1", "::1", None}:
        return jsonify({"error": "Only localhost is allowed"}), 403

    user = User.query.filter_by(role="admin", is_active=True).first()
    if not user:
        return jsonify({"error": "No admin user found"}), 404

    raw_token = generate_api_token()
    user.api_token_hash = hash_api_token(raw_token)
    record_event("dev_token_issued", "user", user.id, {"username": user.username})
    db.session.commit()

    return jsonify({"message": "Development token issued", "api_token": raw_token})
