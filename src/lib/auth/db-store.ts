// Database-backed authentication store using Prisma (PostgreSQL)
// This module handles all auth operations via the main PostgreSQL database

import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword as verifyPasswordHash, generateSessionToken, generateInviteCode } from './password';

// Inline types for Prisma models (to avoid dependency on generated client during build)
type PrismaInvite = {
  id: string;
  code: string;
  email: string;
  role: string;
  branch: string | null;
  sentById: string;
  expiresAt: Date;
  usedAt: Date | null;
  usedById: string | null;
  message: string | null;
  createdAt: Date;
};

type PrismaAccessRequest = {
  id: string;
  email: string;
  nameArabic: string;
  nameEnglish: string | null;
  phone: string | null;
  city: string | null;
  birthDate: Date | null;
  claimedRelation: string;
  relatedMemberId: string | null;
  relationshipType: string | null;
  message: string | null;
  status: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  userId: string | null;
  approvedRole: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaActivityLog = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  category: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: Date;
};
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
  city?: string | null;
  birthDate?: Date | null;
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

// Login attempt tracking (in-memory)
const loginAttempts: Map<string, { count: number; lockedUntil?: Date }> = new Map();

// ============================================
// HELPER FUNCTIONS
// ============================================

// Convert Prisma User to StoredUser
function prismaUserToStoredUser(user: {
  id: string;
  email: string;
  passwordHash: string;
  nameArabic: string;
  nameEnglish: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  linkedMemberId: string | null;
  assignedBranch: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  emailVerifiedAt: Date | null;
}): StoredUser {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    nameArabic: user.nameArabic,
    nameEnglish: user.nameEnglish,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role as UserRole,
    status: user.status as UserStatus,
    linkedMemberId: user.linkedMemberId,
    assignedBranch: user.assignedBranch,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    emailVerifiedAt: user.emailVerifiedAt,
    twoFactorEnabled: false, // Will be fetched from UserPermissionOverride if needed
    twoFactorSecret: null,
    twoFactorBackupCodes: null,
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
    // Check if super admin exists
    const adminCount = await prisma.user.count({
      where: { role: 'SUPER_ADMIN' }
    });

    if (adminCount === 0) {
      // Create default super admin from environment variables
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

  return prismaUserToStoredUser(user);
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  await initializeStore();

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  return user ? prismaUserToStoredUser(user) : null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  await initializeStore();

  const user = await prisma.user.findUnique({
    where: { id }
  });

  return user ? prismaUserToStoredUser(user) : null;
}

export async function updateUser(id: string, data: Partial<StoredUser>): Promise<StoredUser | null> {
  await initializeStore();

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

  if (Object.keys(updateData).length === 0) {
    return findUserById(id);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });
    return prismaUserToStoredUser(user);
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

  return users.map(prismaUserToStoredUser);
}

export async function deleteUser(id: string): Promise<boolean> {
  await initializeStore();

  try {
    await prisma.user.delete({
      where: { id }
    });
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

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    expiresAt: session.expiresAt,
    rememberMe: session.rememberMe,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
  };
}

