'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  ChevronLeft,
  RefreshCw,
  Search,
  Filter,
  Download,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Eye,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { paginationSettings } from '@/config/constants';

type AuditAction =
  | 'MEMBER_CREATE'
  | 'MEMBER_UPDATE'
  | 'MEMBER_DELETE'
  | 'MEMBER_VIEW'
  | 'PARENT_CHANGE'
  | 'BACKUP_CREATE'
  | 'BACKUP_RESTORE'
  | 'BACKUP_DELETE'
  | 'BACKUP_DOWNLOAD'
  | 'CONFIG_UPDATE'
  | 'ADMIN_CREATE'
  | 'ADMIN_UPDATE'
  | 'ADMIN_DELETE'
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'EXPORT_DATA'
  | 'IMPORT_DATA'
  | 'BRANCH_LINK_CREATE'
  | 'BRANCH_LINK_UPDATE'
  | 'BRANCH_LINK_DELETE'
  | 'PENDING_APPROVE'
  | 'PENDING_REJECT'
  | 'DUPLICATE_RESOLVE'
  | 'SYSTEM_CLEANUP'
  | 'INTEGRITY_CHECK';

type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  severity: AuditSeverity;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  description: string;
  details: Record<string, unknown> | null;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  success: boolean;
  errorMessage: string | null;
}

const ACTION_LABELS: Record<AuditAction, { label: string; icon: React.ReactNode; color: string }> = {
  MEMBER_CREATE: { label: 'إنشاء عضو', icon: null, color: 'bg-green-100 text-green-700' },
  MEMBER_UPDATE: { label: 'تعديل عضو', icon: null, color: 'bg-blue-100 text-blue-700' },
  MEMBER_DELETE: { label: 'حذف عضو', icon: null, color: 'bg-red-100 text-red-700' },
  MEMBER_VIEW: { label: 'عرض عضو', icon: null, color: 'bg-gray-100 text-gray-700' },
  PARENT_CHANGE: { label: 'تغيير الأب', icon: null, color: 'bg-purple-100 text-purple-700' },
  BACKUP_CREATE: { label: 'إنشاء نسخة', icon: null, color: 'bg-green-100 text-green-700' },
  BACKUP_RESTORE: { label: 'استعادة نسخة', icon: null, color: 'bg-orange-100 text-orange-700' },
  BACKUP_DELETE: { label: 'حذف نسخة', icon: null, color: 'bg-red-100 text-red-700' },
  BACKUP_DOWNLOAD: { label: 'تحميل نسخة', icon: null, color: 'bg-blue-100 text-blue-700' },
  CONFIG_UPDATE: { label: 'تعديل الإعدادات', icon: null, color: 'bg-yellow-100 text-yellow-700' },
  ADMIN_CREATE: { label: 'إنشاء مشرف', icon: null, color: 'bg-green-100 text-green-700' },
  ADMIN_UPDATE: { label: 'تعديل مشرف', icon: null, color: 'bg-blue-100 text-blue-700' },
  ADMIN_DELETE: { label: 'حذف مشرف', icon: null, color: 'bg-red-100 text-red-700' },
  ADMIN_LOGIN: { label: 'تسجيل دخول', icon: null, color: 'bg-green-100 text-green-700' },
  ADMIN_LOGOUT: { label: 'تسجيل خروج', icon: null, color: 'bg-gray-100 text-gray-700' },
  EXPORT_DATA: { label: 'تصدير بيانات', icon: null, color: 'bg-blue-100 text-blue-700' },
  IMPORT_DATA: { label: 'استيراد بيانات', icon: null, color: 'bg-purple-100 text-purple-700' },
  BRANCH_LINK_CREATE: { label: 'إنشاء رابط فرع', icon: null, color: 'bg-green-100 text-green-700' },
  BRANCH_LINK_UPDATE: { label: 'تعديل رابط فرع', icon: null, color: 'bg-blue-100 text-blue-700' },
  BRANCH_LINK_DELETE: { label: 'حذف رابط فرع', icon: null, color: 'bg-red-100 text-red-700' },
  PENDING_APPROVE: { label: 'موافقة على طلب', icon: null, color: 'bg-green-100 text-green-700' },
  PENDING_REJECT: { label: 'رفض طلب', icon: null, color: 'bg-red-100 text-red-700' },
  DUPLICATE_RESOLVE: { label: 'حل تكرار', icon: null, color: 'bg-purple-100 text-purple-700' },
  SYSTEM_CLEANUP: { label: 'تنظيف النظام', icon: null, color: 'bg-orange-100 text-orange-700' },
  INTEGRITY_CHECK: { label: 'فحص السلامة', icon: null, color: 'bg-blue-100 text-blue-700' },
};

const SEVERITY_ICONS: Record<AuditSeverity, React.ReactNode> = {
  INFO: <Info className="w-4 h-4 text-blue-500" />,
  WARNING: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  ERROR: <XCircle className="w-4 h-4 text-red-500" />,
  CRITICAL: <XCircle className="w-4 h-4 text-red-700" />,
};

