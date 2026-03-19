import React, { useState, useEffect, useRef } from "react";
import {
  T, S, GRID, Panel, PanelHeader, MetricCard, Badge, ProgBar,
  Table, TR, TD, MOCK_CBOM,
} from "./shared.js";

import {
  parseCipher, fullAnalysis,
  normaliseTLS,
  severityColor, severityVariant,
  isECDHEGroup,
} from "./cipherAnalysis.js";

import type { CipherAnalysis, CipherFinding } from "./cipherAnalysis.js";

const API = "https://r3bel-production.up.railway.app";

function isPQCReady(d: any, analysis: any): boolean {
  if (analysis?.components?.pqcHybrid) return true;
  if (d.post_quantum === true)          return true;
  if (d.pqc === true)                   return true;
  return false;
}

const DEFAULT_CIPHERS = [
  { name:"TLS_AES_256_GCM_SHA384",               count:29, color:T.green  },
  { name:"TLS_AES_128_GCM_SHA256",               count:15, color:T.yellow },
  { name:"TLS_RSA_WITH_DES_CBC_SHA",             count:9,  color:T.red    },
  { name:"TLS_RSA_WITH_RC4_128_SHA",             count:4,  color:T.red    },
  { name:"TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384",count:12, color:T.orange },
];

const DEFAULT_CAS = [
  { label:"DigiCert",      val:39, color:T.blue   },
  { label:"Thawte",        val:39, color:T.cyan   },
  { label:"Let's Encrypt", val:12, color:T.green  },
  { label:"COMODO",        val:10, color:T.yellow },
];

const DEFAULT_PROTOCOLS = [
  { label:"TLS 1.3", val:72, color:T.green  },
  { label:"TLS 1.2", val:20, color:T.blue   },
  { label:"TLS 1.1", val:8,  color:T.orange },
  { label:"TLS 1.0", val:2,  color:T.red    },
];

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

function FindingBadge({ severity }: { severity: string }) {
  const color = severityColor(severity);
  return (
    <span style={{
      fontSize: 8, fontWeight: 600, letterSpacing: ".08em",
      color, border: `1px solid ${color}44`,
      borderRadius: 2, padding: "1px 5px",
      textTransform: "uppercase" as const, flexShrink: 0,
    }}>
      {severity}
    </span>
  );
}

// ── Single source of truth for ACTIVE / READY / ✗ ────────────────────────────
function PQCBadge({ c, pqc }: { c: CipherAnalysis["components"]; pqc?: boolean }) {
  if (c.pqcHybrid || pqc === true)
    return <span style={{ fontSize:8, fontWeight:600, color:T.green,
      border:`1px solid ${T.green}44`, borderRadius:2,
      padding:"1px 5px", letterSpacing:".06em" }}>ACTIVE</span>;

  if (isECDHEGroup(c.keyExchange))
    return <span style={{ fontSize:8, fontWeight:600, color:T.yellow,
      border:`1px solid ${T.yellow}44`, borderRadius:2,
      padding:"1px 5px", letterSpacing:".06em" }}>READY</span>;

  return <span style={{ color:T.red, fontSize:13 }}>✗</span>;
}

