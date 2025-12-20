'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFeatureFlags, FeatureKey, getFeatureInfo } from '@/contexts/FeatureFlagsContext';
import { EyeOff, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Component to gate content based on feature flags.
 * If the feature is disabled, shows a message or redirects.
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  redirectTo,
}: FeatureGateProps) {
  const router = useRouter();
  const { isFeatureEnabled, isLoading } = useFeatureFlags();
  const featureInfo = getFeatureInfo(feature);

  const isEnabled = isFeatureEnabled(feature);

  useEffect(() => {
    if (!isLoading && !isEnabled && redirectTo) {
      router.push(redirectTo);
    }
  }, [isLoading, isEnabled, redirectTo, router]);

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If feature is enabled, show children
  if (isEnabled) {
    return <>{children}</>;
  }

  // If redirecting, show nothing (redirect is happening)
  if (redirectTo) {
    return null;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default disabled feature message
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <EyeOff className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          هذه الميزة غير متاحة حالياً
        </h2>
        <p className="text-gray-500 mb-2">
          {featureInfo?.labelAr || 'هذه الميزة'} معطلة من قبل مدير النظام
        </p>
        <p className="text-sm text-gray-400 mb-6">
          This feature is currently disabled
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

/**
 * Hook version for programmatic feature checking
 */
export function useFeatureGate(feature: FeatureKey) {
  const { isFeatureEnabled, isLoading } = useFeatureFlags();
  return {
    isEnabled: isFeatureEnabled(feature),
    isLoading,
  };
}
