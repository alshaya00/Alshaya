'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TreePine, Users, Camera, BookOpen, Heart, History,
  Sparkles, UserPlus, ChevronDown, Map, MessageCircle, Phone,
} from 'lucide-react';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { GenderAvatarInline } from '@/components/GenderAvatar';

/* ============================================
   Feature highlights grid
   ============================================ */

const features = [
  {
    icon: TreePine,
    titleAr: 'شجرة تفاعلية',
    descAr: 'شجرة عائلة بصرية تفاعلية مع إمكانية التنقل والتكبير',
    gradient: 'from-primary to-primary/80',
    bgLight: 'bg-primary/5',
  },
  {
    icon: Users,
    titleAr: 'سجل العائلة',
    descAr: 'تصفح سجل كامل لأفراد العائلة مع البحث والفلترة',
    gradient: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50 dark:bg-blue-950/20',
  },
  {
    icon: Camera,
    titleAr: 'معرض الصور',
    descAr: 'صور العائلة والذكريات والمناسبات المحفوظة',
    gradient: 'from-purple-500 to-purple-600',
    bgLight: 'bg-purple-50 dark:bg-purple-950/20',
  },
  {
    icon: BookOpen,
    titleAr: 'يوميات وقصص',
    descAr: 'قصص وروايات شفهية من تاريخ العائلة العريق',
    gradient: 'from-accent to-accent/80',
    bgLight: 'bg-accent/5',
  },
  {
    icon: History,
    titleAr: 'حفظ التاريخ',
    descAr: 'توثيق تاريخ العائلة وأنسابها للأجيال القادمة',
    gradient: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  {
    icon: Heart,
    titleAr: 'صلة الرحم',
    descAr: 'تعزيز الروابط بين أفراد العائلة في كل مكان',
    gradient: 'from-pink-500 to-pink-600',
    bgLight: 'bg-pink-50 dark:bg-pink-950/20',
  },
];

export function FeatureCards() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="info" size="lg" className="mb-4">
              مميزات المنصة
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              كل ما تحتاجه العائلة
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              أدوات حديثة لتوثيق وحفظ تاريخ العائلة وربط أفرادها
            </p>
          </div>

          {/* Features grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.titleAr}
                  className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 animate-slide-up overflow-hidden"
                  style={{ animationDelay: `${index * 0.08}s`, animationFillMode: 'both' }}
                >
                  <CardContent className="p-6 pt-6">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="text-white" size={26} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      {feature.titleAr}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.descAr}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   Phase 2 CTA section
   ============================================ */

export function PhaseSection() {
  return (
    <section className="py-16 bg-gradient-to-br from-primary via-primary/95 to-accent text-white overflow-hidden relative">
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" size="lg" className="mb-6 border-white/30 text-white bg-white/10">
            <Sparkles size={14} className="ml-1" />
            المرحلة الثانية
          </Badge>

          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            نهج جديد ومُحدَّث
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
            ندخل اليوم مرحلة جديدة من مشروع شجرة العائلة، بأدوات حديثة وطريقة مُيسَّرة
            تُمكِّن الجميع من المشاركة والإضافة.
          </p>

          {/* Highlight card */}
          <div className="glass rounded-2xl p-8 mb-8 border border-white/20 max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-4 mb-4">
              <GenderAvatarInline gender="Male" size="lg" />
              <span className="text-3xl font-bold text-white/60">+</span>
              <GenderAvatarInline gender="Female" size="lg" />
            </div>
            <h3 className="text-2xl font-bold mb-3">
              دعوة لجميع أفراد العائلة
            </h3>
            <p className="text-lg text-white/80">
              نُرحِّب بمشاركة <strong className="text-white">الرجال والنساء</strong> على حدٍّ سواء
              في بناء وإثراء شجرة العائلة
            </p>
          </div>

          <Link href="/register">
            <Button
              size="lg"
              leftIcon={<UserPlus size={22} />}
              className="bg-white text-primary hover:bg-white/90 shadow-lg px-8 py-6 text-lg rounded-2xl font-bold"
            >
              سجِّل الآن وانضم إلينا
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   Roadmap / Future phases section
   ============================================ */

const phases = [
  { num: '١', titleAr: 'السير الذاتية', descAr: 'سير ذاتية تفصيلية وقصص الشخصيات البارزة في العائلة', gradient: 'from-primary/10 to-accent/10', border: 'border-primary/20' },
  { num: '٢', titleAr: 'صور سُدَير التاريخية', descAr: 'أرشيف صور تاريخية لمنطقة سُدَير وأماكن العائلة', gradient: 'from-accent/10 to-primary/10', border: 'border-accent/20' },
  { num: '٣', titleAr: 'ممتلكات العائلة', descAr: 'توثيق صور البيوت والممتلكات العائلية خارج سُدَير', gradient: 'from-primary/10 to-accent/10', border: 'border-primary/20' },
  { num: '٤', titleAr: 'علم الأنساب', descAr: 'معلومات تفصيلية عن الأنساب والتسلسل التاريخي للعائلة', gradient: 'from-accent/10 to-primary/10', border: 'border-accent/20' },
];

export function RoadmapSection() {
  const [showPhases, setShowPhases] = useState(false);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="secondary" size="lg" className="mb-4">
              <Map size={14} className="ml-1" />
              خطتنا المستقبلية
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              ما نخطط لإضافته
            </h2>
            <p className="text-muted-foreground">في المراحل القادمة من المشروع</p>
          </div>

          {/* Toggle */}
          <button
            onClick={() => setShowPhases(!showPhases)}
            className="w-full glass rounded-2xl p-5 mb-6 flex items-center justify-between border border-border hover:border-primary/30 transition-all group"
          >
            <span className="font-bold text-foreground">عرض المراحل القادمة</span>
            <ChevronDown
              className={`text-primary transition-transform duration-300 ${showPhases ? 'rotate-180' : ''}`}
              size={24}
            />
          </button>

          {/* Phases grid */}
          {showPhases && (
            <div className="grid md:grid-cols-2 gap-5 animate-fade-in">
              {phases.map((phase, index) => (
                <Card
                  key={phase.num}
                  className={`bg-gradient-to-br ${phase.gradient} ${phase.border} animate-slide-up`}
                  style={{ animationDelay: `${index * 0.08}s`, animationFillMode: 'both' }}
                >
                  <CardContent className="p-6 pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold shadow-md">
                        {phase.num}
                      </div>
                      <h3 className="font-bold text-foreground text-lg">{phase.titleAr}</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{phase.descAr}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   Contact section
   ============================================ */

export function ContactSection() {
  return (
    <section className="py-16 bg-gradient-to-br from-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <MessageCircle size={40} />
          </div>

          <h2 className="text-3xl font-bold mb-4">تواصل معنا</h2>
          <p className="text-gray-300 mb-8">
            للاستفسارات والملاحظات والمقترحات
          </p>

          <a
            href="https://wa.me/966539395953"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-bold text-xl transition-colors shadow-lg hover:shadow-xl"
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
  );
}

/* ============================================
   Contributors link section
   ============================================ */

export function ContributorsSection() {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/contributors"
            className="block group"
          >
            <Card className="hover:shadow-lg transition-all duration-300 hover:border-primary/30 overflow-hidden">
              <CardContent className="p-6 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <Heart className="text-white" size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">شكر وتقدير</h3>
                      <p className="text-muted-foreground">المساهمون والداعمون لهذا المشروع</p>
                    </div>
                  </div>
                  <ChevronDown className="text-primary -rotate-90 group-hover:-translate-x-1 transition-transform" size={24} />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </section>
  );
}
