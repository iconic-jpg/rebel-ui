import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
const STORAGE_KEY = "rebel_institution_onboarding_v1";
const initialData = {
    institutionType: "",
    legalName: "",
    tradingName: "",
    country: "",
    website: "",
    registrationNumber: "",
    operatingCountries: "",
    employeeCount: "",
    locations: "",
    customerCount: "",
    businessActivities: "",
    criticalServices: "",
    dataTypes: [],
    riskLevel: "",
    regulatoryObligations: "",
    existingFrameworks: [],
    complianceOwner: "",
    securityOwner: "",
    auditFunction: "",
    governanceNotes: "",
    cloudEnvironment: [],
    infrastructure: [],
    identityProvider: "",
    securityTools: "",
    criticalSystems: "",
    invitationCode: "",
    invitationEmail: "",
};
const institutionTypes = [
    {
        value: "financial",
        title: "Financial institution",
        description: "Banks, insurers, fintechs, microfinance and payment providers",
        symbol: "01",
    },
    {
        value: "healthcare",
        title: "Healthcare",
        description: "Hospitals, clinics, laboratories and health networks",
        symbol: "02",
    },
    {
        value: "government",
        title: "Government & public sector",
        description: "Ministries, agencies, municipalities and public services",
        symbol: "03",
    },
    {
        value: "corporate",
        title: "Corporate enterprise",
        description: "Manufacturing, retail, logistics and professional services",
        symbol: "04",
    },
    {
        value: "technology",
        title: "Technology & infrastructure",
        description: "SaaS, cloud providers, telecoms and data centres",
        symbol: "05",
    },
    {
        value: "education",
        title: "Education & research",
        description: "Universities, colleges and research institutions",
        symbol: "06",
    },
    {
        value: "nonprofit",
        title: "Nonprofit",
        description: "NGOs, charities and development organisations",
        symbol: "07",
    },
    {
        value: "other",
        title: "Other institution",
        description: "An organisation with a different operating model",
        symbol: "08",
    },
];
const steps = [
    "Institution type",
    "Identity",
    "Operations",
    "Risk profile",
    "Governance",
    "Technology",
    "Review",
];
const frameworkOptions = [
    "ISO 27001",
    "ISO 22301",
    "SOC 2",
    "NIST CSF",
    "NIST 800-53",
    "PCI DSS",
    "GDPR",
    "HIPAA",
    "RBI requirements",
    "Other / not yet determined",
];
const dataOptions = [
    "Personal information",
    "Financial information",
    "Health information",
    "Government or classified information",
    "Payment card information",
    "Intellectual property",
    "Research or student records",
    "Public information",
];
const cloudOptions = [
    "AWS",
    "Microsoft Azure",
    "Google Cloud",
    "Private cloud",
    "On-premises",
    "Hybrid environment",
    "Other",
];
const infrastructureOptions = [
    "Corporate networks",
    "Endpoints and workstations",
    "Databases",
    "Web applications",
    "APIs",
    "Identity and access systems",
    "Operational technology",
    "Cloud infrastructure",
    "Critical national infrastructure",
];
const sectorPrompts = {
    financial: {
        activities: "Describe your financial activities: deposits, lending, payments, insurance, investment, remittances or other services.",
        systems: "Examples: core banking, payment processing, mobile banking, trading systems, AML and fraud platforms.",
        obligations: "List applicable financial regulators, licensing requirements, AML obligations and payment standards. Include the jurisdiction.",
    },
    healthcare: {
        activities: "Describe your healthcare activities: clinical care, diagnostics, laboratories, pharmacies or health administration.",
        systems: "Examples: electronic health records, laboratory systems, clinical applications and medical devices.",
        obligations: "List applicable health-data privacy, patient safety, medical-device and healthcare regulatory obligations.",
    },
    government: {
        activities: "Describe your public mandate, citizen services, public programmes and critical government functions.",
        systems: "Examples: citizen identity systems, public-service platforms, government networks and classified-data systems.",
        obligations: "List applicable public-sector cybersecurity policies, national requirements, data classification and procurement obligations.",
    },
    corporate: {
        activities: "Describe your main commercial activities, supply chains, business units and services.",
        systems: "Examples: ERP, CRM, manufacturing systems, supply-chain platforms and business applications.",
        obligations: "List applicable industry regulations, privacy requirements, contractual obligations and jurisdictions.",
    },
    technology: {
        activities: "Describe your technology services: SaaS, hosting, telecommunications, software development or infrastructure operations.",
        systems: "Examples: cloud platforms, source-code repositories, CI/CD, production environments, APIs and customer platforms.",
        obligations: "List applicable service-provider, privacy, security, data-residency and contractual requirements.",
    },
    education: {
        activities: "Describe your education and research activities, campuses, programmes and external research partnerships.",
        systems: "Examples: student information systems, learning platforms, research repositories, campus networks and identity systems.",
        obligations: "List applicable education, student privacy, research-data, funding and institutional requirements.",
    },
    nonprofit: {
        activities: "Describe your mission, programmes, beneficiaries, funding and operational activities.",
        systems: "Examples: donor platforms, beneficiary databases, financial systems and programme-management tools.",
        obligations: "List applicable charity, financial reporting, privacy, donor and cross-border funding obligations.",
    },
    other: {
        activities: "Describe your institution's primary activities, services and operating model.",
        systems: "List the systems and infrastructure that support your most important services.",
        obligations: "List known regulatory, contractual, licensing and jurisdictional obligations.",
    },
};
const styles = `
.rebel-onboarding {
  min-height: 100vh;
  background:
    linear-gradient(rgba(0, 210, 255, .025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 210, 255, .025) 1px, transparent 1px),
    #07111d;
  background-size: 32px 32px;
  color: #e8f4ff;
  font-family: Arial, sans-serif;
  padding: 34px 22px 70px;
  box-sizing: border-box;
}
.rebel-onboarding * { box-sizing: border-box; }
.rebel-onboarding .shell { max-width: 1120px; margin: 0 auto; }
.rebel-onboarding .topbar {
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px; margin-bottom: 52px;
}
.rebel-onboarding .brand {
  color: #eafaff; font-size: 25px; font-weight: 900;
  letter-spacing: 5px;
}
.rebel-onboarding .brand span { color: #00d9ff; }
.rebel-onboarding .eyebrow {
  color: #00d9ff; font-size: 11px; letter-spacing: 3px;
  text-transform: uppercase; font-weight: 700;
}
.rebel-onboarding h1 {
  font-size: clamp(30px, 5vw, 48px); line-height: 1.1;
  margin: 13px 0; letter-spacing: -1.5px;
}
.rebel-onboarding h2 { font-size: 23px; margin: 0 0 10px; }
.rebel-onboarding p { color: #9aafc2; line-height: 1.65; }
.rebel-onboarding .intro { max-width: 720px; margin-bottom: 30px; }
.rebel-onboarding .panel {
  background: rgba(12, 27, 43, .94);
  border: 1px solid #1b3b52;
  padding: 27px;
  border-radius: 10px;
  box-shadow: 0 18px 60px rgba(0,0,0,.2);
}
.rebel-onboarding .progress-wrap { margin: 24px 0 30px; }
.rebel-onboarding .progress-label {
  display: flex; justify-content: space-between; gap: 12px;
  color: #91a9bd; font-size: 12px; margin-bottom: 10px;
}
.rebel-onboarding .progress-track {
  width: 100%; height: 5px; background: #1b3042; border-radius: 8px;
  overflow: hidden;
}
.rebel-onboarding .progress-fill {
  height: 100%; background: #00d9ff; transition: width .25s ease;
}
.rebel-onboarding .step-dots {
  display: grid; grid-template-columns: repeat(7, 1fr);
  gap: 7px; margin-top: 12px;
}
.rebel-onboarding .step-dot {
  height: 3px; background: #26394b; border-radius: 4px;
}
.rebel-onboarding .step-dot.active { background: #00d9ff; }
.rebel-onboarding .type-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px; margin-top: 22px;
}
.rebel-onboarding .type-card {
  text-align: left; color: #e8f4ff; padding: 19px;
  background: #0a1a29; border: 1px solid #203b50;
  border-radius: 8px; cursor: pointer; min-height: 130px;
  transition: .18s ease;
}
.rebel-onboarding .type-card:hover,
.rebel-onboarding .type-card.selected {
  border-color: #00d9ff; background: #0d2638;
  box-shadow: inset 0 0 0 1px rgba(0,217,255,.15);
}
.rebel-onboarding .type-number {
  color: #00d9ff; font-size: 11px; letter-spacing: 2px;
  margin-bottom: 13px;
}
.rebel-onboarding .type-title { font-size: 15px; font-weight: 700; }
.rebel-onboarding .type-desc { font-size: 12px; color: #91a9bd; margin-top: 7px; line-height: 1.5; }
.rebel-onboarding .form-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 19px; margin-top: 23px;
}
.rebel-onboarding .field { display: flex; flex-direction: column; gap: 8px; }
.rebel-onboarding .field.full { grid-column: 1 / -1; }
.rebel-onboarding label {
  color: #c6d8e7; font-size: 12px; letter-spacing: .5px;
}
.rebel-onboarding input,
.rebel-onboarding textarea,
.rebel-onboarding select {
  width: 100%; border: 1px solid #29465d; background: #071522;
  border-radius: 5px; color: #edf8ff; padding: 13px 14px;
  font: inherit; font-size: 14px; outline: none;
}
.rebel-onboarding textarea { min-height: 105px; resize: vertical; }
.rebel-onboarding input:focus,
.rebel-onboarding textarea:focus,
.rebel-onboarding select:focus { border-color: #00d9ff; }
.rebel-onboarding select option { background: #071522; }
.rebel-onboarding .hint { color: #718ba1; font-size: 11px; line-height: 1.5; }
.rebel-onboarding .check-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px; margin-top: 13px;
}
.rebel-onboarding .check-item {
  display: flex; align-items: center; gap: 10px;
  border: 1px solid #203b50; border-radius: 5px;
  padding: 12px; background: #091a29; color: #c6d8e7;
  font-size: 12px; cursor: pointer;
}
.rebel-onboarding .check-item input {
  width: 15px; height: 15px; accent-color: #00d9ff; padding: 0;
}
.rebel-onboarding .section-block {
  border-top: 1px solid #1b354a; padding-top: 22px; margin-top: 24px;
}
.rebel-onboarding .actions {
  display: flex; justify-content: space-between; gap: 12px;
  margin-top: 30px; flex-wrap: wrap;
}
.rebel-onboarding button { font: inherit; }
.rebel-onboarding .btn {
  border: 1px solid #31536c; background: transparent; color: #c9dce9;
  padding: 12px 19px; border-radius: 5px; cursor: pointer;
  font-size: 12px; letter-spacing: 1px; font-weight: 700;
}
.rebel-onboarding .btn.primary {
  background: #00c9ed; border-color: #00c9ed; color: #04121d;
}
.rebel-onboarding .btn:hover { filter: brightness(1.12); }
.rebel-onboarding .btn:disabled { opacity: .4; cursor: not-allowed; }
.rebel-onboarding .save-status { color: #6f91a8; font-size: 11px; }
.rebel-onboarding .summary-row {
  display: grid; grid-template-columns: 190px 1fr; gap: 18px;
  padding: 13px 0; border-bottom: 1px solid #1b354a;
  font-size: 13px; overflow-wrap: anywhere;
}
.rebel-onboarding .summary-row strong { color: #7e9ab0; font-weight: 500; }
.rebel-onboarding .summary-row span { color: #e1f4ff; }
.rebel-onboarding .notice {
  padding: 15px; border-left: 3px solid #00d9ff;
  background: rgba(0,217,255,.06); color: #a9c5d8;
  font-size: 12px; line-height: 1.6; margin-top: 20px;
}
.rebel-onboarding .choice-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px; margin-top: 25px;
}
.rebel-onboarding .choice-card {
  background: #0a1a29; border: 1px solid #24445b;
  border-radius: 8px; padding: 24px; color: #e8f4ff;
  text-align: left; cursor: pointer; min-height: 180px;
}
.rebel-onboarding .choice-card:hover { border-color: #00d9ff; }
.rebel-onboarding .choice-card h2 { margin-top: 18px; }
.rebel-onboarding .success-mark {
  width: 48px; height: 48px; border: 1px solid #00d9ff;
  color: #00d9ff; display: grid; place-items: center;
  border-radius: 50%; font-size: 23px; margin-bottom: 20px;
}
@media (max-width: 680px) {
  .rebel-onboarding { padding: 24px 14px 50px; }
  .rebel-onboarding .topbar { margin-bottom: 35px; }
  .rebel-onboarding .panel { padding: 18px; }
  .rebel-onboarding .type-grid,
  .rebel-onboarding .form-grid,
  .rebel-onboarding .check-grid,
  .rebel-onboarding .choice-grid { grid-template-columns: 1fr; }
  .rebel-onboarding .summary-row { grid-template-columns: 1fr; gap: 5px; }
}
`;
export default function InstitutionOnboarding() {
    const [entryMode, setEntryMode] = useState(null);
    const [step, setStep] = useState(0);
    const [data, setData] = useState(initialData);
    const [saveMessage, setSaveMessage] = useState("Draft not saved yet");
    const [submitted, setSubmitted] = useState(false);
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved)
                return;
            const parsed = JSON.parse(saved);
            if (parsed?.data) {
                setData({ ...initialData, ...parsed.data });
                setStep(Number.isInteger(parsed.step)
                    ? Math.min(Math.max(parsed.step, 0), 6)
                    : 0);
                setEntryMode(parsed.entryMode ?? null);
                setSaveMessage("Previous draft restored");
            }
        }
        catch {
            setSaveMessage("A previous draft could not be restored");
        }
    }, []);
    useEffect(() => {
        if (!entryMode || submitted)
            return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, step, entryMode, savedAt: new Date().toISOString() }));
            setSaveMessage("Draft saved on this device");
        }
        catch {
            setSaveMessage("Draft could not be saved in this browser");
        }
    }, [data, step, entryMode, submitted]);
    const sector = data.institutionType
        ? sectorPrompts[data.institutionType]
        : sectorPrompts.other;
    const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);
    function update(key, value) {
        setData((current) => ({ ...current, [key]: value }));
    }
    function toggleArray(key, value) {
        const current = data[key];
        update(key, (current.includes(value)
            ? current.filter((item) => item !== value)
            : [...current, value]));
    }
    function field(key, label, placeholder = "", type = "text", full = false) {
        return (_jsxs("div", { className: `field ${full ? "full" : ""}`, children: [_jsx("label", { htmlFor: String(key), children: label }), _jsx("input", { id: String(key), type: type, value: String(data[key] ?? ""), placeholder: placeholder, onChange: (event) => update(key, event.target.value) })] }, key));
    }
    function textArea(key, label, placeholder) {
        return (_jsxs("div", { className: "field full", children: [_jsx("label", { htmlFor: String(key), children: label }), _jsx("textarea", { id: String(key), value: String(data[key] ?? ""), placeholder: placeholder, onChange: (event) => update(key, event.target.value) })] }, key));
    }
    function checks(title, options, key) {
        return (_jsxs("div", { className: "field full", children: [_jsx("label", { children: title }), _jsx("div", { className: "check-grid", children: options.map((option) => (_jsxs("label", { className: "check-item", children: [_jsx("input", { type: "checkbox", checked: data[key].includes(option), onChange: () => toggleArray(key, option) }), option] }, option))) })] }));
    }
    function canContinue() {
        if (step === 0)
            return Boolean(data.institutionType);
        if (step === 1)
            return Boolean(data.legalName.trim() && data.country.trim());
        return true;
    }
    function next() {
        if (!canContinue())
            return;
        setStep((current) => Math.min(current + 1, steps.length - 1));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    function back() {
        setStep((current) => Math.max(current - 1, 0));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    function resetDraft() {
        if (!window.confirm("Start a new institutional onboarding draft?"))
            return;
        localStorage.removeItem(STORAGE_KEY);
        setData(initialData);
        setEntryMode(null);
        setStep(0);
        setSubmitted(false);
        setSaveMessage("New draft started");
    }
    function submitDraft() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                data,
                step,
                entryMode,
                status: "ready_for_backend_submission",
                savedAt: new Date().toISOString(),
            }));
            setSubmitted(true);
        }
        catch {
            setSaveMessage("Could not save your draft. Check browser storage settings.");
        }
    }
    const institutionName = institutionTypes.find((item) => item.value === data.institutionType)?.title ??
        "Institution";
    return (_jsxs("main", { className: "rebel-onboarding", children: [_jsx("style", { children: styles }), _jsxs("div", { className: "shell", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { className: "brand", children: ["R", _jsx("span", { children: "3" }), "BEL"] }), _jsx("div", { className: "eyebrow", children: "Institutional readiness platform" })] }), !entryMode && (_jsxs(_Fragment, { children: [_jsx("div", { className: "eyebrow", children: "Institutional onboarding / 001" }), _jsxs("h1", { children: ["Make your institution", _jsx("br", {}), "ready for what comes next."] }), _jsx("p", { className: "intro", children: "Rebel begins by understanding how your institution operates. We use that profile to shape the relevant governance, risk, security and compliance journey for your organisation." }), _jsxs("div", { className: "choice-grid", children: [_jsxs("button", { className: "choice-card", onClick: () => setEntryMode("register"), children: [_jsx("div", { className: "eyebrow", children: "01 / New workspace" }), _jsx("h2", { children: "Register an institution" }), _jsx("p", { children: "Establish your institution's workspace and begin its readiness journey. The registering user will be proposed as the initial institution administrator." }), _jsx("span", { className: "eyebrow", children: "Create institution \u2192" })] }), _jsxs("button", { className: "choice-card", onClick: () => setEntryMode("join"), children: [_jsx("div", { className: "eyebrow", children: "02 / Existing workspace" }), _jsx("h2", { children: "Join an institution" }), _jsx("p", { children: "Join an organisation that already uses Rebel through an invitation issued by its authorised administrator." }), _jsx("span", { className: "eyebrow", children: "Use invitation \u2192" })] })] }), _jsx("div", { className: "notice", children: "Institutional access is controlled. Registering an institution does not grant platform-administrator privileges. Membership, permissions and invitations will be verified by Rebel's backend." })] })), entryMode === "join" && (_jsxs("section", { className: "panel", children: [_jsx("div", { className: "eyebrow", children: "Institutional access / Invitation" }), _jsx("h1", { children: "Join your institution." }), _jsx("p", { children: "Enter the invitation details supplied by your institution's administrator. Membership will be verified by the backend." }), _jsxs("div", { className: "form-grid", children: [field("invitationEmail", "Work email", "you@institution.org", "email", true), field("invitationCode", "Invitation code", "Enter your invitation code", "text", true)] }), _jsx("div", { className: "notice", children: "Invitation verification is not connected yet. This screen is the frontend entry point; the secure invitation API is the next backend implementation stage." }), _jsxs("div", { className: "actions", children: [_jsx("button", { className: "btn", onClick: () => setEntryMode(null), children: "BACK" }), _jsx("button", { className: "btn primary", disabled: true, children: "VERIFY INVITATION" })] })] })), entryMode === "register" && !submitted && (_jsxs(_Fragment, { children: [_jsx("div", { className: "eyebrow", children: "New institutional workspace" }), _jsxs("h1", { children: ["Understand the institution.", _jsx("br", {}), "Then build its readiness."] }), _jsx("p", { className: "intro", children: "Complete each stage progressively. You can save your draft and return later. Questions adapt to the type of institution you select." }), _jsxs("div", { className: "progress-wrap", children: [_jsxs("div", { className: "progress-label", children: [_jsxs("span", { children: ["STAGE ", step + 1, " OF ", steps.length, " \u2014 ", steps[step].toUpperCase()] }), _jsxs("span", { children: [progress, "%"] })] }), _jsx("div", { className: "progress-track", children: _jsx("div", { className: "progress-fill", style: { width: `${progress}%` } }) }), _jsx("div", { className: "step-dots", children: steps.map((item, index) => (_jsx("div", { className: `step-dot ${index <= step ? "active" : ""}` }, item))) })] }), _jsxs("section", { className: "panel", children: [step === 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "eyebrow", children: "Stage 01 / Classification" }), _jsx("h2", { children: "What kind of institution are we onboarding?" }), _jsx("p", { children: "This selection shapes the questions Rebel asks and helps determine which obligations may be relevant." }), _jsx("div", { className: "type-grid", children: institutionTypes.map((item) => (_jsxs("button", { type: "button", className: `type-card ${data.institutionType === item.value ? "selected" : ""}`, onClick: () => update("institutionType", item.value), children: [_jsxs("div", { className: "type-number", children: [item.symbol, " / SECTOR"] }), _jsx("div", { className: "type-title", children: item.title }), _jsx("div", { className: "type-desc", children: item.description })] }, item.value))) })] })), step === 1 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "eyebrow", children: "Stage 02 / Institutional identity" }), _jsx("h2", { children: "Establish the institution's identity." }), _jsx("p", { children: "These details establish which legal entity and operating jurisdictions the Rebel workspace represents." }), _jsxs("div", { className: "form-grid", children: [field("legalName", "Legal institution name *", "Registered legal name", "text", true), field("tradingName", "Trading or public name", "Name used in daily operations"), field("registrationNumber", "Registration or licence number", "Where applicable"), field("country", "Primary country of registration *", "e.g. India, Zimbabwe"), field("website", "Official website", "https://example.org", "url"), field("operatingCountries", "Other operating countries", "List countries where you operate", "text", true)] })] })), step === 2 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "eyebrow", children: "Stage 03 / Operating profile" }), _jsx("h2", { children: "How does your institution operate?" }), _jsx("p", { children: sector.activities }), _jsxs("div", { className: "form-grid", children: [field("employeeCount", "Approximate number of employees", "e.g. 250"), field("locations", "Number of offices or sites", "e.g. 12"), field("customerCount", "Approximate customers or beneficiaries", "e.g. 50,000"), textArea("businessActivities", "Primary activities *", sector.activities), textArea("criticalServices", "Critical services and operations", "Which services must remain available for the institution to function?")] })] })), step === 3 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "eyebrow", children: "Stage 04 / Risk and regulatory profile" }), _jsx("h2", { children: "Understand the institution's exposure." }), _jsx("p", { children: "Rebel will use this information to identify potentially relevant frameworks and obligations. Final applicability must be validated, not assumed." }), _jsxs("div", { className: "form-grid", children: [_jsxs("div", { className: "field", children: [_jsx("label", { htmlFor: "riskLevel", children: "Current perceived risk exposure" }), _jsxs("select", { id: "riskLevel", value: data.riskLevel, onChange: (event) => update("riskLevel", event.target.value), children: [_jsx("option", { value: "", children: "Select an estimate" }), _jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "moderate", children: "Moderate" }), _jsx("option", { value: "high", children: "High" }), _jsx("option", { value: "critical", children: "Critical" }), _jsx("option", { value: "unknown", children: "Not yet assessed" })] })] }), textArea("regulatoryObligations", "Regulators and regulatory obligations", sector.obligations), checks("What kinds of data does the institution handle?", dataOptions, "dataTypes"), _jsxs("div", { className: "field full", children: [_jsx("label", { children: "Frameworks already adopted or being considered" }), _jsx("p", { className: "hint", children: "Select only those relevant to your institution. Rebel will assess applicability using your sector and jurisdiction." }), _jsx("div", { className: "check-grid", children: frameworkOptions.map((option) => (_jsxs("label", { className: "check-item", children: [_jsx("input", { type: "checkbox", checked: data.existingFrameworks.includes(option), onChange: () => toggleArray("existingFrameworks", option) }), option] }, option))) })] })] })] })), step === 4 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "eyebrow", children: "Stage 05 / Governance structure" }), _jsx("h2", { children: "Who is responsible for institutional assurance?" }), _jsx("p", { children: "Identify functions and responsibilities. Named individuals and formal assignments can be configured securely after the institution workspace is created." }), _jsxs("div", { className: "form-grid", children: [field("complianceOwner", "Compliance function or owner", "e.g. Chief Compliance Officer"), field("securityOwner", "Information security function or owner", "e.g. CISO / IT Security Lead"), field("auditFunction", "Internal audit function", "e.g. Internal Audit Department"), textArea("governanceNotes", "Governance structure and oversight", "Describe board oversight, risk committees, reporting lines and relevant governance arrangements.")] }), _jsx("div", { className: "notice", children: "Do not enter passwords, personal identity numbers or other sensitive personal information in this initial profile." })] })), step === 5 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "eyebrow", children: "Stage 06 / Technology environment" }), _jsx("h2", { children: "Map the technology supporting your institution." }), _jsx("p", { children: sector.systems }), _jsxs("div", { className: "form-grid", children: [checks("Cloud and hosting environment", cloudOptions, "cloudEnvironment"), checks("Technology and infrastructure in use", infrastructureOptions, "infrastructure"), field("identityProvider", "Identity provider", "e.g. Microsoft Entra ID, Okta, Active Directory", "text", true), textArea("criticalSystems", "Critical applications and platforms", sector.systems), textArea("securityTools", "Existing security and monitoring tools", "e.g. SIEM, EDR, vulnerability management, firewalls, backup and incident response tools")] })] })), step === 6 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "eyebrow", children: "Stage 07 / Institutional profile review" }), _jsx("h2", { children: "Review the institution profile." }), _jsx("p", { children: "This is the starting profile for the institution's readiness programme. You will be able to refine it as the assessment progresses." }), _jsxs("div", { className: "section-block", children: [_jsxs("div", { className: "summary-row", children: [_jsx("strong", { children: "Institution" }), _jsx("span", { children: data.legalName || "Not provided" })] }), _jsxs("div", { className: "summary-row", children: [_jsx("strong", { children: "Institution type" }), _jsx("span", { children: institutionName })] }), _jsxs("div", { className: "summary-row", children: [_jsx("strong", { children: "Country" }), _jsx("span", { children: data.country || "Not provided" })] }), _jsxs("div", { className: "summary-row", children: [_jsx("strong", { children: "Operating countries" }), _jsx("span", { children: data.operatingCountries || "Not provided" })] }), _jsxs("div", { className: "summary-row", children: [_jsx("strong", { children: "Activities" }), _jsx("span", { children: data.businessActivities || "Not provided" })] }), _jsxs("div", { className: "summary-row", children: [_jsx("strong", { children: "Risk estimate" }), _jsx("span", { children: data.riskLevel || "Not assessed" })] }), _jsxs("div", { className: "summary-row", children: [_jsx("strong", { children: "Data handled" }), _jsx("span", { children: data.dataTypes.join(", ") || "Not specified" })] }), _jsxs("div", { className: "summary-row", children: [_jsx("strong", { children: "Existing frameworks" }), _jsx("span", { children: data.existingFrameworks.join(", ") || "Not specified" })] }), _jsxs("div", { className: "summary-row", children: [_jsx("strong", { children: "Technology" }), _jsx("span", { children: data.infrastructure.join(", ") || "Not specified" })] })] }), _jsx("div", { className: "notice", children: "Submitting this draft does not certify compliance or create verified control coverage. The next stage will securely register the institution, establish its administrator membership and persist this profile through the backend. Rebel will then calculate applicable obligations and build an evidence-based readiness roadmap." })] })), _jsxs("div", { className: "actions", children: [_jsxs("div", { children: [_jsx("button", { className: "btn", onClick: step === 0 ? () => setEntryMode(null) : back, children: "BACK" }), step > 0 && (_jsx("button", { className: "btn", style: { marginLeft: 8 }, onClick: resetDraft, children: "START OVER" }))] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14 }, children: [_jsx("span", { className: "save-status", children: saveMessage }), step < steps.length - 1 ? (_jsx("button", { className: "btn primary", onClick: next, disabled: !canContinue(), children: "CONTINUE \u2192" })) : (_jsx("button", { className: "btn primary", onClick: submitDraft, children: "SAVE INSTITUTION PROFILE" }))] })] })] })] })), submitted && (_jsxs("section", { className: "panel", children: [_jsx("div", { className: "success-mark", children: "\u2713" }), _jsx("div", { className: "eyebrow", children: "Institutional profile / Draft saved" }), _jsx("h1", { children: "Profile prepared." }), _jsxs("p", { children: ["The initial profile for ", _jsx("strong", { children: data.legalName }), " has been saved in this browser. It is ready for connection to Rebel's institutional registration API."] }), _jsx("div", { className: "notice", children: "This is not yet a registered backend institution. No account, administrator membership or compliance status has been created on the server at this stage." }), _jsxs("div", { className: "actions", children: [_jsx("button", { className: "btn", onClick: () => setSubmitted(false), children: "REVIEW PROFILE" }), _jsx("button", { className: "btn primary", onClick: resetDraft, children: "START ANOTHER INSTITUTION" })] })] }))] })] }));
}
