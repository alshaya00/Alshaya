// آل شايع Family Tree - Type Definitions

// ============================================
// CORE TYPES
// ============================================

export interface FamilyMember {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string;
  fatherId: string | null;
  gender: 'Male' | 'Female';
  birthYear: number | null;
  deathYear?: number | null;
  sonsCount: number;
  daughtersCount: number;
  generation: number;
  branch: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  photoUrl: string | null;
  biography: string | null;
  occupation: string | null;
  email: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string | null;
  lastModifiedBy?: string | null;
  version?: number;
}

export interface TreeNode extends FamilyMember {
  children: TreeNode[];
  expanded?: boolean;
  level?: number;
}

// ============================================
// CHANGE HISTORY & AUDIT
// ============================================

export interface ChangeHistory {
  id: string;
  memberId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changeType: ChangeType;
  changedBy: string;
  changedByName: string;
  changedAt: Date;
  batchId?: string | null;
  fullSnapshot?: string | null;
  reason?: string | null;
  ipAddress?: string | null;
}

export type ChangeType = 'CREATE' | 'UPDATE' | 'DELETE' | 'PARENT_CHANGE' | 'RESTORE';

export interface Snapshot {
  id: string;
  name: string;
  description?: string | null;
  treeData: string;
  memberCount: number;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  snapshotType: SnapshotType;
}

export type SnapshotType = 'MANUAL' | 'AUTO_BACKUP' | 'PRE_IMPORT';

// ============================================
// DUPLICATE DETECTION
// ============================================

export interface DuplicateFlag {
  id: string;
  sourceMemberId: string;
  sourceMember?: FamilyMember;
  targetMemberId: string;
  targetMember?: FamilyMember;
  matchScore: number;
  matchReasons: string[];
  status: DuplicateStatus;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  resolution?: string | null;
  detectedAt: Date;
  detectedBy: string;
}

export type DuplicateStatus = 'PENDING' | 'CONFIRMED_DUPLICATE' | 'NOT_DUPLICATE' | 'MERGED';

// ============================================
// ADMIN & PERMISSIONS
// ============================================

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
}

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export type Permission =
  | 'VIEW_MEMBERS'
  | 'ADD_MEMBERS'
  | 'EDIT_MEMBERS'
  | 'DELETE_MEMBERS'
  | 'CHANGE_PARENT'
  | 'EXPORT_DATA'
  | 'IMPORT_DATA'
  | 'MANAGE_DUPLICATES'
  | 'VIEW_HISTORY'
  | 'ROLLBACK_CHANGES'
  | 'CREATE_SNAPSHOTS'
  | 'MANAGE_ADMINS'
  | 'APPROVE_PENDING';

export interface AdminSession {
  id: string;
  adminId: string;
  admin?: Admin;
  token: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  lastActivityAt: Date;
}

// ============================================
// IMPORT/EXPORT
// ============================================

export interface ImportJob {
  id: string;
  fileName: string;
  fileType: 'JSON' | 'CSV' | 'EXCEL';
  totalRecords: number;
  status: ImportStatus;
  processedCount: number;
  successCount: number;
  errorCount: number;
  conflictCount: number;
  conflicts?: ImportConflict[];
  conflictResolutions?: ConflictResolution[];
  importedIds?: string[];
  errorLog?: ImportError[];
  importedBy: string;
  importedByName: string;
  startedAt: Date;
  completedAt?: Date | null;
  snapshotId?: string | null;
}

export type ImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface ImportConflict {
  rowNumber: number;
  existingMemberId: string;
  existingMember: FamilyMember;
  importedData: Partial<FamilyMember>;
  conflictType: ConflictType;
  fieldConflicts: FieldConflict[];
}

export type ConflictType = 'DUPLICATE_ID' | 'DUPLICATE_NAME' | 'PARENT_MISMATCH' | 'DATA_CONFLICT';

export interface FieldConflict {
  field: string;
  existingValue: unknown;
  importedValue: unknown;
}

export interface ConflictResolution {
  conflictIndex: number;
  action: 'KEEP_EXISTING' | 'USE_IMPORTED' | 'MERGE' | 'SKIP';
  mergedFields?: string[];
}

export interface ImportError {
  rowNumber: number;
  field?: string;
  error: string;
  rawData?: string;
}

export interface ExportJob {
  id: string;
  format: ExportFormat;
  fileName: string;
  memberCount: number;
  fieldsIncluded: string[];
  filters?: ExportFilters;
  exportedBy: string;
  exportedByName: string;
  exportedAt: Date;
  fileSize?: number | null;
  downloadUrl?: string | null;
}

export type ExportFormat = 'JSON' | 'CSV' | 'EXCEL' | 'PDF';

export interface ExportFilters {
  generations?: number[];
  branches?: string[];
  genders?: string[];
  status?: string[];
  searchQuery?: string;
}

export interface ExportOptions {
  format: ExportFormat;
  fields: ExportField[];
  includeTree?: boolean;
  groupByGeneration?: boolean;
  filters?: ExportFilters;
}

export interface ExportField {
  key: keyof FamilyMember;
  label: string;
  labelAr: string;
  selected: boolean;
  category: 'identity' | 'family' | 'personal' | 'contact' | 'meta';
}

// ============================================
// PENDING MEMBERS
// ============================================

export interface PendingMember {
  id: string;
  firstName: string;
  fatherName?: string | null;
  grandfatherName?: string | null;
  greatGrandfatherName?: string | null;
  familyName: string;
  proposedFatherId?: string | null;
  gender: 'Male' | 'Female';
  birthYear?: number | null;
  generation: number;
  branch?: string | null;
  fullNameAr?: string | null;
  fullNameEn?: string | null;
  phone?: string | null;
  city?: string | null;
  status: string;
  occupation?: string | null;
  email?: string | null;
  submittedVia?: string | null;
  submittedAt: Date;
  reviewStatus: ReviewStatus;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  approvedMemberId?: string | null;
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ============================================
// BRANCH ENTRY
// ============================================

export interface BranchEntryLink {
  id: string;
  token: string;
  branchName: string;
  branchHeadId: string;
  branchHeadName: string;
  isActive: boolean;
  expiresAt?: Date | null;
  maxUses?: number | null;
  useCount: number;
  createdBy: string;
  createdAt: Date;
}

// ============================================
// EDIT OPERATIONS
// ============================================

export interface EditOperation {
  memberId: string;
  changes: Partial<FamilyMember>;
  reason?: string;
}

export interface BatchEditOperation {
  operations: EditOperation[];
  batchId: string;
  reason?: string;
}

export interface ParentChangeOperation {
  memberId: string;
  oldParentId: string | null;
  newParentId: string | null;
  reason?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================
// TREE OPERATIONS
// ============================================

export interface DragDropOperation {
  nodeId: string;
  oldParentId: string | null;
  newParentId: string | null;
  position?: number;
}

export interface TreeValidation {
  valid: boolean;
  wouldCreateCycle: boolean;
  generationChange: number;
  affectedMembers: string[];
  errors: string[];
}
