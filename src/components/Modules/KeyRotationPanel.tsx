/**
 * KeyRotationPanel.tsx
 * REBEL — Key Rotation proof-of-rotation audit panel
 * + Asset domain filter  + full mobile responsiveness
 * PDF export via exportKRPDF.ts (download, not new tab)
 */

import { useState, useEffect, useCallback } from "react";
import { exportKRPDF } from "./exportKRPDF.js";

// ── Shared types ──────────────────────────────────────────────────────────────
export interface KRRecord {
  asset_id:            string;
  key_identifier:      string;
  key_type:            string;
  days_since_rotation: number | null;
  last_rotated_at?:    string | null;
  rotation_source:     string;
  status:              KRStatus;
  regulatory_flags:    string[];
  attestation_hash:    string;
  remediation_cost?:   number;
  remediation_days?:   number;
}

export type KRStatus = "COMPLIANT" | "OVERDUE" | "CRITICAL" | "NEVER_ROTATED" | "UNKNOWN";

export interface KRSummary {
  total_keys:          number;
  compliant:           number;
  overdue:             number;
  critical:            number;
  never_rotated:       number;
  unknown:             number;
  overall_risk:        "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  frameworks_breached: string[];
}

export interface KRScanResult {
  scan_id:     string;
  target:      string;
  scanned_at?: string;
  summary:     KRSummary;
  records:     KRRecord[];
}

interface RawAsset {
  id?:              string;
  name?:            string;
  type?:            string;
  cipher?:          string;
  last_rotated_at?: string | null;
  rotation_source?: string;
  evidence_path?:   string;
}

// ── Breakpoint hook ───────────────────────────────────────────────────────────
function useBreakpoint() {
  const get = () => {
    const w = window.innerWidth;
    if (w < 480) return "mobile" as const;
    if (w < 900) return "tablet" as const;
    return "desktop" as const;
  };
  const [bp, setBp] = useState<"mobile" | "tablet" | "desktop">(get);
  useEffect(() => {
    const h = () => setBp(get);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return bp;
}

// ── Theme ─────────────────────────────────────────────────────────────────────
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
  border: "#e2e8f0",
} as const;

const LS = {
  panel: {
    background:   L.panelBg,
    border:       `1px solid ${L.panelBorder}`,
    borderRadius: 8,
    boxShadow:    "0 1px 4px rgba(0,0,0,0.06)",
  },
  btn: {
    background:    L.subtleBg,
    border:        `1px solid ${L.border}`,
    borderRadius:  4,
    color:         L.text2,
    padding:       "5px 11px",
    cursor:        "pointer" as const,
    fontSize:      11,
    fontWeight:    600,
    letterSpacing: ".06em",
    fontFamily:    "inherit",
  },
  input: {
    background:   L.insetBg,
    border:       `1px solid ${L.border}`,
    borderRadius: 5,
    color:        L.text1,
    padding:      "7px 10px",
    fontSize:     12,
    outline:      "none",
    fontFamily:   "inherit",
    width:        "100%",
  },
} as const;

// ── Cache config ──────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_KEY_KR = "rebel_cache_kr_scan";

function cacheGet(key: string): KRScanResult | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { ts: number; data: KRScanResult };
    if (Date.now() - entry.ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
    return entry.data;
  } catch { return null; }
}
function cacheSet(key: string, data: KRScanResult): void {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}
function cacheAgeLabel(key: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { ts: number };
    const mins = Math.round((Date.now() - entry.ts) / 60000);
    return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
  } catch { return null; }
}

// ── Domain filter helpers ─────────────────────────────────────────────────────
function normaliseDomain(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}
function keyMatchesDomain(keyId: string, domain: string): boolean {
  if (!domain) return true;
  const k = keyId.toLowerCase();
  const d = normaliseDomain(domain);
  return k.includes(d) || d.split(".").some(part => part.length > 2 && k.includes(part));
}

