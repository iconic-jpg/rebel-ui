import React, { useState, useEffect } from "react";
import {
  T, S, Panel, PanelHeader, MetricCard, Badge,
  Table, TR, TD,
} from "./shared.js";
import { AssetForm, EMPTY_FORM, ASSET_TYPES, CRITICALITY, COMPLIANCE_OPTS, CRITICALITY_COLOR } from "./AssetModal";

// ── Main page ────────────────────────────────────────────────────────────────
export default function AssetRegistryPage() {
  const [assets,   setAssets]   = useState<Partial<AssetForm & {id:number, tls?:string, cert?:string, keylen?:string, scan?:string, days_left?:number}>[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<"add"|"edit"|null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving,   setSaving]   = useState(false);
  const [scanning, setScanning] = useState<number|null>(null);
  const [confirmId, setConfirmId] = useState<number|null>(null);
  const [toast,    setToast]    = useState<{msg:string;ok:boolean}|null>(null);
  const [search,   setSearch]   = useState("");
  const [filterCrit, setFilterCrit] = useState("All");

  const bp        = useBreakpoint();
  const isMobile  = bp === "mobile";
  const isDesktop = bp === "desktop";

  function showToast(msg: string, ok = true) {
    setToast({msg, ok});
    setTimeout(() => setToast(null), 3500);
  }

  // ── Load assets ─────────────────────────────────────────────────────────────
  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/assets`);
      const d = await r.json();
      setAssets(Array.isArray(d.assets) ? d.assets : []);
    } catch {
      showToast("Failed to load assets", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = assets.filter(a => {
    const matchSearch = !search ||
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.owner?.toLowerCase().includes(search.toLowerCase()) ||
      a.business_unit?.toLowerCase().includes(search.toLowerCase());
    const matchCrit = filterCrit === "All" || a.criticality === filterCrit;
    return matchSearch && matchCrit;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:    assets.length,
    critical: assets.filter(a => a.criticality === "Critical").length,
    noOwner:  assets.filter(a => !a.owner_email).length,
    expiring: assets.filter(a => (a.days_left ?? 999) < 30).length,
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  async function handleSave(form: AssetForm) {
    setSaving(true);
    try {
      const isEdit = modal === "edit" && editTarget?.id;
      const url    = isEdit ? `${API}/assets/${editTarget.id}` : `${API}/assets`;
      const method = isEdit ? "PUT" : "POST";

      const body: any = { ...form };
      if (body.financial_exposure === "") body.financial_exposure = null;
      else if (body.financial_exposure) body.financial_exposure = parseInt(body.financial_exposure as string);

      const r = await fetch(url, {
        method,
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();

      if (!r.ok) {
        const detail = Array.isArray(d.detail) ? d.detail.join(" · ") : d.detail;
        showToast(detail, false);
        return;
      }

      showToast(isEdit ? `Updated ${form.name}` : `Added ${form.name} — scanning...`);
      setModal(null);
      setEditTarget(null);
      await load();
    } catch {
      showToast("Save failed", false);
    } finally {
      setSaving(false);
    }
  }

  // ── On-demand scan ────────────────────────────────────────────────────────
  async function handleScan(id: number, name?: string) {
    setScanning(id);
    try {
      const r = await fetch(`${API}/assets/${id}/scan`, { method:"POST" });
      const d = await r.json();
      if (d.status === "scanned") {
        showToast(`Scanned ${name ?? "asset"} — TLS ${d.tls_version ?? "?"}`);
      } else {
        showToast(`Scan failed: ${d.error ?? "unknown"}`, false);
      }
      await load();
    } catch {
      showToast("Scan request failed", false);
    } finally {
      setScanning(null);
    }
  }

  // ── Deactivate ────────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    try {
      const r = await fetch(`${API}/assets/${id}`, { method:"DELETE" });
      const d = await r.json();
      if (r.ok) showToast(`Deactivated ${d.name ?? "asset"}`);
      else showToast(d.detail ?? "Delete failed", false);
      setConfirmId(null);
      await load();
    } catch {
      showToast("Deactivate failed", false);
    }
  }

  function openEdit(a: any) {
    setEditTarget(a);
    setModal("edit");
  }

  const confirmAsset = assets.find(a => a.id === confirmId);

  return (
    <div style={S.page}>
      {/* Toast */}
      {toast && <Toast toast={toast}/>}

      {/* Modals */}
      {modal && (
        <AssetModal
          initial={modal === "edit" && editTarget ? {...EMPTY_FORM, ...editTarget} : EMPTY_FORM}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditTarget(null); }}
          saving={saving}
        />
      )}

      {confirmId && confirmAsset && (
        <ConfirmDialog
          name={confirmAsset.name ?? "asset"}
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* Metrics */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(4,1fr)", gap:9 }}>
        <MetricCard label="TOTAL ASSETS" value={stats.total} sub="Registered" color={T.blue} />
        <MetricCard label="CRITICAL" value={stats.critical} sub="High priority" color={T.red} />
        <MetricCard label="NO OWNER" value={stats.noOwner} sub="Unassigned" color={T.orange} />
        <MetricCard label="CERT EXPIRING" value={stats.expiring} sub="Within 30 days" color={T.yellow} />
      </div>

      {/* Main panel */}
      <Panel>
        <PanelHeader
          left="ASSET REGISTRY"
          right={
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search domain / owner..." style={{ ...S.input, fontSize:10, width:isMobile?120:180 }}/>
              <select value={filterCrit} onChange={e=>setFilterCrit(e.target.value)}
                style={{ ...S.input, fontSize:10, cursor:"pointer", color:filterCrit==="All"?T.text2:CRITICALITY_COLOR[filterCrit] ?? T.text2 }}>
                <option value="All">All</option>
                {CRITICALITY.map(c => <option key={c}>{c}</option>)}
              </select>
              <button onClick={()=>setModal("add")}
                style={{ ...S.btn, fontSize:isMobile?9:11, background:"rgba(59,130,246,0.15)", borderColor:"rgba(59,130,246,0.4)", color:T.blue }}>
                + ADD ASSET
              </button>
            </div>
          }
        />

        {/* Desktop table */}
        {isDesktop && (
          <Table cols={["DOMAIN","TYPE","CRITICALITY","OWNER","TLS","CERT","KEY LEN","COMPLIANCE","LAST SCAN",""]}>
            {loading ? <TR><TD>Loading...</TD></TR> :
            filtered.length === 0 ? <TR><TD>No assets found</TD></TR> :
            filtered.map((a, i) => {
              const critColor = CRITICALITY_COLOR[a.criticality ?? "Medium"] ?? T.text2;
              const tlsColor  = a.tls==="1.0"?T.red:a.tls==="1.2"?T.yellow:T.green;
              const keyColor  = a.keylen?.startsWith("1024")?T.red:a.keylen?.startsWith("2048")?T.yellow:T.green;
              const certColor = a.cert==="Expired"?T.red:a.cert==="Expiring"?T.orange:T.green;
              const scope     = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
              return (
                <TR key={a.id ?? i}>
                  <TD style={{color:T.blue}}>{a.name ?? "—"}</TD>
                  <TD style={{color:T.text3}}>{a.type ?? "—"}</TD>
                  <TD><span style={{ fontSize:8,fontWeight:700,color:critColor, border:`1px solid ${critColor}44`, borderRadius:2,padding:"1px 6px" }}>{a.criticality ?? "—"}</span></TD>
                  <TD>
                    <div style={{color:T.text2}}>{a.owner ?? "—"}</div>
                    {a.owner_email && <div style={{fontSize:8,color:T.text3}}>{a.owner_email}</div>}
                  </TD>
                  <TD><Badge v={tlsColor}>TLS {a.tls ?? "—"}</Badge></TD>
                  <TD style={{color:certColor}}>{a.cert ?? "—"}</TD>
                  <TD style={{color:keyColor}}>{a.keylen ?? "—"}</TD>
                  <TD>
                    <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                      {scope.slice(0,3).map(s=><span key={s} style={{ fontSize:7,color:T.cyan,border:`1px solid ${T.cyan}33`,borderRadius:2,padding:"1px 4px" }}>{s}</span>)}
                      {scope.length>3 && <span style={{fontSize:7,color:T.text3}}>+{scope.length-3}</span>}
                    </div>
                  </TD>
                  <TD style={{color:T.text3}}>{a.scan ?? "Never"}</TD>
                  <TD>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>handleScan(a.id,a.name)} disabled={scanning===a.id} style={{...S.btn,fontSize:8,padding:"2px 6px"}}>{scanning===a.id?"⟳":"⟳ SCAN"}</button>
                      <button onClick={()=>openEdit(a)} style={{...S.btn,fontSize:8,padding:"2px 6px"}}>EDIT</button>
                      <button onClick={()=>setConfirmId(a.id)} style={{...S.btn,fontSize:8,padding:"2px 6px",color:T.red,borderColor:"rgba(239,68,68,0.3)"}}>✕</button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </Table>
        )}

        {/* Mobile / tablet cards */}
        {!isDesktop && (
          <div style={{maxHeight:520,overflowY:"auto"}}>
            {loading && <div style={{padding:20,fontSize:10,color:T.text3,textAlign:"center"}}>Loading...</div>}
            {!loading && filtered.length === 0 && <div style={{padding:20,fontSize:10,color:T.text3,textAlign:"center"}}>No assets match filter</div>}
            {filtered.map((a,i)=>(
              <div key={a.id ?? i} style={{borderBottom:"1px solid rgba(59,130,246,0.06)",padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div><div style={{fontSize:12,color:T.blue,marginBottom:3}}>{a.name ?? "—"}</div>
                    <span style={{ fontSize:8,fontWeight:700,color:CRITICALITY_COLOR[a.criticality ?? "Medium"] ?? T.text2,border:`1px solid ${CRITICALITY_COLOR[a.criticality ?? "Medium"] ?? T.text2}44`,borderRadius:2,padding:"1px 6px" }}>{a.criticality ?? "—"}</span>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>handleScan(a.id,a.name)} disabled={scanning===a.id} style={{...S.btn,fontSize:8,padding:"2px 6px"}}>{scanning===a.id?"…":"⟳"}</button>
                    <button onClick={()=>openEdit(a)} style={{...S.btn,fontSize:8,padding:"2px 6px"}}>EDIT</button>
                    <button onClick={()=>setConfirmId(a.id)} style={{...S.btn,fontSize:8,padding:"2px 6px",color:T.red,borderColor:"rgba(239,68,68,0.3)"}}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{padding:"8px 12px",borderTop:"1px solid rgba(59,130,246,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:T.text3}}>
            <b style={{color:T.text2}}>{filtered.length}</b> of <b style={{color:T.text2}}>{assets.length}</b> assets
            {stats.noOwner>0 && <span style={{color:T.orange}}> · <b>{stats.noOwner}</b> without owner</span>}
          </span>
          {!isMobile && <span style={{fontSize:9,color:T.text3}}>REBEL scans registered assets automatically</span>}
        </div>
      </Panel>
    </div>
  );
}

// ── Simple toast component ────────────────────────────────────────────────
function Toast({toast}:{toast:{msg:string,ok:boolean}}) {
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:200,
      background: toast.ok?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)",
      border: `1px solid ${toast.ok?T.green:T.red}`,
      borderRadius:4, padding:"10px 16px",
      fontSize:11, color: toast.ok?T.green:T.red,
      boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
    }}>
      {toast.ok?"✓":"✗"} {toast.msg}
    </div>
  );
}