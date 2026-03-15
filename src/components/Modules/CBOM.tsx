import React, { useEffect, useRef } from "react";
import {
  T, S, GRID, Panel, PanelHeader, MetricCard, Badge, ProgBar,
  Table, TR, TD, MOCK_CBOM,
} from "./shared.js";

const CIPHERS = [
  { name:"ECDHE-RSA-AES256-GGM-SHA384",    count:29, color:T.green  },
  { name:"ECDHE-ECDSA-AES256-GGM-SHA384",  count:23, color:T.blue   },
  { name:"AES256-GGM-SHA384",              count:19, color:T.cyan   },
  { name:"AES128-GGM-SHA256",              count:15, color:T.yellow },
  { name:"TLS_RSA_WITH_DES_CBC_SHA",       count:9,  color:T.red    },
];

const CAS = [
  { label:"DigiCert",     val:39, color:T.blue   },
  { label:"Thawte",       val:39, color:T.cyan   },
  { label:"Let's Encrypt",val:12, color:T.green  },
  { label:"COMODO",       val:10, color:T.yellow },
];

const PROTOCOLS = [
  { label:"TLS 1.3", val:72, color:T.green  },
  { label:"TLS 1.2", val:20, color:T.blue   },
  { label:"TLS 1.1", val:8,  color:T.orange },
];

