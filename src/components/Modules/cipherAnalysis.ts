// ─── cipherAnalysis.ts ────────────────────────────────────────────────────────
// Parses TLS cipher suite strings into components and produces
// accurate DORA/NIST findings. Drop into src/utils/ or src/components/Modules/

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CipherComponents {
  keyExchange:   string;   // ECDHE, RSA, DHE, etc.
  authentication:string;   // RSA, ECDSA, anon
  bulkCipher:    string;   // AES-256-GCM, AES-128-CBC, RC4, DES, 3DES
  mac:           string;   // SHA384, SHA256, SHA, MD5
  pfs:           boolean;  // Perfect Forward Secrecy
  raw:           string;   // original string
}

export interface CipherFinding {
  severity:    "critical" | "high" | "medium" | "low" | "ok";
  code:        string;   // machine-readable DORA finding code
  title:       string;
  description: string;
  doraArticle: string;
  remediation: string;
}

export interface CipherAnalysis {
  components:  CipherComponents;
  findings:    CipherFinding[];
  overallRisk: "critical" | "high" | "medium" | "low" | "ok";
  pqcImpact:   string;  // how this cipher behaves post-quantum
}

// ── Cipher string parser ───────────────────────────────────────────────────────
// Handles both IANA format (TLS_AES_256_GCM_SHA384) and
// OpenSSL format (ECDHE-RSA-AES256-GCM-SHA384)
export function parseCipher(cipher: string): CipherComponents {
  if (!cipher) return unknown(cipher);
  const c = cipher.trim().toUpperCase();

  // ── TLS 1.3 IANA format ──────────────────────────────────────────────────
  // TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256, TLS_AES_128_GCM_SHA256
  if (c.startsWith("TLS_") && !c.includes("WITH")) {
    // TLS 1.3 always uses ECDHE key exchange — it's baked into the protocol
    const sha = c.includes("SHA384") ? "SHA-384"
              : c.includes("SHA256") ? "SHA-256"
              : c.includes("SHA")    ? "SHA-1"   : "unknown";

    const bulk = c.includes("AES_256_GCM")       ? "AES-256-GCM"
               : c.includes("AES_128_GCM")       ? "AES-128-GCM"
               : c.includes("CHACHA20_POLY1305") ? "ChaCha20-Poly1305"
               : c.includes("AES_256_CCM")       ? "AES-256-CCM"
               : c.includes("AES_128_CCM")       ? "AES-128-CCM"   : "unknown";

    return {
      keyExchange:    "ECDHE (TLS 1.3)",
      authentication: "Certificate",
      bulkCipher:     bulk,
      mac:            sha,
      pfs:            true,
      raw:            cipher,
    };
  }

  // ── TLS 1.2 IANA format with WITH keyword ────────────────────────────────
  // TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
  // TLS_RSA_WITH_AES_128_CBC_SHA256
  // TLS_RSA_WITH_DES_CBC_SHA
  // TLS_RSA_WITH_RC4_128_SHA
  if (c.includes("_WITH_")) {
    const [prefix, suffix] = c.split("_WITH_");

    const kx = prefix.includes("ECDHE")  ? "ECDHE"
              : prefix.includes("DHE")   ? "DHE"
              : prefix.includes("ECDH")  ? "ECDH"
              : prefix.includes("DH")    ? "DH"
              : prefix.includes("RSA")   ? "RSA"
              : prefix.includes("PSK")   ? "PSK"
              : prefix.includes("SRP")   ? "SRP"   : "unknown";

    const auth = prefix.includes("ECDSA") ? "ECDSA"
               : prefix.includes("RSA")  ? "RSA"
               : prefix.includes("DSS")  ? "DSS"
               : prefix.includes("anon") ? "anon"  : "RSA";

    const bulk = suffix.includes("AES_256_GCM")  ? "AES-256-GCM"
               : suffix.includes("AES_128_GCM")  ? "AES-128-GCM"
               : suffix.includes("AES_256_CBC")  ? "AES-256-CBC"
               : suffix.includes("AES_128_CBC")  ? "AES-128-CBC"
               : suffix.includes("3DES_EDE_CBC") ? "3DES-CBC"
               : suffix.includes("DES_CBC")      ? "DES-CBC"
               : suffix.includes("RC4_128")      ? "RC4-128"
               : suffix.includes("RC4_40")       ? "RC4-40"
               : suffix.includes("NULL")         ? "NULL"
               : suffix.includes("CAMELLIA")     ? "Camellia"
               : suffix.includes("ARIA")         ? "ARIA"         : "unknown";

    const mac = suffix.includes("SHA384") ? "SHA-384"
              : suffix.includes("SHA256") ? "SHA-256"
              : suffix.includes("SHA")    ? "SHA-1"
              : suffix.includes("MD5")    ? "MD5"
              : suffix.includes("NULL")   ? "NULL"    : "unknown";

    const pfs = kx === "ECDHE" || kx === "DHE";

    return { keyExchange: kx, authentication: auth, bulkCipher: bulk, mac, pfs, raw: cipher };
  }

  // ── OpenSSL shorthand format ──────────────────────────────────────────────
  // ECDHE-RSA-AES256-GCM-SHA384, ECDHE-ECDSA-AES256-GCM-SHA384
  // AES128-SHA, RC4-MD5, DES-CBC-SHA
  const parts = c.split("-");

  const kx = c.startsWith("ECDHE") ? "ECDHE"
            : c.startsWith("DHE")  ? "DHE"
            : c.startsWith("ECDH") ? "ECDH"
            : c.startsWith("DH")   ? "DH"
            : c.startsWith("RSA")  ? "RSA"
            : c.startsWith("ADH")  ? "anon-DH"
            : c.startsWith("AECDH")? "anon-ECDH" : "RSA";

  const auth = c.includes("ECDSA") ? "ECDSA"
             : c.includes("RSA")   ? "RSA"
             : c.includes("DSS")   ? "DSS"       : "RSA";

  const bulk = c.includes("AES256-GCM") || c.includes("AES-256-GCM")  ? "AES-256-GCM"
             : c.includes("AES128-GCM") || c.includes("AES-128-GCM")  ? "AES-128-GCM"
             : c.includes("AES256-CCM")                                ? "AES-256-CCM"
             : c.includes("AES128-CCM")                                ? "AES-128-CCM"
             : c.includes("AES256-CBC") || c.includes("AES256")        ? "AES-256-CBC"
             : c.includes("AES128-CBC") || c.includes("AES128")        ? "AES-128-CBC"
             : c.includes("3DES")                                      ? "3DES-CBC"
             : c.includes("DES-CBC") || c.includes("DES")              ? "DES-CBC"
             : c.includes("RC4-128") || c.includes("RC4")              ? "RC4-128"
             : c.includes("CHACHA20")                                  ? "ChaCha20-Poly1305"
             : c.includes("CAMELLIA")                                  ? "Camellia"
             : c.includes("NULL")                                      ? "NULL"     : "unknown";

  const mac = c.endsWith("SHA384") ? "SHA-384"
            : c.endsWith("SHA256") ? "SHA-256"
            : c.endsWith("SHA")    ? "SHA-1"
            : c.endsWith("MD5")    ? "MD5"
            : c.endsWith("NULL")   ? "NULL"     : "unknown";

  const pfs = kx === "ECDHE" || kx === "DHE";

  return { keyExchange: kx, authentication: auth, bulkCipher: bulk, mac, pfs, raw: cipher };
}

