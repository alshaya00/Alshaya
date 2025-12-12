// آل شايع Family Tree - Lineage Utility Functions
// Utility functions for tracking Gen 2 (main branch) and Gen 3 (sub-branch) lineage

import { FamilyMember } from './types';

/**
 * Get the full ancestor path from root to the member's parent
 * Returns array of ancestor IDs starting from root (Gen 1)
 */
export function getLineagePath(
  memberId: string,
  allMembers: FamilyMember[]
): string[] {
  const path: string[] = [];
  let currentMember = allMembers.find((m) => m.id === memberId);

  while (currentMember?.fatherId) {
    path.unshift(currentMember.fatherId);
    currentMember = allMembers.find((m) => m.id === currentMember!.fatherId);
  }

  return path;
}

/**
 * Get the Gen 2 ancestor (main branch founder) for a member
 * Gen 2 members are direct children of the family founder (Gen 1)
 * Returns null for Gen 1 members
 */
export function getGen2Ancestor(
  memberId: string,
  allMembers: FamilyMember[]
): FamilyMember | null {
  const member = allMembers.find((m) => m.id === memberId);
  if (!member) return null;

  // Gen 1 has no Gen 2 ancestor (they ARE the root)
  if (member.generation === 1) return null;

  // Gen 2 members ARE the branch founders
  if (member.generation === 2) return member;

  // For Gen 3+, traverse up until we find a Gen 2 member
  const path = getLineagePath(memberId, allMembers);

  for (const ancestorId of path) {
    const ancestor = allMembers.find((m) => m.id === ancestorId);
    if (ancestor && ancestor.generation === 2) {
      return ancestor;
    }
  }

  return null;
}

/**
 * Get the Gen 3 ancestor (sub-branch founder) for a member
 * Gen 3 members are grandchildren of the family founder
 * Returns null for Gen 1, Gen 2 members
 */
export function getGen3Ancestor(
  memberId: string,
  allMembers: FamilyMember[]
): FamilyMember | null {
  const member = allMembers.find((m) => m.id === memberId);
  if (!member) return null;

  // Gen 1-2 have no Gen 3 ancestor
  if (member.generation <= 2) return null;

  // Gen 3 members ARE the sub-branch founders
  if (member.generation === 3) return member;

  // For Gen 4+, traverse up until we find a Gen 3 member
  const path = getLineagePath(memberId, allMembers);

  for (const ancestorId of path) {
    const ancestor = allMembers.find((m) => m.id === ancestorId);
    if (ancestor && ancestor.generation === 3) {
      return ancestor;
    }
  }

  return null;
}

/**
 * Get all Gen 2 members (main branch founders)
 * These are the direct children of the family founder
 */
export function getAllGen2Branches(allMembers: FamilyMember[]): FamilyMember[] {
  return allMembers.filter((m) => m.generation === 2);
}

/**
 * Get all Gen 3 members (sub-branch founders)
 * These are the grandchildren of the family founder
 */
export function getAllGen3SubBranches(allMembers: FamilyMember[]): FamilyMember[] {
  return allMembers.filter((m) => m.generation === 3);
}

/**
 * Get all members belonging to a specific Gen 2 branch
 */
export function getMembersByGen2Branch(
  gen2AncestorId: string,
  allMembers: FamilyMember[]
): FamilyMember[] {
  return allMembers.filter((m) => {
    if (m.id === gen2AncestorId) return true;
    const gen2Ancestor = getGen2Ancestor(m.id, allMembers);
    return gen2Ancestor?.id === gen2AncestorId;
  });
}

/**
 * Get all members belonging to a specific Gen 3 sub-branch
 */
export function getMembersByGen3SubBranch(
  gen3AncestorId: string,
  allMembers: FamilyMember[]
): FamilyMember[] {
  return allMembers.filter((m) => {
    if (m.id === gen3AncestorId) return true;
    const gen3Ancestor = getGen3Ancestor(m.id, allMembers);
    return gen3Ancestor?.id === gen3AncestorId;
  });
}

/**
 * Calculate lineage information for a single member
 * Returns an object with lineage branch ID, name, sub-branch ID, name, and path
 */
