'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Loader2,
  Check,
  AlertTriangle,
  Hash,
  Languages,
  Users,
  CheckCircle,
  XCircle,
  Table,
  Play,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NormalizeIdChange {
  oldId: string;
  newId: string;
}

interface NormalizeScanResult {
  totalMembers: number;
  inconsistentCount: number;
  consistentCount: number;
  affectedTables: number;
  changes: NormalizeIdChange[];
}

interface LineageIssue {
  id: string;
  firstName: string;
  currentFullNameEn: string | null;
  issueType: string;
}

interface LineageScanResult {
  issues: LineageIssue[];
  summary: {
    arabicInEnglish: number;
    incompleteLineage: number;
    missingAncestorNames: number;
  };
}

interface LineagePreviewResult {
  id: string;
  firstName: string;
  oldFullNameEn: string | null;
  newFullNameEn: string;
  changed: boolean;
}

export default function DataRepairCenterPage() {
  const { session } = useAuth();

  const [idScanResult, setIdScanResult] = useState<NormalizeScanResult | null>(null);
  const [idScanning, setIdScanning] = useState(false);
  const [idExecuting, setIdExecuting] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);
  const [idSuccess, setIdSuccess] = useState<string | null>(null);

  const [lineageScanResult, setLineageScanResult] = useState<LineageScanResult | null>(null);
  const [lineageScanning, setLineageScanning] = useState(false);
  const [lineagePreview, setLineagePreview] = useState<LineagePreviewResult[]>([]);
  const [lineagePreviewing, setLineagePreviewing] = useState(false);
  const [lineageExecuting, setLineageExecuting] = useState(false);
  const [lineageError, setLineageError] = useState<string | null>(null);
  const [lineageSuccess, setLineageSuccess] = useState<string | null>(null);

  const scanIds = useCallback(async () => {
    if (!session?.token) return;
    setIdScanning(true);
    setIdError(null);
    setIdSuccess(null);

    try {
      const res = await fetch('/api/admin/normalize-ids', {
        headers: { Authorization: 'Bearer ' + session.token },
      });

      if (res.ok) {
        const data = await res.json();
        setIdScanResult({
          totalMembers: data.totalMembers || 0,
          inconsistentCount: data.inconsistentCount || data.changes?.length || 0,
          consistentCount: data.consistentCount || (data.totalMembers || 0) - (data.inconsistentCount || data.changes?.length || 0),
          affectedTables: data.affectedTables || 0,
          changes: data.changes || [],
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        setIdError(errData.message || errData.messageAr || 'فشل في فحص المعرّفات');
      }
    } catch {
      setIdError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIdScanning(false);
    }
  }, [session?.token]);

  const executeIdNormalization = useCallback(async () => {
    if (!session?.token) return;
    if (!confirm('هل أنت متأكد من تطبيع جميع المعرّفات؟ سيتم تحديث جميع المراجع المرتبطة.\n\nAre you sure you want to normalize all IDs?')) return;

    setIdExecuting(true);
    setIdError(null);
    setIdSuccess(null);

    try {
      const res = await fetch('/api/admin/normalize-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.token,
        },
        body: JSON.stringify({ execute: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setIdSuccess(data.messageAr || data.message || `تم تطبيع المعرّفات بنجاح ✓`);
        await scanIds();
      } else {
        const errData = await res.json().catch(() => ({}));
        setIdError(errData.message || errData.messageAr || 'فشل في تنفيذ التطبيع');
      }
    } catch {
      setIdError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIdExecuting(false);
    }
  }, [session?.token, scanIds]);

  const scanLineage = useCallback(async () => {
    if (!session?.token) return;
    setLineageScanning(true);
    setLineageError(null);
    setLineageSuccess(null);
    setLineagePreview([]);

    try {
      const res = await fetch('/api/admin/fix-lineage', {
        headers: { Authorization: 'Bearer ' + session.token },
      });

      if (res.ok) {
        const data = await res.json();
        setLineageScanResult({
          issues: data.issues || [],
          summary: data.summary || { arabicInEnglish: 0, incompleteLineage: 0, missingAncestorNames: 0 },
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        setLineageError(errData.messageAr || errData.message || 'فشل في فحص الأسماء');
      }
    } catch {
      setLineageError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLineageScanning(false);
    }
  }, [session?.token]);

  const previewLineageFix = useCallback(async () => {
    if (!session?.token) return;
    setLineagePreviewing(true);
    setLineageError(null);

    try {
      const res = await fetch('/api/admin/fix-lineage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.token,
        },
        body: JSON.stringify({ fixAll: true, preview: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setLineagePreview(data.results || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setLineageError(errData.messageAr || errData.message || 'فشل في المعاينة');
      }
    } catch {
      setLineageError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLineagePreviewing(false);
    }
  }, [session?.token]);

  const executeLineageFix = useCallback(async () => {
    if (!session?.token) return;
    if (!confirm('هل أنت متأكد من إصلاح جميع الأسماء الإنجليزية؟\n\nAre you sure you want to fix all English names?')) return;

    setLineageExecuting(true);
    setLineageError(null);
    setLineageSuccess(null);

    try {
      const res = await fetch('/api/admin/fix-lineage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.token,
        },
        body: JSON.stringify({ fixAll: true, preview: false }),
      });

      if (res.ok) {
        const data = await res.json();
        setLineageSuccess(data.messageAr || `تم إصلاح ${data.changedCount || 0} اسم بنجاح ✓`);
        setLineagePreview([]);
        await scanLineage();
      } else {
        const errData = await res.json().catch(() => ({}));
        setLineageError(errData.messageAr || errData.message || 'فشل في تنفيذ الإصلاح');
      }
    } catch {
      setLineageError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLineageExecuting(false);
    }
  }, [session?.token, scanLineage]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" dir="rtl">
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 rotate-180" />
          العودة للوحة التحكم
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Hash className="w-7 h-7 text-indigo-600" />
          مركز إصلاح البيانات
          <span className="text-base font-normal text-gray-500">Data Repair Center</span>
        </h1>
        <p className="text-gray-600 mt-2">
          أدوات شاملة لإصلاح وتطبيع البيانات في قاعدة البيانات
        </p>
      </div>

      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4">
            <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              <Hash className="w-5 h-5" />
              تطبيع المعرّفات
              <span className="text-sm font-normal text-indigo-600">ID Normalization</span>
            </h2>
            <p className="text-sm text-indigo-700 mt-1">
              إصلاح تناقضات صيغة المعرّفات (مثلاً P001 مقابل P0001)
            </p>
          </div>

          <div className="p-6">
            {idError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                {idError}
              </div>
            )}

            {idSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                <Check className="w-5 h-5 flex-shrink-0" />
                {idSuccess}
              </div>
            )}

            <div className="mb-6">
              <button
                onClick={scanIds}
                disabled={idScanning}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                {idScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {idScanning ? 'جاري الفحص...' : 'فحص المعرّفات'}
              </button>
            </div>

            {idScanResult && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-blue-700">{idScanResult.totalMembers}</div>
                    <div className="text-xs text-blue-600">إجمالي الأعضاء</div>
                  </div>
                  <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
                    <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-red-700">{idScanResult.inconsistentCount}</div>
                    <div className="text-xs text-red-600">معرّفات غير متسقة</div>
                  </div>
                  <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-green-700">{idScanResult.consistentCount}</div>
                    <div className="text-xs text-green-600">معرّفات متسقة</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 text-center">
                    <Table className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-amber-700">{idScanResult.affectedTables}</div>
                    <div className="text-xs text-amber-600">جداول متأثرة</div>
                  </div>
                </div>

                {idScanResult.changes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      معاينة التغييرات ({idScanResult.changes.length})
                    </h3>
                    <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-right text-gray-600 font-medium">#</th>
                            <th className="px-4 py-2 text-right text-gray-600 font-medium">المعرّف الحالي</th>
                            <th className="px-4 py-2 text-center text-gray-400 font-medium">←</th>
                            <th className="px-4 py-2 text-right text-gray-600 font-medium">المعرّف الجديد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {idScanResult.changes.map((change, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-2 font-mono text-red-600 bg-red-50">{change.oldId}</td>
                              <td className="px-4 py-2 text-center text-gray-400">
                                <ArrowRight className="w-4 h-4 mx-auto" />
                              </td>
                              <td className="px-4 py-2 font-mono text-green-600 bg-green-50">{change.newId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {idScanResult.inconsistentCount > 0 && (
                  <button
                    onClick={executeIdNormalization}
                    disabled={idExecuting}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    {idExecuting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {idExecuting ? 'جاري التنفيذ...' : 'تنفيذ التطبيع'}
                  </button>
                )}

                {idScanResult.inconsistentCount === 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    جميع المعرّفات متسقة ✓
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
            <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
              <Languages className="w-5 h-5" />
              إصلاح الأسماء الإنجليزية
              <span className="text-sm font-normal text-amber-600">English Name Repair</span>
            </h2>
            <p className="text-sm text-amber-700 mt-1">
              إصلاح الأعضاء الذين يحتوي اسمهم الإنجليزي على أحرف عربية
            </p>
          </div>

          <div className="p-6">
            {lineageError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                {lineageError}
              </div>
            )}

            {lineageSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                <Check className="w-5 h-5 flex-shrink-0" />
                {lineageSuccess}
              </div>
            )}

            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={scanLineage}
                disabled={lineageScanning}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                {lineageScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {lineageScanning ? 'جاري الفحص...' : 'فحص الأسماء'}
              </button>
            </div>

            {lineageScanResult && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
                    <div className="text-2xl font-bold text-red-700">{lineageScanResult.summary.arabicInEnglish}</div>
                    <div className="text-xs text-red-600">نص عربي في الاسم الإنجليزي</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg border border-orange-200 p-4 text-center">
                    <div className="text-2xl font-bold text-orange-700">{lineageScanResult.summary.incompleteLineage}</div>
                    <div className="text-xs text-orange-600">سلسلة نسب ناقصة</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-700">{lineageScanResult.summary.missingAncestorNames}</div>
                    <div className="text-xs text-yellow-600">أسماء أجداد مفقودة</div>
                  </div>
                </div>

                {lineageScanResult.summary.arabicInEnglish > 0 && lineagePreview.length === 0 && (
                  <div className="mb-6">
                    <button
                      onClick={previewLineageFix}
                      disabled={lineagePreviewing}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      {lineagePreviewing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      {lineagePreviewing ? 'جاري المعاينة...' : 'معاينة الإصلاحات'}
                    </button>
                  </div>
                )}

                {lineagePreview.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      معاينة التغييرات ({lineagePreview.filter(r => r.changed).length} تغيير)
                    </h3>
                    <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-right text-gray-600 font-medium">المعرّف</th>
                            <th className="px-4 py-2 text-right text-gray-600 font-medium">الاسم</th>
                            <th className="px-4 py-2 text-right text-gray-600 font-medium">الاسم الإنجليزي الحالي</th>
                            <th className="px-4 py-2 text-center text-gray-400 font-medium">←</th>
                            <th className="px-4 py-2 text-right text-gray-600 font-medium">الاسم الإنجليزي الجديد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lineagePreview.map((result) => (
                            <tr
                              key={result.id}
                              className={result.changed ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'}
                            >
                              <td className="px-4 py-2 font-mono text-gray-500 text-xs">{result.id}</td>
                              <td className="px-4 py-2 text-gray-800">{result.firstName}</td>
                              <td className="px-4 py-2 text-red-600" dir="ltr">{result.oldFullNameEn || '—'}</td>
                              <td className="px-4 py-2 text-center text-gray-400">
                                {result.changed && <ArrowRight className="w-4 h-4 mx-auto" />}
                              </td>
                              <td className="px-4 py-2 text-green-600 font-medium" dir="ltr">{result.newFullNameEn || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {lineagePreview.length > 0 && lineagePreview.some(r => r.changed) && (
                  <button
                    onClick={executeLineageFix}
                    disabled={lineageExecuting}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    {lineageExecuting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {lineageExecuting ? 'جاري التنفيذ...' : 'تنفيذ الإصلاح'}
                  </button>
                )}

                {lineageScanResult.summary.arabicInEnglish === 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    جميع الأسماء الإنجليزية سليمة ✓
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}