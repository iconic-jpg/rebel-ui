import React, { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from '../context/ThemeContext'

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

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#22d3ee", NORMAL: "#22c55e",
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
function Pulse({ color = "#3b82f6" }: { color?: string }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.5, animation: "ping 1.4s ease infinite" }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "block", boxShadow: `0 0 5px ${color}` }} />
    </span>
  );
}

function RiskArc({ score, label, textDim }: { score: number; label: string; textDim: string }) {
  const r = 36, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
  const color = score > 80 ? "#ef4444" : score > 60 ? "#f97316" : score > 40 ? "#eab308" : "#3b82f6";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <svg width="72" height="72" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 1s ease", filter: `drop-shadow(0 0 5px ${color})` }} />
        <text x="50" y="54" textAnchor="middle" fill={color} fontSize="16" fontFamily="Orbitron" fontWeight="700">{score}</text>
      </svg>
      <span style={{ fontSize: 8, color: textDim, letterSpacing: "0.08em", fontFamily: "Share Tech Mono", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

// ─── CODE BLOCK ───────────────────────────────────────────────────────────────
function CodeBlock({ lang, content }: { lang: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ background: "#060a10", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 4, margin: "6px 0", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 10px", background: "rgba(59,130,246,0.08)", borderBottom: "1px solid rgba(59,130,246,0.15)" }}>
        <span style={{ fontSize: 9, color: "#3b82f6", fontFamily: "'Orbitron',monospace", letterSpacing: "0.1em" }}>{lang.toUpperCase()}</span>
        <button onClick={copy} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, color: copied ? "#22c55e" : "rgba(200,220,255,0.4)", fontFamily: "Share Tech Mono", letterSpacing: "0.1em" }}>
          {copied ? "✓ COPIED" : "COPY"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "10px 12px", fontFamily: "Share Tech Mono", fontSize: 11, color: "rgba(200,220,255,0.85)", lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre" }}>
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
          <p key={i} style={{ margin: 0, fontFamily: "Share Tech Mono", fontSize, color: "rgba(200,220,255,0.85)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {part.content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((s: string, j: number) => {
              if (s.startsWith("**") && s.endsWith("**"))
                return <strong key={j} style={{ color: "rgba(200,220,255,1)", fontWeight: 700 }}>{s.slice(2, -2)}</strong>;
              if (s.startsWith("`") && s.endsWith("`"))
                return <code key={j} style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 3, padding: "1px 5px", fontFamily: "Share Tech Mono", fontSize: fontSize - 1, color: "#3b82f6" }}>{s.slice(1, -1)}</code>;
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
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const modalBg  = isDark ? "#0d1117"                 : "#f8fafc";
  const textDim  = isDark ? "rgba(200,220,255,0.4)"   : "rgba(30,60,120,0.5)";
  const inputSt  = { background: isDark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.9)", border: `1px solid ${isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.3)"}`, borderRadius: 3, padding: "8px 12px", color: isDark ? "rgba(200,220,255,0.9)" : "#1a2332", fontFamily: "Share Tech Mono", fontSize: 12, outline: "none" };
  const btnSt    = { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.32)", borderRadius: 3, color: "#3b82f6", cursor: "pointer", padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em", whiteSpace: "nowrap" as const, transition: "all 0.2s" };
  const labelSt  = { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: isDark ? "rgba(200,220,255,0.62)" : "rgba(30,60,120,0.6)" };
  const ghostSt  = { background: "none", border: "none", color: isDark ? "rgba(200,220,255,0.32)" : "rgba(30,60,120,0.4)", cursor: "pointer", fontSize: 16, padding: 4 };

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

  const sc = (s: number) => s >= 70 ? "#22c55e" : s >= 40 ? "#eab308" : "#ef4444";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ width: mobile ? "100%" : 560, maxHeight: mobile ? "92vh" : "90vh", background: modalBg, border: "1px solid rgba(59,130,246,0.25)", borderRadius: mobile ? "12px 12px 0 0" : 4, boxShadow: "0 0 60px rgba(59,130,246,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={labelSt}>ACTIVE SCAN</span>
          <button onClick={onClose} style={ghostSt}>✕</button>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(59,130,246,0.08)" }}>
            {[["url", "URL SCAN"], ["crypto", "CRYPTO / TLS"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.14em", padding: "8px 13px", transition: "all 0.2s", color: tab === id ? "#3b82f6" : "rgba(200,220,255,0.3)", borderBottom: tab === id ? "2px solid #3b82f6" : "2px solid transparent", flex: 1 }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && runScan()} placeholder="https://target.com" style={{ ...inputSt, flex: 1, fontSize: 14 }} />
            <button onClick={runScan} disabled={loading} style={{ ...btnSt, padding: "10px 16px" }}>{loading ? "..." : "SCAN"}</button>
          </div>
          {loading && <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={{ width: 13, height: 13, border: "2px solid rgba(59,130,246,0.15)", borderTop: "2px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /><span style={{ fontSize: 11, color: textDim, fontFamily: "Share Tech Mono" }}>Probing target...</span></div>}
          {result && !result.error && (
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 3, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {result.score !== undefined && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 42, color: sc(result.score), textShadow: `0 0 20px ${sc(result.score)}55` }}>{result.score}</div>
                  <div>
                    <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 11, color: sc(result.score), letterSpacing: "0.15em" }}>{result.level?.toUpperCase() || "RISK"}</div>
                    <div style={{ fontSize: 11, color: textDim, marginTop: 2 }}>{result.domain || result.url}</div>
                  </div>
                </div>
              )}
              {result.tls_info?.tls_version && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {([["TLS Version", result.tls_info.tls_version], ["Key Type", result.tls_info.key_type], ["Key Size", (result.tls_info.key_size ?? "?") + " bits"], ["Issuer", result.tls_info.issuer], ["Post-Quantum", result.tls_info.post_quantum ? "YES ✓" : "NO"], ["Self-Signed", result.tls_info.is_self_signed ? "YES ⚠" : "NO"]] as [string, string | number | undefined][]).map(([k, v]) => (
                    <div key={k} style={{ background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: 2 }}>
                      <div style={{ fontSize: 8, color: textDim, letterSpacing: "0.1em", marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 12, color: isDark ? "rgba(200,220,255,0.8)" : "#1a2332" }}>{v ?? "N/A"}</div>
                    </div>
                  ))}
                </div>
              )}
              {result.vulnerabilities && (
                <div>
                  <div style={{ fontSize: 9, color: textDim, letterSpacing: "0.15em", marginBottom: 6 }}>VULNERABILITIES</div>
                  {result.vulnerabilities.missing_headers?.map((h: string) => <div key={h} style={{ fontSize: 12, color: "#f97316", padding: "2px 0" }}>⚠ {h}</div>)}
                  {result.vulnerabilities.open_redirect_risk && <div style={{ fontSize: 12, color: "#ef4444" }}>⚠ Open Redirect Risk</div>}
                  {result.vulnerabilities.suspicious_url_patterns?.map((p: string) => <div key={p} style={{ fontSize: 12, color: "#eab308" }}>⚠ {p}</div>)}
                </div>
              )}
              {result.reasons?.map((r: string) => <div key={r} style={{ fontSize: 12, color: "#f97316" }}>⚠ {r}</div>)}
              {result.explanation && <div style={{ fontSize: 12, color: textDim, lineHeight: 1.7, borderTop: "1px solid rgba(59,130,246,0.08)", paddingTop: 10, fontFamily: "Share Tech Mono" }}>{result.explanation}</div>}
            </div>
          )}
          {result?.error && <div style={{ fontSize: 12, color: "#ef4444", fontFamily: "Share Tech Mono" }}>ERROR: {result.error}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── WORLD MAP CARD ───────────────────────────────────────────────────────────
function WorldMapCard({ packets }: { packets: Packet[] }) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
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
    ctx.fillStyle = isDark ? "#080c14" : "#e8edf5";
    ctx.fillRect(0, 0, W, H);
    if (imgRef.current) { ctx.globalAlpha = isDark ? 0.25 : 0.15; ctx.drawImage(imgRef.current, 0, 0, W, H); ctx.globalAlpha = 1; }
    ctx.strokeStyle = "rgba(59,130,246,0.06)"; ctx.lineWidth = 0.5;
    for (let lat = -90; lat <= 90; lat += 30) { const { y } = project(lat, 0, W, H); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let lng = -180; lng <= 180; lng += 30) { const { x } = project(0, lng, W, H); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    const attackers = packets.filter(p => p.label !== "NORMAL").slice(0, 25);
    const TARGET: [number, number] = [37.09, -95.71];
    const tgt = project(TARGET[0], TARGET[1], W, H);
    attackers.forEach(p => {
      const coords = countryCoords[p.country] ?? countryCoords["??"];
      const src = project(coords[0] + jitter(p.id + "lat", 3), coords[1] + jitter(p.id + "lng", 3), W, H);
      ctx.beginPath(); ctx.moveTo(src.x, src.y);
      const cpx = (src.x + tgt.x) / 2, cpy = Math.min(src.y, tgt.y) - Math.abs(src.x - tgt.x) * 0.22 - 15;
      ctx.quadraticCurveTo(cpx, cpy, tgt.x, tgt.y); ctx.strokeStyle = p.color + "55"; ctx.lineWidth = 0.8; ctx.stroke();
    });
    attackers.forEach(p => {
      const coords = countryCoords[p.country] ?? countryCoords["??"];
      const src = project(coords[0] + jitter(p.id + "lat", 3), coords[1] + jitter(p.id + "lng", 3), W, H);
      ctx.beginPath(); ctx.arc(src.x, src.y, 3.5, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = isDark ? "rgba(200,220,255,0.5)" : "rgba(30,60,120,0.7)"; ctx.font = `${mobile ? 7 : 8}px Share Tech Mono`; ctx.fillText(p.country, src.x + 5, src.y - 3);
    });
    [14, 9].forEach((r, i) => { ctx.beginPath(); ctx.arc(tgt.x, tgt.y, r, 0, Math.PI * 2); ctx.strokeStyle = `rgba(34,197,94,${i === 0 ? 0.15 : 0.35})`; ctx.lineWidth = 1; ctx.stroke(); });
    ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 4, 0, Math.PI * 2); ctx.fillStyle = "#22c55e"; ctx.shadowColor = "#22c55e"; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(34,197,94,0.8)"; ctx.font = "8px Share Tech Mono"; ctx.fillText("TARGET", tgt.x + 8, tgt.y + 3);
  }, [packets, mapLoaded, mobile, isDark]);

  const attackerCount = packets.filter(p => p.label !== "NORMAL").slice(0, 25).length;
  const textDim = isDark ? "rgba(200,220,255,0.3)" : "rgba(30,60,120,0.4)";
  const textMuted = isDark ? "rgba(200,220,255,0.18)" : "rgba(30,60,120,0.3)";

  return (
    <div className="panel">
      <div className="ph">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Pulse color="#ef4444" />
          <span className="s-label">GLOBAL THREAT MAP</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {[["ATTACKER", "#ef4444"], ["TARGET", "#22c55e"]].map(([l, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: `0 0 4px ${c}` }} />
              <span style={{ fontSize: 7.5, color: textDim, letterSpacing: "0.12em", fontFamily: "'Orbitron',monospace" }}>{l}</span>
            </div>
          ))}
          <span style={{ fontSize: 7.5, color: textMuted, fontFamily: "Share Tech Mono" }}>{attackerCount} ACTIVE SOURCES</span>
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <canvas ref={canvasRef} width={800} height={mobile ? 200 : 360} style={{ width: "100%", height: mobile ? 200 : 360, display: "block" }} />
        {!mapLoaded && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: textMuted, fontFamily: "Share Tech Mono" }}>LOADING MAP...</div>}
        {mapLoaded && attackerCount === 0 && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: textMuted, fontFamily: "Share Tech Mono", letterSpacing: "0.1em" }}>AWAITING THREAT DATA...</div>}
      </div>
    </div>
  );
}

// ─── IP ENRICH MODAL ──────────────────────────────────────────────────────────
function IPEnrichModal({ ip: initIp, onClose }: { ip: string; onClose: () => void }) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const modalBg = isDark ? "#0d1117" : "#f8fafc";
  const textDim = isDark ? "rgba(200,220,255,0.5)" : "rgba(30,60,120,0.5)";
  const inputSt = { background: isDark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.9)", border: `1px solid ${isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.3)"}`, borderRadius: 3, padding: "8px 12px", color: isDark ? "rgba(200,220,255,0.9)" : "#1a2332", fontFamily: "Share Tech Mono", fontSize: 12, outline: "none" };
  const btnSt = { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.32)", borderRadius: 3, color: "#3b82f6", cursor: "pointer", padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em", whiteSpace: "nowrap" as const, transition: "all 0.2s" };
  const labelSt = { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: isDark ? "rgba(200,220,255,0.62)" : "rgba(30,60,120,0.6)" };
  const ghostSt = { background: "none", border: "none", color: isDark ? "rgba(200,220,255,0.32)" : "rgba(30,60,120,0.4)", cursor: "pointer", fontSize: 16, padding: 4 };

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

  const lc: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f97316", LOW: "#22c55e" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ width: mobile ? "100%" : 500, maxHeight: mobile ? "92vh" : "90vh", background: modalBg, border: "1px solid rgba(59,130,246,0.25)", borderRadius: mobile ? "12px 12px 0 0" : 4, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 0 60px rgba(59,130,246,0.15)" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={labelSt}>IP INTELLIGENCE</span>
          <button onClick={onClose} style={ghostSt}>✕</button>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={ip} onChange={e => setIp(e.target.value)} onKeyDown={e => e.key === "Enter" && run()} placeholder="x.x.x.x" style={{ ...inputSt, flex: 1, fontSize: 14 }} />
            <button onClick={() => run()} disabled={loading} style={{ ...btnSt, padding: "10px 16px" }}>{loading ? "..." : "ENRICH"}</button>
          </div>
          {loading && <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={{ width: 13, height: 13, border: "2px solid rgba(59,130,246,0.15)", borderTop: "2px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /><span style={{ fontSize: 11, color: textDim, fontFamily: "Share Tech Mono" }}>Querying threat feeds...</span></div>}
          {result && !result.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 26, color: lc[result.label ?? ""] ?? "#eab308", textShadow: `0 0 20px ${lc[result.label ?? ""] ?? "#eab308"}55` }}>{result.label}</div>
                <div>
                  <div style={{ fontSize: 12, color: textDim }}>{result.action}</div>
                  <div style={{ fontSize: 11, color: isDark ? "rgba(200,220,255,0.35)" : "rgba(30,60,120,0.4)" }}>Confidence: {result.confidence}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {([["Country", result.intel?.country], ["ASN", result.intel?.asn], ["Org", result.intel?.org], ["Anomaly", result.base_anomaly], ["Malicious", result.intel?.malicious], ["Suspicious", result.intel?.suspicious], ["Reputation", result.intel?.reputation], ["Financial Risk", result.financialRisk]] as [string, string | number | undefined][]).map(([k, v]) => (
                  <div key={k} style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(59,130,246,0.04)", padding: "6px 10px", borderRadius: 2 }}>
                    <div style={{ fontSize: 8, color: textDim, letterSpacing: "0.1em", marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 12, color: isDark ? "rgba(200,220,255,0.8)" : "#1a2332" }}>{v ?? "-"}</div>
                  </div>
                ))}
              </div>
              <button onClick={doBlock} disabled={blocked} style={{ ...btnSt, background: blocked ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.12)", borderColor: blocked ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.35)", color: blocked ? "#22c55e" : "#ef4444", padding: "12px 0", width: "100%", fontSize: 11 }}>
                {blocked ? "✓ BLOCKED SUCCESSFULLY" : `⛔ BLOCK ${ip} NOW`}
              </button>
            </div>
          )}
          {result?.error && <div style={{ fontSize: 12, color: "#ef4444" }}>ERROR: {result.error}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── NAV DRAWER ───────────────────────────────────────────────────────────────
function NavDrawer() {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const go = (path: string) => { navigate(path); setOpen(false); };

  const barColor = isDark ? "rgba(200,220,255,0.4)" : "rgba(30,60,120,0.5)";
  const drawerBg = isDark ? "linear-gradient(180deg,#070c16 0%,#080c14 100%)" : "linear-gradient(180deg,#e8edf5 0%,#edf1f7 100%)";
  const sectionColor = isDark ? "rgba(200,220,255,0.18)" : "rgba(30,60,120,0.3)";
  const labelColor = isDark ? "rgba(200,220,255,0.75)" : "rgba(20,40,100,0.85)";
  const subColor = isDark ? "rgba(200,220,255,0.28)" : "rgba(30,60,120,0.4)";
  const footerMuted = isDark ? "rgba(200,220,255,0.14)" : "rgba(30,60,120,0.35)";
  const titleColor = isDark ? "#fff" : "#0f1e3d";
  const subtitleColor = isDark ? "rgba(200,220,255,0.2)" : "rgba(30,60,120,0.3)";

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
          <span key={i} style={{ display: "block", width: 16, height: 1.5, borderRadius: 2, background: open ? "#3b82f6" : barColor, transform: open ? (i === 0 ? "translateY(6px) rotate(45deg)" : i === 2 ? "translateY(-6px) rotate(-45deg)" : "scaleX(0)") : "none", opacity: open && i === 1 ? 0 : 1, transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)" }} />
        ))}
      </button>

      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 198, background: isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.3)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }} />}

      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 260, zIndex: 199, background: drawerBg, borderRight: `1px solid ${isDark ? "rgba(59,130,246,0.14)" : "rgba(59,130,246,0.25)"}`, boxShadow: open ? "12px 0 60px rgba(0,0,0,0.7)" : "none", display: "flex", flexDirection: "column", transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ padding: "16px 16px 14px", borderBottom: `1px solid ${isDark ? "rgba(59,130,246,0.09)" : "rgba(59,130,246,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 28 28">
              <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#3b82f6" strokeWidth="1.5" style={{ filter: "drop-shadow(0 0 4px #3b82f6)" }} />
              <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
              <circle cx="14" cy="14" r="3" fill="#3b82f6" style={{ filter: "drop-shadow(0 0 5px #3b82f6)" }} />
            </svg>
            <div>
              <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 14, color: titleColor, letterSpacing: ".22em" }}>REBEL</div>
              <div style={{ fontSize: 7, color: subtitleColor, letterSpacing: ".14em", fontFamily: "'Orbitron',monospace", marginTop: 1 }}>THREAT INTELLIGENCE</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 2, color: "rgba(200,220,255,0.4)", cursor: "pointer", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✕</button>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
          {NAV.map(section => (
            <div key={section.section} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 7, color: sectionColor, letterSpacing: ".2em", fontFamily: "'Orbitron',monospace", padding: "10px 8px 5px" }}>{section.section}</div>
              {section.items.map(item => (
                <button key={item.path} onClick={() => go(item.path)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", background: "none", border: "1px solid transparent", borderRadius: 3, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                  onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(59,130,246,0.08)"; b.style.borderColor = "rgba(59,130,246,0.18)"; }}
                  onMouseLeave={e => { const b = e.currentTarget; b.style.background = "none"; b.style.borderColor = "transparent"; }}>
                  <div style={{ width: 32, height: 32, flexShrink: 0, background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',monospace", fontSize: 13, color: "#3b82f6" }}>{item.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: labelColor, lineHeight: 1 }}>{item.label}</div>
                    <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: subColor, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</div>
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(59,130,246,0.35)", flexShrink: 0 }}>›</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: "12px 16px", borderTop: `1px solid ${isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.15)"}`, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ position: "relative", display: "inline-flex", width: 7, height: 7, flexShrink: 0 }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#22c55e", opacity: .5, animation: "ping 1.4s ease infinite" }} />
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "block", boxShadow: "0 0 4px #22c55e" }} />
            </span>
            <span style={{ fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: "#22c55e", letterSpacing: ".12em" }}>LIVE · CONNECTED</span>
          </div>
          <div style={{ fontSize: 7.5, color: footerMuted, fontFamily: "'Share Tech Mono',monospace" }}>r3bel-production.up.railway.app</div>
        </div>
      </div>
    </>
  );
}

// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
function ChatPanel({ onClose }: { onClose: () => void }) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const chatBg   = isDark ? "#0a0f1a" : "#f0f4f8";
  const labelSt  = { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: isDark ? "rgba(200,220,255,0.62)" : "rgba(30,60,120,0.6)" };
  const ghostSt  = { background: "none", border: "none", color: isDark ? "rgba(200,220,255,0.32)" : "rgba(30,60,120,0.4)", cursor: "pointer", fontSize: 16, padding: 4 };
  const inputSt  = { background: isDark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.9)", border: `1px solid ${isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.3)"}`, borderRadius: 3, padding: "8px 12px", color: isDark ? "rgba(200,220,255,0.9)" : "#1a2332", fontFamily: "Share Tech Mono", fontSize: 12, outline: "none" };
  const btnSt    = { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.32)", borderRadius: 3, color: "#3b82f6", cursor: "pointer", padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em", whiteSpace: "nowrap" as const, transition: "all 0.2s" };

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

  if (mobile) {
    return (
      <div style={{ position: "fixed", inset: 0, background: chatBg, zIndex: 200, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(59,130,246,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "max(14px, env(safe-area-inset-top))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Pulse color="#3b82f6" /><span style={labelSt}>REBEL CHAT</span></div>
          <button onClick={onClose} style={{ ...ghostSt, fontSize: 22, padding: 8 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", background: m.role === "user" ? "rgba(59,130,246,0.12)" : isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)", border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.12)"}`, borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "2px 14px 14px 14px", padding: "10px 14px" }}>
              {m.role === "assistant" && <div style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", color: "#3b82f6", letterSpacing: "0.2em", marginBottom: 5 }}>REBEL</div>}
              <MessageContent text={m.text} fontSize={14} />
            </div>
          ))}
          {loading && <div style={{ display: "flex", gap: 5, padding: "10px 14px" }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", animation: `bounce 1s ease infinite ${i * 0.15}s` }} />)}</div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "12px 14px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", borderTop: "1px solid rgba(59,130,246,0.12)", display: "flex", gap: 10, background: chatBg }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Query REBEL..." style={{ ...inputSt, flex: 1, fontSize: 16, padding: "12px 14px" }} />
          <button onClick={send} disabled={loading} style={{ ...btnSt, padding: "12px 18px", fontSize: 10 }}>SEND</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 400, background: chatBg, borderLeft: `1px solid ${isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.25)"}`, display: "flex", flexDirection: "column", zIndex: 200, animation: "slideIn 0.28s ease", boxShadow: "-18px 0 50px rgba(0,0,0,0.55)" }}>
      <div style={{ padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Pulse color="#3b82f6" /><span style={labelSt}>REBEL CHAT</span></div>
        <button onClick={onClose} style={ghostSt}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", background: m.role === "user" ? "rgba(59,130,246,0.1)" : isDark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.7)", border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.28)" : "rgba(59,130,246,0.1)"}`, borderRadius: m.role === "user" ? "10px 10px 2px 10px" : "2px 10px 10px 10px", padding: "8px 12px" }}>
            {m.role === "assistant" && <div style={{ fontSize: 7, fontFamily: "'Orbitron',monospace", color: "#3b82f6", letterSpacing: "0.2em", marginBottom: 4 }}>REBEL</div>}
            <MessageContent text={m.text} fontSize={12} />
          </div>
        ))}
        {loading && <div style={{ display: "flex", gap: 4, padding: "8px 12px" }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#3b82f6", animation: `bounce 1s ease infinite ${i * 0.15}s` }} />)}</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "11px 13px", borderTop: "1px solid rgba(59,130,246,0.1)", display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Query REBEL..." style={{ ...inputSt, flex: 1 }} />
        <button onClick={send} disabled={loading} style={btnSt}>SEND</button>
      </div>
    </div>
  );
}

