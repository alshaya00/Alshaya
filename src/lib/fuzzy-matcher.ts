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
}

const DUPLICATE_THRESHOLD = 80;
const HIGH_SIMILARITY_THRESHOLD = 70;

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

export function calculateMemberSimilarity(
  input: FuzzyMatchInput,
  existingMember: FamilyMember
): MatchCandidate {
  const matchReasons: string[] = [];
  const matchReasonsAr: string[] = [];
  let totalScore = 0;
  let weightSum = 0;
  
  if (input.firstName) {
    const firstNameScore = compareNames(input.firstName, existingMember.firstName);
    const weight = 40;
    totalScore += firstNameScore * weight;
    weightSum += weight;
    
    if (firstNameScore >= HIGH_SIMILARITY_THRESHOLD) {
      matchReasons.push(`First name match: ${firstNameScore}%`);
      matchReasonsAr.push(`تطابق الاسم الأول: ${firstNameScore}%`);
    }
  }
  
  if (input.fatherName && existingMember.fatherName) {
    const fatherNameScore = compareNames(input.fatherName, existingMember.fatherName);
    const weight = 25;
    totalScore += fatherNameScore * weight;
    weightSum += weight;
    
    if (fatherNameScore >= HIGH_SIMILARITY_THRESHOLD) {
      matchReasons.push(`Father name match: ${fatherNameScore}%`);
      matchReasonsAr.push(`تطابق اسم الأب: ${fatherNameScore}%`);
    }
  }
  
  if (input.fatherId && existingMember.fatherId) {
    const fatherIdMatch = input.fatherId === existingMember.fatherId;
    const weight = 20;
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
    const weight = 10;
    totalScore += grandfatherScore * weight;
    weightSum += weight;
    
    if (grandfatherScore >= HIGH_SIMILARITY_THRESHOLD) {
      matchReasons.push(`Grandfather name match: ${grandfatherScore}%`);
      matchReasonsAr.push(`تطابق اسم الجد: ${grandfatherScore}%`);
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
  
  const similarityScore = weightSum > 0 ? Math.round(totalScore / weightSum) : 0;
  
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
    select: {
      id: true,
      firstName: true,
      fatherName: true,
      grandfatherName: true,
      greatGrandfatherName: true,
      familyName: true,
      fatherId: true,
      gender: true,
      birthYear: true,
      generation: true,
      branch: true,
      fullNameAr: true,
      fullNameEn: true,
      phone: true,
      city: true,
      status: true,
    },
  });
  
  const candidates: MatchCandidate[] = [];
  
  for (const sibling of siblings) {
    const nameScore = compareNames(firstName, sibling.firstName);
    
    if (nameScore >= 70) {
      candidates.push({
        member: sibling as unknown as FamilyMember,
        similarityScore: nameScore,
        matchReasons: [`Name similarity: ${nameScore}%`, 'Same parent'],
        matchReasonsAr: [`تشابه الاسم: ${nameScore}%`, 'نفس الوالد'],
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
    threshold: 70,
    limit: 5,
  });
}

export { DUPLICATE_THRESHOLD, HIGH_SIMILARITY_THRESHOLD };
