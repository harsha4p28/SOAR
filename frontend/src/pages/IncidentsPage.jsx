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
  const [timeline, setTimeline] = useState(null);
  const [report, setReport] = useState(null);
  const [remediation, setRemediation] = useState(null);
  const [approval, setApproval] = useState(null);
  const [noteText, setNoteText] = useState("");

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
    // select first incident on load if none selected
    if (incidents.length > 0 && !selectedIncidentId) {
      const first = incidents[0].id;
      openCase(first);
    }
  }, [incidents]);

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

      // If backend requires approval (202), show pending UI and link to approvals
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

  return (
    <>
      <section className="grid two-cols">
        <article className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2>Incident Queue</h2>
            <div>
              <button onClick={refreshIncidents}>Refresh</button>
            </div>
          </div>

          <div className="incident-cards">
            {incidents.length === 0 && <p>No incidents.</p>}

            {incidents
              .slice((currentPage - 1) * perPage, currentPage * perPage)
              .map((incident, idx) => (
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
                      <button onClick={() => openCase(incident.id)}>
                        Open
                      </button>
                      <button onClick={() => runPlaybook(incident.id)}>
                        Playbook
                      </button>
                    </div>
                  </div>
                  <p className="incident-desc">
                    {incident.description || incident.title || ""}
                  </p>
                </div>
              ))}
          </div>

          <div className="pagination">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span>
              Page {currentPage} /{" "}
              {Math.max(1, Math.ceil(incidents.length / perPage))}
            </span>
            <button
              onClick={() =>
                setCurrentPage(
                  Math.min(
                    Math.ceil(incidents.length / perPage) || 1,
                    currentPage + 1,
                  ),
                )
              }
              disabled={currentPage >= Math.ceil(incidents.length / perPage)}
            >
              Next
            </button>
          </div>
        </article>

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
              <strong>Approval pending:</strong> Approval #{approval.id}{" "}
              required for this playbook.
              <div
                className="inline-actions"
                style={{ display: "inline-block", marginLeft: "0.6rem" }}
              >
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
            <button onClick={() => moveStatus("in_review")}>
              Move to In Review
            </button>
            <button onClick={() => moveStatus("closed")}>Close Incident</button>
            <button
              onClick={() => {
                // navigate to previous incident in the full list
                if (!selectedIncidentId) return;
                const index = incidents.findIndex(
                  (i) => i.id === selectedIncidentId,
                );
                if (index > 0) openCase(incidents[index - 1].id);
              }}
            >
              Prev Case
            </button>
            <button
              onClick={() => {
                if (!selectedIncidentId) return;
                const index = incidents.findIndex(
                  (i) => i.id === selectedIncidentId,
                );
                if (index < incidents.length - 1)
                  openCase(incidents[index + 1].id);
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
        <article
          className="card focus-target"
          id="incidents-timeline-output"
          tabIndex="-1"
        >
          <h2>Timeline</h2>
          {timeline ? (
            <div>
              <p>
                <strong>{timeline.incident.title}</strong>
              </p>
              <p>
                Status: {timeline.incident.status} | Owner:{" "}
                {timeline.incident.owner || "unassigned"}
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

        <article
          className="card focus-target"
          id="incidents-report-output"
          tabIndex="-1"
        >
          <h2>Incident Report + Remediation</h2>
          {report ? (
            <div>
              <p>
                <strong>Report:</strong> {report.incident.title}
              </p>
              <p>
                Severity: {report.incident.severity} | Status:{" "}
                {report.incident.status}
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
