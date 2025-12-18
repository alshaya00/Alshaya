// Navigation Configuration for Al-Shaye Family Tree
// Centralized navigation items - edit here to update all menus

import {
  Home, Users, TreePine, PlusCircle, BarChart3, Search,
  GitBranch, Download, Upload, History, Settings, Edit, Copy, BookOpen
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { PermissionKey } from '@/lib/auth/types';

export interface NavItem {
  href: string;
  label: string;      // Arabic label
  labelEn: string;    // English label
  icon: LucideIcon;
  permission?: PermissionKey;
}

// Main navigation items (desktop header)
export const mainNavItems: NavItem[] = [
  { href: '/', label: 'الرئيسية', labelEn: 'Home', icon: Home },
  { href: '/tree', label: 'الشجرة', labelEn: 'Tree', icon: TreePine },
  { href: '/branches', label: 'الفروع', labelEn: 'Branches', icon: GitBranch },
  { href: '/journals', label: 'السجل التاريخي', labelEn: 'Journals', icon: BookOpen },
  { href: '/registry', label: 'الأعضاء', labelEn: 'Registry', icon: Users },
];

// Mobile bottom navigation items
export const mobileNavItems: NavItem[] = [
  { href: '/', label: 'الرئيسية', labelEn: 'Home', icon: Home },
  { href: '/tree', label: 'الشجرة', labelEn: 'Tree', icon: TreePine },
  { href: '/journals', label: 'السجل', labelEn: 'Journal', icon: BookOpen },
  { href: '/registry', label: 'الأعضاء', labelEn: 'Members', icon: Users },
  { href: '/dashboard', label: 'الإحصائيات', labelEn: 'Stats', icon: BarChart3 },
];

// "More" dropdown menu items
export const moreNavItems: NavItem[] = [
  { href: '/search', label: 'البحث', labelEn: 'Search', icon: Search },
  { href: '/quick-add', label: 'إضافة عضو', labelEn: 'Add Member', icon: PlusCircle },
  { href: '/dashboard', label: 'الإحصائيات', labelEn: 'Statistics', icon: BarChart3 },
  { href: '/branches', label: 'الفروع', labelEn: 'Branches', icon: GitBranch },
  { href: '/tree-editor', label: 'محرر الشجرة', labelEn: 'Tree Editor', icon: Edit, permission: 'edit_member' },
  { href: '/export', label: 'تصدير', labelEn: 'Export', icon: Download, permission: 'export_data' },
  { href: '/import', label: 'استيراد', labelEn: 'Import', icon: Upload, permission: 'import_data' },
  { href: '/duplicates', label: 'التكرارات', labelEn: 'Duplicates', icon: Copy, permission: 'edit_member' },
  { href: '/history', label: 'السجل', labelEn: 'History', icon: History, permission: 'view_change_history' },
  { href: '/admin', label: 'لوحة التحكم', labelEn: 'Admin Panel', icon: Settings },
];

// Pages that don't require authentication
export const publicPages: string[] = [
  '/login',
  '/register',
  '/invite',
  '/forgot-password',
  '/reset-password',
];

// Pages that should not show the navigation bar
export const noNavPages: string[] = [
  '/login',
  '/register',
  '/invite',
  '/forgot-password',
  '/reset-password',
  '/welcome',
];

// Routes configuration
export const routes = {
  home: '/',
  tree: '/tree',
  branches: '/branches',
  journals: '/journals',
  registry: '/registry',
  search: '/search',
  quickAdd: '/quick-add',
  dashboard: '/dashboard',
  treeEditor: '/tree-editor',
  export: '/export',
  import: '/import',
  duplicates: '/duplicates',
  history: '/history',
  admin: '/admin',
  login: '/login',
  register: '/register',
  invite: '/invite',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  profile: '/profile',
  welcome: '/welcome',
} as const;

export type RoutePath = (typeof routes)[keyof typeof routes];
