/**
 * REBEL — Bank-Grade PQC Audit PDF Export
 * ─────────────────────────────────────────
 * Fully standalone module — no external deps beyond the types already
 * used in PQCReadinessPage.tsx.  Import and call exportAuditPDF().
 *
 * Design principles:
 *  • Authoritative, distraction-free banking typography (Georgia + monospace)
 *  • Maximum information density without visual noise
 *  • Reliable @page CSS so every section prints on intended pages
 *  • No blobs of inline style props — structured CSS class sheet
 *  • INR-native costs throughout
 */

import type { PQCScoreBreakdown } from "./cipherAnalysis.js";

// ── Shared helpers (kept local so the module is self-contained) ───────────────

const INR_RATE = 83;

function toINR(usd: number): number { return Math.round(usd * INR_RATE); }

function fmtINR(usd: number): string {
  const inr = toINR(usd);
  if (inr >= 10_000_000) return `₹${(inr / 10_000_000).toFixed(2)} Cr`;
  if (inr >= 100_000)    return `₹${(inr / 100_000).toFixed(1)} L`;
  return `₹${inr.toLocaleString("en-IN")}`;
}

function fmtINRFull(usd: number): string {
  return `₹${toINR(usd).toLocaleString("en-IN")}`;
}

function normaliseDomain(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExportPDFOptions {
  enriched:       any[];           // ranked weak-asset list from PQCReadinessPage
  migrationScore: number;          // 0-100
  pqcReady:       number;          // count of PQC-active assets
  total:          number;          // total in-scope assets
  totalDays:      number;          // sum of dev days
  calDays:        number;          // wall-clock days at teamSize
  totalCostUSD:   number;
  teamSize:       number;
  devRateUSD:     number;
  completionDate: string;          // e.g. "15 Aug 2025"
  clientName:     string;
  clientDomain:   string;
  milestones: Array<{ label: string; done: boolean; pct: number }>;
}

// ── CSS sheet ─────────────────────────────────────────────────────────────────
// Written as a single template string so it's easy to read and edit.

function buildCSS(): string {
  return `
    /* ── Reset & base ──────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 10pt;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Page layout ───────────────────────────────────────────── */
    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
    }

    @page :first {
      margin-top: 12mm;
    }

    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }

    /* ── Utility ───────────────────────────────────────────────── */
    .mono { font-family: 'Courier New', Courier, monospace; }
    .no-print { display: none !important; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* ── Print button (screen only) ────────────────────────────── */
    @media screen {
      .print-btn {
        position: fixed;
        top: 20px; right: 20px;
        background: #1e3a5f;
        color: #fff;
        border: none;
        padding: 10px 24px;
        border-radius: 3px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .1em;
        box-shadow: 0 2px 12px rgba(0,0,0,.25);
        z-index: 999;
      }
      .print-btn:hover { background: #162d4a; }
    }

    /* ── Document wrapper ───────────────────────────────────────── */
    .doc { max-width: 740px; margin: 0 auto; padding: 0 0 40px; }

    /* ── Cover header ───────────────────────────────────────────── */
    .cover-bar {
      border-top: 4px solid #1e3a5f;
      padding-top: 18px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }

    .brand-name {
      font-family: 'Courier New', monospace;
      font-size: 24pt;
      font-weight: 700;
      letter-spacing: .2em;
      color: #1e3a5f;
      line-height: 1;
    }

    .brand-sub {
      font-size: 7pt;
      color: #64748b;
      letter-spacing: .18em;
      text-transform: uppercase;
      margin-top: 4px;
    }

    .cover-right { text-align: right; }
    .cover-client { font-size: 14pt; font-weight: 700; color: #0f172a; line-height: 1.2; }
    .cover-domain { font-size: 9pt; color: #334155; margin-top: 3px; font-family: 'Courier New', monospace; }

    .report-title {
      font-size: 18pt;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
      margin-bottom: 6px;
    }

    .report-subtitle {
      font-size: 8pt;
      color: #64748b;
      letter-spacing: .06em;
      margin-bottom: 4px;
    }

    .meta-row {
      display: flex;
      gap: 32px;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }

    .meta-item { }
    .meta-label { font-size: 7pt; color: #94a3b8; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 2px; }
    .meta-value { font-family: 'Courier New', monospace; font-size: 9pt; color: #1e293b; font-weight: 700; }

    /* ── Confidentiality banner ────────────────────────────────── */
    .conf-banner {
      background: #fefce8;
      border: 1px solid #fde047;
      border-left: 4px solid #ca8a04;
      padding: 7px 12px;
      font-size: 8pt;
      color: #78350f;
      margin-bottom: 24px;
      letter-spacing: .02em;
    }

    /* ── Section headings ───────────────────────────────────────── */
    .section { margin-bottom: 24px; }

    h2 {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .14em;
      color: #1e3a5f;
      padding-bottom: 6px;
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: 12px;
    }

    /* ── Summary grid ───────────────────────────────────────────── */
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .kpi-box {
      border: 1px solid #e2e8f0;
      border-top: 3px solid #1e3a5f;
      padding: 14px 16px;
    }

    .kpi-label { font-size: 7pt; color: #94a3b8; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 5px; }
    .kpi-value { font-size: 22pt; font-weight: 700; line-height: 1; font-family: 'Courier New', monospace; }
    .kpi-sub   { font-size: 8pt; color: #475569; margin-top: 4px; }

    /* ── Score gauge (SVG-based, printed via inline SVG) ────────── */
    .gauge-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 18px 16px;
      border: 1px solid #e2e8f0;
    }

    .gauge-label { font-size: 7.5pt; color: #334155; text-align: center; margin-top: 8px; line-height: 1.6; }

    /* ── Milestone bar list ─────────────────────────────────────── */
    .milestone { margin-bottom: 9px; }
    .milestone-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3px;
      font-size: 8.5pt;
    }
    .milestone-name { color: #334155; display: flex; align-items: center; gap: 7px; }
    .milestone-pct  { font-family: 'Courier New', monospace; font-weight: 700; font-size: 8pt; }
    .bar-track { height: 5px; background: #f1f5f9; border-radius: 3px; }
    .bar-fill  { height: 100%; border-radius: 3px; }

    /* ── DORA table ─────────────────────────────────────────────── */
    table.dora {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
    }
    table.dora th {
      background: #f8fafc;
      padding: 7px 10px;
      text-align: left;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    table.dora td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    table.dora tr:last-child td { border-bottom: none; }
    .dora-art  { font-family: 'Courier New', monospace; font-weight: 700; color: #1e3a5f; white-space: nowrap; }
    .dora-title { font-weight: 600; color: #0f172a; }
    .dora-desc  { color: #475569; font-size: 8pt; line-height: 1.55; }

    /* ── Asset inventory table ──────────────────────────────────── */
    table.assets {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    table.assets th {
      background: #f8fafc;
      padding: 5px 7px;
      text-align: left;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .07em;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
      white-space: nowrap;
    }
    table.assets td { padding: 5px 7px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    table.assets tr:nth-child(even) td { background: #fafafa; }
    table.assets tfoot td {
      padding: 6px 7px;
      border-top: 2px solid #cbd5e1;
      font-weight: 700;
      background: #f8fafc;
    }

    /* ── Status badges ──────────────────────────────────────────── */
    .badge {
      display: inline-block;
      font-size: 7pt;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 2px;
      letter-spacing: .05em;
      font-family: 'Courier New', monospace;
    }
    .badge-red    { color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; }
    .badge-orange { color: #92400e; background: #fff7ed; border: 1px solid #fed7aa; }
    .badge-yellow { color: #78350f; background: #fffbeb; border: 1px solid #fde68a; }
    .badge-green  { color: #14532d; background: #f0fdf4; border: 1px solid #bbf7d0; }
    .badge-blue   { color: #1e3a8a; background: #eff6ff; border: 1px solid #bfdbfe; }

    /* ── Remediation cards (3-col grid) ─────────────────────────── */
    .rem-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }
    .rem-card {
      border: 1px solid #e2e8f0;
      border-top: 3px solid;
      padding: 12px;
    }
    .rem-card-title {
      font-size: 9pt;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .rem-card-fix {
      font-size: 8pt;
      color: #475569;
      margin-bottom: 8px;
      line-height: 1.55;
    }
    .rem-item {
      font-size: 7.5pt;
      color: #334155;
      padding: 3px 0;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: flex-start;
      gap: 5px;
    }
    .rem-count {
      font-family: 'Courier New', monospace;
      font-size: 20pt;
      font-weight: 700;
      float: right;
      line-height: 1;
    }

    /* ── Signature block ────────────────────────────────────────── */
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 24px;
      margin-top: 32px;
    }
    .sig-role  { font-size: 7.5pt; color: #94a3b8; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 28px; }
    .sig-line  { border-bottom: 1px solid #334155; margin-bottom: 4px; }
    .sig-hint  { font-size: 7.5pt; color: #94a3b8; }

    /* ── Footer ─────────────────────────────────────────────────── */
    .doc-footer {
      margin-top: 36px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 7pt;
      color: #94a3b8;
      text-align: center;
      line-height: 1.9;
    }

    /* ── PQC criteria dots (print-safe) ─────────────────────────── */
    .crit-dot {
      display: inline-block;
      width: 7px; height: 7px;
      border-radius: 50%;
      margin-right: 2px;
      vertical-align: middle;
    }
  `.trim();
}

// ── Gauge SVG (pure SVG, no canvas — reliable in print) ───────────────────────

function buildGaugeSVG(score: number): string {
  const pct    = Math.min(0.999, Math.max(0.001, score / 100));
  const r      = 54, cx = 70, cy = 74;
  const x1     = cx + r * Math.cos(Math.PI);
  const y1     = cy + r * Math.sin(Math.PI);
  const x2     = cx + r * Math.cos(Math.PI + Math.PI * pct);
  const y2     = cy + r * Math.sin(Math.PI + Math.PI * pct);
  const largeArc = pct > 0.5 ? 1 : 0;
  const color  = score >= 70 ? "#15803d" : score >= 40 ? "#b45309" : "#dc2626";
  const label  = score >= 70 ? "COMPLIANT" : score >= 40 ? "AT RISK" : "CRITICAL";

  return `
  <svg width="140" height="90" viewBox="0 0 140 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Track -->
    <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}"
          fill="none" stroke="#e2e8f0" stroke-width="11" stroke-linecap="round"/>
    <!-- Fill -->
    <path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}"
          fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round"/>
    <!-- Score -->
    <text x="${cx}" y="${cy - 5}" text-anchor="middle"
          font-family="Courier New, monospace" font-size="24" font-weight="700" fill="${color}">${score}</text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle"
          font-family="Courier New, monospace" font-size="7.5" fill="${color}" letter-spacing="1.5">${label}</text>
  </svg>`.trim();
}

// ── Risk helpers ──────────────────────────────────────────────────────────────

function riskBadgeClass(risk: string): string {
  return risk === "Critical" ? "badge-red"
       : risk === "High"     ? "badge-orange"
       : risk === "Medium"   ? "badge-yellow"
       : "badge-green";
}

function keylenColor(kl: string | undefined): string {
  if (!kl) return "#64748b";
  if (kl.startsWith("1024")) return "#dc2626";
  if (kl.startsWith("2048")) return "#b45309";
  return "#15803d";
}

function tlsColor(tls: string | undefined): string {
  if (!tls) return "#64748b";
  if (tls === "1.0") return "#dc2626";
  if (tls === "1.2") return "#b45309";
  return "#15803d";
}

function milestoneColor(done: boolean, pct: number): string {
  if (done)    return "#15803d";
  if (pct > 50) return "#b45309";
  return "#dc2626";
}

// ── HTML builder ──────────────────────────────────────────────────────────────

export function buildAuditHTML(opts: ExportPDFOptions): string {
  const {
    enriched, migrationScore, total, totalDays, calDays,
    totalCostUSD, teamSize, devRateUSD, completionDate,
    clientName, clientDomain, milestones,
  } = opts;

  const now        = new Date();
  const timestamp  = now.toLocaleString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
  const scanDate   = now.toISOString().split("T")[0];
  const reportId   = `REBEL-${scanDate.replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const displayName = clientName.trim() || (clientDomain ? normaliseDomain(clientDomain) : "All Assets");
  const scopeStr   = clientDomain ? `*.${normaliseDomain(clientDomain)}` : "All Assets";

  const scoreColor = migrationScore >= 70 ? "#15803d" : migrationScore >= 40 ? "#b45309" : "#dc2626";

  // ── Milestone bars ─────────────────────────────────────────────────────────
  const milestoneHTML = milestones.map(m => {
    const col   = milestoneColor(m.done, m.pct);
    const icon  = m.done ? "✓" : "○";
    return `
    <div class="milestone avoid-break">
      <div class="milestone-header">
        <span class="milestone-name">
          <span style="color:${col};font-weight:700;">${icon}</span>
          ${m.label}
        </span>
        <span class="milestone-pct" style="color:${col};">${m.pct}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${m.pct}%;background:${col};"></div>
      </div>
    </div>`;
  }).join("");

  // ── DORA mapping ───────────────────────────────────────────────────────────
  const doraRows = [
    {
      art: "Art. 9.2", title: "ICT Asset Register",
      desc: "Maintain an up-to-date register of all ICT assets, including cryptographic configurations and certificate metadata.",
      status: total > 0 ? "COVERED" : "PENDING",
    },
    {
      art: "Art. 9.4", title: "Cryptographic Controls",
      desc: "Implement cryptographic controls that protect data in transit and at rest to industry-accepted standards.",
      status: enriched.filter((a: any) => a.status !== "weak" && a.status !== "WEAK").length > 0 ? "PARTIAL" : "PENDING",
    },
    {
      art: "Art. 10.1", title: "Vulnerability Management",
      desc: "Identify, classify, and remediate ICT vulnerabilities—including cryptographic weaknesses—in a timely manner.",
      status: enriched.length > 0 ? "IDENTIFIED" : "CLEAR",
    },
    {
      art: "Art. 11.1", title: "ICT Business Continuity",
      desc: "Maintain ICT continuity plans that address cryptographic dependencies and certificate rotation procedures.",
      status: "ROADMAP PROVIDED",
    },
  ].map(d => {
    const good = ["COVERED", "CLEAR", "ROADMAP PROVIDED"].includes(d.status);
    const mid  = ["PARTIAL", "IDENTIFIED"].includes(d.status);
    const cls  = good ? "badge-green" : mid ? "badge-yellow" : "badge-red";
    return `
    <tr>
      <td class="dora-art">${d.art}</td>
      <td class="dora-title">${d.title}</td>
      <td class="dora-desc">${d.desc}</td>
      <td><span class="badge ${cls}">${d.status}</span></td>
    </tr>`;
  }).join("");

  // ── Asset rows ─────────────────────────────────────────────────────────────
  const assetRows = enriched.map((a: any, i: number) => {
    const ps  = a.pqcScore as PQCScoreBreakdown | undefined;
    const pqcLabel = ps?.active ? "ACTIVE" : ps ? `${ps.score}/100` : "—";
    const pqcColor = ps?.active ? "#15803d" : ps?.color ?? "#64748b";

    const dots = ps
      ? Object.values(ps.criteria).map((c: any) =>
          `<span class="crit-dot" style="background:${c.pass ? "#15803d" : c.pts > 0 ? "#b45309" : "#dc2626"};" title="${c.label}: ${c.pts}/${c.max}"></span>`
        ).join("")
      : "";

    return `
    <tr>
      <td class="text-right mono" style="color:#94a3b8;">${i + 1}</td>
      <td style="color:#1e3a5f;font-weight:600;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.app}</td>
      <td style="color:#475569;font-size:7.5pt;">${a.assetType}</td>
      <td><span class="badge ${riskBadgeClass(a.risk)}">${a.risk}</span></td>
      <td class="mono" style="font-weight:700;color:${keylenColor(a.keylen)};">${a.keylen ?? "—"}</td>
      <td style="color:#64748b;font-size:7pt;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.cipher ?? "—"}</td>
      <td class="mono" style="font-weight:600;color:${tlsColor(a.tls)};">TLS ${a.tls ?? "—"}</td>
      <td style="color:#64748b;font-size:7.5pt;">${a.ca ?? "—"}</td>
      <td class="text-center">
        <span style="color:${pqcColor};font-weight:700;font-family:'Courier New',monospace;font-size:7.5pt;">${pqcLabel}</span>
        <div style="margin-top:3px;">${dots}</div>
      </td>
      <td class="mono text-center" style="color:#0369a1;">${a.days}d</td>
      <td class="mono text-right" style="color:#92400e;font-weight:700;">${fmtINRFull(a.cost)}</td>
    </tr>`;
  }).join("");

  // ── Remediation cards ──────────────────────────────────────────────────────
  const remSections = [
    {
      title: "Upgrade Certificate Key",
      color: "#dc2626",
      items: enriched.filter((a: any) => !(a.pqcScore?.criteria?.certKey4096?.pass)).map((a: any) => a.app),
      fix: "Deploy RSA-4096 or EC P-384 certificates. Worth 70/100 pts — the primary gate for bank infrastructure.",
    },
    {
      title: "Remove Wildcard Certificates",
      color: "#ea580c",
      items: enriched.filter((a: any) => a.is_wildcard).map((a: any) => a.app),
      fix: "Replace wildcards with dedicated per-service certificates. Worth 20/100 pts. Bank services must not share TLS certificates.",
    },
    {
      title: "Deploy Kyber Hybrid KX",
      color: "#0369a1",
      items: enriched.filter((a: any) => !a.pqc).map((a: any) => a.app),
      fix: "Implement X25519+CRYSTALS-Kyber768 (NIST FIPS 203) hybrid key exchange. Required for ACTIVE PQC status.",
    },
  ];

  const remHTML = remSections.map(s => {
    const itemRows = s.items.length > 0
      ? s.items.slice(0, 6).map(app =>
          `<div class="rem-item"><span style="color:${s.color};font-size:8pt;flex-shrink:0;">▸</span>${app}</div>`
        ).join("") + (s.items.length > 6 ? `<div class="rem-item" style="color:#94a3b8;font-style:italic;">+${s.items.length - 6} more</div>` : "")
      : `<div class="rem-item" style="color:#15803d;font-weight:600;">✓ No affected assets</div>`;

    return `
    <div class="rem-card" style="border-top-color:${s.color};">
      <span class="rem-count" style="color:${s.color};">${s.items.length}</span>
      <div class="rem-card-title" style="color:${s.color};">${s.title}</div>
      <div class="rem-card-fix">${s.fix}</div>
      ${itemRows}
    </div>`;
  }).join("");

  // ── Summary KPIs (right-hand column next to gauge) ─────────────────────────
  const critCount = enriched.filter((a: any) => a.risk === "Critical").length;
  const highCount = enriched.filter((a: any) => a.risk === "High").length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>REBEL PQC Audit — ${displayName} — ${scanDate}</title>
  <style>${buildCSS()}</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">⬇ Save PDF</button>

