'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ============================================
// FEATURE FLAGS TYPES
// ============================================

export interface FeatureFlags {
  // Core Pages
  familyTree: boolean;
  registry: boolean;
  journals: boolean;
  gallery: boolean;
  gatherings: boolean;
  dashboard: boolean;
  search: boolean;
  branches: boolean;

  // Data Management
  quickAdd: boolean;
  importData: boolean;
  exportData: boolean;
  treeEditor: boolean;
  duplicates: boolean;
  changeHistory: boolean;

  // User Features
  registration: boolean;
  invitations: boolean;
  accessRequests: boolean;
  profiles: boolean;

  // Special Features
  breastfeeding: boolean;
  branchEntries: boolean;
  onboarding: boolean;

  // Admin Features
  imageModeration: boolean;
  broadcasts: boolean;
  reports: boolean;
  audit: boolean;
  apiServices: boolean;
}

export type FeatureKey = keyof FeatureFlags;

// Feature metadata for display
export interface FeatureInfo {
  key: FeatureKey;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: 'core' | 'data' | 'user' | 'special' | 'admin';
  icon?: string;
}

// All features with their metadata
export const featureList: FeatureInfo[] = [
  // Core Pages
  { key: 'familyTree', labelAr: 'شجرة العائلة', labelEn: 'Family Tree', descriptionAr: 'عرض شجرة العائلة التفاعلية', descriptionEn: 'Interactive family tree visualization', category: 'core' },
  { key: 'registry', labelAr: 'سجل الأعضاء', labelEn: 'Family Registry', descriptionAr: 'قائمة الأعضاء والبحث', descriptionEn: 'Member list and search', category: 'core' },
  { key: 'journals', labelAr: 'السجل التاريخي', labelEn: 'Family Journals', descriptionAr: 'القصص والتاريخ العائلي', descriptionEn: 'Family stories and history', category: 'core' },
  { key: 'gallery', labelAr: 'معرض الصور', labelEn: 'Photo Gallery', descriptionAr: 'صور العائلة والذكريات', descriptionEn: 'Family photos and memories', category: 'core' },
  { key: 'gatherings', labelAr: 'المناسبات', labelEn: 'Gatherings', descriptionAr: 'الفعاليات والتجمعات العائلية', descriptionEn: 'Family events and gatherings', category: 'core' },
  { key: 'dashboard', labelAr: 'لوحة الإحصائيات', labelEn: 'Dashboard', descriptionAr: 'إحصائيات ورسوم بيانية', descriptionEn: 'Statistics and charts', category: 'core' },
  { key: 'search', labelAr: 'البحث', labelEn: 'Search', descriptionAr: 'البحث في العائلة', descriptionEn: 'Search functionality', category: 'core' },
  { key: 'branches', labelAr: 'الفروع', labelEn: 'Branches', descriptionAr: 'عرض فروع العائلة', descriptionEn: 'Family branches view', category: 'core' },

  // Data Management
  { key: 'quickAdd', labelAr: 'إضافة سريعة', labelEn: 'Quick Add', descriptionAr: 'إضافة أعضاء بسرعة', descriptionEn: 'Quick member addition', category: 'data' },
  { key: 'importData', labelAr: 'استيراد البيانات', labelEn: 'Import Data', descriptionAr: 'استيراد من ملفات خارجية', descriptionEn: 'Import from external files', category: 'data' },
  { key: 'exportData', labelAr: 'تصدير البيانات', labelEn: 'Export Data', descriptionAr: 'تصدير البيانات لملفات', descriptionEn: 'Export data to files', category: 'data' },
  { key: 'treeEditor', labelAr: 'محرر الشجرة', labelEn: 'Tree Editor', descriptionAr: 'تعديل الشجرة بالسحب والإفلات', descriptionEn: 'Drag and drop tree editing', category: 'data' },
  { key: 'duplicates', labelAr: 'كشف التكرارات', labelEn: 'Duplicates', descriptionAr: 'اكتشاف الأعضاء المكررين', descriptionEn: 'Detect duplicate members', category: 'data' },
  { key: 'changeHistory', labelAr: 'سجل التغييرات', labelEn: 'Change History', descriptionAr: 'عرض تاريخ التعديلات', descriptionEn: 'View modification history', category: 'data' },

  // User Features
  { key: 'registration', labelAr: 'التسجيل', labelEn: 'Registration', descriptionAr: 'تسجيل المستخدمين الجدد', descriptionEn: 'New user registration', category: 'user' },
  { key: 'invitations', labelAr: 'الدعوات', labelEn: 'Invitations', descriptionAr: 'نظام دعوة المستخدمين', descriptionEn: 'User invitation system', category: 'user' },
  { key: 'accessRequests', labelAr: 'طلبات الانضمام', labelEn: 'Access Requests', descriptionAr: 'طلب الانضمام للعائلة', descriptionEn: 'Request to join family', category: 'user' },
  { key: 'profiles', labelAr: 'الملفات الشخصية', labelEn: 'Profiles', descriptionAr: 'صفحات الملف الشخصي', descriptionEn: 'User profile pages', category: 'user' },

  // Special Features
  { key: 'breastfeeding', labelAr: 'علاقات الرضاعة', labelEn: 'Breastfeeding Relations', descriptionAr: 'تتبع علاقات الرضاعة الشرعية', descriptionEn: 'Track milk kinship relations', category: 'special' },
  { key: 'branchEntries', labelAr: 'روابط الفروع', labelEn: 'Branch Entry Links', descriptionAr: 'روابط دخول الفروع', descriptionEn: 'Branch entry invitation links', category: 'special' },
  { key: 'onboarding', labelAr: 'دليل البداية', labelEn: 'Onboarding', descriptionAr: 'دليل المستخدم الجديد', descriptionEn: 'New user onboarding guide', category: 'special' },

  // Admin Features
  { key: 'imageModeration', labelAr: 'إدارة الصور', labelEn: 'Image Moderation', descriptionAr: 'مراجعة الصور المرفوعة', descriptionEn: 'Review uploaded images', category: 'admin' },
  { key: 'broadcasts', labelAr: 'البث البريدي', labelEn: 'Email Broadcasts', descriptionAr: 'إرسال بريد جماعي', descriptionEn: 'Send mass emails', category: 'admin' },
  { key: 'reports', labelAr: 'التقارير', labelEn: 'Reports', descriptionAr: 'تقارير وتحليلات مفصلة', descriptionEn: 'Detailed reports and analytics', category: 'admin' },
  { key: 'audit', labelAr: 'سجل المراجعة', labelEn: 'Audit Log', descriptionAr: 'سجل جميع العمليات', descriptionEn: 'Log of all operations', category: 'admin' },
  { key: 'apiServices', labelAr: 'الخدمات الخارجية', labelEn: 'API Services', descriptionAr: 'إعدادات الخدمات الخارجية', descriptionEn: 'External services configuration', category: 'admin' },
];

