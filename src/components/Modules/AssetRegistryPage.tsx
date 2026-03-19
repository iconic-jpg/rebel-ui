import React, { useState, useEffect } from "react";
import {
  API, T, S, Panel, PanelHeader, MetricCard, Badge,
  Table, TR, TD,
} from "./shared.js";

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── Modal ─────────────────────────────────────────────────────────────────────
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
        ? f.compliance_scope.filter((x: string) => x !== s)
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
            {errors.map((e, i) => (
              <div key={i} style={{ fontSize:10, color:T.red }}>• {e}</div>
            ))}
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
            <select style={{ ...inp, color: CRIT_COLOR[form.criticality] ?? T.text2 }}
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
              {["Critical","High"].includes(form.criticality) && (
                <span style={{ color:T.red }}> *</span>
              )}
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
                    border:`1px solid ${on ? T.blue : "rgba(59,130,246,0.2)"}`,
                    background: on ? "rgba(59,130,246,0.15)" : "transparent",
                    color: on ? T.blue : T.text3,
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
              opacity: saving ? 0.6 : 1 }}>
            {saving ? "SAVING..." : initial.name ? "UPDATE" : "REGISTER"}
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
          Deactivate <b style={{ color:T.blue }}>{name}</b>?
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
export default function AssetRegistryPage() {
  const [assets,     setAssets]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<"add"|"edit"|null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving,     setSaving]     = useState(false);
  const [scanningId, setScanningId] = useState<number|null>(null);
  const [confirmId,  setConfirmId]  = useState<number|null>(null);
  const [toast,      setToast]      = useState<{msg:string;ok:boolean}|null>(null);
  const [search,     setSearch]     = useState("");
  const [filterCrit, setFilterCrit] = useState("All");

  const mobile = useMobile();

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/assets`);
      const d = await r.json();
      setAssets((d.assets ?? []).filter((a: any) => a.id));
    } catch { showToast("Failed to load registry", false); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = assets.filter((a: any) => {
    const ms = !search ||
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.owner?.toLowerCase().includes(search.toLowerCase()) ||
      a.business_unit?.toLowerCase().includes(search.toLowerCase());
    const mc = filterCrit === "All" || a.criticality === filterCrit;
    return ms && mc;
  });

  const stats = {
    total:    assets.length,
    critical: assets.filter((a: any) => a.criticality === "Critical").length,
    noOwner:  assets.filter((a: any) => !a.owner_email).length,
    expiring: assets.filter((a: any) => a.days_left != null && a.days_left < 30).length,
  };

  async function handleSave(form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const isEdit = modal === "edit" && editTarget?.id;
      const body: any = { ...form };
      if (body.financial_exposure === "") body.financial_exposure = null;
      else if (body.financial_exposure) body.financial_exposure = parseInt(body.financial_exposure);

      const r = await fetch(
        isEdit ? `${API}/assets/${editTarget.id}` : `${API}/assets`,
        { method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify(body) }
      );
      const d = await r.json();
      if (!r.ok) {
        showToast(Array.isArray(d.detail) ? d.detail.join(" · ") : d.detail, false);
        return;
      }
      showToast(isEdit ? `Updated ${form.name}` : `Registered ${form.name}`);
      setModal(null); setEditTarget(null);
      await load();
    } catch { showToast("Save failed", false); }
    finally { setSaving(false); }
  }

  async function handleScan(id: number, name: string) {
    setScanningId(id);
    try {
      const r = await fetch(`${API}/assets/${id}/scan`, { method:"POST" });
      const d = await r.json();
      d.status === "scanned"
        ? showToast(`Scanned ${name} — TLS ${d.tls_version ?? "?"}`)
        : showToast(`Scan failed: ${d.error ?? "unknown"}`, false);
      await load();
    } catch { showToast("Scan failed", false); }
    finally { setScanningId(null); }
  }

  async function handleDelete(id: number) {
    try {
      const r = await fetch(`${API}/assets/${id}`, { method:"DELETE" });
      const d = await r.json();
      r.ok ? showToast(`Deactivated ${d.name}`) : showToast(d.detail ?? "Failed", false);
      setConfirmId(null);
      await load();
    } catch { showToast("Deactivate failed", false); }
  }

  const confirmAsset = assets.find((a: any) => a.id === confirmId);

  return (
    <div style={S.page}>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:200,
          background: toast.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          border:`1px solid ${toast.ok ? T.green : T.red}`,
          borderRadius:4, padding:"10px 16px", fontSize:11,
          color: toast.ok ? T.green : T.red,
          boxShadow:"0 4px 20px rgba(0,0,0,0.4)" }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

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

      {confirmId != null && confirmAsset && (
        <ConfirmDialog
          name={confirmAsset.name}
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* Metrics */}
      <div style={{ display:"grid",
        gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap:9 }}>
        <MetricCard label="REGISTERED"    value={stats.total}
          sub="Assets in registry"  color={T.blue}   />
        <MetricCard label="CRITICAL"      value={stats.critical}
          sub="High priority"       color={T.red}    />
        <MetricCard label="NO OWNER"      value={stats.noOwner}
          sub="Needs assignment"    color={T.orange} />
        <MetricCard label="CERT EXPIRING" value={stats.expiring}
          sub="Within 30 days"      color={T.yellow} />
      </div>

      {/* Table */}
      <Panel>
        <PanelHeader
          left="ASSET REGISTRY"
          right={
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search domain / owner..."
                style={{ ...S.input, width: mobile ? 120 : 170, fontSize:11 }}/>
              <select value={filterCrit} onChange={e => setFilterCrit(e.target.value)}
                style={{ ...S.input, fontSize:10, cursor:"pointer",
                  color: filterCrit === "All" ? T.text2 : CRIT_COLOR[filterCrit] ?? T.text2 }}>
                <option value="All">All</option>
                {CRITICALITY.map(c => <option key={c}>{c}</option>)}
              </select>
              <button
                onClick={() => setModal("add")}
                style={{ ...S.btn, background:"rgba(59,130,246,0.15)",
                  borderColor:"rgba(59,130,246,0.4)", color:T.blue }}>
                + REGISTER ASSET
              </button>
            </div>
          }
        />

        {/* Mobile cards */}
        {mobile ? (
          <div style={{ maxHeight:520, overflowY:"auto" }}>
            {loading && (
              <div style={{ padding:20, fontSize:10, color:T.text3, textAlign:"center" }}>
                Loading...
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{ padding:20, fontSize:10, color:T.text3, textAlign:"center" }}>
                {assets.length === 0
                  ? "No assets registered — tap + REGISTER ASSET"
                  : "No assets match filter"}
              </div>
            )}
            {filtered.map((a: any, i: number) => {
              const critColor = CRIT_COLOR[a.criticality] ?? T.text2;
              const scope     = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
              return (
                <div key={a.id ?? i} style={{ borderBottom:"1px solid rgba(59,130,246,0.06)",
                  padding:"12px 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:12, color:T.blue, marginBottom:4 }}>{a.name}</div>
                      <span style={{ fontSize:8, fontWeight:700, color:critColor,
                        border:`1px solid ${critColor}44`, borderRadius:2,
                        padding:"1px 6px" }}>{a.criticality}</span>
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      <button onClick={() => handleScan(a.id, a.name)}
                        disabled={scanningId === a.id}
                        style={{ ...S.btn, fontSize:8, padding:"2px 6px",
                          opacity: scanningId===a.id ? 0.5 : 1 }}>
                        {scanningId === a.id ? "…" : "⟳"}
                      </button>
                      <button onClick={() => { setEditTarget(a); setModal("edit"); }}
                        style={{ ...S.btn, fontSize:8, padding:"2px 6px" }}>
                        EDIT
                      </button>
                      <button onClick={() => setConfirmId(a.id)}
                        style={{ ...S.btn, fontSize:8, padding:"2px 6px",
                          color:T.red, borderColor:"rgba(239,68,68,0.3)" }}>
                        ✕
                      </button>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                    gap:6, marginBottom:8 }}>
                    {[
                      { label:"TYPE",     val:a.type,            color:T.text2  },
                      { label:"OWNER",    val:a.owner,           color:T.text2  },
                      { label:"BIZ UNIT", val:a.business_unit,   color:T.text2  },
                      { label:"EXPOSURE",
                        val: a.financial_exposure
                          ? `₹${Number(a.financial_exposure).toLocaleString("en-IN")}`
                          : "—",
                        color:T.orange },
                    ].map(item => (
                      <div key={item.label} style={{ background:"rgba(59,130,246,0.03)",
                        border:"1px solid rgba(59,130,246,0.08)",
                        borderRadius:3, padding:"5px 8px" }}>
                        <div style={{ fontSize:7, color:T.text3,
                          letterSpacing:".1em", marginBottom:2 }}>{item.label}</div>
                        <div style={{ fontSize:10, color:item.color }}>{item.val || "—"}</div>
                      </div>
                    ))}
                  </div>
                  {scope.length > 0 && (
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {scope.map((s: string) => (
                        <span key={s} style={{ fontSize:7, color:T.cyan,
                          border:`1px solid ${T.cyan}33`, borderRadius:2,
                          padding:"1px 5px" }}>{s}</span>
                      ))}
                    </div>
                  )}
                  {a.notes && (
                    <div style={{ fontSize:8, color:T.text3, marginTop:6,
                      lineHeight:1.5 }}>{a.notes}</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Desktop table
          <Table cols={[
            "DOMAIN","TYPE","CRITICALITY","OWNER",
            "BUSINESS UNIT","EXPOSURE","COMPLIANCE","LAST SCAN","",
          ]}>
            {loading ? (
              <TR><TD style={{ color:T.text3, fontSize:10 }}>Loading...</TD></TR>
            ) : filtered.length === 0 ? (
              <TR>
                <TD style={{ color:T.text3, fontSize:10 }}>
                  {assets.length === 0
                    ? "No assets registered — click + REGISTER ASSET to begin"
                    : "No assets match filter"}
                </TD>
              </TR>
            ) : (
              filtered.map((a: any, i: number) => {
                const critColor = CRIT_COLOR[a.criticality] ?? T.text2;
                const scope     = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
                return (
                  <TR key={a.id ?? i}>
                    <TD>
                      <div style={{ fontSize:10, color:T.blue }}>{a.name}</div>
                      {a.owner_email && (
                        <div style={{ fontSize:8, color:T.text3 }}>{a.owner_email}</div>
                      )}
                    </TD>
                    <TD style={{ fontSize:9, color:T.text3 }}>{a.type}</TD>
                    <TD>
                      <span style={{ fontSize:8, fontWeight:700, color:critColor,
                        border:`1px solid ${critColor}44`, borderRadius:2,
                        padding:"1px 6px" }}>{a.criticality}</span>
                    </TD>
                    <TD style={{ fontSize:9, color:T.text2 }}>{a.owner || "—"}</TD>
                    <TD style={{ fontSize:9, color:T.text3 }}>{a.business_unit || "—"}</TD>
                    <TD style={{ fontSize:9, color:T.orange }}>
                      {a.financial_exposure
                        ? `₹${Number(a.financial_exposure).toLocaleString("en-IN")}`
                        : "—"}
                    </TD>
                    <TD>
                      <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                        {scope.slice(0,4).map((s: string) => (
                          <span key={s} style={{ fontSize:7, color:T.cyan,
                            border:`1px solid ${T.cyan}33`, borderRadius:2,
                            padding:"1px 4px" }}>{s}</span>
                        ))}
                        {scope.length > 4 && (
                          <span style={{ fontSize:7, color:T.text3 }}>
                            +{scope.length-4}
                          </span>
                        )}
                        {scope.length === 0 && (
                          <span style={{ fontSize:8, color:T.text3 }}>—</span>
                        )}
                      </div>
                    </TD>
                    <TD style={{ fontSize:9, color:T.text3 }}>{a.scan || "Never"}</TD>
                    <TD>
                      <div style={{ display:"flex", gap:4 }}>
                        <button
                          onClick={() => handleScan(a.id, a.name)}
                          disabled={scanningId === a.id}
                          style={{ ...S.btn, fontSize:8, padding:"2px 6px",
                            opacity: scanningId===a.id ? 0.5 : 1 }}>
                          {scanningId === a.id ? "…" : "⟳"}
                        </button>
                        <button
                          onClick={() => { setEditTarget(a); setModal("edit"); }}
                          style={{ ...S.btn, fontSize:8, padding:"2px 6px" }}>
                          EDIT
                        </button>
                        <button
                          onClick={() => setConfirmId(a.id)}
                          style={{ ...S.btn, fontSize:8, padding:"2px 6px",
                            color:T.red, borderColor:"rgba(239,68,68,0.3)" }}>
                          ✕
                        </button>
                      </div>
                    </TD>
                  </TR>
                );
              })
            )}
          </Table>
        )}

        <div style={{ padding:"8px 12px",
          borderTop:"1px solid rgba(59,130,246,0.07)",
          display:"flex", justifyContent:"space-between",
          alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <span style={{ fontSize:10, color:T.text3 }}>
            <b style={{color:T.text2}}>{filtered.length}</b> of{" "}
            <b style={{color:T.text2}}>{assets.length}</b> registered
            {stats.noOwner > 0 && (
              <span style={{color:T.orange}}>
                {" "}· <b>{stats.noOwner}</b> without owner
              </span>
            )}
          </span>
          {!mobile && (
            <span style={{ fontSize:9, color:T.text3 }}>
              ⟳ triggers live TLS scan · data feeds into PQC report &amp; PDF
            </span>
          )}
        </div>
      </Panel>

    </div>
  );
}