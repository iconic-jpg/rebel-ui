import React, { useState, useEffect, useRef } from "react";

const API = "https://r3bel-production.up.railway.app";

// ── Light palette (mirrors PQCReadinessPage) ──────────────────────────────────
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
  border: "#e2e8f0",
};

const LS: Record<string, React.CSSProperties> = {
  page: {
    background: L.pageBg,
    minHeight: "100vh",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: L.text1,
  },
  panel: {
    background: L.panelBg,
    border: `1px solid ${L.panelBorder}`,
    borderRadius: 8,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  btn: {
    background: L.subtleBg,
    border: `1px solid ${L.border}`,
    borderRadius: 4,
    color: L.text2,
    padding: "5px 11px",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: ".06em",
  },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Shimmer({ w = "100%", h = 16, radius = 4, style = {} }: {
  w?: string | number; h?: number; radius?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, flexShrink: 0,
      background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s ease infinite",
      ...style,
    }} />
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
function LPanel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...LS.panel, ...style }}>{children}</div>;
}

function LPanelHeader({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`,
      background: L.subtleBg, borderRadius: "8px 8px 0 0",
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" }}>{left}</span>
      {right}
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────
function LMetricCard({ label, value, sub, color, loading }: {
  label: string; value: string | number; sub: string; color: string; loading?: boolean;
}) {
  return (
    <div style={{ background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 8, color: L.text4, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 }}>{label}</div>
      {loading
        ? <Shimmer w="65%" h={26} style={{ marginBottom: 8 }} />
        : <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      }
      <div style={{ fontSize: 9, color: L.text3, marginTop: 5 }}>{sub}</div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function LProgBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: L.insetBg, borderRadius: 2, border: `1px solid ${L.border}`, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
    </div>
  );
}

// ── Breakpoint ────────────────────────────────────────────────────────────────
function useBreakpoint() {
  const get = () => { const w = window.innerWidth; return w < 480 ? "mobile" as const : w < 900 ? "tablet" as const : "desktop" as const; };
  const [bp, setBp] = useState(get);
  useEffect(() => { const h = () => setBp(get); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return bp;
}

// ── Activity bar chart (canvas) ───────────────────────────────────────────────
function ActivityChart({ trend, height }: { trend: any[]; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c || !trend.length) return;
    const ctx = c.getContext("2d")!;
    const W = c.offsetWidth || 800, H = height;
    c.width = W; c.height = H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = L.panelBg; ctx.fillRect(0, 0, W, H);
    const pad = 28, n = trend.length, maxScans = Math.max(...trend.map(t => t.scans), 1);
    const bw = Math.max(6, Math.floor((W - pad * 2) / n) - 4);
    const stepX = (W - pad * 2) / Math.max(n, 1);
    ctx.strokeStyle = "rgba(0,0,0,0.05)"; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) { const y = pad + ((H - pad * 2) / 4) * i; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke(); }
    trend.forEach((t, i) => {
      const x = pad + i * stepX + (stepX - bw) / 2;
      const barH = Math.round((t.scans / maxScans) * (H - pad * 2));
      const y = H - barH - pad;
      ctx.fillStyle = "#dbeafe"; ctx.fillRect(x, y, bw, barH);
      ctx.fillStyle = "#93c5fd"; ctx.fillRect(x, y + 3, bw, barH - 3);
      ctx.fillStyle = L.cyan;   ctx.fillRect(x, y, bw, 3);
      if (bw > 10) { ctx.fillStyle = L.cyan; ctx.font = "8px 'DM Sans',sans-serif"; ctx.textAlign = "center"; ctx.fillText(String(t.scans), x + bw / 2, y - 3); }
    });
    ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.font = "9px 'DM Sans',sans-serif"; ctx.textAlign = "center";
    trend.forEach((t, i) => { if (i % 2 === 0) ctx.fillText(t.date.slice(5), pad + i * stepX + stepX / 2, H - 4); });
  }, [trend, height]);
  return <canvas ref={ref} style={{ width: "100%", height, display: "block" }} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportingPage() {
  const [stats,   setStats]   = useState<any>({});
  const [trend,   setTrend]   = useState<any[]>([]);
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const bp       = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  useEffect(() => {
    fetch(`${API}/rating`)
      .then(r => r.json())
      .then(d => { setStats(d.stats || {}); setTrend(d.trend || []); setUsers(d.users || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function exportCSV() {
    fetch(`${API}/api/my-scans`, { headers: { Authorization: `Bearer ${localStorage.getItem("access")}` } })
      .then(r => r.json())
      .then(d => {
        const rows = [["URL","Domain","Risk Score","Level","Scanned At"], ...(d.scans || []).map((s: any) => [s.url, s.domain, s.risk_score, s.level, s.scanned_at])];
        const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "rebel-report.csv"; a.click();
      });
  }

  const total   = stats.total_scans || 0;
  const levels  = stats.levels || { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const maxUser = Math.max(...(users.length ? users.map(u => u.scans) : [1]));

  const summaryRows = [
    { label: "Total scans performed",   val: total,                           color: L.cyan   },
    { label: "Critical findings",        val: levels.Critical || 0,           color: L.red    },
    { label: "High risk findings",       val: levels.High     || 0,           color: L.orange },
    { label: "Medium risk findings",     val: levels.Medium   || 0,           color: L.yellow },
    { label: "Low risk / clean scans",   val: levels.Low      || 0,           color: L.green  },
    { label: "Unique users",             val: users.length,                   color: L.blue   },
    { label: "Average risk score",       val: stats.avg_risk_score || 0,      color: L.orange },
    { label: "Overall security rating",  val: `${stats.overall_rating || 0}/100`,
      color: (stats.overall_rating || 0) >= 70 ? L.green : L.red },
  ];

  return (
    <div style={LS.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:#f1f5f9;}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:3px;}
        input[type=range]{accent-color:${L.blue};}
      `}</style>

      {/* ── HEADER ── */}
      <LPanel>
        <div style={{ padding: isMobile ? "14px 16px" : "16px 20px", display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 4 }}>Rebel threat intelligence</div>
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: L.text1 }}>Security report</div>
            <div style={{ fontSize: 10, color: L.text3, marginTop: 4 }}>
              Generated: {new Date().toLocaleDateString()} · {loading ? "—" : `${total} total scans`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...LS.btn, color: L.cyan, borderColor: `${L.cyan}44`, background: `${L.cyan}0a` }} onClick={exportCSV}>↓ Export CSV</button>
            <button style={{ ...LS.btn, color: L.green, borderColor: `${L.green}44`, background: `${L.green}0a` }}>↓ PDF</button>
          </div>
        </div>
      </LPanel>

      {/* ── METRICS ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: isMobile ? 8 : 9 }}>
        <LMetricCard label="Total scans" value={total}                     sub="All time"   color={L.cyan}   loading={loading} />
        <LMetricCard label="Critical"    value={levels.Critical || 0}      sub="Immediate"  color={L.red}    loading={loading} />
        <LMetricCard label="Avg risk"    value={stats.avg_risk_score || 0} sub="Score"      color={L.orange} loading={loading} />
        <LMetricCard label="Safe scans"  value={levels.Low || 0}           sub="Low risk"   color={L.green}  loading={loading} />
      </div>

      {/* ── ACTIVITY CHART ── */}
      <LPanel>
        <LPanelHeader
          left="Scan activity over time"
          right={<span style={{ fontSize: 8, color: L.text3, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" }}>Last 14 days</span>}
        />
        <div style={{ padding: "12px 4px 6px" }}>
          {loading ? (
            <div style={{ height: isMobile ? 160 : 200, padding: "0 16px", display: "flex", alignItems: "flex-end", gap: 4 }}>
              {[40,65,45,80,55,70,35,90,50,75,60,85,45,70].map((h, i) => (
                <div key={i} style={{ flex: 1, height: h * (isMobile ? 1.2 : 1.6), background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease infinite", borderRadius: 3, alignSelf: "flex-end" }} />
              ))}
            </div>
          ) : (
            <ActivityChart trend={trend} height={isMobile ? 160 : 200} />
          )}
        </div>
      </LPanel>

      {/* ── USER ACTIVITY ── */}
      <LPanel>
        <LPanelHeader left="User activity breakdown" />
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {loading
            ? [1,2,3].map(i => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Shimmer w={32} h={32} radius={6} />
                  <div style={{ flex: 1 }}><Shimmer w="55%" h={11} /></div>
                  <div style={{ width: isMobile ? 60 : 120 }}><Shimmer w="100%" h={6} /></div>
                  <Shimmer w={36} h={13} />
                </div>
              ))
            : users.length === 0
              ? <div style={{ fontSize: 12, color: L.text3 }}>No user data yet</div>
              : users.map((u: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: "#dbeafe", border: `1px solid ${L.cyan}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: L.blue, flexShrink: 0, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
                      {i + 1}
                    </div>
                    <span style={{ flex: 1, fontSize: isMobile ? 11 : 12, color: L.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{u.user}</span>
                    <div style={{ width: isMobile ? 60 : 120, flexShrink: 0 }}>
                      <LProgBar pct={Math.round(u.scans / maxUser * 100)} color={L.cyan} />
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 11 : 12, fontWeight: 700, color: L.cyan, minWidth: isMobile ? 28 : 36, textAlign: "right" }}>{u.scans}</span>
                    {!isMobile && (
                      <span style={{ fontSize: 11, minWidth: 50, textAlign: "right", fontWeight: 700, fontFamily: "'DM Mono',monospace",
                        color: u.avg_risk > 70 ? L.red : u.avg_risk > 40 ? L.orange : L.green }}>
                        {u.avg_risk} avg
                      </span>
                    )}
                  </div>
                ))
          }
        </div>
      </LPanel>

      {/* ── REPORT SUMMARY ── */}
      <LPanel>
        <LPanelHeader left="Report summary" />
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: isMobile ? 6 : 8 }}>
          {loading
            ? [1,2,3,4,5,6,7,8].map(i => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "8px 10px" : "10px 12px", background: L.subtleBg, borderRadius: 5, border: `1px solid ${L.border}` }}>
                  <Shimmer w="45%" h={11} />
                  <Shimmer w={40} h={13} />
                </div>
              ))
            : summaryRows.map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "8px 10px" : "10px 12px", background: L.subtleBg, borderRadius: 5, border: `1px solid ${L.border}` }}>
                  <span style={{ fontSize: isMobile ? 11 : 12, color: L.text2 }}>{row.label}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 12 : 13, fontWeight: 700, color: row.color }}>{row.val}</span>
                </div>
              ))
          }
        </div>
        <div style={{ padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "0 0 8px 8px" }}>
          {loading
            ? <Shimmer w={200} h={10} />
            : <span style={{ fontSize: 10, color: L.text2 }}>
                <b style={{ color: L.text1 }}>{total}</b> total scans ·{" "}
                <b style={{ color: L.red }}>{levels.Critical || 0}</b> critical ·{" "}
                <b style={{ color: L.blue }}>{users.length}</b> unique users
              </span>
          }
        </div>
      </LPanel>
    </div>
  );
}