import hashlib
import secrets


def generate_api_token():
    return secrets.token_urlsafe(32)


def hash_api_token(raw_token):
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
