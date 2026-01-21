'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  RefreshCw,
  Filter,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Wrench,
  User,
  Calendar,
  Loader2,
  XCircle,
} from 'lucide-react';
import { formatMemberId } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ValidationIssue {
  field: string;
  fieldAr: string;
  value: string;
  issue: string;
  issueAr: string;
  severity: 'error' | 'warning';
}

interface SuggestedFix {
  suggestedYear: number;
  suggestedCalendar: string;
  explanation: string;
  explanationAr: string;
}

interface MemberValidationResult {
  id: string;
  firstName: string;
  fullNameAr: string;
  generation: number;
  birthYear: number | null;
  birthCalendar: string;
  deathYear: number | null;
  deathCalendar: string | null;
  gender: string;
  issues: ValidationIssue[];
  suggestedFix: SuggestedFix | null;
  calculatedAge: number | null;
}

interface ValidationSummary {
  totalMembers: number;
  membersWithIssues: number;
  totalErrors: number;
  totalWarnings: number;
  fixableBirthYears: number;
}

interface LinkedAccountIssue {
  memberId: string;
  memberName?: string;
  issue: string;
  issueAr: string;
  severity: 'error' | 'warning';
  details?: {
    userId?: string;
    userEmail?: string;
    deletedMemberId?: string;
    deletedMemberName?: string;
    invalidMemberId?: string;
    linkedUserEmails?: string[];
    linkCount?: number;
    deletedAt?: string;
  };
}

interface LinkedAccountsValidation {
  valid: boolean;
  issues: LinkedAccountIssue[];
  checkedAt: string;
}

type FilterType = 'all' | 'errors' | 'warnings';

