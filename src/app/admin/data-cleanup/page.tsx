'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Users,
  Loader2,
  XCircle,
  UserX,
  GitBranch,
  Check,
} from 'lucide-react';
import { formatMemberId } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface DuplicateIssue {
  type: 'different_fathers' | 'generation_gap';
  severity: 'error' | 'warning';
  description: string;
  descriptionAr: string;
}

interface DuplicateMember {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  generation: number;
  branch: string | null;
  fatherId: string | null;
  fatherName: string | null;
}

interface DuplicateGroup {
  fullName: string;
  members: DuplicateMember[];
  issues: DuplicateIssue[];
}

interface Summary {
  totalGroups: number;
  totalMembers: number;
  differentFathersCount: number;
  generationGapCount: number;
  verifiedPairsCount: number;
}

type FilterType = 'all' | 'different_fathers' | 'generation_gap';

export default function DataCleanupPage() {
  const { session } = useAuth();
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [resolvingPair, setResolvingPair] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!session?.token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/data-cleanup', {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('فشل في جلب البيانات');
      }

      const data = await response.json();

      if (data.success) {
        setGroups(data.groups || []);
        setSummary(data.summary || null);
        setExpandedGroups(new Set(data.groups?.slice(0, 3).map((g: DuplicateGroup) => g.fullName) || []));
      } else {
        throw new Error(data.error || 'فشل في جلب البيانات');
      }
    } catch (err) {
      console.error('Error fetching data cleanup:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkNotDuplicate = async (member1Id: string, member2Id: string) => {
    if (!session?.token) return;
    
    const pairKey = `${member1Id}:${member2Id}`;
    setResolvingPair(pairKey);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/admin/data-cleanup/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          member1Id,
          member2Id,
          action: 'mark_not_duplicate',
          reason: 'Verified as different people via data cleanup tool'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.messageAr || 'تم التأكيد بنجاح');
        await fetchData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(data.errorAr || data.error || 'فشل في التأكيد');
      }
    } catch (err) {
      console.error('Error marking not duplicate:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setResolvingPair(null);
    }
  };

  const toggleGroup = (fullName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(fullName)) {
        next.delete(fullName);
      } else {
        next.add(fullName);
      }
      return next;
    });
  };

  const filteredGroups = groups.filter(g => {
    if (filter === 'different_fathers') {
      return g.issues.some(i => i.type === 'different_fathers');
    }
    if (filter === 'generation_gap') {
      return g.issues.some(i => i.type === 'generation_gap');
    }
    return true;
  });

  if (isLoading && groups.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري فحص البيانات للعثور على التكرارات...</p>
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
            onClick={fetchData}
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
          <span className="text-gray-800">تنظيف البيانات</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">تنظيف البيانات المكررة</h1>
              <p className="text-gray-500 text-sm">فحص وتأكيد الأعضاء المتشابهين بالاسم</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-green-700">{successMessage}</span>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-gray-800">{summary.totalGroups}</div>
            <div className="text-sm text-gray-500">مجموعات متشابهة</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-gray-800">{summary.totalMembers}</div>
            <div className="text-sm text-gray-500">أعضاء متأثرين</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
            <div className="text-2xl font-bold text-red-600">{summary.differentFathersCount}</div>
            <div className="text-sm text-gray-500">آباء مختلفون</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
            <div className="text-2xl font-bold text-orange-600">{summary.generationGapCount}</div>
            <div className="text-sm text-gray-500">فجوة أجيال</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
            <div className="text-2xl font-bold text-green-600">{summary.verifiedPairsCount}</div>
            <div className="text-sm text-gray-500">تم التحقق</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">تصفية:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                الكل ({groups.length})
              </button>
              <button
                onClick={() => setFilter('different_fathers')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === 'different_fathers'
                    ? 'bg-red-500 text-white'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                آباء مختلفون ({summary?.differentFathersCount || 0})
              </button>
              <button
                onClick={() => setFilter('generation_gap')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === 'generation_gap'
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                }`}
              >
                فجوة أجيال ({summary?.generationGapCount || 0})
              </button>
            </div>
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">لا توجد تكرارات محتملة</h3>
            <p className="text-gray-500">جميع الأعضاء المتشابهين بالاسم تم التحقق منهم</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredGroups.map((group) => (
              <div key={group.fullName} className="p-4">
                <button
                  onClick={() => toggleGroup(group.fullName)}
                  className="w-full flex items-center justify-between text-right hover:bg-gray-50 p-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold text-gray-800">{group.fullName}</span>
                    <span className="text-sm text-gray-500">({group.members.length} أعضاء)</span>
                    <div className="flex gap-2">
                      {group.issues.map((issue, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            issue.type === 'different_fathers'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {issue.type === 'different_fathers' ? 'آباء مختلفون' : 'فجوة أجيال'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronLeft className={`w-5 h-5 text-gray-400 transition-transform ${expandedGroups.has(group.fullName) ? 'rotate-90' : '-rotate-90'}`} />
                </button>

                {expandedGroups.has(group.fullName) && (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3">
                      {group.members.map((member) => (
                        <div
                          key={member.id}
                          className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Link
                                href={`/member/${member.id}`}
                                className="font-medium text-[#1E3A5F] hover:underline"
                              >
                                {member.fullNameAr || member.firstName}
                              </Link>
                              <span className="text-xs text-gray-400">#{formatMemberId(member.id)}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <GitBranch className="w-3 h-3" />
                                الجيل {member.generation}
                              </span>
                              {member.fatherName && (
                                <span className="flex items-center gap-1">
                                  <UserX className="w-3 h-3" />
                                  الأب: {member.fatherName}
                                </span>
                              )}
                              {member.branch && (
                                <span>الفرع: {member.branch}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {group.members.length >= 2 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">تأكيد الاختلاف:</h4>
                        <div className="space-y-2">
                          {group.members.map((m1, i) => 
                            group.members.slice(i + 1).map((m2) => {
                              const pairKey = `${m1.id}:${m2.id}`;
                              const isResolving = resolvingPair === pairKey;
                              return (
                                <div
                                  key={pairKey}
                                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3"
                                >
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-600">{m1.fullNameAr || m1.firstName}</span>
                                    <span className="text-gray-400">↔</span>
                                    <span className="text-gray-600">{m2.fullNameAr || m2.firstName}</span>
                                    {m1.fatherId !== m2.fatherId && m1.fatherId && m2.fatherId && (
                                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                        آباء مختلفون
                                      </span>
                                    )}
                                    {Math.abs(m1.generation - m2.generation) >= 2 && (
                                      <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                                        فرق {Math.abs(m1.generation - m2.generation)} أجيال
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleMarkNotDuplicate(m1.id, m2.id)}
                                    disabled={isResolving}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                                  >
                                    {isResolving ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                    <span>تأكيد اختلاف</span>
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 mb-1">ملاحظة</h3>
            <p className="text-sm text-blue-700">
              هذه الأداة تساعد في العثور على أعضاء لديهم نفس الاسم ولكن قد يكونون أشخاصاً مختلفين بسبب اختلاف الأب أو فجوة كبيرة في الأجيال.
              تأكيد الاختلاف سيمنع ظهور هذه الحالات في الفحوصات المستقبلية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
