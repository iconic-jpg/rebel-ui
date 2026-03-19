import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { T, S, Panel, PanelHeader, Badge, ProgBar, Table, TR, TD, MOCK_PQC_ASSETS, } from "./shared.js";
const API = "https://r3bel-production.up.railway.app";
const RECS = [
    { icon: "⚠", color: T.yellow, text: "Upgrade to TLS 1.3 with PQC" },
    { icon: "◈", color: T.blue, text: "Implement Kyber for Key Exchange" },
    { icon: "◉", color: T.cyan, text: "Update Cryptographic Libraries" },
    { icon: "◎", color: T.green, text: "Develop PQC Migration Plan" },
    { icon: "⬡", color: T.orange, text: "Remove DES/3DES cipher suites" },
    { icon: "⚡", color: T.blue, text: "Enable HSTS on all public assets" },
];
const TIERS = [
    {
        tier: "TIER-1 ELITE", level: "Modern best-practice crypto posture",
        criteria: "TLS 1.2/1.3 only; Strong Ciphers; ECDHE; cert >2048-bit; no weak protocols; HSTS enabled",
        action: "Maintain config; periodic monitoring; recommended baseline",
        v: "blue",
    },
    {
        tier: "TIER-2 STANDARD", level: "Acceptable enterprise configuration",
        criteria: "TLS 1.2 supported but legacy allowed; Key >2048-bit; mostly strong ciphers",
        action: "Improve gradually; disable legacy protocols; standardise cipher suites",
        v: "yellow",
    },
    {
        tier: "TIER-3 LEGACY", level: "Weak but still operational",
        criteria: "TLS 1.0/1.1 enabled; weak ciphers; forward secrecy missing; key possibly 1024-bit",
        action: "Remediation required; upgrade TLS stack; rotate certificates",
        v: "orange",
    },
    {
        tier: "CRITICAL", level: "Insecure / exploitable",
        criteria: "SSL v2/v3 enabled; Key <1024-bit; known vulnerabilities",
        action: "Immediate action — block or isolate; replace certificate and TLS config",
        v: "red",
    },
];
function useMobile() {
    const [mobile, setMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setMobile(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return mobile;
}
export default function PQCPosturePage() {
    const [assets, setAssets] = useState([]);
    const [stats, setStats] = useState({
        avg_score: 0, total: 0, elite: 0, standard: 0, legacy: 0, critical: 0,
        pqc_ready: 0, elite_pct: 0, standard_pct: 0, legacy_pct: 0, critical_pct: 0
    });
    const mobile = useMobile();
    useEffect(() => {
        fetch(`${API}/pqc`)
            .then(r => r.json())
            .then(d => { if (d.assets?.length) {
            setAssets(d.assets);
            setStats(d.stats);
        } })
            .catch(() => { });
    }, []);
    const scoreColor = (s) => s >= 700 ? T.green : s >= 400 ? T.yellow : T.red;
    const statusVariant = (s) => s === "Elite" ? "green" : s === "Standard" ? "yellow" : s === "Critical" ? "red" : "orange";
    const displayAssets = assets.length ? assets : MOCK_PQC_ASSETS;
    const score = stats.avg_score || 755;
    const sc = scoreColor(score);
    return (_jsxs("div", { style: S.page, children: [_jsx(Panel, { style: { background: "linear-gradient(135deg,rgba(59,130,246,0.06) 0%,transparent 100%)" }, children: _jsxs("div", { style: { padding: mobile ? "14px 16px" : "18px 20px",
                        display: "flex", gap: mobile ? 14 : 24,
                        alignItems: "center", flexWrap: "wrap" }, children: [_jsxs("div", { style: { display: "flex", gap: 14, alignItems: "center",
                                flex: mobile ? "1 1 100%" : "unset" }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: mobile ? 7 : 9,
                                                color: T.text3, letterSpacing: ".15em", marginBottom: 6 }, children: "CONSOLIDATED PQC CYBER-RATING SCORE" }), _jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: mobile ? 6 : 10 }, children: [_jsx("span", { style: { fontFamily: "'Orbitron',monospace",
                                                        fontSize: mobile ? 40 : 52, fontWeight: 900, color: sc,
                                                        textShadow: `0 0 30px ${sc}66`, lineHeight: 1 }, children: score }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace",
                                                        fontSize: mobile ? 14 : 18, color: T.text2 }, children: "/1000" }), _jsx(Badge, { v: score >= 700 ? "green" : score >= 400 ? "yellow" : "red", children: score >= 700 ? "ELITE-PQC" : score >= 400 ? "STANDARD" : "CRITICAL" })] }), _jsx("div", { style: { fontSize: 11, color: T.text3, marginTop: 6 }, children: "Indicates a stronger security posture" })] }), _jsxs("svg", { width: mobile ? 110 : 160, height: mobile ? 110 : 160, viewBox: "0 0 160 160", style: { flexShrink: 0 }, children: [_jsx("circle", { cx: "80", cy: "80", r: "60", fill: "none", stroke: "rgba(255,255,255,0.05)", strokeWidth: "14" }), _jsx("circle", { cx: "80", cy: "80", r: "60", fill: "none", stroke: T.green, strokeWidth: "14", strokeDasharray: `${stats.elite_pct * 3.77 || 170} 377`, strokeLinecap: "round", transform: "rotate(-90 80 80)", style: { filter: "drop-shadow(0 0 8px rgba(34,197,94,.4))" } }), _jsx("circle", { cx: "80", cy: "80", r: "60", fill: "none", stroke: T.yellow, strokeWidth: "14", strokeDasharray: `${stats.standard_pct * 3.77 || 113} 377`, strokeDashoffset: `-${stats.elite_pct * 3.77 || 170}`, strokeLinecap: "round", transform: "rotate(-90 80 80)" }), _jsx("circle", { cx: "80", cy: "80", r: "60", fill: "none", stroke: T.orange, strokeWidth: "14", strokeDasharray: `${stats.legacy_pct * 3.77 || 57} 377`, strokeDashoffset: `-${(stats.elite_pct + stats.standard_pct) * 3.77 || 283}`, strokeLinecap: "round", transform: "rotate(-90 80 80)" }), _jsxs("text", { x: "80", y: "74", textAnchor: "middle", fill: sc, fontFamily: "Orbitron,monospace", fontSize: "22", fontWeight: "700", children: [stats.elite_pct || 45, "%"] }), _jsx("text", { x: "80", y: "94", textAnchor: "middle", fill: "rgba(200,220,255,0.35)", fontFamily: "Share Tech Mono", fontSize: "9", children: "ELITE-PQC" })] })] }), _jsx("div", { style: { flex: 1, minWidth: mobile ? "100%" : 200 }, children: [
                                { label: "Elite-PQC Ready", pct: stats.elite_pct || 45, color: T.green },
                                { label: "Standard", pct: stats.standard_pct || 30, color: T.yellow },
                                { label: "Legacy", pct: stats.legacy_pct || 15, color: T.orange },
                                { label: `Critical: ${stats.critical || 8}`, pct: stats.critical_pct || 8, color: T.red },
                            ].map(row => (_jsxs("div", { style: { marginBottom: 10 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 10, color: T.text3 }, children: row.label }), _jsxs("span", { style: { fontSize: 10, color: row.color, fontFamily: "'Orbitron',monospace" }, children: [row.pct, "%"] })] }), _jsx(ProgBar, { pct: row.pct, color: row.color })] }, row.label))) })] }) }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }, children: [_jsxs(Panel, { children: [_jsx(PanelHeader, { left: "ASSETS BY CLASSIFICATION GRADE" }), _jsx("div", { style: { padding: 16, display: "flex", gap: mobile ? 12 : 16,
                                    alignItems: "flex-end", justifyContent: "center" }, children: [
                                    { label: "ELITE", val: stats.elite || 37, h: mobile ? 70 : 90, color: T.green },
                                    { label: "CRITICAL", val: stats.critical || 2, h: mobile ? 30 : 40, color: T.red },
                                    { label: "STANDARD", val: stats.standard || 4, h: mobile ? 45 : 55, color: T.purple },
                                ].map(bar => (_jsxs("div", { style: { textAlign: "center" }, children: [_jsx("div", { style: { width: mobile ? 56 : 70, height: bar.h,
                                                background: `${bar.color}18`, border: `1px solid ${bar.color}44`,
                                                borderRadius: "2px 2px 0 0", display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx("span", { style: { fontFamily: "'Orbitron',monospace",
                                                    fontSize: mobile ? 18 : 24, color: bar.color }, children: bar.val }) }), _jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: 7.5, color: T.text3, marginTop: 6,
                                                padding: "3px 6px", background: `${bar.color}10`, border: `1px solid ${bar.color}28` }, children: bar.label })] }, bar.label))) })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "RISK OVERVIEW" }), _jsxs("div", { style: { padding: 16, display: "flex", gap: 16, alignItems: "center" }, children: [_jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,52px)", gap: 5 }, children: [
                                            T.red + "33", T.red + "1a", T.orange + "1a",
                                            T.red + "1a", T.orange + "12", T.green + "0d",
                                            T.orange + "12", T.green + "0d", T.green + "14",
                                        ].map((bg, i) => (_jsx("div", { style: { width: mobile ? 40 : 52, height: mobile ? 40 : 52,
                                                background: bg, border: `1px solid ${bg.slice(0, 7)}44`, borderRadius: 2 } }, i))) }), _jsx("div", { style: { display: "flex", flexDirection: "column", gap: 9 }, children: [
                                            { color: T.red, label: "High Risk" },
                                            { color: T.orange, label: "Medium Risk" },
                                            { color: T.green, label: "Safe / No Risk" },
                                        ].map(row => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { width: 12, height: 12, borderRadius: 1,
                                                        background: row.color + "22", border: `1px solid ${row.color}44` } }), _jsx("span", { style: { fontSize: 10, color: T.text2 }, children: row.label })] }, row.label))) })] })] })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "PQC ASSET STATUS", right: _jsxs("span", { style: { fontSize: 8, color: T.text3, fontFamily: "'Orbitron',monospace" }, children: ["CRITICAL: ", stats.critical || 8] }) }), mobile ? (_jsx("div", { style: { maxHeight: 360, overflowY: "auto" }, children: displayAssets.map((a, i) => (_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid rgba(59,130,246,0.05)` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 11, color: T.blue }, children: a.name }), _jsx(Badge, { v: statusVariant(a.status), children: a.status.toUpperCase() })] }), _jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }, children: [_jsxs(Badge, { v: a.tls === "1.0" ? "red" : a.tls === "1.2" ? "yellow" : "green", children: ["TLS ", a.tls] }), _jsx("span", { style: { fontSize: 14, color: a.pqc ? T.green : T.red }, children: a.pqc ? "✓" : "✗" }), _jsx("span", { style: { fontSize: 9, color: T.text3 }, children: a.ip })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { flex: 1 }, children: _jsx(ProgBar, { pct: Math.round(a.score / 10), color: scoreColor(a.score) }) }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 11, color: scoreColor(a.score) }, children: a.score })] })] }, i))) })) : (_jsx(Table, { cols: ["ASSET NAME", "IP ADDRESS", "PQC SUPPORT", "TLS", "SCORE", "STATUS", "OWNER"], children: displayAssets.map((a, i) => (_jsxs(TR, { children: [_jsx(TD, { style: { fontSize: 10, color: T.blue }, children: a.name }), _jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: a.ip }), _jsx(TD, { style: { textAlign: "center", fontSize: 16 }, children: a.pqc ? _jsx("span", { style: { color: T.green }, children: "\u2713" }) : _jsx("span", { style: { color: T.red }, children: "\u2717" }) }), _jsx(TD, { children: _jsxs(Badge, { v: a.tls === "1.0" ? "red" : a.tls === "1.2" ? "yellow" : "green", children: ["TLS ", a.tls] }) }), _jsx(TD, { children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { width: 60 }, children: _jsx(ProgBar, { pct: Math.round(a.score / 10), color: scoreColor(a.score) }) }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 11, color: scoreColor(a.score) }, children: a.score })] }) }), _jsx(TD, { children: _jsx(Badge, { v: statusVariant(a.status), children: a.status.toUpperCase() }) }), _jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: a.owner })] }, i))) }))] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "PQC COMPLIANCE TIERS" }), mobile ? (_jsx("div", { children: TIERS.map((t, i) => (_jsxs("div", { style: { padding: "12px 14px", borderBottom: `1px solid rgba(59,130,246,0.05)` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 }, children: [_jsx(Badge, { v: t.v, children: t.tier }), _jsx("span", { style: { fontSize: 10, color: scoreColor(i === 0 ? 800 : i === 1 ? 500 : i === 2 ? 350 : 0) }, children: t.level })] }), _jsx("div", { style: { fontSize: 9, color: T.text2, marginBottom: 4, lineHeight: 1.5 }, children: t.criteria }), _jsx("div", { style: { fontSize: 9, color: T.text3, lineHeight: 1.5 }, children: t.action })] }, i))) })) : (_jsx(Table, { cols: ["TIER", "SECURITY LEVEL", "COMPLIANCE CRITERIA", "PRIORITY / ACTION"], children: TIERS.map((t, i) => (_jsxs(TR, { children: [_jsx(TD, { children: _jsx(Badge, { v: t.v, children: t.tier }) }), _jsx(TD, { style: { fontSize: 10, color: scoreColor(i === 0 ? 800 : i === 1 ? 500 : i === 2 ? 350 : 0) }, children: t.level }), _jsx(TD, { style: { fontSize: 10, color: T.text2, maxWidth: 280 }, children: t.criteria }), _jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: t.action })] }, i))) }))] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }, children: [_jsxs(Panel, { children: [_jsx(PanelHeader, { left: "IMPROVEMENT RECOMMENDATIONS" }), _jsx("div", { children: RECS.map((r, i) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
                                        borderBottom: `1px solid rgba(59,130,246,0.04)` }, children: [_jsx("div", { style: { width: 24, height: 24, borderRadius: 2,
                                                background: `${r.color}22`, border: `1px solid ${r.color}44`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 11, color: r.color, flexShrink: 0 }, children: r.icon }), _jsx("span", { style: { fontSize: mobile ? 12 : 11, color: T.text2 }, children: r.text })] }, i))) })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: assets.length ? `${assets[0]?.name} DETAILS` : "APP A DETAILS" }), _jsxs("div", { style: { padding: 14, display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("div", { style: { width: 38, height: 38, background: "rgba(59,130,246,0.1)",
                                                    border: `1px solid rgba(59,130,246,0.3)`, borderRadius: 2,
                                                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: T.blue }, children: "\u2B21" }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 13, color: T.text }, children: assets[0]?.name || "App A" })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }, children: [
                                            ["OWNER", assets[0]?.owner || "Team 1", T.text2],
                                            ["EXPOSURE", "Internet", T.text2],
                                            ["TLS", `TLS ${assets[0]?.tls || "1.2"}`, T.text2],
                                            ["STATUS", assets[0]?.status || "Legacy", T.orange],
                                        ].map(([k, v, c]) => (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 8, color: T.text3, marginBottom: 2 }, children: k }), _jsx("div", { style: { fontSize: 11, color: c }, children: v })] }, k))) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 8, color: T.text3, marginBottom: 5 }, children: "PQC SCORE" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { flex: 1 }, children: _jsx(ProgBar, { pct: Math.round((assets[0]?.score || 480) / 10), color: scoreColor(assets[0]?.score || 480) }) }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 14,
                                                            color: scoreColor(assets[0]?.score || 480) }, children: assets[0]?.score || 480 }), _jsx(Badge, { v: statusVariant(assets[0]?.status || "Critical"), children: (assets[0]?.status || "Critical").toUpperCase() })] })] }), _jsxs("div", { style: { padding: "10px 12px", background: "rgba(239,68,68,0.05)",
                                            border: `1px solid rgba(239,68,68,0.15)`, borderRadius: 2 }, children: [_jsx("div", { style: { fontSize: 8, color: T.text3, marginBottom: 5 }, children: "RECOMMENDED ACTIONS" }), _jsxs("div", { style: { fontSize: 10, color: "rgba(239,68,68,0.8)", lineHeight: 1.8 }, children: ["\u2192 Migrate from RSA to ECDSA/Kyber", _jsx("br", {}), "\u2192 Upgrade to TLS 1.3 immediately", _jsx("br", {}), "\u2192 Replace 1024-bit keys with 4096-bit"] })] })] })] })] })] }));
}
