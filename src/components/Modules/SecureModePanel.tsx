/**
 * REBEL — SecureModePanel & SecureModeBadge
 * ==========================================
 * Wired to the real /secure-mode/* endpoints.
 *
 * How to add to AppShell.tsx (two lines):
 *
 *   import SecureModePanel, { SecureModeBadge } from "./SecureModePanel";
 *
 *   // Inside the sidebar <nav> footer:
 *   <SecureModePanel token={jwtToken} />
 *
 *   // Inside your dashboard header:
 *   <SecureModeBadge token={jwtToken} />
 *
 * The toggle calls POST /secure-mode/toggle { enabled: true|false }.
 * That endpoint writes to rebel_config in PostgreSQL → survives restarts.
 * Env-locked mode (SECURE_MODE=true in docker-compose) shows a locked badge
 * and disables the toggle button — you can observe but not disable from UI.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

// ── Config ────────────────────────────────────────────────────────────────
const API_BASE = (window as any).__REBEL_API__ ??
  import.meta?.env?.VITE_API_URL ??
  "https://r3bel-production.up.railway.app";

const POLL_MS = 5_000;

// ── Types ─────────────────────────────────────────────────────────────────
interface BlockedEntry {
  timestamp:  string;
  caller:     string;
  target:     string;
  reason:     string;
  request_id: string;
}

interface SecureModeStatus {
  enabled:             boolean;
  source:              "env_var" | "db_toggle" | "default";
  enabled_since:       string | null;
  total_blocked:       number;
  external_calls:      number | null;
  allowed_domains:     string[];
  allowed_networks:    string[];
  env_locked:          boolean;
  db_value:            boolean | null;
  blocked_log_preview: BlockedEntry[];
}

// ── Light palette (matches AppShell) ─────────────────────────────────────
const C = {
  accent:    "#0ea5e9",
  success:   "#16a34a",
  warning:   "#d97706",
  danger:    "#dc2626",
  dimBorder: "rgba(14,165,233,0.18)",
  panelBg:   "#ffffff",
  text:      "#050d1a",
  textSec:   "#334155",
  textMuted: "#64748b",
  accentDim: "rgba(14,165,233,0.08)",
};


// ─────────────────────────────────────────────────────────────────────────
// Hook — polls /secure-mode/status every 5 s
// ─────────────────────────────────────────────────────────────────────────
function useSecureMode(token?: string) {
  const [status,  setStatus]  = useState<SecureModeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const headers = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/secure-mode/status`, { headers: headers() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setStatus(await r.json());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchStatus();
    timer.current = setInterval(fetchStatus, POLL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [fetchStatus]);

  /**
   * Toggle — calls POST /secure-mode/toggle { enabled: bool }
   * The backend writes to rebel_config in PostgreSQL.
   */
  const toggle = useCallback(async () => {
    if (!status || toggling) return;

    // Prevent disabling an env-locked mode
    if (status.enabled && status.env_locked) {
      alert(
        "Cannot disable Secure Mode: SECURE_MODE=true is set in the environment.\n" +
        "Remove the env var and restart the container to disable."
      );
      return;
    }

    setToggling(true);
    try {
      const r = await fetch(`${API_BASE}/secure-mode/toggle`, {
        method:  "POST",
        headers: headers(),
        body:    JSON.stringify({ enabled: !status.enabled }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.detail ?? `HTTP ${r.status}`);
      // Immediately refresh so UI reflects the new DB state
      await fetchStatus();
    } catch (e: any) {
      alert(`Toggle failed: ${e?.message}`);
    } finally {
      setToggling(false);
    }
  }, [status, toggling, headers, fetchStatus]);

  return { status, loading, error, toggle, toggling, refetch: fetchStatus };
}


// ─────────────────────────────────────────────────────────────────────────
// SecureModeBadge — compact indicator for dashboard headers
// ─────────────────────────────────────────────────────────────────────────
export function SecureModeBadge({ token }: { token?: string }) {
  const { status, loading } = useSecureMode(token);
  if (loading || !status) return null;
  const on = status.enabled;

  return (
    <div
      title={on ? "REBEL Secure Mode ACTIVE — 0 external calls" : "Secure Mode OFF"}
      style={{
        display:       "inline-flex",
        alignItems:    "center",
        gap:           6,
        padding:       "4px 10px",
        borderRadius:  20,
        background:    on ? "rgba(22,163,74,0.1)"  : "rgba(220,38,38,0.07)",
        border:        `1px solid ${on ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.25)"}`,
        fontFamily:    "'Orbitron', monospace",
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: ".14em",
        color:         on ? C.success : C.danger,
        userSelect:    "none",
      }}
    >
      <PulseDot on={on} size={7} />
      SECURE {on ? "ON" : "OFF"}
      {on && (
        <span style={{
          marginLeft: 4, padding: "1px 5px",
          background: "rgba(22,163,74,0.15)", borderRadius: 4,
          fontSize: 8, fontWeight: 800,
        }}>
          0 EXT CALLS
        </span>
      )}
      <Keyframes />
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────
// SecureModePanel — full sidebar panel
// ─────────────────────────────────────────────────────────────────────────
export default function SecureModePanel({ token }: { token?: string }) {
  const { status, loading, error, toggle, toggling } = useSecureMode(token);
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div style={panelStyle}>
        <span style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}>
          Checking Secure Mode…
        </span>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div style={{ ...panelStyle, borderColor: "rgba(220,38,38,0.3)" }}>
        <span style={{ fontSize: 9, color: C.danger, fontFamily: "monospace" }}>
          ⚠ /secure-mode/status unreachable
        </span>
      </div>
    );
  }

  const on          = status.enabled;
  const canDisable  = !status.env_locked;
  const sourceLabel = status.source === "env_var" ? "env var" :
                      status.source === "db_toggle" ? "DB toggle" : "default";

  return (
    <div style={panelStyle}>
      <Keyframes />

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <PulseDot on={on} size={9} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily:    "'Orbitron', monospace",
              fontSize:      9,
              fontWeight:    800,
              letterSpacing: ".18em",
              color:         on ? C.success : C.textMuted,
              whiteSpace:    "nowrap",
            }}>
              SECURE: {on ? "ON" : "OFF"}
            </div>
            <div style={{ fontSize: 7.5, color: C.textMuted, marginTop: 1 }}>
              {on
                ? `since ${status.enabled_since ? fmtTime(status.enabled_since) : "—"} · ${sourceLabel}`
                : `source: ${sourceLabel}`}
            </div>
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={toggle}
          disabled={toggling || (on && !canDisable)}
          title={
            on && !canDisable
              ? "Locked by SECURE_MODE env var — cannot disable from UI"
              : toggling ? "Working…" : `Click to ${on ? "disable" : "enable"} Secure Mode`
          }
          style={{
            padding:       "5px 11px",
            borderRadius:  5,
            border:        `1px solid ${on ? "rgba(220,38,38,0.4)" : "rgba(22,163,74,0.4)"}`,
            background:    on ? "rgba(220,38,38,0.08)" : "rgba(22,163,74,0.08)",
            color:         on && !canDisable ? C.textMuted : (on ? C.danger : C.success),
            fontFamily:    "'Orbitron', monospace",
            fontSize:      8,
            fontWeight:    700,
            letterSpacing: ".1em",
            cursor:        toggling || (on && !canDisable) ? "not-allowed" : "pointer",
            opacity:       toggling || (on && !canDisable) ? 0.5 : 1,
            flexShrink:    0,
            transition:    "all 0.15s",
          }}
        >
          {toggling ? "…" : on ? "DISABLE" : "ENABLE"}
        </button>
      </div>

      {/* Env-locked notice */}
      {on && !canDisable && (
        <div style={{
          marginTop: 7,
          padding:   "4px 8px",
          borderRadius: 4,
          background: "rgba(217,119,6,0.08)",
          border: "1px solid rgba(217,119,6,0.25)",
          fontSize: 8,
          color: C.warning,
          fontFamily: "'Share Tech Mono', monospace",
        }}>
          🔒 SECURE_MODE=true in environment — immutable via UI
        </div>
      )}

      {/* Stats row */}
      {on && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
          <StatCell
            label="EXTERNAL CALLS"
            value={status.external_calls === 0 ? "0 ✓" : "—"}
            accent={C.success}
          />
          <StatCell
            label="BLOCKED"
            value={String(status.total_blocked)}
            accent={status.total_blocked > 0 ? C.warning : C.success}
          />
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          marginTop: 8, width: "100%", background: "none", border: "none",
          color: C.textMuted, fontSize: 8, fontFamily: "'Share Tech Mono', monospace",
          cursor: "pointer", textAlign: "center", letterSpacing: ".06em",
          padding: "2px 0",
        }}
      >
        {expanded ? "▲ hide details" : "▼ show details"}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 7 }}>

          <LabelRow label="Source"   value={sourceLabel} />
          <LabelRow label="Env lock" value={status.env_locked ? "YES — cannot disable via UI" : "No"} />
          <LabelRow label="DB value" value={status.db_value === null ? "not set" : String(status.db_value)} />

          {status.allowed_domains.length > 0 && (
            <div>
              <div style={labelSt}>ALLOWED DOMAINS</div>
              {status.allowed_domains.map(d => (
                <div key={d} style={{ ...valueSt, fontFamily: "monospace", paddingLeft: 4 }}>
                  • {d}
                </div>
              ))}
            </div>
          )}

          {/* Blocked log preview */}
          {on && status.blocked_log_preview?.length > 0 && (
            <div>
              <div style={labelSt}>RECENT BLOCKED ATTEMPTS</div>
              <div style={{
                maxHeight: 150, overflowY: "auto",
                border: "1px solid rgba(220,38,38,0.2)",
                borderRadius: 4, padding: "4px 6px",
              }}>
                {status.blocked_log_preview.map((b, i) => (
                  <div key={i} style={{
                    fontSize: 7.5, color: C.danger, fontFamily: "monospace",
                    padding: "2px 0",
                    borderBottom: i < status.blocked_log_preview.length - 1
                      ? "1px solid rgba(220,38,38,0.1)" : "none",
                  }}>
                    <span style={{ color: C.textMuted }}>{fmtTime(b.timestamp)}</span>
                    {" → "}<span style={{ fontWeight: 700 }}>{b.target}</span>
                    <br />
                    <span style={{ color: C.textMuted, paddingLeft: 8 }}>
                      {b.caller} · {b.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {on && (!status.blocked_log_preview || status.blocked_log_preview.length === 0) && (
            <div style={{ fontSize: 8, color: C.success, fontFamily: "monospace" }}>
              ✓ No blocked attempts yet — system is clean
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function PulseDot({ on, size }: { on: boolean; size: number }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
      {on && (
        <span style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: C.success, opacity: 0.4,
          animation: "sm-ping 1.4s ease infinite",
        }} />
      )}
      <span style={{
        width: size, height: size, borderRadius: "50%", display: "block",
        background: on ? C.success : C.textMuted,
        boxShadow:  on ? `0 0 5px ${C.success}` : "none",
      }} />
    </span>
  );
}

function StatCell({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: `${accent}12`, border: `1px solid ${accent}33`,
      borderRadius: 5, padding: "5px 8px",
    }}>
      <div style={{ fontSize: 7, color: C.textMuted, fontFamily: "'Orbitron', monospace", letterSpacing: ".1em" }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: accent, fontFamily: "'Orbitron', monospace", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function LabelRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
      <span style={labelSt}>{label}</span>
      <span style={{ ...valueSt, textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}

function Keyframes() {
  return (
    <style>{`
      @keyframes sm-ping {
        0%   { transform: scale(1); opacity: .4; }
        100% { transform: scale(2.4); opacity: 0; }
      }
    `}</style>
  );
}


// ─────────────────────────────────────────────────────────────────────────
// Styles & helpers
// ─────────────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  padding:      "10px 12px",
  borderRadius: 8,
  border:       `1px solid ${C.dimBorder}`,
  background:   C.panelBg,
  margin:       "6px 10px",
};

const labelSt: React.CSSProperties = {
  fontSize: 7.5, color: C.textMuted,
  fontFamily: "'Orbitron', monospace",
  letterSpacing: ".14em", fontWeight: 700,
  textTransform: "uppercase", flexShrink: 0,
};

const valueSt: React.CSSProperties = {
  fontSize: 8.5, color: C.textSec,
  fontFamily: "'Share Tech Mono', monospace",
};

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return iso;
  }
}