/**
 * Direct SQLite database layer using better-sqlite3
 * This bypasses Prisma when the Prisma client isn't available
 *
 * CONCURRENCY HANDLING:
 * - Uses SQLite transactions with IMMEDIATE mode for write operations
 * - Implements optimistic locking with version numbers for updates
 * - Atomic ID generation within transactions to prevent duplicates
 * - Retry mechanism for database busy errors (SQLITE_BUSY)
 */

import Database from 'better-sqlite3';
import path from 'path';
import { FamilyMember } from './data';

// Constants for retry mechanism
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 100;
const BUSY_TIMEOUT_MS = 5000;

// Error types for better error handling
export class DatabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConcurrencyError extends DatabaseError {
  constructor(message: string) {
    super(message, 'CONCURRENCY_ERROR');
    this.name = 'ConcurrencyError';
  }
}

export class DuplicateIdError extends DatabaseError {
  constructor(id: string) {
    super(`Member with ID ${id} already exists`, 'DUPLICATE_ID');
    this.name = 'DuplicateIdError';
  }
}

let db: Database.Database | null = null;

function getDb(): Database.Database | null {
  if (db) return db;

  try {
    const dbPath = path.join(process.cwd(), 'prisma', 'family.db');
    db = new Database(dbPath);
    // Set busy timeout to wait for locks instead of failing immediately
    db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    return db;
  } catch (error) {
    console.error('Failed to open SQLite database:', error);
    return null;
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for database operations that may fail due to busy locks
 */
async function withRetry<T>(
  operation: () => T,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = (error as Error).message || '';

      // Check if it's a busy/locked error that we should retry
      if (
        errorMessage.includes('SQLITE_BUSY') ||
        errorMessage.includes('SQLITE_LOCKED') ||
        errorMessage.includes('database is locked')
      ) {
        if (attempt < MAX_RETRIES) {
          const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(
            `${operationName}: Database busy, retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`
          );
          await sleep(delayMs);
          continue;
        }
      }

      // For non-busy errors or max retries exceeded, throw immediately
      throw error;
    }
  }

  throw lastError || new Error(`${operationName} failed after ${MAX_RETRIES} retries`);
}

function rowToMember(row: Record<string, unknown>): FamilyMember {
  return {
    id: row.id as string,
    firstName: row.firstName as string,
    fatherName: row.fatherName as string | null,
    grandfatherName: row.grandfatherName as string | null,
    greatGrandfatherName: row.greatGrandfatherName as string | null,
    familyName: row.familyName as string,
    fatherId: row.fatherId as string | null,
    gender: row.gender as 'Male' | 'Female',
    birthYear: row.birthYear as number | null,
    deathYear: row.deathYear as number | null,
    sonsCount: row.sonsCount as number,
    daughtersCount: row.daughtersCount as number,
    generation: row.generation as number,
    branch: row.branch as string | null,
    fullNameAr: row.fullNameAr as string | null,
    fullNameEn: row.fullNameEn as string | null,
    phone: row.phone as string | null,
    city: row.city as string | null,
    status: row.status as string,
    photoUrl: row.photoUrl as string | null,
    biography: row.biography as string | null,
    occupation: row.occupation as string | null,
    email: row.email as string | null,
    createdAt: row.createdAt ? new Date(row.createdAt as string) : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt as string) : undefined,
    createdBy: row.createdBy as string | null,
    lastModifiedBy: row.lastModifiedBy as string | null,
    version: row.version as number,
  };
}

