import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
// ── API Base ──────────────────────────────────────────────────────────────────
const API = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
    "https://r3bel-5464.onrender.com";
const AUTH_API = "https://r3bel.onrender.com";
const L = {
    pageBg: "#f5f7fa", panelBg: "#ffffff", panelBorder: "#e2e8f0",
    subtleBg: "#f8fafc", insetBg: "#f1f5f9", borderLight: "#f1f5f9",
    text1: "#0f172a", text2: "#334155", text3: "#64748b", text4: "#94a3b8",
    blue: "#1d4ed8", cyan: "#0284c7", green: "#16a34a", yellow: "#b45309",
    orange: "#c2410c", red: "#dc2626", purple: "#7c3aed", indigo: "#4f46e5",
};
const PROVIDERS = [
    { slug: "rebel", label: "REBEL Native", color: L.purple, credentialFields: null },
    { slug: "wazuh", label: "Wazuh", color: L.blue,
        credentialFields: [
            { key: "WAZUH_USERNAME", label: "USERNAME", placeholder: "rebel_svc" },
            { key: "WAZUH_PASSWORD", label: "PASSWORD", placeholder: "••••••••", type: "password" },
        ] },
    { slug: "sentinel", label: "Microsoft Sentinel", color: L.cyan,
        credentialFields: [
            { key: "SENTINEL_TENANT_ID", label: "AZURE TENANT ID", placeholder: "00000000-0000-0000-0000-000000000000" },
            { key: "SENTINEL_CLIENT_ID", label: "APP CLIENT ID", placeholder: "00000000-0000-0000-0000-000000000000" },
            { key: "SENTINEL_CLIENT_SECRET", label: "APP CLIENT SECRET", placeholder: "••••••••", type: "password" },
            { key: "SENTINEL_SUBSCRIPTION_ID", label: "SUBSCRIPTION ID", placeholder: "00000000-0000-0000-0000-000000000000" },
            { key: "SENTINEL_RESOURCE_GROUP", label: "RESOURCE GROUP", placeholder: "rg-security" },
            { key: "SENTINEL_WORKSPACE_NAME", label: "LOG ANALYTICS WORKSPACE", placeholder: "sentinel-workspace" },
        ] },
    { slug: "crowdstrike", label: "CrowdStrike", color: L.red,
        credentialFields: [
            { key: "CROWDSTRIKE_CLIENT_ID", label: "API CLIENT ID", placeholder: "" },
            { key: "CROWDSTRIKE_CLIENT_SECRET", label: "API CLIENT SECRET", placeholder: "••••••••", type: "password" },
            { key: "CROWDSTRIKE_BASE_URL", label: "BASE URL (region — optional)", placeholder: "https://api.crowdstrike.com", optional: true },
        ] },
    { slug: "splunk", label: "Splunk", color: L.orange,
        credentialFields: [
            { key: "SPLUNK_BASE_URL", label: "MANAGEMENT URL", placeholder: "https://splunk.example.com:8089" },
            { key: "SPLUNK_TOKEN", label: "AUTH TOKEN (or use username/password below)", placeholder: "", type: "password", optional: true },
            { key: "SPLUNK_USERNAME", label: "USERNAME (if no token)", placeholder: "admin", optional: true },
            { key: "SPLUNK_PASSWORD", label: "PASSWORD (if no token)", placeholder: "••••••••", type: "password", optional: true },
        ] },
];
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
function providerOf(slug) {
    return PROVIDERS.find(p => p.slug === slug) ?? PROVIDERS[0];
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
async function authFetch(url, init = {}, _retried = false) {
    const token = localStorage.getItem("access") || "";
    const res = await fetch(url, {
        ...init,
        headers: { ...(init.headers || {}), ...authHeaders(token) },
    });
    if (res.status !== 401 || _retried)
        return res;
    const refresh = localStorage.getItem("refresh");
    if (!refresh) {
        // No refresh token to attempt — nothing more this function can safely
        // do. Return the 401 and let the caller's own error state handle it.
        return res;
    }
    const newToken = await refreshAccessToken();
    if (newToken) {
        return authFetch(url, init, true);
    }
    // Refresh was attempted and rejected. This does NOT clear localStorage.
    // It's tempting to treat a rejected refresh as proof the session is
    // fully dead and clean up — but this function runs as a background call
    // for every SIEM provider's status check on page load, and deleting
    // `access`/`refresh` here logs the user out of the ENTIRE app as a side
    // effect of one background request, even when their access token is
    // still perfectly valid and only the (possibly stale/unrelated) refresh
    // token failed. That exact chain — a leftover garbage refresh token
    // from an earlier broken login attempt 401ing here and wiping out an
    // otherwise-good access token — is what caused "visit the SIEM page,
    // then the main dashboard bounces you to /login" even right after a
    // successful login. Session expiry should be discovered passively
    // (e.g. RebelDashboard.tsx's own mount-time check, or a real 401 on a
    // primary user-initiated action) or via an explicit logout, never as a
    // side effect of a background poll deleting storage out from under
    // whatever page the user is actually looking at.
    return res;
}
// ── Connect Modal — adapts to whichever provider was clicked ────────────────
function ConnectModal({ provider, onClose, onConnected }) {
    const [values, setValues] = useState(() => Object.fromEntries((provider.credentialFields ?? []).map(f => [f.key, ""])));
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState(null);
    const submit = async () => {
        if (provider.credentialFields) {
            const missing = provider.credentialFields.filter(f => !f.optional && !values[f.key]?.trim());
            if (missing.length) {
                setError(`Missing: ${missing.map(f => f.label).join(", ")}`);
                return;
            }
        }
        setConnecting(true);
        setError(null);
        try {
            const res = await authFetch(`${API}/security/${provider.slug}/connect`, {
                method: "POST",
                ...(provider.credentialFields
                    ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credentials: values }) }
                    : {}),
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
        }, children: _jsxs("div", { onClick: e => e.stopPropagation(), style: { ...LS.panel, width: "100%", maxWidth: 440, padding: 20, display: "flex", flexDirection: "column", gap: 14 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [_jsxs("div", { style: { fontSize: 14, fontWeight: 700, color: L.text1 }, children: ["Connect ", provider.label] }), _jsx("button", { onClick: onClose, style: { ...LS.btn, padding: "4px 9px" }, children: "\u2715" })] }), _jsx("div", { style: { fontSize: 10, color: L.text3 }, children: provider.credentialFields
                        ? "The manager address is already configured on the backend — just enter the service account credentials REBEL should authenticate with. Nothing is kept in the browser after this form closes."
                        : provider.slug === "rebel"
                            ? "REBEL's own scan history and tracked assets are included in this view automatically — this just turns them back on if they were previously excluded."
                            : `${provider.label} needs no separate credentials to reconnect.` }), provider.credentialFields && (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: provider.credentialFields.map(f => (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [_jsx("label", { style: { fontSize: 9, color: L.text4, letterSpacing: ".06em", fontWeight: 600 }, children: f.label }), _jsx("input", { type: f.type || "text", value: values[f.key] ?? "", onChange: e => setValues(v => ({ ...v, [f.key]: e.target.value })), placeholder: f.placeholder, autoComplete: "off", style: LS.input })] }, f.key))) })), error && (_jsxs("div", { style: { fontSize: 10, color: L.red, background: "#fef2f2", border: `1px solid ${L.red}33`, borderRadius: 4, padding: "6px 9px" }, children: ["\u2717 ", error] })), _jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" }, children: [_jsx("button", { onClick: onClose, style: LS.btn, children: "Cancel" }), _jsx("button", { onClick: submit, disabled: connecting, style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: connecting ? 0.7 : 1, cursor: connecting ? "not-allowed" : "pointer" }, children: connecting ? "Connecting..." : "Connect" })] })] }) }));
}
// ── Agent Detail Modal — routes to the right provider based on agent.source ──
function AgentDetailModal({ agent, onClose }) {
    const [vulns, setVulns] = useState(null);
    const [vulnsError, setVulnsError] = useState(null);
    const [fim, setFim] = useState(null);
    const [fimError, setFimError] = useState(null);
    const isWazuh = agent.source === "wazuh";
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await authFetch(`${API}/security/${agent.source}/vulnerabilities?agent_id=${encodeURIComponent(agent.agent_id)}`);
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
        if (isWazuh) {
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
        }
        return () => { cancelled = true; };
    }, [agent.agent_id, agent.source, isWazuh]);
    const provider = providerOf(agent.source);
    return (_jsx("div", { onClick: onClose, style: {
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100,
        }, children: _jsxs("div", { onClick: e => e.stopPropagation(), style: { ...LS.panel, width: "100%", maxWidth: 620, maxHeight: "85vh", padding: 20, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 700, color: L.text1 }, children: agent.hostname || agent.agent_id }), _jsx("span", { style: { fontSize: 8, fontWeight: 700, color: provider.color, background: `${provider.color}14`, border: `1px solid ${provider.color}44`, borderRadius: 10, padding: "2px 7px" }, children: provider.label.toUpperCase() })] }), _jsxs("div", { style: { fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: [agent.ip, " \u00B7 ", agent.os] })] }), _jsx("button", { onClick: onClose, style: { ...LS.btn, padding: "4px 9px" }, children: "\u2715" })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }, children: [_jsxs("div", { children: [_jsxs("div", { style: { fontSize: 9, color: L.text4, letterSpacing: ".08em", fontWeight: 700, marginBottom: 6 }, children: ["VULNERABILITIES ", vulns ? `(${vulns.length})` : ""] }), vulnsError && _jsxs("div", { style: { fontSize: 11, color: L.red }, children: ["\u2717 ", vulnsError] }), !vulns && !vulnsError && _jsx(Shimmer, { h: 40 }), vulns && vulns.length === 0 && _jsx("div", { style: { fontSize: 11, color: L.text3 }, children: "No vulnerabilities reported for this agent." }), vulns && vulns.length > 0 && (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: vulns.map((v, i) => (_jsxs("div", { style: { background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 6, padding: "8px 10px", display: "flex", justifyContent: "space-between", gap: 10 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 11, fontWeight: 700, color: L.text1, fontFamily: "'DM Mono',monospace" }, children: v.cve || "Unknown CVE" }), _jsxs("div", { style: { fontSize: 10, color: L.text3 }, children: [v.package, v.version ? ` @ ${v.version}` : ""] })] }), _jsx("span", { style: { fontSize: 9, fontWeight: 700, color: L.text2, alignSelf: "flex-start" }, children: v.severity })] }, i))) }))] }), isWazuh && (_jsxs("div", { children: [_jsxs("div", { style: { fontSize: 9, color: L.text4, letterSpacing: ".08em", fontWeight: 700, marginBottom: 6 }, children: ["FILE INTEGRITY EVENTS ", fim ? `(${fim.length})` : ""] }), fimError && _jsxs("div", { style: { fontSize: 11, color: L.red }, children: ["\u2717 ", fimError] }), !fim && !fimError && _jsx(Shimmer, { h: 40 }), fim && fim.length === 0 && _jsx("div", { style: { fontSize: 11, color: L.text3 }, children: "No FIM events for this agent." }), fim && fim.length > 0 && (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: fim.map((f, i) => (_jsxs("div", { style: { background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 6, padding: "8px 10px" }, children: [_jsx("div", { style: { fontSize: 11, fontFamily: "'DM Mono',monospace", color: L.text1 }, children: f.file }), _jsxs("div", { style: { fontSize: 10, color: L.text3 }, children: [f.operation, " \u00B7 ", fmtTime(f.timestamp), f.username ? ` · ${f.username}` : ""] })] }, i))) }))] }))] })] }) }));
}
// ── Main Page — one SIEM view, data merged across every connected source ────
export default function SIEMDashboard() {
    const mobile = useMobile();
    const navigate = useNavigate();
    // Same guard RebelDashboard.tsx uses on the main dashboard — redirect
    // immediately if there's no session, rather than rendering the "No SIEM
    // sources connected yet" empty state for what's actually a logged-out
    // visitor. Matches the rest of the app's behavior instead of being the
    // one page that stays quietly browsable without a session.
    useEffect(() => { if (!localStorage.getItem("access"))
        navigate("/login"); }, [navigate]);
    const [statusMap, setStatusMap] = useState({});
    const [statusesLoaded, setStatusesLoaded] = useState(false);
    const [statusBanner, setStatusBanner] = useState(null);
    const [connectTarget, setConnectTarget] = useState(null);
    const [disconnectingSlug, setDisconnectingSlug] = useState(null);
    const [tab, setTab] = useState("alerts");
    const [sourceFilter, setSourceFilter] = useState(""); // "" = all connected sources
    const [minSeverity, setMinSeverity] = useState("");
    const [agentFilter, setAgentFilter] = useState("");
    const [alerts, setAlerts] = useState(null);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [alertsError, setAlertsError] = useState(null);
    const [polling, setPolling] = useState(false);
    const [perSourceLimit, setPerSourceLimit] = useState(25);
    const [agents, setAgents] = useState(null);
    const [agentsLoading, setAgentsLoading] = useState(false);
    const [agentsError, setAgentsError] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const connectedProviders = useMemo(() => PROVIDERS.filter(p => statusMap[p.slug]?.configured === true), [statusMap]);
    const loadAllStatuses = useCallback(async () => {
        const results = await Promise.all(PROVIDERS.map(async (p) => {
            try {
                const res = await authFetch(`${API}/security/${p.slug}/status`);
                if (!res.ok) {
                    // A 401 just means no REBEL session yet — normal, stays quiet.
                    return { slug: p.slug, status: { configured: false, has_stored_credentials: false }, error: res.status === 401 ? null : `HTTP ${res.status}` };
                }
                return { slug: p.slug, status: await res.json(), error: null };
            }
            catch (e) {
                return { slug: p.slug, status: { configured: false, has_stored_credentials: false }, error: e instanceof Error ? e.message : "Status check failed" };
            }
        }));
        setStatusMap(Object.fromEntries(results.map(r => [r.slug, r.status])));
        const errors = results.filter(r => r.error).map(r => `${providerOf(r.slug).label}: ${r.error}`);
        setStatusBanner(errors.length ? errors.join(" · ") : null);
        setStatusesLoaded(true);
    }, []);
    const loadAlerts = useCallback(async (poll, limit) => {
        if (connectedProviders.length === 0) {
            setAlerts([]);
            return;
        }
        if (poll)
            setPolling(true);
        else
            setAlertsLoading(true);
        setAlertsError(null);
        try {
            const results = await Promise.all(connectedProviders.map(async (p) => {
                const params = new URLSearchParams({ limit: String(limit), offset: "0" });
                if (poll)
                    params.set("poll", "true");
                if (minSeverity)
                    params.set("min_severity", minSeverity);
                if (agentFilter.trim())
                    params.set("agent_id", agentFilter.trim());
                try {
                    const res = await authFetch(`${API}/security/${p.slug}/alerts?${params.toString()}`);
                    const data = await res.json();
                    if (!res.ok)
                        return { slug: p.slug, alerts: [], error: data.detail || `HTTP ${res.status}` };
                    return { slug: p.slug, alerts: (data.alerts || []), error: null };
                }
                catch (e) {
                    return { slug: p.slug, alerts: [], error: e instanceof Error ? e.message : "Failed to load" };
                }
            }));
            const merged = results.flatMap(r => r.alerts).sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
            setAlerts(merged);
            const errors = results.filter(r => r.error).map(r => `${providerOf(r.slug).label}: ${r.error}`);
            setAlertsError(errors.length ? errors.join(" · ") : null);
        }
        finally {
            setPolling(false);
            setAlertsLoading(false);
        }
    }, [connectedProviders, minSeverity, agentFilter]);
    const loadAgents = useCallback(async () => {
        if (connectedProviders.length === 0) {
            setAgents([]);
            return;
        }
        setAgentsLoading(true);
        setAgentsError(null);
        try {
            const results = await Promise.all(connectedProviders.map(async (p) => {
                try {
                    const res = await authFetch(`${API}/security/${p.slug}/agents?limit=200`);
                    const data = await res.json();
                    if (!res.ok)
                        return { slug: p.slug, agents: [], error: data.detail || `HTTP ${res.status}` };
                    return { slug: p.slug, agents: (data.agents || []), error: null };
                }
                catch (e) {
                    return { slug: p.slug, agents: [], error: e instanceof Error ? e.message : "Failed to load" };
                }
            }));
            const merged = results.flatMap(r => r.agents);
            setAgents(merged);
            const errors = results.filter(r => r.error).map(r => `${providerOf(r.slug).label}: ${r.error}`);
            setAgentsError(errors.length ? errors.join(" · ") : null);
        }
        finally {
            setAgentsLoading(false);
        }
    }, [connectedProviders]);
    useEffect(() => { loadAllStatuses(); }, [loadAllStatuses]);
    useEffect(() => {
        if (!statusesLoaded)
            return;
        if (tab === "alerts" && alerts === null)
            loadAlerts(false, perSourceLimit);
        if (tab === "agents" && agents === null)
            loadAgents();
    }, [statusesLoaded, tab, alerts, agents, loadAlerts, loadAgents, perSourceLimit]);
    // Re-fetch whenever which sources are connected changes (connect/disconnect),
    // so the merged view always reflects exactly the currently-connected set.
    useEffect(() => {
        if (!statusesLoaded)
            return;
        setAlerts(null);
        setAgents(null);
    }, [connectedProviders.map(p => p.slug).join(","), statusesLoaded]);
    const doDisconnect = async (provider) => {
        setDisconnectingSlug(provider.slug);
        try {
            const res = await authFetch(`${API}/security/${provider.slug}/disconnect`, { method: "POST" });
            if (!res.ok && res.status !== 404) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || `HTTP ${res.status}`);
            }
            await loadAllStatuses();
        }
        catch (e) {
            setStatusBanner(e instanceof Error ? e.message : "Disconnect failed");
        }
        setDisconnectingSlug(null);
    };
    const visibleAlerts = useMemo(() => (alerts ?? []).filter(a => !sourceFilter || a.source === sourceFilter), [alerts, sourceFilter]);
    const visibleAgents = useMemo(() => (agents ?? []).filter(a => !sourceFilter || a.source === sourceFilter), [agents, sourceFilter]);
    return (_jsxs("div", { style: LS.page, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.panelBorder};border-radius:3px;}
      ` }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 16, fontWeight: 800, color: L.text1 }, children: "SIEM Integrations" }), _jsx("div", { style: { fontSize: 11, color: L.text3, marginTop: 2 }, children: "Alerts, endpoints, and vulnerabilities from every connected source, evaluated together in one view." })] }), _jsx(LPanel, { style: { padding: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }, children: !statusesLoaded ? (_jsx(_Fragment, { children: PROVIDERS.map(p => _jsx(Shimmer, { w: 140, h: 30, radius: 6 }, p.slug)) })) : (PROVIDERS.map(p => {
                    const configured = statusMap[p.slug]?.configured === true;
                    return (_jsxs("div", { style: {
                            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                            border: `1px solid ${configured ? p.color + "44" : L.panelBorder}`,
                            background: configured ? `${p.color}0d` : L.subtleBg,
                            borderRadius: 6,
                        }, children: [_jsx("span", { style: { width: 7, height: 7, borderRadius: "50%", background: configured ? p.color : L.text4, flexShrink: 0 } }), _jsx("span", { style: { fontSize: 11, fontWeight: 600, color: configured ? p.color : L.text2 }, children: p.label }), configured ? (_jsx("button", { onClick: () => doDisconnect(p), disabled: disconnectingSlug === p.slug, style: { ...LS.btn, fontSize: 9, padding: "2px 7px", color: L.red, opacity: disconnectingSlug === p.slug ? 0.7 : 1 }, children: disconnectingSlug === p.slug ? "…" : "Disconnect" })) : (_jsx("button", { onClick: () => setConnectTarget(p), style: { ...LS.btn, fontSize: 9, padding: "2px 7px", background: L.blue, color: "#fff", borderColor: L.blue }, children: "Connect" }))] }, p.slug));
                })) }), statusBanner && (_jsx(LPanel, { style: { padding: "10px 14px", borderColor: L.red, background: "#fef2f2" }, children: _jsxs("span", { style: { fontSize: 11, color: L.red }, children: ["\u2717 ", statusBanner] }) })), statusesLoaded && connectedProviders.length === 0 && (_jsxs(LPanel, { style: { padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 700, color: L.text1 }, children: "No SIEM sources connected yet" }), _jsx("div", { style: { fontSize: 11, color: L.text3, maxWidth: 380 }, children: "Connect Wazuh, Sentinel, CrowdStrike, or Splunk above to start pulling alerts, endpoints, and vulnerabilities into this view." })] })), statusesLoaded && connectedProviders.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { style: { display: "flex", borderBottom: `1px solid ${L.panelBorder}` }, children: ["alerts", "agents"].map(t => (_jsx("button", { onClick: () => setTab(t), style: {
                                background: "none", border: "none", cursor: "pointer", padding: "9px 16px",
                                fontSize: 12, fontWeight: 700, color: tab === t ? L.blue : L.text3,
                                borderBottom: tab === t ? `2px solid ${L.blue}` : "2px solid transparent",
                                textTransform: "capitalize",
                            }, children: t }, t))) }), tab === "alerts" && (_jsxs(LPanel, { style: { padding: 0, display: "flex", flexDirection: "column" }, children: [_jsxs("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsxs("select", { value: sourceFilter, onChange: e => setSourceFilter(e.target.value), style: { ...LS.input, width: "auto" }, children: [_jsx("option", { value: "", children: "All connected sources" }), connectedProviders.map(p => _jsx("option", { value: p.slug, children: p.label }, p.slug))] }), _jsxs("select", { value: minSeverity, onChange: e => setMinSeverity(e.target.value), style: { ...LS.input, width: "auto" }, children: [_jsx("option", { value: "", children: "All severities" }), _jsx("option", { value: "4", children: "Medium and above" }), _jsx("option", { value: "8", children: "High and above" }), _jsx("option", { value: "12", children: "Critical only" })] }), _jsx("input", { value: agentFilter, onChange: e => setAgentFilter(e.target.value), placeholder: "Filter by agent ID", style: { ...LS.input, width: 160 } }), _jsx("button", { onClick: () => loadAlerts(false, perSourceLimit), style: LS.btn, children: "Apply filters" }), _jsx("button", { onClick: () => loadAlerts(true, perSourceLimit), disabled: polling, style: { ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: polling ? 0.7 : 1, marginLeft: "auto" }, children: polling ? "Polling all sources..." : "Poll all sources now" })] }), alertsError && _jsxs("div", { style: { padding: 14, fontSize: 11, color: L.red }, children: ["\u2717 ", alertsError] }), alertsLoading && (_jsx("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 8 }, children: [0, 1, 2].map(i => _jsx(Shimmer, { h: 36 }, i)) })), visibleAlerts.length === 0 && !alertsLoading && (_jsx("div", { style: { padding: 24, textAlign: "center", fontSize: 11, color: L.text3 }, children: "No alerts stored yet \u2014 try \"Poll all sources now\" to pull the latest." })), visibleAlerts.length > 0 && (_jsx("div", { style: { display: "flex", flexDirection: "column" }, children: visibleAlerts.map(a => {
                                    const c = severityColor(a.severity);
                                    const provider = providerOf(a.source);
                                    return (_jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsxs("span", { style: { fontSize: 9, fontWeight: 700, color: c, background: `${c}14`, border: `1px solid ${c}44`, borderRadius: 10, padding: "3px 8px", flexShrink: 0, marginTop: 1 }, children: [severityLabel(a.severity), " \u00B7 ", a.severity] }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [_jsx("span", { style: { fontSize: 12, color: L.text1, fontWeight: 600 }, children: a.title || a.event_type }), _jsx("span", { style: { fontSize: 8, fontWeight: 700, color: provider.color, border: `1px solid ${provider.color}44`, borderRadius: 8, padding: "1px 6px" }, children: provider.label.toUpperCase() })] }), _jsxs("div", { style: { fontSize: 10, color: L.text3, marginTop: 2 }, children: [a.asset || a.agent_id || "unknown host", a.source_ip ? ` · ${a.source_ip}` : "", a.username ? ` · ${a.username}` : "", " \u00B7 ", fmtTime(a.timestamp)] })] })] }, `${a.source}-${a.id}`));
                                }) })), alerts && alerts.length > 0 && (_jsx("div", { style: { display: "flex", justifyContent: "center", padding: "10px 16px" }, children: _jsx("button", { onClick: () => { const next = perSourceLimit + 25; setPerSourceLimit(next); loadAlerts(false, next); }, style: LS.btn, children: "Load more" }) }))] })), tab === "agents" && (_jsxs(LPanel, { style: { padding: 0, display: "flex", flexDirection: "column" }, children: [_jsxs("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsxs("select", { value: sourceFilter, onChange: e => setSourceFilter(e.target.value), style: { ...LS.input, width: "auto" }, children: [_jsx("option", { value: "", children: "All connected sources" }), connectedProviders.map(p => _jsx("option", { value: p.slug, children: p.label }, p.slug))] }), _jsx("span", { style: { fontSize: 11, color: L.text3 }, children: agents ? `${visibleAgents.length} agents` : "Loading agents..." })] }), _jsx("button", { onClick: () => loadAgents(), disabled: agentsLoading, style: { ...LS.btn, opacity: agentsLoading ? 0.7 : 1 }, children: agentsLoading ? "Refreshing..." : "Refresh" })] }), agentsError && _jsxs("div", { style: { padding: 14, fontSize: 11, color: L.red }, children: ["\u2717 ", agentsError] }), agentsLoading && (_jsx("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 8 }, children: [0, 1, 2].map(i => _jsx(Shimmer, { h: 36 }, i)) })), visibleAgents.length === 0 && !agentsLoading && (_jsx("div", { style: { padding: 24, textAlign: "center", fontSize: 11, color: L.text3 }, children: "No agents found." })), visibleAgents.length > 0 && (_jsxs("div", { style: { display: mobile ? "flex" : "block", flexDirection: mobile ? "column" : undefined }, children: [!mobile && (_jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 100px 120px 130px 90px 100px", padding: "7px 16px", background: L.subtleBg, borderBottom: `1px solid ${L.borderLight}` }, children: ["HOST", "SOURCE", "IP", "OS", "STATUS", "LAST SEEN"].map(h => (_jsx("span", { style: { fontSize: 9, color: L.text4, fontWeight: 700, letterSpacing: ".06em" }, children: h }, h))) })), visibleAgents.map(a => {
                                        const provider = providerOf(a.source);
                                        const isUp = a.status === "active" || a.status === "normal" || a.status === "Active";
                                        return (_jsxs("div", { onClick: () => setSelectedAgent(a), style: mobile
                                                ? { padding: "10px 16px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer" }
                                                : { display: "grid", gridTemplateColumns: "1fr 100px 120px 130px 90px 100px", padding: "9px 16px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer", alignItems: "center" }, children: [_jsx("span", { style: { fontSize: 12, color: L.text1, fontWeight: 600 }, children: a.hostname || a.agent_id }), _jsx("span", { style: { fontSize: 9, fontWeight: 700, color: provider.color, width: "fit-content", marginTop: mobile ? 4 : 0 }, children: provider.label }), _jsx("span", { style: { fontSize: 11, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: a.ip || "—" }), _jsx("span", { style: { fontSize: 11, color: L.text3 }, children: a.os || "—" }), _jsx("span", { style: {
                                                        fontSize: 9, fontWeight: 700, width: "fit-content",
                                                        color: isUp ? L.green : L.text4,
                                                        background: isUp ? "#f0fdf4" : L.insetBg,
                                                        border: `1px solid ${isUp ? L.green + "44" : L.panelBorder}`,
                                                        borderRadius: 10, padding: "2px 8px", marginTop: mobile ? 4 : 0,
                                                    }, children: (a.status || "unknown").toUpperCase() }), _jsx("span", { style: { fontSize: 10, color: L.text3, marginTop: mobile ? 4 : 0 }, children: fmtTime(a.last_keepalive) })] }, `${a.source}-${a.agent_id}`));
                                    })] }))] }))] })), connectTarget && (_jsx(ConnectModal, { provider: connectTarget, onClose: () => setConnectTarget(null), onConnected: () => loadAllStatuses() })), selectedAgent && (_jsx(AgentDetailModal, { agent: selectedAgent, onClose: () => setSelectedAgent(null) }))] }));
}
