
import React, { useState, useEffect } from "react";
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

const CRIT_COLOR: Record<string, string> = {
  Critical: L.red,
  High: L.orange,
  Medium: L.yellow,
  Low: L.green,
};

type AssetForm = {
  name: string;
  url: string;
  type: string;
  criticality: string;
  owner: string;
  owner_email: string;
  business_unit: string;
  financial_exposure: string;
  compliance_scope: string[];
  notes: string;
};

type Asset = {
  id: number;
  name: string;
  url: string;
  type?: string;
  criticality?: string;
  owner?: string;
  owner_email?: string;
  business_unit?: string;
  financial_exposure?: number | null;
  compliance_scope?: string[];
  notes?: string;
  days_left?: number | null;
  scan?: string;
  [key: string]: any;
};

type ApiResponse = {
  detail?: any;
  error?: string;
  [key: string]: any;
};

const EMPTY_FORM: AssetForm = {
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

function getAccessToken(): string {
  try {
    // This must match the key used by Rebel's login flow.
    return (
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      ""
    );
  } catch {
    return "";
  }
}

async function assetApiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();

  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    headers.delete("Authorization");
  }

  return fetch(`${API}${path}`, {
    ...init,
    headers,
  });
}

async function readApiResponse(response: Response): Promise<ApiResponse> {
  try {
    return await response.json();
  } catch {
    return {
      detail: `The server returned an invalid response (${response.status}).`,
    };
  }
}

function getErrorMessage(data: ApiResponse, status: number): string {
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item: any) => item.msg || item.message || String(item))
      .join(" · ");
  }

  if (typeof data.detail === "string") return data.detail;
  if (typeof data.error === "string") return data.error;

  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested asset was not found.";
  if (status >= 500) return "The server encountered an error. Please try again.";

  return `Request failed (${status}).`;
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────

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

// ─── MOBILE HOOK ──────────────────────────────────────────────────────────────

