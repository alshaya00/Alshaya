// Database-backed authentication store using Prisma with PostgreSQL
// Replaces the SQLite store for production use

import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword as verifyPasswordHash, generateSessionToken, generateInviteCode } from './password';
import { UserRole, UserStatus, DEFAULT_PERMISSION_MATRIX, PermissionMatrix, SiteSettings, PrivacySettings } from './types';
import { familyInfo, securitySettings, paginationSettings } from '@/config/constants';
import { defaultAdminConfig, sessionConfig } from '@/config/admin-config';
import crypto from 'crypto';

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

// Login attempt tracking is now stored in the database (User.failedLoginAttempts and User.lockedUntil)

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `c${timestamp}${randomPart}`;
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
    const adminCount = await prisma.user.count({
      where: { role: 'SUPER_ADMIN' }
    });

    if (adminCount === 0) {
      const adminEmail = defaultAdminConfig.email;
      const adminPassword = defaultAdminConfig.password;

      if (!adminEmail || !adminPassword) {
        console.warn('⚠️ ADMIN_EMAIL and ADMIN_PASSWORD environment variables not set.');
        initialized = true;
        return;
      }

      const passwordHash = await hashPassword(adminPassword);

      await prisma.user.create({
        data: {
          email: adminEmail.toLowerCase(),
          passwordHash,
          nameArabic: 'مدير النظام',
          nameEnglish: 'System Admin',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        }
      });

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

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      nameArabic: data.nameArabic,
      nameEnglish: data.nameEnglish || null,
      phone: data.phone || null,
      role: data.role || 'MEMBER',
      status: data.status || 'PENDING',
      linkedMemberId: data.linkedMemberId || null,
      assignedBranch: data.assignedBranch || null,
    }
  });

  return user as unknown as StoredUser;
}

export async function createUserWithHash(data: {
  email: string;
  passwordHash: string;
  nameArabic: string;
  nameEnglish?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  linkedMemberId?: string;
  assignedBranch?: string;
}): Promise<StoredUser> {
  await initializeStore();

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      nameArabic: data.nameArabic,
      nameEnglish: data.nameEnglish || null,
      phone: data.phone || null,
      role: data.role || 'MEMBER',
      status: data.status || 'PENDING',
      linkedMemberId: data.linkedMemberId || null,
      assignedBranch: data.assignedBranch || null,
    }
  });

  return user as unknown as StoredUser;
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  await initializeStore();

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  return user as unknown as StoredUser | null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  await initializeStore();

  const user = await prisma.user.findUnique({
    where: { id }
  });

  return user as unknown as StoredUser | null;
}

export async function updateUser(id: string, data: Partial<StoredUser>): Promise<StoredUser | null> {
  await initializeStore();

  try {
    const updateData: Record<string, unknown> = {};

    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.nameArabic !== undefined) updateData.nameArabic = data.nameArabic;
    if (data.nameEnglish !== undefined) updateData.nameEnglish = data.nameEnglish || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl || null;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.linkedMemberId !== undefined) updateData.linkedMemberId = data.linkedMemberId || null;
    if (data.assignedBranch !== undefined) updateData.assignedBranch = data.assignedBranch || null;
    if (data.lastLoginAt !== undefined) updateData.lastLoginAt = data.lastLoginAt || null;
    if (data.emailVerifiedAt !== undefined) updateData.emailVerifiedAt = data.emailVerifiedAt || null;

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });

    return user as unknown as StoredUser;
  } catch {
    return null;
  }
}

export async function updateUserPassword(id: string, newPassword: string): Promise<boolean> {
  await initializeStore();

  try {
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });
    return true;
  } catch {
    return false;
  }
}

export async function getAllUsers(): Promise<StoredUser[]> {
  await initializeStore();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return users as unknown as StoredUser[];
}

export async function deleteUser(id: string): Promise<boolean> {
  await initializeStore();

  try {
    await prisma.user.delete({ where: { id } });
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

  const settings = await getSiteSettings();
  const durationDays = rememberMe
    ? settings.rememberMeDurationDays
    : settings.sessionDurationDays;

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      rememberMe,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    }
  });

  return session as unknown as StoredSession;
}

