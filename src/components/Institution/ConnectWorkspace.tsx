
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

const API_BASE = "https://r3bel-5464.onrender.com";

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

async function readResponse<T>(
  response: Response
): Promise<T> {
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

const styles = `
.connect-page {
  min-height: 100vh;
  padding: 76px 30px 40px;
  background: #f1f5f9;
  color: #0f172a;
  font-family: Inter, system-ui, sans-serif;
}

.connect-wrap {
  max-width: 1250px;
  margin: 0 auto;
}

.connect-eyebrow {
  color: #0284c7;
  font: 700 11px monospace;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.connect-title {
  font-size: clamp(28px, 4vw, 38px);
  margin: 9px 0;
}

.connect-subtitle {
  color: #64748b;
  line-height: 1.6;
  max-width: 760px;
}

.connect-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 26px 0;
}

.connect-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
}

.connect-card-label {
  color: #64748b;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .1em;
}

.connect-metric {
  font-size: 30px;
  font-weight: 750;
  margin-top: 9px;
}

.connect-section-title {
  font-size: 17px;
  margin-bottom: 14px;
}

.connect-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.connect-table th {
  text-align: left;
  padding: 11px 9px;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.connect-table td {
  padding: 13px 9px;
  border-bottom: 1px solid #f1f5f9;
}

.connect-muted {
  color: #64748b;
}

.connect-status {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
}

.connect-status.active {
  background: #dcfce7;
  color: #166534;
}

.connect-button {
  border: 0;
  border-radius: 7px;
  padding: 11px 16px;
  background: #0284c7;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.connect-button:disabled {
  opacity: .55;
  cursor: wait;
}

.connect-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  margin: 7px 0 15px;
  font-size: 14px;
}

.connect-error {
  color: #b91c1c;
  background: #fef2f2;
  padding: 12px;
  border-radius: 8px;
  margin: 14px 0;
}

.connect-info {
  color: #075985;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  padding: 14px;
  border-radius: 9px;
  line-height: 1.55;
  font-size: 13px;
}

.connect-hash {
  font: 11px monospace;
  color: #64748b;
  word-break: break-all;
}

/* API discovery */

.connect-discovery {
  margin-top: 22px;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 22px;
}

.connect-discovery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.connect-discovery-input {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.connect-discovery-input .connect-input {
  flex: 1;
  min-width: 0;
  margin: 7px 0 0;
}

.connect-endpoint {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 4px;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
}

.connect-endpoint input {
  margin-top: 5px;
}

.connect-method {
  flex-shrink: 0;
  font: 700 10px monospace;
  color: #166534;
  background: #dcfce7;
  padding: 5px 7px;
  border-radius: 5px;
}

.connect-endpoint-path {
  font: 12px monospace;
  overflow-wrap: anywhere;
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

.connect-doc-link {
  display: block;
  margin-top: 8px;
  color: #0369a1;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.connect-discovery-result {
  margin-top: 22px;
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
}

@media (max-width: 760px) {
  .connect-page {
    padding: 68px 15px 30px;
  }

  .connect-grid {
    grid-template-columns: 1fr;
  }

  .connect-table-wrap {
    overflow-x: auto;
  }

  .connect-table {
    min-width: 620px;
  }

  .connect-discovery-input {
    flex-direction: column;
  }
}
`;

export default function ConnectWorkspace() {
  const [workspace, setWorkspace] =
    useState<Workspace | null>(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [institutionName, setInstitutionName] =
    useState("");

  const [jurisdiction, setJurisdiction] =
    useState("");

  // Banking system discovery state

  const [sourceUrl, setSourceUrl] = useState(
    "https://vestro-icontroll3r-dev.apps.rm3.7wse.p1.openshiftapps.com"
  );

  const [discovering, setDiscovering] = useState(false);

  const [discovery, setDiscovery] =
    useState<DiscoveryResult | null>(null);

  const [discoveryError, setDiscoveryError] =
    useState("");

  const [selectedEndpoints, setSelectedEndpoints] =
    useState<string[]>([]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await connectRequest(
        "/connect/workspace"
      );

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
    setDiscovery(null);
    setSelectedEndpoints([]);

    try {
      const parsed = new URL(sourceUrl.trim());

      if (parsed.protocol !== "https:") {
        throw new Error(
          "Only HTTPS connections are permitted."
        );
      }

      if (parsed.username || parsed.password) {
        throw new Error(
          "Credentials must not be embedded in the URL."
        );
      }

      const response = await connectRequest(
        "/connect/discovery/scan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            institution_id:
              workspace?.institution.institution_id,
            target_url: parsed.origin,
          }),
        }
      );

      const result =
        await readResponse<DiscoveryResult>(response);

      setDiscovery(result);

      setSelectedEndpoints(
        result.endpoints
          .filter((endpoint) => endpoint.read_only)
          .map(
            (endpoint) =>
              `${endpoint.method.toUpperCase()}:${endpoint.path}`
          )
      );
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

  const toggleEndpoint = (key: string) => {
    setSelectedEndpoints((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  return (
    <>
      <style>{styles}</style>

      <main className="connect-page">
        <div className="connect-wrap">
          <div className="connect-eyebrow">
            REBEL // INSTITUTIONAL CONNECT
          </div>

          <h1 className="connect-title">
            Institution Connect
          </h1>

          <p className="connect-subtitle">
            Connect your institution's existing systems to
            Rebel. Discover banking APIs, identify accessible
            data sources, manage machine identities and
            establish the evidence foundation for compliance
            assessments.
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
              {/* Active institution */}

              <section
                className="connect-card"
                style={{ marginTop: 25 }}
              >
                <div className="connect-eyebrow">
                  ACTIVE INSTITUTION
                </div>

                <h2
                  style={{
                    fontSize: 23,
                    margin: "9px 0",
                  }}
                >
                  {workspace.institution.name}
                </h2>

                <div className="connect-muted">
                  {workspace.institution.jurisdiction}
                  {" · "}
                  {workspace.institution.role}
                </div>

                <div
                  className="connect-muted"
                  style={{
                    fontSize: 11,
                    marginTop: 8,
                  }}
                >
                  Institution ID:{" "}
                  {workspace.institution.institution_id}
                </div>
              </section>

              {/* Banking API discovery */}

              <section className="connect-discovery">
                <div className="connect-discovery-header">
                  <div>
                    <div className="connect-eyebrow">
                      SYSTEM INTEGRATION
                    </div>

                    <h2 className="connect-section-title">
                      Discover Banking APIs
                    </h2>
                  </div>

                  <span className="connect-status">
                    API discovery
                  </span>
                </div>

                <p
                  className="connect-muted"
                  style={{ lineHeight: 1.6 }}
                >
                  Enter the institution's existing banking
                  portal or API gateway. Rebel will inspect
                  accessible API documentation and identify
                  potential read-only data endpoints.
                </p>

                <form onSubmit={discoverAPIs}>
                  <label htmlFor="bank-source-url">
                    Banking portal / API base URL
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
                      placeholder="https://bank.example.com"
                      required
                    />

                    <button
                      className="connect-button"
                      type="submit"
                      disabled={discovering}
                    >
                      {discovering
                        ? "Discovering..."
                        : "Discover APIs"}
                    </button>
                  </div>
                </form>

                <div
                  className="connect-info"
                  style={{ marginTop: 16 }}
                >
                  <strong>Read-only discovery:</strong>{" "}
                  Rebel will inspect API documentation and
                  permitted metadata. Discovery will not
                  initiate payments, modify accounts or
                  execute administrative operations.
                </div>

                {discoveryError && (
                  <div
                    className="connect-error"
                    role="alert"
                  >
                    {discoveryError}
                  </div>
                )}

                {discovery && (
                  <div className="connect-discovery-result">
                    <h3 className="connect-section-title">
                      Discovery results
                    </h3>

                    <div className="connect-muted">
                      Target: {discovery.target_url}
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <span
                        className={`connect-status ${
                          discovery.reachable
                            ? "active"
                            : ""
                        }`}
                      >
                        {discovery.reachable
                          ? "Host reachable"
                          : "Host not reachable"}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: 14,
                        marginTop: 20,
                      }}
                    >
                      API documentation
                    </h3>

                    {discovery.documentation_urls.length ===
                    0 ? (
                      <p className="connect-muted">
                        No API documentation was discovered.
                      </p>
                    ) : (
                      discovery.documentation_urls.map(
                        (url) => (
                          <a
                            key={url}
                            className="connect-doc-link"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {url}
                          </a>
                        )
                      )
                    )}

                    <h3
                      style={{
                        fontSize: 14,
                        marginTop: 20,
                      }}
                    >
                      Authentication methods
                    </h3>

                    <p className="connect-muted">
                      {discovery.authentication_methods
                        .length
                        ? discovery.authentication_methods.join(
                            ", "
                          )
                        : "Not determined"}
                    </p>

                    <h3
                      style={{
                        fontSize: 14,
                        marginTop: 20,
                      }}
                    >
                      Discovered endpoints
                    </h3>

                    {discovery.endpoints.length === 0 ? (
                      <p className="connect-muted">
                        No endpoints have been identified yet.
                      </p>
                    ) : (
                      discovery.endpoints.map((endpoint) => {
                        const key =
                          `${endpoint.method.toUpperCase()}:${endpoint.path}`;

                        return (
                          <label
                            className="connect-endpoint"
                            key={key}
                          >
                            <input
                              type="checkbox"
                              checked={selectedEndpoints.includes(
                                key
                              )}
                              disabled={!endpoint.read_only}
                              onChange={() =>
                                toggleEndpoint(key)
                              }
                            />

                            <span className="connect-method">
                              {endpoint.method.toUpperCase()}
                            </span>

                            <span>
                              <div className="connect-endpoint-path">
                                {endpoint.path}
                              </div>

                              <div className="connect-muted">
                                {endpoint.description ||
                                  endpoint.category ||
                                  "No description available"}
                              </div>

                              {!endpoint.read_only && (
                                <div
                                  className="connect-muted"
                                  style={{ fontSize: 11 }}
                                >
                                  Not eligible for read-only
                                  selection
                                </div>
                              )}
                            </span>
                          </label>
                        );
                      })
                    )}

                    {discovery.warnings.map(
                      (warning, index) => (
                        <div
                          className="connect-warning"
                          key={index}
                        >
                          {warning}
                        </div>
                      )
                    )}

                    <p
                      className="connect-muted"
                      style={{ marginTop: 15 }}
                    >
                      Selected read-only endpoints:{" "}
                      {selectedEndpoints.length}
                    </p>

                    <div className="connect-info">
                      Endpoint selection is currently a
                      discovery preview. Connection approval,
                      authentication configuration and
                      evidence collection will be implemented
                      as the next integration stage.
                    </div>
                  </div>
                )}
              </section>

              {/* Institution metrics */}

              <section className="connect-grid">
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

              {/* Connected agents */}

              <section
                className="connect-card"
                style={{ marginBottom: 18 }}
              >
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

                            <td>
                              {agent.created_at
                                ? new Date(
                                    agent.created_at
                                  ).toLocaleString()
                                : "—"}
                            </td>

                            <td>
                              {agent.last_seen_at
                                ? new Date(
                                    agent.last_seen_at
                                  ).toLocaleString()
                                : "Never"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Recent evidence */}

              <section
                className="connect-card"
                style={{ marginBottom: 18 }}
              >
                <h2 className="connect-section-title">
                  Recent evidence
                </h2>

                {workspace.recent_evidence.length === 0 ? (
                  <div className="connect-muted">
                    No evidence has been received. Once an
                    institution agent submits evidence, its
                    source, type, timestamp and integrity hash
                    will appear here.
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
                        {workspace.recent_evidence.map(
                          (item) => (
                            <tr key={item.submission_id}>
                              <td>{item.source_system}</td>
                              <td>{item.evidence_type}</td>
                              <td>
                                {new Date(
                                  item.received_at
                                ).toLocaleString()}
                              </td>
                              <td className="connect-hash">
                                {item.payload_sha256}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <div className="connect-info">
                <strong>Integration workflow:</strong>{" "}
                Discover the institution's existing APIs,
                approve the required read-only resources,
                configure authentication and then provision
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
                Create the institution workspace that will own
                your connected systems, agents and evidence.
                Your account will become its initial
                institution owner.
              </p>

              <form onSubmit={createWorkspace}>
                <label htmlFor="institution-name">
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

                <label htmlFor="institution-jurisdiction">
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
                style={{
                  fontSize: 12,
                  marginTop: 18,
                }}
              >
                Joining an existing institution by invitation
                will be added as the next membership workflow.
              </p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
