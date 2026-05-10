import { useEffect, useState } from "react";
import { useSoar } from "../context/SoarContext";
import { focusOutput } from "../utils/focusOutput";

function GovernancePage() {
  const { loadAuditEvents, loadApprovals, decideApproval, setStatus } =
    useSoar();
  const [auditEvents, setAuditEvents] = useState([]);
  const [approvals, setApprovals] = useState([]);

  async function refreshGovernance() {
    try {
      const [auditData, approvalData] = await Promise.all([
        loadAuditEvents(),
        loadApprovals(),
      ]);
      setAuditEvents(auditData);
      setApprovals(approvalData);
      focusOutput("governance-approvals-output");
    } catch (error) {
      setStatus(error.message);
    }
  }

  useEffect(() => {
    refreshGovernance();
  }, []);

  async function updateApproval(approvalId, decision) {
    try {
      await decideApproval(approvalId, decision);
      // Optimistically update the approval in the UI so it disappears/updates immediately
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === approvalId ? { ...a, approval_status: decision } : a,
        ),
      );
      // Focus approvals area so user sees the updated queue
      focusOutput("governance-approvals-output");
      // Refresh in background to ensure server-state sync
      await refreshGovernance();
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="grid two-cols">
      <article
        className="card focus-target"
        id="governance-approvals-output"
        tabIndex="-1"
      >
        <h2>Approval Queue</h2>
        <button onClick={refreshGovernance}>Refresh</button>
        <ul className="list">
          {approvals.map((approval) => (
            <li key={approval.id}>
              <strong>{approval.approval_type}</strong> incident #
              {approval.incident_id} ({approval.approval_status})
              <div className="inline-actions">
                <button onClick={() => updateApproval(approval.id, "approved")}>
                  Approve
                </button>
                <button onClick={() => updateApproval(approval.id, "rejected")}>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      </article>

      <article
        className="card focus-target"
        id="governance-audit-output"
        tabIndex="-1"
      >
        <h2>Audit Trail</h2>
        <button onClick={refreshGovernance}>Refresh</button>
        <ul className="list">
          {auditEvents.map((event) => (
            <li key={event.id}>
              <strong>{event.event_type}</strong> {event.entity_type} #
              {event.entity_id ?? "-"} by {event.actor || "system"}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

export default GovernancePage;