function useMobile() {
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    const handleResize = () => setMobile(window.innerWidth < 768);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return mobile;
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

function AssetModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: AssetForm;
  onSave: (form: AssetForm) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<AssetForm>(initial);
  const [errors, setErrors] = useState<string[]>([]);

  function set<K extends keyof AssetForm>(key: K, value: AssetForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleScope(scope: string) {
    setForm((current) => ({
      ...current,
      compliance_scope: current.compliance_scope.includes(scope)
        ? current.compliance_scope.filter((item) => item !== scope)
        : [...current.compliance_scope, scope],
    }));
  }

  function validate() {
    const validationErrors: string[] = [];

    if (!form.name.trim()) {
      validationErrors.push("Domain is required");
    }

    try {
      const parsed = new URL(form.url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        validationErrors.push("URL must use HTTP or HTTPS");
      }
    } catch {
      validationErrors.push("Enter a valid URL beginning with https://");
    }

    if (
      ["Critical", "High"].includes(form.criticality) &&
      !form.owner_email.trim()
    ) {
      validationErrors.push("Critical/High assets require an owner email");
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(5,13,26,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          background: L.panelBg,
          border: `1px solid ${L.accentBorder}`,
          borderRadius: 12,
          padding: 24,
          width: "100%",
          maxWidth: 540,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 3,
                height: 18,
                background: L.accent,
                borderRadius: 2,
              }}
            />
            <span
              style={{
                fontFamily: "'Orbitron',monospace",
                fontSize: 11,
                color: L.text,
                letterSpacing: ".12em",
                fontWeight: 700,
              }}
            >
              {initial.name ? "EDIT ASSET" : "REGISTER ASSET"}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{ ...btnGhostSt, padding: "4px 10px", fontSize: 12 }}
          >
            ✕
          </button>
        </div>

        {errors.length > 0 && (
          <div
            style={{
              background: "rgba(220,38,38,0.06)",
              border: "1px solid rgba(220,38,38,0.25)",
              borderRadius: 6,
              padding: "8px 12px",
              marginBottom: 16,
            }}
          >
            {errors.map((error, index) => (
              <div
                key={index}
                style={{ fontSize: 10, color: L.red, fontWeight: 600 }}
              >
                • {error}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={{ gridColumn: "1/-1" }}>
            <label style={lblSt}>DOMAIN *</label>
            <input
              style={inputSt}
              placeholder="pnb.bank.in"
              value={form.name}
              onChange={(event) => {
                const value = event.target.value
                  .replace(/^https?:\/\//, "")
                  .replace(/\/.*$/, "");

                set("name", value);

                if (!form.url) {
                  set("url", `https://${value}`);
                }
              }}
            />
          </div>

          <div style={{ gridColumn: "1/-1" }}>
            <label style={lblSt}>URL *</label>
            <input
              style={inputSt}
              placeholder="https://pnb.bank.in"
              value={form.url}
              onChange={(event) => set("url", event.target.value)}
            />
          </div>

          <div>
            <label style={lblSt}>TYPE</label>
            <select
              style={inputSt}
              value={form.type}
              onChange={(event) => set("type", event.target.value)}
            >
              {ASSET_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={lblSt}>CRITICALITY</label>
            <select
              style={{
                ...inputSt,
                color: CRIT_COLOR[form.criticality] ?? L.text,
                fontWeight: 700,
              }}
              value={form.criticality}
              onChange={(event) => set("criticality", event.target.value)}
            >
              {CRITICALITY.map((criticality) => (
                <option key={criticality}>{criticality}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={lblSt}>OWNER</label>
            <input
              style={inputSt}
              placeholder="CISO"
              value={form.owner}
              onChange={(event) => set("owner", event.target.value)}
            />
          </div>

          <div>
            <label style={lblSt}>
              OWNER EMAIL
              {["Critical", "High"].includes(form.criticality) && (
                <span style={{ color: L.red }}> *</span>
              )}
            </label>
            <input
              style={inputSt}
              type="email"
              placeholder="security@bank.co.in"
              value={form.owner_email}
              onChange={(event) => set("owner_email", event.target.value)}
            />
          </div>

          <div>
            <label style={lblSt}>BUSINESS UNIT</label>
            <input
              style={inputSt}
              placeholder="Retail Banking"
              value={form.business_unit}
              onChange={(event) => set("business_unit", event.target.value)}
            />
          </div>

          <div>
            <label style={lblSt}>FINANCIAL EXPOSURE (₹)</label>
            <input
              style={inputSt}
              type="number"
              min="0"
              placeholder="500000000"
              value={form.financial_exposure}
              onChange={(event) =>
                set("financial_exposure", event.target.value)
              }
            />
          </div>

          <div style={{ gridColumn: "1/-1" }}>
            <label style={lblSt}>COMPLIANCE SCOPE</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COMPLIANCE_OPTS.map((scope) => {
                const selected = form.compliance_scope.includes(scope);

                return (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => toggleScope(scope)}
                    style={{
                      fontSize: 9,
                      padding: "4px 12px",
                      borderRadius: 20,
                      cursor: "pointer",
                      border: `1px solid ${
                        selected ? L.accent : L.accentBorder
                      }`,
                      background: selected ? L.accent : L.accentDim,
                      color: selected ? "#fff" : L.textDim,
                      fontFamily: "'Orbitron',monospace",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      transition: "all 0.15s",
                    }}
                  >
                    {scope}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ gridColumn: "1/-1" }}>
            <label style={lblSt}>NOTES</label>
            <textarea
              style={{ ...inputSt, minHeight: 56, resize: "vertical" }}
              placeholder="Main internet banking portal..."
              value={form.notes}
              onChange={(event) => set("notes", event.target.value)}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 20,
          }}
        >
          <button onClick={onClose} style={btnGhostSt}>
            CANCEL
          </button>

          <button
            disabled={saving}
            onClick={() => {
              if (validate()) onSave(form);
            }}
            style={{ ...btnSt, opacity: saving ? 0.65 : 1 }}
          >
            {saving
              ? "SAVING..."
              : initial.name
                ? "UPDATE"
                : "REGISTER"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────

function ConfirmDialog({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 101,
        background: "rgba(5,13,26,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(6px)",
        padding: 16,
      }}
    >
      <div
        style={{
          background: L.panelBg,
          border: "1px solid rgba(220,38,38,0.25)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 360,
          width: "100%",
          boxShadow: "0 24px 80px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 3,
              height: 16,
              background: L.red,
              borderRadius: 2,
            }}
          />

          <div
            style={{
              fontSize: 12,
              color: L.red,
              fontFamily: "'Orbitron',monospace",
              fontWeight: 700,
              letterSpacing: ".1em",
            }}
          >
            DEACTIVATE ASSET
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            color: L.textSec,
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          Deactivate <b style={{ color: L.blue }}>{name}</b>? Data is retained
          for audit trail.
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button onClick={onCancel} style={btnGhostSt}>
            CANCEL
          </button>

          <button
            onClick={onConfirm}
            style={{
              ...btnSt,
              background: "rgba(220,38,38,0.1)",
              border: "1px solid rgba(220,38,38,0.35)",
              color: L.red,
              boxShadow: "none",
            }}
          >
            DEACTIVATE
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AssetRegistryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanningId, setScanningId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [filterCrit, setFilterCrit] = useState("All");

  const mobile = useMobile();

  function showToast(message: string, ok = true) {
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

      setAssets(data.assets.filter((asset: any) => asset?.id));
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to load registry",
        false
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // ─── FILTERS AND METRICS ──────────────────────────────────────────────────

  const filtered = assets.filter((asset) => {
    const matchesSearch =
      !search ||
      asset.name?.toLowerCase().includes(search.toLowerCase()) ||
      asset.owner?.toLowerCase().includes(search.toLowerCase()) ||
      asset.business_unit?.toLowerCase().includes(search.toLowerCase());

    const matchesCriticality =
      filterCrit === "All" || asset.criticality === filterCrit;

    return matchesSearch && matchesCriticality;
  });

  const stats = {
    total: assets.length,
    critical: assets.filter((asset) => asset.criticality === "Critical").length,
    noOwner: assets.filter((asset) => !asset.owner_email).length,
    expiring: assets.filter(
      (asset) => asset.days_left != null && asset.days_left < 30
    ).length,
  };

  // ─── SAVE / CREATE / UPDATE ───────────────────────────────────────────────

  async function handleSave(form: AssetForm) {
    setSaving(true);

    try {
      const isEdit = modal === "edit" && editTarget?.id;

      const body: Record<string, any> = {
        ...form,
        name: form.name.trim(),
        url: form.url.trim(),
      };

      if (body.financial_exposure === "") {
        body.financial_exposure = null;
      } else if (body.financial_exposure != null) {
        const exposure = Number(body.financial_exposure);

        if (!Number.isSafeInteger(exposure) || exposure < 0) {
          showToast("Financial exposure must be a valid non-negative amount.", false);
          return;
        }

        body.financial_exposure = exposure;
      }

      // IMPORTANT: Use assetApiFetch so the JWT is sent on both POST and PUT.
      const response = await assetApiFetch(
        isEdit ? `/assets/${editTarget!.id}` : "/assets",
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await readApiResponse(response);

      if (!response.ok) {
        showToast(getErrorMessage(data, response.status), false);
        return;
      }

      showToast(
        isEdit ? `Updated ${form.name}` : `Registered ${form.name}`
      );

      setModal(null);
      setEditTarget(null);

      await load();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Save failed",
        false
      );
    } finally {
      setSaving(false);
    }
  }

  // ─── SCAN ─────────────────────────────────────────────────────────────────

  async function handleScan(id: number, name: string) {
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
      } else {
        showToast(
          `Scan failed: ${data.error ?? data.detail ?? "Unknown error"}`,
          false
        );
      }

      await load();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Scan failed",
        false
      );
    } finally {
      setScanningId(null);
    }
  }

  // ─── DELETE / DEACTIVATE ──────────────────────────────────────────────────

  async function handleDelete(id: number) {
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
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Deactivate failed",
        false
      );
    } finally {
      setDeletingId(null);
    }
  }

  const confirmAsset = assets.find((asset) => asset.id === confirmId);

  // ─── PAGE ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        padding: 20,
        background: L.pageBg,
        minHeight: "100vh",
        fontFamily: "Share Tech Mono",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.2); border-radius: 2px; }
        .reg-row:hover { background: ${L.rowHover} !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div
          style={{
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
          }}
        >
          <span style={{ fontSize: 14 }}>{toast.ok ? "✓" : "✗"}</span>
          {toast.msg}
        </div>
      )}

      {/* Asset modal */}
      {modal && (
        <AssetModal
          initial={
            modal === "edit" && editTarget
              ? {
                  name: editTarget.name ?? "",
                  url: editTarget.url ?? "",
                  type: editTarget.type ?? "Web App",
                  criticality: editTarget.criticality ?? "Medium",
                  owner: editTarget.owner ?? "",
                  owner_email: editTarget.owner_email ?? "",
                  business_unit: editTarget.business_unit ?? "",
                  financial_exposure:
                    editTarget.financial_exposure?.toString() ?? "",
                  compliance_scope: editTarget.compliance_scope ?? [],
                  notes: editTarget.notes ?? "",
                }
              : EMPTY_FORM
          }
          onSave={handleSave}
          onClose={() => {
            setModal(null);
            setEditTarget(null);
          }}
          saving={saving}
        />
      )}

      {/* Delete confirmation */}
      {confirmId != null && confirmAsset && (
        <ConfirmDialog
          name={confirmAsset.name}
          onConfirm={() => void handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {[
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
        ].map((metric) => (
          <div
            key={metric.label}
            style={{
              background: `linear-gradient(135deg,#fff 0%,${metric.bgTint} 100%)`,
              border: "1px solid rgba(14,165,233,0.15)",
              borderRadius: 10,
              padding: mobile ? "12px 14px" : "14px 16px",
              boxShadow: "0 1px 4px rgba(14,165,233,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 7.5,
                color: "#1e3a5f",
                letterSpacing: "0.14em",
                fontFamily: "'Orbitron',monospace",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              {metric.label}
            </div>

            <div
              style={{
                fontFamily: "'Orbitron',monospace",
                fontSize: mobile ? 26 : 32,
                fontWeight: 700,
                color: metric.color,
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {metric.value}
            </div>

            <div
              style={{
                fontSize: 8,
                color: L.textMuted,
                fontWeight: 500,
              }}
            >
              {metric.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Main panel */}
      <div
        style={{
          background: L.panelBg,
          border: `1px solid ${L.accentBorder}`,
          borderRadius: 10,
          boxShadow:
            "0 1px 4px rgba(14,165,233,0.08), 0 4px 16px rgba(0,0,0,0.04)",
        }}
      >
        {/* Panel header */}
        <div
          style={{
            padding: "11px 16px",
            borderBottom: `1px solid ${L.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 3,
                height: 14,
                background: L.accent,
                borderRadius: 2,
              }}
            />

            <span
              style={{
                fontFamily: "'Orbitron',monospace",
                fontSize: 10,
                letterSpacing: "0.15em",
                color: "#1e3a5f",
                fontWeight: 700,
              }}
            >
              ASSET REGISTRY
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search domain / owner..."
              style={{
                ...inputSt,
                width: mobile ? 130 : 180,
                fontSize: 11,
              }}
            />

            <select
              value={filterCrit}
              onChange={(event) => setFilterCrit(event.target.value)}
              style={{
                ...inputSt,
                width: "auto",
                cursor: "pointer",
                color:
                  filterCrit === "All"
                    ? L.textDim
                    : CRIT_COLOR[filterCrit] ?? L.textDim,
                fontWeight: 700,
              }}
            >
              <option value="All">All</option>
              {CRITICALITY.map((criticality) => (
                <option key={criticality}>{criticality}</option>
              ))}
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
              <div
                style={{
                  padding: 24,
                  fontSize: 10,
                  color: L.textMuted,
                  textAlign: "center",
                }}
              >
                Loading...
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div
                style={{
                  padding: 24,
                  fontSize: 10,
                  color: L.textMuted,
                  textAlign: "center",
                }}
              >
                {assets.length === 0
                  ? "No assets registered — tap + REGISTER ASSET"
                  : "No assets match filter"}
              </div>
            )}

            {filtered.map((asset, index) => {
              const criticalityColor =
                CRIT_COLOR[asset.criticality ?? ""] ?? L.textDim;

              const scope = Array.isArray(asset.compliance_scope)
                ? asset.compliance_scope
                : [];

              return (
                <div
                  key={asset.id ?? index}
                  className="reg-row"
                  style={{
                    borderBottom: `1px solid ${L.divider}`,
                    padding: "12px 14px",
                    background: "transparent",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: L.blue,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        {asset.name}
                      </div>

                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          color: criticalityColor,
                          border: `1px solid ${criticalityColor}44`,
                          borderRadius: 4,
                          padding: "2px 7px",
                        }}
                      >
                        {asset.criticality}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() =>
                          void handleScan(asset.id, asset.name)
                        }
                        disabled={scanningId === asset.id}
                        style={{
                          ...btnGhostSt,
                          padding: "4px 8px",
                          opacity: scanningId === asset.id ? 0.5 : 1,
                        }}
                      >
                        {scanningId === asset.id ? "…" : "⟳"}
                      </button>

                      <button
                        onClick={() => {
                          setEditTarget(asset);
                          setModal("edit");
                        }}
                        style={{ ...btnGhostSt, padding: "4px 8px" }}
                      >
                        EDIT
                      </button>

                      <button
                        onClick={() => setConfirmId(asset.id)}
                        style={{
                          ...btnGhostSt,
                          padding: "4px 8px",
                          color: L.red,
                          borderColor: "rgba(220,38,38,0.25)",
                          background: "rgba(220,38,38,0.06)",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    {[
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
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          background: L.pageBg,
                          border: `1px solid ${L.divider}`,
                          borderRadius: 6,
                          padding: "5px 8px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 7,
                            color: L.textMuted,
                            letterSpacing: ".1em",
                            marginBottom: 2,
                            fontFamily: "'Orbitron',monospace",
                            fontWeight: 700,
                          }}
                        >
                          {item.label}
                        </div>

                        <div
                          style={{
                            fontSize: 10,
                            color: item.color,
                            fontWeight: 500,
                          }}
                        >
                          {item.value || "—"}
                        </div>
                      </div>
                    ))}
                  </div>

                  {scope.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        flexWrap: "wrap",
                        marginBottom: 4,
                      }}
                    >
                      {scope.map((item) => (
                        <span
                          key={item}
                          style={{
                            fontSize: 7,
                            color: L.cyan,
                            border: "1px solid rgba(8,145,178,0.3)",
                            borderRadius: 20,
                            padding: "2px 7px",
                            fontFamily: "'Orbitron',monospace",
                            fontWeight: 700,
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  {asset.notes && (
                    <div
                      style={{
                        fontSize: 8,
                        color: L.textMuted,
                        marginTop: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {asset.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop table */
          <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1.6fr 0.8fr 0.8fr 1fr 1fr 1fr 1.2fr 0.8fr 130px",
                padding: "7px 16px",
                borderBottom: `1px solid ${L.divider}`,
                background: L.pageBg,
              }}
            >
              {[
                "DOMAIN",
                "TYPE",
                "CRITICALITY",
                "OWNER",
                "BUSINESS UNIT",
                "EXPOSURE",
                "COMPLIANCE",
                "LAST SCAN",
                "",
              ].map((heading) => (
                <span
                  key={heading}
                  style={{
                    fontSize: 7.5,
                    color: "#1e3a5f",
                    letterSpacing: "0.14em",
                    fontFamily: "'Orbitron',monospace",
                    fontWeight: 700,
                  }}
                >
                  {heading}
                </span>
              ))}
            </div>

            <div style={{ maxHeight: 520, overflowY: "auto" }}>
              {loading ? (
                <div
                  style={{
                    padding: 24,
                    fontSize: 10,
                    color: L.textMuted,
                    textAlign: "center",
                  }}
                >
                  Loading...
                </div>
              ) : filtered.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    fontSize: 10,
                    color: L.textMuted,
                    textAlign: "center",
                  }}
                >
                  {assets.length === 0
                    ? "No assets registered — click + REGISTER ASSET to begin"
                    : "No assets match filter"}
                </div>
              ) : (
                filtered.map((asset, index) => {
                  const criticalityColor =
                    CRIT_COLOR[asset.criticality ?? ""] ?? L.textDim;

                  const scope = Array.isArray(asset.compliance_scope)
                    ? asset.compliance_scope
                    : [];

                  return (
                    <div
                      key={asset.id ?? index}
                      className="reg-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1.6fr 0.8fr 0.8fr 1fr 1fr 1fr 1.2fr 0.8fr 130px",
                        padding: "9px 16px",
                        borderBottom: `1px solid ${L.divider}`,
                        alignItems: "center",
                        background: "transparent",
                        transition: "background 0.12s",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: L.blue,
                            fontWeight: 600,
                          }}
                        >
                          {asset.name}
                        </div>

                        {asset.owner_email && (
                          <div
                            style={{
                              fontSize: 8,
                              color: L.textMuted,
                              marginTop: 1,
                            }}
                          >
                            {asset.owner_email}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 9,
                          color: L.textDim,
                          fontWeight: 500,
                        }}
                      >
                        {asset.type}
                      </div>

                      <div>
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            color: criticalityColor,
                            border: `1px solid ${criticalityColor}44`,
                            borderRadius: 4,
                            padding: "2px 7px",
                            background: `${criticalityColor}0a`,
                          }}
                        >
                          {asset.criticality}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 9,
                          color: L.textSec,
                          fontWeight: 500,
                        }}
                      >
                        {asset.owner || "—"}
                      </div>

                      <div style={{ fontSize: 9, color: L.textDim }}>
                        {asset.business_unit || "—"}
                      </div>

                      <div
                        style={{
                          fontSize: 9,
                          color: L.orange,
                          fontWeight: 600,
                        }}
                      >
                        {asset.financial_exposure ? (
                          `₹${Number(asset.financial_exposure).toLocaleString("en-IN")}`
                        ) : (
                          <span
                            style={{
                              color: L.textMuted,
                              fontWeight: 400,
                            }}
                          >
                            —
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 3,
                          flexWrap: "wrap",
                        }}
                      >
                        {scope.slice(0, 4).map((item) => (
                          <span
                            key={item}
                            style={{
                              fontSize: 7,
                              color: L.cyan,
                              border: "1px solid rgba(8,145,178,0.3)",
                              borderRadius: 20,
                              padding: "1px 5px",
                              fontFamily: "'Orbitron',monospace",
                              fontWeight: 700,
                            }}
                          >
                            {item}
                          </span>
                        ))}

                        {scope.length > 4 && (
                          <span
                            style={{ fontSize: 7, color: L.textMuted }}
                          >
                            +{scope.length - 4}
                          </span>
                        )}

                        {scope.length === 0 && (
                          <span
                            style={{ fontSize: 9, color: L.textMuted }}
                          >
                            —
                          </span>
                        )}
                      </div>

                      <div
                        style={{ fontSize: 9, color: L.textMuted }}
                      >
                        {asset.scan || "Never"}
                      </div>

                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() =>
                            void handleScan(asset.id, asset.name)
                          }
                          disabled={scanningId === asset.id}
                          style={{
                            ...btnGhostSt,
                            padding: "4px 8px",
                            opacity:
                              scanningId === asset.id ? 0.5 : 1,
                          }}
                        >
                          {scanningId === asset.id ? "…" : "⟳"}
                        </button>

                        <button
                          onClick={() => {
                            setEditTarget(asset);
                            setModal("edit");
                          }}
                          style={{
                            ...btnGhostSt,
                            padding: "4px 8px",
                          }}
                        >
                          EDIT
                        </button>

                        <button
                          onClick={() => setConfirmId(asset.id)}
                          style={{
                            ...btnGhostSt,
                            padding: "4px 8px",
                            color: L.red,
                            borderColor: "rgba(220,38,38,0.25)",
                            background: "rgba(220,38,38,0.06)",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: `1px solid ${L.divider}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: L.textDim,
              fontWeight: 500,
            }}
          >
            <b style={{ color: L.textSec }}>{filtered.length}</b> of{" "}
            <b style={{ color: L.textSec }}>{assets.length}</b> registered

            {stats.noOwner > 0 && (
              <span style={{ color: L.orange, fontWeight: 700 }}>
                {" "}
                · <b>{stats.noOwner}</b> without owner
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