// ── Status maps ───────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<KRStatus, string> = {
  COMPLIANT:     L.green,
  OVERDUE:       L.orange,
  CRITICAL:      L.red,
  NEVER_ROTATED: L.red,
  UNKNOWN:       L.text3,
};
const STATUS_BG: Record<KRStatus, string> = {
  COMPLIANT:     "#f0fdf4",
  OVERDUE:       "#fff7ed",
  CRITICAL:      "#fef2f2",
  NEVER_ROTATED: "#fef2f2",
  UNKNOWN:       L.subtleBg,
};
const STATUS_LABEL: Record<KRStatus, string> = {
  COMPLIANT:     "Compliant",
  OVERDUE:       "Overdue",
  CRITICAL:      "Critical",
  NEVER_ROTATED: "Never rotated",
  UNKNOWN:       "Unknown",
};

// ── Asset mapper ──────────────────────────────────────────────────────────────
interface KRAssetInput {
  asset_id:        string;
  key_type:        string;
  key_identifier:  string;
  last_rotated_at: string | null;
  rotation_source: string;
  evidence_path:   string;
}
function toKRAssets(assets: RawAsset[]): KRAssetInput[] {
  return (assets || []).map((a) => ({
    asset_id:        a.id   ?? a.name ?? "unknown",
    key_type:        a.type === "HSM"          ? "HSM"
                   : a.type === "Database"     ? "DATABASE"
                   : a.cipher?.includes("TLS") ? "TLS_CERT"
                   : "APP_CONFIG",
    key_identifier:  a.name ?? a.id ?? "unknown",
    last_rotated_at: a.last_rotated_at ?? null,
    rotation_source: a.rotation_source ?? (a.last_rotated_at ? "CERT_META" : "NONE"),
    evidence_path:   a.evidence_path ?? "N/A",
  }));
}

