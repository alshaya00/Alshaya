/**
 * Direct SQLite database layer using better-sqlite3
 * This bypasses Prisma when the Prisma client isn't available
 */

import Database from 'better-sqlite3';
import path from 'path';
import { FamilyMember } from './data';

let db: Database.Database | null = null;

function getDb(): Database.Database | null {
  if (db) return db;

  try {
    const dbPath = path.join(process.cwd(), 'prisma', 'family.db');
    db = new Database(dbPath);
    return db;
  } catch (error) {
    console.error('Failed to open SQLite database:', error);
    return null;
  }
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

export function createMember(member: Omit<FamilyMember, 'createdAt' | 'updatedAt'>): FamilyMember | null {
  const database = getDb();
  if (!database) return null;

  try {
    const stmt = database.prepare(`
      INSERT INTO FamilyMember (
        id, firstName, fatherName, grandfatherName, greatGrandfatherName,
        familyName, fatherId, gender, birthYear, deathYear, sonsCount,
        daughtersCount, generation, branch, fullNameAr, fullNameEn,
        phone, city, status, photoUrl, biography, occupation, email, createdBy
      ) VALUES (
        @id, @firstName, @fatherName, @grandfatherName, @greatGrandfatherName,
        @familyName, @fatherId, @gender, @birthYear, @deathYear, @sonsCount,
        @daughtersCount, @generation, @branch, @fullNameAr, @fullNameEn,
        @phone, @city, @status, @photoUrl, @biography, @occupation, @email, @createdBy
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
      database.prepare(`UPDATE FamilyMember SET ${countField} = ${countField} + 1 WHERE id = ?`).run(member.fatherId);
    }

    return getMemberById(member.id);
  } catch (error) {
    console.error('Error creating member:', error);
    return null;
  }
}

export function updateMember(id: string, updates: Partial<FamilyMember>): FamilyMember | null {
  const database = getDb();
  if (!database) return null;

  try {
    const setParts: string[] = [];
    const values: Record<string, unknown> = { id };

    const allowedFields = [
      'firstName', 'fatherName', 'grandfatherName', 'greatGrandfatherName',
      'familyName', 'fatherId', 'gender', 'birthYear', 'deathYear', 'sonsCount',
      'daughtersCount', 'generation', 'branch', 'fullNameAr', 'fullNameEn',
      'phone', 'city', 'status', 'photoUrl', 'biography', 'occupation', 'email'
    ];

    for (const field of allowedFields) {
      if (field in updates) {
        setParts.push(`${field} = @${field}`);
        values[field] = updates[field as keyof FamilyMember] ?? null;
      }
    }

    if (setParts.length === 0) return getMemberById(id);

    setParts.push('updatedAt = CURRENT_TIMESTAMP');

    const sql = `UPDATE FamilyMember SET ${setParts.join(', ')} WHERE id = @id`;
    database.prepare(sql).run(values);

    return getMemberById(id);
  } catch (error) {
    console.error('Error updating member:', error);
    return null;
  }
}

export function deleteMember(id: string): boolean {
  const database = getDb();
  if (!database) return false;

  try {
    database.prepare('DELETE FROM FamilyMember WHERE id = ?').run(id);
    return true;
  } catch (error) {
    console.error('Error deleting member:', error);
    return false;
  }
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
