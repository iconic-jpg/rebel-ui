/**
 * VCenterConnect.jsx
 * Rebel Platform — vCenter Infrastructure Connection
 *
 * Matches AppShell aesthetic exactly:
 *   - Orbitron + Share Tech Mono fonts
 *   - L.accent (#0ea5e9) color system
 *   - Same panel/card/button/badge patterns as AppShell
 *   - pageBg (#f1f5f9), panelBg (#fff), divider tokens
 *
 * Install:
 *   1. Copy to src/components/Modules/VCenterConnect.js
 *
 *   2. In App.js add:
 *      import VCenterConnect from "./components/Modules/VCenterConnect.js";
 *      <Route path="vcenter" element={<VCenterConnect apiBase={API_BASE} />} />
 *
 *   3. In AppShell.js NAV_ITEMS add (under ASSET & PQC section):
 *      { path: "/vcenter", label: "vCenter", icon: "⬡", section: null }
 */

import React, { useState, useCallback } from "react";

// ── Design tokens — exact mirror of AppShell L object ─────────────────────────
const L = {
  accent:        "#0ea5e9",
  accentDark:    "#0284c7",
  accentDim:     "rgba(14,165,233,0.1)",
  accentBorder:  "rgba(14,165,233,0.28)",
  text:          "#050d1a",
  textSec:       "#1e293b",
  textDim:       "#334155",
  textMuted:     "#475569",
  textFaint:     "#64748b",
  divider:       "rgba(14,165,233,0.12)",
  panelBg:       "#ffffff",
  pageBg:        "#f1f5f9",
  success:       "#16a34a",
  successDim:    "rgba(22,163,74,0.1)",
  successBorder: "rgba(22,163,74,0.28)",
  danger:        "#dc2626",
  dangerDim:     "rgba(220,38,38,0.08)",
  dangerBorder:  "rgba(220,38,38,0.28)",
  warn:          "#d97706",
  warnDim:       "rgba(217,119,6,0.08)",
  warnBorder:    "rgba(217,119,6,0.28)",
};
const FO = "'Orbitron', monospace";   // headings / labels
const FM = "'Share Tech Mono', monospace"; // body / code

