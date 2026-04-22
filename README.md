# SOAR Tool for Web Application Security

This repository contains a configurable SOAR platform focused on web attack detection, contextual response orchestration, and case-driven remediation.

## Architecture

- Backend API: Flask + SQLAlchemy + PostgreSQL
- Frontend: React + React Router + Recharts
- Demo target: intentionally vulnerable Flask application integrated into SOAR ingestion flow

## Core capabilities

- Token-based analyst/admin authentication
- Alert ingestion with exploitability scoring and suppression logic
- Incident case lifecycle with timeline, notes, approvals, and reports
- Playbook execution with approval gates for higher-risk incidents
- Connector registry and health checks
- Audit trail for control-plane visibility
- Multi-page SOC console with route-based navigation
- Dashboard telemetry with KPI cards and charts (timeseries, attack distribution, action distribution)

## Backend setup

1. Create and activate a virtual environment.
2. Install dependencies.

```bash
cd backend
pip install -r requirements.txt
```

3. Configure environment variables.

```bash
copy .env.example .env
```

4. For Supabase PostgreSQL, set:

```env
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

5. Start backend API.

```bash
python run.py
```

The backend runs at `http://127.0.0.1:5000`.

## Frontend setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

If port `5173` is busy, Vite automatically chooses another port (for example `5174`).

## Frontend routes

- `/`: onboarding and guided demo
- `/dashboard`: KPI and telemetry charts
- `/operations`: alert ingestion and connector operations
- `/incidents`: case queue, timeline, report, remediation
- `/governance`: approval queue and audit trail
- `/lab`: trigger intentionally vulnerable demo attacks

## Vulnerable demo app setup

1. Install dependencies.

```bash
cd demo_vulnerable_app
pip install -r requirements.txt
copy .env.example .env
```

2. Put your SOAR token in `.env`:

```env
SOAR_API_TOKEN=<token from SOAR bootstrap>
```

3. Start vulnerable app.

```bash
python app.py
```

The demo app runs at `http://127.0.0.1:5055`.

## End-to-end proof run

With backend running:

1. Open frontend `/` and click `Bootstrap Admin`.
2. Copy token into `demo_vulnerable_app/.env` as `SOAR_API_TOKEN`.
3. Run vulnerable app.
4. Use frontend `/lab` to trigger SQLi/XSS/SSRF attacks.
5. Navigate to `/dashboard`, `/incidents`, and `/governance` to see generated incidents, actions, approvals, and audit events.

You can also run automated proof script:

```bash
cd demo_vulnerable_app
python run_demo.py
```

This script triggers demo attacks and prints incidents detected by SOAR.