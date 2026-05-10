import { useEffect, useState } from "react";
import { useSoar } from "../context/SoarContext";
import { focusOutput } from "../utils/focusOutput";

function GovernancePage() {
  const { loadAuditEvents, loadApprovals, decideApproval, setStatus } =
    useSoar();
  const [auditEvents, setAuditEvents] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);
  const [recentDecisionsCurrentPage, setRecentDecisionsCurrentPage] = useState(1);
  const perPage = 10;
  
  const pendingApprovals = approvals.filter(
    (approval) => approval.approval_status === "pending",
  );
  const decidedApprovals = approvals.filter(
    (approval) => approval.approval_status !== "pending",
  );
  
  const auditPageCount = Math.max(1, Math.ceil(auditEvents.length / perPage));
  const auditPageItems = auditEvents.slice((auditCurrentPage - 1) * perPage, auditCurrentPage * perPage);
  
  const recentDecisionsPageCount = Math.max(1, Math.ceil(decidedApprovals.length / perPage));
  const recentDecisionsPageItems = decidedApprovals.slice((recentDecisionsCurrentPage - 1) * perPage, recentDecisionsCurrentPage * perPage);

  async function refreshGovernance() {
    try {
      const [auditData, approvalData] = await Promise.all([
        loadAuditEvents(),
        loadApprovals(),
      ]);
      setAuditEvents(auditData);
      setApprovals(approvalData);
      setAuditCurrentPage(1);
      setRecentDecisionsCurrentPage(1);
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
      // Optimistically update the approval in the UI so the queue clears immediately.
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
        <p className="muted">
          Pending: {pendingApprovals.length} | Resolved: {decidedApprovals.length}
        </p>
        <button onClick={refreshGovernance}>Refresh</button>
        <ul className="list">
          {pendingApprovals.length === 0 && <li>No pending approvals.</li>}
          {pendingApprovals.map((approval) => (
            <li key={approval.id}>
              <strong>Approval #{approval.id}</strong> for incident #
              {approval.incident_id} ({approval.approval_type})
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

        <h3>Recent Decisions</h3>
        <ul className="list">
          {decidedApprovals.length === 0 && <li>No resolved approvals yet.</li>}
          {recentDecisionsPageItems.map((approval) => (
            <li key={approval.id}>
              <strong>Approval #{approval.id}</strong> for incident #
              {approval.incident_id} is {approval.approval_status}
            </li>
          ))}
        </ul>
        {recentDecisionsPageCount > 1 && (
          <div className="pagination">
            <button
              disabled={recentDecisionsCurrentPage === 1}
              onClick={() => setRecentDecisionsCurrentPage(recentDecisionsCurrentPage - 1)}
            >
              Previous
            </button>
            <span>
              Page {recentDecisionsCurrentPage} of {recentDecisionsPageCount}
            </span>
            <button
              disabled={recentDecisionsCurrentPage === recentDecisionsPageCount}
              onClick={() => setRecentDecisionsCurrentPage(recentDecisionsCurrentPage + 1)}
            >
              Next
            </button>
          </div>
        )}
      </article>

      <article
        className="card focus-target"
        id="governance-audit-output"
        tabIndex="-1"
      >
        <h2>Audit Trail</h2>
        <button onClick={refreshGovernance}>Refresh</button>
        <ul className="list">
          {auditEvents.length === 0 && <li>No audit events yet.</li>}
          {auditPageItems.map((event) => (
            <li key={event.id}>
              <strong>{event.event_type}</strong> {event.entity_type} #
              {event.entity_id ?? "-"} by {event.actor || "system"}
            </li>
          ))}
        </ul>
        {auditPageCount > 1 && (
          <div className="pagination">
            <button
              disabled={auditCurrentPage === 1}
              onClick={() => setAuditCurrentPage(auditCurrentPage - 1)}
            >
              Previous
            </button>
            <span>
              Page {auditCurrentPage} of {auditPageCount} ({auditEvents.length} total)
            </span>
            <button
              disabled={auditCurrentPage === auditPageCount}
              onClick={() => setAuditCurrentPage(auditCurrentPage + 1)}
            >
              Next
            </button>
          </div>
        )}
      </article>
    </section>
  );
}

export default GovernancePage;
