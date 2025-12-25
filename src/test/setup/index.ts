/**
 * Test Setup Exports
 * Central export point for all test utilities
 */

// Test utilities and mock factories
export {
  // Types
  type UserRole,
  type UserStatus,
  type Gender,
  type MemberStatus,
  type MockUser,
  type MockFamilyMember,
  type MockSession,
  type MockBroadcast,
  type MockPendingMember,

  // ID generators
  generateUserId,
  generateMemberId,
  generateSessionId,
  generateBroadcastId,
  generatePendingMemberId,
  generateToken,
  resetAllCounters,

  // User factories
  createMockUser,
  createMockAdmin,
  createMockSuperAdmin,
  createMockBranchLeader,
  createMockGuest,
  createMockPendingUser,
  createMockDisabledUser,
  createMockLockedUser,

  // Member factories
  createMockMember,
  createMockChild,
  createMockDeceasedMember,
  createMockFamilyTree,

  // Session factories
  createMockSession,
  createExpiredSession,

  // Broadcast factories
  createMockBroadcast,
  createMockMeeting,

  // Pending member factories
  createMockPendingMember,

  // Request factories
  createMockRequest,
  createMockAuthRequest,
  createMockFormData,

  // Response helpers
  parseJsonResponse,
  expectStatus,
  expectSuccess,
  expectError,
  expectJsonResponse,

  // Validation helpers
  expectValidationError,
  expectValidationSuccess,

  // Date helpers
  createPastDate,
  createFutureDate,

  // Environment helpers
  setupTestEnvironment,
  teardownTestEnvironment,
} from './testUtils';

// Database test utilities
export {
  // Prisma client
  getTestPrismaClient,
  disconnectTestPrisma,

  // Database operations
  cleanDatabase,
  cleanTestData,
  seedTestDatabase,
  type TestSeedData,

  // Transaction helpers
  withRollbackTransaction,

  // Assertion helpers
  assertRecordExists,
  assertRecordNotExists,
  countRecords,

  // Mock Prisma
  createMockPrismaClient,
  resetMockPrismaClient,
} from './dbTestUtils';
