'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Database,
  Settings,
  Wrench,
  BarChart3,
  Users,
  History,
  Camera,
  UserCheck,
  Link2,
  Shield,
  ChevronDown,
  ChevronLeft,
  Home,
  Menu,
  X,
  ClipboardList,
  FileSpreadsheet,
  Server,
  Image,
  Mail,
  Layers,
  UserPlus,
  Key,
  AlertCircle,
  UserX,
  FileText,
  Ban,
  Heart,
} from 'lucide-react';
import { useFeatureFlags, FeatureKey } from '@/contexts/FeatureFlagsContext';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  href: string;
  label: string;
  labelEn: string;
  icon: React.ElementType;
  children?: NavItem[];
  featureKey?: FeatureKey; // Optional feature flag to check
}

// Mapping of admin routes to feature keys
const adminRouteToFeature: Record<string, FeatureKey> = {
  '/admin/images': 'imageModeration',
  '/admin/broadcasts': 'broadcasts',
  '/admin/reports': 'reports',
  '/admin/audit': 'audit',
  '/admin/services': 'apiServices',
  '/admin/database/history': 'changeHistory',
  '/admin/database/branches': 'branchEntries',
};

const adminNavItems: NavItem[] = [
  {
    href: '/admin',
    label: 'لوحة التحكم',
    labelEn: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/database',
    label: 'إدارة قاعدة البيانات',
    labelEn: 'Database',
    icon: Database,
    children: [
      { href: '/admin/database/members', label: 'الأعضاء', labelEn: 'Members', icon: Users },
      { href: '/admin/database/excel', label: 'عرض Excel', labelEn: 'Excel View', icon: FileSpreadsheet },
      { href: '/admin/database/history', label: 'سجل التغييرات', labelEn: 'History', icon: History },
      { href: '/admin/database/snapshots', label: 'النسخ الاحتياطية', labelEn: 'Snapshots', icon: Camera },
      { href: '/admin/database/pending', label: 'الطلبات المعلقة', labelEn: 'Pending', icon: UserCheck },
      { href: '/admin/database/branches', label: 'روابط الفروع', labelEn: 'Branch Links', icon: Link2 },
    ],
  },
  {
    href: '/admin/access-requests',
    label: 'طلبات الانضمام',
    labelEn: 'Access Requests',
    icon: UserPlus,
  },
  {
    href: '/admin/invitations',
    label: 'رموز الدعوات',
    labelEn: 'Invitation Codes',
    icon: Key,
  },
  {
    href: '/admin/users',
    label: 'إدارة المستخدمين',
    labelEn: 'User Management',
    icon: Users,
  },
  {
    href: '/admin/blocklist',
    label: 'القائمة السوداء',
    labelEn: 'Blocklist',
    icon: Ban,
  },
  {
    href: '/admin/credits',
    label: 'فئات الشكر والتقدير',
    labelEn: 'Credits Categories',
    icon: Heart,
  },
  {
    href: '/admin/unregistered',
    label: 'الأعضاء غير المسجلين',
    labelEn: 'Unregistered Members',
    icon: UserX,
  },
  {
    href: '/admin/images',
    label: 'إدارة الصور',
    labelEn: 'Image Moderation',
    icon: Image,
  },
  {
    href: '/admin/journals',
    label: 'موافقات القصص',
    labelEn: 'Story Approvals',
    icon: FileText,
  },
  {
    href: '/admin/broadcasts',
    label: 'البث البريدي',
    labelEn: 'Email Broadcasts',
    icon: Mail,
  },
  {
    href: '/admin/features',
    label: 'معاينة الميزات',
    labelEn: 'Feature Preview',
    icon: Layers,
  },
  {
    href: '/admin/config',
    label: 'إعدادات النظام',
    labelEn: 'Configuration',
    icon: Settings,
  },
  {
    href: '/admin/tools',
    label: 'أدوات البيانات',
    labelEn: 'Data Tools',
    icon: Wrench,
  },
  {
    href: '/admin/data-validation',
    label: 'فحص البيانات',
    labelEn: 'Data Validation',
    icon: AlertCircle,
  },
  {
    href: '/admin/reports',
    label: 'التقارير والتحليلات',
    labelEn: 'Reports',
    icon: BarChart3,
  },
  {
    href: '/admin/audit',
    label: 'سجل المراجعة',
    labelEn: 'Audit Log',
    icon: ClipboardList,
  },
  {
    href: '/admin/services',
    label: 'الخدمات الخارجية',
    labelEn: 'API Services',
    icon: Server,
  },
  {
    href: '/admin/settings',
    label: 'إدارة المشرفين',
    labelEn: 'Admin Users',
    icon: Shield,
  },
];

