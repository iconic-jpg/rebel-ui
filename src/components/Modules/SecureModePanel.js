import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
// ── Config ────────────────────────────────────────────────────────────────
const API_BASE = window.__REBEL_API__ ??
    import.meta?.env?.VITE_API_URL ??
    "https://r3bel-production.up.railway.app";
const POLL_MS = 5_000;
// ── Light palette (matches AppShell) ─────────────────────────────────────
const C = {
    accent: "#0ea5e9",
    success: "#16a34a",
    warning: "#d97706",
    danger: "#dc2626",
    dimBorder: "rgba(14,165,233,0.18)",
    panelBg: "#ffffff",
    text: "#050d1a",
    textSec: "#334155",
    textMuted: "#64748b",
    accentDim: "rgba(14,165,233,0.08)",
};
// ─────────────────────────────────────────────────────────────────────────
// Hook — polls /secure-mode/status every 5 s
// ─────────────────────────────────────────────────────────────────────────
function useSecureMode(token) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toggling, setToggling] = useState(false);
    const timer = useRef(null);
    const headers = useCallback(() => {
        const h = { "Content-Type": "application/json" };
        if (token)
            h["Authorization"] = `Bearer ${token}`;
        return h;
    }, [token]);
    const fetchStatus = useCallback(async () => {
        try {
            const r = await fetch(`${API_BASE}/secure-mode/status`, { headers: headers() });
            if (!r.ok)
                throw new Error(`HTTP ${r.status}`);
            setStatus(await r.json());
            setError(null);
        }
        catch (e) {
            setError(e?.message ?? "Network error");
        }
        finally {
            setLoading(false);
        }
    }, [headers]);
    useEffect(() => {
        fetchStatus();
        timer.current = setInterval(fetchStatus, POLL_MS);
        return () => { if (timer.current)
            clearInterval(timer.current); };
    }, [fetchStatus]);
    /**
     * Toggle — calls POST /secure-mode/toggle { enabled: bool }
     * The backend writes to rebel_config in PostgreSQL.
     */
    const toggle = useCallback(async () => {
        if (!status || toggling)
            return;
        // Prevent disabling an env-locked mode
        if (status.enabled && status.env_locked) {
            alert("Cannot disable Secure Mode: SECURE_MODE=true is set in the environment.\n" +
                "Remove the env var and restart the container to disable.");
            return;
        }
        setToggling(true);
        try {
            const r = await fetch(`${API_BASE}/secure-mode/toggle`, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ enabled: !status.enabled }),
            });
            const body = await r.json();
            if (!r.ok)
                throw new Error(body.detail ?? `HTTP ${r.status}`);
            // Immediately refresh so UI reflects the new DB state
            await fetchStatus();
        }
        catch (e) {
            alert(`Toggle failed: ${e?.message}`);
        }
        finally {
            setToggling(false);
        }
    }, [status, toggling, headers, fetchStatus]);
    return { status, loading, error, toggle, toggling, refetch: fetchStatus };
}
// ─────────────────────────────────────────────────────────────────────────
// SecureModeBadge — compact indicator for dashboard headers
// ─────────────────────────────────────────────────────────────────────────
export function SecureModeBadge({ token }) {
    const { status, loading } = useSecureMode(token);
    if (loading || !status)
        return null;
    const on = status.enabled;
    return (_jsxs("div", { title: on ? "REBEL Secure Mode ACTIVE — 0 external calls" : "Secure Mode OFF", style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 20,
            background: on ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.07)",
            border: `1px solid ${on ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.25)"}`,
            fontFamily: "'Orbitron', monospace",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: ".14em",
            color: on ? C.success : C.danger,
            userSelect: "none",
        }, children: [_jsx(PulseDot, { on: on, size: 7 }), "SECURE ", on ? "ON" : "OFF", on && (_jsx("span", { style: {
                    marginLeft: 4, padding: "1px 5px",
                    background: "rgba(22,163,74,0.15)", borderRadius: 4,
                    fontSize: 8, fontWeight: 800,
                }, children: "0 EXT CALLS" })), _jsx(Keyframes, {})] }));
}
// ─────────────────────────────────────────────────────────────────────────
// SecureModePanel — full sidebar panel
// ─────────────────────────────────────────────────────────────────────────
export default function SecureModePanel({ token }) {
    const { status, loading, error, toggle, toggling } = useSecureMode(token);
    const [expanded, setExpanded] = useState(false);
    if (loading) {
        return (_jsx("div", { style: panelStyle, children: _jsx("span", { style: { fontSize: 9, color: C.textMuted, fontFamily: "monospace" }, children: "Checking Secure Mode\u2026" }) }));
    }
    if (error || !status) {
        return (_jsx("div", { style: { ...panelStyle, borderColor: "rgba(220,38,38,0.3)" }, children: _jsx("span", { style: { fontSize: 9, color: C.danger, fontFamily: "monospace" }, children: "\u26A0 /secure-mode/status unreachable" }) }));
    }
    const on = status.enabled;
    const canDisable = !status.env_locked;
    const sourceLabel = status.source === "env_var" ? "env var" :
        status.source === "db_toggle" ? "DB toggle" : "default";
    return (_jsxs("div", { style: panelStyle, children: [_jsx(Keyframes, {}), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 }, children: [_jsx(PulseDot, { on: on, size: 9 }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsxs("div", { style: {
                                            fontFamily: "'Orbitron', monospace",
                                            fontSize: 9,
                                            fontWeight: 800,
                                            letterSpacing: ".18em",
                                            color: on ? C.success : C.textMuted,
                                            whiteSpace: "nowrap",
                                        }, children: ["SECURE: ", on ? "ON" : "OFF"] }), _jsx("div", { style: { fontSize: 7.5, color: C.textMuted, marginTop: 1 }, children: on
                                            ? `since ${status.enabled_since ? fmtTime(status.enabled_since) : "—"} · ${sourceLabel}`
                                            : `source: ${sourceLabel}` })] })] }), _jsx("button", { onClick: toggle, disabled: toggling || (on && !canDisable), title: on && !canDisable
                            ? "Locked by SECURE_MODE env var — cannot disable from UI"
                            : toggling ? "Working…" : `Click to ${on ? "disable" : "enable"} Secure Mode`, style: {
                            padding: "5px 11px",
                            borderRadius: 5,
                            border: `1px solid ${on ? "rgba(220,38,38,0.4)" : "rgba(22,163,74,0.4)"}`,
                            background: on ? "rgba(220,38,38,0.08)" : "rgba(22,163,74,0.08)",
                            color: on && !canDisable ? C.textMuted : (on ? C.danger : C.success),
                            fontFamily: "'Orbitron', monospace",
                            fontSize: 8,
                            fontWeight: 700,
                            letterSpacing: ".1em",
                            cursor: toggling || (on && !canDisable) ? "not-allowed" : "pointer",
                            opacity: toggling || (on && !canDisable) ? 0.5 : 1,
                            flexShrink: 0,
                            transition: "all 0.15s",
                        }, children: toggling ? "…" : on ? "DISABLE" : "ENABLE" })] }), on && !canDisable && (_jsx("div", { style: {
                    marginTop: 7,
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: "rgba(217,119,6,0.08)",
                    border: "1px solid rgba(217,119,6,0.25)",
                    fontSize: 8,
                    color: C.warning,
                    fontFamily: "'Share Tech Mono', monospace",
                }, children: "\uD83D\uDD12 SECURE_MODE=true in environment \u2014 immutable via UI" })), on && (_jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }, children: [_jsx(StatCell, { label: "EXTERNAL CALLS", value: status.external_calls === 0 ? "0 ✓" : "—", accent: C.success }), _jsx(StatCell, { label: "BLOCKED", value: String(status.total_blocked), accent: status.total_blocked > 0 ? C.warning : C.success })] })), _jsx("button", { onClick: () => setExpanded(e => !e), style: {
                    marginTop: 8, width: "100%", background: "none", border: "none",
                    color: C.textMuted, fontSize: 8, fontFamily: "'Share Tech Mono', monospace",
                    cursor: "pointer", textAlign: "center", letterSpacing: ".06em",
                    padding: "2px 0",
                }, children: expanded ? "▲ hide details" : "▼ show details" }), expanded && (_jsxs("div", { style: { marginTop: 6, display: "flex", flexDirection: "column", gap: 7 }, children: [_jsx(LabelRow, { label: "Source", value: sourceLabel }), _jsx(LabelRow, { label: "Env lock", value: status.env_locked ? "YES — cannot disable via UI" : "No" }), _jsx(LabelRow, { label: "DB value", value: status.db_value === null ? "not set" : String(status.db_value) }), status.allowed_domains.length > 0 && (_jsxs("div", { children: [_jsx("div", { style: labelSt, children: "ALLOWED DOMAINS" }), status.allowed_domains.map(d => (_jsxs("div", { style: { ...valueSt, fontFamily: "monospace", paddingLeft: 4 }, children: ["\u2022 ", d] }, d)))] })), on && status.blocked_log_preview?.length > 0 && (_jsxs("div", { children: [_jsx("div", { style: labelSt, children: "RECENT BLOCKED ATTEMPTS" }), _jsx("div", { style: {
                                    maxHeight: 150, overflowY: "auto",
                                    border: "1px solid rgba(220,38,38,0.2)",
                                    borderRadius: 4, padding: "4px 6px",
                                }, children: status.blocked_log_preview.map((b, i) => (_jsxs("div", { style: {
                                        fontSize: 7.5, color: C.danger, fontFamily: "monospace",
                                        padding: "2px 0",
                                        borderBottom: i < status.blocked_log_preview.length - 1
                                            ? "1px solid rgba(220,38,38,0.1)" : "none",
                                    }, children: [_jsx("span", { style: { color: C.textMuted }, children: fmtTime(b.timestamp) }), " → ", _jsx("span", { style: { fontWeight: 700 }, children: b.target }), _jsx("br", {}), _jsxs("span", { style: { color: C.textMuted, paddingLeft: 8 }, children: [b.caller, " \u00B7 ", b.reason] })] }, i))) })] })), on && (!status.blocked_log_preview || status.blocked_log_preview.length === 0) && (_jsx("div", { style: { fontSize: 8, color: C.success, fontFamily: "monospace" }, children: "\u2713 No blocked attempts yet \u2014 system is clean" }))] }))] }));
}
// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────
function PulseDot({ on, size }) {
    return (_jsxs("span", { style: { position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }, children: [on && (_jsx("span", { style: {
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: C.success, opacity: 0.4,
                    animation: "sm-ping 1.4s ease infinite",
                } })), _jsx("span", { style: {
                    width: size, height: size, borderRadius: "50%", display: "block",
                    background: on ? C.success : C.textMuted,
                    boxShadow: on ? `0 0 5px ${C.success}` : "none",
                } })] }));
}
function StatCell({ label, value, accent }) {
    return (_jsxs("div", { style: {
            background: `${accent}12`, border: `1px solid ${accent}33`,
            borderRadius: 5, padding: "5px 8px",
        }, children: [_jsx("div", { style: { fontSize: 7, color: C.textMuted, fontFamily: "'Orbitron', monospace", letterSpacing: ".1em" }, children: label }), _jsx("div", { style: { fontSize: 14, fontWeight: 800, color: accent, fontFamily: "'Orbitron', monospace", marginTop: 2 }, children: value })] }));
}
function LabelRow({ label, value }) {
    return (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }, children: [_jsx("span", { style: labelSt, children: label }), _jsx("span", { style: { ...valueSt, textAlign: "right", maxWidth: "60%" }, children: value })] }));
}
function Keyframes() {
    return (_jsx("style", { children: `
      @keyframes sm-ping {
        0%   { transform: scale(1); opacity: .4; }
        100% { transform: scale(2.4); opacity: 0; }
      }
    ` }));
}
// ─────────────────────────────────────────────────────────────────────────
// Styles & helpers
// ─────────────────────────────────────────────────────────────────────────
const panelStyle = {
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${C.dimBorder}`,
    background: C.panelBg,
    margin: "6px 10px",
};
const labelSt = {
    fontSize: 7.5, color: C.textMuted,
    fontFamily: "'Orbitron', monospace",
    letterSpacing: ".14em", fontWeight: 700,
    textTransform: "uppercase", flexShrink: 0,
};
const valueSt = {
    fontSize: 8.5, color: C.textSec,
    fontFamily: "'Share Tech Mono', monospace",
};
function fmtTime(iso) {
    try {
        return new Date(iso).toLocaleTimeString("en-IN", {
            hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
    }
    catch {
        return iso;
    }
}
