import React from "react";

export const API = "https://r3bel-production.up.railway.app";

// ── Shared style tokens ──────────────────────────────────────────────────────
export const T = {
  blue:   "#3b82f6",  blue2: "rgba(59,130,246,0.12)",  blue3: "rgba(59,130,246,0.06)",
  green:  "#22c55e",  red:   "#ef4444",  orange: "#f97316",
  yellow: "#eab308",  cyan:  "#22d3ee",  purple: "#a78bfa",
  text:   "rgba(200,220,255,0.85)",
  text2:  "rgba(200,220,255,0.5)",
  text3:  "rgba(200,220,255,0.28)",
  border: "rgba(59,130,246,0.09)",
  border2:"rgba(59,130,246,0.18)",
};

export const S: Record<string, React.CSSProperties> = {
  page:   { padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14, fontFamily: "'Share Tech Mono',monospace", color: T.text, background: "#080c14", minHeight: "calc(100vh - 48px)" },
  panel:  { background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border}`, borderRadius: 2 },
  ph:     { padding: "10px 15px", borderBottom: `1px solid rgba(59,130,246,0.07)`, display: "flex", alignItems: "center", justifyContent: "space-between" },
  lbl:    { fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: "0.15em", color: T.text2 },
  lblSm:  { fontFamily: "'Orbitron',monospace", fontSize: 7.5, letterSpacing: "0.12em", color: T.text3 },
  metric: { background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border}`, borderRadius: 2, padding: "12px 14px" },
  metVal: { fontFamily: "'Orbitron',monospace", fontSize: 28, fontWeight: 700, lineHeight: 1, margin: "4px 0 3px" },
  metSub: { fontSize: 8, color: T.text3, letterSpacing: "0.06em" },
  btn:    { background: T.blue3, border: `1px solid rgba(59,130,246,0.32)`, borderRadius: 3, color: T.blue, cursor: "pointer", padding: "5px 12px", fontFamily: "'Orbitron',monospace", fontSize: 8, letterSpacing: "0.12em", whiteSpace: "nowrap" as const },
  input:  { background: "rgba(255,255,255,0.035)", border: `1px solid ${T.border2}`, borderRadius: 3, padding: "8px 12px", color: T.text, fontFamily: "'Share Tech Mono',monospace", fontSize: 11, outline: "none" },
  tblWrap:{ overflowX: "auto" as const },
  progWrap:{ background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", height: 4 },
};

export const GRID: Record<string, React.CSSProperties> = {
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  g3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  g4: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 },
  g5: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 },
};

// ── Reusable UI Atoms ────────────────────────────────────────────────────────

export function Pulse({ color = "#22c55e" }: { color?: string }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.5, animation: "ping 1.4s ease infinite" }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 5px ${color}`, display: "block" }} />
    </span>
  );
}

type BadgeVariant = "red"|"orange"|"yellow"|"green"|"blue"|"cyan"|"purple"|"gray";
const BADGE_COLORS: Record<BadgeVariant, [string,string]> = {
  red:    ["rgba(239,68,68,.1)",    "rgba(239,68,68,.3)",    ],
  orange: ["rgba(249,115,22,.1)",   "rgba(249,115,22,.3)",   ],
  yellow: ["rgba(234,179,8,.1)",    "rgba(234,179,8,.3)",    ],
  green:  ["rgba(34,197,94,.1)",    "rgba(34,197,94,.3)",    ],
  blue:   ["rgba(59,130,246,.1)",   "rgba(59,130,246,.3)",   ],
  cyan:   ["rgba(34,211,238,.1)",   "rgba(34,211,238,.3)",   ],
  purple: ["rgba(167,139,250,.1)",  "rgba(167,139,250,.3)",  ],
  gray:   ["rgba(100,116,139,.1)",  "rgba(100,116,139,.3)",  ],
};
const BADGE_TEXT: Record<BadgeVariant, string> = {
  red:"#ef4444", orange:"#f97316", yellow:"#eab308", green:"#22c55e",
  blue:"#3b82f6", cyan:"#22d3ee", purple:"#a78bfa", gray:"rgba(200,220,255,.4)",
};

export function Badge({ v, children }: { v: BadgeVariant; children: React.ReactNode }) {
  const [bg, border] = BADGE_COLORS[v];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:2,
      fontFamily:"'Orbitron',monospace", fontSize:7.5, letterSpacing:".08em",
      background: bg, border: `1px solid ${border}`, color: BADGE_TEXT[v] }}>
      {children}
    </span>
  );
}

export function ProgBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={S.progWrap}>
      <div style={{ width: `${Math.min(100,pct)}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
    </div>
  );
}

