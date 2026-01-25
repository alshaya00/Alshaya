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

function normalizeArabicName(name: string): string {
  if (!name) return '';
  
  return name
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
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

export function calculateMemberSimilarity(
  input: FuzzyMatchInput,
  existingMember: FamilyMember
): MatchCandidate {
  const matchReasons: string[] = [];
  const matchReasonsAr: string[] = [];
  let totalScore = 0;
  let weightSum = 0;
  
  // IMPROVED WEIGHTS: Give more importance to the full 4-part name (الاسم الرباعي)
  if (input.firstName) {
    const firstNameScore = compareNames(input.firstName, existingMember.firstName);
    const weight = 35;  // Increased from 30
    totalScore += firstNameScore * weight;
    weightSum += weight;
    
    if (firstNameScore >= HIGH_SIMILARITY_THRESHOLD) {
      matchReasons.push(`First name match: ${firstNameScore}%`);
      matchReasonsAr.push(`تطابق الاسم الأول: ${firstNameScore}%`);
    }
  }
  
  if (input.fatherName && existingMember.fatherName) {
    const fatherNameScore = compareNames(input.fatherName, existingMember.fatherName);
    const weight = 25;  // Increased from 15 - father name is critical
    totalScore += fatherNameScore * weight;
    weightSum += weight;
    
    if (fatherNameScore >= HIGH_SIMILARITY_THRESHOLD) {
      matchReasons.push(`Father name match: ${fatherNameScore}%`);
      matchReasonsAr.push(`تطابق اسم الأب: ${fatherNameScore}%`);
    }
  }
  
  if (input.fatherId && existingMember.fatherId) {
    const fatherIdMatch = input.fatherId === existingMember.fatherId;
    const weight = 50;
    const score = fatherIdMatch ? 100 : 0;
    totalScore += score * weight;
    weightSum += weight;
    
    if (fatherIdMatch) {
      matchReasons.push('Same father (linked)');
      matchReasonsAr.push('نفس الأب (مرتبط)');
    }
  }
  
  if (input.grandfatherName && existingMember.grandfatherName) {
    const grandfatherScore = compareNames(input.grandfatherName, existingMember.grandfatherName);
    const weight = 20;  // Increased from 10 - grandfather name is part of الاسم الرباعي
    totalScore += grandfatherScore * weight;
    weightSum += weight;
    
    if (grandfatherScore >= HIGH_SIMILARITY_THRESHOLD) {
      matchReasons.push(`Grandfather name match: ${grandfatherScore}%`);
      matchReasonsAr.push(`تطابق اسم الجد: ${grandfatherScore}%`);
    }
  }
  
  // FULL 4-PART NAME CHECK (الاسم الرباعي) - includes great-grandfather when available
  // Priority: 4-part name (with great-grandfather) > 3-part name (fallback)
  if (input.firstName && input.fatherName && existingMember.fatherName) {
    let fullInputName = `${input.firstName} ${input.fatherName}`;
    let fullExistingName = `${existingMember.firstName} ${existingMember.fatherName}`;
    let partsCount = 2;
    
    // Add grandfather if available
    if (input.grandfatherName && existingMember.grandfatherName) {
      fullInputName += ` ${input.grandfatherName}`;
      fullExistingName += ` ${existingMember.grandfatherName}`;
      partsCount = 3;
    }
    
    // Add great-grandfather if available (true 4-part name)
    if (partsCount === 3 && existingMember.greatGrandfatherName) {
      fullExistingName += ` ${existingMember.greatGrandfatherName}`;
      // Note: input may not have greatGrandfatherName, but we can still compare
      // The Levenshtein distance will account for the difference
    }
    
    // Only apply full name check if we have at least 3 parts
    if (partsCount >= 3) {
      const fullNameScore = calculateStringSimilarity(fullInputName, fullExistingName);
      
      if (fullNameScore >= FULL_NAME_MATCH_THRESHOLD) {
        const weight = partsCount === 3 ? 20 : 25;  // Higher weight for 4-part match
        totalScore += fullNameScore * weight;
        weightSum += weight;
        matchReasons.push(`Full name match (الاسم الرباعي): ${fullNameScore}%`);
        matchReasonsAr.push(`تطابق الاسم الرباعي الكامل: ${fullNameScore}%`);
      }
    }
  }
  
  if (input.birthYear && existingMember.birthYear) {
    const birthYearScore = compareBirthYears(input.birthYear, existingMember.birthYear);
    const weight = 15;
    totalScore += birthYearScore * weight;
    weightSum += weight;
    
    if (birthYearScore >= 70) {
      matchReasons.push(`Birth year match: ${existingMember.birthYear}`);
      matchReasonsAr.push(`تطابق سنة الميلاد: ${existingMember.birthYear}`);
    }
  }
  
  if (input.gender && existingMember.gender) {
    const genderMatch = input.gender === existingMember.gender;
    const weight = 5;
    const score = genderMatch ? 100 : 0;
    totalScore += score * weight;
    weightSum += weight;
  }

  if (input.phone && existingMember.phone) {
    const normalizedInputPhone = input.phone.replace(/\D/g, '').slice(-9);
    const normalizedMemberPhone = existingMember.phone.replace(/\D/g, '').slice(-9);
    const phoneMatch = normalizedInputPhone === normalizedMemberPhone && normalizedInputPhone.length >= 9;
    
    if (phoneMatch) {
      const weight = 50;
      totalScore += 100 * weight;
      weightSum += weight;
      matchReasons.push('Phone number match');
      matchReasonsAr.push('تطابق رقم الهاتف');
    }
  }

  if (input.email && existingMember.email) {
    const emailMatch = input.email.toLowerCase().trim() === existingMember.email.toLowerCase().trim();
    
    if (emailMatch) {
      const weight = 40;
      totalScore += 100 * weight;
      weightSum += weight;
      matchReasons.push('Email match');
      matchReasonsAr.push('تطابق البريد الإلكتروني');
    }
  }
  
  let rawSimilarityScore = weightSum > 0 ? Math.round(totalScore / weightSum) : 0;
  
  const generationComparison = compareGenerations(input.generation, existingMember.generation);
  
  if (input.generation && existingMember.generation) {
    const genScore = generationComparison.score;
    totalScore += genScore * GENERATION_MATCH_WEIGHT;
    weightSum += GENERATION_MATCH_WEIGHT;
    rawSimilarityScore = weightSum > 0 ? Math.round(totalScore / weightSum) : 0;
  }
  
  if (generationComparison.isDifferentPerson) {
    rawSimilarityScore = Math.min(rawSimilarityScore, 40);
    matchReasons.push(`CRITICAL: Generation mismatch (${Math.abs((input.generation || 0) - (existingMember.generation || 0))} generations apart) - DIFFERENT PEOPLE with same name`);
    matchReasonsAr.push(`تحذير خطير: اختلاف الجيل (${Math.abs((input.generation || 0) - (existingMember.generation || 0))} أجيال) - أشخاص مختلفون بنفس الاسم`);
  } else if (generationComparison.score > 0 && generationComparison.score < 100) {
    rawSimilarityScore = Math.round(rawSimilarityScore * generationComparison.penaltyFactor);
    matchReasons.push(`Generation difference: input Gen ${input.generation} vs member Gen ${existingMember.generation}`);
    matchReasonsAr.push(`فارق الجيل: المدخل جيل ${input.generation} مقابل العضو جيل ${existingMember.generation}`);
  } else if (input.generation && existingMember.generation && generationComparison.score === 100) {
    matchReasons.push(`Same generation: Gen ${existingMember.generation}`);
    matchReasonsAr.push(`نفس الجيل: الجيل ${existingMember.generation}`);
  }
  
  const similarityScore = rawSimilarityScore;
  
  return {
    member: existingMember,
    similarityScore,
    matchReasons,
    matchReasonsAr,
  };
}

export async function findPotentialDuplicates(
  input: FuzzyMatchInput,
  options?: {
    threshold?: number;
    limit?: number;
    excludeIds?: string[];
  }
): Promise<FuzzyMatchResult> {
  const threshold = options?.threshold ?? HIGH_SIMILARITY_THRESHOLD;
  const limit = options?.limit ?? 10;
  const excludeIds = options?.excludeIds ?? [];
  
  const whereClause: Record<string, unknown> = {
    deletedAt: null,
  };
  
  if (excludeIds.length > 0) {
    whereClause.id = { notIn: excludeIds };
  }
  
  if (input.fatherId) {
    whereClause.fatherId = input.fatherId;
  }
  
  let members = await prisma.familyMember.findMany({
    where: whereClause,
    take: 500,
  });
  
  if (members.length === 0 && input.fatherId) {
    delete whereClause.fatherId;
    members = await prisma.familyMember.findMany({
      where: whereClause,
      take: 500,
    });
  }
  
  const candidates: MatchCandidate[] = [];
  
  for (const member of members) {
    const matchResult = calculateMemberSimilarity(input, member);
    
    if (matchResult.similarityScore >= threshold) {
      candidates.push(matchResult);
    }
  }
  
  candidates.sort((a, b) => b.similarityScore - a.similarityScore);
  
  const topCandidates = candidates.slice(0, limit);
  const highestScore = topCandidates.length > 0 ? topCandidates[0].similarityScore : 0;
  
  return {
    hasMatches: topCandidates.length > 0,
    candidates: topCandidates,
    highestScore,
    isDuplicate: highestScore >= DUPLICATE_THRESHOLD,
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
    isDuplicate: highestScore >= DUPLICATE_THRESHOLD,
  };
}

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
    threshold: HIGH_SIMILARITY_THRESHOLD,  // Use improved threshold
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
