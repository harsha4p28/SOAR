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

If port `5173` is already in use, Vite will automatically start on the next free port, such as `5174`.

## Initial usage flow

1. Start the backend and frontend.
2. Open the UI and click Run Guided Demo, or follow the manual flow below.
3. Save the returned bearer token securely.
4. Use Ingest Alert to generate a sample web attack event.
5. Open the incident Timeline or Incident Report to inspect the case.
6. Run Execute Playbook to simulate automated response.
7. Check Audit Trail, Approvals, and Integrations to confirm platform behavior.
8. Review remediation guidance and SOC metrics in the dashboard panel.

## Manual test flow

If you want to verify the system step by step:

1. Click Bootstrap Admin.
2. Copy the token into the Bearer Token box if it is not already filled.
3. Click Ingest Alert.
4. Select the new incident and click Open Timeline.
5. Add a note, mark the case In Review, and then Close Case.
6. Click Execute Playbook and inspect the approval queue if the severity is high.
7. Open Incident Report to see the complete case bundle.

## Button reference

- Bootstrap Admin: creates the first admin token for local testing.
- Ingest Alert: sends a sample WAF-style attack into the backend.
- Open Timeline: shows alert context, actions, and analyst notes.
- Execute Playbook: runs response actions for the selected incident.
- Incident Report: collects all case data in one exportable view.
- Audit Trail: shows every recorded platform event.
- Approvals: shows any pending or completed playbook approvals.
- Integrations: lists connector registrations and health checks.