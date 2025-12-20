// Authentication Types for Al-Shaye Family Tree

// ============================================
// USER ROLES
// ============================================

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'BRANCH_LEADER' | 'MEMBER' | 'GUEST';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';

export const USER_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_LEADER', 'MEMBER', 'GUEST'];

export const ROLE_LABELS: Record<UserRole, { ar: string; en: string }> = {
  SUPER_ADMIN: { ar: 'المدير العام', en: 'Super Admin' },
  ADMIN: { ar: 'مدير', en: 'Admin' },
  BRANCH_LEADER: { ar: 'مسؤول الفرع', en: 'Branch Leader' },
  MEMBER: { ar: 'عضو العائلة', en: 'Family Member' },
  GUEST: { ar: 'زائر', en: 'Guest' },
};

export const STATUS_LABELS: Record<UserStatus, { ar: string; en: string }> = {
  PENDING: { ar: 'بانتظار الموافقة', en: 'Pending Approval' },
  ACTIVE: { ar: 'نشط', en: 'Active' },
  DISABLED: { ar: 'معطل', en: 'Disabled' },
};

// ============================================
// PERMISSION KEYS
// ============================================

export type PermissionKey =
  // Viewing permissions
  | 'view_family_tree'
  | 'view_member_profiles'
  | 'view_member_contact'
  | 'view_member_photos'
  | 'view_analytics'
  | 'view_change_history'
  // Member management
  | 'add_member'
  | 'edit_member'
  | 'delete_member'
  | 'suggest_edit'
  | 'approve_pending_members'
  // Data operations
  | 'export_data'
  | 'import_data'
  | 'create_snapshot'
  | 'restore_snapshot'
  // User management
  | 'view_users'
  | 'invite_users'
  | 'approve_access_requests'
  | 'change_user_roles'
  | 'disable_users'
  // System settings
  | 'manage_site_settings'
  | 'manage_privacy_settings'
  | 'manage_permission_matrix'
  | 'view_audit_logs'
  | 'manage_branch_links';

export const PERMISSION_KEYS: PermissionKey[] = [
  'view_family_tree',
  'view_member_profiles',
  'view_member_contact',
  'view_member_photos',
  'view_analytics',
  'view_change_history',
  'add_member',
  'edit_member',
  'delete_member',
  'suggest_edit',
  'approve_pending_members',
  'export_data',
  'import_data',
  'create_snapshot',
  'restore_snapshot',
  'view_users',
  'invite_users',
  'approve_access_requests',
  'change_user_roles',
  'disable_users',
  'manage_site_settings',
  'manage_privacy_settings',
  'manage_permission_matrix',
  'view_audit_logs',
  'manage_branch_links',
];

export const PERMISSION_LABELS: Record<PermissionKey, { ar: string; en: string; category: string }> = {
  // Viewing
  view_family_tree: { ar: 'عرض شجرة العائلة', en: 'View Family Tree', category: 'viewing' },
  view_member_profiles: { ar: 'عرض ملفات الأعضاء', en: 'View Member Profiles', category: 'viewing' },
  view_member_contact: { ar: 'عرض معلومات الاتصال', en: 'View Contact Info', category: 'viewing' },
  view_member_photos: { ar: 'عرض صور الأعضاء', en: 'View Member Photos', category: 'viewing' },
  view_analytics: { ar: 'عرض الإحصائيات', en: 'View Analytics', category: 'viewing' },
  view_change_history: { ar: 'عرض سجل التغييرات', en: 'View Change History', category: 'viewing' },
  // Member management
  add_member: { ar: 'إضافة عضو', en: 'Add Member', category: 'members' },
  edit_member: { ar: 'تعديل عضو', en: 'Edit Member', category: 'members' },
  delete_member: { ar: 'حذف عضو', en: 'Delete Member', category: 'members' },
  suggest_edit: { ar: 'اقتراح تعديل', en: 'Suggest Edit', category: 'members' },
  approve_pending_members: { ar: 'الموافقة على الأعضاء', en: 'Approve Pending Members', category: 'members' },
  // Data operations
  export_data: { ar: 'تصدير البيانات', en: 'Export Data', category: 'data' },
  import_data: { ar: 'استيراد البيانات', en: 'Import Data', category: 'data' },
  create_snapshot: { ar: 'إنشاء نسخة احتياطية', en: 'Create Snapshot', category: 'data' },
  restore_snapshot: { ar: 'استعادة نسخة احتياطية', en: 'Restore Snapshot', category: 'data' },
  // User management
  view_users: { ar: 'عرض المستخدمين', en: 'View Users', category: 'users' },
  invite_users: { ar: 'دعوة مستخدمين', en: 'Invite Users', category: 'users' },
  approve_access_requests: { ar: 'الموافقة على طلبات الوصول', en: 'Approve Access Requests', category: 'users' },
  change_user_roles: { ar: 'تغيير أدوار المستخدمين', en: 'Change User Roles', category: 'users' },
  disable_users: { ar: 'تعطيل المستخدمين', en: 'Disable Users', category: 'users' },
  // System settings
  manage_site_settings: { ar: 'إدارة إعدادات الموقع', en: 'Manage Site Settings', category: 'settings' },
  manage_privacy_settings: { ar: 'إدارة إعدادات الخصوصية', en: 'Manage Privacy Settings', category: 'settings' },
  manage_permission_matrix: { ar: 'إدارة صلاحيات الأدوار', en: 'Manage Permission Matrix', category: 'settings' },
  view_audit_logs: { ar: 'عرض سجلات النظام', en: 'View Audit Logs', category: 'settings' },
  manage_branch_links: { ar: 'إدارة روابط الفروع', en: 'Manage Branch Links', category: 'settings' },
};

