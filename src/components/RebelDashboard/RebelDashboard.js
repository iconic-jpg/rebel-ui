import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
const API = "https://r3bel-production.up.railway.app";
// ─── LIGHT THEME COLORS ──────────────────────────────────────────────────────
const SEV_COLOR = {
    CRITICAL: "#dc2626", HIGH: "#ea580c", MEDIUM: "#ca8a04", LOW: "#0891b2", NORMAL: "#16a34a",
};
// Light palette tokens
const L = {
    pageBg: "#f1f5f9",
    pageGrad: "radial-gradient(ellipse at 20% 40%, rgba(14,165,233,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(99,102,241,0.05) 0%, transparent 50%)",
    navBg: "rgba(255,255,255,0.95)",
    navBorder: "rgba(14,165,233,0.18)",
    panelBg: "#ffffff",
    panelBorder: "rgba(14,165,233,0.15)",
    panelShadow: "0 1px 4px rgba(14,165,233,0.08), 0 4px 16px rgba(0,0,0,0.04)",
    accent: "#0ea5e9", // sky-500
    accentDark: "#0284c7", // sky-600
    accentDim: "rgba(14,165,233,0.12)",
    accentBorder: "rgba(14,165,233,0.28)",
    text: "#050d1a", // near-black
    textSec: "#1e293b", // slate-800 — was 700
    textDim: "#334155", // slate-700 — was 500
    textMuted: "#475569", // slate-600 — was 400
    textFaint: "#64748b", // slate-500 — was 300
    rowHover: "rgba(14,165,233,0.04)",
    divider: "rgba(14,165,233,0.12)",
    inputBg: "#f8fafc",
    inputBorder: "rgba(14,165,233,0.25)",
    danger: "#dc2626",
    warning: "#ea580c",
    success: "#16a34a",
    successDim: "rgba(22,163,74,0.1)",
};
function useInterval(fn, ms) {
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
function Pulse({ color = "#0ea5e9" }) {
    return (_jsxs("span", { style: { position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }, children: [_jsx("span", { style: { position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.4, animation: "ping 1.4s ease infinite" } }), _jsx("span", { style: { width: 8, height: 8, borderRadius: "50%", background: color, display: "block", boxShadow: `0 0 5px ${color}88` } })] }));
}
function RiskArc({ score, label }) {
    const r = 36, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
    const color = score > 80 ? L.danger : score > 60 ? L.warning : score > 40 ? "#ca8a04" : L.accent;
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }, children: [_jsxs("svg", { width: "72", height: "72", viewBox: "0 0 100 100", children: [_jsx("circle", { cx: "50", cy: "50", r: r, fill: "none", stroke: `${color}18`, strokeWidth: "8" }), _jsx("circle", { cx: "50", cy: "50", r: r, fill: "none", stroke: color, strokeWidth: "8", strokeDasharray: `${dash} ${circ}`, strokeLinecap: "round", transform: "rotate(-90 50 50)", style: { transition: "stroke-dasharray 1s ease", filter: `drop-shadow(0 0 4px ${color}66)` } }), _jsx("text", { x: "50", y: "54", textAnchor: "middle", fill: color, fontSize: "16", fontFamily: "Orbitron", fontWeight: "700", children: score })] }), _jsx("span", { style: { fontSize: 8, color: "#334155", letterSpacing: "0.08em", fontFamily: "Share Tech Mono", textTransform: "uppercase", fontWeight: 600 }, children: label })] }));
}
// ─── CODE BLOCK ───────────────────────────────────────────────────────────────
function CodeBlock({ lang, content }) {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return (_jsxs("div", { style: { background: "#f8fafc", border: `1px solid ${L.accentBorder}`, borderRadius: 6, margin: "6px 0", overflow: "hidden" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 10px", background: L.accentDim, borderBottom: `1px solid ${L.accentBorder}` }, children: [_jsx("span", { style: { fontSize: 9, color: L.accent, fontFamily: "'Orbitron',monospace", letterSpacing: "0.1em" }, children: lang.toUpperCase() }), _jsx("button", { onClick: copy, style: { background: "none", border: "none", cursor: "pointer", fontSize: 9, color: copied ? L.success : L.textDim, fontFamily: "Share Tech Mono", letterSpacing: "0.1em" }, children: copied ? "✓ COPIED" : "COPY" })] }), _jsx("pre", { style: { margin: 0, padding: "10px 12px", fontFamily: "Share Tech Mono", fontSize: 11, color: L.textSec, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre" }, children: content })] }));
}
function normalizeCodeFences(text) {
    let normalized = text.replace(/\r\n/g, "\n").replace(/ {0,}```/g, "\n```").replace(/```([^\s`]+) /g, "```$1\n");
    const fences = normalized.match(/```/g) || [];
    if (fences.length % 2 !== 0)
        normalized += "\n```";
    return normalized;
}
function parseMessage(text) {
    const parts = [];
    const normalized = normalizeCodeFences(text);
    const codeBlockRegex = /```([^\s`]+)?\s*\n([\s\S]*?)```/g;
    let last = 0, match;
    while ((match = codeBlockRegex.exec(normalized)) !== null) {
        if (match.index > last)
            parts.push({ type: "text", content: normalized.slice(last, match.index) });
        parts.push({ type: "code", lang: match[1] || "code", content: match[2].trim() });
        last = match.index + match[0].length;
    }
    if (last < normalized.length)
        parts.push({ type: "text", content: normalized.slice(last) });
    return parts;
}
function MessageContent({ text, fontSize = 12 }) {
    const parts = parseMessage(text);
    return (_jsx("div", { children: parts.map((part, i) => part.type === "code" ? (_jsx(CodeBlock, { lang: part.lang, content: part.content }, i)) : (_jsx("p", { style: { margin: 0, fontFamily: "Share Tech Mono", fontSize, color: L.textSec, lineHeight: 1.7, whiteSpace: "pre-wrap" }, children: part.content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((s, j) => {
                if (s.startsWith("**") && s.endsWith("**"))
                    return _jsx("strong", { style: { color: L.text, fontWeight: 700 }, children: s.slice(2, -2) }, j);
                if (s.startsWith("`") && s.endsWith("`"))
                    return _jsx("code", { style: { background: L.accentDim, border: `1px solid ${L.accentBorder}`, borderRadius: 3, padding: "1px 5px", fontFamily: "Share Tech Mono", fontSize: fontSize - 1, color: L.accentDark }, children: s.slice(1, -1) }, j);
                return s;
            }) }, i))) }));
}
// ─── SCAN MODAL ───────────────────────────────────────────────────────────────
function ScanModal({ onClose }) {
    const inputSt = {
        background: L.inputBg, border: `1px solid ${L.inputBorder}`, borderRadius: 6,
        padding: "8px 12px", color: L.text, fontFamily: "Share Tech Mono", fontSize: 12, outline: "none",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
    };
    const btnSt = {
        background: L.accent, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer",
        padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em",
        whiteSpace: "nowrap", transition: "all 0.2s", boxShadow: `0 2px 8px ${L.accent}44`,
    };
    const labelSt = { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: L.textDim };
    const ghostSt = { background: "none", border: "none", color: L.textMuted, cursor: "pointer", fontSize: 16, padding: 4 };
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [tab, setTab] = useState("url");
    const mobile = useMobile();
    const navigate = useNavigate();
    const runScan = async () => {
        if (!url.trim())
            return;
        const token = localStorage.getItem("access");
        if (!token) {
            navigate("/#/login");
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`${API}${tab === "url" ? "/scan-url" : "/scan-crypto"}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ url: url.trim() }),
            });
            setResult(await res.json());
        }
        catch (e) {
            setResult({ error: e instanceof Error ? e.message : "Unknown error" });
        }
        setLoading(false);
    };
    const sc = (s) => s >= 70 ? L.success : s >= 40 ? "#ca8a04" : L.danger;
    return (_jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 300, display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", backdropFilter: "blur(6px)" }, children: _jsxs("div", { style: { width: mobile ? "100%" : 560, maxHeight: mobile ? "92vh" : "90vh", background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: mobile ? "16px 16px 0 0" : 12, boxShadow: "0 24px 80px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden" }, children: [_jsxs("div", { style: { padding: "14px 18px", borderBottom: `1px solid ${L.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: L.accent }), _jsx("span", { style: labelSt, children: "ACTIVE SCAN" })] }), _jsx("button", { onClick: onClose, style: ghostSt, children: "\u2715" })] }), _jsxs("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }, children: [_jsx("div", { style: { display: "flex", borderBottom: `1px solid ${L.divider}` }, children: [["url", "URL SCAN"], ["crypto", "CRYPTO / TLS"]].map(([id, label]) => (_jsx("button", { onClick: () => setTab(id), style: { background: "none", border: "none", cursor: "pointer", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.14em", padding: "8px 13px", transition: "all 0.2s", color: tab === id ? L.accent : L.textMuted, borderBottom: tab === id ? `2px solid ${L.accent}` : "2px solid transparent", flex: 1 }, children: label }, id))) }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { value: url, onChange: e => setUrl(e.target.value), onKeyDown: e => e.key === "Enter" && runScan(), placeholder: "https://target.com", style: { ...inputSt, flex: 1, fontSize: 14 } }), _jsx("button", { onClick: runScan, disabled: loading, style: { ...btnSt, padding: "10px 16px" }, children: loading ? "..." : "SCAN" })] }), loading && _jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [_jsx("div", { style: { width: 13, height: 13, border: `2px solid ${L.accentDim}`, borderTop: `2px solid ${L.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" } }), _jsx("span", { style: { fontSize: 11, color: L.textDim, fontFamily: "Share Tech Mono" }, children: "Probing target..." })] }), result && !result.error && (_jsxs("div", { style: { background: L.inputBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 10 }, children: [result.score !== undefined && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: 42, color: sc(result.score), textShadow: `0 2px 12px ${sc(result.score)}44` }, children: result.score }), _jsxs("div", { children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: 11, color: sc(result.score), letterSpacing: "0.15em" }, children: result.level?.toUpperCase() || "RISK" }), _jsx("div", { style: { fontSize: 11, color: L.textDim, marginTop: 2 }, children: result.domain || result.url })] })] })), result.tls_info?.tls_version && (_jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }, children: [["TLS Version", result.tls_info.tls_version], ["Key Type", result.tls_info.key_type], ["Key Size", (result.tls_info.key_size ?? "?") + " bits"], ["Issuer", result.tls_info.issuer], ["Post-Quantum", result.tls_info.post_quantum ? "YES ✓" : "NO"], ["Self-Signed", result.tls_info.is_self_signed ? "YES ⚠" : "NO"]].map(([k, v]) => (_jsxs("div", { style: { background: "#fff", border: `1px solid ${L.divider}`, padding: "6px 10px", borderRadius: 6 }, children: [_jsx("div", { style: { fontSize: 8, color: L.textMuted, letterSpacing: "0.1em", marginBottom: 2 }, children: k }), _jsx("div", { style: { fontSize: 12, color: L.text }, children: v ?? "N/A" })] }, k))) })), result.vulnerabilities && (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 9, color: L.textDim, letterSpacing: "0.15em", marginBottom: 6 }, children: "VULNERABILITIES" }), result.vulnerabilities.missing_headers?.map((h) => _jsxs("div", { style: { fontSize: 12, color: L.warning, padding: "2px 0" }, children: ["\u26A0 ", h] }, h)), result.vulnerabilities.open_redirect_risk && _jsx("div", { style: { fontSize: 12, color: L.danger }, children: "\u26A0 Open Redirect Risk" }), result.vulnerabilities.suspicious_url_patterns?.map((p) => _jsxs("div", { style: { fontSize: 12, color: "#ca8a04" }, children: ["\u26A0 ", p] }, p))] })), result.reasons?.map((r) => _jsxs("div", { style: { fontSize: 12, color: L.warning }, children: ["\u26A0 ", r] }, r)), result.explanation && _jsx("div", { style: { fontSize: 12, color: L.textDim, lineHeight: 1.7, borderTop: `1px solid ${L.divider}`, paddingTop: 10, fontFamily: "Share Tech Mono" }, children: result.explanation })] })), result?.error && _jsxs("div", { style: { fontSize: 12, color: L.danger, fontFamily: "Share Tech Mono" }, children: ["ERROR: ", result.error] })] })] }) }));
}
// ─── WORLD MAP CARD ───────────────────────────────────────────────────────────
function WorldMapCard({ packets }) {
    const canvasRef = useRef(null);
    const imgRef = useRef(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const mobile = useMobile();
    const countryCoords = {
        US: [37.09, -95.71], CN: [35.86, 104.19], RU: [61.52, 105.31], DE: [51.16, 10.45],
        GB: [55.37, -3.43], FR: [46.22, 2.21], IN: [20.59, 78.96], BR: [-14.23, -51.92],
        JP: [36.20, 138.25], KR: [35.90, 127.76], AU: [-25.27, 133.77], CA: [56.13, -106.34],
        NL: [52.13, 5.29], SG: [1.35, 103.82], ZA: [-30.55, 22.93], NG: [9.08, 8.67],
        MX: [23.63, -102.55], IT: [41.87, 12.56], ES: [40.46, -3.74], SE: [60.12, 18.64],
        UA: [48.37, 31.16], IR: [32.42, 53.68], KP: [40.33, 127.51], TR: [38.96, 35.24],
        "??": [20, 0],
    };
    const project = (lat, lng, W, H) => ({ x: ((lng + 180) / 360) * W, y: ((90 - lat) / 180) * H });
    const jitter = (id, range) => { let h = 0; for (let i = 0; i < id.length; i++)
        h = (Math.imul(31, h) + id.charCodeAt(i)) | 0; return ((h & 0xffff) / 0xffff - 0.5) * range; };
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/World_map_-_low_resolution.svg/1280px-World_map_-_low_resolution.svg.png";
        img.onload = () => { imgRef.current = img; setMapLoaded(true); };
    }, []);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        // Light background
        ctx.fillStyle = "#eef4fb";
        ctx.fillRect(0, 0, W, H);
        if (imgRef.current) {
            ctx.globalAlpha = 0.18;
            ctx.drawImage(imgRef.current, 0, 0, W, H);
            ctx.globalAlpha = 1;
        }
        // Grid lines
        ctx.strokeStyle = "rgba(14,165,233,0.1)";
        ctx.lineWidth = 0.5;
        for (let lat = -90; lat <= 90; lat += 30) {
            const { y } = project(lat, 0, W, H);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
        for (let lng = -180; lng <= 180; lng += 30) {
            const { x } = project(0, lng, W, H);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        const attackers = packets.filter(p => p.label !== "NORMAL").slice(0, 25);
        const TARGET = [37.09, -95.71];
        const tgt = project(TARGET[0], TARGET[1], W, H);
        // Arc lines
        attackers.forEach(p => {
            const coords = countryCoords[p.country] ?? countryCoords["??"];
            const src = project(coords[0] + jitter(p.id + "lat", 3), coords[1] + jitter(p.id + "lng", 3), W, H);
            ctx.beginPath();
            ctx.moveTo(src.x, src.y);
            const cpx = (src.x + tgt.x) / 2, cpy = Math.min(src.y, tgt.y) - Math.abs(src.x - tgt.x) * 0.22 - 15;
            ctx.quadraticCurveTo(cpx, cpy, tgt.x, tgt.y);
            ctx.strokeStyle = p.color + "66";
            ctx.lineWidth = 1;
            ctx.stroke();
        });
        // Source dots
        attackers.forEach(p => {
            const coords = countryCoords[p.country] ?? countryCoords["??"];
            const src = project(coords[0] + jitter(p.id + "lat", 3), coords[1] + jitter(p.id + "lng", 3), W, H);
            ctx.beginPath();
            ctx.arc(src.x, src.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#334155";
            ctx.font = `${mobile ? 7 : 8}px Share Tech Mono`;
            ctx.fillText(p.country, src.x + 5, src.y - 3);
        });
        // Target rings
        [14, 9].forEach((r, i) => { ctx.beginPath(); ctx.arc(tgt.x, tgt.y, r, 0, Math.PI * 2); ctx.strokeStyle = `rgba(22,163,74,${i === 0 ? 0.18 : 0.45})`; ctx.lineWidth = 1.5; ctx.stroke(); });
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = L.success;
        ctx.shadowColor = L.success;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = L.success;
        ctx.font = "8px Share Tech Mono";
        ctx.fillText("TARGET", tgt.x + 8, tgt.y + 3);
    }, [packets, mapLoaded, mobile]);
    const attackerCount = packets.filter(p => p.label !== "NORMAL").slice(0, 25).length;
    return (_jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: L.danger }), _jsx("span", { className: "s-label", children: "GLOBAL THREAT MAP" })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [[["ATTACKER", L.danger], ["TARGET", L.success]].map(([lbl, c]) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("div", { style: { width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: `0 0 4px ${c}88` } }), _jsx("span", { style: { fontSize: 7.5, color: L.textDim, letterSpacing: "0.12em", fontFamily: "'Orbitron',monospace" }, children: lbl })] }, lbl))), _jsxs("span", { style: { fontSize: 7.5, color: L.textMuted, fontFamily: "Share Tech Mono" }, children: [attackerCount, " ACTIVE SOURCES"] })] })] }), _jsxs("div", { style: { position: "relative", background: "#eef4fb" }, children: [_jsx("canvas", { ref: canvasRef, width: 800, height: mobile ? 200 : 360, style: { width: "100%", height: mobile ? 200 : 360, display: "block" } }), !mapLoaded && _jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: L.textMuted, fontFamily: "Share Tech Mono" }, children: "LOADING MAP..." }), mapLoaded && attackerCount === 0 && _jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: L.textMuted, fontFamily: "Share Tech Mono", letterSpacing: "0.1em" }, children: "AWAITING THREAT DATA..." })] })] }));
}
// ─── IP ENRICH MODAL ──────────────────────────────────────────────────────────
function IPEnrichModal({ ip: initIp, onClose }) {
    const inputSt = {
        background: L.inputBg, border: `1px solid ${L.inputBorder}`, borderRadius: 6,
        padding: "8px 12px", color: L.text, fontFamily: "Share Tech Mono", fontSize: 12, outline: "none",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
    };
    const btnSt = {
        background: L.accent, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer",
        padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em",
        whiteSpace: "nowrap", transition: "all 0.2s", boxShadow: `0 2px 8px ${L.accent}44`,
    };
    const labelSt = { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: L.textDim };
    const ghostSt = { background: "none", border: "none", color: L.textMuted, cursor: "pointer", fontSize: 16, padding: 4 };
    const [ip, setIp] = useState(initIp || "");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [blocked, setBlocked] = useState(false);
    const mobile = useMobile();
    const run = useCallback(async (val) => {
        const target = val ?? ip;
        if (!target)
            return;
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`${API}/enrich_ip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip: target }) });
            setResult(await res.json());
        }
        catch (e) {
            setResult({ error: e instanceof Error ? e.message : "Unknown error" });
        }
        setLoading(false);
    }, [ip]);
    useEffect(() => { if (initIp)
        run(initIp); }, []);
    const doBlock = async () => {
        await fetch(`${API}/block_ip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip }) });
        setBlocked(true);
    };
    const lc = { CRITICAL: L.danger, HIGH: L.warning, LOW: L.success };
    return (_jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 300, display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", backdropFilter: "blur(6px)" }, children: _jsxs("div", { style: { width: mobile ? "100%" : 500, maxHeight: mobile ? "92vh" : "90vh", background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: mobile ? "16px 16px 0 0" : 12, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }, children: [_jsxs("div", { style: { padding: "14px 18px", borderBottom: `1px solid ${L.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: L.accent }), _jsx("span", { style: labelSt, children: "IP INTELLIGENCE" })] }), _jsx("button", { onClick: onClose, style: ghostSt, children: "\u2715" })] }), _jsxs("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }, children: [_jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { value: ip, onChange: e => setIp(e.target.value), onKeyDown: e => e.key === "Enter" && run(), placeholder: "x.x.x.x", style: { ...inputSt, flex: 1, fontSize: 14 } }), _jsx("button", { onClick: () => run(), disabled: loading, style: { ...btnSt, padding: "10px 16px" }, children: loading ? "..." : "ENRICH" })] }), loading && _jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [_jsx("div", { style: { width: 13, height: 13, border: `2px solid ${L.accentDim}`, borderTop: `2px solid ${L.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" } }), _jsx("span", { style: { fontSize: 11, color: L.textDim, fontFamily: "Share Tech Mono" }, children: "Querying threat feeds..." })] }), result && !result.error && (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14 }, children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: 26, color: lc[result.label ?? ""] ?? "#ca8a04", textShadow: `0 2px 12px ${lc[result.label ?? ""] ?? "#ca8a04"}44` }, children: result.label }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: L.textSec }, children: result.action }), _jsxs("div", { style: { fontSize: 11, color: L.textDim }, children: ["Confidence: ", result.confidence] })] })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }, children: [["Country", result.intel?.country], ["ASN", result.intel?.asn], ["Org", result.intel?.org], ["Anomaly", result.base_anomaly], ["Malicious", result.intel?.malicious], ["Suspicious", result.intel?.suspicious], ["Reputation", result.intel?.reputation], ["Financial Risk", result.financialRisk]].map(([k, v]) => (_jsxs("div", { style: { background: L.inputBg, border: `1px solid ${L.divider}`, padding: "6px 10px", borderRadius: 6 }, children: [_jsx("div", { style: { fontSize: 8, color: L.textMuted, letterSpacing: "0.1em", marginBottom: 2 }, children: k }), _jsx("div", { style: { fontSize: 12, color: L.text }, children: v ?? "-" })] }, k))) }), _jsx("button", { onClick: doBlock, disabled: blocked, style: { background: blocked ? L.successDim : "rgba(220,38,38,0.08)", border: `1px solid ${blocked ? "rgba(22,163,74,0.4)" : "rgba(220,38,38,0.3)"}`, borderRadius: 6, color: blocked ? L.success : L.danger, cursor: "pointer", padding: "12px 0", width: "100%", fontFamily: "'Orbitron',monospace", fontSize: 11, letterSpacing: "0.1em", transition: "all 0.2s" }, children: blocked ? "✓ BLOCKED SUCCESSFULLY" : `⛔ BLOCK ${ip} NOW` })] })), result?.error && _jsxs("div", { style: { fontSize: 12, color: L.danger }, children: ["ERROR: ", result.error] })] })] }) }));
}
// ─── NAV DRAWER ───────────────────────────────────────────────────────────────
function NavDrawer() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const go = (path) => { navigate(path); setOpen(false); };
    const NAV = [
        { section: "CORE", items: [{ path: "/", icon: "⬡", label: "Dashboard", sub: "Live threat feed" }] },
        { section: "ASSET & PQC", items: [
                { path: "/inventory", icon: "◈", label: "Asset Inventory", sub: "128 assets tracked" },
                { path: "/discovery", icon: "◎", label: "Asset Discovery", sub: "Domains · SSL · IPs" },
                { path: "/cbom", icon: "◉", label: "CBOM", sub: "Crypto bill of mat." },
                { path: "/pqc", icon: "⬟", label: "Posture of PQC", sub: "755/1000 Elite" },
            ] },
        { section: "REPORTS", items: [
                { path: "/rating", icon: "✦", label: "Cyber Rating", sub: "Tier 1–4 scoring" },
                { path: "/reporting", icon: "▣", label: "Reporting", sub: "Export & schedule" },
            ] },
    ];
    return (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setOpen(o => !o), style: { background: "none", border: "none", cursor: "pointer", padding: "6px 8px", marginRight: 4, display: "flex", flexDirection: "column", gap: 4.5 }, children: [0, 1, 2].map(i => (_jsx("span", { style: { display: "block", width: 16, height: 1.5, borderRadius: 2, background: open ? L.accent : L.textDim, transform: open ? (i === 0 ? "translateY(6px) rotate(45deg)" : i === 2 ? "translateY(-6px) rotate(-45deg)" : "scaleX(0)") : "none", opacity: open && i === 1 ? 0 : 1, transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)" } }, i))) }), open && _jsx("div", { onClick: () => setOpen(false), style: { position: "fixed", inset: 0, zIndex: 198, background: "rgba(15,23,42,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" } }), _jsxs("div", { style: { position: "fixed", top: 0, left: 0, bottom: 0, width: 260, zIndex: 199, background: "#fff", borderRight: `1px solid ${L.panelBorder}`, boxShadow: open ? "16px 0 60px rgba(0,0,0,0.12)" : "none", display: "flex", flexDirection: "column", transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)" }, children: [_jsxs("div", { style: { padding: "16px 16px 14px", borderBottom: `1px solid ${L.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 28 28", children: [_jsx("polygon", { points: "14,2 26,8 26,20 14,26 2,20 2,8", fill: "none", stroke: L.accent, strokeWidth: "1.5", style: { filter: `drop-shadow(0 0 3px ${L.accent}88)` } }), _jsx("polygon", { points: "14,7 21,11 21,17 14,21 7,17 7,11", fill: L.accentDim, stroke: L.accentBorder, strokeWidth: "1" }), _jsx("circle", { cx: "14", cy: "14", r: "3", fill: L.accent, style: { filter: `drop-shadow(0 0 4px ${L.accent})` } })] }), _jsxs("div", { children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 14, color: L.text, letterSpacing: ".22em" }, children: "REBEL" }), _jsx("div", { style: { fontSize: 7, color: L.textMuted, letterSpacing: ".14em", fontFamily: "'Orbitron',monospace", marginTop: 1 }, children: "THREAT INTELLIGENCE" })] })] }), _jsx("button", { onClick: () => setOpen(false), style: { background: L.accentDim, border: `1px solid ${L.accentBorder}`, borderRadius: 6, color: L.textDim, cursor: "pointer", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }, children: "\u2715" })] }), _jsx("nav", { style: { flex: 1, overflowY: "auto", padding: "8px 10px" }, children: NAV.map(section => (_jsxs("div", { style: { marginBottom: 6 }, children: [_jsx("div", { style: { fontSize: 7, color: L.textMuted, letterSpacing: ".2em", fontFamily: "'Orbitron',monospace", padding: "10px 8px 5px" }, children: section.section }), section.items.map(item => (_jsxs("button", { onClick: () => go(item.path), style: { width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", background: "none", border: "1px solid transparent", borderRadius: 6, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }, onMouseEnter: e => { const b = e.currentTarget; b.style.background = L.accentDim; b.style.borderColor = L.accentBorder; }, onMouseLeave: e => { const b = e.currentTarget; b.style.background = "none"; b.style.borderColor = "transparent"; }, children: [_jsx("div", { style: { width: 32, height: 32, flexShrink: 0, background: L.accentDim, border: `1px solid ${L.accentBorder}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',monospace", fontSize: 13, color: L.accent }, children: item.icon }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: L.textSec, lineHeight: 1 }, children: item.label }), _jsx("div", { style: { fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: L.textMuted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: item.sub })] }), _jsx("span", { style: { fontSize: 10, color: L.accentBorder, flexShrink: 0 }, children: "\u203A" })] }, item.path)))] }, section.section))) }), _jsxs("div", { style: { padding: "12px 16px", borderTop: `1px solid ${L.divider}`, display: "flex", flexDirection: "column", gap: 6 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: L.success }), _jsx("span", { style: { fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: L.success, letterSpacing: ".12em" }, children: "LIVE \u00B7 CONNECTED" })] }), _jsx("div", { style: { fontSize: 7.5, color: L.textMuted, fontFamily: "'Share Tech Mono',monospace" }, children: "r3bel-production.up.railway.app" })] })] })] }));
}
// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
function ChatPanel({ onClose }) {
    const inputSt = {
        background: L.inputBg, border: `1px solid ${L.inputBorder}`, borderRadius: 6,
        padding: "8px 12px", color: L.text, fontFamily: "Share Tech Mono", fontSize: 12, outline: "none",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
    };
    const btnSt = {
        background: L.accent, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer",
        padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em",
        whiteSpace: "nowrap", transition: "all 0.2s", boxShadow: `0 2px 8px ${L.accent}44`,
    };
    const [msgs, setMsgs] = useState([{ role: "assistant", text: "REBEL ONLINE. Threat intelligence core active. Query the system." }]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);
    const mobile = useMobile();
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
    const send = async () => {
        if (!input.trim() || loading)
            return;
        const msg = input.trim();
        setInput("");
        setLoading(true);
        setMsgs(m => [...m, { role: "user", text: msg }]);
        try {
            const res = await fetch(`${API}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg }) });
            const data = await res.json();
            setMsgs(m => [...m, { role: "assistant", text: data.response || JSON.stringify(data) }]);
        }
        catch (e) {
            setMsgs(m => [...m, { role: "assistant", text: `[ERROR] ${e instanceof Error ? e.message : "Unknown"}` }]);
        }
        setLoading(false);
    };
    const chatBg = "#f8fafc";
    if (mobile) {
        return (_jsxs("div", { style: { position: "fixed", inset: 0, background: chatBg, zIndex: 200, display: "flex", flexDirection: "column" }, children: [_jsxs("div", { style: { padding: "14px 18px", borderBottom: `1px solid ${L.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "max(14px, env(safe-area-inset-top))", background: "#fff" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: L.accent }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: L.textDim }, children: "REBEL CHAT" })] }), _jsx("button", { onClick: onClose, style: { background: "none", border: "none", color: L.textMuted, cursor: "pointer", fontSize: 22, padding: 8 }, children: "\u2715" })] }), _jsxs("div", { style: { flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }, children: [msgs.map((m, i) => (_jsxs("div", { style: { alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", background: m.role === "user" ? L.accentDim : "#fff", border: `1px solid ${m.role === "user" ? L.accentBorder : L.divider}`, borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "2px 14px 14px 14px", padding: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }, children: [m.role === "assistant" && _jsx("div", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", color: L.accent, letterSpacing: "0.2em", marginBottom: 5 }, children: "REBEL" }), _jsx(MessageContent, { text: m.text, fontSize: 14 })] }, i))), loading && _jsx("div", { style: { display: "flex", gap: 5, padding: "10px 14px" }, children: [0, 1, 2].map(i => _jsx("span", { style: { width: 7, height: 7, borderRadius: "50%", background: L.accent, animation: `bounce 1s ease infinite ${i * 0.15}s` } }, i)) }), _jsx("div", { ref: bottomRef })] }), _jsxs("div", { style: { padding: "12px 14px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", borderTop: `1px solid ${L.divider}`, display: "flex", gap: 10, background: "#fff" }, children: [_jsx("input", { value: input, onChange: e => setInput(e.target.value), onKeyDown: e => e.key === "Enter" && send(), placeholder: "Query REBEL...", style: { ...inputSt, flex: 1, fontSize: 16, padding: "12px 14px" } }), _jsx("button", { onClick: send, disabled: loading, style: { ...btnSt, padding: "12px 18px", fontSize: 10 }, children: "SEND" })] })] }));
    }
    return (_jsxs("div", { style: { position: "fixed", right: 0, top: 0, bottom: 0, width: 400, background: chatBg, borderLeft: `1px solid ${L.panelBorder}`, display: "flex", flexDirection: "column", zIndex: 200, animation: "slideIn 0.28s ease", boxShadow: "-8px 0 40px rgba(14,165,233,0.08), -1px 0 0 rgba(14,165,233,0.1)" }, children: [_jsxs("div", { style: { padding: "13px 18px", borderBottom: `1px solid ${L.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: L.accent }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: L.textDim }, children: "REBEL CHAT" })] }), _jsx("button", { onClick: onClose, style: { background: "none", border: "none", color: L.textMuted, cursor: "pointer", fontSize: 16, padding: 4 }, children: "\u2715" })] }), _jsxs("div", { style: { flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 9 }, children: [msgs.map((m, i) => (_jsxs("div", { style: { alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", background: m.role === "user" ? L.accentDim : "#fff", border: `1px solid ${m.role === "user" ? L.accentBorder : L.divider}`, borderRadius: m.role === "user" ? "10px 10px 2px 10px" : "2px 10px 10px 10px", padding: "8px 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [m.role === "assistant" && _jsx("div", { style: { fontSize: 7, fontFamily: "'Orbitron',monospace", color: L.accent, letterSpacing: "0.2em", marginBottom: 4 }, children: "REBEL" }), _jsx(MessageContent, { text: m.text, fontSize: 12 })] }, i))), loading && _jsx("div", { style: { display: "flex", gap: 4, padding: "8px 12px" }, children: [0, 1, 2].map(i => _jsx("span", { style: { width: 5, height: 5, borderRadius: "50%", background: L.accent, animation: `bounce 1s ease infinite ${i * 0.15}s` } }, i)) }), _jsx("div", { ref: bottomRef })] }), _jsxs("div", { style: { padding: "11px 13px", borderTop: `1px solid ${L.divider}`, display: "flex", gap: 8, background: "#fff" }, children: [_jsx("input", { value: input, onChange: e => setInput(e.target.value), onKeyDown: e => e.key === "Enter" && send(), placeholder: "Query REBEL...", style: { ...inputSt, flex: 1 } }), _jsx("button", { onClick: send, disabled: loading, style: btnSt, children: "SEND" })] })] }));
}
// ─── MOBILE NAV ───────────────────────────────────────────────────────────────
function MobileNav({ onChat, onScan, chatOpen }) {
    return (_jsx("div", { style: { position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.97)", borderTop: `1px solid ${L.divider}`, display: "flex", zIndex: 150, paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -4px 24px rgba(14,165,233,0.08)" }, children: [
            { icon: "⬡", label: "SCAN", action: onScan, active: false },
            { icon: "⬡", label: "CHAT", action: onChat, active: chatOpen },
        ].map(item => (_jsxs("button", { onClick: item.action, style: { flex: 1, background: "none", border: "none", padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", borderTop: item.active ? `2px solid ${L.accent}` : "2px solid transparent" }, children: [_jsx("span", { style: { fontSize: 18, color: item.active ? L.accent : L.textMuted }, children: item.icon }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 8, color: item.active ? L.accent : L.textMuted, letterSpacing: "0.15em" }, children: item.label })] }, item.label))) }));
}
// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export default function RebelDashboard() {
    const S = {
        label: { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: "#1e3a5f", fontWeight: 600 },
        btn: { background: L.accent, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em", whiteSpace: "nowrap", transition: "all 0.2s", boxShadow: `0 2px 8px ${L.accent}44` },
        tabBtn: { background: "none", border: "none", cursor: "pointer", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.14em", padding: "8px 13px", transition: "all 0.2s" },
        spinner: { width: 13, height: 13, border: `2px solid ${L.accentDim}`, borderTop: `2px solid ${L.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
    };
    const [chatOpen, setChatOpen] = useState(false);
    const [scanOpen, setScanOpen] = useState(false);
    const [enrichTarget, setEnrichTarget] = useState(null);
    const [activeTab, setActiveTab] = useState("feed");
    const mobile = useMobile();
    const navigate = useNavigate();
    const [packets, setPackets] = useState([]);
    const [trafficHistory, setTrafficHistory] = useState(Array.from({ length: 40 }, (_, i) => ({ t: i, normal: 0, anomaly: 0 })));
    const [stats, setStats] = useState({ total: 0, anomalies: 0, blocked: 0, critical: 0 });
    const fetchPacket = useCallback(async () => {
        try {
            const res = await fetch(`${API}/latest_packet`);
            const pkt = await res.json();
            if (pkt.error || pkt.detail)
                return;
            const risk = pkt.risk_probability ?? 0;
            const label = risk > 0.6 ? "CRITICAL" : risk > 0.3 ? "HIGH" : "NORMAL";
            const color = SEV_COLOR[label];
            const row = { id: `P-${Date.now().toString(36).toUpperCase().slice(-6)}`, time: new Date().toISOString().slice(11, 19), src: pkt.ip_src, dst_port: pkt.dst_port, size: pkt.packet_size, risk, label, color, country: pkt.intel?.country ?? "??", org: pkt.intel?.org ?? "" };
            setPackets(prev => [row, ...prev].slice(0, 80));
            setTrafficHistory(prev => { const last = prev[prev.length - 1]; return [...prev.slice(1), { t: last.t + 1, normal: label === "NORMAL" ? pkt.packet_size : 0, anomaly: label !== "NORMAL" ? pkt.packet_size : 0 }]; });
            setStats(prev => ({ total: prev.total + 1, anomalies: prev.anomalies + (label !== "NORMAL" ? 1 : 0), blocked: prev.blocked + (label === "CRITICAL" ? 1 : 0), critical: prev.critical + (label === "CRITICAL" ? 1 : 0) }));
        }
        catch (_) { }
    }, []);
    useInterval(fetchPacket, 2000);
    useEffect(() => { fetchPacket(); }, []);
    useEffect(() => { if (!localStorage.getItem("access"))
        navigate("/login"); }, []);
    const anomalyRate = stats.total > 0 ? Math.round((stats.anomalies / stats.total) * 100) : 0;
    const riskScores = [
        { label: "Network", score: Math.min(99, anomalyRate * 2 + 15) },
        { label: "Endpoint", score: Math.min(99, stats.critical * 6 + 10) },
        { label: "Port 4444", score: Math.min(99, packets.filter(p => p.dst_port === 4444).length * 12 + 5) },
        { label: "Intel", score: Math.min(99, packets.filter(p => p.label === "CRITICAL").length * 7 + 8) },
        { label: "Anomaly", score: Math.min(99, anomalyRate + 20) },
    ];
    const overallRisk = Math.round(riskScores.reduce((a, c) => a + c.score, 0) / riskScores.length);
    const overallColor = overallRisk > 70 ? L.danger : overallRisk > 40 ? L.warning : L.success;
    const displayFeed = activeTab === "feed" ? packets.slice(0, 14) : packets.filter(p => p.label === "CRITICAL").slice(0, 14);
    const flaggedIPs = [...new Map(packets.filter(p => p.label !== "NORMAL").map(p => [p.src, p])).values()].slice(0, 8);
    return (_jsxs("div", { style: { minHeight: "100vh", background: L.pageBg, backgroundImage: L.pageGrad, fontFamily: "Share Tech Mono", color: L.text }, children: [_jsx("style", { children: `
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
      ` }), _jsx("div", { style: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }, children: _jsx("div", { style: { position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(14,165,233,0.06),transparent)", animation: "scanline 12s linear infinite" } }) }), _jsxs("nav", { style: { height: mobile ? 48 : 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: mobile ? "0 14px" : "0 24px", paddingTop: mobile ? "env(safe-area-inset-top)" : 0, borderBottom: `1px solid ${L.navBorder}`, background: L.navBg, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 rgba(14,165,233,0.08), 0 2px 16px rgba(0,0,0,0.04)" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: mobile ? 8 : 14 }, children: [_jsx(NavDrawer, {}), _jsxs("svg", { width: "22", height: "22", viewBox: "0 0 28 28", children: [_jsx("polygon", { points: "14,2 26,8 26,20 14,26 2,20 2,8", fill: "none", stroke: L.accent, strokeWidth: "1.5", style: { filter: `drop-shadow(0 0 3px ${L.accent}88)` } }), _jsx("polygon", { points: "14,7 21,11 21,17 14,21 7,17 7,11", fill: L.accentDim, stroke: L.accentBorder, strokeWidth: "1" }), _jsx("circle", { cx: "14", cy: "14", r: "3", fill: L.accent, style: { filter: `drop-shadow(0 0 4px ${L.accent})` } })] }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: mobile ? 15 : 17, color: L.text, letterSpacing: "0.22em" }, children: "REBEL" }), !mobile && (_jsxs(_Fragment, { children: [_jsx("div", { style: { width: 1, height: 18, background: L.divider } }), _jsx("span", { style: { fontSize: 8, color: "#334155", letterSpacing: "0.14em", fontWeight: 600 }, children: "THREAT INTELLIGENCE PLATFORM" })] }))] }), !mobile && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.22)", borderRadius: 20, padding: "4px 12px" }, children: [_jsx(Pulse, { color: L.success }), _jsxs("span", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", color: L.success, letterSpacing: "0.13em" }, children: ["LIVE \u00B7 ", API.replace("https://", "")] })] }), _jsx("button", { className: "ab", onClick: () => setScanOpen(true), style: { ...S.btn, padding: "7px 14px" }, children: "\u2B21 SCAN TARGET" }), _jsx("button", { className: "ab", onClick: () => setChatOpen(o => !o), style: { ...S.btn, padding: "7px 14px", background: chatOpen ? L.accentDark : L.accent, boxShadow: chatOpen ? `0 4px 16px ${L.accent}66` : `0 2px 8px ${L.accent}44` }, children: "\u2B21 QUERY REBEL" })] })), mobile && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx(Pulse, { color: L.success }), _jsx("span", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", color: L.success, letterSpacing: "0.1em" }, children: "LIVE" })] }))] }), _jsxs("div", { style: { padding: mobile ? "14px 12px 80px" : "18px 24px", display: "flex", flexDirection: "column", gap: mobile ? 12 : 16, marginRight: (!mobile && chatOpen) ? 400 : 0, transition: "margin-right 0.3s ease" }, children: [_jsx("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: mobile ? 8 : 10 }, children: [
                            { label: "PACKETS", value: stats.total.toLocaleString(), sub: "This session", color: L.accent, icon: "◈", bgTint: "rgba(14,165,233,0.06)" },
                            { label: "ANOMALIES", value: stats.anomalies, sub: `${anomalyRate}% rate`, color: L.warning, icon: "⚠", bgTint: "rgba(234,88,12,0.05)" },
                            { label: "CRITICAL", value: stats.critical, sub: "Immediate risk", color: L.danger, icon: "☢", bgTint: "rgba(220,38,38,0.05)" },
                            { label: "BLOCKED", value: stats.blocked, sub: "Auto-blocked", color: L.danger, icon: "⛔", bgTint: "rgba(220,38,38,0.05)" },
                            { label: "RISK", value: overallRisk, sub: overallRisk > 70 ? "ELEVATED" : overallRisk > 40 ? "MODERATE" : "LOW", color: overallColor, icon: "◉", bgTint: `${overallColor}08` },
                        ].map((m, i) => (_jsxs("div", { className: "panel", style: { padding: mobile ? "12px 14px" : "14px 16px", background: `linear-gradient(135deg, #fff 0%, ${m.bgTint} 100%)` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }, children: [_jsx("span", { style: { ...S.label, fontSize: mobile ? 7 : 8, color: "#1e3a5f", fontWeight: 700, letterSpacing: "0.12em" }, children: m.label }), _jsx("span", { style: { fontSize: mobile ? 11 : 13, color: m.color, opacity: 0.7 }, children: m.icon })] }), _jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: mobile ? 26 : 32, fontWeight: 700, color: m.color, lineHeight: 1, marginBottom: 4 }, children: m.value }), _jsx("div", { style: { fontSize: 8, color: "#475569", letterSpacing: "0.06em", fontWeight: 500 }, children: m.sub })] }, i))) }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: L.accent }), _jsx("span", { style: { ...S.label, fontSize: mobile ? 8 : 10 }, children: "LIVE TRAFFIC \u2014 ANOMALY DETECTION" })] }), !mobile && _jsx("div", { style: { display: "flex", gap: 14 }, children: [["NORMAL", L.accent], ["ANOMALY", L.danger]].map(([lbl, c]) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [_jsx("div", { style: { width: 18, height: 2, background: c, borderRadius: 1, boxShadow: `0 0 4px ${c}66` } }), _jsx("span", { style: { fontSize: 8, color: "#334155", letterSpacing: "0.12em", fontWeight: 600 }, children: lbl })] }, lbl))) })] }), _jsx("div", { style: { padding: "12px 4px 4px", background: "linear-gradient(180deg,rgba(14,165,233,0.02) 0%,transparent 100%)" }, children: _jsx(ResponsiveContainer, { width: "100%", height: mobile ? 120 : 160, children: _jsxs(AreaChart, { data: trafficHistory, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "gN", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: L.accent, stopOpacity: 0.15 }), _jsx("stop", { offset: "95%", stopColor: L.accent, stopOpacity: 0 })] }), _jsxs("linearGradient", { id: "gA", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: L.danger, stopOpacity: 0.15 }), _jsx("stop", { offset: "95%", stopColor: L.danger, stopOpacity: 0 })] })] }), _jsx(XAxis, { dataKey: "t", hide: true }), _jsx(YAxis, { tick: { fontSize: 8, fill: L.textMuted, fontFamily: "Share Tech Mono" }, axisLine: false, tickLine: false, width: 28 }), _jsx(Tooltip, { contentStyle: { background: "#fff", border: `1px solid ${L.panelBorder}`, borderRadius: 8, fontFamily: "Share Tech Mono", fontSize: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }, itemStyle: { color: L.textSec } }), _jsx(Area, { type: "monotone", dataKey: "normal", stroke: L.accent, strokeWidth: 1.5, fill: "url(#gN)", dot: false, isAnimationActive: false }), _jsx(Area, { type: "monotone", dataKey: "anomaly", stroke: L.danger, strokeWidth: 1.5, fill: "url(#gA)", dot: false, isAnimationActive: false })] }) }) })] }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsx("span", { style: S.label, children: "RISK SURFACE" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 22, color: overallColor }, children: overallRisk }), _jsx("span", { style: { fontSize: 9, color: "#334155", fontFamily: "Share Tech Mono", fontWeight: 600 }, children: "/ 100" })] })] }), _jsx("div", { style: { padding: "14px 8px", display: "flex", gap: mobile ? 6 : 5, justifyContent: mobile ? "space-around" : "center", overflowX: mobile ? "auto" : "visible", flexWrap: mobile ? "nowrap" : "wrap" }, children: riskScores.map(c => _jsx(RiskArc, { score: c.score, label: c.label }, c.label)) })] }), _jsx(WorldMapCard, { packets: packets }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsx("div", { style: { display: "flex" }, children: [["feed", "LIVE FEED"], ["critical", "CRITICAL"]].map(([id, label]) => (_jsx("button", { onClick: () => setActiveTab(id), style: { ...S.tabBtn, color: activeTab === id ? L.accent : L.textMuted, borderBottom: activeTab === id ? `2px solid ${L.accent}` : "2px solid transparent" }, children: label }, id))) }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx(Pulse, { color: L.danger }), _jsx("span", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", color: "#334155", letterSpacing: "0.1em", fontWeight: 600 }, children: "POLLING \u00B7 2s" })] })] }), mobile ? (_jsxs("div", { style: { maxHeight: 280, overflowY: "auto" }, children: [displayFeed.map((p, i) => (_jsxs("div", { className: "row fr", onClick: () => setEnrichTarget(p.src), style: { padding: "10px 14px", borderBottom: `1px solid ${L.divider}`, background: i === 0 && p.label === "CRITICAL" ? "rgba(220,38,38,0.03)" : "transparent" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }, children: [_jsxs("span", { style: { color: L.accent, fontSize: 10, fontFamily: "Share Tech Mono" }, children: [p.id, " \u00B7 ", p.time] }), _jsx("span", { style: { fontSize: 9, fontFamily: "'Orbitron',monospace", color: p.color, letterSpacing: "0.08em" }, children: p.label })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { style: { color: L.text, fontSize: 12 }, children: p.src }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [_jsx("div", { style: { width: 40, height: 3, background: L.divider, borderRadius: 2, overflow: "hidden" }, children: _jsx("div", { style: { width: `${p.risk * 100}%`, height: "100%", background: p.color, borderRadius: 2 } }) }), _jsxs("span", { style: { fontSize: 10, color: p.color }, children: [(p.risk * 100).toFixed(0), "%"] })] })] }), _jsxs("div", { style: { marginTop: 3, fontSize: 10, color: L.textDim }, children: [":", p.dst_port, " \u00B7 ", p.size, "B \u00B7 ", p.country] })] }, p.id))), displayFeed.length === 0 && _jsx("div", { style: { padding: 18, textAlign: "center", fontSize: 11, color: L.textMuted }, children: "Awaiting packets..." })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { style: { display: "grid", gridTemplateColumns: "72px 86px 118px 68px 62px 1fr 80px", padding: "7px 16px", borderBottom: `1px solid ${L.divider}`, background: L.pageBg }, children: ["ID", "TIME", "SRC IP", "DST PORT", "SIZE", "RISK", "STATUS"].map(h => (_jsx("span", { style: { fontSize: 7.5, color: "#1e3a5f", letterSpacing: "0.14em", fontFamily: "'Orbitron',monospace", fontWeight: 700 }, children: h }, h))) }), _jsxs("div", { style: { maxHeight: 268, overflowY: "auto" }, children: [displayFeed.map((p, i) => (_jsxs("div", { className: "row fr", onClick: () => setEnrichTarget(p.src), style: { display: "grid", gridTemplateColumns: "72px 86px 118px 68px 62px 1fr 80px", padding: "8px 16px", borderBottom: `1px solid ${L.divider}`, background: i === 0 && p.label === "CRITICAL" ? "rgba(220,38,38,0.025)" : "transparent", alignItems: "center" }, children: [_jsx("span", { style: { color: L.accent, fontSize: 10 }, children: p.id }), _jsx("span", { style: { color: "#475569", fontSize: 10 }, children: p.time }), _jsx("span", { style: { color: L.text, fontSize: 10 }, children: p.src }), _jsxs("span", { style: { color: "#475569", fontSize: 10 }, children: [":", p.dst_port] }), _jsxs("span", { style: { color: "#475569", fontSize: 10 }, children: [p.size, "B"] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [_jsx("div", { style: { width: 36, height: 3, background: L.divider, borderRadius: 2, overflow: "hidden" }, children: _jsx("div", { style: { width: `${p.risk * 100}%`, height: "100%", background: p.color, borderRadius: 2, transition: "width .4s" } }) }), _jsxs("span", { style: { fontSize: 9, color: p.color }, children: [(p.risk * 100).toFixed(0), "%"] })] }), _jsx("span", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", color: p.color, letterSpacing: "0.08em" }, children: p.label })] }, p.id))), displayFeed.length === 0 && _jsx("div", { style: { padding: 18, textAlign: "center", fontSize: 10, color: L.textMuted }, children: "Awaiting packets..." })] })] }))] }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsx("span", { style: S.label, children: "FLAGGED SOURCES" }), _jsx("button", { className: "ab", onClick: () => setEnrichTarget(""), style: { ...S.btn, fontSize: 8, padding: "5px 12px" }, children: "+ ENRICH IP" })] }), _jsxs("div", { style: { maxHeight: mobile ? 200 : 180, overflowY: "auto" }, children: [flaggedIPs.length === 0 && _jsx("div", { style: { padding: 14, fontSize: 11, color: L.textMuted }, children: "No flagged sources yet..." }), flaggedIPs.map(p => (_jsxs("div", { className: "row", onClick: () => setEnrichTarget(p.src), style: { display: "flex", alignItems: "center", gap: 10, padding: mobile ? "12px 16px" : "9px 16px", borderBottom: `1px solid ${L.divider}` }, children: [_jsx("div", { style: { width: 7, height: 7, borderRadius: "50%", background: p.color, boxShadow: `0 0 5px ${p.color}88`, flexShrink: 0 } }), _jsx("span", { style: { flex: 1, fontSize: mobile ? 13 : 11, color: L.text, fontFamily: "Share Tech Mono" }, children: p.src }), _jsx("span", { style: { fontSize: 10, color: L.textDim, fontFamily: "Share Tech Mono" }, children: p.country }), _jsx("span", { style: { fontSize: 9, fontFamily: "'Orbitron',monospace", color: p.color }, children: p.label }), _jsx("span", { style: { fontSize: 11, color: L.textMuted }, children: "\u2192" })] }, p.src)))] })] }), !mobile && (_jsxs("div", { className: "panel", children: [_jsx("div", { className: "ph", children: _jsx("span", { style: S.label, children: "BACKEND SERVICES" }) }), _jsx("div", { style: { padding: "10px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [
                                    { name: "/chat", ok: true }, { name: "/latest_packet", ok: packets.length > 0 },
                                    { name: "/enrich_ip", ok: true }, { name: "/scan-url", ok: true },
                                    { name: "/scan-crypto", ok: true }, { name: "/block_ip", ok: true },
                                ].map(s => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: s.ok ? "rgba(22,163,74,0.04)" : "rgba(220,38,38,0.04)", borderRadius: 6, border: `1px solid ${s.ok ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.12)"}` }, children: [_jsx("div", { style: { width: 6, height: 6, borderRadius: "50%", background: s.ok ? L.success : L.danger, boxShadow: `0 0 4px ${s.ok ? L.success : L.danger}88`, flexShrink: 0 } }), _jsx("span", { style: { flex: 1, fontSize: 10, color: L.textSec, fontFamily: "Share Tech Mono" }, children: s.name }), _jsx("span", { style: { fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: s.ok ? L.success : L.danger, letterSpacing: "0.1em" }, children: s.ok ? "ONLINE" : "DEGRADED" })] }, s.name))) })] })), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "6px 2px", borderTop: `1px solid ${L.divider}` }, children: [_jsx("span", { style: { fontSize: 7, color: L.textFaint, letterSpacing: "0.1em", fontFamily: "'Orbitron',monospace" }, children: "REBEL \u2014 RESTRICTED ACCESS" }), _jsx("span", { style: { fontSize: 7, color: L.textFaint, letterSpacing: "0.1em", fontFamily: "Share Tech Mono" }, children: API.replace("https://", "") })] })] }), mobile && _jsx(MobileNav, { onChat: () => setChatOpen(o => !o), onScan: () => setScanOpen(true), chatOpen: chatOpen }), scanOpen && _jsx(ScanModal, { onClose: () => setScanOpen(false) }), enrichTarget !== null && _jsx(IPEnrichModal, { ip: enrichTarget, onClose: () => setEnrichTarget(null) }), chatOpen && _jsx(ChatPanel, { onClose: () => setChatOpen(false) })] }));
}
