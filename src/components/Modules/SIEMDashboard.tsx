import React, { useState, useEffect, useCallback, useMemo } from "react";

// ── API Base ──────────────────────────────────────────────────────────────────
const API =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  "https://r3bel-5464.onrender.com";

const AUTH_API = "https://r3bel.onrender.com";

// ── Providers this page knows about ───────────────────────────────────────────
// Adding a fifth source later means adding one entry here (plus its backend
// router) — nothing else in this file branches on provider name.
interface CredentialField { key: string; label: string; placeholder: string; type?: string; }
interface ProviderDef {
  slug: string;            // URL segment + `source` value on every row
  label: string;           // display name
  color: string;           // badge color for this source
  credentialFields: CredentialField[] | null;  // null = mock, one-click connect
}

const L = {
  pageBg: "#f5f7fa", panelBg: "#ffffff", panelBorder: "#e2e8f0",
  subtleBg: "#f8fafc", insetBg: "#f1f5f9", borderLight: "#f1f5f9",
  text1: "#0f172a", text2: "#334155", text3: "#64748b", text4: "#94a3b8",
  blue: "#1d4ed8", cyan: "#0284c7", green: "#16a34a", yellow: "#b45309",
  orange: "#c2410c", red: "#dc2626", purple: "#7c3aed", indigo: "#4f46e5",
};

const PROVIDERS: ProviderDef[] = [
  { slug: "wazuh", label: "Wazuh", color: L.blue,
    credentialFields: [
      { key: "WAZUH_USERNAME", label: "USERNAME", placeholder: "rebel_svc" },
      { key: "WAZUH_PASSWORD", label: "PASSWORD", placeholder: "••••••••", type: "password" },
    ] },
  { slug: "sentinel", label: "Microsoft Sentinel", color: L.cyan, credentialFields: null },
  { slug: "crowdstrike", label: "CrowdStrike", color: L.red, credentialFields: null },
  { slug: "splunk", label: "Splunk", color: L.orange, credentialFields: null },
];

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

function providerOf(slug: string): ProviderDef {
  return PROVIDERS.find(p => p.slug === slug) ?? PROVIDERS[0];
}