// ─── MOBILE NAV ───────────────────────────────────────────────────────────────
function MobileNav({ onChat, onScan, chatOpen, isDark }: { onChat: () => void; onScan: () => void; chatOpen: boolean; isDark: boolean }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: isDark ? "rgba(8,12,20,0.98)" : "rgba(240,244,248,0.98)", borderTop: `1px solid ${isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.22)"}`, display: "flex", zIndex: 150, paddingBottom: "env(safe-area-inset-bottom)" }}>
      {[
        { icon: "⬡", label: "SCAN", action: onScan, active: false },
        { icon: "⬡", label: "CHAT", action: onChat, active: chatOpen },
      ].map(item => (
        <button key={item.label} onClick={item.action} style={{ flex: 1, background: "none", border: "none", padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", borderTop: item.active ? "2px solid #3b82f6" : "2px solid transparent" }}>
          <span style={{ fontSize: 18, color: item.active ? "#3b82f6" : isDark ? "rgba(200,220,255,0.4)" : "rgba(30,60,120,0.4)" }}>{item.icon}</span>
          <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 8, color: item.active ? "#3b82f6" : isDark ? "rgba(200,220,255,0.35)" : "rgba(30,60,120,0.4)", letterSpacing: "0.15em" }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export default function RebelDashboard() {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const T = {
    pageBg:      isDark ? "#080c14"                  : "#f0f4f8",
    pageGrad:    isDark ? "radial-gradient(ellipse at 15% 50%,rgba(59,130,246,0.03) 0%,transparent 55%)"
                        : "radial-gradient(ellipse at 15% 50%,rgba(59,130,246,0.06) 0%,transparent 55%)",
    navBg:       isDark ? "rgba(8,12,20,0.97)"       : "rgba(240,244,248,0.97)",
    navBorder:   isDark ? "rgba(59,130,246,0.09)"    : "rgba(59,130,246,0.2)",
    panelBg:     isDark ? "rgba(255,255,255,0.02)"   : "rgba(255,255,255,0.7)",
    panelBorder: isDark ? "rgba(59,130,246,0.09)"    : "rgba(59,130,246,0.2)",
    text:        isDark ? "rgba(200,220,255,0.85)"   : "#1a2332",
    textDim:     isDark ? "rgba(200,220,255,0.35)"   : "rgba(30,60,120,0.45)",
    textMuted:   isDark ? "rgba(200,220,255,0.18)"   : "rgba(30,60,120,0.3)",
    textFaint:   isDark ? "rgba(200,220,255,0.14)"   : "rgba(30,60,120,0.25)",
    inputBg:     isDark ? "rgba(255,255,255,0.035)"  : "rgba(255,255,255,0.9)",
    inputBorder: isDark ? "rgba(59,130,246,0.18)"    : "rgba(59,130,246,0.3)",
    rowHover:    isDark ? "rgba(59,130,246,0.05)"    : "rgba(59,130,246,0.06)",
    metricSub:   isDark ? "rgba(200,220,255,0.25)"   : "rgba(30,60,120,0.35)",
    dividerBg:   isDark ? "rgba(59,130,246,0.18)"    : "rgba(59,130,246,0.2)",
    titleColor:  isDark ? "#fff"                     : "#0f1e3d",
  };

  const S: Record<string, React.CSSProperties> = {
    label:   { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: isDark ? "rgba(200,220,255,0.62)" : "rgba(30,60,120,0.6)" },
    ghost:   { background: "none", border: "none", color: isDark ? "rgba(200,220,255,0.32)" : "rgba(30,60,120,0.4)", cursor: "pointer", fontSize: 16, padding: 4 },
    input:   { background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 3, padding: "8px 12px", color: T.text, fontFamily: "Share Tech Mono", fontSize: 12, outline: "none" },
    btn:     { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.32)", borderRadius: 3, color: "#3b82f6", cursor: "pointer", padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em", whiteSpace: "nowrap", transition: "all 0.2s" },
    tabBtn:  { background: "none", border: "none", cursor: "pointer", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.14em", padding: "8px 13px", transition: "all 0.2s" },
    spinner: { width: 13, height: 13, border: "2px solid rgba(59,130,246,0.15)", borderTop: "2px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  };

  const [chatOpen, setChatOpen]     = useState(false);
  const [scanOpen, setScanOpen]     = useState(false);
  const [enrichTarget, setEnrichTarget] = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState("feed");
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
    { label: "Network",  score: Math.min(99, anomalyRate * 2 + 15) },
    { label: "Endpoint", score: Math.min(99, stats.critical * 6 + 10) },
    { label: "Port 4444",score: Math.min(99, packets.filter(p => p.dst_port === 4444).length * 12 + 5) },
    { label: "Intel",    score: Math.min(99, packets.filter(p => p.label === "CRITICAL").length * 7 + 8) },
    { label: "Anomaly",  score: Math.min(99, anomalyRate + 20) },
  ];
  const overallRisk  = Math.round(riskScores.reduce((a, c) => a + c.score, 0) / riskScores.length);
  const overallColor = overallRisk > 70 ? "#ef4444" : overallRisk > 40 ? "#f97316" : "#22c55e";
  const displayFeed  = activeTab === "feed" ? packets.slice(0, 14) : packets.filter(p => p.label === "CRITICAL").slice(0, 14);
  const flaggedIPs   = [...new Map(packets.filter(p => p.label !== "NORMAL").map(p => [p.src, p] as [string, Packet])).values()].slice(0, 8);

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: "Share Tech Mono", color: T.text, backgroundImage: T.pageGrad }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.28);}
        .panel{background:${T.panelBg};border:1px solid ${T.panelBorder};border-radius:2px;transition:border-color .3s;}
        .panel:hover{border-color:rgba(59,130,246,0.2);}
        .ph{padding:10px 15px;border-bottom:1px solid ${T.panelBorder};display:flex;align-items:center;justify-content:space-between;}
        .s-label{font-family:'Orbitron',monospace;font-size:10px;letter-spacing:0.15em;color:${isDark ? "rgba(200,220,255,0.62)" : "rgba(30,60,120,0.6)"};}
        .row:hover{background:${T.rowHover}!important;cursor:pointer;}
        .ab:hover{filter:brightness(1.25);}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes ping{75%,100%{transform:scale(2.2);opacity:0}}
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanline{0%{top:-2px}100%{top:100%}}
        .fr{animation:fadeUp .25s ease;}
        input,button{-webkit-tap-highlight-color:transparent;}
      `}</style>

      {/* Scanline */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.09),transparent)", animation: "scanline 10s linear infinite" }} />
      </div>

      {/* NAV */}
      <nav style={{ height: mobile ? 48 : 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: mobile ? "0 14px" : "0 22px", paddingTop: mobile ? "env(safe-area-inset-top)" : 0, borderBottom: `1px solid ${T.navBorder}`, background: T.navBg, backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 8 : 12 }}>
          <NavDrawer />
          <svg width="22" height="22" viewBox="0 0 28 28">
            <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#3b82f6" strokeWidth="1.5" style={{ filter: "drop-shadow(0 0 4px #3b82f6)" }} />
            <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.35)" strokeWidth="1" />
            <circle cx="14" cy="14" r="3" fill="#3b82f6" style={{ filter: "drop-shadow(0 0 5px #3b82f6)" }} />
          </svg>
          <span style={{ fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: mobile ? 15 : 16, color: T.titleColor, letterSpacing: "0.22em" }}>REBEL</span>
          {!mobile && <><div style={{ width: 1, height: 18, background: T.dividerBg }} /><span style={{ fontSize: 8, color: T.textDim, letterSpacing: "0.14em" }}>THREAT INTELLIGENCE PLATFORM</span></>}
        </div>
        {!mobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.16)", borderRadius: 2, padding: "4px 10px" }}>
              <Pulse color="#22c55e" />
              <span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", color: "#22c55e", letterSpacing: "0.13em" }}>LIVE · {API.replace("https://", "")}</span>
            </div>
            <button className="ab" onClick={() => setScanOpen(true)} style={{ ...S.btn, padding: "6px 13px" }}>⬡ SCAN TARGET</button>
            <button className="ab" onClick={() => setChatOpen(o => !o)} style={{ ...S.btn, padding: "6px 13px", background: chatOpen ? "rgba(59,130,246,0.16)" : "rgba(59,130,246,0.06)", boxShadow: chatOpen ? "0 0 14px rgba(59,130,246,0.22)" : "none" }}>⬡ QUERY REBEL</button>
          </div>
        )}
        {mobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Pulse color="#22c55e" />
            <span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", color: "#22c55e", letterSpacing: "0.1em" }}>LIVE</span>
          </div>
        )}
      </nav>

      {/* CONTENT */}
      <div style={{ padding: mobile ? "12px 12px 80px" : "16px 22px", display: "flex", flexDirection: "column", gap: mobile ? 10 : 14, marginRight: (!mobile && chatOpen) ? 400 : 0, transition: "margin-right 0.3s ease" }}>

        {/* METRICS */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: mobile ? 8 : 9 }}>
          {[
            { label: "PACKETS",   value: stats.total.toLocaleString(), sub: "This session",    color: "#3b82f6", icon: "◈" },
            { label: "ANOMALIES", value: stats.anomalies,              sub: `${anomalyRate}% rate`, color: "#f97316", icon: "⚠" },
            { label: "CRITICAL",  value: stats.critical,               sub: "Immediate risk",  color: "#ef4444", icon: "☢" },
            { label: "BLOCKED",   value: stats.blocked,                sub: "Auto-blocked",    color: "#ef4444", icon: "⛔" },
            { label: "RISK",      value: overallRisk,                  sub: overallRisk > 70 ? "ELEVATED" : overallRisk > 40 ? "MODERATE" : "LOW", color: overallColor, icon: "◉" },
          ].map((m, i) => (
            <div key={i} className="panel" style={{ padding: mobile ? "10px 12px" : "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                <span style={{ ...S.label, fontSize: mobile ? 7 : 7.5 }}>{m.label}</span>
                <span style={{ fontSize: mobile ? 11 : 12, color: m.color, opacity: 0.65 }}>{m.icon}</span>
              </div>
              <div style={{ fontFamily: "'Orbitron',monospace", fontSize: mobile ? 24 : 30, fontWeight: 700, color: m.color, lineHeight: 1, marginBottom: 3, textShadow: `0 0 16px ${m.color}44` }}>{m.value}</div>
              <div style={{ fontSize: 8, color: T.metricSub, letterSpacing: "0.06em" }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* TRAFFIC CHART */}
        <div className="panel">
          <div className="ph">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Pulse color="#3b82f6" /><span style={{ ...S.label, fontSize: mobile ? 8 : 10 }}>LIVE TRAFFIC — ANOMALY DETECTION</span></div>
            {!mobile && <div style={{ display: "flex", gap: 12 }}>
              {[["NORMAL", "#3b82f6"], ["ANOMALY", "#ef4444"]].map(([l, c]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 18, height: 2, background: c, boxShadow: `0 0 4px ${c}` }} />
                  <span style={{ fontSize: 7.5, color: T.textDim, letterSpacing: "0.12em" }}>{l}</span>
                </div>
              ))}
            </div>}
          </div>
          <div style={{ padding: "10px 4px 4px" }}>
            <ResponsiveContainer width="100%" height={mobile ? 120 : 160}>
              <AreaChart data={trafficHistory}>
                <defs>
                  <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.14} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis tick={{ fontSize: 8, fill: T.textDim, fontFamily: "Share Tech Mono" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ background: isDark ? "#0d1117" : "#f8fafc", border: "1px solid rgba(59,130,246,0.22)", borderRadius: 2, fontFamily: "Share Tech Mono", fontSize: 10 }} itemStyle={{ color: T.textDim }} />
                <Area type="monotone" dataKey="normal" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gN)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="anomaly" stroke="#ef4444" strokeWidth={1.5} fill="url(#gA)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RISK ARCS */}
        <div className="panel">
          <div className="ph">
            <span style={S.label}>RISK SURFACE</span>
            <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 20, color: overallColor, textShadow: `0 0 16px ${overallColor}` }}>{overallRisk}</span>
          </div>
          <div style={{ padding: "12px 8px", display: "flex", gap: mobile ? 6 : 5, justifyContent: mobile ? "space-around" : "center", overflowX: mobile ? "auto" : "visible", flexWrap: mobile ? "nowrap" : "wrap" }}>
            {riskScores.map(c => <RiskArc key={c.label} score={c.score} label={c.label} textDim={T.textDim} />)}
          </div>
        </div>

        <WorldMapCard packets={packets} />

        {/* LIVE FEED */}
        <div className="panel">
          <div className="ph">
            <div style={{ display: "flex" }}>
              {[["feed", "LIVE FEED"], ["critical", "CRITICAL"]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{ ...S.tabBtn, color: activeTab === id ? "#3b82f6" : T.textDim, borderBottom: activeTab === id ? "2px solid #3b82f6" : "2px solid transparent" }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Pulse color="#ef4444" /><span style={{ fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: T.textDim, letterSpacing: "0.1em" }}>POLLING · 2s</span></div>
          </div>

          {mobile ? (
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {displayFeed.map((p, i) => (
                <div key={p.id} className="row fr" onClick={() => setEnrichTarget(p.src)} style={{ padding: "10px 14px", borderBottom: `1px solid ${T.panelBorder}`, background: i === 0 && p.label === "CRITICAL" ? "rgba(239,68,68,0.04)" : "transparent" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ color: "#3b82f6", fontSize: 10, fontFamily: "Share Tech Mono" }}>{p.id} · {p.time}</span>
                    <span style={{ fontSize: 9, fontFamily: "'Orbitron',monospace", color: p.color, letterSpacing: "0.08em" }}>{p.label}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: T.text, fontSize: 12 }}>{p.src}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 40, height: 3, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${p.risk * 100}%`, height: "100%", background: p.color }} />
                      </div>
                      <span style={{ fontSize: 10, color: p.color }}>{(p.risk * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 3, fontSize: 10, color: T.textDim }}>:{p.dst_port} · {p.size}B · {p.country}</div>
                </div>
              ))}
              {displayFeed.length === 0 && <div style={{ padding: 18, textAlign: "center", fontSize: 11, color: T.textMuted }}>Awaiting packets...</div>}
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "72px 86px 118px 68px 62px 1fr 80px", padding: "6px 13px", borderBottom: `1px solid ${T.panelBorder}` }}>
                {["ID", "TIME", "SRC IP", "DST PORT", "SIZE", "RISK", "STATUS"].map(h => (
                  <span key={h} style={{ fontSize: 7, color: T.textMuted, letterSpacing: "0.14em", fontFamily: "'Orbitron',monospace" }}>{h}</span>
                ))}
              </div>
              <div style={{ maxHeight: 268, overflowY: "auto" }}>
                {displayFeed.map((p, i) => (
                  <div key={p.id} className="row fr" onClick={() => setEnrichTarget(p.src)} style={{ display: "grid", gridTemplateColumns: "72px 86px 118px 68px 62px 1fr 80px", padding: "8px 13px", borderBottom: `1px solid ${T.panelBorder}`, background: i === 0 && p.label === "CRITICAL" ? "rgba(239,68,68,0.035)" : "transparent", alignItems: "center" }}>
                    <span style={{ color: "#3b82f6", fontSize: 10 }}>{p.id}</span>
                    <span style={{ color: T.textDim, fontSize: 10 }}>{p.time}</span>
                    <span style={{ color: T.text, fontSize: 10 }}>{p.src}</span>
                    <span style={{ color: T.textDim, fontSize: 10 }}>:{p.dst_port}</span>
                    <span style={{ color: T.textDim, fontSize: 10 }}>{p.size}B</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 30, height: 3, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${p.risk * 100}%`, height: "100%", background: p.color, transition: "width .4s" }} />
                      </div>
                      <span style={{ fontSize: 9, color: p.color }}>{(p.risk * 100).toFixed(0)}%</span>
                    </div>
                    <span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", color: p.color, letterSpacing: "0.08em" }}>{p.label}</span>
                  </div>
                ))}
                {displayFeed.length === 0 && <div style={{ padding: 18, textAlign: "center", fontSize: 10, color: T.textMuted }}>Awaiting packets...</div>}
              </div>
            </>
          )}
        </div>

        {/* FLAGGED SOURCES */}
        <div className="panel">
          <div className="ph">
            <span style={S.label}>FLAGGED SOURCES</span>
            <button className="ab" onClick={() => setEnrichTarget("")} style={{ ...S.btn, fontSize: 8, padding: "4px 10px" }}>+ ENRICH IP</button>
          </div>
          <div style={{ maxHeight: mobile ? 200 : 180, overflowY: "auto" }}>
            {flaggedIPs.length === 0 && <div style={{ padding: 14, fontSize: 11, color: T.textMuted }}>No flagged sources yet...</div>}
            {flaggedIPs.map(p => (
              <div key={p.src} className="row" onClick={() => setEnrichTarget(p.src)} style={{ display: "flex", alignItems: "center", gap: 8, padding: mobile ? "11px 14px" : "8px 13px", borderBottom: `1px solid ${T.panelBorder}` }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, boxShadow: `0 0 4px ${p.color}`, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: mobile ? 13 : 11, color: T.text }}>{p.src}</span>
                <span style={{ fontSize: 10, color: T.textDim }}>{p.country}</span>
                <span style={{ fontSize: 9, fontFamily: "'Orbitron',monospace", color: p.color }}>{p.label}</span>
                <span style={{ fontSize: 10, color: T.textMuted }}>→</span>
              </div>
            ))}
          </div>
        </div>

        {/* BACKEND SERVICES */}
        {!mobile && (
          <div className="panel">
            <div className="ph"><span style={S.label}>BACKEND SERVICES</span></div>
            <div style={{ padding: "9px 13px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {[
                { name: "/chat", ok: true }, { name: "/latest_packet", ok: packets.length > 0 },
                { name: "/enrich_ip", ok: true }, { name: "/scan-url", ok: true },
                { name: "/scan-crypto", ok: true }, { name: "/block_ip", ok: true },
              ].map(s => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.ok ? "#22c55e" : "#ef4444", boxShadow: `0 0 4px ${s.ok ? "#22c55e" : "#ef4444"}`, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 10, color: T.textDim, fontFamily: "Share Tech Mono" }}>{s.name}</span>
                  <span style={{ fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: s.ok ? "#22c55e" : "#ef4444", letterSpacing: "0.1em" }}>{s.ok ? "ONLINE" : "DEGRADED"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: `1px solid ${T.panelBorder}` }}>
          <span style={{ fontSize: 7, color: T.textFaint, letterSpacing: "0.1em" }}>REBEL — RESTRICTED ACCESS</span>
          <span style={{ fontSize: 7, color: T.textFaint, letterSpacing: "0.1em" }}>{API.replace("https://", "")}</span>
        </div>
      </div>

      {mobile && <MobileNav onChat={() => setChatOpen(o => !o)} onScan={() => setScanOpen(true)} chatOpen={chatOpen} isDark={isDark} />}
      {scanOpen && <ScanModal onClose={() => setScanOpen(false)} />}
      {enrichTarget !== null && <IPEnrichModal ip={enrichTarget} onClose={() => setEnrichTarget(null)} />}
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
    </div>
  );
}