'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Database,
  HardDrive,
  Camera,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Archive,
  Wrench,
  Shield,
  UploadCloud,
} from 'lucide-react';

interface DataStats {
  databaseSize: string;
  lastBackup: string | null;
  totalBackups: number;
  dataValidations: number;
  totalMembers: number;
  pendingSync: number;
}

interface BackupItem {
  id: string;
  name: string;
  createdAt: string;
  size: string;
}

export default function DataHubPage() {
  const { session } = useAuth();
  const [stats, setStats] = useState<DataStats>({
    databaseSize: '-- MB',
    lastBackup: null,
    totalBackups: 0,
    dataValidations: 0,
    totalMembers: 0,
    pendingSync: 0,
  });
  const [recentBackups, setRecentBackups] = useState<BackupItem[]>([]);
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
      const [statsRes, snapshotsRes, validationRes] = await Promise.all([
        fetch('/api/statistics', { headers }),
        fetch('/api/admin/snapshots', { headers }),
        fetch('/api/admin/data-validation', { headers }).catch(() => ({ json: () => ({ issues: [] }) })),
      ]);

      const statsData = await statsRes.json().catch(() => ({}));
      const snapshotsData = await snapshotsRes.json().catch(() => ({ snapshots: [] }));
      const validationData = await validationRes.json().catch(() => ({ issues: [] }));

      const lastBackup = snapshotsData.snapshots?.[0]?.createdAt || null;

      setStats({
        databaseSize: '2.5 MB',
        lastBackup,
        totalBackups: snapshotsData.snapshots?.length || 0,
        dataValidations: validationData.issues?.length || 0,
        totalMembers: statsData.totalMembers || 0,
        pendingSync: 0,
      });

      setRecentBackups(snapshotsData.snapshots?.slice(0, 5).map((s: { id: string; name: string; createdAt: string }) => ({
        id: s.id,
        name: s.name || 'نسخة احتياطية',
        createdAt: s.createdAt,
        size: '~2 MB',
      })) || []);
    } catch (error) {
      console.error('Error loading data hub:', error);
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

  const quickLinks = [
    { href: '/admin/database', label: 'إدارة قاعدة البيانات', labelEn: 'Database Management', icon: Database, color: 'bg-blue-500' },
    { href: '/admin/database/excel', label: 'تصدير Excel', labelEn: 'Excel Export', icon: FileSpreadsheet, color: 'bg-green-500' },
    { href: '/admin/database/snapshots', label: 'النسخ الاحتياطية', labelEn: 'Snapshots', icon: Archive, color: 'bg-purple-500', count: stats.totalBackups },
    { href: '/admin/tools', label: 'أدوات البيانات', labelEn: 'Data Tools', icon: Wrench, color: 'bg-orange-500' },
    { href: '/admin/data-validation', label: 'التحقق من البيانات', labelEn: 'Data Validation', icon: Shield, color: 'bg-red-500', count: stats.dataValidations },
    { href: '/admin/sync-data', label: 'مزامنة البيانات', labelEn: 'Sync Data', icon: UploadCloud, color: 'bg-cyan-500' },
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
      <div className="bg-gradient-to-l from-green-600 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-green-200 hover:text-white mb-4 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة التحكم</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">البيانات والنسخ الاحتياطي</h1>
              <p className="text-green-200 mt-1">Data Hub - إدارة قاعدة البيانات والنسخ الاحتياطية</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">حجم قاعدة البيانات</p>
                <p className="text-3xl font-bold text-gray-800">{stats.databaseSize}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">آخر نسخة</p>
                <p className="text-lg font-bold text-gray-800">
                  {stats.lastBackup ? formatTimeAgo(stats.lastBackup) : 'لا يوجد'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">إجمالي النسخ</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalBackups}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Archive className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">مشاكل البيانات</p>
                <p className="text-3xl font-bold text-gray-800">{stats.dataValidations}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">روابط سريعة</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all group"
                    >
                      <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center text-white relative`}>
                        <Icon className="w-6 h-6" />
                        {link.count !== undefined && link.count > 0 && (
                          <span className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                            {link.count}
                          </span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-800 group-hover:text-green-600">{link.label}</p>
                        <p className="text-xs text-gray-500">{link.labelEn}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">النسخ الاحتياطية</h2>
              <Link href="/admin/database/snapshots" className="text-sm text-green-600 hover:underline">
                عرض الكل
              </Link>
            </div>
            <div className="space-y-3">
              {recentBackups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                  <p>لا توجد نسخ احتياطية</p>
                  <Link href="/admin/tools" className="text-sm text-green-600 hover:underline mt-2 inline-block">
                    إنشاء نسخة الآن
                  </Link>
                </div>
              ) : (
                recentBackups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Archive className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{backup.name}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(backup.createdAt)} • {backup.size}</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
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
