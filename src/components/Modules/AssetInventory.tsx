import React, { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "./shared.js";

// ── API Base ──────────────────────────────────────────────────────────────────
const API =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  "https://r3bel-5464.onrender.com";

// ── Light Theme Palette (matches AssetInventoryPage.tsx) ──────────────────────
const L = {
  pageBg:      "#f5f7fa",
  panelBg:     "#ffffff",
  panelBorder: "#e2e8f0",
  subtleBg:    "#f8fafc",
  insetBg:     "#f1f5f9",
  borderLight: "#f1f5f9",
  text1:  "#0f172a",
  text2:  "#334155",
  text3:  "#64748b",
  text4:  "#94a3b8",
  blue:   "#1d4ed8",
  cyan:   "#0284c7",
  green:  "#16a34a",
  yellow: "#b45309",
  orange: "#c2410c",
  red:    "#dc2626",
  purple: "#7c3aed",
};

const LS = {
  page: {
    background: L.pageBg,
    minHeight: "100vh",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column" as const,
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

function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

function Shimmer({ w = "100%", h = 14, radius = 4, style = {} }: {
  w?: string | number; h?: number; radius?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, flexShrink: 0,
      background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s ease infinite",
      ...style,
    }} />
  );
}

function LPanel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...LS.panel, ...style }}>{children}</div>;
}
function LPanelHeader({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "8px 8px 0 0", flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" as const }}>{left}</span>
      {right}
    </div>
  );
}
function LMetricCard({ label, value, sub, color, loading }: { label: string; value: string | number; sub: string; color: string; loading?: boolean }) {
  return (
    <div style={{ background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 8, color: L.text4, textTransform: "uppercase" as const, letterSpacing: ".12em", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {loading ? <Shimmer w="60%" h={22} style={{ marginBottom: 8 }} /> : <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>}
      <div style={{ fontSize: 9, color: L.text3, marginTop: 5 }}>{sub}</div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface CryptoAsset {
  id: number;
  asset_name: string;
  asset_type: string;
  environment: string;
  cloud_provider: string;
  business_owner: string;
  team: string;
  application: string;
  creation_date: string | null;
  expiration_date: string | null;
  last_rotation: string | null;
  next_rotation: string | null;
  compliance_status: string;
  risk_score: number;
  health_status: string;
  tags: string[];
  region: string;
  encryption_algorithm: string;
  key_size: string;
}

interface Facets {
  asset_type: string[];
  environment: string[];
  cloud_provider: string[];
  compliance_status: string[];
  health_status: string[];
  team: string[];
  business_owner: string[];
}

interface DependencyInfo {
  depends_on: { id: number; asset_name: string; asset_type: string; health_status: string; relationship: string }[];
  used_by:    { id: number; asset_name: string; asset_type: string; health_status: string; relationship: string }[];
}

const EMPTY_FACETS: Facets = {
  asset_type: [], environment: [], cloud_provider: [],
  compliance_status: [], health_status: [], team: [], business_owner: [],
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.round(diff / 86400000);
}
function healthColor(h: string) { return ({ Healthy: L.green, Warning: L.yellow, Critical: L.red }[h] ?? L.text3); }
function healthBg(h: string) { return ({ Healthy: "#f0fdf4", Warning: "#fffbeb", Critical: "#fff5f5" }[h] ?? L.subtleBg); }
function complianceVariant(c: string): any {
  return c === "Compliant" ? "green" : c === "Pending Review" ? "yellow" : c === "Non-Compliant" ? "red" : "gray";
}
function riskColor(score: number) {
  if (score >= 75) return L.red;
  if (score >= 40) return L.yellow;
  return L.green;
}

const SORT_COLUMNS: { key: string; label: string }[] = [
  { key: "asset_name", label: "ASSET" },
  { key: "asset_type", label: "TYPE" },
  { key: "environment", label: "ENV" },
  { key: "business_owner", label: "OWNER" },
  { key: "team", label: "TEAM" },
  { key: "compliance_status", label: "COMPLIANCE" },
  { key: "health_status", label: "HEALTH" },
  { key: "risk_score", label: "RISK" },
  { key: "next_rotation", label: "NEXT ROTATION" },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CryptoAssetInventory() {
  const mobile = useMobile();

  const [assets, setAssets]           = useState<CryptoAsset[]>([]);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [page, setPage]               = useState(1);
  const [pageSize]                    = useState(25);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState(false);

  const [query, setQuery]                       = useState("");
  const [debouncedQuery, setDebouncedQuery]     = useState("");
  const [assetType, setAssetType]               = useState("");
  const [environment, setEnvironment]           = useState("");
  const [cloudProvider, setCloudProvider]       = useState("");
  const [complianceStatus, setComplianceStatus] = useState("");
  const [healthStatus, setHealthStatus]         = useState("");
  const [sortBy, setSortBy]                     = useState("risk_score");
  const [sortDir, setSortDir]                   = useState<"asc" | "desc">("desc");

  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);

  const [expandedId, setExpandedId]     = useState<number | null>(null);
  const [deps, setDeps]                 = useState<Record<number, DependencyInfo>>({});
  const [depsLoading, setDepsLoading]   = useState<number | null>(null);

  // Lightweight aggregate counts for the metric cards — piggybacks on the
  // same paginated endpoint (page_size=1) since it already returns `total`
  // for whatever filter combination is passed.
  const [counts, setCounts] = useState({ total: 0, critical: 0, nonCompliant: 0, overdueRotation: 0 });
  const [countsLoading, setCountsLoading] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounce search input ──────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Reset to page 1 whenever a filter changes
  useEffect(() => { setPage(1); }, [debouncedQuery, assetType, environment, cloudProvider, complianceStatus, healthStatus, sortBy, sortDir]);

  // ── Fetch facets once ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/crypto-assets/facets`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setFacets(d); })
      .catch(() => {});
  }, []);

  // ── Fetch metric counts whenever filters unrelated to health/compliance change ──
  useEffect(() => {
    setCountsLoading(true);
    const base = new URLSearchParams({ page: "1", page_size: "1" });
    if (debouncedQuery) base.set("q", debouncedQuery);
    if (assetType) base.set("asset_type", assetType);
    if (environment) base.set("environment", environment);
    if (cloudProvider) base.set("cloud_provider", cloudProvider);

    const withParam = (key: string, val: string) => {
      const p = new URLSearchParams(base);
      p.set(key, val);
      return p;
    };

    Promise.all([
      fetch(`${API}/crypto-assets?${base.toString()}`).then(r => r.ok ? r.json() : { total: 0 }),
      fetch(`${API}/crypto-assets?${withParam("health_status", "Critical").toString()}`).then(r => r.ok ? r.json() : { total: 0 }),
      fetch(`${API}/crypto-assets?${withParam("compliance_status", "Non-Compliant").toString()}`).then(r => r.ok ? r.json() : { total: 0 }),
    ]).then(([totalRes, criticalRes, nonCompliantRes]) => {
      setCounts({
        total: totalRes.total ?? 0,
        critical: criticalRes.total ?? 0,
        nonCompliant: nonCompliantRes.total ?? 0,
        overdueRotation: 0, // computed client-side below from the current page as a lightweight proxy
      });
    }).catch(() => {}).finally(() => setCountsLoading(false));
  }, [debouncedQuery, assetType, environment, cloudProvider]);

  // ── Fetch assets ──────────────────────────────────────────────────────────
  const loadAssets = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (assetType) params.set("asset_type", assetType);
      if (environment) params.set("environment", environment);
      if (cloudProvider) params.set("cloud_provider", cloudProvider);
      if (complianceStatus) params.set("compliance_status", complianceStatus);
      if (healthStatus) params.set("health_status", healthStatus);

      const res = await fetch(`${API}/crypto-assets?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAssets(data.assets ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 1);
    } catch {
      setFetchError(true);
      setAssets([]);
      setTotal(0);
      setTotalPages(1);
    }
    setLoading(false);
  }, [page, pageSize, sortBy, sortDir, debouncedQuery, assetType, environment, cloudProvider, complianceStatus, healthStatus]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("desc"); }
  };

  const toggleExpand = async (a: CryptoAsset) => {
    if (expandedId === a.id) { setExpandedId(null); return; }
    setExpandedId(a.id);
    if (!deps[a.id]) {
      setDepsLoading(a.id);
      try {
        const res = await fetch(`${API}/crypto-assets/${a.id}/dependencies`);
        if (res.ok) {
          const d = await res.json();
          setDeps(prev => ({ ...prev, [a.id]: d }));
        }
      } catch {}
      setDepsLoading(null);
    }
  };

  const clearFilters = () => {
    setQuery(""); setAssetType(""); setEnvironment(""); setCloudProvider("");
    setComplianceStatus(""); setHealthStatus("");
  };

  const activeFilterCount = [assetType, environment, cloudProvider, complianceStatus, healthStatus].filter(Boolean).length;
  const expiringSoonOnPage = assets.filter(a => {
    const d = daysUntil(a.next_rotation);
    return d !== null && d <= 14;
  }).length;

  const selectSt = { ...LS.input, cursor: "pointer" as const };

  return (
    <div style={LS.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.panelBorder};border-radius:3px;}
        select option { background: ${L.panelBg}; color: ${L.text1}; }
      `}</style>

      {/* ── API STATUS BAR ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 7, fontFamily: "'DM Mono',monospace", color: L.text4, letterSpacing: ".08em" }}>API</span>
          <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: fetchError ? L.red : L.green, fontWeight: 600 }}>
            {fetchError ? "✗" : "✓"} {API}
          </span>
          <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: L.cyan, background: `${L.cyan}10`, border: `1px solid ${L.cyan}44`, borderRadius: 3, padding: "2px 6px", letterSpacing: ".04em" }}>
            → /crypto-assets
          </span>
          {fetchError && <span style={{ fontSize: 8, color: L.red }}>— request failed</span>}
          {loading && <span style={{ fontSize: 8, color: L.blue }}>fetching…</span>}
        </div>
      </div>

      {/* ── METRICS ── */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 8 : 9 }}>
        <LMetricCard label="TOTAL CRYPTO ASSETS" value={counts.total} sub="Across all types" color={L.blue} loading={countsLoading} />
        <LMetricCard label="CRITICAL HEALTH" value={counts.critical} sub="Needs immediate action" color={L.red} loading={countsLoading} />
        <LMetricCard label="NON-COMPLIANT" value={counts.nonCompliant} sub="Failing a control" color={L.orange} loading={countsLoading} />
        <LMetricCard label="ROTATION DUE (this page)" value={expiringSoonOnPage} sub="Within 14 days" color={L.yellow} loading={loading} />
      </div>

      {/* ── ASSET TABLE ── */}
      <LPanel>
        <LPanelHeader
          left="CRYPTO ASSET INVENTORY"
          right={
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search name / owner / app..."
                style={{ ...LS.input, width: mobile ? 130 : 190 }}
              />
              <select value={assetType} onChange={e => setAssetType(e.target.value)} style={selectSt}>
                <option value="">All Types</option>
                {facets.asset_type.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={environment} onChange={e => setEnvironment(e.target.value)} style={selectSt}>
                <option value="">All Envs</option>
                {facets.environment.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={cloudProvider} onChange={e => setCloudProvider(e.target.value)} style={selectSt}>
                <option value="">All Clouds</option>
                {facets.cloud_provider.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={complianceStatus} onChange={e => setComplianceStatus(e.target.value)} style={selectSt}>
                <option value="">All Compliance</option>
                {facets.compliance_status.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={healthStatus} onChange={e => setHealthStatus(e.target.value)} style={selectSt}>
                <option value="">All Health</option>
                {facets.health_status.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} style={{ ...LS.btn, color: L.red, borderColor: `${L.red}40`, background: `${L.red}0d` }}>
                  Clear ({activeFilterCount})
                </button>
              )}
            </div>
          }
        />

        {/* Mobile cards */}
        {mobile ? (
          <div style={{ maxHeight: 460, overflowY: "auto" }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}` }}>
                  <Shimmer w="60%" h={12} style={{ marginBottom: 6 }} />
                  <Shimmer w="40%" h={9} />
                </div>
              ))
            ) : assets.length ? (
              assets.map(a => {
                const isOpen = expandedId === a.id;
                return (
                  <div key={a.id}>
                    <div onClick={() => toggleExpand(a)} style={{ padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: L.blue, fontWeight: 600 }}>{a.asset_name}</span>
                        <span style={{ fontSize: 7, fontWeight: 700, color: healthColor(a.health_status), border: `1px solid ${healthColor(a.health_status)}44`, borderRadius: 2, padding: "1px 5px", background: healthBg(a.health_status) }}>{a.health_status}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                        <Badge v="gray">{a.asset_type}</Badge>
                        <Badge v={complianceVariant(a.compliance_status)}>{a.compliance_status}</Badge>
                      </div>
                      <div style={{ fontSize: 9, color: L.text3, fontFamily: "'DM Mono',monospace" }}>
                        {a.team} · Risk {a.risk_score} · Next rotation {fmtDate(a.next_rotation)}
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ padding: "10px 14px", background: L.insetBg, borderBottom: `1px solid ${L.borderLight}` }}>
                        <DependencyPanel deps={deps[a.id]} loading={depsLoading === a.id} />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: 20, fontSize: 10, color: L.text3, textAlign: "center" }}>No crypto assets found</div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
              <thead>
                <tr style={{ background: L.subtleBg, borderBottom: `2px solid ${L.panelBorder}` }}>
                  {SORT_COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      style={{ padding: "7px 8px", fontSize: 8, fontWeight: 700, color: sortBy === col.key ? L.blue : L.text3, textTransform: "uppercase" as const, letterSpacing: ".08em", textAlign: "left", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}
                    >
                      {col.label}{sortBy === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    </th>
                  ))}
                  <th style={{ padding: "7px 8px", fontSize: 8 }} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }}>
                      {SORT_COLUMNS.map((_, j) => (
                        <td key={j} style={{ padding: "10px 8px" }}><Shimmer w={j === 0 ? 140 : 60} h={9} /></td>
                      ))}
                      <td />
                    </tr>
                  ))
                ) : assets.length ? (
                  assets.map((a, i) => {
                    const isOpen = expandedId === a.id;
                    const rowBg = i % 2 === 0 ? L.panelBg : L.subtleBg;
                    const rotDays = daysUntil(a.next_rotation);
                    return (
                      <React.Fragment key={a.id}>
                        <tr
                          style={{ borderBottom: `1px solid ${L.borderLight}`, background: rowBg }}
                          onMouseEnter={e => (e.currentTarget.style.background = L.insetBg)}
                          onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                        >
                          <td style={{ padding: "8px 8px" }}>
                            <div style={{ fontSize: 10, color: L.blue, fontWeight: 600 }}>{a.asset_name}</div>
                            <div style={{ fontSize: 8, color: L.text4 }}>{a.application || "—"}</div>
                          </td>
                          <td style={{ padding: "8px 8px" }}>
                            <span style={{ fontSize: 8, color: L.text3, background: L.insetBg, border: `1px solid ${L.panelBorder}`, borderRadius: 3, padding: "1px 5px", fontWeight: 600 }}>{a.asset_type}</span>
                          </td>
                          <td style={{ padding: "8px 8px", fontSize: 9, color: L.text2 }}>{a.environment}</td>
                          <td style={{ padding: "8px 8px" }}>
                            <div style={{ fontSize: 9, color: L.text2, fontWeight: 500 }}>{a.business_owner || "—"}</div>
                          </td>
                          <td style={{ padding: "8px 8px", fontSize: 9, color: L.text3 }}>{a.team || "—"}</td>
                          <td style={{ padding: "8px 8px" }}>
                            <Badge v={complianceVariant(a.compliance_status)}>{a.compliance_status}</Badge>
                          </td>
                          <td style={{ padding: "8px 8px" }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: healthColor(a.health_status), border: `1px solid ${healthColor(a.health_status)}44`, borderRadius: 3, padding: "1px 6px", background: healthBg(a.health_status) }}>{a.health_status}</span>
                          </td>
                          <td style={{ padding: "8px 8px", fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: riskColor(a.risk_score) }}>{a.risk_score}</td>
                          <td style={{ padding: "8px 8px", fontSize: 9, fontFamily: "'DM Mono',monospace", color: rotDays !== null && rotDays < 0 ? L.red : rotDays !== null && rotDays <= 14 ? L.orange : L.text3 }}>
                            {fmtDate(a.next_rotation)}
                          </td>
                          <td style={{ padding: "8px 8px" }}>
                            <button
                              onClick={() => toggleExpand(a)}
                              style={{ ...LS.btn, fontSize: 8, padding: "2px 7px", background: isOpen ? `${L.blue}15` : L.subtleBg, color: isOpen ? L.blue : L.text3, borderColor: isOpen ? `${L.blue}40` : L.panelBorder }}
                            >{isOpen ? "▲" : "▼"}</button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr style={{ background: L.insetBg }}>
                            <td colSpan={SORT_COLUMNS.length + 1} style={{ padding: "0 12px 12px" }}>
                              <div style={{ background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 6, padding: 12, marginTop: 4, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
                                  {[
                                    { label: "CLOUD PROVIDER", val: a.cloud_provider || "—" },
                                    { label: "REGION",         val: a.region || "—" },
                                    { label: "ALGORITHM",      val: a.encryption_algorithm || "—" },
                                    { label: "KEY SIZE",       val: a.key_size || "—" },
                                    { label: "CREATED",        val: fmtDate(a.creation_date) },
                                    { label: "EXPIRES",        val: fmtDate(a.expiration_date) },
                                    { label: "LAST ROTATION",  val: fmtDate(a.last_rotation) },
                                    { label: "TAGS",           val: a.tags?.length ? a.tags.join(", ") : "—" },
                                  ].map(item => (
                                    <div key={item.label}>
                                      <div style={{ fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase" as const, fontWeight: 600 }}>{item.label}</div>
                                      <div style={{ fontSize: 10, color: L.text2, fontFamily: "'DM Mono',monospace", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.val}</div>
                                    </div>
                                  ))}
                                </div>
                                <DependencyPanel deps={deps[a.id]} loading={depsLoading === a.id} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={SORT_COLUMNS.length + 1} style={{ padding: "20px", fontSize: 10, color: L.text3, textAlign: "center" }}>No crypto assets found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Pagination */}
        <div style={{ padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, background: L.subtleBg, borderRadius: "0 0 8px 8px" }}>
          {loading ? (
            <Shimmer w={200} h={10} />
          ) : (
            <span style={{ fontSize: 10, color: L.text2 }}>
              Showing <b style={{ color: L.text1 }}>{assets.length}</b> of{" "}
              <b style={{ color: L.text1 }}>{total}</b> assets
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ ...LS.btn, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? "not-allowed" : "pointer" }}
            >‹ Prev</button>
            <span style={{ fontSize: 10, color: L.text3 }}>Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ ...LS.btn, opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
            >Next ›</button>
          </div>
        </div>
      </LPanel>
    </div>
  );
}

// ── Dependency sub-panel ────────────────────────────────────────────────────
function DependencyPanel({ deps, loading }: { deps: DependencyInfo | undefined; loading: boolean }) {
  if (loading) {
    return <Shimmer w={220} h={10} />;
  }
  if (!deps || (deps.depends_on.length === 0 && deps.used_by.length === 0)) {
    return <div style={{ fontSize: 9, color: L.text4 }}>No dependency links recorded for this asset.</div>;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div>
        <div style={{ fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 6, textTransform: "uppercase" as const, fontWeight: 600 }}>Depends On</div>
        {deps.depends_on.length === 0
          ? <div style={{ fontSize: 9, color: L.text4 }}>—</div>
          : deps.depends_on.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: healthColor(d.health_status), flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: L.blue }}>{d.asset_name}</span>
                <span style={{ fontSize: 8, color: L.text4 }}>({d.asset_type})</span>
              </div>
            ))
        }
      </div>
      <div>
        <div style={{ fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 6, textTransform: "uppercase" as const, fontWeight: 600 }}>Used By</div>
        {deps.used_by.length === 0
          ? <div style={{ fontSize: 9, color: L.text4 }}>—</div>
          : deps.used_by.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: healthColor(d.health_status), flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: L.blue }}>{d.asset_name}</span>
                <span style={{ fontSize: 8, color: L.text4 }}>({d.asset_type})</span>
              </div>
            ))
        }
      </div>
    </div>
  );
}