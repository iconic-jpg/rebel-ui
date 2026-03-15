import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

// ── Shared styles matching existing REBEL aesthetic ──────────────────────────
const S: Record<string, React.CSSProperties> = {
  shell:    { display: "flex", minHeight: "100vh", background: "#080c14", fontFamily: "'Share Tech Mono', monospace" },
  sidebar:  { width: 220, background: "rgba(6,10,18,0.98)", borderRight: "1px solid rgba(59,130,246,0.09)", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", zIndex: 90 },
  sideTop:  { padding: "16px 14px 12px", borderBottom: "1px solid rgba(59,130,246,0.09)" },
  logoRow:  { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 },
  logoTxt:  { fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 15, color: "#fff", letterSpacing: "0.22em" },
  subTxt:   { fontSize: 7, color: "rgba(200,220,255,0.2)", letterSpacing: "0.12em", fontFamily: "'Orbitron', monospace" },
  nav:      { flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" },
  section:  { fontSize: 7, color: "rgba(200,220,255,0.2)", letterSpacing: "0.18em", fontFamily: "'Orbitron', monospace", padding: "10px 8px 4px" },
  navItem:  { display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 3, cursor: "pointer", transition: "all 0.18s", border: "1px solid transparent", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(200,220,255,0.5)", background: "none", width: "100%", textAlign: "left" },
  navActive:{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.22)", color: "rgba(200,220,255,0.9)" },
  navIcon:  { fontFamily: "'Orbitron', monospace", fontSize: 11, width: 16, textAlign: "center", flexShrink: 0 },
  dot:      { width: 5, height: 5, borderRadius: "50%", flexShrink: 0 },
  sideBot:  { padding: "12px 14px", borderTop: "1px solid rgba(59,130,246,0.07)" },
  liveRow:  { display: "flex", alignItems: "center", gap: 6 },
  liveTxt:  { fontSize: 7.5, fontFamily: "'Orbitron', monospace", color: "#22c55e", letterSpacing: "0.1em" },
  main:     { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  topNav:   { height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: "1px solid rgba(59,130,246,0.09)", background: "rgba(8,12,20,0.97)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 80 },
  breadcrumb:{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "rgba(200,220,255,0.35)", letterSpacing: "0.14em" },
  topRight: { display: "flex", alignItems: "center", gap: 8 },
  btn:      { background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.28)", borderRadius: 3, color: "#3b82f6", cursor: "pointer", padding: "5px 12px", fontFamily: "'Orbitron', monospace", fontSize: 8, letterSpacing: "0.12em" },
};

const NAV_ITEMS = [
  { path: "/",          label: "Dashboard",       icon: "⬡", section: "CORE" },
  { path: "/inventory", label: "Asset Inventory", icon: "◈", section: null },
  { path: "/discovery", label: "Asset Discovery", icon: "◎", section: null },
  { path: "/cbom",      label: "CBOM",            icon: "◉", section: null },
  { path: "/pqc",       label: "Posture of PQC",  icon: "⬟", section: null },
];

const BOTTOM_ITEMS = [
  { path: "/cyber-rating", label: "Cyber Rating", icon: "✦" },
  { path: "/reporting",    label: "Reporting",    icon: "▣" },
];

function Pulse({ color = "#22c55e" }: { color?: string }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 7, height: 7, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.5,
        animation: "ping 1.4s ease infinite" }} />
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "block",
        boxShadow: `0 0 4px ${color}` }} />
    </span>
  );
}

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const currentLabel = [...NAV_ITEMS, ...BOTTOM_ITEMS].find(i => isActive(i.path))?.label ?? "Dashboard";

  return (
    <div style={S.shell}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        @keyframes ping { 75%,100%{transform:scale(2.2);opacity:0} }
        @keyframes scanline { 0%{top:-2px}100%{top:100%} }
        .nav-item:hover { background:rgba(59,130,246,0.06)!important; color:rgba(200,220,255,0.75)!important; }
        ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.25);}
      `}</style>

      {/* SCANLINE */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.07),transparent)",
          animation: "scanline 10s linear infinite" }} />
      </div>

      {/* ── SIDEBAR ── */}
      {!collapsed && (
        <aside style={S.sidebar}>
          {/* Logo */}
          <div style={S.sideTop}>
            <div style={S.logoRow}>
              <svg width="20" height="20" viewBox="0 0 28 28">
                <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#3b82f6" strokeWidth="1.5"
                  style={{ filter: "drop-shadow(0 0 4px #3b82f6)" }} />
                <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill="rgba(59,130,246,0.1)"
                  stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
                <circle cx="14" cy="14" r="3" fill="#3b82f6" style={{ filter: "drop-shadow(0 0 5px #3b82f6)" }} />
              </svg>
              <span style={S.logoTxt}>REBEL</span>
            </div>
            <div style={S.subTxt}>THREAT INTELLIGENCE</div>
          </div>

          {/* Nav */}
          <nav style={S.nav}>
            {NAV_ITEMS.map((item, i) => (
              <React.Fragment key={item.path}>
                {item.section && <div style={S.section}>{item.section}</div>}
                {i === 1 && <div style={S.section}>ASSET & PQC</div>}
                <button
                  className="nav-item"
                  style={{ ...S.navItem, ...(isActive(item.path) ? S.navActive : {}) }}
                  onClick={() => navigate(item.path)}
                >
                  <span style={{ ...S.navIcon, color: isActive(item.path) ? "#3b82f6" : "rgba(200,220,255,0.28)" }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isActive(item.path) && (
                    <span style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%",
                      background: "#3b82f6", boxShadow: "0 0 6px #3b82f6" }} />
                  )}
                </button>
              </React.Fragment>
            ))}

            <div style={S.section}>REPORTS</div>
            {BOTTOM_ITEMS.map(item => (
              <button key={item.path} className="nav-item"
                style={{ ...S.navItem, ...(isActive(item.path) ? S.navActive : {}) }}
                onClick={() => navigate(item.path)}
              >
                <span style={{ ...S.navIcon, color: isActive(item.path) ? "#3b82f6" : "rgba(200,220,255,0.28)" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Bottom status */}
          <div style={S.sideBot}>
            <div style={S.liveRow}>
              <Pulse />
              <span style={S.liveTxt}>LIVE · CONNECTED</span>
            </div>
            <div style={{ fontSize: 7.5, color: "rgba(200,220,255,0.18)", marginTop: 5, fontFamily: "'Share Tech Mono', monospace" }}>
              r3bel-production.up.railway.app
            </div>
          </div>
        </aside>
      )}

      {/* ── MAIN ── */}
      <div style={S.main}>
        {/* Top bar */}
        <div style={S.topNav}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setCollapsed(c => !c)}
              style={{ background: "none", border: "none", color: "rgba(200,220,255,0.3)", cursor: "pointer", fontSize: 16, padding: 4 }}>
              ☰
            </button>
            <span style={S.breadcrumb}>REBEL / {currentLabel.toUpperCase()}</span>
          </div>
          <div style={S.topRight}>
            <button style={S.btn} onClick={() => navigate("/")}>⬡ DASHBOARD</button>
          </div>
        </div>

        {/* Page content */}
        <Outlet />
      </div>
    </div>
  );
}
