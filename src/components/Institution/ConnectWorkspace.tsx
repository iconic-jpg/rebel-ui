import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, DragEvent, FormEvent } from "react";
import "./ConnectWorkspace.css";

const API_BASE = "https://r3bel-5464.onrender.com";

/* ------------------------------------------------------------------ */
/* Server contracts                                                    */
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
    apis_pending?: number;
    apis_approved?: number;
    apis_rejected?: number;
  };
  agents: Agent[];
  recent_evidence: Evidence[];
}

type ApprovalStatus = "pending" | "approved" | "rejected";

interface DiscoveredEndpoint {
  endpoint_id: string;
  path: string;
  method: string;
  description?: string;
  category?: string;
  read_only: boolean;
  read_only_declared?: boolean;
  classification_source?: string;
  operation_class?: string;
  side_effects?: string[];
  approval_status: ApprovalStatus;
  approvable: boolean;
  approval_blocker?: string | null;
  decided_at?: string | null;
  decision_note?: string | null;
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
  discovery_id: string;
  created_at?: string;
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
type TabId =
  | "overview"
  | "connect"
  | "discover"
  | "evidence"
  | "report"
  | "agents";
type FileKind = "spec" | "document" | "import";

type ConnectorType =
  | "direct_api"
  | "open_banking"
  | "sftp"
  | "private_network";

interface SavedConnector {
  connector_type: ConnectorType;
  status: string;
  note?: string | null;
  created_at: string;
}

interface ConnectorOption {
  id: ConnectorType;
  title: string;
  receives: string;
  use: string;
  next: string;
  available: boolean;
}

const CONNECTORS: ConnectorOption[] = [
  {
    id: "direct_api",
    title: "Direct API",
    receives: "Access to approved API endpoints",
    use: "Account, transaction and control data",
    next: "Rebel reads the bank's published OpenAPI documentation. You approve which read-only endpoints Rebel may use.",
    available: true,
  },
  {
    id: "open_banking",
    title: "Open Banking / OAuth",
    receives: "Institution-approved, scoped access",
    use: "Consent-based financial data sharing",
    next: "The institution grants scoped OAuth access to specific data.",
    available: false,
  },
  {
    id: "sftp",
    title: "Secure file exchange (SFTP)",
    receives: "Scheduled CSV, XML or other data files",
    use: "Statements, transaction exports and audit records",
    next: "The institution delivers files on a schedule to a Rebel-controlled drop.",
    available: false,
  },
  {
    id: "private_network",
    title: "Private enterprise connection",
    receives: "Access through VPN or private network",
    use: "Large-bank and enterprise integrations",
    next: "A private network link is arranged with Rebel onboarding.",
    available: false,
  },
];

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
    help: "Discovered or inferred automatically and not yet confirmed by the institution.",
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
  files: FileRecord[];
  declarations: Declaration[];
  report: StoredReport | null;
}

const EMPTY_STORE: LocalStore = {
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

  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
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

function countApis(d: DiscoveryResult | null) {
  const counts = { pending: 0, approved: 0, rejected: 0, total: 0 };

  if (!d) return counts;

  for (const endpoint of d.endpoints) {
    counts.total += 1;

    if (endpoint.approval_status === "approved") counts.approved += 1;
    else if (endpoint.approval_status === "rejected") counts.rejected += 1;
    else counts.pending += 1;
  }

  return counts;
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

const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
];

const READ_METHODS = ["get", "head", "options"];

interface SpecSummary {
  endpoints: number;
  readOnly: number;
  auth: string[];
  version?: string;
}

function analyzeOpenApiObject(
  doc: Record<string, unknown>
): SpecSummary {
  const paths = (doc.paths ?? {}) as Record<
    string,
    Record<string, unknown>
  >;

  let endpoints = 0;
  let readOnly = 0;

  for (const methods of Object.values(paths)) {
    if (!methods || typeof methods !== "object") continue;

    for (const method of Object.keys(methods)) {
      const normalized = method.toLowerCase();

      if (HTTP_METHODS.includes(normalized)) {
        endpoints += 1;
        if (READ_METHODS.includes(normalized)) readOnly += 1;
      }
    }
  }

  const comps = (doc.components ?? {}) as Record<string, unknown>;
  const schemes = (comps.securitySchemes ??
    doc.securityDefinitions ??
    {}) as Record<string, { type?: string; scheme?: string }>;

  const auth = Object.values(schemes)
    .map((s) => (s?.scheme ? `${s.type}:${s.scheme}` : s?.type))
    .filter((s): s is string => Boolean(s));

  const version = String(doc.openapi ?? doc.swagger ?? "") || undefined;

  return {
    endpoints,
    readOnly,
    auth: Array.from(new Set(auth)),
    version,
  };
}

function analyzeOpenApiYaml(text: string): SpecSummary | null {
  const version = /^(?:openapi|swagger):\s*['"]?([\d.]+)/m.exec(text)?.[1];

  if (!version) return null;

  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => /^paths:\s*$/.test(line));

  let endpoints = 0;
  let readOnly = 0;

  if (start >= 0) {
    for (let i = start + 1; i < lines.length; i += 1) {
      const line = lines[i];

      if (line.trim() && !/^\s/.test(line)) break;

      const match =
        /^\s{4}(get|post|put|patch|delete|head|options):/i.exec(line);

      if (match) {
        endpoints += 1;
        if (READ_METHODS.includes(match[1].toLowerCase())) {
          readOnly += 1;
        }
      }
    }
  }

  const auth = Array.from(
    new Set(
      Array.from(
        text.matchAll(
          /^\s+type:\s*(http|apiKey|oauth2|openIdConnect|basic)\s*$/gm
        )
      ).map((m) => m[1])
    )
  );

  return { endpoints, readOnly, auth, version };
}

async function ingestFile(
  file: File,
  domain: string
): Promise<FileRecord> {
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
        const summary = analyzeOpenApiObject(
          parsed as Record<string, unknown>
        );

        return {
          ...base,
          kind: "spec",
          domain: "api_inventory",
          summary: `OpenAPI ${summary.version ?? ""} · ${
            summary.endpoints
          } operations (${summary.readOnly} read-only) · ${
            summary.auth.length
              ? summary.auth.join(", ")
              : "no security schemes declared"
          }`,
          endpoints: summary.endpoints,
          readOnlyEndpoints: summary.readOnly,
          auth: summary.auth,
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
      const summary = analyzeOpenApiYaml(text);

      if (summary) {
        return {
          ...base,
          kind: "spec",
          domain: "api_inventory",
          summary: `OpenAPI ${summary.version ?? ""} (YAML, heuristic read) · ${
            summary.endpoints
          } operations · ${
            summary.auth.length
              ? summary.auth.join(", ")
              : "no security schemes found"
          }`,
          endpoints: summary.endpoints,
          readOnlyEndpoints: summary.readOnly,
          auth: summary.auth,
          warnings: [
            "YAML was read heuristically in the browser. Counts may be incomplete.",
          ],
        };
      }

      return {
        ...base,
        summary: "YAML file registered (not an OpenAPI document).",
      };
    }

    if (ext === "csv" && parsable) {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim());

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
        summary:
          "Excel workbook registered. Sheet contents are not parsed in the browser.",
        warnings: [
          "Export to CSV or JSON to enable column and row summaries.",
        ],
      };
    }

    if (ext === "pdf") {
      return {
        ...base,
        summary:
          "PDF documentation registered. Text is not extracted in the browser.",
      };
    }
  } catch {
    return {
      ...base,
      summary: "File registered, but its contents could not be parsed.",
      warnings: [
        "The file could not be parsed. It is recorded as an unparsed document.",
      ],
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
  return {
    verified: 0,
    document: 0,
    declared: 0,
    unverified: 0,
  };
}

function fingerprintOf(items: EvidenceItem[]): string {
  return djb2(
    items
      .map((item) => `${item.provenance}:${item.domain}:${item.id}`)
      .sort()
      .join("|")
  );
}

function buildReport(items: EvidenceItem[]): StoredReport {
  const totals = emptyCounts();

  items.forEach((item) => {
    totals[item.provenance] += 1;
  });

  const domains: ReportDomain[] = DOMAINS.map((domain) => {
    const mine = items.filter((item) => item.domain === domain.id);
    const counts = emptyCounts();

    mine.forEach((item) => {
      counts[item.provenance] += 1;
    });

    let score = 0;

    for (const provenance of PROVENANCE_ORDER) {
      if (counts[provenance] > 0) {
        score = PROVENANCE[provenance].weight;
        break;
      }
    }

    if (mine.length >= 2) score = Math.min(1, score + 0.1);

    const gaps: string[] = [];

    if (mine.length === 0) {
      gaps.push("No information provided for this area.");
    }

    if (mine.length > 0 && counts.verified === 0) {
      gaps.push(
        "Nothing here has been verified by an institution agent yet."
      );
    }

    if (
      mine.length > 0 &&
      counts.document === 0 &&
      counts.verified === 0
    ) {
      gaps.push(
        "Add a supporting document to back up declarations or discoveries."
      );
    }

    return {
      id: domain.id,
      label: domain.label,
      score,
      level: levelFor(score),
      counts,
      gaps,
    };
  });

  const overall = Math.round(
    (domains.reduce((sum, domain) => sum + domain.score, 0) /
      domains.length) *
      100
  );

  const limitations = [
    "This is a preliminary, self-reported assessment. It is not an attestation, audit opinion or regulatory submission.",
    "Scores reflect how much information exists and how well it is substantiated, not whether controls are effective.",
  ];

  if (totals.verified === 0) {
    limitations.push(
      "No verified evidence has been submitted. Every finding rests on documents, declarations or unverified discovery."
    );
  }

  if (totals.declared > 0) {
    limitations.push(
      `${totals.declared} manual declaration${
        totals.declared === 1 ? "" : "s"
      } included without supporting artifacts.`
    );
  }

  if (totals.unverified > 0) {
    limitations.push(
      `${totals.unverified} item${
        totals.unverified === 1 ? "" : "s"
      } came from automated discovery and have not been confirmed by the institution.`
    );
  }

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

  lines.push("# Preliminary compliance readiness report");
  lines.push("");
  lines.push(
    `**Institution:** ${institution.name} (${institution.jurisdiction})`
  );
  lines.push(`**Institution ID:** ${institution.institution_id}`);
  lines.push(
    `**Generated:** ${new Date(report.generatedAt).toLocaleString()}`
  );
  lines.push(`**Overall evidence readiness:** ${report.overall}%`);
  lines.push("");
  lines.push(
    "> Preliminary and self-reported. Not an attestation or audit opinion."
  );
  lines.push("");
  lines.push("## Evidence by provenance");

  PROVENANCE_ORDER.forEach((p) => {
    lines.push(`- ${PROVENANCE[p].label}: ${report.totals[p]}`);
  });

  lines.push("");
  lines.push("## Coverage by area");

  report.domains.forEach((domain) => {
    lines.push(
      `### ${domain.label} — ${LEVEL_LABEL[domain.level]} (${Math.round(
        domain.score * 100
      )}%)`
    );

    PROVENANCE_ORDER.forEach((p) => {
      if (domain.counts[p] > 0) {
        lines.push(`- ${PROVENANCE[p].label}: ${domain.counts[p]}`);
      }
    });

    domain.gaps.forEach((gap) => lines.push(`- Gap: ${gap}`));
    lines.push("");
  });

  lines.push("## Evidence register");

  items.forEach((item) => {
    lines.push(
      `- [${PROVENANCE[item.provenance].short}] ${item.title} — ${
        item.source
      } (${formatDate(item.at)})`
    );
  });

  lines.push("");
  lines.push("## Limitations");

  report.limitations.forEach((limitation) => {
    lines.push(`- ${limitation}`);
  });

  return lines.join("\n");
}

function downloadBlob(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Onboarding stages                                                   */
/* ------------------------------------------------------------------ */

type StageStatus =
  | "complete"
  | "in_progress"
  | "not_started"
  | "optional";

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

function statusOf(progress: number): StageStatus {
  if (progress >= 100) return "complete";
  if (progress > 0) return "in_progress";
  return "not_started";
}

const STATUS_LABEL: Record<StageStatus, string> = {
  complete: "Complete",
  in_progress: "In progress",
  not_started: "Not started",
  optional: "Optional · later",
};

const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

// Reuses the existing connect-status colour variants.
const APPROVAL_CLASS: Record<ApprovalStatus, string> = {
  pending: "in_progress",
  approved: "complete",
  rejected: "not_started",
};

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
      <span
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
        }}
      />
    </div>
  );
}

