'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart, Star, Award, Users, BookOpen, Camera, Code,
  Sparkles, ChevronUp, Home, TreePine
} from 'lucide-react';

// ============================================
// CONTRIBUTOR TYPES
// ============================================

interface Contributor {
  name: string;
  role: string;
  roleAr: string;
  category: 'founder' | 'data' | 'technical' | 'support' | 'special';
}

// ============================================
// CONTRIBUTORS DATA
// Customize this list with actual contributors
// ============================================

const contributors: Contributor[] = [
  // Founders & Initiators - المؤسسون
  {
    name: 'المؤسسون الأوائل',
    role: 'Project Founders',
    roleAr: 'أصحاب فكرة المشروع',
    category: 'founder',
  },

  // Data Contributors - مساهمو البيانات
  {
    name: 'كبار العائلة',
    role: 'Family Elders',
    roleAr: 'مصدر المعلومات والروايات',
    category: 'data',
  },
  {
    name: 'حفظة الأنساب',
    role: 'Genealogy Keepers',
    roleAr: 'الذين حفظوا سلسلة النسب',
    category: 'data',
  },

  // Technical Team - الفريق التقني
  {
    name: 'فريق التطوير',
    role: 'Development Team',
    roleAr: 'بناء وتطوير المنصة',
    category: 'technical',
  },

  // Support - الداعمون
  {
    name: 'الداعمون والمشجعون',
    role: 'Supporters',
    roleAr: 'كل من دعم وشجع المشروع',
    category: 'support',
  },

  // Special Thanks
  {
    name: 'جميع أفراد العائلة',
    role: 'All Family Members',
    roleAr: 'الذين صبروا وساهموا',
    category: 'special',
  },
];

