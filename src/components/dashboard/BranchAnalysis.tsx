'use client';

import { GitBranch } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';

interface BranchData {
  name: string;
  count: number;
}

interface BranchAnalysisProps {
  branches: BranchData[];
  totalMembers: number;
}

export default function BranchAnalysis({ branches, totalMembers }: BranchAnalysisProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="text-primary" size={22} />
          <span>تحليل الفروع</span>
          <span className="text-sm font-normal text-muted-foreground">Branch Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {branches.map((branch) => {
            const percentage = totalMembers > 0 ? Math.round((branch.count / totalMembers) * 100) : 0;
            return (
              <Card
                key={branch.name}
                className="border-primary/20 bg-primary/5 dark:bg-primary/5 text-center"
              >
                <CardContent className="p-4">
                  <div className="text-2xl mb-2">🌿</div>
                  <h3 className="font-bold text-foreground">{branch.name}</h3>
                  <p className="text-2xl font-bold text-primary mt-1">{branch.count}</p>
                  <Badge variant="secondary" size="sm" className="mt-2">
                    {percentage}% من العائلة
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
