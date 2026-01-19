import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrentHijriYear(): number {
  const now = new Date();
  const gYear = now.getFullYear();
  const gMonth = now.getMonth() + 1;
  const gDay = now.getDate();
  
  // Calculate Julian Day Number for Gregorian date
  const a = Math.floor((14 - gMonth) / 12);
  const y = gYear + 4800 - a;
  const m = gMonth + 12 * a - 3;
  
  const jd = gDay + Math.floor((153 * m + 2) / 5) + 365 * y +
             Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  
  // Islamic calendar epoch: July 19, 622 CE (Julian day 1948439.5)
  const islamicEpoch = 1948439.5;
  const daysSinceEpoch = jd - islamicEpoch;
  
  // Calculate Hijri year (average Islamic year is 354.36667 days)
  const hijriYear = Math.floor((30 * daysSinceEpoch + 10646) / 10631);
  
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
  return gender?.toUpperCase() === 'MALE' ? '👨' : '👩';
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

/**
 * Gender utility functions for case-insensitive gender comparisons.
 * Database stores gender as uppercase 'MALE'/'FEMALE'.
 */
export function isMale(gender: string | null | undefined): boolean {
  return gender?.toUpperCase() === 'MALE';
}

export function isFemale(gender: string | null | undefined): boolean {
  return gender?.toUpperCase() === 'FEMALE';
}

export function normalizeGender(gender: string | null | undefined): 'MALE' | 'FEMALE' | null {
  if (!gender) return null;
  const upper = gender.toUpperCase();
  if (upper === 'MALE') return 'MALE';
  if (upper === 'FEMALE') return 'FEMALE';
  return null;
}
