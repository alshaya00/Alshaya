'use client';

import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/config/navigation';

interface MobileBottomNavProps {
  pathname: string;
  filteredMobileNavItems: NavItem[];
  filteredMoreNavItems: NavItem[];
  isMobileMoreOpen: boolean;
  onMobileMoreToggle: () => void;
  onMobileMoreClose: () => void;
  mobileMoreRef: React.RefObject<HTMLDivElement>;
}

export function MobileBottomNav({
  pathname,
  filteredMobileNavItems,
  filteredMoreNavItems,
  isMobileMoreOpen,
  onMobileMoreToggle,
  onMobileMoreClose,
  mobileMoreRef,
}: MobileBottomNavProps) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 pb-safe"
      role="navigation"
      aria-label="التنقل السريع"
    >
      <div className="grid grid-cols-6 gap-0.5 px-1 py-1.5">
        {filteredMobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`${item.label} - ${item.labelEn}`}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all min-w-0',
                isActive
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-500 hover:text-green-600 active:bg-gray-100'
              )}
            >
              <Icon size={22} aria-hidden="true" />
              <span className={cn(
                'text-[10px] mt-1 font-medium truncate w-full text-center',
                isActive && 'text-green-600'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More Button */}
        <div className="relative" ref={mobileMoreRef}>
          <button
            onClick={onMobileMoreToggle}
            aria-expanded={isMobileMoreOpen}
            aria-haspopup="true"
            aria-label="المزيد من الخيارات"
            className={cn(
              'flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all min-w-0 w-full',
              isMobileMoreOpen || filteredMoreNavItems.some(item => pathname === item.href)
                ? 'text-green-600 bg-green-50'
                : 'text-gray-500 hover:text-green-600 active:bg-gray-100'
            )}
          >
            <MoreHorizontal size={22} aria-hidden="true" />
            <span className="text-[10px] mt-1 font-medium">المزيد</span>
          </button>

          {/* More Dropdown - Pops up above the nav */}
          {isMobileMoreOpen && (
            <div
              className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
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
                    onClick={onMobileMoreClose}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 transition-colors',
                      isActive
                        ? 'bg-green-50 text-green-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Icon size={18} aria-hidden="true" className={isActive ? 'text-green-600' : 'text-gray-400'} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