export default function CBOMPage() {
  const klRef    = useRef<HTMLCanvasElement>(null);
  const caRef    = useRef<HTMLCanvasElement>(null);
  const protoRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { drawKeyLength(); drawCA(); drawProto(); }, []);

  function drawKeyLength() {
    const c = klRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = c.offsetWidth || 280, H = 160;
    c.width = W;
    const bars = [
      { label:"4096", val:39, color:T.green  },
      { label:"3078", val:28, color:T.blue   },
      { label:"2048", val:15, color:T.blue   },
      { label:"2044", val:11, color:T.yellow },
      { label:"≤27",  val:6,  color:T.red    },
    ];
    const max = 45, bw = 30, gap = 16;
    const startX = (W - (bars.length * (bw + gap) - gap)) / 2;
    ctx.clearRect(0, 0, W, H);
    bars.forEach((b, i) => {
      const x = startX + i * (bw + gap);
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

  function drawDonut(canvas: HTMLCanvasElement | null,
    data: {label:string;val:number;color:string}[], legendId: string) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = 160, H = 160, cx = 80, cy = 80, r = 55;
    const total = data.reduce((a, d) => a + d.val, 0);
    let angle = -Math.PI / 2;
    ctx.clearRect(0, 0, W, H);
    data.forEach((d: any) => {
      const sweep = 2 * Math.PI * (d.val / total) - 0.04;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, angle, angle + sweep);
      ctx.fillStyle = d.color + "33"; ctx.fill();
      ctx.strokeStyle = d.color; ctx.lineWidth = 1.5; ctx.stroke();
      angle += 2 * Math.PI * (d.val / total);
    });
    ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#080c14"; ctx.fill();
    const el = document.getElementById(legendId);
    if (el) el.innerHTML = data.map(d => `
      <div style="display:flex;align-items:center;gap:6px;">
        <div style="width:8px;height:8px;border-radius:1px;background:${d.color};flex-shrink:0;"></div>
        <span style="font-size:9px;color:${T.text2};flex:1;">${d.label}</span>
        <span style="font-size:9px;font-family:'Orbitron',monospace;color:${d.color};">${d.val}</span>
      </div>`).join("");
  }

  function drawCA()    { drawDonut(caRef.current,    CAS,       "ca-legend"); }
  function drawProto() { drawDonut(protoRef.current, PROTOCOLS, "proto-legend"); }

  function exportCSV() {
    const rows = [
      ["Application","Key Length","Cipher Suite","TLS Version","CA","Status","PQC Ready"],
      ...MOCK_CBOM.map((d: any, i: number) => [d.app, d.keylen, d.cipher, d.tls, d.ca, d.status, d.pqc?"Yes":"No"])

    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "rebel-cbom.csv"; a.click();
  }

  return (
    <div style={S.page}>
      {/* METRICS */}
      <div style={GRID.g5}>
        <MetricCard label="TOTAL APPS"     value={17} sub="Applications"     color={T.blue}   />
        <MetricCard label="SITES SURVEYED" value={56} sub="Scanned"          color={T.cyan}   />
        <MetricCard label="ACTIVE CERTS"   value={93} sub="Valid"            color={T.green}  />
        <MetricCard label="WEAK CRYPTO"    value={22} sub="Needs remediation" color={T.red}   />
        <MetricCard label="CERT ISSUES"    value={7}  sub="Misconfigured"    color={T.orange} />
      </div>

      {/* CHARTS ROW */}
      <div style={GRID.g3}>
        {/* Key Length */}
        <Panel>
          <PanelHeader left="KEY LENGTH DISTRIBUTION" />
          <div style={{ padding:14 }}>
            <canvas ref={klRef} style={{ width:"100%", height:160 }} />
            <div style={{ display:"flex", justifyContent:"space-around", marginTop:8 }}>
              {[["4096",T.green],["3078",T.blue],["2048",T.blue],["2044",T.yellow],["≤27",T.red]].map(([lbl,clr]) => (
                <div key={lbl} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:12, color:clr, fontFamily:"'Orbitron',monospace" }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Cipher Usage */}
        <Panel>
          <PanelHeader left="CIPHER USAGE" />
          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:9 }}>
            {CIPHERS.map(c => (
              <div key={c.name}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:9, color:T.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:160 }}>{c.name}</span>
                  <span style={{ fontSize:9, fontFamily:"'Orbitron',monospace", color:c.color, flexShrink:0, marginLeft:8 }}>{c.count}</span>
                </div>
                <ProgBar pct={Math.round(c.count/29*100)} color={c.color} />
              </div>
            ))}
          </div>
        </Panel>

        {/* Top CAs */}
        <Panel>
          <PanelHeader left="TOP CERTIFICATE AUTHORITIES" />
          <div style={{ padding:14 }}>
            <canvas ref={caRef} width={160} height={160} style={{ display:"block", margin:"0 auto 10px" }} />
            <div id="ca-legend" style={{ display:"flex", flexDirection:"column", gap:5 }} />
          </div>
        </Panel>
      </div>

      {/* CBOM TABLE */}
      <Panel>
        <PanelHeader left="APPLICATION CRYPTOGRAPHIC INVENTORY"
          right={<button style={S.btn} onClick={exportCSV}>↓ EXPORT CSV</button>} />
        <Table cols={["APPLICATION","KEY LENGTH","CIPHER SUITE","TLS VER","CERT AUTHORITY","STATUS","PQC READY"]}>
          {MOCK_CBOM.map((d, i) => (
            <TR key={i}>
              <TD style={{ fontSize:10, color:T.blue }}>{d.app}</TD>
              <TD style={{ fontSize:10, color:d.keylen.startsWith("1024")?T.red:d.keylen.startsWith("2048")?T.yellow:T.green }}>{d.keylen}</TD>
              <TD style={{ fontSize:9, color:T.text3, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.cipher}</TD>
              <TD><Badge v={d.tls==="1.0"?"red":d.tls==="1.2"?"yellow":"green"}>TLS {d.tls}</Badge></TD>
              <TD style={{ fontSize:10, color:T.text3 }}>{d.ca}</TD>
              <TD><Badge v={d.status==="ok"?"green":"red"}>{d.status==="ok"?"OK":"WEAK"}</Badge></TD>
              <TD style={{ textAlign:"center", fontSize:14 }}>
                {d.pqc
                  ? <span style={{ color:T.green }}>✓</span>
                  : <span style={{ color:T.red }}>✗</span>}
              </TD>
            </TR>
          ))}
        </Table>
      </Panel>

      {/* ENCRYPTION PROTOCOLS */}
      <Panel>
        <PanelHeader left="ENCRYPTION PROTOCOLS" />
        <div style={{ padding:14, display:"flex", gap:16, alignItems:"center" }}>
          <canvas ref={protoRef} width={140} height={140} />
          <div id="proto-legend" style={{ display:"flex", flexDirection:"column", gap:9, flex:1 }}>
            {PROTOCOLS.map(p => (
              <div key={p.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:10, height:10, borderRadius:1, background:p.color, flexShrink:0 }} />
                <span style={{ fontSize:10, color:T.text2, flex:1 }}>{p.label}</span>
                <div style={{ width:80 }}><ProgBar pct={p.val} color={p.color} /></div>
                <span style={{ fontSize:10, fontFamily:"'Orbitron',monospace", color:p.color, minWidth:36, textAlign:"right" }}>{p.val}%</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
