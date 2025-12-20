/**
 * Database-first data access layer
 * Uses SQLite via better-sqlite3 directly, falls back to in-memory data if unavailable
 *
 * CONCURRENCY FEATURES:
 * - Atomic ID generation prevents duplicate IDs when multiple users add members
 * - Optimistic locking prevents lost updates when editing the same member
 * - Transaction-based operations ensure data consistency
 * - Retry mechanism handles temporary lock conflicts
 */

import * as sqliteDb from './sqlite-db';
import { familyMembers, FamilyMember } from './data';

// Re-export error types for use by consumers
export { DatabaseError, ConcurrencyError, DuplicateIdError } from './sqlite-db';

// Cache for database availability check
let dbAvailable: boolean | null = null;
let lastDbCheck = 0;
const DB_CHECK_INTERVAL = 30000; // 30 seconds

async function isDatabaseAvailable(): Promise<boolean> {
  const now = Date.now();
  if (dbAvailable !== null && now - lastDbCheck < DB_CHECK_INTERVAL) {
    return dbAvailable;
  }

  dbAvailable = sqliteDb.isDatabaseAvailable();
  lastDbCheck = now;
  return dbAvailable;
}

/**
 * Get all members from database
 */
export async function getAllMembersFromDb(): Promise<FamilyMember[]> {
  try {
    if (!await isDatabaseAvailable()) {
      console.warn('Database unavailable, using in-memory data');
      return familyMembers;
    }

    const members = sqliteDb.getAllMembers();

    if (members.length === 0) {
      console.warn('Database empty, using in-memory data');
      return familyMembers;
    }

    return members;
  } catch (error) {
    console.error('Error fetching members from database:', error);
    return familyMembers;
  }
}

/**
 * Get member by ID from database
 */
export async function getMemberByIdFromDb(id: string): Promise<FamilyMember | null> {
  try {
    if (!await isDatabaseAvailable()) {
      return familyMembers.find(m => m.id === id) || null;
    }

    const member = sqliteDb.getMemberById(id);

    if (!member) {
      // Fallback to in-memory
      return familyMembers.find(m => m.id === id) || null;
    }

    return member;
  } catch (error) {
    console.error('Error fetching member from database:', error);
    return familyMembers.find(m => m.id === id) || null;
  }
}

/**
 * Get male members from database
 */
export async function getMaleMembersFromDb(): Promise<FamilyMember[]> {
  try {
    if (!await isDatabaseAvailable()) {
      return familyMembers.filter(m => m.gender === 'Male');
    }

    const members = sqliteDb.getMaleMembers();

    if (members.length === 0) {
      return familyMembers.filter(m => m.gender === 'Male');
    }

    return members;
  } catch (error) {
    console.error('Error fetching male members:', error);
    return familyMembers.filter(m => m.gender === 'Male');
  }
}

/**
 * Get children of a parent from database
 */
export async function getChildrenFromDb(parentId: string): Promise<FamilyMember[]> {
  try {
    if (!await isDatabaseAvailable()) {
      return familyMembers.filter(m => m.fatherId === parentId);
    }

    const members = sqliteDb.getChildren(parentId);

    if (members.length === 0) {
      // Could be no children, or DB doesn't have data
      const inMemoryChildren = familyMembers.filter(m => m.fatherId === parentId);
      if (inMemoryChildren.length > 0) {
        return inMemoryChildren;
      }
    }

    return members;
  } catch (error) {
    console.error('Error fetching children:', error);
    return familyMembers.filter(m => m.fatherId === parentId);
  }
}

/**
 * Get statistics from database
 */
export async function getStatisticsFromDb() {
  try {
    if (!await isDatabaseAvailable()) {
      return getStatisticsFromMemory();
    }

    const stats = sqliteDb.getStatistics();

    if (stats.totalMembers === 0) {
      return getStatisticsFromMemory();
    }

    return stats;
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return getStatisticsFromMemory();
  }
}

/**
 * Get statistics from in-memory data (fallback)
 */
function getStatisticsFromMemory() {
  const totalMembers = familyMembers.length;
  if (totalMembers === 0) {
    return {
      totalMembers: 0,
      males: 0,
      females: 0,
      generations: 0,
      branches: [],
      generationBreakdown: [],
    };
  }

  const males = familyMembers.filter(m => m.gender === 'Male').length;
  const females = familyMembers.filter(m => m.gender === 'Female').length;
  const generations = Math.max(...familyMembers.map(m => m.generation));

  const branches = [...new Set(familyMembers.map(m => m.branch).filter(Boolean))] as string[];
  const branchCounts = branches.map(branch => ({
    name: branch,
    count: familyMembers.filter(m => m.branch === branch).length,
  }));

  const generationBreakdown = Array.from({ length: generations }, (_, i) => {
    const gen = i + 1;
    const genMembers = familyMembers.filter(m => m.generation === gen);
    return {
      generation: gen,
      count: genMembers.length,
      males: genMembers.filter(m => m.gender === 'Male').length,
      females: genMembers.filter(m => m.gender === 'Female').length,
      percentage: Math.round((genMembers.length / totalMembers) * 100),
    };
  });

  return {
    totalMembers,
    males,
    females,
    generations,
    branches: branchCounts,
    generationBreakdown,
  };
}

/**
 * Get next available ID from database
 */
export async function getNextIdFromDb(): Promise<string> {
  try {
    if (!await isDatabaseAvailable()) {
      if (familyMembers.length === 0) return 'P001';
      const maxId = Math.max(...familyMembers.map(m => parseInt(m.id.replace('P', ''))));
      return `P${String(maxId + 1).padStart(3, '0')}`;
    }

    return sqliteDb.getNextId();
  } catch (error) {
    console.error('Error getting next ID:', error);
    if (familyMembers.length === 0) return 'P001';
    const maxId = Math.max(...familyMembers.map(m => parseInt(m.id.replace('P', ''))));
    return `P${String(maxId + 1).padStart(3, '0')}`;
  }
}

