import React, { useState, useEffect, useRef } from "react";
import {
  T, S, Panel, PanelHeader, MetricCard, Badge,
  Table, TR, TD, MOCK_CBOM, MOCK_ASSETS,
} from "./shared.js";

const API = "https://r3bel-production.up.railway.app";

const EFFORT: Record<string, number> = {
  "Web App": 2, "Web Apps": 2,
  "API": 3,     "APIs": 3,
  "Server": 5,  "Servers": 5,
  "LB": 1,
  "Other": 3,
};
const DEV_RATE = 800;

// ─── Domain filter helper ─────────────────────────────────────────────────────
// Normalise input: strip protocol, www., trailing slashes, lowercase
function normaliseDomain(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/^https?:\/\//,"")
    .replace(/^www\./,"")
    .replace(/\/.*$/,"");
}

// An app entry belongs to a client domain if:
//   1. app hostname ends with ".clientdomain" (subdomain match), OR
//   2. app hostname === clientdomain (exact match)
function appMatchesDomain(appName: string, clientDomain: string): boolean {
  if (!clientDomain) return true; // no filter → show all
  const app    = normaliseDomain(appName);
  const domain = normaliseDomain(clientDomain);
  return app === domain || app.endsWith("." + domain);
}

// ─── Asset matcher (collision-safe) ──────────────────────────────────────────
const GENERIC_NAMES = new Set(["api","web","app","server","lb","www","cdn","mail","vpn"]);

function matchAsset(appName: string, assets: any[]): any | undefined {
  const root = appName?.split(".")[0]?.toLowerCase().replace(/[^a-z0-9]/g,"") ?? "";
  if (!root || root.length < 3 || GENERIC_NAMES.has(root)) return undefined;

  // 1. Exact
  const exact = assets.find(a =>
    a.name?.toLowerCase().replace(/[^a-z0-9]/g,"") === root
  );
  if (exact) return exact;

  // 2. Root starts with asset name
  const sw = assets.find(a => {
    const n = a.name?.toLowerCase().replace(/[^a-z0-9]/g,"") ?? "";
    return n.length >= 3 && root.startsWith(n);
  });
  if (sw) return sw;

  // 3. Contains — only when unambiguous
  const contains = assets.filter(a => {
    const n = a.name?.toLowerCase().replace(/[^a-z0-9]/g,"") ?? "";
    return n.length >= 3 && root.includes(n);
  });
  return contains.length === 1 ? contains[0] : undefined;
}

// ─── Risk helpers ─────────────────────────────────────────────────────────────
function riskWeight(app: any, asset: any): number {
  const isPublic = asset?.type === "Web Apps" || asset?.type === "Web App";
  const weakKey  = app?.keylen?.startsWith("1024");
  const weakStat = app?.status === "weak" || app?.status === "WEAK";
  let w = 1;
  if (weakKey)  w += 2;
  if (weakStat) w += 1;
  if (isPublic) w *= 1.5;
  if (!app?.pqc) w += 0.5;
  return Math.round(w * 10) / 10;
}

function riskLabel(w: number): "Critical" | "High" | "Medium" | "Low" {
  if (w >= 4.5) return "Critical";
  if (w >= 3)   return "High";
  if (w >= 2)   return "Medium";
  return "Low";
}

function riskVariant(r: string): any {
  return r === "Critical" ? "red" : r === "High" ? "orange"
       : r === "Medium"   ? "yellow" : "green";
}