// Category icons and colors
const categoryConfig = {
  founder: {
    icon: Star,
    color: 'from-amber-400 to-amber-600',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-600',
    label: 'المؤسسون',
  },
  data: {
    icon: BookOpen,
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    label: 'مصادر البيانات',
  },
  technical: {
    icon: Code,
    color: 'from-purple-400 to-purple-600',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
    label: 'الفريق التقني',
  },
  support: {
    icon: Heart,
    color: 'from-pink-400 to-pink-600',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-600',
    label: 'الداعمون',
  },
  special: {
    icon: Sparkles,
    color: 'from-orange-400 to-orange-600',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
    label: 'شكر خاص',
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ContributorsPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle scroll for progress indicator
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / scrollHeight) * 100;
      setScrollProgress(progress);
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Group contributors by category
  const groupedContributors = contributors.reduce((acc, contributor) => {
    if (!acc[contributor.category]) {
      acc[contributor.category] = [];
    }
    acc[contributor.category].push(contributor);
    return acc;
  }, {} as Record<string, Contributor[]>);

  const categoryOrder: Array<keyof typeof categoryConfig> = ['founder', 'data', 'technical', 'support', 'special'];

  return (
    <div className="min-h-screen bg-gray-900 text-white" dir="rtl">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-800 z-50">
        <div
          className="h-full bg-gradient-to-l from-amber-400 to-orange-500 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* ============================================
          HERO SECTION - Movie Credits Style
          ============================================ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Stars Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800" />
          {/* Stars */}
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: Math.random() * 0.7 + 0.3,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 py-20">
          {/* Animated Tree Icon */}
          <div className="mb-8 animate-float">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full shadow-2xl shadow-amber-500/30">
              <span className="text-6xl">🌳</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-l from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
            شكر وتقدير
          </h1>

          <p className="text-2xl text-gray-300 mb-4">
            Credits & Acknowledgments
          </p>

          <p className="text-xl text-amber-400 mb-12 max-w-2xl mx-auto">
            نُقدِّر ونشكر كل من ساهم في بناء هذا المشروع
            <br />
            وجعل حلم توثيق شجرة العائلة حقيقة
          </p>

          {/* Scroll Indicator */}
          <div className="animate-bounce">
            <div className="w-8 h-12 border-2 border-amber-400 rounded-full mx-auto flex justify-center">
              <div className="w-2 h-3 bg-amber-400 rounded-full mt-2 animate-scroll" />
            </div>
            <p className="text-gray-500 mt-4 text-sm">مرر للأسفل</p>
          </div>
        </div>
      </section>

      {/* ============================================
          CONTRIBUTORS SECTIONS
          ============================================ */}
      {categoryOrder.map((category, categoryIndex) => {
        const config = categoryConfig[category];
        const Icon = config.icon;
        const categoryContributors = groupedContributors[category] || [];

        if (categoryContributors.length === 0) return null;

        return (
          <section
            key={category}
            className={`py-24 ${categoryIndex % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50'}`}
          >
            <div className="container mx-auto px-4">
              {/* Category Header */}
              <div className="text-center mb-16">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${config.color} shadow-lg mb-6`}>
                  <Icon size={36} className="text-white" />
                </div>
                <h2 className="text-4xl font-bold mb-2">{config.label}</h2>
                <div className="w-24 h-1 bg-gradient-to-l from-amber-400 to-orange-500 mx-auto rounded-full" />
              </div>

              {/* Contributors Grid */}
              <div className="max-w-4xl mx-auto">
                <div className="grid gap-8">
                  {categoryContributors.map((contributor, index) => (
                    <div
                      key={index}
                      className="group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 hover:border-amber-500/50 transition-all duration-500 hover:transform hover:scale-[1.02]"
                      style={{
                        animationDelay: `${index * 0.1}s`,
                      }}
                    >
                      {/* Glow Effect */}
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                      {/* Content */}
                      <div className="relative text-center">
                        <h3 className="text-3xl font-bold text-white mb-3">
                          {contributor.name}
                        </h3>
                        <p className={`text-xl ${config.textColor} mb-2`}>
                          {contributor.roleAr}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {contributor.role}
                        </p>
                      </div>

                      {/* Decorative Stars */}
                      <div className="absolute top-4 right-4 opacity-30">
                        <Star size={20} className="text-amber-400" />
                      </div>
                      <div className="absolute bottom-4 left-4 opacity-30">
                        <Star size={16} className="text-amber-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ============================================
          DEDICATION SECTION
          ============================================ */}
      <section className="py-32 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            {/* Decorative Line */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <div className="w-16 h-px bg-gradient-to-r from-transparent to-amber-500" />
              <Star className="text-amber-400" size={24} />
              <div className="w-16 h-px bg-gradient-to-l from-transparent to-amber-500" />
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-amber-400">
              إهداء
            </h2>

            <p className="text-2xl text-gray-300 leading-relaxed mb-8">
              نُهدي هذا العمل إلى أرواح أجدادنا الطاهرة
              <br />
              الذين بنوا مجد هذه العائلة
              <br />
              وتركوا لنا إرثاً نفخر به
            </p>

            {/* Decorative Element */}
            <div className="mt-12">
              <span className="text-6xl">🕊️</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          FINAL MESSAGE
          ============================================ */}
      <section className="py-24 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full mb-8">
              <Heart size={40} className="text-white" />
            </div>

            <h2 className="text-3xl font-bold mb-6">
              شكراً لكم
            </h2>

            <p className="text-xl text-gray-400 mb-8">
              هذا المشروع لم يكن ليرى النور لولا جهودكم ودعمكم
              <br />
              جزاكم الله خيراً
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-gradient-to-l from-amber-500 to-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
              >
                <Home size={24} />
                العودة للرئيسية
              </Link>

              <Link
                href="/tree"
                className="inline-flex items-center gap-2 border-2 border-amber-500 text-amber-400 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-amber-500/10 transition-all"
              >
                <TreePine size={24} />
                استكشف الشجرة
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer className="py-8 bg-gray-950 border-t border-gray-800">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500">
            شجرة عائلة آل شايع
          </p>
          <p className="text-sm text-gray-600 mt-2">
            نحفظ إرثنا، نربط أجيالنا
          </p>
        </div>
      </footer>

      {/* ============================================
          SCROLL TO TOP BUTTON
          ============================================ */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 left-8 w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full shadow-lg flex items-center justify-center text-white hover:from-amber-600 hover:to-orange-600 transition-all z-40 animate-fadeIn"
        >
          <ChevronUp size={28} />
        </button>
      )}

      {/* ============================================
          CUSTOM STYLES
          ============================================ */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes scroll {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(8px); opacity: 0.5; }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-scroll {
          animation: scroll 1.5s ease-in-out infinite;
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