interface PendingCounts {
  accessRequests: number;
  pendingMembers: number;
  pendingImages: number;
  pendingStories: number;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { isFeatureEnabled } = useFeatureFlags();
  const { session } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['/admin/database']);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({
    accessRequests: 0,
    pendingMembers: 0,
    pendingImages: 0,
    pendingStories: 0,
  });

  useEffect(() => {
    const fetchPendingCounts = async () => {
      if (!session?.token) return;
      const headers: HeadersInit = { Authorization: `Bearer ${session.token}` };
      
      try {
        const [accessRes, pendingRes, imagesRes, storiesRes] = await Promise.all([
          fetch('/api/access-requests', { headers }).catch(() => null),
          fetch('/api/admin/pending', { headers }).catch(() => null),
          fetch('/api/images/pending', { headers }).catch(() => null),
          fetch('/api/admin/journals', { headers }).catch(() => null),
        ]);

        const accessData = accessRes ? await accessRes.json().catch(() => ({})) : {};
        const pendingData = pendingRes ? await pendingRes.json().catch(() => ({})) : {};
        const imagesData = imagesRes ? await imagesRes.json().catch(() => ({})) : {};
        const storiesData = storiesRes ? await storiesRes.json().catch(() => ({})) : {};

        setPendingCounts({
          accessRequests: accessData.requests?.filter((r: { status: string }) => r.status === 'PENDING').length || 0,
          pendingMembers: pendingData.pending?.filter((p: { reviewStatus: string }) => p.reviewStatus === 'PENDING').length || 0,
          pendingImages: imagesData.pending?.filter((p: { reviewStatus: string }) => p.reviewStatus === 'PENDING').length || 0,
          pendingStories: storiesData.data?.filter((s: { reviewStatus: string }) => s.reviewStatus === 'PENDING').length || 0,
        });
      } catch (error) {
        console.error('Error fetching pending counts:', error);
      }
    };

    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 60000);
    return () => clearInterval(interval);
  }, [session?.token]);

  const getPendingCountForHref = (href: string): number => {
    switch (href) {
      case '/admin/access-requests':
        return pendingCounts.accessRequests;
      case '/admin/database/pending':
        return pendingCounts.pendingMembers;
      case '/admin/images':
        return pendingCounts.pendingImages;
      case '/admin/journals':
        return pendingCounts.pendingStories;
      default:
        return 0;
    }
  };

  // Filter admin nav items based on feature flags
  const filteredAdminNavItems = useMemo(() => {
    // Check if a nav item should be visible based on feature flags
    const isNavItemEnabled = (item: NavItem): boolean => {
      const featureKey = adminRouteToFeature[item.href];
      if (!featureKey) return true; // If no feature mapping, show by default
      return isFeatureEnabled(featureKey);
    };

    return adminNavItems
      .filter(isNavItemEnabled)
      .map(item => {
        // Also filter children if they exist
        if (item.children) {
          return {
            ...item,
            children: item.children.filter(isNavItemEnabled)
          };
        }
        return item;
      })
      // Remove parent items that have no visible children
      .filter(item => !item.children || item.children.length > 0);
  }, [isFeatureEnabled]);

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    const currentPath = pathname || '/admin';
    if (href === '/admin') {
      return currentPath === '/admin';
    }
    return currentPath.startsWith(href);
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isItemActive = isActive(item.href);
    const isExpanded = expandedItems.includes(item.href);

    return (
      <div key={item.href}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.href)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all',
              isItemActive
                ? 'bg-[#1E3A5F] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <div className="flex items-center gap-3">
              <Icon size={20} />
              <div className="text-right">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="text-xs opacity-70">{item.labelEn}</span>
              </div>
            </div>
            <ChevronDown
              size={16}
              className={cn('transition-transform', isExpanded && 'rotate-180')}
            />
          </button>
        ) : (
          <Link
            href={item.href}
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative',
              depth > 0 && 'mr-6 py-2',
              isItemActive
                ? depth > 0
                  ? 'bg-blue-50 text-[#1E3A5F] font-medium'
                  : 'bg-[#1E3A5F] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Icon size={depth > 0 ? 18 : 20} />
            <div className="text-right flex-1">
              <span className={cn('block', depth > 0 ? 'text-sm' : 'text-sm font-medium')}>
                {item.label}
              </span>
              {depth === 0 && <span className="text-xs opacity-70">{item.labelEn}</span>}
            </div>
            {getPendingCountForHref(item.href) > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {getPendingCountForHref(item.href)}
              </span>
            )}
          </Link>
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold">لوحة الإدارة</h2>
              <p className="text-xs text-white/70">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-auto">
        {filteredAdminNavItems.map((item) => renderNavItem(item))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
        >
          <Home size={20} />
          <div className="text-right">
            <span className="block text-sm font-medium">العودة للموقع</span>
            <span className="text-xs text-gray-400">Back to Site</span>
          </div>
          <ChevronLeft size={16} className="mr-auto" />
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-40 p-3 bg-[#1E3A5F] text-white rounded-lg shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 right-0 bottom-0 w-72 bg-white z-50 transform transition-transform duration-300 flex flex-col',
          isMobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:top-0 lg:right-0 lg:bottom-0 bg-white border-l shadow-sm z-30">
        {sidebarContent}
      </aside>
    </>
  );
}
