import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrentHijriYear(): number {
  const now = new Date();
  const gregorianYear = now.getFullYear();
  const gregorianMonth = now.getMonth() + 1;
  const gregorianDay = now.getDate();
  
  const jd = Math.floor((1461 * (gregorianYear + 4800 + Math.floor((gregorianMonth - 14) / 12))) / 4) +
             Math.floor((367 * (gregorianMonth - 2 - 12 * Math.floor((gregorianMonth - 14) / 12))) / 12) -
             Math.floor((3 * Math.floor((gregorianYear + 4900 + Math.floor((gregorianMonth - 14) / 12)) / 100)) / 4) +
             gregorianDay - 32075;
  
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const lPrime = l - 10631 * n + 354;
  const j = Math.floor((10985 - lPrime) / 5316) * Math.floor((50 * lPrime) / 17719) +
            Math.floor(lPrime / 5670) * Math.floor((43 * lPrime) / 15238);
  const lDoublePrime = lPrime - Math.floor((30 - j) / 15) * Math.floor((17719 * j + 15) / 50) -
                        Math.floor(j / 16) * Math.floor((15238 * j - 15) / 43) + 29;
  const hijriYear = 30 * n + j - 30 + Math.floor((24 * lDoublePrime) / 709);
  
  return hijriYear;
}

export function calculateAge(birthYear: number | null, birthCalendar?: string | null): number | null {
  if (!birthYear) return null;
  
  const calendarUpper = birthCalendar?.toUpperCase();
  if (calendarUpper === 'HIJRI') {
    const currentHijriYear = getCurrentHijriYear();
    return currentHijriYear - birthYear;
  }
  
  return new Date().getFullYear() - birthYear;
}

export function formatGeneration(gen: number): string {
  const arabicNumbers: { [key: number]: string } = {
    1: 'الأول',
    2: 'الثاني',
    3: 'الثالث',
    4: 'الرابع',
    5: 'الخامس',
    6: 'السادس',
    7: 'السابع',
    8: 'الثامن',
    9: 'التاسع',
    10: 'العاشر',
    11: 'الحادي عشر',
    12: 'الثاني عشر',
  };
  return `الجيل ${arabicNumbers[gen] || gen}`;
}

export function getGenerationColor(gen: number): string {
  const colors: { [key: number]: string } = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-yellow-500',
    4: 'bg-green-500',
    5: 'bg-teal-500',
    6: 'bg-blue-500',
    7: 'bg-indigo-500',
    8: 'bg-purple-500',
    9: 'bg-pink-500',
    10: 'bg-cyan-500',
    11: 'bg-lime-500',
    12: 'bg-rose-500',
  };
  return colors[gen] || 'bg-gray-500';
}

export function getGenderIcon(gender: 'Male' | 'Female'): string {
  return gender === 'Male' ? '👨' : '👩';
}

export function getStatusBadge(status: string): { text: string; color: string } {
  switch (status) {
    case 'Living':
      return { text: 'على قيد الحياة', color: 'bg-green-100 text-green-800' };
    case 'Deceased':
      return { text: 'متوفى', color: 'bg-gray-100 text-gray-800' };
    default:
      return { text: status, color: 'bg-gray-100 text-gray-800' };
  }
}
