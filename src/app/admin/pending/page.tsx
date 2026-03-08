'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { FamilyMember } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  Check, X, Edit2, Clock, User, Filter, Trash2,
  ChevronDown, ChevronRight, AlertCircle, CheckCircle, XCircle,
  Save, RotateCcw, Search, GitBranch, Users, TreePine, Loader2
} from 'lucide-react';
import Link from 'next/link';

// Database PendingMember type (matches Prisma schema)
interface PendingMember {
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
  reviewStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  approvedMemberId: string | null;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';
type MemberStatus = 'pending' | 'approved' | 'rejected';

// Build full lineage name
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
  members: PendingMember[];
}

export default function AdminPendingPage() {
  const { session } = useAuth();
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PendingMember>>({});
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState<{
    type: 'approve' | 'reject' | 'delete';
    ids: string[];
  } | null>(null);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch family members from API
  useEffect(() => {
    async function fetchMembers() {
      try {
        const headers: HeadersInit = {};
        if (session?.token) {
          headers['Authorization'] = `Bearer ${session.token}`;
        }
        const response = await fetch('/api/members?limit=500', { headers });
        if (response.ok) {
          const result = await response.json();
          setAllMembers(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch members:', error);
      }
    }
    fetchMembers();
  }, [session?.token]);

  // Fetch pending members from database API
  const fetchPendingMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers: HeadersInit = {};
      if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }
      const response = await fetch('/api/admin/pending', { headers });
      if (response.ok) {
        const result = await response.json();
        setMembers(result.pending || []);
      } else {
        console.error('Failed to fetch pending members:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch pending members:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.token]);

  // Load pending members on mount
  useEffect(() => {
    if (session?.token) {
      fetchPendingMembers();
    }
  }, [session?.token, fetchPendingMembers]);

  // Map reviewStatus to filter status
  const getFilterStatus = (member: PendingMember): MemberStatus => {
    switch (member.reviewStatus) {
      case 'PENDING': return 'pending';
      case 'APPROVED': return 'approved';
      case 'REJECTED': return 'rejected';
      default: return 'pending';
    }
  };

  // Filter members
  const filteredMembers = useMemo(() => {
    let result = members;

    // Status filter
    if (filter !== 'all') {
      result = result.filter(m => getFilterStatus(m) === filter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.firstName.toLowerCase().includes(query) ||
        (m.fullNameAr?.toLowerCase() || '').includes(query) ||
        (m.fatherName?.toLowerCase() || '').includes(query)
      );
    }

    return result;
  }, [members, filter, searchQuery]);

  // Group by branch (using proposedFatherId) with full names
  const branchGroups = useMemo(() => {
    const groups: Record<string, BranchGroup> = {};

    filteredMembers.forEach(member => {
      const branchHeadId = member.proposedFatherId || 'unknown';
      if (!groups[branchHeadId]) {
        const branchHead = allMembers.find(m => m.id === branchHeadId);
        groups[branchHeadId] = {
          branchHeadId: branchHeadId,
          branchHeadName: branchHead?.firstName || member.fatherName || 'غير معروف',
          branchFullName: branchHead ? getFullLineageName(branchHead, allMembers, 3) : (member.fatherName || 'غير معروف'),
          generation: branchHead?.generation || member.generation - 1 || 0,
          members: [],
        };
      }
      groups[branchHeadId].members.push(member);
    });

    return Object.values(groups).sort((a, b) => a.generation - b.generation);
  }, [filteredMembers, allMembers]);

  // Stats
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

  // API call to update pending member status
  const updatePendingMemberStatus = async (id: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }
      const response = await fetch(`/api/admin/pending/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ action, notes }),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to update pending member:', error);
      return false;
    }
  };

  // API call to delete pending member
  const deletePendingMember = async (id: string) => {
    try {
      const headers: HeadersInit = {};
      if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }
      const response = await fetch(`/api/admin/pending/${id}`, {
        method: 'DELETE',
        headers,
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to delete pending member:', error);
      return false;
    }
  };

  const handleApprove = async (ids: string[]) => {
    for (const id of ids) {
      await updatePendingMemberStatus(id, 'approve');
    }
    await fetchPendingMembers();
    setSelectedIds(new Set());
    setShowConfirmModal(null);
  };

  const handleReject = async (ids: string[]) => {
    for (const id of ids) {
      await updatePendingMemberStatus(id, 'reject');
    }
    await fetchPendingMembers();
    setSelectedIds(new Set());
    setShowConfirmModal(null);
  };

  const handleDelete = async (ids: string[]) => {
    for (const id of ids) {
      await deletePendingMember(id);
    }
    await fetchPendingMembers();
    setSelectedIds(new Set());
    setShowConfirmModal(null);
  };

  const handleResetStatus = async (id: string) => {
    // Reset to pending status
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }
      await fetch(`/api/admin/pending/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ action: 'reset' }),
      });
      await fetchPendingMembers();
    } catch (error) {
      console.error('Failed to reset pending member status:', error);
    }
  };

  const handleEdit = (member: PendingMember) => {
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
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }
      // Update pending member via API
      await fetch(`/api/admin/pending/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(editData),
      });
      await fetchPendingMembers();
    } catch (error) {
      console.error('Failed to update pending member:', error);
    }
    setEditingId(null);
    setEditData({});
  };

  const statusColors = {
    pending: 'bg-orange-100 text-orange-700 border-orange-300',
    approved: 'bg-green-100 text-green-700 border-green-300',
    rejected: 'bg-red-100 text-red-700 border-red-300',
  };

  const statusIcons = {
    pending: <Clock size={14} />,
    approved: <CheckCircle size={14} />,
    rejected: <XCircle size={14} />,
  };

  const statusLabels = {
    pending: 'بانتظار المراجعة',
    approved: 'تمت الموافقة',
    rejected: 'مرفوض',
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setFilter('pending')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'pending' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border hover:border-orange-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-sm opacity-80">بانتظار</p>
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'approved' ? 'bg-green-500 text-white shadow-lg' : 'bg-white border hover:border-green-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.approved}</p>
            <p className="text-sm opacity-80">موافق عليه</p>
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'rejected' ? 'bg-red-500 text-white shadow-lg' : 'bg-white border hover:border-red-300'
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

        {/* Search and Bulk Actions */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
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

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {selectedIds.size} محدد
                </span>
                <button
                  onClick={() => setShowConfirmModal({ type: 'approve', ids: Array.from(selectedIds) })}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-1 text-sm transition-colors"
                >
                  <Check size={16} />
                  موافقة
                </button>
                <button
                  onClick={() => setShowConfirmModal({ type: 'reject', ids: Array.from(selectedIds) })}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-1 text-sm transition-colors"
                >
                  <X size={16} />
                  رفض
                </button>
                <button
                  onClick={() => setShowConfirmModal({ type: 'delete', ids: Array.from(selectedIds) })}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg flex items-center gap-1 text-sm transition-colors"
                >
                  <Trash2 size={16} />
                  حذف
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        {!isLoading && branchGroups.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-700">لا يوجد أعضاء</h3>
            <p className="text-gray-500 mt-1">
              {filter === 'pending' ? 'لا يوجد أعضاء بانتظار المراجعة' : 'لا يوجد أعضاء في هذه الفئة'}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl p-12 text-center">
            <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={48} />
            <p className="text-gray-500">جاري تحميل الطلبات...</p>
          </div>
        )}

        {/* Branch Groups */}
        {!isLoading && <div className="space-y-4">
          {branchGroups.map(group => {
            const pendingInGroup = group.members.filter(m => m.reviewStatus === 'PENDING');
            const allPendingSelected = pendingInGroup.length > 0 && pendingInGroup.every(m => selectedIds.has(m.id));
            const somePendingSelected = pendingInGroup.some(m => selectedIds.has(m.id));
            const isExpanded = expandedBranch === group.branchHeadId || branchGroups.length === 1;

            return (
              <div key={group.branchHeadId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Group Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b"
                  onClick={() => setExpandedBranch(isExpanded && branchGroups.length > 1 ? null : group.branchHeadId)}
                >
                  <div className="flex items-center gap-4">
                    {/* Checkbox for pending */}
                    {filter === 'pending' && pendingInGroup.length > 0 && (
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

                    {/* Expand Icon */}
                    <div className="text-gray-400">
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>

                    {/* Branch Avatar */}
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl border-2 border-blue-300 flex-shrink-0">
                      👨
                    </div>

                    {/* Branch Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 truncate">
                        فرع {group.branchFullName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        الجيل {group.generation} • {group.members.length} عضو
                      </p>
                    </div>

                    {/* Quick Stats */}
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

                {/* Members List */}
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
                          {/* Checkbox */}
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

                          {/* Avatar */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                            member.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
                          }`}>
                            {member.gender === 'Male' ? '👨' : '👩'}
                          </div>

                          {/* Info */}
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
                                  {member.fullNameAr || `${member.firstName} ${member.fatherName ? `بن ${member.fatherName}` : ''} آل شايع`}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusColors[getFilterStatus(member)]}`}>
                                  {statusIcons[getFilterStatus(member)]}
                                  {statusLabels[getFilterStatus(member)]}
                                </span>
                              </div>
                            )}
                            <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                              <p>الجيل: {member.generation} • الأب: {member.fatherName}</p>
                              {member.birthYear && <p>سنة الميلاد: {member.birthYear}</p>}
                              {member.phone && <p>الجوال: {member.phone}</p>}
                              <p className="text-xs text-gray-400">
                                أُضيف: {new Date(member.submittedAt).toLocaleDateString('ar-SA')}
                              </p>
                            </div>

                            {/* Edit Form */}
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

                          {/* Actions */}
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
                                    <button
                                      onClick={() => handleApprove([member.id])}
                                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                      title="موافقة"
                                    >
                                      <Check size={18} />
                                    </button>
                                    <button
                                      onClick={() => handleReject([member.id])}
                                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                      title="رفض"
                                    >
                                      <X size={18} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleResetStatus(member.id)}
                                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                    title="إعادة للمراجعة"
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
        </div>}

        {/* Instructions */}
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

      {/* Confirmation Modal */}
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
                  className={`flex-1 py-3 text-white font-bold rounded-xl ${
                    showConfirmModal.type === 'approve'
                      ? 'bg-green-500 hover:bg-green-600'
                      : showConfirmModal.type === 'reject'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-gray-500 hover:bg-gray-600'
                  }`}
                >
                  تأكيد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