function unknown(raw: string): CipherComponents {
  return {
    keyExchange: "unknown", authentication: "unknown",
    bulkCipher: "unknown", mac: "unknown", pfs: false, raw,
  };
}

// ── Finding generator ─────────────────────────────────────────────────────────
// Produces specific DORA-mapped findings from parsed cipher components.
// Each finding maps to a DORA article and a specific NIST/BSI reference.
export function analyseCipher(
  components: CipherComponents,
  tlsVersion: string
): CipherFinding[] {
  const findings: CipherFinding[] = [];
  const { keyExchange: kx, bulkCipher: bulk, mac, pfs } = components;

  // ── 1. No Perfect Forward Secrecy ────────────────────────────────────────
  if (!pfs && tlsVersion !== "1.3") {
    findings.push({
      severity:    "high",
      code:        "NO-PFS-001",
      title:       "No Perfect Forward Secrecy",
      description: `Key exchange is ${kx}. Static RSA key exchange means all past sessions are ` +
                   "decryptable if the server's private key is ever compromised. " +
                   "Adversaries recording traffic today can decrypt it once quantum computers are available.",
      doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
      remediation: "Migrate to ECDHE or DHE key exchange. Disable RSA key exchange cipher suites " +
                   "in server configuration. Enforce TLS 1.3 which mandates PFS.",
    });
  }

  // ── 2. Broken bulk ciphers ────────────────────────────────────────────────
  if (bulk === "DES-CBC" || bulk === "NULL") {
    findings.push({
      severity:    "critical",
      code:        "BROKEN-CIPHER-001",
      title:       "Broken bulk cipher — DES / NULL",
      description: `Cipher suite uses ${bulk}. DES has a 56-bit key space and was broken in 1997. ` +
                   "NULL provides no encryption at all. Both are prohibited under NIST SP 800-52r2.",
      doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
      remediation: "Immediately disable all DES and NULL cipher suites. " +
                   "Replace with TLS_AES_256_GCM_SHA384 under TLS 1.3.",
    });
  }

  if (bulk === "RC4-128" || bulk === "RC4-40") {
    findings.push({
      severity:    "critical",
      code:        "BROKEN-CIPHER-002",
      title:       "Broken bulk cipher — RC4",
      description: "RC4 has known statistical biases that allow plaintext recovery. " +
                   "Prohibited by RFC 7465. Multiple practical attacks published since 2013. " +
                   "Any data encrypted with RC4 should be considered compromised.",
      doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
      remediation: "Immediately disable RC4 cipher suites. Deploy TLS_AES_256_GCM_SHA384.",
    });
  }

  if (bulk === "3DES-CBC") {
    findings.push({
      severity:    "high",
      code:        "WEAK-CIPHER-001",
      title:       "Deprecated bulk cipher — 3DES (SWEET32 vulnerable)",
      description: "3DES uses a 64-bit block size making it vulnerable to the SWEET32 birthday attack " +
                   "(CVE-2016-2183). Deprecated by NIST since 2017. Prohibited in TLS 1.3.",
      doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
      remediation: "Disable 3DES cipher suites. Migrate to AES-256-GCM.",
    });
  }

  // ── 3. CBC mode (padding oracle risk) ────────────────────────────────────
  if (bulk?.includes("CBC") && !bulk.includes("DES")) {
    findings.push({
      severity:    "medium",
      code:        "CBC-MODE-001",
      title:       "CBC mode encryption — padding oracle risk",
      description: `Bulk cipher ${bulk} uses Cipher Block Chaining mode. ` +
                   "CBC is vulnerable to BEAST (TLS 1.0), Lucky13, and POODLE attacks. " +
                   "While mitigations exist, GCM mode is strictly preferable for DORA compliance.",
      doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
      remediation: "Migrate to AES-256-GCM or AES-128-GCM. " +
                   "Disable all CBC-mode cipher suites in server configuration.",
    });
  }

  // ── 4. Weak MAC ───────────────────────────────────────────────────────────
  if (mac === "SHA-1") {
    findings.push({
      severity:    "medium",
      code:        "WEAK-MAC-001",
      title:       "SHA-1 MAC — collision attacks possible",
      description: "SHA-1 was broken in 2017 (SHAttered attack, CWE-327). " +
                   "NIST deprecated SHA-1 for all cryptographic uses as of 2023. " +
                   "BSI TR-02102-2 prohibits SHA-1 in new TLS deployments.",
      doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
      remediation: "Use cipher suites with SHA-256 or SHA-384. " +
                   "Deploy TLS 1.3 which uses HKDF and eliminates MAC negotiation.",
    });
  }

  if (mac === "MD5") {
    findings.push({
      severity:    "critical",
      code:        "BROKEN-MAC-001",
      title:       "MD5 MAC — cryptographically broken",
      description: "MD5 was fully broken for collision resistance in 2004. " +
                   "Practical chosen-prefix attacks demonstrated in 2009. " +
                   "Prohibited by all major standards bodies including NIST and BSI.",
      doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
      remediation: "Immediately disable all MD5 cipher suites.",
    });
  }

  // ── 5. TLS version issues ─────────────────────────────────────────────────
  if (tlsVersion === "1.0") {
    findings.push({
      severity:    "critical",
      code:        "TLS-VER-001",
      title:       "TLS 1.0 — prohibited",
      description: "TLS 1.0 was deprecated in 2021 (RFC 8996). " +
                   "Vulnerable to BEAST, POODLE, and CRIME attacks. " +
                   "PCI-DSS 4.0 prohibits TLS 1.0 effective March 2024. " +
                   "RBI IT Framework requires minimum TLS 1.2.",
      doraArticle: "DORA Art. 9.4 — Cryptographic Controls · PCI-DSS 4.0 Req 4.2.1",
      remediation: "Disable TLS 1.0 and 1.1 immediately. Enable TLS 1.2 minimum, TLS 1.3 preferred.",
    });
  } else if (tlsVersion === "1.1") {
    findings.push({
      severity:    "high",
      code:        "TLS-VER-002",
      title:       "TLS 1.1 — deprecated",
      description: "TLS 1.1 was deprecated in 2021 (RFC 8996). " +
                   "No longer supported by major browsers since 2020. " +
                   "Shares many vulnerabilities with TLS 1.0.",
      doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
      remediation: "Disable TLS 1.1. Enable TLS 1.2 minimum, TLS 1.3 preferred.",
    });
  } else if (tlsVersion === "1.2") {
    findings.push({
      severity:    "low",
      code:        "TLS-VER-003",
      title:       "TLS 1.2 — supported but not optimal",
      description: "TLS 1.2 is currently acceptable under NIST SP 800-52r2 and RBI guidelines. " +
                   "However it requires careful cipher suite configuration to be secure. " +
                   "TLS 1.3 is strongly recommended for all new and public-facing deployments.",
      doraArticle: "DORA Art. 9.4 — best practice",
      remediation: "Enable TLS 1.3 alongside TLS 1.2. Plan migration to TLS 1.3-only by 2026.",
    });
  }

  // ── 6. Post-quantum vulnerability ─────────────────────────────────────────
  // ECDHE with secp256r1 or above has ~128-bit classical security
  // but is completely broken by Shor's algorithm on a quantum computer.
  // RSA key exchange is broken even faster.
  const isQuantumVulnerable =
    kx.includes("ECDHE") || kx.includes("RSA") ||
    kx.includes("DHE")   || kx.includes("ECDH");

  if (isQuantumVulnerable) {
    findings.push({
      severity:    "medium",
      code:        "PQC-001",
      title:       "Quantum-vulnerable key exchange",
      description: `${kx} key exchange is broken by Shor's algorithm running on a sufficiently ` +
                   "large quantum computer. NIST estimates cryptographically relevant quantum " +
                   "computers could exist by 2030–2035. 'Harvest now, decrypt later' attacks " +
                   "mean encrypted traffic recorded today is at risk.",
      doraArticle: "DORA Art. 9.2 — ICT Risk Assessment · NIST FIPS 203/204",
      remediation: "Implement CRYSTALS-Kyber (FIPS 203) for key encapsulation as a hybrid with ECDHE. " +
                   "Begin transition per NIST IR 8413 migration guidance.",
    });
  }

  // ── 7. AES-128 vs AES-256 ─────────────────────────────────────────────────
  if (bulk === "AES-128-GCM") {
    findings.push({
      severity:    "low",
      code:        "KEY-SIZE-001",
      title:       "AES-128 — reduced quantum security margin",
      description: "AES-128 has 128-bit classical security but only 64-bit security against " +
                   "Grover's algorithm on a quantum computer. AES-256 provides 128-bit post-quantum " +
                   "security and is preferred for long-lived data and high-assurance environments.",
      doraArticle: "DORA Art. 9.4 — NIST SP 800-131A",
      remediation: "Prefer TLS_AES_256_GCM_SHA384 over TLS_AES_128_GCM_SHA256 " +
                   "for all financial and sensitive data.",
    });
  }

  // ── If nothing bad found ──────────────────────────────────────────────────
  if (findings.length === 0) {
    findings.push({
      severity:    "ok",
      code:        "OK-001",
      title:       "Cipher suite is compliant",
      description: `${components.raw} meets current NIST SP 800-52r2 and DORA Art. 9.4 requirements.`,
      doraArticle: "DORA Art. 9.4 — compliant",
      remediation: "Monitor for future NIST guidance on post-quantum migration timelines.",
    });
  }

  return findings;
}

