import React, { useState, useEffect, useRef } from "react";
import {
  Panel, PanelHeader, Badge, ProgBar,
  Table, TR, TD,
} from "./shared.js";
import { Grid } from "antd";
const { useBreakpoint } = Grid;
import {
  parseCipher, fullAnalysis,
  normaliseTLS,
  severityColor, severityVariant,
  pqcReadinessScore,
} from "./cipherAnalysis.js";

import type { CipherAnalysis, CipherFinding, PQCScoreBreakdown } from "./cipherAnalysis.js";

const API = "https://r3bel-production.up.railway.app";
const { useBreakpoint } = Grid;

// ─── LIGHT PALETTE ────────────────────────────────────────────────────────────
const L = {
  accent:       "#0ea5e9",
  accentDark:   "#0284c7",
  accentDim:    "rgba(14,165,233,0.09)",
  accentBorder: "rgba(14,165,233,0.2)",
  text:         "#050d1a",
  textSec:      "#1e293b",
  textDim:      "#334155",
  textMuted:    "#475569",
  textFaint:    "#64748b",
  divider:      "rgba(14,165,233,0.12)",
  panelBg:      "#ffffff",
  pageBg:       "#f1f5f9",
  skeletonBase: "#e2e8f0",
  skeletonShim: "#f1f5f9",
  red:    "#dc2626", orange: "#ea580c",
  yellow: "#ca8a04", green:  "#16a34a",
  cyan:   "#0891b2", blue:   "#1d4ed8",
};

// Chart palette (solid, readable on white canvas)
const CC = {
  green: "#16a34a", blue: "#1d4ed8", cyan: "#0891b2",
  yellow: "#ca8a04", red: "#dc2626", orange: "#ea580c",
};

// ─── SKELETON PRIMITIVES ──────────────────────────────────────────────────────
function Skel({ w = "100%", h = 12, r = 6, style = {} }: {
  w?: string | number; h?: number; r?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: `linear-gradient(90deg, ${L.skeletonBase} 25%, ${L.skeletonShim} 50%, ${L.skeletonBase} 75%)`,
      backgroundSize: "400% 100%",
      animation: "shimmer 1.6s ease infinite",
      flexShrink: 0,
      ...style,
    }} />
  );
}

function MetricSkeleton() {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${L.accentBorder}`,
      borderRadius: 10, padding: "14px 16px",
      boxShadow: "0 1px 4px rgba(14,165,233,0.07)",
    }}>
      <Skel w={60} h={8} style={{ marginBottom: 10 }} />
      <Skel w={48} h={30} r={4} style={{ marginBottom: 8 }} />
      <Skel w={80} h={7} />
    </div>
  );
}

function RowSkeleton({ cols = 10 }: { cols?: number }) {
  return (
    <tr style={{ borderBottom: `1px solid ${L.divider}` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "10px 12px" }}>
          <Skel w={i === 0 ? 120 : i === 1 ? 50 : 70} h={9} />
        </td>
      ))}
    </tr>
  );
}

function CardSkeleton() {
  return (
    <div style={{ padding: "12px 14px", borderBottom: `1px solid ${L.divider}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <Skel w={160} h={11} />
        <Skel w={48} h={11} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <Skel w={50} h={8} r={4} />
        <Skel w={40} h={8} r={4} />
        <Skel w={36} h={8} r={4} />
      </div>
      <Skel w="90%" h={8} />
    </div>
  );
}

function ChartSkeleton({ height = 160 }: { height?: number }) {
  return (
    <div style={{
      height, background: L.skeletonBase, borderRadius: 6,
      animation: "shimmer 1.6s ease infinite",
      backgroundImage: `linear-gradient(90deg, ${L.skeletonBase} 25%, ${L.skeletonShim} 50%, ${L.skeletonBase} 75%)`,
      backgroundSize: "400% 100%",
    }} />
  );
}

// ─── FINDING BADGE ────────────────────────────────────────────────────────────
function FindingBadge({ severity }: { severity: string }) {
  const color = severityColor(severity);
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: ".08em",
      color, border: `1px solid ${color}44`,
      borderRadius: 4, padding: "2px 6px",
      textTransform: "uppercase" as const, flexShrink: 0,
      background: `${color}0d`,
    }}>
      {severity}
    </span>
  );
}

