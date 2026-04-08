/**
 * KeyRotationPanel.jsx
 * REBEL — Key Rotation proof-of-rotation audit panel
 * Self-fetching from /assets endpoint, matches PQCReadiness patterns exactly:
 *   • same cache layer (12h TTL, CACHED badge, ↺ REFRESH)
 *   • same secure-mode detection (/secure-mode/status → /ghost/assets)
 *   • same useBreakpoint() responsive grid
 *   • same shimmer skeleton system
 *   • same L palette + LS style objects
 */

import React, { useState, useEffect } from "react";

// ── API base (same VITE env pattern as PQCReadiness) ─────────────────────────
const API =
  (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE) ||
  "https://r3bel-production.up.railway.app";

// ── Cache config (identical to PQCReadiness) ──────────────────────────────────
const CACHE_TTL_MS     = 12 * 60 * 60 * 1000;
const CACHE_KEY_KR     = "rebel_cache_kr_scan";
const CACHE_KEY_ASSETS = "rebel_cache_kr_assets";

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
    return entry.data;
  } catch { return null; }
}
function cacheSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}
function cacheClear(...keys) {
  keys.forEach(k => localStorage.removeItem(k));
}
function cacheAgeLabel(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    const mins = Math.round((Date.now() - entry.ts) / 60000);
    return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
  } catch { return null; }
}

// ── Light theme palette — identical to PQCReadiness ───────────────────────────
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

// ── Map raw /assets record → KR scan asset shape ─────────────────────────────
function toKRAsset(a) {
  return {
    asset_id:        a.id   ?? a.name ?? "unknown",
    key_type:        a.type === "HSM"      ? "HSM"
                   : a.type === "Database" ? "DATABASE"
                   : (a.cipher ?? "").includes("TLS") ? "TLS_CERT"
                   : "APP_CONFIG",
    key_identifier:  a.name ?? a.id ?? "unknown",
    last_rotated_at: a.last_rotated_at ?? null,
    rotation_source: a.rotation_source ?? (a.last_rotated_at ? "CERT_META" : "NONE"),
    evidence_path:   a.evidence_path ?? "N/A",
  };
}

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  COMPLIANT:     L.green,
  OVERDUE:       L.orange,
  CRITICAL:      L.red,
  NEVER_ROTATED: L.red,
  UNKNOWN:       L.text3,
};
const STATUS_BG = {
  COMPLIANT:     "#f0fdf4",
  OVERDUE:       "#fff7ed",
  CRITICAL:      "#fef2f2",
  NEVER_ROTATED: "#fef2f2",
  UNKNOWN:       L.subtleBg,
};
const STATUS_LABEL = {
  COMPLIANT:     "Compliant",
  OVERDUE:       "Overdue",
  CRITICAL:      "Critical",
  NEVER_ROTATED: "Never rotated",
  UNKNOWN:       "Unknown",
};

// ── Breakpoint hook (identical to PQCReadiness) ───────────────────────────────
function useBreakpoint() {
  const get = () => {
    const w = window.innerWidth;
    if (w < 480) return "mobile";
    if (w < 900) return "tablet";
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

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
function Shimmer({ w = "100%", h = 16, radius = 4, style = {} }) {
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

function SkeletonMetricCard() {
  return (
    <div style={{ background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <Shimmer w="55%" h={8} style={{ marginBottom: 10 }} />
      <Shimmer w="70%" h={26} style={{ marginBottom: 8 }} />
      <Shimmer w="45%" h={8} />
    </div>
  );
}

function SkeletonSummaryStrip() {
  return (
    <div style={{ display: "flex", borderBottom: `1px solid ${L.border}` }}>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{ flex: 1, padding: "10px 12px", borderRight: i < 4 ? `1px solid ${L.border}` : "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <Shimmer w={40} h={7} />
          <Shimmer w={28} h={20} />
        </div>
      ))}
    </div>
  );
}

function SkeletonTableRows({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} style={{ borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }}>
          <td style={{ padding: "8px" }}><Shimmer w={130} h={9} /></td>
          <td style={{ padding: "8px" }}><Shimmer w={70}  h={9} /></td>
          <td style={{ padding: "8px" }}><Shimmer w={40}  h={9} /></td>
          <td style={{ padding: "8px" }}><Shimmer w={80}  h={9} /></td>
          <td style={{ padding: "8px" }}><Shimmer w={60}  h={18} radius={3} /></td>
          <td style={{ padding: "8px" }}><Shimmer w={80}  h={18} radius={3} /></td>
          <td style={{ padding: "8px" }}><Shimmer w={110} h={9} /></td>
        </tr>
      ))}
    </>
  );
}

