// Constants Configuration for Al-Shaye Family Tree
// Centralized magic numbers, icons, and static values

// ============================================
// FAMILY INFORMATION
// ============================================

export const familyInfo = {
  nameAr: 'آل شايع',
  nameEn: 'Al-Shaye',
  fullNameAr: 'شجرة عائلة آل شايع',
  fullNameEn: 'Al-Shaye Family Tree',
  taglineAr: 'نحفظ إرثنا، نربط أجيالنا',
  taglineEn: 'Preserving Our Legacy, Connecting Generations',
  foundingYear: 1600, // Approximate founding year
};

// ============================================
// GENERATION SETTINGS
// ============================================

export const generationSettings = {
  maxGenerations: 12,
  icons: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'] as const,
  labels: {
    ar: ['الجيل الأول', 'الجيل الثاني', 'الجيل الثالث', 'الجيل الرابع', 'الجيل الخامس', 'الجيل السادس', 'الجيل السابع', 'الجيل الثامن', 'الجيل التاسع', 'الجيل العاشر', 'الجيل الحادي عشر', 'الجيل الثاني عشر'],
    en: ['1st Generation', '2nd Generation', '3rd Generation', '4th Generation', '5th Generation', '6th Generation', '7th Generation', '8th Generation', '9th Generation', '10th Generation', '11th Generation', '12th Generation'],
  },
};

// ============================================
// DATABASE & CACHING
// ============================================

export const dbSettings = {
  checkInterval: 30000, // 30 seconds - how often to check DB availability
  idPrefix: 'P',        // Member ID prefix (P001, P002, etc.)
  idPadding: 3,         // Number of digits in ID (001, 002, etc.)
};

// ============================================
// PAGINATION & LIMITS
// ============================================

export const paginationSettings = {
  // Default items per page for different views
  auditLogItemsPerPage: 50,
  membersPerPage: 25,
  searchResultsLimit: 100,

  // API fetch limits
  defaultFetchLimit: 500,
  maxFetchLimit: 1000,

  // Activity log limits
  maxActivityLogs: 10000,
  maxAuditEntries: 10000,
};

// ============================================
// BACKUP CONFIGURATION
// ============================================

export const backupSettings = {
  // Default backup interval (24 hours)
  defaultIntervalHours: 24,

  // Maximum number of backups to keep
  maxBackups: 10,

  // Backup scheduler settings
  schedule: '0 3 * * *', // Daily at 3 AM
  retentionDays: 30,
  timezone: 'Asia/Riyadh',

  // Audit log retention
  auditLogRetentionDays: 90,
};

// ============================================
// SECURITY SETTINGS
// ============================================

export const securitySettings = {
  minSecretLength: 32,
  minPasswordLength: 8,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  sessionDurationDays: 7,
  rememberMeDurationDays: 30,
};

// ============================================
// FILE SIZE FORMATTING
// ============================================

export const fileSizeUnits = ['B', 'KB', 'MB', 'GB'] as const;
export const fileSizeBase = 1024;

