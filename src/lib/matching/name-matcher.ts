// آل شايع Family Tree - Name Matching Service
// Intelligent matching algorithm for finding family placement

import { FamilyMember } from '../types';
import {
  normalizeArabicName,
  comprehensiveNameMatch,
  calculateNameSimilarity,
  NameMatchResult,
} from './arabic-utils';
import { getLineagePath } from '../lineage-utils';

/**
 * Input from the quick-add form
 */
export interface NameInput {
  firstName: string;          // الاسم الأول - Name of the person being added
  fatherName: string;         // اسم الأب - Father's first name
  grandfatherName?: string;   // اسم الجد - Grandfather's first name
  greatGrandfatherName?: string; // اسم جد الأب - Great-grandfather's first name
  great2GrandfatherName?: string; // جد الجد الثالث - 5th ancestor
  great3GrandfatherName?: string; // جد الجد الرابع - 6th ancestor
}

/**
 * Detailed match information for a single ancestor level
 */
export interface AncestorMatch {
  inputName: string;           // What the user entered
  matchedName: string;         // Name in database
  matchedMember: FamilyMember | null;
  matchResult: NameMatchResult;
  generation: number;
}

/**
 * A candidate father with full context
 */
export interface MatchCandidate {
  // The matched father
  fatherId: string;
  father: FamilyMember;

  // Match quality
  matchScore: number;          // 0-100 overall score
  matchLevel: 'exact' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';

  // Detailed match breakdown
  ancestorMatches: {
    father: AncestorMatch;
    grandfather: AncestorMatch | null;
    greatGrandfather: AncestorMatch | null;
    great2Grandfather: AncestorMatch | null;
    great3Grandfather: AncestorMatch | null;
  };

  // Family context for confirmation
  siblings: FamilyMember[];           // Father's other children (your siblings)
  unclesAunts: FamilyMember[];        // Father's siblings (your uncles/aunts)
  cousins: FamilyMember[];            // Children of uncles/aunts

  // Lineage information
  grandfather: FamilyMember | null;
  greatGrandfather: FamilyMember | null;
  great2Grandfather: FamilyMember | null;
  great3Grandfather: FamilyMember | null;
  fullLineage: FamilyMember[];        // All ancestors from Gen 1 to father

  // Calculated fields for new member
  generation: number;                  // Father's generation + 1
  branch: string | null;
  lineagePath: string[];

  // Full name preview (to Gen 1)
  fullNamePreview: string;
  fullNamePreviewEn: string;
}

/**
 * Result of the matching operation
 */
export interface MatchResult {
  // Categorized matches
  exactMatches: MatchCandidate[];     // 100% confidence
  highMatches: MatchCandidate[];      // 80-99% confidence
  mediumMatches: MatchCandidate[];    // 60-79% confidence
  lowMatches: MatchCandidate[];       // Below 60%

  // All matches sorted by score
  allMatches: MatchCandidate[];

  // Status
  hasMatches: boolean;
  matchCount: number;
  bestMatch: MatchCandidate | null;

  // Suggested action
  suggestedAction: 'confirm' | 'select' | 'manual' | 'no_match';
  message: string;
  messageAr: string;
}

/**
 * Configuration for the matching algorithm
 */
export interface MatchConfig {
  // Weight for each ancestor level (should sum to 100)
  fatherWeight: number;              // Default: 40
  grandfatherWeight: number;         // Default: 30
  greatGrandfatherWeight: number;    // Default: 15
  great2GrandfatherWeight: number;   // Default: 10
  great3GrandfatherWeight: number;   // Default: 5

  // Minimum scores to consider a match
  minimumTotalScore: number;         // Default: 40
  minimumFatherScore: number;        // Default: 70

  // Include low-confidence matches?
  includeLowConfidence: boolean;     // Default: true
}

const DEFAULT_CONFIG: MatchConfig = {
  fatherWeight: 40,
  grandfatherWeight: 30,
  greatGrandfatherWeight: 15,
  great2GrandfatherWeight: 10,
  great3GrandfatherWeight: 5,
  minimumTotalScore: 40,
  minimumFatherScore: 70,
  includeLowConfidence: true,
};

/**
 * Build a member lookup map for O(1) access
 */
function buildMemberMap(members: FamilyMember[]): Map<string, FamilyMember> {
  const map = new Map<string, FamilyMember>();
  members.forEach(m => map.set(m.id, m));
  return map;
}

