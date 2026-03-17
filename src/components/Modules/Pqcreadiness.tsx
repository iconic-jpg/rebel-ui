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
  return r === "Critical" ? "red" : r === "High" ? "orange" : r === "Medium" ? "yellow" : "green";
}

// Three-tier breakpoints
function useBreakpoint() {
  const getSize = () => {
    const w = window.innerWidth;
    if (w < 480)  return "mobile"  as const;
    if (w < 900)  return "tablet"  as const;
    return              "desktop" as const;
  };
  const [bp, setBp] = useState(getSize);
  useEffect(() => {
    const h = () => setBp(getSize());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return bp;
}

// ─── Responsive Gauge ─────────────────────────────────────────────────────────
function ScoreGauge({ score, size = 200 }: { score: number; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let frame: number;
    let current = 0;
    const step = () => {
      current += (score - current) * 0.07;
      if (Math.abs(score - current) < 0.3) current = score;
      setDisplayed(Math.round(current));
      if (current !== score) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = size, H = Math.round(size * 0.6);
    const cx = W / 2, cy = H + 5, r = Math.round(size * 0.4);
    c.width  = W;
    c.height = H;
    ctx.clearRect(0, 0, W, H);

    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0, false);
    ctx.lineWidth = Math.round(size * 0.06);
    ctx.strokeStyle = "rgba(59,130,246,0.1)";
    ctx.stroke();

    const pct   = displayed / 100;
    const color = displayed >= 70 ? T.green : displayed >= 40 ? T.yellow : T.red;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * pct, false);
    ctx.lineWidth   = Math.round(size * 0.06);
    ctx.strokeStyle = color;
    ctx.lineCap     = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    for (let i = 0; i <= 10; i++) {
      const angle = Math.PI + (Math.PI * i) / 10;
      const x1 = cx + (r - size * 0.09) * Math.cos(angle);
      const y1 = cy + (r - size * 0.09) * Math.sin(angle);
      const x2 = cx + (r - size * 0.05) * Math.cos(angle);
      const y2 = cy + (r - size * 0.05) * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = "rgba(200,220,255,0.15)";
      ctx.lineWidth   = 1;
      ctx.stroke();
    }
  }, [displayed, size]);

  const color    = displayed >= 70 ? T.green : displayed >= 40 ? T.yellow : T.red;
  const label    = displayed >= 70 ? "GOOD"  : displayed >= 40 ? "AT RISK" : "CRITICAL";
  const numSize  = Math.round(size * 0.18);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%" }}>
      <canvas ref={canvasRef} style={{ width:"100%", maxWidth:size, height:"auto" }} />
      <div style={{ marginTop:-6, textAlign:"center" }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:numSize,
          fontWeight:900, color, textShadow:`0 0 20px ${color}44` }}>{displayed}</div>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color,
          letterSpacing:".2em", marginTop:2 }}>{label}</div>
        <div style={{ fontSize:9, color:T.text3, marginTop:4 }}>PQC READINESS SCORE</div>
      </div>
    </div>
  );
}

