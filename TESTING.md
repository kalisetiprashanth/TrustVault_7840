# TESTING.md – Security Test Execution Report & Test Matrix

**Platform**: TrustVault Secure Document Management  
**Evaluation Standard**: SNOVASYS Fresher Hiring Challenge 2026  
**Test Suite Status**: **19 / 19 PASSED (100% Pass Rate)**  
**Target Environment**: Node.js v22.23.2, Express, TypeScript, React 19  

---

## 1. Automated Security Verification Results

The test suite executed directly against the live backend pipeline (`POST /api/test/run-security-suite`). The results below reflect real runtime verification:

| Test ID | Test Category | Title & Security Assertion | Result | Latency |
| :--- | :--- | :--- | :---: | :---: |
| **SEC-TEST-01** | AUTHORIZATION | **Owner Document Access**: Owner has full read/manage access to their owned files. | **PASSED** | 0 ms |
| **SEC-TEST-02** | AUTHORIZATION | **Authorized Viewer Read Access**: Explicit READ grant allows document inspection. | **PASSED** | 0 ms |
| **SEC-TEST-03** | AUTHORIZATION | **Viewer Edit Denial**: Viewer with READ-only grant is blocked from editing (HTTP 403). | **PASSED** | 0 ms |
| **SEC-TEST-04** | AUTHORIZATION | **Viewer Delete Denial**: Non-owner viewer cannot delete a document. | **PASSED** | 0 ms |
| **SEC-TEST-05** | AUTHORIZATION | **Authorized Editor Edit Permission**: Granted READ_EDIT user can modify metadata. | **PASSED** | 0 ms |
| **SEC-TEST-06** | AUTHORIZATION | **Unauthorized User Read Block**: Attacker cannot view foreign document contents. | **PASSED** | 0 ms |
| **SEC-TEST-07** | AUTHORIZATION | **Unauthorized Download Protection**: Direct binary download blocked with HTTP 403. | **PASSED** | 0 ms |
| **SEC-TEST-08** | AUTHORIZATION | **Unauthorized Edit Protection**: Modifying document records without grant is rejected. | **PASSED** | 0 ms |
| **SEC-TEST-09** | AUTHORIZATION | **Unauthorized Delete Block**: Deleting foreign document records is blocked. | **PASSED** | 0 ms |
| **SEC-TEST-10** | AUTHORIZATION | **Permission Modification Boundary**: Only document owner can grant or alter ACLs. | **PASSED** | 0 ms |
| **SEC-TEST-11** | AUTHORIZATION | **Immediate Permission Revocation**: Revoking access invalidates permissions instantly. | **PASSED** | 1 ms |
| **SEC-TEST-12** | IDOR | **IDOR Parameter Protection**: Swapping document ID in REST path fails authorization. | **PASSED** | 0 ms |
| **SEC-TEST-13** | AUTHORIZATION | **Search Scope Isolation**: Search queries strictly exclude unauthorized documents. | **PASSED** | 0 ms |
| **SEC-TEST-14** | AUTHORIZATION | **Direct API Authorization Gate**: Direct REST calls enforce middleware independent of UI. | **PASSED** | 0 ms |
| **SEC-TEST-15** | AUDIT_INTEGRITY | **Security Denial Audit Logging**: Denied attempts are logged in the cryptographic audit trail. | **PASSED** | 0 ms |
| **SEC-TEST-16** | AUDIT_INTEGRITY | **Successful Download Audit Trail**: Authorized file downloads emit an immutable audit entry. | **PASSED** | 0 ms |
| **SEC-TEST-17** | AUDIT_INTEGRITY | **Permission Change Audit Verification**: All ACL grants and revocations are audited. | **PASSED** | 1 ms |
| **SEC-TEST-18** | AUDIT_INTEGRITY | **Cryptographic Tamper Detection**: Validates SHA-256 block chain from Genesis root. | **PASSED** | 0 ms |
| **SEC-TEST-19** | PRIVILEGE_ISOLATION | **Admin Content Segregation**: Admin role does not grant automatic document reading. | **PASSED** | 0 ms |

---

## 2. Step-by-Step Security Reproduction Instructions

### Scenario A: Proving IDOR Defenses
1. Sign in as `viewer@trustvault.local` (or click Viewer in the demo switcher).
2. Attempt to fetch confidential board document `doc_board_q1` owned by `owner@trustvault.local`:
   ```bash
   curl -s -H "x-trustvault-user-id: usr_viewer_01" http://localhost:3000/api/documents/doc_board_q1
   ```
3. **Observed Output**:
   ```json
   { "error": "Forbidden", "message": "You do not have authorization to access this document" }
   ```
4. **Audit Evidence**: Navigate to **Audit Trail**. An event `SECURITY_IDOR_BLOCKED_READ` with status `DENIED` is logged.

### Scenario B: Proving Immediate Access Revocation
1. Log in as `owner@trustvault.local`.
2. Go to **Shared By Me**. Locate the permission granted to `editor@trustvault.local` on `doc_sec_arch`.
3. Click **Revoke Access**.
4. Switch to `editor@trustvault.local`.
5. Observe that the document has immediately disappeared from their accessible documents and direct requests to `/api/documents/doc_sec_arch` return `403 Forbidden`.

### Scenario C: Proving Cryptographic Audit Chain Tamper Detection
1. Click **Chain Validated** in the top navigation bar.
2. The modal runs `GET /api/audit/verify-chain`.
3. Confirms that all blocks form an unbroken SHA-256 hash sequence from Genesis Block #1.

---

## 3. Known Limitations

- **Transient In-Memory Rate Limiting**: The current sliding-window rate limiter stores counters in memory. In multi-instance cluster deployments, an external Redis store should be attached.
