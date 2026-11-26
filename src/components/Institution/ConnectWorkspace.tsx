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

interface ValidationIssue {
  row: number | null;
  field: string | null;
  code: string;
  message: string;
}

interface ValidationReport {
  profile: string;
  valid: boolean;
  record_count: number;
  error_count: number;
  errors: ValidationIssue[];
  errors_truncated: boolean;
  warning_count: number;
  warnings: { code: string; message: string; rows?: number[]; row_count?: number }[];
}

interface MappingRow {
  control_id: string;
  control_ref: string | null;
  framework: string | null;
  title: string | null;
  request_id: string;
  handled: boolean;
  would_map: boolean;
  result: string | null;
  rationale: string;
  scoring_eligible: boolean;
  scoring_note: string;
}

interface MappingPreview {
  profile: string | null;
  consumers: string[];
  note?: string;
  error?: string;
  role_declared?: boolean;
  controls: MappingRow[];
}

interface MapTarget {
  control_id: string;
  control_ref: string | null;
  framework: string | null;
  title: string | null;
  request_id: string;
  description: string | null;
  required: boolean;
  kind: "asset_inventory" | "document";
  supported: boolean;
  unsupported_reason: string | null;
  needs_scope_statement: boolean;
}

interface MapsTo {
  control_id: string;
  request_id: string;
  scope_statement?: string;
}

interface FileAnalysis {
  maps_to?: { control_id: string; request_id: string; kind: string } | null;
  profile: string | null;
  profile_source?: string | null;
  enforced: boolean;
  validation: ValidationReport | null;
  mapping: MappingPreview | null;
}

class GatewayValidationError extends Error {
  analysis: FileAnalysis;

