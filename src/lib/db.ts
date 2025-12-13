/**
 * Database-first data access layer
 * All functions query Prisma first, fall back to in-memory data if DB unavailable
 */

import { prisma } from './prisma';
import { familyMembers, FamilyMember } from './data';

// Type for database member (matches Prisma schema)
type DbMember = {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string;
  fatherId: string | null;
  gender: string;
  birthYear: number | null;
  deathYear: number | null;
  sonsCount: number;
  daughtersCount: number;
  generation: number;
  branch: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  photoUrl: string | null;
  biography: string | null;
  occupation: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  lastModifiedBy: string | null;
  version: number;
};

// Convert DB member to FamilyMember type
function toFamilyMember(m: DbMember): FamilyMember {
  return {
    ...m,
    gender: m.gender as 'Male' | 'Female',
  };
}

// Cache for database availability check
let dbAvailable: boolean | null = null;
let lastDbCheck = 0;
const DB_CHECK_INTERVAL = 30000; // 30 seconds

async function isDatabaseAvailable(): Promise<boolean> {
  const now = Date.now();
  if (dbAvailable !== null && now - lastDbCheck < DB_CHECK_INTERVAL) {
    return dbAvailable;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
    lastDbCheck = now;
    return true;
  } catch {
    dbAvailable = false;
    lastDbCheck = now;
    return false;
  }
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

    const members = await prisma.familyMember.findMany({
      orderBy: { id: 'asc' }
    });

    if (members.length === 0) {
      console.warn('Database empty, using in-memory data');
      return familyMembers;
    }

    return members.map(toFamilyMember);
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

    const member = await prisma.familyMember.findUnique({
      where: { id }
    });

    if (!member) {
      // Fallback to in-memory
      return familyMembers.find(m => m.id === id) || null;
    }

    return toFamilyMember(member);
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

    const members = await prisma.familyMember.findMany({
      where: { gender: 'Male' },
      orderBy: { id: 'asc' }
    });

    if (members.length === 0) {
      return familyMembers.filter(m => m.gender === 'Male');
    }

    return members.map(toFamilyMember);
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

    const members = await prisma.familyMember.findMany({
      where: { fatherId: parentId },
      orderBy: { id: 'asc' }
    });

    if (members.length === 0) {
      // Could be no children, or DB doesn't have data
      const inMemoryChildren = familyMembers.filter(m => m.fatherId === parentId);
      if (inMemoryChildren.length > 0) {
        return inMemoryChildren;
      }
    }

    return members.map(toFamilyMember);
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

    const members = await prisma.familyMember.findMany();

    if (members.length === 0) {
      return getStatisticsFromMemory();
    }

    const totalMembers = members.length;
    const males = members.filter(m => m.gender === 'Male').length;
    const females = members.filter(m => m.gender === 'Female').length;
    const generations = members.length > 0
      ? Math.max(...members.map(m => m.generation))
      : 0;

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

    const members = await prisma.familyMember.findMany({
      select: { id: true }
    });

    if (members.length === 0) {
      // Check in-memory as well
      if (familyMembers.length === 0) return 'P001';
      const maxId = Math.max(...familyMembers.map(m => parseInt(m.id.replace('P', ''))));
      return `P${String(maxId + 1).padStart(3, '0')}`;
    }

    const maxId = Math.max(...members.map(m => parseInt(m.id.replace('P', ''))));
    return `P${String(maxId + 1).padStart(3, '0')}`;
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

    const members = await prisma.familyMember.findMany({
      where: { generation: 2 },
      orderBy: { id: 'asc' }
    });

    if (members.length === 0) {
      return familyMembers.filter(m => m.generation === 2);
    }

    return members.map(toFamilyMember);
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
 * Create a new member in database
 */
export async function createMemberInDb(member: Omit<FamilyMember, 'createdAt' | 'updatedAt'>): Promise<FamilyMember | null> {
  try {
    if (!await isDatabaseAvailable()) {
      console.error('Database unavailable, cannot create member');
      return null;
    }

    const created = await prisma.familyMember.create({
      data: {
        id: member.id,
        firstName: member.firstName,
        fatherName: member.fatherName,
        grandfatherName: member.grandfatherName,
        greatGrandfatherName: member.greatGrandfatherName,
        familyName: member.familyName,
        fatherId: member.fatherId,
        gender: member.gender,
        birthYear: member.birthYear,
        sonsCount: member.sonsCount,
        daughtersCount: member.daughtersCount,
        generation: member.generation,
        branch: member.branch,
        fullNameAr: member.fullNameAr,
        fullNameEn: member.fullNameEn,
        phone: member.phone,
        city: member.city,
        status: member.status,
        photoUrl: member.photoUrl,
        biography: member.biography,
        occupation: member.occupation,
        email: member.email,
        createdBy: member.createdBy || 'system',
      }
    });

    // Update parent's child count
    if (member.fatherId) {
      const countField = member.gender === 'Male' ? 'sonsCount' : 'daughtersCount';
      await prisma.familyMember.update({
        where: { id: member.fatherId },
        data: { [countField]: { increment: 1 } }
      }).catch(err => console.error('Failed to update parent count:', err));
    }

    return toFamilyMember(created);
  } catch (error) {
    console.error('Error creating member:', error);
    return null;
  }
}

/**
 * Update a member in database
 */
export async function updateMemberInDb(id: string, updates: Partial<FamilyMember>): Promise<FamilyMember | null> {
  try {
    if (!await isDatabaseAvailable()) {
      console.error('Database unavailable, cannot update member');
      return null;
    }

    const updated = await prisma.familyMember.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date(),
      }
    });

    return toFamilyMember(updated);
  } catch (error) {
    console.error('Error updating member:', error);
    return null;
  }
}

/**
 * Delete a member from database
 */
export async function deleteMemberFromDb(id: string): Promise<boolean> {
  try {
    if (!await isDatabaseAvailable()) {
      console.error('Database unavailable, cannot delete member');
      return false;
    }

    await prisma.familyMember.delete({
      where: { id }
    });

    return true;
  } catch (error) {
    console.error('Error deleting member:', error);
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

    const member = await prisma.familyMember.findUnique({
      where: { id },
      select: { id: true }
    });

    return member !== null;
  } catch (error) {
    console.error('Error checking member existence:', error);
    return familyMembers.some(m => m.id === id);
  }
}
