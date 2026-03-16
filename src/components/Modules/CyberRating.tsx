import React, { useState, useEffect, useRef } from "react";
import { T, S, GRID, Panel, PanelHeader, MetricCard, Badge, ProgBar, Table, TR, TD } from "./shared.js";

const API = "https://r3bel-production.up.railway.app";

function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

export default function CyberRatingPage() {
  const [stats,   setStats]   = useState<any>({});
  const [trend,   setTrend]   = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const trendRef              = useRef<HTMLCanvasElement>(null);
  const mobile                = useMobile();

  useEffect(() => {
    fetch(`${API}/rating`)
      .then(r => r.json())
      .then(d => {
        setStats(d.stats || {});
        setTrend(d.trend || []);
        setDomains(d.domains || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { drawTrend(); }, [trend, mobile]);

  function drawTrend() {
    const c = trendRef.current; if (!c || !trend.length) return;
    const ctx = c.getContext("2d")!;
    const W = c.offsetWidth || 800, H = mobile ? 140 : 180;
    c.width = W; c.height = H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#050810"; ctx.fillRect(0, 0, W, H);

    const pad = mobile ? 20 : 32;
    const maxRisk  = Math.max(...trend.map(t => t.avg_risk), 1);
    const maxScans = Math.max(...trend.map(t => t.scans), 1);
    const n = trend.length;
    const stepX = (W - pad * 2) / Math.max(n - 1, 1);

    ctx.strokeStyle = "rgba(59,130,246,0.06)"; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad + ((H - pad * 2) / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    }

    ctx.beginPath();
    trend.forEach((t, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - t.avg_risk / maxRisk) * (H - pad * 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = T.red; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.beginPath();
    trend.forEach((t, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - t.scans / maxScans) * (H - pad * 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = T.blue; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.fillStyle = "rgba(200,220,255,0.25)";
    ctx.font = `${mobile ? 7 : 8}px 'Share Tech Mono'`; ctx.textAlign = "center";
    trend.forEach((t, i) => {
      if (i % (mobile ? 3 : 2) === 0) {
        ctx.fillText(t.date.slice(5), pad + i * stepX, H - 4);
      }
    });
  }

  const rating  = stats.overall_rating || 0;
  const levels  = stats.levels || { Critical:0, High:0, Medium:0, Low:0 };
  const total   = stats.total_scans || 0;
  const rColor  = rating >= 70 ? T.green : rating >= 40 ? T.yellow : T.red;
  const rLabel  = rating >= 70 ? "GOOD" : rating >= 40 ? "FAIR" : "POOR";

  const riskVariant = (l: string): any =>
    l==="Critical"?"red":l==="High"?"orange":l==="Medium"?"yellow":"green";

  return (
    <div style={S.page}>

      {/* SCORE HEADER */}
      <Panel style={{ background:"linear-gradient(135deg,rgba(59,130,246,0.06) 0%,transparent 100%)" }}>
        <div style={{ padding: mobile ? "16px 16px" : "20px 24px",
          display:"flex", gap: mobile ? 16 : 32,
          alignItems:"center", flexWrap:"wrap" }}>

          {/* Score + arc side by side on mobile */}
          <div style={{ display:"flex", gap:16, alignItems:"center", flex: mobile ? "1 1 100%" : "unset" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize: mobile ? 7 : 9,
                color:T.text3, letterSpacing:".15em", marginBottom:6 }}>
                OVERALL SECURITY RATING
              </div>
              <div style={{ display:"flex", alignItems:"baseline", gap: mobile ? 6 : 10 }}>
                <span style={{ fontFamily:"'Orbitron',monospace",
                  fontSize: mobile ? 48 : 64, fontWeight:900, color:rColor,
                  textShadow:`0 0 30px ${rColor}66`, lineHeight:1 }}>
                  {rating}
                </span>
                <span style={{ fontFamily:"'Orbitron',monospace", fontSize: mobile ? 14 : 20, color:T.text2 }}>/100</span>
                <Badge v={rating >= 70 ? "green" : rating >= 40 ? "yellow" : "red"}>{rLabel}</Badge>
              </div>
              <div style={{ fontSize:11, color:T.text3, marginTop:6 }}>Based on {total} scans</div>
            </div>

            {/* SVG arc — always visible */}
            <svg width={mobile ? 100 : 140} height={mobile ? 100 : 140}
              viewBox="0 0 140 140" style={{ flexShrink:0 }}>
              <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12"/>
              <circle cx="70" cy="70" r="54" fill="none" stroke={rColor} strokeWidth="12"
                strokeDasharray={`${rating * 3.39} 339`} strokeLinecap="round"
                transform="rotate(-90 70 70)"
                style={{ filter:`drop-shadow(0 0 8px ${rColor}66)`, transition:"stroke-dasharray 1s ease" }}/>
              <text x="70" y="66" textAnchor="middle" fill={rColor}
                fontFamily="Orbitron,monospace" fontSize="20" fontWeight="700">{rating}</text>
              <text x="70" y="83" textAnchor="middle" fill="rgba(200,220,255,0.35)"
                fontFamily="Share Tech Mono" fontSize="8">{rLabel}</text>
            </svg>
          </div>

          {/* Risk breakdown bars */}
          <div style={{ flex:1, minWidth: mobile ? "100%" : 200 }}>
            {[
              { label:"Critical", val: levels.Critical, color:T.red    },
              { label:"High",     val: levels.High,     color:T.orange },
              { label:"Medium",   val: levels.Medium,   color:T.yellow },
              { label:"Low",      val: levels.Low,      color:T.green  },
            ].map(row => (
              <div key={row.label} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:10, color:T.text3 }}>{row.label}</span>
                  <span style={{ fontSize:10, color:row.color, fontFamily:"'Orbitron',monospace" }}>{row.val}</span>
                </div>
                <ProgBar pct={total ? Math.round(row.val / total * 100) : 0} color={row.color} />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* METRICS */}
      <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 8 : 9 }}>
        <MetricCard label="TOTAL SCANS" value={total}                    sub="All time"      color={T.blue}   />
        <MetricCard label="AVG RISK"    value={stats.avg_risk_score || 0} sub="Risk score"   color={T.orange} />
        <MetricCard label="CRITICAL"    value={levels.Critical || 0}      sub="High priority" color={T.red}   />
        <MetricCard label="LOW RISK"    value={levels.Low || 0}           sub="Safe scans"   color={T.green}  />
      </div>

      {/* TREND CHART */}
      <Panel>
        <PanelHeader
          left="SCAN HISTORY TREND"
          right={
            <div style={{ display:"flex", gap: mobile ? 8 : 12 }}>
              {[["AVG RISK", T.red], ["SCANS", T.blue]].map(([l, c]) => (
                <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:14, height:2, background:c as string }} />
                  <span style={{ fontSize:7.5, color:"rgba(200,220,255,0.3)", letterSpacing:".12em" }}>{l}</span>
                </div>
              ))}
            </div>
          }
        />
        <div style={{ padding:"10px 4px 4px" }}>
          {loading ? (
            <div style={{ height: mobile ? 140 : 180, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:10, color:T.text3 }}>
              Loading trend data...
            </div>
          ) : (
            <canvas ref={trendRef} style={{ width:"100%", height: mobile ? 140 : 180, display:"block" }} />
          )}
        </div>
      </Panel>

      {/* DOMAIN BREAKDOWN */}
      <Panel>
        <PanelHeader left="RISK BREAKDOWN BY DOMAIN" />
        {mobile ? (
          <div style={{ maxHeight:300, overflowY:"auto" }}>
            {domains.map((d: any, i: number) => (
              <div key={i} style={{ padding:"10px 14px", borderBottom:`1px solid rgba(59,130,246,0.05)` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:11, color:T.blue }}>{d.domain}</span>
                  <Badge v={riskVariant(d.level)}>{d.level}</Badge>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ flex:1 }}>
                    <ProgBar pct={d.avg_risk} color={d.avg_risk > 70 ? T.red : d.avg_risk > 40 ? T.orange : T.green} />
                  </div>
                  <span style={{ fontSize:10, fontFamily:"'Orbitron',monospace",
                    color: d.avg_risk > 70 ? T.red : d.avg_risk > 40 ? T.orange : T.green }}>
                    {d.avg_risk}
                  </span>
                  <span style={{ fontSize:9, color:T.text3 }}>{d.scans} scans</span>
                </div>
              </div>
            ))}
            {domains.length === 0 && !loading && (
              <div style={{ padding:14, fontSize:10, color:T.text3 }}>No scan data yet</div>
            )}
          </div>
        ) : (
          <Table cols={["DOMAIN","SCANS","AVG RISK SCORE","RISK LEVEL"]}>
            {domains.map((d: any, i: number) => (
              <TR key={i}>
                <TD style={{ fontSize:10, color:T.blue }}>{d.domain}</TD>
                <TD style={{ fontSize:10, color:T.text2 }}>{d.scans}</TD>
                <TD>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:80 }}>
                      <ProgBar pct={d.avg_risk} color={d.avg_risk > 70 ? T.red : d.avg_risk > 40 ? T.orange : T.green} />
                    </div>
                    <span style={{ fontSize:10, fontFamily:"'Orbitron',monospace",
                      color: d.avg_risk > 70 ? T.red : d.avg_risk > 40 ? T.orange : T.green }}>
                      {d.avg_risk}
                    </span>
                  </div>
                </TD>
                <TD><Badge v={riskVariant(d.level)}>{d.level}</Badge></TD>
              </TR>
            ))}
            {domains.length === 0 && !loading && (
              <TR><TD style={{ color:T.text3, fontSize:10 }}>No scan data yet</TD></TR>
            )}
          </Table>
        )}
      </Panel>

      {/* VULNERABILITY SUMMARY */}
      <Panel>
        <PanelHeader left="VULNERABILITY SUMMARY" />
        <div style={{ padding:14, display:"flex", flexDirection:"column", gap:10 }}>
          {[
            { label:"Critical Risk Scans", val: levels.Critical || 0, color:T.red,    icon:"☢" },
            { label:"High Risk Scans",     val: levels.High     || 0, color:T.orange, icon:"⚠" },
            { label:"Medium Risk Scans",   val: levels.Medium   || 0, color:T.yellow, icon:"◈" },
            { label:"Low Risk Scans",      val: levels.Low      || 0, color:T.green,  icon:"✓" },
          ].map(row => (
            <div key={row.label} style={{ display:"flex", alignItems:"center", gap: mobile ? 8 : 12 }}>
              <div style={{ width:28, height:28, borderRadius:2,
                background:`${row.color}18`, border:`1px solid ${row.color}33`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:12, color:row.color, flexShrink:0 }}>
                {row.icon}
              </div>
              <span style={{ flex:1, fontSize: mobile ? 10 : 11, color:T.text2 }}>{row.label}</span>
              <div style={{ width: mobile ? 80 : 120 }}>
                <ProgBar pct={total ? Math.round(row.val / total * 100) : 0} color={row.color} />
              </div>
              <span style={{ fontFamily:"'Orbitron',monospace", fontSize:12, color:row.color,
                minWidth:32, textAlign:"right" }}>
                {row.val}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}