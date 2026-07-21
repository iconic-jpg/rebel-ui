import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "./shared.js";

// ── API Base ──────────────────────────────────────────────────────────────────
const API =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  "https://r3bel-5464.onrender.com";

// ── Light Theme Palette (matches other Modules pages) ─────────────────────────
const L = {
  pageBg:      "#f5f7fa",
  panelBg:     "#ffffff",
  panelBorder: "#e2e8f0",
  subtleBg:    "#f8fafc",
  insetBg:     "#f1f5f9",
  borderLight: "#f1f5f9",
  text1:  "#0f172a",
  text2:  "#334155",
  text3:  "#64748b",
  text4:  "#94a3b8",
  blue:   "#1d4ed8",
  cyan:   "#0284c7",
  green:  "#16a34a",
  yellow: "#b45309",
  orange: "#c2410c",
  red:    "#dc2626",
  purple: "#7c3aed",
};

const LS = {
  page: {
    background: L.pageBg, minHeight: "100vh", padding: "20px 16px",
    display: "flex", flexDirection: "column" as const, gap: 12,
    fontFamily: "'DM Sans', system-ui, sans-serif", color: L.text1,
  },
  panel: {
    background: L.panelBg, border: `1px solid ${L.panelBorder}`,
    borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  input: {
    background: L.insetBg, border: `1px solid ${L.panelBorder}`, borderRadius: 5,
    color: L.text1, padding: "6px 10px", fontSize: 11, outline: "none",
  },
  btn: {
    background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 4,
    color: L.text2, padding: "5px 10px", cursor: "pointer", fontSize: 10, fontWeight: 600,
  },
};

function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

function Shimmer({ w = "100%", h = 14, radius = 4, style = {} }: {
  w?: string | number; h?: number; radius?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, flexShrink: 0,
      background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s ease infinite", ...style,
    }} />
  );
}

