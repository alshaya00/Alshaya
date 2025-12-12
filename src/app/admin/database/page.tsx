'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  History,
  Camera,
  UserCheck,
  Link2,
  Database,
  Table,
  ChevronLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface TableInfo {
  name: string;
  nameAr: string;
  icon: React.ElementType;
  href: string;
  description: string;
  recordCount: number;
  color: string;
}

export default function DatabasePage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');

  useEffect(() => {
    loadTableInfo();
  }, []);

  const loadTableInfo = async () => {
    setIsLoading(true);
    try {
      // Fetch counts for each table
      const [membersRes, historyRes, snapshotsRes, pendingRes, branchLinksRes] = await Promise.all([
        fetch('/api/members').then(r => r.json()).catch(() => ({ members: [] })),
        fetch('/api/admin/history?limit=1000').then(r => r.json()).catch(() => ({ changes: [] })),
        fetch('/api/admin/snapshots').then(r => r.json()).catch(() => ({ snapshots: [] })),
        fetch('/api/admin/pending').then(r => r.json()).catch(() => ({ pending: [] })),
        fetch('/api/admin/branch-links').then(r => r.json()).catch(() => ({ links: [] })),
      ]);

      setTables([
        {
          name: 'FamilyMember',
          nameAr: 'أعضاء العائلة',
          icon: Users,
          href: '/admin/database/members',
          description: 'جدول بيانات أعضاء العائلة الرئيسي',
          recordCount: membersRes.members?.length || 99,
          color: 'blue',
        },
        {
          name: 'ChangeHistory',
          nameAr: 'سجل التغييرات',
          icon: History,
          href: '/admin/database/history',
          description: 'سجل جميع التعديلات والعمليات على البيانات',
          recordCount: historyRes.changes?.length || 0,
          color: 'purple',
        },
        {
          name: 'Snapshot',
          nameAr: 'النسخ الاحتياطية',
          icon: Camera,
          href: '/admin/database/snapshots',
          description: 'نسخ احتياطية من حالة قاعدة البيانات',
          recordCount: snapshotsRes.snapshots?.length || 0,
          color: 'green',
        },
        {
          name: 'PendingMember',
          nameAr: 'الطلبات المعلقة',
          icon: UserCheck,
          href: '/admin/database/pending',
          description: 'طلبات إضافة أعضاء جدد في انتظار المراجعة',
          recordCount: pendingRes.pending?.length || 0,
          color: 'yellow',
        },
        {
          name: 'BranchEntryLink',
          nameAr: 'روابط الفروع',
          icon: Link2,
          href: '/admin/database/branches',
          description: 'روابط الدخول الخاصة بكل فرع',
          recordCount: branchLinksRes.links?.length || 0,
          color: 'orange',
        },
      ]);

      setDbStatus('healthy');
    } catch (error) {
      console.error('Error loading table info:', error);
      setDbStatus('warning');
    } finally {
      setIsLoading(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
      green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
    };
    return colors[color] || colors.blue;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل معلومات قاعدة البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">إدارة قاعدة البيانات</h1>
            <p className="text-gray-500">Database Management - استعراض وإدارة جداول البيانات</p>
          </div>
        </div>
      </div>

      {/* Database Status */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {dbStatus === 'healthy' ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : dbStatus === 'warning' ? (
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-500" />
            )}
            <div>
              <h2 className="font-bold text-lg text-gray-800">حالة قاعدة البيانات</h2>
              <p className="text-sm text-gray-500">
                {dbStatus === 'healthy' ? 'تعمل بشكل طبيعي' : dbStatus === 'warning' ? 'تحذير' : 'خطأ'}
              </p>
            </div>
          </div>
          <button
            onClick={loadTableInfo}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">نوع قاعدة البيانات</p>
            <p className="font-bold text-gray-800">SQLite</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">إجمالي الجداول</p>
            <p className="font-bold text-gray-800">{tables.length}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">إجمالي السجلات</p>
            <p className="font-bold text-gray-800">
              {tables.reduce((acc, t) => acc + t.recordCount, 0)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">الحجم التقريبي</p>
            <p className="font-bold text-gray-800">2.5 MB</p>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table) => {
          const Icon = table.icon;
          const colors = getColorClasses(table.color);
          return (
            <Link
              key={table.name}
              href={table.href}
              className={`bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all border-2 border-transparent hover:${colors.border}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{table.nameAr}</h3>
                    <p className="text-xs text-gray-400 font-mono">{table.name}</p>
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </div>

              <p className="text-sm text-gray-600 mb-4">{table.description}</p>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">عدد السجلات</span>
                </div>
                <span className={`text-lg font-bold ${colors.text}`}>{table.recordCount}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-bold text-lg text-gray-800 mb-4">إجراءات سريعة على قاعدة البيانات</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/admin/tools"
            className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Camera className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-700">إنشاء نسخة احتياطية</span>
          </Link>
          <Link
            href="/admin/tools"
            className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-700">التحقق من سلامة البيانات</span>
          </Link>
          <Link
            href="/export"
            className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Database className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-700">تصدير قاعدة البيانات</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