// ─── PQC SCORE BADGE ──────────────────────────────────────────────────────────
function PQCScoreBadge({ score }: { score: PQCScoreBreakdown }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{
        fontSize: 7, fontWeight: 700, letterSpacing: ".07em",
        color: score.color, border: `1px solid ${score.color}44`,
        borderRadius: 4, padding: "2px 6px", background: `${score.color}0d`,
      }}>
        {score.active ? "ACTIVE" : score.label}
      </span>
      {!score.active && (
        <div style={{ width: 48, height: 3, background: L.divider, borderRadius: 2 }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${score.score}%`, background: score.color,
            transition: "width 0.6s ease",
          }} />
        </div>
      )}
      {!score.active && (
        <span style={{ fontSize: 7, color: score.color, fontFamily: "'Orbitron',monospace", fontWeight: 700 }}>
          {score.score}/100
        </span>
      )}
    </div>
  );
}

// ─── PQC SCORE DETAIL ─────────────────────────────────────────────────────────
function PQCScoreDetail({ score }: { score: PQCScoreBreakdown }) {
  const rows = Object.values(score.criteria) as any[];
  return (
    <div style={{
      background: "#f8fafc", border: `1px solid ${score.color}33`,
      borderRadius: 8, padding: 12, marginTop: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 8, color: score.color, letterSpacing: ".12em", fontFamily: "'Orbitron',monospace", fontWeight: 700 }}>
          PQC MIGRATION READINESS
        </span>
        <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 14, color: score.color, fontWeight: 700 }}>
          {score.active ? "ACTIVE" : `${score.score}/100`}
        </span>
      </div>
      {!score.active && (
        <div style={{ height: 4, background: L.divider, borderRadius: 2, marginBottom: 10 }}>
          <div style={{ height: "100%", borderRadius: 2, width: `${score.score}%`, background: score.color, transition: "width 0.8s ease" }} />
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((c: any) => (
          <div key={c.label} style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            borderLeft: `2px solid ${c.pass ? L.green : c.pts > 0 ? L.yellow : "rgba(220,38,38,0.3)"}`,
            paddingLeft: 7,
          }}>
            <span style={{ fontSize: 10, width: 12, flexShrink: 0, marginTop: 1, fontWeight: 700, color: c.pass ? L.green : c.pts > 0 ? L.yellow : L.red }}>
              {c.pass ? "✓" : c.pts > 0 ? "~" : "✗"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
                <span style={{ fontSize: 8, color: L.textDim, fontWeight: 700 }}>{c.label}</span>
                <span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", flexShrink: 0, marginLeft: 8, fontWeight: 700, color: c.pass ? L.green : c.pts > 0 ? L.yellow : L.textMuted }}>
                  {c.pts}/{c.max}
                </span>
              </div>
              <div style={{ fontSize: 7, color: L.textMuted }}>{c.detail}</div>
            </div>
          </div>
        ))}
      </div>
      {!score.active && (
        <div style={{ marginTop: 8, padding: "6px 10px", background: L.accentDim, border: `1px solid ${L.accentBorder}`, borderRadius: 6 }}>
          <span style={{ fontSize: 7.5, color: L.textDim, fontWeight: 500 }}>
            {score.score >= 100
              ? "Classical foundation complete. Deploy CRYSTALS-Kyber (FIPS 203) hybrid to go ACTIVE."
              : score.score >= 70
              ? "Address remaining gaps then deploy X25519+Kyber768 hybrid per NIST FIPS 203."
              : score.score >= 40
              ? "Significant gaps. Upgrade cert key size and enforce AES-256 before planning Kyber deployment."
              : "Not migration-ready. Fix TLS version, cipher suite, and certificate first."}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── CIPHER BREAKDOWN ─────────────────────────────────────────────────────────
function CipherBreakdown({ analysis, compact = false }: { analysis: CipherAnalysis; compact?: boolean }) {
  const { components: c, findings, pqcImpact: pqc } = analysis;
  return (
    <div style={{ background: "#f8fafc", border: `1px solid ${L.accentBorder}`, borderRadius: 8, padding: compact ? 10 : 12, marginTop: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr 1fr" : "repeat(5,1fr)", gap: 6, marginBottom: 10 }}>
        {[
          { label: "Key exchange", val: c.keyExchange    },
          { label: "Auth",         val: c.authentication },
          { label: "Bulk cipher",  val: c.bulkCipher     },
          { label: "MAC",          val: c.mac            },
          { label: "PFS",          val: c.pfs ? "Yes ✓" : "No ✗" },
        ].map(item => (
          <div key={item.label} style={{ background: "#fff", border: `1px solid ${L.divider}`, borderRadius: 6, padding: "5px 8px" }}>
            <div style={{ fontSize: 7, color: L.textMuted, marginBottom: 2, letterSpacing: ".1em", fontFamily: "'Orbitron',monospace", fontWeight: 700 }}>
              {item.label.toUpperCase()}
            </div>
            <div style={{
              fontSize: 9, fontFamily: "'Share Tech Mono',monospace", fontWeight: 600,
              color: item.label === "PFS" ? (c.pfs ? L.green : L.red) : L.textSec,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
            }}>{item.val}</div>
          </div>
        ))}
      </div>

      {(findings as CipherFinding[]).filter(f => f.severity !== "ok").map((f, i) => (
        <div key={i} style={{ borderLeft: `2px solid ${severityColor(f.severity)}`, paddingLeft: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" as const }}>
            <FindingBadge severity={f.severity} />
            <span style={{ fontSize: 9, color: L.textSec, fontWeight: 700 }}>{f.title}</span>
            {!compact && <span style={{ fontSize: 8, color: L.textMuted, marginLeft: "auto" }}>{f.doraArticle}</span>}
          </div>
          <div style={{ fontSize: 8, color: L.textDim, lineHeight: 1.5 }}>{f.description}</div>
          {compact && <div style={{ fontSize: 7, color: L.textMuted, marginTop: 2, fontStyle: "italic" }}>{f.doraArticle}</div>}
          <div style={{ fontSize: 8, color: L.cyan, marginTop: 3, fontWeight: 600 }}>↳ {f.remediation}</div>
        </div>
      ))}

      <div style={{
        background: c.pqcHybrid ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)",
        border: `1px solid ${c.pqcHybrid ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.15)"}`,
        borderRadius: 6, padding: "5px 10px",
      }}>
        <span style={{ fontSize: 7, color: L.textMuted, letterSpacing: ".1em", fontFamily: "'Orbitron',monospace", fontWeight: 700 }}>PQC IMPACT{"  "}</span>
        <span style={{ fontSize: 8, color: L.textSec }}>{pqc}</span>
      </div>
    </div>
  );
}

