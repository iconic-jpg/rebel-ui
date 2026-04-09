import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * KeyRotationPanel.tsx
 * REBEL — Key Rotation proof-of-rotation audit panel
 * + Asset domain filter  + full mobile responsiveness
 * PDF export via exportKRPDF.ts (download, not new tab)
 */
import { useState, useEffect, useCallback } from "react";
import { exportKRPDF } from "./exportKRPDF.js";
// ── Breakpoint hook ───────────────────────────────────────────────────────────
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
        const h = () => setBp(get);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return bp;
}
// ── Theme ─────────────────────────────────────────────────────────────────────
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
    panel: {
        background: L.panelBg,
        border: `1px solid ${L.panelBorder}`,
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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
        fontFamily: "inherit",
    },
    input: {
        background: L.insetBg,
        border: `1px solid ${L.border}`,
        borderRadius: 5,
        color: L.text1,
        padding: "7px 10px",
        fontSize: 12,
        outline: "none",
        fontFamily: "inherit",
        width: "100%",
    },
};
// ── Cache config ──────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_KEY_KR = "rebel_cache_kr_scan";
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
// ── Domain filter helpers ─────────────────────────────────────────────────────
function normaliseDomain(raw) {
    return raw.trim().toLowerCase()
        .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}
function keyMatchesDomain(keyId, domain) {
    if (!domain)
        return true;
    const k = keyId.toLowerCase();
    const d = normaliseDomain(domain);
    return k.includes(d) || d.split(".").some(part => part.length > 2 && k.includes(part));
}
// ── Status maps ───────────────────────────────────────────────────────────────
const STATUS_COLOR = {
    COMPLIANT: L.green,
    OVERDUE: L.orange,
    CRITICAL: L.red,
    NEVER_ROTATED: L.red,
    UNKNOWN: L.text3,
};
const STATUS_BG = {
    COMPLIANT: "#f0fdf4",
    OVERDUE: "#fff7ed",
    CRITICAL: "#fef2f2",
    NEVER_ROTATED: "#fef2f2",
    UNKNOWN: L.subtleBg,
};
const STATUS_LABEL = {
    COMPLIANT: "Compliant",
    OVERDUE: "Overdue",
    CRITICAL: "Critical",
    NEVER_ROTATED: "Never rotated",
    UNKNOWN: "Unknown",
};
function toKRAssets(assets) {
    return (assets || []).map((a) => ({
        asset_id: a.id ?? a.name ?? "unknown",
        key_type: a.type === "HSM" ? "HSM"
            : a.type === "Database" ? "DATABASE"
                : a.cipher?.includes("TLS") ? "TLS_CERT"
                    : "APP_CONFIG",
        key_identifier: a.name ?? a.id ?? "unknown",
        last_rotated_at: a.last_rotated_at ?? null,
        rotation_source: a.rotation_source ?? (a.last_rotated_at ? "CERT_META" : "NONE"),
        evidence_path: a.evidence_path ?? "N/A",
    }));
}
// ── Shared small components ───────────────────────────────────────────────────
function Shimmer({ w = "100%", h = 16, radius = 4, style = {} }) {
    return (_jsx("div", { style: {
            width: w, height: h, borderRadius: radius, flexShrink: 0,
            background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s ease infinite",
            ...style,
        } }));
}
function LPanelHeader({ left, right }) {
    return (_jsxs("div", { style: {
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`,
            background: L.subtleBg, borderRadius: "8px 8px 0 0",
            flexWrap: "wrap", gap: 8,
        }, children: [_jsx("span", { style: { fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" }, children: left }), right] }));
}
function StatusBadge({ status }) {
    const color = STATUS_COLOR[status] ?? L.text3;
    const bg = STATUS_BG[status] ?? L.subtleBg;
    const label = STATUS_LABEL[status] ?? status;
    return (_jsx("span", { style: {
            fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em",
            padding: "2px 6px", border: `1px solid ${color}44`, borderRadius: 3,
            color, background: bg, display: "inline-block",
        }, children: label }));
}
function RegBadge({ text }) {
    return (_jsx("span", { style: {
            fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em",
            padding: "2px 5px", border: `1px solid ${L.red}44`, borderRadius: 3,
            color: L.red, background: "#fef2f2", display: "inline-block",
        }, children: text }));
}
function CacheBadge({ age, onRefresh }) {
    if (!age)
        return null;
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsxs("span", { style: {
                    fontSize: 8, fontWeight: 600, color: L.text3, background: L.insetBg,
                    border: `1px solid ${L.border}`, borderRadius: 3, padding: "2px 7px", letterSpacing: ".06em",
                }, children: ["CACHED \u00B7 ", age] }), _jsx("button", { onClick: onRefresh, style: { ...LS.btn, fontSize: 9, padding: "3px 8px", color: L.blue, borderColor: `${L.blue}40`, background: `${L.blue}0d` }, children: "\u21BA REFRESH" })] }));
}
// ── Skeletons ─────────────────────────────────────────────────────────────────
function SkeletonSummaryStrip({ cols }) {
    return (_jsx("div", { style: { display: "flex", borderBottom: `1px solid ${L.border}`, overflowX: "auto" }, children: Array.from({ length: cols }).map((_, i) => (_jsxs("div", { style: {
                flex: 1, minWidth: 60, padding: "10px 12px",
                borderRight: i < cols - 1 ? `1px solid ${L.border}` : "none",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            }, children: [_jsx(Shimmer, { w: 40, h: 7 }), _jsx(Shimmer, { w: 28, h: 20 })] }, i))) }));
}
function SkeletonTableRows({ count = 5, cols = 7 }) {
    const widths = [130, 70, 40, 80, 60, 80, 110];
    return (_jsx(_Fragment, { children: Array.from({ length: count }).map((_, i) => (_jsx("tr", { style: { borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }, children: Array.from({ length: cols }).map((_, j) => (_jsx("td", { style: { padding: "8px" }, children: _jsx(Shimmer, { w: widths[j] ?? 60, h: j === 4 || j === 5 ? 18 : 9, radius: j === 4 || j === 5 ? 3 : 4 }) }, j))) }, i))) }));
}
// ── Status filter pill ────────────────────────────────────────────────────────
function FilterPill({ label, active, color, bg, count, onClick, }) {
    return (_jsxs("button", { onClick: onClick, style: {
            display: "flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: 20, cursor: "pointer",
            border: `1px solid ${active ? color : L.border}`,
            background: active ? bg : L.panelBg,
            fontSize: 9, fontWeight: 700, color: active ? color : L.text3,
            letterSpacing: ".07em", textTransform: "uppercase",
            transition: "all 0.15s",
        }, children: [label, _jsx("span", { style: {
                    fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 800,
                    background: active ? color : L.insetBg, color: active ? "#fff" : L.text3,
                    borderRadius: 10, padding: "0 5px", minWidth: 18, textAlign: "center",
                }, children: count })] }));
}
export default function KeyRotationPanel({ assets, apiBase = "", clientName = "", style = {}, }) {
    const bp = useBreakpoint();
    const isMobile = bp === "mobile";
    const isTablet = bp === "tablet";
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [tableOpen, setTableOpen] = useState(true);
    const [fromCache, setFromCache] = useState(false);
    const [cachedAt, setCachedAt] = useState(null);
    const [secureModeOn, setSecureModeOn] = useState(false);
    const [secureModeLoading, setSecureModeLoading] = useState(true);
    const [pdfExporting, setPdfExporting] = useState(false);
    // ── Filter state ──────────────────────────────────────────────────────────
    const [domainInput, setDomainInput] = useState("");
    const [activeDomain, setActiveDomain] = useState("");
    const [activeClientName, setActiveClientName] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [sourceFilter, setSourceFilter] = useState("ALL");
    // ── Secure mode status ────────────────────────────────────────────────────
    useEffect(() => {
        fetch(`${apiBase}/secure-mode/status`)
            .then(r => r.ok ? r.json() : null)
            .then((d) => {
            if (d?.enabled !== undefined)
                setSecureModeOn(Boolean(d.enabled));
        })
            .catch(() => { })
            .finally(() => setSecureModeLoading(false));
    }, [apiBase]);
    // ── Fetch with cache ──────────────────────────────────────────────────────
    const loadKR = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError(false);
        if (!forceRefresh) {
            const cached = cacheGet(CACHE_KEY_KR);
            if (cached) {
                setResult(cached);
                setFromCache(true);
                setCachedAt(cacheAgeLabel(CACHE_KEY_KR));
                setLoading(false);
                return;
            }
        }
        const sourceAssets = secureModeOn
            ? await fetch(`${apiBase}/ghost/assets`)
                .then(r => r.ok ? r.json() : null)
                .then(d => Array.isArray(d?.assets) ? d.assets : [])
                .catch(() => [])
            : (Array.isArray(assets) ? assets : []);
        try {
            const res = await fetch(`${apiBase}/api/key-rotation/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target: "rebel-scan", assets: toKRAssets(sourceAssets) }),
            });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            data.records = Array.isArray(data.records) ? data.records : [];
            data.summary = data.summary ?? {
                total_keys: 0, compliant: 0, overdue: 0, critical: 0,
                never_rotated: 0, unknown: 0, overall_risk: "LOW", frameworks_breached: [],
            };
            data.summary.frameworks_breached = Array.isArray(data.summary.frameworks_breached)
                ? data.summary.frameworks_breached : [];
            cacheSet(CACHE_KEY_KR, data);
            setResult(data);
            setFromCache(false);
            setCachedAt(null);
        }
        catch {
            setError(true);
        }
        finally {
            setLoading(false);
        }
    }, [secureModeOn, apiBase, assets]);
    useEffect(() => {
        if (!secureModeLoading)
            loadKR();
    }, [secureModeOn, secureModeLoading]);
    function handleRefresh() {
        localStorage.removeItem(CACHE_KEY_KR);
        setFromCache(false);
        setCachedAt(null);
        loadKR(true);
    }
    function applyDomainFilter() {
        setActiveDomain(domainInput.trim());
        setStatusFilter("ALL");
        setSourceFilter("ALL");
    }
    function clearFilter() {
        setDomainInput("");
        setActiveDomain("");
        setActiveClientName("");
        setStatusFilter("ALL");
        setSourceFilter("ALL");
    }
    // ── PDF export ────────────────────────────────────────────────────────────
    // ── Derived + filtered records ────────────────────────────────────────────
    const s = result?.summary;
    const critCount = (s?.critical ?? 0) + (s?.never_rotated ?? 0);
    const riskColor = s?.overall_risk === "CRITICAL" ? L.red
        : s?.overall_risk === "HIGH" ? L.orange
            : s?.overall_risk === "MEDIUM" ? L.yellow
                : L.green;
    const allRecords = result?.records ?? [];
    // Domain filter
    const domainFiltered = activeDomain
        ? allRecords.filter(r => keyMatchesDomain(r.key_identifier, activeDomain))
        : allRecords;
    // Status filter
    const statusFiltered = statusFilter === "ALL"
        ? domainFiltered
        : domainFiltered.filter(r => r.status === statusFilter);
    // Source filter
    const uniqueSources = ["ALL", ...Array.from(new Set(allRecords.map(r => r.rotation_source)))];
    const filteredRecords = sourceFilter === "ALL"
        ? statusFiltered
        : statusFiltered.filter(r => r.rotation_source === sourceFilter);
    // ── PDF export — passes filtered slice + recomputed summary ──────────────
    // overall_risk is re-derived inside exportKRPDF from the recomputed counts,
    // so the gauge and audit opinion always reflect what the user sees on screen.
    function handleExportPDF() {
        if (!result || pdfExporting)
            return;
        setPdfExporting(true);
        try {
            const filteredResult = {
                ...result,
                records: filteredRecords,
                summary: {
                    ...result.summary,
                    total_keys: filteredRecords.length,
                    compliant: filteredRecords.filter(r => r.status === "COMPLIANT").length,
                    overdue: filteredRecords.filter(r => r.status === "OVERDUE").length,
                    critical: filteredRecords.filter(r => r.status === "CRITICAL").length,
                    never_rotated: filteredRecords.filter(r => r.status === "NEVER_ROTATED").length,
                    unknown: filteredRecords.filter(r => r.status === "UNKNOWN").length,
                    frameworks_breached: Array.from(new Set(filteredRecords.flatMap(r => r.regulatory_flags))).filter(Boolean),
                },
            };
            exportKRPDF(filteredResult, {
                clientName: activeClientName || clientName || "",
                clientDomain: activeDomain || result.target || "",
                activeFilter: activeDomain || undefined,
                activeStatus: statusFilter !== "ALL" ? statusFilter : undefined,
                activeSource: sourceFilter !== "ALL" ? sourceFilter : undefined,
            });
        }
        finally {
            setTimeout(() => setPdfExporting(false), 1200);
        }
    }
    // Counts for filter pills (against domain-filtered only, not status-filtered)
    const statusCounts = {
        ALL: domainFiltered.length,
        COMPLIANT: domainFiltered.filter(r => r.status === "COMPLIANT").length,
        OVERDUE: domainFiltered.filter(r => r.status === "OVERDUE").length,
        CRITICAL: domainFiltered.filter(r => r.status === "CRITICAL" || r.status === "NEVER_ROTATED").length,
        NEVER_ROTATED: domainFiltered.filter(r => r.status === "NEVER_ROTATED").length,
        UNKNOWN: domainFiltered.filter(r => r.status === "UNKNOWN").length,
    };
    const activeEndpointLabel = secureModeOn ? "→ /ghost/assets" : "→ /api/key-rotation/scan";
    // ── PDF button style ──────────────────────────────────────────────────────
    const pdfBtnStyle = (compact = false) => ({
        ...LS.btn,
        fontSize: compact ? 9 : 10,
        padding: compact ? "3px 9px" : "5px 12px",
        color: !result ? L.text4 : L.blue,
        borderColor: !result ? L.border : `${L.blue}40`,
        background: !result ? L.subtleBg : `${L.blue}0d`,
        fontWeight: 700,
        opacity: !result ? 0.45 : 1,
        cursor: !result ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 4,
        transition: "opacity 0.15s, background 0.15s",
    });
    // ── Risk distribution denominator uses domain-filtered ────────────────────
    const distTotal = domainFiltered.length || 1;
    const distCrit = domainFiltered.filter(r => r.status === "CRITICAL" || r.status === "NEVER_ROTATED").length;
    const distOver = domainFiltered.filter(r => r.status === "OVERDUE").length;
    const distComp = domainFiltered.filter(r => r.status === "COMPLIANT").length;
    const distUnk = domainFiltered.filter(r => r.status === "UNKNOWN").length;
    // ── Responsive column counts ──────────────────────────────────────────────
    const distCols = isMobile ? "1fr 1fr" : "repeat(4,1fr)";
    const summaryItems = [
        ["Total", domainFiltered.length, L.blue],
        ["Compliant", distComp, L.green],
        ["Overdue", distOver, L.orange],
        ["Critical", distCrit, L.red],
        ["Unknown", distUnk, L.text3],
    ];
    return (_jsxs("div", { style: {
            background: L.pageBg, minHeight: "100vh", padding: isMobile ? "12px 10px" : "20px 16px",
            display: "flex", flexDirection: "column", gap: isMobile ? 8 : 12,
            fontFamily: "'DM Sans', system-ui, sans-serif", color: L.text1,
            ...style,
        }, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin     { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar       { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:${L.insetBg}; }
        ::-webkit-scrollbar-thumb { background:${L.border}; border-radius:3px; }
        input:focus { border-color: ${L.blue} !important; box-shadow: 0 0 0 2px ${L.blue}20; }
      ` }), secureModeOn && (_jsxs("div", { style: {
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                    background: `${L.purple}0d`, border: `1px solid ${L.purple}44`, borderRadius: 6,
                    flexWrap: "wrap",
                }, children: [_jsx("span", { style: { fontSize: 9, color: L.purple, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }, children: "\uD83D\uDD12 SECURE MODE ACTIVE" }), _jsx("span", { style: { fontSize: 9, color: L.purple, opacity: 0.75 }, children: "\u00B7" }), _jsx("span", { style: { fontSize: 9, color: L.purple, fontFamily: "'DM Mono', monospace" }, children: "/ghost/assets \u2014 anonymised data" })] })), _jsxs("div", { style: { ...LS.panel }, children: [_jsx(LPanelHeader, { left: "SCOPE \u2014 KEY FILTER", right: fromCache ? _jsx(CacheBadge, { age: cachedAt, onRefresh: handleRefresh }) : undefined }), _jsxs("div", { style: { padding: 14, display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("div", { style: {
                                    display: "grid",
                                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                                    gap: 10,
                                }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 8, color: L.text3, letterSpacing: ".12em", marginBottom: 5, textTransform: "uppercase", fontWeight: 600 }, children: "KEY SCOPE / DOMAIN" }), _jsxs("div", { style: { display: "flex", gap: 6 }, children: [_jsx("input", { value: domainInput, onChange: e => setDomainInput(e.target.value), onKeyDown: e => e.key === "Enter" && applyDomainFilter(), placeholder: "e.g. payments.acmebank.com", style: { ...LS.input, flex: 1 } }), _jsx("button", { onClick: applyDomainFilter, style: { ...LS.btn, background: `${L.blue}15`, borderColor: `${L.blue}40`, color: L.blue, whiteSpace: "nowrap" }, children: "APPLY" }), activeDomain && (_jsx("button", { onClick: clearFilter, style: { ...LS.btn, whiteSpace: "nowrap" }, children: "CLEAR" }))] })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 8, color: L.text3, letterSpacing: ".12em", marginBottom: 5, textTransform: "uppercase", fontWeight: 600 }, children: "CLIENT NAME (PDF HEADER)" }), _jsx("input", { value: activeClientName, onChange: e => setActiveClientName(e.target.value), placeholder: "e.g. Acme Bank PLC", style: { ...LS.input } })] })] }), activeDomain && (_jsxs("div", { style: {
                                    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                                    background: `${L.blue}0a`, border: `1px solid ${L.blue}25`,
                                    borderRadius: 5, padding: "7px 12px",
                                }, children: [_jsx("span", { style: { fontSize: 9, color: L.text3, fontWeight: 600 }, children: "ACTIVE SCOPE" }), _jsxs("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: 10, color: L.blue, fontWeight: 600 }, children: ["*", normaliseDomain(activeDomain) ? `.${normaliseDomain(activeDomain)}` : ""] }), _jsxs("span", { style: { fontSize: 9, color: L.text3, marginLeft: "auto" }, children: [_jsx("b", { style: { color: L.text1 }, children: domainFiltered.length }), " of ", allRecords.length, " keys matched"] })] })), activeDomain && domainFiltered.length === 0 && !loading && (_jsxs("div", { style: {
                                    background: `${L.red}0a`, border: `1px solid ${L.red}25`, borderRadius: 5,
                                    padding: "8px 12px", fontSize: 10, color: L.text2,
                                }, children: ["\u26A0 No keys matched ", _jsxs("b", { style: { color: L.red }, children: ["*.", normaliseDomain(activeDomain)] }), " \u2014 try a shorter term or check the key identifier format."] })), !loading && result && (_jsxs("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }, children: [_jsx("span", { style: { fontSize: 8, color: L.text4, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", marginRight: 2 }, children: "STATUS" }), ["ALL", "COMPLIANT", "OVERDUE", "CRITICAL", "UNKNOWN"].map(st => {
                                        const color = st === "ALL" ? L.blue : STATUS_COLOR[st] ?? L.text3;
                                        const bg = st === "ALL" ? "#eff6ff" : STATUS_BG[st] ?? L.subtleBg;
                                        const count = st === "CRITICAL"
                                            ? statusCounts["CRITICAL"]
                                            : statusCounts[st] ?? 0;
                                        return (_jsx(FilterPill, { label: st === "ALL" ? "All" : STATUS_LABEL[st] ?? st, active: statusFilter === st, color: color, bg: bg, count: count, onClick: () => setStatusFilter(prev => prev === st ? "ALL" : st) }, st));
                                    }), uniqueSources.length > 2 && (_jsxs(_Fragment, { children: [_jsx("span", { style: { fontSize: 8, color: L.text4, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", marginLeft: 8, marginRight: 2 }, children: "SOURCE" }), _jsx("select", { value: sourceFilter, onChange: e => setSourceFilter(e.target.value), style: {
                                                    ...LS.input,
                                                    width: "auto", padding: "3px 8px", fontSize: 9,
                                                    fontWeight: 600, color: sourceFilter !== "ALL" ? L.blue : L.text2,
                                                    borderColor: sourceFilter !== "ALL" ? `${L.blue}50` : L.border,
                                                    cursor: "pointer",
                                                }, children: uniqueSources.map(src => (_jsx("option", { value: src, children: src }, src))) })] })), (statusFilter !== "ALL" || sourceFilter !== "ALL") && (_jsx("button", { onClick: () => { setStatusFilter("ALL"); setSourceFilter("ALL"); }, style: { ...LS.btn, fontSize: 9, padding: "2px 8px", color: L.text3 }, children: "\u2715 Clear filters" }))] })), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsx("span", { style: { fontSize: 7, fontFamily: "'DM Mono',monospace", color: L.text4, letterSpacing: ".08em" }, children: "API" }), _jsxs("span", { style: { fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                                            color: error ? L.red : L.green }, children: [error ? "✗" : "✓", " ", apiBase || "(relative)"] }), _jsx("span", { style: {
                                            fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                                            color: secureModeOn ? L.purple : L.cyan,
                                            background: secureModeOn ? `${L.purple}10` : `${L.cyan}10`,
                                            border: `1px solid ${secureModeOn ? L.purple : L.cyan}44`,
                                            borderRadius: 3, padding: "2px 6px", letterSpacing: ".04em",
                                        }, children: activeEndpointLabel }), error && _jsx("span", { style: { fontSize: 8, color: L.red }, children: "\u2014 check key_rotation_verifier.py" }), loading && _jsx("span", { style: { fontSize: 8, color: L.blue }, children: "scanning\u2026" })] })] })] }), _jsxs("div", { style: { ...LS.panel }, children: [_jsx(LPanelHeader, { left: "KEY ROTATION \u2014 PROOF-OF-ROTATION AUDIT", right: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [s && (_jsx("span", { style: {
                                        fontSize: 8, fontWeight: 700, color: riskColor,
                                        background: `${riskColor}14`, border: `1px solid ${riskColor}44`,
                                        borderRadius: 3, padding: "2px 7px",
                                    }, children: s.overall_risk })), _jsx("button", { onClick: handleRefresh, disabled: loading, style: { ...LS.btn, fontSize: 9, color: L.blue, borderColor: `${L.blue}40`, background: `${L.blue}0d` }, children: loading ? "Scanning…" : "⟳ Run KR Scan" }), _jsx("button", { onClick: handleExportPDF, disabled: !result || pdfExporting, title: "Downloads audit HTML \u2014 open in browser \u2192 Save as PDF", style: pdfBtnStyle(true), children: pdfExporting
                                        ? _jsxs(_Fragment, { children: [_jsx("span", { style: { display: "inline-block", animation: "spin 0.7s linear infinite" }, children: "\u27F3" }), !isMobile && " Exporting…"] })
                                        : _jsx(_Fragment, { children: isMobile ? "⬇ PDF" : "⬇ AUDIT PDF" }) })] }) }), loading
                        ? _jsx(SkeletonSummaryStrip, { cols: isMobile ? 3 : 5 })
                        : s && (_jsx("div", { style: { display: "flex", borderBottom: `1px solid ${L.border}`, overflowX: "auto" }, children: (isMobile
                                ? summaryItems.slice(0, 3) // Total / Compliant / Critical on mobile
                                : summaryItems).map(([label, val, color], i, arr) => (_jsxs("div", { style: {
                                    flex: 1, minWidth: 60, padding: isMobile ? "8px 8px" : "10px 12px",
                                    borderRight: i < arr.length - 1 ? `1px solid ${L.border}` : "none",
                                    textAlign: "center",
                                }, children: [_jsx("div", { style: { fontSize: isMobile ? 6 : 7, color: L.text3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }, children: label }), _jsx("div", { style: { fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 16 : 18, fontWeight: 800, color, lineHeight: 1 }, children: val })] }, label))) })), !loading && (s?.frameworks_breached ?? []).length > 0 && (_jsxs("div", { style: {
                            padding: "7px 14px", borderBottom: `1px solid ${L.border}`,
                            background: `${L.red}08`, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
                        }, children: [_jsx("span", { style: { fontSize: 7.5, fontWeight: 700, color: L.red }, children: "Frameworks breached:" }), s.frameworks_breached.map((f) => _jsx(RegBadge, { text: f }, f))] })), error && (_jsxs("div", { style: { padding: "10px 14px", fontSize: 9, color: L.red, background: "#fef2f2" }, children: ["\u2717 Failed to reach ", _jsx("code", { children: "/api/key-rotation/scan" }), " \u2014 ensure ", _jsx("code", { children: "key_rotation_verifier.py" }), " is registered."] })), !result && !loading && !error && (_jsxs("div", { style: { padding: "24px 14px", textAlign: "center", fontSize: 10, color: L.text3 }, children: ["Click ", _jsx("strong", { style: { color: L.blue }, children: "\u27F3 Run KR Scan" }), " to audit key rotation across all assets.", _jsx("br", {}), _jsx("span", { style: { fontSize: 8, marginTop: 4, display: "block" }, children: "Cryptographic attestation \u2014 no spreadsheets." })] }))] }), (loading || result) && (_jsxs("div", { style: { ...LS.panel }, children: [_jsx(LPanelHeader, { left: activeDomain ? `RISK DISTRIBUTION — ${normaliseDomain(activeDomain)}` : "RISK DISTRIBUTION" }), _jsx("div", { style: { padding: 14, display: "grid", gridTemplateColumns: distCols, gap: 10 }, children: loading
                            ? Array.from({ length: isMobile ? 2 : 4 }).map((_, i) => (_jsxs("div", { style: { borderRadius: 6, padding: 12, border: `1px solid ${L.border}`, background: L.subtleBg }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 }, children: [_jsx(Shimmer, { w: 55, h: 9 }), _jsx(Shimmer, { w: 24, h: 20 })] }), _jsx(Shimmer, { w: "100%", h: 4, radius: 2, style: { marginBottom: 8 } }), _jsx(Shimmer, { w: 60, h: 8 })] }, i)))
                            : [
                                ["COMPLIANT", distComp, L.green, "#f0fdf4", `${L.green}22`],
                                ["OVERDUE", distOver, L.orange, "#fff7ed", `${L.orange}25`],
                                ["CRITICAL", distCrit, L.red, "#fef2f2", `${L.red}25`],
                                ["UNKNOWN", distUnk, L.text3, L.subtleBg, L.border],
                            ].map(([label, count, color, bg, borderColor]) => {
                                const pct = Math.round(count / distTotal * 100);
                                return (_jsxs("div", { style: { background: bg, border: `1px solid ${borderColor}`, borderRadius: 6, padding: isMobile ? 10 : 12 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 }, children: [_jsx("span", { style: { fontSize: isMobile ? 8 : 9, color, letterSpacing: ".12em", fontWeight: 700, textTransform: "uppercase" }, children: label }), _jsx("span", { style: { fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 14 : 16, color, fontWeight: 800 }, children: count })] }), _jsx("div", { style: { height: 4, background: `${color}20`, borderRadius: 2 }, children: _jsx("div", { style: { height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" } }) }), _jsxs("div", { style: { fontSize: 8, color: L.text3, marginTop: 6 }, children: [pct, "% of ", activeDomain ? "filtered" : "total", " keys"] })] }, label));
                            }) })] })), (loading || result) && (_jsxs("div", { style: { ...LS.panel }, children: [_jsx(LPanelHeader, { left: `KEY RECORDS${filteredRecords.length !== allRecords.length ? ` (${filteredRecords.length} of ${allRecords.length})` : ""}`, right: result && (_jsxs("button", { onClick: () => setTableOpen(o => !o), style: { ...LS.btn, fontSize: 9, padding: "3px 9px" }, children: [tableOpen ? "▲ Hide" : "▼ Show", " ", filteredRecords.length, " keys"] })) }), (loading || tableOpen) && (_jsx("div", { style: { overflowX: "auto", WebkitOverflowScrolling: "touch" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif", minWidth: isMobile ? 500 : "auto" }, children: [_jsx("thead", { children: _jsx("tr", { style: { background: L.subtleBg, borderBottom: `2px solid ${L.border}` }, children: (isMobile
                                            ? ["Key Identifier", "Days", "Status", "Flags"]
                                            : ["Key Identifier", "Type", "Days Since", "Source", "Status", "Reg. Flags", "Attestation"]).map(h => (_jsx("th", { style: { padding: "7px 8px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left", whiteSpace: "nowrap" }, children: h }, h))) }) }), _jsx("tbody", { children: loading
                                        ? _jsx(SkeletonTableRows, { count: 6, cols: isMobile ? 4 : 7 })
                                        : filteredRecords.length === 0
                                            ? (_jsx("tr", { children: _jsx("td", { colSpan: isMobile ? 4 : 7, style: { padding: "20px", textAlign: "center", fontSize: 10, color: L.text3 }, children: statusFilter !== "ALL" || sourceFilter !== "ALL"
                                                        ? "No keys match the current filters."
                                                        : activeDomain
                                                            ? `No keys matched "*.${normaliseDomain(activeDomain)}".`
                                                            : "No records." }) }))
                                            : filteredRecords.map((r, i) => {
                                                const sc = STATUS_COLOR[r.status] ?? L.text3;
                                                const days = r.days_since_rotation != null ? `${r.days_since_rotation}d` : "Never";
                                                const rowBg = i % 2 === 0 ? L.panelBg : L.subtleBg;
                                                return (_jsxs("tr", { style: { borderBottom: `1px solid ${L.borderLight}`, background: rowBg }, onMouseEnter: e => (e.currentTarget.style.background = L.insetBg), onMouseLeave: e => (e.currentTarget.style.background = rowBg), children: [_jsx("td", { style: { padding: "7px 8px", color: L.blue, fontWeight: 600, fontFamily: "'DM Mono',monospace", fontSize: 9, maxWidth: isMobile ? 130 : 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: r.key_identifier }), !isMobile && (_jsx("td", { style: { padding: "7px 8px" }, children: _jsx("span", { style: { fontSize: 8, color: L.text3, background: L.insetBg, border: `1px solid ${L.border}`, borderRadius: 3, padding: "1px 5px", fontWeight: 600 }, children: r.key_type }) })), _jsx("td", { style: { padding: "7px 8px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: sc, fontSize: isMobile ? 9 : 10, whiteSpace: "nowrap" }, children: days }), !isMobile && (_jsx("td", { style: { padding: "7px 8px", fontSize: 9, color: L.text3, whiteSpace: "nowrap" }, children: r.rotation_source })), _jsx("td", { style: { padding: "7px 8px" }, children: _jsx(StatusBadge, { status: r.status }) }), _jsx("td", { style: { padding: "7px 8px" }, children: _jsxs("div", { style: { display: "flex", gap: 3, flexWrap: "wrap" }, children: [r.regulatory_flags.map((f) => _jsx(RegBadge, { text: f }, f)), r.regulatory_flags.length === 0 && (_jsx("span", { style: { fontSize: 8, color: L.green, fontWeight: 600 }, children: "\u2713" }))] }) }), !isMobile && (_jsxs("td", { style: { padding: "7px 8px", fontFamily: "'DM Mono',monospace", fontSize: 7, color: L.text4 }, children: [r.attestation_hash.slice(0, 16), "\u2026"] }))] }, r.asset_id));
                                            }) })] }) })), _jsxs("div", { style: {
                            padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`,
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            flexWrap: "wrap", gap: 8,
                            background: L.subtleBg, borderRadius: "0 0 8px 8px",
                        }, children: [loading
                                ? _jsx(Shimmer, { w: 200, h: 9 })
                                : (_jsxs("span", { style: { fontSize: isMobile ? 9 : 10, color: L.text2 }, children: [_jsx("b", { style: { color: L.text1 }, children: filteredRecords.length }), " keys \u00B7", " ", _jsx("b", { style: { color: L.green }, children: filteredRecords.filter(r => r.status === "COMPLIANT").length }), " compliant \u00B7", " ", _jsx("b", { style: { color: L.red }, children: filteredRecords.filter(r => r.status === "CRITICAL" || r.status === "NEVER_ROTATED").length }), " critical", secureModeOn && (_jsx("span", { style: { marginLeft: 8, fontSize: 8, color: L.purple, fontWeight: 600 }, children: "\u00B7 ghost mode" }))] })), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [result && !isMobile && (_jsxs("span", { style: { fontSize: 9, color: L.text3, fontFamily: "'DM Mono',monospace" }, children: ["Scan ID: ", result.scan_id] })), result && (_jsx("button", { onClick: handleExportPDF, disabled: pdfExporting, title: "Downloads audit HTML \u2014 open in browser \u2192 Save as PDF", style: pdfBtnStyle(false), children: pdfExporting
                                            ? _jsxs(_Fragment, { children: [_jsx("span", { style: { display: "inline-block", animation: "spin 0.7s linear infinite" }, children: "\u27F3" }), " Exporting\u2026"] })
                                            : _jsx(_Fragment, { children: "\u2B07 Export PDF" }) }))] })] })] }))] }));
}
