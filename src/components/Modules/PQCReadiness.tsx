import React, { useState, useEffect, useRef } from "react";
import { useThemeContext } from '../context/ThemeContext.js'
import {
  T, S, Panel, PanelHeader, MetricCard, Badge,
  Table, TR, TD, MOCK_CBOM, MOCK_ASSETS,
} from "./shared.js";

import {
  fullAnalysis, normaliseTLS, pqcReadinessScore,
} from "./cipherAnalysis.js";

import type { PQCScoreBreakdown } from "./cipherAnalysis.js";

const API = "https://r3bel-production.up.railway.app";

// ── Light Theme Palette ───────────────────────────────────────────────────────
const L = {
  // Backgrounds
  pageBg:      "#f5f7fa",
  panelBg:     "#ffffff",
  panelBorder: "#e2e8f0",
  rowHover:    "rgba(59,130,246,0.04)",
  subtleBg:    "#f8fafc",
  insetBg:     "#f1f5f9",

  // Text
  text1:  "#0f172a",   // headings
  text2:  "#334155",   // body
  text3:  "#64748b",   // secondary / labels
  text4:  "#94a3b8",   // muted

  // Brand accents (matching original hues but vivid on light)
  blue:   "#1d4ed8",
  cyan:   "#0284c7",
  green:  "#16a34a",
  yellow: "#b45309",
  orange: "#c2410c",
  red:    "#dc2626",

  // Borders & dividers
  border:      "#e2e8f0",
  borderLight: "#f1f5f9",
};

// Light-mode style helpers
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
    border: `1px solid ${L.border}`,
    borderRadius: 5,
    color: L.text1,
    padding: "7px 10px",
    fontSize: 12,
    outline: "none",
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

// ── INR Formatter ─────────────────────────────────────────────────────────────
const INR_RATE = 83; // 1 USD = 83 INR (approximate)
function toINR(usd: number): number { return Math.round(usd * INR_RATE); }
function fmtINR(usd: number): string {
  const inr = toINR(usd);
  if (inr >= 10000000) return `₹${(inr/10000000).toFixed(2)}Cr`;
  if (inr >= 100000)   return `₹${(inr/100000).toFixed(1)}L`;
  return `₹${inr.toLocaleString("en-IN")}`;
}
function fmtINRFull(usd: number): string {
  return `₹${toINR(usd).toLocaleString("en-IN")}`;
}

const EFFORT: Record<string, number> = {
  "Web App": 2, "Web Apps": 2,
  "API": 3,     "APIs": 3,
  "Server": 5,  "Servers": 5,
  "LB": 1,      "Other": 3,
};
const DEV_RATE_USD = 800; // internal USD base; display in INR

