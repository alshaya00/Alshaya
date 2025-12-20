// Database-backed authentication store using better-sqlite3
// Replaces the in-memory store for production use

import Database from 'better-sqlite3';
import path from 'path';
import { hashPassword, verifyPassword as verifyPasswordHash, generateSessionToken, generateInviteCode } from './password';
import { UserRole, UserStatus, DEFAULT_PERMISSION_MATRIX, PermissionMatrix, SiteSettings, PrivacySettings } from './types';
import { familyInfo, securitySettings, paginationSettings } from '@/config/constants';
import { defaultAdminConfig, sessionConfig } from '@/config/admin-config';
import crypto from 'crypto';

// ============================================
// DATABASE CONNECTION
// ============================================

const dbPath = path.join(process.cwd(), 'prisma', 'family.db');
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// ============================================
// TYPES
// ============================================

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  nameArabic: string;
  nameEnglish?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  status: UserStatus;
  linkedMemberId?: string | null;
  assignedBranch?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
  emailVerifiedAt?: Date | null;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  twoFactorBackupCodes?: string | null;
}

export interface StoredSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  rememberMe: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface StoredInvite {
  id: string;
  code: string;
  email: string;
  role: UserRole;
  branch?: string | null;
  sentById: string;
  expiresAt: Date;
  usedAt?: Date | null;
  usedById?: string | null;
  message?: string | null;
  createdAt: Date;
}

