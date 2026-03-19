import React, { useState, useEffect, useRef } from "react";
import {
  API, T, S, Panel, PanelHeader, MetricCard, Badge, ProgBar,
  Table, TR, TD, MOCK_ASSETS,
} from "./shared.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const ASSET_TYPES     = ["Web App","API","Server","Gateway","Core Banking",
                         "Internet Banking","Mobile Banking","Other"];
const CRITICALITY     = ["Critical","High","Medium","Low"];
const COMPLIANCE_OPTS = ["RBI","ISO27001","NIST","PCIDSS","SWIFT","DORA"];

const CRIT_COLOR: Record<string,string> = {
  Critical: T.red, High: T.orange, Medium: T.yellow, Low: T.green,
};

const EMPTY_FORM = {
  name:"", url:"", type:"Web App", criticality:"Medium",
  owner:"", owner_email:"", business_unit:"",
  financial_exposure:"", compliance_scope:[] as string[], notes:"",
};

// ── Breakpoints ───────────────────────────────────────────────────────────────
function useBreakpoint() {
  const get = () => window.innerWidth < 480 ? "mobile" as const
                  : window.innerWidth < 900 ? "tablet" as const : "desktop" as const;
  const [bp, setBp] = useState(get);
  useEffect(() => {
    const h = () => setBp(get());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return bp;
}

// ── Input / label styles ──────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: "rgba(59,130,246,0.06)",
  border: "1px solid rgba(59,130,246,0.2)",
  borderRadius: 3, color: T.text2,
  padding: "7px 10px", fontSize: 11,
  width: "100%", outline: "none", fontFamily: "inherit",
};
const labelStyle: React.CSSProperties = {
  fontSize: 8, color: T.text3,
  letterSpacing: ".12em", marginBottom: 4, display: "block",
};

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function AssetModal({ initial, onSave, onClose, saving }: {
  initial: typeof EMPTY_FORM;
  onSave:  (f: typeof EMPTY_FORM) => void;
  onClose: () => void;
  saving:  boolean;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleScope = (s: string) =>
    setForm(f => ({
      ...f,
      compliance_scope: f.compliance_scope.includes(s)
        ? f.compliance_scope.filter(x => x !== s)
        : [...f.compliance_scope, s],
    }));

  function validate() {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push("Domain is required");
    if (!form.url.trim())  errs.push("URL is required");
    if (!form.url.startsWith("http")) errs.push("URL must start with https://");
    if (["Critical","High"].includes(form.criticality) && !form.owner_email.trim())
      errs.push("Critical/High assets require an owner email");
    setErrors(errs);
    return errs.length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSave(form);
  }

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,0.75)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
    }}>
      <div style={{
        background:"#080c14",
        border:"1px solid rgba(59,130,246,0.25)",
        borderRadius:6,padding:24,width:"100%",maxWidth:560,
        maxHeight:"90vh",overflowY:"auto",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"center",marginBottom:20}}>
          <span style={{fontFamily:"'Orbitron',monospace",fontSize:12,
            color:T.blue,letterSpacing:".1em"}}>
            {initial.name ? "EDIT ASSET" : "ADD ASSET"}
          </span>
          <button onClick={onClose} style={{...S.btn,padding:"2px 8px"}}>✕</button>
        </div>

        {errors.length > 0 && (
          <div style={{background:"rgba(239,68,68,0.08)",
            border:"1px solid rgba(239,68,68,0.3)",
            borderRadius:3,padding:"8px 12px",marginBottom:16}}>
            {errors.map((e,i) => (
              <div key={i} style={{fontSize:10,color:T.red}}>• {e}</div>
            ))}
          </div>
        )}

        <form onSubmit={submit}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>DOMAIN *</label>
              <input style={inputStyle} placeholder="pnb.bank.in" value={form.name}
                onChange={e => {
                  const v = e.target.value.replace(/^https?:\/\//,"").replace(/\/.*$/,"");
                  set("name", v);
                  if (!form.url) set("url", `https://${v}`);
                }}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>URL *</label>
              <input style={inputStyle} placeholder="https://pnb.bank.in"
                value={form.url} onChange={e => set("url", e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>TYPE</label>
              <select style={inputStyle} value={form.type}
                onChange={e => set("type", e.target.value)}>
                {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>CRITICALITY</label>
              <select style={{...inputStyle,color:CRIT_COLOR[form.criticality]??T.text2}}
                value={form.criticality}
                onChange={e => set("criticality", e.target.value)}>
                {CRITICALITY.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>OWNER</label>
              <input style={inputStyle} placeholder="CISO"
                value={form.owner} onChange={e => set("owner", e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>
                OWNER EMAIL
                {["Critical","High"].includes(form.criticality) &&
                  <span style={{color:T.red}}> *</span>}
              </label>
              <input style={inputStyle} placeholder="security@bank.co.in"
                type="email" value={form.owner_email}
                onChange={e => set("owner_email", e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>BUSINESS UNIT</label>
              <input style={inputStyle} placeholder="Retail Banking"
                value={form.business_unit}
                onChange={e => set("business_unit", e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>FINANCIAL EXPOSURE (₹)</label>
              <input style={inputStyle} placeholder="500000000" type="number"
                value={form.financial_exposure}
                onChange={e => set("financial_exposure", e.target.value)}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>COMPLIANCE SCOPE</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {COMPLIANCE_OPTS.map(s => {
                  const active = form.compliance_scope.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleScope(s)}
                      style={{
                        fontSize:9,padding:"3px 10px",borderRadius:2,
                        border:`1px solid ${active?T.blue:"rgba(59,130,246,0.2)"}`,
                        background:active?"rgba(59,130,246,0.15)":"transparent",
                        color:active?T.blue:T.text3,cursor:"pointer",
                      }}>{s}</button>
                  );
                })}
              </div>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>NOTES</label>
              <textarea style={{...inputStyle,minHeight:60,resize:"vertical"}}
                placeholder="Main internet banking portal..."
                value={form.notes}
                onChange={e => set("notes", e.target.value)}/>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20}}>
            <button type="button" onClick={onClose} style={S.btn}>CANCEL</button>
            <button type="submit" disabled={saving}
              style={{...S.btn,background:"rgba(59,130,246,0.2)",
                borderColor:"rgba(59,130,246,0.5)",color:T.blue,
                opacity:saving?0.6:1}}>
              {saving ? "SAVING..." : initial.name ? "UPDATE" : "ADD ASSET"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm deactivate ────────────────────────────────────────────────────────
function ConfirmDialog({ name, onConfirm, onCancel }: {
  name: string; onConfirm:()=>void; onCancel:()=>void;
}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:101,background:"rgba(0,0,0,0.8)",
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#080c14",border:"1px solid rgba(239,68,68,0.3)",
        borderRadius:6,padding:24,maxWidth:360,width:"100%"}}>
        <div style={{fontSize:12,color:T.red,fontWeight:700,marginBottom:12}}>
          DEACTIVATE ASSET
        </div>
        <div style={{fontSize:11,color:T.text2,marginBottom:20,lineHeight:1.6}}>
          Deactivate <b style={{color:T.blue}}>{name}</b>?
          Data is retained for audit trail.
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={S.btn}>CANCEL</button>
          <button onClick={onConfirm} style={{...S.btn,
            background:"rgba(239,68,68,0.15)",
            borderColor:"rgba(239,68,68,0.4)",color:T.red}}>
            DEACTIVATE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AssetInventoryPage() {
  const bp        = useBreakpoint();
  const isMobile  = bp === "mobile";
  const isDesktop = bp === "desktop";

  // ── Chart refs ──────────────────────────────────────────────────────────────
  const typeRef    = useRef<HTMLCanvasElement>(null);
  const riskRef    = useRef<HTMLCanvasElement>(null);
  const legendRef  = useRef<HTMLDivElement>(null);

  // ── State ───────────────────────────────────────────────────────────────────
  const [assets,      setAssets]      = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<"add"|"edit"|null>(null);
  const [editTarget,  setEditTarget]  = useState<any>(null);
  const [saving,      setSaving]      = useState(false);
  const [scanning,    setScanning]    = useState<number|null>(null);
  const [confirmId,   setConfirmId]   = useState<number|null>(null);
  const [toast,       setToast]       = useState<{msg:string;ok:boolean}|null>(null);
  const [search,      setSearch]      = useState("");
  const [filterCrit,  setFilterCrit]  = useState("All");
  const [riskCounts,  setRiskCounts]  = useState({Critical:0,High:0,Medium:0,Low:0});
  const [certBuckets, setCertBuckets] = useState({"0-30":0,"30-60":0,"60-90":0,"90+":0});
  const [byType,      setByType]      = useState<Record<string,number>>({});

  // ── Toast helper ─────────────────────────────────────────────────────────────
  function showToast(msg: string, ok = true) {
    setToast({msg,ok});
    setTimeout(() => setToast(null), 3500);
  }

  // ── Load ─────────────────────────────────────────────────────────────────────
  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/assets`);
      const d = await r.json();
      const list = d.assets ?? [];
      setAssets(list);
      setRiskCounts(d.risk_counts ?? riskCounts);
      setCertBuckets(d.cert_buckets ?? certBuckets);
      setByType(d.by_type ?? {});
    } catch {
      showToast("Failed to load assets", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { drawTypeChart(); drawRiskChart(); }, [assets, riskCounts, byType, bp]);

  // ── Charts ────────────────────────────────────────────────────────────────────
  function drawTypeChart() {
    const c = typeRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = 140, H = 140, cx = 70, cy = 70, r = 50;
    const data = [
      {label:"Web App",         val:byType["Web App"]||byType["Web Apps"]||0, color:T.blue  },
      {label:"API",             val:byType["API"]||byType["APIs"]||0,          color:T.cyan  },
      {label:"Server",          val:byType["Server"]||byType["Servers"]||0,    color:"rgba(200,220,255,0.5)"},
      {label:"Core Banking",    val:byType["Core Banking"]||0,                 color:T.green },
      {label:"Internet Banking",val:byType["Internet Banking"]||0,             color:T.yellow},
      {label:"Other",           val:byType["Other"]||0,                        color:"rgba(100,116,139,0.5)"},
    ].filter(d => d.val > 0);
    const fallback = data.length === 0;
    const display  = fallback
      ? [{label:"Web App",val:1,color:T.blue}]
      : data;
    const total = display.reduce((a,d)=>a+d.val,0);
    let angle = -Math.PI/2;
    ctx.clearRect(0,0,W,H);
    display.forEach(d => {
      const sweep = 2*Math.PI*(d.val/total)-0.04;
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
    const W = c.offsetWidth||280, H = 140;
    c.width = W;
    const bars = [
      {label:"Critical",val:riskCounts.Critical,color:T.red   },
      {label:"High",    val:riskCounts.High,    color:T.orange},
      {label:"Medium",  val:riskCounts.Medium,  color:T.yellow},
      {label:"Low",     val:riskCounts.Low,     color:T.green },
    ];
    const max = Math.max(...bars.map(b=>b.val),1);
    const bw=isMobile?28:36, gap=isMobile?14:22;
    const startX=(W-(bars.length*(bw+gap)-gap))/2;
    ctx.clearRect(0,0,W,H);
    bars.forEach((b,i)=>{
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

  // ── CRUD handlers ─────────────────────────────────────────────────────────────
  async function handleSave(form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const isEdit = modal==="edit" && editTarget?.id;
      const url    = isEdit ? `${API}/assets/${editTarget.id}` : `${API}/assets`;
      const method = isEdit ? "PUT" : "POST";
      const body: any = {...form};
      if (body.financial_exposure==="") body.financial_exposure=null;
      else if (body.financial_exposure) body.financial_exposure=parseInt(body.financial_exposure);
      const r = await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d = await r.json();
      if (!r.ok) {
        const detail = Array.isArray(d.detail)?d.detail.join(" · "):d.detail;
        showToast(detail,false); return;
      }
      showToast(isEdit?`Updated ${form.name}`:`Added ${form.name}`);
      setModal(null); setEditTarget(null);
      await load();
    } catch { showToast("Save failed",false); }
    finally { setSaving(false); }
  }

  async function handleScan(id: number, name: string) {
    setScanning(id);
    try {
      const r = await fetch(`${API}/assets/${id}/scan`,{method:"POST"});
      const d = await r.json();
      if (d.status==="scanned") showToast(`Scanned ${name} — TLS ${d.tls_version??""}`);
      else showToast(`Scan failed: ${d.error??"unknown"}`,false);
      await load();
    } catch { showToast("Scan failed",false); }
    finally { setScanning(null); }
  }

  async function handleDelete(id: number) {
    try {
      const r = await fetch(`${API}/assets/${id}`,{method:"DELETE"});
      const d = await r.json();
      if (r.ok) showToast(`Deactivated ${d.name}`);
      else showToast(d.detail??"Delete failed",false);
      setConfirmId(null);
      await load();
    } catch { showToast("Deactivate failed",false); }
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const filtered = assets.filter(a => {
    const ms = !search
      || a.name?.toLowerCase().includes(search.toLowerCase())
      || a.owner?.toLowerCase().includes(search.toLowerCase())
      || a.business_unit?.toLowerCase().includes(search.toLowerCase());
    const mc = filterCrit==="All" || a.criticality===filterCrit;
    return ms && mc;
  });

  const stats = {
    total:    assets.length,
    critical: assets.filter(a=>a.criticality==="Critical").length,
    noOwner:  assets.filter(a=>!a.owner_email).length,
    expiring: assets.filter(a=>a.days_left!=null&&a.days_left<30).length,
  };

  const confirmAsset = assets.find(a=>a.id===confirmId);

  const keyColor  = (k:string) => k?.startsWith("1024")?T.red:k?.startsWith("2048")?T.yellow:T.green;
  const certColor = (c:string) => c==="Expired"?T.red:c==="Expiring"?T.orange:T.green;

  return (
    <div style={S.page}>

      {/* Toast */}
      {toast&&(
        <div style={{
          position:"fixed",bottom:24,right:24,zIndex:200,
          background:toast.ok?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)",
          border:`1px solid ${toast.ok?T.green:T.red}`,
          borderRadius:4,padding:"10px 16px",
          fontSize:11,color:toast.ok?T.green:T.red,
          boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {toast.ok?"✓":"✗"} {toast.msg}
        </div>
      )}

      {/* Modals */}
      {modal&&(
        <AssetModal
          initial={modal==="edit"&&editTarget?{
            name:               editTarget.name??               "",
            url:                editTarget.url??                "",
            type:               editTarget.type??               "Web App",
            criticality:        editTarget.criticality??        "Medium",
            owner:              editTarget.owner??              "",
            owner_email:        editTarget.owner_email??        "",
            business_unit:      editTarget.business_unit??      "",
            financial_exposure: editTarget.financial_exposure?.toString()??"",
            compliance_scope:   editTarget.compliance_scope??   [],
            notes:              editTarget.notes??              "",
          }:EMPTY_FORM}
          onSave={handleSave}
          onClose={()=>{setModal(null);setEditTarget(null);}}
          saving={saving}
        />
      )}

      {confirmId&&confirmAsset&&(
        <ConfirmDialog
          name={confirmAsset.name}
          onConfirm={()=>handleDelete(confirmId)}
          onCancel={()=>setConfirmId(null)}
        />
      )}

      {/* ── METRICS ── */}
      <div style={{display:"grid",
        gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:9}}>
        <MetricCard label="TOTAL ASSETS"  value={stats.total}    sub="Registered"      color={T.blue}  />
        <MetricCard label="CRITICAL"      value={stats.critical} sub="High priority"   color={T.red}   />
        <MetricCard label="NO OWNER"      value={stats.noOwner}  sub="Unassigned"      color={T.orange}/>
        <MetricCard label="CERT EXPIRING" value={stats.expiring} sub="Within 30 days"  color={T.yellow}/>
      </div>

      {/* ── CHARTS ── */}
      <div style={{display:"grid",
        gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?8:10}}>

        <Panel>
          <PanelHeader left="ASSET TYPE DISTRIBUTION"/>
          <div style={{padding:14,display:"flex",gap:16,alignItems:"center"}}>
            <canvas ref={typeRef} width={140} height={140}/>
            <div ref={legendRef} style={{display:"flex",flexDirection:"column",gap:7,flex:1}}/>
          </div>
        </Panel>

        <Panel>
          <PanelHeader left="CRITICALITY DISTRIBUTION"
            right={<span style={{fontFamily:"'Orbitron',monospace",fontSize:20,color:T.red}}>
              {riskCounts.Critical+riskCounts.High}
              <span style={{fontSize:12}}> high</span>
            </span>}
          />
          <div style={{padding:14}}>
            <canvas ref={riskRef} width={280} height={140} style={{width:"100%"}}/>
          </div>
        </Panel>
      </div>

      {/* ── MAIN REGISTRY TABLE ── */}
      <Panel>
        <PanelHeader
          left="ASSET REGISTRY"
          right={
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search domain / owner..."
                style={{...S.input,fontSize:10,width:isMobile?120:180}}/>
              <select value={filterCrit} onChange={e=>setFilterCrit(e.target.value)}
                style={{...S.input,fontSize:10,cursor:"pointer",
                  color:filterCrit==="All"?T.text2:CRIT_COLOR[filterCrit]??T.text2}}>
                <option value="All">All</option>
                {CRITICALITY.map(c=><option key={c}>{c}</option>)}
              </select>
              <button onClick={()=>setModal("add")}
                style={{...S.btn,fontSize:isMobile?9:11,
                  background:"rgba(59,130,246,0.15)",
                  borderColor:"rgba(59,130,246,0.4)",
                  color:T.blue}}>
                + ADD ASSET
              </button>
            </div>
          }
        />

        {/* Desktop table */}
        {isDesktop&&(
          <Table cols={["DOMAIN","TYPE","CRITICALITY","OWNER","TLS","CERT",
            "KEY LEN","KX GROUP","COMPLIANCE","LAST SCAN",""]}>
            {loading ? (
              <TR><TD style={{color:T.text3,fontSize:10}}>Loading...</TD></TR>
            ) : filtered.length===0 ? (
              <TR><TD style={{color:T.text3,fontSize:10}}>
                {assets.length===0
                  ? "No assets registered — click + ADD ASSET to begin"
                  : "No assets match filter"}
              </TD></TR>
            ) : filtered.map((a,i)=>{
              const critColor = CRIT_COLOR[a.criticality]??T.text2;
              const scope     = Array.isArray(a.compliance_scope)?a.compliance_scope:[];
              // Normalise TLS version
              const tlsNorm   = (a.tls||"").replace(/^TLSv?/i,"");
              const tlsColor  = tlsNorm==="1.0"?T.red:tlsNorm==="1.2"?T.yellow:T.green;
              // PQC KX group display
              const kxg       = a.key_exchange_group||"—";
              const isECDHE   = ["x25519","p-256","p-384","secp256r1","secp384r1"]
                .includes(kxg.toLowerCase());
              const isKyber   = /kyber|mlkem|hybrid/i.test(kxg);
              const kxColor   = isKyber?T.green:isECDHE?T.yellow:T.text3;
              return (
                <TR key={a.id??i}>
                  <TD style={{color:T.blue,fontSize:10}}>{a.name}</TD>
                  <TD style={{fontSize:9,color:T.text3}}>{a.type}</TD>
                  <TD>
                    <span style={{fontSize:8,fontWeight:700,color:critColor,
                      border:`1px solid ${critColor}44`,
                      borderRadius:2,padding:"1px 6px"}}>
                      {a.criticality}
                    </span>
                  </TD>
                  <TD>
                    <div style={{fontSize:9,color:T.text2}}>{a.owner}</div>
                    {a.owner_email&&(
                      <div style={{fontSize:8,color:T.text3}}>{a.owner_email}</div>
                    )}
                  </TD>
                  <TD>
                    <Badge v={tlsNorm==="1.0"?"red":tlsNorm==="1.2"?"yellow":"green"}>
                      TLS {tlsNorm||"—"}
                    </Badge>
                  </TD>
                  <TD style={{fontSize:9,color:certColor(a.cert)}}>{a.cert||"—"}</TD>
                  <TD style={{fontSize:9,color:keyColor(a.keylen)}}>{a.keylen||"—"}</TD>
                  <TD style={{fontSize:9,color:kxColor,
                    fontFamily:"'Share Tech Mono',monospace"}}>
                    {isKyber
                      ? <span style={{fontSize:7,fontWeight:600,color:T.green,
                          border:`1px solid ${T.green}44`,borderRadius:2,
                          padding:"1px 5px"}}>PQC ACTIVE</span>
                      : isECDHE
                        ? <span style={{fontSize:7,fontWeight:600,color:T.yellow,
                            border:`1px solid ${T.yellow}44`,borderRadius:2,
                            padding:"1px 5px"}}>ECDHE READY</span>
                        : <span style={{color:T.text3}}>{kxg}</span>}
                  </TD>
                  <TD>
                    <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                      {scope.slice(0,3).map((s:string)=>(
                        <span key={s} style={{fontSize:7,color:T.cyan,
                          border:`1px solid ${T.cyan}33`,borderRadius:2,
                          padding:"1px 4px"}}>{s}</span>
                      ))}
                      {scope.length>3&&(
                        <span style={{fontSize:7,color:T.text3}}>+{scope.length-3}</span>
                      )}
                    </div>
                  </TD>
                  <TD style={{fontSize:9,color:T.text3}}>{a.scan||"Never"}</TD>
                  <TD>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>handleScan(a.id,a.name)}
                        disabled={scanning===a.id}
                        style={{...S.btn,fontSize:8,padding:"2px 6px",
                          opacity:scanning===a.id?0.5:1}}>
                        {scanning===a.id?"⟳":"⟳ SCAN"}
                      </button>
                      <button onClick={()=>{setEditTarget(a);setModal("edit");}}
                        style={{...S.btn,fontSize:8,padding:"2px 6px"}}>EDIT</button>
                      <button onClick={()=>setConfirmId(a.id)}
                        style={{...S.btn,fontSize:8,padding:"2px 6px",
                          color:T.red,borderColor:"rgba(239,68,68,0.3)"}}>✕</button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </Table>
        )}

        {/* Mobile / tablet cards */}
        {!isDesktop&&(
          <div style={{maxHeight:520,overflowY:"auto"}}>
            {loading&&<div style={{padding:20,fontSize:10,color:T.text3,textAlign:"center"}}>Loading...</div>}
            {!loading&&filtered.length===0&&(
              <div style={{padding:20,fontSize:10,color:T.text3,textAlign:"center"}}>
                {assets.length===0?"No assets yet — tap + ADD ASSET":"No assets match filter"}
              </div>
            )}
            {filtered.map((a,i)=>{
              const critColor = CRIT_COLOR[a.criticality]??T.text2;
              const scope     = Array.isArray(a.compliance_scope)?a.compliance_scope:[];
              const tlsNorm   = (a.tls||"").replace(/^TLSv?/i,"");
              const kxg       = a.key_exchange_group||"";
              const isECDHE   = ["x25519","p-256","p-384","secp256r1"].includes(kxg.toLowerCase());
              const isKyber   = /kyber|mlkem|hybrid/i.test(kxg);
              return (
                <div key={a.id??i} style={{borderBottom:"1px solid rgba(59,130,246,0.06)",
                  padding:"12px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"flex-start",marginBottom:8}}>
                    <div>
                      <div style={{fontSize:12,color:T.blue,marginBottom:3}}>{a.name}</div>
                      <span style={{fontSize:8,fontWeight:700,color:critColor,
                        border:`1px solid ${critColor}44`,borderRadius:2,
                        padding:"1px 6px"}}>{a.criticality}</span>
                      {isKyber&&<span style={{fontSize:7,fontWeight:600,color:T.green,
                        border:`1px solid ${T.green}44`,borderRadius:2,
                        padding:"1px 5px",marginLeft:4}}>PQC</span>}
                      {!isKyber&&isECDHE&&<span style={{fontSize:7,fontWeight:600,
                        color:T.yellow,border:`1px solid ${T.yellow}44`,
                        borderRadius:2,padding:"1px 5px",marginLeft:4}}>ECDHE</span>}
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>handleScan(a.id,a.name)}
                        disabled={scanning===a.id}
                        style={{...S.btn,fontSize:8,padding:"2px 6px"}}>
                        {scanning===a.id?"…":"⟳"}
                      </button>
                      <button onClick={()=>{setEditTarget(a);setModal("edit");}}
                        style={{...S.btn,fontSize:8,padding:"2px 6px"}}>EDIT</button>
                      <button onClick={()=>setConfirmId(a.id)}
                        style={{...S.btn,fontSize:8,padding:"2px 6px",
                          color:T.red,borderColor:"rgba(239,68,68,0.3)"}}>✕</button>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {[
                      {label:"TYPE",   val:a.type,             color:T.text2},
                      {label:"OWNER",  val:a.owner||"—",       color:T.text2},
                      {label:"TLS",    val:`TLS ${tlsNorm||"—"}`,
                       color:tlsNorm==="1.3"?T.green:T.orange},
                      {label:"CERT",   val:a.cert||"—",        color:certColor(a.cert)},
                      {label:"KEY",    val:a.keylen||"—",      color:keyColor(a.keylen)},
                      {label:"SCANNED",val:a.scan||"Never",    color:T.text3},
                    ].map(item=>(
                      <div key={item.label} style={{background:"rgba(59,130,246,0.03)",
                        border:"1px solid rgba(59,130,246,0.08)",
                        borderRadius:3,padding:"5px 8px"}}>
                        <div style={{fontSize:7,color:T.text3,
                          letterSpacing:".1em",marginBottom:2}}>{item.label}</div>
                        <div style={{fontSize:10,color:item.color}}>{item.val}</div>
                      </div>
                    ))}
                  </div>
                  {scope.length>0&&(
                    <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:8}}>
                      {scope.map((s:string)=>(
                        <span key={s} style={{fontSize:7,color:T.cyan,
                          border:`1px solid ${T.cyan}33`,borderRadius:2,
                          padding:"1px 5px"}}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{padding:"8px 12px",
          borderTop:"1px solid rgba(59,130,246,0.07)",
          display:"flex",justifyContent:"space-between",
          alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:T.text3}}>
            <b style={{color:T.text2}}>{filtered.length}</b> of{" "}
            <b style={{color:T.text2}}>{assets.length}</b> assets
            {stats.noOwner>0&&(
              <span style={{color:T.orange}}>
                {" "}· <b>{stats.noOwner}</b> without owner
              </span>
            )}
          </span>
          {!isMobile&&(
            <span style={{fontSize:9,color:T.text3}}>
              REBEL scans registered assets automatically
            </span>
          )}
        </div>
      </Panel>

      {/* ── CERT EXPIRY + CRYPTO OVERVIEW ── */}
      <div style={{display:"grid",
        gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?8:10}}>

        <Panel>
          <PanelHeader left="CERTIFICATE EXPIRY TIMELINE"/>
          <div style={{padding:14}}>
            {[
              {label:"0–30 Days",  count:certBuckets["0-30"],  color:T.red   },
              {label:"30–60 Days", count:certBuckets["30-60"], color:T.orange},
              {label:"60–90 Days", count:certBuckets["60-90"], color:T.yellow},
              {label:">90 Days",   count:certBuckets["90+"],   color:T.green },
            ].map(row=>(
              <div key={row.label}
                style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",
                  background:row.color,boxShadow:`0 0 4px ${row.color}`,
                  flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:10,color:T.text2}}>{row.label}</span>
                    <span style={{fontSize:10,fontFamily:"'Orbitron',monospace",
                      color:row.color}}>{row.count}</span>
                  </div>
                  <ProgBar pct={Math.round(row.count/Math.max(assets.length,1)*100)}
                    color={row.color}/>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader left="CRYPTO & SECURITY OVERVIEW"/>
          {isDesktop ? (
            <Table cols={["ASSET","KEY LEN","KX GROUP","TLS","COMPLIANCE","CA"]}>
              {assets.filter(a=>a.tls&&a.tls!=="—").slice(0,10).map((a,i)=>{
                const tlsNorm = (a.tls||"").replace(/^TLSv?/i,"");
                const kxg     = a.key_exchange_group||"—";
                const isKyber = /kyber|mlkem|hybrid/i.test(kxg);
                const isECDHE = ["x25519","p-256","secp256r1","secp384r1"]
                  .includes(kxg.toLowerCase());
                const scope   = Array.isArray(a.compliance_scope)?a.compliance_scope:[];
                return (
                  <TR key={i}>
                    <TD style={{fontSize:10,color:T.blue}}>{a.name}</TD>
                    <TD style={{fontSize:10,color:keyColor(a.keylen)}}>{a.keylen||"—"}</TD>
                    <TD style={{fontSize:9}}>
                      {isKyber
                        ? <span style={{fontSize:7,color:T.green,
                            border:`1px solid ${T.green}44`,borderRadius:2,
                            padding:"1px 5px"}}>PQC ACTIVE</span>
                        : isECDHE
                          ? <span style={{fontSize:7,color:T.yellow,
                              border:`1px solid ${T.yellow}44`,borderRadius:2,
                              padding:"1px 5px"}}>ECDHE READY</span>
                          : <span style={{color:T.text3,
                              fontFamily:"'Share Tech Mono',monospace",
                              fontSize:9}}>{kxg}</span>}
                    </TD>
                    <TD>
                      <Badge v={tlsNorm==="1.0"?"red":tlsNorm==="1.2"?"yellow":"green"}>
                        TLS {tlsNorm}
                      </Badge>
                    </TD>
                    <TD>
                      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                        {scope.slice(0,2).map((s:string)=>(
                          <span key={s} style={{fontSize:7,color:T.cyan,
                            border:`1px solid ${T.cyan}33`,borderRadius:2,
                            padding:"1px 4px"}}>{s}</span>
                        ))}
                      </div>
                    </TD>
                    <TD style={{fontSize:9,color:T.text3,maxWidth:120,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.ca}</TD>
                  </TR>
                );
              })}
            </Table>
          ) : (
            <div style={{maxHeight:220,overflowY:"auto"}}>
              {assets.filter(a=>a.tls&&a.tls!=="—").slice(0,10).map((a,i)=>{
                const tlsNorm = (a.tls||"").replace(/^TLSv?/i,"");
                return (
                  <div key={i} style={{padding:"9px 14px",
                    borderBottom:"1px solid rgba(59,130,246,0.05)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11,color:T.blue}}>{a.name}</span>
                      <Badge v={tlsNorm==="1.0"?"red":tlsNorm==="1.2"?"yellow":"green"}>
                        TLS {tlsNorm}
                      </Badge>
                    </div>
                    <div style={{fontSize:9,color:T.text3}}>
                      {a.keylen} · {a.ca}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}