export async function findSessionByToken(token: string): Promise<StoredSession | null> {
  await initializeStore();

  const session = await prisma.session.findUnique({
    where: { token }
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await deleteSession(session.id);
    return null;
  }

  return session as unknown as StoredSession;
}

export async function updateSessionActivity(token: string): Promise<void> {
  await initializeStore();

  try {
    await prisma.session.update({
      where: { token },
      data: { lastActiveAt: new Date() }
    });
  } catch {
    // Session might not exist, ignore error
  }
}

export async function deleteSession(id: string): Promise<boolean> {
  await initializeStore();

  try {
    await prisma.session.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function deleteSessionByToken(token: string): Promise<boolean> {
  await initializeStore();

  try {
    await prisma.session.delete({ where: { token } });
    return true;
  } catch {
    return false;
  }
}

export async function deleteUserSessions(userId: string): Promise<number> {
  await initializeStore();

  const result = await prisma.session.deleteMany({
    where: { userId }
  });
  return result.count;
}

// ============================================
// PASSWORD RESET OPERATIONS
// ============================================

export async function createPasswordResetToken(email: string): Promise<PasswordResetToken> {
  await initializeStore();

  await prisma.passwordReset.deleteMany({
    where: { email: email.toLowerCase() }
  });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const reset = await prisma.passwordReset.create({
    data: {
      email: email.toLowerCase(),
      token,
      expiresAt,
    }
  });

  return reset as PasswordResetToken;
}

export async function findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  await initializeStore();

  const reset = await prisma.passwordReset.findUnique({
    where: { token }
  });

  if (!reset) return null;

  if (reset.expiresAt < new Date() || reset.usedAt) {
    return null;
  }

  return reset as PasswordResetToken;
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  await initializeStore();

  await prisma.passwordReset.update({
    where: { token },
    data: { usedAt: new Date() }
  });
}

// ============================================
// EMAIL VERIFICATION OPERATIONS
// ============================================

export async function createEmailVerificationToken(email: string): Promise<EmailVerificationToken> {
  await initializeStore();

  await prisma.emailVerification.deleteMany({
    where: { email: email.toLowerCase() }
  });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const verification = await prisma.emailVerification.create({
    data: {
      email: email.toLowerCase(),
      token,
      expiresAt,
    }
  });

  return verification as EmailVerificationToken;
}

export async function findEmailVerificationToken(token: string): Promise<EmailVerificationToken | null> {
  await initializeStore();

  const verification = await prisma.emailVerification.findUnique({
    where: { token }
  });

  if (!verification) return null;

  if (verification.expiresAt < new Date() || verification.usedAt) {
    return null;
  }

  return verification as EmailVerificationToken;
}

export async function markEmailVerificationTokenUsed(token: string): Promise<void> {
  await initializeStore();

  await prisma.emailVerification.update({
    where: { token },
    data: { usedAt: new Date() }
  });
}

export async function markEmailVerified(email: string): Promise<void> {
  await initializeStore();

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { emailVerifiedAt: new Date() }
  });
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

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + (data.expiresInDays || 7) * 24 * 60 * 60 * 1000);

  const invite = await prisma.invite.create({
    data: {
      code,
      email: data.email.toLowerCase(),
      role: data.role,
      branch: data.branch || null,
      sentById: data.sentById,
      message: data.message || null,
      expiresAt,
    }
  });

  return invite as unknown as StoredInvite;
}

export async function findInviteByCode(code: string): Promise<StoredInvite | null> {
  await initializeStore();

  const invite = await prisma.invite.findUnique({
    where: { code }
  });

  if (!invite || invite.usedAt) return null;

  if (invite.expiresAt < new Date()) {
    return null;
  }

  return invite as unknown as StoredInvite;
}

export async function markInviteUsed(code: string, userId: string): Promise<void> {
  await initializeStore();

  await prisma.invite.update({
    where: { code },
    data: {
      usedAt: new Date(),
      usedById: userId
    }
  });
}

export async function getAllInvites(): Promise<StoredInvite[]> {
  await initializeStore();

  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return invites as unknown as StoredInvite[];
}

