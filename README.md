# SOAR Platform for Web Application Security

A practical Security Orchestration, Automation, and Response (SOAR) platform designed for web application threat detection, contextual incident response orchestration, and structured remediation workflows.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Core Features](#core-features)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Frontend Routes](#frontend-routes)
- [Development Workflow](#development-workflow)
- [Deployment & Production Readiness](#deployment--production-readiness)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Overview

This SOAR platform bridges the gap between alert-only handling and contextual orchestration. It enables security teams to:

- **Ingest** web attack signals from multiple sources
- **Triage** alerts using exploitability scoring to reduce noise
- **Investigate** incidents through unified case management
- **Orchestrate** response playbooks with human approval controls
- **Remediate** root causes with guided remediation guidance
- **Govern** operations through comprehensive audit trails

### Key Differentiators

- Route-based SOC console instead of monolithic dashboards
- Real-time telemetry with live charted metrics
- Case-driven investigation with timeline, notes, and reports
- Approval-gated playbook execution for high-risk actions
- Built-in connector registry with health monitoring
- Practical vulnerable lab application for end-to-end testing
- Optimized UX with output focus and auto-scroll feedback

## Architecture

The system comprises three integrated runtime components:

### 1. Backend API (Flask + SQLAlchemy + PostgreSQL)

Provides all operational and administrative APIs:

- **Alert Ingestion**: Normalized attack signal ingestion with exploitability scoring
- **Incident Management**: Case lifecycle, timeline generation, and reporting
- **Playbook Execution**: Response action orchestration with approval gates
- **Governance**: Audit trails, approval workflows, and compliance records
- **Integration**: Connector registry and health checks

**Location**: `backend/`

### 2. Frontend SOC Console (React + Vite + Recharts)

Multi-page operations dashboard:

- **Responsive UI**: Route-based navigation for operational clarity
- **Real-time Updates**: Live metrics and KPI visualizations
- **Case Management**: Integrated incident investigation interface
- **Governance Dashboard**: Approval queues and audit trail views

**Location**: `frontend/`

### 3. Vulnerable Lab Application (Flask)

Intentionally insecure test application for end-to-end demonstrations:

- **SQLi, XSS, SSRF Simulations**: Trigger realistic web attack vectors
- **Alert Generation**: Sends security events to SOAR ingestion endpoint
- **Integration Testing**: Proves alert-to-incident workflow

**Location**: `demo_vulnerable_app/`

## Quick Start

### Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 18 or higher
- **PostgreSQL**: Local or remote instance (Supabase supported)
- **npm**: Package manager for frontend dependencies

### One-Command Bootstrap (Bash/PowerShell)

```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend
cd ../frontend && npm install

# Start backend (in one terminal)
cd ../backend && python run.py

# Start frontend (in another terminal)
cd frontend && npm run dev
```

Then:

1. Open `http://localhost:5173` in your browser
2. Click **Bootstrap Admin** on the home page
3. Copy the generated token
4. Use token for subsequent API calls and operations

## Installation

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Vulnerable Demo App Setup

```bash
cd demo_vulnerable_app

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
```

## Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database connection
DATABASE_URL=postgresql://postgres:password@localhost:5432/soar
# or for Supabase:
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require

# Application secret key for token hashing
SECRET_KEY=your-secret-key-here-change-in-production

# Auto-create tables on startup (local development only)
CREATE_TABLES_ON_STARTUP=True

# Allow dev token issuance for localhost testing
ALLOW_DEV_TOKEN_ISSUE=True

# Server configuration
FLASK_ENV=development
FLASK_DEBUG=True
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# API base URL (adjust if backend runs on different host/port)
VITE_API_BASE_URL=http://localhost:5000
```

### Vulnerable App Environment Variables

Create a `.env` file in the `demo_vulnerable_app/` directory:

```env
# SOAR platform connection
SOAR_API_BASE=http://localhost:5000
SOAR_API_TOKEN=<token-from-SOAR-bootstrap>

# Application port
VULN_APP_PORT=5055
```

## Running the Application

### Start Backend API

```bash
cd backend
python run.py
```

Backend runs at `http://127.0.0.1:5000`

Expected output:
```
 * Running on http://127.0.0.1:5000
```

### Start Frontend Console

In a separate terminal:

```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173` (or next available port if 5173 is busy)

### Start Vulnerable Demo App (Optional)

In another terminal:

```bash
cd demo_vulnerable_app
python app.py
```

Demo app runs at `http://127.0.0.1:5055`

### Verify All Services

- **Backend API**: `curl http://localhost:5000/health`
- **Frontend**: `http://localhost:5173`
- **Demo App**: `http://localhost:5055`

## Core Features

### 1. Alert Ingestion & Triage

- Receive normalized attack alert payloads
- Automatic exploitability scoring
- Configurable suppression thresholds
- Incident generation for high-value alerts

**Endpoints**:
- `POST /api/alerts/ingest` - Ingest new alert
- `GET /api/alerts` - List all alerts
- `GET /api/alerts/<id>` - Get alert details

### 2. Incident Case Management

- Track incident status lifecycle (open → investigating → resolved → closed)
- Add analyst notes and timeline events
- Generate consolidated incident reports
- Provide remediation recommendations

**Endpoints**:
- `POST /api/incidents` - Create incident
- `GET /api/incidents` - List incidents
- `GET /api/incidents/<id>` - Get incident details
- `POST /api/incidents/<id>/notes` - Add note
- `GET /api/incidents/<id>/timeline` - Get timeline
- `POST /api/incidents/<id>/actions` - Execute playbook action

### 3. Playbook Execution & Approvals

- Build context-aware response actions
- Execute playbook actions with history tracking
- Approval gates for high-risk operations
- Audit records for all approvals and actions

**Endpoints**:
- `POST /api/incidents/<id>/actions` - Execute action
- `GET /api/incidents/<id>/actions` - Get action history
- `POST /api/approvals` - Request approval
- `POST /api/approvals/<id>/approve` - Approve action
- `POST /api/approvals/<id>/reject` - Reject action

### 4. Connector Registry

- Register external security tool integrations (WAF, SIEM, EDR, etc.)
- Track connector health and status
- Manage integration credentials and endpoints

**Endpoints**:
- `POST /api/connectors` - Register connector
- `GET /api/connectors` - List connectors
- `POST /api/connectors/<id>/health-check` - Check connector health

### 5. Governance & Audit

- Immutable audit trail for all control-plane actions
- Approval workflow tracking
- Compliance records and evidence export

**Endpoints**:
- `GET /api/audit/events` - List audit events
- `GET /api/audit/events/<id>` - Get audit event details
- `GET /api/dashboard/metrics` - Get operational metrics

## Project Structure

```
SOAR/
├── backend/                          # Flask API server
│   ├── app/
│   │   ├── __init__.py              # App factory and initialization
│   │   ├── auth.py                  # Authentication and token services
│   │   ├── config.py                # Configuration management
│   │   ├── extensions.py            # Database and migration extensions
│   │   ├── models.py                # SQLAlchemy data models
│   │   ├── security.py              # Security utilities
│   │   ├── routes.py                # Core API routes
│   │   ├── routes_alerts.py         # Alert ingestion routes
│   │   ├── routes_audit.py          # Audit trail routes
│   │   ├── routes_auth.py           # Authentication routes
│   │   ├── routes_connectors.py     # Connector registry routes
│   │   ├── routes_dashboard.py      # Dashboard metrics routes
│   │   ├── routes_incidents.py      # Incident management routes
│   │   ├── routes_playbooks.py      # Playbook execution routes
│   │   └── services/                # Business logic services
│   │       ├── audit.py             # Audit event recording
│   │       ├── connectors.py        # Connector operations
│   │       ├── playbook_engine.py   # Playbook orchestration
│   │       ├── remediation.py       # Remediation guidance
│   │       └── threat_engine.py     # Threat scoring engine
│   ├── migrations/                  # Database migrations (Alembic)
│   ├── run.py                       # Application entry point
│   ├── requirements.txt             # Python dependencies
│   └── venv310/                     # Virtual environment
├── frontend/                         # React Vite application
│   ├── src/
│   │   ├── main.jsx                 # Entry point
│   │   ├── App.jsx                  # Root component
│   │   ├── api.js                   # API client
│   │   ├── styles.css               # Global styles
│   │   ├── components/              # Reusable components
│   │   │   └── Shell.jsx            # Layout wrapper
│   │   ├── context/
│   │   │   └── SoarContext.jsx      # Global app context
│   │   ├── pages/                   # Route pages
│   │   │   ├── HomePage.jsx         # Onboarding and bootstrap
│   │   │   ├── DashboardPage.jsx    # KPI and metrics
│   │   │   ├── OperationsPage.jsx   # Alert and connector ops
│   │   │   ├── IncidentsPage.jsx    # Case management
│   │   │   ├── GovernancePage.jsx   # Approvals and audit
│   │   │   └── LabPage.jsx          # Vulnerable app testing
│   │   └── utils/
│   │       └── focusOutput.js       # Auto-scroll UX utility
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── demo_vulnerable_app/             # Intentionally vulnerable Flask app
│   ├── app.py                       # Application entry point
│   ├── run_demo.py                  # Demo runner
│   ├── seed.py                      # Test data seeding
│   ├── requirements.txt
│   └── .env.example
├── explaination.md                  # Detailed technical documentation
├── README.md                        # This file
└── package.json
```

## API Reference

### Authentication

All protected endpoints require a bearer token in the Authorization header:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/incidents
```

### Common Response Format

Success (200, 201):

```json
{
  "success": true,
  "data": { "id": "...", "...": "..." }
}
```

Error (4xx, 5xx):

```json
{
  "success": false,
  "error": "error message"
}
```

### Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/bootstrap` | Create first admin user and token |
| POST | `/api/auth/dev-token` | Issue dev token for localhost testing |
| POST | `/api/alerts/ingest` | Ingest new security alert |
| GET | `/api/alerts` | List all alerts with filters |
| POST | `/api/incidents` | Create incident from alert |
| GET | `/api/incidents` | List incidents with filters |
| GET | `/api/incidents/<id>` | Get incident details |
| POST | `/api/incidents/<id>/notes` | Add note to incident |
| GET | `/api/incidents/<id>/timeline` | Get incident timeline |
| POST | `/api/incidents/<id>/actions` | Execute playbook action |
| POST | `/api/approvals` | Create approval request |
| GET | `/api/approvals` | List pending approvals |
| POST | `/api/approvals/<id>/approve` | Approve action |
| GET | `/api/audit/events` | List audit events |
| GET | `/api/dashboard/metrics` | Get dashboard KPIs |

See `explaination.md` for detailed component explanations.

## Frontend Routes

Navigate the SOC console using these routes:

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Onboarding, token bootstrap, guided demo |
| `/dashboard` | Dashboard | KPI cards, telemetry charts, metrics |
| `/operations` | Operations | Alert ingestion, connector registry, health checks |
| `/incidents` | Incidents | Incident queue, timeline, report, remediation |
| `/governance` | Governance | Approval queue, audit trail, compliance records |
| `/lab` | Lab | Trigger intentional attacks, test end-to-end flow |

## Development Workflow

### Code Organization

- **Backend**: Flask blueprints organize endpoints by operational domain
- **Frontend**: React components and pages with centralized context state
- **Services**: Business logic separated into service layer (auth, playbook, threat scoring)

### Local Development Tips

1. **Auto-reload backend**:
   ```bash
   FLASK_ENV=development python run.py
   ```

2. **Auto-reload frontend**:
   ```bash
   npm run dev  # Vite watches for changes
   ```

3. **Use dev token issuance** (when `ALLOW_DEV_TOKEN_ISSUE=True`):
   ```bash
   curl -X POST http://localhost:5000/api/auth/dev-token
   ```

4. **Reset database** (recreate tables):
   ```bash
   # Delete PostgreSQL database and restart backend with CREATE_TABLES_ON_STARTUP=True
   ```

### Testing Workflow

1. Start all three services (backend, frontend, demo app)
2. Bootstrap admin via frontend
3. Go to `/lab` page
4. Trigger SQLi or XSS attack
5. Verify alert ingested in `/operations`
6. Check incident created in `/incidents`
7. Run playbook and verify actions in audit trail

### Making Changes

- **Backend changes**: Restart `python run.py` (with auto-reload in dev)
- **Frontend changes**: Auto-reload via Vite dev server
- **Database changes**: Use Alembic migrations or enable `CREATE_TABLES_ON_STARTUP`

## Deployment & Production Readiness

### Security Checklist

- [ ] Change `SECRET_KEY` to cryptographically strong random value
- [ ] Disable `CREATE_TABLES_ON_STARTUP` (use migrations instead)
- [ ] Disable `ALLOW_DEV_TOKEN_ISSUE` in production
- [ ] Use environment variable secrets manager (Vault, AWS Secrets Manager)
- [ ] Enable HTTPS/TLS for all connections
- [ ] Implement rate limiting on public endpoints
- [ ] Add request logging and intrusion detection
- [ ] Use least-privilege database credentials

### Scalability Improvements

- Move playbook execution to async worker queue (Celery + Redis)
- Add request caching layer (Redis)
- Implement database connection pooling
- Add API gateway for load balancing
- Use structured logging (JSON) with centralized aggregation
- Set up application performance monitoring (APM)

### Monitoring & Observability

- Add health check endpoints: `/health`, `/health/db`
- Implement structured logging with request tracing
- Set up alerts for critical errors and performance degradation
- Add SLA/MTTR/MTTD trend analysis
- Export metrics in Prometheus format

## Troubleshooting

### Backend Issues

**Issue**: `ModuleNotFoundError: No module named 'flask'`
```bash
# Solution: Activate virtual environment and reinstall
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

**Issue**: `Connection refused` to database
```bash
# Check DATABASE_URL in .env
# Verify PostgreSQL is running: psql postgresql://user:password@host/db
# Or use local SQLite for development: DATABASE_URL=sqlite:///soar.db
```

**Issue**: Port 5000 already in use
```bash
# Solution: Kill process on port 5000 or change FLASK port in run.py
# Windows: netstat -ano | findstr :5000
# macOS/Linux: lsof -i :5000
```

### Frontend Issues

**Issue**: Port 5173 busy
```bash
# Solution: Vite auto-selects next available port. Check terminal output.
```

**Issue**: API calls return 401 Unauthorized
```bash
# Solution: Ensure token is present and valid
# 1. Bootstrap admin via http://localhost:5173
# 2. Copy token from response
# 3. Update API client with token
```

**Issue**: Components not updating after API call
```bash
# Solution: Check SoarContext.jsx for state updates and useEffect dependencies
```

### Demo App Issues

**Issue**: Demo app alerts not appearing in SOAR
```bash
# Check .env has valid SOAR_API_TOKEN
# Verify SOAR_API_BASE points to running backend
# Check backend logs for ingestion errors
```

## Contributing

### Pull Request Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and test locally
4. Commit with descriptive messages: `git commit -m "Add feature X"`
5. Push to branch: `git push origin feature/your-feature`
6. Create pull request with description

### Code Style

- **Python**: Follow PEP 8, use type hints where possible
- **JavaScript/React**: Use ES6+, prefer functional components
- **Naming**: Use clear, descriptive names (avoid abbreviations)
- **Comments**: Document complex logic and business rules

### Testing Requirements

Before submitting PR:
- Test backend endpoints manually or with unit tests
- Test frontend pages in different browsers
- Verify end-to-end flow (alert → incident → action → audit)
- Check for console errors and warnings

## Additional Resources

- **Technical Deep Dive**: See [explaination.md](explaination.md) for detailed component explanations, architecture decisions, and tradeoff analysis
- **API Examples**: Check `frontend/src/api.js` for API client usage patterns
- **Database Schema**: See `backend/app/models.py` for SQLAlchemy models and relationships

## End-to-End Workflow Example

With all services running:

1. Open `http://localhost:5173`
2. Click **Bootstrap Admin** to create first user
3. Copy generated token to `demo_vulnerable_app/.env` as `SOAR_API_TOKEN`
4. Start vulnerable app: `python demo_vulnerable_app/app.py`
5. Go to `/lab` page and trigger SQLi/XSS/SSRF attacks
6. View generated incidents in `/incidents`
7. Execute playbook actions and monitor audit trail in `/governance`
8. Dashboard shows real-time metrics of all activities

Or run automated demo:
```bash
cd demo_vulnerable_app
python run_demo.py
```

## License

[Add your license here]

## Support

For issues, questions, or contributions:
- Open a GitHub issue with detailed description
- Include environment info (OS, Python version, Node version)
- Provide steps to reproduce and error logs