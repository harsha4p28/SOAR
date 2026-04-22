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
  const [report, setReport] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [auditEvents, setAuditEvents] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [connectorInput, setConnectorInput] = useState({
    name: 'Primary WAF',
    category: 'WAF',
    base_url: 'https://waf.local/api',
    auth_type: 'token',
  });
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
      return result.api_token;
    } catch (error) {
      setStatus(error.message);
      return null;
    }
  }

  async function runGuidedDemo() {
    try {
      const currentToken = token || (await bootstrapAdmin());
      if (currentToken && !token) {
        setToken(currentToken);
      }

      await ingestAlert(currentToken);
      await loadAlerts(currentToken);
      await loadIncidents(currentToken);
      await loadMetrics(currentToken);
      await loadAuditEvents(currentToken);
      await loadApprovals(currentToken);
      await loadConnectors(currentToken);
      setStatus('Guided demo finished. Open Incidents, Timeline, Audit Trail, or Report to inspect the case.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function ingestAlert(authToken = token) {
    try {
      await apiRequest(
        '/alerts',
        {
          method: 'POST',
          body: JSON.stringify(alertInput),
        },
        authToken
      );
      setStatus('Alert ingested and triaged.');
      await loadAlerts();
      await loadIncidents();
      await loadMetrics();
      await loadAuditEvents();
      await loadApprovals();
      await loadConnectors();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function loadAlerts(authToken = token) {
    try {
      const result = await apiRequest('/alerts', {}, authToken);
      setAlerts(result);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function loadIncidents(authToken = token) {
    try {
      const result = await apiRequest('/alerts/incidents', {}, authToken);
      setIncidents(result);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function loadMetrics(authToken = token) {
    try {
      const result = await apiRequest('/dashboard/metrics', {}, authToken);
      setMetrics(result);
    } catch (error) {
      setStatus(error.message);
    }
  }
  
  async function loadAuditEvents(authToken = token) {
    try {
      const result = await apiRequest('/audit', {}, authToken);
      setAuditEvents(result);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function loadApprovals(authToken = token) {
    try {
      const result = await apiRequest('/playbooks/approvals', {}, authToken);
      setApprovals(result);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function loadConnectors(authToken = token) {
    try {
      const result = await apiRequest('/connectors', {}, authToken);
      setConnectors(result);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function createConnector() {
    try {
      await apiRequest(
        '/connectors',
        {
          method: 'POST',
          body: JSON.stringify(connectorInput),
        },
        token
      );
      setStatus('Connector registered.');
      await loadConnectors();
      await loadAuditEvents();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function checkConnector(connectorId) {
    try {
      await apiRequest(`/connectors/${connectorId}/check`, { method: 'POST' }, token);
      setStatus(`Connector #${connectorId} health checked.`);
      await loadConnectors();
      await loadAuditEvents();
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
      await loadConnectors();
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

  async function loadReport(incidentId) {
    try {
      const result = await apiRequest(`/incidents/${incidentId}/report`, {}, token);
      setReport(result);
      setTimeline(result);
      setRemediation(result.remediation);
      await loadAuditEvents();
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

      <section className="card">
        <h2>How to Use</h2>
        <ol className="instructions">
          <li>Click Bootstrap Admin to create the first API token.</li>
          <li>Keep the token in the text area. The app uses it to call the backend.</li>
          <li>Click Ingest Alert to create a sample web attack and auto-generate an incident.</li>
          <li>Open the incident Timeline or Incident Report to review actions, notes, and approvals.</li>
          <li>Execute Playbook to simulate response automation and check the Audit Trail.</li>
        </ol>
        <div className="inline-actions quick-actions">
          <button onClick={runGuidedDemo}>Run Guided Demo</button>
          <button onClick={loadAlerts}>Load Existing Alerts</button>
          <button onClick={loadIncidents}>Load Existing Incidents</button>
        </div>
      </section>

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

      <section className="card">
        <h2>Connector Registry</h2>
        <div className="grid two-cols">
          <div>
            <label>Name</label>
            <input
              value={connectorInput.name}
              onChange={(event) => setConnectorInput({ ...connectorInput, name: event.target.value })}
            />
            <label>Category</label>
            <select
              value={connectorInput.category}
              onChange={(event) => setConnectorInput({ ...connectorInput, category: event.target.value })}
            >
              <option>WAF</option>
              <option>SIEM</option>
              <option>EDR</option>
              <option>IAM</option>
              <option>EMAIL</option>
              <option>CLOUD</option>
            </select>
          </div>
          <div>
            <label>Base URL</label>
            <input
              value={connectorInput.base_url}
              onChange={(event) => setConnectorInput({ ...connectorInput, base_url: event.target.value })}
            />
            <label>Auth Type</label>
            <input
              value={connectorInput.auth_type}
              onChange={(event) => setConnectorInput({ ...connectorInput, auth_type: event.target.value })}
            />
            <button onClick={createConnector}>Register Connector</button>
          </div>
        </div>
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
          <h2>Integrations</h2>
          <button onClick={loadConnectors}>Refresh Connectors</button>
          <ul className="list">
            {connectors.map((connector) => (
              <li key={connector.id}>
                <strong>{connector.name}</strong> {connector.category} ({connector.status})
                <div className="inline-actions">
                  <button onClick={() => checkConnector(connector.id)}>Check Health</button>
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
                  <button onClick={() => loadReport(incident.id)}>Incident Report</button>
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
        <h2>Incident Report</h2>
        {report ? (
          <div>
            <p>
              Report for case #{report.incident.id}: {report.incident.title}
            </p>
            <p>
              Severity: {report.incident.severity} | Status: {report.incident.status} | Owner:{' '}
              {report.incident.owner || 'unassigned'}
            </p>
            <h3>Approvals</h3>
            <ul className="list">
              {report.approvals.map((approval) => (
                <li key={approval.id}>
                  {approval.approval_type} - {approval.approval_status}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>Select an incident and click Incident Report.</p>
        )}
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
