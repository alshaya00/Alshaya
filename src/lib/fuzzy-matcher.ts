import { prisma } from './prisma';
import { transliterateName } from './utils/transliteration';
import type { FamilyMember } from '@prisma/client';

export interface MatchCandidate {
  member: FamilyMember;
  similarityScore: number;
  matchReasons: string[];
  matchReasonsAr: string[];
}

export interface FuzzyMatchResult {
  hasMatches: boolean;
  candidates: MatchCandidate[];
  highestScore: number;
  isDuplicate: boolean;
}

export interface FuzzyMatchInput {
  firstName?: string;
  fatherName?: string;
  grandfatherName?: string;
  fatherId?: string;
  birthYear?: number;
  gender?: string;
  phone?: string;
  email?: string;
  generation?: number;
}

const DUPLICATE_THRESHOLD = 85;  // Raised for stricter detection
const HIGH_SIMILARITY_THRESHOLD = 75;  // Raised for better accuracy
const SIBLING_DUPLICATE_THRESHOLD = 90;  // Very strict for siblings under same parent
const FULL_NAME_MATCH_THRESHOLD = 80;  // For 4-part name comparison
const GENERATION_MATCH_WEIGHT = 30;  // High weight for generation matching - crucial for distinguishing identical names

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  
  return dp[m][n];
}

function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = normalizeArabicName(str1.toLowerCase().trim());
  const s2 = normalizeArabicName(str2.toLowerCase().trim());
  
  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return Math.round(similarity);
}

/**
 * Comprehensive Arabic name normalization for accurate comparison
 * Handles: حركات، همزات، تاء مربوطة، ألف مقصورة، وجميع التنويعات
 */
