import React, { useState, useEffect, useRef } from "react";
import { useThemeContext } from '../context/ThemeContext.js'
import { exportAuditPDF, type ExportPDFOptions } from "./exportPDF.js";
import {
  T, S, Panel, PanelHeader, MetricCard, Badge,
  Table, TR, TD, MOCK_CBOM, MOCK_ASSETS,
} from "./shared.js";

import {
  fullAnalysis, normaliseTLS, pqcReadinessScore,
} from "./cipherAnalysis.js";

import type { PQCScoreBreakdown } from "./cipherAnalysis.js";

// ── API Base: VITE_API_BASE env var → Docker/airgap → cloud fallback ──────────
const API =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  "https://r3bel-production.up.railway.app";

// ── Cache config ──────────────────────────────────────────────────────────────
const CACHE_TTL_MS  = 12 * 60 * 60 * 1000; // 12 hours
const CACHE_KEY_CBOM   = "rebel_cache_cbom";
const CACHE_KEY_ASSETS = "rebel_cache_assets";

interface CacheEntry<T> { ts: number; data: T; }

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
    return entry.data;
  } catch { return null; }
}

function cacheSet<T>(key: string, data: T): void {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

function cacheClear(): void {
  localStorage.removeItem(CACHE_KEY_CBOM);
  localStorage.removeItem(CACHE_KEY_ASSETS);
}

function cacheAge(key: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<unknown> = JSON.parse(raw);
    const mins = Math.round((Date.now() - entry.ts) / 60000);
    if (mins < 60)  return `${mins}m ago`;
    return `${Math.round(mins / 60)}h ago`;
  } catch { return null; }
}

// ── Light Theme Palette ───────────────────────────────────────────────────────
const L = {
  pageBg:      "#f5f7fa",
  panelBg:     "#ffffff",
  panelBorder: "#e2e8f0",
  rowHover:    "rgba(59,130,246,0.04)",
  subtleBg:    "#f8fafc",
  insetBg:     "#f1f5f9",
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
  border:      "#e2e8f0",
  borderLight: "#f1f5f9",
};

