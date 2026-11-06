export type UserRole = 'ADMINISTRATOR' | 'OWNER' | 'EDITOR' | 'VIEWER' | 'EXTERNAL';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type PermissionType = 'READ' | 'READ_DOWNLOAD' | 'READ_EDIT';

export type ScanStatus = 'CLEAN' | 'SCANNING' | 'QUARANTINED' | 'RETRY_NEEDED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  mobile: string;
  role: UserRole;
  status: UserStatus;
  requiresPasswordChange: boolean;
  emailVerified: boolean;
  mobileVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  category: string;
  scanStatus: ScanStatus;
  scanDetails: string;
  magicVerified: boolean;
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
  contentPreview?: string; // Text preview if applicable
}

export interface PermissionRecord {
  id: string;
  documentId: string;
  granteeEmail: string;
  granteeUserId?: string;
  granteeName?: string;
  permissionType: PermissionType;
  grantedBy: string;
  grantedByEmail: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationRecord {
  id: string;
  token: string;
  documentId: string;
  documentTitle: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  recipientMobile: string;
  permissionType: PermissionType;
  status: 'PENDING' | 'VERIFIED' | 'CLAIMED' | 'EXPIRED' | 'REVOKED';
  emailOtpHash: string;
  smsOtpHash: string;
  emailOtpPlainForDev?: string; // Revealed only in controlled demo environment for testing
  smsOtpPlainForDev?: string;
  expiresAt: string;
  attempts: number;
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  index: number;
  timestampUtc: string;
  actorId: string;
  actorEmail: string;
  documentId?: string;
  documentName?: string;
  action: string;
  status: 'SUCCESS' | 'DENIED';
  permissionContext?: string;
  requestId: string;
  ipAddress: string;
  details: string;
  previousHash: string;
  currentHash: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  totalDocuments: number;
  cleanDocuments: number;
  quarantinedDocuments: number;
  totalAuditEvents: number;
  deniedAccessEvents: number;
  totalStorageBytes: number;
  chainValid: boolean;
}

export interface SecurityTestResult {
  id: string;
  title: string;
  description: string;
  category: 'AUTHORIZATION' | 'IDOR' | 'AUDIT_INTEGRITY' | 'FILE_SECURITY' | 'PRIVILEGE_ISOLATION';
  passed: boolean;
  details: string;
  executionTimeMs: number;
}
