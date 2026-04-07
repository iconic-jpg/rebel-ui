import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import { parseCipher, fullAnalysis, normaliseTLS, severityColor, severityVariant, pqcReadinessScore, } from "./cipherAnalysis.js";
const API = "https://r3bel-production.up.railway.app";
// ─── CACHE CONFIG ─────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_KEY_CBOM = "rebel_cache_cbom";
const CACHE_KEY_ASSETS = "rebel_cache_assets_cbom";
const CACHE_KEY_GHOST = "rebel_cache_ghost_cbom";
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
    localStorage.removeItem(CACHE_KEY_CBOM);
    localStorage.removeItem(CACHE_KEY_ASSETS);
    localStorage.removeItem(CACHE_KEY_GHOST);
}
function cacheAgeLabel(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw)
            return null;
        const entry = JSON.parse(raw);
        const mins = Math.round((Date.now() - entry.ts) / 60000);
        if (mins < 60)
            return `${mins}m ago`;
        return `${Math.round(mins / 60)}h ago`;
    }
    catch {
        return null;
    }
}
// ─── BREAKPOINT HOOK ─────────────────────────────────────────────────────────
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
// ─── BADGE ───────────────────────────────────────────────────────────────────
const BADGE_COLORS = {
    red: { color: "#dc2626", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.3)" },
    orange: { color: "#ea580c", bg: "rgba(234,88,12,0.08)", border: "rgba(234,88,12,0.3)" },
    yellow: { color: "#ca8a04", bg: "rgba(202,138,4,0.08)", border: "rgba(202,138,4,0.3)" },
    green: { color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.3)" },
    blue: { color: "#1d4ed8", bg: "rgba(29,78,216,0.08)", border: "rgba(29,78,216,0.3)" },
    gray: { color: "#475569", bg: "rgba(71,85,105,0.08)", border: "rgba(71,85,105,0.25)" },
};
function Badge({ v, children }) {
    const s = BADGE_COLORS[v] ?? BADGE_COLORS.gray;
    return (_jsx("span", { style: {
            fontSize: 8, fontWeight: 700, letterSpacing: ".08em",
            color: s.color, background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: 4, padding: "2px 6px",
            whiteSpace: "nowrap", display: "inline-block",
        }, children: children }));
}
// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgBar({ pct, color }) {
    return (_jsx("div", { style: { height: 4, background: "rgba(14,165,233,0.1)", borderRadius: 2, overflow: "hidden" }, children: _jsx("div", { style: {
                height: "100%", width: `${Math.min(100, pct)}%`,
                background: color, borderRadius: 2, transition: "width 0.6s ease",
            } }) }));
}
// ─── LIGHT PALETTE ────────────────────────────────────────────────────────────
const L = {
    accent: "#0ea5e9",
    accentDark: "#0284c7",
    accentDim: "rgba(14,165,233,0.09)",
    accentBorder: "rgba(14,165,233,0.2)",
    text: "#050d1a",
    textSec: "#1e293b",
    textDim: "#334155",
    textMuted: "#475569",
    textFaint: "#64748b",
    divider: "rgba(14,165,233,0.12)",
    panelBg: "#ffffff",
    pageBg: "#f1f5f9",
    skeletonBase: "#e2e8f0",
    skeletonShim: "#f1f5f9",
    red: "#dc2626", orange: "#ea580c",
    yellow: "#ca8a04", green: "#16a34a",
    cyan: "#0891b2", blue: "#1d4ed8",
    purple: "#7c3aed",
};
const CC = {
    green: "#16a34a", blue: "#1d4ed8", cyan: "#0891b2",
    yellow: "#ca8a04", red: "#dc2626", orange: "#ea580c",
};
// ─── SKELETON PRIMITIVES ──────────────────────────────────────────────────────
function Skel({ w = "100%", h = 12, r = 6, style = {} }) {
    return (_jsx("div", { style: {
            width: w, height: h, borderRadius: r,
            background: `linear-gradient(90deg, ${L.skeletonBase} 25%, ${L.skeletonShim} 50%, ${L.skeletonBase} 75%)`,
            backgroundSize: "400% 100%",
            animation: "shimmer 1.6s ease infinite",
            flexShrink: 0,
            ...style,
        } }));
}
function MetricSkeleton() {
    return (_jsxs("div", { style: {
            background: "#fff", border: `1px solid ${L.accentBorder}`,
            borderRadius: 10, padding: "14px 16px",
            boxShadow: "0 1px 4px rgba(14,165,233,0.07)",
        }, children: [_jsx(Skel, { w: 60, h: 8, style: { marginBottom: 10 } }), _jsx(Skel, { w: 48, h: 30, r: 4, style: { marginBottom: 8 } }), _jsx(Skel, { w: 80, h: 7 })] }));
}
function CardSkeleton() {
    return (_jsxs("div", { style: { padding: "12px 14px", borderBottom: `1px solid ${L.divider}` }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 }, children: [_jsx(Skel, { w: 160, h: 11 }), _jsx(Skel, { w: 48, h: 11 })] }), _jsxs("div", { style: { display: "flex", gap: 8, marginBottom: 8 }, children: [_jsx(Skel, { w: 50, h: 8, r: 4 }), _jsx(Skel, { w: 40, h: 8, r: 4 }), _jsx(Skel, { w: 36, h: 8, r: 4 })] }), _jsx(Skel, { w: "90%", h: 8 })] }));
}
function ChartSkeleton({ height = 160 }) {
    return (_jsx("div", { style: {
            height, background: L.skeletonBase, borderRadius: 6,
            animation: "shimmer 1.6s ease infinite",
            backgroundImage: `linear-gradient(90deg, ${L.skeletonBase} 25%, ${L.skeletonShim} 50%, ${L.skeletonBase} 75%)`,
            backgroundSize: "400% 100%",
        } }));
}
// ─── FINDING BADGE ────────────────────────────────────────────────────────────
function FindingBadge({ severity }) {
    const color = severityColor(severity);
    return (_jsx("span", { style: {
            fontSize: 8, fontWeight: 700, letterSpacing: ".08em",
            color, border: `1px solid ${color}44`,
            borderRadius: 4, padding: "2px 6px",
            textTransform: "uppercase", flexShrink: 0,
            background: `${color}0d`,
        }, children: severity }));
}
// ─── PQC SCORE BADGE ──────────────────────────────────────────────────────────
function PQCScoreBadge({ score }) {
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }, children: [_jsx("span", { style: {
                    fontSize: 7, fontWeight: 700, letterSpacing: ".07em",
                    color: score.color, border: `1px solid ${score.color}44`,
                    borderRadius: 4, padding: "2px 6px", background: `${score.color}0d`,
                }, children: score.active ? "ACTIVE" : score.label }), !score.active && (_jsx("div", { style: { width: 48, height: 3, background: L.divider, borderRadius: 2 }, children: _jsx("div", { style: {
                        height: "100%", borderRadius: 2,
                        width: `${score.score}%`, background: score.color,
                        transition: "width 0.6s ease",
                    } }) })), !score.active && (_jsxs("span", { style: { fontSize: 7, color: score.color, fontFamily: "'Orbitron',monospace", fontWeight: 700 }, children: [score.score, "/100"] }))] }));
}
// ─── PQC SCORE DETAIL ─────────────────────────────────────────────────────────
function PQCScoreDetail({ score }) {
    const rows = Object.values(score.criteria);
    return (_jsxs("div", { style: {
            background: "#f8fafc", border: `1px solid ${score.color}33`,
            borderRadius: 8, padding: 12, marginTop: 6,
        }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }, children: [_jsx("span", { style: { fontSize: 8, color: score.color, letterSpacing: ".12em", fontFamily: "'Orbitron',monospace", fontWeight: 700 }, children: "PQC MIGRATION READINESS" }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 14, color: score.color, fontWeight: 700 }, children: score.active ? "ACTIVE" : `${score.score}/100` })] }), !score.active && (_jsx("div", { style: { height: 4, background: L.divider, borderRadius: 2, marginBottom: 10 }, children: _jsx("div", { style: { height: "100%", borderRadius: 2, width: `${score.score}%`, background: score.color, transition: "width 0.8s ease" } }) })), _jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: rows.map((c) => (_jsxs("div", { style: {
                        display: "flex", alignItems: "flex-start", gap: 8,
                        borderLeft: `2px solid ${c.pass ? L.green : c.pts > 0 ? L.yellow : "rgba(220,38,38,0.3)"}`,
                        paddingLeft: 7,
                    }, children: [_jsx("span", { style: { fontSize: 10, width: 12, flexShrink: 0, marginTop: 1, fontWeight: 700, color: c.pass ? L.green : c.pts > 0 ? L.yellow : L.red }, children: c.pass ? "✓" : c.pts > 0 ? "~" : "✗" }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 1 }, children: [_jsx("span", { style: { fontSize: 8, color: L.textDim, fontWeight: 700 }, children: c.label }), _jsxs("span", { style: { fontSize: 8, fontFamily: "'Orbitron',monospace", flexShrink: 0, marginLeft: 8, fontWeight: 700, color: c.pass ? L.green : c.pts > 0 ? L.yellow : L.textMuted }, children: [c.pts, "/", c.max] })] }), _jsx("div", { style: { fontSize: 7, color: L.textMuted }, children: c.detail })] })] }, c.label))) }), !score.active && (_jsx("div", { style: { marginTop: 8, padding: "6px 10px", background: L.accentDim, border: `1px solid ${L.accentBorder}`, borderRadius: 6 }, children: _jsx("span", { style: { fontSize: 7.5, color: L.textDim, fontWeight: 500 }, children: score.score >= 100
                        ? "Classical foundation complete. Deploy CRYSTALS-Kyber (FIPS 203) hybrid to go ACTIVE."
                        : score.score >= 70
                            ? "Address remaining gaps then deploy X25519+Kyber768 hybrid per NIST FIPS 203."
                            : score.score >= 40
                                ? "Significant gaps. Upgrade cert key size and enforce AES-256 before planning Kyber deployment."
                                : "Not migration-ready. Fix TLS version, cipher suite, and certificate first." }) }))] }));
}
// ─── CIPHER BREAKDOWN ─────────────────────────────────────────────────────────
function CipherBreakdown({ analysis, compact = false }) {
    const { components: c, findings, pqcImpact: pqc } = analysis;
    return (_jsxs("div", { style: { background: "#f8fafc", border: `1px solid ${L.accentBorder}`, borderRadius: 8, padding: compact ? 10 : 12, marginTop: 6 }, children: [_jsx("div", { style: { display: "grid", gridTemplateColumns: compact ? "1fr 1fr" : "repeat(5,1fr)", gap: 6, marginBottom: 10 }, children: [
                    { label: "Key exchange", val: c.keyExchange },
                    { label: "Auth", val: c.authentication },
                    { label: "Bulk cipher", val: c.bulkCipher },
                    { label: "MAC", val: c.mac },
                    { label: "PFS", val: c.pfs ? "Yes ✓" : "No ✗" },
                ].map(item => (_jsxs("div", { style: { background: "#fff", border: `1px solid ${L.divider}`, borderRadius: 6, padding: "5px 8px" }, children: [_jsx("div", { style: { fontSize: 7, color: L.textMuted, marginBottom: 2, letterSpacing: ".1em", fontFamily: "'Orbitron',monospace", fontWeight: 700 }, children: item.label.toUpperCase() }), _jsx("div", { style: {
                                fontSize: 9, fontFamily: "'Share Tech Mono',monospace", fontWeight: 600,
                                color: item.label === "PFS" ? (c.pfs ? L.green : L.red) : L.textSec,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }, children: item.val })] }, item.label))) }), findings.filter(f => f.severity !== "ok").map((f, i) => (_jsxs("div", { style: { borderLeft: `2px solid ${severityColor(f.severity)}`, paddingLeft: 8, marginBottom: 8 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }, children: [_jsx(FindingBadge, { severity: f.severity }), _jsx("span", { style: { fontSize: 9, color: L.textSec, fontWeight: 700 }, children: f.title }), !compact && _jsx("span", { style: { fontSize: 8, color: L.textMuted, marginLeft: "auto" }, children: f.doraArticle })] }), _jsx("div", { style: { fontSize: 8, color: L.textDim, lineHeight: 1.5 }, children: f.description }), compact && _jsx("div", { style: { fontSize: 7, color: L.textMuted, marginTop: 2, fontStyle: "italic" }, children: f.doraArticle }), _jsxs("div", { style: { fontSize: 8, color: L.cyan, marginTop: 3, fontWeight: 600 }, children: ["\u21B3 ", f.remediation] })] }, i))), _jsxs("div", { style: {
                    background: c.pqcHybrid ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)",
                    border: `1px solid ${c.pqcHybrid ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.15)"}`,
                    borderRadius: 6, padding: "5px 10px",
                }, children: [_jsxs("span", { style: { fontSize: 7, color: L.textMuted, letterSpacing: ".1em", fontFamily: "'Orbitron',monospace", fontWeight: 700 }, children: ["PQC IMPACT", "  "] }), _jsx("span", { style: { fontSize: 8, color: L.textSec }, children: pqc })] })] }));
}
// ─── APP CARD (mobile/tablet) ─────────────────────────────────────────────────
function AppCard({ d, compact }) {
    const [open, setOpen] = useState(false);
    const risk = d.analysis.overallRisk;
    const c = d.analysis.components;
    const tlsNorm = normaliseTLS(d.tls);
    const pqcScore = pqcReadinessScore(c, d.tls, d.keylen, d.is_wildcard ?? false);
    return (_jsxs("div", { style: { borderBottom: `1px solid ${L.divider}` }, children: [_jsxs("div", { onClick: () => setOpen(o => !o), style: { padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }, onMouseEnter: e => (e.currentTarget.style.background = L.accentDim), onMouseLeave: e => (e.currentTarget.style.background = "transparent"), children: [_jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }, children: [_jsx("span", { style: { fontSize: 11, color: L.blue, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: d.app }), _jsx(PQCScoreBadge, { score: pqcScore })] }), _jsxs("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: [_jsxs(Badge, { v: tlsNorm === "1.0" ? "red" : tlsNorm === "1.2" ? "yellow" : "green", children: ["TLS ", tlsNorm] }), _jsx("span", { style: { fontSize: 9, fontWeight: 600, color: d.keylen?.startsWith("1024") ? L.red : d.keylen?.startsWith("2048") ? L.yellow : L.green }, children: d.keylen }), _jsx("span", { style: { fontSize: 9, fontWeight: 600, color: c.pfs ? L.green : L.red }, children: c.pfs ? "PFS ✓" : "PFS ✗" })] }), _jsxs("div", { style: { fontSize: 8, color: L.textMuted, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [_jsx("span", { style: { color: L.textDim, fontFamily: "'Share Tech Mono',monospace", fontWeight: 600 }, children: c.keyExchange }), " · ", _jsx("span", { style: {
                                            color: c.bulkCipher.includes("DES") || c.bulkCipher === "RC4-128" ? L.red
                                                : c.bulkCipher.includes("CBC") ? L.orange : L.textDim,
                                            fontFamily: "'Share Tech Mono',monospace", fontWeight: 600,
                                        }, children: c.bulkCipher }), " · ", d.ca] })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [_jsx(FindingBadge, { severity: risk }), _jsx("span", { style: { fontSize: 10, color: L.textMuted }, children: open ? "▲" : "▼" })] })] }), open && (_jsxs("div", { style: { padding: "0 14px 12px" }, children: [_jsx(PQCScoreDetail, { score: pqcScore }), _jsx(CipherBreakdown, { analysis: d.analysis, compact: compact })] }))] }));
}
// ─── CACHE BADGE ─────────────────────────────────────────────────────────────
function CacheBadge({ age, onRefresh }) {
    if (!age)
        return null;
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsxs("span", { style: {
                    fontSize: 8, fontWeight: 600, color: L.textMuted,
                    background: "rgba(14,165,233,0.06)", border: `1px solid ${L.accentBorder}`,
                    borderRadius: 3, padding: "2px 7px", letterSpacing: ".06em",
                    fontFamily: "'Orbitron',monospace",
                }, children: ["CACHED \u00B7 ", age] }), _jsx("button", { onClick: onRefresh, style: {
                    background: `${L.accent}0d`, border: `1px solid ${L.accent}40`,
                    borderRadius: 4, color: L.accent, cursor: "pointer",
                    padding: "3px 8px", fontFamily: "'Orbitron',monospace", fontSize: 9, fontWeight: 700,
                }, children: "\u21BA REFRESH" })] }));
}
// ─── SECURE MODE BANNER ───────────────────────────────────────────────────────
function SecureModeBanner() {
    return (_jsxs("div", { style: {
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px",
            background: `${L.purple}0d`,
            border: `1px solid ${L.purple}44`,
            borderRadius: 6,
        }, children: [_jsx("span", { style: { fontSize: 9, color: L.purple, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: "'Orbitron',monospace" }, children: "\uD83D\uDD12 SECURE MODE ACTIVE" }), _jsx("span", { style: { fontSize: 9, color: L.purple, opacity: 0.75 }, children: "\u00B7" }), _jsx("span", { style: { fontSize: 9, color: L.purple, fontFamily: "'Share Tech Mono',monospace" }, children: "/ghost/assets \u2014 anonymised data, no live scans" })] }));
}
// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
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
    const [loading, setLoading] = useState(true);
    const [cbomData, setCbomData] = useState([]);
    const [stats, setStats] = useState({ total_apps: 0, weak_crypto: 0, pqc_ready: 0, active_certs: 0 });
    const [cipherData, setCipherData] = useState([]);
    const [caData, setCaData] = useState([]);
    const [protoData, setProtoData] = useState([]);
    const [keyData, setKeyData] = useState({});
    const [expandedRow, setExpandedRow] = useState(null);
    const [fetchError, setFetchError] = useState(false);
    const [fromCache, setFromCache] = useState(false);
    const [cacheAge, setCacheAge] = useState(null);
    const [secureModeOn, setSecureModeOn] = useState(false);
    const [secureModeLoading, setSecureModeLoading] = useState(true);
    // ── Fetch secure mode status on mount ───────────────────────────────────
    useEffect(() => {
        fetch(`${API}/secure-mode/status`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
            if (d?.enabled !== undefined)
                setSecureModeOn(Boolean(d.enabled));
        })
            .catch(() => { })
            .finally(() => setSecureModeLoading(false));
    }, []);
    // ── Apply fetched CBOM payload ───────────────────────────────────────────
    const applyPayload = (d, apps) => {
        setCbomData(apps);
        setStats(d.stats || { total_apps: apps.length, weak_crypto: 0, pqc_ready: 0, active_certs: 0 });
        if (d.cipher_counts?.length)
            setCipherData(d.cipher_counts.map((c, i) => ({
                name: c.name, count: c.count,
                color: [CC.green, CC.blue, CC.cyan, CC.yellow, CC.red][i] || L.textMuted,
            })));
        if (d.ca_counts?.length)
            setCaData(d.ca_counts.map((c, i) => ({
                label: c.label, val: c.val,
                color: [CC.blue, CC.cyan, CC.green, CC.yellow][i] || L.textMuted,
            })));
        if (d.proto_counts?.length)
            setProtoData(d.proto_counts.map((p) => ({
                label: p.label, val: p.val,
                color: p.label.includes("1.3") ? CC.green
                    : p.label.includes("1.2") ? CC.blue
                        : p.label.includes("1.1") ? CC.orange : CC.red,
            })));
        setKeyData(d.key_counts || {});
    };
    // ── Data load ────────────────────────────────────────────────────────────
    const loadData = async (forceRefresh = false) => {
        setLoading(true);
        setFetchError(false);
        if (secureModeOn) {
            // ── SECURE MODE: fetch /ghost/assets only ─────────────────────────
            if (!forceRefresh) {
                const cached = cacheGet(CACHE_KEY_GHOST);
                if (cached) {
                    // Ghost assets don't carry full CBOM stats — build minimal view
                    const apps = (cached?.assets ?? []).map((a) => ({
                        app: a.name, keylen: a.keylen || "—", cipher: a.cipher || "—",
                        tls: a.tls || "—", ca: a.ca || "—",
                        status: a.risk === "weak" ? "weak" : "ok",
                        pqc: false, pqc_support: "none",
                        key_exchange_group: a.key_exchange_group || null,
                        is_wildcard: a.is_wildcard ?? null,
                    }));
                    applyPayload(cached, apps);
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
                const apps = (d?.assets ?? []).map((a) => ({
                    app: a.name, keylen: a.keylen || "—", cipher: a.cipher || "—",
                    tls: a.tls || "—", ca: a.ca || "—",
                    status: a.risk === "weak" ? "weak" : "ok",
                    pqc: false, pqc_support: "none",
                    key_exchange_group: a.key_exchange_group || null,
                    is_wildcard: a.is_wildcard ?? null,
                }));
                applyPayload(d, apps);
                setFromCache(false);
                setCacheAge(null);
            }
            catch {
                setFetchError(true);
            }
        }
        else {
            // ── NORMAL MODE: fetch /cbom + /assets, merge ─────────────────────
            if (!forceRefresh) {
                const cachedCbom = cacheGet(CACHE_KEY_CBOM);
                const cachedAssets = cacheGet(CACHE_KEY_ASSETS);
                if (cachedCbom) {
                    const registeredMap = {};
                    (cachedAssets?.assets ?? []).forEach((a) => { if (a.name)
                        registeredMap[a.name] = a; });
                    const apps = buildMergedApps(cachedCbom, registeredMap, cachedAssets?.assets ?? []);
                    applyPayload(cachedCbom, apps);
                    setFromCache(true);
                    setCacheAge(cacheAgeLabel(CACHE_KEY_CBOM));
                    setLoading(false);
                    return;
                }
            }
            try {
                const [d, assetsData] = await Promise.all([
                    fetch(`${API}/cbom`).then(r => r.json()).catch(() => ({})),
                    fetch(`${API}/assets`).then(r => r.json()).catch(() => ({ assets: [] })),
                ]);
                cacheSet(CACHE_KEY_CBOM, d);
                cacheSet(CACHE_KEY_ASSETS, assetsData);
                const registeredMap = {};
                (assetsData?.assets ?? []).forEach((a) => { if (a.name)
                    registeredMap[a.name] = a; });
                const apps = buildMergedApps(d, registeredMap, assetsData?.assets ?? []);
                applyPayload(d, apps);
                setFromCache(false);
                setCacheAge(null);
            }
            catch {
                setFetchError(true);
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
    // Wait for secure mode before loading
    useEffect(() => {
        if (!secureModeLoading)
            loadData();
    }, [secureModeOn, secureModeLoading]);
    useEffect(() => { if (!loading)
        drawKeyLength(); }, [keyData, bp, loading]);
    useEffect(() => { if (!loading)
        drawCA(); }, [caData, loading]);
    useEffect(() => { if (!loading)
        drawProto(); }, [protoData, loading]);
    // ── Merge helper ─────────────────────────────────────────────────────────
    function buildMergedApps(d, registeredMap, allAssets) {
        const cbomApps = (d.apps ?? []).map((app) => {
            const reg = registeredMap[app.app];
            if (!reg)
                return app;
            return {
                ...app,
                is_wildcard: reg.is_wildcard ?? app.is_wildcard,
                criticality: reg.criticality,
                owner: reg.owner,
                owner_email: reg.owner_email,
                business_unit: reg.business_unit,
                financial_exposure: reg.financial_exposure,
                compliance_scope: reg.compliance_scope,
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
            owner_email: a.owner_email, business_unit: a.business_unit,
            financial_exposure: a.financial_exposure, compliance_scope: a.compliance_scope,
        }));
        return [...cbomApps, ...registeredOnly];
    }
    const analysed = cbomData.map((d) => ({
        ...d,
        analysis: fullAnalysis(d.cipher ?? "", d.tls ?? "", d.key_exchange_group ?? null),
    }));
    const findingCounts = analysed.reduce((acc, a) => {
        a.analysis.findings.forEach((f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; });
        return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });
    const noPFSCount = analysed.filter((a) => !a.analysis.components.pfs).length;
    const brokenCount = analysed.filter((a) => a.analysis.findings.some((f) => f.code.startsWith("BROKEN"))).length;
    function drawKeyLength() {
        const canvas = klRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext("2d");
        const W = canvas.offsetWidth || 280, H = 160;
        canvas.width = W;
        const bars = [
            { label: "4096", val: keyData["4096"] || 0, color: CC.green },
            { label: "3072", val: keyData["3072"] || 0, color: CC.blue },
            { label: "2048", val: keyData["2048"] || 0, color: CC.cyan },
            { label: "1024", val: keyData["1024"] || 0, color: CC.yellow },
            { label: "other", val: keyData["other"] || 0, color: CC.red },
        ];
        const max = Math.max(...bars.map(b => b.val), 1);
        const bw = isMobile ? 22 : 30, gap = isMobile ? 8 : 16;
        const startX = (W - (bars.length * (bw + gap) - gap)) / 2;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, W, H);
        bars.forEach(b => {
            const x = startX + bars.indexOf(b) * (bw + gap);
            const barH = Math.round((b.val / max) * (H - 34));
            const y = H - barH - 22;
            ctx.fillStyle = `${b.color}1a`;
            ctx.fillRect(x, y, bw, barH);
            ctx.fillStyle = `${b.color}88`;
            ctx.fillRect(x, y + 3, bw, barH - 3);
            ctx.fillStyle = b.color;
            ctx.fillRect(x, y, bw, 3);
            ctx.fillStyle = b.color;
            ctx.font = "bold 9px 'Share Tech Mono'";
            ctx.textAlign = "center";
            ctx.fillText(String(b.val), x + bw / 2, y - 4);
            ctx.fillStyle = "#475569";
            ctx.font = "9px 'Share Tech Mono'";
            ctx.fillText(b.label, x + bw / 2, H - 5);
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
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, W, H);
        data.forEach(d => {
            const sweep = 2 * Math.PI * (d.val / total) - 0.04;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, angle, angle + sweep);
            ctx.fillStyle = `${d.color}22`;
            ctx.fill();
            ctx.strokeStyle = d.color;
            ctx.lineWidth = 2;
            ctx.stroke();
            angle += 2 * Math.PI * (d.val / total);
        });
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.fillStyle = "#f8fafc";
        ctx.fill();
        if (legendRef.current) {
            legendRef.current.innerHTML = data.map(d => `
        <div style="display:flex;align-items:center;gap:7px;">
          <div style="width:8px;height:8px;border-radius:2px;background:${d.color};flex-shrink:0;"></div>
          <span style="font-size:9px;color:#1e293b;flex:1;font-weight:500;">${d.label}</span>
          <span style="font-size:9px;font-family:'Orbitron',monospace;color:${d.color};font-weight:700;">${d.val}</span>
        </div>`).join("");
        }
    }
    function drawCA() { drawDonut(caRef.current, caData, caLegendRef); }
    function drawProto() { drawDonut(protoRef.current, protoData, protoLegendRef); }
    function exportCSV() {
        const rows = [
            ["Application", "Key Length", "Cipher Suite", "Key Exchange", "Auth", "Bulk Cipher", "MAC", "PFS", "PQC Hybrid", "TLS Version", "CA", "Overall Risk", "DORA Findings", "PQC Ready", "PQC Impact"],
            ...analysed.map((d) => {
                const c = d.analysis.components;
                const findings = d.analysis.findings
                    .filter((f) => f.severity !== "ok")
                    .map((f) => `[${f.code}] ${f.title}`).join(" | ");
                return [
                    d.app, d.keylen, d.cipher, c.keyExchange, c.authentication,
                    c.bulkCipher, c.mac, c.pfs ? "Yes" : "No", c.pqcHybrid ? "Yes" : "No",
                    normaliseTLS(d.tls), d.ca, d.analysis.overallRisk.toUpperCase(),
                    findings || "Compliant",
                    (d.pqc || c.pqcHybrid) ? "Yes" : "No", d.analysis.pqcImpact,
                ];
            }),
        ];
        const csv = rows.map(r => r.map((v) => `"${v}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const el = document.createElement("a");
        el.href = url;
        el.download = "rebel-cbom-full.csv";
        el.click();
    }
    const maxCipher = Math.max(...(cipherData.length ? cipherData : [{ count: 1 }]).map(c => c.count), 1);
    const metricCols = isMobile ? "1fr 1fr" : isTablet ? "repeat(3,1fr)" : "repeat(5,1fr)";
    const chartCols = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)";
    const activeEndpointLabel = secureModeOn ? "→ /ghost/assets" : "→ /cbom + /assets";
    const panelSt = {
        background: L.panelBg,
        border: `1px solid ${L.accentBorder}`,
        borderRadius: 10,
        boxShadow: "0 1px 4px rgba(14,165,233,0.08), 0 4px 16px rgba(0,0,0,0.04)",
    };
    const phSt = {
        padding: "11px 16px",
        borderBottom: `1px solid ${L.divider}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
    };
    const sLabelSt = {
        fontFamily: "'Orbitron',monospace", fontSize: 10,
        letterSpacing: "0.15em", color: "#1e3a5f", fontWeight: 700,
        display: "flex", alignItems: "center", gap: 8,
    };
    const btnSt = {
        background: L.accent, border: "none", borderRadius: 6,
        color: "#fff", cursor: "pointer", padding: "5px 13px",
        fontFamily: "'Orbitron',monospace", fontSize: 9,
        letterSpacing: "0.12em", fontWeight: 700,
        boxShadow: `0 2px 8px ${L.accent}44`, transition: "all 0.2s",
    };
    return (_jsxs("div", { style: { padding: 20, background: L.pageBg, minHeight: "100vh", fontFamily: "Share Tech Mono", display: "flex", flexDirection: "column", gap: 14 }, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.2); border-radius: 2px; }
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes ping { 75%,100% { transform: scale(2.2); opacity: 0; } }
      ` }), secureModeOn && _jsx(SecureModeBanner, {}), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsx("span", { style: { fontSize: 7, fontFamily: "'Orbitron',monospace", color: L.textFaint, letterSpacing: ".08em" }, children: "API" }), _jsxs("span", { style: { fontSize: 8, fontFamily: "'Share Tech Mono',monospace", color: fetchError ? L.red : L.green, fontWeight: 600 }, children: [fetchError ? "✗" : "✓", " ", API] }), _jsx("span", { style: {
                                    fontSize: 8, fontFamily: "'Share Tech Mono',monospace", fontWeight: 700,
                                    color: secureModeOn ? L.purple : L.cyan,
                                    background: secureModeOn ? `${L.purple}10` : `${L.cyan}10`,
                                    border: `1px solid ${secureModeOn ? L.purple : L.cyan}44`,
                                    borderRadius: 3, padding: "2px 6px", letterSpacing: ".04em",
                                }, children: activeEndpointLabel }), fetchError && _jsx("span", { style: { fontSize: 8, color: L.red }, children: "\u2014 showing cached data" }), loading && _jsx("span", { style: { fontSize: 8, color: L.blue }, children: "fetching\u2026" })] }), fromCache && _jsx(CacheBadge, { age: cacheAge, onRefresh: handleForceRefresh })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: metricCols, gap: isMobile ? 8 : 10 }, children: loading ? (Array.from({ length: 5 }).map((_, i) => _jsx(MetricSkeleton, {}, i))) : ([
                    { label: "TOTAL APPS", value: stats.total_apps || cbomData.length, sub: "Applications", color: L.blue, tint: "rgba(29,78,216,0.05)" },
                    { label: "CRITICAL", value: findingCounts.critical || 0, sub: "DORA findings", color: L.red, tint: "rgba(220,38,38,0.05)" },
                    { label: "NO PFS", value: noPFSCount, sub: "No fwd secrecy", color: L.orange, tint: "rgba(234,88,12,0.05)" },
                    { label: "WEAK CIPHER", value: stats.weak_crypto || brokenCount, sub: "Needs remediation", color: L.yellow, tint: "rgba(202,138,4,0.05)" },
                    { label: "PQC READY", value: stats.pqc_ready || 0, sub: "Post-quantum", color: L.green, tint: "rgba(22,163,74,0.05)" },
                ].map((m, i) => (_jsxs("div", { style: {
                        background: `linear-gradient(135deg,#fff 0%,${m.tint} 100%)`,
                        border: `1px solid ${L.accentBorder}`, borderRadius: 10,
                        padding: isMobile ? "12px 14px" : "14px 16px",
                        boxShadow: "0 1px 4px rgba(14,165,233,0.07)",
                        gridColumn: i === 4 && isMobile ? "1/-1" : undefined,
                    }, children: [_jsx("div", { style: { fontSize: 7.5, color: "#1e3a5f", letterSpacing: "0.14em", fontFamily: "'Orbitron',monospace", fontWeight: 700, marginBottom: 6 }, children: m.label }), _jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: isMobile ? 26 : 32, fontWeight: 700, color: m.color, lineHeight: 1, marginBottom: 4 }, children: m.value }), _jsx("div", { style: { fontSize: 8, color: L.textMuted, fontWeight: 500 }, children: m.sub })] }, i)))) }), _jsxs("div", { style: panelSt, children: [_jsxs("div", { style: phSt, children: [_jsxs("span", { style: sLabelSt, children: [_jsx("div", { style: { width: 3, height: 14, background: L.accent, borderRadius: 2 } }), "DORA ART. 9.4 \u2014 LIVE FINDING SUMMARY"] }), secureModeOn && (_jsx("span", { style: { fontSize: 7, color: L.purple, fontFamily: "'Orbitron',monospace", fontWeight: 700, border: `1px solid ${L.purple}44`, borderRadius: 3, padding: "2px 6px", background: `${L.purple}0a` }, children: "GHOST MODE" }))] }), _jsx("div", { style: { padding: "10px 14px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 8 }, children: loading ? (Array.from({ length: 4 }).map((_, i) => (_jsxs("div", { style: { background: L.pageBg, borderRadius: 8, padding: 10 }, children: [_jsx(Skel, { w: 60, h: 8, style: { marginBottom: 8 } }), _jsx(Skel, { w: 36, h: 20, r: 4, style: { marginBottom: 6 } }), _jsx(Skel, { h: 3, r: 2, style: { marginBottom: 5 } }), _jsx(Skel, { w: 80, h: 7 })] }, i)))) : (["critical", "high", "medium", "low"].map(sev => {
                            const count = findingCounts[sev] || 0;
                            const color = severityColor(sev);
                            const pct = Math.min(100, Math.round(count / Math.max(analysed.length, 1) * 100));
                            return (_jsxs("div", { style: {
                                    background: `${color}08`,
                                    border: `1px solid ${color}22`, borderRadius: 8, padding: 10,
                                }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 }, children: [_jsx("span", { style: { fontSize: 9, color, letterSpacing: ".12em", textTransform: "uppercase", fontFamily: "'Orbitron',monospace", fontWeight: 700 }, children: sev }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 16, color, fontWeight: 700 }, children: count })] }), _jsx("div", { style: { height: 3, background: L.divider, borderRadius: 2 }, children: _jsx("div", { style: { height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" } }) }), _jsxs("div", { style: { fontSize: 7.5, color: L.textMuted, marginTop: 5, fontWeight: 500 }, children: ["findings across ", analysed.length, " apps"] })] }, sev));
                        })) })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: chartCols, gap: isMobile ? 8 : 10 }, children: [_jsxs("div", { style: panelSt, children: [_jsx("div", { style: phSt, children: _jsxs("span", { style: sLabelSt, children: [_jsx("div", { style: { width: 3, height: 14, background: L.accent, borderRadius: 2 } }), "KEY LENGTH DISTRIBUTION"] }) }), _jsx("div", { style: { padding: 14, background: "#f8fafc" }, children: loading ? (_jsx(ChartSkeleton, { height: 160 })) : (_jsxs(_Fragment, { children: [_jsx("canvas", { ref: klRef, style: { width: "100%", height: 160 } }), _jsx("div", { style: { display: "flex", justifyContent: "space-around", marginTop: 8 }, children: [["4096", CC.green], ["3072", CC.blue], ["2048", CC.cyan], ["1024", CC.yellow], ["other", CC.red]].map(([lbl, clr]) => (_jsx("div", { style: { textAlign: "center" }, children: _jsx("div", { style: { fontSize: 9, color: clr, fontFamily: "'Orbitron',monospace", fontWeight: 700 }, children: lbl }) }, lbl))) })] })) })] }), _jsxs("div", { style: panelSt, children: [_jsx("div", { style: phSt, children: _jsxs("span", { style: sLabelSt, children: [_jsx("div", { style: { width: 3, height: 14, background: L.accent, borderRadius: 2 } }), "CIPHER USAGE"] }) }), _jsx("div", { style: { padding: 14, display: "flex", flexDirection: "column", gap: 9 }, children: loading ? (Array.from({ length: 5 }).map((_, i) => (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 5 }, children: [_jsx(Skel, { w: 180, h: 8 }), _jsx(Skel, { w: 20, h: 8 })] }), _jsx(Skel, { h: 4, r: 2 })] }, i)))) : (cipherData.map(c => {
                                    const parsed = parseCipher(c.name);
                                    const riskCol = !parsed.pfs ? L.red
                                        : parsed.bulkCipher.includes("DES") || parsed.bulkCipher === "RC4-128" ? L.red
                                            : parsed.bulkCipher.includes("CBC") ? L.orange : L.green;
                                    return (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 3, gap: 6 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5, minWidth: 0, flex: 1 }, children: [_jsx("span", { style: { width: 6, height: 6, borderRadius: "50%", background: riskCol, flexShrink: 0 } }), _jsx("span", { style: { fontSize: 9, color: L.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }, children: c.name })] }), _jsx("span", { style: { fontSize: 9, fontFamily: "'Orbitron',monospace", color: c.color, flexShrink: 0, fontWeight: 700 }, children: c.count })] }), _jsx(ProgBar, { pct: Math.round(c.count / maxCipher * 100), color: riskCol })] }, c.name));
                                })) })] }), _jsxs("div", { style: { ...panelSt, gridColumn: isTablet ? "1/-1" : undefined }, children: [_jsx("div", { style: phSt, children: _jsxs("span", { style: sLabelSt, children: [_jsx("div", { style: { width: 3, height: 14, background: L.accent, borderRadius: 2 } }), "TOP CERTIFICATE AUTHORITIES"] }) }), _jsx("div", { style: { padding: 14, background: "#f8fafc", display: "flex", gap: isMobile || isTablet ? 16 : 0, flexDirection: isMobile || isTablet ? "row" : "column", alignItems: isMobile || isTablet ? "center" : "stretch" }, children: loading ? (_jsxs("div", { style: { display: "flex", gap: 16, alignItems: "center", width: "100%" }, children: [_jsx(Skel, { w: 110, h: 110, r: 55, style: { flexShrink: 0 } }), _jsx("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 8 }, children: Array.from({ length: 4 }).map((_, i) => _jsx(Skel, { h: 9 }, i)) })] })) : (_jsxs(_Fragment, { children: [_jsx("canvas", { ref: caRef, width: 160, height: 160, style: { display: "block", margin: isMobile || isTablet ? "0" : "0 auto 10px", flexShrink: 0, width: isMobile || isTablet ? 110 : 160, height: isMobile || isTablet ? 110 : 160 } }), _jsx("div", { ref: caLegendRef, style: { display: "flex", flexDirection: "column", gap: 6, flex: 1 } })] })) })] })] }), _jsxs("div", { style: panelSt, children: [_jsxs("div", { style: phSt, children: [_jsxs("span", { style: sLabelSt, children: [_jsx("div", { style: { width: 3, height: 14, background: L.accent, borderRadius: 2 } }), "APPLICATION CRYPTOGRAPHIC INVENTORY", secureModeOn && (_jsx("span", { style: { fontSize: 7, color: L.purple, fontFamily: "'Orbitron',monospace", fontWeight: 700, border: `1px solid ${L.purple}44`, borderRadius: 3, padding: "2px 6px", background: `${L.purple}0a`, marginLeft: 4 }, children: "\uD83D\uDD12 GHOST" }))] }), _jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [fromCache && !isMobile && _jsx(CacheBadge, { age: cacheAge, onRefresh: handleForceRefresh }), _jsx("button", { style: btnSt, onClick: exportCSV, disabled: loading, children: isMobile ? "↓ CSV" : "↓ EXPORT FULL CSV" })] })] }), !isDesktop && (_jsx("div", { style: { maxHeight: isMobile ? 420 : 560, overflowY: "auto" }, children: loading
                            ? Array.from({ length: 6 }).map((_, i) => _jsx(CardSkeleton, {}, i))
                            : analysed.map((d, i) => _jsx(AppCard, { d: d, compact: isMobile }, i)) })), isDesktop && (_jsxs(_Fragment, { children: [_jsx("div", { style: { display: "grid", gridTemplateColumns: "1.8fr 0.7fr 1.1fr 1.1fr 0.5fr 0.7fr 0.9fr 0.8fr 0.9fr 90px", padding: "7px 14px", borderBottom: `1px solid ${L.divider}`, background: L.pageBg }, children: ["APPLICATION", "KEY LEN", "KEY EXCHANGE", "BULK CIPHER", "PFS", "TLS VER", "CA", "OVERALL RISK", "PQC", ""].map(h => (_jsx("span", { style: { fontSize: 7.5, color: "#1e3a5f", letterSpacing: "0.14em", fontFamily: "'Orbitron',monospace", fontWeight: 700 }, children: h }, h))) }), _jsx("div", { style: { maxHeight: 480, overflowY: "auto" }, children: loading ? (Array.from({ length: 8 }).map((_, i) => (_jsx("div", { style: { display: "grid", gridTemplateColumns: "1.8fr 0.7fr 1.1fr 1.1fr 0.5fr 0.7fr 0.9fr 0.8fr 0.9fr 90px", padding: "10px 14px", borderBottom: `1px solid ${L.divider}`, alignItems: "center", gap: 8 }, children: [120, 50, 90, 90, 30, 50, 70, 60, 60, 60].map((w, j) => _jsx(Skel, { w: w, h: 9 }, j)) }, i)))) : (analysed.map((d, i) => {
                                    const c = d.analysis.components;
                                    const risk = d.analysis.overallRisk;
                                    const isOpen = expandedRow === i;
                                    const tlsNorm = normaliseTLS(d.tls);
                                    const pqcScore = pqcReadinessScore(c, d.tls, d.keylen, d.is_wildcard ?? false);
                                    const keyCol = d.keylen?.startsWith("1024") ? L.red : d.keylen?.startsWith("2048") ? L.yellow : L.green;
                                    const bulkCol = c.bulkCipher.includes("DES") || c.bulkCipher === "RC4-128" ? L.red
                                        : c.bulkCipher.includes("CBC") ? L.orange : L.green;
                                    return (_jsxs(React.Fragment, { children: [_jsxs("div", { style: { display: "grid", gridTemplateColumns: "1.8fr 0.7fr 1.1fr 1.1fr 0.5fr 0.7fr 0.9fr 0.8fr 0.9fr 90px", padding: "9px 14px", borderBottom: `1px solid ${L.divider}`, alignItems: "center", background: isOpen ? L.accentDim : "transparent", transition: "background 0.12s", cursor: "pointer" }, onMouseEnter: e => { if (!isOpen)
                                                    e.currentTarget.style.background = L.accentDim; }, onMouseLeave: e => { if (!isOpen)
                                                    e.currentTarget.style.background = "transparent"; }, children: [_jsx("div", { style: { fontSize: 10, color: L.blue, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: d.app }), _jsx("div", { style: { fontSize: 10, color: keyCol, fontWeight: 700 }, children: d.keylen }), _jsxs("div", { style: { fontSize: 9, color: c.pfs ? L.cyan : L.red, fontFamily: "'Share Tech Mono',monospace", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [c.keyExchange, c.kxSource === "backend" && _jsx("span", { style: { fontSize: 7, color: L.textMuted, marginLeft: 4 }, children: "\u2022" })] }), _jsx("div", { style: { fontSize: 9, color: bulkCol, fontFamily: "'Share Tech Mono',monospace", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: c.bulkCipher }), _jsx("div", { style: { textAlign: "center", fontSize: 13, fontWeight: 700 }, children: c.pfs ? _jsx("span", { style: { color: L.green }, children: "\u2713" }) : _jsx("span", { style: { color: L.red }, children: "\u2717" }) }), _jsx("div", { children: _jsxs(Badge, { v: tlsNorm === "1.0" ? "red" : tlsNorm === "1.1" ? "orange" : tlsNorm === "1.2" ? "yellow" : "green", children: ["TLS ", tlsNorm] }) }), _jsx("div", { style: { fontSize: 9, color: L.textDim, fontWeight: 500 }, children: d.ca }), _jsx("div", { children: _jsx(Badge, { v: severityVariant(risk), children: risk.toUpperCase() }) }), _jsx("div", { style: { textAlign: "center" }, children: _jsx(PQCScoreBadge, { score: pqcScore }) }), _jsx("div", { children: _jsx("button", { onClick: () => setExpandedRow(isOpen ? null : i), style: { background: L.accentDim, border: `1px solid ${L.accentBorder}`, borderRadius: 6, color: L.accentDark, cursor: "pointer", padding: "3px 9px", fontFamily: "'Orbitron',monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", transition: "all 0.15s" }, children: isOpen ? "▲" : "▼ details" }) })] }), isOpen && (_jsxs("div", { style: { padding: "0 14px 14px", background: "#fafbfc", borderBottom: `1px solid ${L.divider}` }, children: [_jsx(PQCScoreDetail, { score: pqcScore }), _jsx(CipherBreakdown, { analysis: d.analysis, compact: false })] }))] }, i));
                                })) })] })), _jsxs("div", { style: { padding: "8px 14px", borderTop: `1px solid ${L.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }, children: [loading ? (_jsx(Skel, { w: 220, h: 9 })) : (_jsxs("span", { style: { fontSize: 10, color: L.textDim, fontWeight: 500 }, children: [_jsx("b", { style: { color: L.textSec }, children: analysed.length }), " apps \u00B7", _jsxs("b", { style: { color: L.red }, children: [" ", findingCounts.critical] }), " critical \u00B7", _jsxs("b", { style: { color: L.orange }, children: [" ", findingCounts.high] }), " high \u00B7", _jsxs("b", { style: { color: L.red }, children: [" ", noPFSCount] }), " without PFS", secureModeOn && (_jsx("span", { style: { marginLeft: 8, fontSize: 8, color: L.purple, fontWeight: 600 }, children: "\u00B7 ghost mode" }))] })), !isMobile && (_jsx("span", { style: { fontSize: 9, color: L.textMuted }, children: isDesktop ? "Click ▼ details to expand" : "Tap row to expand" }))] })] }), _jsxs("div", { style: panelSt, children: [_jsx("div", { style: phSt, children: _jsxs("span", { style: sLabelSt, children: [_jsx("div", { style: { width: 3, height: 14, background: L.accent, borderRadius: 2 } }), "ENCRYPTION PROTOCOLS"] }) }), _jsx("div", { style: { padding: 14, background: "#f8fafc", display: "flex", gap: 16, alignItems: "center", flexDirection: isMobile ? "column" : "row" }, children: loading ? (_jsxs(_Fragment, { children: [_jsx(Skel, { w: 140, h: 140, r: 70, style: { flexShrink: 0 } }), _jsx("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 10, width: isMobile ? "100%" : "auto" }, children: Array.from({ length: 4 }).map((_, i) => _jsx(Skel, { h: 9 }, i)) })] })) : (_jsxs(_Fragment, { children: [_jsx("canvas", { ref: protoRef, width: 140, height: 140, style: { width: isMobile ? "100%" : 140, height: 140, maxWidth: 200 } }), _jsx("div", { ref: protoLegendRef, style: { display: "flex", flexDirection: "column", gap: 9, flex: 1, width: isMobile ? "100%" : "auto" } })] })) })] })] }));
}
