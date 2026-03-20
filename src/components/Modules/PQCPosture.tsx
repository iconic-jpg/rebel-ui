import React, { useState, useEffect } from "react";
import {
  T, S, GRID, Panel, PanelHeader, MetricCard, Badge, ProgBar,
  Table, TR, TD, MOCK_PQC_ASSETS,
} from "./shared.js";

const API = "https://r3bel-production.up.railway.app";

const RECS = [
  { icon:"⚠", color:T.yellow, text:"Upgrade to TLS 1.3 with PQC"      },
  { icon:"◈", color:T.blue,   text:"Implement Kyber for Key Exchange"  },
  { icon:"◉", color:T.cyan,   text:"Update Cryptographic Libraries"    },
  { icon:"◎", color:T.green,  text:"Develop PQC Migration Plan"        },
  { icon:"⬡", color:T.orange, text:"Remove DES/3DES cipher suites"     },
  { icon:"⚡", color:T.blue,   text:"Enable HSTS on all public assets"  },
];

const TIERS = [
  {
    tier:"TIER-1 ELITE", level:"Modern best-practice crypto posture",
    criteria:"TLS 1.2/1.3 only; Strong Ciphers; ECDHE; cert >2048-bit; no weak protocols; HSTS enabled",
    action:"Maintain config; periodic monitoring; recommended baseline",
    v:"blue" as const,
  },
  {
    tier:"TIER-2 STANDARD", level:"Acceptable enterprise configuration",
    criteria:"TLS 1.2 supported but legacy allowed; Key >2048-bit; mostly strong ciphers",
    action:"Improve gradually; disable legacy protocols; standardise cipher suites",
    v:"yellow" as const,
  },
  {
    tier:"TIER-3 LEGACY", level:"Weak but still operational",
    criteria:"TLS 1.0/1.1 enabled; weak ciphers; forward secrecy missing; key possibly 1024-bit",
    action:"Remediation required; upgrade TLS stack; rotate certificates",
    v:"orange" as const,
  },
  {
    tier:"CRITICAL", level:"Insecure / exploitable",
    criteria:"SSL v2/v3 enabled; Key <1024-bit; known vulnerabilities",
    action:"Immediate action — block or isolate; replace certificate and TLS config",
    v:"red" as const,
  },
];

function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