export const PERMISSION_CATEGORIES = {
  viewing: { ar: 'العرض', en: 'Viewing' },
  members: { ar: 'إدارة الأعضاء', en: 'Member Management' },
  data: { ar: 'عمليات البيانات', en: 'Data Operations' },
  users: { ar: 'إدارة المستخدمين', en: 'User Management' },
  settings: { ar: 'إعدادات النظام', en: 'System Settings' },
};

// ============================================
// DEFAULT PERMISSION MATRIX
// ============================================

export type PermissionMatrix = Record<UserRole, Record<PermissionKey, boolean>>;

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  GUEST: {
    view_family_tree: true,  // Simplified view
    view_member_profiles: false,
    view_member_contact: false,
    view_member_photos: false,
    view_analytics: false,
    view_change_history: false,
    add_member: false,
    edit_member: false,
    delete_member: false,
    suggest_edit: false,
    approve_pending_members: false,
    export_data: false,
    import_data: false,
    create_snapshot: false,
    restore_snapshot: false,
    view_users: false,
    invite_users: false,
    approve_access_requests: false,
    change_user_roles: false,
    disable_users: false,
    manage_site_settings: false,
    manage_privacy_settings: false,
    manage_permission_matrix: false,
    view_audit_logs: false,
    manage_branch_links: false,
  },
  MEMBER: {
    view_family_tree: true,
    view_member_profiles: true,
    view_member_contact: true,  // Family should connect!
    view_member_photos: true,
    view_analytics: true,
    view_change_history: false,
    add_member: false,
    edit_member: false,
    delete_member: false,
    suggest_edit: true,  // Can suggest edits for approval
    approve_pending_members: false,
    export_data: false,
    import_data: false,
    create_snapshot: false,
    restore_snapshot: false,
    view_users: false,
    invite_users: false,
    approve_access_requests: false,
    change_user_roles: false,
    disable_users: false,
    manage_site_settings: false,
    manage_privacy_settings: false,
    manage_permission_matrix: false,
    view_audit_logs: false,
    manage_branch_links: false,
  },
  BRANCH_LEADER: {
    view_family_tree: true,
    view_member_profiles: true,
    view_member_contact: true,
    view_member_photos: true,
    view_analytics: true,
    view_change_history: true,
    add_member: true,  // For their branch
    edit_member: true,  // For their branch
    delete_member: false,
    suggest_edit: true,
    approve_pending_members: true,  // For their branch
    export_data: false,
    import_data: false,
    create_snapshot: false,
    restore_snapshot: false,
    view_users: false,
    invite_users: true,  // For their branch
    approve_access_requests: false,
    change_user_roles: false,
    disable_users: false,
    manage_site_settings: false,
    manage_privacy_settings: false,
    manage_permission_matrix: false,
    view_audit_logs: false,
    manage_branch_links: true,  // For their branch
  },
  ADMIN: {
    view_family_tree: true,
    view_member_profiles: true,
    view_member_contact: true,
    view_member_photos: true,
    view_analytics: true,
    view_change_history: true,
    add_member: true,
    edit_member: true,
    delete_member: false,  // Only super admin
    suggest_edit: true,
    approve_pending_members: true,
    export_data: true,
    import_data: false,  // Only super admin
    create_snapshot: true,
    restore_snapshot: false,  // Only super admin
    view_users: true,
    invite_users: true,
    approve_access_requests: true,
    change_user_roles: true,  // Can't assign SUPER_ADMIN
    disable_users: false,  // Only super admin
    manage_site_settings: false,
    manage_privacy_settings: false,
    manage_permission_matrix: false,
    view_audit_logs: true,
    manage_branch_links: true,
  },
  SUPER_ADMIN: {
    view_family_tree: true,
    view_member_profiles: true,
    view_member_contact: true,
    view_member_photos: true,
    view_analytics: true,
    view_change_history: true,
    add_member: true,
    edit_member: true,
    delete_member: true,
    suggest_edit: true,
    approve_pending_members: true,
    export_data: true,
    import_data: true,
    create_snapshot: true,
    restore_snapshot: true,
    view_users: true,
    invite_users: true,
    approve_access_requests: true,
    change_user_roles: true,
    disable_users: true,
    manage_site_settings: true,
    manage_privacy_settings: true,
    manage_permission_matrix: true,
    view_audit_logs: true,
    manage_branch_links: true,
  },
};

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
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

