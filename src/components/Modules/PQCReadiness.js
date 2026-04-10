import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { exportAuditPDF } from "./exportPDF.js";
import { MOCK_CBOM, MOCK_ASSETS, } from "./shared.js";
import { fullAnalysis, normaliseTLS, pqcReadinessScore, } from "./cipherAnalysis.js";
const API = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
    "https://r3bel-production.up.railway.app";
// ── Cache config ──────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_KEY_CBOM = "rebel_cache_cbom_pqcr";
const CACHE_KEY_ASSETS = "rebel_cache_assets_pqcr";
const CACHE_KEY_GHOST = "rebel_cache_ghost_pqcr";
function cacheGet(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw)
            return null;
        const entry = JSON.parse(raw);
        if (Date.now() - entry.ts > CACHE_TTL_MS) {
            localStorage.removeItem(key);
            return null;
        }
        return entry.data;
    }
    catch {
        return null;
    }
}
function cacheSet(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    }
    catch { }
}
function cacheClearAll() {
    [CACHE_KEY_CBOM, CACHE_KEY_ASSETS, CACHE_KEY_GHOST].forEach(k => localStorage.removeItem(k));
}
function cacheAgeLabel(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw)
            return null;
        const entry = JSON.parse(raw);
        const mins = Math.round((Date.now() - entry.ts) / 60000);
        return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
    }
    catch {
        return null;
    }
}
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
    input: {
        background: L.insetBg,
        border: `1px solid ${L.border}`,
        borderRadius: 5,
        color: L.text1,
        padding: "7px 10px",
        fontSize: 12,
        outline: "none",
    },
    btn: {
        background: L.subtleBg,
        border: `1px solid ${L.border}`,
        borderRadius: 4,
        color: L.text2,
        padding: "5px 11px",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".06em",
    },
};
// ── INR Formatter ─────────────────────────────────────────────────────────────
const INR_RATE = 83;
function toINR(usd) { return Math.round(usd * INR_RATE); }
function fmtINR(usd) {
    const inr = toINR(usd);
    if (inr >= 10000000)
        return `₹${(inr / 10000000).toFixed(2)}Cr`;
    if (inr >= 100000)
        return `₹${(inr / 100000).toFixed(1)}L`;
    return `₹${inr.toLocaleString("en-IN")}`;
}
function fmtINRFull(usd) {
    return `₹${toINR(usd).toLocaleString("en-IN")}`;
}
const EFFORT = {
    "Web App": 2, "Web Apps": 2,
    "API": 3, "APIs": 3,
    "Server": 5, "Servers": 5,
    "LB": 1, "Other": 3,
};
const DEV_RATE_USD = 800;
function normaliseDomain(raw) {
    return raw.trim().toLowerCase()
        .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}
