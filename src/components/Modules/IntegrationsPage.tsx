import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "./shared.js";

// ── API Base ──────────────────────────────────────────────────────────────────
const API =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  "https://r3bel-5464.onrender.com";

// ── Light Theme Palette (matches other Modules pages) ─────────────────────────
const L = {
  pageBg:      "#f5f7fa",
  panelBg:     "#ffffff",
  panelBorder: "#e2e8f0",
  subtleBg:    "#f8fafc",
  insetBg:     "#f1f5f9",
  borderLight: "#f1f5f9",
  text1:  "#0f172a",
  text2:  "#334155",
  text3:  "#64748b",
  text4:  "#94a3b8",
  blue:   "#1d4ed8",
  cyan:   "#0284c7",
  green:  "#16a34a",
  yellow: "#b45309",
  orange: "#c2410c",
  red:    "#dc2626",
  purple: "#7c3aed",
};

const LS = {
  page: {
    background: L.pageBg, minHeight: "100vh", padding: "20px 16px",
    display: "flex", flexDirection: "column" as const, gap: 12,
    fontFamily: "'DM Sans', system-ui, sans-serif", color: L.text1,
  },
  panel: {
    background: L.panelBg, border: `1px solid ${L.panelBorder}`,
    borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  btn: {
    background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 4,
    color: L.text2, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600,
  },
  input: {
    width: "100%", background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 4,
    color: L.text1, padding: "7px 9px", fontSize: 12, fontFamily: "'DM Mono',monospace",
    outline: "none",
  },
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

function Shimmer({ w = "100%", h = 14, radius = 4, style = {} }: {
  w?: string | number; h?: number; radius?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, flexShrink: 0,
      background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s ease infinite", ...style,
    }} />
  );
}

function LPanel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...LS.panel, ...style }}>{children}</div>;
}

// ── Provider metadata ──────────────────────────────────────────────────────────
interface ProviderMeta {
  id: string;
  name: string;
  icon: string;
  description: string;
  envVars: string[];
  fieldLabels?: Record<string, string>;
  secretFields?: string[];
  actionsSupported: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "aws", name: "AWS", icon: "☁",
    description: "KMS keys, ACM certificates, Secrets Manager, IAM access keys",
    envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
    secretFields: ["AWS_SECRET_ACCESS_KEY"],
    actionsSupported: "Rotate key, renew certificate — real API calls",
  },
  {
    id: "azure", name: "Azure", icon: "◆",
    description: "Key Vault keys, secrets, and certificates",
    envVars: ["AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_TENANT_ID", "AZURE_KEY_VAULT_URL"],
    secretFields: ["AZURE_CLIENT_SECRET"],
    actionsSupported: "Rotate key, reissue certificate — real API calls",
  },
  {
    id: "gcp", name: "Google Cloud", icon: "▲",
    description: "Cloud KMS keys, Secret Manager, Certificate Manager",
    envVars: ["GOOGLE_APPLICATION_CREDENTIALS_JSON", "GCP_PROJECT_ID"],
    fieldLabels: { GOOGLE_APPLICATION_CREDENTIALS_JSON: "Service Account JSON (paste full key file)" },
    secretFields: ["GOOGLE_APPLICATION_CREDENTIALS_JSON"],
    actionsSupported: "Rotate KMS key — real API call",
  },
  {
    id: "render", name: "Render", icon: "▣",
    description: "Custom domains + TLS verification status (monitoring only)",
    envVars: ["RENDER_API_KEY"],
    secretFields: ["RENDER_API_KEY"],
    actionsSupported: "Discovery only — Render has no rotate/renew API",
  },
  {
    id: "vcenter", name: "vCenter", icon: "⬡",
    description: "vCenter Server Appliance TLS certificate",
    envVars: ["VCENTER_HOST", "VCENTER_USER", "VCENTER_PASSWORD"],
    secretFields: ["VCENTER_PASSWORD"],
    actionsSupported: "Renew certificate — VMCA-signed certs only",
  },
];

interface SyncResult {
  discovered: number;
  created: number;
  updated: number;
}

type CardState = {
  configured: boolean | null;   // null = still loading
  syncing: boolean;
  syncResult: SyncResult | null;
  syncError: string | null;
  statusError: string | null;
  connecting: boolean;
  connectError: string | null;
  disconnecting: boolean;
};

const emptyCardState: CardState = {
  configured: null, syncing: false, syncResult: null, syncError: null, statusError: null,
  connecting: false, connectError: null, disconnecting: false,
};

