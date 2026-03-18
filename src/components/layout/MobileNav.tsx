'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

/* ============================================
   MobileNav - Bottom navigation bar for mobile
   ============================================ */
export interface MobileNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export interface MobileNavProps {
  items: MobileNavItem[];
  activePath: string;
  className?: string;
  moreButton?: ReactNode;
}

export function MobileNav({ items, activePath, className, moreButton }: MobileNavProps) {
  const gridCols = moreButton
    ? `grid-cols-${Math.min(items.length + 1, 6)}`
    : `grid-cols-${Math.min(items.length, 5)}`;

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 inset-x-0',
        'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'border-t border-border shadow-lg z-50',
        'pb-safe',
        className
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 gap-0.5 px-1 py-1.5">
        {items.slice(0, moreButton ? 4 : 5).map((item) => {
          const Icon = item.icon;
          const isActive = activePath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-1 rounded-lg',
                'transition-colors min-w-0 relative',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground active:bg-accent'
              )}
            >
              <div className="relative">
                <Icon size={22} aria-hidden="true" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -end-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-2xs font-bold px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] mt-1 font-medium truncate w-full text-center',
                  isActive && 'text-primary'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
        {moreButton}
      </div>
    </nav>
  );
}

/* ============================================
   MobileNavSpacer - prevents content from being
   hidden behind the bottom nav
   ============================================ */
export function MobileNavSpacer() {
  return <div className="lg:hidden h-16" aria-hidden="true" />;
}
