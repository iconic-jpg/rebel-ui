import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
const API = "https://r3bel-production.up.railway.app";
const SEV_COLOR = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#22d3ee", NORMAL: "#22c55e" };
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
// ─── SCAN MODAL ───────────────────────────────────────────────────────────────
function ScanModal({ onClose }) {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [tab, setTab] = useState("url");
    const mobile = useMobile();
    const navigate = useNavigate();
    const DJANGO_API = "https://thriftstore-backend.onrender.com";
    const runScan = async () => {
        if (!url.trim())
            return;
        // ── Check auth before scanning ──
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
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
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
    return (_jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", backdropFilter: "blur(4px)" }, children: _jsxs("div", { style: { width: mobile ? "100%" : 560, maxHeight: mobile ? "92vh" : "90vh", background: "#0d1117", border: "1px solid rgba(59,130,246,0.25)", borderRadius: mobile ? "12px 12px 0 0" : 4, boxShadow: "0 0 60px rgba(59,130,246,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }, children: [_jsxs("div", { style: { padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }, children: [_jsx("span", { style: S.label, children: "ACTIVE SCAN" }), _jsx("button", { onClick: onClose, style: S.ghost, children: "\u2715" })] }), _jsxs("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }, children: [_jsx("div", { style: { display: "flex", borderBottom: "1px solid rgba(59,130,246,0.08)" }, children: [["url", "URL SCAN"], ["crypto", "CRYPTO / TLS"]].map(([id, label]) => (_jsx("button", { onClick: () => setTab(id), style: { ...S.tabBtn, color: tab === id ? "#3b82f6" : "rgba(200,220,255,0.3)", borderBottom: tab === id ? "2px solid #3b82f6" : "2px solid transparent", flex: 1 }, children: label }, id))) }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { value: url, onChange: e => setUrl(e.target.value), onKeyDown: e => e.key === "Enter" && runScan(), placeholder: "https://target.com", style: { ...S.input, flex: 1, fontSize: 14 } }), _jsx("button", { onClick: runScan, disabled: loading, style: { ...S.btn, padding: "10px 16px" }, children: loading ? "..." : "SCAN" })] }), loading && _jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [_jsx("div", { style: S.spinner }), _jsx("span", { style: { fontSize: 11, color: "rgba(200,220,255,0.4)", fontFamily: "Share Tech Mono" }, children: "Probing target..." })] }), result && !result.error && (_jsxs("div", { style: { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 3, padding: 14, display: "flex", flexDirection: "column", gap: 10 }, children: [result.score !== undefined && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: 42, color: sc(result.score), textShadow: `0 0 20px ${sc(result.score)}55` }, children: result.score }), _jsxs("div", { children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: 11, color: sc(result.score), letterSpacing: "0.15em" }, children: result.level?.toUpperCase() || "RISK" }), _jsx("div", { style: { fontSize: 11, color: "rgba(200,220,255,0.4)", marginTop: 2 }, children: result.domain || result.url })] })] })), result.tls_info?.tls_version && (_jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }, children: [["TLS Version", result.tls_info.tls_version], ["Key Type", result.tls_info.key_type], ["Key Size", (result.tls_info.key_size ?? "?") + " bits"], ["Issuer", result.tls_info.issuer], ["Post-Quantum", result.tls_info.post_quantum ? "YES ✓" : "NO"], ["Self-Signed", result.tls_info.is_self_signed ? "YES ⚠" : "NO"]].map(([k, v]) => (_jsxs("div", { style: { background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: 2 }, children: [_jsx("div", { style: { fontSize: 8, color: "rgba(200,220,255,0.28)", letterSpacing: "0.1em", marginBottom: 2 }, children: k }), _jsx("div", { style: { fontSize: 12, color: "rgba(200,220,255,0.8)" }, children: v ?? "N/A" })] }, k))) })), result.vulnerabilities && (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 9, color: "rgba(200,220,255,0.28)", letterSpacing: "0.15em", marginBottom: 6 }, children: "VULNERABILITIES" }), result.vulnerabilities.missing_headers?.map((h) => _jsxs("div", { style: { fontSize: 12, color: "#f97316", padding: "2px 0" }, children: ["\u26A0 ", h] }, h)), result.vulnerabilities.open_redirect_risk && _jsx("div", { style: { fontSize: 12, color: "#ef4444" }, children: "\u26A0 Open Redirect Risk" }), result.vulnerabilities.suspicious_url_patterns?.map((p) => _jsxs("div", { style: { fontSize: 12, color: "#eab308" }, children: ["\u26A0 ", p] }, p))] })), result.reasons?.map((r) => _jsxs("div", { style: { fontSize: 12, color: "#f97316" }, children: ["\u26A0 ", r] }, r)), result.explanation && _jsx("div", { style: { fontSize: 12, color: "rgba(200,220,255,0.58)", lineHeight: 1.7, borderTop: "1px solid rgba(59,130,246,0.08)", paddingTop: 10, fontFamily: "Share Tech Mono" }, children: result.explanation })] })), result?.error && _jsxs("div", { style: { fontSize: 12, color: "#ef4444", fontFamily: "Share Tech Mono" }, children: ["ERROR: ", result.error] })] })] }) }));
}
// ─── WORLD MAP CARD ───────────────────────────────────────────────────────────
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
    const project = (lat, lng, W, H) => ({
        x: ((lng + 180) / 360) * W,
        y: ((90 - lat) / 180) * H,
    });
    const jitter = (id, range) => {
        let h = 0;
        for (let i = 0; i < id.length; i++)
            h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
        return ((h & 0xffff) / 0xffff - 0.5) * range;
    };
    // Load map image once
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
        ctx.fillStyle = "#080c14";
        ctx.fillRect(0, 0, W, H);
        // Draw map image if loaded
        if (imgRef.current) {
            ctx.globalAlpha = 0.25;
            ctx.drawImage(imgRef.current, 0, 0, W, H);
            ctx.globalAlpha = 1;
        }
        // Grid
        ctx.strokeStyle = "rgba(59,130,246,0.06)";
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
            const cpx = (src.x + tgt.x) / 2;
            const cpy = Math.min(src.y, tgt.y) - Math.abs(src.x - tgt.x) * 0.22 - 15;
            ctx.quadraticCurveTo(cpx, cpy, tgt.x, tgt.y);
            ctx.strokeStyle = p.color + "55";
            ctx.lineWidth = 0.8;
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
            ctx.fillStyle = "rgba(200,220,255,0.5)";
            ctx.font = `${mobile ? 7 : 8}px Share Tech Mono`;
            ctx.fillText(p.country, src.x + 5, src.y - 3);
        });
        // Target rings
        [14, 9].forEach((r, i) => {
            ctx.beginPath();
            ctx.arc(tgt.x, tgt.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(34,197,94,${i === 0 ? 0.15 : 0.35})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        });
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#22c55e";
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(34,197,94,0.8)";
        ctx.font = "8px Share Tech Mono";
        ctx.fillText("TARGET", tgt.x + 8, tgt.y + 3);
    }, [packets, mapLoaded, mobile]);
    const attackerCount = packets.filter(p => p.label !== "NORMAL").slice(0, 25).length;
    return (_jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: "#ef4444" }), _jsx("span", { style: S.label, children: "GLOBAL THREAT MAP" })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [[["ATTACKER", "#ef4444"], ["TARGET", "#22c55e"]].map(([l, c]) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("div", { style: { width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: `0 0 4px ${c}` } }), _jsx("span", { style: { fontSize: 7.5, color: "rgba(200,220,255,0.3)", letterSpacing: "0.12em", fontFamily: "'Orbitron',monospace" }, children: l })] }, l))), _jsxs("span", { style: { fontSize: 7.5, color: "rgba(200,220,255,0.2)", fontFamily: "Share Tech Mono" }, children: [attackerCount, " ACTIVE SOURCES"] })] })] }), _jsxs("div", { style: { position: "relative" }, children: [_jsx("canvas", { ref: canvasRef, width: 800, height: mobile ? 200 : 360, style: { width: "100%", height: mobile ? 200 : 360, display: "block" } }), !mapLoaded && (_jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(200,220,255,0.18)", fontFamily: "Share Tech Mono" }, children: "LOADING MAP..." })), mapLoaded && attackerCount === 0 && (_jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(200,220,255,0.18)", fontFamily: "Share Tech Mono", letterSpacing: "0.1em" }, children: "AWAITING THREAT DATA..." }))] })] }));
}
// ─── IP ENRICH MODAL ──────────────────────────────────────────────────────────
function IPEnrichModal({ ip: initIp, onClose }) {
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
    const lc = { CRITICAL: "#ef4444", HIGH: "#f97316", LOW: "#22c55e" };
    return (_jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", backdropFilter: "blur(4px)" }, children: _jsxs("div", { style: { width: mobile ? "100%" : 500, maxHeight: mobile ? "92vh" : "90vh", background: "#0d1117", border: "1px solid rgba(59,130,246,0.25)", borderRadius: mobile ? "12px 12px 0 0" : 4, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 0 60px rgba(59,130,246,0.15)" }, children: [_jsxs("div", { style: { padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }, children: [_jsx("span", { style: S.label, children: "IP INTELLIGENCE" }), _jsx("button", { onClick: onClose, style: S.ghost, children: "\u2715" })] }), _jsxs("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }, children: [_jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { value: ip, onChange: e => setIp(e.target.value), onKeyDown: e => e.key === "Enter" && run(), placeholder: "x.x.x.x", style: { ...S.input, flex: 1, fontSize: 14 } }), _jsx("button", { onClick: () => run(), disabled: loading, style: { ...S.btn, padding: "10px 16px" }, children: loading ? "..." : "ENRICH" })] }), loading && _jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [_jsx("div", { style: S.spinner }), _jsx("span", { style: { fontSize: 11, color: "rgba(200,220,255,0.4)", fontFamily: "Share Tech Mono" }, children: "Querying threat feeds..." })] }), result && !result.error && (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14 }, children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: 26, color: lc[result.label ?? ""] ?? "#eab308", textShadow: `0 0 20px ${lc[result.label ?? ""] ?? "#eab308"}55` }, children: result.label }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: "rgba(200,220,255,0.5)" }, children: result.action }), _jsxs("div", { style: { fontSize: 11, color: "rgba(200,220,255,0.35)" }, children: ["Confidence: ", result.confidence] })] })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }, children: [["Country", result.intel?.country], ["ASN", result.intel?.asn], ["Org", result.intel?.org], ["Anomaly", result.base_anomaly], ["Malicious", result.intel?.malicious], ["Suspicious", result.intel?.suspicious], ["Reputation", result.intel?.reputation], ["Financial Risk", result.financialRisk]].map(([k, v]) => (_jsxs("div", { style: { background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: 2 }, children: [_jsx("div", { style: { fontSize: 8, color: "rgba(200,220,255,0.28)", letterSpacing: "0.1em", marginBottom: 2 }, children: k }), _jsx("div", { style: { fontSize: 12, color: "rgba(200,220,255,0.8)" }, children: v ?? "-" })] }, k))) }), _jsx("button", { onClick: doBlock, disabled: blocked, style: { ...S.btn, background: blocked ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.12)", borderColor: blocked ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.35)", color: blocked ? "#22c55e" : "#ef4444", padding: "12px 0", width: "100%", fontSize: 11 }, children: blocked ? "✓ BLOCKED SUCCESSFULLY" : `⛔ BLOCK ${ip} NOW` })] })), result?.error && _jsxs("div", { style: { fontSize: 12, color: "#ef4444" }, children: ["ERROR: ", result.error] })] })] }) }));
}
function NavDrawer() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const go = (path) => { navigate(path); setOpen(false); };
    const NAV = [
        { section: "CORE",
            items: [
                { path: "/", icon: "⬡", label: "Dashboard", sub: "Live threat feed" },
            ]
        },
        { section: "ASSET & PQC",
            items: [
                { path: "/inventory", icon: "◈", label: "Asset Inventory", sub: "128 assets tracked" },
                { path: "/discovery", icon: "◎", label: "Asset Discovery", sub: "Domains · SSL · IPs" },
                { path: "/cbom", icon: "◉", label: "CBOM", sub: "Crypto bill of mat." },
                { path: "/pqc", icon: "⬟", label: "Posture of PQC", sub: "755/1000 Elite" },
            ]
        },
        { section: "REPORTS",
            items: [
                { path: "/rating", icon: "✦", label: "Cyber Rating", sub: "Tier 1–4 scoring" },
                { path: "/reporting", icon: "▣", label: "Reporting", sub: "Export & schedule" },
            ]
        },
    ];
    return (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => setOpen(o => !o), style: {
                    background: "none", border: "none", cursor: "pointer",
                    padding: "6px 8px", marginRight: 4,
                    display: "flex", flexDirection: "column", gap: 4.5,
                }, children: [_jsx("span", { style: {
                            display: "block", width: 16, height: 1.5, borderRadius: 2,
                            background: open ? "#3b82f6" : "rgba(200,220,255,0.4)",
                            transform: open ? "translateY(6px) rotate(45deg)" : "none",
                            transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
                        } }), _jsx("span", { style: {
                            display: "block", width: 16, height: 1.5, borderRadius: 2,
                            background: open ? "#3b82f6" : "rgba(200,220,255,0.4)",
                            transform: open ? "scaleX(0)" : "none", opacity: open ? 0 : 1,
                            transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
                        } }), _jsx("span", { style: {
                            display: "block", width: 16, height: 1.5, borderRadius: 2,
                            background: open ? "#3b82f6" : "rgba(200,220,255,0.4)",
                            transform: open ? "translateY(-6px) rotate(-45deg)" : "none",
                            transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
                        } })] }), open && (_jsx("div", { onClick: () => setOpen(false), style: {
                    position: "fixed", inset: 0, zIndex: 198,
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(3px)",
                    WebkitBackdropFilter: "blur(3px)",
                } })), _jsxs("div", { style: {
                    position: "fixed", top: 0, left: 0, bottom: 0,
                    width: 260, zIndex: 199,
                    background: "linear-gradient(180deg, #070c16 0%, #080c14 100%)",
                    borderRight: "1px solid rgba(59,130,246,0.14)",
                    boxShadow: open ? "12px 0 60px rgba(0,0,0,0.7)" : "none",
                    display: "flex", flexDirection: "column",
                    transform: open ? "translateX(0)" : "translateX(-100%)",
                    transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
                }, children: [_jsxs("div", { style: {
                            padding: "16px 16px 14px",
                            borderBottom: "1px solid rgba(59,130,246,0.09)",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 28 28", children: [_jsx("polygon", { points: "14,2 26,8 26,20 14,26 2,20 2,8", fill: "none", stroke: "#3b82f6", strokeWidth: "1.5", style: { filter: "drop-shadow(0 0 4px #3b82f6)" } }), _jsx("polygon", { points: "14,7 21,11 21,17 14,21 7,17 7,11", fill: "rgba(59,130,246,0.1)", stroke: "rgba(59,130,246,0.3)", strokeWidth: "1" }), _jsx("circle", { cx: "14", cy: "14", r: "3", fill: "#3b82f6", style: { filter: "drop-shadow(0 0 5px #3b82f6)" } })] }), _jsxs("div", { children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 14, color: "#fff", letterSpacing: ".22em" }, children: "REBEL" }), _jsx("div", { style: { fontSize: 7, color: "rgba(200,220,255,0.2)", letterSpacing: ".14em", fontFamily: "'Orbitron',monospace", marginTop: 1 }, children: "THREAT INTELLIGENCE" })] })] }), _jsx("button", { onClick: () => setOpen(false), style: {
                                    background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)",
                                    borderRadius: 2, color: "rgba(200,220,255,0.4)", cursor: "pointer",
                                    width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                                }, children: "\u2715" })] }), _jsx("nav", { style: { flex: 1, overflowY: "auto", padding: "8px 10px" }, children: NAV.map(section => (_jsxs("div", { style: { marginBottom: 6 }, children: [_jsx("div", { style: {
                                        fontSize: 7, color: "rgba(200,220,255,0.18)", letterSpacing: ".2em",
                                        fontFamily: "'Orbitron',monospace", padding: "10px 8px 5px",
                                    }, children: section.section }), section.items.map(item => (_jsxs("button", { onClick: () => go(item.path), style: {
                                        width: "100%", display: "flex", alignItems: "center", gap: 12,
                                        padding: "9px 10px", background: "none",
                                        border: "1px solid transparent", borderRadius: 3,
                                        cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                                    }, onMouseEnter: e => {
                                        const b = e.currentTarget;
                                        b.style.background = "rgba(59,130,246,0.08)";
                                        b.style.borderColor = "rgba(59,130,246,0.18)";
                                    }, onMouseLeave: e => {
                                        const b = e.currentTarget;
                                        b.style.background = "none";
                                        b.style.borderColor = "transparent";
                                    }, children: [_jsx("div", { style: {
                                                width: 32, height: 32, flexShrink: 0,
                                                background: "rgba(59,130,246,0.07)",
                                                border: "1px solid rgba(59,130,246,0.15)",
                                                borderRadius: 3,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontFamily: "'Orbitron',monospace", fontSize: 13, color: "#3b82f6",
                                            }, children: item.icon }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                                                        fontFamily: "'Share Tech Mono',monospace", fontSize: 11,
                                                        color: "rgba(200,220,255,0.75)", lineHeight: 1,
                                                    }, children: item.label }), _jsx("div", { style: {
                                                        fontFamily: "'Share Tech Mono',monospace", fontSize: 9,
                                                        color: "rgba(200,220,255,0.28)", marginTop: 3,
                                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                    }, children: item.sub })] }), _jsx("span", { style: { fontSize: 10, color: "rgba(59,130,246,0.35)", flexShrink: 0 }, children: "\u203A" })] }, item.path)))] }, section.section))) }), _jsxs("div", { style: {
                            padding: "12px 16px",
                            borderTop: "1px solid rgba(59,130,246,0.08)",
                            display: "flex", flexDirection: "column", gap: 6,
                        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsxs("span", { style: { position: "relative", display: "inline-flex", width: 7, height: 7, flexShrink: 0 }, children: [_jsx("span", { style: { position: "absolute", inset: 0, borderRadius: "50%", background: "#22c55e", opacity: .5, animation: "ping 1.4s ease infinite" } }), _jsx("span", { style: { width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "block", boxShadow: "0 0 4px #22c55e" } })] }), _jsx("span", { style: { fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: "#22c55e", letterSpacing: ".12em" }, children: "LIVE \u00B7 CONNECTED" })] }), _jsx("div", { style: { fontSize: 7.5, color: "rgba(200,220,255,0.14)", fontFamily: "'Share Tech Mono',monospace" }, children: "r3bel-production.up.railway.app" })] })] })] }));
}
function normalizeCodeFences(text) {
    let normalized = text
        .replace(/\r\n/g, "\n")
        .replace(/ {0,}```/g, "\n```")
        .replace(/```([^\s`]+) /g, "```$1\n");
    const fences = normalized.match(/```/g) || [];
    if (fences.length % 2 !== 0) {
        normalized += "\n```";
    }
    return normalized;
}
function parseMessage(text) {
    const parts = [];
    const normalized = normalizeCodeFences(text);
    const codeBlockRegex = /```([^\s`]+)?\s*\n([\s\S]*?)```/g;
    let last = 0;
    let match;
    while ((match = codeBlockRegex.exec(normalized)) !== null) {
        if (match.index > last) {
            parts.push({ type: "text", content: normalized.slice(last, match.index) });
        }
        parts.push({ type: "code", lang: match[1] || "code", content: match[2].trim() });
        last = match.index + match[0].length;
    }
    if (last < normalized.length) {
        parts.push({ type: "text", content: normalized.slice(last) });
    }
    return parts;
}
function CodeBlock({ lang, content }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (_jsxs("div", { style: { background: "#060a10", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 4, margin: "6px 0", overflow: "hidden" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 10px", background: "rgba(59,130,246,0.08)", borderBottom: "1px solid rgba(59,130,246,0.15)" }, children: [_jsx("span", { style: { fontSize: 9, color: "#3b82f6", fontFamily: "'Orbitron',monospace", letterSpacing: "0.1em" }, children: lang.toUpperCase() }), _jsx("button", { onClick: copy, style: { background: "none", border: "none", cursor: "pointer", fontSize: 9, color: copied ? "#22c55e" : "rgba(200,220,255,0.4)", fontFamily: "Share Tech Mono", letterSpacing: "0.1em" }, children: copied ? "✓ COPIED" : "COPY" })] }), _jsx("pre", { style: { margin: 0, padding: "10px 12px", fontFamily: "Share Tech Mono", fontSize: 11, color: "rgba(200,220,255,0.85)", lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre" }, children: content })] }));
}
function MessageContent({ text, fontSize = 12 }) {
    const parts = parseMessage(text);
    return (_jsx("div", { children: parts.map((part, i) => part.type === "code" ? (_jsx(CodeBlock, { lang: part.lang, content: part.content }, i)) : (_jsx("p", { style: { margin: 0, fontFamily: "Share Tech Mono", fontSize, color: "rgba(200,220,255,0.85)", lineHeight: 1.7, whiteSpace: "pre-wrap" }, children: part.content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((s, j) => {
                if (s.startsWith("**") && s.endsWith("**"))
                    return (_jsx("strong", { style: { color: "rgba(200,220,255,1)", fontWeight: 700 }, children: s.slice(2, -2) }, j));
                if (s.startsWith("`") && s.endsWith("`"))
                    return (_jsx("code", { style: { background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 3, padding: "1px 5px", fontFamily: "Share Tech Mono", fontSize: fontSize - 1, color: "#3b82f6" }, children: s.slice(1, -1) }, j));
                return s;
            }) }, i))) }));
}
// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
function ChatPanel({ onClose }) {
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
    if (mobile) {
        return (_jsxs("div", { style: { position: "fixed", inset: 0, background: "#0a0f1a", zIndex: 200, display: "flex", flexDirection: "column" }, children: [_jsxs("div", { style: { padding: "14px 18px", borderBottom: "1px solid rgba(59,130,246,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "max(14px, env(safe-area-inset-top))" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: "#3b82f6" }), _jsx("span", { style: S.label, children: "REBEL CHAT" })] }), _jsx("button", { onClick: onClose, style: { ...S.ghost, fontSize: 22, padding: 8 }, children: "\u2715" })] }), _jsxs("div", { style: { flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }, children: [msgs.map((m, i) => (_jsxs("div", { style: { alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", background: m.role === "user" ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "2px 14px 14px 14px", padding: "10px 14px" }, children: [m.role === "assistant" && _jsx("div", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", color: "#3b82f6", letterSpacing: "0.2em", marginBottom: 5 }, children: "REBEL" }), _jsx(MessageContent, { text: m.text, fontSize: 14 })] }, i))), loading && _jsx("div", { style: { display: "flex", gap: 5, padding: "10px 14px" }, children: [0, 1, 2].map(i => _jsx("span", { style: { width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", animation: `bounce 1s ease infinite ${i * 0.15}s` } }, i)) }), _jsx("div", { ref: bottomRef })] }), _jsxs("div", { style: { padding: "12px 14px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", borderTop: "1px solid rgba(59,130,246,0.12)", display: "flex", gap: 10, background: "#0a0f1a" }, children: [_jsx("input", { value: input, onChange: e => setInput(e.target.value), onKeyDown: e => e.key === "Enter" && send(), placeholder: "Query REBEL...", style: { ...S.input, flex: 1, fontSize: 16, padding: "12px 14px" } }), _jsx("button", { onClick: send, disabled: loading, style: { ...S.btn, padding: "12px 18px", fontSize: 10 }, children: "SEND" })] })] }));
    }
    return (_jsxs("div", { style: { position: "fixed", right: 0, top: 0, bottom: 0, width: 400, background: "#0a0f1a", borderLeft: "1px solid rgba(59,130,246,0.18)", display: "flex", flexDirection: "column", zIndex: 200, animation: "slideIn 0.28s ease", boxShadow: "-18px 0 50px rgba(0,0,0,0.55)" }, children: [_jsxs("div", { style: { padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: "#3b82f6" }), _jsx("span", { style: S.label, children: "REBEL CHAT" })] }), _jsx("button", { onClick: onClose, style: S.ghost, children: "\u2715" })] }), _jsxs("div", { style: { flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 9 }, children: [msgs.map((m, i) => (_jsxs("div", { style: { alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", background: m.role === "user" ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.035)", border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.28)" : "rgba(255,255,255,0.055)"}`, borderRadius: m.role === "user" ? "10px 10px 2px 10px" : "2px 10px 10px 10px", padding: "8px 12px" }, children: [m.role === "assistant" && _jsx("div", { style: { fontSize: 7, fontFamily: "'Orbitron',monospace", color: "#3b82f6", letterSpacing: "0.2em", marginBottom: 4 }, children: "REBEL" }), _jsx(MessageContent, { text: m.text, fontSize: 12 })] }, i))), loading && _jsx("div", { style: { display: "flex", gap: 4, padding: "8px 12px" }, children: [0, 1, 2].map(i => _jsx("span", { style: { width: 5, height: 5, borderRadius: "50%", background: "#3b82f6", animation: `bounce 1s ease infinite ${i * 0.15}s` } }, i)) }), _jsx("div", { ref: bottomRef })] }), _jsxs("div", { style: { padding: "11px 13px", borderTop: "1px solid rgba(59,130,246,0.1)", display: "flex", gap: 8 }, children: [_jsx("input", { value: input, onChange: e => setInput(e.target.value), onKeyDown: e => e.key === "Enter" && send(), placeholder: "Query REBEL...", style: { ...S.input, flex: 1 } }), _jsx("button", { onClick: send, disabled: loading, style: S.btn, children: "SEND" })] })] }));
}
// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
function Pulse({ color = "#3b82f6" }) {
    return (_jsxs("span", { style: { position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }, children: [_jsx("span", { style: { position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.5, animation: "ping 1.4s ease infinite" } }), _jsx("span", { style: { width: 8, height: 8, borderRadius: "50%", background: color, display: "block", boxShadow: `0 0 5px ${color}` } })] }));
}
function RiskArc({ score, label }) {
    const r = 36, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
    const color = score > 80 ? "#ef4444" : score > 60 ? "#f97316" : score > 40 ? "#eab308" : "#3b82f6";
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }, children: [_jsxs("svg", { width: "72", height: "72", viewBox: "0 0 100 100", children: [_jsx("circle", { cx: "50", cy: "50", r: r, fill: "none", stroke: "rgba(255,255,255,0.05)", strokeWidth: "8" }), _jsx("circle", { cx: "50", cy: "50", r: r, fill: "none", stroke: color, strokeWidth: "8", strokeDasharray: `${dash} ${circ}`, strokeLinecap: "round", transform: "rotate(-90 50 50)", style: { transition: "stroke-dasharray 1s ease", filter: `drop-shadow(0 0 5px ${color})` } }), _jsx("text", { x: "50", y: "54", textAnchor: "middle", fill: color, fontSize: "16", fontFamily: "Orbitron", fontWeight: "700", children: score })] }), _jsx("span", { style: { fontSize: 8, color: "rgba(200,220,255,0.38)", letterSpacing: "0.08em", fontFamily: "Share Tech Mono", textTransform: "uppercase" }, children: label })] }));
}
// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
    label: { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: "rgba(200,220,255,0.62)" },
    ghost: { background: "none", border: "none", color: "rgba(200,220,255,0.32)", cursor: "pointer", fontSize: 16, padding: 4 },
    input: { background: "rgba(255,255,255,0.035)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 3, padding: "8px 12px", color: "rgba(200,220,255,0.9)", fontFamily: "Share Tech Mono", fontSize: 12, outline: "none" },
    btn: { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.32)", borderRadius: 3, color: "#3b82f6", cursor: "pointer", padding: "0 15px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.12em", whiteSpace: "nowrap", transition: "all 0.2s" },
    tabBtn: { background: "none", border: "none", cursor: "pointer", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: "0.14em", padding: "8px 13px", transition: "all 0.2s" },
    spinner: { width: 13, height: 13, border: "2px solid rgba(59,130,246,0.15)", borderTop: "2px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};
// ─── MOBILE NAV BOTTOM BAR ────────────────────────────────────────────────────
function MobileNav({ onChat, onScan, chatOpen }) {
    return (_jsx("div", { style: { position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(8,12,20,0.98)", borderTop: "1px solid rgba(59,130,246,0.12)", display: "flex", zIndex: 150, paddingBottom: "env(safe-area-inset-bottom)" }, children: [
            { icon: "⬡", label: "SCAN", action: onScan, active: false },
            { icon: "⬡", label: "CHAT", action: onChat, active: chatOpen },
        ].map(item => (_jsxs("button", { onClick: item.action, style: { flex: 1, background: "none", border: "none", padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", borderTop: item.active ? "2px solid #3b82f6" : "2px solid transparent" }, children: [_jsx("span", { style: { fontSize: 18, color: item.active ? "#3b82f6" : "rgba(200,220,255,0.4)" }, children: item.icon }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 8, color: item.active ? "#3b82f6" : "rgba(200,220,255,0.35)", letterSpacing: "0.15em" }, children: item.label })] }, item.label))) }));
}
// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export default function RebelDashboard() {
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
    useEffect(() => {
        const token = localStorage.getItem("access");
        if (!token) {
            navigate("/login");
        }
    }, []);
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
    return (_jsxs("div", { style: { minHeight: "100vh", background: "#080c14", fontFamily: "Share Tech Mono", color: "rgba(200,220,255,0.85)", backgroundImage: "radial-gradient(ellipse at 15% 50%, rgba(59,130,246,0.03) 0%, transparent 55%)" }, children: [_jsx("style", { children: `
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
        input, button { -webkit-tap-highlight-color: transparent; }
      ` }), _jsx("div", { style: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }, children: _jsx("div", { style: { position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.09),transparent)", animation: "scanline 10s linear infinite" } }) }), _jsxs("nav", { style: { height: mobile ? 48 : 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: mobile ? "0 14px" : "0 22px", paddingTop: mobile ? "env(safe-area-inset-top)" : 0, borderBottom: "1px solid rgba(59,130,246,0.09)", background: "rgba(8,12,20,0.97)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: mobile ? 8 : 12 }, children: [_jsx(NavDrawer, {}), _jsxs("svg", { width: "22", height: "22", viewBox: "0 0 28 28", children: [_jsx("polygon", { points: "14,2 26,8 26,20 14,26 2,20 2,8", fill: "none", stroke: "#3b82f6", strokeWidth: "1.5", style: { filter: "drop-shadow(0 0 4px #3b82f6)" } }), _jsx("polygon", { points: "14,7 21,11 21,17 14,21 7,17 7,11", fill: "rgba(59,130,246,0.1)", stroke: "rgba(59,130,246,0.35)", strokeWidth: "1" }), _jsx("circle", { cx: "14", cy: "14", r: "3", fill: "#3b82f6", style: { filter: "drop-shadow(0 0 5px #3b82f6)" } })] }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: mobile ? 15 : 16, color: "#fff", letterSpacing: "0.22em" }, children: "REBEL" }), !mobile && _jsxs(_Fragment, { children: [_jsx("div", { style: { width: 1, height: 18, background: "rgba(59,130,246,0.18)" } }), _jsx("span", { style: { fontSize: 8, color: "rgba(200,220,255,0.27)", letterSpacing: "0.14em" }, children: "THREAT INTELLIGENCE PLATFORM" })] })] }), !mobile && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.16)", borderRadius: 2, padding: "4px 10px" }, children: [_jsx(Pulse, { color: "#22c55e" }), _jsxs("span", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", color: "#22c55e", letterSpacing: "0.13em" }, children: ["LIVE \u00B7 ", API.replace("https://", "")] })] }), _jsx("button", { className: "ab", onClick: () => setScanOpen(true), style: { ...S.btn, padding: "6px 13px" }, children: "\u2B21 SCAN TARGET" }), _jsx("button", { className: "ab", onClick: () => setChatOpen(o => !o), style: { ...S.btn, padding: "6px 13px", background: chatOpen ? "rgba(59,130,246,0.16)" : "rgba(59,130,246,0.06)", boxShadow: chatOpen ? "0 0 14px rgba(59,130,246,0.22)" : "none" }, children: "\u2B21 QUERY REBEL" })] })), mobile && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx(Pulse, { color: "#22c55e" }), _jsx("span", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", color: "#22c55e", letterSpacing: "0.1em" }, children: "LIVE" })] }))] }), _jsxs("div", { style: { padding: mobile ? "12px 12px 80px" : "16px 22px", display: "flex", flexDirection: "column", gap: mobile ? 10 : 14, marginRight: (!mobile && chatOpen) ? 400 : 0, transition: "margin-right 0.3s ease" }, children: [_jsx("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: mobile ? 8 : 9 }, children: [
                            { label: "PACKETS", value: stats.total.toLocaleString(), sub: "This session", color: "#3b82f6", icon: "◈" },
                            { label: "ANOMALIES", value: stats.anomalies, sub: `${anomalyRate}% rate`, color: "#f97316", icon: "⚠" },
                            { label: "CRITICAL", value: stats.critical, sub: "Immediate risk", color: "#ef4444", icon: "☢" },
                            { label: "BLOCKED", value: stats.blocked, sub: "Auto-blocked", color: "#ef4444", icon: "⛔" },
                            { label: "RISK", value: overallRisk, sub: overallRisk > 70 ? "ELEVATED" : overallRisk > 40 ? "MODERATE" : "LOW", color: overallColor, icon: "◉" },
                        ].map((m, i) => (_jsxs("div", { className: "panel", style: { padding: mobile ? "10px 12px" : "12px 14px" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }, children: [_jsx("span", { style: { ...S.label, fontSize: mobile ? 7 : 7.5 }, children: m.label }), _jsx("span", { style: { fontSize: mobile ? 11 : 12, color: m.color, opacity: 0.65 }, children: m.icon })] }), _jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: mobile ? 24 : 30, fontWeight: 700, color: m.color, lineHeight: 1, marginBottom: 3, textShadow: `0 0 16px ${m.color}44` }, children: m.value }), _jsx("div", { style: { fontSize: 8, color: "rgba(200,220,255,0.25)", letterSpacing: "0.06em" }, children: m.sub })] }, i))) }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: "#3b82f6" }), _jsx("span", { style: { ...S.label, fontSize: mobile ? 8 : 10 }, children: "LIVE TRAFFIC \u2014 ANOMALY DETECTION" })] }), !mobile && _jsx("div", { style: { display: "flex", gap: 12 }, children: [["NORMAL", "#3b82f6"], ["ANOMALY", "#ef4444"]].map(([l, c]) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("div", { style: { width: 18, height: 2, background: c, boxShadow: `0 0 4px ${c}` } }), _jsx("span", { style: { fontSize: 7.5, color: "rgba(200,220,255,0.3)", letterSpacing: "0.12em" }, children: l })] }, l))) })] }), _jsx("div", { style: { padding: "10px 4px 4px" }, children: _jsx(ResponsiveContainer, { width: "100%", height: mobile ? 120 : 160, children: _jsxs(AreaChart, { data: trafficHistory, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "gN", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#3b82f6", stopOpacity: 0.14 }), _jsx("stop", { offset: "95%", stopColor: "#3b82f6", stopOpacity: 0 })] }), _jsxs("linearGradient", { id: "gA", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#ef4444", stopOpacity: 0.18 }), _jsx("stop", { offset: "95%", stopColor: "#ef4444", stopOpacity: 0 })] })] }), _jsx(XAxis, { dataKey: "t", hide: true }), _jsx(YAxis, { tick: { fontSize: 8, fill: "rgba(200,220,255,0.22)", fontFamily: "Share Tech Mono" }, axisLine: false, tickLine: false, width: 28 }), _jsx(Tooltip, { contentStyle: { background: "#0d1117", border: "1px solid rgba(59,130,246,0.22)", borderRadius: 2, fontFamily: "Share Tech Mono", fontSize: 10 }, itemStyle: { color: "rgba(200,220,255,0.75)" } }), _jsx(Area, { type: "monotone", dataKey: "normal", stroke: "#3b82f6", strokeWidth: 1.5, fill: "url(#gN)", dot: false, isAnimationActive: false }), _jsx(Area, { type: "monotone", dataKey: "anomaly", stroke: "#ef4444", strokeWidth: 1.5, fill: "url(#gA)", dot: false, isAnimationActive: false })] }) }) })] }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsx("span", { style: S.label, children: "RISK SURFACE" }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 20, color: overallColor, textShadow: `0 0 16px ${overallColor}` }, children: overallRisk })] }), _jsx("div", { style: { padding: "12px 8px", display: "flex", gap: mobile ? 6 : 5, justifyContent: mobile ? "space-around" : "center", overflowX: mobile ? "auto" : "visible", flexWrap: mobile ? "nowrap" : "wrap" }, children: riskScores.map(c => _jsx(RiskArc, { score: c.score, label: c.label }, c.label)) })] }), _jsx(WorldMapCard, { packets: packets }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsx("div", { style: { display: "flex" }, children: [["feed", "LIVE FEED"], ["critical", "CRITICAL"]].map(([id, label]) => (_jsx("button", { onClick: () => setActiveTab(id), style: { ...S.tabBtn, color: activeTab === id ? "#3b82f6" : "rgba(200,220,255,0.28)", borderBottom: activeTab === id ? "2px solid #3b82f6" : "2px solid transparent" }, children: label }, id))) }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx(Pulse, { color: "#ef4444" }), _jsx("span", { style: { fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: "rgba(200,220,255,0.28)", letterSpacing: "0.1em" }, children: "POLLING \u00B7 2s" })] })] }), mobile ? (
                            // Mobile: card-style rows
                            _jsxs("div", { style: { maxHeight: 280, overflowY: "auto" }, children: [displayFeed.map((p, i) => (_jsxs("div", { className: "row fr", onClick: () => setEnrichTarget(p.src), style: { padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.04)", background: i === 0 && p.label === "CRITICAL" ? "rgba(239,68,68,0.04)" : "transparent" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }, children: [_jsxs("span", { style: { color: "#3b82f6", fontSize: 10, fontFamily: "Share Tech Mono" }, children: [p.id, " \u00B7 ", p.time] }), _jsx("span", { style: { fontSize: 9, fontFamily: "'Orbitron',monospace", color: p.color, letterSpacing: "0.08em" }, children: p.label })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { style: { color: "rgba(200,220,255,0.7)", fontSize: 12 }, children: p.src }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [_jsx("div", { style: { width: 40, height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }, children: _jsx("div", { style: { width: `${p.risk * 100}%`, height: "100%", background: p.color } }) }), _jsxs("span", { style: { fontSize: 10, color: p.color }, children: [(p.risk * 100).toFixed(0), "%"] })] })] }), _jsxs("div", { style: { marginTop: 3, fontSize: 10, color: "rgba(200,220,255,0.35)" }, children: [":", p.dst_port, " \u00B7 ", p.size, "B \u00B7 ", p.country] })] }, p.id))), displayFeed.length === 0 && _jsx("div", { style: { padding: 18, textAlign: "center", fontSize: 11, color: "rgba(200,220,255,0.18)" }, children: "Awaiting packets..." })] })) : (
                            // Desktop: table-style
                            _jsxs(_Fragment, { children: [_jsx("div", { style: { display: "grid", gridTemplateColumns: "72px 86px 118px 68px 62px 1fr 80px", padding: "6px 13px", borderBottom: "1px solid rgba(59,130,246,0.06)" }, children: ["ID", "TIME", "SRC IP", "DST PORT", "SIZE", "RISK", "STATUS"].map(h => (_jsx("span", { style: { fontSize: 7, color: "rgba(200,220,255,0.26)", letterSpacing: "0.14em", fontFamily: "'Orbitron',monospace" }, children: h }, h))) }), _jsxs("div", { style: { maxHeight: 268, overflowY: "auto" }, children: [displayFeed.map((p, i) => (_jsxs("div", { className: "row fr", onClick: () => setEnrichTarget(p.src), style: { display: "grid", gridTemplateColumns: "72px 86px 118px 68px 62px 1fr 80px", padding: "8px 13px", borderBottom: "1px solid rgba(59,130,246,0.035)", background: i === 0 && p.label === "CRITICAL" ? "rgba(239,68,68,0.035)" : "transparent", alignItems: "center" }, children: [_jsx("span", { style: { color: "#3b82f6", fontSize: 10 }, children: p.id }), _jsx("span", { style: { color: "rgba(200,220,255,0.35)", fontSize: 10 }, children: p.time }), _jsx("span", { style: { color: "rgba(200,220,255,0.7)", fontSize: 10 }, children: p.src }), _jsxs("span", { style: { color: "rgba(200,220,255,0.45)", fontSize: 10 }, children: [":", p.dst_port] }), _jsxs("span", { style: { color: "rgba(200,220,255,0.38)", fontSize: 10 }, children: [p.size, "B"] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("div", { style: { width: 30, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }, children: _jsx("div", { style: { width: `${p.risk * 100}%`, height: "100%", background: p.color, transition: "width .4s" } }) }), _jsxs("span", { style: { fontSize: 9, color: p.color }, children: [(p.risk * 100).toFixed(0), "%"] })] }), _jsx("span", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", color: p.color, letterSpacing: "0.08em" }, children: p.label })] }, p.id))), displayFeed.length === 0 && _jsx("div", { style: { padding: 18, textAlign: "center", fontSize: 10, color: "rgba(200,220,255,0.18)" }, children: "Awaiting packets..." })] })] }))] }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "ph", children: [_jsx("span", { style: S.label, children: "FLAGGED SOURCES" }), _jsx("button", { className: "ab", onClick: () => setEnrichTarget(""), style: { ...S.btn, fontSize: 8, padding: "4px 10px" }, children: "+ ENRICH IP" })] }), _jsxs("div", { style: { maxHeight: mobile ? 200 : 180, overflowY: "auto" }, children: [flaggedIPs.length === 0 && _jsx("div", { style: { padding: 14, fontSize: 11, color: "rgba(200,220,255,0.18)" }, children: "No flagged sources yet..." }), flaggedIPs.map(p => (_jsxs("div", { className: "row", onClick: () => setEnrichTarget(p.src), style: { display: "flex", alignItems: "center", gap: 8, padding: mobile ? "11px 14px" : "8px 13px", borderBottom: "1px solid rgba(59,130,246,0.04)" }, children: [_jsx("div", { style: { width: 6, height: 6, borderRadius: "50%", background: p.color, boxShadow: `0 0 4px ${p.color}`, flexShrink: 0 } }), _jsx("span", { style: { flex: 1, fontSize: mobile ? 13 : 11, color: "rgba(200,220,255,0.68)" }, children: p.src }), _jsx("span", { style: { fontSize: 10, color: "rgba(200,220,255,0.28)" }, children: p.country }), _jsx("span", { style: { fontSize: 9, fontFamily: "'Orbitron',monospace", color: p.color }, children: p.label }), _jsx("span", { style: { fontSize: 10, color: "rgba(200,220,255,0.2)" }, children: "\u2192" })] }, p.src)))] })] }), !mobile && (_jsxs("div", { className: "panel", children: [_jsx("div", { className: "ph", children: _jsx("span", { style: S.label, children: "BACKEND SERVICES" }) }), _jsx("div", { style: { padding: "9px 13px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }, children: [
                                    { name: "/chat", ok: true }, { name: "/latest_packet", ok: packets.length > 0 },
                                    { name: "/enrich_ip", ok: true }, { name: "/scan-url", ok: true },
                                    { name: "/scan-crypto", ok: true }, { name: "/block_ip", ok: true },
                                ].map(s => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 7 }, children: [_jsx("div", { style: { width: 5, height: 5, borderRadius: "50%", background: s.ok ? "#22c55e" : "#ef4444", boxShadow: `0 0 4px ${s.ok ? "#22c55e" : "#ef4444"}`, flexShrink: 0 } }), _jsx("span", { style: { flex: 1, fontSize: 10, color: "rgba(200,220,255,0.5)", fontFamily: "Share Tech Mono" }, children: s.name }), _jsx("span", { style: { fontSize: 7.5, fontFamily: "'Orbitron',monospace", color: s.ok ? "#22c55e" : "#ef4444", letterSpacing: "0.1em" }, children: s.ok ? "ONLINE" : "DEGRADED" })] }, s.name))) })] })), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: "1px solid rgba(59,130,246,0.06)" }, children: [_jsx("span", { style: { fontSize: 7, color: "rgba(200,220,255,0.14)", letterSpacing: "0.1em" }, children: "REBEL \u2014 RESTRICTED ACCESS" }), _jsx("span", { style: { fontSize: 7, color: "rgba(200,220,255,0.14)", letterSpacing: "0.1em" }, children: API.replace("https://", "") })] })] }), mobile && _jsx(MobileNav, { onChat: () => setChatOpen(o => !o), onScan: () => setScanOpen(true), chatOpen: chatOpen }), scanOpen && _jsx(ScanModal, { onClose: () => setScanOpen(false) }), enrichTarget !== null && _jsx(IPEnrichModal, { ip: enrichTarget, onClose: () => setEnrichTarget(null) }), chatOpen && _jsx(ChatPanel, { onClose: () => setChatOpen(false) })] }));
}
