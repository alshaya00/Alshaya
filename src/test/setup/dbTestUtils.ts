/**
 * Database Test Utilities
 * Utilities for testing database operations with Prisma
 */

import { PrismaClient } from '@prisma/client';
import {
  createMockUser,
  createMockMember,
  createMockAdmin,
  createMockSuperAdmin,
  type MockUser,
  type MockFamilyMember,
} from './testUtils';

// ============================================
// PRISMA TEST CLIENT
// ============================================

let testPrisma: PrismaClient | null = null;

/**
 * Get or create a test Prisma client
 * Uses test database URL if available
 */
export function getTestPrismaClient(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
      log: process.env.DEBUG_PRISMA === 'true' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return testPrisma;
}

/**
 * Disconnect the test Prisma client
 */
export async function disconnectTestPrisma(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

// ============================================
// DATABASE CLEANUP
// ============================================

/**
 * Tables to clean in order (respects foreign key constraints)
 */
const TABLES_TO_CLEAN = [
  'Session',
  'ActivityLog',
  'AuditLog',
  'PendingImage',
  'PendingMember',
  'MemberUpdateRequest',
  'BroadcastRecipient',
  'Broadcast',
  'BreastfeedingRelation',
  'BranchEntryLink',
  'SearchHistory',
  'Journal',
  'Gathering',
  'Invite',
  'AccessRequest',
  'User',
  'FamilyMember',
  'SiteSettings',
  'Snapshot',
];

/**
 * Clean all test data from database
 * WARNING: Only use in test environments!
 */
export async function cleanDatabase(prisma?: PrismaClient): Promise<void> {
  const client = prisma || getTestPrismaClient();

  // Safety check - never run in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot clean database in production environment!');
  }

  for (const table of TABLES_TO_CLEAN) {
    try {
      await client.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch {
      // Table might not exist, continue
    }
  }
}

/**
 * Delete specific test data by prefix
 */
export async function cleanTestData(prisma?: PrismaClient): Promise<void> {
  const client = prisma || getTestPrismaClient();

  // Delete users with test email pattern
  await client.user.deleteMany({
    where: {
      email: {
        contains: '@test.com',
      },
    },
  });

  // Delete test members
  await client.familyMember.deleteMany({
    where: {
      id: {
        startsWith: 'test-',
      },
    },
  });
}

// ============================================
// DATABASE SEEDING
// ============================================

export interface TestSeedData {
  rootMember: MockFamilyMember;
  testUser: MockUser;
  testAdmin: MockUser;
  testSuperAdmin: MockUser;
}

/**
 * Seed database with test data
 */
export async function seedTestDatabase(prisma?: PrismaClient): Promise<TestSeedData> {
  const client = prisma || getTestPrismaClient();

  // Create root family member
  const rootMemberData = createMockMember({
    id: 'test-root-001',
    firstName: 'عبدالله',
    generation: 1,
    status: 'Deceased',
    birthYear: 1850,
    deathYear: 1920,
  });

  const rootMember = await client.familyMember.upsert({
    where: { id: rootMemberData.id },
    update: {},
    create: {
      id: rootMemberData.id,
      firstName: rootMemberData.firstName,
      familyName: rootMemberData.familyName,
      gender: rootMemberData.gender,
      generation: rootMemberData.generation,
      status: rootMemberData.status,
      birthYear: rootMemberData.birthYear,
      deathYear: rootMemberData.deathYear,
      fullNameAr: rootMemberData.fullNameAr,
    },
  });

  // Create test user
  const testUserData = createMockUser({
    id: 'test-user-001',
    email: 'testuser@test.com',
  });

  const testUser = await client.user.upsert({
    where: { id: testUserData.id },
    update: {},
    create: {
      id: testUserData.id,
      email: testUserData.email,
      passwordHash: testUserData.passwordHash,
      nameArabic: testUserData.nameArabic,
      nameEnglish: testUserData.nameEnglish,
      role: testUserData.role,
      status: testUserData.status,
    },
  });

  // Create test admin
  const testAdminData = createMockAdmin({
    id: 'test-admin-001',
    email: 'testadmin@test.com',
  });

  const testAdmin = await client.user.upsert({
    where: { id: testAdminData.id },
    update: {},
    create: {
      id: testAdminData.id,
      email: testAdminData.email,
      passwordHash: testAdminData.passwordHash,
      nameArabic: testAdminData.nameArabic,
      nameEnglish: testAdminData.nameEnglish,
      role: testAdminData.role,
      status: testAdminData.status,
    },
  });

  // Create test super admin
  const testSuperAdminData = createMockSuperAdmin({
    id: 'test-superadmin-001',
    email: 'testsuperadmin@test.com',
  });

  const testSuperAdmin = await client.user.upsert({
    where: { id: testSuperAdminData.id },
    update: {},
    create: {
      id: testSuperAdminData.id,
      email: testSuperAdminData.email,
      passwordHash: testSuperAdminData.passwordHash,
      nameArabic: testSuperAdminData.nameArabic,
      nameEnglish: testSuperAdminData.nameEnglish,
      role: testSuperAdminData.role,
      status: testSuperAdminData.status,
    },
  });

  return {
    rootMember: { ...rootMemberData, ...rootMember } as MockFamilyMember,
    testUser: { ...testUserData, ...testUser } as MockUser,
    testAdmin: { ...testAdminData, ...testAdmin } as MockUser,
    testSuperAdmin: { ...testSuperAdminData, ...testSuperAdmin } as MockUser,
  };
}

// ============================================
// TRANSACTION HELPERS
// ============================================

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Run a test within a transaction that gets rolled back
 * Useful for testing without persisting changes
 */
export async function withRollbackTransaction<T>(
  testFn: (tx: TransactionClient) => Promise<T>,
  prisma?: PrismaClient
): Promise<T> {
  const client = prisma || getTestPrismaClient();
  let result: T;

  try {
    await client.$transaction(async (tx) => {
      result = await testFn(tx);
      // Force rollback by throwing
      throw new Error('__ROLLBACK__');
    });
  } catch (error) {
    if (error instanceof Error && error.message === '__ROLLBACK__') {
      return result!;
    }
    throw error;
  }

  return result!;
}

// ============================================
// ASSERTION HELPERS
// ============================================

/**
 * Assert that a record exists in the database
 */
export async function assertRecordExists(
  table: 'user' | 'familyMember' | 'session' | 'broadcast',
  conditions: Record<string, unknown>,
  prisma?: PrismaClient
): Promise<void> {
  const client = prisma || getTestPrismaClient();

  const record = await (client[table] as { findFirst: (args: { where: Record<string, unknown> }) => Promise<unknown> }).findFirst({
    where: conditions,
  });

  expect(record).not.toBeNull();
}

/**
 * Assert that a record does NOT exist in the database
 */
export async function assertRecordNotExists(
  table: 'user' | 'familyMember' | 'session' | 'broadcast',
  conditions: Record<string, unknown>,
  prisma?: PrismaClient
): Promise<void> {
  const client = prisma || getTestPrismaClient();

  const record = await (client[table] as { findFirst: (args: { where: Record<string, unknown> }) => Promise<unknown> }).findFirst({
    where: conditions,
  });

  expect(record).toBeNull();
}

/**
 * Count records matching conditions
 */
export async function countRecords(
  table: 'user' | 'familyMember' | 'session' | 'broadcast',
  conditions?: Record<string, unknown>,
  prisma?: PrismaClient
): Promise<number> {
  const client = prisma || getTestPrismaClient();

  const count = await (client[table] as { count: (args?: { where?: Record<string, unknown> }) => Promise<number> }).count({
    ...(conditions ? { where: conditions } : {}),
  });

  return count;
}

// ============================================
// MOCK PRISMA (for unit tests)
// ============================================

/**
 * Create a mock Prisma client for unit testing
 * Use this when you don't want to hit the actual database
 */
export function createMockPrismaClient(): Record<string, unknown> {
  const createMockModel = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  });

  return {
    user: createMockModel(),
    familyMember: createMockModel(),
    session: createMockModel(),
    broadcast: createMockModel(),
    broadcastRecipient: createMockModel(),
    pendingMember: createMockModel(),
    pendingImage: createMockModel(),
    memberUpdateRequest: createMockModel(),
    activityLog: createMockModel(),
    auditLog: createMockModel(),
    journal: createMockModel(),
    gathering: createMockModel(),
    branchEntryLink: createMockModel(),
    searchHistory: createMockModel(),
    siteSettings: createMockModel(),
    snapshot: createMockModel(),
    invite: createMockModel(),
    accessRequest: createMockModel(),
    breastfeedingRelation: createMockModel(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  };
}

/**
 * Reset all mocks on a mock Prisma client
 */
export function resetMockPrismaClient(mockClient: Record<string, unknown>): void {
  Object.values(mockClient).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model as Record<string, unknown>).forEach((method) => {
        if (typeof method === 'function' && 'mockReset' in method) {
          (method as jest.Mock).mockReset();
        }
      });
    }
  });
}
