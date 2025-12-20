'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Menu, X, MoreHorizontal, ChevronDown, Loader2, LogOut, User, Shield, Search, BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlags, routeToFeature, FeatureKey } from '@/contexts/FeatureFlagsContext';
import { ROLE_LABELS } from '@/lib/auth/types';
import { mainNavItems, mobileNavItems, moreNavItems as configMoreNavItems, NavItem } from '@/config/navigation';

// Using centralized navigation config
const navItems = mainNavItems;
const mobileNavItemsList = mobileNavItems;
const moreNavItems = configMoreNavItems;

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasPermission } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const mobileMoreRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Helper to check if a nav item should be visible based on feature flags
  const isNavItemEnabled = (item: NavItem): boolean => {
    const featureKey = routeToFeature[item.href];
    if (!featureKey) return true; // If no feature mapping, show by default
    return isFeatureEnabled(featureKey);
  };

  // Filter navigation items based on feature flags
  const filteredNavItems = navItems.filter(isNavItemEnabled);
  const filteredMobileNavItems = mobileNavItemsList.filter(isNavItemEnabled);

  // Close menus on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsMoreOpen(false);
    setIsMobileMoreOpen(false);
    setIsUserMenuOpen(false);
    setSearchQuery('');
  }, [pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
      if (mobileMoreRef.current && !mobileMoreRef.current.contains(event.target as Node)) {
        setIsMobileMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearching(true);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setTimeout(() => setIsSearching(false), 500);
    }
  };

  // Handle keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Filter more nav items based on permissions AND feature flags
  const filteredMoreNavItems = moreNavItems.filter((item) => {
    // First check feature flags
    if (!isNavItemEnabled(item)) return false;
    // Then check permissions
    if (!item.permission) return true;
    return hasPermission(item.permission as Parameters<typeof hasPermission>[0]);
  });

  return (
    <>
      <header className="bg-gradient-to-l from-green-600 to-green-700 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3 md:py-4 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0">
              <span className="text-2xl md:text-3xl" role="img" aria-label="شجرة العائلة">🌳</span>
              <div className="hidden sm:block">
                <h1 className="text-lg md:text-xl font-bold">شجرة آل شايع</h1>
                <p className="text-[10px] md:text-xs text-green-200">Al-Shaye Family Tree</p>
              </div>
            </Link>

            {/* Global Search Bar - Desktop */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-md mx-4"
              role="search"
            >
              <div className="relative w-full">
                <label htmlFor="global-search" className="sr-only">البحث عن أفراد العائلة</label>
                <input
                  ref={searchInputRef}
                  id="global-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن أفراد العائلة... (⌘K)"
                  className="w-full px-4 py-2 pr-10 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-green-200 border border-white/30 focus:bg-white/30 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  aria-describedby="search-hint"
                />
                <button
                  type="submit"
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/20 rounded-md transition-colors"
                  aria-label="بحث"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Search size={18} aria-hidden="true" />
                  )}
                </button>
                <span id="search-hint" className="sr-only">اضغط Enter للبحث أو استخدم Ctrl+K للتركيز على البحث</span>
              </div>
            </form>

            {/* Desktop Navigation Links */}
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

              {/* More Dropdown for Desktop */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
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

            {/* User Menu (Desktop) */}
            <div className="hidden lg:flex items-center gap-4">
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-green-500 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <User size={18} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{user.nameArabic}</p>
                      <p className="text-[10px] text-green-200">{ROLE_LABELS[user.role].ar}</p>
                    </div>
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 py-2 text-gray-700">
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User size={16} />
                          <span>الملف الشخصي</span>
                        </Link>
                        {hasPermission('view_users') && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Shield size={16} />
                            <span>لوحة الإدارة</span>
                          </Link>
                        )}
                        <hr className="my-2" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-red-600"
                        >
                          <LogOut size={16} />
                          <span>تسجيل الخروج</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile: Search & Menu buttons */}
            <div className="flex items-center gap-2 lg:hidden">
              <Link
                href="/search"
                className="p-2 rounded-lg hover:bg-green-500 transition-colors"
                aria-label="البحث"
              >
                <Search size={22} aria-hidden="true" />
              </Link>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg hover:bg-green-500 transition-colors"
                aria-label={isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar for Mobile - 5 items + More */}
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

            {/* More Button for Mobile Bottom Nav */}
            <div className="relative" ref={mobileMoreRef}>
              <button
                onClick={() => setIsMobileMoreOpen(!isMobileMoreOpen)}
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

              {/* Mobile More Dropdown - Pops up above the nav */}
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
                        onClick={() => setIsMobileMoreOpen(false)}
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
      </header>

      {/* Mobile Slide-out Menu */}
      {isMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Panel */}
          <aside
            className="lg:hidden fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out overflow-hidden"
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
                    <p className="text-xs text-green-200">Al-Shaye Family Tree</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-green-500 transition-colors"
                  aria-label="إغلاق القائمة"
                >
                  <X size={22} aria-hidden="true" />
                </button>
              </div>

              {/* Mobile Search in Menu */}
              <form onSubmit={handleSearch} role="search">
                <label htmlFor="mobile-search" className="sr-only">البحث</label>
                <div className="relative">
                  <input
                    id="mobile-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن أفراد العائلة..."
                    className="w-full px-4 py-2 pr-10 rounded-lg bg-white/20 text-white placeholder-green-200 border border-white/30 focus:bg-white/30 focus:outline-none text-sm"
                  />
                  <button
                    type="submit"
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1"
                    aria-label="بحث"
                  >
                    <Search size={16} aria-hidden="true" />
                  </button>
                </div>
              </form>
            </div>

            {/* Menu Items */}
            <nav className="p-3 h-[calc(100vh-180px)] overflow-y-auto" aria-label="القائمة الرئيسية">
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
                          onClick={() => setIsMenuOpen(false)}
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
                          onClick={() => setIsMenuOpen(false)}
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
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
                  >
                    <User size={18} className="text-gray-400" />
                    <span className="text-sm">الملف الشخصي</span>
                  </Link>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleLogout();
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
                  شجرة آل شايع • النسخة 1.0
                </p>
              )}
            </footer>
          </aside>
        </>
      )}

      {/* Spacer for bottom nav on mobile */}
      <div className="lg:hidden h-16" />
    </>
  );
}
