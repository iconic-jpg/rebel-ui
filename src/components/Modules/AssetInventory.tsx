import React, { useState, useEffect, useRef } from "react";
import {
  API, T, S, GRID, Panel, PanelHeader, MetricCard, Badge, ProgBar,
  Table, TR, TD, Pulse, MOCK_ASSETS,
} from "./shared.js";

type Asset = typeof MOCK_ASSETS[0];

export default function AssetInventoryPage() {
    const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const typeRef  = useRef<HTMLCanvasElement>(null);
  const riskRef  = useRef<HTMLCanvasElement>(null);
  const [riskCounts, setRiskCounts] = useState({ Critical: 0, High: 0, Medium: 0, Low: 0 });
    const [certBuckets, setCertBuckets] = useState({ "0-30": 0, "30-60": 0, "60-90": 0, "90+": 0 });
    const [byType, setByType] = useState({ "Web Apps": 0, APIs: 0, Servers: 0, LB: 0, Other: 0 });

  const filtered = assets.filter(a =>
    !query || a.name.includes(query) || a.ip.includes(query) ||
    a.type.toLowerCase().includes(query.toLowerCase())
  );

  // Load from backend, fall back to mock
  useEffect(() => {
  fetch(`${API}/assets`)
    .then(r => r.json())
    .then(d => {
      if (d?.assets?.length) {
        setAssets(d.assets);
        setRiskCounts(d.risk_counts || riskCounts);
        setCertBuckets(d.cert_buckets || certBuckets);
        setByType(d.by_type || byType);
      }
    })
    .catch(() => console.log("Backend unreachable, using mock data"));
}, []);

  // Draw donut after assets load
  useEffect(() => { drawTypeChart(); drawRiskChart(); }, [assets]);

  function drawTypeChart() {
    const c = typeRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = 140, H = 140, cx = 70, cy = 70, r = 50, gap = 0.05;
    const data = [
      { label: "Web Apps",  val: 42, color: T.blue },
      { label: "APIs",      val: 26, color: T.purple },
      { label: "Servers",   val: 37, color: "rgba(200,220,255,0.5)" },
      { label: "LB",        val: 11, color: T.cyan },
      { label: "Other",     val: 12, color: "rgba(100,116,139,0.5)" },
    ];
    const total = data.reduce((a, d) => a + d.val, 0);
    let angle = -Math.PI / 2;
    ctx.clearRect(0, 0, W, H);
    data.forEach(d => {
      const sweep = 2 * Math.PI * (d.val / total) - gap;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, angle, angle + sweep);
      ctx.fillStyle = d.color; ctx.fill();
      angle += 2 * Math.PI * (d.val / total);
    });
    // Inner hole
    ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#080c14"; ctx.fill();
    ctx.fillStyle = "rgba(200,220,255,0.85)";
    ctx.font = "bold 13px Orbitron,monospace"; ctx.textAlign = "center";
    ctx.fillText(String(total), cx, cy + 5);
    // Legend
    const leg = document.getElementById("inv-legend");
    if (leg) leg.innerHTML = data.map(d => `
      <div style="display:flex;align-items:center;gap:6px;">
        <div style="width:8px;height:8px;border-radius:1px;background:${d.color};flex-shrink:0;"></div>
        <span style="font-size:9px;color:${T.text2};flex:1;">${d.label}</span>
        <span style="font-size:9px;font-family:'Orbitron',monospace;color:${T.text3};">${d.val}</span>
      </div>`).join("");
  }

  function drawRiskChart() {
      const c = riskRef.current; if (!c) return;
      const ctx = c.getContext("2d")!;
      const W = c.offsetWidth || 280, H = 140;
      c.width = W;
      const bars = [
        { label: "Critical", val: riskCounts.Critical, color: T.red },
        { label: "High",     val: riskCounts.High,     color: T.orange },
        { label: "Medium",   val: riskCounts.Medium,   color: T.yellow },
        { label: "Low",      val: riskCounts.Low,       color: T.green },
      ];
    const max = 50, bw = 36, gap = 22;
    const startX = (W - (bars.length * (bw + gap) - gap)) / 2;
    ctx.clearRect(0, 0, W, H);
    bars.forEach((b, i) => {
      const x = startX + i * (bw + gap);
      const barH = Math.round((b.val / max) * (H - 30));
      const y = H - barH - 20;
      ctx.fillStyle = b.color + "22"; ctx.fillRect(x, y, bw, barH);
      ctx.fillStyle = b.color + "88"; ctx.fillRect(x, y + 3, bw, barH - 3);
      ctx.fillStyle = b.color;        ctx.fillRect(x, y, bw, 3);
      ctx.fillStyle = "rgba(200,220,255,0.25)";
      ctx.font = "9px 'Share Tech Mono'"; ctx.textAlign = "center";
      ctx.fillText(b.label, x + bw / 2, H - 4);
      ctx.fillStyle = b.color;
      ctx.fillText(String(b.val), x + bw / 2, y - 4);
    });
  }

  const riskVariant = (r: string): any =>
    r === "Critical" ? "red" : r === "High" ? "orange" : r === "Medium" ? "yellow" : "green";
  const certVariant = (c: string): any =>
    c === "Valid" ? "green" : c === "Expiring" ? "yellow" : "red";
  const keyColor = (k: string) =>
    k.startsWith("1024") ? T.red : k.startsWith("2048") ? T.yellow : T.green;

  async function scanAll() {
    setScanning(true);
    try { await fetch(`${API}/scan-all`, { method: "POST" }); } catch {}
    setTimeout(() => setScanning(false), 2000);
  }

  return (
    <div style={S.page}>
      <style>{`@keyframes ping{75%,100%{transform:scale(2.2);opacity:0}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* METRICS */}
      <div style={GRID.g5}>
        <MetricCard label="TOTAL ASSETS" value={assets.length}        sub="This session"     color={T.blue}   />
        <MetricCard label="WEB APPS"     value={byType["Web Apps"]}   sub="Public facing"    color={T.cyan}   />
        <MetricCard label="HIGH RISK"    value={riskCounts.Critical + riskCounts.High} sub="Immediate action" color={T.red} />
        <MetricCard label="MEDIUM"       value={riskCounts.Medium}    sub="Monitor closely"  color={T.yellow} />
        <MetricCard label="LOW"          value={riskCounts.Low}       sub="Under control"    color={T.green}  />
      </div>

      {/* CHARTS ROW */}
      <div style={GRID.g2}>
        <Panel>
          <PanelHeader left="ASSET TYPE DISTRIBUTION" />
          <div style={{ padding: 14, display: "flex", gap: 16, alignItems: "center" }}>
            <canvas ref={typeRef} width={140} height={140} />
            <div id="inv-legend" style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }} />
          </div>
        </Panel>
        <Panel>
          <PanelHeader left="ASSET RISK DISTRIBUTION"
            right={<span style={{ fontFamily:"'Orbitron',monospace", fontSize:20, color:T.red }}>11<span style={{fontSize:12}}>%</span></span>}
          />
          <div style={{ padding: 14 }}>
            <canvas ref={riskRef} width={280} height={140} style={{ width: "100%" }} />
          </div>
        </Panel>
      </div>

      {/* ASSET TABLE */}
      <Panel>
        <PanelHeader
          left="ASSET INVENTORY"
          right={<>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search assets..."
              style={{ ...S.input, width: 160, fontSize: 11 }} />
            <button style={S.btn} onClick={scanAll} disabled={scanning}>
              {scanning ? "SCANNING..." : "⬡ SCAN ALL"}
            </button>
            <button style={S.btn}>+ ADD ASSET</button>
          </>}
        />
        <Table cols={["ASSET NAME","URL","IPV4","TYPE","OWNER","RISK","CERT","KEY LEN","LAST SCAN"]}>
          {filtered.map((a, i) => (
            <TR key={i}>
              <TD style={{ color: T.blue, fontSize:10 }}>{a.name}</TD>
              <TD style={{ color:"rgba(59,130,246,0.7)", fontSize:10 }}>{a.url}</TD>
              <TD style={{ fontSize:10 }}>{a.ip}</TD>
              <TD><Badge v="gray">{a.type}</Badge></TD>
              <TD style={{ fontSize:10, color:T.text3 }}>{a.owner}</TD>
              <TD><Badge v={riskVariant(a.risk)}>{a.risk}</Badge></TD>
              <TD><Badge v={certVariant(a.cert)}>{a.cert}</Badge></TD>
              <TD style={{ fontSize:10, color: keyColor(a.keylen) }}>{a.keylen}</TD>
              <TD style={{ fontSize:10, color:T.text3 }}>{a.scan}</TD>
            </TR>
          ))}
        </Table>
        <div style={{ padding:"8px 12px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:10, color:T.text3 }}>Showing <b style={{color:T.text2}}>{filtered.length}</b> assets</span>
        </div>
      </Panel>

      {/* CERT EXPIRY + CRYPTO */}
      <div style={GRID.g2}>
        <Panel>
          <PanelHeader left="CERTIFICATE EXPIRY TIMELINE" />
          <div style={{ padding: 14 }}>
            {[
              { label: "0–30 Days",  count: certBuckets["0-30"],  color: T.red },
              { label: "30–60 Days", count: certBuckets["30-60"], color: T.orange },
              { label: "60–90 Days", count: certBuckets["60-90"], color: T.yellow },
              { label: ">90 Days",   count: certBuckets["90+"],   color: T.green },
            ].map(row =>(
              <div key={row.label} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:row.color, boxShadow:`0 0 4px ${row.color}`, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:10, color:T.text2 }}>{row.label}</span>
                    <span style={{ fontSize:10, fontFamily:"'Orbitron',monospace", color:row.color }}>{row.count}</span>
                  </div>
                  <ProgBar pct={Math.round(row.count/93*100)} color={row.color} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHeader left="CRYPTO & SECURITY OVERVIEW" />
          <Table cols={["ASSET","KEY LEN","CIPHER SUITE","TLS","CA"]}>
            {assets
              .filter(a => a.tls !== "—" && a.tls !== undefined)
              .slice(0, 10)
              .map((a, i) => (
                <TR key={i}>
                  <TD style={{ fontSize:10, color:T.blue }}>{a.name}</TD>
                  <TD style={{ fontSize:10, color: keyColor(a.keylen) }}>{a.keylen}</TD>
                  <TD style={{ fontSize:9, color:T.text3, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.cipher}</TD>
                  <TD><Badge v={a.tls==="1.0"?"red":a.tls==="1.2"?"yellow":"green"}>TLS {a.tls}</Badge></TD>
                  <TD style={{ fontSize:10, color:T.text3 }}>{a.ca}</TD>
                </TR>
              ))}
          </Table>
        </Panel>
      </div>
    </div>
  );
}