import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { API, T, S, Panel, PanelHeader, MetricCard, Badge, ProgBar, Table, TR, TD, MOCK_ASSETS, } from "./shared.js";
function useMobile() {
    const [mobile, setMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setMobile(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return mobile;
}
export default function AssetInventoryPage() {
    const [assets, setAssets] = useState(MOCK_ASSETS);
    const [query, setQuery] = useState("");
    const [scanning, setScanning] = useState(false);
    const typeRef = useRef(null);
    const riskRef = useRef(null);
    const legendRef = useRef(null);
    const [riskCounts, setRiskCounts] = useState({ Critical: 0, High: 0, Medium: 0, Low: 0 });
    const [certBuckets, setCertBuckets] = useState({ "0-30": 0, "30-60": 0, "60-90": 0, "90+": 0 });
    const [byType, setByType] = useState({ "Web Apps": 0, APIs: 0, Servers: 0, LB: 0, Other: 0 });
    const mobile = useMobile();
    const filtered = assets.filter(a => !query || a.name.includes(query) || a.ip.includes(query) ||
        a.type.toLowerCase().includes(query.toLowerCase()));
    useEffect(() => {
        fetch(`${API}/assets`)
            .then(r => r.json())
            .then(d => {
            if (d?.assets?.length) {
                setAssets(d.assets);
                setRiskCounts(d.risk_counts || riskCounts);
                setCertBuckets(d.cert_buckets || certBuckets);
                setByType(d.by_type || byType);
            }
        })
            .catch(() => console.log("Backend unreachable, using mock data"));
    }, []);
    useEffect(() => { drawTypeChart(); drawRiskChart(); }, [assets, riskCounts]);
    function drawTypeChart() {
        const c = typeRef.current;
        if (!c)
            return;
        const ctx = c.getContext("2d");
        const W = 140, H = 140, cx = 70, cy = 70, r = 50, gap = 0.05;
        const data = [
            { label: "Web Apps", val: byType["Web Apps"] || 42, color: T.blue },
            { label: "APIs", val: byType["APIs"] || 26, color: T.purple },
            { label: "Servers", val: byType["Servers"] || 37, color: "rgba(200,220,255,0.5)" },
            { label: "LB", val: byType["LB"] || 11, color: T.cyan },
            { label: "Other", val: byType["Other"] || 12, color: "rgba(100,116,139,0.5)" },
        ];
        const total = data.reduce((a, d) => a + d.val, 0);
        let angle = -Math.PI / 2;
        ctx.clearRect(0, 0, W, H);
        data.forEach(d => {
            const sweep = 2 * Math.PI * (d.val / total) - gap;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, angle, angle + sweep);
            ctx.fillStyle = d.color;
            ctx.fill();
            angle += 2 * Math.PI * (d.val / total);
        });
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.fillStyle = "#080c14";
        ctx.fill();
        ctx.fillStyle = "rgba(200,220,255,0.85)";
        ctx.font = "bold 13px Orbitron,monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(total), cx, cy + 5);
        if (legendRef.current) {
            legendRef.current.innerHTML = data.map(d => `
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:8px;height:8px;border-radius:1px;background:${d.color};flex-shrink:0;"></div>
          <span style="font-size:9px;color:${T.text2};flex:1;">${d.label}</span>
          <span style="font-size:9px;font-family:'Orbitron',monospace;color:${T.text3};">${d.val}</span>
        </div>`).join("");
        }
    }
    function drawRiskChart() {
        const c = riskRef.current;
        if (!c)
            return;
        const ctx = c.getContext("2d");
        const W = c.offsetWidth || 280, H = 140;
        c.width = W;
        const bars = [
            { label: "Critical", val: riskCounts.Critical, color: T.red },
            { label: "High", val: riskCounts.High, color: T.orange },
            { label: "Medium", val: riskCounts.Medium, color: T.yellow },
            { label: "Low", val: riskCounts.Low, color: T.green },
        ];
        const max = Math.max(...bars.map(b => b.val), 1);
        const bw = mobile ? 28 : 36, gap = mobile ? 14 : 22;
        const startX = (W - (bars.length * (bw + gap) - gap)) / 2;
        ctx.clearRect(0, 0, W, H);
        bars.forEach((b, i) => {
            const x = startX + i * (bw + gap);
            const barH = Math.round((b.val / max) * (H - 30));
            const y = H - barH - 20;
            ctx.fillStyle = b.color + "22";
            ctx.fillRect(x, y, bw, barH);
            ctx.fillStyle = b.color + "88";
            ctx.fillRect(x, y + 3, bw, barH - 3);
            ctx.fillStyle = b.color;
            ctx.fillRect(x, y, bw, 3);
            ctx.fillStyle = "rgba(200,220,255,0.25)";
            ctx.font = "9px 'Share Tech Mono'";
            ctx.textAlign = "center";
            ctx.fillText(b.label, x + bw / 2, H - 4);
            ctx.fillStyle = b.color;
            ctx.fillText(String(b.val), x + bw / 2, y - 4);
        });
    }
    const riskVariant = (r) => r === "Critical" ? "red" : r === "High" ? "orange" : r === "Medium" ? "yellow" : "green";
    const certVariant = (c) => c === "Valid" ? "green" : c === "Expiring" ? "yellow" : "red";
    const keyColor = (k) => k?.startsWith("1024") ? T.red : k?.startsWith("2048") ? T.yellow : T.green;
    async function scanAll() {
        setScanning(true);
        try {
            await fetch(`${API}/scan-all`, { method: "POST" });
        }
        catch { }
        setTimeout(() => setScanning(false), 2000);
    }
    return (_jsxs("div", { style: S.page, children: [_jsx("style", { children: `@keyframes ping{75%,100%{transform:scale(2.2);opacity:0}} @keyframes spin{to{transform:rotate(360deg)}}` }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: mobile ? 8 : 9 }, children: [_jsx(MetricCard, { label: "TOTAL ASSETS", value: assets.length, sub: "This session", color: T.blue }), _jsx(MetricCard, { label: "WEB APPS", value: byType["Web Apps"], sub: "Public facing", color: T.cyan }), _jsx(MetricCard, { label: "HIGH RISK", value: riskCounts.Critical + riskCounts.High, sub: "Immediate action", color: T.red }), _jsx(MetricCard, { label: "MEDIUM", value: riskCounts.Medium, sub: "Monitor closely", color: T.yellow }), _jsx(MetricCard, { label: "LOW", value: riskCounts.Low, sub: "Under control", color: T.green })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }, children: [_jsxs(Panel, { children: [_jsx(PanelHeader, { left: "ASSET TYPE DISTRIBUTION" }), _jsxs("div", { style: { padding: 14, display: "flex", gap: 16, alignItems: "center" }, children: [_jsx("canvas", { ref: typeRef, width: 140, height: 140 }), _jsx("div", { ref: legendRef, style: { display: "flex", flexDirection: "column", gap: 7, flex: 1 } })] })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "ASSET RISK DISTRIBUTION", right: _jsxs("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 20, color: T.red }, children: [riskCounts.Critical + riskCounts.High, _jsx("span", { style: { fontSize: 12 }, children: " high" })] }) }), _jsx("div", { style: { padding: 14 }, children: _jsx("canvas", { ref: riskRef, width: 280, height: 140, style: { width: "100%" } }) })] })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "ASSET INVENTORY", right: mobile ? (_jsx("button", { style: S.btn, onClick: scanAll, disabled: scanning, children: scanning ? "..." : "⬡ SCAN" })) : (_jsxs(_Fragment, { children: [_jsx("input", { value: query, onChange: e => setQuery(e.target.value), placeholder: "Search assets...", style: { ...S.input, width: 160, fontSize: 11 } }), _jsx("button", { style: S.btn, onClick: scanAll, disabled: scanning, children: scanning ? "SCANNING..." : "⬡ SCAN ALL" }), _jsx("button", { style: S.btn, children: "+ ADD ASSET" })] })) }), mobile && (_jsx("div", { style: { padding: "8px 12px", borderBottom: `1px solid ${T.border}` }, children: _jsx("input", { value: query, onChange: e => setQuery(e.target.value), placeholder: "Search assets...", style: { ...S.input, width: "100%", fontSize: 13 } }) })), mobile ? (
                    // Mobile card view
                    _jsxs("div", { style: { maxHeight: 360, overflowY: "auto" }, children: [filtered.map((a, i) => (_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid rgba(59,130,246,0.05)` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 12, color: T.blue }, children: a.name }), _jsx(Badge, { v: riskVariant(a.risk), children: a.risk })] }), _jsx("div", { style: { fontSize: 10, color: "rgba(59,130,246,0.6)", marginBottom: 4,
                                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: a.url }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx(Badge, { v: "gray", children: a.type }), _jsx(Badge, { v: certVariant(a.cert), children: a.cert }), _jsx("span", { style: { fontSize: 9, color: T.text3 }, children: a.scan })] })] }, i))), filtered.length === 0 && (_jsx("div", { style: { padding: 14, fontSize: 10, color: T.text3 }, children: "No assets found" }))] })) : (
                    // Desktop table view
                    _jsx(Table, { cols: ["ASSET NAME", "URL", "IPV4", "TYPE", "OWNER", "RISK", "CERT", "KEY LEN", "LAST SCAN"], children: filtered.map((a, i) => (_jsxs(TR, { children: [_jsx(TD, { style: { color: T.blue, fontSize: 10 }, children: a.name }), _jsx(TD, { style: { color: "rgba(59,130,246,0.7)", fontSize: 10 }, children: a.url }), _jsx(TD, { style: { fontSize: 10 }, children: a.ip }), _jsx(TD, { children: _jsx(Badge, { v: "gray", children: a.type }) }), _jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: a.owner }), _jsx(TD, { children: _jsx(Badge, { v: riskVariant(a.risk), children: a.risk }) }), _jsx(TD, { children: _jsx(Badge, { v: certVariant(a.cert), children: a.cert }) }), _jsx(TD, { style: { fontSize: 10, color: keyColor(a.keylen) }, children: a.keylen }), _jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: a.scan })] }, i))) })), _jsx("div", { style: { padding: "8px 12px", borderTop: `1px solid ${T.border}`,
                            display: "flex", justifyContent: "space-between", alignItems: "center" }, children: _jsxs("span", { style: { fontSize: 10, color: T.text3 }, children: ["Showing ", _jsx("b", { style: { color: T.text2 }, children: filtered.length }), " assets"] }) })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }, children: [_jsxs(Panel, { children: [_jsx(PanelHeader, { left: "CERTIFICATE EXPIRY TIMELINE" }), _jsx("div", { style: { padding: 14 }, children: [
                                    { label: "0–30 Days", count: certBuckets["0-30"], color: T.red },
                                    { label: "30–60 Days", count: certBuckets["30-60"], color: T.orange },
                                    { label: "60–90 Days", count: certBuckets["60-90"], color: T.yellow },
                                    { label: ">90 Days", count: certBuckets["90+"], color: T.green },
                                ].map(row => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }, children: [_jsx("div", { style: { width: 8, height: 8, borderRadius: "50%", background: row.color,
                                                boxShadow: `0 0 4px ${row.color}`, flexShrink: 0 } }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 3 }, children: [_jsx("span", { style: { fontSize: 10, color: T.text2 }, children: row.label }), _jsx("span", { style: { fontSize: 10, fontFamily: "'Orbitron',monospace", color: row.color }, children: row.count })] }), _jsx(ProgBar, { pct: Math.round(row.count / 93 * 100), color: row.color })] })] }, row.label))) })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "CRYPTO & SECURITY OVERVIEW" }), mobile ? (
                            // Mobile: card style
                            _jsx("div", { style: { maxHeight: 220, overflowY: "auto" }, children: assets.filter(a => a.tls !== "—" && a.tls !== undefined).slice(0, 10).map((a, i) => (_jsxs("div", { style: { padding: "9px 14px", borderBottom: `1px solid rgba(59,130,246,0.05)` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 3 }, children: [_jsx("span", { style: { fontSize: 11, color: T.blue }, children: a.name }), _jsxs(Badge, { v: a.tls === "1.0" ? "red" : a.tls === "1.2" ? "yellow" : "green", children: ["TLS ", a.tls] })] }), _jsxs("div", { style: { fontSize: 9, color: T.text3 }, children: [a.keylen, " \u00B7 ", a.ca] })] }, i))) })) : (_jsx(Table, { cols: ["ASSET", "KEY LEN", "CIPHER SUITE", "TLS", "CA"], children: assets.filter(a => a.tls !== "—" && a.tls !== undefined).slice(0, 10).map((a, i) => (_jsxs(TR, { children: [_jsx(TD, { style: { fontSize: 10, color: T.blue }, children: a.name }), _jsx(TD, { style: { fontSize: 10, color: keyColor(a.keylen) }, children: a.keylen }), _jsx(TD, { style: { fontSize: 9, color: T.text3, maxWidth: 140, overflow: "hidden",
                                                textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: a.cipher }), _jsx(TD, { children: _jsxs(Badge, { v: a.tls === "1.0" ? "red" : a.tls === "1.2" ? "yellow" : "green", children: ["TLS ", a.tls] }) }), _jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: a.ca })] }, i))) }))] })] })] }));
}
