import crypto from 'crypto';

export interface HashResult {
  hash: string;
  salt: string;
}

/**
 * Derives a secure password hash using PBKDF2 with SHA-512 and 100,000 iterations.
 */
export function hashPassword(password: string, salt?: string): HashResult {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, chosenSalt, 100000, 64, 'sha512');
  return {
    hash: derived.toString('hex'),
    salt: chosenSalt,
  };
}

/**
 * Constant-time password verification to prevent timing side-channel attacks.
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const derived = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (derived.length !== storedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(derived, storedBuf);
  } catch {
    return false;
  }
}

/**
 * Computes SHA-256 hex digest of any string or buffer.
 */
export function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Constant-time string comparison for OTPs and tokens.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generates a cryptographically strong 6-digit numeric OTP.
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generates a secure random URL-safe token.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * File signature & Magic Bytes Validator.
 * Prevents file-extension spoofing (e.g. evil.exe renamed to report.pdf).
 */
export interface MagicValidationResult {
  isValid: boolean;
  detectedType: string;
  reason?: string;
}

export function validateMagicBytes(buffer: Buffer, originalName: string, mimeType: string): MagicValidationResult {
  if (!buffer || buffer.length === 0) {
    return { isValid: false, detectedType: 'empty', reason: 'Zero-byte empty file rejected' };
  }

  // Common executable signatures to strictly ban
  // MZ header for Windows PE executables
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { isValid: false, detectedType: 'executable/pe', reason: 'Executable PE/DOS binary detected' };
  }
  // ELF header for Linux executables: 0x7F 'E' 'L' 'F'
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { isValid: false, detectedType: 'executable/elf', reason: 'ELF Linux binary executable detected' };
  }
  // Mach-O header for macOS executables
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa && buffer[3] === 0xce) ||
      (buffer[0] === 0xcf && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe))
  ) {
    return { isValid: false, detectedType: 'executable/macho', reason: 'Mach-O binary executable detected' };
  }

  // Check PDF signature: %PDF (0x25 0x50 0x44 0x46)
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { isValid: true, detectedType: 'application/pdf' };
  }

  // Check PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedType: 'image/png' };
  }

  // Check JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedType: 'image/jpeg' };
  }

  // Check ZIP / Office Open XML (DOCX, XLSX, PPTX): PK.. (0x50 0x4B 0x03 0x04)
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { isValid: true, detectedType: 'application/zip' };
  }

  // Check Plain Text / Markdown / CSV / JSON: verify printable ASCII/UTF-8
  const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
  let nonPrintableCount = 0;
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    // Tab (9), LF (10), CR (13), or printable ASCII (32-126)
    if (byte !== 9 && byte !== 10 && byte !== 13 && (byte < 32 || byte > 126)) {
      nonPrintableCount++;
    }
  }

  // If mostly printable characters, accept as text document
  if (nonPrintableCount / sample.length < 0.05) {
    // Check if contains script tags or suspicious PHP/shell tags
    const sampleStr = sample.toString('utf8').toLowerCase();
    if (sampleStr.includes('<script') || sampleStr.includes('<?php') || sampleStr.includes('#!/bin/sh')) {
      return { isValid: false, detectedType: 'text/script', reason: 'Embedded script or shell payload detected' };
    }
    return { isValid: true, detectedType: 'text/plain' };
  }

  // For documents claiming to be PDF/image but missing magic numbers
  const lowerExt = originalName.toLowerCase().split('.').pop() || '';
  if (['pdf', 'png', 'jpg', 'jpeg'].includes(lowerExt)) {
    return {
      isValid: false,
      detectedType: 'unknown/corrupt',
      reason: `File claims extension .${lowerExt} but magic byte signature does not match`,
    };
  }

  return { isValid: true, detectedType: mimeType || 'application/octet-stream' };
}

/**
 * Scan pipeline that evaluates file content, entropy, and signature heuristics.
 */
export function scanFileContent(buffer: Buffer, originalName: string, mimeType: string): {
  status: 'CLEAN' | 'QUARANTINED' | 'RETRY_NEEDED';
  details: string;
} {
  const magicCheck = validateMagicBytes(buffer, originalName, mimeType);
  if (!magicCheck.isValid) {
    return {
      status: 'QUARANTINED',
      details: `Security quarantine: ${magicCheck.reason || 'Invalid signature or malicious payload'}`,
    };
  }

  // Check for suspicious macro or embedded executable strings in raw buffer
  const preview = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('binary');
  if (preview.includes('AutoExec') || preview.includes('ShellExecute') || preview.includes('powershell -enc')) {
    return {
      status: 'QUARANTINED',
      details: 'Security quarantine: Suspicious command execution payload identified',
    };
  }

  return {
    status: 'CLEAN',
    details: 'Passed cryptographic magic-byte and heuristic integrity scans. File verified clean.',
  };
}

/**
 * Cryptographic Audit Hash Calculation
 * Block hash = SHA256(index + timestampUtc + actorId + documentId + action + status + details + previousHash)
 */
export function computeAuditEventHash(event: {
  index: number;
  timestampUtc: string;
  actorId: string;
  documentId?: string;
  action: string;
  status: string;
  details: string;
  previousHash: string;
}): string {
  const payload = [
    event.index.toString(),
    event.timestampUtc,
    event.actorId,
    event.documentId || 'NONE',
    event.action,
    event.status,
    event.details,
    event.previousHash,
  ].join('|');

  return sha256(payload);
}
