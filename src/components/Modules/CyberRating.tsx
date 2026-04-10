import React, { useState, useEffect, useRef } from "react";
import { T, S, GRID, Panel, PanelHeader, MetricCard, Badge, ProgBar, Table, TR, TD } from "./shared.js";

const API = "https://r3bel-production.up.railway.app";

// ─── Light palette ────────────────────────────────────────────────────────────
const L = {
  red:    "#E24B4A",
  orange: "#BA7517",
  yellow: "#639922",
  green:  "#378ADD",
  blue:   "#378ADD",
  text:   "var(--color-text-primary)",
  text2:  "var(--color-text-secondary)",
  text3:  "var(--color-text-tertiary)",
  border: "var(--color-border-tertiary)",
  bg:     "var(--color-background-primary)",
  bgSec:  "var(--color-background-secondary)",
};

const riskColor = (score: number) =>
  score > 70 ? L.red : score > 40 ? L.orange : L.yellow;

const levelColor = (level: string) =>
  level === "Critical" ? L.red
  : level === "High"   ? L.orange
  : level === "Medium" ? "#BA7517"
  : L.yellow;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const skelStyle = (w: string | number, h: number, radius = 4): React.CSSProperties => ({
  width: w,
  height: h,
  borderRadius: radius,
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

// ─── Inline progress bar ──────────────────────────────────────────────────────
function LightProgBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, borderRadius: 2, background: "var(--color-border-tertiary)", overflow: "hidden" }}>
      <div style={{ height: 4, borderRadius: 2, background: color, width: `${Math.min(pct, 100)}%`, transition: "width .6s ease" }} />
    </div>
  );
}

// ─── Inline badge ─────────────────────────────────────────────────────────────
const BADGE_MAP: Record<string, { bg: string; color: string }> = {
  Critical: { bg: "#FCEBEB", color: "#A32D2D" },
  High:     { bg: "#FAEEDA", color: "#854F0B" },
  Medium:   { bg: "#EAF3DE", color: "#3B6D11" },
  Low:      { bg: "#E6F1FB", color: "#185FA5" },
  GOOD:     { bg: "#EAF3DE", color: "#3B6D11" },
  FAIR:     { bg: "#FAEEDA", color: "#854F0B" },
  POOR:     { bg: "#FCEBEB", color: "#A32D2D" },
};
function LBadge({ level }: { level: string }) {
  const s = BADGE_MAP[level] ?? { bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 99,
      fontSize: 10, fontWeight: 500, letterSpacing: ".08em",
      background: s.bg, color: s.color,
    }}>{level}</span>
  );
}

// ─── Panel wrapper ─────────────────────────────────────────────────────────────
function LPanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

