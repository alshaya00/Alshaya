// Zod Validation Schemas
// Al-Shaye Family Tree Application

import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

export const idSchema = z.string().min(1, 'ID is required');

export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z.string().regex(/^[+]?[\d\s-()]{7,}$/, 'Invalid phone number').optional().or(z.literal(''));

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const arabicNameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .regex(/^[\u0600-\u06FF\s]+$/, 'Name must be in Arabic');

export const englishNameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name must be in English')
  .optional()
  .or(z.literal(''));

// ============================================
// AUTHENTICATION SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nameArabic: z.string().min(2, 'Arabic name is required'),
  nameEnglish: z.string().optional(),
  phone: phoneSchema,
  inviteCode: z.string().optional(),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// ============================================
// FAMILY MEMBER SCHEMAS
// ============================================

export const genderSchema = z.enum(['Male', 'Female']);

export const memberStatusSchema = z.enum(['Living', 'Deceased']);

export const createMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  fatherName: z.string().optional().nullable(),
  grandfatherName: z.string().optional().nullable(),
  greatGrandfatherName: z.string().optional().nullable(),
  familyName: z.string().default('آل شايع'),
  fatherId: z.string().optional().nullable(),
  gender: genderSchema,
  birthYear: z.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  deathYear: z.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  generation: z.number().int().min(1).max(20).optional(),
  branch: z.string().optional().nullable(),
  fullNameAr: z.string().optional().nullable(),
  fullNameEn: z.string().optional().nullable(),
  phone: phoneSchema.nullable(),
  city: z.string().optional().nullable(),
  status: memberStatusSchema.default('Living'),
  photoUrl: z.string().url().optional().nullable(),
  biography: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  email: emailSchema.optional().nullable().or(z.literal('')),
});

export const updateMemberSchema = createMemberSchema.partial().extend({
  id: idSchema,
});

export const memberQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  gender: genderSchema.optional(),
  generation: z.coerce.number().int().min(1).max(20).optional(),
  branch: z.string().optional(),
  status: memberStatusSchema.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['firstName', 'generation', 'birthYear', 'createdAt']).default('firstName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ============================================
// USER MANAGEMENT SCHEMAS
// ============================================

export const userRoleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'BRANCH_LEADER', 'MEMBER', 'GUEST']);

export const userStatusSchema = z.enum(['PENDING', 'ACTIVE', 'DISABLED']);

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nameArabic: z.string().min(2, 'Arabic name is required'),
  nameEnglish: z.string().optional(),
  phone: phoneSchema,
  role: userRoleSchema.default('MEMBER'),
  linkedMemberId: z.string().optional().nullable(),
  assignedBranch: z.string().optional().nullable(),
});

export const updateUserSchema = z.object({
  id: idSchema,
  nameArabic: z.string().min(2).optional(),
  nameEnglish: z.string().optional(),
  phone: phoneSchema,
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  linkedMemberId: z.string().optional().nullable(),
  assignedBranch: z.string().optional().nullable(),
});

// ============================================
// INVITE SCHEMAS
// ============================================

