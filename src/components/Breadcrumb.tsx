'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// Route translations and metadata
const routeConfig: Record<string, { label: string; labelEn: string }> = {
  '/': { label: 'الرئيسية', labelEn: 'Home' },
  '/tree': { label: 'الشجرة', labelEn: 'Tree' },
  '/branches': { label: 'الفروع', labelEn: 'Branches' },
  '/registry': { label: 'السجل', labelEn: 'Registry' },
  '/quick-add': { label: 'إضافة سريعة', labelEn: 'Quick Add' },
  '/dashboard': { label: 'الإحصائيات', labelEn: 'Statistics' },
  '/search': { label: 'البحث', labelEn: 'Search' },
  '/tree-editor': { label: 'محرر الشجرة', labelEn: 'Tree Editor' },
  '/export': { label: 'تصدير', labelEn: 'Export' },
  '/import': { label: 'استيراد', labelEn: 'Import' },
  '/duplicates': { label: 'التكرارات', labelEn: 'Duplicates' },
  '/history': { label: 'السجل', labelEn: 'History' },
  '/member': { label: 'عضو', labelEn: 'Member' },
  '/edit': { label: 'تعديل', labelEn: 'Edit' },
  '/admin': { label: 'لوحة التحكم', labelEn: 'Admin' },
  '/admin/database': { label: 'قاعدة البيانات', labelEn: 'Database' },
  '/admin/database/members': { label: 'الأعضاء', labelEn: 'Members' },
  '/admin/database/history': { label: 'السجل', labelEn: 'History' },
  '/admin/database/snapshots': { label: 'النسخ الاحتياطية', labelEn: 'Snapshots' },
  '/admin/database/pending': { label: 'قيد الانتظار', labelEn: 'Pending' },
  '/admin/database/branches': { label: 'روابط الفروع', labelEn: 'Branch Links' },
  '/admin/config': { label: 'الإعدادات', labelEn: 'Config' },
  '/admin/tools': { label: 'الأدوات', labelEn: 'Tools' },
  '/admin/reports': { label: 'التقارير', labelEn: 'Reports' },
  '/admin/settings': { label: 'المستخدمين', labelEn: 'Users' },
  '/admin/pending': { label: 'قيد الانتظار', labelEn: 'Pending' },
};

interface BreadcrumbProps {
  className?: string;
  showHome?: boolean;
}

export function Breadcrumb({ className, showHome = true }: BreadcrumbProps) {
  const pathname = usePathname();

  // Don't show breadcrumb on homepage
  if (pathname === '/') {
    return null;
  }

  // Build breadcrumb items from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbItems: Array<{ href: string; label: string; labelEn: string; isLast: boolean }> = [];

  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;

    // Check if this is a dynamic segment (like [id])
    const isDynamic = /^\d+$/.test(segment) || segment.length > 20;

    if (isDynamic) {
      // For dynamic segments, show a generic label or the ID
      breadcrumbItems.push({
        href: currentPath,
        label: segment.length > 10 ? `#${segment.slice(0, 8)}...` : `#${segment}`,
        labelEn: 'Details',
        isLast,
      });
    } else {
      const config = routeConfig[currentPath] || {
        label: segment,
        labelEn: segment,
      };
      breadcrumbItems.push({
        href: currentPath,
        ...config,
        isLast,
      });
    }
  });

  return (
    <nav
      aria-label="مسار التنقل"
      className={cn('py-3 px-4 bg-gray-50 border-b', className)}
    >
      <ol className="container mx-auto flex items-center gap-2 text-sm flex-wrap" role="list">
        {showHome && (
          <li className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-1 text-gray-500 hover:text-green-600 transition-colors"
              aria-label="الرئيسية"
            >
              <Home size={16} aria-hidden="true" />
              <span className="hidden sm:inline">الرئيسية</span>
            </Link>
            <ChevronLeft size={16} className="mx-2 text-gray-400" aria-hidden="true" />
          </li>
        )}

        {breadcrumbItems.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {item.isLast ? (
              <span
                className="font-medium text-green-700"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <>
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-green-600 transition-colors"
                >
                  {item.label}
                </Link>
                <ChevronLeft size={16} className="mx-2 text-gray-400" aria-hidden="true" />
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