  constructor(message: string, analysis: FileAnalysis) {
    super(message);
    this.analysis = analysis;
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.detail;

    if (
      detail &&
      typeof detail === "object" &&
      !Array.isArray(detail) &&
      detail.validation
    ) {
      throw new GatewayValidationError(
        String(detail.message || "The file was rejected."),
        {
          profile: detail.validation.profile ?? null,
          enforced: true,
          validation: detail.validation as ValidationReport,
          mapping: (detail.mapping as MappingPreview | null) ?? null,
        }
      );
    }

    throw new Error(
      (typeof detail === "string" && detail) ||
        (Array.isArray(detail) &&
          detail
            .map((item: { msg?: string }) => item?.msg)
            .filter(Boolean)
            .join("; ")) ||
        (detail && typeof detail === "object" && detail.message) ||
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

type GatewayMethod =
  | "rest_api"
  | "outbound_agent"
  | "file_import"
  | "vestro_sandbox";

interface GatewayCheck {
  name: string;
  ok: boolean;
  detail: string;
}

interface GatewayJob {
  job_id: string;
  status: string;
  trigger: string;
  started_at?: string | null;
  finished_at?: string | null;
  items_collected: number;
  items_failed: number;
  error?: string | null;
  created_at: string;
  detail?: { target: string; status: string; error?: string }[];
}

interface GatewayIntegration {
  integration_id: string;
  method: GatewayMethod;
  name: string;
  status: "pending_approval" | "approved" | "suspended" | "revoked";
  config: Record<string, unknown>;
  has_credentials: boolean;
  needs_credentials: boolean;
  approved_at?: string | null;
  last_test: {
    status: string | null;
    at: string | null;
    detail: GatewayCheck[] | null;
    current: boolean;
  };
  last_collected_at?: string | null;
  evidence_count: number;
  latest_evidence_at?: string | null;
  freshness: { status: string; age_hours: number | null };
  last_job?: GatewayJob | null;
  jobs?: GatewayJob[];
}

interface GatewayEvidence {
  submission_id: string;
  integration_name?: string | null;
  source_system: string;
  evidence_type: string;
  source_uri: string;
  collected_at: string;
  payload_sha256: string;
  freshness: { status: string; age_hours: number | null };
  provenance: Record<string, unknown>;
}

interface GatewayAudit {
  audit_id: string;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
  created_at: string;
}

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "checkbox" | "textarea" | "secret";
  placeholder?: string;
  options?: { value: string; label: string }[];
}

async function gatewayRequest<T>(
  path: string,
  method: string,
  body?: unknown
): Promise<T> {
  const response = await connectRequest(`/connect/gateway${path}`, {
    method,
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return readResponse<T>(response);
}

function MapSelect({
  targets,
  value,
  onChange,
  scope,
  onScope,
  disabled,
}: {
  targets: MapTarget[];
  value: string;
  onChange: (value: string) => void;
  scope: string;
  onScope: (value: string) => void;
  disabled?: boolean;
}) {
  const frameworks = Array.from(
    new Set(targets.map((item) => item.framework || "Other"))
  );
  const chosen = targets.find(
    (item) => `${item.control_id}|${item.request_id}` === value
  );

  return (
    <div style={{ marginTop: 10 }}>
      <label className="connect-label" htmlFor="map-target">
        Attach to a specific control (optional)
      </label>

      <select
        id="map-target"
        className="connect-select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">No: store as a general file</option>
        {frameworks.map((framework) => (
          <optgroup key={framework} label={framework.replace(/_/g, " ")}>
            {targets
              .filter((item) => (item.framework || "Other") === framework)
              .map((item) => (
                <option
                  key={`${item.control_id}|${item.request_id}`}
                  value={`${item.control_id}|${item.request_id}`}
                  disabled={!item.supported}
                >
                  {item.control_ref || item.control_id} · {item.request_id}:{" "}
                  {item.description}
                  {item.supported ? "" : " (no validator yet)"}
                </option>
              ))}
          </optgroup>
        ))}
      </select>

      {chosen && (
        <p className="connect-muted connect-small" style={{ lineHeight: 1.55 }}>
          {chosen.kind === "asset_inventory"
            ? "The file is checked as an asset inventory and rejected if invalid. "
            : "The document is checked for a real file type and attached to this request. "}
          Every file you add next is attached to{" "}
          <strong>
            {chosen.control_ref || chosen.control_id} · {chosen.request_id}
          </strong>
          . Uploaded files appear on the Compliance page but cannot raise the score.
        </p>
      )}

      {chosen?.needs_scope_statement && (
        <>
          <label className="connect-label" htmlFor="map-scope">
            Scope statement for this file
          </label>
          <textarea
            id="map-scope"
            className="connect-textarea"
            value={scope}
            maxLength={1000}
            disabled={disabled}
            onChange={(event) => onScope(event.target.value)}
            placeholder="What this inventory covers, e.g. All production systems in scope for the RBI assessment."
          />
        </>
      )}
    </div>
  );
}

function ValidationReportView({
  analysis,
  stored,
}: {
  analysis: FileAnalysis;
  stored: boolean | null;
}) {
  const report = analysis.validation;
  const mapping = analysis.mapping;

  if (!report) {
    return (
      <div className="connect-info" style={{ marginTop: 10 }}>
        No data profile applies to this file, so it was checked only for
        format. Set a data profile on the integration to enforce a schema.
      </div>
    );
  }

  const rejected = !report.valid && analysis.enforced;
  const mappedTo = analysis.maps_to;
  const label = report.valid
    ? "VALID"
    : analysis.enforced
      ? "REJECTED"
      : "INVALID · NOT ENFORCED";

  return (
    <div style={{ marginTop: 10 }} aria-live="polite">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <strong
          style={{ color: report.valid ? "#15803d" : rejected ? "#b91c1c" : "#b45309" }}
        >
          {label}
        </strong>
        <span className="connect-small connect-muted">
          {report.profile.replace(/_/g, " ")} profile
          {analysis.profile_source ? ` (${analysis.profile_source})` : ""} ·{" "}
          {report.record_count} record{report.record_count === 1 ? "" : "s"} ·{" "}
          {report.error_count} error{report.error_count === 1 ? "" : "s"} ·{" "}
          {report.warning_count} warning{report.warning_count === 1 ? "" : "s"}
          {stored === true && " · stored"}
          {stored === false && " · nothing stored"}
        </span>
      </div>

      {mappedTo && (
        <div className="connect-small connect-muted" style={{ marginTop: 4 }}>
          Attached to {mappedTo.control_id} · {mappedTo.request_id}
        </div>
      )}

      {report.errors.length > 0 && (
        <div className="connect-table-wrap" style={{ marginTop: 8 }}>
          <table className="connect-table">
            <thead>
              <tr>
                <th>Record</th>
                <th>Field</th>
                <th>Problem</th>
              </tr>
            </thead>
            <tbody>
              {report.errors.map((item, index) => (
                <tr key={`${item.code}-${item.row}-${index}`}>
                  <td>{item.row ?? "file"}</td>
                  <td>{item.field ?? "—"}</td>
                  <td>
                    {item.message}{" "}
                    <span className="connect-muted connect-small">({item.code})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.errors_truncated && (
            <p className="connect-muted connect-small">
              Showing the first {report.errors.length} of {report.error_count} errors.
            </p>
          )}
        </div>
      )}

      {report.warnings.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          {report.warnings.map((item, index) => (
            <li key={`${item.code}-${index}`} className="connect-small" style={{ color: "#b45309" }}>
              {item.message}
              {item.rows && item.rows.length > 0
                ? ` (records ${item.rows.join(", ")}${
                    (item.row_count ?? 0) > item.rows.length ? ", …" : ""
                  })`
                : ""}
            </li>
          ))}
        </ul>
      )}

      {mapping && (
        <div style={{ marginTop: 12 }}>
          <strong className="connect-small">Compliance mapping</strong>
          {mapping.note && (
            <p className="connect-muted connect-small" style={{ lineHeight: 1.55 }}>
              {mapping.note}
            </p>
          )}
          {mapping.error && <p className="connect-small" style={{ color: "#b45309" }}>{mapping.error}</p>}
          {mapping.controls.length > 0 && (
            <div className="connect-table-wrap">
              <table className="connect-table">
                <thead>
                  <tr>
                    <th>Control</th>
                    <th>Request</th>
                    <th>Result</th>
                    <th>Maps</th>
                    <th>Can score</th>
                  </tr>
                </thead>
                <tbody>
                  {mapping.controls.map((row) => (
                    <tr key={`${row.control_id}-${row.request_id}`}>
                      <td>
                        {row.control_ref || row.control_id}
                        <div className="connect-muted connect-small">{row.title}</div>
                      </td>
                      <td>{row.request_id}</td>
                      <td>
                        {row.handled ? row.result : "no validator"}
                        <div className="connect-muted connect-small">{row.rationale}</div>
                      </td>
                      <td>{row.would_map ? "yes" : "no"}</td>
                      <td>
                        {row.scoring_eligible ? "yes" : "no"}
                        <div className="connect-muted connect-small">{row.scoring_note}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const GATEWAY_METHODS: {
  id: GatewayMethod;
  title: string;
  summary: string;
  receives: string;
  use: string;
}[] = [
  {
    id: "rest_api",
    title: "Bank-approved REST API",
    summary:
      "Rebel calls the bank's own API using OAuth2, an API key, a bearer token or basic auth, optionally with mutual TLS.",
    receives: "Only the read-only endpoints you approve",
    use: "Account, transaction and control data",
  },
  {
    id: "outbound_agent",
    title: "Bank-controlled outbound agent",
    summary:
      "A connector the bank runs pushes evidence to Rebel with its own agent credential. Rebel never reaches into the bank.",
    receives: "Evidence the bank's connector chooses to send",
    use: "Banks that cannot expose inbound access",
  },
  {
    id: "file_import",
    title: "Secure file import",
    summary:
      "Rebel pulls files over SFTP with a pinned host key, or you upload a bank export.",
    receives: "CSV, JSON, JSONL, XML or text files up to 1 MB",
    use: "Statements, transaction exports and audit records",
  },
  {
    id: "vestro_sandbox",
    title: "Vestro sandbox adapter",
    summary:
      "A REST adapter preset for the Vestro sandbox. Everything it collects is labelled synthetic sandbox data.",
    receives: "Approved read-only sandbox endpoints",
    use: "Demonstrations and integration testing",
  },
];

const AUTH_OPTIONS = [
  { value: "oauth2_client_credentials", label: "OAuth 2.0 client credentials" },
  { value: "api_key", label: "API key header" },
  { value: "bearer", label: "Bearer token" },
  { value: "basic", label: "Basic (username and password)" },
];

const NUMERIC_CONFIG_KEYS = new Set([
  "freshness_hours",
  "schedule_minutes",
  "port",
  "heartbeat_max_age_minutes",
]);

function configFields(
  method: GatewayMethod,
  form: Record<string, string>
): FieldDef[] {
  const freshness: FieldDef = {
    key: "freshness_hours",
    label: "Evidence freshness window (hours)",
    type: "number",
    placeholder: "24",
  };

  const complianceFields: FieldDef[] = [
    {
      key: "compliance_role",
      label: "Use this data as compliance evidence",
      type: "select",
      options: [
        { value: "", label: "No, collect only" },
        { value: "asset_inventory", label: "Yes, it is the institution's asset inventory" },
      ],
    },
    {
      key: "scope_statement",
      label: "Scope statement (needed for scope controls)",
      placeholder: "e.g. All production systems in scope for RBI assessment",
    },
  ];

  const schedule: FieldDef = {
    key: "schedule_minutes",
    label: "Scheduled collection every N minutes (optional)",
    type: "number",
    placeholder: "e.g. 1440",
  };

  if (method === "rest_api" || method === "vestro_sandbox") {
    const authType = form.auth_type || "oauth2_client_credentials";

    const fields: FieldDef[] = [
      {
        key: "base_url",
        label:
          method === "vestro_sandbox"
            ? "Vestro sandbox base URL (blank uses the server default)"
            : "Bank API base URL",
        placeholder: "https://api.bank.example",
      },
      {
        key: "auth_type",
        label: "Authentication",
        type: "select",
        options: AUTH_OPTIONS,
      },
    ];

    if (authType === "oauth2_client_credentials") {
      fields.push(
        {
          key: "token_url",
          label: "OAuth token URL",
          placeholder: "https://auth.bank.example/oauth/token",
        },
        { key: "scope", label: "Scope (optional)" },
        {
          key: "token_auth_style",
          label: "Send client credentials",
          type: "select",
          options: [
            { value: "basic", label: "In an HTTP Basic header" },
            { value: "body", label: "In the request body" },
          ],
        }
      );
    }

    if (authType === "api_key") {
      fields.push({
        key: "api_key_header",
        label: "API key header name",
        placeholder: "X-API-Key",
      });
    }

    fields.push(
      {
        key: "test_path",
        label: "Connection test path (GET)",
        placeholder: "/health",
      },
      {
        key: "mtls",
        label: "Require mutual TLS (client certificate)",
        type: "checkbox",
      }
    );

    if (method === "rest_api") {
      fields.push({
        key: "environment",
        label: "Environment",
        type: "select",
        options: [
          { value: "production", label: "Production" },
          { value: "sandbox", label: "Sandbox" },
        ],
      });
    }

    fields.push(schedule, freshness, ...complianceFields);
    return fields;
  }

  if (method === "outbound_agent") {
    return [
      {
        key: "agent_id",
        label: "Rebel agent ID the bank's connector uses",
        placeholder: "agent_…",
      },
      {
        key: "heartbeat_max_age_minutes",
        label: "Maximum heartbeat age (minutes)",
        type: "number",
        placeholder: "60",
      },
      freshness,
    ];
  }

  const fields: FieldDef[] = [
    {
      key: "transport",
      label: "Transport",
      type: "select",
      options: [
        { value: "sftp", label: "SFTP pull (pinned host key)" },
        { value: "upload", label: "Manual upload of bank exports" },
      ],
    },
  ];

  if ((form.transport || "sftp") === "sftp") {
    fields.push(
      { key: "host", label: "SFTP host", placeholder: "sftp.bank.example" },
      { key: "port", label: "Port", type: "number", placeholder: "22" },
      { key: "username", label: "SFTP username" },
      {
        key: "host_key_sha256",
        label: "Pinned host key fingerprint",
        placeholder: "SHA256:…",
      },
      { key: "remote_dir", label: "Remote directory", placeholder: "/exports" },
      { key: "file_pattern", label: "File pattern", placeholder: "*.csv" },
      schedule
    );
  }

  fields.push(
    {
      key: "data_profile",
      label: "Validate files against a data profile",
      type: "select",
      options: [
        { value: "", label: "None (store files as received)" },
        { value: "asset_inventory", label: "Asset inventory (rejects bad files)" },
        { value: "transactions", label: "Transactions (rejects bad files)" },
      ],
    },
    freshness,
    ...complianceFields
  );
  return fields;
}

function buildConfig(
  method: GatewayMethod,
  form: Record<string, string>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const def of configFields(method, form)) {
    if (def.type === "checkbox") {
      if (form[def.key] === "true") out[def.key] = true;
      continue;
    }

    const value =
      def.type === "select"
        ? form[def.key] || def.options?.[0]?.value || ""
        : (form[def.key] ?? "").trim();

    if (!value) continue;

    out[def.key] = NUMERIC_CONFIG_KEYS.has(def.key) ? Number(value) : value;
  }

  return out;
}

function credentialFields(integration: GatewayIntegration): FieldDef[] {
  const config = integration.config;

  if (integration.method === "file_import") {
    return [
      { key: "password", label: "SFTP password", type: "secret" },
      {
        key: "sftp_private_key_pem",
        label: "SFTP private key (PEM, alternative to a password)",
        type: "textarea",
      },
      { key: "sftp_passphrase", label: "Key passphrase", type: "secret" },
    ];
  }

  const fields: FieldDef[] = [];

  switch (config.auth_type) {
    case "oauth2_client_credentials":
      fields.push(
        { key: "client_id", label: "Client ID", type: "text" },
        { key: "client_secret", label: "Client secret", type: "secret" }
      );
      break;
    case "api_key":
      fields.push({ key: "api_key", label: "API key", type: "secret" });
      break;
    case "bearer":
      fields.push({ key: "token", label: "Bearer token", type: "secret" });
      break;
    case "basic":
      fields.push(
        { key: "username", label: "Username", type: "text" },
        { key: "password", label: "Password", type: "secret" }
      );
      break;
  }

  if (config.mtls) {
    fields.push(
      {
        key: "client_cert_pem",
        label: "Client certificate (PEM)",
        type: "textarea",
      },
      {
        key: "client_key_pem",
        label: "Client private key (PEM)",
        type: "textarea",
      }
    );
  }

  return fields;
}

const GATEWAY_STATUS_CLASS: Record<string, string> = {
  pending_approval: "in_progress",
  approved: "complete",
  suspended: "optional",
  revoked: "not_started",
};

const FRESHNESS_CLASS: Record<string, string> = {
  fresh: "complete",
  stale: "in_progress",
  expired: "not_started",
};

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
    help: "Submitted by an institution agent, or collected by Rebel from an approved bank connection, with an integrity hash recorded by Rebel.",
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
const GATEWAY_MAX_BYTES = 1_000_000;
const GATEWAY_FILE_EXT = /\.(csv|json|jsonl|ndjson|xml|txt)$/i;
const DOCUMENT_MAX_BYTES = 600_000;
const DOCUMENT_EXT =
  /\.(pdf|docx|xlsx|doc|xls|png|jpe?g|csv|json|jsonl|xml|txt|md|ya?ml)$/i;
const DOCUMENT_ACCEPT =
  ".pdf,.docx,.xlsx,.doc,.xls,.png,.jpg,.jpeg,.csv,.json,.jsonl,.xml,.txt,.md,.yaml,.yml";
const ACCEPT =
  ".json,.yaml,.yml,.pdf,.csv,.xlsx,.xls,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.jsonl,.xml,application/json,application/pdf,text/csv";

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
  // Gateway-collected bank data has no compliance-area mapping yet.
  if (/^bank_(api_response|data_file|document_file)$/.test(item.evidence_type)) return null;

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
  const [integrations, setIntegrations] = useState<GatewayIntegration[]>([]);
  const [gwCanManage, setGwCanManage] = useState(false);
  const [gwEncryption, setGwEncryption] = useState(true);
  const [gwError, setGwError] = useState("");
  const [gwNotice, setGwNotice] = useState("");
  const [gwBusy, setGwBusy] = useState<string | null>(null);
  const [createMethod, setCreateMethod] = useState<GatewayMethod | null>(null);
  const [createName, setCreateName] = useState("");
  const [createForm, setCreateForm] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GatewayIntegration | null>(null);
  const [gwEvidence, setGwEvidence] = useState<GatewayEvidence[]>([]);
  const [gwAudit, setGwAudit] = useState<GatewayAudit[]>([]);
  const [credForm, setCredForm] = useState<Record<string, string>>({});
  const [testChecks, setTestChecks] = useState<GatewayCheck[] | null>(null);
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const [sendTarget, setSendTarget] = useState("");
  const [sendResults, setSendResults] = useState<
    { name: string; ok: boolean; message: string; analysis?: FileAnalysis }[]
  >([]);
  const [mapTargets, setMapTargets] = useState<MapTarget[]>([]);
  const [mapKey, setMapKey] = useState("");
  const [mapScope, setMapScope] = useState("");
  const [lastAnalysis, setLastAnalysis] = useState<{
    name: string;
    analysis: FileAnalysis;
    stored: boolean;
  } | null>(null);

  const mapTarget =
    mapTargets.find(
      (item) =>
        item.supported && `${item.control_id}|${item.request_id}` === mapKey
    ) ?? null;

  const mapsTo: MapsTo | undefined = mapTarget
    ? {
        control_id: mapTarget.control_id,
        request_id: mapTarget.request_id,
        ...(mapTarget.needs_scope_statement && mapScope.trim()
          ? { scope_statement: mapScope.trim() }
          : {}),
      }
    : undefined;

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

  const loadIntegrations = useCallback(async () => {
    try {
      const data = await gatewayRequest<{
        can_manage: boolean;
        encryption_configured: boolean;
        integrations: GatewayIntegration[];
      }>("/integrations", "GET");

      setIntegrations(data.integrations);
      setGwCanManage(data.can_manage);
      setGwEncryption(data.encryption_configured);
    } catch (err) {
      setGwError(
        err instanceof Error
          ? err.message
          : "Could not load bank integrations."
      );
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const [integration, evidence, audit] = await Promise.all([
        gatewayRequest<GatewayIntegration>(`/integrations/${id}`, "GET"),
        gatewayRequest<{ evidence: GatewayEvidence[] }>(
          `/evidence?integration_id=${encodeURIComponent(id)}&limit=25`,
          "GET"
        ),
        gatewayRequest<{ audit: GatewayAudit[] }>(
          `/audit?integration_id=${encodeURIComponent(id)}&limit=50`,
          "GET"
        ),
      ]);

      setDetail(integration);
      setGwEvidence(evidence.evidence);
      setGwAudit(audit.audit);
    } catch (err) {
      setGwError(
        err instanceof Error
          ? err.message
          : "Could not load the integration."
      );
    }
  }, []);

  useEffect(() => {
    if (!institutionId) {
      setIntegrations([]);
      setOpenId(null);
      setDetail(null);
      return;
    }

    void loadIntegrations();

    void gatewayRequest<{ targets: MapTarget[] }>("/mapping-targets", "GET")
      .then((data) => setMapTargets(data.targets))
      .catch(() => setMapTargets([]));
  }, [institutionId, loadIntegrations]);

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

  const runGateway = async (key: string, task: () => Promise<void>) => {
    setGwBusy(key);
    setGwError("");
    setGwNotice("");

    try {
      await task();
    } catch (err) {
      setGwError(
        err instanceof Error ? err.message : "The request failed."
      );
    } finally {
      setGwBusy(null);
    }
  };

  const refreshGateway = async (id: string | null) => {
    await loadIntegrations();
    if (id) await loadDetail(id);
    void loadWorkspace(true);
  };

  const openIntegration = (id: string) => {
    setLastAnalysis(null);
    setOpenId(id);
    setDetail(null);
    setGwEvidence([]);
    setGwAudit([]);
    setCredForm({});
    setTestChecks(null);
    setVerified({});
    void loadDetail(id);
  };

  const startCreate = (method: GatewayMethod) => {
    setCreateMethod(method);
    setCreateName("");
    setCreateForm({
      auth_type: "oauth2_client_credentials",
      transport: "sftp",
      environment: "production",
    });
  };

  const createIntegration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createMethod) return;

    void runGateway("create", async () => {
      const created = await gatewayRequest<GatewayIntegration>(
        "/integrations",
        "POST",
        {
          method: createMethod,
          name: createName.trim(),
          config: buildConfig(createMethod, createForm),
        }
      );

      setCreateMethod(null);
      await loadIntegrations();
      openIntegration(created.integration_id);
      setGwNotice(
        "Integration created and pending approval. Add credentials, test the connection, then approve it."
      );
    });
  };

  const saveCredentials = (id: string) => {
    const credentials: Record<string, string> = {};

    for (const [key, value] of Object.entries(credForm)) {
      if (value.trim()) credentials[key] = value;
    }

    void runGateway("credentials", async () => {
      await gatewayRequest(`/integrations/${id}/credentials`, "PUT", {
        credentials,
      });

      // The browser never keeps secrets after they are sent.
      setCredForm({});
      setTestChecks(null);
      await refreshGateway(id);
      setGwNotice(
        "Credentials encrypted and stored. They cannot be viewed again. Approval was withdrawn: run a connection test."
      );
    });
  };

  const testConnection = (id: string) =>
    void runGateway("test", async () => {
      const result = await gatewayRequest<{
        status: string;
        checks: GatewayCheck[];
      }>(`/integrations/${id}/test`, "POST");

      setTestChecks(result.checks);
      await refreshGateway(id);
      setGwNotice(
        result.status === "success"
          ? "Connection test passed."
          : "Connection test failed. See the checks below."
      );
    });

  const transitionIntegration = (
    id: string,
    action: "approve" | "suspend" | "resume" | "revoke"
  ) => {
    if (
      action === "revoke" &&
      !window.confirm(
        "Revoking is permanent and deletes the stored credentials. Continue?"
      )
    ) {
      return;
    }

    void runGateway(action, async () => {
      await gatewayRequest(`/integrations/${id}/${action}`, "POST");
      await refreshGateway(id);
    });
  };

  const collectNow = (id: string) =>
    void runGateway("collect", async () => {
      const started = await gatewayRequest<{ job_id: string }>(
        `/integrations/${id}/collect`,
        "POST"
      );

      let job: GatewayJob | null = null;

      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        job = await gatewayRequest<GatewayJob>(
          `/integrations/${id}/jobs/${started.job_id}`,
          "GET"
        );

        if (job.status !== "pending" && job.status !== "running") break;
      }

      await refreshGateway(id);

      setGwNotice(
        job && job.status !== "pending" && job.status !== "running"
          ? `Collection ${job.status}: ${job.items_collected} collected, ${job.items_failed} failed.${
              job.error ? ` ${job.error}` : ""
            }`
          : "Collection is still running. Refresh to see the result."
      );
    });

  const fileToBase64 = async (file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";

    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }

    return btoa(binary);
  };

  const postGatewayFile = async (id: string, file: File) =>
    gatewayRequest<FileAnalysis & { file_sha256: string; submission_id: string }>(
      `/integrations/${id}/files`,
      "POST",
      {
        file_name: file.name,
        content_base64: await fileToBase64(file),
        ...(mapsTo ? { maps_to: mapsTo } : {}),
      }
    );

  const validateOnly = (id: string, file: File) => {
    void runGateway("validate", async () => {
      const result = await gatewayRequest<
        FileAnalysis & { accepted: boolean; stored: boolean }
      >(`/integrations/${id}/validate`, "POST", {
        file_name: file.name,
        content_base64: await fileToBase64(file),
        ...(mapsTo ? { maps_to: mapsTo } : {}),
      });

      setLastAnalysis({ name: file.name, analysis: result, stored: false });
      setGwNotice(
        result.accepted
          ? `${file.name} passes validation. Nothing was stored.`
          : `${file.name} would be rejected. Nothing was stored.`
      );
    });
  };

  const uploadExport = (id: string, file: File) => {
    void runGateway("upload", async () => {
      let result: Awaited<ReturnType<typeof postGatewayFile>>;

      try {
        result = await postGatewayFile(id, file);
      } catch (err) {
        if (err instanceof GatewayValidationError) {
          setLastAnalysis({ name: file.name, analysis: err.analysis, stored: false });
        }

        throw err;
      }

      setLastAnalysis({ name: file.name, analysis: result, stored: true });

      await refreshGateway(id);
      setGwNotice(
        `Imported ${file.name}. SHA-256 ${shortHash(result.file_sha256)}.`
      );
    });
  };

  const verifyEvidence = (submissionId: string) =>
    void runGateway("verify", async () => {
      const result = await gatewayRequest<{
        integrity: {
          payload_hash_matches: boolean;
          data_hash_matches: boolean | null;
        };
      }>(`/evidence/${encodeURIComponent(submissionId)}`, "GET");

      setVerified((current) => ({
        ...current,
        [submissionId]:
          result.integrity.payload_hash_matches &&
          result.integrity.data_hash_matches !== false,
      }));
    });

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

  const uploadTargets = integrations.filter(
    (item) =>
      item.method === "file_import" &&
      item.config.transport === "upload" &&
      item.status === "approved"
  );

  const activeTarget =
    uploadTargets.find((item) => item.integration_id === sendTarget) ??
    uploadTargets[0] ??
    null;

  const sendToGateway = async (files: File[], target: GatewayIntegration) => {
    const results: {
      name: string;
      ok: boolean;
      message: string;
      analysis?: FileAnalysis;
    }[] = [];

    for (const file of files) {
      const isDocument = mapTarget?.kind === "document";
      const limit = isDocument ? DOCUMENT_MAX_BYTES : GATEWAY_MAX_BYTES;

      if (file.size > limit) {
        results.push({
          name: file.name,
          ok: false,
          message: `Not sent: over the ${formatBytes(
            limit
          )} limit. Registered in this browser only.`,
        });
        continue;
      }

      if (!(isDocument ? DOCUMENT_EXT : GATEWAY_FILE_EXT).test(file.name)) {
        results.push({
          name: file.name,
          ok: false,
          message: isDocument
            ? "Not sent: this file type is not accepted for documents. Registered in this browser only."
            : "Not sent: the gateway accepts CSV, JSON, JSONL, XML and text files. Registered in this browser only.",
        });
        continue;
      }

      try {
        const result = await postGatewayFile(
          target.integration_id,
          file
        );

        results.push({
          name: file.name,
          ok: true,
          message: `Stored by Rebel. SHA-256 ${shortHash(
            result.file_sha256
          )}.`,
          analysis: result,
        });
      } catch (err) {
        results.push({
          name: file.name,
          ok: false,
          message: `Not stored: ${
            err instanceof Error ? err.message : "upload failed."
          }`,
          analysis:
            err instanceof GatewayValidationError ? err.analysis : undefined,
        });
      }
    }

    setSendResults(results);
    await refreshGateway(target.integration_id);
  };

  const handleFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);

    if (!files.length) return;

    setIngesting(true);
    setIntakeNotice("");
    setSendResults([]);

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

    if (activeTarget && gwCanManage) {
      await sendToGateway(
        files.filter((file) => file.size <= MAX_FILE_BYTES),
        activeTarget
      );
    }

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

    if (integrations.length === 0) {
      list.push({
        id: "choose-connection",
        title: "Choose how your institution connects",
        detail:
          "Bank-approved REST API, outbound agent, secure file import or the Vestro sandbox adapter.",
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
    integrations.length,
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
      count: integrations.length,
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
      {integrations.length === 0 && (
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
            Choose a bank-approved REST API, a bank-controlled
            outbound agent, a secure file import or the Vestro
            sandbox adapter. Nothing is collected until the
            institution owner approves it.
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

  const renderFieldInput = (
    def: FieldDef,
    values: Record<string, string>,
    setValues: (next: Record<string, string>) => void,
    prefix: string
  ) => {
    const id = `${prefix}-${def.key}`;
    const set = (value: string) => setValues({ ...values, [def.key]: value });

    if (def.type === "checkbox") {
      return (
        <label
          key={def.key}
          htmlFor={id}
          className="connect-label"
          style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0 14px" }}
        >
          <input
            id={id}
            type="checkbox"
            checked={values[def.key] === "true"}
            onChange={(event) => set(event.target.checked ? "true" : "")}
          />
          {def.label}
        </label>
      );
    }

    return (
      <div key={def.key}>
        <label className="connect-label" htmlFor={id}>
          {def.label}
        </label>

        {def.type === "select" ? (
          <select
            id={id}
            className="connect-select"
            value={values[def.key] ?? def.options?.[0]?.value ?? ""}
            onChange={(event) => set(event.target.value)}
          >
            {def.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : def.type === "textarea" ? (
          <textarea
            id={id}
            className="connect-textarea"
            value={values[def.key] ?? ""}
            onChange={(event) => set(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        ) : (
          <input
            id={id}
            className="connect-input"
            type={
              def.type === "secret"
                ? "password"
                : def.type === "number"
                  ? "number"
                  : "text"
            }
            value={values[def.key] ?? ""}
            placeholder={def.placeholder}
            onChange={(event) => set(event.target.value)}
            autoComplete="off"
          />
        )}
      </div>
    );
  };

  const renderIntegrationDetail = (integration: GatewayIntegration) => {
    const canCollect =
      integration.status === "approved" &&
      (integration.method === "rest_api" ||
        integration.method === "vestro_sandbox" ||
        (integration.method === "file_import" &&
          integration.config.transport === "sftp"));

    const isUpload =
      integration.method === "file_import" &&
      integration.config.transport === "upload";

    const credFields = credentialFields(integration);
    const checks = testChecks ?? integration.last_test.detail ?? [];
    const busy = gwBusy !== null;

    return (
      <section
        className="connect-card"
        style={{ marginTop: 16 }}
        aria-label={`${integration.name} details`}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="connect-eyebrow">INTEGRATION</div>
            <h2 className="connect-section-title" style={{ marginTop: 6 }}>
              {integration.name}
            </h2>
          </div>

          <span className={`connect-status ${GATEWAY_STATUS_CLASS[integration.status] ?? ""}`}>
            {integration.status.replace("_", " ")}
          </span>
        </div>

        <div className="connect-small connect-muted" style={{ lineHeight: 1.7 }}>
          {Object.entries(integration.config)
            .filter(([, value]) => value !== null && value !== undefined && value !== "")
            .map(([key, value]) => (
              <div key={key}>
                <strong>{key}</strong>: {String(value)}
              </div>
            ))}
        </div>

        <div className="connect-info" style={{ marginTop: 14 }}>
          Approval needs a passing connection test made after the latest
          change. Changing the configuration or credentials withdraws
          approval. Nothing is collected until the institution owner approves.
        </div>

        {gwCanManage && integration.status !== "revoked" && (
          <div className="connect-actions-row">
            <button type="button" className="connect-button secondary" disabled={busy} onClick={() => testConnection(integration.integration_id)}>
              {gwBusy === "test" ? "Testing…" : "Test connection"}
            </button>

            {integration.status === "pending_approval" && (
              <button
                type="button"
                className="connect-button"
                disabled={busy || !integration.last_test.current}
                title={integration.last_test.current ? undefined : "Run a passing connection test first"}
                onClick={() => transitionIntegration(integration.integration_id, "approve")}
              >
                Approve integration
              </button>
            )}

            {integration.status === "approved" && (
              <button type="button" className="connect-button secondary" disabled={busy} onClick={() => transitionIntegration(integration.integration_id, "suspend")}>
                Suspend
              </button>
            )}

            {integration.status === "suspended" && (
              <button type="button" className="connect-button" disabled={busy} onClick={() => transitionIntegration(integration.integration_id, "resume")}>
                Resume
              </button>
            )}

            {canCollect && (
              <button type="button" className="connect-button" disabled={busy} onClick={() => collectNow(integration.integration_id)}>
                {gwBusy === "collect" ? "Collecting…" : "Collect now"}
              </button>
            )}

            <button type="button" className="connect-button link" disabled={busy} onClick={() => transitionIntegration(integration.integration_id, "revoke")}>
              Revoke
            </button>
          </div>
        )}

        {checks.length > 0 && (
          <>
            <h3 style={{ fontSize: 14, marginTop: 20 }}>
              Connection test {integration.last_test.at ? `· ${formatDate(integration.last_test.at)}` : ""}
            </h3>

            <ul className="connect-list">
              {checks.map((check) => (
                <li key={check.name}>
                  <div>
                    <span className={`connect-status ${check.ok ? "complete" : "not_started"}`}>
                      {check.ok ? "Passed" : "Failed"}
                    </span>{" "}
                    <strong style={{ fontSize: 13 }}>{check.name.replace("_", " ")}</strong>
                    <div className="connect-muted connect-small" style={{ marginTop: 4 }}>
                      {check.detail}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {integration.method === "outbound_agent" && (
          <div className="connect-info" style={{ marginTop: 14 }}>
            The bank's connector pushes evidence using agent{" "}
            <strong>{String(integration.config.agent_id)}</strong>. There is
            nothing for Rebel to collect. Evidence it sends appears below.
          </div>
        )}

        {gwCanManage && integration.needs_credentials && integration.status !== "revoked" && (
          <>
            <h3 style={{ fontSize: 14, marginTop: 22 }}>
              {integration.has_credentials ? "Rotate credentials" : "Add credentials"}
            </h3>

            <p className="connect-muted connect-small" style={{ lineHeight: 1.6 }}>
              Credentials are encrypted on the server, never shown again and
              never kept in this browser.
              {!gwEncryption && " Encryption is not configured on the server, so saving will fail."}
            </p>

            {credFields.map((def) =>
              renderFieldInput(def, credForm, setCredForm, "cred")
            )}

            <button
              type="button"
              className="connect-button"
              disabled={busy || Object.values(credForm).every((value) => !value.trim())}
              onClick={() => saveCredentials(integration.integration_id)}
            >
              {gwBusy === "credentials" ? "Saving…" : "Save credentials"}
            </button>
          </>
        )}

        {isUpload && (
          <>
            <MapSelect
              targets={mapTargets}
              value={mapKey}
              onChange={setMapKey}
              scope={mapScope}
              onScope={setMapScope}
              disabled={busy}
            />

            <h3 style={{ fontSize: 14, marginTop: 22 }}>Check a file (nothing is stored)</h3>
            <p className="connect-muted connect-small" style={{ lineHeight: 1.6 }}>
              Validates a file against{" "}
              {integration.config.data_profile
                ? `this integration's ${String(integration.config.data_profile).replace(/_/g, " ")} profile`
                : "a profile detected from its columns"}{" "}
              and shows which controls it could map to, without importing it.
            </p>
            <input
              type="file"
              accept={mapTarget?.kind === "document" ? DOCUMENT_ACCEPT : ".csv,.json,.jsonl,.ndjson,.xml,.txt"}
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) validateOnly(integration.integration_id, file);
                event.target.value = "";
              }}
            />
          </>
        )}

        {isUpload && integration.status === "approved" && gwCanManage && (
          <>
            <h3 style={{ fontSize: 14, marginTop: 22 }}>Import a bank export</h3>
            <p className="connect-muted connect-small">
              CSV, JSON, JSONL, XML or text, up to 1 MB, decrypted. Larger
              exports should use the dataset pipeline.
            </p>
            <input
              type="file"
              accept={mapTarget?.kind === "document" ? DOCUMENT_ACCEPT : ".csv,.json,.jsonl,.ndjson,.xml,.txt"}
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadExport(integration.integration_id, file);
                event.target.value = "";
              }}
            />
          </>
        )}

        {isUpload && lastAnalysis && (
          <div className="connect-card" style={{ marginTop: 16, boxShadow: "none" }}>
            <strong>{lastAnalysis.name}</strong>
            <ValidationReportView
              analysis={lastAnalysis.analysis}
              stored={lastAnalysis.stored}
            />
          </div>
        )}

        <h3 style={{ fontSize: 14, marginTop: 24 }}>Collection jobs</h3>

        {!integration.jobs || integration.jobs.length === 0 ? (
          <p className="connect-muted connect-small">No collection jobs yet.</p>
        ) : (
          <div className="connect-table-wrap">
            <table className="connect-table">
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Trigger</th>
                  <th>Status</th>
                  <th>Collected</th>
                  <th>Failed</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {integration.jobs.map((job) => (
                  <tr key={job.job_id}>
                    <td>{formatDate(job.started_at ?? job.created_at)}</td>
                    <td>{job.trigger}</td>
                    <td>{job.status}</td>
                    <td>{job.items_collected}</td>
                    <td>{job.items_failed}</td>
                    <td className="connect-muted connect-small">
                      {job.error ??
                        (job.detail ?? [])
                          .filter((item) => item.error)
                          .map((item) => `${item.target}: ${item.error}`)
                          .join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 style={{ fontSize: 14, marginTop: 24 }}>Collected evidence</h3>

        {gwEvidence.length === 0 ? (
          <p className="connect-muted connect-small">Nothing collected yet.</p>
        ) : (
          <div className="connect-table-wrap">
            <table className="connect-table">
              <thead>
                <tr>
                  <th>Collected</th>
                  <th>Freshness</th>
                  <th>Source</th>
                  <th>Integrity hash</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {gwEvidence.map((item) => (
                  <tr key={item.submission_id}>
                    <td>{formatDate(item.collected_at)}</td>
                    <td>
                      <span className={`connect-status ${FRESHNESS_CLASS[item.freshness.status] ?? "optional"}`}>
                        {item.freshness.status}
                      </span>
                    </td>
                    <td style={{ overflowWrap: "anywhere" }}>
                      {item.source_uri || item.source_system}
                      {item.provenance.synthetic === true && (
                        <div className="connect-muted connect-small">Synthetic sandbox data</div>
                      )}
                    </td>
                    <td className="connect-hash">{shortHash(item.payload_sha256)}</td>
                    <td>
                      {item.submission_id in verified ? (
                        <span className={`connect-status ${verified[item.submission_id] ? "complete" : "not_started"}`}>
                          {verified[item.submission_id] ? "Integrity verified" : "Hash mismatch"}
                        </span>
                      ) : (
                        <button type="button" className="connect-button secondary small" disabled={busy} onClick={() => verifyEvidence(item.submission_id)}>
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 style={{ fontSize: 14, marginTop: 24 }}>Audit trail</h3>

        {gwAudit.length === 0 ? (
          <p className="connect-muted connect-small">No audit entries.</p>
        ) : (
          <div className="connect-table-wrap">
            <table className="connect-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {gwAudit.map((entry) => (
                  <tr key={entry.audit_id}>
                    <td>{formatDate(entry.created_at)}</td>
                    <td>{entry.action}</td>
                    <td className="connect-muted">{entry.actor.startsWith("user:") ? "Institution user" : entry.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const renderConnect = () => (
    <>
      <section className="connect-card" aria-labelledby="connect-title">
        <div className="connect-eyebrow">BANK INTEGRATION GATEWAY</div>

        <h2 className="connect-section-title" id="connect-title" style={{ marginTop: 6 }}>
          How will your institution connect?
        </h2>

        <p className="connect-muted" style={{ lineHeight: 1.6, marginTop: 0 }}>
          Rebel connects through interfaces the bank controls. It never needs
          the bank's source code or internal databases. Every integration
          starts pending, needs a passing connection test, and collects
          nothing until the institution owner approves it.
        </p>

        {!gwCanManage && (
          <div className="connect-warning">
            Only the institution owner can add, approve or run integrations.
          </div>
        )}

        {!gwEncryption && (
          <div className="connect-error" role="alert">
            Credential encryption is not configured on the server. Credentials
            cannot be saved until REBEL_GATEWAY_ENCRYPTION_KEYS is set.
          </div>
        )}

        {gwError && (
          <div className="connect-error" role="alert">
            {gwError}
          </div>
        )}

        {gwNotice && (
          <div className="connect-info" role="status" style={{ marginTop: 12 }}>
            {gwNotice}
          </div>
        )}

        <div className="connect-grid-2">
          {GATEWAY_METHODS.map((option, index) => (
            <div
              className="connect-card"
              key={option.id}
              style={{ background: "var(--c-card-raised)", boxShadow: "none" }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className="connect-stage-num" aria-hidden="true">
                  {index + 1}
                </div>
                <strong style={{ fontSize: 15 }}>{option.title}</strong>
              </div>

              <p className="connect-muted connect-small" style={{ lineHeight: 1.55 }}>
                {option.summary}
              </p>

              <div className="connect-card-label">What Rebel receives</div>
              <div style={{ margin: "4px 0 12px", fontSize: 13 }}>{option.receives}</div>

              <div className="connect-card-label">Typical use</div>
              <div style={{ margin: "4px 0 12px", fontSize: 13 }}>{option.use}</div>

              <button
                type="button"
                className="connect-button"
                disabled={!gwCanManage}
                onClick={() => startCreate(option.id)}
              >
                Add integration
              </button>
            </div>
          ))}
        </div>
      </section>

      {createMethod && (
        <section className="connect-card" style={{ marginTop: 16 }} aria-labelledby="create-title">
          <h2 className="connect-section-title" id="create-title">
            New {GATEWAY_METHODS.find((m) => m.id === createMethod)?.title}
          </h2>

          <form onSubmit={createIntegration}>
            <label className="connect-label" htmlFor="gw-name">Integration name</label>
            <input
              id="gw-name"
              className="connect-input"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              minLength={2}
              maxLength={120}
              required
              placeholder="e.g. Vestro production API"
            />

            {configFields(createMethod, createForm).map((def) =>
              renderFieldInput(def, createForm, setCreateForm, "gw")
            )}

            <p className="connect-muted connect-small">
              Credentials are added in the next step and are never part of this form.
            </p>

            <div className="connect-actions-row">
              <button className="connect-button" type="submit" disabled={gwBusy === "create"}>
                {gwBusy === "create" ? "Creating…" : "Create integration"}
              </button>

              <button type="button" className="connect-button secondary" onClick={() => setCreateMethod(null)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="connect-card" style={{ marginTop: 16 }} aria-labelledby="integrations-title">
        <h2 className="connect-section-title" id="integrations-title">
          Your integrations
        </h2>

        {integrations.length === 0 ? (
          <div className="connect-empty">
            None yet. Add one above to start collecting evidence.
          </div>
        ) : (
          <ul className="connect-list">
            {integrations.map((integration) => (
              <li key={integration.integration_id}>
                <div>
                  <div className="connect-list-title">{integration.name}</div>

                  <div className="connect-muted connect-small" style={{ marginTop: 4 }}>
                    {GATEWAY_METHODS.find((m) => m.id === integration.method)?.title} ·{" "}
                    {integration.evidence_count} evidence item
                    {integration.evidence_count === 1 ? "" : "s"}
                    {integration.latest_evidence_at && ` · latest ${formatDate(integration.latest_evidence_at)}`}
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    <span className={`connect-status ${GATEWAY_STATUS_CLASS[integration.status] ?? ""}`}>
                      {integration.status.replace("_", " ")}
                    </span>

                    {integration.freshness.status !== "none" && (
                      <span className={`connect-status ${FRESHNESS_CLASS[integration.freshness.status] ?? "optional"}`}>
                        evidence {integration.freshness.status}
                      </span>
                    )}

                    <span className={`connect-status ${integration.last_test.current ? "complete" : "optional"}`}>
                      {integration.last_test.current
                        ? "test passed"
                        : integration.last_test.status === "failed"
                          ? "test failed"
                          : "not tested"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="connect-button secondary small"
                  onClick={() => openIntegration(integration.integration_id)}
                >
                  {openId === integration.integration_id ? "Refresh" : "Manage"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {openId && detail && detail.integration_id === openId && renderIntegrationDetail(detail)}
    </>
  );

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
            htmlFor="intake-target"
          >
            Send to Rebel through
          </label>

          {uploadTargets.length > 0 && gwCanManage ? (
            <select
              id="intake-target"
              className="connect-select"
              value={activeTarget?.integration_id ?? ""}
              onChange={(event) => setSendTarget(event.target.value)}
            >
              {uploadTargets.map((item) => (
                <option
                  key={item.integration_id}
                  value={item.integration_id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="connect-info" id="intake-target">
              {gwCanManage
                ? "No approved file-import integration yet, so files stay in this browser. "
                : "Only the institution owner can send files to Rebel. Files stay in this browser. "}
              {gwCanManage && (
                <>
                  Create one in{" "}
                  <button
                    type="button"
                    className="connect-link"
                    onClick={() => setTab("connect")}
                  >
                    Connect
                  </button>
                  : choose Secure file import, test it, approve it, then
                  come back.
                </>
              )}
            </div>
          )}

          {uploadTargets.length > 0 && gwCanManage && (
            <MapSelect
              targets={mapTargets}
              value={mapKey}
              onChange={setMapKey}
              scope={mapScope}
              onScope={setMapScope}
              disabled={ingesting}
            />
          )}

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

          {sendResults.length > 0 && (
            <ul
              style={{ margin: "12px 0 0", paddingLeft: 18 }}
              role="status"
            >
              {sendResults.map((result) => (
                <li
                  key={result.name}
                  style={{
                    color: result.ok ? "inherit" : "#b45309",
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  <strong>{result.name}</strong>: {result.message}
                  {result.analysis && (
                    <ValidationReportView
                      analysis={result.analysis}
                      stored={result.ok}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="connect-warning">
            {activeTarget && gwCanManage ? (
              <>
                Files are hashed in your browser, listed below as{" "}
                <strong>uploaded documents</strong>, and sent to Rebel
                through <strong>{activeTarget.name}</strong>
                (up to {formatBytes(GATEWAY_MAX_BYTES)}; CSV, JSON,
                JSONL, XML or text; documents up to {formatBytes(DOCUMENT_MAX_BYTES)} when attached to a control). Stored files carry a SHA-256,
                timestamp and freshness status. A manual upload never
                raises a compliance score on its own: only evidence
                Rebel collects itself can score.
              </>
            ) : (
              <>
                Files are hashed and summarised in your browser and
                registered as <strong>uploaded documents</strong>.
                They are not sent to Rebel until a file-import
                integration is approved; nothing here counts as
                verified.
              </>
            )}
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
            void loadIntegrations();
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