export async function findSessionByToken(token: string): Promise<StoredSession | null> {
  await initializeStore();

  const session = await prisma.session.findUnique({
    where: { token }
  });

  if (!session) return null;

  // Check if expired
  if (session.expiresAt < new Date()) {
    await deleteSession(session.id);
    return null;
  }

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    expiresAt: session.expiresAt,
    rememberMe: session.rememberMe,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
  };
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
    await prisma.session.delete({
      where: { id }
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteSessionByToken(token: string): Promise<boolean> {
  await initializeStore();

  try {
    await prisma.session.delete({
      where: { token }
    });
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

  // Delete any existing tokens for this email
  await prisma.passwordReset.deleteMany({
    where: { email: email.toLowerCase() }
  });

  // Create new token (expires in 1 hour)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const reset = await prisma.passwordReset.create({
    data: {
      email: email.toLowerCase(),
      token,
      expiresAt,
    }
  });

  return {
    id: reset.id,
    email: reset.email,
    token: reset.token,
    expiresAt: reset.expiresAt,
    usedAt: reset.usedAt,
    createdAt: reset.createdAt,
  };
}

export async function findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  await initializeStore();

  const reset = await prisma.passwordReset.findUnique({
    where: { token }
  });

  if (!reset) return null;

  // Check if expired or used
  if (reset.expiresAt < new Date() || reset.usedAt) {
    return null;
  }

  return {
    id: reset.id,
    email: reset.email,
    token: reset.token,
    expiresAt: reset.expiresAt,
    usedAt: reset.usedAt,
    createdAt: reset.createdAt,
  };
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

  // Delete any existing tokens for this email
  await prisma.emailVerification.deleteMany({
    where: { email: email.toLowerCase() }
  });

  // Create new token (expires in 24 hours)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const verification = await prisma.emailVerification.create({
    data: {
      email: email.toLowerCase(),
      token,
      expiresAt,
    }
  });

  return {
    id: verification.id,
    email: verification.email,
    token: verification.token,
    expiresAt: verification.expiresAt,
    usedAt: verification.usedAt,
    createdAt: verification.createdAt,
  };
}

export async function findEmailVerificationToken(token: string): Promise<EmailVerificationToken | null> {
  await initializeStore();

  const verification = await prisma.emailVerification.findUnique({
    where: { token }
  });

  if (!verification) return null;

  // Check if expired or used
  if (verification.expiresAt < new Date() || verification.usedAt) {
    return null;
  }

  return {
    id: verification.id,
    email: verification.email,
    token: verification.token,
    expiresAt: verification.expiresAt,
    usedAt: verification.usedAt,
    createdAt: verification.createdAt,
  };
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

  await prisma.user.updateMany({
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
      expiresAt,
      message: data.message || null,
    }
  });

  return {
    id: invite.id,
    code: invite.code,
    email: invite.email,
    role: invite.role as UserRole,
    branch: invite.branch,
    sentById: invite.sentById,
    expiresAt: invite.expiresAt,
    usedAt: invite.usedAt,
    usedById: invite.usedById,
    message: invite.message,
    createdAt: invite.createdAt,
  };
}

export async function findInviteByCode(code: string): Promise<StoredInvite | null> {
  await initializeStore();

  const invite = await prisma.invite.findUnique({
    where: { code }
  });

  if (!invite) return null;

  // Check if expired or used
  if (invite.expiresAt < new Date() || invite.usedAt) {
    return null;
  }

  return {
    id: invite.id,
    code: invite.code,
    email: invite.email,
    role: invite.role as UserRole,
    branch: invite.branch,
    sentById: invite.sentById,
    expiresAt: invite.expiresAt,
    usedAt: invite.usedAt,
    usedById: invite.usedById,
    message: invite.message,
    createdAt: invite.createdAt,
  };
}

export async function markInviteUsed(code: string, userId: string): Promise<void> {
  await initializeStore();

  await prisma.invite.update({
    where: { code },
    data: {
      usedAt: new Date(),
      usedById: userId,
    }
  });
}

export async function getAllInvites(): Promise<StoredInvite[]> {
  await initializeStore();

  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return invites.map((invite: PrismaInvite) => ({
    id: invite.id,
    code: invite.code,
    email: invite.email,
    role: invite.role as UserRole,
    branch: invite.branch,
    sentById: invite.sentById,
    expiresAt: invite.expiresAt,
    usedAt: invite.usedAt,
    usedById: invite.usedById,
    message: invite.message,
    createdAt: invite.createdAt,
  }));
}

// ============================================
// ACCESS REQUEST OPERATIONS
// ============================================