function CipherBreakdown({
  analysis, compact = false,
}: {
  analysis: CipherAnalysis; compact?: boolean;
}) {
  const { components: c, findings, pqcImpact: pqc } = analysis;
  return (
    <div style={{
      background: "rgba(8,12,20,0.97)",
      border: "1px solid rgba(59,130,246,0.2)",
      borderRadius: 4, padding: compact ? 10 : 12, marginTop: 4,
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: compact ? "1fr 1fr" : "repeat(5,1fr)",
        gap: 6, marginBottom: 10,
      }}>
        {[
          { label:"Key exchange", val: c.keyExchange    },
          { label:"Auth",         val: c.authentication },
          { label:"Bulk cipher",  val: c.bulkCipher     },
          { label:"MAC",          val: c.mac            },
          { label:"PFS",          val: c.pfs ? "Yes ✓" : "No ✗" },
        ].map(item => (
          <div key={item.label} style={{
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.12)",
            borderRadius: 3, padding: "5px 7px",
          }}>
            <div style={{ fontSize:7, color:T.text3, marginBottom:2,
              letterSpacing:".1em" }}>{item.label.toUpperCase()}</div>
            <div style={{
              fontSize: 9,
              color: item.label === "PFS" ? (c.pfs ? T.green : T.red) : T.text2,
              fontFamily: "'Share Tech Mono',monospace",
              fontWeight: item.label === "PFS" ? 600 : 400,
              overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
            }}>{item.val}</div>
          </div>
        ))}
      </div>

      {findings.filter((f: CipherFinding) => f.severity !== "ok")
        .map((f: CipherFinding, i: number) => (
        <div key={i} style={{
          borderLeft: `2px solid ${severityColor(f.severity)}`,
          paddingLeft: 8, marginBottom: 8,
        }}>
          <div style={{ display:"flex", alignItems:"center",
            gap:6, marginBottom:2, flexWrap:"wrap" as const }}>
            <FindingBadge severity={f.severity} />
            <span style={{ fontSize:9, color:T.text2, fontWeight:600 }}>{f.title}</span>
            {!compact && (
              <span style={{ fontSize:8, color:T.text3, marginLeft:"auto" }}>
                {f.doraArticle}
              </span>
            )}
          </div>
          <div style={{ fontSize:8, color:T.text3, lineHeight:1.5 }}>{f.description}</div>
          {compact && (
            <div style={{ fontSize:7, color:T.text3, marginTop:2,
              fontStyle:"italic" }}>{f.doraArticle}</div>
          )}
          <div style={{ fontSize:8, color:T.cyan, marginTop:3 }}>
            ↳ {f.remediation}
          </div>
        </div>
      ))}

      <div style={{
        background: c.pqcHybrid ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
        border: `1px solid ${c.pqcHybrid ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.15)"}`,
        borderRadius: 3, padding: "5px 8px",
      }}>
        <span style={{ fontSize:7, color:T.text3, letterSpacing:".1em" }}>
          PQC IMPACT{"  "}
        </span>
        <span style={{ fontSize:8, color:T.text2 }}>{pqc}</span>
      </div>
    </div>
  );
}

