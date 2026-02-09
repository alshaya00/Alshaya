'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Check, Loader2, RefreshCw, Database, Hash, Languages, Users, FileText, Eye, Play, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { formatMemberId } from '@/lib/utils';

type TabType = 'idIssues' | 'arabicNames' | 'englishNames' | 'ancestorFields';

interface IdIssue {
  id: string;
  expectedId: string;
  numericValue: number;
}

interface ArabicNameIssue {
  id: string;
  firstName: string;
  generation: number;
  currentFullNameAr: string | null;
  expectedAncestorCount: number;
  actualAncestorCount: number;
}

interface EnglishNameIssue {
  id: string;
  firstName: string;
  currentFullNameEn: string | null;
  issueType: 'arabic_chars' | 'missing';
}

interface AncestorIssue {
  id: string;
  firstName: string;
  generation: number;
  missingFields: string[];
}

interface IdPreviewResult {
  currentId: string;
  newId: string;
  firstName: string;
  generation: number;
  referencesCount: number;
  references: Record<string, number>;
}

interface LineagePreviewResult {
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

export default function DataQualityPage() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('idIssues');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [totalMembers, setTotalMembers] = useState(0);
  const [idIssues, setIdIssues] = useState<IdIssue[]>([]);
  const [arabicNameIssues, setArabicNameIssues] = useState<ArabicNameIssue[]>([]);
  const [englishNameIssues, setEnglishNameIssues] = useState<EnglishNameIssue[]>([]);
  const [ancestorIssues, setAncestorIssues] = useState<AncestorIssue[]>([]);

  const [selectedIdIssues, setSelectedIdIssues] = useState<Set<string>>(new Set());
  const [selectedArabicNames, setSelectedArabicNames] = useState<Set<string>>(new Set());
  const [selectedEnglishNames, setSelectedEnglishNames] = useState<Set<string>>(new Set());
  const [selectedAncestorFields, setSelectedAncestorFields] = useState<Set<string>>(new Set());

  const [idPreview, setIdPreview] = useState<IdPreviewResult[]>([]);
  const [lineagePreview, setLineagePreview] = useState<LineagePreviewResult[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSource, setPreviewSource] = useState<TabType | null>(null);

