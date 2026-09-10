import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "./shared.js";
// ── API Base ──────────────────────────────────────────────────────────────────
const API = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
    "https://r3bel-5464.onrender.com";
// ── Light Theme Palette (matches CryptoAssetInventory.tsx) ────────────────────
const L = {
    pageBg: "#f5f7fa",
    panelBg: "#ffffff",
    panelBorder: "#e2e8f0",
    subtleBg: "#f8fafc",
    insetBg: "#f1f5f9",
    borderLight: "#f1f5f9",
    text1: "#0f172a",
    text2: "#334155",
    text3: "#64748b",
    text4: "#94a3b8",
    blue: "#1d4ed8",
    cyan: "#0284c7",
    green: "#16a34a",
    yellow: "#b45309",
    orange: "#c2410c",
    red: "#dc2626",
    purple: "#7c3aed",
};
const LS = {
    page: {
        background: L.pageBg, minHeight: "100vh", padding: "20px 16px",
        display: "flex", flexDirection: "column", gap: 12,
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
function Shimmer({ w = "100%", h = 14, radius = 4, style = {} }) {
    return (_jsx("div", { style: {
            width: w, height: h, borderRadius: radius, flexShrink: 0,
            background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
            backgroundSize: "200% 100%", animation: "shimmer 1.4s ease infinite", ...style,
        } }));
}
function LPanel({ children, style = {} }) {
    return _jsx("div", { style: { ...LS.panel, ...style }, children: children });
}
function LPanelHeader({ left, right }) {
    return (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "8px 8px 0 0", flexWrap: "wrap", gap: 8 }, children: [_jsx("span", { style: { fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" }, children: left }), right] }));
}
function LMetricCard({ label, value, sub, color, loading }) {
    return (_jsxs("div", { style: { background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }, children: [_jsx("div", { style: { fontSize: 8, color: L.text4, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6, fontWeight: 600 }, children: label }), loading ? _jsx(Shimmer, { w: "60%", h: 22, style: { marginBottom: 8 } }) : _jsx("div", { style: { fontSize: 22, fontWeight: 800, color, lineHeight: 1 }, children: value }), _jsx("div", { style: { fontSize: 9, color: L.text3, marginTop: 5 }, children: sub })] }));
}
function fmtDate(iso) {
    if (!iso)
        return "—";
    try {
        return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
    catch {
        return "—";
    }
}
function severityColor(s) { return ({ Critical: L.red, High: L.orange, Medium: L.yellow, Low: L.green }[s] ?? L.text3); }
function severityBg(s) { return ({ Critical: "#fff5f5", High: "#fff7ed", Medium: "#fffbeb", Low: "#f0fdf4" }[s] ?? L.subtleBg); }
function approvalColor(s) { return ({ "Pending Approval": L.yellow, Approved: L.green, Rejected: L.red }[s] ?? L.text4); }
function approvalVariant(s) {
    return s === "Approved" ? "green" : s === "Rejected" ? "red" : s === "Pending Approval" ? "yellow" : "gray";
}
function riskColor(score) {
    if (score >= 75)
        return L.red;
    if (score >= 40)
        return L.yellow;
    return L.green;
}
const SOURCE_OPTIONS = ["AWS", "Azure", "GCP", "Render", "vCenter", "REBEL"];
const SEVERITY_OPTIONS = ["Critical", "High", "Medium", "Low"];
const APPROVAL_OPTIONS = ["Not Required", "Pending Approval", "Approved", "Rejected"];
const ACTION_LABELS = {
    "rotate-key": "Rotate Key",
    "renew-certificate": "Renew Certificate",
    "archive": "Archive Asset",
    "generate-ticket": "Generate Ticket",
};
// ── Ignore Modal ────────────────────────────────────────────────────────────────
function IgnoreModal({ onClose, onSubmit, loading }) {
    const [text, setText] = useState("");
    return (_jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsxs("div", { style: { width: 420, background: L.panelBg, borderRadius: 10, border: `1px solid ${L.panelBorder}`, padding: 18 }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 700, color: L.text1, marginBottom: 4 }, children: "Ignore Finding" }), _jsx("div", { style: { fontSize: 10, color: L.text3, marginBottom: 10 }, children: "Justification is required. Critical-severity findings will require a second approver before this takes effect." }), _jsx("textarea", { value: text, onChange: e => setText(e.target.value), placeholder: "Why is this finding being ignored?", rows: 4, style: { ...LS.input, width: "100%", resize: "vertical", fontFamily: "inherit" } }), _jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }, children: [_jsx("button", { onClick: onClose, style: LS.btn, children: "Cancel" }), _jsx("button", { onClick: () => onSubmit(text), disabled: !text.trim() || loading, style: { ...LS.btn, background: L.red, color: "#fff", borderColor: L.red, opacity: !text.trim() || loading ? 0.6 : 1 }, children: loading ? "Submitting..." : "Confirm Ignore" })] })] }) }));
}
// ── Assign Modal ─────────────────────────────────────────────────────────────────
function AssignModal({ onClose, onSubmit, loading, currentOwner }) {
    const [owner, setOwner] = useState(currentOwner || "");
    const [dueDate, setDueDate] = useState("");
    return (_jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsxs("div", { style: { width: 380, background: L.panelBg, borderRadius: 10, border: `1px solid ${L.panelBorder}`, padding: 18 }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 700, color: L.text1, marginBottom: 10 }, children: "Assign Owner" }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [_jsx("input", { value: owner, onChange: e => setOwner(e.target.value), placeholder: "Owner name", style: { ...LS.input, width: "100%" } }), _jsx("input", { value: dueDate, onChange: e => setDueDate(e.target.value), type: "date", style: { ...LS.input, width: "100%" } })] }), _jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }, children: [_jsx("button", { onClick: onClose, style: LS.btn, children: "Cancel" }), _jsx("button", { onClick: () => onSubmit(owner, dueDate), disabled: !owner.trim() || loading, style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: !owner.trim() || loading ? 0.6 : 1 }, children: loading ? "Saving..." : "Assign" })] })] }) }));
}
// ── Main Component ─────────────────────────────────────────────────────────────
export default function RemediationCenter() {
    const mobile = useMobile();
    const [findings, setFindings] = useState([]);
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
    const debounceRef = useRef(null);
    const [expandedId, setExpandedId] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); // `${id}-${action}`
    const [actionResult, setActionResult] = useState({});
    const [ignoreModalFor, setIgnoreModalFor] = useState(null);
    const [assignModalFor, setAssignModalFor] = useState(null);
    // Lightweight aggregate counts for the metric cards — mirrors the
    // page_size=1 trick used on CryptoAssetInventory: reuse the paginated
    // endpoint's `total` for whatever filter combination is passed.
    const [counts, setCounts] = useState({ total: 0, critical: 0, pendingApproval: 0 });
    const [countsLoading, setCountsLoading] = useState(true);
    // ── Debounce search input ──────────────────────────────────────────────────
    useEffect(() => {
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQuery(query), 350);
        return () => { if (debounceRef.current)
            clearTimeout(debounceRef.current); };
    }, [query]);
    useEffect(() => { setPage(1); }, [debouncedQuery, severity, approvalStatus, sourceSystem]);
    // ── Fetch metric counts ──────────────────────────────────────────────────
    useEffect(() => {
        setCountsLoading(true);
        const base = new URLSearchParams({ page: "1", page_size: "1" });
        if (debouncedQuery)
            base.set("q", debouncedQuery);
        if (sourceSystem)
            base.set("source_system", sourceSystem);
        const withParam = (key, val) => {
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
        }).catch(() => { }).finally(() => setCountsLoading(false));
    }, [debouncedQuery, sourceSystem]);
    const loadFindings = useCallback(async () => {
        setLoading(true);
        setFetchError(false);
        try {
            const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
            if (debouncedQuery)
                params.set("q", debouncedQuery);
            if (severity)
                params.set("severity", severity);
            if (approvalStatus)
                params.set("approval_status", approvalStatus);
            if (sourceSystem)
                params.set("source_system", sourceSystem);
            const res = await fetch(`${API}/remediation/findings?${params.toString()}`);
            if (!res.ok)
                throw new Error();
            const data = await res.json();
            setFindings(data.findings ?? []);
            setTotal(data.total ?? 0);
            setTotalPages(data.total_pages ?? 1);
        }
        catch {
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
    const runSimpleAction = async (findingId, action) => {
        const key = `${findingId}-${action}`;
        setActionLoading(key);
        try {
            const res = await fetch(`${API}/remediation/findings/${findingId}/${action}`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actor: "dashboard-user" }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.detail || `HTTP ${res.status}`);
            let message = `✓ ${ACTION_LABELS[action]} succeeded`;
            if (data.connector_result) {
                message += ` — real ${data.connector_result.aws_call || data.connector_result.azure_call || data.connector_result.gcp_call || data.connector_result.vcenter_call || "provider"} call made`;
            }
            if (action === "generate-ticket" && data.ticket_id) {
                message = `✓ Ticket ${data.ticket_id} created (mock — no tracker connected)`;
            }
            setActionResult(prev => ({ ...prev, [findingId]: { ok: true, message } }));
            loadFindings();
        }
        catch (e) {
            setActionResult(prev => ({ ...prev, [findingId]: { ok: false, message: e instanceof Error ? e.message : "Action failed" } }));
        }
        setActionLoading(null);
    };
    const submitIgnore = async (justification) => {
        if (ignoreModalFor === null)
            return;
        const findingId = ignoreModalFor;
        setActionLoading(`${findingId}-ignore`);
        try {
            const res = await fetch(`${API}/remediation/findings/${findingId}/ignore`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ justification, actor: "dashboard-user" }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.detail || `HTTP ${res.status}`);
            setActionResult(prev => ({ ...prev, [findingId]: { ok: true, message: `✓ ${data.note || "Ignored"}` } }));
            setIgnoreModalFor(null);
            loadFindings();
        }
        catch (e) {
            setActionResult(prev => ({ ...prev, [findingId]: { ok: false, message: e instanceof Error ? e.message : "Ignore failed" } }));
        }
        setActionLoading(null);
    };
    const submitAssign = async (owner, dueDate) => {
        if (assignModalFor === null)
            return;
        const findingId = assignModalFor;
        setActionLoading(`${findingId}-assign`);
        try {
            const res = await fetch(`${API}/remediation/findings/${findingId}/assign`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner, due_date: dueDate || null, actor: "dashboard-user" }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.detail || `HTTP ${res.status}`);
            setActionResult(prev => ({ ...prev, [findingId]: { ok: true, message: `✓ Assigned to ${owner}` } }));
            setAssignModalFor(null);
            loadFindings();
        }
        catch (e) {
            setActionResult(prev => ({ ...prev, [findingId]: { ok: false, message: e instanceof Error ? e.message : "Assign failed" } }));
        }
        setActionLoading(null);
    };
    const approveOrReject = async (findingId, decision) => {
        setActionLoading(`${findingId}-${decision}`);
        try {
            const res = await fetch(`${API}/remediation/findings/${findingId}/${decision}`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actor: "dashboard-user" }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.detail || `HTTP ${res.status}`);
            setActionResult(prev => ({ ...prev, [findingId]: { ok: true, message: `✓ ${decision === "approve" ? "Approved" : "Rejected"}` } }));
            loadFindings();
        }
        catch (e) {
            setActionResult(prev => ({ ...prev, [findingId]: { ok: false, message: e instanceof Error ? e.message : `${decision} failed` } }));
        }
        setActionLoading(null);
    };
    const selectSt = { ...LS.input, cursor: "pointer" };
    return (_jsxs("div", { style: LS.page, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.panelBorder};border-radius:3px;}
        select option { background: ${L.panelBg}; color: ${L.text1}; }
      ` }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsx("span", { style: { fontSize: 7, fontFamily: "'DM Mono',monospace", color: L.text4, letterSpacing: ".08em" }, children: "API" }), _jsxs("span", { style: { fontSize: 8, fontFamily: "'DM Mono',monospace", color: fetchError ? L.red : L.green, fontWeight: 600 }, children: [fetchError ? "✗" : "✓", " ", API.replace("https://", "")] }), _jsx("span", { style: { fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: L.cyan, background: `${L.cyan}10`, border: `1px solid ${L.cyan}44`, borderRadius: 3, padding: "2px 6px" }, children: "\u2192 /remediation" }), fetchError && _jsx("span", { style: { fontSize: 8, color: L.red }, children: "\u2014 request failed" }), loading && _jsx("span", { style: { fontSize: 8, color: L.blue }, children: "fetching\u2026" })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 8 : 9 }, children: [_jsx(LMetricCard, { label: "OPEN FINDINGS", value: counts.total, sub: "Fail or Pending Evidence", color: L.blue, loading: countsLoading }), _jsx(LMetricCard, { label: "CRITICAL", value: counts.critical, sub: "Highest severity", color: L.red, loading: countsLoading }), _jsx(LMetricCard, { label: "PENDING APPROVAL", value: counts.pendingApproval, sub: "Ignore awaiting sign-off", color: L.yellow, loading: countsLoading }), _jsx(LMetricCard, { label: "OVERDUE (this page)", value: overdueOnPage, sub: "Past due date", color: L.orange, loading: loading })] }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "REMEDIATION FINDINGS", right: _jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }, children: [_jsx("input", { value: query, onChange: e => setQuery(e.target.value), placeholder: "Search asset / control / owner...", style: { ...LS.input, width: mobile ? 140 : 210 } }), _jsxs("select", { value: sourceSystem, onChange: e => setSourceSystem(e.target.value), style: selectSt, children: [_jsx("option", { value: "", children: "All Sources" }), SOURCE_OPTIONS.map(s => _jsx("option", { value: s, children: s }, s))] }), _jsxs("select", { value: severity, onChange: e => setSeverity(e.target.value), style: selectSt, children: [_jsx("option", { value: "", children: "All Severities" }), SEVERITY_OPTIONS.map(s => _jsx("option", { value: s, children: s }, s))] }), _jsxs("select", { value: approvalStatus, onChange: e => setApprovalStatus(e.target.value), style: selectSt, children: [_jsx("option", { value: "", children: "All Approval States" }), APPROVAL_OPTIONS.map(s => _jsx("option", { value: s, children: s }, s))] }), activeFilterCount > 0 && (_jsxs("button", { onClick: clearFilters, style: { ...LS.btn, color: L.red, borderColor: `${L.red}40`, background: `${L.red}0d` }, children: ["Clear (", activeFilterCount, ")"] }))] }) }), mobile ? (_jsx("div", { children: loading ? (Array.from({ length: 4 }).map((_, i) => (_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsx(Shimmer, { w: "60%", h: 12, style: { marginBottom: 6 } }), _jsx(Shimmer, { w: "40%", h: 9 })] }, i)))) : findings.length === 0 ? (_jsx("div", { style: { padding: 24, textAlign: "center", fontSize: 11, color: L.green }, children: "\u2713 No open findings match these filters." })) : (findings.map(f => {
                            const isOpen = expandedId === f.id;
                            const result = actionResult[f.id];
                            return (_jsxs("div", { children: [_jsxs("div", { onClick: () => setExpandedId(isOpen ? null : f.id), style: { padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 12, color: L.blue, fontWeight: 600 }, children: f.asset_name }), _jsx("span", { style: { fontSize: 7, fontWeight: 700, color: severityColor(f.severity), border: `1px solid ${severityColor(f.severity)}44`, borderRadius: 2, padding: "1px 5px", background: severityBg(f.severity) }, children: f.severity })] }), _jsxs("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }, children: [_jsx(Badge, { v: "gray", children: f.control_ref }), f.source_system && f.source_system !== "REBEL" && _jsx(Badge, { v: "gray", children: f.source_system }), f.approval_status !== "Not Required" && _jsx(Badge, { v: approvalVariant(f.approval_status), children: f.approval_status })] }), _jsxs("div", { style: { fontSize: 9, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: [f.owner || "Unassigned", " \u00B7 Risk ", f.risk_score] })] }), isOpen && (_jsx("div", { style: { padding: "10px 14px", background: L.insetBg, borderBottom: `1px solid ${L.borderLight}` }, children: _jsx(FindingDetail, { f: f, mobile: mobile, actionLoading: actionLoading, result: result, runSimpleAction: runSimpleAction, setAssignModalFor: setAssignModalFor, setIgnoreModalFor: setIgnoreModalFor, approveOrReject: approveOrReject }) }))] }, f.id));
                        })) })) : (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: L.subtleBg, borderBottom: `2px solid ${L.panelBorder}` }, children: [["SEVERITY", "CONTROL", "ASSET", "SOURCE", "OWNER", "APPROVAL", "RISK"].map(h => (_jsx("th", { style: { padding: "7px 8px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left", whiteSpace: "nowrap" }, children: h }, h))), _jsx("th", { style: { padding: "7px 8px", fontSize: 8 } })] }) }), _jsx("tbody", { children: loading ? (Array.from({ length: 8 }).map((_, i) => (_jsxs("tr", { style: { borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }, children: [Array.from({ length: 7 }).map((_, j) => (_jsx("td", { style: { padding: "10px 8px" }, children: _jsx(Shimmer, { w: j === 2 ? 140 : 60, h: 9 }) }, j))), _jsx("td", {})] }, i)))) : findings.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, style: { padding: 24, textAlign: "center", fontSize: 11, color: L.green }, children: "\u2713 No open findings match these filters." }) })) : (findings.map((f, i) => {
                                        const isOpen = expandedId === f.id;
                                        const result = actionResult[f.id];
                                        const rowBg = i % 2 === 0 ? L.panelBg : L.subtleBg;
                                        return (_jsxs(React.Fragment, { children: [_jsxs("tr", { style: { borderBottom: `1px solid ${L.borderLight}`, background: rowBg, cursor: "pointer" }, onClick: () => setExpandedId(isOpen ? null : f.id), onMouseEnter: e => (e.currentTarget.style.background = L.insetBg), onMouseLeave: e => (e.currentTarget.style.background = rowBg), children: [_jsx("td", { style: { padding: "8px 8px" }, children: _jsx("span", { style: { fontSize: 8, fontWeight: 700, color: severityColor(f.severity), border: `1px solid ${severityColor(f.severity)}44`, borderRadius: 3, padding: "1px 6px", background: severityBg(f.severity) }, children: f.severity }) }), _jsxs("td", { style: { padding: "8px 8px" }, children: [_jsx("div", { style: { fontSize: 9, color: L.text2, fontFamily: "'DM Mono',monospace" }, children: f.control_ref }), _jsx("div", { style: { fontSize: 8, color: L.text4, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: f.control_title })] }), _jsxs("td", { style: { padding: "8px 8px" }, children: [_jsx("div", { style: { fontSize: 10, color: L.blue, fontWeight: 600 }, children: f.asset_name }), _jsx("div", { style: { fontSize: 8, color: L.text4 }, children: f.application || "—" })] }), _jsx("td", { style: { padding: "8px 8px" }, children: f.source_system && f.source_system !== "REBEL"
                                                                ? _jsx(Badge, { v: "gray", children: f.source_system })
                                                                : _jsx("span", { style: { fontSize: 9, color: L.text4 }, children: "\u2014" }) }), _jsx("td", { style: { padding: "8px 8px", fontSize: 9, color: L.text2 }, children: f.owner || "Unassigned" }), _jsx("td", { style: { padding: "8px 8px" }, children: f.approval_status !== "Not Required"
                                                                ? _jsx(Badge, { v: approvalVariant(f.approval_status), children: f.approval_status })
                                                                : _jsx("span", { style: { fontSize: 9, color: L.text4 }, children: "\u2014" }) }), _jsx("td", { style: { padding: "8px 8px", fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: riskColor(f.risk_score) }, children: f.risk_score }), _jsx("td", { style: { padding: "8px 8px" }, children: _jsx("button", { onClick: e => { e.stopPropagation(); setExpandedId(isOpen ? null : f.id); }, style: { ...LS.btn, fontSize: 8, padding: "2px 7px", background: isOpen ? `${L.blue}15` : L.subtleBg, color: isOpen ? L.blue : L.text3, borderColor: isOpen ? `${L.blue}40` : L.panelBorder }, children: isOpen ? "▲" : "▼" }) })] }), isOpen && (_jsx("tr", { style: { background: L.insetBg }, children: _jsx("td", { colSpan: 8, style: { padding: "0 12px 12px" }, children: _jsx("div", { style: { background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 6, padding: 12, marginTop: 4, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)" }, children: _jsx(FindingDetail, { f: f, mobile: mobile, actionLoading: actionLoading, result: result, runSimpleAction: runSimpleAction, setAssignModalFor: setAssignModalFor, setIgnoreModalFor: setIgnoreModalFor, approveOrReject: approveOrReject }) }) }) }))] }, f.id));
                                    })) })] }) })), _jsxs("div", { style: { padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, background: L.subtleBg, borderRadius: "0 0 8px 8px" }, children: [loading ? (_jsx(Shimmer, { w: 200, h: 10 })) : (_jsxs("span", { style: { fontSize: 10, color: L.text2 }, children: ["Showing ", _jsx("b", { style: { color: L.text1 }, children: findings.length }), " of ", _jsx("b", { style: { color: L.text1 }, children: total }), " findings"] })), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("button", { disabled: page <= 1 || loading, onClick: () => setPage(p => Math.max(1, p - 1)), style: { ...LS.btn, opacity: page <= 1 ? 0.4 : 1 }, children: "\u2039 Prev" }), _jsxs("span", { style: { fontSize: 10, color: L.text3 }, children: ["Page ", page, " of ", totalPages] }), _jsx("button", { disabled: page >= totalPages || loading, onClick: () => setPage(p => Math.min(totalPages, p + 1)), style: { ...LS.btn, opacity: page >= totalPages ? 0.4 : 1 }, children: "Next \u203A" })] })] })] }), ignoreModalFor !== null && (_jsx(IgnoreModal, { onClose: () => setIgnoreModalFor(null), onSubmit: submitIgnore, loading: actionLoading === `${ignoreModalFor}-ignore` })), assignModalFor !== null && (_jsx(AssignModal, { onClose: () => setAssignModalFor(null), onSubmit: submitAssign, loading: actionLoading === `${assignModalFor}-assign`, currentOwner: findings.find(f => f.id === assignModalFor)?.owner || "" }))] }));
}
// ── Shared expanded-row detail + actions ────────────────────────────────────
function FindingDetail({ f, mobile, actionLoading, result, runSimpleAction, setAssignModalFor, setIgnoreModalFor, approveOrReject }) {
    return (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 11, color: L.text2, fontWeight: 600, marginBottom: 6 }, children: f.control_title }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }, children: "Root Cause" }), _jsx("div", { style: { fontSize: 10, color: L.text2 }, children: f.root_cause })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }, children: "Recommended Action" }), _jsx("div", { style: { fontSize: 10, color: L.text2 }, children: f.recommended_action })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }, children: "Business Impact" }), _jsx("div", { style: { fontSize: 10, color: L.text2 }, children: f.business_impact })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }, children: "Compliance Mapping" }), _jsx("div", { style: { fontSize: 10, color: L.text2 }, children: f.compliance_mapping })] })] }), _jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: result ? 8 : 0 }, children: [["rotate-key", "renew-certificate"].map(action => (_jsx("button", { onClick: () => runSimpleAction(f.id, action), disabled: actionLoading === `${f.id}-${action}`, style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: actionLoading === `${f.id}-${action}` ? 0.6 : 1 }, children: actionLoading === `${f.id}-${action}` ? "Running..." : ACTION_LABELS[action] }, action))), _jsx("button", { onClick: () => setAssignModalFor(f.id), style: LS.btn, children: "Assign Owner" }), _jsx("button", { onClick: () => setIgnoreModalFor(f.id), style: { ...LS.btn, color: L.red, borderColor: `${L.red}44` }, children: "Ignore" }), _jsx("button", { onClick: () => runSimpleAction(f.id, "generate-ticket"), disabled: actionLoading === `${f.id}-generate-ticket`, style: LS.btn, children: actionLoading === `${f.id}-generate-ticket` ? "Creating..." : "Generate Ticket" }), _jsx("button", { onClick: () => runSimpleAction(f.id, "archive"), disabled: actionLoading === `${f.id}-archive`, style: { ...LS.btn, color: L.orange, borderColor: `${L.orange}44` }, children: actionLoading === `${f.id}-archive` ? "Archiving..." : "Archive Asset" }), f.approval_status === "Pending Approval" && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => approveOrReject(f.id, "approve"), style: { ...LS.btn, background: L.green, color: "#fff", borderColor: L.green }, children: "Approve" }), _jsx("button", { onClick: () => approveOrReject(f.id, "reject"), style: { ...LS.btn, background: L.red, color: "#fff", borderColor: L.red }, children: "Reject" })] })), _jsx("a", { href: `${API}/remediation/findings/${f.id}/evidence`, target: "_blank", rel: "noreferrer", style: { ...LS.btn, textDecoration: "none", display: "inline-block" }, children: "Export Evidence" })] }), result && (_jsx("div", { style: { fontSize: 10, color: result.ok ? L.green : L.red, marginTop: 4 }, children: result.message }))] }));
}
