'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock, Users, Link2, Unlink, AlertCircle, CheckCircle,
  Search, Loader2, ChevronDown, ChevronRight, GitBranch,
  User, ArrowRight, ArrowLeft, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import GenderAvatar from '@/components/GenderAvatar';

interface PendingMember {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string;
  proposedFatherId: string | null;
  parentPendingId: string | null;
  gender: string;
  birthYear: number | null;
  generation: number;
  branch: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  occupation: string | null;
  email: string | null;
  submittedVia: string | null;
  submittedAt: string;
  reviewStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  parentPending?: PendingMember | null;
  childrenPending?: PendingMember[];
}

interface Stats {
  totalConditional: number;
  pendingParents: number;
  childrenWaiting: number;
  uniqueParents: number;
}

export default function ConditionalApprovalsPage() {
  const [conditionalPending, setConditionalPending] = useState<PendingMember[]>([]);
  const [parentMembers, setParentMembers] = useState<PendingMember[]>([]);
  const [eligibleParents, setEligibleParents] = useState<PendingMember[]>([]);
  const [allPending, setAllPending] = useState<PendingMember[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalConditional: 0,
    pendingParents: 0,
    childrenWaiting: 0,
    uniqueParents: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkModal, setLinkModal] = useState<{
    member: PendingMember;
    searchQuery: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const fetchData = useCallback(async () => {
    if (!session?.token) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/conditional-pending', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConditionalPending(data.conditionalPending || []);
        setParentMembers(data.parentMembers || []);
        setEligibleParents(data.eligibleParents || []);
        setAllPending(data.allPending || []);
        setStats(data.stats || {
          totalConditional: 0,
          pendingParents: 0,
          childrenWaiting: 0,
          uniqueParents: 0,
        });
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في تحميل البيانات');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLink = async (memberId: string, parentPendingId: string) => {
    if (!session?.token) {
      alert('الجلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/conditional-pending/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ action: 'link', parentPendingId }),
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.messageAr || 'تم الربط بنجاح');
        setLinkModal(null);
        await fetchData();
      } else {
        alert(data.messageAr || data.message || 'حدث خطأ أثناء الربط');
      }
    } catch (err) {
      console.error('Error linking member:', err);
      alert('حدث خطأ أثناء الربط. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlink = async (memberId: string) => {
    if (!session?.token) {
      alert('الجلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    if (!confirm('هل تريد فك ربط هذا العضو من الأب المعلق؟')) {
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/conditional-pending/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ action: 'unlink' }),
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.messageAr || 'تم فك الربط بنجاح');
        await fetchData();
      } else {
        alert(data.messageAr || data.message || 'حدث خطأ أثناء فك الربط');
      }
    } catch (err) {
      console.error('Error unlinking member:', err);
      alert('حدث خطأ أثناء فك الربط. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleChain = (id: string) => {
    setExpandedChains((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredConditional = useMemo(() => {
    if (!searchQuery) return conditionalPending;
    const query = searchQuery.toLowerCase();
    return conditionalPending.filter((m) =>
      m.firstName.toLowerCase().includes(query) ||
      (m.fullNameAr && m.fullNameAr.toLowerCase().includes(query)) ||
      (m.fatherName && m.fatherName.toLowerCase().includes(query)) ||
      (m.parentPending?.firstName && m.parentPending.firstName.toLowerCase().includes(query))
    );
  }, [conditionalPending, searchQuery]);

  const filteredEligibleParents = useMemo(() => {
    if (!linkModal) return [];
    const query = linkModal.searchQuery.toLowerCase();
    return eligibleParents.filter(
      (p) =>
        p.id !== linkModal.member.id &&
        (p.firstName.toLowerCase().includes(query) ||
          (p.fullNameAr && p.fullNameAr.toLowerCase().includes(query)))
    );
  }, [eligibleParents, linkModal]);

  const chainGroups = useMemo(() => {
    const rootParents = parentMembers.filter((p) => !p.parentPendingId);
    const groups: { parent: PendingMember; children: PendingMember[]; depth: number }[] = [];

    const buildChain = (parent: PendingMember, depth: number = 0) => {
      const children = conditionalPending.filter((c) => c.parentPendingId === parent.id);
      groups.push({ parent, children, depth });
      
      children.forEach((child) => {
        const grandchildren = conditionalPending.filter((gc) => gc.parentPendingId === child.id);
        if (grandchildren.length > 0) {
          buildChain(child, depth + 1);
        }
      });
    };

    rootParents.forEach((parent) => buildChain(parent));

    const orphanedChildren = conditionalPending.filter(
      (c) => c.parentPendingId && !parentMembers.some((p) => p.id === c.parentPendingId)
    );
    if (orphanedChildren.length > 0) {
      groups.push({
        parent: {
          id: 'orphaned',
          firstName: 'أبناء بدون أب معلق',
          fullNameAr: 'أبناء مرتبطين بأب غير موجود',
        } as PendingMember,
        children: orphanedChildren,
        depth: 0,
      });
    }

    return groups;
  }, [parentMembers, conditionalPending]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6" dir="rtl">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <GitBranch className="text-purple-500" size={28} />
              الموافقات المشروطة
            </h1>
            <p className="text-gray-500 mt-1">إدارة الأعضاء المعلقين المرتبطين بأعضاء معلقين آخرين</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              تحديث
            </button>
            <Link
              href="/admin/pending"
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Clock size={18} />
              جميع المعلقين
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <GitBranch className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalConditional}</p>
                <p className="text-sm text-gray-500">إجمالي المشروط</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.uniqueParents}</p>
                <p className="text-sm text-gray-500">الآباء المعلقين</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Users className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.childrenWaiting}</p>
                <p className="text-sm text-gray-500">الأبناء المنتظرين</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{allPending.length}</p>
                <p className="text-sm text-gray-500">إجمالي المعلقين</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو اسم الأب المعلق..."
              className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {chainGroups.length === 0 && !searchQuery ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <GitBranch className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد موافقات مشروطة</h3>
            <p className="text-gray-500">
              لم يتم العثور على أعضاء معلقين مرتبطين بأعضاء معلقين آخرين
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chainGroups.map((group) => (
              <div key={group.parent.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <button
                  onClick={() => toggleChain(group.parent.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {group.parent.id !== 'orphaned' ? (
                      <GenderAvatar gender={group.parent.gender} size="md" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertCircle className="text-red-500" size={20} />
                      </div>
                    )}
                    <div className="text-right">
                      <h3 className="font-semibold text-gray-800">
                        {group.parent.fullNameAr || group.parent.firstName}
                      </h3>
                      {group.parent.id !== 'orphaned' && (
                        <p className="text-sm text-gray-500">
                          {group.parent.branch || 'بدون فرع'} • {group.parent.birthYear || 'غير محدد'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {group.children.length} {group.children.length === 1 ? 'ابن' : 'أبناء'}
                    </span>
                    {expandedChains.has(group.parent.id) ? (
                      <ChevronDown className="text-gray-400" size={20} />
                    ) : (
                      <ChevronRight className="text-gray-400" size={20} />
                    )}
                  </div>
                </button>

                {expandedChains.has(group.parent.id) && (
                  <div className="border-t bg-gray-50">
                    {group.parent.id !== 'orphaned' && (
                      <div className="p-4 border-b bg-purple-50">
                        <div className="flex items-center gap-2 text-purple-700 mb-2">
                          <User size={16} />
                          <span className="font-medium">الأب المعلق</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GenderAvatar gender={group.parent.gender} size="sm" />
                            <div>
                              <p className="font-medium text-gray-800">{group.parent.firstName}</p>
                              <p className="text-sm text-gray-500">
                                {group.parent.city || 'مدينة غير محددة'}
                              </p>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            تاريخ التقديم:{' '}
                            {new Date(group.parent.submittedAt).toLocaleDateString('ar-SA')}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-center gap-2 text-gray-600 mb-3">
                        <Users size={16} />
                        <span className="font-medium">الأبناء المنتظرين</span>
                      </div>
                      <div className="space-y-3">
                        {group.children.map((child) => (
                          <div
                            key={child.id}
                            className="bg-white rounded-lg border p-4 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center">
                                <div className="w-8 h-0.5 bg-purple-300" />
                                <ArrowLeft className="text-purple-400" size={16} />
                              </div>
                              <GenderAvatar gender={child.gender} size="sm" />
                              <div>
                                <p className="font-medium text-gray-800">
                                  {child.fullNameAr || child.firstName}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {child.city || 'مدينة غير محددة'} •{' '}
                                  {child.birthYear || 'سنة غير محددة'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setLinkModal({ member: child, searchQuery: '' })}
                                disabled={isProcessing}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="تغيير الأب المعلق"
                              >
                                <Link2 size={18} />
                              </button>
                              <button
                                onClick={() => handleUnlink(child.id)}
                                disabled={isProcessing}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="فك الربط"
                              >
                                <Unlink size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredConditional.length > 0 && searchQuery && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-800">نتائج البحث</h3>
                </div>
                <div className="p-4 space-y-3">
                  {filteredConditional.map((member) => (
                    <div
                      key={member.id}
                      className="bg-gray-50 rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GenderAvatar gender={member.gender} size="sm" />
                          <div>
                            <p className="font-medium text-gray-800">
                              {member.fullNameAr || member.firstName}
                            </p>
                            {member.parentPending && (
                              <p className="text-sm text-purple-600 flex items-center gap-1">
                                <ArrowRight size={14} />
                                ينتظر: {member.parentPending.fullNameAr || member.parentPending.firstName}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setLinkModal({ member, searchQuery: '' })}
                            disabled={isProcessing}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تغيير الأب المعلق"
                          >
                            <Link2 size={18} />
                          </button>
                          {member.parentPendingId && (
                            <button
                              onClick={() => handleUnlink(member.id)}
                              disabled={isProcessing}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="فك الربط"
                            >
                              <Unlink size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {linkModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-800">
                  ربط "{linkModal.member.firstName}" بأب معلق
                </h3>
                <p className="text-sm text-gray-500">
                  اختر الأب المعلق الذي سينتظره هذا العضو
                </p>
              </div>

              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={linkModal.searchQuery}
                    onChange={(e) =>
                      setLinkModal({ ...linkModal, searchQuery: e.target.value })
                    }
                    placeholder="ابحث عن الأب المعلق..."
                    className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="overflow-y-auto max-h-[40vh]">
                {filteredEligibleParents.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <User className="mx-auto text-gray-300 mb-2" size={32} />
                    <p>لم يتم العثور على آباء معلقين</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredEligibleParents.map((parent) => (
                      <button
                        key={parent.id}
                        onClick={() => handleLink(linkModal.member.id, parent.id)}
                        disabled={isProcessing}
                        className="w-full p-4 flex items-center gap-3 hover:bg-purple-50 transition-colors text-right"
                      >
                        <GenderAvatar gender={parent.gender} size="sm" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {parent.fullNameAr || parent.firstName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {parent.branch || 'بدون فرع'} • {parent.city || 'مدينة غير محددة'}
                          </p>
                        </div>
                        <Link2 className="text-purple-400" size={18} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                <button
                  onClick={() => setLinkModal(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-xl flex items-center gap-3">
              <Loader2 className="animate-spin text-purple-500" size={24} />
              <span className="text-gray-700">جاري المعالجة...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
