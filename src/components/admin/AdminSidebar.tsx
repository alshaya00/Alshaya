'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarItem,
  SidebarFooter,
  SidebarToggle,
  useSidebar,
} from '@/components/layout';
import { Badge } from '@/components/ui';
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
  Folder,
  FolderOpen,
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
      { href: '/admin/data-repair-center', label: 'مركز إصلاح البيانات', labelEn: 'Repair Center', icon: Wrench },
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

function AdminSidebarInner() {
  const pathname = usePathname();
  const { isFeatureEnabled } = useFeatureFlags();
  const { session } = useAuth();
  const { collapsed } = useSidebar();
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
    <Sidebar position="end" className="border-s border-e-0">
      <SidebarHeader className="bg-primary text-primary-foreground">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-bold text-sm truncate">لوحة الإدارة</h2>
              <p className="text-xs opacity-70">Admin Panel</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <SidebarToggle className="text-primary-foreground hover:bg-white/10" />
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-md"
          >
            <X size={18} />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard link */}
        <SidebarGroup>
          <Link href="/admin" onClick={() => setIsMobileOpen(false)}>
            <SidebarItem
              icon={<LayoutDashboard size={18} />}
              active={isActive('/admin') && pathname === '/admin'}
            >
              <div>
                <span className="block text-sm">لوحة التحكم</span>
                {!collapsed && <span className="text-xs text-muted-foreground">Dashboard</span>}
              </div>
            </SidebarItem>
          </Link>
        </SidebarGroup>

        {/* Nav Groups */}
        {filteredGroups.map((group) => {
          const GroupIcon = group.icon;
          const isExpanded = expandedGroups.includes(group.id);
          const groupActive = isGroupActive(group);
          const badge = getGroupBadge(group);

          return (
            <SidebarGroup key={group.id} label={collapsed ? undefined : undefined}>
              {/* Group header as collapsible toggle */}
              <div
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-pointer transition-colors',
                  groupActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <span className="shrink-0"><GroupIcon size={18} /></span>
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm truncate">{group.label}</span>
                      <span className="text-xs opacity-60">{group.labelEn}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {badge > 0 && (
                        <Badge variant="destructive" size="sm">{badge}</Badge>
                      )}
                      <ChevronDown
                        size={14}
                        className={cn('transition-transform', isExpanded && 'rotate-180')}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Expanded items */}
              {isExpanded && !collapsed && (
                <div className="mt-1 ms-4 border-s-2 border-border ps-1 space-y-0.5">
                  <Link href={group.hubHref} onClick={() => setIsMobileOpen(false)}>
                    <SidebarItem
                      icon={<Folder size={15} />}
                      active={isActive(group.hubHref)}
                      className="text-xs py-1.5"
                    >
                      نظرة عامة
                    </SidebarItem>
                  </Link>
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const itemBadge = getPendingCountForHref(item.href);
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                        <SidebarItem
                          icon={<ItemIcon size={15} />}
                          active={isActive(item.href)}
                          badge={itemBadge > 0 ? itemBadge : undefined}
                          className="text-xs py-1.5"
                        >
                          {item.label}
                        </SidebarItem>
                      </Link>
                    );
                  })}
                </div>
              )}
            </SidebarGroup>
          );
        })}

        {/* Archive */}
        <SidebarGroup>
          <Link href="/admin/archive" onClick={() => setIsMobileOpen(false)}>
            <SidebarItem
              icon={<Archive size={18} />}
              active={isActive('/admin/archive')}
            >
              <div>
                <span className="block text-sm">الأرشيف</span>
                {!collapsed && <span className="text-xs text-muted-foreground">Archive</span>}
              </div>
            </SidebarItem>
          </Link>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Link href="/">
          <SidebarItem icon={<Home size={18} />}>
            <div>
              <span className="block text-sm">العودة للموقع</span>
              {!collapsed && <span className="text-xs text-muted-foreground">Back to Site</span>}
            </div>
          </SidebarItem>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 end-4 z-40 p-3 bg-primary text-primary-foreground rounded-lg shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 end-0 bottom-0 z-50 transform transition-transform duration-300',
          isMobileOpen ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed top-0 end-0 bottom-0 z-30">
        {sidebarContent}
      </aside>
    </>
  );
}

export function AdminSidebar() {
  return (
    <SidebarProvider>
      <AdminSidebarInner />
    </SidebarProvider>
  );
}