/**
 * Get Gen 2 branches from database
 */
export async function getGen2BranchesFromDb(): Promise<FamilyMember[]> {
  try {
    if (!await isDatabaseAvailable()) {
      return familyMembers.filter(m => m.generation === 2);
    }

    const members = sqliteDb.getGen2Branches();

    if (members.length === 0) {
      return familyMembers.filter(m => m.generation === 2);
    }

    return members;
  } catch (error) {
    console.error('Error fetching Gen 2 branches:', error);
    return familyMembers.filter(m => m.generation === 2);
  }
}

/**
 * Build family tree from database
 */
export async function buildFamilyTreeFromDb(): Promise<(FamilyMember & { children: any[] }) | null> {
  try {
    const members = await getAllMembersFromDb();

    if (members.length === 0) return null;

    const root = members.find(m => !m.fatherId);
    if (!root) return null;

    const addChildren = (member: FamilyMember): FamilyMember & { children: any[] } => {
      const children = members.filter(m => m.fatherId === member.id);
      return {
        ...member,
        children: children.map(child => addChildren(child)),
      };
    };

    return addChildren(root);
  } catch (error) {
    console.error('Error building family tree:', error);
    return null;
  }
}

/**
 * Create a new member in database with a specific ID
 * For concurrent-safe operations, use createMemberWithAutoIdInDb instead
 */
export async function createMemberInDb(member: Omit<FamilyMember, 'createdAt' | 'updatedAt'>): Promise<FamilyMember | null> {
  try {
    if (!await isDatabaseAvailable()) {
      console.error('Database unavailable, cannot create member');
      return null;
    }

    return await sqliteDb.createMember(member);
  } catch (error) {
    console.error('Error creating member:', error);
    // Re-throw specific errors for handling upstream
    if (error instanceof sqliteDb.DuplicateIdError) {
      throw error;
    }
    if (error instanceof sqliteDb.ConcurrencyError) {
      throw error;
    }
    return null;
  }
}

/**
 * Create a new member with automatic ID generation (RECOMMENDED)
 * This is concurrent-safe and prevents duplicate IDs
 */
export async function createMemberWithAutoIdInDb(
  memberData: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FamilyMember | null> {
  try {
    if (!await isDatabaseAvailable()) {
      console.error('Database unavailable, cannot create member');
      return null;
    }

    return await sqliteDb.createMemberWithAutoId(memberData);
  } catch (error) {
    console.error('Error creating member with auto ID:', error);
    if (error instanceof sqliteDb.DatabaseError) {
      throw error;
    }
    return null;
  }
}

/**
 * Update a member in database with optimistic locking support
 * @param id - Member ID to update
 * @param updates - Fields to update
 * @param expectedVersion - Optional: Pass the version for optimistic locking
 */
export async function updateMemberInDb(
  id: string,
  updates: Partial<FamilyMember>,
  expectedVersion?: number
): Promise<FamilyMember | null> {
  try {
    if (!await isDatabaseAvailable()) {
      console.error('Database unavailable, cannot update member');
      return null;
    }

    return await sqliteDb.updateMember(id, updates, expectedVersion);
  } catch (error) {
    console.error('Error updating member:', error);
    // Re-throw concurrency errors for handling upstream
    if (error instanceof sqliteDb.ConcurrencyError) {
      throw error;
    }
    if (error instanceof sqliteDb.DatabaseError) {
      throw error;
    }
    return null;
  }
}

/**
 * Delete a member from database
 * Note: Will fail if member has children (delete children first)
 */
export async function deleteMemberFromDb(id: string): Promise<boolean> {
  try {
    if (!await isDatabaseAvailable()) {
      console.error('Database unavailable, cannot delete member');
      return false;
    }

    return await sqliteDb.deleteMember(id);
  } catch (error) {
    console.error('Error deleting member:', error);
    // Re-throw specific errors for handling upstream
    if (error instanceof sqliteDb.DatabaseError) {
      throw error;
    }
    return false;
  }
}

/**
 * Check if member exists in database
 */
export async function memberExistsInDb(id: string): Promise<boolean> {
  try {
    if (!await isDatabaseAvailable()) {
      return familyMembers.some(m => m.id === id);
    }

    const member = sqliteDb.getMemberById(id);
    return member !== null;
  } catch (error) {
    console.error('Error checking member existence:', error);
    return familyMembers.some(m => m.id === id);
  }
}

/**
 * Bulk create members (for seeding/import)
 * Uses a single transaction for atomicity and performance
 */
export async function bulkCreateMembersInDb(
  members: Omit<FamilyMember, 'createdAt' | 'updatedAt'>[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    if (!await isDatabaseAvailable()) {
      return { success: 0, failed: members.length, errors: ['Database unavailable'] };
    }

    return await sqliteDb.bulkCreateMembers(members);
  } catch (error) {
    console.error('Error bulk creating members:', error);
    return { success: 0, failed: members.length, errors: [(error as Error).message] };
  }
}

/**
 * Execute an operation with an advisory lock
 * Use this for critical sections that need serialized access
 * @param lockKey - Unique key for the lock (e.g., 'create-member')
 * @param operation - Async operation to execute
 */
export async function withDbLock<T>(
  lockKey: string,
  operation: () => Promise<T>
): Promise<T> {
  return sqliteDb.withLock(lockKey, operation);
}
