import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import { Badge, MOCK_ASSETS, } from "./shared.js";
// ── API Base ──────────────────────────────────────────────────────────────────
const API = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
    "https://r3bel-production.up.railway.app";
// ── Cache config ──────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_KEY_NORMAL = "rebel_cache_assets_inventory";
const CACHE_KEY_CBOM_NORMAL = "rebel_cache_cbom_inventory";
const CACHE_KEY_GHOST = "rebel_cache_assets_ghost";
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
    [CACHE_KEY_NORMAL, CACHE_KEY_CBOM_NORMAL, CACHE_KEY_GHOST].forEach(k => localStorage.removeItem(k));
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
        padding: "6px 10px",
        fontSize: 11,
        outline: "none",
    },
    btn: {
        background: L.subtleBg,
        border: `1px solid ${L.panelBorder}`,
        borderRadius: 4,
        color: L.text2,
        padding: "5px 10px",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 600,
    },
};
// ── INR Formatter ─────────────────────────────────────────────────────────────
const INR_RATE = 83;
function toINR(usd) { return Math.round(usd * INR_RATE); }
function fmtINRFull(usd) {
    return `₹${toINR(usd).toLocaleString("en-IN")}`;
}
// ── Merge helper: assets + cbom → unified asset list ─────────────────────────
function buildMergedAssets(assetsData, cbom) {
    // Clone to avoid mutating cached objects
    const base = (assetsData?.assets ?? []).map((a) => ({ ...a }));
    if (!cbom?.apps?.length)
        return base;
    const byName = {};
    base.forEach((a, i) => { if (a.name)
        byName[a.name.toLowerCase()] = i; });
    const extras = [];
    for (const app of cbom.apps ?? []) {
        const key = (app.app ?? "").toLowerCase();
        if (!key)
            continue;
        const idx = byName[key];
        if (idx !== undefined) {
            const existing = base[idx];
            base[idx] = {
                ...existing,
                cipher: existing.cipher || app.cipher || "—",
                tls: existing.tls || app.tls || "—",
                keylen: existing.keylen || app.keylen || "—",
                ca: existing.ca || app.ca || "—",
                pqc: existing.pqc ?? app.pqc ?? false,
                pqc_support: existing.pqc_support || app.pqc_support || "none",
                key_exchange_group: existing.key_exchange_group || app.key_exchange_group || null,
                is_wildcard: existing.is_wildcard ?? app.is_wildcard ?? null,
                cbom_status: app.status,
            };
        }
        else {
            extras.push({
                name: app.app,
                url: app.app,
                type: "Other",
                cipher: app.cipher || "—",
                tls: app.tls || "—",
                keylen: app.keylen || "—",
                ca: app.ca || "—",
                cert: "—",
                scan: "—",
                pqc: app.pqc ?? false,
                pqc_support: app.pqc_support || "none",
                key_exchange_group: app.key_exchange_group || null,
                is_wildcard: app.is_wildcard ?? null,
                cbom_status: app.status,
                _fromCbom: true,
            });
        }
    }
    return [...base, ...extras];
}
function deriveStats(assets) {
    const risk_counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    const cert_buckets = { "0-30": 0, "30-60": 0, "60-90": 0, "90+": 0 };
    const by_type = {};
    for (const a of assets) {
        // Risk — prefer explicit `risk` field, fallback to `criticality`
        const r = (a.risk || a.criticality || "");
        if (r === "Critical")
            risk_counts.Critical++;
        else if (r === "High")
            risk_counts.High++;
        else if (r === "Medium")
            risk_counts.Medium++;
        else if (r === "Low")
            risk_counts.Low++;
        // Cert expiry — use numeric days_to_expiry when available, else infer from cert string
        const dte = a.days_to_expiry;
        if (typeof dte === "number") {
            if (dte <= 30)
                cert_buckets["0-30"]++;
            else if (dte <= 60)
                cert_buckets["30-60"]++;
            else if (dte <= 90)
                cert_buckets["60-90"]++;
            else
                cert_buckets["90+"]++;
        }
        else if (a.cert === "Expiring") {
            cert_buckets["0-30"]++;
        }
        else if (a.cert === "Valid") {
            cert_buckets["90+"]++;
        }
        // Type distribution
        const t = a.type || "Other";
        by_type[t] = (by_type[t] || 0) + 1;
    }
    return { risk_counts, cert_buckets, by_type };
}
// ── Skeleton components ───────────────────────────────────────────────────────
function Shimmer({ w = "100%", h = 14, radius = 4, style = {} }) {
    return (_jsx("div", { style: {
            width: w, height: h, borderRadius: radius, flexShrink: 0,
            background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s ease infinite",
            ...style,
        } }));
}
function SkeletonMetricCard() {
    return (_jsxs("div", { style: { background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }, children: [_jsx(Shimmer, { w: "50%", h: 8, style: { marginBottom: 10 } }), _jsx(Shimmer, { w: "65%", h: 26, style: { marginBottom: 8 } }), _jsx(Shimmer, { w: "40%", h: 8 })] }));
}
function SkeletonDonutPanel() {
    return (_jsxs("div", { style: { ...LS.panel }, children: [_jsx("div", { style: { padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "8px 8px 0 0" }, children: _jsx(Shimmer, { w: 160, h: 9 }) }), _jsxs("div", { style: { padding: 14, display: "flex", gap: 16, alignItems: "center" }, children: [_jsx("div", { style: { width: 140, height: 140, flexShrink: 0, borderRadius: "50%", background: "conic-gradient(#e2e8f0 0deg 90deg,#f1f5f9 90deg 200deg,#e2e8f0 200deg 290deg,#f1f5f9 290deg 360deg)", position: "relative", animation: "shimmer 1.4s ease infinite" }, children: _jsx("div", { style: { position: "absolute", inset: 28, borderRadius: "50%", background: L.panelBg } }) }), _jsx("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 9 }, children: [70, 55, 80, 45, 60, 40].map((w, i) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Shimmer, { w: 8, h: 8, radius: 2 }), _jsx(Shimmer, { w: `${w}%`, h: 9 }), _jsx(Shimmer, { w: 18, h: 9, style: { marginLeft: "auto" } })] }, i))) })] })] }));
}
function SkeletonBarPanel() {
    return (_jsxs("div", { style: { ...LS.panel }, children: [_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "8px 8px 0 0", display: "flex", justifyContent: "space-between" }, children: [_jsx(Shimmer, { w: 140, h: 9 }), _jsx(Shimmer, { w: 60, h: 18, radius: 3 })] }), _jsx("div", { style: { padding: 14, display: "flex", alignItems: "flex-end", gap: 22, justifyContent: "center", height: 140 }, children: [80, 55, 65, 40].map((h, i) => (_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }, children: [_jsx(Shimmer, { w: 36, h: h, radius: 3 }), _jsx(Shimmer, { w: 36, h: 9, radius: 3 })] }, i))) })] }));
}
function SkeletonTableRows({ cols, count = 7 }) {
    const widths = [140, 60, 65, 80, 50, 50, 50, 80, 70, 30];
    return (_jsx(_Fragment, { children: Array.from({ length: count }).map((_, i) => (_jsx("tr", { style: { borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }, children: Array.from({ length: cols }).map((_, j) => (_jsxs("td", { style: { padding: "10px 8px" }, children: [_jsx(Shimmer, { w: widths[j] ?? 60, h: j === 0 ? 11 : 9 }), j === 0 && _jsx(Shimmer, { w: 100, h: 8, style: { marginTop: 4 } })] }, j))) }, i))) }));
}
function SkeletonMobileCards({ count = 5 }) {
    return (_jsx(_Fragment, { children: Array.from({ length: count }).map((_, i) => (_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 }, children: [_jsx(Shimmer, { w: 160, h: 12 }), _jsx(Shimmer, { w: 52, h: 16, radius: 3 })] }), _jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 6 }, children: [_jsx(Shimmer, { w: 50, h: 16, radius: 3 }), _jsx(Shimmer, { w: 50, h: 16, radius: 3 }), _jsx(Shimmer, { w: 50, h: 16, radius: 3 })] }), _jsx(Shimmer, { w: "70%", h: 9 })] }, i))) }));
}
function SkeletonProgBar() {
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }, children: [_jsx(Shimmer, { w: 8, h: 8, radius: 4 }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx(Shimmer, { w: 80, h: 9 }), _jsx(Shimmer, { w: 18, h: 9 })] }), _jsx(Shimmer, { w: "100%", h: 4, radius: 2 })] })] }));
}
// ── Cache badge ───────────────────────────────────────────────────────────────
function CacheBadge({ age, onRefresh }) {
    if (!age)
        return null;
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsxs("span", { style: { fontSize: 8, fontWeight: 600, color: L.text3, background: L.insetBg, border: `1px solid ${L.panelBorder}`, borderRadius: 3, padding: "2px 7px", letterSpacing: ".06em" }, children: ["CACHED \u00B7 ", age] }), _jsx("button", { onClick: onRefresh, style: { ...LS.btn, fontSize: 9, padding: "3px 8px", color: L.blue, borderColor: `${L.blue}40`, background: `${L.blue}0d` }, children: "\u21BA REFRESH" })] }));
}
// ── Secure Mode Banner ────────────────────────────────────────────────────────
function SecureModeBanner() {
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: `${L.purple}0d`, border: `1px solid ${L.purple}44`, borderRadius: 6 }, children: [_jsx("span", { style: { fontSize: 9, color: L.purple, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }, children: "\uD83D\uDD12 SECURE MODE ACTIVE" }), _jsx("span", { style: { fontSize: 9, color: L.purple, opacity: 0.75 }, children: "\u00B7" }), _jsx("span", { style: { fontSize: 9, color: L.purple, fontFamily: "'DM Mono', monospace" }, children: "/ghost/assets \u2014 anonymised data, no live scans" })] }));
}
// ── Light sub-components ──────────────────────────────────────────────────────
function LPanel({ children, style = {} }) {
    return _jsx("div", { style: { ...LS.panel, ...style }, children: children });
}
function LPanelHeader({ left, right }) {
    return (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "8px 8px 0 0" }, children: [_jsx("span", { style: { fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" }, children: left }), right] }));
}
function LMetricCard({ label, value, sub, color }) {
    return (_jsxs("div", { style: { background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }, children: [_jsx("div", { style: { fontSize: 8, color: L.text4, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6, fontWeight: 600 }, children: label }), _jsx("div", { style: { fontSize: 22, fontWeight: 800, color, lineHeight: 1 }, children: value }), _jsx("div", { style: { fontSize: 9, color: L.text3, marginTop: 5 }, children: sub })] }));
}
function LProgBar({ pct, color }) {
    return (_jsx("div", { style: { height: 4, background: L.insetBg, borderRadius: 2, border: `1px solid ${L.panelBorder}`, overflow: "hidden" }, children: _jsx("div", { style: { height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: "width 0.6s ease" } }) }));
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
// ── Main Component ────────────────────────────────────────────────────────────
export default function AssetInventoryPage() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [fromCache, setFromCache] = useState(false);
    const [cacheAge, setCacheAge] = useState(null);
    const [query, setQuery] = useState("");
    const [filterCrit, setFilterCrit] = useState("All");
    const [expandedRow, setExpandedRow] = useState(null);
    const [riskCounts, setRiskCounts] = useState({ Critical: 0, High: 0, Medium: 0, Low: 0 });
    const [certBuckets, setCertBuckets] = useState({ "0-30": 0, "30-60": 0, "60-90": 0, "90+": 0 });
    const [byType, setByType] = useState({});
    const [secureModeOn, setSecureModeOn] = useState(false);
    const [secureModeLoading, setSecureModeLoading] = useState(true);
    const typeRef = useRef(null);
    const riskRef = useRef(null);
    const legendRef = useRef(null);
    const mobile = useMobile();
    // ── Fetch secure mode status ──────────────────────────────────────────────
    useEffect(() => {
        fetch(`${API}/secure-mode/status`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.enabled !== undefined)
            setSecureModeOn(Boolean(d.enabled)); })
            .catch(() => { })
            .finally(() => setSecureModeLoading(false));
    }, []);
    // ── Commit a resolved asset list to state, always re-deriving stats ───────
    // We always call deriveStats on the FINAL merged list so the charts and
    // metric cards reflect CBOM-sourced entries too, not just /assets pre-computed totals.
    const commitAssets = (finalAssets) => {
        setAssets(finalAssets);
        const stats = deriveStats(finalAssets);
        setRiskCounts(stats.risk_counts);
        setCertBuckets(stats.cert_buckets);
        setByType(stats.by_type);
    };
    // ── Data fetch with cache ─────────────────────────────────────────────────
    const loadData = async (forceRefresh = false) => {
        setLoading(true);
        setFetchError(false);
        if (secureModeOn) {
            // ── SECURE MODE: /ghost/assets only ──────────────────────────────────
            if (!forceRefresh) {
                const cached = cacheGet(CACHE_KEY_GHOST);
                if (cached) {
                    commitAssets(cached?.assets?.length ? cached.assets : MOCK_ASSETS);
                    setFromCache(true);
                    setCacheAge(cacheAgeLabel(CACHE_KEY_GHOST));
                    setLoading(false);
                    return;
                }
            }
            try {
                const d = await fetch(`${API}/ghost/assets`).then(r => { if (!r.ok)
                    throw new Error(); return r.json(); });
                cacheSet(CACHE_KEY_GHOST, d);
                commitAssets(d?.assets?.length ? d.assets : MOCK_ASSETS);
                setFromCache(false);
                setCacheAge(null);
            }
            catch {
                setFetchError(true);
                commitAssets(MOCK_ASSETS);
            }
        }
        else {
            // ── NORMAL MODE: /assets + /cbom merged ──────────────────────────────
            if (!forceRefresh) {
                const cachedAssets = cacheGet(CACHE_KEY_NORMAL);
                const cachedCbom = cacheGet(CACHE_KEY_CBOM_NORMAL);
                if (cachedAssets) {
                    const merged = cachedCbom
                        ? buildMergedAssets(cachedAssets, cachedCbom)
                        : (cachedAssets.assets ?? []);
                    commitAssets(merged.length ? merged : MOCK_ASSETS);
                    setFromCache(true);
                    setCacheAge(cacheAgeLabel(CACHE_KEY_NORMAL));
                    setLoading(false);
                    return;
                }
            }
            try {
                const [assetsData, cbomData] = await Promise.all([
                    fetch(`${API}/assets`).then(r => { if (!r.ok)
                        throw new Error(); return r.json(); }),
                    fetch(`${API}/cbom`).then(r => r.ok ? r.json() : null).catch(() => null),
                ]);
                cacheSet(CACHE_KEY_NORMAL, assetsData);
                if (cbomData)
                    cacheSet(CACHE_KEY_CBOM_NORMAL, cbomData);
                const merged = cbomData
                    ? buildMergedAssets(assetsData, cbomData)
                    : (assetsData?.assets ?? []);
                commitAssets(merged.length ? merged : MOCK_ASSETS);
                setFromCache(false);
                setCacheAge(null);
            }
            catch {
                setFetchError(true);
                commitAssets(MOCK_ASSETS);
            }
        }
        setLoading(false);
    };
    function handleForceRefresh() {
        cacheClearAll();
        setFromCache(false);
        setCacheAge(null);
        loadData(true);
    }
    useEffect(() => {
        if (!secureModeLoading)
            loadData();
    }, [secureModeOn, secureModeLoading]);
    useEffect(() => {
        if (!loading) {
            drawTypeChart();
            drawRiskChart();
        }
    }, [assets, riskCounts, byType, mobile, loading]);
    // ── Charts ────────────────────────────────────────────────────────────────
    function drawTypeChart() {
        const c = typeRef.current;
        if (!c)
            return;
        const ctx = c.getContext("2d");
        const W = 140, H = 140, cx = 70, cy = 70, r = 50, gap = 0.05;
        const data = [
            { label: "Web Apps", val: byType["Web App"] || byType["Web Apps"] || 0, color: L.blue },
            { label: "APIs", val: byType["API"] || byType["APIs"] || 0, color: L.purple },
            { label: "Core Banking", val: byType["Core Banking"] || 0, color: L.green },
            { label: "Internet Banking", val: byType["Internet Banking"] || 0, color: L.yellow },
            { label: "Servers", val: byType["Server"] || byType["Servers"] || 0, color: "#94a3b8" },
            { label: "Other", val: byType["Other"] || 0, color: "#cbd5e1" },
        ].filter(d => d.val > 0);
        const display = data.length ? data : [{ label: "Web Apps", val: 1, color: L.blue }];
        const total = display.reduce((a, d) => a + d.val, 0);
        let angle = -Math.PI / 2;
        ctx.clearRect(0, 0, W, H);
        display.forEach(d => {
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
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.fillStyle = L.text1;
        ctx.font = "bold 13px 'DM Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(assets.length), cx, cy + 5);
        if (legendRef.current) {
            legendRef.current.innerHTML = display.map(d => `<div style="display:flex;align-items:center;gap:6px;">
          <div style="width:8px;height:8px;border-radius:2px;background:${d.color};flex-shrink:0;"></div>
          <span style="font-size:9px;color:${L.text2};flex:1;font-family:'DM Sans',sans-serif;">${d.label}</span>
          <span style="font-size:9px;font-family:'DM Mono',monospace;color:${L.text3};font-weight:600;">${d.val}</span>
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
            { label: "Critical", val: riskCounts.Critical, color: L.red },
            { label: "High", val: riskCounts.High, color: L.orange },
            { label: "Medium", val: riskCounts.Medium, color: L.yellow },
            { label: "Low", val: riskCounts.Low, color: L.green },
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
            ctx.fillStyle = b.color + "99";
            ctx.fillRect(x, y + 3, bw, barH - 3);
            ctx.fillStyle = b.color;
            ctx.fillRect(x, y, bw, 3);
            ctx.fillStyle = L.text3;
            ctx.font = "9px 'DM Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText(b.label, x + bw / 2, H - 4);
            ctx.fillStyle = b.color;
            ctx.font = "bold 9px 'DM Mono', monospace";
            ctx.fillText(String(b.val), x + bw / 2, y - 4);
        });
    }
    // ── Helpers ───────────────────────────────────────────────────────────────
    const certVariant = (c) => c === "Valid" ? "green" : c === "Expiring" ? "yellow" : "red";
    const keyColor = (k) => k?.startsWith("1024") ? L.red : k?.startsWith("2048") ? L.yellow : L.green;
    const critColor = (c) => ({ Critical: L.red, High: L.orange, Medium: L.yellow, Low: L.green }[c] ?? null);
    const critBg = (c) => ({ Critical: "#fff5f5", High: "#fff7ed", Medium: "#fffbeb", Low: "#f0fdf4" }[c] ?? L.subtleBg);
    // ── Filter ────────────────────────────────────────────────────────────────
    const filtered = assets.filter(a => {
        const ms = !query
            || a.name?.toLowerCase().includes(query.toLowerCase())
            || a.owner?.toLowerCase().includes(query.toLowerCase())
            || a.type?.toLowerCase().includes(query.toLowerCase());
        const mc = filterCrit === "All" || a.criticality === filterCrit || a.risk === filterCrit;
        return ms && mc;
    });
    const highRisk = riskCounts.Critical + riskCounts.High;
    const activeEndpointLabel = secureModeOn ? "→ /ghost/assets" : "→ /assets + /cbom";
    // ── Render ────────────────────────────────────────────────────────────────
    return (_jsxs("div", { style: LS.page, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.panelBorder};border-radius:3px;}
        select option { background: ${L.panelBg}; color: ${L.text1}; }
      ` }), secureModeOn && _jsx(SecureModeBanner, {}), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsx("span", { style: { fontSize: 7, fontFamily: "'DM Mono',monospace", color: L.text4, letterSpacing: ".08em" }, children: "API" }), _jsxs("span", { style: { fontSize: 8, fontFamily: "'DM Mono',monospace", color: fetchError ? L.red : L.green, fontWeight: 600 }, children: [fetchError ? "✗" : "✓", " ", API] }), _jsx("span", { style: {
                                    fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                                    color: secureModeOn ? L.purple : L.cyan,
                                    background: secureModeOn ? `${L.purple}10` : `${L.cyan}10`,
                                    border: `1px solid ${secureModeOn ? L.purple : L.cyan}44`,
                                    borderRadius: 3, padding: "2px 6px", letterSpacing: ".04em",
                                }, children: activeEndpointLabel }), fetchError && _jsx("span", { style: { fontSize: 8, color: L.red }, children: "\u2014 showing demo data" }), loading && _jsx("span", { style: { fontSize: 8, color: L.blue }, children: "fetching\u2026" })] }), fromCache && _jsx(CacheBadge, { age: cacheAge, onRefresh: handleForceRefresh })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 8 : 9 }, children: loading
                    ? Array.from({ length: 4 }).map((_, i) => _jsx(SkeletonMetricCard, {}, i))
                    : _jsxs(_Fragment, { children: [_jsx(LMetricCard, { label: "TOTAL ASSETS", value: assets.length, sub: "Scanned", color: L.blue }), _jsx(LMetricCard, { label: "HIGH RISK", value: highRisk, sub: "Immediate action", color: L.red }), _jsx(LMetricCard, { label: "CERT EXPIRING", value: certBuckets["0-30"], sub: "Within 30 days", color: L.orange }), _jsx("div", { style: mobile ? { gridColumn: "1/-1" } : {}, children: _jsx(LMetricCard, { label: "ACTIVE CERTS", value: assets.filter(a => a.cert === "Valid").length, sub: "Valid certificates", color: L.green }) })] }) }), _jsx("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }, children: loading
                    ? _jsxs(_Fragment, { children: [_jsx(SkeletonDonutPanel, {}), _jsx(SkeletonBarPanel, {})] })
                    : _jsxs(_Fragment, { children: [_jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "ASSET TYPE DISTRIBUTION" }), _jsxs("div", { style: { padding: 14, display: "flex", gap: 16, alignItems: "center" }, children: [_jsx("canvas", { ref: typeRef, width: 140, height: 140, style: { flexShrink: 0 } }), _jsx("div", { ref: legendRef, style: { display: "flex", flexDirection: "column", gap: 7, flex: 1 } })] })] }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "RISK DISTRIBUTION", right: _jsxs("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: 18, color: L.red, fontWeight: 800 }, children: [highRisk, _jsx("span", { style: { fontSize: 11, fontWeight: 600 }, children: " high" })] }) }), _jsx("div", { style: { padding: 14 }, children: _jsx("canvas", { ref: riskRef, width: 280, height: 140, style: { width: "100%" } }) })] })] }) }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "ASSET INVENTORY", right: _jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [fromCache && !mobile && _jsx(CacheBadge, { age: cacheAge, onRefresh: handleForceRefresh }), _jsx("input", { value: query, onChange: e => setQuery(e.target.value), placeholder: "Search domain / owner...", style: { ...LS.input, width: mobile ? 120 : 170 }, disabled: loading }), _jsxs("select", { value: filterCrit, onChange: e => setFilterCrit(e.target.value), style: { ...LS.input, cursor: "pointer" }, disabled: loading, children: [_jsx("option", { value: "All", children: "All" }), ["Critical", "High", "Medium", "Low"].map(c => _jsx("option", { children: c }, c))] })] }) }), mobile ? (_jsx("div", { style: { maxHeight: 420, overflowY: "auto" }, children: loading
                            ? _jsx(SkeletonMobileCards, { count: 5 })
                            : filtered.length
                                ? filtered.map((a, i) => {
                                    const scope = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
                                    const cc = critColor(a.criticality);
                                    const cbg = cc ? critBg(a.criticality) : undefined;
                                    const tlsN = (a.tls || "").replace(/^TLSv?/i, "");
                                    return (_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 12, color: L.blue, fontWeight: 600 }, children: a.name }), _jsxs("div", { style: { display: "flex", gap: 4, alignItems: "center" }, children: [a._fromCbom && _jsx("span", { style: { fontSize: 7, color: L.purple, border: `1px solid ${L.purple}44`, borderRadius: 2, padding: "1px 4px", background: `${L.purple}0a` }, children: "CBOM" }), cc && _jsx("span", { style: { fontSize: 7, fontWeight: 700, color: cc, border: `1px solid ${cc}44`, borderRadius: 2, padding: "1px 5px", background: cbg }, children: a.criticality })] })] }), _jsxs("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }, children: [_jsx(Badge, { v: "gray", children: a.type || "—" }), _jsx(Badge, { v: certVariant(a.cert), children: a.cert || "—" }), _jsxs(Badge, { v: tlsN === "1.0" ? "red" : tlsN === "1.2" ? "yellow" : "green", children: ["TLS ", tlsN || "—"] })] }), scope.length > 0 && (_jsx("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" }, children: scope.map((s) => (_jsx("span", { style: { fontSize: 7, color: L.cyan, border: `1px solid ${L.cyan}44`, borderRadius: 2, padding: "1px 5px", background: `${L.cyan}0a` }, children: s }, s))) })), _jsxs("div", { style: { fontSize: 9, color: L.text3, marginTop: 4, fontFamily: "'DM Mono',monospace" }, children: [a.keylen, " \u00B7 ", a.ca, " \u00B7 ", a.scan || "—"] })] }, i));
                                })
                                : _jsx("div", { style: { padding: 20, fontSize: 10, color: L.text3, textAlign: "center" }, children: "No assets found" }) })) : (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }, children: [_jsx("thead", { children: _jsx("tr", { style: { background: L.subtleBg, borderBottom: `2px solid ${L.panelBorder}` }, children: ["ASSET", "TYPE", "CRITICALITY", "OWNER", "TLS", "CERT", "KEY LEN", "COMPLIANCE", "LAST SCAN", ""].map(h => (_jsx("th", { style: { padding: "7px 8px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left", whiteSpace: "nowrap" }, children: h }, h))) }) }), _jsx("tbody", { children: loading
                                        ? _jsx(SkeletonTableRows, { cols: 10, count: 7 })
                                        : filtered.length
                                            ? filtered.map((a, i) => {
                                                const scope = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
                                                const cc = critColor(a.criticality);
                                                const cbg = cc ? critBg(a.criticality) : undefined;
                                                const tlsN = (a.tls || "").replace(/^TLSv?/i, "");
                                                const isOpen = expandedRow === i;
                                                const rowBg = i % 2 === 0 ? L.panelBg : L.subtleBg;
                                                return (_jsxs(React.Fragment, { children: [_jsxs("tr", { style: { borderBottom: `1px solid ${L.borderLight}`, background: rowBg }, onMouseEnter: e => (e.currentTarget.style.background = L.insetBg), onMouseLeave: e => (e.currentTarget.style.background = rowBg), children: [_jsxs("td", { style: { padding: "8px 8px" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [_jsx("div", { style: { fontSize: 10, color: L.blue, fontWeight: 600 }, children: a.name }), a._fromCbom && _jsx("span", { style: { fontSize: 7, color: L.purple, border: `1px solid ${L.purple}44`, borderRadius: 2, padding: "1px 4px", background: `${L.purple}0a`, flexShrink: 0 }, children: "CBOM" })] }), _jsx("div", { style: { fontSize: 8, color: L.text4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }, children: a.url })] }), _jsx("td", { style: { padding: "8px 8px" }, children: _jsx("span", { style: { fontSize: 8, color: L.text3, background: L.insetBg, border: `1px solid ${L.panelBorder}`, borderRadius: 3, padding: "1px 5px", fontWeight: 600 }, children: a.type || "—" }) }), _jsx("td", { style: { padding: "8px 8px" }, children: cc
                                                                        ? _jsx("span", { style: { fontSize: 8, fontWeight: 700, color: cc, border: `1px solid ${cc}44`, borderRadius: 3, padding: "1px 6px", background: cbg }, children: a.criticality })
                                                                        : _jsx("span", { style: { fontSize: 9, color: L.text3 }, children: "\u2014" }) }), _jsxs("td", { style: { padding: "8px 8px" }, children: [_jsx("div", { style: { fontSize: 9, color: L.text2, fontWeight: 500 }, children: a.owner || "—" }), a.owner_email && _jsx("div", { style: { fontSize: 8, color: L.text4 }, children: a.owner_email })] }), _jsx("td", { style: { padding: "8px 8px" }, children: _jsxs("span", { style: { fontSize: 8, fontWeight: 600, color: tlsN === "1.0" ? L.red : tlsN === "1.2" ? L.yellow : L.green, background: tlsN === "1.0" ? "#fff5f5" : tlsN === "1.2" ? "#fffbeb" : "#f0fdf4", border: `1px solid ${tlsN === "1.0" ? L.red : tlsN === "1.2" ? L.yellow : L.green}33`, borderRadius: 3, padding: "1px 5px" }, children: ["TLS ", tlsN || "—"] }) }), _jsx("td", { style: { padding: "8px 8px" }, children: _jsx(Badge, { v: certVariant(a.cert), children: a.cert || "—" }) }), _jsx("td", { style: { padding: "8px 8px", fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: keyColor(a.keylen) }, children: a.keylen || "—" }), _jsx("td", { style: { padding: "8px 8px" }, children: _jsxs("div", { style: { display: "flex", gap: 3, flexWrap: "wrap" }, children: [scope.slice(0, 3).map((s) => (_jsx("span", { style: { fontSize: 7, color: L.cyan, border: `1px solid ${L.cyan}44`, borderRadius: 2, padding: "1px 4px", background: `${L.cyan}0a` }, children: s }, s))), scope.length > 3 && _jsxs("span", { style: { fontSize: 7, color: L.text3 }, children: ["+", scope.length - 3] }), scope.length === 0 && _jsx("span", { style: { fontSize: 8, color: L.text4 }, children: "\u2014" })] }) }), _jsx("td", { style: { padding: "8px 8px", fontSize: 9, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: a.scan || "Never" }), _jsx("td", { style: { padding: "8px 8px" }, children: _jsx("button", { onClick: () => setExpandedRow(isOpen ? null : i), style: { ...LS.btn, fontSize: 8, padding: "2px 7px", background: isOpen ? `${L.blue}15` : L.subtleBg, color: isOpen ? L.blue : L.text3, borderColor: isOpen ? `${L.blue}40` : L.panelBorder }, children: isOpen ? "▲" : "▼" }) })] }), isOpen && (_jsx("tr", { style: { background: L.insetBg }, children: _jsx("td", { colSpan: 10, style: { padding: "0 12px 12px" }, children: _jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 6, padding: 12, marginTop: 4, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)" }, children: [[
                                                                            { label: "BUSINESS UNIT", val: a.business_unit || "—", color: L.text1 },
                                                                            { label: "FINANCIAL EXPOSURE", val: a.financial_exposure ? `₹${Number(a.financial_exposure).toLocaleString("en-IN")}` : "—", color: L.orange },
                                                                            { label: "IP ADDRESS", val: a.ip || "—", color: L.text2 },
                                                                            { label: "CIPHER", val: a.cipher || "—", color: L.text3 },
                                                                        ].map(item => (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }, children: item.label }), _jsx("div", { style: { fontSize: 10, color: item.color, fontFamily: "'DM Mono',monospace", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: item.val })] }, item.label))), a.notes && (_jsxs("div", { style: { gridColumn: "1/-1" }, children: [_jsx("div", { style: { fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }, children: "NOTES" }), _jsx("div", { style: { fontSize: 9, color: L.text2, lineHeight: 1.6 }, children: a.notes })] }))] }) }) }))] }, i));
                                            })
                                            : (_jsx("tr", { children: _jsx("td", { colSpan: 10, style: { padding: "20px", fontSize: 10, color: L.text3, textAlign: "center" }, children: "No assets found" }) })) })] }) })), _jsx("div", { style: { padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, background: L.subtleBg, borderRadius: "0 0 8px 8px" }, children: loading
                            ? _jsx(Shimmer, { w: 200, h: 10 })
                            : _jsxs(_Fragment, { children: [_jsxs("span", { style: { fontSize: 10, color: L.text2 }, children: ["Showing ", _jsx("b", { style: { color: L.text1 }, children: filtered.length }), " of", " ", _jsx("b", { style: { color: L.text1 }, children: assets.length }), " assets", secureModeOn
                                                ? _jsx("span", { style: { marginLeft: 8, fontSize: 8, color: L.purple, fontWeight: 600 }, children: "\u00B7 ghost mode" })
                                                : _jsx("span", { style: { marginLeft: 8, fontSize: 8, color: L.cyan, fontWeight: 600 }, children: "\u00B7 assets + cbom" })] }), !mobile && _jsx("span", { style: { fontSize: 9, color: L.text3 }, children: "\u25BC expand row for financial exposure and cipher details" })] }) })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }, children: [_jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "CERTIFICATE EXPIRY TIMELINE" }), _jsx("div", { style: { padding: 14 }, children: loading
                                    ? [0, 1, 2, 3].map(i => _jsx(SkeletonProgBar, {}, i))
                                    : [
                                        { label: "0–30 Days", count: certBuckets["0-30"], color: L.red },
                                        { label: "30–60 Days", count: certBuckets["30-60"], color: L.orange },
                                        { label: "60–90 Days", count: certBuckets["60-90"], color: L.yellow },
                                        { label: ">90 Days", count: certBuckets["90+"], color: L.green },
                                    ].map(row => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }, children: [_jsx("div", { style: { width: 8, height: 8, borderRadius: "50%", background: row.color, flexShrink: 0, boxShadow: `0 0 0 2px ${row.color}22` } }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 10, color: L.text2, fontWeight: 500 }, children: row.label }), _jsx("span", { style: { fontSize: 10, fontFamily: "'DM Mono',monospace", color: row.color, fontWeight: 700 }, children: row.count })] }), _jsx(LProgBar, { pct: Math.round(row.count / Math.max(assets.length, 1) * 100), color: row.color })] })] }, row.label))) })] }), _jsxs(LPanel, { children: [_jsx(LPanelHeader, { left: "CRYPTO & SECURITY OVERVIEW" }), mobile ? (_jsx("div", { style: { maxHeight: 220, overflowY: "auto" }, children: loading
                                    ? _jsx(SkeletonMobileCards, { count: 4 })
                                    : assets.filter(a => a.tls && a.tls !== "—").slice(0, 10).map((a, i) => {
                                        const tlsN = (a.tls || "").replace(/^TLSv?/i, "");
                                        return (_jsxs("div", { style: { padding: "9px 14px", borderBottom: `1px solid ${L.borderLight}` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 3 }, children: [_jsx("span", { style: { fontSize: 11, color: L.blue, fontWeight: 600 }, children: a.name }), _jsxs("span", { style: { fontSize: 8, fontWeight: 600, color: tlsN === "1.0" ? L.red : tlsN === "1.2" ? L.yellow : L.green, background: tlsN === "1.0" ? "#fff5f5" : tlsN === "1.2" ? "#fffbeb" : "#f0fdf4", border: `1px solid ${tlsN === "1.0" ? L.red : tlsN === "1.2" ? L.yellow : L.green}33`, borderRadius: 3, padding: "1px 5px" }, children: ["TLS ", tlsN] })] }), _jsxs("div", { style: { fontSize: 9, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: [a.keylen, " \u00B7 ", a.ca] })] }, i));
                                    }) })) : (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }, children: [_jsx("thead", { children: _jsx("tr", { style: { background: L.subtleBg, borderBottom: `2px solid ${L.panelBorder}` }, children: ["ASSET", "KEY LEN", "CIPHER SUITE", "TLS", "CA"].map(h => (_jsx("th", { style: { padding: "7px 8px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left" }, children: h }, h))) }) }), _jsx("tbody", { children: loading
                                                ? _jsx(SkeletonTableRows, { cols: 5, count: 6 })
                                                : assets.filter(a => a.tls && a.tls !== "—").slice(0, 10).map((a, i) => {
                                                    const tlsN = (a.tls || "").replace(/^TLSv?/i, "");
                                                    const rowBg = i % 2 === 0 ? L.panelBg : L.subtleBg;
                                                    return (_jsxs("tr", { style: { borderBottom: `1px solid ${L.borderLight}`, background: rowBg }, children: [_jsx("td", { style: { padding: "7px 8px", fontSize: 10, color: L.blue, fontWeight: 600 }, children: a.name }), _jsx("td", { style: { padding: "7px 8px", fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: keyColor(a.keylen) }, children: a.keylen }), _jsx("td", { style: { padding: "7px 8px", fontSize: 9, color: L.text3, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'DM Mono',monospace" }, children: a.cipher }), _jsx("td", { style: { padding: "7px 8px" }, children: _jsxs("span", { style: { fontSize: 8, fontWeight: 600, color: tlsN === "1.0" ? L.red : tlsN === "1.2" ? L.yellow : L.green, background: tlsN === "1.0" ? "#fff5f5" : tlsN === "1.2" ? "#fffbeb" : "#f0fdf4", border: `1px solid ${tlsN === "1.0" ? L.red : tlsN === "1.2" ? L.yellow : L.green}33`, borderRadius: 3, padding: "1px 5px" }, children: ["TLS ", tlsN] }) }), _jsx("td", { style: { padding: "7px 8px", fontSize: 10, color: L.text3 }, children: a.ca })] }, i));
                                                }) })] }) }))] })] })] }));
}
