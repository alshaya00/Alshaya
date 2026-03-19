'use client';

import { BarChart3, Users, TrendingUp, Heart, Smartphone } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { Tabs, TabsList, TabsTrigger, TabsContent, Skeleton, SkeletonCard } from '@/components/ui';
import { useStatistics } from '@/hooks/useStatistics';
import GenderAvatar from '@/components/GenderAvatar';
import {
  StatCard,
  GenerationChart,
  BranchAnalysis,
  DemographicsSection,
  NewestMembers,
} from '@/components/dashboard';

const BREADCRUMBS = [
  { label: 'الرئيسية', href: '/' },
  { label: 'لوحة الإحصائيات' },
];

function DashboardSkeleton() {
  return (
    <PageLayout title="لوحة الإحصائيات المتقدمة" description="Advanced Analytics Dashboard" breadcrumbs={BREADCRUMBS}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </PageLayout>
  );
}

/* ============================================
   Dashboard Page
   ============================================ */
export default function DashboardPage() {
  const {
    stats,
    isLoading,
    livingMembers,
    deceasedMembers,
    topCities,
    topOccupations,
    ageGroups,
  } = useStatistics();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <PageLayout
      title="لوحة الإحصائيات المتقدمة"
      description="Advanced Analytics Dashboard"
      breadcrumbs={BREADCRUMBS}
      actions={
        <div className="flex items-center gap-2">
          <BarChart3 className="text-primary" size={28} />
        </div>
      }
    >
      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="إجمالي الأفراد"
          value={stats.totalMembers}
          icon={<Users size={28} />}
          variant="blue"
        />
        <StatCard
          title="الرجال"
          value={stats.males}
          icon={<GenderAvatar gender="Male" size="lg" />}
          variant="blue"
        />
        <StatCard
          title="النساء"
          value={stats.females}
          icon={<GenderAvatar gender="Female" size="lg" />}
          variant="pink"
        />
        <StatCard
          title="الأجيال"
          value={stats.generations}
          icon={<TrendingUp size={28} />}
          variant="green"
        />
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="على قيد الحياة"
          value={livingMembers}
          icon={<Heart size={28} />}
          variant="emerald"
        />
        <StatCard
          title="متوفين"
          value={deceasedMembers}
          icon={<span className="text-2xl">🕊️</span>}
          variant="gray"
        />
        <StatCard
          title="المستخدمين المسجلين"
          value={stats.registeredUsers}
          icon={<Smartphone size={28} />}
          variant="purple"
        />
        <StatCard
          title="تسجيلات آخر 30 يوم"
          value={stats.recentRegistrations}
          icon={<span className="text-2xl">📈</span>}
          variant="amber"
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="mb-8">
        <TabsList className="w-full md:w-auto mb-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="demographics">التركيبة السكانية</TabsTrigger>
          <TabsTrigger value="members">الأعضاء</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GenerationChart data={stats.generationBreakdown} />
            <BranchAnalysis branches={stats.branches} totalMembers={stats.totalMembers} />
          </div>
        </TabsContent>

        <TabsContent value="demographics">
          <DemographicsSection
            ageGroups={ageGroups}
            livingMembers={livingMembers}
            topCities={topCities}
            topOccupations={topOccupations}
          />
        </TabsContent>

        <TabsContent value="members">
          <NewestMembers members={stats.newestMembers} />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