const LS = {
  page: {
    background: L.pageBg,
    minHeight: "100vh",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column" as const,
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
  input: {
    background: L.insetBg,
    border: `1px solid ${L.border}`,
    borderRadius: 5,
    color: L.text1,
    padding: "7px 10px",
    fontSize: 12,
    outline: "none",
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

// ── INR Formatter ─────────────────────────────────────────────────────────────
const INR_RATE = 83;
function toINR(usd: number): number { return Math.round(usd * INR_RATE); }
function fmtINR(usd: number): string {
  const inr = toINR(usd);
  if (inr >= 10000000) return `₹${(inr/10000000).toFixed(2)}Cr`;
  if (inr >= 100000)   return `₹${(inr/100000).toFixed(1)}L`;
  return `₹${inr.toLocaleString("en-IN")}`;
}
function fmtINRFull(usd: number): string {
  return `₹${toINR(usd).toLocaleString("en-IN")}`;
}

const EFFORT: Record<string, number> = {
  "Web App": 2, "Web Apps": 2,
  "API": 3,     "APIs": 3,
  "Server": 5,  "Servers": 5,
  "LB": 1,      "Other": 3,
};
const DEV_RATE_USD = 800;

function normaliseDomain(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

function appMatchesDomain(appName: string, clientDomain: string): boolean {
  if (!clientDomain) return true;
  const app = normaliseDomain(appName), domain = normaliseDomain(clientDomain);
  return app === domain || app.endsWith("." + domain);
}

const GENERIC_NAMES = new Set(["api","web","app","server","lb","www","cdn","mail","vpn"]);

function matchAsset(appName: string, assets: any[]): any | undefined {
  const root = appName?.split(".")[0]?.toLowerCase().replace(/[^a-z0-9]/g,"") ?? "";
  if (!root || root.length < 3 || GENERIC_NAMES.has(root)) return undefined;
  const exact = assets.find(a => a.name?.toLowerCase().replace(/[^a-z0-9]/g,"") === root);
  if (exact) return exact;
  const sw = assets.find(a => { const n = a.name?.toLowerCase().replace(/[^a-z0-9]/g,"") ?? ""; return n.length>=3&&root.startsWith(n); });
  if (sw) return sw;
  const contains = assets.filter(a => { const n = a.name?.toLowerCase().replace(/[^a-z0-9]/g,"") ?? ""; return n.length>=3&&root.includes(n); });
  return contains.length === 1 ? contains[0] : undefined;
}

function riskWeight(app: any, asset: any): number {
  const isPublic = asset?.type==="Web Apps"||asset?.type==="Web App";
  let w = 1;
  if (app?.keylen?.startsWith("1024")) w += 2;
  if (app?.status==="weak"||app?.status==="WEAK") w += 1;
  if (isPublic) w *= 1.5;
  if (!app?.pqc) w += 0.5;
  return Math.round(w * 10) / 10;
}

function riskLabel(w: number): "Critical"|"High"|"Medium"|"Low" {
  if (w>=4.5) return "Critical"; if (w>=3) return "High"; if (w>=2) return "Medium"; return "Low";
}

function riskVariant(r: string): any {
  return r==="Critical"?"red":r==="High"?"orange":r==="Medium"?"yellow":"green";
}

function useBreakpoint() {
  const get = () => { const w=window.innerWidth; if(w<480)return"mobile"as const; if(w<900)return"tablet"as const; return"desktop"as const; };
  const [bp, setBp] = useState(get);
  useEffect(() => { const h=()=>setBp(get()); window.addEventListener("resize",h); return()=>window.removeEventListener("resize",h); }, []);
  return bp;
}

// ── Skeleton Components ───────────────────────────────────────────────────────
function Shimmer({ w="100%", h=16, radius=4, style={} }: { w?: string|number; h?: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s ease infinite",
      flexShrink: 0,
      ...style,
    }}/>
  );
}

function SkeletonMetricCard() {
  return (
    <div style={{ background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <Shimmer w="55%" h={8} style={{ marginBottom: 10 }}/>
      <Shimmer w="70%" h={26} style={{ marginBottom: 8 }}/>
      <Shimmer w="45%" h={8}/>
    </div>
  );
}

function SkeletonGaugePanel() {
  return (
    <div style={{ ...LS.panel }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "8px 8px 0 0" }}>
        <Shimmer w={160} h={9}/>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {/* Fake gauge arc */}
        <div style={{ width: 200, height: 120, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative" }}>
          <div style={{
            width: 180, height: 90,
            borderRadius: "90px 90px 0 0",
            border: "14px solid #e2e8f0",
            borderBottom: "none",
            background: "transparent",
            animation: "shimmer 1.4s ease infinite",
          }}/>
          <div style={{ position: "absolute", bottom: 0, textAlign: "center" }}>
            <Shimmer w={60} h={32} radius={6} style={{ margin: "0 auto 6px" }}/>
            <Shimmer w={80} h={9} radius={4} style={{ margin: "0 auto" }}/>
          </div>
        </div>
        {/* Milestone bars */}
        {[100, 80, 65, 90, 40].map((w, i) => (
          <div key={i} style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <Shimmer w={`${w}%`} h={9}/>
              <Shimmer w={30} h={9} style={{ marginLeft: 8 }}/>
            </div>
            <Shimmer w="100%" h={4} radius={2}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonTableRows({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} style={{ borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }}>
          <td style={{ padding: "10px 8px" }}><Shimmer w={18} h={9}/></td>
          <td style={{ padding: "10px 8px" }}><Shimmer w={140} h={10}/></td>
          <td style={{ padding: "10px 8px" }}><Shimmer w={60} h={18} radius={3}/></td>
          <td style={{ padding: "10px 8px" }}><Shimmer w={55} h={18} radius={3}/></td>
          <td style={{ padding: "10px 8px" }}><Shimmer w={50} h={10}/></td>
          <td style={{ padding: "10px 8px" }}><Shimmer w={120} h={9}/></td>
          <td style={{ padding: "10px 8px" }}><Shimmer w={45} h={10}/></td>
          <td style={{ padding: "10px 8px" }}><Shimmer w={70} h={9}/></td>
          <td style={{ padding: "10px 8px", textAlign: "center" }}><Shimmer w={52} h={18} radius={3} style={{ margin: "0 auto" }}/></td>
          <td style={{ padding: "10px 8px" }}><Shimmer w={30} h={10}/></td>
          <td style={{ padding: "10px 8px" }}><Shimmer w={65} h={10}/></td>
          <td style={{ padding: "10px 8px", textAlign: "center" }}><Shimmer w={12} h={12} radius={6} style={{ margin: "0 auto" }}/></td>
          <td style={{ padding: "10px 8px", textAlign: "center" }}><Shimmer w={12} h={12} radius={6} style={{ margin: "0 auto" }}/></td>
        </tr>
      ))}
    </>
  );
}

function SkeletonRoadmapCards({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderBottom: `1px solid ${L.borderLight}`, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Shimmer w={24} h={9}/>
              <Shimmer w={160} h={11}/>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Shimmer w={52} h={18} radius={3}/>
              <Shimmer w={52} h={18} radius={3}/>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Shimmer w={50} h={9}/>
            <Shimmer w={30} h={9}/>
            <Shimmer w={55} h={9}/>
            <Shimmer w={40} h={9}/>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Cache status badge ────────────────────────────────────────────────────────
function CacheBadge({ age, onRefresh }: { age: string | null; onRefresh: () => void }) {
  if (!age) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        fontSize: 8, fontWeight: 600, color: L.text3,
        background: L.insetBg, border: `1px solid ${L.border}`,
        borderRadius: 3, padding: "2px 7px", letterSpacing: ".06em",
      }}>
        CACHED · {age}
      </span>
      <button
        onClick={onRefresh}
        title="Force re-fetch from API"
        style={{
          ...LS.btn, fontSize: 9, padding: "3px 8px",
          color: L.blue, borderColor: `${L.blue}40`,
          background: `${L.blue}0d`,
        }}
      >↺ REFRESH</button>
    </div>
  );
}

// ── Light Panel Components ────────────────────────────────────────────────────
function LPanel({ children, style={} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{...LS.panel, ...style}}>{children}</div>;
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

function LMetricCard({ label, value, sub, color }: { label: string; value: string|number; sub: string; color: string }) {
  return (
    <div style={{
      background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8,
      padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 8, color: L.text4, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: L.text3, marginTop: 5 }}>{sub}</div>
    </div>
  );
}



// ── Score Gauge ───────────────────────────────────────────────────────────────
function ScoreGauge({ score, size=200 }: { score:number; size?:number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame:number, cur=0;
    const step=()=>{ cur+=(score-cur)*0.07; if(Math.abs(score-cur)<0.3)cur=score; setShown(Math.round(cur)); if(cur!==score)frame=requestAnimationFrame(step); };
    frame=requestAnimationFrame(step); return()=>cancelAnimationFrame(frame);
  },[score]);
  useEffect(() => {
    const c=ref.current; if(!c)return;
    const ctx=c.getContext("2d")!;
    const W=size,H=Math.round(size*0.6),cx=W/2,cy=H+5,r=Math.round(size*0.4);
    c.width=W; c.height=H; ctx.clearRect(0,0,W,H);
    ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,0,false);
    ctx.lineWidth=Math.round(size*0.06); ctx.strokeStyle="#e2e8f0"; ctx.stroke();
    const col=shown>=70?L.green:shown>=40?L.yellow:L.red;
    const safePct = Math.min(0.999, Math.max(0.001, shown/100));
    ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,Math.PI+Math.PI*safePct,false);
    ctx.lineWidth=Math.round(size*0.06); ctx.strokeStyle=col; ctx.lineCap="round";
    ctx.shadowColor=col; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0;
    for(let i=0;i<=10;i++){
      const a=Math.PI+(Math.PI*i)/10;
      ctx.beginPath();
      ctx.moveTo(cx+(r-size*0.09)*Math.cos(a),cy+(r-size*0.09)*Math.sin(a));
      ctx.lineTo(cx+(r-size*0.05)*Math.cos(a),cy+(r-size*0.05)*Math.sin(a));
      ctx.strokeStyle="#cbd5e1"; ctx.lineWidth=1; ctx.stroke();
    }
  },[shown,size]);
  const col=shown>=70?L.green:shown>=40?L.yellow:L.red;
  const label=shown>=70?"GOOD":shown>=40?"AT RISK":"CRITICAL";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%"}}>
      <canvas ref={ref} style={{width:"100%",maxWidth:size,height:"auto"}}/>
      <div style={{marginTop:-6,textAlign:"center"}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:Math.round(size*0.18),fontWeight:900,color:col}}>{shown}</div>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:col,letterSpacing:".2em",marginTop:2}}>{label}</div>
        <div style={{fontSize:9,color:L.text3,marginTop:4}}>MIGRATION PROGRESS</div>
      </div>
    </div>
  );
}

