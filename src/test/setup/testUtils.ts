/**
 * Test Utilities
 * Comprehensive mock data factories and test helpers for the Al-Shaye Family Tree application
 *
 * This module provides:
 * - Mock data factories for all entity types
 * - Request/Response mocking utilities
 * - Assertion helpers
 * - Test data generators
 */

import type { NextRequest } from 'next/server';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'BRANCH_LEADER' | 'MEMBER' | 'GUEST';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';
export type Gender = 'Male' | 'Female';
export type MemberStatus = 'Living' | 'Deceased';

export interface MockUser {
  id: string;
  email: string;
  passwordHash: string;
  nameArabic: string;
  nameEnglish: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  assignedBranch: string | null;
  linkedMemberId: string | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export interface MockFamilyMember {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string;
  fatherId: string | null;
  motherId: string | null;
  gender: Gender;
  birthYear: number | null;
  deathYear: number | null;
  generation: number;
  branch: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  phone: string | null;
  city: string | null;
  status: MemberStatus;
  photoUrl: string | null;
  biography: string | null;
  occupation: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockSession {
  id: string;
  token: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  rememberMe: boolean;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface MockBroadcast {
  id: string;
  titleAr: string;
  titleEn: string | null;
  contentAr: string;
  contentEn: string | null;
  type: 'MEETING' | 'ANNOUNCEMENT' | 'REMINDER' | 'UPDATE';
  targetAudience: 'ALL' | 'BRANCH' | 'GENERATION' | 'CUSTOM';
  targetBranch: string | null;
  targetGeneration: number | null;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT';
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
}

export interface MockPendingMember {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string;
  proposedFatherId: string | null;
  gender: Gender;
  birthYear: number | null;
  generation: number;
  branch: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  phone: string | null;
  city: string | null;
  status: MemberStatus;
  occupation: string | null;
  email: string | null;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedById: string | null;
  submittedByEmail: string | null;
  submittedAt: Date;
  reviewedById: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
}

// ============================================
// ID GENERATORS
// ============================================

let userIdCounter = 0;
let memberIdCounter = 0;
let sessionIdCounter = 0;
let broadcastIdCounter = 0;
let pendingMemberIdCounter = 0;

export function generateUserId(): string {
  userIdCounter++;
  return `user-${userIdCounter.toString().padStart(6, '0')}`;
}

export function generateMemberId(): string {
  memberIdCounter++;
  return `P${memberIdCounter.toString().padStart(3, '0')}`;
}

export function generateSessionId(): string {
  sessionIdCounter++;
  return `session-${sessionIdCounter.toString().padStart(6, '0')}`;
}

export function generateBroadcastId(): string {
  broadcastIdCounter++;
  return `broadcast-${broadcastIdCounter.toString().padStart(6, '0')}`;
}

export function generatePendingMemberId(): string {
  pendingMemberIdCounter++;
  return `pending-${pendingMemberIdCounter.toString().padStart(6, '0')}`;
}

export function generateToken(): string {
  return `test-token-${Math.random().toString(36).substring(2, 15)}`;
}

export function resetAllCounters(): void {
  userIdCounter = 0;
  memberIdCounter = 0;
  sessionIdCounter = 0;
  broadcastIdCounter = 0;
  pendingMemberIdCounter = 0;
}

// ============================================
// USER MOCK FACTORIES
// ============================================

export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  const id = overrides?.id || generateUserId();
  return {
    id,
    email: `${id}@test.com`,
    passwordHash: '$2b$12$test.hash.for.testing.purposes.only',
    nameArabic: 'مستخدم اختبار',
    nameEnglish: 'Test User',
    phone: '+966501234567',
    role: 'MEMBER',
    status: 'ACTIVE',
    assignedBranch: null,
    linkedMemberId: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

export function createMockAdmin(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    role: 'ADMIN',
    nameArabic: 'مشرف اختبار',
    nameEnglish: 'Test Admin',
    ...overrides,
  });
}

export function createMockSuperAdmin(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    role: 'SUPER_ADMIN',
    nameArabic: 'المشرف الأعلى',
    nameEnglish: 'Super Admin',
    ...overrides,
  });
}

