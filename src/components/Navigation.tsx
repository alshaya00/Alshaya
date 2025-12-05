'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Users, TreePine, PlusCircle, BarChart3, Search } from 'lucide-react';

const navItems = [
  { href: '/', label: 'الرئيسية', labelEn: 'Home', icon: Home },
  { href: '/tree', label: 'الشجرة', labelEn: 'Tree', icon: TreePine },
  { href: '/registry', label: 'السجل', labelEn: 'Registry', icon: Users },
  { href: '/quick-add', label: 'إضافة سريعة', labelEn: 'Quick Add', icon: PlusCircle },
  { href: '/dashboard', label: 'الإحصائيات', labelEn: 'Dashboard', icon: BarChart3 },
  { href: '/search', label: 'البحث', labelEn: 'Search', icon: Search },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="bg-gradient-to-l from-green-600 to-green-700 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <span className="text-3xl">🌳</span>
            <div>
              <h1 className="text-xl font-bold">شجرة آل شايع</h1>
              <p className="text-xs text-green-200">Al-Shaye Family Tree</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-white text-green-700 font-semibold'
                      : 'hover:bg-green-500 text-white'
                  )}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-green-500">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden pb-4 flex flex-wrap gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-white text-green-700 font-semibold'
                    : 'bg-green-500 text-white'
                )}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
