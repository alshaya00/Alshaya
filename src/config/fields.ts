// Field Configuration for Al-Shaye Family Tree
// Centralized form field definitions for member data

export type FieldType = 'text' | 'number' | 'email' | 'select' | 'textarea' | 'date';

export interface FieldDefinition {
  key: string;
  label: string;       // Arabic label
  labelEn: string;     // English label
  type: FieldType;
  required: boolean;
  editable: boolean;
  options?: string[];  // For select fields
  placeholder?: string;
  placeholderEn?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// ============================================
// MEMBER FIELDS
// Used in forms, excel view, import/export
// ============================================

export const memberFields: FieldDefinition[] = [
  {
    key: 'id',
    label: 'المعرف',
    labelEn: 'ID',
    type: 'text',
    required: true,
    editable: false,
    placeholder: 'P001',
  },
  {
    key: 'firstName',
    label: 'الاسم',
    labelEn: 'First Name',
    type: 'text',
    required: true,
    editable: true,
    placeholder: 'محمد',
    placeholderEn: 'Mohammed',
  },
  {
    key: 'fatherName',
    label: 'اسم الأب',
    labelEn: 'Father Name',
    type: 'text',
    required: false,
    editable: true,
  },
  {
    key: 'grandfatherName',
    label: 'اسم الجد',
    labelEn: 'Grandfather',
    type: 'text',
    required: false,
    editable: true,
  },
  {
    key: 'greatGrandfatherName',
    label: 'الجد الثاني',
    labelEn: 'Great Grandfather',
    type: 'text',
    required: false,
    editable: true,
  },
  {
    key: 'familyName',
    label: 'اسم العائلة',
    labelEn: 'Family Name',
    type: 'text',
    required: true,
    editable: true,
    placeholder: 'آل شايع',
    placeholderEn: 'Al-Shaye',
  },
  {
    key: 'fatherId',
    label: 'معرف الأب',
    labelEn: 'Father ID',
    type: 'text',
    required: false,
    editable: true,
    placeholder: 'P001',
  },
  {
    key: 'gender',
    label: 'الجنس',
    labelEn: 'Gender',
    type: 'select',
    options: ['Male', 'Female'],
    required: true,
    editable: true,
  },
  {
    key: 'birthYear',
    label: 'سنة الميلاد',
    labelEn: 'Birth Year',
    type: 'number',
    required: false,
    editable: true,
    validation: { min: 1500, max: new Date().getFullYear() },
  },
  {
    key: 'deathYear',
    label: 'سنة الوفاة',
    labelEn: 'Death Year',
    type: 'number',
    required: false,
    editable: true,
    validation: { min: 1500, max: new Date().getFullYear() },
  },
  {
    key: 'status',
    label: 'الحالة',
    labelEn: 'Status',
    type: 'select',
    options: ['Living', 'Deceased'],
    required: true,
    editable: true,
  },
  {
    key: 'generation',
    label: 'الجيل',
    labelEn: 'Generation',
    type: 'number',
    required: true,
    editable: true,
    validation: { min: 1, max: 10 },
  },
  {
    key: 'branch',
    label: 'الفرع',
    labelEn: 'Branch',
    type: 'text',
    required: false,
    editable: true,
  },
  {
    key: 'sonsCount',
    label: 'عدد الأبناء',
    labelEn: 'Sons',
    type: 'number',
    required: false,
    editable: true,
    validation: { min: 0 },
  },
  {
    key: 'daughtersCount',
    label: 'عدد البنات',
    labelEn: 'Daughters',
    type: 'number',
    required: false,
    editable: true,
    validation: { min: 0 },
  },
  {
    key: 'phone',
    label: 'الهاتف',
    labelEn: 'Phone',
    type: 'text',
    required: false,
    editable: true,
    placeholder: '+966 5X XXX XXXX',
  },
  {
    key: 'city',
    label: 'المدينة',
    labelEn: 'City',
    type: 'text',
    required: false,
    editable: true,
    placeholder: 'الرياض',
    placeholderEn: 'Riyadh',
  },
  {
    key: 'occupation',
    label: 'المهنة',
    labelEn: 'Occupation',
    type: 'text',
    required: false,
    editable: true,
  },
  {
    key: 'email',
    label: 'البريد',
    labelEn: 'Email',
    type: 'email',
    required: false,
    editable: true,
    validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
  },
];

// Fields that should be treated as numeric during import
export const numericFields: string[] = [
  'birthYear',
  'deathYear',
  'sonsCount',
  'daughtersCount',
  'generation',
];

// Fields required for creating a new member
export const requiredFields: string[] = memberFields
  .filter(f => f.required)
  .map(f => f.key);

// Fields that can be edited by users
export const editableFields: string[] = memberFields
  .filter(f => f.editable)
  .map(f => f.key);

// Fields to display in list/table views
export const displayFields: string[] = [
  'id',
  'firstName',
  'fatherName',
  'generation',
  'branch',
  'status',
  'city',
];

// Fields to include in search
export const searchableFields: string[] = [
  'firstName',
  'fatherName',
  'grandfatherName',
  'greatGrandfatherName',
  'fullNameAr',
  'fullNameEn',
  'city',
  'occupation',
];

// ============================================
// USER FIELDS
// ============================================

export const userFields: FieldDefinition[] = [
  { key: 'email', label: 'البريد الإلكتروني', labelEn: 'Email', type: 'email', required: true, editable: true },
  { key: 'nameArabic', label: 'الاسم بالعربي', labelEn: 'Arabic Name', type: 'text', required: true, editable: true },
  { key: 'nameEnglish', label: 'الاسم بالإنجليزي', labelEn: 'English Name', type: 'text', required: false, editable: true },
  { key: 'phone', label: 'الهاتف', labelEn: 'Phone', type: 'text', required: false, editable: true },
  { key: 'role', label: 'الدور', labelEn: 'Role', type: 'select', options: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_LEADER', 'MEMBER', 'GUEST'], required: true, editable: true },
  { key: 'status', label: 'الحالة', labelEn: 'Status', type: 'select', options: ['PENDING', 'ACTIVE', 'DISABLED'], required: true, editable: true },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get field definition by key
 */
export function getFieldByKey(key: string): FieldDefinition | undefined {
  return memberFields.find(f => f.key === key);
}

/**
 * Get field label (Arabic by default, English as fallback)
 */
export function getFieldLabel(key: string, lang: 'ar' | 'en' = 'ar'): string {
  const field = getFieldByKey(key);
  if (!field) return key;
  return lang === 'ar' ? field.label : field.labelEn;
}

/**
 * Validate field value
 */
export function validateField(key: string, value: unknown): { valid: boolean; error?: string } {
  const field = getFieldByKey(key);
  if (!field) return { valid: true };

  // Check required
  if (field.required && (value === null || value === undefined || value === '')) {
    return { valid: false, error: `${field.label} مطلوب` };
  }

  // Check type-specific validation
  if (field.type === 'email' && value && typeof value === 'string') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      return { valid: false, error: 'البريد الإلكتروني غير صالح' };
    }
  }

  if (field.type === 'number' && value !== null && value !== undefined && value !== '') {
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    if (typeof numValue !== 'number' || isNaN(numValue)) {
      return { valid: false, error: `${field.label} يجب أن يكون رقماً` };
    }
    if (field.validation?.min !== undefined && numValue < field.validation.min) {
      return { valid: false, error: `${field.label} يجب أن يكون على الأقل ${field.validation.min}` };
    }
    if (field.validation?.max !== undefined && numValue > field.validation.max) {
      return { valid: false, error: `${field.label} يجب ألا يتجاوز ${field.validation.max}` };
    }
  }

  return { valid: true };
}