// ── Demo dataset (mirrors DEMO_VMS in vmware_connector.py exactly) ─────────────
const DEMO = {
  virtual_machines: [
    { name:"prod-web-01",      ip:"10.10.1.11",  os:"Ubuntu 22.04 LTS",    cluster:"PROD-CLUSTER-A", datacenter:"DC-MUMBAI",   power_state:"poweredOn"  },
    { name:"prod-web-02",      ip:"10.10.1.12",  os:"Ubuntu 22.04 LTS",    cluster:"PROD-CLUSTER-A", datacenter:"DC-MUMBAI",   power_state:"poweredOn"  },
    { name:"prod-db-primary",  ip:"10.10.2.10",  os:"RHEL 8.6",            cluster:"PROD-CLUSTER-B", datacenter:"DC-MUMBAI",   power_state:"poweredOn"  },
    { name:"prod-db-replica",  ip:"10.10.2.11",  os:"RHEL 8.6",            cluster:"PROD-CLUSTER-B", datacenter:"DC-MUMBAI",   power_state:"poweredOn"  },
    { name:"prod-api-gateway", ip:"10.10.1.20",  os:"Ubuntu 22.04 LTS",    cluster:"PROD-CLUSTER-A", datacenter:"DC-MUMBAI",   power_state:"poweredOn"  },
    { name:"prod-mq-01",       ip:"10.10.3.5",   os:"Ubuntu 20.04 LTS",    cluster:"PROD-CLUSTER-C", datacenter:"DC-MUMBAI",   power_state:"poweredOn"  },
    { name:"prod-hsm-01",      ip:"10.10.5.2",   os:"RHEL 8.6",            cluster:"PROD-CLUSTER-B", datacenter:"DC-MUMBAI",   power_state:"poweredOn"  },
    { name:"int-devtools-01",  ip:"192.168.1.5", os:"Windows Server 2019", cluster:"INT-CLUSTER-A",  datacenter:"DC-INTERNAL", power_state:"poweredOn"  },
    { name:"int-monitor-01",   ip:"192.168.1.8", os:"Ubuntu 22.04 LTS",    cluster:"INT-CLUSTER-A",  datacenter:"DC-INTERNAL", power_state:"poweredOn"  },
    { name:"int-jenkins-01",   ip:"192.168.2.3", os:"Ubuntu 20.04 LTS",    cluster:"INT-CLUSTER-B",  datacenter:"DC-INTERNAL", power_state:"poweredOn"  },
    { name:"int-backup-01",    ip:"192.168.3.1", os:"RHEL 8.6",            cluster:"INT-CLUSTER-B",  datacenter:"DC-INTERNAL", power_state:"poweredOn"  },
    { name:"dr-web-01",        ip:"10.20.1.11",  os:"Ubuntu 22.04 LTS",    cluster:"DR-CLUSTER-A",   datacenter:"DC-DR",       power_state:"poweredOn"  },
    { name:"dr-db-01",         ip:"10.20.2.10",  os:"RHEL 8.6",            cluster:"DR-CLUSTER-A",   datacenter:"DC-DR",       power_state:"poweredOn"  },
    { name:"decom-legacy-01",  ip:null,          os:"Windows Server 2012", cluster:"INT-CLUSTER-A",  datacenter:"DC-INTERNAL", power_state:"poweredOff" },
    { name:"test-sandbox-01",  ip:"192.168.9.1", os:"Ubuntu 22.04 LTS",    cluster:"INT-CLUSTER-B",  datacenter:"DC-INTERNAL", power_state:"poweredOn"  },
  ],
  datastores: [
    { name:"DS-PROD-SAN-01",     type:"VMFS", capacity_gb:10240, free_gb:3200, accessible:true },
    { name:"DS-PROD-SAN-02",     type:"VMFS", capacity_gb:10240, free_gb:4100, accessible:true },
    { name:"DS-DR-NFS-01",       type:"NFS",  capacity_gb:5120,  free_gb:1800, accessible:true },
    { name:"DS-INTERNAL-SAN-01", type:"VMFS", capacity_gb:2048,  free_gb:900,  accessible:true },
  ],
  clusters: [
    { name:"PROD-CLUSTER-A", num_hosts:4, total_cpu_mhz:96000, total_mem_mb:524288, ha_enabled:true,  drs_enabled:true  },
    { name:"PROD-CLUSTER-B", num_hosts:4, total_cpu_mhz:96000, total_mem_mb:524288, ha_enabled:true,  drs_enabled:true  },
    { name:"PROD-CLUSTER-C", num_hosts:2, total_cpu_mhz:48000, total_mem_mb:262144, ha_enabled:true,  drs_enabled:false },
    { name:"DR-CLUSTER-A",   num_hosts:2, total_cpu_mhz:48000, total_mem_mb:262144, ha_enabled:true,  drs_enabled:false },
    { name:"INT-CLUSTER-A",  num_hosts:2, total_cpu_mhz:32000, total_mem_mb:131072, ha_enabled:false, drs_enabled:false },
    { name:"INT-CLUSTER-B",  num_hosts:2, total_cpu_mhz:32000, total_mem_mb:131072, ha_enabled:false, drs_enabled:false },
  ],
  networks: [
    { name:"PROD-VLAN-10",  type:"DistributedVirtualPortgroup", num_vms:5, accessible:true },
    { name:"PROD-VLAN-20",  type:"DistributedVirtualPortgroup", num_vms:3, accessible:true },
    { name:"DR-VLAN-10",    type:"DistributedVirtualPortgroup", num_vms:2, accessible:true },
    { name:"INTERNAL-MGMT", type:"Network",                     num_vms:5, accessible:true },
    { name:"INTERNAL-DEV",  type:"Network",                     num_vms:3, accessible:true },
  ],
};

// ── Primitive components ───────────────────────────────────────────────────────

