# SOAR Tool Technical Explanation

## 1) Project intent

This project is a practical SOAR platform focused on web application threats. It is designed to:

- Detect and ingest web attack signals
- Evaluate exploitability to reduce low-value noise
- Create and manage incidents as analyst cases
- Execute response playbooks with approval controls
- Provide remediation guidance for root-cause fixes
- Maintain governance through audit trails and approval logs
- Demonstrate real integration through an intentionally vulnerable lab app

The platform aims to move from alert-only handling to contextual orchestration and structured incident response.

## 2) System architecture

The system has three major runtime parts:

1. Backend API (Flask + SQLAlchemy + PostgreSQL)
2. Frontend SOC Console (React + React Router + Recharts)
3. Vulnerable Lab Application (Flask) for end-to-end attack simulation

Data flow direction:

- Attack signal source -> SOAR alert ingestion -> incident creation -> playbook and governance actions
- Frontend pages call backend APIs and render operational output
- Lab app can intentionally trigger SQLi, XSS, SSRF style events and send them to SOAR

## 3) Backend component explanation

### 3.1 Application bootstrap

Main responsibilities:

- Load configuration and env values
- Initialize DB and migration extensions
- Register API route blueprints
- Optionally auto-create tables for local development

Why it matters:

- Enables local startup without heavy infrastructure ceremony
- Keeps endpoints grouped by operational domain

### 3.2 Auth and token services

Main responsibilities:

- Bootstrap first admin identity
- Authenticate requests via bearer token hash lookup
- Support token rotation
- Support localhost development token issue when bootstrap is already completed

Why it matters:

- Gives controlled access to analyst/admin actions
- Solves local dev friction where bootstrap may already be done

### 3.3 Alert ingestion and triage engine

Main responsibilities:

- Receive normalized attack alert payloads
- Score exploitability and confidence
- Suppress very low-value alerts
- Create incidents for triaged/high-value signals

Why it matters:

- Reduces false positives early
- Ensures incidents are actionable and not just noisy logs

### 3.4 Incident and case management

Main responsibilities:

- Track incident status lifecycle
- Add analyst notes
- Generate case timeline
- Produce consolidated incident report
- Provide remediation recommendations

Why it matters:

- Moves operations to case-first response
- Preserves context over time for investigation and closure

### 3.5 Playbook execution and approvals

Main responsibilities:

- Build response actions by attack type
- Execute playbook actions and store action history
- Gate high-risk execution via approval records
- Allow approval decisions through governance workflows

Why it matters:

- Introduces controlled automation instead of blind response
- Supports practical human-in-the-loop governance

### 3.6 Connector registry

Main responsibilities:

- Register external security tool connectors
- Track category, endpoint, auth mode
- Run health checks and status stamping

Why it matters:

- Creates integration foundation similar to real SOAR ecosystems
- Helps operations see connector health in one place

### 3.7 Audit and dashboard telemetry

Main responsibilities:

- Write audit events for major control-plane actions
- Provide metrics endpoints for KPI and chart visualizations
- Provide timeseries and distributions for monitoring trends

Why it matters:

- Essential for SOC governance and traceability
- Enables live dashboards beyond static counters

## 4) Data model explanation

Core entities and purpose:

- User: analyst/admin identity and token hash ownership
- Alert: raw or normalized security signal input
- Incident: actionable case created from triaged alert
- ResponseAction: playbook actions executed for an incident
- IncidentNote: analyst commentary and investigative notes
- ActionApproval: pending/approved/rejected approval control state
- AuditEvent: immutable event trail for governance operations
- IntegrationConnector: external integration metadata and health status

Relationship summary:

- One alert can produce one or more incidents
- One incident has many response actions
- One incident has many notes
- One incident can have many approvals
- Audit events are linked to actors and entity references

## 5) Frontend component explanation

Frontend is route-based for operational clarity.

Pages and intent:

- Home: onboarding, token setup, guided demo, alert bootstrap
- Dashboard: KPI cards and telemetry charts
- Operations: alert and connector operations
- Incidents: queue, timeline, remediation, report, case actions
- Governance: approval queue and audit trail
- Lab: trigger intentional attacks against vulnerable demo app

Shared frontend design:

