import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
const API = "https://r3bel-production.up.railway.app";
// ── Light Theme Palette ───────────────────────────────────────────────────────
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
    purple: "#7c3aed",
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
    input: {
        background: L.insetBg,
        border: `1px solid ${L.panelBorder}`,
        borderRadius: 5,
        color: L.text1,
        padding: "7px 10px",
        fontSize: 12,
        outline: "none",
        fontFamily: "'DM Sans', system-ui, sans-serif",
    },
    btn: {
        background: `${L.blue}15`,
        border: `1px solid ${L.blue}40`,
        borderRadius: 5,
        color: L.blue,
        padding: "7px 14px",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        fontFamily: "'DM Sans', system-ui, sans-serif",
    },
};
// ── Light sub-components ──────────────────────────────────────────────────────
function LPanel({ children, style = {} }) {
    return _jsx("div", { style: { ...LS.panel, ...style }, children: children });
}
function LPanelHeader({ left, right }) {
    return (_jsxs("div", { style: {
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`,
            background: L.subtleBg, borderRadius: "8px 8px 0 0",
        }, children: [_jsx("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: left }), right && _jsx("div", { children: right })] }));
}
function LMetricCard({ label, value, sub, color }) {
    return (_jsxs("div", { style: {
            background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8,
            padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }, children: [_jsx("div", { style: { fontSize: 8, color: L.text4, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6, fontWeight: 600 }, children: label }), _jsx("div", { style: { fontSize: 22, fontWeight: 800, color, lineHeight: 1 }, children: value }), _jsx("div", { style: { fontSize: 9, color: L.text3, marginTop: 5 }, children: sub })] }));
}
// Light pulse dot
function LPulse({ color }) {
    return (_jsxs("div", { style: { position: "relative", width: 10, height: 10, flexShrink: 0 }, children: [_jsx("div", { style: {
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: color, opacity: 0.25,
                    animation: "lpulse 1.8s ease-out infinite",
                } }), _jsx("div", { style: { width: 10, height: 10, borderRadius: "50%", background: color } })] }));
}
// Light sub-tabs
function LSubTabs({ tabs, active, onChange }) {
    return (_jsx("div", { style: { display: "flex", gap: 2, padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, overflowX: "auto" }, children: tabs.map(t => (_jsx("button", { onClick: () => onChange(t.id), style: {
                background: active === t.id ? `${L.blue}15` : "transparent",
                border: `1px solid ${active === t.id ? `${L.blue}40` : "transparent"}`,
                borderRadius: 4,
                color: active === t.id ? L.blue : L.text3,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                transition: "all 0.15s",
            }, children: t.label }, t.id))) }));
}
// Shared inline table for light theme
function LTable({ cols, children }) {
    return (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }, children: [_jsx("thead", { children: _jsx("tr", { style: { background: L.subtleBg, borderBottom: `2px solid ${L.panelBorder}` }, children: cols.map(c => (_jsx("th", { style: { padding: "7px 8px", fontSize: 8, fontWeight: 700, color: L.text3,
                                textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left", whiteSpace: "nowrap" }, children: c }, c))) }) }), _jsx("tbody", { children: children })] }) }));
}
function LTR({ children, even }) {
    return (_jsx("tr", { style: { borderBottom: `1px solid ${L.borderLight}`, background: even ? L.panelBg : L.subtleBg }, children: children }));
}
function LTD({ children, style = {} }) {
    return _jsx("td", { style: { padding: "7px 8px", ...style }, children: children });
}
// Inline badge (light-native, no shared component needed)
function LBadge({ v, children }) {
    const map = {
        green: { color: L.green, bg: "#f0fdf4", border: `${L.green}33` },
        red: { color: L.red, bg: "#fff5f5", border: `${L.red}33` },
        yellow: { color: L.yellow, bg: "#fffbeb", border: `${L.yellow}33` },
        blue: { color: L.blue, bg: `${L.blue}10`, border: `${L.blue}33` },
        cyan: { color: L.cyan, bg: `${L.cyan}10`, border: `${L.cyan}33` },
        gray: { color: L.text3, bg: L.insetBg, border: L.panelBorder },
    };
    const s = map[v] || map.gray;
    return (_jsx("span", { style: { fontSize: 8, fontWeight: 700, color: s.color,
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 3, padding: "1px 6px", whiteSpace: "nowrap" }, children: children }));
}
// ── useMobile ─────────────────────────────────────────────────────────────────
function useMobile() {
    const [mobile, setMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setMobile(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return mobile;
}
// TLS badge helper
function tlsV(v) {
    return v === "TLSv1.0" ? "red" : v === "TLSv1.2" ? "yellow" : "green";
}
export default function AssetDiscoveryPage() {
    const [tab, setTab] = useState("domains");
    const [query, setQuery] = useState("");
    const mapRef = useRef(null);
    const mobile = useMobile();
    const [domainData, setDomainData] = useState([]);
    const [sslData, setSslData] = useState([]);
    const [ipData, setIpData] = useState([]);
    const [softwareData, setSoftwareData] = useState([]);
    const [counts, setCounts] = useState({ domains: 0, ssl: 0, ips: 0, software: 0 });
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch(`${API}/discovery`)
            .then(r => r.json())
            .then(d => {
            setDomainData(d.domains || []);
            setSslData(d.ssl || []);
            setIpData(d.ips || []);
            setSoftwareData(d.software || []);
            setCounts(d.counts || { domains: 0, ssl: 0, ips: 0, software: 0 });
            setLoading(false);
        })
            .catch(() => setLoading(false));
    }, []);
    useEffect(() => { drawNetMap(); }, [mobile]);
    // ── Network map — light palette ───────────────────────────────────────────
    function drawNetMap() {
        const canvas = mapRef.current;
        if (!canvas)
            return;
        const W = canvas.offsetWidth || 900, H = mobile ? 220 : 320;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        // Light background
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, W, H);
        // Subtle grid
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 0.5;
        for (let x = 0; x < W; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        for (let y = 0; y < H; y += 60) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
        const nodes = [
            { x: 0.5, y: 0.5, label: "REBEL CORE", color: "#1d4ed8", r: mobile ? 10 : 14, type: "hub" },
            { x: 0.15, y: 0.28, label: "portal", color: "#16a34a", r: mobile ? 6 : 9, type: "web" },
            { x: 0.35, y: 0.14, label: "api", color: "#0284c7", r: mobile ? 6 : 9, type: "api" },
            { x: 0.7, y: 0.18, label: "vpn", color: "#dc2626", r: mobile ? 6 : 9, type: "gate" },
            { x: 0.84, y: 0.48, label: "mail", color: "#16a34a", r: mobile ? 5 : 8, type: "server" },
            { x: 0.65, y: 0.78, label: "app", color: "#b45309", r: mobile ? 6 : 9, type: "web" },
            { x: 0.24, y: 0.78, label: "cdn", color: "#7c3aed", r: mobile ? 5 : 8, type: "web" },
            { x: 0.1, y: 0.58, label: "auth", color: "#0284c7", r: mobile ? 5 : 8, type: "api" },
            { x: 0.88, y: 0.22, label: "103.25", color: "#94a3b8", r: mobile ? 4 : 6, type: "ip" },
            { x: 0.9, y: 0.74, label: "40.104", color: "#94a3b8", r: mobile ? 4 : 6, type: "ip" },
            { x: 0.06, y: 0.42, label: "40.101", color: "#dc2626", r: mobile ? 4 : 6, type: "ip" },
            { x: 0.45, y: 0.88, label: "181.65", color: "#c2410c", r: mobile ? 4 : 6, type: "ip" },
        ];
        const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [3, 8], [4, 9], [1, 10], [5, 11]];
        // Draw edges
        edges.forEach(([a, b]) => {
            const na = nodes[a], nb = nodes[b];
            ctx.beginPath();
            ctx.moveTo(na.x * W, na.y * H);
            ctx.lineTo(nb.x * W, nb.y * H);
            ctx.strokeStyle = "#cbd5e1";
            ctx.lineWidth = 0.8;
            ctx.stroke();
        });
        // Draw nodes
        nodes.forEach(n => {
            // Outer glow ring
            ctx.beginPath();
            ctx.arc(n.x * W, n.y * H, n.r + 5, 0, Math.PI * 2);
            ctx.fillStyle = n.color + "18";
            ctx.fill();
            // Node circle
            ctx.beginPath();
            ctx.arc(n.x * W, n.y * H, n.r, 0, Math.PI * 2);
            ctx.fillStyle = n.color + "22";
            ctx.fill();
            ctx.strokeStyle = n.color;
            ctx.lineWidth = n.type === "hub" ? 2 : 1.2;
            ctx.stroke();
            // Hub inner dot
            if (n.type === "hub") {
                ctx.beginPath();
                ctx.arc(n.x * W, n.y * H, 4, 0, Math.PI * 2);
                ctx.fillStyle = n.color;
                ctx.fill();
            }
            // Label
            if (!mobile || n.type === "hub") {
                ctx.fillStyle = n.type === "hub" ? L.text1 : L.text3;
                ctx.font = `${n.type === "hub" ? 600 : 400} ${n.type === "hub" ? 9 : 7}px 'DM Mono', monospace`;
                ctx.textAlign = "center";
                ctx.fillText(n.label, n.x * W, n.y * H + n.r + 11);
            }
        });
    }
    // ── Table renderers ───────────────────────────────────────────────────────
    const mobileCard = (key, top, badgeV, badgeLabel, sub) => (_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [top, _jsx(LBadge, { v: badgeV, children: badgeLabel })] }), _jsx("div", { style: { fontSize: 9, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: sub })] }, key));
    function renderTable() {
        if (tab === "domains") {
            const data = domainData.filter(d => !query || d.domain.includes(query));
            if (mobile)
                return (_jsxs("div", { children: [data.map((d, i) => mobileCard(i, _jsx("span", { style: { fontSize: 11, color: L.blue, fontWeight: 600 }, children: d.domain }), "green", "CONFIRMED", `${d.date} · ${d.company}`)), data.length === 0 && !loading && (_jsx("div", { style: { padding: 14, fontSize: 10, color: L.text3 }, children: "No domains found" }))] }));
            return (_jsxs(LTable, { cols: ["DETECTION DATE", "DOMAIN NAME", "REGISTRATION DATE", "REGISTRAR", "COMPANY", "STATUS"], children: [data.map((d, i) => (_jsxs(LTR, { even: i % 2 === 0, children: [_jsx(LTD, { style: { fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: d.date }), _jsx(LTD, { style: { fontSize: 10, color: L.blue, fontWeight: 600 }, children: d.domain }), _jsx(LTD, { style: { fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: d.regdate }), _jsx(LTD, { style: { fontSize: 10, color: L.text2 }, children: d.registrar }), _jsx(LTD, { children: _jsx(LBadge, { v: "blue", children: d.company }) }), _jsx(LTD, { children: _jsx(LBadge, { v: "green", children: "CONFIRMED" }) })] }, i))), data.length === 0 && !loading && (_jsx(LTR, { even: true, children: _jsx(LTD, { style: { color: L.text3, fontSize: 10 }, children: "No domains found" }) }))] }));
        }
        if (tab === "ssl") {
            if (mobile)
                return (_jsxs("div", { children: [sslData.map((d, i) => mobileCard(i, _jsx("span", { style: { fontSize: 11, color: L.text2, fontWeight: 500 }, children: d.common }), tlsV(d.tls_version), d.tls_version, `${d.date} · CA: ${d.ca}`)), sslData.length === 0 && !loading && (_jsx("div", { style: { padding: 14, fontSize: 10, color: L.text3 }, children: "No SSL data \u2014 run crypto scans first" }))] }));
            return (_jsxs(LTable, { cols: ["DATE", "CIPHER", "VALID FROM", "COMMON NAME", "COMPANY", "CA", "TLS"], children: [sslData.map((d, i) => (_jsxs(LTR, { even: i % 2 === 0, children: [_jsx(LTD, { style: { fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: d.date }), _jsx(LTD, { style: { fontSize: 9, color: L.text3, maxWidth: 120, overflow: "hidden",
                                    textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'DM Mono',monospace" }, children: d.sha }), _jsx(LTD, { style: { fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: d.from }), _jsx(LTD, { style: { fontSize: 10, color: L.text2, fontWeight: 500 }, children: d.common }), _jsx(LTD, { children: _jsx(LBadge, { v: "blue", children: d.company }) }), _jsx(LTD, { style: { fontSize: 10, color: L.cyan, fontWeight: 600 }, children: d.ca }), _jsx(LTD, { children: _jsx(LBadge, { v: tlsV(d.tls_version), children: d.tls_version }) })] }, i))), sslData.length === 0 && !loading && (_jsx(LTR, { even: true, children: _jsx(LTD, { style: { color: L.text3, fontSize: 10 }, children: "No SSL data \u2014 run crypto scans first" }) }))] }));
        }
        if (tab === "ips") {
            if (mobile)
                return (_jsxs("div", { children: [ipData.map((d, i) => mobileCard(i, _jsx("span", { style: { fontSize: 11, color: L.blue, fontWeight: 600 }, children: d.ip }), "green", "CONFIRMED", `${d.date} · ${d.subnet} · ${d.netname}`)), ipData.length === 0 && !loading && (_jsx("div", { style: { padding: 14, fontSize: 10, color: L.text3 }, children: "No IPs resolved yet" }))] }));
            return (_jsxs(LTable, { cols: ["DATE", "IP ADDRESS", "PORTS", "SUBNET", "ASN", "NETNAME", "LOCATION", "STATUS"], children: [ipData.map((d, i) => (_jsxs(LTR, { even: i % 2 === 0, children: [_jsx(LTD, { style: { fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: d.date }), _jsx(LTD, { style: { fontSize: 10, color: L.blue, fontWeight: 600, fontFamily: "'DM Mono',monospace" }, children: d.ip }), _jsx(LTD, { style: { fontSize: 10, color: L.text2, fontFamily: "'DM Mono',monospace" }, children: d.ports }), _jsx(LTD, { style: { fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: d.subnet }), _jsx(LTD, { style: { fontSize: 10, color: L.cyan, fontWeight: 600, fontFamily: "'DM Mono',monospace" }, children: d.asn }), _jsx(LTD, { style: { fontSize: 10, color: L.text2 }, children: d.netname }), _jsx(LTD, { style: { fontSize: 10, color: L.text3 }, children: d.location }), _jsx(LTD, { children: _jsx(LBadge, { v: "green", children: "CONFIRMED" }) })] }, i))), ipData.length === 0 && !loading && (_jsx(LTR, { even: true, children: _jsx(LTD, { style: { color: L.text3, fontSize: 10 }, children: "No IPs resolved yet" }) }))] }));
        }
        // Software tab
        if (mobile)
            return (_jsxs("div", { children: [softwareData.map((d, i) => mobileCard(i, _jsxs("span", { style: { fontSize: 11, color: L.cyan, fontWeight: 600 }, children: [d.product, " ", d.version] }), "green", "CONFIRMED", `${d.date} · ${d.host} · Port ${d.port}`)), softwareData.length === 0 && !loading && (_jsx("div", { style: { padding: 14, fontSize: 10, color: L.text3 }, children: "No software detected yet" }))] }));
        return (_jsxs(LTable, { cols: ["DATE", "PRODUCT", "VERSION", "TYPE", "PORT", "HOST", "STATUS"], children: [softwareData.map((d, i) => (_jsxs(LTR, { even: i % 2 === 0, children: [_jsx(LTD, { style: { fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: d.date }), _jsx(LTD, { style: { fontSize: 10, color: L.cyan, fontWeight: 700 }, children: d.product }), _jsx(LTD, { style: { fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: d.version }), _jsx(LTD, { children: _jsx(LBadge, { v: "gray", children: d.type }) }), _jsx(LTD, { style: { fontSize: 10, color: L.text2, fontFamily: "'DM Mono',monospace" }, children: d.port }), _jsx(LTD, { style: { fontSize: 10, color: L.blue, fontWeight: 600 }, children: d.host }), _jsx(LTD, { children: _jsx(LBadge, { v: "green", children: "CONFIRMED" }) })] }, i))), softwareData.length === 0 && !loading && (_jsx(LTR, { even: true, children: _jsx(LTD, { style: { color: L.text3, fontSize: 10 }, children: "No software detected yet" }) }))] }));
    }
    return (_jsxs("div", { style: LS.page, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes lpulse { 0%{transform:scale(1);opacity:0.6} 70%{transform:scale(2.2);opacity:0} 100%{transform:scale(2.2);opacity:0} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.panelBorder};border-radius:3px;}
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
      ` }), _jsxs(LPanel, { children: [_jsxs("div", { style: { padding: mobile ? "12px 14px" : 16, display: "flex", gap: 10, alignItems: "center" }, children: [_jsx("input", { value: query, onChange: e => setQuery(e.target.value), placeholder: "Search domain, URL, IoC...", style: { ...LS.input, flex: 1, fontSize: mobile ? 13 : 12 } }), _jsx("button", { style: LS.btn, children: "\u2B21 DISCOVER" })] }), !mobile && (_jsxs("div", { style: { display: "flex", gap: 8, padding: "0 16px 14px", alignItems: "center" }, children: [_jsx("span", { style: { fontSize: 10, color: L.text3, fontWeight: 500 }, children: "Time Period:" }), _jsx("input", { type: "date", defaultValue: "2026-01-01", style: { ...LS.input, padding: "3px 8px", fontSize: 10 } }), _jsx("span", { style: { fontSize: 10, color: L.text4 }, children: "\u2014" }), _jsx("input", { type: "date", defaultValue: "2026-03-15", style: { ...LS.input, padding: "3px 8px", fontSize: 10 } })] }))] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 8 : 10 }, children: [_jsx(LMetricCard, { label: "DOMAINS", value: counts.domains, sub: "Discovered", color: L.blue }), _jsx(LMetricCard, { label: "SSL CERTS", value: counts.ssl, sub: "Active certificates", color: L.yellow }), _jsx(LMetricCard, { label: "IP/SUBNETS", value: counts.ips, sub: "Mapped ranges", color: L.orange }), _jsx(LMetricCard, { label: "SOFTWARE", value: counts.software, sub: "Identified stacks", color: L.purple })] }), _jsxs(LPanel, { children: [_jsx(LSubTabs, { tabs: [
                            { id: "domains", label: mobile ? `DOM (${counts.domains})` : `DOMAINS (${counts.domains})` },
                            { id: "ssl", label: `SSL (${counts.ssl})` },
                            { id: "ips", label: mobile ? `IPs (${counts.ips})` : `IP/SUBNETS (${counts.ips})` },
                            { id: "software", label: mobile ? `SW (${counts.software})` : `SOFTWARE (${counts.software})` },
                        ], active: tab, onChange: (v) => setTab(v) }), _jsx("div", { style: { maxHeight: mobile ? 300 : 340, overflowY: "auto" }, children: loading ? (_jsx("div", { style: { padding: 24, textAlign: "center", fontSize: 10, color: L.text3 }, children: "Loading discovery data\u2026" })) : renderTable() })] }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: _jsxs(_Fragment, { children: [_jsx(LPulse, { color: L.blue }), _jsx("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: mobile ? 8 : 10,
                                        letterSpacing: ".15em", color: L.text2, fontWeight: 600 }, children: "NETWORK ASSET MAP" })] }), right: _jsx("span", { style: { fontSize: 8, color: L.text3, fontFamily: "'DM Mono',monospace",
                                letterSpacing: ".1em", fontWeight: 600 }, children: "LIVE TOPOLOGY" }) }), _jsx("canvas", { ref: mapRef, style: { width: "100%", height: mobile ? 220 : 320, display: "block", borderRadius: "0 0 8px 8px" } })] })] }));
}