export function MetricCard({ label, value, sub, color }: { label:string; value:string|number; sub:string; color:string }) {
  return (
    <div style={S.metric}>
      <div style={S.lblSm}>{label}</div>
      <div style={{ ...S.metVal, color, textShadow: `0 0 16px ${color}44` }}>{value}</div>
      <div style={S.metSub}>{sub}</div>
    </div>
  );
}

export function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...S.panel, ...style }}>{children}</div>;
}

export function PanelHeader({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={S.ph}>
      <span style={S.lbl}>{left}</span>
      {right && <div style={{ display:"flex", alignItems:"center", gap:8 }}>{right}</div>}
    </div>
  );
}

// ── Shared Table ─────────────────────────────────────────────────────────────
export function Table({ cols, children }: { cols: string[]; children: React.ReactNode }) {
  return (
    <div style={S.tblWrap}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
        <thead>
          <tr>{cols.map(c => (
            <th key={c} style={{ fontFamily:"'Orbitron',monospace", fontSize:7, color:T.text3,
              letterSpacing:".14em", padding:"7px 12px", borderBottom:`1px solid rgba(59,130,246,0.07)`,
              textAlign:"left", fontWeight:400 }}>{c}</th>
          ))}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TR({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      {children}
    </tr>
  );
}

export function TD({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding:"8px 12px", borderBottom:`1px solid rgba(59,130,246,0.04)`,
      color: T.text2, fontSize:11, ...style }}>{children}</td>
  );
}

// ── Sub-tab bar ──────────────────────────────────────────────────────────────
export function SubTabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ background:"none", border:"none", borderBottom: t.id===active ? "2px solid #3b82f6" : "2px solid transparent",
            padding:"7px 12px", cursor:"pointer", fontFamily:"'Orbitron',monospace", fontSize:8,
            letterSpacing:".12em", color: t.id===active ? T.blue : T.text3, transition:"all .2s" }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── PQC Score Ring ────────────────────────────────────────────────────────────
export function ScoreRing({ score, label, size=72 }: { score:number; label:string; size?:number }) {
  const r = size*0.44, circ = 2*Math.PI*r;
  const dash = (score/100)*circ;
  const color = score>80?"#ef4444":score>60?"#f97316":score>40?"#eab308":"#3b82f6";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ filter:`drop-shadow(0 0 4px ${color})`, transition:"stroke-dasharray 1s ease" }}/>
        <text x={size/2} y={size/2+5} textAnchor="middle" fill={color}
          fontSize={size*0.2} fontFamily="Orbitron" fontWeight="700">{score}</text>
      </svg>
      <span style={{ fontSize:8, color:T.text3, letterSpacing:".08em", fontFamily:"'Share Tech Mono',monospace", textTransform:"uppercase" as const }}>{label}</span>
    </div>
  );
}

// ── Shared Mock Data ─────────────────────────────────────────────────────────

export const MOCK_ASSETS = [
  {name:"portal.company.com",  url:"https://portal.company.com",  ip:"34.12.11.45",  type:"Web App", owner:"IT",     risk:"High",     cert:"Valid",    keylen:"2048-bit", scan:"2 hrs ago",  tls:"1.2", ca:"DigiCert",      cipher:"ECDHE-RSA-AES256-GCM-SHA384"},
  {name:"api.company.com",     url:"https://api.company.com",     ip:"34.12.11.90",  type:"API",     owner:"DevOps", risk:"Medium",   cert:"Expiring", keylen:"4096-bit", scan:"5 hrs ago",  tls:"1.3", ca:"Let's Encrypt", cipher:"ECDHE-ECDSA-AES256-GCM-SHA384"},
  {name:"vpn.company.com",     url:"https://vpn.company.com",     ip:"34.55.90.21",  type:"Gateway", owner:"IT",     risk:"Critical", cert:"Expired",  keylen:"1024-bit", scan:"1 hr ago",   tls:"1.0", ca:"COMODO",        cipher:"TLS_RSA_WITH_DES_CBC_SHA"},
  {name:"mail.company.com",    url:"https://mail.company.com",    ip:"35.11.44.10",  type:"Server",  owner:"IT",     risk:"Low",      cert:"Valid",    keylen:"3072-bit", scan:"1 day ago",  tls:"1.2", ca:"GlobalSign",    cipher:"ECDHE-ECDSA-AES375-ECM"},
  {name:"app.company.com",     url:"https://app.company.com",     ip:"34.77.21.12",  type:"Web App", owner:"IT",     risk:"Medium",   cert:"Valid",    keylen:"2048-bit", scan:"5 days ago", tls:"1.3", ca:"DigiCert",      cipher:"TLS_AES_128_GCM_SHA256"},
  {name:"purn.company.com",    url:"https://purn.company.com",    ip:"34.99.10.88",  type:"Web App", owner:"IT",     risk:"Low",      cert:"Valid",    keylen:"4096-bit", scan:"3 hrs ago",  tls:"1.3", ca:"loopDot",       cipher:"TLS_RSA_AES256_GCM_SHA384"},
];