export function createMockBranchLeader(branch: string, overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    role: 'BRANCH_LEADER',
    assignedBranch: branch,
    nameArabic: 'قائد الفرع',
    nameEnglish: 'Branch Leader',
    ...overrides,
  });
}

export function createMockGuest(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    role: 'GUEST',
    status: 'ACTIVE',
    nameArabic: 'زائر',
    nameEnglish: 'Guest',
    ...overrides,
  });
}

export function createMockPendingUser(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    status: 'PENDING',
    ...overrides,
  });
}

export function createMockDisabledUser(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    status: 'DISABLED',
    ...overrides,
  });
}

export function createMockLockedUser(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    failedLoginAttempts: 5,
    lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    ...overrides,
  });
}

// ============================================
// FAMILY MEMBER MOCK FACTORIES
// ============================================

export function createMockMember(overrides?: Partial<MockFamilyMember>): MockFamilyMember {
  const id = overrides?.id || generateMemberId();
  const firstName = overrides?.firstName || 'محمد';

  return {
    id,
    firstName,
    fatherName: null,
    grandfatherName: null,
    greatGrandfatherName: null,
    familyName: 'آل شايع',
    fatherId: null,
    motherId: null,
    gender: 'Male',
    birthYear: null,
    deathYear: null,
    generation: 1,
    branch: null,
    fullNameAr: `${firstName} آل شايع`,
    fullNameEn: null,
    phone: null,
    city: null,
    status: 'Living',
    photoUrl: null,
    biography: null,
    occupation: null,
    email: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockChild(
  father: MockFamilyMember,
  overrides?: Partial<MockFamilyMember>
): MockFamilyMember {
  return createMockMember({
    fatherId: father.id,
    fatherName: father.firstName,
    generation: father.generation + 1,
    branch: father.branch,
    ...overrides,
  });
}

export function createMockDeceasedMember(overrides?: Partial<MockFamilyMember>): MockFamilyMember {
  return createMockMember({
    status: 'Deceased',
    deathYear: 2020,
    birthYear: 1940,
    ...overrides,
  });
}

export function createMockFamilyTree(
  generations: number = 3,
  childrenPerMember: number = 2
): MockFamilyMember[] {
  resetAllCounters();
  const members: MockFamilyMember[] = [];

  // Create root member
  const root = createMockMember({
    firstName: 'عبدالله',
    generation: 1,
    status: 'Deceased',
    birthYear: 1850,
    deathYear: 1920,
  });
  members.push(root);

  // Create descendants
  let currentGeneration = [root];

  const arabicNames = ['محمد', 'أحمد', 'علي', 'خالد', 'عبدالرحمن', 'سعد', 'فهد', 'ناصر'];
  let nameIndex = 0;

  for (let gen = 2; gen <= generations; gen++) {
    const nextGeneration: MockFamilyMember[] = [];

    for (const parent of currentGeneration) {
      for (let i = 0; i < childrenPerMember; i++) {
        const child = createMockChild(parent, {
          firstName: arabicNames[nameIndex % arabicNames.length],
          gender: i % 2 === 0 ? 'Male' : 'Female',
          birthYear: (parent.birthYear || 1850) + 25,
          status: gen < generations ? 'Deceased' : 'Living',
        });
        members.push(child);
        if (child.gender === 'Male') {
          nextGeneration.push(child);
        }
        nameIndex++;
      }
    }

    currentGeneration = nextGeneration;
  }

  return members;
}

// ============================================
// SESSION MOCK FACTORIES
// ============================================

export function createMockSession(
  user: MockUser,
  options?: {
    expiresIn?: number;
    rememberMe?: boolean;
    expired?: boolean;
  }
): MockSession {
  const now = new Date();
  const expiresIn = options?.expired
    ? -24 * 60 * 60 * 1000 // Already expired
    : options?.expiresIn ?? 24 * 60 * 60 * 1000; // 24 hours

  return {
    id: generateSessionId(),
    token: generateToken(),
    userId: user.id,
    createdAt: now,
    expiresAt: new Date(now.getTime() + expiresIn),
    rememberMe: options?.rememberMe ?? false,
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Test Agent)',
  };
}

export function createExpiredSession(user: MockUser): MockSession {
  return createMockSession(user, { expired: true });
}

// ============================================
// BROADCAST MOCK FACTORIES
// ============================================

export function createMockBroadcast(overrides?: Partial<MockBroadcast>): MockBroadcast {
  return {
    id: overrides?.id || generateBroadcastId(),
    titleAr: 'إعلان اختباري',
    titleEn: 'Test Announcement',
    contentAr: 'هذا محتوى الإعلان الاختباري',
    contentEn: 'This is the test announcement content',
    type: 'ANNOUNCEMENT',
    targetAudience: 'ALL',
    targetBranch: null,
    targetGeneration: null,
    status: 'DRAFT',
    createdById: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    sentAt: null,
    ...overrides,
  };
}

export function createMockMeeting(overrides?: Partial<MockBroadcast>): MockBroadcast {
  return createMockBroadcast({
    type: 'MEETING',
    titleAr: 'اجتماع العائلة',
    titleEn: 'Family Meeting',
    contentAr: 'دعوة لحضور اجتماع العائلة',
    contentEn: 'Invitation to family meeting',
    ...overrides,
  });
}

// ============================================
// PENDING MEMBER MOCK FACTORIES
// ============================================

export function createMockPendingMember(overrides?: Partial<MockPendingMember>): MockPendingMember {
  return {
    id: overrides?.id || generatePendingMemberId(),
    firstName: 'عضو جديد',
    fatherName: null,
    grandfatherName: null,
    greatGrandfatherName: null,
    familyName: 'آل شايع',
    proposedFatherId: null,
    gender: 'Male',
    birthYear: null,
    generation: 1,
    branch: null,
    fullNameAr: null,
    fullNameEn: null,
    phone: null,
    city: null,
    status: 'Living',
    occupation: null,
    email: null,
    reviewStatus: 'PENDING',
    submittedById: null,
    submittedByEmail: null,
    submittedAt: new Date(),
    reviewedById: null,
    reviewedAt: null,
    reviewNote: null,
    ...overrides,
  };
}

// ============================================
// REQUEST MOCK FACTORIES
// ============================================

export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
}): Request {
  const {
    method = 'GET',
    url = 'http://localhost:5000/api/test',
    body,
    headers = {},
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
  }

  return new Request(urlObj.toString(), init);
}

