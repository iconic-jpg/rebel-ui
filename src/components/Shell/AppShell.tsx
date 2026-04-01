import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useThemeContext } from '../context/ThemeContext.js'

const NAV_ITEMS = [
  { path: "/",              label: "Dashboard",      icon: "⬡", section: "CORE"        },
  { path: "/inventory",     label: "Asset Inventory",icon: "◈", section: "ASSET & PQC" },
  { path: "/discovery",     label: "Asset Discovery",icon: "◎", section: null          },
  { path: "/cbom",          label: "CBOM",           icon: "◉", section: null          },
  { path: "/pqc",           label: "Posture of PQC", icon: "⬟", section: null          },
  { path: "/pqc-readiness", label: "PQC Readiness",  icon: "◐", section: null          },
  { path: "/rating",        label: "Cyber Rating",   icon: "✦", section: "REPORTS"     },
  { path: "/reporting",     label: "Reporting",      icon: "▣", section: null          },
];

const SETTINGS_ITEMS = [
  { path: "/settings/assets", label: "Asset Registry", icon: "⚙" },
];

export default function AppShell() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useThemeContext()


  const isDark = theme === "dark";

  // ── resolved CSS token values for inline styles ──────────────────────────
  const sidebarBg      = isDark ? "linear-gradient(180deg,#070c16 0%,#080c14 100%)"
                                : "linear-gradient(180deg,#e8edf5 0%,#edf1f7 100%)";
  const sidebarBorder  = isDark ? "rgba(59,130,246,0.14)" : "rgba(59,130,246,0.28)";
  const overlayBg      = isDark ? "rgba(0,0,0,0.55)"      : "rgba(0,0,0,0.3)";
  const hamburgerBg    = isDark ? "rgba(8,12,20,0.9)"      : "rgba(240,244,248,0.95)";
  const hamburgerBar   = isDark ? "rgba(200,220,255,0.5)"  : "rgba(30,60,120,0.6)";
  const labelDim       = isDark ? "rgba(200,220,255,0.18)" : "rgba(30,60,120,0.3)";
  const labelActive    = isDark ? "rgba(200,220,255,0.9)"  : "rgba(20,40,100,0.9)";
  const labelInactive  = isDark ? "rgba(200,220,255,0.5)"  : "rgba(30,60,120,0.5)";
  const footerMuted    = isDark ? "rgba(200,220,255,0.14)" : "rgba(30,60,120,0.35)";

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const go = (path: string) => { navigate(path); setOpen(false); };

  function NavButton({ path, label, icon, badge }: {
    path: string; label: string; icon: string; badge?: React.ReactNode;
  }) {
    const active = isActive(path);
    return (
      <button
        onClick={() => go(path)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "9px 10px",
          background: active ? "rgba(59,130,246,0.1)" : "none",
          border: `1px solid ${active ? "rgba(59,130,246,0.22)" : "transparent"}`,
          borderRadius: 3, cursor: "pointer", textAlign: "left",
          transition: "all 0.15s", marginBottom: 1,
        }}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.07)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(59,130,246,0.14)";
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
          }
        }}
      >
        <div style={{
          width: 32, height: 32, flexShrink: 0,
          background: active ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.06)",
          border: `1px solid ${active ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.12)"}`,
          borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Orbitron',monospace", fontSize: 13,
          color: active ? "#3b82f6" : "rgba(59,130,246,0.5)",
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Share Tech Mono',monospace", fontSize: 11,
            color: active ? labelActive : labelInactive,
            lineHeight: 1,
          }}>
            {label}
          </div>
        </div>
        {active && (
          <span style={{
            width: 4, height: 4, borderRadius: "50%",
            background: "#3b82f6", boxShadow: "0 0 6px #3b82f6", flexShrink: 0,
          }} />
        )}
        {badge}
      </button>
    );
  }

  return (
    <>
      <style>{`
        @keyframes ping { 75%,100%{transform:scale(2.2);opacity:0} }
        @keyframes scanline { 0%{top:-2px}100%{top:100%} }
      `}</style>

      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 198,
          background: overlayBg,
          backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
        }} />
      )}

      {/* ── Sidebar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 260, zIndex: 199,
        background: sidebarBg,
        borderRight: `1px solid ${sidebarBorder}`,
        boxShadow: open ? "12px 0 60px rgba(0,0,0,0.7)" : "none",
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}>

        {/* Header */}
        <div style={{
          padding: "15px 14px 13px",
          borderBottom: `1px solid ${isDark ? "rgba(59,130,246,0.09)" : "rgba(59,130,246,0.15)"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 28 28">
              <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none"
                stroke="#3b82f6" strokeWidth="1.5"
                style={{ filter: "drop-shadow(0 0 4px #3b82f6)" }} />
              <polygon points="14,7 21,11 21,17 14,21 7,17 7,11"
                fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
              <circle cx="14" cy="14" r="3" fill="#3b82f6"
                style={{ filter: "drop-shadow(0 0 5px #3b82f6)" }} />
            </svg>
            <div>
              <div style={{
                fontFamily: "'Orbitron',monospace", fontWeight: 900,
                fontSize: 14, color: isDark ? "#fff" : "#0f1e3d", letterSpacing: ".22em",
              }}>REBEL</div>
              <div style={{
                fontSize: 7, color: labelDim,
                letterSpacing: ".14em", fontFamily: "'Orbitron',monospace", marginTop: 1,
              }}>
                THREAT INTELLIGENCE
              </div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{
            background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)",
            borderRadius: 2, color: "rgba(200,220,255,0.35)", cursor: "pointer",
            width: 26, height: 26, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 13, flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Main nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
          {NAV_ITEMS.map(item => (
            <React.Fragment key={item.path}>
              {item.section && (
                <div style={{
                  fontSize: 7, color: labelDim,
                  letterSpacing: ".2em", fontFamily: "'Orbitron',monospace",
                  padding: "10px 8px 5px",
                }}>
                  {item.section}
                </div>
              )}
              <NavButton
                path={item.path}
                label={item.label}
                icon={item.icon}
                badge={
                  item.path === "/pqc-readiness" && !isActive(item.path) ? (
                    <span style={{
                      fontSize: 7, color: "#22c55e",
                      border: "1px solid rgba(34,197,94,0.4)",
                      borderRadius: 2, padding: "1px 4px",
                      fontFamily: "'Orbitron',monospace",
                      letterSpacing: ".08em", flexShrink: 0,
                    }}>NEW</span>
                  ) : undefined
                }
              />
            </React.Fragment>
          ))}
        </nav>

        {/* Settings — pinned, never scrolls */}
        <div style={{
          padding: "4px 10px 2px",
          borderTop: `1px solid ${isDark ? "rgba(59,130,246,0.07)" : "rgba(59,130,246,0.12)"}`,
        }}>
          <div style={{
            fontSize: 7, color: labelDim,
            letterSpacing: ".2em", fontFamily: "'Orbitron',monospace",
            padding: "7px 8px 4px",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <span style={{ fontSize: 8, opacity: .5 }}>⚙</span>
            SETTINGS
          </div>

          {SETTINGS_ITEMS.map(item => (
            <NavButton key={item.path} path={item.path}
              label={item.label} icon={item.icon} />
          ))}

          {/* ── Theme Toggle ── */}
          <button
            onClick={toggle}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "9px 10px",
              background: "none",
              border: "1px solid transparent",
              borderRadius: 3, cursor: "pointer", textAlign: "left",
              transition: "all 0.15s", marginBottom: 1,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.07)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(59,130,246,0.14)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "none";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
            }}
          >
            <div style={{
              width: 32, height: 32, flexShrink: 0,
              background: "rgba(59,130,246,0.06)",
              border: "1px solid rgba(59,130,246,0.12)",
              borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15,
            }}>
              {isDark ? "☀️" : "🌙"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Share Tech Mono',monospace", fontSize: 11,
                color: labelInactive, lineHeight: 1,
              }}>
                {isDark ? "Light Mode" : "Dark Mode"}
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 14px 12px",
          borderTop: `1px solid ${isDark ? "rgba(59,130,246,0.07)" : "rgba(59,130,246,0.12)"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
            <span style={{ position: "relative", display: "inline-flex", width: 7, height: 7 }}>
              <span style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "#22c55e", opacity: .5, animation: "ping 1.4s ease infinite",
              }} />
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#22c55e", boxShadow: "0 0 4px #22c55e", display: "block",
              }} />
            </span>
            <span style={{
              fontSize: 7.5, fontFamily: "'Orbitron',monospace",
              color: "#22c55e", letterSpacing: ".12em",
            }}>LIVE · CONNECTED</span>
          </div>
          <div style={{
            fontSize: 7.5, color: footerMuted,
            fontFamily: "'Share Tech Mono',monospace",
          }}>
            r3bel-production.up.railway.app
          </div>
        </div>
      </div>

      {/* ── Hamburger ── */}
      <div style={{ minHeight: "100vh" }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            position: "fixed", top: 12, left: 14, zIndex: 197,
            background: hamburgerBg,
            border: `1px solid ${isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.35)"}`,
            borderRadius: 3, cursor: "pointer", width: 36, height: 36,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 5,
            backdropFilter: "blur(8px)",
          }}
        >
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              display: "block", width: 14, height: 1.5, borderRadius: 2,
              background: open ? "#3b82f6" : hamburgerBar,
              transform: open
                ? i === 0 ? "translateY(6.5px) rotate(45deg)"
                : i === 2 ? "translateY(-6.5px) rotate(-45deg)"
                : "scaleX(0)"
                : "none",
              opacity: open && i === 1 ? 0 : 1,
              transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
            }} />
          ))}
        </button>
        <Outlet />
      </div>
    </>
  );
}