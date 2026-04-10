import React, { useState, useEffect, useRef } from "react";
import { T, S, GRID, Panel, PanelHeader, MetricCard, Badge, ProgBar, Table, TR, TD } from "./shared.js";

const API = "https://r3bel-production.up.railway.app";

const skelStyle = (w: string | number, h: number, radius = 4): React.CSSProperties => ({
  width: w, height: h, borderRadius: radius,
  background: "var(--color-border-tertiary)",
  animation: "skel-shimmer 1.4s infinite",
  flexShrink: 0,
});

const SkeletonCSS = () => (
  <style>{`
    @keyframes skel-shimmer {
      0%   { opacity: 1 }
      50%  { opacity: 0.4 }
      100% { opacity: 1 }
    }
  `}</style>
);

function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

function LightProgBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, borderRadius: 2, background: "var(--color-border-tertiary)", overflow: "hidden" }}>
      <div style={{ height: 4, borderRadius: 2, background: color, width: `${Math.min(pct, 100)}%`, transition: "width .6s ease" }} />
    </div>
  );
}

function LPanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      overflow: "hidden",
      ...style,
    }}>{children}</div>
  );
}

function LPanelHeader({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".1em", color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>{left}</span>
      {right}
    </div>
  );
}

function LMetricCard({ label, value, sub, color, loading }: { label: string; value: number | string; sub: string; color: string; loading?: boolean }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "14px 16px" }}>
      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".1em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {loading
        ? <div style={skelStyle("60%", 28)} />
        : <div style={{ fontSize: 26, fontWeight: 500, color, lineHeight: 1 }}>{value}</div>
      }
      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

