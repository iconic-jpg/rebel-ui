import React, { useState, useEffect, useRef } from "react";
import { T, S, GRID, Panel, PanelHeader, MetricCard, Badge, ProgBar, Table, TR, TD } from "./shared.js";

const API = "https://r3bel-production.up.railway.app";

export default function ReportingPage() {
  const [stats,   setStats]   = useState<any>({});
  const [trend,   setTrend]   = useState<any[]>([]);
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch(`${API}/rating`)
      .then(r => r.json())
      .then(d => {
        setStats(d.stats || {});
        setTrend(d.trend || []);
        setUsers(d.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { drawActivityChart(); }, [trend]);

  function drawActivityChart() {
    const c = chartRef.current; if (!c || !trend.length) return;
    const ctx = c.getContext("2d")!;
    const W = c.offsetWidth || 800, H = 200;
    c.width = W;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#050810"; ctx.fillRect(0, 0, W, H);

    const pad = 32;
    const maxScans = Math.max(...trend.map(t => t.scans), 1);
    const n = trend.length;
    const bw = Math.max(8, Math.floor((W - pad * 2) / n) - 4);
    const stepX = (W - pad * 2) / Math.max(n, 1);

    // Grid
    ctx.strokeStyle = "rgba(59,130,246,0.06)"; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad + ((H - pad * 2) / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    }

    // Bars
    trend.forEach((t, i) => {
      const x = pad + i * stepX + (stepX - bw) / 2;
      const barH = Math.round((t.scans / maxScans) * (H - pad * 2));
      const y = H - barH - pad;
      ctx.fillStyle = T.blue + "22"; ctx.fillRect(x, y, bw, barH);
      ctx.fillStyle = T.blue + "88"; ctx.fillRect(x, y + 3, bw, barH - 3);
      ctx.fillStyle = T.blue;        ctx.fillRect(x, y, bw, 3);
      ctx.fillStyle = T.blue;
      ctx.font = "8px 'Share Tech Mono'"; ctx.textAlign = "center";
      ctx.fillText(String(t.scans), x + bw / 2, y - 4);
    });

    // X labels
    ctx.fillStyle = "rgba(200,220,255,0.25)";
    ctx.font = "7px 'Share Tech Mono'"; ctx.textAlign = "center";
    trend.forEach((t, i) => {
      if (i % 2 === 0) {
        ctx.fillText(t.date.slice(5), pad + i * stepX + stepX / 2, H - 6);
      }
    });
  }

  function exportCSV() {
    fetch(`${API}/api/my-scans`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
    })
      .then(r => r.json())
      .then(d => {
        const rows = [
          ["URL", "Domain", "Risk Score", "Level", "Scanned At"],
          ...(d.scans || []).map((s: any) => [s.url, s.domain, s.risk_score, s.level, s.scanned_at])
        ];
        const csv  = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type:"text/csv" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a"); a.href = url; a.download = "rebel-report.csv"; a.click();
      });
  }

  const total  = stats.total_scans || 0;
  const levels = stats.levels || { Critical:0, High:0, Medium:0, Low:0 };
  const maxUser = Math.max(...users.map(u => u.scans), 1);

  return (
    <div style={S.page}>

      {/* HEADER */}
      <Panel>
        <div style={{ padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color:T.text3, letterSpacing:".15em", marginBottom:4 }}>
              REBEL THREAT INTELLIGENCE
            </div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:18, color:T.text, fontWeight:700 }}>
              SECURITY REPORT
            </div>
            <div style={{ fontSize:10, color:T.text3, marginTop:4 }}>
              Generated: {new Date().toLocaleDateString()} · {total} total scans
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button style={S.btn} onClick={exportCSV}>↓ EXPORT CSV</button>
            <button style={{ ...S.btn, color:T.green, borderColor:`${T.green}44` }}>↓ EXPORT PDF</button>
          </div>
        </div>
      </Panel>

      {/* METRICS */}
      <div style={GRID.g4}>
        <MetricCard label="TOTAL SCANS"   value={total}               sub="All time"      color={T.blue}   />
        <MetricCard label="CRITICAL"      value={levels.Critical || 0} sub="Immediate"    color={T.red}    />
        <MetricCard label="AVG RISK"      value={stats.avg_risk_score || 0} sub="Score"  color={T.orange} />
        <MetricCard label="SAFE SCANS"    value={levels.Low || 0}      sub="Low risk"     color={T.green}  />
      </div>

      {/* ACTIVITY CHART */}
      <Panel>
        <PanelHeader
          left="SCAN ACTIVITY OVER TIME"
          right={<span style={{ fontSize:8, color:T.text3, fontFamily:"'Orbitron',monospace" }}>LAST 14 DAYS</span>}
        />
        <div style={{ padding:"10px 4px 4px" }}>
          {loading ? (
            <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:T.text3 }}>
              Loading activity data...
            </div>
          ) : (
            <canvas ref={chartRef} style={{ width:"100%", height:200, display:"block" }} />
          )}
        </div>
      </Panel>

      {/* USER ACTIVITY */}
      <Panel>
        <PanelHeader left="USER ACTIVITY BREAKDOWN" />
        <div style={{ padding:14, display:"flex", flexDirection:"column", gap:10 }}>
          {users.length === 0 && !loading && (
            <div style={{ fontSize:10, color:T.text3 }}>No user data yet</div>
          )}
          {users.map((u: any, i: number) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:28, height:28, borderRadius:2,
                background:`${T.blue}18`, border:`1px solid ${T.blue}33`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:10, color:T.blue, flexShrink:0, fontFamily:"'Orbitron',monospace" }}>
                {i + 1}
              </div>
              <span style={{ flex:1, fontSize:11, color:T.text2, fontFamily:"Share Tech Mono" }}>{u.user}</span>
              <div style={{ width:120 }}>
                <ProgBar pct={Math.round(u.scans / maxUser * 100)} color={T.blue} />
              </div>
              <span style={{ fontFamily:"'Orbitron',monospace", fontSize:11, color:T.blue, minWidth:40, textAlign:"right" }}>
                {u.scans} scans
              </span>
              <span style={{ fontSize:10, color: u.avg_risk > 70 ? T.red : u.avg_risk > 40 ? T.orange : T.green,
                minWidth:50, textAlign:"right", fontFamily:"'Orbitron',monospace" }}>
                {u.avg_risk} avg
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {/* SCHEDULED SUMMARY */}
      <Panel>
        <PanelHeader left="REPORT SUMMARY" />
        <div style={{ padding:14, display:"flex", flexDirection:"column", gap:12 }}>
          {[
            { label:"Total Scans Performed",    val: total,               color:T.blue   },
            { label:"Critical Findings",         val: levels.Critical || 0, color:T.red   },
            { label:"High Risk Findings",        val: levels.High     || 0, color:T.orange },
            { label:"Medium Risk Findings",      val: levels.Medium   || 0, color:T.yellow },
            { label:"Low Risk / Clean Scans",    val: levels.Low      || 0, color:T.green  },
            { label:"Unique Users",              val: users.length,         color:T.cyan   },
            { label:"Average Risk Score",        val: stats.avg_risk_score || 0, color:T.orange },
            { label:"Overall Security Rating",   val: `${stats.overall_rating || 0}/100`, color: stats.overall_rating >= 70 ? T.green : T.red },
          ].map((row, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"8px 12px", background:"rgba(255,255,255,0.02)", border:`1px solid rgba(59,130,246,0.06)`,
              borderRadius:2 }}>
              <span style={{ fontSize:11, color:T.text2 }}>{row.label}</span>
              <span style={{ fontFamily:"'Orbitron',monospace", fontSize:12, color:row.color }}>{row.val}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}