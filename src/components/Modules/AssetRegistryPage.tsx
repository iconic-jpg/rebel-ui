import React, { useState, useEffect } from "react";
import {
  T, S, Panel, PanelHeader, MetricCard, Badge,
  Table, TR, TD,
} from "./shared.js";

const API = "https://r3bel-production.up.railway.app";

const ASSET_TYPES     = ["Web App","API","Server","Gateway","Core Banking","Internet Banking","Mobile Banking","Other"];
const CRITICALITY     = ["Critical","High","Medium","Low"];
const COMPLIANCE_OPTS = ["RBI","ISO27001","NIST","PCIDSS","SWIFT","DORA"];

const CRITICALITY_COLOR: Record<string,string> = {
  Critical: T.red, High: T.orange, Medium: T.yellow, Low: T.green,
};

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

// ── Empty form state ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name:               "",
  url:                "",
  type:               "Web App",
  criticality:        "Medium",
  owner:              "",
  owner_email:        "",
  business_unit:      "",
  financial_exposure: "",
  compliance_scope:   [] as string[],
  notes:              "",
};

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function AssetModal({
  initial, onSave, onClose, saving,
}: {
  initial: typeof EMPTY_FORM;
  onSave:  (form: typeof EMPTY_FORM) => void;
  onClose: () => void;
  saving:  boolean;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);

  function set(key: string, val: any) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function toggleScope(s: string) {
    setForm(f => ({
      ...f,
      compliance_scope: f.compliance_scope.includes(s)
        ? f.compliance_scope.filter(x => x !== s)
        : [...f.compliance_scope, s],
    }));
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!form.name.trim())  errs.push("Domain is required");
    if (!form.url.trim())   errs.push("URL is required");
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

  const inputStyle: React.CSSProperties = {
    background: "rgba(59,130,246,0.06)",
    border: "1px solid rgba(59,130,246,0.2)",
    borderRadius: 3, color: T.text2,
    padding: "7px 10px", fontSize: 11,
    width: "100%", outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 8, color: T.text3,
    letterSpacing: ".12em", marginBottom: 4,
    display: "block",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "#080c14",
        border: "1px solid rgba(59,130,246,0.25)",
        borderRadius: 6, padding: 24, width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom: 20 }}>
          <span style={{ fontFamily:"'Orbitron',monospace", fontSize: 12,
            color: T.blue, letterSpacing: ".1em" }}>
            {initial.name ? "EDIT ASSET" : "ADD ASSET"}
          </span>
          <button onClick={onClose} style={{ ...S.btn, padding:"2px 8px" }}>✕</button>
        </div>

        {errors.length > 0 && (
          <div style={{ background:"rgba(239,68,68,0.08)",
            border:"1px solid rgba(239,68,68,0.3)",
            borderRadius: 3, padding:"8px 12px", marginBottom: 16 }}>
            {errors.map((e,i) => (
              <div key={i} style={{ fontSize: 10, color: T.red }}>• {e}</div>
            ))}
          </div>
        )}

        <form onSubmit={submit}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 12 }}>

            {/* Domain */}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={labelStyle}>DOMAIN *</label>
              <input style={inputStyle} placeholder="pnb.bank.in"
                value={form.name}
                onChange={e => {
                  const v = e.target.value.replace(/^https?:\/\//,"").replace(/\/.*$/,"");
                  set("name", v);
                  if (!form.url) set("url", `https://${v}`);
                }}/>
            </div>

            {/* URL */}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={labelStyle}>URL *</label>
              <input style={inputStyle} placeholder="https://pnb.bank.in"
                value={form.url} onChange={e => set("url", e.target.value)}/>
            </div>

            {/* Type */}
            <div>
              <label style={labelStyle}>TYPE</label>
              <select style={inputStyle} value={form.type}
                onChange={e => set("type", e.target.value)}>
                {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Criticality */}
            <div>
              <label style={labelStyle}>CRITICALITY</label>
              <select style={{...inputStyle,
                color: CRITICALITY_COLOR[form.criticality] ?? T.text2}}
                value={form.criticality}
                onChange={e => set("criticality", e.target.value)}>
                {CRITICALITY.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Owner */}
            <div>
              <label style={labelStyle}>OWNER</label>
              <input style={inputStyle} placeholder="CISO"
                value={form.owner} onChange={e => set("owner", e.target.value)}/>
            </div>

            {/* Owner email */}
            <div>
              <label style={labelStyle}>
                OWNER EMAIL
                {["Critical","High"].includes(form.criticality) &&
                  <span style={{color:T.red}}> *</span>}
              </label>
              <input style={inputStyle} placeholder="security@bank.co.in"
                type="email"
                value={form.owner_email}
                onChange={e => set("owner_email", e.target.value)}/>
            </div>

            {/* Business unit */}
            <div>
              <label style={labelStyle}>BUSINESS UNIT</label>
              <input style={inputStyle} placeholder="Retail Banking"
                value={form.business_unit}
                onChange={e => set("business_unit", e.target.value)}/>
            </div>

            {/* Financial exposure */}
            <div>
              <label style={labelStyle}>FINANCIAL EXPOSURE (₹)</label>
              <input style={inputStyle} placeholder="500000000" type="number"
                value={form.financial_exposure}
                onChange={e => set("financial_exposure", e.target.value)}/>
            </div>

            {/* Compliance scope */}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={labelStyle}>COMPLIANCE SCOPE</label>
              <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
                {COMPLIANCE_OPTS.map(s => {
                  const active = form.compliance_scope.includes(s);
                  return (
                    <button key={s} type="button"
                      onClick={() => toggleScope(s)}
                      style={{
                        fontSize: 9, padding:"3px 10px", borderRadius: 2,
                        border: `1px solid ${active ? T.blue : "rgba(59,130,246,0.2)"}`,
                        background: active ? "rgba(59,130,246,0.15)" : "transparent",
                        color: active ? T.blue : T.text3,
                        cursor:"pointer",
                      }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={labelStyle}>NOTES</label>
              <textarea style={{...inputStyle, minHeight: 60, resize:"vertical"}}
                placeholder="Main internet banking portal..."
                value={form.notes}
                onChange={e => set("notes", e.target.value)}/>
            </div>

          </div>

          <div style={{ display:"flex", justifyContent:"flex-end",
            gap: 8, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={S.btn}>
              CANCEL
            </button>
            <button type="submit" disabled={saving}
              style={{
                ...S.btn,
                background: "rgba(59,130,246,0.2)",
                borderColor: "rgba(59,130,246,0.5)",
                color: T.blue, opacity: saving ? 0.6 : 1,
              }}>
              {saving ? "SAVING..." : initial.name ? "UPDATE" : "ADD ASSET"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm delete dialog ─────────────────────────────────────────────────────
function ConfirmDialog({
  name, onConfirm, onCancel,
}: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:101,
      background:"rgba(0,0,0,0.8)",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <div style={{
        background:"#080c14",
        border:"1px solid rgba(239,68,68,0.3)",
        borderRadius:6, padding:24, maxWidth:360, width:"100%",
      }}>
        <div style={{fontSize:12,color:T.red,fontWeight:700,marginBottom:12}}>
          DEACTIVATE ASSET
        </div>
        <div style={{fontSize:11,color:T.text2,marginBottom:20,lineHeight:1.6}}>
          Deactivate <b style={{color:T.blue}}>{name}</b>?
          The asset will be hidden from reports but data is retained for audit trail.
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={S.btn}>CANCEL</button>
          <button onClick={onConfirm} style={{
            ...S.btn, background:"rgba(239,68,68,0.15)",
            borderColor:"rgba(239,68,68,0.4)", color:T.red,
          }}>DEACTIVATE</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AssetRegistryPage() {
  const [assets,   setAssets]   = useState<any[]>([]);
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

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/assets`);
      const d = await r.json();
      setAssets(d.assets ?? []);
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
    expiring: assets.filter(a => a.days_left != null && a.days_left < 30).length,
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  async function handleSave(form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const isEdit = modal === "edit" && editTarget?.id;
      const url    = isEdit ? `${API}/assets/${editTarget.id}` : `${API}/assets`;
      const method = isEdit ? "PUT" : "POST";

      const body: any = { ...form };
      if (body.financial_exposure === "") body.financial_exposure = null;
      else if (body.financial_exposure)   body.financial_exposure = parseInt(body.financial_exposure);

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
    } catch (e) {
      showToast("Save failed", false);
    } finally {
      setSaving(false);
    }
  }

  // ── On-demand scan ────────────────────────────────────────────────────────
  async function handleScan(id: number, name: string) {
    setScanning(id);
    try {
      const r = await fetch(`${API}/assets/${id}/scan`, { method:"POST" });
      const d = await r.json();
      if (d.status === "scanned") {
        showToast(`Scanned ${name} — TLS ${d.tls_version ?? "?"}`);
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
      if (r.ok) {
        showToast(`Deactivated ${d.name}`);
      } else {
        showToast(d.detail ?? "Delete failed", false);
      }
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
      {toast && (
        <div style={{
          position:"fixed", bottom:24, right:24, zIndex:200,
          background: toast.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${toast.ok ? T.green : T.red}`,
          borderRadius:4, padding:"10px 16px",
          fontSize:11, color: toast.ok ? T.green : T.red,
          boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      {/* Modals */}
      {modal && (
        <AssetModal
          initial={modal === "edit" && editTarget ? {
            name:               editTarget.name               ?? "",
            url:                editTarget.url                ?? "",
            type:               editTarget.type               ?? "Web App",
            criticality:        editTarget.criticality        ?? "Medium",
            owner:              editTarget.owner              ?? "",
            owner_email:        editTarget.owner_email        ?? "",
            business_unit:      editTarget.business_unit      ?? "",
            financial_exposure: editTarget.financial_exposure?.toString() ?? "",
            compliance_scope:   editTarget.compliance_scope   ?? [],
            notes:              editTarget.notes              ?? "",
          } : EMPTY_FORM}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditTarget(null); }}
          saving={saving}
        />
      )}

      {confirmId && confirmAsset && (
        <ConfirmDialog
          name={confirmAsset.name}
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* Metrics */}
      <div style={{ display:"grid",
        gridTemplateColumns: isMobile?"1fr 1fr":"repeat(4,1fr)", gap:9 }}>
        <MetricCard label="TOTAL ASSETS"  value={stats.total}    sub="Registered"     color={T.blue}   />
        <MetricCard label="CRITICAL"      value={stats.critical} sub="High priority"  color={T.red}    />
        <MetricCard label="NO OWNER"      value={stats.noOwner}  sub="Unassigned"     color={T.orange} />
        <MetricCard label="CERT EXPIRING" value={stats.expiring} sub="Within 30 days" color={T.yellow} />
      </div>

      {/* Main panel */}
      <Panel>
        <PanelHeader
          left="ASSET REGISTRY"
          right={
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {/* Search */}
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search domain / owner..."
                style={{
                  ...S.input, fontSize:10,
                  width: isMobile ? 120 : 180,
                }}
              />
              {/* Criticality filter */}
              <select
                value={filterCrit}
                onChange={e => setFilterCrit(e.target.value)}
                style={{
                  ...S.input, fontSize:10, cursor:"pointer",
                  color: filterCrit === "All" ? T.text2
                       : CRITICALITY_COLOR[filterCrit] ?? T.text2,
                }}>
                <option value="All">All</option>
                {CRITICALITY.map(c => <option key={c}>{c}</option>)}
              </select>
              {/* Add button */}
              <button
                onClick={() => setModal("add")}
                style={{
                  ...S.btn, fontSize:isMobile?9:11,
                  background:"rgba(59,130,246,0.15)",
                  borderColor:"rgba(59,130,246,0.4)",
                  color: T.blue,
                }}>
                + ADD ASSET
              </button>
            </div>
          }
        />

        {/* Desktop table */}
        {isDesktop && (
          <Table cols={[
            "DOMAIN","TYPE","CRITICALITY","OWNER","TLS","CERT","KEY LEN",
            "COMPLIANCE","LAST SCAN","",
          ]}>
            {loading ? (
              <TR><TD style={{color:T.text3,fontSize:10}}>Loading...</TD></TR>
            ) : filtered.length === 0 ? (
              <TR>
                <TD style={{color:T.text3,fontSize:10}}>
                  {assets.length === 0
                    ? "No assets registered yet — click + ADD ASSET to begin"
                    : "No assets match filter"}
                </TD>
              </TR>
            ) : filtered.map((a, i) => {
              const critColor = CRITICALITY_COLOR[a.criticality] ?? T.text2;
              const tlsColor  = a.tls==="1.0"?T.red:a.tls==="1.2"?T.yellow:T.green;
              const keyColor  = a.keylen?.startsWith("1024")?T.red:a.keylen?.startsWith("2048")?T.yellow:T.green;
              const certColor = a.cert==="Expired"?T.red:a.cert==="Expiring"?T.orange:T.green;
              const scope     = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
              return (
                <TR key={a.id ?? i}>
                  <TD style={{color:T.blue,fontSize:10}}>{a.name}</TD>
                  <TD style={{fontSize:9,color:T.text3}}>{a.type}</TD>
                  <TD>
                    <span style={{
                      fontSize:8,fontWeight:700,color:critColor,
                      border:`1px solid ${critColor}44`,
                      borderRadius:2,padding:"1px 6px",
                    }}>{a.criticality}</span>
                  </TD>
                  <TD>
                    <div style={{fontSize:9,color:T.text2}}>{a.owner}</div>
                    {a.owner_email && (
                      <div style={{fontSize:8,color:T.text3}}>{a.owner_email}</div>
                    )}
                  </TD>
                  <TD>
                    <Badge v={a.tls==="1.0"?"red":a.tls==="1.2"?"yellow":"green"}>
                      TLS {a.tls || "—"}
                    </Badge>
                  </TD>
                  <TD style={{fontSize:9,color:certColor}}>{a.cert || "—"}</TD>
                  <TD style={{fontSize:9,color:keyColor}}>{a.keylen || "—"}</TD>
                  <TD>
                    <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                      {scope.slice(0,3).map((s:string) => (
                        <span key={s} style={{
                          fontSize:7,color:T.cyan,
                          border:`1px solid ${T.cyan}33`,
                          borderRadius:2,padding:"1px 4px",
                        }}>{s}</span>
                      ))}
                      {scope.length > 3 && (
                        <span style={{fontSize:7,color:T.text3}}>+{scope.length-3}</span>
                      )}
                    </div>
                  </TD>
                  <TD style={{fontSize:9,color:T.text3}}>{a.scan || "Never"}</TD>
                  <TD>
                    <div style={{display:"flex",gap:4}}>
                      {/* Scan */}
                      <button
                        onClick={() => handleScan(a.id, a.name)}
                        disabled={scanning === a.id}
                        style={{
                          ...S.btn, fontSize:8, padding:"2px 6px",
                          opacity: scanning===a.id ? 0.5 : 1,
                        }}>
                        {scanning === a.id ? "⟳" : "⟳ SCAN"}
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => openEdit(a)}
                        style={{...S.btn, fontSize:8, padding:"2px 6px"}}>
                        EDIT
                      </button>
                      {/* Deactivate */}
                      <button
                        onClick={() => setConfirmId(a.id)}
                        style={{
                          ...S.btn, fontSize:8, padding:"2px 6px",
                          color:T.red, borderColor:"rgba(239,68,68,0.3)",
                        }}>
                        ✕
                      </button>
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
            {loading && (
              <div style={{padding:20,fontSize:10,color:T.text3,textAlign:"center"}}>
                Loading...
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{padding:20,fontSize:10,color:T.text3,textAlign:"center"}}>
                {assets.length === 0
                  ? "No assets yet — tap + ADD ASSET"
                  : "No assets match filter"}
              </div>
            )}
            {filtered.map((a, i) => {
              const critColor = CRITICALITY_COLOR[a.criticality] ?? T.text2;
              const scope     = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
              return (
                <div key={a.id ?? i} style={{
                  borderBottom:"1px solid rgba(59,130,246,0.06)",
                  padding:"12px 14px",
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"flex-start",marginBottom:8}}>
                    <div>
                      <div style={{fontSize:12,color:T.blue,marginBottom:3}}>{a.name}</div>
                      <span style={{
                        fontSize:8,fontWeight:700,color:critColor,
                        border:`1px solid ${critColor}44`,
                        borderRadius:2,padding:"1px 6px",
                      }}>{a.criticality}</span>
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>handleScan(a.id,a.name)}
                        disabled={scanning===a.id}
                        style={{...S.btn,fontSize:8,padding:"2px 6px"}}>
                        {scanning===a.id?"…":"⟳"}
                      </button>
                      <button onClick={()=>openEdit(a)}
                        style={{...S.btn,fontSize:8,padding:"2px 6px"}}>
                        EDIT
                      </button>
                      <button onClick={()=>setConfirmId(a.id)}
                        style={{...S.btn,fontSize:8,padding:"2px 6px",
                          color:T.red,borderColor:"rgba(239,68,68,0.3)"}}>
                        ✕
                      </button>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {[
                      {label:"TYPE",   val:a.type,        color:T.text2},
                      {label:"OWNER",  val:a.owner,       color:T.text2},
                      {label:"TLS",    val:`TLS ${a.tls||"—"}`, color:a.tls==="1.3"?T.green:T.orange},
                      {label:"CERT",   val:a.cert||"—",   color:a.cert==="Expired"?T.red:a.cert==="Expiring"?T.orange:T.green},
                      {label:"KEY",    val:a.keylen||"—", color:a.keylen?.startsWith("2048")?T.yellow:T.green},
                      {label:"SCANNED",val:a.scan||"Never",color:T.text3},
                    ].map(item => (
                      <div key={item.label} style={{
                        background:"rgba(59,130,246,0.03)",
                        border:"1px solid rgba(59,130,246,0.08)",
                        borderRadius:3,padding:"5px 8px",
                      }}>
                        <div style={{fontSize:7,color:T.text3,letterSpacing:".1em",marginBottom:2}}>
                          {item.label}
                        </div>
                        <div style={{fontSize:10,color:item.color}}>{item.val}</div>
                      </div>
                    ))}
                  </div>
                  {scope.length > 0 && (
                    <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:8}}>
                      {scope.map((s:string) => (
                        <span key={s} style={{
                          fontSize:7,color:T.cyan,
                          border:`1px solid ${T.cyan}33`,
                          borderRadius:2,padding:"1px 5px",
                        }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding:"8px 12px",
          borderTop:"1px solid rgba(59,130,246,0.07)",
          display:"flex",justifyContent:"space-between",
          alignItems:"center",gap:8,flexWrap:"wrap",
        }}>
          <span style={{fontSize:10,color:T.text3}}>
            <b style={{color:T.text2}}>{filtered.length}</b> of{" "}
            <b style={{color:T.text2}}>{assets.length}</b> assets
            {stats.noOwner > 0 && (
              <span style={{color:T.orange}}>
                {" "}· <b>{stats.noOwner}</b> without owner
              </span>
            )}
          </span>
          {!isMobile && (
            <span style={{fontSize:9,color:T.text3}}>
              REBEL scans registered assets automatically
            </span>
          )}
        </div>
      </Panel>

    </div>
  );
}