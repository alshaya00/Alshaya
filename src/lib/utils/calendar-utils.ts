/**
 * Calendar Utilities for Hijri-Gregorian Conversion
 * 
 * The Hijri calendar is a lunar calendar that started in 622 AD (Gregorian).
 * Each Hijri year is approximately 354.37 days, making it about 11 days shorter
 * than the Gregorian year. This means roughly 33 Hijri years ≈ 32 Gregorian years.
 */

/**
 * Convert Hijri year to approximate Gregorian year
 * Formula: Gregorian = 622 + (Hijri × 0.97)
 * This gives a reasonably accurate conversion for age calculations
 */
export function hijriToGregorian(hijriYear: number): number {
  // The Hijri calendar started in 622 AD
  // Each Hijri year is ~354 days, so 33 Hijri years ≈ 32 Gregorian years
  // Factor: 32/33 ≈ 0.9697
  const gregorianYear = Math.round(622 + (hijriYear * 0.9697));
  return gregorianYear;
}

/**
 * Convert Gregorian year to approximate Hijri year
 * Formula: Hijri = (Gregorian - 622) / 0.97
 */
export function gregorianToHijri(gregorianYear: number): number {
  const hijriYear = Math.round((gregorianYear - 622) / 0.9697);
  return hijriYear;
}

/**
 * Get the current year in both calendars
 */
export function getCurrentYears(): { gregorian: number; hijri: number } {
  const gregorian = new Date().getFullYear();
  const hijri = gregorianToHijri(gregorian);
  return { gregorian, hijri };
}

/**
 * Normalize a birth year to Gregorian for consistent age calculation
 */
export function normalizeToGregorian(year: number | null | undefined, calendar: string): number | null {
  if (!year) return null;
  
  if (calendar === 'HIJRI') {
    return hijriToGregorian(year);
  }
  return year;
}

/**
 * Calculate age from birth year, handling both Hijri and Gregorian calendars
 */
export function calculateAge(birthYear: number | null | undefined, birthCalendar: string = 'GREGORIAN'): number | null {
  if (!birthYear) return null;
  
  const currentYear = new Date().getFullYear();
  const gregorianBirthYear = normalizeToGregorian(birthYear, birthCalendar);
  
  if (!gregorianBirthYear) return null;
  
  return currentYear - gregorianBirthYear;
}

/**
 * Validate if an age is realistic (0-120 years)
 */
export function isRealisticAge(age: number | null): boolean {
  if (age === null) return true; // Unknown age is acceptable
  return age >= 0 && age <= 120;
}

/**
 * Data validation result
 */
export interface ValidationIssue {
  field: string;
  fieldAr: string;
  value: string;
  issue: string;
  issueAr: string;
  severity: 'error' | 'warning';
}

/**
 * Validate member data for logical issues
 */