function AppCard({ d, compact }: { d: any; compact: boolean }) {
  const [open, setOpen] = useState(false);
  const risk    = d.analysis.overallRisk;
  const c       = d.analysis.components;
  const tlsNorm = normaliseTLS(d.tls);

  return (
    <div style={{ borderBottom:"1px solid rgba(59,130,246,0.05)" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ padding:"10px 14px", cursor:"pointer",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
            <span style={{ fontSize:11, color:T.blue,
              overflow:"hidden", textOverflow:"ellipsis",
              whiteSpace:"nowrap" as const }}>{d.app}</span>
            <PQCBadge c={c} pqc={d.pqc} />
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const }}>
            <Badge v={tlsNorm==="1.0"?"red":tlsNorm==="1.2"?"yellow":"green"}>
              TLS {tlsNorm}
            </Badge>
            <span style={{ fontSize:9,
              color: d.keylen?.startsWith("1024") ? T.red
                   : d.keylen?.startsWith("2048") ? T.yellow : T.green }}>
              {d.keylen}
            </span>
            <span style={{ fontSize:9, color: c.pfs ? T.green : T.red }}>
              {c.pfs ? "PFS ✓" : "PFS ✗"}
            </span>
          </div>
          <div style={{ fontSize:8, color:T.text3, marginTop:4,
            overflow:"hidden", textOverflow:"ellipsis",
            whiteSpace:"nowrap" as const }}>
            <span style={{ color:T.text2,
              fontFamily:"'Share Tech Mono',monospace" }}>{c.keyExchange}</span>
            {" · "}
            <span style={{
              color: c.bulkCipher.includes("DES") || c.bulkCipher === "RC4-128"
                ? T.red : c.bulkCipher.includes("CBC") ? T.orange : T.text2,
              fontFamily:"'Share Tech Mono',monospace",
            }}>{c.bulkCipher}</span>
            {" · "}{d.ca}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <FindingBadge severity={risk} />
          <span style={{ fontSize:10, color:T.text3 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding:"0 14px 12px" }}>
          <CipherBreakdown analysis={d.analysis} compact={compact} />
        </div>
      )}
    </div>
  );
}

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

  const [cbomData,    setCbomData]    = useState<any[]>([]);
  const [stats,       setStats]       = useState({
    total_apps:0, weak_crypto:0, pqc_ready:0, active_certs:0
  });
  const [cipherData,  setCipherData]  = useState(DEFAULT_CIPHERS);
  const [caData,      setCaData]      = useState(DEFAULT_CAS);
  const [protoData,   setProtoData]   = useState(DEFAULT_PROTOCOLS);
  const [keyData,     setKeyData]     = useState<any>({});
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API}/cbom`)
      .then(r => r.json())
      .then(d => {
        if (d.apps?.length) {
          setCbomData(d.apps);
          setStats(d.stats || stats);
          if (d.cipher_counts?.length) setCipherData(
            d.cipher_counts.map((c: any, i: number) => ({
              name: c.name, count: c.count,
              color: [T.green, T.blue, T.cyan, T.yellow, T.red][i] || T.text3,
            }))
          );
          if (d.ca_counts?.length) setCaData(
            d.ca_counts.map((c: any, i: number) => ({
              label: c.label, val: c.val,
              color: [T.blue, T.cyan, T.green, T.yellow][i] || T.text3,
            }))
          );
          if (d.proto_counts?.length) setProtoData(
            d.proto_counts.map((p: any) => ({
              label: p.label, val: p.val,
              color: p.label.includes("1.3") ? T.green
                   : p.label.includes("1.2") ? T.blue
                   : p.label.includes("1.1") ? T.orange : T.red,
            }))
          );
          setKeyData(d.key_counts || {});
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { drawKeyLength(); }, [keyData, bp]);
  useEffect(() => { drawCA();        }, [caData]);
  useEffect(() => { drawProto();     }, [protoData]);

  const displayData = cbomData.length ? cbomData : MOCK_CBOM;

  const analysed = displayData.map((d: any) => ({
    ...d,
    analysis: fullAnalysis(
      d.cipher             ?? "",
      d.tls                ?? "",
      d.key_exchange_group ?? null
    ),
  }));

  const findingCounts = analysed.reduce(
    (acc: any, a: any) => {
      a.analysis.findings.forEach((f: any) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
      });
      return acc;
    },
    { critical:0, high:0, medium:0, low:0 }
  );

  const noPFSCount  = analysed.filter((a: any) => !a.analysis.components.pfs).length;
  const brokenCount = analysed.filter((a: any) =>
    a.analysis.findings.some((f: any) => f.code.startsWith("BROKEN"))
  ).length;

  function drawKeyLength() {
    const c = klRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = c.offsetWidth || 280, H = 160;
    c.width = W;
    const bars = [
      { label:"4096",  val: keyData["4096"]  || 0, color:T.green  },
      { label:"3072",  val: keyData["3072"]  || 0, color:T.blue   },
      { label:"2048",  val: keyData["2048"]  || 0, color:T.cyan   },
      { label:"1024",  val: keyData["1024"]  || 0, color:T.yellow },
      { label:"other", val: keyData["other"] || 0, color:T.red    },
    ];
    const max = Math.max(...bars.map(b => b.val), 1);
    const bw = isMobile ? 22 : 30;
    const gap = isMobile ? 8 : 16;
    const startX = (W - (bars.length * (bw + gap) - gap)) / 2;
    ctx.clearRect(0, 0, W, H);
    bars.forEach((b) => {
      const x = startX + bars.indexOf(b) * (bw + gap);
      const barH = Math.round((b.val / max) * (H - 30));
      const y = H - barH - 20;
      ctx.fillStyle = b.color + "22"; ctx.fillRect(x, y, bw, barH);
      ctx.fillStyle = b.color + "88"; ctx.fillRect(x, y + 3, bw, barH - 3);
      ctx.fillStyle = b.color;        ctx.fillRect(x, y, bw, 3);
      ctx.fillStyle = b.color;
      ctx.font = "9px 'Share Tech Mono'"; ctx.textAlign = "center";
      ctx.fillText(String(b.val), x + bw / 2, y - 4);
      ctx.fillStyle = "rgba(200,220,255,0.25)";
      ctx.fillText(b.label, x + bw / 2, H - 4);
    });
  }

  function drawDonut(
    canvas: HTMLCanvasElement | null,
    data: {label:string;val:number;color:string}[],
    legendRef: React.RefObject<HTMLDivElement | null>
  ) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = 160, H = 160, cx = 80, cy = 80, r = 55;
    const total = data.reduce((a, d) => a + d.val, 0);
    if (total === 0) return;
    let angle = -Math.PI / 2;
    ctx.clearRect(0, 0, W, H);
    data.forEach(d => {
      const sweep = 2 * Math.PI * (d.val / total) - 0.04;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, angle, angle + sweep);
      ctx.fillStyle = d.color + "33"; ctx.fill();
      ctx.strokeStyle = d.color; ctx.lineWidth = 1.5; ctx.stroke();
      angle += 2 * Math.PI * (d.val / total);
    });
    ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#080c14"; ctx.fill();
    if (legendRef.current) {
      legendRef.current.innerHTML = data.map(d => `
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:8px;height:8px;border-radius:1px;background:${d.color};flex-shrink:0;"></div>
          <span style="font-size:9px;color:${T.text2};flex:1;">${d.label}</span>
          <span style="font-size:9px;font-family:'Orbitron',monospace;color:${d.color};">${d.val}</span>
        </div>`).join("");
    }
  }

  function drawCA()    { drawDonut(caRef.current,    caData,    caLegendRef);    }
  function drawProto() { drawDonut(protoRef.current, protoData, protoLegendRef); }

  function exportCSV() {
    const rows = [
      ["Application","Key Length","Cipher Suite","Key Exchange","KX Source",
       "Auth","Bulk Cipher","MAC","PFS","PQC Hybrid",
       "TLS Version","CA","Overall Risk","DORA Findings","PQC Ready","PQC Impact"],
      ...analysed.map((d: any) => {
        const c = d.analysis.components;
        const findings = d.analysis.findings
          .filter((f: any) => f.severity !== "ok")
          .map((f: any) => `[${f.code}] ${f.title}`)
          .join(" | ");
        return [
          d.app, d.keylen, d.cipher,
          c.keyExchange, c.kxSource,
          c.authentication, c.bulkCipher, c.mac,
          c.pfs ? "Yes" : "No",
          c.pqcHybrid ? "Yes" : "No",
          normaliseTLS(d.tls), d.ca,
          d.analysis.overallRisk.toUpperCase(),
          findings || "Compliant",
          isPQCReady(d, d.analysis) ? "Yes" : "No",
          d.analysis.pqcImpact,
        ];
      })
    ];
    const csv  = rows.map(r => r.map((v: any) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement("a");
    el.href = url; el.download = "rebel-cbom-full.csv"; el.click();
  }

  const maxCipher  = Math.max(...cipherData.map(c => c.count), 1);
  const metricCols = isMobile ? "1fr 1fr" : isTablet ? "repeat(3,1fr)" : "repeat(5,1fr)";
  const chartCols  = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)";

  return (
    <div style={S.page}>

      <div style={{ display:"grid", gridTemplateColumns:metricCols, gap: isMobile ? 8 : 9 }}>
        <MetricCard label="TOTAL APPS"  value={stats.total_apps || displayData.length} sub="Applications"   color={T.blue}   />
        <MetricCard label="CRITICAL"    value={findingCounts.critical || 0}             sub="DORA findings"  color={T.red}    />
        <MetricCard label="NO PFS"      value={noPFSCount}                              sub="No fwd secrecy" color={T.orange} />
        <MetricCard label="WEAK CIPHER" value={stats.weak_crypto || brokenCount}        sub="Needs remediation" color={T.yellow} />
        <div style={isMobile ? { gridColumn:"1/-1" } : {}}>
          <MetricCard label="PQC READY" value={stats.pqc_ready || 0}                   sub="Post-quantum"   color={T.green}  />
        </div>
      </div>

      <Panel>
        <PanelHeader left="DORA ART. 9.4 — LIVE FINDING SUMMARY" />
        <div style={{ padding:"10px 14px", display:"grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap:8 }}>
          {(["critical","high","medium","low"] as const).map(sev => {
            const count = findingCounts[sev] || 0;
            const color = severityColor(sev);
            const pct   = Math.min(100, Math.round(count / Math.max(analysed.length, 1) * 100));
            return (
              <div key={sev} style={{ background:"rgba(59,130,246,0.03)",
                border:`1px solid ${color}22`, borderRadius:3, padding:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:9, color, letterSpacing:".12em",
                    textTransform:"uppercase" as const }}>{sev}</span>
                  <span style={{ fontFamily:"'Orbitron',monospace", fontSize:14, color }}>{count}</span>
                </div>
                <div style={{ height:3, background:"rgba(255,255,255,0.05)", borderRadius:2 }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:color,
                    borderRadius:2, transition:"width 0.8s ease" }}/>
                </div>
                <div style={{ fontSize:7, color:T.text3, marginTop:4 }}>
                  findings across {analysed.length} apps
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div style={{ display:"grid", gridTemplateColumns:chartCols, gap: isMobile ? 8 : 10 }}>
        <Panel>
          <PanelHeader left="KEY LENGTH DISTRIBUTION" />
          <div style={{ padding:14 }}>
            <canvas ref={klRef} style={{ width:"100%", height:160 }} />
            <div style={{ display:"flex", justifyContent:"space-around", marginTop:8 }}>
              {[["4096",T.green],["3072",T.blue],["2048",T.cyan],
                ["1024",T.yellow],["other",T.red]].map(([lbl,clr]) => (
                <div key={lbl} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:clr as string,
                    fontFamily:"'Orbitron',monospace" }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader left="CIPHER USAGE" />
          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:9 }}>
            {cipherData.map(c => {
              const parsed  = parseCipher(c.name);
              const riskCol = !parsed.pfs ? T.red
                : parsed.bulkCipher.includes("DES") || parsed.bulkCipher === "RC4-128" ? T.red
                : parsed.bulkCipher.includes("CBC") ? T.orange : T.green;
              return (
                <div key={c.name}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    marginBottom:3, gap:6 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5, minWidth:0, flex:1 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%",
                        background:riskCol, flexShrink:0 }}/>
                      <span style={{ fontSize:9, color:T.text3, overflow:"hidden",
                        textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize:9, fontFamily:"'Orbitron',monospace",
                      color:c.color, flexShrink:0 }}>{c.count}</span>
                  </div>
                  <ProgBar pct={Math.round(c.count / maxCipher * 100)} color={riskCol} />
                </div>
              );
            })}
          </div>
        </Panel>

        <div style={isTablet ? { gridColumn:"1/-1" } : {}}>
          <Panel>
            <PanelHeader left="TOP CERTIFICATE AUTHORITIES" />
            <div style={{ padding:14, display:"flex",
              gap: (isMobile||isTablet) ? 16 : 0,
              flexDirection: (isMobile||isTablet) ? "row" : "column",
              alignItems: (isMobile||isTablet) ? "center" : "stretch" }}>
              <canvas ref={caRef} width={160} height={160}
                style={{ display:"block",
                  margin: (isMobile||isTablet) ? "0" : "0 auto 10px",
                  flexShrink:0,
                  width:  (isMobile||isTablet) ? 110 : 160,
                  height: (isMobile||isTablet) ? 110 : 160 }} />
              <div ref={caLegendRef} style={{ display:"flex", flexDirection:"column", gap:5, flex:1 }} />
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelHeader
          left="APPLICATION CRYPTOGRAPHIC INVENTORY"
          right={
            <button style={{ ...S.btn, fontSize: isMobile ? 9 : 11 }} onClick={exportCSV}>
              {isMobile ? "↓ CSV" : "↓ EXPORT FULL CSV"}
            </button>
          }
        />

        {!isDesktop && (
          <div style={{ maxHeight: isMobile ? 420 : 560, overflowY:"auto" }}>
            {analysed.map((d: any, i: number) => (
              <AppCard key={i} d={d} compact={isMobile} />
            ))}
          </div>
        )}

        {isDesktop && (
          <Table cols={[
            "APPLICATION","KEY LEN","KEY EXCHANGE","BULK CIPHER",
            "PFS","TLS VER","CA","OVERALL RISK","PQC",""
          ]}>
            {analysed.map((d: any, i: number) => {
              const c       = d.analysis.components;
              const risk    = d.analysis.overallRisk;
              const isOpen  = expandedRow === i;
              const tlsNorm = normaliseTLS(d.tls);
              const keyCol  = d.keylen?.startsWith("1024") ? T.red
                            : d.keylen?.startsWith("2048") ? T.yellow : T.green;
              const bulkCol = c.bulkCipher.includes("DES") || c.bulkCipher === "RC4-128"
                            ? T.red : c.bulkCipher.includes("CBC") ? T.orange : T.green;
              return (
                <React.Fragment key={i}>
                  <TR>
                    <TD style={{ color:T.blue, fontSize:10 }}>{d.app}</TD>
                    <TD style={{ fontSize:10, color:keyCol }}>{d.keylen}</TD>
                    <TD style={{ fontSize:9, color: c.pfs ? T.cyan : T.red,
                      fontFamily:"'Share Tech Mono',monospace" }}>
                      {c.keyExchange}
                      {c.kxSource === "backend" && (
                        <span style={{ fontSize:7, color:T.text3, marginLeft:4 }}>•</span>
                      )}
                    </TD>
                    <TD style={{ fontSize:9, color:bulkCol,
                      fontFamily:"'Share Tech Mono',monospace",
                      maxWidth:120, overflow:"hidden", textOverflow:"ellipsis",
                      whiteSpace:"nowrap" as const }}>
                      {c.bulkCipher}
                    </TD>
                    <TD style={{ textAlign:"center", fontSize:13 }}>
                      {c.pfs ? <span style={{color:T.green}}>✓</span>
                              : <span style={{color:T.red}}>✗</span>}
                    </TD>
                    <TD>
                      <Badge v={tlsNorm==="1.0"?"red":tlsNorm==="1.1"?"orange":tlsNorm==="1.2"?"yellow":"green"}>
                        TLS {tlsNorm}
                      </Badge>
                    </TD>
                    <TD style={{ fontSize:9, color:T.text3 }}>{d.ca}</TD>
                    <TD>
                      <Badge v={severityVariant(risk) as any}>{risk.toUpperCase()}</Badge>
                    </TD>
                    <TD style={{ textAlign:"center" }}>
                      <PQCBadge c={c} pqc={d.pqc} />
                    </TD>
                    <TD>
                      <button onClick={() => setExpandedRow(isOpen ? null : i)}
                        style={{ ...S.btn, fontSize:9, padding:"2px 7px" }}>
                        {isOpen ? "▲" : "▼ details"}
                      </button>
                    </TD>
                  </TR>
                  {isOpen && (
                    <TR>
                      <td colSpan={10} style={{ padding:"0 12px 12px" }}>
                        <CipherBreakdown analysis={d.analysis} compact={false} />
                      </td>
                    </TR>
                  )}
                </React.Fragment>
              );
            })}
          </Table>
        )}

        <div style={{ padding:"8px 12px", borderTop:`1px solid rgba(59,130,246,0.07)`,
          display:"flex", justifyContent:"space-between",
          alignItems:"center", flexWrap:"wrap" as const, gap:8 }}>
          <span style={{ fontSize:10, color:T.text3 }}>
            <b style={{color:T.text2}}>{analysed.length}</b> apps ·
            <b style={{color:T.red}}> {findingCounts.critical}</b> critical ·
            <b style={{color:T.orange}}> {findingCounts.high}</b> high ·
            <b style={{color:T.red}}> {noPFSCount}</b> without PFS
          </span>
          {!isMobile && (
            <span style={{ fontSize:9, color:T.text3 }}>
              {isDesktop ? "Click ▼ details to expand" : "Tap row to expand"}
            </span>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader left="ENCRYPTION PROTOCOLS" />
        <div style={{ padding:14, display:"flex", gap:16, alignItems:"center",
          flexDirection: isMobile ? "column" : "row" }}>
          <canvas ref={protoRef} width={140} height={140}
            style={{ width: isMobile ? "100%" : 140, height:140, maxWidth:200 }} />
          <div ref={protoLegendRef} style={{ display:"flex", flexDirection:"column", gap:9,
            flex:1, width: isMobile ? "100%" : "auto" }} />
        </div>
      </Panel>

    </div>
  );
}