import React, { useState, useEffect } from "react";
import {
  API, Panel, PanelHeader, MetricCard, Badge,
  Table, TR, TD,
} from "./shared.js";

// ─── LIGHT PALETTE ────────────────────────────────────────────────────────────
const L = {
  accent:       "#0ea5e9",
  accentDark:   "#0284c7",
  accentDim:    "rgba(14,165,233,0.1)",
  accentBorder: "rgba(14,165,233,0.22)",
  text:         "#050d1a",
  textSec:      "#1e293b",
  textDim:      "#334155",
  textMuted:    "#475569",
  textFaint:    "#64748b",
  divider:      "rgba(14,165,233,0.12)",
  panelBg:      "#ffffff",
  pageBg:       "#f1f5f9",
  rowHover:     "rgba(14,165,233,0.04)",
  inputBg:      "#f8fafc",
  red:          "#dc2626",
  orange:       "#ea580c",
  yellow:       "#ca8a04",
  green:        "#16a34a",
  cyan:         "#0891b2",
  blue:         "#1d4ed8",
};

// ── Constants ─────────────────────────────────────────────────────────────────
const ASSET_TYPES     = ["Web App","API","Server","Gateway","Core Banking","Internet Banking","Mobile Banking","Other"];
const CRITICALITY     = ["Critical","High","Medium","Low"];
const COMPLIANCE_OPTS = ["RBI","ISO27001","NIST","PCIDSS","SWIFT","DORA"];

const CRIT_COLOR: Record<string, string> = {
  Critical: L.red, High: L.orange, Medium: L.yellow, Low: L.green,
};

const EMPTY_FORM = {
  name:"", url:"", type:"Web App", criticality:"Medium",
  owner:"", owner_email:"", business_unit:"",
  financial_exposure:"", compliance_scope:[] as string[], notes:"",
};

// Shared style shortcuts
const inputSt: React.CSSProperties = {
  background: L.inputBg,
  border: `1px solid ${L.accentBorder}`,
  borderRadius: 6,
  color: L.text,
  padding: "7px 10px",
  fontSize: 11,
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
};

const btnSt: React.CSSProperties = {
  background: L.accent,
  border: "none",
  borderRadius: 6,
  color: "#fff",
  cursor: "pointer",
  padding: "0 13px",
  fontFamily: "'Orbitron',monospace",
  fontSize: 9,
  letterSpacing: "0.12em",
  fontWeight: 700,
  whiteSpace: "nowrap",
  transition: "all 0.2s",
  boxShadow: `0 2px 8px ${L.accent}44`,
};

const btnGhostSt: React.CSSProperties = {
  background: L.accentDim,
  border: `1px solid ${L.accentBorder}`,
  borderRadius: 6,
  color: L.accentDark,
  cursor: "pointer",
  padding: "0 13px",
  fontFamily: "'Orbitron',monospace",
  fontSize: 9,
  letterSpacing: "0.12em",
  fontWeight: 700,
  whiteSpace: "nowrap",
  transition: "all 0.2s",
};

