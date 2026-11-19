import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
const API_BASE = "https://r3bel-5464.onrender.com";
async function connectRequest(path, options = {}) {
    const token = localStorage.getItem("access");
    return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}
async function readResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.detail ||
            data.message ||
            `Connect request failed (${response.status}).`);
    }
    return data;
}
const DOMAINS = [
    {
        id: "governance",
        label: "Governance & ownership",
        hint: "Policies, board oversight, named owners, org charts",
    },
    {
        id: "api_inventory",
        label: "API inventory",
        hint: "OpenAPI specs, gateway listings, endpoint catalogues",
    },
    {
        id: "authentication",
        label: "Authentication & access control",
        hint: "OAuth/mTLS setup, role matrices, access reviews",
    },
    {
        id: "data_protection",
        label: "Data protection & privacy",
        hint: "Encryption, data classification, retention, DPIAs",
    },
    {
        id: "monitoring",
        label: "Transaction monitoring & AML",
        hint: "Monitoring rules, sanctions screening, alert statistics",
    },
    {
        id: "incident",
        label: "Incident response & resilience",
        hint: "IR plans, BCP/DR tests, outage records",
    },
    {
        id: "audit",
        label: "Audit logging & retention",
        hint: "Log sources, retention schedules, audit reports",
    },
];
const PROVENANCE = {
    verified: {
        label: "Verified evidence",
        short: "Verified",
        weight: 1,
        help: "Submitted by an institution agent with an integrity hash recorded by Rebel.",
    },
    document: {
        label: "Uploaded document",
        short: "Document",
        weight: 0.6,
        help: "A file or import provided by a person. Hashed on receipt but not independently confirmed.",
    },
    declared: {
        label: "Manual declaration",
        short: "Declared",
        weight: 0.35,
        help: "A statement typed in by a person. No supporting artifact.",
    },
    unverified: {
        label: "Unverified information",
        short: "Unverified",
        weight: 0.2,
        help: "Discovered or inferred automatically (for example from public API docs) and not yet confirmed.",
    },
};
const PROVENANCE_ORDER = [
    "verified",
    "document",
    "declared",
    "unverified",
];
const EMPTY_STORE = {
    discovery: null,
    selected: [],
    files: [],
    declarations: [],
    report: null,
};
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_PARSE_BYTES = 5 * 1024 * 1024;
const ACCEPT = ".json,.yaml,.yml,.pdf,.csv,.xlsx,.xls,application/json,application/pdf,text/csv";
/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function uid() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function storeKey(institutionId) {
    return `rebel.connect.v1.${institutionId}`;
}
function formatBytes(n) {
    if (n < 1024)
        return `${n} B`;
    if (n < 1024 * 1024)
        return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDate(value) {
    if (!value)
        return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
function shortHash(h) {
    return h.length > 20 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h;
}
async function sha256File(file) {
    try {
        const buf = await file.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", buf);
        return Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }
    catch {
        return "unavailable";
    }
}
function djb2(input) {
    let h = 5381;
    for (let i = 0; i < input.length; i += 1) {
        h = ((h << 5) + h + input.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(16);
}
function guessDomain(name) {
    const n = name.toLowerCase();
    if (/openapi|swagger|api|endpoint/.test(n))
        return "api_inventory";
    if (/auth|oauth|iam|access|identity|role/.test(n))
        return "authentication";
    if (/privacy|gdpr|encrypt|pii|retention|dpia|data/.test(n))
        return "data_protection";
    if (/aml|sanction|monitor|fraud|transaction|kyc/.test(n))
        return "monitoring";
    if (/incident|resilien|bcp|disaster|outage|recovery/.test(n))
        return "incident";
    if (/audit|log|siem/.test(n))
        return "audit";
    return "governance";
}
function classifyVerified(item) {
    const t = `${item.evidence_type} ${item.source_system}`.toLowerCase();
    if (/auth|iam|identity|access|oauth/.test(t))
        return "authentication";
    if (/openapi|endpoint|inventory|\bapi\b/.test(t))
        return "api_inventory";
    if (/aml|transaction|monitor|fraud|sanction/.test(t))
        return "monitoring";
    if (/incident|resilien|bcp|\bdr\b|outage/.test(t))
        return "incident";
    if (/\blog|audit|retention/.test(t))
        return "audit";
    if (/privacy|encrypt|\bpii\b|gdpr|data/.test(t))
        return "data_protection";
    if (/govern|policy|board|owner/.test(t))
        return "governance";
    return null;
}
function splitCsvLine(line) {
    const out = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
        const c = line[i];
        if (quoted) {
            if (c === '"' && line[i + 1] === '"') {
                cur += '"';
                i += 1;
            }
            else if (c === '"') {
                quoted = false;
            }
            else {
                cur += c;
            }
        }
        else if (c === '"') {
            quoted = true;
        }
        else if (c === ",") {
            out.push(cur.trim());
            cur = "";
        }
        else {
            cur += c;
        }
    }
    out.push(cur.trim());
    return out;
}
const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];
const READ_METHODS = ["get", "head", "options"];
function analyzeOpenApiObject(doc) {
    const paths = (doc.paths ?? {});
    let endpoints = 0;
    let readOnly = 0;
    for (const methods of Object.values(paths)) {
        if (!methods || typeof methods !== "object")
            continue;
        for (const m of Object.keys(methods)) {
            if (HTTP_METHODS.includes(m.toLowerCase())) {
                endpoints += 1;
                if (READ_METHODS.includes(m.toLowerCase()))
                    readOnly += 1;
            }
        }
    }
    const comps = (doc.components ?? {});
    const schemes = (comps.securitySchemes ?? doc.securityDefinitions ?? {});
    const auth = Object.values(schemes)
        .map((s) => (s?.scheme ? `${s.type}:${s.scheme}` : s?.type))
        .filter((s) => Boolean(s));
    const version = String(doc.openapi ?? doc.swagger ?? "") || undefined;
    return { endpoints, readOnly, auth: Array.from(new Set(auth)), version };
}
function analyzeOpenApiYaml(text) {
    const version = /^(?:openapi|swagger):\s*['"]?([\d.]+)/m.exec(text)?.[1];
    if (!version)
        return null;
    const lines = text.split(/\r?\n/);
    const start = lines.findIndex((l) => /^paths:\s*$/.test(l));
    let endpoints = 0;
    let readOnly = 0;
    if (start >= 0) {
        for (let i = start + 1; i < lines.length; i += 1) {
            const l = lines[i];
            if (l.trim() && !/^\s/.test(l))
                break;
            const m = /^\s{4}(get|post|put|patch|delete|head|options):/i.exec(l);
            if (m) {
                endpoints += 1;
                if (READ_METHODS.includes(m[1].toLowerCase()))
                    readOnly += 1;
            }
        }
    }
    const auth = Array.from(new Set(Array.from(text.matchAll(/^\s+type:\s*(http|apiKey|oauth2|openIdConnect|basic)\s*$/gm)).map((m) => m[1])));
    return { endpoints, readOnly, auth, version };
}
async function ingestFile(file, domain) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const base = {
        id: uid(),
        name: file.name,
        size: file.size,
        mime: file.type || ext,
        sha256: await sha256File(file),
        addedAt: new Date().toISOString(),
        kind: "document",
        domain,
        summary: "Registered as a document.",
    };
    const parsable = file.size <= MAX_PARSE_BYTES;
    try {
        if (ext === "json" && parsable) {
            const text = await file.text();
            const parsed = JSON.parse(text);
            if (parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed) &&
                ("openapi" in parsed || "swagger" in parsed)) {
                const s = analyzeOpenApiObject(parsed);
                return {
                    ...base,
                    kind: "spec",
                    domain: "api_inventory",
                    summary: `OpenAPI ${s.version ?? ""} · ${s.endpoints} operations (${s.readOnly} read-only) · ${s.auth.length ? s.auth.join(", ") : "no security schemes declared"}`,
                    endpoints: s.endpoints,
                    readOnlyEndpoints: s.readOnly,
                    auth: s.auth,
                };
            }
            if (Array.isArray(parsed)) {
                const first = parsed[0];
                return {
                    ...base,
                    kind: "import",
                    summary: `JSON array · ${parsed.length} records`,
                    rows: parsed.length,
                    columns: first && typeof first === "object"
                        ? Object.keys(first).slice(0, 12)
                        : undefined,
                };
            }
            return {
                ...base,
                kind: "import",
                summary: `JSON object · ${Object.keys(parsed).length} top-level keys`,
                columns: Object.keys(parsed).slice(0, 12),
            };
        }
        if ((ext === "yaml" || ext === "yml") && parsable) {
            const text = await file.text();
            const s = analyzeOpenApiYaml(text);
            if (s) {
                return {
                    ...base,
                    kind: "spec",
                    domain: "api_inventory",
                    summary: `OpenAPI ${s.version ?? ""} (YAML, heuristic read) · ${s.endpoints} operations · ${s.auth.length ? s.auth.join(", ") : "no security schemes found"}`,
                    endpoints: s.endpoints,
                    readOnlyEndpoints: s.readOnly,
                    auth: s.auth,
                    warnings: [
                        "YAML was read heuristically in the browser. Counts may be incomplete.",
                    ],
                };
            }
            return { ...base, summary: "YAML file registered (not an OpenAPI document)." };
        }
        if (ext === "csv" && parsable) {
            const text = await file.text();
            const lines = text.split(/\r?\n/).filter((l) => l.trim());
            return {
                ...base,
                kind: "import",
                summary: `CSV · ${Math.max(0, lines.length - 1)} rows`,
                rows: Math.max(0, lines.length - 1),
                columns: lines.length ? splitCsvLine(lines[0]).slice(0, 12) : [],
            };
        }
        if (ext === "xlsx" || ext === "xls") {
            return {
                ...base,
                kind: "import",
                summary: "Excel workbook registered. Sheet contents are not parsed in the browser.",
                warnings: ["Export to CSV or JSON to enable column and row summaries."],
            };
        }
        if (ext === "pdf") {
            return {
                ...base,
                summary: "PDF documentation registered. Text is not extracted in the browser.",
            };
        }
    }
    catch {
        return {
            ...base,
            summary: "File registered, but its contents could not be parsed.",
            warnings: ["The file could not be parsed. It is recorded as an unparsed document."],
        };
    }
    return base;
}
function levelFor(score) {
    if (score <= 0)
        return "none";
    if (score < 0.4)
        return "low";
    if (score < 0.8)
        return "moderate";
    return "strong";
}
const LEVEL_LABEL = {
    none: "No evidence",
    low: "Low confidence",
    moderate: "Moderate confidence",
    strong: "Strong confidence",
};
function emptyCounts() {
    return { verified: 0, document: 0, declared: 0, unverified: 0 };
}
function fingerprintOf(items) {
    return djb2(items
        .map((i) => `${i.provenance}:${i.domain}:${i.id}`)
        .sort()
        .join("|"));
}
function buildReport(items) {
    const totals = emptyCounts();
    items.forEach((i) => {
        totals[i.provenance] += 1;
    });
    const domains = DOMAINS.map((d) => {
        const mine = items.filter((i) => i.domain === d.id);
        const counts = emptyCounts();
        mine.forEach((i) => {
            counts[i.provenance] += 1;
        });
        let score = 0;
        for (const p of PROVENANCE_ORDER) {
            if (counts[p] > 0) {
                score = PROVENANCE[p].weight;
                break;
            }
        }
        if (mine.length >= 2)
            score = Math.min(1, score + 0.1);
        const gaps = [];
        if (mine.length === 0)
            gaps.push("No information provided for this area.");
        if (mine.length > 0 && counts.verified === 0)
            gaps.push("Nothing here has been verified by an institution agent yet.");
        if (mine.length > 0 && counts.document === 0 && counts.verified === 0)
            gaps.push("Add a supporting document to back up declarations or discoveries.");
        return { id: d.id, label: d.label, score, level: levelFor(score), counts, gaps };
    });
    const overall = Math.round((domains.reduce((s, d) => s + d.score, 0) / domains.length) * 100);
    const limitations = [
        "This is a preliminary, self-reported assessment. It is not an attestation, audit opinion or regulatory submission.",
        "Scores reflect how much information exists and how well it is substantiated, not whether controls are effective.",
    ];
    if (totals.verified === 0)
        limitations.push("No verified evidence has been submitted. Every finding rests on documents, declarations or unverified discovery.");
    if (totals.declared > 0)
        limitations.push(`${totals.declared} manual declaration${totals.declared === 1 ? "" : "s"} included without supporting artifacts.`);
    if (totals.unverified > 0)
        limitations.push(`${totals.unverified} item${totals.unverified === 1 ? "" : "s"} came from automated discovery and have not been confirmed by the institution.`);
    return {
        generatedAt: new Date().toISOString(),
        fingerprint: fingerprintOf(items),
        overall,
        domains,
        totals,
        limitations,
    };
}
function reportToMarkdown(report, institution, items) {
    const lines = [];
    lines.push(`# Preliminary compliance readiness report`);
    lines.push("");
    lines.push(`**Institution:** ${institution.name} (${institution.jurisdiction})`);
    lines.push(`**Institution ID:** ${institution.institution_id}`);
    lines.push(`**Generated:** ${new Date(report.generatedAt).toLocaleString()}`);
    lines.push(`**Overall evidence readiness:** ${report.overall}%`);
    lines.push("");
    lines.push("> Preliminary and self-reported. Not an attestation or audit opinion.");
    lines.push("");
    lines.push("## Evidence by provenance");
    PROVENANCE_ORDER.forEach((p) => lines.push(`- ${PROVENANCE[p].label}: ${report.totals[p]}`));
    lines.push("");
    lines.push("## Coverage by area");
    report.domains.forEach((d) => {
        lines.push(`### ${d.label} — ${LEVEL_LABEL[d.level]} (${Math.round(d.score * 100)}%)`);
        PROVENANCE_ORDER.forEach((p) => {
            if (d.counts[p] > 0)
                lines.push(`- ${PROVENANCE[p].label}: ${d.counts[p]}`);
        });
        d.gaps.forEach((g) => lines.push(`- Gap: ${g}`));
        lines.push("");
    });
    lines.push("## Evidence register");
    items.forEach((i) => lines.push(`- [${PROVENANCE[i.provenance].short}] ${i.title} — ${i.source} (${formatDate(i.at)})`));
    lines.push("");
    lines.push("## Limitations");
    report.limitations.forEach((l) => lines.push(`- ${l}`));
    return lines.join("\n");
}
function downloadBlob(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
function statusOf(p) {
    if (p >= 100)
        return "complete";
    if (p > 0)
        return "in_progress";
    return "not_started";
}
const STATUS_LABEL = {
    complete: "Complete",
    in_progress: "In progress",
    not_started: "Not started",
    optional: "Optional · later",
};
/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const styles = `
.connect-page {
  --c-bg: #f1f5f9;
  --c-card: #ffffff;
  --c-line: #e2e8f0;
  --c-line-strong: #cbd5e1;
  --c-text: #0f172a;
  --c-muted: #64748b;
  --c-accent: #0284c7;
  --c-accent-soft: #f0f9ff;
  --c-verified: #166534;
  --c-verified-bg: #dcfce7;
  --c-document: #1d4ed8;
  --c-document-bg: #dbeafe;
  --c-declared: #92400e;
  --c-declared-bg: #fef3c7;
  --c-unverified: #475569;
  --c-unverified-bg: #f1f5f9;
  --c-danger: #b91c1c;
  --c-danger-bg: #fef2f2;
  min-height: 100vh;
  padding: 76px 30px 56px;
  background: var(--c-bg);
  color: var(--c-text);
  font-family: Inter, system-ui, sans-serif;
}
.connect-wrap { max-width: 1250px; margin: 0 auto; }
.connect-eyebrow {
  color: var(--c-accent);
  font: 700 11px monospace;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.connect-title { font-size: clamp(28px, 4vw, 38px); margin: 9px 0; }
.connect-subtitle { color: var(--c-muted); line-height: 1.6; max-width: 760px; margin: 0; }
.connect-muted { color: var(--c-muted); }
.connect-small { font-size: 12px; }
.connect-card {
  background: var(--c-card);
  border: 1px solid var(--c-line);
  border-radius: 12px;
  padding: 20px;
}
.connect-card + .connect-card { margin-top: 16px; }
.connect-card-label {
  color: var(--c-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .1em;
}
.connect-metric { font-size: 30px; font-weight: 750; margin-top: 9px; }
.connect-section-title { font-size: 17px; margin: 0 0 14px; }
.connect-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 18px 0;
}
.connect-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}
.connect-grid-2 > .connect-card { margin-top: 0 !important; }
.connect-table-wrap { overflow-x: auto; }
.connect-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.connect-table th {
  text-align: left;
  padding: 11px 9px;
  color: var(--c-muted);
  border-bottom: 1px solid var(--c-line);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
  white-space: nowrap;
}
.connect-table td {
  padding: 13px 9px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}
.connect-status {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  white-space: nowrap;
}
.connect-status.active, .connect-status.complete { background: var(--c-verified-bg); color: var(--c-verified); }
.connect-status.in_progress { background: var(--c-document-bg); color: var(--c-document); }
.connect-status.optional { background: #f1f5f9; color: var(--c-muted); border: 1px dashed var(--c-line-strong); }
.connect-button {
  border: 0;
  border-radius: 7px;
  padding: 11px 16px;
  background: var(--c-accent);
  color: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}
.connect-button:hover:not(:disabled) { filter: brightness(1.07); }
.connect-button:disabled { opacity: .55; cursor: not-allowed; }
.connect-button.secondary {
  background: white;
  color: var(--c-text);
  border: 1px solid var(--c-line-strong);
}
.connect-button.small { padding: 7px 11px; font-size: 12px; }
.connect-button.link {
  background: none; color: var(--c-danger); padding: 4px 6px; font-weight: 600; font-size: 12px;
}
.connect-input, .connect-select, .connect-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid var(--c-line-strong);
  border-radius: 7px;
  margin: 7px 0 15px;
  font: inherit;
  font-size: 14px;
  background: white;
  color: var(--c-text);
}
.connect-textarea { min-height: 96px; resize: vertical; }
.connect-input:focus, .connect-select:focus, .connect-textarea:focus,
.connect-button:focus-visible, .connect-tab:focus-visible, .connect-dropzone:focus-visible {
  outline: 2px solid var(--c-accent);
  outline-offset: 2px;
}
.connect-error {
  color: var(--c-danger);
  background: var(--c-danger-bg);
  padding: 12px;
  border-radius: 8px;
  margin: 14px 0;
}
.connect-info {
  color: #075985;
  background: var(--c-accent-soft);
  border: 1px solid #bae6fd;
  padding: 14px;
  border-radius: 9px;
  line-height: 1.55;
  font-size: 13px;
}
.connect-warning {
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  padding: 12px;
  border-radius: 7px;
  margin-top: 10px;
  font-size: 12px;
}
.connect-hash { font: 11px monospace; color: var(--c-muted); word-break: break-all; }
.connect-discovery-input { display: flex; gap: 10px; margin-top: 12px; }
.connect-discovery-input .connect-input { flex: 1; min-width: 0; margin: 7px 0 0; }
.connect-endpoint {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 13px 4px; border-bottom: 1px solid var(--c-line); cursor: pointer;
}
.connect-endpoint input { margin-top: 5px; }
.connect-method {
  flex-shrink: 0; font: 700 10px monospace; color: var(--c-verified);
  background: var(--c-verified-bg); padding: 5px 7px; border-radius: 5px;
}
.connect-endpoint-path { font: 12px monospace; overflow-wrap: anywhere; }
.connect-doc-link { display: block; margin-top: 8px; color: #0369a1; font-size: 13px; overflow-wrap: anywhere; }
.connect-discovery-result { margin-top: 22px; border-top: 1px solid var(--c-line); padding-top: 20px; }

/* tabs */
.connect-tabs {
  display: flex; gap: 4px; margin: 24px 0 18px; overflow-x: auto;
  border-bottom: 1px solid var(--c-line-strong);
}
.connect-tab {
  border: 0; background: none; padding: 11px 16px; font: inherit; font-size: 14px; font-weight: 600;
  color: var(--c-muted); cursor: pointer; border-bottom: 3px solid transparent;
  white-space: nowrap; margin-bottom: -1px;
}
.connect-tab[aria-selected="true"] { color: var(--c-accent); border-bottom-color: var(--c-accent); }
.connect-tab-count {
  display: inline-block; margin-left: 6px; min-width: 18px; padding: 1px 6px; border-radius: 10px;
  background: #e2e8f0; color: #475569; font-size: 11px; text-align: center;
}

/* hero progress */
.connect-hero { display: grid; grid-template-columns: auto 1fr; gap: 26px; align-items: center; }
.connect-ring {
  --p: 0;
  width: 112px; height: 112px; border-radius: 50%;
  background: conic-gradient(var(--c-accent) calc(var(--p) * 1%), #e2e8f0 0);
  display: grid; place-items: center; flex-shrink: 0;
}
.connect-ring-inner {
  width: 86px; height: 86px; border-radius: 50%; background: white;
  display: grid; place-items: center; text-align: center;
}
.connect-ring-value { font-size: 26px; font-weight: 750; line-height: 1; }
.connect-ring-label { font-size: 9px; color: var(--c-muted); text-transform: uppercase; letter-spacing: .08em; margin-top: 3px; }
.connect-bar { height: 7px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
.connect-bar > span { display: block; height: 100%; background: var(--c-accent); border-radius: 4px; transition: width .3s; }
.connect-bar.done > span { background: #16a34a; }
.connect-bar.stack { display: flex; height: 9px; }
.connect-bar.stack > span { border-radius: 0; }

/* stages */
.connect-stage {
  display: grid; grid-template-columns: 34px 1fr auto; gap: 14px; align-items: start;
  padding: 16px 0; border-bottom: 1px solid var(--c-line);
}
.connect-stage:last-child { border-bottom: 0; }
.connect-stage-num {
  width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
  font-weight: 700; font-size: 13px; background: #e2e8f0; color: #475569;
}
.connect-stage-num.complete { background: #16a34a; color: white; }
.connect-stage-num.in_progress { background: var(--c-accent); color: white; }
.connect-stage-title { font-weight: 700; font-size: 15px; }
.connect-stage-body { min-width: 0; }
.connect-stage-body .connect-bar { margin-top: 10px; max-width: 420px; }
.connect-stage-side { text-align: right; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.connect-pct { font-weight: 750; font-size: 18px; }

/* action / issue lists */
.connect-list { list-style: none; margin: 0; padding: 0; }
.connect-list li { padding: 12px 0; border-bottom: 1px solid var(--c-line); display: flex; gap: 12px; justify-content: space-between; align-items: flex-start; }
.connect-list li:last-child { border-bottom: 0; }
.connect-list-title { font-weight: 650; font-size: 14px; }
.connect-issue-tag {
  flex-shrink: 0; font: 700 10px monospace; text-transform: uppercase; letter-spacing: .06em;
  padding: 4px 7px; border-radius: 5px; margin-top: 2px;
}
.connect-issue-tag.blocker { background: var(--c-danger-bg); color: var(--c-danger); }
.connect-issue-tag.warning { background: #fffbeb; color: #92400e; }
.connect-empty { color: var(--c-muted); font-size: 13px; padding: 6px 0; }

/* provenance */
.connect-prov {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 20px;
  font-size: 11px; font-weight: 650; white-space: nowrap;
}
.connect-prov::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.connect-prov.verified { background: var(--c-verified-bg); color: var(--c-verified); }
.connect-prov.document { background: var(--c-document-bg); color: var(--c-document); }
.connect-prov.declared { background: var(--c-declared-bg); color: var(--c-declared); }
.connect-prov.unverified { background: var(--c-unverified-bg); color: var(--c-unverified); border: 1px dashed var(--c-line-strong); }
.connect-seg.verified { background: #16a34a; }
.connect-seg.document { background: #3b82f6; }
.connect-seg.declared { background: #f59e0b; }
.connect-seg.unverified { background: #94a3b8; }
.connect-legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
.connect-legend-item { font-size: 12px; color: var(--c-muted); line-height: 1.5; }
.connect-legend-item .connect-prov { margin-bottom: 4px; }

/* chips */
.connect-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.connect-chip {
  border: 1px solid var(--c-line-strong); background: white; border-radius: 20px; padding: 5px 12px;
  font: inherit; font-size: 12px; cursor: pointer; color: var(--c-text);
}
.connect-chip[aria-pressed="true"] { background: var(--c-text); color: white; border-color: var(--c-text); }

/* dropzone */
.connect-dropzone {
  border: 2px dashed var(--c-line-strong); border-radius: 10px; padding: 26px 16px; text-align: center;
  background: #f8fafc; cursor: pointer; transition: background .15s, border-color .15s;
}
.connect-dropzone.over, .connect-dropzone:hover { background: var(--c-accent-soft); border-color: var(--c-accent); }
.connect-dropzone strong { display: block; font-size: 14px; margin-bottom: 4px; }
.connect-file-types { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-top: 10px; }
.connect-file-type { font: 600 10px monospace; padding: 3px 7px; border-radius: 4px; background: #e2e8f0; color: #475569; }
.connect-label { display: block; font-size: 13px; font-weight: 600; }

/* report */
.connect-domain-row { padding: 14px 0; border-bottom: 1px solid var(--c-line); }
.connect-domain-row:last-child { border-bottom: 0; }
.connect-domain-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; margin-bottom: 8px; flex-wrap: wrap; }
.connect-level { font-size: 11px; font-weight: 700; }
.connect-level.none { color: var(--c-danger); }
.connect-level.low { color: var(--c-declared); }
.connect-level.moderate { color: var(--c-document); }
.connect-level.strong { color: var(--c-verified); }
.connect-actions-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
.connect-planned {
  border: 1px dashed var(--c-line-strong); border-radius: 10px; padding: 16px; background: #f8fafc;
}

@media (max-width: 900px) {
  .connect-grid-2 { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .connect-page { padding: 68px 15px 40px; }
  .connect-grid-3 { grid-template-columns: 1fr; }
  .connect-table { min-width: 620px; }
  .connect-discovery-input { flex-direction: column; }
  .connect-discovery-input .connect-button { width: 100%; }
  .connect-hero { grid-template-columns: 1fr; justify-items: start; }
  .connect-stage { grid-template-columns: 30px 1fr; }
  .connect-stage-side { grid-column: 2; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; text-align: left; }
  .connect-legend { grid-template-columns: 1fr; }
  .connect-list li { flex-direction: column; }
}
@media print {
  .connect-page { padding: 0; background: white; }
  .connect-tabs, .connect-actions-row, .connect-no-print { display: none !important; }
}
`;
/* ------------------------------------------------------------------ */
/* Small presentational components                                     */
/* ------------------------------------------------------------------ */
function ProvBadge({ p }) {
    return (_jsx("span", { className: `connect-prov ${p}`, title: PROVENANCE[p].help, children: PROVENANCE[p].short }));
}
function ProgressBar({ value }) {
    return (_jsx("div", { className: `connect-bar ${value >= 100 ? "done" : ""}`, role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(value), children: _jsx("span", { style: { width: `${Math.max(0, Math.min(100, value))}%` } }) }));
}
function ProvenanceStack({ counts }) {
    const total = PROVENANCE_ORDER.reduce((s, p) => s + counts[p], 0);
    if (total === 0)
        return _jsx("div", { className: "connect-bar" });
    return (_jsx("div", { className: "connect-bar stack", "aria-label": "Evidence provenance breakdown", children: PROVENANCE_ORDER.map((p) => counts[p] > 0 ? (_jsx("span", { className: `connect-seg ${p}`, style: { width: `${(counts[p] / total) * 100}%` }, title: `${PROVENANCE[p].label}: ${counts[p]}` }, p)) : null) }));
}
function DomainSelect({ id, value, onChange, }) {
    return (_jsx("select", { id: id, className: "connect-select", value: value, onChange: (e) => onChange(e.target.value), children: DOMAINS.map((d) => (_jsx("option", { value: d.id, children: d.label }, d.id))) }));
}
/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
export default function ConnectWorkspace() {
    const [workspace, setWorkspace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const [institutionName, setInstitutionName] = useState("");
    const [jurisdiction, setJurisdiction] = useState("");
    const [sourceUrl, setSourceUrl] = useState("https://vestro-icontroll3r-dev.apps.rm3.7wse.p1.openshiftapps.com");
    const [discovering, setDiscovering] = useState(false);
    const [discoveryError, setDiscoveryError] = useState("");
    const [tab, setTab] = useState("overview");
    // Local, per-institution working data (until server endpoints exist for it).
    const [store, setStore] = useState(EMPTY_STORE);
    const loadedFor = useRef(null);
    const institutionId = workspace?.institution.institution_id ?? null;
    // Evidence intake UI state
    const [intakeDomain, setIntakeDomain] = useState("governance");
    const [dragOver, setDragOver] = useState(false);
    const [ingesting, setIngesting] = useState(false);
    const [intakeNotice, setIntakeNotice] = useState("");
    const [declDomain, setDeclDomain] = useState("governance");
    const [declStatement, setDeclStatement] = useState("");
    const [declBy, setDeclBy] = useState("");
    const [filter, setFilter] = useState("all");
    const fileInput = useRef(null);
    const discovery = store.discovery;
    const selectedEndpoints = store.selected;
    /* ---------------- persistence ---------------- */
    useEffect(() => {
        if (!institutionId) {
            loadedFor.current = null;
            return;
        }
        try {
            const raw = localStorage.getItem(storeKey(institutionId));
            setStore(raw ? { ...EMPTY_STORE, ...JSON.parse(raw) } : EMPTY_STORE);
        }
        catch {
            setStore(EMPTY_STORE);
        }
        loadedFor.current = institutionId;
    }, [institutionId]);
    useEffect(() => {
        if (!institutionId || loadedFor.current !== institutionId)
            return;
        try {
            localStorage.setItem(storeKey(institutionId), JSON.stringify(store));
        }
        catch {
            /* storage may be unavailable or full; working data stays in memory */
        }
    }, [store, institutionId]);
    const patchStore = useCallback((patch) => {
        setStore((s) => ({ ...s, ...patch }));
    }, []);
    /* ---------------- server calls (contracts unchanged) ---------------- */
    const loadWorkspace = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await connectRequest("/connect/workspace");
            if (response.status === 404) {
                setWorkspace(null);
                return;
            }
            const data = await readResponse(response);
            setWorkspace(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Connect service unavailable.");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void loadWorkspace();
    }, [loadWorkspace]);
    const createWorkspace = async (event) => {
        event.preventDefault();
        setCreating(true);
        setError("");
        try {
            const response = await connectRequest("/connect/institutions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: institutionName.trim(),
                    jurisdiction: jurisdiction.trim(),
                }),
            });
            await readResponse(response);
            await loadWorkspace();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Workspace creation failed.");
        }
        finally {
            setCreating(false);
        }
    };
    const discoverAPIs = async (event) => {
        event.preventDefault();
        setDiscovering(true);
        setDiscoveryError("");
        patchStore({ discovery: null, selected: [] });
        try {
            const submittedUrl = sourceUrl.trim();
            const parsed = new URL(submittedUrl);
            if (parsed.protocol !== "https:") {
                throw new Error("Only HTTPS connections are permitted.");
            }
            if (parsed.username || parsed.password) {
                throw new Error("Credentials must not be embedded in the URL.");
            }
            if (parsed.search || parsed.hash) {
                throw new Error("Remove URL query parameters and fragments before discovery.");
            }
            const response = await connectRequest("/connect/discovery/scan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    institution_id: workspace?.institution.institution_id,
                    // IMPORTANT: preserve the full path, not just parsed.origin.
                    target_url: parsed.href,
                }),
            });
            const result = await readResponse(response);
            patchStore({
                discovery: result,
                selected: result.endpoints
                    .filter((endpoint) => endpoint.read_only)
                    .map((endpoint) => `${endpoint.method.toUpperCase()}:${endpoint.path}`),
            });
        }
        catch (err) {
            setDiscoveryError(err instanceof Error ? err.message : "API discovery failed.");
        }
        finally {
            setDiscovering(false);
        }
    };
    const toggleEndpoint = (key) => {
        setStore((s) => ({
            ...s,
            selected: s.selected.includes(key)
                ? s.selected.filter((item) => item !== key)
                : [...s.selected, key],
        }));
    };
    /* ---------------- evidence intake ---------------- */
    const handleFiles = async (list) => {
        const files = Array.from(list);
        if (!files.length)
            return;
        setIngesting(true);
        setIntakeNotice("");
        const added = [];
        const rejected = [];
        for (const f of files) {
            if (f.size > MAX_FILE_BYTES) {
                rejected.push(`${f.name} exceeds ${formatBytes(MAX_FILE_BYTES)}`);
                continue;
            }
            added.push(await ingestFile(f, intakeDomain));
        }
        if (added.length)
            setStore((s) => ({ ...s, files: [...added, ...s.files] }));
        const msgs = [];
        if (added.length)
            msgs.push(`${added.length} file${added.length === 1 ? "" : "s"} registered.`);
        if (rejected.length)
            msgs.push(`Skipped: ${rejected.join("; ")}.`);
        setIntakeNotice(msgs.join(" "));
        setIngesting(false);
        if (fileInput.current)
            fileInput.current.value = "";
    };
    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        void handleFiles(e.dataTransfer.files);
    };
    const onPick = (e) => {
        if (e.target.files)
            void handleFiles(e.target.files);
    };
    const addDeclaration = (e) => {
        e.preventDefault();
        const statement = declStatement.trim();
        if (statement.length < 10)
            return;
        const d = {
            id: uid(),
            domain: declDomain,
            statement,
            declaredBy: declBy.trim(),
            addedAt: new Date().toISOString(),
        };
        setStore((s) => ({ ...s, declarations: [d, ...s.declarations] }));
        setDeclStatement("");
    };
    const removeLocal = (item) => {
        if (!item.removeId)
            return;
        setStore((s) => item.removeKind === "file"
            ? { ...s, files: s.files.filter((f) => f.id !== item.removeId) }
            : { ...s, declarations: s.declarations.filter((d) => d.id !== item.removeId) });
    };
    /* ---------------- derived: evidence register ---------------- */
    const items = useMemo(() => {
        if (!workspace)
            return [];
        const out = [];
        workspace.recent_evidence.forEach((e) => out.push({
            id: `v-${e.submission_id}`,
            domain: classifyVerified(e),
            provenance: "verified",
            title: e.evidence_type,
            source: e.source_system,
            at: e.received_at,
            detail: `SHA-256 ${shortHash(e.payload_sha256)}`,
        }));
        store.files.forEach((f) => {
            const common = {
                provenance: "document",
                source: `${f.name} · ${formatBytes(f.size)}`,
                at: f.addedAt,
                removable: true,
                removeKind: "file",
                removeId: f.id,
            };
            out.push({
                ...common,
                id: `f-${f.id}`,
                domain: f.domain,
                title: f.kind === "spec"
                    ? "OpenAPI specification"
                    : f.kind === "import"
                        ? "Data import"
                        : "Supporting document",
                detail: `${f.summary} · SHA-256 ${shortHash(f.sha256)}`,
            });
            if (f.kind === "spec" && f.auth && f.auth.length) {
                out.push({
                    ...common,
                    id: `f-${f.id}-auth`,
                    domain: "authentication",
                    title: "Authentication schemes (from specification)",
                    detail: f.auth.join(", "),
                    removable: false,
                });
            }
        });
        store.declarations.forEach((d) => out.push({
            id: `d-${d.id}`,
            domain: d.domain,
            provenance: "declared",
            title: d.statement,
            source: d.declaredBy || "Unattributed",
            at: d.addedAt,
            removable: true,
            removeKind: "declaration",
            removeId: d.id,
        }));
        if (store.discovery) {
            const host = (() => {
                try {
                    return new URL(store.discovery.target_url).host;
                }
                catch {
                    return store.discovery.target_url;
                }
            })();
            if (store.discovery.endpoints.length > 0) {
                out.push({
                    id: "u-discovery-inventory",
                    domain: "api_inventory",
                    provenance: "unverified",
                    title: `${store.discovery.endpoints.length} endpoints discovered`,
                    source: host,
                    at: new Date().toISOString(),
                    detail: "From API discovery. Not yet confirmed by the institution.",
                });
            }
            if (store.discovery.authentication_methods.length > 0) {
                out.push({
                    id: "u-discovery-auth",
                    domain: "authentication",
                    provenance: "unverified",
                    title: "Authentication methods discovered",
                    source: host,
                    at: new Date().toISOString(),
                    detail: store.discovery.authentication_methods.join(", "),
                });
            }
        }
        return out;
    }, [workspace, store]);
    // Timestamps for discovery items would otherwise change every render; pin them.
    const stableItems = useMemo(() => items, [items]);
    const domainStats = useMemo(() => {
        return DOMAINS.map((d) => {
            const mine = stableItems.filter((i) => i.domain === d.id);
            const counts = emptyCounts();
            mine.forEach((i) => {
                counts[i.provenance] += 1;
            });
            return { domain: d, counts, total: mine.length };
        });
    }, [stableItems]);
    const domainsCovered = domainStats.filter((d) => d.total > 0).length;
    const totals = useMemo(() => {
        const t = emptyCounts();
        stableItems.forEach((i) => {
            t[i.provenance] += 1;
        });
        return t;
    }, [stableItems]);
    /* ---------------- derived: stages, issues, actions ---------------- */
    const hasSystems = Boolean(discovery && discovery.endpoints.length > 0) ||
        store.files.some((f) => f.kind === "spec");
    const stages = useMemo(() => {
        if (!workspace)
            return [];
        const m = workspace.metrics;
        const systemsProgress = hasSystems
            ? 100
            : discovery
                ? 40
                : 0;
        const evidenceProgress = Math.round((domainsCovered / DOMAINS.length) * 100);
        let verifyProgress = 0;
        if (m.agents_total > 0)
            verifyProgress += 40;
        if (m.agents_active > 0)
            verifyProgress += 30;
        if (m.evidence_total > 0)
            verifyProgress += 30;
        const reportProgress = store.report
            ? 100
            : stableItems.length > 0
                ? 50
                : 0;
        const mk = (id, title, description, weight, progress, detail, tab) => ({
            id,
            title,
            description,
            weight,
            progress,
            status: statusOf(progress),
            detail,
            tab,
        });
        return [
            mk("institution", "Institution profile", "Name and jurisdiction registered. Everything else can follow incrementally.", 10, 100, `${workspace.institution.name} · ${workspace.institution.jurisdiction}`, "overview"),
            mk("systems", "Identify systems", "Discover APIs from a portal or gateway, or upload an OpenAPI specification.", 25, systemsProgress, hasSystems
                ? "System inventory source available."
                : discovery
                    ? "Discovery ran but found no endpoints. Try a direct spec URL or upload a specification."
                    : "No discovery run and no specification uploaded.", "discover"),
            mk("evidence", "Provide evidence", "Upload documents and data, or declare facts manually. Cover each compliance area.", 30, evidenceProgress, `${domainsCovered} of ${DOMAINS.length} compliance areas have at least one item.`, "evidence"),
            mk("verify", "Verify with agents", "Provision an institution agent so declarations can be backed by verified submissions.", 20, verifyProgress, `${m.agents_total} agent${m.agents_total === 1 ? "" : "s"} · ${m.agents_active} active · ${m.evidence_total} verified submission${m.evidence_total === 1 ? "" : "s"}`, "agents"),
            mk("report", "Preliminary report", "Generate a readiness report from whatever exists today. Regenerate as evidence improves.", 15, reportProgress, store.report
                ? `Generated ${formatDate(store.report.generatedAt)}.`
                : stableItems.length > 0
                    ? "Ready to generate."
                    : "Add at least one item to enable generation.", "report"),
            {
                id: "automation",
                title: "Sandbox & automated collection",
                description: "Connect the Vestro sandbox or live APIs so collectors keep evidence and reports current.",
                weight: 0,
                progress: 0,
                status: "optional",
                detail: "Not required for a preliminary report.",
                tab: "agents",
            },
        ];
    }, [workspace, hasSystems, discovery, domainsCovered, store.report, stableItems.length]);
    const overall = useMemo(() => {
        const weighted = stages.filter((s) => s.weight > 0);
        const totalW = weighted.reduce((s, x) => s + x.weight, 0) || 1;
        return Math.round(weighted.reduce((s, x) => s + x.progress * x.weight, 0) / totalW);
    }, [stages]);
    const reportStale = Boolean(store.report && store.report.fingerprint !== fingerprintOf(stableItems));
    const issues = useMemo(() => {
        if (!workspace)
            return [];
        const list = [];
        const m = workspace.metrics;
        if (stableItems.length === 0) {
            list.push({
                id: "no-evidence",
                severity: "blocker",
                title: "No information to report on",
                detail: "Add one document, declaration or discovery result to generate a preliminary report.",
                tab: "evidence",
            });
        }
        if (discovery && !discovery.reachable) {
            list.push({
                id: "unreachable",
                severity: "blocker",
                title: "Discovery target is not reachable",
                detail: "Check the URL, or upload an OpenAPI file instead.",
                tab: "discover",
            });
        }
        if (discovery && discovery.warnings.length > 0) {
            list.push({
                id: "disc-warnings",
                severity: "warning",
                title: `${discovery.warnings.length} discovery warning${discovery.warnings.length === 1 ? "" : "s"}`,
                detail: discovery.warnings[0],
                tab: "discover",
            });
        }
        if (m.agents_total === 0) {
            list.push({
                id: "no-agent",
                severity: "warning",
                title: "No agent provisioned",
                detail: "Without an agent, nothing can be verified. Reports will rest on documents and declarations.",
                tab: "agents",
            });
        }
        else if (m.agents_active === 0) {
            list.push({
                id: "agent-inactive",
                severity: "warning",
                title: "No active agent",
                detail: "Agents exist but none are active. Check the heartbeat on the Agents tab.",
                tab: "agents",
            });
        }
        if (reportStale) {
            list.push({
                id: "stale",
                severity: "warning",
                title: "Report is out of date",
                detail: "Evidence changed since the last report was generated.",
                tab: "report",
            });
        }
        return list;
    }, [workspace, stableItems.length, discovery, reportStale]);
    const missingDomains = domainStats.filter((d) => d.total === 0).map((d) => d.domain);
    const unverifiedDomains = domainStats.filter((d) => d.total > 0 && d.counts.verified === 0).length;
    const actions = useMemo(() => {
        if (!workspace)
            return [];
        const m = workspace.metrics;
        const list = [];
        if (!hasSystems) {
            list.push({
                id: "systems",
                title: "Identify your systems",
                detail: "Run API discovery against a portal or spec URL, or upload an OpenAPI file.",
                tab: "discover",
                cta: "Discover APIs",
            });
        }
        if (missingDomains.length > 0) {
            list.push({
                id: "missing",
                title: `Add evidence for ${missingDomains
                    .slice(0, 2)
                    .map((d) => d.label)
                    .join(" and ")}${missingDomains.length > 2 ? ` (+${missingDomains.length - 2} more)` : ""}`,
                detail: "A short declaration is enough to start. Back it with a document later.",
                tab: "evidence",
                cta: "Add evidence",
            });
        }
        if (stableItems.length > 0 && (!store.report || reportStale)) {
            list.push({
                id: "report",
                title: store.report ? "Refresh the preliminary report" : "Generate your first preliminary report",
                detail: "No sandbox or live API access needed.",
                tab: "report",
                cta: store.report ? "Regenerate" : "Generate report",
            });
        }
        if (m.agents_total === 0) {
            list.push({
                id: "agent",
                title: "Provision an institution agent",
                detail: "Agents submit evidence that Rebel can verify with integrity hashes.",
                tab: "agents",
                cta: "View agents",
            });
        }
        else if (m.evidence_total === 0) {
            list.push({
                id: "submit",
                title: "Submit evidence through an agent",
                detail: "Verified submissions raise confidence beyond declarations and documents.",
                tab: "agents",
                cta: "View agents",
            });
        }
        return list.slice(0, 4);
    }, [workspace, hasSystems, missingDomains, stableItems.length, store.report, reportStale]);
    /* ---------------- report ---------------- */
    const generateReport = () => {
        patchStore({ report: buildReport(stableItems) });
    };
    const exportMarkdown = () => {
        if (!store.report || !workspace)
            return;
        downloadBlob(`rebel-preliminary-report-${new Date(store.report.generatedAt).toISOString().slice(0, 10)}.md`, reportToMarkdown(store.report, workspace.institution, stableItems), "text/markdown");
    };
    const exportJson = () => {
        if (!store.report || !workspace)
            return;
        downloadBlob(`rebel-preliminary-report-${new Date(store.report.generatedAt).toISOString().slice(0, 10)}.json`, JSON.stringify({
            institution: workspace.institution,
            report: store.report,
            evidence: stableItems,
        }, null, 2), "application/json");
    };
    /* ---------------- render pieces ---------------- */
    const visibleItems = filter === "all" ? stableItems : stableItems.filter((i) => i.provenance === filter);
    const domainLabel = (id) => DOMAINS.find((d) => d.id === id)?.label ?? "Unclassified";
    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "discover", label: "Discover APIs" },
        { id: "evidence", label: "Evidence", count: stableItems.length },
        { id: "report", label: "Report" },
        { id: "agents", label: "Agents & verification" },
    ];
    const renderStages = () => (_jsxs("section", { className: "connect-card", "aria-labelledby": "stages-title", children: [_jsx("h2", { className: "connect-section-title", id: "stages-title", children: "Onboarding stages" }), stages.map((s, i) => (_jsxs("div", { className: "connect-stage", children: [_jsx("div", { className: `connect-stage-num ${s.status}`, "aria-hidden": "true", children: s.status === "complete" ? "✓" : i + 1 }), _jsxs("div", { className: "connect-stage-body", children: [_jsx("div", { className: "connect-stage-title", children: s.title }), _jsx("div", { className: "connect-muted connect-small", style: { marginTop: 3, lineHeight: 1.5 }, children: s.description }), _jsx("div", { className: "connect-small", style: { marginTop: 6 }, children: s.detail }), s.status !== "optional" && _jsx(ProgressBar, { value: s.progress })] }), _jsxs("div", { className: "connect-stage-side", children: [s.status !== "optional" && _jsxs("span", { className: "connect-pct", children: [s.progress, "%"] }), _jsx("span", { className: `connect-status ${s.status}`, children: STATUS_LABEL[s.status] }), s.id !== "institution" && (_jsx("button", { type: "button", className: "connect-button secondary small", onClick: () => setTab(s.tab), children: s.status === "optional" ? "Learn more" : "Open" }))] })] }, s.id)))] }));
    const renderOverview = () => (_jsxs(_Fragment, { children: [_jsxs("section", { className: "connect-card connect-hero", children: [_jsx("div", { className: "connect-ring", style: { ["--p"]: overall }, role: "img", "aria-label": `Overall onboarding ${overall} percent complete`, children: _jsx("div", { className: "connect-ring-inner", children: _jsxs("div", { children: [_jsxs("div", { className: "connect-ring-value", children: [overall, "%"] }), _jsx("div", { className: "connect-ring-label", children: "onboarded" })] }) }) }), _jsxs("div", { children: [_jsx("div", { className: "connect-eyebrow", children: "ACTIVE INSTITUTION" }), _jsx("h2", { style: { fontSize: 23, margin: "9px 0" }, children: workspace?.institution.name }), _jsxs("div", { className: "connect-muted", children: [workspace?.institution.jurisdiction, " · ", workspace?.institution.role] }), _jsxs("div", { className: "connect-muted", style: { fontSize: 11, marginTop: 8 }, children: ["Institution ID: ", workspace?.institution.institution_id] }), _jsx("p", { className: "connect-muted connect-small", style: { marginTop: 12, lineHeight: 1.55, maxWidth: 560 }, children: "You do not need live API access to begin. Provide what you have today and Rebel produces a preliminary report that improves as evidence is verified." })] })] }), _jsxs("div", { className: "connect-grid-2", children: [_jsxs("section", { className: "connect-card", "aria-labelledby": "next-title", children: [_jsx("h2", { className: "connect-section-title", id: "next-title", children: "Next steps" }), actions.length === 0 ? (_jsx("div", { className: "connect-empty", children: "All current steps are done. Keep the report fresh as evidence changes." })) : (_jsx("ul", { className: "connect-list", children: actions.map((a) => (_jsxs("li", { children: [_jsxs("div", { children: [_jsx("div", { className: "connect-list-title", children: a.title }), _jsx("div", { className: "connect-muted connect-small", style: { marginTop: 3 }, children: a.detail })] }), _jsx("button", { type: "button", className: "connect-button small", onClick: () => setTab(a.tab), children: a.cta })] }, a.id))) }))] }), _jsxs("section", { className: "connect-card", "aria-labelledby": "blockers-title", children: [_jsx("h2", { className: "connect-section-title", id: "blockers-title", children: "Blockers & warnings" }), issues.length === 0 ? (_jsx("div", { className: "connect-empty", children: "Nothing is blocking progress." })) : (_jsx("ul", { className: "connect-list", children: issues.map((i) => (_jsxs("li", { children: [_jsxs("div", { style: { display: "flex", gap: 10 }, children: [_jsx("span", { className: `connect-issue-tag ${i.severity}`, children: i.severity }), _jsxs("div", { children: [_jsx("div", { className: "connect-list-title", children: i.title }), _jsx("div", { className: "connect-muted connect-small", style: { marginTop: 3 }, children: i.detail })] })] }), i.tab && (_jsx("button", { type: "button", className: "connect-button secondary small", onClick: () => setTab(i.tab), children: "Resolve" }))] }, i.id))) }))] })] }), _jsxs("div", { className: "connect-grid-2", children: [_jsxs("section", { className: "connect-card", "aria-labelledby": "missing-title", children: [_jsx("h2", { className: "connect-section-title", id: "missing-title", children: "Missing information" }), domainStats.map(({ domain, counts, total }) => (_jsxs("div", { className: "connect-domain-row", children: [_jsxs("div", { className: "connect-domain-head", children: [_jsx("strong", { style: { fontSize: 13 }, children: domain.label }), _jsx("span", { className: "connect-muted connect-small", children: total === 0 ? "Nothing provided" : `${total} item${total === 1 ? "" : "s"}` })] }), _jsx(ProvenanceStack, { counts: counts }), total === 0 && (_jsx("div", { className: "connect-muted connect-small", style: { marginTop: 6 }, children: domain.hint }))] }, domain.id))), _jsx("div", { className: "connect-muted connect-small", style: { marginTop: 10 }, children: unverifiedDomains > 0
                                    ? `${unverifiedDomains} covered area${unverifiedDomains === 1 ? " has" : "s have"} no verified evidence yet.`
                                    : "All covered areas include verified evidence." })] }), _jsxs("section", { className: "connect-card", "aria-labelledby": "prov-title", children: [_jsx("h2", { className: "connect-section-title", id: "prov-title", children: "Evidence quality" }), _jsx(ProvenanceStack, { counts: totals }), _jsx("div", { className: "connect-legend", children: PROVENANCE_ORDER.map((p) => (_jsxs("div", { className: "connect-legend-item", children: [_jsx(ProvBadge, { p: p }), " ", _jsx("strong", { style: { color: "var(--c-text)" }, children: totals[p] }), _jsx("div", { children: PROVENANCE[p].help })] }, p))) })] })] }), renderStages()] }));
    const renderDiscover = () => (_jsxs("section", { className: "connect-card", "aria-labelledby": "disc-title", children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }, children: [_jsxs("div", { children: [_jsx("div", { className: "connect-eyebrow", children: "SYSTEM INTEGRATION" }), _jsx("h2", { className: "connect-section-title", id: "disc-title", style: { marginTop: 6, marginBottom: 0 }, children: "Discover Banking APIs" })] }), _jsx("span", { className: "connect-status", children: "API discovery" })] }), _jsxs("p", { className: "connect-muted", style: { lineHeight: 1.6 }, children: ["Enter an institution's banking portal, API gateway, or a direct OpenAPI/Swagger specification URL. Rebel will inspect accessible API documentation and identify potential read-only data endpoints. No public URL? Upload a specification on the", " ", _jsx("button", { type: "button", className: "connect-button link", style: { color: "var(--c-accent)", padding: 0 }, onClick: () => setTab("evidence"), children: "Evidence tab" }), "."] }), _jsxs("form", { onSubmit: discoverAPIs, children: [_jsx("label", { className: "connect-label", htmlFor: "bank-source-url", children: "Banking portal URL or direct OpenAPI specification URL" }), _jsxs("div", { className: "connect-discovery-input", children: [_jsx("input", { id: "bank-source-url", className: "connect-input", type: "url", value: sourceUrl, onChange: (event) => setSourceUrl(event.target.value), placeholder: "https://bank.example.com/openapi.json", required: true }), _jsx("button", { className: "connect-button", type: "submit", disabled: discovering, children: discovering ? "Discovering..." : "Discover APIs" })] })] }), _jsxs("div", { className: "connect-info", style: { marginTop: 16 }, children: [_jsx("strong", { children: "Read-only discovery:" }), " Rebel inspects accessible API documentation and permitted metadata. Discovery will not initiate payments, modify accounts or execute administrative operations. Results are recorded as ", _jsx(ProvBadge, { p: "unverified" }), " until confirmed."] }), discoveryError && (_jsx("div", { className: "connect-error", role: "alert", children: discoveryError })), discovery && (_jsxs("div", { className: "connect-discovery-result", children: [_jsx("h3", { className: "connect-section-title", children: "Discovery results" }), _jsxs("div", { className: "connect-muted", children: ["Target: ", discovery.target_url] }), discovery.discovery_mode && (_jsxs("div", { className: "connect-muted", style: { marginTop: 6 }, children: ["Discovery mode: ", discovery.discovery_mode] })), discovery.validated_origin && (_jsxs("div", { className: "connect-muted", style: { marginTop: 6 }, children: ["Validated origin: ", discovery.validated_origin] })), _jsx("div", { style: { marginTop: 12 }, children: _jsx("span", { className: `connect-status ${discovery.reachable ? "active" : ""}`, children: discovery.reachable ? "Host reachable" : "Host not reachable" }) }), _jsx("h3", { style: { fontSize: 14, marginTop: 20 }, children: "API documentation" }), discovery.documentation_urls.length === 0 ? (_jsx("p", { className: "connect-muted", children: "No API documentation was discovered." })) : (discovery.documentation_urls.map((url) => (_jsx("a", { className: "connect-doc-link", href: url, target: "_blank", rel: "noopener noreferrer", children: url }, url)))), _jsx("h3", { style: { fontSize: 14, marginTop: 20 }, children: "Authentication methods" }), _jsx("p", { className: "connect-muted", children: discovery.authentication_methods.length
                            ? discovery.authentication_methods.join(", ")
                            : "Not determined" }), _jsx("h3", { style: { fontSize: 14, marginTop: 20 }, children: "Discovered endpoints" }), discovery.endpoints.length === 0 ? (_jsx("p", { className: "connect-muted", children: "No endpoints have been identified yet." })) : (discovery.endpoints.map((endpoint) => {
                        const key = `${endpoint.method.toUpperCase()}:${endpoint.path}`;
                        return (_jsxs("label", { className: "connect-endpoint", children: [_jsx("input", { type: "checkbox", checked: selectedEndpoints.includes(key), disabled: !endpoint.read_only, onChange: () => toggleEndpoint(key) }), _jsx("span", { className: "connect-method", children: endpoint.method.toUpperCase() }), _jsxs("span", { children: [_jsx("div", { className: "connect-endpoint-path", children: endpoint.path }), _jsx("div", { className: "connect-muted", children: endpoint.description || endpoint.category || "No description available" }), !endpoint.read_only && (_jsx("div", { className: "connect-muted", style: { fontSize: 11 }, children: "Not eligible for read-only selection" }))] })] }, key));
                    })), discovery.warnings.map((warning, index) => (_jsx("div", { className: "connect-warning", children: warning }, index))), _jsxs("p", { className: "connect-muted", style: { marginTop: 15 }, children: ["Selected read-only endpoints: ", selectedEndpoints.length] }), _jsx("div", { className: "connect-info", children: "Endpoint selection is currently a discovery preview. Connection approval, authentication configuration and evidence collection will be implemented as the next integration stage. Selections are saved in this browser for this institution." }), _jsxs("div", { className: "connect-actions-row", children: [_jsx("button", { type: "button", className: "connect-button", onClick: () => setTab("report"), children: "Continue to report" }), _jsx("button", { type: "button", className: "connect-button secondary", onClick: () => setTab("evidence"), children: "Add more evidence" })] })] }))] }));
    const renderEvidence = () => (_jsxs(_Fragment, { children: [_jsxs("div", { className: "connect-grid-2", children: [_jsxs("section", { className: "connect-card", "aria-labelledby": "upload-title", children: [_jsx("h2", { className: "connect-section-title", id: "upload-title", children: "Upload documents or data" }), _jsx("label", { className: "connect-label", htmlFor: "intake-domain", children: "Applies to" }), _jsx(DomainSelect, { id: "intake-domain", value: intakeDomain, onChange: setIntakeDomain }), _jsxs("div", { className: `connect-dropzone ${dragOver ? "over" : ""}`, role: "button", tabIndex: 0, "aria-label": "Upload files", onClick: () => fileInput.current?.click(), onKeyDown: (e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        fileInput.current?.click();
                                    }
                                }, onDragOver: (e) => {
                                    e.preventDefault();
                                    setDragOver(true);
                                }, onDragLeave: () => setDragOver(false), onDrop: onDrop, children: [_jsx("strong", { children: ingesting ? "Processing…" : "Drop files here or click to browse" }), _jsxs("span", { className: "connect-muted connect-small", children: ["Up to ", formatBytes(MAX_FILE_BYTES), " each. OpenAPI files are detected automatically."] }), _jsx("div", { className: "connect-file-types", children: ["OpenAPI JSON/YAML", "PDF", "CSV", "Excel", "JSON"].map((t) => (_jsx("span", { className: "connect-file-type", children: t }, t))) })] }), _jsx("input", { ref: fileInput, type: "file", multiple: true, accept: ACCEPT, onChange: onPick, style: { display: "none" } }), intakeNotice && (_jsx("div", { className: "connect-info", style: { marginTop: 12 }, role: "status", children: intakeNotice })), _jsxs("div", { className: "connect-warning", children: ["Files are hashed and summarised in your browser and registered as", " ", _jsx("strong", { children: "uploaded documents" }), ". Transmission to Rebel will be enabled when the evidence upload API is available; nothing here counts as verified."] })] }), _jsxs("section", { className: "connect-card", "aria-labelledby": "decl-title", children: [_jsx("h2", { className: "connect-section-title", id: "decl-title", children: "Declare manually" }), _jsx("p", { className: "connect-muted connect-small", style: { marginTop: -6, lineHeight: 1.55 }, children: "No document handy? State what you know. Declarations are labelled as such in every report." }), _jsxs("form", { onSubmit: addDeclaration, children: [_jsx("label", { className: "connect-label", htmlFor: "decl-domain", children: "Compliance area" }), _jsx(DomainSelect, { id: "decl-domain", value: declDomain, onChange: setDeclDomain }), _jsx("label", { className: "connect-label", htmlFor: "decl-statement", children: "Statement" }), _jsx("textarea", { id: "decl-statement", className: "connect-textarea", value: declStatement, onChange: (e) => setDeclStatement(e.target.value), placeholder: "e.g. All customer-facing APIs require OAuth 2.0 with mutual TLS.", minLength: 10, maxLength: 1000, required: true }), _jsx("label", { className: "connect-label", htmlFor: "decl-by", children: "Declared by (optional)" }), _jsx("input", { id: "decl-by", className: "connect-input", value: declBy, onChange: (e) => setDeclBy(e.target.value), placeholder: "Name or role", maxLength: 100 }), _jsx("button", { className: "connect-button", type: "submit", disabled: declStatement.trim().length < 10, children: "Add declaration" })] })] })] }), _jsxs("section", { className: "connect-card", style: { marginTop: 16 }, "aria-labelledby": "register-title", children: [_jsx("h2", { className: "connect-section-title", id: "register-title", children: "Evidence register" }), _jsxs("div", { className: "connect-chips", role: "group", "aria-label": "Filter by provenance", children: [_jsxs("button", { type: "button", className: "connect-chip", "aria-pressed": filter === "all", onClick: () => setFilter("all"), children: ["All (", stableItems.length, ")"] }), PROVENANCE_ORDER.map((p) => (_jsxs("button", { type: "button", className: "connect-chip", "aria-pressed": filter === p, onClick: () => setFilter(p), children: [PROVENANCE[p].label, " (", totals[p], ")"] }, p)))] }), visibleItems.length === 0 ? (_jsx("div", { className: "connect-empty", children: stableItems.length === 0
                            ? "Nothing yet. Upload a file, add a declaration or run API discovery."
                            : "No items match this filter." })) : (_jsx("div", { className: "connect-table-wrap", children: _jsxs("table", { className: "connect-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Provenance" }), _jsx("th", { children: "Area" }), _jsx("th", { children: "Item" }), _jsx("th", { children: "Source" }), _jsx("th", { children: "Recorded" }), _jsx("th", {})] }) }), _jsx("tbody", { children: visibleItems.map((i) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx(ProvBadge, { p: i.provenance }) }), _jsx("td", { children: domainLabel(i.domain) }), _jsxs("td", { style: { maxWidth: 380 }, children: [_jsx("strong", { children: i.title }), i.detail && _jsx("div", { className: "connect-muted connect-small", style: { marginTop: 3, overflowWrap: "anywhere" }, children: i.detail })] }), _jsx("td", { className: "connect-muted", children: i.source }), _jsx("td", { className: "connect-muted", children: formatDate(i.at) }), _jsx("td", { children: i.removable && (_jsx("button", { type: "button", className: "connect-button link", onClick: () => removeLocal(i), children: "Remove" })) })] }, i.id))) })] }) }))] })] }));
    const renderReport = () => {
        const r = store.report;
        return (_jsxs(_Fragment, { children: [_jsxs("section", { className: "connect-card", "aria-labelledby": "report-title", children: [_jsx("div", { className: "connect-eyebrow", children: "COMPLIANCE ASSESSMENT" }), _jsx("h2", { className: "connect-section-title", id: "report-title", style: { marginTop: 6 }, children: "Preliminary readiness report" }), _jsx("p", { className: "connect-muted", style: { lineHeight: 1.6, marginTop: 0 }, children: "Built from everything on the Evidence tab. It does not require sandbox access or live API integration, and each finding shows how well it is substantiated." }), _jsxs("div", { className: "connect-actions-row connect-no-print", children: [_jsx("button", { type: "button", className: "connect-button", onClick: generateReport, disabled: stableItems.length === 0, children: r ? "Regenerate report" : "Generate preliminary report" }), r && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "connect-button secondary", onClick: exportMarkdown, children: "Download Markdown" }), _jsx("button", { type: "button", className: "connect-button secondary", onClick: exportJson, children: "Download JSON" }), _jsx("button", { type: "button", className: "connect-button secondary", onClick: () => window.print(), children: "Print" })] }))] }), stableItems.length === 0 && (_jsx("div", { className: "connect-warning", children: "Add at least one document, declaration or discovery result to enable generation." })), reportStale && (_jsx("div", { className: "connect-warning", role: "status", children: "Evidence has changed since this report was generated. Regenerate to include the latest items." }))] }), r && workspace && (_jsxs("section", { className: "connect-card", "aria-label": "Report preview", children: [_jsxs("div", { className: "connect-hero", children: [_jsx("div", { className: "connect-ring", style: { ["--p"]: r.overall }, role: "img", "aria-label": `Evidence readiness ${r.overall} percent`, children: _jsx("div", { className: "connect-ring-inner", children: _jsxs("div", { children: [_jsxs("div", { className: "connect-ring-value", children: [r.overall, "%"] }), _jsx("div", { className: "connect-ring-label", children: "readiness" })] }) }) }), _jsxs("div", { children: [_jsx("h3", { style: { margin: 0, fontSize: 18 }, children: workspace.institution.name }), _jsxs("div", { className: "connect-muted connect-small", style: { marginTop: 4 }, children: ["Generated ", formatDate(r.generatedAt), " \u00B7 ", workspace.institution.jurisdiction] }), _jsx("div", { style: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }, children: PROVENANCE_ORDER.map((p) => (_jsxs("span", { className: `connect-prov ${p}`, children: [PROVENANCE[p].short, ": ", r.totals[p]] }, p))) })] })] }), _jsx("h3", { style: { fontSize: 15, marginTop: 26 }, children: "Coverage by area" }), r.domains.map((d) => (_jsxs("div", { className: "connect-domain-row", children: [_jsxs("div", { className: "connect-domain-head", children: [_jsx("strong", { style: { fontSize: 14 }, children: d.label }), _jsxs("span", { className: `connect-level ${d.level}`, children: [LEVEL_LABEL[d.level], " \u00B7 ", Math.round(d.score * 100), "%"] })] }), _jsx(ProvenanceStack, { counts: d.counts }), _jsx("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }, children: PROVENANCE_ORDER.filter((p) => d.counts[p] > 0).map((p) => (_jsxs("span", { className: `connect-prov ${p}`, children: [PROVENANCE[p].short, " \u00D7", d.counts[p]] }, p))) }), d.gaps.map((g) => (_jsxs("div", { className: "connect-muted connect-small", style: { marginTop: 6 }, children: ["\u2022 ", g] }, g)))] }, d.id))), _jsx("h3", { style: { fontSize: 15, marginTop: 26 }, children: "Limitations" }), _jsx("ul", { style: { margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 13 }, children: r.limitations.map((l) => (_jsx("li", { children: l }, l))) })] }))] }));
    };
    const renderAgents = () => {
        if (!workspace)
            return null;
        return (_jsxs(_Fragment, { children: [_jsxs("section", { className: "connect-grid-3", children: [_jsxs("div", { className: "connect-card", children: [_jsx("div", { className: "connect-card-label", children: "Registered agents" }), _jsx("div", { className: "connect-metric", children: workspace.metrics.agents_total })] }), _jsxs("div", { className: "connect-card", children: [_jsx("div", { className: "connect-card-label", children: "Active agents" }), _jsx("div", { className: "connect-metric", children: workspace.metrics.agents_active })] }), _jsxs("div", { className: "connect-card", children: [_jsx("div", { className: "connect-card-label", children: "Evidence submissions" }), _jsx("div", { className: "connect-metric", children: workspace.metrics.evidence_total })] })] }), _jsxs("section", { className: "connect-card", children: [_jsx("h2", { className: "connect-section-title", children: "Connected agents" }), workspace.agents.length === 0 ? (_jsx("div", { className: "connect-muted", children: "No agents have been provisioned for this institution yet." })) : (_jsx("div", { className: "connect-table-wrap", children: _jsxs("table", { className: "connect-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Agent" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Created" }), _jsx("th", { children: "Last heartbeat" })] }) }), _jsx("tbody", { children: workspace.agents.map((agent) => (_jsxs("tr", { children: [_jsxs("td", { children: [_jsx("strong", { children: agent.name }), _jsx("div", { className: "connect-muted", style: { fontSize: 10 }, children: agent.agent_id })] }), _jsx("td", { children: _jsx("span", { className: `connect-status ${agent.status === "active" ? "active" : ""}`, children: agent.status }) }), _jsx("td", { children: agent.created_at ? new Date(agent.created_at).toLocaleString() : "—" }), _jsx("td", { children: agent.last_seen_at ? new Date(agent.last_seen_at).toLocaleString() : "Never" })] }, agent.agent_id))) })] }) }))] }), _jsxs("section", { className: "connect-card", children: [_jsxs("h2", { className: "connect-section-title", children: ["Recent evidence ", _jsx(ProvBadge, { p: "verified" })] }), workspace.recent_evidence.length === 0 ? (_jsx("div", { className: "connect-muted", children: "No evidence has been received. Once an institution agent submits evidence, its source, type, timestamp and integrity hash will appear here." })) : (_jsx("div", { className: "connect-table-wrap", children: _jsxs("table", { className: "connect-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Source" }), _jsx("th", { children: "Evidence type" }), _jsx("th", { children: "Received" }), _jsx("th", { children: "Integrity hash" })] }) }), _jsx("tbody", { children: workspace.recent_evidence.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.source_system }), _jsx("td", { children: item.evidence_type }), _jsx("td", { children: new Date(item.received_at).toLocaleString() }), _jsx("td", { className: "connect-hash", children: item.payload_sha256 })] }, item.submission_id))) })] }) }))] }), _jsxs("section", { className: "connect-card", children: [_jsx("h2", { className: "connect-section-title", children: "Sandbox & automated collection" }), _jsxs("div", { className: "connect-planned", children: [_jsx("span", { className: "connect-status optional", children: "Planned" }), _jsxs("p", { style: { lineHeight: 1.6, margin: "10px 0 0", fontSize: 13 }, children: ["When Vestro sandbox credentials are available, approved read-only endpoints from discovery become scheduled collectors. Their submissions arrive as", " ", _jsx(ProvBadge, { p: "verified" }), " evidence and the preliminary report refreshes automatically as new data lands. Nothing on this page needs to change to adopt it: existing declarations and documents stay in place and are progressively superseded by verified data."] })] })] }), _jsxs("div", { className: "connect-info", style: { marginTop: 16 }, children: [_jsx("strong", { children: "Integration workflow:" }), " Discover the institution's existing APIs, approve the required read-only resources, configure authentication and then provision an institution-specific data collector."] }), _jsx("button", { className: "connect-button", style: { marginTop: 18 }, onClick: () => void loadWorkspace(), children: "Refresh workspace" })] }));
    };
    /* ---------------- page ---------------- */
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: styles }), _jsx("main", { className: "connect-page", children: _jsxs("div", { className: "connect-wrap", children: [_jsx("div", { className: "connect-eyebrow", children: "REBEL // INSTITUTIONAL CONNECT" }), _jsx("h1", { className: "connect-title", children: "Institution Connect" }), _jsx("p", { className: "connect-subtitle", children: "Connect your institution's existing systems to Rebel. Start with whatever you have: an API URL, a spec, a PDF, a spreadsheet or a simple statement. Build toward verified evidence and compliance assessments at your own pace." }), error && (_jsx("div", { className: "connect-error", role: "alert", children: error })), loading ? (_jsx("div", { className: "connect-card", style: { marginTop: 25 }, children: "Loading institution workspace\u2026" })) : workspace ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "connect-tabs", role: "tablist", "aria-label": "Workspace sections", children: tabs.map((t) => (_jsxs("button", { type: "button", role: "tab", id: `tab-${t.id}`, "aria-selected": tab === t.id, "aria-controls": `panel-${t.id}`, className: "connect-tab", onClick: () => setTab(t.id), children: [t.label, typeof t.count === "number" && t.count > 0 && (_jsx("span", { className: "connect-tab-count", children: t.count }))] }, t.id))) }), _jsxs("div", { role: "tabpanel", id: `panel-${tab}`, "aria-labelledby": `tab-${tab}`, children: [tab === "overview" && renderOverview(), tab === "discover" && renderDiscover(), tab === "evidence" && renderEvidence(), tab === "report" && renderReport(), tab === "agents" && renderAgents()] })] })) : (_jsxs("section", { className: "connect-card", style: { maxWidth: 650, marginTop: 25 }, children: [_jsx("div", { className: "connect-eyebrow", children: "INITIALIZE WORKSPACE" }), _jsx("h2", { style: { fontSize: 23, margin: "10px 0" }, children: "Register your institution" }), _jsx("p", { className: "connect-muted", style: { lineHeight: 1.6, marginBottom: 18 }, children: "Two fields to begin. Create the institution workspace that will own your connected systems, agents and evidence. Your account will become its initial institution owner. Everything else can be added later." }), _jsxs("form", { onSubmit: createWorkspace, children: [_jsx("label", { className: "connect-label", htmlFor: "institution-name", children: "Legal or operating institution name" }), _jsx("input", { id: "institution-name", className: "connect-input", value: institutionName, onChange: (event) => setInstitutionName(event.target.value), placeholder: "e.g. Vestro Bank", minLength: 2, maxLength: 200, required: true }), _jsx("label", { className: "connect-label", htmlFor: "institution-jurisdiction", children: "Primary jurisdiction" }), _jsx("input", { id: "institution-jurisdiction", className: "connect-input", value: jurisdiction, onChange: (event) => setJurisdiction(event.target.value), placeholder: "e.g. Zimbabwe", minLength: 2, maxLength: 100, required: true }), _jsx("button", { className: "connect-button", disabled: creating, type: "submit", children: creating ? "Creating workspace…" : "Create institution workspace" })] }), _jsx("p", { className: "connect-muted", style: { fontSize: 12, marginTop: 18 }, children: "Joining an existing institution by invitation will be added as the next membership workflow." })] }))] }) })] }));
}
