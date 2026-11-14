
import React, { useEffect, useMemo, useState } from "react";

type InstitutionType =
  | "financial"
  | "healthcare"
  | "government"
  | "corporate"
  | "technology"
  | "education"
  | "nonprofit"
  | "other";

type EntryMode = "register" | "join";

interface OnboardingData {
  institutionType: InstitutionType | "";
  legalName: string;
  tradingName: string;
  country: string;
  website: string;
  registrationNumber: string;
  operatingCountries: string;
  employeeCount: string;
  locations: string;
  customerCount: string;
  businessActivities: string;
  criticalServices: string;
  dataTypes: string[];
  riskLevel: string;
  regulatoryObligations: string;
  existingFrameworks: string[];
  complianceOwner: string;
  securityOwner: string;
  auditFunction: string;
  governanceNotes: string;
  cloudEnvironment: string[];
  infrastructure: string[];
  identityProvider: string;
  securityTools: string;
  criticalSystems: string;
  invitationCode: string;
  invitationEmail: string;
}

const STORAGE_KEY = "rebel_institution_onboarding_v1";

const initialData: OnboardingData = {
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

const institutionTypes: {
  value: InstitutionType;
  title: string;
  description: string;
  symbol: string;
}[] = [
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

const sectorPrompts: Record<
  InstitutionType,
  { activities: string; systems: string; obligations: string }
> = {
  financial: {
    activities:
      "Describe your financial activities: deposits, lending, payments, insurance, investment, remittances or other services.",
    systems:
      "Examples: core banking, payment processing, mobile banking, trading systems, AML and fraud platforms.",
    obligations:
      "List applicable financial regulators, licensing requirements, AML obligations and payment standards. Include the jurisdiction.",
  },
  healthcare: {
    activities:
      "Describe your healthcare activities: clinical care, diagnostics, laboratories, pharmacies or health administration.",
    systems:
      "Examples: electronic health records, laboratory systems, clinical applications and medical devices.",
    obligations:
      "List applicable health-data privacy, patient safety, medical-device and healthcare regulatory obligations.",
  },
  government: {
    activities:
      "Describe your public mandate, citizen services, public programmes and critical government functions.",
    systems:
      "Examples: citizen identity systems, public-service platforms, government networks and classified-data systems.",
    obligations:
      "List applicable public-sector cybersecurity policies, national requirements, data classification and procurement obligations.",
  },
  corporate: {
    activities:
      "Describe your main commercial activities, supply chains, business units and services.",
    systems:
      "Examples: ERP, CRM, manufacturing systems, supply-chain platforms and business applications.",
    obligations:
      "List applicable industry regulations, privacy requirements, contractual obligations and jurisdictions.",
  },
  technology: {
    activities:
      "Describe your technology services: SaaS, hosting, telecommunications, software development or infrastructure operations.",
    systems:
      "Examples: cloud platforms, source-code repositories, CI/CD, production environments, APIs and customer platforms.",
    obligations:
      "List applicable service-provider, privacy, security, data-residency and contractual requirements.",
  },
  education: {
    activities:
      "Describe your education and research activities, campuses, programmes and external research partnerships.",
    systems:
      "Examples: student information systems, learning platforms, research repositories, campus networks and identity systems.",
    obligations:
      "List applicable education, student privacy, research-data, funding and institutional requirements.",
  },
  nonprofit: {
    activities:
      "Describe your mission, programmes, beneficiaries, funding and operational activities.",
    systems:
      "Examples: donor platforms, beneficiary databases, financial systems and programme-management tools.",
    obligations:
      "List applicable charity, financial reporting, privacy, donor and cross-border funding obligations.",
  },
  other: {
    activities:
      "Describe your institution's primary activities, services and operating model.",
    systems:
      "List the systems and infrastructure that support your most important services.",
    obligations:
      "List known regulatory, contractual, licensing and jurisdictional obligations.",
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
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [saveMessage, setSaveMessage] = useState("Draft not saved yet");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (parsed?.data) {
        setData({ ...initialData, ...parsed.data });
        setStep(
          Number.isInteger(parsed.step)
            ? Math.min(Math.max(parsed.step, 0), 6)
            : 0
        );
        setEntryMode(parsed.entryMode ?? null);
        setSaveMessage("Previous draft restored");
      }
    } catch {
      setSaveMessage("A previous draft could not be restored");
    }
  }, []);

  useEffect(() => {
    if (!entryMode || submitted) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ data, step, entryMode, savedAt: new Date().toISOString() })
      );
      setSaveMessage("Draft saved on this device");
    } catch {
      setSaveMessage("Draft could not be saved in this browser");
    }
  }, [data, step, entryMode, submitted]);

  const sector = data.institutionType
    ? sectorPrompts[data.institutionType]
    : sectorPrompts.other;

  const progress = useMemo(
    () => Math.round(((step + 1) / steps.length) * 100),
    [step]
  );

  function update<K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K]
  ) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function toggleArray(
    key: "dataTypes" | "existingFrameworks" | "cloudEnvironment" | "infrastructure",
    value: string
  ) {
    const current = data[key];
    update(
      key,
      (current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]) as OnboardingData[typeof key]
    );
  }

  function field(
    key: keyof OnboardingData,
    label: string,
    placeholder = "",
    type = "text",
    full = false
  ) {
    return (
      <div className={`field ${full ? "full" : ""}`} key={key}>
        <label htmlFor={String(key)}>{label}</label>
        <input
          id={String(key)}
          type={type}
          value={String(data[key] ?? "")}
          placeholder={placeholder}
          onChange={(event) =>
            update(key, event.target.value as OnboardingData[typeof key])
          }
        />
      </div>
    );
  }

  function textArea(
    key: keyof OnboardingData,
    label: string,
    placeholder: string
  ) {
    return (
      <div className="field full" key={key}>
        <label htmlFor={String(key)}>{label}</label>
        <textarea
          id={String(key)}
          value={String(data[key] ?? "")}
          placeholder={placeholder}
          onChange={(event) =>
            update(key, event.target.value as OnboardingData[typeof key])
          }
        />
      </div>
    );
  }

  function checks(
    title: string,
    options: string[],
    key:
      | "dataTypes"
      | "existingFrameworks"
      | "cloudEnvironment"
      | "infrastructure"
  ) {
    return (
      <div className="field full">
        <label>{title}</label>
        <div className="check-grid">
          {options.map((option) => (
            <label className="check-item" key={option}>
              <input
                type="checkbox"
                checked={data[key].includes(option)}
                onChange={() => toggleArray(key, option)}
              />
              {option}
            </label>
          ))}
        </div>
      </div>
    );
  }

  function canContinue() {
    if (step === 0) return Boolean(data.institutionType);
    if (step === 1) return Boolean(data.legalName.trim() && data.country.trim());
    return true;
  }

  function next() {
    if (!canContinue()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetDraft() {
    if (!window.confirm("Start a new institutional onboarding draft?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setData(initialData);
    setEntryMode(null);
    setStep(0);
    setSubmitted(false);
    setSaveMessage("New draft started");
  }

  function submitDraft() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          data,
          step,
          entryMode,
          status: "ready_for_backend_submission",
          savedAt: new Date().toISOString(),
        })
      );
      setSubmitted(true);
    } catch {
      setSaveMessage("Could not save your draft. Check browser storage settings.");
    }
  }

  const institutionName =
    institutionTypes.find((item) => item.value === data.institutionType)?.title ??
    "Institution";

  return (
    <main className="rebel-onboarding">
      <style>{styles}</style>

      <div className="shell">
        <header className="topbar">
          <div className="brand">
            R<span>3</span>BEL
          </div>
          <div className="eyebrow">Institutional readiness platform</div>
        </header>

        {!entryMode && (
          <>
            <div className="eyebrow">Institutional onboarding / 001</div>
            <h1>Make your institution<br />ready for what comes next.</h1>
            <p className="intro">
              Rebel begins by understanding how your institution operates.
              We use that profile to shape the relevant governance, risk,
              security and compliance journey for your organisation.
            </p>

            <div className="choice-grid">
              <button
                className="choice-card"
                onClick={() => setEntryMode("register")}
              >
                <div className="eyebrow">01 / New workspace</div>
                <h2>Register an institution</h2>
                <p>
                  Establish your institution's workspace and begin its
                  readiness journey. The registering user will be proposed
                  as the initial institution administrator.
                </p>
                <span className="eyebrow">Create institution →</span>
              </button>

              <button
                className="choice-card"
                onClick={() => setEntryMode("join")}
              >
                <div className="eyebrow">02 / Existing workspace</div>
                <h2>Join an institution</h2>
                <p>
                  Join an organisation that already uses Rebel through an
                  invitation issued by its authorised administrator.
                </p>
                <span className="eyebrow">Use invitation →</span>
              </button>
            </div>

            <div className="notice">
              Institutional access is controlled. Registering an institution
              does not grant platform-administrator privileges. Membership,
              permissions and invitations will be verified by Rebel's backend.
            </div>
          </>
        )}

        {entryMode === "join" && (
          <section className="panel">
            <div className="eyebrow">Institutional access / Invitation</div>
            <h1>Join your institution.</h1>
            <p>
              Enter the invitation details supplied by your institution's
              administrator. Membership will be verified by the backend.
            </p>
            <div className="form-grid">
              {field("invitationEmail", "Work email", "you@institution.org", "email", true)}
              {field("invitationCode", "Invitation code", "Enter your invitation code", "text", true)}
            </div>
            <div className="notice">
              Invitation verification is not connected yet. This screen is
              the frontend entry point; the secure invitation API is the next
              backend implementation stage.
            </div>
            <div className="actions">
              <button className="btn" onClick={() => setEntryMode(null)}>
                BACK
              </button>
              <button className="btn primary" disabled>
                VERIFY INVITATION
              </button>
            </div>
          </section>
        )}

        {entryMode === "register" && !submitted && (
          <>
            <div className="eyebrow">New institutional workspace</div>
            <h1>Understand the institution.<br />Then build its readiness.</h1>
            <p className="intro">
              Complete each stage progressively. You can save your draft and
              return later. Questions adapt to the type of institution you select.
            </p>

            <div className="progress-wrap">
              <div className="progress-label">
                <span>STAGE {step + 1} OF {steps.length} — {steps[step].toUpperCase()}</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="step-dots">
                {steps.map((item, index) => (
                  <div
                    key={item}
                    className={`step-dot ${index <= step ? "active" : ""}`}
                  />
                ))}
              </div>
            </div>

            <section className="panel">
              {step === 0 && (
                <>
                  <div className="eyebrow">Stage 01 / Classification</div>
                  <h2>What kind of institution are we onboarding?</h2>
                  <p>
                    This selection shapes the questions Rebel asks and helps
                    determine which obligations may be relevant.
                  </p>
                  <div className="type-grid">
                    {institutionTypes.map((item) => (
                      <button
                        type="button"
                        key={item.value}
                        className={`type-card ${data.institutionType === item.value ? "selected" : ""}`}
                        onClick={() => update("institutionType", item.value)}
                      >
                        <div className="type-number">{item.symbol} / SECTOR</div>
                        <div className="type-title">{item.title}</div>
                        <div className="type-desc">{item.description}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="eyebrow">Stage 02 / Institutional identity</div>
                  <h2>Establish the institution's identity.</h2>
                  <p>
                    These details establish which legal entity and operating
                    jurisdictions the Rebel workspace represents.
                  </p>
                  <div className="form-grid">
                    {field("legalName", "Legal institution name *", "Registered legal name", "text", true)}
                    {field("tradingName", "Trading or public name", "Name used in daily operations")}
                    {field("registrationNumber", "Registration or licence number", "Where applicable")}
                    {field("country", "Primary country of registration *", "e.g. India, Zimbabwe")}
                    {field("website", "Official website", "https://example.org", "url")}
                    {field("operatingCountries", "Other operating countries", "List countries where you operate", "text", true)}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="eyebrow">Stage 03 / Operating profile</div>
                  <h2>How does your institution operate?</h2>
                  <p>{sector.activities}</p>
                  <div className="form-grid">
                    {field("employeeCount", "Approximate number of employees", "e.g. 250")}
                    {field("locations", "Number of offices or sites", "e.g. 12")}
                    {field("customerCount", "Approximate customers or beneficiaries", "e.g. 50,000")}
                    {textArea("businessActivities", "Primary activities *", sector.activities)}
                    {textArea("criticalServices", "Critical services and operations", "Which services must remain available for the institution to function?")}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="eyebrow">Stage 04 / Risk and regulatory profile</div>
                  <h2>Understand the institution's exposure.</h2>
                  <p>
                    Rebel will use this information to identify potentially
                    relevant frameworks and obligations. Final applicability
                    must be validated, not assumed.
                  </p>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="riskLevel">Current perceived risk exposure</label>
                      <select
                        id="riskLevel"
                        value={data.riskLevel}
                        onChange={(event) => update("riskLevel", event.target.value)}
                      >
                        <option value="">Select an estimate</option>
                        <option value="low">Low</option>
                        <option value="moderate">Moderate</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                        <option value="unknown">Not yet assessed</option>
                      </select>
                    </div>
                    {textArea("regulatoryObligations", "Regulators and regulatory obligations", sector.obligations)}
                    {checks("What kinds of data does the institution handle?", dataOptions, "dataTypes")}
                    <div className="field full">
                      <label>Frameworks already adopted or being considered</label>
                      <p className="hint">
                        Select only those relevant to your institution. Rebel
                        will assess applicability using your sector and jurisdiction.
                      </p>
                      <div className="check-grid">
                        {frameworkOptions.map((option) => (
                          <label className="check-item" key={option}>
                            <input
                              type="checkbox"
                              checked={data.existingFrameworks.includes(option)}
                              onChange={() => toggleArray("existingFrameworks", option)}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="eyebrow">Stage 05 / Governance structure</div>
                  <h2>Who is responsible for institutional assurance?</h2>
                  <p>
                    Identify functions and responsibilities. Named individuals
                    and formal assignments can be configured securely after
                    the institution workspace is created.
                  </p>
                  <div className="form-grid">
                    {field("complianceOwner", "Compliance function or owner", "e.g. Chief Compliance Officer")}
                    {field("securityOwner", "Information security function or owner", "e.g. CISO / IT Security Lead")}
                    {field("auditFunction", "Internal audit function", "e.g. Internal Audit Department")}
                    {textArea("governanceNotes", "Governance structure and oversight", "Describe board oversight, risk committees, reporting lines and relevant governance arrangements.")}
                  </div>
                  <div className="notice">
                    Do not enter passwords, personal identity numbers or other
                    sensitive personal information in this initial profile.
                  </div>
                </>
              )}

              {step === 5 && (
                <>
                  <div className="eyebrow">Stage 06 / Technology environment</div>
                  <h2>Map the technology supporting your institution.</h2>
                  <p>{sector.systems}</p>
                  <div className="form-grid">
                    {checks("Cloud and hosting environment", cloudOptions, "cloudEnvironment")}
                    {checks("Technology and infrastructure in use", infrastructureOptions, "infrastructure")}
                    {field("identityProvider", "Identity provider", "e.g. Microsoft Entra ID, Okta, Active Directory", "text", true)}
                    {textArea("criticalSystems", "Critical applications and platforms", sector.systems)}
                    {textArea("securityTools", "Existing security and monitoring tools", "e.g. SIEM, EDR, vulnerability management, firewalls, backup and incident response tools")}
                  </div>
                </>
              )}

              {step === 6 && (
                <>
                  <div className="eyebrow">Stage 07 / Institutional profile review</div>
                  <h2>Review the institution profile.</h2>
                  <p>
                    This is the starting profile for the institution's readiness
                    programme. You will be able to refine it as the assessment progresses.
                  </p>
                  <div className="section-block">
                    <div className="summary-row">
                      <strong>Institution</strong>
                      <span>{data.legalName || "Not provided"}</span>
                    </div>
                    <div className="summary-row">
                      <strong>Institution type</strong>
                      <span>{institutionName}</span>
                    </div>
                    <div className="summary-row">
                      <strong>Country</strong>
                      <span>{data.country || "Not provided"}</span>
                    </div>
                    <div className="summary-row">
                      <strong>Operating countries</strong>
                      <span>{data.operatingCountries || "Not provided"}</span>
                    </div>
                    <div className="summary-row">
                      <strong>Activities</strong>
                      <span>{data.businessActivities || "Not provided"}</span>
                    </div>
                    <div className="summary-row">
                      <strong>Risk estimate</strong>
                      <span>{data.riskLevel || "Not assessed"}</span>
                    </div>
                    <div className="summary-row">
                      <strong>Data handled</strong>
                      <span>{data.dataTypes.join(", ") || "Not specified"}</span>
                    </div>
                    <div className="summary-row">
                      <strong>Existing frameworks</strong>
                      <span>{data.existingFrameworks.join(", ") || "Not specified"}</span>
                    </div>
                    <div className="summary-row">
                      <strong>Technology</strong>
                      <span>{data.infrastructure.join(", ") || "Not specified"}</span>
                    </div>
                  </div>
                  <div className="notice">
                    Submitting this draft does not certify compliance or create
                    verified control coverage. The next stage will securely
                    register the institution, establish its administrator
                    membership and persist this profile through the backend.
                    Rebel will then calculate applicable obligations and build
                    an evidence-based readiness roadmap.
                  </div>
                </>
              )}

              <div className="actions">
                <div>
                  <button className="btn" onClick={step === 0 ? () => setEntryMode(null) : back}>
                    BACK
                  </button>
                  {step > 0 && (
                    <button className="btn" style={{ marginLeft: 8 }} onClick={resetDraft}>
                      START OVER
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span className="save-status">{saveMessage}</span>
                  {step < steps.length - 1 ? (
                    <button
                      className="btn primary"
                      onClick={next}
                      disabled={!canContinue()}
                    >
                      CONTINUE →
                    </button>
                  ) : (
                    <button className="btn primary" onClick={submitDraft}>
                      SAVE INSTITUTION PROFILE
                    </button>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {submitted && (
          <section className="panel">
            <div className="success-mark">✓</div>
            <div className="eyebrow">Institutional profile / Draft saved</div>
            <h1>Profile prepared.</h1>
            <p>
              The initial profile for <strong>{data.legalName}</strong> has been
              saved in this browser. It is ready for connection to Rebel's
              institutional registration API.
            </p>
            <div className="notice">
              This is not yet a registered backend institution. No account,
              administrator membership or compliance status has been created
              on the server at this stage.
            </div>
            <div className="actions">
              <button className="btn" onClick={() => setSubmitted(false)}>
                REVIEW PROFILE
              </button>
              <button className="btn primary" onClick={resetDraft}>
                START ANOTHER INSTITUTION
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
