/**
 * KeyRotationPanel.tsx
 * REBEL — Key Rotation proof-of-rotation audit panel
 * Matches PQCReadiness theme, cache layer, secure-mode, and skeleton patterns exactly.
 */

import { useState, useEffect } from "react";
import type React from "react";

const API =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  "https://r3bel-production.up.railway.app";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KRRecord {
  asset_id:            string;
  key_type:            string;
  key_identifier:      string;
  last_rotated_at:     string | null;
  rotation_source:     string;
  days_since_rotation: number | null;
  status:              "COMPLIANT" | "OVERDUE" | "CRITICAL" | "NEVER_ROTATED" | "UNKNOWN";
  regulatory_flags:    string[];
  attestation_hash:    string;
  evidence_path:       string;
  remediation_days:    number;
  remediation_cost:    number;
}

export interface KRScanResult {
  scan_id:    string;
  target:     string;
  scanned_at: string;
  records:    KRRecord[];
  summary: {
    total_keys:          number;
    compliant:           number;
    overdue:             number;
    critical:            number;
    never_rotated:       number;
    unknown:             number;
    overall_risk:        string;
    frameworks_breached: string[];
  };
}

interface Props {
  assets:  any[];
  apiBase: string;
  style?:  React.CSSProperties;
}

// ── Theme — identical to PQCReadiness ─────────────────────────────────────────
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
    cursor:        "pointer",
    fontSize:      11,
    fontWeight:    600,
    letterSpacing: ".06em",
  } as React.CSSProperties,
};

// ── Cache config (same TTL pattern as PQCReadiness) ───────────────────────────
const CACHE_TTL_MS  = 12 * 60 * 60 * 1000;
const CACHE_KEY_KR  = "rebel_cache_kr_scan";

interface CacheEntry<T> { ts: number; data: T; }

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
    return entry.data;
  } catch { return null; }
}
function cacheSet<T>(key: string, data: T): void {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}
function cacheAgeLabel(key: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<unknown> = JSON.parse(raw);
    const mins = Math.round((Date.now() - entry.ts) / 60000);
    return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
  } catch { return null; }
}

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  COMPLIANT:     L.green,
  OVERDUE:       L.orange,
  CRITICAL:      L.red,
  NEVER_ROTATED: L.red,
  UNKNOWN:       L.text3,
};
const STATUS_BG: Record<string, string> = {
  COMPLIANT:     "#f0fdf4",
  OVERDUE:       "#fff7ed",
  CRITICAL:      "#fef2f2",
  NEVER_ROTATED: "#fef2f2",
  UNKNOWN:       L.subtleBg,
};
const STATUS_LABEL: Record<string, string> = {
  COMPLIANT:     "Compliant",
  OVERDUE:       "Overdue",
  CRITICAL:      "Critical",
  NEVER_ROTATED: "Never rotated",
  UNKNOWN:       "Unknown",
};

