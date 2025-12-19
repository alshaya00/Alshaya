// آل شايع Family Tree - Arabic Text Utilities
// Comprehensive Arabic name normalization for accurate matching

/**
 * Arabic Unicode Ranges and Characters
 */
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g; // Fatha, Damma, Kasra, Shadda, Sukun, etc.
const ARABIC_TATWEEL = /\u0640/g; // Kashida/Tatweel (ـ)

/**
 * Character normalization maps
 */
const ALEF_VARIANTS: Record<string, string> = {
  '\u0623': '\u0627', // أ → ا (Alef with Hamza above)
  '\u0625': '\u0627', // إ → ا (Alef with Hamza below)
  '\u0622': '\u0627', // آ → ا (Alef with Madda)
  '\u0671': '\u0627', // ٱ → ا (Alef Wasla)
  '\u0672': '\u0627', // ٲ → ا (Alef with Wavy Hamza above)
  '\u0673': '\u0627', // ٳ → ا (Alef with Wavy Hamza below)
};

const HAMZA_VARIANTS: Record<string, string> = {
  '\u0624': '\u0648', // ؤ → و (Waw with Hamza)
  '\u0626': '\u064A', // ئ → ي (Yeh with Hamza)
  '\u0621': '',       // ء → (remove standalone Hamza)
};

const YEH_VARIANTS: Record<string, string> = {
  '\u0649': '\u064A', // ى → ي (Alef Maqsura → Yeh)
  '\u06CC': '\u064A', // ی → ي (Farsi Yeh)
  '\u06D2': '\u064A', // ے → ي (Yeh Barree)
};

const TAA_MARBUTA: Record<string, string> = {
  '\u0629': '\u0647', // ة → ه (Taa Marbuta → Heh)
};

const KAF_VARIANTS: Record<string, string> = {
  '\u06A9': '\u0643', // ک → ك (Farsi Kaf)
};

/**
 * Common Arabic name variations and nicknames
 * Maps variations to canonical forms
 */
const NAME_VARIATIONS: Record<string, string[]> = {
  // محمد and its variations
  'محمد': ['محمد', 'حمد', 'حمود', 'حمدان', 'محمود', 'حميد', 'حامد', 'أحمد'],
  'أحمد': ['أحمد', 'احمد', 'حمد'],

  // عبدالله and compound variations
  'عبدالله': ['عبدالله', 'عبد الله', 'عبداللة', 'عبد اللة'],
  'عبدالرحمن': ['عبدالرحمن', 'عبد الرحمن', 'عبدالرحمان', 'عبد الرحمان'],
  'عبدالعزيز': ['عبدالعزيز', 'عبد العزيز'],
  'عبدالكريم': ['عبدالكريم', 'عبد الكريم'],
  'عبدالملك': ['عبدالملك', 'عبد الملك'],
  'عبدالمجيد': ['عبدالمجيد', 'عبد المجيد'],

  // صالح variations
  'صالح': ['صالح', 'صلاح'],

  // فهد variations
  'فهد': ['فهد', 'فهاد'],

  // خالد variations
  'خالد': ['خالد', 'خلدون', 'مخلد'],

  // سعود variations
  'سعود': ['سعود', 'سعد', 'سعيد', 'مسعود'],

  // ناصر variations
  'ناصر': ['ناصر', 'نصر', 'منصور', 'نصار'],

  // فيصل variations
  'فيصل': ['فيصل', 'فصل'],

  // تركي variations
  'تركي': ['تركي', 'ترك'],

  // بندر variations
  'بندر': ['بندر', 'بدر'],

  // نورة/نوره variations (female)
  'نورة': ['نورة', 'نوره', 'نور', 'نورا', 'نورى'],

  // فاطمة variations (female)
  'فاطمة': ['فاطمة', 'فاطمه', 'فطوم', 'فطيمة'],

  // سارة variations (female)
  'سارة': ['سارة', 'ساره', 'سارا'],

  // لطيفة variations (female)
  'لطيفة': ['لطيفة', 'لطيفه'],

  // منيرة variations (female)
  'منيرة': ['منيرة', 'منيره', 'منير'],
};

/**
 * Build reverse lookup map for variations
 */
const VARIATION_TO_CANONICAL: Map<string, string> = new Map();
Object.entries(NAME_VARIATIONS).forEach(([canonical, variations]) => {
  variations.forEach(variation => {
    VARIATION_TO_CANONICAL.set(normalizeBasic(variation), canonical);
  });
});

/**
 * Basic normalization without variation mapping
 */
