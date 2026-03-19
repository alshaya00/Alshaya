'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui';
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
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Download,
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
  priority: 'high' | 'medium' | 'low';
  badgeVariant: 'destructive' | 'warning' | 'info' | 'default';
}

interface RecentActivity {
  id: string;
  type: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'backup';
  description: string;
  user: string;
  timestamp: Date;
}

export default function AdminDashboardPage() {
  const { session } = useAuth();
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
    if (session?.token) {
      loadDashboardData();
    }
  }, [session?.token]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    const headers: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}` } : {};
    try {
      const statsRes = await fetch('/api/statistics', { headers });
      const statsData = await statsRes.json();

      const usersRes = await fetch('/api/users', { headers });
      const usersData = await usersRes.json().catch(() => ({ users: [] }));
      const activeAdmins = usersData.users?.filter((u: { role: string; isActive?: boolean }) =>
        (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') && u.isActive !== false
      ).length || 1;

      const pendingRes = await fetch('/api/admin/pending', { headers });
      const pendingData = await pendingRes.json().catch(() => ({ pending: [] }));

      const snapshotsRes = await fetch('/api/admin/snapshots', { headers });
      const snapshotsData = await snapshotsRes.json().catch(() => ({ snapshots: [] }));

      const historyRes = await fetch('/api/admin/history?limit=10', { headers });
      const historyData = await historyRes.json().catch(() => ({ changes: [] }));

      const duplicatesRes = await fetch('/api/admin/duplicates', { headers });
      const duplicatesData = await duplicatesRes.json().catch(() => ({ duplicates: [] }));

      const branchLinksRes = await fetch('/api/admin/branch-links', { headers });
      const branchLinksData = await branchLinksRes.json().catch(() => ({ links: [] }));

      const pendingImagesRes = await fetch('/api/images/pending', { headers });
      const pendingImagesData = await pendingImagesRes.json().catch(() => ({ pending: [] }));

      const accessReqRes = await fetch('/api/access-requests', { headers });
      const accessReqData = await accessReqRes.json().catch(() => ({ requests: [] }));

      const nameIssuesRes = await fetch('/api/admin/fix-lineage', { headers });
      const nameIssuesData = await nameIssuesRes.json().catch(() => ({ issuesCount: 0 }));
      const nameIssuesCount = nameIssuesData.issuesCount || 0;

      const pendingApprovals = pendingData.pending?.filter((p: { reviewStatus: string }) => p.reviewStatus === 'PENDING').length || 0;
      const duplicatesCount = duplicatesData.duplicates?.filter((d: { status: string }) => d.status === 'PENDING').length || 0;
      const pendingImages = pendingImagesData.pending?.filter((p: { reviewStatus: string }) => p.reviewStatus === 'PENDING').length || 0;
      const accessRequests = accessReqData.requests?.filter((r: { status: string }) => r.status === 'PENDING').length || 0;
      const lastBackup = snapshotsData.snapshots?.[0]?.createdAt || null;

      const backupNeeded = !lastBackup || (new Date().getTime() - new Date(lastBackup).getTime()) > 7 * 24 * 60 * 60 * 1000;

      setStats({
        totalMembers: statsData.totalMembers || 0,
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
          priority: 'high',
          badgeVariant: 'warning',
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
          priority: 'medium',
          badgeVariant: 'info',
        });
      }

      if (duplicatesCount > 0) {
        actions.push({
          id: 'duplicates',
          type: 'duplicate',
          title: 'تكرارات محتملة',
          description: `${duplicatesCount} تكرار محتمل يحتاج مراجعة`,
          count: duplicatesCount,
          href: '/admin/merge',
          icon: <AlertTriangle className="w-5 h-5" />,
          priority: 'medium',
          badgeVariant: 'warning',
        });
      }

      if (accessRequests > 0) {
        actions.push({
          id: 'access_requests',
          type: 'access_request',
          title: 'طلبات انضمام',
          description: `${accessRequests} طلب انضمام جديد`,
          count: accessRequests,
          href: '/admin/access-requests',
          icon: <UserPlus className="w-5 h-5" />,
          priority: 'high',
          badgeVariant: 'info',
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
          priority: 'low',
          badgeVariant: 'destructive',
        });
      }

      if (nameIssuesCount > 0) {
        actions.push({
          id: 'name_issues',
          type: 'pending_member',
          title: 'أعضاء يحتاجون إصلاح الأسماء',
          description: `${nameIssuesCount} عضو لديهم مشاكل في سلسلة النسب أو الأسماء`,
          count: nameIssuesCount,
          href: '/admin/fix-names',
          icon: <Wrench className="w-5 h-5" />,
          priority: 'medium',
          badgeVariant: 'warning',
        });
      }

      actions.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setActionItems(actions);

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
      setStats({
        totalMembers: 0,
        pendingApprovals: 0,
        recentChanges: 0,
        activeAdmins: 1,
        lastBackup: null,
        databaseSize: '-- MB',
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
    { href: '/quick-add', label: 'إضافة عضو', icon: Plus, variant: 'success' as const },
    { href: '/admin/merge', label: 'دمج التكرارات', icon: GitBranch, variant: 'outline' as const },
    { href: '/export', label: 'تصدير البيانات', icon: Download, variant: 'outline' as const },
    { href: '/admin/tools', label: 'نسخ احتياطي', icon: Camera, variant: 'outline' as const },
  ];

  const getActivityBadgeVariant = (type: string) => {
    switch (type) {
      case 'create': return 'success' as const;
      case 'update': return 'info' as const;
      case 'delete': return 'destructive' as const;
      case 'approve': return 'success' as const;
      case 'reject': return 'destructive' as const;
      case 'backup': return 'secondary' as const;
      default: return 'default' as const;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'create': return 'إضافة';
      case 'update': return 'تعديل';
      case 'delete': return 'حذف';
      case 'approve': return 'موافقة';
      case 'reject': return 'رفض';
      case 'backup': return 'نسخ';
      default: return 'نشاط';
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
        <Spinner size="lg" label="جاري تحميل لوحة التحكم..." />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-1">Admin Dashboard - نظرة عامة على النظام</p>
      </div>

      {/* Action Required Panel */}
      {actionItems.length > 0 && (
        <Alert variant="warning" dismissible={false}>
          <AlertTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5" />
            إجراءات مطلوبة
            <Badge variant="warning" size="sm">{actionItems.length}</Badge>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-3 space-y-2">
              {actionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-4 p-3 bg-card rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{item.title}</span>
                      <Badge variant={item.badgeVariant} size="sm">{item.count}</Badge>
                      {item.priority === 'high' && (
                        <Badge variant="destructive" size="sm">عاجل</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-[-4px] rtl:group-hover:translate-x-[4px] transition-all shrink-0" />
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <Link href="/admin/audit">
                <Button variant="ghost" size="sm" leftIcon={<Activity className="w-4 h-4" />}>
                  عرض سجل النشاط الكامل
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأعضاء</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalMembers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <Badge variant="success" size="sm">
                <TrendingUp className="w-3 h-3 me-1" />
                {stats.totalMembers} مسجل
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">طلبات معلقة</p>
                <p className="text-3xl font-bold text-foreground">{stats.pendingApprovals}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <Link href="/admin/database/pending" className="mt-3 flex items-center">
              <Badge variant="warning" size="sm">
                <Clock className="w-3 h-3 me-1" />
                مراجعة الطلبات
              </Badge>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المشرفين النشطين</p>
                <p className="text-3xl font-bold text-foreground">{stats.activeAdmins}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <Link href="/admin/settings" className="mt-3 flex items-center">
              <Badge variant="info" size="sm">إدارة المشرفين</Badge>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">حجم قاعدة البيانات</p>
                <p className="text-3xl font-bold text-foreground">{stats.databaseSize}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-3">
              <Badge variant="secondary" size="sm">PostgreSQL Database</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
          <CardDescription>Quick Actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href}>
                  <Button
                    variant={action.variant}
                    fullWidth
                    size="lg"
                    leftIcon={<Icon className="w-5 h-5" />}
                    className="justify-start"
                  >
                    {action.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>النشاط الأخير</CardTitle>
              <Link href="/admin/database/history">
                <Button variant="ghost" size="sm">عرض الكل</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا يوجد نشاط حديث</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>الوقت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <Badge variant={getActivityBadgeVariant(activity.type)} size="sm">
                          {getActivityLabel(activity.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{activity.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{activity.user}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>حالة النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-foreground">قاعدة البيانات</span>
              </div>
              <Badge variant="success" size="sm">تعمل بشكل طبيعي</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-foreground">آخر نسخة احتياطية</span>
              </div>
              <Badge variant="secondary" size="sm">
                {stats.lastBackup ? formatTimeAgo(new Date(stats.lastBackup)) : 'لا يوجد'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-foreground">تكرارات محتملة</span>
              </div>
              <Badge variant="warning" size="sm">{stats.duplicatesCount} للمراجعة</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-foreground">روابط الفروع النشطة</span>
              </div>
              <Badge variant="info" size="sm">{stats.branchLinks} رابط</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Sections Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: '/admin/database', icon: Database, title: 'إدارة قاعدة البيانات', subtitle: 'Database Management', description: 'إدارة جداول البيانات، الأعضاء، السجل، والنسخ الاحتياطية', color: 'blue' },
          { href: '/admin/config', icon: Settings, title: 'إعدادات النظام', subtitle: 'System Configuration', description: 'تخصيص إعدادات التطبيق، قواعد التحقق، وخيارات العرض', color: 'green' },
          { href: '/admin/data-quality', icon: Database, title: 'جودة البيانات', subtitle: 'Data Quality', description: 'فحص وإصلاح الأسماء والمعرفات وسلاسل النسب', color: 'teal' },
          { href: '/admin/tools', icon: Wrench, title: 'أدوات البيانات', subtitle: 'Data Tools', description: 'النسخ الاحتياطي، التحقق من سلامة البيانات، والعمليات المجمعة', color: 'orange' },
          { href: '/admin/reports', icon: BarChart3, title: 'التقارير والتحليلات', subtitle: 'Reports & Analytics', description: 'تقارير تفصيلية وتحليلات إحصائية عن العائلة والنظام', color: 'purple' },
          { href: '/admin/settings', icon: Shield, title: 'إدارة المشرفين', subtitle: 'Admin Users', description: 'إدارة حسابات المشرفين، الصلاحيات، ورموز الوصول', color: 'red' },
        ].map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground">{section.title}</h3>
                      <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{section.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
