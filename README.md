# SOAR Tool for Web Application Security

This project is a custom Security Orchestration, Automation, and Response platform focused on web application attacks such as SQL Injection, Cross Site Scripting, SSRF, CSRF, IDOR, and RCE.

## Stack

- Frontend: React (Vite)
- Backend: Flask (Python)
- Database: PostgreSQL

## Implemented capabilities

- API token authentication with role-based access control
- Alert ingestion endpoint for scanner and WAF events
- Exploitability scoring and false-positive suppression
- Automatic incident generation with severity classification
- Playbook execution with precise controls:
	- session suspension
	- parameter filtering
	- rate limiting
	- security patch actions per attack type
- Remediation plans with secure coding guidance and verification checks
- Dashboard metrics for alerts, incidents, suppression rate, and response actions
- React operations console for analysts

## Backend setup

1. Create and activate a Python virtual environment.
2. Install dependencies.

```bash
cd backend
pip install -r requirements.txt
```

3. Configure environment variables.

```bash
copy .env.example .env
```

4. Run the Flask application.

```bash
python run.py
```

The API runs on `http://127.0.0.1:5000`.

## Frontend setup

1. Install dependencies.

```bash
cd frontend
npm install
```

2. Configure API base URL.

```bash
copy .env.example .env
```

3. Start the development server.

```bash
npm run dev
```

The UI runs on `http://127.0.0.1:5173`.

## Initial usage flow

1. Open the UI and click Bootstrap Admin.
2. Save the returned bearer token securely.
3. Use the token in the console and ingest alerts.
4. Review created incidents and run playbooks.
5. Open remediation guidance for root-cause fixes.
6. Monitor SOC metrics in the dashboard panel.