export default function IntegrationsPage() {
  const mobile = useMobile();
  const [cards, setCards] = useState<Record<string, CardState>>(
    Object.fromEntries(PROVIDERS.map(p => [p.id, { ...emptyCardState }]))
  );
  const [modalProviderId, setModalProviderId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const loadStatus = useCallback(async (providerId: string) => {
    try {
      const res = await fetch(`${API}/integrations/${providerId}/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCards(prev => ({ ...prev, [providerId]: { ...prev[providerId], configured: Boolean(data.configured), statusError: null } }));
    } catch (e) {
      setCards(prev => ({
        ...prev,
        [providerId]: { ...prev[providerId], configured: false, statusError: e instanceof Error ? e.message : "Status check failed" },
      }));
    }
  }, []);

  useEffect(() => {
    PROVIDERS.forEach(p => loadStatus(p.id));
  }, [loadStatus]);

  const doSync = async (providerId: string) => {
    setCards(prev => ({ ...prev, [providerId]: { ...prev[providerId], syncing: true, syncResult: null, syncError: null } }));
    try {
      const res = await fetch(`${API}/integrations/${providerId}/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      setCards(prev => ({
        ...prev,
        [providerId]: {
          ...prev[providerId], syncing: false,
          syncResult: { discovered: data.discovered ?? 0, created: data.created ?? 0, updated: data.updated ?? 0 },
        },
      }));
    } catch (e) {
      setCards(prev => ({
        ...prev,
        [providerId]: { ...prev[providerId], syncing: false, syncError: e instanceof Error ? e.message : "Sync failed" },
      }));
    }
  };

  const openConnectModal = (providerId: string) => {
    const provider = PROVIDERS.find(p => p.id === providerId)!;
    setFormValues(Object.fromEntries(provider.envVars.map(v => [v, ""])));
    setCards(prev => ({ ...prev, [providerId]: { ...prev[providerId], connectError: null } }));
    setModalProviderId(providerId);
  };

  const closeModal = () => {
    setModalProviderId(null);
    setFormValues({});
  };

  const submitConnect = async (providerId: string) => {
    const provider = PROVIDERS.find(p => p.id === providerId)!;
    const missing = provider.envVars.filter(v => !formValues[v]?.trim());
    if (missing.length) {
      setCards(prev => ({ ...prev, [providerId]: { ...prev[providerId], connectError: `Missing: ${missing.join(", ")}` } }));
      return;
    }
    setCards(prev => ({ ...prev, [providerId]: { ...prev[providerId], connecting: true, connectError: null } }));
    try {
      const res = await fetch(`${API}/integrations/${providerId}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: formValues }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      setCards(prev => ({ ...prev, [providerId]: { ...prev[providerId], connecting: false, configured: true } }));
      closeModal();
      loadStatus(providerId);
    } catch (e) {
      setCards(prev => ({
        ...prev,
        [providerId]: { ...prev[providerId], connecting: false, connectError: e instanceof Error ? e.message : "Connect failed" },
      }));
    }
  };

  const doDisconnect = async (providerId: string) => {
    setCards(prev => ({ ...prev, [providerId]: { ...prev[providerId], disconnecting: true } }));
    try {
      const res = await fetch(`${API}/integrations/${providerId}/disconnect`, { method: "POST" });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      setCards(prev => ({ ...prev, [providerId]: { ...prev[providerId], disconnecting: false, configured: false, syncResult: null } }));
    } catch (e) {
      setCards(prev => ({
        ...prev,
        [providerId]: { ...prev[providerId], disconnecting: false, statusError: e instanceof Error ? e.message : "Disconnect failed" },
      }));
    }
  };

  const configuredCount = PROVIDERS.filter(p => cards[p.id]?.configured === true).length;
  const modalProvider = PROVIDERS.find(p => p.id === modalProviderId) || null;
  const modalState = modalProviderId ? cards[modalProviderId] : null;

  return (
    <div style={LS.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.panelBorder};border-radius:3px;}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: L.text1 }}>Cloud & Infrastructure Integrations</div>
          <div style={{ fontSize: 11, color: L.text3, marginTop: 2 }}>
            Connect your cloud accounts so crypto assets and remediation actions reflect actual resources, not just seeded data.
          </div>
        </div>
        <div style={{ fontSize: 11, color: L.text2, background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 20, padding: "5px 14px" }}>
          <b style={{ color: L.blue }}>{configuredCount}</b> of {PROVIDERS.length} connected
        </div>
      </div>

      {/* ── PROVIDER CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2,1fr)", gap: mobile ? 8 : 10 }}>
        {PROVIDERS.map(p => {
          const state = cards[p.id];
          const loading = state?.configured === null;
          return (
            <LPanel key={p.id} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Card header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: L.insetBg, border: `1px solid ${L.panelBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: L.blue }}>
                    {p.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: L.text1 }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: L.text4 }}>{p.description}</div>
                  </div>
                </div>
                {loading ? (
                  <Shimmer w={80} h={18} radius={10} />
                ) : state.configured ? (
                  <span style={{ fontSize: 9, fontWeight: 700, color: L.green, background: "#f0fdf4", border: `1px solid ${L.green}44`, borderRadius: 10, padding: "3px 10px" }}>
                    ● CONNECTED
                  </span>
                ) : (
                  <span style={{ fontSize: 9, fontWeight: 700, color: L.text4, background: L.insetBg, border: `1px solid ${L.panelBorder}`, borderRadius: 10, padding: "3px 10px" }}>
                    ○ NOT CONNECTED
                  </span>
                )}
              </div>

              {/* Required credentials (labels only, informational) */}
              <div>
                <div style={{ fontSize: 8, color: L.text4, letterSpacing: ".1em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 5 }}>
                  Credentials Required
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {p.envVars.map(v => (
                    <span key={v} style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: L.cyan, background: `${L.cyan}0a`, border: `1px solid ${L.cyan}33`, borderRadius: 3, padding: "2px 6px" }}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions supported note */}
              <div style={{ fontSize: 9, color: L.text3, fontStyle: "italic" }}>{p.actionsSupported}</div>

              {/* Connect / Sync / Disconnect row */}
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: "auto", paddingTop: 8, borderTop: `1px solid ${L.borderLight}` }}>
                {!loading && !state.configured && (
                  <button onClick={() => openConnectModal(p.id)} style={{ ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue }}>
                    Connect
                  </button>
                )}
                {!loading && state.configured && (
                  <>
                    <button
                      onClick={() => doSync(p.id)}
                      disabled={state.syncing}
                      style={{ ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: state.syncing ? 0.7 : 1, cursor: state.syncing ? "not-allowed" : "pointer" }}
                    >
                      {state.syncing ? "Syncing..." : "Sync Now"}
                    </button>
                    <button onClick={() => openConnectModal(p.id)} style={LS.btn}>
                      Edit credentials
                    </button>
                    <button
                      onClick={() => doDisconnect(p.id)}
                      disabled={state.disconnecting}
                      style={{ ...LS.btn, color: L.red, opacity: state.disconnecting ? 0.7 : 1, cursor: state.disconnecting ? "not-allowed" : "pointer" }}
                    >
                      {state.disconnecting ? "Disconnecting..." : "Disconnect"}
                    </button>
                  </>
                )}
                {state?.syncResult && (
                  <span style={{ fontSize: 10, color: L.green }}>
                    ✓ {state.syncResult.discovered} found · {state.syncResult.created} new · {state.syncResult.updated} updated
                  </span>
                )}
                {state?.syncError && (
                  <span style={{ fontSize: 10, color: L.red }}>✗ {state.syncError}</span>
                )}
                {state?.statusError && !state.configured && (
                  <span style={{ fontSize: 10, color: L.red }}>✗ {state.statusError}</span>
                )}
              </div>
            </LPanel>
          );
        })}
      </div>

      {/* ── FOOTNOTE ── */}
      <div style={{ fontSize: 9, color: L.text4, textAlign: "center", marginTop: 4 }}>
        Synced assets appear in Crypto Asset Inventory tagged with their source cloud. Remediation actions on synced assets call the real provider API — see each connector's docstring for exactly which actions are real vs. discovery-only.
      </div>

      {/* ── CONNECT MODAL ── */}
      {modalProvider && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, zIndex: 100,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ ...LS.panel, width: "100%", maxWidth: 440, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: L.insetBg, border: `1px solid ${L.panelBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: L.blue }}>
                  {modalProvider.icon}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: L.text1 }}>Connect {modalProvider.name}</div>
              </div>
              <button onClick={closeModal} style={{ ...LS.btn, padding: "4px 9px" }}>✕</button>
            </div>

            <div style={{ fontSize: 10, color: L.text3 }}>
              Credentials are sent directly to your backend and stored there — nothing is kept in the browser after this form closes.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {modalProvider.envVars.map(v => {
                const isSecret = modalProvider.secretFields?.includes(v);
                const isJson = v.endsWith("_JSON");
                const label = modalProvider.fieldLabels?.[v] || v;
                return (
                  <div key={v} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 9, color: L.text4, letterSpacing: ".06em", textTransform: "uppercase" as const, fontWeight: 600 }}>
                      {label}
                    </label>
                    {isJson ? (
                      <textarea
                        value={formValues[v] || ""}
                        onChange={e => setFormValues(prev => ({ ...prev, [v]: e.target.value }))}
                        rows={4}
                        placeholder="Paste JSON here"
                        style={{ ...LS.input, resize: "vertical" as const }}
                      />
                    ) : (
                      <input
                        type={isSecret ? "password" : "text"}
                        value={formValues[v] || ""}
                        onChange={e => setFormValues(prev => ({ ...prev, [v]: e.target.value }))}
                        placeholder={v}
                        autoComplete="off"
                        style={LS.input}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {modalState?.connectError && (
              <div style={{ fontSize: 10, color: L.red, background: "#fef2f2", border: `1px solid ${L.red}33`, borderRadius: 4, padding: "6px 9px" }}>
                ✗ {modalState.connectError}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={closeModal} style={LS.btn}>Cancel</button>
              <button
                onClick={() => submitConnect(modalProvider.id)}
                disabled={modalState?.connecting}
                style={{ ...LS.btn, background: L.blue, color: "#fff", borderColor: L.blue, opacity: modalState?.connecting ? 0.7 : 1, cursor: modalState?.connecting ? "not-allowed" : "pointer" }}
              >
                {modalState?.connecting ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}