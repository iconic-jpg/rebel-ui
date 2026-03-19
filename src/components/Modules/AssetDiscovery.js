import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { T, S, Panel, MetricCard, Badge, SubTabs, Table, TR, TD, Pulse, } from "./shared.js";
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
    function drawNetMap() {
        const canvas = mapRef.current;
        if (!canvas)
            return;
        const W = canvas.offsetWidth || 900, H = mobile ? 220 : 320;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#050810";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(59,130,246,0.04)";
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
            { x: 0.5, y: 0.5, label: "REBEL CORE", color: "#3b82f6", r: mobile ? 10 : 14, type: "hub" },
            { x: 0.15, y: 0.28, label: "portal", color: "#22c55e", r: mobile ? 6 : 9, type: "web" },
            { x: 0.35, y: 0.14, label: "api", color: "#22d3ee", r: mobile ? 6 : 9, type: "api" },
            { x: 0.7, y: 0.18, label: "vpn", color: "#ef4444", r: mobile ? 6 : 9, type: "gate" },
            { x: 0.84, y: 0.48, label: "mail", color: "#22c55e", r: mobile ? 5 : 8, type: "server" },
            { x: 0.65, y: 0.78, label: "app", color: "#eab308", r: mobile ? 6 : 9, type: "web" },
            { x: 0.24, y: 0.78, label: "cdn", color: "#a78bfa", r: mobile ? 5 : 8, type: "web" },
            { x: 0.1, y: 0.58, label: "auth", color: "#22d3ee", r: mobile ? 5 : 8, type: "api" },
            { x: 0.88, y: 0.22, label: "103.25", color: "rgba(200,220,255,0.25)", r: mobile ? 4 : 6, type: "ip" },
            { x: 0.9, y: 0.74, label: "40.104", color: "rgba(200,220,255,0.25)", r: mobile ? 4 : 6, type: "ip" },
            { x: 0.06, y: 0.42, label: "40.101", color: "rgba(239,68,68,0.5)", r: mobile ? 4 : 6, type: "ip" },
            { x: 0.45, y: 0.88, label: "181.65", color: "rgba(249,115,22,0.5)", r: mobile ? 4 : 6, type: "ip" },
        ];
        const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [3, 8], [4, 9], [1, 10], [5, 11]];
        edges.forEach(([a, b]) => {
            const na = nodes[a], nb = nodes[b];
            ctx.beginPath();
            ctx.moveTo(na.x * W, na.y * H);
            ctx.lineTo(nb.x * W, nb.y * H);
            ctx.strokeStyle = "rgba(59,130,246,0.1)";
            ctx.lineWidth = 0.8;
            ctx.stroke();
        });
        nodes.forEach(n => {
            ctx.beginPath();
            ctx.arc(n.x * W, n.y * H, n.r + 4, 0, Math.PI * 2);
            ctx.fillStyle = n.color.replace(")", ",0.08)").replace("rgba", "rgba");
            ctx.fill();
            ctx.beginPath();
            ctx.arc(n.x * W, n.y * H, n.r, 0, Math.PI * 2);
            ctx.fillStyle = n.color + "22";
            ctx.fill();
            ctx.strokeStyle = n.color;
            ctx.lineWidth = n.type === "hub" ? 1.5 : 1;
            ctx.stroke();
            if (!mobile || n.type === "hub") {
                ctx.fillStyle = "rgba(200,220,255,0.5)";
                ctx.font = `${n.type === "hub" ? 9 : 7}px 'Share Tech Mono'`;
                ctx.textAlign = "center";
                ctx.fillText(n.label, n.x * W, n.y * H + n.r + 10);
            }
        });
    }
    function renderTable() {
        if (tab === "domains") {
            const data = domainData.filter(d => !query || d.domain.includes(query));
            if (mobile)
                return (_jsxs("div", { children: [data.map((d, i) => (_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid rgba(59,130,246,0.05)` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 11, color: T.blue }, children: d.domain }), _jsx(Badge, { v: "green", children: "CONFIRMED" })] }), _jsxs("div", { style: { fontSize: 9, color: T.text3 }, children: [d.date, " \u00B7 ", d.company] })] }, i))), data.length === 0 && !loading && _jsx("div", { style: { padding: 14, fontSize: 10, color: T.text3 }, children: "No domains found" })] }));
            return (_jsxs(Table, { cols: ["DETECTION DATE", "DOMAIN NAME", "REGISTRATION DATE", "REGISTRAR", "COMPANY", "STATUS"], children: [data.map((d, i) => (_jsxs(TR, { children: [_jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: d.date }), _jsx(TD, { style: { fontSize: 10, color: T.blue }, children: d.domain }), _jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: d.regdate }), _jsx(TD, { style: { fontSize: 10, color: T.text2 }, children: d.registrar }), _jsx(TD, { children: _jsx(Badge, { v: "blue", children: d.company }) }), _jsx(TD, { children: _jsx(Badge, { v: "green", children: "CONFIRMED" }) })] }, i))), data.length === 0 && !loading && _jsx(TR, { children: _jsx(TD, { style: { color: T.text3, fontSize: 10 }, children: "No domains found" }) })] }));
        }
        if (tab === "ssl") {
            if (mobile)
                return (_jsxs("div", { children: [sslData.map((d, i) => (_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid rgba(59,130,246,0.05)` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 11, color: T.text2 }, children: d.common }), _jsx(Badge, { v: d.tls_version === "TLSv1.0" ? "red" : d.tls_version === "TLSv1.2" ? "yellow" : "green", children: d.tls_version })] }), _jsxs("div", { style: { fontSize: 9, color: T.text3 }, children: [d.date, " \u00B7 CA: ", d.ca] })] }, i))), sslData.length === 0 && !loading && _jsx("div", { style: { padding: 14, fontSize: 10, color: T.text3 }, children: "No SSL data \u2014 run crypto scans first" })] }));
            return (_jsxs(Table, { cols: ["DATE", "CIPHER", "VALID FROM", "COMMON NAME", "COMPANY", "CA", "TLS"], children: [sslData.map((d, i) => (_jsxs(TR, { children: [_jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: d.date }), _jsx(TD, { style: { fontSize: 9, color: T.text3, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: d.sha }), _jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: d.from }), _jsx(TD, { style: { fontSize: 10, color: T.text2 }, children: d.common }), _jsx(TD, { children: _jsx(Badge, { v: "blue", children: d.company }) }), _jsx(TD, { style: { fontSize: 10, color: T.cyan }, children: d.ca }), _jsx(TD, { children: _jsx(Badge, { v: d.tls_version === "TLSv1.0" ? "red" : d.tls_version === "TLSv1.2" ? "yellow" : "green", children: d.tls_version }) })] }, i))), sslData.length === 0 && !loading && _jsx(TR, { children: _jsx(TD, { style: { color: T.text3, fontSize: 10 }, children: "No SSL data \u2014 run crypto scans first" }) })] }));
        }
        if (tab === "ips") {
            if (mobile)
                return (_jsxs("div", { children: [ipData.map((d, i) => (_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid rgba(59,130,246,0.05)` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 11, color: T.blue }, children: d.ip }), _jsx(Badge, { v: "green", children: "CONFIRMED" })] }), _jsxs("div", { style: { fontSize: 9, color: T.text3 }, children: [d.date, " \u00B7 ", d.subnet, " \u00B7 ", d.netname] })] }, i))), ipData.length === 0 && !loading && _jsx("div", { style: { padding: 14, fontSize: 10, color: T.text3 }, children: "No IPs resolved yet" })] }));
            return (_jsxs(Table, { cols: ["DATE", "IP ADDRESS", "PORTS", "SUBNET", "ASN", "NETNAME", "LOCATION", "STATUS"], children: [ipData.map((d, i) => (_jsxs(TR, { children: [_jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: d.date }), _jsx(TD, { style: { fontSize: 10, color: T.blue }, children: d.ip }), _jsx(TD, { style: { fontSize: 10, color: T.text2 }, children: d.ports }), _jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: d.subnet }), _jsx(TD, { style: { fontSize: 10, color: T.cyan }, children: d.asn }), _jsx(TD, { style: { fontSize: 10, color: T.text2 }, children: d.netname }), _jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: d.location }), _jsx(TD, { children: _jsx(Badge, { v: "green", children: "CONFIRMED" }) })] }, i))), ipData.length === 0 && !loading && _jsx(TR, { children: _jsx(TD, { style: { color: T.text3, fontSize: 10 }, children: "No IPs resolved yet" }) })] }));
        }
        if (mobile)
            return (_jsxs("div", { children: [softwareData.map((d, i) => (_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid rgba(59,130,246,0.05)` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsxs("span", { style: { fontSize: 11, color: T.cyan }, children: [d.product, " ", d.version] }), _jsx(Badge, { v: "green", children: "CONFIRMED" })] }), _jsxs("div", { style: { fontSize: 9, color: T.text3 }, children: [d.date, " \u00B7 ", d.host, " \u00B7 Port ", d.port] })] }, i))), softwareData.length === 0 && !loading && _jsx("div", { style: { padding: 14, fontSize: 10, color: T.text3 }, children: "No software detected yet" })] }));
        return (_jsxs(Table, { cols: ["DATE", "PRODUCT", "VERSION", "TYPE", "PORT", "HOST", "STATUS"], children: [softwareData.map((d, i) => (_jsxs(TR, { children: [_jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: d.date }), _jsx(TD, { style: { fontSize: 10, color: T.cyan }, children: d.product }), _jsx(TD, { style: { fontSize: 10, color: T.text3 }, children: d.version }), _jsx(TD, { children: _jsx(Badge, { v: "gray", children: d.type }) }), _jsx(TD, { style: { fontSize: 10, color: T.text2 }, children: d.port }), _jsx(TD, { style: { fontSize: 10, color: T.blue }, children: d.host }), _jsx(TD, { children: _jsx(Badge, { v: "green", children: "CONFIRMED" }) })] }, i))), softwareData.length === 0 && !loading && _jsx(TR, { children: _jsx(TD, { style: { color: T.text3, fontSize: 10 }, children: "No software detected yet" }) })] }));
    }
    return (_jsxs("div", { style: S.page, children: [_jsx("style", { children: `@keyframes ping{75%,100%{transform:scale(2.2);opacity:0}}` }), _jsxs(Panel, { children: [_jsxs("div", { style: { padding: mobile ? "12px 14px" : 16, display: "flex", gap: 10, alignItems: "center" }, children: [_jsx("input", { value: query, onChange: e => setQuery(e.target.value), placeholder: "Search domain, URL, IoC...", style: { ...S.input, flex: 1, fontSize: mobile ? 13 : 12 } }), _jsx("button", { style: S.btn, children: "\u2B21 DISCOVER" })] }), !mobile && (_jsxs("div", { style: { display: "flex", gap: 8, padding: "0 16px 14px", alignItems: "center" }, children: [_jsx("span", { style: { fontSize: 10, color: T.text3 }, children: "Time Period:" }), _jsx("input", { type: "date", defaultValue: "2026-01-01", style: { ...S.input, padding: "3px 8px", fontSize: 10 } }), _jsx("span", { style: { fontSize: 10, color: T.text3 }, children: "\u2014" }), _jsx("input", { type: "date", defaultValue: "2026-03-15", style: { ...S.input, padding: "3px 8px", fontSize: 10 } })] }))] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 8 : 10 }, children: [_jsx(MetricCard, { label: "DOMAINS", value: counts.domains, sub: "Discovered", color: T.blue }), _jsx(MetricCard, { label: "SSL CERTS", value: counts.ssl, sub: "Active certificates", color: T.yellow }), _jsx(MetricCard, { label: "IP/SUBNETS", value: counts.ips, sub: "Mapped ranges", color: T.orange }), _jsx(MetricCard, { label: "SOFTWARE", value: counts.software, sub: "Identified stacks", color: T.purple })] }), _jsxs(Panel, { children: [_jsx("div", { style: { ...S.ph, overflowX: "auto" }, children: _jsx(SubTabs, { tabs: [
                                { id: "domains", label: mobile ? `DOM (${counts.domains})` : `DOMAINS (${counts.domains})` },
                                { id: "ssl", label: mobile ? `SSL (${counts.ssl})` : `SSL (${counts.ssl})` },
                                { id: "ips", label: mobile ? `IPs (${counts.ips})` : `IP/SUBNETS (${counts.ips})` },
                                { id: "software", label: mobile ? `SW (${counts.software})` : `SOFTWARE (${counts.software})` },
                            ], active: tab, onChange: (v) => setTab(v) }) }), _jsx("div", { style: { maxHeight: mobile ? 300 : 340, overflowY: "auto" }, children: loading ? (_jsx("div", { style: { padding: 20, textAlign: "center", fontSize: 10, color: T.text3 }, children: "Loading discovery data..." })) : renderTable() })] }), _jsxs(Panel, { children: [_jsxs("div", { style: S.ph, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Pulse, { color: T.blue }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: mobile ? 8 : 10, letterSpacing: ".15em", color: T.text2 }, children: "NETWORK ASSET MAP" })] }), _jsx("span", { style: { fontSize: 8, color: T.text3, fontFamily: "'Orbitron',monospace" }, children: "LIVE TOPOLOGY" })] }), _jsx("canvas", { ref: mapRef, style: { width: "100%", height: mobile ? 220 : 320, display: "block" } })] })] }));
}
