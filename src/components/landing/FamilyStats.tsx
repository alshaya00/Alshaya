'use client';

import { Users, TreePine, Star, History } from 'lucide-react';
import { Badge } from '@/components/ui';

interface FamilyStatsProps {
  stats: {
    totalMembers: number;
    males: number;
    females: number;
    generations: number;
    yearsOfHistory: number;
  };
  isLoading: boolean;
}

const statItems = [
  {
    key: 'totalMembers',
    labelAr: 'فرد من العائلة',
    icon: Users,
    color: 'from-primary to-primary/80',
    badgeVariant: 'default' as const,
  },
  {
    key: 'generations',
    labelAr: 'أجيال متعاقبة',
    icon: TreePine,
    color: 'from-accent to-accent/80',
    badgeVariant: 'warning' as const,
  },
  {
    key: 'yearsOfHistory',
    labelAr: 'سنة من التاريخ',
    icon: History,
    color: 'from-emerald-500 to-emerald-600',
    badgeVariant: 'success' as const,
    suffix: '+',
  },
  {
    key: 'family',
    labelAr: 'عائلة واحدة متصلة',
    icon: Star,
    color: 'from-purple-500 to-purple-600',
    badgeVariant: 'info' as const,
    staticValue: '١',
  },
];

export function FamilyStats({ stats, isLoading }: FamilyStatsProps) {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <Badge variant="warning" size="lg" className="mb-4">
              إحصائيات العائلة
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              أرقام تحكي قصتنا
            </h2>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {statItems.map((item, index) => {
              const Icon = item.icon;
              const value = item.staticValue
                ? item.staticValue
                : (stats as Record<string, number>)[item.key] || 0;

              return (
                <div
                  key={item.key}
                  className="glass rounded-2xl p-6 text-center border border-border hover:shadow-lg transition-all duration-300 animate-slide-up group"
                  style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="text-white" size={26} />
                  </div>
                  <p className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                    {isLoading ? (
                      <span className="inline-block w-12 h-8 bg-muted rounded animate-pulse" />
                    ) : (
                      <>
                        {value}
                        {item.suffix && <span className="text-muted-foreground">{item.suffix}</span>}
                      </>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    {item.labelAr}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
