import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * VCenterConnect.tsx  —  Responsive + Skeleton Edition
 *
 * Changes from original:
 *   • Full mobile-first responsive layout via CSS custom properties + media queries
 *   • Skeleton shimmer components for every async state:
 *       - SessionSkeleton   — shown while connecting
 *       - AssetsSkeleton    — shown while fetching assets
 *       - TableSkeleton     — tab content loading state
 *   • Grid collapses to single-column on ≤768 px
 *   • Metrics row wraps on small screens
 *   • Tab bar scrolls horizontally on mobile
 *   • Form card stretches to full width when un-connected on mobile
 *
 * Install: same as original — drop into src/components/Modules/VCenterConnect.tsx
 */
import { useState, useCallback, useEffect, useRef } from "react";
// ── Design tokens ─────────────────────────────────────────────────────────────
const L = {
    accent: "#0ea5e9",
    accentDark: "#0284c7",
    accentDim: "rgba(14,165,233,0.1)",
    accentBorder: "rgba(14,165,233,0.28)",
    text: "#050d1a",
    textSec: "#1e293b",
    textDim: "#334155",
    textMuted: "#475569",
    textFaint: "#64748b",
    divider: "rgba(14,165,233,0.12)",
    panelBg: "#ffffff",
    pageBg: "#f1f5f9",
    success: "#16a34a",
    successDim: "rgba(22,163,74,0.1)",
    successBorder: "rgba(22,163,74,0.28)",
    danger: "#dc2626",
    dangerDim: "rgba(220,38,38,0.08)",
    dangerBorder: "rgba(220,38,38,0.28)",
    warn: "#d97706",
    warnDim: "rgba(217,119,6,0.08)",
    warnBorder: "rgba(217,119,6,0.28)",
    skeleton: "rgba(14,165,233,0.07)",
    skeletonShine: "rgba(14,165,233,0.18)",
};
const FO = "'Orbitron', monospace";
const FM = "'Share Tech Mono', monospace";
// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO = {
    virtual_machines: [
        { name: "prod-web-01", ip: "10.10.1.11", os: "Ubuntu 22.04 LTS", cluster: "PROD-CLUSTER-A", datacenter: "DC-MUMBAI", power_state: "poweredOn" },
        { name: "prod-web-02", ip: "10.10.1.12", os: "Ubuntu 22.04 LTS", cluster: "PROD-CLUSTER-A", datacenter: "DC-MUMBAI", power_state: "poweredOn" },
        { name: "prod-db-primary", ip: "10.10.2.10", os: "RHEL 8.6", cluster: "PROD-CLUSTER-B", datacenter: "DC-MUMBAI", power_state: "poweredOn" },
        { name: "prod-db-replica", ip: "10.10.2.11", os: "RHEL 8.6", cluster: "PROD-CLUSTER-B", datacenter: "DC-MUMBAI", power_state: "poweredOn" },
        { name: "prod-api-gateway", ip: "10.10.1.20", os: "Ubuntu 22.04 LTS", cluster: "PROD-CLUSTER-A", datacenter: "DC-MUMBAI", power_state: "poweredOn" },
        { name: "prod-mq-01", ip: "10.10.3.5", os: "Ubuntu 20.04 LTS", cluster: "PROD-CLUSTER-C", datacenter: "DC-MUMBAI", power_state: "poweredOn" },
        { name: "prod-hsm-01", ip: "10.10.5.2", os: "RHEL 8.6", cluster: "PROD-CLUSTER-B", datacenter: "DC-MUMBAI", power_state: "poweredOn" },
        { name: "int-devtools-01", ip: "192.168.1.5", os: "Windows Server 2019", cluster: "INT-CLUSTER-A", datacenter: "DC-INTERNAL", power_state: "poweredOn" },
        { name: "int-monitor-01", ip: "192.168.1.8", os: "Ubuntu 22.04 LTS", cluster: "INT-CLUSTER-A", datacenter: "DC-INTERNAL", power_state: "poweredOn" },
        { name: "int-jenkins-01", ip: "192.168.2.3", os: "Ubuntu 20.04 LTS", cluster: "INT-CLUSTER-B", datacenter: "DC-INTERNAL", power_state: "poweredOn" },
        { name: "int-backup-01", ip: "192.168.3.1", os: "RHEL 8.6", cluster: "INT-CLUSTER-B", datacenter: "DC-INTERNAL", power_state: "poweredOn" },
        { name: "dr-web-01", ip: "10.20.1.11", os: "Ubuntu 22.04 LTS", cluster: "DR-CLUSTER-A", datacenter: "DC-DR", power_state: "poweredOn" },
        { name: "dr-db-01", ip: "10.20.2.10", os: "RHEL 8.6", cluster: "DR-CLUSTER-A", datacenter: "DC-DR", power_state: "poweredOn" },
        { name: "decom-legacy-01", ip: null, os: "Windows Server 2012", cluster: "INT-CLUSTER-A", datacenter: "DC-INTERNAL", power_state: "poweredOff" },
        { name: "test-sandbox-01", ip: "192.168.9.1", os: "Ubuntu 22.04 LTS", cluster: "INT-CLUSTER-B", datacenter: "DC-INTERNAL", power_state: "poweredOn" },
    ],
    datastores: [
        { name: "DS-PROD-SAN-01", type: "VMFS", capacity_gb: 10240, free_gb: 3200, accessible: true },
        { name: "DS-PROD-SAN-02", type: "VMFS", capacity_gb: 10240, free_gb: 4100, accessible: true },
        { name: "DS-DR-NFS-01", type: "NFS", capacity_gb: 5120, free_gb: 1800, accessible: true },
        { name: "DS-INTERNAL-SAN-01", type: "VMFS", capacity_gb: 2048, free_gb: 900, accessible: true },
    ],
    clusters: [
        { name: "PROD-CLUSTER-A", num_hosts: 4, total_cpu_mhz: 96000, total_mem_mb: 524288, ha_enabled: true, drs_enabled: true },
        { name: "PROD-CLUSTER-B", num_hosts: 4, total_cpu_mhz: 96000, total_mem_mb: 524288, ha_enabled: true, drs_enabled: true },
        { name: "PROD-CLUSTER-C", num_hosts: 2, total_cpu_mhz: 48000, total_mem_mb: 262144, ha_enabled: true, drs_enabled: false },
        { name: "DR-CLUSTER-A", num_hosts: 2, total_cpu_mhz: 48000, total_mem_mb: 262144, ha_enabled: true, drs_enabled: false },
        { name: "INT-CLUSTER-A", num_hosts: 2, total_cpu_mhz: 32000, total_mem_mb: 131072, ha_enabled: false, drs_enabled: false },
        { name: "INT-CLUSTER-B", num_hosts: 2, total_cpu_mhz: 32000, total_mem_mb: 131072, ha_enabled: false, drs_enabled: false },
    ],
    networks: [
        { name: "PROD-VLAN-10", type: "DistributedVirtualPortgroup", num_vms: 5, accessible: true },
        { name: "PROD-VLAN-20", type: "DistributedVirtualPortgroup", num_vms: 3, accessible: true },
        { name: "DR-VLAN-10", type: "DistributedVirtualPortgroup", num_vms: 2, accessible: true },
        { name: "INTERNAL-MGMT", type: "Network", num_vms: 5, accessible: true },
        { name: "INTERNAL-DEV", type: "Network", num_vms: 3, accessible: true },
    ],
};
// ── Global styles injected once ───────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
@keyframes ping       { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(2.4);opacity:0} }
@keyframes fadeSlide  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes shimmer    { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
* { box-sizing:border-box; }

/* ── Skeleton shimmer ─────────────────────────────────── */
.vc-skel {
  border-radius:4px;
  background: linear-gradient(90deg,
    rgba(14,165,233,0.07) 25%,
    rgba(14,165,233,0.18) 50%,
    rgba(14,165,233,0.07) 75%
  );
  background-size:800px 100%;
  animation: shimmer 1.6s ease infinite;
}

/* ── Responsive helpers ───────────────────────────────── */
.vc-grid {
  display:grid;
  gap:16px;
  align-items:start;
}
.vc-grid.connected {
  grid-template-columns: 300px 1fr;
}
.vc-grid.disconnected {
  grid-template-columns: 380px;
}
.vc-metrics {
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.vc-metrics > * {
  flex: 1 1 100px;
  min-width:0;
}
.vc-tabs-bar {
  display:flex;
  overflow-x:auto;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
  border-bottom:1px solid rgba(14,165,233,0.12);
  margin-bottom:16px;
}
.vc-tabs-bar::-webkit-scrollbar { display:none; }

@media (max-width:900px) {
  .vc-grid.connected {
    grid-template-columns: 1fr !important;
  }
}
@media (max-width:600px) {
  .vc-grid.disconnected {
    grid-template-columns: 1fr !important;
  }
  .vc-page-header h1 {
    font-size:14px !important;
  }
  .vc-page-header .icon-box {
    width:32px !important; height:32px !important; font-size:15px !important;
  }
}
`;
// ── Skeleton primitives ───────────────────────────────────────────────────────
function SkRow({ w = "100%", h = 12, mb = 8 }) {
    return (_jsx("div", { className: "vc-skel", style: { width: w, height: h, marginBottom: mb, borderRadius: 4 } }));
}
/** Skeleton shown inside the session card while connecting */
function SessionSkeleton() {
    return (_jsxs("div", { style: { animation: "fadeSlide 0.2s ease" }, children: [_jsxs("div", { style: {
                    padding: "14px 18px", borderBottom: `1px solid ${L.divider}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("div", { className: "vc-skel", style: { width: 32, height: 32, borderRadius: 6 } }), _jsxs("div", { children: [_jsx(SkRow, { w: 140, h: 10, mb: 6 }), _jsx(SkRow, { w: 90, h: 8, mb: 0 })] })] }), _jsx(SkRow, { w: 64, h: 18, mb: 0 })] }), _jsxs("div", { style: { padding: 18 }, children: [_jsx("div", { className: "vc-metrics", style: { marginBottom: 16 }, children: [0, 1, 2].map(i => (_jsxs("div", { style: {
                                flex: "1 1 100px", background: L.accentDim,
                                border: `1px solid ${L.accentBorder}`, borderRadius: 8, padding: "12px 14px",
                            }, children: [_jsx(SkRow, { w: 60, h: 7, mb: 10 }), _jsx(SkRow, { w: 40, h: 20, mb: 6 }), _jsx(SkRow, { w: 50, h: 8, mb: 0 })] }, i))) }), _jsx(SkRow, { w: 80, h: 8, mb: 10 }), [0, 1, 2, 3, 4].map(i => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
                            borderBottom: `1px solid rgba(14,165,233,0.07)` }, children: [_jsx("div", { className: "vc-skel", style: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 } }), _jsx(SkRow, { w: 120, h: 10, mb: 0 }), _jsx(SkRow, { w: "40%", h: 9, mb: 0 }), _jsx(SkRow, { w: 80, h: 16, mb: 0 })] }, i))), _jsx("div", { className: "vc-skel", style: { height: 36, borderRadius: 6, marginTop: 16 } })] })] }));
}
/** Skeleton shown in the assets panel while fetching */
function AssetsSkeleton() {
    return (_jsxs("div", { style: { animation: "fadeSlide 0.2s ease" }, children: [_jsxs("div", { style: {
                    padding: "14px 18px", borderBottom: `1px solid ${L.divider}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("div", { className: "vc-skel", style: { width: 32, height: 32, borderRadius: 6 } }), _jsx(SkRow, { w: 120, h: 10, mb: 0 })] }), _jsx(SkRow, { w: 80, h: 10, mb: 0 })] }), _jsxs("div", { style: { padding: 18 }, children: [_jsx("div", { className: "vc-metrics", style: { marginBottom: 20 }, children: [0, 1, 2, 3].map(i => (_jsxs("div", { style: {
                                flex: "1 1 80px", background: L.accentDim,
                                border: `1px solid ${L.accentBorder}`, borderRadius: 8, padding: "12px 14px",
                            }, children: [_jsx(SkRow, { w: 50, h: 7, mb: 10 }), _jsx(SkRow, { w: 30, h: 20, mb: 0 })] }, i))) }), _jsx("div", { className: "vc-tabs-bar", style: { gap: 4, marginBottom: 16 }, children: [110, 80, 70, 65].map((w, i) => (_jsx("div", { className: "vc-skel", style: { width: w, height: 28, borderRadius: 4, flexShrink: 0, margin: "0 2px" } }, i))) }), _jsx(TableSkeleton, {})] })] }));
}
/** Skeleton for the table inside a tab */
function TableSkeleton({ rows = 6 }) {
    return (_jsxs("div", { children: [_jsx("div", { style: { display: "flex", gap: 12, padding: "6px 10px 8px",
                    borderBottom: `1px solid ${L.divider}`, marginBottom: 4 }, children: [140, 90, 110, 80, 60].map((w, i) => (_jsx(SkRow, { w: w, h: 7, mb: 0 }, i))) }), Array.from({ length: rows }).map((_, i) => (_jsxs("div", { style: { display: "flex", gap: 12, padding: "8px 10px",
                    borderBottom: `1px solid rgba(14,165,233,0.06)` }, children: [_jsx(SkRow, { w: 140, h: 10, mb: 0 }), _jsx(SkRow, { w: 90, h: 10, mb: 0 }), _jsx(SkRow, { w: 110, h: 10, mb: 0 }), _jsx(SkRow, { w: 80, h: 16, mb: 0 }), _jsx(SkRow, { w: 40, h: 16, mb: 0 })] }, i)))] }));
}
// ── Primitive UI components ───────────────────────────────────────────────────
function OLabel({ children }) {
    return (_jsx("div", { style: { fontFamily: FO, fontSize: 7.5, fontWeight: 700, color: L.textMuted,
            letterSpacing: ".2em", textTransform: "uppercase", padding: "10px 0 6px" }, children: children }));
}
function Badge({ label, variant = "neutral" }) {
    const map = {
        neutral: { bg: L.accentDim, bd: L.accentBorder, c: L.accent },
        success: { bg: L.successDim, bd: L.successBorder, c: L.success },
        danger: { bg: L.dangerDim, bd: L.dangerBorder, c: L.danger },
        warn: { bg: L.warnDim, bd: L.warnBorder, c: L.warn },
        ghost: { bg: "rgba(99,102,241,0.08)", bd: "rgba(99,102,241,0.28)", c: "#6366f1" },
    };
    const v = map[variant];
    return (_jsx("span", { style: {
            display: "inline-flex", alignItems: "center",
            padding: "2px 8px", borderRadius: 4,
            background: v.bg, border: `1px solid ${v.bd}`, color: v.c,
            fontFamily: FO, fontSize: 7, fontWeight: 700, letterSpacing: ".16em",
            whiteSpace: "nowrap",
        }, children: label }));
}
function Metric({ label, value, sub }) {
    return (_jsxs("div", { style: { background: L.accentDim, border: `1px solid ${L.accentBorder}`,
            borderRadius: 8, padding: "12px 14px", minWidth: 0 }, children: [_jsx("div", { style: { fontFamily: FO, fontSize: 7, color: L.textMuted, letterSpacing: ".16em", fontWeight: 700, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: label.toUpperCase() }), _jsx("div", { style: { fontFamily: FO, fontSize: 20, fontWeight: 700, color: L.text, lineHeight: 1 }, children: value }), sub && _jsx("div", { style: { fontFamily: FM, fontSize: 10, color: L.textFaint, marginTop: 4 }, children: sub })] }));
}
function IBox({ icon, active }) {
    return (_jsx("div", { style: {
            width: 32, height: 32, flexShrink: 0,
            background: active ? "rgba(14,165,233,0.15)" : L.accentDim,
            border: `1px solid ${active ? L.accentBorder : "rgba(14,165,233,0.18)"}`,
            borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: FO, fontSize: 14, color: active ? L.accent : L.textDim,
        }, children: icon }));
}
function PingDot({ color = L.success }) {
    return (_jsxs("span", { style: { position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }, children: [_jsx("span", { style: { position: "absolute", inset: 0, borderRadius: "50%", background: color,
                    opacity: 0.4, animation: "ping 1.4s ease infinite" } }), _jsx("span", { style: { width: 8, height: 8, borderRadius: "50%", background: color,
                    display: "block", boxShadow: `0 0 4px ${color}` } })] }));
}
function RInput({ label, type = "text", value, onChange, placeholder, disabled }) {
    return (_jsxs("div", { children: [_jsx("div", { style: { fontFamily: FO, fontSize: 7.5, fontWeight: 700, color: L.textMuted,
                    letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 5 }, children: label }), _jsx("input", { type: type, value: value, onChange: e => onChange(e.target.value), placeholder: placeholder, disabled: disabled, autoComplete: "off", style: {
                    width: "100%", padding: "8px 10px", fontFamily: FM, fontSize: 12,
                    background: disabled ? "rgba(241,245,249,0.6)" : L.panelBg,
                    border: `1px solid rgba(14,165,233,0.22)`, borderRadius: 6,
                    color: L.text, outline: "none", transition: "border-color 0.15s",
                }, onFocus: e => (e.target.style.borderColor = L.accent), onBlur: e => (e.target.style.borderColor = "rgba(14,165,233,0.22)") })] }));
}
function RBtn({ children, onClick, disabled, variant = "primary", style: xs = {} }) {
    const base = {
        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        padding: "9px 18px", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: FO, fontSize: 8.5, fontWeight: 700, letterSpacing: ".14em",
        transition: "all 0.15s", opacity: disabled ? 0.5 : 1,
    };
    const map = {
        primary: { background: disabled ? L.accentDim : L.accent, border: `1px solid ${disabled ? L.accentBorder : L.accentDark}`, color: disabled ? L.accent : "#fff" },
        secondary: { background: L.accentDim, border: `1px solid ${L.accentBorder}`, color: L.textSec },
        danger: { background: L.dangerDim, border: `1px solid ${L.dangerBorder}`, color: L.danger },
    };
    return _jsx("button", { onClick: disabled ? undefined : onClick, style: { ...base, ...map[variant], ...xs }, children: children });
}
function RTable({ rows = [], cols }) {
    if (!rows.length)
        return (_jsx("div", { style: { fontFamily: FM, fontSize: 11, color: L.textFaint, padding: "14px 0" }, children: "NO DATA" }));
    return (_jsx("div", { style: { overflowX: "auto", WebkitOverflowScrolling: "touch" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", minWidth: 400 }, children: [_jsx("thead", { children: _jsx("tr", { children: cols.map(c => (_jsx("th", { style: {
                                textAlign: "left", padding: "6px 10px 8px",
                                borderBottom: `1px solid ${L.divider}`,
                                fontFamily: FO, fontSize: 7, fontWeight: 700, color: L.textMuted,
                                letterSpacing: ".16em", textTransform: "uppercase", whiteSpace: "nowrap",
                            }, children: c.label }, c.key))) }) }), _jsx("tbody", { children: rows.map((row, i) => (_jsx("tr", { style: { borderBottom: `1px solid rgba(14,165,233,0.06)`, transition: "background 0.1s" }, onMouseEnter: e => (e.currentTarget.style.background = L.accentDim), onMouseLeave: e => (e.currentTarget.style.background = "transparent"), children: cols.map(c => (_jsx("td", { style: { padding: "8px 10px", verticalAlign: "middle", fontFamily: FM, fontSize: 11, color: L.textSec }, children: c.render ? c.render(row[c.key], row) : (row[c.key] != null ? String(row[c.key]) : "—") }, c.key))) }, i))) })] }) }));
}
function Tabs({ tabs, active, onChange }) {
    return (_jsx("div", { className: "vc-tabs-bar", children: tabs.map(t => {
            const on = t.id === active;
            return (_jsxs("button", { onClick: () => onChange(t.id), style: {
                    padding: "8px 14px", fontFamily: FO, fontSize: 7.5, fontWeight: 700,
                    letterSpacing: ".14em", cursor: "pointer", border: "none",
                    borderBottom: on ? `2px solid ${L.accent}` : "2px solid transparent",
                    background: "transparent", color: on ? L.accent : L.textMuted,
                    marginBottom: -1, transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0,
                }, children: [t.label, t.count != null && (_jsx("span", { style: {
                            marginLeft: 6, padding: "1px 6px", borderRadius: 3,
                            background: on ? L.accentDim : "rgba(0,0,0,0.04)",
                            border: `1px solid ${on ? L.accentBorder : "rgba(0,0,0,0.08)"}`,
                            fontFamily: FO, fontSize: 7, color: on ? L.accent : L.textFaint,
                        }, children: t.count }))] }, t.id));
        }) }));
}
// ── Inline badge helpers ──────────────────────────────────────────────────────
const tb = (text, bg, bd, c) => (_jsx("span", { style: { fontFamily: FO, fontSize: 6.5, fontWeight: 700, padding: "2px 7px",
        borderRadius: 3, background: bg, border: `1px solid ${bd}`, color: c, letterSpacing: ".1em", whiteSpace: "nowrap" }, children: text }));
const clusterBadge = (v) => tb(v, L.accentDim, L.accentBorder, L.accent);
const onOffBadge = (v) => tb(v ? "ON" : "OFF", v ? L.successDim : L.accentDim, v ? L.successBorder : L.divider, v ? L.success : L.textFaint);
const okFaultBadge = (v) => tb(v ? "OK" : "FAULT", v ? L.successDim : L.dangerDim, v ? L.successBorder : L.dangerBorder, v ? L.success : L.danger);
const typeBadge = (v) => tb(v, L.accentDim, L.accentBorder, L.accent);
const powerBadge = (v) => tb(v === "poweredOn" ? "ON" : "OFF", v === "poweredOn" ? L.successDim : L.accentDim, v === "poweredOn" ? L.successBorder : L.divider, v === "poweredOn" ? L.success : L.textFaint);
// ── Main component ────────────────────────────────────────────────────────────
export default function VCenterConnect({ apiBase = "https://r3bel-production.up.railway.app", onAssets, ghostMode = false, }) {
    const base = apiBase.replace(/\/$/, "");
    const [host, setHost] = useState("");
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [port, setPort] = useState("443");
    const [selfSigned, setSelfSigned] = useState(true);
    const [demoMode, setDemoMode] = useState(false);
    const [session, setSession] = useState(null);
    const [assets, setAssets] = useState(null);
    const [statusData, setStatusData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("vms");
    // Inject global CSS once
    const cssRef = useRef(false);
    useEffect(() => {
        if (cssRef.current)
            return;
        cssRef.current = true;
        const el = document.createElement("style");
        el.textContent = GLOBAL_CSS;
        document.head.appendChild(el);
    }, []);
    // ── Connect ────────────────────────────────────────────────────────────────
    const handleConnect = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSession(null);
        setAssets(null);
        setStatusData(null);
        if (demoMode) {
            await new Promise(r => setTimeout(r, 900));
            setSession({
                connected: true, host: "demo.vcenter.vestro.int",
                vcenter_version: "7.0.3", full_name: "VMware vCenter Server 7.0.3",
                connected_at: new Date().toISOString(),
                vm_count: DEMO.virtual_machines.length, vm_preview: DEMO.virtual_machines.slice(0, 5),
            });
            setLoading(false);
            return;
        }
        try {
            const resp = await fetch(`${base}/vcenter/connect-vcenter`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ host, username: user, password: pass, port: parseInt(port), allow_self_signed: selfSigned }),
            });
            if (!resp.ok) {
                const e = await resp.json();
                throw new Error(e.detail?.error || e.detail || "Connection failed");
            }
            setSession(await resp.json());
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setLoading(false);
        }
    }, [base, host, user, pass, port, selfSigned, demoMode]);
    // ── Fetch assets ───────────────────────────────────────────────────────────
    const handleFetchAssets = useCallback(async (forceRefresh = false) => {
        setLoadingAssets(true);
        setError(null);
        if (demoMode) {
            await new Promise(r => setTimeout(r, 700));
            const d = {
                ...DEMO, source: "mock", fetched_at: new Date().toISOString(),
                summary: {
                    total_vms: DEMO.virtual_machines.length,
                    powered_on: DEMO.virtual_machines.filter(v => v.power_state === "poweredOn").length,
                    powered_off: DEMO.virtual_machines.filter(v => v.power_state !== "poweredOn").length,
                    total_datastores: DEMO.datastores.length,
                    total_clusters: DEMO.clusters.length,
                    total_networks: DEMO.networks.length,
                },
            };
            setAssets(d);
            if (onAssets)
                onAssets(d.virtual_machines);
            setLoadingAssets(false);
            return;
        }
        try {
            const p = new URLSearchParams({ demo: "false", force_refresh: String(forceRefresh) });
            const resp = await fetch(`${base}/vcenter/vcenter-assets?${p}`);
            if (!resp.ok) {
                const e = await resp.json();
                throw new Error(e.detail?.error || e.detail || "Fetch failed");
            }
            const d = await resp.json();
            setAssets(d);
            if (onAssets && d.normalized_assets)
                onAssets(d.normalized_assets);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setLoadingAssets(false);
        }
    }, [base, demoMode, onAssets]);
    // ── Status ─────────────────────────────────────────────────────────────────
    const handleCheckStatus = useCallback(async () => {
        if (demoMode) {
            setStatusData({ session_active: true, alive: true, status: "connected", vcenter_version: "7.0.3" });
            return;
        }
        try {
            const resp = await fetch(`${base}/vcenter/vcenter-status`);
            setStatusData(await resp.json());
        }
        catch {
            setStatusData({ session_active: false, alive: false, status: "error" });
        }
    }, [base, demoMode]);
    const canConnect = demoMode || (!!host && !!user && !!pass);
    const tabConfig = assets ? [
        { id: "vms", label: "Virtual Machines", count: assets.virtual_machines?.length },
        { id: "datastores", label: "Datastores", count: assets.datastores?.length },
        { id: "clusters", label: "Clusters", count: assets.clusters?.length },
        { id: "networks", label: "Networks", count: assets.networks?.length },
    ] : [];
    // ── Render ─────────────────────────────────────────────────────────────────
    return (_jsxs("div", { style: { minHeight: "100vh", background: L.pageBg, padding: "24px 24px 24px 64px", fontFamily: FM }, children: [_jsxs("div", { className: "vc-page-header", style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }, children: [_jsx("div", { className: "icon-box", style: {
                            width: 38, height: 38, background: L.accentDim, border: `1px solid ${L.accentBorder}`,
                            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: FO, fontSize: 18, color: L.accent, flexShrink: 0,
                        }, children: "\u2B21" }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("h1", { style: { fontFamily: FO, fontWeight: 900, fontSize: 18, color: L.text, letterSpacing: ".12em", lineHeight: 1, margin: 0 }, children: "CONNECTION TO INFRASTRUCTURE" }), _jsx("div", { style: { fontFamily: FM, fontSize: 10, color: L.textFaint, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: "VMware vCenter \u00B7 Centralized Asset Discovery \u00B7 Air-Gap Compatible" })] }), ghostMode && _jsx(Badge, { label: "Ghost Mode", variant: "ghost" })] }), _jsxs("div", { className: `vc-grid ${session?.connected ? "connected" : "disconnected"}`, children: [_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("div", { style: {
                                    background: L.panelBg, border: `1px solid ${L.divider}`,
                                    borderRadius: 10, overflow: "hidden", animation: "fadeSlide 0.25s ease",
                                }, children: [_jsxs("div", { style: {
                                            padding: "14px 18px", borderBottom: `1px solid ${L.divider}`,
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx(IBox, { icon: "\u25C8", active: true }), _jsx("span", { style: { fontFamily: FO, fontSize: 9, fontWeight: 700, letterSpacing: ".18em", color: L.text }, children: "INFRASTRUCTURE" })] }), _jsx(Badge, { label: demoMode ? "Demo" : "Live", variant: demoMode ? "warn" : "neutral" })] }), _jsxs("div", { style: { padding: 18 }, children: [_jsxs("label", { style: {
                                                    display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
                                                    cursor: "pointer", padding: "8px 10px", borderRadius: 6,
                                                    background: demoMode ? L.warnDim : "transparent",
                                                    border: `1px solid ${demoMode ? L.warnBorder : L.divider}`,
                                                    transition: "all 0.15s",
                                                }, children: [_jsx("input", { type: "checkbox", checked: demoMode, onChange: e => { setDemoMode(e.target.checked); setError(null); setSession(null); setAssets(null); }, style: { accentColor: L.warn, width: 13, height: 13 } }), _jsxs("div", { children: [_jsx("div", { style: { fontFamily: FO, fontSize: 7.5, fontWeight: 700, color: demoMode ? L.warn : L.textSec, letterSpacing: ".12em" }, children: "DEMO MODE" }), _jsx("div", { style: { fontFamily: FM, fontSize: 10, color: L.textFaint, marginTop: 2 }, children: "No vCenter required" })] })] }), !demoMode && (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [_jsx(RInput, { label: "vCenter Host", value: host, onChange: setHost, placeholder: "vcenter.vestro.int", disabled: loading }), _jsx(RInput, { label: "Username", value: user, onChange: setUser, placeholder: "readonly@vsphere.local", disabled: loading }), _jsx(RInput, { label: "Password", type: "password", value: pass, onChange: setPass, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", disabled: loading }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, alignItems: "end" }, children: [_jsx(RInput, { label: "Port", type: "number", value: port, onChange: setPort, placeholder: "443", disabled: loading }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", paddingBottom: 2 }, children: [_jsx("input", { type: "checkbox", checked: selfSigned, onChange: e => setSelfSigned(e.target.checked), style: { accentColor: L.accent, width: 13, height: 13 } }), _jsxs("div", { style: { fontFamily: FO, fontSize: 7, color: L.textMuted, letterSpacing: ".12em", lineHeight: 1.5 }, children: ["ALLOW", _jsx("br", {}), "SELF-SIGNED SSL"] })] })] }), _jsxs("div", { style: { padding: "8px 10px", borderRadius: 6, background: L.accentDim, border: `1px solid ${L.accentBorder}` }, children: [_jsx("div", { style: { fontFamily: FO, fontSize: 7, fontWeight: 700, color: L.accent, letterSpacing: ".14em", marginBottom: 3 }, children: "SECURITY \u00B7 READ-ONLY" }), _jsxs("div", { style: { fontFamily: FM, fontSize: 10, color: L.textFaint, lineHeight: 1.5 }, children: ["Credentials held in-memory only.", _jsx("br", {}), "No write operations to vCenter."] })] })] })), error && (_jsxs("div", { style: {
                                                    marginTop: 10, padding: "9px 12px", borderRadius: 6,
                                                    background: L.dangerDim, border: `1px solid ${L.dangerBorder}`,
                                                    fontFamily: FM, fontSize: 11, color: L.danger, lineHeight: 1.4,
                                                    animation: "fadeSlide 0.2s ease",
                                                }, children: ["\u2715 ", error] })), _jsxs("div", { style: { display: "flex", gap: 8, marginTop: 14 }, children: [_jsx(RBtn, { onClick: handleConnect, disabled: loading || !canConnect, style: { flex: 1 }, children: loading ? "CONNECTING…" : session ? "RECONNECT" : "CONNECT" }), session && _jsx(RBtn, { variant: "secondary", onClick: handleCheckStatus, children: "STATUS" })] })] })] }), statusData && (_jsxs("div", { style: {
                                    background: L.panelBg, border: `1px solid ${L.divider}`,
                                    borderRadius: 10, padding: "14px 18px", animation: "fadeSlide 0.2s ease",
                                }, children: [_jsx(OLabel, { children: "Session Health" }), [
                                        ["Session", statusData.session_active ? "Active" : "None"],
                                        ["Alive", statusData.alive ? "Yes" : "Expired"],
                                        ["Status", statusData.status || "—"],
                                        ["Version", statusData.vcenter_version || "—"],
                                    ].map(([k, v]) => (_jsxs("div", { style: {
                                            display: "flex", justifyContent: "space-between", alignItems: "center",
                                            padding: "5px 0", borderBottom: `1px solid rgba(14,165,233,0.06)`,
                                        }, children: [_jsx("span", { style: { fontFamily: FO, fontSize: 7, color: L.textMuted, letterSpacing: ".14em", fontWeight: 700 }, children: k }), _jsx("span", { style: { fontFamily: FM, fontSize: 11, color: L.textSec }, children: v })] }, k)))] }))] }), (loading || session?.connected) && (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12, animation: "fadeSlide 0.3s ease" }, children: [_jsx("div", { style: { background: L.panelBg, border: `1px solid ${L.divider}`, borderRadius: 10, overflow: "hidden" }, children: loading ? (_jsx(SessionSkeleton, {})) : session?.connected && (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                                                padding: "14px 18px", borderBottom: `1px solid ${L.divider}`,
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                flexWrap: "wrap", gap: 8,
                                            }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 }, children: [_jsx(PingDot, {}), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: { fontFamily: FO, fontWeight: 700, fontSize: 10, color: L.text, letterSpacing: ".1em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: session.full_name || session.host }), _jsxs("div", { style: { fontFamily: FM, fontSize: 10, color: L.textFaint, marginTop: 2 }, children: [session.host, " \u00B7 port ", port] })] })] }), _jsx(Badge, { label: "Connected", variant: "success" })] }), _jsxs("div", { style: { padding: 18 }, children: [_jsxs("div", { className: "vc-metrics", style: { marginBottom: 16 }, children: [_jsx(Metric, { label: "Virtual Machines", value: session.vm_count ?? "—", sub: "discovered" }), _jsx(Metric, { label: "vCenter", value: session.vcenter_version ?? "—", sub: "version" }), _jsx(Metric, { label: "Mode", value: demoMode ? "DEMO" : "LIVE", sub: demoMode ? "simulated" : "air-gap ok" })] }), (session.vm_preview?.length ?? 0) > 0 && (_jsxs("div", { children: [_jsx(OLabel, { children: "VM Preview (first 5)" }), session.vm_preview.map((vm, i, a) => (_jsxs("div", { style: {
                                                                display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
                                                                borderBottom: i < a.length - 1 ? `1px solid rgba(14,165,233,0.07)` : "none",
                                                                flexWrap: "wrap",
                                                            }, children: [_jsx("span", { style: {
                                                                        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                                                                        background: vm.power_state === "poweredOn" ? L.success : L.textFaint,
                                                                        boxShadow: vm.power_state === "poweredOn" ? `0 0 4px ${L.success}` : "none",
                                                                    } }), _jsx("span", { style: { fontFamily: FM, fontSize: 11, fontWeight: 500, minWidth: 130, color: L.textSec }, children: vm.name }), _jsxs("span", { style: { fontFamily: FM, fontSize: 10, color: L.textFaint, flex: 1, minWidth: 80 }, children: [vm.ip || "no IP", " \u00B7 ", vm.os] }), vm.cluster && clusterBadge(vm.cluster)] }, i)))] })), _jsx(RBtn, { onClick: () => handleFetchAssets(false), disabled: loadingAssets, style: { marginTop: 16, width: "100%" }, children: loadingAssets ? "FETCHING ASSETS…" : "FETCH ALL ASSETS ↗" })] })] })) }), (loadingAssets || assets) && (_jsx("div", { style: {
                                    background: L.panelBg, border: `1px solid ${L.divider}`,
                                    borderRadius: 10, overflow: "hidden", animation: "fadeSlide 0.25s ease",
                                }, children: loadingAssets && !assets ? (_jsx(AssetsSkeleton, {})) : assets && (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                                                padding: "14px 18px", borderBottom: `1px solid ${L.divider}`,
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                flexWrap: "wrap", gap: 8,
                                            }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx(IBox, { icon: "\u25A6", active: true }), _jsx("span", { style: { fontFamily: FO, fontSize: 9, fontWeight: 700, letterSpacing: ".18em", color: L.text }, children: "ASSET INVENTORY" })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsxs("span", { style: { fontFamily: FM, fontSize: 10, color: L.textFaint }, children: [assets.source === "mock" ? "demo dataset" : assets.host, assets.fetched_at && ` · ${new Date(assets.fetched_at).toLocaleTimeString()}`] }), _jsx(RBtn, { variant: "secondary", onClick: () => handleFetchAssets(true), disabled: loadingAssets, style: { padding: "4px 10px", fontSize: 7 }, children: loadingAssets ? "…" : "↻ RESCAN" })] })] }), _jsxs("div", { style: { padding: 18 }, children: [_jsxs("div", { className: "vc-metrics", style: { marginBottom: 20 }, children: [_jsx(Metric, { label: "VMs", value: assets.summary?.total_vms ?? 0, sub: `${assets.summary?.powered_on ?? 0} running` }), _jsx(Metric, { label: "Datastores", value: assets.summary?.total_datastores ?? 0 }), _jsx(Metric, { label: "Clusters", value: assets.summary?.total_clusters ?? 0 }), _jsx(Metric, { label: "Networks", value: assets.summary?.total_networks ?? 0 })] }), _jsx(Tabs, { tabs: tabConfig, active: activeTab, onChange: setActiveTab }), loadingAssets ? (_jsx(TableSkeleton, {})) : (_jsxs(_Fragment, { children: [activeTab === "vms" && (_jsx(RTable, { rows: assets.virtual_machines ?? [], cols: [
                                                                { key: "name", label: "Name", render: (v) => _jsx("strong", { style: { fontWeight: 500, color: L.textSec }, children: v }) },
                                                                { key: "ip", label: "IP", render: (v) => v || "—" },
                                                                { key: "os", label: "OS", render: (v) => _jsx("span", { style: { color: L.textFaint }, children: v || "—" }) },
                                                                { key: "cluster", label: "Cluster", render: (v) => v ? clusterBadge(v) : "—" },
                                                                { key: "power_state", label: "State", render: (v) => powerBadge(v) },
                                                            ] })), activeTab === "datastores" && (_jsx(RTable, { rows: assets.datastores ?? [], cols: [
                                                                { key: "name", label: "Name" },
                                                                { key: "type", label: "Type", render: (v) => typeBadge(v) },
                                                                { key: "capacity_gb", label: "Capacity", render: (v) => v != null ? `${v.toLocaleString()} GB` : "—" },
                                                                { key: "free_gb", label: "Free", render: (v) => v != null ? `${v.toLocaleString()} GB` : "—" },
                                                                { key: "accessible", label: "Status", render: (v) => okFaultBadge(v) },
                                                            ] })), activeTab === "clusters" && (_jsx(RTable, { rows: assets.clusters ?? [], cols: [
                                                                { key: "name", label: "Cluster" },
                                                                { key: "num_hosts", label: "Hosts" },
                                                                { key: "total_cpu_mhz", label: "CPU", render: (v) => v ? `${(v / 1000).toFixed(1)} GHz` : "—" },
                                                                { key: "total_mem_mb", label: "RAM", render: (v) => v ? `${Math.round(v / 1024)} GB` : "—" },
                                                                { key: "ha_enabled", label: "HA", render: (v) => onOffBadge(v) },
                                                                { key: "drs_enabled", label: "DRS", render: (v) => onOffBadge(v) },
                                                            ] })), activeTab === "networks" && (_jsx(RTable, { rows: assets.networks ?? [], cols: [
                                                                { key: "name", label: "Network" },
                                                                { key: "type", label: "Type", render: (v) => typeBadge(v === "DistributedVirtualPortgroup" ? "DVS" : "VSWITCH") },
                                                                { key: "num_vms", label: "VMs" },
                                                                { key: "accessible", label: "Status", render: (v) => okFaultBadge(v) },
                                                            ] }))] }))] })] })) }))] }))] })] }));
}
