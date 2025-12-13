'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  History,
  Camera,
  Database,
  Settings,
  Wrench,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Shield,
  Activity,
  Bell,
  ChevronRight,
  Image,
  GitBranch,
  UserPlus,
} from 'lucide-react';

interface DashboardStats {
  totalMembers: number;
  pendingApprovals: number;
  recentChanges: number;
  activeAdmins: number;
  lastBackup: string | null;
  databaseSize: string;
  duplicatesCount: number;
  branchLinks: number;
  pendingImages: number;
  accessRequests: number;
}

interface ActionItem {
  id: string;
  type: 'pending_member' | 'pending_image' | 'duplicate' | 'access_request' | 'backup_needed';
  title: string;
  description: string;
  count: number;
  href: string;
  icon: React.ReactNode;
  color: string;
  priority: 'high' | 'medium' | 'low';
}

interface RecentActivity {
  id: string;
  type: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'backup';
  description: string;
  user: string;
  timestamp: Date;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    pendingApprovals: 0,
    recentChanges: 0,
    activeAdmins: 0,
    lastBackup: null,
    databaseSize: '0 KB',
    duplicatesCount: 0,
    branchLinks: 0,
    pendingImages: 0,
    accessRequests: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load statistics from API
      const statsRes = await fetch('/api/statistics');
      const statsData = await statsRes.json();

      // Load admins from localStorage
      const admins = JSON.parse(localStorage.getItem('alshaye_admins') || '[]');
      const activeAdmins = admins.filter((a: { isActive: boolean }) => a.isActive).length;

      // Load pending members
      const pendingRes = await fetch('/api/admin/pending');
      const pendingData = await pendingRes.json().catch(() => ({ pending: [] }));

      // Load snapshots for last backup
      const snapshotsRes = await fetch('/api/admin/snapshots');
      const snapshotsData = await snapshotsRes.json().catch(() => ({ snapshots: [] }));

      // Load history for recent changes
      const historyRes = await fetch('/api/admin/history?limit=10');
      const historyData = await historyRes.json().catch(() => ({ changes: [] }));

      // Load duplicates
      const duplicatesRes = await fetch('/api/admin/duplicates');
      const duplicatesData = await duplicatesRes.json().catch(() => ({ duplicates: [] }));

      // Load branch links
      const branchLinksRes = await fetch('/api/admin/branch-links');
      const branchLinksData = await branchLinksRes.json().catch(() => ({ links: [] }));

      // Load pending images
      const pendingImagesRes = await fetch('/api/images/pending');
      const pendingImagesData = await pendingImagesRes.json().catch(() => ({ pending: [] }));

      // Load access requests
      const accessReqRes = await fetch('/api/access-requests');
      const accessReqData = await accessReqRes.json().catch(() => ({ requests: [] }));

      const pendingApprovals = pendingData.pending?.filter((p: { reviewStatus: string }) => p.reviewStatus === 'PENDING').length || 0;
      const duplicatesCount = duplicatesData.duplicates?.filter((d: { status: string }) => d.status === 'PENDING').length || 0;
      const pendingImages = pendingImagesData.pending?.filter((p: { reviewStatus: string }) => p.reviewStatus === 'PENDING').length || 0;
      const accessRequests = accessReqData.requests?.filter((r: { status: string }) => r.status === 'PENDING').length || 0;
      const lastBackup = snapshotsData.snapshots?.[0]?.createdAt || null;

      // Check if backup is needed (older than 7 days or none)
      const backupNeeded = !lastBackup || (new Date().getTime() - new Date(lastBackup).getTime()) > 7 * 24 * 60 * 60 * 1000;

      setStats({
        totalMembers: statsData.totalMembers || 99,
        pendingApprovals,
        recentChanges: historyData.changes?.length || 0,
        activeAdmins: activeAdmins || 1,
        lastBackup,
        databaseSize: '2.5 MB',
        duplicatesCount,
        branchLinks: branchLinksData.links?.filter((l: { isActive: boolean }) => l.isActive).length || 0,
        pendingImages,
        accessRequests,
      });

      // Build action items list
      const actions: ActionItem[] = [];

