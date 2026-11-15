
import { useCallback, useEffect, useState } from "react";

const API_BASE = "https://r3bel-5464.onrender.com";
const AUTH_API = "https://r3bel-ue0h.onrender.com";

const styles = `
.connect-page {
  min-height: 100vh;
  padding: 76px 30px 40px;
  background: #f1f5f9;
  color: #0f172a;
  font-family: Inter, system-ui, sans-serif;
}
.connect-wrap { max-width: 1250px; margin: 0 auto; }
.connect-eyebrow {
  color: #0284c7;
  font: 700 11px monospace;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.connect-title { font-size: clamp(28px, 4vw, 38px); margin: 9px 0; }
.connect-subtitle { color: #64748b; line-height: 1.6; max-width: 760px; }
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
.connect-metric { font-size: 30px; font-weight: 750; margin-top: 9px; }
.connect-section-title { font-size: 17px; margin-bottom: 14px; }
.connect-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.connect-table th {
  text-align: left;
  padding: 11px 9px;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.connect-table td { padding: 13px 9px; border-bottom: 1px solid #f1f5f9; }
.connect-muted { color: #64748b; }
.connect-status {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
}
.connect-status.active { background: #dcfce7; color: #166534; }
.connect-button {
  border: 0;
  border-radius: 7px;
  padding: 11px 16px;
  background: #0284c7;
  color: white;
  font-weight: 700;
  cursor: pointer;
}
.connect-button:disabled { opacity: .55; cursor: wait; }
.connect-input {
  width: 100%;
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
.connect-hash { font: 11px monospace; color: #64748b; word-break: break-all; }

@media (max-width: 760px) {
  .connect-page { padding: 68px 15px 30px; }
  .connect-grid { grid-template-columns: 1fr; }
  .connect-table-wrap { overflow-x: auto; }
  .connect-table { min-width: 620px; }
}
`;

function isValidJwt(token) {
  if (typeof token !== "string") return false;
  if (!token || token === "undefined" || token === "null") return false;
  return token.split(".").length === 3;
}

// Same Django SimpleJWT refresh endpoint used by Rebel's other pages.
async function refreshAccessToken() {
  const refresh = localStorage.getItem("refresh");

  if (!isValidJwt(refresh)) {
    return null;
  }

  try {
    const response = await fetch(`${AUTH_API}/api/token/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (!isValidJwt(data.access)) {
      return null;
    }

    localStorage.setItem("access", data.access);

    if (isValidJwt(data.refresh)) {
      localStorage.setItem("refresh", data.refresh);
    }

    return data.access;
  } catch {
    return null;
  }
}

// Authenticated request using the same localStorage session as other Rebel pages.
// On 401, refresh once and retry once.
async function connectRequest(path, options = {}, retried = false) {
  const token = localStorage.getItem("access");

  const headers = {
    ...(options.headers || {}),
  };

  if (isValidJwt(token)) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    delete headers.Authorization;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status !== 401 || retried) {
    return response;
  }

  const newToken = await refreshAccessToken();

  if (!newToken) {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    return response;
  }

  return connectRequest(path, options, true);
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Your Rebel session is invalid or expired. Please sign in again."
      );
    }

    if (response.status === 503) {
      throw new Error(
        data.detail ||
        "Connect authentication is not configured on the backend."
      );
    }

    throw new Error(
      data.detail ||
      data.message ||
      `Connect request failed (${response.status}).`
    );
  }

  return data;
}

export default function ConnectWorkspace() {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");

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

  const createWorkspace = async (event) => {
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

      await readResponse(response);
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
            Connect your institution's systems to Rebel. Manage
            machine identities, monitor evidence ingestion and
            establish the data foundation for security and
            compliance assessments.
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
              <section
                className="connect-card"
                style={{ marginTop: 25 }}
              >
                <div className="connect-eyebrow">
                  ACTIVE INSTITUTION
                </div>

                <h2 style={{ fontSize: 23, margin: "9px 0" }}>
                  {workspace.institution.name}
                </h2>

                <div className="connect-muted">
                  {workspace.institution.jurisdiction}
                  {" · "}
                  {workspace.institution.role}
                </div>

                <div
                  className="connect-muted"
                  style={{ fontSize: 11, marginTop: 8 }}
                >
                  Institution ID:{" "}
                  {workspace.institution.institution_id}
                </div>
              </section>

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
                    institution agent submits evidence, its source,
                    type, timestamp and integrity hash will appear
                    here.
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
                            <td>
                              {new Date(
                                item.received_at
                              ).toLocaleString()}
                            </td>
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

              <div className="connect-info">
                <strong>Next integration step:</strong>{" "}
                provision an institution-specific agent with the
                minimum required scopes, install it in the
                institution's environment, and begin sending
                signed-provenance evidence to Rebel. Agent
                provisioning remains restricted to the controlled
                provisioning service.
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
              style={{ maxWidth: 650, marginTop: 25 }}
            >
              <div className="connect-eyebrow">
                INITIALIZE WORKSPACE
              </div>

              <h2 style={{ fontSize: 23, margin: "10px 0" }}>
                Register your institution
              </h2>

              <p
                className="connect-muted"
                style={{ lineHeight: 1.6, marginBottom: 18 }}
              >
                Create the institution workspace that will own
                your connected systems, agents and evidence. Your
                account will become its initial institution owner.
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
                style={{ fontSize: 12, marginTop: 18 }}
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
