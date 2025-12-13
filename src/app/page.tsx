'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getStatistics } from '@/lib/data';
import { useAuth } from '@/contexts/AuthContext';
import { Onboarding, useOnboarding, OnboardingChecklist } from '@/components/ui/Onboarding';
import {
  TreePine, Users, BookOpen, Camera, Calendar, ChevronLeft,
  Star, Clock, Baby, Image, Bell, ArrowRight, Sparkles, Search,
  Check, HelpCircle, X
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface FeedItem {
  id: string;
  type: 'new_member' | 'photo' | 'story' | 'gathering';
  title: string;
  titleAr: string;
  description?: string;
  descriptionAr?: string;
  timestamp: string;
  href?: string;
  icon: React.ReactNode;
  iconBg: string;
}

interface UpcomingGathering {
  id: string;
  title: string;
  titleAr: string;
  date: string;
  dateAr: string;
  location?: string;
  locationAr?: string;
  attendees: number;
  userRsvp?: 'yes' | 'maybe' | 'no' | null;
}

// ============================================
// MOCK DATA (Replace with API calls)
// ============================================

const mockFeedItems: FeedItem[] = [
  {
    id: '1',
    type: 'new_member',
    title: 'New family member!',
    titleAr: 'عضو جديد في العائلة!',
    description: 'Sara bint Faisal was born',
    descriptionAr: 'ولدت سارة بنت فيصل',
    timestamp: '2 hours ago',
    href: '/member/sara-faisal',
    icon: <Baby size={18} />,
    iconBg: 'bg-pink-100 text-pink-600',
  },
  {
    id: '2',
    type: 'photo',
    title: '12 new photos added',
    titleAr: 'تمت إضافة 12 صورة جديدة',
    description: 'From the condolence gathering',
    descriptionAr: 'من العزاء',
    timestamp: 'Yesterday',
    href: '/gallery',
    icon: <Image size={18} />,
    iconBg: 'bg-purple-100 text-purple-600',
  },
  {
    id: '3',
    type: 'story',
    title: 'New story published',
    titleAr: 'قصة جديدة منشورة',
    description: '"How we came to Riyadh" by Abu Fahd',
    descriptionAr: '"كيف جئنا إلى الرياض" - أبو فهد',
    timestamp: '3 days ago',
    href: '/journals/1',
    icon: <BookOpen size={18} />,
    iconBg: 'bg-amber-100 text-amber-600',
  },
];

const mockGathering: UpcomingGathering = {
  id: '1',
  title: 'Eid Family Gathering',
  titleAr: 'لقاء عيد العائلة',
  date: 'Saturday, March 15',
  dateAr: 'السبت، 15 مارس',
  location: 'Grand Hall, Riyadh',
  locationAr: 'القاعة الكبرى، الرياض',
  attendees: 47,
  userRsvp: null,
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function HomePage() {
  const stats = getStatistics();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showOnboarding, completeOnboarding, dismissOnboarding } = useOnboarding();

  // State for RSVP
  const [rsvpStatus, setRsvpStatus] = useState<'yes' | 'maybe' | 'no' | null>(mockGathering.userRsvp);
  const [showChecklist, setShowChecklist] = useState(true);

  // Handle RSVP
  const handleRsvp = (status: 'yes' | 'maybe' | 'no') => {
    setRsvpStatus(status);
    // TODO: Call API to save RSVP
  };

  // Onboarding checklist items
  const checklistItems = [
    { id: 'joined', label: 'Join the family', labelAr: 'انضم للعائلة', completed: isAuthenticated },
    { id: 'tree', label: 'View the family tree', labelAr: 'استعرض شجرة العائلة', completed: false, href: '/tree' },
    { id: 'profile', label: 'Add your photo', labelAr: 'أضف صورتك', completed: false, href: '/profile' },
    { id: 'story', label: 'Read a family story', labelAr: 'اقرأ قصة عائلية', completed: false, href: '/journals' },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0" dir="rtl">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <Onboarding
          onComplete={completeOnboarding}
          onSkip={dismissOnboarding}
        />
      )}

      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="relative bg-gradient-to-bl from-green-600 via-green-700 to-green-800 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="tree-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="currentColor" />
            </pattern>
            <rect width="100" height="100" fill="url(#tree-pattern)" />
          </svg>
        </div>

        <div className="relative container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            {/* Family Tree Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-white/20 rounded-3xl mb-6">
              <span className="text-4xl md:text-5xl">🌳</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-bold mb-3">
              شجرة عائلة آل شايع
            </h1>
            <p className="text-lg md:text-xl text-green-100 mb-4">
              Al-Shaye Family Tree
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-4 text-green-100 mb-8">
              <span className="flex items-center gap-1.5">
                <Users size={18} />
                <strong className="text-white">{stats.totalMembers}</strong> فرداً
              </span>
              <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />
              <span className="flex items-center gap-1.5">
                <TreePine size={18} />
                <strong className="text-white">{stats.generations}</strong> أجيال
              </span>
              <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />
              <span className="flex items-center gap-1.5">
                <Star size={18} />
                عائلة واحدة
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/tree"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-green-700 px-8 py-3.5 rounded-2xl font-bold text-lg hover:bg-green-50 transition-all shadow-lg hover:shadow-xl active:scale-95"
                  >
                    <TreePine size={22} />
                    استكشف الشجرة
                  </Link>
                  <Link
                    href="/search"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-500/30 text-white px-8 py-3.5 rounded-2xl font-bold text-lg hover:bg-green-500/40 transition-all border-2 border-white/30"
                  >
                    <Search size={22} />
                    ابحث عن قريب
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-green-700 px-8 py-3.5 rounded-2xl font-bold text-lg hover:bg-green-50 transition-all shadow-lg hover:shadow-xl active:scale-95"
                  >
                    <Sparkles size={22} />
                    انضم للعائلة
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-500/30 text-white px-8 py-3.5 rounded-2xl font-bold text-lg hover:bg-green-500/40 transition-all border-2 border-white/30"
                  >
                    تسجيل الدخول
                  </Link>
                </>
              )}
            </div>

            {/* Personalized Greeting */}
            {isAuthenticated && user && (
              <p className="mt-6 text-green-100">
                مرحباً بعودتك، <strong className="text-white">{user.nameArabic}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Wave Bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="#f8fafc"
            />
          </svg>
        </div>
      </section>

      {/* ============================================
          MAIN CONTENT
          ============================================ */}
      <div className="container mx-auto px-4 -mt-6 relative z-10">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* ============================================
              LEFT COLUMN - Upcoming Gathering + Onboarding
              ============================================ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Gathering Card */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-l from-amber-500 to-orange-500 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar size={24} />
                  <div>
                    <h2 className="font-bold text-lg">لقاء قادم</h2>
                    <p className="text-amber-100 text-sm">Upcoming Gathering</p>
                  </div>
                </div>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  قريباً
                </span>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {mockGathering.titleAr}
                </h3>
                <div className="flex flex-wrap gap-4 text-gray-600 mb-6">
                  <span className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    {mockGathering.dateAr}
                  </span>
                  {mockGathering.locationAr && (
                    <span className="flex items-center gap-2">
                      <span className="text-gray-400">📍</span>
                      {mockGathering.locationAr}
                    </span>
                  )}
                  <span className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    {mockGathering.attendees} سيحضرون
                  </span>
                </div>

                {/* Quick RSVP */}
                <div className="border-t pt-6">
                  <p className="text-gray-600 mb-4 font-medium">هل ستحضر؟</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRsvp('yes')}
                      className={`rsvp-btn rsvp-yes ${rsvpStatus === 'yes' ? 'selected' : ''}`}
                    >
                      <Check size={18} />
                      سأحضر
                    </button>
                    <button
                      onClick={() => handleRsvp('maybe')}
                      className={`rsvp-btn rsvp-maybe ${rsvpStatus === 'maybe' ? 'selected' : ''}`}
                    >
                      <HelpCircle size={18} />
                      ربما
                    </button>
                    <button
                      onClick={() => handleRsvp('no')}
                      className={`rsvp-btn rsvp-no ${rsvpStatus === 'no' ? 'selected' : ''}`}
                    >
                      <X size={18} />
                      لا أستطيع
                    </button>
                  </div>

                  {rsvpStatus && (
                    <p className="mt-4 text-sm text-green-600 flex items-center gap-2">
                      <Check size={16} />
                      تم تسجيل ردك
                    </p>
                  )}
                </div>

                <Link
                  href="/gatherings/1"
                  className="mt-4 inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                >
                  عرض التفاصيل
                  <ChevronLeft size={18} />
                </Link>
              </div>
            </div>

            {/* What's New Feed */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Sparkles className="text-green-600" size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800 text-lg">ما الجديد</h2>
                    <p className="text-gray-500 text-sm">What&apos;s New</p>
                  </div>
                </div>
                <Link
                  href="/activity"
                  className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1"
                >
                  عرض الكل
                  <ChevronLeft size={16} />
                </Link>
              </div>

              <div className="space-y-4">
                {mockFeedItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href || '#'}
                    className="feed-card flex items-start gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">{item.titleAr}</p>
                      {item.descriptionAr && (
                        <p className="text-sm text-gray-500 mt-0.5">{item.descriptionAr}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{item.timestamp}</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-400 mt-1 rotate-180" />
                  </Link>
                ))}
              </div>

              {mockFeedItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Bell size={32} className="mx-auto mb-3 text-gray-300" />
                  <p>لا توجد تحديثات جديدة</p>
                </div>
              )}
            </div>
          </div>

          {/* ============================================
              RIGHT COLUMN - Quick Actions + Stats
              ============================================ */}
          <div className="space-y-6">
            {/* Onboarding Checklist */}
            {isAuthenticated && showChecklist && (
              <OnboardingChecklist
                items={checklistItems}
                onDismiss={() => setShowChecklist(false)}
              />
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <h2 className="font-bold text-gray-800 mb-4">الوصول السريع</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/tree"
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-50 hover:bg-green-100 transition-colors group"
                >
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TreePine className="text-white" size={24} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">الشجرة</span>
                </Link>

                <Link
                  href="/journals"
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-amber-50 hover:bg-amber-100 transition-colors group"
                >
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="text-white" size={24} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">القصص</span>
                </Link>

                <Link
                  href="/gallery"
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-purple-50 hover:bg-purple-100 transition-colors group"
                >
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="text-white" size={24} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">الصور</span>
                </Link>

                <Link
                  href="/gatherings"
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors group"
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="text-white" size={24} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">اللقاءات</span>
                </Link>
              </div>
            </div>

            {/* Family Stats */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <h2 className="font-bold text-gray-800 mb-4">إحصائيات العائلة</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👥</span>
                    <span className="text-gray-600">إجمالي الأفراد</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{stats.totalMembers}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌳</span>
                    <span className="text-gray-600">الأجيال</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{stats.generations}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <span className="text-xl mb-1">👨</span>
                    <p className="text-xl font-bold text-blue-600">{stats.males}</p>
                    <p className="text-xs text-gray-500">ذكور</p>
                  </div>
                  <div className="text-center p-3 bg-pink-50 rounded-xl">
                    <span className="text-xl mb-1">👩</span>
                    <p className="text-xl font-bold text-pink-600">{stats.females}</p>
                    <p className="text-xs text-gray-500">إناث</p>
                  </div>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="mt-4 flex items-center justify-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm"
              >
                إحصائيات تفصيلية
                <ChevronLeft size={16} />
              </Link>
            </div>

            {/* Family Branches Preview */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <h2 className="font-bold text-gray-800 mb-4">فروع العائلة</h2>
              <div className="space-y-2">
                {stats.branches.slice(0, 4).map((branch) => (
                  <div
                    key={branch.name}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🌿</span>
                      <span className="font-medium text-gray-700">{branch.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{branch.count} فرداً</span>
                  </div>
                ))}
              </div>
              <Link
                href="/branches"
                className="mt-4 flex items-center justify-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm"
              >
                عرض جميع الفروع
                <ChevronLeft size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================
          TRUST & PRIVACY SECTION (For non-authenticated)
          ============================================ */}
      {!isAuthenticated && !authLoading && (
        <section className="container mx-auto px-4 py-12 mt-8">
          <div className="bg-gradient-to-l from-gray-50 to-gray-100 rounded-3xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              🔒 خصوصيتك تهمنا
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              هذا ليس موقع تواصل اجتماعي. بياناتك آمنة ولا تُشارك مع أي طرف خارجي.
              فقط أفراد العائلة المعتمدون يمكنهم الوصول.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <Check className="text-green-500" size={16} />
                فقط أفراد العائلة
              </span>
              <span className="flex items-center gap-2">
                <Check className="text-green-500" size={16} />
                أنت تتحكم في معلوماتك
              </span>
              <span className="flex items-center gap-2">
                <Check className="text-green-500" size={16} />
                لا مشاركة للبيانات
              </span>
              <span className="flex items-center gap-2">
                <Check className="text-green-500" size={16} />
                إدارة من كبار العائلة
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
