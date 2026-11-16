import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
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
}
`;
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
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: styles }), _jsx("main", { className: "connect-page", children: _jsxs("div", { className: "connect-wrap", children: [_jsx("div", { className: "connect-eyebrow", children: "REBEL // INSTITUTIONAL CONNECT" }), _jsx("h1", { className: "connect-title", children: "Institution Connect" }), _jsx("p", { className: "connect-subtitle", children: "Connect your institution's systems to Rebel. Manage machine identities, monitor evidence ingestion and establish the data foundation for security and compliance assessments." }), error && (_jsx("div", { className: "connect-error", role: "alert", children: error })), loading ? (_jsx("div", { className: "connect-card", style: { marginTop: 25 }, children: "Loading institution workspace\u2026" })) : workspace ? (_jsxs(_Fragment, { children: [_jsxs("section", { className: "connect-card", style: { marginTop: 25 }, children: [_jsx("div", { className: "connect-eyebrow", children: "ACTIVE INSTITUTION" }), _jsx("h2", { style: { fontSize: 23, margin: "9px 0" }, children: workspace.institution.name }), _jsxs("div", { className: "connect-muted", children: [workspace.institution.jurisdiction, " · ", workspace.institution.role] }), _jsxs("div", { className: "connect-muted", style: { fontSize: 11, marginTop: 8 }, children: ["Institution ID:", " ", workspace.institution.institution_id] })] }), _jsxs("section", { className: "connect-grid", children: [_jsxs("div", { className: "connect-card", children: [_jsx("div", { className: "connect-card-label", children: "Registered agents" }), _jsx("div", { className: "connect-metric", children: workspace.metrics.agents_total })] }), _jsxs("div", { className: "connect-card", children: [_jsx("div", { className: "connect-card-label", children: "Active agents" }), _jsx("div", { className: "connect-metric", children: workspace.metrics.agents_active })] }), _jsxs("div", { className: "connect-card", children: [_jsx("div", { className: "connect-card-label", children: "Evidence submissions" }), _jsx("div", { className: "connect-metric", children: workspace.metrics.evidence_total })] })] }), _jsxs("section", { className: "connect-card", style: { marginBottom: 18 }, children: [_jsx("h2", { className: "connect-section-title", children: "Connected agents" }), workspace.agents.length === 0 ? (_jsx("div", { className: "connect-muted", children: "No agents have been provisioned for this institution yet." })) : (_jsx("div", { className: "connect-table-wrap", children: _jsxs("table", { className: "connect-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Agent" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Created" }), _jsx("th", { children: "Last heartbeat" })] }) }), _jsx("tbody", { children: workspace.agents.map((agent) => (_jsxs("tr", { children: [_jsxs("td", { children: [_jsx("strong", { children: agent.name }), _jsx("div", { className: "connect-muted", style: { fontSize: 10 }, children: agent.agent_id })] }), _jsx("td", { children: _jsx("span", { className: `connect-status ${agent.status === "active"
                                                                            ? "active"
                                                                            : ""}`, children: agent.status }) }), _jsx("td", { children: agent.created_at
                                                                        ? new Date(agent.created_at).toLocaleString()
                                                                        : "—" }), _jsx("td", { children: agent.last_seen_at
                                                                        ? new Date(agent.last_seen_at).toLocaleString()
                                                                        : "Never" })] }, agent.agent_id))) })] }) }))] }), _jsxs("section", { className: "connect-card", style: { marginBottom: 18 }, children: [_jsx("h2", { className: "connect-section-title", children: "Recent evidence" }), workspace.recent_evidence.length === 0 ? (_jsx("div", { className: "connect-muted", children: "No evidence has been received. Once an institution agent submits evidence, its source, type, timestamp and integrity hash will appear here." })) : (_jsx("div", { className: "connect-table-wrap", children: _jsxs("table", { className: "connect-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Source" }), _jsx("th", { children: "Evidence type" }), _jsx("th", { children: "Received" }), _jsx("th", { children: "Integrity hash" })] }) }), _jsx("tbody", { children: workspace.recent_evidence.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.source_system }), _jsx("td", { children: item.evidence_type }), _jsx("td", { children: new Date(item.received_at).toLocaleString() }), _jsx("td", { className: "connect-hash", children: item.payload_sha256 })] }, item.submission_id))) })] }) }))] }), _jsxs("div", { className: "connect-info", children: [_jsx("strong", { children: "Next integration step:" }), " ", "provision an institution-specific agent with the minimum required scopes, install it in the institution's environment, and begin sending signed-provenance evidence to Rebel. Agent provisioning remains restricted to the controlled provisioning service."] }), _jsx("button", { className: "connect-button", style: { marginTop: 18 }, onClick: () => void loadWorkspace(), children: "Refresh workspace" })] })) : (_jsxs("section", { className: "connect-card", style: { maxWidth: 650, marginTop: 25 }, children: [_jsx("div", { className: "connect-eyebrow", children: "INITIALIZE WORKSPACE" }), _jsx("h2", { style: { fontSize: 23, margin: "10px 0" }, children: "Register your institution" }), _jsx("p", { className: "connect-muted", style: { lineHeight: 1.6, marginBottom: 18 }, children: "Create the institution workspace that will own your connected systems, agents and evidence. Your account will become its initial institution owner." }), _jsxs("form", { onSubmit: createWorkspace, children: [_jsx("label", { htmlFor: "institution-name", children: "Legal or operating institution name" }), _jsx("input", { id: "institution-name", className: "connect-input", value: institutionName, onChange: (event) => setInstitutionName(event.target.value), placeholder: "e.g. Vestro Bank", minLength: 2, maxLength: 200, required: true }), _jsx("label", { htmlFor: "institution-jurisdiction", children: "Primary jurisdiction" }), _jsx("input", { id: "institution-jurisdiction", className: "connect-input", value: jurisdiction, onChange: (event) => setJurisdiction(event.target.value), placeholder: "e.g. Zimbabwe", minLength: 2, maxLength: 100, required: true }), _jsx("button", { className: "connect-button", disabled: creating, type: "submit", children: creating
                                                ? "Creating workspace…"
                                                : "Create institution workspace" })] }), _jsx("p", { className: "connect-muted", style: { fontSize: 12, marginTop: 18 }, children: "Joining an existing institution by invitation will be added as the next membership workflow." })] }))] }) })] }));
}