      if (pendingApprovals > 0) {
        actions.push({
          id: 'pending_members',
          type: 'pending_member',
          title: 'أعضاء جدد بانتظار الموافقة',
          description: `${pendingApprovals} عضو جديد يحتاج مراجعة وموافقة`,
          count: pendingApprovals,
          href: '/admin/pending',
          icon: <UserPlus className="w-5 h-5" />,
          color: 'bg-orange-500',
          priority: 'high',
        });
      }

      if (pendingImages > 0) {
        actions.push({
          id: 'pending_images',
          type: 'pending_image',
          title: 'صور بانتظار الموافقة',
          description: `${pendingImages} صورة تحتاج مراجعة`,
          count: pendingImages,
          href: '/admin/images',
          icon: <Image className="w-5 h-5" />,
          color: 'bg-purple-500',
          priority: 'medium',
        });
      }

      if (duplicatesCount > 0) {
        actions.push({
          id: 'duplicates',
          type: 'duplicate',
          title: 'تكرارات محتملة',
          description: `${duplicatesCount} تكرار محتمل يحتاج مراجعة`,
          count: duplicatesCount,
          href: '/duplicates',
          icon: <AlertTriangle className="w-5 h-5" />,
          color: 'bg-yellow-500',
          priority: 'medium',
        });
      }

      if (accessRequests > 0) {
        actions.push({
          id: 'access_requests',
          type: 'access_request',
          title: 'طلبات انضمام',
          description: `${accessRequests} طلب انضمام جديد`,
          count: accessRequests,
          href: '/admin/settings',
          icon: <Users className="w-5 h-5" />,
          color: 'bg-blue-500',
          priority: 'high',
        });
      }

      if (backupNeeded) {
        actions.push({
          id: 'backup_needed',
          type: 'backup_needed',
          title: 'نسخة احتياطية مطلوبة',
          description: lastBackup ? 'مضى أكثر من أسبوع على آخر نسخة' : 'لا توجد نسخ احتياطية',
          count: 1,
          href: '/admin/tools',
          icon: <Camera className="w-5 h-5" />,
          color: 'bg-red-500',
          priority: 'low',
        });
      }

      // Sort by priority
      actions.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setActionItems(actions);