function SkeletonRoadmapCards({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderBottom: `1px solid ${L.borderLight}`, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Shimmer w={24} h={9} />
              <Shimmer w={160} h={11} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Shimmer w={60} h={18} radius={3} />
              <Shimmer w={52} h={18} radius={3} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Shimmer w={50} h={9} />
            <Shimmer w={30} h={9} />
            <Shimmer w={55} h={9} />
          </div>
        </div>
      ))}
    </>
  );
}

function SkeletonDistCards({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderRadius: 6, padding: 12, border: `1px solid ${L.border}`, background: L.subtleBg }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Shimmer w={55} h={9} /><Shimmer w={24} h={20} />
          </div>
          <Shimmer w="100%" h={4} radius={2} style={{ marginBottom: 8 }} />
          <Shimmer w={60} h={8} />
        </div>
      ))}
    </>
  );
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────
function LPanelHeader({ left, right }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`,
      background: L.subtleBg, borderRadius: "8px 8px 0 0", flexWrap: "wrap", gap: 6,
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" }}>{left}</span>
      {right}
    </div>
  );
}

function LMetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 8, color: L.text4, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1, fontFamily: "'DM Mono',monospace" }}>{value}</div>
      <div style={{ fontSize: 9, color: L.text3, marginTop: 5 }}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }) {
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

function RegBadge({ text }) {
  return (
    <span style={{
      fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em",
      padding: "2px 5px", border: `1px solid ${L.red}44`, borderRadius: 3,
      color: L.red, background: "#fef2f2", display: "inline-block", whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

function CacheBadge({ age, onRefresh }) {
  if (!age) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 8, fontWeight: 600, color: L.text3, background: L.insetBg, border: `1px solid ${L.border}`, borderRadius: 3, padding: "2px 7px", letterSpacing: ".06em" }}>
        CACHED · {age}
      </span>
      <button onClick={onRefresh} style={{ ...LS.btn, fontSize: 9, padding: "3px 8px", color: L.blue, borderColor: `${L.blue}40`, background: `${L.blue}0d` }}>
        ↺ REFRESH
      </button>
    </div>
  );
}

// ── Mobile record card ────────────────────────────────────────────────────────
function RecordCard({ r, i }) {
  const [open, setOpen] = useState(false);
  const sc   = STATUS_COLOR[r.status] ?? L.text3;
  const days = r.days_since_rotation != null ? `${r.days_since_rotation}d` : "Never";
  return (
    <div style={{ borderBottom: `1px solid ${L.borderLight}`, background: L.panelBg, transition: "background .15s" }}
      onMouseEnter={e => e.currentTarget.style.background = L.subtleBg}
      onMouseLeave={e => e.currentTarget.style.background = L.panelBg}
    >
      <div onClick={() => setOpen(o => !o)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: L.text4, flexShrink: 0 }}>#{i + 1}</span>
          <span style={{ fontSize: 12, color: L.blue, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500, fontFamily: "'DM Mono',monospace" }}>{r.key_identifier}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: sc, fontSize: 10 }}>{days}</span>
          <StatusBadge status={r.status} />
          <span style={{ fontSize: 10, color: L.text4 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      <div style={{ padding: "0 14px 10px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 8, color: L.text3, background: L.insetBg, border: `1px solid ${L.border}`, borderRadius: 3, padding: "1px 5px", fontWeight: 600 }}>{r.key_type}</span>
        <span style={{ fontSize: 9, color: L.text3 }}>{r.rotation_source}</span>
      </div>
      {open && (
        <div style={{ padding: "0 14px 12px", borderTop: `1px solid ${L.borderLight}`, paddingTop: 10, background: L.insetBg }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: L.text3, fontWeight: 600 }}>Reg. Flags</span>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {r.regulatory_flags.length
                  ? r.regulatory_flags.map(f => <RegBadge key={f} text={f} />)
                  : <span style={{ fontSize: 8, color: L.green, fontWeight: 600 }}>✓ None</span>
                }
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: L.text3, fontWeight: 600 }}>Attestation</span>
              <span style={{ fontSize: 8, color: L.text4, fontFamily: "'DM Mono',monospace" }}>{r.attestation_hash?.slice(0, 20)}…</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: L.text3, fontWeight: 600 }}>Remediation</span>
              <span style={{ fontSize: 9, color: L.cyan, fontWeight: 600 }}>{r.remediation_days}d · ${r.remediation_cost?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function KeyRotationPanel({ style = {} }) {
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [tableOpen, setTableOpen] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt,  setCachedAt]  = useState(null);
  const [secureModeOn,      setSecureModeOn]      = useState(false);
  const [secureModeLoading, setSecureModeLoading] = useState(true);

  const bp        = useBreakpoint();
  const isMobile  = bp === "mobile";
  const isTablet  = bp === "tablet";
  const isDesktop = bp === "desktop";

  // ── Secure mode detection (same as PQCReadiness) ─────────────────────────
  useEffect(() => {
    fetch(`${API}/secure-mode/status`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.enabled !== undefined) setSecureModeOn(Boolean(d.enabled)); })
      .catch(() => {})
      .finally(() => setSecureModeLoading(false));
  }, []);

  // ── Load: fetch /assets then POST /api/key-rotation/scan ─────────────────
  async function loadKR(forceRefresh = false) {
    setLoading(true);
    setError(false);

    // Check KR scan cache first
    if (!forceRefresh) {
      const cachedResult = cacheGet(CACHE_KEY_KR);
      if (cachedResult) {
        setResult(cachedResult);
        setFromCache(true);
        setCachedAt(cacheAgeLabel(CACHE_KEY_KR));
        setLoading(false);
        return;
      }
    }

    try {
      // Step 1: Fetch assets (ghost or real)
      let rawAssets = [];
      if (secureModeOn) {
        const d = await fetch(`${API}/ghost/assets`).then(r => r.ok ? r.json() : null);
        rawAssets = Array.isArray(d?.assets) ? d.assets : [];
      } else {
        // Try cache first
        const cachedAssets = !forceRefresh ? cacheGet(CACHE_KEY_ASSETS) : null;
        if (cachedAssets) {
          rawAssets = Array.isArray(cachedAssets?.assets) ? cachedAssets.assets : [];
        } else {
          const d = await fetch(`${API}/assets`).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          });
          cacheSet(CACHE_KEY_ASSETS, d);
          rawAssets = Array.isArray(d?.assets) ? d.assets : [];
        }
      }

      // Step 2: POST to KR scan endpoint
      const res = await fetch(`${API}/api/key-rotation/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "rebel-scan",
          assets: rawAssets.map(toKRAsset),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Normalise — guard partial shapes
      data.records  = Array.isArray(data.records) ? data.records : [];
      data.summary  = data.summary ?? {
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
  }

  function handleRefresh() {
    cacheClear(CACHE_KEY_KR, CACHE_KEY_ASSETS);
    setFromCache(false);
    setCachedAt(null);
    loadKR(true);
  }

  useEffect(() => {
    if (!secureModeLoading) loadKR();
  }, [secureModeOn, secureModeLoading]);

  // ── Derived values ────────────────────────────────────────────────────────
  const s          = result?.summary;
  const critCount  = (s?.critical ?? 0) + (s?.never_rotated ?? 0);
  const riskColor  = s?.overall_risk === "CRITICAL" ? L.red
                   : s?.overall_risk === "HIGH"     ? L.orange
                   : s?.overall_risk === "MEDIUM"   ? L.yellow
                   : L.green;
  const totalRemDays = result?.records?.reduce((acc, r) => acc + (r.remediation_days ?? 0), 0) ?? 0;
  const totalRemCost = result?.records?.reduce((acc, r) => acc + (r.remediation_cost ?? 0), 0) ?? 0;

  const activeEndpointLabel = secureModeOn ? "→ /ghost/assets" : "→ /assets + /key-rotation/scan";
  const metricCols = isMobile ? "1fr 1fr" : isTablet ? "repeat(3,1fr)" : "repeat(5,1fr)";
  const distCols   = isMobile ? "1fr 1fr" : "repeat(4,1fr)";
  const remCols    = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)";

  return (
    <div style={{ ...LS.page, ...style }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.border};border-radius:3px;}
        .kr-show-cards { display: block; }
        .kr-show-table { display: none; }
        @media(min-width:900px){
          .kr-show-cards { display: none !important; }
          .kr-show-table { display: block !important; }
        }
      `}</style>

      {/* ── SECURE MODE BANNER ── */}
      {secureModeOn && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: `${L.purple}0d`, border: `1px solid ${L.purple}44`, borderRadius: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 9, color: L.purple, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>🔒 SECURE MODE ACTIVE</span>
          <span style={{ fontSize: 9, color: L.purple, opacity: 0.75 }}>·</span>
          <span style={{ fontSize: 9, color: L.purple, fontFamily: "'DM Mono', monospace" }}>/ghost/assets — anonymised data</span>
        </div>
      )}

      {/* ── HEADER PANEL ── */}
      <div style={LS.panel}>
        <LPanelHeader
          left="KEY ROTATION — PROOF-OF-ROTATION AUDIT"
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {fromCache && <CacheBadge age={cachedAt} onRefresh={handleRefresh} />}
              {s && (
                <span style={{ fontSize: 8, fontWeight: 700, color: riskColor, background: `${riskColor}14`, border: `1px solid ${riskColor}44`, borderRadius: 3, padding: "2px 7px" }}>
                  {s.overall_risk}
                </span>
              )}
              <span style={{
                fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                color: secureModeOn ? L.purple : error ? L.red : L.green,
                background: secureModeOn ? `${L.purple}10` : error ? `${L.red}10` : `${L.green}10`,
                border: `1px solid ${secureModeOn ? L.purple : error ? L.red : L.green}44`,
                borderRadius: 3, padding: "2px 6px", letterSpacing: ".04em",
              }}>{activeEndpointLabel}</span>
              <button onClick={handleRefresh} disabled={loading} style={{ ...LS.btn, fontSize: 9, color: L.blue, borderColor: `${L.blue}40`, background: `${L.blue}0d` }}>
                {loading ? "Scanning…" : "⟳ Run KR Scan"}
              </button>
            </div>
          }
        />

        {/* Regulatory frameworks breached */}
        {!loading && (s?.frameworks_breached ?? []).length > 0 && (
          <div style={{ padding: "7px 14px", borderBottom: `1px solid ${L.border}`, background: `${L.red}08`, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 7.5, fontWeight: 700, color: L.red, whiteSpace: "nowrap" }}>Frameworks breached:</span>
            {s.frameworks_breached.map(f => <RegBadge key={f} text={f} />)}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{ padding: "10px 14px", fontSize: 9, color: L.red, background: "#fef2f2" }}>
            ✗ Failed to fetch assets or reach <code>/api/key-rotation/scan</code> — check API connectivity.
          </div>
        )}

        {/* Empty pre-scan state */}
        {!result && !loading && !error && (
          <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 10, color: L.text3 }}>
            Click <strong style={{ color: L.blue }}>⟳ Run KR Scan</strong> to audit key rotation across all assets.
            <br />
            <span style={{ fontSize: 8, marginTop: 4, display: "block" }}>Cryptographic attestation — no spreadsheets.</span>
          </div>
        )}
      </div>

      {/* ── METRIC CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: metricCols, gap: isMobile ? 8 : 9 }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonMetricCard key={i} />)
          : s && <>
              <LMetricCard label="TOTAL KEYS"  value={s.total_keys}  sub="Assets scanned"       color={L.blue}   />
              <LMetricCard label="COMPLIANT"   value={s.compliant}   sub="Within rotation policy" color={L.green}  />
              <LMetricCard label="OVERDUE"     value={s.overdue}     sub="Past rotation window"  color={L.orange} />
              <LMetricCard label="CRITICAL"    value={critCount}     sub="Immediate action req." color={L.red}    />
              <div style={isMobile ? { gridColumn: "1/-1" } : {}}>
                <LMetricCard label="REM. DAYS"  value={`${totalRemDays}d`} sub={`~$${totalRemCost.toLocaleString()} est.`} color={L.cyan} />
              </div>
            </>
        }
      </div>

      {/* ── RISK DISTRIBUTION ── */}
      {(loading || result) && (
        <div style={LS.panel}>
          <LPanelHeader left="RISK DISTRIBUTION" />
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: distCols, gap: 10 }}>
            {loading
              ? <SkeletonDistCards count={4} />
              : s && ([
                  ["COMPLIANT",     s.compliant,   L.green,  "#f0fdf4", `${L.green}22`],
                  ["OVERDUE",       s.overdue,     L.orange, "#fff7ed", `${L.orange}25`],
                  ["CRITICAL",      critCount,     L.red,    "#fef2f2", `${L.red}25`],
                  ["UNKNOWN",       s.unknown,     L.text3,  L.subtleBg, L.border],
                ]).map(([label, count, color, bg, border]) => {
                  const pct = s.total_keys ? Math.round(count / s.total_keys * 100) : 0;
                  return (
                    <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 9, color, letterSpacing: ".12em", fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 14 : 16, color, fontWeight: 800 }}>{count}</span>
                      </div>
                      <div style={{ height: 4, background: `${color}20`, borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
                      </div>
                      <div style={{ fontSize: 8, color: L.text3, marginTop: 6 }}>{pct}% of total keys</div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}

      {/* ── KEY RECORDS ── */}
      {(loading || result) && (
        <div style={LS.panel}>
          <LPanelHeader
            left="KEY RECORDS"
            right={
              result && (
                <button onClick={() => setTableOpen(o => !o)} style={{ ...LS.btn, fontSize: 9, padding: "3px 9px" }}>
                  {tableOpen ? "▲ Hide" : "▼ Show"} {s?.total_keys} keys
                </button>
              )
            }
          />

          {/* Mobile card list */}
          <div className="kr-show-cards">
            <div style={{ maxHeight: isMobile ? 420 : 560, overflowY: "auto" }}>
              {loading
                ? <SkeletonRoadmapCards count={5} />
                : result?.records?.length
                  ? result.records.map((r, i) => <RecordCard key={r.asset_id} r={r} i={i} />)
                  : <div style={{ padding: 24, textAlign: "center", fontSize: 10, color: L.green, fontWeight: 600 }}>✓ No records to display</div>
              }
            </div>
          </div>

          {/* Desktop table */}
          <div className="kr-show-table">
            {(loading || tableOpen) && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
                  <thead>
                    <tr style={{ background: L.subtleBg, borderBottom: `2px solid ${L.border}` }}>
                      {["#","Key Identifier","Type","Days Since","Source","Status","Reg. Flags","Attestation"].map(h => (
                        <th key={h} style={{ padding: "7px 8px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? <SkeletonTableRows count={6} />
                      : result?.records?.map((r, i) => {
                          const sc   = STATUS_COLOR[r.status] ?? L.text3;
                          const days = r.days_since_rotation != null ? `${r.days_since_rotation}d` : "Never";
                          return (
                            <tr key={r.asset_id} style={{ borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg, transition: "background .12s" }}
                              onMouseEnter={e => e.currentTarget.style.background = L.insetBg}
                              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? L.panelBg : L.subtleBg}
                            >
                              <td style={{ padding: "7px 8px", fontFamily: "'DM Mono',monospace", fontSize: 9, color: L.text4 }}>{i + 1}</td>
                              <td style={{ padding: "7px 8px", color: L.blue, fontWeight: 600, fontFamily: "'DM Mono',monospace", fontSize: 9, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.key_identifier}
                              </td>
                              <td style={{ padding: "7px 8px" }}>
                                <span style={{ fontSize: 8, color: L.text3, background: L.insetBg, border: `1px solid ${L.border}`, borderRadius: 3, padding: "1px 5px", fontWeight: 600 }}>{r.key_type}</span>
                              </td>
                              <td style={{ padding: "7px 8px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: sc, fontSize: 10 }}>{days}</td>
                              <td style={{ padding: "7px 8px", fontSize: 9, color: L.text3 }}>{r.rotation_source}</td>
                              <td style={{ padding: "7px 8px" }}><StatusBadge status={r.status} /></td>
                              <td style={{ padding: "7px 8px" }}>
                                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                                  {r.regulatory_flags.length
                                    ? r.regulatory_flags.map(f => <RegBadge key={f} text={f} />)
                                    : <span style={{ fontSize: 8, color: L.green, fontWeight: 600 }}>✓ None</span>
                                  }
                                </div>
                              </td>
                              <td style={{ padding: "7px 8px", fontFamily: "'DM Mono',monospace", fontSize: 7, color: L.text4 }}>
                                {r.attestation_hash?.slice(0, 16)}…
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, background: L.subtleBg, borderRadius: "0 0 8px 8px" }}>
            {loading
              ? <Shimmer w={220} h={10} />
              : <span style={{ fontSize: 10, color: L.text2 }}>
                  <b style={{ color: L.text1 }}>{s?.total_keys ?? 0}</b> keys ·{" "}
                  <b style={{ color: L.green }}>{s?.compliant ?? 0}</b> compliant ·{" "}
                  <b style={{ color: L.red }}>{critCount}</b> critical
                  {secureModeOn && <span style={{ marginLeft: 8, fontSize: 8, color: L.purple, fontWeight: 600 }}>· ghost mode</span>}
                </span>
            }
            {result && (
              <span style={{ fontSize: 9, color: L.text3, fontFamily: "'DM Mono',monospace" }}>
                Scan ID: {result.scan_id}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── REMEDIATION GUIDE ── */}
      {(loading || result) && (
        <div style={LS.panel}>
          <LPanelHeader left="REMEDIATION GUIDE" />
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: remCols, gap: 10 }}>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ border: `1px solid ${L.border}`, borderRadius: 6, padding: 12, background: L.subtleBg }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><Shimmer w={120} h={10} /><Shimmer w={20} h={20} /></div>
                    <Shimmer w="90%" h={9} style={{ marginBottom: 6 }} />
                    {[80,65,90,70].map((w, j) => <Shimmer key={j} w={`${w}%`} h={8} style={{ marginBottom: 5 }} />)}
                  </div>
                ))
              : result && [
                  {
                    title: "Critical — Immediate",
                    color: L.red,
                    bg: "#fff5f5",
                    border: `${L.red}25`,
                    icon: "⬡",
                    items: result.records.filter(r => r.status === "CRITICAL" || r.status === "NEVER_ROTATED"),
                    fix: "Rotate now — regulatory breach confirmed",
                  },
                  {
                    title: "Overdue — This Sprint",
                    color: L.orange,
                    bg: "#fff7ed",
                    border: `${L.orange}25`,
                    icon: "◈",
                    items: result.records.filter(r => r.status === "OVERDUE"),
                    fix: "Schedule rotation within current sprint",
                  },
                  {
                    title: "Unknown — Verify Source",
                    color: L.text3,
                    bg: L.subtleBg,
                    border: L.border,
                    icon: "◉",
                    items: result.records.filter(r => r.status === "UNKNOWN"),
                    fix: "Confirm rotation source and last rotation date",
                  },
                ].map(section => (
                  <div key={section.title} style={{ background: section.bg, border: `1px solid ${section.border}`, borderRadius: 6, padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", color: section.color, fontSize: 14, flexShrink: 0 }}>{section.icon}</span>
                      <span style={{ fontSize: 9, color: section.color, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{section.title}</span>
                      <span style={{ marginLeft: "auto", fontFamily: "'DM Mono',monospace", fontSize: 14, color: section.color, flexShrink: 0, fontWeight: 800 }}>{section.items.length}</span>
                    </div>
                    <div style={{ fontSize: 9, color: L.text2, marginBottom: 8, lineHeight: 1.6, fontWeight: 500 }}>{section.fix}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {section.items.slice(0, 5).map((r, i) => (
                        <div key={i} style={{ fontSize: 9, color: L.text2, display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "3px 0", borderTop: `1px solid ${section.border}` }}>
                          <span style={{ color: section.color, fontSize: 8, flexShrink: 0, fontWeight: 700 }}>▸</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", overflow: "hidden", textOverflow: "ellipsis" }}>{r.key_identifier}</span>
                        </div>
                      ))}
                      {section.items.length > 5 && <div style={{ fontSize: 9, color: L.text3, fontStyle: "italic" }}>+{section.items.length - 5} more</div>}
                      {section.items.length === 0 && <div style={{ fontSize: 9, color: L.green, fontWeight: 600 }}>✓ All clear</div>}
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
}