// ─── APP CARD (mobile/tablet) ─────────────────────────────────────────────────
function AppCard({ d, compact }: { d: any; compact: boolean }) {
  const [open, setOpen] = useState(false);
  const risk     = d.analysis.overallRisk;
  const c        = d.analysis.components;
  const tlsNorm  = normaliseTLS(d.tls);
  const pqcScore = pqcReadinessScore(c, d.tls, d.keylen, d.is_wildcard ?? false);

  return (
    <div style={{ borderBottom: `1px solid ${L.divider}` }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        onMouseEnter={e => (e.currentTarget.style.background = L.accentDim)}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: L.blue, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{d.app}</span>
            <PQCScoreBadge score={pqcScore} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
            <Badge v={tlsNorm === "1.0" ? "red" : tlsNorm === "1.2" ? "yellow" : "green"}>TLS {tlsNorm}</Badge>
            <span style={{ fontSize: 9, fontWeight: 600, color: d.keylen?.startsWith("1024") ? L.red : d.keylen?.startsWith("2048") ? L.yellow : L.green }}>
              {d.keylen}
            </span>
            <span style={{ fontSize: 9, fontWeight: 600, color: c.pfs ? L.green : L.red }}>{c.pfs ? "PFS ✓" : "PFS ✗"}</span>
          </div>
          <div style={{ fontSize: 8, color: L.textMuted, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            <span style={{ color: L.textDim, fontFamily: "'Share Tech Mono',monospace", fontWeight: 600 }}>{c.keyExchange}</span>
            {" · "}
            <span style={{
              color: c.bulkCipher.includes("DES") || c.bulkCipher === "RC4-128" ? L.red
                   : c.bulkCipher.includes("CBC") ? L.orange : L.textDim,
              fontFamily: "'Share Tech Mono',monospace", fontWeight: 600,
            }}>{c.bulkCipher}</span>
            {" · "}{d.ca}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <FindingBadge severity={risk} />
          <span style={{ fontSize: 10, color: L.textMuted }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 14px 12px" }}>
          <PQCScoreDetail score={pqcScore} />
          <CipherBreakdown analysis={d.analysis} compact={compact} />
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function CBOMPage() {
  const klRef          = useRef<HTMLCanvasElement>(null);
  const caRef          = useRef<HTMLCanvasElement>(null);
  const protoRef       = useRef<HTMLCanvasElement>(null);
  const caLegendRef    = useRef<HTMLDivElement>(null);
  const protoLegendRef = useRef<HTMLDivElement>(null);

  const bp        = useBreakpoint();
  const isMobile  = bp === "mobile";
  const isTablet  = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [loading,    setLoading]    = useState(true);
  const [cbomData,   setCbomData]   = useState<any[]>([]);
  const [stats,      setStats]      = useState({ total_apps: 0, weak_crypto: 0, pqc_ready: 0, active_certs: 0 });
  const [cipherData, setCipherData] = useState<any[]>([]);
  const [caData,     setCaData]     = useState<any[]>([]);
  const [protoData,  setProtoData]  = useState<any[]>([]);
  const [keyData,    setKeyData]    = useState<any>({});
  const [expandedRow,setExpandedRow]= useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/cbom`).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/assets`).then(r => r.json()).catch(() => ({ assets: [] })),
    ]).then(([d, assetsData]) => {
      const registeredMap: Record<string, any> = {};
      (assetsData?.assets ?? []).forEach((a: any) => { if (a.name) registeredMap[a.name] = a; });

      const cbomApps: any[] = (d.apps ?? []).map((app: any) => {
        const reg = registeredMap[app.app];
        if (!reg) return app;
        return {
          ...app,
          is_wildcard:        reg.is_wildcard        ?? app.is_wildcard,
          criticality:        reg.criticality,
          owner:              reg.owner,
          owner_email:        reg.owner_email,
          business_unit:      reg.business_unit,
          financial_exposure: reg.financial_exposure,
          compliance_scope:   reg.compliance_scope,
        };
      });

      const cbomDomains = new Set(cbomApps.map((a: any) => a.app));
      const registeredOnly = (assetsData?.assets ?? [])
        .filter((a: any) => a.id && !cbomDomains.has(a.name))
        .map((a: any) => ({
          app: a.name, keylen: a.keylen || "—", cipher: a.cipher || "—",
          tls: a.tls || "—", ca: a.ca || "—",
          status: a.risk === "weak" ? "weak" : "ok",
          pqc: false, pqc_support: "none",
          key_exchange_group: a.key_exchange_group || null,
          is_wildcard: a.is_wildcard ?? null,
          criticality: a.criticality, owner: a.owner,
          owner_email: a.owner_email, business_unit: a.business_unit,
          financial_exposure: a.financial_exposure, compliance_scope: a.compliance_scope,
        }));

      const merged = [...cbomApps, ...registeredOnly];
      if (merged.length) { setCbomData(merged); setStats(d.stats || stats); }

      if (d.cipher_counts?.length) setCipherData(
        d.cipher_counts.map((c: any, i: number) => ({
          name: c.name, count: c.count,
          color: [CC.green, CC.blue, CC.cyan, CC.yellow, CC.red][i] || L.textMuted,
        }))
      );
      if (d.ca_counts?.length) setCaData(
        d.ca_counts.map((c: any, i: number) => ({
          label: c.label, val: c.val,
          color: [CC.blue, CC.cyan, CC.green, CC.yellow][i] || L.textMuted,
        }))
      );
      if (d.proto_counts?.length) setProtoData(
        d.proto_counts.map((p: any) => ({
          label: p.label, val: p.val,
          color: p.label.includes("1.3") ? CC.green
               : p.label.includes("1.2") ? CC.blue
               : p.label.includes("1.1") ? CC.orange : CC.red,
        }))
      );
      setKeyData(d.key_counts || {});
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (!loading) drawKeyLength(); }, [keyData, bp, loading]);
  useEffect(() => { if (!loading) drawCA();         }, [caData, loading]);
  useEffect(() => { if (!loading) drawProto();      }, [protoData, loading]);

  const analysed = cbomData.map((d: any) => ({
    ...d,
    analysis: fullAnalysis(d.cipher ?? "", d.tls ?? "", d.key_exchange_group ?? null),
  }));

  const findingCounts = analysed.reduce(
    (acc: any, a: any) => {
      a.analysis.findings.forEach((f: any) => { acc[f.severity] = (acc[f.severity] || 0) + 1; });
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

  const noPFSCount  = analysed.filter((a: any) => !a.analysis.components.pfs).length;
  const brokenCount = analysed.filter((a: any) =>
    a.analysis.findings.some((f: any) => f.code.startsWith("BROKEN"))
  ).length;

  function drawKeyLength() {
    const canvas = klRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.offsetWidth || 280, H = 160;
    canvas.width = W;
    const bars = [
      { label: "4096",  val: keyData["4096"]  || 0, color: CC.green  },
      { label: "3072",  val: keyData["3072"]  || 0, color: CC.blue   },
      { label: "2048",  val: keyData["2048"]  || 0, color: CC.cyan   },
      { label: "1024",  val: keyData["1024"]  || 0, color: CC.yellow },
      { label: "other", val: keyData["other"] || 0, color: CC.red    },
    ];
    const max  = Math.max(...bars.map(b => b.val), 1);
    const bw   = isMobile ? 22 : 30, gap = isMobile ? 8 : 16;
    const startX = (W - (bars.length * (bw + gap) - gap)) / 2;
    ctx.clearRect(0, 0, W, H);
    // light background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, W, H);
    bars.forEach(b => {
      const x = startX + bars.indexOf(b) * (bw + gap);
      const barH = Math.round((b.val / max) * (H - 34));
      const y = H - barH - 22;
      // bar fill
      ctx.fillStyle = `${b.color}1a`; ctx.fillRect(x, y, bw, barH);
      ctx.fillStyle = `${b.color}88`; ctx.fillRect(x, y + 3, bw, barH - 3);
      ctx.fillStyle = b.color;        ctx.fillRect(x, y, bw, 3);
      // value
      ctx.fillStyle = b.color;
      ctx.font = "bold 9px 'Share Tech Mono'"; ctx.textAlign = "center";
      ctx.fillText(String(b.val), x + bw / 2, y - 4);
      // label
      ctx.fillStyle = "#475569";
      ctx.font = "9px 'Share Tech Mono'";
      ctx.fillText(b.label, x + bw / 2, H - 5);
    });
  }

  function drawDonut(
    canvas: HTMLCanvasElement | null,
    data: { label: string; val: number; color: string }[],
    legendRef: React.RefObject<HTMLDivElement | null>
  ) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = 160, H = 160, cx = 80, cy = 80, r = 55;
    const total = data.reduce((a, d) => a + d.val, 0);
    if (total === 0) return;
    let angle = -Math.PI / 2;
    ctx.clearRect(0, 0, W, H);
    // light bg
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, W, H);
    data.forEach(d => {
      const sweep = 2 * Math.PI * (d.val / total) - 0.04;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, angle, angle + sweep);
      ctx.fillStyle = `${d.color}22`; ctx.fill();
      ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.stroke();
      angle += 2 * Math.PI * (d.val / total);
    });
    // donut hole
    ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc"; ctx.fill();
    // legend
    if (legendRef.current) {
      legendRef.current.innerHTML = data.map(d => `
        <div style="display:flex;align-items:center;gap:7px;">
          <div style="width:8px;height:8px;border-radius:2px;background:${d.color};flex-shrink:0;"></div>
          <span style="font-size:9px;color:#1e293b;flex:1;font-weight:500;">${d.label}</span>
          <span style="font-size:9px;font-family:'Orbitron',monospace;color:${d.color};font-weight:700;">${d.val}</span>
        </div>`).join("");
    }
  }

  function drawCA()    { drawDonut(caRef.current,    caData,    caLegendRef);    }
  function drawProto() { drawDonut(protoRef.current, protoData, protoLegendRef); }

  function exportCSV() {
    const rows = [
      ["Application","Key Length","Cipher Suite","Key Exchange","Auth","Bulk Cipher","MAC","PFS","PQC Hybrid","TLS Version","CA","Overall Risk","DORA Findings","PQC Ready","PQC Impact"],
      ...analysed.map((d: any) => {
        const c = d.analysis.components;
        const findings = d.analysis.findings
          .filter((f: any) => f.severity !== "ok")
          .map((f: any) => `[${f.code}] ${f.title}`).join(" | ");
        return [
          d.app, d.keylen, d.cipher, c.keyExchange, c.authentication,
          c.bulkCipher, c.mac, c.pfs ? "Yes" : "No", c.pqcHybrid ? "Yes" : "No",
          normaliseTLS(d.tls), d.ca, d.analysis.overallRisk.toUpperCase(),
          findings || "Compliant",
          (d.pqc || c.pqcHybrid) ? "Yes" : "No", d.analysis.pqcImpact,
        ];
      }),
    ];
    const csv  = rows.map(r => r.map((v: any) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement("a");
    el.href = url; el.download = "rebel-cbom-full.csv"; el.click();
  }

  const maxCipher  = Math.max(...(cipherData.length ? cipherData : [{ count: 1 }]).map(c => c.count), 1);
  const metricCols = isMobile ? "1fr 1fr" : isTablet ? "repeat(3,1fr)" : "repeat(5,1fr)";
  const chartCols  = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)";

  const panelSt: React.CSSProperties = {
    background: L.panelBg,
    border: `1px solid ${L.accentBorder}`,
    borderRadius: 10,
    boxShadow: "0 1px 4px rgba(14,165,233,0.08), 0 4px 16px rgba(0,0,0,0.04)",
  };

  const phSt: React.CSSProperties = {
    padding: "11px 16px",
    borderBottom: `1px solid ${L.divider}`,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  };

  const sLabelSt: React.CSSProperties = {
    fontFamily: "'Orbitron',monospace", fontSize: 10,
    letterSpacing: "0.15em", color: "#1e3a5f", fontWeight: 700,
    display: "flex", alignItems: "center", gap: 8,
  };

  const btnSt: React.CSSProperties = {
    background: L.accent, border: "none", borderRadius: 6,
    color: "#fff", cursor: "pointer", padding: "5px 13px",
    fontFamily: "'Orbitron',monospace", fontSize: 9,
    letterSpacing: "0.12em", fontWeight: 700,
    boxShadow: `0 2px 8px ${L.accent}44`, transition: "all 0.2s",
  };

  return (
    <div style={{ padding: 20, background: L.pageBg, minHeight: "100vh", fontFamily: "Share Tech Mono", display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.2); border-radius: 2px; }
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes ping { 75%,100% { transform: scale(2.2); opacity: 0; } }
      `}</style>

      {/* ── METRICS ── */}
      <div style={{ display: "grid", gridTemplateColumns: metricCols, gap: isMobile ? 8 : 10 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <MetricSkeleton key={i} />)
        ) : (
          [
            { label: "TOTAL APPS",  value: stats.total_apps || cbomData.length, sub: "Applications",      color: L.blue,   tint: "rgba(29,78,216,0.05)"  },
            { label: "CRITICAL",    value: findingCounts.critical || 0,          sub: "DORA findings",     color: L.red,    tint: "rgba(220,38,38,0.05)"  },
            { label: "NO PFS",      value: noPFSCount,                           sub: "No fwd secrecy",    color: L.orange, tint: "rgba(234,88,12,0.05)"  },
            { label: "WEAK CIPHER", value: stats.weak_crypto || brokenCount,     sub: "Needs remediation", color: L.yellow, tint: "rgba(202,138,4,0.05)"  },
            { label: "PQC READY",   value: stats.pqc_ready || 0,                 sub: "Post-quantum",      color: L.green,  tint: "rgba(22,163,74,0.05)"  },
          ].map((m, i) => (
            <div key={i} style={{
              background: `linear-gradient(135deg,#fff 0%,${m.tint} 100%)`,
              border: `1px solid ${L.accentBorder}`, borderRadius: 10,
              padding: isMobile ? "12px 14px" : "14px 16px",
              boxShadow: "0 1px 4px rgba(14,165,233,0.07)",
              gridColumn: i === 4 && isMobile ? "1/-1" : undefined,
            }}>
              <div style={{ fontSize: 7.5, color: "#1e3a5f", letterSpacing: "0.14em", fontFamily: "'Orbitron',monospace", fontWeight: 700, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontFamily: "'Orbitron',monospace", fontSize: isMobile ? 26 : 32, fontWeight: 700, color: m.color, lineHeight: 1, marginBottom: 4 }}>{m.value}</div>
              <div style={{ fontSize: 8, color: L.textMuted, fontWeight: 500 }}>{m.sub}</div>
            </div>
          ))
        )}
      </div>

      {/* ── FINDING SUMMARY ── */}
      <div style={panelSt}>
        <div style={phSt}>
          <span style={sLabelSt}>
            <div style={{ width: 3, height: 14, background: L.accent, borderRadius: 2 }} />
            DORA ART. 9.4 — LIVE FINDING SUMMARY
          </span>
        </div>
        <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 8 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ background: L.pageBg, borderRadius: 8, padding: 10 }}>
                <Skel w={60} h={8} style={{ marginBottom: 8 }} />
                <Skel w={36} h={20} r={4} style={{ marginBottom: 6 }} />
                <Skel h={3} r={2} style={{ marginBottom: 5 }} />
                <Skel w={80} h={7} />
              </div>
            ))
          ) : (
            (["critical","high","medium","low"] as const).map(sev => {
              const count = findingCounts[sev] || 0;
              const color = severityColor(sev);
              const pct   = Math.min(100, Math.round(count / Math.max(analysed.length, 1) * 100));
              return (
                <div key={sev} style={{
                  background: `${color}08`,
                  border: `1px solid ${color}22`, borderRadius: 8, padding: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 9, color, letterSpacing: ".12em", textTransform: "uppercase" as const, fontFamily: "'Orbitron',monospace", fontWeight: 700 }}>{sev}</span>
                    <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 16, color, fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 3, background: L.divider, borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
                  </div>
                  <div style={{ fontSize: 7.5, color: L.textMuted, marginTop: 5, fontWeight: 500 }}>
                    findings across {analysed.length} apps
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── CHARTS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: chartCols, gap: isMobile ? 8 : 10 }}>
        {/* Key length */}
        <div style={panelSt}>
          <div style={phSt}><span style={sLabelSt}><div style={{ width: 3, height: 14, background: L.accent, borderRadius: 2 }} />KEY LENGTH DISTRIBUTION</span></div>
          <div style={{ padding: 14, background: "#f8fafc" }}>
            {loading ? (
              <ChartSkeleton height={160} />
            ) : (
              <>
                <canvas ref={klRef} style={{ width: "100%", height: 160 }} />
                <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8 }}>
                  {[["4096", CC.green],["3072", CC.blue],["2048", CC.cyan],["1024", CC.yellow],["other", CC.red]].map(([lbl, clr]) => (
                    <div key={lbl} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: clr as string, fontFamily: "'Orbitron',monospace", fontWeight: 700 }}>{lbl}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cipher usage */}
        <div style={panelSt}>
          <div style={phSt}><span style={sLabelSt}><div style={{ width: 3, height: 14, background: L.accent, borderRadius: 2 }} />CIPHER USAGE</span></div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <Skel w={180} h={8} />
                    <Skel w={20} h={8} />
                  </div>
                  <Skel h={4} r={2} />
                </div>
              ))
            ) : (
              cipherData.map(c => {
                const parsed  = parseCipher(c.name);
                const riskCol = !parsed.pfs ? L.red
                  : parsed.bulkCipher.includes("DES") || parsed.bulkCipher === "RC4-128" ? L.red
                  : parsed.bulkCipher.includes("CBC") ? L.orange : L.green;
                return (
                  <div key={c.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flex: 1 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: riskCol, flexShrink: 0 }} />
                        <span style={{ fontSize: 9, color: L.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, fontWeight: 500 }}>{c.name}</span>
                      </div>
                      <span style={{ fontSize: 9, fontFamily: "'Orbitron',monospace", color: c.color, flexShrink: 0, fontWeight: 700 }}>{c.count}</span>
                    </div>
                    <ProgBar pct={Math.round(c.count / maxCipher * 100)} color={riskCol} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Certificate authorities */}
        <div style={{ ...panelSt, gridColumn: isTablet ? "1/-1" : undefined }}>
          <div style={phSt}><span style={sLabelSt}><div style={{ width: 3, height: 14, background: L.accent, borderRadius: 2 }} />TOP CERTIFICATE AUTHORITIES</span></div>
          <div style={{ padding: 14, background: "#f8fafc", display: "flex", gap: isMobile || isTablet ? 16 : 0, flexDirection: isMobile || isTablet ? "row" : "column", alignItems: isMobile || isTablet ? "center" : "stretch" }}>
            {loading ? (
              <div style={{ display: "flex", gap: 16, alignItems: "center", width: "100%" }}>
                <Skel w={110} h={110} r={55} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  {Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={9} />)}
                </div>
              </div>
            ) : (
              <>
                <canvas ref={caRef} width={160} height={160} style={{ display: "block", margin: isMobile || isTablet ? "0" : "0 auto 10px", flexShrink: 0, width: isMobile || isTablet ? 110 : 160, height: isMobile || isTablet ? 110 : 160 }} />
                <div ref={caLegendRef} style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── INVENTORY TABLE ── */}
      <div style={panelSt}>
        <div style={phSt}>
          <span style={sLabelSt}>
            <div style={{ width: 3, height: 14, background: L.accent, borderRadius: 2 }} />
            APPLICATION CRYPTOGRAPHIC INVENTORY
          </span>
          <button style={btnSt} onClick={exportCSV} disabled={loading}>
            {isMobile ? "↓ CSV" : "↓ EXPORT FULL CSV"}
          </button>
        </div>

        {!isDesktop && (
          <div style={{ maxHeight: isMobile ? 420 : 560, overflowY: "auto" }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : analysed.map((d: any, i: number) => <AppCard key={i} d={d} compact={isMobile} />)
            }
          </div>
        )}

        {isDesktop && (
          <>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.7fr 1.1fr 1.1fr 0.5fr 0.7fr 0.9fr 0.8fr 0.9fr 90px", padding: "7px 14px", borderBottom: `1px solid ${L.divider}`, background: L.pageBg }}>
              {["APPLICATION","KEY LEN","KEY EXCHANGE","BULK CIPHER","PFS","TLS VER","CA","OVERALL RISK","PQC",""].map(h => (
                <span key={h} style={{ fontSize: 7.5, color: "#1e3a5f", letterSpacing: "0.14em", fontFamily: "'Orbitron',monospace", fontWeight: 700 }}>{h}</span>
              ))}
            </div>
            <div style={{ maxHeight: 480, overflowY: "auto" }}>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} cols={10} />)
              ) : (
                analysed.map((d: any, i: number) => {
                  const c        = d.analysis.components;
                  const risk     = d.analysis.overallRisk;
                  const isOpen   = expandedRow === i;
                  const tlsNorm  = normaliseTLS(d.tls);
                  const pqcScore = pqcReadinessScore(c, d.tls, d.keylen, d.is_wildcard ?? false);
                  const keyCol   = d.keylen?.startsWith("1024") ? L.red : d.keylen?.startsWith("2048") ? L.yellow : L.green;
                  const bulkCol  = c.bulkCipher.includes("DES") || c.bulkCipher === "RC4-128" ? L.red
                                 : c.bulkCipher.includes("CBC") ? L.orange : L.green;
                  return (
                    <React.Fragment key={i}>
                      <div
                        style={{ display: "grid", gridTemplateColumns: "1.8fr 0.7fr 1.1fr 1.1fr 0.5fr 0.7fr 0.9fr 0.8fr 0.9fr 90px", padding: "9px 14px", borderBottom: `1px solid ${L.divider}`, alignItems: "center", background: isOpen ? L.accentDim : "transparent", transition: "background 0.12s", cursor: "pointer" }}
                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = L.accentDim; }}
                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ fontSize: 10, color: L.blue, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.app}</div>
                        <div style={{ fontSize: 10, color: keyCol, fontWeight: 700 }}>{d.keylen}</div>
                        <div style={{ fontSize: 9, color: c.pfs ? L.cyan : L.red, fontFamily: "'Share Tech Mono',monospace", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.keyExchange}
                          {c.kxSource === "backend" && <span style={{ fontSize: 7, color: L.textMuted, marginLeft: 4 }}>•</span>}
                        </div>
                        <div style={{ fontSize: 9, color: bulkCol, fontFamily: "'Share Tech Mono',monospace", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.bulkCipher}</div>
                        <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700 }}>
                          {c.pfs ? <span style={{ color: L.green }}>✓</span> : <span style={{ color: L.red }}>✗</span>}
                        </div>
                        <div>
                          <Badge v={tlsNorm === "1.0" ? "red" : tlsNorm === "1.1" ? "orange" : tlsNorm === "1.2" ? "yellow" : "green"}>TLS {tlsNorm}</Badge>
                        </div>
                        <div style={{ fontSize: 9, color: L.textDim, fontWeight: 500 }}>{d.ca}</div>
                        <div><Badge v={severityVariant(risk) as any}>{risk.toUpperCase()}</Badge></div>
                        <div style={{ textAlign: "center" }}><PQCScoreBadge score={pqcScore} /></div>
                        <div>
                          <button
                            onClick={() => setExpandedRow(isOpen ? null : i)}
                            style={{ background: L.accentDim, border: `1px solid ${L.accentBorder}`, borderRadius: 6, color: L.accentDark, cursor: "pointer", padding: "3px 9px", fontFamily: "'Orbitron',monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", transition: "all 0.15s" }}
                          >
                            {isOpen ? "▲" : "▼ details"}
                          </button>
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ padding: "0 14px 14px", background: "#fafbfc", borderBottom: `1px solid ${L.divider}` }}>
                          <PQCScoreDetail score={pqcScore} />
                          <CipherBreakdown analysis={d.analysis} compact={false} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </>
        )}

        <div style={{ padding: "8px 14px", borderTop: `1px solid ${L.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 8 }}>
          {loading ? (
            <Skel w={220} h={9} />
          ) : (
            <span style={{ fontSize: 10, color: L.textDim, fontWeight: 500 }}>
              <b style={{ color: L.textSec }}>{analysed.length}</b> apps ·
              <b style={{ color: L.red }}> {findingCounts.critical}</b> critical ·
              <b style={{ color: L.orange }}> {findingCounts.high}</b> high ·
              <b style={{ color: L.red }}> {noPFSCount}</b> without PFS
            </span>
          )}
          {!isMobile && (
            <span style={{ fontSize: 9, color: L.textMuted }}>
              {isDesktop ? "Click ▼ details to expand" : "Tap row to expand"}
            </span>
          )}
        </div>
      </div>

      {/* ── PROTOCOLS ── */}
      <div style={panelSt}>
        <div style={phSt}><span style={sLabelSt}><div style={{ width: 3, height: 14, background: L.accent, borderRadius: 2 }} />ENCRYPTION PROTOCOLS</span></div>
        <div style={{ padding: 14, background: "#f8fafc", display: "flex", gap: 16, alignItems: "center", flexDirection: isMobile ? "column" : "row" }}>
          {loading ? (
            <>
              <Skel w={140} h={140} r={70} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, width: isMobile ? "100%" : "auto" }}>
                {Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={9} />)}
              </div>
            </>
          ) : (
            <>
              <canvas ref={protoRef} width={140} height={140} style={{ width: isMobile ? "100%" : 140, height: 140, maxWidth: 200 }} />
              <div ref={protoLegendRef} style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, width: isMobile ? "100%" : "auto" }} />
            </>
          )}
        </div>
      </div>

    </div>
  );
}