function appMatchesDomain(appName, clientDomain) {
    if (!clientDomain)
        return true;
    const app = normaliseDomain(appName), domain = normaliseDomain(clientDomain);
    return app === domain || app.endsWith("." + domain);
}
const GENERIC_NAMES = new Set(["api", "web", "app", "server", "lb", "www", "cdn", "mail", "vpn"]);
function matchAsset(appName, assets) {
    const root = appName?.split(".")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
    if (!root || root.length < 3 || GENERIC_NAMES.has(root))
        return undefined;
    const exact = assets.find(a => a.name?.toLowerCase().replace(/[^a-z0-9]/g, "") === root);
    if (exact)
        return exact;
    const sw = assets.find(a => { const n = a.name?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? ""; return n.length >= 3 && root.startsWith(n); });
    if (sw)
        return sw;
    const contains = assets.filter(a => { const n = a.name?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? ""; return n.length >= 3 && root.includes(n); });
    return contains.length === 1 ? contains[0] : undefined;
}
function riskWeight(app, asset) {
    const isPublic = asset?.type === "Web Apps" || asset?.type === "Web App";
    let w = 1;
    if (app?.keylen?.startsWith("1024"))
        w += 2;
    if (app?.status === "weak" || app?.status === "WEAK")
        w += 1;
    if (isPublic)
        w *= 1.5;
    if (!app?.pqc)
        w += 0.5;
    return Math.round(w * 10) / 10;
}
function riskLabel(w) {
    if (w >= 4.5)
        return "Critical";
    if (w >= 3)
        return "High";
    if (w >= 2)
        return "Medium";
    return "Low";
}
function riskVariant(r) {
    return r === "Critical" ? L.red : r === "High" ? L.orange : r === "Medium" ? L.yellow : L.green;
}
function useBreakpoint() {
    const get = () => { const w = window.innerWidth; if (w < 480)
        return "mobile"; if (w < 900)
        return "tablet"; return "desktop"; };
    const [bp, setBp] = useState(get);
    useEffect(() => { const h = () => setBp(get()); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
    return bp;
}
// ── Skeleton Components ───────────────────────────────────────────────────────
function Shimmer({ w = "100%", h = 16, radius = 4, style = {} }) {
    return (_jsx("div", { style: {
            width: w, height: h, borderRadius: radius,
            background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s ease infinite",
            flexShrink: 0, ...style,
        } }));
}
function SkeletonMetricCard() {
    return (_jsxs("div", { style: { background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }, children: [_jsx(Shimmer, { w: "55%", h: 8, style: { marginBottom: 10 } }), _jsx(Shimmer, { w: "70%", h: 26, style: { marginBottom: 8 } }), _jsx(Shimmer, { w: "45%", h: 8 })] }));
}
function SkeletonGaugePanel() {
    return (_jsxs("div", { style: { ...LS.panel }, children: [_jsx("div", { style: { padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "8px 8px 0 0" }, children: _jsx(Shimmer, { w: 160, h: 9 }) }), _jsxs("div", { style: { padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }, children: [_jsxs("div", { style: { width: 200, height: 120, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative" }, children: [_jsx("div", { style: { width: 180, height: 90, borderRadius: "90px 90px 0 0", border: "14px solid #e2e8f0", borderBottom: "none", background: "transparent", animation: "shimmer 1.4s ease infinite" } }), _jsxs("div", { style: { position: "absolute", bottom: 0, textAlign: "center" }, children: [_jsx(Shimmer, { w: 60, h: 32, radius: 6, style: { margin: "0 auto 6px" } }), _jsx(Shimmer, { w: 80, h: 9, radius: 4, style: { margin: "0 auto" } })] })] }), [100, 80, 65, 90, 40].map((w, i) => (_jsxs("div", { style: { width: "100%" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx(Shimmer, { w: `${w}%`, h: 9 }), _jsx(Shimmer, { w: 30, h: 9, style: { marginLeft: 8 } })] }), _jsx(Shimmer, { w: "100%", h: 4, radius: 2 })] }, i)))] })] }));
}
function SkeletonTableRows({ count = 6 }) {
    return (_jsx(_Fragment, { children: Array.from({ length: count }).map((_, i) => (_jsxs("tr", { style: { borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }, children: [_jsx("td", { style: { padding: "10px 8px" }, children: _jsx(Shimmer, { w: 18, h: 9 }) }), _jsx("td", { style: { padding: "10px 8px" }, children: _jsx(Shimmer, { w: 140, h: 10 }) }), _jsx("td", { style: { padding: "10px 8px" }, children: _jsx(Shimmer, { w: 60, h: 18, radius: 3 }) }), _jsx("td", { style: { padding: "10px 8px" }, children: _jsx(Shimmer, { w: 55, h: 18, radius: 3 }) }), _jsx("td", { style: { padding: "10px 8px" }, children: _jsx(Shimmer, { w: 50, h: 10 }) }), _jsx("td", { style: { padding: "10px 8px" }, children: _jsx(Shimmer, { w: 120, h: 9 }) }), _jsx("td", { style: { padding: "10px 8px" }, children: _jsx(Shimmer, { w: 45, h: 10 }) }), _jsx("td", { style: { padding: "10px 8px" }, children: _jsx(Shimmer, { w: 70, h: 9 }) }), _jsx("td", { style: { padding: "10px 8px", textAlign: "center" }, children: _jsx(Shimmer, { w: 52, h: 18, radius: 3, style: { margin: "0 auto" } }) }), _jsx("td", { style: { padding: "10px 8px" }, children: _jsx(Shimmer, { w: 30, h: 10 }) }), _jsx("td", { style: { padding: "10px 8px" }, children: _jsx(Shimmer, { w: 65, h: 10 }) }), _jsx("td", { style: { padding: "10px 8px", textAlign: "center" }, children: _jsx(Shimmer, { w: 12, h: 12, radius: 6, style: { margin: "0 auto" } }) }), _jsx("td", { style: { padding: "10px 8px", textAlign: "center" }, children: _jsx(Shimmer, { w: 12, h: 12, radius: 6, style: { margin: "0 auto" } }) })] }, i))) }));
}
function SkeletonRoadmapCards({ count = 5 }) {
    return (_jsx(_Fragment, { children: Array.from({ length: count }).map((_, i) => (_jsxs("div", { style: { borderBottom: `1px solid ${L.borderLight}`, padding: "12px 14px" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }, children: [_jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [_jsx(Shimmer, { w: 24, h: 9 }), _jsx(Shimmer, { w: 160, h: 11 })] }), _jsxs("div", { style: { display: "flex", gap: 6 }, children: [_jsx(Shimmer, { w: 52, h: 18, radius: 3 }), _jsx(Shimmer, { w: 52, h: 18, radius: 3 })] })] }), _jsxs("div", { style: { display: "flex", gap: 10 }, children: [_jsx(Shimmer, { w: 50, h: 9 }), _jsx(Shimmer, { w: 30, h: 9 }), _jsx(Shimmer, { w: 55, h: 9 }), _jsx(Shimmer, { w: 40, h: 9 })] })] }, i))) }));
}
// ── Cache Badge ───────────────────────────────────────────────────────────────
function CacheBadge({ age, onRefresh }) {
    if (!age)
        return null;
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsxs("span", { style: { fontSize: 8, fontWeight: 600, color: L.text3, background: L.insetBg, border: `1px solid ${L.border}`, borderRadius: 3, padding: "2px 7px", letterSpacing: ".06em" }, children: ["CACHED \u00B7 ", age] }), _jsx("button", { onClick: onRefresh, style: { ...LS.btn, fontSize: 9, padding: "3px 8px", color: L.blue, borderColor: `${L.blue}40`, background: `${L.blue}0d` }, children: "\u21BA REFRESH" })] }));
}
// ── Secure Mode Banner ────────────────────────────────────────────────────────
function SecureModeBanner() {
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: `${L.purple}0d`, border: `1px solid ${L.purple}44`, borderRadius: 6 }, children: [_jsx("span", { style: { fontSize: 9, color: L.purple, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }, children: "\uD83D\uDD12 SECURE MODE ACTIVE" }), _jsx("span", { style: { fontSize: 9, color: L.purple, opacity: 0.75 }, children: "\u00B7" }), _jsx("span", { style: { fontSize: 9, color: L.purple, fontFamily: "'DM Mono', monospace" }, children: "/ghost/assets \u2014 anonymised data, no live scans" })] }));
}
// ── vCenter Override Banner ───────────────────────────────────────────────────
function VCenterBanner({ count }) {
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.28)", borderRadius: 6 }, children: [_jsx("span", { style: { fontSize: 9, color: "#0284c7", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }, children: "\u2B21 VCENTER ASSETS ACTIVE" }), _jsx("span", { style: { fontSize: 9, color: "#0284c7", opacity: 0.75 }, children: "\u00B7" }), _jsxs("span", { style: { fontSize: 9, color: "#0284c7", fontFamily: "'DM Mono', monospace" }, children: [count, " VMs from infrastructure \u2014 overriding /ghost/assets"] })] }));
}
// ── Light Panel Components ────────────────────────────────────────────────────
function LPanel({ children, style = {} }) {
    return _jsx("div", { style: { ...LS.panel, ...style }, children: children });
}
function LPanelHeader({ left, right }) {
    return (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "8px 8px 0 0" }, children: [_jsx("span", { style: { fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" }, children: left }), right] }));
}
function LMetricCard({ label, value, sub, color }) {
    return (_jsxs("div", { style: { background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }, children: [_jsx("div", { style: { fontSize: 8, color: L.text4, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 }, children: label }), _jsx("div", { style: { fontSize: 22, fontWeight: 800, color, lineHeight: 1 }, children: value }), _jsx("div", { style: { fontSize: 9, color: L.text3, marginTop: 5 }, children: sub })] }));
}
// ── Score Gauge ───────────────────────────────────────────────────────────────
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
        const safePct = Math.min(0.999, Math.max(0.001, shown / 100));
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * safePct, false);
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
    const label = shown >= 70 ? "GOOD" : shown >= 40 ? "AT RISK" : "CRITICAL";
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }, children: [_jsx("canvas", { ref: ref, style: { width: "100%", maxWidth: size, height: "auto" } }), _jsxs("div", { style: { marginTop: -6, textAlign: "center" }, children: [_jsx("div", { style: { fontFamily: "'DM Mono',monospace", fontSize: Math.round(size * 0.18), fontWeight: 900, color: col }, children: shown }), _jsx("div", { style: { fontFamily: "'DM Mono',monospace", fontSize: 9, color: col, letterSpacing: ".2em", marginTop: 2 }, children: label }), _jsx("div", { style: { fontSize: 9, color: L.text3, marginTop: 4 }, children: "MIGRATION PROGRESS" })] })] }));
}
// ── Roadmap Card ──────────────────────────────────────────────────────────────
function RoadmapCard({ a, i }) {
    const [open, setOpen] = useState(false);
    const ps = a.pqcScore;
    return (_jsxs("div", { style: { borderBottom: `1px solid ${L.borderLight}`, background: L.panelBg, transition: "background 0.15s" }, onMouseEnter: e => (e.currentTarget.style.background = L.subtleBg), onMouseLeave: e => (e.currentTarget.style.background = L.panelBg), children: [_jsxs("div", { onClick: () => setOpen(o => !o), style: { padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }, children: [_jsxs("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: 9, color: L.text4, flexShrink: 0 }, children: ["#", i + 1] }), _jsx("span", { style: { fontSize: 12, color: L.blue, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }, children: a.app }), a.isPublic && _jsx("span", { style: { fontSize: 7, color: L.cyan, border: `1px solid ${L.cyan}55`, borderRadius: 2, padding: "1px 4px", flexShrink: 0, background: `${L.cyan}10` }, children: "PUB" })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [ps && _jsx("span", { style: { fontSize: 8, fontWeight: 700, color: ps.color, border: `1px solid ${ps.color}55`, borderRadius: 2, padding: "1px 5px", background: `${ps.color}10` }, children: ps.active ? "ACTIVE" : `${ps.score}/100` }), _jsx("span", { style: { fontSize: 8, fontWeight: 700, color: riskVariant(a.risk), border: `1px solid ${riskVariant(a.risk)}44`, borderRadius: 3, padding: "2px 7px", background: `${riskVariant(a.risk)}0d` }, children: a.risk }), _jsx("span", { style: { fontSize: 10, color: L.text4 }, children: open ? "▲" : "▼" })] })] }), _jsxs("div", { style: { padding: "0 14px 10px", display: "flex", gap: 10, flexWrap: "wrap" }, children: [_jsx("span", { style: { fontSize: 9, color: L.text3 }, children: a.assetType }), _jsxs("span", { style: { fontSize: 9, color: L.cyan, fontWeight: 600 }, children: [a.days, "d"] }), _jsx("span", { style: { fontSize: 9, color: L.orange, fontWeight: 600 }, children: fmtINR(a.cost) }), _jsx("span", { style: { fontSize: 9, color: a.pqc ? L.green : L.red, fontWeight: 600 }, children: a.pqc ? "PQC ✓" : "PQC ✗" })] }), open && ps && (_jsxs("div", { style: { padding: "0 14px 12px", borderTop: `1px solid ${L.borderLight}`, paddingTop: 10, background: L.insetBg }, children: [Object.values(ps.criteria).map((c) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 9, marginBottom: 4 }, children: [_jsx("span", { style: { color: c.pass ? "#16a34a" : c.pts > 0 ? "#b45309" : "#dc2626", width: 10, fontWeight: 700 }, children: c.pass ? "✓" : c.pts > 0 ? "~" : "✗" }), _jsx("span", { style: { color: L.text2, flex: 1 }, children: c.label }), _jsxs("span", { style: { color: L.text1, fontFamily: "'DM Mono',monospace", fontWeight: 600 }, children: [c.pts, "/", c.max] })] }, c.label))), _jsx("div", { style: { fontSize: 8, color: L.text3, marginTop: 6, fontStyle: "italic" }, children: ps.active ? "Kyber hybrid active — ACTIVE status confirmed." : ps.score >= 70 ? "Address remaining criteria then deploy Kyber hybrid." : "Significant gaps — fix cert key and wildcard first." })] }))] }));
}
// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PQCReadinessPage({ vcenterAssets } = {}) {
    const [cbomData, setCbomData] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [fromCache, setFromCache] = useState(false);
    const [cachedAt, setCachedAt] = useState(null);
    const [teamSize, setTeamSize] = useState(2);
    const [devRate, setDevRate] = useState(DEV_RATE_USD);
    const [domainInput, setDomainInput] = useState("");
    const [activeDomain, setActiveDomain] = useState("");
    const [clientName, setClientName] = useState("");
    const [secureModeOn, setSecureModeOn] = useState(false);
    const [secureModeLoading, setSecureModeLoading] = useState(true);
    const hasVCenter = (vcenterAssets?.length ?? 0) > 0;
    const bp = useBreakpoint(), isMobile = bp === "mobile", isTablet = bp === "tablet", isDesktop = bp === "desktop";
    // ── Fetch secure mode status on mount ────────────────────────────────────
    useEffect(() => {
        fetch(`${API}/secure-mode/status`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.enabled !== undefined)
            setSecureModeOn(Boolean(d.enabled)); })
            .catch(() => { })
            .finally(() => setSecureModeLoading(false));
    }, []);
    // ── Merge helper (normal mode only) ──────────────────────────────────────
    function buildMerged(cbom, assetsData) {
        const registeredMap = {};
        (assetsData?.assets ?? []).forEach((a) => { if (a.name)
            registeredMap[a.name] = a; });
        const cbomApps = (cbom.apps ?? []).map((app) => {
            const reg = registeredMap[app.app];
            if (!reg)
                return app;
            return { ...app, is_wildcard: reg.is_wildcard ?? app.is_wildcard, criticality: reg.criticality, owner: reg.owner, compliance_scope: reg.compliance_scope, financial_exposure: reg.financial_exposure };
        });
        const cbomDomains = new Set(cbomApps.map((a) => a.app));
        const registeredOnly = (assetsData?.assets ?? [])
            .filter((a) => a.id && !cbomDomains.has(a.name))
            .map((a) => ({
            app: a.name, keylen: a.keylen || "—", cipher: a.cipher || "—",
            tls: a.tls || "—", ca: a.ca || "—",
            status: a.risk === "weak" ? "weak" : "ok",
            pqc: false, pqc_support: "none",
            key_exchange_group: a.key_exchange_group || null,
            is_wildcard: a.is_wildcard ?? null,
            criticality: a.criticality, owner: a.owner,
            compliance_scope: a.compliance_scope, financial_exposure: a.financial_exposure,
        }));
        return [...cbomApps, ...registeredOnly];
    }
    // ── Data fetch with cache ─────────────────────────────────────────────────
    const loadData = async (forceRefresh = false) => {
        setLoading(true);
        setFetchError(false);
        // ── vCenter override: skip all API calls, use infra assets directly ───
        if (hasVCenter) {
            const apps = vcenterAssets.map((vm) => ({
                app: vm.name,
                keylen: "—",
                cipher: "—",
                tls: "—",
                ca: "—",
                status: "unknown",
                pqc: false,
                pqc_support: "none",
                key_exchange_group: null,
                is_wildcard: null,
                ip: vm.ip,
                os: vm.os,
                cluster: vm.cluster,
                datacenter: vm.datacenter,
                power_state: vm.power_state,
            }));
            const assetList = vcenterAssets.map((vm) => ({
                name: vm.name,
                type: "Server",
                is_wildcard: false,
            }));
            setCbomData(apps);
            setAssets(assetList);
            setFromCache(false);
            setCachedAt(null);
            setLoading(false);
            return;
        }
        if (secureModeOn) {
            // ── SECURE MODE: /ghost/assets ONLY ──────────────────────────────────
            if (!forceRefresh) {
                const cached = cacheGet(CACHE_KEY_GHOST);
                if (cached) {
                    const apps = (cached?.assets ?? []).map((a) => ({
                        app: a.name, keylen: a.keylen || "—", cipher: a.cipher || "—",
                        tls: a.tls || "—", ca: a.ca || "—",
                        status: a.risk === "weak" ? "weak" : "ok",
                        pqc: false, pqc_support: "none",
                        key_exchange_group: a.key_exchange_group || null,
                        is_wildcard: a.is_wildcard ?? null,
                    }));
                    setCbomData(apps);
                    setAssets(cached?.assets ?? []);
                    setFromCache(true);
                    setCachedAt(cacheAgeLabel(CACHE_KEY_GHOST));
                    setLoading(false);
                    return;
                }
            }
            try {
                const d = await fetch(`${API}/ghost/assets`).then(r => {
                    if (!r.ok)
                        throw new Error();
                    return r.json();
                });
                cacheSet(CACHE_KEY_GHOST, d);
                const apps = (d?.assets ?? []).map((a) => ({
                    app: a.name, keylen: a.keylen || "—", cipher: a.cipher || "—",
                    tls: a.tls || "—", ca: a.ca || "—",
                    status: a.risk === "weak" ? "weak" : "ok",
                    pqc: false, pqc_support: "none",
                    key_exchange_group: a.key_exchange_group || null,
                    is_wildcard: a.is_wildcard ?? null,
                }));
                setCbomData(apps);
                setAssets(d?.assets ?? []);
                setFromCache(false);
                setCachedAt(null);
            }
            catch {
                setFetchError(true);
            }
        }
        else {
            // ── NORMAL MODE: /cbom + /assets ──────────────────────────────────────
            if (!forceRefresh) {
                const cachedCbom = cacheGet(CACHE_KEY_CBOM);
                const cachedAssets = cacheGet(CACHE_KEY_ASSETS);
                if (cachedCbom && cachedAssets) {
                    const merged = buildMerged(cachedCbom, cachedAssets);
                    if (merged.length)
                        setCbomData(merged);
                    if (cachedAssets?.assets?.length)
                        setAssets(cachedAssets.assets);
                    setFromCache(true);
                    setCachedAt(cacheAgeLabel(CACHE_KEY_CBOM));
                    setLoading(false);
                    return;
                }
            }
            try {
                const [cbom, assetsData] = await Promise.all([
                    fetch(`${API}/cbom`).then(r => { if (!r.ok)
                        throw new Error(); return r.json(); }),
                    fetch(`${API}/assets`).then(r => { if (!r.ok)
                        throw new Error(); return r.json(); }),
                ]);
                cacheSet(CACHE_KEY_CBOM, cbom);
                cacheSet(CACHE_KEY_ASSETS, assetsData);
                const merged = buildMerged(cbom, assetsData);
                if (merged.length)
                    setCbomData(merged);
                if (assetsData?.assets?.length)
                    setAssets(assetsData.assets);
                setFromCache(false);
                setCachedAt(null);
            }
            catch {
                setFetchError(true);
            }
        }
        setLoading(false);
    };
    function handleForceRefresh() {
        // Don't clear cache / re-fetch if we're in vCenter mode — data comes from props
        if (hasVCenter)
            return;
        cacheClearAll();
        setFromCache(false);
        setCachedAt(null);
        loadData(true);
    }
    // Re-run loadData whenever vCenter assets change or secure mode resolves
    useEffect(() => {
        if (!secureModeLoading)
            loadData();
    }, [secureModeOn, secureModeLoading, hasVCenter]);
    const displayCbom = cbomData.length ? cbomData : MOCK_CBOM;
    const displayAssets = assets.length ? assets : MOCK_ASSETS;
    const scopedCbom = activeDomain
        ? displayCbom.filter((a) => appMatchesDomain(a.app ?? "", activeDomain))
        : displayCbom;
    const uniqueCbom = scopedCbom.filter((a, i, arr) => arr.findIndex((b) => b.app === a.app) === i);
    const withPQCScore = uniqueCbom.map((app) => {
        const analysis = fullAnalysis(app.cipher ?? "", app.tls ?? "", app.key_exchange_group ?? null);
        const ps = pqcReadinessScore(analysis.components, app.tls, app.keylen, app.is_wildcard ?? false);
        return { ...app, analysis, pqcScore: ps };
    });
    const n = withPQCScore.length || 1;
    const allCertsStrong = withPQCScore.every((a) => { const bits = parseInt(String(a.keylen ?? "0").match(/(\d+)/)?.[1] ?? "0", 10); return bits >= 4096 || bits === 384; });
    const noWildcards = withPQCScore.every((a) => a.is_wildcard === false);
    const allAES256 = withPQCScore.every((a) => { const bulk = a.analysis?.components?.bulkCipher ?? ""; return bulk === "AES-256-GCM" || bulk === "ChaCha20-Poly1305"; });
    const allTLS13 = withPQCScore.every((a) => normaliseTLS(a.tls) === "1.3");
    const anyKyber = withPQCScore.some((a) => a.pqcScore?.active);
    const migrationScore = Math.round((allCertsStrong ? 20 : 0) + (noWildcards ? 20 : 0) + (allAES256 ? 20 : 0) + (allTLS13 ? 20 : 0) + (anyKyber ? 20 : 0));
    const certStrongPct = Math.round(withPQCScore.filter((a) => { const b = parseInt(String(a.keylen ?? "0").match(/(\d+)/)?.[1] ?? "0", 10); return b >= 4096 || b === 384; }).length / n * 100);
    const noWildPct = Math.round(withPQCScore.filter((a) => a.is_wildcard === false).length / n * 100);
    const aes256Pct = Math.round(withPQCScore.filter((a) => { const bulk = a.analysis?.components?.bulkCipher ?? ""; return bulk === "AES-256-GCM" || bulk === "ChaCha20-Poly1305"; }).length / n * 100);
    const tls13Pct = Math.round(withPQCScore.filter((a) => normaliseTLS(a.tls) === "1.3").length / n * 100);
    const milestones = [
        { label: "All certs RSA-4096 / EC P-384", pct: certStrongPct, done: allCertsStrong },
        { label: "Zero wildcard certificates", pct: noWildPct, done: noWildcards },
        { label: "AES-256-GCM on all apps", pct: aes256Pct, done: allAES256 },
        { label: "TLS 1.2 fully eliminated", pct: tls13Pct, done: allTLS13 },
        { label: "Kyber hybrid deployed", pct: anyKyber ? 100 : 0, done: anyKyber },
    ];
    const weakApps = withPQCScore.filter((a) => a.status === "weak" || a.status === "WEAK" || !a.pqc || a.keylen?.startsWith("1024"));
    const enriched = weakApps.map((app) => {
        const asset = matchAsset(app.app, displayAssets);
        const assetType = asset?.type ?? "Other";
        const days = EFFORT[assetType] ?? 3;
        const cost = days * devRate;
        const weight = riskWeight(app, asset);
        const risk = riskLabel(weight);
        const isPublic = asset?.type === "Web Apps" || asset?.type === "Web App";
        return { ...app, asset, assetType, days, cost, weight, risk, isPublic };
    }).sort((a, b) => b.weight - a.weight);
    const total = withPQCScore.length;
    const pqcReady = withPQCScore.filter((a) => a.pqc && a.status !== "weak" && a.status !== "WEAK").length;
    const totalDays = enriched.reduce((s, a) => s + a.days, 0);
    const calDays = Math.ceil(totalDays / Math.max(teamSize, 1));
    const totalCost = enriched.reduce((s, a) => s + a.cost, 0);
    const critCount = enriched.filter((a) => a.risk === "Critical").length;
    const highCount = enriched.filter((a) => a.risk === "High").length;
    const unmatchedCount = enriched.filter((a) => !a.asset).length;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + calDays);
    const dateStr = completionDate.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
    function applyDomain() { setActiveDomain(domainInput.trim()); }
    function clearFilter() { setDomainInput(""); setActiveDomain(""); setClientName(""); }
    function exportCSV() {
        const rows = [
            ["Priority", "App", "Asset Type", "Risk", "Key Length", "Cipher", "TLS", "CA", "PQC Score", "PQC Label", "Days", "Cost (INR)", "Public", "PQC Active"],
            ...enriched.map((a, i) => [i + 1, a.app, a.assetType, a.risk, a.keylen, a.cipher, a.tls, a.ca, a.pqcScore?.score ?? 0, a.pqcScore?.active ? "ACTIVE" : a.pqcScore?.label ?? "—", a.days, fmtINRFull(a.cost), a.isPublic ? "Yes" : "No", a.pqc ? "Yes" : "No"]),
        ];
        const csv = rows.map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const el = document.createElement("a");
        el.href = url;
        el.download = `rebel-pqc-${activeDomain || "all"}.csv`;
        el.click();
    }
    // Source label shown in the API status row
    const activeEndpointLabel = hasVCenter
        ? "→ vcenter/assets"
        : secureModeOn
            ? "→ /ghost/assets"
            : "→ /assets + /cbom";
    const gaugeSize = isMobile ? 160 : 200;
    const metricCols = isMobile ? "1fr 1fr" : isTablet ? "repeat(3,1fr)" : "repeat(5,1fr)";
    const scoreColor = migrationScore >= 70 ? L.green : migrationScore >= 40 ? L.yellow : L.red;
    return (_jsxs("div", { style: LS.page, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        input[type=range]{accent-color:${L.blue};}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.border};border-radius:3px;}
      ` }), hasVCenter
                ? _jsx(VCenterBanner, { count: vcenterAssets.length })
                : secureModeOn && _jsx(SecureModeBanner, {}), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "REPORT SCOPE \u2014 CLIENT DOMAIN FILTER", right: fromCache && !hasVCenter ? _jsx(CacheBadge, { age: cachedAt, onRefresh: handleForceRefresh }) : undefined }), _jsxs("div", { style: { padding: 14, display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("div", { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 8, color: L.text3, letterSpacing: ".12em", marginBottom: 5, textTransform: "uppercase", fontWeight: 600 }, children: "CLIENT DOMAIN" }), _jsxs("div", { style: { display: "flex", gap: 6 }, children: [_jsx("input", { value: domainInput, onChange: e => setDomainInput(e.target.value), onKeyDown: e => e.key === "Enter" && applyDomain(), placeholder: "e.g. barclays.com", style: { ...LS.input, flex: 1 } }), _jsx("button", { style: { ...LS.btn, background: `${L.blue}15`, borderColor: `${L.blue}40`, color: L.blue }, onClick: applyDomain, children: "APPLY" }), activeDomain && _jsx("button", { style: { ...LS.btn }, onClick: clearFilter, children: "CLEAR" })] })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 8, color: L.text3, letterSpacing: ".12em", marginBottom: 5, textTransform: "uppercase", fontWeight: 600 }, children: "CLIENT NAME (for PDF)" }), _jsx("input", { value: clientName, onChange: e => setClientName(e.target.value), placeholder: "e.g. Barclays Bank PLC", style: { ...LS.input, width: "100%" } })] })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsx("span", { style: { fontSize: 7, fontFamily: "'DM Mono',monospace", color: L.text4, letterSpacing: ".08em" }, children: "DATA SOURCE" }), _jsxs("span", { style: { fontSize: 8, fontFamily: "'DM Mono',monospace", color: fetchError ? L.red : L.green, fontWeight: 600 }, children: [fetchError ? "✗" : "✓", " ", hasVCenter ? "vCenter infrastructure" : API] }), _jsx("span", { style: {
                                            fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                                            color: hasVCenter ? "#0284c7" : secureModeOn ? L.purple : L.cyan,
                                            background: hasVCenter ? "rgba(14,165,233,0.08)" : secureModeOn ? `${L.purple}10` : `${L.cyan}10`,
                                            border: `1px solid ${hasVCenter ? "rgba(14,165,233,0.28)" : secureModeOn ? `${L.purple}44` : `${L.cyan}44`}`,
                                            borderRadius: 3, padding: "2px 6px", letterSpacing: ".04em",
                                        }, children: activeEndpointLabel }), fetchError && !hasVCenter && _jsx("span", { style: { fontSize: 8, color: L.red }, children: "\u2014 showing demo data" }), loading && _jsx("span", { style: { fontSize: 8, color: L.blue }, children: "fetching\u2026" })] }), activeDomain && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, background: `${L.blue}0a`, border: `1px solid ${L.blue}25`, borderRadius: 5, padding: "7px 12px" }, children: [_jsx("span", { style: { fontSize: 9, color: L.text3, fontWeight: 600 }, children: "ACTIVE SCOPE" }), _jsxs("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: 10, color: L.blue, fontWeight: 600 }, children: ["*.", normaliseDomain(activeDomain)] }), _jsxs("span", { style: { fontSize: 9, color: L.text3, marginLeft: "auto" }, children: [_jsx("b", { style: { color: L.text1 }, children: uniqueCbom.length }), " apps \u00B7 ", _jsx("b", { style: { color: L.red }, children: enriched.length }), " need migration"] })] })), activeDomain && uniqueCbom.length === 0 && !loading && (_jsxs("div", { style: { background: `${L.red}0a`, border: `1px solid ${L.red}25`, borderRadius: 5, padding: "8px 12px", fontSize: 10, color: L.text2 }, children: ["\u26A0 No assets found for ", _jsxs("b", { style: { color: L.red }, children: ["*.", normaliseDomain(activeDomain)] })] }))] })] }), unmatchedCount > 0 && !loading && (_jsxs("div", { style: { background: `${L.yellow}10`, border: `1px solid ${L.yellow}40`, borderRadius: 5, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("span", { style: { color: L.yellow, fontSize: 14 }, children: "\u26A0" }), _jsxs("span", { style: { fontSize: 10, color: L.text2 }, children: [_jsx("b", { style: { color: L.yellow }, children: unmatchedCount }), " asset", unmatchedCount > 1 ? "s" : "", " unmatched \u2014 defaulted to \"Other\"."] })] })), _jsx("div", { style: { display: "grid", gridTemplateColumns: metricCols, gap: isMobile ? 8 : 9 }, children: loading
                    ? Array.from({ length: 5 }).map((_, i) => _jsx(SkeletonMetricCard, {}, i))
                    : _jsxs(_Fragment, { children: [_jsx(LMetricCard, { label: "MIGRATION SCORE", value: `${migrationScore}/100`, sub: "Migration progress", color: scoreColor }), _jsx(LMetricCard, { label: "NEED MIGRATION", value: enriched.length, sub: "Weak assets", color: L.red }), _jsx(LMetricCard, { label: "CRITICAL", value: critCount, sub: "Immediate action", color: L.red }), _jsx(LMetricCard, { label: "EST. DAYS", value: calDays, sub: `${teamSize} dev team`, color: L.cyan }), _jsx("div", { style: isMobile ? { gridColumn: "1/-1" } : {}, children: _jsx(LMetricCard, { label: "EST. COST (INR)", value: fmtINR(totalCost), sub: `At ${fmtINR(devRate)}/day`, color: L.orange }) })] }) }), _jsx("div", { style: { display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: isMobile ? 8 : 10 }, children: loading
                    ? _jsxs(_Fragment, { children: [_jsx(SkeletonGaugePanel, {}), _jsx(SkeletonGaugePanel, {})] })
                    : _jsxs(_Fragment, { children: [_jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "PQC MIGRATION PROGRESS" }), _jsxs("div", { style: { padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }, children: [_jsx("div", { style: { width: "100%", maxWidth: gaugeSize + 40, margin: "0 auto" }, children: _jsx(ScoreGauge, { score: migrationScore, size: gaugeSize }) }), _jsx("div", { style: { width: "100%", display: "flex", flexDirection: "column", gap: 8 }, children: milestones.map(m => (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsxs("span", { style: { fontSize: 9, color: m.done ? L.green : L.text2, display: "flex", alignItems: "center", gap: 5, fontWeight: m.done ? 600 : 400 }, children: [_jsx("span", { style: { fontSize: 10, color: m.done ? L.green : L.text4 }, children: m.done ? "✓" : "○" }), m.label] }), _jsxs("span", { style: { fontSize: 9, fontFamily: "'DM Mono',monospace", color: m.done ? L.green : L.text3, fontWeight: 600 }, children: [m.pct, "%"] })] }), _jsx("div", { style: { height: 4, background: L.insetBg, borderRadius: 2, border: `1px solid ${L.border}` }, children: _jsx("div", { style: { height: "100%", width: `${m.pct}%`, background: m.done ? L.green : m.pct > 50 ? L.yellow : L.orange, borderRadius: 2, transition: "width 0.8s ease" } }) })] }, m.label))) }), _jsx("div", { style: { width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }, children: [
                                                    { label: "PQC ACTIVE", val: withPQCScore.filter((a) => a.pqcScore?.active).length, color: L.green },
                                                    { label: "WEAK", val: enriched.length, color: L.red },
                                                    { label: "IN SCOPE", val: total, color: L.blue },
                                                ].map(item => (_jsxs("div", { style: { background: L.subtleBg, border: `1px solid ${L.border}`, borderRadius: 5, padding: isMobile ? "6px 4px" : "8px 6px", textAlign: "center" }, children: [_jsx("div", { style: { fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 16 : 20, color: item.color, fontWeight: 700 }, children: item.val }), _jsx("div", { style: { fontSize: isMobile ? 7 : 8, color: L.text3, marginTop: 3, letterSpacing: ".08em", fontWeight: 600 }, children: item.label })] }, item.label))) })] })] }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "MIGRATION PLAN SUMMARY" }), _jsxs("div", { style: { padding: 14, display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("div", { style: { display: "grid", gridTemplateColumns: (isTablet || isDesktop) ? "1fr 1fr" : "1fr", gap: 10 }, children: [_jsxs("div", { style: { background: L.subtleBg, border: `1px solid ${L.border}`, borderRadius: 5, padding: 12 }, children: [_jsx("div", { style: { fontSize: 8, color: L.text3, marginBottom: 5, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 }, children: "ESTIMATED COMPLETION" }), _jsx("div", { style: { fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 13 : 17, color: L.cyan, fontWeight: 700 }, children: dateStr }), _jsxs("div", { style: { fontSize: 9, color: L.text2, marginTop: 4 }, children: [calDays, "d \u00B7 ", totalDays, " dev days \u00B7 ", enriched.length, " assets"] })] }), _jsxs("div", { style: { background: "#fff5f5", border: `1px solid ${L.red}22`, borderRadius: 5, padding: 12 }, children: [_jsx("div", { style: { fontSize: 8, color: L.text3, marginBottom: 5, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 }, children: "TOTAL MIGRATION COST" }), _jsx("div", { style: { fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 13 : 17, color: L.orange, fontWeight: 700 }, children: fmtINR(totalCost) }), _jsxs("div", { style: { fontSize: 9, color: L.text2, marginTop: 4 }, children: [critCount, " critical \u00B7 ", highCount, " high \u00B7 ", fmtINR(devRate), "/day"] })] })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: (isTablet || isDesktop) ? "1fr 1fr" : "1fr", gap: 12 }, children: [
                                                    { label: "TEAM SIZE", display: `${teamSize} devs`, min: 1, max: 10, step: 1, val: teamSize, set: (v) => setTeamSize(v), l: "1", r: "10" },
                                                    { label: "DEV RATE / DAY (INR)", display: fmtINR(devRate), min: 200, max: 2000, step: 100, val: devRate, set: (v) => setDevRate(v), l: fmtINR(200), r: fmtINR(2000) },
                                                ].map(sl => (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 }, children: [_jsx("span", { style: { fontSize: 9, color: L.text3, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600 }, children: sl.label }), _jsx("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: 11, color: L.blue, fontWeight: 700 }, children: sl.display })] }), _jsx("input", { type: "range", min: sl.min, max: sl.max, step: sl.step, value: sl.val, onChange: e => sl.set(Number(e.target.value)), style: { width: "100%", cursor: "pointer" } }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { style: { fontSize: 8, color: L.text4 }, children: sl.l }), _jsx("span", { style: { fontSize: 8, color: L.text4 }, children: sl.r })] })] }, sl.label))) })] })] })] }) }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "RISK DISTRIBUTION" }), _jsx("div", { style: { padding: 14, display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }, children: loading
                            ? Array.from({ length: 4 }).map((_, i) => (_jsxs("div", { style: { borderRadius: 6, padding: 12, border: `1px solid ${L.border}`, background: L.subtleBg }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 }, children: [_jsx(Shimmer, { w: 55, h: 9 }), _jsx(Shimmer, { w: 24, h: 20 })] }), _jsx(Shimmer, { w: "100%", h: 4, radius: 2, style: { marginBottom: 8 } }), _jsx(Shimmer, { w: 60, h: 8 })] }, i)))
                            : ["Critical", "High", "Medium", "Low"].map(level => {
                                const count = enriched.filter((a) => a.risk === level).length;
                                const pct = enriched.length ? Math.round(count / enriched.length * 100) : 0;
                                const color = level === "Critical" ? L.red : level === "High" ? L.orange : level === "Medium" ? L.yellow : L.green;
                                const bg = level === "Critical" ? "#fff5f5" : level === "High" ? "#fff7ed" : level === "Medium" ? "#fffbeb" : "#f0fdf4";
                                return (_jsxs("div", { style: { background: bg, border: `1px solid ${color}22`, borderRadius: 6, padding: 12 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 }, children: [_jsx("span", { style: { fontSize: 9, color, letterSpacing: ".12em", fontWeight: 700, textTransform: "uppercase" }, children: level }), _jsx("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: 15, color, fontWeight: 800 }, children: count })] }), _jsx("div", { style: { height: 4, background: `${color}20`, borderRadius: 2 }, children: _jsx("div", { style: { height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" } }) }), _jsxs("div", { style: { fontSize: 8, color: L.text3, marginTop: 6, fontWeight: 500 }, children: [enriched.filter((a) => a.risk === level).reduce((s, a) => s + a.days, 0), " dev days"] })] }, level));
                            }) })] }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "MIGRATION ROADMAP", right: !loading && (_jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [hasVCenter && (_jsx("span", { style: { fontSize: 7, color: "#0284c7", fontFamily: "monospace", fontWeight: 700, border: "1px solid rgba(14,165,233,0.28)", borderRadius: 3, padding: "2px 6px", background: "rgba(14,165,233,0.06)" }, children: "\u2B21 VCENTER" })), !hasVCenter && secureModeOn && (_jsx("span", { style: { fontSize: 7, color: L.purple, fontFamily: "monospace", fontWeight: 700, border: `1px solid ${L.purple}44`, borderRadius: 3, padding: "2px 6px", background: `${L.purple}0a` }, children: "\uD83D\uDD12 GHOST" })), _jsx("button", { style: { ...LS.btn, fontSize: isMobile ? 9 : 11 }, onClick: exportCSV, children: "\u2193 CSV" }), _jsx("button", { style: { ...LS.btn, fontSize: isMobile ? 9 : 11, background: `${L.blue}15`, borderColor: `${L.blue}40`, color: L.blue, fontWeight: 700 }, onClick: () => exportAuditPDF({ enriched, migrationScore, pqcReady, total, totalDays, calDays, totalCostINR: totalCost, teamSize, devRateINR: devRate, completionDate: dateStr, clientName, clientDomain: activeDomain, milestones }), children: isMobile ? "⬡ PDF" : "⬡ AUDIT PDF" })] })) }), _jsxs("div", { style: { display: "block" }, className: "pqc-show-cards", children: [_jsx("style", { children: `@media(min-width:900px){.pqc-show-cards{display:none!important;}}` }), _jsx("div", { style: { maxHeight: isMobile ? 400 : 520, overflowY: "auto" }, children: loading
                                    ? _jsx(SkeletonRoadmapCards, { count: 5 })
                                    : enriched.length
                                        ? enriched.map((a, i) => _jsx(RoadmapCard, { a: a, i: i }, i))
                                        : _jsx("div", { style: { padding: 24, textAlign: "center", fontSize: 10, color: L.green, fontWeight: 600 }, children: "\u2713 No weak assets" }) })] }), _jsxs("div", { style: { display: "none" }, className: "pqc-show-table", children: [_jsx("style", { children: `@media(min-width:900px){.pqc-show-table{display:block!important;}}` }), _jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }, children: [_jsx("thead", { children: _jsx("tr", { style: { background: L.subtleBg, borderBottom: `2px solid ${L.border}` }, children: ["#", "APPLICATION", "TYPE", "RISK", "KEY LEN", "CIPHER", "TLS", "CA", "PQC SCORE", "DAYS", "COST (INR)", "PUB", "PQC"].map(h => (_jsx("th", { style: { padding: "7px 8px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left", whiteSpace: "nowrap" }, children: h }, h))) }) }), _jsx("tbody", { children: loading
                                                ? _jsx(SkeletonTableRows, { count: 7 })
                                                : enriched.map((a, i) => {
                                                    const ps = a.pqcScore;
                                                    const riskColor = a.risk === "Critical" ? L.red : a.risk === "High" ? L.orange : a.risk === "Medium" ? L.yellow : L.green;
                                                    const riskBg = a.risk === "Critical" ? "#fef2f2" : a.risk === "High" ? "#fff7ed" : a.risk === "Medium" ? "#fffbeb" : "#f0fdf4";
                                                    return (_jsxs("tr", { style: { borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }, onMouseEnter: e => (e.currentTarget.style.background = L.insetBg), onMouseLeave: e => (e.currentTarget.style.background = i % 2 === 0 ? L.panelBg : L.subtleBg), children: [_jsx("td", { style: { padding: "7px 8px", fontFamily: "'DM Mono',monospace", fontSize: 9, color: L.text4 }, children: i + 1 }), _jsx("td", { style: { padding: "7px 8px", color: L.blue, fontSize: 10, fontWeight: 500 }, children: a.app }), _jsx("td", { style: { padding: "7px 8px" }, children: _jsx("span", { style: { fontSize: 8, color: L.text3, background: L.insetBg, border: `1px solid ${L.border}`, borderRadius: 3, padding: "1px 5px", fontWeight: 600 }, children: a.assetType }) }), _jsx("td", { style: { padding: "7px 8px" }, children: _jsx("span", { style: { fontSize: 8, fontWeight: 700, color: riskColor, background: riskBg, border: `1px solid ${riskColor}33`, borderRadius: 3, padding: "1px 6px" }, children: a.risk }) }), _jsx("td", { style: { padding: "7px 8px", fontSize: 10, fontWeight: 600, fontFamily: "'DM Mono',monospace", color: a.keylen?.startsWith("1024") ? L.red : a.keylen?.startsWith("2048") ? L.yellow : L.green }, children: a.keylen }), _jsx("td", { style: { padding: "7px 8px", fontSize: 9, color: L.text3, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: a.cipher }), _jsx("td", { style: { padding: "7px 8px" }, children: _jsxs("span", { style: { fontSize: 8, fontWeight: 600, color: a.tls === "1.0" ? L.red : a.tls === "1.2" ? L.yellow : L.green }, children: ["TLS ", a.tls] }) }), _jsx("td", { style: { padding: "7px 8px", fontSize: 9, color: L.text3 }, children: a.ca }), _jsx("td", { style: { padding: "7px 8px", textAlign: "center" }, children: ps && _jsx("span", { style: { fontSize: 8, fontWeight: 700, color: ps.color, border: `1px solid ${ps.color}44`, borderRadius: 3, padding: "1px 5px", background: `${ps.color}10` }, children: ps.active ? "ACTIVE" : `${ps.score}/100` }) }), _jsxs("td", { style: { padding: "7px 8px", fontFamily: "'DM Mono',monospace", fontSize: 10, color: L.cyan, fontWeight: 600 }, children: [a.days, "d"] }), _jsx("td", { style: { padding: "7px 8px", fontFamily: "'DM Mono',monospace", fontSize: 10, color: L.orange, fontWeight: 700 }, children: fmtINR(a.cost) }), _jsx("td", { style: { padding: "7px 8px", textAlign: "center", fontSize: 13 }, children: a.isPublic ? _jsx("span", { style: { color: L.cyan }, children: "\u25CF" }) : _jsx("span", { style: { color: L.text4 }, children: "\u25CB" }) }), _jsx("td", { style: { padding: "7px 8px", textAlign: "center", fontSize: 13 }, children: a.pqc ? _jsx("span", { style: { color: L.green }, children: "\u2713" }) : _jsx("span", { style: { color: L.red }, children: "\u2717" }) })] }, i));
                                                }) })] }) })] }), _jsx("div", { style: { padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, background: L.subtleBg, borderRadius: "0 0 8px 8px" }, children: loading
                            ? _jsx(Shimmer, { w: 220, h: 10 })
                            : _jsxs(_Fragment, { children: [_jsxs("span", { style: { fontSize: 10, color: L.text2 }, children: [_jsx("b", { style: { color: L.text1 }, children: enriched.length }), " to migrate \u00B7", " ", _jsxs("b", { style: { color: L.cyan }, children: [totalDays, "d"] }), " dev \u00B7", " ", _jsx("b", { style: { color: L.orange }, children: fmtINR(totalCost) }), hasVCenter && _jsx("span", { style: { marginLeft: 8, fontSize: 8, color: "#0284c7", fontWeight: 600 }, children: "\u00B7 vcenter mode" }), !hasVCenter && secureModeOn && _jsx("span", { style: { marginLeft: 8, fontSize: 8, color: L.purple, fontWeight: 600 }, children: "\u00B7 ghost mode" })] }), !isMobile && _jsx("span", { style: { fontSize: 9, color: L.text3 }, children: "Ranked: public-facing \u2192 risk \u2192 cost" })] }) })] }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "REMEDIATION GUIDE" }), _jsx("div", { style: { padding: 14, display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)", gap: 10 }, children: loading
                            ? Array.from({ length: 3 }).map((_, i) => (_jsxs("div", { style: { border: `1px solid ${L.border}`, borderRadius: 6, padding: 12, background: L.subtleBg }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }, children: [_jsx(Shimmer, { w: 120, h: 10 }), _jsx(Shimmer, { w: 20, h: 20 })] }), _jsx(Shimmer, { w: "90%", h: 9, style: { marginBottom: 6 } }), _jsx(Shimmer, { w: "75%", h: 8, style: { marginBottom: 12 } }), [80, 65, 90, 70, 55].map((w, j) => _jsx(Shimmer, { w: `${w}%`, h: 8, style: { marginBottom: 5 } }, j))] }, i)))
                            : [
                                { title: "Upgrade cert key", color: L.red, bg: "#fff5f5", border: `${L.red}25`, icon: "⬡", items: enriched.filter((a) => !(a.pqcScore?.criteria?.certKey4096?.pass)).map((a) => a.app), fix: "Deploy RSA-4096 or EC P-384 — 70/100 pts" },
                                { title: "Remove wildcard certs", color: L.orange, bg: "#fff7ed", border: `${L.orange}25`, icon: "◈", items: enriched.filter((a) => a.is_wildcard).map((a) => a.app), fix: "Dedicated per-service certificates — 20/100 pts" },
                                { title: "Enable Kyber hybrid", color: L.cyan, bg: "#f0f9ff", border: `${L.cyan}25`, icon: "◉", items: enriched.filter((a) => !a.pqc).map((a) => a.app), fix: "X25519+Kyber768 (FIPS 203) → ACTIVE status" },
                            ].map(section => (_jsxs("div", { style: { background: section.bg, border: `1px solid ${section.border}`, borderRadius: 6, padding: 12 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }, children: [_jsx("span", { style: { fontFamily: "'DM Mono',monospace", color: section.color, fontSize: 14, flexShrink: 0 }, children: section.icon }), _jsx("span", { style: { fontSize: 9, color: section.color, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: section.title }), _jsx("span", { style: { marginLeft: "auto", fontFamily: "'DM Mono',monospace", fontSize: 14, color: section.color, flexShrink: 0, fontWeight: 800 }, children: section.items.length })] }), _jsx("div", { style: { fontSize: 9, color: L.text2, marginBottom: 8, lineHeight: 1.6, fontWeight: 500 }, children: section.fix }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [section.items.slice(0, 5).map((app, i) => (_jsxs("div", { style: { fontSize: 9, color: L.text2, display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "3px 0", borderTop: `1px solid ${section.border}` }, children: [_jsx("span", { style: { color: section.color, fontSize: 8, flexShrink: 0, fontWeight: 700 }, children: "\u25B8" }), " ", app] }, i))), section.items.length > 5 && _jsxs("div", { style: { fontSize: 9, color: L.text3, fontStyle: "italic" }, children: ["+", section.items.length - 5, " more"] }), section.items.length === 0 && _jsx("div", { style: { fontSize: 9, color: L.green, fontWeight: 600 }, children: "\u2713 All clear" })] })] }, section.title))) })] })] }));
}
