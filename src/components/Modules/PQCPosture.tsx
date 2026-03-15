import React from "react";
import {
  T, S, GRID, Panel, PanelHeader, MetricCard, Badge, ProgBar,
  Table, TR, TD, MOCK_PQC_ASSETS,
} from "./shared";

const RECS = [
  { icon:"⚠", color:T.yellow, text:"Upgrade to TLS 1.3 with PQC"         },
  { icon:"◈", color:T.blue,   text:"Implement Kyber for Key Exchange"     },
  { icon:"◉", color:T.cyan,   text:"Update Cryptographic Libraries"       },
  { icon:"◎", color:T.green,  text:"Develop PQC Migration Plan"           },
  { icon:"⬡", color:T.orange, text:"Remove DES/3DES cipher suites"        },
  { icon:"⚡", color:T.blue,   text:"Enable HSTS on all public assets"    },
];

const TIERS = [
  {
    tier:"TIER-1 ELITE", level:"Modern best-practice crypto posture",
    criteria:"TLS 1.2/1.3 only; Strong Ciphers (AES-GCM/ChaCha20); ECDHE; cert >2048-bit; no weak protocols; HSTS enabled",
    action:"Maintain config; periodic monitoring; recommended baseline for public-facing apps",
    v:"blue" as const,
  },
  {
    tier:"TIER-2 STANDARD", level:"Acceptable enterprise configuration",
    criteria:"TLS 1.2 supported but legacy protocols allowed; Key >2048-bit; mostly strong ciphers; forward secrecy optional",
    action:"Improve gradually; disable legacy protocols; standardise cipher suites",
    v:"yellow" as const,
  },
  {
    tier:"TIER-3 LEGACY", level:"Weak but still operational",
    criteria:"TLS 1.0/1.1 enabled; weak ciphers (CBC, 3DES); forward secrecy missing; key possibly 1024-bit",
    action:"Remediation required; upgrade TLS stack; rotate certificates; remove weak cipher suites",
    v:"orange" as const,
  },
  {
    tier:"CRITICAL", level:"Insecure / exploitable",
    criteria:"SSL v2/v3 enabled; Key <1024-bit; weak cipher suites (<112-bit security); known vulnerabilities",
    action:"Immediate action — block or isolate; replace certificate and TLS config; patch vulnerabilities",
    v:"red" as const,
  },
];