export async function createAccessRequest(data: {
  email: string;
  nameArabic: string;
  nameEnglish?: string;
  phone?: string;
  city?: string;
  birthDate?: Date | null;
  claimedRelation: string;
  relatedMemberId?: string;
  relationshipType?: string;
  message?: string;
}): Promise<StoredAccessRequest> {
  await initializeStore();

  // Check if email already has a pending request
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
      city: data.city || null,
      birthDate: data.birthDate || null,
      claimedRelation: data.claimedRelation,
      relatedMemberId: data.relatedMemberId || null,
      relationshipType: data.relationshipType || null,
      message: data.message || null,
      status: 'PENDING',
    }
  });

  return {
    id: request.id,
    email: request.email,
    nameArabic: request.nameArabic,
    nameEnglish: request.nameEnglish,
    phone: request.phone,
    city: request.city,
    birthDate: request.birthDate,
    claimedRelation: request.claimedRelation,
    relatedMemberId: request.relatedMemberId,
    relationshipType: request.relationshipType,
    message: request.message,
    status: request.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO',
    reviewedById: request.reviewedById,
    reviewedAt: request.reviewedAt,
    reviewNote: request.reviewNote,
    userId: request.userId,
    approvedRole: request.approvedRole as UserRole | null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export async function findAccessRequestById(id: string): Promise<StoredAccessRequest | null> {
  await initializeStore();

  const request = await prisma.accessRequest.findUnique({
    where: { id }
  });

  if (!request) return null;

  return {
    id: request.id,
    email: request.email,
    nameArabic: request.nameArabic,
    nameEnglish: request.nameEnglish,
    phone: request.phone,
    claimedRelation: request.claimedRelation,
    relatedMemberId: request.relatedMemberId,
    relationshipType: request.relationshipType,
    message: request.message,
    status: request.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO',
    reviewedById: request.reviewedById,
    reviewedAt: request.reviewedAt,
    reviewNote: request.reviewNote,
    userId: request.userId,
    approvedRole: request.approvedRole as UserRole | null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export async function findAccessRequestByEmail(email: string): Promise<StoredAccessRequest | null> {
  await initializeStore();

  const request = await prisma.accessRequest.findFirst({
    where: { email: email.toLowerCase() },
    orderBy: { createdAt: 'desc' }
  });

  if (!request) return null;

  return {
    id: request.id,
    email: request.email,
    nameArabic: request.nameArabic,
    nameEnglish: request.nameEnglish,
    phone: request.phone,
    claimedRelation: request.claimedRelation,
    relatedMemberId: request.relatedMemberId,
    relationshipType: request.relationshipType,
    message: request.message,
    status: request.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO',
    reviewedById: request.reviewedById,
    reviewedAt: request.reviewedAt,
    reviewNote: request.reviewNote,
    userId: request.userId,
    approvedRole: request.approvedRole as UserRole | null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export async function updateAccessRequest(
  id: string,
  data: Partial<StoredAccessRequest>
): Promise<StoredAccessRequest | null> {
  await initializeStore();

  const updateData: Record<string, unknown> = {};

  if (data.status !== undefined) updateData.status = data.status;
  if (data.reviewedById !== undefined) updateData.reviewedById = data.reviewedById || null;
  if (data.reviewedAt !== undefined) updateData.reviewedAt = data.reviewedAt || null;
  if (data.reviewNote !== undefined) updateData.reviewNote = data.reviewNote || null;
  if (data.userId !== undefined) updateData.userId = data.userId || null;
  if (data.approvedRole !== undefined) updateData.approvedRole = data.approvedRole || null;

  if (Object.keys(updateData).length === 0) {
    return findAccessRequestById(id);
  }

  try {
    await prisma.accessRequest.update({
      where: { id },
      data: updateData
    });
    return findAccessRequestById(id);
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

  return requests.map((request: PrismaAccessRequest) => ({
    id: request.id,
    email: request.email,
    nameArabic: request.nameArabic,
    nameEnglish: request.nameEnglish,
    phone: request.phone,
    claimedRelation: request.claimedRelation,
    relatedMemberId: request.relatedMemberId,
    relationshipType: request.relationshipType,
    message: request.message,
    status: request.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO',
    reviewedById: request.reviewedById,
    reviewedAt: request.reviewedAt,
    reviewNote: request.reviewNote,
    userId: request.userId,
    approvedRole: request.approvedRole as UserRole | null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }));
}

export async function getAllAccessRequests(): Promise<StoredAccessRequest[]> {
  await initializeStore();

  const requests = await prisma.accessRequest.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return requests.map((request: PrismaAccessRequest) => ({
    id: request.id,
    email: request.email,
    nameArabic: request.nameArabic,
    nameEnglish: request.nameEnglish,
    phone: request.phone,
    claimedRelation: request.claimedRelation,
    relatedMemberId: request.relatedMemberId,
    relationshipType: request.relationshipType,
    message: request.message,
    status: request.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO',
    reviewedById: request.reviewedById,
    reviewedAt: request.reviewedAt,
    reviewNote: request.reviewNote,
    userId: request.userId,
    approvedRole: request.approvedRole as UserRole | null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }));
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

  // Clean up old logs (keep last N)
  const count = await prisma.activityLog.count();
  if (count > paginationSettings.maxActivityLogs) {
    const deleteCount = count - paginationSettings.maxActivityLogs;
    const oldLogs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'asc' },
      take: deleteCount,
      select: { id: true }
    });
    await prisma.activityLog.deleteMany({
      where: { id: { in: oldLogs.map((l: { id: string }) => l.id) } }
    });
  }

  return {
    id: log.id,
    userId: log.userId,
    userEmail: log.userEmail,
    userName: log.userName,
    action: log.action,
    category: log.category,
    targetType: log.targetType,
    targetId: log.targetId,
    targetName: log.targetName,
    details: log.details,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    success: log.success,
    errorMessage: log.errorMessage,
    createdAt: log.createdAt,
  };
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
    take: options?.limit || 100,
    skip: options?.offset || 0,
  });

  return logs.map((log: PrismaActivityLog) => ({
    id: log.id,
    userId: log.userId,
    userEmail: log.userEmail,
    userName: log.userName,
    action: log.action,
    category: log.category,
    targetType: log.targetType,
    targetId: log.targetId,
    targetName: log.targetName,
    details: log.details,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    success: log.success,
    errorMessage: log.errorMessage,
    createdAt: log.createdAt,
  }));
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
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' }
    });

    if (settings) {
      cachedSiteSettings = {
        familyNameArabic: settings.familyNameArabic,
        familyNameEnglish: settings.familyNameEnglish,
        taglineArabic: settings.taglineArabic,
        taglineEnglish: settings.taglineEnglish,
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

  const updateData: Record<string, unknown> = {};

  if (data.familyNameArabic !== undefined) updateData.familyNameArabic = data.familyNameArabic;
  if (data.familyNameEnglish !== undefined) updateData.familyNameEnglish = data.familyNameEnglish;
  if (data.sessionDurationDays !== undefined) updateData.sessionDurationDays = data.sessionDurationDays;
  if (data.rememberMeDurationDays !== undefined) updateData.rememberMeDurationDays = data.rememberMeDurationDays;
  if (data.allowSelfRegistration !== undefined) updateData.allowSelfRegistration = data.allowSelfRegistration;
  if (data.requireEmailVerification !== undefined) updateData.requireEmailVerification = data.requireEmailVerification;
  if (data.maxLoginAttempts !== undefined) updateData.maxLoginAttempts = data.maxLoginAttempts;
  if (data.lockoutDurationMinutes !== undefined) updateData.lockoutDurationMinutes = data.lockoutDurationMinutes;

  if (Object.keys(updateData).length > 0) {
    await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
      }
    });
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
    const settings = await prisma.privacySettings.findUnique({
      where: { id: 'default' }
    });

    if (settings) {
      cachedPrivacySettings = {
        profileVisibility: JSON.parse(settings.profileVisibility || '{}'),
        showPhoneToRoles: JSON.parse(settings.showPhoneToRoles || '[]'),
        showEmailToRoles: JSON.parse(settings.showEmailToRoles || '[]'),
        showBirthYearToRoles: JSON.parse(settings.showBirthYearToRoles || '[]'),
        showAgeForLiving: settings.showAgeForLiving,
        showOccupation: settings.showOccupation,
        showCity: settings.showCity,
        showBiography: settings.showBiography,
        showPhotosToRoles: JSON.parse(settings.showPhotosToRoles || '[]'),
        showDeathYear: settings.showDeathYear,
        showFullDeathDate: settings.showFullDeathDate,
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

  const updateData: Record<string, unknown> = {};

  if (data.profileVisibility) updateData.profileVisibility = JSON.stringify(data.profileVisibility);
  if (data.showPhoneToRoles) updateData.showPhoneToRoles = JSON.stringify(data.showPhoneToRoles);
  if (data.showEmailToRoles) updateData.showEmailToRoles = JSON.stringify(data.showEmailToRoles);
  if (data.showBirthYearToRoles) updateData.showBirthYearToRoles = JSON.stringify(data.showBirthYearToRoles);
  if (data.showPhotosToRoles) updateData.showPhotosToRoles = JSON.stringify(data.showPhotosToRoles);
  if (typeof data.showAgeForLiving === 'boolean') updateData.showAgeForLiving = data.showAgeForLiving;
  if (typeof data.showOccupation === 'boolean') updateData.showOccupation = data.showOccupation;
  if (typeof data.showCity === 'boolean') updateData.showCity = data.showCity;
  if (typeof data.showBiography === 'boolean') updateData.showBiography = data.showBiography;
  if (typeof data.showDeathYear === 'boolean') updateData.showDeathYear = data.showDeathYear;
  if (typeof data.showFullDeathDate === 'boolean') updateData.showFullDeathDate = data.showFullDeathDate;

  if (Object.keys(updateData).length > 0) {
    await prisma.privacySettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
      }
    });
  }

  cachedPrivacySettings = null; // Clear cache
  return getPrivacySettings();
}

