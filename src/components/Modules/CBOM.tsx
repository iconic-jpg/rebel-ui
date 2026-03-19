import React, { useState, useEffect, useRef } from "react";
import {
  T, S, GRID, Panel, PanelHeader, MetricCard, Badge, ProgBar,
  Table, TR, TD, MOCK_CBOM,
} from "./shared.js";
import {
  parseCipher, analyseCipher, fullAnalysis,
  overallRisk, pqcImpact,
  severityColor, severityVariant,
  type CipherAnalysis,
} from "./cipherAnalysis.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

const API = "https://r3bel-production.up.railway.app";

const DEFAULT_CIPHERS = [
  { name: "TLS_AES_256_GCM_SHA384",                    count: 29, color: T.green  },
  { name: "TLS_AES_128_GCM_SHA256",                    count: 15, color: T.yellow },
  { name: "TLS_RSA_WITH_DES_CBC_SHA",                  count: 9,  color: T.red    },
  { name: "TLS_RSA_WITH_RC4_128_SHA",                  count: 4,  color: T.red    },
  { name: "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384",     count: 12, color: T.orange },
];

const DEFAULT_CAS = [
  { label: "DigiCert",      val: 39, color: T.blue   },
  { label: "Thawte",        val: 39, color: T.cyan   },
  { label: "Let's Encrypt", val: 12, color: T.green  },
  { label: "COMODO",        val: 10, color: T.yellow },
];

const DEFAULT_PROTOCOLS = [
  { label: "TLS 1.3", val: 72, color: T.green  },
  { label: "TLS 1.2", val: 20, color: T.blue   },
  { label: "TLS 1.1", val: 8,  color: T.orange },
  { label: "TLS 1.0", val: 2,  color: T.red    },
];

