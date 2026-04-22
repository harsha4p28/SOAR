import { useMemo, useState } from 'react';
import { apiRequest } from './api';

const defaultAlert = {
  attack_type: 'SQL_INJECTION',
  endpoint: '/api/orders?id=2',
  http_method: 'GET',
  source: 'waf',
  source_ip: '10.0.0.20',
  scanner_confidence: 0.82,
  waf_confidence: 0.76,
  auth_state: 'authenticated',
  payload: "' OR 1=1 --",
  target_component: 'checkout-service',
  environment: 'production',
};

function App() {
  const [token, setToken] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [remediation, setRemediation] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [auditEvents, setAuditEvents] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [alertInput, setAlertInput] = useState(defaultAlert);
  const [status, setStatus] = useState('Ready');

  const incidentCountLabel = useMemo(() => {
    const open = incidents.filter((item) => item.status !== 'closed').length;
    return `${open} active / ${incidents.length} total`;
  }, [incidents]);

  async function bootstrapAdmin() {
    try {
      const result = await apiRequest('/auth/bootstrap-admin', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', email: 'admin@soar.local' }),
      });
      setToken(result.api_token);
      setStatus('Bootstrap completed. Copy token to a secure vault.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function ingestAlert() {
    try {
      await apiRequest(
        '/alerts',
        {
          method: 'POST',
          body: JSON.stringify(alertInput),
        },
        token
      );
      setStatus('Alert ingested and triaged.');
      await loadAlerts();
      await loadIncidents();
      await loadMetrics();
      await loadAuditEvents();
      await loadApprovals();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function loadAlerts() {
    try {
      const result = await apiRequest('/alerts', {}, token);
      setAlerts(result);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function loadIncidents() {
    try {
      const result = await apiRequest('/alerts/incidents', {}, token);
      setIncidents(result);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function loadMetrics() {
    try {
      const result = await apiRequest('/dashboard/metrics', {}, token);
      setMetrics(result);
    } catch (error) {
      setStatus(error.message);
    }
  }
  
  async function loadAuditEvents() {
    try {
      const result = await apiRequest('/audit', {}, token);
      setAuditEvents(result);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function loadApprovals() {
    try {
      const result = await apiRequest('/playbooks/approvals', {}, token);
      setApprovals(result);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function executePlaybook(incidentId) {
    try {
      await apiRequest(`/playbooks/execute/${incidentId}`, { method: 'POST' }, token);
      setStatus(`Playbook executed for incident #${incidentId}.`);
      await loadIncidents();
      await loadMetrics();
      await loadAuditEvents();
      await loadApprovals();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function showRemediation(incidentId) {
    try {
      const result = await apiRequest(`/incidents/${incidentId}/remediation-plan`, {}, token);
      setRemediation(result);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function openTimeline(incidentId) {
    try {
      const result = await apiRequest(`/incidents/${incidentId}/timeline`, {}, token);
      setTimeline(result);
      setRemediation(null);
      await loadAuditEvents();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function addNote(incidentId) {
    try {
      if (!noteText.trim()) {
        setStatus('Enter a case note first.');
        return;
      }
      await apiRequest(
        `/incidents/${incidentId}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({ note: noteText }),
        },
        token
      );
      setNoteText('');
      setStatus(`Note added to incident #${incidentId}.`);
      await openTimeline(incidentId);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function updateIncidentStatus(incidentId, nextStatus) {
    try {
      await apiRequest(
        `/incidents/${incidentId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        },
        token
      );
      setStatus(`Incident #${incidentId} moved to ${nextStatus}.`);
      await loadIncidents();
      await openTimeline(incidentId);
      await loadMetrics();
      await loadAuditEvents();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function decideApproval(approvalId, decision) {
    try {
      await apiRequest(
        `/playbooks/approvals/${approvalId}/decision`,
        {
          method: 'POST',
          body: JSON.stringify({ decision }),
        },
        token
      );
      setStatus(`Approval #${approvalId} ${decision}.`);
      await loadApprovals();
      await loadAuditEvents();
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <div className="container">
      <header className="hero">
        <h1>Web Application SOAR Console</h1>
        <p>Vulnerability-aware detection, contextual response, and root-cause remediation.</p>
      </header>

      <section className="grid two-cols">
        <article className="card">
          <h2>1. Authentication</h2>
          <button onClick={bootstrapAdmin}>Bootstrap Admin</button>
          <label>Bearer Token</label>
          <textarea
            rows="3"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste API token"
          />
        </article>

        <article className="card">
          <h2>2. Alert Intake</h2>
          <label>Attack Type</label>
          <select
            value={alertInput.attack_type}
            onChange={(event) => setAlertInput({ ...alertInput, attack_type: event.target.value })}
          >
            <option>SQL_INJECTION</option>
            <option>CROSS_SITE_SCRIPTING</option>
            <option>SERVER_SIDE_REQUEST_FORGERY</option>
            <option>CROSS_SITE_REQUEST_FORGERY</option>
            <option>INSECURE_DIRECT_OBJECT_REFERENCES</option>
            <option>REMOTE_CODE_EXECUTION</option>
          </select>
          <label>Endpoint</label>
          <input
            value={alertInput.endpoint}
            onChange={(event) => setAlertInput({ ...alertInput, endpoint: event.target.value })}
          />
          <button onClick={ingestAlert}>Ingest Alert</button>
        </article>
      </section>

      <section className="grid three-cols">
        <article className="card">
          <h2>Alerts</h2>
          <button onClick={loadAlerts}>Refresh Alerts</button>
          <ul className="list">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <strong>{alert.attack_type}</strong> {alert.endpoint} ({alert.status})
              </li>
            ))}
          </ul>
        </article>
        
        <article className="card">
          <h2>Audit Trail</h2>
          <button onClick={loadAuditEvents}>Refresh Audit Log</button>
          <ul className="list">
            {auditEvents.map((event) => (
              <li key={event.id}>
                <strong>{event.event_type}</strong> {event.entity_type} #{event.entity_id ?? '-'} by {event.actor || 'system'}
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Approvals</h2>
          <button onClick={loadApprovals}>Refresh Approvals</button>
          <ul className="list">
            {approvals.map((approval) => (
              <li key={approval.id}>
                <strong>{approval.approval_type}</strong> incident #{approval.incident_id} ({approval.approval_status})
                <div className="inline-actions">
                  <button onClick={() => decideApproval(approval.id, 'approved')}>Approve</button>
                  <button onClick={() => decideApproval(approval.id, 'rejected')}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Incidents</h2>
          <button onClick={loadIncidents}>Refresh Incidents</button>
          <p>{incidentCountLabel}</p>
          <ul className="list">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <strong>{incident.attack_type}</strong> {incident.severity} ({incident.status})
                <div className="inline-actions">
                  <button onClick={() => openTimeline(incident.id)}>Open Timeline</button>
                  <button onClick={() => executePlaybook(incident.id)}>Execute Playbook</button>
                  <button onClick={() => showRemediation(incident.id)}>Remediation</button>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Metrics</h2>
          <button onClick={loadMetrics}>Refresh Metrics</button>
          {metrics ? (
            <div className="metrics">
              <p>Total Alerts: {metrics.total_alerts}</p>
              <p>Suppressed Alerts: {metrics.suppressed_alerts}</p>
              <p>False Positive Rate: {metrics.false_positive_rate}</p>
              <p>Open Incidents: {metrics.open_incidents}</p>
              <p>Response Actions: {metrics.total_response_actions}</p>
            </div>
          ) : (
            <p>No metrics loaded.</p>
          )}
        </article>
      </section>

      <section className="card">
        <h2>Case Timeline</h2>
        {timeline ? (
          <div>
            <p>
              Case #{timeline.incident.id}: {timeline.incident.title}
            </p>
            <p>
              Owner: {timeline.incident.owner || 'unassigned'} | Status: {timeline.incident.status}
            </p>
            <div className="grid two-cols">
              <div>
                <h3>Alert Context</h3>
                <p>Endpoint: {timeline.alert.endpoint}</p>
                <p>Source: {timeline.alert.source}</p>
                <p>Exploitability: {timeline.alert.exploitability_score}</p>
              </div>
              <div>
                <h3>Case Controls</h3>
                <textarea
                  rows="4"
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Add analyst note"
                />
                <div className="inline-actions">
                  <button onClick={() => addNote(timeline.incident.id)}>Add Note</button>
                  <button onClick={() => updateIncidentStatus(timeline.incident.id, 'in_review')}>Mark In Review</button>
                  <button onClick={() => updateIncidentStatus(timeline.incident.id, 'closed')}>Close Case</button>
                </div>
              </div>
            </div>
            <h3>Actions</h3>
            <ul className="list">
              {timeline.actions.map((action) => (
                <li key={action.id}>
                  {action.action_type} - {action.action_status}
                </li>
              ))}
            </ul>
            <h3>Notes</h3>
            <ul className="list">
              {timeline.notes.map((note) => (
                <li key={note.id}>
                  {note.author}: {note.note}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>Select an incident and open its case timeline.</p>
        )}
      </section>

      <section className="card">
        <h2>Remediation Guidance</h2>
        {remediation ? (
          <div>
            <p>
              Incident #{remediation.incident_id}: {remediation.attack_type}
            </p>
            <h3>Code Fixes</h3>
            <ul className="list">
              {remediation.code_fixes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3>Verification</h3>
            <ul className="list">
              {remediation.verification.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>Select an incident and click Remediation.</p>
        )}
      </section>

      <footer className="status">Status: {status}</footer>
    </div>
  );
}

export default App;
