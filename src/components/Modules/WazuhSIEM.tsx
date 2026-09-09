import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// ── API Base ──────────────────────────────────────────────────────────────────
const API =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  "https://r3bel-5464.onrender.com";

// ── Light Theme Palette (matches IntegrationsPage / other Modules pages) ──────
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

// ── Types (mirrors app/wazuh_security/schemas.py) ─────────────────────────────
interface WazuhStatus { configured: boolean; has_stored_credentials: boolean; }
interface WazuhHealth { status: string; api_reachable: boolean; authenticated: boolean; detail?: string; }
interface UnifiedAgent {
  agent_id: string; hostname: string | null; ip: string | null; os: string | null;
  status: string | null; version: string | null; last_keepalive: string | null;
}
interface UnifiedSecurityEvent {
  id: number; event_id: string; timestamp: string | null; severity: number; event_type: string;
  title: string; description: string; agent_id: string | null; asset: string | null;
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

// ── Connect Modal ───────────────────────────────────────────────────────────
function ConnectModal({ token, onClose, onConnected }: {
  token: string; onClose: () => void; onConnected: () => void;
}) {
  const [values, setValues] = useState({
    WAZUH_API_URL: "", WAZUH_USERNAME: "", WAZUH_PASSWORD: "", WAZUH_VERIFY_SSL: "true",
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const missing = ["WAZUH_API_URL", "WAZUH_USERNAME", "WAZUH_PASSWORD"].filter(
      k => !values[k as keyof typeof values]?.trim()
    );
    if (missing.length) { setError(`Missing: ${missing.join(", ")}`); return; }
    setConnecting(true); setError(null);
    try {
      const res = await fetch(`${API}/security/wazuh/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ credentials: values }),
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
          <div style={{ fontSize: 14, fontWeight: 700, color: L.text1 }}>Connect Wazuh</div>
          <button onClick={onClose} style={{ ...LS.btn, padding: "4px 9px" }}>✕</button>
        </div>

        <div style={{ fontSize: 10, color: L.text3 }}>
          Credentials are sent directly to your backend and stored there — nothing is kept in the browser after this form closes.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 9, color: L.text4, letterSpacing: ".06em", fontWeight: 600 }}>WAZUH API URL</label>
            <input
              value={values.WAZUH_API_URL}
              onChange={e => setValues(v => ({ ...v, WAZUH_API_URL: e.target.value }))}
              placeholder="https://wazuh-manager:55000"
              autoComplete="off"
              style={LS.input}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 9, color: L.text4, letterSpacing: ".06em", fontWeight: 600 }}>WAZUH USERNAME</label>
            <input
              value={values.WAZUH_USERNAME}
              onChange={e => setValues(v => ({ ...v, WAZUH_USERNAME: e.target.value }))}
              placeholder="rebel_svc"
              autoComplete="off"
              style={LS.input}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 9, color: L.text4, letterSpacing: ".06em", fontWeight: 600 }}>WAZUH PASSWORD</label>
            <input
              type="password"
              value={values.WAZUH_PASSWORD}
              onChange={e => setValues(v => ({ ...v, WAZUH_PASSWORD: e.target.value }))}
              placeholder="••••••••"
              autoComplete="off"
              style={LS.input}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 9, color: L.text4, letterSpacing: ".06em", fontWeight: 600 }}>VERIFY TLS CERTIFICATE</label>
            <select
              value={values.WAZUH_VERIFY_SSL}
              onChange={e => setValues(v => ({ ...v, WAZUH_VERIFY_SSL: e.target.value }))}
              style={LS.input as React.CSSProperties}
            >
              <option value="true">Verify (recommended)</option>
              <option value="false">Skip verification (self-signed manager)</option>
            </select>
          </div>
        </div>

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

// ── Agent Detail Modal (vulnerabilities + FIM for one agent) ──────────────────
function AgentDetailModal({ token, agent, onClose }: {
  token: string; agent: UnifiedAgent; onClose: () => void;
}) {
  const [vulns, setVulns] = useState<UnifiedVulnerability[] | null>(null);
  const [fim, setFim] = useState<UnifiedFimEvent[] | null>(null);
  const [vulnsError, setVulnsError] = useState<string | null>(null);
  const [fimError, setFimError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/security/wazuh/vulnerabilities?agent_id=${encodeURIComponent(agent.agent_id)}`, { headers: authHeaders(token) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
        if (!cancelled) setVulns(data.vulnerabilities || []);
      } catch (e) {
        if (!cancelled) setVulnsError(e instanceof Error ? e.message : "Failed to load vulnerabilities");
      }
    })();
    (async () => {
      try {
        const res = await fetch(`${API}/security/wazuh/fim?agent_id=${encodeURIComponent(agent.agent_id)}`, { headers: authHeaders(token) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
        if (!cancelled) setFim(data.fim_events || []);
      } catch (e) {
        if (!cancelled) setFimError(e instanceof Error ? e.message : "Failed to load FIM events");
      }
    })();
    return () => { cancelled = true; };
  }, [agent.agent_id, token]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{ ...LS.panel, width: "100%", maxWidth: 620, maxHeight: "85vh", padding: 20, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: L.text1 }}>{agent.hostname || agent.agent_id}</div>
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
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function WazuhSIEM() {
  const mobile = useMobile();
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [status, setStatus] = useState<WazuhStatus | null>(null);
  const [health, setHealth] = useState<WazuhHealth | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [tab, setTab] = useState<"alerts" | "agents">("alerts");
  const [showConnect, setShowConnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [agents, setAgents] = useState<UnifiedAgent[] | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<UnifiedAgent | null>(null);

  const [alerts, setAlerts] = useState<UnifiedSecurityEvent[] | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [minSeverity, setMinSeverity] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 25;

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/security/wazuh/status`, { headers: authHeaders(token) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus(await res.json());
      setStatusError(null);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "Status check failed");
    }
  }, [token]);

  const loadHealth = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/security/wazuh/health`, { headers: authHeaders(token) });
      setHealth(await res.json());
    } catch {
      setHealth({ status: "error", api_reachable: false, authenticated: false });
    }
  }, [token]);

  const loadAgents = useCallback(async () => {
    if (!token) return;
    setAgentsLoading(true); setAgentsError(null);
    try {
      const res = await fetch(`${API}/security/wazuh/agents`, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setAgents(data.agents || []);
    } catch (e) {
      setAgentsError(e instanceof Error ? e.message : "Failed to load agents");
    }
    setAgentsLoading(false);
  }, [token]);

  const loadAlerts = useCallback(async (poll: boolean, newOffset: number) => {
    if (!token) return;
    if (poll) setPolling(true); else setAlertsLoading(true);
    setAlertsError(null);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(newOffset) });
      if (poll) params.set("poll", "true");
      if (minSeverity) params.set("min_severity", minSeverity);
      if (agentFilter.trim()) params.set("agent_id", agentFilter.trim());
      const res = await fetch(`${API}/security/wazuh/alerts?${params.toString()}`, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setAlerts(data.alerts || []);
      setOffset(newOffset);
    } catch (e) {
      setAlertsError(e instanceof Error ? e.message : "Failed to load alerts");
    }
    setPolling(false); setAlertsLoading(false);
  }, [token, minSeverity, agentFilter]);

