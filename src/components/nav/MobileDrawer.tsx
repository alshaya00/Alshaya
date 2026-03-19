'use client';

import Link from 'next/link';
import { X, User, LogOut, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, type UserRole } from '@/lib/auth/types';
import type { FeatureKey } from '@/contexts/FeatureFlagsContext';
import type { NavItem } from '@/config/navigation';
import { NavSearch } from './NavSearch';

interface MobileDrawerUser {
  nameArabic: string;
  role: UserRole;
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
  filteredNavItems: NavItem[];
  filteredMoreNavItems: NavItem[];
  user: MobileDrawerUser | null;
  isFeatureEnabled: (feature: FeatureKey) => boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onLogout: () => void;
}

export function MobileDrawer({
  isOpen,
  onClose,
  pathname,
  filteredNavItems,
  filteredMoreNavItems,
  user,
  isFeatureEnabled,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onLogout,
}: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="lg:hidden fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <aside
        className="lg:hidden fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="القائمة الرئيسية"
      >
        {/* Menu Header */}
        <div className="bg-gradient-to-l from-green-600 to-green-700 p-4 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="شجرة">🌳</span>
              <div>
                <h2 className="text-base font-bold">شجرة آل شايع</h2>
                <p className="text-xs text-green-200">Al-Shaya Family Tree</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-green-500 transition-colors"
              aria-label="إغلاق القائمة"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>

          {/* Mobile Search in Menu */}
          <NavSearch
            variant="mobile"
            searchQuery={searchQuery}
            isSearching={false}
            onSearchQueryChange={onSearchQueryChange}
            onSubmit={onSearch}
          />
        </div>

        {/* Menu Items */}
        <nav className="p-3 flex-1 overflow-y-auto pb-20" aria-label="القائمة الرئيسية">
          <div className="mb-3">
            <p className="text-xs text-gray-400 px-3 mb-2" id="main-nav-label">التنقل الرئيسي</p>
            <ul role="list" aria-labelledby="main-nav-label" className="space-y-1">
              {[...filteredNavItems, ...(isFeatureEnabled('dashboard') ? [{ href: '/dashboard', label: 'الإحصائيات', labelEn: 'Stats', icon: BarChart3 }] : [])].map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                        isActive
                          ? 'bg-green-100 text-green-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <Icon size={20} aria-hidden="true" className={isActive ? 'text-green-600' : 'text-gray-400'} />
                      <div>
                        <span className="block text-sm">{item.label}</span>
                        <span className="text-[10px] text-gray-400">{item.labelEn}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs text-gray-400 px-3 mb-2" id="tools-nav-label">أدوات إضافية</p>
            <ul role="list" aria-labelledby="tools-nav-label" className="space-y-1">
              {filteredMoreNavItems.filter(item => !['/dashboard', '/branches'].includes(item.href)).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl transition-all',
                        isActive
                          ? 'bg-green-100 text-green-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      <Icon size={18} aria-hidden="true" className={isActive ? 'text-green-600' : 'text-gray-400'} />
                      <div>
                        <span className="block text-sm">{item.label}</span>
                        <span className="text-[10px] text-gray-400">{item.labelEn}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* User section in mobile menu */}
          {user && (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs text-gray-400 px-3 mb-2">الحساب</p>
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
              >
                <User size={18} className="text-gray-400" />
                <span className="text-sm">الملف الشخصي</span>
              </Link>
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 w-full"
              >
                <LogOut size={18} />
                <span className="text-sm">تسجيل الخروج</span>
              </button>
            </div>
          )}
        </nav>

        {/* Menu Footer */}
        <footer className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-100 bg-white">
          {user ? (
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">{user.nameArabic}</p>
              <p className="text-xs text-gray-400">{ROLE_LABELS[user.role].ar}</p>
            </div>
          ) : (
            <p className="text-center text-xs text-gray-400">
              شجرة آل شايع &bull; النسخة 1.0
            </p>
          )}
        </footer>
      </aside>
    </>
  );
}
