'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart3,
  FileText,
  History,
  Activity,
  ChevronRight,
  ArrowRight,
  Clock,
  TrendingUp,
  FileBarChart,
  ClipboardList,
  Eye,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';

interface ReportsStats {
  totalAuditLogs: number;
  recentChanges: number;
  reportsGenerated: number;
  todayActivity: number;
}

interface ActivityItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  description: string;
  user: string;
  timestamp: string;
}

export default function ReportsHubPage() {
  const { session } = useAuth();
  const [stats, setStats] = useState<ReportsStats>({
    totalAuditLogs: 0,
    recentChanges: 0,
    reportsGenerated: 0,
    todayActivity: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.token) {
      loadData();
    }
  }, [session?.token]);

  const loadData = async () => {
    setIsLoading(true);
    const headers: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}` } : {};
    
    try {
      const [auditRes, historyRes] = await Promise.all([
        fetch('/api/admin/audit', { headers }),
        fetch('/api/admin/history?limit=20', { headers }),
      ]);

      const auditData = await auditRes.json().catch(() => ({ logs: [], total: 0 }));
      const historyData = await historyRes.json().catch(() => ({ changes: [] }));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayActivity = historyData.changes?.filter((c: { changedAt: string }) => 
        new Date(c.changedAt) >= today
      ).length || 0;

      setStats({
        totalAuditLogs: auditData.total || auditData.logs?.length || 0,
        recentChanges: historyData.changes?.length || 0,
        reportsGenerated: 5,
        todayActivity,
      });

      const activity: ActivityItem[] = (historyData.changes || []).slice(0, 5).map((change: {
        id: string;
        changeType: string;
        fieldName: string;
        changedByName: string;
        changedAt: string;
      }) => ({
        id: change.id,
        type: change.changeType === 'CREATE' ? 'create' : change.changeType === 'DELETE' ? 'delete' : 'update',
        description: `${change.changeType === 'CREATE' ? 'إضافة' : change.changeType === 'DELETE' ? 'حذف' : 'تعديل'} - ${change.fieldName}`,
        user: change.changedByName || 'النظام',
        timestamp: change.changedAt,
      }));
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading reports hub data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create': return <Plus className="w-4 h-4 text-green-500" />;
      case 'update': return <Edit className="w-4 h-4 text-blue-500" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'create': return 'bg-green-100';
      case 'update': return 'bg-blue-100';
      case 'delete': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const quickLinks = [
    { href: '/admin/reports', label: 'التقارير', labelEn: 'Reports', icon: FileBarChart, color: 'bg-blue-500' },
    { href: '/admin/database/history', label: 'سجل التغييرات', labelEn: 'Change History', icon: History, color: 'bg-purple-500', count: stats.recentChanges },
    { href: '/admin/audit', label: 'سجل المراجعة', labelEn: 'Audit Log', icon: ClipboardList, color: 'bg-orange-500', count: stats.totalAuditLogs },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-indigo-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-indigo-200 hover:text-white mb-4 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة التحكم</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">التقارير والسجلات</h1>
              <p className="text-indigo-200 mt-1">Reports Hub - التقارير وسجلات النظام</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">سجلات المراجعة</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalAuditLogs}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">التغييرات الأخيرة</p>
                <p className="text-3xl font-bold text-gray-800">{stats.recentChanges}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <History className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">التقارير المتاحة</p>
                <p className="text-3xl font-bold text-gray-800">{stats.reportsGenerated}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileBarChart className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">نشاط اليوم</p>
                <p className="text-3xl font-bold text-gray-800">{stats.todayActivity}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">روابط سريعة</h2>
              <div className="grid grid-cols-3 gap-4">
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                    >
                      <div className={`w-14 h-14 ${link.color} rounded-xl flex items-center justify-center text-white relative`}>
                        <Icon className="w-7 h-7" />
                        {link.count !== undefined && link.count > 0 && (
                          <span className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                            {link.count > 99 ? '99+' : link.count}
                          </span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-gray-800 group-hover:text-indigo-600">{link.label}</p>
                        <p className="text-sm text-gray-500">{link.labelEn}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">التقارير المتاحة</h2>
              <div className="space-y-3">
                <Link href="/admin/reports" className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">تقرير إحصائيات العائلة</p>
                    <p className="text-sm text-gray-500">إحصائيات شاملة عن أفراد العائلة</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
                <Link href="/admin/reports" className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">تقرير النمو</p>
                    <p className="text-sm text-gray-500">تحليل نمو الشجرة عبر الزمن</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">النشاط الأخير</h2>
              <Link href="/admin/database/history" className="text-sm text-indigo-600 hover:underline">
                عرض الكل
              </Link>
            </div>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>لا يوجد نشاط حديث</p>
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-10 h-10 ${getActivityColor(activity.type)} rounded-full flex items-center justify-center`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.user}</p>
                    </div>
                    <span className="text-xs text-gray-400">{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