  const fetchData = useCallback(async () => {
    if (!session?.token) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/data-quality', {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTotalMembers(data.totalMembers || 0);
        setIdIssues(data.issues?.idFormat || []);
        setArabicNameIssues(data.issues?.arabicNames || []);
        setEnglishNameIssues(data.issues?.englishNames || []);
        setAncestorIssues(data.issues?.missingAncestors || []);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'فشل في جلب البيانات');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleIdPreview = async () => {
    if (!session?.token) return;
    setError(null);
    setIsProcessing(true);

    try {
      const memberIds = selectedIdIssues.size > 0 ? Array.from(selectedIdIssues) : undefined;
      const res = await fetch('/api/admin/data-quality/fix-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ preview: true, memberIds }),
      });

      if (res.ok) {
        const data = await res.json();
        setIdPreview(data.members || []);
        setShowPreview(true);
        setPreviewSource('idIssues');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'فشل في المعاينة');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIdExecute = async () => {
    if (!session?.token) return;
    if (!confirm('هل أنت متأكد من تنفيذ تغييرات المعرفات؟ سيتم تحديث جميع المراجع المرتبطة.')) return;
    setError(null);
    setSuccess(null);
    setIsProcessing(true);

    try {
      const memberIds = idPreview.map(m => m.currentId);
      const res = await fetch('/api/admin/data-quality/fix-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ preview: false, memberIds }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(`تم تحديث ${data.summary?.totalFixed || 0} معرف بنجاح`);
        setShowPreview(false);
        setIdPreview([]);
        setSelectedIdIssues(new Set());
        await fetchData();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'فشل في التنفيذ');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLineagePreview = async (fixAll = false, source: TabType = 'arabicNames') => {
    if (!session?.token) return;
    setError(null);
    setIsProcessing(true);

    try {
      let memberIds: string[] | undefined;
      if (!fixAll) {
        if (source === 'arabicNames') memberIds = Array.from(selectedArabicNames);
        else if (source === 'englishNames') memberIds = Array.from(selectedEnglishNames);
        else if (source === 'ancestorFields') memberIds = Array.from(selectedAncestorFields);
      }

      const res = await fetch('/api/admin/fix-lineage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          memberIds: fixAll ? undefined : memberIds,
          fixAll,
          preview: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLineagePreview(data.results || []);
        setShowPreview(true);
        setPreviewSource(source);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في المعاينة');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLineageExecute = async () => {
    if (!session?.token) return;
    if (!confirm('هل أنت متأكد من تنفيذ التغييرات؟')) return;
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
          memberIds: lineagePreview.map(r => r.id),
          preview: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(data.messageAr || `تم تحديث ${data.changedCount} عضو بنجاح`);
        setShowPreview(false);
        setLineagePreview([]);
        setSelectedArabicNames(new Set());
        setSelectedEnglishNames(new Set());
        setSelectedAncestorFields(new Set());
        await fetchData();
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في التنفيذ');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelection = (set: Set<string>, setFn: (s: Set<string>) => void, id: string) => {
    const newSet = new Set(set);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setFn(newSet);
  };

  const selectAllInSet = (items: { id: string }[], setFn: (s: Set<string>) => void) => {
    setFn(new Set(items.map(i => i.id)));
  };

  const highlightArabicInEnglish = (text: string | null) => {
    if (!text) return <span className="text-gray-400">—</span>;
    const parts = text.split(/([\u0600-\u06FF]+)/g);
    return (
      <span dir="ltr">
        {parts.map((part, i) =>
          /[\u0600-\u06FF]/.test(part) ? (
            <span key={i} className="bg-red-200 text-red-800 px-0.5 rounded">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'fatherName': return 'اسم الأب';
      case 'grandfatherName': return 'اسم الجد';
      case 'greatGrandfatherName': return 'اسم جد الأب';
      default: return field;
    }
  };

  const tabs: { key: TabType; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    { key: 'idIssues', label: 'المعرفات', count: idIssues.length, icon: <Hash className="w-4 h-4" />, color: 'red' },
    { key: 'arabicNames', label: 'الأسماء العربية', count: arabicNameIssues.length, icon: <Languages className="w-4 h-4" />, color: 'orange' },
    { key: 'englishNames', label: 'الأسماء الإنجليزية', count: englishNameIssues.length, icon: <FileText className="w-4 h-4" />, color: 'purple' },
    { key: 'ancestorFields', label: 'حقول الأجداد', count: ancestorIssues.length, icon: <Users className="w-4 h-4" />, color: 'yellow' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-gray-500">جاري الفحص...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Database className="w-6 h-6" />
            لوحة جودة البيانات
          </h1>
          <p className="text-gray-600 mt-1">أدوات لفحص وإصلاح بيانات الأعضاء</p>
        </div>
        <Link href="/admin" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
          <ChevronLeft className="w-4 h-4" />
          لوحة الإدارة
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-lg border p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">إجمالي الأعضاء</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{totalMembers}</div>
        </div>
        <div className="bg-white rounded-lg border p-4 border-l-4 border-l-red-500 cursor-pointer hover:bg-red-50 transition" onClick={() => setActiveTab('idIssues')}>
          <div className="flex items-center gap-2 mb-1">
            <Hash className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500">مشاكل المعرفات</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{idIssues.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4 border-l-4 border-l-orange-500 cursor-pointer hover:bg-orange-50 transition" onClick={() => setActiveTab('arabicNames')}>
          <div className="flex items-center gap-2 mb-1">
            <Languages className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500">الأسماء العربية</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{arabicNameIssues.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4 border-l-4 border-l-purple-500 cursor-pointer hover:bg-purple-50 transition" onClick={() => setActiveTab('englishNames')}>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">الأسماء الإنجليزية</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">{englishNameIssues.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4 border-l-4 border-l-yellow-500 cursor-pointer hover:bg-yellow-50 transition" onClick={() => setActiveTab('ancestorFields')}>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-gray-500">حقول الأجداد</span>
          </div>
          <div className="text-2xl font-bold text-yellow-600">{ancestorIssues.length}</div>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setShowPreview(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab.key
                ? `border-${tab.color}-500 text-${tab.color}-700 bg-${tab.color}-50`
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === tab.key ? `bg-${tab.color}-100 text-${tab.color}-700` : 'bg-gray-100 text-gray-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={fetchData}
          disabled={isProcessing}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {activeTab === 'idIssues' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => selectAllInSet(idIssues, setSelectedIdIssues)}
              disabled={isProcessing || idIssues.length === 0}
              className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm"
            >
              تحديد الكل ({idIssues.length})
            </button>
            <button
              onClick={() => setSelectedIdIssues(new Set())}
              disabled={isProcessing || selectedIdIssues.size === 0}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              إلغاء التحديد
            </button>
            <button
              onClick={handleIdPreview}
              disabled={isProcessing || (selectedIdIssues.size === 0 && idIssues.length === 0)}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <Eye className="w-4 h-4" />
              معاينة التغييرات {selectedIdIssues.size > 0 ? `(${selectedIdIssues.size})` : `(${idIssues.length})`}
            </button>
          </div>

          <div className="bg-white rounded-lg border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-10">
                      <input
                        type="checkbox"
                        checked={idIssues.length > 0 && selectedIdIssues.size === idIssues.length}
                        onChange={() => {
                          if (selectedIdIssues.size === idIssues.length) setSelectedIdIssues(new Set());
                          else selectAllInSet(idIssues, setSelectedIdIssues);
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المعرف الحالي</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المعرف المتوقع</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {idIssues.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                        لا توجد مشاكل في تنسيق المعرفات
                      </td>
                    </tr>
                  ) : (
                    idIssues.map(issue => (
                      <tr key={issue.id} className={`hover:bg-gray-50 ${selectedIdIssues.has(issue.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIdIssues.has(issue.id)}
                            onChange={() => toggleSelection(selectedIdIssues, setSelectedIdIssues, issue.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-mono text-sm">{issue.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono text-sm">{issue.expectedId}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showPreview && previewSource === 'idIssues' && idPreview.length > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4">
                معاينة تغييرات المعرفات ({idPreview.length} عضو)
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {idPreview.map(item => (
                  <div key={item.currentId} className="bg-white rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{item.firstName}</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-sm text-gray-500">الجيل {item.generation}</span>
                      </div>
                      <span className="text-xs text-gray-500">{item.referencesCount} مرجع</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-mono line-through">{item.currentId}</span>
                      <span className="text-gray-400">←</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono">{item.newId}</span>
                    </div>
                    {item.referencesCount > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(item.references).filter(([, v]) => v > 0).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleIdExecute}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  تنفيذ
                </button>
                <button
                  onClick={() => { setShowPreview(false); setIdPreview([]); }}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'arabicNames' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => selectAllInSet(arabicNameIssues, setSelectedArabicNames)}
              disabled={isProcessing || arabicNameIssues.length === 0}
              className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm"
            >
              تحديد الكل ({arabicNameIssues.length})
            </button>
            <button
              onClick={() => setSelectedArabicNames(new Set())}
              disabled={isProcessing || selectedArabicNames.size === 0}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              إلغاء التحديد
            </button>
            <button
              onClick={() => handleLineagePreview(false, 'arabicNames')}
              disabled={isProcessing || selectedArabicNames.size === 0}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <Eye className="w-4 h-4" />
              معاينة المحدد ({selectedArabicNames.size})
            </button>
            <button
              onClick={() => handleLineagePreview(true, 'arabicNames')}
              disabled={isProcessing || arabicNameIssues.length === 0}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة توليد الكل
            </button>
          </div>

          <div className="bg-white rounded-lg border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-10">
                      <input
                        type="checkbox"
                        checked={arabicNameIssues.length > 0 && selectedArabicNames.size === arabicNameIssues.length}
                        onChange={() => {
                          if (selectedArabicNames.size === arabicNameIssues.length) setSelectedArabicNames(new Set());
                          else selectAllInSet(arabicNameIssues, setSelectedArabicNames);
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المعرف</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الجيل</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم الكامل العربي</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الأجداد (فعلي/متوقع)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {arabicNameIssues.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                        لا توجد مشاكل في الأسماء العربية
                      </td>
                    </tr>
                  ) : (
                    arabicNameIssues.map(issue => (
                      <tr key={issue.id} className={`hover:bg-gray-50 ${selectedArabicNames.has(issue.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedArabicNames.has(issue.id)}
                            onChange={() => toggleSelection(selectedArabicNames, setSelectedArabicNames, issue.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/member/${issue.id}`} className="text-blue-600 hover:underline text-sm font-mono">
                            {formatMemberId(issue.id)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium">{issue.firstName}</td>
                        <td className="px-4 py-3 text-center">{issue.generation}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {issue.currentFullNameAr || <span className="text-red-500 italic">مفقود</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={issue.actualAncestorCount < issue.expectedAncestorCount ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {issue.actualAncestorCount}/{issue.expectedAncestorCount}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'englishNames' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => selectAllInSet(englishNameIssues, setSelectedEnglishNames)}
              disabled={isProcessing || englishNameIssues.length === 0}
              className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm"
            >
              تحديد الكل ({englishNameIssues.length})
            </button>
            <button
              onClick={() => setSelectedEnglishNames(new Set())}
              disabled={isProcessing || selectedEnglishNames.size === 0}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              إلغاء التحديد
            </button>
            <button
              onClick={() => handleLineagePreview(false, 'englishNames')}
              disabled={isProcessing || selectedEnglishNames.size === 0}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <Eye className="w-4 h-4" />
              معاينة المحدد ({selectedEnglishNames.size})
            </button>
            <button
              onClick={() => handleLineagePreview(true, 'englishNames')}
              disabled={isProcessing || englishNameIssues.length === 0}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة توليد الكل
            </button>
          </div>

          <div className="bg-white rounded-lg border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-10">
                      <input
                        type="checkbox"
                        checked={englishNameIssues.length > 0 && selectedEnglishNames.size === englishNameIssues.length}
                        onChange={() => {
                          if (selectedEnglishNames.size === englishNameIssues.length) setSelectedEnglishNames(new Set());
                          else selectAllInSet(englishNameIssues, setSelectedEnglishNames);
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المعرف</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم الإنجليزي الحالي</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">نوع المشكلة</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {englishNameIssues.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                        لا توجد مشاكل في الأسماء الإنجليزية
                      </td>
                    </tr>
                  ) : (
                    englishNameIssues.map(issue => (
                      <tr key={issue.id} className={`hover:bg-gray-50 ${selectedEnglishNames.has(issue.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedEnglishNames.has(issue.id)}
                            onChange={() => toggleSelection(selectedEnglishNames, setSelectedEnglishNames, issue.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/member/${issue.id}`} className="text-blue-600 hover:underline text-sm font-mono">
                            {formatMemberId(issue.id)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium">{issue.firstName}</td>
                        <td className="px-4 py-3 text-sm max-w-xs">
                          {issue.issueType === 'arabic_chars'
                            ? highlightArabicInEnglish(issue.currentFullNameEn)
                            : <span className="text-red-500 italic">مفقود</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            issue.issueType === 'arabic_chars'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {issue.issueType === 'arabic_chars' ? 'أحرف عربية' : 'مفقود'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ancestorFields' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => selectAllInSet(ancestorIssues, setSelectedAncestorFields)}
              disabled={isProcessing || ancestorIssues.length === 0}
              className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm"
            >
              تحديد الكل ({ancestorIssues.length})
            </button>
            <button
              onClick={() => setSelectedAncestorFields(new Set())}
              disabled={isProcessing || selectedAncestorFields.size === 0}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              إلغاء التحديد
            </button>
            <button
              onClick={() => handleLineagePreview(false, 'ancestorFields')}
              disabled={isProcessing || selectedAncestorFields.size === 0}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <Eye className="w-4 h-4" />
              معاينة المحدد ({selectedAncestorFields.size})
            </button>
            <button
              onClick={() => handleLineagePreview(true, 'ancestorFields')}
              disabled={isProcessing || ancestorIssues.length === 0}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              إصلاح الكل
            </button>
          </div>

          <div className="bg-white rounded-lg border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-10">
                      <input
                        type="checkbox"
                        checked={ancestorIssues.length > 0 && selectedAncestorFields.size === ancestorIssues.length}
                        onChange={() => {
                          if (selectedAncestorFields.size === ancestorIssues.length) setSelectedAncestorFields(new Set());
                          else selectAllInSet(ancestorIssues, setSelectedAncestorFields);
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المعرف</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الجيل</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الحقول المفقودة</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ancestorIssues.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                        لا توجد حقول أجداد مفقودة
                      </td>
                    </tr>
                  ) : (
                    ancestorIssues.map(issue => (
                      <tr key={issue.id} className={`hover:bg-gray-50 ${selectedAncestorFields.has(issue.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedAncestorFields.has(issue.id)}
                            onChange={() => toggleSelection(selectedAncestorFields, setSelectedAncestorFields, issue.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/member/${issue.id}`} className="text-blue-600 hover:underline text-sm font-mono">
                            {formatMemberId(issue.id)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium">{issue.firstName}</td>
                        <td className="px-4 py-3 text-center">{issue.generation}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {issue.missingFields.map(field => (
                              <span key={field} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                                {getFieldLabel(field)}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showPreview && previewSource !== 'idIssues' && lineagePreview.length > 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">
            معاينة التغييرات ({lineagePreview.length} عضو)
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {lineagePreview.map(result => (
              <div key={result.id} className="bg-white rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/member/${result.id}`} className="font-medium text-blue-600 hover:underline">
                    {result.firstName} ({formatMemberId(result.id)})
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-500 mb-1">الاسم العربي:</div>
                    <div className="text-red-600 line-through text-xs mb-1">{result.oldFullNameAr || '—'}</div>
                    <div className="text-green-600 text-xs">{result.newFullNameAr}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500 mb-1">الاسم الإنجليزي:</div>
                    <div className="text-red-600 line-through text-xs mb-1" dir="ltr">{result.oldFullNameEn || '—'}</div>
                    <div className="text-green-600 text-xs" dir="ltr">{result.newFullNameEn}</div>
                  </div>
                </div>
                {result.ancestorNamesUpdated && Object.keys(result.ancestorNamesUpdated).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="font-medium text-gray-500 mb-2 text-sm">تحديثات أسماء الأجداد:</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      {result.ancestorNamesUpdated.fatherName && (
                        <div className="bg-blue-50 p-2 rounded">
                          <div className="font-medium text-blue-800">اسم الأب:</div>
                          <div className="text-red-600 line-through">{result.ancestorNamesUpdated.fatherName.old || '—'}</div>
                          <div className="text-green-600">{result.ancestorNamesUpdated.fatherName.new}</div>
                        </div>
                      )}
                      {result.ancestorNamesUpdated.grandfatherName && (
                        <div className="bg-blue-50 p-2 rounded">
                          <div className="font-medium text-blue-800">اسم الجد:</div>
                          <div className="text-red-600 line-through">{result.ancestorNamesUpdated.grandfatherName.old || '—'}</div>
                          <div className="text-green-600">{result.ancestorNamesUpdated.grandfatherName.new}</div>
                        </div>
                      )}
                      {result.ancestorNamesUpdated.greatGrandfatherName && (
                        <div className="bg-blue-50 p-2 rounded">
                          <div className="font-medium text-blue-800">اسم جد الأب:</div>
                          <div className="text-red-600 line-through">{result.ancestorNamesUpdated.greatGrandfatherName.old || '—'}</div>
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
              onClick={handleLineageExecute}
              disabled={isProcessing}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              تنفيذ
            </button>
            <button
              onClick={() => { setShowPreview(false); setLineagePreview([]); }}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {showPreview && previewSource !== 'idIssues' && lineagePreview.length === 0 && !isProcessing && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center">
          <Check className="w-8 h-8 mx-auto mb-2" />
          لا توجد تغييرات مطلوبة
        </div>
      )}
    </div>
  );
}
