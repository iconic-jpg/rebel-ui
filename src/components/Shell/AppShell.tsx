import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useThemeContext } from "../context/ThemeContext.js";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "⬡", section: "CORE" },
  { path: "/inventory", label: "Asset Inventory", icon: "◈", section: "ASSET & PQC" },
  { path: "/discovery", label: "Asset Discovery", icon: "◎", section: null },
  { path: "/cbom", label: "CBOM", icon: "◉", section: null },
  { path: "/pqc", label: "Posture of PQC", icon: "⬟", section: null },
  { path: "/pqc-readiness", label: "PQC Readiness", icon: "◐", section: null },
  { path: "/rating", label: "Cyber Rating", icon: "✦", section: "REPORTS" },
  { path: "/reporting", label: "Reporting", icon: "▣", section: null },
];

const SETTINGS_ITEMS = [
  { path: "/settings/assets", label: "Asset Registry", icon: "⚙" },
];

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useThemeContext();

  const isDark = theme === "dark";

  // 🎯 CLEAN TOKENS (no rgba fading)
  const labelActive = "var(--text-primary)";
  const labelInactive = "var(--text-dim)";
  const labelDim = "var(--text-faint)";
  const footerMuted = "var(--text-faint)";

  const sidebarBg = isDark
    ? "linear-gradient(180deg,#070c16 0%,#080c14 100%)"
    : "linear-gradient(180deg,#e8edf5 0%,#edf1f7 100%)";

  const sidebarBorder = isDark
    ? "rgba(59,130,246,0.25)"
    : "rgba(59,130,246,0.35)";

  const overlayBg = isDark
    ? "rgba(0,0,0,0.6)"
    : "rgba(0,0,0,0.3)";

  const hamburgerBg = isDark
    ? "rgba(8,12,20,0.95)"
    : "rgba(255,255,255,0.95)";

  const hamburgerBar = isDark
    ? "rgba(255,255,255,0.7)"
    : "rgba(30,60,120,0.8)";

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  function NavButton({
    path,
    label,
    icon,
    badge,
  }: {
    path: string;
    label: string;
    icon: string;
    badge?: React.ReactNode;
  }) {
    const active = isActive(path);

    return (
      <button
        onClick={() => go(path)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "9px 10px",
          background: active ? "rgba(59,130,246,0.15)" : "none",
          border: `1px solid ${
            active ? "rgba(59,130,246,0.35)" : "transparent"
          }`,
          borderRadius: 3,
          cursor: "pointer",
          textAlign: "left",
          transition: "all 0.15s",
          marginBottom: 1,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            flexShrink: 0,
            background: active
              ? "rgba(59,130,246,0.2)"
              : "rgba(59,130,246,0.08)",
            border: `1px solid ${
              active ? "rgba(59,130,246,0.4)" : "rgba(59,130,246,0.2)"
            }`,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Orbitron',monospace",
            fontSize: 13,
            color: active ? "#3b82f6" : "var(--text-dim)",
          }}
        >
          {icon}
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 11,
              color: active ? labelActive : labelInactive,
            }}
          >
            {label}
          </div>
        </div>

        {active && (
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#3b82f6",
              boxShadow: "0 0 6px #3b82f6",
            }}
          />
        )}

        {badge}
      </button>
    );
  }

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 198,
            background: overlayBg,
            backdropFilter: "blur(3px)",
          }}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          zIndex: 199,
          background: sidebarBg,
          borderRight: `1px solid ${sidebarBorder}`,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: 14 }}>
          <div
            style={{
              fontFamily: "'Orbitron',monospace",
              fontWeight: 900,
              fontSize: 14,
              color: "var(--text-primary)",
              letterSpacing: ".2em",
            }}
          >
            REBEL
          </div>
          <div
            style={{
              fontSize: 8,
              color: labelDim,
              letterSpacing: ".15em",
            }}
          >
            THREAT INTELLIGENCE
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: 10 }}>
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.path}
              path={item.path}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </nav>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          style={{
            margin: 10,
            padding: 10,
            borderRadius: 4,
            border: "1px solid rgba(59,130,246,0.3)",
            background: "transparent",
            color: "var(--text-primary)",
          }}
        >
          Toggle Theme
        </button>

        {/* Footer */}
        <div
          style={{
            padding: 10,
            fontSize: 10,
            color: footerMuted,
          }}
        >
          r3bel-production.up.railway.app
        </div>
      </div>

      {/* Hamburger */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          top: 10,
          left: 10,
          zIndex: 200,
          background: hamburgerBg,
          border: "1px solid rgba(59,130,246,0.3)",
          width: 36,
          height: 36,
        }}
      >
        ☰
      </button>

      <Outlet />
    </>
  );
}