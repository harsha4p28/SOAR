import { useEffect, useState } from "react";
import { useSoar } from "../context/SoarContext";
import { focusOutput } from "../utils/focusOutput";

function IncidentsPage() {
  const {
    loadIncidents,
    executePlaybook,
    loadTimeline,
    loadReport,
    loadRemediation,
    addNote,
    updateIncidentStatus,
    setStatus,
  } = useSoar();

  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 6;
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [attackTypeFilter, setAttackTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeline, setTimeline] = useState(null);
  const [report, setReport] = useState(null);
  const [remediation, setRemediation] = useState(null);
  const [approval, setApproval] = useState(null);
  const [noteText, setNoteText] = useState("");

  const filteredIncidents = incidents.filter((incident) => {
    const matchesStatus =
      statusFilter === "all" || incident.status === statusFilter;
    const matchesSeverity =
      severityFilter === "all" || incident.severity === severityFilter;
    const matchesAttackType =
      attackTypeFilter === "all" || incident.attack_type === attackTypeFilter;
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !search ||
      `${incident.id} ${incident.title || ""} ${incident.attack_type || ""} ${incident.status || ""} ${incident.severity || ""}`
        .toLowerCase()
        .includes(search);

    return matchesStatus && matchesSeverity && matchesAttackType && matchesSearch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, severityFilter, attackTypeFilter, searchTerm]);

  async function refreshIncidents() {
    try {
      const result = await loadIncidents();
      setIncidents(result);
    } catch (error) {
      setStatus(error.message);
    }
  }

  useEffect(() => {
    refreshIncidents();
  }, []);

  useEffect(() => {
    if (filteredIncidents.length === 0) {
      setSelectedIncidentId(null);
      setTimeline(null);
      setReport(null);
      setRemediation(null);
      return;
    }

    const selectedStillVisible = filteredIncidents.some(
      (incident) => incident.id === selectedIncidentId,
    );

    if (!selectedIncidentId || !selectedStillVisible) {
      const first = filteredIncidents[0].id;
      openCase(first);
    }
  }, [filteredIncidents, selectedIncidentId]);

  async function openCase(incidentId) {
    try {
      const [timelineData, reportData, remediationData] = await Promise.all([
        loadTimeline(incidentId),
        loadReport(incidentId),
        loadRemediation(incidentId),
      ]);
      setSelectedIncidentId(incidentId);
      setTimeline(timelineData);
      setReport(reportData);
      setRemediation(remediationData);
      focusOutput("incidents-timeline-output");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function runPlaybook(incidentId) {
    try {
      const result = await executePlaybook(incidentId);

      if (result && result.approval_required) {
        setApproval(result.approval || null);
        setStatus("Playbook execution requires approval and is pending.");
        await refreshIncidents();
        focusOutput("governance-approvals-output");
        return;
      }

      await refreshIncidents();
      await openCase(incidentId);
      focusOutput("incidents-report-output");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function addCaseNote() {
    if (!selectedIncidentId || !noteText.trim()) {
      setStatus("Select a case and add a note body first.");
      return;
    }
    try {
      await addNote(selectedIncidentId, noteText);
      setNoteText("");
      await openCase(selectedIncidentId);
      focusOutput("incidents-timeline-output");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function moveStatus(nextStatus) {
    if (!selectedIncidentId) {
      setStatus("Select a case first.");
      return;
    }
    try {
      await updateIncidentStatus(selectedIncidentId, nextStatus);
      await refreshIncidents();
      await openCase(selectedIncidentId);
      focusOutput("incidents-report-output");
    } catch (error) {
      setStatus(error.message);
    }
  }

  function clearFilters() {
    setStatusFilter("all");
    setSeverityFilter("all");
    setAttackTypeFilter("all");
    setSearchTerm("");
  }

  const attackTypes = [...new Set(incidents.map((incident) => incident.attack_type).filter(Boolean))];
  const severities = [...new Set(incidents.map((incident) => incident.severity).filter(Boolean))];
  const statuses = [...new Set(incidents.map((incident) => incident.status).filter(Boolean))];
  const pageCount = Math.max(1, Math.ceil(filteredIncidents.length / perPage));
  const pageItems = filteredIncidents.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <>
      <section className="grid incident-stack">
        <article className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Incident Queue</h2>
            <div>
              <button onClick={refreshIncidents}>Refresh</button>
            </div>
          </div>

          <div
            className="incident-filters"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
              margin: "0.75rem 0 1rem",
              padding: "0.75rem",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
            }}
          >
            <div>
              <label>Status</label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Severity</label>
              <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
                <option value="all">All</option>
                {severities.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Vuln Type</label>
              <select value={attackTypeFilter} onChange={(event) => setAttackTypeFilter(event.target.value)}>
                <option value="all">All</option>
                {attackTypes.map((attackType) => (
                  <option key={attackType} value={attackType}>
                    {attackType}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Search</label>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ID, title, type, status"
              />
            </div>
            <div style={{ display: "flex", alignItems: "end" }}>
              <button onClick={clearFilters}>Clear Filters</button>
            </div>
          </div>

          <p className="muted" style={{ marginTop: 0 }}>
            Showing {filteredIncidents.length} of {incidents.length} incidents
          </p>

          <div className="incident-cards">
            {incidents.length === 0 && <p>No incidents.</p>}
            {incidents.length > 0 && filteredIncidents.length === 0 && <p>No incidents match the current filters.</p>}

            {pageItems.map((incident) => (
              <div
                key={incident.id}
                className={`incident-card ${selectedIncidentId === incident.id ? "selected" : ""}`}
              >
                <div className="card-header">
                  <div>
                    <strong>{incident.attack_type}</strong>
                    <div className="muted">
                      {incident.severity} • {incident.status}
                    </div>
                  </div>
                  <div className="card-actions">
                    <button onClick={() => openCase(incident.id)}>Open</button>
                    <button
                      onClick={() => runPlaybook(incident.id)}
                      disabled={incident.status === "closed"}
                      title={incident.status === "closed" ? "Incident already closed" : "Run playbook"}
                    >
                      Playbook
                    </button>
                  </div>
                </div>
                <p className="incident-desc">{incident.description || incident.title || ""}</p>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
              Prev
            </button>
            <span>
              Page {currentPage} / {pageCount}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage >= pageCount}
            >
              Next
            </button>
          </div>
        </article>
      </section>

      <section className="grid two-cols">
        <article className="card">
          <h2>Case Details</h2>
          {approval && (
            <div
              className="approval-banner"
              style={{
                marginBottom: "0.6rem",
                padding: "0.6rem",
                background: "#fff7e6",
                border: "1px solid #ffd966",
              }}
            >
              <strong>Approval pending:</strong> Approval #{approval.id} required for this playbook.
              <div className="inline-actions" style={{ display: "inline-block", marginLeft: "0.6rem" }}>
                <button
                  onClick={() => {
                    setApproval(null);
                    window.location.href = "/governance";
                  }}
                >
                  View Approvals
                </button>
              </div>
            </div>
          )}
          <p>Selected Incident: {selectedIncidentId || "none"}</p>
          <div className="case-controls inline-actions">
            <button onClick={addCaseNote}>Add Note</button>
            <button onClick={() => moveStatus("in_review")}>Move to In Review</button>
            <button onClick={() => moveStatus("closed")}>Close Incident</button>
            <button
              onClick={() => {
                if (!selectedIncidentId) return;
                const index = filteredIncidents.findIndex((i) => i.id === selectedIncidentId);
                if (index > 0) openCase(filteredIncidents[index - 1].id);
              }}
            >
              Prev Case
            </button>
            <button
              onClick={() => {
                if (!selectedIncidentId) return;
                const index = filteredIncidents.findIndex((i) => i.id === selectedIncidentId);
                if (index < filteredIncidents.length - 1) openCase(filteredIncidents[index + 1].id);
              }}
            >
              Next Case
            </button>
          </div>

          <label style={{ marginTop: "0.8rem" }}>Analyst Note</label>
          <textarea
            rows="4"
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="Add analyst note"
          />
        </article>
      </section>

      <section className="grid two-cols">
        <article className="card focus-target" id="incidents-timeline-output" tabIndex="-1">
          <h2>Timeline</h2>
          {timeline ? (
            <div>
              <p>
                <strong>{timeline.incident.title}</strong>
              </p>
              <p>
                Status: {timeline.incident.status} | Owner: {timeline.incident.owner || "unassigned"}
              </p>
              <h3>Actions</h3>
              <ul className="list">
                {timeline.actions.map((item) => (
                  <li key={item.id}>
                    {item.action_type} - {item.action_status}
                  </li>
                ))}
              </ul>
              <h3>Notes</h3>
              <ul className="list">
                {timeline.notes.map((item) => (
                  <li key={item.id}>
                    {item.author}: {item.note}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>Open a case to inspect timeline details.</p>
          )}
        </article>

        <article className="card focus-target" id="incidents-report-output" tabIndex="-1">
          <h2>Incident Report + Remediation</h2>
          {report ? (
            <div>
              <p>
                <strong>Report:</strong> {report.incident.title}
              </p>
              <p>
                Severity: {report.incident.severity} | Status: {report.incident.status}
              </p>
              <h3>Remediation</h3>
              <ul className="list">
                {(remediation?.code_fixes || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p>Open a case to view report and remediation guidance.</p>
          )}
        </article>
      </section>
    </>
  );
}

export default IncidentsPage;