function ProvenanceStack({
  counts,
}: {
  counts: Record<Provenance, number>;
}) {
  const total = PROVENANCE_ORDER.reduce(
    (sum, provenance) => sum + counts[provenance],
    0
  );

  if (total === 0) {
    return <div className="connect-bar" />;
  }

  return (
    <div
      className="connect-bar stack"
      aria-label="Evidence provenance breakdown"
    >
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
  onChange: (value: string) => void;
}) {
  return (
    <select
      id={id}
      className="connect-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {DOMAINS.map((domain) => (
        <option key={domain.id} value={domain.id}>
          {domain.label}
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

  // Documents and declarations remain browser-local. API discovery and
  // endpoint approvals are persisted by the server.
  const [store, setStore] = useState<LocalStore>(EMPTY_STORE);
  const [hydratedInstitutionId, setHydratedInstitutionId] = useState<
    string | null
  >(null);

  const institutionId =
    workspace?.institution.institution_id ?? null;

  // Evidence intake state
  const [intakeDomain, setIntakeDomain] = useState("governance");
  const [dragOver, setDragOver] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [intakeNotice, setIntakeNotice] = useState("");

  const [declDomain, setDeclDomain] = useState("governance");
  const [declStatement, setDeclStatement] = useState("");
  const [declBy, setDeclBy] = useState("");

  const [filter, setFilter] = useState<Provenance | "all">("all");
  const fileInput = useRef<HTMLInputElement>(null);

  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(
    null
  );
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState("");
  const [scanNote, setScanNote] = useState("");
  const [endpointFilter, setEndpointFilter] = useState<
    ApprovalStatus | "all"
  >("all");
  const [connectors, setConnectors] = useState<SavedConnector[]>([]);
  const [connectorBusy, setConnectorBusy] = useState<string | null>(null);
  const [connectorError, setConnectorError] = useState("");

  /* ---------------- persistence ---------------- */

  useEffect(() => {
    if (!institutionId) {
      setStore(EMPTY_STORE);
      setHydratedInstitutionId(null);
      return;
    }

    setHydratedInstitutionId(null);

    try {
      const raw = localStorage.getItem(storeKey(institutionId));

      const saved = raw
        ? (JSON.parse(raw) as Partial<LocalStore>)
        : {};

      // Discovery results and selections from earlier versions were kept
      // in this browser. They are intentionally not carried over: the
      // server is now the only source of truth for the API inventory.
      setStore({
        files: Array.isArray(saved.files) ? saved.files : [],
        declarations: Array.isArray(saved.declarations)
          ? saved.declarations
          : [],
        report: saved.report ?? null,
      });
    } catch {
      setStore(EMPTY_STORE);
    }

    setHydratedInstitutionId(institutionId);
  }, [institutionId]);

  useEffect(() => {
    if (
      !institutionId ||
      hydratedInstitutionId !== institutionId
    ) {
      return;
    }

    try {
      localStorage.setItem(
        storeKey(institutionId),
        JSON.stringify(store)
      );
    } catch {
      // Storage may be unavailable or full; current in-memory work remains.
    }
  }, [store, institutionId, hydratedInstitutionId]);

  const patchStore = useCallback((patch: Partial<LocalStore>) => {
    setStore((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  /* ---------------- server calls ---------------- */

  const loadWorkspace = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
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
        err instanceof Error
          ? err.message
          : "Connect service unavailable."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const loadInventory = useCallback(async () => {
    try {
      const response = await connectRequest("/connect/discovery/latest");
      const data = await readResponse<{
        discovery: DiscoveryResult | null;
      }>(response);

      setDiscovery(data.discovery);
    } catch (err) {
      setDiscoveryError(
        err instanceof Error
          ? err.message
          : "Could not load the saved API inventory."
      );
    }
  }, []);

  useEffect(() => {
    if (!institutionId) {
      setDiscovery(null);
      return;
    }

    void loadInventory();
  }, [institutionId, loadInventory]);

  const loadConnectors = useCallback(async () => {
    try {
      const response = await connectRequest("/connect/connectors");
      const data = await readResponse<{ connectors: SavedConnector[] }>(
        response
      );

      setConnectors(data.connectors);
    } catch (err) {
      setConnectorError(
        err instanceof Error
          ? err.message
          : "Could not load connection methods."
      );
    }
  }, []);

  useEffect(() => {
    if (!institutionId) {
      setConnectors([]);
      return;
    }

    void loadConnectors();
  }, [institutionId, loadConnectors]);

  const createWorkspace = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setCreating(true);
    setError("");

    try {
      const response = await connectRequest(
        "/connect/institutions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: institutionName.trim(),
            jurisdiction: jurisdiction.trim(),
          }),
        }
      );

      await readResponse<unknown>(response);
      await loadWorkspace();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Workspace creation failed."
      );
    } finally {
      setCreating(false);
    }
  };

  const discoverAPIs = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setDiscovering(true);
    setDiscoveryError("");
    setDecisionError("");
    setScanNote("");

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

      const approvedBefore = countApis(discovery).approved;

      if (
        approvedBefore > 0 &&
        !window.confirm(
          `A new scan replaces the current inventory. Your ${approvedBefore} approved API${
            approvedBefore === 1 ? "" : "s"
          } will not carry over and every newly discovered endpoint starts as pending. Continue?`
        )
      ) {
        return;
      }

      const response = await connectRequest(
        "/connect/discovery/scan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            institution_id: institutionId,
            // Preserve the complete URL path.
            target_url: parsed.href,
          }),
        }
      );

      const result = await readResponse<DiscoveryResult>(response);

      if (result.endpoints.length > 0 || !discovery) {
        setDiscovery(result);
        setEndpointFilter("all");
      } else {
        // An empty scan must not hide an inventory already under review.
        setScanNote(
          `The latest scan found no endpoints, so your existing inventory was kept. ${
            result.warnings[0] ?? ""
          }`.trim()
        );
      }

      void loadWorkspace(true);
    } catch (err) {
      setDiscoveryError(
        err instanceof Error
          ? err.message
          : "API discovery failed."
      );
    } finally {
      setDiscovering(false);
    }
  };

  const setConnector = async (
    type: ConnectorType,
    select: boolean
  ): Promise<boolean> => {
    setConnectorBusy(type);
    setConnectorError("");

    try {
      const response = await connectRequest(
        `/connect/connectors/${type}`,
        select
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            }
          : { method: "DELETE" }
      );

      await readResponse<unknown>(response);
      await loadConnectors();
      return true;
    } catch (err) {
      setConnectorError(
        err instanceof Error
          ? err.message
          : "Could not save the connection method."
      );
      return false;
    } finally {
      setConnectorBusy(null);
    }
  };

  const decideEndpoint = async (
    endpoint: DiscoveredEndpoint,
    decision: "approved" | "rejected"
  ) => {
    setDecidingId(endpoint.endpoint_id);
    setDecisionError("");

    try {
      const response = await connectRequest(
        `/connect/discovery/endpoints/${encodeURIComponent(
          endpoint.endpoint_id
        )}/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        }
      );

      // The server's record replaces the local one.
      const updated = await readResponse<DiscoveredEndpoint>(response);

      setDiscovery((current) =>
        current
          ? {
              ...current,
              endpoints: current.endpoints.map((item) =>
                item.endpoint_id === updated.endpoint_id
                  ? updated
                  : item
              ),
            }
          : current
      );

      void loadWorkspace(true);
    } catch (err) {
      setDecisionError(
        err instanceof Error
          ? err.message
          : "Could not record the decision."
      );
    } finally {
      setDecidingId(null);
    }
  };

  /* ---------------- evidence intake ---------------- */

  const handleFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);

    if (!files.length) return;

    setIngesting(true);
    setIntakeNotice("");

    const added: FileRecord[] = [];
    const rejected: string[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(
          `${file.name} exceeds ${formatBytes(MAX_FILE_BYTES)}`
        );
        continue;
      }

      added.push(await ingestFile(file, intakeDomain));
    }

    if (added.length) {
      setStore((current) => ({
        ...current,
        files: [...added, ...current.files],
      }));
    }

    const messages: string[] = [];

    if (added.length) {
      messages.push(
        `${added.length} file${added.length === 1 ? "" : "s"} registered.`
      );
    }

    if (rejected.length) {
      messages.push(`Skipped: ${rejected.join("; ")}.`);
    }

    setIntakeNotice(messages.join(" "));
    setIngesting(false);

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    void handleFiles(event.dataTransfer.files);
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      void handleFiles(event.target.files);
    }
  };

  const addDeclaration = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const statement = declStatement.trim();

    if (statement.length < 10) return;

    const declaration: Declaration = {
      id: uid(),
      domain: declDomain,
      statement,
      declaredBy: declBy.trim(),
      addedAt: new Date().toISOString(),
    };

    setStore((current) => ({
      ...current,
      declarations: [
        declaration,
        ...current.declarations,
      ],
    }));

    setDeclStatement("");
  };

  const removeLocal = (item: EvidenceItem) => {
    if (!item.removeId) return;

    setStore((current) =>
      item.removeKind === "file"
        ? {
            ...current,
            files: current.files.filter(
              (file) => file.id !== item.removeId
            ),
          }
        : {
            ...current,
            declarations: current.declarations.filter(
              (declaration) =>
                declaration.id !== item.removeId
            ),
          }
    );
  };

  /* ---------------- derived evidence register ---------------- */

  const items = useMemo<EvidenceItem[]>(() => {
    if (!workspace) return [];

    const output: EvidenceItem[] = [];

    workspace.recent_evidence.forEach((evidence) => {
      output.push({
        id: `v-${evidence.submission_id}`,
        domain: classifyVerified(evidence),
        provenance: "verified",
        title: evidence.evidence_type,
        source: evidence.source_system,
        at: evidence.received_at,
        detail: `SHA-256 ${shortHash(evidence.payload_sha256)}`,
      });
    });

    store.files.forEach((file) => {
      const common = {
        provenance: "document" as const,
        source: `${file.name} · ${formatBytes(file.size)}`,
        at: file.addedAt,
        removable: true,
        removeKind: "file" as const,
        removeId: file.id,
      };

      output.push({
        ...common,
        id: `f-${file.id}`,
        domain: file.domain,
        title:
          file.kind === "spec"
            ? "OpenAPI specification"
            : file.kind === "import"
              ? "Data import"
              : "Supporting document",
        detail: `${file.summary} · SHA-256 ${shortHash(file.sha256)}`,
      });

      if (file.kind === "spec" && file.auth?.length) {
        output.push({
          ...common,
          id: `f-${file.id}-auth`,
          domain: "authentication",
          title: "Authentication schemes (from specification)",
          detail: file.auth.join(", "),
          removable: false,
        });
      }
    });

    store.declarations.forEach((declaration) => {
      output.push({
        id: `d-${declaration.id}`,
        domain: declaration.domain,
        provenance: "declared",
        title: declaration.statement,
        source: declaration.declaredBy || "Unattributed",
        at: declaration.addedAt,
        removable: true,
        removeKind: "declaration",
        removeId: declaration.id,
      });
    });

    if (discovery) {
      const host = (() => {
        try {
          return new URL(discovery.target_url).host;
        } catch {
          return discovery.target_url;
        }
      })();

      const counts = countApis(discovery);

      if (counts.total > 0) {
        output.push({
          id: `u-discovery-inventory-${discovery.discovery_id}-${counts.approved}-${counts.pending}-${counts.rejected}`,
          domain: "api_inventory",
          provenance: "unverified",
          title: `${counts.total} endpoints discovered`,
          source: host,
          at: discovery.created_at ?? "",
          detail: `${counts.approved} approved · ${counts.pending} pending · ${counts.rejected} rejected. From API discovery; not yet confirmed by the institution.`,
        });
      }

      if (counts.approved > 0) {
        output.push({
          id: `u-discovery-approved-${discovery.discovery_id}-${counts.approved}`,
          domain: "api_inventory",
          provenance: "unverified",
          title: `${counts.approved} read-only API${
            counts.approved === 1 ? "" : "s"
          } approved, awaiting collection`,
          source: host,
          at: discovery.created_at ?? "",
          detail:
            "Approved by the institution owner. No data has been collected, so nothing here is verified.",
        });
      }

      if (discovery.authentication_methods.length > 0) {
        output.push({
          id: "u-discovery-auth",
          domain: "authentication",
          provenance: "unverified",
          title: "Authentication methods discovered",
          source: host,
          at: discovery.created_at ?? "",
          detail: discovery.authentication_methods.join(", "),
        });
      }
    }

    return output;
  }, [workspace, store, discovery]);

  const stableItems = useMemo(() => items, [items]);

  const domainStats = useMemo(() => {
    return DOMAINS.map((domain) => {
      const mine = stableItems.filter(
        (item) => item.domain === domain.id
      );

      const counts = emptyCounts();

      mine.forEach((item) => {
        counts[item.provenance] += 1;
      });

      return {
        domain,
        counts,
        total: mine.length,
      };
    });
  }, [stableItems]);

  const domainsCovered = domainStats.filter(
    (domain) => domain.total > 0
  ).length;

  const totals = useMemo(() => {
    const result = emptyCounts();

    stableItems.forEach((item) => {
      result[item.provenance] += 1;
    });

    return result;
  }, [stableItems]);

  /* ---------------- stages, issues and actions ---------------- */

  const hasSystems =
    Boolean(discovery && discovery.endpoints.length > 0) ||
    store.files.some((file) => file.kind === "spec");

  const apiCounts = useMemo(() => countApis(discovery), [discovery]);

  const stages = useMemo<Stage[]>(() => {
    if (!workspace) return [];

    const metrics = workspace.metrics;

    const systemsProgress = hasSystems
      ? 100
      : discovery
        ? 40
        : 0;

    const evidenceProgress = Math.round(
      (domainsCovered / DOMAINS.length) * 100
    );

    let verifyProgress = 0;

    if (metrics.agents_total > 0) verifyProgress += 40;
    if (metrics.agents_active > 0) verifyProgress += 30;
    if (metrics.evidence_total > 0) verifyProgress += 30;

    const reportProgress = store.report
      ? 100
      : stableItems.length > 0
        ? 50
        : 0;

    const makeStage = (
      id: string,
      title: string,
      description: string,
      weight: number,
      progress: number,
      detail: string,
      stageTab: TabId
    ): Stage => ({
      id,
      title,
      description,
      weight,
      progress,
      status: statusOf(progress),
      detail,
      tab: stageTab,
    });

    return [
      makeStage(
        "institution",
        "Institution profile",
        "Name and jurisdiction registered. Everything else can follow incrementally.",
        10,
        100,
        `${workspace.institution.name} · ${workspace.institution.jurisdiction}`,
        "overview"
      ),
      makeStage(
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
      makeStage(
        "evidence",
        "Provide evidence",
        "Upload documents and data, or declare facts manually. Cover each compliance area.",
        30,
        evidenceProgress,
        `${domainsCovered} of ${DOMAINS.length} compliance areas have at least one item.`,
        "evidence"
      ),
      makeStage(
        "verify",
        "Verify with agents",
        "Provision an institution agent so declarations can be backed by verified submissions.",
        20,
        verifyProgress,
        `${metrics.agents_total} agent${
          metrics.agents_total === 1 ? "" : "s"
        } · ${metrics.agents_active} active · ${
          metrics.evidence_total
        } verified submission${
          metrics.evidence_total === 1 ? "" : "s"
        }`,
        "agents"
      ),
      makeStage(
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
  }, [
    workspace,
    hasSystems,
    discovery,
    domainsCovered,
    store.report,
    stableItems.length,
  ]);

  const overall = useMemo(() => {
    const weighted = stages.filter((stage) => stage.weight > 0);
    const totalWeight =
      weighted.reduce((sum, stage) => sum + stage.weight, 0) || 1;

    return Math.round(
      weighted.reduce(
        (sum, stage) =>
          sum + stage.progress * stage.weight,
        0
      ) / totalWeight
    );
  }, [stages]);

  const reportStale = Boolean(
    store.report &&
      store.report.fingerprint !== fingerprintOf(stableItems)
  );

  const issues = useMemo<Issue[]>(() => {
    if (!workspace) return [];

    const list: Issue[] = [];
    const metrics = workspace.metrics;

    if (stableItems.length === 0) {
      list.push({
        id: "no-evidence",
        severity: "blocker",
        title: "No information to report on",
        detail:
          "Add one document, declaration or discovery result to generate a preliminary report.",
        tab: "evidence",
      });
    }

    if (discovery && !discovery.reachable) {
      list.push({
        id: "unreachable",
        severity: "blocker",
        title: "Discovery target is not reachable",
        detail:
          "Check the URL, or upload an OpenAPI file instead.",
        tab: "discover",
      });
    }

    if (discovery && discovery.warnings.length > 0) {
      list.push({
        id: "disc-warnings",
        severity: "warning",
        title: `${discovery.warnings.length} discovery warning${
          discovery.warnings.length === 1 ? "" : "s"
        }`,
        detail: discovery.warnings[0],
        tab: "discover",
      });
    }

    if (apiCounts.pending > 0) {
      list.push({
        id: "apis-pending",
        severity: "blocker",
        title: `${apiCounts.pending} discovered API${
          apiCounts.pending === 1 ? "" : "s"
        } awaiting approval`,
        detail:
          "Approve or reject each endpoint. Nothing is accessed or collected from a pending API.",
        tab: "discover",
      });
    }

    if (apiCounts.approved > 0) {
      list.push({
        id: "apis-approved-uncollected",
        severity: "warning",
        title: `${apiCounts.approved} approved API${
          apiCounts.approved === 1 ? "" : "s"
        } not yet collected`,
        detail:
          "Bank authentication and collection are not configured, so approved APIs remain unverified.",
        tab: "discover",
      });
    }

    if (metrics.agents_total === 0) {
      list.push({
        id: "no-agent",
        severity: "warning",
        title: "No agent provisioned",
        detail:
          "Without an agent, nothing can be verified. Reports will rest on documents and declarations.",
        tab: "agents",
      });
    } else if (metrics.agents_active === 0) {
      list.push({
        id: "agent-inactive",
        severity: "warning",
        title: "No active agent",
        detail:
          "Agents exist but none are active. Check the heartbeat on the Agents tab.",
        tab: "agents",
      });
    }

    if (reportStale) {
      list.push({
        id: "stale",
        severity: "warning",
        title: "Report is out of date",
        detail:
          "Evidence changed since the last report was generated.",
        tab: "report",
      });
    }

    return list;
  }, [
    workspace,
    stableItems.length,
    discovery,
    apiCounts,
    reportStale,
  ]);

  const missingDomains = domainStats
    .filter((domain) => domain.total === 0)
    .map((domain) => domain.domain);

  const unverifiedDomains = domainStats.filter(
    (domain) =>
      domain.total > 0 && domain.counts.verified === 0
  ).length;

  const actions = useMemo<Action[]>(() => {
    if (!workspace) return [];

    const metrics = workspace.metrics;
    const list: Action[] = [];

    if (connectors.length === 0) {
      list.push({
        id: "choose-connection",
        title: "Choose how your institution connects",
        detail:
          "Direct API, Open Banking / OAuth, secure file exchange (SFTP) or a private enterprise connection.",
        tab: "connect",
        cta: "Choose method",
      });
    }

    if (!hasSystems) {
      list.push({
        id: "systems",
        title: "Identify your systems",
        detail:
          "Run API discovery against a portal or spec URL, or upload an OpenAPI file.",
        tab: "discover",
        cta: "Discover APIs",
      });
    }

    if (missingDomains.length > 0) {
      list.push({
        id: "missing",
        title: `Add evidence for ${missingDomains
          .slice(0, 2)
          .map((domain) => domain.label)
          .join(" and ")}${
          missingDomains.length > 2
            ? ` (+${missingDomains.length - 2} more)`
            : ""
        }`,
        detail:
          "A short declaration is enough to start. Back it with a document later.",
        tab: "evidence",
        cta: "Add evidence",
      });
    }

    if (apiCounts.pending > 0) {
      list.push({
        id: "review-apis",
        title: `Review ${apiCounts.pending} discovered API${
          apiCounts.pending === 1 ? "" : "s"
        }`,
        detail:
          "Approve the read-only endpoints Rebel may use and reject the rest.",
        tab: "discover",
        cta: "Review APIs",
      });
    }

    if (
      stableItems.length > 0 &&
      (!store.report || reportStale)
    ) {
      list.push({
        id: "report",
        title: store.report
          ? "Refresh the preliminary report"
          : "Generate your first preliminary report",
        detail: "No sandbox or live API access needed.",
        tab: "report",
        cta: store.report ? "Regenerate" : "Generate report",
      });
    }

    if (metrics.agents_total === 0) {
      list.push({
        id: "agent",
        title: "Provision an institution agent",
        detail:
          "Agents submit evidence that Rebel can verify with integrity hashes.",
        tab: "agents",
        cta: "View agents",
      });
    } else if (metrics.evidence_total === 0) {
      list.push({
        id: "submit",
        title: "Submit evidence through an agent",
        detail:
          "Verified submissions raise confidence beyond declarations and documents.",
        tab: "agents",
        cta: "View agents",
      });
    }

    return list.slice(0, 4);
  }, [
    workspace,
    hasSystems,
    missingDomains,
    stableItems.length,
    apiCounts.pending,
    connectors.length,
    store.report,
    reportStale,
  ]);

  /* ---------------- report ---------------- */

  const generateReport = () => {
    patchStore({
      report: buildReport(stableItems),
    });
  };

  const exportMarkdown = () => {
    if (!store.report || !workspace) return;

    downloadBlob(
      `rebel-preliminary-report-${new Date(
        store.report.generatedAt
      )
        .toISOString()
        .slice(0, 10)}.md`,
      reportToMarkdown(
        store.report,
        workspace.institution,
        stableItems
      ),
      "text/markdown"
    );
  };

  const exportJson = () => {
    if (!store.report || !workspace) return;

    downloadBlob(
      `rebel-preliminary-report-${new Date(
        store.report.generatedAt
      )
        .toISOString()
        .slice(0, 10)}.json`,
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

  /* ---------------- render helpers ---------------- */

  const visibleItems =
    filter === "all"
      ? stableItems
      : stableItems.filter(
          (item) => item.provenance === filter
        );

  const domainLabel = (id: string | null) =>
    DOMAINS.find((domain) => domain.id === id)?.label ??
    "Unclassified";

  const tabs: {
    id: TabId;
    label: string;
    count?: number;
  }[] = [
    { id: "overview", label: "Overview" },
    {
      id: "connect",
      label: "Connect",
      count: connectors.length,
    },
    { id: "discover", label: "Discover APIs" },
    {
      id: "evidence",
      label: "Evidence",
      count: stableItems.length,
    },
    { id: "report", label: "Report" },
    { id: "agents", label: "Agents & verification" },
  ];

  const renderStages = () => (
    <section
      className="connect-card"
      aria-labelledby="stages-title"
    >
      <h2 className="connect-section-title" id="stages-title">
        Onboarding stages
      </h2>

      {stages.map((stage, index) => (
        <div className="connect-stage" key={stage.id}>
          <div
            className={`connect-stage-num ${stage.status}`}
            aria-hidden="true"
          >
            {stage.status === "complete" ? "✓" : index + 1}
          </div>

          <div className="connect-stage-body">
            <div className="connect-stage-title">
              {stage.title}
            </div>

            <div
              className="connect-muted connect-small"
              style={{ marginTop: 3, lineHeight: 1.5 }}
            >
              {stage.description}
            </div>

            <div
              className="connect-small"
              style={{ marginTop: 6 }}
            >
              {stage.detail}
            </div>

            {stage.status !== "optional" && (
              <ProgressBar value={stage.progress} />
            )}
          </div>

          <div className="connect-stage-side">
            {stage.status !== "optional" && (
              <span className="connect-pct">
                {stage.progress}%
              </span>
            )}

            <span
              className={`connect-status ${stage.status}`}
            >
              {STATUS_LABEL[stage.status]}
            </span>

            {stage.id !== "institution" && (
              <button
                type="button"
                className="connect-button secondary small"
                onClick={() => setTab(stage.tab)}
              >
                {stage.status === "optional"
                  ? "Learn more"
                  : "Open"}
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  );

  const renderOverview = () => (
    <>
      {connectors.length === 0 && (
        <section
          className="connect-card"
          style={{ marginBottom: 16 }}
          aria-labelledby="choose-title"
        >
          <div className="connect-eyebrow">START HERE</div>

          <h2
            className="connect-section-title"
            id="choose-title"
            style={{ marginTop: 6 }}
          >
            How will your institution connect to Rebel?
          </h2>

          <p
            className="connect-muted"
            style={{ lineHeight: 1.6, marginTop: 0 }}
          >
            Pick the connection method that fits your institution:
            a direct API, Open Banking / OAuth, secure file
            exchange (SFTP) or a private enterprise connection.
          </p>

          <button
            type="button"
            className="connect-button"
            onClick={() => setTab("connect")}
          >
            Choose a connection method
          </button>
        </section>
      )}

      <section className="connect-card connect-hero">
        <div
          className="connect-ring"
          style={
            { ["--p" as string]: overall } as CSSProperties
          }
          role="img"
          aria-label={`Overall onboarding ${overall} percent complete`}
        >
          <div className="connect-ring-inner">
            <div>
              <div className="connect-ring-value">
                {overall}%
              </div>
              <div className="connect-ring-label">
                onboarded
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="connect-eyebrow">
            ACTIVE INSTITUTION
          </div>

          <h2 style={{ fontSize: 23, margin: "9px 0" }}>
            {workspace?.institution.name}
          </h2>

          <div className="connect-muted">
            {workspace?.institution.jurisdiction}
            {" · "}
            {workspace?.institution.role}
          </div>

          <div
            className="connect-muted"
            style={{ fontSize: 11, marginTop: 8 }}
          >
            Institution ID:{" "}
            {workspace?.institution.institution_id}
          </div>

          <p
            className="connect-muted connect-small"
            style={{
              marginTop: 12,
              lineHeight: 1.55,
              maxWidth: 560,
            }}
          >
            You do not need live API access to begin. Provide
            what you have today and Rebel produces a
            preliminary report that improves as evidence is
            verified.
          </p>
        </div>
      </section>

      <div className="connect-grid-2">
        <section
          className="connect-card"
          aria-labelledby="next-title"
        >
          <h2 className="connect-section-title" id="next-title">
            Next steps
          </h2>

          {actions.length === 0 ? (
            <div className="connect-empty">
              All current steps are done. Keep the report fresh
              as evidence changes.
            </div>
          ) : (
            <ul className="connect-list">
              {actions.map((action) => (
                <li key={action.id}>
                  <div>
                    <div className="connect-list-title">
                      {action.title}
                    </div>
                    <div
                      className="connect-muted connect-small"
                      style={{ marginTop: 3 }}
                    >
                      {action.detail}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="connect-button small"
                    onClick={() => setTab(action.tab)}
                  >
                    {action.cta}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="connect-card"
          aria-labelledby="blockers-title"
        >
          <h2
            className="connect-section-title"
            id="blockers-title"
          >
            Blockers & warnings
          </h2>

          {issues.length === 0 ? (
            <div className="connect-empty">
              Nothing is blocking progress.
            </div>
          ) : (
            <ul className="connect-list">
              {issues.map((issue) => (
                <li key={issue.id}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span
                      className={`connect-issue-tag ${issue.severity}`}
                    >
                      {issue.severity}
                    </span>

                    <div>
                      <div className="connect-list-title">
                        {issue.title}
                      </div>
                      <div
                        className="connect-muted connect-small"
                        style={{ marginTop: 3 }}
                      >
                        {issue.detail}
                      </div>
                    </div>
                  </div>

                  {issue.tab && (
                    <button
                      type="button"
                      className="connect-button secondary small"
                      onClick={() => setTab(issue.tab!)}
                    >
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
        <section
          className="connect-card"
          aria-labelledby="missing-title"
        >
          <h2
            className="connect-section-title"
            id="missing-title"
          >
            Missing information
          </h2>

          {domainStats.map(({ domain, counts, total }) => (
            <div
              className="connect-domain-row"
              key={domain.id}
            >
              <div className="connect-domain-head">
                <strong style={{ fontSize: 13 }}>
                  {domain.label}
                </strong>

                <span className="connect-muted connect-small">
                  {total === 0
                    ? "Nothing provided"
                    : `${total} item${total === 1 ? "" : "s"}`}
                </span>
              </div>

              <ProvenanceStack counts={counts} />

              {total === 0 && (
                <div
                  className="connect-muted connect-small"
                  style={{ marginTop: 6 }}
                >
                  {domain.hint}
                </div>
              )}
            </div>
          ))}

          <div
            className="connect-muted connect-small"
            style={{ marginTop: 10 }}
          >
            {unverifiedDomains > 0
              ? `${unverifiedDomains} covered area${
                  unverifiedDomains === 1 ? " has" : "s have"
                } no verified evidence yet.`
              : "All covered areas include verified evidence."}
          </div>
        </section>

        <section
          className="connect-card"
          aria-labelledby="prov-title"
        >
          <h2
            className="connect-section-title"
            id="prov-title"
          >
            Evidence quality
          </h2>

          <ProvenanceStack counts={totals} />

          <div className="connect-legend">
            {PROVENANCE_ORDER.map((p) => (
              <div className="connect-legend-item" key={p}>
                <ProvBadge p={p} />{" "}
                <strong style={{ color: "var(--c-text)" }}>
                  {totals[p]}
                </strong>
                <div>{PROVENANCE[p].help}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {renderStages()}
    </>
  );

  const renderConnect = () => {
    const isOwner = workspace?.institution.role === "owner";

    return (
      <section
        className="connect-card"
        aria-labelledby="connect-title"
      >
        <div className="connect-eyebrow">CONNECTION METHOD</div>

        <h2
          className="connect-section-title"
          id="connect-title"
          style={{ marginTop: 6 }}
        >
          How will your institution connect?
        </h2>

        <p
          className="connect-muted"
          style={{ lineHeight: 1.6, marginTop: 0 }}
        >
          Choose one or more ways for your bank or institution to
          connect to Rebel. Rebel never needs access to your
          internal source code. Nothing is accessed until you
          approve it.
        </p>

        {!isOwner && (
          <div className="connect-warning">
            Only the institution owner can choose connection
            methods.
          </div>
        )}

        {connectorError && (
          <div className="connect-error" role="alert">
            {connectorError}
          </div>
        )}

        <div className="connect-grid-2">
          {CONNECTORS.map((option, index) => {
            const selected = connectors.some(
              (item) => item.connector_type === option.id
            );
            const busy = connectorBusy === option.id;

            return (
              <div
                className="connect-card"
                key={option.id}
                style={{
                  background: "var(--c-card-raised)",
                  boxShadow: "none",
                  borderColor: selected
                    ? "var(--c-accent)"
                    : undefined,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div
                    className={`connect-stage-num ${
                      selected ? "complete" : ""
                    }`}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </div>

                  <strong style={{ fontSize: 15 }}>
                    {option.title}
                  </strong>

                  <span
                    className={`connect-status ${
                      option.available ? "active" : "optional"
                    }`}
                    style={{ marginLeft: "auto" }}
                  >
                    {option.available ? "Available" : "Planned"}
                  </span>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div className="connect-card-label">
                    What Rebel receives
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    {option.receives}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="connect-card-label">
                    Typical use
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    {option.use}
                  </div>
                </div>

                <p
                  className="connect-muted connect-small"
                  style={{ lineHeight: 1.55 }}
                >
                  {option.next}
                </p>

                {!option.available && (
                  <div className="connect-warning">
                    Rebel cannot receive data this way yet.
                    Choosing it records your preference so
                    onboarding can follow up. Nothing is
                    connected.
                  </div>
                )}

                <div className="connect-actions-row">
                  {option.available ? (
                    <button
                      type="button"
                      className="connect-button"
                      disabled={busy || !isOwner}
                      onClick={async () => {
                        if (
                          selected ||
                          (await setConnector(option.id, true))
                        ) {
                          setTab("discover");
                        }
                      }}
                    >
                      {selected
                        ? "Continue to API discovery"
                        : "Set up Direct API"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="connect-button"
                      disabled={busy || !isOwner || selected}
                      onClick={() =>
                        void setConnector(option.id, true)
                      }
                    >
                      {selected ? "Interest recorded" : "Register interest"}
                    </button>
                  )}

                  {selected && (
                    <button
                      type="button"
                      className="connect-button secondary"
                      disabled={busy || !isOwner}
                      onClick={() =>
                        void setConnector(option.id, false)
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderDiscover = () => {
    const canDecide = workspace?.institution.role === "owner";

    const visibleEndpoints = discovery
      ? discovery.endpoints.filter(
          (endpoint) =>
            endpointFilter === "all" ||
            endpoint.approval_status === endpointFilter
        )
      : [];

    return (
      <section
        className="connect-card"
        aria-labelledby="disc-title"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <div className="connect-eyebrow">
              SYSTEM INTEGRATION
            </div>

            <h2
              className="connect-section-title"
              id="disc-title"
              style={{ marginTop: 6, marginBottom: 0 }}
            >
              Discover Banking APIs
            </h2>
          </div>

          <span className="connect-status">API discovery</span>
        </div>

        <p
          className="connect-muted"
          style={{ lineHeight: 1.6 }}
        >
          Enter an institution's banking portal, API gateway, or
          a direct OpenAPI/Swagger specification URL. Rebel reads
          the bank's published API documentation, saves what it
          finds against your institution and classifies each
          operation. Every discovered endpoint starts as pending
          approval. No public URL? Upload a specification on the{" "}
          <button
            type="button"
            className="connect-button link"
            style={{
              color: "var(--c-accent)",
              padding: 0,
            }}
            onClick={() => setTab("evidence")}
          >
            Evidence tab
          </button>.
        </p>

        <form onSubmit={discoverAPIs}>
          <label
            className="connect-label"
            htmlFor="bank-source-url"
          >
            Banking portal URL or direct OpenAPI specification URL
          </label>

          <div className="connect-discovery-input">
            <input
              id="bank-source-url"
              className="connect-input"
              type="url"
              value={sourceUrl}
              onChange={(event) =>
                setSourceUrl(event.target.value)
              }
              placeholder="https://bank.example.com/openapi.json"
              required
            />

            <button
              className="connect-button"
              type="submit"
              disabled={discovering || !canDecide}
              title={
                canDecide
                  ? undefined
                  : "Only the institution owner can run discovery"
              }
            >
              {discovering ? "Discovering..." : "Discover APIs"}
            </button>
          </div>
        </form>

        <div
          className="connect-info"
          style={{ marginTop: 16 }}
        >
          <strong>Read-only discovery:</strong> Rebel inspects
          accessible API documentation and permitted metadata.
          Discovery will not initiate payments, modify accounts
          or execute administrative operations. Results are
          recorded as <ProvBadge p="unverified" /> until confirmed.
        </div>

        {discoveryError && (
          <div className="connect-error" role="alert">
            {discoveryError}
          </div>
        )}

        {scanNote && (
          <div className="connect-warning" role="status">
            {scanNote}
          </div>
        )}

        {discovery && (
          <div className="connect-discovery-result">
            <h3 className="connect-section-title">
              Saved API inventory
            </h3>

            <div className="connect-muted">
              Target: {discovery.target_url}
            </div>

            {discovery.discovery_mode && (
              <div
                className="connect-muted"
                style={{ marginTop: 6 }}
              >
                Discovery mode: {discovery.discovery_mode}
              </div>
            )}

            {discovery.validated_origin && (
              <div
                className="connect-muted"
                style={{ marginTop: 6 }}
              >
                Validated origin: {discovery.validated_origin}
              </div>
            )}

            <div
              className="connect-muted"
              style={{ marginTop: 6 }}
            >
              Discovered: {formatDate(discovery.created_at)}
            </div>

            <div style={{ marginTop: 12 }}>
              <span
                className={`connect-status ${
                  discovery.reachable ? "active" : ""
                }`}
              >
                {discovery.reachable
                  ? "Host reachable"
                  : "Host not reachable"}
              </span>
            </div>

            <h3 style={{ fontSize: 14, marginTop: 20 }}>
              API documentation
            </h3>

            {discovery.documentation_urls.length === 0 ? (
              <p className="connect-muted">
                No API documentation was discovered.
              </p>
            ) : (
              discovery.documentation_urls.map((url) => (
                <a
                  key={url}
                  className="connect-doc-link"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {url}
                </a>
              ))
            )}

            <h3 style={{ fontSize: 14, marginTop: 20 }}>
              Authentication methods
            </h3>

            <p className="connect-muted">
              {discovery.authentication_methods.length
                ? discovery.authentication_methods.join(", ")
                : "Not determined"}
            </p>

            <h3 style={{ fontSize: 14, marginTop: 20 }}>
              Discovered endpoints
            </h3>

            {discovery.endpoints.length === 0 ? (
              <p className="connect-muted">
                No endpoints have been identified yet.
              </p>
            ) : (
              <>
                <div
                  className="connect-chips"
                  role="group"
                  aria-label="Filter endpoints by approval status"
                >
                  <button
                    type="button"
                    className="connect-chip"
                    aria-pressed={endpointFilter === "all"}
                    onClick={() => setEndpointFilter("all")}
                  >
                    All ({apiCounts.total})
                  </button>

                  {(
                    ["pending", "approved", "rejected"] as const
                  ).map((status) => (
                    <button
                      type="button"
                      key={status}
                      className="connect-chip"
                      aria-pressed={endpointFilter === status}
                      onClick={() => setEndpointFilter(status)}
                    >
                      {APPROVAL_LABEL[status]} ({apiCounts[status]})
                    </button>
                  ))}
                </div>

                {!canDecide && (
                  <div className="connect-warning">
                    Only the institution owner can approve or
                    reject endpoints.
                  </div>
                )}

                {decisionError && (
                  <div className="connect-error" role="alert">
                    {decisionError}
                  </div>
                )}

                {visibleEndpoints.length === 0 && (
                  <p className="connect-muted">
                    No endpoints match this filter.
                  </p>
                )}

                {visibleEndpoints.map((endpoint) => {
                  const busy = decidingId === endpoint.endpoint_id;

                  return (
                    <div
                      className="connect-endpoint"
                      key={endpoint.endpoint_id}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="connect-method">
                        {endpoint.method.toUpperCase()}
                      </span>

                      <span style={{ flex: "1 1 260px", minWidth: 0 }}>
                        <div className="connect-endpoint-path">
                          {endpoint.path}
                        </div>

                        <div className="connect-muted">
                          {endpoint.description ||
                            endpoint.category ||
                            "No description available"}
                        </div>

                        <div
                          className="connect-muted"
                          style={{ fontSize: 11 }}
                        >
                          {endpoint.read_only
                            ? "Read-only"
                            : "Write or state-changing"}
                          {" · "}
                          {endpoint.classification_source ===
                          "declared"
                            ? "declared in the bank's specification"
                            : "inferred from the HTTP method"}
                        </div>

                        {!endpoint.approvable &&
                          endpoint.approval_blocker && (
                            <div
                              className="connect-muted"
                              style={{ fontSize: 11 }}
                            >
                              Cannot be approved:{" "}
                              {endpoint.approval_blocker}
                            </div>
                          )}

                        {endpoint.decided_at && (
                          <div
                            className="connect-muted"
                            style={{ fontSize: 11 }}
                          >
                            Decided {formatDate(endpoint.decided_at)}
                          </div>
                        )}
                      </span>

                      <span
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          className={`connect-status ${
                            APPROVAL_CLASS[endpoint.approval_status]
                          }`}
                        >
                          {APPROVAL_LABEL[endpoint.approval_status]}
                        </span>

                        <button
                          type="button"
                          className="connect-button small"
                          disabled={
                            !canDecide ||
                            busy ||
                            !endpoint.approvable ||
                            endpoint.approval_status === "approved"
                          }
                          title={
                            endpoint.approval_blocker ?? undefined
                          }
                          onClick={() =>
                            void decideEndpoint(endpoint, "approved")
                          }
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          className="connect-button secondary small"
                          disabled={
                            !canDecide ||
                            busy ||
                            endpoint.approval_status === "rejected"
                          }
                          onClick={() =>
                            void decideEndpoint(endpoint, "rejected")
                          }
                        >
                          Reject
                        </button>
                      </span>
                    </div>
                  );
                })}
              </>
            )}

            {discovery.warnings.map((warning, index) => (
              <div className="connect-warning" key={index}>
                {warning}
              </div>
            ))}

            <p
              className="connect-muted"
              style={{ marginTop: 15 }}
            >
              {apiCounts.approved} approved ·{" "}
              {apiCounts.pending} pending ·{" "}
              {apiCounts.rejected} rejected
            </p>

            <div className="connect-info">
              <strong>Approval is a decision, not access.</strong>{" "}
              Approving an endpoint records that the institution
              permits Rebel to use it for read-only collection.
              Only read-only operations can be approved; the server
              refuses anything else. Bank authentication, encrypted
              credentials and data collection are the next stage,
              so approved APIs stay unverified until data is
              actually collected. Every decision is recorded in an
              audit trail.
            </div>

            <div className="connect-actions-row">
              <button
                type="button"
                className="connect-button"
                onClick={() => setTab("report")}
              >
                Continue to report
              </button>

              <button
                type="button"
                className="connect-button secondary"
                onClick={() => setTab("evidence")}
              >
                Add more evidence
              </button>
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderEvidence = () => (
    <>
      <div className="connect-grid-2">
        <section
          className="connect-card"
          aria-labelledby="upload-title"
        >
          <h2
            className="connect-section-title"
            id="upload-title"
          >
            Upload documents or data
          </h2>

          <label
            className="connect-label"
            htmlFor="intake-domain"
          >
            Applies to
          </label>

          <DomainSelect
            id="intake-domain"
            value={intakeDomain}
            onChange={setIntakeDomain}
          />

          <div
            className={`connect-dropzone ${
              dragOver ? "over" : ""
            }`}
            role="button"
            tabIndex={0}
            aria-label="Upload files"
            onClick={() => fileInput.current?.click()}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                fileInput.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <strong>
              {ingesting
                ? "Processing…"
                : "Drop files here or click to browse"}
            </strong>

            <span className="connect-muted connect-small">
              Up to {formatBytes(MAX_FILE_BYTES)} each.
              OpenAPI files are detected automatically.
            </span>

            <div className="connect-file-types">
              {[
                "OpenAPI JSON/YAML",
                "PDF",
                "CSV",
                "Excel",
                "JSON",
              ].map((type) => (
                <span className="connect-file-type" key={type}>
                  {type}
                </span>
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
            <div
              className="connect-info"
              style={{ marginTop: 12 }}
              role="status"
            >
              {intakeNotice}
            </div>
          )}

          <div className="connect-warning">
            Files are hashed and summarised in your browser and
            registered as <strong>uploaded documents</strong>.
            Transmission to Rebel will be enabled when the
            evidence upload API is available; nothing here
            counts as verified.
          </div>
        </section>

        <section
          className="connect-card"
          aria-labelledby="decl-title"
        >
          <h2 className="connect-section-title" id="decl-title">
            Declare manually
          </h2>

          <p
            className="connect-muted connect-small"
            style={{ marginTop: -6, lineHeight: 1.55 }}
          >
            No document handy? State what you know.
            Declarations are labelled as such in every report.
          </p>

          <form onSubmit={addDeclaration}>
            <label
              className="connect-label"
              htmlFor="decl-domain"
            >
              Compliance area
            </label>

            <DomainSelect
              id="decl-domain"
              value={declDomain}
              onChange={setDeclDomain}
            />

            <label
              className="connect-label"
              htmlFor="decl-statement"
            >
              Statement
            </label>

            <textarea
              id="decl-statement"
              className="connect-textarea"
              value={declStatement}
              onChange={(event) =>
                setDeclStatement(event.target.value)
              }
              placeholder="e.g. All customer-facing APIs require OAuth 2.0 with mutual TLS."
              minLength={10}
              maxLength={1000}
              required
            />

            <label
              className="connect-label"
              htmlFor="decl-by"
            >
              Declared by (optional)
            </label>

            <input
              id="decl-by"
              className="connect-input"
              value={declBy}
              onChange={(event) =>
                setDeclBy(event.target.value)
              }
              placeholder="Name or role"
              maxLength={100}
            />

            <button
              className="connect-button"
              type="submit"
              disabled={declStatement.trim().length < 10}
            >
              Add declaration
            </button>
          </form>
        </section>
      </div>

      <section
        className="connect-card"
        style={{ marginTop: 16 }}
        aria-labelledby="register-title"
      >
        <h2
          className="connect-section-title"
          id="register-title"
        >
          Evidence register
        </h2>

        <div
          className="connect-chips"
          role="group"
          aria-label="Filter by provenance"
        >
          <button
            type="button"
            className="connect-chip"
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
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
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <ProvBadge p={item.provenance} />
                    </td>

                    <td>{domainLabel(item.domain)}</td>

                    <td style={{ maxWidth: 380 }}>
                      <strong>{item.title}</strong>

                      {item.detail && (
                        <div
                          className="connect-muted connect-small"
                          style={{
                            marginTop: 3,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {item.detail}
                        </div>
                      )}
                    </td>

                    <td className="connect-muted">
                      {item.source}
                    </td>

                    <td className="connect-muted">
                      {formatDate(item.at)}
                    </td>

                    <td>
                      {item.removable && (
                        <button
                          type="button"
                          className="connect-button link"
                          onClick={() => removeLocal(item)}
                        >
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
    const report = store.report;

    return (
      <>
        <section
          className="connect-card"
          aria-labelledby="report-title"
        >
          <div className="connect-eyebrow">
            COMPLIANCE ASSESSMENT
          </div>

          <h2
            className="connect-section-title"
            id="report-title"
            style={{ marginTop: 6 }}
          >
            Preliminary readiness report
          </h2>

          <p
            className="connect-muted"
            style={{ lineHeight: 1.6, marginTop: 0 }}
          >
            Built from everything on the Evidence tab. It does
            not require sandbox access or live API integration,
            and each finding shows how well it is substantiated.
          </p>

          <div className="connect-actions-row connect-no-print">
            <button
              type="button"
              className="connect-button"
              onClick={generateReport}
              disabled={stableItems.length === 0}
            >
              {report
                ? "Regenerate report"
                : "Generate preliminary report"}
            </button>

            {report && (
              <>
                <button
                  type="button"
                  className="connect-button secondary"
                  onClick={exportMarkdown}
                >
                  Download Markdown
                </button>

                <button
                  type="button"
                  className="connect-button secondary"
                  onClick={exportJson}
                >
                  Download JSON
                </button>

                <button
                  type="button"
                  className="connect-button secondary"
                  onClick={() => window.print()}
                >
                  Print
                </button>
              </>
            )}
          </div>

          {stableItems.length === 0 && (
            <div className="connect-warning">
              Add at least one document, declaration or
              discovery result to enable generation.
            </div>
          )}

          {reportStale && (
            <div className="connect-warning" role="status">
              Evidence has changed since this report was
              generated. Regenerate to include the latest items.
            </div>
          )}
        </section>

        {report && workspace && (
          <section
            className="connect-card"
            aria-label="Report preview"
          >
            <div className="connect-hero">
              <div
                className="connect-ring"
                style={
                  {
                    ["--p" as string]: report.overall,
                  } as CSSProperties
                }
                role="img"
                aria-label={`Evidence readiness ${report.overall} percent`}
              >
                <div className="connect-ring-inner">
                  <div>
                    <div className="connect-ring-value">
                      {report.overall}%
                    </div>
                    <div className="connect-ring-label">
                      readiness
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>
                  {workspace.institution.name}
                </h3>

                <div
                  className="connect-muted connect-small"
                  style={{ marginTop: 4 }}
                >
                  Generated {formatDate(report.generatedAt)} ·{" "}
                  {workspace.institution.jurisdiction}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {PROVENANCE_ORDER.map((p) => (
                    <span
                      key={p}
                      className={`connect-prov ${p}`}
                    >
                      {PROVENANCE[p].short}: {report.totals[p]}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: 15, marginTop: 26 }}>
              Coverage by area
            </h3>

            {report.domains.map((domain) => (
              <div
                className="connect-domain-row"
                key={domain.id}
              >
                <div className="connect-domain-head">
                  <strong style={{ fontSize: 14 }}>
                    {domain.label}
                  </strong>

                  <span
                    className={`connect-level ${domain.level}`}
                  >
                    {LEVEL_LABEL[domain.level]} ·{" "}
                    {Math.round(domain.score * 100)}%
                  </span>
                </div>

                <ProvenanceStack counts={domain.counts} />

                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  {PROVENANCE_ORDER.filter(
                    (p) => domain.counts[p] > 0
                  ).map((p) => (
                    <span
                      key={p}
                      className={`connect-prov ${p}`}
                    >
                      {PROVENANCE[p].short} ×
                      {domain.counts[p]}
                    </span>
                  ))}
                </div>

                {domain.gaps.map((gap) => (
                  <div
                    key={gap}
                    className="connect-muted connect-small"
                    style={{ marginTop: 6 }}
                  >
                    • {gap}
                  </div>
                ))}
              </div>
            ))}

            <h3 style={{ fontSize: 15, marginTop: 26 }}>
              Limitations
            </h3>

            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                lineHeight: 1.7,
                fontSize: 13,
              }}
            >
              {report.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
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
            <div className="connect-card-label">
              Registered agents
            </div>
            <div className="connect-metric">
              {workspace.metrics.agents_total}
            </div>
          </div>

          <div className="connect-card">
            <div className="connect-card-label">
              Active agents
            </div>
            <div className="connect-metric">
              {workspace.metrics.agents_active}
            </div>
          </div>

          <div className="connect-card">
            <div className="connect-card-label">
              Evidence submissions
            </div>
            <div className="connect-metric">
              {workspace.metrics.evidence_total}
            </div>
          </div>
        </section>

        <section className="connect-card">
          <h2 className="connect-section-title">
            Connected agents
          </h2>

          {workspace.agents.length === 0 ? (
            <div className="connect-muted">
              No agents have been provisioned for this
              institution yet.
            </div>
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
                        <div
                          className="connect-muted"
                          style={{ fontSize: 10 }}
                        >
                          {agent.agent_id}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`connect-status ${
                            agent.status === "active"
                              ? "active"
                              : ""
                          }`}
                        >
                          {agent.status}
                        </span>
                      </td>

                      <td>{formatDate(agent.created_at)}</td>

                      <td>
                        {agent.last_seen_at
                          ? formatDate(agent.last_seen_at)
                          : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="connect-card">
          <h2 className="connect-section-title">
            Recent evidence <ProvBadge p="verified" />
          </h2>

          {workspace.recent_evidence.length === 0 ? (
            <div className="connect-muted">
              No evidence has been received. Once an institution
              agent submits evidence, its source, type,
              timestamp and integrity hash will appear here.
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
                      <td>{formatDate(item.received_at)}</td>
                      <td className="connect-hash">
                        {item.payload_sha256}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="connect-card">
          <h2 className="connect-section-title">
            Sandbox & automated collection
          </h2>

          <div className="connect-planned">
            <span className="connect-status optional">
              Planned
            </span>

            <p
              style={{
                lineHeight: 1.6,
                margin: "10px 0 0",
                fontSize: 13,
              }}
            >
              When Vestro sandbox credentials are available,
              approved read-only endpoints from discovery become
              scheduled collectors. Their submissions arrive as{" "}
              <ProvBadge p="verified" /> evidence and the
              preliminary report refreshes automatically as new
              data lands. Nothing on this page needs to change
              to adopt it: existing declarations and documents
              stay in place and are progressively superseded by
              verified data.
            </p>
          </div>
        </section>

        <div
          className="connect-info"
          style={{ marginTop: 16 }}
        >
          <strong>Integration workflow:</strong> Discover the
          institution's existing APIs, approve the required
          read-only resources, configure authentication and then
          provision an institution-specific data collector.
        </div>

        <button
          className="connect-button"
          style={{ marginTop: 18 }}
          onClick={() => {
            void loadWorkspace();
            void loadInventory();
          }}
        >
          Refresh workspace
        </button>
      </>
    );
  };

  /* ---------------- page ---------------- */

  return (
    <main className="connect-page">
      <div className="connect-wrap">
        <div className="connect-eyebrow">
          REBEL // INSTITUTIONAL CONNECT
        </div>

        <h1 className="connect-title">
          Institution Connect
        </h1>

        <p className="connect-subtitle">
          Connect your institution's existing systems to Rebel.
          Start with whatever you have: an API URL, a spec, a
          PDF, a spreadsheet or a simple statement. Build toward
          verified evidence and compliance assessments at your
          own pace.
        </p>

        {error && (
          <div className="connect-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div
            className="connect-card"
            style={{ marginTop: 25 }}
          >
            Loading institution workspace…
          </div>
        ) : workspace ? (
          <>
            <div
              className="connect-tabs"
              role="tablist"
              aria-label="Workspace sections"
            >
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`tab-${item.id}`}
                  aria-selected={tab === item.id}
                  aria-controls={`panel-${item.id}`}
                  className="connect-tab"
                  onClick={() => setTab(item.id)}
                >
                  {item.label}

                  {typeof item.count === "number" &&
                    item.count > 0 && (
                      <span className="connect-tab-count">
                        {item.count}
                      </span>
                    )}
                </button>
              ))}
            </div>

            <div
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
            >
              {tab === "overview" && renderOverview()}
              {tab === "connect" && renderConnect()}
              {tab === "discover" && renderDiscover()}
              {tab === "evidence" && renderEvidence()}
              {tab === "report" && renderReport()}
              {tab === "agents" && renderAgents()}
            </div>
          </>
        ) : (
          <section
            className="connect-card"
            style={{
              maxWidth: 650,
              marginTop: 25,
            }}
          >
            <div className="connect-eyebrow">
              INITIALIZE WORKSPACE
            </div>

            <h2
              style={{
                fontSize: 23,
                margin: "10px 0",
              }}
            >
              Register your institution
            </h2>

            <p
              className="connect-muted"
              style={{
                lineHeight: 1.6,
                marginBottom: 18,
              }}
            >
              Two fields to begin. Create the institution
              workspace that will own your connected systems,
              agents and evidence. Your account will become its
              initial institution owner. Everything else can be
              added later.
            </p>

            <form onSubmit={createWorkspace}>
              <label
                className="connect-label"
                htmlFor="institution-name"
              >
                Legal or operating institution name
              </label>

              <input
                id="institution-name"
                className="connect-input"
                value={institutionName}
                onChange={(event) =>
                  setInstitutionName(event.target.value)
                }
                placeholder="e.g. Vestro Bank"
                minLength={2}
                maxLength={200}
                required
              />

              <label
                className="connect-label"
                htmlFor="institution-jurisdiction"
              >
                Primary jurisdiction
              </label>

              <input
                id="institution-jurisdiction"
                className="connect-input"
                value={jurisdiction}
                onChange={(event) =>
                  setJurisdiction(event.target.value)
                }
                placeholder="e.g. Zimbabwe"
                minLength={2}
                maxLength={100}
                required
              />

              <button
                className="connect-button"
                disabled={creating}
                type="submit"
              >
                {creating
                  ? "Creating workspace…"
                  : "Create institution workspace"}
              </button>
            </form>

            <p
              className="connect-muted"
              style={{ fontSize: 12, marginTop: 18 }}
            >
              Joining an existing institution by invitation
              will be added as the next membership workflow.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}