function OLabel({ children }) {
  return (
    <div style={{ fontFamily:FO, fontSize:7.5, fontWeight:700, color:L.textMuted,
      letterSpacing:".2em", textTransform:"uppercase", padding:"10px 0 6px" }}>
      {children}
    </div>
  );
}

function Badge({ label, variant="neutral" }) {
  const v = {
    neutral: { bg:L.accentDim,    bd:L.accentBorder,    c:L.accent   },
    success: { bg:L.successDim,   bd:L.successBorder,   c:L.success  },
    danger:  { bg:L.dangerDim,    bd:L.dangerBorder,    c:L.danger   },
    warn:    { bg:L.warnDim,      bd:L.warnBorder,      c:L.warn     },
    ghost:   { bg:"rgba(99,102,241,0.08)", bd:"rgba(99,102,241,0.28)", c:"#6366f1" },
  }[variant] || { bg:L.accentDim, bd:L.accentBorder, c:L.accent };
  return (
    <span style={{
      display:"inline-flex", alignItems:"center",
      padding:"2px 8px", borderRadius:4,
      background:v.bg, border:`1px solid ${v.bd}`, color:v.c,
      fontFamily:FO, fontSize:7, fontWeight:700, letterSpacing:".16em",
    }}>
      {label}
    </span>
  );
}

function Metric({ label, value, sub }) {
  return (
    <div style={{ flex:1, minWidth:0, background:L.accentDim,
      border:`1px solid ${L.accentBorder}`, borderRadius:8, padding:"12px 14px" }}>
      <div style={{ fontFamily:FO, fontSize:7, color:L.textMuted, letterSpacing:".16em", fontWeight:700, marginBottom:6 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontFamily:FO, fontSize:20, fontWeight:700, color:L.text, lineHeight:1 }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily:FM, fontSize:10, color:L.textFaint, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function IBox({ icon, active }) {
  return (
    <div style={{
      width:32, height:32, flexShrink:0,
      background: active ? "rgba(14,165,233,0.15)" : L.accentDim,
      border:`1px solid ${active ? L.accentBorder : "rgba(14,165,233,0.18)"}`,
      borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:FO, fontSize:14, color: active ? L.accent : L.textDim,
    }}>{icon}</div>
  );
}

function PingDot({ color=L.success }) {
  return (
    <span style={{ position:"relative", display:"inline-flex", width:8, height:8, flexShrink:0 }}>
      <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:color,
        opacity:0.4, animation:"ping 1.4s ease infinite" }} />
      <span style={{ width:8, height:8, borderRadius:"50%", background:color,
        display:"block", boxShadow:`0 0 4px ${color}` }} />
    </span>
  );
}

function RInput({ label, type="text", value, onChange, placeholder, disabled }) {
  return (
    <div>
      <div style={{ fontFamily:FO, fontSize:7.5, fontWeight:700, color:L.textMuted,
        letterSpacing:".16em", textTransform:"uppercase", marginBottom:5 }}>
        {label}
      </div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled} autoComplete="off"
        style={{
          width:"100%", padding:"8px 10px", fontFamily:FM, fontSize:12,
          background: disabled ? "rgba(241,245,249,0.6)" : L.panelBg,
          border:`1px solid rgba(14,165,233,0.22)`, borderRadius:6,
          color:L.text, outline:"none", transition:"border-color 0.15s",
        }}
        onFocus={e => e.target.style.borderColor = L.accent}
        onBlur={e  => e.target.style.borderColor = "rgba(14,165,233,0.22)"}
      />
    </div>
  );
}

function RBtn({ children, onClick, disabled, variant="primary", style:xs={} }) {
  const base = {
    display:"flex", alignItems:"center", justifyContent:"center", gap:7,
    padding:"9px 18px", borderRadius:6, cursor:disabled?"not-allowed":"pointer",
    fontFamily:FO, fontSize:8.5, fontWeight:700, letterSpacing:".14em",
    transition:"all 0.15s", opacity:disabled?0.5:1,
  };
  const vs = {
    primary:   { background:disabled?L.accentDim:L.accent, border:`1px solid ${disabled?L.accentBorder:L.accentDark}`, color:disabled?L.accent:"#fff" },
    secondary: { background:L.accentDim, border:`1px solid ${L.accentBorder}`, color:L.textSec },
    danger:    { background:L.dangerDim, border:`1px solid ${L.dangerBorder}`, color:L.danger  },
  }[variant] || {};
  return <button onClick={disabled?undefined:onClick} style={{...base,...vs,...xs}}>{children}</button>;
}

