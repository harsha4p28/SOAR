import os
import sqlite3
import html
import re
import subprocess
from pathlib import Path
from urllib.parse import urlparse

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
app.config['SECURE_MODE'] = False

SAFE_FETCH_HOSTS = {'example.com', 'httpbin.org'}


def is_suspicious_sql_input(value):
    upper = value.upper()
    return any(token in upper for token in ["' OR", '--', ';', 'UNION', 'DROP', 'SELECT'])


def is_valid_username(value):
    return bool(re.fullmatch(r'[A-Za-z0-9_]{3,32}', value))


def is_allowed_fetch_url(url):
    parsed = urlparse(url)
    if parsed.scheme not in {'http', 'https'}:
        return False
    return parsed.hostname in SAFE_FETCH_HOSTS


def db_connect():
    return sqlite3.connect(DB_PATH)


def fetch_app_state():
    conn = db_connect()
    try:
        row = conn.execute(
            'SELECT csrf_token, notifications_enabled FROM app_state WHERE id = 1'
        ).fetchone()
    finally:
        conn.close()

    return row


def set_notifications_enabled(enabled):
    conn = db_connect()
    try:
        conn.execute(
            'UPDATE app_state SET notifications_enabled = ? WHERE id = 1',
            (1 if enabled else 0,),
        )
        conn.commit()
    finally:
        conn.close()


def fetch_document(document_id):
    conn = db_connect()
    try:
        row = conn.execute(
            'SELECT id, owner_id, title, body FROM documents WHERE id = ?',
            (document_id,),
        ).fetchone()
    finally:
        conn.close()

    return row


def run_command_insecure(command):
    completed = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True,
        timeout=10,
    )
    return {
        'returncode': completed.returncode,
        'stdout': completed.stdout.strip(),
        'stderr': completed.stderr.strip(),
    }


def run_command_secure(command):
    allowed_commands = {
        'whoami': ['whoami'],
        'hostname': ['hostname'],
    }
    normalized = command.strip().lower()
    if normalized not in allowed_commands:
        return {'error': 'Command blocked by allowlist'}

    completed = subprocess.run(
        allowed_commands[normalized],
        shell=False,
        capture_output=True,
        text=True,
        timeout=10,
    )
    return {
        'returncode': completed.returncode,
        'stdout': completed.stdout.strip(),
        'stderr': completed.stderr.strip(),
        'secure': True,
    }


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


@app.post('/demo/remediate')
def apply_remediation_mode():
    app.config['SECURE_MODE'] = True
    return jsonify(
        {
            'message': 'Secure mode enabled for lab endpoints',
            'secure_routes': ['/app/login', '/app/comment', '/app/fetch', '/app/document/<id>', '/app/settings/notifications', '/app/command'],
        }
    )


@app.post('/demo/reset')
def reset_mode():
    app.config['SECURE_MODE'] = False
    seed_db()
    return jsonify({'message': 'Lab reset and vulnerable mode restored'})


@app.get('/vuln/document/<int:document_id>')
def vulnerable_document(document_id):
    viewer_id = request.args.get('viewer_id', type=int)
    document = fetch_document(document_id)
    if document is None:
        return jsonify({'error': 'Document not found'}), 404

    if viewer_id is not None and viewer_id != document[1]:
        push_alert('INSECURE_DIRECT_OBJECT_REFERENCES', f'/vuln/document/{document_id}', str(viewer_id))

    return jsonify(
        {
            'id': document[0],
            'owner_id': document[1],
            'title': document[2],
            'body': document[3],
            'secure': False,
        }
    )


@app.get('/secure/document/<int:document_id>')
def secure_document(document_id):
    viewer_id = request.args.get('viewer_id', type=int)
    document = fetch_document(document_id)
    if document is None:
        return jsonify({'error': 'Document not found'}), 404

    if viewer_id is None or viewer_id != document[1]:
        push_alert('INSECURE_DIRECT_OBJECT_REFERENCES', f'/secure/document/{document_id}', str(viewer_id), source='secure-guard')
        return jsonify({'error': 'Access denied by object-level policy'}), 403

    return jsonify(
        {
            'id': document[0],
            'owner_id': document[1],
            'title': document[2],
            'body': document[3],
            'secure': True,
        }
    )


@app.post('/vuln/settings/notifications')
def vulnerable_notifications():
    data = request.get_json(silent=True) or {}
    enabled = bool(data.get('enabled', True))
    set_notifications_enabled(enabled)
    state = fetch_app_state()
    return jsonify({'notifications_enabled': bool(state[1]), 'secure': False})


