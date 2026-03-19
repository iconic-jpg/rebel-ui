import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { T, S, Panel, PanelHeader, MetricCard, ProgBar } from "./shared.js";
const API = "https://r3bel-production.up.railway.app";
function useMobile() {
    const [mobile, setMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setMobile(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return mobile;
}
export default function ReportingPage() {
    const [stats, setStats] = useState({});
    const [trend, setTrend] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const chartRef = useRef(null);
    const mobile = useMobile();
    useEffect(() => {
        fetch(`${API}/rating`)
            .then(r => r.json())
            .then(d => {
            setStats(d.stats || {});
            setTrend(d.trend || []);
            setUsers(d.users || []);
            setLoading(false);
        })
            .catch(() => setLoading(false));
    }, []);
    useEffect(() => { drawActivityChart(); }, [trend, mobile]);
    function drawActivityChart() {
        const c = chartRef.current;
        if (!c || !trend.length)
            return;
        const ctx = c.getContext("2d");
        const W = c.offsetWidth || 800, H = mobile ? 160 : 200;
        c.width = W;
        c.height = H;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#050810";
        ctx.fillRect(0, 0, W, H);
        const pad = mobile ? 20 : 32;
        const maxScans = Math.max(...trend.map(t => t.scans), 1);
        const n = trend.length;
        const bw = Math.max(6, Math.floor((W - pad * 2) / n) - 4);
        const stepX = (W - pad * 2) / Math.max(n, 1);
        ctx.strokeStyle = "rgba(59,130,246,0.06)";
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = pad + ((H - pad * 2) / 4) * i;
            ctx.beginPath();
            ctx.moveTo(pad, y);
            ctx.lineTo(W - pad, y);
            ctx.stroke();
        }
        trend.forEach((t, i) => {
            const x = pad + i * stepX + (stepX - bw) / 2;
            const barH = Math.round((t.scans / maxScans) * (H - pad * 2));
            const y = H - barH - pad;
            ctx.fillStyle = T.blue + "22";
            ctx.fillRect(x, y, bw, barH);
            ctx.fillStyle = T.blue + "88";
            ctx.fillRect(x, y + 3, bw, barH - 3);
            ctx.fillStyle = T.blue;
            ctx.fillRect(x, y, bw, 3);
            if (!mobile || bw > 10) {
                ctx.fillStyle = T.blue;
                ctx.font = "7px 'Share Tech Mono'";
                ctx.textAlign = "center";
                ctx.fillText(String(t.scans), x + bw / 2, y - 3);
            }
        });
        ctx.fillStyle = "rgba(200,220,255,0.25)";
        ctx.font = `${mobile ? 6 : 7}px 'Share Tech Mono'`;
        ctx.textAlign = "center";
        trend.forEach((t, i) => {
            if (i % (mobile ? 3 : 2) === 0) {
                ctx.fillText(t.date.slice(5), pad + i * stepX + stepX / 2, H - 4);
            }
        });
    }
    function exportCSV() {
        fetch(`${API}/api/my-scans`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
        })
            .then(r => r.json())
            .then(d => {
            const rows = [
                ["URL", "Domain", "Risk Score", "Level", "Scanned At"],
                ...(d.scans || []).map((s) => [s.url, s.domain, s.risk_score, s.level, s.scanned_at])
            ];
            const csv = rows.map(r => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "rebel-report.csv";
            a.click();
        });
    }
    const total = stats.total_scans || 0;
    const levels = stats.levels || { Critical: 0, High: 0, Medium: 0, Low: 0 };
    const maxUser = Math.max(...users.map(u => u.scans), 1);
    return (_jsxs("div", { style: S.page, children: [_jsx(Panel, { children: _jsxs("div", { style: { padding: mobile ? "12px 14px" : "16px 20px",
                        display: "flex", justifyContent: "space-between", alignItems: mobile ? "flex-start" : "center",
                        flexDirection: mobile ? "column" : "row", gap: mobile ? 10 : 0 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: 9, color: T.text3,
                                        letterSpacing: ".15em", marginBottom: 4 }, children: "REBEL THREAT INTELLIGENCE" }), _jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: mobile ? 15 : 18,
                                        color: T.text, fontWeight: 700 }, children: "SECURITY REPORT" }), _jsxs("div", { style: { fontSize: 10, color: T.text3, marginTop: 4 }, children: ["Generated: ", new Date().toLocaleDateString(), " \u00B7 ", total, " total scans"] })] }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("button", { style: S.btn, onClick: exportCSV, children: "\u2193 EXPORT CSV" }), _jsx("button", { style: { ...S.btn, color: T.green, borderColor: `${T.green}44` }, children: "\u2193 PDF" })] })] }) }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 8 : 9 }, children: [_jsx(MetricCard, { label: "TOTAL SCANS", value: total, sub: "All time", color: T.blue }), _jsx(MetricCard, { label: "CRITICAL", value: levels.Critical || 0, sub: "Immediate", color: T.red }), _jsx(MetricCard, { label: "AVG RISK", value: stats.avg_risk_score || 0, sub: "Score", color: T.orange }), _jsx(MetricCard, { label: "SAFE SCANS", value: levels.Low || 0, sub: "Low risk", color: T.green })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "SCAN ACTIVITY OVER TIME", right: _jsx("span", { style: { fontSize: 8, color: T.text3, fontFamily: "'Orbitron',monospace" }, children: "LAST 14 DAYS" }) }), _jsx("div", { style: { padding: "10px 4px 4px" }, children: loading ? (_jsx("div", { style: { height: mobile ? 160 : 200, display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: 10, color: T.text3 }, children: "Loading activity data..." })) : (_jsx("canvas", { ref: chartRef, style: { width: "100%", height: mobile ? 160 : 200, display: "block" } })) })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "USER ACTIVITY BREAKDOWN" }), _jsxs("div", { style: { padding: 14, display: "flex", flexDirection: "column", gap: 10 }, children: [users.length === 0 && !loading && (_jsx("div", { style: { fontSize: 10, color: T.text3 }, children: "No user data yet" })), users.map((u, i) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: mobile ? 8 : 12 }, children: [_jsx("div", { style: { width: 28, height: 28, borderRadius: 2,
                                            background: `${T.blue}18`, border: `1px solid ${T.blue}33`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 10, color: T.blue, flexShrink: 0, fontFamily: "'Orbitron',monospace" }, children: i + 1 }), _jsx("span", { style: { flex: 1, fontSize: mobile ? 10 : 11, color: T.text2,
                                            fontFamily: "Share Tech Mono", overflow: "hidden", textOverflow: "ellipsis",
                                            whiteSpace: "nowrap", minWidth: 0 }, children: u.user }), _jsx("div", { style: { width: mobile ? 60 : 120, flexShrink: 0 }, children: _jsx(ProgBar, { pct: Math.round(u.scans / maxUser * 100), color: T.blue }) }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: mobile ? 10 : 11,
                                            color: T.blue, minWidth: mobile ? 30 : 40, textAlign: "right" }, children: u.scans }), !mobile && (_jsxs("span", { style: { fontSize: 10,
                                            color: u.avg_risk > 70 ? T.red : u.avg_risk > 40 ? T.orange : T.green,
                                            minWidth: 50, textAlign: "right", fontFamily: "'Orbitron',monospace" }, children: [u.avg_risk, " avg"] }))] }, i)))] })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "REPORT SUMMARY" }), _jsx("div", { style: { padding: 14, display: "flex", flexDirection: "column", gap: mobile ? 8 : 12 }, children: [
                            { label: "Total Scans Performed", val: total, color: T.blue },
                            { label: "Critical Findings", val: levels.Critical || 0, color: T.red },
                            { label: "High Risk Findings", val: levels.High || 0, color: T.orange },
                            { label: "Medium Risk Findings", val: levels.Medium || 0, color: T.yellow },
                            { label: "Low Risk / Clean Scans", val: levels.Low || 0, color: T.green },
                            { label: "Unique Users", val: users.length, color: T.cyan },
                            { label: "Average Risk Score", val: stats.avg_risk_score || 0, color: T.orange },
                            { label: "Overall Security Rating", val: `${stats.overall_rating || 0}/100`,
                                color: stats.overall_rating >= 70 ? T.green : T.red },
                        ].map((row, i) => (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: mobile ? "7px 10px" : "8px 12px",
                                background: "rgba(255,255,255,0.02)", border: `1px solid rgba(59,130,246,0.06)`, borderRadius: 2 }, children: [_jsx("span", { style: { fontSize: mobile ? 10 : 11, color: T.text2 }, children: row.label }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: mobile ? 11 : 12,
                                        color: row.color }, children: row.val })] }, i))) })] })] }));
}