function normalizeBasic(text: string): string {
  if (!text) return '';

  let normalized = text.trim();

  // Remove diacritics (harakat)
  normalized = normalized.replace(ARABIC_DIACRITICS, '');

  // Remove tatweel
  normalized = normalized.replace(ARABIC_TATWEEL, '');

  // Normalize Alef variants
  for (const [variant, canonical] of Object.entries(ALEF_VARIANTS)) {
    normalized = normalized.split(variant).join(canonical);
  }

  // Normalize Hamza variants
  for (const [variant, canonical] of Object.entries(HAMZA_VARIANTS)) {
    normalized = normalized.split(variant).join(canonical);
  }

  // Normalize Yeh variants
  for (const [variant, canonical] of Object.entries(YEH_VARIANTS)) {
    normalized = normalized.split(variant).join(canonical);
  }

  // Normalize Taa Marbuta
  for (const [variant, canonical] of Object.entries(TAA_MARBUTA)) {
    normalized = normalized.split(variant).join(canonical);
  }

  // Normalize Kaf variants
  for (const [variant, canonical] of Object.entries(KAF_VARIANTS)) {
    normalized = normalized.split(variant).join(canonical);
  }

  // Normalize spaces (multiple spaces to single)
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Full normalization with variation mapping
 * This is the main function to use for name matching
 */
export function normalizeArabicName(name: string): string {
  if (!name) return '';

  const basic = normalizeBasic(name);

  // Check if this is a known variation
  const canonical = VARIATION_TO_CANONICAL.get(basic);
  if (canonical) {
    return normalizeBasic(canonical);
  }

  return basic;
}

/**
 * Get all possible normalized forms of a name
 * Useful for comprehensive searching
 */
export function getAllNormalizedForms(name: string): string[] {
  if (!name) return [];

  const forms = new Set<string>();
  const basic = normalizeBasic(name);
  forms.add(basic);

  // Add canonical form if exists
  const canonical = VARIATION_TO_CANONICAL.get(basic);
  if (canonical) {
    forms.add(normalizeBasic(canonical));
  }

  // Check if this name IS a canonical and add all its variations
  const variations = NAME_VARIATIONS[name] || NAME_VARIATIONS[basic];
  if (variations) {
    variations.forEach(v => forms.add(normalizeBasic(v)));
  }

  return Array.from(forms);
}

/**
 * Levenshtein distance for fuzzy matching
 * Returns the minimum number of edits needed to transform one string into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create a 2D array to store distances
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between two names (0-100)
 * Higher score = more similar
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;

  const norm1 = normalizeArabicName(name1);
  const norm2 = normalizeArabicName(name2);

  // Exact match after normalization
  if (norm1 === norm2) return 100;

  // Check if they're known variations of each other
  const canonical1 = VARIATION_TO_CANONICAL.get(norm1);
  const canonical2 = VARIATION_TO_CANONICAL.get(norm2);

  if (canonical1 && canonical1 === canonical2) return 95;
  if (canonical1 === norm2 || canonical2 === norm1) return 95;

  // Calculate Levenshtein-based similarity
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(norm1, norm2);
  const similarity = Math.round((1 - distance / maxLen) * 100);

  return Math.max(0, similarity);
}

/**
 * Check if two names match with configurable threshold
 */
export function namesMatch(
  name1: string,
  name2: string,
  threshold: number = 80
): boolean {
  return calculateNameSimilarity(name1, name2) >= threshold;
}

/**
 * Arabic Soundex-like phonetic encoding
 * Groups similar-sounding Arabic letters together
 */
export function arabicPhonetic(name: string): string {
  if (!name) return '';

  const normalized = normalizeArabicName(name);

  // Phonetic groups for Arabic letters
  const phoneticMap: Record<string, string> = {
    // Gutturals (حروف الحلق)
    'ء': '1', 'ه': '1', 'ع': '1', 'ح': '1', 'غ': '1', 'خ': '1',

    // Labials (حروف شفوية)
    'ب': '2', 'ف': '2', 'م': '2', 'و': '2',

    // Dentals (حروف أسنانية)
    'ت': '3', 'ث': '3', 'د': '3', 'ذ': '3', 'ط': '3', 'ظ': '3',

    // Sibilants (حروف صفيرية)
    'س': '4', 'ز': '4', 'ص': '4', 'ض': '4', 'ش': '4', 'ج': '4',

    // Liquids (حروف مائية)
    'ل': '5', 'ر': '5', 'ن': '5',

    // Velars (حروف طبقية)
    'ك': '6', 'ق': '6',

    // Vowels and semi-vowels (keep but don't encode)
    'ا': '0', 'ي': '0', 'ى': '0',
  };

  let encoded = '';
  let lastCode = '';

  for (const char of normalized) {
    const code = phoneticMap[char];
    if (code && code !== '0' && code !== lastCode) {
      encoded += code;
      lastCode = code;
    }
  }

  // Pad or truncate to 4 characters for consistency
  return (encoded + '0000').substring(0, 4);
}

/**
 * Check if two names are phonetically similar
 */
export function phoneticMatch(name1: string, name2: string): boolean {
  return arabicPhonetic(name1) === arabicPhonetic(name2);
}

/**
 * Comprehensive name matching with multiple strategies
 * Returns a detailed match result
 */
export interface NameMatchResult {
  isMatch: boolean;
  similarity: number;
  matchType: 'exact' | 'normalized' | 'variation' | 'phonetic' | 'fuzzy' | 'none';
  confidence: 'high' | 'medium' | 'low';
}

export function comprehensiveNameMatch(
  name1: string,
  name2: string
): NameMatchResult {
  if (!name1 || !name2) {
    return { isMatch: false, similarity: 0, matchType: 'none', confidence: 'low' };
  }

  // 1. Exact match (including original form)
  if (name1 === name2) {
    return { isMatch: true, similarity: 100, matchType: 'exact', confidence: 'high' };
  }

  const norm1 = normalizeArabicName(name1);
  const norm2 = normalizeArabicName(name2);

  // 2. Normalized exact match
  if (norm1 === norm2) {
    return { isMatch: true, similarity: 100, matchType: 'normalized', confidence: 'high' };
  }

  // 3. Known variation match
  const canonical1 = VARIATION_TO_CANONICAL.get(norm1);
  const canonical2 = VARIATION_TO_CANONICAL.get(norm2);

  if ((canonical1 && canonical1 === canonical2) ||
      (canonical1 === norm2) ||
      (canonical2 === norm1)) {
    return { isMatch: true, similarity: 95, matchType: 'variation', confidence: 'high' };
  }

  // 4. Phonetic match
  if (phoneticMatch(name1, name2)) {
    return { isMatch: true, similarity: 85, matchType: 'phonetic', confidence: 'medium' };
  }

  // 5. Fuzzy match (Levenshtein)
  const similarity = calculateNameSimilarity(name1, name2);

  if (similarity >= 85) {
    return { isMatch: true, similarity, matchType: 'fuzzy', confidence: 'medium' };
  }

  if (similarity >= 70) {
    return { isMatch: true, similarity, matchType: 'fuzzy', confidence: 'low' };
  }

  return { isMatch: false, similarity, matchType: 'none', confidence: 'low' };
}

/**
 * Split compound names like "عبدالله" into parts
 */
export function splitCompoundName(name: string): string[] {
  if (!name) return [];

  const normalized = normalizeBasic(name);

  // Common compound prefixes
  const compoundPrefixes = ['عبد', 'ابو', 'أبو', 'ام', 'أم', 'ابن', 'بن'];

  for (const prefix of compoundPrefixes) {
    if (normalized.startsWith(prefix) && normalized.length > prefix.length) {
      const remainder = normalized.substring(prefix.length).trim();
      if (remainder && !remainder.startsWith('ال')) {
        // It's a compound like عبدالله (not عبد الله with space)
        return [prefix, remainder];
      }
    }
  }

  // Check for space-separated compound
  const parts = normalized.split(' ');
  if (parts.length === 2 && compoundPrefixes.includes(parts[0])) {
    return parts;
  }

  return [normalized];
}

/**
 * Normalize compound names to a single canonical form
 * e.g., "عبد الله" → "عبدالله"
 */
export function normalizeCompoundName(name: string): string {
  const parts = splitCompoundName(name);
  if (parts.length === 2) {
    return parts.join('');
  }
  return normalizeBasic(name);
}

/**
 * Check if a name contains another (for partial matching)
 */
export function nameContains(fullName: string, partialName: string): boolean {
  const normFull = normalizeArabicName(fullName);
  const normPartial = normalizeArabicName(partialName);

  return normFull.includes(normPartial);
}

/**
 * Get name without common prefixes/suffixes
 * Useful for comparing core name parts
 */
export function getCoreName(name: string): string {
  let normalized = normalizeArabicName(name);

  // Remove common prefixes
  const prefixes = ['ابو', 'أبو', 'ام', 'أم', 'ابن', 'بن', 'آل', 'ال'];
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix + ' ')) {
      normalized = normalized.substring(prefix.length + 1);
    }
  }

  return normalized.trim();
}
