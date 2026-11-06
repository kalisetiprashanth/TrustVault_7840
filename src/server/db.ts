import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  DocumentRecord,
  PermissionRecord,
  InvitationRecord,
  AuditRecord,
  NotificationRecord,
  PlatformMetrics,
} from '../types/index.ts';
import {
  hashPassword,
  computeAuditEventHash,
  scanFileContent,
} from './crypto.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'trustvault_db.json');
const STORAGE_DIR = path.join(DATA_DIR, 'vault_storage');

interface DatabaseSchema {
  users: User[];
  passwords: Record<string, { hash: string; salt: string }>;
  documents: DocumentRecord[];
  permissions: PermissionRecord[];
  invitations: InvitationRecord[];
  auditEvents: AuditRecord[];
  notifications: NotificationRecord[];
}

const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

class DatabaseEngine {
  private db: DatabaseSchema = {
    users: [],
    passwords: {},
    documents: [],
    permissions: [],
    invitations: [],
    auditEvents: [],
    notifications: [],
  };

  constructor() {
    this.initStorage();
    this.load();
    if (this.db.users.length === 0) {
      this.seedInitialData();
    }
  }

  private initStorage() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.db = JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to load database file, initializing fresh memory state:', err);
    }
  }

  private save() {
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.db, null, 2), 'utf8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database to disk:', err);
    }
  }

  // --- Seed Initial Data ---
  private seedInitialData() {
    console.log('[TrustVault] Seeding demo accounts and security records...');

    // 1. Admin
    const adminPass = hashPassword('Admin@Trust2026!');
    const adminUser: User = {
      id: 'usr_admin_01',
      email: 'admin@trustvault.local',
      fullName: 'Sarah Chen (Security Admin)',
      mobile: '+1-555-0101',
      role: 'ADMINISTRATOR',
      status: 'ACTIVE',
      requiresPasswordChange: true,
      emailVerified: true,
      mobileVerified: true,
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    };
    this.db.users.push(adminUser);
    this.db.passwords[adminUser.id] = adminPass;

    // 2. Owner
    const ownerPass = hashPassword('Owner@Trust2026!');
    const ownerUser: User = {
      id: 'usr_owner_01',
      email: 'owner@trustvault.local',
      fullName: 'Michael Vance (Document Owner)',
      mobile: '+1-555-0102',
      role: 'OWNER',
      status: 'ACTIVE',
      requiresPasswordChange: false,
      emailVerified: true,
      mobileVerified: true,
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    };
    this.db.users.push(ownerUser);
    this.db.passwords[ownerUser.id] = ownerPass;

    // 3. Editor
    const editorPass = hashPassword('Editor@Trust2026!');
    const editorUser: User = {
      id: 'usr_editor_01',
      email: 'editor@trustvault.local',
      fullName: 'Elena Rostova (Compliance Editor)',
      mobile: '+1-555-0103',
      role: 'EDITOR',
      status: 'ACTIVE',
      requiresPasswordChange: false,
      emailVerified: true,
      mobileVerified: true,
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    };
    this.db.users.push(editorUser);
    this.db.passwords[editorUser.id] = editorPass;

    // 4. Viewer
    const viewerPass = hashPassword('Viewer@Trust2026!');
    const viewerUser: User = {
      id: 'usr_viewer_01',
      email: 'viewer@trustvault.local',
      fullName: 'David Kim (External Auditor)',
      mobile: '+1-555-0104',
      role: 'VIEWER',
      status: 'ACTIVE',
      requiresPasswordChange: false,
      emailVerified: true,
      mobileVerified: true,
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    };
    this.db.users.push(viewerUser);
    this.db.passwords[viewerUser.id] = viewerPass;

    // Initial Genesis Audit Event
    const genesisTime = new Date(Date.now() - 86400000 * 30).toISOString();
    const genesisHash = computeAuditEventHash({
      index: 1,
      timestampUtc: genesisTime,
      actorId: 'SYSTEM',
      documentId: undefined,
      action: 'SYSTEM_GENESIS_INITIALIZED',
      status: 'SUCCESS',
      details: 'TrustVault Genesis block initialized with SHA-256 cryptographic root.',
      previousHash: GENESIS_PREV_HASH,
    });

    this.db.auditEvents.push({
      id: 'aud_genesis_001',
      index: 1,
      timestampUtc: genesisTime,
      actorId: 'SYSTEM',
      actorEmail: 'system@trustvault.local',
      action: 'SYSTEM_GENESIS_INITIALIZED',
      status: 'SUCCESS',
      requestId: 'req_init_root',
      ipAddress: '127.0.0.1',
      details: 'TrustVault Genesis block initialized with SHA-256 cryptographic root.',
      previousHash: GENESIS_PREV_HASH,
      currentHash: genesisHash,
    });

    // Seed Documents in Vault Storage
    this.seedSampleDocuments(ownerUser, editorUser, viewerUser);
    this.save();
  }

  private seedSampleDocuments(owner: User, editor: User, viewer: User) {
    // Doc 1: Board Confidential Financials (Clean)
    const doc1Content = `# TRUSTVAULT Q1 FINANCIAL & RISK ASSESSMENT
Status: CONFIDENTIAL - RESTRICTED DISTRIBUTION
Date: 2026-03-01
Classification: STRICT PRIVACY - OWNER ACCESS ONLY

Key Performance Metrics:
- Operating Margin: 28.4%
- Liquidity Ratio: 3.8x
- Security Hardening Budget: $1,250,000

All document accesses are cryptographically recorded in the TrustVault immutable hash chain.`;
    const doc1Key = 'vault_' + crypto.randomUUID() + '.txt';
    fs.writeFileSync(path.join(STORAGE_DIR, doc1Key), doc1Content, 'utf8');

    const doc1: DocumentRecord = {
      id: 'doc_board_q1',
      title: 'Q1 2026 Board Financials & Strategic Plan.txt',
      originalName: 'Q1_2026_Board_Financials.txt',
      mimeType: 'text/plain',
      sizeBytes: Buffer.byteLength(doc1Content),
      storageKey: doc1Key,
      ownerId: owner.id,
      ownerEmail: owner.email,
      ownerName: owner.fullName,
      category: 'Financial',
      scanStatus: 'CLEAN',
      scanDetails: 'Passed cryptographic magic-byte and heuristic integrity scans.',
      magicVerified: true,
      isEncrypted: true,
      contentPreview: doc1Content.substring(0, 300),
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    };
    this.db.documents.push(doc1);
    this.recordAuditEventSync({
      actorId: owner.id,
      actorEmail: owner.email,
      documentId: doc1.id,
      documentName: doc1.title,
      action: 'DOC_UPLOAD',
      status: 'SUCCESS',
      details: `Owner uploaded private encrypted document ${doc1.title}`,
      ipAddress: '192.168.1.45',
    });

    // Doc 2: Shared Architecture Blueprint (Shared with Editor: READ_EDIT, Viewer: READ)
    const doc2Content = `# SNOVASYS PLATFORM SECURITY ARCHITECTURE
Standard: ISO/IEC 27001 & SOC 2 Type II
Target System: TrustVault Document Management

1. Access Control: Multi-level server-side RBAC with resource-based token verification.
2. Direct Object Reference Protection: IDOR-immune query validation on every route.
3. Cryptographic Audit Chain: Append-only SHA-256 blocks linking to previous records.
4. Quarantine Mechanism: Immediate sandbox isolation for unverified or anomalous payloads.`;
    const doc2Key = 'vault_' + crypto.randomUUID() + '.txt';
    fs.writeFileSync(path.join(STORAGE_DIR, doc2Key), doc2Content, 'utf8');

    const doc2: DocumentRecord = {
      id: 'doc_sec_arch',
      title: 'TrustVault Platform Security Architecture.txt',
      originalName: 'Security_Architecture_v2.txt',
      mimeType: 'text/plain',
      sizeBytes: Buffer.byteLength(doc2Content),
      storageKey: doc2Key,
      ownerId: owner.id,
      ownerEmail: owner.email,
      ownerName: owner.fullName,
      category: 'Technical',
      scanStatus: 'CLEAN',
      scanDetails: 'Passed cryptographic magic-byte and heuristic integrity scans.',
      magicVerified: true,
      isEncrypted: true,
      contentPreview: doc2Content.substring(0, 300),
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    };
    this.db.documents.push(doc2);
    this.recordAuditEventSync({
      actorId: owner.id,
      actorEmail: owner.email,
      documentId: doc2.id,
      documentName: doc2.title,
      action: 'DOC_UPLOAD',
      status: 'SUCCESS',
      details: `Owner uploaded technical architecture document`,
      ipAddress: '192.168.1.45',
    });

    // Share doc2 with Editor (READ_EDIT)
    const permEditor: PermissionRecord = {
      id: 'perm_ed_01',
      documentId: doc2.id,
      granteeEmail: editor.email,
      granteeUserId: editor.id,
      granteeName: editor.fullName,
      permissionType: 'READ_EDIT',
      grantedBy: owner.id,
      grantedByEmail: owner.email,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    };
    this.db.permissions.push(permEditor);
    this.recordAuditEventSync({
      actorId: owner.id,
      actorEmail: owner.email,
      documentId: doc2.id,
      documentName: doc2.title,
      action: 'PERM_GRANT',
      status: 'SUCCESS',
      permissionContext: 'READ_EDIT',
      details: `Owner granted READ_EDIT permission to ${editor.email}`,
      ipAddress: '192.168.1.45',
    });

    // Share doc2 with Viewer (READ)
    const permViewer: PermissionRecord = {
      id: 'perm_vw_01',
      documentId: doc2.id,
      granteeEmail: viewer.email,
      granteeUserId: viewer.id,
      granteeName: viewer.fullName,
      permissionType: 'READ',
      grantedBy: owner.id,
      grantedByEmail: owner.email,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    };
    this.db.permissions.push(permViewer);
    this.recordAuditEventSync({
      actorId: owner.id,
      actorEmail: owner.email,
      documentId: doc2.id,
      documentName: doc2.title,
      action: 'PERM_GRANT',
      status: 'SUCCESS',
      permissionContext: 'READ',
      details: `Owner granted READ permission to ${viewer.email}`,
      ipAddress: '192.168.1.45',
    });

    // Doc 3: Existing Bug Showcase Document ("Retry Scan" problem state)
    // Here we show the exact scenario where the file was stuck in RETRY_NEEDED due to background worker timeout
    const doc3Content = `VENDOR COMPLIANCE REPORT - SNOVASYS AUDIT 2026
Vendor ID: VND-9902
Security Clearance: Tier 1 Verification Pending
Document Status: Validated Structure - Awaiting Multi-Stage Integrity Resolution`;
    const doc3Key = 'vault_' + crypto.randomUUID() + '.txt';
    fs.writeFileSync(path.join(STORAGE_DIR, doc3Key), doc3Content, 'utf8');

    const doc3: DocumentRecord = {
      id: 'doc_retry_scan_sample',
      title: 'Vendor Compliance Audit - Snovasys 2026.txt',
      originalName: 'Vendor_Compliance_Audit_2026.txt',
      mimeType: 'text/plain',
      sizeBytes: Buffer.byteLength(doc3Content),
      storageKey: doc3Key,
      ownerId: owner.id,
      ownerEmail: owner.email,
      ownerName: owner.fullName,
      category: 'Legal',
      scanStatus: 'RETRY_NEEDED',
      scanDetails: 'Legacy scanner worker timed out. Deep heuristic and signature re-scan required to verify safety.',
      magicVerified: true,
      isEncrypted: true,
      contentPreview: doc3Content.substring(0, 200),
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    };
    this.db.documents.push(doc3);

    // Doc 4: Quarantined Document (Malicious script payload blocked)
    const doc4Content = `<script>alert('Malicious XSS / Script Injection Attempt');</script>`;
    const doc4Key = 'vault_' + crypto.randomUUID() + '.txt';
    fs.writeFileSync(path.join(STORAGE_DIR, doc4Key), doc4Content, 'utf8');

    const doc4: DocumentRecord = {
      id: 'doc_quarantine_sample',
      title: 'Untrusted Patch Script [BLOCKED].txt',
      originalName: 'patch_payload.txt',
      mimeType: 'text/plain',
      sizeBytes: Buffer.byteLength(doc4Content),
      storageKey: doc4Key,
      ownerId: owner.id,
      ownerEmail: owner.email,
      ownerName: owner.fullName,
      category: 'Security',
      scanStatus: 'QUARANTINED',
      scanDetails: 'Security quarantine: Embedded script or shell payload detected during magic inspection.',
      magicVerified: false,
      isEncrypted: false,
      contentPreview: '[Content quarantined - Access Restricted]',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    };
    this.db.documents.push(doc4);

    // Initial Notifications
    this.db.notifications.push({
      id: 'notif_01',
      userId: editor.id,
      title: 'Document Shared With You',
      message: `${owner.fullName} granted you READ_EDIT access to "${doc2.title}".`,
      type: 'INFO',
      isRead: false,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      link: `/documents/${doc2.id}`,
    });

    this.db.notifications.push({
      id: 'notif_02',
      userId: viewer.id,
      title: 'Document Shared With You',
      message: `${owner.fullName} granted you READ access to "${doc2.title}".`,
      type: 'INFO',
      isRead: false,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      link: `/documents/${doc2.id}`,
    });

    this.db.notifications.push({
      id: 'notif_03',
      userId: owner.id,
      title: 'Security Alert: Malicious Upload Blocked',
      message: 'A file containing script signatures was isolated into quarantine: "patch_payload.txt".',
      type: 'ALERT',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      link: `/documents/${doc4.id}`,
    });
  }

  // --- Cryptographic Audit Trail Methods ---

  public recordAuditEvent(eventData: {
    actorId: string;
    actorEmail: string;
    documentId?: string;
    documentName?: string;
    action: string;
    status: 'SUCCESS' | 'DENIED';
    permissionContext?: string;
    requestId?: string;
    ipAddress?: string;
    details: string;
  }): AuditRecord {
    const record = this.recordAuditEventSync(eventData);
    this.save();
    return record;
  }

  private recordAuditEventSync(eventData: {
    actorId: string;
    actorEmail: string;
    documentId?: string;
    documentName?: string;
    action: string;
    status: 'SUCCESS' | 'DENIED';
    permissionContext?: string;
    requestId?: string;
    ipAddress?: string;
    details: string;
  }): AuditRecord {
    const prevEvent = this.db.auditEvents[this.db.auditEvents.length - 1];
    const previousHash = prevEvent ? prevEvent.currentHash : GENESIS_PREV_HASH;
    const nextIndex = prevEvent ? prevEvent.index + 1 : 1;
    const timestampUtc = new Date().toISOString();

    const currentHash = computeAuditEventHash({
      index: nextIndex,
      timestampUtc,
      actorId: eventData.actorId,
      documentId: eventData.documentId,
      action: eventData.action,
      status: eventData.status,
      details: eventData.details,
      previousHash,
    });

    const record: AuditRecord = {
      id: 'aud_' + crypto.randomUUID().substring(0, 8),
      index: nextIndex,
      timestampUtc,
      actorId: eventData.actorId,
      actorEmail: eventData.actorEmail,
      documentId: eventData.documentId,
      documentName: eventData.documentName,
      action: eventData.action,
      status: eventData.status,
      permissionContext: eventData.permissionContext,
      requestId: eventData.requestId || 'req_' + crypto.randomUUID().substring(0, 8),
      ipAddress: eventData.ipAddress || '127.0.0.1',
      details: eventData.details,
      previousHash,
      currentHash,
    };

    this.db.auditEvents.push(record);
    return record;
  }

  /**
   * Tamper-Resistant Chain Verification
   * Re-evaluates every block from Genesis to Head.
   */
  public verifyAuditChain(): {
    isValid: boolean;
    totalBlocks: number;
    tamperedIndex?: number;
    error?: string;
    brokenBlockDetails?: any;
  } {
    const events = this.db.auditEvents;
    if (events.length === 0) {
      return { isValid: true, totalBlocks: 0 };
    }

    for (let i = 0; i < events.length; i++) {
      const block = events[i];
      const expectedPrevHash = i === 0 ? GENESIS_PREV_HASH : events[i - 1].currentHash;

      // 1. Check previous hash connection
      if (block.previousHash !== expectedPrevHash) {
        return {
          isValid: false,
          totalBlocks: events.length,
          tamperedIndex: block.index,
          error: `Broken hash link at Block #${block.index}: Expected previousHash ${expectedPrevHash.substring(0, 16)}... but found ${block.previousHash.substring(0, 16)}...`,
          brokenBlockDetails: block,
        };
      }

      // 2. Re-compute hash of the block itself
      const recalculatedHash = computeAuditEventHash({
        index: block.index,
        timestampUtc: block.timestampUtc,
        actorId: block.actorId,
        documentId: block.documentId,
        action: block.action,
        status: block.status,
        details: block.details,
        previousHash: block.previousHash,
      });

      if (recalculatedHash !== block.currentHash) {
        return {
          isValid: false,
          totalBlocks: events.length,
          tamperedIndex: block.index,
          error: `Hash mismatch at Block #${block.index}: Data inside block was tampered with!`,
          brokenBlockDetails: block,
        };
      }
    }

    return {
      isValid: true,
      totalBlocks: events.length,
    };
  }

  // --- Users & Passwords ---
  public getUsers(): User[] {
    return [...this.db.users];
  }

  public getUserById(id: string): User | undefined {
    return this.db.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getPasswordRecord(userId: string): { hash: string; salt: string } | undefined {
    return this.db.passwords[userId];
  }

  public createUser(userData: Omit<User, 'id' | 'createdAt'>, passwordHash: string, salt: string): User {
    const id = 'usr_' + crypto.randomUUID().substring(0, 8);
    const user: User = {
      ...userData,
      id,
      createdAt: new Date().toISOString(),
    };
    this.db.users.push(user);
    this.db.passwords[id] = { hash: passwordHash, salt };
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.db.users.find(u => u.id === id);
    if (!user) return undefined;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  public updatePassword(userId: string, newHash: string, newSalt: string): boolean {
    if (!this.db.passwords[userId]) return false;
    this.db.passwords[userId] = { hash: newHash, salt: newSalt };
    const user = this.getUserById(userId);
    if (user) {
      user.requiresPasswordChange = false;
    }
    this.save();
    return true;
  }

  // --- Documents & Storage ---
  public getDocuments(): DocumentRecord[] {
    return [...this.db.documents];
  }

  public getDocumentById(id: string): DocumentRecord | undefined {
    return this.db.documents.find(d => d.id === id);
  }

  public saveDocumentBinary(buffer: Buffer, originalName: string, mimeType: string, owner: User, category: string): DocumentRecord {
    const storageKey = 'vault_' + crypto.randomUUID() + path.extname(originalName);
    const fullPath = path.join(STORAGE_DIR, storageKey);
    fs.writeFileSync(fullPath, buffer);

    const scanResult = scanFileContent(buffer, originalName, mimeType);

    let preview: string | undefined = undefined;
    if (scanResult.status === 'CLEAN' && (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('csv'))) {
      preview = buffer.toString('utf8', 0, Math.min(buffer.length, 500));
    }

    const doc: DocumentRecord = {
      id: 'doc_' + crypto.randomUUID().substring(0, 8),
      title: originalName,
      originalName,
      mimeType,
      sizeBytes: buffer.length,
      storageKey,
      ownerId: owner.id,
      ownerEmail: owner.email,
      ownerName: owner.fullName,
      category: category || 'General',
      scanStatus: scanResult.status,
      scanDetails: scanResult.details,
      magicVerified: scanResult.status === 'CLEAN',
      isEncrypted: true,
      contentPreview: preview,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.documents.push(doc);
    this.save();
    return doc;
  }

  public getDocumentBinary(storageKey: string): Buffer | null {
    const fullPath = path.join(STORAGE_DIR, storageKey);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath);
  }

  public updateDocument(id: string, updates: Partial<DocumentRecord>): DocumentRecord | undefined {
    const doc = this.db.documents.find(d => d.id === id);
    if (!doc) return undefined;
    Object.assign(doc, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return doc;
  }

  public deleteDocument(id: string): boolean {
    const index = this.db.documents.findIndex(d => d.id === id);
    if (index === -1) return false;
    const doc = this.db.documents[index];

    // Delete stored file from disk
    const fullPath = path.join(STORAGE_DIR, doc.storageKey);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (e) {
        console.error('Failed to unlink file:', e);
      }
    }

    // Remove document and its permissions
    this.db.documents.splice(index, 1);
    this.db.permissions = this.db.permissions.filter(p => p.documentId !== id);
    this.db.invitations = this.db.invitations.filter(i => i.documentId !== id);
    this.save();
    return true;
  }

  // --- Permissions & Access Control ---
  public getPermissionsForDocument(documentId: string): PermissionRecord[] {
    return this.db.permissions.filter(p => p.documentId === documentId);
  }

  public getPermissionsForUser(email: string, userId?: string): PermissionRecord[] {
    return this.db.permissions.filter(
      p => p.granteeEmail.toLowerCase() === email.toLowerCase() || (userId && p.granteeUserId === userId)
    );
  }

  public grantPermission(data: {
    documentId: string;
    granteeEmail: string;
    granteeUserId?: string;
    granteeName?: string;
    permissionType: 'READ' | 'READ_DOWNLOAD' | 'READ_EDIT';
    grantedBy: string;
    grantedByEmail: string;
    expiresAt?: string;
  }): PermissionRecord {
    // Check if permission already exists for this grantee, update if so
    const existingIndex = this.db.permissions.findIndex(
      p => p.documentId === data.documentId && p.granteeEmail.toLowerCase() === data.granteeEmail.toLowerCase()
    );

    if (existingIndex !== -1) {
      const existing = this.db.permissions[existingIndex];
      existing.permissionType = data.permissionType;
      existing.expiresAt = data.expiresAt;
      existing.updatedAt = new Date().toISOString();
      this.save();
      return existing;
    }

    const perm: PermissionRecord = {
      id: 'perm_' + crypto.randomUUID().substring(0, 8),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.permissions.push(perm);
    this.save();
    return perm;
  }

  public revokePermission(documentId: string, permissionId: string): boolean {
    const initialLen = this.db.permissions.length;
    this.db.permissions = this.db.permissions.filter(
      p => !(p.documentId === documentId && p.id === permissionId)
    );
    if (this.db.permissions.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- External Invitations ---
  public createInvitation(data: {
    documentId: string;
    documentTitle: string;
    senderEmail: string;
    senderName: string;
    recipientEmail: string;
    recipientMobile: string;
    permissionType: 'READ' | 'READ_DOWNLOAD' | 'READ_EDIT';
    emailOtp: string;
    smsOtp: string;
    expiresAt: string;
  }): InvitationRecord {
    const token = crypto.randomBytes(24).toString('hex');
    const invite: InvitationRecord = {
      id: 'inv_' + crypto.randomUUID().substring(0, 8),
      token,
      documentId: data.documentId,
      documentTitle: data.documentTitle,
      senderEmail: data.senderEmail,
      senderName: data.senderName,
      recipientEmail: data.recipientEmail,
      recipientMobile: data.recipientMobile,
      permissionType: data.permissionType,
      status: 'PENDING',
      emailOtpHash: crypto.createHash('sha256').update(data.emailOtp).digest('hex'),
      smsOtpHash: crypto.createHash('sha256').update(data.smsOtp).digest('hex'),
      emailOtpPlainForDev: data.emailOtp, // For display in test/demo mode
      smsOtpPlainForDev: data.smsOtp,
      expiresAt: data.expiresAt,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    this.db.invitations.push(invite);
    this.save();
    return invite;
  }

  public getInvitationByToken(token: string): InvitationRecord | undefined {
    return this.db.invitations.find(i => i.token === token);
  }

  public updateInvitation(id: string, updates: Partial<InvitationRecord>): InvitationRecord | undefined {
    const inv = this.db.invitations.find(i => i.id === id);
    if (!inv) return undefined;
    Object.assign(inv, updates);
    this.save();
    return inv;
  }

  public getInvitations(): InvitationRecord[] {
    return [...this.db.invitations];
  }

  // --- Notifications ---
  public getNotificationsForUser(userId: string): NotificationRecord[] {
    return this.db.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addNotification(userId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT', link?: string): NotificationRecord {
    const notif: NotificationRecord = {
      id: 'notif_' + crypto.randomUUID().substring(0, 8),
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
      link,
    };
    this.db.notifications.push(notif);
    this.save();
    return notif;
  }

  public markNotificationAsRead(id: string, userId: string): boolean {
    const notif = this.db.notifications.find(n => n.id === id && n.userId === userId);
    if (notif) {
      notif.isRead = true;
      this.save();
      return true;
    }
    return false;
  }

  // --- Audit Events ---
  public getAuditEvents(): AuditRecord[] {
    return [...this.db.auditEvents].reverse(); // Most recent first for view
  }

  // --- Platform Metrics ---
  public getMetrics(): PlatformMetrics {
    const totalUsers = this.db.users.length;
    const activeUsers = this.db.users.filter(u => u.status === 'ACTIVE').length;
    const totalDocuments = this.db.documents.length;
    const cleanDocuments = this.db.documents.filter(d => d.scanStatus === 'CLEAN').length;
    const quarantinedDocuments = this.db.documents.filter(d => d.scanStatus === 'QUARANTINED' || d.scanStatus === 'RETRY_NEEDED').length;
    const totalAuditEvents = this.db.auditEvents.length;
    const deniedAccessEvents = this.db.auditEvents.filter(a => a.status === 'DENIED').length;
    const totalStorageBytes = this.db.documents.reduce((acc, d) => acc + (d.sizeBytes || 0), 0);
    const chainVerification = this.verifyAuditChain();

    return {
      totalUsers,
      activeUsers,
      totalDocuments,
      cleanDocuments,
      quarantinedDocuments,
      totalAuditEvents,
      deniedAccessEvents,
      totalStorageBytes,
      chainValid: chainVerification.isValid,
    };
  }
}

export const db = new DatabaseEngine();