export interface StoredAccessRequest {
  id: string;
  email: string;
  nameArabic: string;
  nameEnglish?: string | null;
  phone?: string | null;
  claimedRelation: string;
  relatedMemberId?: string | null;
  relationshipType?: string | null;
  message?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO';
  reviewedById?: string | null;
  reviewedAt?: Date | null;
  reviewNote?: string | null;
  userId?: string | null;
  approvedRole?: UserRole | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredActivityLog {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  category: string;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  success: boolean;
  errorMessage?: string | null;
  createdAt: Date;
}

export interface PasswordResetToken {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

export interface EmailVerificationToken {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

// Login attempt tracking (in-memory with database backup)
const loginAttempts: Map<string, { count: number; lockedUntil?: Date }> = new Map();

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `c${timestamp}${randomPart}`;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(value);
}

// Convert SQL row to StoredUser
function rowToUser(row: Record<string, unknown>): StoredUser {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.passwordHash as string,
    nameArabic: row.nameArabic as string,
    nameEnglish: row.nameEnglish as string | null,
    phone: row.phone as string | null,
    avatarUrl: row.avatarUrl as string | null,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    linkedMemberId: row.linkedMemberId as string | null,
    assignedBranch: row.assignedBranch as string | null,
    createdAt: parseDate(row.createdAt as string) || new Date(),
    updatedAt: parseDate(row.updatedAt as string) || new Date(),
    lastLoginAt: parseDate(row.lastLoginAt as string | null),
    emailVerifiedAt: parseDate(row.emailVerifiedAt as string | null),
    twoFactorEnabled: !!row.twoFactorEnabled,
    twoFactorSecret: row.twoFactorSecret as string | null,
    twoFactorBackupCodes: row.twoFactorBackupCodes as string | null,
  };
}

function rowToSession(row: Record<string, unknown>): StoredSession {
  return {
    id: row.id as string,
    userId: row.userId as string,
    token: row.token as string,
    expiresAt: parseDate(row.expiresAt as string) || new Date(),
    rememberMe: !!row.rememberMe,
    ipAddress: row.ipAddress as string | null,
    userAgent: row.userAgent as string | null,
    createdAt: parseDate(row.createdAt as string) || new Date(),
    lastActiveAt: parseDate(row.lastActiveAt as string) || new Date(),
  };
}

function rowToInvite(row: Record<string, unknown>): StoredInvite {
  return {
    id: row.id as string,
    code: row.code as string,
    email: row.email as string,
    role: row.role as UserRole,
    branch: row.branch as string | null,
    sentById: row.sentById as string,
    expiresAt: parseDate(row.expiresAt as string | null) || new Date(),
    usedAt: parseDate(row.usedAt as string | null),
    usedById: row.usedById as string | null,
    message: row.message as string | null,
    createdAt: parseDate(row.createdAt as string) || new Date(),
  };
}

function rowToAccessRequest(row: Record<string, unknown>): StoredAccessRequest {
  return {
    id: row.id as string,
    email: row.email as string,
    nameArabic: row.nameArabic as string,
    nameEnglish: row.nameEnglish as string | null,
    phone: row.phone as string | null,
    claimedRelation: row.claimedRelation as string,
    relatedMemberId: row.relatedMemberId as string | null,
    relationshipType: row.relationshipType as string | null,
    message: row.message as string | null,
    status: row.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO',
    reviewedById: row.reviewedById as string | null,
    reviewedAt: parseDate(row.reviewedAt as string | null),
    reviewNote: row.reviewNote as string | null,
    userId: row.userId as string | null,
    approvedRole: row.approvedRole as UserRole | null,
    createdAt: parseDate(row.createdAt as string) || new Date(),
    updatedAt: parseDate(row.updatedAt as string) || new Date(),
  };
}

function rowToActivityLog(row: Record<string, unknown>): StoredActivityLog {
  return {
    id: row.id as string,
    userId: row.userId as string | null,
    userEmail: row.userEmail as string | null,
    userName: row.userName as string | null,
    action: row.action as string,
    category: row.category as string,
    targetType: row.targetType as string | null,
    targetId: row.targetId as string | null,
    targetName: row.targetName as string | null,
    details: row.details as string | null,
    ipAddress: row.ipAddress as string | null,
    userAgent: row.userAgent as string | null,
    success: !!row.success,
    errorMessage: row.errorMessage as string | null,
    createdAt: parseDate(row.createdAt as string) || new Date(),
  };
}

// ============================================
// INITIALIZATION
// ============================================

let initialized = false;
let cachedSiteSettings: SiteSettings | null = null;
let cachedPrivacySettings: PrivacySettings | null = null;

export async function initializeStore() {
  if (initialized) return;

  try {
    const database = getDb();

    // Check if super admin exists
    const adminCount = database.prepare('SELECT COUNT(*) as count FROM User WHERE role = ?').get('SUPER_ADMIN') as { count: number };

    if (adminCount.count === 0) {
      // Create default super admin from environment variables
      const adminEmail = defaultAdminConfig.email;
      const adminPassword = defaultAdminConfig.password;

      if (!adminEmail || !adminPassword) {
        console.warn('⚠️ ADMIN_EMAIL and ADMIN_PASSWORD environment variables not set.');
        initialized = true;
        return;
      }

      const passwordHash = await hashPassword(adminPassword);
      const id = generateId();
      const now = new Date().toISOString();

      database.prepare(`
        INSERT INTO User (id, email, passwordHash, nameArabic, nameEnglish, role, status, createdAt, updatedAt, emailVerifiedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, adminEmail.toLowerCase(), passwordHash, 'مدير النظام', 'System Admin', 'SUPER_ADMIN', 'ACTIVE', now, now, now);

      console.log('Created super admin from environment variables');
    }

    initialized = true;
  } catch (error) {
    console.error('Failed to initialize database store:', error);
    initialized = true;
  }
}

// ============================================
// USER OPERATIONS
// ============================================

export async function createUser(data: {
  email: string;
  password: string;
  nameArabic: string;
  nameEnglish?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  linkedMemberId?: string;
  assignedBranch?: string;
}): Promise<StoredUser> {
  await initializeStore();

  const database = getDb();
  const passwordHash = await hashPassword(data.password);
  const id = generateId();
  const now = new Date().toISOString();

  database.prepare(`
    INSERT INTO User (id, email, passwordHash, nameArabic, nameEnglish, phone, role, status, linkedMemberId, assignedBranch, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.email.toLowerCase(),
    passwordHash,
    data.nameArabic,
    data.nameEnglish || null,
    data.phone || null,
    data.role || 'MEMBER',
    data.status || 'PENDING',
    data.linkedMemberId || null,
    data.assignedBranch || null,
    now,
    now
  );

  const user = database.prepare('SELECT * FROM User WHERE id = ?').get(id);
  return rowToUser(user as Record<string, unknown>);
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  await initializeStore();

  const database = getDb();
  const user = database.prepare('SELECT * FROM User WHERE email = ?').get(email.toLowerCase());
  return user ? rowToUser(user as Record<string, unknown>) : null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  await initializeStore();

  const database = getDb();
  const user = database.prepare('SELECT * FROM User WHERE id = ?').get(id);
  return user ? rowToUser(user as Record<string, unknown>) : null;
}

export async function updateUser(id: string, data: Partial<StoredUser>): Promise<StoredUser | null> {
  await initializeStore();

  const database = getDb();
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.email !== undefined) {
    updates.push('email = ?');
    values.push(data.email.toLowerCase());
  }
  if (data.nameArabic !== undefined) {
    updates.push('nameArabic = ?');
    values.push(data.nameArabic);
  }
  if (data.nameEnglish !== undefined) {
    updates.push('nameEnglish = ?');
    values.push(data.nameEnglish || null);
  }
  if (data.phone !== undefined) {
    updates.push('phone = ?');
    values.push(data.phone || null);
  }
  if (data.avatarUrl !== undefined) {
    updates.push('avatarUrl = ?');
    values.push(data.avatarUrl || null);
  }
  if (data.role !== undefined) {
    updates.push('role = ?');
    values.push(data.role);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.linkedMemberId !== undefined) {
    updates.push('linkedMemberId = ?');
    values.push(data.linkedMemberId || null);
  }
  if (data.assignedBranch !== undefined) {
    updates.push('assignedBranch = ?');
    values.push(data.assignedBranch || null);
  }
  if (data.lastLoginAt !== undefined) {
    updates.push('lastLoginAt = ?');
    values.push(data.lastLoginAt?.toISOString() || null);
  }
  if (data.emailVerifiedAt !== undefined) {
    updates.push('emailVerifiedAt = ?');
    values.push(data.emailVerifiedAt?.toISOString() || null);
  }
  if (data.twoFactorEnabled !== undefined) {
    updates.push('twoFactorEnabled = ?');
    values.push(data.twoFactorEnabled ? 1 : 0);
  }
  if (data.twoFactorSecret !== undefined) {
    updates.push('twoFactorSecret = ?');
    values.push(data.twoFactorSecret || null);
  }
  if (data.twoFactorBackupCodes !== undefined) {
    updates.push('twoFactorBackupCodes = ?');
    values.push(data.twoFactorBackupCodes || null);
  }

  if (updates.length === 0) return findUserById(id);

  updates.push('updatedAt = ?');
  values.push(new Date().toISOString());
  values.push(id);

  try {
    database.prepare(`UPDATE User SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return findUserById(id);
  } catch {
    return null;
  }
}

export async function updateUserPassword(id: string, newPassword: string): Promise<boolean> {
  await initializeStore();

  try {
    const database = getDb();
    const passwordHash = await hashPassword(newPassword);
    database.prepare('UPDATE User SET passwordHash = ?, updatedAt = ? WHERE id = ?')
      .run(passwordHash, new Date().toISOString(), id);
    return true;
  } catch {
    return false;
  }
}

export async function getAllUsers(): Promise<StoredUser[]> {
  await initializeStore();

  const database = getDb();
  const users = database.prepare('SELECT * FROM User ORDER BY createdAt DESC').all();
  return users.map(u => rowToUser(u as Record<string, unknown>));
}

export async function deleteUser(id: string): Promise<boolean> {
  await initializeStore();

  try {
    const database = getDb();
    database.prepare('DELETE FROM User WHERE id = ?').run(id);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// SESSION OPERATIONS
// ============================================

export async function createSession(
  userId: string,
  rememberMe: boolean = false,
  ipAddress?: string,
  userAgent?: string
): Promise<StoredSession> {
  await initializeStore();

  const database = getDb();
  const settings = await getSiteSettings();
  const durationDays = rememberMe
    ? settings.rememberMeDurationDays
    : settings.sessionDurationDays;

  const id = generateId();
  const token = generateSessionToken();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  database.prepare(`
    INSERT INTO Session (id, userId, token, expiresAt, rememberMe, ipAddress, userAgent, createdAt, lastActiveAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, token, expiresAt, rememberMe ? 1 : 0, ipAddress || null, userAgent || null, now, now);

  const session = database.prepare('SELECT * FROM Session WHERE id = ?').get(id);
  return rowToSession(session as Record<string, unknown>);
}

export async function findSessionByToken(token: string): Promise<StoredSession | null> {
  await initializeStore();

  const database = getDb();
  const session = database.prepare('SELECT * FROM Session WHERE token = ?').get(token);

  if (!session) return null;

  const sessionData = rowToSession(session as Record<string, unknown>);

  // Check if expired
  if (sessionData.expiresAt < new Date()) {
    await deleteSession(sessionData.id);
    return null;
  }

  return sessionData;
}

export async function updateSessionActivity(token: string): Promise<void> {
  await initializeStore();

  try {
    const database = getDb();
    database.prepare('UPDATE Session SET lastActiveAt = ? WHERE token = ?')
      .run(new Date().toISOString(), token);
  } catch {
    // Session might not exist, ignore error
  }
}

export async function deleteSession(id: string): Promise<boolean> {
  await initializeStore();

  try {
    const database = getDb();
    database.prepare('DELETE FROM Session WHERE id = ?').run(id);
    return true;
  } catch {
    return false;
  }
}

export async function deleteSessionByToken(token: string): Promise<boolean> {
  await initializeStore();

  try {
    const database = getDb();
    database.prepare('DELETE FROM Session WHERE token = ?').run(token);
    return true;
  } catch {
    return false;
  }
}

export async function deleteUserSessions(userId: string): Promise<number> {
  await initializeStore();

  const database = getDb();
  const result = database.prepare('DELETE FROM Session WHERE userId = ?').run(userId);
  return result.changes;
}

// ============================================
// PASSWORD RESET OPERATIONS
// ============================================

export async function createPasswordResetToken(email: string): Promise<PasswordResetToken> {
  await initializeStore();

  const database = getDb();

  // Delete any existing tokens for this email
  database.prepare('DELETE FROM PasswordReset WHERE email = ?').run(email.toLowerCase());

  // Create new token (expires in 1 hour)
  const id = generateId();
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  database.prepare(`
    INSERT INTO PasswordReset (id, email, token, expiresAt, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, email.toLowerCase(), token, expiresAt, now);

  return {
    id,
    email: email.toLowerCase(),
    token,
    expiresAt: new Date(expiresAt),
    usedAt: null,
    createdAt: new Date(now),
  };
}

export async function findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  await initializeStore();

  const database = getDb();
  const reset = database.prepare('SELECT * FROM PasswordReset WHERE token = ?').get(token) as {
    id: string;
    email: string;
    token: string;
    expiresAt: string;
    usedAt: string | null;
    createdAt: string;
  } | undefined;

  if (!reset) return null;

  // Check if expired or used
  if (new Date(reset.expiresAt) < new Date() || reset.usedAt) {
    return null;
  }

  return {
    id: reset.id,
    email: reset.email,
    token: reset.token,
    expiresAt: new Date(reset.expiresAt),
    usedAt: reset.usedAt ? new Date(reset.usedAt) : null,
    createdAt: new Date(reset.createdAt),
  };
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  await initializeStore();

  const database = getDb();
  database.prepare('UPDATE PasswordReset SET usedAt = ? WHERE token = ?')
    .run(new Date().toISOString(), token);
}

// ============================================
// EMAIL VERIFICATION OPERATIONS
// ============================================

export async function createEmailVerificationToken(email: string): Promise<EmailVerificationToken> {
  await initializeStore();

  const database = getDb();

  // Delete any existing tokens for this email
  database.prepare('DELETE FROM EmailVerification WHERE email = ?').run(email.toLowerCase());

  // Create new token (expires in 24 hours)
  const id = generateId();
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  database.prepare(`
    INSERT INTO EmailVerification (id, email, token, expiresAt, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, email.toLowerCase(), token, expiresAt, now);

  return {
    id,
    email: email.toLowerCase(),
    token,
    expiresAt: new Date(expiresAt),
    usedAt: null,
    createdAt: new Date(now),
  };
}

export async function findEmailVerificationToken(token: string): Promise<EmailVerificationToken | null> {
  await initializeStore();

  const database = getDb();
  const verification = database.prepare('SELECT * FROM EmailVerification WHERE token = ?').get(token) as {
    id: string;
    email: string;
    token: string;
    expiresAt: string;
    usedAt: string | null;
    createdAt: string;
  } | undefined;

  if (!verification) return null;

  // Check if expired or used
  if (new Date(verification.expiresAt) < new Date() || verification.usedAt) {
    return null;
  }

  return {
    id: verification.id,
    email: verification.email,
    token: verification.token,
    expiresAt: new Date(verification.expiresAt),
    usedAt: verification.usedAt ? new Date(verification.usedAt) : null,
    createdAt: new Date(verification.createdAt),
  };
}

export async function markEmailVerificationTokenUsed(token: string): Promise<void> {
  await initializeStore();

  const database = getDb();
  database.prepare('UPDATE EmailVerification SET usedAt = ? WHERE token = ?')
    .run(new Date().toISOString(), token);
}

export async function markEmailVerified(email: string): Promise<void> {
  await initializeStore();

  const database = getDb();
  database.prepare('UPDATE User SET emailVerifiedAt = ? WHERE email = ?')
    .run(new Date().toISOString(), email.toLowerCase());
}

// ============================================
// INVITE OPERATIONS
// ============================================

export async function createInvite(data: {
  email: string;
  role: UserRole;
  branch?: string;
  sentById: string;
  message?: string;
  expiresInDays?: number;
}): Promise<StoredInvite> {
  await initializeStore();

  const database = getDb();
  const id = generateId();
  const code = generateInviteCode();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + (data.expiresInDays || 7) * 24 * 60 * 60 * 1000).toISOString();

  database.prepare(`
    INSERT INTO Invite (id, code, email, role, branch, sentById, expiresAt, message, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, code, data.email.toLowerCase(), data.role, data.branch || null, data.sentById, expiresAt, data.message || null, now);

  const invite = database.prepare('SELECT * FROM Invite WHERE id = ?').get(id);
  return rowToInvite(invite as Record<string, unknown>);
}

export async function findInviteByCode(code: string): Promise<StoredInvite | null> {
  await initializeStore();

  const database = getDb();
  const invite = database.prepare('SELECT * FROM Invite WHERE code = ?').get(code);

  if (!invite) return null;

  const inviteData = rowToInvite(invite as Record<string, unknown>);

  // Check if expired or used
  if (inviteData.expiresAt < new Date() || inviteData.usedAt) {
    return null;
  }

  return inviteData;
}

export async function markInviteUsed(code: string, userId: string): Promise<void> {
  await initializeStore();

  const database = getDb();
  database.prepare('UPDATE Invite SET usedAt = ?, usedById = ? WHERE code = ?')
    .run(new Date().toISOString(), userId, code);
}

export async function getAllInvites(): Promise<StoredInvite[]> {
  await initializeStore();

  const database = getDb();
  const invites = database.prepare('SELECT * FROM Invite ORDER BY createdAt DESC').all();
  return invites.map(i => rowToInvite(i as Record<string, unknown>));
}

// ============================================
// ACCESS REQUEST OPERATIONS
// ============================================

export async function createAccessRequest(data: {
  email: string;
  nameArabic: string;
  nameEnglish?: string;
  phone?: string;
  claimedRelation: string;
  relatedMemberId?: string;
  relationshipType?: string;
  message?: string;
}): Promise<StoredAccessRequest> {
  await initializeStore();

  const database = getDb();

  // Check if email already has a pending request
  const existing = database.prepare(
    'SELECT id FROM AccessRequest WHERE email = ? AND status = ?'
  ).get(data.email.toLowerCase(), 'PENDING');

  if (existing) {
    throw new Error('You already have a pending access request');
  }

  const id = generateId();
  const now = new Date().toISOString();

  database.prepare(`
    INSERT INTO AccessRequest (id, email, nameArabic, nameEnglish, phone, claimedRelation, relatedMemberId, relationshipType, message, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.email.toLowerCase(),
    data.nameArabic,
    data.nameEnglish || null,
    data.phone || null,
    data.claimedRelation,
    data.relatedMemberId || null,
    data.relationshipType || null,
    data.message || null,
    'PENDING',
    now,
    now
  );

  const request = database.prepare('SELECT * FROM AccessRequest WHERE id = ?').get(id);
  return rowToAccessRequest(request as Record<string, unknown>);
}

export async function findAccessRequestById(id: string): Promise<StoredAccessRequest | null> {
  await initializeStore();

  const database = getDb();
  const request = database.prepare('SELECT * FROM AccessRequest WHERE id = ?').get(id);
  return request ? rowToAccessRequest(request as Record<string, unknown>) : null;
}

export async function findAccessRequestByEmail(email: string): Promise<StoredAccessRequest | null> {
  await initializeStore();

  const database = getDb();
  const request = database.prepare(
    'SELECT * FROM AccessRequest WHERE email = ? ORDER BY createdAt DESC LIMIT 1'
  ).get(email.toLowerCase());
  return request ? rowToAccessRequest(request as Record<string, unknown>) : null;
}

export async function updateAccessRequest(
  id: string,
  data: Partial<StoredAccessRequest>
): Promise<StoredAccessRequest | null> {
  await initializeStore();

  const database = getDb();
  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.reviewedById !== undefined) {
    updates.push('reviewedById = ?');
    values.push(data.reviewedById || null);
  }
  if (data.reviewedAt !== undefined) {
    updates.push('reviewedAt = ?');
    values.push(data.reviewedAt?.toISOString() || null);
  }
  if (data.reviewNote !== undefined) {
    updates.push('reviewNote = ?');
    values.push(data.reviewNote || null);
  }
  if (data.userId !== undefined) {
    updates.push('userId = ?');
    values.push(data.userId || null);
  }
  if (data.approvedRole !== undefined) {
    updates.push('approvedRole = ?');
    values.push(data.approvedRole || null);
  }

  if (updates.length === 0) return findAccessRequestById(id);

  updates.push('updatedAt = ?');
  values.push(new Date().toISOString());
  values.push(id);

  try {
    database.prepare(`UPDATE AccessRequest SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return findAccessRequestById(id);
  } catch {
    return null;
  }
}

export async function getPendingAccessRequests(): Promise<StoredAccessRequest[]> {
  await initializeStore();

  const database = getDb();
  const requests = database.prepare(
    'SELECT * FROM AccessRequest WHERE status = ? ORDER BY createdAt DESC'
  ).all('PENDING');
  return requests.map(r => rowToAccessRequest(r as Record<string, unknown>));
}

export async function getAllAccessRequests(): Promise<StoredAccessRequest[]> {
  await initializeStore();

  const database = getDb();
  const requests = database.prepare('SELECT * FROM AccessRequest ORDER BY createdAt DESC').all();
  return requests.map(r => rowToAccessRequest(r as Record<string, unknown>));
}

// ============================================
// ACTIVITY LOG OPERATIONS
// ============================================

export async function logActivity(data: {
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: string;
  category: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}): Promise<StoredActivityLog> {
  await initializeStore();

  const database = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  database.prepare(`
    INSERT INTO ActivityLog (id, userId, userEmail, userName, action, category, targetType, targetId, targetName, details, ipAddress, userAgent, success, errorMessage, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.userId || null,
    data.userEmail || null,
    data.userName || null,
    data.action,
    data.category,
    data.targetType || null,
    data.targetId || null,
    data.targetName || null,
    data.details ? JSON.stringify(data.details) : null,
    data.ipAddress || null,
    data.userAgent || null,
    data.success !== false ? 1 : 0,
    data.errorMessage || null,
    now
  );

  // Clean up old logs (keep last N)
  const countResult = database.prepare('SELECT COUNT(*) as count FROM ActivityLog').get() as { count: number };
  if (countResult.count > paginationSettings.maxActivityLogs) {
    const deleteCount = countResult.count - paginationSettings.maxActivityLogs;
    database.prepare(`
      DELETE FROM ActivityLog WHERE id IN (
        SELECT id FROM ActivityLog ORDER BY createdAt ASC LIMIT ?
      )
    `).run(deleteCount);
  }

  const log = database.prepare('SELECT * FROM ActivityLog WHERE id = ?').get(id);
  return rowToActivityLog(log as Record<string, unknown>);
}

export async function getActivityLogs(options?: {
  userId?: string;
  category?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<StoredActivityLog[]> {
  await initializeStore();

  const database = getDb();
  let query = 'SELECT * FROM ActivityLog WHERE 1=1';
  const params: (string | number)[] = [];

  if (options?.userId) {
    query += ' AND userId = ?';
    params.push(options.userId);
  }
  if (options?.category) {
    query += ' AND category = ?';
    params.push(options.category);
  }
  if (options?.action) {
    query += ' AND action = ?';
    params.push(options.action);
  }

  query += ' ORDER BY createdAt DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  } else {
    query += ' LIMIT 100';
  }

  if (options?.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  const logs = database.prepare(query).all(...params);
  return logs.map(l => rowToActivityLog(l as Record<string, unknown>));
}

// ============================================
// LOGIN ATTEMPT TRACKING
// ============================================

export async function checkLoginAttempts(email: string): Promise<{ allowed: boolean; remainingAttempts: number; lockedUntil?: Date }> {
  await initializeStore();

  const settings = await getSiteSettings();
  const key = email.toLowerCase();
  const attempts = loginAttempts.get(key);

  if (!attempts) {
    return { allowed: true, remainingAttempts: settings.maxLoginAttempts };
  }

  // Check if locked
  if (attempts.lockedUntil && attempts.lockedUntil > new Date()) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: attempts.lockedUntil,
    };
  }

  // Reset if lock expired
  if (attempts.lockedUntil && attempts.lockedUntil <= new Date()) {
    loginAttempts.delete(key);
    return { allowed: true, remainingAttempts: settings.maxLoginAttempts };
  }

  return {
    allowed: attempts.count < settings.maxLoginAttempts,
    remainingAttempts: Math.max(0, settings.maxLoginAttempts - attempts.count),
  };
}

export async function recordFailedLogin(email: string): Promise<void> {
  await initializeStore();

  const settings = await getSiteSettings();
  const key = email.toLowerCase();
  const attempts = loginAttempts.get(key) || { count: 0 };
  attempts.count++;

  // Lock account if max attempts reached
  if (attempts.count >= settings.maxLoginAttempts) {
    attempts.lockedUntil = new Date(Date.now() + settings.lockoutDurationMinutes * 60 * 1000);
  }

  loginAttempts.set(key, attempts);
}

export async function clearLoginAttempts(email: string): Promise<void> {
  await initializeStore();
  loginAttempts.delete(email.toLowerCase());
}

// ============================================
// SETTINGS OPERATIONS
// ============================================

export async function getSiteSettings(): Promise<SiteSettings> {
  await initializeStore();

  if (cachedSiteSettings) {
    return cachedSiteSettings;
  }

  try {
    const database = getDb();
    const settings = database.prepare('SELECT * FROM SiteSettings WHERE id = ?').get('default') as {
      familyNameArabic: string;
      familyNameEnglish: string;
      taglineArabic: string;
      taglineEnglish: string;
      defaultLanguage: string;
      sessionDurationDays: number;
      rememberMeDurationDays: number;
      allowSelfRegistration: number;
      requireEmailVerification: number;
      requireApprovalForRegistration: number;
      maxLoginAttempts: number;
      lockoutDurationMinutes: number;
      allowGuestPreview: number;
      guestPreviewMemberCount: number;
      minPasswordLength: number;
    } | undefined;

    if (settings) {
      cachedSiteSettings = {
        familyNameArabic: settings.familyNameArabic,
        familyNameEnglish: settings.familyNameEnglish,
        taglineArabic: settings.taglineArabic,
        taglineEnglish: settings.taglineEnglish,
        defaultLanguage: settings.defaultLanguage,
        sessionDurationDays: settings.sessionDurationDays,
        rememberMeDurationDays: settings.rememberMeDurationDays,
        allowSelfRegistration: !!settings.allowSelfRegistration,
        requireEmailVerification: !!settings.requireEmailVerification,
        requireApprovalForRegistration: !!settings.requireApprovalForRegistration,
        maxLoginAttempts: settings.maxLoginAttempts,
        lockoutDurationMinutes: settings.lockoutDurationMinutes,
        allowGuestPreview: !!settings.allowGuestPreview,
        guestPreviewMemberCount: settings.guestPreviewMemberCount,
        minPasswordLength: settings.minPasswordLength,
      };
      return cachedSiteSettings;
    }
  } catch {
    // Ignore database errors
  }

  // Return defaults
  return {
    familyNameArabic: familyInfo.nameAr,
    familyNameEnglish: familyInfo.nameEn,
    taglineArabic: familyInfo.taglineAr,
    taglineEnglish: familyInfo.taglineEn,
    defaultLanguage: 'ar',
    sessionDurationDays: sessionConfig.defaultDurationDays,
    rememberMeDurationDays: sessionConfig.rememberMeDurationDays,
    allowSelfRegistration: true,
    requireEmailVerification: false,
    requireApprovalForRegistration: true,
    maxLoginAttempts: securitySettings.maxLoginAttempts,
    lockoutDurationMinutes: securitySettings.lockoutDurationMinutes,
    allowGuestPreview: true,
    guestPreviewMemberCount: 20,
    minPasswordLength: securitySettings.minPasswordLength,
  };
}

export async function updateSiteSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
  await initializeStore();

  const database = getDb();
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.familyNameArabic !== undefined) {
    updates.push('familyNameArabic = ?');
    values.push(data.familyNameArabic);
  }
  if (data.familyNameEnglish !== undefined) {
    updates.push('familyNameEnglish = ?');
    values.push(data.familyNameEnglish);
  }
  if (data.sessionDurationDays !== undefined) {
    updates.push('sessionDurationDays = ?');
    values.push(data.sessionDurationDays);
  }
  if (data.rememberMeDurationDays !== undefined) {
    updates.push('rememberMeDurationDays = ?');
    values.push(data.rememberMeDurationDays);
  }
  if (data.allowSelfRegistration !== undefined) {
    updates.push('allowSelfRegistration = ?');
    values.push(data.allowSelfRegistration ? 1 : 0);
  }
  if (data.requireEmailVerification !== undefined) {
    updates.push('requireEmailVerification = ?');
    values.push(data.requireEmailVerification ? 1 : 0);
  }
  if (data.maxLoginAttempts !== undefined) {
    updates.push('maxLoginAttempts = ?');
    values.push(data.maxLoginAttempts);
  }
  if (data.lockoutDurationMinutes !== undefined) {
    updates.push('lockoutDurationMinutes = ?');
    values.push(data.lockoutDurationMinutes);
  }

  if (updates.length > 0) {
    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    database.prepare(`UPDATE SiteSettings SET ${updates.join(', ')} WHERE id = 'default'`).run(...values);
  }

  cachedSiteSettings = null; // Clear cache
  return getSiteSettings();
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
  await initializeStore();

  if (cachedPrivacySettings) {
    return cachedPrivacySettings;
  }

  try {
    const database = getDb();
    const settings = database.prepare('SELECT * FROM PrivacySettings WHERE id = ?').get('default') as {
      profileVisibility: string;
      showPhoneToRoles: string;
      showEmailToRoles: string;
      showBirthYearToRoles: string;
      showAgeForLiving: number;
      showOccupation: number;
      showCity: number;
      showBiography: number;
      showPhotosToRoles: string;
      showDeathYear: number;
      showFullDeathDate: number;
    } | undefined;

    if (settings) {
      cachedPrivacySettings = {
        profileVisibility: JSON.parse(settings.profileVisibility || '{}'),
        showPhoneToRoles: JSON.parse(settings.showPhoneToRoles || '[]'),
        showEmailToRoles: JSON.parse(settings.showEmailToRoles || '[]'),
        showBirthYearToRoles: JSON.parse(settings.showBirthYearToRoles || '[]'),
        showAgeForLiving: !!settings.showAgeForLiving,
        showOccupation: !!settings.showOccupation,
        showCity: !!settings.showCity,
        showBiography: !!settings.showBiography,
        showPhotosToRoles: JSON.parse(settings.showPhotosToRoles || '[]'),
        showDeathYear: !!settings.showDeathYear,
        showFullDeathDate: !!settings.showFullDeathDate,
      };
      return cachedPrivacySettings;
    }
  } catch {
    // Ignore database errors
  }

  // Return defaults
  return {
    profileVisibility: { GUEST: false, MEMBER: true, BRANCH_LEADER: true, ADMIN: true, SUPER_ADMIN: true },
    showPhoneToRoles: ['ADMIN', 'SUPER_ADMIN'],
    showEmailToRoles: ['ADMIN', 'SUPER_ADMIN'],
    showBirthYearToRoles: ['MEMBER', 'BRANCH_LEADER', 'ADMIN', 'SUPER_ADMIN'],
    showAgeForLiving: false,
    showOccupation: true,
    showCity: true,
    showBiography: true,
    showPhotosToRoles: ['MEMBER', 'BRANCH_LEADER', 'ADMIN', 'SUPER_ADMIN'],
    showDeathYear: true,
    showFullDeathDate: false,
  };
}

export async function updatePrivacySettings(data: Partial<PrivacySettings>): Promise<PrivacySettings> {
  await initializeStore();

  const database = getDb();
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.profileVisibility) {
    updates.push('profileVisibility = ?');
    values.push(JSON.stringify(data.profileVisibility));
  }
  if (data.showPhoneToRoles) {
    updates.push('showPhoneToRoles = ?');
    values.push(JSON.stringify(data.showPhoneToRoles));
  }
  if (data.showEmailToRoles) {
    updates.push('showEmailToRoles = ?');
    values.push(JSON.stringify(data.showEmailToRoles));
  }
  if (data.showBirthYearToRoles) {
    updates.push('showBirthYearToRoles = ?');
    values.push(JSON.stringify(data.showBirthYearToRoles));
  }
  if (data.showPhotosToRoles) {
    updates.push('showPhotosToRoles = ?');
    values.push(JSON.stringify(data.showPhotosToRoles));
  }
  if (typeof data.showAgeForLiving === 'boolean') {
    updates.push('showAgeForLiving = ?');
    values.push(data.showAgeForLiving ? 1 : 0);
  }
  if (typeof data.showOccupation === 'boolean') {
    updates.push('showOccupation = ?');
    values.push(data.showOccupation ? 1 : 0);
  }
  if (typeof data.showCity === 'boolean') {
    updates.push('showCity = ?');
    values.push(data.showCity ? 1 : 0);
  }
  if (typeof data.showBiography === 'boolean') {
    updates.push('showBiography = ?');
    values.push(data.showBiography ? 1 : 0);
  }
  if (typeof data.showDeathYear === 'boolean') {
    updates.push('showDeathYear = ?');
    values.push(data.showDeathYear ? 1 : 0);
  }
  if (typeof data.showFullDeathDate === 'boolean') {
    updates.push('showFullDeathDate = ?');
    values.push(data.showFullDeathDate ? 1 : 0);
  }

  if (updates.length > 0) {
    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    database.prepare(`UPDATE PrivacySettings SET ${updates.join(', ')} WHERE id = 'default'`).run(...values);
  }

  cachedPrivacySettings = null; // Clear cache
  return getPrivacySettings();
}

export async function getPermissionMatrix(): Promise<PermissionMatrix> {
  await initializeStore();

  try {
    const database = getDb();
    const matrix = database.prepare('SELECT * FROM PermissionMatrix WHERE id = ?').get('default') as {
      permissions: string;
    } | undefined;

    if (matrix) {
      return JSON.parse(matrix.permissions || '{}');
    }
  } catch {
    // Ignore database errors
  }

  return DEFAULT_PERMISSION_MATRIX;
}

export async function updatePermissionMatrix(matrix: PermissionMatrix): Promise<PermissionMatrix> {
  await initializeStore();

  const database = getDb();
  database.prepare('UPDATE PermissionMatrix SET permissions = ?, updatedAt = ? WHERE id = ?')
    .run(JSON.stringify(matrix), new Date().toISOString(), 'default');

  return matrix;
}

// ============================================
// 2FA OPERATIONS
// ============================================

export async function enableTwoFactor(userId: string, secret: string, backupCodes: string[]): Promise<boolean> {
  await initializeStore();

  try {
    const database = getDb();
    database.prepare('UPDATE User SET twoFactorEnabled = 1, twoFactorSecret = ?, twoFactorBackupCodes = ?, updatedAt = ? WHERE id = ?')
      .run(secret, JSON.stringify(backupCodes), new Date().toISOString(), userId);
    return true;
  } catch {
    return false;
  }
}

export async function disableTwoFactor(userId: string): Promise<boolean> {
  await initializeStore();

  try {
    const database = getDb();
    database.prepare('UPDATE User SET twoFactorEnabled = 0, twoFactorSecret = NULL, twoFactorBackupCodes = NULL, updatedAt = ? WHERE id = ?')
      .run(new Date().toISOString(), userId);
    return true;
  } catch {
    return false;
  }
}

export async function updateTwoFactorBackupCodes(userId: string, backupCodes: string[]): Promise<boolean> {
  await initializeStore();

  try {
    const database = getDb();
    database.prepare('UPDATE User SET twoFactorBackupCodes = ?, updatedAt = ? WHERE id = ?')
      .run(JSON.stringify(backupCodes), new Date().toISOString(), userId);
    return true;
  } catch {
    return false;
  }
}

// Re-export verifyPassword
export { verifyPasswordHash as verifyPassword };
