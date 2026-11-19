import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "./shared.js";
// ── API Base ──────────────────────────────────────────────────────────────────
const API = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
    "https://r3bel-5464.onrender.com";
// ── Light Theme Palette (matches AssetInventoryPage.tsx) ──────────────────────
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
    btn: {
        background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 4,
        color: L.text2, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600,
    },
    select: {
        background: L.insetBg, border: `1px solid ${L.panelBorder}`, borderRadius: 5,
        color: L.text1, padding: "6px 10px", fontSize: 11, outline: "none", cursor: "pointer",
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
function severityColor(s) { return ({ Critical: L.red, High: L.orange, Medium: L.yellow, Low: L.green }[s] ?? L.text3); }
function resultColor(r) { return ({ pass: L.green, fail: L.red, partial: L.yellow, inconclusive: L.orange }[r] ?? L.text3); }
function scoreColor(score) { if (score >= 80)
    return L.green; if (score >= 60)
    return L.yellow; return L.red; }
// Display only. Keep aligned with app/audit_engine.py MIN_CONFIDENCE.
// The backend remains authoritative and performs the actual scoring.
const DISPLAY_MIN_CONFIDENCE = 0.6;
function evidenceEligibleForScoring(e) {
    return (typeof e.confidence === "number" &&
        e.confidence >= DISPLAY_MIN_CONFIDENCE &&
        Boolean(e.source?.uri?.trim()) &&
        Boolean(e.sha256?.trim()));
}
function evidenceEligibilityReason(e) {
    const reasons = [];
    if (typeof e.confidence !== "number" || e.confidence < DISPLAY_MIN_CONFIDENCE) {
        reasons.push(`confidence below ${DISPLAY_MIN_CONFIDENCE.toFixed(2)}`);
    }
    if (!e.source?.uri?.trim())
        reasons.push("source URI missing");
    if (!e.sha256?.trim())
        reasons.push("SHA-256 missing");
    return reasons.join(" · ");
}
export default function ComplianceDashboard() {
    const mobile = useMobile();
    const trendRef = useRef(null);
    const [frameworks, setFrameworks] = useState([]);
    const [overall, setOverall] = useState(null);
    const [selectedFramework, setSelectedFramework] = useState(""); // "" = all
    const [failedControls, setFailedControls] = useState([]);
    const [execSummary, setExecSummary] = useState("");
    const [trendDays, setTrendDays] = useState(30);
    const [trend, setTrend] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [expandedControl, setExpandedControl] = useState(null);
    const [controlDetail, setControlDetail] = useState({});
    const [controlLoading, setControlLoading] = useState(null);
    const [exporting, setExporting] = useState(null);
    // ── audit-engine identity + actions ──────────────────────────────────────
    const [actor, setActor] = useState(() => { try {
        return localStorage.getItem("rebel_actor") ?? "";
    }
    catch {
        return "";
    } });
    const [token, setToken] = useState(() => { try {
        return sessionStorage.getItem("rebel_audit_token") ?? "";
    }
    catch {
        return "";
    } });
    const [assessing, setAssessing] = useState(false);
    const [notice, setNotice] = useState("");
    const [trailStatus, setTrailStatus] = useState(null);
    const [comment, setComment] = useState("");
    const [tick, setTick] = useState(0); // bumps after an assessment so the trend chart refetches
    const saveIdentity = (a, t) => {
        setActor(a);
        setToken(t);
        try {
            localStorage.setItem("rebel_actor", a);
            sessionStorage.setItem("rebel_audit_token", t);
        }
        catch { }
    };
    // Use the same JWT authentication as ConnectWorkspace.
    // Read credentials for every request so callbacks cannot retain stale tokens.
    const af = (path, init = {}) => {
        const headers = new Headers(init.headers || {});
        let accessToken = "";
        let currentActor = actor;
        let auditToken = token;
        try {
            accessToken = localStorage.getItem("access") ?? "";
            currentActor = localStorage.getItem("rebel_actor") ?? actor;
            auditToken = sessionStorage.getItem("rebel_audit_token") ?? token;
        }
        catch { }
        if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
        }
        else {
            headers.delete("Authorization");
        }
        if (currentActor.trim()) {
            headers.set("X-Actor", currentActor.trim());
        }
        else {
            headers.delete("X-Actor");
        }
        // Retained for compatibility with any other endpoint that still uses it.
        if (auditToken.trim()) {
            headers.set("X-Audit-Token", auditToken.trim());
        }
        else {
            headers.delete("X-Audit-Token");
        }
        if (init.body && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }
        return fetch(`${API}${path}`, {
            ...init,
            headers,
        });
    };
    const errText = async (res) => {
        const b = await res.json().catch(() => null);
        return typeof b?.detail === "string" ? b.detail : `Request failed (${res.status})`;
    };
    // ── Load framework overview ──────────────────────────────────────────────
    const loadOverview = useCallback(async () => {
        setLoading(true);
        setFetchError(false);
        try {
            const res = await af("/compliance/frameworks");
            if (!res.ok)
                throw new Error();
            const data = await res.json();
            setFrameworks(data.frameworks ?? []);
            setOverall(data.overall ?? null);
        }
        catch {
            setFetchError(true);
            setFrameworks([]);
            setOverall(null);
        }
        setLoading(false);
    }, []);
    useEffect(() => { loadOverview(); }, [loadOverview]);
    // ── Load selected framework's failed controls + exec summary ────────────
    useEffect(() => {
        if (!selectedFramework) {
            // "All" view — combine failed controls across frameworks isn't a single
            // endpoint; show a rollup message instead and let people drill into one.
            setFailedControls([]);
            setExecSummary("");
            return;
        }
        af(`/compliance/frameworks/${selectedFramework}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
            if (!d)
                return;
            setFailedControls(d.failed_controls ?? []);
            setExecSummary(d.executive_summary ?? "");
        })
            .catch(() => { });
    }, [selectedFramework]);
    // ── Load trend ────────────────────────────────────────────────────────────
    useEffect(() => {
        const params = new URLSearchParams({ days: String(trendDays) });
        if (selectedFramework)
            params.set("framework", selectedFramework);
        af(`/compliance/trend?${params.toString()}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d)
            setTrend(d.points ?? []); })
            .catch(() => { });
    }, [selectedFramework, trendDays, tick]);
    // ── Draw trend chart ──────────────────────────────────────────────────────
    useEffect(() => { drawTrend(); }, [trend, mobile]);
    function drawTrend() {
        const c = trendRef.current;
        if (!c)
            return;
        const ctx = c.getContext("2d");
        if (!ctx)
            return;
        const W = c.offsetWidth || 600, H = 180;
        c.width = W;
        c.height = H;
        ctx.clearRect(0, 0, W, H);
        if (trend.length < 2) {
            ctx.fillStyle = L.text4;
            ctx.font = "10px 'DM Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText("Not enough data points yet", W / 2, H / 2);
            return;
        }
        const padL = 32, padR = 10, padT = 12, padB = 20;
        const plotW = W - padL - padR, plotH = H - padT - padB;
        const scores = trend.map(t => t.score);
        const min = 0, max = 100;
        // Grid lines
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        [0, 25, 50, 75, 100].forEach(v => {
            const y = padT + plotH - ((v - min) / (max - min)) * plotH;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(W - padR, y);
            ctx.stroke();
            ctx.fillStyle = L.text4;
            ctx.font = "8px 'DM Mono', monospace";
            ctx.textAlign = "right";
            ctx.fillText(String(v), padL - 6, y + 3);
        });
        // Line
        ctx.beginPath();
        trend.forEach((t, i) => {
            const x = padL + (i / (trend.length - 1)) * plotW;
            const y = padT + plotH - ((t.score - min) / (max - min)) * plotH;
            if (i === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        });
        ctx.strokeStyle = L.blue;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Fill under line
        const lastX = padL + plotW;
        const firstX = padL;
        ctx.lineTo(lastX, padT + plotH);
        ctx.lineTo(firstX, padT + plotH);
        ctx.closePath();
        ctx.fillStyle = `${L.blue}12`;
        ctx.fill();
        // End point marker + label
        const lastPoint = trend[trend.length - 1];
        const endX = padL + plotW;
        const endY = padT + plotH - ((lastPoint.score - min) / (max - min)) * plotH;
        ctx.beginPath();
        ctx.arc(endX, endY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = L.blue;
        ctx.fill();
        ctx.fillStyle = L.blue;
        ctx.font = "bold 10px 'DM Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${lastPoint.score}%`, endX - 8, endY - 8);
    }
    const toggleControl = async (controlId) => {
        if (expandedControl === controlId) {
            setExpandedControl(null);
            return;
        }
        setExpandedControl(controlId);
        if (!controlDetail[controlId]) {
            setControlLoading(controlId);
            try {
                const res = await af(`/compliance/controls/${controlId}`);
                if (res.ok) {
                    const d = await res.json();
                    setControlDetail(prev => ({ ...prev, [controlId]: d }));
                }
            }
            catch { }
            setControlLoading(null);
        }
    };
    const doExport = async (format) => {
        setExporting(format);
        try {
            const params = new URLSearchParams({ format });
            if (selectedFramework)
                params.set("framework", selectedFramework);
            const res = await af(`/compliance/export?${params.toString()}`);
            if (!res.ok) {
                const body = await res.json().catch(() => null);
                alert(body?.detail || `Export failed (${res.status})`);
                setExporting(null);
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const scopeLabel = selectedFramework || "all_frameworks";
            a.download = `rebel_compliance_${scopeLabel}.${format === "json" ? "json" : format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        }
        catch {
            alert("Export failed — network error.");
        }
        setExporting(null);
    };
    const reloadAll = useCallback(async () => {
        await loadOverview();
        setControlDetail({});
        if (selectedFramework) {
            const r = await af(`/compliance/frameworks/${selectedFramework}`).catch(() => null);
            if (r && r.ok) {
                const d = await r.json();
                setFailedControls(d.failed_controls ?? []);
                setExecSummary(d.executive_summary ?? "");
            }
        }
        // eslint-disable-next-line
    }, [loadOverview, selectedFramework, actor, token]);
    const runAssessment = async () => {
        if (!actor.trim()) {
            setNotice("Enter your name first — it is written to the audit trail.");
            return;
        }
        setAssessing(true);
        setNotice("");
        try {
            const res = await af("/audit/assess", { method: "POST", body: JSON.stringify({}) });
            if (!res.ok)
                setNotice(await errText(res));
            else {
                const d = await res.json();
                setNotice(d.warning ?? `Assessment complete — ${d.assessment.controls_in_scope} controls in scope.`);
                setTrailStatus(null);
                await reloadAll();
                setTick(t => t + 1);
            }
        }
        catch {
            setNotice("Network error while running the assessment.");
        }
        setAssessing(false);
    };
    const verifyTrail = async () => {
        try {
            const res = await af("/audit/trail/verify");
            if (res.ok)
                setTrailStatus(await res.json());
            else
                setNotice(await errText(res));
        }
        catch {
            setNotice("Network error while verifying the trail.");
        }
    };
    const approvalStep = async (findingId, step) => {
        if (!actor.trim()) {
            setNotice("Enter your name first.");
            return;
        }
        setNotice("");
        try {
            const res = await af(`/audit/findings/${findingId}/${step}`, { method: "POST", body: JSON.stringify({ comment }) });
            if (!res.ok) {
                setNotice(await errText(res));
                return;
            }
            setComment("");
            const open = expandedControl;
            setControlDetail({});
            if (open !== null) {
                const r = await af(`/compliance/controls/${open}`);
                if (r.ok) {
                    const d = await r.json();
                    setControlDetail({ [open]: d });
                }
            }
        }
        catch {
            setNotice("Network error.");
        }
    };
    const activeFramework = frameworks.find(f => f.code === selectedFramework) || null;
    const displaySummary = activeFramework || overall;
    return (_jsxs("div", { style: LS.page, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.panelBorder};border-radius:3px;}
        select option { background: ${L.panelBg}; color: ${L.text1}; }
      ` }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsx("span", { style: { fontSize: 7, fontFamily: "'DM Mono',monospace", color: L.text4, letterSpacing: ".08em" }, children: "API" }), _jsxs("span", { style: { fontSize: 8, fontFamily: "'DM Mono',monospace", color: fetchError ? L.red : L.green, fontWeight: 600 }, children: [fetchError ? "✗" : "✓", " ", API] }), _jsx("span", { style: { fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: L.cyan, background: `${L.cyan}10`, border: `1px solid ${L.cyan}44`, borderRadius: 3, padding: "2px 6px" }, children: "\u2192 /compliance" })] }), _jsxs("select", { value: selectedFramework, onChange: e => setSelectedFramework(e.target.value), style: LS.select, children: [_jsx("option", { value: "", children: "All Frameworks" }), frameworks.map(f => _jsx("option", { value: f.code, children: f.name }, f.code))] })] }), _jsxs(LPanel, { children: [_jsxs("div", { style: { padding: "10px 14px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [_jsx("input", { value: actor, onChange: e => saveIdentity(e.target.value, token), placeholder: "your name (audit actor)", style: { ...LS.select, width: 170 } }), _jsx("input", { value: token, type: "password", onChange: e => saveIdentity(actor, e.target.value), placeholder: "audit token (if set)", style: { ...LS.select, width: 140 } }), _jsx("button", { onClick: runAssessment, disabled: assessing, style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: assessing ? 0.6 : 1 }, children: assessing ? "Assessing…" : "▶ Run assessment" }), _jsx("button", { onClick: verifyTrail, style: LS.btn, children: "Verify audit trail" }), trailStatus && (_jsxs("span", { style: { fontSize: 9, fontWeight: 700, color: trailStatus.ok ? L.green : L.red }, children: [trailStatus.ok ? "✓ TRAIL INTACT" : "✗ TRAIL BROKEN", " \u00B7 ", trailStatus.detail] })), notice && _jsxs("span", { style: { fontSize: 10, color: L.orange }, children: ["\u26A0 ", notice] })] }), _jsx("div", { style: { padding: "0 14px 10px", fontSize: 9, color: L.text4 }, children: "Scores are evidence-gated: controls with no collected evidence count as not assessed (zero), never as compliant. Statuses stay PROPOSED until a maker, reviewer and approver (three different people) sign off." })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: mobile ? 8 : 9 }, children: [_jsx(LMetricCard, { label: "OVERALL COMPLIANCE SCORE", value: displaySummary ? `${displaySummary.overall_compliance_score}%` : "—", sub: activeFramework ? activeFramework.name : "All frameworks combined", color: displaySummary ? scoreColor(displaySummary.overall_compliance_score) : L.text3, loading: loading }), _jsx(LMetricCard, { label: "FAILED CONTROLS", value: displaySummary?.failed_controls ?? "—", sub: "Across selected scope", color: L.red, loading: loading }), _jsx(LMetricCard, { label: "PENDING EVIDENCE", value: displaySummary?.pending_evidence ?? "—", sub: "Awaiting submission", color: L.yellow, loading: loading }), _jsx(LMetricCard, { label: "CRITICAL VIOLATIONS", value: displaySummary?.critical_violations ?? "—", sub: "Highest severity", color: L.red, loading: loading }), _jsx("div", { style: mobile ? { gridColumn: "1/-1" } : {}, children: _jsx(LMetricCard, { label: "ASSETS OUT OF COMPLIANCE", value: displaySummary?.assets_out_of_compliance ?? "—", sub: "Distinct assets affected", color: L.orange, loading: loading }) })] }), !selectedFramework && (_jsx("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2,1fr)", gap: mobile ? 8 : 10 }, children: loading ? (Array.from({ length: 4 }).map((_, i) => _jsx(LPanel, { style: { padding: 16 }, children: _jsx(Shimmer, { w: "100%", h: 60 }) }, i))) : (frameworks.map(f => (_jsx(LPanel, { style: { cursor: "pointer" }, children: _jsxs("div", { onClick: () => setSelectedFramework(f.code), style: { padding: 14 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }, children: [_jsx("span", { style: { fontSize: 12, fontWeight: 700, color: L.text1 }, children: f.name }), _jsxs("span", { style: { fontSize: 18, fontWeight: 800, color: scoreColor(f.overall_compliance_score) }, children: [f.overall_compliance_score, "%"] })] }), _jsx("div", { style: { height: 5, background: L.insetBg, borderRadius: 3, overflow: "hidden", marginBottom: 8 }, children: _jsx("div", { style: { width: `${f.control_pass_rate}%`, height: "100%", background: scoreColor(f.overall_compliance_score), borderRadius: 3 } }) }), _jsxs("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" }, children: [_jsxs("span", { style: { fontSize: 9, color: L.text3 }, children: [f.failed_controls, " failed"] }), _jsxs("span", { style: { fontSize: 9, color: L.text3 }, children: [f.critical_violations, " critical"] }), _jsxs("span", { style: { fontSize: 9, color: L.text3 }, children: [f.pending_evidence, " pending"] })] })] }) }, f.code)))) })), selectedFramework && execSummary && (_jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "EXECUTIVE SUMMARY" }), _jsx("div", { style: { padding: 14 }, children: _jsx("p", { style: { fontSize: 11, color: L.text2, lineHeight: 1.7, margin: 0 }, children: execSummary }) })] })), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "COMPLIANCE TREND", right: _jsx("div", { style: { display: "flex", gap: 4 }, children: [30, 90, 365].map(d => (_jsxs("button", { onClick: () => setTrendDays(d), style: { ...LS.btn, padding: "3px 9px", background: trendDays === d ? `${L.blue}15` : L.subtleBg, color: trendDays === d ? L.blue : L.text3, borderColor: trendDays === d ? `${L.blue}40` : L.panelBorder }, children: [d, "d"] }, d))) }) }), _jsx("div", { style: { padding: 14 }, children: _jsx("canvas", { ref: trendRef, style: { width: "100%", height: 180, display: "block" } }) })] }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "FAILED CONTROLS", right: _jsxs("div", { style: { display: "flex", gap: 6 }, children: [_jsx("button", { onClick: () => doExport("csv"), disabled: exporting !== null, style: { ...LS.btn, opacity: exporting ? 0.6 : 1 }, children: exporting === "csv" ? "..." : "⬇ CSV" }), _jsx("button", { onClick: () => doExport("json"), disabled: exporting !== null, style: { ...LS.btn, opacity: exporting ? 0.6 : 1 }, children: exporting === "json" ? "..." : "⬇ JSON" }), _jsx("button", { onClick: () => doExport("pdf"), disabled: exporting !== null, style: { ...LS.btn, opacity: exporting ? 0.6 : 1, background: L.blue, color: "#fff", borderColor: L.blue }, children: exporting === "pdf" ? "Generating..." : "⬇ PDF Report" })] }) }), !selectedFramework ? (_jsx("div", { style: { padding: 20, fontSize: 11, color: L.text3, textAlign: "center" }, children: "Select a framework above to see its failed controls in detail \u2014 or download the combined PDF/CSV/JSON for every framework using the buttons above (they respect the \"All Frameworks\" scope)." })) : loading ? (_jsx("div", { style: { padding: 14 }, children: Array.from({ length: 4 }).map((_, i) => _jsx(Shimmer, { w: "100%", h: 12, style: { marginBottom: 10 } }, i)) })) : failedControls.length === 0 ? (_jsx("div", { style: { padding: 20, fontSize: 11, color: L.green, textAlign: "center" }, children: "\u2713 No failed controls for this framework." })) : (_jsx("div", { children: failedControls.map(c => {
                            const isOpen = expandedControl === c.id;
                            const detail = controlDetail[c.id];
                            return (_jsxs("div", { children: [_jsxs("div", { onClick: () => toggleControl(c.id), style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer" }, onMouseEnter: e => (e.currentTarget.style.background = L.insetBg), onMouseLeave: e => (e.currentTarget.style.background = "transparent"), children: [_jsx("span", { style: { fontSize: 8, fontWeight: 700, color: severityColor(c.severity), border: `1px solid ${severityColor(c.severity)}44`, borderRadius: 3, padding: "2px 6px", flexShrink: 0 }, children: c.severity }), c.status && _jsx("span", { style: { fontSize: 8, fontWeight: 700, color: resultColor(c.status), flexShrink: 0, textTransform: "uppercase" }, children: c.status }), _jsx("span", { style: { fontSize: 9, color: L.text4, fontFamily: "'DM Mono',monospace", flexShrink: 0, width: mobile ? 50 : 70 }, children: c.control_ref }), _jsx("span", { style: { fontSize: 11, color: L.text1, flex: 1, fontWeight: 500 }, children: c.title }), !mobile && _jsx(Badge, { v: "gray", children: c.category }), _jsxs("span", { style: { fontSize: 9, color: L.text3, flexShrink: 0 }, children: [c.affected_assets, " assets"] }), _jsx("span", { style: { fontSize: 11, color: L.text4, flexShrink: 0 }, children: isOpen ? "▲" : "▼" })] }), isOpen && (_jsx("div", { style: { padding: "12px 14px", background: L.insetBg, borderBottom: `1px solid ${L.borderLight}` }, children: controlLoading === c.id || !detail ? (_jsx(Shimmer, { w: "100%", h: 40 })) : (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [_jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 10 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }, children: "Recommended Fix" }), _jsx("div", { style: { fontSize: 10, color: L.text2 }, children: detail.recommended_fix })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }, children: "Required Evidence" }), _jsx("div", { style: { fontSize: 10, color: L.text2 }, children: detail.required_evidence })] })] }), _jsxs("div", { children: [_jsxs("div", { style: { fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }, children: ["Affected Assets (", detail.affected_assets.filter(a => a.status !== "Pass").length, ")"] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [detail.affected_assets.filter(a => a.status !== "Pass").map(a => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 5, padding: "6px 10px" }, children: [_jsx("span", { style: { fontSize: 8, fontWeight: 700, color: a.status === "Fail" ? L.red : L.yellow, flexShrink: 0 }, children: a.status }), _jsx("span", { style: { fontSize: 10, color: L.blue, fontWeight: 600 }, children: a.asset_name }), _jsxs("span", { style: { fontSize: 8, color: L.text4 }, children: ["(", a.asset_type, ")"] }), _jsx("span", { style: { fontSize: 9, color: L.text3, marginLeft: "auto" }, children: a.team || a.business_owner || "—" })] }, a.asset_id))), detail.affected_assets.filter(a => a.status !== "Pass").length === 0 && (_jsx("div", { style: { fontSize: 9, color: L.text4 }, children: "No individual failing assets recorded." }))] }), detail.affected_assets[0]?.reason && (_jsxs("div", { style: { fontSize: 9, color: L.text3, marginTop: 8, fontStyle: "italic" }, children: ["Typical reason: ", detail.affected_assets.find(a => a.reason)?.reason] }))] }), detail.evidence && (_jsxs("div", { children: [_jsxs("div", { style: { fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }, children: ["Evidence (", detail.evidence.length, ") \u00B7 ", detail.source_verification?.replace(/_/g, " ")] }), detail.evidence.length === 0 && _jsx("div", { style: { fontSize: 9, color: L.text4 }, children: "No evidence collected \u2014 this control cannot be marked compliant." }), detail.evidence.map(e => {
                                                            const eligible = evidenceEligibleForScoring(e);
                                                            const eligibilityReason = evidenceEligibilityReason(e);
                                                            return (_jsxs("div", { style: { background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 5, padding: "7px 10px", marginBottom: 4 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }, children: [_jsx("span", { style: { fontSize: 8, fontWeight: 700, color: resultColor(e.result), textTransform: "uppercase" }, children: e.result }), _jsx("span", { style: { fontSize: 8, fontWeight: 700, color: eligible ? L.green : L.yellow, background: eligible ? `${L.green}12` : `${L.yellow}12`, border: `1px solid ${eligible ? `${L.green}44` : `${L.yellow}44`}`, borderRadius: 3, padding: "2px 6px" }, children: eligible ? "ELIGIBLE FOR SCORING" : "RECEIVED · NOT ELIGIBLE FOR SCORING" })] }), _jsxs("div", { style: { fontSize: 9, color: L.text3 }, children: [e.request_id, " \u00B7 confidence ", typeof e.confidence === "number" ? e.confidence.toFixed(2) : "n/a", e.rationale ? ` — ${e.rationale}` : ""] }), !eligible && (_jsxs("div", { style: { fontSize: 8, color: L.yellow, marginTop: 3 }, children: ["Scoring exclusion: ", eligibilityReason || "eligibility requirements not met"] })), _jsxs("div", { style: { fontSize: 8, color: L.text4, fontFamily: "'DM Mono',monospace", marginTop: 3, overflowWrap: "anywhere" }, children: [e.source?.uri || "source URI unavailable", " \u00B7 v", e.source?.version || "n/a", " \u00B7 ", e.collected_at || "collection time unavailable", " \u00B7 sha256 ", e.sha256 ? `${e.sha256.slice(0, 16)}…` : "unavailable"] })] }, e.evidence_id));
                                                        }), _jsxs("div", { style: { fontSize: 9, color: L.text3, marginTop: 6 }, children: ["Approval: ", _jsx("b", { children: (detail.approval_state ?? "proposed").toUpperCase() }), detail.approvals && Object.keys(detail.approvals).length > 0 && " · " + Object.entries(detail.approvals).map(([k, v]) => `${k}: ${v}`).join(" · ")] }), detail.finding_id && (_jsxs("div", { style: { display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }, children: [_jsx("input", { value: comment, onChange: e => setComment(e.target.value), placeholder: "comment (required to reject)", style: { ...LS.select, width: 200 } }), detail.approval_state === "proposed" && _jsx("button", { style: LS.btn, onClick: () => approvalStep(detail.finding_id, "submit"), children: "Submit (maker)" }), detail.approval_state === "submitted" && _jsx("button", { style: LS.btn, onClick: () => approvalStep(detail.finding_id, "review"), children: "Review (reviewer)" }), detail.approval_state === "reviewed" && _jsx("button", { style: LS.btn, onClick: () => approvalStep(detail.finding_id, "approve"), children: "Approve (approver)" }), (detail.approval_state === "submitted" || detail.approval_state === "reviewed") &&
                                                                    _jsx("button", { style: { ...LS.btn, color: L.red }, onClick: () => approvalStep(detail.finding_id, "reject"), children: "Reject" })] }))] }))] })) }))] }, c.id));
                        }) }))] })] }));
}
