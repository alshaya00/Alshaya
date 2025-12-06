import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateAge(birthYear: number | null): number | null {
  if (!birthYear) return null;
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
