from functools import wraps

from flask import g, jsonify, request

from .models import User
from .security import hash_api_token


def require_api_key(roles=None):
    roles = roles or []

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing bearer token"}), 401

            raw_token = auth_header.split(" ", 1)[1].strip()
            token_hash = hash_api_token(raw_token)
            user = User.query.filter_by(api_token_hash=token_hash, is_active=True).first()

            if not user:
                return jsonify({"error": "Invalid token"}), 401

            if roles and user.role not in roles:
                return jsonify({"error": "Insufficient role"}), 403

            g.current_user = user
            return fn(*args, **kwargs)

        return wrapper

    return decorator
