/**
 * KeyRotationPanel.tsx
 * REBEL — Key Rotation Theater compliance panel
 *
 * Drop into rebel-ui/src/components/Modules/
 * Usage in PQCReadiness.tsx:
 *   import KeyRotationPanel from "./KeyRotationPanel";
 *   <KeyRotationPanel assets={displayAssets} apiBase={API} />
 *
 * Data flow:
 *   1. Fetches POST /api/key-rotation/scan with asset list from props
 *   2. Renders status table + regulatory badges
 *   3. Exposes exportKRSection(records) for exportPDF.ts to call
 */

import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KRRecord {
  asset_id:             string;
  key_type:             string;
  key_identifier:       string;
  last_rotated_at:      string | null;
  rotation_source:      string;
  days_since_rotation:  number | null;
  status:               "COMPLIANT" | "OVERDUE" | "CRITICAL" | "NEVER_ROTATED" | "UNKNOWN";
  regulatory_flags:     string[];
  attestation_hash:     string;
  evidence_path:        string;
  remediation_days:     number;
  remediation_cost:     number;
}

export interface KRScanResult {
  scan_id:             string;
  target:              string;
  scanned_at:          string;
  records:             KRRecord[];
  summary: {
    total_keys:         number;
    compliant:          number;
    overdue:            number;
    critical:           number;
    never_rotated:      number;
    unknown:            number;
    overall_risk:       string;
    frameworks_breached: string[];
  };
}

interface Props {
  assets:  any[];   // from displayAssets — same shape as AssetInventory
  apiBase: string;
  style?:  React.CSSProperties;
}

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  red:    "#dc2626",
  redBg:  "#fef2f2",
  orange: "#c2410c",
  orgBg:  "#fff7ed",
  green:  "#16a34a",
  grnBg:  "#f0fdf4",
  blue:   "#1d4ed8",
  bluBg:  "#eff6ff",
  grey:   "#64748b",
  greBg:  "#f8fafc",
  border: "#e2e8f0",
  text1:  "#0f172a",
  text2:  "#334155",
  text3:  "#64748b",
};

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  COMPLIANT:     C.green,
  OVERDUE:       C.orange,
  CRITICAL:      C.red,
  NEVER_ROTATED: C.red,
  UNKNOWN:       C.grey,
};
const STATUS_BG: Record<string, string> = {
  COMPLIANT:     C.grnBg,
  OVERDUE:       C.orgBg,
  CRITICAL:      C.redBg,
  NEVER_ROTATED: C.redBg,
  UNKNOWN:       C.greBg,
};
const STATUS_LABEL: Record<string, string> = {
  COMPLIANT:     "Compliant",
  OVERDUE:       "Overdue",
  CRITICAL:      "Critical",
  NEVER_ROTATED: "Never rotated",
  UNKNOWN:       "Unknown",
};

function Badge({
  text, color, bg,
}: { text: string; color: string; bg: string }) {
  return (
    <span style={{
      display: "inline-block",
      fontSize: 7, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: ".08em", padding: "2px 6px",
      border: `1px solid ${color}44`, borderRadius: 3,
      color, background: bg,
    }}>
      {text}
    </span>
  );
}

// ── Map asset list → KR scan request ─────────────────────────────────────────
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