// ─── Expandable card for mobile/tablet roadmap ────────────────────────────────
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
            <span style={{ fontSize:7, color:T.cyan, border:`1px solid ${T.cyan}44`,
              borderRadius:2, padding:"1px 4px", flexShrink:0 }}>PUB</span>
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
        <span style={{ fontSize:9, color: a.pqc ? T.green : T.red }}>
          {a.pqc ? "PQC ✓" : "PQC ✗"}
        </span>
      </div>

      {open && (
        <div style={{ padding:"0 14px 12px",
          display:"grid", gridTemplateColumns:"1fr 1fr", gap:6,
          borderTop:`1px solid rgba(59,130,246,0.06)`, paddingTop:10 }}>
          {[
            { label:"KEY LEN", val: a.keylen,
              color: a.keylen?.startsWith("1024") ? T.red : a.keylen?.startsWith("2048") ? T.yellow : T.green },
            { label:"TLS",     val: `TLS ${a.tls}`,
              color: a.tls==="1.0" ? T.red : a.tls==="1.2" ? T.yellow : T.green },
            { label:"CA",      val: a.ca,      color: T.text2 },
            { label:"WEIGHT",  val: a.weight,  color: T.text2 },
          ].map(item => (
            <div key={item.label} style={{ background:"rgba(59,130,246,0.03)",
              borderRadius:3, padding:"6px 8px" }}>
              <div style={{ fontSize:7, color:T.text3, letterSpacing:".1em", marginBottom:3 }}>
                {item.label}
              </div>
              <div style={{ fontSize:10, color:item.color,
                fontFamily:"'Share Tech Mono',monospace" }}>{item.val}</div>
            </div>
          ))}
          <div style={{ gridColumn:"1/-1", fontSize:8, color:T.text3,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {a.cipher}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PQCReadinessPage() {
  const [cbomData, setCbomData] = useState<any[]>([]);
  const [assets,   setAssets]   = useState<any[]>([]);
  const [teamSize, setTeamSize] = useState(2);
  const [devRate,  setDevRate]  = useState(DEV_RATE);
  const bp        = useBreakpoint();
  const isMobile  = bp === "mobile";
  const isTablet  = bp === "tablet";
  const isDesktop = bp === "desktop";

  useEffect(() => {
    fetch(`${API}/cbom`).then(r => r.json()).then(d => {
      if (d.apps?.length) setCbomData(d.apps);
    }).catch(() => {});
    fetch(`${API}/assets`).then(r => r.json()).then(d => {
      if (d.assets?.length) setAssets(d.assets);
    }).catch(() => {});
  }, []);

  const displayCbom   = cbomData.length ? cbomData   : MOCK_CBOM;
  const displayAssets = assets.length   ? assets     : MOCK_ASSETS;

  const weakApps = displayCbom.filter((a: any) =>
    a.status === "weak" || a.status === "WEAK" || !a.pqc || a.keylen?.startsWith("1024")
  );

  const enriched = weakApps.map((app: any) => {
    const asset = displayAssets.find((a: any) =>
      a.name?.toLowerCase().includes(app.app?.split(".")[0]?.toLowerCase()) ||
      app.app?.toLowerCase().includes(a.name?.toLowerCase())
    );
    const assetType = asset?.type || "Other";
    const days      = EFFORT[assetType] ?? 3;
    const cost      = days * devRate;
    const weight    = riskWeight(app, asset);
    const risk      = riskLabel(weight);
    const isPublic  = asset?.type === "Web Apps" || asset?.type === "Web App";
    return { ...app, asset, assetType, days, cost, weight, risk, isPublic };
  }).sort((a, b) => b.weight - a.weight);

  const total         = displayCbom.length;
  const pqcReady      = displayCbom.filter((a: any) => a.pqc && a.status !== "weak" && a.status !== "WEAK").length;
  const rawScore      = total ? Math.round((pqcReady / total) * 100) : 0;
  const penaltySum    = enriched.reduce((s, a) => s + a.weight, 0);
  const maxPenalty    = total * 4.5;
  const weightedScore = Math.max(0, Math.round(rawScore - (penaltySum / maxPenalty) * 30));
  const totalDays     = enriched.reduce((s, a) => s + a.days, 0);
  const calDays       = Math.ceil(totalDays / teamSize);
  const totalCost     = enriched.reduce((s, a) => s + a.cost, 0);
  const critCount     = enriched.filter(a => a.risk === "Critical").length;
  const highCount     = enriched.filter(a => a.risk === "High").length;

  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + calDays);
  const dateStr = completionDate.toLocaleDateString("en-US", {
    month:"short", day:"numeric", year:"numeric"
  });

  function exportRoadmap() {
    const rows = [
      ["Priority","App","Asset Type","Risk","Key Length","Cipher","TLS","CA","Days","Cost ($)","Public Facing"],
      ...enriched.map((a, i) => [
        i+1, a.app, a.assetType, a.risk, a.keylen, a.cipher, a.tls, a.ca,
        a.days, a.cost, a.isPublic ? "Yes":"No"
      ])
    ];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement("a");
    el.href = url; el.download = "rebel-pqc-roadmap.csv"; el.click();
  }

  const gaugeSize   = isMobile ? 160 : isTablet ? 200 : 200;
  const metricCols  = isMobile ? "1fr 1fr" : isTablet ? "repeat(3,1fr)" : "repeat(5,1fr)";

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .pqc-row { animation: fadeIn 0.3s ease both; }
        .pqc-row:hover { background: rgba(59,130,246,0.04) !important; }
        .pqc-show-cards { display: block; }
        .pqc-show-table { display: none; }
        @media (min-width: 900px) {
          .pqc-show-cards { display: none !important; }
          .pqc-show-table { display: block !important; }
        }
      `}</style>

      {/* ── METRICS ── */}
      <div style={{ display:"grid", gridTemplateColumns: metricCols, gap: isMobile ? 8 : 9 }}>
        <MetricCard
          label="READINESS SCORE"
          value={`${weightedScore}/100`}
          sub="Weighted PQC score"
          color={weightedScore >= 70 ? T.green : weightedScore >= 40 ? T.yellow : T.red}
        />
        <MetricCard label="NEED MIGRATION" value={enriched.length} sub="Weak assets"        color={T.red}    />
        <MetricCard label="CRITICAL"       value={critCount}        sub="Immediate action"   color={T.red}    />
        <MetricCard label="EST. DAYS"       value={calDays}          sub={`${teamSize} dev team`} color={T.cyan} />
        <MetricCard
          label="EST. COST"
          value={`$${(totalCost/1000).toFixed(1)}k`}
          sub="At $800/day"
          color={T.orange}
          style={isMobile ? { gridColumn:"1/-1" } : {}}
        />
      </div>

      {/* ── SCORE GAUGE + PLAN ── */}
      <div style={{
        display:"grid",
        gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
        gap: isMobile ? 8 : 10,
      }}>
        <Panel>
          <PanelHeader left="PQC MIGRATION READINESS SCORE" />
          <div style={{ padding:14, display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
            <div style={{ width:"100%", maxWidth: gaugeSize + 40, margin:"0 auto" }}>
              <ScoreGauge score={weightedScore} size={gaugeSize} />
            </div>
            <div style={{ width:"100%", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[
                { label:"PQC READY",  val: pqcReady,        color: T.green },
                { label:"WEAK",       val: enriched.length, color: T.red   },
                { label:"TOTAL APPS", val: total,           color: T.blue  },
              ].map(item => (
                <div key={item.label} style={{
                  background:"rgba(59,130,246,0.04)",
                  border:"1px solid rgba(59,130,246,0.1)",
                  borderRadius:3, padding: isMobile ? "6px 4px" : "8px 6px", textAlign:"center",
                }}>
                  <div style={{ fontFamily:"'Orbitron',monospace",
                    fontSize: isMobile ? 15 : 18, color:item.color }}>{item.val}</div>
                  <div style={{ fontSize: isMobile ? 7 : 8, color:T.text3,
                    marginTop:3, letterSpacing:".08em" }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader left="MIGRATION PLAN SUMMARY" />
          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:12 }}>

            {/* Two stat boxes — side by side on tablet+ */}
            <div style={{
              display:"grid",
              gridTemplateColumns: (isTablet || isDesktop) ? "1fr 1fr" : "1fr",
              gap:10,
            }}>
              <div style={{ background:"rgba(59,130,246,0.04)",
                border:"1px solid rgba(59,130,246,0.1)", borderRadius:3, padding:12 }}>
                <div style={{ fontSize:8, color:T.text3, marginBottom:5, letterSpacing:".12em" }}>
                  ESTIMATED COMPLETION
                </div>
                <div style={{ fontFamily:"'Orbitron',monospace",
                  fontSize: isMobile ? 13 : 17, color:T.cyan }}>{dateStr}</div>
                <div style={{ fontSize:9, color:T.text2, marginTop:4 }}>
                  {calDays}d · {totalDays} dev days · {enriched.length} assets
                </div>
              </div>

              <div style={{ background:"rgba(239,68,68,0.04)",
                border:"1px solid rgba(239,68,68,0.1)", borderRadius:3, padding:12 }}>
                <div style={{ fontSize:8, color:T.text3, marginBottom:5, letterSpacing:".12em" }}>
                  TOTAL MIGRATION COST
                </div>
                <div style={{ fontFamily:"'Orbitron',monospace",
                  fontSize: isMobile ? 13 : 17, color:T.orange }}>
                  ${totalCost.toLocaleString()}
                </div>
                <div style={{ fontSize:9, color:T.text2, marginTop:4 }}>
                  {critCount} critical · {highCount} high · ${devRate}/day
                </div>
              </div>
            </div>

            {/* Sliders — side by side on tablet+ */}
            <div style={{
              display:"grid",
              gridTemplateColumns: (isTablet || isDesktop) ? "1fr 1fr" : "1fr",
              gap:12,
            }}>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:9, color:T.text3, letterSpacing:".12em" }}>TEAM SIZE</span>
                  <span style={{ fontFamily:"'Orbitron',monospace",
                    fontSize:11, color:T.blue }}>{teamSize} devs</span>
                </div>
                <input type="range" min={1} max={10} value={teamSize}
                  onChange={e => setTeamSize(Number(e.target.value))}
                  style={{ width:"100%", accentColor:T.blue, cursor:"pointer" }} />
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:8, color:T.text3 }}>1</span>
                  <span style={{ fontSize:8, color:T.text3 }}>10</span>
                </div>
              </div>

              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:9, color:T.text3, letterSpacing:".12em" }}>DEV RATE / DAY</span>
                  <span style={{ fontFamily:"'Orbitron',monospace",
                    fontSize:11, color:T.blue }}>${devRate}</span>
                </div>
                <input type="range" min={200} max={2000} step={100} value={devRate}
                  onChange={e => setDevRate(Number(e.target.value))}
                  style={{ width:"100%", accentColor:T.blue, cursor:"pointer" }} />
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:8, color:T.text3 }}>$200</span>
                  <span style={{ fontSize:8, color:T.text3 }}>$2000</span>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── RISK DISTRIBUTION ── */}
      <Panel>
        <PanelHeader left="RISK DISTRIBUTION" />
        <div style={{
          padding:14,
          display:"grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)",
          gap:10,
        }}>
          {(["Critical","High","Medium","Low"] as const).map(level => {
            const count = enriched.filter(a => a.risk === level).length;
            const pct   = enriched.length ? Math.round(count / enriched.length * 100) : 0;
            const color = level === "Critical" ? T.red : level === "High" ? T.orange
                        : level === "Medium"   ? T.yellow : T.green;
            return (
              <div key={level} style={{ background:"rgba(59,130,246,0.03)",
                border:`1px solid rgba(59,130,246,0.08)`, borderRadius:3, padding:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:9, color, letterSpacing:".12em" }}>{level.toUpperCase()}</span>
                  <span style={{ fontFamily:"'Orbitron',monospace", fontSize:13, color }}>{count}</span>
                </div>
                <div style={{ height:3, background:"rgba(255,255,255,0.05)", borderRadius:2 }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:color,
                    borderRadius:2, transition:"width 0.8s ease" }} />
                </div>
                <div style={{ fontSize:8, color:T.text3, marginTop:5 }}>
                  {enriched.filter(a => a.risk === level).reduce((s,a) => s+a.days, 0)} dev days
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
            <button style={{ ...S.btn, fontSize: isMobile ? 9 : 11 }} onClick={exportRoadmap}>
              {isMobile ? "↓ CSV" : "↓ EXPORT ROADMAP"}
            </button>
          }
        />

        {/* Expandable card view — mobile & tablet */}
        <div className="pqc-show-cards">
          <div style={{ maxHeight: isMobile ? 400 : 520, overflowY:"auto" }}>
            {enriched.map((a, i) => <RoadmapCard key={i} a={a} i={i} />)}
            {enriched.length === 0 && (
              <div style={{ padding:20, textAlign:"center", fontSize:10, color:T.text3 }}>
                ✓ No assets need migration
              </div>
            )}
          </div>
        </div>

        {/* Full table — desktop */}
        <div className="pqc-show-table">
          <Table cols={["#","APPLICATION","TYPE","RISK","KEY LEN","CIPHER","TLS","CA","DAYS","COST","PUB","PQC"]}>
            {enriched.map((a, i) => (
              <TR key={i} style={{ animationDelay:`${i*0.04}s` } as any}>
                <TD style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color:T.text3 }}>{i+1}</TD>
                <TD style={{ color:T.blue, fontSize:10 }}>{a.app}</TD>
                <TD><Badge v="gray">{a.assetType}</Badge></TD>
                <TD><Badge v={riskVariant(a.risk)}>{a.risk}</Badge></TD>
                <TD style={{ fontSize:10, color: a.keylen?.startsWith("1024") ? T.red
                  : a.keylen?.startsWith("2048") ? T.yellow : T.green }}>{a.keylen}</TD>
                <TD style={{ fontSize:9, color:T.text3, maxWidth:140,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.cipher}</TD>
                <TD><Badge v={a.tls==="1.0"?"red":a.tls==="1.2"?"yellow":"green"}>TLS {a.tls}</Badge></TD>
                <TD style={{ fontSize:9, color:T.text3 }}>{a.ca}</TD>
                <TD style={{ fontFamily:"'Orbitron',monospace", fontSize:10, color:T.cyan }}>{a.days}d</TD>
                <TD style={{ fontFamily:"'Orbitron',monospace", fontSize:10, color:T.orange }}>${a.cost.toLocaleString()}</TD>
                <TD style={{ textAlign:"center", fontSize:12 }}>
                  {a.isPublic ? <span style={{color:T.cyan}}>●</span> : <span style={{color:T.text3}}>○</span>}
                </TD>
                <TD style={{ textAlign:"center", fontSize:13 }}>
                  {a.pqc ? <span style={{color:T.green}}>✓</span> : <span style={{color:T.red}}>✗</span>}
                </TD>
              </TR>
            ))}
          </Table>
        </div>

        <div style={{ padding:"8px 12px", borderTop:`1px solid rgba(59,130,246,0.07)`,
          display:"flex", justifyContent:"space-between", alignItems:"center",
          flexWrap:"wrap", gap:8 }}>
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
        <div style={{
          padding:14,
          display:"grid",
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)",
          gap:10,
        }}>
          {[
            {
              title:"Upgrade key length",
              color: T.red,   icon:"⬡",
              items: enriched.filter(a => a.keylen?.startsWith("1024")).map(a => a.app),
              fix:"Rotate certificates to RSA-4096 or ECDSA-256",
            },
            {
              title:"Replace weak ciphers",
              color: T.orange, icon:"◈",
              items: enriched.filter(a => a.status === "weak" || a.status === "WEAK").map(a => a.app),
              fix:"Migrate to TLS_AES_256_GCM_SHA384",
            },
            {
              title:"Enable PQC algorithms",
              color: T.cyan,  icon:"◉",
              items: enriched.filter(a => !a.pqc).map(a => a.app),
              fix:"Implement CRYSTALS-Kyber or CRYSTALS-Dilithium",
            },
          ].map(section => (
            <div key={section.title} style={{
              background:"rgba(59,130,246,0.03)",
              border:`1px solid ${section.color}22`,
              borderRadius:3, padding:12,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ fontFamily:"'Orbitron',monospace", color:section.color, flexShrink:0 }}>
                  {section.icon}
                </span>
                <span style={{ fontSize:10, color:section.color, letterSpacing:".1em",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {section.title.toUpperCase()}
                </span>
                <span style={{ marginLeft:"auto", fontFamily:"'Orbitron',monospace",
                  fontSize:11, color:section.color, flexShrink:0 }}>
                  {section.items.length}
                </span>
              </div>
              <div style={{ fontSize:9, color:T.text2, marginBottom:8, lineHeight:1.5 }}>
                {section.fix}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {section.items.slice(0,5).map((app, i) => (
                  <div key={i} style={{ fontSize:9, color:T.text3,
                    display:"flex", alignItems:"center", gap:6,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    <span style={{ color:section.color, fontSize:7, flexShrink:0 }}>▸</span> {app}
                  </div>
                ))}
                {section.items.length > 5 && (
                  <div style={{ fontSize:9, color:T.text3 }}>+{section.items.length - 5} more</div>
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