// ── Overall risk calculator ───────────────────────────────────────────────────
export function overallRisk(
  findings: CipherFinding[]
): "critical" | "high" | "medium" | "low" | "ok" {
  if (findings.some(f => f.severity === "critical")) return "critical";
  if (findings.some(f => f.severity === "high"))     return "high";
  if (findings.some(f => f.severity === "medium"))   return "medium";
  if (findings.some(f => f.severity === "low"))      return "low";
  return "ok";
}

// ── PQC impact summary ────────────────────────────────────────────────────────
export function pqcImpact(components: CipherComponents): string {
  const { keyExchange: kx, bulkCipher: bulk } = components;

  if (bulk === "DES-CBC" || bulk === "RC4-128" || bulk === "NULL")
    return "Already broken classically. Quantum computers add no additional threat.";

  if (!components.pfs)
    return "RSA key exchange broken by Shor's algorithm. All recorded sessions at risk.";

  if (kx.includes("ECDHE"))
    return "ECDHE broken by Shor's algorithm. Bulk cipher survives if AES-256 used (64-bit PQ security with AES-128).";

  if (kx.includes("DHE"))
    return "DHE broken by Shor's algorithm. Requires replacement with CRYSTALS-Kyber.";

  return "Key exchange broken by quantum computers. Migrate to NIST FIPS 203 (Kyber).";
}

// ── Full analysis entry point ─────────────────────────────────────────────────
export function fullAnalysis(cipher: string, tlsVersion: string): CipherAnalysis {
  const components = parseCipher(cipher);
  const findings   = analyseCipher(components, tlsVersion);
  return {
    components,
    findings,
    overallRisk: overallRisk(findings),
    pqcImpact:   pqcImpact(components),
  };
}

// ── Severity colour helper (matches REBEL T.* tokens) ────────────────────────
export function severityColor(s: string): string {
  return s === "critical" ? "#ef4444"
       : s === "high"     ? "#f97316"
       : s === "medium"   ? "#eab308"
       : s === "low"      ? "#3b82f6"
       : "#22c55e";
}

export function severityVariant(s: string): "red"|"orange"|"yellow"|"green"|"gray" {
  return s === "critical" ? "red"
       : s === "high"     ? "orange"
       : s === "medium"   ? "yellow"
       : s === "low"      ? "green"
       : "gray";
}