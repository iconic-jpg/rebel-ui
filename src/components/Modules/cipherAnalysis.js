// ─── cipherAnalysis.ts ────────────────────────────────────────────────────────
// Parses TLS cipher suite strings into components and produces
// accurate DORA/NIST findings.
//
// FIX 1: parseCipher now accepts optional kxGroup (from backend key_exchange_group)
//         — uses real negotiated curve (X25519, secp256r1, X25519Kyber768) when available
// FIX 2: fullAnalysis normalises TLS version — handles "TLSv1.3", "TLS1.3", "1.3"
// FIX 3: PQC hybrid (X25519Kyber768) detected and shown as PQC ACTIVE not flagged
// FIX 4: Pure numeric kxGroup values (e.g. "256", "128") are ignored — they are
//         key sizes reported by some SSL libs, not group names. Without this guard
//         keyExchange rendered as "256 •" in the table and ECDHE/PQC logic never fired.
// ── TLS version normaliser ────────────────────────────────────────────────────
// Handles: "TLSv1.3", "TLS1.3", "TLSv1", "TLS 1.2", "1.2", "1.3"
export function normaliseTLS(raw) {
    if (raw === null || raw === undefined)
        return "";
    return String(raw)
        .replace(/^TLSv?/i, "") // strip TLS / TLSv prefix
        .replace(/^v/i, "") // strip any remaining v
        .trim();
    // result: "1.3", "1.2", "1.1", "1.0"
}
// ── PQC group detector ────────────────────────────────────────────────────────
function isPQCGroup(kxGroup) {
    if (!kxGroup)
        return false;
    const g = String(kxGroup).toLowerCase();
    return (g.includes("kyber") ||
        g.includes("mlkem") ||
        g.includes("hybrid") ||
        g.includes("x25519kyber") ||
        g.includes("p256kyber") ||
        g.includes("pq"));
}
// ── Named group cleaner ───────────────────────────────────────────────────────
function cleanKxGroup(kxGroup) {
    if (kxGroup === null || kxGroup === undefined)
        return "";
    const g = String(kxGroup).trim();
    if (!g || g === "None" || g === "null")
        return "";
    const map = {
        "X25519": "X25519",
        "x25519": "X25519",
        "secp256r1": "P-256",
        "prime256v1": "P-256",
        "secp384r1": "P-384",
        "secp521r1": "P-521",
        "X448": "X448",
        "x448": "X448",
        "ffdhe2048": "FFDHE-2048",
        "ffdhe3072": "FFDHE-3072",
        "ffdhe4096": "FFDHE-4096",
        "X25519Kyber768": "X25519+Kyber768",
        "x25519kyber768draft00": "X25519+Kyber768",
        "SecP256r1Kyber768Draft00": "P-256+Kyber768",
    };
    return map[g] ?? g;
}
// ── FIX 4: Guard — reject kxGroup values that are purely numeric ──────────────
// Python's ssl module sometimes returns the key size (e.g. 256) as cipher()[2]
// instead of a group name. A numeric string is NOT a named group; treating it
// as one causes keyExchange to display as "256" and breaks all ECDHE/PQC logic.
function isValidKxGroup(kxGroup) {
    if (kxGroup === null || kxGroup === undefined)
        return false;
    const s = String(kxGroup).trim();
    if (!s || s === "None" || s === "null" || s === "")
        return false;
    // Reject pure integers / pure floats (e.g. "256", "128", "4096", "2048.0")
    if (/^\d+(\.\d+)?$/.test(s))
        return false;
    return true;
}
// ── ECDHE group detector ──────────────────────────────────────────────────────
// Returns true for any key exchange value that provides ephemeral ECDH —
// whether it came from the backend (X25519, P-256 …) or parsed (ECDHE).
export function isECDHEGroup(kx) {
    const k = (kx ?? "").toLowerCase();
    return (k === "x25519" ||
        k === "p-256" ||
        k === "p-384" ||
        k === "p-521" ||
        k === "x448" ||
        k === "ffdhe-2048" ||
        k === "ffdhe-3072" ||
        k === "ffdhe-4096" ||
        k.startsWith("secp") ||
        k === "ecdhe" ||
        // PQC hybrids are also ECDHE-based
        k.includes("x25519+") ||
        k.includes("p-256+"));
}
// ── Cipher string parser ───────────────────────────────────────────────────────
export function parseCipher(cipher, kxGroup) {
    if (!cipher)
        return unknownComponents("");
    const cipherStr = String(cipher);
    if (!cipherStr.trim())
        return unknownComponents("");
    const c = cipherStr.trim().toUpperCase();
    // ── Bulk cipher detection ─────────────────────────────────────────────────
    let bulk = "unknown";
    let mac = "unknown";
    if (c.includes("AES_256_GCM") || c.includes("AES256-GCM"))
        bulk = "AES-256-GCM";
    else if (c.includes("AES_128_GCM") || c.includes("AES128-GCM"))
        bulk = "AES-128-GCM";
    else if (c.includes("CHACHA20_POLY1305") || c.includes("CHACHA20"))
        bulk = "ChaCha20-Poly1305";
    else if (c.includes("AES_256_CCM") || c.includes("AES256-CCM"))
        bulk = "AES-256-CCM";
    else if (c.includes("AES_128_CCM") || c.includes("AES128-CCM"))
        bulk = "AES-128-CCM";
    else if (c.includes("AES_256_CBC") || c.includes("AES256-CBC") ||
        (c.includes("AES256") && !c.includes("GCM") && !c.includes("CCM")))
        bulk = "AES-256-CBC";
    else if (c.includes("AES_128_CBC") || c.includes("AES128-CBC") ||
        (c.includes("AES128") && !c.includes("GCM") && !c.includes("CCM")))
        bulk = "AES-128-CBC";
    else if (c.includes("3DES_EDE_CBC") || c.includes("3DES"))
        bulk = "3DES-CBC";
    else if (c.includes("DES_CBC") || (c.includes("DES") && !c.includes("3DES")))
        bulk = "DES-CBC";
    else if (c.includes("RC4_128") || c.includes("RC4-128"))
        bulk = "RC4-128";
    else if (c.includes("RC4_40"))
        bulk = "RC4-40";
    else if (c.includes("NULL"))
        bulk = "NULL";
    else if (c.includes("CAMELLIA"))
        bulk = "Camellia";
    else if (c.includes("ARIA"))
        bulk = "ARIA";
    // ── MAC detection ─────────────────────────────────────────────────────────
    if (c.includes("SHA384") || c.endsWith("SHA384"))
        mac = "SHA-384";
    else if (c.includes("SHA256") || c.endsWith("SHA256"))
        mac = "SHA-256";
    else if (c.endsWith("SHA") || c.includes("_SHA_") || c.includes("-SHA"))
        mac = "SHA-1";
    else if (c.includes("MD5"))
        mac = "MD5";
    else if (c.includes("NULL"))
        mac = "NULL";
    // TLS 1.3 uses HKDF, not a traditional MAC
    if (c.startsWith("TLS_") && !c.includes("WITH"))
        mac = "HKDF";
    // ── FIX 1 + FIX 4: Use real kxGroup from backend only if it is a valid name ─
    if (isValidKxGroup(kxGroup)) {
        const cleanGroup = cleanKxGroup(kxGroup);
        const isHybridPQ = isPQCGroup(String(kxGroup));
        const pfs = isECDHEGroup(cleanGroup) || isHybridPQ;
        return {
            keyExchange: cleanGroup,
            authentication: "Certificate",
            bulkCipher: bulk,
            mac,
            pfs,
            pqcHybrid: isHybridPQ,
            raw: cipher,
            kxSource: "backend",
        };
    }
    // ── Fallback: parse key exchange from cipher string ───────────────────────
    // TLS 1.3 IANA format (TLS_AES_256_GCM_SHA384 etc.)
    if (c.startsWith("TLS_") && !c.includes("WITH")) {
        return {
            keyExchange: "TLS 1.3",
            authentication: "Certificate",
            bulkCipher: bulk,
            mac,
            pfs: true,
            pqcHybrid: false,
            raw: cipher,
            kxSource: "parsed",
        };
    }
    // TLS 1.2 IANA format (TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384)
    if (c.includes("_WITH_")) {
        const prefix = c.split("_WITH_")[0];
        const kx = prefix.includes("ECDHE") ? "ECDHE"
            : prefix.includes("DHE") ? "DHE"
                : prefix.includes("ECDH") ? "ECDH"
                    : prefix.includes("DH") ? "DH"
                        : prefix.includes("RSA") ? "RSA"
                            : prefix.includes("PSK") ? "PSK"
                                : prefix.includes("SRP") ? "SRP" : "RSA";
        const auth = prefix.includes("ECDSA") ? "ECDSA"
            : prefix.includes("RSA") ? "RSA"
                : prefix.includes("DSS") ? "DSS"
                    : prefix.includes("anon") ? "anon" : "RSA";
        const pfs = kx === "ECDHE" || kx === "DHE";
        return {
            keyExchange: kx, authentication: auth,
            bulkCipher: bulk, mac, pfs,
            pqcHybrid: false, raw: cipher, kxSource: "parsed",
        };
    }
    // OpenSSL shorthand (ECDHE-RSA-AES256-GCM-SHA384)
    const kx = c.startsWith("ECDHE") ? "ECDHE"
        : c.startsWith("DHE") ? "DHE"
            : c.startsWith("ECDH") ? "ECDH"
                : c.startsWith("AECDH") ? "anon-ECDH"
                    : c.startsWith("ADH") ? "anon-DH"
                        : c.startsWith("DH") ? "DH"
                            : c.startsWith("RSA") ? "RSA" : "RSA";
    const auth = c.includes("ECDSA") ? "ECDSA"
        : c.includes("RSA") ? "RSA"
            : c.includes("DSS") ? "DSS" : "RSA";
    const pfs = kx === "ECDHE" || kx === "DHE";
    return {
        keyExchange: kx, authentication: auth,
        bulkCipher: bulk, mac, pfs,
        pqcHybrid: false, raw: cipher, kxSource: "parsed",
    };
}
function unknownComponents(raw) {
    return {
        keyExchange: "unknown", authentication: "unknown",
        bulkCipher: "unknown", mac: "unknown",
        pfs: false, pqcHybrid: false, raw, kxSource: "parsed",
    };
}
// ── Finding generator ─────────────────────────────────────────────────────────
export function analyseCipher(components, tlsNormalised) {
    const findings = [];
    const { keyExchange: kx, bulkCipher: bulk, mac, pfs, pqcHybrid } = components;
    // ── PQC hybrid active ─────────────────────────────────────────────────────
    if (pqcHybrid) {
        findings.push({
            severity: "ok",
            code: "PQC-ACTIVE",
            title: "Post-quantum hybrid key exchange active",
            description: `${kx} combines classical ECDHE with a NIST-approved PQC algorithm. ` +
                "This is the gold standard for quantum-safe TLS. " +
                "Traffic is protected against both classical and quantum attackers.",
            doraArticle: "DORA Art. 9.2 — NIST FIPS 203 compliant",
            remediation: "No action required. Ensure hybrid KX is enforced for all clients.",
        });
    }
    // ── 1. No Perfect Forward Secrecy ────────────────────────────────────────
    if (!pfs && tlsNormalised !== "1.3") {
        findings.push({
            severity: "high",
            code: "NO-PFS-001",
            title: "No Perfect Forward Secrecy",
            description: `Key exchange is ${kx}. Static RSA key exchange means all past sessions ` +
                "are decryptable if the server's private key is ever compromised. " +
                "Adversaries recording traffic today can decrypt it once quantum computers arrive.",
            doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
            remediation: "Migrate to ECDHE or DHE key exchange. Disable static RSA cipher suites. " +
                "Enforce TLS 1.3 which mandates PFS.",
        });
    }
    // ── 2. Broken bulk ciphers ────────────────────────────────────────────────
    if (bulk === "DES-CBC" || bulk === "NULL") {
        findings.push({
            severity: "critical",
            code: "BROKEN-CIPHER-001",
            title: `Broken bulk cipher — ${bulk}`,
            description: `${bulk === "NULL" ? "NULL cipher provides no encryption." : "DES has a 56-bit key space and was broken in 1997."} ` +
                "Both are prohibited under NIST SP 800-52r2 and RBI IT Framework.",
            doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
            remediation: "Immediately disable. Replace with TLS_AES_256_GCM_SHA384 under TLS 1.3.",
        });
    }
    if (bulk === "RC4-128" || bulk === "RC4-40") {
        findings.push({
            severity: "critical",
            code: "BROKEN-CIPHER-002",
            title: "Broken bulk cipher — RC4",
            description: "RC4 has known statistical biases allowing plaintext recovery. " +
                "Prohibited by RFC 7465. Multiple practical attacks published since 2013.",
            doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
            remediation: "Immediately disable RC4 cipher suites. Deploy TLS_AES_256_GCM_SHA384.",
        });
    }
    if (bulk === "3DES-CBC") {
        findings.push({
            severity: "high",
            code: "WEAK-CIPHER-001",
            title: "Deprecated bulk cipher — 3DES (SWEET32 vulnerable)",
            description: "3DES uses a 64-bit block size making it vulnerable to the SWEET32 birthday attack " +
                "(CVE-2016-2183). Deprecated by NIST since 2017. Prohibited in TLS 1.3.",
            doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
            remediation: "Disable 3DES cipher suites. Migrate to AES-256-GCM.",
        });
    }
    // ── 3. CBC mode ───────────────────────────────────────────────────────────
    if (bulk?.includes("CBC") && bulk !== "DES-CBC" && bulk !== "3DES-CBC") {
        findings.push({
            severity: "medium",
            code: "CBC-MODE-001",
            title: "CBC mode encryption — padding oracle risk",
            description: `Bulk cipher ${bulk} uses Cipher Block Chaining mode. ` +
                "Vulnerable to BEAST (TLS 1.0), Lucky13, and POODLE. " +
                "GCM mode is strictly preferable for DORA compliance.",
            doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
            remediation: "Migrate to AES-256-GCM. Disable all CBC-mode cipher suites.",
        });
    }
    // ── 4. Weak MAC ───────────────────────────────────────────────────────────
    if (mac === "SHA-1") {
        findings.push({
            severity: "medium",
            code: "WEAK-MAC-001",
            title: "SHA-1 MAC — collision attacks possible",
            description: "SHA-1 was broken in 2017 (SHAttered attack). " +
                "NIST deprecated SHA-1 for all cryptographic uses as of 2023. " +
                "BSI TR-02102-2 prohibits SHA-1 in new TLS deployments.",
            doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
            remediation: "Use cipher suites with SHA-256 or SHA-384. Deploy TLS 1.3 which uses HKDF.",
        });
    }
    if (mac === "MD5") {
        findings.push({
            severity: "critical",
            code: "BROKEN-MAC-001",
            title: "MD5 MAC — cryptographically broken",
            description: "MD5 collision resistance was broken in 2004. " +
                "Prohibited by all major standards bodies.",
            doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
            remediation: "Immediately disable all MD5 cipher suites.",
        });
    }
    // ── 5. TLS version ────────────────────────────────────────────────────────
    if (tlsNormalised === "1.0") {
        findings.push({
            severity: "critical",
            code: "TLS-VER-001",
            title: "TLS 1.0 — prohibited",
            description: "TLS 1.0 deprecated RFC 8996. Vulnerable to BEAST, POODLE, CRIME. " +
                "PCI-DSS 4.0 prohibits TLS 1.0 effective March 2024. " +
                "RBI IT Framework requires minimum TLS 1.2.",
            doraArticle: "DORA Art. 9.4 — PCI-DSS 4.0 Req 4.2.1",
            remediation: "Disable TLS 1.0 and 1.1 immediately. Enable TLS 1.2 minimum, TLS 1.3 preferred.",
        });
    }
    else if (tlsNormalised === "1.1") {
        findings.push({
            severity: "high",
            code: "TLS-VER-002",
            title: "TLS 1.1 — deprecated",
            description: "TLS 1.1 deprecated RFC 8996. Dropped by all major browsers 2020.",
            doraArticle: "DORA Art. 9.4 — Cryptographic Controls",
            remediation: "Disable TLS 1.1. Enable TLS 1.3.",
        });
    }
    else if (tlsNormalised === "1.2") {
        findings.push({
            severity: "low",
            code: "TLS-VER-003",
            title: "TLS 1.2 — supported but not optimal",
            description: "TLS 1.2 is acceptable under NIST SP 800-52r2 and RBI guidelines " +
                "with correct cipher configuration. TLS 1.3 is strongly recommended.",
            doraArticle: "DORA Art. 9.4 — best practice",
            remediation: "Enable TLS 1.3. Plan TLS 1.3-only migration by 2026.",
        });
    }
    // ── 6. PQC finding — only if not already running hybrid ──────────────────
    if (!pqcHybrid) {
        const isTLS13 = tlsNormalised === "1.3";
        const isRSAkx = !pfs;
        const isDHEkx = pfs && !isTLS13;
        if (isRSAkx) {
            // Already covered by NO-PFS-001
        }
        else if (isTLS13) {
            const pqcSev = (bulk === "AES-256-GCM" || bulk === "ChaCha20-Poly1305")
                ? "low" : "medium";
            findings.push({
                severity: pqcSev,
                code: "PQC-001",
                title: "Post-quantum migration required",
                description: `Key exchange will be broken by Shor's algorithm on a quantum computer. ` +
                    `Bulk cipher ${bulk} provides ` +
                    (pqcSev === "low"
                        ? "128-bit post-quantum security — adequate until migration."
                        : "only 64-bit post-quantum security against Grover's algorithm.") +
                    " NIST threat horizon: 2030–2035.",
                doraArticle: "DORA Art. 9.2 — NIST FIPS 203/204",
                remediation: "Implement CRYSTALS-Kyber (FIPS 203) hybrid key exchange. " +
                    "Target: " + (pqcSev === "low" ? "plan by 2027." : "plan by 2025."),
            });
        }
        else if (isDHEkx) {
            findings.push({
                severity: "medium",
                code: "PQC-001",
                title: "Post-quantum migration required",
                description: `${kx} key exchange broken by Shor's algorithm. ` +
                    "'Harvest now, decrypt later' — traffic recorded today is at future risk.",
                doraArticle: "DORA Art. 9.2 — NIST FIPS 203/204",
                remediation: "Implement CRYSTALS-Kyber (FIPS 203) hybrid with ECDHE. Begin per NIST IR 8413.",
            });
        }
    }
    // ── 7. AES-128 margin ─────────────────────────────────────────────────────
    if (bulk === "AES-128-GCM") {
        findings.push({
            severity: "low",
            code: "KEY-SIZE-001",
            title: "AES-128 — reduced post-quantum security margin",
            description: "AES-128 provides 128-bit classical security but only 64-bit against " +
                "Grover's algorithm. AES-256 provides 128-bit post-quantum security.",
            doraArticle: "DORA Art. 9.4 — NIST SP 800-131A",
            remediation: "Prefer TLS_AES_256_GCM_SHA384 for financial and sensitive data.",
        });
    }
    // ── Clean bill of health ──────────────────────────────────────────────────
    if (findings.length === 0) {
        findings.push({
            severity: "ok",
            code: "OK-001",
            title: "Cipher suite is compliant",
            description: `${components.raw} meets NIST SP 800-52r2 and DORA Art. 9.4 requirements.`,
            doraArticle: "DORA Art. 9.4 — compliant",
            remediation: "Monitor NIST guidance on post-quantum migration timelines.",
        });
    }
    return findings;
}
// ── Overall risk ──────────────────────────────────────────────────────────────
export function overallRisk(findings) {
    if (findings.some(f => f.severity === "critical"))
        return "critical";
    if (findings.some(f => f.severity === "high"))
        return "high";
    if (findings.some(f => f.severity === "medium"))
        return "medium";
    if (findings.some(f => f.severity === "low"))
        return "low";
    return "ok";
}
// ── PQC impact summary ────────────────────────────────────────────────────────
export function pqcImpact(components, tlsNorm) {
    const { keyExchange: kx, bulkCipher: bulk, pqcHybrid } = components;
    if (pqcHybrid)
        return `${kx} is a post-quantum hybrid — protected against Shor's and Grover's algorithms.`;
    if (bulk === "DES-CBC" || bulk === "RC4-128" || bulk === "NULL")
        return "Already broken classically. Quantum adds no additional threat.";
    if (!components.pfs)
        return "RSA key exchange broken by Shor's algorithm. All recorded sessions at risk.";
    if (tlsNorm === "1.3") {
        if (bulk === "AES-256-GCM" || bulk === "ChaCha20-Poly1305")
            return "Key exchange broken by Shor's (future). AES-256 bulk cipher provides 128-bit PQ security — low near-term risk.";
        return "Key exchange broken by Shor's (future). AES-128 provides only 64-bit PQ security via Grover's.";
    }
    return `${kx} key exchange broken by Shor's algorithm. Migrate to CRYSTALS-Kyber (FIPS 203) hybrid.`;
}
// ── Full analysis entry point ─────────────────────────────────────────────────
export function fullAnalysis(cipher, tlsRaw, kxGroup) {
    const tlsNorm = normaliseTLS(tlsRaw);
    const components = parseCipher(cipher, kxGroup ?? null);
    const findings = analyseCipher(components, tlsNorm);
    return {
        components,
        findings,
        overallRisk: overallRisk(findings),
        pqcImpact: pqcImpact(components, tlsNorm),
    };
}
// ── Colour helpers ────────────────────────────────────────────────────────────
export function severityColor(s) {
    return s === "critical" ? "#ef4444"
        : s === "high" ? "#f97316"
            : s === "medium" ? "#eab308"
                : s === "low" ? "#3b82f6"
                    : "#22c55e";
}
export function severityVariant(s) {
    return s === "critical" ? "red"
        : s === "high" ? "orange"
            : s === "medium" ? "yellow"
                : s === "low" ? "green"
                    : "gray";
}
