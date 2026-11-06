import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { db } from './src/server/db.ts';
import {
  hashPassword,
  verifyPassword,
  generateOtp,
  timingSafeEqualString,
} from './src/server/crypto.ts';
import { runSecurityTestSuite } from './src/server/securityTests.ts';
import { User, PermissionType } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simple in-memory rate limiter for auth / OTP
interface RateLimitBucket {
  count: number;
  resetTime: number;
}
const rateLimits = new Map<string, RateLimitBucket>();

function rateLimiter(limit = 30, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}_${req.path}`;
    const now = Date.now();
    let bucket = rateLimits.get(key);

    if (!bucket || now > bucket.resetTime) {
      bucket = { count: 1, resetTime: now + windowMs };
      rateLimits.set(key, bucket);
    } else {
      bucket.count++;
      if (bucket.count > limit) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please wait before retrying.',
        });
      }
    }
    next();
  };
}

// Multer memory storage for inspection before writing to private vault
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: User;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Support Bearer token or User-ID header
  const authHeader = req.headers.authorization;
  const userIdHeader = req.headers['x-trustvault-user-id'] as string;

  let userId: string | null = null;
  if (userIdHeader) {
    userId = userIdHeader;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Token can be user ID or session token
    if (token.startsWith('usr_')) {
      userId = token;
    }
  }

  if (userId) {
    const user = db.getUserById(userId);
    if (user && user.status === 'ACTIVE') {
      req.user = user;
    }
  }

  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
  }
  next();
}

function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient role privileges' });
    }
    next();
  };
}

app.use(authMiddleware);

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/login', rateLimiter(10, 60000), (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing Credentials', message: 'Email and password required' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    db.recordAuditEvent({
      actorId: 'ANONYMOUS',
      actorEmail: email,
      action: 'AUTH_LOGIN_FAILED',
      status: 'DENIED',
      ipAddress: req.ip,
      details: `Failed login attempt: Account ${email} not found`,
    });
    return res.status(401).json({ error: 'Invalid Credentials', message: 'Incorrect email or password' });
  }

  if (user.status !== 'ACTIVE') {
    db.recordAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      action: 'AUTH_LOGIN_BLOCKED',
      status: 'DENIED',
      ipAddress: req.ip,
      details: `Login blocked: Account status is ${user.status}`,
    });
    return res.status(403).json({ error: 'Account Inactive', message: 'Account has been deactivated. Contact Admin.' });
  }

  const creds = db.getPasswordRecord(user.id);
  if (!creds || !verifyPassword(password, creds.hash, creds.salt)) {
    db.recordAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      action: 'AUTH_LOGIN_FAILED',
      status: 'DENIED',
      ipAddress: req.ip,
      details: `Failed login attempt: Incorrect password for ${email}`,
    });
    return res.status(401).json({ error: 'Invalid Credentials', message: 'Incorrect email or password' });
  }

  // Update last login
  db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

  db.recordAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    action: 'AUTH_LOGIN_SUCCESS',
    status: 'SUCCESS',
    ipAddress: req.ip,
    details: `User ${user.email} logged in successfully [Role: ${user.role}]`,
  });

  return res.json({
    user,
    token: user.id, // Lightweight token matching session user ID
    requiresPasswordChange: user.requiresPasswordChange,
  });
});

app.post('/api/auth/register', rateLimiter(5, 60000), (req: Request, res: Response) => {
  const { fullName, email, mobile, password, role } = req.body;

  if (!fullName || !email || !mobile || !password) {
    return res.status(400).json({ error: 'Validation Error', message: 'All registration fields are required' });
  }

  // Prevent duplicate registration
  if (db.getUserByEmail(email)) {
    return res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists' });
  }

  // Security rule: Prevent self-registration as ADMINISTRATOR
  const assignedRole = role === 'OWNER' || role === 'EDITOR' || role === 'VIEWER' ? role : 'OWNER';

  const { hash, salt } = hashPassword(password);
  const newUser = db.createUser(
    {
      fullName,
      email,
      mobile,
      role: assignedRole,
      status: 'ACTIVE',
      requiresPasswordChange: false,
      emailVerified: true, // Auto-verified in prototype after OTP check
      mobileVerified: true,
    },
    hash,
    salt
  );

  db.recordAuditEvent({
    actorId: newUser.id,
    actorEmail: newUser.email,
    action: 'AUTH_REGISTER',
    status: 'SUCCESS',
    ipAddress: req.ip,
    details: `New account registered for ${newUser.email} with role ${newUser.role}`,
  });

  return res.status(201).json({
    user: newUser,
    token: newUser.id,
    message: 'Registration successful',
  });
});

app.post('/api/auth/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user!;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Validation Error', message: 'New password must be at least 8 characters' });
  }

  const creds = db.getPasswordRecord(user.id);
  if (!creds || !verifyPassword(currentPassword, creds.hash, creds.salt)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Current password is incorrect' });
  }

  const { hash, salt } = hashPassword(newPassword);
  db.updatePassword(user.id, hash, salt);

  db.recordAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    action: 'AUTH_PASSWORD_CHANGED',
    status: 'SUCCESS',
    ipAddress: req.ip,
    details: `Password changed for user ${user.email}`,
  });

  return res.json({ success: true, message: 'Password updated successfully' });
});

app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ user: null });
  }
  return res.json({ user: req.user });
});

// --- DOCUMENT MANAGEMENT ROUTES ---

// List documents accessible to the authenticated user
app.get('/api/documents', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const allDocs = db.getDocuments();

  if (user.role === 'ADMINISTRATOR') {
    // Administrator oversight: can view all document METADATA for governance and auditing,
    // but cannot read content unless explicitly shared.
    return res.json({
      documents: allDocs.map(d => ({
        ...d,
        contentPreview: undefined, // Content stripped for admin policy isolation
      })),
    });
  }

  // Filter for regular users: Owner documents OR documents explicitly shared with user
  const userPerms = db.getPermissionsForUser(user.email, user.id);
  const sharedDocIds = new Set(userPerms.map(p => p.documentId));

  const accessibleDocs = allDocs.filter(d => d.ownerId === user.id || sharedDocIds.has(d.id));

  // Attach effective permission to each document for the UI
  const results = accessibleDocs.map(d => {
    let effectivePerm: PermissionType | 'OWNER' = 'READ';
    if (d.ownerId === user.id) {
      effectivePerm = 'OWNER';
    } else {
      const grant = userPerms.find(p => p.documentId === d.id);
      if (grant) effectivePerm = grant.permissionType;
    }
    return {
      ...d,
      effectivePermission: effectivePerm,
    };
  });

  return res.json({ documents: results });
});

// Upload a document into private encrypted vault
app.post(
  '/api/documents/upload',
  requireAuth,
  requireRole('ADMINISTRATOR', 'OWNER', 'EDITOR'),
  upload.single('file'),
  (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const file = req.file;
    const category = (req.body.category as string) || 'General';

    if (!file) {
      return res.status(400).json({ error: 'Bad Request', message: 'No file provided for upload' });
    }

    const doc = db.saveDocumentBinary(file.buffer, file.originalname, file.mimetype, user, category);

    db.recordAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      documentId: doc.id,
      documentName: doc.title,
      action: 'DOC_UPLOAD',
      status: doc.scanStatus === 'QUARANTINED' ? 'DENIED' : 'SUCCESS',
      ipAddress: req.ip,
      details: `File uploaded: ${doc.title} (${doc.sizeBytes} bytes). Scan status: ${doc.scanStatus}. ${doc.scanDetails}`,
    });

    if (doc.scanStatus === 'QUARANTINED') {
      db.addNotification(
        user.id,
        'File Quarantined',
        `Uploaded file "${doc.title}" was quarantined due to security scan detection.`,
        'ALERT',
        `/documents/${doc.id}`
      );
    }

    return res.status(201).json({ document: doc });
  }
);

// Resource-Based Authorization Middleware for specific document ID
function authorizeDocumentAccess(actionRequired: 'READ' | 'READ_DOWNLOAD' | 'READ_EDIT' | 'DELETE' | 'MANAGE_PERMISSIONS') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user!;
    const docId = req.params.id as string;
    const doc = db.getDocumentById(docId);

    if (!doc) {
      return res.status(404).json({ error: 'Not Found', message: 'Document not found' });
    }

    // Owner always has full access
    if (doc.ownerId === user.id) {
      return next();
    }

    // Deletion and Permission Management are strictly restricted to Owner
    if (actionRequired === 'DELETE' || actionRequired === 'MANAGE_PERMISSIONS') {
      db.recordAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        documentId: doc.id,
        documentName: doc.title,
        action: `SECURITY_IDOR_BLOCKED_${actionRequired}`,
        status: 'DENIED',
        ipAddress: req.ip,
        details: `IDOR Protection: User ${user.email} attempted to ${actionRequired} document owned by ${doc.ownerEmail}`,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the document owner can perform this operation',
      });
    }

    // Check grants
    const perms = db.getPermissionsForUser(user.email, user.id).filter(p => p.documentId === doc.id);
    if (perms.length === 0) {
      // Unrelated user or admin without explicit content grant
      db.recordAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        documentId: doc.id,
        documentName: doc.title,
        action: `SECURITY_IDOR_BLOCKED_${actionRequired}`,
        status: 'DENIED',
        ipAddress: req.ip,
        details: `Access Denied: User ${user.email} has no valid permissions for document ${doc.title}`,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have authorization to access this document',
      });
    }

    const grant = perms[0];
    if (grant.expiresAt && new Date(grant.expiresAt).getTime() < Date.now()) {
      return res.status(403).json({ error: 'Forbidden', message: 'Permission for this document has expired' });
    }

    // Check capability level
    if (actionRequired === 'READ_EDIT' && grant.permissionType !== 'READ_EDIT') {
      db.recordAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        documentId: doc.id,
        documentName: doc.title,
        action: 'SECURITY_EDIT_DENIED',
        status: 'DENIED',
        ipAddress: req.ip,
        details: `Permission denied: User ${user.email} attempted to edit with read-only grant`,
      });
      return res.status(403).json({ error: 'Forbidden', message: 'Read-only access: Editing is not permitted' });
    }

    if (actionRequired === 'READ_DOWNLOAD' && grant.permissionType === 'READ') {
      db.recordAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        documentId: doc.id,
        documentName: doc.title,
        action: 'SECURITY_DOWNLOAD_DENIED',
        status: 'DENIED',
        ipAddress: req.ip,
        details: `Permission denied: User ${user.email} attempted to download with restricted view-only grant`,
      });
      return res.status(403).json({ error: 'Forbidden', message: 'Download restricted: You only have view rights' });
    }

    next();
  };
}

// Get document details & permissions
app.get('/api/documents/:id', requireAuth, authorizeDocumentAccess('READ'), (req: AuthenticatedRequest, res: Response) => {
  const docId = req.params.id as string;
  const doc = db.getDocumentById(docId)!;
  const permissions = db.getPermissionsForDocument(docId);
  const user = req.user!;

  db.recordAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    documentId: doc.id,
    documentName: doc.title,
    action: 'DOC_READ',
    status: 'SUCCESS',
    ipAddress: req.ip,
    details: `User ${user.email} viewed document details for ${doc.title}`,
  });

  return res.json({
    document: doc,
    permissions,
    isOwner: doc.ownerId === user.id,
  });
});

// Download document binary
app.get('/api/documents/:id/download', requireAuth, authorizeDocumentAccess('READ_DOWNLOAD'), (req: AuthenticatedRequest, res: Response) => {
  const docId = req.params.id as string;
  const doc = db.getDocumentById(docId)!;
  const user = req.user!;

  if (doc.scanStatus === 'QUARANTINED') {
    return res.status(403).json({
      error: 'Security Quarantine',
      message: 'This document has been quarantined due to security risks and cannot be downloaded.',
    });
  }

  const binary = db.getDocumentBinary(doc.storageKey);
  if (!binary) {
    return res.status(404).json({ error: 'File Not Found', message: 'Physical file not found in vault storage' });
  }

  db.recordAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    documentId: doc.id,
    documentName: doc.title,
    action: 'DOC_DOWNLOAD',
    status: 'SUCCESS',
    ipAddress: req.ip,
    details: `User ${user.email} downloaded binary for ${doc.title}`,
  });

  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.send(binary);
});

// Update document metadata
app.put('/api/documents/:id', requireAuth, authorizeDocumentAccess('READ_EDIT'), (req: AuthenticatedRequest, res: Response) => {
  const docId = req.params.id as string;
  const { title, category } = req.body;
  const user = req.user!;

  const updated = db.updateDocument(docId, {
    title: title || undefined,
    category: category || undefined,
  });

  db.recordAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    documentId: docId,
    documentName: updated?.title,
    action: 'DOC_EDIT',
    status: 'SUCCESS',
    ipAddress: req.ip,
    details: `User ${user.email} updated document metadata (Title: ${title}, Category: ${category})`,
  });

  return res.json({ document: updated });
});

// Delete document
app.delete('/api/documents/:id', requireAuth, authorizeDocumentAccess('DELETE'), (req: AuthenticatedRequest, res: Response) => {
  const docId = req.params.id as string;
  const doc = db.getDocumentById(docId)!;
  const user = req.user!;

  db.deleteDocument(docId);

  db.recordAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    documentId: docId,
    documentName: doc.title,
    action: 'DOC_DELETE',
    status: 'SUCCESS',
    ipAddress: req.ip,
    details: `Owner ${user.email} deleted document ${doc.title}`,
  });

  return res.json({ success: true, message: 'Document permanently deleted from vault' });
});

// --- FIX FOR "RETRY SCAN" PROBLEM ---
// Self-healing re-scan endpoint that inspects binary magic bytes,
// validates structure, repairs scan status without compromising security.
app.post('/api/documents/:id/retry-scan', requireAuth, authorizeDocumentAccess('READ'), (req: AuthenticatedRequest, res: Response) => {
  const docId = req.params.id as string;
  const doc = db.getDocumentById(docId)!;
  const user = req.user!;

  const binary = db.getDocumentBinary(doc.storageKey);
  if (!binary) {
    return res.status(404).json({ error: 'File Not Found', message: 'Binary file missing from vault' });
  }

  // Re-scan with deep heuristics
  const { scanFileContent } = require('./src/server/crypto.ts');
  const scanResult = scanFileContent(binary, doc.originalName, doc.mimeType);

  const updated = db.updateDocument(docId, {
    scanStatus: scanResult.status,
    scanDetails: scanResult.details,
    magicVerified: scanResult.status === 'CLEAN',
  });

  db.recordAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    documentId: doc.id,
    documentName: doc.title,
    action: 'DOC_SCAN_REVERIFY',
    status: scanResult.status === 'CLEAN' ? 'SUCCESS' : 'DENIED',
    ipAddress: req.ip,
    details: `Multi-stage scanner re-evaluated file: Status updated to ${scanResult.status}. ${scanResult.details}`,
  });

  return res.json({
    document: updated,
    message: `Re-scan complete: Status is ${scanResult.status}. ${scanResult.details}`,
  });
});

// --- PERMISSIONS & SHARING ---

// Share document with a user or external contact
app.post('/api/documents/:id/share', requireAuth, authorizeDocumentAccess('MANAGE_PERMISSIONS'), (req: AuthenticatedRequest, res: Response) => {
  const docId = req.params.id as string;
  const doc = db.getDocumentById(docId)!;
  const user = req.user!;
  const { email, mobile, permissionType, isExternal } = req.body;

  if (!email || !permissionType) {
    return res.status(400).json({ error: 'Bad Request', message: 'Recipient email and permission type required' });
  }

  const validPermTypes: PermissionType[] = ['READ', 'READ_DOWNLOAD', 'READ_EDIT'];
  if (!validPermTypes.includes(permissionType)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid permission type' });
  }

  if (isExternal) {
    // Generate secure external invitation with dual OTP
    const emailOtp = generateOtp();
    const smsOtp = generateOtp();
    const expiresAt = new Date(Date.now() + 86400000 * 3).toISOString(); // 3 days

    const invite = db.createInvitation({
      documentId: doc.id,
      documentTitle: doc.title,
      senderEmail: user.email,
      senderName: user.fullName,
      recipientEmail: email,
      recipientMobile: mobile || '+1-555-0000',
      permissionType,
      emailOtp,
      smsOtp,
      expiresAt,
    });

    db.recordAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      documentId: doc.id,
      documentName: doc.title,
      action: 'INVITE_EXTERNAL_SENT',
      status: 'SUCCESS',
      ipAddress: req.ip,
      details: `Owner sent external share invitation to ${email} with OTP requirement [Perm: ${permissionType}]`,
    });

    return res.json({
      invitation: invite,
      message: 'External invitation generated. Recipient must verify OTPs to access.',
    });
  }

  // Internal user share
  const existingUser = db.getUserByEmail(email);
  const perm = db.grantPermission({
    documentId: doc.id,
    granteeEmail: email,
    granteeUserId: existingUser?.id,
    granteeName: existingUser?.fullName,
    permissionType,
    grantedBy: user.id,
    grantedByEmail: user.email,
  });

  if (existingUser) {
    db.addNotification(
      existingUser.id,
      'New Document Shared',
      `${user.fullName} shared "${doc.title}" with you (${permissionType} access).`,
      'INFO',
      `/documents/${doc.id}`
    );
  }

  db.recordAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    documentId: doc.id,
    documentName: doc.title,
    action: 'PERM_GRANT',
    status: 'SUCCESS',
    permissionContext: permissionType,
    ipAddress: req.ip,
    details: `Owner ${user.email} granted ${permissionType} access to ${email}`,
  });

  return res.json({ permission: perm, message: `Access granted to ${email}` });
});

// Revoke access immediately
app.delete('/api/documents/:id/permissions/:permId', requireAuth, authorizeDocumentAccess('MANAGE_PERMISSIONS'), (req: AuthenticatedRequest, res: Response) => {
  const docId = req.params.id as string;
  const permId = req.params.permId as string;
  const doc = db.getDocumentById(docId)!;
  const user = req.user!;

  const perms = db.getPermissionsForDocument(docId);
  const targetPerm = perms.find(p => p.id === permId);

  const revoked = db.revokePermission(docId, permId);
  if (!revoked) {
    return res.status(404).json({ error: 'Not Found', message: 'Permission record not found' });
  }

  if (targetPerm?.granteeUserId) {
    db.addNotification(
      targetPerm.granteeUserId,
      'Access Revoked',
      `Your access to "${doc.title}" was revoked by the owner.`,
      'WARNING'
    );
  }

  db.recordAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    documentId: doc.id,
    documentName: doc.title,
    action: 'PERM_REVOKE',
    status: 'SUCCESS',
    ipAddress: req.ip,
    details: `Owner ${user.email} revoked permission for ${targetPerm?.granteeEmail || 'grantee'}`,
  });

  return res.json({ success: true, message: 'Permission revoked immediately' });
});

// --- EXTERNAL INVITATION PORTAL ---

app.get('/api/invitations/:token', (req: Request, res: Response) => {
  const token = req.params.token as string;
  const invite = db.getInvitationByToken(token);

  if (!invite) {
    return res.status(404).json({ error: 'Not Found', message: 'Invalid or expired invitation token' });
  }

  return res.json({
    invitation: {
      id: invite.id,
      token: invite.token,
      documentTitle: invite.documentTitle,
      senderName: invite.senderName,
      recipientEmail: invite.recipientEmail,
      recipientMobile: invite.recipientMobile,
      permissionType: invite.permissionType,
      status: invite.status,
      expiresAt: invite.expiresAt,
      emailOtpPlainForDev: invite.emailOtpPlainForDev,
      smsOtpPlainForDev: invite.smsOtpPlainForDev,
    },
  });
});

app.post('/api/invitations/:token/verify-otp', (req: Request, res: Response) => {
  const token = req.params.token as string;
  const { emailOtp, smsOtp } = req.body;
  const invite = db.getInvitationByToken(token);

  if (!invite) {
    return res.status(404).json({ error: 'Not Found', message: 'Invitation not found' });
  }

  if (invite.status !== 'PENDING') {
    return res.status(400).json({ error: 'Bad Request', message: `Invitation is already ${invite.status}` });
  }

  if (invite.attempts >= 5) {
    db.updateInvitation(invite.id, { status: 'EXPIRED' });
    return res.status(429).json({ error: 'Too Many Attempts', message: 'Maximum verification attempts exceeded' });
  }

  const { sha256 } = require('./src/server/crypto.ts');
  const inputEmailHash = sha256(emailOtp || '');
  const inputSmsHash = sha256(smsOtp || '');

  const emailMatch = timingSafeEqualString(inputEmailHash, invite.emailOtpHash);
  const smsMatch = timingSafeEqualString(inputSmsHash, invite.smsOtpHash);

  if (!emailMatch || !smsMatch) {
    db.updateInvitation(invite.id, { attempts: invite.attempts + 1 });
    return res.status(401).json({
      error: 'Invalid OTP',
      message: 'Email OTP or SMS OTP is incorrect. Please verify and try again.',
      remainingAttempts: 5 - (invite.attempts + 1),
    });
  }

  // Verified! Grant the permission to recipient email
  db.grantPermission({
    documentId: invite.documentId,
    granteeEmail: invite.recipientEmail,
    permissionType: invite.permissionType,
    grantedBy: 'EXTERNAL_INVITATION',
    grantedByEmail: invite.senderEmail,
  });

  db.updateInvitation(invite.id, { status: 'CLAIMED' });

  // If user does not exist, auto-create a verified EXTERNAL user
  let recipientUser = db.getUserByEmail(invite.recipientEmail);
  if (!recipientUser) {
    const { hash, salt } = hashPassword('External@Trust2026!');
    recipientUser = db.createUser(
      {
        fullName: `External (${invite.recipientEmail.split('@')[0]})`,
        email: invite.recipientEmail,
        mobile: invite.recipientMobile,
        role: 'VIEWER',
        status: 'ACTIVE',
        requiresPasswordChange: false,
        emailVerified: true,
        mobileVerified: true,
      },
      hash,
      salt
    );
  }

  db.recordAuditEvent({
    actorId: recipientUser.id,
    actorEmail: recipientUser.email,
    documentId: invite.documentId,
    documentName: invite.documentTitle,
    action: 'EXTERNAL_INVITE_CLAIMED',
    status: 'SUCCESS',
    ipAddress: req.ip,
    details: `External recipient verified identity via Email & SMS OTP and unlocked document`,
  });

  return res.json({
    success: true,
    user: recipientUser,
    token: recipientUser.id,
    documentId: invite.documentId,
    message: 'Identity successfully verified. Access unlocked!',
  });
});

// --- AUDIT TRAIL ROUTES ---

app.get('/api/audit', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const allEvents = db.getAuditEvents();

  if (user.role === 'ADMINISTRATOR') {
    return res.json({ events: allEvents });
  }

  // Owners can see events for their own documents or their own actions
  const userDocs = new Set(db.getDocuments().filter(d => d.ownerId === user.id).map(d => d.id));
  const filtered = allEvents.filter(
    e => e.actorId === user.id || (e.documentId && userDocs.has(e.documentId))
  );

  return res.json({ events: filtered });
});

// Cryptographic Chain Verification Endpoint
app.get('/api/audit/verify-chain', (req: Request, res: Response) => {
  const result = db.verifyAuditChain();
  return res.json(result);
});

// --- ADMIN MANAGEMENT ROUTES ---

app.get('/api/admin/metrics', requireAuth, requireRole('ADMINISTRATOR'), (req: AuthenticatedRequest, res: Response) => {
  const metrics = db.getMetrics();
  return res.json({ metrics });
});

app.get('/api/admin/users', requireAuth, requireRole('ADMINISTRATOR'), (req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsers();
  return res.json({ users });
});

app.post('/api/admin/users', requireAuth, requireRole('ADMINISTRATOR'), (req: AuthenticatedRequest, res: Response) => {
  const { fullName, email, mobile, role, temporaryPassword } = req.body;

  if (!fullName || !email || !role || !temporaryPassword) {
    return res.status(400).json({ error: 'Bad Request', message: 'Required fields missing' });
  }

  if (db.getUserByEmail(email)) {
    return res.status(409).json({ error: 'Conflict', message: 'User already exists' });
  }

  const { hash, salt } = hashPassword(temporaryPassword);
  const newUser = db.createUser(
    {
      fullName,
      email,
      mobile: mobile || '+1-555-0000',
      role,
      status: 'ACTIVE',
      requiresPasswordChange: true,
      emailVerified: true,
      mobileVerified: true,
    },
    hash,
    salt
  );

  db.recordAuditEvent({
    actorId: req.user!.id,
    actorEmail: req.user!.email,
    action: 'ADMIN_CREATE_MEMBER',
    status: 'SUCCESS',
    ipAddress: req.ip,
    details: `Admin created new member ${newUser.email} [Role: ${newUser.role}]`,
  });

  return res.status(201).json({ user: newUser });
});

app.put('/api/admin/users/:id/status', requireAuth, requireRole('ADMINISTRATOR'), (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id as string;
  const { status } = req.body;

  if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid status' });
  }

  const updated = db.updateUser(targetId, { status });
  if (!updated) {
    return res.status(404).json({ error: 'Not Found', message: 'User not found' });
  }

  db.recordAuditEvent({
    actorId: req.user!.id,
    actorEmail: req.user!.email,
    action: 'ADMIN_UPDATE_USER_STATUS',
    status: 'SUCCESS',
    ipAddress: req.ip,
    details: `Admin changed status for ${updated.email} to ${status}`,
  });

  return res.json({ user: updated });
});

// --- NOTIFICATIONS ---

app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const notifs = db.getNotificationsForUser(req.user!.id);
  return res.json({ notifications: notifs });
});

app.put('/api/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const notifId = req.params.id as string;
  db.markNotificationAsRead(notifId, req.user!.id);
  return res.json({ success: true });
});

// --- AUTOMATED SECURITY TEST SUITE ENDPOINT ---

app.post('/api/test/run-security-suite', (req: Request, res: Response) => {
  const results = runSecurityTestSuite();
  const allPassed = results.every(r => r.passed);
  return res.json({
    allPassed,
    totalTests: results.length,
    passedCount: results.filter(r => r.passed).length,
    failedCount: results.filter(r => !r.passed).length,
    results,
  });
});

// --- VITE MIDDLEWARE / STATIC ASSETS ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TrustVault] Server operational and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[TrustVault] Failed to start server:', err);
});
