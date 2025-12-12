'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Users, TreePine, PlusCircle, BarChart3, Search, Menu, X, GitBranch, Download, Upload, History, Settings, Edit, Copy, MoreHorizontal, ChevronDown } from 'lucide-react';

const navItems = [
  { href: '/', label: 'الرئيسية', labelEn: 'Home', icon: Home },
  { href: '/tree', label: 'الشجرة', labelEn: 'Tree', icon: TreePine },
  { href: '/branches', label: 'الفروع', labelEn: 'Branches', icon: GitBranch },
  { href: '/registry', label: 'السجل', labelEn: 'Registry', icon: Users },
  { href: '/quick-add', label: 'إضافة', labelEn: 'Add', icon: PlusCircle },
  { href: '/dashboard', label: 'الإحصائيات', labelEn: 'Stats', icon: BarChart3 },
];

const moreNavItems = [
  { href: '/search', label: 'البحث', labelEn: 'Search', icon: Search },
  { href: '/tree-editor', label: 'محرر الشجرة', labelEn: 'Tree Editor', icon: Edit },
  { href: '/export', label: 'تصدير', labelEn: 'Export', icon: Download },
  { href: '/import', label: 'استيراد', labelEn: 'Import', icon: Upload },
  { href: '/duplicates', label: 'التكرارات', labelEn: 'Duplicates', icon: Copy },
  { href: '/history', label: 'السجل', labelEn: 'History', icon: History },
  { href: '/admin', label: 'لوحة التحكم', labelEn: 'Admin Panel', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsMoreOpen(false);
  }, [pathname]);

  // Close more dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
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

  return (
    <>
      <header className="bg-gradient-to-l from-green-600 to-green-700 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3 md:py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 md:gap-3">
              <span className="text-2xl md:text-3xl">🌳</span>
              <div>
                <h1 className="text-lg md:text-xl font-bold">شجرة آل شايع</h1>
                <p className="text-[10px] md:text-xs text-green-200 hidden sm:block">Al-Shaye Family Tree</p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
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
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
                    isMoreOpen || moreNavItems.some(item => pathname === item.href)
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
                    {moreNavItems.map((item) => {
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

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-green-500 transition-colors"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Bottom Navigation Bar for Mobile - Always visible */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 pb-safe"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="grid grid-cols-6 gap-1 px-1 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`${item.label} - ${item.labelEn}`}
                  className={cn(
                    'flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all min-w-0',
                    isActive
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-500 hover:text-green-600 hover:bg-gray-50'
                  )}
                >
                  <Icon size={20} aria-hidden="true" className={isActive ? 'text-green-600' : ''} />
                  <span className={cn(
                    'text-[9px] mt-0.5 font-medium truncate w-full text-center',
                    isActive ? 'text-green-600' : ''
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
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
            className="lg:hidden fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out"
            role="dialog"
            aria-modal="true"
            aria-label="القائمة الرئيسية"
          >
            {/* Menu Header */}
            <div className="bg-gradient-to-l from-green-600 to-green-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" role="img" aria-label="شجرة">🌳</span>
                  <div>
                    <h2 className="text-lg font-bold">شجرة آل شايع</h2>
                    <p className="text-xs text-green-200">Al-Shaye Family Tree</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-green-500 transition-colors"
                  aria-label="إغلاق القائمة"
                >
                  <X size={24} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="p-4 max-h-[calc(100vh-200px)] overflow-auto" aria-label="Main menu">
              <div className="mb-4">
                <p className="text-xs text-gray-400 px-4 mb-2" id="main-nav-label">التنقل الرئيسي</p>
                <ul role="list" aria-labelledby="main-nav-label" className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                            isActive
                              ? 'bg-green-100 text-green-700 font-semibold'
                              : 'text-gray-700 hover:bg-gray-100'
                          )}
                        >
                          <Icon size={22} aria-hidden="true" className={isActive ? 'text-green-600' : 'text-gray-400'} />
                          <div>
                            <span className="block">{item.label}</span>
                            <span className="text-xs text-gray-400">{item.labelEn}</span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-gray-400 px-4 mb-2" id="tools-nav-label">أدوات إضافية</p>
                <ul role="list" aria-labelledby="tools-nav-label" className="space-y-1">
                  {moreNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all',
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
            </nav>

            {/* Menu Footer */}
            <footer className="absolute bottom-20 left-0 right-0 p-4 border-t border-gray-100">
              <p className="text-center text-sm text-gray-400">
                99 عضو • 8 أجيال
              </p>
            </footer>
          </aside>
        </>
      )}

      {/* Spacer for bottom nav on mobile */}
      <div className="lg:hidden h-16" />
    </>
  );
}
