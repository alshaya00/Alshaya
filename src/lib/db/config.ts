/**
 * Database Configuration Service
 *
 * Provides access to configuration data stored in the database:
 * - Permissions and role defaults
 * - Export fields and categories
 * - Journal categories
 * - Event types
 * - Gatherings
 * - Site settings
 * - Privacy settings
 * - Backup configuration
 */

import { getPrismaClient } from '../prisma';

// ============================================
// TYPES
// ============================================

export interface Permission {
  id: string;
  key: string;
  labelAr: string;
  labelEn: string;
  description: string | null;
  descriptionAr: string | null;
  category: string;
  displayOrder: number;
  isActive: boolean;
}

export interface PermissionCategory {
  id: string;
  key: string;
  labelAr: string;
  labelEn: string;
  displayOrder: number;
  isActive: boolean;
}

export interface RoleDefaultPermission {
  role: string;
  permissionKey: string;
  allowed: boolean;
}

export interface ExportField {
  id: string;
  key: string;
  labelEn: string;
  labelAr: string;
  category: string;
  selectedByDefault: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface ExportFieldCategory {
  id: string;
  key: string;
  labelEn: string;
  labelAr: string;
  displayOrder: number;
  isActive: boolean;
}

export interface JournalCategory {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  icon: string | null;
  color: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface EventType {
  id: string;
  key: string;
  labelEn: string;
  labelAr: string;
  color: string | null;
  bgColor: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface Gathering {
  id: string;
  title: string;
  titleAr: string;
  description: string | null;
  descriptionAr: string | null;
  date: Date;
  endDate: Date | null;
  time: string | null;
  location: string | null;
  locationAr: string | null;
  locationUrl: string | null;
  type: string;
  coverImage: string | null;
  organizerId: string | null;
  organizerName: string;
  organizerNameAr: string;
  status: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  attendees?: GatheringAttendee[];
}

export interface GatheringAttendee {
  id: string;
  gatheringId: string;
  userId: string | null;
  memberId: string | null;
  name: string;
  email: string | null;
  rsvpStatus: string;
  rsvpNote: string | null;
  rsvpAt: Date | null;
  attended: boolean;
  attendedAt: Date | null;
}

export interface BackupConfig {
  id: string;
  enabled: boolean;
  intervalHours: number;
  maxBackups: number;
  retentionDays: number;
  lastBackupAt: Date | null;
  lastBackupStatus: string | null;
  lastBackupError: string | null;
  lastBackupSize: number | null;
}

// ============================================
// CACHING
// ============================================

// Cache for database configuration with 5-minute TTL
const cache: {
  permissions?: { data: Permission[]; timestamp: number };
  permissionCategories?: { data: PermissionCategory[]; timestamp: number };
  rolePermissions?: { data: Map<string, Map<string, boolean>>; timestamp: number };
  exportFields?: { data: ExportField[]; timestamp: number };
  exportFieldCategories?: { data: ExportFieldCategory[]; timestamp: number };
  journalCategories?: { data: JournalCategory[]; timestamp: number };
  eventTypes?: { data: EventType[]; timestamp: number };
  backupConfig?: { data: BackupConfig | null; timestamp: number };
} = {};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid<T>(entry: { data: T; timestamp: number } | undefined): entry is { data: T; timestamp: number } {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}

export function clearConfigCache() {
  Object.keys(cache).forEach(key => {
    delete cache[key as keyof typeof cache];
  });
}

// ============================================
// PERMISSIONS
// ============================================

export async function getAllPermissions(): Promise<Permission[]> {
  if (isCacheValid(cache.permissions)) {
    return cache.permissions.data;
  }

  try {
    const prisma = await getPrismaClient();
    const permissions = await prisma.permission.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    cache.permissions = { data: permissions, timestamp: Date.now() };
    return permissions;
  } catch (error) {
    console.error('Failed to fetch permissions from database:', error);
    return [];
  }
}

export async function getPermissionCategories(): Promise<PermissionCategory[]> {
  if (isCacheValid(cache.permissionCategories)) {
    return cache.permissionCategories.data;
  }

  try {
    const prisma = await getPrismaClient();
    const categories = await prisma.permissionCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    cache.permissionCategories = { data: categories, timestamp: Date.now() };
    return categories;
  } catch (error) {
    console.error('Failed to fetch permission categories from database:', error);
    return [];
  }
}

export async function getRolePermissionMatrix(): Promise<Map<string, Map<string, boolean>>> {
  if (isCacheValid(cache.rolePermissions)) {
    return cache.rolePermissions.data;
  }

  try {
    const prisma = await getPrismaClient();
    const rolePermissions = await prisma.roleDefaultPermission.findMany({
      include: { permission: true },
    });

    const matrix = new Map<string, Map<string, boolean>>();

    for (const rp of rolePermissions) {
      if (!matrix.has(rp.role)) {
        matrix.set(rp.role, new Map());
      }
      matrix.get(rp.role)!.set(rp.permission.key, rp.allowed);
    }

    cache.rolePermissions = { data: matrix, timestamp: Date.now() };
    return matrix;
  } catch (error) {
    console.error('Failed to fetch role permissions from database:', error);
    return new Map();
  }
}

export async function hasRolePermission(role: string, permissionKey: string): Promise<boolean> {
  const matrix = await getRolePermissionMatrix();
  const rolePerms = matrix.get(role);
  if (!rolePerms) return false;
  return rolePerms.get(permissionKey) ?? false;
}

// ============================================
// EXPORT FIELDS
// ============================================

export async function getAllExportFields(): Promise<ExportField[]> {
  if (isCacheValid(cache.exportFields)) {
    return cache.exportFields.data;
  }

  try {
    const prisma = await getPrismaClient();
    const fields = await prisma.exportField.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    cache.exportFields = { data: fields, timestamp: Date.now() };
    return fields;
  } catch (error) {
    console.error('Failed to fetch export fields from database:', error);
    return [];
  }
}

export async function getExportFieldCategories(): Promise<ExportFieldCategory[]> {
  if (isCacheValid(cache.exportFieldCategories)) {
    return cache.exportFieldCategories.data;
  }

  try {
    const prisma = await getPrismaClient();
    const categories = await prisma.exportFieldCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    cache.exportFieldCategories = { data: categories, timestamp: Date.now() };
    return categories;
  } catch (error) {
    console.error('Failed to fetch export field categories from database:', error);
    return [];
  }
}

// ============================================
// JOURNAL CATEGORIES
// ============================================

export async function getJournalCategories(): Promise<JournalCategory[]> {
  if (isCacheValid(cache.journalCategories)) {
    return cache.journalCategories.data;
  }

  try {
    const prisma = await getPrismaClient();
    const categories = await prisma.journalCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    cache.journalCategories = { data: categories, timestamp: Date.now() };
    return categories;
  } catch (error) {
    console.error('Failed to fetch journal categories from database:', error);
    return [];
  }
}

// ============================================
// EVENT TYPES
// ============================================

export async function getEventTypes(): Promise<EventType[]> {
  if (isCacheValid(cache.eventTypes)) {
    return cache.eventTypes.data;
  }

  try {
    const prisma = await getPrismaClient();
    const types = await prisma.eventType.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    cache.eventTypes = { data: types, timestamp: Date.now() };
    return types;
  } catch (error) {
    console.error('Failed to fetch event types from database:', error);
    return [];
  }
}

// ============================================
// GATHERINGS
// ============================================

export async function getGatherings(options?: {
  status?: string;
  type?: string;
  includeAttendees?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Gathering[]> {
  try {
    const prisma = await getPrismaClient();
    const gatherings = await prisma.gathering.findMany({
      where: {
        ...(options?.status && { status: options.status }),
        ...(options?.type && { type: options.type }),
        isPublic: true,
      },
      include: options?.includeAttendees ? { attendees: true } : undefined,
      orderBy: { date: 'asc' },
      take: options?.limit,
      skip: options?.offset,
    });

    return gatherings;
  } catch (error) {
    console.error('Failed to fetch gatherings from database:', error);
    return [];
  }
}

export async function getGatheringById(id: string, includeAttendees = true): Promise<Gathering | null> {
  try {
    const prisma = await getPrismaClient();
    const gathering = await prisma.gathering.findUnique({
      where: { id },
      include: includeAttendees ? { attendees: true } : undefined,
    });

    return gathering;
  } catch (error) {
    console.error('Failed to fetch gathering from database:', error);
    return null;
  }
}

export async function createGathering(data: Omit<Gathering, 'id' | 'createdAt' | 'updatedAt' | 'attendees'>): Promise<Gathering | null> {
  try {
    const prisma = await getPrismaClient();
    const gathering = await prisma.gathering.create({
      data,
    });

    return gathering;
  } catch (error) {
    console.error('Failed to create gathering:', error);
    return null;
  }
}

export async function updateGatheringRsvp(
  gatheringId: string,
  userId: string,
  rsvpStatus: 'YES' | 'MAYBE' | 'NO',
  name: string,
  email?: string
): Promise<GatheringAttendee | null> {
  try {
    const prisma = await getPrismaClient();
    const attendee = await prisma.gatheringAttendee.upsert({
      where: {
        gatheringId_userId: { gatheringId, userId },
      },
      update: {
        rsvpStatus,
        rsvpAt: new Date(),
      },
      create: {
        gatheringId,
        userId,
        name,
        email,
        rsvpStatus,
        rsvpAt: new Date(),
      },
    });

    return attendee;
  } catch (error) {
    console.error('Failed to update RSVP:', error);
    return null;
  }
}

// ============================================
// BACKUP CONFIGURATION
// ============================================

export async function getBackupConfig(): Promise<BackupConfig | null> {
  if (isCacheValid(cache.backupConfig)) {
    return cache.backupConfig.data;
  }

  try {
    const prisma = await getPrismaClient();
    const config = await prisma.backupConfig.findUnique({
      where: { id: 'default' },
    });

    cache.backupConfig = { data: config, timestamp: Date.now() };
    return config;
  } catch (error) {
    console.error('Failed to fetch backup config from database:', error);
    return null;
  }
}

export async function updateBackupConfig(data: Partial<Omit<BackupConfig, 'id'>>): Promise<BackupConfig | null> {
  try {
    const prisma = await getPrismaClient();
    const config = await prisma.backupConfig.upsert({
      where: { id: 'default' },
      update: data,
      create: {
        id: 'default',
        enabled: data.enabled ?? true,
        intervalHours: data.intervalHours ?? 24,
        maxBackups: data.maxBackups ?? 10,
        retentionDays: data.retentionDays ?? 30,
      },
    });

    // Clear cache
    delete cache.backupConfig;

    return config;
  } catch (error) {
    console.error('Failed to update backup config:', error);
    return null;
  }
}

// ============================================
// SITE SETTINGS
// ============================================

export async function getSiteSettings() {
  try {
    const prisma = await getPrismaClient();
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
    });
    return settings;
  } catch (error) {
    console.error('Failed to fetch site settings:', error);
    return null;
  }
}

export async function updateSiteSettings(data: Record<string, unknown>) {
  try {
    const prisma = await getPrismaClient();
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: {
        id: 'default',
        ...data,
      },
    });
    return settings;
  } catch (error) {
    console.error('Failed to update site settings:', error);
    return null;
  }
}

// ============================================
// PRIVACY SETTINGS
// ============================================

export async function getPrivacySettings() {
  try {
    const prisma = await getPrismaClient();
    const settings = await prisma.privacySettings.findUnique({
      where: { id: 'default' },
    });
    return settings;
  } catch (error) {
    console.error('Failed to fetch privacy settings:', error);
    return null;
  }
}

export async function updatePrivacySettings(data: Record<string, unknown>) {
  try {
    const prisma = await getPrismaClient();
    const settings = await prisma.privacySettings.upsert({
      where: { id: 'default' },
      update: data,
      create: {
        id: 'default',
        ...data,
      },
    });
    return settings;
  } catch (error) {
    console.error('Failed to update privacy settings:', error);
    return null;
  }
}
