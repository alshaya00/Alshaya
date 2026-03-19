'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { TreePine, Users, Camera, BookOpen, Heart, ChevronLeft } from 'lucide-react';
import { Spinner } from '@/components/ui';
import {
  HeroSection,
  FamilyStats,
  FeatureCards,
  PhaseSection,
  RoadmapSection,
  ContactSection,
  ContributorsSection,
  Footer,
} from '@/components/landing';

// ============================================
// MAIN ORCHESTRATOR
// ============================================

export default function HomePage() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    males: 0,
    females: 0,
    generations: 0,
    yearsOfHistory: 425,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/statistics', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Loading state
  if (authLoading) {
    return <Spinner fullPage label="جاري التحميل..." size="lg" />;
  }

  // Authenticated dashboard
  if (isAuthenticated && user) {
    return <AuthenticatedDashboard user={user} stats={stats} />;
  }

  // Guest landing page
  return (
    <div className="min-h-screen" dir="rtl">
      <HeroSection />
      <FamilyStats stats={stats} isLoading={statsLoading} />
      <FeatureCards />
      <PhaseSection />
      <RoadmapSection />
      <ContactSection />
      <ContributorsSection />
      <Footer />
    </div>
  );
}

// ============================================
// AUTHENTICATED DASHBOARD (inline — same file)
// ============================================

interface DashboardProps {
  user: { nameArabic?: string | null };
  stats: { totalMembers: number; males: number; females: number; generations: number };
}

const quickLinks = [
  { href: '/tree', icon: TreePine, label: 'الشجرة', bg: 'bg-primary', bgLight: 'bg-primary/10 hover:bg-primary/15' },
  { href: '/search', icon: Users, label: 'البحث', bg: 'bg-accent', bgLight: 'bg-accent/10 hover:bg-accent/15' },
  { href: '/gallery', icon: Camera, label: 'الصور', bg: 'bg-purple-500', bgLight: 'bg-purple-50 hover:bg-purple-100' },
  { href: '/journals', icon: BookOpen, label: 'القصص', bg: 'bg-blue-500', bgLight: 'bg-blue-50 hover:bg-blue-100' },
];

function AuthenticatedDashboard({ user, stats }: DashboardProps) {
  return (
    <div className="min-h-screen pb-20 lg:pb-0 bg-muted/30" dir="rtl">
      {/* Welcome */}
      <section className="bg-gradient-to-bl from-primary via-primary/90 to-accent text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl">🌳</span>
            </div>
            <div>
              <p className="text-white/70">مرحباً بعودتك</p>
              <h1 className="text-2xl font-bold">{user.nameArabic}</h1>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 -mt-6 relative z-10">
        {/* Quick Actions */}
        <div className="glass rounded-2xl shadow-lg p-6 border border-border">
          <h2 className="font-bold text-foreground mb-4">الوصول السريع</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-2 p-4 rounded-xl ${item.bgLight} transition-colors`}>
                <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center`}>
                  <item.icon className="text-white" size={24} />
                </div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: stats.totalMembers, label: 'فرد', color: 'text-primary' },
            { value: stats.generations, label: 'جيل', color: 'text-accent' },
            { value: stats.males, label: 'رجال', color: 'text-blue-600' },
            { value: stats.females, label: 'نساء', color: 'text-pink-600' },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-4 text-center border border-border shadow-soft">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Contributors */}
        <div className="mt-6">
          <Link href="/contributors" className="block glass rounded-xl p-4 border border-border hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="text-primary" size={24} />
                <div>
                  <p className="font-bold text-foreground">شكر وتقدير</p>
                  <p className="text-sm text-muted-foreground">المساهمون في بناء هذا المشروع</p>
                </div>
              </div>
              <ChevronLeft className="text-primary" size={20} />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