export const MOCK_DOMAINS = [
  {date:"03 Mar 2026", domain:"www.cos.pnb.bank.in",      regdate:"17 Feb 2005", registrar:"National Internet Exchange of India", company:"PNB", status:"new"},
  {date:"17 Oct 2024", domain:"www2.pnbrrbkiosk.in",      regdate:"22 Mar 2021", registrar:"National Internet Exchange of India", company:"PNB", status:"new"},
  {date:"17 Oct 2024", domain:"upload.pnbuniv.net.in",    regdate:"22 Mar 2021", registrar:"National Internet Exchange of India", company:"PNB", status:"confirmed"},
  {date:"17 Oct 2024", domain:"postman.pnb.bank.in",      regdate:"22 Mar 2021", registrar:"National Internet Exchange of India", company:"PNB", status:"new"},
  {date:"17 Nov 2024", domain:"proxy.pnb.bank.in",        regdate:"22 Mar 2021", registrar:"National Internet Exchange of India", company:"PNB", status:"fp"},
  {date:"05 Jan 2026", domain:"cdn.pnb.bank.in",          regdate:"10 Jun 2019", registrar:"National Internet Exchange of India", company:"PNB", status:"confirmed"},
  {date:"20 Feb 2026", domain:"auth.pnb.bank.in",         regdate:"01 Jan 2022", registrar:"National Internet Exchange of India", company:"PNB", status:"new"},
];

export const MOCK_SSL = [
  {date:"10 Mar 2026", sha:"b7563b983bfd217d471f607c9bbc509034a6",      from:"08 Feb 2026", common:"Generic Cert for WF Ovrd", company:"PNB", ca:"Symantec",      status:"new"},
  {date:"10 Mar 2026", sha:"d8527f5c3e99b37164a8f3274a914506c94",       from:"07 Feb 2026", common:"Generic Cert for WF Ovrd", company:"PNB", ca:"DigiCert",      status:"new"},
  {date:"10 Mar 2026", sha:"Abe3195b86704f88cb75c7bcd11c69b9e493",      from:"06 Feb 2026", common:"Generic Cert for WF Ovrd", company:"PNB", ca:"Entrust",       status:"new"},
  {date:"15 Jan 2026", sha:"c1234f56789abc01d23456789abcdef01234",       from:"15 Nov 2025", common:"PNB Portal SSL Cert",    company:"PNB", ca:"Let's Encrypt", status:"confirmed"},
  {date:"01 Feb 2026", sha:"f9876543210abcdef1234567890abcdef98",        from:"01 Dec 2025", common:"PNB API Gateway Cert",   company:"PNB", ca:"GlobalSign",    status:"fp"},
];

export const MOCK_IPS = [
  {date:"05 Mar 2026", ip:"40.104.62.216",  ports:"80",     subnet:"103.107.224.0/22", asn:"AS9583", netname:"MSFT",           location:"-",           company:"Punjab National Bank", status:"new"},
  {date:"17 Oct 2024", ip:"40.101.72.212",  ports:"80",     subnet:"103.107.224.0/22", asn:"AS9583", netname:"-",              location:"India",       company:"Punjab National Bank", status:"new"},
  {date:"17 Oct 2024", ip:"103.25.151.22",  ports:"53,80",  subnet:"103.107.224.0/22", asn:"AS9583", netname:"Quantum-Link-Co",location:"Nashik, India",company:"Punjab National Bank",status:"confirmed"},
  {date:"17 Nov 2024", ip:"181.65.122.92",  ports:"80,443", subnet:"103.107.224.0/22", asn:"AS9583", netname:"E2E-Networks-IN",location:"Chennai, India",company:"Punjab National Bank",status:"confirmed"},
  {date:"17 Nov 2024", ip:"20.153.63.72",   ports:"443",    subnet:"103.107.224.0/22", asn:"AS9583", netname:"-",              location:"Leh, India",  company:"Punjab National Bank", status:"new"},
  {date:"17 Nov 2024", ip:"21.151.42.188",  ports:"22",     subnet:"103.107.224.0/22", asn:"AS9583", netname:"-",              location:"India",       company:"Punjab National Bank", status:"fp"},
  {date:"17 Nov 2024", ip:"402.11.22.153",  ports:"3997",   subnet:"103.107.224.0/22", asn:"AS9583", netname:"E2E-Networks-IN",location:"India",       company:"Punjab National Bank", status:"new"},
];