export async function getPermissionMatrix(): Promise<PermissionMatrix> {
  await initializeStore();

  try {
    const matrix = await prisma.permissionMatrix.findUnique({
      where: { id: 'default' }
    });

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

  await prisma.permissionMatrix.upsert({
    where: { id: 'default' },
    update: { permissions: JSON.stringify(matrix) },
    create: { id: 'default', permissions: JSON.stringify(matrix) }
  });

  return matrix;
}

// ============================================
// 2FA OPERATIONS
// ============================================

export async function enableTwoFactor(userId: string, secret: string, backupCodes: string[]): Promise<boolean> {
  await initializeStore();

  try {
    await prisma.userPermissionOverride.upsert({
      where: {
        userId_permissionKey: {
          userId,
          permissionKey: 'two_factor_secret',
        }
      },
      update: {
        allowed: true,
        reason: secret,
        setAt: new Date(),
      },
      create: {
        userId,
        permissionKey: 'two_factor_secret',
        allowed: true,
        setBy: userId,
        reason: secret,
      }
    });

    await prisma.userPermissionOverride.upsert({
      where: {
        userId_permissionKey: {
          userId,
          permissionKey: 'two_factor_backup_codes',
        }
      },
      update: {
        allowed: true,
        reason: JSON.stringify(backupCodes),
        setAt: new Date(),
      },
      create: {
        userId,
        permissionKey: 'two_factor_backup_codes',
        allowed: true,
        setBy: userId,
        reason: JSON.stringify(backupCodes),
      }
    });

    return true;
  } catch {
    return false;
  }
}

export async function disableTwoFactor(userId: string): Promise<boolean> {
  await initializeStore();

  try {
    await prisma.userPermissionOverride.deleteMany({
      where: {
        userId,
        permissionKey: { in: ['two_factor_secret', 'two_factor_backup_codes', 'two_factor_temp_secret'] }
      }
    });
    return true;
  } catch {
    return false;
  }
}

export async function updateTwoFactorBackupCodes(userId: string, backupCodes: string[]): Promise<boolean> {
  await initializeStore();

  try {
    await prisma.userPermissionOverride.update({
      where: {
        userId_permissionKey: {
          userId,
          permissionKey: 'two_factor_backup_codes',
        }
      },
      data: {
        reason: JSON.stringify(backupCodes),
        setAt: new Date(),
      }
    });
    return true;
  } catch {
    return false;
  }
}

// Re-export verifyPassword
export { verifyPasswordHash as verifyPassword };
