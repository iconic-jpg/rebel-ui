import React, { useState, useEffect, useRef } from "react";
import {
  T, S, GRID, Panel, PanelHeader, MetricCard, Badge, SubTabs,
  Table, TR, TD, Pulse, MOCK_DOMAINS, MOCK_SSL, MOCK_IPS, MOCK_SOFTWARE,
} from "./shared.js";

const API = "https://r3bel-production.up.railway.app";

type DiscTab = "domains"|"ssl"|"ips"|"software";
type StatusFilter = "new"|"fp"|"confirmed"|"all";

export default function AssetDiscoveryPage() {
  const [tab, setTab]       = useState<DiscTab>("domains");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery]   = useState("");
  const mapRef              = useRef<HTMLCanvasElement>(null);

  const [domainData, setDomainData]     = useState<any[]>([]);
  const [sslData, setSslData]           = useState<any[]>([]);
  const [ipData, setIpData]             = useState<any[]>([]);
  const [softwareData, setSoftwareData] = useState<any[]>([]);
  const [counts, setCounts]             = useState({ domains: 0, ssl: 0, ips: 0, software: 0 });
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    fetch(`${API}/discovery`)
      .then(r => r.json())
      .then(d => {
        setDomainData(d.domains || []);
        setSslData(d.ssl || []);
        setIpData(d.ips || []);
        setSoftwareData(d.software || []);
        setCounts(d.counts || { domains: 0, ssl: 0, ips: 0, software: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { drawNetMap(); }, []);

  function drawNetMap() {
    const canvas = mapRef.current; if (!canvas) return;
    const W = canvas.offsetWidth || 900, H = 320;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#050810"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(59,130,246,0.04)"; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    const nodes = [
      { x:0.5,  y:0.5,  label:"REBEL CORE",      color:"#3b82f6", r:14, type:"hub"    },
      { x:0.15, y:0.28, label:"portal",           color:"#22c55e", r:9,  type:"web"    },
      { x:0.35, y:0.14, label:"api",              color:"#22d3ee", r:9,  type:"api"    },
      { x:0.7,  y:0.18, label:"vpn",              color:"#ef4444", r:9,  type:"gate"   },
      { x:0.84, y:0.48, label:"mail",             color:"#22c55e", r:8,  type:"server" },
      { x:0.65, y:0.78, label:"app",              color:"#eab308", r:9,  type:"web"    },
      { x:0.24, y:0.78, label:"cdn",              color:"#a78bfa", r:8,  type:"web"    },
      { x:0.1,  y:0.58, label:"auth",             color:"#22d3ee", r:8,  type:"api"    },
      { x:0.88, y:0.22, label:"103.25.151",       color:"rgba(200,220,255,0.25)", r:6, type:"ip" },
      { x:0.9,  y:0.74, label:"40.104.62",        color:"rgba(200,220,255,0.25)", r:6, type:"ip" },
      { x:0.06, y:0.42, label:"40.101.72",        color:"rgba(239,68,68,0.5)",    r:6, type:"ip" },
      { x:0.45, y:0.88, label:"181.65.122",       color:"rgba(249,115,22,0.5)",   r:6, type:"ip" },
    ];
    const edges = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[3,8],[4,9],[1,10],[5,11]];
    edges.forEach(([a, b]) => {
      const na = nodes[a], nb = nodes[b];
      ctx.beginPath(); ctx.moveTo(na.x*W, na.y*H); ctx.lineTo(nb.x*W, nb.y*H);
      ctx.strokeStyle = "rgba(59,130,246,0.1)"; ctx.lineWidth = 0.8; ctx.stroke();
    });
    nodes.forEach(n => {
      ctx.beginPath(); ctx.arc(n.x*W, n.y*H, n.r+4, 0, Math.PI*2);
      ctx.fillStyle = n.color.replace(")", ",0.08)").replace("rgba","rgba"); ctx.fill();
      ctx.beginPath(); ctx.arc(n.x*W, n.y*H, n.r, 0, Math.PI*2);
      ctx.fillStyle = n.color+"22"; ctx.fill();
      ctx.strokeStyle = n.color; ctx.lineWidth = n.type==="hub" ? 1.5 : 1; ctx.stroke();
      ctx.fillStyle = "rgba(200,220,255,0.5)";
      ctx.font = `${n.type==="hub"?9:8}px 'Share Tech Mono'`;
      ctx.textAlign = "center";
      ctx.fillText(n.label, n.x*W, n.y*H + n.r + 11);
    });
  }

  function renderTable() {
    if (tab === "domains") {
      const data = domainData.filter(d => !query || d.domain.includes(query));
      return (
        <Table cols={["DETECTION DATE","DOMAIN NAME","REGISTRATION DATE","REGISTRAR","COMPANY","STATUS"]}>
          {data.map((d: any, i: number) => (
            <TR key={i}>
              <TD style={{ fontSize:10, color:T.text3 }}>{d.date}</TD>
              <TD style={{ fontSize:10, color:T.blue }}>{d.domain}</TD>
              <TD style={{ fontSize:10, color:T.text3 }}>{d.regdate}</TD>
              <TD style={{ fontSize:10, color:T.text2 }}>{d.registrar}</TD>
              <TD><Badge v="blue">{d.company}</Badge></TD>
              <TD><Badge v="green">CONFIRMED</Badge></TD>
            </TR>
          ))}
          {data.length === 0 && !loading && (
            <TR><TD style={{ color:T.text3, fontSize:10 }}>No domains found</TD></TR>
          )}
        </Table>
      );
    }
    if (tab === "ssl") {
      return (
        <Table cols={["DATE","CIPHER","VALID FROM","COMMON NAME","COMPANY","CA","TLS"]}>
          {sslData.map((d: any, i: number) => (
            <TR key={i}>
              <TD style={{ fontSize:10, color:T.text3 }}>{d.date}</TD>
              <TD style={{ fontSize:9, color:T.text3, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.sha}</TD>
              <TD style={{ fontSize:10, color:T.text3 }}>{d.from}</TD>
              <TD style={{ fontSize:10, color:T.text2 }}>{d.common}</TD>
              <TD><Badge v="blue">{d.company}</Badge></TD>
              <TD style={{ fontSize:10, color:T.cyan }}>{d.ca}</TD>
              <TD><Badge v={d.tls_version==="TLSv1.0"?"red":d.tls_version==="TLSv1.2"?"yellow":"green"}>{d.tls_version}</Badge></TD>
            </TR>
          ))}
          {sslData.length === 0 && !loading && (
            <TR><TD style={{ color:T.text3, fontSize:10 }}>No SSL data — run crypto scans first</TD></TR>
          )}
        </Table>
      );
    }
    if (tab === "ips") {
      return (
        <Table cols={["DATE","IP ADDRESS","PORTS","SUBNET","ASN","NETNAME","LOCATION","STATUS"]}>
          {ipData.map((d: any, i: number) => (
            <TR key={i}>
              <TD style={{ fontSize:10, color:T.text3 }}>{d.date}</TD>
              <TD style={{ fontSize:10, color:T.blue }}>{d.ip}</TD>
              <TD style={{ fontSize:10, color:T.text2 }}>{d.ports}</TD>
              <TD style={{ fontSize:10, color:T.text3 }}>{d.subnet}</TD>
              <TD style={{ fontSize:10, color:T.cyan }}>{d.asn}</TD>
              <TD style={{ fontSize:10, color:T.text2 }}>{d.netname}</TD>
              <TD style={{ fontSize:10, color:T.text3 }}>{d.location}</TD>
              <TD><Badge v="green">CONFIRMED</Badge></TD>
            </TR>
          ))}
          {ipData.length === 0 && !loading && (
            <TR><TD style={{ color:T.text3, fontSize:10 }}>No IPs resolved yet</TD></TR>
          )}
        </Table>
      );
    }
    return (
      <Table cols={["DATE","PRODUCT","VERSION","TYPE","PORT","HOST","STATUS"]}>
        {softwareData.map((d: any, i: number) => (
          <TR key={i}>
            <TD style={{ fontSize:10, color:T.text3 }}>{d.date}</TD>
            <TD style={{ fontSize:10, color:T.cyan }}>{d.product}</TD>
            <TD style={{ fontSize:10, color:T.text3 }}>{d.version}</TD>
            <TD><Badge v="gray">{d.type}</Badge></TD>
            <TD style={{ fontSize:10, color:T.text2 }}>{d.port}</TD>
            <TD style={{ fontSize:10, color:T.blue }}>{d.host}</TD>
            <TD><Badge v="green">CONFIRMED</Badge></TD>
          </TR>
        ))}
        {softwareData.length === 0 && !loading && (
          <TR><TD style={{ color:T.text3, fontSize:10 }}>No software detected yet</TD></TR>
        )}
      </Table>
    );
  }

  return (
    <div style={S.page}>
      <style>{`@keyframes ping{75%,100%{transform:scale(2.2);opacity:0}}`}</style>

      {/* SEARCH */}
      <Panel>
        <div style={{ padding:16, display:"flex", gap:10, alignItems:"center" }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search domain, URL, contact, IoC or other..."
            style={{ ...S.input, flex:1, fontSize:12 }} />
          <button style={S.btn}>⬡ DISCOVER</button>
        </div>
        <div style={{ display:"flex", gap:8, padding:"0 16px 14px", alignItems:"center" }}>
          <span style={{ fontSize:10, color:T.text3 }}>Time Period:</span>
          <input type="date" defaultValue="2026-01-01"
            style={{ ...S.input, padding:"3px 8px", fontSize:10 }} />
          <span style={{ fontSize:10, color:T.text3 }}>—</span>
          <input type="date" defaultValue="2026-03-15"
            style={{ ...S.input, padding:"3px 8px", fontSize:10 }} />
        </div>
      </Panel>

      {/* DISCOVERY METRICS */}
      <div style={GRID.g4}>
        <MetricCard label="DOMAINS"    value={counts.domains}  sub="Discovered"          color={T.blue}   />
        <MetricCard label="SSL CERTS"  value={counts.ssl}      sub="Active certificates"  color={T.yellow} />
        <MetricCard label="IP/SUBNETS" value={counts.ips}      sub="Mapped ranges"       color={T.orange} />
        <MetricCard label="SOFTWARE"   value={counts.software} sub="Identified stacks"   color={T.purple} />
      </div>

      {/* DISCOVERY TABLE */}
      <Panel>
        <div style={S.ph}>
          <SubTabs
            tabs={[
              { id:"domains",  label:`DOMAINS (${counts.domains})` },
              { id:"ssl",      label:`SSL (${counts.ssl})` },
              { id:"ips",      label:`IP/SUBNETS (${counts.ips})` },
              { id:"software", label:`SOFTWARE (${counts.software})` },
            ]}
            active={tab}
            onChange={(v: string) => setTab(v as DiscTab)}
          />
        </div>
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding:20, textAlign:"center", fontSize:10, color:T.text3 }}>
              Loading discovery data...
            </div>
          ) : renderTable()}
        </div>
      </Panel>

      {/* NETWORK MAP */}
      <Panel>
        <div style={S.ph}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Pulse color={T.blue} />
            <span style={{ fontFamily:"'Orbitron',monospace", fontSize:10, letterSpacing:".15em", color:T.text2 }}>NETWORK ASSET MAP</span>
          </div>
          <span style={{ fontSize:8, color:T.text3, fontFamily:"'Orbitron',monospace" }}>LIVE TOPOLOGY</span>
        </div>
        <canvas ref={mapRef} style={{ width:"100%", height:320, display:"block" }} />
      </Panel>
    </div>
  );
}