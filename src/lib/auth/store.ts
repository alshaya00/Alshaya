// In-memory data store for authentication
// This will be replaced with Prisma database calls in production

import { randomBytes } from 'crypto';
import { hashPassword, verifyPassword, generateSessionToken, generateInviteCode } from './password';
import { UserRole, UserStatus, DEFAULT_PERMISSION_MATRIX, PermissionMatrix, SiteSettings, PrivacySettings } from './types';
import { familyInfo, securitySettings, paginationSettings } from '@/config/constants';
import { defaultAdminConfig, sessionConfig } from '@/config/admin-config';

// ============================================
// USER STORE
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

// ============================================
// IN-MEMORY STORES
// ============================================

// Default super admin - configured in admin-config.ts (reads from env vars with fallbacks)
const DEFAULT_SUPER_ADMIN_EMAIL = defaultAdminConfig.email;
const DEFAULT_SUPER_ADMIN_PASSWORD = defaultAdminConfig.password;

// In-memory stores
let users: StoredUser[] = [];
let sessions: StoredSession[] = [];
let invites: StoredInvite[] = [];
let accessRequests: StoredAccessRequest[] = [];
let activityLogs: StoredActivityLog[] = [];
let permissionMatrix: PermissionMatrix = DEFAULT_PERMISSION_MATRIX;

