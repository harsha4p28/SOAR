import os
import sqlite3
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request

from seed import seed_db

load_dotenv()

DB_PATH = Path(__file__).parent / 'data' / 'lab.db'


def get_soar_api_base():
    return os.getenv('SOAR_API_BASE', 'http://127.0.0.1:5000/api')


def get_soar_api_token():
    return os.getenv('SOAR_API_TOKEN', '')

app = Flask(__name__)


def db_connect():
    return sqlite3.connect(DB_PATH)


def push_alert(attack_type, endpoint, payload, source='vuln-lab'):
    soar_api_token = get_soar_api_token()
    soar_api_base = get_soar_api_base()

    if not soar_api_token:
        return {'warning': 'SOAR_API_TOKEN is missing; alert not sent'}

    body = {
        'attack_type': attack_type,
        'endpoint': endpoint,
        'http_method': request.method,
        'source': source,
        'source_ip': request.remote_addr,
        'payload': payload,
        'scanner_confidence': 0.85,
        'waf_confidence': 0.8,
        'auth_state': 'unauthenticated',
        'target_component': 'vulnerable-demo-app',
        'environment': 'lab',
    }

    response = requests.post(
        f'{soar_api_base}/alerts',
        json=body,
        headers={'Authorization': f'Bearer {soar_api_token}'},
        timeout=10,
    )
    return response.json()


@app.get('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'vulnerable-demo-app'})


@app.post('/demo/attack')
def trigger_attack():
    data = request.get_json(silent=True) or {}
    attack = data.get('attack', 'sqli')

    if attack == 'xss':
        payload = '<script>alert(document.domain)</script>'
        report = push_alert('CROSS_SITE_SCRIPTING', '/vuln/comment', payload)
        return jsonify({'attack': attack, 'payload': payload, 'soar': report})

    if attack == 'ssrf':
        payload = 'http://169.254.169.254/latest/meta-data/'
        report = push_alert('SERVER_SIDE_REQUEST_FORGERY', '/vuln/fetch', payload)
        return jsonify({'attack': attack, 'payload': payload, 'soar': report})

    payload = "' OR 1=1 --"
    report = push_alert('SQL_INJECTION', '/vuln/login', payload)
    return jsonify({'attack': 'sqli', 'payload': payload, 'soar': report})


@app.get('/vuln/login')
def vulnerable_login():
    username = request.args.get('username', '')
    password = request.args.get('password', '')

    # Intentionally vulnerable query to emulate SQL injection risk.
    raw_query = f"SELECT id, username, role FROM users WHERE username = '{username}' AND password = '{password}'"

    conn = db_connect()
    try:
        rows = conn.execute(raw_query).fetchall()
    finally:
        conn.close()

    if "' OR" in username.upper() or '--' in username:
        push_alert('SQL_INJECTION', '/vuln/login', username)

    return jsonify({'query': raw_query, 'matched_rows': len(rows), 'rows': rows})


@app.post('/vuln/comment')
def vulnerable_comment():
    data = request.get_json(silent=True) or {}
    comment = data.get('comment', '')

    if '<script' in comment.lower():
        push_alert('CROSS_SITE_SCRIPTING', '/vuln/comment', comment)

    # Intentional reflected output pattern for XSS demonstration.
    return jsonify({'rendered': comment, 'stored': False})


if __name__ == '__main__':
    seed_db()
    app.run(port=int(os.getenv('VULN_APP_PORT', '5055')), debug=True)
