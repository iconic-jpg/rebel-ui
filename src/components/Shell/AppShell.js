import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useThemeContext } from "../context/ThemeContext.js";
import SecureModePanel, { SecureModeBadge } from "../Modules/SecureModePanel.js";
const NAV_ITEMS = [
    { path: "/", label: "Dashboard", icon: "⬡", section: "CORE" },
    { path: "/inventory", label: "Asset Inventory", icon: "◈", section: "ASSET & PQC" },
    { path: "/discovery", label: "Asset Discovery", icon: "◎", section: null },
    { path: "/cbom", label: "CBOM", icon: "◉", section: null },
    { path: "/registry", label: "Asset Registry", icon: "▦", section: null },
    { path: "/pqc", label: "Posture of PQC", icon: "⬟", section: null },
    { path: "/pqc-readiness", label: "PQC Readiness", icon: "◐", section: null },
    { path: "/rating", label: "Cyber Rating", icon: "✦", section: "REPORTS" },
    { path: "/reporting", label: "Reporting", icon: "▣", section: null },
];
const L = {
    accent: "#0ea5e9",
    accentDark: "#0284c7",
    accentDim: "rgba(14,165,233,0.1)",
    accentBorder: "rgba(14,165,233,0.28)",
    text: "#050d1a",
    textSec: "#1e293b",
    textDim: "#334155",
    textMuted: "#475569",
    textFaint: "#64748b",
    divider: "rgba(14,165,233,0.12)",
    panelBg: "#ffffff",
    pageBg: "#f1f5f9",
    success: "#16a34a",
};
export default function AppShell() {
    const location = useLocation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const { toggle } = useThemeContext();
    // If you have a JWT in context/localStorage, thread it through here.
    // Leave undefined if your API is open.
    const jwtToken = undefined;
    const isActive = (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
    const go = (path) => {
        navigate(path);
        setOpen(false);
    };
    const sections = [];
    let currentSection = null;
    for (const item of NAV_ITEMS) {
        if (item.section !== null) {
            currentSection = { title: item.section, items: [item] };
            sections.push(currentSection);
        }
        else if (currentSection) {
            currentSection.items.push(item);
        }
    }
    function NavButton({ path, label, icon }) {
        const active = isActive(path);
        return (_jsxs("button", { onClick: () => go(path), style: {
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "9px 10px",
                background: active ? "rgba(14,165,233,0.1)" : "none",
                border: `1px solid ${active ? L.accentBorder : "transparent"}`,
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
                marginBottom: 2,
            }, onMouseEnter: e => {
                if (!active) {
                    e.currentTarget.style.background = "rgba(14,165,233,0.06)";
                    e.currentTarget.style.borderColor = "rgba(14,165,233,0.18)";
                }
            }, onMouseLeave: e => {
                if (!active) {
                    e.currentTarget.style.background = "none";
                    e.currentTarget.style.borderColor = "transparent";
                }
            }, children: [_jsx("div", { style: {
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        background: active ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.07)",
                        border: `1px solid ${active ? L.accentBorder : "rgba(14,165,233,0.18)"}`,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Orbitron',monospace",
                        fontSize: 13,
                        color: active ? L.accent : L.textDim,
                        transition: "all 0.15s",
                    }, children: icon }), _jsx("div", { style: { flex: 1 }, children: _jsx("div", { style: {
                            fontFamily: "'Share Tech Mono',monospace",
                            fontSize: 11,
                            fontWeight: active ? 700 : 500,
                            color: active ? L.text : L.textSec,
                            letterSpacing: "0.02em",
                        }, children: label }) }), active && (_jsx("span", { style: {
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: L.accent,
                        boxShadow: `0 0 6px ${L.accent}`,
                        flexShrink: 0,
                    } }))] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.2); border-radius: 2px; }
        ::-webkit-scrollbar-track { background: transparent; }
        button { -webkit-tap-highlight-color: transparent; }
        @keyframes ping {
          0%   { transform: scale(1); opacity: .4; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      ` }), open && (_jsx("div", { onClick: () => setOpen(false), style: {
                    position: "fixed",
                    inset: 0,
                    zIndex: 198,
                    background: "rgba(5,13,26,0.35)",
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                } })), _jsxs("div", { style: {
                    position: "fixed",
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: 264,
                    zIndex: 199,
                    background: L.panelBg,
                    borderRight: `1px solid ${L.divider}`,
                    boxShadow: open ? "16px 0 60px rgba(0,0,0,0.1)" : "none",
                    transform: open ? "translateX(0)" : "translateX(-100%)",
                    transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }, children: [_jsxs("div", { style: {
                            padding: "18px 16px 14px",
                            borderBottom: `1px solid ${L.divider}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexShrink: 0,
                        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsxs("svg", { width: "22", height: "22", viewBox: "0 0 28 28", children: [_jsx("polygon", { points: "14,2 26,8 26,20 14,26 2,20 2,8", fill: "none", stroke: L.accent, strokeWidth: "1.5", style: { filter: `drop-shadow(0 0 3px ${L.accent}88)` } }), _jsx("polygon", { points: "14,7 21,11 21,17 14,21 7,17 7,11", fill: "rgba(14,165,233,0.1)", stroke: "rgba(14,165,233,0.3)", strokeWidth: "1" }), _jsx("circle", { cx: "14", cy: "14", r: "3", fill: L.accent, style: { filter: `drop-shadow(0 0 4px ${L.accent})` } })] }), _jsxs("div", { children: [_jsx("div", { style: {
                                                    fontFamily: "'Orbitron',monospace",
                                                    fontWeight: 900,
                                                    fontSize: 15,
                                                    color: L.text,
                                                    letterSpacing: ".22em",
                                                    lineHeight: 1,
                                                }, children: "REBEL" }), _jsx("div", { style: {
                                                    fontSize: 7.5,
                                                    color: L.textMuted,
                                                    letterSpacing: ".14em",
                                                    fontFamily: "'Orbitron',monospace",
                                                    marginTop: 3,
                                                    fontWeight: 600,
                                                }, children: "THREAT INTELLIGENCE" })] })] }), _jsx("button", { onClick: () => setOpen(false), style: {
                                    background: L.accentDim,
                                    border: `1px solid ${L.accentBorder}`,
                                    borderRadius: 6,
                                    color: L.textDim,
                                    cursor: "pointer",
                                    width: 28,
                                    height: 28,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    transition: "all 0.15s",
                                }, children: "\u2715" })] }), _jsx("nav", { style: { flex: 1, overflowY: "auto", padding: "10px 10px 6px" }, children: sections.map((section) => (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("div", { style: {
                                        fontSize: 7.5,
                                        color: L.textMuted,
                                        letterSpacing: ".2em",
                                        fontFamily: "'Orbitron',monospace",
                                        fontWeight: 700,
                                        padding: "10px 8px 5px",
                                        textTransform: "uppercase",
                                    }, children: section.title }), section.items.map((item) => (_jsx(NavButton, { path: item.path, label: item.label, icon: item.icon }, item.path)))] }, section.title))) }), _jsx("div", { style: { borderTop: `1px solid ${L.divider}` }, children: _jsx(SecureModePanel, { token: jwtToken }) }), _jsx("div", { style: { padding: "8px 10px", borderTop: `1px solid ${L.divider}` }, children: _jsxs("button", { onClick: toggle, style: {
                                width: "100%",
                                padding: "9px 12px",
                                borderRadius: 6,
                                border: `1px solid ${L.accentBorder}`,
                                background: L.accentDim,
                                color: L.textSec,
                                fontFamily: "'Orbitron',monospace",
                                fontSize: 8.5,
                                letterSpacing: "0.14em",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 7,
                                transition: "all 0.15s",
                            }, children: [_jsx("span", { style: { fontSize: 12 }, children: "\u2600" }), "TOGGLE THEME"] }) }), _jsxs("div", { style: {
                            padding: "10px 14px 14px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 7 }, children: [_jsxs("span", { style: { position: "relative", display: "inline-flex", width: 7, height: 7, flexShrink: 0 }, children: [_jsx("span", { style: { position: "absolute", inset: 0, borderRadius: "50%", background: L.success, opacity: 0.4, animation: "ping 1.4s ease infinite" } }), _jsx("span", { style: { width: 7, height: 7, borderRadius: "50%", background: L.success, display: "block", boxShadow: `0 0 4px ${L.success}` } })] }), _jsx("span", { style: {
                                            fontSize: 7.5,
                                            fontFamily: "'Orbitron',monospace",
                                            color: L.success,
                                            letterSpacing: ".12em",
                                            fontWeight: 700,
                                        }, children: "LIVE \u00B7 CONNECTED" })] }), _jsx("div", { style: {
                                    fontSize: 8,
                                    color: L.textMuted,
                                    fontFamily: "'Share Tech Mono',monospace",
                                    fontWeight: 500,
                                }, children: "r3bel-production.up.railway.app" })] })] }), _jsx("button", { onClick: () => setOpen((o) => !o), style: {
                    position: "fixed",
                    top: 9,
                    left: 10,
                    zIndex: 200,
                    background: "rgba(255,255,255,0.95)",
                    border: `1px solid ${L.accentBorder}`,
                    borderRadius: 7,
                    width: 36,
                    height: 36,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4.5,
                    cursor: "pointer",
                    boxShadow: "0 1px 6px rgba(14,165,233,0.12)",
                    backdropFilter: "blur(8px)",
                    transition: "box-shadow 0.2s",
                }, children: [0, 1, 2].map((i) => (_jsx("span", { style: {
                        display: "block",
                        width: 16,
                        height: 1.5,
                        borderRadius: 2,
                        background: open ? L.accent : L.textDim,
                        transform: open
                            ? i === 0 ? "translateY(6px) rotate(45deg)"
                                : i === 2 ? "translateY(-6px) rotate(-45deg)"
                                    : "scaleX(0)"
                            : "none",
                        opacity: open && i === 1 ? 0 : 1,
                        transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
                    } }, i))) }), _jsx("div", { style: {
                    position: "fixed",
                    top: 14,
                    right: 16,
                    zIndex: 200,
                }, children: _jsx(SecureModeBadge, { token: jwtToken }) }), _jsx(Outlet, {})] }));
}