  useEffect(() => {
    if (!token) return;
    loadStatus();
    loadHealth();
  }, [token, loadStatus, loadHealth]);

  useEffect(() => {
    if (!token || status?.configured !== true) return;
    if (tab === "agents" && agents === null) loadAgents();
    if (tab === "alerts" && alerts === null) loadAlerts(false, 0);
  }, [token, status, tab, agents, alerts, loadAgents, loadAlerts]);

  const doSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/security/wazuh/agents/sync`, { method: "POST", headers: authHeaders(token || "") });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      await loadAgents();
    } catch (e) {
      setAgentsError(e instanceof Error ? e.message : "Sync failed");
    }
    setSyncing(false);
  };

  const doDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch(`${API}/security/wazuh/disconnect`, { method: "POST", headers: authHeaders(token || "") });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      setStatus({ configured: false, has_stored_credentials: false });
      setAgents(null); setAlerts(null);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "Disconnect failed");
    }
    setDisconnecting(false);
  };

  if (!token) return null;

  const loading = status === null;
  const configured = status?.configured === true;

  const healthColor = !health ? L.text4
    : health.status === "healthy" ? L.green
    : health.status === "unavailable" ? L.orange
    : health.status === "unauthenticated" ? L.red
    : L.text4;

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: L.text1 }}>SIEM Integration — Wazuh</div>
          <div style={{ fontSize: 11, color: L.text3, marginTop: 2 }}>
            Live security events, agent inventory, and vulnerability data from your Wazuh deployment.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {health && (
            <span style={{ fontSize: 10, color: healthColor, background: `${healthColor}14`, border: `1px solid ${healthColor}44`, borderRadius: 20, padding: "5px 12px", fontWeight: 700 }}>
              ● {health.status.toUpperCase()}
            </span>
          )}
          {loading ? (
            <Shimmer w={90} h={28} radius={4} />
          ) : configured ? (
            <button onClick={doDisconnect} disabled={disconnecting} style={{ ...LS.btn, color: L.red, opacity: disconnecting ? 0.7 : 1 }}>
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          ) : (
            <button onClick={() => setShowConnect(true)} style={{ ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue }}>
              Connect Wazuh
            </button>
          )}
        </div>
      </div>

      {statusError && (
        <LPanel style={{ padding: "10px 14px", borderColor: L.red, background: "#fef2f2" }}>
          <span style={{ fontSize: 11, color: L.red }}>✗ {statusError}</span>
        </LPanel>
      )}

      {!loading && !configured && (
        <LPanel style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: L.text1 }}>Wazuh isn't connected yet</div>
          <div style={{ fontSize: 11, color: L.text3, maxWidth: 380 }}>
            Connect your Wazuh Manager to pull agent inventory, alerts, vulnerabilities, and file integrity events into REBEL.
          </div>
          <button onClick={() => setShowConnect(true)} style={{ ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, marginTop: 6 }}>
            Connect Wazuh
          </button>
        </LPanel>
      )}

      {!loading && configured && (
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
                <button onClick={() => loadAlerts(false, 0)} style={LS.btn}>Apply filters</button>
                <button
                  onClick={() => loadAlerts(true, 0)}
                  disabled={polling}
                  style={{ ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: polling ? 0.7 : 1, marginLeft: "auto" }}
                >
                  {polling ? "Polling Wazuh..." : "Poll Wazuh now"}
                </button>
              </div>

              {alertsError && <div style={{ padding: 14, fontSize: 11, color: L.red }}>✗ {alertsError}</div>}
              {alertsLoading && (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[0, 1, 2].map(i => <Shimmer key={i} h={36} />)}
                </div>
              )}
              {alerts && alerts.length === 0 && !alertsLoading && (
                <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: L.text3 }}>
                  No alerts stored yet — try "Poll Wazuh now" to pull the latest.
                </div>
              )}
              {alerts && alerts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {alerts.map(a => {
                    const c = severityColor(a.severity);
                    return (
                      <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${L.borderLight}` }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: c, background: `${c}14`, border: `1px solid ${c}44`, borderRadius: 10, padding: "3px 8px", flexShrink: 0, marginTop: 1 }}>
                          {severityLabel(a.severity)} · {a.severity}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: L.text1, fontWeight: 600 }}>{a.title || a.event_type}</div>
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
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px" }}>
                  <button onClick={() => loadAlerts(false, Math.max(0, offset - LIMIT))} disabled={offset === 0} style={{ ...LS.btn, opacity: offset === 0 ? 0.5 : 1 }}>
                    ← Newer
                  </button>
                  <button onClick={() => loadAlerts(false, offset + LIMIT)} disabled={alerts.length < LIMIT} style={{ ...LS.btn, opacity: alerts.length < LIMIT ? 0.5 : 1 }}>
                    Older →
                  </button>
                </div>
              )}
            </LPanel>
          )}

          {/* ── AGENTS TAB ── */}
          {tab === "agents" && (
            <LPanel style={{ padding: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${L.borderLight}` }}>
                <span style={{ fontSize: 11, color: L.text3 }}>{agents ? `${agents.length} agents` : "Loading agents..."}</span>
                <button onClick={doSync} disabled={syncing} style={{ ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: syncing ? 0.7 : 1 }}>
                  {syncing ? "Syncing..." : "Sync from Wazuh"}
                </button>
              </div>

              {agentsError && <div style={{ padding: 14, fontSize: 11, color: L.red }}>✗ {agentsError}</div>}
              {agentsLoading && (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[0, 1, 2].map(i => <Shimmer key={i} h={36} />)}
                </div>
              )}
              {agents && agents.length === 0 && !agentsLoading && (
                <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: L.text3 }}>
                  No agents found on this Wazuh deployment.
                </div>
              )}
              {agents && agents.length > 0 && (
                <div style={{ display: mobile ? "flex" : "block", flexDirection: mobile ? "column" as const : undefined }}>
                  {!mobile && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 140px 90px 100px", padding: "7px 16px", background: L.subtleBg, borderBottom: `1px solid ${L.borderLight}` }}>
                      {["HOST", "IP", "OS", "STATUS", "LAST SEEN"].map(h => (
                        <span key={h} style={{ fontSize: 9, color: L.text4, fontWeight: 700, letterSpacing: ".06em" }}>{h}</span>
                      ))}
                    </div>
                  )}
                  {agents.map(a => (
                    <div
                      key={a.agent_id}
                      onClick={() => setSelectedAgent(a)}
                      style={
                        mobile
                          ? { padding: "10px 16px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer" }
                          : { display: "grid", gridTemplateColumns: "1fr 120px 140px 90px 100px", padding: "9px 16px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer", alignItems: "center" }
                      }
                    >
                      <span style={{ fontSize: 12, color: L.text1, fontWeight: 600 }}>{a.hostname || a.agent_id}</span>
                      <span style={{ fontSize: 11, color: L.text3, fontFamily: "'DM Mono',monospace" }}>{a.ip || "—"}</span>
                      <span style={{ fontSize: 11, color: L.text3 }}>{a.os || "—"}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, width: "fit-content",
                        color: a.status === "active" ? L.green : L.text4,
                        background: a.status === "active" ? "#f0fdf4" : L.insetBg,
                        border: `1px solid ${a.status === "active" ? L.green + "44" : L.panelBorder}`,
                        borderRadius: 10, padding: "2px 8px", marginTop: mobile ? 4 : 0,
                      }}>
                        {(a.status || "unknown").toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, color: L.text3, marginTop: mobile ? 4 : 0 }}>{fmtTime(a.last_keepalive)}</span>
                    </div>
                  ))}
                </div>
              )}
            </LPanel>
          )}
        </>
      )}

      {showConnect && (
        <ConnectModal
          token={token}
          onClose={() => setShowConnect(false)}
          onConnected={() => { loadStatus(); loadHealth(); }}
        />
      )}
      {selectedAgent && (
        <AgentDetailModal token={token} agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}