function LPanelHeader({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 16px",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
    }}>
      <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".1em", color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>{left}</span>
      {right}
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CyberRatingPage() {
  const [stats,   setStats]   = useState<any>({});
  const [trend,   setTrend]   = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const trendRef              = useRef<HTMLCanvasElement>(null);
  const mobile                = useMobile();

  useEffect(() => {
    fetch(`${API}/rating`)
      .then(r => r.json())
      .then(d => {
        setStats(d.stats || {});
        setTrend(d.trend || []);
        setDomains(d.domains || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { drawTrend(); }, [trend, mobile]);

  function drawTrend() {
    const c = trendRef.current; if (!c || !trend.length) return;
    const ctx = c.getContext("2d")!;
    const W = c.offsetWidth || 800, H = mobile ? 140 : 180;
    c.width = W; c.height = H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);

    const pad = mobile ? 20 : 32;
    const maxRisk  = Math.max(...trend.map(t => t.avg_risk), 1);
    const maxScans = Math.max(...trend.map(t => t.scans), 1);
    const n = trend.length;
    const stepX = (W - pad * 2) / Math.max(n - 1, 1);

    ctx.strokeStyle = "rgba(0,0,0,0.06)"; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad + ((H - pad * 2) / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    }

    function drawLine(data: number[], max: number, color: string) {
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = pad + i * stepX;
        const y = pad + (1 - v / max) * (H - pad * 2);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
      data.forEach((v, i) => {
        const x = pad + i * stepX, y = pad + (1 - v / max) * (H - pad * 2);
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
      });
    }

    drawLine(trend.map(t => t.avg_risk), maxRisk,  "#E24B4A");
    drawLine(trend.map(t => t.scans),    maxScans, "#378ADD");

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.font = `${mobile ? 8 : 9}px sans-serif`; ctx.textAlign = "center";
    trend.forEach((t, i) => {
      if (i % (mobile ? 3 : 2) === 0) ctx.fillText(t.date.slice(5), pad + i * stepX, H - 4);
    });
  }

  const rating = stats.overall_rating || 0;
  const levels = stats.levels || { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const total  = stats.total_scans || 0;
  const rColor = rating >= 70 ? "#639922" : rating >= 40 ? "#BA7517" : "#E24B4A";
  const rLabel = rating >= 70 ? "GOOD"    : rating >= 40 ? "FAIR"    : "POOR";
  const arcLen = rating * 3.39;

  const riskRows = [
    { label: "Critical", val: levels.Critical, color: "#E24B4A" },
    { label: "High",     val: levels.High,     color: "#BA7517" },
    { label: "Medium",   val: levels.Medium,   color: "#639922" },
    { label: "Low",      val: levels.Low,      color: "#378ADD" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: mobile ? 12 : 16, background: "var(--color-background-tertiary)" }}>
      <SkeletonCSS />

      {/* ── Score header ── */}
      <LPanel>
        <div style={{ padding: mobile ? "16px" : "20px 24px", display: "flex", gap: mobile ? 16 : 28, alignItems: "flex-start", flexWrap: "wrap" }}>

          {/* Score + arc */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", flex: mobile ? "1 1 100%" : "unset" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".12em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 8 }}>
                Overall security rating
              </div>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={skelStyle(120, 52)} />
                  <div style={skelStyle(80, 12)} />
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: mobile ? 48 : 64, fontWeight: 500, color: rColor, lineHeight: 1 }}>{rating}</span>
                    <span style={{ fontSize: mobile ? 16 : 20, color: "var(--color-text-tertiary)" }}>/100</span>
                    <LBadge level={rLabel} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Based on {total} scans</div>
                </>
              )}
            </div>

            <svg width={mobile ? 96 : 120} height={mobile ? 96 : 120} viewBox="0 0 140 140" style={{ flexShrink: 0 }}>
              <circle cx="70" cy="70" r="54" fill="none" stroke="var(--color-border-tertiary)" strokeWidth="10" />
              {!loading && (
                <circle cx="70" cy="70" r="54" fill="none" stroke={rColor} strokeWidth="10"
                  strokeDasharray={`${arcLen} 339`} strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                  style={{ transition: "stroke-dasharray 1s ease" }} />
              )}
              {loading
                ? <circle cx="70" cy="70" r="54" fill="none" stroke="var(--color-border-tertiary)" strokeWidth="10" />
                : <>
                    <text x="70" y="67" textAnchor="middle" fill={rColor}
                      fontFamily="var(--font-sans)" fontSize="20" fontWeight="500">{rating}</text>
                    <text x="70" y="83" textAnchor="middle" fill="var(--color-text-tertiary)"
                      fontFamily="var(--font-sans)" fontSize="9">{rLabel}</text>
                  </>
              }
            </svg>
          </div>

          {/* Risk bars */}
          <div style={{ flex: 1, minWidth: mobile ? "100%" : 200 }}>
            {loading
              ? [1,2,3,4].map(i => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={skelStyle(60, 10)} />
                      <div style={skelStyle(24, 10)} />
                    </div>
                    <div style={skelStyle("100%", 4)} />
                  </div>
                ))
              : riskRows.map(row => (
                  <div key={row.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{row.label}</span>
                      <span style={{ fontSize: 11, color: row.color, fontWeight: 500 }}>{row.val}</span>
                    </div>
                    <LightProgBar pct={total ? Math.round(row.val / total * 100) : 0} color={row.color} />
                  </div>
                ))
            }
          </div>
        </div>
      </LPanel>

      {/* ── Metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: mobile ? 8 : 10 }}>
        <LMetricCard label="Total scans" value={total}                    sub="All time"      color="#378ADD" loading={loading} />
        <LMetricCard label="Avg risk"    value={stats.avg_risk_score || 0} sub="Risk score"   color="#BA7517" loading={loading} />
        <LMetricCard label="Critical"    value={levels.Critical || 0}      sub="High priority" color="#E24B4A" loading={loading} />
        <LMetricCard label="Low risk"    value={levels.Low || 0}           sub="Safe scans"   color="#639922" loading={loading} />
      </div>

      {/* ── Trend chart ── */}
      <LPanel>
        <LPanelHeader
          left="Scan history trend"
          right={
            <div style={{ display: "flex", gap: mobile ? 10 : 14 }}>
              {([["Avg risk", "#E24B4A"], ["Scans", "#378ADD"]] as const).map(([l, c]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 14, height: 2, background: c, borderRadius: 1 }} />
                  <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{l}</span>
                </div>
              ))}
            </div>
          }
        />
        <div style={{ padding: "12px 4px 6px" }}>
          {loading ? (
            <div style={{ height: mobile ? 140 : 180, padding: "0 16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {[1,2,3].map(i => <div key={i} style={skelStyle("100%", 8)} />)}
            </div>
          ) : (
            <canvas ref={trendRef} style={{ width: "100%", height: mobile ? 140 : 180, display: "block" }} />
          )}
        </div>
      </LPanel>

      {/* ── Domain breakdown ── */}
      <LPanel>
        <LPanelHeader left="Risk breakdown by domain" />
        {mobile ? (
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {loading
              ? [1,2,3].map(i => (
                  <div key={i} style={{ padding: "12px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={skelStyle("50%", 11)} />
                      <div style={skelStyle(50, 16, 99)} />
                    </div>
                    <div style={skelStyle("100%", 4)} />
                  </div>
                ))
              : domains.map((d: any, i: number) => (
                  <div key={i} style={{ padding: "12px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{d.domain}</span>
                      <LBadge level={d.level} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <LightProgBar pct={d.avg_risk} color={riskColor(d.avg_risk)} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: riskColor(d.avg_risk) }}>{d.avg_risk}</span>
                      <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{d.scans} scans</span>
                    </div>
                  </div>
                ))
            }
            {!loading && domains.length === 0 && (
              <div style={{ padding: 16, fontSize: 12, color: "var(--color-text-tertiary)" }}>No scan data yet</div>
            )}
          </div>
        ) : (
          <div>
            {/* Table head */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr", padding: "8px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Domain","Scans","Avg risk score","Level"].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".08em", color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {loading
              ? [1,2,3].map(i => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr", padding: "12px 16px", alignItems: "center", gap: 8, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <div style={skelStyle("70%", 11)} />
                    <div style={skelStyle(30, 11)} />
                    <div style={skelStyle("80%", 6)} />
                    <div style={skelStyle(50, 16, 99)} />
                  </div>
                ))
              : domains.map((d: any, i: number) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr", padding: "10px 16px", alignItems: "center", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{d.domain}</span>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{d.scans}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 80 }}><LightProgBar pct={d.avg_risk} color={riskColor(d.avg_risk)} /></div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: riskColor(d.avg_risk) }}>{d.avg_risk}</span>
                    </div>
                    <LBadge level={d.level} />
                  </div>
                ))
            }
            {!loading && domains.length === 0 && (
              <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--color-text-tertiary)" }}>No scan data yet</div>
            )}
          </div>
        )}
      </LPanel>

      {/* ── Vulnerability summary ── */}
      <LPanel>
        <LPanelHeader left="Vulnerability summary" />
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {loading
            ? [1,2,3,4].map(i => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={skelStyle(32, 32, 6)} />
                  <div style={{ flex: 1 }}><div style={skelStyle("50%", 11)} /></div>
                  <div style={{ width: 100 }}><div style={skelStyle("100%", 6)} /></div>
                  <div style={skelStyle(32, 14)} />
                </div>
              ))
            : [
                { label: "Critical risk scans", val: levels.Critical || 0, color: "#E24B4A", bg: "#FCEBEB", icon: "!" },
                { label: "High risk scans",     val: levels.High     || 0, color: "#BA7517", bg: "#FAEEDA", icon: "▲" },
                { label: "Medium risk scans",   val: levels.Medium   || 0, color: "#639922", bg: "#EAF3DE", icon: "◆" },
                { label: "Low risk scans",      val: levels.Low      || 0, color: "#378ADD", bg: "#E6F1FB", icon: "✓" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: mobile ? 8 : 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: row.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: row.color, flexShrink: 0, fontWeight: 500 }}>
                    {row.icon}
                  </div>
                  <span style={{ flex: 1, fontSize: mobile ? 11 : 12, color: "var(--color-text-secondary)" }}>{row.label}</span>
                  <div style={{ width: mobile ? 80 : 120 }}>
                    <LightProgBar pct={total ? Math.round(row.val / total * 100) : 0} color={row.color} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: row.color, minWidth: 32, textAlign: "right" }}>{row.val}</span>
                </div>
              ))
          }
        </div>
      </LPanel>
    </div>
  );
}