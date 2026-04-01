import React, { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import { useThemeContext } from '../context/ThemeContext.js'

const API = "https://r3bel-production.up.railway.app";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface ScanResult {
  score?: number; level?: string; domain?: string; url?: string;
  tls_info?: { tls_version?: string; key_type?: string; key_size?: number; issuer?: string; post_quantum?: boolean; is_self_signed?: boolean; };
  vulnerabilities?: { missing_headers?: string[]; open_redirect_risk?: boolean; suspicious_url_patterns?: string[]; };
  reasons?: string[]; explanation?: string; error?: string;
}
interface EnrichResult {
  label?: string; action?: string; confidence?: string; detected?: string;
  base_anomaly?: number; financialRisk?: string;
  intel?: { country?: string; asn?: string; org?: string; malicious?: number; suspicious?: number; reputation?: number; };
  error?: string;
}
interface Packet {
  id: string; time: string; src: string; dst_port: number; size: number;
  risk: number; label: string; color: string; country: string; org: string;
}
interface TrafficPoint { t: number; normal: number; anomaly: number; }
interface Stats { total: number; anomalies: number; blocked: number; critical: number; }

// ─── LIGHT THEME COLORS ──────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#dc2626", HIGH: "#ea580c", MEDIUM: "#ca8a04", LOW: "#0891b2", NORMAL: "#16a34a",
};

// Light palette tokens
const L = {
  pageBg:       "#f1f5f9",
  pageGrad:     "radial-gradient(ellipse at 20% 40%, rgba(14,165,233,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(99,102,241,0.05) 0%, transparent 50%)",
  navBg:        "rgba(255,255,255,0.95)",
  navBorder:    "rgba(14,165,233,0.18)",
  panelBg:      "#ffffff",
  panelBorder:  "rgba(14,165,233,0.15)",
  panelShadow:  "0 1px 4px rgba(14,165,233,0.08), 0 4px 16px rgba(0,0,0,0.04)",
  accent:       "#0ea5e9",   // sky-500
  accentDark:   "#0284c7",   // sky-600
  accentDim:    "rgba(14,165,233,0.12)",
  accentBorder: "rgba(14,165,233,0.28)",
  text:         "#050d1a",   // near-black
  textSec:      "#1e293b",   // slate-800 — was 700
  textDim:      "#334155",   // slate-700 — was 500
  textMuted:    "#475569",   // slate-600 — was 400
  textFaint:    "#64748b",   // slate-500 — was 300
  rowHover:     "rgba(14,165,233,0.04)",
  divider:      "rgba(14,165,233,0.12)",
  inputBg:      "#f8fafc",
  inputBorder:  "rgba(14,165,233,0.25)",
  danger:       "#dc2626",
  warning:      "#ea580c",
  success:      "#16a34a",
  successDim:   "rgba(22,163,74,0.1)",
};

function useInterval(fn: () => void, ms: number) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; }, [fn]);
  useEffect(() => { const id = setInterval(() => ref.current(), ms); return () => clearInterval(id); }, [ms]);
}

function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
function Pulse({ color = "#0ea5e9" }: { color?: string }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.4, animation: "ping 1.4s ease infinite" }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "block", boxShadow: `0 0 5px ${color}88` }} />
    </span>
  );
}

