import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
// ── API Base ──────────────────────────────────────────────────────────────────
const API = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
    "https://r3bel-5464.onrender.com";
// Django auth service — same host/shape Login.tsx and SIEMDashboard.tsx already use.
const AUTH_API = "https://r3bel.onrender.com";
// ── Light Theme Palette (matches SIEMDashboard / IntegrationsPage) ────────────────
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
        color: L.text2, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600,
    },
    input: {
        width: "100%", background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 4,
        color: L.text1, padding: "7px 9px", fontSize: 12, fontFamily: "'DM Mono',monospace",
        outline: "none",
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
// ── Helpers ─────────────────────────────────────────────────────────────────
function severityColor(level) {
    if (level >= 12)
        return L.red;
    if (level >= 8)
        return L.orange;
    if (level >= 4)
        return L.yellow;
    return L.green;
}
function severityLabel(level) {
    if (level >= 12)
        return "CRITICAL";
    if (level >= 8)
        return "HIGH";
    if (level >= 4)
        return "MEDIUM";
    return "LOW";
}
function fmtTime(ts) {
    if (!ts)
        return "—";
    try {
        return new Date(ts).toLocaleString();
    }
    catch {
        return ts;
    }
}
function authHeaders(token) {
    return { Authorization: `Bearer ${token}` };
}
/**
 * Refreshes the access token — identical to SIEMDashboard.tsx's helper of the
 * same name, kept in sync with it deliberately rather than shared via
 * import, since these mock-provider pages are meant to stay copy-paste
 * simple ahead of a real vendor integration replacing them individually.
 */
async function refreshAccessToken() {
    const refresh = localStorage.getItem("refresh");
    if (!refresh)
        return null;
    try {
        const res = await fetch(`${AUTH_API}/api/token/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh }),
        });
        if (!res.ok)
            return null;
        const data = await res.json();
        if (!data?.access)
            return null;
        localStorage.setItem("access", data.access);
        if (data.refresh)
            localStorage.setItem("refresh", data.refresh);
        return data.access;
    }
    catch {
        return null;
    }
}
/**
 * fetch() wrapper for every /security/sentinel/* call — same shape as
 * SIEMDashboard.tsx's authFetch: browsable without a session, transparent
 * 401-refresh-and-retry once, no forced navigation on failure.
 */
async function authFetch(url, init = {}, _retried = false) {
    const token = localStorage.getItem("access") || "";
    const res = await fetch(url, {
        ...init,
        headers: { ...(init.headers || {}), ...authHeaders(token) },
    });
    if (res.status !== 401 || _retried)
        return res;
    const newToken = await refreshAccessToken();
    if (!newToken) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        return res;
    }
    return authFetch(url, init, true);
}
// ── Connect Modal ───────────────────────────────────────────────────────────
// Sentinel is mock data (see app/connectors/mocks/sentinel_mock.py)
// — there's nothing to authenticate against yet, so this is a one-click
// enable rather than a credentials form. Once a real Sentinel
// integration replaces the mock connector, this modal is where real
// credential fields would go (see SIEMDashboard.tsx's ConnectModal for the
// pattern: label + input per required credential).
function ConnectModal({ onClose, onConnected }) {
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState(null);
    const submit = async () => {
        setConnecting(true);
        setError(null);
        try {
            const res = await authFetch(`${API}/security/sentinel/connect`, { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(data.detail || `HTTP ${res.status}`);
            onConnected();
            onClose();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Connect failed");
        }
        setConnecting(false);
    };
    return (_jsx("div", { onClick: onClose, style: {
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100,
        }, children: _jsxs("div", { onClick: e => e.stopPropagation(), style: { ...LS.panel, width: "100%", maxWidth: 440, padding: 20, display: "flex", flexDirection: "column", gap: 14 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 700, color: L.text1 }, children: "Connect Sentinel" }), _jsx("button", { onClick: onClose, style: { ...LS.btn, padding: "4px 9px" }, children: "\u2715" })] }), _jsx("div", { style: { fontSize: 10, color: L.text3 }, children: "Sentinel is running against realistic sample data while the real integration is being built \u2014 no credentials needed yet. This just turns the mock feed on for your account." }), error && (_jsxs("div", { style: { fontSize: 10, color: L.red, background: "#fef2f2", border: `1px solid ${L.red}33`, borderRadius: 4, padding: "6px 9px" }, children: ["\u2717 ", error] })), _jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" }, children: [_jsx("button", { onClick: onClose, style: LS.btn, children: "Cancel" }), _jsx("button", { onClick: submit, disabled: connecting, style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: connecting ? 0.7 : 1, cursor: connecting ? "not-allowed" : "pointer" }, children: connecting ? "Connecting..." : "Connect" })] })] }) }));
}
// ── Agent Detail Modal (vulnerabilities for one agent) ─────────────────────────
// No File Integrity Monitoring section here — FIM is a Wazuh-specific concept
// (syscheck) that Sentinel's mock connector doesn't model; see
// SecurityConnector.get_fim_events()'s default-empty behavior in
// app/connectors/security_base.py.
function AgentDetailModal({ agent, onClose }) {
    const [vulns, setVulns] = useState(null);
    const [vulnsError, setVulnsError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await authFetch(`${API}/security/sentinel/vulnerabilities?agent_id=${encodeURIComponent(agent.agent_id)}`);
                const data = await res.json();
                if (!res.ok)
                    throw new Error(data.detail || `HTTP ${res.status}`);
                if (!cancelled)
                    setVulns(data.vulnerabilities || []);
            }
            catch (e) {
                if (!cancelled)
                    setVulnsError(e instanceof Error ? e.message : "Failed to load vulnerabilities");
            }
        })();
        return () => { cancelled = true; };
    }, [agent.agent_id]);
    return (_jsx("div", { onClick: onClose, style: {
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100,
        }, children: _jsxs("div", { onClick: e => e.stopPropagation(), style: { ...LS.panel, width: "100%", maxWidth: 620, maxHeight: "85vh", padding: 20, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 14, fontWeight: 700, color: L.text1 }, children: agent.hostname || agent.agent_id }), _jsxs("div", { style: { fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: [agent.ip, " \u00B7 ", agent.os] })] }), _jsx("button", { onClick: onClose, style: { ...LS.btn, padding: "4px 9px" }, children: "\u2715" })] }), _jsx("div", { style: { display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }, children: _jsxs("div", { children: [_jsxs("div", { style: { fontSize: 9, color: L.text4, letterSpacing: ".08em", fontWeight: 700, marginBottom: 6 }, children: ["VULNERABILITIES ", vulns ? `(${vulns.length})` : ""] }), vulnsError && _jsxs("div", { style: { fontSize: 11, color: L.red }, children: ["\u2717 ", vulnsError] }), !vulns && !vulnsError && _jsx(Shimmer, { h: 40 }), vulns && vulns.length === 0 && _jsx("div", { style: { fontSize: 11, color: L.text3 }, children: "No vulnerabilities reported for this agent." }), vulns && vulns.length > 0 && (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: vulns.map((v, i) => (_jsxs("div", { style: { background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 6, padding: "8px 10px", display: "flex", justifyContent: "space-between", gap: 10 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 11, fontWeight: 700, color: L.text1, fontFamily: "'DM Mono',monospace" }, children: v.cve || "Unknown CVE" }), _jsxs("div", { style: { fontSize: 10, color: L.text3 }, children: [v.package, v.version ? ` @ ${v.version}` : ""] })] }), _jsx("span", { style: { fontSize: 9, fontWeight: 700, color: L.text2, alignSelf: "flex-start" }, children: v.severity })] }, i))) }))] }) })] }) }));
}
// ── Main Page ───────────────────────────────────────────────────────────────
export default function SentinelSIEM() {
    const mobile = useMobile();
    const [status, setStatus] = useState(null);
    const [health, setHealth] = useState(null);
    const [statusError, setStatusError] = useState(null);
    const [tab, setTab] = useState("alerts");
    const [showConnect, setShowConnect] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [agents, setAgents] = useState(null);
    const [agentsLoading, setAgentsLoading] = useState(false);
    const [agentsError, setAgentsError] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [alerts, setAlerts] = useState(null);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [alertsError, setAlertsError] = useState(null);
    const [polling, setPolling] = useState(false);
    const [minSeverity, setMinSeverity] = useState("");
    const [agentFilter, setAgentFilter] = useState("");
    const [offset, setOffset] = useState(0);
    const LIMIT = 25;
    const loadStatus = useCallback(async () => {
        try {
            const res = await authFetch(`${API}/security/sentinel/status`);
            if (!res.ok) {
                // Same reasoning as SIEMDashboard.tsx: a 401 here just means no REBEL
                // session yet, not a real error — stays quiet. Anything else
                // (5xx, etc.) surfaces the banner.
                setStatus({ configured: false, has_stored_credentials: false });
                setStatusError(res.status === 401 ? null : `HTTP ${res.status}`);
                return;
            }
            setStatus(await res.json());
            setStatusError(null);
        }
        catch (e) {
            setStatus({ configured: false, has_stored_credentials: false });
            setStatusError(e instanceof Error ? e.message : "Status check failed");
        }
    }, []);
    const loadHealth = useCallback(async () => {
        try {
            const res = await authFetch(`${API}/security/sentinel/health`);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!data || typeof data.status !== "string")
                throw new Error("Malformed health response");
            setHealth(data);
        }
        catch {
            setHealth({ status: "error", api_reachable: false, authenticated: false });
        }
    }, []);
    const loadAgents = useCallback(async () => {
        setAgentsLoading(true);
        setAgentsError(null);
        try {
            const res = await authFetch(`${API}/security/sentinel/agents`);
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.detail || `HTTP ${res.status}`);
            setAgents(data.agents || []);
        }
        catch (e) {
            setAgentsError(e instanceof Error ? e.message : "Failed to load agents");
        }
        setAgentsLoading(false);
    }, []);
    const loadAlerts = useCallback(async (poll, newOffset) => {
        if (poll)
            setPolling(true);
        else
            setAlertsLoading(true);
        setAlertsError(null);
        try {
            const params = new URLSearchParams({ limit: String(LIMIT), offset: String(newOffset) });
            if (poll)
                params.set("poll", "true");
            if (minSeverity)
                params.set("min_severity", minSeverity);
            if (agentFilter.trim())
                params.set("agent_id", agentFilter.trim());
            const res = await authFetch(`${API}/security/sentinel/alerts?${params.toString()}`);
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.detail || `HTTP ${res.status}`);
            setAlerts(data.alerts || []);
            setOffset(newOffset);
        }
        catch (e) {
            setAlertsError(e instanceof Error ? e.message : "Failed to load alerts");
        }
        setPolling(false);
        setAlertsLoading(false);
    }, [minSeverity, agentFilter]);
    useEffect(() => {
        loadStatus();
        loadHealth();
    }, [loadStatus, loadHealth]);
    useEffect(() => {
        if (status?.configured !== true)
            return;
        if (tab === "agents" && agents === null)
            loadAgents();
        if (tab === "alerts" && alerts === null)
            loadAlerts(false, 0);
    }, [status, tab, agents, alerts, loadAgents, loadAlerts]);
    const doDisconnect = async () => {
        setDisconnecting(true);
        try {
            const res = await authFetch(`${API}/security/sentinel/disconnect`, { method: "POST" });
            if (!res.ok && res.status !== 404) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || `HTTP ${res.status}`);
            }
            setStatus({ configured: false, has_stored_credentials: false });
            setAgents(null);
            setAlerts(null);
        }
        catch (e) {
            setStatusError(e instanceof Error ? e.message : "Disconnect failed");
        }
        setDisconnecting(false);
    };
    const loading = status === null;
    const configured = status?.configured === true;
    const healthColor = !health ? L.text4
        : health.status === "healthy" ? L.green
            : health.status === "unavailable" ? L.orange
                : health.status === "unauthenticated" ? L.red
                    : L.text4;
    return (_jsxs("div", { style: LS.page, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.panelBorder};border-radius:3px;}
      ` }), _jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }, children: [_jsxs("div", { children: [_jsxs("div", { style: { fontSize: 16, fontWeight: 800, color: L.text1 }, children: ["SIEM Integration \u2014 Sentinel ", _jsx("span", { style: { fontSize: 10, fontWeight: 700, color: L.purple, background: `${L.purple}14`, border: `1px solid ${L.purple}44`, borderRadius: 10, padding: "2px 8px", marginLeft: 6, verticalAlign: "middle" }, children: "MOCK DATA" })] }), _jsx("div", { style: { fontSize: 11, color: L.text3, marginTop: 2 }, children: "Sample security events, endpoint inventory, and vulnerability data \u2014 the real Sentinel integration isn't connected yet." })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [health && configured && (_jsxs("span", { style: { fontSize: 10, color: healthColor, background: `${healthColor}14`, border: `1px solid ${healthColor}44`, borderRadius: 20, padding: "5px 12px", fontWeight: 700 }, children: ["\u25CF ", health.status.toUpperCase()] })), loading ? (_jsx(Shimmer, { w: 90, h: 28, radius: 4 })) : configured ? (_jsx("button", { onClick: doDisconnect, disabled: disconnecting, style: { ...LS.btn, color: L.red, opacity: disconnecting ? 0.7 : 1 }, children: disconnecting ? "Disconnecting..." : "Disconnect" })) : (_jsx("button", { onClick: () => setShowConnect(true), style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue }, children: "Connect Sentinel" }))] })] }), statusError && (_jsx(LPanel, { style: { padding: "10px 14px", borderColor: L.red, background: "#fef2f2" }, children: _jsxs("span", { style: { fontSize: 11, color: L.red }, children: ["\u2717 ", statusError] }) })), !loading && !configured && (_jsxs(LPanel, { style: { padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 700, color: L.text1 }, children: "Sentinel isn't connected yet" }), _jsx("div", { style: { fontSize: 11, color: L.text3, maxWidth: 380 }, children: "Enable Sentinel to pull sample alerts, endpoint inventory, and vulnerability data into REBEL while the real integration is being built." }), _jsx("button", { onClick: () => setShowConnect(true), style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, marginTop: 6 }, children: "Connect Sentinel" })] })), !loading && configured && (_jsxs(_Fragment, { children: [_jsx("div", { style: { display: "flex", borderBottom: `1px solid ${L.panelBorder}` }, children: ["alerts", "agents"].map(t => (_jsx("button", { onClick: () => setTab(t), style: {
                                background: "none", border: "none", cursor: "pointer", padding: "9px 16px",
                                fontSize: 12, fontWeight: 700, color: tab === t ? L.blue : L.text3,
                                borderBottom: tab === t ? `2px solid ${L.blue}` : "2px solid transparent",
                                textTransform: "capitalize",
                            }, children: t }, t))) }), tab === "alerts" && (_jsxs(LPanel, { style: { padding: 0, display: "flex", flexDirection: "column" }, children: [_jsxs("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsxs("select", { value: minSeverity, onChange: e => setMinSeverity(e.target.value), style: { ...LS.input, width: "auto" }, children: [_jsx("option", { value: "", children: "All severities" }), _jsx("option", { value: "4", children: "Medium and above" }), _jsx("option", { value: "8", children: "High and above" }), _jsx("option", { value: "12", children: "Critical only" })] }), _jsx("input", { value: agentFilter, onChange: e => setAgentFilter(e.target.value), placeholder: "Filter by agent ID", style: { ...LS.input, width: 160 } }), _jsx("button", { onClick: () => loadAlerts(false, 0), style: LS.btn, children: "Apply filters" }), _jsx("button", { onClick: () => loadAlerts(true, 0), disabled: polling, style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: polling ? 0.7 : 1, marginLeft: "auto" }, children: polling ? "Polling Sentinel..." : "Poll Sentinel now" })] }), alertsError && _jsxs("div", { style: { padding: 14, fontSize: 11, color: L.red }, children: ["\u2717 ", alertsError] }), alertsLoading && (_jsx("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 8 }, children: [0, 1, 2].map(i => _jsx(Shimmer, { h: 36 }, i)) })), alerts && alerts.length === 0 && !alertsLoading && (_jsx("div", { style: { padding: 24, textAlign: "center", fontSize: 11, color: L.text3 }, children: "No alerts stored yet \u2014 try \"Poll Sentinel now\" to pull the latest sample data." })), alerts && alerts.length > 0 && (_jsx("div", { style: { display: "flex", flexDirection: "column" }, children: alerts.map(a => {
                                    const c = severityColor(a.severity);
                                    return (_jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsxs("span", { style: { fontSize: 9, fontWeight: 700, color: c, background: `${c}14`, border: `1px solid ${c}44`, borderRadius: 10, padding: "3px 8px", flexShrink: 0, marginTop: 1 }, children: [severityLabel(a.severity), " \u00B7 ", a.severity] }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: 12, color: L.text1, fontWeight: 600 }, children: a.title || a.event_type }), _jsxs("div", { style: { fontSize: 10, color: L.text3, marginTop: 2 }, children: [a.asset || a.agent_id || "unknown host", a.source_ip ? ` · ${a.source_ip}` : "", a.username ? ` · ${a.username}` : "", " \u00B7 ", fmtTime(a.timestamp)] })] })] }, a.id));
                                }) })), alerts && alerts.length > 0 && (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "10px 16px" }, children: [_jsx("button", { onClick: () => loadAlerts(false, Math.max(0, offset - LIMIT)), disabled: offset === 0, style: { ...LS.btn, opacity: offset === 0 ? 0.5 : 1 }, children: "\u2190 Newer" }), _jsx("button", { onClick: () => loadAlerts(false, offset + LIMIT), disabled: alerts.length < LIMIT, style: { ...LS.btn, opacity: alerts.length < LIMIT ? 0.5 : 1 }, children: "Older \u2192" })] }))] })), tab === "agents" && (_jsxs(LPanel, { style: { padding: 0, display: "flex", flexDirection: "column" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsx("span", { style: { fontSize: 11, color: L.text3 }, children: agents ? `${agents.length} agents` : "Loading agents..." }), _jsx("button", { onClick: () => loadAgents(), disabled: agentsLoading, style: { ...LS.btn, opacity: agentsLoading ? 0.7 : 1 }, children: agentsLoading ? "Refreshing..." : "Refresh" })] }), agentsError && _jsxs("div", { style: { padding: 14, fontSize: 11, color: L.red }, children: ["\u2717 ", agentsError] }), agentsLoading && (_jsx("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 8 }, children: [0, 1, 2].map(i => _jsx(Shimmer, { h: 36 }, i)) })), agents && agents.length === 0 && !agentsLoading && (_jsx("div", { style: { padding: 24, textAlign: "center", fontSize: 11, color: L.text3 }, children: "No agents found." })), agents && agents.length > 0 && (_jsxs("div", { style: { display: mobile ? "flex" : "block", flexDirection: mobile ? "column" : undefined }, children: [!mobile && (_jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 120px 140px 90px 100px", padding: "7px 16px", background: L.subtleBg, borderBottom: `1px solid ${L.borderLight}` }, children: ["HOST", "IP", "OS", "STATUS", "LAST SEEN"].map(h => (_jsx("span", { style: { fontSize: 9, color: L.text4, fontWeight: 700, letterSpacing: ".06em" }, children: h }, h))) })), agents.map(a => (_jsxs("div", { onClick: () => setSelectedAgent(a), style: mobile
                                            ? { padding: "10px 16px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer" }
                                            : { display: "grid", gridTemplateColumns: "1fr 120px 140px 90px 100px", padding: "9px 16px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer", alignItems: "center" }, children: [_jsx("span", { style: { fontSize: 12, color: L.text1, fontWeight: 600 }, children: a.hostname || a.agent_id }), _jsx("span", { style: { fontSize: 11, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: a.ip || "—" }), _jsx("span", { style: { fontSize: 11, color: L.text3 }, children: a.os || "—" }), _jsx("span", { style: {
                                                    fontSize: 9, fontWeight: 700, width: "fit-content",
                                                    color: a.status === "active" || a.status === "normal" || a.status === "Active" ? L.green : L.text4,
                                                    background: a.status === "active" || a.status === "normal" || a.status === "Active" ? "#f0fdf4" : L.insetBg,
                                                    border: `1px solid ${a.status === "active" || a.status === "normal" || a.status === "Active" ? L.green + "44" : L.panelBorder}`,
                                                    borderRadius: 10, padding: "2px 8px", marginTop: mobile ? 4 : 0,
                                                }, children: (a.status || "unknown").toUpperCase() }), _jsx("span", { style: { fontSize: 10, color: L.text3, marginTop: mobile ? 4 : 0 }, children: fmtTime(a.last_keepalive) })] }, a.agent_id)))] }))] }))] })), showConnect && (_jsx(ConnectModal, { onClose: () => setShowConnect(false), onConnected: () => { loadStatus(); loadHealth(); } })), selectedAgent && (_jsx(AgentDetailModal, { agent: selectedAgent, onClose: () => setSelectedAgent(null) }))] }));
}
