/**
 * Lineage Calculation Utilities for آل شايع Family Tree
 *
 * Calculates:
 * - lineagePath: JSON array of ancestor IDs from root to parent
 * - lineageBranchId: ID of Gen 2 ancestor (main branch founder)
 * - lineageBranchName: Name of Gen 2 ancestor
 * - subBranchId: ID of Gen 3 ancestor (sub-branch founder)
 * - subBranchName: Name of Gen 3 ancestor
 * - sonsCount: Number of male children
 * - daughtersCount: Number of female children
 */

export interface FamilyMemberBase {
  id: string;
  firstName: string;
  fatherId: string | null;
  gender: string;
  generation: number;
}

/**
 * Build a map of parent ID to children for efficient lookup
 */
export function buildChildrenMap<T extends FamilyMemberBase>(members: T[]): Map<string, T[]> {
  const childrenMap = new Map<string, T[]>();

  for (const member of members) {
    if (member.fatherId) {
      const children = childrenMap.get(member.fatherId) || [];
      children.push(member);
      childrenMap.set(member.fatherId, children);
    }
  }

  return childrenMap;
}

/**
 * Build a map of ID to member for efficient lookup
 */
export function buildMemberMap<T extends FamilyMemberBase>(members: T[]): Map<string, T> {
  return new Map(members.map(m => [m.id, m]));
}

/**
 * Calculate lineage path from root to parent (array of ancestor IDs)
 */
export function calculateLineagePath(
  memberId: string,
  memberMap: Map<string, FamilyMemberBase>
): string[] {
  const path: string[] = [];
  const member = memberMap.get(memberId);

  if (!member || !member.fatherId) {
    return path;
  }

  // Walk up the tree to find all ancestors
  let currentId: string | null = member.fatherId;
  while (currentId) {
    path.unshift(currentId);
    const parent = memberMap.get(currentId);
    currentId = parent?.fatherId || null;
  }

  return path;
}

/**
 * Find ancestor at specific generation
 */
export function findAncestorAtGeneration(
  memberId: string,
  targetGeneration: number,
  memberMap: Map<string, FamilyMemberBase>
): FamilyMemberBase | null {
  const member = memberMap.get(memberId);
  if (!member) return null;

  // If already at or before target generation
  if (member.generation <= targetGeneration) {
    return member.generation === targetGeneration ? member : null;
  }

  // Walk up to find ancestor at target generation
  let current: FamilyMemberBase | undefined = member;
  while (current && current.generation > targetGeneration) {
    if (!current.fatherId) return null;
    current = memberMap.get(current.fatherId);
  }

  return current?.generation === targetGeneration ? current : null;
}

/**
 * Calculate lineage branch info (Gen 2 and Gen 3 ancestors)
 */
export function calculateLineageBranch(
  memberId: string,
  memberMap: Map<string, FamilyMemberBase>
): {
  lineageBranchId: string | null;
  lineageBranchName: string | null;
  subBranchId: string | null;
  subBranchName: string | null;
} {
  const gen2Ancestor = findAncestorAtGeneration(memberId, 2, memberMap);
  const gen3Ancestor = findAncestorAtGeneration(memberId, 3, memberMap);

  return {
    lineageBranchId: gen2Ancestor?.id || null,
    lineageBranchName: gen2Ancestor?.firstName || null,
    subBranchId: gen3Ancestor?.id || null,
    subBranchName: gen3Ancestor?.firstName || null,
  };
}

/**
 * Calculate sons and daughters count for a member
 */
export function calculateChildrenCounts(
  memberId: string,
  childrenMap: Map<string, FamilyMemberBase[]>
): { sonsCount: number; daughtersCount: number } {
  const children = childrenMap.get(memberId) || [];

  return {
    sonsCount: children.filter(c => c.gender === 'Male').length,
    daughtersCount: children.filter(c => c.gender === 'Female').length,
  };
}

/**
 * Determine branch name based on Gen 2 ancestor
 */
export function getBranchName(gen2Ancestor: FamilyMemberBase | null): string {
  if (!gen2Ancestor) return 'الأصل';

  const branchMap: Record<string, string> = {
    'P002': 'الابراهيم',  // ابراهيم بن حمد
    'P003': 'العبدالكريم', // عبدالكريم بن حمد
    'P004': 'الفوزان',     // فوزان بن حمد
  };

  return branchMap[gen2Ancestor.id] || `فرع ${gen2Ancestor.firstName}`;
}

/**
 * Generate full Arabic name in proper format
 */
export function generateFullNameAr(
  firstName: string,
  fatherName: string | null,
  grandfatherName: string | null,
  gender: string
): string {
  const parts = [firstName];
  const connector = gender === 'Female' ? 'بنت' : 'بن';

  if (fatherName) {
    parts.push(connector, fatherName);
    if (grandfatherName) {
      parts.push('بن', grandfatherName);
    }
  }

  parts.push('آل شايع');
  return parts.join(' ');
}

/**
 * Generate full English name in proper format
 */
export function generateFullNameEn(
  firstName: string,
  fatherName: string | null,
  grandfatherName: string | null,
  gender: string
): string {
  const parts = [firstName];
  const connector = gender === 'Female' ? 'bint' : 'bin';

  if (fatherName) {
    parts.push(connector, fatherName);
    if (grandfatherName) {
      parts.push('bin', grandfatherName);
    }
  }

  parts.push('Al-Shaye');
  return parts.join(' ');
}

/**
 * Calculate status based on generation (Gen 1-5 are deceased)
 */
export function calculateStatus(generation: number): 'Living' | 'Deceased' {
  return generation <= 5 ? 'Deceased' : 'Living';
}

/**
 * Process all members and calculate computed fields
 */
export function processAllMembers<T extends FamilyMemberBase>(
  members: T[]
): Map<string, {
  lineagePath: string;
  lineageBranchId: string | null;
  lineageBranchName: string | null;
  subBranchId: string | null;
  subBranchName: string | null;
  sonsCount: number;
  daughtersCount: number;
  branch: string;
}> {
  const memberMap = buildMemberMap(members);
  const childrenMap = buildChildrenMap(members);
  const results = new Map<string, {
    lineagePath: string;
    lineageBranchId: string | null;
    lineageBranchName: string | null;
    subBranchId: string | null;
    subBranchName: string | null;
    sonsCount: number;
    daughtersCount: number;
    branch: string;
  }>();

  for (const member of members) {
    const lineagePath = calculateLineagePath(member.id, memberMap);
    const lineageBranch = calculateLineageBranch(member.id, memberMap);
    const childrenCounts = calculateChildrenCounts(member.id, childrenMap);
    const gen2Ancestor = findAncestorAtGeneration(member.id, 2, memberMap);

    results.set(member.id, {
      lineagePath: JSON.stringify(lineagePath),
      ...lineageBranch,
      ...childrenCounts,
      branch: getBranchName(gen2Ancestor),
    });
  }

  return results;
}
