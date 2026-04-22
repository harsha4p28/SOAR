import { useState } from 'react';
import { useSoar } from '../context/SoarContext';

function HomePage() {
  const {
    token,
    setToken,
    defaultAlert,
    bootstrapAdmin,
    ingestAlert,
    loadAlerts,
    loadIncidents,
    loadMetrics,
    loadAuditEvents,
    loadApprovals,
    loadConnectors,
    setStatus,
  } = useSoar();
  const [alertInput, setAlertInput] = useState(defaultAlert);

  async function runGuidedDemo() {
    try {
      const currentToken = token || (await bootstrapAdmin());
      await ingestAlert(alertInput, currentToken);
      await Promise.all([
        loadAlerts(currentToken),
        loadIncidents(currentToken),
        loadMetrics(currentToken),
        loadAuditEvents(currentToken),
        loadApprovals(currentToken),
        loadConnectors(currentToken),
      ]);
      setStatus('Guided demo completed. Open Dashboard and Incidents for live data.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <>
      <section className="card">
        <h2>Quick Start</h2>
        <ol className="instructions">
          <li>Bootstrap admin to generate your API token.</li>
          <li>Run guided demo to send a realistic attack alert.</li>
          <li>Navigate to Dashboard and Incidents to monitor live results.</li>
        </ol>
        <div className="inline-actions quick-actions">
          <button onClick={bootstrapAdmin}>Bootstrap Admin</button>
          <button onClick={runGuidedDemo}>Run Guided Demo</button>
          <button onClick={() => setToken('')}>Clear Token</button>
        </div>
      </section>

      <section className="grid two-cols">
        <article className="card">
          <h2>Access</h2>
          <label>Bearer Token</label>
          <textarea
            rows="4"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste API token here"
          />
        </article>

        <article className="card">
          <h2>Demo Alert Payload</h2>
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
          <button onClick={() => ingestAlert(alertInput)}>Ingest Alert</button>
        </article>
      </section>
    </>
  );
}

export default HomePage;