@app.post('/secure/settings/notifications')
def secure_notifications():
    data = request.get_json(silent=True) or {}
    csrf_token = request.headers.get('X-CSRF-Token', '')
    state = fetch_app_state()
    if not state or csrf_token != state[0]:
        push_alert('CROSS_SITE_REQUEST_FORGERY', '/secure/settings/notifications', str(data), source='secure-guard')
        return jsonify({'error': 'CSRF token validation failed'}), 403

    enabled = bool(data.get('enabled', True))
    set_notifications_enabled(enabled)
    state = fetch_app_state()
    return jsonify({'notifications_enabled': bool(state[1]), 'secure': True})


@app.post('/vuln/command')
def vulnerable_command():
    data = request.get_json(silent=True) or {}
    command = data.get('command', 'whoami')
    result = run_command_insecure(command)
    if any(marker in command for marker in ['&&', ';', '|', '`']):
        push_alert('REMOTE_CODE_EXECUTION', '/vuln/command', command)
    return jsonify({'command': command, 'result': result, 'secure': False})


@app.post('/secure/command')
def secure_command():
    data = request.get_json(silent=True) or {}
    command = data.get('command', 'whoami')
    result = run_command_secure(command)
    if 'error' in result:
        push_alert('REMOTE_CODE_EXECUTION', '/secure/command', command, source='secure-guard')
        return jsonify(result), 403
    return jsonify({'command': command, 'result': result, 'secure': True})


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


@app.get('/secure/login')
def secure_login():
    username = request.args.get('username', '')
    password = request.args.get('password', '')

    if not is_valid_username(username):
        return jsonify({'error': 'Invalid username format'}), 400

    if is_suspicious_sql_input(username) or is_suspicious_sql_input(password):
        push_alert('SQL_INJECTION', '/secure/login', f'{username}:{password}', source='secure-guard')
        return jsonify({'error': 'Potential injection pattern blocked'}), 403

    conn = db_connect()
    try:
        rows = conn.execute(
            'SELECT id, username, role FROM users WHERE username = ? AND password = ?',
            (username, password),
        ).fetchall()
    finally:
        conn.close()

    return jsonify({'matched_rows': len(rows), 'rows': rows, 'secure': True})


@app.post('/vuln/comment')
def vulnerable_comment():
    data = request.get_json(silent=True) or {}
    comment = data.get('comment', '')

    if '<script' in comment.lower():
        push_alert('CROSS_SITE_SCRIPTING', '/vuln/comment', comment)

    # Intentional reflected output pattern for XSS demonstration.
    return jsonify({'rendered': comment, 'stored': False})


@app.post('/secure/comment')
def secure_comment():
    data = request.get_json(silent=True) or {}
    comment = data.get('comment', '')

    if '<script' in comment.lower():
        push_alert('CROSS_SITE_SCRIPTING', '/secure/comment', comment, source='secure-guard')

    encoded = html.escape(comment, quote=True)
    return jsonify({'rendered': encoded, 'stored': False, 'secure': True})


@app.get('/vuln/fetch')
def vulnerable_fetch():
    target = request.args.get('url', 'http://example.com')
    if '169.254.169.254' in target:
        push_alert('SERVER_SIDE_REQUEST_FORGERY', '/vuln/fetch', target)
    return jsonify({'requested_url': target, 'secure': False})


@app.get('/secure/fetch')
def secure_fetch():
    target = request.args.get('url', 'https://example.com')
    if not is_allowed_fetch_url(target):
        push_alert('SERVER_SIDE_REQUEST_FORGERY', '/secure/fetch', target, source='secure-guard')
        return jsonify({'error': 'Target URL blocked by allowlist'}), 403

    return jsonify({'requested_url': target, 'secure': True})


@app.route('/app/login', methods=['GET'])
def app_login():
    if app.config['SECURE_MODE']:
        return secure_login()
    return vulnerable_login()


@app.route('/app/comment', methods=['POST'])
def app_comment():
    if app.config['SECURE_MODE']:
        return secure_comment()
    return vulnerable_comment()


@app.route('/app/fetch', methods=['GET'])
def app_fetch():
    if app.config['SECURE_MODE']:
        return secure_fetch()
    return vulnerable_fetch()


@app.route('/app/document/<int:document_id>', methods=['GET'])
def app_document(document_id):
    if app.config['SECURE_MODE']:
        return secure_document(document_id)
    return vulnerable_document(document_id)


@app.route('/app/settings/notifications', methods=['POST'])
def app_notifications():
    if app.config['SECURE_MODE']:
        return secure_notifications()
    return vulnerable_notifications()


@app.route('/app/command', methods=['POST'])
def app_command():
    if app.config['SECURE_MODE']:
        return secure_command()
    return vulnerable_command()


if __name__ == '__main__':
    seed_db()
    app.run(port=int(os.getenv('VULN_APP_PORT', '5055')), debug=True)