/**
 * Format bytes to human-readable string
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = fileSizeBase;
  const dm = decimals < 0 ? 0 : decimals;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${fileSizeUnits[i]}`;
}

// ============================================
// GENDER OPTIONS
// ============================================

export const genderOptions = {
  male: { value: 'Male', labelAr: 'ذكر', labelEn: 'Male' },
  female: { value: 'Female', labelAr: 'أنثى', labelEn: 'Female' },
} as const;

// ============================================
// STATUS OPTIONS
// ============================================

export const statusOptions = {
  living: { value: 'Living', labelAr: 'حي', labelEn: 'Living' },
  deceased: { value: 'Deceased', labelAr: 'متوفى', labelEn: 'Deceased' },
} as const;

// ============================================
// RELATIONSHIP TYPES (for registration)
// ============================================

export const relationshipTypes = [
  { value: 'CHILD', labelAr: 'ابن/ابنة', labelEn: 'Child' },
  { value: 'SPOUSE', labelAr: 'زوج/زوجة', labelEn: 'Spouse' },
  { value: 'SIBLING', labelAr: 'أخ/أخت', labelEn: 'Sibling' },
  { value: 'GRANDCHILD', labelAr: 'حفيد/حفيدة', labelEn: 'Grandchild' },
  { value: 'OTHER', labelAr: 'أخرى', labelEn: 'Other' },
] as const;

// ============================================
// IMAGE CATEGORIES
// ============================================

export const imageCategories = [
  { value: 'profile', labelAr: 'صورة شخصية', labelEn: 'Profile Picture', descriptionAr: 'صورة البروفايل للعضو', descriptionEn: 'Member profile picture' },
  { value: 'memory', labelAr: 'ذكرى', labelEn: 'Memory', descriptionAr: 'لحظات ومناسبات عائلية', descriptionEn: 'Family moments and occasions' },
  { value: 'document', labelAr: 'وثيقة', labelEn: 'Document', descriptionAr: 'شهادات وأوراق رسمية', descriptionEn: 'Certificates and official documents' },
  { value: 'historical', labelAr: 'تاريخية', labelEn: 'Historical', descriptionAr: 'صور قديمة ونادرة', descriptionEn: 'Old and rare photos' },
] as const;

// ============================================
// SERVICE PROVIDERS
// ============================================

export const emailProviders = [
  { value: 'none', labelAr: 'غير مفعل', labelEn: 'Not Configured' },
  { value: 'resend', labelAr: 'Resend', labelEn: 'Resend' },
  { value: 'sendgrid', labelAr: 'SendGrid', labelEn: 'SendGrid' },
  { value: 'mailgun', labelAr: 'Mailgun', labelEn: 'Mailgun' },
  { value: 'smtp', labelAr: 'SMTP مخصص', labelEn: 'Custom SMTP' },
] as const;

export const otpProviders = [
  { value: 'none', labelAr: 'غير مفعل', labelEn: 'Not Configured' },
  { value: 'twilio', labelAr: 'Twilio', labelEn: 'Twilio' },
  { value: 'vonage', labelAr: 'Vonage (Nexmo)', labelEn: 'Vonage (Nexmo)' },
  { value: 'messagebird', labelAr: 'MessageBird', labelEn: 'MessageBird' },
] as const;

// ============================================
// JOURNAL CATEGORIES
// ============================================

export const journalCategories = [
  { key: 'ORAL_HISTORY', nameAr: 'الروايات الشفهية', nameEn: 'Oral History', icon: '📜' },
  { key: 'MIGRATION', nameAr: 'قصص الهجرة', nameEn: 'Migration Stories', icon: '🐪' },
  { key: 'MEMORY', nameAr: 'ذكريات', nameEn: 'Memories', icon: '💭' },
  { key: 'POEM', nameAr: 'شعر', nameEn: 'Poetry', icon: '📝' },
  { key: 'GENEALOGY', nameAr: 'أنساب', nameEn: 'Genealogy', icon: '🌳' },
] as const;

// ============================================
// EXPORT FORMATS
// ============================================

export const exportFormats = [
  { value: 'json', label: 'JSON', description: 'Machine-readable format' },
  { value: 'csv', label: 'CSV', description: 'Spreadsheet compatible' },
  { value: 'excel', label: 'Excel', description: 'Microsoft Excel format' },
  { value: 'pdf', label: 'PDF', description: 'Printable document' },
  { value: 'html', label: 'HTML', description: 'Web page format' },
] as const;

// ============================================
// QUICK ACTIONS (Home page)
// ============================================

export const quickActions = [
  {
    href: '/tree',
    titleAr: 'شجرة العائلة',
    titleEn: 'Family Tree',
    descAr: 'استعرض الشجرة التفاعلية',
    descEn: 'Browse the interactive tree',
    icon: 'TreePine',
    color: 'emerald',
  },
  {
    href: '/registry',
    titleAr: 'سجل الأعضاء',
    titleEn: 'Member Registry',
    descAr: 'قائمة أفراد العائلة',
    descEn: 'List of family members',
    icon: 'Users',
    color: 'blue',
  },
  {
    href: '/quick-add',
    titleAr: 'إضافة عضو',
    titleEn: 'Add Member',
    descAr: 'أضف فرداً جديداً',
    descEn: 'Add a new member',
    icon: 'PlusCircle',
    color: 'amber',
  },
  {
    href: '/dashboard',
    titleAr: 'الإحصائيات',
    titleEn: 'Statistics',
    descAr: 'إحصائيات العائلة',
    descEn: 'Family statistics',
    icon: 'BarChart3',
    color: 'purple',
  },
] as const;

// ============================================
// TOOL LINKS (Home page)
// ============================================

export const toolLinks = [
  { href: '/search', labelAr: 'البحث', labelEn: 'Search', icon: 'Search' },
  { href: '/tree-editor', labelAr: 'المحرر', labelEn: 'Editor', icon: 'Edit' },
  { href: '/export', labelAr: 'تصدير', labelEn: 'Export', icon: 'Download' },
  { href: '/import', labelAr: 'استيراد', labelEn: 'Import', icon: 'Upload' },
  { href: '/duplicates', labelAr: 'التكرارات', labelEn: 'Duplicates', icon: 'Copy' },
  { href: '/history', labelAr: 'السجل', labelEn: 'History', icon: 'History' },
  { href: '/admin', labelAr: 'الإدارة', labelEn: 'Admin', icon: 'Settings' },
] as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate next member ID
 */
export function generateNextId(currentMaxId: number): string {
  const nextNum = currentMaxId + 1;
  return `${dbSettings.idPrefix}${String(nextNum).padStart(dbSettings.idPadding, '0')}`;
}

/**
 * Parse member ID to number
 */
export function parseIdNumber(id: string): number {
  return parseInt(id.replace(dbSettings.idPrefix, ''), 10);
}

/**
 * Get generation icon by number
 */
export function getGenerationIcon(generation: number): string {
  return generationSettings.icons[generation - 1] || '⓿';
}

/**
 * Calculate years of history from founding year
 */
export function calculateYearsOfHistory(): number {
  return new Date().getFullYear() - familyInfo.foundingYear;
}
