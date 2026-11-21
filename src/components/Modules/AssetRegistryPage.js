import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { API } from "./shared.js";
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
const ASSET_TYPES = [
    "Web App",
    "API",
    "Server",
    "Gateway",
    "Core Banking",
    "Internet Banking",
    "Mobile Banking",
    "Other",
];
const CRITICALITY = ["Critical", "High", "Medium", "Low"];
const COMPLIANCE_OPTS = ["RBI", "ISO27001", "NIST", "PCIDSS", "SWIFT", "DORA"];
const CRIT_COLOR = {
    Critical: L.red,
    High: L.orange,
    Medium: L.yellow,
    Low: L.green,
};
const EMPTY_FORM = {
    name: "",
    url: "",
    type: "Web App",
    criticality: "Medium",
    owner: "",
    owner_email: "",
    business_unit: "",
    financial_exposure: "",
    compliance_scope: [],
    notes: "",
};
// ─── AUTHENTICATED API HELPER ─────────────────────────────────────────────────
function getAccessToken() {
    try {
        // This must match the key used by Rebel's login flow.
        return (localStorage.getItem("access") ||
            localStorage.getItem("access_token") ||
            "");
    }
    catch {
        return "";
    }
}
async function assetApiFetch(path, init = {}) {
    const token = getAccessToken();
    const headers = new Headers(init.headers || {});
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    else {
        headers.delete("Authorization");
    }
    return fetch(`${API}${path}`, {
        ...init,
        headers,
    });
}
async function readApiResponse(response) {
    try {
        return await response.json();
    }
    catch {
        return {
            detail: `The server returned an invalid response (${response.status}).`,
        };
    }
}
function getErrorMessage(data, status) {
    if (Array.isArray(data.detail)) {
        return data.detail
            .map((item) => item.msg || item.message || String(item))
            .join(" · ");
    }
    if (typeof data.detail === "string")
        return data.detail;
    if (typeof data.error === "string")
        return data.error;
    if (status === 401)
        return "Your session has expired. Please sign in again.";
    if (status === 403)
        return "You do not have permission to perform this action.";
    if (status === 404)
        return "The requested asset was not found.";
    if (status >= 500)
        return "The server encountered an error. Please try again.";
    return `Request failed (${status}).`;
}
// ─── SHARED STYLES ────────────────────────────────────────────────────────────
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
// ─── MOBILE HOOK ──────────────────────────────────────────────────────────────
function useMobile() {
    const [mobile, setMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setMobile(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return mobile;
}
// ─── MODAL ────────────────────────────────────────────────────────────────────
function AssetModal({ initial, onSave, onClose, saving, }) {
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState([]);
    function set(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
    }
    function toggleScope(scope) {
        setForm((current) => ({
            ...current,
            compliance_scope: current.compliance_scope.includes(scope)
                ? current.compliance_scope.filter((item) => item !== scope)
                : [...current.compliance_scope, scope],
        }));
    }
    function validate() {
        const validationErrors = [];
        if (!form.name.trim()) {
            validationErrors.push("Domain is required");
        }
        try {
            const parsed = new URL(form.url);
            if (!["http:", "https:"].includes(parsed.protocol)) {
                validationErrors.push("URL must use HTTP or HTTPS");
            }
        }
        catch {
            validationErrors.push("Enter a valid URL beginning with https://");
        }
        if (["Critical", "High"].includes(form.criticality) &&
            !form.owner_email.trim()) {
            validationErrors.push("Critical/High assets require an owner email");
        }
        setErrors(validationErrors);
        return validationErrors.length === 0;
    }
    return (_jsx("div", { style: {
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(5,13,26,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backdropFilter: "blur(6px)",
        }, children: _jsxs("div", { style: {
                background: L.panelBg,
                border: `1px solid ${L.accentBorder}`,
                borderRadius: 12,
                padding: 24,
                width: "100%",
                maxWidth: 540,
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 24px 80px rgba(0,0,0,0.15)",
            }, children: [_jsxs("div", { style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 20,
                    }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: {
                                        width: 3,
                                        height: 18,
                                        background: L.accent,
                                        borderRadius: 2,
                                    } }), _jsx("span", { style: {
                                        fontFamily: "'Orbitron',monospace",
                                        fontSize: 11,
                                        color: L.text,
                                        letterSpacing: ".12em",
                                        fontWeight: 700,
                                    }, children: initial.name ? "EDIT ASSET" : "REGISTER ASSET" })] }), _jsx("button", { onClick: onClose, style: { ...btnGhostSt, padding: "4px 10px", fontSize: 12 }, children: "\u2715" })] }), errors.length > 0 && (_jsx("div", { style: {
                        background: "rgba(220,38,38,0.06)",
                        border: "1px solid rgba(220,38,38,0.25)",
                        borderRadius: 6,
                        padding: "8px 12px",
                        marginBottom: 16,
                    }, children: errors.map((error, index) => (_jsxs("div", { style: { fontSize: 10, color: L.red, fontWeight: 600 }, children: ["\u2022 ", error] }, index))) })), _jsxs("div", { style: {
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                    }, children: [_jsxs("div", { style: { gridColumn: "1/-1" }, children: [_jsx("label", { style: lblSt, children: "DOMAIN *" }), _jsx("input", { style: inputSt, placeholder: "pnb.bank.in", value: form.name, onChange: (event) => {
                                        const value = event.target.value
                                            .replace(/^https?:\/\//, "")
                                            .replace(/\/.*$/, "");
                                        set("name", value);
                                        if (!form.url) {
                                            set("url", `https://${value}`);
                                        }
                                    } })] }), _jsxs("div", { style: { gridColumn: "1/-1" }, children: [_jsx("label", { style: lblSt, children: "URL *" }), _jsx("input", { style: inputSt, placeholder: "https://pnb.bank.in", value: form.url, onChange: (event) => set("url", event.target.value) })] }), _jsxs("div", { children: [_jsx("label", { style: lblSt, children: "TYPE" }), _jsx("select", { style: inputSt, value: form.type, onChange: (event) => set("type", event.target.value), children: ASSET_TYPES.map((type) => (_jsx("option", { children: type }, type))) })] }), _jsxs("div", { children: [_jsx("label", { style: lblSt, children: "CRITICALITY" }), _jsx("select", { style: {
                                        ...inputSt,
                                        color: CRIT_COLOR[form.criticality] ?? L.text,
                                        fontWeight: 700,
                                    }, value: form.criticality, onChange: (event) => set("criticality", event.target.value), children: CRITICALITY.map((criticality) => (_jsx("option", { children: criticality }, criticality))) })] }), _jsxs("div", { children: [_jsx("label", { style: lblSt, children: "OWNER" }), _jsx("input", { style: inputSt, placeholder: "CISO", value: form.owner, onChange: (event) => set("owner", event.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { style: lblSt, children: ["OWNER EMAIL", ["Critical", "High"].includes(form.criticality) && (_jsx("span", { style: { color: L.red }, children: " *" }))] }), _jsx("input", { style: inputSt, type: "email", placeholder: "security@bank.co.in", value: form.owner_email, onChange: (event) => set("owner_email", event.target.value) })] }), _jsxs("div", { children: [_jsx("label", { style: lblSt, children: "BUSINESS UNIT" }), _jsx("input", { style: inputSt, placeholder: "Retail Banking", value: form.business_unit, onChange: (event) => set("business_unit", event.target.value) })] }), _jsxs("div", { children: [_jsx("label", { style: lblSt, children: "FINANCIAL EXPOSURE (\u20B9)" }), _jsx("input", { style: inputSt, type: "number", min: "0", placeholder: "500000000", value: form.financial_exposure, onChange: (event) => set("financial_exposure", event.target.value) })] }), _jsxs("div", { style: { gridColumn: "1/-1" }, children: [_jsx("label", { style: lblSt, children: "COMPLIANCE SCOPE" }), _jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: COMPLIANCE_OPTS.map((scope) => {
                                        const selected = form.compliance_scope.includes(scope);
                                        return (_jsx("button", { type: "button", onClick: () => toggleScope(scope), style: {
                                                fontSize: 9,
                                                padding: "4px 12px",
                                                borderRadius: 20,
                                                cursor: "pointer",
                                                border: `1px solid ${selected ? L.accent : L.accentBorder}`,
                                                background: selected ? L.accent : L.accentDim,
                                                color: selected ? "#fff" : L.textDim,
                                                fontFamily: "'Orbitron',monospace",
                                                fontWeight: 700,
                                                letterSpacing: "0.08em",
                                                transition: "all 0.15s",
                                            }, children: scope }, scope));
                                    }) })] }), _jsxs("div", { style: { gridColumn: "1/-1" }, children: [_jsx("label", { style: lblSt, children: "NOTES" }), _jsx("textarea", { style: { ...inputSt, minHeight: 56, resize: "vertical" }, placeholder: "Main internet banking portal...", value: form.notes, onChange: (event) => set("notes", event.target.value) })] })] }), _jsxs("div", { style: {
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        marginTop: 20,
                    }, children: [_jsx("button", { onClick: onClose, style: btnGhostSt, children: "CANCEL" }), _jsx("button", { disabled: saving, onClick: () => {
                                if (validate())
                                    onSave(form);
                            }, style: { ...btnSt, opacity: saving ? 0.65 : 1 }, children: saving
                                ? "SAVING..."
                                : initial.name
                                    ? "UPDATE"
                                    : "REGISTER" })] })] }) }));
}
// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
function ConfirmDialog({ name, onConfirm, onCancel, }) {
    return (_jsx("div", { style: {
            position: "fixed",
            inset: 0,
            zIndex: 101,
            background: "rgba(5,13,26,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(6px)",
            padding: 16,
        }, children: _jsxs("div", { style: {
                background: L.panelBg,
                border: "1px solid rgba(220,38,38,0.25)",
                borderRadius: 12,
                padding: 24,
                maxWidth: 360,
                width: "100%",
                boxShadow: "0 24px 80px rgba(0,0,0,0.15)",
            }, children: [_jsxs("div", { style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                    }, children: [_jsx("div", { style: {
                                width: 3,
                                height: 16,
                                background: L.red,
                                borderRadius: 2,
                            } }), _jsx("div", { style: {
                                fontSize: 12,
                                color: L.red,
                                fontFamily: "'Orbitron',monospace",
                                fontWeight: 700,
                                letterSpacing: ".1em",
                            }, children: "DEACTIVATE ASSET" })] }), _jsxs("div", { style: {
                        fontSize: 11,
                        color: L.textSec,
                        marginBottom: 20,
                        lineHeight: 1.6,
                    }, children: ["Deactivate ", _jsx("b", { style: { color: L.blue }, children: name }), "? Data is retained for audit trail."] }), _jsxs("div", { style: {
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                    }, children: [_jsx("button", { onClick: onCancel, style: btnGhostSt, children: "CANCEL" }), _jsx("button", { onClick: onConfirm, style: {
                                ...btnSt,
                                background: "rgba(220,38,38,0.1)",
                                border: "1px solid rgba(220,38,38,0.35)",
                                color: L.red,
                                boxShadow: "none",
                            }, children: "DEACTIVATE" })] })] }) }));
}
// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AssetRegistryPage() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [scanningId, setScanningId] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [toast, setToast] = useState(null);
    const [search, setSearch] = useState("");
    const [filterCrit, setFilterCrit] = useState("All");
    const mobile = useMobile();
    function showToast(message, ok = true) {
        setToast({ msg: message, ok });
        window.setTimeout(() => setToast(null), 3500);
    }
    // ─── LOAD ASSETS ──────────────────────────────────────────────────────────
    async function load() {
        setLoading(true);
        try {
            const response = await assetApiFetch("/assets");
            const data = await readApiResponse(response);
            if (!response.ok) {
                throw new Error(getErrorMessage(data, response.status));
            }
            if (!Array.isArray(data.assets)) {
                throw new Error("The asset service returned an unexpected response.");
            }
            setAssets(data.assets.filter((asset) => asset?.id));
        }
        catch (error) {
            showToast(error instanceof Error ? error.message : "Failed to load registry", false);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        void load();
    }, []);
    // ─── FILTERS AND METRICS ──────────────────────────────────────────────────
    const filtered = assets.filter((asset) => {
        const matchesSearch = !search ||
            asset.name?.toLowerCase().includes(search.toLowerCase()) ||
            asset.owner?.toLowerCase().includes(search.toLowerCase()) ||
            asset.business_unit?.toLowerCase().includes(search.toLowerCase());
        const matchesCriticality = filterCrit === "All" || asset.criticality === filterCrit;
        return matchesSearch && matchesCriticality;
    });
    const stats = {
        total: assets.length,
        critical: assets.filter((asset) => asset.criticality === "Critical").length,
        noOwner: assets.filter((asset) => !asset.owner_email).length,
        expiring: assets.filter((asset) => asset.days_left != null && asset.days_left < 30).length,
    };
    // ─── SAVE / CREATE / UPDATE ───────────────────────────────────────────────
    async function handleSave(form) {
        setSaving(true);
        try {
            const isEdit = modal === "edit" && editTarget?.id;
            const body = {
                ...form,
                name: form.name.trim(),
                url: form.url.trim(),
            };
            if (body.financial_exposure === "") {
                body.financial_exposure = null;
            }
            else if (body.financial_exposure != null) {
                const exposure = Number(body.financial_exposure);
                if (!Number.isSafeInteger(exposure) || exposure < 0) {
                    showToast("Financial exposure must be a valid non-negative amount.", false);
                    return;
                }
                body.financial_exposure = exposure;
            }
            // IMPORTANT: Use assetApiFetch so the JWT is sent on both POST and PUT.
            const response = await assetApiFetch(isEdit ? `/assets/${editTarget.id}` : "/assets", {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });
            const data = await readApiResponse(response);
            if (!response.ok) {
                showToast(getErrorMessage(data, response.status), false);
                return;
            }
            showToast(isEdit ? `Updated ${form.name}` : `Registered ${form.name}`);
            setModal(null);
            setEditTarget(null);
            await load();
        }
        catch (error) {
            showToast(error instanceof Error ? error.message : "Save failed", false);
        }
        finally {
            setSaving(false);
        }
    }
    // ─── SCAN ─────────────────────────────────────────────────────────────────
    async function handleScan(id, name) {
        setScanningId(id);
        try {
            const response = await assetApiFetch(`/assets/${id}/scan`, {
                method: "POST",
            });
            const data = await readApiResponse(response);
            if (!response.ok) {
                throw new Error(getErrorMessage(data, response.status));
            }
            if (data.status === "scanned") {
                showToast(`Scanned ${name} — TLS ${data.tls_version ?? "?"}`);
            }
            else {
                showToast(`Scan failed: ${data.error ?? data.detail ?? "Unknown error"}`, false);
            }
            await load();
        }
        catch (error) {
            showToast(error instanceof Error ? error.message : "Scan failed", false);
        }
        finally {
            setScanningId(null);
        }
    }
    // ─── DELETE / DEACTIVATE ──────────────────────────────────────────────────
    async function handleDelete(id) {
        setDeletingId(id);
        try {
            const response = await assetApiFetch(`/assets/${id}`, {
                method: "DELETE",
            });
            const data = await readApiResponse(response);
            if (!response.ok) {
                throw new Error(getErrorMessage(data, response.status));
            }
            showToast(`Deactivated ${data.name ?? "asset"}`);
            setConfirmId(null);
            await load();
        }
        catch (error) {
            showToast(error instanceof Error ? error.message : "Deactivate failed", false);
        }
        finally {
            setDeletingId(null);
        }
    }
    const confirmAsset = assets.find((asset) => asset.id === confirmId);
    // ─── PAGE ─────────────────────────────────────────────────────────────────
    return (_jsxs("div", { style: {
            padding: 20,
            background: L.pageBg,
            minHeight: "100vh",
            fontFamily: "Share Tech Mono",
        }, children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.2); border-radius: 2px; }
        .reg-row:hover { background: ${L.rowHover} !important; }
      ` }), toast && (_jsxs("div", { style: {
                    position: "fixed",
                    bottom: 24,
                    right: 24,
                    zIndex: 200,
                    background: toast.ok
                        ? "rgba(22,163,74,0.1)"
                        : "rgba(220,38,38,0.1)",
                    border: `1px solid ${toast.ok ? L.green : L.red}`,
                    borderRadius: 8,
                    padding: "10px 16px",
                    fontSize: 11,
                    color: toast.ok ? L.green : L.red,
                    fontWeight: 700,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }, children: [_jsx("span", { style: { fontSize: 14 }, children: toast.ok ? "✓" : "✗" }), toast.msg] })), modal && (_jsx(AssetModal, { initial: modal === "edit" && editTarget
                    ? {
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
                    }
                    : EMPTY_FORM, onSave: handleSave, onClose: () => {
                    setModal(null);
                    setEditTarget(null);
                }, saving: saving })), confirmId != null && confirmAsset && (_jsx(ConfirmDialog, { name: confirmAsset.name, onConfirm: () => void handleDelete(confirmId), onCancel: () => setConfirmId(null) })), _jsx("div", { style: {
                    display: "grid",
                    gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)",
                    gap: 10,
                    marginBottom: 14,
                }, children: [
                    {
                        label: "REGISTERED",
                        value: stats.total,
                        sub: "Assets in registry",
                        color: L.blue,
                        bgTint: "rgba(29,78,216,0.05)",
                    },
                    {
                        label: "CRITICAL",
                        value: stats.critical,
                        sub: "High priority",
                        color: L.red,
                        bgTint: "rgba(220,38,38,0.05)",
                    },
                    {
                        label: "NO OWNER",
                        value: stats.noOwner,
                        sub: "Needs assignment",
                        color: L.orange,
                        bgTint: "rgba(234,88,12,0.05)",
                    },
                    {
                        label: "CERT EXPIRING",
                        value: stats.expiring,
                        sub: "Within 30 days",
                        color: L.yellow,
                        bgTint: "rgba(202,138,4,0.05)",
                    },
                ].map((metric) => (_jsxs("div", { style: {
                        background: `linear-gradient(135deg,#fff 0%,${metric.bgTint} 100%)`,
                        border: "1px solid rgba(14,165,233,0.15)",
                        borderRadius: 10,
                        padding: mobile ? "12px 14px" : "14px 16px",
                        boxShadow: "0 1px 4px rgba(14,165,233,0.08)",
                    }, children: [_jsx("div", { style: {
                                fontSize: 7.5,
                                color: "#1e3a5f",
                                letterSpacing: "0.14em",
                                fontFamily: "'Orbitron',monospace",
                                fontWeight: 700,
                                marginBottom: 6,
                            }, children: metric.label }), _jsx("div", { style: {
                                fontFamily: "'Orbitron',monospace",
                                fontSize: mobile ? 26 : 32,
                                fontWeight: 700,
                                color: metric.color,
                                lineHeight: 1,
                                marginBottom: 4,
                            }, children: metric.value }), _jsx("div", { style: {
                                fontSize: 8,
                                color: L.textMuted,
                                fontWeight: 500,
                            }, children: metric.sub })] }, metric.label))) }), _jsxs("div", { style: {
                    background: L.panelBg,
                    border: `1px solid ${L.accentBorder}`,
                    borderRadius: 10,
                    boxShadow: "0 1px 4px rgba(14,165,233,0.08), 0 4px 16px rgba(0,0,0,0.04)",
                }, children: [_jsxs("div", { style: {
                            padding: "11px 16px",
                            borderBottom: `1px solid ${L.divider}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 8,
                        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: {
                                            width: 3,
                                            height: 14,
                                            background: L.accent,
                                            borderRadius: 2,
                                        } }), _jsx("span", { style: {
                                            fontFamily: "'Orbitron',monospace",
                                            fontSize: 10,
                                            letterSpacing: "0.15em",
                                            color: "#1e3a5f",
                                            fontWeight: 700,
                                        }, children: "ASSET REGISTRY" })] }), _jsxs("div", { style: {
                                    display: "flex",
                                    gap: 6,
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                }, children: [_jsx("input", { value: search, onChange: (event) => setSearch(event.target.value), placeholder: "Search domain / owner...", style: {
                                            ...inputSt,
                                            width: mobile ? 130 : 180,
                                            fontSize: 11,
                                        } }), _jsxs("select", { value: filterCrit, onChange: (event) => setFilterCrit(event.target.value), style: {
                                            ...inputSt,
                                            width: "auto",
                                            cursor: "pointer",
                                            color: filterCrit === "All"
                                                ? L.textDim
                                                : CRIT_COLOR[filterCrit] ?? L.textDim,
                                            fontWeight: 700,
                                        }, children: [_jsx("option", { value: "All", children: "All" }), CRITICALITY.map((criticality) => (_jsx("option", { children: criticality }, criticality)))] }), _jsx("button", { onClick: () => setModal("add"), style: btnSt, children: "+ REGISTER ASSET" })] })] }), mobile ? (_jsxs("div", { style: { maxHeight: 520, overflowY: "auto" }, children: [loading && (_jsx("div", { style: {
                                    padding: 24,
                                    fontSize: 10,
                                    color: L.textMuted,
                                    textAlign: "center",
                                }, children: "Loading..." })), !loading && filtered.length === 0 && (_jsx("div", { style: {
                                    padding: 24,
                                    fontSize: 10,
                                    color: L.textMuted,
                                    textAlign: "center",
                                }, children: assets.length === 0
                                    ? "No assets registered — tap + REGISTER ASSET"
                                    : "No assets match filter" })), filtered.map((asset, index) => {
                                const criticalityColor = CRIT_COLOR[asset.criticality ?? ""] ?? L.textDim;
                                const scope = Array.isArray(asset.compliance_scope)
                                    ? asset.compliance_scope
                                    : [];
                                return (_jsxs("div", { className: "reg-row", style: {
                                        borderBottom: `1px solid ${L.divider}`,
                                        padding: "12px 14px",
                                        background: "transparent",
                                    }, children: [_jsxs("div", { style: {
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                marginBottom: 8,
                                            }, children: [_jsxs("div", { children: [_jsx("div", { style: {
                                                                fontSize: 12,
                                                                color: L.blue,
                                                                fontWeight: 600,
                                                                marginBottom: 4,
                                                            }, children: asset.name }), _jsx("span", { style: {
                                                                fontSize: 8,
                                                                fontWeight: 700,
                                                                color: criticalityColor,
                                                                border: `1px solid ${criticalityColor}44`,
                                                                borderRadius: 4,
                                                                padding: "2px 7px",
                                                            }, children: asset.criticality })] }), _jsxs("div", { style: { display: "flex", gap: 4 }, children: [_jsx("button", { onClick: () => void handleScan(asset.id, asset.name), disabled: scanningId === asset.id, style: {
                                                                ...btnGhostSt,
                                                                padding: "4px 8px",
                                                                opacity: scanningId === asset.id ? 0.5 : 1,
                                                            }, children: scanningId === asset.id ? "…" : "⟳" }), _jsx("button", { onClick: () => {
                                                                setEditTarget(asset);
                                                                setModal("edit");
                                                            }, style: { ...btnGhostSt, padding: "4px 8px" }, children: "EDIT" }), _jsx("button", { onClick: () => setConfirmId(asset.id), style: {
                                                                ...btnGhostSt,
                                                                padding: "4px 8px",
                                                                color: L.red,
                                                                borderColor: "rgba(220,38,38,0.25)",
                                                                background: "rgba(220,38,38,0.06)",
                                                            }, children: "\u2715" })] })] }), _jsx("div", { style: {
                                                display: "grid",
                                                gridTemplateColumns: "1fr 1fr",
                                                gap: 6,
                                                marginBottom: 8,
                                            }, children: [
                                                { label: "TYPE", value: asset.type, color: L.textSec },
                                                { label: "OWNER", value: asset.owner, color: L.textSec },
                                                {
                                                    label: "BIZ UNIT",
                                                    value: asset.business_unit,
                                                    color: L.textSec,
                                                },
                                                {
                                                    label: "EXPOSURE",
                                                    value: asset.financial_exposure
                                                        ? `₹${Number(asset.financial_exposure).toLocaleString("en-IN")}`
                                                        : "—",
                                                    color: L.orange,
                                                },
                                            ].map((item) => (_jsxs("div", { style: {
                                                    background: L.pageBg,
                                                    border: `1px solid ${L.divider}`,
                                                    borderRadius: 6,
                                                    padding: "5px 8px",
                                                }, children: [_jsx("div", { style: {
                                                            fontSize: 7,
                                                            color: L.textMuted,
                                                            letterSpacing: ".1em",
                                                            marginBottom: 2,
                                                            fontFamily: "'Orbitron',monospace",
                                                            fontWeight: 700,
                                                        }, children: item.label }), _jsx("div", { style: {
                                                            fontSize: 10,
                                                            color: item.color,
                                                            fontWeight: 500,
                                                        }, children: item.value || "—" })] }, item.label))) }), scope.length > 0 && (_jsx("div", { style: {
                                                display: "flex",
                                                gap: 4,
                                                flexWrap: "wrap",
                                                marginBottom: 4,
                                            }, children: scope.map((item) => (_jsx("span", { style: {
                                                    fontSize: 7,
                                                    color: L.cyan,
                                                    border: "1px solid rgba(8,145,178,0.3)",
                                                    borderRadius: 20,
                                                    padding: "2px 7px",
                                                    fontFamily: "'Orbitron',monospace",
                                                    fontWeight: 700,
                                                }, children: item }, item))) })), asset.notes && (_jsx("div", { style: {
                                                fontSize: 8,
                                                color: L.textMuted,
                                                marginTop: 4,
                                                lineHeight: 1.5,
                                            }, children: asset.notes }))] }, asset.id ?? index));
                            })] })) : (
                    /* Desktop table */
                    _jsxs("div", { style: { overflowX: "auto" }, children: [_jsx("div", { style: {
                                    display: "grid",
                                    gridTemplateColumns: "1.6fr 0.8fr 0.8fr 1fr 1fr 1fr 1.2fr 0.8fr 130px",
                                    padding: "7px 16px",
                                    borderBottom: `1px solid ${L.divider}`,
                                    background: L.pageBg,
                                }, children: [
                                    "DOMAIN",
                                    "TYPE",
                                    "CRITICALITY",
                                    "OWNER",
                                    "BUSINESS UNIT",
                                    "EXPOSURE",
                                    "COMPLIANCE",
                                    "LAST SCAN",
                                    "",
                                ].map((heading) => (_jsx("span", { style: {
                                        fontSize: 7.5,
                                        color: "#1e3a5f",
                                        letterSpacing: "0.14em",
                                        fontFamily: "'Orbitron',monospace",
                                        fontWeight: 700,
                                    }, children: heading }, heading))) }), _jsx("div", { style: { maxHeight: 520, overflowY: "auto" }, children: loading ? (_jsx("div", { style: {
                                        padding: 24,
                                        fontSize: 10,
                                        color: L.textMuted,
                                        textAlign: "center",
                                    }, children: "Loading..." })) : filtered.length === 0 ? (_jsx("div", { style: {
                                        padding: 24,
                                        fontSize: 10,
                                        color: L.textMuted,
                                        textAlign: "center",
                                    }, children: assets.length === 0
                                        ? "No assets registered — click + REGISTER ASSET to begin"
                                        : "No assets match filter" })) : (filtered.map((asset, index) => {
                                    const criticalityColor = CRIT_COLOR[asset.criticality ?? ""] ?? L.textDim;
                                    const scope = Array.isArray(asset.compliance_scope)
                                        ? asset.compliance_scope
                                        : [];
                                    return (_jsxs("div", { className: "reg-row", style: {
                                            display: "grid",
                                            gridTemplateColumns: "1.6fr 0.8fr 0.8fr 1fr 1fr 1fr 1.2fr 0.8fr 130px",
                                            padding: "9px 16px",
                                            borderBottom: `1px solid ${L.divider}`,
                                            alignItems: "center",
                                            background: "transparent",
                                            transition: "background 0.12s",
                                        }, children: [_jsxs("div", { children: [_jsx("div", { style: {
                                                            fontSize: 10,
                                                            color: L.blue,
                                                            fontWeight: 600,
                                                        }, children: asset.name }), asset.owner_email && (_jsx("div", { style: {
                                                            fontSize: 8,
                                                            color: L.textMuted,
                                                            marginTop: 1,
                                                        }, children: asset.owner_email }))] }), _jsx("div", { style: {
                                                    fontSize: 9,
                                                    color: L.textDim,
                                                    fontWeight: 500,
                                                }, children: asset.type }), _jsx("div", { children: _jsx("span", { style: {
                                                        fontSize: 8,
                                                        fontWeight: 700,
                                                        color: criticalityColor,
                                                        border: `1px solid ${criticalityColor}44`,
                                                        borderRadius: 4,
                                                        padding: "2px 7px",
                                                        background: `${criticalityColor}0a`,
                                                    }, children: asset.criticality }) }), _jsx("div", { style: {
                                                    fontSize: 9,
                                                    color: L.textSec,
                                                    fontWeight: 500,
                                                }, children: asset.owner || "—" }), _jsx("div", { style: { fontSize: 9, color: L.textDim }, children: asset.business_unit || "—" }), _jsx("div", { style: {
                                                    fontSize: 9,
                                                    color: L.orange,
                                                    fontWeight: 600,
                                                }, children: asset.financial_exposure ? (`₹${Number(asset.financial_exposure).toLocaleString("en-IN")}`) : (_jsx("span", { style: {
                                                        color: L.textMuted,
                                                        fontWeight: 400,
                                                    }, children: "\u2014" })) }), _jsxs("div", { style: {
                                                    display: "flex",
                                                    gap: 3,
                                                    flexWrap: "wrap",
                                                }, children: [scope.slice(0, 4).map((item) => (_jsx("span", { style: {
                                                            fontSize: 7,
                                                            color: L.cyan,
                                                            border: "1px solid rgba(8,145,178,0.3)",
                                                            borderRadius: 20,
                                                            padding: "1px 5px",
                                                            fontFamily: "'Orbitron',monospace",
                                                            fontWeight: 700,
                                                        }, children: item }, item))), scope.length > 4 && (_jsxs("span", { style: { fontSize: 7, color: L.textMuted }, children: ["+", scope.length - 4] })), scope.length === 0 && (_jsx("span", { style: { fontSize: 9, color: L.textMuted }, children: "\u2014" }))] }), _jsx("div", { style: { fontSize: 9, color: L.textMuted }, children: asset.scan || "Never" }), _jsxs("div", { style: { display: "flex", gap: 4 }, children: [_jsx("button", { onClick: () => void handleScan(asset.id, asset.name), disabled: scanningId === asset.id, style: {
                                                            ...btnGhostSt,
                                                            padding: "4px 8px",
                                                            opacity: scanningId === asset.id ? 0.5 : 1,
                                                        }, children: scanningId === asset.id ? "…" : "⟳" }), _jsx("button", { onClick: () => {
                                                            setEditTarget(asset);
                                                            setModal("edit");
                                                        }, style: {
                                                            ...btnGhostSt,
                                                            padding: "4px 8px",
                                                        }, children: "EDIT" }), _jsx("button", { onClick: () => setConfirmId(asset.id), style: {
                                                            ...btnGhostSt,
                                                            padding: "4px 8px",
                                                            color: L.red,
                                                            borderColor: "rgba(220,38,38,0.25)",
                                                            background: "rgba(220,38,38,0.06)",
                                                        }, children: "\u2715" })] })] }, asset.id ?? index));
                                })) })] })), _jsxs("div", { style: {
                            padding: "8px 16px",
                            borderTop: `1px solid ${L.divider}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                        }, children: [_jsxs("span", { style: {
                                    fontSize: 10,
                                    color: L.textDim,
                                    fontWeight: 500,
                                }, children: [_jsx("b", { style: { color: L.textSec }, children: filtered.length }), " of", " ", _jsx("b", { style: { color: L.textSec }, children: assets.length }), " registered", stats.noOwner > 0 && (_jsxs("span", { style: { color: L.orange, fontWeight: 700 }, children: [" ", "\u00B7 ", _jsx("b", { children: stats.noOwner }), " without owner"] }))] }), !mobile && (_jsx("span", { style: { fontSize: 9, color: L.textMuted }, children: "\u27F3 triggers live TLS scan \u00B7 data feeds into PQC report & PDF" }))] })] })] }));
}