function LPanel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...LS.panel, ...style }}>{children}</div>;
}
function LPanelHeader({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "8px 8px 0 0", flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" as const }}>{left}</span>
      {right}
    </div>
  );
}
function LMetricCard({ label, value, sub, color, loading }: { label: string; value: string | number; sub: string; color: string; loading?: boolean }) {
  return (
    <div style={{ background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 8, color: L.text4, textTransform: "uppercase" as const, letterSpacing: ".12em", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {loading ? <Shimmer w="60%" h={22} style={{ marginBottom: 8 }} /> : <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>}
      <div style={{ fontSize: 9, color: L.text3, marginTop: 5 }}>{sub}</div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Finding {
  id: number;
  status: string;
  reason: string;
  owner: string;
  due_date: string | null;
  approval_status: string;
  control_ref: string;
  control_title: string;
  category: string;
  severity: string;
  framework_name: string;
  asset_id: number;
  asset_name: string;
  asset_type: string;
  application: string;
  team: string;
  business_owner: string;
  risk_score: number;
  health_status: string;
  business_impact: string;
  root_cause: string;
  recommended_action: string;
  compliance_mapping: string;
  source_system?: string;
}

function severityColor(s: string) { return ({ Critical: L.red, High: L.orange, Medium: L.yellow, Low: L.green }[s] ?? L.text3); }
function approvalColor(s: string) { return ({ "Pending Approval": L.yellow, Approved: L.green, Rejected: L.red }[s] ?? L.text4); }

type ActionKey = "rotate-key" | "renew-certificate" | "archive" | "generate-ticket";

const ACTION_LABELS: Record<ActionKey, string> = {
  "rotate-key": "Rotate Key",
  "renew-certificate": "Renew Certificate",
  "archive": "Archive Asset",
  "generate-ticket": "Generate Ticket",
};

// ── Ignore Modal ────────────────────────────────────────────────────────────────
function IgnoreModal({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (justification: string) => void; loading: boolean }) {
  const [text, setText] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 420, background: L.panelBg, borderRadius: 10, border: `1px solid ${L.panelBorder}`, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: L.text1, marginBottom: 4 }}>Ignore Finding</div>
        <div style={{ fontSize: 10, color: L.text3, marginBottom: 10 }}>
          Justification is required. Critical-severity findings will require a second approver before this takes effect.
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Why is this finding being ignored?"
          rows={4}
          style={{ ...LS.input, width: "100%", resize: "vertical" as const, fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={LS.btn}>Cancel</button>
          <button
            onClick={() => onSubmit(text)}
            disabled={!text.trim() || loading}
            style={{ ...LS.btn, background: L.red, color: "#fff", borderColor: L.red, opacity: !text.trim() || loading ? 0.6 : 1 }}
          >
            {loading ? "Submitting..." : "Confirm Ignore"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign Modal ─────────────────────────────────────────────────────────────────
function AssignModal({ onClose, onSubmit, loading, currentOwner }: {
  onClose: () => void; onSubmit: (owner: string, dueDate: string) => void; loading: boolean; currentOwner: string;
}) {
  const [owner, setOwner] = useState(currentOwner || "");
  const [dueDate, setDueDate] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 380, background: L.panelBg, borderRadius: 10, border: `1px solid ${L.panelBorder}`, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: L.text1, marginBottom: 10 }}>Assign Owner</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Owner name" style={{ ...LS.input, width: "100%" }} />
          <input value={dueDate} onChange={e => setDueDate(e.target.value)} type="date" style={{ ...LS.input, width: "100%" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={LS.btn}>Cancel</button>
          <button
            onClick={() => onSubmit(owner, dueDate)}
            disabled={!owner.trim() || loading}
            style={{ ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: !owner.trim() || loading ? 0.6 : 1 }}
          >
            {loading ? "Saving..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RemediationCenter() {
  const mobile = useMobile();

  const [findings, setFindings] = useState<Finding[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [severity, setSeverity] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // `${id}-${action}`
  const [actionResult, setActionResult] = useState<Record<number, { ok: boolean; message: string }>>({});

  const [ignoreModalFor, setIgnoreModalFor] = useState<number | null>(null);
  const [assignModalFor, setAssignModalFor] = useState<number | null>(null);

  const loadFindings = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "20" });
      if (severity) params.set("severity", severity);
      if (approvalStatus) params.set("approval_status", approvalStatus);
      const res = await fetch(`${API}/remediation/findings?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFindings(data.findings ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 1);
    } catch {
      setFetchError(true);
      setFindings([]);
    }
    setLoading(false);
  }, [page, severity, approvalStatus]);

  useEffect(() => { loadFindings(); }, [loadFindings]);
  useEffect(() => { setPage(1); }, [severity, approvalStatus]);

  const criticalCount = findings.filter(f => f.severity === "Critical").length;
  const pendingApprovalCount = findings.filter(f => f.approval_status === "Pending Approval").length;
  const overdueCount = findings.filter(f => f.due_date && new Date(f.due_date) < new Date()).length;

  // ── Simple actions (single click, no modal) ──────────────────────────────
  const runSimpleAction = async (findingId: number, action: ActionKey) => {
    const key = `${findingId}-${action}`;
    setActionLoading(key);
    try {
      const res = await fetch(`${API}/remediation/findings/${findingId}/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actor: "dashboard-user" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

      let message = `✓ ${ACTION_LABELS[action]} succeeded`;
      if (data.connector_result) {
        message += ` — real ${data.connector_result.aws_call || data.connector_result.azure_call || data.connector_result.gcp_call || data.connector_result.vcenter_call || "provider"} call made`;
      }
      if (action === "generate-ticket" && data.ticket_id) {
        message = `✓ Ticket ${data.ticket_id} created (mock — no tracker connected)`;
      }
      setActionResult(prev => ({ ...prev, [findingId]: { ok: true, message } }));
      loadFindings();
    } catch (e) {
      setActionResult(prev => ({ ...prev, [findingId]: { ok: false, message: e instanceof Error ? e.message : "Action failed" } }));
    }
    setActionLoading(null);
  };

  const submitIgnore = async (justification: string) => {
    if (ignoreModalFor === null) return;
    const findingId = ignoreModalFor;
    setActionLoading(`${findingId}-ignore`);
    try {
      const res = await fetch(`${API}/remediation/findings/${findingId}/ignore`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justification, actor: "dashboard-user" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setActionResult(prev => ({ ...prev, [findingId]: { ok: true, message: `✓ ${data.note || "Ignored"}` } }));
      setIgnoreModalFor(null);
      loadFindings();
    } catch (e) {
      setActionResult(prev => ({ ...prev, [findingId]: { ok: false, message: e instanceof Error ? e.message : "Ignore failed" } }));
    }
    setActionLoading(null);
  };

  const submitAssign = async (owner: string, dueDate: string) => {
    if (assignModalFor === null) return;
    const findingId = assignModalFor;
    setActionLoading(`${findingId}-assign`);
    try {
      const res = await fetch(`${API}/remediation/findings/${findingId}/assign`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, due_date: dueDate || null, actor: "dashboard-user" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setActionResult(prev => ({ ...prev, [findingId]: { ok: true, message: `✓ Assigned to ${owner}` } }));
      setAssignModalFor(null);
      loadFindings();
    } catch (e) {
      setActionResult(prev => ({ ...prev, [findingId]: { ok: false, message: e instanceof Error ? e.message : "Assign failed" } }));
    }
    setActionLoading(null);
  };

  const approveOrReject = async (findingId: number, decision: "approve" | "reject") => {
    setActionLoading(`${findingId}-${decision}`);
    try {
      const res = await fetch(`${API}/remediation/findings/${findingId}/${decision}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actor: "dashboard-user" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setActionResult(prev => ({ ...prev, [findingId]: { ok: true, message: `✓ ${decision === "approve" ? "Approved" : "Rejected"}` } }));
      loadFindings();
    } catch (e) {
      setActionResult(prev => ({ ...prev, [findingId]: { ok: false, message: e instanceof Error ? e.message : `${decision} failed` } }));
    }
    setActionLoading(null);
  };

  const selectSt = { ...LS.input, cursor: "pointer" as const };

  return (
    <div style={LS.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        * { box-sizing: border-box; }
        select option { background: ${L.panelBg}; color: ${L.text1}; }
      `}</style>

      {/* ── API STATUS ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 7, fontFamily: "'DM Mono',monospace", color: L.text4 }}>API</span>
        <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: fetchError ? L.red : L.green, fontWeight: 600 }}>
          {fetchError ? "✗" : "✓"} {API.replace("https://", "")}
        </span>
        <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: L.cyan, background: `${L.cyan}10`, border: `1px solid ${L.cyan}44`, borderRadius: 3, padding: "2px 6px" }}>
          → /remediation
        </span>
      </div>

      {/* ── METRICS ── */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 8 : 9 }}>
        <LMetricCard label="OPEN FINDINGS" value={total} sub="Fail or Pending Evidence" color={L.blue} loading={loading} />
        <LMetricCard label="CRITICAL (this page)" value={criticalCount} sub="Highest severity" color={L.red} loading={loading} />
        <LMetricCard label="PENDING APPROVAL" value={pendingApprovalCount} sub="Ignore awaiting sign-off" color={L.yellow} loading={loading} />
        <LMetricCard label="OVERDUE (this page)" value={overdueCount} sub="Past due date" color={L.orange} loading={loading} />
      </div>

      {/* ── FINDINGS LIST ── */}
      <LPanel>
        <LPanelHeader
          left="REMEDIATION FINDINGS"
          right={
            <div style={{ display: "flex", gap: 6 }}>
              <select value={severity} onChange={e => setSeverity(e.target.value)} style={selectSt}>
                <option value="">All Severities</option>
                {["Critical", "High", "Medium", "Low"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)} style={selectSt}>
                <option value="">All Approval States</option>
                {["Not Required", "Pending Approval", "Approved", "Rejected"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          }
        />

        {loading ? (
          <div style={{ padding: 14 }}>
            {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} w="100%" h={14} style={{ marginBottom: 10 }} />)}
          </div>
        ) : findings.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: L.green }}>✓ No open findings match these filters.</div>
        ) : (
          findings.map(f => {
            const isOpen = expandedId === f.id;
            const result = actionResult[f.id];
            return (
              <div key={f.id}>
                <div
                  onClick={() => setExpandedId(isOpen ? null : f.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer", flexWrap: mobile ? "wrap" : "nowrap" }}
                >
                  <span style={{ fontSize: 8, fontWeight: 700, color: severityColor(f.severity), border: `1px solid ${severityColor(f.severity)}44`, borderRadius: 3, padding: "2px 6px", flexShrink: 0 }}>{f.severity}</span>
                  <span style={{ fontSize: 9, color: L.text4, fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{f.control_ref}</span>
                  <span style={{ fontSize: 11, color: L.text1, fontWeight: 500, flex: 1 }}>{f.asset_name}</span>
                  {f.source_system && f.source_system !== "REBEL" && (
                    <Badge v="gray">{f.source_system}</Badge>
                  )}
                  {f.approval_status !== "Not Required" && (
                    <span style={{ fontSize: 8, fontWeight: 700, color: approvalColor(f.approval_status) }}>{f.approval_status}</span>
                  )}
                  <span style={{ fontSize: 9, color: L.text3, flexShrink: 0 }}>{f.owner || "Unassigned"}</span>
                  <span style={{ fontSize: 11, color: L.text4, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                </div>

                {isOpen && (
                  <div style={{ padding: "12px 14px", background: L.insetBg, borderBottom: `1px solid ${L.borderLight}` }}>
                    <div style={{ fontSize: 11, color: L.text2, fontWeight: 600, marginBottom: 6 }}>{f.control_title}</div>

                    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase" as const, fontWeight: 600 }}>Root Cause</div>
                        <div style={{ fontSize: 10, color: L.text2 }}>{f.root_cause}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase" as const, fontWeight: 600 }}>Recommended Action</div>
                        <div style={{ fontSize: 10, color: L.text2 }}>{f.recommended_action}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase" as const, fontWeight: 600 }}>Business Impact</div>
                        <div style={{ fontSize: 10, color: L.text2 }}>{f.business_impact}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase" as const, fontWeight: 600 }}>Compliance Mapping</div>
                        <div style={{ fontSize: 10, color: L.text2 }}>{f.compliance_mapping}</div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: result ? 8 : 0 }}>
                      {(["rotate-key", "renew-certificate"] as ActionKey[]).map(action => (
                        <button
                          key={action}
                          onClick={() => runSimpleAction(f.id, action)}
                          disabled={actionLoading === `${f.id}-${action}`}
                          style={{ ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: actionLoading === `${f.id}-${action}` ? 0.6 : 1 }}
                        >
                          {actionLoading === `${f.id}-${action}` ? "Running..." : ACTION_LABELS[action]}
                        </button>
                      ))}
                      <button onClick={() => setAssignModalFor(f.id)} style={LS.btn}>Assign Owner</button>
                      <button onClick={() => setIgnoreModalFor(f.id)} style={{ ...LS.btn, color: L.red, borderColor: `${L.red}44` }}>Ignore</button>
                      <button
                        onClick={() => runSimpleAction(f.id, "generate-ticket")}
                        disabled={actionLoading === `${f.id}-generate-ticket`}
                        style={LS.btn}
                      >
                        {actionLoading === `${f.id}-generate-ticket` ? "Creating..." : "Generate Ticket"}
                      </button>
                      <button
                        onClick={() => runSimpleAction(f.id, "archive")}
                        disabled={actionLoading === `${f.id}-archive`}
                        style={{ ...LS.btn, color: L.orange, borderColor: `${L.orange}44` }}
                      >
                        {actionLoading === `${f.id}-archive` ? "Archiving..." : "Archive Asset"}
                      </button>
                      {f.approval_status === "Pending Approval" && (
                        <>
                          <button onClick={() => approveOrReject(f.id, "approve")} style={{ ...LS.btn, background: L.green, color: "#fff", borderColor: L.green }}>Approve</button>
                          <button onClick={() => approveOrReject(f.id, "reject")} style={{ ...LS.btn, background: L.red, color: "#fff", borderColor: L.red }}>Reject</button>
                        </>
                      )}
                      <a
                        href={`${API}/remediation/findings/${f.id}/evidence`}
                        target="_blank" rel="noreferrer"
                        style={{ ...LS.btn, textDecoration: "none", display: "inline-block" }}
                      >
                        Export Evidence
                      </a>
                    </div>

                    {result && (
                      <div style={{ fontSize: 10, color: result.ok ? L.green : L.red, marginTop: 4 }}>{result.message}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Pagination */}
        <div style={{ padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: L.subtleBg, borderRadius: "0 0 8px 8px" }}>
          <span style={{ fontSize: 10, color: L.text2 }}>Showing <b>{findings.length}</b> of <b>{total}</b></span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ ...LS.btn, opacity: page <= 1 ? 0.4 : 1 }}>‹ Prev</button>
            <span style={{ fontSize: 10, color: L.text3 }}>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ ...LS.btn, opacity: page >= totalPages ? 0.4 : 1 }}>Next ›</button>
          </div>
        </div>
      </LPanel>

      {ignoreModalFor !== null && (
        <IgnoreModal
          onClose={() => setIgnoreModalFor(null)}
          onSubmit={submitIgnore}
          loading={actionLoading === `${ignoreModalFor}-ignore`}
        />
      )}
      {assignModalFor !== null && (
        <AssignModal
          onClose={() => setAssignModalFor(null)}
          onSubmit={submitAssign}
          loading={actionLoading === `${assignModalFor}-assign`}
          currentOwner={findings.find(f => f.id === assignModalFor)?.owner || ""}
        />
      )}
    </div>
  );
}