function RiskArc({ score, label }: { score: number; label: string }) {
  const r = 36, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
  const color = score > 80 ? L.danger : score > 60 ? L.warning : score > 40 ? "#ca8a04" : L.accent;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <svg width="72" height="72" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke={`${color}18`} strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 1s ease", filter: `drop-shadow(0 0 4px ${color}66)` }} />
        <text x="50" y="54" textAnchor="middle" fill={color} fontSize="16" fontFamily="Orbitron" fontWeight="700">{score}</text>
      </svg>
      <span style={{ fontSize: 8, color: "#334155", letterSpacing: "0.08em", fontFamily: "Share Tech Mono", textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ─── CODE BLOCK ───────────────────────────────────────────────────────────────
function CodeBlock({ lang, content }: { lang: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ background: "#f8fafc", border: `1px solid ${L.accentBorder}`, borderRadius: 6, margin: "6px 0", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 10px", background: L.accentDim, borderBottom: `1px solid ${L.accentBorder}` }}>
        <span style={{ fontSize: 9, color: L.accent, fontFamily: "'Orbitron',monospace", letterSpacing: "0.1em" }}>{lang.toUpperCase()}</span>
        <button onClick={copy} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, color: copied ? L.success : L.textDim, fontFamily: "Share Tech Mono", letterSpacing: "0.1em" }}>
          {copied ? "✓ COPIED" : "COPY"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "10px 12px", fontFamily: "Share Tech Mono", fontSize: 11, color: L.textSec, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre" }}>
        {content}
      </pre>
    </div>
  );
}

function normalizeCodeFences(text: string): string {
  let normalized = text.replace(/\r\n/g, "\n").replace(/ {0,}```/g, "\n```").replace(/```([^\s`]+) /g, "```$1\n");
  const fences = normalized.match(/```/g) || [];
  if (fences.length % 2 !== 0) normalized += "\n```";
  return normalized;
}

function parseMessage(text: string): { type: string; content: string; lang?: string }[] {
  const parts: { type: string; content: string; lang?: string }[] = [];
  const normalized = normalizeCodeFences(text);
  const codeBlockRegex = /```([^\s`]+)?\s*\n([\s\S]*?)```/g;
  let last = 0, match: RegExpExecArray | null;
  while ((match = codeBlockRegex.exec(normalized)) !== null) {
    if (match.index > last) parts.push({ type: "text", content: normalized.slice(last, match.index) });
    parts.push({ type: "code", lang: match[1] || "code", content: match[2].trim() });
    last = match.index + match[0].length;
  }
  if (last < normalized.length) parts.push({ type: "text", content: normalized.slice(last) });
  return parts;
}

function MessageContent({ text, fontSize = 12 }: { text: string; fontSize?: number }) {
  const parts = parseMessage(text);
  return (
    <div>
      {parts.map((part, i) =>
        part.type === "code" ? (
          <CodeBlock key={i} lang={part.lang!} content={part.content} />
        ) : (
          <p key={i} style={{ margin: 0, fontFamily: "Share Tech Mono", fontSize, color: L.textSec, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {part.content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((s: string, j: number) => {
              if (s.startsWith("**") && s.endsWith("**"))
                return <strong key={j} style={{ color: L.text, fontWeight: 700 }}>{s.slice(2, -2)}</strong>;
              if (s.startsWith("`") && s.endsWith("`"))
                return <code key={j} style={{ background: L.accentDim, border: `1px solid ${L.accentBorder}`, borderRadius: 3, padding: "1px 5px", fontFamily: "Share Tech Mono", fontSize: fontSize - 1, color: L.accentDark }}>{s.slice(1, -1)}</code>;
              return s;
            })}
          </p>
        )
      )}
    </div>
  );
}

// ─── SCAN MODAL ───────────────────────────────────────────────────────────────
function ScanModal({ onClose }: { onClose: () => void }) {
  const inputSt = {
    background: L.inputBg, border: `1px solid ${L.inputBorder}`, borderRadius: 6,
    padding: "8px 12px", color: L.text, fontFamily: "Share Tech Mono", fontSize: 12, outline: "none",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
  };
  const btnSt = {
    background: L.accent, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer",
    padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em",
    whiteSpace: "nowrap" as const, transition: "all 0.2s", boxShadow: `0 2px 8px ${L.accent}44`,
  };
  const labelSt = { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: L.textDim };
  const ghostSt = { background: "none", border: "none", color: L.textMuted, cursor: "pointer", fontSize: 16, padding: 4 };

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [tab, setTab] = useState("url");
  const mobile = useMobile();
  const navigate = useNavigate();

  const runScan = async () => {
    if (!url.trim()) return;
    const token = localStorage.getItem("access");
    if (!token) { navigate("/#/login"); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}${tab === "url" ? "/scan-url" : "/scan-crypto"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ url: url.trim() }),
      });
      setResult(await res.json());
    } catch (e) { setResult({ error: e instanceof Error ? e.message : "Unknown error" }); }
    setLoading(false);
  };

  const sc = (s: number) => s >= 70 ? L.success : s >= 40 ? "#ca8a04" : L.danger;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 300, display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
      <div style={{ width: mobile ? "100%" : 560, maxHeight: mobile ? "92vh" : "90vh", background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: mobile ? "16px 16px 0 0" : 12, boxShadow: "0 24px 80px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${L.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Pulse color={L.accent} /><span style={labelSt}>ACTIVE SCAN</span></div>
          <button onClick={onClose} style={ghostSt}>✕</button>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${L.divider}` }}>
            {[["url", "URL SCAN"], ["crypto", "CRYPTO / TLS"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.14em", padding: "8px 13px", transition: "all 0.2s", color: tab === id ? L.accent : L.textMuted, borderBottom: tab === id ? `2px solid ${L.accent}` : "2px solid transparent", flex: 1 }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && runScan()} placeholder="https://target.com" style={{ ...inputSt, flex: 1, fontSize: 14 }} />
            <button onClick={runScan} disabled={loading} style={{ ...btnSt, padding: "10px 16px" }}>{loading ? "..." : "SCAN"}</button>
          </div>
          {loading && <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={{ width: 13, height: 13, border: `2px solid ${L.accentDim}`, borderTop: `2px solid ${L.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /><span style={{ fontSize: 11, color: L.textDim, fontFamily: "Share Tech Mono" }}>Probing target...</span></div>}
          {result && !result.error && (
            <div style={{ background: L.inputBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {result.score !== undefined && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 42, color: sc(result.score), textShadow: `0 2px 12px ${sc(result.score)}44` }}>{result.score}</div>
                  <div>
                    <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 11, color: sc(result.score), letterSpacing: "0.15em" }}>{result.level?.toUpperCase() || "RISK"}</div>
                    <div style={{ fontSize: 11, color: L.textDim, marginTop: 2 }}>{result.domain || result.url}</div>
                  </div>
                </div>
              )}
              {result.tls_info?.tls_version && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {([["TLS Version", result.tls_info.tls_version], ["Key Type", result.tls_info.key_type], ["Key Size", (result.tls_info.key_size ?? "?") + " bits"], ["Issuer", result.tls_info.issuer], ["Post-Quantum", result.tls_info.post_quantum ? "YES ✓" : "NO"], ["Self-Signed", result.tls_info.is_self_signed ? "YES ⚠" : "NO"]] as [string, string | number | undefined][]).map(([k, v]) => (
                    <div key={k} style={{ background: "#fff", border: `1px solid ${L.divider}`, padding: "6px 10px", borderRadius: 6 }}>
                      <div style={{ fontSize: 8, color: L.textMuted, letterSpacing: "0.1em", marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 12, color: L.text }}>{v ?? "N/A"}</div>
                    </div>
                  ))}
                </div>
              )}
              {result.vulnerabilities && (
                <div>
                  <div style={{ fontSize: 9, color: L.textDim, letterSpacing: "0.15em", marginBottom: 6 }}>VULNERABILITIES</div>
                  {result.vulnerabilities.missing_headers?.map((h: string) => <div key={h} style={{ fontSize: 12, color: L.warning, padding: "2px 0" }}>⚠ {h}</div>)}
                  {result.vulnerabilities.open_redirect_risk && <div style={{ fontSize: 12, color: L.danger }}>⚠ Open Redirect Risk</div>}
                  {result.vulnerabilities.suspicious_url_patterns?.map((p: string) => <div key={p} style={{ fontSize: 12, color: "#ca8a04" }}>⚠ {p}</div>)}
                </div>
              )}
              {result.reasons?.map((r: string) => <div key={r} style={{ fontSize: 12, color: L.warning }}>⚠ {r}</div>)}
              {result.explanation && <div style={{ fontSize: 12, color: L.textDim, lineHeight: 1.7, borderTop: `1px solid ${L.divider}`, paddingTop: 10, fontFamily: "Share Tech Mono" }}>{result.explanation}</div>}
            </div>
          )}
          {result?.error && <div style={{ fontSize: 12, color: L.danger, fontFamily: "Share Tech Mono" }}>ERROR: {result.error}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── WORLD MAP CARD ───────────────────────────────────────────────────────────
function WorldMapCard({ packets }: { packets: Packet[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mobile = useMobile();

  const countryCoords: Record<string, [number, number]> = {
    US: [37.09, -95.71], CN: [35.86, 104.19], RU: [61.52, 105.31], DE: [51.16, 10.45],
    GB: [55.37, -3.43], FR: [46.22, 2.21], IN: [20.59, 78.96], BR: [-14.23, -51.92],
    JP: [36.20, 138.25], KR: [35.90, 127.76], AU: [-25.27, 133.77], CA: [56.13, -106.34],
    NL: [52.13, 5.29], SG: [1.35, 103.82], ZA: [-30.55, 22.93], NG: [9.08, 8.67],
    MX: [23.63, -102.55], IT: [41.87, 12.56], ES: [40.46, -3.74], SE: [60.12, 18.64],
    UA: [48.37, 31.16], IR: [32.42, 53.68], KP: [40.33, 127.51], TR: [38.96, 35.24],
    "??": [20, 0],
  };

  const project = (lat: number, lng: number, W: number, H: number) => ({ x: ((lng + 180) / 360) * W, y: ((90 - lat) / 180) * H });
  const jitter = (id: string, range: number) => { let h = 0; for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0; return ((h & 0xffff) / 0xffff - 0.5) * range; };

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/World_map_-_low_resolution.svg/1280px-World_map_-_low_resolution.svg.png";
    img.onload = () => { imgRef.current = img; setMapLoaded(true); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Light background
    ctx.fillStyle = "#eef4fb";
    ctx.fillRect(0, 0, W, H);

    if (imgRef.current) { ctx.globalAlpha = 0.18; ctx.drawImage(imgRef.current, 0, 0, W, H); ctx.globalAlpha = 1; }

    // Grid lines
    ctx.strokeStyle = "rgba(14,165,233,0.1)"; ctx.lineWidth = 0.5;
    for (let lat = -90; lat <= 90; lat += 30) { const { y } = project(lat, 0, W, H); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let lng = -180; lng <= 180; lng += 30) { const { x } = project(0, lng, W, H); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

    const attackers = packets.filter(p => p.label !== "NORMAL").slice(0, 25);
    const TARGET: [number, number] = [37.09, -95.71];
    const tgt = project(TARGET[0], TARGET[1], W, H);

    // Arc lines
    attackers.forEach(p => {
      const coords = countryCoords[p.country] ?? countryCoords["??"];
      const src = project(coords[0] + jitter(p.id + "lat", 3), coords[1] + jitter(p.id + "lng", 3), W, H);
      ctx.beginPath(); ctx.moveTo(src.x, src.y);
      const cpx = (src.x + tgt.x) / 2, cpy = Math.min(src.y, tgt.y) - Math.abs(src.x - tgt.x) * 0.22 - 15;
      ctx.quadraticCurveTo(cpx, cpy, tgt.x, tgt.y); ctx.strokeStyle = p.color + "66"; ctx.lineWidth = 1; ctx.stroke();
    });

    // Source dots
    attackers.forEach(p => {
      const coords = countryCoords[p.country] ?? countryCoords["??"];
      const src = project(coords[0] + jitter(p.id + "lat", 3), coords[1] + jitter(p.id + "lng", 3), W, H);
      ctx.beginPath(); ctx.arc(src.x, src.y, 3.5, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#334155"; ctx.font = `${mobile ? 7 : 8}px Share Tech Mono`; ctx.fillText(p.country, src.x + 5, src.y - 3);
    });

    // Target rings
    [14, 9].forEach((r, i) => { ctx.beginPath(); ctx.arc(tgt.x, tgt.y, r, 0, Math.PI * 2); ctx.strokeStyle = `rgba(22,163,74,${i === 0 ? 0.18 : 0.45})`; ctx.lineWidth = 1.5; ctx.stroke(); });
    ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 4, 0, Math.PI * 2); ctx.fillStyle = L.success; ctx.shadowColor = L.success; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = L.success; ctx.font = "8px Share Tech Mono"; ctx.fillText("TARGET", tgt.x + 8, tgt.y + 3);
  }, [packets, mapLoaded, mobile]);

  const attackerCount = packets.filter(p => p.label !== "NORMAL").slice(0, 25).length;

  return (
    <div className="panel">
      <div className="ph">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Pulse color={L.danger} />
          <span className="s-label">GLOBAL THREAT MAP</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {[["ATTACKER", L.danger], ["TARGET", L.success]].map(([lbl, c]) => (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: `0 0 4px ${c}88` }} />
              <span style={{ fontSize: 7.5, color: L.textDim, letterSpacing: "0.12em", fontFamily: "'Orbitron',monospace" }}>{lbl}</span>
            </div>
          ))}
          <span style={{ fontSize: 7.5, color: L.textMuted, fontFamily: "Share Tech Mono" }}>{attackerCount} ACTIVE SOURCES</span>
        </div>
      </div>
      <div style={{ position: "relative", background: "#eef4fb" }}>
        <canvas ref={canvasRef} width={800} height={mobile ? 200 : 360} style={{ width: "100%", height: mobile ? 200 : 360, display: "block" }} />
        {!mapLoaded && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: L.textMuted, fontFamily: "Share Tech Mono" }}>LOADING MAP...</div>}
        {mapLoaded && attackerCount === 0 && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: L.textMuted, fontFamily: "Share Tech Mono", letterSpacing: "0.1em" }}>AWAITING THREAT DATA...</div>}
      </div>
    </div>
  );
}

// ─── IP ENRICH MODAL ──────────────────────────────────────────────────────────
function IPEnrichModal({ ip: initIp, onClose }: { ip: string; onClose: () => void }) {
  const inputSt = {
    background: L.inputBg, border: `1px solid ${L.inputBorder}`, borderRadius: 6,
    padding: "8px 12px", color: L.text, fontFamily: "Share Tech Mono", fontSize: 12, outline: "none",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
  };
  const btnSt = {
    background: L.accent, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer",
    padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em",
    whiteSpace: "nowrap" as const, transition: "all 0.2s", boxShadow: `0 2px 8px ${L.accent}44`,
  };
  const labelSt = { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: L.textDim };
  const ghostSt = { background: "none", border: "none", color: L.textMuted, cursor: "pointer", fontSize: 16, padding: 4 };

  const [ip, setIp] = useState(initIp || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [blocked, setBlocked] = useState(false);
  const mobile = useMobile();

  const run = useCallback(async (val?: string) => {
    const target = val ?? ip; if (!target) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/enrich_ip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip: target }) });
      setResult(await res.json());
    } catch (e) { setResult({ error: e instanceof Error ? e.message : "Unknown error" }); }
    setLoading(false);
  }, [ip]);

  useEffect(() => { if (initIp) run(initIp); }, []);

  const doBlock = async () => {
    await fetch(`${API}/block_ip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip }) });
    setBlocked(true);
  };

  const lc: Record<string, string> = { CRITICAL: L.danger, HIGH: L.warning, LOW: L.success };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 300, display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
      <div style={{ width: mobile ? "100%" : 500, maxHeight: mobile ? "92vh" : "90vh", background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: mobile ? "16px 16px 0 0" : 12, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${L.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Pulse color={L.accent} /><span style={labelSt}>IP INTELLIGENCE</span></div>
          <button onClick={onClose} style={ghostSt}>✕</button>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={ip} onChange={e => setIp(e.target.value)} onKeyDown={e => e.key === "Enter" && run()} placeholder="x.x.x.x" style={{ ...inputSt, flex: 1, fontSize: 14 }} />
            <button onClick={() => run()} disabled={loading} style={{ ...btnSt, padding: "10px 16px" }}>{loading ? "..." : "ENRICH"}</button>
          </div>
          {loading && <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={{ width: 13, height: 13, border: `2px solid ${L.accentDim}`, borderTop: `2px solid ${L.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /><span style={{ fontSize: 11, color: L.textDim, fontFamily: "Share Tech Mono" }}>Querying threat feeds...</span></div>}
          {result && !result.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 26, color: lc[result.label ?? ""] ?? "#ca8a04", textShadow: `0 2px 12px ${lc[result.label ?? ""] ?? "#ca8a04"}44` }}>{result.label}</div>
                <div>
                  <div style={{ fontSize: 12, color: L.textSec }}>{result.action}</div>
                  <div style={{ fontSize: 11, color: L.textDim }}>Confidence: {result.confidence}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {([["Country", result.intel?.country], ["ASN", result.intel?.asn], ["Org", result.intel?.org], ["Anomaly", result.base_anomaly], ["Malicious", result.intel?.malicious], ["Suspicious", result.intel?.suspicious], ["Reputation", result.intel?.reputation], ["Financial Risk", result.financialRisk]] as [string, string | number | undefined][]).map(([k, v]) => (
                  <div key={k} style={{ background: L.inputBg, border: `1px solid ${L.divider}`, padding: "6px 10px", borderRadius: 6 }}>
                    <div style={{ fontSize: 8, color: L.textMuted, letterSpacing: "0.1em", marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 12, color: L.text }}>{v ?? "-"}</div>
                  </div>
                ))}
              </div>
              <button onClick={doBlock} disabled={blocked} style={{ background: blocked ? L.successDim : "rgba(220,38,38,0.08)", border: `1px solid ${blocked ? "rgba(22,163,74,0.4)" : "rgba(220,38,38,0.3)"}`, borderRadius: 6, color: blocked ? L.success : L.danger, cursor: "pointer", padding: "12px 0", width: "100%", fontFamily: "'Orbitron',monospace", fontSize: 11, letterSpacing: "0.1em", transition: "all 0.2s" }}>
                {blocked ? "✓ BLOCKED SUCCESSFULLY" : `⛔ BLOCK ${ip} NOW`}
              </button>
            </div>
          )}
          {result?.error && <div style={{ fontSize: 12, color: L.danger }}>ERROR: {result.error}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── NAV DRAWER ───────────────────────────────────────────────────────────────
function NavDrawer() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const go = (path: string) => { navigate(path); setOpen(false); };

  const NAV = [
    { section: "CORE", items: [{ path: "/", icon: "⬡", label: "Dashboard", sub: "Live threat feed" }] },
    { section: "ASSET & PQC", items: [
      { path: "/inventory", icon: "◈", label: "Asset Inventory", sub: "128 assets tracked" },
      { path: "/discovery", icon: "◎", label: "Asset Discovery", sub: "Domains · SSL · IPs" },
      { path: "/cbom",      icon: "◉", label: "CBOM",            sub: "Crypto bill of mat." },
      { path: "/pqc",       icon: "⬟", label: "Posture of PQC",  sub: "755/1000 Elite" },
    ]},
    { section: "REPORTS", items: [
      { path: "/rating",    icon: "✦", label: "Cyber Rating",  sub: "Tier 1–4 scoring" },
      { path: "/reporting", icon: "▣", label: "Reporting",     sub: "Export & schedule" },
    ]},
  ];

  return (
    <>
      <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 8px", marginRight: 4, display: "flex", flexDirection: "column", gap: 4.5 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ display: "block", width: 16, height: 1.5, borderRadius: 2, background: open ? L.accent : L.textDim, transform: open ? (i === 0 ? "translateY(6px) rotate(45deg)" : i === 2 ? "translateY(-6px) rotate(-45deg)" : "scaleX(0)") : "none", opacity: open && i === 1 ? 0 : 1, transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)" }} />
        ))}
      </button>

      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 198, background: "rgba(15,23,42,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} />}

      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 260, zIndex: 199, background: "#fff", borderRight: `1px solid ${L.panelBorder}`, boxShadow: open ? "16px 0 60px rgba(0,0,0,0.12)" : "none", display: "flex", flexDirection: "column", transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ padding: "16px 16px 14px", borderBottom: `1px solid ${L.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 28 28">
              <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke={L.accent} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 3px ${L.accent}88)` }} />
              <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill={L.accentDim} stroke={L.accentBorder} strokeWidth="1" />
              <circle cx="14" cy="14" r="3" fill={L.accent} style={{ filter: `drop-shadow(0 0 4px ${L.accent})` }} />
            </svg>
            <div>
              <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 14, color: L.text, letterSpacing: ".22em" }}>REBEL</div>
              <div style={{ fontSize: 7, color: L.textMuted, letterSpacing: ".14em", fontFamily: "'Orbitron',monospace", marginTop: 1 }}>THREAT INTELLIGENCE</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: L.accentDim, border: `1px solid ${L.accentBorder}`, borderRadius: 6, color: L.textDim, cursor: "pointer", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✕</button>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
          {NAV.map(section => (
            <div key={section.section} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 7, color: L.textMuted, letterSpacing: ".2em", fontFamily: "'Orbitron',monospace", padding: "10px 8px 5px" }}>{section.section}</div>
              {section.items.map(item => (
                <button key={item.path} onClick={() => go(item.path)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", background: "none", border: "1px solid transparent", borderRadius: 6, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                  onMouseEnter={e => { const b = e.currentTarget; b.style.background = L.accentDim; b.style.borderColor = L.accentBorder; }}
                  onMouseLeave={e => { const b = e.currentTarget; b.style.background = "none"; b.style.borderColor = "transparent"; }}>
                  <div style={{ width: 32, height: 32, flexShrink: 0, background: L.accentDim, border: `1px solid ${L.accentBorder}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',monospace", fontSize: 13, color: L.accent }}>{item.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: L.textSec, lineHeight: 1 }}>{item.label}</div>
                    <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: L.textMuted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</div>
                  </div>
                  <span style={{ fontSize: 10, color: L.accentBorder, flexShrink: 0 }}>›</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: "12px 16px", borderTop: `1px solid ${L.divider}`, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Pulse color={L.success} />
            <span style={{ fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: L.success, letterSpacing: ".12em" }}>LIVE · CONNECTED</span>
          </div>
          <div style={{ fontSize: 7.5, color: L.textMuted, fontFamily: "'Share Tech Mono',monospace" }}>r3bel-production.up.railway.app</div>
        </div>
      </div>
    </>
  );
}

// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
function ChatPanel({ onClose }: { onClose: () => void }) {
  const inputSt = {
    background: L.inputBg, border: `1px solid ${L.inputBorder}`, borderRadius: 6,
    padding: "8px 12px", color: L.text, fontFamily: "Share Tech Mono", fontSize: 12, outline: "none",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
  };
  const btnSt = {
    background: L.accent, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer",
    padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em",
    whiteSpace: "nowrap" as const, transition: "all 0.2s", boxShadow: `0 2px 8px ${L.accent}44`,
  };

  const [msgs, setMsgs] = useState<{ role: string; text: string }[]>([{ role: "assistant", text: "REBEL ONLINE. Threat intelligence core active. Query the system." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mobile = useMobile();
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput(""); setLoading(true);
    setMsgs(m => [...m, { role: "user", text: msg }]);
    try {
      const res = await fetch(`${API}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg }) });
      const data = await res.json();
      setMsgs(m => [...m, { role: "assistant", text: data.response || JSON.stringify(data) }]);
    } catch (e) { setMsgs(m => [...m, { role: "assistant", text: `[ERROR] ${e instanceof Error ? e.message : "Unknown"}` }]); }
    setLoading(false);
  };

  const chatBg = "#f8fafc";

  if (mobile) {
    return (
      <div style={{ position: "fixed", inset: 0, background: chatBg, zIndex: 200, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${L.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "max(14px, env(safe-area-inset-top))", background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Pulse color={L.accent} /><span style={{ fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: L.textDim }}>REBEL CHAT</span></div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: L.textMuted, cursor: "pointer", fontSize: 22, padding: 8 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", background: m.role === "user" ? L.accentDim : "#fff", border: `1px solid ${m.role === "user" ? L.accentBorder : L.divider}`, borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "2px 14px 14px 14px", padding: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {m.role === "assistant" && <div style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", color: L.accent, letterSpacing: "0.2em", marginBottom: 5 }}>REBEL</div>}
              <MessageContent text={m.text} fontSize={14} />
            </div>
          ))}
          {loading && <div style={{ display: "flex", gap: 5, padding: "10px 14px" }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: L.accent, animation: `bounce 1s ease infinite ${i * 0.15}s` }} />)}</div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "12px 14px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", borderTop: `1px solid ${L.divider}`, display: "flex", gap: 10, background: "#fff" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Query REBEL..." style={{ ...inputSt, flex: 1, fontSize: 16, padding: "12px 14px" }} />
          <button onClick={send} disabled={loading} style={{ ...btnSt, padding: "12px 18px", fontSize: 10 }}>SEND</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 400, background: chatBg, borderLeft: `1px solid ${L.panelBorder}`, display: "flex", flexDirection: "column", zIndex: 200, animation: "slideIn 0.28s ease", boxShadow: "-8px 0 40px rgba(14,165,233,0.08), -1px 0 0 rgba(14,165,233,0.1)" }}>
      <div style={{ padding: "13px 18px", borderBottom: `1px solid ${L.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Pulse color={L.accent} /><span style={{ fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: L.textDim }}>REBEL CHAT</span></div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: L.textMuted, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", background: m.role === "user" ? L.accentDim : "#fff", border: `1px solid ${m.role === "user" ? L.accentBorder : L.divider}`, borderRadius: m.role === "user" ? "10px 10px 2px 10px" : "2px 10px 10px 10px", padding: "8px 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            {m.role === "assistant" && <div style={{ fontSize: 7, fontFamily: "'Orbitron',monospace", color: L.accent, letterSpacing: "0.2em", marginBottom: 4 }}>REBEL</div>}
            <MessageContent text={m.text} fontSize={12} />
          </div>
        ))}
        {loading && <div style={{ display: "flex", gap: 4, padding: "8px 12px" }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: L.accent, animation: `bounce 1s ease infinite ${i * 0.15}s` }} />)}</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "11px 13px", borderTop: `1px solid ${L.divider}`, display: "flex", gap: 8, background: "#fff" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Query REBEL..." style={{ ...inputSt, flex: 1 }} />
        <button onClick={send} disabled={loading} style={btnSt}>SEND</button>
      </div>
    </div>
  );
}

// ─── MOBILE NAV ───────────────────────────────────────────────────────────────
function MobileNav({ onChat, onScan, chatOpen }: { onChat: () => void; onScan: () => void; chatOpen: boolean }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.97)", borderTop: `1px solid ${L.divider}`, display: "flex", zIndex: 150, paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -4px 24px rgba(14,165,233,0.08)" }}>
      {[
        { icon: "⬡", label: "SCAN", action: onScan, active: false },
        { icon: "⬡", label: "CHAT", action: onChat, active: chatOpen },
      ].map(item => (
        <button key={item.label} onClick={item.action} style={{ flex: 1, background: "none", border: "none", padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", borderTop: item.active ? `2px solid ${L.accent}` : "2px solid transparent" }}>
          <span style={{ fontSize: 18, color: item.active ? L.accent : L.textMuted }}>{item.icon}</span>
          <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 8, color: item.active ? L.accent : L.textMuted, letterSpacing: "0.15em" }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export default function RebelDashboard() {
  const S: Record<string, React.CSSProperties> = {
    label:   { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: "#1e3a5f", fontWeight: 600 },
    btn:     { background: L.accent, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em", whiteSpace: "nowrap", transition: "all 0.2s", boxShadow: `0 2px 8px ${L.accent}44` },
    tabBtn:  { background: "none", border: "none", cursor: "pointer", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.14em", padding: "8px 13px", transition: "all 0.2s" },
    spinner: { width: 13, height: 13, border: `2px solid ${L.accentDim}`, borderTop: `2px solid ${L.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  };

  const [chatOpen, setChatOpen]         = useState(false);
  const [scanOpen, setScanOpen]         = useState(false);
  const [enrichTarget, setEnrichTarget] = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState("feed");
  const mobile  = useMobile();
  const navigate = useNavigate();

  const [packets, setPackets]               = useState<Packet[]>([]);
  const [trafficHistory, setTrafficHistory] = useState<TrafficPoint[]>(Array.from({ length: 40 }, (_, i) => ({ t: i, normal: 0, anomaly: 0 })));
  const [stats, setStats]                   = useState<Stats>({ total: 0, anomalies: 0, blocked: 0, critical: 0 });

  const fetchPacket = useCallback(async () => {
    try {
      const res = await fetch(`${API}/latest_packet`);
      const pkt = await res.json();
      if (pkt.error || pkt.detail) return;
      const risk: number = pkt.risk_probability ?? 0;
      const label = risk > 0.6 ? "CRITICAL" : risk > 0.3 ? "HIGH" : "NORMAL";
      const color = SEV_COLOR[label];
      const row: Packet = { id: `P-${Date.now().toString(36).toUpperCase().slice(-6)}`, time: new Date().toISOString().slice(11, 19), src: pkt.ip_src, dst_port: pkt.dst_port, size: pkt.packet_size, risk, label, color, country: pkt.intel?.country ?? "??", org: pkt.intel?.org ?? "" };
      setPackets(prev => [row, ...prev].slice(0, 80));
      setTrafficHistory(prev => { const last = prev[prev.length - 1]; return [...prev.slice(1), { t: last.t + 1, normal: label === "NORMAL" ? pkt.packet_size : 0, anomaly: label !== "NORMAL" ? pkt.packet_size : 0 }]; });
      setStats(prev => ({ total: prev.total + 1, anomalies: prev.anomalies + (label !== "NORMAL" ? 1 : 0), blocked: prev.blocked + (label === "CRITICAL" ? 1 : 0), critical: prev.critical + (label === "CRITICAL" ? 1 : 0) }));
    } catch (_) { }
  }, []);

  useInterval(fetchPacket, 2000);
  useEffect(() => { fetchPacket(); }, []);
  useEffect(() => { if (!localStorage.getItem("access")) navigate("/login"); }, []);

  const anomalyRate  = stats.total > 0 ? Math.round((stats.anomalies / stats.total) * 100) : 0;
  const riskScores   = [
    { label: "Network",   score: Math.min(99, anomalyRate * 2 + 15) },
    { label: "Endpoint",  score: Math.min(99, stats.critical * 6 + 10) },
    { label: "Port 4444", score: Math.min(99, packets.filter(p => p.dst_port === 4444).length * 12 + 5) },
    { label: "Intel",     score: Math.min(99, packets.filter(p => p.label === "CRITICAL").length * 7 + 8) },
    { label: "Anomaly",   score: Math.min(99, anomalyRate + 20) },
  ];
  const overallRisk  = Math.round(riskScores.reduce((a, c) => a + c.score, 0) / riskScores.length);
  const overallColor = overallRisk > 70 ? L.danger : overallRisk > 40 ? L.warning : L.success;
  const displayFeed  = activeTab === "feed" ? packets.slice(0, 14) : packets.filter(p => p.label === "CRITICAL").slice(0, 14);
  const flaggedIPs   = [...new Map(packets.filter(p => p.label !== "NORMAL").map(p => [p.src, p] as [string, Packet])).values()].slice(0, 8);

  return (
    <div style={{ minHeight: "100vh", background: L.pageBg, backgroundImage: L.pageGrad, fontFamily: "Share Tech Mono", color: L.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:rgba(14,165,233,0.2);border-radius:2px;} ::-webkit-scrollbar-track{background:transparent;}
        .panel{
          background:${L.panelBg};
          border:1px solid ${L.panelBorder};
          border-radius:10px;
          box-shadow:${L.panelShadow};
          transition:box-shadow .25s, border-color .25s;
        }
        .panel:hover{border-color:rgba(14,165,233,0.28);box-shadow:0 2px 8px rgba(14,165,233,0.1),0 8px 24px rgba(0,0,0,0.06);}
        .ph{padding:11px 16px;border-bottom:1px solid ${L.divider};display:flex;align-items:center;justify-content:space-between;}
        .s-label{font-family:'Orbitron',monospace;font-size:10px;letter-spacing:0.15em;color:#1e3a5f;font-weight:600;}
        .row:hover{background:${L.rowHover}!important;cursor:pointer;}
        .ab:hover{opacity:0.88;transform:translateY(-1px);}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes ping{75%,100%{transform:scale(2.2);opacity:0}}
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanline{0%{top:-2px}100%{top:100%}}
        .fr{animation:fadeUp .22s ease;}
        input,button{-webkit-tap-highlight-color:transparent;}
      `}</style>

      {/* Scanline — subtle on light */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(14,165,233,0.06),transparent)", animation: "scanline 12s linear infinite" }} />
      </div>

      {/* NAV */}
      <nav style={{ height: mobile ? 48 : 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: mobile ? "0 14px" : "0 24px", paddingTop: mobile ? "env(safe-area-inset-top)" : 0, borderBottom: `1px solid ${L.navBorder}`, background: L.navBg, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 rgba(14,165,233,0.08), 0 2px 16px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 8 : 14 }}>
          <NavDrawer />
          <svg width="22" height="22" viewBox="0 0 28 28">
            <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke={L.accent} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 3px ${L.accent}88)` }} />
            <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill={L.accentDim} stroke={L.accentBorder} strokeWidth="1" />
            <circle cx="14" cy="14" r="3" fill={L.accent} style={{ filter: `drop-shadow(0 0 4px ${L.accent})` }} />
          </svg>
          <span style={{ fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: mobile ? 15 : 17, color: L.text, letterSpacing: "0.22em" }}>REBEL</span>
          {!mobile && (
            <>
              <div style={{ width: 1, height: 18, background: L.divider }} />
              <span style={{ fontSize: 8, color: "#334155", letterSpacing: "0.14em", fontWeight: 600 }}>THREAT INTELLIGENCE PLATFORM</span>
            </>
          )}
        </div>
        {!mobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.22)", borderRadius: 20, padding: "4px 12px" }}>
              <Pulse color={L.success} />
              <span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", color: L.success, letterSpacing: "0.13em" }}>LIVE · {API.replace("https://", "")}</span>
            </div>
            <button className="ab" onClick={() => setScanOpen(true)} style={{ ...S.btn, padding: "7px 14px" }}>⬡ SCAN TARGET</button>
            <button className="ab" onClick={() => setChatOpen(o => !o)} style={{ ...S.btn, padding: "7px 14px", background: chatOpen ? L.accentDark : L.accent, boxShadow: chatOpen ? `0 4px 16px ${L.accent}66` : `0 2px 8px ${L.accent}44` }}>⬡ QUERY REBEL</button>
          </div>
        )}
        {mobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Pulse color={L.success} />
            <span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", color: L.success, letterSpacing: "0.1em" }}>LIVE</span>
          </div>
        )}
      </nav>

      {/* CONTENT */}
      <div style={{ padding: mobile ? "14px 12px 80px" : "18px 24px", display: "flex", flexDirection: "column", gap: mobile ? 12 : 16, marginRight: (!mobile && chatOpen) ? 400 : 0, transition: "margin-right 0.3s ease" }}>

        {/* METRICS */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: mobile ? 8 : 10 }}>
          {[
            { label: "PACKETS",   value: stats.total.toLocaleString(), sub: "This session",        color: L.accent,   icon: "◈", bgTint: "rgba(14,165,233,0.06)" },
            { label: "ANOMALIES", value: stats.anomalies,              sub: `${anomalyRate}% rate`, color: L.warning,  icon: "⚠", bgTint: "rgba(234,88,12,0.05)" },
            { label: "CRITICAL",  value: stats.critical,               sub: "Immediate risk",       color: L.danger,   icon: "☢", bgTint: "rgba(220,38,38,0.05)" },
            { label: "BLOCKED",   value: stats.blocked,                sub: "Auto-blocked",         color: L.danger,   icon: "⛔", bgTint: "rgba(220,38,38,0.05)" },
            { label: "RISK",      value: overallRisk,                  sub: overallRisk > 70 ? "ELEVATED" : overallRisk > 40 ? "MODERATE" : "LOW", color: overallColor, icon: "◉", bgTint: `${overallColor}08` },
          ].map((m, i) => (
            <div key={i} className="panel" style={{ padding: mobile ? "12px 14px" : "14px 16px", background: `linear-gradient(135deg, #fff 0%, ${m.bgTint} 100%)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ ...S.label as React.CSSProperties, fontSize: mobile ? 7 : 8, color: "#1e3a5f", fontWeight: 700, letterSpacing: "0.12em" }}>{m.label}</span>
                <span style={{ fontSize: mobile ? 11 : 13, color: m.color, opacity: 0.7 }}>{m.icon}</span>
              </div>
              <div style={{ fontFamily: "'Orbitron',monospace", fontSize: mobile ? 26 : 32, fontWeight: 700, color: m.color, lineHeight: 1, marginBottom: 4 }}>{m.value}</div>
              <div style={{ fontSize: 8, color: "#475569", letterSpacing: "0.06em", fontWeight: 500 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* TRAFFIC CHART */}
        <div className="panel">
          <div className="ph">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Pulse color={L.accent} /><span style={{ ...S.label as React.CSSProperties, fontSize: mobile ? 8 : 10 }}>LIVE TRAFFIC — ANOMALY DETECTION</span></div>
            {!mobile && <div style={{ display: "flex", gap: 14 }}>
              {[["NORMAL", L.accent], ["ANOMALY", L.danger]].map(([lbl, c]) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 18, height: 2, background: c, borderRadius: 1, boxShadow: `0 0 4px ${c}66` }} />
                  <span style={{ fontSize: 8, color: "#334155", letterSpacing: "0.12em", fontWeight: 600 }}>{lbl}</span>
                </div>
              ))}
            </div>}
          </div>
          <div style={{ padding: "12px 4px 4px", background: "linear-gradient(180deg,rgba(14,165,233,0.02) 0%,transparent 100%)" }}>
            <ResponsiveContainer width="100%" height={mobile ? 120 : 160}>
              <AreaChart data={trafficHistory}>
                <defs>
                  <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={L.accent} stopOpacity={0.15} /><stop offset="95%" stopColor={L.accent} stopOpacity={0} /></linearGradient>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={L.danger} stopOpacity={0.15} /><stop offset="95%" stopColor={L.danger} stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis tick={{ fontSize: 8, fill: L.textMuted, fontFamily: "Share Tech Mono" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${L.panelBorder}`, borderRadius: 8, fontFamily: "Share Tech Mono", fontSize: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} itemStyle={{ color: L.textSec }} />
                <Area type="monotone" dataKey="normal" stroke={L.accent} strokeWidth={1.5} fill="url(#gN)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="anomaly" stroke={L.danger} strokeWidth={1.5} fill="url(#gA)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RISK ARCS */}
        <div className="panel">
          <div className="ph">
            <span style={S.label as React.CSSProperties}>RISK SURFACE</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 22, color: overallColor }}>{overallRisk}</span>
              <span style={{ fontSize: 9, color: "#334155", fontFamily: "Share Tech Mono", fontWeight: 600 }}>/ 100</span>
            </div>
          </div>
          <div style={{ padding: "14px 8px", display: "flex", gap: mobile ? 6 : 5, justifyContent: mobile ? "space-around" : "center", overflowX: mobile ? "auto" : "visible", flexWrap: mobile ? "nowrap" : "wrap" }}>
            {riskScores.map(c => <RiskArc key={c.label} score={c.score} label={c.label} />)}
          </div>
        </div>

        <WorldMapCard packets={packets} />

        {/* LIVE FEED */}
        <div className="panel">
          <div className="ph">
            <div style={{ display: "flex" }}>
              {[["feed", "LIVE FEED"], ["critical", "CRITICAL"]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{ ...S.tabBtn as React.CSSProperties, color: activeTab === id ? L.accent : L.textMuted, borderBottom: activeTab === id ? `2px solid ${L.accent}` : "2px solid transparent" }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Pulse color={L.danger} /><span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", color: "#334155", letterSpacing: "0.1em", fontWeight: 600 }}>POLLING · 2s</span></div>
          </div>

          {mobile ? (
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {displayFeed.map((p, i) => (
                <div key={p.id} className="row fr" onClick={() => setEnrichTarget(p.src)} style={{ padding: "10px 14px", borderBottom: `1px solid ${L.divider}`, background: i === 0 && p.label === "CRITICAL" ? "rgba(220,38,38,0.03)" : "transparent" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ color: L.accent, fontSize: 10, fontFamily: "Share Tech Mono" }}>{p.id} · {p.time}</span>
                    <span style={{ fontSize: 9, fontFamily: "'Orbitron',monospace", color: p.color, letterSpacing: "0.08em" }}>{p.label}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: L.text, fontSize: 12 }}>{p.src}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 40, height: 3, background: L.divider, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${p.risk * 100}%`, height: "100%", background: p.color, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, color: p.color }}>{(p.risk * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 3, fontSize: 10, color: L.textDim }}>:{p.dst_port} · {p.size}B · {p.country}</div>
                </div>
              ))}
              {displayFeed.length === 0 && <div style={{ padding: 18, textAlign: "center", fontSize: 11, color: L.textMuted }}>Awaiting packets...</div>}
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "72px 86px 118px 68px 62px 1fr 80px", padding: "7px 16px", borderBottom: `1px solid ${L.divider}`, background: L.pageBg }}>
                {["ID", "TIME", "SRC IP", "DST PORT", "SIZE", "RISK", "STATUS"].map(h => (
                  <span key={h} style={{ fontSize: 7.5, color: "#1e3a5f", letterSpacing: "0.14em", fontFamily: "'Orbitron',monospace", fontWeight: 700 }}>{h}</span>
                ))}
              </div>
              <div style={{ maxHeight: 268, overflowY: "auto" }}>
                {displayFeed.map((p, i) => (
                  <div key={p.id} className="row fr" onClick={() => setEnrichTarget(p.src)} style={{ display: "grid", gridTemplateColumns: "72px 86px 118px 68px 62px 1fr 80px", padding: "8px 16px", borderBottom: `1px solid ${L.divider}`, background: i === 0 && p.label === "CRITICAL" ? "rgba(220,38,38,0.025)" : "transparent", alignItems: "center" }}>
                    <span style={{ color: L.accent, fontSize: 10 }}>{p.id}</span>
                    <span style={{ color: "#475569", fontSize: 10 }}>{p.time}</span>
                    <span style={{ color: L.text, fontSize: 10 }}>{p.src}</span>
                    <span style={{ color: "#475569", fontSize: 10 }}>:{p.dst_port}</span>
                    <span style={{ color: "#475569", fontSize: 10 }}>{p.size}B</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 36, height: 3, background: L.divider, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${p.risk * 100}%`, height: "100%", background: p.color, borderRadius: 2, transition: "width .4s" }} />
                      </div>
                      <span style={{ fontSize: 9, color: p.color }}>{(p.risk * 100).toFixed(0)}%</span>
                    </div>
                    <span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", color: p.color, letterSpacing: "0.08em" }}>{p.label}</span>
                  </div>
                ))}
                {displayFeed.length === 0 && <div style={{ padding: 18, textAlign: "center", fontSize: 10, color: L.textMuted }}>Awaiting packets...</div>}
              </div>
            </>
          )}
        </div>

        {/* FLAGGED SOURCES */}
        <div className="panel">
          <div className="ph">
            <span style={S.label as React.CSSProperties}>FLAGGED SOURCES</span>
            <button className="ab" onClick={() => setEnrichTarget("")} style={{ ...S.btn as React.CSSProperties, fontSize: 8, padding: "5px 12px" }}>+ ENRICH IP</button>
          </div>
          <div style={{ maxHeight: mobile ? 200 : 180, overflowY: "auto" }}>
            {flaggedIPs.length === 0 && <div style={{ padding: 14, fontSize: 11, color: L.textMuted }}>No flagged sources yet...</div>}
            {flaggedIPs.map(p => (
              <div key={p.src} className="row" onClick={() => setEnrichTarget(p.src)} style={{ display: "flex", alignItems: "center", gap: 10, padding: mobile ? "12px 16px" : "9px 16px", borderBottom: `1px solid ${L.divider}` }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, boxShadow: `0 0 5px ${p.color}88`, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: mobile ? 13 : 11, color: L.text, fontFamily: "Share Tech Mono" }}>{p.src}</span>
                <span style={{ fontSize: 10, color: L.textDim, fontFamily: "Share Tech Mono" }}>{p.country}</span>
                <span style={{ fontSize: 9, fontFamily: "'Orbitron',monospace", color: p.color }}>{p.label}</span>
                <span style={{ fontSize: 11, color: L.textMuted }}>→</span>
              </div>
            ))}
          </div>
        </div>

        {/* BACKEND SERVICES */}
        {!mobile && (
          <div className="panel">
            <div className="ph"><span style={S.label as React.CSSProperties}>BACKEND SERVICES</span></div>
            <div style={{ padding: "10px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { name: "/chat", ok: true }, { name: "/latest_packet", ok: packets.length > 0 },
                { name: "/enrich_ip", ok: true }, { name: "/scan-url", ok: true },
                { name: "/scan-crypto", ok: true }, { name: "/block_ip", ok: true },
              ].map(s => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: s.ok ? "rgba(22,163,74,0.04)" : "rgba(220,38,38,0.04)", borderRadius: 6, border: `1px solid ${s.ok ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.12)"}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.ok ? L.success : L.danger, boxShadow: `0 0 4px ${s.ok ? L.success : L.danger}88`, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 10, color: L.textSec, fontFamily: "Share Tech Mono" }}>{s.name}</span>
                  <span style={{ fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: s.ok ? L.success : L.danger, letterSpacing: "0.1em" }}>{s.ok ? "ONLINE" : "DEGRADED"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 2px", borderTop: `1px solid ${L.divider}` }}>
          <span style={{ fontSize: 7, color: L.textFaint, letterSpacing: "0.1em", fontFamily: "'Orbitron',monospace" }}>REBEL — RESTRICTED ACCESS</span>
          <span style={{ fontSize: 7, color: L.textFaint, letterSpacing: "0.1em", fontFamily: "Share Tech Mono" }}>{API.replace("https://", "")}</span>
        </div>
      </div>

      {mobile && <MobileNav onChat={() => setChatOpen(o => !o)} onScan={() => setScanOpen(true)} chatOpen={chatOpen} />}
      {scanOpen && <ScanModal onClose={() => setScanOpen(false)} />}
      {enrichTarget !== null && <IPEnrichModal ip={enrichTarget} onClose={() => setEnrichTarget(null)} />}
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
    </div>
  );
}