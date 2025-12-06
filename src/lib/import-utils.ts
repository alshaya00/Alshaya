// آل شايع Family Tree - Import & Merge Utilities

import { FamilyMember, ImportConflict, FieldConflict, ValidationResult, ValidationError } from './types';

// ============================================
// VALIDATION
// ============================================

export function validateMember(member: Partial<FamilyMember>, existingMembers: FamilyMember[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: { field: string; message: string; suggestion?: string }[] = [];

  // Required fields
  if (!member.id) {
    errors.push({ field: 'id', message: 'الرقم التعريفي مطلوب', code: 'REQUIRED' });
  } else if (!/^P\d{3,}$/.test(member.id)) {
    errors.push({ field: 'id', message: 'صيغة الرقم غير صحيحة (مثال: P001)', code: 'INVALID_FORMAT' });
  }

  if (!member.firstName) {
    errors.push({ field: 'firstName', message: 'الاسم الأول مطلوب', code: 'REQUIRED' });
  }

  if (!member.gender || !['Male', 'Female'].includes(member.gender)) {
    errors.push({ field: 'gender', message: 'الجنس مطلوب (Male أو Female)', code: 'INVALID_VALUE' });
  }

  // Father validation
  if (member.fatherId) {
    const father = existingMembers.find(m => m.id === member.fatherId);
    if (!father) {
      warnings.push({
        field: 'fatherId',
        message: `الأب ${member.fatherId} غير موجود`,
        suggestion: 'سيتم إنشاء كعضو مستقل'
      });
    } else if (father.gender !== 'Male') {
      errors.push({ field: 'fatherId', message: 'الأب يجب أن يكون ذكر', code: 'INVALID_PARENT' });
    }
  }

  // Birth year validation
  if (member.birthYear) {
    if (member.birthYear < 1400 || member.birthYear > new Date().getFullYear()) {
      warnings.push({
        field: 'birthYear',
        message: `سنة الميلاد ${member.birthYear} قد تكون غير صحيحة`
      });
    }
  }

  // Status validation
  if (member.status && !['Living', 'Deceased'].includes(member.status)) {
    errors.push({ field: 'status', message: 'الحالة يجب أن تكون Living أو Deceased', code: 'INVALID_VALUE' });
  }

  // Generation validation
  if (member.generation && (member.generation < 1 || member.generation > 20)) {
    errors.push({ field: 'generation', message: 'الجيل يجب أن يكون بين 1 و 20', code: 'OUT_OF_RANGE' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================
// DUPLICATE DETECTION
// ============================================

export interface DuplicateMatch {
  existingMember: FamilyMember;
  score: number;
  reasons: string[];
}

export function findDuplicates(
  newMember: Partial<FamilyMember>,
  existingMembers: FamilyMember[],
  threshold: number = 70
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  for (const existing of existingMembers) {
    let score = 0;
    const reasons: string[] = [];

    // Exact ID match (highest priority)
    if (newMember.id && newMember.id === existing.id) {
      score += 100;
      reasons.push('نفس الرقم التعريفي');
    }

    // Name matching
    if (newMember.firstName && existing.firstName) {
      if (newMember.firstName === existing.firstName) {
        score += 30;
        reasons.push('نفس الاسم الأول');
      } else if (normalizeArabic(newMember.firstName) === normalizeArabic(existing.firstName)) {
        score += 25;
        reasons.push('الاسم الأول متشابه');
      }
    }

    // Father matching
    if (newMember.fatherId && newMember.fatherId === existing.fatherId) {
      score += 25;
      reasons.push('نفس الأب');
    } else if (newMember.fatherName && existing.fatherName) {
      if (normalizeArabic(newMember.fatherName) === normalizeArabic(existing.fatherName)) {
        score += 20;
        reasons.push('نفس اسم الأب');
      }
    }

    // Birth year matching
    if (newMember.birthYear && existing.birthYear) {
      if (newMember.birthYear === existing.birthYear) {
        score += 15;
        reasons.push('نفس سنة الميلاد');
      } else if (Math.abs(newMember.birthYear - existing.birthYear) <= 2) {
        score += 10;
        reasons.push('سنة الميلاد قريبة');
      }
    }

    // Gender matching
    if (newMember.gender && newMember.gender === existing.gender) {
      score += 5;
    }

    // Phone matching
    if (newMember.phone && existing.phone) {
      if (normalizePhone(newMember.phone) === normalizePhone(existing.phone)) {
        score += 20;
        reasons.push('نفس رقم الهاتف');
      }
    }

    // Email matching
    if (newMember.email && existing.email) {
      if (newMember.email.toLowerCase() === existing.email.toLowerCase()) {
        score += 20;
        reasons.push('نفس البريد الإلكتروني');
      }
    }

    // Cap score at 100
    score = Math.min(score, 100);

    if (score >= threshold) {
      matches.push({ existingMember: existing, score, reasons });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

// ============================================
// CONFLICT DETECTION
// ============================================

export function detectConflicts(
  importedMember: Partial<FamilyMember>,
  existingMember: FamilyMember
): FieldConflict[] {
  const conflicts: FieldConflict[] = [];
  const fieldsToCheck: (keyof FamilyMember)[] = [
    'firstName', 'fatherName', 'grandfatherName', 'greatGrandfatherName',
    'familyName', 'fatherId', 'gender', 'birthYear', 'deathYear',
    'sonsCount', 'daughtersCount', 'generation', 'branch',
    'fullNameAr', 'fullNameEn', 'phone', 'city', 'status',
    'photoUrl', 'biography', 'occupation', 'email'
  ];

  for (const field of fieldsToCheck) {
    const importedValue = importedMember[field];
    const existingValue = existingMember[field];

    // Skip if imported value is null/undefined
    if (importedValue === null || importedValue === undefined) continue;

    // Detect conflict if values differ
    if (importedValue !== existingValue) {
      conflicts.push({
        field,
        existingValue,
        importedValue
      });
    }
  }

  return conflicts;
}

// ============================================
// PARSING
// ============================================

export function parseJSON(content: string): { members: Partial<FamilyMember>[]; error?: string } {
  try {
    const data = JSON.parse(content);

    // Handle different JSON formats
    if (Array.isArray(data)) {
      return { members: data };
    }

    if (data.members && Array.isArray(data.members)) {
      return { members: data.members };
    }

    if (data.tree && Array.isArray(data.tree)) {
      // Flatten hierarchical tree
      const members: Partial<FamilyMember>[] = [];
      const flatten = (nodes: any[]) => {
        for (const node of nodes) {
          const { children, ...member } = node;
          members.push(member);
          if (children && Array.isArray(children)) {
            flatten(children);
          }
        }
      };
      flatten(data.tree);
      return { members };
    }

    if (data.generations && Array.isArray(data.generations)) {
      // Flatten generation-grouped data
      const members: Partial<FamilyMember>[] = [];
      for (const gen of data.generations) {
        if (gen.members && Array.isArray(gen.members)) {
          members.push(...gen.members);
        }
      }
      return { members };
    }

    return { members: [], error: 'صيغة JSON غير معروفة' };
  } catch (e) {
    return { members: [], error: 'خطأ في تحليل JSON: ' + (e as Error).message };
  }
}

export function parseCSV(content: string): { members: Partial<FamilyMember>[]; error?: string } {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return { members: [], error: 'الملف فارغ أو لا يحتوي على بيانات' };
    }

    // Skip comment lines and get header
    let headerIndex = 0;
    while (headerIndex < lines.length && lines[headerIndex].startsWith('#')) {
      headerIndex++;
    }

    if (headerIndex >= lines.length) {
      return { members: [], error: 'لا يوجد رأس للجدول' };
    }

    const header = parseCSVLine(lines[headerIndex]);
    const fieldMap = mapCSVHeaders(header);

    const members: Partial<FamilyMember>[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      const values = parseCSVLine(line);
      const member: Partial<FamilyMember> = {};

      for (let j = 0; j < values.length; j++) {
        const field = fieldMap[j];
        if (field && values[j]) {
          (member as any)[field] = convertValue(field, values[j]);
        }
      }

      if (Object.keys(member).length > 0) {
        members.push(member);
      }
    }

    return { members };
  } catch (e) {
    return { members: [], error: 'خطأ في تحليل CSV: ' + (e as Error).message };
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function mapCSVHeaders(headers: string[]): (keyof FamilyMember | null)[] {
  const headerMap: Record<string, keyof FamilyMember> = {
    // Arabic headers
    'الرقم': 'id',
    'الاسم الأول': 'firstName',
    'اسم الأب': 'fatherName',
    'اسم الجد': 'grandfatherName',
    'اسم الجد الثاني': 'greatGrandfatherName',
    'اسم العائلة': 'familyName',
    'رقم الأب': 'fatherId',
    'الجنس': 'gender',
    'سنة الميلاد': 'birthYear',
    'سنة الوفاة': 'deathYear',
    'عدد الأبناء': 'sonsCount',
    'عدد البنات': 'daughtersCount',
    'الجيل': 'generation',
    'الفرع': 'branch',
    'الاسم الكامل': 'fullNameAr',
    'الاسم بالإنجليزية': 'fullNameEn',
    'الهاتف': 'phone',
    'المدينة': 'city',
    'الحالة': 'status',
    'المهنة': 'occupation',
    'البريد': 'email',
    // English headers
    'ID': 'id',
    'First Name': 'firstName',
    'Father Name': 'fatherName',
    'Grandfather Name': 'grandfatherName',
    'Great Grandfather': 'greatGrandfatherName',
    'Family Name': 'familyName',
    'Father ID': 'fatherId',
    'Gender': 'gender',
    'Birth Year': 'birthYear',
    'Death Year': 'deathYear',
    'Sons Count': 'sonsCount',
    'Daughters Count': 'daughtersCount',
    'Generation': 'generation',
    'Branch': 'branch',
    'Full Name (Arabic)': 'fullNameAr',
    'Full Name (English)': 'fullNameEn',
    'Phone': 'phone',
    'City': 'city',
    'Status': 'status',
    'Occupation': 'occupation',
    'Email': 'email',
  };

  return headers.map(h => headerMap[h.trim()] || null);
}

function convertValue(field: keyof FamilyMember, value: string): any {
  const numericFields = ['birthYear', 'deathYear', 'sonsCount', 'daughtersCount', 'generation'];

  if (numericFields.includes(field)) {
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }

  // Convert Arabic gender to English
  if (field === 'gender') {
    if (value === 'ذكر' || value.toLowerCase() === 'male') return 'Male';
    if (value === 'أنثى' || value.toLowerCase() === 'female') return 'Female';
    return value;
  }

  // Convert Arabic status to English
  if (field === 'status') {
    if (value === 'على قيد الحياة' || value.toLowerCase() === 'living') return 'Living';
    if (value === 'متوفى' || value.toLowerCase() === 'deceased') return 'Deceased';
    return value;
  }

  return value;
}

// ============================================
// HELPERS
// ============================================

function normalizeArabic(str: string): string {
  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

// ============================================
// MERGE LOGIC
// ============================================

export type MergeStrategy = 'KEEP_EXISTING' | 'USE_IMPORTED' | 'MERGE_PREFER_EXISTING' | 'MERGE_PREFER_IMPORTED';

export function mergeMembers(
  existing: FamilyMember,
  imported: Partial<FamilyMember>,
  strategy: MergeStrategy
): FamilyMember {
  switch (strategy) {
    case 'KEEP_EXISTING':
      return existing;

    case 'USE_IMPORTED':
      return {
        ...existing,
        ...imported,
        id: existing.id, // Keep original ID
        createdAt: existing.createdAt, // Keep creation date
      } as FamilyMember;

    case 'MERGE_PREFER_EXISTING':
      return {
        ...imported,
        ...existing,
      } as FamilyMember;

    case 'MERGE_PREFER_IMPORTED':
      const merged = { ...existing };
      for (const key of Object.keys(imported) as (keyof FamilyMember)[]) {
        const importedValue = imported[key];
        if (importedValue !== null && importedValue !== undefined && importedValue !== '') {
          (merged as any)[key] = importedValue;
        }
      }
      return merged;

    default:
      return existing;
  }
}

// ============================================
// IMPORT RESULT
// ============================================

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; error: string }[];
  conflicts: ImportConflict[];
}

export function prepareImport(
  importedMembers: Partial<FamilyMember>[],
  existingMembers: FamilyMember[]
): {
  newMembers: Partial<FamilyMember>[];
  conflicts: ImportConflict[];
  errors: { row: number; member: Partial<FamilyMember>; errors: ValidationError[] }[];
} {
  const newMembers: Partial<FamilyMember>[] = [];
  const conflicts: ImportConflict[] = [];
  const errors: { row: number; member: Partial<FamilyMember>; errors: ValidationError[] }[] = [];

  for (let i = 0; i < importedMembers.length; i++) {
    const member = importedMembers[i];

    // Validate
    const validation = validateMember(member, existingMembers);
    if (!validation.valid) {
      errors.push({ row: i + 1, member, errors: validation.errors });
      continue;
    }

    // Check for duplicates/conflicts
    const duplicates = findDuplicates(member, existingMembers);

    if (duplicates.length > 0) {
      const bestMatch = duplicates[0];

      if (bestMatch.score === 100 || (member.id && bestMatch.existingMember.id === member.id)) {
        // Exact match - this is a conflict
        const fieldConflicts = detectConflicts(member, bestMatch.existingMember);

        if (fieldConflicts.length > 0) {
          conflicts.push({
            rowNumber: i + 1,
            existingMemberId: bestMatch.existingMember.id,
            existingMember: bestMatch.existingMember,
            importedData: member,
            conflictType: 'DUPLICATE_ID',
            fieldConflicts
          });
        }
      } else if (bestMatch.score >= 80) {
        // High probability duplicate
        conflicts.push({
          rowNumber: i + 1,
          existingMemberId: bestMatch.existingMember.id,
          existingMember: bestMatch.existingMember,
          importedData: member,
          conflictType: 'DUPLICATE_NAME',
          fieldConflicts: detectConflicts(member, bestMatch.existingMember)
        });
      } else {
        // Lower match, treat as new member
        newMembers.push(member);
      }
    } else {
      // No duplicates, new member
      newMembers.push(member);
    }
  }

  return { newMembers, conflicts, errors };
}