<div class="doc">

  <!-- ══ COVER ════════════════════════════════════════════════════════════ -->
  <div class="cover-bar">
    <div>
      <!-- Logotype -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <svg width="34" height="34" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
          <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#1e3a5f" stroke-width="1.8"/>
          <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill="#dbeafe" stroke="#3b82f6" stroke-width="1"/>
          <circle cx="14" cy="14" r="2.8" fill="#1e3a5f"/>
        </svg>
        <div>
          <div class="brand-name">REBEL</div>
          <div class="brand-sub">Threat Intelligence Platform</div>
        </div>
      </div>
      <div class="report-title">Post-Quantum Cryptography<br/>Audit Report</div>
      <div class="report-subtitle">DORA Art. 9 · NIST FIPS 203/204/205 · PCI-DSS 4.0 · SWIFT CSP</div>
    </div>
    <div class="cover-right">
      <div style="font-size:7.5pt;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">Prepared for</div>
      <div class="cover-client">${displayName}</div>
      ${clientDomain ? `<div class="cover-domain">${normaliseDomain(clientDomain)}</div>` : ""}
    </div>
  </div>

  <!-- meta strip -->
  <div class="meta-row avoid-break">
    <div class="meta-item"><div class="meta-label">Generated</div><div class="meta-value">${timestamp}</div></div>
    <div class="meta-item"><div class="meta-label">Report ID</div><div class="meta-value">${reportId}</div></div>
    <div class="meta-item"><div class="meta-label">Scope</div><div class="meta-value">${scopeStr}</div></div>
    <div class="meta-item"><div class="meta-label">In Scope</div><div class="meta-value">${total} applications</div></div>
  </div>

  <div style="height:18px;"></div>

  <div class="conf-banner">
    ⚠&nbsp; CONFIDENTIAL — Contains sensitive cryptographic posture information.
    Intended solely for the named organisation. Not for external distribution.
    Costs displayed in Indian Rupees (INR) at ₹83/USD.
  </div>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin-bottom:22px;"/>

  <!-- ══ SECTION 1 — EXECUTIVE SUMMARY ════════════════════════════════════ -->
  <div class="section avoid-break">
    <h2>1. Executive Summary</h2>

    <div style="display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:start;">

      <!-- Gauge column -->
      <div class="gauge-wrap">
        ${buildGaugeSVG(migrationScore)}
        <div class="gauge-label">
          <strong>${total}</strong> apps assessed<br/>
          Migration progress: <strong style="color:${scoreColor};">${migrationScore}/100</strong>
        </div>
      </div>

      <!-- KPI grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="kpi-box">
          <div class="kpi-label">Need Migration</div>
          <div class="kpi-value" style="color:#dc2626;">${enriched.length}</div>
          <div class="kpi-sub">Weak / non-PQC assets</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Critical Risk</div>
          <div class="kpi-value" style="color:#dc2626;">${critCount}</div>
          <div class="kpi-sub">Require immediate action</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Est. Timeline</div>
          <div class="kpi-value" style="color:#0369a1;">${calDays}d</div>
          <div class="kpi-sub">${teamSize}-dev team · ${totalDays} dev-days</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Est. Cost (INR)</div>
          <div class="kpi-value" style="color:#92400e;">${fmtINR(totalCostUSD)}</div>
          <div class="kpi-sub">@ ${fmtINR(devRateUSD)} / dev-day</div>
        </div>
        <div class="kpi-box" style="grid-column:1/-1;">
          <div class="kpi-label">Projected Completion</div>
          <div class="kpi-value" style="font-size:16pt;color:#0369a1;">${completionDate}</div>
          <div class="kpi-sub">${critCount} critical · ${highCount} high priority · ${teamSize} developers</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ SECTION 2 — PQC MILESTONES ═══════════════════════════════════════ -->
  <div class="section avoid-break">
    <h2>2. PQC Migration Milestones (5 × 20 pts)</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;">
      <div>${milestoneHTML}</div>
      <div>
        <div style="font-size:8pt;color:#334155;font-weight:700;margin-bottom:8px;">Scoring Criteria (per application)</div>
        ${[
          { label: "Certificate RSA-4096 or EC P-384", pts: "70 pts" },
          { label: "No wildcard certificate",          pts: "20 pts" },
          { label: "AES-256-GCM / ChaCha20-Poly1305",  pts:  "8 pts" },
          { label: "X25519 or P-384 key exchange",     pts:  "2 pts" },
          { label: "TLS 1.3 (hygiene check)",          pts:   "info" },
          { label: "No CBC cipher modes (hygiene)",    pts:   "info" },
        ].map(c => `
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:8.5pt;">
            <span style="color:#334155;">${c.label}</span>
            <span style="font-family:'Courier New',monospace;font-weight:700;color:#1e3a5f;min-width:36px;text-align:right;">${c.pts}</span>
          </div>`).join("")}
        <div style="font-size:7.5pt;color:#64748b;margin-top:8px;line-height:1.65;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;">
          An asset reaches <strong>ACTIVE</strong> PQC status only when Kyber hybrid (FIPS 203)
          key exchange is deployed in addition to meeting all certificate criteria.
        </div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ══ SECTION 3 — DORA REGULATORY MAPPING ══════════════════════════════ -->
  <div class="section">
    <h2>3. DORA Regulatory Mapping</h2>
    <table class="dora">
      <thead>
        <tr>
          <th style="width:68px;">Article</th>
          <th style="width:140px;">Requirement</th>
          <th>Description</th>
          <th style="width:100px;">Status</th>
        </tr>
      </thead>
      <tbody>${doraRows}</tbody>
    </table>
  </div>

  <!-- ══ SECTION 4 — ASSET INVENTORY ══════════════════════════════════════ -->
  <div class="section">
    <h2>4. Application Cryptographic Inventory — Ranked by Risk Priority</h2>
    <table class="assets">
      <thead>
        <tr>
          <th style="width:18px;">#</th>
          <th>Application</th>
          <th>Type</th>
          <th>Risk</th>
          <th>Key Len</th>
          <th>Cipher Suite</th>
          <th>TLS</th>
          <th>CA</th>
          <th class="text-center">PQC Score</th>
          <th class="text-center">Days</th>
          <th class="text-right">Cost (INR)</th>
        </tr>
      </thead>
      <tbody>${assetRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="9" style="font-size:8pt;color:#334155;">Totals</td>
          <td class="mono text-center" style="color:#0369a1;">${totalDays}d</td>
          <td class="mono text-right" style="color:#92400e;">${fmtINRFull(totalCostUSD)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- ══ SECTION 5 — REMEDIATION ═══════════════════════════════════════════ -->
  <div class="section avoid-break">
    <h2>5. Remediation Actions — Priority Order</h2>
    <div class="rem-grid">${remHTML}</div>
  </div>

  <!-- ══ SIGNATURES ════════════════════════════════════════════════════════ -->
  <div class="sig-grid avoid-break">
    ${["Prepared by", "Reviewed by", "Approved by"].map(role => `
    <div>
      <div class="sig-role">${role}</div>
      <div class="sig-line"></div>
      <div class="sig-hint">Signature &amp; Date</div>
    </div>`).join("")}
  </div>

  <!-- ══ FOOTER ════════════════════════════════════════════════════════════ -->
  <div class="doc-footer">
    REBEL Threat Intelligence Platform &nbsp;·&nbsp; Report ID: ${reportId}
    &nbsp;·&nbsp; ${displayName}${clientDomain ? ` · Scope: ${scopeStr}` : ""}
    <br/>
    Confidential — intended solely for the named organisation.
    Costs displayed in Indian Rupees (INR) at an exchange rate of ₹83 per USD.
    <br/>
    This report was generated automatically and does not constitute professional legal or compliance advice.
  </div>

</div><!-- /doc -->
</body>
</html>`;
}

// ── Public entry-point ────────────────────────────────────────────────────────

export function exportAuditPDF(opts: ExportPDFOptions): void {
  const html = buildAuditHTML(opts);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) win.focus();
  // Revoke after a short delay so the browser has finished loading the blob
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}