import React, { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "./shared.js";

// ── API Base ──────────────────────────────────────────────────────────────────
const API =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  "https://r3bel-5464.onrender.com";

// ── Light Theme Palette (matches AssetInventoryPage.tsx) ──────────────────────
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
  purple: "#7c3aed",
};

const LS = {
  page: {
    background: L.pageBg, minHeight: "100vh", padding: "20px 16px",
    display: "flex", flexDirection: "column" as const, gap: 12,
    fontFamily: "'DM Sans', system-ui, sans-serif", color: L.text1,
  },
  panel: {
    background: L.panelBg, border: `1px solid ${L.panelBorder}`,
    borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  btn: {
    background: L.subtleBg, border: `1px solid ${L.panelBorder}`, borderRadius: 4,
    color: L.text2, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600,
  },
  select: {
    background: L.insetBg, border: `1px solid ${L.panelBorder}`, borderRadius: 5,
    color: L.text1, padding: "6px 10px", fontSize: 11, outline: "none", cursor: "pointer" as const,
  },
};

function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

function Shimmer({ w = "100%", h = 14, radius = 4, style = {} }: {
  w?: string | number; h?: number; radius?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, flexShrink: 0,
      background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s ease infinite", ...style,
    }} />
  );
}

function LPanel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...LS.panel, ...style }}>{children}</div>;
}
function LPanelHeader({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "8px 8px 0 0", flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" as const }}>{left}</span>
      {right}
    </div>
  );
}
function LMetricCard({ label, value, sub, color, loading }: { label: string; value: string | number; sub: string; color: string; loading?: boolean }) {
  return (
    <div style={{ background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 8, color: L.text4, textTransform: "uppercase" as const, letterSpacing: ".12em", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {loading ? <Shimmer w="60%" h={22} style={{ marginBottom: 8 }} /> : <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>}
      <div style={{ fontSize: 9, color: L.text3, marginTop: 5 }}>{sub}</div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface FrameworkSummary {
  code: string; name: string; description: string; version: string;
  overall_compliance_score: number; control_pass_rate: number;
  failed_controls: number; pending_evidence: number;
  critical_violations: number; assets_out_of_compliance: number; total_checks: number;
}
interface OverallSummary {
  overall_compliance_score: number; failed_controls: number; pending_evidence: number;
  critical_violations: number; assets_out_of_compliance: number;
}
interface FailedControl {
  id: number; control_ref: string; title: string; category: string; severity: string; affected_assets: number;
}
interface AffectedAsset {
  status: string; reason: string; last_checked: string;
  asset_id: number; asset_name: string; asset_type: string; business_owner: string; team: string; health_status: string;
}
interface ControlDetail {
  id: number; framework_code: string; framework_name: string; control_ref: string;
  title: string; description: string; category: string; severity: string;
  recommended_fix: string; required_evidence: string; compliance_mapping: string;
  affected_assets: AffectedAsset[];
}
interface TrendPoint { snapshot_date: string; score: number; pass_rate: number; failed_controls: number; critical_violations: number; }

function severityColor(s: string) { return ({ Critical: L.red, High: L.orange, Medium: L.yellow, Low: L.green }[s] ?? L.text3); }
function scoreColor(score: number) { if (score >= 80) return L.green; if (score >= 60) return L.yellow; return L.red; }

export default function ComplianceDashboard() {
  const mobile = useMobile();
  const trendRef = useRef<HTMLCanvasElement>(null);

  const [frameworks, setFrameworks] = useState<FrameworkSummary[]>([]);
  const [overall, setOverall] = useState<OverallSummary | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<string>(""); // "" = all
  const [failedControls, setFailedControls] = useState<FailedControl[]>([]);
  const [execSummary, setExecSummary] = useState<string>("");
  const [trendDays, setTrendDays] = useState(30);
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [expandedControl, setExpandedControl] = useState<number | null>(null);
  const [controlDetail, setControlDetail] = useState<Record<number, ControlDetail>>({});
  const [controlLoading, setControlLoading] = useState<number | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  // ── Load framework overview ──────────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(`${API}/compliance/frameworks`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFrameworks(data.frameworks ?? []);
      setOverall(data.overall ?? null);
    } catch {
      setFetchError(true);
      setFrameworks([]);
      setOverall(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  // ── Load selected framework's failed controls + exec summary ────────────
  useEffect(() => {
    if (!selectedFramework) {
      // "All" view — combine failed controls across frameworks isn't a single
      // endpoint; show a rollup message instead and let people drill into one.
      setFailedControls([]);
      setExecSummary("");
      return;
    }
    fetch(`${API}/compliance/frameworks/${selectedFramework}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setFailedControls(d.failed_controls ?? []);
        setExecSummary(d.executive_summary ?? "");
      })
      .catch(() => {});
  }, [selectedFramework]);

  // ── Load trend ────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams({ days: String(trendDays) });
    if (selectedFramework) params.set("framework", selectedFramework);
    fetch(`${API}/compliance/trend?${params.toString()}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTrend(d.points ?? []); })
      .catch(() => {});
  }, [selectedFramework, trendDays]);

  // ── Draw trend chart ──────────────────────────────────────────────────────
  useEffect(() => { drawTrend(); }, [trend, mobile]);

  function drawTrend() {
    const c = trendRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const W = c.offsetWidth || 600, H = 180;
    c.width = W; c.height = H;
    ctx.clearRect(0, 0, W, H);

    if (trend.length < 2) {
      ctx.fillStyle = L.text4;
      ctx.font = "10px 'DM Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Not enough data points yet", W / 2, H / 2);
      return;
    }

    const padL = 32, padR = 10, padT = 12, padB = 20;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const scores = trend.map(t => t.score);
    const min = 0, max = 100;

    // Grid lines
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    [0, 25, 50, 75, 100].forEach(v => {
      const y = padT + plotH - ((v - min) / (max - min)) * plotH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillStyle = L.text4; ctx.font = "8px 'DM Mono', monospace"; ctx.textAlign = "right";
      ctx.fillText(String(v), padL - 6, y + 3);
    });

    // Line
    ctx.beginPath();
    trend.forEach((t, i) => {
      const x = padL + (i / (trend.length - 1)) * plotW;
      const y = padT + plotH - ((t.score - min) / (max - min)) * plotH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = L.blue;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill under line
    const lastX = padL + plotW;
    const firstX = padL;
    ctx.lineTo(lastX, padT + plotH);
    ctx.lineTo(firstX, padT + plotH);
    ctx.closePath();
    ctx.fillStyle = `${L.blue}12`;
    ctx.fill();

    // End point marker + label
    const lastPoint = trend[trend.length - 1];
    const endX = padL + plotW;
    const endY = padT + plotH - ((lastPoint.score - min) / (max - min)) * plotH;
    ctx.beginPath(); ctx.arc(endX, endY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = L.blue; ctx.fill();
    ctx.fillStyle = L.blue; ctx.font = "bold 10px 'DM Mono', monospace"; ctx.textAlign = "right";
    ctx.fillText(`${lastPoint.score}%`, endX - 8, endY - 8);
  }

  const toggleControl = async (controlId: number) => {
    if (expandedControl === controlId) { setExpandedControl(null); return; }
    setExpandedControl(controlId);
    if (!controlDetail[controlId]) {
      setControlLoading(controlId);
      try {
        const res = await fetch(`${API}/compliance/controls/${controlId}`);
        if (res.ok) {
          const d = await res.json();
          setControlDetail(prev => ({ ...prev, [controlId]: d }));
        }
      } catch {}
      setControlLoading(null);
    }
  };

  const doExport = async (format: "csv" | "json" | "pdf") => {
    setExporting(format);
    try {
      const params = new URLSearchParams({ format });
      if (selectedFramework) params.set("framework", selectedFramework);
      const res = await fetch(`${API}/compliance/export?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.detail || `Export failed (${res.status})`);
        setExporting(null);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const scopeLabel = selectedFramework || "all_frameworks";
      a.download = `rebel_compliance_${scopeLabel}.${format === "json" ? "json" : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Export failed — network error.");
    }
    setExporting(null);
  };

  const activeFramework = frameworks.find(f => f.code === selectedFramework) || null;
  const displaySummary: FrameworkSummary | OverallSummary | null = activeFramework || overall;

  return (
    <div style={LS.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.panelBorder};border-radius:3px;}
        select option { background: ${L.panelBg}; color: ${L.text1}; }
      `}</style>

      {/* ── API STATUS + FRAMEWORK SELECTOR ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 7, fontFamily: "'DM Mono',monospace", color: L.text4, letterSpacing: ".08em" }}>API</span>
          <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: fetchError ? L.red : L.green, fontWeight: 600 }}>
            {fetchError ? "✗" : "✓"} {API}
          </span>
          <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: L.cyan, background: `${L.cyan}10`, border: `1px solid ${L.cyan}44`, borderRadius: 3, padding: "2px 6px" }}>
            → /compliance
          </span>
        </div>
        <select value={selectedFramework} onChange={e => setSelectedFramework(e.target.value)} style={LS.select}>
          <option value="">All Frameworks</option>
          {frameworks.map(f => <option key={f.code} value={f.code}>{f.name}</option>)}
        </select>
      </div>

      {/* ── SCORE CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: mobile ? 8 : 9 }}>
        <LMetricCard
          label="OVERALL COMPLIANCE SCORE"
          value={displaySummary ? `${displaySummary.overall_compliance_score}%` : "—"}
          sub={activeFramework ? activeFramework.name : "All frameworks combined"}
          color={displaySummary ? scoreColor(displaySummary.overall_compliance_score) : L.text3}
          loading={loading}
        />
        <LMetricCard label="FAILED CONTROLS" value={displaySummary?.failed_controls ?? "—"} sub="Across selected scope" color={L.red} loading={loading} />
        <LMetricCard label="PENDING EVIDENCE" value={displaySummary?.pending_evidence ?? "—"} sub="Awaiting submission" color={L.yellow} loading={loading} />
        <LMetricCard label="CRITICAL VIOLATIONS" value={displaySummary?.critical_violations ?? "—"} sub="Highest severity" color={L.red} loading={loading} />
        <div style={mobile ? { gridColumn: "1/-1" } : {}}>
          <LMetricCard label="ASSETS OUT OF COMPLIANCE" value={displaySummary?.assets_out_of_compliance ?? "—"} sub="Distinct assets affected" color={L.orange} loading={loading} />
        </div>
      </div>

      {/* ── FRAMEWORK CARDS (only in "All" view) ── */}
      {!selectedFramework && (
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2,1fr)", gap: mobile ? 8 : 10 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <LPanel key={i} style={{ padding: 16 }}><Shimmer w="100%" h={60} /></LPanel>)
          ) : (
            frameworks.map(f => (
              <LPanel key={f.code} style={{ cursor: "pointer" }}>
                <div onClick={() => setSelectedFramework(f.code)} style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: L.text1 }}>{f.name}</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor(f.overall_compliance_score) }}>{f.overall_compliance_score}%</span>
                  </div>
                  <div style={{ height: 5, background: L.insetBg, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ width: `${f.control_pass_rate}%`, height: "100%", background: scoreColor(f.overall_compliance_score), borderRadius: 3 }} />
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, color: L.text3 }}>{f.failed_controls} failed</span>
                    <span style={{ fontSize: 9, color: L.text3 }}>{f.critical_violations} critical</span>
                    <span style={{ fontSize: 9, color: L.text3 }}>{f.pending_evidence} pending</span>
                  </div>
                </div>
              </LPanel>
            ))
          )}
        </div>
      )}

      {/* ── EXECUTIVE SUMMARY (single framework only) ── */}
      {selectedFramework && execSummary && (
        <LPanel>
          <LPanelHeader left="EXECUTIVE SUMMARY" />
          <div style={{ padding: 14 }}>
            <p style={{ fontSize: 11, color: L.text2, lineHeight: 1.7, margin: 0 }}>{execSummary}</p>
          </div>
        </LPanel>
      )}

      {/* ── TREND CHART ── */}
      <LPanel>
        <LPanelHeader
          left="COMPLIANCE TREND"
          right={
            <div style={{ display: "flex", gap: 4 }}>
              {[30, 90, 365].map(d => (
                <button
                  key={d}
                  onClick={() => setTrendDays(d)}
                  style={{ ...LS.btn, padding: "3px 9px", background: trendDays === d ? `${L.blue}15` : L.subtleBg, color: trendDays === d ? L.blue : L.text3, borderColor: trendDays === d ? `${L.blue}40` : L.panelBorder }}
                >{d}d</button>
              ))}
            </div>
          }
        />
        <div style={{ padding: 14 }}>
          <canvas ref={trendRef} style={{ width: "100%", height: 180, display: "block" }} />
        </div>
      </LPanel>

      {/* ── FAILED CONTROLS DRILL-DOWN ── */}
      <LPanel>
        <LPanelHeader
          left="FAILED CONTROLS"
          right={
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => doExport("csv")} disabled={exporting !== null} style={{ ...LS.btn, opacity: exporting ? 0.6 : 1 }}>
                {exporting === "csv" ? "..." : "⬇ CSV"}
              </button>
              <button onClick={() => doExport("json")} disabled={exporting !== null} style={{ ...LS.btn, opacity: exporting ? 0.6 : 1 }}>
                {exporting === "json" ? "..." : "⬇ JSON"}
              </button>
              <button
                onClick={() => doExport("pdf")}
                disabled={exporting !== null}
                style={{ ...LS.btn, opacity: exporting ? 0.6 : 1, background: L.blue, color: "#fff", borderColor: L.blue }}
              >
                {exporting === "pdf" ? "Generating..." : "⬇ PDF Report"}
              </button>
            </div>
          }
        />

        {!selectedFramework ? (
          <div style={{ padding: 20, fontSize: 11, color: L.text3, textAlign: "center" }}>
            Select a framework above to see its failed controls in detail — or download the combined PDF/CSV/JSON for every framework using the buttons above (they respect the "All Frameworks" scope).
          </div>
        ) : loading ? (
          <div style={{ padding: 14 }}>
            {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} w="100%" h={12} style={{ marginBottom: 10 }} />)}
          </div>
        ) : failedControls.length === 0 ? (
          <div style={{ padding: 20, fontSize: 11, color: L.green, textAlign: "center" }}>✓ No failed controls for this framework.</div>
        ) : (
          <div>
            {failedControls.map(c => {
              const isOpen = expandedControl === c.id;
              const detail = controlDetail[c.id];
              return (
                <div key={c.id}>
                  <div
                    onClick={() => toggleControl(c.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = L.insetBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 8, fontWeight: 700, color: severityColor(c.severity), border: `1px solid ${severityColor(c.severity)}44`, borderRadius: 3, padding: "2px 6px", flexShrink: 0 }}>{c.severity}</span>
                    <span style={{ fontSize: 9, color: L.text4, fontFamily: "'DM Mono',monospace", flexShrink: 0, width: mobile ? 50 : 70 }}>{c.control_ref}</span>
                    <span style={{ fontSize: 11, color: L.text1, flex: 1, fontWeight: 500 }}>{c.title}</span>
                    {!mobile && <Badge v="gray">{c.category}</Badge>}
                    <span style={{ fontSize: 9, color: L.text3, flexShrink: 0 }}>{c.affected_assets} assets</span>
                    <span style={{ fontSize: 11, color: L.text4, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: "12px 14px", background: L.insetBg, borderBottom: `1px solid ${L.borderLight}` }}>
                      {controlLoading === c.id || !detail ? (
                        <Shimmer w="100%" h={40} />
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                            <div>
                              <div style={{ fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase" as const, fontWeight: 600 }}>Recommended Fix</div>
                              <div style={{ fontSize: 10, color: L.text2 }}>{detail.recommended_fix}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase" as const, fontWeight: 600 }}>Required Evidence</div>
                              <div style={{ fontSize: 10, color: L.text2 }}>{detail.required_evidence}</div>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 6, textTransform: "uppercase" as const, fontWeight: 600 }}>
                              Affected Assets ({detail.affected_assets.filter(a => a.status !== "Pass").length})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {detail.affected_assets.filter(a => a.status !== "Pass").map(a => (
                                <div key={a.asset_id} style={{ display: "flex", alignItems: "center", gap: 8, background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 5, padding: "6px 10px" }}>
                                  <span style={{ fontSize: 8, fontWeight: 700, color: a.status === "Fail" ? L.red : L.yellow, flexShrink: 0 }}>{a.status}</span>
                                  <span style={{ fontSize: 10, color: L.blue, fontWeight: 600 }}>{a.asset_name}</span>
                                  <span style={{ fontSize: 8, color: L.text4 }}>({a.asset_type})</span>
                                  <span style={{ fontSize: 9, color: L.text3, marginLeft: "auto" }}>{a.team || a.business_owner || "—"}</span>
                                </div>
                              ))}
                              {detail.affected_assets.filter(a => a.status !== "Pass").length === 0 && (
                                <div style={{ fontSize: 9, color: L.text4 }}>No individual failing assets recorded.</div>
                              )}
                            </div>
                            {detail.affected_assets[0]?.reason && (
                              <div style={{ fontSize: 9, color: L.text3, marginTop: 8, fontStyle: "italic" }}>
                                Typical reason: {detail.affected_assets.find(a => a.reason)?.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </LPanel>
    </div>
  );
}