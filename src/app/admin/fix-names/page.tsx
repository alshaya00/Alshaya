'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  Search,
  FileText,
  Play,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Issue {
  id: string;
  firstName: string;
  generation: number;
  currentFullNameAr: string | null;
  currentFullNameEn: string | null;
  issueType: 'arabic_in_english' | 'incomplete_lineage' | 'missing_ancestor_names' | 'multiple';
  expectedAncestors: number;
  actualAncestors: number;
  missingFields?: string[];
}

interface PreviewResult {
  id: string;
  firstName: string;
  oldFullNameAr: string | null;
  newFullNameAr: string;
  oldFullNameEn: string | null;
  newFullNameEn: string;
  changed: boolean;
  ancestorNamesUpdated?: {
    fatherName?: { old: string | null; new: string | null };
    grandfatherName?: { old: string | null; new: string | null };
    greatGrandfatherName?: { old: string | null; new: string | null };
  };
}

export default function FixNamesPage() {
  const { session } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [summary, setSummary] = useState({ arabicInEnglish: 0, incompleteLineage: 0, missingAncestorNames: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);

  const fetchIssues = useCallback(async () => {
    if (!session?.token) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/fix-lineage', {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues || []);
        setSummary(data.summary || { arabicInEnglish: 0, incompleteLineage: 0, missingAncestorNames: 0 });
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في جلب البيانات');
      }
    } catch (err) {
      console.error('Error fetching issues:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handlePreview = async (fixAll = false) => {
    if (!session?.token) return;
    setError(null);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/admin/fix-lineage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          memberIds: fixAll ? undefined : Array.from(selectedIds),
          fixAll,
          preview: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewResults(data.results || []);
        setShowPreview(true);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في المعاينة');
      }
    } catch (err) {
      console.error('Error previewing:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecute = async () => {
    if (!session?.token) return;
    setError(null);
    setSuccess(null);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/admin/fix-lineage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          memberIds: previewResults.map(r => r.id),
          preview: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(data.messageAr || `تم تحديث ${data.changedCount} عضو`);
        setShowPreview(false);
        setPreviewResults([]);
        setSelectedIds(new Set());
        await fetchIssues();
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في التنفيذ');
      }
    } catch (err) {
      console.error('Error executing:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(issues.map(i => i.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const getIssueTypeLabel = (type: string) => {
    switch (type) {
      case 'arabic_in_english':
        return 'نص عربي في الاسم الإنجليزي';
      case 'incomplete_lineage':
        return 'سلسلة نسب ناقصة';
      case 'missing_ancestor_names':
        return 'أسماء الأجداد مفقودة';
      case 'multiple':
      case 'both':
        return 'مشاكل متعددة';
      default:
        return type;
    }
  };

  const getIssueTypeColor = (type: string) => {
    switch (type) {
      case 'arabic_in_english':
        return 'bg-red-100 text-red-800';
      case 'incomplete_lineage':
        return 'bg-orange-100 text-orange-800';
      case 'missing_ancestor_names':
        return 'bg-yellow-100 text-yellow-800';
      case 'multiple':
      case 'both':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-6 h-6" />
          إصلاح أسماء الأعضاء
        </h1>
        <p className="text-gray-600 mt-2">
          أداة لإصلاح الأسماء العربية والإنجليزية وسلسلة النسب الناقصة
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-red-600">{summary.arabicInEnglish}</div>
          <div className="text-sm text-gray-600">نص عربي في الاسم الإنجليزي</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-orange-600">{summary.incompleteLineage}</div>
          <div className="text-sm text-gray-600">سلسلة نسب ناقصة</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-yellow-600">{summary.missingAncestorNames}</div>
          <div className="text-sm text-gray-600">أسماء الأجداد مفقودة</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-blue-600">{issues.length}</div>
          <div className="text-sm text-gray-600">إجمالي المشاكل</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={fetchIssues}
          disabled={isProcessing}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          تحديث
        </button>
        <button
          onClick={selectAll}
          disabled={isProcessing || issues.length === 0}
          className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg"
        >
          تحديد الكل ({issues.length})
        </button>
        <button
          onClick={clearSelection}
          disabled={isProcessing || selectedIds.size === 0}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          إلغاء التحديد
        </button>
        <button
          onClick={() => handlePreview(false)}
          disabled={isProcessing || selectedIds.size === 0}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          معاينة المحدد ({selectedIds.size})
        </button>
        <button
          onClick={() => handlePreview(true)}
          disabled={isProcessing || issues.length === 0}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          معاينة إصلاح الكل
        </button>
      </div>

      {showPreview && previewResults.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">
            معاينة التغييرات ({previewResults.length} عضو)
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-4">
            {previewResults.map((result) => (
              <div key={result.id} className="bg-white rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <Link
                    href={`/member/${result.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {result.firstName} ({result.id})
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-500 mb-1">الاسم العربي:</div>
                    <div className="text-red-600 line-through text-xs mb-1">{result.oldFullNameAr}</div>
                    <div className="text-green-600 text-xs">{result.newFullNameAr}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500 mb-1">الاسم الإنجليزي:</div>
                    <div className="text-red-600 line-through text-xs mb-1" dir="ltr">{result.oldFullNameEn}</div>
                    <div className="text-green-600 text-xs" dir="ltr">{result.newFullNameEn}</div>
                  </div>
                </div>
                {result.ancestorNamesUpdated && Object.keys(result.ancestorNamesUpdated).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="font-medium text-gray-500 mb-2">تحديثات أسماء الأجداد:</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      {result.ancestorNamesUpdated.fatherName && (
                        <div className="bg-blue-50 p-2 rounded">
                          <div className="font-medium text-blue-800">اسم الأب:</div>
                          <div className="text-red-600 line-through">{result.ancestorNamesUpdated.fatherName.old || '-'}</div>
                          <div className="text-green-600">{result.ancestorNamesUpdated.fatherName.new}</div>
                        </div>
                      )}
                      {result.ancestorNamesUpdated.grandfatherName && (
                        <div className="bg-blue-50 p-2 rounded">
                          <div className="font-medium text-blue-800">اسم الجد:</div>
                          <div className="text-red-600 line-through">{result.ancestorNamesUpdated.grandfatherName.old || '-'}</div>
                          <div className="text-green-600">{result.ancestorNamesUpdated.grandfatherName.new}</div>
                        </div>
                      )}
                      {result.ancestorNamesUpdated.greatGrandfatherName && (
                        <div className="bg-blue-50 p-2 rounded">
                          <div className="font-medium text-blue-800">اسم جد الأب:</div>
                          <div className="text-red-600 line-through">{result.ancestorNamesUpdated.greatGrandfatherName.old || '-'}</div>
                          <div className="text-green-600">{result.ancestorNamesUpdated.greatGrandfatherName.new}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleExecute}
              disabled={isProcessing}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              تنفيذ الإصلاح
            </button>
            <button
              onClick={() => setShowPreview(false)}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-10"></th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المعرف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الجيل</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">نوع المشكلة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الأجداد (فعلي/متوقع)</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الحقول المفقودة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم الإنجليزي الحالي</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {issues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    لا توجد مشاكل في الأسماء
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr
                    key={issue.id}
                    className={`hover:bg-gray-50 ${selectedIds.has(issue.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(issue.id)}
                        onChange={() => toggleSelection(issue.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/member/${issue.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {issue.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{issue.firstName}</td>
                    <td className="px-4 py-3 text-center">{issue.generation}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getIssueTypeColor(issue.issueType)}`}>
                        {getIssueTypeLabel(issue.issueType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={issue.actualAncestors < issue.expectedAncestors ? 'text-red-600 font-medium' : ''}>
                        {issue.actualAncestors}/{issue.expectedAncestors}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {issue.missingFields && issue.missingFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {issue.missingFields.map((field) => (
                            <span key={field} className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                              {field === 'fatherName' ? 'الأب' : 
                               field === 'grandfatherName' ? 'الجد' : 
                               field === 'greatGrandfatherName' ? 'جد الأب' : field}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate" dir="ltr">
                      {issue.currentFullNameEn}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