// ── Roadmap Card ──────────────────────────────────────────────────────────────
function RoadmapCard({ a, i }: { a:any; i:number }) {
  const [open, setOpen] = useState(false);
  const ps = a.pqcScore as PQCScoreBreakdown|undefined;
  return (
    <div style={{
      borderBottom:`1px solid ${L.borderLight}`, background: L.panelBg,
      animation:`fadeIn 0.3s ease both`, animationDelay:`${i*0.04}s`, transition: "background 0.15s",
    }}
      onMouseEnter={e=>(e.currentTarget.style.background=L.subtleBg)}
      onMouseLeave={e=>(e.currentTarget.style.background=L.panelBg)}
    >
      <div onClick={()=>setOpen(o=>!o)} style={{padding:"10px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0,flex:1}}>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:L.text4,flexShrink:0}}>#{i+1}</span>
          <span style={{fontSize:12,color:L.blue,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{a.app}</span>
          {a.isPublic&&<span style={{fontSize:7,color:L.cyan,border:`1px solid ${L.cyan}55`,borderRadius:2,padding:"1px 4px",flexShrink:0,background:`${L.cyan}10`}}>PUB</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          {ps&&<span style={{fontSize:8,fontWeight:700,color:ps.color,border:`1px solid ${ps.color}55`,borderRadius:2,padding:"1px 5px",background:`${ps.color}10`}}>{ps.active?"ACTIVE":`${ps.score}/100`}</span>}
          <Badge v={riskVariant(a.risk)}>{a.risk}</Badge>
          <span style={{fontSize:10,color:L.text4}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      <div style={{padding:"0 14px 10px",display:"flex",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:9,color:L.text3}}>{a.assetType}</span>
        <span style={{fontSize:9,color:L.cyan,fontWeight:600}}>{a.days}d</span>
        <span style={{fontSize:9,color:L.orange,fontWeight:600}}>{fmtINR(a.cost)}</span>
        <span style={{fontSize:9,color:a.pqc?L.green:L.red,fontWeight:600}}>{a.pqc?"PQC ✓":"PQC ✗"}</span>
      </div>
      {open&&ps&&(
        <div style={{padding:"0 14px 12px",borderTop:`1px solid ${L.borderLight}`,paddingTop:10,background:L.insetBg}}>
          {Object.values(ps.criteria).map((c:any)=>(
            <div key={c.label} style={{display:"flex",alignItems:"center",gap:8,fontSize:9,marginBottom:4}}>
              <span style={{color:c.pass?"#16a34a":c.pts>0?"#b45309":"#dc2626",width:10,fontWeight:700}}>{c.pass?"✓":c.pts>0?"~":"✗"}</span>
              <span style={{color:L.text2,flex:1}}>{c.label}</span>
              <span style={{color:L.text1,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{c.pts}/{c.max}</span>
            </div>
          ))}
          <div style={{fontSize:8,color:L.text3,marginTop:6,fontStyle:"italic"}}>
            {ps.active?"Kyber hybrid active — ACTIVE status confirmed.":ps.score>=70?"Address remaining criteria then deploy Kyber hybrid.":"Significant gaps — fix cert key and wildcard first."}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PQCReadinessPage() {
  const [cbomData,     setCbomData]     = useState<any[]>([]);
  const [assets,       setAssets]       = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(false);
  const [fromCache,    setFromCache]    = useState(false);
  const [cacheAge,     setCacheAge]     = useState<string|null>(null);
  const [teamSize,     setTeamSize]     = useState(2);
  const [devRate,      setDevRate]      = useState(DEV_RATE_USD);
  const [domainInput,  setDomainInput]  = useState("");
  const [activeDomain, setActiveDomain] = useState("");
  const [clientName,   setClientName]   = useState("");

  const bp=useBreakpoint(), isMobile=bp==="mobile", isTablet=bp==="tablet", isDesktop=bp==="desktop";

  // ── Data fetch with cache ───────────────────────────────────────────────────
  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    setFetchError(false);

    // Try cache first (unless force-refreshing)
    if (!forceRefresh) {
      const cachedCbom   = cacheGet<any>(CACHE_KEY_CBOM);
      const cachedAssets = cacheGet<any>(CACHE_KEY_ASSETS);
      if (cachedCbom && cachedAssets) {
        const merged = buildMerged(cachedCbom, cachedAssets);
        if (merged.length) setCbomData(merged);
        if (cachedAssets?.assets?.length) setAssets(cachedAssets.assets);
        setFromCache(true);
        setCacheAge(cacheAge => cacheAge); // will be read fresh below
        setLoading(false);
        return;
      }
    }

    // Fetch from API
    try {
      const [cbom, assetsData] = await Promise.all([
        fetch(`${API}/cbom`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch(`${API}/assets`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      ]);
      cacheSet(CACHE_KEY_CBOM,   cbom);
      cacheSet(CACHE_KEY_ASSETS, assetsData);
      const merged = buildMerged(cbom, assetsData);
      if (merged.length) setCbomData(merged);
      if (assetsData?.assets?.length) setAssets(assetsData.assets);
      setFromCache(false);
    } catch {
      setFetchError(true);
      // fall through — displayCbom/displayAssets will use MOCK below
    }
    setLoading(false);
  };

  function buildMerged(cbom: any, assetsData: any): any[] {
    const registeredMap: Record<string, any> = {};
    (assetsData?.assets ?? []).forEach((a: any) => { if (a.name) registeredMap[a.name] = a; });
    const cbomApps: any[] = (cbom.apps ?? []).map((app: any) => {
      const reg = registeredMap[app.app];
      if (!reg) return app;
      return { ...app, is_wildcard: reg.is_wildcard ?? app.is_wildcard, criticality: reg.criticality, owner: reg.owner, compliance_scope: reg.compliance_scope, financial_exposure: reg.financial_exposure };
    });
    const cbomDomains = new Set(cbomApps.map((a: any) => a.app));
    const registeredOnly = (assetsData?.assets ?? [])
      .filter((a: any) => a.id && !cbomDomains.has(a.name))
      .map((a: any) => ({ app: a.name, keylen: a.keylen||"—", cipher: a.cipher||"—", tls: a.tls||"—", ca: a.ca||"—", status: a.risk==="weak"?"weak":"ok", pqc: false, pqc_support: "none", key_exchange_group: a.key_exchange_group||null, is_wildcard: a.is_wildcard??null, criticality: a.criticality, owner: a.owner, compliance_scope: a.compliance_scope, financial_exposure: a.financial_exposure }));
    return [...cbomApps, ...registeredOnly];
  }

  useEffect(() => { loadData(); }, []);

  // Update cache age display after load
  useEffect(() => {
    if (fromCache) {
      setCacheAge(cacheAge_(CACHE_KEY_CBOM));
    }
  }, [fromCache]);

  function cacheAge_(key: string): string | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      const mins = Math.round((Date.now() - entry.ts) / 60000);
      if (mins < 60) return `${mins}m ago`;
      return `${Math.round(mins / 60)}h ago`;
    } catch { return null; }
  }

  function handleForceRefresh() {
    cacheClear();
    setFromCache(false);
    setCacheAge(null);
    loadData(true);
  }

  const displayCbom   = cbomData.length ? cbomData   : MOCK_CBOM;
  const displayAssets = assets.length   ? assets     : MOCK_ASSETS;

  const scopedCbom  = activeDomain ? displayCbom.filter((a:any)=>appMatchesDomain(a.app??"",activeDomain)) : displayCbom;
  const uniqueCbom  = scopedCbom.filter((a:any,i:number,arr:any[])=>arr.findIndex((b:any)=>b.app===a.app)===i);

  const withPQCScore = uniqueCbom.map((app:any)=>{
    const analysis = fullAnalysis(app.cipher??"", app.tls??"", app.key_exchange_group??null);
    const ps = pqcReadinessScore(analysis.components, app.tls, app.keylen, app.is_wildcard??false);
    return {...app, analysis, pqcScore:ps};
  });

  const n = withPQCScore.length || 1;

  const allCertsStrong = withPQCScore.every((a: any) => { const bits = parseInt(String(a.keylen ?? "0").match(/(\d+)/)?.[1] ?? "0", 10); return bits >= 4096 || bits === 384; });
  const noWildcards = withPQCScore.every((a: any) => a.is_wildcard === false);
  const allAES256 = withPQCScore.every((a: any) => { const bulk = a.analysis?.components?.bulkCipher ?? ""; return bulk === "AES-256-GCM" || bulk === "ChaCha20-Poly1305"; });
  const allTLS13 = withPQCScore.every((a: any) => normaliseTLS(a.tls) === "1.3");
  const anyKyber = withPQCScore.some((a: any) => a.pqcScore?.active);

  const migrationScore = Math.round(
    (allCertsStrong ? 20 : 0) + (noWildcards ? 20 : 0) + (allAES256 ? 20 : 0) + (allTLS13 ? 20 : 0) + (anyKyber ? 20 : 0)
  );

  const certStrongPct = Math.round(withPQCScore.filter((a:any)=>{ const b=parseInt(String(a.keylen??"0").match(/(\d+)/)?.[1]??"0",10); return b>=4096||b===384; }).length/n*100);
  const noWildPct     = Math.round(withPQCScore.filter((a:any)=>a.is_wildcard===false).length/n*100);
  const aes256Pct     = Math.round(withPQCScore.filter((a:any)=>{ const bulk=a.analysis?.components?.bulkCipher??""; return bulk==="AES-256-GCM"||bulk==="ChaCha20-Poly1305"; }).length/n*100);
  const tls13Pct      = Math.round(withPQCScore.filter((a:any)=>normaliseTLS(a.tls)==="1.3").length/n*100);

  const milestones = [
    { label:"All certs RSA-4096 / EC P-384", pct: certStrongPct,  done: allCertsStrong },
    { label:"Zero wildcard certificates",    pct: noWildPct,       done: noWildcards    },
    { label:"AES-256-GCM on all apps",       pct: aes256Pct,       done: allAES256      },
    { label:"TLS 1.2 fully eliminated",      pct: tls13Pct,        done: allTLS13       },
    { label:"Kyber hybrid deployed",         pct: anyKyber?100:0,  done: anyKyber       },
  ];

  const weakApps = withPQCScore.filter((a:any)=>a.status==="weak"||a.status==="WEAK"||!a.pqc||a.keylen?.startsWith("1024"));

  const enriched = weakApps.map((app:any)=>{
    const asset=matchAsset(app.app,displayAssets);
    const assetType=asset?.type??"Other";
    const days=EFFORT[assetType]??3;
    const cost=days*devRate;
    const weight=riskWeight(app,asset);
    const risk=riskLabel(weight);
    const isPublic=asset?.type==="Web Apps"||asset?.type==="Web App";
    return {...app,asset,assetType,days,cost,weight,risk,isPublic};
  }).sort((a:any,b:any)=>b.weight-a.weight);

  const total     = withPQCScore.length;
  const pqcReady  = withPQCScore.filter((a:any)=>a.pqc&&a.status!=="weak"&&a.status!=="WEAK").length;
  const totalDays = enriched.reduce((s:number,a:any)=>s+a.days,0);
  const calDays   = Math.ceil(totalDays/Math.max(teamSize,1));
  const totalCost = enriched.reduce((s:number,a:any)=>s+a.cost,0);
  const critCount = enriched.filter((a:any)=>a.risk==="Critical").length;
  const highCount = enriched.filter((a:any)=>a.risk==="High").length;
  const unmatchedCount = enriched.filter((a:any)=>!a.asset).length;

  const completionDate=new Date(); completionDate.setDate(completionDate.getDate()+calDays);
  const dateStr=completionDate.toLocaleDateString("en-IN",{month:"short",day:"numeric",year:"numeric"});

  function applyDomain(){ setActiveDomain(domainInput.trim()); }
  function clearFilter(){ setDomainInput(""); setActiveDomain(""); setClientName(""); }

  function exportCSV(){
    const rows=[
      ["Priority","App","Asset Type","Risk","Key Length","Cipher","TLS","CA","PQC Score","PQC Label","Days","Cost (INR)","Public","PQC Active"],
      ...enriched.map((a:any,i:number)=>[i+1,a.app,a.assetType,a.risk,a.keylen,a.cipher,a.tls,a.ca,a.pqcScore?.score??0,a.pqcScore?.active?"ACTIVE":a.pqcScore?.label??"—",a.days,fmtINRFull(a.cost),a.isPublic?"Yes":"No",a.pqc?"Yes":"No"])
    ];
    const csv=rows.map((r:any)=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
    const el=document.createElement("a"); el.href=url; el.download=`rebel-pqc-${activeDomain||"all"}.csv`; el.click();
  }

  const gaugeSize=isMobile?160:200;
  const metricCols=isMobile?"1fr 1fr":isTablet?"repeat(3,1fr)":"repeat(5,1fr)";
  const scoreColor = migrationScore>=70?L.green:migrationScore>=40?L.yellow:L.red;

  return (
    <div style={LS.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        input[type=range]{accent-color:${L.blue};}
        input[type=range]::-webkit-slider-thumb{background:${L.blue};}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${L.insetBg};}
        ::-webkit-scrollbar-thumb{background:${L.border};border-radius:3px;}
      `}</style>

      {/* DOMAIN FILTER */}
      <LPanel>
        <LPanelHeader
          left="REPORT SCOPE — CLIENT DOMAIN FILTER"
          right={fromCache ? <CacheBadge age={cacheAge} onRefresh={handleForceRefresh}/> : undefined}
        />
        <div style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <div>
              <div style={{fontSize:8,color:L.text3,letterSpacing:".12em",marginBottom:5,textTransform:"uppercase",fontWeight:600}}>CLIENT DOMAIN</div>
              <div style={{display:"flex",gap:6}}>
                <input value={domainInput} onChange={e=>setDomainInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&applyDomain()} placeholder="e.g. barclays.com" style={{...LS.input,flex:1}}/>
                <button style={{...LS.btn,background:`${L.blue}15`,borderColor:`${L.blue}40`,color:L.blue}} onClick={applyDomain}>APPLY</button>
                {activeDomain&&<button style={{...LS.btn}} onClick={clearFilter}>CLEAR</button>}
              </div>
            </div>
            <div>
              <div style={{fontSize:8,color:L.text3,letterSpacing:".12em",marginBottom:5,textTransform:"uppercase",fontWeight:600}}>CLIENT NAME (for PDF)</div>
              <input value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="e.g. Barclays Bank PLC" style={{...LS.input,width:"100%"}}/>
            </div>
          </div>

          {/* API endpoint indicator */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:7,fontFamily:"'DM Mono',monospace",color:L.text4,letterSpacing:".08em"}}>API</span>
            <span style={{fontSize:8,fontFamily:"'DM Mono',monospace",color:fetchError?L.red:L.green,fontWeight:600}}>
              {fetchError?"✗":"✓"} {API}
            </span>
            {fetchError&&<span style={{fontSize:8,color:L.red}}>— showing demo data</span>}
            {loading&&<span style={{fontSize:8,color:L.blue,animation:"fadeIn 0.3s ease"}}>fetching…</span>}
          </div>

          {activeDomain&&(
            <div style={{display:"flex",alignItems:"center",gap:10,background:`${L.blue}0a`,border:`1px solid ${L.blue}25`,borderRadius:5,padding:"7px 12px"}}>
              <span style={{fontSize:9,color:L.text3,fontWeight:600}}>ACTIVE SCOPE</span>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:L.blue,fontWeight:600}}>*.{normaliseDomain(activeDomain)}</span>
              <span style={{fontSize:9,color:L.text3,marginLeft:"auto"}}>
                <b style={{color:L.text1}}>{uniqueCbom.length}</b> apps · <b style={{color:L.red}}>{enriched.length}</b> need migration
              </span>
            </div>
          )}
          {activeDomain&&uniqueCbom.length===0&&!loading&&(
            <div style={{background:`${L.red}0a`,border:`1px solid ${L.red}25`,borderRadius:5,padding:"8px 12px",fontSize:10,color:L.text2}}>
              ⚠ No assets found for <b style={{color:L.red}}>*.{normaliseDomain(activeDomain)}</b>
            </div>
          )}
        </div>
      </LPanel>

      {unmatchedCount>0&&!loading&&(
        <div style={{background:`${L.yellow}10`,border:`1px solid ${L.yellow}40`,borderRadius:5,padding:"8px 14px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:L.yellow,fontSize:14}}>⚠</span>
          <span style={{fontSize:10,color:L.text2}}><b style={{color:L.yellow}}>{unmatchedCount}</b> asset{unmatchedCount>1?"s":""} unmatched — defaulted to "Other".</span>
        </div>
      )}

      {/* METRICS */}
      <div style={{display:"grid",gridTemplateColumns:metricCols,gap:isMobile?8:9}}>
        {loading
          ? Array.from({length:5}).map((_,i)=><SkeletonMetricCard key={i}/>)
          : <>
              <LMetricCard label="MIGRATION SCORE" value={`${migrationScore}/100`} sub="Migration progress" color={scoreColor}/>
              <LMetricCard label="NEED MIGRATION" value={enriched.length} sub="Weak assets" color={L.red}/>
              <LMetricCard label="CRITICAL" value={critCount} sub="Immediate action" color={L.red}/>
              <LMetricCard label="EST. DAYS" value={calDays} sub={`${teamSize} dev team`} color={L.cyan}/>
              <div style={isMobile?{gridColumn:"1/-1"}:{}}>
                <LMetricCard label="EST. COST (INR)" value={fmtINR(totalCost)} sub={`At ${fmtINR(devRate)}/day`} color={L.orange}/>
              </div>
            </>
        }
      </div>

      {/* SCORE + PLAN */}
      <div style={{display:"grid",gridTemplateColumns:isDesktop?"1fr 1fr":"1fr",gap:isMobile?8:10}}>
        {loading
          ? <><SkeletonGaugePanel/><SkeletonGaugePanel/></>
          : <>
              <LPanel>
                <LPanelHeader left="PQC MIGRATION PROGRESS" />
                <div style={{padding:14,display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
                  <div style={{width:"100%",maxWidth:gaugeSize+40,margin:"0 auto"}}><ScoreGauge score={migrationScore} size={gaugeSize}/></div>
                  <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>
                    {milestones.map(m=>(
                      <div key={m.label}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:9,color:m.done?L.green:L.text2,display:"flex",alignItems:"center",gap:5,fontWeight:m.done?600:400}}>
                            <span style={{fontSize:10,color:m.done?L.green:L.text4}}>{m.done?"✓":"○"}</span>{m.label}
                          </span>
                          <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:m.done?L.green:L.text3,fontWeight:600}}>{m.pct}%</span>
                        </div>
                        <div style={{height:4,background:L.insetBg,borderRadius:2,border:`1px solid ${L.border}`}}>
                          <div style={{height:"100%",width:`${m.pct}%`,background:m.done?L.green:m.pct>50?L.yellow:L.orange,borderRadius:2,transition:"width 0.8s ease"}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{width:"100%",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[
                      {label:"PQC ACTIVE",val:withPQCScore.filter((a:any)=>a.pqcScore?.active).length,color:L.green},
                      {label:"WEAK",      val:enriched.length,                                         color:L.red},
                      {label:"IN SCOPE",  val:total,                                                   color:L.blue},
                    ].map(item=>(
                      <div key={item.label} style={{background:L.subtleBg,border:`1px solid ${L.border}`,borderRadius:5,padding:isMobile?"6px 4px":"8px 6px",textAlign:"center"}}>
                        <div style={{fontFamily:"'DM Mono',monospace",fontSize:isMobile?16:20,color:item.color,fontWeight:700}}>{item.val}</div>
                        <div style={{fontSize:isMobile?7:8,color:L.text3,marginTop:3,letterSpacing:".08em",fontWeight:600}}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </LPanel>

              <LPanel>
                <LPanelHeader left="MIGRATION PLAN SUMMARY" />
                <div style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{display:"grid",gridTemplateColumns:(isTablet||isDesktop)?"1fr 1fr":"1fr",gap:10}}>
                    <div style={{background:L.subtleBg,border:`1px solid ${L.border}`,borderRadius:5,padding:12}}>
                      <div style={{fontSize:8,color:L.text3,marginBottom:5,letterSpacing:".12em",textTransform:"uppercase",fontWeight:600}}>ESTIMATED COMPLETION</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:isMobile?13:17,color:L.cyan,fontWeight:700}}>{dateStr}</div>
                      <div style={{fontSize:9,color:L.text2,marginTop:4}}>{calDays}d · {totalDays} dev days · {enriched.length} assets</div>
                    </div>
                    <div style={{background:"#fff5f5",border:`1px solid ${L.red}22`,borderRadius:5,padding:12}}>
                      <div style={{fontSize:8,color:L.text3,marginBottom:5,letterSpacing:".12em",textTransform:"uppercase",fontWeight:600}}>TOTAL MIGRATION COST</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:isMobile?13:17,color:L.orange,fontWeight:700}}>{fmtINR(totalCost)}</div>
                      <div style={{fontSize:9,color:L.text2,marginTop:4}}>{critCount} critical · {highCount} high · {fmtINR(devRate)}/day</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:(isTablet||isDesktop)?"1fr 1fr":"1fr",gap:12}}>
                    {[
                      { label:"TEAM SIZE", display:`${teamSize} devs`, min:1, max:10, step:1, val:teamSize, set:(v:number)=>setTeamSize(v), l:"1", r:"10" },
                      { label:"DEV RATE / DAY (INR)", display:fmtINR(devRate), min:200, max:2000, step:100, val:devRate, set:(v:number)=>setDevRate(v), l:fmtINR(200), r:fmtINR(2000) },
                    ].map(sl=>(
                      <div key={sl.label}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:9,color:L.text3,letterSpacing:".1em",textTransform:"uppercase",fontWeight:600}}>{sl.label}</span>
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:L.blue,fontWeight:700}}>{sl.display}</span>
                        </div>
                        <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={e=>sl.set(Number(e.target.value))} style={{width:"100%",cursor:"pointer"}}/>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontSize:8,color:L.text4}}>{sl.l}</span>
                          <span style={{fontSize:8,color:L.text4}}>{sl.r}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </LPanel>
            </>
        }
      </div>

      {/* RISK DISTRIBUTION */}
      <LPanel>
        <LPanelHeader left="RISK DISTRIBUTION" />
        <div style={{padding:14,display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
          {loading
            ? Array.from({length:4}).map((_,i)=>(
                <div key={i} style={{borderRadius:6,padding:12,border:`1px solid ${L.border}`,background:L.subtleBg}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><Shimmer w={55} h={9}/><Shimmer w={24} h={20}/></div>
                  <Shimmer w="100%" h={4} radius={2} style={{marginBottom:8}}/>
                  <Shimmer w={60} h={8}/>
                </div>
              ))
            : (["Critical","High","Medium","Low"] as const).map(level=>{
                const count=enriched.filter((a:any)=>a.risk===level).length;
                const pct=enriched.length?Math.round(count/enriched.length*100):0;
                const color=level==="Critical"?L.red:level==="High"?L.orange:level==="Medium"?L.yellow:L.green;
                const bg=level==="Critical"?"#fff5f5":level==="High"?"#fff7ed":level==="Medium"?"#fffbeb":"#f0fdf4";
                return (
                  <div key={level} style={{background:bg,border:`1px solid ${color}22`,borderRadius:6,padding:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontSize:9,color,letterSpacing:".12em",fontWeight:700,textTransform:"uppercase"}}>{level}</span>
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:15,color,fontWeight:800}}>{count}</span>
                    </div>
                    <div style={{height:4,background:`${color}20`,borderRadius:2}}>
                      <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:2,transition:"width 0.8s ease"}}/>
                    </div>
                    <div style={{fontSize:8,color:L.text3,marginTop:6,fontWeight:500}}>
                      {enriched.filter((a:any)=>a.risk===level).reduce((s:number,a:any)=>s+a.days,0)} dev days
                    </div>
                  </div>
                );
              })
          }
        </div>
      </LPanel>

      {/* ROADMAP */}
      <LPanel>
        <LPanelHeader left="MIGRATION ROADMAP" right={
          !loading&&<div style={{display:"flex",gap:6}}>
            <button style={{...LS.btn,fontSize:isMobile?9:11}} onClick={exportCSV}>↓ CSV</button>
            <button
              style={{...LS.btn,fontSize:isMobile?9:11,background:`${L.blue}15`,borderColor:`${L.blue}40`,color:L.blue,fontWeight:700}}
              onClick={() => exportAuditPDF({
                      enriched,
                      migrationScore,
                      pqcReady,
                      total,
                      totalDays,
                      calDays,
                      totalCostINR: totalCost,
                      teamSize,
                      devRateINR:   devRate,
                      completionDate: dateStr,
                      clientName,
                      clientDomain: activeDomain,
                      milestones,
                    })}
            >{isMobile?"⬡ PDF":"⬡ AUDIT PDF"}</button>
          </div>
        }/>

        {/* Mobile card view */}
        <div style={{display:"block"}} className="pqc-show-cards">
          <style>{`@media(min-width:900px){.pqc-show-cards{display:none!important;}}`}</style>
          <div style={{maxHeight:isMobile?400:520,overflowY:"auto"}}>
            {loading
              ? <SkeletonRoadmapCards count={5}/>
              : enriched.length
                ? enriched.map((a:any,i:number)=><RoadmapCard key={i} a={a} i={i}/>)
                : <div style={{padding:24,textAlign:"center",fontSize:10,color:L.green,fontWeight:600}}>✓ No weak assets</div>
            }
          </div>
        </div>

        {/* Desktop table view */}
        <div style={{display:"none"}} className="pqc-show-table">
          <style>{`@media(min-width:900px){.pqc-show-table{display:block!important;}}`}</style>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
              <thead>
                <tr style={{background:L.subtleBg,borderBottom:`2px solid ${L.border}`}}>
                  {["#","APPLICATION","TYPE","RISK","KEY LEN","CIPHER","TLS","CA","PQC SCORE","DAYS","COST (INR)","PUB","PQC"].map(h=>(
                    <th key={h} style={{padding:"7px 8px",fontSize:8,fontWeight:700,color:L.text3,textTransform:"uppercase",letterSpacing:".08em",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? <SkeletonTableRows count={7}/>
                  : enriched.map((a:any,i:number)=>{
                      const ps=a.pqcScore as PQCScoreBreakdown|undefined;
                      return (
                        <tr key={i} style={{borderBottom:`1px solid ${L.borderLight}`,background:i%2===0?L.panelBg:L.subtleBg}}>
                          <td style={{padding:"7px 8px",fontFamily:"'DM Mono',monospace",fontSize:9,color:L.text4}}>{i+1}</td>
                          <td style={{padding:"7px 8px",color:L.blue,fontSize:10,fontWeight:500}}>{a.app}</td>
                          <td style={{padding:"7px 8px"}}><span style={{fontSize:8,color:L.text3,background:L.insetBg,border:`1px solid ${L.border}`,borderRadius:3,padding:"1px 5px",fontWeight:600}}>{a.assetType}</span></td>
                          <td style={{padding:"7px 8px"}}><span style={{fontSize:8,fontWeight:700,color:a.risk==="Critical"?L.red:a.risk==="High"?L.orange:a.risk==="Medium"?L.yellow:L.green,background:a.risk==="Critical"?"#fef2f2":a.risk==="High"?"#fff7ed":a.risk==="Medium"?"#fffbeb":"#f0fdf4",border:`1px solid ${a.risk==="Critical"?L.red:a.risk==="High"?L.orange:a.risk==="Medium"?L.yellow:L.green}33`,borderRadius:3,padding:"1px 6px"}}>{a.risk}</span></td>
                          <td style={{padding:"7px 8px",fontSize:10,fontWeight:600,fontFamily:"'DM Mono',monospace",color:a.keylen?.startsWith("1024")?L.red:a.keylen?.startsWith("2048")?L.yellow:L.green}}>{a.keylen}</td>
                          <td style={{padding:"7px 8px",fontSize:9,color:L.text3,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.cipher}</td>
                          <td style={{padding:"7px 8px"}}><span style={{fontSize:8,fontWeight:600,color:a.tls==="1.0"?L.red:a.tls==="1.2"?L.yellow:L.green}}>TLS {a.tls}</span></td>
                          <td style={{padding:"7px 8px",fontSize:9,color:L.text3}}>{a.ca}</td>
                          <td style={{padding:"7px 8px",textAlign:"center"}}>{ps&&<span style={{fontSize:8,fontWeight:700,color:ps.color,border:`1px solid ${ps.color}44`,borderRadius:3,padding:"1px 5px",background:`${ps.color}10`}}>{ps.active?"ACTIVE":`${ps.score}/100`}</span>}</td>
                          <td style={{padding:"7px 8px",fontFamily:"'DM Mono',monospace",fontSize:10,color:L.cyan,fontWeight:600}}>{a.days}d</td>
                          <td style={{padding:"7px 8px",fontFamily:"'DM Mono',monospace",fontSize:10,color:L.orange,fontWeight:700}}>{fmtINR(a.cost)}</td>
                          <td style={{padding:"7px 8px",textAlign:"center",fontSize:13}}>{a.isPublic?<span style={{color:L.cyan}}>●</span>:<span style={{color:L.text4}}>○</span>}</td>
                          <td style={{padding:"7px 8px",textAlign:"center",fontSize:13}}>{a.pqc?<span style={{color:L.green}}>✓</span>:<span style={{color:L.red}}>✗</span>}</td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        </div>
        <div style={{padding:"8px 14px",borderTop:`1px solid ${L.borderLight}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,background:L.subtleBg,borderRadius:"0 0 8px 8px"}}>
          {loading
            ? <Shimmer w={220} h={10}/>
            : <>
                <span style={{fontSize:10,color:L.text2}}>
                  <b style={{color:L.text1}}>{enriched.length}</b> to migrate ·{" "}
                  <b style={{color:L.cyan}}>{totalDays}d</b> dev ·{" "}
                  <b style={{color:L.orange}}>{fmtINR(totalCost)}</b>
                </span>
                {!isMobile&&<span style={{fontSize:9,color:L.text3}}>Ranked: public-facing → risk → cost</span>}
              </>
          }
        </div>
      </LPanel>

      {/* REMEDIATION */}
      <LPanel>
        <LPanelHeader left="REMEDIATION GUIDE" />
        <div style={{padding:14,display:"grid",gridTemplateColumns:isMobile?"1fr":isTablet?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
          {loading
            ? Array.from({length:3}).map((_,i)=>(
                <div key={i} style={{border:`1px solid ${L.border}`,borderRadius:6,padding:12,background:L.subtleBg}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><Shimmer w={120} h={10}/><Shimmer w={20} h={20}/></div>
                  <Shimmer w="90%" h={9} style={{marginBottom:6}}/>
                  <Shimmer w="75%" h={8} style={{marginBottom:12}}/>
                  {[80,65,90,70,55].map((w,j)=><Shimmer key={j} w={`${w}%`} h={8} style={{marginBottom:5}}/>)}
                </div>
              ))
            : [
                { title:"Upgrade cert key", color:L.red, bg:"#fff5f5", border:`${L.red}25`, icon:"⬡", items:enriched.filter((a:any)=>!(a.pqcScore?.criteria?.certKey4096?.pass)).map((a:any)=>a.app), fix:"Deploy RSA-4096 or EC P-384 — 70/100 pts" },
                { title:"Remove wildcard certs", color:L.orange, bg:"#fff7ed", border:`${L.orange}25`, icon:"◈", items:enriched.filter((a:any)=>a.is_wildcard).map((a:any)=>a.app), fix:"Dedicated per-service certificates — 20/100 pts" },
                { title:"Enable Kyber hybrid", color:L.cyan, bg:"#f0f9ff", border:`${L.cyan}25`, icon:"◉", items:enriched.filter((a:any)=>!a.pqc).map((a:any)=>a.app), fix:"X25519+Kyber768 (FIPS 203) → ACTIVE status" },
              ].map(section=>(
                <div key={section.title} style={{background:section.bg,border:`1px solid ${section.border}`,borderRadius:6,padding:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <span style={{fontFamily:"'DM Mono',monospace",color:section.color,fontSize:14,flexShrink:0}}>{section.icon}</span>
                    <span style={{fontSize:9,color:section.color,letterSpacing:".1em",textTransform:"uppercase",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{section.title}</span>
                    <span style={{marginLeft:"auto",fontFamily:"'DM Mono',monospace",fontSize:14,color:section.color,flexShrink:0,fontWeight:800}}>{section.items.length}</span>
                  </div>
                  <div style={{fontSize:9,color:L.text2,marginBottom:8,lineHeight:1.6,fontWeight:500}}>{section.fix}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {section.items.slice(0,5).map((app:string,i:number)=>(
                      <div key={i} style={{fontSize:9,color:L.text2,display:"flex",alignItems:"center",gap:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"3px 0",borderTop:`1px solid ${section.border}`}}>
                        <span style={{color:section.color,fontSize:8,flexShrink:0,fontWeight:700}}>▸</span> {app}
                      </div>
                    ))}
                    {section.items.length>5&&<div style={{fontSize:9,color:L.text3,fontStyle:"italic"}}>+{section.items.length-5} more</div>}
                    {section.items.length===0&&<div style={{fontSize:9,color:L.green,fontWeight:600}}>✓ All clear</div>}
                  </div>
                </div>
              ))
          }
        </div>
      </LPanel>
    </div>
  );
}