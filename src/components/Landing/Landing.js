import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from "react";
import { Link } from "react-router-dom";
// Public front page for logged-out visitors.
// Shown at "/" by the Shell in App.tsx; logged-in users get the dashboard instead.
// All numbers below are sample data and are labelled as such on the page.
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=IBM+Plex+Sans:wght@400;500;600&family=Share+Tech+Mono&display=swap');
.rl{--ink:#050d1a;--navy:#0a1628;--body:#334155;--muted:#64748b;--sky:#0ea5e9;--sky-dark:#0284c7;--sky-soft:#7dd3fc;--line:rgba(14,165,233,.18);--bg:#f1f5f9;--panel:#fff;--danger:#dc2626;--warn:#ea580c;--ok-soft:#4ade80;--red-soft:#f87171;
  font-family:'IBM Plex Sans',system-ui,sans-serif;color:var(--body);background:var(--bg);line-height:1.6;font-size:16px;min-height:100vh}
.rl *{box-sizing:border-box}
.rl a{color:inherit}
.rl :focus-visible{outline:2px solid var(--sky-soft);outline-offset:3px}
.rl .wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.rl .mono{font-family:'Share Tech Mono',monospace}
.rl .btn{display:inline-block;background:var(--sky);color:#04121f;text-decoration:none;font-weight:600;font-size:15px;padding:11px 20px;border-radius:6px;border:1px solid var(--sky)}
.rl .btn:hover{background:var(--sky-soft);border-color:var(--sky-soft)}
.rl .btn.ghost{background:transparent;color:inherit;border-color:rgba(148,163,184,.45)}
.rl .btn.ghost:hover{background:rgba(148,163,184,.14)}
.rl .hero{background:var(--navy);color:#cbd5e1;padding-bottom:72px}
.rl .bar{display:flex;align-items:center;justify-content:space-between;height:64px}
.rl .mark{display:flex;align-items:center;gap:10px;text-decoration:none}
.rl .mark b{font-family:Orbitron,sans-serif;font-weight:900;letter-spacing:.22em;color:#fff}
.rl .bar nav{display:flex;align-items:center;gap:22px;font-size:14px}
.rl .bar nav a:not(.btn){text-decoration:none}
.rl .bar nav a:not(.btn):hover{color:#fff}
.rl .hero-grid{display:grid;grid-template-columns:1fr 1.05fr;gap:56px;align-items:center;padding-top:52px}
.rl h1{font-size:clamp(2.1rem,4.4vw,3.2rem);line-height:1.12;color:#fff;font-weight:600;letter-spacing:-.02em;margin-bottom:20px}
.rl .lede{font-size:1.08rem;max-width:33em;margin-bottom:28px}
.rl .cta{display:flex;gap:12px;flex-wrap:wrap}
.rl .trace{background:#0f2038;border:1px solid rgba(125,211,252,.22);border-radius:10px;overflow:hidden}
.rl .trace-head{padding:12px 16px;border-bottom:1px solid rgba(125,211,252,.18);font-size:13px;color:#94a3b8;display:flex;justify-content:space-between}
.rl .event{padding:16px;border-bottom:1px dashed rgba(125,211,252,.25)}
.rl .event .what{color:#fff;font-weight:600}
.rl .event .meta{font-size:12.5px;color:#94a3b8;margin-top:2px}
.rl .split{display:grid;grid-template-columns:1fr 1fr}
.rl .side{padding:16px}
.rl .side + .side{border-left:1px solid rgba(125,211,252,.18)}
.rl .side h3{font-size:13px;font-weight:600;color:var(--sky-soft);margin-bottom:10px}
.rl .side dl{display:grid;gap:8px;font-size:13.5px}
.rl .side dt{color:#94a3b8;font-size:12px}
.rl .side dd{color:#e2e8f0;margin:0}
.rl .side dd.red{color:var(--red-soft)}
.rl .side dd.green{color:var(--ok-soft)}
.rl .two{padding:76px 0;background:var(--panel);border-bottom:1px solid var(--line)}
.rl h2{font-size:clamp(1.6rem,3vw,2.1rem);color:var(--ink);font-weight:600;letter-spacing:-.015em;line-height:1.2;margin-bottom:12px}
.rl .sub{max-width:38em;margin-bottom:44px}
.rl .pair{display:grid;grid-template-columns:1fr 1fr}
.rl .col{padding:8px 40px 8px 0}
.rl .col + .col{padding:8px 0 8px 40px;border-left:1px solid var(--line)}
.rl .col h3{font-size:1.3rem;color:var(--ink);font-weight:600;margin-bottom:4px}
.rl .col .tag{color:var(--muted);margin-bottom:18px}
.rl .col ul{list-style:none;margin:0;padding:0}
.rl .col li{padding:12px 0;border-top:1px solid var(--line)}
.rl .col li b{display:block;color:var(--ink);font-weight:600}
.rl .flow{padding:76px 0}
.rl .flow .sub{margin-bottom:28px}
.rl ol{list-style:none;display:grid;grid-template-columns:repeat(5,1fr);counter-reset:s;margin:8px 0 0;padding:0}
.rl ol li{counter-increment:s;padding:20px 18px 0 0;border-top:2px solid var(--sky)}
.rl ol li::before{content:counter(s);font-family:Orbitron,sans-serif;font-size:13px;color:var(--sky-dark);display:block;margin-bottom:6px}
.rl ol li b{display:block;color:var(--ink);font-weight:600;margin-bottom:4px}
.rl ol li span{font-size:14px}
.rl .soc{padding:0 0 76px}
.rl .soc-box{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:28px}
.rl .soc-top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:22px}
.rl .soc-top .sub{margin:0}
.rl .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.rl .stat{border:1px solid var(--line);border-radius:8px;padding:14px;background:var(--bg)}
.rl .stat small{display:block;font-size:13px;color:var(--muted);margin-bottom:6px}
.rl .stat b{font-family:Orbitron,sans-serif;font-size:1.8rem;line-height:1;color:var(--sky-dark)}
.rl .stat.w b{color:var(--warn)}
.rl .stat.c b{color:var(--danger)}
.rl .note{margin-top:12px;font-size:13px;color:var(--muted)}
.rl .close{background:var(--navy);color:#cbd5e1;padding:64px 0}
.rl .close h2{color:#fff}
.rl .close .sub{color:#94a3b8}
.rl footer{padding:26px 0;font-size:13px;color:var(--muted)}
.rl footer .wrap{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
.rl footer a{text-decoration:none;margin-left:16px}
@media (max-width:900px){
  .rl .hero-grid,.rl .pair{grid-template-columns:1fr}
  .rl .col,.rl .col + .col{padding:8px 0;border-left:0}
  .rl .col + .col{border-top:1px solid var(--line);margin-top:24px;padding-top:24px}
  .rl ol{grid-template-columns:1fr 1fr;row-gap:24px}
  .rl .stats{grid-template-columns:1fr 1fr}
  .rl .bar nav a.hide-sm{display:none}
}
@media (max-width:520px){
  .rl .split{grid-template-columns:1fr}
  .rl .side + .side{border-left:0;border-top:1px solid rgba(125,211,252,.18)}
}
`;
export default function Landing() {
    // Signed-in visitors skip the login step and go straight to the dashboard.
    const loggedIn = !!localStorage.getItem("access");
    const dashTo = loggedIn ? "/dashboard" : "/login";
    // Set the page title and description for crawlers and browser tabs.
    useEffect(() => {
        const prevTitle = document.title;
        document.title = "REBEL: compliance intelligence and SOC threat intelligence in one platform";
        let meta = document.querySelector('meta[name="description"]');
        const created = !meta;
        if (!meta) {
            meta = document.createElement("meta");
            meta.name = "description";
            document.head.appendChild(meta);
        }
        const prevDesc = meta.content;
        meta.content =
            "REBEL connects live threat detection to compliance scoring, so every alert your SOC handles becomes evidence your auditors can use.";
        return () => {
            document.title = prevTitle;
            if (created)
                meta?.remove();
            else if (meta)
                meta.content = prevDesc;
        };
    }, []);
    return (_jsxs("div", { className: "rl", children: [_jsx("style", { children: CSS }), _jsx("header", { className: "hero", children: _jsxs("div", { className: "wrap", children: [_jsxs("div", { className: "bar", children: [_jsxs(Link, { className: "mark", to: "/", "aria-label": "REBEL home", children: [_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 28 28", "aria-hidden": "true", children: [_jsx("polygon", { points: "14,2 26,8 26,20 14,26 2,20 2,8", fill: "none", stroke: "#38bdf8", strokeWidth: "1.5" }), _jsx("polygon", { points: "14,7 21,11 21,17 14,21 7,17 7,11", fill: "rgba(56,189,248,.12)", stroke: "rgba(56,189,248,.4)" }), _jsx("circle", { cx: "14", cy: "14", r: "3", fill: "#38bdf8" })] }), _jsx("b", { children: "REBEL" })] }), _jsxs("nav", { "aria-label": "Main", children: [_jsx("a", { className: "hide-sm", href: "#platform", children: "Platform" }), _jsx("a", { className: "hide-sm", href: "#how", children: "How it works" }), loggedIn ? (_jsx(Link, { className: "btn", to: "/dashboard", children: "Open dashboard" })) : (_jsxs(_Fragment, { children: [_jsx(Link, { to: "/login", children: "Sign in" }), _jsx(Link, { className: "btn", to: "/signup", children: "Get started" })] }))] })] }), _jsxs("div", { className: "hero-grid", children: [_jsxs("div", { children: [_jsx("h1", { children: "Compliance intelligence that runs on live threat intelligence." }), _jsx("p", { className: "lede", children: "REBEL watches your network like a SOC and scores your posture like an auditor. Every alert your team handles becomes evidence your compliance team can use." }), _jsxs("div", { className: "cta", children: [_jsx(Link, { className: "btn", to: "/signup", children: "Get started" }), _jsx(Link, { className: "btn ghost", to: dashTo, children: "Open the live dashboard" })] })] }), _jsxs("div", { className: "trace", role: "group", "aria-label": "Example of one event creating a threat record and a compliance record", children: [_jsxs("div", { className: "trace-head", children: [_jsx("span", { children: "One event, two records" }), _jsx("span", { children: "Sample data" })] }), _jsxs("div", { className: "event", children: [_jsx("div", { className: "what", children: "Suspicious inbound connection blocked" }), _jsx("div", { className: "meta mono", children: "185.220.101.4 \u2192 port 4444 \u00B7 risk 82%" })] }), _jsxs("div", { className: "split", children: [_jsxs("div", { className: "side", children: [_jsx("h3", { children: "SOC threat record" }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Severity" }), _jsx("dd", { className: "red", children: "Critical" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Source" }), _jsx("dd", { children: "RU \u00B7 known malicious" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Action" }), _jsx("dd", { children: "IP blocked, alert sent to SIEM" })] })] })] }), _jsxs("div", { className: "side", children: [_jsx("h3", { children: "Compliance record" }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Control" }), _jsx("dd", { children: "Network monitoring and response" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Status" }), _jsx("dd", { className: "green", children: "Met, evidence attached" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Posture score" }), _jsx("dd", { children: "Tier 2 \u00B7 755 / 1000" })] })] })] })] })] })] })] }) }), _jsxs("main", { children: [_jsx("section", { className: "two", id: "platform", children: _jsxs("div", { className: "wrap", children: [_jsx("h2", { children: "Two intelligence views, one source of truth" }), _jsx("p", { className: "sub", children: "Security teams and compliance teams usually work from different tools and different numbers. REBEL gives both the same records." }), _jsxs("div", { className: "pair", children: [_jsxs("div", { className: "col", children: [_jsx("h3", { children: "SOC threat intelligence" }), _jsx("p", { className: "tag", children: "For the people watching the network" }), _jsxs("ul", { children: [_jsxs("li", { children: [_jsx("b", { children: "Live traffic and anomaly detection" }), "Every packet scored for risk as it arrives."] }), _jsxs("li", { children: [_jsx("b", { children: "IP enrichment and blocking" }), "Country, ASN, reputation and one-click block."] }), _jsxs("li", { children: [_jsx("b", { children: "SIEM integration" }), "Alerts and agents feed the systems you already run."] }), _jsxs("li", { children: [_jsx("b", { children: "Target scanning" }), "Probe URLs and TLS configuration on demand."] })] })] }), _jsxs("div", { className: "col", children: [_jsx("h3", { children: "Compliance intelligence" }), _jsx("p", { className: "tag", children: "For the people answering to auditors" }), _jsxs("ul", { children: [_jsxs("li", { children: [_jsx("b", { children: "Tiered compliance and cyber rating" }), "A clear posture score, with what moved it."] }), _jsxs("li", { children: [_jsx("b", { children: "CBOM and PQC readiness" }), "Know every cryptographic asset and how ready it is for post-quantum."] }), _jsxs("li", { children: [_jsx("b", { children: "Remediation Center" }), "Track each fix from open to verified."] }), _jsxs("li", { children: [_jsx("b", { children: "Reporting and key rotation" }), "Export audit-ready reports and keep key hygiene on schedule."] })] })] })] })] }) }), _jsx("section", { className: "flow", id: "how", children: _jsxs("div", { className: "wrap", children: [_jsx("h2", { children: "How a single finding becomes evidence" }), _jsx("p", { className: "sub", children: "The same path runs for every detection, so your audit trail builds itself while the SOC works." }), _jsxs("ol", { children: [_jsxs("li", { children: [_jsx("b", { children: "Detect" }), _jsx("span", { children: "Traffic and assets are scored continuously." })] }), _jsxs("li", { children: [_jsx("b", { children: "Enrich" }), _jsx("span", { children: "Threat feeds add origin, reputation and context." })] }), _jsxs("li", { children: [_jsx("b", { children: "Contain" }), _jsx("span", { children: "Block the source or open a remediation task." })] }), _jsxs("li", { children: [_jsx("b", { children: "Map" }), _jsx("span", { children: "The finding is tied to the control it affects." })] }), _jsxs("li", { children: [_jsx("b", { children: "Prove" }), _jsx("span", { children: "Evidence and score changes flow into reports." })] })] })] }) }), _jsx("section", { className: "soc", children: _jsx("div", { className: "wrap", children: _jsxs("div", { className: "soc-box", children: [_jsxs("div", { className: "soc-top", children: [_jsxs("div", { children: [_jsx("h2", { children: "The live SOC view stays front and centre" }), _jsx("p", { className: "sub", children: "Sign in and you land on the same real-time dashboard, now with your compliance posture beside it." })] }), _jsx(Link, { className: "btn", to: dashTo, children: "Open dashboard" })] }), _jsxs("div", { className: "stats", children: [_jsxs("div", { className: "stat", children: [_jsx("small", { children: "Packets" }), _jsx("b", { children: "1,284" })] }), _jsxs("div", { className: "stat w", children: [_jsx("small", { children: "Anomalies" }), _jsx("b", { children: "96" })] }), _jsxs("div", { className: "stat c", children: [_jsx("small", { children: "Critical" }), _jsx("b", { children: "14" })] }), _jsxs("div", { className: "stat c", children: [_jsx("small", { children: "Blocked" }), _jsx("b", { children: "14" })] }), _jsxs("div", { className: "stat", children: [_jsx("small", { children: "Risk" }), _jsx("b", { children: "38" })] })] }), _jsx("p", { className: "note", children: "Sample numbers shown. Sign in to see your own." })] }) }) }), _jsx("section", { className: "close", children: _jsxs("div", { className: "wrap", children: [_jsx("h2", { children: "Give your SOC and your auditors the same answer" }), _jsx("p", { className: "sub", children: "Connect AWS, Azure, GCP or vCenter and see your first posture score." }), _jsxs("div", { className: "cta", children: [_jsx(Link, { className: "btn", to: "/signup", children: "Get started" }), _jsx(Link, { className: "btn ghost", to: "/login", children: "Sign in" })] })] }) })] }), _jsx("footer", { children: _jsxs("div", { className: "wrap", children: [_jsx("span", { children: "\u00A9 2026 REBEL" }), _jsxs("span", { children: [_jsx("a", { href: "/privacy", children: "Privacy" }), _jsx("a", { href: "/terms", children: "Terms" })] })] }) })] }));
}