export function calculateLineageInfo(
  memberId: string,
  allMembers: FamilyMember[]
): {
  lineageBranchId: string | null;
  lineageBranchName: string | null;
  subBranchId: string | null;
  subBranchName: string | null;
  lineagePath: string[];
} {
  const gen2Ancestor = getGen2Ancestor(memberId, allMembers);
  const gen3Ancestor = getGen3Ancestor(memberId, allMembers);
  const path = getLineagePath(memberId, allMembers);

  return {
    lineageBranchId: gen2Ancestor?.id || null,
    lineageBranchName: gen2Ancestor?.firstName || null,
    subBranchId: gen3Ancestor?.id || null,
    subBranchName: gen3Ancestor?.firstName || null,
    lineagePath: path,
  };
}

/**
 * Calculate and add lineage information to all members
 * Returns a new array with lineage fields populated
 */
export function populateLineageInfo(
  allMembers: FamilyMember[]
): FamilyMember[] {
  return allMembers.map((member) => {
    const lineageInfo = calculateLineageInfo(member.id, allMembers);
    return {
      ...member,
      lineageBranchId: lineageInfo.lineageBranchId,
      lineageBranchName: lineageInfo.lineageBranchName,
      subBranchId: lineageInfo.subBranchId,
      subBranchName: lineageInfo.subBranchName,
      lineagePath: lineageInfo.lineagePath,
    };
  });
}

/**
 * Get a color for a Gen 2 branch based on the branch index
 * Uses a predefined set of distinct colors for visual differentiation
 */
export function getLineageBranchColor(
  branchId: string | null,
  allGen2Branches: FamilyMember[]
): string {
  if (!branchId) return 'bg-gray-500';

  const branchIndex = allGen2Branches.findIndex((b) => b.id === branchId);

  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-lime-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-rose-500',
    'bg-fuchsia-500',
  ];

  return colors[branchIndex % colors.length] || 'bg-gray-500';
}

/**
 * Get hex color for a Gen 2 branch (for D3.js visualization)
 */
export function getLineageBranchHexColor(
  branchId: string | null,
  allGen2Branches: FamilyMember[]
): string {
  if (!branchId) return '#6b7280'; // gray-500

  const branchIndex = allGen2Branches.findIndex((b) => b.id === branchId);

  const colors = [
    '#ef4444', // red-500
    '#3b82f6', // blue-500
    '#22c55e', // green-500
    '#eab308', // yellow-500
    '#a855f7', // purple-500
    '#ec4899', // pink-500
    '#6366f1', // indigo-500
    '#14b8a6', // teal-500
    '#f97316', // orange-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
    '#8b5cf6', // violet-500
    '#f43f5e', // rose-500
    '#d946ef', // fuchsia-500
  ];

  return colors[branchIndex % colors.length] || '#6b7280';
}

/**
 * Format lineage information for display
 * Returns a formatted string like "فرع عبدالله بن شايع"
 */
export function formatLineageDisplay(
  member: FamilyMember,
  includeSubBranch: boolean = true
): string {
  if (!member.lineageBranchName) {
    if (member.generation === 1) {
      return 'الجذر الأصلي'; // Original Root
    }
    return 'غير محدد'; // Not specified
  }

  let display = `فرع ${member.lineageBranchName}`; // Branch of [name]

  if (includeSubBranch && member.subBranchName && member.generation > 3) {
    display += ` - ذرية ${member.subBranchName}`; // Descendants of [name]
  }

  return display;
}

/**
 * Get statistics about Gen 2 branches
 * Returns count of members per branch
 */
export function getLineageBranchStats(
  allMembers: FamilyMember[]
): Map<string, { name: string; count: number; livingCount: number }> {
  const stats = new Map<string, { name: string; count: number; livingCount: number }>();
  const gen2Branches = getAllGen2Branches(allMembers);

  for (const branch of gen2Branches) {
    const members = getMembersByGen2Branch(branch.id, allMembers);
    const livingCount = members.filter((m) => m.status === 'Living').length;
    stats.set(branch.id, {
      name: branch.firstName,
      count: members.length,
      livingCount,
    });
  }

  return stats;
}