// ── Map assets → KR scan request (same asset shape as rest of app) ────────────
function toKRAssets(assets: any[]) {
  return assets.map((a) => ({
    asset_id:        a.id   ?? a.name ?? "unknown",
    key_type:        a.type === "HSM" ? "HSM"
                   : a.type === "Database" ? "DATABASE"
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

function LPanelHeader({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`,
      background: L.subtleBg, borderRadius: "8px 8px 0 0",
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" }}>{left}</span>
      {right}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
      <span style={{ fontSize: 8, fontWeight: 600, color: L.text3, background: L.insetBg, border: `1px solid ${L.border}`, borderRadius: 3, padding: "2px 7px", letterSpacing: ".06em" }}>
        CACHED · {age}
      </span>
      <button onClick={onRefresh} style={{ ...LS.btn, fontSize: 9, padding: "3px 8px", color: L.blue, borderColor: `${L.blue}40`, background: `${L.blue}0d` }}>
        ↺ REFRESH
      </button>
    </div>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────
function SkeletonTableRows({ count = 5 }: { count?: number }) {
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

// ── Exported HTML section (called from exportPDF.ts) ──────────────────────────
export function exportKRSection(result: KRScanResult): string {
  if (!result?.records?.length) return "";
  const s = result.summary;

  const rowsHtml = result.records.map((r, i) => {
    const sc   = STATUS_COLOR[r.status] ?? L.text3;
    const days = r.days_since_rotation != null ? `${r.days_since_rotation}d` : "Never";
    const flags = r.regulatory_flags.join(", ") || "—";
    const attest = r.attestation_hash.slice(0, 16) + "…";
    const bg = i % 2 === 0 ? "#ffffff" : "#fafafa";
    return `<tr style="background:${bg};border-bottom:1px solid #f1f5f9;">
      <td style="padding:6px 8px;font-size:7.5pt;font-family:'JetBrains Mono',monospace;color:#1e40af;font-weight:600;">${r.key_identifier}</td>
      <td style="padding:6px 8px;font-size:7.5pt;color:#475569;">${r.key_type}</td>
      <td style="padding:6px 8px;font-size:7.5pt;font-family:'JetBrains Mono',monospace;font-weight:700;color:${sc};">${days}</td>
      <td style="padding:6px 8px;font-size:7pt;color:#64748b;">${r.rotation_source}</td>
      <td style="padding:6px 8px;"><span style="font-size:6.5pt;font-weight:700;color:${sc};background:${STATUS_BG[r.status]};border:1px solid ${sc}44;border-radius:3px;padding:2px 5px;text-transform:uppercase;letter-spacing:.06em;">${STATUS_LABEL[r.status] ?? r.status}</span></td>
      <td style="padding:6px 8px;font-size:6.5pt;color:#64748b;">${flags}</td>
      <td style="padding:6px 8px;font-size:6.5pt;font-family:'JetBrains Mono',monospace;color:#94a3b8;">${attest}</td>
    </tr>`;
  }).join("");

  return `
    <div style="page-break-before:always;"></div>
    <h2 style="font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.18em;
               color:#1e40af;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:12px;">
      Key Rotation Verification — Proof-of-Rotation Audit
    </h2>
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
      ${[
        ["Total keys", s.total_keys, L.blue],
        ["Compliant",  s.compliant,  L.green],
        ["Overdue",    s.overdue,    L.orange],
        ["Critical",   (s.critical ?? 0) + (s.never_rotated ?? 0), L.red],
        ["Unknown",    s.unknown,    L.text3],
      ].map(([label, val, color]) => `
        <div style="border:1px solid #e2e8f0;border-radius:4px;padding:8px 12px;background:#fafafa;min-width:80px;">
          <div style="font-size:6pt;color:#94a3b8;text-transform:uppercase;letter-spacing:.14em;margin-bottom:3px;">${label}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:16pt;font-weight:700;color:${color};line-height:1;">${val}</div>
        </div>`).join("")}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:8pt;">
      <thead>
        <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
          ${["Key identifier","Type","Days since","Source","Status","Reg. flags","Attestation"]
            .map(h => `<th style="padding:6px 8px;font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#64748b;text-align:left;">${h}</th>`)
            .join("")}
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <p style="font-size:7pt;color:#94a3b8;margin-top:8px;line-height:1.7;">
      Attestation hashes are HMAC-SHA256 over key identity + rotation timestamp.
      SPREADSHEET/NONE sources are flagged regardless of stated rotation date.
      Scan ID: ${result.scan_id}
    </p>`;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function KeyRotationPanel({ assets, apiBase, style = {} }: Props) {
  const [result,    setResult]    = useState<KRScanResult | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [tableOpen, setTableOpen] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt,  setCachedAt]  = useState<string | null>(null);
  const [secureModeOn, setSecureModeOn] = useState(false);
  const [secureModeLoading, setSecureModeLoading] = useState(true);

  // ── Secure mode status (same pattern as PQCReadiness) ────────────────────
  useEffect(() => {
    fetch(`$API/secure-mode/status`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.enabled !== undefined) setSecureModeOn(Boolean(d.enabled)); })
      .catch(() => {})
      .finally(() => setSecureModeLoading(false));
  }, [apiBase]);

  // ── Fetch with cache ──────────────────────────────────────────────────────
  async function loadKR(forceRefresh = false) {
    setLoading(true);
    setError(false);

    if (!forceRefresh) {
      const cached = cacheGet<KRScanResult>(CACHE_KEY_KR);
      if (cached) {
        setResult(cached);
        setFromCache(true);
        setCachedAt(cacheAgeLabel(CACHE_KEY_KR));
        setLoading(false);
        return;
      }
    }

    // In secure mode use ghost assets; normal mode uses passed assets
    const sourceAssets = secureModeOn
      ? await fetch(`${API}/ghost/assets`)
          .then(r => r.ok ? r.json() : null)
          .then(d => d?.assets ?? [])
          .catch(() => [])
      : assets;

    if (!sourceAssets.length) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API}/api/key-rotation/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "rebel-scan", assets: toKRAssets(sourceAssets) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: KRScanResult = await res.json();
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
    localStorage.removeItem(CACHE_KEY_KR);
    setFromCache(false);
    setCachedAt(null);
    loadKR(true);
  }

  useEffect(() => {
    if (!secureModeLoading) loadKR();
  }, [secureModeOn, secureModeLoading]);

  const s = result?.summary;
  const critCount  = (s?.critical ?? 0) + (s?.never_rotated ?? 0);
  const riskColor  = s?.overall_risk === "CRITICAL" ? L.red
                   : s?.overall_risk === "HIGH"     ? L.orange
                   : s?.overall_risk === "MEDIUM"   ? L.yellow
                   : L.green;

  const activeEndpointLabel = secureModeOn ? "→ /ghost/assets" : "→ /api/key-rotation/scan";

  return (
    <div style={{ background: L.pageBg, minHeight: "100vh", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12, fontFamily: "'DM Sans', system-ui, sans-serif", color: L.text1, ...style }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.border};border-radius:3px;}
      `}</style>

      {/* ── SECURE MODE BANNER ── */}
      {secureModeOn && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: `${L.purple}0d`, border: `1px solid ${L.purple}44`, borderRadius: 6 }}>
          <span style={{ fontSize: 9, color: L.purple, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>🔒 SECURE MODE ACTIVE</span>
          <span style={{ fontSize: 9, color: L.purple, opacity: 0.75 }}>·</span>
          <span style={{ fontSize: 9, color: L.purple, fontFamily: "'DM Mono', monospace" }}>/ghost/assets — anonymised data</span>
        </div>
      )}

      {/* ── SUMMARY METRICS ── */}
      <div style={{ ...LS.panel }}>
        <LPanelHeader
          left="KEY ROTATION — PROOF-OF-ROTATION AUDIT"
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {fromCache && <CacheBadge age={cachedAt} onRefresh={handleRefresh} />}
              {s && (
                <span style={{ fontSize: 8, fontWeight: 700, color: riskColor, background: `${riskColor}14`, border: `1px solid ${riskColor}44`, borderRadius: 3, padding: "2px 7px" }}>
                  {s.overall_risk}
                </span>
              )}
              <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                color: secureModeOn ? L.purple : error ? L.red : L.green,
                background: secureModeOn ? `${L.purple}10` : error ? `${L.red}10` : `${L.green}10`,
                border: `1px solid ${secureModeOn ? L.purple : error ? L.red : L.green}44`,
                borderRadius: 3, padding: "2px 6px", letterSpacing: ".04em",
              }}>{activeEndpointLabel}</span>
              <button
                onClick={handleRefresh}
                disabled={loading}
                style={{ ...LS.btn, fontSize: 9, color: L.blue, borderColor: `${L.blue}40`, background: `${L.blue}0d` }}
              >
                {loading ? "Scanning…" : "⟳ Run KR Scan"}
              </button>
            </div>
          }
        />

        {/* Summary strip */}
        {loading
          ? <SkeletonSummaryStrip />
          : s && (
            <div style={{ display: "flex", borderBottom: `1px solid ${L.border}`, overflowX: "auto" }}>
              {([
                ["Total",     s.total_keys,  L.blue],
                ["Compliant", s.compliant,   L.green],
                ["Overdue",   s.overdue,     L.orange],
                ["Critical",  critCount,     L.red],
                ["Unknown",   s.unknown,     L.text3],
              ] as [string, number, string][]).map(([label, val, color], i) => (
                <div key={label} style={{ flex: 1, minWidth: 72, padding: "10px 12px", borderRight: i < 4 ? `1px solid ${L.border}` : "none", textAlign: "center" }}>
                  <div style={{ fontSize: 7, color: L.text3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                </div>
              ))}
            </div>
          )
        }

        {/* Regulatory flags */}
        {!loading && (s?.frameworks_breached ?? []).length > 0 && (
          <div style={{ padding: "7px 14px", borderBottom: `1px solid ${L.border}`, background: `${L.red}08`, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 7.5, fontWeight: 700, color: L.red }}>Frameworks breached:</span>
            {(s!.frameworks_breached ?? []).map(f => <RegBadge key={f} text={f} />)}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: "10px 14px", fontSize: 9, color: L.red, background: "#fef2f2" }}>
            ✗ Failed to reach <code>/api/key-rotation/scan</code> — ensure <code>key_rotation_verifier.py</code> is registered.
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 10, color: L.text3 }}>
            Click <strong style={{ color: L.blue }}>⟳ Run KR Scan</strong> to audit key rotation across all assets.
            <br />
            <span style={{ fontSize: 8, marginTop: 4, display: "block" }}>Cryptographic attestation — no spreadsheets.</span>
          </div>
        )}
      </div>

      {/* ── RISK DISTRIBUTION ── */}
      {(loading || result) && (
        <div style={{ ...LS.panel }}>
          <LPanelHeader left="RISK DISTRIBUTION" />
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ borderRadius: 6, padding: 12, border: `1px solid ${L.border}`, background: L.subtleBg }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><Shimmer w={55} h={9} /><Shimmer w={24} h={20} /></div>
                    <Shimmer w="100%" h={4} radius={2} style={{ marginBottom: 8 }} />
                    <Shimmer w={60} h={8} />
                  </div>
                ))
              : s && ([
                  ["COMPLIANT",     s.compliant,      L.green,  "#f0fdf4", `${L.green}22`],
                  ["OVERDUE",       s.overdue,        L.orange, "#fff7ed", `${L.orange}25`],
                  ["CRITICAL",      critCount,        L.red,    "#fef2f2", `${L.red}25`],
                  ["UNKNOWN",       s.unknown,        L.text3,  L.subtleBg, `${L.border}`],
                ] as [string, number, string, string, string][]).map(([label, count, color, bg, border]) => {
                  const pct = s.total_keys ? Math.round(count / s.total_keys * 100) : 0;
                  return (
                    <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 9, color, letterSpacing: ".12em", fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color, fontWeight: 800 }}>{count}</span>
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

      {/* ── RECORDS TABLE ── */}
      {(loading || result) && (
        <div style={{ ...LS.panel }}>
          <LPanelHeader
            left="KEY RECORDS"
            right={
              result && (
                <button
                  onClick={() => setTableOpen(o => !o)}
                  style={{ ...LS.btn, fontSize: 9, padding: "3px 9px" }}
                >
                  {tableOpen ? "▲ Hide" : "▼ Show"} {s?.total_keys} keys
                </button>
              )
            }
          />

          {(loading || tableOpen) && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
                <thead>
                  <tr style={{ background: L.subtleBg, borderBottom: `2px solid ${L.border}` }}>
                    {["Key Identifier", "Type", "Days Since", "Source", "Status", "Reg. Flags", "Attestation"].map(h => (
                      <th key={h} style={{ padding: "7px 8px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? <SkeletonTableRows count={6} />
                    : result!.records.map((r, i) => {
                        const sc   = STATUS_COLOR[r.status] ?? L.text3;
                        const days = r.days_since_rotation != null ? `${r.days_since_rotation}d` : "Never";
                        return (
                          <tr key={r.asset_id} style={{ borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }}
                            onMouseEnter={e => (e.currentTarget.style.background = L.insetBg)}
                            onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? L.panelBg : L.subtleBg)}>
                            <td style={{ padding: "7px 8px", color: L.blue, fontWeight: 600, fontFamily: "'DM Mono',monospace", fontSize: 9, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {r.key_identifier}
                            </td>
                            <td style={{ padding: "7px 8px" }}>
                              <span style={{ fontSize: 8, color: L.text3, background: L.insetBg, border: `1px solid ${L.border}`, borderRadius: 3, padding: "1px 5px", fontWeight: 600 }}>{r.key_type}</span>
                            </td>
                            <td style={{ padding: "7px 8px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: sc, fontSize: 10 }}>
                              {days}
                            </td>
                            <td style={{ padding: "7px 8px", fontSize: 9, color: L.text3 }}>
                              {r.rotation_source}
                            </td>
                            <td style={{ padding: "7px 8px" }}>
                              <StatusBadge status={r.status} />
                            </td>
                            <td style={{ padding: "7px 8px" }}>
                              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                                {r.regulatory_flags.map(f => <RegBadge key={f} text={f} />)}
                                {r.regulatory_flags.length === 0 && <span style={{ fontSize: 8, color: L.green, fontWeight: 600 }}>✓ None</span>}
                              </div>
                            </td>
                            <td style={{ padding: "7px 8px", fontFamily: "'DM Mono',monospace", fontSize: 7, color: L.text4 }}>
                              {r.attestation_hash.slice(0, 16)}…
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          )}

          <div style={{ padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, background: L.subtleBg, borderRadius: "0 0 8px 8px" }}>
            {loading
              ? <Shimmer w={200} h={9} />
              : <span style={{ fontSize: 10, color: L.text2 }}>
                  <b style={{ color: L.text1 }}>{s?.total_keys ?? 0}</b> keys · {" "}
                  <b style={{ color: L.green }}>{s?.compliant ?? 0}</b> compliant · {" "}
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
    </div>
  );
}