// ============================================
// ACCESS REQUEST OPERATIONS
// ============================================

export async function createAccessRequest(data: {
  email: string;
  nameArabic: string;
  nameEnglish?: string;
  phone?: string;
  gender?: string;
  claimedRelation: string;
  relatedMemberId?: string;
  relationshipType?: string;
  parentMemberId?: string;
  message?: string;
  passwordHash?: string;
}): Promise<StoredAccessRequest> {
  await initializeStore();

  const existing = await prisma.accessRequest.findFirst({
    where: {
      email: data.email.toLowerCase(),
      status: 'PENDING'
    }
  });

  if (existing) {
    throw new Error('You already have a pending access request');
  }

  const request = await prisma.accessRequest.create({
    data: {
      email: data.email.toLowerCase(),
      nameArabic: data.nameArabic,
      nameEnglish: data.nameEnglish || null,
      phone: data.phone || null,
      gender: data.gender || null,
      claimedRelation: data.claimedRelation,
      relatedMemberId: data.relatedMemberId || null,
      relationshipType: data.relationshipType || null,
      parentMemberId: data.parentMemberId || null,
      message: data.message || null,
      passwordHash: data.passwordHash || null,
      status: 'PENDING',
    }
  });

  return request as unknown as StoredAccessRequest;
}

export async function findAccessRequestById(id: string): Promise<StoredAccessRequest | null> {
  await initializeStore();

  const request = await prisma.accessRequest.findUnique({
    where: { id }
  });

  return request as unknown as StoredAccessRequest | null;
}

export async function findAccessRequestByEmail(email: string): Promise<StoredAccessRequest | null> {
  await initializeStore();

  const request = await prisma.accessRequest.findFirst({
    where: { email: email.toLowerCase() }
  });

  return request as unknown as StoredAccessRequest | null;
}

export async function updateAccessRequest(
  id: string,
  data: Partial<StoredAccessRequest>
): Promise<StoredAccessRequest | null> {
  await initializeStore();

  try {
    const request = await prisma.accessRequest.update({
      where: { id },
      data: data as Record<string, unknown>
    });
    return request as unknown as StoredAccessRequest;
  } catch {
    return null;
  }
}

export async function getPendingAccessRequests(): Promise<StoredAccessRequest[]> {
  await initializeStore();

  const requests = await prisma.accessRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' }
  });

  return requests as unknown as StoredAccessRequest[];
}

export async function getAllAccessRequests(): Promise<StoredAccessRequest[]> {
  await initializeStore();

  const requests = await prisma.accessRequest.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return requests as unknown as StoredAccessRequest[];
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

  const log = await prisma.activityLog.create({
    data: {
      userId: data.userId || null,
      userEmail: data.userEmail || null,
      userName: data.userName || null,
      action: data.action,
      category: data.category,
      targetType: data.targetType || null,
      targetId: data.targetId || null,
      targetName: data.targetName || null,
      details: data.details ? JSON.stringify(data.details) : null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      success: data.success !== false,
      errorMessage: data.errorMessage || null,
    }
  });

  return log as unknown as StoredActivityLog;
}

export async function getActivityLogs(options?: {
  userId?: string;
  category?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<StoredActivityLog[]> {
  await initializeStore();

  const where: Record<string, unknown> = {};
  if (options?.userId) where.userId = options.userId;
  if (options?.category) where.category = options.category;
  if (options?.action) where.action = options.action;

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: options?.offset || 0,
    take: options?.limit || 100
  });

  return logs as unknown as StoredActivityLog[];
}

// ============================================
// LOGIN ATTEMPT TRACKING (Database-backed)
// ============================================

export async function checkLoginAttempts(email: string): Promise<{ allowed: boolean; remainingAttempts: number; lockedUntil?: Date }> {
  await initializeStore();

  const settings = await getSiteSettings();
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { failedLoginAttempts: true, lockedUntil: true }
  });

  // If no user exists, allow the attempt (will fail at password check)
  if (!user) {
    return { allowed: true, remainingAttempts: settings.maxLoginAttempts };
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: user.lockedUntil,
    };
  }

  // If lock has expired, reset the attempts
  if (user.lockedUntil && user.lockedUntil <= new Date()) {
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });
    return { allowed: true, remainingAttempts: settings.maxLoginAttempts };
  }

  return {
    allowed: user.failedLoginAttempts < settings.maxLoginAttempts,
    remainingAttempts: Math.max(0, settings.maxLoginAttempts - user.failedLoginAttempts),
  };
}

