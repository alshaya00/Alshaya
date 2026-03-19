'use client';

import { Calendar, MapPin, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import type { AgeGroups } from '@/hooks/useStatistics';

interface DemographicsSectionProps {
  ageGroups: AgeGroups;
  livingMembers: number;
  topCities: [string, number][];
  topOccupations: { displayName: string; count: number }[];
}

export default function DemographicsSection({
  ageGroups,
  livingMembers,
  topCities,
  topOccupations,
}: DemographicsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Age Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="text-warning" size={22} />
            <span>توزيع الأعمار</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(ageGroups).map(([group, count]) => (
              <div key={group} className="flex items-center gap-3">
                <span className="w-32 text-sm text-muted-foreground">{group}</span>
                <div className="flex-1 bg-muted rounded-full h-4">
                  <div
                    className="bg-warning h-full rounded-full transition-all duration-500"
                    style={{ width: `${livingMembers > 0 ? (count / livingMembers) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 text-sm font-medium text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Cities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="text-destructive" size={22} />
            <span>المدن الرئيسية</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCities.map(([city, count], index) => (
              <div key={city} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <span className="flex-1 font-medium text-foreground">{city}</span>
                <Badge variant="destructive" size="sm">
                  {count}
                </Badge>
              </div>
            ))}
            {topCities.length === 0 && (
              <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Occupations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="text-info" size={22} />
            <span>المهن الشائعة</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topOccupations.map((occ) => (
              <div
                key={occ.displayName}
                className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg"
              >
                <span className="text-sm text-foreground">{occ.displayName}</span>
                <Badge variant="info" size="sm">
                  {occ.count}
                </Badge>
              </div>
            ))}
            {topOccupations.length === 0 && (
              <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
