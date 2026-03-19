// ============================================
// Backup Types - Consolidated
// ============================================

// --- Client-side types (used by UI components) ---

export interface BackupConfig {
  enabled: boolean;
  intervalHours: number;
  maxBackups: number;
  lastBackupTime: string | null;
  nextBackupTime: string | null;
}

export interface BackupEntry {
  id: string;
  name: string;
  description: string | null;
  type: 'MANUAL' | 'AUTO' | 'PRE_IMPORT' | 'PRE_RESTORE';
  createdAt: string;
  createdBy: string;
  createdByName: string;
  memberCount: number;
  dataSize: number;
  data?: string;
  checksum?: string;
}

// --- Server-side types (used by backup-service / providers) ---

export interface BackupData {
  version: string;
  createdAt: string;
  totalMembers: number;
  members: MemberBackup[];
  checksum: string;
}

export interface MemberBackup {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string | null;
  fatherId: string | null;
  gender: string;
  birthYear: number | null;
  deathYear: number | null;
  sonsCount: number;
  daughtersCount: number;
  generation: number;
  branch: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  lineageBranchId: string | null;
  lineageBranchName: string | null;
  subBranchId: string | null;
  subBranchName: string | null;
  lineagePath: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  photoUrl: string | null;
  biography: string | null;
  occupation: string | null;
  email: string | null;
  version: number;
  deletedAt: string | null;
  deletedBy: string | null;
  deletedReason: string | null;
}

export interface RestoreResult {
  success: boolean;
  restoredCount: number;
  expectedCount: number;
  errors: string[];
  preRestoreSnapshotId?: string;
}

// --- Scheduler types ---

export interface SchedulerConfig {
  enabled: boolean;
  intervalHours: number;
  maxBackups: number;
  retentionDays: number;
}

// --- Service types (used by services/backup.ts) ---

export interface ServiceBackupConfig {
  enabled: boolean;
  schedule: string;
  retentionDays: number;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notifyEmail?: string;
}

export interface BackupResult {
  success: boolean;
  snapshotId?: string;
  snapshotName?: string;
  memberCount?: number;
  duration?: number;
  error?: string;
  verified?: boolean;
  expectedCount?: number;
  actualCount?: number;
  backupSize?: number;
  sizeWarning?: string;
  sizeWarningAr?: string;
}

// --- Notification types ---

export interface BackupNotificationData {
  success: boolean;
  destination: 'GitHub' | 'Google Drive' | 'Google Sheets' | 'Local';
  memberCount?: number;
  url?: string;
  error?: string;
}

// --- Provider result types ---

export interface GitHubBackupResult {
  success: boolean;
  commitSha?: string;
  repoUrl?: string;
  memberCount?: number;
  error?: string;
}

export interface DriveExportResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  memberCount?: number;
  webViewLink?: string;
  error?: string;
}

export interface SheetsExportResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  sheetTitle?: string;
  memberCount?: number;
  error?: string;
}

// --- Common provider interface ---

export interface BackupProvider {
  isConnected(): Promise<boolean>;
}
