'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  Merge,
  Search,
  AlertTriangle,
  Check,
  X,
  Users,
  ChevronLeft,
  Loader2,
  ArrowRight,
  RefreshCw,
  Info,
  GitMerge,
} from 'lucide-react';

interface MemberInfo {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  generation: number;
  branch: string | null;
  birthYear: number | null;
  gender: string;
}

interface MergeConflict {
  field: string;
  fieldAr: string;
  sourceValue: string | number | null;
  targetValue: string | number | null;
  recommendation: 'keep_source' | 'keep_target' | 'manual';
}

interface MergePreview {
  source: MemberInfo;
  target: MemberInfo;
  conflicts: MergeConflict[];
  impactedChildren: { id: string; firstName: string }[];
  impactedPhotos: number;
  impactedJournals: number;
  warnings: string[];
  warningsAr: string[];
}

interface SearchResult {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  generation: number;
  branch: string | null;
}

export default function MergeToolPage() {
  const { session } = useAuth();
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [sourceResults, setSourceResults] = useState<SearchResult[]>([]);
  const [targetResults, setTargetResults] = useState<SearchResult[]>([]);
  const [selectedSource, setSelectedSource] = useState<SearchResult | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<SearchResult | null>(null);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [keepSourceFields, setKeepSourceFields] = useState<string[]>([]);
  const [mergeReason, setMergeReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const searchMembers = useCallback(async (query: string, type: 'source' | 'target') => {
    if (!query.trim() || query.length < 2 || !session?.token) {
      if (type === 'source') setSourceResults([]);
      else setTargetResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/members/search?q=${encodeURIComponent(query)}&limit=10`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const results = (data.results || data.data || []).map((m: SearchResult) => ({
          id: m.id,
          firstName: m.firstName,
          fullNameAr: m.fullNameAr,
          fullNameEn: m.fullNameEn,
          generation: m.generation,
          branch: m.branch,
        }));
        if (type === 'source') setSourceResults(results);
        else setTargetResults(results);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }, [session?.token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchMembers(sourceSearch, 'source');
    }, 300);
    return () => clearTimeout(timer);
  }, [sourceSearch, searchMembers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchMembers(targetSearch, 'target');
    }, 300);
    return () => clearTimeout(timer);
  }, [targetSearch, searchMembers]);

  const handleSelectSource = (member: SearchResult) => {
    setSelectedSource(member);
    setSourceId(member.id);
    setSourceSearch(member.fullNameAr || member.firstName);
    setSourceResults([]);
    setPreview(null);
    setSuccess(null);
  };

  const handleSelectTarget = (member: SearchResult) => {
    setSelectedTarget(member);
    setTargetId(member.id);
    setTargetSearch(member.fullNameAr || member.firstName);
    setTargetResults([]);
    setPreview(null);
    setSuccess(null);
  };

  const generatePreview = async () => {
    if (!sourceId || !targetId) {
      setError('يرجى تحديد العضو المصدر والعضو الهدف');
      return;
    }

    if (sourceId === targetId) {
      setError('لا يمكن دمج العضو مع نفسه');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}`,
        },
        body: JSON.stringify({
          action: 'preview',
          sourceId,
          targetId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPreview(data.preview);
      } else {
        setError(data.messageAr || data.message || 'فشل في إنشاء المعاينة');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  const executeMerge = async () => {
    if (!preview) return;

    if (!mergeReason.trim()) {
      setError('يرجى إدخال سبب الدمج');
      return;
    }

    setIsMerging(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}`,
        },
        body: JSON.stringify({
          action: 'merge',
          sourceId,
          targetId,
          keepSourceFields,
          reason: mergeReason,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(`تم دمج "${selectedSource?.fullNameAr}" في "${selectedTarget?.fullNameAr}" بنجاح. تم تحديث ${data.impactSummary?.childrenUpdated || 0} أبناء و ${data.impactSummary?.photosTransferred || 0} صور.`);
        setPreview(null);
        setSelectedSource(null);
        setSelectedTarget(null);
        setSourceId('');
        setTargetId('');
        setSourceSearch('');
        setTargetSearch('');
        setMergeReason('');
        setKeepSourceFields([]);
      } else {
        setError(data.messageAr || data.message || 'فشل في الدمج');
      }
    } catch (err) {
      console.error('Merge error:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsMerging(false);
    }
  };

  const toggleKeepSourceField = (field: string) => {
    setKeepSourceFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="hover:text-gray-700">لوحة التحكم</Link>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-gray-800 font-medium">أداة دمج الأعضاء</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <GitMerge className="w-6 h-6 text-purple-500" />
            <h1 className="text-xl font-bold">دمج الأعضاء المكررين</h1>
          </div>
          <p className="text-gray-600">
            استخدم هذه الأداة لدمج عضوين مكررين. سيتم الاحتفاظ بالعضو الهدف ونقل جميع البيانات (الأبناء، الصور، اليوميات) إليه.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="text-red-500" size={20} />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="mr-auto">
              <X size={18} className="text-red-400 hover:text-red-600" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Check className="text-green-500" size={20} />
            <span className="text-green-700">{success}</span>
            <button onClick={() => setSuccess(null)} className="mr-auto">
              <X size={18} className="text-green-400 hover:text-green-600" />
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-sm font-bold">1</div>
              العضو المصدر (سيتم حذفه)
            </h2>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={sourceSearch}
                onChange={(e) => {
                  setSourceSearch(e.target.value);
                  setSelectedSource(null);
                  setSourceId('');
                }}
                placeholder="ابحث عن العضو المكرر..."
                className="w-full pr-10 pl-4 py-3 border rounded-lg focus:outline-none focus:border-red-500"
              />
              {sourceResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {sourceResults.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectSource(member)}
                      className="w-full text-right p-3 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="font-medium">{member.fullNameAr || member.firstName}</div>
                      <div className="text-sm text-gray-500">
                        {member.id} - الجيل {member.generation}
                        {member.branch && ` - ${member.branch}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedSource && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="font-medium text-red-800">{selectedSource.fullNameAr}</div>
                <div className="text-sm text-red-600">{selectedSource.fullNameEn}</div>
                <div className="text-xs text-red-500 mt-1">
                  {selectedSource.id} - الجيل {selectedSource.generation}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">2</div>
              العضو الهدف (سيتم الاحتفاظ به)
            </h2>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={targetSearch}
                onChange={(e) => {
                  setTargetSearch(e.target.value);
                  setSelectedTarget(null);
                  setTargetId('');
                }}
                placeholder="ابحث عن العضو الأصلي..."
                className="w-full pr-10 pl-4 py-3 border rounded-lg focus:outline-none focus:border-green-500"
              />
              {targetResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {targetResults.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectTarget(member)}
                      className="w-full text-right p-3 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="font-medium">{member.fullNameAr || member.firstName}</div>
                      <div className="text-sm text-gray-500">
                        {member.id} - الجيل {member.generation}
                        {member.branch && ` - ${member.branch}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedTarget && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="font-medium text-green-800">{selectedTarget.fullNameAr}</div>
                <div className="text-sm text-green-600">{selectedTarget.fullNameEn}</div>
                <div className="text-xs text-green-500 mt-1">
                  {selectedTarget.id} - الجيل {selectedTarget.generation}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedSource && selectedTarget && !preview && (
          <div className="flex justify-center mb-6">
            <button
              onClick={generatePreview}
              disabled={isLoading}
              className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
              معاينة الدمج
            </button>
          </div>
        )}

        {preview && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Info className="text-blue-500" size={20} />
              معاينة عملية الدمج
            </h2>

            {preview.warningsAr.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="text-yellow-600" size={18} />
                  <span className="font-medium text-yellow-800">تحذيرات</span>
                </div>
                <ul className="list-disc list-inside text-yellow-700 space-y-1">
                  {preview.warningsAr.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <Users className="mx-auto text-blue-500 mb-2" size={24} />
                <div className="text-2xl font-bold text-blue-700">{preview.impactedChildren.length}</div>
                <div className="text-sm text-blue-600">أبناء سيتم نقلهم</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <Merge className="mx-auto text-purple-500 mb-2" size={24} />
                <div className="text-2xl font-bold text-purple-700">{preview.impactedPhotos}</div>
                <div className="text-sm text-purple-600">صور سيتم نقلها</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <RefreshCw className="mx-auto text-green-500 mb-2" size={24} />
                <div className="text-2xl font-bold text-green-700">{preview.impactedJournals}</div>
                <div className="text-sm text-green-600">يوميات سيتم تحديثها</div>
              </div>
            </div>

            {preview.conflicts.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium mb-3">حل التعارضات:</h3>
                <div className="space-y-3">
                  {preview.conflicts.map((conflict) => (
                    <div key={conflict.field} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{conflict.fieldAr}</span>
                        <div className="text-sm text-gray-500">
                          المصدر: {conflict.sourceValue || '-'} | الهدف: {conflict.targetValue || '-'}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleKeepSourceField(conflict.field)}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          keepSourceFields.includes(conflict.field)
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {keepSourceFields.includes(conflict.field) ? 'استخدام المصدر' : 'استخدام الهدف'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block font-medium mb-2">سبب الدمج (مطلوب):</label>
              <input
                type="text"
                value={mergeReason}
                onChange={(e) => setMergeReason(e.target.value)}
                placeholder="مثال: عضو مكرر تمت إضافته بالخطأ"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={executeMerge}
                disabled={isMerging || !mergeReason.trim()}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                {isMerging ? <Loader2 className="animate-spin" size={20} /> : <GitMerge size={20} />}
                تنفيذ الدمج
              </button>
              <button
                onClick={() => setPreview(null)}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