// ─── Breakpoints ──────────────────────────────────────────────────────────────
function useBreakpoint() {
  const get = () => {
    const w = window.innerWidth;
    if (w < 480) return "mobile"  as const;
    if (w < 900) return "tablet"  as const;
    return            "desktop" as const;
  };
  const [bp, setBp] = useState(get);
  useEffect(() => {
    const h = () => setBp(get());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return bp;
}

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────
function exportAuditPDF(
  enriched: any[], weightedScore: number, pqcReady: number,
  total: number, totalDays: number, calDays: number, totalCost: number,
  teamSize: number, devRate: number, dateStr: string,
  clientName: string, clientDomain: string
) {
  const now         = new Date();
  const timestamp   = now.toLocaleString("en-US", { year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit", timeZoneName:"short" });
  const scanDate    = now.toISOString().split("T")[0];
  const reportId    = `REBEL-${scanDate.replace(/-/g,"")}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  const critCount   = enriched.filter(a => a.risk === "Critical").length;
  const highCount   = enriched.filter(a => a.risk === "High").length;
  const medCount    = enriched.filter(a => a.risk === "Medium").length;
  const lowCount    = enriched.filter(a => a.risk === "Low").length;
  const scoreColor  = weightedScore >= 70 ? "#16a34a" : weightedScore >= 40 ? "#d97706" : "#dc2626";
  const scoreLabel  = weightedScore >= 70 ? "COMPLIANT" : weightedScore >= 40 ? "AT RISK" : "CRITICAL";
  const displayName = clientName.trim() || (clientDomain ? normaliseDomain(clientDomain) : "All Assets");

  // Gauge arc SVG
  const pct = weightedScore / 100;
  const gr = 54, gcx = 70, gcy = 76;
  const gx1 = gcx + gr * Math.cos(Math.PI), gy1 = gcy + gr * Math.sin(Math.PI);
  const gx2 = gcx + gr * Math.cos(Math.PI + Math.PI * pct);
  const gy2 = gcy + gr * Math.sin(Math.PI + Math.PI * pct);
  const glf = pct > 0.5 ? 1 : 0;
  const gaugeSVG = `<svg width="140" height="84" viewBox="0 0 140 84" xmlns="http://www.w3.org/2000/svg">
    <path d="M ${gcx-gr} ${gcy} A ${gr} ${gr} 0 0 1 ${gcx+gr} ${gcy}" fill="none" stroke="#e5e7eb" stroke-width="10" stroke-linecap="round"/>
    <path d="M ${gx1.toFixed(2)} ${gy1.toFixed(2)} A ${gr} ${gr} 0 ${glf} 1 ${gx2.toFixed(2)} ${gy2.toFixed(2)}" fill="none" stroke="${scoreColor}" stroke-width="10" stroke-linecap="round"/>
    <text x="${gcx}" y="${gcy-5}" text-anchor="middle" font-family="Arial" font-size="22" font-weight="bold" fill="${scoreColor}">${weightedScore}</text>
    <text x="${gcx}" y="${gcy+13}" text-anchor="middle" font-family="Arial" font-size="7" fill="#6b7280" letter-spacing="1">${scoreLabel}</text>
  </svg>`;

  // Risk bars
  const riskBars = [
    { label:"Critical", count:critCount, color:"#dc2626" },
    { label:"High",     count:highCount, color:"#ea580c" },
    { label:"Medium",   count:medCount,  color:"#d97706" },
    { label:"Low",      count:lowCount,  color:"#16a34a" },
  ].map(r => {
    const p = enriched.length ? Math.round(r.count / enriched.length * 100) : 0;
    return `<div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <span style="font-size:10px;color:#374151;font-weight:500;">${r.label}</span>
        <span style="font-size:10px;color:${r.color};font-weight:600;">${r.count}</span>
      </div>
      <div style="height:5px;background:#f3f4f6;border-radius:3px;">
        <div style="height:100%;width:${p}%;background:${r.color};border-radius:3px;"></div>
      </div>
    </div>`;
  }).join("");

  // Asset table rows
  const assetRows = enriched.map((a, i) => {
    const rc  = a.risk==="Critical"?"#dc2626":a.risk==="High"?"#ea580c":a.risk==="Medium"?"#d97706":"#16a34a";
    const kc  = a.keylen?.startsWith("1024")?"#dc2626":a.keylen?.startsWith("2048")?"#d97706":"#16a34a";
    const tc  = a.tls==="1.0"?"#dc2626":a.tls==="1.2"?"#d97706":"#16a34a";
    const bg  = i % 2 === 0 ? "#ffffff" : "#f9fafb";
    return `<tr style="background:${bg};">
      <td style="padding:6px 8px;font-size:9px;color:#9ca3af;text-align:center;">${i+1}</td>
      <td style="padding:6px 8px;font-size:10px;color:#1e40af;font-weight:500;">${a.app}</td>
      <td style="padding:6px 8px;font-size:9px;color:#374151;">${a.assetType}</td>
      <td style="padding:6px 8px;text-align:center;">
        <span style="font-size:9px;font-weight:600;color:${rc};background:${rc}18;padding:2px 7px;border-radius:3px;">${a.risk}</span>
      </td>
      <td style="padding:6px 8px;font-size:9px;color:${kc};font-weight:500;text-align:center;">${a.keylen ?? "—"}</td>
      <td style="padding:6px 8px;font-size:8px;color:#6b7280;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.cipher ?? "—"}</td>
      <td style="padding:6px 8px;text-align:center;font-size:9px;color:${tc};font-weight:500;">TLS ${a.tls ?? "—"}</td>
      <td style="padding:6px 8px;font-size:9px;color:#6b7280;">${a.ca ?? "—"}</td>
      <td style="padding:6px 8px;font-size:9px;color:#0891b2;text-align:center;">${a.days}d</td>
      <td style="padding:6px 8px;font-size:9px;color:#ea580c;text-align:right;font-weight:500;">$${a.cost.toLocaleString()}</td>
      <td style="padding:6px 8px;text-align:center;font-size:11px;">${a.isPublic ? '<span style="color:#0891b2;">●</span>' : '<span style="color:#d1d5db;">○</span>'}</td>
      <td style="padding:6px 8px;text-align:center;font-size:12px;">${a.pqc ? '<span style="color:#16a34a;">✓</span>' : '<span style="color:#dc2626;">✗</span>'}</td>
    </tr>`;
  }).join("");

  // DORA rows
  const doraRows = [
    { art:"Art. 9.2",  title:"ICT Asset Register",       desc:"Maintain an up-to-date register of all ICT assets including cryptographic configurations.", status: total > 0 ? "COVERED" : "PENDING" },
    { art:"Art. 9.4",  title:"Cryptographic Controls",    desc:"Implement and document cryptographic controls protecting data in transit and at rest.",     status: enriched.filter(a => a.status !== "weak" && a.status !== "WEAK").length > 0 ? "PARTIAL" : "PENDING" },
    { art:"Art. 10.1", title:"Vulnerability Management",  desc:"Identify, classify and address ICT vulnerabilities in a timely manner.",                   status: enriched.length > 0 ? "IDENTIFIED" : "CLEAR" },
    { art:"Art. 11.1", title:"ICT Business Continuity",   desc:"Maintain and test ICT business continuity plans covering cryptographic dependencies.",      status: "ROADMAP PROVIDED" },
  ].map(d => {
    const sc = ["COVERED","CLEAR","ROADMAP PROVIDED"].includes(d.status) ? "#16a34a"
             : ["PARTIAL","IDENTIFIED"].includes(d.status) ? "#d97706" : "#dc2626";
    return `<tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 10px;font-size:9px;color:#1e40af;font-weight:600;white-space:nowrap;">${d.art}</td>
      <td style="padding:8px 10px;font-size:10px;color:#111827;font-weight:500;">${d.title}</td>
      <td style="padding:8px 10px;font-size:9px;color:#6b7280;line-height:1.5;">${d.desc}</td>
      <td style="padding:8px 10px;text-align:center;">
        <span style="font-size:8px;font-weight:600;color:${sc};background:${sc}18;padding:2px 8px;border-radius:3px;white-space:nowrap;">${d.status}</span>
      </td>
    </tr>`;
  }).join("");

  // Remediation cards
  const remCards = [
    { title:"Upgrade Key Length",   color:"#dc2626", bg:"#fef2f2", border:"#fecaca",
      count: enriched.filter(a => a.keylen?.startsWith("1024")).length,
      action:"Rotate all certificates to RSA-4096 or ECDSA P-256.",
      detail:"Affects assets with 1024-bit keys — highest quantum vulnerability.",
      items: enriched.filter(a => a.keylen?.startsWith("1024")).map(a => a.app) },
    { title:"Replace Weak Ciphers", color:"#ea580c", bg:"#fff7ed", border:"#fed7aa",
      count: enriched.filter(a => a.status==="weak"||a.status==="WEAK").length,
      action:"Migrate to TLS_AES_256_GCM_SHA384.",
      detail:"Disable all CBC-mode, DES, RC4, and export-grade cipher suites.",
      items: enriched.filter(a => a.status==="weak"||a.status==="WEAK").map(a => a.app) },
    { title:"Enable PQC Algorithms",color:"#0891b2", bg:"#f0f9ff", border:"#bae6fd",
      count: enriched.filter(a => !a.pqc).length,
      action:"Implement CRYSTALS-Kyber (FIPS 203) for key encapsulation.",
      detail:"CRYSTALS-Dilithium (FIPS 204) for digital signatures.",
      items: enriched.filter(a => !a.pqc).map(a => a.app) },
  ].map(s => `
    <div style="border:1px solid ${s.border};border-radius:6px;padding:14px;background:${s.bg};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:10px;font-weight:700;color:${s.color};">${s.title}</span>
        <span style="font-size:18px;font-weight:700;color:${s.color};">${s.count}</span>
      </div>
      <div style="font-size:9px;color:#374151;font-weight:500;margin-bottom:3px;">${s.action}</div>
      <div style="font-size:8px;color:#6b7280;margin-bottom:10px;line-height:1.5;">${s.detail}</div>
      ${s.items.slice(0,4).map(app => `<div style="font-size:8px;color:#374151;padding:3px 0;border-top:1px solid ${s.border};">▸ ${app}</div>`).join("")}
      ${s.items.length > 4 ? `<div style="font-size:8px;color:#9ca3af;padding:3px 0;border-top:1px solid ${s.border};">+${s.items.length-4} more assets</div>` : ""}
      ${s.items.length === 0 ? `<div style="font-size:8px;color:#16a34a;font-weight:500;">✓ All clear</div>` : ""}
    </div>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>REBEL — PQC Audit Report — ${displayName} — ${scanDate}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff;font-size:11px;}
    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .no-print{display:none!important;}
      .page-break{page-break-before:always;}
    }
    .page{max-width:960px;margin:0 auto;padding:32px 40px;}
    h2{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#374151;margin-bottom:12px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#f3f4f6;padding:7px 8px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;text-align:left;border-bottom:1px solid #e5e7eb;}
    hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0;}
    .section{margin-bottom:28px;}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
    .card{border:1px solid #e5e7eb;border-radius:6px;padding:14px 16px;}
    .lbl{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px;}
    .val{font-size:20px;font-weight:700;line-height:1;}
    .sub{font-size:9px;color:#6b7280;margin-top:4px;}
    .print-btn{position:fixed;top:20px;right:20px;background:#1e40af;color:#fff;border:none;
      padding:10px 22px;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;z-index:99;
      box-shadow:0 2px 8px rgba(30,64,175,.35);}
    .print-btn:hover{background:#1d4ed8;}
    .footer{font-size:8px;color:#d1d5db;text-align:center;margin-top:28px;padding-top:14px;border-top:1px solid #f3f4f6;line-height:1.7;}
    .confidential{background:#fef9c3;border:1px solid #fde047;border-radius:4px;padding:6px 12px;font-size:8px;color:#854d0e;margin-bottom:20px;}
  </style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">⬇ Save as PDF</button>

<div class="page">

  <!-- ══ COVER HEADER ══════════════════════════════════════════════════════ -->
  <!-- Top bar: REBEL left, client right -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;
    padding-bottom:20px;border-bottom:2px solid #1e40af;margin-bottom:22px;">

    <!-- REBEL branding (left) -->
    <div style="display:flex;align-items:center;gap:10px;">
      <svg width="32" height="32" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#1e40af" stroke-width="1.8"/>
        <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill="#dbeafe" stroke="#3b82f6" stroke-width="1"/>
        <circle cx="14" cy="14" r="3" fill="#1e40af"/>
      </svg>
      <div>
        <div style="font-size:18px;font-weight:900;letter-spacing:.2em;color:#111827;">REBEL</div>
        <div style="font-size:7px;color:#9ca3af;letter-spacing:.14em;margin-top:1px;">THREAT INTELLIGENCE PLATFORM</div>
      </div>
    </div>

    <!-- Client branding (right) -->
    <div style="text-align:right;">
      <div style="font-size:8px;color:#9ca3af;text-transform:uppercase;
        letter-spacing:.1em;margin-bottom:4px;">Prepared for</div>
      <div style="font-size:20px;font-weight:800;color:#111827;letter-spacing:.04em;">
        ${displayName}</div>
      ${clientDomain ? `<div style="font-size:9px;color:#6b7280;margin-top:3px;">${normaliseDomain(clientDomain)}</div>` : ""}
    </div>
  </div>

  <!-- Report title block -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;">
    <div>
      <div style="font-size:22px;font-weight:700;color:#111827;line-height:1.25;">
        Post-Quantum Cryptography<br/>Audit Report
      </div>
      <div style="font-size:10px;color:#6b7280;margin-top:7px;line-height:1.8;">
        DORA Art. 9 &nbsp;·&nbsp; NIST FIPS 203 / 204 / 205 &nbsp;·&nbsp; PCI-DSS 4.0 &nbsp;·&nbsp; SWIFT CSP
      </div>
    </div>
    <div style="text-align:right;min-width:200px;">
      <div style="font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;">Generated</div>
      <div style="font-size:10px;color:#374151;font-weight:500;margin-top:2px;">${timestamp}</div>
      <div style="font-size:8px;color:#9ca3af;margin-top:8px;text-transform:uppercase;letter-spacing:.08em;">Report ID</div>
      <div style="font-size:9px;color:#374151;font-family:monospace;margin-top:2px;">${reportId}</div>
      ${clientDomain ? `
      <div style="font-size:8px;color:#9ca3af;margin-top:8px;text-transform:uppercase;letter-spacing:.08em;">Scope</div>
      <div style="font-size:9px;color:#1e40af;font-weight:500;margin-top:2px;">*.${normaliseDomain(clientDomain)}</div>` : ""}
      <div style="margin-top:10px;background:#f0fdf4;border:1px solid #bbf7d0;
        border-radius:4px;padding:4px 10px;display:inline-block;">
        <span style="font-size:8px;color:#15803d;font-weight:700;">● LIVE SCAN DATA</span>
      </div>
    </div>
  </div>

  <div class="confidential">
    ⚠ CONFIDENTIAL — This document contains sensitive cryptographic posture information.
    Handle in accordance with your organisation's data classification policy. Not for external distribution.
  </div>

  <hr/>

  <!-- ══ EXECUTIVE SUMMARY ═════════════════════════════════════════════════ -->
  <div class="section">
    <h2>Executive Summary</h2>
    <div class="grid2" style="align-items:start;">
      <div class="card" style="display:flex;flex-direction:column;align-items:center;padding:22px;">
        ${gaugeSVG}
        <div style="margin-top:10px;text-align:center;">
          <div style="font-size:11px;color:#374151;font-weight:600;">
            ${pqcReady} of ${total} applications PQC-ready
          </div>
          <div style="font-size:9px;color:#9ca3af;margin-top:3px;">
            Weighted for public exposure &amp; key strength
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div class="grid2">
          <div class="card">
            <div class="lbl">Need Migration</div>
            <div class="val" style="color:#dc2626;">${enriched.length}</div>
            <div class="sub">Weak assets identified</div>
          </div>
          <div class="card">
            <div class="lbl">Critical Risk</div>
            <div class="val" style="color:#dc2626;">${critCount}</div>
            <div class="sub">Immediate action required</div>
          </div>
        </div>
        <div class="grid2">
          <div class="card">
            <div class="lbl">Est. Timeline</div>
            <div class="val" style="color:#0891b2;">${calDays}d</div>
            <div class="sub">${teamSize} dev team · ${totalDays} dev days</div>
          </div>
          <div class="card">
            <div class="lbl">Est. Cost</div>
            <div class="val" style="color:#ea580c;">$${(totalCost/1000).toFixed(1)}k</div>
            <div class="sub">At $${devRate}/dev/day</div>
          </div>
        </div>
        <div class="card" style="background:#f8fafc;">
          <div class="lbl">Projected Completion</div>
          <div style="font-size:16px;font-weight:700;color:#0891b2;margin-top:4px;">${dateStr}</div>
          <div class="sub">Based on current team size &amp; effort estimates</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ RISK DISTRIBUTION ══════════════════════════════════════════════════ -->
  <div class="section">
    <h2>Risk Distribution</h2>
    <div class="grid2">
      <div class="card">${riskBars}</div>
      <div class="card">
        <div style="font-size:10px;color:#374151;font-weight:600;margin-bottom:10px;">
          Risk Weight Methodology
        </div>
        ${[
          ["Public-facing + WEAK cipher","3× weight","#dc2626"],
          ["Internal + WEAK cipher","2× weight","#ea580c"],
          ["Key length &lt; 2048-bit","Auto: Critical","#dc2626"],
          ["No PQC algorithm","+0.5 penalty","#d97706"],
          ["TLS &lt; 1.3","Medium flag","#d97706"],
          ["PQC-ready asset","0 penalty","#16a34a"],
        ].map(([l,v,c]) => `
          <div style="display:flex;justify-content:space-between;
            padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:9px;">
            <span style="color:#374151;">${l}</span>
            <span style="color:${c};font-weight:600;">${v}</span>
          </div>`).join("")}
      </div>
    </div>
  </div>

  <hr class="page-break"/>

  <!-- ══ DORA REGULATORY MAPPING ══════════════════════════════════════════ -->
  <div class="section">
    <h2>DORA Regulatory Mapping</h2>
    <div style="font-size:9px;color:#6b7280;margin-bottom:12px;">
      Digital Operational Resilience Act (EU) 2022/2554 — ICT Risk Management Requirements
    </div>
    <table>
      <thead><tr><th>Article</th><th>Requirement</th><th>Description</th><th>Status</th></tr></thead>
      <tbody>${doraRows}</tbody>
    </table>
    <div style="margin-top:8px;font-size:8px;color:#9ca3af;line-height:1.6;">
      This mapping is indicative. Final compliance determination requires review by a qualified legal
      or compliance professional. REBEL provides the technical evidence base to support auditor-led assessments.
    </div>
  </div>

  <hr/>

  <!-- ══ MIGRATION ROADMAP ════════════════════════════════════════════════ -->
  <div class="section">
    <h2>Migration Roadmap — Ranked by Risk Priority</h2>
    <table>
      <thead>
        <tr>
          <th style="width:26px;">#</th>
          <th>Application</th><th>Type</th><th>Risk</th>
          <th>Key Len</th><th>Cipher Suite</th><th>TLS</th>
          <th>Cert Auth</th><th>Days</th><th>Cost</th>
          <th>Public</th><th>PQC</th>
        </tr>
      </thead>
      <tbody>${assetRows}</tbody>
      <tfoot>
        <tr style="background:#f8fafc;border-top:2px solid #e5e7eb;">
          <td colspan="8" style="padding:8px 10px;font-size:10px;color:#374151;font-weight:700;">
            TOTALS
          </td>
          <td style="padding:8px 10px;font-size:10px;color:#0891b2;font-weight:700;text-align:center;">
            ${totalDays}d
          </td>
          <td style="padding:8px 10px;font-size:10px;color:#ea580c;font-weight:700;text-align:right;">
            $${totalCost.toLocaleString()}
          </td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
    <div style="margin-top:8px;font-size:8px;color:#9ca3af;">
      Ranked: public-facing first → risk weight → cost (lowest first).
      Effort: Web App 2d · API 3d · Server 5d · LB 1d · Other 3d. Dev rate: $${devRate}/day.
    </div>
  </div>

  <hr/>

  <!-- ══ REMEDIATION ACTIONS ═══════════════════════════════════════════════ -->
  <div class="section">
    <h2>Remediation Actions</h2>
    <div class="grid3">${remCards}</div>
  </div>

  <hr/>

  <!-- ══ SIGN-OFF ══════════════════════════════════════════════════════════ -->
  <div class="grid3" style="margin-bottom:28px;">
    ${["Prepared by","Reviewed by","Approved by"].map(role => `
      <div>
        <div style="font-size:8px;color:#9ca3af;text-transform:uppercase;
          letter-spacing:.1em;margin-bottom:22px;">${role}</div>
        <div style="border-bottom:1px solid #374151;margin-bottom:5px;"></div>
        <div style="font-size:8px;color:#9ca3af;">Signature &amp; Date</div>
      </div>`).join("")}
  </div>

  <div class="footer">
    Generated by REBEL Threat Intelligence Platform &nbsp;·&nbsp; r3bel-production.up.railway.app
    &nbsp;·&nbsp; Report ID: ${reportId}
    &nbsp;·&nbsp; Prepared for: ${displayName}
    ${clientDomain ? `&nbsp;·&nbsp; Scope: *.${normaliseDomain(clientDomain)}` : ""}
    <br/>
    This document is confidential and intended solely for the named organisation.
    Handle in accordance with your data classification policy.
  </div>

</div>
</body>
</html>`;

  const blob = new Blob([html], { type:"text/html" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) win.focus();
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────
function ScoreGauge({ score, size = 200 }: { score: number; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let frame: number;
    let cur = 0;
    const step = () => {
      cur += (score - cur) * 0.07;
      if (Math.abs(score - cur) < 0.3) cur = score;
      setShown(Math.round(cur));
      if (cur !== score) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = size, H = Math.round(size * 0.6);
    const cx = W/2, cy = H+5, r = Math.round(size*0.4);
    c.width = W; c.height = H;
    ctx.clearRect(0,0,W,H);
    ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,0,false);
    ctx.lineWidth = Math.round(size*0.06);
    ctx.strokeStyle = "rgba(59,130,246,0.1)"; ctx.stroke();
    const col = shown>=70?T.green:shown>=40?T.yellow:T.red;
    ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,Math.PI+Math.PI*(shown/100),false);
    ctx.lineWidth = Math.round(size*0.06); ctx.strokeStyle = col;
    ctx.lineCap = "round"; ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.stroke(); ctx.shadowBlur = 0;
    for (let i=0;i<=10;i++) {
      const a = Math.PI+(Math.PI*i)/10;
      ctx.beginPath();
      ctx.moveTo(cx+(r-size*0.09)*Math.cos(a), cy+(r-size*0.09)*Math.sin(a));
      ctx.lineTo(cx+(r-size*0.05)*Math.cos(a), cy+(r-size*0.05)*Math.sin(a));
      ctx.strokeStyle = "rgba(200,220,255,0.15)"; ctx.lineWidth = 1; ctx.stroke();
    }
  }, [shown, size]);

  const col   = shown>=70?T.green:shown>=40?T.yellow:T.red;
  const label = shown>=70?"GOOD":shown>=40?"AT RISK":"CRITICAL";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%" }}>
      <canvas ref={ref} style={{ width:"100%", maxWidth:size, height:"auto" }}/>
      <div style={{ marginTop:-6, textAlign:"center" }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:Math.round(size*0.18),
          fontWeight:900, color:col, textShadow:`0 0 20px ${col}44` }}>{shown}</div>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color:col,
          letterSpacing:".2em", marginTop:2 }}>{label}</div>
        <div style={{ fontSize:9, color:T.text3, marginTop:4 }}>PQC READINESS SCORE</div>
      </div>
    </div>
  );
}

// ─── Expandable card (mobile/tablet) ─────────────────────────────────────────
function RoadmapCard({ a, i }: { a: any; i: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pqc-row"
      style={{ borderBottom:`1px solid rgba(59,130,246,0.05)`, animationDelay:`${i*0.04}s` }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ padding:"10px 14px", cursor:"pointer",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0, flex:1 }}>
          <span style={{ fontFamily:"'Orbitron',monospace", fontSize:9,
            color:T.text3, flexShrink:0 }}>#{i+1}</span>
          <span style={{ fontSize:12, color:T.blue,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.app}</span>
          {a.isPublic && (
            <span style={{ fontSize:7, color:T.cyan,
              border:`1px solid ${T.cyan}44`, borderRadius:2,
              padding:"1px 4px", flexShrink:0 }}>PUB</span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <Badge v={riskVariant(a.risk)}>{a.risk}</Badge>
          <span style={{ fontSize:10, color:T.text3 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      <div style={{ padding:"0 14px 10px", display:"flex", gap:10, flexWrap:"wrap" }}>
        <span style={{ fontSize:9, color:T.text3  }}>{a.assetType}</span>
        <span style={{ fontSize:9, color:T.cyan   }}>{a.days}d</span>
        <span style={{ fontSize:9, color:T.orange }}>${a.cost.toLocaleString()}</span>
        <span style={{ fontSize:9, color:a.pqc?T.green:T.red }}>
          {a.pqc ? "PQC ✓" : "PQC ✗"}
        </span>
      </div>
      {open && (
        <div style={{ padding:"0 14px 12px", display:"grid",
          gridTemplateColumns:"1fr 1fr", gap:6,
          borderTop:`1px solid rgba(59,130,246,0.06)`, paddingTop:10 }}>
          {[
            { label:"KEY LEN", val:a.keylen, color:a.keylen?.startsWith("1024")?T.red:a.keylen?.startsWith("2048")?T.yellow:T.green },
            { label:"TLS",     val:`TLS ${a.tls}`, color:a.tls==="1.0"?T.red:a.tls==="1.2"?T.yellow:T.green },
            { label:"CA",      val:a.ca,     color:T.text2 },
            { label:"WEIGHT",  val:a.weight, color:T.text2 },
          ].map(item => (
            <div key={item.label} style={{ background:"rgba(59,130,246,0.03)",
              borderRadius:3, padding:"6px 8px" }}>
              <div style={{ fontSize:7, color:T.text3, letterSpacing:".1em", marginBottom:3 }}>
                {item.label}</div>
              <div style={{ fontSize:10, color:item.color,
                fontFamily:"'Share Tech Mono',monospace" }}>{item.val}</div>
            </div>
          ))}
          <div style={{ gridColumn:"1/-1", fontSize:8, color:T.text3,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.cipher}</div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PQCReadinessPage() {
  const [cbomData,     setCbomData]     = useState<any[]>([]);
  const [assets,       setAssets]       = useState<any[]>([]);
  const [teamSize,     setTeamSize]     = useState(2);
  const [devRate,      setDevRate]      = useState(DEV_RATE);
  // Domain filter state
  const [domainInput,  setDomainInput]  = useState("");
  const [activeDomain, setActiveDomain] = useState("");
  const [clientName,   setClientName]   = useState("");

  const bp        = useBreakpoint();
  const isMobile  = bp === "mobile";
  const isTablet  = bp === "tablet";
  const isDesktop = bp === "desktop";

  useEffect(() => {
    fetch(`${API}/cbom`).then(r=>r.json()).then(d=>{
      if (d.apps?.length) setCbomData(d.apps);
    }).catch(()=>{});
    fetch(`${API}/assets`).then(r=>r.json()).then(d=>{
      if (d.assets?.length) setAssets(d.assets);
    }).catch(()=>{});
  }, []);

  const displayCbom   = cbomData.length ? cbomData   : MOCK_CBOM;
  const displayAssets = assets.length   ? assets     : MOCK_ASSETS;

  // ── DOMAIN FILTER applied to CBOM ────────────────────────────────────────
  const scopedCbom = activeDomain
    ? displayCbom.filter((a: any) => appMatchesDomain(a.app ?? "", activeDomain))
    : displayCbom;

  // ── Deduplicate ───────────────────────────────────────────────────────────
  const uniqueCbom = scopedCbom.filter(
    (a: any, i: number, arr: any[]) => arr.findIndex((b:any) => b.app === a.app) === i
  );

  const weakApps = uniqueCbom.filter((a: any) =>
    a.status === "weak" || a.status === "WEAK" || !a.pqc || a.keylen?.startsWith("1024")
  );

  const enriched = weakApps.map((app: any) => {
    const asset     = matchAsset(app.app, displayAssets);
    const assetType = asset?.type ?? "Other";
    const days      = EFFORT[assetType] ?? 3;
    const cost      = days * devRate;
    const weight    = riskWeight(app, asset);
    const risk      = riskLabel(weight);
    const isPublic  = asset?.type === "Web Apps" || asset?.type === "Web App";
    return { ...app, asset, assetType, days, cost, weight, risk, isPublic };
  }).sort((a, b) => b.weight - a.weight);

  const total         = uniqueCbom.length;
  const pqcReady      = uniqueCbom.filter((a:any) => a.pqc && a.status !== "weak" && a.status !== "WEAK").length;
  const rawScore      = total ? Math.round((pqcReady / total) * 100) : 0;
  const penaltySum    = enriched.reduce((s, a) => s + a.weight, 0);
  const maxPenalty    = total * 4.5;
  const weightedScore = Math.max(0, Math.round(rawScore - (penaltySum / maxPenalty) * 30));
  const totalDays     = enriched.reduce((s, a) => s + a.days, 0);
  const calDays       = Math.ceil(totalDays / Math.max(teamSize, 1));
  const totalCost     = enriched.reduce((s, a) => s + a.cost, 0);
  const critCount     = enriched.filter(a => a.risk === "Critical").length;
  const highCount     = enriched.filter(a => a.risk === "High").length;
  const unmatchedCount = enriched.filter(a => !a.asset).length;

  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + calDays);
  const dateStr = completionDate.toLocaleDateString("en-US", {
    month:"short", day:"numeric", year:"numeric"
  });

  function applyDomain() {
    setActiveDomain(domainInput.trim());
  }

  function clearFilter() {
    setDomainInput("");
    setActiveDomain("");
    setClientName("");
  }

  function exportCSV() {
    const rows = [
      ["Priority","App","Asset Type","Risk","Key Length","Cipher","TLS","CA","Days","Cost ($)","Public","PQC"],
      ...enriched.map((a,i) => [
        i+1, a.app, a.assetType, a.risk, a.keylen, a.cipher,
        a.tls, a.ca, a.days, a.cost, a.isPublic?"Yes":"No", a.pqc?"Yes":"No"
      ])
    ];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement("a");
    el.href = url;
    el.download = `rebel-pqc-${activeDomain || "all"}.csv`;
    el.click();
  }

  const gaugeSize  = isMobile ? 160 : 200;
  const metricCols = isMobile ? "1fr 1fr" : isTablet ? "repeat(3,1fr)" : "repeat(5,1fr)";

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .pqc-row{animation:fadeIn 0.3s ease both;}
        .pqc-row:hover{background:rgba(59,130,246,0.04)!important;}
        .pqc-show-cards{display:block;}
        .pqc-show-table{display:none;}
        @media(min-width:900px){
          .pqc-show-cards{display:none!important;}
          .pqc-show-table{display:block!important;}
        }
      `}</style>

      {/* ── DOMAIN SCOPE FILTER ── */}
      <Panel>
        <PanelHeader left="REPORT SCOPE — CLIENT DOMAIN FILTER" />
        <div style={{ padding:14, display:"flex", flexDirection:"column", gap:12 }}>

          <div style={{ display:"grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap:10 }}>
            {/* Domain input */}
            <div>
              <div style={{ fontSize:8, color:T.text3, letterSpacing:".12em",
                marginBottom:5 }}>CLIENT DOMAIN</div>
              <div style={{ display:"flex", gap:6 }}>
                <input
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && applyDomain()}
                  placeholder="e.g. barclays.com"
                  style={{ ...S.input, flex:1, fontSize:12 }}
                />
                <button style={{ ...S.btn, background:"rgba(59,130,246,0.15)",
                  borderColor:"rgba(59,130,246,0.4)", fontSize:11 }}
                  onClick={applyDomain}>
                  APPLY
                </button>
                {activeDomain && (
                  <button style={{ ...S.btn, fontSize:11 }} onClick={clearFilter}>
                    CLEAR
                  </button>
                )}
              </div>
              <div style={{ fontSize:8, color:T.text3, marginTop:5 }}>
                Filters all data to assets whose hostname ends with this domain.
                Leave empty to include all scanned assets.
              </div>
            </div>

            {/* Client name for PDF */}
            <div>
              <div style={{ fontSize:8, color:T.text3, letterSpacing:".12em",
                marginBottom:5 }}>CLIENT NAME (for PDF report)</div>
              <input
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="e.g. Barclays Bank PLC"
                style={{ ...S.input, width:"100%", fontSize:12 }}
              />
              <div style={{ fontSize:8, color:T.text3, marginTop:5 }}>
                Appears on the PDF cover alongside REBEL branding.
              </div>
            </div>
          </div>

          {/* Active filter pill */}
          {activeDomain && (
            <div style={{ display:"flex", alignItems:"center", gap:10,
              background:"rgba(59,130,246,0.06)",
              border:"1px solid rgba(59,130,246,0.2)",
              borderRadius:4, padding:"7px 12px" }}>
              <span style={{ fontSize:9, color:T.text3 }}>ACTIVE SCOPE</span>
              <span style={{ fontFamily:"'Orbitron',monospace", fontSize:10,
                color:T.blue }}>*.{normaliseDomain(activeDomain)}</span>
              <span style={{ fontSize:9, color:T.text3, marginLeft:"auto" }}>
                <b style={{ color:T.text2 }}>{uniqueCbom.length}</b> apps in scope ·
                <b style={{ color:T.red }}> {enriched.length}</b> need migration
              </span>
            </div>
          )}

          {/* No results warning */}
          {activeDomain && uniqueCbom.length === 0 && (
            <div style={{ background:"rgba(239,68,68,0.06)",
              border:"1px solid rgba(239,68,68,0.2)",
              borderRadius:4, padding:"8px 12px",
              fontSize:10, color:T.text2 }}>
              ⚠ No scanned assets found for <b style={{color:T.red}}>*.{normaliseDomain(activeDomain)}</b>.
              Check the domain spelling or verify the site has been scanned in CBOM.
            </div>
          )}
        </div>
      </Panel>

      {/* ── UNMATCHED ASSETS WARNING ── */}
      {unmatchedCount > 0 && (
        <div style={{ background:"rgba(234,179,8,0.06)",
          border:"1px solid rgba(234,179,8,0.25)",
          borderRadius:4, padding:"8px 14px",
          display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:T.yellow, fontSize:12 }}>⚠</span>
          <span style={{ fontSize:10, color:T.text2 }}>
            <b style={{ color:T.yellow }}>{unmatchedCount} asset{unmatchedCount>1?"s":""}</b>
            {" "}could not be matched to inventory — defaulted to "Other" type.
            Effort estimates may be inaccurate.
          </span>
        </div>
      )}

      {/* ── METRICS ── */}
      <div style={{ display:"grid", gridTemplateColumns:metricCols, gap:isMobile?8:9 }}>
        <MetricCard label="READINESS SCORE" value={`${weightedScore}/100`}
          sub={activeDomain ? `*.${normaliseDomain(activeDomain)}` : "All assets"}
          color={weightedScore>=70?T.green:weightedScore>=40?T.yellow:T.red} />
        <MetricCard label="NEED MIGRATION" value={enriched.length}
          sub="Weak assets" color={T.red} />
        <MetricCard label="CRITICAL" value={critCount}
          sub="Immediate action" color={T.red} />
        <MetricCard label="EST. DAYS" value={calDays}
          sub={`${teamSize} dev team`} color={T.cyan} />
        <div style={isMobile?{gridColumn:"1/-1"}:{}}>
          <MetricCard label="EST. COST" value={`$${(totalCost/1000).toFixed(1)}k`}
            sub="At $800/day" color={T.orange} />
        </div>
      </div>

      {/* ── SCORE + PLAN ── */}
      <div style={{ display:"grid",
        gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:isMobile?8:10 }}>
        <Panel>
          <PanelHeader left="PQC MIGRATION READINESS SCORE" />
          <div style={{ padding:14, display:"flex", flexDirection:"column",
            alignItems:"center", gap:16 }}>
            <div style={{ width:"100%", maxWidth:gaugeSize+40, margin:"0 auto" }}>
              <ScoreGauge score={weightedScore} size={gaugeSize} />
            </div>
            <div style={{ width:"100%", display:"grid",
              gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[
                { label:"PQC READY",  val:pqcReady,        color:T.green },
                { label:"WEAK",       val:enriched.length, color:T.red   },
                { label:"IN SCOPE",   val:total,           color:T.blue  },
              ].map(item => (
                <div key={item.label} style={{ background:"rgba(59,130,246,0.04)",
                  border:"1px solid rgba(59,130,246,0.1)", borderRadius:3,
                  padding:isMobile?"6px 4px":"8px 6px", textAlign:"center" }}>
                  <div style={{ fontFamily:"'Orbitron',monospace",
                    fontSize:isMobile?15:18, color:item.color }}>{item.val}</div>
                  <div style={{ fontSize:isMobile?7:8, color:T.text3,
                    marginTop:3, letterSpacing:".08em" }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader left="MIGRATION PLAN SUMMARY" />
          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid",
              gridTemplateColumns:(isTablet||isDesktop)?"1fr 1fr":"1fr", gap:10 }}>
              <div style={{ background:"rgba(59,130,246,0.04)",
                border:"1px solid rgba(59,130,246,0.1)", borderRadius:3, padding:12 }}>
                <div style={{ fontSize:8, color:T.text3, marginBottom:5,
                  letterSpacing:".12em" }}>ESTIMATED COMPLETION</div>
                <div style={{ fontFamily:"'Orbitron',monospace",
                  fontSize:isMobile?13:17, color:T.cyan }}>{dateStr}</div>
                <div style={{ fontSize:9, color:T.text2, marginTop:4 }}>
                  {calDays}d · {totalDays} dev days · {enriched.length} assets
                </div>
              </div>
              <div style={{ background:"rgba(239,68,68,0.04)",
                border:"1px solid rgba(239,68,68,0.1)", borderRadius:3, padding:12 }}>
                <div style={{ fontSize:8, color:T.text3, marginBottom:5,
                  letterSpacing:".12em" }}>TOTAL MIGRATION COST</div>
                <div style={{ fontFamily:"'Orbitron',monospace",
                  fontSize:isMobile?13:17, color:T.orange }}>
                  ${totalCost.toLocaleString()}</div>
                <div style={{ fontSize:9, color:T.text2, marginTop:4 }}>
                  {critCount} critical · {highCount} high · ${devRate}/day
                </div>
              </div>
            </div>
            <div style={{ display:"grid",
              gridTemplateColumns:(isTablet||isDesktop)?"1fr 1fr":"1fr", gap:12 }}>
              {[
                { label:"TEAM SIZE", display:`${teamSize} devs`,
                  min:1, max:10, step:1, val:teamSize,
                  set:(v:number)=>setTeamSize(v), l:"1", r:"10" },
                { label:"DEV RATE / DAY", display:`$${devRate}`,
                  min:200, max:2000, step:100, val:devRate,
                  set:(v:number)=>setDevRate(v), l:"$200", r:"$2000" },
              ].map(sl => (
                <div key={sl.label}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:9, color:T.text3,
                      letterSpacing:".12em" }}>{sl.label}</span>
                    <span style={{ fontFamily:"'Orbitron',monospace",
                      fontSize:11, color:T.blue }}>{sl.display}</span>
                  </div>
                  <input type="range" min={sl.min} max={sl.max} step={sl.step}
                    value={sl.val} onChange={e => sl.set(Number(e.target.value))}
                    style={{ width:"100%", accentColor:T.blue, cursor:"pointer" }} />
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:8, color:T.text3 }}>{sl.l}</span>
                    <span style={{ fontSize:8, color:T.text3 }}>{sl.r}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* ── RISK DISTRIBUTION ── */}
      <Panel>
        <PanelHeader left="RISK DISTRIBUTION" />
        <div style={{ padding:14, display:"grid",
          gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:10 }}>
          {(["Critical","High","Medium","Low"] as const).map(level => {
            const count = enriched.filter(a=>a.risk===level).length;
            const pct   = enriched.length?Math.round(count/enriched.length*100):0;
            const color = level==="Critical"?T.red:level==="High"?T.orange
                        : level==="Medium"?T.yellow:T.green;
            return (
              <div key={level} style={{ background:"rgba(59,130,246,0.03)",
                border:`1px solid rgba(59,130,246,0.08)`, borderRadius:3, padding:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:9, color, letterSpacing:".12em" }}>{level.toUpperCase()}</span>
                  <span style={{ fontFamily:"'Orbitron',monospace", fontSize:13, color }}>{count}</span>
                </div>
                <div style={{ height:3, background:"rgba(255,255,255,0.05)", borderRadius:2 }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:color,
                    borderRadius:2, transition:"width 0.8s ease" }}/>
                </div>
                <div style={{ fontSize:8, color:T.text3, marginTop:5 }}>
                  {enriched.filter(a=>a.risk===level).reduce((s,a)=>s+a.days,0)} dev days
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ── MIGRATION ROADMAP ── */}
      <Panel>
        <PanelHeader
          left="MIGRATION ROADMAP"
          right={
            <div style={{ display:"flex", gap:6 }}>
              <button style={{ ...S.btn, fontSize:isMobile?9:11 }} onClick={exportCSV}>
                ↓ CSV
              </button>
              <button
                style={{ ...S.btn, fontSize:isMobile?9:11,
                  background:"rgba(59,130,246,0.12)",
                  borderColor:"rgba(59,130,246,0.35)" }}
                onClick={() => exportAuditPDF(
                  enriched, weightedScore, pqcReady, total,
                  totalDays, calDays, totalCost, teamSize, devRate,
                  dateStr, clientName, activeDomain
                )}>
                {isMobile ? "⬡ PDF" : "⬡ AUDIT PDF"}
              </button>
            </div>
          }
        />

        <div className="pqc-show-cards">
          <div style={{ maxHeight:isMobile?400:520, overflowY:"auto" }}>
            {enriched.map((a,i) => <RoadmapCard key={i} a={a} i={i}/>)}
            {enriched.length === 0 && (
              <div style={{ padding:24, textAlign:"center", fontSize:10, color:T.text3 }}>
                {activeDomain && uniqueCbom.length === 0
                  ? `No assets found for *.${normaliseDomain(activeDomain)}`
                  : "✓ No weak assets — nothing to migrate"}
              </div>
            )}
          </div>
        </div>

        <div className="pqc-show-table">
          <Table cols={["#","APPLICATION","TYPE","RISK","KEY LEN","CIPHER",
            "TLS","CA","DAYS","COST","PUB","PQC"]}>
            {enriched.map((a,i) => (
              <TR key={i}>
                <TD style={{ fontFamily:"'Orbitron',monospace",
                  fontSize:9, color:T.text3 }}>{i+1}</TD>
                <TD style={{ color:T.blue, fontSize:10 }}>{a.app}</TD>
                <TD><Badge v="gray">{a.assetType}</Badge></TD>
                <TD><Badge v={riskVariant(a.risk)}>{a.risk}</Badge></TD>
                <TD style={{ fontSize:10,
                  color:a.keylen?.startsWith("1024")?T.red
                       :a.keylen?.startsWith("2048")?T.yellow:T.green }}>
                  {a.keylen}</TD>
                <TD style={{ fontSize:9, color:T.text3, maxWidth:140,
                  overflow:"hidden", textOverflow:"ellipsis",
                  whiteSpace:"nowrap" }}>{a.cipher}</TD>
                <TD><Badge v={a.tls==="1.0"?"red":a.tls==="1.2"?"yellow":"green"}>
                  TLS {a.tls}</Badge></TD>
                <TD style={{ fontSize:9, color:T.text3 }}>{a.ca}</TD>
                <TD style={{ fontFamily:"'Orbitron',monospace",
                  fontSize:10, color:T.cyan }}>{a.days}d</TD>
                <TD style={{ fontFamily:"'Orbitron',monospace",
                  fontSize:10, color:T.orange }}>${a.cost.toLocaleString()}</TD>
                <TD style={{ textAlign:"center", fontSize:12 }}>
                  {a.isPublic
                    ? <span style={{color:T.cyan}}>●</span>
                    : <span style={{color:T.text3}}>○</span>}
                </TD>
                <TD style={{ textAlign:"center", fontSize:13 }}>
                  {a.pqc
                    ? <span style={{color:T.green}}>✓</span>
                    : <span style={{color:T.red}}>✗</span>}
                </TD>
              </TR>
            ))}
          </Table>
        </div>

        <div style={{ padding:"8px 12px",
          borderTop:`1px solid rgba(59,130,246,0.07)`,
          display:"flex", justifyContent:"space-between",
          alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <span style={{ fontSize:10, color:T.text3 }}>
            <b style={{color:T.text2}}>{enriched.length}</b> to migrate ·
            <b style={{color:T.cyan}}> {totalDays}d</b> dev ·
            <b style={{color:T.orange}}> ${totalCost.toLocaleString()}</b>
          </span>
          {!isMobile && (
            <span style={{ fontSize:9, color:T.text3 }}>
              Ranked: public-facing → risk → cost
            </span>
          )}
        </div>
      </Panel>

      {/* ── REMEDIATION GUIDE ── */}
      <Panel>
        <PanelHeader left="REMEDIATION GUIDE" />
        <div style={{ padding:14, display:"grid",
          gridTemplateColumns:isMobile?"1fr":isTablet?"1fr 1fr":"repeat(3,1fr)",
          gap:10 }}>
          {[
            { title:"Upgrade key length", color:T.red, icon:"⬡",
              items:enriched.filter(a=>a.keylen?.startsWith("1024")).map(a=>a.app),
              fix:"Rotate certificates to RSA-4096 or ECDSA-256" },
            { title:"Replace weak ciphers", color:T.orange, icon:"◈",
              items:enriched.filter(a=>a.status==="weak"||a.status==="WEAK").map(a=>a.app),
              fix:"Migrate to TLS_AES_256_GCM_SHA384" },
            { title:"Enable PQC algorithms", color:T.cyan, icon:"◉",
              items:enriched.filter(a=>!a.pqc).map(a=>a.app),
              fix:"Implement CRYSTALS-Kyber or CRYSTALS-Dilithium" },
          ].map(section => (
            <div key={section.title} style={{ background:"rgba(59,130,246,0.03)",
              border:`1px solid ${section.color}22`, borderRadius:3, padding:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ fontFamily:"'Orbitron',monospace",
                  color:section.color, flexShrink:0 }}>{section.icon}</span>
                <span style={{ fontSize:10, color:section.color, letterSpacing:".1em",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {section.title.toUpperCase()}</span>
                <span style={{ marginLeft:"auto", fontFamily:"'Orbitron',monospace",
                  fontSize:11, color:section.color, flexShrink:0 }}>
                  {section.items.length}</span>
              </div>
              <div style={{ fontSize:9, color:T.text2, marginBottom:8,
                lineHeight:1.5 }}>{section.fix}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {section.items.slice(0,5).map((app,i) => (
                  <div key={i} style={{ fontSize:9, color:T.text3,
                    display:"flex", alignItems:"center", gap:6,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    <span style={{ color:section.color, fontSize:7,
                      flexShrink:0 }}>▸</span> {app}
                  </div>
                ))}
                {section.items.length > 5 && (
                  <div style={{ fontSize:9, color:T.text3 }}>
                    +{section.items.length-5} more</div>
                )}
                {section.items.length === 0 && (
                  <div style={{ fontSize:9, color:T.green }}>✓ All clear</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

    </div>
  );
}