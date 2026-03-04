import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API = "https://r3bel-production.up.railway.app";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface ScanResult {
  score?: number;
  level?: string;
  domain?: string;
  url?: string;
  tls_info?: {
    tls_version?: string;
    key_type?: string;
    key_size?: number;
    issuer?: string;
    post_quantum?: boolean;
    is_self_signed?: boolean;
  };
  vulnerabilities?: {
    missing_headers?: string[];
    open_redirect_risk?: boolean;
    suspicious_url_patterns?: string[];
  };
  reasons?: string[];
  explanation?: string;
  error?: string;
}

interface EnrichResult {
  label?: string;
  action?: string;
  confidence?: string;
  detected?: string;
  base_anomaly?: number;
  financialRisk?: string;
  intel?: {
    country?: string;
    asn?: string;
    org?: string;
    malicious?: number;
    suspicious?: number;
    reputation?: number;
  };
  error?: string;
}

interface Packet {
  id: string;
  time: string;
  src: string;
  dst_port: number;
  size: number;
  risk: number;
  label: string;
  color: string;
  country: string;
  org: string;
}

interface TrafficPoint {
  t: number;
  normal: number;
  anomaly: number;
}

interface Stats {
  total: number;
  anomalies: number;
  blocked: number;
  critical: number;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22d3ee",
  NORMAL: "#22c55e",
};

