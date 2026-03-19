import React, { useState, useEffect, useRef } from "react";
import {
  API, T, S, Panel, PanelHeader, MetricCard, Badge, ProgBar,
  Table, TR, TD, MOCK_ASSETS,
} from "./shared.js";

function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

export default function AssetInventoryPage() {
  const [assets,      setAssets]      = useState<any[]>(MOCK_ASSETS);
  const [query,       setQuery]       = useState("");
  const [filterCrit,  setFilterCrit]  = useState("All");
  const [expandedRow, setExpandedRow] = useState<number|null>(null);
  const [riskCounts,  setRiskCounts]  = useState({ Critical:0, High:0, Medium:0, Low:0 });
  const [certBuckets, setCertBuckets] = useState({ "0-30":0, "30-60":0, "60-90":0, "90+":0 });
  const [byType,      setByType]      = useState<Record<string,number>>({});

  const typeRef   = useRef<HTMLCanvasElement>(null);
  const riskRef   = useRef<HTMLCanvasElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const mobile    = useMobile();

  useEffect(() => {
    fetch(`${API}/assets`)
      .then(r => r.json())
      .then(d => {
        if (d?.assets?.length) {
          setAssets(d.assets);
          setRiskCounts(d.risk_counts   || riskCounts);
          setCertBuckets(d.cert_buckets || certBuckets);
          setByType(d.by_type           || {});
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { drawTypeChart(); drawRiskChart(); }, [assets, riskCounts, byType, mobile]);

  // ── Charts ────────────────────────────────────────────────────────────────
  function drawTypeChart() {
    const c = typeRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W=140, H=140, cx=70, cy=70, r=50, gap=0.05;
    const data = [
      { label:"Web Apps",        val:byType["Web App"]||byType["Web Apps"]||0,           color:T.blue  },
      { label:"APIs",            val:byType["API"]||byType["APIs"]||0,                   color:"#a855f7"},
      { label:"Core Banking",    val:byType["Core Banking"]||0,                          color:T.green },
      { label:"Internet Banking",val:byType["Internet Banking"]||0,                      color:T.yellow},
      { label:"Servers",         val:byType["Server"]||byType["Servers"]||0,             color:"rgba(200,220,255,0.5)"},
      { label:"Other",           val:byType["Other"]||0,                                 color:"rgba(100,116,139,0.5)"},
    ].filter(d => d.val > 0);

    const display = data.length ? data : [{ label:"Web Apps", val:1, color:T.blue }];
    const total   = display.reduce((a,d) => a+d.val, 0);
    let angle = -Math.PI/2;
    ctx.clearRect(0,0,W,H);
    display.forEach(d => {
      const sweep = 2*Math.PI*(d.val/total)-gap;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,angle,angle+sweep);
      ctx.fillStyle=d.color; ctx.fill();
      angle += 2*Math.PI*(d.val/total);
    });
    ctx.beginPath(); ctx.arc(cx,cy,28,0,Math.PI*2);
    ctx.fillStyle="#080c14"; ctx.fill();
    ctx.fillStyle="rgba(200,220,255,0.85)";
    ctx.font="bold 13px Orbitron,monospace"; ctx.textAlign="center";
    ctx.fillText(String(assets.length), cx, cy+5);
    if (legendRef.current) {
      legendRef.current.innerHTML = display.map(d=>`
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:8px;height:8px;border-radius:1px;background:${d.color};flex-shrink:0;"></div>
          <span style="font-size:9px;color:${T.text2};flex:1;">${d.label}</span>
          <span style="font-size:9px;font-family:'Orbitron',monospace;color:${T.text3};">${d.val}</span>
        </div>`).join("");
    }
  }

  function drawRiskChart() {
    const c = riskRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W=c.offsetWidth||280, H=140;
    c.width=W;
    const bars = [
      { label:"Critical", val:riskCounts.Critical, color:T.red    },
      { label:"High",     val:riskCounts.High,     color:T.orange },
      { label:"Medium",   val:riskCounts.Medium,   color:T.yellow },
      { label:"Low",      val:riskCounts.Low,      color:T.green  },
    ];
    const max=Math.max(...bars.map(b=>b.val),1);
    const bw=mobile?28:36, gap=mobile?14:22;
    const startX=(W-(bars.length*(bw+gap)-gap))/2;
    ctx.clearRect(0,0,W,H);
    bars.forEach((b,i) => {
      const x=startX+i*(bw+gap);
      const barH=Math.round((b.val/max)*(H-30));
      const y=H-barH-20;
      ctx.fillStyle=b.color+"22"; ctx.fillRect(x,y,bw,barH);
      ctx.fillStyle=b.color+"88"; ctx.fillRect(x,y+3,bw,barH-3);
      ctx.fillStyle=b.color;      ctx.fillRect(x,y,bw,3);
      ctx.fillStyle="rgba(200,220,255,0.25)";
      ctx.font="9px 'Share Tech Mono'"; ctx.textAlign="center";
      ctx.fillText(b.label,x+bw/2,H-4);
      ctx.fillStyle=b.color;
      ctx.fillText(String(b.val),x+bw/2,y-4);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const certVariant = (c:string):any =>
    c==="Valid"?"green":c==="Expiring"?"yellow":"red";
  const keyColor = (k:string) =>
    k?.startsWith("1024")?T.red:k?.startsWith("2048")?T.yellow:T.green;
  const critColor = (c:string) => ({
    Critical:T.red, High:T.orange, Medium:T.yellow, Low:T.green
  }[c] ?? null);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = assets.filter(a => {
    const ms = !query
      || a.name?.toLowerCase().includes(query.toLowerCase())
      || a.owner?.toLowerCase().includes(query.toLowerCase())
      || a.type?.toLowerCase().includes(query.toLowerCase());
    const mc = filterCrit==="All"
      || a.criticality===filterCrit
      || a.risk===filterCrit;
    return ms && mc;
  });

  const highRisk = riskCounts.Critical + riskCounts.High;

  return (
    <div style={S.page}>

      {/* ── METRICS ── */}
      <div style={{ display:"grid",
        gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,1fr)", gap:mobile?8:9 }}>
        <MetricCard label="TOTAL ASSETS"
          value={assets.length}      sub="Scanned"         color={T.blue}  />
        <MetricCard label="HIGH RISK"
          value={highRisk}           sub="Immediate action" color={T.red}   />
        <MetricCard label="CERT EXPIRING"
          value={certBuckets["0-30"]} sub="Within 30 days" color={T.orange}/>
        <div style={mobile?{gridColumn:"1/-1"}:{}}>
          <MetricCard label="ACTIVE CERTS"
            value={assets.filter(a=>a.cert==="Valid").length}
            sub="Valid certificates"  color={T.green} />
        </div>
      </div>

      {/* ── CHARTS ── */}
      <div style={{ display:"grid",
        gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:mobile?8:10 }}>
        <Panel>
          <PanelHeader left="ASSET TYPE DISTRIBUTION"/>
          <div style={{ padding:14, display:"flex", gap:16, alignItems:"center" }}>
            <canvas ref={typeRef} width={140} height={140}/>
            <div ref={legendRef} style={{ display:"flex", flexDirection:"column",
              gap:7, flex:1 }}/>
          </div>
        </Panel>
        <Panel>
          <PanelHeader left="RISK DISTRIBUTION"
            right={
              <span style={{ fontFamily:"'Orbitron',monospace",
                fontSize:20, color:T.red }}>
                {highRisk}<span style={{fontSize:12}}> high</span>
              </span>
            }
          />
          <div style={{ padding:14 }}>
            <canvas ref={riskRef} width={280} height={140} style={{width:"100%"}}/>
          </div>
        </Panel>
      </div>

      {/* ── ASSET TABLE ── */}
      <Panel>
        <PanelHeader
          left="ASSET INVENTORY"
          right={
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <input value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="Search domain / owner..."
                style={{ ...S.input, width:mobile?120:170, fontSize:11 }}/>
              <select value={filterCrit} onChange={e=>setFilterCrit(e.target.value)}
                style={{ ...S.input, fontSize:10, cursor:"pointer" }}>
                <option value="All">All</option>
                {["Critical","High","Medium","Low"].map(c=>(
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          }
        />

        {/* Mobile cards */}
        {mobile ? (
          <div style={{ maxHeight:420, overflowY:"auto" }}>
            {filtered.map((a,i) => {
              const scope = Array.isArray(a.compliance_scope)?a.compliance_scope:[];
              const cc    = critColor(a.criticality);
              const tlsN  = (a.tls||"").replace(/^TLSv?/i,"");
              return (
                <div key={i} style={{ padding:"10px 14px",
                  borderBottom:"1px solid rgba(59,130,246,0.05)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    marginBottom:4 }}>
                    <span style={{ fontSize:12, color:T.blue }}>{a.name}</span>
                    <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                      {cc && (
                        <span style={{ fontSize:7, fontWeight:700, color:cc,
                          border:`1px solid ${cc}44`, borderRadius:2,
                          padding:"1px 5px" }}>{a.criticality}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:4 }}>
                    <Badge v="gray">{a.type||"—"}</Badge>
                    <Badge v={certVariant(a.cert)}>{a.cert||"—"}</Badge>
                    <Badge v={tlsN==="1.0"?"red":tlsN==="1.2"?"yellow":"green"}>
                      TLS {tlsN||"—"}
                    </Badge>
                  </div>
                  {scope.length>0 && (
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {scope.map((s:string)=>(
                        <span key={s} style={{ fontSize:7, color:T.cyan,
                          border:`1px solid ${T.cyan}33`, borderRadius:2,
                          padding:"1px 5px" }}>{s}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize:9, color:T.text3, marginTop:4 }}>
                    {a.keylen} · {a.ca} · {a.scan||"—"}
                  </div>
                </div>
              );
            })}
            {filtered.length===0&&(
              <div style={{ padding:20, fontSize:10, color:T.text3, textAlign:"center" }}>
                No assets found
              </div>
            )}
          </div>
        ) : (
          <Table cols={["ASSET","TYPE","CRITICALITY","OWNER","TLS","CERT",
            "KEY LEN","COMPLIANCE","LAST SCAN",""]}>
            {filtered.map((a,i) => {
              const scope = Array.isArray(a.compliance_scope)?a.compliance_scope:[];
              const cc    = critColor(a.criticality);
              const tlsN  = (a.tls||"").replace(/^TLSv?/i,"");
              const isOpen= expandedRow===i;
              return (
                <React.Fragment key={i}>
                  <TR>
                    <TD>
                      <div style={{ fontSize:10, color:T.blue }}>{a.name}</div>
                      <div style={{ fontSize:8, color:"rgba(59,130,246,0.5)",
                        overflow:"hidden", textOverflow:"ellipsis",
                        whiteSpace:"nowrap", maxWidth:160 }}>{a.url}</div>
                    </TD>
                    <TD><Badge v="gray">{a.type||"—"}</Badge></TD>
                    <TD>
                      {cc ? (
                        <span style={{ fontSize:8, fontWeight:700, color:cc,
                          border:`1px solid ${cc}44`, borderRadius:2,
                          padding:"1px 6px" }}>{a.criticality}</span>
                      ) : (
                        <span style={{ fontSize:9, color:T.text3 }}>—</span>
                      )}
                    </TD>
                    <TD>
                      <div style={{ fontSize:9, color:T.text2 }}>{a.owner||"—"}</div>
                      {a.owner_email&&(
                        <div style={{ fontSize:8, color:T.text3 }}>{a.owner_email}</div>
                      )}
                    </TD>
                    <TD>
                      <Badge v={tlsN==="1.0"?"red":tlsN==="1.2"?"yellow":"green"}>
                        TLS {tlsN||"—"}
                      </Badge>
                    </TD>
                    <TD><Badge v={certVariant(a.cert)}>{a.cert||"—"}</Badge></TD>
                    <TD style={{ fontSize:10, color:keyColor(a.keylen) }}>
                      {a.keylen||"—"}
                    </TD>
                    <TD>
                      <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                        {scope.slice(0,3).map((s:string)=>(
                          <span key={s} style={{ fontSize:7, color:T.cyan,
                            border:`1px solid ${T.cyan}33`, borderRadius:2,
                            padding:"1px 4px" }}>{s}</span>
                        ))}
                        {scope.length>3&&(
                          <span style={{ fontSize:7, color:T.text3 }}>
                            +{scope.length-3}
                          </span>
                        )}
                        {scope.length===0&&(
                          <span style={{ fontSize:8, color:T.text3 }}>—</span>
                        )}
                      </div>
                    </TD>
                    <TD style={{ fontSize:9, color:T.text3 }}>{a.scan||"Never"}</TD>
                    <TD>
                      <button
                        onClick={()=>setExpandedRow(isOpen?null:i)}
                        style={{ ...S.btn, fontSize:8, padding:"2px 6px" }}>
                        {isOpen?"▲":"▼"}
                      </button>
                    </TD>
                  </TR>

                  {/* Expanded — business unit, financial exposure, cipher, notes */}
                  {isOpen&&(
                    <TR>
                      <td colSpan={10} style={{ padding:"0 12px 12px" }}>
                        <div style={{ display:"grid",
                          gridTemplateColumns:"repeat(4,1fr)", gap:8,
                          background:"rgba(59,130,246,0.03)",
                          border:"1px solid rgba(59,130,246,0.1)",
                          borderRadius:4, padding:12 }}>
                          {[
                            { label:"BUSINESS UNIT",
                              val: a.business_unit||"—",   color:T.text2  },
                            { label:"FINANCIAL EXPOSURE",
                              val: a.financial_exposure
                                ? `₹${Number(a.financial_exposure).toLocaleString("en-IN")}`
                                : "—",                      color:T.orange },
                            { label:"IP ADDRESS",
                              val: a.ip||"—",              color:T.text2  },
                            { label:"CIPHER",
                              val: a.cipher||"—",          color:T.text3  },
                          ].map(item=>(
                            <div key={item.label}>
                              <div style={{ fontSize:7, color:T.text3,
                                letterSpacing:".1em", marginBottom:3 }}>
                                {item.label}
                              </div>
                              <div style={{ fontSize:10, color:item.color,
                                fontFamily:"'Share Tech Mono',monospace",
                                overflow:"hidden", textOverflow:"ellipsis",
                                whiteSpace:"nowrap" }}>
                                {item.val}
                              </div>
                            </div>
                          ))}
                          {a.notes&&(
                            <div style={{ gridColumn:"1/-1" }}>
                              <div style={{ fontSize:7, color:T.text3,
                                letterSpacing:".1em", marginBottom:3 }}>NOTES</div>
                              <div style={{ fontSize:9, color:T.text3,
                                lineHeight:1.5 }}>{a.notes}</div>
                            </div>
                          )}
                        </div>
                      </td>
                    </TR>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length===0&&(
              <TR>
                <TD style={{ color:T.text3, fontSize:10 }}>No assets found</TD>
              </TR>
            )}
          </Table>
        )}

        <div style={{ padding:"8px 12px",
          borderTop:"1px solid rgba(59,130,246,0.07)",
          display:"flex", justifyContent:"space-between",
          alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <span style={{ fontSize:10, color:T.text3 }}>
            Showing <b style={{color:T.text2}}>{filtered.length}</b> of{" "}
            <b style={{color:T.text2}}>{assets.length}</b> assets
          </span>
          {!mobile&&(
            <span style={{ fontSize:9, color:T.text3 }}>
              ▼ expand row for financial exposure and cipher details
            </span>
          )}
        </div>
      </Panel>

      {/* ── CERT EXPIRY + CRYPTO OVERVIEW ── */}
      <div style={{ display:"grid",
        gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:mobile?8:10 }}>

        <Panel>
          <PanelHeader left="CERTIFICATE EXPIRY TIMELINE"/>
          <div style={{ padding:14 }}>
            {[
              { label:"0–30 Days",  count:certBuckets["0-30"],  color:T.red    },
              { label:"30–60 Days", count:certBuckets["30-60"], color:T.orange },
              { label:"60–90 Days", count:certBuckets["60-90"], color:T.yellow },
              { label:">90 Days",   count:certBuckets["90+"],   color:T.green  },
            ].map(row=>(
              <div key={row.label}
                style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:8, height:8, borderRadius:"50%",
                  background:row.color, boxShadow:`0 0 4px ${row.color}`,
                  flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    marginBottom:3 }}>
                    <span style={{ fontSize:10, color:T.text2 }}>{row.label}</span>
                    <span style={{ fontSize:10,
                      fontFamily:"'Orbitron',monospace",
                      color:row.color }}>{row.count}</span>
                  </div>
                  <ProgBar
                    pct={Math.round(row.count/Math.max(assets.length,1)*100)}
                    color={row.color}/>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader left="CRYPTO & SECURITY OVERVIEW"/>
          {mobile ? (
            <div style={{ maxHeight:220, overflowY:"auto" }}>
              {assets.filter(a=>a.tls&&a.tls!=="—").slice(0,10).map((a,i)=>{
                const tlsN=(a.tls||"").replace(/^TLSv?/i,"");
                return (
                  <div key={i} style={{ padding:"9px 14px",
                    borderBottom:"1px solid rgba(59,130,246,0.05)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      marginBottom:3 }}>
                      <span style={{ fontSize:11, color:T.blue }}>{a.name}</span>
                      <Badge v={tlsN==="1.0"?"red":tlsN==="1.2"?"yellow":"green"}>
                        TLS {tlsN}
                      </Badge>
                    </div>
                    <div style={{ fontSize:9, color:T.text3 }}>
                      {a.keylen} · {a.ca}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Table cols={["ASSET","KEY LEN","CIPHER SUITE","TLS","CA"]}>
              {assets.filter(a=>a.tls&&a.tls!=="—").slice(0,10).map((a,i)=>{
                const tlsN=(a.tls||"").replace(/^TLSv?/i,"");
                return (
                  <TR key={i}>
                    <TD style={{ fontSize:10, color:T.blue }}>{a.name}</TD>
                    <TD style={{ fontSize:10, color:keyColor(a.keylen) }}>{a.keylen}</TD>
                    <TD style={{ fontSize:9, color:T.text3, maxWidth:140,
                      overflow:"hidden", textOverflow:"ellipsis",
                      whiteSpace:"nowrap" }}>{a.cipher}</TD>
                    <TD>
                      <Badge v={tlsN==="1.0"?"red":tlsN==="1.2"?"yellow":"green"}>
                        TLS {tlsN}
                      </Badge>
                    </TD>
                    <TD style={{ fontSize:10, color:T.text3 }}>{a.ca}</TD>
                  </TR>
                );
              })}
            </Table>
          )}
        </Panel>
      </div>
    </div>
  );
}