export interface SessionUser {
  id: string;
  email: string;
  nameArabic: string;
  nameEnglish?: string | null;
  role: UserRole;
  status: UserStatus;
  linkedMemberId?: string | null;
  assignedBranch?: string | null;
  permissions: Record<PermissionKey, boolean>;
  emailVerifiedAt?: Date | string | null;
  twoFactorEnabled?: boolean;
}

export interface AuthSession {
  user: SessionUser;
  token: string;
  expiresAt: Date;
}

// ============================================
// AUTH REQUEST/RESPONSE TYPES
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nameArabic: string;
  nameEnglish?: string;
  phone?: string;
  claimedRelation: string;
  relatedMemberId?: string;
  relationshipType?: string;
  message?: string;
}

export interface InviteRequest {
  email: string;
  role: UserRole;
  branch?: string;
  message?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  messageAr?: string;
  user?: SessionUser;
  token?: string;
  expiresAt?: string;
}

// ============================================
// ACTIVITY LOG TYPES
// ============================================

export type ActivityAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_COMPLETE'
  | 'REGISTER'
  | 'INVITE_SENT'
  | 'INVITE_ACCEPTED'
  | 'ACCESS_REQUEST_APPROVED'
  | 'ACCESS_REQUEST_REJECTED'
  | 'VIEW_MEMBER'
  | 'CREATE_MEMBER'
  | 'EDIT_MEMBER'
  | 'DELETE_MEMBER'
  | 'SUGGEST_EDIT'
  | 'APPROVE_PENDING_MEMBER'
  | 'REJECT_PENDING_MEMBER'
  | 'EXPORT_DATA'
  | 'IMPORT_DATA'
  | 'CREATE_SNAPSHOT'
  | 'RESTORE_SNAPSHOT'
  | 'CREATE_USER'
  | 'EDIT_USER'
  | 'DISABLE_USER'
  | 'CHANGE_USER_ROLE'
  | 'UPDATE_SETTINGS'
  | 'UPDATE_PRIVACY'
  | 'UPDATE_PERMISSIONS';

export type ActivityCategory = 'AUTH' | 'MEMBER' | 'USER' | 'SETTINGS' | 'DATA';

export interface ActivityLogEntry {
  action: ActivityAction;
  category: ActivityCategory;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
}

// ============================================
// SITE SETTINGS TYPES
// ============================================

export interface SiteSettings {
  familyNameArabic: string;
  familyNameEnglish: string;
  taglineArabic: string;
  taglineEnglish: string;
  defaultLanguage: string;
  sessionDurationDays: number;
  rememberMeDurationDays: number;
  allowSelfRegistration: boolean;
  requireEmailVerification: boolean;
  requireApprovalForRegistration: boolean;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  allowGuestPreview: boolean;
  guestPreviewMemberCount: number;
  minPasswordLength: number;
}

export interface PrivacySettings {
  profileVisibility: Record<string, boolean>;
  showPhoneToRoles: string[];
  showEmailToRoles: string[];
  showBirthYearToRoles: string[];
  showAgeForLiving: boolean;
  showOccupation: boolean;
  showCity: boolean;
  showBiography: boolean;
  showPhotosToRoles: string[];
  showDeathYear: boolean;
  showFullDeathDate: boolean;
}