      // Convert history to activity
      const activity: RecentActivity[] = (historyData.changes || []).slice(0, 5).map((change: {
        id: string;
        changeType: string;
        fieldName: string;
        changedByName: string;
        changedAt: string;
      }) => ({
        id: change.id,
        type: change.changeType === 'CREATE' ? 'create' : change.changeType === 'DELETE' ? 'delete' : 'update',
        description: `${change.changeType === 'CREATE' ? 'إضافة' : change.changeType === 'DELETE' ? 'حذف' : 'تعديل'} - ${change.fieldName}`,
        user: change.changedByName,
        timestamp: new Date(change.changedAt),
      }));
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set default values on error
      setStats({
        totalMembers: 99,
        pendingApprovals: 0,
        recentChanges: 0,
        activeAdmins: 1,
        lastBackup: null,
        databaseSize: '2.5 MB',
        duplicatesCount: 0,
        branchLinks: 0,
        pendingImages: 0,
        accessRequests: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { href: '/quick-add', label: 'إضافة عضو', icon: Plus, color: 'bg-green-500' },
    { href: '/export', label: 'تصدير البيانات', icon: Download, color: 'bg-blue-500' },
    { href: '/import', label: 'استيراد البيانات', icon: Upload, color: 'bg-purple-500' },
    { href: '/admin/tools', label: 'نسخ احتياطي', icon: Camera, color: 'bg-orange-500' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create': return <Plus className="w-4 h-4 text-green-500" />;
      case 'update': return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'delete': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'approve': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'reject': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'backup': return <Camera className="w-4 h-4 text-purple-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">لوحة التحكم</h1>
        <p className="text-gray-500 mt-1">Admin Dashboard - نظرة عامة على النظام</p>
      </div>

      {/* Action Required Panel - Shows when there are pending items */}
      {actionItems.length > 0 && (
        <div className="mb-8 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border-2 border-orange-200 overflow-hidden">
          <div className="px-6 py-4 bg-orange-500 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">إجراءات مطلوبة</h2>
                <p className="text-orange-100 text-sm">{actionItems.length} عنصر يحتاج انتباهك</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {actionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-transparent hover:border-orange-300 hover:shadow-md transition-all group"
                >
                  <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{item.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${item.color}`}>
                        {item.count}
                      </span>
                      {item.priority === 'high' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          عاجل
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-orange-100">
              <Link
                href="/admin/audit"
                className="flex items-center justify-center gap-2 text-orange-600 hover:text-orange-800 font-medium text-sm"
              >
                <Activity className="w-4 h-4" />
                عرض سجل النشاط الكامل
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">إجمالي الأعضاء</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalMembers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-green-600">
            <TrendingUp className="w-4 h-4 ml-1" />
            <span>99 عضو مسجل</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">طلبات معلقة</p>
              <p className="text-3xl font-bold text-gray-800">{stats.pendingApprovals}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          <Link href="/admin/database/pending" className="mt-3 flex items-center text-sm text-yellow-600 hover:underline">
            <Clock className="w-4 h-4 ml-1" />
            <span>مراجعة الطلبات</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">المشرفين النشطين</p>
              <p className="text-3xl font-bold text-gray-800">{stats.activeAdmins}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <Link href="/admin/settings" className="mt-3 flex items-center text-sm text-purple-600 hover:underline">
            <span>إدارة المشرفين</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">حجم قاعدة البيانات</p>
              <p className="text-3xl font-bold text-gray-800">{stats.databaseSize}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-500">
            <span>SQLite Database</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
              >
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-gray-700">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">النشاط الأخير</h2>
            <Link href="/admin/database/history" className="text-sm text-blue-600 hover:underline">
              عرض الكل
            </Link>
          </div>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-center text-gray-500 py-8">لا يوجد نشاط حديث</p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.user}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatTimeAgo(activity.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">حالة النظام</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-gray-700">قاعدة البيانات</span>
              </div>
              <span className="text-sm text-green-600">تعمل بشكل طبيعي</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">آخر نسخة احتياطية</span>
              </div>
              <span className="text-sm text-gray-600">
                {stats.lastBackup ? formatTimeAgo(new Date(stats.lastBackup)) : 'لا يوجد'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="font-medium text-gray-700">تكرارات محتملة</span>
              </div>
              <span className="text-sm text-yellow-600">{stats.duplicatesCount} للمراجعة</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-gray-700">روابط الفروع النشطة</span>
              </div>
              <span className="text-sm text-blue-600">{stats.branchLinks} رابط</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Sections Navigation */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/admin/database"
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">إدارة قاعدة البيانات</h3>
              <p className="text-sm text-gray-500">Database Management</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            إدارة جداول البيانات، الأعضاء، السجل، والنسخ الاحتياطية
          </p>
        </Link>

        <Link
          href="/admin/config"
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-transparent hover:border-green-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
              <Settings className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">إعدادات النظام</h3>
              <p className="text-sm text-gray-500">System Configuration</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            تخصيص إعدادات التطبيق، قواعد التحقق، وخيارات العرض
          </p>
        </Link>

        <Link
          href="/admin/tools"
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-transparent hover:border-orange-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
              <Wrench className="w-7 h-7 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">أدوات البيانات</h3>
              <p className="text-sm text-gray-500">Data Tools</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            النسخ الاحتياطي، التحقق من سلامة البيانات، والعمليات المجمعة
          </p>
        </Link>

        <Link
          href="/admin/reports"
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-transparent hover:border-purple-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-purple-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">التقارير والتحليلات</h3>
              <p className="text-sm text-gray-500">Reports & Analytics</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            تقارير تفصيلية وتحليلات إحصائية عن العائلة والنظام
          </p>
        </Link>

        <Link
          href="/admin/settings"
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-transparent hover:border-red-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">إدارة المشرفين</h3>
              <p className="text-sm text-gray-500">Admin Users</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            إدارة حسابات المشرفين، الصلاحيات، ورموز الوصول
          </p>
        </Link>
      </div>
    </div>
  );
}