function useInterval(fn: () => void, ms: number) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; }, [fn]);
  useEffect(() => {
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

// ─── SCAN MODAL ───────────────────────────────────────────────────────────────
function ScanModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [tab, setTab] = useState("url");

  const runScan = async () => {
    if (!url.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}${tab === "url" ? "/scan-url" : "/scan-crypto"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      setResult(await res.json());
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Unknown error" });
    }
    setLoading(false);
  };

  const sc = (s: number) => s >= 70 ? "#22c55e" : s >= 40 ? "#eab308" : "#ef4444";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ width: 560, background: "#0d1117", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 4, boxShadow: "0 0 60px rgba(59,130,246,0.15)" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={S.label}>ACTIVE SCAN</span>
          <button onClick={onClose} style={S.ghost}>✕</button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(59,130,246,0.08)" }}>
            {[["url", "URL SCAN"], ["crypto", "CRYPTO / TLS"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{ ...S.tabBtn, color: tab === id ? "#3b82f6" : "rgba(200,220,255,0.3)", borderBottom: tab === id ? "2px solid #3b82f6" : "2px solid transparent" }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && runScan()} placeholder="https://target.com" style={{ ...S.input, flex: 1 }} />
            <button onClick={runScan} disabled={loading} style={S.btn}>{loading ? "SCANNING..." : "SCAN"}</button>
          </div>
          {loading && <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={S.spinner} /><span style={{ fontSize: 11, color: "rgba(200,220,255,0.4)", fontFamily: "Share Tech Mono" }}>Probing target...</span></div>}
          {result && !result.error && (
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 3, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {result.score !== undefined && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 38, color: sc(result.score), textShadow: `0 0 20px ${sc(result.score)}55` }}>{result.score}</div>
                  <div>
                    <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 10, color: sc(result.score), letterSpacing: "0.15em" }}>{result.level?.toUpperCase() || "RISK"}</div>
                    <div style={{ fontSize: 11, color: "rgba(200,220,255,0.4)", marginTop: 2 }}>{result.domain || result.url}</div>
                  </div>
                </div>
              )}
              {result.tls_info?.tls_version && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {([
                    ["TLS Version", result.tls_info.tls_version],
                    ["Key Type", result.tls_info.key_type],
                    ["Key Size", (result.tls_info.key_size ?? "?") + " bits"],
                    ["Issuer", result.tls_info.issuer],
                    ["Post-Quantum", result.tls_info.post_quantum ? "YES ✓" : "NO"],
                    ["Self-Signed", result.tls_info.is_self_signed ? "YES ⚠" : "NO"],
                  ] as [string, string | number | undefined][]).map(([k, v]) => (
                    <div key={k} style={{ background: "rgba(255,255,255,0.03)", padding: "5px 9px", borderRadius: 2 }}>
                      <div style={{ fontSize: 7, color: "rgba(200,220,255,0.28)", letterSpacing: "0.12em", marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 11, color: "rgba(200,220,255,0.8)" }}>{v ?? "N/A"}</div>
                    </div>
                  ))}
                </div>
              )}
              {result.vulnerabilities && (
                <div>
                  <div style={{ fontSize: 8, color: "rgba(200,220,255,0.28)", letterSpacing: "0.15em", marginBottom: 5 }}>VULNERABILITIES</div>
                  {result.vulnerabilities.missing_headers?.map((h: string) => <div key={h} style={{ fontSize: 10, color: "#f97316" }}>⚠ {h}</div>)}
                  {result.vulnerabilities.open_redirect_risk && <div style={{ fontSize: 10, color: "#ef4444" }}>⚠ Open Redirect Risk</div>}
                  {result.vulnerabilities.suspicious_url_patterns?.map((p: string) => <div key={p} style={{ fontSize: 10, color: "#eab308" }}>⚠ {p}</div>)}
                </div>
              )}
              {result.reasons?.map((r: string) => <div key={r} style={{ fontSize: 10, color: "#f97316" }}>⚠ {r}</div>)}
              {result.explanation && <div style={{ fontSize: 11, color: "rgba(200,220,255,0.58)", lineHeight: 1.7, borderTop: "1px solid rgba(59,130,246,0.08)", paddingTop: 10, fontFamily: "Share Tech Mono" }}>{result.explanation}</div>}
            </div>
          )}
          {result?.error && <div style={{ fontSize: 11, color: "#ef4444", fontFamily: "Share Tech Mono" }}>ERROR: {result.error}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── IP ENRICH MODAL ──────────────────────────────────────────────────────────
function IPEnrichModal({ ip: initIp, onClose }: { ip: string; onClose: () => void }) {
  const [ip, setIp] = useState(initIp || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [blocked, setBlocked] = useState(false);

  const run = useCallback(async (val?: string) => {
    const target = val ?? ip;
    if (!target) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/enrich_ip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip: target }) });
      setResult(await res.json());
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Unknown error" });
    }
    setLoading(false);
  }, [ip]);

  useEffect(() => { if (initIp) run(initIp); }, []);

  const doBlock = async () => {
    await fetch(`${API}/block_ip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip }) });
    setBlocked(true);
  };

  const lc: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f97316", LOW: "#22c55e" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ width: 500, background: "#0d1117", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 4, boxShadow: "0 0 60px rgba(59,130,246,0.15)" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={S.label}>IP INTELLIGENCE</span>
          <button onClick={onClose} style={S.ghost}>✕</button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={ip} onChange={e => setIp(e.target.value)} onKeyDown={e => e.key === "Enter" && run()} placeholder="x.x.x.x" style={{ ...S.input, flex: 1 }} />
            <button onClick={() => run()} disabled={loading} style={S.btn}>{loading ? "..." : "ENRICH"}</button>
          </div>
          {loading && <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={S.spinner} /><span style={{ fontSize: 11, color: "rgba(200,220,255,0.4)", fontFamily: "Share Tech Mono" }}>Querying IPInfo + threat feeds...</span></div>}
          {result && !result.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 24, color: lc[result.label ?? ""] ?? "#eab308", textShadow: `0 0 20px ${lc[result.label ?? ""] ?? "#eab308"}55` }}>{result.label}</div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(200,220,255,0.5)" }}>{result.action}</div>
                  <div style={{ fontSize: 10, color: "rgba(200,220,255,0.35)" }}>Confidence: {result.confidence} · {result.detected?.slice(0, 19).replace("T", " ")} UTC</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {([
                  ["Country", result.intel?.country],
                  ["ASN", result.intel?.asn],
                  ["Org", result.intel?.org],
                  ["Anomaly Score", result.base_anomaly],
                  ["Malicious Signals", result.intel?.malicious],
                  ["Suspicious Signals", result.intel?.suspicious],
                  ["Reputation Score", result.intel?.reputation],
                  ["Financial Risk", result.financialRisk],
                ] as [string, string | number | undefined][]).map(([k, v]) => (
                  <div key={k} style={{ background: "rgba(255,255,255,0.03)", padding: "5px 9px", borderRadius: 2 }}>
                    <div style={{ fontSize: 7, color: "rgba(200,220,255,0.28)", letterSpacing: "0.12em", marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 11, color: "rgba(200,220,255,0.8)" }}>{v ?? "-"}</div>
                  </div>
                ))}
              </div>
              <button onClick={doBlock} disabled={blocked} style={{ ...S.btn, background: blocked ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.12)", borderColor: blocked ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.35)", color: blocked ? "#22c55e" : "#ef4444", padding: "8px 0", width: "100%" }}>
                {blocked ? "✓ BLOCKED SUCCESSFULLY" : `⛔ BLOCK ${ip} NOW`}
              </button>
            </div>
          )}
          {result?.error && <div style={{ fontSize: 11, color: "#ef4444" }}>ERROR: {result.error}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
function ChatPanel({ onClose }: { onClose: () => void }) {
  const [msgs, setMsgs] = useState<{ role: string; text: string }[]>([{ role: "assistant", text: "REBEL ONLINE. Threat intelligence core active. Query the system." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput(""); setLoading(true);
    setMsgs(m => [...m, { role: "user", text: msg }]);
    try {
      const res = await fetch(`${API}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg }) });
      const data = await res.json();
      setMsgs(m => [...m, { role: "assistant", text: data.response || JSON.stringify(data) }]);
    } catch (e) {
      setMsgs(m => [...m, { role: "assistant", text: `[ERROR] ${e instanceof Error ? e.message : "Unknown"}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 400, background: "#0a0f1a", borderLeft: "1px solid rgba(59,130,246,0.18)", display: "flex", flexDirection: "column", zIndex: 200, animation: "slideIn 0.28s ease", boxShadow: "-18px 0 50px rgba(0,0,0,0.55)" }}>
      <div style={{ padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Pulse color="#3b82f6" /><span style={S.label}>REBEL CHAT</span></div>
        <button onClick={onClose} style={S.ghost}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", background: m.role === "user" ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.035)", border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.28)" : "rgba(255,255,255,0.055)"}`, borderRadius: m.role === "user" ? "10px 10px 2px 10px" : "2px 10px 10px 10px", padding: "8px 12px" }}>
            {m.role === "assistant" && <div style={{ fontSize: 7, fontFamily: "'Orbitron',monospace", color: "#3b82f6", letterSpacing: "0.2em", marginBottom: 4 }}>REBEL</div>}
            <p style={{ margin: 0, fontFamily: "Share Tech Mono", fontSize: 12, color: "rgba(200,220,255,0.85)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.text}</p>
          </div>
        ))}
        {loading && <div style={{ display: "flex", gap: 4, padding: "8px 12px" }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#3b82f6", animation: `bounce 1s ease infinite ${i * 0.15}s` }} />)}</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "11px 13px", borderTop: "1px solid rgba(59,130,246,0.1)", display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Query REBEL..." style={{ ...S.input, flex: 1 }} />
        <button onClick={send} disabled={loading} style={S.btn}>SEND</button>
      </div>
    </div>
  );
}

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
function Pulse({ color = "#3b82f6" }: { color?: string }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.5, animation: "ping 1.4s ease infinite" }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "block", boxShadow: `0 0 5px ${color}` }} />
    </span>
  );
}

