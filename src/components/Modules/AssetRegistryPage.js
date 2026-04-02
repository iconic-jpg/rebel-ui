import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { API, } from "./shared.js";
// ─── LIGHT PALETTE ────────────────────────────────────────────────────────────
const L = {
    accent: "#0ea5e9",
    accentDark: "#0284c7",
    accentDim: "rgba(14,165,233,0.1)",
    accentBorder: "rgba(14,165,233,0.22)",
    text: "#050d1a",
    textSec: "#1e293b",
    textDim: "#334155",
    textMuted: "#475569",
    textFaint: "#64748b",
    divider: "rgba(14,165,233,0.12)",
    panelBg: "#ffffff",
    pageBg: "#f1f5f9",
    rowHover: "rgba(14,165,233,0.04)",
    inputBg: "#f8fafc",
    red: "#dc2626",
    orange: "#ea580c",
    yellow: "#ca8a04",
    green: "#16a34a",
    cyan: "#0891b2",
    blue: "#1d4ed8",
};
// ── Constants ─────────────────────────────────────────────────────────────────
const ASSET_TYPES = ["Web App", "API", "Server", "Gateway", "Core Banking", "Internet Banking", "Mobile Banking", "Other"];
const CRITICALITY = ["Critical", "High", "Medium", "Low"];
const COMPLIANCE_OPTS = ["RBI", "ISO27001", "NIST", "PCIDSS", "SWIFT", "DORA"];
const CRIT_COLOR = {
    Critical: L.red, High: L.orange, Medium: L.yellow, Low: L.green,
};
const EMPTY_FORM = {
    name: "", url: "", type: "Web App", criticality: "Medium",
    owner: "", owner_email: "", business_unit: "",
    financial_exposure: "", compliance_scope: [], notes: "",
};
// Shared style shortcuts
const inputSt = {
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
const btnSt = {
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
const btnGhostSt = {
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
const lblSt = {
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
function AssetModal({ initial, onSave, onClose, saving }) {
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState([]);
    function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
    function toggleScope(s) {
        setForm(f => ({
            ...f,
            compliance_scope: f.compliance_scope.includes(s)
                ? f.compliance_scope.filter((x) => x !== s)
                : [...f.compliance_scope, s],
        }));
    }
    function validate() {
        const e = [];
        if (!form.name.trim())
            e.push("Domain is required");
        if (!form.url.startsWith("http"))
            e.push("URL must start with https://");
        if (["Critical", "High"].includes(form.criticality) && !form.owner_email.trim())
            e.push("Critical/High assets require an owner email");
        setErrors(e);
        return e.length === 0;
    }
    return (_jsx("div", { style: {
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(5,13,26,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, backdropFilter: "blur(6px)",
        }, children: _jsxs("div", { style: {
                background: L.panelBg,
                border: `1px solid ${L.accentBorder}`,
                borderRadius: 12,
                padding: 24,
                width: "100%", maxWidth: 540,
                maxHeight: "90vh", overflowY: "auto",
                boxShadow: "0 24px 80px rgba(0,0,0,0.15)",
            }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { width: 3, height: 18, background: L.accent, borderRadius: 2 } }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 11, color: L.text, letterSpacing: ".12em", fontWeight: 700 }, children: initial.name ? "EDIT ASSET" : "REGISTER ASSET" })] }), _jsx("button", { onClick: onClose, style: { ...btnGhostSt, padding: "4px 10px", fontSize: 12 }, children: "\u2715" })] }), errors.length > 0 && (_jsx("div", { style: {
                        background: "rgba(220,38,38,0.06)",
                        border: "1px solid rgba(220,38,38,0.25)",
                        borderRadius: 6, padding: "8px 12px", marginBottom: 16,
                    }, children: errors.map((e, i) => (_jsxs("div", { style: { fontSize: 10, color: L.red, fontWeight: 600 }, children: ["\u2022 ", e] }, i))) })), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [_jsxs("div", { style: { gridColumn: "1/-1" }, children: [_jsx("label", { style: lblSt, children: "DOMAIN *" }), _jsx("input", { style: inputSt, placeholder: "pnb.bank.in", value: form.name, onChange: e => {
                                        const v = e.target.value.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
                                        set("name", v);
                                        if (!form.url)
                                            set("url", `https://${v}`);
                                    } })] }), _jsxs("div", { style: { gridColumn: "1/-1" }, children: [_jsx("label", { style: lblSt, children: "URL *" }), _jsx("input", { style: inputSt, placeholder: "https://pnb.bank.in", value: form.url, onChange: e => set("url", e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { style: lblSt, children: "TYPE" }), _jsx("select", { style: inputSt, value: form.type, onChange: e => set("type", e.target.value), children: ASSET_TYPES.map(t => _jsx("option", { children: t }, t)) })] }), _jsxs("div", { children: [_jsx("label", { style: lblSt, children: "CRITICALITY" }), _jsx("select", { style: { ...inputSt, color: CRIT_COLOR[form.criticality] ?? L.text, fontWeight: 700 }, value: form.criticality, onChange: e => set("criticality", e.target.value), children: CRITICALITY.map(c => _jsx("option", { children: c }, c)) })] }), _jsxs("div", { children: [_jsx("label", { style: lblSt, children: "OWNER" }), _jsx("input", { style: inputSt, placeholder: "CISO", value: form.owner, onChange: e => set("owner", e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { style: lblSt, children: ["OWNER EMAIL", ["Critical", "High"].includes(form.criticality) && (_jsx("span", { style: { color: L.red }, children: " *" }))] }), _jsx("input", { style: inputSt, type: "email", placeholder: "security@bank.co.in", value: form.owner_email, onChange: e => set("owner_email", e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { style: lblSt, children: "BUSINESS UNIT" }), _jsx("input", { style: inputSt, placeholder: "Retail Banking", value: form.business_unit, onChange: e => set("business_unit", e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { style: lblSt, children: "FINANCIAL EXPOSURE (\u20B9)" }), _jsx("input", { style: inputSt, type: "number", placeholder: "500000000", value: form.financial_exposure, onChange: e => set("financial_exposure", e.target.value) })] }), _jsxs("div", { style: { gridColumn: "1/-1" }, children: [_jsx("label", { style: lblSt, children: "COMPLIANCE SCOPE" }), _jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: COMPLIANCE_OPTS.map(s => {
                                        const on = form.compliance_scope.includes(s);
                                        return (_jsx("button", { type: "button", onClick: () => toggleScope(s), style: {
                                                fontSize: 9, padding: "4px 12px", borderRadius: 20, cursor: "pointer",
                                                border: `1px solid ${on ? L.accent : L.accentBorder}`,
                                                background: on ? L.accent : L.accentDim,
                                                color: on ? "#fff" : L.textDim,
                                                fontFamily: "'Orbitron',monospace",
                                                fontWeight: 700,
                                                letterSpacing: "0.08em",
                                                transition: "all 0.15s",
                                            }, children: s }, s));
                                    }) })] }), _jsxs("div", { style: { gridColumn: "1/-1" }, children: [_jsx("label", { style: lblSt, children: "NOTES" }), _jsx("textarea", { style: { ...inputSt, minHeight: 56, resize: "vertical" }, placeholder: "Main internet banking portal...", value: form.notes, onChange: e => set("notes", e.target.value) })] })] }), _jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }, children: [_jsx("button", { onClick: onClose, style: btnGhostSt, children: "CANCEL" }), _jsx("button", { disabled: saving, onClick: () => { if (validate())
                                onSave(form); }, style: { ...btnSt, opacity: saving ? 0.65 : 1 }, children: saving ? "SAVING..." : initial.name ? "UPDATE" : "REGISTER" })] })] }) }));
}
// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ name, onConfirm, onCancel }) {
    return (_jsx("div", { style: {
            position: "fixed", inset: 0, zIndex: 101,
            background: "rgba(5,13,26,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(6px)",
        }, children: _jsxs("div", { style: {
                background: L.panelBg,
                border: "1px solid rgba(220,38,38,0.25)",
                borderRadius: 12, padding: 24, maxWidth: 360, width: "100%",
                boxShadow: "0 24px 80px rgba(0,0,0,0.15)",
            }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }, children: [_jsx("div", { style: { width: 3, height: 16, background: L.red, borderRadius: 2 } }), _jsx("div", { style: { fontSize: 12, color: L.red, fontFamily: "'Orbitron',monospace", fontWeight: 700, letterSpacing: ".1em" }, children: "DEACTIVATE ASSET" })] }), _jsxs("div", { style: { fontSize: 11, color: L.textSec, marginBottom: 20, lineHeight: 1.6 }, children: ["Deactivate ", _jsx("b", { style: { color: L.blue }, children: name }), "? Data is retained for audit trail."] }), _jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" }, children: [_jsx("button", { onClick: onCancel, style: btnGhostSt, children: "CANCEL" }), _jsx("button", { onClick: onConfirm, style: {
                                ...btnSt,
                                background: "rgba(220,38,38,0.1)",
                                border: "1px solid rgba(220,38,38,0.35)",
                                color: L.red,
                                boxShadow: "none",
                            }, children: "DEACTIVATE" })] })] }) }));
}
// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AssetRegistryPage() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [scanningId, setScanningId] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    const [toast, setToast] = useState(null);
    const [search, setSearch] = useState("");
    const [filterCrit, setFilterCrit] = useState("All");
    const mobile = useMobile();
    function showToast(msg, ok = true) {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    }
    async function load() {
        setLoading(true);
        try {
            const r = await fetch(`${API}/assets`);
            const d = await r.json();
            setAssets((d.assets ?? []).filter((a) => a.id));
        }
        catch {
            showToast("Failed to load registry", false);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, []);
    const filtered = assets.filter((a) => {
        const ms = !search ||
            a.name?.toLowerCase().includes(search.toLowerCase()) ||
            a.owner?.toLowerCase().includes(search.toLowerCase()) ||
            a.business_unit?.toLowerCase().includes(search.toLowerCase());
        const mc = filterCrit === "All" || a.criticality === filterCrit;
        return ms && mc;
    });
    const stats = {
        total: assets.length,
        critical: assets.filter((a) => a.criticality === "Critical").length,
        noOwner: assets.filter((a) => !a.owner_email).length,
        expiring: assets.filter((a) => a.days_left != null && a.days_left < 30).length,
    };
    async function handleSave(form) {
        setSaving(true);
        try {
            const isEdit = modal === "edit" && editTarget?.id;
            const body = { ...form };
            if (body.financial_exposure === "")
                body.financial_exposure = null;
            else if (body.financial_exposure)
                body.financial_exposure = parseInt(body.financial_exposure);
            const r = await fetch(isEdit ? `${API}/assets/${editTarget.id}` : `${API}/assets`, { method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body) });
            const d = await r.json();
            if (!r.ok) {
                showToast(Array.isArray(d.detail) ? d.detail.join(" · ") : d.detail, false);
                return;
            }
            showToast(isEdit ? `Updated ${form.name}` : `Registered ${form.name}`);
            setModal(null);
            setEditTarget(null);
            await load();
        }
        catch {
            showToast("Save failed", false);
        }
        finally {
            setSaving(false);
        }
    }
    async function handleScan(id, name) {
        setScanningId(id);
        try {
            const r = await fetch(`${API}/assets/${id}/scan`, { method: "POST" });
            const d = await r.json();
            d.status === "scanned"
                ? showToast(`Scanned ${name} — TLS ${d.tls_version ?? "?"}`)
                : showToast(`Scan failed: ${d.error ?? "unknown"}`, false);
            await load();
        }
        catch {
            showToast("Scan failed", false);
        }
        finally {
            setScanningId(null);
        }
    }
    async function handleDelete(id) {
        try {
            const r = await fetch(`${API}/assets/${id}`, { method: "DELETE" });
            const d = await r.json();
            r.ok ? showToast(`Deactivated ${d.name}`) : showToast(d.detail ?? "Failed", false);
            setConfirmId(null);
            await load();
        }
        catch {
            showToast("Deactivate failed", false);
        }
    }
    const confirmAsset = assets.find((a) => a.id === confirmId);
    return (_jsxs("div", { style: { padding: 20, background: L.pageBg, minHeight: "100vh", fontFamily: "Share Tech Mono" }, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.2); border-radius: 2px; }
        .reg-row:hover { background: ${L.rowHover} !important; }
      ` }), toast && (_jsxs("div", { style: {
                    position: "fixed", bottom: 24, right: 24, zIndex: 200,
                    background: toast.ok ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
                    border: `1px solid ${toast.ok ? L.green : L.red}`,
                    borderRadius: 8, padding: "10px 16px", fontSize: 11,
                    color: toast.ok ? L.green : L.red, fontWeight: 700,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                    display: "flex", alignItems: "center", gap: 8,
                }, children: [_jsx("span", { style: { fontSize: 14 }, children: toast.ok ? "✓" : "✗" }), toast.msg] })), modal && (_jsx(AssetModal, { initial: modal === "edit" && editTarget ? {
                    name: editTarget.name ?? "",
                    url: editTarget.url ?? "",
                    type: editTarget.type ?? "Web App",
                    criticality: editTarget.criticality ?? "Medium",
                    owner: editTarget.owner ?? "",
                    owner_email: editTarget.owner_email ?? "",
                    business_unit: editTarget.business_unit ?? "",
                    financial_exposure: editTarget.financial_exposure?.toString() ?? "",
                    compliance_scope: editTarget.compliance_scope ?? [],
                    notes: editTarget.notes ?? "",
                } : EMPTY_FORM, onSave: handleSave, onClose: () => { setModal(null); setEditTarget(null); }, saving: saving })), confirmId != null && confirmAsset && (_jsx(ConfirmDialog, { name: confirmAsset.name, onConfirm: () => handleDelete(confirmId), onCancel: () => setConfirmId(null) })), _jsx("div", { style: {
                    display: "grid",
                    gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)",
                    gap: 10, marginBottom: 14,
                }, children: [
                    { label: "REGISTERED", value: stats.total, sub: "Assets in registry", color: L.blue, bgTint: "rgba(29,78,216,0.05)" },
                    { label: "CRITICAL", value: stats.critical, sub: "High priority", color: L.red, bgTint: "rgba(220,38,38,0.05)" },
                    { label: "NO OWNER", value: stats.noOwner, sub: "Needs assignment", color: L.orange, bgTint: "rgba(234,88,12,0.05)" },
                    { label: "CERT EXPIRING", value: stats.expiring, sub: "Within 30 days", color: L.yellow, bgTint: "rgba(202,138,4,0.05)" },
                ].map(m => (_jsxs("div", { style: {
                        background: `linear-gradient(135deg,#fff 0%,${m.bgTint} 100%)`,
                        border: `1px solid rgba(14,165,233,0.15)`,
                        borderRadius: 10,
                        padding: mobile ? "12px 14px" : "14px 16px",
                        boxShadow: "0 1px 4px rgba(14,165,233,0.08)",
                    }, children: [_jsx("div", { style: { fontSize: 7.5, color: "#1e3a5f", letterSpacing: "0.14em", fontFamily: "'Orbitron',monospace", fontWeight: 700, marginBottom: 6 }, children: m.label }), _jsx("div", { style: { fontFamily: "'Orbitron',monospace", fontSize: mobile ? 26 : 32, fontWeight: 700, color: m.color, lineHeight: 1, marginBottom: 4 }, children: m.value }), _jsx("div", { style: { fontSize: 8, color: L.textMuted, fontWeight: 500 }, children: m.sub })] }, m.label))) }), _jsxs("div", { style: {
                    background: L.panelBg,
                    border: `1px solid ${L.accentBorder}`,
                    borderRadius: 10,
                    boxShadow: "0 1px 4px rgba(14,165,233,0.08), 0 4px 16px rgba(0,0,0,0.04)",
                }, children: [_jsxs("div", { style: {
                            padding: "11px 16px",
                            borderBottom: `1px solid ${L.divider}`,
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            flexWrap: "wrap", gap: 8,
                        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { width: 3, height: 14, background: L.accent, borderRadius: 2 } }), _jsx("span", { style: { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: "#1e3a5f", fontWeight: 700 }, children: "ASSET REGISTRY" })] }), _jsxs("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }, children: [_jsx("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Search domain / owner...", style: { ...inputSt, width: mobile ? 130 : 180, fontSize: 11 } }), _jsxs("select", { value: filterCrit, onChange: e => setFilterCrit(e.target.value), style: {
                                            ...inputSt, width: "auto", cursor: "pointer",
                                            color: filterCrit === "All" ? L.textDim : (CRIT_COLOR[filterCrit] ?? L.textDim),
                                            fontWeight: 700,
                                        }, children: [_jsx("option", { value: "All", children: "All" }), CRITICALITY.map(c => _jsx("option", { children: c }, c))] }), _jsx("button", { onClick: () => setModal("add"), style: btnSt, children: "+ REGISTER ASSET" })] })] }), mobile ? (_jsxs("div", { style: { maxHeight: 520, overflowY: "auto" }, children: [loading && (_jsx("div", { style: { padding: 24, fontSize: 10, color: L.textMuted, textAlign: "center" }, children: "Loading..." })), !loading && filtered.length === 0 && (_jsx("div", { style: { padding: 24, fontSize: 10, color: L.textMuted, textAlign: "center" }, children: assets.length === 0 ? "No assets registered — tap + REGISTER ASSET" : "No assets match filter" })), filtered.map((a, i) => {
                                const critColor = CRIT_COLOR[a.criticality] ?? L.textDim;
                                const scope = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
                                return (_jsxs("div", { className: "reg-row", style: {
                                        borderBottom: `1px solid ${L.divider}`,
                                        padding: "12px 14px",
                                        background: "transparent",
                                    }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: L.blue, fontWeight: 600, marginBottom: 4 }, children: a.name }), _jsx("span", { style: {
                                                                fontSize: 8, fontWeight: 700, color: critColor,
                                                                border: `1px solid ${critColor}44`, borderRadius: 4,
                                                                padding: "2px 7px",
                                                            }, children: a.criticality })] }), _jsxs("div", { style: { display: "flex", gap: 4 }, children: [_jsx("button", { onClick: () => handleScan(a.id, a.name), disabled: scanningId === a.id, style: { ...btnGhostSt, padding: "4px 8px", opacity: scanningId === a.id ? 0.5 : 1 }, children: scanningId === a.id ? "…" : "⟳" }), _jsx("button", { onClick: () => { setEditTarget(a); setModal("edit"); }, style: { ...btnGhostSt, padding: "4px 8px" }, children: "EDIT" }), _jsx("button", { onClick: () => setConfirmId(a.id), style: { ...btnGhostSt, padding: "4px 8px", color: L.red, borderColor: "rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)" }, children: "\u2715" })] })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }, children: [
                                                { label: "TYPE", val: a.type, color: L.textSec },
                                                { label: "OWNER", val: a.owner, color: L.textSec },
                                                { label: "BIZ UNIT", val: a.business_unit, color: L.textSec },
                                                { label: "EXPOSURE",
                                                    val: a.financial_exposure
                                                        ? `₹${Number(a.financial_exposure).toLocaleString("en-IN")}` : "—",
                                                    color: L.orange },
                                            ].map(item => (_jsxs("div", { style: {
                                                    background: L.pageBg,
                                                    border: `1px solid ${L.divider}`,
                                                    borderRadius: 6, padding: "5px 8px",
                                                }, children: [_jsx("div", { style: { fontSize: 7, color: L.textMuted, letterSpacing: ".1em", marginBottom: 2, fontFamily: "'Orbitron',monospace", fontWeight: 700 }, children: item.label }), _jsx("div", { style: { fontSize: 10, color: item.color, fontWeight: 500 }, children: item.val || "—" })] }, item.label))) }), scope.length > 0 && (_jsx("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }, children: scope.map((s) => (_jsx("span", { style: {
                                                    fontSize: 7, color: L.cyan,
                                                    border: `1px solid rgba(8,145,178,0.3)`,
                                                    borderRadius: 20, padding: "2px 7px",
                                                    fontFamily: "'Orbitron',monospace", fontWeight: 700,
                                                }, children: s }, s))) })), a.notes && (_jsx("div", { style: { fontSize: 8, color: L.textMuted, marginTop: 4, lineHeight: 1.5 }, children: a.notes }))] }, a.id ?? i));
                            })] })) : (
                    // Desktop table
                    _jsxs("div", { style: { overflowX: "auto" }, children: [_jsx("div", { style: {
                                    display: "grid",
                                    gridTemplateColumns: "1.6fr 0.8fr 0.8fr 1fr 1fr 1fr 1.2fr 0.8fr 130px",
                                    padding: "7px 16px",
                                    borderBottom: `1px solid ${L.divider}`,
                                    background: L.pageBg,
                                }, children: ["DOMAIN", "TYPE", "CRITICALITY", "OWNER", "BUSINESS UNIT", "EXPOSURE", "COMPLIANCE", "LAST SCAN", ""].map(h => (_jsx("span", { style: {
                                        fontSize: 7.5, color: "#1e3a5f",
                                        letterSpacing: "0.14em",
                                        fontFamily: "'Orbitron',monospace", fontWeight: 700,
                                    }, children: h }, h))) }), _jsx("div", { style: { maxHeight: 520, overflowY: "auto" }, children: loading ? (_jsx("div", { style: { padding: 24, fontSize: 10, color: L.textMuted, textAlign: "center" }, children: "Loading..." })) : filtered.length === 0 ? (_jsx("div", { style: { padding: 24, fontSize: 10, color: L.textMuted, textAlign: "center" }, children: assets.length === 0 ? "No assets registered — click + REGISTER ASSET to begin" : "No assets match filter" })) : (filtered.map((a, i) => {
                                    const critColor = CRIT_COLOR[a.criticality] ?? L.textDim;
                                    const scope = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
                                    return (_jsxs("div", { className: "reg-row", style: {
                                            display: "grid",
                                            gridTemplateColumns: "1.6fr 0.8fr 0.8fr 1fr 1fr 1fr 1.2fr 0.8fr 130px",
                                            padding: "9px 16px",
                                            borderBottom: `1px solid ${L.divider}`,
                                            alignItems: "center",
                                            background: "transparent",
                                            transition: "background 0.12s",
                                        }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 10, color: L.blue, fontWeight: 600 }, children: a.name }), a.owner_email && (_jsx("div", { style: { fontSize: 8, color: L.textMuted, marginTop: 1 }, children: a.owner_email }))] }), _jsx("div", { style: { fontSize: 9, color: L.textDim, fontWeight: 500 }, children: a.type }), _jsx("div", { children: _jsx("span", { style: {
                                                        fontSize: 8, fontWeight: 700, color: critColor,
                                                        border: `1px solid ${critColor}44`, borderRadius: 4,
                                                        padding: "2px 7px",
                                                        background: `${critColor}0a`,
                                                    }, children: a.criticality }) }), _jsx("div", { style: { fontSize: 9, color: L.textSec, fontWeight: 500 }, children: a.owner || "—" }), _jsx("div", { style: { fontSize: 9, color: L.textDim }, children: a.business_unit || "—" }), _jsx("div", { style: { fontSize: 9, color: L.orange, fontWeight: 600 }, children: a.financial_exposure
                                                    ? `₹${Number(a.financial_exposure).toLocaleString("en-IN")}`
                                                    : _jsx("span", { style: { color: L.textMuted, fontWeight: 400 }, children: "\u2014" }) }), _jsxs("div", { style: { display: "flex", gap: 3, flexWrap: "wrap" }, children: [scope.slice(0, 4).map((s) => (_jsx("span", { style: {
                                                            fontSize: 7, color: L.cyan,
                                                            border: "1px solid rgba(8,145,178,0.3)",
                                                            borderRadius: 20, padding: "1px 5px",
                                                            fontFamily: "'Orbitron',monospace", fontWeight: 700,
                                                        }, children: s }, s))), scope.length > 4 && (_jsxs("span", { style: { fontSize: 7, color: L.textMuted }, children: ["+", scope.length - 4] })), scope.length === 0 && (_jsx("span", { style: { fontSize: 9, color: L.textMuted }, children: "\u2014" }))] }), _jsx("div", { style: { fontSize: 9, color: L.textMuted }, children: a.scan || "Never" }), _jsxs("div", { style: { display: "flex", gap: 4 }, children: [_jsx("button", { onClick: () => handleScan(a.id, a.name), disabled: scanningId === a.id, style: { ...btnGhostSt, padding: "4px 8px", opacity: scanningId === a.id ? 0.5 : 1 }, children: scanningId === a.id ? "…" : "⟳" }), _jsx("button", { onClick: () => { setEditTarget(a); setModal("edit"); }, style: { ...btnGhostSt, padding: "4px 8px" }, children: "EDIT" }), _jsx("button", { onClick: () => setConfirmId(a.id), style: { ...btnGhostSt, padding: "4px 8px", color: L.red, borderColor: "rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)" }, children: "\u2715" })] })] }, a.id ?? i));
                                })) })] })), _jsxs("div", { style: {
                            padding: "8px 16px",
                            borderTop: `1px solid ${L.divider}`,
                            display: "flex", justifyContent: "space-between",
                            alignItems: "center", flexWrap: "wrap", gap: 8,
                        }, children: [_jsxs("span", { style: { fontSize: 10, color: L.textDim, fontWeight: 500 }, children: [_jsx("b", { style: { color: L.textSec }, children: filtered.length }), " of", " ", _jsx("b", { style: { color: L.textSec }, children: assets.length }), " registered", stats.noOwner > 0 && (_jsxs("span", { style: { color: L.orange, fontWeight: 700 }, children: [" ", "\u00B7 ", _jsx("b", { children: stats.noOwner }), " without owner"] }))] }), !mobile && (_jsx("span", { style: { fontSize: 9, color: L.textMuted }, children: "\u27F3 triggers live TLS scan \u00B7 data feeds into PQC report & PDF" }))] })] })] }));
}
