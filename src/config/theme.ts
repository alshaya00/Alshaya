// Theme Configuration for Al-Shaye Family Tree
// Centralized color schemes and styling constants

export interface ColorPalette {
  primary: string;
  secondary: string;
  gradient: [string, string];
}

// ============================================
// BRAND COLORS
// ============================================

export const brandColors = {
  // Primary brand color (dark blue)
  primary: '#1E3A5F',
  primaryLight: '#2D5A87',
  primaryDark: '#152A47',

  // Secondary brand color
  secondary: '#22c55e',
  secondaryLight: '#4ade80',
  secondaryDark: '#16a34a',

  // Accent colors
  accent: '#fbbf24',
  accentLight: '#fef3c7',

  // Theme colors for meta tags
  themeDark: '#1E3A5F',
  themeLight: '#ffffff',
} as const;

// ============================================
// GENERATION COLORS (8 generations)
// Used in family tree visualization
// ============================================

export const generationColors: Record<number, ColorPalette> = {
  1: { primary: '#dc2626', secondary: '#fecaca', gradient: ['#ef4444', '#dc2626'] }, // Red
  2: { primary: '#ea580c', secondary: '#fed7aa', gradient: ['#f97316', '#ea580c'] }, // Orange
  3: { primary: '#d97706', secondary: '#fef3c7', gradient: ['#f59e0b', '#d97706'] }, // Amber
  4: { primary: '#16a34a', secondary: '#bbf7d0', gradient: ['#22c55e', '#16a34a'] }, // Green
  5: { primary: '#0d9488', secondary: '#99f6e4', gradient: ['#14b8a6', '#0d9488'] }, // Teal
  6: { primary: '#2563eb', secondary: '#bfdbfe', gradient: ['#3b82f6', '#2563eb'] }, // Blue
  7: { primary: '#4f46e5', secondary: '#c7d2fe', gradient: ['#6366f1', '#4f46e5'] }, // Indigo
  8: { primary: '#9333ea', secondary: '#e9d5ff', gradient: ['#a855f7', '#9333ea'] }, // Purple
};

// Simple hex array for generation colors (for charts, exports)
export const generationHexColors: string[] = [
  '#DC2626', // Gen 1 - Red
  '#EA580C', // Gen 2 - Orange
  '#D97706', // Gen 3 - Amber
  '#16A34A', // Gen 4 - Green
  '#0D9488', // Gen 5 - Teal
  '#2563EB', // Gen 6 - Blue
  '#4F46E5', // Gen 7 - Indigo
  '#9333EA', // Gen 8 - Purple
];

// ============================================
// LINEAGE/BRANCH COLORS (10 branches)
// Used for coloring family branches by Gen 2 ancestor
// ============================================

export const lineageColors: ColorPalette[] = [
  { primary: '#ef4444', secondary: '#fecaca', gradient: ['#f87171', '#ef4444'] }, // Red
  { primary: '#3b82f6', secondary: '#bfdbfe', gradient: ['#60a5fa', '#3b82f6'] }, // Blue
  { primary: '#22c55e', secondary: '#bbf7d0', gradient: ['#4ade80', '#22c55e'] }, // Green
  { primary: '#f59e0b', secondary: '#fef3c7', gradient: ['#fbbf24', '#f59e0b'] }, // Amber
  { primary: '#a855f7', secondary: '#e9d5ff', gradient: ['#c084fc', '#a855f7'] }, // Purple
  { primary: '#ec4899', secondary: '#fbcfe8', gradient: ['#f472b6', '#ec4899'] }, // Pink
  { primary: '#6366f1', secondary: '#c7d2fe', gradient: ['#818cf8', '#6366f1'] }, // Indigo
  { primary: '#14b8a6', secondary: '#99f6e4', gradient: ['#2dd4bf', '#14b8a6'] }, // Teal
  { primary: '#f97316', secondary: '#fed7aa', gradient: ['#fb923c', '#f97316'] }, // Orange
  { primary: '#06b6d4', secondary: '#a5f3fc', gradient: ['#22d3ee', '#06b6d4'] }, // Cyan
];

// Simple hex array for branch colors (for D3 visualization)
export const lineageHexColors: string[] = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#06b6d4', // Cyan
];

// Root/founder color (Gen 1)
export const rootColor: ColorPalette = {
  primary: '#78716c',
  secondary: '#d6d3d1',
  gradient: ['#a8a29e', '#78716c'],
};

// ============================================
// GENDER COLORS
// ============================================

export const genderColors = {
  male: {
    primary: '#3b82f6',
    secondary: '#dbeafe',
    gradient: ['#60a5fa', '#3b82f6'],
    ring: '#3b82f6',
  },
  female: {
    primary: '#ec4899',
    secondary: '#fce7f3',
    gradient: ['#f472b6', '#ec4899'],
    ring: '#ec4899',
  },
};

// ============================================
// FAMILY RELATIONSHIP COLORS (Milk kinship)
// ============================================

export const relationshipColors = {
  blood: {
    line: '#3b82f6',
    shadow: '#93c5fd',
    background: '#eff6ff',
  },
  milk: {
    line: '#14b8a6',
    shadow: '#5eead4',
    background: '#f0fdfa',
  },
  mainPerson: {
    ring: '#fbbf24',
    glow: '#fef3c7',
  },
};

// ============================================
// STATUS COLORS
// ============================================

export const statusColors = {
  living: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    hex: '#22c55e',
  },
  deceased: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    hex: '#6b7280',
    indicator: '#9ca3af', // Gray indicator
  },
};

// ============================================
// TAILWIND COLOR CLASSES (for branch coloring)
// ============================================

export const branchTailwindColors: string[] = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-rose-500',
  'bg-lime-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-fuchsia-500',
];

// ============================================
// CHART COLOR CLASSES
// ============================================

export const chartColorClasses: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
};

// ============================================
// EXPORT STYLING
// ============================================

export const exportStyles = {
  headerGradient: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryLight} 100%)`,
  familyName: {
    ar: 'شجرة آل شايع العائلية',
    en: 'Al-Shaye Family Tree',
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get color for a specific generation
 */
export function getGenerationColor(generation: number): ColorPalette {
  return generationColors[generation] || generationColors[8];
}

/**
 * Get color for a branch by index
 */
export function getBranchColor(index: number): ColorPalette {
  return lineageColors[index % lineageColors.length];
}

/**
 * Get hex color for a generation
 */
export function getGenerationHex(generation: number): string {
  return generationHexColors[generation - 1] || generationHexColors[7];
}