export async function recordFailedLogin(email: string): Promise<void> {
  await initializeStore();

  const settings = await getSiteSettings();
  
  // First, check if user exists
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { failedLoginAttempts: true }
  });

  if (!user) {
    // User doesn't exist, nothing to record
    return;
  }

  const newAttemptCount = user.failedLoginAttempts + 1;
  
  // Lock account if attempts exceed threshold
  const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
    failedLoginAttempts: newAttemptCount,
  };

  if (newAttemptCount >= settings.maxLoginAttempts) {
    updateData.lockedUntil = new Date(Date.now() + settings.lockoutDurationMinutes * 60 * 1000);
  }

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: updateData
  });
}

export async function clearLoginAttempts(email: string): Promise<void> {
  await initializeStore();

  try {
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });
  } catch {
    // User might not exist, ignore error
  }
}

// ============================================
// SETTINGS OPERATIONS
// ============================================

export async function getSiteSettings(): Promise<SiteSettings> {
  await initializeStore();

  if (cachedSiteSettings) {
    return cachedSiteSettings;
  }

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' }
  });

  if (settings) {
    cachedSiteSettings = {
      familyNameArabic: settings.familyNameArabic,
      familyNameEnglish: settings.familyNameEnglish,
      taglineArabic: settings.taglineArabic,
      taglineEnglish: settings.taglineEnglish,
      logoUrl: settings.logoUrl || undefined,
      defaultLanguage: settings.defaultLanguage,
      sessionDurationDays: settings.sessionDurationDays,
      rememberMeDurationDays: settings.rememberMeDurationDays,
      allowSelfRegistration: settings.allowSelfRegistration,
      requireEmailVerification: settings.requireEmailVerification,
      requireApprovalForRegistration: settings.requireApprovalForRegistration,
      maxLoginAttempts: settings.maxLoginAttempts,
      lockoutDurationMinutes: settings.lockoutDurationMinutes,
      allowGuestPreview: settings.allowGuestPreview,
      guestPreviewMemberCount: settings.guestPreviewMemberCount,
      minPasswordLength: settings.minPasswordLength,
    };
    return cachedSiteSettings;
  }

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

  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      ...data as Record<string, unknown>
    },
    update: data as Record<string, unknown>
  });

  cachedSiteSettings = null;
  return getSiteSettings();
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
  await initializeStore();

  if (cachedPrivacySettings) {
    return cachedPrivacySettings;
  }

  const settings = await prisma.privacySettings.findUnique({
    where: { id: 'default' }
  });

  if (settings) {
    cachedPrivacySettings = {
      profileVisibility: JSON.parse(settings.profileVisibility),
      showPhoneToRoles: JSON.parse(settings.showPhoneToRoles),
      showEmailToRoles: JSON.parse(settings.showEmailToRoles),
      showBirthYearToRoles: JSON.parse(settings.showBirthYearToRoles),
      showAgeForLiving: settings.showAgeForLiving,
      showOccupation: settings.showOccupation,
      showCity: settings.showCity,
      showBiography: settings.showBiography,
      showPhotosToRoles: JSON.parse(settings.showPhotosToRoles),
      showDeathYear: settings.showDeathYear,
      showFullDeathDate: settings.showFullDeathDate,
    };
    return cachedPrivacySettings;
  }

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

  const updateData: Record<string, unknown> = {};
  if (data.profileVisibility) updateData.profileVisibility = JSON.stringify(data.profileVisibility);
  if (data.showPhoneToRoles) updateData.showPhoneToRoles = JSON.stringify(data.showPhoneToRoles);
  if (data.showEmailToRoles) updateData.showEmailToRoles = JSON.stringify(data.showEmailToRoles);
  if (data.showBirthYearToRoles) updateData.showBirthYearToRoles = JSON.stringify(data.showBirthYearToRoles);
  if (data.showAgeForLiving !== undefined) updateData.showAgeForLiving = data.showAgeForLiving;
  if (data.showOccupation !== undefined) updateData.showOccupation = data.showOccupation;
  if (data.showCity !== undefined) updateData.showCity = data.showCity;
  if (data.showBiography !== undefined) updateData.showBiography = data.showBiography;
  if (data.showPhotosToRoles) updateData.showPhotosToRoles = JSON.stringify(data.showPhotosToRoles);
  if (data.showDeathYear !== undefined) updateData.showDeathYear = data.showDeathYear;
  if (data.showFullDeathDate !== undefined) updateData.showFullDeathDate = data.showFullDeathDate;

  await prisma.privacySettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...updateData },
    update: updateData
  });

  cachedPrivacySettings = null;
  return getPrivacySettings();
}

