/**
 * REBEL — Key Rotation Proof-of-Rotation Audit PDF Export
 *
 * Standalone export for Key Rotation Theater compliance.
 * Designed to EU audit-verification standards:
 *   DORA Art. 9.4 (KLM) · FFIEC · MAS TRM 9.2.4 · BaFin BAIT § 7
 *   NIS2 Art. 21 · ISO 27001:2022 A.8.24 · PCI-DSS 4.0 Req. 3.7
 *
 * Usage (from KeyRotationPanel.tsx or PQCReadiness.tsx):
 *   import { exportKRPDF } from "./exportKRPDF";
 *   exportKRPDF(krScanResult, { clientName: "Acme Bank", clientDomain: "acmebank.eu" });
 *
 * Note: remediation_cost in KRRecord is expected in USD — converted to INR here.
 */
// ── Constants ─────────────────────────────────────────────────────────────────
const INR_RATE = 83;
const STATUS_COLOR = {
    COMPLIANT: "#16a34a",
    OVERDUE: "#c2410c",
    CRITICAL: "#dc2626",
    NEVER_ROTATED: "#dc2626",
    UNKNOWN: "#64748b",
};
const STATUS_BG = {
    COMPLIANT: "#f0fdf4",
    OVERDUE: "#fff7ed",
    CRITICAL: "#fef2f2",
    NEVER_ROTATED: "#fef2f2",
    UNKNOWN: "#f8fafc",
};
const STATUS_LABEL = {
    COMPLIANT: "Compliant",
    OVERDUE: "Overdue",
    CRITICAL: "Critical",
    NEVER_ROTATED: "Never Rotated",
    UNKNOWN: "Unknown",
};
/** Regulatory frameworks mapped to their formal citation strings */
const FRAMEWORK_CITE = {
    FFIEC: "FFIEC IT Examination Handbook — Information Security",
    "MAS TRM": "MAS TRM 2021 § 9.2.4 Cryptographic Key Management",
    BaFin: "BaFin BAIT § 7.3 Cryptographic Procedures",
    DORA: "DORA Art. 9.4 — Cryptographic Controls",
    NIS2: "NIS2 Directive Art. 21 — Security Measures",
    "ISO 27001": "ISO/IEC 27001:2022 A.8.24 Use of Cryptography",
    "PCI-DSS": "PCI-DSS v4.0 Req. 3.7 — Cryptographic Key Management",
};
// ── Formatters ────────────────────────────────────────────────────────────────
function fmtINR(inr) {
    if (inr >= 10_000_000)
        return `₹${(inr / 10_000_000).toFixed(2)} Cr`;
    if (inr >= 100_000)
        return `₹${(inr / 100_000).toFixed(1)} L`;
    return `₹${inr.toLocaleString("en-IN")}`;
}
function normaliseDomain(raw) {
    return raw.trim().toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/.*$/, "");
}
function fmtDate(iso) {
    if (!iso)
        return "—";
    try {
        return new Date(iso).toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
        });
    }
    catch {
        return iso;
    }
}
// ── Helpers ───────────────────────────────────────────────────────────────────
function riskBadgeCls(risk) {
    return risk === "CRITICAL" ? "badge-red"
        : risk === "HIGH" ? "badge-orange"
            : risk === "MEDIUM" ? "badge-yellow"
                : "badge-green";
}
function statusBadge(status) {
    const col = STATUS_COLOR[status] ?? "#64748b";
    const bg = STATUS_BG[status] ?? "#f8fafc";
    const lbl = STATUS_LABEL[status] ?? status;
    return `<span style="
    display:inline-block;font-size:6pt;font-weight:700;text-transform:uppercase;
    letter-spacing:.07em;padding:2px 6px;border-radius:3px;
    color:${col};background:${bg};border:1px solid ${col}44;">
    ${lbl}
  </span>`;
}
// ── CSS ───────────────────────────────────────────────────────────────────────
function buildCSS() {
    return `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.55;
      color: #0a0f1e;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page {
      size: A4;
      margin: 20mm 17mm 22mm 17mm;
    }

    .page-break  { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }

    .mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
    .right { text-align: right; }
    .center { text-align: center; }

    /* ── Print button ── */
    .print-btn {
      display: block; margin: 0 auto 32px;
      background: #0a0f1e; color: #f1f5f9;
      border: none; padding: 11px 32px;
      border-radius: 2px; cursor: pointer;
      font-family: 'IBM Plex Sans', sans-serif;
      font-size: 10px; font-weight: 600;
      letter-spacing: .1em; text-transform: uppercase;
    }
    .print-btn:hover { background: #1e293b; }
    @media print { .print-btn { display: none !important; } }

    /* ── Document wrapper ── */
    .doc { max-width: 740px; margin: 0 auto; padding: 0 0 56px; }

    /* ── Cover stripe ── */
    .cover-stripe {
      height: 4px;
      background: repeating-linear-gradient(
        90deg,
        #1e3a8a 0px, #1e3a8a 32px,
        #0ea5e9 32px, #0ea5e9 64px,
        #1e3a8a 64px, #1e3a8a 96px
      );
      margin-bottom: 26px;
    }

    /* ── Cover layout ── */
    .cover-flex {
      display: flex; justify-content: space-between;
      align-items: flex-start; gap: 28px; margin-bottom: 20px;
    }

    /* ── Brand ── */
    .brand {
      font-size: 22pt; font-weight: 700;
      letter-spacing: .2em; color: #0a0f1e; line-height: 1;
    }
    .brand-sub {
      font-size: 5.5pt; color: #94a3b8; letter-spacing: .22em;
      text-transform: uppercase; margin-top: 5px; font-weight: 600;
    }
    .report-class {
      display: inline-block; margin-top: 10px;
      font-size: 6pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: .2em; color: #1e3a8a;
      border: 1.5px solid #1e3a8a; padding: 2px 8px; border-radius: 2px;
    }
    .report-title {
      font-size: 17pt; font-weight: 700; color: #0a0f1e;
      line-height: 1.2; margin: 14px 0 5px; letter-spacing: -.02em;
    }
    .report-subtitle {
      font-size: 8.5pt; color: #475569; font-weight: 500; line-height: 1.7;
    }

    /* ── Client block ── */
    .cover-right { text-align: right; }
    .client-label {
      font-size: 5.5pt; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .16em;
      font-weight: 700; margin-bottom: 5px;
    }
    .client-name { font-size: 13pt; font-weight: 700; color: #0a0f1e; letter-spacing: -.01em; }
    .client-domain {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 7.5pt; color: #475569; margin-top: 4px;
    }

    /* ── Meta strip ── */
    .meta-strip {
      display: flex; flex-wrap: wrap;
      border: 1px solid #e2e8f0; border-radius: 3px;
      margin-bottom: 14px; overflow: hidden;
    }
    .meta-item {
      flex: 1; min-width: 110px;
      padding: 8px 13px; border-right: 1px solid #e2e8f0;
    }
    .meta-item:last-child { border-right: none; }
    .meta-label {
      font-size: 5.5pt; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .15em;
      font-weight: 700; margin-bottom: 3px;
    }
    .meta-val {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 7.5pt; color: #0a0f1e; font-weight: 600;
    }

    /* ── Classification banner ── */
    .classification {
      display: flex; align-items: flex-start; gap: 10px;
      border-left: 3px solid #1e3a8a;
      background: #eff6ff; padding: 9px 13px;
      font-size: 7.5pt; color: #1e3a8a;
      margin-bottom: 6px; border-radius: 0 3px 3px 0; font-weight: 500;
    }
    .conf {
      display: flex; align-items: flex-start; gap: 10px;
      border-left: 3px solid #d97706;
      background: #fffbeb; padding: 9px 13px;
      font-size: 7.5pt; color: #78350f;
      margin-bottom: 18px; border-radius: 0 3px 3px 0; font-weight: 500;
    }

    /* ── Divider ── */
    hr.section-rule {
      border: none; border-top: 1px solid #e2e8f0; margin-bottom: 18px;
    }

    /* ── Section headings ── */
    .section { margin-bottom: 22px; }
    h2 {
      font-size: 7pt; font-weight: 700;
      text-transform: uppercase; letter-spacing: .22em;
      color: #1e3a8a; border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px; margin-bottom: 13px;
    }
    h3 {
      font-size: 7.5pt; font-weight: 700; color: #334155;
      text-transform: uppercase; letter-spacing: .12em;
      margin-bottom: 8px;
    }

    /* ── Risk gauge / KPI row ── */
    .kpi-row {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;
      margin-bottom: 12px;
    }
    .kpi-wide {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      margin-bottom: 12px;
    }
    .kpi {
      border: 1px solid #e2e8f0; border-radius: 3px;
      padding: 10px 12px; background: #fafafa;
    }
    .kpi-label {
      font-size: 5.5pt; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .15em;
      font-weight: 700; margin-bottom: 4px;
    }
    .kpi-val {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 20pt; font-weight: 700; line-height: 1;
    }
    .kpi-sub { font-size: 7pt; color: #64748b; margin-top: 4px; font-weight: 500; }

    /* ── Overall risk display ── */
    .risk-panel {
      border: 1px solid #e2e8f0; border-radius: 3px;
      padding: 12px 16px; text-align: center; background: #fafafa;
    }
    .risk-score-label {
      font-size: 5.5pt; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .15em; font-weight: 700;
      margin-bottom: 6px;
    }
    .risk-score-val {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 28pt; font-weight: 700; line-height: 1;
    }

    /* ── Framework breach list ── */
    .framework-row {
      display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px;
    }
    .framework-chip {
      font-size: 6pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; padding: 3px 8px; border-radius: 2px;
      border: 1px solid;
    }

    /* ── Regulatory mapping table ── */
    table.reg { width: 100%; border-collapse: collapse; font-size: 8pt; }
    table.reg th {
      background: #f8fafc; padding: 7px 10px;
      font-size: 6pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: .12em; color: #64748b;
      border-bottom: 2px solid #e2e8f0; text-align: left;
    }
    table.reg td {
      padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
      vertical-align: top; color: #334155;
    }
    table.reg tr:last-child td { border-bottom: none; }

    /* ── Key inventory table ── */
    table.keys { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
    table.keys th {
      background: #f8fafc; padding: 6px 8px;
      font-size: 5.5pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: .12em; color: #64748b;
      border-bottom: 2px solid #e2e8f0; text-align: left; white-space: nowrap;
    }
    table.keys td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    table.keys tr:nth-child(even) td { background: #fafafa; }
    table.keys tfoot td {
      padding: 7px 8px; border-top: 2px solid #e2e8f0;
      font-weight: 700; background: #f8fafc; font-size: 7.5pt;
    }

    /* ── Attestation evidence box ── */
    .evidence-box {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 3px;
      padding: 10px 13px; font-size: 7.5pt; color: #334155;
      line-height: 1.8; margin-top: 8px;
    }
    .evidence-box code {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 7pt; color: #1e3a8a; font-weight: 600;
    }

    /* ── Remediation cards ── */
    .rem-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .rem-card {
      border: 1px solid #e2e8f0; border-top: 3px solid;
      padding: 12px; border-radius: 0 0 3px 3px;
    }
    .rem-title { font-size: 8pt; font-weight: 700; margin-bottom: 5px; }
    .rem-body  { font-size: 7.5pt; color: #475569; margin-bottom: 10px; line-height: 1.6; font-weight: 500; }
    .rem-count { font-family: 'IBM Plex Mono', monospace; font-size: 20pt; font-weight: 700; float: right; line-height: 1; }
    .rem-row   {
      font-size: 7pt; color: #334155; font-weight: 500;
      padding: 3px 0; border-top: 1px solid #f1f5f9;
      display: flex; align-items: flex-start; gap: 5px;
    }

    /* ── Badges ── */
    .badge {
      display: inline-block; font-size: 5.5pt; font-weight: 700;
      padding: 2px 6px; border-radius: 2px; letter-spacing: .07em;
      font-family: 'IBM Plex Sans', sans-serif; text-transform: uppercase;
      border: 1px solid;
    }
    .badge-red    { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
    .badge-orange { color: #7c2d12; background: #fff7ed; border-color: #fed7aa; }
    .badge-yellow { color: #713f12; background: #fefce8; border-color: #fde68a; }
    .badge-green  { color: #14532d; background: #f0fdf4; border-color: #bbf7d0; }
    .badge-blue   { color: #1e3a8a; background: #eff6ff; border-color: #bfdbfe; }

    /* ── Signatures ── */
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 28px; margin-top: 44px; }
    .sig-role {
      font-size: 6pt; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .14em;
      font-weight: 700; margin-bottom: 36px;
    }
    .sig-line { border-bottom: 1px solid #cbd5e1; margin-bottom: 5px; }
    .sig-hint { font-size: 6pt; color: #94a3b8; }

    /* ── Footer ── */
    .doc-footer {
      margin-top: 30px; padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 5.5pt; color: #94a3b8;
      text-align: center; line-height: 2.2; font-weight: 500;
      letter-spacing: .04em;
    }

    /* ── Callout box ── */
    .callout {
      border-left: 3px solid #0ea5e9;
      background: #f0f9ff; padding: 9px 13px;
      font-size: 7.5pt; color: #0c4a6e;
      border-radius: 0 3px 3px 0; margin-bottom: 12px;
      font-weight: 500; line-height: 1.7;
    }
  `.trim();
}
// ── Gauge SVG ─────────────────────────────────────────────────────────────────
function buildGaugeSVG(risk) {
    const levels = {
        CRITICAL: { pct: 0.95, col: "#dc2626" },
        HIGH: { pct: 0.72, col: "#c2410c" },
        MEDIUM: { pct: 0.48, col: "#b45309" },
        LOW: { pct: 0.2, col: "#16a34a" },
    };
    const { pct, col } = levels[risk] ?? { pct: 0.5, col: "#64748b" };
    const clamped = Math.min(0.998, Math.max(0.002, pct));
    const r = 52, cx = 68, cy = 70;
    const tx1 = (cx - r).toFixed(2), ty1 = cy.toFixed(2);
    const tx2 = (cx + r).toFixed(2), ty2 = cy.toFixed(2);
    const endAngle = Math.PI * (1 - clamped);
    const x2 = (cx + r * Math.cos(endAngle)).toFixed(2);
    const y2 = (cy - r * Math.sin(endAngle)).toFixed(2);
    const la = clamped > 0.5 ? 1 : 0;
    return `<svg width="136" height="86" viewBox="0 0 136 86" xmlns="http://www.w3.org/2000/svg">
  <path d="M ${tx1} ${ty1} A ${r} ${r} 0 0 1 ${tx2} ${ty2}" fill="none" stroke="#e2e8f0" stroke-width="10" stroke-linecap="round"/>
  <path d="M ${tx1} ${ty1} A ${r} ${r} 0 ${la} 1 ${x2} ${y2}" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round"/>
  <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="18" font-weight="700" fill="${col}">${risk}</text>
  <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-family="IBM Plex Sans,sans-serif" font-size="6" font-weight="600" fill="#94a3b8" letter-spacing="1.5">OVERALL RISK</text>
</svg>`;
}
// ── Main HTML builder ─────────────────────────────────────────────────────────
export function buildKRAuditHTML(result, opts) {
    const { clientName, clientDomain } = opts;
    const s = result.summary;
    const now = new Date();
    const timestamp = now.toLocaleString("en-IN", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit", timeZoneName: "short",
    });
    const scanDate = now.toISOString().split("T")[0];
    const reportId = `REBEL-KR-${scanDate.replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const displayName = clientName.trim() || (clientDomain ? normaliseDomain(clientDomain) : "All Assets");
    const scopeStr = clientDomain ? normaliseDomain(clientDomain) : "All Assets";
    const riskColor = STATUS_COLOR[s.overall_risk] ?? "#64748b";
    const critCount = s.critical + s.never_rotated;
    // ── Total remediation cost (USD → INR) ──────────────────────────────────────
    const totalCostINR = Math.round(result.records.reduce((acc, r) => acc + (r.remediation_cost ?? 0), 0) * INR_RATE);
    const totalDays = result.records.reduce((acc, r) => acc + (r.remediation_days ?? 0), 0);
    // ── Regulatory mapping rows ────────────────────────────────────────────────
    // Built from frameworks_breached + always showing key ones for EU audits
    const allFrameworks = [
        {
            art: "DORA Art. 9.4",
            title: "Cryptographic Key Lifecycle Management",
            desc: "Entities must maintain documented, system-evidenced cryptographic key rotation procedures. Spreadsheet attestation is insufficient — automated audit trails required.",
            status: critCount > 0 ? "BREACH" : s.overdue > 0 ? "PARTIAL" : "COVERED",
        },
        {
            art: "FFIEC IS",
            title: "Information Security — Key Management",
            desc: "Key rotation periods must be enforced by system controls; manual overrides must be exception-logged. Rotation source must be SYSTEM or HSM.",
            status: result.records.some(r => r.rotation_source === "SPREADSHEET" || r.rotation_source === "NONE") ? "BREACH" : "COVERED",
        },
        {
            art: "MAS TRM § 9.2.4",
            title: "Cryptographic Key Management",
            desc: "All cryptographic keys must be rotated within defined periods. Rotation must be evidenced by system-generated, tamper-evident audit trails with HMAC attestation.",
            status: s.never_rotated > 0 ? "BREACH" : s.overdue > 0 ? "PARTIAL" : "COVERED",
        },
        {
            art: "BaFin BAIT § 7.3",
            title: "Cryptographic Procedures",
            desc: "Cryptographic key management must include defined key lifecycle, documented rotation intervals, and segregated evidence storage. SPREADSHEET sources constitute a material control failure.",
            status: result.records.some(r => r.rotation_source === "SPREADSHEET") ? "BREACH" : "COVERED",
        },
        {
            art: "NIS2 Art. 21",
            title: "Cybersecurity Risk Management",
            desc: "Operators of essential services must implement appropriate cryptographic controls including managed key rotation as part of baseline security measures.",
            status: critCount > 0 ? "PARTIAL" : "COVERED",
        },
        {
            art: "ISO 27001:2022 A.8.24",
            title: "Use of Cryptography",
            desc: "Cryptographic keys must be managed over their full lifecycle. Key rotation schedules must be policy-defined and system-enforced.",
            status: s.never_rotated > 0 ? "BREACH" : s.overdue > 0 ? "PARTIAL" : "COVERED",
        },
        {
            art: "PCI-DSS 4.0 Req. 3.7",
            title: "Cryptographic Key Management",
            desc: "Where cryptographic keys protect cardholder data, rotation must occur at least annually and be evidenced by automated system logs.",
            status: critCount > 0 ? "BREACH" : "COVERED",
        },
    ];
    const regRows = allFrameworks.map(f => {
        const cls = f.status === "COVERED" ? "badge-green"
            : f.status === "PARTIAL" ? "badge-yellow"
                : "badge-red";
        return `<tr>
      <td style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:#1e3a8a;
                 white-space:nowrap;font-size:7pt;">${f.art}</td>
      <td style="font-weight:600;color:#0a0f1e;font-size:8pt;">${f.title}</td>
      <td style="color:#475569;font-size:7.5pt;line-height:1.65;">${f.desc}</td>
      <td><span class="badge ${cls}">${f.status}</span></td>
    </tr>`;
    }).join("");
    // ── Key inventory rows ─────────────────────────────────────────────────────
    const keyRows = result.records
        .sort((a, b) => {
        const order = { CRITICAL: 0, NEVER_ROTATED: 1, OVERDUE: 2, UNKNOWN: 3, COMPLIANT: 4 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9);
    })
        .map((r, i) => {
        const sc = STATUS_COLOR[r.status] ?? "#64748b";
        const days = r.days_since_rotation != null ? `${r.days_since_rotation}d` : "Never";
        const lastRot = fmtDate(r.last_rotated_at);
        const flags = r.regulatory_flags.length
            ? r.regulatory_flags.map(f => `<span class="badge badge-red">${f}</span>`).join(" ")
            : `<span style="color:#16a34a;font-size:7pt;font-weight:600;">✓ None</span>`;
        const costINR = Math.round((r.remediation_cost ?? 0) * INR_RATE);
        const attest = r.attestation_hash.slice(0, 18) + "…";
        const srcCls = (r.rotation_source === "SPREADSHEET" || r.rotation_source === "NONE")
            ? "color:#dc2626;font-weight:700;" : "color:#475569;";
        return `<tr>
        <td class="mono right" style="color:#94a3b8;font-size:6.5pt;">${i + 1}</td>
        <td style="color:#1e3a8a;font-weight:700;font-family:'IBM Plex Mono',monospace;
                   font-size:7.5pt;max-width:130px;overflow:hidden;text-overflow:ellipsis;
                   white-space:nowrap;">${r.key_identifier}</td>
        <td style="color:#475569;font-size:7.5pt;">${r.key_type}</td>
        <td style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:${sc};
                   font-size:7.5pt;">${days}</td>
        <td style="font-size:7pt;color:#475569;">${lastRot}</td>
        <td style="font-size:7pt;${srcCls}">${r.rotation_source}</td>
        <td>${statusBadge(r.status)}</td>
        <td style="font-size:7pt;">${flags}</td>
        <td style="font-family:'IBM Plex Mono',monospace;font-size:6.5pt;color:#94a3b8;
                   max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${attest}</td>
        <td class="mono right" style="color:#0369a1;font-weight:600;font-size:7.5pt;">${r.remediation_days}d</td>
        <td class="mono right" style="color:#92400e;font-weight:700;font-size:7.5pt;">${fmtINR(costINR)}</td>
      </tr>`;
    }).join("");
    // ── Remediation action cards ───────────────────────────────────────────────
    const remCards = [
        {
            color: "#dc2626",
            title: "Rotate Never-Rotated Keys",
            body: "Keys with no recorded rotation event must be treated as compromised. Initiate emergency rotation and generate system audit trail immediately.",
            items: result.records.filter(r => r.status === "NEVER_ROTATED").map(r => r.key_identifier),
        },
        {
            color: "#c2410c",
            title: "Address Critical Overdue Keys",
            body: "Keys exceeding maximum rotation age or bearing SPREADSHEET source attribution. Rotate and reclassify source to SYSTEM or HSM.",
            items: result.records.filter(r => r.status === "CRITICAL").map(r => r.key_identifier),
        },
        {
            color: "#1e3a8a",
            title: "Remediate Overdue & Unknown Keys",
            body: "Schedule rotation within next sprint cycle. Ensure system-generated evidence is produced and stored in tamper-evident log.",
            items: result.records.filter(r => r.status === "OVERDUE" || r.status === "UNKNOWN").map(r => r.key_identifier),
        },
    ].map(card => {
        const rows = card.items.length > 0
            ? card.items.slice(0, 6).map(id => `<div class="rem-row"><span style="color:${card.color};flex-shrink:0;font-size:8pt;">▸</span>
           <span class="mono" style="font-size:7pt;">${id}</span></div>`).join("") +
                (card.items.length > 6
                    ? `<div class="rem-row" style="color:#94a3b8;font-style:italic;">+${card.items.length - 6} additional</div>`
                    : "")
            : `<div class="rem-row" style="color:#16a34a;font-weight:700;">✓ No affected keys</div>`;
        return `<div class="rem-card" style="border-top-color:${card.color};">
      <span class="rem-count" style="color:${card.color};">${card.items.length}</span>
      <div class="rem-title" style="color:${card.color};">${card.title}</div>
      <div class="rem-body">${card.body}</div>
      ${rows}
    </div>`;
    }).join("");
    // ── Framework breach chips ─────────────────────────────────────────────────
    const breachChips = s.frameworks_breached.length > 0
        ? s.frameworks_breached.map(f => `
        <span class="framework-chip" style="color:#dc2626;background:#fef2f2;border-color:#fecaca;">
          ${f}
        </span>`).join("")
        : `<span class="framework-chip" style="color:#16a34a;background:#f0fdf4;border-color:#bbf7d0;">
        ✓ No Framework Breaches
      </span>`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>REBEL Key Rotation Audit — ${displayName} — ${scanDate}</title>
  <style>${buildCSS()}</style>
</head>
<body>

<button class="print-btn" onclick="window.print()">⬇ &nbsp; Save as PDF</button>

<div class="doc">

  <!-- ── COVER ─────────────────────────────────────────────────────────────── -->
  <div class="cover-stripe"></div>

  <div class="cover-flex">
    <div>
      <!-- Brand mark -->
      <div style="display:flex;align-items:center;gap:13px;margin-bottom:12px;">
        <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="26" height="26" rx="2" fill="none" stroke="#1e3a8a" stroke-width="1.8"/>
          <rect x="7" y="7" width="16" height="16" rx="1" fill="#dbeafe" stroke="#3b82f6" stroke-width="1"/>
          <!-- Key icon -->
          <circle cx="13" cy="13" r="3" fill="none" stroke="#1e3a8a" stroke-width="1.5"/>
          <line x1="16" y1="16" x2="22" y2="22" stroke="#1e3a8a" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="19" y1="19" x2="21" y2="17" stroke="#1e3a8a" stroke-width="1" stroke-linecap="round"/>
        </svg>
        <div>
          <div class="brand">REBEL</div>
          <div class="brand-sub">Threat Intelligence Platform</div>
        </div>
      </div>
      <div class="report-class">Compliance Audit Report</div>
      <div class="report-title">Key Rotation Verification<br/>& Proof-of-Rotation Audit</div>
      <div class="report-subtitle">
        DORA Art. 9.4 (KLM) &nbsp;·&nbsp; FFIEC Information Security
        &nbsp;·&nbsp; MAS TRM § 9.2.4<br/>
        BaFin BAIT § 7.3 &nbsp;·&nbsp; NIS2 Art. 21
        &nbsp;·&nbsp; ISO 27001:2022 A.8.24 &nbsp;·&nbsp; PCI-DSS 4.0 Req. 3.7
      </div>
    </div>
    <div class="cover-right">
      <div class="client-label">Prepared for</div>
      <div class="client-name">${displayName}</div>
      ${clientDomain ? `<div class="client-domain">${normaliseDomain(clientDomain)}</div>` : ""}
    </div>
  </div>

  <!-- Meta strip -->
  <div class="meta-strip avoid-break">
    <div class="meta-item">
      <div class="meta-label">Generated</div>
      <div class="meta-val">${timestamp}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Report ID</div>
      <div class="meta-val">${reportId}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Scan ID</div>
      <div class="meta-val">${result.scan_id}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Scope</div>
      <div class="meta-val">${scopeStr}</div>
    </div>
    <div class="meta-item" style="border-right:none;">
      <div class="meta-label">Keys in Scope</div>
      <div class="meta-val">${s.total_keys}</div>
    </div>
  </div>

  <!-- Classification notices -->
  <div class="classification">
    <span style="font-weight:700;letter-spacing:.06em;">AUDIT CLASSIFICATION: RESTRICTED</span>
    &nbsp;— Contains system-generated cryptographic attestation data.
    Retention in accordance with DORA Art. 9.4 audit log requirements (5-year minimum).
    Chain of custody must be maintained.
  </div>
  <div class="conf">
    <span style="font-weight:700;letter-spacing:.06em;">CONFIDENTIAL</span>
    &nbsp;— This document contains sensitive key lifecycle and regulatory compliance data.
    Intended solely for the named organisation and their designated auditors.
    Distribution restricted to need-to-know basis.
  </div>

  <hr class="section-rule"/>

  <!-- ── 1. EXECUTIVE SUMMARY ──────────────────────────────────────────────── -->
  <div class="section avoid-break">
    <h2>1. Executive Summary</h2>
    <div style="display:grid;grid-template-columns:200px 1fr;gap:14px;align-items:start;">

      <!-- Gauge -->
      <div class="risk-panel">
        ${buildGaugeSVG(s.overall_risk)}
        <div style="margin-top:8px;font-size:7pt;color:#64748b;font-weight:500;line-height:1.7;">
          <strong>${s.total_keys}</strong> keys assessed<br/>
          Scan completed: <strong>${fmtDate(result.scanned_at)}</strong>
        </div>
      </div>

      <!-- KPIs -->
      <div>
        <div class="kpi-row">
          <div class="kpi">
            <div class="kpi-label">Total Keys</div>
            <div class="kpi-val" style="color:#1e3a8a;">${s.total_keys}</div>
            <div class="kpi-sub">In scope</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Compliant</div>
            <div class="kpi-val" style="color:#16a34a;">${s.compliant}</div>
            <div class="kpi-sub">Within policy</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Overdue</div>
            <div class="kpi-val" style="color:#c2410c;">${s.overdue}</div>
            <div class="kpi-sub">Exceed rotation age</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Critical / Never</div>
            <div class="kpi-val" style="color:#dc2626;">${critCount}</div>
            <div class="kpi-sub">Immediate action</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Unknown</div>
            <div class="kpi-val" style="color:#64748b;">${s.unknown}</div>
            <div class="kpi-sub">No evidence</div>
          </div>
        </div>

        <div class="kpi-wide">
          <div class="kpi" style="background:#fef2f2;border-color:#fecaca;">
            <div class="kpi-label">Total Remediation Cost</div>
            <div class="kpi-val" style="font-size:17pt;color:#c2410c;">${fmtINR(totalCostINR)}</div>
            <div class="kpi-sub">${totalDays} developer-days · ${result.records.length} keys</div>
          </div>
          <div class="kpi" style="background:#fef2f2;border-color:#fecaca;">
            <div class="kpi-label">Frameworks Breached</div>
            <div class="kpi-val" style="font-size:17pt;color:#dc2626;">${s.frameworks_breached.length}</div>
            <div class="kpi-sub">${s.frameworks_breached.slice(0, 3).join(" · ") || "None"}</div>
          </div>
        </div>

        <!-- Framework breach chips -->
        <div style="margin-top:4px;">
          <div style="font-size:5.5pt;color:#94a3b8;text-transform:uppercase;letter-spacing:.15em;
                      font-weight:700;margin-bottom:6px;">Regulatory breach status</div>
          <div class="framework-row">${breachChips}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── 2. ATTESTATION METHODOLOGY ────────────────────────────────────────── -->
  <div class="section avoid-break">
    <h2>2. Attestation Methodology & Evidence Standard</h2>
    <div class="callout">
      All key rotation records in this audit are attested by
      <strong>HMAC-SHA256</strong> over the concatenation of
      <code>key_identifier + rotation_timestamp + scan_secret</code>.
      Attestation hashes are computed per-scan using an ephemeral secret and stored
      immutably in the audit log. Regulators require system-generated evidence
      (FFIEC, MAS TRM 9.2.4, BaFin BAIT § 7.3) — spreadsheet-sourced records
      are flagged as non-compliant regardless of stated rotation date.
    </div>
    <div class="evidence-box">
      <strong>Evidence Hierarchy (highest → lowest assurance)</strong><br/>
      <code>HSM</code> — Hardware Security Module event log (highest) &nbsp;·&nbsp;
      <code>SYSTEM</code> — Automated platform audit trail &nbsp;·&nbsp;
      <code>CERT_META</code> — Certificate metadata inference &nbsp;·&nbsp;
      <code>MANUAL</code> — Human-attested record (requires additional corroboration) &nbsp;·&nbsp;
      <code>SPREADSHEET</code> — Non-compliant (flagged) &nbsp;·&nbsp;
      <code>NONE</code> — No evidence (treated as Never Rotated)
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ── 3. REGULATORY MAPPING ──────────────────────────────────────────────── -->
  <div class="section">
    <h2>3. Regulatory & Standards Compliance Mapping</h2>
    <table class="reg">
      <thead>
        <tr>
          <th style="width:85px;">Framework</th>
          <th style="width:145px;">Requirement</th>
          <th>Audit Rationale</th>
          <th style="width:72px;">Status</th>
        </tr>
      </thead>
      <tbody>${regRows}</tbody>
    </table>
  </div>

  <!-- ── 4. KEY ROTATION INVENTORY ─────────────────────────────────────────── -->
  <div class="section">
    <h2>4. Cryptographic Key Rotation Inventory — Ranked by Risk</h2>
    <table class="keys">
      <thead>
        <tr>
          <th style="width:14px;">#</th>
          <th>Key Identifier</th>
          <th>Type</th>
          <th>Days Since</th>
          <th>Last Rotated</th>
          <th>Source</th>
          <th>Status</th>
          <th>Reg. Flags</th>
          <th>Attestation</th>
          <th class="right">Days</th>
          <th class="right">Cost</th>
        </tr>
      </thead>
      <tbody>${keyRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="9" style="color:#334155;">Totals</td>
          <td class="mono right" style="color:#0369a1;">${totalDays}d</td>
          <td class="mono right" style="color:#92400e;">${fmtINR(totalCostINR)}</td>
        </tr>
      </tfoot>
    </table>
    <p style="font-size:7pt;color:#94a3b8;margin-top:7px;line-height:1.8;">
      <strong>Rotation Source flags:</strong>
      SPREADSHEET and NONE sources are automatically flagged as non-compliant
      under FFIEC and MAS TRM 9.2.4 regardless of stated last-rotation date.
      Attestation hashes truncated for display — full hashes in audit log (Scan ID: ${result.scan_id}).
    </p>
  </div>

  <div class="page-break"></div>

  <!-- ── 5. REMEDIATION ACTIONS ────────────────────────────────────────────── -->
  <div class="section avoid-break">
    <h2>5. Remediation Actions — Priority Order</h2>
    <div class="rem-grid">${remCards}</div>
    <div style="margin-top:14px;padding:9px 13px;background:#f8fafc;border:1px solid #e2e8f0;
                border-radius:3px;font-size:7.5pt;color:#334155;line-height:1.8;">
      <strong>Post-Rotation Evidence Requirement:</strong>
      Upon completion of each rotation event, the responsible team must generate a
      system audit log entry containing: key identifier, rotation timestamp (UTC),
      new key fingerprint or HMAC attestation, rotation source classification,
      and approving operator ID. Entries must be stored in a tamper-evident log
      for a minimum of 5 years (DORA Art. 9.4 / MAS TRM 9.2.4).
    </div>
  </div>

  <!-- ── 6. AUDIT OPINION ───────────────────────────────────────────────────── -->
  <div class="section avoid-break">
    <h2>6. Auditor Opinion & Conclusion</h2>
    <div style="font-size:8.5pt;color:#334155;line-height:1.9;">
      ${critCount > 0
        ? `Based on the automated scan conducted on ${fmtDate(result.scanned_at)},
           the organisation has <strong style="color:#dc2626;">${critCount} cryptographic keys</strong>
           in a Critical or Never-Rotated state, constituting a material breach of
           ${s.frameworks_breached.slice(0, 3).join(", ")} obligations.
           Immediate remediation is required prior to the next regulatory review cycle.
           SPREADSHEET-sourced attestation records must be replaced with system-generated
           evidence as a matter of priority.`
        : s.overdue > 0
            ? `The scan identified <strong style="color:#c2410c;">${s.overdue} overdue keys</strong>
           requiring rotation within the current sprint cycle. No critical failures were detected.
           Remediation of overdue items is required to maintain full compliance posture.`
            : `All cryptographic keys in scope are within defined rotation periods and carry
           system-generated attestation evidence. The organisation demonstrates a
           <strong style="color:#16a34a;">COMPLIANT</strong> key lifecycle management posture
           as of the scan date. Continued monitoring is recommended.`}
    </div>
  </div>

  <!-- ── SIGNATURES ─────────────────────────────────────────────────────────── -->
  <div class="sig-grid avoid-break">
    ${["Lead Auditor", "Compliance Officer", "Authorised Signatory"].map(role => `
    <div>
      <div class="sig-role">${role}</div>
      <div class="sig-line"></div>
      <div class="sig-hint">Signature, Name &amp; Date</div>
    </div>`).join("")}
  </div>

  <!-- ── FOOTER ─────────────────────────────────────────────────────────────── -->
  <div class="doc-footer">
    REBEL Threat Intelligence Platform &nbsp;·&nbsp; Key Rotation Proof-of-Rotation Audit
    &nbsp;·&nbsp; Report ID: ${reportId} &nbsp;·&nbsp; Scan ID: ${result.scan_id}
    <br/>
    ${displayName}${clientDomain ? ` &nbsp;·&nbsp; Scope: ${scopeStr}` : ""}
    &nbsp;·&nbsp; Generated: ${timestamp}
    <br/>
    RESTRICTED &amp; CONFIDENTIAL — Intended solely for the named organisation and designated auditors.
    Retain for minimum 5 years per DORA Art. 9.4.
  </div>

</div>
</body>
</html>`;
}
// ── Entry point ───────────────────────────────────────────────────────────────
export function exportKRPDF(result, opts) {
    const html = buildKRAuditHTML(result, opts);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win)
        win.focus();
    setTimeout(() => URL.revokeObjectURL(url), 15_000);
}
