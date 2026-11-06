# TrustVault – Secure Document Sharing & Management Platform

[![Snovasys Challenge 2026](https://img.shields.io/badge/SNOVASYS%20Hiring-Challenge%202026-cyan.svg)](https://snovasys.com)
[![Security Pass](https://img.shields.io/badge/Security%20Tests-19%2F19%20Passed-emerald.svg)](#automated-security-testing)
[![Audit Chain](https://img.shields.io/badge/Audit%20Chain-SHA--256%20Immutable-blue.svg)](#cryptographic-audit-trail)
[![Platform Compliance](https://img.shields.io/badge/Architecture-Node.js%20%2B%20React%2019-purple.svg)](#technology-stack)

TrustVault is an enterprise-grade document management and secure sharing platform engineered specifically for the **SNOVASYS Fresher Hiring Challenge 2026**. Designed under a zero-trust cybersecurity constitution, TrustVault ensures that no unauthorized user can ever access confidential documents and that every single access attempt (both granted and denied) is cryptographically recorded in an append-only SHA-256 hash chain.

---

## Key Features

1. **Server-Authoritative Resource-Based Authorization (Anti-IDOR)**:
   - Zero reliance on client-side authorization. Every API request validates user identity against document ownership and unexpired permission records.
   - Prevents parameter tampering and IDOR vulnerabilities across view, edit, download, and deletion routes.

2. **Immutable Cryptographic Audit Hash Chain**:
   - Each audit event is cryptographically chained to its predecessor using SHA-256 hashing.
   - Any attempt to alter, delete, or retroactively insert an audit log immediately invalidates downstream block hashes and is caught by the live chain verification tool.

3. **Multi-Stage File Validation & Magic-Byte Inspection**:
   - Rejects file extension spoofing (e.g. `malicious.exe` renamed to `document.pdf`) by inspecting real binary magic bytes.
   - Quarantines malicious payloads (embedded script tags, PE/ELF executables).

4. **Root Cause Fix for the "Retry Scan" Problem**:
   - Investigated and resolved the legacy deadlock bug where documents remained stuck in `RETRY_NEEDED` / `SCANNING` states.
   - Implemented an in-process heuristic re-scanner endpoint (`/api/documents/:id/retry-scan`) that re-validates binary headers, repairs scan state, and reports clear diagnostics without ever silently marking infected files clean.

5. **External User Invitation with Dual-Channel OTP**:
   - Allows document owners to share files with external recipients via cryptographically generated access tokens.
   - External recipients must verify identity via dual-channel OTP (Email OTP and SMS OTP) with strict 5-minute expiry and attempt throttling.

6. **Administrative Content Segregation**:
   - Enforces an explicit policy barrier: Administrators have oversight over user accounts, platform metrics, and audit monitoring, but **cannot view or download private document contents** without explicit owner consent.

7. **19-Test Automated Security Test Suite**:
   - Built-in integration test suite testing all critical authorization gates, revocation immediacy, IDOR defenses, and audit tamper detection directly against live API routes.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Motion.
- **Backend**: Node.js v22, Express 4.21, `tsx`, native `crypto` module (PBKDF2-SHA512, timingSafeEqual, SHA-256).
- **Storage**: Persistent transaction-safe document vault and metadata store (`/data/vault_storage/`, `/data/trustvault_db.json`).
- **Deployment**: Render-ready, zero-configuration local and production hosting.

---

## Pre-Configured Demo Accounts

For evaluation purposes, TrustVault includes 4 seeded demo accounts. You can sign in using credentials or click the **Demo Switch** buttons in the navigation bar:

| Role | Email | Password | Clearance & Purpose |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@trustvault.local` | `Admin@Trust2026!` | Member provisioning, user status management, platform telemetry, audit inspection. (Document content reading is restricted). |
| **Owner** | `owner@trustvault.local` | `Owner@Trust2026!` | Full document lifecycle (upload, edit, delete, permissions management, instant revocation, external OTP invitations). |
| **Editor** | `editor@trustvault.local` | `Editor@Trust2026!` | Can view and edit documents explicitly shared with `READ_EDIT` permissions. Cannot delete or alter ACLs. |
| **Viewer** | `viewer@trustvault.local` | `Viewer@Trust2026!` | Read-only access to authorized documents. Cannot edit, download (unless granted `READ_DOWNLOAD`), or share. |

---

## Local Setup & Quickstart

```bash
# 1. Clone repository
git clone https://github.com/your-username/trustvault.git
cd trustvault

# 2. Install dependencies
npm install

# 3. Launch development server on port 3000
npm run dev

# 4. Open in browser
# http://localhost:3000
```

---

## Automated Security Testing

To run the automated security test suite covering all 19 verification cases:

1. **Via UI**: Click **Security Test Center** in the sidebar navigation or click **Run Security Tests (19 Tests)** in the profile menu.
2. **Via cURL**:
   ```bash
   curl -s -X POST http://localhost:3000/api/test/run-security-suite
   ```

---

## Verification of Cryptographic Audit Chain

To test audit chain integrity:
1. Click the **Chain Validated** badge in the top navigation bar or navigate to **Audit Trail** and click **Verify Hash Chain Integrity**.
2. The modal iterates from Genesis Block #1 through all recorded events, recalculating SHA-256 digests and confirming continuous linkage.
