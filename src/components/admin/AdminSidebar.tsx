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
  Unlink,
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
  Archive,
  FolderOpen,
  Folder,
  RefreshCw,
} from 'lucide-react';
import { useFeatureFlags, FeatureKey } from '@/contexts/FeatureFlagsContext';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  href: string;
  label: string;
  labelEn: string;
  icon: React.ElementType;
  children?: NavItem[];
  featureKey?: FeatureKey;
  badge?: number;
}

interface NavGroup {
  id: string;
  label: string;
  labelEn: string;
  icon: React.ElementType;
  hubHref: string;
  color: string;
  items: NavItem[];
}

const adminRouteToFeature: Record<string, FeatureKey> = {
  '/admin/images': 'imageModeration',
  '/admin/broadcasts': 'broadcasts',
  '/admin/reports': 'reports',
  '/admin/audit': 'audit',
  '/admin/services': 'apiServices',
  '/admin/database/history': 'changeHistory',
  '/admin/database/branches': 'branchEntries',
};

const navGroups: NavGroup[] = [
  {
    id: 'members',
    label: 'إدارة الأعضاء',
    labelEn: 'Members',
    icon: Users,
    hubHref: '/admin/members-hub',
    color: 'blue',
    items: [
      { href: '/admin/pending', label: 'الطلبات المعلقة', labelEn: 'Pending', icon: UserCheck },
      { href: '/admin/database/members', label: 'جدول الأعضاء', labelEn: 'Members Table', icon: Users },
      { href: '/admin/unregistered', label: 'غير المسجلين', labelEn: 'Unregistered', icon: UserX },
      { href: '/admin/database/branches', label: 'روابط الفروع', labelEn: 'Branch Links', icon: Link2 },
      { href: '/admin/merge', label: 'دمج المكررات', labelEn: 'Merge', icon: RefreshCw },
      { href: '/admin/data-cleanup', label: 'تنظيف البيانات', labelEn: 'Data Cleanup', icon: Wrench },
    ],
  },
  {
    id: 'users',
    label: 'المستخدمين والصلاحيات',
    labelEn: 'Users & Permissions',
    icon: Shield,
    hubHref: '/admin/users-hub',
    color: 'purple',
    items: [
      { href: '/admin/users', label: 'إدارة المستخدمين', labelEn: 'User Management', icon: Users },
      { href: '/admin/settings', label: 'إدارة المشرفين', labelEn: 'Admin Users', icon: Shield },
      { href: '/admin/invitations', label: 'رموز الدعوات', labelEn: 'Invitations', icon: Key },
      { href: '/admin/blocklist', label: 'القائمة السوداء', labelEn: 'Blocklist', icon: Ban },
      { href: '/admin/orphaned', label: 'المستخدمون غير المرتبطين', labelEn: 'Orphaned', icon: Unlink },
    ],
  },
  {
    id: 'content',
    label: 'المحتوى والوسائط',
    labelEn: 'Content & Media',
    icon: Image,
    hubHref: '/admin/content-hub',
    color: 'pink',
    items: [
      { href: '/admin/images', label: 'إدارة الصور', labelEn: 'Images', icon: Image },
      { href: '/admin/journals', label: 'موافقات القصص', labelEn: 'Stories', icon: FileText },
      { href: '/admin/album-folders', label: 'مجلدات الألبوم', labelEn: 'Albums', icon: FolderOpen },
      { href: '/admin/credits', label: 'فئات الشكر', labelEn: 'Credits', icon: Heart },
    ],
  },
  {
    id: 'data',
    label: 'البيانات والنسخ',
    labelEn: 'Data & Backups',
    icon: Database,
    hubHref: '/admin/data-hub',
    color: 'green',
    items: [
      { href: '/admin/database', label: 'قاعدة البيانات', labelEn: 'Database', icon: Database },
      { href: '/admin/database/excel', label: 'عرض Excel', labelEn: 'Excel', icon: FileSpreadsheet },
      { href: '/admin/database/snapshots', label: 'النسخ الاحتياطية', labelEn: 'Backups', icon: Camera },
      { href: '/admin/tools', label: 'أدوات البيانات', labelEn: 'Tools', icon: Wrench },
      { href: '/admin/data-validation', label: 'فحص البيانات', labelEn: 'Validation', icon: AlertCircle },
      { href: '/admin/sync-data', label: 'مزامنة البيانات', labelEn: 'Sync', icon: RefreshCw },
      { href: '/admin/data-migration', label: 'ترحيل البيانات', labelEn: 'Migration', icon: Database },
      { href: '/admin/data-repair', label: 'إصلاح الروابط', labelEn: 'Repair Links', icon: Wrench },
    ],
  },
  {
    id: 'reports',
    label: 'التقارير والسجلات',
    labelEn: 'Reports & Logs',
    icon: BarChart3,
    hubHref: '/admin/reports-hub',
    color: 'amber',
    items: [
      { href: '/admin/reports', label: 'التقارير', labelEn: 'Reports', icon: BarChart3 },
      { href: '/admin/database/history', label: 'سجل التغييرات', labelEn: 'History', icon: History },
      { href: '/admin/audit', label: 'سجل المراجعة', labelEn: 'Audit', icon: ClipboardList },
    ],
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    labelEn: 'Settings',
    icon: Settings,
    hubHref: '/admin/settings-hub',
    color: 'slate',
    items: [
      { href: '/admin/config', label: 'إعدادات النظام', labelEn: 'Config', icon: Settings },
      { href: '/admin/features', label: 'معاينة الميزات', labelEn: 'Features', icon: Layers },
      { href: '/admin/services', label: 'الخدمات الخارجية', labelEn: 'Services', icon: Server },
      { href: '/admin/broadcasts', label: 'البث البريدي', labelEn: 'Broadcasts', icon: Mail },
    ],
  },
];