export default function AuditLogPage() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [filters, setFilters] = useState({
    action: '',
    severity: '',
    startDate: '',
    endDate: '',
    success: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = paginationSettings.auditLogItemsPerPage;

  const loadAuditLogs = useCallback(async () => {
    if (!session?.token) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', itemsPerPage.toString());

      if (filters.action) params.set('action', filters.action);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.success) params.set('success', filters.success);

      const response = await fetch(`/api/admin/audit?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
        setTotal(data.total);
      } else {
        throw new Error(data.message || 'Failed to fetch audit logs');
      }
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل السجلات');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token, currentPage, itemsPerPage, filters]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filteredLogs = searchQuery
    ? logs.filter(
        (log) =>
          log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.targetName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.targetId?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs;

  const exportLogs = () => {
    const data = filteredLogs.map((log) => ({
      التاريخ: new Date(log.timestamp).toLocaleString('ar-SA'),
      الإجراء: ACTION_LABELS[log.action as AuditAction]?.label || log.action,
      المستخدم: log.userName || '-',
      الهدف: log.targetName || log.targetId || '-',
      الوصف: log.description,
      الحالة: log.success ? 'ناجح' : 'فشل',
      الخطورة: log.severity,
    }));

    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map((row) => Object.values(row).map((v) => `"${v}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  if (isLoading && logs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل سجل المراجعة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadAuditLogs}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">لوحة التحكم</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-gray-800">سجل المراجعة</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">سجل المراجعة</h1>
              <p className="text-sm text-gray-500">Audit Log - {total} سجل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAuditLogs}
              disabled={isLoading}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
              title="تحديث"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              <Download className="w-5 h-5" />
              تصدير
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">إجمالي السجلات</p>
          <p className="text-2xl font-bold text-gray-800">{total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">الصفحة الحالية</p>
          <p className="text-2xl font-bold text-blue-600">{filteredLogs.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">عدد الصفحات</p>
          <p className="text-2xl font-bold text-green-600">{totalPages}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">صفحة</p>
          <p className="text-2xl font-bold text-yellow-600">{currentPage}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في الوصف، المستخدم، أو الهدف..."
              className="w-full pr-10 pl-4 py-2 border rounded-lg"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
              showFilters ? 'bg-indigo-50 border-indigo-200' : ''
            }`}
          >
            <Filter className="w-5 h-5" />
            الفلاتر
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الإجراء</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">الكل</option>
                {Object.entries(ACTION_LABELS).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الخطورة</label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">الكل</option>
                <option value="INFO">معلومة</option>
                <option value="WARNING">تحذير</option>
                <option value="ERROR">خطأ</option>
                <option value="CRITICAL">حرج</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
              <select
                value={filters.success}
                onChange={(e) => handleFilterChange('success', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">الكل</option>
                <option value="true">ناجح</option>
                <option value="false">فشل</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-right text-sm font-medium text-gray-600">التاريخ</th>
                <th className="p-3 text-right text-sm font-medium text-gray-600">الإجراء</th>
                <th className="p-3 text-right text-sm font-medium text-gray-600">المستخدم</th>
                <th className="p-3 text-right text-sm font-medium text-gray-600">الهدف</th>
                <th className="p-3 text-right text-sm font-medium text-gray-600">الوصف</th>
                <th className="p-3 text-center text-sm font-medium text-gray-600">الحالة</th>
                <th className="p-3 text-center text-sm font-medium text-gray-600">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>لا توجد سجلات مطابقة للبحث</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const actionInfo = ACTION_LABELS[log.action as AuditAction] || { label: log.action, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{formatDate(log.timestamp)}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{log.userName || '-'}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {log.targetName || log.targetId || '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-600 max-w-xs truncate">
                        {log.description}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {SEVERITY_ICONS[log.severity]}
                          {log.success ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              صفحة {currentPage} من {totalPages} - إجمالي {total} سجل
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                السابق
              </button>
              <span className="px-3 py-1 bg-white border rounded">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">تفاصيل السجل</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">المعرف</label>
                  <p className="font-mono text-sm">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">التاريخ</label>
                  <p>{formatDate(selectedLog.timestamp)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">الإجراء</label>
                  <p className={`inline-block px-2 py-1 rounded text-sm ${ACTION_LABELS[selectedLog.action as AuditAction]?.color || 'bg-gray-100'}`}>
                    {ACTION_LABELS[selectedLog.action as AuditAction]?.label || selectedLog.action}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">الخطورة</label>
                  <div className="flex items-center gap-2">
                    {SEVERITY_ICONS[selectedLog.severity]}
                    <span>{selectedLog.severity}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">المستخدم</label>
                  <p>{selectedLog.userName || '-'} ({selectedLog.userRole || '-'})</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">الحالة</label>
                  <div className="flex items-center gap-2">
                    {selectedLog.success ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-600">ناجح</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-red-600">فشل</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500">الهدف</label>
                <p>{selectedLog.targetName || selectedLog.targetId || '-'}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">الوصف</label>
                <p>{selectedLog.description}</p>
              </div>

              {selectedLog.errorMessage && (
                <div>
                  <label className="text-sm text-gray-500">رسالة الخطأ</label>
                  <p className="text-red-600 bg-red-50 p-2 rounded">{selectedLog.errorMessage}</p>
                </div>
              )}

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <label className="text-sm text-gray-500">التفاصيل</label>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40 font-mono">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.previousState && (
                <div>
                  <label className="text-sm text-gray-500">الحالة السابقة</label>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40 font-mono">
                    {JSON.stringify(selectedLog.previousState, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newState && (
                <div>
                  <label className="text-sm text-gray-500">الحالة الجديدة</label>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40 font-mono">
                    {JSON.stringify(selectedLog.newState, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