/**
 * Get full lineage from Gen 1 to a member
 */
function getFullLineage(
  memberId: string,
  memberMap: Map<string, FamilyMember>
): FamilyMember[] {
  const lineage: FamilyMember[] = [];
  let current = memberMap.get(memberId);

  while (current) {
    lineage.unshift(current);
    if (current.fatherId) {
      current = memberMap.get(current.fatherId);
    } else {
      break;
    }
  }

  return lineage;
}

/**
 * Generate full Arabic name string from lineage (father first, then grandfather, etc.)
 * Lineage array is [oldest, ..., father], so we iterate in reverse
 */
function generateFullName(
  firstName: string,
  gender: 'Male' | 'Female',
  lineage: FamilyMember[],
  familyName: string = 'آل شايع'
): string {
  const connector = gender === 'Male' ? 'بن' : 'بنت';
  const parts = [firstName];

  // Iterate in reverse: father first, then grandfather, then great-grandfather, etc.
  for (let i = lineage.length - 1; i >= 0; i--) {
    parts.push(connector);
    parts.push(lineage[i].firstName);
  }

  parts.push(familyName);
  return parts.join(' ');
}

/**
 * Generate full English name string from lineage (father first, then grandfather, etc.)
 * Lineage array is [oldest, ..., father], so we iterate in reverse
 * Uses space separator only (no bin/bint)
 */
function generateFullNameEn(
  firstName: string,
  gender: 'Male' | 'Female',
  lineage: FamilyMember[],
  familyName: string = 'Al-Shaye'
): string {
  const parts = [firstName];

  // Iterate in reverse: father first, then grandfather, then great-grandfather, etc.
  for (let i = lineage.length - 1; i >= 0; i--) {
    // Use English name if available, otherwise use Arabic firstName
    parts.push(lineage[i].fullNameEn?.split(' ')[0] || lineage[i].firstName);
  }

  parts.push(familyName);
  return parts.join(' ');
}

/**
 * Find all members with children (potential fathers)
 */
