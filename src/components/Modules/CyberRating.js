import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
const API = "https://r3bel-production.up.railway.app";
// ── Light palette (mirrors PQCReadinessPage) ──────────────────────────────────
const L = {
    pageBg: "#f5f7fa",
    panelBg: "#ffffff",
    panelBorder: "#e2e8f0",
    subtleBg: "#f8fafc",
    insetBg: "#f1f5f9",
    borderLight: "#f1f5f9",
    text1: "#0f172a",
    text2: "#334155",
    text3: "#64748b",
    text4: "#94a3b8",
    blue: "#1d4ed8",
    cyan: "#0284c7",
    green: "#16a34a",
    yellow: "#b45309",
    orange: "#c2410c",
    red: "#dc2626",
    border: "#e2e8f0",
};
const LS = {
    page: {
        background: L.pageBg,
        minHeight: "100vh",
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: L.text1,
    },
    panel: {
        background: L.panelBg,
        border: `1px solid ${L.panelBorder}`,
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    },
};
const LEVEL_COLOR = {
    Critical: L.red, High: L.orange, Medium: L.yellow, Low: L.green,
};
const LEVEL_BG = {
    Critical: "#fff5f5", High: "#fff7ed", Medium: "#fffbeb", Low: "#f0fdf4",
};
function riskColor(score) {
    return score > 70 ? L.red : score > 40 ? L.orange : L.green;
}
// ── Skeleton ──────────────────────────────────────────────────────────────────
function Shimmer({ w = "100%", h = 16, radius = 4, style = {} }) {
    return (_jsx("div", { style: {
            width: w, height: h, borderRadius: radius, flexShrink: 0,
            background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s ease infinite",
            ...style,
        } }));
}
// ── Panel ─────────────────────────────────────────────────────────────────────
function LPanel({ children, style = {} }) {
    return _jsx("div", { style: { ...LS.panel, ...style }, children: children });
}
function LPanelHeader({ left, right }) {
    return (_jsxs("div", { style: {
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`,
            background: L.subtleBg, borderRadius: "8px 8px 0 0",
        }, children: [_jsx("span", { style: { fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" }, children: left }), right] }));
}
// ── Metric card ───────────────────────────────────────────────────────────────
function LMetricCard({ label, value, sub, color, loading }) {
    return (_jsxs("div", { style: { background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }, children: [_jsx("div", { style: { fontSize: 8, color: L.text4, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 }, children: label }), loading
                ? _jsx(Shimmer, { w: "65%", h: 26, style: { marginBottom: 8 } })
                : _jsx("div", { style: { fontSize: 22, fontWeight: 800, color, lineHeight: 1 }, children: value }), _jsx("div", { style: { fontSize: 9, color: L.text3, marginTop: 5 }, children: sub })] }));
}
// ── Progress bar ──────────────────────────────────────────────────────────────
function LProgBar({ pct, color }) {
    return (_jsx("div", { style: { height: 4, background: L.insetBg, borderRadius: 2, border: `1px solid ${L.border}`, overflow: "hidden" }, children: _jsx("div", { style: { height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" } }) }));
}
// ── Badge ─────────────────────────────────────────────────────────────────────
function LBadge({ level }) {
    const color = LEVEL_COLOR[level] ?? L.text3;
    const bg = LEVEL_BG[level] ?? L.subtleBg;
    return (_jsx("span", { style: { fontSize: 8, fontWeight: 700, color, background: bg, border: `1px solid ${color}33`, borderRadius: 3, padding: "2px 7px", letterSpacing: ".06em" }, children: level }));
}
// ── Breakpoint ────────────────────────────────────────────────────────────────
function useBreakpoint() {
    const get = () => { const w = window.innerWidth; return w < 480 ? "mobile" : w < 900 ? "tablet" : "desktop"; };
    const [bp, setBp] = useState(get);
    useEffect(() => { const h = () => setBp(get); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
    return bp;
}
// ── Score gauge ───────────────────────────────────────────────────────────────
function ScoreGauge({ score, size = 200 }) {
    const ref = useRef(null);
    const [shown, setShown] = useState(0);
    useEffect(() => {
        let frame, cur = 0;
        const step = () => { cur += (score - cur) * 0.07; if (Math.abs(score - cur) < 0.3)
            cur = score; setShown(Math.round(cur)); if (cur !== score)
            frame = requestAnimationFrame(step); };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [score]);
    useEffect(() => {
        const c = ref.current;
        if (!c)
            return;
        const ctx = c.getContext("2d");
        const W = size, H = Math.round(size * 0.6), cx = W / 2, cy = H + 5, r = Math.round(size * 0.4);
        c.width = W;
        c.height = H;
        ctx.clearRect(0, 0, W, H);
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, 0, false);
        ctx.lineWidth = Math.round(size * 0.06);
        ctx.strokeStyle = "#e2e8f0";
        ctx.stroke();
        const col = shown >= 70 ? L.green : shown >= 40 ? L.yellow : L.red;
        const pct = Math.min(0.999, Math.max(0.001, shown / 100));
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * pct, false);
        ctx.lineWidth = Math.round(size * 0.06);
        ctx.strokeStyle = col;
        ctx.lineCap = "round";
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
        for (let i = 0; i <= 10; i++) {
            const a = Math.PI + (Math.PI * i) / 10;
            ctx.beginPath();
            ctx.moveTo(cx + (r - size * 0.09) * Math.cos(a), cy + (r - size * 0.09) * Math.sin(a));
            ctx.lineTo(cx + (r - size * 0.05) * Math.cos(a), cy + (r - size * 0.05) * Math.sin(a));
            ctx.strokeStyle = "#cbd5e1";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }, [shown, size]);
    const col = shown >= 70 ? L.green : shown >= 40 ? L.yellow : L.red;
    const label = shown >= 70 ? "GOOD" : shown >= 40 ? "AT RISK" : "POOR";
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }, children: [_jsx("canvas", { ref: ref, style: { width: "100%", maxWidth: size, height: "auto" } }), _jsxs("div", { style: { marginTop: -6, textAlign: "center" }, children: [_jsx("div", { style: { fontFamily: "'DM Mono',monospace", fontSize: Math.round(size * 0.18), fontWeight: 900, color: col }, children: shown }), _jsx("div", { style: { fontFamily: "'DM Mono',monospace", fontSize: 9, color: col, letterSpacing: ".2em", marginTop: 2 }, children: label }), _jsx("div", { style: { fontSize: 9, color: L.text3, marginTop: 4 }, children: "OVERALL SECURITY RATING" })] })] }));
}
// ── Trend canvas ──────────────────────────────────────────────────────────────
function TrendChart({ trend, height }) {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current;
        if (!c || !trend.length)
            return;
        const ctx = c.getContext("2d");
        const W = c.offsetWidth || 800, H = height;
        c.width = W;
        c.height = H;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = L.panelBg;
        ctx.fillRect(0, 0, W, H);
        const pad = 28, n = trend.length, stepX = (W - pad * 2) / Math.max(n - 1, 1);
        const maxRisk = Math.max(...trend.map(t => t.avg_risk), 1);
        const maxScans = Math.max(...trend.map(t => t.scans), 1);
        ctx.strokeStyle = "rgba(0,0,0,0.05)";
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = pad + ((H - pad * 2) / 4) * i;
            ctx.beginPath();
            ctx.moveTo(pad, y);
            ctx.lineTo(W - pad, y);
            ctx.stroke();
        }
        const drawLine = (data, max, color) => {
            ctx.beginPath();
            data.forEach((v, i) => { const x = pad + i * stepX, y = pad + (1 - v / max) * (H - pad * 2); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            data.forEach((v, i) => { const x = pad + i * stepX, y = pad + (1 - v / max) * (H - pad * 2); ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); });
        };
        drawLine(trend.map(t => t.avg_risk), maxRisk, L.red);
        drawLine(trend.map(t => t.scans), maxScans, L.cyan);
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.font = "9px 'DM Sans',sans-serif";
        ctx.textAlign = "center";
        trend.forEach((t, i) => { if (i % 2 === 0)
            ctx.fillText(t.date.slice(5), pad + i * stepX, H - 4); });
    }, [trend, height]);
    return _jsx("canvas", { ref: ref, style: { width: "100%", height, display: "block" } });
}
// ── Page ──────────────────────────────────────────────────────────────────────
export default function CyberRatingPage() {
    const [stats, setStats] = useState({});
    const [trend, setTrend] = useState([]);
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const bp = useBreakpoint();
    const isMobile = bp === "mobile";
    useEffect(() => {
        fetch(`${API}/rating`)
            .then(r => r.json())
            .then(d => { setStats(d.stats || {}); setTrend(d.trend || []); setDomains(d.domains || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);
    const rating = stats.overall_rating || 0;
    const levels = stats.levels || { Critical: 0, High: 0, Medium: 0, Low: 0 };
    const total = stats.total_scans || 0;
    const gaugeSize = isMobile ? 160 : 200;
    const riskRows = [
        { label: "Critical", val: levels.Critical || 0, color: L.red },
        { label: "High", val: levels.High || 0, color: L.orange },
        { label: "Medium", val: levels.Medium || 0, color: L.yellow },
        { label: "Low", val: levels.Low || 0, color: L.green },
    ];
    return (_jsxs("div", { style: LS.page, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:#f1f5f9;}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:3px;}
      ` }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "Overall security rating" }), _jsxs("div", { style: { padding: isMobile ? 16 : 20, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }, children: [_jsx("div", { style: { flex: isMobile ? "1 1 100%" : "0 0 auto", width: gaugeSize + 40, margin: isMobile ? "0 auto" : 0 }, children: loading
                                    ? _jsx("div", { style: { width: gaugeSize, height: Math.round(gaugeSize * 0.6), margin: "0 auto", borderRadius: `${gaugeSize}px ${gaugeSize}px 0 0`, border: `${Math.round(gaugeSize * 0.06)}px solid #e2e8f0`, borderBottom: "none", animation: "shimmer 1.4s ease infinite" } })
                                    : _jsx(ScoreGauge, { score: rating, size: gaugeSize }) }), _jsxs("div", { style: { flex: 1, minWidth: isMobile ? "100%" : 200, display: "flex", flexDirection: "column", gap: 10, paddingTop: isMobile ? 0 : 8 }, children: [loading
                                        ? riskRows.map((_, i) => (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx(Shimmer, { w: "55%", h: 9 }), _jsx(Shimmer, { w: 24, h: 9 })] }), _jsx(Shimmer, { w: "100%", h: 4, radius: 2 })] }, i)))
                                        : riskRows.map(row => (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 9, color: L.text2, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }, children: row.label }), _jsx("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: 10, color: row.color, fontWeight: 700 }, children: row.val })] }), _jsx(LProgBar, { pct: total ? Math.round(row.val / total * 100) : 0, color: row.color })] }, row.label))), !loading && _jsxs("div", { style: { fontSize: 9, color: L.text3, marginTop: 2 }, children: ["Based on ", total, " scans"] })] }), !isMobile && !loading && (_jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minWidth: 200 }, children: riskRows.map(row => (_jsxs("div", { style: { background: LEVEL_BG[row.label], border: `1px solid ${row.color}22`, borderRadius: 6, padding: "10px 12px", textAlign: "center" }, children: [_jsx("div", { style: { fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 800, color: row.color }, children: row.val }), _jsx("div", { style: { fontSize: 8, color: L.text3, marginTop: 3, letterSpacing: ".1em", fontWeight: 600, textTransform: "uppercase" }, children: row.label })] }, row.label))) }))] })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: isMobile ? 8 : 9 }, children: [_jsx(LMetricCard, { label: "Total scans", value: total, sub: "All time", color: L.cyan, loading: loading }), _jsx(LMetricCard, { label: "Avg risk", value: stats.avg_risk_score || 0, sub: "Risk score", color: L.orange, loading: loading }), _jsx(LMetricCard, { label: "Critical", value: levels.Critical || 0, sub: "High priority", color: L.red, loading: loading }), _jsx(LMetricCard, { label: "Low risk", value: levels.Low || 0, sub: "Safe scans", color: L.green, loading: loading })] }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "Scan history trend", right: _jsx("div", { style: { display: "flex", gap: 14 }, children: [["Avg risk", L.red], ["Scans", L.cyan]].map(([l, c]) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [_jsx("div", { style: { width: 14, height: 2, background: c, borderRadius: 1 } }), _jsx("span", { style: { fontSize: 9, color: L.text3, fontWeight: 500 }, children: l })] }, l))) }) }), _jsx("div", { style: { padding: "12px 4px 6px" }, children: loading ? (_jsx("div", { style: { height: isMobile ? 140 : 180, padding: "0 16px", display: "flex", alignItems: "flex-end", gap: 4 }, children: [40, 65, 45, 80, 55, 70, 35, 90, 50, 75, 60, 85, 45, 70].map((h, i) => (_jsx("div", { style: { flex: 1, height: h * (isMobile ? 1.0 : 1.6), background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease infinite", borderRadius: 3, alignSelf: "flex-end" } }, i))) })) : (_jsx(TrendChart, { trend: trend, height: isMobile ? 140 : 180 })) })] }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "Risk distribution" }), _jsx("div", { style: { padding: 14, display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }, children: loading
                            ? [1, 2, 3, 4].map(i => (_jsxs("div", { style: { border: `1px solid ${L.border}`, borderRadius: 6, padding: 12, background: L.subtleBg }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 }, children: [_jsx(Shimmer, { w: 55, h: 9 }), _jsx(Shimmer, { w: 24, h: 20 })] }), _jsx(Shimmer, { w: "100%", h: 4, radius: 2, style: { marginBottom: 8 } }), _jsx(Shimmer, { w: 60, h: 8 })] }, i)))
                            : riskRows.map(row => {
                                const pct = total ? Math.round(row.val / total * 100) : 0;
                                return (_jsxs("div", { style: { background: LEVEL_BG[row.label], border: `1px solid ${row.color}22`, borderRadius: 6, padding: 12 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 }, children: [_jsx("span", { style: { fontSize: 9, color: row.color, letterSpacing: ".12em", fontWeight: 700, textTransform: "uppercase" }, children: row.label }), _jsx("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: 18, color: row.color, fontWeight: 800, lineHeight: 1 }, children: row.val })] }), _jsx(LProgBar, { pct: pct, color: row.color }), _jsxs("div", { style: { fontSize: 8, color: L.text3, marginTop: 6, fontWeight: 500 }, children: [pct, "% of total"] })] }, row.label));
                            }) })] }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "Risk breakdown by domain" }), _jsxs("div", { className: "cr-cards", children: [_jsx("style", { children: `@media(min-width:900px){.cr-cards{display:none!important;}}` }), _jsxs("div", { style: { maxHeight: 360, overflowY: "auto" }, children: [loading
                                        ? [1, 2, 3].map(i => (_jsxs("div", { style: { padding: "12px 14px", borderBottom: `1px solid ${L.borderLight}`, display: "flex", flexDirection: "column", gap: 8 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx(Shimmer, { w: "50%", h: 11 }), _jsx(Shimmer, { w: 50, h: 16, radius: 3 })] }), _jsx(Shimmer, { w: "100%", h: 4 })] }, i)))
                                        : domains.map((d, i) => (_jsxs("div", { style: { padding: "12px 14px", borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 }, children: [_jsx("span", { style: { fontSize: 12, color: L.blue, fontWeight: 500 }, children: d.domain }), _jsx(LBadge, { level: d.level })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("div", { style: { flex: 1 }, children: _jsx(LProgBar, { pct: d.avg_risk, color: riskColor(d.avg_risk) }) }), _jsx("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: riskColor(d.avg_risk) }, children: d.avg_risk }), _jsxs("span", { style: { fontSize: 10, color: L.text3 }, children: [d.scans, " scans"] })] })] }, i))), !loading && domains.length === 0 && _jsx("div", { style: { padding: 16, fontSize: 12, color: L.text3 }, children: "No scan data yet" })] })] }), _jsxs("div", { style: { display: "none" }, className: "cr-table", children: [_jsx("style", { children: `@media(min-width:900px){.cr-table{display:block!important;}}` }), _jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }, children: [_jsx("thead", { children: _jsx("tr", { style: { background: L.subtleBg, borderBottom: `2px solid ${L.border}` }, children: ["Domain", "Scans", "Avg risk score", "Level"].map(h => (_jsx("th", { style: { padding: "7px 14px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left" }, children: h }, h))) }) }), _jsxs("tbody", { children: [loading
                                                    ? [1, 2, 3].map(i => (_jsxs("tr", { style: { borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }, children: [_jsx("td", { style: { padding: "10px 14px" }, children: _jsx(Shimmer, { w: "65%", h: 11 }) }), _jsx("td", { style: { padding: "10px 14px" }, children: _jsx(Shimmer, { w: 30, h: 11 }) }), _jsx("td", { style: { padding: "10px 14px" }, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx(Shimmer, { w: 100, h: 6 }), _jsx(Shimmer, { w: 24, h: 11 })] }) }), _jsx("td", { style: { padding: "10px 14px" }, children: _jsx(Shimmer, { w: 50, h: 16, radius: 3 }) })] }, i)))
                                                    : domains.map((d, i) => (_jsxs("tr", { style: { borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }, onMouseEnter: e => (e.currentTarget.style.background = L.insetBg), onMouseLeave: e => (e.currentTarget.style.background = i % 2 === 0 ? L.panelBg : L.subtleBg), children: [_jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: L.blue, fontWeight: 500 }, children: d.domain }), _jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: L.text2, fontFamily: "'DM Mono',monospace" }, children: d.scans }), _jsx("td", { style: { padding: "10px 14px" }, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("div", { style: { width: 100 }, children: _jsx(LProgBar, { pct: d.avg_risk, color: riskColor(d.avg_risk) }) }), _jsx("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: riskColor(d.avg_risk) }, children: d.avg_risk })] }) }), _jsx("td", { style: { padding: "10px 14px" }, children: _jsx(LBadge, { level: d.level }) })] }, i))), !loading && domains.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, style: { padding: 14, fontSize: 12, color: L.text3 }, children: "No scan data yet" }) }))] })] }) })] })] }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "Vulnerability summary" }), _jsx("div", { style: { padding: 14, display: "flex", flexDirection: "column", gap: 10 }, children: loading
                            ? [1, 2, 3, 4].map(i => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsx(Shimmer, { w: 32, h: 32, radius: 6 }), _jsx("div", { style: { flex: 1 }, children: _jsx(Shimmer, { w: "50%", h: 11 }) }), _jsx("div", { style: { width: 120 }, children: _jsx(Shimmer, { w: "100%", h: 6 }) }), _jsx(Shimmer, { w: 32, h: 14 })] }, i)))
                            : [
                                { label: "Critical risk scans", val: levels.Critical || 0, color: L.red, bg: "#fff5f5", icon: "!" },
                                { label: "High risk scans", val: levels.High || 0, color: L.orange, bg: "#fff7ed", icon: "▲" },
                                { label: "Medium risk scans", val: levels.Medium || 0, color: L.yellow, bg: "#fffbeb", icon: "◆" },
                                { label: "Low risk scans", val: levels.Low || 0, color: L.green, bg: "#f0fdf4", icon: "✓" },
                            ].map(row => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsx("div", { style: { width: 32, height: 32, borderRadius: 6, background: row.bg, border: `1px solid ${row.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: row.color, flexShrink: 0, fontWeight: 700 }, children: row.icon }), _jsx("span", { style: { flex: 1, fontSize: isMobile ? 11 : 12, color: L.text2 }, children: row.label }), _jsx("div", { style: { width: isMobile ? 80 : 140 }, children: _jsx(LProgBar, { pct: total ? Math.round(row.val / total * 100) : 0, color: row.color }) }), _jsx("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 800, color: row.color, minWidth: 36, textAlign: "right" }, children: row.val })] }, row.label))) }), _jsx("div", { style: { padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "0 0 8px 8px" }, children: loading
                            ? _jsx(Shimmer, { w: 200, h: 10 })
                            : _jsxs("span", { style: { fontSize: 10, color: L.text2 }, children: [_jsx("b", { style: { color: L.text1 }, children: total }), " total scans \u00B7", " ", _jsx("b", { style: { color: L.red }, children: levels.Critical || 0 }), " critical \u00B7", " ", _jsx("b", { style: { color: L.green }, children: levels.Low || 0 }), " safe"] }) })] })] }));
}