function normaliseDomain(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

function appMatchesDomain(appName: string, clientDomain: string): boolean {
  if (!clientDomain) return true;
  const app = normaliseDomain(appName), domain = normaliseDomain(clientDomain);
  return app === domain || app.endsWith("." + domain);
}

const GENERIC_NAMES = new Set(["api","web","app","server","lb","www","cdn","mail","vpn"]);

function matchAsset(appName: string, assets: any[]): any | undefined {
  const root = appName?.split(".")[0]?.toLowerCase().replace(/[^a-z0-9]/g,"") ?? "";
  if (!root || root.length < 3 || GENERIC_NAMES.has(root)) return undefined;
  const exact = assets.find(a => a.name?.toLowerCase().replace(/[^a-z0-9]/g,"") === root);
  if (exact) return exact;
  const sw = assets.find(a => { const n = a.name?.toLowerCase().replace(/[^a-z0-9]/g,"") ?? ""; return n.length>=3&&root.startsWith(n); });
  if (sw) return sw;
  const contains = assets.filter(a => { const n = a.name?.toLowerCase().replace(/[^a-z0-9]/g,"") ?? ""; return n.length>=3&&root.includes(n); });
  return contains.length === 1 ? contains[0] : undefined;
}

function riskWeight(app: any, asset: any): number {
  const isPublic = asset?.type==="Web Apps"||asset?.type==="Web App";
  let w = 1;
  if (app?.keylen?.startsWith("1024")) w += 2;
  if (app?.status==="weak"||app?.status==="WEAK") w += 1;
  if (isPublic) w *= 1.5;
  if (!app?.pqc) w += 0.5;
  return Math.round(w * 10) / 10;
}

function riskLabel(w: number): "Critical"|"High"|"Medium"|"Low" {
  if (w>=4.5) return "Critical"; if (w>=3) return "High"; if (w>=2) return "Medium"; return "Low";
}

function riskVariant(r: string): any {
  return r==="Critical"?"red":r==="High"?"orange":r==="Medium"?"yellow":"green";
}

function useBreakpoint() {
  const get = () => { const w=window.innerWidth; if(w<480)return"mobile"as const; if(w<900)return"tablet"as const; return"desktop"as const; };
  const [bp, setBp] = useState(get);
  useEffect(() => { const h=()=>setBp(get()); window.addEventListener("resize",h); return()=>window.removeEventListener("resize",h); }, []);
  return bp;
}

// ── Light Panel Components ────────────────────────────────────────────────────
function LPanel({ children, style={} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{...LS.panel, ...style}}>{children}</div>;
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

function LMetricCard({ label, value, sub, color }: { label: string; value: string|number; sub: string; color: string }) {
  return (
    <div style={{
      background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8,
      padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 8, color: L.text4, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: L.text3, marginTop: 5 }}>{sub}</div>
    </div>
  );
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportAuditPDF(
  enriched: any[], migrationScore: number, pqcReady: number, total: number,
  totalDays: number, calDays: number, totalCostUSD: number,
  teamSize: number, devRateUSD: number, dateStr: string,
  clientName: string, clientDomain: string,
  milestoneData: { label:string; done:boolean; pct:number }[],
) {
  const now       = new Date();
  const timestamp = now.toLocaleString("en-IN",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"});
  const scanDate  = now.toISOString().split("T")[0];
  const reportId  = `REBEL-${scanDate.replace(/-/g,"")}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  const scoreColor= migrationScore>=70?"#16a34a":migrationScore>=40?"#d97706":"#dc2626";
  const scoreLabel= migrationScore>=70?"COMPLIANT":migrationScore>=40?"AT RISK":"CRITICAL";
  const displayName = clientName.trim()||(clientDomain?normaliseDomain(clientDomain):"All Assets");

  const totalCostINR = toINR(totalCostUSD);
  const devRateINR   = toINR(devRateUSD);

  // Gauge SVG
  const weightedScore = migrationScore;
  const sc = migrationScore >= 70 ? "#16a34a" : migrationScore >= 40 ? "#d97706" : "#dc2626";
  const sl = migrationScore >= 70 ? "COMPLIANT" : migrationScore >= 40 ? "AT RISK" : "CRITICAL";

  const pct = weightedScore / 100, gr = 54, gcx = 70, gcy = 75;
  const gx1=gcx+gr*Math.cos(Math.PI), gy1=gcy+gr*Math.sin(Math.PI);
  const gx2=gcx+gr*Math.cos(Math.PI+Math.PI*pct);
  const gy2=gcy+gr*Math.sin(Math.PI+Math.PI*pct);
  const glf=pct>0.5?1:0;
  const gaugeSVG=`<svg width="140" height="82" viewBox="0 0 140 82" xmlns="http://www.w3.org/2000/svg">
    <path d="M ${gcx-gr} ${gcy} A ${gr} ${gr} 0 0 1 ${gcx+gr} ${gcy}"
      fill="none" stroke="#e5e7eb" stroke-width="10" stroke-linecap="round"/>
    <path d="M ${gx1.toFixed(2)} ${gy1.toFixed(2)} A ${gr} ${gr} 0 ${glf} 1 ${gx2.toFixed(2)} ${gy2.toFixed(2)}"
      fill="none" stroke="${sc}" stroke-width="10" stroke-linecap="round"/>
    <text x="${gcx}" y="${gcy-4}" text-anchor="middle"
      font-family="Arial" font-size="22" font-weight="bold" fill="${sc}">${weightedScore}</text>
    <text x="${gcx}" y="${gcy+13}" text-anchor="middle"
      font-family="Arial" font-size="7" fill="#6b7280" letter-spacing="1">${sl}</text>
  </svg>`;

  const scoreDist = milestoneData.map(m => {
    const color = m.done ? "#16a34a" : m.pct > 50 ? "#eab308" : "#ef4444";
    return `<div style="margin-bottom:9px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
        <span style="display:flex;align-items:center;gap:6px;font-size:9px;color:#374151;">
          <span style="font-size:10px;color:${m.done?"#16a34a":"#ef4444"};">${m.done?"✓":"✗"}</span>
          ${m.label}
        </span>
        <span style="font-size:9px;color:${color};font-weight:700;">${m.pct}%</span>
      </div>
      <div style="height:5px;background:#f3f4f6;border-radius:3px;">
        <div style="height:100%;width:${m.pct}%;background:${color};border-radius:3px;"></div>
      </div>
    </div>`;
  }).join("");

  const assetRows = enriched.map((a,i)=>{
    const rc=a.risk==="Critical"?"#dc2626":a.risk==="High"?"#ea580c":a.risk==="Medium"?"#d97706":"#16a34a";
    const kc=a.keylen?.startsWith("1024")?"#dc2626":a.keylen?.startsWith("2048")?"#d97706":"#16a34a";
    const tc=a.tls==="1.0"?"#dc2626":a.tls==="1.2"?"#d97706":"#16a34a";
    const bg=i%2===0?"#ffffff":"#f9fafb";
    const ps=a.pqcScore as PQCScoreBreakdown|undefined;
    const psc=ps?.active?"#16a34a":ps?.color??"#ef4444";
    const psl=ps?.active?"ACTIVE":ps?`${ps.score}/100`:"—";
    const dots=ps?Object.values(ps.criteria).map((c:any)=>
      `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${c.pass?"#16a34a":c.pts>0?"#eab308":"#ef4444"};margin-right:2px;" title="${c.label}: ${c.pts}/${c.max}"></span>`
    ).join(""):"";
    return `<tr style="background:${bg};">
      <td style="padding:5px 7px;font-size:8px;color:#9ca3af;text-align:center;">${i+1}</td>
      <td style="padding:5px 7px;font-size:9px;color:#1e40af;font-weight:500;">${a.app}</td>
      <td style="padding:5px 7px;font-size:8px;color:#374151;">${a.assetType}</td>
      <td style="padding:5px 7px;text-align:center;"><span style="font-size:8px;font-weight:600;color:${rc};background:${rc}18;padding:2px 6px;border-radius:3px;">${a.risk}</span></td>
      <td style="padding:5px 7px;font-size:8px;color:${kc};font-weight:600;text-align:center;">${a.keylen??"—"}</td>
      <td style="padding:5px 7px;font-size:7px;color:#6b7280;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.cipher??"—"}</td>
      <td style="padding:5px 7px;text-align:center;font-size:8px;color:${tc};font-weight:500;">TLS ${a.tls??"—"}</td>
      <td style="padding:5px 7px;font-size:8px;color:#6b7280;">${a.ca??"—"}</td>
      <td style="padding:5px 7px;text-align:center;">
        <div style="font-size:9px;font-weight:700;color:${psc};">${psl}</div>
        <div style="margin-top:3px;">${dots}</div>
      </td>
      <td style="padding:5px 7px;font-size:8px;color:#0891b2;text-align:center;">${a.days}d</td>
      <td style="padding:5px 7px;font-size:8px;color:#ea580c;text-align:right;font-weight:600;">${fmtINRFull(a.cost)}</td>
    </tr>`;
  }).join("");

  const criteriaLegend=[
    {label:"Cert RSA-4096 / EC P-384",max:70,color:"#1e40af"},
    {label:"No wildcard certificate", max:20,color:"#0891b2"},
    {label:"AES-256-GCM / ChaCha20",  max: 8,color:"#16a34a"},
    {label:"X25519 or P-384 KX",      max: 2,color:"#d97706"},
    {label:"TLS 1.3 (hygiene)",       max: 0,color:"#9ca3af"},
    {label:"No CBC mode (hygiene)",   max: 0,color:"#9ca3af"},
  ].map(c=>`
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f3f4f6;font-size:9px;">
      <span style="color:#374151;">${c.label}</span>
      <span style="color:${c.color};font-weight:700;min-width:30px;text-align:right;">${c.max>0?`${c.max}pts`:"info"}</span>
    </div>`).join("");

  const doraRows=[
    {art:"Art. 9.2", title:"ICT Asset Register",      desc:"Maintain an up-to-date register of all ICT assets including cryptographic configurations.", status:total>0?"COVERED":"PENDING"},
    {art:"Art. 9.4", title:"Cryptographic Controls",   desc:"Implement cryptographic controls protecting data in transit and at rest.",                  status:enriched.filter(a=>a.status!=="weak"&&a.status!=="WEAK").length>0?"PARTIAL":"PENDING"},
    {art:"Art. 10.1",title:"Vulnerability Management", desc:"Identify, classify and address ICT vulnerabilities in a timely manner.",                   status:enriched.length>0?"IDENTIFIED":"CLEAR"},
    {art:"Art. 11.1",title:"ICT Business Continuity",  desc:"Maintain ICT business continuity plans covering cryptographic dependencies.",               status:"ROADMAP PROVIDED"},
  ].map(d=>{
    const sc=["COVERED","CLEAR","ROADMAP PROVIDED"].includes(d.status)?"#16a34a":["PARTIAL","IDENTIFIED"].includes(d.status)?"#d97706":"#dc2626";
    return `<tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:7px 10px;font-size:9px;color:#1e40af;font-weight:700;white-space:nowrap;">${d.art}</td>
      <td style="padding:7px 10px;font-size:9px;color:#111827;font-weight:600;">${d.title}</td>
      <td style="padding:7px 10px;font-size:8px;color:#6b7280;line-height:1.5;">${d.desc}</td>
      <td style="padding:7px 10px;text-align:center;"><span style="font-size:8px;font-weight:700;color:${sc};background:${sc}18;padding:2px 8px;border-radius:3px;white-space:nowrap;">${d.status}</span></td>
    </tr>`;
  }).join("");

  const remCards=[
    {title:"Upgrade Certificate Key",  color:"#dc2626",bg:"#fef2f2",border:"#fecaca",
     count:enriched.filter(a=>!(a.pqcScore?.criteria?.certKey4096?.pass)).length,
     action:"Deploy RSA-4096 or EC P-384 certificates.",
     detail:"Worth 70/100 pts — the primary bank infrastructure gate.",
     items:enriched.filter(a=>!(a.pqcScore?.criteria?.certKey4096?.pass)).map(a=>`${a.app} (${a.keylen??"?"})`).slice(0,5)},
    {title:"Remove Wildcard Certs",    color:"#ea580c",bg:"#fff7ed",border:"#fed7aa",
     count:enriched.filter(a=>a.is_wildcard).length,
     action:"Replace wildcards with dedicated per-service certificates.",
     detail:"Worth 20/100 pts — bank services must not share certificates.",
     items:enriched.filter(a=>a.is_wildcard).map(a=>a.app).slice(0,5)},
    {title:"Enable Kyber Hybrid",      color:"#0891b2",bg:"#f0f9ff",border:"#bae6fd",
     count:enriched.filter(a=>!a.pqc).length,
     action:"Implement CRYSTALS-Kyber (FIPS 203) hybrid key exchange.",
     detail:"Deploy X25519+Kyber768 — the only path to ACTIVE status.",
     items:enriched.filter(a=>!a.pqc).map(a=>a.app).slice(0,5)},
  ].map(s=>`
    <div style="border:1px solid ${s.border};border-radius:6px;padding:14px;background:${s.bg};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:10px;font-weight:700;color:${s.color};">${s.title}</span>
        <span style="font-size:18px;font-weight:700;color:${s.color};">${s.count}</span>
      </div>
      <div style="font-size:9px;color:#374151;font-weight:500;margin-bottom:3px;">${s.action}</div>
      <div style="font-size:8px;color:#6b7280;margin-bottom:10px;line-height:1.5;">${s.detail}</div>
      ${s.items.map(app=>`<div style="font-size:8px;color:#374151;padding:3px 0;border-top:1px solid ${s.border};">▸ ${app}</div>`).join("")}
      ${s.items.length===0?`<div style="font-size:8px;color:#16a34a;font-weight:500;">✓ All clear</div>`:""}
    </div>`).join("");

  const html=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>REBEL — PQC Audit — ${displayName} — ${scanDate}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff;font-size:11px;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.no-print{display:none!important;}.page-break{page-break-before:always;}}
    .page{max-width:980px;margin:0 auto;padding:32px 40px;}
    h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#374151;margin-bottom:12px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#f3f4f6;padding:6px 7px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;text-align:left;border-bottom:2px solid #e5e7eb;}
    hr{border:none;border-top:1px solid #e5e7eb;margin:22px 0;}
    .section{margin-bottom:26px;}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
    .card{border:1px solid #e5e7eb;border-radius:6px;padding:14px 16px;}
    .lbl{font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px;}
    .val{font-size:20px;font-weight:700;line-height:1;}
    .sub{font-size:8px;color:#6b7280;margin-top:4px;}
    .print-btn{position:fixed;top:20px;right:20px;background:#1e40af;color:#fff;border:none;padding:10px 22px;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;z-index:99;box-shadow:0 2px 8px rgba(30,64,175,.35);}
    .confidential{background:#fef9c3;border:1px solid #fde047;border-radius:4px;padding:6px 12px;font-size:8px;color:#854d0e;margin-bottom:20px;}
    .footer{font-size:8px;color:#d1d5db;text-align:center;margin-top:28px;padding-top:14px;border-top:1px solid #f3f4f6;line-height:1.7;}
  </style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">⬇ Save as PDF</button>
<div class="page">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #1e40af;margin-bottom:22px;">
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
    <div style="text-align:right;">
      <div style="font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">Prepared for</div>
      <div style="font-size:20px;font-weight:800;color:#111827;">${displayName}</div>
      ${clientDomain?`<div style="font-size:9px;color:#6b7280;margin-top:3px;">${normaliseDomain(clientDomain)}</div>`:""}
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;">
    <div>
      <div style="font-size:22px;font-weight:700;color:#111827;line-height:1.25;">Post-Quantum Cryptography<br/>Audit Report</div>
      <div style="font-size:9px;color:#6b7280;margin-top:7px;line-height:1.9;">DORA Art. 9 · NIST FIPS 203/204/205 · PCI-DSS 4.0 · SWIFT CSP</div>
    </div>
    <div style="text-align:right;min-width:200px;">
      <div style="font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;">Generated</div>
      <div style="font-size:9px;color:#374151;font-weight:500;margin-top:2px;">${timestamp}</div>
      <div style="font-size:8px;color:#9ca3af;margin-top:8px;text-transform:uppercase;letter-spacing:.08em;">Report ID</div>
      <div style="font-size:9px;color:#374151;font-family:monospace;margin-top:2px;">${reportId}</div>
      ${clientDomain?`<div style="font-size:8px;color:#9ca3af;margin-top:8px;text-transform:uppercase;letter-spacing:.08em;">Scope</div><div style="font-size:9px;color:#1e40af;font-weight:500;margin-top:2px;">*.${normaliseDomain(clientDomain)}</div>`:""}
    </div>
  </div>
  <div class="confidential">⚠ CONFIDENTIAL — Sensitive cryptographic posture data. Not for external distribution.</div>
  <hr/>

  <!-- EXECUTIVE SUMMARY -->
  <div class="section">
    <h2>Executive Summary</h2>
    <div class="grid2" style="align-items:start;">
      <div class="card" style="display:flex;flex-direction:column;align-items:center;padding:22px;">
        ${gaugeSVG}
        <div style="margin-top:12px;width:100%;">
          <div style="font-size:9px;color:#374151;font-weight:600;text-align:center;margin-bottom:8px;">${total} Applications Assessed · PQC Migration Progress</div>
          <div style="font-size:8px;color:#6b7280;line-height:1.6;background:#f9fafb;border-radius:4px;padding:8px;border:1px solid #e5e7eb;">
            Score = 5 milestones × 20pts each.<br/>
            All certs RSA-4096/EC P-384 · Zero wildcards · AES-256 everywhere · TLS 1.2 eliminated · Kyber deployed.<br/>
            A bank that has done no PQC work scores 0–20. Full Kyber deployment = 100.
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div class="grid2">
          <div class="card"><div class="lbl">Assessed</div><div class="val" style="color:#1e40af;">${total}</div><div class="sub">In scope</div></div>
          <div class="card"><div class="lbl">Need Action</div><div class="val" style="color:#dc2626;">${enriched.length}</div><div class="sub">Weak assets</div></div>
        </div>
        <div class="grid2">
          <div class="card"><div class="lbl">Est. Timeline</div><div class="val" style="color:#0891b2;">${calDays}d</div><div class="sub">${teamSize} dev · ${totalDays} dev-days</div></div>
          <div class="card"><div class="lbl">Est. Cost</div><div class="val" style="color:#ea580c;">${fmtINR(totalCostUSD)}</div><div class="sub">At ${fmtINR(devRateUSD)}/dev/day</div></div>
        </div>
        <div class="card" style="background:#f8fafc;"><div class="lbl">Projected Completion</div><div style="font-size:16px;font-weight:700;color:#0891b2;margin-top:4px;">${dateStr}</div><div class="sub">${teamSize}-dev team</div></div>
      </div>
    </div>
  </div>

  <!-- SCORE DISTRIBUTION -->
  <div class="section">
    <h2>PQC Migration Progress — 5 Milestones</h2>
    <div class="grid2">
      <div class="card">${scoreDist}</div>
      <div class="card">
        <div style="font-size:10px;color:#374151;font-weight:600;margin-bottom:10px;">Scoring Criteria (per application)</div>
        ${criteriaLegend}
        <div style="margin-top:8px;font-size:8px;color:#9ca3af;line-height:1.6;">
          Cert key strength dominates the score (70pts) — the primary differentiator between public CDN infrastructure and hardened bank assets.
        </div>
      </div>
    </div>
  </div>

  <hr class="page-break"/>

  <!-- DORA -->
  <div class="section">
    <h2>DORA Regulatory Mapping</h2>
    <table><thead><tr><th>Article</th><th>Requirement</th><th>Description</th><th>Status</th></tr></thead><tbody>${doraRows}</tbody></table>
  </div>

  <hr/>

  <!-- ASSET TABLE -->
  <div class="section">
    <h2>Application Cryptographic Inventory — Ranked by Risk Priority</h2>
    <table>
      <thead><tr>
        <th style="width:22px;">#</th><th>Application</th><th>Type</th><th>Risk</th>
        <th>Key Len</th><th>Cipher Suite</th><th>TLS</th><th>CA</th>
        <th style="text-align:center;">PQC Score</th><th>Days</th><th>Cost (INR)</th>
      </tr></thead>
      <tbody>${assetRows}</tbody>
      <tfoot><tr style="background:#f8fafc;border-top:2px solid #e5e7eb;">
        <td colspan="9" style="padding:7px 10px;font-size:9px;color:#374151;font-weight:700;">TOTALS</td>
        <td style="padding:7px 10px;font-size:9px;color:#0891b2;font-weight:700;text-align:center;">${totalDays}d</td>
        <td style="padding:7px 10px;font-size:9px;color:#ea580c;font-weight:700;text-align:right;">${fmtINRFull(totalCostUSD)}</td>
      </tr></tfoot>
    </table>
    <div style="margin-top:6px;font-size:7px;color:#9ca3af;">
      Score dots (left→right): Cert key · No wildcard · AES-256 · KX group · TLS 1.3 · No CBC &nbsp;|&nbsp; 🟢 pass · 🟡 partial · 🔴 fail
    </div>
  </div>

  <hr/>

  <!-- REMEDIATION -->
  <div class="section">
    <h2>Remediation Actions — Priority Order</h2>
    <div class="grid3">${remCards}</div>
  </div>

  <hr/>

  <!-- SIGN-OFF -->
  <div class="grid3" style="margin-bottom:28px;">
    ${["Prepared by","Reviewed by","Approved by"].map(role=>`
      <div>
        <div style="font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:22px;">${role}</div>
        <div style="border-bottom:1px solid #374151;margin-bottom:5px;"></div>
        <div style="font-size:8px;color:#9ca3af;">Signature &amp; Date</div>
      </div>`).join("")}
  </div>

  <div class="footer">
    REBEL Threat Intelligence Platform · r3bel-production.up.railway.app · Report ID: ${reportId} · ${displayName}
    ${clientDomain?`· Scope: *.${normaliseDomain(clientDomain)}`:""}
    <br/>Confidential — intended solely for the named organisation. · Costs displayed in Indian Rupees (INR).
  </div>

</div>
</body>
</html>`;

  const blob=new Blob([html],{type:"text/html"});
  const url=URL.createObjectURL(blob);
  const win=window.open(url,"_blank");
  if(win)win.focus();
}

// ── Score Gauge ───────────────────────────────────────────────────────────────
function ScoreGauge({ score, size=200 }: { score:number; size?:number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame:number, cur=0;
    const step=()=>{ cur+=(score-cur)*0.07; if(Math.abs(score-cur)<0.3)cur=score; setShown(Math.round(cur)); if(cur!==score)frame=requestAnimationFrame(step); };
    frame=requestAnimationFrame(step); return()=>cancelAnimationFrame(frame);
  },[score]);
  useEffect(() => {
    const c=ref.current; if(!c)return;
    const ctx=c.getContext("2d")!;
    const W=size,H=Math.round(size*0.6),cx=W/2,cy=H+5,r=Math.round(size*0.4);
    c.width=W; c.height=H; ctx.clearRect(0,0,W,H);
    // Track background
    ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,0,false);
    ctx.lineWidth=Math.round(size*0.06); ctx.strokeStyle="#e2e8f0"; ctx.stroke();
    const col=shown>=70?L.green:shown>=40?L.yellow:L.red;
    const safePct = Math.min(0.999, Math.max(0.001, shown/100));
    ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,Math.PI+Math.PI*safePct,false);
    ctx.lineWidth=Math.round(size*0.06); ctx.strokeStyle=col; ctx.lineCap="round";
    ctx.shadowColor=col; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0;
    // Tick marks
    for(let i=0;i<=10;i++){
      const a=Math.PI+(Math.PI*i)/10;
      ctx.beginPath();
      ctx.moveTo(cx+(r-size*0.09)*Math.cos(a),cy+(r-size*0.09)*Math.sin(a));
      ctx.lineTo(cx+(r-size*0.05)*Math.cos(a),cy+(r-size*0.05)*Math.sin(a));
      ctx.strokeStyle="#cbd5e1"; ctx.lineWidth=1; ctx.stroke();
    }
  },[shown,size]);
  const col=shown>=70?L.green:shown>=40?L.yellow:L.red;
  const label=shown>=70?"GOOD":shown>=40?"AT RISK":"CRITICAL";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%"}}>
      <canvas ref={ref} style={{width:"100%",maxWidth:size,height:"auto"}}/>
      <div style={{marginTop:-6,textAlign:"center"}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:Math.round(size*0.18),fontWeight:900,color:col}}>{shown}</div>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:col,letterSpacing:".2em",marginTop:2}}>{label}</div>
        <div style={{fontSize:9,color:L.text3,marginTop:4}}>MIGRATION PROGRESS</div>
      </div>
    </div>
  );
}

// ── Roadmap Card ──────────────────────────────────────────────────────────────
function RoadmapCard({ a, i }: { a:any; i:number }) {
  const [open, setOpen] = useState(false);
  const ps = a.pqcScore as PQCScoreBreakdown|undefined;
  return (
    <div style={{
      borderBottom:`1px solid ${L.borderLight}`,
      background: L.panelBg,
      animation:`fadeIn 0.3s ease both`,
      animationDelay:`${i*0.04}s`,
      transition: "background 0.15s",
    }}
      onMouseEnter={e=>(e.currentTarget.style.background=L.subtleBg)}
      onMouseLeave={e=>(e.currentTarget.style.background=L.panelBg)}
    >
      <div onClick={()=>setOpen(o=>!o)} style={{padding:"10px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0,flex:1}}>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:L.text4,flexShrink:0}}>#{i+1}</span>
          <span style={{fontSize:12,color:L.blue,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{a.app}</span>
          {a.isPublic&&<span style={{fontSize:7,color:L.cyan,border:`1px solid ${L.cyan}55`,borderRadius:2,padding:"1px 4px",flexShrink:0,background:`${L.cyan}10`}}>PUB</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          {ps&&<span style={{fontSize:8,fontWeight:700,color:ps.color,border:`1px solid ${ps.color}55`,borderRadius:2,padding:"1px 5px",background:`${ps.color}10`}}>{ps.active?"ACTIVE":`${ps.score}/100`}</span>}
          <Badge v={riskVariant(a.risk)}>{a.risk}</Badge>
          <span style={{fontSize:10,color:L.text4}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      <div style={{padding:"0 14px 10px",display:"flex",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:9,color:L.text3}}>{a.assetType}</span>
        <span style={{fontSize:9,color:L.cyan,fontWeight:600}}>{a.days}d</span>
        <span style={{fontSize:9,color:L.orange,fontWeight:600}}>{fmtINR(a.cost)}</span>
        <span style={{fontSize:9,color:a.pqc?L.green:L.red,fontWeight:600}}>{a.pqc?"PQC ✓":"PQC ✗"}</span>
      </div>
      {open&&ps&&(
        <div style={{padding:"0 14px 12px",borderTop:`1px solid ${L.borderLight}`,paddingTop:10,background:L.insetBg}}>
          {Object.values(ps.criteria).map((c:any)=>(
            <div key={c.label} style={{display:"flex",alignItems:"center",gap:8,fontSize:9,marginBottom:4}}>
              <span style={{color:c.pass?"#16a34a":c.pts>0?"#b45309":"#dc2626",width:10,fontWeight:700}}>{c.pass?"✓":c.pts>0?"~":"✗"}</span>
              <span style={{color:L.text2,flex:1}}>{c.label}</span>
              <span style={{color:L.text1,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{c.pts}/{c.max}</span>
            </div>
          ))}
          <div style={{fontSize:8,color:L.text3,marginTop:6,fontStyle:"italic"}}>
            {ps.active?"Kyber hybrid active — ACTIVE status confirmed.":ps.score>=70?"Address remaining criteria then deploy Kyber hybrid.":"Significant gaps — fix cert key and wildcard first."}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PQCReadinessPage() {
  const [cbomData,     setCbomData]     = useState<any[]>([]);
  const [assets,       setAssets]       = useState<any[]>([]);
  const [teamSize,     setTeamSize]     = useState(2);
  const [devRate,      setDevRate]      = useState(DEV_RATE_USD); // stored in USD internally
  const [domainInput,  setDomainInput]  = useState("");
  const [activeDomain, setActiveDomain] = useState("");
  const [clientName,   setClientName]   = useState("");

  const bp=useBreakpoint(), isMobile=bp==="mobile", isTablet=bp==="tablet", isDesktop=bp==="desktop";

  useEffect(() => {
    Promise.all([
      fetch(`${API}/cbom`).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/assets`).then(r => r.json()).catch(() => ({ assets: [] })),
    ]).then(([cbom, assetsData]) => {
      const registeredMap: Record<string, any> = {};
      (assetsData?.assets ?? []).forEach((a: any) => {
        if (a.name) registeredMap[a.name] = a;
      });

      const cbomApps: any[] = (cbom.apps ?? []).map((app: any) => {
        const reg = registeredMap[app.app];
        if (!reg) return app;
        return {
          ...app,
          is_wildcard:        reg.is_wildcard        ?? app.is_wildcard,
          criticality:        reg.criticality,
          owner:              reg.owner,
          compliance_scope:   reg.compliance_scope,
          financial_exposure: reg.financial_exposure,
        };
      });

      const cbomDomains = new Set(cbomApps.map((a: any) => a.app));
      const registeredOnly = (assetsData?.assets ?? [])
        .filter((a: any) => a.id && !cbomDomains.has(a.name))
        .map((a: any) => ({
          app:                a.name,
          keylen:             a.keylen             || "—",
          cipher:             a.cipher             || "—",
          tls:                a.tls                || "—",
          ca:                 a.ca                 || "—",
          status:             a.risk === "weak" ? "weak" : "ok",
          pqc:                false,
          pqc_support:        "none",
          key_exchange_group: a.key_exchange_group || null,
          is_wildcard:        a.is_wildcard        ?? null,
          criticality:        a.criticality,
          owner:              a.owner,
          compliance_scope:   a.compliance_scope,
          financial_exposure: a.financial_exposure,
        }));

      const merged = [...cbomApps, ...registeredOnly];
      if (merged.length) setCbomData(merged);
      if (assetsData?.assets?.length) setAssets(assetsData.assets);
    });
  }, []);

  const displayCbom   = cbomData.length ? cbomData   : MOCK_CBOM;
  const displayAssets = assets.length   ? assets     : MOCK_ASSETS;

  const scopedCbom  = activeDomain ? displayCbom.filter((a:any)=>appMatchesDomain(a.app??"",activeDomain)) : displayCbom;
  const uniqueCbom  = scopedCbom.filter((a:any,i:number,arr:any[])=>arr.findIndex((b:any)=>b.app===a.app)===i);

  const withPQCScore = uniqueCbom.map((app:any)=>{
    const analysis = fullAnalysis(app.cipher??"", app.tls??"", app.key_exchange_group??null);
    const ps = pqcReadinessScore(analysis.components, app.tls, app.keylen, app.is_wildcard??false);
    return {...app, analysis, pqcScore:ps};
  });

  // ── Migration Progress Score ──────────────────────────────────────────────
  const n = withPQCScore.length || 1;

  const allCertsStrong = withPQCScore.every((a: any) => {
    const bits = parseInt(String(a.keylen ?? "0").match(/(\d+)/)?.[1] ?? "0", 10);
    return bits >= 4096 || bits === 384;
  });
  const noWildcards = withPQCScore.every((a: any) => a.is_wildcard === false);
  const allAES256 = withPQCScore.every((a: any) => {
    const bulk = a.analysis?.components?.bulkCipher ?? "";
    return bulk === "AES-256-GCM" || bulk === "ChaCha20-Poly1305";
  });
  const allTLS13 = withPQCScore.every((a: any) => normaliseTLS(a.tls) === "1.3");
  const anyKyber = withPQCScore.some((a: any) => a.pqcScore?.active);

  const migrationScore = Math.round(
    (allCertsStrong ? 20 : 0) +
    (noWildcards    ? 20 : 0) +
    (allAES256      ? 20 : 0) +
    (allTLS13       ? 20 : 0) +
    (anyKyber       ? 20 : 0)
  );

  const certStrongPct  = Math.round(withPQCScore.filter((a:any)=>{ const b=parseInt(String(a.keylen??"0").match(/(\d+)/)?.[1]??"0",10); return b>=4096||b===384; }).length/n*100);
  const noWildPct      = Math.round(withPQCScore.filter((a:any)=>a.is_wildcard===false).length/n*100);
  const aes256Pct      = Math.round(withPQCScore.filter((a:any)=>{ const bulk=a.analysis?.components?.bulkCipher??""; return bulk==="AES-256-GCM"||bulk==="ChaCha20-Poly1305"; }).length/n*100);
  const tls13Pct       = Math.round(withPQCScore.filter((a:any)=>normaliseTLS(a.tls)==="1.3").length/n*100);

  const milestones = [
    { label:"All certs RSA-4096 / EC P-384", pct: certStrongPct,  done: allCertsStrong },
    { label:"Zero wildcard certificates",    pct: noWildPct,       done: noWildcards    },
    { label:"AES-256-GCM on all apps",       pct: aes256Pct,       done: allAES256      },
    { label:"TLS 1.2 fully eliminated",      pct: tls13Pct,        done: allTLS13       },
    { label:"Kyber hybrid deployed",         pct: anyKyber?100:0,  done: anyKyber       },
  ];

  const weakApps = withPQCScore.filter((a:any)=>a.status==="weak"||a.status==="WEAK"||!a.pqc||a.keylen?.startsWith("1024"));

  const enriched = weakApps.map((app:any)=>{
    const asset=matchAsset(app.app,displayAssets);
    const assetType=asset?.type??"Other";
    const days=EFFORT[assetType]??3;
    const cost=days*devRate; // USD internally
    const weight=riskWeight(app,asset);
    const risk=riskLabel(weight);
    const isPublic=asset?.type==="Web Apps"||asset?.type==="Web App";
    return {...app,asset,assetType,days,cost,weight,risk,isPublic};
  }).sort((a:any,b:any)=>b.weight-a.weight);

  const total       = withPQCScore.length;
  const pqcReady    = withPQCScore.filter((a:any)=>a.pqc&&a.status!=="weak"&&a.status!=="WEAK").length;
  const totalDays   = enriched.reduce((s:number,a:any)=>s+a.days,0);
  const calDays     = Math.ceil(totalDays/Math.max(teamSize,1));
  const totalCost   = enriched.reduce((s:number,a:any)=>s+a.cost,0); // USD
  const critCount   = enriched.filter((a:any)=>a.risk==="Critical").length;
  const highCount   = enriched.filter((a:any)=>a.risk==="High").length;
  const unmatchedCount = enriched.filter((a:any)=>!a.asset).length;

  const completionDate=new Date(); completionDate.setDate(completionDate.getDate()+calDays);
  const dateStr=completionDate.toLocaleDateString("en-IN",{month:"short",day:"numeric",year:"numeric"});

  function applyDomain(){ setActiveDomain(domainInput.trim()); }
  function clearFilter(){ setDomainInput(""); setActiveDomain(""); setClientName(""); }

  function exportCSV(){
    const rows=[
      ["Priority","App","Asset Type","Risk","Key Length","Cipher","TLS","CA","PQC Score","PQC Label","Days","Cost (INR)","Public","PQC Active"],
      ...enriched.map((a:any,i:number)=>[i+1,a.app,a.assetType,a.risk,a.keylen,a.cipher,a.tls,a.ca,a.pqcScore?.score??0,a.pqcScore?.active?"ACTIVE":a.pqcScore?.label??"—",a.days,fmtINRFull(a.cost),a.isPublic?"Yes":"No",a.pqc?"Yes":"No"])
    ];
    const csv=rows.map((r:any)=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
    const el=document.createElement("a"); el.href=url; el.download=`rebel-pqc-${activeDomain||"all"}.csv`; el.click();
  }

  const gaugeSize=isMobile?160:200;
  const metricCols=isMobile?"1fr 1fr":isTablet?"repeat(3,1fr)":"repeat(5,1fr)";

  // Light-mode badge helper
  const scoreColor = migrationScore>=70?L.green:migrationScore>=40?L.yellow:L.red;

  return (
    <div style={LS.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        input[type=range]{accent-color:${L.blue};}
        input[type=range]::-webkit-slider-thumb{background:${L.blue};}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.border};border-radius:3px;}
      `}</style>

      {/* DOMAIN FILTER */}
      <LPanel>
        <LPanelHeader left="REPORT SCOPE — CLIENT DOMAIN FILTER" />
        <div style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <div>
              <div style={{fontSize:8,color:L.text3,letterSpacing:".12em",marginBottom:5,textTransform:"uppercase",fontWeight:600}}>CLIENT DOMAIN</div>
              <div style={{display:"flex",gap:6}}>
                <input
                  value={domainInput}
                  onChange={e=>setDomainInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&applyDomain()}
                  placeholder="e.g. barclays.com"
                  style={{...LS.input,flex:1}}
                />
                <button style={{...LS.btn,background:`${L.blue}15`,borderColor:`${L.blue}40`,color:L.blue}} onClick={applyDomain}>APPLY</button>
                {activeDomain&&<button style={{...LS.btn}} onClick={clearFilter}>CLEAR</button>}
              </div>
            </div>
            <div>
              <div style={{fontSize:8,color:L.text3,letterSpacing:".12em",marginBottom:5,textTransform:"uppercase",fontWeight:600}}>CLIENT NAME (for PDF)</div>
              <input value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="e.g. Barclays Bank PLC" style={{...LS.input,width:"100%"}}/>
            </div>
          </div>
          {activeDomain&&(
            <div style={{display:"flex",alignItems:"center",gap:10,background:`${L.blue}0a`,border:`1px solid ${L.blue}25`,borderRadius:5,padding:"7px 12px"}}>
              <span style={{fontSize:9,color:L.text3,fontWeight:600}}>ACTIVE SCOPE</span>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:L.blue,fontWeight:600}}>*.{normaliseDomain(activeDomain)}</span>
              <span style={{fontSize:9,color:L.text3,marginLeft:"auto"}}>
                <b style={{color:L.text1}}>{uniqueCbom.length}</b> apps · <b style={{color:L.red}}>{enriched.length}</b> need migration
              </span>
            </div>
          )}
          {activeDomain&&uniqueCbom.length===0&&(
            <div style={{background:`${L.red}0a`,border:`1px solid ${L.red}25`,borderRadius:5,padding:"8px 12px",fontSize:10,color:L.text2}}>
              ⚠ No assets found for <b style={{color:L.red}}>*.{normaliseDomain(activeDomain)}</b>
            </div>
          )}
        </div>
      </LPanel>

      {unmatchedCount>0&&(
        <div style={{background:`${L.yellow}10`,border:`1px solid ${L.yellow}40`,borderRadius:5,padding:"8px 14px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:L.yellow,fontSize:14}}>⚠</span>
          <span style={{fontSize:10,color:L.text2}}>
            <b style={{color:L.yellow}}>{unmatchedCount}</b> asset{unmatchedCount>1?"s":""} unmatched — defaulted to "Other".
          </span>
        </div>
      )}

      {/* METRICS */}
      <div style={{display:"grid",gridTemplateColumns:metricCols,gap:isMobile?8:9}}>
        <LMetricCard label="MIGRATION SCORE" value={`${migrationScore}/100`} sub="Migration progress" color={scoreColor}/>
        <LMetricCard label="NEED MIGRATION" value={enriched.length} sub="Weak assets" color={L.red}/>
        <LMetricCard label="CRITICAL" value={critCount} sub="Immediate action" color={L.red}/>
        <LMetricCard label="EST. DAYS" value={calDays} sub={`${teamSize} dev team`} color={L.cyan}/>
        <div style={isMobile?{gridColumn:"1/-1"}:{}}>
          <LMetricCard label="EST. COST (INR)" value={fmtINR(totalCost)} sub={`At ${fmtINR(devRate)}/day`} color={L.orange}/>
        </div>
      </div>

      {/* SCORE + PLAN */}
      <div style={{display:"grid",gridTemplateColumns:isDesktop?"1fr 1fr":"1fr",gap:isMobile?8:10}}>
        <LPanel>
          <LPanelHeader left="PQC MIGRATION PROGRESS" />
          <div style={{padding:14,display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
            <div style={{width:"100%",maxWidth:gaugeSize+40,margin:"0 auto"}}><ScoreGauge score={migrationScore} size={gaugeSize}/></div>
            {/* Milestone bars */}
            <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>
              {milestones.map(m=>(
                <div key={m.label}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:9,color:m.done?L.green:L.text2,display:"flex",alignItems:"center",gap:5,fontWeight:m.done?600:400}}>
                      <span style={{fontSize:10,color:m.done?L.green:L.text4}}>{m.done?"✓":"○"}</span>{m.label}
                    </span>
                    <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:m.done?L.green:L.text3,fontWeight:600}}>{m.pct}%</span>
                  </div>
                  <div style={{height:4,background:L.insetBg,borderRadius:2,border:`1px solid ${L.border}`}}>
                    <div style={{height:"100%",width:`${m.pct}%`,background:m.done?L.green:m.pct>50?L.yellow:L.orange,borderRadius:2,transition:"width 0.8s ease"}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{width:"100%",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[
                {label:"PQC ACTIVE",val:withPQCScore.filter((a:any)=>a.pqcScore?.active).length,color:L.green},
                {label:"WEAK",      val:enriched.length,                                         color:L.red},
                {label:"IN SCOPE",  val:total,                                                   color:L.blue},
              ].map(item=>(
                <div key={item.label} style={{background:L.subtleBg,border:`1px solid ${L.border}`,borderRadius:5,padding:isMobile?"6px 4px":"8px 6px",textAlign:"center"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:isMobile?16:20,color:item.color,fontWeight:700}}>{item.val}</div>
                  <div style={{fontSize:isMobile?7:8,color:L.text3,marginTop:3,letterSpacing:".08em",fontWeight:600}}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </LPanel>

        <LPanel>
          <LPanelHeader left="MIGRATION PLAN SUMMARY" />
          <div style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"grid",gridTemplateColumns:(isTablet||isDesktop)?"1fr 1fr":"1fr",gap:10}}>
              <div style={{background:L.subtleBg,border:`1px solid ${L.border}`,borderRadius:5,padding:12}}>
                <div style={{fontSize:8,color:L.text3,marginBottom:5,letterSpacing:".12em",textTransform:"uppercase",fontWeight:600}}>ESTIMATED COMPLETION</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:isMobile?13:17,color:L.cyan,fontWeight:700}}>{dateStr}</div>
                <div style={{fontSize:9,color:L.text2,marginTop:4}}>{calDays}d · {totalDays} dev days · {enriched.length} assets</div>
              </div>
              <div style={{background:"#fff5f5",border:`1px solid ${L.red}22`,borderRadius:5,padding:12}}>
                <div style={{fontSize:8,color:L.text3,marginBottom:5,letterSpacing:".12em",textTransform:"uppercase",fontWeight:600}}>TOTAL MIGRATION COST</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:isMobile?13:17,color:L.orange,fontWeight:700}}>{fmtINR(totalCost)}</div>
                <div style={{fontSize:9,color:L.text2,marginTop:4}}>{critCount} critical · {highCount} high · {fmtINR(devRate)}/day</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:(isTablet||isDesktop)?"1fr 1fr":"1fr",gap:12}}>
              {[
                {
                  label:"TEAM SIZE",
                  display:`${teamSize} devs`,
                  min:1, max:10, step:1,
                  val:teamSize,
                  set:(v:number)=>setTeamSize(v),
                  l:"1", r:"10",
                },
                {
                  label:"DEV RATE / DAY (INR)",
                  display:fmtINR(devRate),
                  min:200, max:2000, step:100,
                  val:devRate,
                  set:(v:number)=>setDevRate(v),
                  l:fmtINR(200), r:fmtINR(2000),
                },
              ].map(sl=>(
                <div key={sl.label}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:9,color:L.text3,letterSpacing:".1em",textTransform:"uppercase",fontWeight:600}}>{sl.label}</span>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:L.blue,fontWeight:700}}>{sl.display}</span>
                  </div>
                  <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val}
                    onChange={e=>sl.set(Number(e.target.value))}
                    style={{width:"100%",cursor:"pointer"}}
                  />
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:8,color:L.text4}}>{sl.l}</span>
                    <span style={{fontSize:8,color:L.text4}}>{sl.r}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </LPanel>
      </div>

      {/* RISK DISTRIBUTION */}
      <LPanel>
        <LPanelHeader left="RISK DISTRIBUTION" />
        <div style={{padding:14,display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
          {(["Critical","High","Medium","Low"] as const).map(level=>{
            const count=enriched.filter((a:any)=>a.risk===level).length;
            const pct=enriched.length?Math.round(count/enriched.length*100):0;
            const color=level==="Critical"?L.red:level==="High"?L.orange:level==="Medium"?L.yellow:L.green;
            const bg=level==="Critical"?"#fff5f5":level==="High"?"#fff7ed":level==="Medium"?"#fffbeb":"#f0fdf4";
            return (
              <div key={level} style={{background:bg,border:`1px solid ${color}22`,borderRadius:6,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:9,color,letterSpacing:".12em",fontWeight:700,textTransform:"uppercase"}}>{level}</span>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:15,color,fontWeight:800}}>{count}</span>
                </div>
                <div style={{height:4,background:`${color}20`,borderRadius:2}}>
                  <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:2,transition:"width 0.8s ease"}}/>
                </div>
                <div style={{fontSize:8,color:L.text3,marginTop:6,fontWeight:500}}>
                  {enriched.filter((a:any)=>a.risk===level).reduce((s:number,a:any)=>s+a.days,0)} dev days
                </div>
              </div>
            );
          })}
        </div>
      </LPanel>

      {/* ROADMAP */}
      <LPanel>
        <LPanelHeader left="MIGRATION ROADMAP" right={
          <div style={{display:"flex",gap:6}}>
            <button style={{...LS.btn,fontSize:isMobile?9:11}} onClick={exportCSV}>↓ CSV</button>
            <button
              style={{...LS.btn,fontSize:isMobile?9:11,background:`${L.blue}15`,borderColor:`${L.blue}40`,color:L.blue,fontWeight:700}}
              onClick={()=>exportAuditPDF(enriched,migrationScore,pqcReady,total,totalDays,calDays,totalCost,teamSize,devRate,dateStr,clientName,activeDomain,milestones)}
            >
              {isMobile?"⬡ PDF":"⬡ AUDIT PDF"}
            </button>
          </div>
        }/>
        {/* Mobile card view */}
        <div style={{display:"block"}} className="pqc-show-cards">
          <style>{`@media(min-width:900px){.pqc-show-cards{display:none!important;}}`}</style>
          <div style={{maxHeight:isMobile?400:520,overflowY:"auto"}}>
            {enriched.map((a:any,i:number)=><RoadmapCard key={i} a={a} i={i}/>)}
            {enriched.length===0&&<div style={{padding:24,textAlign:"center",fontSize:10,color:L.green,fontWeight:600}}>✓ No weak assets</div>}
          </div>
        </div>
        {/* Desktop table view */}
        <div style={{display:"none"}} className="pqc-show-table">
          <style>{`@media(min-width:900px){.pqc-show-table{display:block!important;}}`}</style>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
              <thead>
                <tr style={{background:L.subtleBg,borderBottom:`2px solid ${L.border}`}}>
                  {["#","APPLICATION","TYPE","RISK","KEY LEN","CIPHER","TLS","CA","PQC SCORE","DAYS","COST (INR)","PUB","PQC"].map(h=>(
                    <th key={h} style={{padding:"7px 8px",fontSize:8,fontWeight:700,color:L.text3,textTransform:"uppercase",letterSpacing:".08em",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enriched.map((a:any,i:number)=>{
                  const ps=a.pqcScore as PQCScoreBreakdown|undefined;
                  return (
                    <tr key={i} style={{borderBottom:`1px solid ${L.borderLight}`,background:i%2===0?L.panelBg:L.subtleBg}}>
                      <td style={{padding:"7px 8px",fontFamily:"'DM Mono',monospace",fontSize:9,color:L.text4}}>{i+1}</td>
                      <td style={{padding:"7px 8px",color:L.blue,fontSize:10,fontWeight:500}}>{a.app}</td>
                      <td style={{padding:"7px 8px"}}>
                        <span style={{fontSize:8,color:L.text3,background:L.insetBg,border:`1px solid ${L.border}`,borderRadius:3,padding:"1px 5px",fontWeight:600}}>{a.assetType}</span>
                      </td>
                      <td style={{padding:"7px 8px"}}>
                        <span style={{fontSize:8,fontWeight:700,color:a.risk==="Critical"?L.red:a.risk==="High"?L.orange:a.risk==="Medium"?L.yellow:L.green,background:a.risk==="Critical"?"#fef2f2":a.risk==="High"?"#fff7ed":a.risk==="Medium"?"#fffbeb":"#f0fdf4",border:`1px solid ${a.risk==="Critical"?L.red:a.risk==="High"?L.orange:a.risk==="Medium"?L.yellow:L.green}33`,borderRadius:3,padding:"1px 6px"}}>{a.risk}</span>
                      </td>
                      <td style={{padding:"7px 8px",fontSize:10,fontWeight:600,fontFamily:"'DM Mono',monospace",color:a.keylen?.startsWith("1024")?L.red:a.keylen?.startsWith("2048")?L.yellow:L.green}}>{a.keylen}</td>
                      <td style={{padding:"7px 8px",fontSize:9,color:L.text3,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.cipher}</td>
                      <td style={{padding:"7px 8px"}}>
                        <span style={{fontSize:8,fontWeight:600,color:a.tls==="1.0"?L.red:a.tls==="1.2"?L.yellow:L.green}}>TLS {a.tls}</span>
                      </td>
                      <td style={{padding:"7px 8px",fontSize:9,color:L.text3}}>{a.ca}</td>
                      <td style={{padding:"7px 8px",textAlign:"center"}}>
                        {ps&&<span style={{fontSize:8,fontWeight:700,color:ps.color,border:`1px solid ${ps.color}44`,borderRadius:3,padding:"1px 5px",background:`${ps.color}10`}}>{ps.active?"ACTIVE":`${ps.score}/100`}</span>}
                      </td>
                      <td style={{padding:"7px 8px",fontFamily:"'DM Mono',monospace",fontSize:10,color:L.cyan,fontWeight:600}}>{a.days}d</td>
                      <td style={{padding:"7px 8px",fontFamily:"'DM Mono',monospace",fontSize:10,color:L.orange,fontWeight:700}}>{fmtINR(a.cost)}</td>
                      <td style={{padding:"7px 8px",textAlign:"center",fontSize:13}}>{a.isPublic?<span style={{color:L.cyan}}>●</span>:<span style={{color:L.text4}}>○</span>}</td>
                      <td style={{padding:"7px 8px",textAlign:"center",fontSize:13}}>{a.pqc?<span style={{color:L.green}}>✓</span>:<span style={{color:L.red}}>✗</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{padding:"8px 14px",borderTop:`1px solid ${L.borderLight}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,background:L.subtleBg,borderRadius:"0 0 8px 8px"}}>
          <span style={{fontSize:10,color:L.text2}}>
            <b style={{color:L.text1}}>{enriched.length}</b> to migrate ·{" "}
            <b style={{color:L.cyan}}>{totalDays}d</b> dev ·{" "}
            <b style={{color:L.orange}}>{fmtINR(totalCost)}</b>
          </span>
          {!isMobile&&<span style={{fontSize:9,color:L.text3}}>Ranked: public-facing → risk → cost</span>}
        </div>
      </LPanel>

      {/* REMEDIATION */}
      <LPanel>
        <LPanelHeader left="REMEDIATION GUIDE" />
        <div style={{padding:14,display:"grid",gridTemplateColumns:isMobile?"1fr":isTablet?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
          {[
            {
              title:"Upgrade cert key",
              color:L.red, bg:"#fff5f5", border:`${L.red}25`,
              icon:"⬡",
              items:enriched.filter((a:any)=>!(a.pqcScore?.criteria?.certKey4096?.pass)).map((a:any)=>a.app),
              fix:"Deploy RSA-4096 or EC P-384 — 70/100 pts",
            },
            {
              title:"Remove wildcard certs",
              color:L.orange, bg:"#fff7ed", border:`${L.orange}25`,
              icon:"◈",
              items:enriched.filter((a:any)=>a.is_wildcard).map((a:any)=>a.app),
              fix:"Dedicated per-service certificates — 20/100 pts",
            },
            {
              title:"Enable Kyber hybrid",
              color:L.cyan, bg:"#f0f9ff", border:`${L.cyan}25`,
              icon:"◉",
              items:enriched.filter((a:any)=>!a.pqc).map((a:any)=>a.app),
              fix:"X25519+Kyber768 (FIPS 203) → ACTIVE status",
            },
          ].map(section=>(
            <div key={section.title} style={{background:section.bg,border:`1px solid ${section.border}`,borderRadius:6,padding:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontFamily:"'DM Mono',monospace",color:section.color,fontSize:14,flexShrink:0}}>{section.icon}</span>
                <span style={{fontSize:9,color:section.color,letterSpacing:".1em",textTransform:"uppercase",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{section.title}</span>
                <span style={{marginLeft:"auto",fontFamily:"'DM Mono',monospace",fontSize:14,color:section.color,flexShrink:0,fontWeight:800}}>{section.items.length}</span>
              </div>
              <div style={{fontSize:9,color:L.text2,marginBottom:8,lineHeight:1.6,fontWeight:500}}>{section.fix}</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {section.items.slice(0,5).map((app:string,i:number)=>(
                  <div key={i} style={{fontSize:9,color:L.text2,display:"flex",alignItems:"center",gap:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"3px 0",borderTop:`1px solid ${section.border}`}}>
                    <span style={{color:section.color,fontSize:8,flexShrink:0,fontWeight:700}}>▸</span> {app}
                  </div>
                ))}
                {section.items.length>5&&<div style={{fontSize:9,color:L.text3,fontStyle:"italic"}}>+{section.items.length-5} more</div>}
                {section.items.length===0&&<div style={{fontSize:9,color:L.green,fontWeight:600}}>✓ All clear</div>}
              </div>
            </div>
          ))}
        </div>
      </LPanel>
    </div>
  );
}