function RiskArc({ score, label }: { score: number; label: string }) {
  const r = 36, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
  const color = score > 80 ? "#ef4444" : score > 60 ? "#f97316" : score > 40 ? "#eab308" : "#3b82f6";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <svg width="82" height="82" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 1s ease", filter: `drop-shadow(0 0 5px ${color})` }} />
        <text x="50" y="54" textAnchor="middle" fill={color} fontSize="16" fontFamily="Orbitron" fontWeight="700">{score}</text>
      </svg>
      <span style={{ fontSize: 8, color: "rgba(200,220,255,0.38)", letterSpacing: "0.1em", fontFamily: "Share Tech Mono", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  label:   { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: "rgba(200,220,255,0.62)" },
  ghost:   { background: "none", border: "none", color: "rgba(200,220,255,0.32)", cursor: "pointer", fontSize: 16, padding: 4 },
  input:   { background: "rgba(255,255,255,0.035)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 3, padding: "8px 12px", color: "rgba(200,220,255,0.9)", fontFamily: "Share Tech Mono", fontSize: 12, outline: "none" },
  btn:     { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.32)", borderRadius: 3, color: "#3b82f6", cursor: "pointer", padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em", whiteSpace: "nowrap", transition: "all 0.2s" },
  tabBtn:  { background: "none", border: "none", cursor: "pointer", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.14em", padding: "5px 13px", transition: "all 0.2s" },
  spinner: { width: 13, height: 13, border: "2px solid rgba(59,130,246,0.15)", borderTop: "2px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export default function RebelDashboard() {
  const [chatOpen, setChatOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [enrichTarget, setEnrichTarget] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("feed");

  const [packets, setPackets] = useState<Packet[]>([]);
  const [trafficHistory, setTrafficHistory] = useState<TrafficPoint[]>(
    Array.from({ length: 40 }, (_, i) => ({ t: i, normal: 0, anomaly: 0 }))
  );
  const [stats, setStats] = useState<Stats>({ total: 0, anomalies: 0, blocked: 0, critical: 0 });

  const fetchPacket = useCallback(async () => {
    try {
      const res = await fetch(`${API}/latest_packet`);
      const pkt = await res.json();
      if (pkt.error || pkt.detail) return;

      const risk: number = pkt.risk_probability ?? 0;
      const label = risk > 0.6 ? "CRITICAL" : risk > 0.3 ? "HIGH" : "NORMAL";
      const color = SEV_COLOR[label];

      const row: Packet = {
        id: `P-${Date.now().toString(36).toUpperCase().slice(-6)}`,
        time: new Date().toISOString().slice(11, 19),
        src: pkt.ip_src,
        dst_port: pkt.dst_port,
        size: pkt.packet_size,
        risk,
        label,
        color,
        country: pkt.intel?.country ?? "??",
        org: pkt.intel?.org ?? "",
      };

      setPackets(prev => [row, ...prev].slice(0, 80));
      setTrafficHistory(prev => {
        const last = prev[prev.length - 1];
        return [...prev.slice(1), {
          t: last.t + 1,
          normal: label === "NORMAL" ? pkt.packet_size : 0,
          anomaly: label !== "NORMAL" ? pkt.packet_size : 0,
        }];
      });
      setStats(prev => ({
        total: prev.total + 1,
        anomalies: prev.anomalies + (label !== "NORMAL" ? 1 : 0),
        blocked: prev.blocked + (label === "CRITICAL" ? 1 : 0),
        critical: prev.critical + (label === "CRITICAL" ? 1 : 0),
      }));
    } catch (_) { /* silent */ }
  }, []);

  useInterval(fetchPacket, 2000);
  useEffect(() => { fetchPacket(); }, []);

  const anomalyRate = stats.total > 0 ? Math.round((stats.anomalies / stats.total) * 100) : 0;
  const riskScores = [
    { label: "Network",   score: Math.min(99, anomalyRate * 2 + 15) },
    { label: "Endpoint",  score: Math.min(99, stats.critical * 6 + 10) },
    { label: "Port 4444", score: Math.min(99, packets.filter(p => p.dst_port === 4444).length * 12 + 5) },
    { label: "Intel",     score: Math.min(99, packets.filter(p => p.label === "CRITICAL").length * 7 + 8) },
    { label: "Anomaly",   score: Math.min(99, anomalyRate + 20) },
  ];
  const overallRisk = Math.round(riskScores.reduce((a, c) => a + c.score, 0) / riskScores.length);
  const overallColor = overallRisk > 70 ? "#ef4444" : overallRisk > 40 ? "#f97316" : "#22c55e";

  const displayFeed = activeTab === "feed" ? packets.slice(0, 14) : packets.filter(p => p.label === "CRITICAL").slice(0, 14);
  const flaggedIPs = [...new Map(packets.filter(p => p.label !== "NORMAL").map(p => [p.src, p] as [string, Packet])).values()].slice(0, 8);

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", fontFamily: "Share Tech Mono", color: "rgba(200,220,255,0.85)", backgroundImage: "radial-gradient(ellipse at 15% 50%, rgba(59,130,246,0.03) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(37,99,235,0.045) 0%, transparent 50%)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.28);}
        .panel{background:rgba(255,255,255,0.02);border:1px solid rgba(59,130,246,0.09);border-radius:2px;transition:border-color .3s;}
        .panel:hover{border-color:rgba(59,130,246,0.2);}
        .ph{padding:10px 15px;border-bottom:1px solid rgba(59,130,246,0.07);display:flex;align-items:center;justify-content:space-between;}
        .row:hover{background:rgba(59,130,246,0.05)!important;cursor:pointer;}
        .ab:hover{filter:brightness(1.25);}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes ping{75%,100%{transform:scale(2.2);opacity:0}}
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanline{0%{top:-2px}100%{top:100%}}
        .fr{animation:fadeUp .25s ease;}
      `}</style>

      {/* Scanline */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.09),transparent)", animation: "scanline 10s linear infinite" }} />
      </div>

      {/* NAV */}
      <nav style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", borderBottom: "1px solid rgba(59,130,246,0.09)", background: "rgba(8,12,20,0.96)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="24" height="24" viewBox="0 0 28 28">
            <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#3b82f6" strokeWidth="1.5" style={{ filter: "drop-shadow(0 0 4px #3b82f6)" }} />
            <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.35)" strokeWidth="1" />
            <circle cx="14" cy="14" r="3" fill="#3b82f6" style={{ filter: "drop-shadow(0 0 5px #3b82f6)" }} />
          </svg>
          <span style={{ fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 16, color: "#fff", letterSpacing: "0.22em" }}>REBEL</span>
          <div style={{ width: 1, height: 18, background: "rgba(59,130,246,0.18)" }} />
          <span style={{ fontSize: 8, color: "rgba(200,220,255,0.27)", letterSpacing: "0.14em" }}>THREAT INTELLIGENCE PLATFORM</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.16)", borderRadius: 2, padding: "4px 10px" }}>
            <Pulse color="#22c55e" />
            <span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", color: "#22c55e", letterSpacing: "0.13em" }}>LIVE · {API.replace("https://", "")}</span>
          </div>
          <button className="ab" onClick={() => setScanOpen(true)} style={{ ...S.btn, padding: "6px 13px" }}>⬡ SCAN TARGET</button>
          <button className="ab" onClick={() => setChatOpen(o => !o)} style={{ ...S.btn, padding: "6px 13px", background: chatOpen ? "rgba(59,130,246,0.16)" : "rgba(59,130,246,0.06)", boxShadow: chatOpen ? "0 0 14px rgba(59,130,246,0.22)" : "none" }}>⬡ QUERY REBEL</button>
        </div>
      </nav>

      {/* CONTENT */}
      <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14, marginRight: chatOpen ? 400 : 0, transition: "margin-right 0.3s ease" }}>

        {/* METRICS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 9 }}>
          {[
            { label: "PACKETS SEEN",  value: stats.total.toLocaleString(), sub: "This session",          color: "#3b82f6", icon: "◈" },
            { label: "ANOMALIES",     value: stats.anomalies,              sub: `${anomalyRate}% rate`,  color: "#f97316", icon: "⚠" },
            { label: "CRITICAL",      value: stats.critical,               sub: "Immediate risk",        color: "#ef4444", icon: "☢" },
            { label: "AUTO-BLOCKED",  value: stats.blocked,                sub: "By REBEL firewall",     color: "#ef4444", icon: "⛔" },
            { label: "OVERALL RISK",  value: overallRisk,                  sub: overallRisk > 70 ? "ELEVATED" : overallRisk > 40 ? "MODERATE" : "LOW", color: overallColor, icon: "◉" },
          ].map((m, i) => (
            <div key={i} className="panel" style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ ...S.label, fontSize: 7.5 }}>{m.label}</span>
                <span style={{ fontSize: 12, color: m.color, opacity: 0.65 }}>{m.icon}</span>
              </div>
              <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 30, fontWeight: 700, color: m.color, lineHeight: 1, marginBottom: 3, textShadow: `0 0 16px ${m.color}44` }}>{m.value}</div>
              <div style={{ fontSize: 8.5, color: "rgba(200,220,255,0.25)", letterSpacing: "0.08em" }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* TRAFFIC + RISK */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12 }}>
          <div className="panel">
            <div className="ph">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Pulse color="#3b82f6" /><span style={S.label}>LIVE TRAFFIC — ANOMALY DETECTION</span></div>
              <div style={{ display: "flex", gap: 12 }}>
                {[["NORMAL", "#3b82f6"], ["ANOMALY", "#ef4444"]].map(([l, c]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 18, height: 2, background: c, boxShadow: `0 0 4px ${c}` }} />
                    <span style={{ fontSize: 7.5, color: "rgba(200,220,255,0.3)", letterSpacing: "0.12em" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "12px 4px 4px" }}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trafficHistory}>
                  <defs>
                    <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.14} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                  </defs>
                  <XAxis dataKey="t" hide />
                  <YAxis tick={{ fontSize: 8, fill: "rgba(200,220,255,0.22)", fontFamily: "Share Tech Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid rgba(59,130,246,0.22)", borderRadius: 2, fontFamily: "Share Tech Mono", fontSize: 10 }} itemStyle={{ color: "rgba(200,220,255,0.75)" }} />
                  <Area type="monotone" dataKey="normal" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gN)" dot={false} isAnimationActive={false} />
                  <Area type="monotone" dataKey="anomaly" stroke="#ef4444" strokeWidth={1.5} fill="url(#gA)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <div className="ph">
              <span style={S.label}>RISK SURFACE</span>
              <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 22, color: overallColor, textShadow: `0 0 16px ${overallColor}` }}>{overallRisk}</span>
            </div>
            <div style={{ padding: "14px 8px", display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
              {riskScores.map(c => <RiskArc key={c.label} score={c.score} label={c.label} />)}
            </div>
          </div>
        </div>

        {/* FEED + RIGHT COL */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 12 }}>
          <div className="panel">
            <div className="ph">
              <div style={{ display: "flex" }}>
                {[["feed", "LIVE FEED"], ["critical", "CRITICAL ONLY"]].map(([id, label]) => (
                  <button key={id} onClick={() => setActiveTab(id)} style={{ ...S.tabBtn, color: activeTab === id ? "#3b82f6" : "rgba(200,220,255,0.28)", borderBottom: activeTab === id ? "2px solid #3b82f6" : "2px solid transparent" }}>{label}</button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Pulse color="#ef4444" /><span style={{ fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: "rgba(200,220,255,0.28)", letterSpacing: "0.1em" }}>POLLING · 2s</span></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "72px 86px 118px 68px 62px 1fr 80px", padding: "6px 13px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
              {["ID", "TIME", "SRC IP", "DST PORT", "SIZE", "RISK", "STATUS"].map(h => (
                <span key={h} style={{ fontSize: 7, color: "rgba(200,220,255,0.26)", letterSpacing: "0.14em", fontFamily: "'Orbitron',monospace" }}>{h}</span>
              ))}
            </div>
            <div style={{ maxHeight: 268, overflowY: "auto" }}>
              {displayFeed.map((p, i) => (
                <div key={p.id} className="row fr" onClick={() => setEnrichTarget(p.src)} style={{ display: "grid", gridTemplateColumns: "72px 86px 118px 68px 62px 1fr 80px", padding: "8px 13px", borderBottom: "1px solid rgba(59,130,246,0.035)", background: i === 0 && p.label === "CRITICAL" ? "rgba(239,68,68,0.035)" : "transparent", alignItems: "center" }}>
                  <span style={{ color: "#3b82f6", fontSize: 10 }}>{p.id}</span>
                  <span style={{ color: "rgba(200,220,255,0.35)", fontSize: 10 }}>{p.time}</span>
                  <span style={{ color: "rgba(200,220,255,0.7)", fontSize: 10 }}>{p.src}</span>
                  <span style={{ color: "rgba(200,220,255,0.45)", fontSize: 10 }}>:{p.dst_port}</span>
                  <span style={{ color: "rgba(200,220,255,0.38)", fontSize: 10 }}>{p.size}B</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 30, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${p.risk * 100}%`, height: "100%", background: p.color, transition: "width .4s" }} />
                    </div>
                    <span style={{ fontSize: 9, color: p.color }}>{(p.risk * 100).toFixed(0)}%</span>
                  </div>
                  <span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", color: p.color, letterSpacing: "0.08em" }}>{p.label}</span>
                </div>
              ))}
              {displayFeed.length === 0 && <div style={{ padding: 18, textAlign: "center", fontSize: 10, color: "rgba(200,220,255,0.18)" }}>Awaiting packets from {API}...</div>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="panel" style={{ flex: 1 }}>
              <div className="ph">
                <span style={S.label}>FLAGGED SOURCES</span>
                <button className="ab" onClick={() => setEnrichTarget("")} style={{ ...S.btn, fontSize: 8, padding: "3px 9px" }}>+ ENRICH IP</button>
              </div>
              <div style={{ maxHeight: 180, overflowY: "auto" }}>
                {flaggedIPs.length === 0 && <div style={{ padding: 14, fontSize: 10, color: "rgba(200,220,255,0.18)" }}>No flagged sources yet...</div>}
                {flaggedIPs.map(p => (
                  <div key={p.src} className="row" onClick={() => setEnrichTarget(p.src)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 13px", borderBottom: "1px solid rgba(59,130,246,0.04)" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: p.color, boxShadow: `0 0 4px ${p.color}`, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11, color: "rgba(200,220,255,0.68)" }}>{p.src}</span>
                    <span style={{ fontSize: 9, color: "rgba(200,220,255,0.28)" }}>{p.country}</span>
                    <span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", color: p.color }}>{p.label}</span>
                    <span style={{ fontSize: 9, color: "rgba(200,220,255,0.2)" }}>→</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="ph"><span style={S.label}>BACKEND SERVICES</span></div>
              <div style={{ padding: "9px 13px", display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  { name: "/chat",            ok: true },
                  { name: "/latest_packet",   ok: packets.length > 0 },
                  { name: "/enrich_ip",       ok: true },
                  { name: "/scan-url",        ok: true },
                  { name: "/scan-crypto",     ok: true },
                  { name: "/block_ip",        ok: true },
                  { name: "/predict_anomaly", ok: true },
                ].map(s => (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.ok ? "#22c55e" : "#ef4444", boxShadow: `0 0 4px ${s.ok ? "#22c55e" : "#ef4444"}`, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 10, color: "rgba(200,220,255,0.5)", fontFamily: "Share Tech Mono" }}>{s.name}</span>
                    <span style={{ fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: s.ok ? "#22c55e" : "#ef4444", letterSpacing: "0.1em" }}>{s.ok ? "ONLINE" : "DEGRADED"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: "1px solid rgba(59,130,246,0.06)" }}>
          <span style={{ fontSize: 7.5, color: "rgba(200,220,255,0.16)", letterSpacing: "0.13em" }}>REBEL SECURITY INTELLIGENCE PLATFORM — RESTRICTED ACCESS</span>
          <span style={{ fontSize: 7.5, color: "rgba(200,220,255,0.16)", letterSpacing: "0.13em" }}>{API}</span>
        </div>
      </div>

      {scanOpen && <ScanModal onClose={() => setScanOpen(false)} />}
      {enrichTarget !== null && <IPEnrichModal ip={enrichTarget} onClose={() => setEnrichTarget(null)} />}
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
    </div>
  );
}