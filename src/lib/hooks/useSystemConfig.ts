'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SystemConfigData {
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

export interface FeatureFlags {
  branchEntries: boolean;
  publicRegistry: boolean;
  export: boolean;
  import: boolean;
  autoBackup: boolean;
}

export interface ValidationRules {
  minBirthYear: number;
  maxBirthYear: number;
  requirePhone: boolean;
  requireEmail: boolean;
  allowDuplicateNames: boolean;
}

export interface DisplaySettings {
  defaultLanguage: string;
  dateFormat: string;
  treeDisplayMode: string;
  showDeceasedMembers: boolean;
}

interface UseSystemConfigResult {
  config: SystemConfigData | null;
  features: FeatureFlags | null;
  validation: ValidationRules | null;
  display: DisplaySettings | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT_CONFIG: SystemConfigData = {
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

let globalCache: {
  config: SystemConfigData | null;
  features: FeatureFlags | null;
  validation: ValidationRules | null;
  display: DisplaySettings | null;
  timestamp: number;
} = { config: null, features: null, validation: null, display: null, timestamp: 0 };

const CACHE_TTL = 60000;

export function useSystemConfig(): UseSystemConfigResult {
  const [config, setConfig] = useState<SystemConfigData | null>(globalCache.config);
  const [features, setFeatures] = useState<FeatureFlags | null>(globalCache.features);
  const [validation, setValidation] = useState<ValidationRules | null>(globalCache.validation);
  const [display, setDisplay] = useState<DisplaySettings | null>(globalCache.display);
  const [loading, setLoading] = useState(!globalCache.config);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    const now = Date.now();
    if (globalCache.config && (now - globalCache.timestamp) < CACHE_TTL) {
      setConfig(globalCache.config);
      setFeatures(globalCache.features);
      setValidation(globalCache.validation);
      setDisplay(globalCache.display);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/settings?type=config');
      const data = await res.json();

      if (data.success) {
        globalCache = {
          config: data.config,
          features: data.features,
          validation: data.validation,
          display: data.display,
          timestamp: now,
        };
        setConfig(data.config);
        setFeatures(data.features);
        setValidation(data.validation);
        setDisplay(data.display);
        setError(null);
      } else {
        setConfig(DEFAULT_CONFIG);
        setFeatures({
          branchEntries: true,
          publicRegistry: true,
          export: true,
          import: true,
          autoBackup: true,
        });
        setValidation({
          minBirthYear: 1400,
          maxBirthYear: new Date().getFullYear(),
          requirePhone: false,
          requireEmail: false,
          allowDuplicateNames: true,
        });
        setDisplay({
          defaultLanguage: 'ar',
          dateFormat: 'DD/MM/YYYY',
          treeDisplayMode: 'vertical',
          showDeceasedMembers: true,
        });
      }
    } catch (err) {
      console.error('Failed to fetch system config:', err);
      setError('Failed to load settings');
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const refresh = useCallback(async () => {
    globalCache.timestamp = 0;
    await fetchConfig();
  }, [fetchConfig]);

  return { config, features, validation, display, loading, error, refresh };
}

export function invalidateConfigCache() {
  globalCache.timestamp = 0;
}
