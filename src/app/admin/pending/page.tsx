'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FamilyMember } from '@/lib/types';
import {
  Check, X, Edit2, Clock, User, Filter, Trash2,
  ChevronDown, ChevronRight, AlertCircle, CheckCircle, XCircle,
  Save, RotateCcw, Search, GitBranch, Users, TreePine, Loader2,
  Eye, Link2, UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import GenderAvatar from '@/components/GenderAvatar';
import { identifyBranchForPendingMember, getFullLineageString } from '@/lib/lineage-utils';
import { formatPhoneDisplay } from '@/lib/phone-utils';

type FilterStatus = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface DbPendingMember {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string;
  proposedFatherId: string | null;
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
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

function getFullLineageName(member: FamilyMember, allMembers: FamilyMember[], maxDepth: number = 4): string {
  const names: string[] = [member.firstName];
  let current = member;
  let depth = 0;

  while (current.fatherId && depth < maxDepth) {
    const father = allMembers.find(m => m.id === current.fatherId);
    if (father) {
      names.push(father.firstName);
      current = father;
      depth++;
    } else {
      break;
    }
  }

  if (names.length > 1) {
    return names.join(' بن ') + ' آل شايع';
  }
  return member.firstName + ' آل شايع';
}

interface BranchGroup {
  branchHeadId: string;
  branchHeadName: string;
  branchFullName: string;
  generation: number;
  members: DbPendingMember[];
}

export default function AdminPendingPage() {
  const [members, setMembers] = useState<DbPendingMember[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('PENDING');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<DbPendingMember>>({});
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState<{
    type: 'approve' | 'reject' | 'delete';
    ids: string[];
  } | null>(null);
  const [duplicateModal, setDuplicateModal] = useState<{
    pendingId: string;
    pendingName: string;
    duplicateIds: string[];
  } | null>(null);
  const [reviewModal, setReviewModal] = useState<{
    pending: DbPendingMember;
    parent: FamilyMember | null;
    children: FamilyMember[];
  } | null>(null);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { session } = useAuth();

  const fetchPendingMembers = useCallback(async () => {
    if (!session?.token) return;
    try {
      const res = await fetch('/api/admin/pending', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.pending || []);
      }
    } catch (error) {
      console.error('Error fetching pending members:', error);
    }
  }, [session?.token]);

  const fetchAllMembers = useCallback(async () => {
    if (!session?.token) return;
    try {
      const res = await fetch('/api/members?limit=500', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllMembers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching all members:', error);
    }
  }, [session?.token]);

  useEffect(() => {
    async function fetchData() {
      if (!session?.token) return;
      setIsLoading(true);
      try {
        await fetchAllMembers();
        await fetchPendingMembers();
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [session?.token, fetchPendingMembers, fetchAllMembers]);

  const getMemberById = (id: string): FamilyMember | undefined => {
    return allMembers.find(m => m.id === id);
  };

  const getChildrenOfParent = useCallback((parentId: string): FamilyMember[] => {
    return allMembers.filter(m => m.fatherId === parentId);
  }, [allMembers]);

  const openReviewModal = useCallback((member: DbPendingMember) => {
    if (member.proposedFatherId) {
      const parent = getMemberById(member.proposedFatherId) || null;
      const children = getChildrenOfParent(member.proposedFatherId);
      setReviewModal({ pending: member, parent, children });
    } else {
      setReviewModal({ pending: member, parent: null, children: [] });
    }
  }, [getChildrenOfParent]);

  useEffect(() => {
    if (reviewModal && reviewModal.pending.proposedFatherId) {
      const updatedChildren = getChildrenOfParent(reviewModal.pending.proposedFatherId);
      if (updatedChildren.length !== reviewModal.children.length) {
        setReviewModal(prev => prev ? {
          ...prev,
          children: updatedChildren
        } : null);
      }
    }
  }, [allMembers, reviewModal?.pending.proposedFatherId, getChildrenOfParent]);

  const handleLinkToExisting = async (pendingId: string, targetMemberId: string) => {
    if (!session?.token) {
      alert('الجلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/pending/${pendingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ action: 'merge_update', targetMemberId }),
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.messageAr || 'تم ربط العضو بنجاح');
        await fetchPendingMembers();
        setReviewModal(null);
      } else {
        alert(data.messageAr || data.message || 'حدث خطأ أثناء الربط');
      }
    } catch (error) {
      console.error('Error linking member:', error);
      alert('حدث خطأ أثناء الربط. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMembers = useMemo(() => {
    let result = members;

    if (filter !== 'all') {
      result = result.filter(m => m.reviewStatus === filter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.firstName.toLowerCase().includes(query) ||
        (m.fullNameAr && m.fullNameAr.toLowerCase().includes(query)) ||
        (m.fatherName && m.fatherName.toLowerCase().includes(query))
      );
    }

    return result;
  }, [members, filter, searchQuery]);

  const branchGroups = useMemo(() => {
    const groups: Record<string, BranchGroup> = {};

    filteredMembers.forEach(member => {
      // Use the enhanced branch identification with recursive lookup and fuzzy matching
      const branchResult = identifyBranchForPendingMember(
        {
          proposedFatherId: member.proposedFatherId,
          fullNameAr: member.fullNameAr,
          branch: member.branch,
          fatherName: member.fatherName,
          grandfatherName: member.grandfatherName,
        },
        allMembers
      );
      
      const branchId = branchResult?.branchId || 'unknown';
      const branchHead = branchResult?.branchHead;
      
      if (!groups[branchId]) {
        groups[branchId] = {
          branchHeadId: branchId,
          branchHeadName: branchHead?.firstName || 'غير معروف',
          branchFullName: branchHead ? getFullLineageString(branchHead.id, allMembers) : 'فرع غير معروف',
          generation: branchHead?.generation || 0,
          members: [],
        };
      }
      groups[branchId].members.push(member);
    });

    return Object.values(groups).sort((a, b) => a.generation - b.generation);
  }, [filteredMembers, allMembers]);

  const stats = useMemo(() => ({
    total: members.length,
    pending: members.filter(m => m.reviewStatus === 'PENDING').length,
    approved: members.filter(m => m.reviewStatus === 'APPROVED').length,
    rejected: members.filter(m => m.reviewStatus === 'REJECTED').length,
  }), [members]);

  const handleSelectMember = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAllInBranch = (branchHeadId: string) => {
    const group = branchGroups.find(g => g.branchHeadId === branchHeadId);
    if (!group) return;

    const pendingInGroup = group.members.filter(m => m.reviewStatus === 'PENDING');
    const allSelected = pendingInGroup.every(m => selectedIds.has(m.id));

    setSelectedIds(prev => {
      const newSet = new Set(prev);
      pendingInGroup.forEach(m => {
        if (allSelected) {
          newSet.delete(m.id);
        } else {
          newSet.add(m.id);
        }
      });
      return newSet;
    });
  };

  const handleApprove = async (ids: string[]) => {
    if (!session?.token) {
      alert('الجلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    setIsProcessing(true);
    try {
      const results = await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/admin/pending/${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({ action: 'approve' }),
        });
        const data = await res.json();
        return { id, ok: res.ok, data };
      }));
      
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        const duplicateResult = failed.find(f => f.data.isDuplicate && f.data.duplicateIds?.length > 0);
        if (duplicateResult && ids.length === 1) {
          const pending = members.find(m => m.id === duplicateResult.id);
          setDuplicateModal({
            pendingId: duplicateResult.id,
            pendingName: pending?.firstName || 'العضو',
            duplicateIds: duplicateResult.data.duplicateIds,
          });
          setShowConfirmModal(null);
          setIsProcessing(false);
          return;
        }
        
        const errorMessages = failed.map(f => f.data.messageAr || f.data.message || 'خطأ غير معروف').join('\n');
        alert(`فشل في الموافقة على بعض الأعضاء:\n${errorMessages}`);
      }
      
      await fetchAllMembers();
      await fetchPendingMembers();
      setSelectedIds(new Set());
      setShowConfirmModal(null);
    } catch (error) {
      console.error('Error approving members:', error);
      alert('حدث خطأ أثناء الموافقة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeUpdate = async (pendingId: string, targetMemberId: string) => {
    if (!session?.token) {
      alert('الجلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/pending/${pendingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ action: 'merge_update', targetMemberId }),
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.messageAr || 'تم تحديث معلومات العضو بنجاح');
        await fetchAllMembers();
        await fetchPendingMembers();
        setDuplicateModal(null);
      } else {
        alert(data.messageAr || data.message || 'حدث خطأ أثناء التحديث');
      }
    } catch (error) {
      console.error('Error merging member:', error);
      alert('حدث خطأ أثناء التحديث. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOverrideApprove = async (pendingId: string) => {
    if (!session?.token) {
      alert('الجلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/pending/${pendingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ action: 'approve', overrideDuplicateCheck: true }),
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.messageAr || 'تم إضافة العضو بنجاح');
        await fetchAllMembers();
        await fetchPendingMembers();
        setDuplicateModal(null);
      } else {
        alert(data.messageAr || data.message || 'حدث خطأ أثناء الإضافة');
      }
    } catch (error) {
      console.error('Error approving member with override:', error);
      alert('حدث خطأ أثناء الإضافة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!session?.token) {
      alert('الجلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/pending/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ action: 'restore' }),
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.messageAr || 'تم استعادة الطلب للمراجعة');
        await fetchPendingMembers();
      } else {
        alert(data.messageAr || data.message || 'حدث خطأ أثناء الاستعادة');
      }
    } catch (error) {
      console.error('Error restoring member:', error);
      alert('حدث خطأ أثناء الاستعادة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (ids: string[]) => {
    if (!session?.token) {
      alert('الجلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    setIsProcessing(true);
    try {
      const results = await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/admin/pending/${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({ action: 'reject' }),
        });
        const data = await res.json();
        return { id, ok: res.ok, data };
      }));
      
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        const errorMessages = failed.map(f => f.data.messageAr || f.data.message || 'خطأ غير معروف').join('\n');
        alert(`فشل في رفض بعض الأعضاء:\n${errorMessages}`);
      }
      
      await fetchPendingMembers();
      setSelectedIds(new Set());
      setShowConfirmModal(null);
    } catch (error) {
      console.error('Error rejecting members:', error);
      alert('حدث خطأ أثناء الرفض. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!session?.token) return;
    setIsProcessing(true);
    try {
      await Promise.all(ids.map(id =>
        fetch(`/api/admin/pending/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.token}` },
        })
      ));
      await fetchPendingMembers();
      setSelectedIds(new Set());
      setShowConfirmModal(null);
    } catch (error) {
      console.error('Error deleting members:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (member: DbPendingMember) => {
    setEditingId(member.id);
    setEditData({
      firstName: member.firstName,
      birthYear: member.birthYear,
      city: member.city,
      phone: member.phone,
      occupation: member.occupation,
    });
  };

  const handleSaveEdit = async (id: string) => {
    setEditingId(null);
    setEditData({});
  };

  const statusColors = {
    PENDING: 'bg-orange-100 text-orange-700 border-orange-300',
    APPROVED: 'bg-green-100 text-green-700 border-green-300',
    REJECTED: 'bg-red-100 text-red-700 border-red-300',
  };

  const statusIcons = {
    PENDING: <Clock size={14} />,
    APPROVED: <CheckCircle size={14} />,
    REJECTED: <XCircle size={14} />,
  };

  const statusLabels = {
    PENDING: 'بانتظار المراجعة',
    APPROVED: 'تمت الموافقة',
    REJECTED: 'مرفوض',
  };

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
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Clock className="text-orange-500" size={28} />
              مراجعة الإضافات
            </h1>
            <p className="text-gray-500 mt-1">راجع وأقر الأعضاء الجدد المضافين</p>
          </div>
          <Link
            href="/branches"
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <GitBranch size={18} />
            إدارة الفروع
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setFilter('PENDING')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'PENDING' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border hover:border-orange-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-sm opacity-80">بانتظار</p>
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'APPROVED' ? 'bg-green-500 text-white shadow-lg' : 'bg-white border hover:border-green-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.approved}</p>
            <p className="text-sm opacity-80">موافق عليه</p>
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'REJECTED' ? 'bg-red-500 text-white shadow-lg' : 'bg-white border hover:border-red-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.rejected}</p>
            <p className="text-sm opacity-80">مرفوض</p>
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'all' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white border hover:border-blue-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm opacity-80">الكل</p>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم..."
                className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:outline-none focus:border-green-500"
              />
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {selectedIds.size} محدد
                </span>
                <button
                  onClick={() => setShowConfirmModal({ type: 'approve', ids: Array.from(selectedIds) })}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-1 text-sm transition-colors"
                  disabled={isProcessing}
                >
                  <Check size={16} />
                  موافقة
                </button>
                <button
                  onClick={() => setShowConfirmModal({ type: 'reject', ids: Array.from(selectedIds) })}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-1 text-sm transition-colors"
                  disabled={isProcessing}
                >
                  <X size={16} />
                  رفض
                </button>
                <button
                  onClick={() => setShowConfirmModal({ type: 'delete', ids: Array.from(selectedIds) })}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg flex items-center gap-1 text-sm transition-colors"
                  disabled={isProcessing}
                >
                  <Trash2 size={16} />
                  حذف
                </button>
              </div>
            )}
          </div>
        </div>

        {branchGroups.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-700">لا يوجد أعضاء</h3>
            <p className="text-gray-500 mt-1">
              {filter === 'PENDING' ? 'لا يوجد أعضاء بانتظار المراجعة' : 'لا يوجد أعضاء في هذه الفئة'}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {branchGroups.map(group => {
            const pendingInGroup = group.members.filter(m => m.reviewStatus === 'PENDING');
            const allPendingSelected = pendingInGroup.length > 0 && pendingInGroup.every(m => selectedIds.has(m.id));
            const somePendingSelected = pendingInGroup.some(m => selectedIds.has(m.id));
            const isExpanded = expandedBranch === group.branchHeadId || branchGroups.length === 1;

            return (
              <div key={group.branchHeadId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b"
                  onClick={() => setExpandedBranch(isExpanded && branchGroups.length > 1 ? null : group.branchHeadId)}
                >
                  <div className="flex items-center gap-4">
                    {filter === 'PENDING' && pendingInGroup.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAllInBranch(group.branchHeadId);
                        }}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          allPendingSelected
                            ? 'bg-green-500 border-green-500 text-white'
                            : somePendingSelected
                            ? 'bg-green-200 border-green-500'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {allPendingSelected && <Check size={14} />}
                        {somePendingSelected && !allPendingSelected && <div className="w-2 h-2 bg-green-500 rounded-sm" />}
                      </button>
                    )}

                    <div className="text-gray-400">
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>

                    <GenderAvatar gender="Male" size="lg" className="flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 truncate">
                        فرع {group.branchFullName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        الجيل {group.generation} • {group.members.length} عضو
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {group.members.filter(m => m.reviewStatus === 'PENDING').length > 0 && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                          {group.members.filter(m => m.reviewStatus === 'PENDING').length} بانتظار
                        </span>
                      )}
                      {group.members.filter(m => m.reviewStatus === 'APPROVED').length > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          {group.members.filter(m => m.reviewStatus === 'APPROVED').length} موافق
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="divide-y">
                    {group.members.map(member => (
                      <div
                        key={member.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          selectedIds.has(member.id) ? 'bg-green-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {member.reviewStatus === 'PENDING' && (
                            <button
                              onClick={() => handleSelectMember(member.id)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-1 ${
                                selectedIds.has(member.id)
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-gray-300 hover:border-green-500'
                              }`}
                            >
                              {selectedIds.has(member.id) && <Check size={12} />}
                            </button>
                          )}
                          {member.reviewStatus !== 'PENDING' && <div className="w-5" />}

                          <GenderAvatar gender={member.gender} size="lg" className="flex-shrink-0" />

                          <div className="flex-1 min-w-0">
                            {editingId === member.id ? (
                              <input
                                type="text"
                                value={editData.firstName || ''}
                                onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                                className="font-bold text-lg border-b-2 border-green-500 focus:outline-none bg-transparent w-full"
                              />
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-800">
                                  {member.fullNameAr || member.firstName}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusColors[member.reviewStatus]}`}>
                                  {statusIcons[member.reviewStatus]}
                                  {statusLabels[member.reviewStatus]}
                                </span>
                              </div>
                            )}
                            <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                              <p>الجيل: {member.generation} • الأب: {member.fatherName || 'غير محدد'}</p>
                              {member.birthYear && <p>سنة الميلاد: {member.birthYear}</p>}
                              {member.phone && <p>الجوال: <span dir="ltr">{formatPhoneDisplay(member.phone)}</span></p>}
                              <p className="text-xs text-gray-400">
                                أُضيف: {new Date(member.submittedAt).toLocaleDateString('ar-SA')}
                              </p>
                            </div>

                            {editingId === member.id && (
                              <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-gray-500">سنة الميلاد</label>
                                  <input
                                    type="number"
                                    value={editData.birthYear || ''}
                                    onChange={(e) => setEditData({ ...editData, birthYear: parseInt(e.target.value) || undefined })}
                                    className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                                    placeholder="1990"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500">رقم الجوال</label>
                                  <input
                                    type="tel"
                                    value={editData.phone || ''}
                                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                                    placeholder="05xxxxxxxx"
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {editingId === member.id ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(member.id)}
                                  className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                  title="حفظ"
                                >
                                  <Save size={18} />
                                </button>
                                <button
                                  onClick={() => { setEditingId(null); setEditData({}); }}
                                  className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                                  title="إلغاء"
                                >
                                  <RotateCcw size={18} />
                                </button>
                              </>
                            ) : (
                              <>
                                {member.reviewStatus === 'PENDING' ? (
                                  <>
                                    {member.proposedFatherId && (
                                      <button
                                        onClick={() => openReviewModal(member)}
                                        className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200"
                                        title="مراجعة تفصيلية"
                                        disabled={isProcessing}
                                      >
                                        <Eye size={18} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleApprove([member.id])}
                                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                      title="موافقة"
                                      disabled={isProcessing}
                                    >
                                      <Check size={18} />
                                    </button>
                                    <button
                                      onClick={() => handleReject([member.id])}
                                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                      title="رفض"
                                      disabled={isProcessing}
                                    >
                                      <X size={18} />
                                    </button>
                                  </>
                                ) : null}
                                {member.reviewStatus === 'REJECTED' && (
                                  <button
                                    onClick={() => handleRestore(member.id)}
                                    className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 flex items-center gap-1"
                                    title="استعادة للمراجعة"
                                    disabled={isProcessing}
                                  >
                                    <RotateCcw size={18} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEdit(member)}
                                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                                  title="تعديل"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => setShowConfirmModal({ type: 'delete', ids: [member.id] })}
                                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                  title="حذف"
                                  disabled={isProcessing}
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
            <AlertCircle size={20} />
            ملاحظات المراجعة
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• الأعضاء الموافق عليهم سيُضافون للشجرة الرسمية</li>
            <li>• يمكنك تعديل البيانات قبل الموافقة</li>
            <li>• يمكنك الموافقة أو الرفض بشكل فردي أو جماعي</li>
            <li>• الأعضاء المرفوضون يمكن إعادتهم للمراجعة لاحقاً</li>
          </ul>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className={`px-6 py-4 rounded-t-2xl ${
              showConfirmModal.type === 'approve'
                ? 'bg-gradient-to-l from-green-500 to-green-600'
                : showConfirmModal.type === 'reject'
                ? 'bg-gradient-to-l from-red-500 to-red-600'
                : 'bg-gradient-to-l from-gray-500 to-gray-600'
            } text-white`}>
              <div className="flex items-center gap-3">
                {showConfirmModal.type === 'approve' && <CheckCircle size={24} />}
                {showConfirmModal.type === 'reject' && <XCircle size={24} />}
                {showConfirmModal.type === 'delete' && <Trash2 size={24} />}
                <h3 className="font-bold text-lg">
                  {showConfirmModal.type === 'approve' && 'تأكيد الموافقة'}
                  {showConfirmModal.type === 'reject' && 'تأكيد الرفض'}
                  {showConfirmModal.type === 'delete' && 'تأكيد الحذف'}
                </h3>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {showConfirmModal.type === 'approve' && `هل تريد الموافقة على ${showConfirmModal.ids.length} عضو؟`}
                {showConfirmModal.type === 'reject' && `هل تريد رفض ${showConfirmModal.ids.length} عضو؟`}
                {showConfirmModal.type === 'delete' && `هل تريد حذف ${showConfirmModal.ids.length} عضو نهائياً؟`}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(null)}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-600 font-medium rounded-xl hover:bg-gray-50"
                  disabled={isProcessing}
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    if (showConfirmModal.type === 'approve') {
                      handleApprove(showConfirmModal.ids);
                    } else if (showConfirmModal.type === 'reject') {
                      handleReject(showConfirmModal.ids);
                    } else {
                      handleDelete(showConfirmModal.ids);
                    }
                  }}
                  disabled={isProcessing}
                  className={`flex-1 py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 ${
                    showConfirmModal.type === 'approve'
                      ? 'bg-green-500 hover:bg-green-600'
                      : showConfirmModal.type === 'reject'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-gray-500 hover:bg-gray-600'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isProcessing && <Loader2 className="animate-spin" size={18} />}
                  تأكيد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {duplicateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="px-6 py-4 rounded-t-2xl bg-gradient-to-l from-amber-500 to-amber-600 text-white">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} />
                <h3 className="font-bold text-lg">تم اكتشاف عضو مكرر</h3>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                يوجد عضو بنفس الاسم ({duplicateModal.pendingName}) في الشجرة. هل تريد تحديث معلومات العضو الموجود بالمعلومات الجديدة؟
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-amber-800 text-sm">
                  <strong>ملاحظة:</strong> سيتم تحديث الحقول الفارغة فقط (مثل رقم الجوال، البريد، المدينة) دون تغيير المعلومات الموجودة.
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-gray-700">الأعضاء المطابقون:</p>
                {duplicateModal.duplicateIds.map(memberId => {
                  const member = allMembers.find(m => m.id === memberId);
                  return member ? (
                    <div key={memberId} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <GenderAvatar gender={member.gender} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{member.firstName}</p>
                          <p className="text-sm text-gray-500">{getFullLineageName(member, allMembers)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleMergeUpdate(duplicateModal.pendingId, memberId)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isProcessing && <Loader2 className="animate-spin" size={16} />}
                        تحديث
                      </button>
                    </div>
                  ) : null;
                })}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleOverrideApprove(duplicateModal.pendingId)}
                  disabled={isProcessing}
                  className="w-full py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                  تجاوز وإضافة كعضو جديد
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDuplicateModal(null)}
                    className="flex-1 py-3 border-2 border-gray-300 text-gray-600 font-medium rounded-xl hover:bg-gray-50"
                    disabled={isProcessing}
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      handleReject([duplicateModal.pendingId]);
                      setDuplicateModal(null);
                    }}
                    disabled={isProcessing}
                    className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50"
                  >
                    رفض العضو المكرر
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 rounded-t-2xl bg-gradient-to-l from-purple-500 to-purple-600 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <Eye size={24} />
                <div>
                  <h3 className="font-bold text-lg">مراجعة تفصيلية</h3>
                  <p className="text-purple-100 text-sm">{reviewModal.pending.fullNameAr || reviewModal.pending.firstName}</p>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <User size={18} />
                  بيانات الطلب
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">الاسم:</span>
                    <span className="font-medium text-gray-800 mr-2">{reviewModal.pending.firstName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">اسم الأب:</span>
                    <span className="font-medium text-gray-800 mr-2">{reviewModal.pending.fatherName || 'غير محدد'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">الجيل:</span>
                    <span className="font-medium text-gray-800 mr-2">{reviewModal.pending.generation}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">سنة الميلاد:</span>
                    <span className="font-medium text-gray-800 mr-2">{reviewModal.pending.birthYear || 'غير محدد'}</span>
                  </div>
                  {reviewModal.pending.phone && (
                    <div>
                      <span className="text-gray-500">الجوال:</span>
                      <span className="font-medium text-gray-800 mr-2" dir="ltr">{formatPhoneDisplay(reviewModal.pending.phone)}</span>
                    </div>
                  )}
                  {reviewModal.pending.city && (
                    <div>
                      <span className="text-gray-500">المدينة:</span>
                      <span className="font-medium text-gray-800 mr-2">{reviewModal.pending.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {reviewModal.parent && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                    <TreePine size={18} />
                    بيانات الأب المقترح
                  </h4>
                  <div className="flex items-center gap-4">
                    <GenderAvatar gender={reviewModal.parent.gender} size="lg" />
                    <div>
                      <p className="font-bold text-gray-800">{reviewModal.parent.fullNameAr || reviewModal.parent.firstName}</p>
                      <p className="text-sm text-gray-500">
                        المعرف: {reviewModal.parent.id} • الجيل: {reviewModal.parent.generation}
                        {reviewModal.parent.branch && ` • الفرع: ${reviewModal.parent.branch}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getFullLineageName(reviewModal.parent, allMembers)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {reviewModal.parent && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <Users size={18} />
                    أبناء الأب الحاليون ({reviewModal.children.length})
                  </h4>
                  
                  {reviewModal.children.length === 0 ? (
                    <p className="text-amber-700 text-sm">لا يوجد أبناء مسجلون حالياً لهذا الأب</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {reviewModal.children.map(child => {
                        const nameMatch = child.firstName.toLowerCase() === reviewModal.pending.firstName.toLowerCase() ||
                          (child.fullNameAr && reviewModal.pending.fullNameAr && 
                           child.fullNameAr.includes(reviewModal.pending.firstName));
                        const hasLinkedAccount = !!child.phone || !!child.email;
                        
                        return (
                          <div 
                            key={child.id} 
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              nameMatch ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-white border border-amber-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <GenderAvatar gender={child.gender} size="sm" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-800">{child.firstName}</p>
                                  {nameMatch && (
                                    <span className="text-xs px-2 py-0.5 bg-yellow-500 text-white rounded-full">
                                      اسم مشابه
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  المعرف: {child.id} • 
                                  {child.status === 'Deceased' ? ' متوفى' : ' على قيد الحياة'}
                                  {hasLinkedAccount ? (
                                    <span className="text-green-600 mr-1">• مُسجَّل</span>
                                  ) : (
                                    <span className="text-gray-400 mr-1">• غير مُسجَّل</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            
                            {reviewModal.pending.reviewStatus === 'PENDING' && (
                              <button
                                onClick={() => handleLinkToExisting(reviewModal.pending.id, child.id)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1"
                              >
                                {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Link2 size={14} />}
                                ربط
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {reviewModal.children.some(c => 
                    c.firstName.toLowerCase() === reviewModal.pending.firstName.toLowerCase()
                  ) && (
                    <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                      <p className="text-yellow-800 text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        يوجد ابن بنفس الاسم! قد يكون هذا الطلب لنفس الشخص. يمكنك ربط المعلومات بدلاً من إضافة عضو جديد.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!reviewModal.parent && reviewModal.pending.proposedFatherId && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <p className="text-red-700 flex items-center gap-2">
                    <AlertCircle size={18} />
                    الأب المقترح (المعرف: {reviewModal.pending.proposedFatherId}) غير موجود في الشجرة
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={() => setReviewModal(null)}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-600 font-medium rounded-xl hover:bg-gray-100"
                  disabled={isProcessing}
                >
                  إغلاق
                </button>
                {reviewModal.pending.reviewStatus === 'PENDING' && (
                  <>
                    <button
                      onClick={() => {
                        handleApprove([reviewModal.pending.id]);
                        setReviewModal(null);
                      }}
                      disabled={isProcessing}
                      className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                      إضافة كعضو جديد
                    </button>
                    <button
                      onClick={() => {
                        handleReject([reviewModal.pending.id]);
                        setReviewModal(null);
                      }}
                      disabled={isProcessing}
                      className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing && <Loader2 className="animate-spin" size={18} />}
                      رفض
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