export function validateMemberData(member: {
  id: string;
  firstName: string;
  birthYear?: number | null;
  birthCalendar?: string;
  deathYear?: number | null;
  deathCalendar?: string;
  generation: number;
  gender: string;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const currentYear = new Date().getFullYear();
  
  // Validate birth year
  if (member.birthYear) {
    const gregorianBirth = normalizeToGregorian(member.birthYear, member.birthCalendar || 'GREGORIAN');
    const age = gregorianBirth ? currentYear - gregorianBirth : null;
    
    // Check for impossible ages
    if (age !== null && age > 120) {
      issues.push({
        field: 'birthYear',
        fieldAr: 'سنة الميلاد',
        value: `${member.birthYear} (${member.birthCalendar})`,
        issue: `Calculated age is ${age} years, which is impossible. The birth year may be in Hijri but stored as Gregorian.`,
        issueAr: `العمر المحسوب ${age} سنة، وهذا مستحيل. قد تكون سنة الميلاد بالهجري ولكنها مخزنة كميلادي.`,
        severity: 'error'
      });
    }
    
    // Check for future birth year
    if (gregorianBirth && gregorianBirth > currentYear) {
      issues.push({
        field: 'birthYear',
        fieldAr: 'سنة الميلاد',
        value: `${member.birthYear} (${member.birthCalendar})`,
        issue: `Birth year ${gregorianBirth} is in the future.`,
        issueAr: `سنة الميلاد ${gregorianBirth} في المستقبل.`,
        severity: 'error'
      });
    }
    
    // Check for negative age
    if (age !== null && age < 0) {
      issues.push({
        field: 'birthYear',
        fieldAr: 'سنة الميلاد',
        value: `${member.birthYear} (${member.birthCalendar})`,
        issue: `Birth year results in negative age.`,
        issueAr: `سنة الميلاد تنتج عمراً سالباً.`,
        severity: 'error'
      });
    }
    
    // Check for suspicious young generation with old age
    if (member.generation >= 7 && age !== null && age > 80) {
      issues.push({
        field: 'generation',
        fieldAr: 'الجيل',
        value: `Gen ${member.generation}, Age ${age}`,
        issue: `Generation ${member.generation} member should not be older than ~80 years. Check if birth year is Hijri.`,
        issueAr: `عضو الجيل ${member.generation} لا يجب أن يكون أكبر من 80 سنة تقريباً. تحقق إذا كانت سنة الميلاد بالهجري.`,
        severity: 'warning'
      });
    }
  }
  
  // Validate death year
  if (member.deathYear) {
    const gregorianDeath = normalizeToGregorian(member.deathYear, member.deathCalendar || 'GREGORIAN');
    const gregorianBirth = member.birthYear ? normalizeToGregorian(member.birthYear, member.birthCalendar || 'GREGORIAN') : null;
    
    // Death before birth
    if (gregorianBirth && gregorianDeath && gregorianDeath < gregorianBirth) {
      issues.push({
        field: 'deathYear',
        fieldAr: 'سنة الوفاة',
        value: `Birth: ${member.birthYear}, Death: ${member.deathYear}`,
        issue: `Death year is before birth year.`,
        issueAr: `سنة الوفاة قبل سنة الميلاد.`,
        severity: 'error'
      });
    }
    
    // Age at death over 120
    if (gregorianBirth && gregorianDeath) {
      const ageAtDeath = gregorianDeath - gregorianBirth;
      if (ageAtDeath > 120) {
        issues.push({
          field: 'deathYear',
          fieldAr: 'سنة الوفاة',
          value: `Age at death: ${ageAtDeath}`,
          issue: `Age at death (${ageAtDeath}) exceeds realistic maximum (120).`,
          issueAr: `العمر عند الوفاة (${ageAtDeath}) يتجاوز الحد الأقصى الواقعي (120).`,
          severity: 'error'
        });
      }
    }
  }
  
  return issues;
}

/**
 * Get suggested correction for birth year
 * If a year looks like it's Hijri but stored as Gregorian, suggest the correction
 */
export function getSuggestedCorrection(birthYear: number, storedCalendar: string): {
  suggestedYear: number;
  suggestedCalendar: string;
  explanation: string;
  explanationAr: string;
} | null {
  const currentYear = new Date().getFullYear();
  
  // If stored as Gregorian but the year is clearly a Hijri year (1300-1500 range)
  if (storedCalendar === 'GREGORIAN' && birthYear >= 1300 && birthYear <= 1500) {
    const converted = hijriToGregorian(birthYear);
    const age = currentYear - converted;
    
    if (age >= 0 && age <= 120) {
      return {
        suggestedYear: birthYear,
        suggestedCalendar: 'HIJRI',
        explanation: `Year ${birthYear} appears to be Hijri (≈${converted} Gregorian, age ~${age})`,
        explanationAr: `السنة ${birthYear} تبدو هجرية (≈${converted} ميلادي، العمر ~${age})`
      };
    }
  }
  
  return null;
}
