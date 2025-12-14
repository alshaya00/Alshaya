'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from './Navigation';
import { publicPages, noNavPages } from '@/config/navigation';
import { familyInfo } from '@/config/constants';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

interface FamilyStats {
  totalMembers: number;
  generations: number;
  yearsOfHistory: number;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  // Check if current page is public
  const isPublicPage = publicPages.some((page) => pathname.startsWith(page));
  const isNoNavPage = noNavPages.some((page) => pathname.startsWith(page));

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-r-transparent mb-4"></div>
          <p className="text-gray-600 text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Public pages (login, register, invite) - render without layout
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Not authenticated and not on a public page - show landing or redirect
  if (!isAuthenticated) {
    // For the home page, show the landing page
    if (pathname === '/') {
      return <LandingPage />;
    }
    // For other pages, they will handle their own redirect via ProtectedRoute
    return <>{children}</>;
  }

  // Authenticated - show with navigation
  if (isNoNavPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navigation />
      <main className="pb-8">{children}</main>
      <footer className="bg-gray-800 text-white py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg font-semibold mb-2">شجرة عائلة آل شايع</p>
          <p className="text-sm text-gray-400">
            Al-Shaye Family Tree Application &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </>
  );
}

// Landing Page Component for Guests
function LandingPage() {
  const [stats, setStats] = useState<FamilyStats>({
    totalMembers: 99,    // Default fallback
    generations: 8,      // Default fallback
    yearsOfHistory: 425, // Default fallback
  });

  // Fetch dynamic stats
  useEffect(() => {
    fetch('/api/statistics')
      .then((res) => res.json())
      .then((data) => {
        if (data.totalMembers) {
          setStats({
            totalMembers: data.totalMembers,
            generations: data.generations,
            yearsOfHistory: data.yearsOfHistory || 425,
          });
        }
      })
      .catch(() => {
        // Use defaults on error
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50" dir="rtl">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold text-emerald-800">
            {familyInfo.nameAr}
          </div>
          <div className="flex gap-4">
            <a
              href="/login"
              className="px-6 py-2 text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
            >
              تسجيل الدخول
            </a>
            <a
              href="/register"
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              انضم للعائلة
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-16 h-16 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {familyInfo.fullNameAr}
          </h1>
          <p className="text-2xl text-emerald-700 font-medium mb-2">
            {familyInfo.taglineAr}
          </p>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            منصة رقمية متكاملة لتوثيق وحفظ تاريخ {familyInfo.fullNameAr} وربط أفرادها عبر الأجيال
          </p>
        </div>

        {/* Stats - Now Dynamic */}
        <div className="flex justify-center gap-12 my-12">
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-600">{stats.totalMembers}</div>
            <div className="text-gray-600">فرد من العائلة</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-600">{stats.generations}</div>
            <div className="text-gray-600">أجيال</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-600">{stats.yearsOfHistory}+</div>
            <div className="text-gray-600">سنة من التاريخ</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <a
            href="/register"
            className="px-8 py-4 bg-emerald-600 text-white text-lg font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-lg"
          >
            انضم لشجرة العائلة
          </a>
          <a
            href="/login"
            className="px-8 py-4 border-2 border-emerald-600 text-emerald-700 text-lg font-medium rounded-xl hover:bg-emerald-50 transition-colors"
          >
            تسجيل الدخول
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          مميزات المنصة
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">سجل العائلة</h3>
            <p className="text-gray-600">
              تصفح سجل كامل لأفراد العائلة مع إمكانية البحث والفلترة
            </p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">شجرة تفاعلية</h3>
            <p className="text-gray-600">
              شجرة عائلة بصرية تفاعلية مع إمكانية التكبير والتصفح
            </p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">تواصل العائلة</h3>
            <p className="text-gray-600">
              ابق على تواصل مع أفراد العائلة وشارك الأخبار والمناسبات
            </p>
          </div>
        </div>
      </section>

      {/* Invite Code Section */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            لديك رمز دعوة؟
          </h2>
          <p className="text-gray-600 mb-6">
            إذا تلقيت رمز دعوة من أحد أفراد العائلة، يمكنك استخدامه للانضمام مباشرة
          </p>
          <a
            href="/invite"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            استخدام رمز الدعوة
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-2">{familyInfo.fullNameAr}</h3>
          <p className="text-gray-400 mb-4">{familyInfo.taglineAr}</p>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {familyInfo.fullNameEn}. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
