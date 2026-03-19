'use client';

import { TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import GenderAvatar from '@/components/GenderAvatar';

interface GenerationData {
  generation: number;
  count: number;
  males: number;
  females: number;
  percentage: number;
}

interface GenerationChartProps {
  data: GenerationData[];
}

export default function GenerationChart({ data }: GenerationChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="text-primary" size={22} />
          <span>تحليل الأجيال</span>
          <span className="text-sm font-normal text-muted-foreground">Generation Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((gen) => (
            <div key={gen.generation}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-medium text-foreground">الجيل {gen.generation}</span>
                <Badge variant="secondary" size="sm">
                  {gen.count} ({gen.percentage}%)
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${gen.count > 0 ? (gen.males / gen.count) * 100 : 0}%`,
                        backgroundColor: 'var(--male-color)',
                      }}
                      title={`رجال: ${gen.males}`}
                    />
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${gen.count > 0 ? (gen.females / gen.count) * 100 : 0}%`,
                        backgroundColor: 'var(--female-color)',
                      }}
                      title={`نساء: ${gen.females}`}
                    />
                  </div>
                </div>
                <div className="flex gap-2 text-xs w-24 justify-end items-center">
                  <span className="flex items-center gap-0.5" style={{ color: 'var(--male-color)' }}>
                    <GenderAvatar gender="Male" size="xs" />
                    {gen.males}
                  </span>
                  <span className="flex items-center gap-0.5" style={{ color: 'var(--female-color)' }}>
                    <GenderAvatar gender="Female" size="xs" />
                    {gen.females}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Gender Ratio Bar */}
        {data.length > 0 && (() => {
          const totalMales = data.reduce((s, g) => s + g.males, 0);
          const totalFemales = data.reduce((s, g) => s + g.females, 0);
          const total = totalMales + totalFemales;
          return (
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-sm font-semibold text-foreground mb-3 text-center">
                نسبة الرجال إلى النساء
              </p>
              <div className="flex items-center gap-4 mb-2">
                <div className="flex-1 text-start">
                  <span className="text-lg font-bold" style={{ color: 'var(--male-color)' }}>{totalMales}</span>
                  <span className="text-muted-foreground text-sm mr-1">ذكر</span>
                </div>
                <div className="flex-1 text-end">
                  <span className="text-muted-foreground text-sm ml-1">أنثى</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--female-color)' }}>{totalFemales}</span>
                </div>
              </div>
              <div className="h-8 rounded-full overflow-hidden flex">
                <div
                  className="flex items-center justify-center text-white text-xs font-bold"
                  style={{
                    width: `${total > 0 ? (totalMales / total) * 100 : 50}%`,
                    backgroundColor: 'var(--male-color)',
                  }}
                >
                  {total > 0 ? Math.round((totalMales / total) * 100) : 0}%
                </div>
                <div
                  className="flex items-center justify-center text-white text-xs font-bold"
                  style={{
                    width: `${total > 0 ? (totalFemales / total) * 100 : 50}%`,
                    backgroundColor: 'var(--female-color)',
                  }}
                >
                  {total > 0 ? Math.round((totalFemales / total) * 100) : 0}%
                </div>
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
