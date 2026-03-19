'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  variant?: 'blue' | 'pink' | 'green' | 'emerald' | 'gray' | 'purple' | 'amber';
  className?: string;
}

const variantStyles: Record<string, { card: string; icon: string; label: string }> = {
  blue: {
    card: 'bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/5 dark:border-blue-500/10',
    icon: 'text-blue-600 dark:text-blue-400',
    label: 'text-blue-700/70 dark:text-blue-300/70',
  },
  pink: {
    card: 'bg-pink-500/10 border-pink-500/20 dark:bg-pink-500/5 dark:border-pink-500/10',
    icon: 'text-pink-600 dark:text-pink-400',
    label: 'text-pink-700/70 dark:text-pink-300/70',
  },
  green: {
    card: 'bg-green-500/10 border-green-500/20 dark:bg-green-500/5 dark:border-green-500/10',
    icon: 'text-green-600 dark:text-green-400',
    label: 'text-green-700/70 dark:text-green-300/70',
  },
  emerald: {
    card: 'bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/5 dark:border-emerald-500/10',
    icon: 'text-emerald-600 dark:text-emerald-400',
    label: 'text-emerald-700/70 dark:text-emerald-300/70',
  },
  gray: {
    card: 'bg-muted border-border',
    icon: 'text-muted-foreground',
    label: 'text-muted-foreground',
  },
  purple: {
    card: 'bg-purple-500/10 border-purple-500/20 dark:bg-purple-500/5 dark:border-purple-500/10',
    icon: 'text-purple-600 dark:text-purple-400',
    label: 'text-purple-700/70 dark:text-purple-300/70',
  },
  amber: {
    card: 'bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/5 dark:border-amber-500/10',
    icon: 'text-amber-600 dark:text-amber-400',
    label: 'text-amber-700/70 dark:text-amber-300/70',
  },
};

export default function StatCard({ title, value, icon, variant = 'blue', className }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn('stat-card overflow-hidden', styles.card, className)}>
      <CardContent className="p-5">
        <div className={cn('mb-2', styles.icon)}>{icon}</div>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <div className={cn('text-sm mt-1', styles.label)}>{title}</div>
      </CardContent>
    </Card>
  );
}
