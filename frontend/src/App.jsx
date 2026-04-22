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

  async function executePlaybook(incidentId) {
    try {
      await apiRequest(`/playbooks/execute/${incidentId}`, { method: 'POST' }, token);
      setStatus(`Playbook executed for incident #${incidentId}.`);
      await loadIncidents();
      await loadMetrics();
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
          <h2>Incidents</h2>
          <button onClick={loadIncidents}>Refresh Incidents</button>
          <p>{incidentCountLabel}</p>
          <ul className="list">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <strong>{incident.attack_type}</strong> {incident.severity} ({incident.status})
                <div className="inline-actions">
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