// Category labels
export const categoryLabels = {
  core: { ar: 'الصفحات الرئيسية', en: 'Core Pages' },
  data: { ar: 'إدارة البيانات', en: 'Data Management' },
  user: { ar: 'ميزات المستخدم', en: 'User Features' },
  special: { ar: 'ميزات خاصة', en: 'Special Features' },
  admin: { ar: 'ميزات الإدارة', en: 'Admin Features' },
};

// Default values - all features enabled
const defaultFlags: FeatureFlags = {
  familyTree: true,
  registry: true,
  journals: true,
  gallery: true,
  gatherings: true,
  dashboard: true,
  search: true,
  branches: true,
  quickAdd: true,
  importData: true,
  exportData: true,
  treeEditor: true,
  duplicates: true,
  changeHistory: true,
  registration: true,
  invitations: true,
  accessRequests: true,
  profiles: true,
  breastfeeding: true,
  branchEntries: true,
  onboarding: true,
  imageModeration: true,
  broadcasts: true,
  reports: true,
  audit: true,
  apiServices: true,
};

// ============================================
// CONTEXT TYPES
// ============================================

interface FeatureFlagsContextType {
  flags: FeatureFlags;
  isLoading: boolean;
  isFeatureEnabled: (feature: FeatureKey) => boolean;
  updateFlag: (feature: FeatureKey, enabled: boolean) => Promise<void>;
  updateFlags: (flags: Partial<FeatureFlags>) => Promise<void>;
  refreshFlags: () => Promise<void>;
  enableAll: () => Promise<void>;
  disableAll: () => Promise<void>;
}

const defaultContext: FeatureFlagsContextType = {
  flags: defaultFlags,
  isLoading: true,
  isFeatureEnabled: () => true,
  updateFlag: async () => {},
  updateFlags: async () => {},
  refreshFlags: async () => {},
  enableAll: async () => {},
  disableAll: async () => {},
};

// ============================================
// CONTEXT CREATION
// ============================================

const FeatureFlagsContext = createContext<FeatureFlagsContextType>(defaultContext);

// ============================================
// PROVIDER
// ============================================

interface FeatureFlagsProviderProps {
  children: ReactNode;
}

