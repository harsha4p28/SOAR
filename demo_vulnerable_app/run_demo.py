import os

import requests
from dotenv import load_dotenv

from app import app

load_dotenv()

SOAR_API_BASE = os.getenv('SOAR_API_BASE', 'http://127.0.0.1:5000/api')
SOAR_API_TOKEN = os.getenv('SOAR_API_TOKEN', '')


def ensure_token():
    global SOAR_API_TOKEN
    if SOAR_API_TOKEN:
        return SOAR_API_TOKEN

    response = requests.post(
        f'{SOAR_API_BASE}/auth/bootstrap-admin',
        json={'username': 'admin', 'email': 'admin@soar.local'},
        timeout=10,
    )
    if response.status_code == 201:
        SOAR_API_TOKEN = response.json()['api_token']
        return SOAR_API_TOKEN

    if response.status_code == 409:
        dev_token = requests.post(f'{SOAR_API_BASE}/auth/dev-token', timeout=10)
        if dev_token.status_code == 200:
            SOAR_API_TOKEN = dev_token.json()['api_token']
            return SOAR_API_TOKEN

    raise RuntimeError(
        'Unable to get SOAR token automatically. Set SOAR_API_TOKEN in demo_vulnerable_app/.env.'
    )


def run_demo():
    token = ensure_token()
    os.environ['SOAR_API_TOKEN'] = token

    with app.test_client() as client:
        for attack in ('sqli', 'xss', 'ssrf'):
            response = client.post('/demo/attack', json={'attack': attack})
            payload = response.get_json() or {}
            print(f"Triggered {attack}:", payload.get('soar', {}))

    incidents = requests.get(
        f'{SOAR_API_BASE}/alerts/incidents',
        headers={'Authorization': f'Bearer {token}'},
        timeout=10,
    )
    incidents.raise_for_status()
    rows = incidents.json()

    print('\nLatest incidents detected by SOAR:')
    for row in rows[:5]:
        print(f"- #{row['id']} {row['attack_type']} severity={row['severity']} status={row['status']}")


if __name__ == '__main__':
    run_demo()