// ── Exported HTML section builder (called from exportPDF.ts) ─────────────────
export function exportKRSection(result: KRScanResult): string {
  if (!result?.records?.length) return "";

  const rowsHtml = result.records.map((r, i) => {
    const sc = STATUS_COLOR[r.status] ?? C.grey;
    const days = r.days_since_rotation != null ? `${r.days_since_rotation}d` : "Never";
    const flags = r.regulatory_flags.join(", ") || "—";
    const attest = r.attestation_hash.slice(0, 16) + "…";
    const bg = i % 2 === 0 ? "#ffffff" : "#fafafa";
    return `<tr style="background:${bg};border-bottom:1px solid #f1f5f9;">
      <td style="padding:6px 8px;font-size:7.5pt;font-family:'JetBrains Mono',monospace;color:#1e40af;font-weight:600;">${r.key_identifier}</td>
      <td style="padding:6px 8px;font-size:7.5pt;color:#475569;">${r.key_type}</td>
      <td style="padding:6px 8px;font-size:7.5pt;font-family:'JetBrains Mono',monospace;font-weight:700;color:${sc};">${days}</td>
      <td style="padding:6px 8px;font-size:7pt;color:#64748b;">${r.rotation_source}</td>
      <td style="padding:6px 8px;">
        <span style="font-size:6.5pt;font-weight:700;color:${sc};background:${STATUS_BG[r.status]};border:1px solid ${sc}44;border-radius:3px;padding:2px 5px;text-transform:uppercase;letter-spacing:.06em;">
          ${STATUS_LABEL[r.status] ?? r.status}
        </span>
      </td>
      <td style="padding:6px 8px;font-size:6.5pt;color:#64748b;">${flags}</td>
      <td style="padding:6px 8px;font-size:6.5pt;font-family:'JetBrains Mono',monospace;color:#94a3b8;">${attest}</td>
    </tr>`;
  }).join("");

  const s = result.summary;
  return `
    <div style="page-break-before:always;"></div>
    <h2 style="font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.18em;
               color:#1e40af;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:12px;">
      6. Key Rotation Verification — Proof-of-Rotation Audit
    </h2>
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
      ${[
        ["Total keys", s.total_keys, C.blue],
        ["Compliant",  s.compliant,  C.green],
        ["Overdue",    s.overdue,    C.orange],
        ["Critical",   s.critical + s.never_rotated, C.red],
        ["Unknown",    s.unknown,    C.grey],
      ].map(([label, val, color]) => `
        <div style="border:1px solid #e2e8f0;border-radius:4px;padding:8px 12px;background:#fafafa;min-width:80px;">
          <div style="font-size:6pt;color:#94a3b8;text-transform:uppercase;letter-spacing:.14em;margin-bottom:3px;">${label}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:16pt;font-weight:700;color:${color};line-height:1;">${val}</div>
        </div>`).join("")}
      <div style="border:1px solid ${C.red}33;border-radius:4px;padding:8px 12px;background:${C.redBg};min-width:120px;">
        <div style="font-size:6pt;color:#94a3b8;text-transform:uppercase;letter-spacing:.14em;margin-bottom:3px;">Overall risk</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:14pt;font-weight:700;color:${C.red};line-height:1;">${s.overall_risk}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:8pt;">
      <thead>
        <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
          <th style="padding:6px 8px;font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#64748b;text-align:left;">Key identifier</th>
          <th style="padding:6px 8px;font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#64748b;text-align:left;">Type</th>
          <th style="padding:6px 8px;font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#64748b;text-align:left;">Days since</th>
          <th style="padding:6px 8px;font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#64748b;text-align:left;">Source</th>
          <th style="padding:6px 8px;font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#64748b;text-align:left;">Status</th>
          <th style="padding:6px 8px;font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#64748b;text-align:left;">Reg. flags</th>
          <th style="padding:6px 8px;font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#64748b;text-align:left;">Attestation</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <p style="font-size:7pt;color:#94a3b8;margin-top:8px;line-height:1.7;">
      Attestation hashes are HMAC-SHA256 over key identity + rotation timestamp using a per-scan secret.
      SPREADSHEET / NONE sources are flagged regardless of stated rotation date — regulators require
      system-generated audit trails (FFIEC, MAS TRM 9.2.4).
      Scan ID: ${result.scan_id}
    </p>`;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function KeyRotationPanel({ assets, apiBase, style = {} }: Props) {
  const [result,  setResult]  = useState<KRScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);
  const [open,    setOpen]    = useState(false);

  async function fetchKR() {
    if (!assets.length) return;
    setLoading(true);
    setError(false);
    try {
      const body = JSON.stringify({
        target: "rebel-scan",
        assets: toKRAssets(assets),
      });
      const res = await fetch(`${apiBase}/api/key-rotation/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
      setOpen(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const s = result?.summary;
  const critCount = (s?.critical ?? 0) + (s?.never_rotated ?? 0);
  const riskColor = s?.overall_risk === "CRITICAL" ? C.red
                  : s?.overall_risk === "HIGH"     ? C.orange
                  : s?.overall_risk === "MEDIUM"   ? "#b45309"
                  : C.green;

  return (
    <div style={{
      border: `1px solid ${C.border}`, borderRadius: 8,
      background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      ...style,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 14px", borderBottom: `1px solid #f1f5f9`,
        background: "#f8fafc", borderRadius: "8px 8px 0 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: C.text3,
            letterSpacing: ".14em", textTransform: "uppercase",
          }}>
            Key Rotation Theater — Proof-of-Rotation Audit
          </span>
          {s && (
            <span style={{
              fontSize: 8, fontWeight: 700, color: riskColor,
              background: `${riskColor}14`, border: `1px solid ${riskColor}44`,
              borderRadius: 3, padding: "2px 7px",
            }}>
              {s.overall_risk}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {s && (
            <button
              onClick={() => setOpen(o => !o)}
              style={{
                fontSize: 9, padding: "4px 10px", cursor: "pointer",
                border: `1px solid ${C.border}`, borderRadius: 4,
                background: "#f8fafc", color: C.text2, fontWeight: 600,
              }}
            >
              {open ? "▲ Hide" : "▼ Show"} {s.total_keys} keys
            </button>
          )}
          <button
            onClick={fetchKR}
            disabled={loading}
            style={{
              fontSize: 9, padding: "4px 12px", cursor: "pointer",
              border: `1px solid ${C.blue}44`, borderRadius: 4,
              background: `${C.blue}14`, color: C.blue, fontWeight: 700,
            }}
          >
            {loading ? "Scanning…" : "⟳ Run KR Scan"}
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {s && (
        <div style={{
          display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`,
          overflowX: "auto",
        }}>
          {[
            ["Total",     s.total_keys,            C.blue],
            ["Compliant", s.compliant,              C.green],
            ["Overdue",   s.overdue,                C.orange],
            ["Critical",  critCount,                C.red],
            ["Unknown",   s.unknown,                C.grey],
          ].map(([label, val, color], i) => (
            <div key={label as string} style={{
              flex: 1, minWidth: 72, padding: "8px 12px",
              borderRight: i < 4 ? `1px solid ${C.border}` : "none",
              textAlign: "center",
            }}>
              <div style={{
                fontSize: 7, color: C.text3, textTransform: "uppercase",
                letterSpacing: ".1em", marginBottom: 3,
              }}>{label}</div>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 16,
                fontWeight: 800, color: color as string, lineHeight: 1,
              }}>{val as number}</div>
            </div>
          ))}
        </div>
      )}

      {/* Regulatory flags */}
      {s?.frameworks_breached?.length > 0 && (
        <div style={{
          padding: "7px 14px", borderBottom: `1px solid ${C.border}`,
          background: `${C.red}08`, display: "flex", gap: 6, flexWrap: "wrap",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 7.5, fontWeight: 700, color: C.red }}>
            Frameworks breached:
          </span>
          {s.frameworks_breached.map(f => (
            <Badge key={f} text={f} color={C.red} bg={C.redBg} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: "10px 14px", fontSize: 9, color: C.red }}>
          Failed to reach <code>/api/key-rotation/scan</code>.
          Ensure <code>key_rotation_verifier.py</code> router is registered.
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div style={{
          padding: "20px 14px", textAlign: "center",
          fontSize: 9, color: C.text3,
        }}>
          Click <strong>Run KR Scan</strong> to check key rotation across all assets.
          <br />
          <span style={{ fontSize: 8, color: C.text3, marginTop: 4, display: "block" }}>
            Cryptographic attestation — no spreadsheets.
          </span>
        </div>
      )}

      {/* Table */}
      {result && open && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: `2px solid ${C.border}` }}>
                {["Key identifier", "Type", "Days since", "Source", "Status", "Reg. flags", "Attestation"].map(h => (
                  <th key={h} style={{
                    padding: "6px 8px", fontSize: 7, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: ".1em",
                    color: C.text3, textAlign: "left", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.records.map((r, i) => {
                const sc  = STATUS_COLOR[r.status] ?? C.grey;
                const sbg = STATUS_BG[r.status]   ?? C.greBg;
                const days = r.days_since_rotation != null
                  ? `${r.days_since_rotation}d` : "Never";
                return (
                  <tr key={r.asset_id} style={{
                    borderBottom: `1px solid ${C.border}`,
                    background: i % 2 === 0 ? "#fff" : "#fafafa",
                  }}>
                    <td style={{
                      padding: "6px 8px", color: C.blue, fontWeight: 600,
                      fontFamily: "'DM Mono', monospace", fontSize: 9,
                      maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {r.key_identifier}
                    </td>
                    <td style={{ padding: "6px 8px", color: C.text3, fontSize: 8 }}>
                      {r.key_type}
                    </td>
                    <td style={{
                      padding: "6px 8px", fontFamily: "'DM Mono', monospace",
                      fontWeight: 700, color: sc, fontSize: 9,
                    }}>
                      {days}
                    </td>
                    <td style={{ padding: "6px 8px", color: C.text3, fontSize: 8 }}>
                      {r.rotation_source}
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      <Badge
                        text={STATUS_LABEL[r.status] ?? r.status}
                        color={sc}
                        bg={sbg}
                      />
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {r.regulatory_flags.map(f => (
                          <Badge key={f} text={f} color={C.red} bg={C.redBg} />
                        ))}
                        {r.regulatory_flags.length === 0 && (
                          <span style={{ fontSize: 8, color: C.green }}>✓ None</span>
                        )}
                      </div>
                    </td>
                    <td style={{
                      padding: "6px 8px",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 7, color: C.text3,
                    }}>
                      {r.attestation_hash.slice(0, 16)}…
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{
            padding: "6px 14px", fontSize: 7.5, color: C.text3,
            borderTop: `1px solid ${C.border}`, background: "#f8fafc",
            borderRadius: "0 0 8px 8px",
          }}>
            Scan ID: {result.scan_id} · Attestation = HMAC-SHA256 per record ·
            SPREADSHEET/NONE sources are flagged regardless of stated date
          </div>
        </div>
      )}
    </div>
  );
}