'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from './Navigation';
import { publicPages, noNavPages } from '@/config/navigation';
import { familyInfo } from '@/config/constants';

// ============================================
// Types
// ============================================

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

// ============================================
// Main Layout
// ============================================

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  const currentPath = pathname || '/';
  const isPublicPage = publicPages.some((page) => currentPath.startsWith(page));
  const isNoNavPage = noNavPages.some((page) => currentPath.startsWith(page));

  // ── Loading ──────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-r-transparent mb-4" />
          <p className="text-muted-foreground text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // ── Public pages (login, register, invite) ─────
  if (isPublicPage) {
    return <>{children}</>;
  }

  // ── Not authenticated: let page.tsx handle its own guest view ──
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // ── Authenticated: no-nav pages (welcome, etc.) ──
  if (isNoNavPage) {
    return <>{children}</>;
  }

  // ── Authenticated: full app shell ──────────
  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
      {/* Top navigation */}
      <Navigation />

      {/* Page content with smooth enter transition */}
      <main
        className="flex-1 pb-24 lg:pb-8 animate-fade-in"
        key={currentPath}
      >
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border text-foreground py-6 mt-auto mb-16 lg:mb-0">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg font-semibold mb-1">{familyInfo.fullNameAr}</p>
          <p className="text-sm text-muted-foreground">
            {familyInfo.fullNameEn} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
