import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, DragEvent, FormEvent } from "react";

const API_BASE = "https://r3bel-5464.onrender.com";

/* ------------------------------------------------------------------ */
/* Server contracts (unchanged)                                        */
/* ------------------------------------------------------------------ */

interface Agent {
  agent_id: string;
  name: string;
  status: string;
  created_at?: string | null;
  last_seen_at?: string | null;
}

interface Evidence {
  submission_id: string;
  source_system: string;
  evidence_type: string;
  received_at: string;
  payload_sha256: string;
}

interface Institution {
  institution_id: string;
  name: string;
  jurisdiction: string;
  role: string;
}

interface Workspace {
  institution: Institution;
  metrics: {
    agents_total: number;
    agents_active: number;
    evidence_total: number;
  };
  agents: Agent[];
  recent_evidence: Evidence[];
}

interface DiscoveredEndpoint {
  path: string;
  method: string;
  description?: string;
  category?: string;
  read_only: boolean;
}

interface DiscoveryResult {
  target_url: string;
  validated_origin?: string;
  discovery_mode?: string;
  reachable: boolean;
  documentation_urls: string[];
  authentication_methods: string[];
  endpoints: DiscoveredEndpoint[];
  warnings: string[];
  discovery_id?: string;
}

async function connectRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("access");

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail ||
        data.message ||
        `Connect request failed (${response.status}).`
    );
  }

  return data as T;
}

/* ------------------------------------------------------------------ */
/* Client-side model                                                   */
/* ------------------------------------------------------------------ */

type Provenance = "verified" | "document" | "declared" | "unverified";
type TabId = "overview" | "discover" | "evidence" | "report" | "agents";
type FileKind = "spec" | "document" | "import";

interface Domain {
  id: string;
  label: string;
  hint: string;
}