// Site settings - using values from centralized config
let siteSettings: SiteSettings = {
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

let privacySettings: PrivacySettings = {
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

// Login attempt tracking
const loginAttempts: Map<string, { count: number; lockedUntil?: Date }> = new Map();

// ============================================
// INITIALIZATION
// ============================================

let initialized = false;

export async function initializeStore() {
  if (initialized) return;

  // Create default super admin if no users exist
  if (users.length === 0) {
    // SECURITY: Always require ADMIN_EMAIL and ADMIN_PASSWORD environment variables
    if (!DEFAULT_SUPER_ADMIN_EMAIL || !DEFAULT_SUPER_ADMIN_PASSWORD) {
      console.warn('⚠️ ADMIN_EMAIL and ADMIN_PASSWORD environment variables not set.');
      console.warn('   No admin user will be created. Set these in your .env file.');
      initialized = true;
      return;
    }

    const passwordHash = await hashPassword(DEFAULT_SUPER_ADMIN_PASSWORD);
    const superAdmin: StoredUser = {
      id: generateId(),
      email: DEFAULT_SUPER_ADMIN_EMAIL,
      passwordHash,
      nameArabic: 'مدير النظام',
      nameEnglish: 'System Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerifiedAt: new Date(),
    };
    users.push(superAdmin);
    console.log('Created super admin from environment variables');
  }

  initialized = true;
}

// ============================================
// HELPERS
// ============================================

// SECURITY: Generate cryptographically secure ID
function generateId(): string {
  return 'id_' + randomBytes(8).toString('hex') + '_' + Date.now().toString(36);
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

  // Check if email already exists
  if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
    throw new Error('Email already exists');
  }

  const passwordHash = await hashPassword(data.password);
  const user: StoredUser = {
    id: generateId(),
    email: data.email.toLowerCase(),
    passwordHash,
    nameArabic: data.nameArabic,
    nameEnglish: data.nameEnglish,
    phone: data.phone,
    role: data.role || 'MEMBER',
    status: data.status || 'PENDING',
    linkedMemberId: data.linkedMemberId,
    assignedBranch: data.assignedBranch,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users.push(user);
  return user;
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  await initializeStore();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  await initializeStore();
  return users.find((u) => u.id === id) || null;
}

export async function updateUser(id: string, data: Partial<StoredUser>): Promise<StoredUser | null> {
  await initializeStore();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...data,
    updatedAt: new Date(),
  };
  return users[index];
}

export async function getAllUsers(): Promise<StoredUser[]> {
  await initializeStore();
  return [...users];
}

export async function deleteUser(id: string): Promise<boolean> {
  await initializeStore();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return false;
  users.splice(index, 1);
  return true;
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

  const durationDays = rememberMe
    ? siteSettings.rememberMeDurationDays
    : siteSettings.sessionDurationDays;

  const session: StoredSession = {
    id: generateId(),
    userId,
    token: generateSessionToken(),
    expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
    rememberMe,
    ipAddress,
    userAgent,
    createdAt: new Date(),
    lastActiveAt: new Date(),
  };

  sessions.push(session);
  return session;
}

export async function findSessionByToken(token: string): Promise<StoredSession | null> {
  await initializeStore();
  const session = sessions.find((s) => s.token === token);
  if (!session) return null;

  // Check if expired
  if (new Date(session.expiresAt) < new Date()) {
    await deleteSession(session.id);
    return null;
  }

  return session;
}

export async function updateSessionActivity(token: string): Promise<void> {
  await initializeStore();
  const session = sessions.find((s) => s.token === token);
  if (session) {
    session.lastActiveAt = new Date();
  }
}

export async function deleteSession(id: string): Promise<boolean> {
  await initializeStore();
  const index = sessions.findIndex((s) => s.id === id);
  if (index === -1) return false;
  sessions.splice(index, 1);
  return true;
}

export async function deleteSessionByToken(token: string): Promise<boolean> {
  await initializeStore();
  const index = sessions.findIndex((s) => s.token === token);
  if (index === -1) return false;
  sessions.splice(index, 1);
  return true;
}

export async function deleteUserSessions(userId: string): Promise<number> {
  await initializeStore();
  const before = sessions.length;
  sessions = sessions.filter((s) => s.userId !== userId);
  return before - sessions.length;
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

  const invite: StoredInvite = {
    id: generateId(),
    code: generateInviteCode(),
    email: data.email.toLowerCase(),
    role: data.role,
    branch: data.branch,
    sentById: data.sentById,
    message: data.message,
    expiresAt: new Date(Date.now() + (data.expiresInDays || 7) * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  invites.push(invite);
  return invite;
}

export async function findInviteByCode(code: string): Promise<StoredInvite | null> {
  await initializeStore();
  const invite = invites.find((i) => i.code === code && !i.usedAt);
  if (!invite) return null;

  // Check if expired
  if (new Date(invite.expiresAt) < new Date()) {
    return null;
  }

  return invite;
}

export async function markInviteUsed(code: string, userId: string): Promise<void> {
  await initializeStore();
  const invite = invites.find((i) => i.code === code);
  if (invite) {
    invite.usedAt = new Date();
    invite.usedById = userId;
  }
}

export async function getAllInvites(): Promise<StoredInvite[]> {
  await initializeStore();
  return [...invites];
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

  // Check if email already has a pending request
  const existing = accessRequests.find(
    (r) => r.email.toLowerCase() === data.email.toLowerCase() && r.status === 'PENDING'
  );
  if (existing) {
    throw new Error('You already have a pending access request');
  }

  const request: StoredAccessRequest = {
    id: generateId(),
    email: data.email.toLowerCase(),
    nameArabic: data.nameArabic,
    nameEnglish: data.nameEnglish,
    phone: data.phone,
    claimedRelation: data.claimedRelation,
    relatedMemberId: data.relatedMemberId,
    relationshipType: data.relationshipType,
    message: data.message,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  accessRequests.push(request);
  return request;
}

export async function findAccessRequestById(id: string): Promise<StoredAccessRequest | null> {
  await initializeStore();
  return accessRequests.find((r) => r.id === id) || null;
}

export async function findAccessRequestByEmail(email: string): Promise<StoredAccessRequest | null> {
  await initializeStore();
  return accessRequests.find((r) => r.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function updateAccessRequest(
  id: string,
  data: Partial<StoredAccessRequest>
): Promise<StoredAccessRequest | null> {
  await initializeStore();
  const index = accessRequests.findIndex((r) => r.id === id);
  if (index === -1) return null;

  accessRequests[index] = {
    ...accessRequests[index],
    ...data,
    updatedAt: new Date(),
  };
  return accessRequests[index];
}

export async function getPendingAccessRequests(): Promise<StoredAccessRequest[]> {
  await initializeStore();
  return accessRequests.filter((r) => r.status === 'PENDING');
}

export async function getAllAccessRequests(): Promise<StoredAccessRequest[]> {
  await initializeStore();
  return [...accessRequests];
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

  const log: StoredActivityLog = {
    id: generateId(),
    userId: data.userId,
    userEmail: data.userEmail,
    userName: data.userName,
    action: data.action,
    category: data.category,
    targetType: data.targetType,
    targetId: data.targetId,
    targetName: data.targetName,
    details: data.details ? JSON.stringify(data.details) : null,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    success: data.success !== false,
    errorMessage: data.errorMessage,
    createdAt: new Date(),
  };

  activityLogs.push(log);

  // Keep only last N logs (from centralized config)
  if (activityLogs.length > paginationSettings.maxActivityLogs) {
    activityLogs = activityLogs.slice(-paginationSettings.maxActivityLogs);
  }

  return log;
}

export async function getActivityLogs(options?: {
  userId?: string;
  category?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<StoredActivityLog[]> {
  await initializeStore();

  let logs = [...activityLogs];

  if (options?.userId) {
    logs = logs.filter((l) => l.userId === options.userId);
  }
  if (options?.category) {
    logs = logs.filter((l) => l.category === options.category);
  }
  if (options?.action) {
    logs = logs.filter((l) => l.action === options.action);
  }

  // Sort by newest first
  logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Apply pagination
  const offset = options?.offset || 0;
  const limit = options?.limit || 100;
  return logs.slice(offset, offset + limit);
}

// ============================================
// LOGIN ATTEMPT TRACKING
// ============================================

export async function checkLoginAttempts(email: string): Promise<{ allowed: boolean; remainingAttempts: number; lockedUntil?: Date }> {
  await initializeStore();

  const key = email.toLowerCase();
  const attempts = loginAttempts.get(key);

  if (!attempts) {
    return { allowed: true, remainingAttempts: siteSettings.maxLoginAttempts };
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
    return { allowed: true, remainingAttempts: siteSettings.maxLoginAttempts };
  }

  return {
    allowed: attempts.count < siteSettings.maxLoginAttempts,
    remainingAttempts: Math.max(0, siteSettings.maxLoginAttempts - attempts.count),
  };
}

export async function recordFailedLogin(email: string): Promise<void> {
  await initializeStore();

  const key = email.toLowerCase();
  const attempts = loginAttempts.get(key) || { count: 0 };
  attempts.count++;

  // Lock account if max attempts reached
  if (attempts.count >= siteSettings.maxLoginAttempts) {
    attempts.lockedUntil = new Date(Date.now() + siteSettings.lockoutDurationMinutes * 60 * 1000);
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
  return { ...siteSettings };
}

export async function updateSiteSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
  await initializeStore();
  siteSettings = { ...siteSettings, ...data };
  return siteSettings;
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
  await initializeStore();
  return { ...privacySettings };
}

export async function updatePrivacySettings(data: Partial<PrivacySettings>): Promise<PrivacySettings> {
  await initializeStore();
  privacySettings = { ...privacySettings, ...data };
  return privacySettings;
}

export async function getPermissionMatrix(): Promise<PermissionMatrix> {
  await initializeStore();
  return { ...permissionMatrix };
}

export async function updatePermissionMatrix(matrix: PermissionMatrix): Promise<PermissionMatrix> {
  await initializeStore();
  permissionMatrix = { ...matrix };
  return permissionMatrix;
}

// ============================================
// VERIFY PASSWORD HELPER
// ============================================

export { verifyPassword };