export default function ReportingPage() {
  const [stats,   setStats]   = useState<any>({});
  const [trend,   setTrend]   = useState<any[]>([]);
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const chartRef              = useRef<HTMLCanvasElement>(null);
  const mobile                = useMobile();

  useEffect(() => {
    fetch(`${API}/rating`)
      .then(r => r.json())
      .then(d => {
        setStats(d.stats || {});
        setTrend(d.trend || []);
        setUsers(d.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { drawActivityChart(); }, [trend, mobile]);

  function drawActivityChart() {
    const c = chartRef.current; if (!c || !trend.length) return;
    const ctx = c.getContext("2d")!;
    const W = c.offsetWidth || 800, H = mobile ? 160 : 200;
    c.width = W; c.height = H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);

    const pad = mobile ? 20 : 32;
    const maxScans = Math.max(...trend.map(t => t.scans), 1);
    const n = trend.length;
    const bw = Math.max(6, Math.floor((W - pad * 2) / n) - 4);
    const stepX = (W - pad * 2) / Math.max(n, 1);

    ctx.strokeStyle = "rgba(0,0,0,0.06)"; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad + ((H - pad * 2) / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    }

    trend.forEach((t, i) => {
      const x = pad + i * stepX + (stepX - bw) / 2;
      const barH = Math.round((t.scans / maxScans) * (H - pad * 2));
      const y = H - barH - pad;
      ctx.fillStyle = "#E6F1FB"; ctx.fillRect(x, y, bw, barH);
      ctx.fillStyle = "#B5D4F4"; ctx.fillRect(x, y + 3, bw, barH - 3);
      ctx.fillStyle = "#378ADD"; ctx.fillRect(x, y, bw, 3);
      if (!mobile || bw > 10) {
        ctx.fillStyle = "#378ADD";
        ctx.font = "8px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(String(t.scans), x + bw / 2, y - 3);
      }
    });

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.font = `${mobile ? 7 : 9}px sans-serif`; ctx.textAlign = "center";
    trend.forEach((t, i) => {
      if (i % (mobile ? 3 : 2) === 0) ctx.fillText(t.date.slice(5), pad + i * stepX + stepX / 2, H - 4);
    });
  }

  function exportCSV() {
    fetch(`${API}/api/my-scans`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
    })
      .then(r => r.json())
      .then(d => {
        const rows = [
          ["URL","Domain","Risk Score","Level","Scanned At"],
          ...(d.scans || []).map((s: any) => [s.url, s.domain, s.risk_score, s.level, s.scanned_at])
        ];
        const csv  = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a"); a.href = url; a.download = "rebel-report.csv"; a.click();
      });
  }

  const total   = stats.total_scans || 0;
  const levels  = stats.levels || { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const maxUser = Math.max(...users.map(u => u.scans), 1);

  const btnBase: React.CSSProperties = {
    padding: "7px 14px", borderRadius: "var(--border-radius-md)", cursor: "pointer",
    fontSize: 11, fontWeight: 500, letterSpacing: ".08em",
    background: "transparent", border: "0.5px solid var(--color-border-secondary)",
    color: "var(--color-text-secondary)", transition: "background .15s",
  };

  const summaryRows = [
    { label: "Total scans performed",   val: total,                    color: "#378ADD" },
    { label: "Critical findings",        val: levels.Critical || 0,    color: "#E24B4A" },
    { label: "High risk findings",       val: levels.High     || 0,    color: "#BA7517" },
    { label: "Medium risk findings",     val: levels.Medium   || 0,    color: "#639922" },
    { label: "Low risk / clean scans",   val: levels.Low      || 0,    color: "#378ADD" },
    { label: "Unique users",             val: users.length,             color: "#639922" },
    { label: "Average risk score",       val: stats.avg_risk_score || 0, color: "#BA7517" },
    { label: "Overall security rating",  val: `${stats.overall_rating || 0}/100`,
      color: (stats.overall_rating || 0) >= 70 ? "#639922" : "#E24B4A" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: mobile ? 12 : 16, background: "var(--color-background-tertiary)" }}>
      <SkeletonCSS />

      {/* ── Header ── */}
      <LPanel>
        <div style={{
          padding: mobile ? "14px 16px" : "16px 20px",
          display: "flex", justifyContent: "space-between",
          alignItems: mobile ? "flex-start" : "center",
          flexDirection: mobile ? "column" : "row",
          gap: mobile ? 12 : 0,
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".12em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 4 }}>
              Rebel threat intelligence
            </div>
            <div style={{ fontSize: mobile ? 16 : 20, fontWeight: 500, color: "var(--color-text-primary)" }}>
              Security report
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
              Generated: {new Date().toLocaleDateString()} · {loading ? "—" : `${total} total scans`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnBase} onClick={exportCSV}>↓ Export CSV</button>
            <button style={{ ...btnBase, color: "#3B6D11", borderColor: "#C0DD97" }}>↓ PDF</button>
          </div>
        </div>
      </LPanel>

      {/* ── Metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: mobile ? 8 : 10 }}>
        <LMetricCard label="Total scans" value={total}                     sub="All time"  color="#378ADD" loading={loading} />
        <LMetricCard label="Critical"    value={levels.Critical || 0}      sub="Immediate" color="#E24B4A" loading={loading} />
        <LMetricCard label="Avg risk"    value={stats.avg_risk_score || 0} sub="Score"     color="#BA7517" loading={loading} />
        <LMetricCard label="Safe scans"  value={levels.Low || 0}           sub="Low risk"  color="#639922" loading={loading} />
      </div>

      {/* ── Activity chart ── */}
      <LPanel>
        <LPanelHeader
          left="Scan activity over time"
          right={<span style={{ fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase" }}>Last 14 days</span>}
        />
        <div style={{ padding: "12px 4px 6px" }}>
          {loading ? (
            <div style={{ height: mobile ? 160 : 200, padding: "0 16px", display: "flex", alignItems: "flex-end", gap: 6 }}>
              {[40,65,45,80,55,70,35,90,50,75,60,85,45,70].map((h, i) => (
                <div key={i} style={{ ...skelStyle("100%", h * (mobile ? 1.2 : 1.6)), borderRadius: 3, alignSelf: "flex-end" }} />
              ))}
            </div>
          ) : (
            <canvas ref={chartRef} style={{ width: "100%", height: mobile ? 160 : 200, display: "block" }} />
          )}
        </div>
      </LPanel>

      {/* ── User activity ── */}
      <LPanel>
        <LPanelHeader left="User activity breakdown" />
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {loading
            ? [1,2,3].map(i => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={skelStyle(32, 32, 6)} />
                  <div style={{ flex: 1 }}><div style={skelStyle("55%", 11)} /></div>
                  <div style={{ width: mobile ? 60 : 120 }}><div style={skelStyle("100%", 6)} /></div>
                  <div style={skelStyle(36, 13)} />
                </div>
              ))
            : users.length === 0
              ? <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>No user data yet</div>
              : users.map((u: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: mobile ? 8 : 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, color: "#185FA5", flexShrink: 0, fontWeight: 500,
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ flex: 1, fontSize: mobile ? 11 : 12, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                      {u.user}
                    </span>
                    <div style={{ width: mobile ? 60 : 120, flexShrink: 0 }}>
                      <LightProgBar pct={Math.round(u.scans / maxUser * 100)} color="#378ADD" />
                    </div>
                    <span style={{ fontSize: mobile ? 11 : 12, fontWeight: 500, color: "#378ADD", minWidth: mobile ? 28 : 36, textAlign: "right" }}>
                      {u.scans}
                    </span>
                    {!mobile && (
                      <span style={{ fontSize: 11, minWidth: 50, textAlign: "right", fontWeight: 500,
                        color: u.avg_risk > 70 ? "#E24B4A" : u.avg_risk > 40 ? "#BA7517" : "#639922" }}>
                        {u.avg_risk} avg
                      </span>
                    )}
                  </div>
                ))
          }
        </div>
      </LPanel>

      {/* ── Report summary ── */}
      <LPanel>
        <LPanelHeader left="Report summary" />
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: mobile ? 6 : 8 }}>
          {loading
            ? [1,2,3,4,5,6,7,8].map(i => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: mobile ? "8px 10px" : "10px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
                  <div style={skelStyle("45%", 11)} />
                  <div style={skelStyle(40, 13)} />
                </div>
              ))
            : summaryRows.map((row, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: mobile ? "8px 10px" : "10px 12px",
                  background: "var(--color-background-secondary)",
                  borderRadius: "var(--border-radius-md)",
                }}>
                  <span style={{ fontSize: mobile ? 11 : 12, color: "var(--color-text-secondary)" }}>{row.label}</span>
                  <span style={{ fontSize: mobile ? 12 : 13, fontWeight: 500, color: row.color }}>{row.val}</span>
                </div>
              ))
          }
        </div>
      </LPanel>
    </div>
  );
}