// ── Types (mirrors app/wazuh_security/schemas.py — same shape for every source) ─
interface ProviderStatus { configured: boolean; has_stored_credentials: boolean; }
interface UnifiedAgent {
  source: string; agent_id: string; hostname: string | null; ip: string | null; os: string | null;
  status: string | null; version: string | null; last_keepalive: string | null;
}
interface UnifiedSecurityEvent {
  id: number; source: string; event_id: string; timestamp: string | null; severity: number;
  event_type: string; title: string; description: string; agent_id: string | null; asset: string | null;
  source_ip: string | null; username: string | null; rule_id: string | null;
  mitre_tactics: string[]; mitre_techniques: string[];
}
interface UnifiedVulnerability {
  cve: string | null; package: string | null; version: string | null;
  severity: string | null; status: string | null; references: string[];
}
interface UnifiedFimEvent {
  file: string | null; operation: string | null; timestamp: string | null;
  username: string | null; hash: string | null; rule_id: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function severityColor(level: number): string {
  if (level >= 12) return L.red;
  if (level >= 8) return L.orange;
  if (level >= 4) return L.yellow;
  return L.green;
}
function severityLabel(level: number): string {
  if (level >= 12) return "CRITICAL";
  if (level >= 8) return "HIGH";
  if (level >= 4) return "MEDIUM";
  return "LOW";
}
function fmtTime(ts: string | null): string {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}
function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) return null;
  try {
    const res = await fetch(`${AUTH_API}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.access) return null;
    localStorage.setItem("access", data.access);
    if (data.refresh) localStorage.setItem("refresh", data.refresh);
    return data.access as string;
  } catch {
    return null;
  }
}

async function authFetch(url: string, init: RequestInit = {}, _retried = false): Promise<Response> {
  const token = localStorage.getItem("access") || "";
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), ...authHeaders(token) },
  });
  if (res.status !== 401 || _retried) return res;

  const newToken = await refreshAccessToken();
  if (!newToken) {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    return res;
  }
  return authFetch(url, init, true);
}

// ── Connect Modal — adapts to whichever provider was clicked ────────────────
function ConnectModal({ provider, onClose, onConnected }: {
  provider: ProviderDef; onClose: () => void; onConnected: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries((provider.credentialFields ?? []).map(f => [f.key, ""]))
  );
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (provider.credentialFields) {
      const missing = provider.credentialFields.filter(f => !values[f.key]?.trim());
      if (missing.length) { setError(`Missing: ${missing.map(f => f.label).join(", ")}`); return; }
    }
    setConnecting(true); setError(null);
    try {
      const res = await authFetch(`${API}/security/${provider.slug}/connect`, {
        method: "POST",
        ...(provider.credentialFields
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credentials: values }) }
          : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      onConnected();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
    }
    setConnecting(false);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{ ...LS.panel, width: "100%", maxWidth: 440, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: L.text1 }}>Connect {provider.label}</div>
          <button onClick={onClose} style={{ ...LS.btn, padding: "4px 9px" }}>✕</button>
        </div>

        <div style={{ fontSize: 10, color: L.text3 }}>
          {provider.credentialFields
            ? "The manager address is already configured on the backend — just enter the service account credentials REBEL should authenticate with. Nothing is kept in the browser after this form closes."
            : `${provider.label} is running against realistic sample data while the real integration is being built — no credentials needed yet. This just turns the mock feed on for your account.`}
        </div>

        {provider.credentialFields && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {provider.credentialFields.map(f => (
              <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, color: L.text4, letterSpacing: ".06em", fontWeight: 600 }}>{f.label}</label>
                <input
                  type={f.type || "text"}
                  value={values[f.key] ?? ""}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  autoComplete="off"
                  style={LS.input}
                />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ fontSize: 10, color: L.red, background: "#fef2f2", border: `1px solid ${L.red}33`, borderRadius: 4, padding: "6px 9px" }}>
            ✗ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={LS.btn}>Cancel</button>
          <button
            onClick={submit}
            disabled={connecting}
            style={{ ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: connecting ? 0.7 : 1, cursor: connecting ? "not-allowed" : "pointer" }}
          >
            {connecting ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Agent Detail Modal — routes to the right provider based on agent.source ──
function AgentDetailModal({ agent, onClose }: {
  agent: UnifiedAgent; onClose: () => void;
}) {
  const [vulns, setVulns] = useState<UnifiedVulnerability[] | null>(null);
  const [vulnsError, setVulnsError] = useState<string | null>(null);
  const [fim, setFim] = useState<UnifiedFimEvent[] | null>(null);
  const [fimError, setFimError] = useState<string | null>(null);
  const isWazuh = agent.source === "wazuh";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`${API}/security/${agent.source}/vulnerabilities?agent_id=${encodeURIComponent(agent.agent_id)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
        if (!cancelled) setVulns(data.vulnerabilities || []);
      } catch (e) {
        if (!cancelled) setVulnsError(e instanceof Error ? e.message : "Failed to load vulnerabilities");
      }
    })();
    if (isWazuh) {
      (async () => {
        try {
          const res = await authFetch(`${API}/security/wazuh/fim?agent_id=${encodeURIComponent(agent.agent_id)}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
          if (!cancelled) setFim(data.fim_events || []);
        } catch (e) {
          if (!cancelled) setFimError(e instanceof Error ? e.message : "Failed to load FIM events");
        }
      })();
    }
    return () => { cancelled = true; };
  }, [agent.agent_id, agent.source, isWazuh]);

  const provider = providerOf(agent.source);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{ ...LS.panel, width: "100%", maxWidth: 620, maxHeight: "85vh", padding: 20, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: L.text1 }}>{agent.hostname || agent.agent_id}</div>
              <span style={{ fontSize: 8, fontWeight: 700, color: provider.color, background: `${provider.color}14`, border: `1px solid ${provider.color}44`, borderRadius: 10, padding: "2px 7px" }}>
                {provider.label.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }}>{agent.ip} · {agent.os}</div>
          </div>
          <button onClick={onClose} style={{ ...LS.btn, padding: "4px 9px" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
          <div>
            <div style={{ fontSize: 9, color: L.text4, letterSpacing: ".08em", fontWeight: 700, marginBottom: 6 }}>
              VULNERABILITIES {vulns ? `(${vulns.length})` : ""}
            </div>
            {vulnsError && <div style={{ fontSize: 11, color: L.red }}>✗ {vulnsError}</div>}
            {!vulns && !vulnsError && <Shimmer h={40} />}
            {vulns && vulns.length === 0 && <div style={{ fontSize: 11, color: L.text3 }}>No vulnerabilities reported for this agent.</div>}
            {vulns && vulns.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {vulns.map((v, i) => (
                  <div key={i} style={{ background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 6, padding: "8px 10px", display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: L.text1, fontFamily: "'DM Mono',monospace" }}>{v.cve || "Unknown CVE"}</div>
                      <div style={{ fontSize: 10, color: L.text3 }}>{v.package}{v.version ? ` @ ${v.version}` : ""}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: L.text2, alignSelf: "flex-start" }}>{v.severity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isWazuh && (
            <div>
              <div style={{ fontSize: 9, color: L.text4, letterSpacing: ".08em", fontWeight: 700, marginBottom: 6 }}>
                FILE INTEGRITY EVENTS {fim ? `(${fim.length})` : ""}
              </div>
              {fimError && <div style={{ fontSize: 11, color: L.red }}>✗ {fimError}</div>}
              {!fim && !fimError && <Shimmer h={40} />}
              {fim && fim.length === 0 && <div style={{ fontSize: 11, color: L.text3 }}>No FIM events for this agent.</div>}
              {fim && fim.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {fim.map((f, i) => (
                    <div key={i} style={{ background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: L.text1 }}>{f.file}</div>
                      <div style={{ fontSize: 10, color: L.text3 }}>{f.operation} · {fmtTime(f.timestamp)}{f.username ? ` · ${f.username}` : ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page — one SIEM view, data merged across every connected source ────
export default function SIEMDashboard() {
  const mobile = useMobile();

  const [statusMap, setStatusMap] = useState<Record<string, ProviderStatus | null>>({});
  const [statusesLoaded, setStatusesLoaded] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const [connectTarget, setConnectTarget] = useState<ProviderDef | null>(null);
  const [disconnectingSlug, setDisconnectingSlug] = useState<string | null>(null);

  const [tab, setTab] = useState<"alerts" | "agents">("alerts");
  const [sourceFilter, setSourceFilter] = useState<string>("");   // "" = all connected sources
  const [minSeverity, setMinSeverity] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<string>("");

  const [alerts, setAlerts] = useState<UnifiedSecurityEvent[] | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [perSourceLimit, setPerSourceLimit] = useState(25);

  const [agents, setAgents] = useState<UnifiedAgent[] | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<UnifiedAgent | null>(null);

  const connectedProviders = useMemo(
    () => PROVIDERS.filter(p => statusMap[p.slug]?.configured === true),
    [statusMap]
  );

  const loadAllStatuses = useCallback(async () => {
    const results = await Promise.all(PROVIDERS.map(async p => {
      try {
        const res = await authFetch(`${API}/security/${p.slug}/status`);
        if (!res.ok) {
          // A 401 just means no REBEL session yet — normal, stays quiet.
          return { slug: p.slug, status: { configured: false, has_stored_credentials: false }, error: res.status === 401 ? null : `HTTP ${res.status}` };
        }
        return { slug: p.slug, status: await res.json() as ProviderStatus, error: null };
      } catch (e) {
        return { slug: p.slug, status: { configured: false, has_stored_credentials: false }, error: e instanceof Error ? e.message : "Status check failed" };
      }
    }));
    setStatusMap(Object.fromEntries(results.map(r => [r.slug, r.status])));
    const errors = results.filter(r => r.error).map(r => `${providerOf(r.slug).label}: ${r.error}`);
    setStatusBanner(errors.length ? errors.join(" · ") : null);
    setStatusesLoaded(true);
  }, []);

  const loadAlerts = useCallback(async (poll: boolean, limit: number) => {
    if (connectedProviders.length === 0) { setAlerts([]); return; }
    if (poll) setPolling(true); else setAlertsLoading(true);
    setAlertsError(null);
    try {
      const results = await Promise.all(connectedProviders.map(async p => {
        const params = new URLSearchParams({ limit: String(limit), offset: "0" });
        if (poll) params.set("poll", "true");
        if (minSeverity) params.set("min_severity", minSeverity);
        if (agentFilter.trim()) params.set("agent_id", agentFilter.trim());
        try {
          const res = await authFetch(`${API}/security/${p.slug}/alerts?${params.toString()}`);
          const data = await res.json();
          if (!res.ok) return { slug: p.slug, alerts: [] as UnifiedSecurityEvent[], error: data.detail || `HTTP ${res.status}` };
          return { slug: p.slug, alerts: (data.alerts || []) as UnifiedSecurityEvent[], error: null };
        } catch (e) {
          return { slug: p.slug, alerts: [] as UnifiedSecurityEvent[], error: e instanceof Error ? e.message : "Failed to load" };
        }
      }));
      const merged = results.flatMap(r => r.alerts).sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
      setAlerts(merged);
      const errors = results.filter(r => r.error).map(r => `${providerOf(r.slug).label}: ${r.error}`);
      setAlertsError(errors.length ? errors.join(" · ") : null);
    } finally {
      setPolling(false); setAlertsLoading(false);
    }
  }, [connectedProviders, minSeverity, agentFilter]);

  const loadAgents = useCallback(async () => {
    if (connectedProviders.length === 0) { setAgents([]); return; }
    setAgentsLoading(true); setAgentsError(null);
    try {
      const results = await Promise.all(connectedProviders.map(async p => {
        try {
          const res = await authFetch(`${API}/security/${p.slug}/agents?limit=200`);
          const data = await res.json();
          if (!res.ok) return { slug: p.slug, agents: [] as UnifiedAgent[], error: data.detail || `HTTP ${res.status}` };
          return { slug: p.slug, agents: (data.agents || []) as UnifiedAgent[], error: null };
        } catch (e) {
          return { slug: p.slug, agents: [] as UnifiedAgent[], error: e instanceof Error ? e.message : "Failed to load" };
        }
      }));
      const merged = results.flatMap(r => r.agents);
      setAgents(merged);
      const errors = results.filter(r => r.error).map(r => `${providerOf(r.slug).label}: ${r.error}`);
      setAgentsError(errors.length ? errors.join(" · ") : null);
    } finally {
      setAgentsLoading(false);
    }
  }, [connectedProviders]);

  useEffect(() => { loadAllStatuses(); }, [loadAllStatuses]);

  useEffect(() => {
    if (!statusesLoaded) return;
    if (tab === "alerts" && alerts === null) loadAlerts(false, perSourceLimit);
    if (tab === "agents" && agents === null) loadAgents();
  }, [statusesLoaded, tab, alerts, agents, loadAlerts, loadAgents, perSourceLimit]);

  // Re-fetch whenever which sources are connected changes (connect/disconnect),
  // so the merged view always reflects exactly the currently-connected set.
  useEffect(() => {
    if (!statusesLoaded) return;
    setAlerts(null);
    setAgents(null);
  }, [connectedProviders.map(p => p.slug).join(","), statusesLoaded]);

  const doDisconnect = async (provider: ProviderDef) => {
    setDisconnectingSlug(provider.slug);
    try {
      const res = await authFetch(`${API}/security/${provider.slug}/disconnect`, { method: "POST" });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      await loadAllStatuses();
    } catch (e) {
      setStatusBanner(e instanceof Error ? e.message : "Disconnect failed");
    }
    setDisconnectingSlug(null);
  };

  const visibleAlerts = useMemo(
    () => (alerts ?? []).filter(a => !sourceFilter || a.source === sourceFilter),
    [alerts, sourceFilter]
  );
  const visibleAgents = useMemo(
    () => (agents ?? []).filter(a => !sourceFilter || a.source === sourceFilter),
    [agents, sourceFilter]
  );

  return (
    <div style={LS.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.panelBorder};border-radius:3px;}
      `}</style>

      {/* ── HEADER ── */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: L.text1 }}>SIEM Integrations</div>
        <div style={{ fontSize: 11, color: L.text3, marginTop: 2 }}>
          Alerts, endpoints, and vulnerabilities from every connected source, evaluated together in one view.
        </div>
      </div>

      {/* ── PROVIDER CONNECTOR STRIP ── */}
      <LPanel style={{ padding: 12, display: "flex", flexWrap: "wrap" as const, gap: 8, alignItems: "center" }}>
        {!statusesLoaded ? (
          <>{PROVIDERS.map(p => <Shimmer key={p.slug} w={140} h={30} radius={6} />)}</>
        ) : (
          PROVIDERS.map(p => {
            const configured = statusMap[p.slug]?.configured === true;
            return (
              <div key={p.slug} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                border: `1px solid ${configured ? p.color + "44" : L.panelBorder}`,
                background: configured ? `${p.color}0d` : L.subtleBg,
                borderRadius: 6,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: configured ? p.color : L.text4, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: configured ? p.color : L.text2 }}>{p.label}</span>
                {configured ? (
                  <button
                    onClick={() => doDisconnect(p)}
                    disabled={disconnectingSlug === p.slug}
                    style={{ ...LS.btn, fontSize: 9, padding: "2px 7px", color: L.red, opacity: disconnectingSlug === p.slug ? 0.7 : 1 }}
                  >
                    {disconnectingSlug === p.slug ? "…" : "Disconnect"}
                  </button>
                ) : (
                  <button
                    onClick={() => setConnectTarget(p)}
                    style={{ ...LS.btn, fontSize: 9, padding: "2px 7px", background: L.blue, color: "#fff", borderColor: L.blue }}
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })
        )}
      </LPanel>

      {statusBanner && (
        <LPanel style={{ padding: "10px 14px", borderColor: L.red, background: "#fef2f2" }}>
          <span style={{ fontSize: 11, color: L.red }}>✗ {statusBanner}</span>
        </LPanel>
      )}

      {statusesLoaded && connectedProviders.length === 0 && (
        <LPanel style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: L.text1 }}>No SIEM sources connected yet</div>
          <div style={{ fontSize: 11, color: L.text3, maxWidth: 380 }}>
            Connect Wazuh, Sentinel, CrowdStrike, or Splunk above to start pulling alerts, endpoints, and vulnerabilities into this view.
          </div>
        </LPanel>
      )}

      {statusesLoaded && connectedProviders.length > 0 && (
        <>
          {/* ── TABS ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${L.panelBorder}` }}>
            {(["alerts", "agents"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "9px 16px",
                  fontSize: 12, fontWeight: 700, color: tab === t ? L.blue : L.text3,
                  borderBottom: tab === t ? `2px solid ${L.blue}` : "2px solid transparent",
                  textTransform: "capitalize" as const,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ── ALERTS TAB ── */}
          {tab === "alerts" && (
            <LPanel style={{ padding: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${L.borderLight}` }}>
                <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={{ ...LS.input, width: "auto" } as React.CSSProperties}>
                  <option value="">All connected sources</option>
                  {connectedProviders.map(p => <option key={p.slug} value={p.slug}>{p.label}</option>)}
                </select>
                <select value={minSeverity} onChange={e => setMinSeverity(e.target.value)} style={{ ...LS.input, width: "auto" } as React.CSSProperties}>
                  <option value="">All severities</option>
                  <option value="4">Medium and above</option>
                  <option value="8">High and above</option>
                  <option value="12">Critical only</option>
                </select>
                <input
                  value={agentFilter}
                  onChange={e => setAgentFilter(e.target.value)}
                  placeholder="Filter by agent ID"
                  style={{ ...LS.input, width: 160 }}
                />
                <button onClick={() => loadAlerts(false, perSourceLimit)} style={LS.btn}>Apply filters</button>
                <button
                  onClick={() => loadAlerts(true, perSourceLimit)}
                  disabled={polling}
                  style={{ ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: polling ? 0.7 : 1, marginLeft: "auto" }}
                >
                  {polling ? "Polling all sources..." : "Poll all sources now"}
                </button>
              </div>

              {alertsError && <div style={{ padding: 14, fontSize: 11, color: L.red }}>✗ {alertsError}</div>}
              {alertsLoading && (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[0, 1, 2].map(i => <Shimmer key={i} h={36} />)}
                </div>
              )}
              {visibleAlerts.length === 0 && !alertsLoading && (
                <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: L.text3 }}>
                  No alerts stored yet — try "Poll all sources now" to pull the latest.
                </div>
              )}
              {visibleAlerts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {visibleAlerts.map(a => {
                    const c = severityColor(a.severity);
                    const provider = providerOf(a.source);
                    return (
                      <div key={`${a.source}-${a.id}`} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${L.borderLight}` }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: c, background: `${c}14`, border: `1px solid ${c}44`, borderRadius: 10, padding: "3px 8px", flexShrink: 0, marginTop: 1 }}>
                          {severityLabel(a.severity)} · {a.severity}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
                            <span style={{ fontSize: 12, color: L.text1, fontWeight: 600 }}>{a.title || a.event_type}</span>
                            <span style={{ fontSize: 8, fontWeight: 700, color: provider.color, border: `1px solid ${provider.color}44`, borderRadius: 8, padding: "1px 6px" }}>
                              {provider.label.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: L.text3, marginTop: 2 }}>
                            {a.asset || a.agent_id || "unknown host"}{a.source_ip ? ` · ${a.source_ip}` : ""}{a.username ? ` · ${a.username}` : ""} · {fmtTime(a.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {alerts && alerts.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", padding: "10px 16px" }}>
                  <button
                    onClick={() => { const next = perSourceLimit + 25; setPerSourceLimit(next); loadAlerts(false, next); }}
                    style={LS.btn}
                  >
                    Load more
                  </button>
                </div>
              )}
            </LPanel>
          )}

          {/* ── AGENTS TAB ── */}
          {tab === "agents" && (
            <LPanel style={{ padding: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${L.borderLight}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={{ ...LS.input, width: "auto" } as React.CSSProperties}>
                    <option value="">All connected sources</option>
                    {connectedProviders.map(p => <option key={p.slug} value={p.slug}>{p.label}</option>)}
                  </select>
                  <span style={{ fontSize: 11, color: L.text3 }}>{agents ? `${visibleAgents.length} agents` : "Loading agents..."}</span>
                </div>
                <button onClick={() => loadAgents()} disabled={agentsLoading} style={{ ...LS.btn, opacity: agentsLoading ? 0.7 : 1 }}>
                  {agentsLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {agentsError && <div style={{ padding: 14, fontSize: 11, color: L.red }}>✗ {agentsError}</div>}
              {agentsLoading && (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[0, 1, 2].map(i => <Shimmer key={i} h={36} />)}
                </div>
              )}
              {visibleAgents.length === 0 && !agentsLoading && (
                <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: L.text3 }}>
                  No agents found.
                </div>
              )}
              {visibleAgents.length > 0 && (
                <div style={{ display: mobile ? "flex" : "block", flexDirection: mobile ? "column" as const : undefined }}>
                  {!mobile && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 120px 130px 90px 100px", padding: "7px 16px", background: L.subtleBg, borderBottom: `1px solid ${L.borderLight}` }}>
                      {["HOST", "SOURCE", "IP", "OS", "STATUS", "LAST SEEN"].map(h => (
                        <span key={h} style={{ fontSize: 9, color: L.text4, fontWeight: 700, letterSpacing: ".06em" }}>{h}</span>
                      ))}
                    </div>
                  )}
                  {visibleAgents.map(a => {
                    const provider = providerOf(a.source);
                    const isUp = a.status === "active" || a.status === "normal" || a.status === "Active";
                    return (
                      <div
                        key={`${a.source}-${a.agent_id}`}
                        onClick={() => setSelectedAgent(a)}
                        style={
                          mobile
                            ? { padding: "10px 16px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer" }
                            : { display: "grid", gridTemplateColumns: "1fr 100px 120px 130px 90px 100px", padding: "9px 16px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer", alignItems: "center" }
                        }
                      >
                        <span style={{ fontSize: 12, color: L.text1, fontWeight: 600 }}>{a.hostname || a.agent_id}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: provider.color, width: "fit-content", marginTop: mobile ? 4 : 0 }}>{provider.label}</span>
                        <span style={{ fontSize: 11, color: L.text3, fontFamily: "'DM Mono',monospace" }}>{a.ip || "—"}</span>
                        <span style={{ fontSize: 11, color: L.text3 }}>{a.os || "—"}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, width: "fit-content",
                          color: isUp ? L.green : L.text4,
                          background: isUp ? "#f0fdf4" : L.insetBg,
                          border: `1px solid ${isUp ? L.green + "44" : L.panelBorder}`,
                          borderRadius: 10, padding: "2px 8px", marginTop: mobile ? 4 : 0,
                        }}>
                          {(a.status || "unknown").toUpperCase()}
                        </span>
                        <span style={{ fontSize: 10, color: L.text3, marginTop: mobile ? 4 : 0 }}>{fmtTime(a.last_keepalive)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </LPanel>
          )}
        </>
      )}

      {connectTarget && (
        <ConnectModal
          provider={connectTarget}
          onClose={() => setConnectTarget(null)}
          onConnected={() => loadAllStatuses()}
        />
      )}
      {selectedAgent && (
        <AgentDetailModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}