import { useEffect, useState } from 'react';
import { useSoar } from '../context/SoarContext';
import { focusOutput } from '../utils/focusOutput';

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
  const [alertsCurrentPage, setAlertsCurrentPage] = useState(1);
  const [connectorsCurrentPage, setConnectorsCurrentPage] = useState(1);
  const perPage = 10;
  const [alertInput, setAlertInput] = useState(defaultAlert);
  const [connectorInput, setConnectorInput] = useState({
    name: 'Primary SIEM',
    category: 'SIEM',
    base_url: 'https://siem.local/api',
    auth_type: 'token',
  });

  const alertsPageCount = Math.max(1, Math.ceil(alerts.length / perPage));
  const alertsPageItems = alerts.slice((alertsCurrentPage - 1) * perPage, alertsCurrentPage * perPage);

  const connectorsPageCount = Math.max(1, Math.ceil(connectors.length / perPage));
  const connectorsPageItems = connectors.slice((connectorsCurrentPage - 1) * perPage, connectorsCurrentPage * perPage);

  async function refreshOperations() {
    try {
      const [alertData, connectorData] = await Promise.all([loadAlerts(), loadConnectors()]);
      setAlerts(alertData);
      setConnectors(connectorData);
      setAlertsCurrentPage(1);
      setConnectorsCurrentPage(1);
      focusOutput('operations-alert-output');
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
      focusOutput('operations-connector-output');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function runAlertIngest() {
    try {
      await ingestAlert(alertInput);
      await refreshOperations();
      focusOutput('operations-alert-output');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function runHealthCheck(connectorId) {
    try {
      await checkConnector(connectorId);
      await refreshOperations();
      setStatus(`Connector #${connectorId} health checked.`);
      focusOutput('operations-connector-output');
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
        <article className="card focus-target" id="operations-alert-output" tabIndex="-1">
          <h2>Recent Alerts</h2>
          <button onClick={refreshOperations}>Refresh</button>
          <ul className="list">
            {alerts.length === 0 && <li>No alerts.</li>}
            {alertsPageItems.map((alert) => (
              <li key={alert.id}>
                <strong>{alert.attack_type}</strong> {alert.endpoint} ({alert.status})
              </li>
            ))}
          </ul>
          {alertsPageCount > 1 && (
            <div className="pagination">
              <button
                disabled={alertsCurrentPage === 1}
                onClick={() => setAlertsCurrentPage(alertsCurrentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {alertsCurrentPage} of {alertsPageCount} ({alerts.length} total)
              </span>
              <button
                disabled={alertsCurrentPage === alertsPageCount}
                onClick={() => setAlertsCurrentPage(alertsCurrentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </article>

        <article className="card focus-target" id="operations-connector-output" tabIndex="-1">
          <h2>Integration Health</h2>
          <button onClick={refreshOperations}>Refresh</button>
          <ul className="list">
            {connectors.length === 0 && <li>No connectors registered.</li>}
            {connectorsPageItems.map((connector) => (
              <li key={connector.id}>
                <strong>{connector.name}</strong> {connector.category} ({connector.status})
                <div className="inline-actions">
                  <button onClick={() => runHealthCheck(connector.id)}>Check Health</button>
                </div>
              </li>
            ))}
          </ul>
          {connectorsPageCount > 1 && (
            <div className="pagination">
              <button
                disabled={connectorsCurrentPage === 1}
                onClick={() => setConnectorsCurrentPage(connectorsCurrentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {connectorsCurrentPage} of {connectorsPageCount} ({connectors.length} total)
              </span>
              <button
                disabled={connectorsCurrentPage === connectorsPageCount}
                onClick={() => setConnectorsCurrentPage(connectorsCurrentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </article>
      </section>
    </>
  );
}

export default OperationsPage;