const lblSt: React.CSSProperties = {
  fontSize: 8,
  color: L.textDim,
  letterSpacing: ".12em",
  marginBottom: 5,
  display: "block",
  fontFamily: "'Orbitron',monospace",
  fontWeight: 700,
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

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(5,13,26,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, backdropFilter: "blur(6px)",
    }}>
      <div style={{
        background: L.panelBg,
        border: `1px solid ${L.accentBorder}`,
        borderRadius: 12,
        padding: 24,
        width: "100%", maxWidth: 540,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,0.15)",
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 3, height: 18, background: L.accent, borderRadius: 2 }} />
            <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 11, color: L.text, letterSpacing: ".12em", fontWeight: 700 }}>
              {initial.name ? "EDIT ASSET" : "REGISTER ASSET"}
            </span>
          </div>
          <button onClick={onClose} style={{ ...btnGhostSt, padding: "4px 10px", fontSize: 12 }}>✕</button>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div style={{
            background: "rgba(220,38,38,0.06)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: 6, padding: "8px 12px", marginBottom: 16,
          }}>
            {errors.map((e, i) => (
              <div key={i} style={{ fontSize: 10, color: L.red, fontWeight: 600 }}>• {e}</div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={lblSt}>DOMAIN *</label>
            <input style={inputSt} placeholder="pnb.bank.in" value={form.name}
              onChange={e => {
                const v = e.target.value.replace(/^https?:\/\//,"").replace(/\/.*$/,"");
                set("name", v);
                if (!form.url) set("url", `https://${v}`);
              }} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={lblSt}>URL *</label>
            <input style={inputSt} placeholder="https://pnb.bank.in" value={form.url}
              onChange={e => set("url", e.target.value)} />
          </div>
          <div>
            <label style={lblSt}>TYPE</label>
            <select style={inputSt} value={form.type} onChange={e => set("type", e.target.value)}>
              {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lblSt}>CRITICALITY</label>
            <select
              style={{ ...inputSt, color: CRIT_COLOR[form.criticality] ?? L.text, fontWeight: 700 }}
              value={form.criticality}
              onChange={e => set("criticality", e.target.value)}
            >
              {CRITICALITY.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lblSt}>OWNER</label>
            <input style={inputSt} placeholder="CISO" value={form.owner}
              onChange={e => set("owner", e.target.value)} />
          </div>
          <div>
            <label style={lblSt}>
              OWNER EMAIL
              {["Critical","High"].includes(form.criticality) && (
                <span style={{ color: L.red }}> *</span>
              )}
            </label>
            <input style={inputSt} type="email" placeholder="security@bank.co.in"
              value={form.owner_email} onChange={e => set("owner_email", e.target.value)} />
          </div>
          <div>
            <label style={lblSt}>BUSINESS UNIT</label>
            <input style={inputSt} placeholder="Retail Banking" value={form.business_unit}
              onChange={e => set("business_unit", e.target.value)} />
          </div>
          <div>
            <label style={lblSt}>FINANCIAL EXPOSURE (₹)</label>
            <input style={inputSt} type="number" placeholder="500000000"
              value={form.financial_exposure}
              onChange={e => set("financial_exposure", e.target.value)} />
          </div>

          {/* Compliance scope */}
          <div style={{ gridColumn: "1/-1" }}>
            <label style={lblSt}>COMPLIANCE SCOPE</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COMPLIANCE_OPTS.map(s => {
                const on = form.compliance_scope.includes(s);
                return (
                  <button key={s} type="button" onClick={() => toggleScope(s)} style={{
                    fontSize: 9, padding: "4px 12px", borderRadius: 20, cursor: "pointer",
                    border: `1px solid ${on ? L.accent : L.accentBorder}`,
                    background: on ? L.accent : L.accentDim,
                    color: on ? "#fff" : L.textDim,
                    fontFamily: "'Orbitron',monospace",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    transition: "all 0.15s",
                  }}>{s}</button>
                );
              })}
            </div>
          </div>

          <div style={{ gridColumn: "1/-1" }}>
            <label style={lblSt}>NOTES</label>
            <textarea style={{ ...inputSt, minHeight: 56, resize: "vertical" }}
              placeholder="Main internet banking portal..."
              value={form.notes}
              onChange={e => set("notes", e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={btnGhostSt}>CANCEL</button>
          <button
            disabled={saving}
            onClick={() => { if (validate()) onSave(form); }}
            style={{ ...btnSt, opacity: saving ? 0.65 : 1 }}
          >
            {saving ? "SAVING..." : initial.name ? "UPDATE" : "REGISTER"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ name, onConfirm, onCancel }: {
  name: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 101,
      background: "rgba(5,13,26,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(6px)",
    }}>
      <div style={{
        background: L.panelBg,
        border: "1px solid rgba(220,38,38,0.25)",
        borderRadius: 12, padding: 24, maxWidth: 360, width: "100%",
        boxShadow: "0 24px 80px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 3, height: 16, background: L.red, borderRadius: 2 }} />
          <div style={{ fontSize: 12, color: L.red, fontFamily: "'Orbitron',monospace", fontWeight: 700, letterSpacing: ".1em" }}>
            DEACTIVATE ASSET
          </div>
        </div>
        <div style={{ fontSize: 11, color: L.textSec, marginBottom: 20, lineHeight: 1.6 }}>
          Deactivate <b style={{ color: L.blue }}>{name}</b>?
          Data is retained for audit trail.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={btnGhostSt}>CANCEL</button>
          <button onClick={onConfirm} style={{
            ...btnSt,
            background: "rgba(220,38,38,0.1)",
            border: "1px solid rgba(220,38,38,0.35)",
            color: L.red,
            boxShadow: "none",
          }}>
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
          headers: { "Content-Type": "application/json" },
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
      const r = await fetch(`${API}/assets/${id}/scan`, { method: "POST" });
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
      const r = await fetch(`${API}/assets/${id}`, { method: "DELETE" });
      const d = await r.json();
      r.ok ? showToast(`Deactivated ${d.name}`) : showToast(d.detail ?? "Failed", false);
      setConfirmId(null);
      await load();
    } catch { showToast("Deactivate failed", false); }
  }

  const confirmAsset = assets.find((a: any) => a.id === confirmId);

  return (
    <div style={{ padding: 20, background: L.pageBg, minHeight: "100vh", fontFamily: "Share Tech Mono" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.2); border-radius: 2px; }
        .reg-row:hover { background: ${L.rowHover} !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 200,
          background: toast.ok ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
          border: `1px solid ${toast.ok ? L.green : L.red}`,
          borderRadius: 8, padding: "10px 16px", fontSize: 11,
          color: toast.ok ? L.green : L.red, fontWeight: 700,
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>{toast.ok ? "✓" : "✗"}</span>
          {toast.msg}
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
      <div style={{
        display: "grid",
        gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)",
        gap: 10, marginBottom: 14,
      }}>
        {[
          { label: "REGISTERED",    value: stats.total,    sub: "Assets in registry",  color: L.blue,   bgTint: "rgba(29,78,216,0.05)"  },
          { label: "CRITICAL",      value: stats.critical, sub: "High priority",        color: L.red,    bgTint: "rgba(220,38,38,0.05)"  },
          { label: "NO OWNER",      value: stats.noOwner,  sub: "Needs assignment",     color: L.orange, bgTint: "rgba(234,88,12,0.05)"  },
          { label: "CERT EXPIRING", value: stats.expiring, sub: "Within 30 days",       color: L.yellow, bgTint: "rgba(202,138,4,0.05)"  },
        ].map(m => (
          <div key={m.label} style={{
            background: `linear-gradient(135deg,#fff 0%,${m.bgTint} 100%)`,
            border: `1px solid rgba(14,165,233,0.15)`,
            borderRadius: 10,
            padding: mobile ? "12px 14px" : "14px 16px",
            boxShadow: "0 1px 4px rgba(14,165,233,0.08)",
          }}>
            <div style={{ fontSize: 7.5, color: "#1e3a5f", letterSpacing: "0.14em", fontFamily: "'Orbitron',monospace", fontWeight: 700, marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontFamily: "'Orbitron',monospace", fontSize: mobile ? 26 : 32, fontWeight: 700, color: m.color, lineHeight: 1, marginBottom: 4 }}>{m.value}</div>
            <div style={{ fontSize: 8, color: L.textMuted, fontWeight: 500 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Panel */}
      <div style={{
        background: L.panelBg,
        border: `1px solid ${L.accentBorder}`,
        borderRadius: 10,
        boxShadow: "0 1px 4px rgba(14,165,233,0.08), 0 4px 16px rgba(0,0,0,0.04)",
      }}>
        {/* Panel header */}
        <div style={{
          padding: "11px 16px",
          borderBottom: `1px solid ${L.divider}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 3, height: 14, background: L.accent, borderRadius: 2 }} />
            <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: "#1e3a5f", fontWeight: 700 }}>ASSET REGISTRY</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search domain / owner..."
              style={{ ...inputSt, width: mobile ? 130 : 180, fontSize: 11 }}
            />
            <select
              value={filterCrit}
              onChange={e => setFilterCrit(e.target.value)}
              style={{
                ...inputSt, width: "auto", cursor: "pointer",
                color: filterCrit === "All" ? L.textDim : (CRIT_COLOR[filterCrit] ?? L.textDim),
                fontWeight: 700,
              }}
            >
              <option value="All">All</option>
              {CRITICALITY.map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={() => setModal("add")} style={btnSt}>
              + REGISTER ASSET
            </button>
          </div>
        </div>

        {/* Mobile cards */}
        {mobile ? (
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {loading && (
              <div style={{ padding: 24, fontSize: 10, color: L.textMuted, textAlign: "center" }}>Loading...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: 24, fontSize: 10, color: L.textMuted, textAlign: "center" }}>
                {assets.length === 0 ? "No assets registered — tap + REGISTER ASSET" : "No assets match filter"}
              </div>
            )}
            {filtered.map((a: any, i: number) => {
              const critColor = CRIT_COLOR[a.criticality] ?? L.textDim;
              const scope = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
              return (
                <div key={a.id ?? i} className="reg-row" style={{
                  borderBottom: `1px solid ${L.divider}`,
                  padding: "12px 14px",
                  background: "transparent",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, color: L.blue, fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
                      <span style={{
                        fontSize: 8, fontWeight: 700, color: critColor,
                        border: `1px solid ${critColor}44`, borderRadius: 4,
                        padding: "2px 7px",
                      }}>{a.criticality}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => handleScan(a.id, a.name)} disabled={scanningId === a.id}
                        style={{ ...btnGhostSt, padding: "4px 8px", opacity: scanningId === a.id ? 0.5 : 1 }}>
                        {scanningId === a.id ? "…" : "⟳"}
                      </button>
                      <button onClick={() => { setEditTarget(a); setModal("edit"); }}
                        style={{ ...btnGhostSt, padding: "4px 8px" }}>EDIT</button>
                      <button onClick={() => setConfirmId(a.id)}
                        style={{ ...btnGhostSt, padding: "4px 8px", color: L.red, borderColor: "rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)" }}>✕</button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    {[
                      { label: "TYPE",     val: a.type,          color: L.textSec  },
                      { label: "OWNER",    val: a.owner,         color: L.textSec  },
                      { label: "BIZ UNIT", val: a.business_unit, color: L.textSec  },
                      { label: "EXPOSURE",
                        val: a.financial_exposure
                          ? `₹${Number(a.financial_exposure).toLocaleString("en-IN")}` : "—",
                        color: L.orange },
                    ].map(item => (
                      <div key={item.label} style={{
                        background: L.pageBg,
                        border: `1px solid ${L.divider}`,
                        borderRadius: 6, padding: "5px 8px",
                      }}>
                        <div style={{ fontSize: 7, color: L.textMuted, letterSpacing: ".1em", marginBottom: 2, fontFamily: "'Orbitron',monospace", fontWeight: 700 }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: item.color, fontWeight: 500 }}>{item.val || "—"}</div>
                      </div>
                    ))}
                  </div>
                  {scope.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                      {scope.map((s: string) => (
                        <span key={s} style={{
                          fontSize: 7, color: L.cyan,
                          border: `1px solid rgba(8,145,178,0.3)`,
                          borderRadius: 20, padding: "2px 7px",
                          fontFamily: "'Orbitron',monospace", fontWeight: 700,
                        }}>{s}</span>
                      ))}
                    </div>
                  )}
                  {a.notes && (
                    <div style={{ fontSize: 8, color: L.textMuted, marginTop: 4, lineHeight: 1.5 }}>{a.notes}</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Desktop table
          <div style={{ overflowX: "auto" }}>
            {/* Column headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 0.8fr 0.8fr 1fr 1fr 1fr 1.2fr 0.8fr 130px",
              padding: "7px 16px",
              borderBottom: `1px solid ${L.divider}`,
              background: L.pageBg,
            }}>
              {["DOMAIN","TYPE","CRITICALITY","OWNER","BUSINESS UNIT","EXPOSURE","COMPLIANCE","LAST SCAN",""].map(h => (
                <span key={h} style={{
                  fontSize: 7.5, color: "#1e3a5f",
                  letterSpacing: "0.14em",
                  fontFamily: "'Orbitron',monospace", fontWeight: 700,
                }}>{h}</span>
              ))}
            </div>

            <div style={{ maxHeight: 520, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: 24, fontSize: 10, color: L.textMuted, textAlign: "center" }}>Loading...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 24, fontSize: 10, color: L.textMuted, textAlign: "center" }}>
                  {assets.length === 0 ? "No assets registered — click + REGISTER ASSET to begin" : "No assets match filter"}
                </div>
              ) : (
                filtered.map((a: any, i: number) => {
                  const critColor = CRIT_COLOR[a.criticality] ?? L.textDim;
                  const scope = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
                  return (
                    <div key={a.id ?? i} className="reg-row" style={{
                      display: "grid",
                      gridTemplateColumns: "1.6fr 0.8fr 0.8fr 1fr 1fr 1fr 1.2fr 0.8fr 130px",
                      padding: "9px 16px",
                      borderBottom: `1px solid ${L.divider}`,
                      alignItems: "center",
                      background: "transparent",
                      transition: "background 0.12s",
                    }}>
                      {/* Domain */}
                      <div>
                        <div style={{ fontSize: 10, color: L.blue, fontWeight: 600 }}>{a.name}</div>
                        {a.owner_email && (
                          <div style={{ fontSize: 8, color: L.textMuted, marginTop: 1 }}>{a.owner_email}</div>
                        )}
                      </div>
                      {/* Type */}
                      <div style={{ fontSize: 9, color: L.textDim, fontWeight: 500 }}>{a.type}</div>
                      {/* Criticality */}
                      <div>
                        <span style={{
                          fontSize: 8, fontWeight: 700, color: critColor,
                          border: `1px solid ${critColor}44`, borderRadius: 4,
                          padding: "2px 7px",
                          background: `${critColor}0a`,
                        }}>{a.criticality}</span>
                      </div>
                      {/* Owner */}
                      <div style={{ fontSize: 9, color: L.textSec, fontWeight: 500 }}>{a.owner || "—"}</div>
                      {/* Biz unit */}
                      <div style={{ fontSize: 9, color: L.textDim }}>{a.business_unit || "—"}</div>
                      {/* Exposure */}
                      <div style={{ fontSize: 9, color: L.orange, fontWeight: 600 }}>
                        {a.financial_exposure
                          ? `₹${Number(a.financial_exposure).toLocaleString("en-IN")}`
                          : <span style={{ color: L.textMuted, fontWeight: 400 }}>—</span>}
                      </div>
                      {/* Compliance */}
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {scope.slice(0,4).map((s: string) => (
                          <span key={s} style={{
                            fontSize: 7, color: L.cyan,
                            border: "1px solid rgba(8,145,178,0.3)",
                            borderRadius: 20, padding: "1px 5px",
                            fontFamily: "'Orbitron',monospace", fontWeight: 700,
                          }}>{s}</span>
                        ))}
                        {scope.length > 4 && (
                          <span style={{ fontSize: 7, color: L.textMuted }}>+{scope.length-4}</span>
                        )}
                        {scope.length === 0 && (
                          <span style={{ fontSize: 9, color: L.textMuted }}>—</span>
                        )}
                      </div>
                      {/* Last scan */}
                      <div style={{ fontSize: 9, color: L.textMuted }}>{a.scan || "Never"}</div>
                      {/* Actions */}
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => handleScan(a.id, a.name)}
                          disabled={scanningId === a.id}
                          style={{ ...btnGhostSt, padding: "4px 8px", opacity: scanningId === a.id ? 0.5 : 1 }}
                        >{scanningId === a.id ? "…" : "⟳"}</button>
                        <button
                          onClick={() => { setEditTarget(a); setModal("edit"); }}
                          style={{ ...btnGhostSt, padding: "4px 8px" }}
                        >EDIT</button>
                        <button
                          onClick={() => setConfirmId(a.id)}
                          style={{ ...btnGhostSt, padding: "4px 8px", color: L.red, borderColor: "rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)" }}
                        >✕</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: "8px 16px",
          borderTop: `1px solid ${L.divider}`,
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 8,
        }}>
          <span style={{ fontSize: 10, color: L.textDim, fontWeight: 500 }}>
            <b style={{ color: L.textSec }}>{filtered.length}</b> of{" "}
            <b style={{ color: L.textSec }}>{assets.length}</b> registered
            {stats.noOwner > 0 && (
              <span style={{ color: L.orange, fontWeight: 700 }}>
                {" "}· <b>{stats.noOwner}</b> without owner
              </span>
            )}
          </span>
          {!mobile && (
            <span style={{ fontSize: 9, color: L.textMuted }}>
              ⟳ triggers live TLS scan · data feeds into PQC report &amp; PDF
            </span>
          )}
        </div>
      </div>
    </div>
  );
}