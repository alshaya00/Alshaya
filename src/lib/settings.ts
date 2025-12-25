import { prisma } from '@/lib/prisma';

export interface SystemConfig {
  defaultLanguage: string;
  dateFormat: string;
  treeDisplayMode: string;
  showDeceasedMembers: boolean;
  minBirthYear: number;
  maxBirthYear: number;
  requirePhone: boolean;
  requireEmail: boolean;
  allowDuplicateNames: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireStrongAccessCode: boolean;
  enableBranchEntries: boolean;
  enablePublicRegistry: boolean;
  enableExport: boolean;
  enableImport: boolean;
  autoBackup: boolean;
  autoBackupInterval: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  defaultLanguage: 'ar',
  dateFormat: 'DD/MM/YYYY',
  treeDisplayMode: 'vertical',
  showDeceasedMembers: true,
  minBirthYear: 1400,
  maxBirthYear: new Date().getFullYear(),
  requirePhone: false,
  requireEmail: false,
  allowDuplicateNames: true,
  sessionTimeout: 60,
  maxLoginAttempts: 20,
  requireStrongAccessCode: false,
  enableBranchEntries: true,
  enablePublicRegistry: true,
  enableExport: true,
  enableImport: true,
  autoBackup: true,
  autoBackupInterval: 24,
};

let cachedConfig: SystemConfig | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60000;

export async function getSystemConfig(): Promise<SystemConfig> {
  const now = Date.now();
  if (cachedConfig && (now - cacheTime) < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    let config = await prisma.systemConfig.findUnique({
      where: { id: 'default' }
    });

    if (!config) {
      config = await prisma.systemConfig.create({
        data: { id: 'default' }
      });
    }

    cachedConfig = {
      defaultLanguage: config.defaultLanguage,
      dateFormat: config.dateFormat,
      treeDisplayMode: config.treeDisplayMode,
      showDeceasedMembers: config.showDeceasedMembers,
      minBirthYear: config.minBirthYear,
      maxBirthYear: config.maxBirthYear,
      requirePhone: config.requirePhone,
      requireEmail: config.requireEmail,
      allowDuplicateNames: config.allowDuplicateNames,
      sessionTimeout: config.sessionTimeout,
      maxLoginAttempts: config.maxLoginAttempts,
      requireStrongAccessCode: config.requireStrongAccessCode,
      enableBranchEntries: config.enableBranchEntries,
      enablePublicRegistry: config.enablePublicRegistry,
      enableExport: config.enableExport,
      enableImport: config.enableImport,
      autoBackup: config.autoBackup,
      autoBackupInterval: config.autoBackupInterval,
    };
    cacheTime = now;

    return cachedConfig;
  } catch (error) {
    console.error('Failed to load system config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

export function invalidateConfigCache() {
  cachedConfig = null;
  cacheTime = 0;
}

export async function getFeatureFlags() {
  const config = await getSystemConfig();
  return {
    branchEntries: config.enableBranchEntries,
    publicRegistry: config.enablePublicRegistry,
    export: config.enableExport,
    import: config.enableImport,
    autoBackup: config.autoBackup,
  };
}

export async function getValidationRules() {
  const config = await getSystemConfig();
  return {
    minBirthYear: config.minBirthYear,
    maxBirthYear: config.maxBirthYear,
    requirePhone: config.requirePhone,
    requireEmail: config.requireEmail,
    allowDuplicateNames: config.allowDuplicateNames,
  };
}

export async function getDisplaySettings() {
  const config = await getSystemConfig();
  return {
    defaultLanguage: config.defaultLanguage,
    dateFormat: config.dateFormat,
    treeDisplayMode: config.treeDisplayMode,
    showDeceasedMembers: config.showDeceasedMembers,
  };
}

export async function getSecuritySettings() {
  const config = await getSystemConfig();
  return {
    sessionTimeout: config.sessionTimeout,
    maxLoginAttempts: config.maxLoginAttempts,
    requireStrongAccessCode: config.requireStrongAccessCode,
  };
}

export { DEFAULT_CONFIG };
