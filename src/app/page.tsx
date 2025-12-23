'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  TreePine, Users, BookOpen, Camera, Heart, ChevronLeft,
  Star, Phone, MessageCircle, Sparkles, ArrowLeft,
  Check, Map, History, UserPlus, ChevronDown
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface Statistics {
  totalMembers: number;
  males: number;
  females: number;
  generations: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function HomePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showPhases, setShowPhases] = useState(false);
  const [stats, setStats] = useState<Statistics>({ totalMembers: 0, males: 0, females: 0, generations: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch statistics from API
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/statistics');
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalMembers: data.totalMembers || 0,
            males: data.males || 0,
            females: data.females || 0,
            generations: data.generations || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // AUTHENTICATED USER - SHOW DASHBOARD
  // ============================================
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen pb-20 lg:pb-0 bg-gray-50" dir="rtl">
        {/* Welcome Header */}
        <section className="bg-gradient-to-bl from-amber-500 via-amber-600 to-orange-600 text-white py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🌳</span>
              </div>
              <div>
                <p className="text-amber-100">مرحباً بعودتك</p>
                <h1 className="text-2xl font-bold">{user.nameArabic}</h1>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <div className="container mx-auto px-4 -mt-6 relative z-10">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="font-bold text-gray-800 mb-4">الوصول السريع</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/tree"
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                  <TreePine className="text-white" size={24} />
                </div>
                <span className="text-sm font-medium text-gray-700">الشجرة</span>
              </Link>

              <Link
                href="/search"
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors"
              >
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                  <Users className="text-white" size={24} />
                </div>
                <span className="text-sm font-medium text-gray-700">البحث</span>
              </Link>

              <Link
                href="/gallery"
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors"
              >
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Camera className="text-white" size={24} />
                </div>
                <span className="text-sm font-medium text-gray-700">الصور</span>
              </Link>

              <Link
                href="/journals"
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <BookOpen className="text-white" size={24} />
                </div>
                <span className="text-sm font-medium text-gray-700">القصص</span>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 text-center shadow">
              <p className="text-2xl font-bold text-amber-600">{stats.totalMembers}</p>
              <p className="text-sm text-gray-500">فرد</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow">
              <p className="text-2xl font-bold text-orange-600">{stats.generations}</p>
              <p className="text-sm text-gray-500">جيل</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow">
              <p className="text-2xl font-bold text-blue-600">{stats.males}</p>
              <p className="text-sm text-gray-500">ذكور</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow">
              <p className="text-2xl font-bold text-pink-600">{stats.females}</p>
              <p className="text-sm text-gray-500">إناث</p>
            </div>
          </div>

          {/* Contributors Link */}
          <div className="mt-6">
            <Link
              href="/contributors"
              className="block bg-gradient-to-l from-amber-100 to-orange-100 rounded-xl p-4 hover:from-amber-200 hover:to-orange-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="text-amber-600" size={24} />
                  <div>
                    <p className="font-bold text-gray-800">شكر وتقدير</p>
                    <p className="text-sm text-gray-600">المساهمون في بناء هذا المشروع</p>
                  </div>
                </div>
                <ChevronLeft className="text-amber-600" size={20} />
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // GUEST USER - SHOW WELCOMING LANDING PAGE
  // ============================================
  return (
    <div className="min-h-screen" dir="rtl">
      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="relative bg-gradient-to-bl from-amber-500 via-amber-600 to-orange-600 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="tree-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.5" fill="currentColor" />
            </pattern>
            <rect width="100" height="100" fill="url(#tree-pattern)" />
          </svg>
        </div>

        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Family Tree Icon */}
            <div className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 bg-white/20 rounded-3xl mb-8 backdrop-blur-sm">
              <span className="text-5xl md:text-6xl">🌳</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              شجرة عائلة آل شايع
            </h1>
            <p className="text-xl md:text-2xl text-amber-100 mb-2">
              Al-Shaye Family Tree
            </p>
            <p className="text-lg text-amber-200 mb-8">
              نحفظ إرثنا، نربط أجيالنا
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-amber-100 mb-10">
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <Users size={20} />
                <strong className="text-white">{stats.totalMembers}</strong> فرداً
              </span>
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <TreePine size={20} />
                <strong className="text-white">{stats.generations}</strong> أجيال
              </span>
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <Star size={20} />
                عائلة واحدة
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-amber-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-amber-50 transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                <UserPlus size={24} />
                انضم للعائلة
              </Link>
              <Link
                href="/tree"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-700/50 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-amber-700/70 transition-all border-2 border-white/30"
              >
                <TreePine size={24} />
                استكشف الشجرة
              </Link>
            </div>
          </div>
        </div>

        {/* Wave Bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="#fffbeb"
            />
          </svg>
        </div>
      </section>

      {/* ============================================
          PROJECT OVERVIEW SECTION
          ============================================ */}
      <section className="bg-amber-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                عن المشروع
              </h2>
              <div className="w-24 h-1 bg-amber-500 mx-auto rounded-full"></div>
            </div>

            {/* Overview Content */}
            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                <p className="text-xl mb-6">
                  مشروع شجرة عائلة آل شايع هو مبادرة لتوثيق وحفظ نسب وتاريخ عائلتنا الكريمة،
                  بهدف ربط الأجيال الحالية بأسلافهم وتعزيز صلة الرحم بين أفراد العائلة.
                </p>

                <p className="mb-6">
                  نسعى من خلال هذا المشروع إلى بناء قاعدة بيانات شاملة تضم جميع أفراد العائلة،
                  مع توثيق قصصهم وذكرياتهم وصورهم، لتبقى إرثاً للأجيال القادمة.
                </p>

                {/* Values */}
                <div className="grid md:grid-cols-3 gap-6 my-10">
                  <div className="text-center p-6 bg-amber-50 rounded-2xl">
                    <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="text-white" size={28} />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">حفظ التاريخ</h3>
                    <p className="text-sm text-gray-600">توثيق تاريخ العائلة وقصصها للأجيال القادمة</p>
                  </div>
                  <div className="text-center p-6 bg-orange-50 rounded-2xl">
                    <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="text-white" size={28} />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">صلة الرحم</h3>
                    <p className="text-sm text-gray-600">تعزيز الروابط بين أفراد العائلة في كل مكان</p>
                  </div>
                  <div className="text-center p-6 bg-amber-50 rounded-2xl">
                    <div className="w-14 h-14 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="text-white" size={28} />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">الهوية</h3>
                    <p className="text-sm text-gray-600">تعريف الأجيال الجديدة بجذورهم وهويتهم</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          NEW PHASE SECTION (المرحلة الثانية)
          ============================================ */}
      <section className="bg-gradient-to-br from-orange-500 to-amber-600 py-16 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-2 rounded-full mb-8">
              <Sparkles size={20} />
              <span className="font-bold">المرحلة الثانية</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              نهج جديد ومُحدَّث
            </h2>

            <p className="text-xl text-amber-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              ندخل اليوم مرحلة جديدة من مشروع شجرة العائلة، بأدوات حديثة وطريقة مُيسَّرة
              تُمكِّن الجميع من المشاركة والإضافة.
            </p>

            {/* Highlight Box */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/20">
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-4xl">👨</span>
                <span className="text-3xl font-bold">+</span>
                <span className="text-4xl">👩</span>
              </div>
              <h3 className="text-2xl font-bold mb-3">
                دعوة لجميع أفراد العائلة
              </h3>
              <p className="text-lg text-amber-100">
                نُرحِّب بمشاركة <strong className="text-white">الرجال والنساء</strong> على حدٍّ سواء
                <br />
                في بناء وإثراء شجرة العائلة
              </p>
            </div>

            <p className="text-amber-200 mb-8">
              شاركونا بمعلوماتكم، صوركم، وقصصكم لنُكمِل هذا الإرث معاً
            </p>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-amber-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-amber-50 transition-all shadow-lg"
            >
              <UserPlus size={24} />
              سجِّل الآن وانضم إلينا
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================
          FUTURE PHASES ROADMAP
          ============================================ */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                خطتنا المستقبلية
              </h2>
              <p className="text-gray-600">ما نخطط لإضافته في المراحل القادمة</p>
              <div className="w-24 h-1 bg-amber-500 mx-auto rounded-full mt-4"></div>
            </div>

            {/* Toggle Button */}
            <button
              onClick={() => setShowPhases(!showPhases)}
              className="w-full bg-amber-50 hover:bg-amber-100 rounded-2xl p-4 mb-6 flex items-center justify-between transition-colors"
            >
              <span className="font-bold text-gray-800">عرض المراحل القادمة</span>
              <ChevronDown
                className={`text-amber-600 transition-transform ${showPhases ? 'rotate-180' : ''}`}
                size={24}
              />
            </button>

            {/* Phases List */}
            {showPhases && (
              <div className="grid md:grid-cols-2 gap-6 animate-fadeIn">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                      ١
                    </div>
                    <h3 className="font-bold text-gray-800">السير الذاتية</h3>
                  </div>
                  <p className="text-gray-600">
                    سير ذاتية تفصيلية وقصص الشخصيات البارزة في العائلة
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      ٢
                    </div>
                    <h3 className="font-bold text-gray-800">صور سُدَير التاريخية</h3>
                  </div>
                  <p className="text-gray-600">
                    أرشيف صور تاريخية لمنطقة سُدَير وأماكن العائلة
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold">
                      ٣
                    </div>
                    <h3 className="font-bold text-gray-800">ممتلكات العائلة</h3>
                  </div>
                  <p className="text-gray-600">
                    توثيق صور البيوت والممتلكات العائلية خارج سُدَير
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                      ٤
                    </div>
                    <h3 className="font-bold text-gray-800">علم الأنساب</h3>
                  </div>
                  <p className="text-gray-600">
                    معلومات تفصيلية عن الأنساب والتسلسل التاريخي للعائلة
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================
          CONTACT SECTION
          ============================================ */}
      <section className="bg-gradient-to-br from-gray-800 to-gray-900 py-16 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle size={40} />
            </div>

            <h2 className="text-3xl font-bold mb-4">تواصل معنا</h2>
            <p className="text-gray-300 mb-8">
              للاستفسارات والملاحظات والمقترحات
            </p>

            {/* WhatsApp Number */}
            <a
              href="https://wa.me/966539395953"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-bold text-xl transition-colors shadow-lg"
            >
              <Phone size={28} />
              <span dir="ltr">0539395953</span>
            </a>

            <p className="text-gray-400 mt-4 text-sm">
              تواصل عبر الواتساب
            </p>
          </div>
        </div>
      </section>

      {/* ============================================
          CONTRIBUTORS LINK
          ============================================ */}
      <section className="bg-amber-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Link
              href="/contributors"
              className="block bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                    <Heart className="text-white" size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">شكر وتقدير</h3>
                    <p className="text-gray-600">المساهمون والداعمون لهذا المشروع</p>
                  </div>
                </div>
                <ArrowLeft className="text-amber-600" size={28} />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-2">شجرة عائلة آل شايع</p>
          <p className="text-sm">نحفظ إرثنا، نربط أجيالنا</p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <Link href="/login" className="text-amber-400 hover:text-amber-300 text-sm">
              تسجيل الدخول
            </Link>
            <span>•</span>
            <Link href="/register" className="text-amber-400 hover:text-amber-300 text-sm">
              انضم للعائلة
            </Link>
            <span>•</span>
            <Link href="/contributors" className="text-amber-400 hover:text-amber-300 text-sm">
              المساهمون
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