export function FeatureFlagsProvider({ children }: FeatureFlagsProviderProps) {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);
  const [isLoading, setIsLoading] = useState(true);

  // Load flags on mount
  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/features');
      const data = await res.json();
      if (data.flags) {
        setFlags(data.flags);
      }
    } catch (error) {
      console.error('Failed to load feature flags:', error);
      // Try localStorage fallback
      const stored = localStorage.getItem('alshaye_feature_flags');
      if (stored) {
        try {
          setFlags(JSON.parse(stored));
        } catch {
          // Use defaults
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFeatureEnabled = useCallback((feature: FeatureKey): boolean => {
    return flags[feature] ?? true;
  }, [flags]);

  const updateFlag = useCallback(async (feature: FeatureKey, enabled: boolean) => {
    const newFlags = { ...flags, [feature]: enabled };
    setFlags(newFlags);

    try {
      await fetch('/api/admin/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [feature]: enabled }),
      });
    } catch (error) {
      console.error('Failed to update feature flag:', error);
      // Save to localStorage as fallback
      localStorage.setItem('alshaye_feature_flags', JSON.stringify(newFlags));
    }
  }, [flags]);

  const updateFlags = useCallback(async (newFlags: Partial<FeatureFlags>) => {
    const updatedFlags = { ...flags, ...newFlags };
    setFlags(updatedFlags);

    try {
      await fetch('/api/admin/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFlags),
      });
    } catch (error) {
      console.error('Failed to update feature flags:', error);
      localStorage.setItem('alshaye_feature_flags', JSON.stringify(updatedFlags));
    }
  }, [flags]);

  const refreshFlags = useCallback(async () => {
    await loadFlags();
  }, []);

  const enableAll = useCallback(async () => {
    const allEnabled: FeatureFlags = { ...defaultFlags };
    setFlags(allEnabled);

    try {
      await fetch('/api/admin/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allEnabled),
      });
    } catch (error) {
      console.error('Failed to enable all features:', error);
      localStorage.setItem('alshaye_feature_flags', JSON.stringify(allEnabled));
    }
  }, []);

  const disableAll = useCallback(async () => {
    const allDisabled: FeatureFlags = {
      familyTree: false,
      registry: false,
      journals: false,
      gallery: false,
      gatherings: false,
      dashboard: false,
      search: false,
      branches: false,
      quickAdd: false,
      importData: false,
      exportData: false,
      treeEditor: false,
      duplicates: false,
      changeHistory: false,
      registration: false,
      invitations: false,
      accessRequests: false,
      profiles: false,
      breastfeeding: false,
      branchEntries: false,
      onboarding: false,
      imageModeration: false,
      broadcasts: false,
      reports: false,
      audit: false,
      apiServices: false,
    };
    setFlags(allDisabled);

    try {
      await fetch('/api/admin/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allDisabled),
      });
    } catch (error) {
      console.error('Failed to disable all features:', error);
      localStorage.setItem('alshaye_feature_flags', JSON.stringify(allDisabled));
    }
  }, []);

  const value: FeatureFlagsContextType = {
    flags,
    isLoading,
    isFeatureEnabled,
    updateFlag,
    updateFlags,
    refreshFlags,
    enableAll,
    disableAll,
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

// ============================================
// HOOKS
// ============================================

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
}

/**
 * Hook to check if a specific feature is enabled
 */
export function useFeature(feature: FeatureKey): boolean {
  const { isFeatureEnabled, isLoading } = useFeatureFlags();
  // Default to enabled while loading
  if (isLoading) return true;
  return isFeatureEnabled(feature);
}

/**
 * Get feature info by key
 */
export function getFeatureInfo(key: FeatureKey): FeatureInfo | undefined {
  return featureList.find(f => f.key === key);
}

/**
 * Get features by category
 */
export function getFeaturesByCategory(category: FeatureInfo['category']): FeatureInfo[] {
  return featureList.filter(f => f.category === category);
}

/**
 * Route to feature mapping
 */
export const routeToFeature: Record<string, FeatureKey> = {
  '/tree': 'familyTree',
  '/registry': 'registry',
  '/journals': 'journals',
  '/gallery': 'gallery',
  '/gatherings': 'gatherings',
  '/dashboard': 'dashboard',
  '/search': 'search',
  '/branches': 'branches',
  '/quick-add': 'quickAdd',
  '/import': 'importData',
  '/export': 'exportData',
  '/tree-editor': 'treeEditor',
  '/duplicates': 'duplicates',
  '/history': 'changeHistory',
  '/register': 'registration',
  '/invite': 'invitations',
  '/profile': 'profiles',
  '/admin/images': 'imageModeration',
  '/admin/broadcasts': 'broadcasts',
  '/admin/reports': 'reports',
  '/admin/audit': 'audit',
  '/admin/services': 'apiServices',
};