export function isDatabaseAvailable(): boolean {
  const database = getDb();
  if (!database) return false;

  try {
    database.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}

export function getAllMembers(): FamilyMember[] {
  const database = getDb();
  if (!database) return [];

  try {
    const rows = database.prepare('SELECT * FROM FamilyMember ORDER BY id ASC').all();
    return rows.map(row => rowToMember(row as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching all members:', error);
    return [];
  }
}

export function getMemberById(id: string): FamilyMember | null {
  const database = getDb();
  if (!database) return null;

  try {
    const row = database.prepare('SELECT * FROM FamilyMember WHERE id = ?').get(id);
    return row ? rowToMember(row as Record<string, unknown>) : null;
  } catch (error) {
    console.error('Error fetching member by id:', error);
    return null;
  }
}

export function getMaleMembers(): FamilyMember[] {
  const database = getDb();
  if (!database) return [];

  try {
    const rows = database.prepare('SELECT * FROM FamilyMember WHERE gender = ? ORDER BY id ASC').all('Male');
    return rows.map(row => rowToMember(row as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching male members:', error);
    return [];
  }
}

export function getChildren(parentId: string): FamilyMember[] {
  const database = getDb();
  if (!database) return [];

  try {
    const rows = database.prepare('SELECT * FROM FamilyMember WHERE fatherId = ? ORDER BY id ASC').all(parentId);
    return rows.map(row => rowToMember(row as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching children:', error);
    return [];
  }
}

export function getGen2Branches(): FamilyMember[] {
  const database = getDb();
  if (!database) return [];

  try {
    const rows = database.prepare('SELECT * FROM FamilyMember WHERE generation = 2 ORDER BY id ASC').all();
    return rows.map(row => rowToMember(row as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching Gen 2 branches:', error);
    return [];
  }
}

/**
 * Get the next available ID
 * NOTE: This is for display purposes only. For actual inserts, use createMemberWithAutoId
 * which generates the ID atomically within a transaction.
 */
export function getNextId(): string {
  const database = getDb();
  if (!database) return 'P001';

  try {
    const result = database.prepare('SELECT id FROM FamilyMember ORDER BY id DESC LIMIT 1').get() as { id: string } | undefined;
    if (!result) return 'P001';

    const numPart = parseInt(result.id.replace('P', ''));
    return `P${String(numPart + 1).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error getting next ID:', error);
    return 'P001';
  }
}

export function getMemberCount(): number {
  const database = getDb();
  if (!database) return 0;

  try {
    const result = database.prepare('SELECT COUNT(*) as count FROM FamilyMember').get() as { count: number };
    return result.count;
  } catch (error) {
    console.error('Error getting member count:', error);
    return 0;
  }
}

/**
 * Check if a member ID already exists
 */
export function memberExists(id: string): boolean {
  const database = getDb();
  if (!database) return false;

  try {
    const result = database.prepare('SELECT 1 FROM FamilyMember WHERE id = ?').get(id);
    return result !== undefined;
  } catch (error) {
    console.error('Error checking member existence:', error);
    return false;
  }
}

/**
 * Generate the next available ID atomically within a transaction
 * This prevents race conditions where two concurrent requests get the same ID
 */
function generateNextIdInTransaction(database: Database.Database): string {
  const result = database.prepare('SELECT id FROM FamilyMember ORDER BY id DESC LIMIT 1').get() as { id: string } | undefined;

  if (!result) return 'P001';

  const numPart = parseInt(result.id.replace('P', ''));
  return `P${String(numPart + 1).padStart(3, '0')}`;
}

/**
 * Create a new member with automatic ID generation
 * This is the RECOMMENDED way to create members as it handles concurrency safely
 *
 * @param memberData - Member data WITHOUT the id field
 * @returns The created member with its generated ID, or null on failure
 */
export async function createMemberWithAutoId(
  memberData: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FamilyMember | null> {
  const database = getDb();
  if (!database) return null;

  return withRetry(() => {
    // Use IMMEDIATE transaction to acquire write lock at start
    // This prevents other writers from interfering during ID generation + insert
    const createTransaction = database.transaction(() => {
      // Generate ID within the transaction (atomic operation)
      const newId = generateNextIdInTransaction(database);

      // Check for duplicate (should never happen in transaction, but safety check)
      const existing = database.prepare('SELECT 1 FROM FamilyMember WHERE id = ?').get(newId);
      if (existing) {
        throw new DuplicateIdError(newId);
      }

      // Insert the new member
      const stmt = database.prepare(`
        INSERT INTO FamilyMember (
          id, firstName, fatherName, grandfatherName, greatGrandfatherName,
          familyName, fatherId, gender, birthYear, deathYear, sonsCount,
          daughtersCount, generation, branch, fullNameAr, fullNameEn,
          phone, city, status, photoUrl, biography, occupation, email, createdBy, version
        ) VALUES (
          @id, @firstName, @fatherName, @grandfatherName, @greatGrandfatherName,
          @familyName, @fatherId, @gender, @birthYear, @deathYear, @sonsCount,
          @daughtersCount, @generation, @branch, @fullNameAr, @fullNameEn,
          @phone, @city, @status, @photoUrl, @biography, @occupation, @email, @createdBy, 1
        )
      `);

      stmt.run({
        id: newId,
        firstName: memberData.firstName,
        fatherName: memberData.fatherName || null,
        grandfatherName: memberData.grandfatherName || null,
        greatGrandfatherName: memberData.greatGrandfatherName || null,
        familyName: memberData.familyName || 'آل شايع',
        fatherId: memberData.fatherId || null,
        gender: memberData.gender,
        birthYear: memberData.birthYear || null,
        deathYear: memberData.deathYear || null,
        sonsCount: memberData.sonsCount || 0,
        daughtersCount: memberData.daughtersCount || 0,
        generation: memberData.generation || 1,
        branch: memberData.branch || null,
        fullNameAr: memberData.fullNameAr || null,
        fullNameEn: memberData.fullNameEn || null,
        phone: memberData.phone || null,
        city: memberData.city || null,
        status: memberData.status || 'Alive',
        photoUrl: memberData.photoUrl || null,
        biography: memberData.biography || null,
        occupation: memberData.occupation || null,
        email: memberData.email || null,
        createdBy: memberData.createdBy || 'system',
      });

      // Update parent's child count within the same transaction
      if (memberData.fatherId) {
        const countField = memberData.gender === 'Male' ? 'sonsCount' : 'daughtersCount';
        database.prepare(`UPDATE FamilyMember SET ${countField} = ${countField} + 1, version = version + 1 WHERE id = ?`).run(memberData.fatherId);
      }

      return newId;
    });

    // Execute the transaction with IMMEDIATE mode
    const newId = createTransaction.immediate();

    // Fetch and return the created member
    return getMemberById(newId);
  }, 'createMemberWithAutoId');
}

/**
 * Create a new member with a specific ID
 * Use this only when you have a pre-validated ID (e.g., from import)
 * For normal operations, use createMemberWithAutoId instead
 *
 * @param member - Member data including the id field
 * @returns The created member, or null on failure
 * @throws DuplicateIdError if the ID already exists
 */
export async function createMember(
  member: Omit<FamilyMember, 'createdAt' | 'updatedAt'>
): Promise<FamilyMember | null> {
  const database = getDb();
  if (!database) return null;

  return withRetry(() => {
    const createTransaction = database.transaction(() => {
      // Check for duplicate ID
      const existing = database.prepare('SELECT 1 FROM FamilyMember WHERE id = ?').get(member.id);
      if (existing) {
        throw new DuplicateIdError(member.id);
      }

      const stmt = database.prepare(`
        INSERT INTO FamilyMember (
          id, firstName, fatherName, grandfatherName, greatGrandfatherName,
          familyName, fatherId, gender, birthYear, deathYear, sonsCount,
          daughtersCount, generation, branch, fullNameAr, fullNameEn,
          phone, city, status, photoUrl, biography, occupation, email, createdBy, version
        ) VALUES (
          @id, @firstName, @fatherName, @grandfatherName, @greatGrandfatherName,
          @familyName, @fatherId, @gender, @birthYear, @deathYear, @sonsCount,
          @daughtersCount, @generation, @branch, @fullNameAr, @fullNameEn,
          @phone, @city, @status, @photoUrl, @biography, @occupation, @email, @createdBy, 1
        )
      `);

      stmt.run({
        id: member.id,
        firstName: member.firstName,
        fatherName: member.fatherName || null,
        grandfatherName: member.grandfatherName || null,
        greatGrandfatherName: member.greatGrandfatherName || null,
        familyName: member.familyName || 'آل شايع',
        fatherId: member.fatherId || null,
        gender: member.gender,
        birthYear: member.birthYear || null,
        deathYear: member.deathYear || null,
        sonsCount: member.sonsCount || 0,
        daughtersCount: member.daughtersCount || 0,
        generation: member.generation || 1,
        branch: member.branch || null,
        fullNameAr: member.fullNameAr || null,
        fullNameEn: member.fullNameEn || null,
        phone: member.phone || null,
        city: member.city || null,
        status: member.status || 'Alive',
        photoUrl: member.photoUrl || null,
        biography: member.biography || null,
        occupation: member.occupation || null,
        email: member.email || null,
        createdBy: member.createdBy || 'system',
      });

      // Update parent's child count
      if (member.fatherId) {
        const countField = member.gender === 'Male' ? 'sonsCount' : 'daughtersCount';
        database.prepare(`UPDATE FamilyMember SET ${countField} = ${countField} + 1, version = version + 1 WHERE id = ?`).run(member.fatherId);
      }

      return member.id;
    });

    createTransaction.immediate();
    return getMemberById(member.id);
  }, 'createMember');
}

/**
 * Update a member with optimistic locking
 * This prevents lost updates when two users edit the same member simultaneously
 *
 * @param id - The member ID to update
 * @param updates - The fields to update
 * @param expectedVersion - Optional: The expected version number (for optimistic locking)
 * @returns The updated member, or null on failure
 * @throws ConcurrencyError if the version doesn't match (someone else updated first)
 */
export async function updateMember(
  id: string,
  updates: Partial<FamilyMember>,
  expectedVersion?: number
): Promise<FamilyMember | null> {
  const database = getDb();
  if (!database) return null;

  return withRetry(() => {
    const updateTransaction = database.transaction(() => {
      // Get current member to check version
      const current = database.prepare('SELECT version FROM FamilyMember WHERE id = ?').get(id) as { version: number } | undefined;

      if (!current) {
        throw new DatabaseError(`Member ${id} not found`, 'NOT_FOUND');
      }

      // Optimistic locking check
      if (expectedVersion !== undefined && current.version !== expectedVersion) {
        throw new ConcurrencyError(
          `Member ${id} was modified by another user. Expected version ${expectedVersion}, found ${current.version}. Please refresh and try again.`
        );
      }

      const setParts: string[] = [];
      const values: Record<string, unknown> = { id };

      const allowedFields = [
        'firstName', 'fatherName', 'grandfatherName', 'greatGrandfatherName',
        'familyName', 'fatherId', 'gender', 'birthYear', 'deathYear', 'sonsCount',
        'daughtersCount', 'generation', 'branch', 'fullNameAr', 'fullNameEn',
        'phone', 'city', 'status', 'photoUrl', 'biography', 'occupation', 'email',
        'lastModifiedBy'
      ];

      for (const field of allowedFields) {
        if (field in updates) {
          setParts.push(`${field} = @${field}`);
          values[field] = updates[field as keyof FamilyMember] ?? null;
        }
      }

      if (setParts.length === 0) {
        return; // Nothing to update
      }

      // Always increment version and update timestamp
      setParts.push('version = version + 1');
      setParts.push('updatedAt = CURRENT_TIMESTAMP');

      const sql = `UPDATE FamilyMember SET ${setParts.join(', ')} WHERE id = @id`;
      const result = database.prepare(sql).run(values);

      if (result.changes === 0) {
        throw new DatabaseError(`Failed to update member ${id}`, 'UPDATE_FAILED');
      }
    });

    updateTransaction.immediate();
    return getMemberById(id);
  }, 'updateMember');
}

/**
 * Delete a member with proper transaction handling
 * Also updates the parent's child count
 *
 * @param id - The member ID to delete
 * @returns true if deleted, false otherwise
 */
export async function deleteMember(id: string): Promise<boolean> {
  const database = getDb();
  if (!database) return false;

  return withRetry(() => {
    const deleteTransaction = database.transaction(() => {
      // Get member info before deleting (to update parent's count)
      const member = database.prepare('SELECT fatherId, gender FROM FamilyMember WHERE id = ?').get(id) as { fatherId: string | null; gender: string } | undefined;

      if (!member) {
        return false; // Member doesn't exist
      }

      // Check if member has children
      const hasChildren = database.prepare('SELECT 1 FROM FamilyMember WHERE fatherId = ? LIMIT 1').get(id);
      if (hasChildren) {
        throw new DatabaseError(
          `Cannot delete member ${id} because they have children. Delete children first.`,
          'HAS_CHILDREN'
        );
      }

      // Delete the member
      const result = database.prepare('DELETE FROM FamilyMember WHERE id = ?').run(id);

      if (result.changes === 0) {
        return false;
      }

      // Update parent's child count
      if (member.fatherId) {
        const countField = member.gender === 'Male' ? 'sonsCount' : 'daughtersCount';
        database.prepare(`UPDATE FamilyMember SET ${countField} = MAX(0, ${countField} - 1), version = version + 1 WHERE id = ?`).run(member.fatherId);
      }

      return true;
    });

    return deleteTransaction.immediate();
  }, 'deleteMember');
}

/**
 * Bulk create members (for seeding/import)
 * Uses a single transaction for atomicity and performance
 */
export async function bulkCreateMembers(
  members: Omit<FamilyMember, 'createdAt' | 'updatedAt'>[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  const database = getDb();
  if (!database) {
    return { success: 0, failed: members.length, errors: ['Database not available'] };
  }

  const errors: string[] = [];
  let success = 0;
  let failed = 0;

  return withRetry(() => {
    const bulkTransaction = database.transaction(() => {
      const stmt = database.prepare(`
        INSERT OR IGNORE INTO FamilyMember (
          id, firstName, fatherName, grandfatherName, greatGrandfatherName,
          familyName, fatherId, gender, birthYear, deathYear, sonsCount,
          daughtersCount, generation, branch, fullNameAr, fullNameEn,
          phone, city, status, photoUrl, biography, occupation, email, createdBy, version
        ) VALUES (
          @id, @firstName, @fatherName, @grandfatherName, @greatGrandfatherName,
          @familyName, @fatherId, @gender, @birthYear, @deathYear, @sonsCount,
          @daughtersCount, @generation, @branch, @fullNameAr, @fullNameEn,
          @phone, @city, @status, @photoUrl, @biography, @occupation, @email, @createdBy, 1
        )
      `);

      for (const member of members) {
        try {
          const result = stmt.run({
            id: member.id,
            firstName: member.firstName,
            fatherName: member.fatherName || null,
            grandfatherName: member.grandfatherName || null,
            greatGrandfatherName: member.greatGrandfatherName || null,
            familyName: member.familyName || 'آل شايع',
            fatherId: member.fatherId || null,
            gender: member.gender,
            birthYear: member.birthYear || null,
            deathYear: member.deathYear || null,
            sonsCount: member.sonsCount || 0,
            daughtersCount: member.daughtersCount || 0,
            generation: member.generation || 1,
            branch: member.branch || null,
            fullNameAr: member.fullNameAr || null,
            fullNameEn: member.fullNameEn || null,
            phone: member.phone || null,
            city: member.city || null,
            status: member.status || 'Alive',
            photoUrl: member.photoUrl || null,
            biography: member.biography || null,
            occupation: member.occupation || null,
            email: member.email || null,
            createdBy: member.createdBy || 'system',
          });

          if (result.changes > 0) {
            success++;
          } else {
            failed++;
            errors.push(`ID ${member.id}: Already exists or insert failed`);
          }
        } catch (error) {
          failed++;
          errors.push(`ID ${member.id}: ${(error as Error).message}`);
        }
      }
    });

    bulkTransaction.immediate();
    return { success, failed, errors };
  }, 'bulkCreateMembers');
}

export function getStatistics() {
  const database = getDb();
  if (!database) {
    return {
      totalMembers: 0,
      males: 0,
      females: 0,
      generations: 0,
      branches: [],
      generationBreakdown: [],
    };
  }

  try {
    const members = getAllMembers();
    const totalMembers = members.length;
    const males = members.filter(m => m.gender === 'Male').length;
    const females = members.filter(m => m.gender === 'Female').length;
    const generations = totalMembers > 0 ? Math.max(...members.map(m => m.generation)) : 0;

    const branches = [...new Set(members.map(m => m.branch).filter(Boolean))] as string[];
    const branchCounts = branches.map(branch => ({
      name: branch,
      count: members.filter(m => m.branch === branch).length,
    }));

    const generationBreakdown = generations > 0
      ? Array.from({ length: generations }, (_, i) => {
          const gen = i + 1;
          const genMembers = members.filter(m => m.generation === gen);
          return {
            generation: gen,
            count: genMembers.length,
            males: genMembers.filter(m => m.gender === 'Male').length,
            females: genMembers.filter(m => m.gender === 'Female').length,
            percentage: totalMembers > 0 ? Math.round((genMembers.length / totalMembers) * 100) : 0,
          };
        })
      : [];

    return {
      totalMembers,
      males,
      females,
      generations,
      branches: branchCounts,
      generationBreakdown,
    };
  } catch (error) {
    console.error('Error getting statistics:', error);
    return {
      totalMembers: 0,
      males: 0,
      females: 0,
      generations: 0,
      branches: [],
      generationBreakdown: [],
    };
  }
}

/**
 * Acquire an advisory lock for a specific operation
 * This is a simple in-process lock for additional safety
 */
const operationLocks = new Map<string, Promise<void>>();

export async function withLock<T>(
  lockKey: string,
  operation: () => Promise<T>
): Promise<T> {
  // Wait for any existing operation with the same key
  const existingLock = operationLocks.get(lockKey);
  if (existingLock) {
    await existingLock;
  }

  let resolve: () => void;
  const lockPromise = new Promise<void>(r => { resolve = r; });
  operationLocks.set(lockKey, lockPromise);

  try {
    return await operation();
  } finally {
    resolve!();
    operationLocks.delete(lockKey);
  }
}
