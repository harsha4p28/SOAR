from flask import Blueprint, jsonify

api = Blueprint("api", __name__)


@api.get("/health")
def health_check():
    return jsonify({"status": "ok", "service": "soar-api"})
