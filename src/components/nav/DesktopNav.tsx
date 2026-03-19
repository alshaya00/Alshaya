'use client';

import Link from 'next/link';
import { MoreHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/config/navigation';

interface DesktopNavProps {
  pathname: string;
  filteredNavItems: NavItem[];
  filteredMoreNavItems: NavItem[];
  isMoreOpen: boolean;
  onMoreToggle: () => void;
  moreMenuRef: React.RefObject<HTMLDivElement>;
}

export function DesktopNav({
  pathname,
  filteredNavItems,
  filteredMoreNavItems,
  isMoreOpen,
  onMoreToggle,
  moreMenuRef,
}: DesktopNavProps) {
  return (
    <nav className="hidden lg:flex items-center gap-1 shrink-0" role="navigation" aria-label="التنقل الرئيسي">
      {filteredNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
              isActive
                ? 'bg-white text-green-700 font-semibold'
                : 'hover:bg-green-500 text-white'
            )}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* More Dropdown */}
      <div className="relative" ref={moreMenuRef}>
        <button
          onClick={onMoreToggle}
          aria-expanded={isMoreOpen}
          aria-haspopup="true"
          aria-label="المزيد من الخيارات"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
            isMoreOpen || filteredMoreNavItems.some(item => pathname === item.href)
              ? 'bg-white text-green-700 font-semibold'
              : 'hover:bg-green-500 text-white'
          )}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
          <span>المزيد</span>
          <ChevronDown size={14} aria-hidden="true" className={cn('transition-transform', isMoreOpen && 'rotate-180')} />
        </button>

        {isMoreOpen && (
          <div
            className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
            role="menu"
          >
            {filteredMoreNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 transition-colors',
                    isActive
                      ? 'bg-green-50 text-green-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Icon size={18} aria-hidden="true" className={isActive ? 'text-green-600' : 'text-gray-400'} />
                  <div>
                    <span className="block">{item.label}</span>
                    <span className="text-xs text-gray-400">{item.labelEn}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
