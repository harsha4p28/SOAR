import { createContext, useContext, useMemo, useState } from 'react';
import { apiRequest } from '../api';

const SoarContext = createContext(null);

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

function getStoredToken() {
  return localStorage.getItem('soar_api_token') || '';
}

export function SoarProvider({ children }) {
  const [token, setTokenState] = useState(getStoredToken);
  const [status, setStatus] = useState('Ready');

  const setToken = (nextToken) => {
    setTokenState(nextToken);
    if (nextToken) {
      localStorage.setItem('soar_api_token', nextToken);
    } else {
      localStorage.removeItem('soar_api_token');
    }
  };

  async function bootstrapAdmin() {
    const result = await apiRequest('/auth/bootstrap-admin', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', email: 'admin@soar.local' }),
    });
    setToken(result.api_token);
    setStatus('Admin token created for the SOAR console.');
    return result.api_token;
  }

  async function ingestAlert(payload = defaultAlert, authToken = token) {
    const result = await apiRequest(
      '/alerts',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      authToken
    );
    setStatus('Alert ingested and triaged.');
    return result;
  }

  const loadAlerts = (authToken = token) => apiRequest('/alerts', {}, authToken);
  const loadIncidents = (authToken = token) => apiRequest('/alerts/incidents', {}, authToken);
  const loadMetrics = (authToken = token) => apiRequest('/dashboard/metrics', {}, authToken);
  const loadOverview = (authToken = token) => apiRequest('/dashboard/overview', {}, authToken);
  const loadTimeseries = (authToken = token) => apiRequest('/dashboard/timeseries', {}, authToken);
  const loadAuditEvents = (authToken = token) => apiRequest('/audit', {}, authToken);
  const loadApprovals = (authToken = token) => apiRequest('/playbooks/approvals', {}, authToken);
  const loadConnectors = (authToken = token) => apiRequest('/connectors', {}, authToken);

  async function executePlaybook(incidentId, authToken = token) {
    const result = await apiRequest(`/playbooks/execute/${incidentId}`, { method: 'POST' }, authToken);
    setStatus(`Playbook executed for incident #${incidentId}.`);
    return result;
  }

  const loadTimeline = (incidentId, authToken = token) =>
    apiRequest(`/incidents/${incidentId}/timeline`, {}, authToken);

  const loadReport = (incidentId, authToken = token) =>
    apiRequest(`/incidents/${incidentId}/report`, {}, authToken);

  const loadRemediation = (incidentId, authToken = token) =>
    apiRequest(`/incidents/${incidentId}/remediation-plan`, {}, authToken);

  async function addNote(incidentId, note, authToken = token) {
    const result = await apiRequest(
      `/incidents/${incidentId}/notes`,
      {
        method: 'POST',
        body: JSON.stringify({ note }),
      },
      authToken
    );
    setStatus(`Case note added to incident #${incidentId}.`);
    return result;
  }

  async function updateIncidentStatus(incidentId, nextStatus, authToken = token) {
    const result = await apiRequest(
      `/incidents/${incidentId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      },
      authToken
    );
    setStatus(`Incident #${incidentId} moved to ${nextStatus}.`);
    return result;
  }

  async function decideApproval(approvalId, decision, authToken = token) {
    const result = await apiRequest(
      `/playbooks/approvals/${approvalId}/decision`,
      {
        method: 'POST',
        body: JSON.stringify({ decision }),
      },
      authToken
    );
    setStatus(`Approval #${approvalId} ${decision}.`);
    return result;
  }

  async function createConnector(connectorInput, authToken = token) {
    const result = await apiRequest(
      '/connectors',
      {
        method: 'POST',
        body: JSON.stringify(connectorInput),
      },
      authToken
    );
    setStatus(`Connector ${connectorInput.name} registered.`);
    return result;
  }

  const checkConnector = (connectorId, authToken = token) =>
    apiRequest(`/connectors/${connectorId}/check`, { method: 'POST' }, authToken);

  const value = useMemo(
    () => ({
      token,
      setToken,
      status,
      setStatus,
      defaultAlert,
      bootstrapAdmin,
      ingestAlert,
      loadAlerts,
      loadIncidents,
      loadMetrics,
      loadOverview,
      loadTimeseries,
      loadAuditEvents,
      loadApprovals,
      loadConnectors,
      executePlaybook,
      loadTimeline,
      loadReport,
      loadRemediation,
      addNote,
      updateIncidentStatus,
      decideApproval,
      createConnector,
      checkConnector,
    }),
    [token, status]
  );

  return <SoarContext.Provider value={value}>{children}</SoarContext.Provider>;
}

export function useSoar() {
  const context = useContext(SoarContext);
  if (!context) {
    throw new Error('useSoar must be used inside SoarProvider');
  }
  return context;
}
