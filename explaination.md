# SOAR Platform Technical Architecture & Design

> **Audience**: Developers, architects, and security engineers evaluating or extending this SOAR platform.
> **Scope**: Technical deep-dive into design decisions, data flow, component interactions, and operational workflows.
> **Related**: See [README.md](README.md) for quick start guide and installation instructions.

## Table of Contents

1. [Project Intent](#1-project-intent)
2. [System Architecture](#2-system-architecture)
3. [Backend Component Explanation](#3-backend-component-explanation)
4. [Data Model Explanation](#4-data-model-explanation)
5. [Frontend Component Explanation](#5-frontend-component-explanation)
6. [Working Flow (End-to-End)](#6-working-flow-end-to-end)
7. [Prerequisites](#7-prerequisites)
8. [Architectural Innovations](#8-architectural-innovations)
9. [Architectural Tradeoffs](#9-architectural-tradeoffs)
10. [Roadmap & Future Improvements](#10-roadmap--future-improvements)
11. [Production Readiness Guidance](#11-production-readiness-guidance)

## 1. Project Intent

### Mission

This project is a practical, demonstration-grade SOAR platform specifically optimized for web application threats. Rather than attempting feature parity with enterprise SOAR suites, it focuses on depth within a narrow domain: detecting web attacks, scoring their exploitability, and orchestrating structured response workflows.

### Design Goals

This project is designed to:

- Detect and ingest web attack signals from various sources
- Evaluate exploitability to reduce low-value noise and false positives
- Create and manage incidents as actionable analyst cases
- Execute response playbooks with human approval controls for high-risk actions
- Provide remediation guidance for root-cause fixes
- Maintain governance through immutable audit trails and approval logs
- Demonstrate real integration through an intentionally vulnerable lab application

### Strategic Direction

The platform aims to move security operations from **alert-only handling** (high noise, reactive) to **contextual orchestration** (signal enrichment, proactive) with **structured incident response** (case-driven, auditable).

## 2. System Architecture

### Component Overview

The system comprises three integrated runtime components that work in concert to provide end-to-end security orchestration:

1. **Backend API (Flask + SQLAlchemy + PostgreSQL)**: Core orchestration engine
2. **Frontend SOC Console (React + React Router + Recharts)**: Analyst operational interface
3. **Vulnerable Lab Application (Flask)**: End-to-end testing and proof environment

### Data Flow Architecture

Attack signals flow through the system in a structured pipeline:

```
Attack Source 
  → Alert Ingestion 
    → Exploitability Scoring 
      → Triage Decision 
        → Incident Creation 
          → Playbook Execution 
            → Approval Workflow 
              → Audit Recording
```

Frontend pages call backend APIs and render operational output in real-time. The lab application can trigger SQLi, XSS, and SSRF style events, sending them to the SOAR ingestion endpoint to demonstrate the full attack-to-incident workflow.

## 3. Backend Component Explanation

### 3.1 Application Bootstrap

Main responsibilities:

- Load configuration and env values
- Initialize DB and migration extensions
- Register API route blueprints
- Optionally auto-create tables for local development

Why it matters:

- Enables local startup without heavy infrastructure ceremony
- Keeps endpoints grouped by operational domain

### 3.2 Authentication & Token Services

Main responsibilities:

- Bootstrap first admin identity
- Authenticate requests via bearer token hash lookup
- Support token rotation
- Support localhost development token issue when bootstrap is already completed

Why it matters:

- Gives controlled access to analyst/admin actions
- Solves local dev friction where bootstrap may already be done

### 3.3 Alert Ingestion & Triage Engine

Main responsibilities:

- Receive normalized attack alert payloads
- Score exploitability and confidence
- Suppress very low-value alerts
- Create incidents for triaged/high-value signals

Why it matters:

- Reduces false positives early
- Ensures incidents are actionable and not just noisy logs

### 3.4 Incident & Case Management

Main responsibilities:

- Track incident status lifecycle
- Add analyst notes
- Generate case timeline
- Produce consolidated incident report
- Provide remediation recommendations

Why it matters:

- Moves operations to case-first response
- Preserves context over time for investigation and closure

### 3.5 Playbook Execution & Approvals

Main responsibilities:

- Build response actions by attack type
- Execute playbook actions and store action history
- Gate high-risk execution via approval records
- Allow approval decisions through governance workflows

Why it matters:

- Introduces controlled automation instead of blind response
- Supports practical human-in-the-loop governance

### 3.6 Connector Registry

Main responsibilities:

- Register external security tool connectors
- Track category, endpoint, auth mode
- Run health checks and status stamping

Why it matters:

- Creates integration foundation similar to real SOAR ecosystems
- Helps operations see connector health in one place

### 3.7 Audit & Dashboard Telemetry

Main responsibilities:

- Write audit events for major control-plane actions
- Provide metrics endpoints for KPI and chart visualizations
- Provide timeseries and distributions for monitoring trends

Why it matters:

- Essential for SOC governance and traceability
- Enables live dashboards beyond static counters

## 4. Data Model Explanation

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

## 5. Frontend Component Explanation

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

## 6. Working Flow (End-to-End)

### 6.1 Standard SOC Flow

1. Analyst acquires token via bootstrap or local dev token issue
2. Alert is ingested through API (or from integrated source)
3. Exploitability scoring decides suppression vs triage
4. Triaged alerts generate incidents
5. Analyst opens incident, inspects timeline and report
6. Analyst runs playbook, potentially requiring approval
7. Actions and decisions are written to audit trail
8. Analyst applies remediation guidance and closes incident

### 6.2 Vulnerable Lab Proof Flow

1. Start backend and frontend
2. Start vulnerable demo app
3. Trigger SQLi or XSS or SSRF from lab page
4. Demo app sends alert to SOAR ingestion endpoint
5. SOAR creates alert and incident with severity
6. Dashboard and incident pages reflect live operational changes

## 7. Prerequisites

### 7.1 Runtime Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- PostgreSQL instance (local or Supabase)
- pip and npm

### 7.2 Environment Prerequisites

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

### 7.3 Operational Prerequisites

- Backend must be running before frontend actions that hit API
- Token must be present for protected endpoints
- Demo app needs valid SOAR token to forward alerts

## 8. Architectural Innovations

This implementation introduces several design patterns that distinguish it from traditional SOAR demonstrations:

- **Route-based SOC UI**: Multi-page console with clear operational separation (Dashboard, Incidents, Operations, Governance) rather than monolithic single-page design
- **Real-time Telemetry**: Live charted metrics using backend endpoints with timeseries, distribution, and KPI visualizations
- **Integrated Case Management**: Timeline, notes, reports, and remediation guidance unified in single workflow
- **Approval-gated Playbooks**: High-risk response actions require explicit approval through governance workflow
- **Audit-First Design**: All control-plane operations recorded immutably for traceability and compliance
- **Connector Registry**: Integration abstraction layer with health monitoring similar to enterprise SOAR ecosystems
- **Practical Lab Integration**: Intentionally vulnerable application proves true alert-to-incident workflow, not just mock data
- **UX-Focused Output**: Auto-scroll and focus behavior improves operator usability during rapid-fire actions

## 9. Architectural Tradeoffs

### 9.1 Architecture Tradeoffs

- Flask synchronous request flow is simple but not ideal for large-scale orchestration
- Table auto-creation simplifies local setup but is weaker than strict migration-only discipline
- Dev token endpoint improves local testing speed but is not intended for production exposure

### 9.2 Security Tradeoffs

- Token approach is lightweight but not full enterprise SSO
- Approval model is useful but not yet policy-as-code
- Vulnerable app is intentionally insecure for lab use only

### 9.3 Operational Tradeoffs

- Current playbooks are deterministic templates, not full workflow DAGs
- Connector checks are basic health evaluation, not deep integration diagnostics
- Metrics are strong for MVP but not full SIEM-scale observability

## 10. Roadmap & Future Improvements

### 10.1 Platform Depth

- Move playbook execution to async worker queue with retries and timeouts
- Add durable workflow engine semantics for long-running orchestrations
- Implement migration-first lifecycle with explicit DB revisions

### 10.2 Security & Governance

- Integrate SSO/OIDC and stronger role/policy controls
- Add signed audit records and evidence export bundles
- Add policy-as-code approval conditions and response constraints

### 10.3 Integration Maturity

- Build connector SDK contracts and integration test harness
- Add first-class adapters for WAF, SIEM, EDR, IAM, ticketing
- Add richer connector diagnostics and failure replay handling

### 10.4 Analytics & UX

- Add SLA/MTTR/MTTD trend cards and anomaly detection
- Add case assignment workflows and notifications
- Add advanced search, filters, and saved SOC views

### 10.5 Testing Strategy

- Add backend unit and integration tests for all routes
- Add frontend route and interaction tests
- Add automated end-to-end test that triggers lab attacks and validates incident creation

## 11. Production Readiness Guidance

### Maturity Progression

This codebase represents a **strong prototype** suitable for technical demonstration, proof-of-concept validation, and as a learning resource. To evolve it toward **enterprise-grade SOAR reliability**, follow this roadmap:

### Security Hardening

1. **Secrets Management**
   - Remove or strictly gate all `ALLOW_DEV_TOKEN_ISSUE` functionality
   - Use external secrets manager (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)
   - Rotate `SECRET_KEY` regularly and enforce cryptographically strong values
   - Implement certificate pinning for external integrations

2. **Access Control**
   - Implement full RBAC (Role-Based Access Control) with fine-grained permissions
   - Integrate SSO/OIDC for enterprise directory integration
   - Add MFA enforcement for sensitive operations
   - Implement least-privilege database credentials (separate read-only, write, admin roles)

3. **Audit & Compliance**
   - Add digital signatures to audit records for evidence integrity
   - Implement immutable audit log storage (write-once append-only)
   - Add automated compliance reporting (SOC 2, PCI-DSS, HIPAA)
   - Enable request tracing across all services

### Infrastructure & Scalability

1. **Async Execution**
   - Move playbook execution to async worker queue (Celery + Redis or similar)
   - Implement retry logic with exponential backoff for transient failures
   - Add timeout and circuit-breaker patterns for external integration calls
   - Use message queues for alert ingestion to handle traffic spikes

2. **Data & Caching**
   - Implement database connection pooling (pgBouncer or app-level)
   - Add Redis caching for frequently accessed data (connectors, alert patterns)
   - Use CDN for frontend static assets
   - Implement read replicas for reporting queries

3. **Infrastructure**
   - Add API gateway with rate limiting, request validation, and DDoS protection
   - Deploy across multiple availability zones for high availability
   - Use container orchestration (Kubernetes) for workload management
   - Implement blue-green deployment strategy for zero-downtime updates

### Monitoring & Observability

1. **Instrumentation**
   - Migrate to structured JSON logging for all components
   - Add distributed request tracing (OpenTelemetry)
   - Export metrics in Prometheus format
   - Implement health check endpoints: `/health`, `/health/db`, `/health/cache`

2. **Alerting & SLOs**
   - Define SLOs for alert ingestion latency, incident creation time (SLI/SLO)
   - Set up proactive alerts for error rates, latency p99, database connection pool exhaustion
   - Monitor playbook execution success rates and failure modes
   - Track MTTR (Mean Time To Resolution) and MTTD (Mean Time To Detect) trends

3. **Performance Monitoring**
   - Set up application performance monitoring (APM) dashboard
   - Monitor database query performance and implement query optimization
   - Track API endpoint latencies and identify bottlenecks
   - Implement synthetic monitoring for critical user workflows

### Database & Schema Management

1. **Migration Strategy**
   - Enforce migration-based schema change control (Alembic)
   - Disable or remove `CREATE_TABLES_ON_STARTUP` in production
   - Implement rollback testing for all migrations
   - Use database versioning to track schema lineage

2. **Data Lifecycle**
   - Implement retention policies for alert data (e.g., 90 days)
   - Archive resolved incidents to cold storage
   - Implement GDPR/data privacy compliance for PII handling
   - Add data export capabilities for evidence preservation

### Testing & Quality

1. **Automated Testing**
   - Add comprehensive unit tests for all backend services (minimum 80% coverage)
   - Add integration tests for API endpoints
   - Implement end-to-end tests that trigger lab attacks and validate incident creation
   - Add frontend component and page tests

2. **Performance Testing**
   - Load test alert ingestion under realistic traffic (1000+ alerts/sec)
   - Stress test playbook execution with complex multi-step workflows
   - Benchmark database queries for slow query identification
   - Test frontend responsiveness with large incident datasets

3. **Security Testing**
   - Add OWASP Top 10 vulnerability scanning to CI/CD
   - Implement dependency vulnerability scanning (Snyk, Dependabot)
   - Add input validation and output encoding testing
   - Perform regular penetration testing

### DevOps & Operations

1. **CI/CD Pipeline**
   - Automate linting, type checking, and unit tests on every commit
   - Add container image scanning for vulnerabilities
   - Implement progressive rollout strategy with automated rollback
   - Add approval gate for production deployments

2. **Runbooks & Automation**
   - Create incident response runbooks for common failure scenarios
   - Automate alerting for production issues
   - Implement on-call rotation with escalation policies
   - Add automated recovery procedures (e.g., queue clearing, cache invalidation)

3. **Documentation**
   - Maintain runbooks for operational procedures
   - Document connector integration patterns and SDK requirements
   - Create troubleshooting guides for common issues
   - Maintain architectural decision records (ADRs)

### Migration Path

**Phase 1** (Weeks 1-4): Security & Secrets
- Implement secrets manager integration
- Add RBAC framework and SSO readiness
- Disable dev token endpoints

**Phase 2** (Weeks 5-8): Infrastructure & Async
- Add async worker queue for playbooks
- Implement caching layer
- Set up basic monitoring and logging

**Phase 3** (Weeks 9-12): Testing & Observability
- Achieve unit test coverage baseline
- Add end-to-end test automation
- Implement SLO-based alerting

**Phase 4** (Weeks 13+): Scale & Hardening
- Load test and optimize for scale
- Add performance monitoring and optimization
- Implement advanced security controls

This roadmap provides a clear path from current strong prototype to hardened, production-grade SOAR deployment suitable for enterprise security operations environments.