const DOMAINS: Domain[] = [
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

const PROVENANCE: Record<
  Provenance,
  { label: string; short: string; weight: number; help: string }
> = {
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

const PROVENANCE_ORDER: Provenance[] = [
  "verified",
  "document",
  "declared",
  "unverified",
];

interface EvidenceItem {
  id: string;
  domain: string | null;
  provenance: Provenance;
  title: string;
  source: string;
  at: string;
  detail?: string;
  removable?: boolean;
  removeKind?: "file" | "declaration";
  removeId?: string;
}

interface FileRecord {
  id: string;
  name: string;
  size: number;
  mime: string;
  sha256: string;
  addedAt: string;
  kind: FileKind;
  domain: string;
  summary: string;
  columns?: string[];
  rows?: number;
  endpoints?: number;
  readOnlyEndpoints?: number;
  auth?: string[];
  warnings?: string[];
}

interface Declaration {
  id: string;
  domain: string;
  statement: string;
  declaredBy: string;
  addedAt: string;
}

interface ReportDomain {
  id: string;
  label: string;
  score: number;
  level: "none" | "low" | "moderate" | "strong";
  counts: Record<Provenance, number>;
  gaps: string[];
}

interface StoredReport {
  generatedAt: string;
  fingerprint: string;
  overall: number;
  domains: ReportDomain[];
  totals: Record<Provenance, number>;
  limitations: string[];
}

interface LocalStore {
  discovery: DiscoveryResult | null;
  selected: string[];
  files: FileRecord[];
  declarations: Declaration[];
  report: StoredReport | null;
}

const EMPTY_STORE: LocalStore = {
  discovery: null,
  selected: [],
  files: [],
  declarations: [],
  report: null,
};

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_PARSE_BYTES = 5 * 1024 * 1024;
const ACCEPT =
  ".json,.yaml,.yml,.pdf,.csv,.xlsx,.xls,application/json,application/pdf,text/csv";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function storeKey(institutionId: string): string {
  return `rebel.connect.v1.${institutionId}`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function shortHash(h: string): string {
  return h.length > 20 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h;
}

async function sha256File(file: File): Promise<string> {
  try {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "unavailable";
  }
}

function djb2(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

function guessDomain(name: string): string {
  const n = name.toLowerCase();
  if (/openapi|swagger|api|endpoint/.test(n)) return "api_inventory";
  if (/auth|oauth|iam|access|identity|role/.test(n)) return "authentication";
  if (/privacy|gdpr|encrypt|pii|retention|dpia|data/.test(n))
    return "data_protection";
  if (/aml|sanction|monitor|fraud|transaction|kyc/.test(n)) return "monitoring";
  if (/incident|resilien|bcp|disaster|outage|recovery/.test(n)) return "incident";
  if (/audit|log|siem/.test(n)) return "audit";
  return "governance";
}

function classifyVerified(item: Evidence): string | null {
  const t = `${item.evidence_type} ${item.source_system}`.toLowerCase();
  if (/auth|iam|identity|access|oauth/.test(t)) return "authentication";
  if (/openapi|endpoint|inventory|\bapi\b/.test(t)) return "api_inventory";
  if (/aml|transaction|monitor|fraud|sanction/.test(t)) return "monitoring";
  if (/incident|resilien|bcp|\bdr\b|outage/.test(t)) return "incident";
  if (/\blog|audit|retention/.test(t)) return "audit";
  if (/privacy|encrypt|\bpii\b|gdpr|data/.test(t)) return "data_protection";
  if (/govern|policy|board|owner/.test(t)) return "governance";
  return null;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (c === '"') {
        quoted = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];
const READ_METHODS = ["get", "head", "options"];

interface SpecSummary {
  endpoints: number;
  readOnly: number;
  auth: string[];
  version?: string;
}

function analyzeOpenApiObject(doc: Record<string, unknown>): SpecSummary {
  const paths = (doc.paths ?? {}) as Record<string, Record<string, unknown>>;
  let endpoints = 0;
  let readOnly = 0;
  for (const methods of Object.values(paths)) {
    if (!methods || typeof methods !== "object") continue;
    for (const m of Object.keys(methods)) {
      if (HTTP_METHODS.includes(m.toLowerCase())) {
        endpoints += 1;
        if (READ_METHODS.includes(m.toLowerCase())) readOnly += 1;
      }
    }
  }
  const comps = (doc.components ?? {}) as Record<string, unknown>;
  const schemes = (comps.securitySchemes ?? doc.securityDefinitions ?? {}) as Record<
    string,
    { type?: string; scheme?: string }
  >;
  const auth = Object.values(schemes)
    .map((s) => (s?.scheme ? `${s.type}:${s.scheme}` : s?.type))
    .filter((s): s is string => Boolean(s));
  const version = String(doc.openapi ?? doc.swagger ?? "") || undefined;
  return { endpoints, readOnly, auth: Array.from(new Set(auth)), version };
}

function analyzeOpenApiYaml(text: string): SpecSummary | null {
  const version = /^(?:openapi|swagger):\s*['"]?([\d.]+)/m.exec(text)?.[1];
  if (!version) return null;
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^paths:\s*$/.test(l));
  let endpoints = 0;
  let readOnly = 0;
  if (start >= 0) {
    for (let i = start + 1; i < lines.length; i += 1) {
      const l = lines[i];
      if (l.trim() && !/^\s/.test(l)) break;
      const m = /^\s{4}(get|post|put|patch|delete|head|options):/i.exec(l);
      if (m) {
        endpoints += 1;
        if (READ_METHODS.includes(m[1].toLowerCase())) readOnly += 1;
      }
    }
  }
  const auth = Array.from(
    new Set(
      Array.from(
        text.matchAll(/^\s+type:\s*(http|apiKey|oauth2|openIdConnect|basic)\s*$/gm)
      ).map((m) => m[1])
    )
  );
  return { endpoints, readOnly, auth, version };
}

async function ingestFile(file: File, domain: string): Promise<FileRecord> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const base: FileRecord = {
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
      const parsed = JSON.parse(text) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        ("openapi" in parsed || "swagger" in parsed)
      ) {
        const s = analyzeOpenApiObject(parsed as Record<string, unknown>);
        return {
          ...base,
          kind: "spec",
          domain: "api_inventory",
          summary: `OpenAPI ${s.version ?? ""} · ${s.endpoints} operations (${s.readOnly} read-only) · ${
            s.auth.length ? s.auth.join(", ") : "no security schemes declared"
          }`,
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
          columns:
            first && typeof first === "object"
              ? Object.keys(first as object).slice(0, 12)
              : undefined,
        };
      }
      return {
        ...base,
        kind: "import",
        summary: `JSON object · ${Object.keys(parsed as object).length} top-level keys`,
        columns: Object.keys(parsed as object).slice(0, 12),
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
          summary: `OpenAPI ${s.version ?? ""} (YAML, heuristic read) · ${s.endpoints} operations · ${
            s.auth.length ? s.auth.join(", ") : "no security schemes found"
          }`,
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
  } catch {
    return {
      ...base,
      summary: "File registered, but its contents could not be parsed.",
      warnings: ["The file could not be parsed. It is recorded as an unparsed document."],
    };
  }

  return base;
}

function levelFor(score: number): ReportDomain["level"] {
  if (score <= 0) return "none";
  if (score < 0.4) return "low";
  if (score < 0.8) return "moderate";
  return "strong";
}

const LEVEL_LABEL: Record<ReportDomain["level"], string> = {
  none: "No evidence",
  low: "Low confidence",
  moderate: "Moderate confidence",
  strong: "Strong confidence",
};

function emptyCounts(): Record<Provenance, number> {
  return { verified: 0, document: 0, declared: 0, unverified: 0 };
}

function fingerprintOf(items: EvidenceItem[]): string {
  return djb2(
    items
      .map((i) => `${i.provenance}:${i.domain}:${i.id}`)
      .sort()
      .join("|")
  );
}

function buildReport(items: EvidenceItem[]): StoredReport {
  const totals = emptyCounts();
  items.forEach((i) => {
    totals[i.provenance] += 1;
  });

  const domains: ReportDomain[] = DOMAINS.map((d) => {
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
    if (mine.length >= 2) score = Math.min(1, score + 0.1);

    const gaps: string[] = [];
    if (mine.length === 0) gaps.push("No information provided for this area.");
    if (mine.length > 0 && counts.verified === 0)
      gaps.push("Nothing here has been verified by an institution agent yet.");
    if (mine.length > 0 && counts.document === 0 && counts.verified === 0)
      gaps.push("Add a supporting document to back up declarations or discoveries.");

    return { id: d.id, label: d.label, score, level: levelFor(score), counts, gaps };
  });

  const overall = Math.round(
    (domains.reduce((s, d) => s + d.score, 0) / domains.length) * 100
  );

  const limitations = [
    "This is a preliminary, self-reported assessment. It is not an attestation, audit opinion or regulatory submission.",
    "Scores reflect how much information exists and how well it is substantiated, not whether controls are effective.",
  ];
  if (totals.verified === 0)
    limitations.push(
      "No verified evidence has been submitted. Every finding rests on documents, declarations or unverified discovery."
    );
  if (totals.declared > 0)
    limitations.push(
      `${totals.declared} manual declaration${totals.declared === 1 ? "" : "s"} included without supporting artifacts.`
    );
  if (totals.unverified > 0)
    limitations.push(
      `${totals.unverified} item${totals.unverified === 1 ? "" : "s"} came from automated discovery and have not been confirmed by the institution.`
    );

  return {
    generatedAt: new Date().toISOString(),
    fingerprint: fingerprintOf(items),
    overall,
    domains,
    totals,
    limitations,
  };
}

function reportToMarkdown(
  report: StoredReport,
  institution: Institution,
  items: EvidenceItem[]
): string {
  const lines: string[] = [];
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
  PROVENANCE_ORDER.forEach((p) =>
    lines.push(`- ${PROVENANCE[p].label}: ${report.totals[p]}`)
  );
  lines.push("");
  lines.push("## Coverage by area");
  report.domains.forEach((d) => {
    lines.push(`### ${d.label} — ${LEVEL_LABEL[d.level]} (${Math.round(d.score * 100)}%)`);
    PROVENANCE_ORDER.forEach((p) => {
      if (d.counts[p] > 0) lines.push(`- ${PROVENANCE[p].label}: ${d.counts[p]}`);
    });
    d.gaps.forEach((g) => lines.push(`- Gap: ${g}`));
    lines.push("");
  });
  lines.push("## Evidence register");
  items.forEach((i) =>
    lines.push(
      `- [${PROVENANCE[i.provenance].short}] ${i.title} — ${i.source} (${formatDate(i.at)})`
    )
  );
  lines.push("");
  lines.push("## Limitations");
  report.limitations.forEach((l) => lines.push(`- ${l}`));
  return lines.join("\n");
}

function downloadBlob(name: string, content: string, type: string) {
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

/* ------------------------------------------------------------------ */
/* Onboarding stages                                                   */
/* ------------------------------------------------------------------ */

type StageStatus = "complete" | "in_progress" | "not_started" | "optional";

interface Stage {
  id: string;
  title: string;
  description: string;
  weight: number;
  progress: number;
  status: StageStatus;
  detail: string;
  tab: TabId;
}

interface Action {
  id: string;
  title: string;
  detail: string;
  tab: TabId;
  cta: string;
}

interface Issue {
  id: string;
  severity: "blocker" | "warning";
  title: string;
  detail: string;
  tab?: TabId;
}

function statusOf(p: number): StageStatus {
  if (p >= 100) return "complete";
  if (p > 0) return "in_progress";
  return "not_started";
}

const STATUS_LABEL: Record<StageStatus, string> = {
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

function ProvBadge({ p }: { p: Provenance }) {
  return (
    <span className={`connect-prov ${p}`} title={PROVENANCE[p].help}>
      {PROVENANCE[p].short}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className={`connect-bar ${value >= 100 ? "done" : ""}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function ProvenanceStack({ counts }: { counts: Record<Provenance, number> }) {
  const total = PROVENANCE_ORDER.reduce((s, p) => s + counts[p], 0);
  if (total === 0) return <div className="connect-bar" />;
  return (
    <div className="connect-bar stack" aria-label="Evidence provenance breakdown">
      {PROVENANCE_ORDER.map((p) =>
        counts[p] > 0 ? (
          <span
            key={p}
            className={`connect-seg ${p}`}
            style={{ width: `${(counts[p] / total) * 100}%` }}
            title={`${PROVENANCE[p].label}: ${counts[p]}`}
          />
        ) : null
      )}
    </div>
  );
}

function DomainSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      id={id}
      className="connect-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {DOMAINS.map((d) => (
        <option key={d.id} value={d.id}>
          {d.label}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function ConnectWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [institutionName, setInstitutionName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");

  const [sourceUrl, setSourceUrl] = useState(
    "https://vestro-icontroll3r-dev.apps.rm3.7wse.p1.openshiftapps.com"
  );

  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState("");

  const [tab, setTab] = useState<TabId>("overview");

  // Local, per-institution working data (until server endpoints exist for it).
  const [store, setStore] = useState<LocalStore>(EMPTY_STORE);
  const loadedFor = useRef<string | null>(null);
  const institutionId = workspace?.institution.institution_id ?? null;

  // Evidence intake UI state
  const [intakeDomain, setIntakeDomain] = useState("governance");
  const [dragOver, setDragOver] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [intakeNotice, setIntakeNotice] = useState("");
  const [declDomain, setDeclDomain] = useState("governance");
  const [declStatement, setDeclStatement] = useState("");
  const [declBy, setDeclBy] = useState("");
  const [filter, setFilter] = useState<Provenance | "all">("all");
  const fileInput = useRef<HTMLInputElement>(null);

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
      setStore(raw ? { ...EMPTY_STORE, ...(JSON.parse(raw) as LocalStore) } : EMPTY_STORE);
    } catch {
      setStore(EMPTY_STORE);
    }
    loadedFor.current = institutionId;
  }, [institutionId]);

  useEffect(() => {
    if (!institutionId || loadedFor.current !== institutionId) return;
    try {
      localStorage.setItem(storeKey(institutionId), JSON.stringify(store));
    } catch {
      /* storage may be unavailable or full; working data stays in memory */
    }
  }, [store, institutionId]);

  const patchStore = useCallback((patch: Partial<LocalStore>) => {
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

      const data = await readResponse<Workspace>(response);
      setWorkspace(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Connect service unavailable."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const createWorkspace = async (event: FormEvent<HTMLFormElement>) => {
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

      await readResponse<unknown>(response);
      await loadWorkspace();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Workspace creation failed."
      );
    } finally {
      setCreating(false);
    }
  };

  const discoverAPIs = async (event: FormEvent<HTMLFormElement>) => {
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
        throw new Error(
          "Remove URL query parameters and fragments before discovery."
        );
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

      const result = await readResponse<DiscoveryResult>(response);

      patchStore({
        discovery: result,
        selected: result.endpoints
          .filter((endpoint) => endpoint.read_only)
          .map((endpoint) => `${endpoint.method.toUpperCase()}:${endpoint.path}`),
      });
    } catch (err) {
      setDiscoveryError(
        err instanceof Error ? err.message : "API discovery failed."
      );
    } finally {
      setDiscovering(false);
    }
  };

  const toggleEndpoint = (key: string) => {
    setStore((s) => ({
      ...s,
      selected: s.selected.includes(key)
        ? s.selected.filter((item) => item !== key)
        : [...s.selected, key],
    }));
  };

  /* ---------------- evidence intake ---------------- */

  const handleFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);
    if (!files.length) return;
    setIngesting(true);
    setIntakeNotice("");
    const added: FileRecord[] = [];
    const rejected: string[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) {
        rejected.push(`${f.name} exceeds ${formatBytes(MAX_FILE_BYTES)}`);
        continue;
      }
      added.push(await ingestFile(f, intakeDomain));
    }
    if (added.length) setStore((s) => ({ ...s, files: [...added, ...s.files] }));
    const msgs: string[] = [];
    if (added.length)
      msgs.push(`${added.length} file${added.length === 1 ? "" : "s"} registered.`);
    if (rejected.length) msgs.push(`Skipped: ${rejected.join("; ")}.`);
    setIntakeNotice(msgs.join(" "));
    setIngesting(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void handleFiles(e.target.files);
  };

  const addDeclaration = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const statement = declStatement.trim();
    if (statement.length < 10) return;
    const d: Declaration = {
      id: uid(),
      domain: declDomain,
      statement,
      declaredBy: declBy.trim(),
      addedAt: new Date().toISOString(),
    };
    setStore((s) => ({ ...s, declarations: [d, ...s.declarations] }));
    setDeclStatement("");
  };

  const removeLocal = (item: EvidenceItem) => {
    if (!item.removeId) return;
    setStore((s) =>
      item.removeKind === "file"
        ? { ...s, files: s.files.filter((f) => f.id !== item.removeId) }
        : { ...s, declarations: s.declarations.filter((d) => d.id !== item.removeId) }
    );
  };

  /* ---------------- derived: evidence register ---------------- */

  const items = useMemo<EvidenceItem[]>(() => {
    if (!workspace) return [];
    const out: EvidenceItem[] = [];

    workspace.recent_evidence.forEach((e) =>
      out.push({
        id: `v-${e.submission_id}`,
        domain: classifyVerified(e),
        provenance: "verified",
        title: e.evidence_type,
        source: e.source_system,
        at: e.received_at,
        detail: `SHA-256 ${shortHash(e.payload_sha256)}`,
      })
    );

    store.files.forEach((f) => {
      const common = {
        provenance: "document" as const,
        source: `${f.name} · ${formatBytes(f.size)}`,
        at: f.addedAt,
        removable: true,
        removeKind: "file" as const,
        removeId: f.id,
      };
      out.push({
        ...common,
        id: `f-${f.id}`,
        domain: f.domain,
        title:
          f.kind === "spec"
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

    store.declarations.forEach((d) =>
      out.push({
        id: `d-${d.id}`,
        domain: d.domain,
        provenance: "declared",
        title: d.statement,
        source: d.declaredBy || "Unattributed",
        at: d.addedAt,
        removable: true,
        removeKind: "declaration",
        removeId: d.id,
      })
    );

    if (store.discovery) {
      const host = (() => {
        try {
          return new URL(store.discovery.target_url).host;
        } catch {
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

  const hasSystems =
    Boolean(discovery && discovery.endpoints.length > 0) ||
    store.files.some((f) => f.kind === "spec");

  const stages = useMemo<Stage[]>(() => {
    if (!workspace) return [];
    const m = workspace.metrics;

    const systemsProgress = hasSystems
      ? 100
      : discovery
        ? 40
        : 0;

    const evidenceProgress = Math.round((domainsCovered / DOMAINS.length) * 100);

    let verifyProgress = 0;
    if (m.agents_total > 0) verifyProgress += 40;
    if (m.agents_active > 0) verifyProgress += 30;
    if (m.evidence_total > 0) verifyProgress += 30;

    const reportProgress = store.report
      ? 100
      : stableItems.length > 0
        ? 50
        : 0;

    const mk = (
      id: string,
      title: string,
      description: string,
      weight: number,
      progress: number,
      detail: string,
      tab: TabId
    ): Stage => ({
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
      mk(
        "institution",
        "Institution profile",
        "Name and jurisdiction registered. Everything else can follow incrementally.",
        10,
        100,
        `${workspace.institution.name} · ${workspace.institution.jurisdiction}`,
        "overview"
      ),
      mk(
        "systems",
        "Identify systems",
        "Discover APIs from a portal or gateway, or upload an OpenAPI specification.",
        25,
        systemsProgress,
        hasSystems
          ? "System inventory source available."
          : discovery
            ? "Discovery ran but found no endpoints. Try a direct spec URL or upload a specification."
            : "No discovery run and no specification uploaded.",
        "discover"
      ),
      mk(
        "evidence",
        "Provide evidence",
        "Upload documents and data, or declare facts manually. Cover each compliance area.",
        30,
        evidenceProgress,
        `${domainsCovered} of ${DOMAINS.length} compliance areas have at least one item.`,
        "evidence"
      ),
      mk(
        "verify",
        "Verify with agents",
        "Provision an institution agent so declarations can be backed by verified submissions.",
        20,
        verifyProgress,
        `${m.agents_total} agent${m.agents_total === 1 ? "" : "s"} · ${m.agents_active} active · ${m.evidence_total} verified submission${m.evidence_total === 1 ? "" : "s"}`,
        "agents"
      ),
      mk(
        "report",
        "Preliminary report",
        "Generate a readiness report from whatever exists today. Regenerate as evidence improves.",
        15,
        reportProgress,
        store.report
          ? `Generated ${formatDate(store.report.generatedAt)}.`
          : stableItems.length > 0
            ? "Ready to generate."
            : "Add at least one item to enable generation.",
        "report"
      ),
      {
        id: "automation",
        title: "Sandbox & automated collection",
        description:
          "Connect the Vestro sandbox or live APIs so collectors keep evidence and reports current.",
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
    return Math.round(
      weighted.reduce((s, x) => s + x.progress * x.weight, 0) / totalW
    );
  }, [stages]);

  const reportStale = Boolean(
    store.report && store.report.fingerprint !== fingerprintOf(stableItems)
  );

  const issues = useMemo<Issue[]>(() => {
    if (!workspace) return [];
    const list: Issue[] = [];
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
    } else if (m.agents_active === 0) {
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
  const unverifiedDomains = domainStats.filter(
    (d) => d.total > 0 && d.counts.verified === 0
  ).length;

  const actions = useMemo<Action[]>(() => {
    if (!workspace) return [];
    const m = workspace.metrics;
    const list: Action[] = [];

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
    } else if (m.evidence_total === 0) {
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
    if (!store.report || !workspace) return;
    downloadBlob(
      `rebel-preliminary-report-${new Date(store.report.generatedAt).toISOString().slice(0, 10)}.md`,
      reportToMarkdown(store.report, workspace.institution, stableItems),
      "text/markdown"
    );
  };

  const exportJson = () => {
    if (!store.report || !workspace) return;
    downloadBlob(
      `rebel-preliminary-report-${new Date(store.report.generatedAt).toISOString().slice(0, 10)}.json`,
      JSON.stringify(
        {
          institution: workspace.institution,
          report: store.report,
          evidence: stableItems,
        },
        null,
        2
      ),
      "application/json"
    );
  };

  /* ---------------- render pieces ---------------- */

  const visibleItems =
    filter === "all" ? stableItems : stableItems.filter((i) => i.provenance === filter);

  const domainLabel = (id: string | null) =>
    DOMAINS.find((d) => d.id === id)?.label ?? "Unclassified";

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "discover", label: "Discover APIs" },
    { id: "evidence", label: "Evidence", count: stableItems.length },
    { id: "report", label: "Report" },
    { id: "agents", label: "Agents & verification" },
  ];

  const renderStages = () => (
    <section className="connect-card" aria-labelledby="stages-title">
      <h2 className="connect-section-title" id="stages-title">
        Onboarding stages
      </h2>
      {stages.map((s, i) => (
        <div className="connect-stage" key={s.id}>
          <div className={`connect-stage-num ${s.status}`} aria-hidden="true">
            {s.status === "complete" ? "✓" : i + 1}
          </div>
          <div className="connect-stage-body">
            <div className="connect-stage-title">{s.title}</div>
            <div className="connect-muted connect-small" style={{ marginTop: 3, lineHeight: 1.5 }}>
              {s.description}
            </div>
            <div className="connect-small" style={{ marginTop: 6 }}>
              {s.detail}
            </div>
            {s.status !== "optional" && <ProgressBar value={s.progress} />}
          </div>
          <div className="connect-stage-side">
            {s.status !== "optional" && <span className="connect-pct">{s.progress}%</span>}
            <span className={`connect-status ${s.status}`}>{STATUS_LABEL[s.status]}</span>
            {s.id !== "institution" && (
              <button
                type="button"
                className="connect-button secondary small"
                onClick={() => setTab(s.tab)}
              >
                {s.status === "optional" ? "Learn more" : "Open"}
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  );

  const renderOverview = () => (
    <>
      <section className="connect-card connect-hero">
        <div
          className="connect-ring"
          style={{ ["--p" as string]: overall } as CSSProperties}
          role="img"
          aria-label={`Overall onboarding ${overall} percent complete`}
        >
          <div className="connect-ring-inner">
            <div>
              <div className="connect-ring-value">{overall}%</div>
              <div className="connect-ring-label">onboarded</div>
            </div>
          </div>
        </div>
        <div>
          <div className="connect-eyebrow">ACTIVE INSTITUTION</div>
          <h2 style={{ fontSize: 23, margin: "9px 0" }}>{workspace?.institution.name}</h2>
          <div className="connect-muted">
            {workspace?.institution.jurisdiction}
            {" · "}
            {workspace?.institution.role}
          </div>
          <div className="connect-muted" style={{ fontSize: 11, marginTop: 8 }}>
            Institution ID: {workspace?.institution.institution_id}
          </div>
          <p className="connect-muted connect-small" style={{ marginTop: 12, lineHeight: 1.55, maxWidth: 560 }}>
            You do not need live API access to begin. Provide what you have today and Rebel
            produces a preliminary report that improves as evidence is verified.
          </p>
        </div>
      </section>

      <div className="connect-grid-2">
        <section className="connect-card" aria-labelledby="next-title">
          <h2 className="connect-section-title" id="next-title">Next steps</h2>
          {actions.length === 0 ? (
            <div className="connect-empty">All current steps are done. Keep the report fresh as evidence changes.</div>
          ) : (
            <ul className="connect-list">
              {actions.map((a) => (
                <li key={a.id}>
                  <div>
                    <div className="connect-list-title">{a.title}</div>
                    <div className="connect-muted connect-small" style={{ marginTop: 3 }}>{a.detail}</div>
                  </div>
                  <button type="button" className="connect-button small" onClick={() => setTab(a.tab)}>
                    {a.cta}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="connect-card" aria-labelledby="blockers-title">
          <h2 className="connect-section-title" id="blockers-title">Blockers & warnings</h2>
          {issues.length === 0 ? (
            <div className="connect-empty">Nothing is blocking progress.</div>
          ) : (
            <ul className="connect-list">
              {issues.map((i) => (
                <li key={i.id}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span className={`connect-issue-tag ${i.severity}`}>{i.severity}</span>
                    <div>
                      <div className="connect-list-title">{i.title}</div>
                      <div className="connect-muted connect-small" style={{ marginTop: 3 }}>{i.detail}</div>
                    </div>
                  </div>
                  {i.tab && (
                    <button type="button" className="connect-button secondary small" onClick={() => setTab(i.tab as TabId)}>
                      Resolve
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="connect-grid-2">
        <section className="connect-card" aria-labelledby="missing-title">
          <h2 className="connect-section-title" id="missing-title">Missing information</h2>
          {domainStats.map(({ domain, counts, total }) => (
            <div className="connect-domain-row" key={domain.id}>
              <div className="connect-domain-head">
                <strong style={{ fontSize: 13 }}>{domain.label}</strong>
                <span className="connect-muted connect-small">
                  {total === 0 ? "Nothing provided" : `${total} item${total === 1 ? "" : "s"}`}
                </span>
              </div>
              <ProvenanceStack counts={counts} />
              {total === 0 && (
                <div className="connect-muted connect-small" style={{ marginTop: 6 }}>{domain.hint}</div>
              )}
            </div>
          ))}
          <div className="connect-muted connect-small" style={{ marginTop: 10 }}>
            {unverifiedDomains > 0
              ? `${unverifiedDomains} covered area${unverifiedDomains === 1 ? " has" : "s have"} no verified evidence yet.`
              : "All covered areas include verified evidence."}
          </div>
        </section>

        <section className="connect-card" aria-labelledby="prov-title">
          <h2 className="connect-section-title" id="prov-title">Evidence quality</h2>
          <ProvenanceStack counts={totals} />
          <div className="connect-legend">
            {PROVENANCE_ORDER.map((p) => (
              <div className="connect-legend-item" key={p}>
                <ProvBadge p={p} /> <strong style={{ color: "var(--c-text)" }}>{totals[p]}</strong>
                <div>{PROVENANCE[p].help}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {renderStages()}
    </>
  );

  const renderDiscover = () => (
    <section className="connect-card" aria-labelledby="disc-title">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div>
          <div className="connect-eyebrow">SYSTEM INTEGRATION</div>
          <h2 className="connect-section-title" id="disc-title" style={{ marginTop: 6, marginBottom: 0 }}>
            Discover Banking APIs
          </h2>
        </div>
        <span className="connect-status">API discovery</span>
      </div>

      <p className="connect-muted" style={{ lineHeight: 1.6 }}>
        Enter an institution's banking portal, API gateway, or a direct OpenAPI/Swagger
        specification URL. Rebel will inspect accessible API documentation and identify
        potential read-only data endpoints. No public URL? Upload a specification on the{" "}
        <button type="button" className="connect-button link" style={{ color: "var(--c-accent)", padding: 0 }} onClick={() => setTab("evidence")}>
          Evidence tab
        </button>.
      </p>

      <form onSubmit={discoverAPIs}>
        <label className="connect-label" htmlFor="bank-source-url">
          Banking portal URL or direct OpenAPI specification URL
        </label>

        <div className="connect-discovery-input">
          <input
            id="bank-source-url"
            className="connect-input"
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://bank.example.com/openapi.json"
            required
          />
          <button className="connect-button" type="submit" disabled={discovering}>
            {discovering ? "Discovering..." : "Discover APIs"}
          </button>
        </div>
      </form>

      <div className="connect-info" style={{ marginTop: 16 }}>
        <strong>Read-only discovery:</strong> Rebel inspects accessible API documentation and
        permitted metadata. Discovery will not initiate payments, modify accounts or execute
        administrative operations. Results are recorded as <ProvBadge p="unverified" /> until
        confirmed.
      </div>

      {discoveryError && (
        <div className="connect-error" role="alert">{discoveryError}</div>
      )}

      {discovery && (
        <div className="connect-discovery-result">
          <h3 className="connect-section-title">Discovery results</h3>

          <div className="connect-muted">Target: {discovery.target_url}</div>

          {discovery.discovery_mode && (
            <div className="connect-muted" style={{ marginTop: 6 }}>
              Discovery mode: {discovery.discovery_mode}
            </div>
          )}

          {discovery.validated_origin && (
            <div className="connect-muted" style={{ marginTop: 6 }}>
              Validated origin: {discovery.validated_origin}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <span className={`connect-status ${discovery.reachable ? "active" : ""}`}>
              {discovery.reachable ? "Host reachable" : "Host not reachable"}
            </span>
          </div>

          <h3 style={{ fontSize: 14, marginTop: 20 }}>API documentation</h3>

          {discovery.documentation_urls.length === 0 ? (
            <p className="connect-muted">No API documentation was discovered.</p>
          ) : (
            discovery.documentation_urls.map((url) => (
              <a key={url} className="connect-doc-link" href={url} target="_blank" rel="noopener noreferrer">
                {url}
              </a>
            ))
          )}

          <h3 style={{ fontSize: 14, marginTop: 20 }}>Authentication methods</h3>

          <p className="connect-muted">
            {discovery.authentication_methods.length
              ? discovery.authentication_methods.join(", ")
              : "Not determined"}
          </p>

          <h3 style={{ fontSize: 14, marginTop: 20 }}>Discovered endpoints</h3>

          {discovery.endpoints.length === 0 ? (
            <p className="connect-muted">No endpoints have been identified yet.</p>
          ) : (
            discovery.endpoints.map((endpoint) => {
              const key = `${endpoint.method.toUpperCase()}:${endpoint.path}`;

              return (
                <label className="connect-endpoint" key={key}>
                  <input
                    type="checkbox"
                    checked={selectedEndpoints.includes(key)}
                    disabled={!endpoint.read_only}
                    onChange={() => toggleEndpoint(key)}
                  />

                  <span className="connect-method">{endpoint.method.toUpperCase()}</span>

                  <span>
                    <div className="connect-endpoint-path">{endpoint.path}</div>

                    <div className="connect-muted">
                      {endpoint.description || endpoint.category || "No description available"}
                    </div>

                    {!endpoint.read_only && (
                      <div className="connect-muted" style={{ fontSize: 11 }}>
                        Not eligible for read-only selection
                      </div>
                    )}
                  </span>
                </label>
              );
            })
          )}

          {discovery.warnings.map((warning, index) => (
            <div className="connect-warning" key={index}>{warning}</div>
          ))}

          <p className="connect-muted" style={{ marginTop: 15 }}>
            Selected read-only endpoints: {selectedEndpoints.length}
          </p>

          <div className="connect-info">
            Endpoint selection is currently a discovery preview. Connection approval,
            authentication configuration and evidence collection will be implemented as the
            next integration stage. Selections are saved in this browser for this institution.
          </div>

          <div className="connect-actions-row">
            <button type="button" className="connect-button" onClick={() => setTab("report")}>
              Continue to report
            </button>
            <button type="button" className="connect-button secondary" onClick={() => setTab("evidence")}>
              Add more evidence
            </button>
          </div>
        </div>
      )}
    </section>
  );

  const renderEvidence = () => (
    <>
      <div className="connect-grid-2">
        <section className="connect-card" aria-labelledby="upload-title">
          <h2 className="connect-section-title" id="upload-title">Upload documents or data</h2>

          <label className="connect-label" htmlFor="intake-domain">Applies to</label>
          <DomainSelect id="intake-domain" value={intakeDomain} onChange={setIntakeDomain} />

          <div
            className={`connect-dropzone ${dragOver ? "over" : ""}`}
            role="button"
            tabIndex={0}
            aria-label="Upload files"
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInput.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <strong>{ingesting ? "Processing…" : "Drop files here or click to browse"}</strong>
            <span className="connect-muted connect-small">
              Up to {formatBytes(MAX_FILE_BYTES)} each. OpenAPI files are detected automatically.
            </span>
            <div className="connect-file-types">
              {["OpenAPI JSON/YAML", "PDF", "CSV", "Excel", "JSON"].map((t) => (
                <span className="connect-file-type" key={t}>{t}</span>
              ))}
            </div>
          </div>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPT}
            onChange={onPick}
            style={{ display: "none" }}
          />

          {intakeNotice && (
            <div className="connect-info" style={{ marginTop: 12 }} role="status">{intakeNotice}</div>
          )}

          <div className="connect-warning">
            Files are hashed and summarised in your browser and registered as{" "}
            <strong>uploaded documents</strong>. Transmission to Rebel will be enabled when the
            evidence upload API is available; nothing here counts as verified.
          </div>
        </section>

        <section className="connect-card" aria-labelledby="decl-title">
          <h2 className="connect-section-title" id="decl-title">Declare manually</h2>
          <p className="connect-muted connect-small" style={{ marginTop: -6, lineHeight: 1.55 }}>
            No document handy? State what you know. Declarations are labelled as such in every report.
          </p>
          <form onSubmit={addDeclaration}>
            <label className="connect-label" htmlFor="decl-domain">Compliance area</label>
            <DomainSelect id="decl-domain" value={declDomain} onChange={setDeclDomain} />

            <label className="connect-label" htmlFor="decl-statement">Statement</label>
            <textarea
              id="decl-statement"
              className="connect-textarea"
              value={declStatement}
              onChange={(e) => setDeclStatement(e.target.value)}
              placeholder="e.g. All customer-facing APIs require OAuth 2.0 with mutual TLS."
              minLength={10}
              maxLength={1000}
              required
            />

            <label className="connect-label" htmlFor="decl-by">Declared by (optional)</label>
            <input
              id="decl-by"
              className="connect-input"
              value={declBy}
              onChange={(e) => setDeclBy(e.target.value)}
              placeholder="Name or role"
              maxLength={100}
            />

            <button className="connect-button" type="submit" disabled={declStatement.trim().length < 10}>
              Add declaration
            </button>
          </form>
        </section>
      </div>

      <section className="connect-card" style={{ marginTop: 16 }} aria-labelledby="register-title">
        <h2 className="connect-section-title" id="register-title">Evidence register</h2>

        <div className="connect-chips" role="group" aria-label="Filter by provenance">
          <button type="button" className="connect-chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            All ({stableItems.length})
          </button>
          {PROVENANCE_ORDER.map((p) => (
            <button
              type="button"
              key={p}
              className="connect-chip"
              aria-pressed={filter === p}
              onClick={() => setFilter(p)}
            >
              {PROVENANCE[p].label} ({totals[p]})
            </button>
          ))}
        </div>

        {visibleItems.length === 0 ? (
          <div className="connect-empty">
            {stableItems.length === 0
              ? "Nothing yet. Upload a file, add a declaration or run API discovery."
              : "No items match this filter."}
          </div>
        ) : (
          <div className="connect-table-wrap">
            <table className="connect-table">
              <thead>
                <tr>
                  <th>Provenance</th>
                  <th>Area</th>
                  <th>Item</th>
                  <th>Source</th>
                  <th>Recorded</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((i) => (
                  <tr key={i.id}>
                    <td><ProvBadge p={i.provenance} /></td>
                    <td>{domainLabel(i.domain)}</td>
                    <td style={{ maxWidth: 380 }}>
                      <strong>{i.title}</strong>
                      {i.detail && <div className="connect-muted connect-small" style={{ marginTop: 3, overflowWrap: "anywhere" }}>{i.detail}</div>}
                    </td>
                    <td className="connect-muted">{i.source}</td>
                    <td className="connect-muted">{formatDate(i.at)}</td>
                    <td>
                      {i.removable && (
                        <button type="button" className="connect-button link" onClick={() => removeLocal(i)}>
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );

  const renderReport = () => {
    const r = store.report;
    return (
      <>
        <section className="connect-card" aria-labelledby="report-title">
          <div className="connect-eyebrow">COMPLIANCE ASSESSMENT</div>
          <h2 className="connect-section-title" id="report-title" style={{ marginTop: 6 }}>
            Preliminary readiness report
          </h2>
          <p className="connect-muted" style={{ lineHeight: 1.6, marginTop: 0 }}>
            Built from everything on the Evidence tab. It does not require sandbox access or live
            API integration, and each finding shows how well it is substantiated.
          </p>

          <div className="connect-actions-row connect-no-print">
            <button
              type="button"
              className="connect-button"
              onClick={generateReport}
              disabled={stableItems.length === 0}
            >
              {r ? "Regenerate report" : "Generate preliminary report"}
            </button>
            {r && (
              <>
                <button type="button" className="connect-button secondary" onClick={exportMarkdown}>
                  Download Markdown
                </button>
                <button type="button" className="connect-button secondary" onClick={exportJson}>
                  Download JSON
                </button>
                <button type="button" className="connect-button secondary" onClick={() => window.print()}>
                  Print
                </button>
              </>
            )}
          </div>

          {stableItems.length === 0 && (
            <div className="connect-warning">
              Add at least one document, declaration or discovery result to enable generation.
            </div>
          )}
          {reportStale && (
            <div className="connect-warning" role="status">
              Evidence has changed since this report was generated. Regenerate to include the latest items.
            </div>
          )}
        </section>

        {r && workspace && (
          <section className="connect-card" aria-label="Report preview">
            <div className="connect-hero">
              <div
                className="connect-ring"
                style={{ ["--p" as string]: r.overall } as CSSProperties}
                role="img"
                aria-label={`Evidence readiness ${r.overall} percent`}
              >
                <div className="connect-ring-inner">
                  <div>
                    <div className="connect-ring-value">{r.overall}%</div>
                    <div className="connect-ring-label">readiness</div>
                  </div>
                </div>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>{workspace.institution.name}</h3>
                <div className="connect-muted connect-small" style={{ marginTop: 4 }}>
                  Generated {formatDate(r.generatedAt)} · {workspace.institution.jurisdiction}
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {PROVENANCE_ORDER.map((p) => (
                    <span key={p} className={`connect-prov ${p}`}>
                      {PROVENANCE[p].short}: {r.totals[p]}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: 15, marginTop: 26 }}>Coverage by area</h3>
            {r.domains.map((d) => (
              <div className="connect-domain-row" key={d.id}>
                <div className="connect-domain-head">
                  <strong style={{ fontSize: 14 }}>{d.label}</strong>
                  <span className={`connect-level ${d.level}`}>
                    {LEVEL_LABEL[d.level]} · {Math.round(d.score * 100)}%
                  </span>
                </div>
                <ProvenanceStack counts={d.counts} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {PROVENANCE_ORDER.filter((p) => d.counts[p] > 0).map((p) => (
                    <span key={p} className={`connect-prov ${p}`}>{PROVENANCE[p].short} ×{d.counts[p]}</span>
                  ))}
                </div>
                {d.gaps.map((g) => (
                  <div key={g} className="connect-muted connect-small" style={{ marginTop: 6 }}>• {g}</div>
                ))}
              </div>
            ))}

            <h3 style={{ fontSize: 15, marginTop: 26 }}>Limitations</h3>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 13 }}>
              {r.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  };

  const renderAgents = () => {
    if (!workspace) return null;
    return (
      <>
        <section className="connect-grid-3">
          <div className="connect-card">
            <div className="connect-card-label">Registered agents</div>
            <div className="connect-metric">{workspace.metrics.agents_total}</div>
          </div>
          <div className="connect-card">
            <div className="connect-card-label">Active agents</div>
            <div className="connect-metric">{workspace.metrics.agents_active}</div>
          </div>
          <div className="connect-card">
            <div className="connect-card-label">Evidence submissions</div>
            <div className="connect-metric">{workspace.metrics.evidence_total}</div>
          </div>
        </section>

        <section className="connect-card">
          <h2 className="connect-section-title">Connected agents</h2>

          {workspace.agents.length === 0 ? (
            <div className="connect-muted">No agents have been provisioned for this institution yet.</div>
          ) : (
            <div className="connect-table-wrap">
              <table className="connect-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Last heartbeat</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.agents.map((agent) => (
                    <tr key={agent.agent_id}>
                      <td>
                        <strong>{agent.name}</strong>
                        <div className="connect-muted" style={{ fontSize: 10 }}>{agent.agent_id}</div>
                      </td>
                      <td>
                        <span className={`connect-status ${agent.status === "active" ? "active" : ""}`}>
                          {agent.status}
                        </span>
                      </td>
                      <td>{agent.created_at ? new Date(agent.created_at).toLocaleString() : "—"}</td>
                      <td>{agent.last_seen_at ? new Date(agent.last_seen_at).toLocaleString() : "Never"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="connect-card">
          <h2 className="connect-section-title">Recent evidence <ProvBadge p="verified" /></h2>

          {workspace.recent_evidence.length === 0 ? (
            <div className="connect-muted">
              No evidence has been received. Once an institution agent submits evidence, its
              source, type, timestamp and integrity hash will appear here.
            </div>
          ) : (
            <div className="connect-table-wrap">
              <table className="connect-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Evidence type</th>
                    <th>Received</th>
                    <th>Integrity hash</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.recent_evidence.map((item) => (
                    <tr key={item.submission_id}>
                      <td>{item.source_system}</td>
                      <td>{item.evidence_type}</td>
                      <td>{new Date(item.received_at).toLocaleString()}</td>
                      <td className="connect-hash">{item.payload_sha256}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="connect-card">
          <h2 className="connect-section-title">Sandbox & automated collection</h2>
          <div className="connect-planned">
            <span className="connect-status optional">Planned</span>
            <p style={{ lineHeight: 1.6, margin: "10px 0 0", fontSize: 13 }}>
              When Vestro sandbox credentials are available, approved read-only endpoints from
              discovery become scheduled collectors. Their submissions arrive as{" "}
              <ProvBadge p="verified" /> evidence and the preliminary report refreshes
              automatically as new data lands. Nothing on this page needs to change to adopt it:
              existing declarations and documents stay in place and are progressively
              superseded by verified data.
            </p>
          </div>
        </section>

        <div className="connect-info" style={{ marginTop: 16 }}>
          <strong>Integration workflow:</strong> Discover the institution's existing APIs,
          approve the required read-only resources, configure authentication and then provision
          an institution-specific data collector.
        </div>

        <button
          className="connect-button"
          style={{ marginTop: 18 }}
          onClick={() => void loadWorkspace()}
        >
          Refresh workspace
        </button>
      </>
    );
  };

  /* ---------------- page ---------------- */

  return (
    <>
      <style>{styles}</style>

      <main className="connect-page">
        <div className="connect-wrap">
          <div className="connect-eyebrow">REBEL // INSTITUTIONAL CONNECT</div>

          <h1 className="connect-title">Institution Connect</h1>

          <p className="connect-subtitle">
            Connect your institution's existing systems to Rebel. Start with whatever you have:
            an API URL, a spec, a PDF, a spreadsheet or a simple statement. Build toward verified
            evidence and compliance assessments at your own pace.
          </p>

          {error && (
            <div className="connect-error" role="alert">{error}</div>
          )}

          {loading ? (
            <div className="connect-card" style={{ marginTop: 25 }}>
              Loading institution workspace…
            </div>
          ) : workspace ? (
            <>
              <div className="connect-tabs" role="tablist" aria-label="Workspace sections">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={tab === t.id}
                    aria-controls={`panel-${t.id}`}
                    className="connect-tab"
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                    {typeof t.count === "number" && t.count > 0 && (
                      <span className="connect-tab-count">{t.count}</span>
                    )}
                  </button>
                ))}
              </div>

              <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                {tab === "overview" && renderOverview()}
                {tab === "discover" && renderDiscover()}
                {tab === "evidence" && renderEvidence()}
                {tab === "report" && renderReport()}
                {tab === "agents" && renderAgents()}
              </div>
            </>
          ) : (
            <section
              className="connect-card"
              style={{ maxWidth: 650, marginTop: 25 }}
            >
              <div className="connect-eyebrow">INITIALIZE WORKSPACE</div>

              <h2 style={{ fontSize: 23, margin: "10px 0" }}>
                Register your institution
              </h2>

              <p
                className="connect-muted"
                style={{ lineHeight: 1.6, marginBottom: 18 }}
              >
                Two fields to begin. Create the institution workspace that will own your
                connected systems, agents and evidence. Your account will become its initial
                institution owner. Everything else can be added later.
              </p>

              <form onSubmit={createWorkspace}>
                <label className="connect-label" htmlFor="institution-name">
                  Legal or operating institution name
                </label>

                <input
                  id="institution-name"
                  className="connect-input"
                  value={institutionName}
                  onChange={(event) => setInstitutionName(event.target.value)}
                  placeholder="e.g. Vestro Bank"
                  minLength={2}
                  maxLength={200}
                  required
                />

                <label className="connect-label" htmlFor="institution-jurisdiction">
                  Primary jurisdiction
                </label>

                <input
                  id="institution-jurisdiction"
                  className="connect-input"
                  value={jurisdiction}
                  onChange={(event) => setJurisdiction(event.target.value)}
                  placeholder="e.g. Zimbabwe"
                  minLength={2}
                  maxLength={100}
                  required
                />

                <button className="connect-button" disabled={creating} type="submit">
                  {creating ? "Creating workspace…" : "Create institution workspace"}
                </button>
              </form>

              <p className="connect-muted" style={{ fontSize: 12, marginTop: 18 }}>
                Joining an existing institution by invitation will be added as the next
                membership workflow.
              </p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}