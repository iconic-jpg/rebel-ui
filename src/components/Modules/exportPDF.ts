/**
 * REBEL — PQC Audit PDF Export
 * EU-grade compliance typography. All costs INR.
 */

import type { PQCScoreBreakdown } from "./cipherAnalysis.js";

// ── INR formatters ────────────────────────────────────────────────────────────

function fmtINR(inr: number): string {
  if (inr >= 10_000_000) return `₹${(inr / 10_000_000).toFixed(2)} Cr`;
  if (inr >= 100_000)    return `₹${(inr / 100_000).toFixed(1)} L`;
  return `₹${inr.toLocaleString("en-IN")}`;
}

function fmtINRFull(inr: number): string {
  return `₹${inr.toLocaleString("en-IN")}`;
}

function normaliseDomain(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExportPDFOptions {
  enriched:       any[];
  migrationScore: number;
  pqcReady:       number;
  total:          number;
  totalDays:      number;
  calDays:        number;
  totalCostINR:   number;
  teamSize:       number;
  devRateINR:     number;
  completionDate: string;
  clientName:     string;
  clientDomain:   string;
  milestones: Array<{ label: string; done: boolean; pct: number }>;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

function buildCSS(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.5;
      color: #0f172a;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
    }

    .page-break  { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }

    /* Monospace — JetBrains Mono for all codes, IDs, numbers */
    .mono { font-family: 'JetBrains Mono', 'Courier New', monospace; }

    .text-right  { text-align: right; }
    .text-center { text-align: center; }

    /* ── Save button ── */
    .save-btn {
      display: block;
      margin: 0 auto 28px;
      background: #0f172a;
      color: #fff;
      border: none;
      padding: 10px 28px;
      border-radius: 3px;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .06em;
    }
    .save-btn:hover { background: #1e293b; }
    @media print { .save-btn { display: none !important; } }

    /* ── Doc wrapper ── */
    .doc { max-width: 730px; margin: 0 auto; padding: 0 0 48px; }

    /* ── Cover ── */
    .cover-accent { height: 3px; background: linear-gradient(90deg, #1e40af 0%, #0ea5e9 100%); margin-bottom: 22px; }

    .cover-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 24px;
    }

    .brand {
      font-family: 'Inter', sans-serif;
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: .18em;
      color: #0f172a;
      line-height: 1;
    }
    .brand-sub {
      font-size: 6pt;
      color: #94a3b8;
      letter-spacing: .2em;
      text-transform: uppercase;
      margin-top: 5px;
      font-weight: 500;
    }

    .report-title {
      font-size: 18pt;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
      margin: 16px 0 6px;
      letter-spacing: -.02em;
    }
    .report-std {
      font-size: 7pt;
      color: #64748b;
      letter-spacing: .04em;
      font-weight: 500;
    }

    .cover-right    { text-align: right; }
    .client-label   { font-size: 6pt; color: #94a3b8; text-transform: uppercase; letter-spacing: .14em; font-weight: 600; margin-bottom: 5px; }
    .client-name    { font-size: 14pt; font-weight: 700; color: #0f172a; letter-spacing: -.01em; }
    .client-domain  { font-family: 'JetBrains Mono', monospace; font-size: 8pt; color: #475569; margin-top: 4px; }

    /* ── Meta strip ── */
    .meta-strip {
      display: flex; gap: 0; flex-wrap: wrap;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .meta-item {
      flex: 1; min-width: 120px;
      padding: 9px 14px;
      border-right: 1px solid #e2e8f0;
    }
    .meta-item:last-child { border-right: none; }
    .meta-label { font-size: 6pt; color: #94a3b8; text-transform: uppercase; letter-spacing: .14em; font-weight: 600; margin-bottom: 3px; }
    .meta-val   { font-family: 'JetBrains Mono', monospace; font-size: 8pt; color: #0f172a; font-weight: 600; }

    /* ── Confidential banner ── */
    .conf {
      display: flex; align-items: flex-start; gap: 10px;
      border: 1px solid #fde68a;
      background: #fffbeb;
      border-left: 3px solid #d97706;
      padding: 8px 12px;
      font-size: 7.5pt;
      color: #78350f;
      margin-bottom: 20px;
      border-radius: 0 3px 3px 0;
      font-weight: 500;
    }

    /* ── Section headings ── */
    .section { margin-bottom: 20px; }

    h2 {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .18em;
      color: #1e40af;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }

    /* ── KPI grid ── */
    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

    .kpi {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 12px 14px;
      background: #fafafa;
    }
    .kpi-label {
      font-size: 6pt; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .14em;
      font-weight: 600; margin-bottom: 5px;
    }
    .kpi-val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 22pt; font-weight: 700; line-height: 1;
    }
    .kpi-sub { font-size: 7pt; color: #64748b; margin-top: 4px; font-weight: 500; }

    /* ── Gauge ── */
    .gauge-wrap {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 18px 14px;
      background: #fafafa;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .gauge-caption { font-size: 7.5pt; color: #475569; text-align: center; line-height: 1.7; font-weight: 500; }

    /* ── Milestone bars ── */
    .ms      { margin-bottom: 9px; }
    .ms-row  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .ms-name { font-size: 8pt; color: #334155; display: flex; align-items: center; gap: 7px; font-weight: 500; }
    .ms-pct  { font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; font-weight: 700; }
    .bar     { height: 5px; background: #f1f5f9; border-radius: 3px; }
    .bar-fill { height: 100%; border-radius: 3px; }

    /* ── Criteria table ── */
    .crit-table { width: 100%; font-size: 8pt; border-collapse: collapse; }
    .crit-table td { padding: 5px 0; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .crit-table tr:last-child td { border-bottom: none; }

    /* ── DORA table ── */
    table.dora { width: 100%; border-collapse: collapse; font-size: 8pt; }
    table.dora th {
      background: #f8fafc; padding: 7px 10px;
      font-size: 6.5pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: .1em; color: #64748b;
      border-bottom: 2px solid #e2e8f0; text-align: left;
    }
    table.dora td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; color: #334155; }
    table.dora tr:last-child td { border-bottom: none; }

    /* ── Asset table ── */
    table.assets { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
    table.assets th {
      background: #f8fafc; padding: 6px 7px;
      font-size: 6pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: .1em; color: #64748b;
      border-bottom: 2px solid #e2e8f0; text-align: left; white-space: nowrap;
    }
    table.assets td { padding: 6px 7px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    table.assets tr:nth-child(even) td { background: #fafafa; }
    table.assets tfoot td {
      padding: 7px; border-top: 2px solid #e2e8f0;
      font-weight: 700; background: #f8fafc; font-size: 7.5pt;
    }

    /* ── Badges ── */
    .badge {
      display: inline-block;
      font-size: 6pt; font-weight: 700;
      padding: 2px 6px; border-radius: 3px;
      letter-spacing: .06em;
      font-family: 'Inter', sans-serif;
      text-transform: uppercase;
    }
    .badge-red    { color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; }
    .badge-orange { color: #92400e; background: #fff7ed; border: 1px solid #fed7aa; }
    .badge-yellow { color: #713f12; background: #fefce8; border: 1px solid #fde68a; }
    .badge-green  { color: #14532d; background: #f0fdf4; border: 1px solid #bbf7d0; }

    /* ── Remediation cards ── */
    .rem-grid  { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .rem-card  { border: 1px solid #e2e8f0; border-top: 3px solid; padding: 12px; border-radius: 0 0 4px 4px; }
    .rem-title { font-size: 8pt; font-weight: 700; margin-bottom: 5px; }
    .rem-fix   { font-size: 7.5pt; color: #475569; margin-bottom: 10px; line-height: 1.6; font-weight: 500; }
    .rem-count { font-family: 'JetBrains Mono', monospace; font-size: 20pt; font-weight: 700; float: right; line-height: 1; }
    .rem-item  {
      font-size: 7pt; color: #334155; font-weight: 500;
      padding: 3px 0; border-top: 1px solid #f1f5f9;
      display: flex; align-items: flex-start; gap: 5px;
    }

    /* ── Signatures ── */
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 40px; }
    .sig-role { font-size: 6.5pt; color: #94a3b8; text-transform: uppercase; letter-spacing: .12em; font-weight: 600; margin-bottom: 32px; }
    .sig-line { border-bottom: 1px solid #cbd5e1; margin-bottom: 5px; }
    .sig-hint { font-size: 6.5pt; color: #94a3b8; }

    /* ── Footer ── */
    .doc-footer {
      margin-top: 28px; padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 6pt; color: #94a3b8;
      text-align: center; line-height: 2;
      font-weight: 500;
    }

    .crit-dot {
      display: inline-block; width: 6px; height: 6px;
      border-radius: 50%; margin-right: 2px; vertical-align: middle;
    }
  `.trim();
}

// ── Gauge SVG ─────────────────────────────────────────────────────────────────

function buildGaugeSVG(score: number): string {
  const pct = Math.min(0.999, Math.max(0.001, score / 100));
  const r = 52, cx = 68, cy = 70;
  const x1 = cx + r * Math.cos(Math.PI);
  const y1 = cy + r * Math.sin(Math.PI);
  const x2 = cx + r * Math.cos(Math.PI + Math.PI * pct);
  const y2 = cy + r * Math.sin(Math.PI + Math.PI * pct);
  const la  = pct > 0.5 ? 1 : 0;
  const col = score >= 70 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626";
  const lbl = score >= 70 ? "COMPLIANT" : score >= 40 ? "AT RISK" : "CRITICAL";

  return `<svg width="136" height="86" viewBox="0 0 136 86" xmlns="http://www.w3.org/2000/svg">
  <path d="M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}" fill="none" stroke="#e2e8f0" stroke-width="10" stroke-linecap="round"/>
  <path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${la} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round"/>
  <text x="${cx}" y="${cy-4}" text-anchor="middle" font-family="Inter,sans-serif" font-size="22" font-weight="700" fill="${col}">${score}</text>
  <text x="${cx}" y="${cy+13}" text-anchor="middle" font-family="Inter,sans-serif" font-size="6.5" font-weight="600" fill="${col}" letter-spacing="1.6">${lbl}</text>
</svg>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskCls(risk: string): string {
  return risk === "Critical" ? "badge-red"
       : risk === "High"     ? "badge-orange"
       : risk === "Medium"   ? "badge-yellow"
       : "badge-green";
}

function keyCol(kl: string | undefined): string {
  if (!kl)                    return "#64748b";
  if (kl.startsWith("1024")) return "#dc2626";
  if (kl.startsWith("2048")) return "#d97706";
  return "#16a34a";
}

function tlsCol(tls: string | undefined): string {
  if (!tls)           return "#64748b";
  if (tls === "1.0") return "#dc2626";
  if (tls === "1.2") return "#d97706";
  return "#16a34a";
}

function msColor(done: boolean, pct: number): string {
  if (done)     return "#16a34a";
  if (pct > 50) return "#d97706";
  return "#dc2626";
}

// ── HTML builder ──────────────────────────────────────────────────────────────

export function buildAuditHTML(opts: ExportPDFOptions): string {
  const {
    enriched, migrationScore, total, totalDays, calDays,
    totalCostINR, teamSize, devRateINR, completionDate,
    clientName, clientDomain, milestones,
  } = opts;

  const now         = new Date();
  const timestamp   = now.toLocaleString("en-IN", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
  const scanDate    = now.toISOString().split("T")[0];
  const reportId    = `REBEL-${scanDate.replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const displayName = clientName.trim() || (clientDomain ? normaliseDomain(clientDomain) : "All Assets");
  const scopeStr    = clientDomain ? `*.${normaliseDomain(clientDomain)}` : "All Assets";
  const scoreColor  = migrationScore >= 70 ? "#16a34a" : migrationScore >= 40 ? "#d97706" : "#dc2626";
  const critCount   = enriched.filter((a: any) => a.risk === "Critical").length;
  const highCount   = enriched.filter((a: any) => a.risk === "High").length;

  // ── Milestones ──────────────────────────────────────────────────────────────
  const msHTML = milestones.map(m => {
    const col  = msColor(m.done, m.pct);
    const icon = m.done ? "✓" : "○";
    return `<div class="ms avoid-break">
      <div class="ms-row">
        <span class="ms-name"><span style="color:${col};font-weight:700;">${icon}</span>${m.label}</span>
        <span class="ms-pct" style="color:${col};">${m.pct}%</span>
      </div>
      <div class="bar"><div class="bar-fill" style="width:${m.pct}%;background:${col};"></div></div>
    </div>`;
  }).join("");

  // ── DORA rows ───────────────────────────────────────────────────────────────
  const doraRows = [
    { art: "Art. 9.2",  title: "ICT Asset Register",       desc: "Maintain a current register of all ICT assets, including cryptographic configurations and certificate metadata.", status: total > 0 ? "COVERED" : "PENDING" },
    { art: "Art. 9.4",  title: "Cryptographic Controls",   desc: "Implement controls protecting data in transit and at rest to current industry standards.", status: enriched.filter((a: any) => a.status !== "weak" && a.status !== "WEAK").length > 0 ? "PARTIAL" : "PENDING" },
    { art: "Art. 10.1", title: "Vulnerability Management", desc: "Identify, classify, and remediate ICT vulnerabilities including cryptographic weaknesses.", status: enriched.length > 0 ? "IDENTIFIED" : "CLEAR" },
    { art: "Art. 11.1", title: "ICT Business Continuity",  desc: "Maintain continuity plans covering cryptographic dependencies and certificate rotation procedures.", status: "ROADMAP PROVIDED" },
  ].map(d => {
    const cls = ["COVERED","CLEAR","ROADMAP PROVIDED"].includes(d.status) ? "badge-green"
              : ["PARTIAL","IDENTIFIED"].includes(d.status)               ? "badge-yellow"
              : "badge-red";
    return `<tr>
      <td style="font-family:'JetBrains Mono',monospace;font-weight:600;color:#1e40af;white-space:nowrap;font-size:7.5pt;">${d.art}</td>
      <td style="font-weight:600;color:#0f172a;">${d.title}</td>
      <td style="color:#475569;font-size:7.5pt;line-height:1.6;">${d.desc}</td>
      <td><span class="badge ${cls}">${d.status}</span></td>
    </tr>`;
  }).join("");

  // ── Asset rows ──────────────────────────────────────────────────────────────
  const assetRows = enriched.map((a: any, i: number) => {
    const ps       = a.pqcScore as PQCScoreBreakdown | undefined;
    const pqcLabel = ps?.active ? "ACTIVE" : ps ? `${ps.score}/100` : "—";
    const pqcColor = ps?.active ? "#16a34a" : (ps?.color ?? "#64748b");
    const dots     = ps
      ? Object.values(ps.criteria).map((c: any) =>
          `<span class="crit-dot" style="background:${c.pass ? "#16a34a" : c.pts > 0 ? "#d97706" : "#dc2626"};"></span>`
        ).join("")
      : "";

    return `<tr>
      <td class="mono text-right" style="color:#94a3b8;font-size:7pt;">${i + 1}</td>
      <td style="color:#1e40af;font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.app}</td>
      <td style="color:#475569;">${a.assetType}</td>
      <td><span class="badge ${riskCls(a.risk)}">${a.risk}</span></td>
      <td class="mono" style="font-weight:600;color:${keyCol(a.keylen)};font-size:7pt;">${a.keylen ?? "—"}</td>
      <td style="color:#64748b;font-size:6.5pt;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.cipher ?? "—"}</td>
      <td class="mono" style="font-weight:600;color:${tlsCol(a.tls)};font-size:7pt;">TLS ${a.tls ?? "—"}</td>
      <td style="color:#64748b;font-size:7pt;">${a.ca ?? "—"}</td>
      <td class="text-center">
        <span style="color:${pqcColor};font-weight:700;font-family:'JetBrains Mono',monospace;font-size:7pt;">${pqcLabel}</span>
        <div style="margin-top:3px;">${dots}</div>
      </td>
      <td class="mono text-center" style="color:#0369a1;font-weight:600;">${a.days}d</td>
      <td class="mono text-right" style="color:#92400e;font-weight:700;">${fmtINRFull(a.cost)}</td>
    </tr>`;
  }).join("");

  // ── Remediation cards ────────────────────────────────────────────────────────
  const remHTML = [
    { title: "Upgrade Certificate Key",       color: "#dc2626", fix: "Deploy RSA-4096 or EC P-384 certificates. Primary gate — worth 70/100 pts.", items: enriched.filter((a: any) => !(a.pqcScore?.criteria?.certKey4096?.pass)).map((a: any) => a.app) },
    { title: "Remove Wildcard Certificates",  color: "#ea580c", fix: "Replace wildcards with dedicated per-service certificates. Worth 20/100 pts.", items: enriched.filter((a: any) => a.is_wildcard).map((a: any) => a.app) },
    { title: "Deploy Kyber Hybrid KX",        color: "#1d4ed8", fix: "Implement X25519+CRYSTALS-Kyber768 (NIST FIPS 203). Required for ACTIVE status.", items: enriched.filter((a: any) => !a.pqc).map((a: any) => a.app) },
  ].map(s => {
    const rows = s.items.length > 0
      ? s.items.slice(0, 6).map(app =>
          `<div class="rem-item"><span style="color:${s.color};flex-shrink:0;font-size:8pt;">▸</span>${app}</div>`
        ).join("") +
        (s.items.length > 6 ? `<div class="rem-item" style="color:#94a3b8;font-style:italic;">+${s.items.length - 6} additional</div>` : "")
      : `<div class="rem-item" style="color:#16a34a;font-weight:600;">✓ No affected assets</div>`;

    return `<div class="rem-card" style="border-top-color:${s.color};">
      <span class="rem-count" style="color:${s.color};">${s.items.length}</span>
      <div class="rem-title" style="color:${s.color};">${s.title}</div>
      <div class="rem-fix">${s.fix}</div>
      ${rows}
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>REBEL PQC Audit — ${displayName} — ${scanDate}</title>
  <style>${buildCSS()}</style>
</head>
<body>

<button class="save-btn" onclick="window.print()">⬇ &nbsp; Save as PDF</button>

<div class="doc">

  <!-- COVER -->
  <div class="cover-accent"></div>
  <div class="cover-flex">
    <div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
        <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
          <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#1e40af" stroke-width="1.8"/>
          <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill="#dbeafe" stroke="#3b82f6" stroke-width="1"/>
          <circle cx="14" cy="14" r="2.8" fill="#1e40af"/>
        </svg>
        <div>
          <div class="brand">REBEL</div>
          <div class="brand-sub">Threat Intelligence Platform</div>
        </div>
      </div>
      <div class="report-title">Post-Quantum Cryptography<br/>Audit Report</div>
      <div class="report-std">DORA Art. 9 &nbsp;·&nbsp; NIST FIPS 203/204/205 &nbsp;·&nbsp; PCI-DSS 4.0 &nbsp;·&nbsp; SWIFT CSP</div>
    </div>
    <div class="cover-right">
      <div class="client-label">Prepared for</div>
      <div class="client-name">${displayName}</div>
      ${clientDomain ? `<div class="client-domain">${normaliseDomain(clientDomain)}</div>` : ""}
    </div>
  </div>

  <!-- META STRIP -->
  <div class="meta-strip avoid-break">
    <div class="meta-item"><div class="meta-label">Generated</div><div class="meta-val">${timestamp}</div></div>
    <div class="meta-item"><div class="meta-label">Report ID</div><div class="meta-val">${reportId}</div></div>
    <div class="meta-item"><div class="meta-label">Scope</div><div class="meta-val">${scopeStr}</div></div>
    <div class="meta-item" style="border-right:none;"><div class="meta-label">In Scope</div><div class="meta-val">${total} applications</div></div>
  </div>

  <div class="conf">
    <span style="font-weight:700;letter-spacing:.06em;">CONFIDENTIAL</span>
    &nbsp;— This document contains sensitive cryptographic posture information and is intended
    solely for the named organisation. It must not be reproduced or disclosed to any third party
    without written authorisation.
  </div>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin-bottom:18px;"/>

  <!-- 1. EXECUTIVE SUMMARY -->
  <div class="section avoid-break">
    <h2>1. Executive Summary</h2>
    <div style="display:grid;grid-template-columns:180px 1fr;gap:14px;align-items:start;">
      <div class="gauge-wrap">
        ${buildGaugeSVG(migrationScore)}
        <div class="gauge-caption">
          <strong>${total}</strong> applications assessed<br/>
          Progress: <strong style="color:${scoreColor};">${migrationScore} / 100</strong>
        </div>
      </div>
      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-label">Require Migration</div>
          <div class="kpi-val" style="color:#dc2626;">${enriched.length}</div>
          <div class="kpi-sub">Non-compliant assets</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Critical Risk</div>
          <div class="kpi-val" style="color:#dc2626;">${critCount}</div>
          <div class="kpi-sub">Immediate remediation required</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Estimated Timeline</div>
          <div class="kpi-val" style="color:#1d4ed8;">${calDays}d</div>
          <div class="kpi-sub">${teamSize}-developer team · ${totalDays} dev-days</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Estimated Cost</div>
          <div class="kpi-val" style="color:#c2410c;">${fmtINR(totalCostINR)}</div>
          <div class="kpi-sub">${fmtINR(devRateINR)} per developer / day</div>
        </div>
        <div class="kpi" style="grid-column:1/-1;background:#eff6ff;border-color:#bfdbfe;">
          <div class="kpi-label">Projected Completion Date</div>
          <div class="kpi-val" style="font-size:15pt;color:#1d4ed8;">${completionDate}</div>
          <div class="kpi-sub">${critCount} critical · ${highCount} high priority · ${teamSize} developers</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 2. MILESTONES -->
  <div class="section avoid-break">
    <h2>2. PQC Migration Milestones (5 × 20 pts)</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:start;">
      <div>${msHTML}</div>
      <div>
        <div style="font-size:7pt;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Scoring criteria per application</div>
        <table class="crit-table">
          ${[
            ["Certificate RSA-4096 or EC P-384", "70 pts"],
            ["No wildcard certificate",          "20 pts"],
            ["AES-256-GCM / ChaCha20-Poly1305",   "8 pts"],
            ["X25519 or P-384 key exchange",      "2 pts"],
            ["TLS 1.3 in use",                   "hygiene"],
            ["No CBC cipher modes",              "hygiene"],
          ].map(([label, pts]) => `<tr>
            <td>${label}</td>
            <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:700;color:#1e40af;">${pts}</td>
          </tr>`).join("")}
        </table>
        <div style="font-size:7pt;color:#64748b;margin-top:8px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:3px;line-height:1.7;font-weight:500;">
          An application reaches <strong style="color:#0f172a;">ACTIVE</strong> PQC status when
          CRYSTALS-Kyber768 (FIPS 203) hybrid key exchange is deployed
          alongside all certificate requirements.
        </div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- 3. DORA -->
  <div class="section">
    <h2>3. DORA Regulatory Mapping</h2>
    <table class="dora">
      <thead>
        <tr>
          <th style="width:65px;">Article</th>
          <th style="width:130px;">Requirement</th>
          <th>Description</th>
          <th style="width:100px;">Status</th>
        </tr>
      </thead>
      <tbody>${doraRows}</tbody>
    </table>
  </div>

  <!-- 4. INVENTORY -->
  <div class="section">
    <h2>4. Application Cryptographic Inventory — Ranked by Risk</h2>
    <table class="assets">
      <thead>
        <tr>
          <th style="width:16px;">#</th>
          <th>Application</th>
          <th>Type</th>
          <th>Risk</th>
          <th>Key</th>
          <th>Cipher Suite</th>
          <th>TLS</th>
          <th>CA</th>
          <th class="text-center">PQC</th>
          <th class="text-center">Days</th>
          <th class="text-right">Cost</th>
        </tr>
      </thead>
      <tbody>${assetRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="9" style="color:#334155;">Totals</td>
          <td class="mono text-center" style="color:#0369a1;">${totalDays}d</td>
          <td class="mono text-right" style="color:#92400e;">${fmtINRFull(totalCostINR)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- 5. REMEDIATION -->
  <div class="section avoid-break">
    <h2>5. Remediation Actions — Priority Order</h2>
    <div class="rem-grid">${remHTML}</div>
  </div>

  <!-- SIGNATURES -->
  <div class="sig-grid avoid-break">
    ${["Prepared by", "Reviewed by", "Approved by"].map(role => `
    <div>
      <div class="sig-role">${role}</div>
      <div class="sig-line"></div>
      <div class="sig-hint">Signature &amp; Date</div>
    </div>`).join("")}
  </div>

  <!-- FOOTER -->
  <div class="doc-footer">
    REBEL Threat Intelligence Platform &nbsp;·&nbsp; Report ID: ${reportId}
    &nbsp;·&nbsp; ${displayName}${clientDomain ? ` &nbsp;·&nbsp; Scope: ${scopeStr}` : ""}
    <br/>
    Confidential — intended solely for the named organisation.
  </div>

</div>
</body>
</html>`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function exportAuditPDF(opts: ExportPDFOptions): void {
  const html = buildAuditHTML(opts);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) win.focus();
  setTimeout(() => URL.revokeObjectURL(url), 15_000);
}