interface PendingCounts {
  pendingMembers: number;
  pendingImages: number;
  pendingStories: number;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { isFeatureEnabled } = useFeatureFlags();
  const { session } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['members']);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({
    pendingMembers: 0,
    pendingImages: 0,
    pendingStories: 0,
  });

  useEffect(() => {
    const fetchPendingCounts = async () => {
      if (!session?.token) return;
      const headers: HeadersInit = { Authorization: `Bearer ${session.token}` };
      
      try {
        const [pendingRes, imagesRes, storiesRes] = await Promise.all([
          fetch('/api/admin/pending', { headers }).catch(() => null),
          fetch('/api/images/pending', { headers }).catch(() => null),
          fetch('/api/admin/journals', { headers }).catch(() => null),
        ]);

        const pendingData = pendingRes ? await pendingRes.json().catch(() => ({})) : {};
        const imagesData = imagesRes ? await imagesRes.json().catch(() => ({})) : {};
        const storiesData = storiesRes ? await storiesRes.json().catch(() => ({})) : {};

        setPendingCounts({
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
      case '/admin/pending':
        return pendingCounts.pendingMembers;
      case '/admin/images':
        return pendingCounts.pendingImages;
      case '/admin/journals':
        return pendingCounts.pendingStories;
      default:
        return 0;
    }
  };

  const filteredGroups = useMemo(() => {
    const isNavItemEnabled = (item: NavItem): boolean => {
      const featureKey = adminRouteToFeature[item.href];
      if (!featureKey) return true;
      return isFeatureEnabled(featureKey);
    };

    return navGroups.map(group => ({
      ...group,
      items: group.items.filter(isNavItemEnabled),
    })).filter(group => group.items.length > 0);
  }, [isFeatureEnabled]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const isActive = (href: string) => {
    const currentPath = pathname || '/admin';
    if (href === '/admin') {
      return currentPath === '/admin';
    }
    return currentPath.startsWith(href);
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => isActive(item.href)) || isActive(group.hubHref);
  };

  const getGroupBadge = (group: NavGroup): number => {
    return group.items.reduce((sum, item) => sum + getPendingCountForHref(item.href), 0);
  };

  const sidebarContent = (
    <>
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

      <nav className="flex-1 p-4 space-y-2 overflow-auto">
        <Link
          href="/admin"
          onClick={() => setIsMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
            isActive('/admin') && pathname === '/admin'
              ? 'bg-[#1E3A5F] text-white'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <LayoutDashboard size={20} />
          <div className="text-right">
            <span className="block text-sm font-medium">لوحة التحكم</span>
            <span className="text-xs opacity-70">Dashboard</span>
          </div>
        </Link>

        <div className="pt-2 space-y-1">
          {filteredGroups.map((group) => {
            const Icon = group.icon;
            const isExpanded = expandedGroups.includes(group.id);
            const groupActive = isGroupActive(group);
            const badge = getGroupBadge(group);

            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all',
                    groupActive
                      ? 'bg-gray-100 text-[#1E3A5F]'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} />
                    <div className="text-right">
                      <span className="block text-sm font-medium">{group.label}</span>
                      <span className="text-xs opacity-70">{group.labelEn}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {badge}
                      </span>
                    )}
                    <ChevronDown
                      size={16}
                      className={cn('transition-transform', isExpanded && 'rotate-180')}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-1 mr-4 space-y-1 border-r-2 border-gray-200 pr-2">
                    <Link
                      href={group.hubHref}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                        isActive(group.hubHref)
                          ? 'bg-blue-50 text-[#1E3A5F] font-medium'
                          : 'text-gray-500 hover:bg-gray-50'
                      )}
                    >
                      <Folder size={16} />
                      <span>نظرة عامة</span>
                    </Link>

                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const itemBadge = getPendingCountForHref(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                            isActive(item.href)
                              ? 'bg-blue-50 text-[#1E3A5F] font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          <ItemIcon size={16} />
                          <span className="flex-1">{item.label}</span>
                          {itemBadge > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {itemBadge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t mt-4">
          <Link
            href="/admin/archive"
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
              isActive('/admin/archive')
                ? 'bg-amber-50 text-amber-700'
                : 'text-gray-500 hover:bg-gray-50'
            )}
          >
            <Archive size={20} />
            <div className="text-right">
              <span className="block text-sm">الأرشيف</span>
              <span className="text-xs opacity-70">Archive</span>
            </div>
          </Link>
        </div>
      </nav>

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
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-40 p-3 bg-[#1E3A5F] text-white rounded-lg shadow-lg"
      >
        <Menu size={24} />
      </button>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'lg:hidden fixed top-0 right-0 bottom-0 w-72 bg-white z-50 transform transition-transform duration-300 flex flex-col',
          isMobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:top-0 lg:right-0 lg:bottom-0 bg-white border-l shadow-sm z-30">
        {sidebarContent}
      </aside>
    </>
  );
}