// ── Table ─────────────────────────────────────────────────────────────────────

function RTable({ rows=[], cols }) {
  if (!rows.length) return (
    <div style={{ fontFamily:FM, fontSize:11, color:L.textFaint, padding:"14px 0" }}>NO DATA</div>
  );
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} style={{
                textAlign:"left", padding:"6px 10px 8px",
                borderBottom:`1px solid ${L.divider}`,
                fontFamily:FO, fontSize:7, fontWeight:700, color:L.textMuted,
                letterSpacing:".16em", textTransform:"uppercase",
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}
              style={{ borderBottom:`1px solid rgba(14,165,233,0.06)`, transition:"background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = L.accentDim}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {cols.map(c => (
                <td key={c.key} style={{
                  padding:"8px 10px", verticalAlign:"middle",
                  fontFamily:FM, fontSize:11, color:L.textSec,
                }}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display:"flex", borderBottom:`1px solid ${L.divider}`, marginBottom:16 }}>
      {tabs.map(t => {
        const on = t.id === active;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            padding:"8px 14px", fontFamily:FO, fontSize:7.5, fontWeight:700,
            letterSpacing:".14em", cursor:"pointer", border:"none",
            borderBottom: on ? `2px solid ${L.accent}` : "2px solid transparent",
            background:"transparent", color: on ? L.accent : L.textMuted,
            marginBottom:-1, transition:"all 0.15s",
          }}>
            {t.label}
            {t.count != null && (
              <span style={{
                marginLeft:6, padding:"1px 6px", borderRadius:3,
                background: on ? L.accentDim : "rgba(0,0,0,0.04)",
                border:`1px solid ${on ? L.accentBorder : "rgba(0,0,0,0.08)"}`,
                fontFamily:FO, fontSize:7, color: on ? L.accent : L.textFaint,
              }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Inline badge helpers used in tables ───────────────────────────────────────

const tb = (text, bg, bd, c) => (
  <span style={{ fontFamily:FO, fontSize:6.5, fontWeight:700, padding:"2px 7px",
    borderRadius:3, background:bg, border:`1px solid ${bd}`, color:c, letterSpacing:".1em" }}>
    {text}
  </span>
);

const clusterBadge  = v  => tb(v, L.accentDim, L.accentBorder, L.accent);
const onOffBadge    = v  => tb(v?"ON":"OFF", v?L.successDim:L.accentDim, v?L.successBorder:L.divider, v?L.success:L.textFaint);
const okFaultBadge  = v  => tb(v?"OK":"FAULT", v?L.successDim:L.dangerDim, v?L.successBorder:L.dangerBorder, v?L.success:L.danger);
const typeBadge     = v  => tb(v, L.accentDim, L.accentBorder, L.accent);
const powerBadge    = v  => tb(v==="poweredOn"?"ON":"OFF", v==="poweredOn"?L.successDim:L.accentDim, v==="poweredOn"?L.successBorder:L.divider, v==="poweredOn"?L.success:L.textFaint);

// ── Main component ─────────────────────────────────────────────────────────────

export default function VCenterConnect({
  apiBase   = "https://r3bel-production.up.railway.app",
  onAssets,
  ghostMode = false,
}) {
  const base = apiBase.replace(/\/$/, "");

  const [host,       setHost]       = useState("");
  const [user,       setUser]       = useState("");
  const [pass,       setPass]       = useState("");
  const [port,       setPort]       = useState("443");
  const [selfSigned, setSelfSigned] = useState(true);
  const [demoMode,   setDemoMode]   = useState(false);

  const [session,    setSession]    = useState(null);
  const [assets,     setAssets]     = useState(null);
  const [statusData, setStatusData] = useState(null);

  const [loading,       setLoading]       = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [error,         setError]         = useState(null);
  const [activeTab,     setActiveTab]     = useState("vms");

  // POST /vcenter/connect-vcenter
  const handleConnect = useCallback(async () => {
    setLoading(true); setError(null); setSession(null); setAssets(null); setStatusData(null);

    if (demoMode) {
      await new Promise(r => setTimeout(r, 700));
      setSession({
        connected: true, host: "demo.vcenter.vestro.int",
        vcenter_version: "7.0.3", full_name: "VMware vCenter Server 7.0.3",
        connected_at: new Date().toISOString(),
        vm_count: DEMO.virtual_machines.length,
        vm_preview: DEMO.virtual_machines.slice(0, 5),
      });
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(`${base}/vcenter/connect-vcenter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, username:user, password:pass, port:parseInt(port), allow_self_signed:selfSigned }),
      });
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.detail?.error || e.detail || "Connection failed"); }
      setSession(await resp.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [base, host, user, pass, port, selfSigned, demoMode]);

  // GET /vcenter/vcenter-assets
  const handleFetchAssets = useCallback(async (forceRefresh=false) => {
    setLoadingAssets(true); setError(null);

    if (demoMode) {
      await new Promise(r => setTimeout(r, 500));
      const d = {
        ...DEMO, source:"mock", fetched_at: new Date().toISOString(),
        summary: {
          total_vms:        DEMO.virtual_machines.length,
          powered_on:       DEMO.virtual_machines.filter(v => v.power_state==="poweredOn").length,
          powered_off:      DEMO.virtual_machines.filter(v => v.power_state!=="poweredOn").length,
          total_datastores: DEMO.datastores.length,
          total_clusters:   DEMO.clusters.length,
          total_networks:   DEMO.networks.length,
        },
      };
      setAssets(d);
      if (onAssets) onAssets(d.virtual_machines);
      setLoadingAssets(false);
      return;
    }

    try {
      const p = new URLSearchParams({ demo:false, force_refresh:forceRefresh });
      const resp = await fetch(`${base}/vcenter/vcenter-assets?${p}`);
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.detail?.error || e.detail || "Fetch failed"); }
      const d = await resp.json();
      setAssets(d);
      if (onAssets && d.normalized_assets) onAssets(d.normalized_assets);
    } catch (e) { setError(e.message); }
    finally { setLoadingAssets(false); }
  }, [base, demoMode, onAssets]);

  // GET /vcenter/vcenter-status
  const handleCheckStatus = useCallback(async () => {
    if (demoMode) {
      setStatusData({ session_active:true, alive:true, status:"connected", vcenter_version:"7.0.3" });
      return;
    }
    try {
      const resp = await fetch(`${base}/vcenter/vcenter-status`);
      setStatusData(await resp.json());
    } catch { setStatusData({ session_active:false, alive:false, status:"error" }); }
  }, [base, demoMode]);

  const canConnect = demoMode || (host && user && pass);
  const tabConfig = assets ? [
    { id:"vms",        label:"Virtual Machines", count:assets.virtual_machines?.length },
    { id:"datastores", label:"Datastores",        count:assets.datastores?.length },
    { id:"clusters",   label:"Clusters",          count:assets.clusters?.length },
    { id:"networks",   label:"Networks",          count:assets.networks?.length },
  ] : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        @keyframes ping { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(2.4);opacity:0} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; }
      `}</style>

      <div style={{ minHeight:"100vh", background:L.pageBg, padding:"24px 24px 24px 64px", fontFamily:FM }}>

        {/* Page header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
          <div style={{
            width:38, height:38, background:L.accentDim, border:`1px solid ${L.accentBorder}`,
            borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:FO, fontSize:18, color:L.accent,
          }}>⬡</div>
          <div>
            <h1 style={{ fontFamily:FO, fontWeight:900, fontSize:18, color:L.text, letterSpacing:".12em", lineHeight:1, margin:0 }}>
              VCENTER CONNECT
            </h1>
            <div style={{ fontFamily:FM, fontSize:10, color:L.textFaint, marginTop:4 }}>
              VMware vCenter · Centralized Asset Discovery · Air-Gap Compatible
            </div>
          </div>
          {ghostMode && <Badge label="Ghost Mode" variant="ghost" />}
        </div>

        <div style={{ display:"grid", gridTemplateColumns: session?.connected ? "300px 1fr" : "380px", gap:16, alignItems:"start" }}>

          {/* LEFT — Connect form */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

            {/* Form card */}
            <div style={{ background:L.panelBg, border:`1px solid ${L.divider}`, borderRadius:10, overflow:"hidden", animation:"fadeSlide 0.25s ease" }}>
              <div style={{ padding:"14px 18px", borderBottom:`1px solid ${L.divider}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <IBox icon="◈" active />
                  <span style={{ fontFamily:FO, fontSize:9, fontWeight:700, letterSpacing:".18em", color:L.text }}>INFRASTRUCTURE</span>
                </div>
                <Badge label={demoMode ? "Demo" : "Live"} variant={demoMode ? "warn" : "neutral"} />
              </div>

              <div style={{ padding:18 }}>
                {/* Demo toggle */}
                <label style={{
                  display:"flex", alignItems:"center", gap:10, marginBottom:16,
                  cursor:"pointer", padding:"8px 10px", borderRadius:6,
                  background: demoMode ? L.warnDim : "transparent",
                  border:`1px solid ${demoMode ? L.warnBorder : L.divider}`,
                  transition:"all 0.15s",
                }}>
                  <input type="checkbox" checked={demoMode}
                    onChange={e => { setDemoMode(e.target.checked); setError(null); setSession(null); setAssets(null); }}
                    style={{ accentColor:L.warn, width:13, height:13 }}
                  />
                  <div>
                    <div style={{ fontFamily:FO, fontSize:7.5, fontWeight:700, color:demoMode?L.warn:L.textSec, letterSpacing:".12em" }}>DEMO MODE</div>
                    <div style={{ fontFamily:FM, fontSize:10, color:L.textFaint, marginTop:2 }}>No vCenter required</div>
                  </div>
                </label>

                {!demoMode && (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <RInput label="vCenter Host" value={host} onChange={setHost} placeholder="vcenter.vestro.int" disabled={loading} />
                    <RInput label="Username"     value={user} onChange={setUser} placeholder="readonly@vsphere.local" disabled={loading} />
                    <RInput label="Password" type="password" value={pass} onChange={setPass} placeholder="••••••••" disabled={loading} />
                    <div style={{ display:"grid", gridTemplateColumns:"90px 1fr", gap:10, alignItems:"end" }}>
                      <RInput label="Port" type="number" value={port} onChange={setPort} placeholder="443" disabled={loading} />
                      <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", paddingBottom:2 }}>
                        <input type="checkbox" checked={selfSigned} onChange={e => setSelfSigned(e.target.checked)} style={{ accentColor:L.accent, width:13, height:13 }} />
                        <div style={{ fontFamily:FO, fontSize:7, color:L.textMuted, letterSpacing:".12em", lineHeight:1.5 }}>ALLOW<br/>SELF-SIGNED SSL</div>
                      </label>
                    </div>
                    <div style={{ padding:"8px 10px", borderRadius:6, background:L.accentDim, border:`1px solid ${L.accentBorder}` }}>
                      <div style={{ fontFamily:FO, fontSize:7, fontWeight:700, color:L.accent, letterSpacing:".14em", marginBottom:3 }}>SECURITY · READ-ONLY</div>
                      <div style={{ fontFamily:FM, fontSize:10, color:L.textFaint, lineHeight:1.5 }}>
                        Credentials held in-memory only.<br/>No write operations to vCenter.
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div style={{ marginTop:10, padding:"9px 12px", borderRadius:6,
                    background:L.dangerDim, border:`1px solid ${L.dangerBorder}`,
                    fontFamily:FM, fontSize:11, color:L.danger, lineHeight:1.4,
                    animation:"fadeSlide 0.2s ease" }}>
                    ✕ {error}
                  </div>
                )}

                <div style={{ display:"flex", gap:8, marginTop:14 }}>
                  <RBtn onClick={handleConnect} disabled={loading || !canConnect} style={{ flex:1 }}>
                    {loading ? "CONNECTING…" : session ? "RECONNECT" : "CONNECT"}
                  </RBtn>
                  {session && <RBtn variant="secondary" onClick={handleCheckStatus}>STATUS</RBtn>}
                </div>
              </div>
            </div>

            {/* Session health card */}
            {statusData && (
              <div style={{ background:L.panelBg, border:`1px solid ${L.divider}`, borderRadius:10, padding:"14px 18px", animation:"fadeSlide 0.2s ease" }}>
                <OLabel>Session Health</OLabel>
                {[["Session", statusData.session_active?"Active":"None"], ["Alive", statusData.alive?"Yes":"Expired"], ["Status", statusData.status||"—"], ["Version", statusData.vcenter_version||"—"]].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid rgba(14,165,233,0.06)` }}>
                    <span style={{ fontFamily:FO, fontSize:7, color:L.textMuted, letterSpacing:".14em", fontWeight:700 }}>{k}</span>
                    <span style={{ fontFamily:FM, fontSize:11, color:L.textSec }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Session + Assets */}
          {session?.connected && (
            <div style={{ display:"flex", flexDirection:"column", gap:12, animation:"fadeSlide 0.3s ease" }}>

              {/* Session info */}
              <div style={{ background:L.panelBg, border:`1px solid ${L.divider}`, borderRadius:10, overflow:"hidden" }}>
                <div style={{ padding:"14px 18px", borderBottom:`1px solid ${L.divider}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <PingDot />
                    <div>
                      <div style={{ fontFamily:FO, fontWeight:700, fontSize:10, color:L.text, letterSpacing:".1em" }}>{session.full_name || session.host}</div>
                      <div style={{ fontFamily:FM, fontSize:10, color:L.textFaint, marginTop:2 }}>{session.host} · port {port}</div>
                    </div>
                  </div>
                  <Badge label="Connected" variant="success" />
                </div>

                <div style={{ padding:18 }}>
                  <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                    <Metric label="Virtual Machines" value={session.vm_count ?? "—"} sub="discovered" />
                    <Metric label="vCenter"          value={session.vcenter_version ?? "—"} sub="version" />
                    <Metric label="Mode"             value={demoMode ? "DEMO" : "LIVE"} sub={demoMode ? "simulated" : "air-gap ok"} />
                  </div>

                  {/* VM preview */}
                  {session.vm_preview?.length > 0 && (
                    <div>
                      <OLabel>VM Preview (first 5)</OLabel>
                      {session.vm_preview.map((vm, i, a) => (
                        <div key={i} style={{
                          display:"flex", alignItems:"center", gap:10, padding:"7px 0",
                          borderBottom: i < a.length-1 ? `1px solid rgba(14,165,233,0.07)` : "none",
                        }}>
                          <span style={{
                            width:7, height:7, borderRadius:"50%", flexShrink:0,
                            background: vm.power_state==="poweredOn" ? L.success : L.textFaint,
                            boxShadow: vm.power_state==="poweredOn" ? `0 0 4px ${L.success}` : "none",
                          }} />
                          <span style={{ fontFamily:FM, fontSize:11, fontWeight:500, minWidth:150, color:L.textSec }}>{vm.name}</span>
                          <span style={{ fontFamily:FM, fontSize:10, color:L.textFaint, flex:1 }}>{vm.ip||"no IP"} · {vm.os}</span>
                          {vm.cluster && clusterBadge(vm.cluster)}
                        </div>
                      ))}
                    </div>
                  )}

                  <RBtn onClick={() => handleFetchAssets(false)} disabled={loadingAssets} style={{ marginTop:16, width:"100%" }}>
                    {loadingAssets ? "FETCHING ASSETS…" : "FETCH ALL ASSETS ↗"}
                  </RBtn>
                </div>
              </div>

              {/* Asset inventory */}
              {assets && (
                <div style={{ background:L.panelBg, border:`1px solid ${L.divider}`, borderRadius:10, overflow:"hidden", animation:"fadeSlide 0.25s ease" }}>
                  <div style={{ padding:"14px 18px", borderBottom:`1px solid ${L.divider}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <IBox icon="▦" active />
                      <span style={{ fontFamily:FO, fontSize:9, fontWeight:700, letterSpacing:".18em", color:L.text }}>ASSET INVENTORY</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontFamily:FM, fontSize:10, color:L.textFaint }}>
                        {assets.source==="mock" ? "demo dataset" : assets.host}
                        {assets.fetched_at && ` · ${new Date(assets.fetched_at).toLocaleTimeString()}`}
                      </span>
                      <RBtn variant="secondary" onClick={() => handleFetchAssets(true)} disabled={loadingAssets} style={{ padding:"4px 10px", fontSize:7 }}>
                        {loadingAssets ? "…" : "↻ RESCAN"}
                      </RBtn>
                    </div>
                  </div>

                  <div style={{ padding:18 }}>
                    <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                      <Metric label="VMs"        value={assets.summary?.total_vms ?? 0}        sub={`${assets.summary?.powered_on ?? 0} running`} />
                      <Metric label="Datastores" value={assets.summary?.total_datastores ?? 0} />
                      <Metric label="Clusters"   value={assets.summary?.total_clusters ?? 0}   />
                      <Metric label="Networks"   value={assets.summary?.total_networks ?? 0}   />
                    </div>

                    <Tabs tabs={tabConfig} active={activeTab} onChange={setActiveTab} />

                    {activeTab === "vms" && (
                      <RTable rows={assets.virtual_machines||[]} cols={[
                        { key:"name",        label:"Name",    render:v => <strong style={{ fontWeight:500, color:L.textSec }}>{v}</strong> },
                        { key:"ip",          label:"IP",      render:v => v || "—" },
                        { key:"os",          label:"OS",      render:v => <span style={{ color:L.textFaint }}>{v||"—"}</span> },
                        { key:"cluster",     label:"Cluster", render:v => v ? clusterBadge(v) : "—" },
                        { key:"power_state", label:"State",   render:v => powerBadge(v) },
                      ]} />
                    )}
                    {activeTab === "datastores" && (
                      <RTable rows={assets.datastores||[]} cols={[
                        { key:"name",        label:"Name"                                            },
                        { key:"type",        label:"Type",     render:v => typeBadge(v)              },
                        { key:"capacity_gb", label:"Capacity", render:v => v!=null?`${v.toLocaleString()} GB`:"—" },
                        { key:"free_gb",     label:"Free",     render:v => v!=null?`${v.toLocaleString()} GB`:"—" },
                        { key:"accessible",  label:"Status",   render:v => okFaultBadge(v)           },
                      ]} />
                    )}
                    {activeTab === "clusters" && (
                      <RTable rows={assets.clusters||[]} cols={[
                        { key:"name",          label:"Cluster"                                              },
                        { key:"num_hosts",     label:"Hosts"                                               },
                        { key:"total_cpu_mhz", label:"CPU",    render:v => v?`${(v/1000).toFixed(1)} GHz`:"—" },
                        { key:"total_mem_mb",  label:"RAM",    render:v => v?`${Math.round(v/1024)} GB`:"—"    },
                        { key:"ha_enabled",    label:"HA",     render:v => onOffBadge(v)                    },
                        { key:"drs_enabled",   label:"DRS",    render:v => onOffBadge(v)                    },
                      ]} />
                    )}
                    {activeTab === "networks" && (
                      <RTable rows={assets.networks||[]} cols={[
                        { key:"name",        label:"Network"                                                                             },
                        { key:"type",        label:"Type",    render:v => typeBadge(v==="DistributedVirtualPortgroup"?"DVS":"VSWITCH")   },
                        { key:"num_vms",     label:"VMs"                                                                                },
                        { key:"accessible",  label:"Status",  render:v => okFaultBadge(v)                                               },
                      ]} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}