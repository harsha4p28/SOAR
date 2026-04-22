import { useEffect, useState } from 'react';
import { useSoar } from '../context/SoarContext';

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
  const [timeline, setTimeline] = useState(null);
  const [report, setReport] = useState(null);
  const [remediation, setRemediation] = useState(null);
  const [noteText, setNoteText] = useState('');

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
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function runPlaybook(incidentId) {
    try {
      await executePlaybook(incidentId);
      await refreshIncidents();
      await openCase(incidentId);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function addCaseNote() {
    if (!selectedIncidentId || !noteText.trim()) {
      setStatus('Select a case and add a note body first.');
      return;
    }
    try {
      await addNote(selectedIncidentId, noteText);
      setNoteText('');
      await openCase(selectedIncidentId);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function moveStatus(nextStatus) {
    if (!selectedIncidentId) {
      setStatus('Select a case first.');
      return;
    }
    try {
      await updateIncidentStatus(selectedIncidentId, nextStatus);
      await refreshIncidents();
      await openCase(selectedIncidentId);
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <>
      <section className="grid two-cols">
        <article className="card">
          <h2>Incident Queue</h2>
          <button onClick={refreshIncidents}>Refresh Incidents</button>
          <ul className="list">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <strong>{incident.attack_type}</strong> {incident.severity} ({incident.status})
                <div className="inline-actions">
                  <button onClick={() => openCase(incident.id)}>Open Case</button>
                  <button onClick={() => runPlaybook(incident.id)}>Run Playbook</button>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Case Actions</h2>
          <p>Selected Incident: {selectedIncidentId || 'none'}</p>
          <textarea
            rows="4"
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="Add analyst note"
          />
          <div className="inline-actions">
            <button onClick={addCaseNote}>Add Note</button>
            <button onClick={() => moveStatus('in_review')}>Move to In Review</button>
            <button onClick={() => moveStatus('closed')}>Close Incident</button>
          </div>
        </article>
      </section>

      <section className="grid two-cols">
        <article className="card">
          <h2>Timeline</h2>
          {timeline ? (
            <div>
              <p>
                <strong>{timeline.incident.title}</strong>
              </p>
              <p>
                Status: {timeline.incident.status} | Owner: {timeline.incident.owner || 'unassigned'}
              </p>
              <h3>Actions</h3>
              <ul className="list">
                {timeline.actions.map((item) => (
                  <li key={item.id}>{item.action_type} - {item.action_status}</li>
                ))}
              </ul>
              <h3>Notes</h3>
              <ul className="list">
                {timeline.notes.map((item) => (
                  <li key={item.id}>{item.author}: {item.note}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p>Open a case to inspect timeline details.</p>
          )}
        </article>

        <article className="card">
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