export const MOCK_SOFTWARE = [
  {date:"05 Mar 2026", product:"http_server",  version:"-",       type:"WebServer",   port:"443", host:"49.51.98.173",  company:"PNB", status:"new"},
  {date:"17 Oct 2024", product:"http_server",  version:"--",      type:"WebServer",   port:"587", host:"49.52.123.215", company:"PNB", status:"confirmed"},
  {date:"17 Oct 2024", product:"Apache",       version:"-",       type:"WebServer",   port:"443", host:"40.59.99.173",  company:"PNB", status:"confirmed"},
  {date:"17 Oct 2024", product:"IIS",          version:"10.0",    type:"WebServer",   port:"80",  host:"40.101.27.212", company:"PNB", status:"confirmed"},
  {date:"17 Nov 2024", product:"Microsoft IIS",version:"10.0",    type:"WebServer",   port:"80",  host:"401.10.274.14", company:"PNB", status:"confirmed"},
  {date:"06 Mar 2026", product:"OpenResty",    version:"1.27.1.1",type:"Web Server",  port:"2087",host:"66.68.262.93",  company:"PNB", status:"new"},
];

export const MOCK_CBOM = [
  {app:"portal.company.com", keylen:"2048-Bit", cipher:"ECDHE-RSA-AES256-GCM-SHA384",    tls:"1.2", ca:"DigiCert",      status:"ok",   pqc:false},
  {app:"portal.company.com", keylen:"1024-Bit", cipher:"TLS_RSA_WITH_256CBC_SHA384",      tls:"1.0", ca:"COMODO",        status:"weak", pqc:false},
  {app:"vpn.company.com",    keylen:"4096-Bit", cipher:"TC5HE-RSA_AE556-GCM-SHA384",      tls:"1.2", ca:"COMODO",        status:"ok",   pqc:false},
  {app:"purn.company.com",   keylen:"4096-Bit", cipher:"TLS_RSA_AES256_GCM_SHA384",       tls:"1.3", ca:"loopDot",       status:"ok",   pqc:true},
  {app:"api.company.com",    keylen:"3078-Bit", cipher:"TLS_AES_336-GCM-SHA394",           tls:"1.3", ca:"Let's Encrypt", status:"ok",   pqc:true},
  {app:"mail.company.com",   keylen:"3072-Bit", cipher:"ECDHE-ECDSA-AE37S6-ECM",          tls:"1.2", ca:"GlobalSign",    status:"ok",   pqc:false},
  {app:"app.company.com",    keylen:"2048-Bit", cipher:"TLS_AES_728-GCM_SHA256",           tls:"1.3", ca:"DigiCert",      status:"ok",   pqc:false},
];

export const MOCK_PQC_ASSETS = [
  {name:"Digigrihavatika.pnbuat.bank.in", ip:"103.109.225.128", pqc:true,  tls:"1.3", score:820, status:"Elite",    owner:"Team 1"},
  {name:"wcw.pnb.bank.in",               ip:"103.109.225.201", pqc:true,  tls:"1.3", score:750, status:"Elite",    owner:"Team 1"},
  {name:"Wbbgb.pnbuk.bank.in",           ip:"103.109.224.249", pqc:false, tls:"1.2", score:480, status:"Critical", owner:"Team 2"},
  {name:"portal.pnb.bank.in",            ip:"34.12.11.45",     pqc:false, tls:"1.2", score:620, status:"Standard", owner:"IT"},
  {name:"api.pnb.bank.in",               ip:"34.12.11.90",     pqc:true,  tls:"1.3", score:710, status:"Elite",    owner:"DevOps"},
  {name:"vpn.pnb.bank.in",               ip:"34.55.90.21",     pqc:false, tls:"1.0", score:310, status:"Legacy",   owner:"IT"},
];