export default function DataValidationPage() {
  const { session } = useAuth();
  const [results, setResults] = useState<MemberValidationResult[]>([]);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccountsValidation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchValidationData = useCallback(async () => {
    if (!session?.token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('type', filter);
      }
      
      const response = await fetch(`/api/admin/data-validation?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('فشل في جلب بيانات التحقق');
      }

      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
        setSummary(data.summary || null);
        setLinkedAccounts(data.linkedAccounts || null);
      } else {
        throw new Error(data.error || 'فشل في جلب البيانات');
      }
    } catch (err) {
      console.error('Error fetching validation data:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token, filter]);

  useEffect(() => {
    fetchValidationData();
  }, [fetchValidationData]);

  const handleFix = async (memberId: string, newCalendar: string) => {
    if (!session?.token) return;
    
    setFixingId(memberId);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/admin/data-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          memberId,
          newBirthCalendar: newCalendar,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message);
        await fetchValidationData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(data.error || 'فشل في تطبيق الإصلاح');
      }
    } catch (err) {
      console.error('Error fixing member:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء الإصلاح');
    } finally {
      setFixingId(null);
    }
  };

  const getCalendarLabel = (calendar: string) => {
    return calendar === 'HIJRI' ? 'هجري' : 'ميلادي';
  };

  const filteredResults = results.filter(r => {
    if (filter === 'errors') {
      return r.issues.some(i => i.severity === 'error');
    }
    if (filter === 'warnings') {
      return r.issues.some(i => i.severity === 'warning');
    }
    return true;
  });

  if (isLoading && results.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحقق من البيانات...</p>
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
            onClick={fetchValidationData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8" dir="rtl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">لوحة التحكم</Link>
          <ChevronLeft className="w-4 h-4 rotate-180" />
          <span className="text-gray-800">التحقق من البيانات</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">التحقق من صحة البيانات</h1>
              <p className="text-gray-500 text-sm">فحص وإصلاح مشاكل البيانات</p>
            </div>
          </div>
          <button
            onClick={fetchValidationData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2a4a6f] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{summary.totalMembers}</p>
                <p className="text-sm text-gray-500">إجمالي الأعضاء</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{summary.membersWithIssues}</p>
                <p className="text-sm text-gray-500">أعضاء بمشاكل</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{summary.totalErrors}</p>
                <p className="text-sm text-gray-500">أخطاء</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{summary.totalWarnings}</p>
                <p className="text-sm text-gray-500">تحذيرات</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{summary.fixableBirthYears}</p>
                <p className="text-sm text-gray-500">قابلة للإصلاح</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">تصفية حسب النوع:</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              الكل ({results.length})
            </button>
            <button
              onClick={() => setFilter('errors')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'errors'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              أخطاء ({results.filter(r => r.issues.some(i => i.severity === 'error')).length})
            </button>
            <button
              onClick={() => setFilter('warnings')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'warnings'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
              }`}
            >
              تحذيرات ({results.filter(r => r.issues.some(i => i.severity === 'warning')).length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">العضو</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الجيل</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">سنة الميلاد</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">التقويم</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">العمر المحسوب</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المشاكل</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الإصلاح المقترح</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-lg font-medium">لا توجد مشاكل في البيانات</p>
                    <p className="text-sm">جميع البيانات سليمة</p>
                  </td>
                </tr>
              ) : (
                filteredResults.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <Link 
                          href={`/member/${member.id}`}
                          className="font-medium text-gray-800 hover:text-[#1E3A5F] hover:underline"
                        >
                          {member.fullNameAr || member.firstName}
                        </Link>
                        <p className="text-xs text-gray-500">{formatMemberId(member.id)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {member.generation}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {member.birthYear || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        member.birthCalendar === 'HIJRI' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        <Calendar className="w-3 h-3 ml-1" />
                        {getCalendarLabel(member.birthCalendar)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {member.calculatedAge !== null ? (
                        <span className={`font-medium ${
                          member.calculatedAge > 120 || member.calculatedAge < 0
                            ? 'text-red-600'
                            : 'text-gray-800'
                        }`}>
                          {member.calculatedAge} سنة
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 max-w-xs">
                        {member.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className={`flex items-start gap-2 text-xs p-2 rounded ${
                              issue.severity === 'error'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-yellow-50 text-yellow-700'
                            }`}
                          >
                            {issue.severity === 'error' ? (
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            )}
                            <span>{issue.issueAr}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {member.suggestedFix ? (
                        <div className="text-xs bg-green-50 text-green-700 p-2 rounded max-w-xs">
                          <p className="font-medium mb-1">تغيير التقويم إلى: {getCalendarLabel(member.suggestedFix.suggestedCalendar)}</p>
                          <p className="text-green-600">{member.suggestedFix.explanationAr}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {member.suggestedFix ? (
                        <button
                          onClick={() => handleFix(member.id, member.suggestedFix!.suggestedCalendar)}
                          disabled={fixingId === member.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm mx-auto"
                        >
                          {fixingId === member.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wrench className="w-4 h-4" />
                          )}
                          إصلاح
                        </button>
                      ) : (
                        <Link
                          href={`/edit/${member.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          تعديل
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {linkedAccounts && (
        <div className="bg-white rounded-xl shadow-sm border mb-6">
          <div className="p-4 border-b flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">الحسابات المرتبطة</h2>
              <p className="text-sm text-gray-500">التحقق من ارتباط حسابات المستخدمين بالأعضاء</p>
            </div>
            <div className="mr-auto">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                linkedAccounts.valid 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {linkedAccounts.valid ? (
                  <>
                    <CheckCircle className="w-4 h-4 ml-1" />
                    سليم
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 ml-1" />
                    يوجد مشاكل ({linkedAccounts.issues.length})
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="p-4">
            {linkedAccounts.issues.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-medium">لا توجد مشاكل في الحسابات المرتبطة</p>
                <p className="text-sm">جميع حسابات المستخدمين مرتبطة بأعضاء صالحين</p>
              </div>
            ) : (
              <div className="space-y-3">
                {linkedAccounts.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      issue.severity === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {issue.severity === 'error' ? (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`font-medium ${
                          issue.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
                        }`}>
                          {issue.issueAr}
                        </p>
                        {issue.details && (
                          <div className={`mt-2 text-sm ${
                            issue.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {issue.details.userEmail && (
                              <p>البريد الإلكتروني: {issue.details.userEmail}</p>
                            )}
                            {issue.details.deletedMemberName && (
                              <p>العضو المحذوف: {issue.details.deletedMemberName} ({issue.details.deletedMemberId})</p>
                            )}
                            {issue.details.invalidMemberId && (
                              <p>معرف العضو غير الموجود: {issue.details.invalidMemberId}</p>
                            )}
                            {issue.details.linkedUserEmails && issue.details.linkedUserEmails.length > 0 && (
                              <p>الحسابات المرتبطة: {issue.details.linkedUserEmails.join(', ')}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {issue.details?.userId && (
                          <Link
                            href={`/admin/users`}
                            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                          >
                            إدارة المستخدم
                          </Link>
                        )}
                        {issue.details?.deletedMemberId && (
                          <Link
                            href={`/deleted`}
                            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                          >
                            الأعضاء المحذوفين
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