const KEY_LABELS: [string, string][] = [
  ["4096", T.green],
  ["3072", T.blue],
  ["2048", T.cyan],
  ["1024", T.yellow],
  ["other", T.red],
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CipherEntry {
  name:  string;
  count: number;
  color: string;
}

interface CAEntry {
  label: string;
  val:   number;
  color: string;
}

interface ProtoEntry {
  label: string;
  val:   number;
  color: string;
}

interface StatsState {
  total_apps:   number;
  weak_crypto:  number;
  pqc_ready:    number;
  active_certs: number;
}

interface FindingCounts {
  critical: number;
  high:     number;
  medium:   number;
  low:      number;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useMobile(): boolean {
  const [mobile, setMobile] = useState<boolean>(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FindingBadge({ severity }: { severity: string }) {
  const color = severityColor(severity);
  return (
    <span
      style={{
        fontSize:        8,
        fontWeight:      600,
        letterSpacing:   ".08em",
        color,
        border:          `1px solid ${color}44`,
        borderRadius:    2,
        padding:         "1px 5px",
        textTransform:   "uppercase" as const,
      }}
    >
      {severity}
    </span>
  );
}

function CipherBreakdown({ analysis }: { analysis: CipherAnalysis }) {
  const { components: c, findings, pqcImpact: pqc } = analysis;

  const componentFields = [
    { label: "Key exchange", val: c.keyExchange    },
    { label: "Auth",         val: c.authentication },
    { label: "Bulk cipher",  val: c.bulkCipher     },
    { label: "MAC",          val: c.mac            },
    { label: "PFS",          val: c.pfs ? "Yes ✓" : "No ✗" },
  ] as const;

  return (
    <div
      style={{
        background:   "rgba(8,12,20,0.97)",
        border:       "1px solid rgba(59,130,246,0.2)",
        borderRadius: 4,
        padding:      12,
        marginTop:    4,
      }}
    >
      {/* Component grid */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap:                 6,
          marginBottom:        10,
        }}
      >
        {componentFields.map((item) => (
          <div
            key={item.label}
            style={{
              background:   "rgba(59,130,246,0.06)",
              border:       "1px solid rgba(59,130,246,0.12)",
              borderRadius: 3,
              padding:      "5px 7px",
            }}
          >
            <div
              style={{
                fontSize:      7,
                color:         T.text3,
                marginBottom:  2,
                letterSpacing: ".1em",
              }}
            >
              {item.label.toUpperCase()}
            </div>
            <div
              style={{
                fontSize:   9,
                color:      item.label === "PFS" ? (c.pfs ? T.green : T.red) : T.text2,
                fontFamily: "'Share Tech Mono',monospace",
                fontWeight: item.label === "PFS" ? 600 : 400,
              }}
            >
              {item.val}
            </div>
          </div>
        ))}
      </div>

      {/* DORA findings */}
      {findings
        .filter((f) => f.severity !== "ok")
        .map((f, i) => (
          <div
            key={i}
            style={{
              borderLeft:   `2px solid ${severityColor(f.severity)}`,
              paddingLeft:  8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display:     "flex",
                alignItems:  "center",
                gap:         6,
                marginBottom: 2,
              }}
            >
              <FindingBadge severity={f.severity} />
              <span style={{ fontSize: 9, color: T.text2, fontWeight: 600 }}>
                {f.title}
              </span>
              <span style={{ fontSize: 8, color: T.text3, marginLeft: "auto" }}>
                {f.doraArticle}
              </span>
            </div>
            <div style={{ fontSize: 8, color: T.text3, lineHeight: 1.5 }}>
              {f.description}
            </div>
            <div style={{ fontSize: 8, color: T.cyan, marginTop: 3 }}>
              ↳ {f.remediation}
            </div>
          </div>
        ))}

      {/* PQC impact */}
      <div
        style={{
          background:   "rgba(239,68,68,0.06)",
          border:       "1px solid rgba(239,68,68,0.15)",
          borderRadius: 3,
          padding:      "5px 8px",
        }}
      >
        <span style={{ fontSize: 7, color: T.text3, letterSpacing: ".1em" }}>
          PQC IMPACT{"  "}
        </span>
        <span style={{ fontSize: 8, color: T.text2 }}>{pqc}</span>
      </div>
    </div>
  );
}

// ─── Canvas helpers (outside component to avoid recreation) ──────────────────

function drawBarChart(
  canvas: HTMLCanvasElement,
  bars:   { label: string; val: number; color: string }[],
  mobile: boolean,
): void {
  const ctx  = canvas.getContext("2d");
  if (!ctx) return;
  const W    = canvas.offsetWidth || 280;
  const H    = 160;
  canvas.width = W;
  const max  = Math.max(...bars.map((b) => b.val), 1);
  const bw   = mobile ? 24 : 30;
  const gap  = mobile ? 10 : 16;
  const startX = (W - (bars.length * (bw + gap) - gap)) / 2;

  ctx.clearRect(0, 0, W, H);
  bars.forEach((b, i) => {
    const x    = startX + i * (bw + gap);
    const barH = Math.round((b.val / max) * (H - 30));
    const y    = H - barH - 20;

    ctx.fillStyle = b.color + "22"; ctx.fillRect(x, y, bw, barH);
    ctx.fillStyle = b.color + "88"; ctx.fillRect(x, y + 3, bw, barH - 3);
    ctx.fillStyle = b.color;        ctx.fillRect(x, y, bw, 3);

    ctx.fillStyle  = b.color;
    ctx.font       = "9px 'Share Tech Mono'";
    ctx.textAlign  = "center";
    ctx.fillText(String(b.val), x + bw / 2, y - 4);

    ctx.fillStyle = "rgba(200,220,255,0.25)";
    ctx.fillText(b.label, x + bw / 2, H - 4);
  });
}

function drawDonutChart(
  canvas:    HTMLCanvasElement,
  data:      { label: string; val: number; color: string }[],
  legendEl:  HTMLDivElement,
): void {
  const ctx   = canvas.getContext("2d");
  if (!ctx) return;
  const W = 160, H = 160, cx = 80, cy = 80, r = 55;
  const total = data.reduce((a, d) => a + d.val, 0);
  if (total === 0) return;

  let angle = -Math.PI / 2;
  ctx.clearRect(0, 0, W, H);

  data.forEach((d) => {
    const sweep = 2 * Math.PI * (d.val / total) - 0.04;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.fillStyle   = d.color + "33"; ctx.fill();
    ctx.strokeStyle = d.color;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    angle += 2 * Math.PI * (d.val / total);
  });

  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fillStyle = "#080c14";
  ctx.fill();

  legendEl.innerHTML = data
    .map(
      (d) => `
      <div style="display:flex;align-items:center;gap:6px;">
        <div style="width:8px;height:8px;border-radius:1px;background:${d.color};flex-shrink:0;"></div>
        <span style="font-size:9px;color:${T.text2};flex:1;">${d.label}</span>
        <span style="font-size:9px;font-family:'Orbitron',monospace;color:${d.color};">${d.val}</span>
      </div>`,
    )
    .join("");
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CBOMPage() {
  // Canvas refs
  const klRef          = useRef<HTMLCanvasElement>(null);
  const caRef          = useRef<HTMLCanvasElement>(null);
  const protoRef       = useRef<HTMLCanvasElement>(null);
  const caLegendRef    = useRef<HTMLDivElement>(null);
  const protoLegendRef = useRef<HTMLDivElement>(null);

  const mobile = useMobile();

  // State
  const [cbomData,    setCbomData]    = useState<any[]>([]);
  const [stats,       setStats]       = useState<StatsState>({
    total_apps: 0, weak_crypto: 0, pqc_ready: 0, active_certs: 0,
  });
  const [cipherData,  setCipherData]  = useState<CipherEntry[]>(DEFAULT_CIPHERS);
  const [caData,      setCaData]      = useState<CAEntry[]>(DEFAULT_CAS);
  const [protoData,   setProtoData]   = useState<ProtoEntry[]>(DEFAULT_PROTOCOLS);
  const [keyData,     setKeyData]     = useState<Record<string, number>>({});
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // ── Fetch CBOM data ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/cbom`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.apps?.length) return;

        setCbomData(d.apps);
        if (d.stats) setStats(d.stats);

        if (d.cipher_counts?.length) {
          setCipherData(
            d.cipher_counts.map((c: any, i: number) => ({
              name:  c.name,
              count: c.count,
              color: ([T.green, T.blue, T.cyan, T.yellow, T.red] as string[])[i] ?? T.text3,
            })),
          );
        }

        if (d.ca_counts?.length) {
          setCaData(
            d.ca_counts.map((c: any, i: number) => ({
              label: c.label,
              val:   c.val,
              color: ([T.blue, T.cyan, T.green, T.yellow] as string[])[i] ?? T.text3,
            })),
          );
        }

        if (d.proto_counts?.length) {
          setProtoData(
            d.proto_counts.map((p: any) => ({
              label: p.label,
              val:   p.val,
              color: p.label.includes("1.3") ? T.green
                   : p.label.includes("1.2") ? T.blue
                   : p.label.includes("1.1") ? T.orange
                   : T.red,
            })),
          );
        }

        setKeyData(d.key_counts ?? {});
      })
      .catch(() => {
        // Fall through to defaults — no-op
      });
  }, []);

  // ── Redraw charts when data changes ─────────────────────────────────────────
  useEffect(() => {
    const c = klRef.current;
    if (!c) return;
    const bars = KEY_LABELS.map(([label, color]) => ({
      label,
      color,
      val: keyData[label] ?? 0,
    }));
    drawBarChart(c, bars, mobile);
  }, [keyData, mobile]);

  useEffect(() => {
    if (caRef.current && caLegendRef.current) {
      drawDonutChart(caRef.current, caData, caLegendRef.current);
    }
  }, [caData]);

  useEffect(() => {
    if (protoRef.current && protoLegendRef.current) {
      drawDonutChart(protoRef.current, protoData, protoLegendRef.current);
    }
  }, [protoData]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const displayData = cbomData.length ? cbomData : MOCK_CBOM;

  const analysed = displayData.map((d: any) => ({
    ...d,
    analysis: fullAnalysis(d.cipher ?? "", d.tls ?? ""),
  }));

  const findingCounts = analysed.reduce<FindingCounts>(
    (acc, a: any) => {
      a.analysis.findings.forEach((f: any) => {
        const sev = f.severity as keyof FindingCounts;
        if (sev in acc) acc[sev] += 1;
      });
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );

  const noPFSCount  = analysed.filter((a: any) => !a.analysis.components.pfs).length;
  const brokenCount = analysed.filter((a: any) =>
    a.analysis.findings.some((f: any) =>
      f.code.startsWith("BROKEN") ||
      f.code === "BROKEN-CIPHER-001" ||
      f.code === "BROKEN-CIPHER-002",
    ),
  ).length;

  const maxCipher = Math.max(...cipherData.map((c) => c.count), 1);

  // ── Export CSV ───────────────────────────────────────────────────────────────
  function exportCSV() {
    const header = [
      "Application", "Key Length", "Cipher Suite",
      "Key Exchange", "Auth", "Bulk Cipher", "MAC",
      "PFS", "TLS Version", "CA",
      "Overall Risk", "DORA Findings", "PQC Ready", "PQC Impact",
    ];

    const rows = analysed.map((d: any) => {
      const c        = d.analysis.components;
      const findings = d.analysis.findings
        .filter((f: any) => f.severity !== "ok")
        .map((f: any)    => `[${f.code}] ${f.title}`)
        .join(" | ");

      return [
        d.app, d.keylen, d.cipher,
        c.keyExchange, c.authentication, c.bulkCipher, c.mac,
        c.pfs ? "Yes" : "No",
        d.tls, d.ca,
        d.analysis.overallRisk.toUpperCase(),
        findings || "Compliant",
        d.pqc ? "Yes" : "No",
        d.analysis.pqcImpact,
      ];
    });

    const csv  = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "rebel-cbom-full.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>

      {/* ── METRICS ── */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)",
          gap:                 mobile ? 8 : 9,
        }}
      >
        <MetricCard
          label="TOTAL APPS"
          value={stats.total_apps || displayData.length}
          sub="Applications"
          color={T.blue}
        />
        <MetricCard
          label="CRITICAL"
          value={findingCounts.critical}
          sub="DORA findings"
          color={T.red}
        />
        <MetricCard
          label="NO PFS"
          value={noPFSCount}
          sub="No fwd secrecy"
          color={T.orange}
        />
        <MetricCard
          label="WEAK CIPHER"
          value={stats.weak_crypto || brokenCount}
          sub="Needs remediation"
          color={T.yellow}
        />
        <MetricCard
          label="PQC READY"
          value={stats.pqc_ready || 0}
          sub="Post-quantum"
          color={T.green}
        />
      </div>

      {/* ── DORA FINDING SUMMARY ── */}
      <Panel>
        <PanelHeader left="DORA ART. 9.4 — LIVE FINDING SUMMARY" />
        <div
          style={{
            padding:             "10px 14px",
            display:             "grid",
            gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)",
            gap:                 8,
          }}
        >
          {(["critical", "high", "medium", "low"] as const).map((sev) => {
            const count = findingCounts[sev];
            const color = severityColor(sev);
            const pct   = Math.min(
              100,
              Math.round((count / Math.max(analysed.length, 1)) * 100),
            );
            return (
              <div
                key={sev}
                style={{
                  background:   "rgba(59,130,246,0.03)",
                  border:       `1px solid ${color}22`,
                  borderRadius: 3,
                  padding:      10,
                }}
              >
                <div
                  style={{
                    display:        "flex",
                    justifyContent: "space-between",
                    marginBottom:   6,
                  }}
                >
                  <span
                    style={{
                      fontSize:      9,
                      color,
                      letterSpacing: ".12em",
                      textTransform: "uppercase" as const,
                    }}
                  >
                    {sev}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Orbitron',monospace",
                      fontSize:   14,
                      color,
                    }}
                  >
                    {count}
                  </span>
                </div>
                <div
                  style={{
                    height:       3,
                    background:   "rgba(255,255,255,0.05)",
                    borderRadius: 2,
                  }}
                >
                  <div
                    style={{
                      height:     "100%",
                      width:      `${pct}%`,
                      background: color,
                      borderRadius: 2,
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>
                <div style={{ fontSize: 7, color: T.text3, marginTop: 4 }}>
                  findings across {analysed.length} apps
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ── CHARTS ROW ── */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)",
          gap:                 mobile ? 8 : 10,
        }}
      >
        {/* Key length bar chart */}
        <Panel>
          <PanelHeader left="KEY LENGTH DISTRIBUTION" />
          <div style={{ padding: 14 }}>
            <canvas ref={klRef} style={{ width: "100%", height: 160 }} />
            <div
              style={{
                display:        "flex",
                justifyContent: "space-around",
                marginTop:      8,
              }}
            >
              {KEY_LABELS.map(([lbl, clr]) => (
                <div key={lbl} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize:   10,
                      color:      clr,
                      fontFamily: "'Orbitron',monospace",
                    }}
                  >
                    {lbl}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Cipher usage bars */}
        <Panel>
          <PanelHeader left="CIPHER USAGE" />
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
            {cipherData.map((c) => {
              const parsed = parseCipher(c.name);
              const riskCol =
                !parsed.pfs
                  ? T.red
                  : parsed.bulkCipher.includes("DES") || parsed.bulkCipher === "RC4-128"
                  ? T.red
                  : parsed.bulkCipher.includes("CBC")
                  ? T.orange
                  : T.green;
              return (
                <div key={c.name}>
                  <div
                    style={{
                      display:        "flex",
                      justifyContent: "space-between",
                      marginBottom:   3,
                      gap:            6,
                    }}
                  >
                    <div
                      style={{
                        display:    "flex",
                        alignItems: "center",
                        gap:        5,
                        minWidth:   0,
                        flex:       1,
                      }}
                    >
                      <span
                        style={{
                          width:        6,
                          height:       6,
                          borderRadius: "50%",
                          background:   riskCol,
                          flexShrink:   0,
                        }}
                      />
                      <span
                        style={{
                          fontSize:     9,
                          color:        T.text3,
                          overflow:     "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace:   "nowrap",
                        }}
                      >
                        {c.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize:   9,
                        fontFamily: "'Orbitron',monospace",
                        color:      c.color,
                        flexShrink: 0,
                      }}
                    >
                      {c.count}
                    </span>
                  </div>
                  <ProgBar pct={Math.round((c.count / maxCipher) * 100)} color={riskCol} />
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Certificate authorities donut */}
        <Panel>
          <PanelHeader left="TOP CERTIFICATE AUTHORITIES" />
          <div
            style={{
              padding:        14,
              display:        "flex",
              gap:            mobile ? 12 : 0,
              flexDirection:  mobile ? "row" : "column",
              alignItems:     mobile ? "center" : "stretch",
            }}
          >
            <canvas
              ref={caRef}
              width={160}
              height={160}
              style={{
                display:   "block",
                margin:    mobile ? "0" : "0 auto 10px",
                flexShrink: 0,
                width:     mobile ? 100 : 160,
                height:    mobile ? 100 : 160,
              }}
            />
            <div
              ref={caLegendRef}
              style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}
            />
          </div>
        </Panel>
      </div>

      {/* ── FULL CBOM TABLE WITH CIPHER BREAKDOWN ── */}
      <Panel>
        <PanelHeader
          left="APPLICATION CRYPTOGRAPHIC INVENTORY"
          right={
            <button style={S.btn} onClick={exportCSV}>
              ↓ EXPORT FULL CSV
            </button>
          }
        />

        {mobile ? (
          /* Mobile card view */
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {analysed.map((d: any, i: number) => {
              const risk    = d.analysis.overallRisk;
              const isOpen  = expandedRow === i;
              return (
                <div
                  key={i}
                  style={{ borderBottom: "1px solid rgba(59,130,246,0.05)" }}
                >
                  <div
                    onClick={() => setExpandedRow(isOpen ? null : i)}
                    style={{ padding: "10px 14px", cursor: "pointer" }}
                  >
                    <div
                      style={{
                        display:        "flex",
                        justifyContent: "space-between",
                        marginBottom:   4,
                      }}
                    >
                      <span style={{ fontSize: 12, color: T.blue }}>{d.app}</span>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <FindingBadge severity={risk} />
                        <span style={{ fontSize: 10, color: T.text3 }}>
                          {isOpen ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Badge
                        v={
                          d.tls === "1.0" ? "red"
                          : d.tls === "1.2" ? "yellow"
                          : "green"
                        }
                      >
                        TLS {d.tls}
                      </Badge>
                      <span
                        style={{
                          fontSize: 9,
                          color:
                            d.keylen?.startsWith("1024") ? T.red
                            : d.keylen?.startsWith("2048") ? T.yellow
                            : T.green,
                        }}
                      >
                        {d.keylen}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: d.analysis.components.pfs ? T.green : T.red,
                        }}
                      >
                        {d.analysis.components.pfs ? "PFS ✓" : "PFS ✗"}
                      </span>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ padding: "0 14px 12px" }}>
                      <CipherBreakdown analysis={d.analysis} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop table view */
          <>
            <Table
              cols={[
                "APPLICATION", "KEY LEN", "KEY EXCHANGE", "BULK CIPHER",
                "PFS", "TLS VER", "CA", "OVERALL RISK", "PQC", "",
              ]}
            >
              {analysed.map((d: any, i: number) => {
                const c      = d.analysis.components;
                const risk   = d.analysis.overallRisk;
                const isOpen = expandedRow === i;

                const keyCol =
                  d.keylen?.startsWith("1024") ? T.red
                  : d.keylen?.startsWith("2048") ? T.yellow
                  : T.green;

                const bulkCol =
                  c.bulkCipher.includes("DES") || c.bulkCipher === "RC4-128" ? T.red
                  : c.bulkCipher.includes("CBC") ? T.orange
                  : T.green;

                return (
                  <React.Fragment key={i}>
                    <TR>
                      <TD style={{ color: T.blue, fontSize: 10 }}>{d.app}</TD>
                      <TD style={{ fontSize: 10, color: keyCol }}>{d.keylen}</TD>
                      <TD
                        style={{
                          fontSize:   9,
                          color:      c.pfs ? T.cyan : T.red,
                          fontFamily: "'Share Tech Mono',monospace",
                        }}
                      >
                        {c.keyExchange}
                      </TD>
                      <TD
                        style={{
                          fontSize:     9,
                          color:        bulkCol,
                          fontFamily:   "'Share Tech Mono',monospace",
                          maxWidth:     120,
                          overflow:     "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace:   "nowrap" as const,
                        }}
                      >
                        {c.bulkCipher}
                      </TD>
                      <TD style={{ textAlign: "center", fontSize: 13 }}>
                        {c.pfs
                          ? <span style={{ color: T.green }}>✓</span>
                          : <span style={{ color: T.red   }}>✗</span>}
                      </TD>
                      <TD>
                        <Badge
                          v={
                            d.tls === "1.0" ? "red"
                            : d.tls === "1.1" ? "orange"
                            : d.tls === "1.2" ? "yellow"
                            : "green"
                          }
                        >
                          TLS {d.tls}
                        </Badge>
                      </TD>
                      <TD style={{ fontSize: 9, color: T.text3 }}>{d.ca}</TD>
                      <TD>
                        <Badge v={severityVariant(risk) as any}>
                          {risk.toUpperCase()}
                        </Badge>
                      </TD>
                      <TD style={{ textAlign: "center", fontSize: 13 }}>
                        {d.pqc
                          ? <span style={{ color: T.green }}>✓</span>
                          : <span style={{ color: T.red   }}>✗</span>}
                      </TD>
                      <TD>
                        <button
                          onClick={() => setExpandedRow(isOpen ? null : i)}
                          style={{ ...S.btn, fontSize: 9, padding: "2px 7px" }}
                        >
                          {isOpen ? "▲" : "▼ details"}
                        </button>
                      </TD>
                    </TR>
                    {isOpen && (
                      <TR>
                        <td colSpan={10} style={{ padding: "0 12px 12px" }}>
                          <CipherBreakdown analysis={d.analysis} />
                        </td>
                      </TR>
                    )}
                  </React.Fragment>
                );
              })}
            </Table>

            {/* Summary footer */}
            <div
              style={{
                padding:        "8px 12px",
                borderTop:      "1px solid rgba(59,130,246,0.07)",
                display:        "flex",
                justifyContent: "space-between",
                alignItems:     "center",
                flexWrap:       "wrap",
                gap:            8,
              }}
            >
              <span style={{ fontSize: 10, color: T.text3 }}>
                <b style={{ color: T.text2 }}>{analysed.length}</b> apps ·
                <b style={{ color: T.red }}> {findingCounts.critical}</b> critical ·
                <b style={{ color: T.orange }}> {findingCounts.high}</b> high ·
                <b style={{ color: T.red }}> {noPFSCount}</b> without PFS
              </span>
              <span style={{ fontSize: 9, color: T.text3 }}>
                Click ▼ details to expand cipher findings per app
              </span>
            </div>
          </>
        )}
      </Panel>

      {/* ── ENCRYPTION PROTOCOLS ── */}
      <Panel>
        <PanelHeader left="ENCRYPTION PROTOCOLS" />
        <div
          style={{
            padding:       14,
            display:       "flex",
            gap:           16,
            alignItems:    "center",
            flexDirection: mobile ? "column" : "row",
          }}
        >
          <canvas
            ref={protoRef}
            width={140}
            height={140}
            style={{
              width:    mobile ? "100%" : 140,
              height:   140,
              maxWidth: 200,
            }}
          />
          <div
            ref={protoLegendRef}
            style={{
              display:       "flex",
              flexDirection: "column",
              gap:           9,
              flex:          1,
              width:         mobile ? "100%" : "auto",
            }}
          />
        </div>
      </Panel>

    </div>
  );
}