import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
// ── API Base ──────────────────────────────────────────────────────────────────
const API = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
    "https://r3bel-5464.onrender.com";
// Django auth service — separate host from the FastAPI API above. Matches
// the exact endpoint/shape Login.tsx already uses for the same purpose.
const AUTH_API = "https://r3bel.onrender.com";
// ── Light Theme Palette (matches IntegrationsPage / other Modules pages) ──────
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
 * Refreshes the access token using the same Django endpoint/shape Login.tsx
 * uses. Returns the new access token on success, or null if the refresh
 * token itself is missing/invalid — callers treat null as "session is over".
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
 * fetch() wrapper for every /security/wazuh/* call: attaches the current
 * access token (if any — Wazuh is browsable without an active session, same
 * as the PQC page), and on a 401 transparently refreshes once and retries
 * the original request with the new token. If there's no refresh token to
 * try, or the refresh itself fails, this just clears any stale tokens and
 * returns the original response — callers already handle failed responses
 * with their own error states, so there's no forced navigation here.
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
function ConnectModal({ onClose, onConnected }) {
    const [values, setValues] = useState({
        WAZUH_API_URL: "", WAZUH_USERNAME: "", WAZUH_PASSWORD: "", WAZUH_VERIFY_SSL: "true",
    });
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState(null);
    const submit = async () => {
        const missing = ["WAZUH_API_URL", "WAZUH_USERNAME", "WAZUH_PASSWORD"].filter(k => !values[k]?.trim());
        if (missing.length) {
            setError(`Missing: ${missing.join(", ")}`);
            return;
        }
        setConnecting(true);
        setError(null);
        try {
            const res = await authFetch(`${API}/security/wazuh/connect`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credentials: values }),
            });
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
        }, children: _jsxs("div", { onClick: e => e.stopPropagation(), style: { ...LS.panel, width: "100%", maxWidth: 440, padding: 20, display: "flex", flexDirection: "column", gap: 14 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 700, color: L.text1 }, children: "Connect Wazuh" }), _jsx("button", { onClick: onClose, style: { ...LS.btn, padding: "4px 9px" }, children: "\u2715" })] }), _jsx("div", { style: { fontSize: 10, color: L.text3 }, children: "Credentials are sent directly to your backend and stored there \u2014 nothing is kept in the browser after this form closes." }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [_jsx("label", { style: { fontSize: 9, color: L.text4, letterSpacing: ".06em", fontWeight: 600 }, children: "WAZUH API URL" }), _jsx("input", { value: values.WAZUH_API_URL, onChange: e => setValues(v => ({ ...v, WAZUH_API_URL: e.target.value })), placeholder: "https://wazuh-manager:55000", autoComplete: "off", style: LS.input })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [_jsx("label", { style: { fontSize: 9, color: L.text4, letterSpacing: ".06em", fontWeight: 600 }, children: "WAZUH USERNAME" }), _jsx("input", { value: values.WAZUH_USERNAME, onChange: e => setValues(v => ({ ...v, WAZUH_USERNAME: e.target.value })), placeholder: "rebel_svc", autoComplete: "off", style: LS.input })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [_jsx("label", { style: { fontSize: 9, color: L.text4, letterSpacing: ".06em", fontWeight: 600 }, children: "WAZUH PASSWORD" }), _jsx("input", { type: "password", value: values.WAZUH_PASSWORD, onChange: e => setValues(v => ({ ...v, WAZUH_PASSWORD: e.target.value })), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", autoComplete: "off", style: LS.input })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [_jsx("label", { style: { fontSize: 9, color: L.text4, letterSpacing: ".06em", fontWeight: 600 }, children: "VERIFY TLS CERTIFICATE" }), _jsxs("select", { value: values.WAZUH_VERIFY_SSL, onChange: e => setValues(v => ({ ...v, WAZUH_VERIFY_SSL: e.target.value })), style: LS.input, children: [_jsx("option", { value: "true", children: "Verify (recommended)" }), _jsx("option", { value: "false", children: "Skip verification (self-signed manager)" })] })] })] }), error && (_jsxs("div", { style: { fontSize: 10, color: L.red, background: "#fef2f2", border: `1px solid ${L.red}33`, borderRadius: 4, padding: "6px 9px" }, children: ["\u2717 ", error] })), _jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" }, children: [_jsx("button", { onClick: onClose, style: LS.btn, children: "Cancel" }), _jsx("button", { onClick: submit, disabled: connecting, style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: connecting ? 0.7 : 1, cursor: connecting ? "not-allowed" : "pointer" }, children: connecting ? "Connecting..." : "Connect" })] })] }) }));
}
// ── Agent Detail Modal (vulnerabilities + FIM for one agent) ──────────────────
function AgentDetailModal({ token, agent, onClose }) {
    const [vulns, setVulns] = useState(null);
    const [fim, setFim] = useState(null);
    const [vulnsError, setVulnsError] = useState(null);
    const [fimError, setFimError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await authFetch(`${API}/security/wazuh/vulnerabilities?agent_id=${encodeURIComponent(agent.agent_id)}`);
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
        (async () => {
            try {
                const res = await authFetch(`${API}/security/wazuh/fim?agent_id=${encodeURIComponent(agent.agent_id)}`);
                const data = await res.json();
                if (!res.ok)
                    throw new Error(data.detail || `HTTP ${res.status}`);
                if (!cancelled)
                    setFim(data.fim_events || []);
            }
            catch (e) {
                if (!cancelled)
                    setFimError(e instanceof Error ? e.message : "Failed to load FIM events");
            }
        })();
        return () => { cancelled = true; };
    }, [agent.agent_id, token]);
    return (_jsx("div", { onClick: onClose, style: {
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100,
        }, children: _jsxs("div", { onClick: e => e.stopPropagation(), style: { ...LS.panel, width: "100%", maxWidth: 620, maxHeight: "85vh", padding: 20, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 14, fontWeight: 700, color: L.text1 }, children: agent.hostname || agent.agent_id }), _jsxs("div", { style: { fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: [agent.ip, " \u00B7 ", agent.os] })] }), _jsx("button", { onClick: onClose, style: { ...LS.btn, padding: "4px 9px" }, children: "\u2715" })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }, children: [_jsxs("div", { children: [_jsxs("div", { style: { fontSize: 9, color: L.text4, letterSpacing: ".08em", fontWeight: 700, marginBottom: 6 }, children: ["VULNERABILITIES ", vulns ? `(${vulns.length})` : ""] }), vulnsError && _jsxs("div", { style: { fontSize: 11, color: L.red }, children: ["\u2717 ", vulnsError] }), !vulns && !vulnsError && _jsx(Shimmer, { h: 40 }), vulns && vulns.length === 0 && _jsx("div", { style: { fontSize: 11, color: L.text3 }, children: "No vulnerabilities reported for this agent." }), vulns && vulns.length > 0 && (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: vulns.map((v, i) => (_jsxs("div", { style: { background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 6, padding: "8px 10px", display: "flex", justifyContent: "space-between", gap: 10 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 11, fontWeight: 700, color: L.text1, fontFamily: "'DM Mono',monospace" }, children: v.cve || "Unknown CVE" }), _jsxs("div", { style: { fontSize: 10, color: L.text3 }, children: [v.package, v.version ? ` @ ${v.version}` : ""] })] }), _jsx("span", { style: { fontSize: 9, fontWeight: 700, color: L.text2, alignSelf: "flex-start" }, children: v.severity })] }, i))) }))] }), _jsxs("div", { children: [_jsxs("div", { style: { fontSize: 9, color: L.text4, letterSpacing: ".08em", fontWeight: 700, marginBottom: 6 }, children: ["FILE INTEGRITY EVENTS ", fim ? `(${fim.length})` : ""] }), fimError && _jsxs("div", { style: { fontSize: 11, color: L.red }, children: ["\u2717 ", fimError] }), !fim && !fimError && _jsx(Shimmer, { h: 40 }), fim && fim.length === 0 && _jsx("div", { style: { fontSize: 11, color: L.text3 }, children: "No FIM events for this agent." }), fim && fim.length > 0 && (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: fim.map((f, i) => (_jsxs("div", { style: { background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 6, padding: "8px 10px" }, children: [_jsx("div", { style: { fontSize: 11, fontFamily: "'DM Mono',monospace", color: L.text1 }, children: f.file }), _jsxs("div", { style: { fontSize: 10, color: L.text3 }, children: [f.operation, " \u00B7 ", fmtTime(f.timestamp), f.username ? ` · ${f.username}` : ""] })] }, i))) }))] })] })] }) }));
}
// ── Main Page ───────────────────────────────────────────────────────────────
export default function WazuhSIEM() {
    const mobile = useMobile();
    const token = localStorage.getItem("access") || "";
    const [status, setStatus] = useState(null);
    const [health, setHealth] = useState(null);
    const [statusError, setStatusError] = useState(null);
    const [tab, setTab] = useState("alerts");
    const [showConnect, setShowConnect] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [agents, setAgents] = useState(null);
    const [agentsLoading, setAgentsLoading] = useState(false);
    const [agentsError, setAgentsError] = useState(null);
    const [syncing, setSyncing] = useState(false);
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
            const res = await authFetch(`${API}/security/wazuh/status`);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            setStatus(await res.json());
            setStatusError(null);
        }
        catch (e) {
            setStatusError(e instanceof Error ? e.message : "Status check failed");
        }
    }, []);
    const loadHealth = useCallback(async () => {
        try {
            const res = await authFetch(`${API}/security/wazuh/health`);
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
            const res = await authFetch(`${API}/security/wazuh/agents`);
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
            const res = await authFetch(`${API}/security/wazuh/alerts?${params.toString()}`);
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
    const doSync = async () => {
        setSyncing(true);
        try {
            const res = await authFetch(`${API}/security/wazuh/agents/sync`, { method: "POST" });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.detail || `HTTP ${res.status}`);
            await loadAgents();
        }
        catch (e) {
            setAgentsError(e instanceof Error ? e.message : "Sync failed");
        }
        setSyncing(false);
    };
    const doDisconnect = async () => {
        setDisconnecting(true);
        try {
            const res = await authFetch(`${API}/security/wazuh/disconnect`, { method: "POST" });
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
      ` }), _jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 16, fontWeight: 800, color: L.text1 }, children: "SIEM Integration \u2014 Wazuh" }), _jsx("div", { style: { fontSize: 11, color: L.text3, marginTop: 2 }, children: "Live security events, agent inventory, and vulnerability data from your Wazuh deployment." })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [health && (_jsxs("span", { style: { fontSize: 10, color: healthColor, background: `${healthColor}14`, border: `1px solid ${healthColor}44`, borderRadius: 20, padding: "5px 12px", fontWeight: 700 }, children: ["\u25CF ", health.status.toUpperCase()] })), loading ? (_jsx(Shimmer, { w: 90, h: 28, radius: 4 })) : configured ? (_jsx("button", { onClick: doDisconnect, disabled: disconnecting, style: { ...LS.btn, color: L.red, opacity: disconnecting ? 0.7 : 1 }, children: disconnecting ? "Disconnecting..." : "Disconnect" })) : (_jsx("button", { onClick: () => setShowConnect(true), style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue }, children: "Connect Wazuh" }))] })] }), statusError && (_jsx(LPanel, { style: { padding: "10px 14px", borderColor: L.red, background: "#fef2f2" }, children: _jsxs("span", { style: { fontSize: 11, color: L.red }, children: ["\u2717 ", statusError] }) })), !loading && !configured && (_jsxs(LPanel, { style: { padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 700, color: L.text1 }, children: "Wazuh isn't connected yet" }), _jsx("div", { style: { fontSize: 11, color: L.text3, maxWidth: 380 }, children: "Connect your Wazuh Manager to pull agent inventory, alerts, vulnerabilities, and file integrity events into REBEL." }), _jsx("button", { onClick: () => setShowConnect(true), style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, marginTop: 6 }, children: "Connect Wazuh" })] })), !loading && configured && (_jsxs(_Fragment, { children: [_jsx("div", { style: { display: "flex", borderBottom: `1px solid ${L.panelBorder}` }, children: ["alerts", "agents"].map(t => (_jsx("button", { onClick: () => setTab(t), style: {
                                background: "none", border: "none", cursor: "pointer", padding: "9px 16px",
                                fontSize: 12, fontWeight: 700, color: tab === t ? L.blue : L.text3,
                                borderBottom: tab === t ? `2px solid ${L.blue}` : "2px solid transparent",
                                textTransform: "capitalize",
                            }, children: t }, t))) }), tab === "alerts" && (_jsxs(LPanel, { style: { padding: 0, display: "flex", flexDirection: "column" }, children: [_jsxs("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsxs("select", { value: minSeverity, onChange: e => setMinSeverity(e.target.value), style: { ...LS.input, width: "auto" }, children: [_jsx("option", { value: "", children: "All severities" }), _jsx("option", { value: "4", children: "Medium and above" }), _jsx("option", { value: "8", children: "High and above" }), _jsx("option", { value: "12", children: "Critical only" })] }), _jsx("input", { value: agentFilter, onChange: e => setAgentFilter(e.target.value), placeholder: "Filter by agent ID", style: { ...LS.input, width: 160 } }), _jsx("button", { onClick: () => loadAlerts(false, 0), style: LS.btn, children: "Apply filters" }), _jsx("button", { onClick: () => loadAlerts(true, 0), disabled: polling, style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: polling ? 0.7 : 1, marginLeft: "auto" }, children: polling ? "Polling Wazuh..." : "Poll Wazuh now" })] }), alertsError && _jsxs("div", { style: { padding: 14, fontSize: 11, color: L.red }, children: ["\u2717 ", alertsError] }), alertsLoading && (_jsx("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 8 }, children: [0, 1, 2].map(i => _jsx(Shimmer, { h: 36 }, i)) })), alerts && alerts.length === 0 && !alertsLoading && (_jsx("div", { style: { padding: 24, textAlign: "center", fontSize: 11, color: L.text3 }, children: "No alerts stored yet \u2014 try \"Poll Wazuh now\" to pull the latest." })), alerts && alerts.length > 0 && (_jsx("div", { style: { display: "flex", flexDirection: "column" }, children: alerts.map(a => {
                                    const c = severityColor(a.severity);
                                    return (_jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsxs("span", { style: { fontSize: 9, fontWeight: 700, color: c, background: `${c}14`, border: `1px solid ${c}44`, borderRadius: 10, padding: "3px 8px", flexShrink: 0, marginTop: 1 }, children: [severityLabel(a.severity), " \u00B7 ", a.severity] }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: 12, color: L.text1, fontWeight: 600 }, children: a.title || a.event_type }), _jsxs("div", { style: { fontSize: 10, color: L.text3, marginTop: 2 }, children: [a.asset || a.agent_id || "unknown host", a.source_ip ? ` · ${a.source_ip}` : "", a.username ? ` · ${a.username}` : "", " \u00B7 ", fmtTime(a.timestamp)] })] })] }, a.id));
                                }) })), alerts && alerts.length > 0 && (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "10px 16px" }, children: [_jsx("button", { onClick: () => loadAlerts(false, Math.max(0, offset - LIMIT)), disabled: offset === 0, style: { ...LS.btn, opacity: offset === 0 ? 0.5 : 1 }, children: "\u2190 Newer" }), _jsx("button", { onClick: () => loadAlerts(false, offset + LIMIT), disabled: alerts.length < LIMIT, style: { ...LS.btn, opacity: alerts.length < LIMIT ? 0.5 : 1 }, children: "Older \u2192" })] }))] })), tab === "agents" && (_jsxs(LPanel, { style: { padding: 0, display: "flex", flexDirection: "column" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsx("span", { style: { fontSize: 11, color: L.text3 }, children: agents ? `${agents.length} agents` : "Loading agents..." }), _jsx("button", { onClick: doSync, disabled: syncing, style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: syncing ? 0.7 : 1 }, children: syncing ? "Syncing..." : "Sync from Wazuh" })] }), agentsError && _jsxs("div", { style: { padding: 14, fontSize: 11, color: L.red }, children: ["\u2717 ", agentsError] }), agentsLoading && (_jsx("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 8 }, children: [0, 1, 2].map(i => _jsx(Shimmer, { h: 36 }, i)) })), agents && agents.length === 0 && !agentsLoading && (_jsx("div", { style: { padding: 24, textAlign: "center", fontSize: 11, color: L.text3 }, children: "No agents found on this Wazuh deployment." })), agents && agents.length > 0 && (_jsxs("div", { style: { display: mobile ? "flex" : "block", flexDirection: mobile ? "column" : undefined }, children: [!mobile && (_jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 120px 140px 90px 100px", padding: "7px 16px", background: L.subtleBg, borderBottom: `1px solid ${L.borderLight}` }, children: ["HOST", "IP", "OS", "STATUS", "LAST SEEN"].map(h => (_jsx("span", { style: { fontSize: 9, color: L.text4, fontWeight: 700, letterSpacing: ".06em" }, children: h }, h))) })), agents.map(a => (_jsxs("div", { onClick: () => setSelectedAgent(a), style: mobile
                                            ? { padding: "10px 16px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer" }
                                            : { display: "grid", gridTemplateColumns: "1fr 120px 140px 90px 100px", padding: "9px 16px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer", alignItems: "center" }, children: [_jsx("span", { style: { fontSize: 12, color: L.text1, fontWeight: 600 }, children: a.hostname || a.agent_id }), _jsx("span", { style: { fontSize: 11, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: a.ip || "—" }), _jsx("span", { style: { fontSize: 11, color: L.text3 }, children: a.os || "—" }), _jsx("span", { style: {
                                                    fontSize: 9, fontWeight: 700, width: "fit-content",
                                                    color: a.status === "active" ? L.green : L.text4,
                                                    background: a.status === "active" ? "#f0fdf4" : L.insetBg,
                                                    border: `1px solid ${a.status === "active" ? L.green + "44" : L.panelBorder}`,
                                                    borderRadius: 10, padding: "2px 8px", marginTop: mobile ? 4 : 0,
                                                }, children: (a.status || "unknown").toUpperCase() }), _jsx("span", { style: { fontSize: 10, color: L.text3, marginTop: mobile ? 4 : 0 }, children: fmtTime(a.last_keepalive) })] }, a.agent_id)))] }))] }))] })), showConnect && (_jsx(ConnectModal, { onClose: () => setShowConnect(false), onConnected: () => { loadStatus(); loadHealth(); } })), selectedAgent && (_jsx(AgentDetailModal, { token: token, agent: selectedAgent, onClose: () => setSelectedAgent(null) }))] }));
}