- Central SOAR context provides token and API action functions
- Output focus utility auto-scrolls and focuses output cards after actions
- Status footer provides immediate action feedback

## 6) Working flow (end-to-end)

### 6.1 Standard SOC flow

1. Analyst acquires token via bootstrap or local dev token issue
2. Alert is ingested through API (or from integrated source)
3. Exploitability scoring decides suppression vs triage
4. Triaged alerts generate incidents
5. Analyst opens incident, inspects timeline and report
6. Analyst runs playbook, potentially requiring approval
7. Actions and decisions are written to audit trail
8. Analyst applies remediation guidance and closes incident

### 6.2 Vulnerable lab proof flow

1. Start backend and frontend
2. Start vulnerable demo app
3. Trigger SQLi or XSS or SSRF from lab page
4. Demo app sends alert to SOAR ingestion endpoint
5. SOAR creates alert and incident with severity
6. Dashboard and incident pages reflect live operational changes

## 7) Prerequisites

### 7.1 Runtime prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- PostgreSQL instance (local or Supabase)
- pip and npm

### 7.2 Environment prerequisites

Backend env:

- DATABASE_URL
- SECRET_KEY
- CREATE_TABLES_ON_STARTUP (optional local convenience)
- ALLOW_DEV_TOKEN_ISSUE (local developer flow)

Frontend env:

- VITE_API_BASE_URL (if non-default backend host is needed)

Vulnerable app env:

- SOAR_API_BASE
- SOAR_API_TOKEN
- VULN_APP_PORT

### 7.3 Operational prerequisites

- Backend must be running before frontend actions that hit API
- Token must be present for protected endpoints
- Demo app needs valid SOAR token to forward alerts

## 8) What we built differently

This implementation differs from many simple SOAR demos in these ways:

- Route-based SOC UI instead of one long static page
- Real charted telemetry using live backend endpoints
- Case timeline, notes, report, remediation in one workflow
- Approval-gated playbooks for high-risk response behavior
- Audit-first control-plane event recording
- Connector registry with health checks
- Practical vulnerable-lab integration proving true alert-to-incident flow
- Output focus behavior to improve operator usability during rapid actions

## 9) Current tradeoffs

### 9.1 Architecture tradeoffs

- Flask synchronous request flow is simple but not ideal for large-scale orchestration
- Table auto-creation simplifies local setup but is weaker than strict migration-only discipline
- Dev token endpoint improves local testing speed but is not intended for production exposure

### 9.2 Security tradeoffs

- Token approach is lightweight but not full enterprise SSO
- Approval model is useful but not yet policy-as-code
- Vulnerable app is intentionally insecure for lab use only

### 9.3 Operational tradeoffs

- Current playbooks are deterministic templates, not full workflow DAGs
- Connector checks are basic health evaluation, not deep integration diagnostics
- Metrics are strong for MVP but not full SIEM-scale observability

## 10) Future improvements

### 10.1 Platform depth

- Move playbook execution to async worker queue with retries and timeouts
- Add durable workflow engine semantics for long-running orchestrations
- Implement migration-first lifecycle with explicit DB revisions

### 10.2 Security and governance

- Integrate SSO/OIDC and stronger role/policy controls
- Add signed audit records and evidence export bundles
- Add policy-as-code approval conditions and response constraints

### 10.3 Integration maturity

- Build connector SDK contracts and integration test harness
- Add first-class adapters for WAF, SIEM, EDR, IAM, ticketing
- Add richer connector diagnostics and failure replay handling

### 10.4 Analytics and UX

- Add SLA/MTTR/MTTD trend cards and anomaly detection
- Add case assignment workflows and notifications
- Add advanced search, filters, and saved SOC views

### 10.5 Testing strategy

- Add backend unit and integration tests for all routes
- Add frontend route and interaction tests
- Add automated end-to-end test that triggers lab attacks and validates incident creation

## 11) Production-readiness guidance

To evolve this toward enterprise SOAR reliability:

- Remove or strictly gate dev-only token features
- Use secret managers for credentials
- Enforce migration-based schema change control
- Add background workers and queue-backed orchestration
- Add structured logs, traces, and SLO-backed monitoring
- Add least-privilege RBAC and compliance reporting artifacts

This gives a practical roadmap from current strong prototype to hardened production-grade deployment.
