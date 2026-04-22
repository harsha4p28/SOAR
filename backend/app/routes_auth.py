from flask import Blueprint, g, jsonify, request

from .auth import require_api_key
from .extensions import db
from .models import User
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
    db.session.commit()

    return jsonify({"message": "Token rotated", "api_token": raw_token})