function getPotentialFathers(
  members: FamilyMember[],
  fatherName: string,
  config: MatchConfig
): { member: FamilyMember; nameMatch: NameMatchResult }[] {
  const results: { member: FamilyMember; nameMatch: NameMatchResult }[] = [];

  for (const member of members) {
    // Only males can be fathers - females cannot have children under them in the family tree
    if (member.gender !== 'Male') continue;

    const nameMatch = comprehensiveNameMatch(member.firstName, fatherName);

    // Must meet minimum father score
    if (nameMatch.similarity >= config.minimumFatherScore ||
        (nameMatch.isMatch && nameMatch.confidence !== 'low')) {
      results.push({ member, nameMatch });
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.nameMatch.similarity - a.nameMatch.similarity);

  return results;
}

/**
 * Calculate weighted match score for a candidate
 */
function calculateCandidateScore(
  fatherMatch: NameMatchResult,
  grandfatherMatch: NameMatchResult | null,
  greatGrandfatherMatch: NameMatchResult | null,
  great2GrandfatherMatch: NameMatchResult | null,
  great3GrandfatherMatch: NameMatchResult | null,
  config: MatchConfig
): number {
  let totalScore = 0;
  let totalWeight = 0;

  // Father score (always counts)
  totalScore += fatherMatch.similarity * config.fatherWeight;
  totalWeight += config.fatherWeight;

  // Grandfather score (if provided and found)
  if (grandfatherMatch) {
    totalScore += grandfatherMatch.similarity * config.grandfatherWeight;
    totalWeight += config.grandfatherWeight;
  }

  // Great-grandfather score (if provided and found)
  if (greatGrandfatherMatch) {
    totalScore += greatGrandfatherMatch.similarity * config.greatGrandfatherWeight;
    totalWeight += config.greatGrandfatherWeight;
  }

  // Great2-grandfather score (if provided and found)
  if (great2GrandfatherMatch) {
    totalScore += great2GrandfatherMatch.similarity * config.great2GrandfatherWeight;
    totalWeight += config.great2GrandfatherWeight;
  }

  // Great3-grandfather score (if provided and found)
  if (great3GrandfatherMatch) {
    totalScore += great3GrandfatherMatch.similarity * config.great3GrandfatherWeight;
    totalWeight += config.great3GrandfatherWeight;
  }

  // Normalize to 0-100
  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

/**
 * Determine match level from score
 */
function getMatchLevel(score: number): 'exact' | 'high' | 'medium' | 'low' {
  if (score >= 95) return 'exact';
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

/**
 * Determine confidence from match details
 */
function getConfidence(
  score: number,
  fatherMatch: NameMatchResult,
  hasGrandfatherMatch: boolean,
  hasGreatGrandfatherMatch: boolean,
  hasGreat2GrandfatherMatch: boolean = false,
  hasGreat3GrandfatherMatch: boolean = false
): 'high' | 'medium' | 'low' {
  const ancestorMatchCount = [hasGrandfatherMatch, hasGreatGrandfatherMatch, hasGreat2GrandfatherMatch, hasGreat3GrandfatherMatch].filter(Boolean).length;
  
  // High confidence: exact father match + at least one ancestor confirmed
  if (fatherMatch.matchType === 'exact' || fatherMatch.matchType === 'normalized') {
    if (ancestorMatchCount >= 1) {
      return 'high';
    }
    return score >= 90 ? 'high' : 'medium';
  }

  // Medium confidence: variation or phonetic match with ancestor confirmation
  if (fatherMatch.matchType === 'variation' || fatherMatch.matchType === 'phonetic') {
    if (ancestorMatchCount >= 2) {
      return 'high';
    }
    return 'medium';
  }

  // Low confidence: fuzzy match only
  return score >= 70 ? 'medium' : 'low';
}

/**
 * Main matching function
 * Finds potential fathers based on lineage names
 */
export function findMatches(
  input: NameInput,
  allMembers: FamilyMember[],
  config: Partial<MatchConfig> = {}
): MatchResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const memberMap = buildMemberMap(allMembers);
  const candidates: MatchCandidate[] = [];

  // Step 1: Find all potential fathers by name
  const potentialFathers = getPotentialFathers(allMembers, input.fatherName, cfg);

  // Step 2: For each potential father, check ancestor chain
  for (const { member: father, nameMatch: fatherMatch } of potentialFathers) {
    // Get father's ancestors
    const grandfather = father.fatherId ? memberMap.get(father.fatherId) || null : null;
    const greatGrandfather = grandfather?.fatherId
      ? memberMap.get(grandfather.fatherId) || null
      : null;
    const great2Grandfather = greatGrandfather?.fatherId
      ? memberMap.get(greatGrandfather.fatherId) || null
      : null;
    const great3Grandfather = great2Grandfather?.fatherId
      ? memberMap.get(great2Grandfather.fatherId) || null
      : null;

    // Match grandfather if input provided
    let grandfatherMatch: NameMatchResult | null = null;
    if (input.grandfatherName && grandfather) {
      grandfatherMatch = comprehensiveNameMatch(
        grandfather.firstName,
        input.grandfatherName
      );
    }

    // Match great-grandfather if input provided
    let greatGrandfatherMatch: NameMatchResult | null = null;
    if (input.greatGrandfatherName && greatGrandfather) {
      greatGrandfatherMatch = comprehensiveNameMatch(
        greatGrandfather.firstName,
        input.greatGrandfatherName
      );
    }

    // Match great2-grandfather if input provided
    let great2GrandfatherMatch: NameMatchResult | null = null;
    if (input.great2GrandfatherName && great2Grandfather) {
      great2GrandfatherMatch = comprehensiveNameMatch(
        great2Grandfather.firstName,
        input.great2GrandfatherName
      );
    }

    // Match great3-grandfather if input provided
    let great3GrandfatherMatch: NameMatchResult | null = null;
    if (input.great3GrandfatherName && great3Grandfather) {
      great3GrandfatherMatch = comprehensiveNameMatch(
        great3Grandfather.firstName,
        input.great3GrandfatherName
      );
    }

    // Calculate overall score
    const matchScore = calculateCandidateScore(
      fatherMatch,
      input.grandfatherName ? grandfatherMatch : null,
      input.greatGrandfatherName ? greatGrandfatherMatch : null,
      input.great2GrandfatherName ? great2GrandfatherMatch : null,
      input.great3GrandfatherName ? great3GrandfatherMatch : null,
      cfg
    );

    // Skip if below minimum
    if (matchScore < cfg.minimumTotalScore) continue;

    // Determine match quality
    const matchLevel = getMatchLevel(matchScore);
    const confidence = getConfidence(
      matchScore,
      fatherMatch,
      grandfatherMatch?.isMatch || false,
      greatGrandfatherMatch?.isMatch || false,
      great2GrandfatherMatch?.isMatch || false,
      great3GrandfatherMatch?.isMatch || false
    );

    // Skip low confidence if not included
    if (!cfg.includeLowConfidence && confidence === 'low') continue;

    // Get family context
    const siblings = allMembers.filter(m => m.fatherId === father.id);
    const unclesAunts = grandfather
      ? allMembers.filter(m => m.fatherId === grandfather.id && m.id !== father.id)
      : [];
    const cousins = unclesAunts.flatMap(ua =>
      allMembers.filter(m => m.fatherId === ua.id)
    );

    // Get full lineage
    const fullLineage = getFullLineage(father.id, memberMap);
    const lineagePath = fullLineage.map(m => m.id);

    // Generate full name preview
    const fullNamePreview = generateFullName(
      input.firstName,
      'Male', // Default, will be updated in form
      fullLineage,
      father.familyName
    );
    const fullNamePreviewEn = generateFullNameEn(
      input.firstName,
      'Male',
      fullLineage,
      'Al-Shaye'
    );

    // Build candidate
    const candidate: MatchCandidate = {
      fatherId: father.id,
      father,
      matchScore,
      matchLevel,
      confidence,
      ancestorMatches: {
        father: {
          inputName: input.fatherName,
          matchedName: father.firstName,
          matchedMember: father,
          matchResult: fatherMatch,
          generation: father.generation,
        },
        grandfather: grandfather && input.grandfatherName ? {
          inputName: input.grandfatherName,
          matchedName: grandfather.firstName,
          matchedMember: grandfather,
          matchResult: grandfatherMatch!,
          generation: grandfather.generation,
        } : null,
        greatGrandfather: greatGrandfather && input.greatGrandfatherName ? {
          inputName: input.greatGrandfatherName,
          matchedName: greatGrandfather.firstName,
          matchedMember: greatGrandfather,
          matchResult: greatGrandfatherMatch!,
          generation: greatGrandfather.generation,
        } : null,
        great2Grandfather: great2Grandfather && input.great2GrandfatherName ? {
          inputName: input.great2GrandfatherName,
          matchedName: great2Grandfather.firstName,
          matchedMember: great2Grandfather,
          matchResult: great2GrandfatherMatch!,
          generation: great2Grandfather.generation,
        } : null,
        great3Grandfather: great3Grandfather && input.great3GrandfatherName ? {
          inputName: input.great3GrandfatherName,
          matchedName: great3Grandfather.firstName,
          matchedMember: great3Grandfather,
          matchResult: great3GrandfatherMatch!,
          generation: great3Grandfather.generation,
        } : null,
      },
      siblings,
      unclesAunts,
      cousins,
      grandfather,
      greatGrandfather,
      great2Grandfather,
      great3Grandfather,
      fullLineage,
      generation: father.generation + 1,
      branch: father.branch,
      lineagePath,
      fullNamePreview,
      fullNamePreviewEn,
    };

    candidates.push(candidate);
  }

  // Sort by score descending
  candidates.sort((a, b) => b.matchScore - a.matchScore);

  // Categorize matches
  const exactMatches = candidates.filter(c => c.matchLevel === 'exact');
  const highMatches = candidates.filter(c => c.matchLevel === 'high');
  const mediumMatches = candidates.filter(c => c.matchLevel === 'medium');
  const lowMatches = candidates.filter(c => c.matchLevel === 'low');

  // Determine suggested action
  let suggestedAction: 'confirm' | 'select' | 'manual' | 'no_match';
  let message: string;
  let messageAr: string;

  if (exactMatches.length === 1) {
    suggestedAction = 'confirm';
    message = 'Exact match found. Please confirm the placement.';
    messageAr = 'تم العثور على تطابق تام. الرجاء تأكيد الموقع.';
  } else if (exactMatches.length > 1) {
    suggestedAction = 'select';
    message = `Found ${exactMatches.length} possible matches. Please select the correct one.`;
    messageAr = `تم العثور على ${exactMatches.length} تطابقات محتملة. الرجاء اختيار الصحيح.`;
  } else if (highMatches.length === 1) {
    suggestedAction = 'confirm';
    message = 'High confidence match found. Please confirm the placement.';
    messageAr = 'تم العثور على تطابق بثقة عالية. الرجاء تأكيد الموقع.';
  } else if (highMatches.length > 1 || (highMatches.length === 0 && mediumMatches.length > 0)) {
    suggestedAction = 'select';
    const count = highMatches.length + mediumMatches.length;
    message = `Found ${count} possible matches. Please select the correct one.`;
    messageAr = `تم العثور على ${count} تطابقات محتملة. الرجاء اختيار الصحيح.`;
  } else if (candidates.length > 0) {
    suggestedAction = 'select';
    message = 'Low confidence matches found. Please verify carefully.';
    messageAr = 'تم العثور على تطابقات بثقة منخفضة. الرجاء التحقق بعناية.';
  } else {
    suggestedAction = 'no_match';
    message = 'No matches found. Please navigate the family tree manually.';
    messageAr = 'لم يتم العثور على تطابقات. الرجاء التنقل في شجرة العائلة يدوياً.';
  }

  return {
    exactMatches,
    highMatches,
    mediumMatches,
    lowMatches,
    allMatches: candidates,
    hasMatches: candidates.length > 0,
    matchCount: candidates.length,
    bestMatch: candidates[0] || null,
    suggestedAction,
    message,
    messageAr,
  };
}

/**
 * Get match details for display
 * Returns human-readable explanation of the match
 */
export function getMatchExplanation(candidate: MatchCandidate): {
  summary: string;
  summaryAr: string;
  details: string[];
  detailsAr: string[];
} {
  const details: string[] = [];
  const detailsAr: string[] = [];

  // Father match details
  const fm = candidate.ancestorMatches.father;
  if (fm.matchResult.matchType === 'exact') {
    details.push(`Father name "${fm.inputName}" matches exactly with "${fm.matchedName}"`);
    detailsAr.push(`اسم الأب "${fm.inputName}" يتطابق تماماً مع "${fm.matchedName}"`);
  } else if (fm.matchResult.matchType === 'normalized') {
    details.push(`Father name "${fm.inputName}" matches "${fm.matchedName}" after normalization`);
    detailsAr.push(`اسم الأب "${fm.inputName}" يتطابق مع "${fm.matchedName}" بعد التطبيع`);
  } else if (fm.matchResult.matchType === 'variation') {
    details.push(`Father name "${fm.inputName}" is a known variation of "${fm.matchedName}"`);
    detailsAr.push(`اسم الأب "${fm.inputName}" هو شكل آخر معروف لـ "${fm.matchedName}"`);
  } else {
    details.push(`Father name "${fm.inputName}" is similar to "${fm.matchedName}" (${fm.matchResult.similarity}% match)`);
    detailsAr.push(`اسم الأب "${fm.inputName}" مشابه لـ "${fm.matchedName}" (${fm.matchResult.similarity}% تطابق)`);
  }

  // Grandfather match details
  const gm = candidate.ancestorMatches.grandfather;
  if (gm) {
    if (gm.matchResult.isMatch) {
      details.push(`Grandfather name "${gm.inputName}" confirmed as "${gm.matchedName}"`);
      detailsAr.push(`اسم الجد "${gm.inputName}" مؤكد كـ "${gm.matchedName}"`);
    } else {
      details.push(`Grandfather name "${gm.inputName}" does not match "${gm.matchedName}"`);
      detailsAr.push(`اسم الجد "${gm.inputName}" لا يتطابق مع "${gm.matchedName}"`);
    }
  }

  // Great-grandfather match details
  const ggm = candidate.ancestorMatches.greatGrandfather;
  if (ggm) {
    if (ggm.matchResult.isMatch) {
      details.push(`Great-grandfather name "${ggm.inputName}" confirmed as "${ggm.matchedName}"`);
      detailsAr.push(`اسم جد الأب "${ggm.inputName}" مؤكد كـ "${ggm.matchedName}"`);
    } else {
      details.push(`Great-grandfather name "${ggm.inputName}" does not match "${ggm.matchedName}"`);
      detailsAr.push(`اسم جد الأب "${ggm.inputName}" لا يتطابق مع "${ggm.matchedName}"`);
    }
  }

  // Great2-grandfather match details (5th ancestor)
  const g2gm = candidate.ancestorMatches.great2Grandfather;
  if (g2gm) {
    if (g2gm.matchResult.isMatch) {
      details.push(`5th ancestor name "${g2gm.inputName}" confirmed as "${g2gm.matchedName}"`);
      detailsAr.push(`اسم جد الجد الثالث "${g2gm.inputName}" مؤكد كـ "${g2gm.matchedName}"`);
    } else {
      details.push(`5th ancestor name "${g2gm.inputName}" does not match "${g2gm.matchedName}"`);
      detailsAr.push(`اسم جد الجد الثالث "${g2gm.inputName}" لا يتطابق مع "${g2gm.matchedName}"`);
    }
  }

  // Great3-grandfather match details (6th ancestor)
  const g3gm = candidate.ancestorMatches.great3Grandfather;
  if (g3gm) {
    if (g3gm.matchResult.isMatch) {
      details.push(`6th ancestor name "${g3gm.inputName}" confirmed as "${g3gm.matchedName}"`);
      detailsAr.push(`اسم جد الجد الرابع "${g3gm.inputName}" مؤكد كـ "${g3gm.matchedName}"`);
    } else {
      details.push(`6th ancestor name "${g3gm.inputName}" does not match "${g3gm.matchedName}"`);
      detailsAr.push(`اسم جد الجد الرابع "${g3gm.inputName}" لا يتطابق مع "${g3gm.matchedName}"`);
    }
  }

  // Summary
  const summary = `${candidate.matchScore}% match confidence - ${candidate.confidence} confidence level`;
  const summaryAr = `${candidate.matchScore}% نسبة التطابق - مستوى ثقة ${
    candidate.confidence === 'high' ? 'عالي' :
    candidate.confidence === 'medium' ? 'متوسط' : 'منخفض'
  }`;

  return { summary, summaryAr, details, detailsAr };
}

/**
 * Compare two candidates for the user to select
 */
export function compareCandidates(
  candidate1: MatchCandidate,
  candidate2: MatchCandidate
): {
  differences: string[];
  differencesAr: string[];
  recommendation: 1 | 2 | null;
} {
  const differences: string[] = [];
  const differencesAr: string[] = [];

  // Compare generations
  if (candidate1.generation !== candidate2.generation) {
    differences.push(`Generation: ${candidate1.generation} vs ${candidate2.generation}`);
    differencesAr.push(`الجيل: ${candidate1.generation} مقابل ${candidate2.generation}`);
  }

  // Compare branches
  if (candidate1.branch !== candidate2.branch) {
    differences.push(`Branch: ${candidate1.branch || 'Unknown'} vs ${candidate2.branch || 'Unknown'}`);
    differencesAr.push(`الفرع: ${candidate1.branch || 'غير معروف'} مقابل ${candidate2.branch || 'غير معروف'}`);
  }

  // Compare sibling counts
  differences.push(`Siblings: ${candidate1.siblings.length} vs ${candidate2.siblings.length}`);
  differencesAr.push(`الإخوة: ${candidate1.siblings.length} مقابل ${candidate2.siblings.length}`);

  // Compare uncle/aunt counts
  differences.push(`Uncles/Aunts: ${candidate1.unclesAunts.length} vs ${candidate2.unclesAunts.length}`);
  differencesAr.push(`الأعمام/العمات: ${candidate1.unclesAunts.length} مقابل ${candidate2.unclesAunts.length}`);

  // Recommendation based on score
  let recommendation: 1 | 2 | null = null;
  if (candidate1.matchScore > candidate2.matchScore + 10) {
    recommendation = 1;
  } else if (candidate2.matchScore > candidate1.matchScore + 10) {
    recommendation = 2;
  }

  return { differences, differencesAr, recommendation };
}

/**
 * Validate input before matching
 */
export function validateInput(input: NameInput): {
  valid: boolean;
  errors: string[];
  errorsAr: string[];
} {
  const errors: string[] = [];
  const errorsAr: string[] = [];

  if (!input.firstName || input.firstName.trim().length === 0) {
    errors.push('First name is required');
    errorsAr.push('الاسم الأول مطلوب');
  }

  if (!input.fatherName || input.fatherName.trim().length === 0) {
    errors.push('Father name is required');
    errorsAr.push('اسم الأب مطلوب');
  }

  // Warn if only first name and father name provided
  if (!input.grandfatherName && !input.greatGrandfatherName) {
    errors.push('Please provide grandfather name for better matching');
    errorsAr.push('الرجاء إدخال اسم الجد للحصول على تطابق أفضل');
  }

  return {
    valid: errors.length <= 1, // Allow just the warning
    errors,
    errorsAr,
  };
}