function normalizeArabicName(name: string): string {
  if (!name) return '';
  
  return name
    // Remove all Arabic diacritics (tashkeel/harakat)
    // فَتْحة، ضَمّة، كَسْرة، سُكون، شدّة، تنوين
    .replace(/[\u064B-\u065F\u0670]/g, '')  // Fatha, Damma, Kasra, Sukun, Shadda, Tanween, Superscript Alef
    
    // Normalize all Hamza variations to plain Alef
    // أ، إ، آ، ٱ → ا
    .replace(/[أإآٱ]/g, 'ا')
    
    // Normalize Hamza on Waw and Ya
    // ؤ → و، ئ → ي، ء (standalone hamza) → remove
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')  // Remove standalone hamza
    
    // Normalize Taa Marbouta to Haa
    // ة → ه
    .replace(/ة/g, 'ه')
    
    // Normalize Alef Maqsoura to Ya
    // ى → ي
    .replace(/ى/g, 'ي')
    
    // Normalize Alef with Madda
    // آ → اا (already handled above with أإآٱ → ا)
    
    // Remove Tatweel (kashida) - التطويل
    .replace(/ـ/g, '')
    
    // Normalize common name variations
    // عبدالله = عبد الله
    .replace(/عبد\s+ال/g, 'عبدال')
    
    // Remove extra spaces and trim
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function compareNames(name1: string, name2: string): number {
  const directSimilarity = calculateStringSimilarity(name1, name2);
  
  const transliterated1 = transliterateName(name1);
  const transliterated2 = transliterateName(name2);
  const transliteratedSimilarity = calculateStringSimilarity(transliterated1, transliterated2);
  
  const crossSimilarity1 = calculateStringSimilarity(name1, transliterated2);
  const crossSimilarity2 = calculateStringSimilarity(transliterated1, name2);
  
  return Math.max(directSimilarity, transliteratedSimilarity, crossSimilarity1, crossSimilarity2);
}

function compareBirthYears(year1?: number | null, year2?: number | null): number {
  if (!year1 || !year2) return 0;
  
  const diff = Math.abs(year1 - year2);
  
  if (diff === 0) return 100;
  if (diff <= 1) return 90;
  if (diff <= 2) return 70;
  if (diff <= 5) return 50;
  if (diff <= 10) return 30;
  return 0;
}

function compareGenerations(gen1?: number | null, gen2?: number | null): { score: number; penaltyFactor: number; isDifferentPerson: boolean } {
  if (!gen1 || !gen2) {
    return { score: 0, penaltyFactor: 1.0, isDifferentPerson: false };
  }
  
  const diff = Math.abs(gen1 - gen2);
  
  if (diff === 0) {
    return { score: 100, penaltyFactor: 1.0, isDifferentPerson: false };
  }
  
  if (diff === 1) {
    return { score: 50, penaltyFactor: 0.7, isDifferentPerson: false };
  }
  
  if (diff >= 2) {
    return { score: 0, penaltyFactor: 0.3, isDifferentPerson: true };
  }
  
  return { score: 0, penaltyFactor: 0.5, isDifferentPerson: false };
}

/**
 * SIMPLIFIED DUPLICATE DETECTION
 * 
 * التكرار الحقيقي = نفس الأب (fatherId) + نفس الاسم الأول
 * 
 * Rules:
 * 1. If fatherId is different = NOT a duplicate (0% match for duplicate purposes)
 * 2. If fatherId is the same + firstName is similar = DUPLICATE
 * 3. Name similarity uses comprehensive Arabic normalization
 * 4. Phone/Email matches are still considered for finding existing members
 */
export function calculateMemberSimilarity(
  input: FuzzyMatchInput,
  existingMember: FamilyMember
): MatchCandidate {
  const matchReasons: string[] = [];
  const matchReasonsAr: string[] = [];
  
  // CORE DUPLICATE LOGIC: Same fatherId + Same firstName = Duplicate
  // If fatherId is different, they are DEFINITELY different people
  
  const hasSameFather = !!(input.fatherId && existingMember.fatherId && input.fatherId === existingMember.fatherId);
  const hasDifferentFather = !!(input.fatherId && existingMember.fatherId && input.fatherId !== existingMember.fatherId);
  
  // Calculate firstName similarity with improved Arabic normalization
  let firstNameScore = 0;
  if (input.firstName) {
    firstNameScore = compareNames(input.firstName, existingMember.firstName);
  }
  
  // RULE 1: Different fatherId = NOT a duplicate (regardless of name similarity)
  if (hasDifferentFather) {
    return {
      member: existingMember,
      similarityScore: 0,  // Not a duplicate candidate
      matchReasons: ['Different fathers - not a duplicate'],
      matchReasonsAr: ['آباء مختلفون - ليس تكرار'],
    };
  }
  
  // RULE 2: Same fatherId + Similar firstName = DUPLICATE (sibling with same name)
  if (hasSameFather) {
    if (firstNameScore >= SIBLING_DUPLICATE_THRESHOLD) {
      matchReasons.push(`Same father + Same name: ${firstNameScore}%`);
      matchReasonsAr.push(`نفس الأب + نفس الاسم: ${firstNameScore}%`);
      matchReasons.push('DUPLICATE: Same person registered twice under same parent');
      matchReasonsAr.push('تكرار: نفس الشخص مسجل مرتين تحت نفس الوالد');
      
      return {
        member: existingMember,
        similarityScore: firstNameScore,
        matchReasons,
        matchReasonsAr,
      };
    } else {
      // Same father but different first name = different siblings, not duplicate
      return {
        member: existingMember,
        similarityScore: firstNameScore,
        matchReasons: [`Same father, different name: ${firstNameScore}%`],
        matchReasonsAr: [`نفس الأب، اسم مختلف: ${firstNameScore}%`],
      };
    }
  }
  
  // RULE 3: No fatherId available = CANNOT determine duplicate
  // Without fatherId, we cannot know if two people with the same name are duplicates
  // Return 0 similarity to prevent false positive duplicates
  return {
    member: existingMember,
    similarityScore: 0,
    matchReasons: ['Cannot determine duplicate without fatherId'],
    matchReasonsAr: ['لا يمكن تحديد التكرار بدون معرف الأب'],
  };
}

/**
 * SIMPLIFIED DUPLICATE DETECTION
 * 
 * A duplicate ONLY exists when:
 * - Same fatherId + Same firstName (90%+ similarity)
 * 
 * This function ONLY returns duplicates, not similar members from other families.
 */
export async function findPotentialDuplicates(
  input: FuzzyMatchInput,
  options?: {
    threshold?: number;
    limit?: number;
    excludeIds?: string[];
  }
): Promise<FuzzyMatchResult> {
  const threshold = options?.threshold ?? SIBLING_DUPLICATE_THRESHOLD;  // Use 90% for duplicates
  const limit = options?.limit ?? 10;
  const excludeIds = options?.excludeIds ?? [];
  
  // RULE: Duplicates can ONLY exist among siblings (same fatherId)
  // If no fatherId provided, we cannot determine duplicates
  if (!input.fatherId) {
    return {
      hasMatches: false,
      candidates: [],
      highestScore: 0,
      isDuplicate: false,
    };
  }
  
  // Only search among siblings (same father)
  const whereClause: Record<string, unknown> = {
    fatherId: input.fatherId,
    deletedAt: null,
  };
  
  if (excludeIds.length > 0) {
    whereClause.id = { notIn: excludeIds };
  }
  
  const siblings = await prisma.familyMember.findMany({
    where: whereClause,
  });
  
  const candidates: MatchCandidate[] = [];
  
  for (const sibling of siblings) {
    // Compare only firstName with comprehensive Arabic normalization
    const firstNameScore = compareNames(input.firstName || '', sibling.firstName);
    
    if (firstNameScore >= threshold) {
      candidates.push({
        member: sibling,
        similarityScore: firstNameScore,
        matchReasons: [`Same father + Same name: ${firstNameScore}%`, 'DUPLICATE: Same person registered twice'],
        matchReasonsAr: [`نفس الأب + نفس الاسم: ${firstNameScore}%`, 'تكرار: نفس الشخص مسجل مرتين'],
      });
    }
  }
  
  candidates.sort((a, b) => b.similarityScore - a.similarityScore);
  
  const topCandidates = candidates.slice(0, limit);
  const highestScore = topCandidates.length > 0 ? topCandidates[0].similarityScore : 0;
  
  return {
    hasMatches: topCandidates.length > 0,
    candidates: topCandidates,
    highestScore,
    isDuplicate: highestScore >= SIBLING_DUPLICATE_THRESHOLD,
  };
}

export async function checkBranchDuplicate(
  firstName: string,
  fatherId: string,
  excludeMemberId?: string
): Promise<FuzzyMatchResult> {
  const whereClause: Record<string, unknown> = {
    fatherId,
    deletedAt: null,
  };
  
  if (excludeMemberId) {
    whereClause.id = { not: excludeMemberId };
  }
  
  const siblings = await prisma.familyMember.findMany({
    where: whereClause,
  });
  
  const candidates: MatchCandidate[] = [];
  
  for (const sibling of siblings) {
    const nameScore = compareNames(firstName, sibling.firstName);
    
    // VERY STRICT: Siblings under same parent cannot have similar names
    // Using SIBLING_DUPLICATE_THRESHOLD (90%) to prevent duplicate registrations
    if (nameScore >= SIBLING_DUPLICATE_THRESHOLD) {
      candidates.push({
        member: sibling,
        similarityScore: nameScore,
        matchReasons: [`Name similarity: ${nameScore}%`, 'Same parent - potential duplicate'],
        matchReasonsAr: [`تشابه الاسم: ${nameScore}%`, 'نفس الوالد - احتمال تكرار'],
      });
    }
  }
  
  candidates.sort((a, b) => b.similarityScore - a.similarityScore);
  
  const highestScore = candidates.length > 0 ? candidates[0].similarityScore : 0;
  
  return {
    hasMatches: candidates.length > 0,
    candidates,
    highestScore,
    isDuplicate: highestScore >= SIBLING_DUPLICATE_THRESHOLD,  // Consistent 90% threshold
  };
}

/**
 * Find similar pending members - uses simplified duplicate logic
 * Only returns true duplicates: same fatherId + same firstName (90%+)
 */
export async function findSimilarPendingMembers(
  pendingId: string,
  pendingData: {
    firstName: string;
    fatherName?: string;
    fatherId?: string;
    birthYear?: number;
    gender?: string;
  }
): Promise<FuzzyMatchResult> {
  return findPotentialDuplicates({
    firstName: pendingData.firstName,
    fatherName: pendingData.fatherName,
    fatherId: pendingData.fatherId || undefined,
    birthYear: pendingData.birthYear || undefined,
    gender: pendingData.gender,
  }, {
    threshold: SIBLING_DUPLICATE_THRESHOLD,  // Use 90% for duplicate detection
    limit: 5,
  });
}

export { 
  DUPLICATE_THRESHOLD, 
  HIGH_SIMILARITY_THRESHOLD,
  SIBLING_DUPLICATE_THRESHOLD,
  FULL_NAME_MATCH_THRESHOLD,
  GENERATION_MATCH_WEIGHT
};
