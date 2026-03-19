import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import { T, S, Panel, PanelHeader, MetricCard, Badge, ProgBar, Table, TR, TD, MOCK_CBOM, } from "./shared.js";
import { parseCipher, fullAnalysis, normaliseTLS, severityColor, severityVariant, } from "./cipherAnalysis.js";
const API = "https://r3bel-production.up.railway.app";
// ── PQC field normaliser ──────────────────────────────────────────────────────
// Backend scan_cryptography returns "post_quantum" but /cbom may map it to "pqc"
// This helper reads whichever field is present, preferring pqcHybrid from analysis
function isPQCReady(d, analysis) {
    if (analysis?.components?.pqcHybrid)
        return true; // real hybrid detected by scanner
    if (d.post_quantum === true)
        return true; // direct from scan_cryptography
    if (d.pqc === true)
        return true; // mapped field from /cbom
    return false;
}
const DEFAULT_CIPHERS = [
    { name: "TLS_AES_256_GCM_SHA384", count: 29, color: T.green },
    { name: "TLS_AES_128_GCM_SHA256", count: 15, color: T.yellow },
    { name: "TLS_RSA_WITH_DES_CBC_SHA", count: 9, color: T.red },
    { name: "TLS_RSA_WITH_RC4_128_SHA", count: 4, color: T.red },
    { name: "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384", count: 12, color: T.orange },
];
const DEFAULT_CAS = [
    { label: "DigiCert", val: 39, color: T.blue },
    { label: "Thawte", val: 39, color: T.cyan },
    { label: "Let's Encrypt", val: 12, color: T.green },
    { label: "COMODO", val: 10, color: T.yellow },
];
const DEFAULT_PROTOCOLS = [
    { label: "TLS 1.3", val: 72, color: T.green },
    { label: "TLS 1.2", val: 20, color: T.blue },
    { label: "TLS 1.1", val: 8, color: T.orange },
    { label: "TLS 1.0", val: 2, color: T.red },
];
function useBreakpoint() {
    const get = () => {
        const w = window.innerWidth;
        if (w < 480)
            return "mobile";
        if (w < 900)
            return "tablet";
        return "desktop";
    };
    const [bp, setBp] = useState(get);
    useEffect(() => {
        const h = () => setBp(get());
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return bp;
}
function FindingBadge({ severity }) {
    const color = severityColor(severity);
    return (_jsx("span", { style: {
            fontSize: 8, fontWeight: 600, letterSpacing: ".08em",
            color, border: `1px solid ${color}44`,
            borderRadius: 2, padding: "1px 5px",
            textTransform: "uppercase", flexShrink: 0,
        }, children: severity }));
}
function CipherBreakdown({ analysis, compact = false, }) {
    const { components: c, findings, pqcImpact: pqc } = analysis;
    return (_jsxs("div", { style: {
            background: "rgba(8,12,20,0.97)",
            border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: 4, padding: compact ? 10 : 12, marginTop: 4,
        }, children: [_jsx("div", { style: {
                    display: "grid",
                    gridTemplateColumns: compact ? "1fr 1fr" : "repeat(5,1fr)",
                    gap: 6, marginBottom: 10,
                }, children: [
                    { label: "Key exchange", val: c.keyExchange },
                    { label: "Auth", val: c.authentication },
                    { label: "Bulk cipher", val: c.bulkCipher },
                    { label: "MAC", val: c.mac },
                    { label: "PFS", val: c.pfs ? "Yes ✓" : "No ✗" },
                ].map(item => (_jsxs("div", { style: {
                        background: "rgba(59,130,246,0.06)",
                        border: "1px solid rgba(59,130,246,0.12)",
                        borderRadius: 3, padding: "5px 7px",
                    }, children: [_jsx("div", { style: { fontSize: 7, color: T.text3, marginBottom: 2,
                                letterSpacing: ".1em" }, children: item.label.toUpperCase() }), _jsx("div", { style: {
                                fontSize: 9,
                                color: item.label === "PFS" ? (c.pfs ? T.green : T.red) : T.text2,
                                fontFamily: "'Share Tech Mono',monospace",
                                fontWeight: item.label === "PFS" ? 600 : 400,
                                overflow: "hidden", textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }, children: item.val })] }, item.label))) }), findings.filter((f) => f.severity !== "ok")
                .map((f, i) => (_jsxs("div", { style: {
                    borderLeft: `2px solid ${severityColor(f.severity)}`,
                    paddingLeft: 8, marginBottom: 8,
                }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center",
                            gap: 6, marginBottom: 2, flexWrap: "wrap" }, children: [_jsx(FindingBadge, { severity: f.severity }), _jsx("span", { style: { fontSize: 9, color: T.text2, fontWeight: 600 }, children: f.title }), !compact && (_jsx("span", { style: { fontSize: 8, color: T.text3, marginLeft: "auto" }, children: f.doraArticle }))] }), _jsx("div", { style: { fontSize: 8, color: T.text3, lineHeight: 1.5 }, children: f.description }), compact && (_jsx("div", { style: { fontSize: 7, color: T.text3, marginTop: 2,
                            fontStyle: "italic" }, children: f.doraArticle })), _jsxs("div", { style: { fontSize: 8, color: T.cyan, marginTop: 3 }, children: ["\u21B3 ", f.remediation] })] }, i))), _jsxs("div", { style: {
                    background: c.pqcHybrid ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                    border: `1px solid ${c.pqcHybrid ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.15)"}`,
                    borderRadius: 3, padding: "5px 8px",
                }, children: [_jsxs("span", { style: { fontSize: 7, color: T.text3, letterSpacing: ".1em" }, children: ["PQC IMPACT", "  "] }), _jsx("span", { style: { fontSize: 8, color: T.text2 }, children: pqc })] })] }));
}
function AppCard({ d, compact }) {
    const [open, setOpen] = useState(false);
    const risk = d.analysis.overallRisk;
    const c = d.analysis.components;
    const tlsNorm = normaliseTLS(d.tls);
    return (_jsxs("div", { style: { borderBottom: "1px solid rgba(59,130,246,0.05)" }, children: [_jsxs("div", { onClick: () => setOpen(o => !o), style: { padding: "10px 14px", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }, children: [_jsx("span", { style: { fontSize: 11, color: T.blue,
                                            overflow: "hidden", textOverflow: "ellipsis",
                                            whiteSpace: "nowrap" }, children: d.app }), (() => {
                                        if (c.pqcHybrid || d.pqc === true)
                                            return _jsx("span", { style: { fontSize: 7, fontWeight: 600, color: T.green,
                                                    border: `1px solid ${T.green}44`, borderRadius: 2,
                                                    padding: "1px 4px", flexShrink: 0 }, children: "PQC ACTIVE" });
                                        const kx = c.keyExchange?.toLowerCase() ?? "";
                                        const isECDHE = kx === "x25519" || kx === "p-256" || kx === "p-384" ||
                                            kx === "p-521" || kx === "x448" || kx.startsWith("secp") || kx === "ecdhe";
                                        if (isECDHE)
                                            return _jsx("span", { style: { fontSize: 7, fontWeight: 600, color: T.yellow,
                                                    border: `1px solid ${T.yellow}44`, borderRadius: 2,
                                                    padding: "1px 4px", flexShrink: 0 }, children: "ECDHE READY" });
                                        return null;
                                    })()] }), _jsxs("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: [_jsxs(Badge, { v: tlsNorm === "1.0" ? "red" : tlsNorm === "1.2" ? "yellow" : "green", children: ["TLS ", tlsNorm] }), _jsx("span", { style: { fontSize: 9,
                                            color: d.keylen?.startsWith("1024") ? T.red
                                                : d.keylen?.startsWith("2048") ? T.yellow : T.green }, children: d.keylen }), _jsx("span", { style: { fontSize: 9, color: c.pfs ? T.green : T.red }, children: c.pfs ? "PFS ✓" : "PFS ✗" })] }), _jsxs("div", { style: { fontSize: 8, color: T.text3, marginTop: 4,
                                    overflow: "hidden", textOverflow: "ellipsis",
                                    whiteSpace: "nowrap" }, children: [_jsx("span", { style: { color: T.text2,
                                            fontFamily: "'Share Tech Mono',monospace" }, children: c.keyExchange }), " · ", _jsx("span", { style: {
                                            color: c.bulkCipher.includes("DES") || c.bulkCipher === "RC4-128"
                                                ? T.red : c.bulkCipher.includes("CBC") ? T.orange : T.text2,
                                            fontFamily: "'Share Tech Mono',monospace",
                                        }, children: c.bulkCipher }), " · ", d.ca] })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [_jsx(FindingBadge, { severity: risk }), _jsx("span", { style: { fontSize: 10, color: T.text3 }, children: open ? "▲" : "▼" })] })] }), open && (_jsx("div", { style: { padding: "0 14px 12px" }, children: _jsx(CipherBreakdown, { analysis: d.analysis, compact: compact }) }))] }));
}
export default function CBOMPage() {
    const klRef = useRef(null);
    const caRef = useRef(null);
    const protoRef = useRef(null);
    const caLegendRef = useRef(null);
    const protoLegendRef = useRef(null);
    const bp = useBreakpoint();
    const isMobile = bp === "mobile";
    const isTablet = bp === "tablet";
    const isDesktop = bp === "desktop";
    const [cbomData, setCbomData] = useState([]);
    const [stats, setStats] = useState({
        total_apps: 0, weak_crypto: 0, pqc_ready: 0, active_certs: 0
    });
    const [cipherData, setCipherData] = useState(DEFAULT_CIPHERS);
    const [caData, setCaData] = useState(DEFAULT_CAS);
    const [protoData, setProtoData] = useState(DEFAULT_PROTOCOLS);
    const [keyData, setKeyData] = useState({});
    const [expandedRow, setExpandedRow] = useState(null);
    useEffect(() => {
        fetch(`${API}/cbom`)
            .then(r => r.json())
            .then(d => {
            if (d.apps?.length) {
                setCbomData(d.apps);
                setStats(d.stats || stats);
                if (d.cipher_counts?.length)
                    setCipherData(d.cipher_counts.map((c, i) => ({
                        name: c.name, count: c.count,
                        color: [T.green, T.blue, T.cyan, T.yellow, T.red][i] || T.text3,
                    })));
                if (d.ca_counts?.length)
                    setCaData(d.ca_counts.map((c, i) => ({
                        label: c.label, val: c.val,
                        color: [T.blue, T.cyan, T.green, T.yellow][i] || T.text3,
                    })));
                if (d.proto_counts?.length)
                    setProtoData(d.proto_counts.map((p) => ({
                        label: p.label, val: p.val,
                        color: p.label.includes("1.3") ? T.green
                            : p.label.includes("1.2") ? T.blue
                                : p.label.includes("1.1") ? T.orange : T.red,
                    })));
                setKeyData(d.key_counts || {});
            }
        })
            .catch(() => { });
    }, []);
    useEffect(() => { drawKeyLength(); }, [keyData, bp]);
    useEffect(() => { drawCA(); }, [caData]);
    useEffect(() => { drawProto(); }, [protoData]);
    const displayData = cbomData.length ? cbomData : MOCK_CBOM;
    const analysed = displayData.map((d) => ({
        ...d,
        analysis: fullAnalysis(d.cipher ?? "", d.tls ?? "", d.key_exchange_group ?? null),
    }));
    const findingCounts = analysed.reduce((acc, a) => {
        a.analysis.findings.forEach((f) => {
            acc[f.severity] = (acc[f.severity] || 0) + 1;
        });
        return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });
    const noPFSCount = analysed.filter((a) => !a.analysis.components.pfs).length;
    const brokenCount = analysed.filter((a) => a.analysis.findings.some((f) => f.code.startsWith("BROKEN"))).length;
    function drawKeyLength() {
        const c = klRef.current;
        if (!c)
            return;
        const ctx = c.getContext("2d");
        const W = c.offsetWidth || 280, H = 160;
        c.width = W;
        const bars = [
            { label: "4096", val: keyData["4096"] || 0, color: T.green },
            { label: "3072", val: keyData["3072"] || 0, color: T.blue },
            { label: "2048", val: keyData["2048"] || 0, color: T.cyan },
            { label: "1024", val: keyData["1024"] || 0, color: T.yellow },
            { label: "other", val: keyData["other"] || 0, color: T.red },
        ];
        const max = Math.max(...bars.map(b => b.val), 1);
        const bw = isMobile ? 22 : 30;
        const gap = isMobile ? 8 : 16;
        const startX = (W - (bars.length * (bw + gap) - gap)) / 2;
        ctx.clearRect(0, 0, W, H);
        bars.forEach((b) => {
            const x = startX + bars.indexOf(b) * (bw + gap);
            const barH = Math.round((b.val / max) * (H - 30));
            const y = H - barH - 20;
            ctx.fillStyle = b.color + "22";
            ctx.fillRect(x, y, bw, barH);
            ctx.fillStyle = b.color + "88";
            ctx.fillRect(x, y + 3, bw, barH - 3);
            ctx.fillStyle = b.color;
            ctx.fillRect(x, y, bw, 3);
            ctx.fillStyle = b.color;
            ctx.font = "9px 'Share Tech Mono'";
            ctx.textAlign = "center";
            ctx.fillText(String(b.val), x + bw / 2, y - 4);
            ctx.fillStyle = "rgba(200,220,255,0.25)";
            ctx.fillText(b.label, x + bw / 2, H - 4);
        });
    }
    function drawDonut(canvas, data, legendRef) {
        if (!canvas)
            return;
        const ctx = canvas.getContext("2d");
        const W = 160, H = 160, cx = 80, cy = 80, r = 55;
        const total = data.reduce((a, d) => a + d.val, 0);
        if (total === 0)
            return;
        let angle = -Math.PI / 2;
        ctx.clearRect(0, 0, W, H);
        data.forEach(d => {
            const sweep = 2 * Math.PI * (d.val / total) - 0.04;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, angle, angle + sweep);
            ctx.fillStyle = d.color + "33";
            ctx.fill();
            ctx.strokeStyle = d.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            angle += 2 * Math.PI * (d.val / total);
        });
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.fillStyle = "#080c14";
        ctx.fill();
        if (legendRef.current) {
            legendRef.current.innerHTML = data.map(d => `
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:8px;height:8px;border-radius:1px;background:${d.color};flex-shrink:0;"></div>
          <span style="font-size:9px;color:${T.text2};flex:1;">${d.label}</span>
          <span style="font-size:9px;font-family:'Orbitron',monospace;color:${d.color};">${d.val}</span>
        </div>`).join("");
        }
    }
    function drawCA() { drawDonut(caRef.current, caData, caLegendRef); }
    function drawProto() { drawDonut(protoRef.current, protoData, protoLegendRef); }
    function exportCSV() {
        const rows = [
            ["Application", "Key Length", "Cipher Suite", "Key Exchange", "KX Source",
                "Auth", "Bulk Cipher", "MAC", "PFS", "PQC Hybrid",
                "TLS Version", "CA", "Overall Risk", "DORA Findings", "PQC Ready", "PQC Impact"],
            ...analysed.map((d) => {
                const c = d.analysis.components;
                const findings = d.analysis.findings
                    .filter((f) => f.severity !== "ok")
                    .map((f) => `[${f.code}] ${f.title}`)
                    .join(" | ");
                return [
                    d.app, d.keylen, d.cipher,
                    c.keyExchange, c.kxSource,
                    c.authentication, c.bulkCipher, c.mac,
                    c.pfs ? "Yes" : "No",
                    c.pqcHybrid ? "Yes" : "No",
                    normaliseTLS(d.tls), d.ca,
                    d.analysis.overallRisk.toUpperCase(),
                    findings || "Compliant",
                    isPQCReady(d, d.analysis) ? "Yes" : "No",
                    d.analysis.pqcImpact,
                ];
            })
        ];
        const csv = rows.map(r => r.map((v) => `"${v}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const el = document.createElement("a");
        el.href = url;
        el.download = "rebel-cbom-full.csv";
        el.click();
    }
    const maxCipher = Math.max(...cipherData.map(c => c.count), 1);
    const metricCols = isMobile ? "1fr 1fr" : isTablet ? "repeat(3,1fr)" : "repeat(5,1fr)";
    const chartCols = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)";
    return (_jsxs("div", { style: S.page, children: [_jsxs("div", { style: { display: "grid", gridTemplateColumns: metricCols,
                    gap: isMobile ? 8 : 9 }, children: [_jsx(MetricCard, { label: "TOTAL APPS", value: stats.total_apps || displayData.length, sub: "Applications", color: T.blue }), _jsx(MetricCard, { label: "CRITICAL", value: findingCounts.critical || 0, sub: "DORA findings", color: T.red }), _jsx(MetricCard, { label: "NO PFS", value: noPFSCount, sub: "No fwd secrecy", color: T.orange }), _jsx(MetricCard, { label: "WEAK CIPHER", value: stats.weak_crypto || brokenCount, sub: "Needs remediation", color: T.yellow }), _jsx("div", { style: isMobile ? { gridColumn: "1/-1" } : {}, children: _jsx(MetricCard, { label: "PQC READY", value: stats.pqc_ready || 0, sub: "Post-quantum", color: T.green }) })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "DORA ART. 9.4 \u2014 LIVE FINDING SUMMARY" }), _jsx("div", { style: { padding: "10px 14px", display: "grid",
                            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)",
                            gap: 8 }, children: ["critical", "high", "medium", "low"].map(sev => {
                            const count = findingCounts[sev] || 0;
                            const color = severityColor(sev);
                            const pct = Math.min(100, Math.round(count / Math.max(analysed.length, 1) * 100));
                            return (_jsxs("div", { style: {
                                    background: "rgba(59,130,246,0.03)",
                                    border: `1px solid ${color}22`,
                                    borderRadius: 3, padding: 10,
                                }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between",
                                            marginBottom: 6 }, children: [_jsx("span", { style: { fontSize: 9, color, letterSpacing: ".12em",
                                                    textTransform: "uppercase" }, children: sev }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace",
                                                    fontSize: 14, color }, children: count })] }), _jsx("div", { style: { height: 3, background: "rgba(255,255,255,0.05)",
                                            borderRadius: 2 }, children: _jsx("div", { style: { height: "100%", width: `${pct}%`, background: color,
                                                borderRadius: 2, transition: "width 0.8s ease" } }) }), _jsxs("div", { style: { fontSize: 7, color: T.text3, marginTop: 4 }, children: ["findings across ", analysed.length, " apps"] })] }, sev));
                        }) })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: chartCols,
                    gap: isMobile ? 8 : 10 }, children: [_jsxs(Panel, { children: [_jsx(PanelHeader, { left: "KEY LENGTH DISTRIBUTION" }), _jsxs("div", { style: { padding: 14 }, children: [_jsx("canvas", { ref: klRef, style: { width: "100%", height: 160 } }), _jsx("div", { style: { display: "flex", justifyContent: "space-around", marginTop: 8 }, children: [["4096", T.green], ["3072", T.blue], ["2048", T.cyan],
                                            ["1024", T.yellow], ["other", T.red]].map(([lbl, clr]) => (_jsx("div", { style: { textAlign: "center" }, children: _jsx("div", { style: { fontSize: 10, color: clr,
                                                    fontFamily: "'Orbitron',monospace" }, children: lbl }) }, lbl))) })] })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "CIPHER USAGE" }), _jsx("div", { style: { padding: 14, display: "flex",
                                    flexDirection: "column", gap: 9 }, children: cipherData.map(c => {
                                    const parsed = parseCipher(c.name);
                                    const riskCol = !parsed.pfs ? T.red
                                        : parsed.bulkCipher.includes("DES") || parsed.bulkCipher === "RC4-128" ? T.red
                                            : parsed.bulkCipher.includes("CBC") ? T.orange : T.green;
                                    return (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between",
                                                    marginBottom: 3, gap: 6 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center",
                                                            gap: 5, minWidth: 0, flex: 1 }, children: [_jsx("span", { style: { width: 6, height: 6, borderRadius: "50%",
                                                                    background: riskCol, flexShrink: 0 } }), _jsx("span", { style: { fontSize: 9, color: T.text3,
                                                                    overflow: "hidden", textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap" }, children: c.name })] }), _jsx("span", { style: { fontSize: 9, fontFamily: "'Orbitron',monospace",
                                                            color: c.color, flexShrink: 0 }, children: c.count })] }), _jsx(ProgBar, { pct: Math.round(c.count / maxCipher * 100), color: riskCol })] }, c.name));
                                }) })] }), _jsx("div", { style: isTablet ? { gridColumn: "1/-1" } : {}, children: _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "TOP CERTIFICATE AUTHORITIES" }), _jsxs("div", { style: { padding: 14, display: "flex",
                                        gap: (isMobile || isTablet) ? 16 : 0,
                                        flexDirection: (isMobile || isTablet) ? "row" : "column",
                                        alignItems: (isMobile || isTablet) ? "center" : "stretch" }, children: [_jsx("canvas", { ref: caRef, width: 160, height: 160, style: {
                                                display: "block",
                                                margin: (isMobile || isTablet) ? "0" : "0 auto 10px",
                                                flexShrink: 0,
                                                width: (isMobile || isTablet) ? 110 : 160,
                                                height: (isMobile || isTablet) ? 110 : 160,
                                            } }), _jsx("div", { ref: caLegendRef, style: { display: "flex",
                                                flexDirection: "column", gap: 5, flex: 1 } })] })] }) })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "APPLICATION CRYPTOGRAPHIC INVENTORY", right: _jsx("button", { style: { ...S.btn, fontSize: isMobile ? 9 : 11 }, onClick: exportCSV, children: isMobile ? "↓ CSV" : "↓ EXPORT FULL CSV" }) }), !isDesktop && (_jsx("div", { style: { maxHeight: isMobile ? 420 : 560, overflowY: "auto" }, children: analysed.map((d, i) => (_jsx(AppCard, { d: d, compact: isMobile }, i))) })), isDesktop && (_jsx(_Fragment, { children: _jsx(Table, { cols: [
                                "APPLICATION", "KEY LEN", "KEY EXCHANGE", "BULK CIPHER",
                                "PFS", "TLS VER", "CA", "OVERALL RISK", "PQC", ""
                            ], children: analysed.map((d, i) => {
                                const c = d.analysis.components;
                                const risk = d.analysis.overallRisk;
                                const isOpen = expandedRow === i;
                                const tlsNorm = normaliseTLS(d.tls);
                                const keyCol = d.keylen?.startsWith("1024") ? T.red
                                    : d.keylen?.startsWith("2048") ? T.yellow : T.green;
                                const bulkCol = c.bulkCipher.includes("DES") || c.bulkCipher === "RC4-128"
                                    ? T.red
                                    : c.bulkCipher.includes("CBC") ? T.orange : T.green;
                                return (_jsxs(React.Fragment, { children: [_jsxs(TR, { children: [_jsx(TD, { style: { color: T.blue, fontSize: 10 }, children: d.app }), _jsx(TD, { style: { fontSize: 10, color: keyCol }, children: d.keylen }), _jsxs(TD, { style: { fontSize: 9, color: c.pfs ? T.cyan : T.red,
                                                        fontFamily: "'Share Tech Mono',monospace" }, children: [c.keyExchange, c.kxSource === "backend" && (_jsx("span", { style: { fontSize: 7, color: T.text3, marginLeft: 4 }, children: "\u2022" }))] }), _jsx(TD, { style: { fontSize: 9, color: bulkCol,
                                                        fontFamily: "'Share Tech Mono',monospace",
                                                        maxWidth: 120, overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap" }, children: c.bulkCipher }), _jsx(TD, { style: { textAlign: "center", fontSize: 13 }, children: c.pfs
                                                        ? _jsx("span", { style: { color: T.green }, children: "\u2713" })
                                                        : _jsx("span", { style: { color: T.red }, children: "\u2717" }) }), _jsx(TD, { children: _jsxs(Badge, { v: tlsNorm === "1.0" ? "red" : tlsNorm === "1.1" ? "orange" : tlsNorm === "1.2" ? "yellow" : "green", children: ["TLS ", tlsNorm] }) }), _jsx(TD, { style: { fontSize: 9, color: T.text3 }, children: d.ca }), _jsx(TD, { children: _jsx(Badge, { v: severityVariant(risk), children: risk.toUpperCase() }) }), _jsx(TD, { style: { textAlign: "center" }, children: (() => {
                                                        // ACTIVE — PQC hybrid already negotiated
                                                        if (c.pqcHybrid || d.pqc === true)
                                                            return _jsx("span", { style: { fontSize: 8, fontWeight: 600,
                                                                    color: T.green, border: `1px solid ${T.green}44`,
                                                                    borderRadius: 2, padding: "1px 5px",
                                                                    letterSpacing: ".06em" }, children: "ACTIVE" });
                                                        // READY — real ECDHE key exchange detected
                                                        // Only X25519, P-256, P-384, secp* — genuine ephemeral EC
                                                        const kx = c.keyExchange?.toLowerCase() ?? "";
                                                        const isECDHE = kx === "x25519" ||
                                                            kx === "p-256" ||
                                                            kx === "p-384" ||
                                                            kx === "p-521" ||
                                                            kx === "x448" ||
                                                            kx.startsWith("secp") ||
                                                            kx === "ecdhe";
                                                        if (isECDHE)
                                                            return _jsx("span", { style: { fontSize: 8, fontWeight: 600,
                                                                    color: T.yellow, border: `1px solid ${T.yellow}44`,
                                                                    borderRadius: 2, padding: "1px 5px",
                                                                    letterSpacing: ".06em" }, children: "READY" });
                                                        // NOT READY — RSA, DHE, unknown, or TLS 1.3 without kxGroup
                                                        return _jsx("span", { style: { color: T.red, fontSize: 13 }, children: "\u2717" });
                                                    })() }), _jsx(TD, { children: _jsx("button", { onClick: () => setExpandedRow(isOpen ? null : i), style: { ...S.btn, fontSize: 9, padding: "2px 7px" }, children: isOpen ? "▲" : "▼ details" }) })] }), isOpen && (_jsx(TR, { children: _jsx("td", { colSpan: 10, style: { padding: "0 12px 12px" }, children: _jsx(CipherBreakdown, { analysis: d.analysis, compact: false }) }) }))] }, i));
                            }) }) })), _jsxs("div", { style: { padding: "8px 12px",
                            borderTop: `1px solid rgba(59,130,246,0.07)`,
                            display: "flex", justifyContent: "space-between",
                            alignItems: "center", flexWrap: "wrap", gap: 8 }, children: [_jsxs("span", { style: { fontSize: 10, color: T.text3 }, children: [_jsx("b", { style: { color: T.text2 }, children: analysed.length }), " apps \u00B7", _jsxs("b", { style: { color: T.red }, children: [" ", findingCounts.critical] }), " critical \u00B7", _jsxs("b", { style: { color: T.orange }, children: [" ", findingCounts.high] }), " high \u00B7", _jsxs("b", { style: { color: T.red }, children: [" ", noPFSCount] }), " without PFS"] }), !isMobile && (_jsx("span", { style: { fontSize: 9, color: T.text3 }, children: isDesktop ? "Click ▼ details to expand" : "Tap row to expand" }))] })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "ENCRYPTION PROTOCOLS" }), _jsxs("div", { style: { padding: 14, display: "flex", gap: 16,
                            alignItems: "center",
                            flexDirection: isMobile ? "column" : "row" }, children: [_jsx("canvas", { ref: protoRef, width: 140, height: 140, style: {
                                    width: isMobile ? "100%" : 140,
                                    height: 140,
                                    maxWidth: 200,
                                } }), _jsx("div", { ref: protoLegendRef, style: { display: "flex",
                                    flexDirection: "column", gap: 9, flex: 1,
                                    width: isMobile ? "100%" : "auto" } })] })] })] }));
}
