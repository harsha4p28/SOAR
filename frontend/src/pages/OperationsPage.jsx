import { useEffect, useState } from 'react';
import { useSoar } from '../context/SoarContext';

function OperationsPage() {
  const {
    loadAlerts,
    loadConnectors,
    createConnector,
    checkConnector,
    defaultAlert,
    ingestAlert,
    setStatus,
  } = useSoar();

  const [alerts, setAlerts] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [alertInput, setAlertInput] = useState(defaultAlert);
  const [connectorInput, setConnectorInput] = useState({
    name: 'Primary SIEM',
    category: 'SIEM',
    base_url: 'https://siem.local/api',
    auth_type: 'token',
  });

  async function refreshOperations() {
    try {
      const [alertData, connectorData] = await Promise.all([loadAlerts(), loadConnectors()]);
      setAlerts(alertData);
      setConnectors(connectorData);
    } catch (error) {
      setStatus(error.message);
    }
  }

  useEffect(() => {
    refreshOperations();
  }, []);

  async function registerConnector() {
    try {
      await createConnector(connectorInput);
      await refreshOperations();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function runAlertIngest() {
    try {
      await ingestAlert(alertInput);
      await refreshOperations();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function runHealthCheck(connectorId) {
    try {
      await checkConnector(connectorId);
      await refreshOperations();
      setStatus(`Connector #${connectorId} health checked.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <>
      <section className="grid two-cols">
        <article className="card">
          <h2>Alert Operations</h2>
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
          <button onClick={runAlertIngest}>Ingest Alert</button>
        </article>

        <article className="card">
          <h2>Connector Registry</h2>
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
          <label>Base URL</label>
          <input
            value={connectorInput.base_url}
            onChange={(event) => setConnectorInput({ ...connectorInput, base_url: event.target.value })}
          />
          <button onClick={registerConnector}>Register Connector</button>
        </article>
      </section>

      <section className="grid two-cols">
        <article className="card">
          <h2>Recent Alerts</h2>
          <button onClick={refreshOperations}>Refresh</button>
          <ul className="list">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <strong>{alert.attack_type}</strong> {alert.endpoint} ({alert.status})
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Integration Health</h2>
          <button onClick={refreshOperations}>Refresh</button>
          <ul className="list">
            {connectors.map((connector) => (
              <li key={connector.id}>
                <strong>{connector.name}</strong> {connector.category} ({connector.status})
                <div className="inline-actions">
                  <button onClick={() => runHealthCheck(connector.id)}>Check Health</button>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </>
  );
}

export default OperationsPage;