export default function PQCPosturePage() {
  const scoreColor = (s: number) =>
    s >= 700 ? T.green : s >= 400 ? T.yellow : T.red;
  const statusVariant = (s: string): any =>
    s==="Elite"?"green":s==="Standard"?"yellow":s==="Critical"?"red":"orange";

  return (
    <div style={S.page}>

      {/* ── SCORE HEADER ── */}
      <Panel style={{ background:"linear-gradient(135deg,rgba(59,130,246,0.06) 0%,transparent 100%)" }}>
        <div style={{ padding:"18px 20px", display:"flex", gap:24, alignItems:"center", flexWrap:"wrap" }}>
          {/* Score */}
          <div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color:T.text3, letterSpacing:".15em", marginBottom:6 }}>
              CONSOLIDATED PQC CYBER-RATING SCORE
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
              <span style={{ fontFamily:"'Orbitron',monospace", fontSize:52, fontWeight:900, color:T.green, textShadow:"0 0 30px rgba(34,197,94,.4)", lineHeight:1 }}>755</span>
              <span style={{ fontFamily:"'Orbitron',monospace", fontSize:18, color:T.text2 }}>/1000</span>
              <Badge v="green">ELITE-PQC</Badge>
            </div>
            <div style={{ fontSize:11, color:T.text3, marginTop:6 }}>Indicates a stronger security posture</div>
          </div>

          {/* Progress bars */}
          <div style={{ flex:1, minWidth:200 }}>
            {[
              { label:"Elite-PQC Ready", pct:45, color:T.green  },
              { label:"Standard",        pct:30, color:T.yellow },
              { label:"Legacy",          pct:15, color:T.orange },
              { label:"Critical Apps: 8",pct:8,  color:T.red    },
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

          {/* Donut ring */}
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14"/>
            <circle cx="80" cy="80" r="60" fill="none" stroke={T.green} strokeWidth="14"
              strokeDasharray="170 377" strokeLinecap="round" transform="rotate(-90 80 80)"
              style={{ filter:"drop-shadow(0 0 8px rgba(34,197,94,.4))" }}/>
            <circle cx="80" cy="80" r="60" fill="none" stroke={T.yellow} strokeWidth="14"
              strokeDasharray="113 377" strokeDashoffset="-170" strokeLinecap="round"
              transform="rotate(-90 80 80)"/>
            <circle cx="80" cy="80" r="60" fill="none" stroke={T.orange} strokeWidth="14"
              strokeDasharray="57 377" strokeDashoffset="-283" strokeLinecap="round"
              transform="rotate(-90 80 80)"/>
            <text x="80" y="74" textAnchor="middle" fill={T.green} fontFamily="Orbitron,monospace" fontSize="22" fontWeight="700">45%</text>
            <text x="80" y="94" textAnchor="middle" fill="rgba(200,220,255,0.35)" fontFamily="Share Tech Mono" fontSize="9">ELITE-PQC</text>
          </svg>
        </div>
      </Panel>

      {/* ── CLASSIFICATION + RISK MATRIX ── */}
      <div style={GRID.g2}>
        {/* Bar chart: assets by grade */}
        <Panel>
          <PanelHeader left="ASSETS BY CLASSIFICATION GRADE" />
          <div style={{ padding:16, display:"flex", gap:16, alignItems:"flex-end", justifyContent:"center" }}>
            {[
              { label:"ELITE",    val:37, h:90, color:T.green  },
              { label:"CRITICAL", val:2,  h:40, color:T.red    },
              { label:"STANDARD", val:4,  h:55, color:T.purple },
            ].map(bar => (
              <div key={bar.label} style={{ textAlign:"center" }}>
                <div style={{ width:70, height:bar.h,
                  background:`${bar.color}18`, border:`1px solid ${bar.color}44`,
                  borderRadius:"2px 2px 0 0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontFamily:"'Orbitron',monospace", fontSize:24, color:bar.color }}>{bar.val}</span>
                </div>
                <div style={{ fontFamily:"'Orbitron',monospace", fontSize:7.5, color:T.text3, marginTop:6,
                  padding:"3px 6px", background:`${bar.color}10`, border:`1px solid ${bar.color}28` }}>
                  {bar.label}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Risk matrix heatmap */}
        <Panel>
          <PanelHeader left="RISK OVERVIEW" />
          <div style={{ padding:16, display:"flex", gap:16, alignItems:"center" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,52px)", gap:5 }}>
              {[
                T.red+"33",T.red+"1a",T.orange+"1a",
                T.red+"1a",T.orange+"12",T.green+"0d",
                T.orange+"12",T.green+"0d",T.green+"14",
              ].map((bg, i) => (
                <div key={i} style={{ width:52, height:52, background:bg,
                  border:`1px solid ${bg.slice(0,7)}44`, borderRadius:2 }} />
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
          right={<span style={{ fontSize:8, color:T.text3, fontFamily:"'Orbitron',monospace" }}>CRITICAL APPS: 8</span>}
        />
        <Table cols={["ASSET NAME","IP ADDRESS","PQC SUPPORT","TLS","SCORE","STATUS","OWNER"]}>
          {MOCK_PQC_ASSETS.map((a, i) => (
            <TR key={i}>
              <TD style={{ fontSize:10, color:T.blue }}>{a.name}</TD>
              <TD style={{ fontSize:10, color:T.text3 }}>{a.ip}</TD>
              <TD style={{ textAlign:"center", fontSize:16 }}>
                {a.pqc
                  ? <span style={{ color:T.green }}>✓</span>
                  : <span style={{ color:T.red }}>✗</span>}
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
      </Panel>

      {/* ── TIER TABLE ── */}
      <Panel>
        <PanelHeader left="PQC COMPLIANCE TIERS" />
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
      </Panel>

      {/* ── RECOMMENDATIONS + APP DETAIL ── */}
      <div style={GRID.g2}>
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
                <span style={{ fontSize:11, color:T.text2 }}>{r.text}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader left="APP A DETAILS" />
          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:38, height:38, background:T.blue2,
                border:`1px solid rgba(59,130,246,0.3)`, borderRadius:2,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:T.blue }}>⬡</div>
              <span style={{ fontFamily:"'Orbitron',monospace", fontSize:13, color:T.text }}>App A</span>
            </div>
            <div style={GRID.g2}>
              {[
                ["OWNER","Team 1",T.text2],["EXPOSURE","Internet",T.text2],
                ["TLS","RSA / ECC",T.text2],["STATUS","Legacy",T.orange],
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
                <div style={{ flex:1 }}><ProgBar pct={48} color={T.red} /></div>
                <span style={{ fontFamily:"'Orbitron',monospace", fontSize:14, color:T.red }}>480</span>
                <Badge v="red">CRITICAL</Badge>
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
