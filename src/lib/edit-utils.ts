// آل شايع Family Tree - Edit Utilities

import { FamilyMember, ChangeHistory, ValidationResult, ValidationError, TreeValidation } from './types';
import { isMale } from './utils';

// ============================================
// VALIDATION
// ============================================

export function validateEdit(
  memberId: string,
  changes: Partial<FamilyMember>,
  allMembers: FamilyMember[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: { field: string; message: string; suggestion?: string }[] = [];
  const member = allMembers.find(m => m.id === memberId);

  if (!member) {
    errors.push({ field: 'id', message: 'العضو غير موجود', code: 'NOT_FOUND' });
    return { valid: false, errors, warnings };
  }

  // Validate first name
  if (changes.firstName !== undefined) {
    if (!changes.firstName || changes.firstName.trim() === '') {
      errors.push({ field: 'firstName', message: 'الاسم الأول مطلوب', code: 'REQUIRED' });
    }
  }

  // Validate gender
  if (changes.gender !== undefined) {
    if (!['Male', 'Female'].includes(changes.gender)) {
      errors.push({ field: 'gender', message: 'الجنس يجب أن يكون Male أو Female', code: 'INVALID_VALUE' });
    }
  }

  // Validate birth year
  if (changes.birthYear !== undefined && changes.birthYear !== null) {
    const currentYear = new Date().getFullYear();
    if (changes.birthYear < 1400 || changes.birthYear > currentYear) {
      warnings.push({
        field: 'birthYear',
        message: `سنة الميلاد ${changes.birthYear} غير عادية`,
        suggestion: 'تأكد من صحة السنة'
      });
    }

    // Check against parent's birth year
    const fatherId = changes.fatherId ?? member.fatherId;
    if (fatherId) {
      const father = allMembers.find(m => m.id === fatherId);
      if (father?.birthYear && changes.birthYear <= father.birthYear) {
        errors.push({
          field: 'birthYear',
          message: 'سنة الميلاد يجب أن تكون بعد سنة ميلاد الأب',
          code: 'INVALID_BIRTH_ORDER'
        });
      }
    }

    // Check against children's birth years
    const children = allMembers.filter(m => m.fatherId === memberId);
    for (const child of children) {
      if (child.birthYear && changes.birthYear >= child.birthYear) {
        errors.push({
          field: 'birthYear',
          message: `سنة الميلاد يجب أن تكون قبل سنة ميلاد ${child.firstName}`,
          code: 'INVALID_BIRTH_ORDER'
        });
      }
    }
  }

  // Validate death year
  if (changes.deathYear !== undefined && changes.deathYear !== null) {
    const birthYear = changes.birthYear ?? member.birthYear;
    if (birthYear && changes.deathYear < birthYear) {
      errors.push({
        field: 'deathYear',
        message: 'سنة الوفاة يجب أن تكون بعد سنة الميلاد',
        code: 'INVALID_DEATH_ORDER'
      });
    }

    if (changes.status === 'Living' || (!changes.status && member.status === 'Living')) {
      warnings.push({
        field: 'deathYear',
        message: 'تم تحديد سنة وفاة لكن الحالة "حي"',
        suggestion: 'قم بتغيير الحالة إلى "متوفى"'
      });
    }
  }

  // Validate status
  if (changes.status !== undefined) {
    if (!['Living', 'Deceased'].includes(changes.status)) {
      errors.push({ field: 'status', message: 'الحالة غير صالحة', code: 'INVALID_VALUE' });
    }
  }

  // Validate email
  if (changes.email !== undefined && changes.email !== null && changes.email !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(changes.email)) {
      errors.push({ field: 'email', message: 'صيغة البريد الإلكتروني غير صحيحة', code: 'INVALID_FORMAT' });
    }
  }

  // Validate phone
  if (changes.phone !== undefined && changes.phone !== null && changes.phone !== '') {
    // Allow various phone formats
    const phoneClean = changes.phone.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?\d{8,15}$/.test(phoneClean)) {
      warnings.push({
        field: 'phone',
        message: 'صيغة الهاتف قد تكون غير صحيحة',
        suggestion: 'تأكد من رقم الهاتف'
      });
    }
  }

  // Validate generation
  if (changes.generation !== undefined) {
    if (changes.generation < 1 || changes.generation > 20) {
      errors.push({ field: 'generation', message: 'الجيل يجب أن يكون بين 1 و 20', code: 'OUT_OF_RANGE' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================
// PARENT CHANGE VALIDATION
// ============================================

export function validateParentChange(
  memberId: string,
  newParentId: string | null,
  allMembers: FamilyMember[]
): TreeValidation {
  const member = allMembers.find(m => m.id === memberId);
  const errors: string[] = [];

  if (!member) {
    return {
      valid: false,
      wouldCreateCycle: false,
      generationChange: 0,
      affectedMembers: [],
      errors: ['العضو غير موجود']
    };
  }

  // Check for self-reference
  if (newParentId === memberId) {
    return {
      valid: false,
      wouldCreateCycle: true,
      generationChange: 0,
      affectedMembers: [memberId],
      errors: ['لا يمكن أن يكون العضو أباً لنفسه']
    };
  }

  // Check for cycle (would the member become an ancestor of itself?)
  if (newParentId) {
    const wouldCreateCycle = isDescendant(newParentId, memberId, allMembers);
    if (wouldCreateCycle) {
      return {
        valid: false,
        wouldCreateCycle: true,
        generationChange: 0,
        affectedMembers: [],
        errors: ['هذا التغيير سيخلق دورة في الشجرة']
      };
    }

    // Validate parent is male
    const newParent = allMembers.find(m => m.id === newParentId);
    if (newParent && !isMale(newParent.gender)) {
      return {
        valid: false,
        wouldCreateCycle: false,
        generationChange: 0,
        affectedMembers: [],
        errors: ['الأب يجب أن يكون ذكراً']
      };
    }

    // Validate birth order
    if (newParent?.birthYear && member.birthYear && member.birthYear <= newParent.birthYear) {
      errors.push('تحذير: سنة ميلاد العضو قبل أو مساوية لسنة ميلاد الأب الجديد');
    }
  }

  // Calculate generation change
  const currentGeneration = member.generation;
  let newGeneration = 1;

  if (newParentId) {
    const newParent = allMembers.find(m => m.id === newParentId);
    if (newParent) {
      newGeneration = newParent.generation + 1;
    }
  }

  const generationChange = newGeneration - currentGeneration;

  // Find all affected descendants
  const affectedMembers = getDescendants(memberId, allMembers);
  affectedMembers.unshift(memberId);

  return {
    valid: errors.length === 0,
    wouldCreateCycle: false,
    generationChange,
    affectedMembers,
    errors
  };
}

// ============================================
// TREE HELPERS
// ============================================

export function isDescendant(
  potentialDescendantId: string,
  ancestorId: string,
  allMembers: FamilyMember[]
): boolean {
  const descendants = getDescendants(ancestorId, allMembers);
  return descendants.includes(potentialDescendantId);
}

export function getDescendants(
  memberId: string,
  allMembers: FamilyMember[]
): string[] {
  const descendants: string[] = [];
  const queue = [memberId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = allMembers.filter(m => m.fatherId === currentId);

    for (const child of children) {
      descendants.push(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
}

export function getAncestors(
  memberId: string,
  allMembers: FamilyMember[]
): string[] {
  const ancestors: string[] = [];
  let currentMember = allMembers.find(m => m.id === memberId);

  while (currentMember?.fatherId) {
    ancestors.push(currentMember.fatherId);
    currentMember = allMembers.find(m => m.id === currentMember!.fatherId);
  }

  return ancestors;
}

// ============================================
// FULL NAME GENERATION
// ============================================

export function generateFullName(
  member: Partial<FamilyMember>,
  allMembers: FamilyMember[]
): { fullNameAr: string; fullNameEn: string } {
  const parts: string[] = [member.firstName || ''];
  let currentMember = member;

  // Get all ancestor names to the root (no depth limit)
  while (currentMember.fatherId) {
    const father = allMembers.find(m => m.id === currentMember.fatherId);
    if (father) {
      parts.push(father.firstName);
      currentMember = father;
    } else {
      break;
    }
  }

  // Add family name
  parts.push(member.familyName || 'آل شايع');

  // Arabic full name with proper connectors
  const connector = member.gender?.toUpperCase() === 'FEMALE' ? 'بنت' : 'بن';
  const fullNameAr = parts.length > 2
    ? parts[0] + ' ' + connector + ' ' + parts.slice(1, -1).join(' ' + connector + ' ') + ' ' + parts[parts.length - 1]
    : parts.join(' ');

  // English full name - use spaces only (no bin/bint)
  const fullNameEn = parts.map(transliterate).join(' ');

  return { fullNameAr, fullNameEn };
}

function transliterate(arabic: string): string {
  if (!arabic) return '';
  
  const commonNames: Record<string, string> = {
    'عبدالله': 'Abdullah',
    'عبد الله': 'Abdullah',
    'عبدالعزيز': 'Abdulaziz',
    'عبد العزيز': 'Abdulaziz',
    'عبدالرحمن': 'Abdulrahman',
    'عبد الرحمن': 'Abdulrahman',
    'عبدالكريم': 'Abdulkarim',
    'عبد الكريم': 'Abdulkarim',
    'عبدالملك': 'Abdulmalik',
    'عبد الملك': 'Abdulmalik',
    'عبدالمجيد': 'Abdulmajid',
    'عبد المجيد': 'Abdulmajid',
    'عبداللطيف': 'Abdullatif',
    'عبد اللطيف': 'Abdullatif',
    'عبدالمحسن': 'Abdulmohsen',
    'عبد المحسن': 'Abdulmohsen',
    'عبدالهادي': 'Abdulhadi',
    'عبد الهادي': 'Abdulhadi',
    'عبدالواحد': 'Abdulwahid',
    'عبد الواحد': 'Abdulwahid',
    'محمد': 'Mohammed',
    'أحمد': 'Ahmed',
    'احمد': 'Ahmed',
    'إبراهيم': 'Ibrahim',
    'ابراهيم': 'Ibrahim',
    'سليمان': 'Sulaiman',
    'سلمان': 'Salman',
    'ناصر': 'Nasser',
    'خالد': 'Khalid',
    'فهد': 'Fahd',
    'سعود': 'Saud',
    'سعد': 'Saad',
    'فيصل': 'Faisal',
    'تركي': 'Turki',
    'بندر': 'Bandar',
    'سلطان': 'Sultan',
    'نايف': 'Naif',
    'مشعل': 'Mishal',
    'متعب': 'Mutaib',
    'عمر': 'Omar',
    'علي': 'Ali',
    'حسن': 'Hassan',
    'حسين': 'Hussein',
    'يوسف': 'Youssef',
    'يعقوب': 'Yaqoub',
    'صالح': 'Saleh',
    'عثمان': 'Othman',
    'حمد': 'Hamad',
    'راشد': 'Rashid',
    'ماجد': 'Majid',
    'منصور': 'Mansour',
    'نواف': 'Nawaf',
    'فوزان': 'Fawzan',
    'مساعد': 'Musaad',
    'زيد': 'Zaid',
    'فهاد': 'Fahad',
    'بدر': 'Badr',
    'جمال': 'Jamal',
    'كمال': 'Kamal',
    'طلال': 'Talal',
    'نوره': 'Noura',
    'نورة': 'Noura',
    'سارة': 'Sarah',
    'فاطمة': 'Fatima',
    'عائشة': 'Aisha',
    'مريم': 'Mariam',
    'خديجة': 'Khadija',
    'زينب': 'Zainab',
    'هند': 'Hind',
    'ريم': 'Reem',
    'دانة': 'Dana',
    'لمى': 'Lama',
    'منيرة': 'Munira',
    'لطيفة': 'Latifa',
    'موضي': 'Moudhi',
    'جواهر': 'Jawahir',
    'العنود': 'Al-Anoud',
    'الجوهرة': 'Al-Jawhara',
    'خلود': 'Khulud',
    'هيا': 'Haya',
    'آل شايع': 'Al-Shaye',
    'ال شايع': 'Al-Shaye',
    'شايع': 'Shaye',
  };

  const trimmed = arabic.trim();
  if (commonNames[trimmed]) {
    return commonNames[trimmed];
  }

  const charMap: Record<string, string> = {
    'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a',
    'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'dh',
    'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh',
    'ص': 's', 'ض': 'd',
    'ط': 't', 'ظ': 'dh',
    'ع': 'a', 'غ': 'gh',
    'ف': 'f', 'ق': 'q',
    'ك': 'k', 'ل': 'l',
    'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w',
    'ي': 'y', 'ى': 'a',
    'ة': 'a', 'ء': '',
    'ؤ': 'o', 'ئ': 'e',
    'ً': '', 'ٌ': '', 'ٍ': '',
    'َ': '', 'ُ': '', 'ِ': '',
    'ّ': '', 'ْ': '',
    ' ': ' ', '-': '-',
  };

  let text = trimmed;
  
  if (text.startsWith('آل ') || text.startsWith('ال ')) {
    text = 'AL_PREFIX_PLACEHOLDER' + text.substring(3);
  } else if (text.startsWith('آل') || text.startsWith('ال')) {
    text = 'AL_PREFIX_PLACEHOLDER' + text.substring(2);
  }

  let result = '';
  for (const char of text) {
    if (charMap.hasOwnProperty(char)) {
      result += charMap[char];
    } else if (/[a-zA-Z0-9\s\-_.]/.test(char)) {
      result += char;
    }
  }

  result = result.replace('AL_PREFIX_PLACEHOLDER', 'Al-');
  
  result = result.replace(/\s+/g, ' ').trim();
  
  return result.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

// ============================================
// CHANGE TRACKING
// ============================================

export function createChangeRecord(
  memberId: string,
  fieldName: string,
  oldValue: unknown,
  newValue: unknown,
  changeType: string,
  adminId: string,
  adminName: string,
  fullSnapshot?: FamilyMember | null,
  batchId?: string
): Omit<ChangeHistory, 'id' | 'changedAt'> {
  return {
    memberId,
    fieldName,
    oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : null,
    newValue: newValue !== undefined ? JSON.stringify(newValue) : null,
    changeType: changeType as ChangeHistory['changeType'],
    changedBy: adminId,
    changedByName: adminName,
    batchId: batchId || null,
    fullSnapshot: fullSnapshot ? JSON.stringify(fullSnapshot) : null,
    reason: null,
    ipAddress: null
  };
}

export function applyEdit(
  member: FamilyMember,
  changes: Partial<FamilyMember>
): FamilyMember {
  return {
    ...member,
    ...changes,
    updatedAt: new Date()
  };
}

// ============================================
// CASCADING UPDATES
// ============================================

export interface CascadeUpdate {
  memberId: string;
  changes: Partial<FamilyMember>;
  reason: string;
}

export function calculateCascadeUpdates(
  memberId: string,
  changes: Partial<FamilyMember>,
  allMembers: FamilyMember[]
): CascadeUpdate[] {
  const updates: CascadeUpdate[] = [];

  // If changing firstName, update children's fatherName
  if (changes.firstName !== undefined) {
    const children = allMembers.filter(m => m.fatherId === memberId);
    for (const child of children) {
      updates.push({
        memberId: child.id,
        changes: { fatherName: changes.firstName },
        reason: 'تحديث اسم الأب تلقائياً'
      });
    }
  }

  // If changing fatherId, update generation for member and all descendants
  if (changes.fatherId !== undefined) {
    const validation = validateParentChange(memberId, changes.fatherId, allMembers);
    if (validation.valid && validation.generationChange !== 0) {
      for (const descendantId of validation.affectedMembers) {
        const descendant = allMembers.find(m => m.id === descendantId);
        if (descendant) {
          updates.push({
            memberId: descendantId,
            changes: { generation: descendant.generation + validation.generationChange },
            reason: 'تحديث الجيل تلقائياً بعد تغيير الأب'
          });
        }
      }
    }
  }

  // If changing branch, update descendants' branches
  if (changes.branch !== undefined) {
    const descendants = getDescendants(memberId, allMembers);
    for (const descendantId of descendants) {
      updates.push({
        memberId: descendantId,
        changes: { branch: changes.branch },
        reason: 'تحديث الفرع تلقائياً'
      });
    }
  }

  return updates;
}
