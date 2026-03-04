import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API = "https://r3bel-production.up.railway.app";
// ─── HELPERS ──────────────────────────────────────────────────────────────────
const SEV_COLOR = {
    CRITICAL: "#ef4444",
    HIGH: "#f97316",
    MEDIUM: "#eab308",
    LOW: "#22d3ee",
    NORMAL: "#22c55e",
};
function useInterval(fn, ms) {
    const ref = useRef(fn);
    useEffect(() => { ref.current = fn; }, [fn]);
    useEffect(() => {
        const id = setInterval(() => ref.current(), ms);
        return () => clearInterval(id);
    }, [ms]);
}
// ─── SCAN MODAL ───────────────────────────────────────────────────────────────
function ScanModal({ onClose }) {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [tab, setTab] = useState("url");
    const runScan = async () => {
        if (!url.trim())
            return;
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`${API}${tab === "url" ? "/scan-url" : "/scan-crypto"}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url.trim() }),
            });
            setResult(await res.json());
        }
        catch (e) {
            setResult({ error: e instanceof Error ? e.message : "Unknown error" });
        }
        setLoading(false);
    };
    const sc = (s) => s >= 70 ? "#22c55e" : s >= 40 ? "#eab308" : "#ef4444";
    return (_jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }, children: _jsxs("div", { style: { width: 560, background: "#0d1117", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 4, boxShadow: "0 0 60px rgba(59,130,246,0.15)" }, children: [_jsxs("div", { style: { padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { style: S.label, children: "ACTIVE SCAN" }), _jsx("button", { onClick: onClose, style: S.ghost, children: "\u2715" })] }), _jsxs("div", { style: { padding: 18, display: "flex", flexDirection: "column", gap: 12 }, children: [_jsx("div", { style: { display: "flex", borderBottom: "1px solid rgba(59,130,246,0.08)" }, children: [["url", "URL SCAN"], ["crypto", "CRYPTO / TLS"]].map(([id, label]) => (_jsx("button", { onClick: () => setTab(id), style: { ...S.tabBtn, color: tab === id ? "#3b82f6" : "rgba(200,220,255,0.3)", borderBottom: tab === id ? "2px solid #3b82f6" : "2px solid transparent" }, children: label }, id))) }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { value: url, onChange: e => setUrl(e.target.value), onKeyDown: e => e.key === "Enter" && runScan(), placeholder: "https://target.com", style: { ...S.input, flex: 1 } }), _jsx("button", { onClick: runScan, disabled: loading, style: S.btn, children: loading ? "SCANNING..." : "SCAN" })] }), loading && _jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [_jsx("div", { style: S.spinner }), _jsx("span", { style: { fontSize: 11, color: "rgba(200,220,255,0.4)", fontFamily: "Share Tech Mono" }, children: "Probing target..." })] }), result && !result.error && (_jsxs("div", { style: { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 3, padding: 14, display: "flex", flexDirection: "column", gap: 10 }, children: [result.score !== undefined && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: 38, color: sc(result.score), textShadow: `0 0 20px ${sc(result.score)}55` }, children: result.score }), _jsxs("div", { children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: 10, color: sc(result.score), letterSpacing: "0.15em" }, children: result.level?.toUpperCase() || "RISK" }), _jsx("div", { style: { fontSize: 11, color: "rgba(200,220,255,0.4)", marginTop: 2 }, children: result.domain || result.url })] })] })), result.tls_info?.tls_version && (_jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }, children: [
                                        ["TLS Version", result.tls_info.tls_version],
                                        ["Key Type", result.tls_info.key_type],
                                        ["Key Size", (result.tls_info.key_size ?? "?") + " bits"],
                                        ["Issuer", result.tls_info.issuer],
                                        ["Post-Quantum", result.tls_info.post_quantum ? "YES ✓" : "NO"],
                                        ["Self-Signed", result.tls_info.is_self_signed ? "YES ⚠" : "NO"],
                                    ].map(([k, v]) => (_jsxs("div", { style: { background: "rgba(255,255,255,0.03)", padding: "5px 9px", borderRadius: 2 }, children: [_jsx("div", { style: { fontSize: 7, color: "rgba(200,220,255,0.28)", letterSpacing: "0.12em", marginBottom: 2 }, children: k }), _jsx("div", { style: { fontSize: 11, color: "rgba(200,220,255,0.8)" }, children: v ?? "N/A" })] }, k))) })), result.vulnerabilities && (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 8, color: "rgba(200,220,255,0.28)", letterSpacing: "0.15em", marginBottom: 5 }, children: "VULNERABILITIES" }), result.vulnerabilities.missing_headers?.map((h) => _jsxs("div", { style: { fontSize: 10, color: "#f97316" }, children: ["\u26A0 ", h] }, h)), result.vulnerabilities.open_redirect_risk && _jsx("div", { style: { fontSize: 10, color: "#ef4444" }, children: "\u26A0 Open Redirect Risk" }), result.vulnerabilities.suspicious_url_patterns?.map((p) => _jsxs("div", { style: { fontSize: 10, color: "#eab308" }, children: ["\u26A0 ", p] }, p))] })), result.reasons?.map((r) => _jsxs("div", { style: { fontSize: 10, color: "#f97316" }, children: ["\u26A0 ", r] }, r)), result.explanation && _jsx("div", { style: { fontSize: 11, color: "rgba(200,220,255,0.58)", lineHeight: 1.7, borderTop: "1px solid rgba(59,130,246,0.08)", paddingTop: 10, fontFamily: "Share Tech Mono" }, children: result.explanation })] })), result?.error && _jsxs("div", { style: { fontSize: 11, color: "#ef4444", fontFamily: "Share Tech Mono" }, children: ["ERROR: ", result.error] })] })] }) }));
}
// ─── IP ENRICH MODAL ──────────────────────────────────────────────────────────
function IPEnrichModal({ ip: initIp, onClose }) {
    const [ip, setIp] = useState(initIp || "");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [blocked, setBlocked] = useState(false);
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
    const lc = { CRITICAL: "#ef4444", HIGH: "#f97316", LOW: "#22c55e" };
    return (_jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }, children: _jsxs("div", { style: { width: 500, background: "#0d1117", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 4, boxShadow: "0 0 60px rgba(59,130,246,0.15)" }, children: [_jsxs("div", { style: { padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { style: S.label, children: "IP INTELLIGENCE" }), _jsx("button", { onClick: onClose, style: S.ghost, children: "\u2715" })] }), _jsxs("div", { style: { padding: 18, display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { value: ip, onChange: e => setIp(e.target.value), onKeyDown: e => e.key === "Enter" && run(), placeholder: "x.x.x.x", style: { ...S.input, flex: 1 } }), _jsx("button", { onClick: () => run(), disabled: loading, style: S.btn, children: loading ? "..." : "ENRICH" })] }), loading && _jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [_jsx("div", { style: S.spinner }), _jsx("span", { style: { fontSize: 11, color: "rgba(200,220,255,0.4)", fontFamily: "Share Tech Mono" }, children: "Querying IPInfo + threat feeds..." })] }), result && !result.error && (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14 }, children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: 24, color: lc[result.label ?? ""] ?? "#eab308", textShadow: `0 0 20px ${lc[result.label ?? ""] ?? "#eab308"}55` }, children: result.label }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 11, color: "rgba(200,220,255,0.5)" }, children: result.action }), _jsxs("div", { style: { fontSize: 10, color: "rgba(200,220,255,0.35)" }, children: ["Confidence: ", result.confidence, " \u00B7 ", result.detected?.slice(0, 19).replace("T", " "), " UTC"] })] })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }, children: [
                                        ["Country", result.intel?.country],
                                        ["ASN", result.intel?.asn],
                                        ["Org", result.intel?.org],
                                        ["Anomaly Score", result.base_anomaly],
                                        ["Malicious Signals", result.intel?.malicious],
                                        ["Suspicious Signals", result.intel?.suspicious],
                                        ["Reputation Score", result.intel?.reputation],
                                        ["Financial Risk", result.financialRisk],
                                    ].map(([k, v]) => (_jsxs("div", { style: { background: "rgba(255,255,255,0.03)", padding: "5px 9px", borderRadius: 2 }, children: [_jsx("div", { style: { fontSize: 7, color: "rgba(200,220,255,0.28)", letterSpacing: "0.12em", marginBottom: 2 }, children: k }), _jsx("div", { style: { fontSize: 11, color: "rgba(200,220,255,0.8)" }, children: v ?? "-" })] }, k))) }), _jsx("button", { onClick: doBlock, disabled: blocked, style: { ...S.btn, background: blocked ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.12)", borderColor: blocked ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.35)", color: blocked ? "#22c55e" : "#ef4444", padding: "8px 0", width: "100%" }, children: blocked ? "✓ BLOCKED SUCCESSFULLY" : `⛔ BLOCK ${ip} NOW` })] })), result?.error && _jsxs("div", { style: { fontSize: 11, color: "#ef4444" }, children: ["ERROR: ", result.error] })] })] }) }));
}
// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
function ChatPanel({ onClose }) {
    const [msgs, setMsgs] = useState([{ role: "assistant", text: "REBEL ONLINE. Threat intelligence core active. Query the system." }]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);
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
    return (_jsxs("div", { style: { position: "fixed", right: 0, top: 0, bottom: 0, width: 400, background: "#0a0f1a", borderLeft: "1px solid rgba(59,130,246,0.18)", display: "flex", flexDirection: "column", zIndex: 200, animation: "slideIn 0.28s ease", boxShadow: "-18px 0 50px rgba(0,0,0,0.55)" }, children: [_jsxs("div", { style: { padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: "#3b82f6" }), _jsx("span", { style: S.label, children: "REBEL CHAT" })] }), _jsx("button", { onClick: onClose, style: S.ghost, children: "\u2715" })] }), _jsxs("div", { style: { flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 9 }, children: [msgs.map((m, i) => (_jsxs("div", { style: { alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", background: m.role === "user" ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.035)", border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.28)" : "rgba(255,255,255,0.055)"}`, borderRadius: m.role === "user" ? "10px 10px 2px 10px" : "2px 10px 10px 10px", padding: "8px 12px" }, children: [m.role === "assistant" && _jsx("div", { style: { fontSize: 7, fontFamily: "'Orbitron',monospace", color: "#3b82f6", letterSpacing: "0.2em", marginBottom: 4 }, children: "REBEL" }), _jsx("p", { style: { margin: 0, fontFamily: "Share Tech Mono", fontSize: 12, color: "rgba(200,220,255,0.85)", lineHeight: 1.7, whiteSpace: "pre-wrap" }, children: m.text })] }, i))), loading && _jsx("div", { style: { display: "flex", gap: 4, padding: "8px 12px" }, children: [0, 1, 2].map(i => _jsx("span", { style: { width: 5, height: 5, borderRadius: "50%", background: "#3b82f6", animation: `bounce 1s ease infinite ${i * 0.15}s` } }, i)) }), _jsx("div", { ref: bottomRef })] }), _jsxs("div", { style: { padding: "11px 13px", borderTop: "1px solid rgba(59,130,246,0.1)", display: "flex", gap: 8 }, children: [_jsx("input", { value: input, onChange: e => setInput(e.target.value), onKeyDown: e => e.key === "Enter" && send(), placeholder: "Query REBEL...", style: { ...S.input, flex: 1 } }), _jsx("button", { onClick: send, disabled: loading, style: S.btn, children: "SEND" })] })] }));
}
// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
function Pulse({ color = "#3b82f6" }) {
    return (_jsxs("span", { style: { position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }, children: [_jsx("span", { style: { position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.5, animation: "ping 1.4s ease infinite" } }), _jsx("span", { style: { width: 8, height: 8, borderRadius: "50%", background: color, display: "block", boxShadow: `0 0 5px ${color}` } })] }));
}
function RiskArc({ score, label }) {
    const r = 36, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
    const color = score > 80 ? "#ef4444" : score > 60 ? "#f97316" : score > 40 ? "#eab308" : "#3b82f6";
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }, children: [_jsxs("svg", { width: "82", height: "82", viewBox: "0 0 100 100", children: [_jsx("circle", { cx: "50", cy: "50", r: r, fill: "none", stroke: "rgba(255,255,255,0.05)", strokeWidth: "8" }), _jsx("circle", { cx: "50", cy: "50", r: r, fill: "none", stroke: color, strokeWidth: "8", strokeDasharray: `${dash} ${circ}`, strokeLinecap: "round", transform: "rotate(-90 50 50)", style: { transition: "stroke-dasharray 1s ease", filter: `drop-shadow(0 0 5px ${color})` } }), _jsx("text", { x: "50", y: "54", textAnchor: "middle", fill: color, fontSize: "16", fontFamily: "Orbitron", fontWeight: "700", children: score })] }), _jsx("span", { style: { fontSize: 8, color: "rgba(200,220,255,0.38)", letterSpacing: "0.1em", fontFamily: "Share Tech Mono", textTransform: "uppercase" }, children: label })] }));
}
// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
    label: { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: "rgba(200,220,255,0.62)" },
    ghost: { background: "none", border: "none", color: "rgba(200,220,255,0.32)", cursor: "pointer", fontSize: 16, padding: 4 },
    input: { background: "rgba(255,255,255,0.035)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 3, padding: "8px 12px", color: "rgba(200,220,255,0.9)", fontFamily: "Share Tech Mono", fontSize: 12, outline: "none" },
    btn: { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.32)", borderRadius: 3, color: "#3b82f6", cursor: "pointer", padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em", whiteSpace: "nowrap", transition: "all 0.2s" },
    tabBtn: { background: "none", border: "none", cursor: "pointer", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.14em", padding: "5px 13px", transition: "all 0.2s" },
    spinner: { width: 13, height: 13, border: "2px solid rgba(59,130,246,0.15)", borderTop: "2px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};
// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export default function RebelDashboard() {
    const [chatOpen, setChatOpen] = useState(false);
    const [scanOpen, setScanOpen] = useState(false);
    const [enrichTarget, setEnrichTarget] = useState(null);
    const [activeTab, setActiveTab] = useState("feed");
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
            const row = {
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
        }
        catch (_) { /* silent */ }
    }, []);
    useInterval(fetchPacket, 2000);
    useEffect(() => { fetchPacket(); }, []);
    const anomalyRate = stats.total > 0 ? Math.round((stats.anomalies / stats.total) * 100) : 0;
    const riskScores = [
        { label: "Network", score: Math.min(99, anomalyRate * 2 + 15) },
        { label: "Endpoint", score: Math.min(99, stats.critical * 6 + 10) },
        { label: "Port 4444", score: Math.min(99, packets.filter(p => p.dst_port === 4444).length * 12 + 5) },
        { label: "Intel", score: Math.min(99, packets.filter(p => p.label === "CRITICAL").length * 7 + 8) },
        { label: "Anomaly", score: Math.min(99, anomalyRate + 20) },
    ];
    const overallRisk = Math.round(riskScores.reduce((a, c) => a + c.score, 0) / riskScores.length);
    const overallColor = overallRisk > 70 ? "#ef4444" : overallRisk > 40 ? "#f97316" : "#22c55e";
    const displayFeed = activeTab === "feed" ? packets.slice(0, 14) : packets.filter(p => p.label === "CRITICAL").slice(0, 14);
    const flaggedIPs = [...new Map(packets.filter(p => p.label !== "NORMAL").map(p => [p.src, p])).values()].slice(0, 8);
    return (_jsxs("div", { style: { minHeight: "100vh", background: "#080c14", fontFamily: "Share Tech Mono", color: "rgba(200,220,255,0.85)", backgroundImage: "radial-gradient(ellipse at 15% 50%, rgba(59,130,246,0.03) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(37,99,235,0.045) 0%, transparent 50%)" }, children: [_jsx("style", { children: `
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
      ` }), _jsx("div", { style: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }, children: _jsx("div", { style: { position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.09),transparent)", animation: "scanline 10s linear infinite" } }) }), _jsxs("nav", { style: { height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", borderBottom: "1px solid rgba(59,130,246,0.09)", background: "rgba(8,12,20,0.96)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 28 28", children: [_jsx("polygon", { points: "14,2 26,8 26,20 14,26 2,20 2,8", fill: "none", stroke: "#3b82f6", strokeWidth: "1.5", style: { filter: "drop-shadow(0 0 4px #3b82f6)" } }), _jsx("polygon", { points: "14,7 21,11 21,17 14,21 7,17 7,11", fill: "rgba(59,130,246,0.1)", stroke: "rgba(59,130,246,0.35)", strokeWidth: "1" }), _jsx("circle", { cx: "14", cy: "14", r: "3", fill: "#3b82f6", style: { filter: "drop-shadow(0 0 5px #3b82f6)" } })] }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 16, color: "#fff", letterSpacing: "0.22em" }, children: "REBEL" }), _jsx("div", { style: { width: 1, height: 18, background: "rgba(59,130,246,0.18)" } }), _jsx("span", { style: { fontSize: 8, color: "rgba(200,220,255,0.27)", letterSpacing: "0.14em" }, children: "THREAT INTELLIGENCE PLATFORM" })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.16)", borderRadius: 2, padding: "4px 10px" }, children: [_jsx(Pulse, { color: "#22c55e" }), _jsxs("span", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", color: "#22c55e", letterSpacing: "0.13em" }, children: ["LIVE \u00B7 ", API.replace("https://", "")] })] }), _jsx("button", { className: "ab", onClick: () => setScanOpen(true), style: { ...S.btn, padding: "6px 13px" }, children: "\u2B21 SCAN TARGET" }), _jsx("button", { className: "ab", onClick: () => setChatOpen(o => !o), style: { ...S.btn, padding: "6px 13px", background: chatOpen ? "rgba(59,130,246,0.16)" : "rgba(59,130,246,0.06)", boxShadow: chatOpen ? "0 0 14px rgba(59,130,246,0.22)" : "none" }, children: "\u2B21 QUERY REBEL" })] })] }), _jsxs("div", { style: { padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14, marginRight: chatOpen ? 400 : 0, transition: "margin-right 0.3s ease" }, children: [_jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 9 }, children: [
                            { label: "PACKETS SEEN", value: stats.total.toLocaleString(), sub: "This session", color: "#3b82f6", icon: "◈" },
                            { label: "ANOMALIES", value: stats.anomalies, sub: `${anomalyRate}% rate`, color: "#f97316", icon: "⚠" },
                            { label: "CRITICAL", value: stats.critical, sub: "Immediate risk", color: "#ef4444", icon: "☢" },
                            { label: "AUTO-BLOCKED", value: stats.blocked, sub: "By REBEL firewall", color: "#ef4444", icon: "⛔" },
                            { label: "OVERALL RISK", value: overallRisk, sub: overallRisk > 70 ? "ELEVATED" : overallRisk > 40 ? "MODERATE" : "LOW", color: overallColor, icon: "◉" },
                        ].map((m, i) => (_jsxs("div", { className: "panel", style: { padding: "12px 14px" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }, children: [_jsx("span", { style: { ...S.label, fontSize: 7.5 }, children: m.label }), _jsx("span", { style: { fontSize: 12, color: m.color, opacity: 0.65 }, children: m.icon })] }), _jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: 30, fontWeight: 700, color: m.color, lineHeight: 1, marginBottom: 3, textShadow: `0 0 16px ${m.color}44` }, children: m.value }), _jsx("div", { style: { fontSize: 8.5, color: "rgba(200,220,255,0.25)", letterSpacing: "0.08em" }, children: m.sub })] }, i))) }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 12 }, children: [_jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: "#3b82f6" }), _jsx("span", { style: S.label, children: "LIVE TRAFFIC \u2014 ANOMALY DETECTION" })] }), _jsx("div", { style: { display: "flex", gap: 12 }, children: [["NORMAL", "#3b82f6"], ["ANOMALY", "#ef4444"]].map(([l, c]) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("div", { style: { width: 18, height: 2, background: c, boxShadow: `0 0 4px ${c}` } }), _jsx("span", { style: { fontSize: 7.5, color: "rgba(200,220,255,0.3)", letterSpacing: "0.12em" }, children: l })] }, l))) })] }), _jsx("div", { style: { padding: "12px 4px 4px" }, children: _jsx(ResponsiveContainer, { width: "100%", height: 160, children: _jsxs(AreaChart, { data: trafficHistory, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "gN", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#3b82f6", stopOpacity: 0.14 }), _jsx("stop", { offset: "95%", stopColor: "#3b82f6", stopOpacity: 0 })] }), _jsxs("linearGradient", { id: "gA", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#ef4444", stopOpacity: 0.18 }), _jsx("stop", { offset: "95%", stopColor: "#ef4444", stopOpacity: 0 })] })] }), _jsx(XAxis, { dataKey: "t", hide: true }), _jsx(YAxis, { tick: { fontSize: 8, fill: "rgba(200,220,255,0.22)", fontFamily: "Share Tech Mono" }, axisLine: false, tickLine: false }), _jsx(Tooltip, { contentStyle: { background: "#0d1117", border: "1px solid rgba(59,130,246,0.22)", borderRadius: 2, fontFamily: "Share Tech Mono", fontSize: 10 }, itemStyle: { color: "rgba(200,220,255,0.75)" } }), _jsx(Area, { type: "monotone", dataKey: "normal", stroke: "#3b82f6", strokeWidth: 1.5, fill: "url(#gN)", dot: false, isAnimationActive: false }), _jsx(Area, { type: "monotone", dataKey: "anomaly", stroke: "#ef4444", strokeWidth: 1.5, fill: "url(#gA)", dot: false, isAnimationActive: false })] }) }) })] }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsx("span", { style: S.label, children: "RISK SURFACE" }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 22, color: overallColor, textShadow: `0 0 16px ${overallColor}` }, children: overallRisk })] }), _jsx("div", { style: { padding: "14px 8px", display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }, children: riskScores.map(c => _jsx(RiskArc, { score: c.score, label: c.label }, c.label)) })] })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 380px", gap: 12 }, children: [_jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsx("div", { style: { display: "flex" }, children: [["feed", "LIVE FEED"], ["critical", "CRITICAL ONLY"]].map(([id, label]) => (_jsx("button", { onClick: () => setActiveTab(id), style: { ...S.tabBtn, color: activeTab === id ? "#3b82f6" : "rgba(200,220,255,0.28)", borderBottom: activeTab === id ? "2px solid #3b82f6" : "2px solid transparent" }, children: label }, id))) }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx(Pulse, { color: "#ef4444" }), _jsx("span", { style: { fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: "rgba(200,220,255,0.28)", letterSpacing: "0.1em" }, children: "POLLING \u00B7 2s" })] })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "72px 86px 118px 68px 62px 1fr 80px", padding: "6px 13px", borderBottom: "1px solid rgba(59,130,246,0.06)" }, children: ["ID", "TIME", "SRC IP", "DST PORT", "SIZE", "RISK", "STATUS"].map(h => (_jsx("span", { style: { fontSize: 7, color: "rgba(200,220,255,0.26)", letterSpacing: "0.14em", fontFamily: "'Orbitron',monospace" }, children: h }, h))) }), _jsxs("div", { style: { maxHeight: 268, overflowY: "auto" }, children: [displayFeed.map((p, i) => (_jsxs("div", { className: "row fr", onClick: () => setEnrichTarget(p.src), style: { display: "grid", gridTemplateColumns: "72px 86px 118px 68px 62px 1fr 80px", padding: "8px 13px", borderBottom: "1px solid rgba(59,130,246,0.035)", background: i === 0 && p.label === "CRITICAL" ? "rgba(239,68,68,0.035)" : "transparent", alignItems: "center" }, children: [_jsx("span", { style: { color: "#3b82f6", fontSize: 10 }, children: p.id }), _jsx("span", { style: { color: "rgba(200,220,255,0.35)", fontSize: 10 }, children: p.time }), _jsx("span", { style: { color: "rgba(200,220,255,0.7)", fontSize: 10 }, children: p.src }), _jsxs("span", { style: { color: "rgba(200,220,255,0.45)", fontSize: 10 }, children: [":", p.dst_port] }), _jsxs("span", { style: { color: "rgba(200,220,255,0.38)", fontSize: 10 }, children: [p.size, "B"] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("div", { style: { width: 30, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }, children: _jsx("div", { style: { width: `${p.risk * 100}%`, height: "100%", background: p.color, transition: "width .4s" } }) }), _jsxs("span", { style: { fontSize: 9, color: p.color }, children: [(p.risk * 100).toFixed(0), "%"] })] }), _jsx("span", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", color: p.color, letterSpacing: "0.08em" }, children: p.label })] }, p.id))), displayFeed.length === 0 && _jsxs("div", { style: { padding: 18, textAlign: "center", fontSize: 10, color: "rgba(200,220,255,0.18)" }, children: ["Awaiting packets from ", API, "..."] })] })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("div", { className: "panel", style: { flex: 1 }, children: [_jsxs("div", { className: "ph", children: [_jsx("span", { style: S.label, children: "FLAGGED SOURCES" }), _jsx("button", { className: "ab", onClick: () => setEnrichTarget(""), style: { ...S.btn, fontSize: 8, padding: "3px 9px" }, children: "+ ENRICH IP" })] }), _jsxs("div", { style: { maxHeight: 180, overflowY: "auto" }, children: [flaggedIPs.length === 0 && _jsx("div", { style: { padding: 14, fontSize: 10, color: "rgba(200,220,255,0.18)" }, children: "No flagged sources yet..." }), flaggedIPs.map(p => (_jsxs("div", { className: "row", onClick: () => setEnrichTarget(p.src), style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 13px", borderBottom: "1px solid rgba(59,130,246,0.04)" }, children: [_jsx("div", { style: { width: 5, height: 5, borderRadius: "50%", background: p.color, boxShadow: `0 0 4px ${p.color}`, flexShrink: 0 } }), _jsx("span", { style: { flex: 1, fontSize: 11, color: "rgba(200,220,255,0.68)" }, children: p.src }), _jsx("span", { style: { fontSize: 9, color: "rgba(200,220,255,0.28)" }, children: p.country }), _jsx("span", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", color: p.color }, children: p.label }), _jsx("span", { style: { fontSize: 9, color: "rgba(200,220,255,0.2)" }, children: "\u2192" })] }, p.src)))] })] }), _jsxs("div", { className: "panel", children: [_jsx("div", { className: "ph", children: _jsx("span", { style: S.label, children: "BACKEND SERVICES" }) }), _jsx("div", { style: { padding: "9px 13px", display: "flex", flexDirection: "column", gap: 7 }, children: [
                                                    { name: "/chat", ok: true },
                                                    { name: "/latest_packet", ok: packets.length > 0 },
                                                    { name: "/enrich_ip", ok: true },
                                                    { name: "/scan-url", ok: true },
                                                    { name: "/scan-crypto", ok: true },
                                                    { name: "/block_ip", ok: true },
                                                    { name: "/predict_anomaly", ok: true },
                                                ].map(s => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 7 }, children: [_jsx("div", { style: { width: 5, height: 5, borderRadius: "50%", background: s.ok ? "#22c55e" : "#ef4444", boxShadow: `0 0 4px ${s.ok ? "#22c55e" : "#ef4444"}`, flexShrink: 0 } }), _jsx("span", { style: { flex: 1, fontSize: 10, color: "rgba(200,220,255,0.5)", fontFamily: "Share Tech Mono" }, children: s.name }), _jsx("span", { style: { fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: s.ok ? "#22c55e" : "#ef4444", letterSpacing: "0.1em" }, children: s.ok ? "ONLINE" : "DEGRADED" })] }, s.name))) })] })] })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: "1px solid rgba(59,130,246,0.06)" }, children: [_jsx("span", { style: { fontSize: 7.5, color: "rgba(200,220,255,0.16)", letterSpacing: "0.13em" }, children: "REBEL SECURITY INTELLIGENCE PLATFORM \u2014 RESTRICTED ACCESS" }), _jsx("span", { style: { fontSize: 7.5, color: "rgba(200,220,255,0.16)", letterSpacing: "0.13em" }, children: API })] })] }), scanOpen && _jsx(ScanModal, { onClose: () => setScanOpen(false) }), enrichTarget !== null && _jsx(IPEnrichModal, { ip: enrichTarget, onClose: () => setEnrichTarget(null) }), chatOpen && _jsx(ChatPanel, { onClose: () => setChatOpen(false) })] }));
}