export function createMockAuthRequest(
  token: string,
  options: Omit<Parameters<typeof createMockRequest>[0], 'headers'> & {
    headers?: Record<string, string>;
  } = {}
): Request {
  return createMockRequest({
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

export function createMockFormData(data: Record<string, string | Blob>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

// ============================================
// RESPONSE HELPERS
// ============================================

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function expectStatus(response: Response, expectedStatus: number): Promise<void> {
  expect(response.status).toBe(expectedStatus);
}

export async function expectSuccess(response: Response): Promise<void> {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
}

export async function expectError(response: Response, expectedStatus: number): Promise<void> {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data.success).toBe(false);
}

export async function expectJsonResponse<T>(
  response: Response,
  expectedFields: (keyof T)[]
): Promise<T> {
  const data = await response.json();
  for (const field of expectedFields) {
    expect(data).toHaveProperty(String(field));
  }
  return data as T;
}

// ============================================
// VALIDATION TEST HELPERS
// ============================================

export function expectValidationError(
  result: { success: boolean; error?: unknown },
  fieldPath?: string
): void {
  expect(result.success).toBe(false);
  if (fieldPath && result.error) {
    // Check if the error contains the field path
    expect(JSON.stringify(result.error)).toContain(fieldPath);
  }
}

export function expectValidationSuccess<T>(
  result: { success: boolean; data?: T }
): T {
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();
  return result.data as T;
}

// ============================================
// DATE HELPERS
// ============================================

export function createPastDate(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

export function createFutureDate(daysAhead: number): Date {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
}

// ============================================
// CLEANUP HELPERS
// ============================================

export function setupTestEnvironment(): void {
  resetAllCounters();
  jest.clearAllMocks();
}

export function teardownTestEnvironment(): void {
  resetAllCounters();
}