export const createInviteSchema = z.object({
  email: emailSchema,
  role: userRoleSchema.default('MEMBER'),
  branch: z.string().optional().nullable(),
  message: z.string().max(500).optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

// ============================================
// ACCESS REQUEST SCHEMAS
// ============================================

export const accessRequestSchema = z.object({
  email: emailSchema,
  nameArabic: z.string().min(2, 'Arabic name is required'),
  nameEnglish: z.string().optional(),
  phone: phoneSchema,
  claimedRelation: z.string().min(5, 'Please describe your relation to the family'),
  relatedMemberId: z.string().optional().nullable(),
  relationshipType: z.enum(['CHILD', 'SPOUSE', 'SIBLING', 'GRANDCHILD', 'OTHER']).optional(),
  message: z.string().max(1000).optional(),
});

export const reviewAccessRequestSchema = z.object({
  id: idSchema,
  status: z.enum(['APPROVED', 'REJECTED', 'MORE_INFO']),
  reviewNote: z.string().optional(),
  approvedRole: userRoleSchema.optional(),
});

// ============================================
// IMPORT/EXPORT SCHEMAS
// ============================================

export const exportOptionsSchema = z.object({
  format: z.enum(['JSON', 'CSV', 'EXCEL', 'PDF']),
  fields: z.array(z.string()).min(1, 'Select at least one field'),
  includeTree: z.boolean().default(false),
  groupByGeneration: z.boolean().default(false),
  filters: z.object({
    generations: z.array(z.number()).optional(),
    branches: z.array(z.string()).optional(),
    genders: z.array(genderSchema).optional(),
    status: z.array(memberStatusSchema).optional(),
    searchQuery: z.string().optional(),
  }).optional(),
});

export const importOptionsSchema = z.object({
  fileType: z.enum(['JSON', 'CSV', 'EXCEL']),
  conflictStrategy: z.enum(['SKIP', 'OVERWRITE', 'MERGE', 'ASK']).default('ASK'),
  validateOnly: z.boolean().default(false),
});

// ============================================
// SETTINGS SCHEMAS
// ============================================

export const siteSettingsSchema = z.object({
  familyNameArabic: z.string().min(1),
  familyNameEnglish: z.string().min(1),
  taglineArabic: z.string().optional(),
  taglineEnglish: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  defaultLanguage: z.enum(['ar', 'en']).default('ar'),
  sessionDurationDays: z.number().int().min(1).max(365).default(7),
  rememberMeDurationDays: z.number().int().min(1).max(365).default(30),
  allowSelfRegistration: z.boolean().default(true),
  requireEmailVerification: z.boolean().default(false),
  requireApprovalForRegistration: z.boolean().default(true),
  maxLoginAttempts: z.number().int().min(3).max(10).default(5),
  lockoutDurationMinutes: z.number().int().min(5).max(60).default(15),
  require2FAForAdmins: z.boolean().default(false),
  minPasswordLength: z.number().int().min(6).max(20).default(8),
  allowGuestPreview: z.boolean().default(true),
  guestPreviewMemberCount: z.number().int().min(0).max(100).default(20),
});

export const privacySettingsSchema = z.object({
  profileVisibility: z.record(userRoleSchema, z.boolean()).optional(),
  showPhoneToRoles: z.array(userRoleSchema).optional(),
  showEmailToRoles: z.array(userRoleSchema).optional(),
  showBirthYearToRoles: z.array(userRoleSchema).optional(),
  showAgeForLiving: z.boolean().default(false),
  showOccupation: z.boolean().default(true),
  showCity: z.boolean().default(true),
  showBiography: z.boolean().default(true),
  showPhotosToRoles: z.array(userRoleSchema).optional(),
  showDeathYear: z.boolean().default(true),
  showFullDeathDate: z.boolean().default(false),
});

// ============================================
// API SERVICE CONFIGURATION SCHEMAS
// ============================================

export const emailProviderSchema = z.enum(['resend', 'sendgrid', 'mailgun', 'smtp', 'none']);

export const otpProviderSchema = z.enum(['twilio', 'vonage', 'messagebird', 'none']);

export const apiServiceConfigSchema = z.object({
  // Email Configuration
  emailProvider: emailProviderSchema.default('none'),
  emailApiKey: z.string().optional(),
  emailFromAddress: emailSchema.optional(),
  emailFromName: z.string().optional(),

  // SMTP Configuration (if provider is smtp)
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().default(true),

  // OTP/SMS Configuration
  otpProvider: otpProviderSchema.default('none'),
  otpApiKey: z.string().optional(),
  otpApiSecret: z.string().optional(),
  otpFromNumber: z.string().optional(),

  // General Settings
  enableEmailNotifications: z.boolean().default(false),
  enableSMSNotifications: z.boolean().default(false),
  testMode: z.boolean().default(true),
});

// ============================================
// SNAPSHOT SCHEMAS
// ============================================

export const createSnapshotSchema = z.object({
  name: z.string().min(1, 'Snapshot name is required').max(100),
  description: z.string().max(500).optional(),
});

// ============================================
// BRANCH ENTRY LINK SCHEMAS
// ============================================

export const createBranchLinkSchema = z.object({
  branchName: z.string().min(1, 'Branch name is required'),
  branchHeadId: z.string().min(1, 'Branch head ID is required'),
  branchHeadName: z.string().min(1, 'Branch head name is required'),
  expiresAt: z.coerce.date().optional().nullable(),
  maxUses: z.number().int().min(1).max(1000).optional().nullable(),
});

// ============================================
// SEARCH SCHEMAS
// ============================================

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  type: z.enum(['members', 'users', 'all']).default('members'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ============================================
// PAGINATION SCHEMA
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type MemberQueryInput = z.infer<typeof memberQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AccessRequestInput = z.infer<typeof accessRequestSchema>;
export type ReviewAccessRequestInput = z.infer<typeof reviewAccessRequestSchema>;
export type ExportOptionsInput = z.infer<typeof exportOptionsSchema>;
export type ImportOptionsInput = z.infer<typeof importOptionsSchema>;
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;
export type ApiServiceConfigInput = z.infer<typeof apiServiceConfigSchema>;
export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>;
export type CreateBranchLinkInput = z.infer<typeof createBranchLinkSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

// ============================================
// VALIDATION HELPER
// ============================================

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function formatZodErrors(errors: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const error of errors.issues) {
    const path = error.path.join('.');
    formatted[path] = error.message;
  }
  return formatted;
}