export default function PQCPosturePage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [stats,  setStats]  = useState({
    avg_score:0, total:0, elite:0, standard:0, legacy:0, critical:0,
    pqc_ready:0, elite_pct:0, standard_pct:0, legacy_pct:0, critical_pct:0
  });
  const mobile = useMobile();

  useEffect(() => {
    // Same hybrid fetch as CBOMPage and PQCReadinessPage
    Promise.all([
      fetch(`${API}/cbom`).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/assets`).then(r => r.json()).catch(() => ({ assets: [] })),
    ]).then(([cbom, assetsData]) => {
      // Registry map keyed by domain
      const registeredMap: Record<string, any> = {};
      (assetsData?.assets ?? []).forEach((a: any) => {
        if (a.name) registeredMap[a.name] = a;
      });

      // Enrich CBOM apps with registry context
      const cbomApps: any[] = (cbom.apps ?? []).map((app: any) => {
        const reg = registeredMap[app.app];
        if (!reg) return app;
        return {
          ...app,
          is_wildcard:        reg.is_wildcard        ?? app.is_wildcard,
          criticality:        reg.criticality,
          owner:              reg.owner,
          compliance_scope:   reg.compliance_scope,
          financial_exposure: reg.financial_exposure,
        };
      });

      // Append registry assets not in CBOM
      const cbomDomains = new Set(cbomApps.map((a: any) => a.app));
      const registeredOnly = (assetsData?.assets ?? [])
        .filter((a: any) => a.id && !cbomDomains.has(a.name))
        .map((a: any) => ({
          app:                a.name,
          keylen:             a.keylen             || "—",
          cipher:             a.cipher             || "—",
          tls:                a.tls                || "—",
          ca:                 a.ca                 || "—",
          status:             a.risk === "weak" ? "weak" : "ok",
          pqc:                false,
          pqc_support:        "none",
          key_exchange_group: a.key_exchange_group || null,
          is_wildcard:        a.is_wildcard        ?? null,
          criticality:        a.criticality,
          owner:              a.owner,
          compliance_scope:   a.compliance_scope,
          financial_exposure: a.financial_exposure,
        }));

      const merged = [...cbomApps, ...registeredOnly];

      if (merged.length) {
        // Convert merged CBOM shape → PQC posture asset shape
        const pqcAssets = merged.map((a: any) => {
          const score = (() => {
            let s = 500;
            const tls = (a.tls || "").replace(/^TLSv?/i, "");
            if (tls === "1.3")        s += 200;
            else if (tls === "1.2")   s += 100;
            else if (tls === "1.1")   s -= 100;
            else if (tls === "1.0")   s -= 200;
            const bits = parseInt(String(a.keylen || "0").match(/(\d+)/)?.[1] ?? "0", 10);
            if (bits >= 4096)         s += 200;
            else if (bits >= 2048)    s += 100;
            else if (bits === 1024)   s -= 150;
            else if (bits > 0)        s -= 200;
            if (a.pqc)                s += 100;
            return Math.max(0, Math.min(1000, s));
          })();
          const status = score >= 700 ? "Elite" : score >= 400 ? "Standard" : score >= 200 ? "Legacy" : "Critical";
          return {
            name:   a.app,
            ip:     a.ip || "—",
            tls:    (a.tls || "—").replace(/^TLSv?/i, ""),
            pqc:    !!a.pqc,
            score,
            status,
            owner:  a.owner || a.ca || "—",
          };
        });

        setAssets(pqcAssets);

        const total    = pqcAssets.length;
        const elite    = pqcAssets.filter(a => a.status === "Elite").length;
        const standard = pqcAssets.filter(a => a.status === "Standard").length;
        const legacy   = pqcAssets.filter(a => a.status === "Legacy").length;
        const critical = pqcAssets.filter(a => a.status === "Critical").length;
        const pqc_ready= pqcAssets.filter(a => a.pqc).length;
        const avg_score= total ? Math.round(pqcAssets.reduce((s, a) => s + a.score, 0) / total) : 0;
        setStats({
          avg_score,  total,
          elite,      standard,   legacy,   critical,   pqc_ready,
          elite_pct:    Math.round(elite    / Math.max(total, 1) * 100),
          standard_pct: Math.round(standard / Math.max(total, 1) * 100),
          legacy_pct:   Math.round(legacy   / Math.max(total, 1) * 100),
          critical_pct: Math.round(critical / Math.max(total, 1) * 100),
        });
      }
    });
  }, []);

  const scoreColor = (s: number) =>
    s >= 700 ? T.green : s >= 400 ? T.yellow : T.red;
  const statusVariant = (s: string): any =>
    s==="Elite"?"green":s==="Standard"?"yellow":s==="Critical"?"red":"orange";

  const displayAssets = assets.length ? assets : MOCK_PQC_ASSETS;
  const score         = stats.avg_score || 755;
  const sc            = scoreColor(score);

  return (
    <div style={S.page}>

      {/* ── SCORE HEADER ── */}
      <Panel style={{ background:"linear-gradient(135deg,rgba(59,130,246,0.06) 0%,transparent 100%)" }}>
        <div style={{ padding: mobile ? "14px 16px" : "18px 20px",
          display:"flex", gap: mobile ? 14 : 24,
          alignItems:"center", flexWrap:"wrap" }}>

          <div style={{ display:"flex", gap:14, alignItems:"center",
            flex: mobile ? "1 1 100%" : "unset" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize: mobile ? 7 : 9,
                color:T.text3, letterSpacing:".15em", marginBottom:6 }}>
                CONSOLIDATED PQC CYBER-RATING SCORE
              </div>
              <div style={{ display:"flex", alignItems:"baseline", gap: mobile ? 6 : 10 }}>
                <span style={{ fontFamily:"'Orbitron',monospace",
                  fontSize: mobile ? 40 : 52, fontWeight:900, color:sc,
                  textShadow:`0 0 30px ${sc}66`, lineHeight:1 }}>{score}</span>
                <span style={{ fontFamily:"'Orbitron',monospace",
                  fontSize: mobile ? 14 : 18, color:T.text2 }}>/1000</span>
                <Badge v={score >= 700 ? "green" : score >= 400 ? "yellow" : "red"}>
                  {score >= 700 ? "ELITE-PQC" : score >= 400 ? "STANDARD" : "CRITICAL"}
                </Badge>
              </div>
              <div style={{ fontSize:11, color:T.text3, marginTop:6 }}>
                Indicates a stronger security posture
              </div>
            </div>

            <svg width={mobile ? 110 : 160} height={mobile ? 110 : 160}
              viewBox="0 0 160 160" style={{ flexShrink:0 }}>
              <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14"/>
              <circle cx="80" cy="80" r="60" fill="none" stroke={T.green} strokeWidth="14"
                strokeDasharray={`${stats.elite_pct * 3.77 || 170} 377`} strokeLinecap="round"
                transform="rotate(-90 80 80)" style={{ filter:"drop-shadow(0 0 8px rgba(34,197,94,.4))" }}/>
              <circle cx="80" cy="80" r="60" fill="none" stroke={T.yellow} strokeWidth="14"
                strokeDasharray={`${stats.standard_pct * 3.77 || 113} 377`}
                strokeDashoffset={`-${stats.elite_pct * 3.77 || 170}`} strokeLinecap="round"
                transform="rotate(-90 80 80)"/>
              <circle cx="80" cy="80" r="60" fill="none" stroke={T.orange} strokeWidth="14"
                strokeDasharray={`${stats.legacy_pct * 3.77 || 57} 377`}
                strokeDashoffset={`-${(stats.elite_pct + stats.standard_pct) * 3.77 || 283}`}
                strokeLinecap="round" transform="rotate(-90 80 80)"/>
              <text x="80" y="74" textAnchor="middle" fill={sc}
                fontFamily="Orbitron,monospace" fontSize="22" fontWeight="700">
                {stats.elite_pct || 45}%
              </text>
              <text x="80" y="94" textAnchor="middle" fill="rgba(200,220,255,0.35)"
                fontFamily="Share Tech Mono" fontSize="9">ELITE-PQC</text>
            </svg>
          </div>

          <div style={{ flex:1, minWidth: mobile ? "100%" : 200 }}>
            {[
              { label:"Elite-PQC Ready", pct: stats.elite_pct    || 45, color:T.green  },
              { label:"Standard",        pct: stats.standard_pct || 30, color:T.yellow },
              { label:"Legacy",          pct: stats.legacy_pct   || 15, color:T.orange },
              { label:`Critical: ${stats.critical || 8}`, pct: stats.critical_pct || 8, color:T.red },
            ].map(row => (
              <div key={row.label} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:10, color:T.text3 }}>{row.label}</span>
                  <span style={{ fontSize:10, color:row.color, fontFamily:"'Orbitron',monospace" }}>{row.pct}%</span>
                </div>
                <ProgBar pct={row.pct} color={row.color} />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* ── CLASSIFICATION + RISK MATRIX ── */}
      <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }}>
        <Panel>
          <PanelHeader left="ASSETS BY CLASSIFICATION GRADE" />
          <div style={{ padding:16, display:"flex", gap: mobile ? 12 : 16,
            alignItems:"flex-end", justifyContent:"center" }}>
            {[
              { label:"ELITE",    val: stats.elite    || 37, h: mobile ? 70 : 90, color:T.green  },
              { label:"CRITICAL", val: stats.critical || 2,  h: mobile ? 30 : 40, color:T.red    },
              { label:"STANDARD", val: stats.standard || 4,  h: mobile ? 45 : 55, color:T.purple },
            ].map(bar => (
              <div key={bar.label} style={{ textAlign:"center" }}>
                <div style={{ width: mobile ? 56 : 70, height:bar.h,
                  background:`${bar.color}18`, border:`1px solid ${bar.color}44`,
                  borderRadius:"2px 2px 0 0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontFamily:"'Orbitron',monospace",
                    fontSize: mobile ? 18 : 24, color:bar.color }}>{bar.val}</span>
                </div>
                <div style={{ fontFamily:"'Orbitron',monospace", fontSize:7.5, color:T.text3, marginTop:6,
                  padding:"3px 6px", background:`${bar.color}10`, border:`1px solid ${bar.color}28` }}>
                  {bar.label}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader left="RISK OVERVIEW" />
          <div style={{ padding:16, display:"flex", gap:16, alignItems:"center" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,52px)", gap:5 }}>
              {[
                T.red+"33",T.red+"1a",T.orange+"1a",
                T.red+"1a",T.orange+"12",T.green+"0d",
                T.orange+"12",T.green+"0d",T.green+"14",
              ].map((bg, i) => (
                <div key={i} style={{ width: mobile ? 40 : 52, height: mobile ? 40 : 52,
                  background:bg, border:`1px solid ${bg.slice(0,7)}44`, borderRadius:2 }} />
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {[
                { color:T.red,    label:"High Risk"      },
                { color:T.orange, label:"Medium Risk"    },
                { color:T.green,  label:"Safe / No Risk" },
              ].map(row => (
                <div key={row.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:12, height:12, borderRadius:1,
                    background:row.color+"22", border:`1px solid ${row.color}44` }} />
                  <span style={{ fontSize:10, color:T.text2 }}>{row.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* ── PQC ASSET TABLE ── */}
      <Panel>
        <PanelHeader left="PQC ASSET STATUS"
          right={<span style={{ fontSize:8, color:T.text3, fontFamily:"'Orbitron',monospace" }}>
            CRITICAL: {stats.critical || 0}
          </span>}
        />
        {mobile ? (
          <div style={{ maxHeight:360, overflowY:"auto" }}>
            {displayAssets.map((a: any, i: number) => (
              <div key={i} style={{ padding:"10px 14px", borderBottom:`1px solid rgba(59,130,246,0.05)` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:11, color:T.blue }}>{a.name}</span>
                  <Badge v={statusVariant(a.status)}>{a.status.toUpperCase()}</Badge>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                  <Badge v={a.tls==="1.0"?"red":a.tls==="1.2"?"yellow":"green"}>TLS {a.tls}</Badge>
                  <span style={{ fontSize:14, color: a.pqc ? T.green : T.red }}>{a.pqc ? "✓" : "✗"}</span>
                  <span style={{ fontSize:9, color:T.text3 }}>{a.ip}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ flex:1 }}>
                    <ProgBar pct={Math.round(a.score/10)} color={scoreColor(a.score)} />
                  </div>
                  <span style={{ fontFamily:"'Orbitron',monospace", fontSize:11, color:scoreColor(a.score) }}>
                    {a.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table cols={["ASSET NAME","IP ADDRESS","PQC SUPPORT","TLS","SCORE","STATUS","OWNER"]}>
            {displayAssets.map((a: any, i: number) => (
              <TR key={i}>
                <TD style={{ fontSize:10, color:T.blue }}>{a.name}</TD>
                <TD style={{ fontSize:10, color:T.text3 }}>{a.ip}</TD>
                <TD style={{ textAlign:"center", fontSize:16 }}>
                  {a.pqc ? <span style={{ color:T.green }}>✓</span> : <span style={{ color:T.red }}>✗</span>}
                </TD>
                <TD><Badge v={a.tls==="1.0"?"red":a.tls==="1.2"?"yellow":"green"}>TLS {a.tls}</Badge></TD>
                <TD>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:60 }}><ProgBar pct={Math.round(a.score/10)} color={scoreColor(a.score)} /></div>
                    <span style={{ fontFamily:"'Orbitron',monospace", fontSize:11, color:scoreColor(a.score) }}>{a.score}</span>
                  </div>
                </TD>
                <TD><Badge v={statusVariant(a.status)}>{a.status.toUpperCase()}</Badge></TD>
                <TD style={{ fontSize:10, color:T.text3 }}>{a.owner}</TD>
              </TR>
            ))}
          </Table>
        )}
      </Panel>

      {/* ── TIER TABLE ── */}
      <Panel>
        <PanelHeader left="PQC COMPLIANCE TIERS" />
        {mobile ? (
          <div>
            {TIERS.map((t, i) => (
              <div key={i} style={{ padding:"12px 14px", borderBottom:`1px solid rgba(59,130,246,0.05)` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <Badge v={t.v}>{t.tier}</Badge>
                  <span style={{ fontSize:10, color:scoreColor(i===0?800:i===1?500:i===2?350:0) }}>{t.level}</span>
                </div>
                <div style={{ fontSize:9, color:T.text2, marginBottom:4, lineHeight:1.5 }}>{t.criteria}</div>
                <div style={{ fontSize:9, color:T.text3, lineHeight:1.5 }}>{t.action}</div>
              </div>
            ))}
          </div>
        ) : (
          <Table cols={["TIER","SECURITY LEVEL","COMPLIANCE CRITERIA","PRIORITY / ACTION"]}>
            {TIERS.map((t, i) => (
              <TR key={i}>
                <TD><Badge v={t.v}>{t.tier}</Badge></TD>
                <TD style={{ fontSize:10, color:scoreColor(i===0?800:i===1?500:i===2?350:0) }}>{t.level}</TD>
                <TD style={{ fontSize:10, color:T.text2, maxWidth:280 }}>{t.criteria}</TD>
                <TD style={{ fontSize:10, color:T.text3 }}>{t.action}</TD>
              </TR>
            ))}
          </Table>
        )}
      </Panel>

      {/* ── RECOMMENDATIONS + APP DETAIL ── */}
      <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }}>
        <Panel>
          <PanelHeader left="IMPROVEMENT RECOMMENDATIONS" />
          <div>
            {RECS.map((r, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
                borderBottom:`1px solid rgba(59,130,246,0.04)` }}>
                <div style={{ width:24, height:24, borderRadius:2,
                  background:`${r.color}22`, border:`1px solid ${r.color}44`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, color:r.color, flexShrink:0 }}>
                  {r.icon}
                </div>
                <span style={{ fontSize: mobile ? 12 : 11, color:T.text2 }}>{r.text}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader left={assets.length ? `${assets[0]?.name} DETAILS` : "APP A DETAILS"} />
          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:38, height:38, background:"rgba(59,130,246,0.1)",
                border:`1px solid rgba(59,130,246,0.3)`, borderRadius:2,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:T.blue }}>⬡</div>
              <span style={{ fontFamily:"'Orbitron',monospace", fontSize:13, color:T.text }}>
                {assets[0]?.name || "App A"}
              </span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                ["OWNER",    assets[0]?.owner  || "Team 1",    T.text2],
                ["EXPOSURE", "Internet",                        T.text2],
                ["TLS",      `TLS ${assets[0]?.tls || "1.2"}`, T.text2],
                ["STATUS",   assets[0]?.status  || "Legacy",   T.orange],
              ].map(([k,v,c]) => (
                <div key={k as string}>
                  <div style={{ fontSize:8, color:T.text3, marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:11, color:c as string }}>{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:8, color:T.text3, marginBottom:5 }}>PQC SCORE</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ flex:1 }}>
                  <ProgBar pct={Math.round((assets[0]?.score || 480) / 10)}
                    color={scoreColor(assets[0]?.score || 480)} />
                </div>
                <span style={{ fontFamily:"'Orbitron',monospace", fontSize:14,
                  color:scoreColor(assets[0]?.score || 480) }}>
                  {assets[0]?.score || 480}
                </span>
                <Badge v={statusVariant(assets[0]?.status || "Critical")}>
                  {(assets[0]?.status || "Critical").toUpperCase()}
                </Badge>
              </div>
            </div>
            <div style={{ padding:"10px 12px", background:"rgba(239,68,68,0.05)",
              border:`1px solid rgba(239,68,68,0.15)`, borderRadius:2 }}>
              <div style={{ fontSize:8, color:T.text3, marginBottom:5 }}>RECOMMENDED ACTIONS</div>
              <div style={{ fontSize:10, color:"rgba(239,68,68,0.8)", lineHeight:1.8 }}>
                → Migrate from RSA to ECDSA/Kyber<br/>
                → Upgrade to TLS 1.3 immediately<br/>
                → Replace 1024-bit keys with 4096-bit
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}