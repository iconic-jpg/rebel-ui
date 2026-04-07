import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
const API = "https://r3bel-production.up.railway.app";
// ─── CACHE CONFIG ─────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_KEY_CBOM = "rebel_cache_cbom_pqc";
const CACHE_KEY_ASSETS = "rebel_cache_assets_pqc";
const CACHE_KEY_GHOST = "rebel_cache_ghost_pqc";
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
// ─── LIGHT PALETTE ────────────────────────────────────────────────────────────
const L = {
    pageBg: "#f1f5f9",
    panelBg: "#ffffff",
    panelBorder: "#e2e8f0",
    subtleBg: "#f8fafc",
    insetBg: "#f1f5f9",
    divider: "#e2e8f0",
    text1: "#0f172a",
    text2: "#1e293b",
    text3: "#475569",
    text4: "#94a3b8",
    blue: "#1d4ed8",
    cyan: "#0284c7",
    green: "#16a34a",
    yellow: "#b45309",
    orange: "#c2410c",
    red: "#dc2626",
    purple: "#7c3aed",
    accent: "#0ea5e9",
    accentBorder: "rgba(14,165,233,0.2)",
    accentDim: "rgba(14,165,233,0.08)",
    skelBase: "#e2e8f0",
    skelShim: "#f1f5f9",
};
// ─── STATIC DATA ─────────────────────────────────────────────────────────────
const RECS = [
    { icon: "⚠", color: L.yellow, text: "Upgrade to TLS 1.3 with PQC" },
    { icon: "◈", color: L.blue, text: "Implement Kyber for Key Exchange" },
    { icon: "◉", color: L.cyan, text: "Update Cryptographic Libraries" },
    { icon: "◎", color: L.green, text: "Develop PQC Migration Plan" },
    { icon: "⬡", color: L.orange, text: "Remove DES/3DES cipher suites" },
    { icon: "⚡", color: L.blue, text: "Enable HSTS on all public assets" },
];
const TIERS = [
    {
        tier: "TIER-1 ELITE", level: "Modern best-practice crypto posture",
        criteria: "TLS 1.2/1.3 only; Strong Ciphers; ECDHE; cert >2048-bit; no weak protocols; HSTS enabled",
        action: "Maintain config; periodic monitoring; recommended baseline",
        color: L.green,
    },
    {
        tier: "TIER-2 STANDARD", level: "Acceptable enterprise configuration",
        criteria: "TLS 1.2 supported but legacy allowed; Key >2048-bit; mostly strong ciphers",
        action: "Improve gradually; disable legacy protocols; standardise cipher suites",
        color: L.yellow,
    },
    {
        tier: "TIER-3 LEGACY", level: "Weak but still operational",
        criteria: "TLS 1.0/1.1 enabled; weak ciphers; forward secrecy missing; key possibly 1024-bit",
        action: "Remediation required; upgrade TLS stack; rotate certificates",
        color: L.orange,
    },
    {
        tier: "CRITICAL", level: "Insecure / exploitable",
        criteria: "SSL v2/v3 enabled; Key <1024-bit; known vulnerabilities",
        action: "Immediate action — block or isolate; replace certificate and TLS config",
        color: L.red,
    },
];
// ─── MOBILE HOOK ─────────────────────────────────────────────────────────────
function useMobile() {
    const [mobile, setMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setMobile(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return mobile;
}
// ─── SKELETON ────────────────────────────────────────────────────────────────
function Skel({ w = "100%", h = 12, r = 4, style = {} }) {
    return (_jsx("div", { style: {
            width: w, height: h, borderRadius: r, flexShrink: 0,
            background: `linear-gradient(90deg,${L.skelBase} 25%,${L.skelShim} 50%,${L.skelBase} 75%)`,
            backgroundSize: "400% 100%",
            animation: "shimmer 1.6s ease infinite",
            ...style,
        } }));
}
function MetricSkel() {
    return (_jsxs("div", { style: { background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }, children: [_jsx(Skel, { w: 60, h: 8, style: { marginBottom: 10 } }), _jsx(Skel, { w: 52, h: 28, r: 4, style: { marginBottom: 8 } }), _jsx(Skel, { w: 80, h: 8 })] }));
}
function ScoreHeaderSkel({ mobile }) {
    return (_jsx("div", { style: { background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 10, padding: mobile ? "14px 16px" : "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }, children: _jsxs("div", { style: { display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }, children: [_jsxs("div", { style: { flex: 1, minWidth: 200 }, children: [_jsx(Skel, { w: 220, h: 9, style: { marginBottom: 12 } }), _jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }, children: [_jsx(Skel, { w: 80, h: 48, r: 4 }), _jsx(Skel, { w: 50, h: 18 }), _jsx(Skel, { w: 70, h: 20, r: 4 })] }), _jsx(Skel, { w: 160, h: 9 })] }), _jsx(Skel, { w: mobile ? 110 : 160, h: mobile ? 110 : 160, r: 80, style: { flexShrink: 0 } }), _jsx("div", { style: { flex: 1, minWidth: mobile ? "100%" : 200, display: "flex", flexDirection: "column", gap: 12 }, children: [0, 1, 2, 3].map(i => (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 5 }, children: [_jsx(Skel, { w: 80, h: 9 }), _jsx(Skel, { w: 28, h: 9 })] }), _jsx(Skel, { h: 4, r: 2 })] }, i))) })] }) }));
}
function ChartPanelSkel() {
    return (_jsxs("div", { style: { background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }, children: [_jsx("div", { style: { padding: "10px 14px", borderBottom: `1px solid ${L.divider}`, background: L.subtleBg, borderRadius: "8px 8px 0 0" }, children: _jsx(Skel, { w: 160, h: 9 }) }), _jsx("div", { style: { padding: 16, display: "flex", gap: 16, alignItems: "flex-end", justifyContent: "center" }, children: [90, 40, 60].map((h, i) => (_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }, children: [_jsx(Skel, { w: 56, h: h, r: 2 }), _jsx(Skel, { w: 56, h: 16, r: 2 })] }, i))) })] }));
}
function TableRowSkel({ cols }) {
    const widths = [160, 100, 50, 60, 120, 70, 100];
    return (_jsx("tr", { style: { borderBottom: `1px solid ${L.divider}` }, children: Array.from({ length: cols }).map((_, i) => (_jsx("td", { style: { padding: "10px 10px" }, children: _jsx(Skel, { w: widths[i] ?? 70, h: i === 0 ? 10 : 9 }) }, i))) }));
}
function MobileCardSkel({ count = 5 }) {
    return (_jsx(_Fragment, { children: Array.from({ length: count }).map((_, i) => (_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid ${L.divider}` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 }, children: [_jsx(Skel, { w: 160, h: 11 }), _jsx(Skel, { w: 60, h: 18, r: 3 })] }), _jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 6 }, children: [_jsx(Skel, { w: 50, h: 18, r: 3 }), _jsx(Skel, { w: 20, h: 18, r: 3 }), _jsx(Skel, { w: 70, h: 9, style: { alignSelf: "center" } })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Skel, { w: "100%", h: 4, r: 2, style: { flex: 1 } }), _jsx(Skel, { w: 32, h: 11 })] })] }, i))) }));
}
// ─── SHARED PRIMITIVES ────────────────────────────────────────────────────────
function Panel({ children, style = {} }) {
    return (_jsx("div", { style: { background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", ...style }, children: children }));
}
function PanelHeader({ left, right }) {
    return (_jsxs("div", { style: {
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderBottom: `1px solid ${L.divider}`,
            background: L.subtleBg, borderRadius: "10px 10px 0 0",
        }, children: [_jsx("span", { style: { fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: "'Orbitron',monospace" }, children: left }), right] }));
}
function Badge({ color, children }) {
    return (_jsx("span", { style: {
            fontSize: 8, fontWeight: 700, letterSpacing: ".08em",
            color, border: `1px solid ${color}44`, borderRadius: 4,
            padding: "2px 7px", background: `${color}0d`,
            whiteSpace: "nowrap", display: "inline-block",
        }, children: children }));
}
function ProgBar({ pct, color }) {
    return (_jsx("div", { style: { height: 4, background: L.insetBg, borderRadius: 2, border: `1px solid ${L.panelBorder}`, overflow: "hidden" }, children: _jsx("div", { style: { height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: "width 0.6s ease" } }) }));
}
// ─── CACHE BADGE ─────────────────────────────────────────────────────────────
function CacheBadge({ age, onRefresh }) {
    if (!age)
        return null;
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsxs("span", { style: { fontSize: 8, fontWeight: 600, color: L.text3, background: L.insetBg, border: `1px solid ${L.panelBorder}`, borderRadius: 3, padding: "2px 7px", letterSpacing: ".06em", fontFamily: "'Orbitron',monospace" }, children: ["CACHED \u00B7 ", age] }), _jsx("button", { onClick: onRefresh, style: { background: `${L.accent}0d`, border: `1px solid ${L.accent}40`, borderRadius: 4, color: L.accent, cursor: "pointer", padding: "3px 8px", fontFamily: "'Orbitron',monospace", fontSize: 9, fontWeight: 700 }, children: "\u21BA REFRESH" })] }));
}
// ─── SECURE MODE BANNER ───────────────────────────────────────────────────────
function SecureModeBanner() {
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: `${L.purple}0d`, border: `1px solid ${L.purple}44`, borderRadius: 6 }, children: [_jsx("span", { style: { fontSize: 9, color: L.purple, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: "'Orbitron',monospace" }, children: "\uD83D\uDD12 SECURE MODE ACTIVE" }), _jsx("span", { style: { fontSize: 9, color: L.purple, opacity: 0.75 }, children: "\u00B7" }), _jsx("span", { style: { fontSize: 9, color: L.purple, fontFamily: "'Share Tech Mono',monospace" }, children: "/ghost/assets \u2014 anonymised data, no live scans" })] }));
}
// ─── HELPERS ──────────────────────────────────────────────────────────────────
function scoreColor(s) {
    return s >= 700 ? L.green : s >= 400 ? L.yellow : L.red;
}
function statusColor(s) {
    return s === "Elite" ? L.green : s === "Standard" ? L.yellow : s === "Critical" ? L.red : L.orange;
}
function tlsColor(t) {
    return t === "1.0" || t === "1.1" ? L.red : t === "1.2" ? L.yellow : L.green;
}
// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PQCPosturePage() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [fromCache, setFromCache] = useState(false);
    const [cacheAge, setCacheAge] = useState(null);
    const [secureModeOn, setSecureModeOn] = useState(false);
    const [secureModeLoading, setSecureModeLoading] = useState(true);
    const [stats, setStats] = useState({
        avg_score: 0, total: 0, elite: 0, standard: 0, legacy: 0, critical: 0,
        pqc_ready: 0, elite_pct: 0, standard_pct: 0, legacy_pct: 0, critical_pct: 0,
    });
    const mobile = useMobile();
    // ── Fetch secure mode status ────────────────────────────────────────────
    useEffect(() => {
        fetch(`${API}/secure-mode/status`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.enabled !== undefined)
            setSecureModeOn(Boolean(d.enabled)); })
            .catch(() => { })
            .finally(() => setSecureModeLoading(false));
    }, []);
    // ── Apply payload → PQC asset shape ────────────────────────────────────
    const applyApps = (apps) => {
        const pqcAssets = apps.map((a) => {
            const score = (() => {
                let s = 500;
                const tls = (a.tls || "").replace(/^TLSv?/i, "");
                if (tls === "1.3")
                    s += 200;
                else if (tls === "1.2")
                    s += 100;
                else if (tls === "1.1")
                    s -= 100;
                else if (tls === "1.0")
                    s -= 200;
                const bits = parseInt(String(a.keylen || "0").match(/(\d+)/)?.[1] ?? "0", 10);
                if (bits >= 4096)
                    s += 200;
                else if (bits >= 2048)
                    s += 100;
                else if (bits === 1024)
                    s -= 150;
                else if (bits > 0)
                    s -= 200;
                if (a.pqc)
                    s += 100;
                return Math.max(0, Math.min(1000, s));
            })();
            const status = score >= 700 ? "Elite" : score >= 400 ? "Standard" : score >= 200 ? "Legacy" : "Critical";
            return {
                name: a.app || a.name || "—",
                ip: a.ip || "—",
                tls: (a.tls || "—").replace(/^TLSv?/i, ""),
                pqc: !!a.pqc,
                score, status,
                owner: a.owner || a.ca || "—",
            };
        });
        setAssets(pqcAssets);
        const total = pqcAssets.length;
        const elite = pqcAssets.filter(a => a.status === "Elite").length;
        const standard = pqcAssets.filter(a => a.status === "Standard").length;
        const legacy = pqcAssets.filter(a => a.status === "Legacy").length;
        const critical = pqcAssets.filter(a => a.status === "Critical").length;
        const pqc_ready = pqcAssets.filter(a => a.pqc).length;
        const avg_score = total ? Math.round(pqcAssets.reduce((s, a) => s + a.score, 0) / total) : 0;
        setStats({
            avg_score, total,
            elite, standard, legacy, critical, pqc_ready,
            elite_pct: Math.round(elite / Math.max(total, 1) * 100),
            standard_pct: Math.round(standard / Math.max(total, 1) * 100),
            legacy_pct: Math.round(legacy / Math.max(total, 1) * 100),
            critical_pct: Math.round(critical / Math.max(total, 1) * 100),
        });
    };
    // ── Data load ────────────────────────────────────────────────────────────
    const loadData = async (forceRefresh = false) => {
        setLoading(true);
        setFetchError(false);
        if (secureModeOn) {
            // SECURE MODE: /ghost/assets only
            if (!forceRefresh) {
                const cached = cacheGet(CACHE_KEY_GHOST);
                if (cached) {
                    applyApps(cached?.assets ?? []);
                    setFromCache(true);
                    setCacheAge(cacheAgeLabel(CACHE_KEY_GHOST));
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
                applyApps(d?.assets ?? []);
                setFromCache(false);
                setCacheAge(null);
            }
            catch {
                setFetchError(true);
            }
        }
        else {
            // NORMAL MODE: /cbom + /assets merged
            if (!forceRefresh) {
                const cachedCbom = cacheGet(CACHE_KEY_CBOM);
                const cachedAssets = cacheGet(CACHE_KEY_ASSETS);
                if (cachedCbom) {
                    const merged = buildMergedApps(cachedCbom, cachedAssets?.assets ?? []);
                    applyApps(merged);
                    setFromCache(true);
                    setCacheAge(cacheAgeLabel(CACHE_KEY_CBOM));
                    setLoading(false);
                    return;
                }
            }
            try {
                const [cbom, assetsData] = await Promise.all([
                    fetch(`${API}/cbom`).then(r => r.json()).catch(() => ({})),
                    fetch(`${API}/assets`).then(r => r.json()).catch(() => ({ assets: [] })),
                ]);
                cacheSet(CACHE_KEY_CBOM, cbom);
                cacheSet(CACHE_KEY_ASSETS, assetsData);
                const merged = buildMergedApps(cbom, assetsData?.assets ?? []);
                applyApps(merged);
                setFromCache(false);
                setCacheAge(null);
            }
            catch {
                setFetchError(true);
            }
        }
        setLoading(false);
    };
    function buildMergedApps(cbom, allAssets) {
        const registeredMap = {};
        allAssets.forEach((a) => { if (a.name)
            registeredMap[a.name] = a; });
        const cbomApps = (cbom.apps ?? []).map((app) => {
            const reg = registeredMap[app.app];
            if (!reg)
                return app;
            return {
                ...app,
                is_wildcard: reg.is_wildcard ?? app.is_wildcard,
                criticality: reg.criticality,
                owner: reg.owner,
                compliance_scope: reg.compliance_scope,
                financial_exposure: reg.financial_exposure,
            };
        });
        const cbomDomains = new Set(cbomApps.map((a) => a.app));
        const registeredOnly = allAssets
            .filter((a) => a.id && !cbomDomains.has(a.name))
            .map((a) => ({
            app: a.name, keylen: a.keylen || "—", cipher: a.cipher || "—",
            tls: a.tls || "—", ca: a.ca || "—",
            status: a.risk === "weak" ? "weak" : "ok",
            pqc: false, pqc_support: "none",
            key_exchange_group: a.key_exchange_group || null,
            is_wildcard: a.is_wildcard ?? null,
            criticality: a.criticality, owner: a.owner,
        }));
        return [...cbomApps, ...registeredOnly];
    }
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
    const sc = scoreColor(stats.avg_score);
    const activeEndpointLabel = secureModeOn ? "→ /ghost/assets" : "→ /cbom + /assets";
    const firstAsset = assets[0];
    // ─── RENDER ──────────────────────────────────────────────────────────────
    return (_jsxs("div", { style: {
            padding: 20, background: L.pageBg, minHeight: "100vh",
            fontFamily: "'DM Sans', system-ui, sans-serif", color: L.text1,
            display: "flex", flexDirection: "column", gap: 14,
        }, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${L.panelBorder}; border-radius: 2px; }
        @keyframes shimmer { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
      ` }), secureModeOn && _jsx(SecureModeBanner, {}), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsx("span", { style: { fontSize: 7, fontFamily: "'Orbitron',monospace", color: L.text4, letterSpacing: ".08em" }, children: "API" }), _jsxs("span", { style: { fontSize: 8, fontFamily: "'Share Tech Mono',monospace", color: fetchError ? L.red : L.green, fontWeight: 600 }, children: [fetchError ? "✗" : "✓", " ", API] }), _jsx("span", { style: {
                                    fontSize: 8, fontFamily: "'Share Tech Mono',monospace", fontWeight: 700,
                                    color: secureModeOn ? L.purple : L.cyan,
                                    background: secureModeOn ? `${L.purple}10` : `${L.cyan}10`,
                                    border: `1px solid ${secureModeOn ? L.purple : L.cyan}44`,
                                    borderRadius: 3, padding: "2px 6px",
                                }, children: activeEndpointLabel }), fetchError && _jsx("span", { style: { fontSize: 8, color: L.red }, children: "\u2014 showing cached data" }), loading && _jsx("span", { style: { fontSize: 8, color: L.blue }, children: "fetching\u2026" })] }), fromCache && _jsx(CacheBadge, { age: cacheAge, onRefresh: handleForceRefresh })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: mobile ? 8 : 10 }, children: loading ? (Array.from({ length: 5 }).map((_, i) => _jsx(MetricSkel, {}, i))) : ([
                    { label: "TOTAL ASSETS", value: stats.total, sub: "In inventory", color: L.blue },
                    { label: "ELITE-PQC", value: stats.elite, sub: "Top posture", color: L.green },
                    { label: "STANDARD", value: stats.standard, sub: "Acceptable", color: L.yellow },
                    { label: "LEGACY", value: stats.legacy, sub: "Needs upgrade", color: L.orange },
                    { label: "CRITICAL", value: stats.critical, sub: "Immediate action", color: L.red },
                ].map((m, i) => (_jsxs("div", { style: {
                        background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8,
                        padding: mobile ? "12px 14px" : "14px 16px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        gridColumn: i === 4 && mobile ? "1/-1" : undefined,
                        borderTop: `3px solid ${m.color}`,
                    }, children: [_jsx("div", { style: { fontSize: 8, color: L.text4, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6, fontWeight: 600, fontFamily: "'Orbitron',monospace" }, children: m.label }), _jsx("div", { style: { fontSize: mobile ? 26 : 32, fontWeight: 800, color: m.color, lineHeight: 1, marginBottom: 4 }, children: m.value }), _jsx("div", { style: { fontSize: 9, color: L.text3, marginTop: 5 }, children: m.sub })] }, i)))) }), loading ? (_jsx(ScoreHeaderSkel, { mobile: mobile })) : (_jsx(Panel, { style: { background: "linear-gradient(135deg,rgba(14,165,233,0.04) 0%,#fff 100%)" }, children: _jsxs("div", { style: {
                        padding: mobile ? "14px 16px" : "18px 20px",
                        display: "flex", gap: mobile ? 14 : 24,
                        alignItems: "center", flexWrap: "wrap",
                    }, children: [_jsxs("div", { style: { display: "flex", gap: 14, alignItems: "center", flex: mobile ? "1 1 100%" : "unset" }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: mobile ? 7 : 9, color: L.text3, letterSpacing: ".15em", marginBottom: 6 }, children: "CONSOLIDATED PQC CYBER-RATING SCORE" }), _jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: mobile ? 6 : 10, flexWrap: "wrap" }, children: [_jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: mobile ? 40 : 52, fontWeight: 900, color: sc, lineHeight: 1 }, children: stats.avg_score }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: mobile ? 14 : 18, color: L.text3 }, children: "/1000" }), _jsx(Badge, { color: sc, children: stats.avg_score >= 700 ? "ELITE-PQC" : stats.avg_score >= 400 ? "STANDARD" : "CRITICAL" })] }), _jsx("div", { style: { fontSize: 11, color: L.text3, marginTop: 6 }, children: "Higher score indicates stronger security posture" })] }), _jsxs("svg", { width: mobile ? 110 : 160, height: mobile ? 110 : 160, viewBox: "0 0 160 160", style: { flexShrink: 0 }, children: [_jsx("circle", { cx: "80", cy: "80", r: "60", fill: "none", stroke: L.insetBg, strokeWidth: "14" }), _jsx("circle", { cx: "80", cy: "80", r: "60", fill: "none", stroke: L.green, strokeWidth: "14", strokeDasharray: `${stats.elite_pct * 3.77} 377`, strokeLinecap: "round", transform: "rotate(-90 80 80)" }), _jsx("circle", { cx: "80", cy: "80", r: "60", fill: "none", stroke: L.yellow, strokeWidth: "14", strokeDasharray: `${stats.standard_pct * 3.77} 377`, strokeDashoffset: `-${stats.elite_pct * 3.77}`, strokeLinecap: "round", transform: "rotate(-90 80 80)" }), _jsx("circle", { cx: "80", cy: "80", r: "60", fill: "none", stroke: L.orange, strokeWidth: "14", strokeDasharray: `${stats.legacy_pct * 3.77} 377`, strokeDashoffset: `-${(stats.elite_pct + stats.standard_pct) * 3.77}`, strokeLinecap: "round", transform: "rotate(-90 80 80)" }), _jsx("circle", { cx: "80", cy: "80", r: "60", fill: "none", stroke: L.red, strokeWidth: "14", strokeDasharray: `${stats.critical_pct * 3.77} 377`, strokeDashoffset: `-${(stats.elite_pct + stats.standard_pct + stats.legacy_pct) * 3.77}`, strokeLinecap: "round", transform: "rotate(-90 80 80)" }), _jsxs("text", { x: "80", y: "74", textAnchor: "middle", fill: sc, fontFamily: "Orbitron,monospace", fontSize: "22", fontWeight: "700", children: [stats.elite_pct, "%"] }), _jsx("text", { x: "80", y: "94", textAnchor: "middle", fill: L.text4, fontFamily: "DM Sans,sans-serif", fontSize: "9", children: "ELITE-PQC" })] })] }), _jsx("div", { style: { flex: 1, minWidth: mobile ? "100%" : 200 }, children: [
                                { label: "Elite-PQC Ready", pct: stats.elite_pct, color: L.green, count: stats.elite },
                                { label: "Standard", pct: stats.standard_pct, color: L.yellow, count: stats.standard },
                                { label: "Legacy", pct: stats.legacy_pct, color: L.orange, count: stats.legacy },
                                { label: "Critical", pct: stats.critical_pct, color: L.red, count: stats.critical },
                            ].map(row => (_jsxs("div", { style: { marginBottom: 12 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("div", { style: { width: 8, height: 8, borderRadius: "50%", background: row.color, flexShrink: 0 } }), _jsx("span", { style: { fontSize: 10, color: L.text2, fontWeight: 500 }, children: row.label })] }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("span", { style: { fontSize: 10, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: row.count }), _jsxs("span", { style: { fontSize: 10, color: row.color, fontFamily: "'Orbitron',monospace", fontWeight: 700 }, children: [row.pct, "%"] })] })] }), _jsx(ProgBar, { pct: row.pct, color: row.color })] }, row.label))) })] }) })), _jsx("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }, children: loading ? (_jsxs(_Fragment, { children: [_jsx(ChartPanelSkel, {}), _jsx(ChartPanelSkel, {})] })) : (_jsxs(_Fragment, { children: [_jsxs(Panel, { children: [_jsx(PanelHeader, { left: "ASSETS BY CLASSIFICATION GRADE" }), _jsx("div", { style: { padding: 16, display: "flex", gap: mobile ? 12 : 16, alignItems: "flex-end", justifyContent: "center", flexWrap: "wrap" }, children: [
                                        { label: "ELITE", val: stats.elite, h: 90, color: L.green },
                                        { label: "STANDARD", val: stats.standard, h: 55, color: L.yellow },
                                        { label: "LEGACY", val: stats.legacy, h: 40, color: L.orange },
                                        { label: "CRITICAL", val: stats.critical, h: 30, color: L.red },
                                    ].map(bar => (_jsxs("div", { style: { textAlign: "center" }, children: [_jsx("div", { style: {
                                                    width: mobile ? 52 : 64, height: bar.h,
                                                    background: `${bar.color}10`, border: `1px solid ${bar.color}33`,
                                                    borderRadius: "4px 4px 0 0", display: "flex", alignItems: "center", justifyContent: "center",
                                                }, children: _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: mobile ? 18 : 22, color: bar.color, fontWeight: 700 }, children: bar.val }) }), _jsx("div", { style: {
                                                    fontFamily: "'Orbitron',monospace", fontSize: 7, color: bar.color,
                                                    marginTop: 5, padding: "3px 5px",
                                                    background: `${bar.color}0d`, border: `1px solid ${bar.color}28`, borderRadius: 3,
                                                }, children: bar.label })] }, bar.label))) })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "RISK OVERVIEW" }), _jsxs("div", { style: { padding: 16, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }, children: [_jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 48px)", gap: 5 }, children: [
                                                `${L.red}28`, `${L.red}14`, `${L.orange}14`,
                                                `${L.red}14`, `${L.orange}0f`, `${L.yellow}0a`,
                                                `${L.orange}0f`, `${L.yellow}0a`, `${L.green}0d`,
                                            ].map((bg, i) => (_jsx("div", { style: {
                                                    width: mobile ? 38 : 48, height: mobile ? 38 : 48,
                                                    background: bg, border: `1px solid ${bg.slice(0, 7)}44`,
                                                    borderRadius: 4,
                                                } }, i))) }), _jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [
                                                { color: L.red, label: "High Risk" },
                                                { color: L.yellow, label: "Medium Risk" },
                                                { color: L.green, label: "Safe / No Risk" },
                                            ].map(row => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { width: 12, height: 12, borderRadius: 2, background: `${row.color}1a`, border: `1px solid ${row.color}44` } }), _jsx("span", { style: { fontSize: 10, color: L.text2, fontWeight: 500 }, children: row.label })] }, row.label))) })] })] })] })) }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "PQC ASSET STATUS", right: loading ? _jsx(Skel, { w: 80, h: 9 }) : (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [secureModeOn && (_jsx("span", { style: { fontSize: 7, color: L.purple, fontFamily: "'Orbitron',monospace", fontWeight: 700, border: `1px solid ${L.purple}44`, borderRadius: 3, padding: "2px 6px", background: `${L.purple}0a` }, children: "\uD83D\uDD12 GHOST" })), _jsxs("span", { style: { fontSize: 8, color: L.text3, fontFamily: "'Orbitron',monospace" }, children: ["CRITICAL: ", stats.critical] })] })) }), mobile ? (_jsx("div", { style: { maxHeight: 420, overflowY: "auto" }, children: loading ? (_jsx(MobileCardSkel, { count: 6 })) : (assets.map((a, i) => (_jsxs("div", { style: { padding: "10px 14px", borderBottom: `1px solid ${L.divider}` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 5 }, children: [_jsx("span", { style: { fontSize: 11, color: L.blue, fontWeight: 600 }, children: a.name }), _jsx(Badge, { color: statusColor(a.status), children: a.status.toUpperCase() })] }), _jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }, children: [_jsxs(Badge, { color: tlsColor(a.tls), children: ["TLS ", a.tls] }), _jsx("span", { style: { fontSize: 14, color: a.pqc ? L.green : L.red }, children: a.pqc ? "✓" : "✗" }), _jsx("span", { style: { fontSize: 9, color: L.text3, fontFamily: "'Share Tech Mono',monospace" }, children: a.ip })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { flex: 1 }, children: _jsx(ProgBar, { pct: Math.round(a.score / 10), color: scoreColor(a.score) }) }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 11, color: scoreColor(a.score), fontWeight: 700 }, children: a.score })] })] }, i)))) })) : (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }, children: [_jsx("thead", { children: _jsx("tr", { style: { background: L.subtleBg, borderBottom: `2px solid ${L.panelBorder}` }, children: ["ASSET NAME", "IP ADDRESS", "PQC SUPPORT", "TLS", "SCORE", "STATUS", "OWNER"].map(h => (_jsx("th", { style: { padding: "8px 10px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left", whiteSpace: "nowrap", fontFamily: "'Orbitron',monospace" }, children: h }, h))) }) }), _jsx("tbody", { children: loading ? (Array.from({ length: 7 }).map((_, i) => _jsx(TableRowSkel, { cols: 7 }, i))) : (assets.map((a, i) => {
                                        const rowBg = i % 2 === 0 ? L.panelBg : L.subtleBg;
                                        return (_jsxs("tr", { style: { borderBottom: `1px solid ${L.divider}`, background: rowBg }, onMouseEnter: e => (e.currentTarget.style.background = L.insetBg), onMouseLeave: e => (e.currentTarget.style.background = rowBg), children: [_jsx("td", { style: { padding: "9px 10px", fontSize: 10, color: L.blue, fontWeight: 600 }, children: a.name }), _jsx("td", { style: { padding: "9px 10px", fontSize: 10, color: L.text3, fontFamily: "'Share Tech Mono',monospace" }, children: a.ip }), _jsx("td", { style: { padding: "9px 10px", textAlign: "center", fontSize: 16, fontWeight: 700 }, children: a.pqc ? _jsx("span", { style: { color: L.green }, children: "\u2713" }) : _jsx("span", { style: { color: L.red }, children: "\u2717" }) }), _jsx("td", { style: { padding: "9px 10px" }, children: _jsxs(Badge, { color: tlsColor(a.tls), children: ["TLS ", a.tls] }) }), _jsx("td", { style: { padding: "9px 10px" }, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { width: 60 }, children: _jsx(ProgBar, { pct: Math.round(a.score / 10), color: scoreColor(a.score) }) }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 11, color: scoreColor(a.score), fontWeight: 700 }, children: a.score })] }) }), _jsx("td", { style: { padding: "9px 10px" }, children: _jsx(Badge, { color: statusColor(a.status), children: a.status.toUpperCase() }) }), _jsx("td", { style: { padding: "9px 10px", fontSize: 10, color: L.text3 }, children: a.owner })] }, i));
                                    })) })] }) })), _jsxs("div", { style: { padding: "8px 14px", borderTop: `1px solid ${L.divider}`, background: L.subtleBg, borderRadius: "0 0 10px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }, children: [loading ? _jsx(Skel, { w: 180, h: 9 }) : (_jsxs("span", { style: { fontSize: 10, color: L.text2 }, children: [_jsx("b", { style: { color: L.text1 }, children: assets.length }), " assets \u00B7", " ", _jsx("b", { style: { color: L.green }, children: stats.elite }), " elite \u00B7", " ", _jsx("b", { style: { color: L.red }, children: stats.critical }), " critical", secureModeOn && _jsx("span", { style: { marginLeft: 8, fontSize: 8, color: L.purple, fontWeight: 600 }, children: "\u00B7 ghost mode" })] })), fromCache && _jsx(CacheBadge, { age: cacheAge, onRefresh: handleForceRefresh })] })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: "PQC COMPLIANCE TIERS" }), mobile ? (_jsx("div", { children: TIERS.map((t, i) => (_jsxs("div", { style: { padding: "12px 14px", borderBottom: `1px solid ${L.divider}` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }, children: [_jsx(Badge, { color: t.color, children: t.tier }), _jsx("span", { style: { fontSize: 10, color: t.color, fontWeight: 600, textAlign: "right" }, children: t.level })] }), _jsx("div", { style: { fontSize: 9, color: L.text2, marginBottom: 5, lineHeight: 1.5 }, children: t.criteria }), _jsx("div", { style: { fontSize: 9, color: L.text3, lineHeight: 1.5, borderLeft: `2px solid ${t.color}44`, paddingLeft: 8 }, children: t.action })] }, i))) })) : (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }, children: [_jsx("thead", { children: _jsx("tr", { style: { background: L.subtleBg, borderBottom: `2px solid ${L.panelBorder}` }, children: ["TIER", "SECURITY LEVEL", "COMPLIANCE CRITERIA", "PRIORITY / ACTION"].map(h => (_jsx("th", { style: { padding: "8px 10px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left", fontFamily: "'Orbitron',monospace" }, children: h }, h))) }) }), _jsx("tbody", { children: TIERS.map((t, i) => {
                                        const rowBg = i % 2 === 0 ? L.panelBg : L.subtleBg;
                                        return (_jsxs("tr", { style: { borderBottom: `1px solid ${L.divider}`, background: rowBg }, children: [_jsx("td", { style: { padding: "10px 10px" }, children: _jsx(Badge, { color: t.color, children: t.tier }) }), _jsx("td", { style: { padding: "10px 10px", fontSize: 10, color: t.color, fontWeight: 600 }, children: t.level }), _jsx("td", { style: { padding: "10px 10px", fontSize: 10, color: L.text2, maxWidth: 300 }, children: t.criteria }), _jsx("td", { style: { padding: "10px 10px", fontSize: 10, color: L.text3, borderLeft: `2px solid ${t.color}33` }, children: t.action })] }, i));
                                    }) })] }) }))] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }, children: [_jsxs(Panel, { children: [_jsx(PanelHeader, { left: "IMPROVEMENT RECOMMENDATIONS" }), _jsx("div", { children: RECS.map((r, i) => (_jsxs("div", { style: {
                                        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                                        borderBottom: `1px solid ${L.divider}`,
                                    }, children: [_jsx("div", { style: {
                                                width: 28, height: 28, borderRadius: 6,
                                                background: `${r.color}10`, border: `1px solid ${r.color}33`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 12, color: r.color, flexShrink: 0,
                                            }, children: r.icon }), _jsx("span", { style: { fontSize: mobile ? 12 : 11, color: L.text2, fontWeight: 500 }, children: r.text }), _jsx("div", { style: { marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: `${r.color}60`, flexShrink: 0 } })] }, i))) })] }), _jsxs(Panel, { children: [_jsx(PanelHeader, { left: loading ? "APP DETAILS" : firstAsset ? `${firstAsset.name} DETAILS` : "APP DETAILS" }), loading ? (_jsxs("div", { style: { padding: 14, display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx(Skel, { w: 38, h: 38, r: 6, style: { flexShrink: 0 } }), _jsx(Skel, { w: 180, h: 13 })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }, children: [0, 1, 2, 3].map(i => (_jsxs("div", { children: [_jsx(Skel, { w: 50, h: 8, style: { marginBottom: 5 } }), _jsx(Skel, { w: 80, h: 11 })] }, i))) }), _jsxs("div", { children: [_jsx(Skel, { w: 70, h: 8, style: { marginBottom: 8 } }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(Skel, { h: 4, r: 2, style: { flex: 1 } }), _jsx(Skel, { w: 36, h: 14 }), _jsx(Skel, { w: 55, h: 18, r: 3 })] })] }), _jsx(Skel, { h: 70, r: 6 })] })) : (_jsxs("div", { style: { padding: 14, display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("div", { style: {
                                                    width: 38, height: 38, background: `${L.blue}10`,
                                                    border: `1px solid ${L.blue}33`, borderRadius: 8,
                                                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: L.blue,
                                                }, children: "\u2B21" }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 13, color: L.text1, fontWeight: 700 }, children: firstAsset?.name || "—" })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }, children: [
                                            ["OWNER", firstAsset?.owner || "—", L.text2],
                                            ["EXPOSURE", "Internet", L.text2],
                                            ["TLS", `TLS ${firstAsset?.tls || "—"}`, tlsColor(firstAsset?.tls || "")],
                                            ["STATUS", firstAsset?.status || "—", statusColor(firstAsset?.status || "")],
                                        ].map(([k, v, c]) => (_jsxs("div", { style: { padding: "8px 10px", background: L.subtleBg, borderRadius: 6, border: `1px solid ${L.panelBorder}` }, children: [_jsx("div", { style: { fontSize: 7.5, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase", fontWeight: 600, fontFamily: "'Orbitron',monospace" }, children: k }), _jsx("div", { style: { fontSize: 11, color: c, fontWeight: 600 }, children: v })] }, k))) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 8, color: L.text4, letterSpacing: ".1em", marginBottom: 6, textTransform: "uppercase", fontWeight: 600, fontFamily: "'Orbitron',monospace" }, children: "PQC SCORE" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { flex: 1 }, children: _jsx(ProgBar, { pct: Math.round((firstAsset?.score || 0) / 10), color: scoreColor(firstAsset?.score || 0) }) }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 14, color: scoreColor(firstAsset?.score || 0), fontWeight: 700 }, children: firstAsset?.score || 0 }), _jsx(Badge, { color: statusColor(firstAsset?.status || ""), children: (firstAsset?.status || "—").toUpperCase() })] })] }), _jsxs("div", { style: {
                                            padding: "10px 12px",
                                            background: `${L.red}05`,
                                            border: `1px solid ${L.red}20`,
                                            borderRadius: 8,
                                            borderLeft: `3px solid ${L.red}`,
                                        }, children: [_jsx("div", { style: { fontSize: 8, color: L.text4, letterSpacing: ".1em", marginBottom: 6, textTransform: "uppercase", fontWeight: 600, fontFamily: "'Orbitron',monospace" }, children: "RECOMMENDED ACTIONS" }), _jsxs("div", { style: { fontSize: 10, color: L.red, lineHeight: 1.8 }, children: ["\u2192 Migrate from RSA to ECDSA/Kyber", _jsx("br", {}), "\u2192 Upgrade to TLS 1.3 immediately", _jsx("br", {}), "\u2192 Replace 1024-bit keys with 4096-bit"] })] })] }))] })] })] }));
}