// ── Shared small components ───────────────────────────────────────────────────
function Shimmer({ w = "100%", h = 16, radius = 4, style = {} }: {
  w?: number | string; h?: number; radius?: number; style?: React.CSSProperties;
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

function LPanelHeader({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`,
      background: L.subtleBg, borderRadius: "8px 8px 0 0",
      flexWrap: "wrap", gap: 8,
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" }}>
        {left}
      </span>
      {right}
    </div>
  );
}

function StatusBadge({ status }: { status: KRStatus }) {
  const color = STATUS_COLOR[status] ?? L.text3;
  const bg    = STATUS_BG[status]    ?? L.subtleBg;
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span style={{
      fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em",
      padding: "2px 6px", border: `1px solid ${color}44`, borderRadius: 3,
      color, background: bg, display: "inline-block",
    }}>
      {label}
    </span>
  );
}

function RegBadge({ text }: { text: string }) {
  return (
    <span style={{
      fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em",
      padding: "2px 5px", border: `1px solid ${L.red}44`, borderRadius: 3,
      color: L.red, background: "#fef2f2", display: "inline-block",
    }}>
      {text}
    </span>
  );
}

function CacheBadge({ age, onRefresh }: { age: string | null; onRefresh: () => void }) {
  if (!age) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        fontSize: 8, fontWeight: 600, color: L.text3, background: L.insetBg,
        border: `1px solid ${L.border}`, borderRadius: 3, padding: "2px 7px", letterSpacing: ".06em",
      }}>
        CACHED · {age}
      </span>
      <button
        onClick={onRefresh}
        style={{ ...LS.btn, fontSize: 9, padding: "3px 8px", color: L.blue, borderColor: `${L.blue}40`, background: `${L.blue}0d` }}
      >
        ↺ REFRESH
      </button>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function SkeletonSummaryStrip({ cols }: { cols: number }) {
  return (
    <div style={{ display: "flex", borderBottom: `1px solid ${L.border}`, overflowX: "auto" }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} style={{
          flex: 1, minWidth: 60, padding: "10px 12px",
          borderRight: i < cols - 1 ? `1px solid ${L.border}` : "none",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        }}>
          <Shimmer w={40} h={7} />
          <Shimmer w={28} h={20} />
        </div>
      ))}
    </div>
  );
}

function SkeletonTableRows({ count = 5, cols = 7 }: { count?: number; cols?: number }) {
  const widths = [130, 70, 40, 80, 60, 80, 110];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} style={{ borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: "8px" }}>
              <Shimmer w={widths[j] ?? 60} h={j === 4 || j === 5 ? 18 : 9} radius={j === 4 || j === 5 ? 3 : 4} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Status filter pill ────────────────────────────────────────────────────────
function FilterPill({
  label, active, color, bg, count, onClick,
}: {
  label: string; active: boolean; color: string; bg: string; count: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "3px 9px", borderRadius: 20, cursor: "pointer",
        border: `1px solid ${active ? color : L.border}`,
        background: active ? bg : L.panelBg,
        fontSize: 9, fontWeight: 700, color: active ? color : L.text3,
        letterSpacing: ".07em", textTransform: "uppercase",
        transition: "all 0.15s",
      }}
    >
      {label}
      <span style={{
        fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 800,
        background: active ? color : L.insetBg, color: active ? "#fff" : L.text3,
        borderRadius: 10, padding: "0 5px", minWidth: 18, textAlign: "center",
      }}>
        {count}
      </span>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface KeyRotationPanelProps {
  assets?:     RawAsset[];
  apiBase?:    string;
  clientName?: string;
  style?:      React.CSSProperties;
}

export default function KeyRotationPanel({
  assets,
  apiBase = "",
  clientName = "",
  style = {},
}: KeyRotationPanelProps) {
  const bp       = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const [result,            setResult]            = useState<KRScanResult | null>(null);
  const [loading,           setLoading]           = useState<boolean>(true);
  const [error,             setError]             = useState<boolean>(false);
  const [tableOpen,         setTableOpen]         = useState<boolean>(true);
  const [fromCache,         setFromCache]         = useState<boolean>(false);
  const [cachedAt,          setCachedAt]          = useState<string | null>(null);
  const [secureModeOn,      setSecureModeOn]      = useState<boolean>(false);
  const [secureModeLoading, setSecureModeLoading] = useState<boolean>(true);
  const [pdfExporting,      setPdfExporting]      = useState<boolean>(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [domainInput,    setDomainInput]    = useState("");
  const [activeDomain,   setActiveDomain]   = useState("");
  const [activeClientName, setActiveClientName] = useState("");
  const [statusFilter,   setStatusFilter]   = useState<KRStatus | "ALL">("ALL");
  const [sourceFilter,   setSourceFilter]   = useState<string>("ALL");

  // ── Secure mode status ────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${apiBase}/secure-mode/status`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { enabled?: boolean } | null) => {
        if (d?.enabled !== undefined) setSecureModeOn(Boolean(d.enabled));
      })
      .catch(() => {})
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

    const sourceAssets: RawAsset[] = secureModeOn
      ? await fetch(`${apiBase}/ghost/assets`)
          .then(r => r.ok ? r.json() : null)
          .then(d => Array.isArray(d?.assets) ? d.assets : [])
          .catch(() => [])
      : (Array.isArray(assets) ? assets : []);

    try {
      const res = await fetch(`${apiBase}/api/key-rotation/scan`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ target: "rebel-scan", assets: toKRAssets(sourceAssets) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: KRScanResult = await res.json();
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
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [secureModeOn, apiBase, assets]);

  useEffect(() => {
    if (!secureModeLoading) loadKR();
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
  function handleExportPDF() {
    if (!result || pdfExporting) return;
    setPdfExporting(true);
    try {
      exportKRPDF(result, {
        clientName:   activeClientName || clientName || "",
        clientDomain: activeDomain || result.target || "",
      });
    } finally {
      setTimeout(() => setPdfExporting(false), 1200);
    }
  }

  // ── Derived + filtered records ────────────────────────────────────────────
  const s         = result?.summary;
  const critCount = (s?.critical ?? 0) + (s?.never_rotated ?? 0);
  const riskColor = s?.overall_risk === "CRITICAL" ? L.red
                  : s?.overall_risk === "HIGH"     ? L.orange
                  : s?.overall_risk === "MEDIUM"   ? L.yellow
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

  // Counts for filter pills (against domain-filtered only, not status-filtered)
  const statusCounts: Record<string, number> = {
    ALL:           domainFiltered.length,
    COMPLIANT:     domainFiltered.filter(r => r.status === "COMPLIANT").length,
    OVERDUE:       domainFiltered.filter(r => r.status === "OVERDUE").length,
    CRITICAL:      domainFiltered.filter(r => r.status === "CRITICAL" || r.status === "NEVER_ROTATED").length,
    NEVER_ROTATED: domainFiltered.filter(r => r.status === "NEVER_ROTATED").length,
    UNKNOWN:       domainFiltered.filter(r => r.status === "UNKNOWN").length,
  };

  const activeEndpointLabel = secureModeOn ? "→ /ghost/assets" : "→ /api/key-rotation/scan";

  // ── PDF button style ──────────────────────────────────────────────────────
  const pdfBtnStyle = (compact = false): React.CSSProperties => ({
    ...LS.btn,
    fontSize:    compact ? 9 : 10,
    padding:     compact ? "3px 9px" : "5px 12px",
    color:       !result ? L.text4 : L.blue,
    borderColor: !result ? L.border : `${L.blue}40`,
    background:  !result ? L.subtleBg : `${L.blue}0d`,
    fontWeight:  700,
    opacity:     !result ? 0.45 : 1,
    cursor:      !result ? "not-allowed" : "pointer",
    display:     "flex",
    alignItems:  "center",
    gap:         4,
    transition:  "opacity 0.15s, background 0.15s",
  });

  // ── Risk distribution denominator uses domain-filtered ────────────────────
  const distTotal  = domainFiltered.length || 1;
  const distCrit   = domainFiltered.filter(r => r.status === "CRITICAL" || r.status === "NEVER_ROTATED").length;
  const distOver   = domainFiltered.filter(r => r.status === "OVERDUE").length;
  const distComp   = domainFiltered.filter(r => r.status === "COMPLIANT").length;
  const distUnk    = domainFiltered.filter(r => r.status === "UNKNOWN").length;

  // ── Responsive column counts ──────────────────────────────────────────────
  const distCols    = isMobile ? "1fr 1fr" : "repeat(4,1fr)";
  const summaryItems: [string, number, string][] = [
    ["Total",     domainFiltered.length, L.blue],
    ["Compliant", distComp,              L.green],
    ["Overdue",   distOver,              L.orange],
    ["Critical",  distCrit,              L.red],
    ["Unknown",   distUnk,              L.text3],
  ];

  return (
    <div style={{
      background: L.pageBg, minHeight: "100vh", padding: isMobile ? "12px 10px" : "20px 16px",
      display: "flex", flexDirection: "column", gap: isMobile ? 8 : 12,
      fontFamily: "'DM Sans', system-ui, sans-serif", color: L.text1,
      ...style,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin     { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar       { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:${L.insetBg}; }
        ::-webkit-scrollbar-thumb { background:${L.border}; border-radius:3px; }
        input:focus { border-color: ${L.blue} !important; box-shadow: 0 0 0 2px ${L.blue}20; }
      `}</style>

      {/* ── SECURE MODE BANNER ── */}
      {secureModeOn && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
          background: `${L.purple}0d`, border: `1px solid ${L.purple}44`, borderRadius: 6,
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 9, color: L.purple, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>
            🔒 SECURE MODE ACTIVE
          </span>
          <span style={{ fontSize: 9, color: L.purple, opacity: 0.75 }}>·</span>
          <span style={{ fontSize: 9, color: L.purple, fontFamily: "'DM Mono', monospace" }}>
            /ghost/assets — anonymised data
          </span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FILTER PANEL
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ ...LS.panel }}>
        <LPanelHeader
          left="SCOPE — KEY FILTER"
          right={fromCache ? <CacheBadge age={cachedAt} onRefresh={handleRefresh} /> : undefined}
        />
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Domain + client name row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}>
            {/* Domain filter */}
            <div>
              <div style={{ fontSize: 8, color: L.text3, letterSpacing: ".12em", marginBottom: 5, textTransform: "uppercase", fontWeight: 600 }}>
                KEY SCOPE / DOMAIN
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && applyDomainFilter()}
                  placeholder="e.g. payments.acmebank.com"
                  style={{ ...LS.input, flex: 1 }}
                />
                <button
                  onClick={applyDomainFilter}
                  style={{ ...LS.btn, background: `${L.blue}15`, borderColor: `${L.blue}40`, color: L.blue, whiteSpace: "nowrap" }}
                >
                  APPLY
                </button>
                {activeDomain && (
                  <button onClick={clearFilter} style={{ ...LS.btn, whiteSpace: "nowrap" }}>
                    CLEAR
                  </button>
                )}
              </div>
            </div>

            {/* Client name (for PDF) */}
            <div>
              <div style={{ fontSize: 8, color: L.text3, letterSpacing: ".12em", marginBottom: 5, textTransform: "uppercase", fontWeight: 600 }}>
                CLIENT NAME (PDF HEADER)
              </div>
              <input
                value={activeClientName}
                onChange={e => setActiveClientName(e.target.value)}
                placeholder="e.g. Acme Bank PLC"
                style={{ ...LS.input }}
              />
            </div>
          </div>

          {/* Active scope banner */}
          {activeDomain && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              background: `${L.blue}0a`, border: `1px solid ${L.blue}25`,
              borderRadius: 5, padding: "7px 12px",
            }}>
              <span style={{ fontSize: 9, color: L.text3, fontWeight: 600 }}>ACTIVE SCOPE</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: L.blue, fontWeight: 600 }}>
                *{normaliseDomain(activeDomain) ? `.${normaliseDomain(activeDomain)}` : ""}
              </span>
              <span style={{ fontSize: 9, color: L.text3, marginLeft: "auto" }}>
                <b style={{ color: L.text1 }}>{domainFiltered.length}</b> of {allRecords.length} keys matched
              </span>
            </div>
          )}

          {/* No match warning */}
          {activeDomain && domainFiltered.length === 0 && !loading && (
            <div style={{
              background: `${L.red}0a`, border: `1px solid ${L.red}25`, borderRadius: 5,
              padding: "8px 12px", fontSize: 10, color: L.text2,
            }}>
              ⚠ No keys matched <b style={{ color: L.red }}>*.{normaliseDomain(activeDomain)}</b> — try a shorter term or check the key identifier format.
            </div>
          )}

          {/* Status filter pills */}
          {!loading && result && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 8, color: L.text4, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", marginRight: 2 }}>
                STATUS
              </span>
              {(["ALL", "COMPLIANT", "OVERDUE", "CRITICAL", "UNKNOWN"] as const).map(st => {
                const color = st === "ALL" ? L.blue : STATUS_COLOR[st as KRStatus] ?? L.text3;
                const bg    = st === "ALL" ? "#eff6ff" : STATUS_BG[st as KRStatus]  ?? L.subtleBg;
                const count = st === "CRITICAL"
                  ? statusCounts["CRITICAL"]
                  : statusCounts[st] ?? 0;
                return (
                  <FilterPill
                    key={st}
                    label={st === "ALL" ? "All" : STATUS_LABEL[st as KRStatus] ?? st}
                    active={statusFilter === st}
                    color={color}
                    bg={bg}
                    count={count}
                    onClick={() => setStatusFilter(prev => prev === st ? "ALL" : st)}
                  />
                );
              })}

              {/* Source filter */}
              {uniqueSources.length > 2 && (
                <>
                  <span style={{ fontSize: 8, color: L.text4, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", marginLeft: 8, marginRight: 2 }}>
                    SOURCE
                  </span>
                  <select
                    value={sourceFilter}
                    onChange={e => setSourceFilter(e.target.value)}
                    style={{
                      ...LS.input,
                      width: "auto", padding: "3px 8px", fontSize: 9,
                      fontWeight: 600, color: sourceFilter !== "ALL" ? L.blue : L.text2,
                      borderColor: sourceFilter !== "ALL" ? `${L.blue}50` : L.border,
                      cursor: "pointer",
                    }}
                  >
                    {uniqueSources.map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </>
              )}

              {/* Clear filters shortcut */}
              {(statusFilter !== "ALL" || sourceFilter !== "ALL") && (
                <button
                  onClick={() => { setStatusFilter("ALL"); setSourceFilter("ALL"); }}
                  style={{ ...LS.btn, fontSize: 9, padding: "2px 8px", color: L.text3 }}
                >
                  ✕ Clear filters
                </button>
              )}
            </div>
          )}

          {/* API status row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 7, fontFamily: "'DM Mono',monospace", color: L.text4, letterSpacing: ".08em" }}>API</span>
            <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700,
              color: error ? L.red : L.green }}>
              {error ? "✗" : "✓"} {apiBase || "(relative)"}
            </span>
            <span style={{
              fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700,
              color:      secureModeOn ? L.purple : L.cyan,
              background: secureModeOn ? `${L.purple}10` : `${L.cyan}10`,
              border:    `1px solid ${secureModeOn ? L.purple : L.cyan}44`,
              borderRadius: 3, padding: "2px 6px", letterSpacing: ".04em",
            }}>
              {activeEndpointLabel}
            </span>
            {error  && <span style={{ fontSize: 8, color: L.red }}>— check key_rotation_verifier.py</span>}
            {loading && <span style={{ fontSize: 8, color: L.blue }}>scanning…</span>}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SUMMARY PANEL
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ ...LS.panel }}>
        <LPanelHeader
          left="KEY ROTATION — PROOF-OF-ROTATION AUDIT"
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {s && (
                <span style={{
                  fontSize: 8, fontWeight: 700, color: riskColor,
                  background: `${riskColor}14`, border: `1px solid ${riskColor}44`,
                  borderRadius: 3, padding: "2px 7px",
                }}>
                  {s.overall_risk}
                </span>
              )}

              <button
                onClick={handleRefresh}
                disabled={loading}
                style={{ ...LS.btn, fontSize: 9, color: L.blue, borderColor: `${L.blue}40`, background: `${L.blue}0d` }}
              >
                {loading ? "Scanning…" : "⟳ Run KR Scan"}
              </button>

              <button
                onClick={handleExportPDF}
                disabled={!result || pdfExporting}
                title="Downloads audit HTML — open in browser → Save as PDF"
                style={pdfBtnStyle(true)}
              >
                {pdfExporting
                  ? <><span style={{ display: "inline-block", animation: "spin 0.7s linear infinite" }}>⟳</span>{!isMobile && " Exporting…"}</>
                  : <>{isMobile ? "⬇ PDF" : "⬇ AUDIT PDF"}</>
                }
              </button>
            </div>
          }
        />

        {/* Summary strip */}
        {loading
          ? <SkeletonSummaryStrip cols={isMobile ? 3 : 5} />
          : s && (
            <div style={{ display: "flex", borderBottom: `1px solid ${L.border}`, overflowX: "auto" }}>
              {(isMobile
                ? summaryItems.slice(0, 3)   // Total / Compliant / Critical on mobile
                : summaryItems
              ).map(([label, val, color], i, arr) => (
                <div key={label} style={{
                  flex: 1, minWidth: 60, padding: isMobile ? "8px 8px" : "10px 12px",
                  borderRight: i < arr.length - 1 ? `1px solid ${L.border}` : "none",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: isMobile ? 6 : 7, color: L.text3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 16 : 18, fontWeight: 800, color, lineHeight: 1 }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>
          )
        }

        {/* Regulatory breach chips */}
        {!loading && (s?.frameworks_breached ?? []).length > 0 && (
          <div style={{
            padding: "7px 14px", borderBottom: `1px solid ${L.border}`,
            background: `${L.red}08`, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
          }}>
            <span style={{ fontSize: 7.5, fontWeight: 700, color: L.red }}>Frameworks breached:</span>
            {s!.frameworks_breached.map((f: string) => <RegBadge key={f} text={f} />)}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: "10px 14px", fontSize: 9, color: L.red, background: "#fef2f2" }}>
            ✗ Failed to reach <code>/api/key-rotation/scan</code> — ensure <code>key_rotation_verifier.py</code> is registered.
          </div>
        )}

        {/* Empty */}
        {!result && !loading && !error && (
          <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 10, color: L.text3 }}>
            Click <strong style={{ color: L.blue }}>⟳ Run KR Scan</strong> to audit key rotation across all assets.
            <br />
            <span style={{ fontSize: 8, marginTop: 4, display: "block" }}>Cryptographic attestation — no spreadsheets.</span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          RISK DISTRIBUTION
      ══════════════════════════════════════════════════════════════════════ */}
      {(loading || result) && (
        <div style={{ ...LS.panel }}>
          <LPanelHeader left={activeDomain ? `RISK DISTRIBUTION — ${normaliseDomain(activeDomain)}` : "RISK DISTRIBUTION"} />
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: distCols, gap: 10 }}>
            {loading
              ? Array.from({ length: isMobile ? 2 : 4 }).map((_, i) => (
                  <div key={i} style={{ borderRadius: 6, padding: 12, border: `1px solid ${L.border}`, background: L.subtleBg }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <Shimmer w={55} h={9} /><Shimmer w={24} h={20} />
                    </div>
                    <Shimmer w="100%" h={4} radius={2} style={{ marginBottom: 8 }} />
                    <Shimmer w={60} h={8} />
                  </div>
                ))
              : ([
                  ["COMPLIANT", distComp, L.green,  "#f0fdf4", `${L.green}22`],
                  ["OVERDUE",   distOver, L.orange, "#fff7ed", `${L.orange}25`],
                  ["CRITICAL",  distCrit, L.red,    "#fef2f2", `${L.red}25`],
                  ["UNKNOWN",   distUnk,  L.text3,  L.subtleBg, L.border],
                ] as [string, number, string, string, string][]).map(([label, count, color, bg, borderColor]) => {
                  const pct = Math.round(count / distTotal * 100);
                  return (
                    <div key={label} style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: 6, padding: isMobile ? 10 : 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: isMobile ? 8 : 9, color, letterSpacing: ".12em", fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 14 : 16, color, fontWeight: 800 }}>{count}</span>
                      </div>
                      <div style={{ height: 4, background: `${color}20`, borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
                      </div>
                      <div style={{ fontSize: 8, color: L.text3, marginTop: 6 }}>{pct}% of {activeDomain ? "filtered" : "total"} keys</div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          KEY RECORDS TABLE
      ══════════════════════════════════════════════════════════════════════ */}
      {(loading || result) && (
        <div style={{ ...LS.panel }}>
          <LPanelHeader
            left={`KEY RECORDS${filteredRecords.length !== allRecords.length ? ` (${filteredRecords.length} of ${allRecords.length})` : ""}`}
            right={
              result && (
                <button
                  onClick={() => setTableOpen(o => !o)}
                  style={{ ...LS.btn, fontSize: 9, padding: "3px 9px" }}
                >
                  {tableOpen ? "▲ Hide" : "▼ Show"} {filteredRecords.length} keys
                </button>
              )
            }
          />

          {(loading || tableOpen) && (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif", minWidth: isMobile ? 500 : "auto" }}>
                <thead>
                  <tr style={{ background: L.subtleBg, borderBottom: `2px solid ${L.border}` }}>
                    {(isMobile
                      ? ["Key Identifier", "Days", "Status", "Flags"]
                      : ["Key Identifier", "Type", "Days Since", "Source", "Status", "Reg. Flags", "Attestation"]
                    ).map(h => (
                      <th key={h} style={{ padding: "7px 8px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? <SkeletonTableRows count={6} cols={isMobile ? 4 : 7} />
                    : filteredRecords.length === 0
                    ? (
                      <tr>
                        <td colSpan={isMobile ? 4 : 7} style={{ padding: "20px", textAlign: "center", fontSize: 10, color: L.text3 }}>
                          {statusFilter !== "ALL" || sourceFilter !== "ALL"
                            ? "No keys match the current filters."
                            : activeDomain
                            ? `No keys matched "*.${normaliseDomain(activeDomain)}".`
                            : "No records."
                          }
                        </td>
                      </tr>
                    )
                    : filteredRecords.map((r: KRRecord, i: number) => {
                        const sc   = STATUS_COLOR[r.status] ?? L.text3;
                        const days = r.days_since_rotation != null ? `${r.days_since_rotation}d` : "Never";
                        const rowBg = i % 2 === 0 ? L.panelBg : L.subtleBg;
                        return (
                          <tr
                            key={r.asset_id}
                            style={{ borderBottom: `1px solid ${L.borderLight}`, background: rowBg }}
                            onMouseEnter={e => (e.currentTarget.style.background = L.insetBg)}
                            onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                          >
                            <td style={{ padding: "7px 8px", color: L.blue, fontWeight: 600, fontFamily: "'DM Mono',monospace", fontSize: 9, maxWidth: isMobile ? 130 : 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {r.key_identifier}
                            </td>
                            {!isMobile && (
                              <td style={{ padding: "7px 8px" }}>
                                <span style={{ fontSize: 8, color: L.text3, background: L.insetBg, border: `1px solid ${L.border}`, borderRadius: 3, padding: "1px 5px", fontWeight: 600 }}>
                                  {r.key_type}
                                </span>
                              </td>
                            )}
                            <td style={{ padding: "7px 8px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: sc, fontSize: isMobile ? 9 : 10, whiteSpace: "nowrap" }}>
                              {days}
                            </td>
                            {!isMobile && (
                              <td style={{ padding: "7px 8px", fontSize: 9, color: L.text3, whiteSpace: "nowrap" }}>
                                {r.rotation_source}
                              </td>
                            )}
                            <td style={{ padding: "7px 8px" }}>
                              <StatusBadge status={r.status} />
                            </td>
                            <td style={{ padding: "7px 8px" }}>
                              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                                {r.regulatory_flags.map((f: string) => <RegBadge key={f} text={f} />)}
                                {r.regulatory_flags.length === 0 && (
                                  <span style={{ fontSize: 8, color: L.green, fontWeight: 600 }}>✓</span>
                                )}
                              </div>
                            </td>
                            {!isMobile && (
                              <td style={{ padding: "7px 8px", fontFamily: "'DM Mono',monospace", fontSize: 7, color: L.text4 }}>
                                {r.attestation_hash.slice(0, 16)}…
                              </td>
                            )}
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          )}

          {/* TABLE FOOTER */}
          <div style={{
            padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 8,
            background: L.subtleBg, borderRadius: "0 0 8px 8px",
          }}>
            {loading
              ? <Shimmer w={200} h={9} />
              : (
                <span style={{ fontSize: isMobile ? 9 : 10, color: L.text2 }}>
                  <b style={{ color: L.text1 }}>{filteredRecords.length}</b> keys ·{" "}
                  <b style={{ color: L.green }}>{filteredRecords.filter(r => r.status === "COMPLIANT").length}</b> compliant ·{" "}
                  <b style={{ color: L.red }}>{filteredRecords.filter(r => r.status === "CRITICAL" || r.status === "NEVER_ROTATED").length}</b> critical
                  {secureModeOn && (
                    <span style={{ marginLeft: 8, fontSize: 8, color: L.purple, fontWeight: 600 }}>· ghost mode</span>
                  )}
                </span>
              )
            }

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {result && !isMobile && (
                <span style={{ fontSize: 9, color: L.text3, fontFamily: "'DM Mono',monospace" }}>
                  Scan ID: {result.scan_id}
                </span>
              )}
              {result && (
                <button
                  onClick={handleExportPDF}
                  disabled={pdfExporting}
                  title="Downloads audit HTML — open in browser → Save as PDF"
                  style={pdfBtnStyle(false)}
                >
                  {pdfExporting
                    ? <><span style={{ display: "inline-block", animation: "spin 0.7s linear infinite" }}>⟳</span> Exporting…</>
                    : <>⬇ Export PDF</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}