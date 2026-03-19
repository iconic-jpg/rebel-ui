import React, { useState, useEffect, useRef } from "react";
import {
  API, T, S, Panel, PanelHeader, MetricCard, Badge, ProgBar,
  Table, TR, TD, MOCK_ASSETS,
} from "./shared.js";

type Asset = typeof MOCK_ASSETS[0];

const ASSET_TYPES     = ["Web App","API","Server","Gateway","Core Banking","Internet Banking","Mobile Banking","Other"];
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

function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function AssetModal({ initial, onSave, onClose, saving }: {
  initial: typeof EMPTY_FORM;
  onSave:  (f: typeof EMPTY_FORM) => void;
  onClose: () => void;
  saving:  boolean;
}) {
  const [form,   setForm]   = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  function toggleScope(s: string) {
    setForm(f => ({
      ...f,
      compliance_scope: f.compliance_scope.includes(s)
        ? f.compliance_scope.filter(x => x !== s)
        : [...f.compliance_scope, s],
    }));
  }

  function validate() {
    const e: string[] = [];
    if (!form.name.trim()) e.push("Domain is required");
    if (!form.url.startsWith("http")) e.push("URL must start with https://");
    if (["Critical","High"].includes(form.criticality) && !form.owner_email.trim())
      e.push("Critical/High assets require an owner email");
    setErrors(e);
    return e.length === 0;
  }

  const inp: React.CSSProperties = {
    background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.2)",
    borderRadius:3, color:T.text2, padding:"7px 10px", fontSize:11,
    width:"100%", outline:"none", fontFamily:"inherit",
  };
  const lbl: React.CSSProperties = {
    fontSize:8, color:T.text3, letterSpacing:".12em", marginBottom:4, display:"block",
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.75)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#080c14", border:"1px solid rgba(59,130,246,0.25)",
        borderRadius:6, padding:24, width:"100%", maxWidth:540,
        maxHeight:"90vh", overflowY:"auto" }}>

        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:20 }}>
          <span style={{ fontFamily:"'Orbitron',monospace", fontSize:11,
            color:T.blue, letterSpacing:".1em" }}>
            {initial.name ? "EDIT ASSET" : "REGISTER ASSET"}
          </span>
          <button onClick={onClose} style={{ ...S.btn, padding:"2px 8px" }}>✕</button>
        </div>

        {errors.length > 0 && (
          <div style={{ background:"rgba(239,68,68,0.08)",
            border:"1px solid rgba(239,68,68,0.3)",
            borderRadius:3, padding:"8px 12px", marginBottom:16 }}>
            {errors.map((e,i) => <div key={i} style={{fontSize:10,color:T.red}}>• {e}</div>)}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>DOMAIN *</label>
            <input style={inp} placeholder="pnb.bank.in" value={form.name}
              onChange={e => {
                const v = e.target.value.replace(/^https?:\/\//,"").replace(/\/.*$/,"");
                set("name", v);
                if (!form.url) set("url", `https://${v}`);
              }}/>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>URL *</label>
            <input style={inp} placeholder="https://pnb.bank.in" value={form.url}
              onChange={e => set("url", e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>TYPE</label>
            <select style={inp} value={form.type}
              onChange={e => set("type", e.target.value)}>
              {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>CRITICALITY</label>
            <select style={{ ...inp, color:CRIT_COLOR[form.criticality]??T.text2 }}
              value={form.criticality}
              onChange={e => set("criticality", e.target.value)}>
              {CRITICALITY.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>OWNER</label>
            <input style={inp} placeholder="CISO" value={form.owner}
              onChange={e => set("owner", e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>
              OWNER EMAIL
              {["Critical","High"].includes(form.criticality) &&
                <span style={{color:T.red}}> *</span>}
            </label>
            <input style={inp} type="email" placeholder="security@bank.co.in"
              value={form.owner_email}
              onChange={e => set("owner_email", e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>BUSINESS UNIT</label>
            <input style={inp} placeholder="Retail Banking"
              value={form.business_unit}
              onChange={e => set("business_unit", e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>FINANCIAL EXPOSURE (₹)</label>
            <input style={inp} type="number" placeholder="500000000"
              value={form.financial_exposure}
              onChange={e => set("financial_exposure", e.target.value)}/>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>COMPLIANCE SCOPE</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {COMPLIANCE_OPTS.map(s => {
                const on = form.compliance_scope.includes(s);
                return (
                  <button key={s} type="button" onClick={() => toggleScope(s)} style={{
                    fontSize:9, padding:"3px 10px", borderRadius:2, cursor:"pointer",
                    border:`1px solid ${on?T.blue:"rgba(59,130,246,0.2)"}`,
                    background: on?"rgba(59,130,246,0.15)":"transparent",
                    color: on?T.blue:T.text3,
                  }}>{s}</button>
                );
              })}
            </div>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>NOTES</label>
            <textarea style={{ ...inp, minHeight:56, resize:"vertical" }}
              placeholder="Main internet banking portal..."
              value={form.notes}
              onChange={e => set("notes", e.target.value)}/>
          </div>
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:20 }}>
          <button onClick={onClose} style={S.btn}>CANCEL</button>
          <button disabled={saving}
            onClick={() => { if (validate()) onSave(form); }}
            style={{ ...S.btn, background:"rgba(59,130,246,0.2)",
              borderColor:"rgba(59,130,246,0.5)", color:T.blue,
              opacity:saving?0.6:1 }}>
            {saving?"SAVING...":initial.name?"UPDATE":"REGISTER"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm deactivate ────────────────────────────────────────────────────────
function ConfirmDialog({ name, onConfirm, onCancel }: {
  name:string; onConfirm:()=>void; onCancel:()=>void;
}) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:101, background:"rgba(0,0,0,0.8)",
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#080c14", border:"1px solid rgba(239,68,68,0.3)",
        borderRadius:6, padding:24, maxWidth:360, width:"100%" }}>
        <div style={{ fontSize:12, color:T.red, fontWeight:700, marginBottom:12 }}>
          DEACTIVATE ASSET
        </div>
        <div style={{ fontSize:11, color:T.text2, marginBottom:20, lineHeight:1.6 }}>
          Deactivate <b style={{color:T.blue}}>{name}</b>?
          Data is retained for audit trail.
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={S.btn}>CANCEL</button>
          <button onClick={onConfirm} style={{ ...S.btn,
            background:"rgba(239,68,68,0.15)",
            borderColor:"rgba(239,68,68,0.4)", color:T.red }}>
            DEACTIVATE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AssetInventoryPage() {
  const [assets,      setAssets]      = useState<any[]>(MOCK_ASSETS);
  const [query,       setQuery]       = useState("");
  const [scanning,    setScanning]    = useState(false);
  const [scanningId,  setScanningId]  = useState<number|null>(null);
  const [modal,       setModal]       = useState<"add"|"edit"|null>(null);
  const [editTarget,  setEditTarget]  = useState<any>(null);
  const [saving,      setSaving]      = useState(false);
  const [confirmId,   setConfirmId]   = useState<number|null>(null);
  const [toast,       setToast]       = useState<{msg:string;ok:boolean}|null>(null);
  const [filterCrit,  setFilterCrit]  = useState("All");
  const [expandedRow, setExpandedRow] = useState<number|null>(null);

  const typeRef   = useRef<HTMLCanvasElement>(null);
  const riskRef   = useRef<HTMLCanvasElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);

  const [riskCounts,  setRiskCounts]  = useState({ Critical:0, High:0, Medium:0, Low:0 });
  const [certBuckets, setCertBuckets] = useState({ "0-30":0, "30-60":0, "60-90":0, "90+":0 });
  const [byType,      setByType]      = useState({ "Web Apps":0, APIs:0, Servers:0, LB:0, Other:0 });

  const mobile = useMobile();

  // ── Load ──────────────────────────────────────────────────────────────────
  async function load() {
    try {
      const r = await fetch(`${API}/assets`);
      const d = await r.json();
      if (d?.assets?.length) {
        setAssets(d.assets);
        setRiskCounts(d.risk_counts  || riskCounts);
        setCertBuckets(d.cert_buckets|| certBuckets);
        setByType(d.by_type          || byType);
      }
    } catch {}
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { drawTypeChart(); drawRiskChart(); }, [assets, riskCounts, mobile]);

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Charts ────────────────────────────────────────────────────────────────
  function drawTypeChart() {
    const c = typeRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W=140, H=140, cx=70, cy=70, r=50, gap=0.05;
    const data = [
      { label:"Web Apps", val:byType["Web Apps"]||42, color:T.blue   },
      { label:"APIs",     val:byType["APIs"]     ||26, color:"#a855f7"},
      { label:"Servers",  val:byType["Servers"]  ||37, color:"rgba(200,220,255,0.5)"},
      { label:"LB",       val:byType["LB"]       ||11, color:T.cyan  },
      { label:"Other",    val:byType["Other"]    ||12, color:"rgba(100,116,139,0.5)"},
    ];
    const total = data.reduce((a,d)=>a+d.val,0);
    let angle = -Math.PI/2;
    ctx.clearRect(0,0,W,H);
    data.forEach(d => {
      const sweep = 2*Math.PI*(d.val/total)-gap;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,angle,angle+sweep);
      ctx.fillStyle=d.color; ctx.fill();
      angle += 2*Math.PI*(d.val/total);
    });
    ctx.beginPath(); ctx.arc(cx,cy,28,0,Math.PI*2);
    ctx.fillStyle="#080c14"; ctx.fill();
    ctx.fillStyle="rgba(200,220,255,0.85)";
    ctx.font="bold 13px Orbitron,monospace"; ctx.textAlign="center";
    ctx.fillText(String(total),cx,cy+5);
    if (legendRef.current) {
      legendRef.current.innerHTML = data.map(d=>`
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
  const riskVariant = (r:string):any =>
    r==="Critical"?"red":r==="High"?"orange":r==="Medium"?"yellow":"green";
  const certVariant = (c:string):any =>
    c==="Valid"?"green":c==="Expiring"?"yellow":"red";
  const keyColor = (k:string) =>
    k?.startsWith("1024")?T.red:k?.startsWith("2048")?T.yellow:T.green;

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = assets.filter(a => {
    const ms = !query ||
      a.name?.toLowerCase().includes(query.toLowerCase()) ||
      (a.ip||"").includes(query) ||
      a.type?.toLowerCase().includes(query.toLowerCase()) ||
      a.owner?.toLowerCase().includes(query.toLowerCase());
    const mc = filterCrit==="All" || a.criticality===filterCrit || a.risk===filterCrit;
    return ms && mc;
  });

  // ── Scan all ──────────────────────────────────────────────────────────────
  async function scanAll() {
    setScanning(true);
    try { await fetch(`${API}/scan-all`, { method:"POST" }); } catch {}
    setTimeout(() => { setScanning(false); load(); }, 2000);
  }

  // ── Scan single ───────────────────────────────────────────────────────────
  async function scanOne(id: number, name: string) {
    setScanningId(id);
    try {
      const r = await fetch(`${API}/assets/${id}/scan`, { method:"POST" });
      const d = await r.json();
      d.status==="scanned"
        ? showToast(`Scanned ${name} — TLS ${d.tls_version??"?"}`)
        : showToast(`Scan failed: ${d.error??"unknown"}`, false);
      await load();
    } catch { showToast("Scan failed", false); }
    finally { setScanningId(null); }
  }

  // ── Save (create / update) ────────────────────────────────────────────────
  async function handleSave(form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const isEdit = modal==="edit" && editTarget?.id;
      const body: any = { ...form };
      if (body.financial_exposure==="") body.financial_exposure=null;
      else if (body.financial_exposure) body.financial_exposure=parseInt(body.financial_exposure);

      const r = await fetch(
        isEdit ? `${API}/assets/${editTarget.id}` : `${API}/assets`,
        { method:isEdit?"PUT":"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(body) }
      );
      const d = await r.json();
      if (!r.ok) {
        showToast(Array.isArray(d.detail)?d.detail.join(" · "):d.detail, false);
        return;
      }
      showToast(isEdit?`Updated ${form.name}`:`Registered ${form.name} — scanning...`);
      setModal(null); setEditTarget(null);
      await load();
    } catch { showToast("Save failed", false); }
    finally { setSaving(false); }
  }

  // ── Deactivate ────────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    try {
      const r = await fetch(`${API}/assets/${id}`, { method:"DELETE" });
      const d = await r.json();
      r.ok?showToast(`Deactivated ${d.name}`):showToast(d.detail??"Failed",false);
      setConfirmId(null);
      await load();
    } catch { showToast("Deactivate failed", false); }
  }

  const confirmAsset = assets.find(a=>a.id===confirmId);

  // ── Registered count ──────────────────────────────────────────────────────
  const registeredCount = assets.filter(a=>a.id).length;
  const noOwnerCount    = assets.filter(a=>a.id&&!a.owner_email).length;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes ping{75%,100%{transform:scale(2.2);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:200,
          background:toast.ok?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)",
          border:`1px solid ${toast.ok?T.green:T.red}`,
          borderRadius:4, padding:"10px 16px", fontSize:11,
          color:toast.ok?T.green:T.red,
          boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
          animation:"fadeIn 0.2s ease" }}>
          {toast.ok?"✓":"✗"} {toast.msg}
        </div>
      )}

      {/* Modals */}
      {modal && (
        <AssetModal
          initial={modal==="edit"&&editTarget ? {
            name:               editTarget.name               ??"",
            url:                editTarget.url                ??"",
            type:               editTarget.type               ??"Web App",
            criticality:        editTarget.criticality        ??"Medium",
            owner:              editTarget.owner              ??"",
            owner_email:        editTarget.owner_email        ??"",
            business_unit:      editTarget.business_unit      ??"",
            financial_exposure: editTarget.financial_exposure?.toString()??"",
            compliance_scope:   editTarget.compliance_scope   ??[],
            notes:              editTarget.notes              ??"",
          } : EMPTY_FORM}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditTarget(null); }}
          saving={saving}
        />
      )}

      {confirmId&&confirmAsset && (
        <ConfirmDialog
          name={confirmAsset.name}
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* ── METRICS ── */}
      <div style={{ display:"grid",
        gridTemplateColumns:mobile?"1fr 1fr":"repeat(5,1fr)", gap:mobile?8:9 }}>
        <MetricCard label="TOTAL ASSETS"
          value={assets.length} sub="This session" color={T.blue}/>
        <MetricCard label="REGISTERED"
          value={registeredCount} sub="In registry" color={T.cyan}/>
        <MetricCard label="HIGH RISK"
          value={riskCounts.Critical+riskCounts.High} sub="Immediate action" color={T.red}/>
        <MetricCard label="CERT EXPIRING"
          value={certBuckets["0-30"]} sub="Within 30 days" color={T.orange}/>
        <div style={mobile?{gridColumn:"1/-1"}:{}}>
          <MetricCard label="NO OWNER"
            value={noOwnerCount} sub="Unassigned" color={T.yellow}/>
        </div>
      </div>

      {/* ── CHARTS ── */}
      <div style={{ display:"grid",
        gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:mobile?8:10 }}>
        <Panel>
          <PanelHeader left="ASSET TYPE DISTRIBUTION" />
          <div style={{ padding:14, display:"flex", gap:16, alignItems:"center" }}>
            <canvas ref={typeRef} width={140} height={140}/>
            <div ref={legendRef} style={{ display:"flex", flexDirection:"column", gap:7, flex:1 }}/>
          </div>
        </Panel>
        <Panel>
          <PanelHeader
            left="RISK DISTRIBUTION"
            right={
              <span style={{ fontFamily:"'Orbitron',monospace", fontSize:20, color:T.red }}>
                {riskCounts.Critical+riskCounts.High}
                <span style={{fontSize:12}}> high</span>
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
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              {/* Search */}
              <input value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="Search domain / owner..."
                style={{ ...S.input, width:mobile?120:170, fontSize:11 }}/>
              {/* Criticality filter */}
              <select value={filterCrit} onChange={e=>setFilterCrit(e.target.value)}
                style={{ ...S.input, fontSize:10, cursor:"pointer",
                  color:filterCrit==="All"?T.text2:CRIT_COLOR[filterCrit]??T.text2 }}>
                <option value="All">All</option>
                {CRITICALITY.map(c=><option key={c}>{c}</option>)}
              </select>
              {/* Scan all */}
              <button style={S.btn} onClick={scanAll} disabled={scanning}>
                {scanning?"SCANNING...":"⬡ SCAN ALL"}
              </button>
              {/* Register asset */}
              <button
                onClick={() => setModal("add")}
                style={{ ...S.btn, background:"rgba(59,130,246,0.15)",
                  borderColor:"rgba(59,130,246,0.4)", color:T.blue }}>
                + REGISTER
              </button>
            </div>
          }
        />

        {/* Mobile search */}
        {mobile && (
          <div style={{ padding:"8px 12px", borderBottom:`1px solid rgba(59,130,246,0.07)` }}>
            <input value={query} onChange={e=>setQuery(e.target.value)}
              placeholder="Search..." style={{ ...S.input, width:"100%", fontSize:13 }}/>
          </div>
        )}

        {/* Mobile cards */}
        {mobile ? (
          <div style={{ maxHeight:420, overflowY:"auto" }}>
            {filtered.map((a,i) => {
              const scope = Array.isArray(a.compliance_scope)?a.compliance_scope:[];
              const critColor = CRIT_COLOR[a.criticality]??T.text2;
              return (
                <div key={i} style={{ padding:"10px 14px",
                  borderBottom:"1px solid rgba(59,130,246,0.05)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:12, color:T.blue }}>{a.name}</span>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      {a.criticality && (
                        <span style={{ fontSize:7, fontWeight:700, color:critColor,
                          border:`1px solid ${critColor}44`, borderRadius:2,
                          padding:"1px 5px" }}>{a.criticality}</span>
                      )}
                      <Badge v={riskVariant(a.risk)}>{a.risk}</Badge>
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:"rgba(59,130,246,0.6)", marginBottom:4,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {a.url}
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:4 }}>
                    <Badge v="gray">{a.type}</Badge>
                    <Badge v={certVariant(a.cert)}>{a.cert}</Badge>
                    <Badge v={a.tls==="1.0"?"red":a.tls==="1.2"?"yellow":"green"}>
                      TLS {a.tls||"—"}
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
                  <div style={{ fontSize:9, color:T.text3, marginTop:4 }}>{a.scan}</div>
                </div>
              );
            })}
            {filtered.length===0 && (
              <div style={{ padding:20, fontSize:10, color:T.text3, textAlign:"center" }}>
                No assets found
              </div>
            )}
          </div>
        ) : (
          // Desktop table
          <Table cols={[
            "ASSET NAME","TYPE","CRITICALITY","OWNER",
            "TLS","CERT","KEY LEN","COMPLIANCE","LAST SCAN","",
          ]}>
            {filtered.map((a,i) => {
              const scope      = Array.isArray(a.compliance_scope)?a.compliance_scope:[];
              const critColor  = CRIT_COLOR[a.criticality]??null;
              const isOpen     = expandedRow===i;
              const registered = !!a.id;

              return (
                <React.Fragment key={i}>
                  <TR>
                    {/* Asset name */}
                    <TD>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:10, color:T.blue }}>{a.name}</span>
                        {registered && (
                          <span style={{ fontSize:6, color:T.cyan,
                            border:`1px solid ${T.cyan}33`, borderRadius:2,
                            padding:"1px 4px", letterSpacing:".08em" }}>REG</span>
                        )}
                      </div>
                      <div style={{ fontSize:8, color:"rgba(59,130,246,0.5)",
                        overflow:"hidden", textOverflow:"ellipsis",
                        whiteSpace:"nowrap", maxWidth:160 }}>{a.url}</div>
                    </TD>

                    {/* Type */}
                    <TD><Badge v="gray">{a.type||"—"}</Badge></TD>

                    {/* Criticality — from registry or risk */}
                    <TD>
                      {critColor ? (
                        <span style={{ fontSize:8, fontWeight:700, color:critColor,
                          border:`1px solid ${critColor}44`, borderRadius:2,
                          padding:"1px 6px" }}>{a.criticality}</span>
                      ) : (
                        <Badge v={riskVariant(a.risk)}>{a.risk}</Badge>
                      )}
                    </TD>

                    {/* Owner */}
                    <TD>
                      <div style={{ fontSize:9, color:T.text2 }}>{a.owner||"—"}</div>
                      {a.owner_email && (
                        <div style={{ fontSize:8, color:T.text3 }}>{a.owner_email}</div>
                      )}
                    </TD>

                    {/* TLS */}
                    <TD>
                      <Badge v={a.tls==="1.0"?"red":a.tls==="1.2"?"yellow":"green"}>
                        TLS {a.tls||"—"}
                      </Badge>
                    </TD>

                    {/* Cert */}
                    <TD><Badge v={certVariant(a.cert)}>{a.cert||"—"}</Badge></TD>

                    {/* Key length */}
                    <TD style={{ fontSize:10, color:keyColor(a.keylen) }}>
                      {a.keylen||"—"}
                    </TD>

                    {/* Compliance scope */}
                    <TD>
                      <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                        {scope.slice(0,3).map((s:string)=>(
                          <span key={s} style={{ fontSize:7, color:T.cyan,
                            border:`1px solid ${T.cyan}33`, borderRadius:2,
                            padding:"1px 4px" }}>{s}</span>
                        ))}
                        {scope.length>3 && (
                          <span style={{ fontSize:7, color:T.text3 }}>
                            +{scope.length-3}
                          </span>
                        )}
                        {scope.length===0 && (
                          <span style={{ fontSize:8, color:T.text3 }}>—</span>
                        )}
                      </div>
                    </TD>

                    {/* Last scan */}
                    <TD style={{ fontSize:9, color:T.text3 }}>{a.scan||"Never"}</TD>

                    {/* Actions */}
                    <TD>
                      <div style={{ display:"flex", gap:3 }}>
                        {/* Expand for financial / notes */}
                        <button
                          onClick={()=>setExpandedRow(isOpen?null:i)}
                          style={{ ...S.btn, fontSize:8, padding:"2px 6px" }}>
                          {isOpen?"▲":"▼"}
                        </button>
                        {/* On-demand scan */}
                        {registered && (
                          <button
                            onClick={()=>scanOne(a.id, a.name)}
                            disabled={scanningId===a.id}
                            style={{ ...S.btn, fontSize:8, padding:"2px 6px",
                              opacity:scanningId===a.id?0.5:1 }}>
                            {scanningId===a.id?"…":"⟳"}
                          </button>
                        )}
                        {/* Edit */}
                        {registered && (
                          <button
                            onClick={()=>{ setEditTarget(a); setModal("edit"); }}
                            style={{ ...S.btn, fontSize:8, padding:"2px 6px" }}>
                            EDIT
                          </button>
                        )}
                        {/* Register unregistered */}
                        {!registered && (
                          <button
                            onClick={()=>{
                              setEditTarget({
                                name: a.name, url: a.url||`https://${a.name}`,
                                type: a.type,
                              });
                              setModal("edit");
                            }}
                            style={{ ...S.btn, fontSize:8, padding:"2px 6px",
                              color:T.cyan, borderColor:`${T.cyan}44` }}>
                            REGISTER
                          </button>
                        )}
                        {/* Deactivate */}
                        {registered && (
                          <button
                            onClick={()=>setConfirmId(a.id)}
                            style={{ ...S.btn, fontSize:8, padding:"2px 6px",
                              color:T.red, borderColor:"rgba(239,68,68,0.3)" }}>
                            ✕
                          </button>
                        )}
                      </div>
                    </TD>
                  </TR>

                  {/* Expanded row — financial + notes */}
                  {isOpen && (
                    <TR>
                      <td colSpan={10} style={{ padding:"0 12px 12px" }}>
                        <div style={{ display:"grid",
                          gridTemplateColumns:"repeat(4,1fr)", gap:8,
                          background:"rgba(59,130,246,0.03)",
                          border:"1px solid rgba(59,130,246,0.1)",
                          borderRadius:4, padding:12 }}>
                          {[
                            { label:"BUSINESS UNIT",
                              val: a.business_unit||"—",      color:T.text2 },
                            { label:"FINANCIAL EXPOSURE",
                              val: a.financial_exposure
                                ? `₹${Number(a.financial_exposure).toLocaleString("en-IN")}`
                                : "—",                         color:T.orange },
                            { label:"IP ADDRESS",
                              val: a.ip||"—",                 color:T.text2 },
                            { label:"CIPHER",
                              val: a.cipher||"—",             color:T.text3 },
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
                          {a.notes && (
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
            {filtered.length===0 && (
              <TR>
                <TD style={{ color:T.text3, fontSize:10 }}>
                  {assets.length===0?"No assets yet — click + REGISTER to begin":"No assets match filter"}
                </TD>
              </TR>
            )}
          </Table>
        )}

        <div style={{ padding:"8px 12px",
          borderTop:"1px solid rgba(59,130,246,0.07)",
          display:"flex", justifyContent:"space-between",
          alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <span style={{ fontSize:10, color:T.text3 }}>
            Showing <b style={{color:T.text2}}>{filtered.length}</b> assets ·
            <b style={{color:T.cyan}}> {registeredCount}</b> registered
            {noOwnerCount>0 && (
              <span style={{color:T.orange}}>
                {" "}· <b>{noOwnerCount}</b> without owner
              </span>
            )}
          </span>
          {!mobile && (
            <span style={{ fontSize:9, color:T.text3 }}>
              ▼ expand row for financial exposure · ⟳ re-scan · REGISTER to add context
            </span>
          )}
        </div>
      </Panel>

      {/* ── CERT EXPIRY + CRYPTO ── */}
      <div style={{ display:"grid",
        gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:mobile?8:10 }}>
        <Panel>
          <PanelHeader left="CERTIFICATE EXPIRY TIMELINE" />
          <div style={{ padding:14 }}>
            {[
              { label:"0–30 Days",  count:certBuckets["0-30"],  color:T.red    },
              { label:"30–60 Days", count:certBuckets["30-60"], color:T.orange },
              { label:"60–90 Days", count:certBuckets["60-90"], color:T.yellow },
              { label:">90 Days",   count:certBuckets["90+"],   color:T.green  },
            ].map(row => (
              <div key={row.label} style={{ display:"flex", alignItems:"center",
                gap:10, marginBottom:10 }}>
                <div style={{ width:8, height:8, borderRadius:"50%",
                  background:row.color, boxShadow:`0 0 4px ${row.color}`,
                  flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    marginBottom:3 }}>
                    <span style={{ fontSize:10, color:T.text2 }}>{row.label}</span>
                    <span style={{ fontSize:10, fontFamily:"'Orbitron',monospace",
                      color:row.color }}>{row.count}</span>
                  </div>
                  <ProgBar pct={Math.round(row.count/Math.max(assets.length,1)*100)}
                    color={row.color}/>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader left="CRYPTO & SECURITY OVERVIEW" />
          {mobile ? (
            <div style={{ maxHeight:220, overflowY:"auto" }}>
              {assets.filter(a=>a.tls&&a.tls!=="—").slice(0,10).map((a,i)=>(
                <div key={i} style={{ padding:"9px 14px",
                  borderBottom:"1px solid rgba(59,130,246,0.05)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    marginBottom:3 }}>
                    <span style={{ fontSize:11, color:T.blue }}>{a.name}</span>
                    <Badge v={a.tls==="1.0"?"red":a.tls==="1.2"?"yellow":"green"}>
                      TLS {a.tls}
                    </Badge>
                  </div>
                  <div style={{ fontSize:9, color:T.text3 }}>
                    {a.keylen} · {a.ca}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table cols={["ASSET","KEY LEN","CIPHER SUITE","TLS","CA"]}>
              {assets.filter(a=>a.tls&&a.tls!=="—").slice(0,10).map((a,i)=>(
                <TR key={i}>
                  <TD style={{ fontSize:10, color:T.blue }}>{a.name}</TD>
                  <TD style={{ fontSize:10, color:keyColor(a.keylen) }}>{a.keylen}</TD>
                  <TD style={{ fontSize:9, color:T.text3, maxWidth:140,
                    overflow:"hidden", textOverflow:"ellipsis",
                    whiteSpace:"nowrap" }}>{a.cipher}</TD>
                  <TD>
                    <Badge v={a.tls==="1.0"?"red":a.tls==="1.2"?"yellow":"green"}>
                      TLS {a.tls}
                    </Badge>
                  </TD>
                  <TD style={{ fontSize:10, color:T.text3 }}>{a.ca}</TD>
                </TR>
              ))}
            </Table>
          )}
        </Panel>
      </div>
    </div>
  );
}