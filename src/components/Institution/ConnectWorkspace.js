import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./ConnectWorkspace.css";
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
        help: "Discovered or inferred automatically and not yet confirmed by the institution.",
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
    return `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
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
function analyzeOpenApiObject(doc) {
    const paths = (doc.paths ?? {});
    let endpoints = 0;
    let readOnly = 0;
    for (const methods of Object.values(paths)) {
        if (!methods || typeof methods !== "object")
            continue;
        for (const method of Object.keys(methods)) {
            const normalized = method.toLowerCase();
            if (HTTP_METHODS.includes(normalized)) {
                endpoints += 1;
                if (READ_METHODS.includes(normalized))
                    readOnly += 1;
            }
        }
    }
    const comps = (doc.components ?? {});
    const schemes = (comps.securitySchemes ??
        doc.securityDefinitions ??
        {});
    const auth = Object.values(schemes)
        .map((s) => (s?.scheme ? `${s.type}:${s.scheme}` : s?.type))
        .filter((s) => Boolean(s));
    const version = String(doc.openapi ?? doc.swagger ?? "") || undefined;
    return {
        endpoints,
        readOnly,
        auth: Array.from(new Set(auth)),
        version,
    };
}
function analyzeOpenApiYaml(text) {
    const version = /^(?:openapi|swagger):\s*['"]?([\d.]+)/m.exec(text)?.[1];
    if (!version)
        return null;
    const lines = text.split(/\r?\n/);
    const start = lines.findIndex((line) => /^paths:\s*$/.test(line));
    let endpoints = 0;
    let readOnly = 0;
    if (start >= 0) {
        for (let i = start + 1; i < lines.length; i += 1) {
            const line = lines[i];
            if (line.trim() && !/^\s/.test(line))
                break;
            const match = /^\s{4}(get|post|put|patch|delete|head|options):/i.exec(line);
            if (match) {
                endpoints += 1;
                if (READ_METHODS.includes(match[1].toLowerCase())) {
                    readOnly += 1;
                }
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
                const summary = analyzeOpenApiObject(parsed);
                return {
                    ...base,
                    kind: "spec",
                    domain: "api_inventory",
                    summary: `OpenAPI ${summary.version ?? ""} · ${summary.endpoints} operations (${summary.readOnly} read-only) · ${summary.auth.length
                        ? summary.auth.join(", ")
                        : "no security schemes declared"}`,
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
            const summary = analyzeOpenApiYaml(text);
            if (summary) {
                return {
                    ...base,
                    kind: "spec",
                    domain: "api_inventory",
                    summary: `OpenAPI ${summary.version ?? ""} (YAML, heuristic read) · ${summary.endpoints} operations · ${summary.auth.length
                        ? summary.auth.join(", ")
                        : "no security schemes found"}`,
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
                summary: "Excel workbook registered. Sheet contents are not parsed in the browser.",
                warnings: [
                    "Export to CSV or JSON to enable column and row summaries.",
                ],
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
            warnings: [
                "The file could not be parsed. It is recorded as an unparsed document.",
            ],
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
    return {
        verified: 0,
        document: 0,
        declared: 0,
        unverified: 0,
    };
}
function fingerprintOf(items) {
    return djb2(items
        .map((item) => `${item.provenance}:${item.domain}:${item.id}`)
        .sort()
        .join("|"));
}
function buildReport(items) {
    const totals = emptyCounts();
    items.forEach((item) => {
        totals[item.provenance] += 1;
    });
    const domains = DOMAINS.map((domain) => {
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
        if (mine.length >= 2)
            score = Math.min(1, score + 0.1);
        const gaps = [];
        if (mine.length === 0) {
            gaps.push("No information provided for this area.");
        }
        if (mine.length > 0 && counts.verified === 0) {
            gaps.push("Nothing here has been verified by an institution agent yet.");
        }
        if (mine.length > 0 &&
            counts.document === 0 &&
            counts.verified === 0) {
            gaps.push("Add a supporting document to back up declarations or discoveries.");
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
    const overall = Math.round((domains.reduce((sum, domain) => sum + domain.score, 0) /
        domains.length) *
        100);
    const limitations = [
        "This is a preliminary, self-reported assessment. It is not an attestation, audit opinion or regulatory submission.",
        "Scores reflect how much information exists and how well it is substantiated, not whether controls are effective.",
    ];
    if (totals.verified === 0) {
        limitations.push("No verified evidence has been submitted. Every finding rests on documents, declarations or unverified discovery.");
    }
    if (totals.declared > 0) {
        limitations.push(`${totals.declared} manual declaration${totals.declared === 1 ? "" : "s"} included without supporting artifacts.`);
    }
    if (totals.unverified > 0) {
        limitations.push(`${totals.unverified} item${totals.unverified === 1 ? "" : "s"} came from automated discovery and have not been confirmed by the institution.`);
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
function reportToMarkdown(report, institution, items) {
    const lines = [];
    lines.push("# Preliminary compliance readiness report");
    lines.push("");
    lines.push(`**Institution:** ${institution.name} (${institution.jurisdiction})`);
    lines.push(`**Institution ID:** ${institution.institution_id}`);
    lines.push(`**Generated:** ${new Date(report.generatedAt).toLocaleString()}`);
    lines.push(`**Overall evidence readiness:** ${report.overall}%`);
    lines.push("");
    lines.push("> Preliminary and self-reported. Not an attestation or audit opinion.");
    lines.push("");
    lines.push("## Evidence by provenance");
    PROVENANCE_ORDER.forEach((p) => {
        lines.push(`- ${PROVENANCE[p].label}: ${report.totals[p]}`);
    });
    lines.push("");
    lines.push("## Coverage by area");
    report.domains.forEach((domain) => {
        lines.push(`### ${domain.label} — ${LEVEL_LABEL[domain.level]} (${Math.round(domain.score * 100)}%)`);
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
        lines.push(`- [${PROVENANCE[item.provenance].short}] ${item.title} — ${item.source} (${formatDate(item.at)})`);
    });
    lines.push("");
    lines.push("## Limitations");
    report.limitations.forEach((limitation) => {
        lines.push(`- ${limitation}`);
    });
    return lines.join("\n");
}
function downloadBlob(name, content, type) {
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
function statusOf(progress) {
    if (progress >= 100)
        return "complete";
    if (progress > 0)
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
/* Small presentational components                                     */
/* ------------------------------------------------------------------ */
function ProvBadge({ p }) {
    return (_jsx("span", { className: `connect-prov ${p}`, title: PROVENANCE[p].help, children: PROVENANCE[p].short }));
}
function ProgressBar({ value }) {
    return (_jsx("div", { className: `connect-bar ${value >= 100 ? "done" : ""}`, role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(value), children: _jsx("span", { style: {
                width: `${Math.max(0, Math.min(100, value))}%`,
            } }) }));
}
function ProvenanceStack({ counts, }) {
    const total = PROVENANCE_ORDER.reduce((sum, provenance) => sum + counts[provenance], 0);
    if (total === 0) {
        return _jsx("div", { className: "connect-bar" });
    }
    return (_jsx("div", { className: "connect-bar stack", "aria-label": "Evidence provenance breakdown", children: PROVENANCE_ORDER.map((p) => counts[p] > 0 ? (_jsx("span", { className: `connect-seg ${p}`, style: { width: `${(counts[p] / total) * 100}%` }, title: `${PROVENANCE[p].label}: ${counts[p]}` }, p)) : null) }));
}
function DomainSelect({ id, value, onChange, }) {
    return (_jsx("select", { id: id, className: "connect-select", value: value, onChange: (event) => onChange(event.target.value), children: DOMAINS.map((domain) => (_jsx("option", { value: domain.id, children: domain.label }, domain.id))) }));
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
    // This data remains browser-local until server persistence endpoints exist.
    const [store, setStore] = useState(EMPTY_STORE);
    const [hydratedInstitutionId, setHydratedInstitutionId] = useState(null);
    const institutionId = workspace?.institution.institution_id ?? null;
    // Evidence intake state
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
            setStore(EMPTY_STORE);
            setHydratedInstitutionId(null);
            return;
        }
        setHydratedInstitutionId(null);
        try {
            const raw = localStorage.getItem(storeKey(institutionId));
            const saved = raw
                ? JSON.parse(raw)
                : {};
            setStore({
                ...EMPTY_STORE,
                ...saved,
                selected: Array.isArray(saved.selected) ? saved.selected : [],
                files: Array.isArray(saved.files) ? saved.files : [],
                declarations: Array.isArray(saved.declarations)
                    ? saved.declarations
                    : [],
            });
        }
        catch {
            setStore(EMPTY_STORE);
        }
        setHydratedInstitutionId(institutionId);
    }, [institutionId]);
    useEffect(() => {
        if (!institutionId ||
            hydratedInstitutionId !== institutionId) {
            return;
        }
        try {
            localStorage.setItem(storeKey(institutionId), JSON.stringify(store));
        }
        catch {
            // Storage may be unavailable or full; current in-memory work remains.
        }
    }, [store, institutionId, hydratedInstitutionId]);
    const patchStore = useCallback((patch) => {
        setStore((current) => ({
            ...current,
            ...patch,
        }));
    }, []);
    /* ---------------- server calls ---------------- */
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
            setError(err instanceof Error
                ? err.message
                : "Connect service unavailable.");
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
            setError(err instanceof Error
                ? err.message
                : "Workspace creation failed.");
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
                    institution_id: institutionId,
                    // Preserve the complete URL path.
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
            setDiscoveryError(err instanceof Error
                ? err.message
                : "API discovery failed.");
        }
        finally {
            setDiscovering(false);
        }
    };
    const toggleEndpoint = (key) => {
        setStore((current) => ({
            ...current,
            selected: current.selected.includes(key)
                ? current.selected.filter((item) => item !== key)
                : [...current.selected, key],
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
        for (const file of files) {
            if (file.size > MAX_FILE_BYTES) {
                rejected.push(`${file.name} exceeds ${formatBytes(MAX_FILE_BYTES)}`);
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
        const messages = [];
        if (added.length) {
            messages.push(`${added.length} file${added.length === 1 ? "" : "s"} registered.`);
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
    const onDrop = (event) => {
        event.preventDefault();
        setDragOver(false);
        void handleFiles(event.dataTransfer.files);
    };
    const onPick = (event) => {
        if (event.target.files) {
            void handleFiles(event.target.files);
        }
    };
    const addDeclaration = (event) => {
        event.preventDefault();
        const statement = declStatement.trim();
        if (statement.length < 10)
            return;
        const declaration = {
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
    const removeLocal = (item) => {
        if (!item.removeId)
            return;
        setStore((current) => item.removeKind === "file"
            ? {
                ...current,
                files: current.files.filter((file) => file.id !== item.removeId),
            }
            : {
                ...current,
                declarations: current.declarations.filter((declaration) => declaration.id !== item.removeId),
            });
    };
    /* ---------------- derived evidence register ---------------- */
    const items = useMemo(() => {
        if (!workspace)
            return [];
        const output = [];
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
                provenance: "document",
                source: `${file.name} · ${formatBytes(file.size)}`,
                at: file.addedAt,
                removable: true,
                removeKind: "file",
                removeId: file.id,
            };
            output.push({
                ...common,
                id: `f-${file.id}`,
                domain: file.domain,
                title: file.kind === "spec"
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
                output.push({
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
                output.push({
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
        return output;
    }, [workspace, store]);
    const stableItems = useMemo(() => items, [items]);
    const domainStats = useMemo(() => {
        return DOMAINS.map((domain) => {
            const mine = stableItems.filter((item) => item.domain === domain.id);
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
    const domainsCovered = domainStats.filter((domain) => domain.total > 0).length;
    const totals = useMemo(() => {
        const result = emptyCounts();
        stableItems.forEach((item) => {
            result[item.provenance] += 1;
        });
        return result;
    }, [stableItems]);
    /* ---------------- stages, issues and actions ---------------- */
    const hasSystems = Boolean(discovery && discovery.endpoints.length > 0) ||
        store.files.some((file) => file.kind === "spec");
    const stages = useMemo(() => {
        if (!workspace)
            return [];
        const metrics = workspace.metrics;
        const systemsProgress = hasSystems
            ? 100
            : discovery
                ? 40
                : 0;
        const evidenceProgress = Math.round((domainsCovered / DOMAINS.length) * 100);
        let verifyProgress = 0;
        if (metrics.agents_total > 0)
            verifyProgress += 40;
        if (metrics.agents_active > 0)
            verifyProgress += 30;
        if (metrics.evidence_total > 0)
            verifyProgress += 30;
        const reportProgress = store.report
            ? 100
            : stableItems.length > 0
                ? 50
                : 0;
        const makeStage = (id, title, description, weight, progress, detail, stageTab) => ({
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
            makeStage("institution", "Institution profile", "Name and jurisdiction registered. Everything else can follow incrementally.", 10, 100, `${workspace.institution.name} · ${workspace.institution.jurisdiction}`, "overview"),
            makeStage("systems", "Identify systems", "Discover APIs from a portal or gateway, or upload an OpenAPI specification.", 25, systemsProgress, hasSystems
                ? "System inventory source available."
                : discovery
                    ? "Discovery ran but found no endpoints. Try a direct spec URL or upload a specification."
                    : "No discovery run and no specification uploaded.", "discover"),
            makeStage("evidence", "Provide evidence", "Upload documents and data, or declare facts manually. Cover each compliance area.", 30, evidenceProgress, `${domainsCovered} of ${DOMAINS.length} compliance areas have at least one item.`, "evidence"),
            makeStage("verify", "Verify with agents", "Provision an institution agent so declarations can be backed by verified submissions.", 20, verifyProgress, `${metrics.agents_total} agent${metrics.agents_total === 1 ? "" : "s"} · ${metrics.agents_active} active · ${metrics.evidence_total} verified submission${metrics.evidence_total === 1 ? "" : "s"}`, "agents"),
            makeStage("report", "Preliminary report", "Generate a readiness report from whatever exists today. Regenerate as evidence improves.", 15, reportProgress, store.report
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
        const totalWeight = weighted.reduce((sum, stage) => sum + stage.weight, 0) || 1;
        return Math.round(weighted.reduce((sum, stage) => sum + stage.progress * stage.weight, 0) / totalWeight);
    }, [stages]);
    const reportStale = Boolean(store.report &&
        store.report.fingerprint !== fingerprintOf(stableItems));
    const issues = useMemo(() => {
        if (!workspace)
            return [];
        const list = [];
        const metrics = workspace.metrics;
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
        if (metrics.agents_total === 0) {
            list.push({
                id: "no-agent",
                severity: "warning",
                title: "No agent provisioned",
                detail: "Without an agent, nothing can be verified. Reports will rest on documents and declarations.",
                tab: "agents",
            });
        }
        else if (metrics.agents_active === 0) {
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
    }, [
        workspace,
        stableItems.length,
        discovery,
        reportStale,
    ]);
    const missingDomains = domainStats
        .filter((domain) => domain.total === 0)
        .map((domain) => domain.domain);
    const unverifiedDomains = domainStats.filter((domain) => domain.total > 0 && domain.counts.verified === 0).length;
    const actions = useMemo(() => {
        if (!workspace)
            return [];
        const metrics = workspace.metrics;
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
                    .map((domain) => domain.label)
                    .join(" and ")}${missingDomains.length > 2
                    ? ` (+${missingDomains.length - 2} more)`
                    : ""}`,
                detail: "A short declaration is enough to start. Back it with a document later.",
                tab: "evidence",
                cta: "Add evidence",
            });
        }
        if (stableItems.length > 0 &&
            (!store.report || reportStale)) {
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
                detail: "Agents submit evidence that Rebel can verify with integrity hashes.",
                tab: "agents",
                cta: "View agents",
            });
        }
        else if (metrics.evidence_total === 0) {
            list.push({
                id: "submit",
                title: "Submit evidence through an agent",
                detail: "Verified submissions raise confidence beyond declarations and documents.",
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
        if (!store.report || !workspace)
            return;
        downloadBlob(`rebel-preliminary-report-${new Date(store.report.generatedAt)
            .toISOString()
            .slice(0, 10)}.md`, reportToMarkdown(store.report, workspace.institution, stableItems), "text/markdown");
    };
    const exportJson = () => {
        if (!store.report || !workspace)
            return;
        downloadBlob(`rebel-preliminary-report-${new Date(store.report.generatedAt)
            .toISOString()
            .slice(0, 10)}.json`, JSON.stringify({
            institution: workspace.institution,
            report: store.report,
            evidence: stableItems,
        }, null, 2), "application/json");
    };
    /* ---------------- render helpers ---------------- */
    const visibleItems = filter === "all"
        ? stableItems
        : stableItems.filter((item) => item.provenance === filter);
    const domainLabel = (id) => DOMAINS.find((domain) => domain.id === id)?.label ??
        "Unclassified";
    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "discover", label: "Discover APIs" },
        {
            id: "evidence",
            label: "Evidence",
            count: stableItems.length,
        },
        { id: "report", label: "Report" },
        { id: "agents", label: "Agents & verification" },
    ];
    const renderStages = () => (_jsxs("section", { className: "connect-card", "aria-labelledby": "stages-title", children: [_jsx("h2", { className: "connect-section-title", id: "stages-title", children: "Onboarding stages" }), stages.map((stage, index) => (_jsxs("div", { className: "connect-stage", children: [_jsx("div", { className: `connect-stage-num ${stage.status}`, "aria-hidden": "true", children: stage.status === "complete" ? "✓" : index + 1 }), _jsxs("div", { className: "connect-stage-body", children: [_jsx("div", { className: "connect-stage-title", children: stage.title }), _jsx("div", { className: "connect-muted connect-small", style: { marginTop: 3, lineHeight: 1.5 }, children: stage.description }), _jsx("div", { className: "connect-small", style: { marginTop: 6 }, children: stage.detail }), stage.status !== "optional" && (_jsx(ProgressBar, { value: stage.progress }))] }), _jsxs("div", { className: "connect-stage-side", children: [stage.status !== "optional" && (_jsxs("span", { className: "connect-pct", children: [stage.progress, "%"] })), _jsx("span", { className: `connect-status ${stage.status}`, children: STATUS_LABEL[stage.status] }), stage.id !== "institution" && (_jsx("button", { type: "button", className: "connect-button secondary small", onClick: () => setTab(stage.tab), children: stage.status === "optional"
                                    ? "Learn more"
                                    : "Open" }))] })] }, stage.id)))] }));
    const renderOverview = () => (_jsxs(_Fragment, { children: [_jsxs("section", { className: "connect-card connect-hero", children: [_jsx("div", { className: "connect-ring", style: { ["--p"]: overall }, role: "img", "aria-label": `Overall onboarding ${overall} percent complete`, children: _jsx("div", { className: "connect-ring-inner", children: _jsxs("div", { children: [_jsxs("div", { className: "connect-ring-value", children: [overall, "%"] }), _jsx("div", { className: "connect-ring-label", children: "onboarded" })] }) }) }), _jsxs("div", { children: [_jsx("div", { className: "connect-eyebrow", children: "ACTIVE INSTITUTION" }), _jsx("h2", { style: { fontSize: 23, margin: "9px 0" }, children: workspace?.institution.name }), _jsxs("div", { className: "connect-muted", children: [workspace?.institution.jurisdiction, " · ", workspace?.institution.role] }), _jsxs("div", { className: "connect-muted", style: { fontSize: 11, marginTop: 8 }, children: ["Institution ID:", " ", workspace?.institution.institution_id] }), _jsx("p", { className: "connect-muted connect-small", style: {
                                    marginTop: 12,
                                    lineHeight: 1.55,
                                    maxWidth: 560,
                                }, children: "You do not need live API access to begin. Provide what you have today and Rebel produces a preliminary report that improves as evidence is verified." })] })] }), _jsxs("div", { className: "connect-grid-2", children: [_jsxs("section", { className: "connect-card", "aria-labelledby": "next-title", children: [_jsx("h2", { className: "connect-section-title", id: "next-title", children: "Next steps" }), actions.length === 0 ? (_jsx("div", { className: "connect-empty", children: "All current steps are done. Keep the report fresh as evidence changes." })) : (_jsx("ul", { className: "connect-list", children: actions.map((action) => (_jsxs("li", { children: [_jsxs("div", { children: [_jsx("div", { className: "connect-list-title", children: action.title }), _jsx("div", { className: "connect-muted connect-small", style: { marginTop: 3 }, children: action.detail })] }), _jsx("button", { type: "button", className: "connect-button small", onClick: () => setTab(action.tab), children: action.cta })] }, action.id))) }))] }), _jsxs("section", { className: "connect-card", "aria-labelledby": "blockers-title", children: [_jsx("h2", { className: "connect-section-title", id: "blockers-title", children: "Blockers & warnings" }), issues.length === 0 ? (_jsx("div", { className: "connect-empty", children: "Nothing is blocking progress." })) : (_jsx("ul", { className: "connect-list", children: issues.map((issue) => (_jsxs("li", { children: [_jsxs("div", { style: { display: "flex", gap: 10 }, children: [_jsx("span", { className: `connect-issue-tag ${issue.severity}`, children: issue.severity }), _jsxs("div", { children: [_jsx("div", { className: "connect-list-title", children: issue.title }), _jsx("div", { className: "connect-muted connect-small", style: { marginTop: 3 }, children: issue.detail })] })] }), issue.tab && (_jsx("button", { type: "button", className: "connect-button secondary small", onClick: () => setTab(issue.tab), children: "Resolve" }))] }, issue.id))) }))] })] }), _jsxs("div", { className: "connect-grid-2", children: [_jsxs("section", { className: "connect-card", "aria-labelledby": "missing-title", children: [_jsx("h2", { className: "connect-section-title", id: "missing-title", children: "Missing information" }), domainStats.map(({ domain, counts, total }) => (_jsxs("div", { className: "connect-domain-row", children: [_jsxs("div", { className: "connect-domain-head", children: [_jsx("strong", { style: { fontSize: 13 }, children: domain.label }), _jsx("span", { className: "connect-muted connect-small", children: total === 0
                                                    ? "Nothing provided"
                                                    : `${total} item${total === 1 ? "" : "s"}` })] }), _jsx(ProvenanceStack, { counts: counts }), total === 0 && (_jsx("div", { className: "connect-muted connect-small", style: { marginTop: 6 }, children: domain.hint }))] }, domain.id))), _jsx("div", { className: "connect-muted connect-small", style: { marginTop: 10 }, children: unverifiedDomains > 0
                                    ? `${unverifiedDomains} covered area${unverifiedDomains === 1 ? " has" : "s have"} no verified evidence yet.`
                                    : "All covered areas include verified evidence." })] }), _jsxs("section", { className: "connect-card", "aria-labelledby": "prov-title", children: [_jsx("h2", { className: "connect-section-title", id: "prov-title", children: "Evidence quality" }), _jsx(ProvenanceStack, { counts: totals }), _jsx("div", { className: "connect-legend", children: PROVENANCE_ORDER.map((p) => (_jsxs("div", { className: "connect-legend-item", children: [_jsx(ProvBadge, { p: p }), " ", _jsx("strong", { style: { color: "var(--c-text)" }, children: totals[p] }), _jsx("div", { children: PROVENANCE[p].help })] }, p))) })] })] }), renderStages()] }));
    const renderDiscover = () => (_jsxs("section", { className: "connect-card", "aria-labelledby": "disc-title", children: [_jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                }, children: [_jsxs("div", { children: [_jsx("div", { className: "connect-eyebrow", children: "SYSTEM INTEGRATION" }), _jsx("h2", { className: "connect-section-title", id: "disc-title", style: { marginTop: 6, marginBottom: 0 }, children: "Discover Banking APIs" })] }), _jsx("span", { className: "connect-status", children: "API discovery" })] }), _jsxs("p", { className: "connect-muted", style: { lineHeight: 1.6 }, children: ["Enter an institution's banking portal, API gateway, or a direct OpenAPI/Swagger specification URL. Rebel will inspect accessible API documentation and identify potential read-only data endpoints. No public URL? Upload a specification on the", " ", _jsx("button", { type: "button", className: "connect-button link", style: {
                            color: "var(--c-accent)",
                            padding: 0,
                        }, onClick: () => setTab("evidence"), children: "Evidence tab" }), "."] }), _jsxs("form", { onSubmit: discoverAPIs, children: [_jsx("label", { className: "connect-label", htmlFor: "bank-source-url", children: "Banking portal URL or direct OpenAPI specification URL" }), _jsxs("div", { className: "connect-discovery-input", children: [_jsx("input", { id: "bank-source-url", className: "connect-input", type: "url", value: sourceUrl, onChange: (event) => setSourceUrl(event.target.value), placeholder: "https://bank.example.com/openapi.json", required: true }), _jsx("button", { className: "connect-button", type: "submit", disabled: discovering, children: discovering ? "Discovering..." : "Discover APIs" })] })] }), _jsxs("div", { className: "connect-info", style: { marginTop: 16 }, children: [_jsx("strong", { children: "Read-only discovery:" }), " Rebel inspects accessible API documentation and permitted metadata. Discovery will not initiate payments, modify accounts or execute administrative operations. Results are recorded as ", _jsx(ProvBadge, { p: "unverified" }), " until confirmed."] }), discoveryError && (_jsx("div", { className: "connect-error", role: "alert", children: discoveryError })), discovery && (_jsxs("div", { className: "connect-discovery-result", children: [_jsx("h3", { className: "connect-section-title", children: "Discovery results" }), _jsxs("div", { className: "connect-muted", children: ["Target: ", discovery.target_url] }), discovery.discovery_mode && (_jsxs("div", { className: "connect-muted", style: { marginTop: 6 }, children: ["Discovery mode: ", discovery.discovery_mode] })), discovery.validated_origin && (_jsxs("div", { className: "connect-muted", style: { marginTop: 6 }, children: ["Validated origin: ", discovery.validated_origin] })), _jsx("div", { style: { marginTop: 12 }, children: _jsx("span", { className: `connect-status ${discovery.reachable ? "active" : ""}`, children: discovery.reachable
                                ? "Host reachable"
                                : "Host not reachable" }) }), _jsx("h3", { style: { fontSize: 14, marginTop: 20 }, children: "API documentation" }), discovery.documentation_urls.length === 0 ? (_jsx("p", { className: "connect-muted", children: "No API documentation was discovered." })) : (discovery.documentation_urls.map((url) => (_jsx("a", { className: "connect-doc-link", href: url, target: "_blank", rel: "noopener noreferrer", children: url }, url)))), _jsx("h3", { style: { fontSize: 14, marginTop: 20 }, children: "Authentication methods" }), _jsx("p", { className: "connect-muted", children: discovery.authentication_methods.length
                            ? discovery.authentication_methods.join(", ")
                            : "Not determined" }), _jsx("h3", { style: { fontSize: 14, marginTop: 20 }, children: "Discovered endpoints" }), discovery.endpoints.length === 0 ? (_jsx("p", { className: "connect-muted", children: "No endpoints have been identified yet." })) : (discovery.endpoints.map((endpoint) => {
                        const key = `${endpoint.method.toUpperCase()}:${endpoint.path}`;
                        return (_jsxs("label", { className: "connect-endpoint", children: [_jsx("input", { type: "checkbox", checked: selectedEndpoints.includes(key), disabled: !endpoint.read_only, onChange: () => toggleEndpoint(key) }), _jsx("span", { className: "connect-method", children: endpoint.method.toUpperCase() }), _jsxs("span", { children: [_jsx("div", { className: "connect-endpoint-path", children: endpoint.path }), _jsx("div", { className: "connect-muted", children: endpoint.description ||
                                                endpoint.category ||
                                                "No description available" }), !endpoint.read_only && (_jsx("div", { className: "connect-muted", style: { fontSize: 11 }, children: "Not eligible for read-only selection" }))] })] }, key));
                    })), discovery.warnings.map((warning, index) => (_jsx("div", { className: "connect-warning", children: warning }, index))), _jsxs("p", { className: "connect-muted", style: { marginTop: 15 }, children: ["Selected read-only endpoints:", " ", selectedEndpoints.length] }), _jsx("div", { className: "connect-info", children: "Endpoint selection is currently a discovery preview. Connection approval, authentication configuration and evidence collection will be implemented as the next integration stage. Selections are saved in this browser for this institution." }), _jsxs("div", { className: "connect-actions-row", children: [_jsx("button", { type: "button", className: "connect-button", onClick: () => setTab("report"), children: "Continue to report" }), _jsx("button", { type: "button", className: "connect-button secondary", onClick: () => setTab("evidence"), children: "Add more evidence" })] })] }))] }));
    const renderEvidence = () => (_jsxs(_Fragment, { children: [_jsxs("div", { className: "connect-grid-2", children: [_jsxs("section", { className: "connect-card", "aria-labelledby": "upload-title", children: [_jsx("h2", { className: "connect-section-title", id: "upload-title", children: "Upload documents or data" }), _jsx("label", { className: "connect-label", htmlFor: "intake-domain", children: "Applies to" }), _jsx(DomainSelect, { id: "intake-domain", value: intakeDomain, onChange: setIntakeDomain }), _jsxs("div", { className: `connect-dropzone ${dragOver ? "over" : ""}`, role: "button", tabIndex: 0, "aria-label": "Upload files", onClick: () => fileInput.current?.click(), onKeyDown: (event) => {
                                    if (event.key === "Enter" ||
                                        event.key === " ") {
                                        event.preventDefault();
                                        fileInput.current?.click();
                                    }
                                }, onDragOver: (event) => {
                                    event.preventDefault();
                                    setDragOver(true);
                                }, onDragLeave: () => setDragOver(false), onDrop: onDrop, children: [_jsx("strong", { children: ingesting
                                            ? "Processing…"
                                            : "Drop files here or click to browse" }), _jsxs("span", { className: "connect-muted connect-small", children: ["Up to ", formatBytes(MAX_FILE_BYTES), " each. OpenAPI files are detected automatically."] }), _jsx("div", { className: "connect-file-types", children: [
                                            "OpenAPI JSON/YAML",
                                            "PDF",
                                            "CSV",
                                            "Excel",
                                            "JSON",
                                        ].map((type) => (_jsx("span", { className: "connect-file-type", children: type }, type))) })] }), _jsx("input", { ref: fileInput, type: "file", multiple: true, accept: ACCEPT, onChange: onPick, style: { display: "none" } }), intakeNotice && (_jsx("div", { className: "connect-info", style: { marginTop: 12 }, role: "status", children: intakeNotice })), _jsxs("div", { className: "connect-warning", children: ["Files are hashed and summarised in your browser and registered as ", _jsx("strong", { children: "uploaded documents" }), ". Transmission to Rebel will be enabled when the evidence upload API is available; nothing here counts as verified."] })] }), _jsxs("section", { className: "connect-card", "aria-labelledby": "decl-title", children: [_jsx("h2", { className: "connect-section-title", id: "decl-title", children: "Declare manually" }), _jsx("p", { className: "connect-muted connect-small", style: { marginTop: -6, lineHeight: 1.55 }, children: "No document handy? State what you know. Declarations are labelled as such in every report." }), _jsxs("form", { onSubmit: addDeclaration, children: [_jsx("label", { className: "connect-label", htmlFor: "decl-domain", children: "Compliance area" }), _jsx(DomainSelect, { id: "decl-domain", value: declDomain, onChange: setDeclDomain }), _jsx("label", { className: "connect-label", htmlFor: "decl-statement", children: "Statement" }), _jsx("textarea", { id: "decl-statement", className: "connect-textarea", value: declStatement, onChange: (event) => setDeclStatement(event.target.value), placeholder: "e.g. All customer-facing APIs require OAuth 2.0 with mutual TLS.", minLength: 10, maxLength: 1000, required: true }), _jsx("label", { className: "connect-label", htmlFor: "decl-by", children: "Declared by (optional)" }), _jsx("input", { id: "decl-by", className: "connect-input", value: declBy, onChange: (event) => setDeclBy(event.target.value), placeholder: "Name or role", maxLength: 100 }), _jsx("button", { className: "connect-button", type: "submit", disabled: declStatement.trim().length < 10, children: "Add declaration" })] })] })] }), _jsxs("section", { className: "connect-card", style: { marginTop: 16 }, "aria-labelledby": "register-title", children: [_jsx("h2", { className: "connect-section-title", id: "register-title", children: "Evidence register" }), _jsxs("div", { className: "connect-chips", role: "group", "aria-label": "Filter by provenance", children: [_jsxs("button", { type: "button", className: "connect-chip", "aria-pressed": filter === "all", onClick: () => setFilter("all"), children: ["All (", stableItems.length, ")"] }), PROVENANCE_ORDER.map((p) => (_jsxs("button", { type: "button", className: "connect-chip", "aria-pressed": filter === p, onClick: () => setFilter(p), children: [PROVENANCE[p].label, " (", totals[p], ")"] }, p)))] }), visibleItems.length === 0 ? (_jsx("div", { className: "connect-empty", children: stableItems.length === 0
                            ? "Nothing yet. Upload a file, add a declaration or run API discovery."
                            : "No items match this filter." })) : (_jsx("div", { className: "connect-table-wrap", children: _jsxs("table", { className: "connect-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Provenance" }), _jsx("th", { children: "Area" }), _jsx("th", { children: "Item" }), _jsx("th", { children: "Source" }), _jsx("th", { children: "Recorded" }), _jsx("th", {})] }) }), _jsx("tbody", { children: visibleItems.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx(ProvBadge, { p: item.provenance }) }), _jsx("td", { children: domainLabel(item.domain) }), _jsxs("td", { style: { maxWidth: 380 }, children: [_jsx("strong", { children: item.title }), item.detail && (_jsx("div", { className: "connect-muted connect-small", style: {
                                                            marginTop: 3,
                                                            overflowWrap: "anywhere",
                                                        }, children: item.detail }))] }), _jsx("td", { className: "connect-muted", children: item.source }), _jsx("td", { className: "connect-muted", children: formatDate(item.at) }), _jsx("td", { children: item.removable && (_jsx("button", { type: "button", className: "connect-button link", onClick: () => removeLocal(item), children: "Remove" })) })] }, item.id))) })] }) }))] })] }));
    const renderReport = () => {
        const report = store.report;
        return (_jsxs(_Fragment, { children: [_jsxs("section", { className: "connect-card", "aria-labelledby": "report-title", children: [_jsx("div", { className: "connect-eyebrow", children: "COMPLIANCE ASSESSMENT" }), _jsx("h2", { className: "connect-section-title", id: "report-title", style: { marginTop: 6 }, children: "Preliminary readiness report" }), _jsx("p", { className: "connect-muted", style: { lineHeight: 1.6, marginTop: 0 }, children: "Built from everything on the Evidence tab. It does not require sandbox access or live API integration, and each finding shows how well it is substantiated." }), _jsxs("div", { className: "connect-actions-row connect-no-print", children: [_jsx("button", { type: "button", className: "connect-button", onClick: generateReport, disabled: stableItems.length === 0, children: report
                                        ? "Regenerate report"
                                        : "Generate preliminary report" }), report && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "connect-button secondary", onClick: exportMarkdown, children: "Download Markdown" }), _jsx("button", { type: "button", className: "connect-button secondary", onClick: exportJson, children: "Download JSON" }), _jsx("button", { type: "button", className: "connect-button secondary", onClick: () => window.print(), children: "Print" })] }))] }), stableItems.length === 0 && (_jsx("div", { className: "connect-warning", children: "Add at least one document, declaration or discovery result to enable generation." })), reportStale && (_jsx("div", { className: "connect-warning", role: "status", children: "Evidence has changed since this report was generated. Regenerate to include the latest items." }))] }), report && workspace && (_jsxs("section", { className: "connect-card", "aria-label": "Report preview", children: [_jsxs("div", { className: "connect-hero", children: [_jsx("div", { className: "connect-ring", style: {
                                        ["--p"]: report.overall,
                                    }, role: "img", "aria-label": `Evidence readiness ${report.overall} percent`, children: _jsx("div", { className: "connect-ring-inner", children: _jsxs("div", { children: [_jsxs("div", { className: "connect-ring-value", children: [report.overall, "%"] }), _jsx("div", { className: "connect-ring-label", children: "readiness" })] }) }) }), _jsxs("div", { children: [_jsx("h3", { style: { margin: 0, fontSize: 18 }, children: workspace.institution.name }), _jsxs("div", { className: "connect-muted connect-small", style: { marginTop: 4 }, children: ["Generated ", formatDate(report.generatedAt), " \u00B7", " ", workspace.institution.jurisdiction] }), _jsx("div", { style: {
                                                marginTop: 12,
                                                display: "flex",
                                                gap: 8,
                                                flexWrap: "wrap",
                                            }, children: PROVENANCE_ORDER.map((p) => (_jsxs("span", { className: `connect-prov ${p}`, children: [PROVENANCE[p].short, ": ", report.totals[p]] }, p))) })] })] }), _jsx("h3", { style: { fontSize: 15, marginTop: 26 }, children: "Coverage by area" }), report.domains.map((domain) => (_jsxs("div", { className: "connect-domain-row", children: [_jsxs("div", { className: "connect-domain-head", children: [_jsx("strong", { style: { fontSize: 14 }, children: domain.label }), _jsxs("span", { className: `connect-level ${domain.level}`, children: [LEVEL_LABEL[domain.level], " \u00B7", " ", Math.round(domain.score * 100), "%"] })] }), _jsx(ProvenanceStack, { counts: domain.counts }), _jsx("div", { style: {
                                        display: "flex",
                                        gap: 6,
                                        flexWrap: "wrap",
                                        marginTop: 8,
                                    }, children: PROVENANCE_ORDER.filter((p) => domain.counts[p] > 0).map((p) => (_jsxs("span", { className: `connect-prov ${p}`, children: [PROVENANCE[p].short, " \u00D7", domain.counts[p]] }, p))) }), domain.gaps.map((gap) => (_jsxs("div", { className: "connect-muted connect-small", style: { marginTop: 6 }, children: ["\u2022 ", gap] }, gap)))] }, domain.id))), _jsx("h3", { style: { fontSize: 15, marginTop: 26 }, children: "Limitations" }), _jsx("ul", { style: {
                                margin: 0,
                                paddingLeft: 18,
                                lineHeight: 1.7,
                                fontSize: 13,
                            }, children: report.limitations.map((limitation) => (_jsx("li", { children: limitation }, limitation))) })] }))] }));
    };
    const renderAgents = () => {
        if (!workspace)
            return null;
        return (_jsxs(_Fragment, { children: [_jsxs("section", { className: "connect-grid-3", children: [_jsxs("div", { className: "connect-card", children: [_jsx("div", { className: "connect-card-label", children: "Registered agents" }), _jsx("div", { className: "connect-metric", children: workspace.metrics.agents_total })] }), _jsxs("div", { className: "connect-card", children: [_jsx("div", { className: "connect-card-label", children: "Active agents" }), _jsx("div", { className: "connect-metric", children: workspace.metrics.agents_active })] }), _jsxs("div", { className: "connect-card", children: [_jsx("div", { className: "connect-card-label", children: "Evidence submissions" }), _jsx("div", { className: "connect-metric", children: workspace.metrics.evidence_total })] })] }), _jsxs("section", { className: "connect-card", children: [_jsx("h2", { className: "connect-section-title", children: "Connected agents" }), workspace.agents.length === 0 ? (_jsx("div", { className: "connect-muted", children: "No agents have been provisioned for this institution yet." })) : (_jsx("div", { className: "connect-table-wrap", children: _jsxs("table", { className: "connect-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Agent" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Created" }), _jsx("th", { children: "Last heartbeat" })] }) }), _jsx("tbody", { children: workspace.agents.map((agent) => (_jsxs("tr", { children: [_jsxs("td", { children: [_jsx("strong", { children: agent.name }), _jsx("div", { className: "connect-muted", style: { fontSize: 10 }, children: agent.agent_id })] }), _jsx("td", { children: _jsx("span", { className: `connect-status ${agent.status === "active"
                                                            ? "active"
                                                            : ""}`, children: agent.status }) }), _jsx("td", { children: formatDate(agent.created_at) }), _jsx("td", { children: agent.last_seen_at
                                                        ? formatDate(agent.last_seen_at)
                                                        : "Never" })] }, agent.agent_id))) })] }) }))] }), _jsxs("section", { className: "connect-card", children: [_jsxs("h2", { className: "connect-section-title", children: ["Recent evidence ", _jsx(ProvBadge, { p: "verified" })] }), workspace.recent_evidence.length === 0 ? (_jsx("div", { className: "connect-muted", children: "No evidence has been received. Once an institution agent submits evidence, its source, type, timestamp and integrity hash will appear here." })) : (_jsx("div", { className: "connect-table-wrap", children: _jsxs("table", { className: "connect-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Source" }), _jsx("th", { children: "Evidence type" }), _jsx("th", { children: "Received" }), _jsx("th", { children: "Integrity hash" })] }) }), _jsx("tbody", { children: workspace.recent_evidence.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.source_system }), _jsx("td", { children: item.evidence_type }), _jsx("td", { children: formatDate(item.received_at) }), _jsx("td", { className: "connect-hash", children: item.payload_sha256 })] }, item.submission_id))) })] }) }))] }), _jsxs("section", { className: "connect-card", children: [_jsx("h2", { className: "connect-section-title", children: "Sandbox & automated collection" }), _jsxs("div", { className: "connect-planned", children: [_jsx("span", { className: "connect-status optional", children: "Planned" }), _jsxs("p", { style: {
                                        lineHeight: 1.6,
                                        margin: "10px 0 0",
                                        fontSize: 13,
                                    }, children: ["When Vestro sandbox credentials are available, approved read-only endpoints from discovery become scheduled collectors. Their submissions arrive as", " ", _jsx(ProvBadge, { p: "verified" }), " evidence and the preliminary report refreshes automatically as new data lands. Nothing on this page needs to change to adopt it: existing declarations and documents stay in place and are progressively superseded by verified data."] })] })] }), _jsxs("div", { className: "connect-info", style: { marginTop: 16 }, children: [_jsx("strong", { children: "Integration workflow:" }), " Discover the institution's existing APIs, approve the required read-only resources, configure authentication and then provision an institution-specific data collector."] }), _jsx("button", { className: "connect-button", style: { marginTop: 18 }, onClick: () => void loadWorkspace(), children: "Refresh workspace" })] }));
    };
    /* ---------------- page ---------------- */
    return (_jsx("main", { className: "connect-page", children: _jsxs("div", { className: "connect-wrap", children: [_jsx("div", { className: "connect-eyebrow", children: "REBEL // INSTITUTIONAL CONNECT" }), _jsx("h1", { className: "connect-title", children: "Institution Connect" }), _jsx("p", { className: "connect-subtitle", children: "Connect your institution's existing systems to Rebel. Start with whatever you have: an API URL, a spec, a PDF, a spreadsheet or a simple statement. Build toward verified evidence and compliance assessments at your own pace." }), error && (_jsx("div", { className: "connect-error", role: "alert", children: error })), loading ? (_jsx("div", { className: "connect-card", style: { marginTop: 25 }, children: "Loading institution workspace\u2026" })) : workspace ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "connect-tabs", role: "tablist", "aria-label": "Workspace sections", children: tabs.map((item) => (_jsxs("button", { type: "button", role: "tab", id: `tab-${item.id}`, "aria-selected": tab === item.id, "aria-controls": `panel-${item.id}`, className: "connect-tab", onClick: () => setTab(item.id), children: [item.label, typeof item.count === "number" &&
                                        item.count > 0 && (_jsx("span", { className: "connect-tab-count", children: item.count }))] }, item.id))) }), _jsxs("div", { role: "tabpanel", id: `panel-${tab}`, "aria-labelledby": `tab-${tab}`, children: [tab === "overview" && renderOverview(), tab === "discover" && renderDiscover(), tab === "evidence" && renderEvidence(), tab === "report" && renderReport(), tab === "agents" && renderAgents()] })] })) : (_jsxs("section", { className: "connect-card", style: {
                        maxWidth: 650,
                        marginTop: 25,
                    }, children: [_jsx("div", { className: "connect-eyebrow", children: "INITIALIZE WORKSPACE" }), _jsx("h2", { style: {
                                fontSize: 23,
                                margin: "10px 0",
                            }, children: "Register your institution" }), _jsx("p", { className: "connect-muted", style: {
                                lineHeight: 1.6,
                                marginBottom: 18,
                            }, children: "Two fields to begin. Create the institution workspace that will own your connected systems, agents and evidence. Your account will become its initial institution owner. Everything else can be added later." }), _jsxs("form", { onSubmit: createWorkspace, children: [_jsx("label", { className: "connect-label", htmlFor: "institution-name", children: "Legal or operating institution name" }), _jsx("input", { id: "institution-name", className: "connect-input", value: institutionName, onChange: (event) => setInstitutionName(event.target.value), placeholder: "e.g. Vestro Bank", minLength: 2, maxLength: 200, required: true }), _jsx("label", { className: "connect-label", htmlFor: "institution-jurisdiction", children: "Primary jurisdiction" }), _jsx("input", { id: "institution-jurisdiction", className: "connect-input", value: jurisdiction, onChange: (event) => setJurisdiction(event.target.value), placeholder: "e.g. Zimbabwe", minLength: 2, maxLength: 100, required: true }), _jsx("button", { className: "connect-button", disabled: creating, type: "submit", children: creating
                                        ? "Creating workspace…"
                                        : "Create institution workspace" })] }), _jsx("p", { className: "connect-muted", style: { fontSize: 12, marginTop: 18 }, children: "Joining an existing institution by invitation will be added as the next membership workflow." })] }))] }) }));
}
