import React, { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "./shared.js";

// ── API Base ──────────────────────────────────────────────────────────────────
const API =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  "https://r3bel-5464.onrender.com";

// ── Light Theme Palette (matches CryptoAssetInventory.tsx) ────────────────────
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

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}
function severityColor(s: string) { return ({ Critical: L.red, High: L.orange, Medium: L.yellow, Low: L.green }[s] ?? L.text3); }
function severityBg(s: string) { return ({ Critical: "#fff5f5", High: "#fff7ed", Medium: "#fffbeb", Low: "#f0fdf4" }[s] ?? L.subtleBg); }
function approvalColor(s: string) { return ({ "Pending Approval": L.yellow, Approved: L.green, Rejected: L.red }[s] ?? L.text4); }
function approvalVariant(s: string): any {
  return s === "Approved" ? "green" : s === "Rejected" ? "red" : s === "Pending Approval" ? "yellow" : "gray";
}
function riskColor(score: number) {
  if (score >= 75) return L.red;
  if (score >= 40) return L.yellow;
  return L.green;
}

const SOURCE_OPTIONS = ["AWS", "Azure", "GCP", "Render", "vCenter", "REBEL"];
const SEVERITY_OPTIONS = ["Critical", "High", "Medium", "Low"];
const APPROVAL_OPTIONS = ["Not Required", "Pending Approval", "Approved", "Rejected"];

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
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [sourceSystem, setSourceSystem] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // `${id}-${action}`
  const [actionResult, setActionResult] = useState<Record<number, { ok: boolean; message: string }>>({});

  const [ignoreModalFor, setIgnoreModalFor] = useState<number | null>(null);
  const [assignModalFor, setAssignModalFor] = useState<number | null>(null);

  // Lightweight aggregate counts for the metric cards — mirrors the
  // page_size=1 trick used on CryptoAssetInventory: reuse the paginated
  // endpoint's `total` for whatever filter combination is passed.
  const [counts, setCounts] = useState({ total: 0, critical: 0, pendingApproval: 0 });
  const [countsLoading, setCountsLoading] = useState(true);

  // ── Debounce search input ──────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => { setPage(1); }, [debouncedQuery, severity, approvalStatus, sourceSystem]);

  // ── Fetch metric counts ──────────────────────────────────────────────────
  useEffect(() => {
    setCountsLoading(true);
    const base = new URLSearchParams({ page: "1", page_size: "1" });
    if (debouncedQuery) base.set("q", debouncedQuery);
    if (sourceSystem) base.set("source_system", sourceSystem);

    const withParam = (key: string, val: string) => {
      const p = new URLSearchParams(base);
      p.set(key, val);
      return p;
    };

    Promise.all([
      fetch(`${API}/remediation/findings?${base.toString()}`).then(r => r.ok ? r.json() : { total: 0 }),
      fetch(`${API}/remediation/findings?${withParam("severity", "Critical").toString()}`).then(r => r.ok ? r.json() : { total: 0 }),
      fetch(`${API}/remediation/findings?${withParam("approval_status", "Pending Approval").toString()}`).then(r => r.ok ? r.json() : { total: 0 }),
    ]).then(([totalRes, criticalRes, pendingRes]) => {
      setCounts({
        total: totalRes.total ?? 0,
        critical: criticalRes.total ?? 0,
        pendingApproval: pendingRes.total ?? 0,
      });
    }).catch(() => {}).finally(() => setCountsLoading(false));
  }, [debouncedQuery, sourceSystem]);

  const loadFindings = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (severity) params.set("severity", severity);
      if (approvalStatus) params.set("approval_status", approvalStatus);
      if (sourceSystem) params.set("source_system", sourceSystem);
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
  }, [page, pageSize, debouncedQuery, severity, approvalStatus, sourceSystem]);

  useEffect(() => { loadFindings(); }, [loadFindings]);

  const overdueOnPage = findings.filter(f => f.due_date && new Date(f.due_date) < new Date()).length;
  const clearFilters = () => { setQuery(""); setSeverity(""); setApprovalStatus(""); setSourceSystem(""); };
  const activeFilterCount = [severity, approvalStatus, sourceSystem].filter(Boolean).length;

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
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.panelBorder};border-radius:3px;}
        select option { background: ${L.panelBg}; color: ${L.text1}; }
      `}</style>

      {/* ── API STATUS BAR ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 7, fontFamily: "'DM Mono',monospace", color: L.text4, letterSpacing: ".08em" }}>API</span>
        <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: fetchError ? L.red : L.green, fontWeight: 600 }}>
          {fetchError ? "✗" : "✓"} {API.replace("https://", "")}
        </span>
        <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: L.cyan, background: `${L.cyan}10`, border: `1px solid ${L.cyan}44`, borderRadius: 3, padding: "2px 6px" }}>
          → /remediation
        </span>
        {fetchError && <span style={{ fontSize: 8, color: L.red }}>— request failed</span>}
        {loading && <span style={{ fontSize: 8, color: L.blue }}>fetching…</span>}
      </div>

      {/* ── METRICS ── */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 8 : 9 }}>
        <LMetricCard label="OPEN FINDINGS" value={counts.total} sub="Fail or Pending Evidence" color={L.blue} loading={countsLoading} />
        <LMetricCard label="CRITICAL" value={counts.critical} sub="Highest severity" color={L.red} loading={countsLoading} />
        <LMetricCard label="PENDING APPROVAL" value={counts.pendingApproval} sub="Ignore awaiting sign-off" color={L.yellow} loading={countsLoading} />
        <LMetricCard label="OVERDUE (this page)" value={overdueOnPage} sub="Past due date" color={L.orange} loading={loading} />
      </div>

      {/* ── FINDINGS TABLE ── */}
      <LPanel>
        <LPanelHeader
          left="REMEDIATION FINDINGS"
          right={
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search asset / control / owner..."
                style={{ ...LS.input, width: mobile ? 140 : 210 }}
              />
              <select value={sourceSystem} onChange={e => setSourceSystem(e.target.value)} style={selectSt}>
                <option value="">All Sources</option>
                {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={severity} onChange={e => setSeverity(e.target.value)} style={selectSt}>
                <option value="">All Severities</option>
                {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)} style={selectSt}>
                <option value="">All Approval States</option>
                {APPROVAL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} style={{ ...LS.btn, color: L.red, borderColor: `${L.red}40`, background: `${L.red}0d` }}>
                  Clear ({activeFilterCount})
                </button>
              )}
            </div>
          }
        />

        {/* Mobile cards */}
        {mobile ? (
          <div>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}` }}>
                  <Shimmer w="60%" h={12} style={{ marginBottom: 6 }} />
                  <Shimmer w="40%" h={9} />
                </div>
              ))
            ) : findings.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: L.green }}>✓ No open findings match these filters.</div>
            ) : (
              findings.map(f => {
                const isOpen = expandedId === f.id;
                const result = actionResult[f.id];
                return (
                  <div key={f.id}>
                    <div onClick={() => setExpandedId(isOpen ? null : f.id)} style={{ padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: L.blue, fontWeight: 600 }}>{f.asset_name}</span>
                        <span style={{ fontSize: 7, fontWeight: 700, color: severityColor(f.severity), border: `1px solid ${severityColor(f.severity)}44`, borderRadius: 2, padding: "1px 5px", background: severityBg(f.severity) }}>{f.severity}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                        <Badge v="gray">{f.control_ref}</Badge>
                        {f.source_system && f.source_system !== "REBEL" && <Badge v="gray">{f.source_system}</Badge>}
                        {f.approval_status !== "Not Required" && <Badge v={approvalVariant(f.approval_status)}>{f.approval_status}</Badge>}
                      </div>
                      <div style={{ fontSize: 9, color: L.text3, fontFamily: "'DM Mono',monospace" }}>
                        {f.owner || "Unassigned"} · Risk {f.risk_score}
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ padding: "10px 14px", background: L.insetBg, borderBottom: `1px solid ${L.borderLight}` }}>
                        <FindingDetail
                          f={f} mobile={mobile} actionLoading={actionLoading} result={result}
                          runSimpleAction={runSimpleAction} setAssignModalFor={setAssignModalFor}
                          setIgnoreModalFor={setIgnoreModalFor} approveOrReject={approveOrReject}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
              <thead>
                <tr style={{ background: L.subtleBg, borderBottom: `2px solid ${L.panelBorder}` }}>
                  {["SEVERITY", "CONTROL", "ASSET", "SOURCE", "OWNER", "APPROVAL", "RISK"].map(h => (
                    <th key={h} style={{ padding: "7px 8px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase" as const, letterSpacing: ".08em", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                  <th style={{ padding: "7px 8px", fontSize: 8 }} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} style={{ padding: "10px 8px" }}><Shimmer w={j === 2 ? 140 : 60} h={9} /></td>
                      ))}
                      <td />
                    </tr>
                  ))
                ) : findings.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: "center", fontSize: 11, color: L.green }}>✓ No open findings match these filters.</td>
                  </tr>
                ) : (
                  findings.map((f, i) => {
                    const isOpen = expandedId === f.id;
                    const result = actionResult[f.id];
                    const rowBg = i % 2 === 0 ? L.panelBg : L.subtleBg;
                    return (
                      <React.Fragment key={f.id}>
                        <tr
                          style={{ borderBottom: `1px solid ${L.borderLight}`, background: rowBg, cursor: "pointer" }}
                          onClick={() => setExpandedId(isOpen ? null : f.id)}
                          onMouseEnter={e => (e.currentTarget.style.background = L.insetBg)}
                          onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                        >
                          <td style={{ padding: "8px 8px" }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: severityColor(f.severity), border: `1px solid ${severityColor(f.severity)}44`, borderRadius: 3, padding: "1px 6px", background: severityBg(f.severity) }}>{f.severity}</span>
                          </td>
                          <td style={{ padding: "8px 8px" }}>
                            <div style={{ fontSize: 9, color: L.text2, fontFamily: "'DM Mono',monospace" }}>{f.control_ref}</div>
                            <div style={{ fontSize: 8, color: L.text4, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.control_title}</div>
                          </td>
                          <td style={{ padding: "8px 8px" }}>
                            <div style={{ fontSize: 10, color: L.blue, fontWeight: 600 }}>{f.asset_name}</div>
                            <div style={{ fontSize: 8, color: L.text4 }}>{f.application || "—"}</div>
                          </td>
                          <td style={{ padding: "8px 8px" }}>
                            {f.source_system && f.source_system !== "REBEL"
                              ? <Badge v="gray">{f.source_system}</Badge>
                              : <span style={{ fontSize: 9, color: L.text4 }}>—</span>}
                          </td>
                          <td style={{ padding: "8px 8px", fontSize: 9, color: L.text2 }}>{f.owner || "Unassigned"}</td>
                          <td style={{ padding: "8px 8px" }}>
                            {f.approval_status !== "Not Required"
                              ? <Badge v={approvalVariant(f.approval_status)}>{f.approval_status}</Badge>
                              : <span style={{ fontSize: 9, color: L.text4 }}>—</span>}
                          </td>
                          <td style={{ padding: "8px 8px", fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: riskColor(f.risk_score) }}>{f.risk_score}</td>
                          <td style={{ padding: "8px 8px" }}>
                            <button
                              onClick={e => { e.stopPropagation(); setExpandedId(isOpen ? null : f.id); }}
                              style={{ ...LS.btn, fontSize: 8, padding: "2px 7px", background: isOpen ? `${L.blue}15` : L.subtleBg, color: isOpen ? L.blue : L.text3, borderColor: isOpen ? `${L.blue}40` : L.panelBorder }}
                            >{isOpen ? "▲" : "▼"}</button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr style={{ background: L.insetBg }}>
                            <td colSpan={8} style={{ padding: "0 12px 12px" }}>
                              <div style={{ background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 6, padding: 12, marginTop: 4, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)" }}>
                                <FindingDetail
                                  f={f} mobile={mobile} actionLoading={actionLoading} result={result}
                                  runSimpleAction={runSimpleAction} setAssignModalFor={setAssignModalFor}
                                  setIgnoreModalFor={setIgnoreModalFor} approveOrReject={approveOrReject}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Pagination */}
        <div style={{ padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, background: L.subtleBg, borderRadius: "0 0 8px 8px" }}>
          {loading ? (
            <Shimmer w={200} h={10} />
          ) : (
            <span style={{ fontSize: 10, color: L.text2 }}>
              Showing <b style={{ color: L.text1 }}>{findings.length}</b> of <b style={{ color: L.text1 }}>{total}</b> findings
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ ...LS.btn, opacity: page <= 1 ? 0.4 : 1 }}>‹ Prev</button>
            <span style={{ fontSize: 10, color: L.text3 }}>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ ...LS.btn, opacity: page >= totalPages ? 0.4 : 1 }}>Next ›</button>
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

// ── Shared expanded-row detail + actions ────────────────────────────────────
function FindingDetail({ f, mobile, actionLoading, result, runSimpleAction, setAssignModalFor, setIgnoreModalFor, approveOrReject }: {
  f: Finding; mobile: boolean;
  actionLoading: string | null;
  result: { ok: boolean; message: string } | undefined;
  runSimpleAction: (id: number, action: ActionKey) => void;
  setAssignModalFor: (id: number) => void;
  setIgnoreModalFor: (id: number) => void;
  approveOrReject: (id: number, decision: "approve" | "reject") => void;
}) {
  return (
    <div>
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
  );
}