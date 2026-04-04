import React, { useState, useEffect, useRef } from "react";
import {
  T, S, Panel, PanelHeader, MetricCard, Badge, ProgBar,
  Table, TR, TD, MOCK_ASSETS, MOCK_CBOM,
} from "./shared.js";

// ── API Base ──────────────────────────────────────────────────────────────────
const API =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  "https://r3bel-production.up.railway.app";

// ── Cache config ──────────────────────────────────────────────────────────────
const CACHE_TTL_MS          = 12 * 60 * 60 * 1000;
const CACHE_KEY_NORMAL      = "rebel_cache_assets_inventory";
const CACHE_KEY_CBOM_NORMAL = "rebel_cache_cbom_inventory";
const CACHE_KEY_GHOST       = "rebel_cache_assets_ghost";

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

function cacheClearAll(): void {
  localStorage.removeItem(CACHE_KEY_NORMAL);
  localStorage.removeItem(CACHE_KEY_CBOM_NORMAL);
  localStorage.removeItem(CACHE_KEY_GHOST);
}

function cacheAgeLabel(key: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<unknown> = JSON.parse(raw);
    const mins = Math.round((Date.now() - entry.ts) / 60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.round(mins / 60)}h ago`;
  } catch { return null; }
}

// ── Light Theme Palette ───────────────────────────────────────────────────────
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
    border: `1px solid ${L.panelBorder}`,
    borderRadius: 5,
    color: L.text1,
    padding: "6px 10px",
    fontSize: 11,
    outline: "none",
  },
  btn: {
    background: L.subtleBg,
    border: `1px solid ${L.panelBorder}`,
    borderRadius: 4,
    color: L.text2,
    padding: "5px 10px",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
  },
};

// ── INR Formatter ─────────────────────────────────────────────────────────────
const INR_RATE = 83;
function toINR(usd: number): number { return Math.round(usd * INR_RATE); }
function fmtINRFull(usd: number): string {
  return `₹${toINR(usd).toLocaleString("en-IN")}`;
}

// ── Merge helper: assets + cbom → unified asset list ─────────────────────────
function buildMergedAssets(assetsData: any, cbom: any): any[] {
  const base: any[] = assetsData?.assets ?? [];
  if (!cbom?.apps?.length) return base;

  // Build a lookup by normalised name from assets
  const byName: Record<string, number> = {};
  base.forEach((a, i) => { if (a.name) byName[a.name.toLowerCase()] = i; });

  const extras: any[] = [];
  for (const app of cbom.apps ?? []) {
    const key = (app.app ?? "").toLowerCase();
    if (!key) continue;
    const idx = byName[key];
    if (idx !== undefined) {
      // Enrich existing asset with CBOM cipher/tls/pqc data if missing
      const existing = base[idx];
      base[idx] = {
        ...existing,
        cipher:            existing.cipher            || app.cipher            || "—",
        tls:               existing.tls               || app.tls               || "—",
        keylen:            existing.keylen             || app.keylen            || "—",
        ca:                existing.ca                || app.ca                || "—",
        pqc:               existing.pqc               ?? app.pqc               ?? false,
        pqc_support:       existing.pqc_support       || app.pqc_support       || "none",
        key_exchange_group:existing.key_exchange_group|| app.key_exchange_group|| null,
        is_wildcard:       existing.is_wildcard       ?? app.is_wildcard       ?? null,
        cbom_status:       app.status,
      };
    } else {
      // CBOM app not in registered assets — add as synthetic entry
      extras.push({
        name:              app.app,
        url:               app.app,
        type:              "Other",
        cipher:            app.cipher   || "—",
        tls:               app.tls      || "—",
        keylen:            app.keylen   || "—",
        ca:                app.ca       || "—",
        cert:              "—",
        scan:              "—",
        pqc:               app.pqc      ?? false,
        pqc_support:       app.pqc_support || "none",
        key_exchange_group:app.key_exchange_group || null,
        is_wildcard:       app.is_wildcard ?? null,
        cbom_status:       app.status,
        _fromCbom:         true,
      });
    }
  }

  return [...base, ...extras];
}

// ── Skeleton components ───────────────────────────────────────────────────────
function Shimmer({ w = "100%", h = 14, radius = 4, style = {} }: {
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

function SkeletonMetricCard() {
  return (
    <div style={{ background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <Shimmer w="50%" h={8} style={{ marginBottom: 10 }} />
      <Shimmer w="65%" h={26} style={{ marginBottom: 8 }} />
      <Shimmer w="40%" h={8} />
    </div>
  );
}

function SkeletonDonutPanel() {
  return (
    <div style={{ ...LS.panel }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "8px 8px 0 0" }}>
        <Shimmer w={160} h={9} />
      </div>
      <div style={{ padding: 14, display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ width: 140, height: 140, flexShrink: 0, borderRadius: "50%", background: "conic-gradient(#e2e8f0 0deg 90deg,#f1f5f9 90deg 200deg,#e2e8f0 200deg 290deg,#f1f5f9 290deg 360deg)", position: "relative", animation: "shimmer 1.4s ease infinite" }}>
          <div style={{ position: "absolute", inset: 28, borderRadius: "50%", background: L.panelBg }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
          {[70, 55, 80, 45, 60, 40].map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shimmer w={8} h={8} radius={2} />
              <Shimmer w={`${w}%`} h={9} />
              <Shimmer w={18} h={9} style={{ marginLeft: "auto" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonBarPanel() {
  return (
    <div style={{ ...LS.panel }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}`, background: L.subtleBg, borderRadius: "8px 8px 0 0", display: "flex", justifyContent: "space-between" }}>
        <Shimmer w={140} h={9} />
        <Shimmer w={60} h={18} radius={3} />
      </div>
      <div style={{ padding: 14, display: "flex", alignItems: "flex-end", gap: 22, justifyContent: "center", height: 140 }}>
        {[80, 55, 65, 40].map((h, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <Shimmer w={36} h={h} radius={3} />
            <Shimmer w={36} h={9} radius={3} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonTableRows({ cols, count = 7 }: { cols: number; count?: number }) {
  const widths = [140, 60, 65, 80, 50, 50, 50, 80, 70, 30];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} style={{ borderBottom: `1px solid ${L.borderLight}`, background: i % 2 === 0 ? L.panelBg : L.subtleBg }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: "10px 8px" }}>
              <Shimmer w={widths[j] ?? 60} h={j === 0 ? 11 : 9} />
              {j === 0 && <Shimmer w={100} h={8} style={{ marginTop: 4 }} />}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SkeletonMobileCards({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <Shimmer w={160} h={12} />
            <Shimmer w={52} h={16} radius={3} />
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <Shimmer w={50} h={16} radius={3} />
            <Shimmer w={50} h={16} radius={3} />
            <Shimmer w={50} h={16} radius={3} />
          </div>
          <Shimmer w="70%" h={9} />
        </div>
      ))}
    </>
  );
}

function SkeletonProgBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <Shimmer w={8} h={8} radius={4} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <Shimmer w={80} h={9} />
          <Shimmer w={18} h={9} />
        </div>
        <Shimmer w="100%" h={4} radius={2} />
      </div>
    </div>
  );
}

// ── Cache badge ───────────────────────────────────────────────────────────────
function CacheBadge({ age, onRefresh }: { age: string | null; onRefresh: () => void }) {
  if (!age) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        fontSize: 8, fontWeight: 600, color: L.text3,
        background: L.insetBg, border: `1px solid ${L.panelBorder}`,
        borderRadius: 3, padding: "2px 7px", letterSpacing: ".06em",
      }}>CACHED · {age}</span>
      <button
        onClick={onRefresh}
        style={{ ...LS.btn, fontSize: 9, padding: "3px 8px", color: L.blue, borderColor: `${L.blue}40`, background: `${L.blue}0d` }}
      >↺ REFRESH</button>
    </div>
  );
}

// ── Secure Mode Banner ────────────────────────────────────────────────────────
function SecureModeBanner() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 14px",
      background: `${L.purple}0d`,
      border: `1px solid ${L.purple}44`,
      borderRadius: 6,
    }}>
      <span style={{ fontSize: 9, color: L.purple, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" as const }}>
        🔒 SECURE MODE ACTIVE
      </span>
      <span style={{ fontSize: 9, color: L.purple, opacity: 0.75 }}>·</span>
      <span style={{ fontSize: 9, color: L.purple, fontFamily: "'DM Mono', monospace" }}>
        /ghost/assets — anonymised data, no live scans
      </span>
    </div>
  );
}

// ── Light sub-components ──────────────────────────────────────────────────────
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
      <span style={{ fontSize: 9, fontWeight: 700, color: L.text3, letterSpacing: ".14em", textTransform: "uppercase" as const }}>{left}</span>
      {right}
    </div>
  );
}

function LMetricCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div style={{
      background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 8,
      padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 8, color: L.text4, textTransform: "uppercase" as const, letterSpacing: ".12em", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: L.text3, marginTop: 5 }}>{sub}</div>
    </div>
  );
}

function LProgBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: L.insetBg, borderRadius: 2, border: `1px solid ${L.panelBorder}`, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ── useMobile ─────────────────────────────────────────────────────────────────
function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AssetInventoryPage() {
  const [assets,        setAssets]        = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState(false);
  const [fromCache,     setFromCache]     = useState(false);
  const [cacheAge,      setCacheAge]      = useState<string | null>(null);
  const [query,         setQuery]         = useState("");
  const [filterCrit,    setFilterCrit]    = useState("All");
  const [expandedRow,   setExpandedRow]   = useState<number | null>(null);
  const [riskCounts,    setRiskCounts]    = useState({ Critical: 0, High: 0, Medium: 0, Low: 0 });
  const [certBuckets,   setCertBuckets]   = useState({ "0-30": 0, "30-60": 0, "60-90": 0, "90+": 0 });
  const [byType,        setByType]        = useState<Record<string, number>>({});
  const [secureModeOn,  setSecureModeOn]  = useState(false);
  const [secureModeLoading, setSecureModeLoading] = useState(true);

  const typeRef   = useRef<HTMLCanvasElement>(null);
  const riskRef   = useRef<HTMLCanvasElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const mobile    = useMobile();

  // ── Fetch secure mode status on mount ────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/secure-mode/status`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.enabled !== undefined) setSecureModeOn(Boolean(d.enabled));
      })
      .catch(() => {})
      .finally(() => setSecureModeLoading(false));
  }, []);

  // ── Apply fetched payload ─────────────────────────────────────────────────
  const applyPayload = (d: any, mergedAssets?: any[]) => {
    const finalAssets = mergedAssets ?? (d?.assets?.length ? d.assets : MOCK_ASSETS);
    setAssets(finalAssets);
    setRiskCounts(d.risk_counts   || { Critical: 0, High: 0, Medium: 0, Low: 0 });
    setCertBuckets(d.cert_buckets || { "0-30": 0, "30-60": 0, "60-90": 0, "90+": 0 });
    setByType(d.by_type           || {});
  };

  // ── Data fetch with cache ─────────────────────────────────────────────────
  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    setFetchError(false);

    if (secureModeOn) {
      // ── SECURE MODE: fetch /ghost/assets only ───────────────────────────
      if (!forceRefresh) {
        const cached = cacheGet<any>(CACHE_KEY_GHOST);
        if (cached) {
          applyPayload(cached);
          setFromCache(true);
          setCacheAge(cacheAgeLabel(CACHE_KEY_GHOST));
          setLoading(false);
          return;
        }
      }
      try {
        const d = await fetch(`${API}/ghost/assets`).then(r => {
          if (!r.ok) throw new Error();
          return r.json();
        });
        cacheSet(CACHE_KEY_GHOST, d);
        applyPayload(d);
        setFromCache(false);
        setCacheAge(null);
      } catch {
        setFetchError(true);
        setAssets(MOCK_ASSETS);
      }
    } else {
      // ── NORMAL MODE: fetch /assets + /cbom, merge ───────────────────────
      if (!forceRefresh) {
        const cachedAssets = cacheGet<any>(CACHE_KEY_NORMAL);
        const cachedCbom   = cacheGet<any>(CACHE_KEY_CBOM_NORMAL);
        if (cachedAssets) {
          const merged = cachedCbom
            ? buildMergedAssets(cachedAssets, cachedCbom)
            : (cachedAssets.assets ?? MOCK_ASSETS);
          applyPayload(cachedAssets, merged.length ? merged : undefined);
          setFromCache(true);
          setCacheAge(cacheAgeLabel(CACHE_KEY_NORMAL));
          setLoading(false);
          return;
        }
      }
      try {
        const [assetsData, cbomData] = await Promise.all([
          fetch(`${API}/assets`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
          fetch(`${API}/cbom`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        cacheSet(CACHE_KEY_NORMAL, assetsData);
        if (cbomData) cacheSet(CACHE_KEY_CBOM_NORMAL, cbomData);
        const merged = cbomData
          ? buildMergedAssets(assetsData, cbomData)
          : (assetsData.assets ?? []);
        applyPayload(assetsData, merged.length ? merged : undefined);
        setFromCache(false);
        setCacheAge(null);
      } catch {
        setFetchError(true);
        setAssets(MOCK_ASSETS);
      }
    }

    setLoading(false);
  };

  function handleForceRefresh() {
    cacheClearAll();
    setFromCache(false);
    setCacheAge(null);
    loadData(true);
  }

  // Wait for secure mode status before loading data
  useEffect(() => {
    if (!secureModeLoading) {
      loadData();
    }
  }, [secureModeOn, secureModeLoading]);

  useEffect(() => {
    if (!loading) { drawTypeChart(); drawRiskChart(); }
  }, [assets, riskCounts, byType, mobile, loading]);

  // ── Charts ────────────────────────────────────────────────────────────────
  function drawTypeChart() {
    const c = typeRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = 140, H = 140, cx = 70, cy = 70, r = 50, gap = 0.05;

    const data = [
      { label: "Web Apps",         val: byType["Web App"] || byType["Web Apps"] || 0,  color: L.blue   },
      { label: "APIs",             val: byType["API"]     || byType["APIs"]     || 0,  color: L.purple },
      { label: "Core Banking",     val: byType["Core Banking"]     || 0,                color: L.green  },
      { label: "Internet Banking", val: byType["Internet Banking"] || 0,                color: L.yellow },
      { label: "Servers",          val: byType["Server"]  || byType["Servers"]  || 0,  color: "#94a3b8" },
      { label: "Other",            val: byType["Other"]   || 0,                         color: "#cbd5e1" },
    ].filter(d => d.val > 0);

    const display = data.length ? data : [{ label: "Web Apps", val: 1, color: L.blue }];
    const total   = display.reduce((a, d) => a + d.val, 0);
    let angle = -Math.PI / 2;
    ctx.clearRect(0, 0, W, H);

    display.forEach(d => {
      const sweep = 2 * Math.PI * (d.val / total) - gap;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, angle, angle + sweep);
      ctx.fillStyle = d.color; ctx.fill();
      angle += 2 * Math.PI * (d.val / total);
    });

    ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff"; ctx.fill();

    ctx.fillStyle = L.text1;
    ctx.font = "bold 13px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(assets.length), cx, cy + 5);

    if (legendRef.current) {
      legendRef.current.innerHTML = display.map(d => `
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:8px;height:8px;border-radius:2px;background:${d.color};flex-shrink:0;"></div>
          <span style="font-size:9px;color:${L.text2};flex:1;font-family:'DM Sans',sans-serif;">${d.label}</span>
          <span style="font-size:9px;font-family:'DM Mono',monospace;color:${L.text3};font-weight:600;">${d.val}</span>
        </div>`).join("");
    }
  }

  function drawRiskChart() {
    const c = riskRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = c.offsetWidth || 280, H = 140;
    c.width = W;
    const bars = [
      { label: "Critical", val: riskCounts.Critical, color: L.red    },
      { label: "High",     val: riskCounts.High,     color: L.orange },
      { label: "Medium",   val: riskCounts.Medium,   color: L.yellow },
      { label: "Low",      val: riskCounts.Low,       color: L.green  },
    ];
    const max  = Math.max(...bars.map(b => b.val), 1);
    const bw   = mobile ? 28 : 36, gap = mobile ? 14 : 22;
    const startX = (W - (bars.length * (bw + gap) - gap)) / 2;
    ctx.clearRect(0, 0, W, H);
    bars.forEach((b, i) => {
      const x    = startX + i * (bw + gap);
      const barH = Math.round((b.val / max) * (H - 30));
      const y    = H - barH - 20;
      ctx.fillStyle = b.color + "22"; ctx.fillRect(x, y, bw, barH);
      ctx.fillStyle = b.color + "99"; ctx.fillRect(x, y + 3, bw, barH - 3);
      ctx.fillStyle = b.color;        ctx.fillRect(x, y, bw, 3);
      ctx.fillStyle = L.text3;
      ctx.font = "9px 'DM Mono', monospace"; ctx.textAlign = "center";
      ctx.fillText(b.label, x + bw / 2, H - 4);
      ctx.fillStyle = b.color; ctx.font = "bold 9px 'DM Mono', monospace";
      ctx.fillText(String(b.val), x + bw / 2, y - 4);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const certVariant = (c: string): any =>
    c === "Valid" ? "green" : c === "Expiring" ? "yellow" : "red";

  const keyColor = (k: string) =>
    k?.startsWith("1024") ? L.red : k?.startsWith("2048") ? L.yellow : L.green;

  const critColor = (c: string) =>
    ({ Critical: L.red, High: L.orange, Medium: L.yellow, Low: L.green }[c] ?? null);

  const critBg = (c: string) =>
    ({ Critical: "#fff5f5", High: "#fff7ed", Medium: "#fffbeb", Low: "#f0fdf4" }[c] ?? L.subtleBg);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = assets.filter(a => {
    const ms = !query
      || a.name?.toLowerCase().includes(query.toLowerCase())
      || a.owner?.toLowerCase().includes(query.toLowerCase())
      || a.type?.toLowerCase().includes(query.toLowerCase());
    const mc = filterCrit === "All" || a.criticality === filterCrit || a.risk === filterCrit;
    return ms && mc;
  });

  const highRisk = riskCounts.Critical + riskCounts.High;

  // ── Active endpoint label ─────────────────────────────────────────────────
  const activeEndpointLabel = secureModeOn ? "→ /ghost/assets" : "→ /assets + /cbom";

  // ── Render ────────────────────────────────────────────────────────────────
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

      {/* ── SECURE MODE BANNER ── */}
      {secureModeOn && <SecureModeBanner />}

      {/* ── API STATUS BAR ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 7, fontFamily: "'DM Mono',monospace", color: L.text4, letterSpacing: ".08em" }}>API</span>
          <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: fetchError ? L.red : L.green, fontWeight: 600 }}>
            {fetchError ? "✗" : "✓"} {API}
          </span>
          {/* Active endpoint pill */}
          <span style={{
            fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700,
            color: secureModeOn ? L.purple : L.cyan,
            background: secureModeOn ? `${L.purple}10` : `${L.cyan}10`,
            border: `1px solid ${secureModeOn ? L.purple : L.cyan}44`,
            borderRadius: 3, padding: "2px 6px", letterSpacing: ".04em",
          }}>
            {activeEndpointLabel}
          </span>
          {fetchError && <span style={{ fontSize: 8, color: L.red }}>— showing demo data</span>}
          {loading && <span style={{ fontSize: 8, color: L.blue }}>fetching…</span>}
        </div>
        {fromCache && <CacheBadge age={cacheAge} onRefresh={handleForceRefresh} />}
      </div>

      {/* ── METRICS ── */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 8 : 9 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonMetricCard key={i} />)
          : <>
              <LMetricCard label="TOTAL ASSETS"  value={assets.length}                                 sub="Scanned"            color={L.blue}   />
              <LMetricCard label="HIGH RISK"      value={highRisk}                                      sub="Immediate action"   color={L.red}    />
              <LMetricCard label="CERT EXPIRING"  value={certBuckets["0-30"]}                           sub="Within 30 days"     color={L.orange} />
              <div style={mobile ? { gridColumn: "1/-1" } : {}}>
                <LMetricCard label="ACTIVE CERTS" value={assets.filter(a => a.cert === "Valid").length} sub="Valid certificates" color={L.green} />
              </div>
            </>
        }
      </div>

      {/* ── CHARTS ── */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }}>
        {loading
          ? <><SkeletonDonutPanel /><SkeletonBarPanel /></>
          : <>
              <LPanel>
                <LPanelHeader left="ASSET TYPE DISTRIBUTION" />
                <div style={{ padding: 14, display: "flex", gap: 16, alignItems: "center" }}>
                  <canvas ref={typeRef} width={140} height={140} style={{ flexShrink: 0 }} />
                  <div ref={legendRef} style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }} />
                </div>
              </LPanel>

              <LPanel>
                <LPanelHeader
                  left="RISK DISTRIBUTION"
                  right={
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: L.red, fontWeight: 800 }}>
                      {highRisk}<span style={{ fontSize: 11, fontWeight: 600 }}> high</span>
                    </span>
                  }
                />
                <div style={{ padding: 14 }}>
                  <canvas ref={riskRef} width={280} height={140} style={{ width: "100%" }} />
                </div>
              </LPanel>
            </>
        }
      </div>

      {/* ── ASSET TABLE ── */}
      <LPanel>
        <LPanelHeader
          left="ASSET INVENTORY"
          right={
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {fromCache && !mobile && <CacheBadge age={cacheAge} onRefresh={handleForceRefresh} />}
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search domain / owner..."
                style={{ ...LS.input, width: mobile ? 120 : 170 }}
                disabled={loading}
              />
              <select
                value={filterCrit}
                onChange={e => setFilterCrit(e.target.value)}
                style={{ ...LS.input, cursor: "pointer" }}
                disabled={loading}
              >
                <option value="All">All</option>
                {["Critical", "High", "Medium", "Low"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          }
        />

        {/* Mobile cards */}
        {mobile ? (
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {loading
              ? <SkeletonMobileCards count={5} />
              : filtered.length
                ? filtered.map((a, i) => {
                    const scope = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
                    const cc    = critColor(a.criticality);
                    const cbg   = cc ? critBg(a.criticality) : undefined;
                    const tlsN  = (a.tls || "").replace(/^TLSv?/i, "");
                    return (
                      <div key={i} style={{ padding: "10px 14px", borderBottom: `1px solid ${L.borderLight}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: L.blue, fontWeight: 600 }}>{a.name}</span>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            {a._fromCbom && <span style={{ fontSize: 7, color: L.purple, border: `1px solid ${L.purple}44`, borderRadius: 2, padding: "1px 4px", background: `${L.purple}0a` }}>CBOM</span>}
                            {cc && <span style={{ fontSize: 7, fontWeight: 700, color: cc, border: `1px solid ${cc}44`, borderRadius: 2, padding: "1px 5px", background: cbg }}>{a.criticality}</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                          <Badge v="gray">{a.type || "—"}</Badge>
                          <Badge v={certVariant(a.cert)}>{a.cert || "—"}</Badge>
                          <Badge v={tlsN === "1.0" ? "red" : tlsN === "1.2" ? "yellow" : "green"}>TLS {tlsN || "—"}</Badge>
                        </div>
                        {scope.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {scope.map((s: string) => (
                              <span key={s} style={{ fontSize: 7, color: L.cyan, border: `1px solid ${L.cyan}44`, borderRadius: 2, padding: "1px 5px", background: `${L.cyan}0a` }}>{s}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ fontSize: 9, color: L.text3, marginTop: 4, fontFamily: "'DM Mono',monospace" }}>
                          {a.keylen} · {a.ca} · {a.scan || "—"}
                        </div>
                      </div>
                    );
                  })
                : <div style={{ padding: 20, fontSize: 10, color: L.text3, textAlign: "center" }}>No assets found</div>
            }
          </div>
        ) : (
          /* Desktop table */
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
              <thead>
                <tr style={{ background: L.subtleBg, borderBottom: `2px solid ${L.panelBorder}` }}>
                  {["ASSET", "TYPE", "CRITICALITY", "OWNER", "TLS", "CERT", "KEY LEN", "COMPLIANCE", "LAST SCAN", ""].map(h => (
                    <th key={h} style={{ padding: "7px 8px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase" as const, letterSpacing: ".08em", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? <SkeletonTableRows cols={10} count={7} />
                  : filtered.length
                    ? filtered.map((a, i) => {
                        const scope  = Array.isArray(a.compliance_scope) ? a.compliance_scope : [];
                        const cc     = critColor(a.criticality);
                        const cbg    = cc ? critBg(a.criticality) : undefined;
                        const tlsN   = (a.tls || "").replace(/^TLSv?/i, "");
                        const isOpen = expandedRow === i;
                        const rowBg  = i % 2 === 0 ? L.panelBg : L.subtleBg;
                        return (
                          <React.Fragment key={i}>
                            <tr
                              style={{ borderBottom: `1px solid ${L.borderLight}`, background: rowBg }}
                              onMouseEnter={e => (e.currentTarget.style.background = L.insetBg)}
                              onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                            >
                              <td style={{ padding: "8px 8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <div style={{ fontSize: 10, color: L.blue, fontWeight: 600 }}>{a.name}</div>
                                  {a._fromCbom && <span style={{ fontSize: 7, color: L.purple, border: `1px solid ${L.purple}44`, borderRadius: 2, padding: "1px 4px", background: `${L.purple}0a`, flexShrink: 0 }}>CBOM</span>}
                                </div>
                                <div style={{ fontSize: 8, color: L.text4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{a.url}</div>
                              </td>
                              <td style={{ padding: "8px 8px" }}>
                                <span style={{ fontSize: 8, color: L.text3, background: L.insetBg, border: `1px solid ${L.panelBorder}`, borderRadius: 3, padding: "1px 5px", fontWeight: 600 }}>{a.type || "—"}</span>
                              </td>
                              <td style={{ padding: "8px 8px" }}>
                                {cc ? (
                                  <span style={{ fontSize: 8, fontWeight: 700, color: cc, border: `1px solid ${cc}44`, borderRadius: 3, padding: "1px 6px", background: cbg }}>{a.criticality}</span>
                                ) : (
                                  <span style={{ fontSize: 9, color: L.text3 }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: "8px 8px" }}>
                                <div style={{ fontSize: 9, color: L.text2, fontWeight: 500 }}>{a.owner || "—"}</div>
                                {a.owner_email && <div style={{ fontSize: 8, color: L.text4 }}>{a.owner_email}</div>}
                              </td>
                              <td style={{ padding: "8px 8px" }}>
                                <span style={{ fontSize: 8, fontWeight: 600, color: tlsN === "1.0" ? L.red : tlsN === "1.2" ? L.yellow : L.green, background: tlsN === "1.0" ? "#fff5f5" : tlsN === "1.2" ? "#fffbeb" : "#f0fdf4", border: `1px solid ${tlsN === "1.0" ? L.red : tlsN === "1.2" ? L.yellow : L.green}33`, borderRadius: 3, padding: "1px 5px" }}>TLS {tlsN || "—"}</span>
                              </td>
                              <td style={{ padding: "8px 8px" }}>
                                <Badge v={certVariant(a.cert)}>{a.cert || "—"}</Badge>
                              </td>
                              <td style={{ padding: "8px 8px", fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: keyColor(a.keylen) }}>{a.keylen || "—"}</td>
                              <td style={{ padding: "8px 8px" }}>
                                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                                  {scope.slice(0, 3).map((s: string) => (
                                    <span key={s} style={{ fontSize: 7, color: L.cyan, border: `1px solid ${L.cyan}44`, borderRadius: 2, padding: "1px 4px", background: `${L.cyan}0a` }}>{s}</span>
                                  ))}
                                  {scope.length > 3 && <span style={{ fontSize: 7, color: L.text3 }}>+{scope.length - 3}</span>}
                                  {scope.length === 0 && <span style={{ fontSize: 8, color: L.text4 }}>—</span>}
                                </div>
                              </td>
                              <td style={{ padding: "8px 8px", fontSize: 9, color: L.text3, fontFamily: "'DM Mono',monospace" }}>{a.scan || "Never"}</td>
                              <td style={{ padding: "8px 8px" }}>
                                <button
                                  onClick={() => setExpandedRow(isOpen ? null : i)}
                                  style={{ ...LS.btn, fontSize: 8, padding: "2px 7px", background: isOpen ? `${L.blue}15` : L.subtleBg, color: isOpen ? L.blue : L.text3, borderColor: isOpen ? `${L.blue}40` : L.panelBorder }}
                                >{isOpen ? "▲" : "▼"}</button>
                              </td>
                            </tr>
                            {isOpen && (
                              <tr style={{ background: L.insetBg }}>
                                <td colSpan={10} style={{ padding: "0 12px 12px" }}>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, background: L.panelBg, border: `1px solid ${L.panelBorder}`, borderRadius: 6, padding: 12, marginTop: 4, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)" }}>
                                    {[
                                      { label: "BUSINESS UNIT",      val: a.business_unit || "—",                                                                    color: L.text1  },
                                      { label: "FINANCIAL EXPOSURE", val: a.financial_exposure ? `₹${Number(a.financial_exposure).toLocaleString("en-IN")}` : "—",   color: L.orange },
                                      { label: "IP ADDRESS",         val: a.ip || "—",                                                                                color: L.text2  },
                                      { label: "CIPHER",             val: a.cipher || "—",                                                                            color: L.text3  },
                                    ].map(item => (
                                      <div key={item.label}>
                                        <div style={{ fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase" as const, fontWeight: 600 }}>{item.label}</div>
                                        <div style={{ fontSize: 10, color: item.color, fontFamily: "'DM Mono',monospace", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.val}</div>
                                      </div>
                                    ))}
                                    {a.notes && (
                                      <div style={{ gridColumn: "1/-1" }}>
                                        <div style={{ fontSize: 7, color: L.text4, letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase" as const, fontWeight: 600 }}>NOTES</div>
                                        <div style={{ fontSize: 9, color: L.text2, lineHeight: 1.6 }}>{a.notes}</div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    : (
                      <tr>
                        <td colSpan={10} style={{ padding: "20px", fontSize: 10, color: L.text3, textAlign: "center" }}>No assets found</td>
                      </tr>
                    )
                }
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "8px 14px", borderTop: `1px solid ${L.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, background: L.subtleBg, borderRadius: "0 0 8px 8px" }}>
          {loading
            ? <Shimmer w={200} h={10} />
            : <>
                <span style={{ fontSize: 10, color: L.text2 }}>
                  Showing <b style={{ color: L.text1 }}>{filtered.length}</b> of{" "}
                  <b style={{ color: L.text1 }}>{assets.length}</b> assets
                  {secureModeOn ? (
                    <span style={{ marginLeft: 8, fontSize: 8, color: L.purple, fontWeight: 600 }}>· ghost mode</span>
                  ) : (
                    <span style={{ marginLeft: 8, fontSize: 8, color: L.cyan, fontWeight: 600 }}>· assets + cbom</span>
                  )}
                </span>
                {!mobile && <span style={{ fontSize: 9, color: L.text3 }}>▼ expand row for financial exposure and cipher details</span>}
              </>
          }
        </div>
      </LPanel>

      {/* ── CERT EXPIRY + CRYPTO OVERVIEW ── */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 10 }}>
        <LPanel>
          <LPanelHeader left="CERTIFICATE EXPIRY TIMELINE" />
          <div style={{ padding: 14 }}>
            {loading
              ? [0, 1, 2, 3].map(i => <SkeletonProgBar key={i} />)
              : [
                  { label: "0–30 Days",  count: certBuckets["0-30"],  color: L.red    },
                  { label: "30–60 Days", count: certBuckets["30-60"], color: L.orange },
                  { label: "60–90 Days", count: certBuckets["60-90"], color: L.yellow },
                  { label: ">90 Days",   count: certBuckets["90+"],   color: L.green  },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, flexShrink: 0, boxShadow: `0 0 0 2px ${row.color}22` }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: L.text2, fontWeight: 500 }}>{row.label}</span>
                        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: row.color, fontWeight: 700 }}>{row.count}</span>
                      </div>
                      <LProgBar pct={Math.round(row.count / Math.max(assets.length, 1) * 100)} color={row.color} />
                    </div>
                  </div>
                ))
            }
          </div>
        </LPanel>

        <LPanel>
          <LPanelHeader left="CRYPTO & SECURITY OVERVIEW" />
          {mobile ? (
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {loading
                ? <SkeletonMobileCards count={4} />
                : assets.filter(a => a.tls && a.tls !== "—").slice(0, 10).map((a, i) => {
                    const tlsN = (a.tls || "").replace(/^TLSv?/i, "");
                    return (
                      <div key={i} style={{ padding: "9px 14px", borderBottom: `1px solid ${L.borderLight}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: L.blue, fontWeight: 600 }}>{a.name}</span>
                          <span style={{ fontSize: 8, fontWeight: 600, color: tlsN === "1.0" ? L.red : tlsN === "1.2" ? L.yellow : L.green, background: tlsN === "1.0" ? "#fff5f5" : tlsN === "1.2" ? "#fffbeb" : "#f0fdf4", border: `1px solid ${tlsN === "1.0" ? L.red : tlsN === "1.2" ? L.yellow : L.green}33`, borderRadius: 3, padding: "1px 5px" }}>TLS {tlsN}</span>
                        </div>
                        <div style={{ fontSize: 9, color: L.text3, fontFamily: "'DM Mono',monospace" }}>{a.keylen} · {a.ca}</div>
                      </div>
                    );
                  })
              }
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
                <thead>
                  <tr style={{ background: L.subtleBg, borderBottom: `2px solid ${L.panelBorder}` }}>
                    {["ASSET", "KEY LEN", "CIPHER SUITE", "TLS", "CA"].map(h => (
                      <th key={h} style={{ padding: "7px 8px", fontSize: 8, fontWeight: 700, color: L.text3, textTransform: "uppercase" as const, letterSpacing: ".08em", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? <SkeletonTableRows cols={5} count={6} />
                    : assets.filter(a => a.tls && a.tls !== "—").slice(0, 10).map((a, i) => {
                        const tlsN  = (a.tls || "").replace(/^TLSv?/i, "");
                        const rowBg = i % 2 === 0 ? L.panelBg : L.subtleBg;
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${L.borderLight}`, background: rowBg }}>
                            <td style={{ padding: "7px 8px", fontSize: 10, color: L.blue, fontWeight: 600 }}>{a.name}</td>
                            <td style={{ padding: "7px 8px", fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: keyColor(a.keylen) }}>{a.keylen}</td>
                            <td style={{ padding: "7px 8px", fontSize: 9, color: L.text3, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'DM Mono',monospace" }}>{a.cipher}</td>
                            <td style={{ padding: "7px 8px" }}>
                              <span style={{ fontSize: 8, fontWeight: 600, color: tlsN === "1.0" ? L.red : tlsN === "1.2" ? L.yellow : L.green, background: tlsN === "1.0" ? "#fff5f5" : tlsN === "1.2" ? "#fffbeb" : "#f0fdf4", border: `1px solid ${tlsN === "1.0" ? L.red : tlsN === "1.2" ? L.yellow : L.green}33`, borderRadius: 3, padding: "1px 5px" }}>TLS {tlsN}</span>
                            </td>
                            <td style={{ padding: "7px 8px", fontSize: 10, color: L.text3 }}>{a.ca}</td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          )}
        </LPanel>
      </div>
    </div>
  );
}