export async function getPermissionMatrix(): Promise<PermissionMatrix> {
  await initializeStore();

  const matrix = await prisma.permissionMatrix.findUnique({
    where: { id: 'default' }
  });

  if (matrix) {
    return JSON.parse(matrix.permissions);
  }

  return DEFAULT_PERMISSION_MATRIX;
}

export async function updatePermissionMatrix(matrix: PermissionMatrix): Promise<PermissionMatrix> {
  await initializeStore();

  await prisma.permissionMatrix.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      permissions: JSON.stringify(matrix)
    },
    update: {
      permissions: JSON.stringify(matrix)
    }
  });

  return matrix;
}

// ============================================
// 2FA OPERATIONS
// ============================================

export async function enable2FA(userId: string, secret: string, backupCodes: string[]): Promise<boolean> {
  await initializeStore();

  try {
    await (prisma.user.update as Function)({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: JSON.stringify(backupCodes)
      }
    });
    return true;
  } catch {
    return false;
  }
}

export async function disable2FA(userId: string): Promise<boolean> {
  await initializeStore();

  try {
    await (prisma.user.update as Function)({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null
      }
    });
    return true;
  } catch {
    return false;
  }
}

export async function get2FASecret(userId: string): Promise<string | null> {
  await initializeStore();

  const user = await (prisma.user.findUnique as Function)({
    where: { id: userId },
    select: { twoFactorSecret: true }
  }) as { twoFactorSecret: string | null } | null;

  return user?.twoFactorSecret || null;
}

export async function get2FABackupCodes(userId: string): Promise<string[]> {
  await initializeStore();

  const user = await (prisma.user.findUnique as Function)({
    where: { id: userId },
    select: { twoFactorBackupCodes: true }
  }) as { twoFactorBackupCodes: string | null } | null;

  if (!user || !user.twoFactorBackupCodes) return [];
  return JSON.parse(user.twoFactorBackupCodes);
}

export async function use2FABackupCode(userId: string, code: string): Promise<boolean> {
  await initializeStore();

  const codes = await get2FABackupCodes(userId);
  const index = codes.indexOf(code);

  if (index === -1) return false;

  codes.splice(index, 1);

  await (prisma.user.update as Function)({
    where: { id: userId },
    data: {
      twoFactorBackupCodes: JSON.stringify(codes)
    }
  });

  return true;
}

// ============================================
// MEMBER LINKING VALIDATION
// ============================================

/**
 * Check if a family member is already linked to a user account
 * @param memberId - The family member ID to check
 * @param excludeUserId - Optional user ID to exclude from the check (for updates)
 * @returns The user that is linked to this member, or null if not linked
 */
export async function checkMemberLinkedToUser(
  memberId: string,
  excludeUserId?: string
): Promise<{ id: string; email: string; nameArabic: string } | null> {
  await initializeStore();

  const whereClause: Record<string, unknown> = { linkedMemberId: memberId };
  if (excludeUserId) {
    whereClause.id = { not: excludeUserId };
  }

  const existingLink = await prisma.user.findFirst({
    where: whereClause,
    select: { id: true, email: true, nameArabic: true }
  });

  return existingLink;
}

// ============================================
// VERIFY PASSWORD HELPER
// ============================================

export { verifyPasswordHash as verifyPassword };
