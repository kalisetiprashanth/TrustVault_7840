# THREATS.md – Threat Model & Security Architecture Analysis

**Project**: TrustVault  
**Evaluation**: SNOVASYS Fresher Hiring Challenge 2026  
**Standard**: OWASP Top 10, ASVS Level 2, Zero-Trust Architecture  

This document outlines the systematic threat modeling, attack surfaces, mitigation controls, test evidence, accepted risks, and residual vulnerabilities for the TrustVault platform.

---

## 1. Threat Scenarios & Mitigations

### Threat 1: Insecure Direct Object References (IDOR) on Document Retrieval
- **Attack Scenario**: Attacker authenticates with a valid Viewer or third-party account (`usr_attacker_99`). Knowing or brute-forcing document IDs (e.g. `GET /api/documents/doc_board_q1` or `/download`), the attacker attempts to read confidential files owned by other organizations.
- **Mitigation**: Implemented `authorizeDocumentAccess('READ')` middleware on the server. Every request queries the database to verify:
  1. Is the caller the document owner?
  2. Does caller have an active, unexpired permission record?
  If neither condition is met, access is strictly rejected with HTTP 403 Forbidden, and a `SECURITY_IDOR_BLOCKED` event is logged in the cryptographic audit trail.
- **Test Evidence**: Automated test `SEC-TEST-12` proves parameter tampering on document IDs fails.

---

### Threat 2: Administrative Document Snooping & Privilege Escalation
- **Attack Scenario**: An administrator with system monitoring rights attempts to read or download executive salary sheets or board minutes without authorization from the document owner.
- **Mitigation**: Strict administrative boundary policy. The `ADMINISTRATOR` role grants rights to provision members, toggle user activation, view platform metrics, and inspect audit logs. However, the document streaming and content endpoints explicitly deny reading or downloading to administrators unless the document owner has granted them an explicit share.
- **Test Evidence**: Automated test `SEC-TEST-19` validates that administrators cannot read private document contents without an explicit grant.

---

### Threat 3: Audit Log Repudiation and Silent Tampering
- **Attack Scenario**: A malicious insider or attacker who gains database access alters or deletes audit events to erase evidence of unauthorized file downloads or privilege abuse.
- **Mitigation**: Cryptographic hash chaining. Each audit event record contains:
  $$\text{Hash}_N = \text{SHA256}(\text{Index}_N \parallel \text{Timestamp}_N \parallel \text{Actor}_N \parallel \text{Doc}_N \parallel \text{Action}_N \parallel \text{Status}_N \parallel \text{Details}_N \parallel \text{Hash}_{N-1})$$
  Modifying, deleting, or reordering any record breaks the hash chain for all subsequent blocks. The `verifyAuditChain()` algorithm automatically detects discrepancies from Genesis Root.
- **Test Evidence**: Automated test `SEC-TEST-18` validates cryptographic chain integrity across all blocks.

---

### Threat 4: Malicious File Masquerading & Extension Spoofing
- **Attack Scenario**: Attacker crafts a Windows PE `.exe` or Linux ELF binary containing ransomware, renames it to `quarterly_report.pdf`, and uploads it to compromise recipients who download the file.
- **Mitigation**: In-process magic-byte validation (`validateMagicBytes`). Before accepting an upload, TrustVault inspects the first 16 bytes of the binary payload:
  - Detects and rejects MZ (`4D 5A`), ELF (`7F 45 4C 46`), Mach-O, and shell scripts.
  - Verifies true PDF signature (`%PDF-`), PNG (`89 50 4E 47`), JPEG (`FF D8 FF`), and ASCII text printable distributions.
  - Any mismatch immediately triggers quarantine status (`QUARANTINED`), isolates the file, and blocks downloads.
- **Test Evidence**: Sample document `doc_quarantine_sample` is automatically quarantined and download requests are blocked with HTTP 403.

---

### Threat 5: Persistent Scan Deadlock (Root Cause of "Retry Scan" Bug)
- **Attack Scenario / Defect**: In legacy architectures, files awaiting asynchronous scanner completion remain perpetually locked if the scanning worker times out or fails. The user sees "Retry Scan", which re-submits to the broken worker and fails repeatedly.
- **Mitigation**: TrustVault introduced a self-healing diagnostic endpoint (`POST /api/documents/:id/retry-scan`). It re-evaluates magic bytes, computes file entropy, validates structural integrity, and transitions the file from `RETRY_NEEDED` to `CLEAN` (or `QUARANTINED` with explicit diagnostic feedback if malicious). It never silently marks corrupted or infected files as clean.
- **Test Evidence**: Document `doc_retry_scan_sample` can be repaired live via the "Retry Scan" button or API.

---

### Threat 6: OTP Brute-Force & Replay on External Guest Invitations
- **Attack Scenario**: Attacker intercepts an external invitation link and attempts to brute-force the 6-digit OTP to access the shared file.
- **Mitigation**:
  1. Rate limiting on the verification route.
  2. Cryptographic random generation (`crypto.randomInt`).
  3. Attempt cap: A maximum of 5 attempts is allowed before the invitation token is permanently revoked with status `EXPIRED`.
  4. Timing-safe comparison (`crypto.timingSafeEqual`) prevents timing oracle attacks.
  5. Once claimed, the invitation transitions to `CLAIMED` and cannot be replayed.

---

### Threat 7: Timing Side-Channel Attacks on Passwords & Tokens
- **Attack Scenario**: Attacker measures execution time differences on password comparisons to guess credentials byte-by-byte.
- **Mitigation**: All password and token verifications use `crypto.timingSafeEqual` over fixed-length buffer digests, eliminating timing discrepancies.

---

## 2. Accepted Risks & Assumptions

1. **Host-Level Root Compromise**: If an attacker gains raw root shell access to the underlying Linux virtual machine, they could theoretically read memory. Memory-level protection requires dedicated Hardware Security Modules (HSM) or Intel SGX enclaves, which are outside the scope of web application deployment.
2. **Third-Party Email/SMS Provider Downtime**: In production mode, SMS and email delivery depend on external gateways (Twilio, SendGrid). If external providers suffer downtime, OTP delivery delays may occur.

---

## 3. Residual Vulnerabilities & Future Hardening

- **Post-Quantum Cryptography (PQC)**: Current audit hash chains use SHA-256. Transitioning to SHA-3 / SHAKE256 or Dilithium signatures is recommended for post-quantum threat horizons.
- **Client-Side Zero-Knowledge Encryption**: Currently, files are encrypted at rest on the server with AES-256-GCM. Adding client-side WebCrypto encryption (where the owner encrypts before uploading and the server never sees plaintext) would provide absolute zero-knowledge privacy.
