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
  actionsSupported: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "aws", name: "AWS", icon: "☁",
    description: "KMS keys, ACM certificates, Secrets Manager, IAM access keys",
    envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
    actionsSupported: "Rotate key, renew certificate — real API calls",
  },
  {
    id: "azure", name: "Azure", icon: "◆",
    description: "Key Vault keys, secrets, and certificates",
    envVars: ["AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_TENANT_ID", "AZURE_KEY_VAULT_URL"],
    actionsSupported: "Rotate key, reissue certificate — real API calls",
  },
  {
    id: "gcp", name: "Google Cloud", icon: "▲",
    description: "Cloud KMS keys, Secret Manager, Certificate Manager",
    envVars: ["GOOGLE_APPLICATION_CREDENTIALS", "GCP_PROJECT_ID"],
    actionsSupported: "Rotate KMS key — real API call",
  },
  {
    id: "render", name: "Render", icon: "▣",
    description: "Custom domains + TLS verification status (monitoring only)",
    envVars: ["RENDER_API_KEY"],
    actionsSupported: "Discovery only — Render has no rotate/renew API",
  },
  {
    id: "vcenter", name: "vCenter", icon: "⬡",
    description: "vCenter Server Appliance TLS certificate",
    envVars: ["VCENTER_HOST", "VCENTER_USER", "VCENTER_PASSWORD"],
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
};

export default function IntegrationsPage() {
  const mobile = useMobile();
  const [cards, setCards] = useState<Record<string, CardState>>(
    Object.fromEntries(PROVIDERS.map(p => [p.id, {
      configured: null, syncing: false, syncResult: null, syncError: null, statusError: null,
    }]))
  );

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

  const configuredCount = PROVIDERS.filter(p => cards[p.id]?.configured === true).length;

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
            Connect real cloud/infra sources so crypto assets and remediation actions reflect actual resources, not just seeded data.
          </div>
        </div>
        <div style={{ fontSize: 11, color: L.text2, background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 20, padding: "5px 14px" }}>
          <b style={{ color: L.blue }}>{configuredCount}</b> of {PROVIDERS.length} configured
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
                    ● CONFIGURED
                  </span>
                ) : (
                  <span style={{ fontSize: 9, fontWeight: 700, color: L.text4, background: L.insetBg, border: `1px solid ${L.panelBorder}`, borderRadius: 10, padding: "3px 10px" }}>
                    ○ NOT CONFIGURED
                  </span>
                )}
              </div>

              {/* Required env vars */}
              <div>
                <div style={{ fontSize: 8, color: L.text4, letterSpacing: ".1em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 5 }}>
                  Required Environment Variables
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

              {/* Sync button + result */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 8, borderTop: `1px solid ${L.borderLight}` }}>
                <button
                  onClick={() => doSync(p.id)}
                  disabled={!state?.configured || state?.syncing}
                  style={{
                    ...LS.btn,
                    background: state?.configured ? L.blue : L.subtleBg,
                    color: state?.configured ? "#fff" : L.text4,
                    borderColor: state?.configured ? L.blue : L.panelBorder,
                    cursor: state?.configured && !state?.syncing ? "pointer" : "not-allowed",
                    opacity: state?.syncing ? 0.7 : 1,
                  }}
                >
                  {state?.syncing ? "Syncing..." : "Sync Now"}
                </button>
                {!state?.configured && !loading && (
                  <span style={{ fontSize: 9, color: L.text4 }}>Set the env vars above, then redeploy to enable sync</span>
                )}
                {state?.syncResult && (
                  <span style={{ fontSize: 10, color: L.green }}>
                    ✓ {state.syncResult.discovered} found · {state.syncResult.created} new · {state.syncResult.updated} updated
                  </span>
                )}
                {state?.syncError && (
                  <span style={{ fontSize: 10, color: L.red }}>✗ {state.syncError}</span>
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
    </div>
  );
}