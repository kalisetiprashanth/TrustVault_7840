# API_DOCUMENTATION.md – RESTful Security Endpoint Reference

**Service**: TrustVault Backend API  
**Base URL**: `/api`  
**Authentication Scheme**: Bearer Token or `x-trustvault-user-id` header  
**Default Content Type**: `application/json`  

---

## 1. Authentication Endpoints

### 1.1 User Login
- **Method**: `POST`
- **Endpoint**: `/api/auth/login`
- **Purpose**: Authenticates credentials using salted PBKDF2-SHA512 with timing-safe comparison.
- **Authentication**: None (Public). Protected by sliding-window rate limiting.
- **Required Role**: Any active account.
- **Request Body**:
  ```json
  {
    "email": "owner@trustvault.local",
    "password": "Owner@Trust2026!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "user": { "id": "usr_owner_01", "email": "owner@trustvault.local", "role": "OWNER", "status": "ACTIVE" },
    "token": "usr_owner_01",
    "requiresPasswordChange": false
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Incorrect email or password (logged in audit trail).
  - `403 Forbidden`: Account inactive or suspended.
  - `429 Too Many Requests`: Rate limit exceeded.

---

### 1.2 User Registration
- **Method**: `POST`
- **Endpoint**: `/api/auth/register`
- **Purpose**: Creates a new user with dual OTP verification.
- **Authentication**: None.
- **Required Role**: Public self-registration (Restricted to `OWNER`, `EDITOR`, `VIEWER`. Self-registration as `ADMINISTRATOR` is strictly blocked).
- **Request Body**:
  ```json
  {
    "fullName": "Alice Walker",
    "email": "alice@company.com",
    "mobile": "+1-555-0188",
    "password": "SecurePassword2026!",
    "role": "OWNER"
  }
  ```
- **Response (201 Created)**: Returns created user object and active session token.
- **Error Responses**:
  - `400 Bad Request`: Validation failure.
  - `409 Conflict`: Account already exists.

---

### 1.3 Change Password
- **Method**: `POST`
- **Endpoint**: `/api/auth/change-password`
- **Purpose**: Updates credentials with fresh salt and PBKDF2 hash.
- **Authentication**: Required (`x-trustvault-user-id`).
- **Request Body**:
  ```json
  {
    "currentPassword": "Owner@Trust2026!",
    "newPassword": "NewSecurePassword2026!"
  }
  ```
- **Response (200 OK)**: `{ "success": true, "message": "Password updated successfully" }`
- **Error Responses**: `401 Unauthorized` if current password does not match.

---

## 2. Document Management Endpoints

### 2.1 List Accessible Documents
- **Method**: `GET`
- **Endpoint**: `/api/documents`
- **Purpose**: Returns documents filtered strictly by authorization. Owners see owned files; members see explicitly granted files; administrators see governance metadata without unauthorized content.
- **Authentication**: Required.
- **Response (200 OK)**:
  ```json
  {
    "documents": [
      {
        "id": "doc_board_q1",
        "title": "Q1 2026 Board Financials",
        "category": "Financial",
        "scanStatus": "CLEAN",
        "effectivePermission": "OWNER"
      }
    ]
  }
  ```

---

### 2.2 Upload Document to Private Vault
- **Method**: `POST`
- **Endpoint**: `/api/documents/upload`
- **Purpose**: Ingests file binary, runs magic-byte signature analysis, heuristics, encrypts at rest, and appends upload event to audit chain.
- **Authentication**: Required.
- **Required Role**: `ADMINISTRATOR`, `OWNER`, or `EDITOR`.
- **Request Format**: `multipart/form-data` with `file` and `category`.
- **Response (201 Created)**: Returns created document record with `scanStatus`.
- **Error Responses**:
  - `400 Bad Request`: File missing or exceeds 25 MB limit.

---

### 2.3 Get Document Details
- **Method**: `GET`
- **Endpoint**: `/api/documents/:id`
- **Purpose**: Resource-based authorization lookup. Returns metadata, content preview (if authorized), and ACL permissions.
- **Authentication**: Required.
- **Document Permission**: Owner OR active grant (`READ`, `READ_DOWNLOAD`, `READ_EDIT`).
- **Response (200 OK)**: Returns document and active permissions array.
- **Error Responses**:
  - `403 Forbidden`: Unauthorized IDOR attempt (logged in audit trail).
  - `404 Not Found`: Document ID does not exist.

---

### 2.4 Download Document Binary
- **Method**: `GET`
- **Endpoint**: `/api/documents/:id/download`
- **Purpose**: Streams decrypted file binary with `nosniff` security headers.
- **Authentication**: Required.
- **Document Permission**: Owner OR active grant with `READ_DOWNLOAD` or `READ_EDIT`.
- **Response (200 OK)**: Binary stream with `Content-Disposition: attachment`.
- **Error Responses**:
  - `403 Forbidden`: User has `READ` view-only grant or document is `QUARANTINED`.
  - `404 Not Found`: Storage binary missing.

---

### 2.5 Update Document Metadata
- **Method**: `PUT`
- **Endpoint**: `/api/documents/:id`
- **Purpose**: Modifies title or category.
- **Authentication**: Required.
- **Document Permission**: Owner OR active grant with `READ_EDIT`.
- **Request Body**: `{ "title": "Updated Title", "category": "Legal" }`
- **Response (200 OK)**: Returns updated document.

---

### 2.6 Delete Document
- **Method**: `DELETE`
- **Endpoint**: `/api/documents/:id`
- **Purpose**: Permanently purges document and unlinks stored binary from vault.
- **Authentication**: Required.
- **Document Permission**: Strictly restricted to Document Owner.
- **Error Responses**:
  - `403 Forbidden`: Non-owner attempt rejected and audited.

---

### 2.7 Re-Scan & Self-Healing Diagnostic (Retry Scan Fix)
- **Method**: `POST`
- **Endpoint**: `/api/documents/:id/retry-scan`
- **Purpose**: Deep heuristic re-inspection that validates file signatures, resolves stuck scan states, and updates status to `CLEAN` or `QUARANTINED` with explicit diagnostic details.
- **Authentication**: Required.
- **Document Permission**: Owner OR active grant.
- **Response (200 OK)**: `{ "document": {...}, "message": "Re-scan complete: Status is CLEAN." }`

---

## 3. Sharing & External Access Endpoints

### 3.1 Grant Access / Generate External Invitation
- **Method**: `POST`
- **Endpoint**: `/api/documents/:id/share`
- **Purpose**: Grants internal member access or creates dual-channel OTP invitation for external guests.
- **Authentication**: Required.
- **Document Permission**: Document Owner only.
- **Request Body**:
  ```json
  {
    "email": "external.auditor@firm.com",
    "mobile": "+1-555-0199",
    "permissionType": "READ_DOWNLOAD",
    "isExternal": true
  }
  ```
- **Response (200 OK)**: Returns invitation object with token and demo evaluation OTPs.

---

### 3.2 Revoke Permission
- **Method**: `DELETE`
- **Endpoint**: `/api/documents/:id/permissions/:permId`
- **Purpose**: Immediately revokes granted access. All future requests fail instantly.
- **Authentication**: Required.
- **Document Permission**: Document Owner only.

---

### 3.3 Verify External Guest OTP
- **Method**: `POST`
- **Endpoint**: `/api/invitations/:token/verify-otp`
- **Purpose**: Verifies both Email OTP and SMS OTP using constant-time comparisons and unlocks document access.
- **Authentication**: None (Token-gated).
- **Request Body**: `{ "emailOtp": "123456", "smsOtp": "654321" }`
- **Response (200 OK)**: Returns unlocked session token and target document ID.
- **Error Responses**: `401 Unauthorized` on OTP mismatch with remaining attempts counter.

---

## 4. Cryptographic Audit & Admin Endpoints

### 4.1 Audit Trail Explorer
- **Method**: `GET`
- **Endpoint**: `/api/audit`
- **Purpose**: Returns audit records. Administrators see platform-wide events; owners see events concerning their owned documents.

---

### 4.2 Cryptographic Chain Verification
- **Method**: `GET`
- **Endpoint**: `/api/audit/verify-chain`
- **Purpose**: Recomputes SHA-256 digests across all blocks from Genesis to Head.
- **Response (200 OK)**:
  ```json
  {
    "isValid": true,
    "totalBlocks": 12,
    "tamperedIndex": null
  }
  ```

---

### 4.3 Automated Security Test Suite
- **Method**: `POST`
- **Endpoint**: `/api/test/run-security-suite`
- **Purpose**: Executes 19 integration tests verifying authorization boundaries, IDOR defenses, and audit integrity.
- **Response (200 OK)**: Returns complete test results with pass/fail and execution times.
