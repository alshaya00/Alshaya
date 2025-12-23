/**
 * Database-first data access layer
 * Uses PostgreSQL via Prisma exclusively - no static fallbacks
 *
 * CONCURRENCY FEATURES:
 * - Atomic ID generation prevents duplicate IDs when multiple users add members
 * - Optimistic locking prevents lost updates when editing the same member
 * - Transaction-based operations ensure data consistency
 * - Retry mechanism handles temporary connection issues
 */

import * as postgresDb from './postgres-db';
import { FamilyMember } from './data';

// Re-export error types for use by consumers
export { DatabaseError, ConcurrencyError, DuplicateIdError } from './postgres-db';

/**
 * Get all members from database
 */
export async function getAllMembersFromDb(): Promise<FamilyMember[]> {
  try {
    const members = await postgresDb.getAllMembers();
    return members;
  } catch (error) {
    console.error('Error fetching members from database:', error);
    throw error;
  }
}

/**
 * Get member by ID from database
 */
export async function getMemberByIdFromDb(id: string): Promise<FamilyMember | null> {
  try {
    const member = await postgresDb.getMemberById(id);
    return member;
  } catch (error) {
    console.error('Error fetching member from database:', error);
    throw error;
  }
}

/**
 * Get male members from database
 */
export async function getMaleMembersFromDb(): Promise<FamilyMember[]> {
  try {
    const members = await postgresDb.getMaleMembers();
    return members;
  } catch (error) {
    console.error('Error fetching male members:', error);
    throw error;
  }
}

/**
 * Get children of a parent from database
 */
export async function getChildrenFromDb(parentId: string): Promise<FamilyMember[]> {
  try {
    const members = await postgresDb.getChildren(parentId);
    return members;
  } catch (error) {
    console.error('Error fetching children:', error);
    throw error;
  }
}

/**
 * Get statistics from database
 */
export async function getStatisticsFromDb() {
  try {
    const stats = await postgresDb.getStatistics();
    return stats;
  } catch (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }
}

/**
 * Get next available ID from database
 */
export async function getNextIdFromDb(): Promise<string> {
  try {
    return await postgresDb.getNextId();
  } catch (error) {
    console.error('Error getting next ID:', error);
    throw error;
  }
}

/**
 * Get Gen 2 branches from database
 */
export async function getGen2BranchesFromDb(): Promise<FamilyMember[]> {
  try {
    return await postgresDb.getGen2Branches();
  } catch (error) {
    console.error('Error fetching Gen 2 branches:', error);
    throw error;
  }
}

/**
 * Add a new member to database with atomic ID generation
 */
export async function addMemberToDb(member: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<FamilyMember> {
  try {
    return await postgresDb.createMemberWithAutoId(member);
  } catch (error) {
    console.error('Error adding member:', error);
    throw error;
  }
}

/**
 * Update a member in database with optimistic locking
 */
export async function updateMemberInDb(
  id: string,
  updates: Partial<FamilyMember>,
  expectedVersion?: number
): Promise<FamilyMember> {
  try {
    return await postgresDb.updateMember(id, updates, expectedVersion);
  } catch (error) {
    console.error('Error updating member:', error);
    throw error;
  }
}

/**
 * Delete a member from database
 */
export async function deleteMemberFromDb(id: string): Promise<boolean> {
  try {
    return await postgresDb.deleteMember(id);
  } catch (error) {
    console.error('Error deleting member:', error);
    throw error;
  }
}

/**
 * Check if database is available
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  return await postgresDb.isDatabaseAvailable();
}
