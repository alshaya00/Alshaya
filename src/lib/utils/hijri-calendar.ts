export function getCurrentGregorianYear(): number {
  return new Date().getFullYear();
}

export function getCurrentHijriYear(): number {
  const now = new Date();
  const gregorianYear = now.getFullYear();
  const gregorianMonth = now.getMonth() + 1;
  const gregorianDay = now.getDate();
  
  const jd = gregorianToJulianDay(gregorianYear, gregorianMonth, gregorianDay);
  const hijri = julianDayToHijri(jd);
  
  return hijri.year;
}

function gregorianToJulianDay(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

function julianDayToHijri(jd: number): { year: number; month: number; day: number } {
  const l = Math.floor(jd) - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const remaining = l - 10631 * n + 354;
  const j = Math.floor((10985 - remaining) / 5316) * Math.floor((50 * remaining) / 17719) + 
            Math.floor(remaining / 5670) * Math.floor((43 * remaining) / 15238);
  const adjustedRemaining = remaining - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - 
                            Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * adjustedRemaining) / 709);
  const day = adjustedRemaining - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  
  return { year, month, day };
}

export function getYearRange(calendar: 'GREGORIAN' | 'HIJRI'): { min: number; max: number } {
  if (calendar === 'HIJRI') {
    return {
      min: 800,
      max: getCurrentHijriYear(),
    };
  }
  
  return {
    min: 1400,
    max: getCurrentGregorianYear(),
  };
}

export function validateBirthYear(
  year: number,
  calendar: 'GREGORIAN' | 'HIJRI',
  isDeceased: boolean = false
): { valid: boolean; error?: string; errorAr?: string } {
  const range = getYearRange(calendar);
  
  if (year < range.min) {
    return {
      valid: false,
      error: `Year must be ${range.min} or later`,
      errorAr: `السنة يجب أن تكون ${range.min} أو أحدث`,
    };
  }
  
  if (!isDeceased && year > range.max) {
    return {
      valid: false,
      error: `Year cannot be in the future`,
      errorAr: `السنة لا يمكن أن تكون في المستقبل`,
    };
  }
  
  return { valid: true };
}

export type CalendarType = 'GREGORIAN' | 'HIJRI';
