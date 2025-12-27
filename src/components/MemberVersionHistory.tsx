'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/auth/permissions';
import {
  History,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  severity: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  targetId: string | null;
  targetName: string | null;
  description: string;
  details: Record<string, unknown> | null;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  success: boolean;
  errorMessage: string | null;
  impactedIds: string | null;
  impactSummary: Record<string, unknown> | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  MEMBER_CREATE: { label: 'إنشاء', color: 'bg-green-100 text-green-700' },
  MEMBER_UPDATE: { label: 'تعديل', color: 'bg-blue-100 text-blue-700' },
  MEMBER_DELETE: { label: 'حذف', color: 'bg-red-100 text-red-700' },
  MEMBER_RESTORE: { label: 'استعادة', color: 'bg-purple-100 text-purple-700' },
  PARENT_CHANGE: { label: 'تغيير الأب', color: 'bg-orange-100 text-orange-700' },
  LINEAGE_UPDATE: { label: 'تحديث النسب', color: 'bg-amber-100 text-amber-700' },
};

const FIELD_LABELS: Record<string, string> = {
  firstName: 'الاسم الأول',
  fatherName: 'اسم الأب',
  grandfatherName: 'اسم الجد',
  greatGrandfatherName: 'اسم جد الأب',
  familyName: 'اسم العائلة',
  fatherId: 'معرف الأب',
  gender: 'الجنس',
  birthYear: 'سنة الميلاد',
  deathYear: 'سنة الوفاة',
  generation: 'الجيل',
  branch: 'الفرع',
  fullNameAr: 'الاسم الكامل',
  phone: 'الهاتف',
  city: 'المدينة',
  status: 'الحالة',
  occupation: 'المهنة',
  email: 'البريد الإلكتروني',
  biography: 'السيرة الذاتية',
  lineageBranchName: 'الفرع الرئيسي',
  subBranchName: 'الفرع الفرعي',
};

interface MemberVersionHistoryProps {
  memberId: string;
}

export default function MemberVersionHistory({ memberId }: MemberVersionHistoryProps) {
  const { user, session } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const canViewHistory = user && hasPermission(user.role, 'view_audit_logs');

  const loadHistory = useCallback(async () => {
    if (!session?.token || !canViewHistory) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/members/${memberId}/history`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      if (data.success) {
        setLogs(data.logs);
      } else {
        throw new Error(data.message || 'Failed to fetch history');
      }
    } catch (err) {
      console.error('Error loading history:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل السجل');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token, memberId, canViewHistory]);

  useEffect(() => {
    if (isVisible && canViewHistory) {
      loadHistory();
    }
  }, [isVisible, loadHistory, canViewHistory]);

  if (!canViewHistory) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const hijriDate = date.toLocaleDateString('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Riyadh',
    });
    const time = date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Riyadh',
    });
    return `${hijriDate} - ${time}`;
  };

  const getChangedFields = (prev: Record<string, unknown> | null, next: Record<string, unknown> | null) => {
    if (!prev && !next) return [];
    if (!prev) return Object.keys(next || {}).map(key => ({ field: key, old: null, new: (next as Record<string, unknown>)[key] }));
    if (!next) return Object.keys(prev).map(key => ({ field: key, old: prev[key], new: null }));

    const changes: { field: string; old: unknown; new: unknown }[] = [];
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

    allKeys.forEach(key => {
      const oldVal = prev[key];
      const newVal = next[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, old: oldVal, new: newVal });
      }
    });

    return changes;
  };

  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-8">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="w-full flex items-center justify-between p-4 text-right hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <History className="text-indigo-500" size={20} />
          <h3 className="font-bold text-gray-700">سجل التغييرات</h3>
          {logs.length > 0 && (
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
              {logs.length} تغيير
            </span>
          )}
        </div>
        {isVisible ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isVisible && (
        <div className="border-t border-gray-200 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="mr-2 text-gray-500">جاري التحميل...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-red-500">
              <AlertTriangle size={20} className="ml-2" />
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد تغييرات مسجلة لهذا العضو
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => {
                const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700' };
                const isExpanded = expandedLog === log.id;
                const changes = getChangedFields(log.previousState, log.newState);

                return (
                  <div
                    key={log.id}
                    className={`border rounded-lg overflow-hidden ${
                      index === 0 ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      className="w-full p-4 text-right hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${actionInfo.color}`}>
                            {actionInfo.label}
                          </span>
                          {log.success ? (
                            <CheckCircle size={16} className="text-green-500" />
                          ) : (
                            <AlertTriangle size={16} className="text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>{formatDate(log.timestamp)}</span>
                          </div>
                          {log.userName && (
                            <div className="flex items-center gap-1">
                              <User size={14} />
                              <span>{log.userName}</span>
                            </div>
                          )}
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{log.description}</p>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        {changes.length > 0 ? (
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">التغييرات:</h4>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-3 py-2 text-right font-medium text-gray-600">الحقل</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-600">القيمة السابقة</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-600">القيمة الجديدة</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {changes.map((change, idx) => (
                                    <tr key={idx} className="border-t border-gray-100">
                                      <td className="px-3 py-2 font-medium text-gray-700">
                                        {FIELD_LABELS[change.field] || change.field}
                                      </td>
                                      <td className="px-3 py-2 text-red-600 bg-red-50/50">
                                        {renderValue(change.old)}
                                      </td>
                                      <td className="px-3 py-2 text-green-600 bg-green-50/50">
                                        {renderValue(change.new)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">لا توجد تفاصيل إضافية</p>
                        )}

                        {log.impactSummary && (
                          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <h4 className="text-sm font-medium text-amber-700 mb-2">تأثير التغيير:</h4>
                            <div className="flex flex-wrap gap-3 text-sm">
                              {(log.impactSummary as Record<string, number>).descendantsAffected !== undefined && (
                                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded">
                                  المتأثرين: {(log.impactSummary as Record<string, number>).descendantsAffected}
                                </span>
                              )}
                              {(log.impactSummary as Record<string, number>).lineagePathsUpdated !== undefined && (
                                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded">
                                  مسارات النسب: {(log.impactSummary as Record<string, number>).lineagePathsUpdated}
                                </span>
                              )}
                              {(log.impactSummary as Record<string, number>).generationChanges !== undefined && (
                                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded">
                                  تغييرات الأجيال: {(log.impactSummary as Record<string, number>).generationChanges}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {log.errorMessage && (
                          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-sm text-red-700">{log.errorMessage}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
