'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Key, Copy, Trash2, Clock, Users, Search, Plus, AlertCircle,
  CheckCircle, XCircle, Loader2, X, User, Calendar, Hash, FileText
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

type FilterStatus = 'all' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';

interface Redemption {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  redeemedAt: string;
}

interface Invitation {
  id: string;
  code: string;
  linkedMemberId: string | null;
  linkedMemberName: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  note: string | null;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  redemptions: Redemption[];
}

interface PublicMember {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  generation: number;
  branch: string | null;
}

export default function AdminInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState<Invitation | null>(null);
  const { session } = useAuth();

  const [members, setMembers] = useState<PublicMember[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<PublicMember | null>(null);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState('');

  const fetchInvitations = useCallback(async () => {
    if (!session?.token) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/invitations', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في جلب رموز الدعوة');
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    }
  }, [session?.token]);

  const fetchMembers = useCallback(async () => {
    if (!session?.token) return;
    try {
      const res = await fetch('/api/members/public?limit=500');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  }, [session?.token]);

  useEffect(() => {
    async function fetchData() {
      if (!session?.token) return;
      setIsLoading(true);
      await Promise.all([fetchInvitations(), fetchMembers()]);
      setIsLoading(false);
    }
    fetchData();
  }, [session?.token, fetchInvitations, fetchMembers]);

  const filteredInvitations = useMemo(() => {
    let result = invitations;

    if (filter !== 'all') {
      result = result.filter(i => i.status === filter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.code.toLowerCase().includes(query) ||
        (i.linkedMemberName && i.linkedMemberName.toLowerCase().includes(query)) ||
        (i.note && i.note.toLowerCase().includes(query)) ||
        i.createdByName.toLowerCase().includes(query)
      );
    }

    return result;
  }, [invitations, filter, searchQuery]);

  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery) return members.slice(0, 20);
    const query = memberSearchQuery.toLowerCase();
    return members.filter(m =>
      m.firstName.toLowerCase().includes(query) ||
      (m.fullNameAr && m.fullNameAr.toLowerCase().includes(query)) ||
      (m.fullNameEn && m.fullNameEn?.toLowerCase().includes(query))
    ).slice(0, 20);
  }, [members, memberSearchQuery]);

  const stats = useMemo(() => ({
    total: invitations.length,
    active: invitations.filter(i => i.status === 'ACTIVE').length,
    used: invitations.filter(i => i.status === 'USED').length,
    expired: invitations.filter(i => i.status === 'EXPIRED').length,
    revoked: invitations.filter(i => i.status === 'REVOKED').length,
  }), [invitations]);

  const handleCreateInvitation = async () => {
    if (!session?.token) return;
    setIsProcessing(true);
    setError(null);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          linkedMemberId: selectedMember?.id || null,
          linkedMemberName: selectedMember?.fullNameAr || selectedMember?.firstName || null,
          expiresAt: expiresAt.toISOString(),
          maxUses,
          note: note || null,
        }),
      });
      if (res.ok) {
        await fetchInvitations();
        setShowCreateModal(false);
        resetCreateForm();
        setSuccessMessage('تم إنشاء رمز الدعوة بنجاح');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في إنشاء رمز الدعوة');
      }
    } catch (err) {
      console.error('Error creating invitation:', err);
      setError('حدث خطأ في إنشاء رمز الدعوة');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeInvitation = async (invitation: Invitation) => {
    if (!session?.token) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/invitations/${invitation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        await fetchInvitations();
        setShowRevokeModal(null);
        setSuccessMessage('تم إلغاء رمز الدعوة بنجاح');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في إلغاء رمز الدعوة');
      }
    } catch (err) {
      console.error('Error revoking invitation:', err);
      setError('حدث خطأ في إلغاء رمز الدعوة');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    const link = `${window.location.origin}/invite?code=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setSuccessMessage('تم نسخ الرابط');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch {
      setError('فشل في نسخ الرابط');
    }
  };

  const resetCreateForm = () => {
    setSelectedMember(null);
    setMemberSearchQuery('');
    setExpiresInDays(7);
    setMaxUses(1);
    setNote('');
  };

  const getRemainingTime = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'منتهي';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} يوم${days > 1 ? '' : ''} و ${hours} ساعة`;
    return `${hours} ساعة`;
  };

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-700 border-green-300',
    USED: 'bg-blue-100 text-blue-700 border-blue-300',
    EXPIRED: 'bg-gray-100 text-gray-700 border-gray-300',
    REVOKED: 'bg-red-100 text-red-700 border-red-300',
  };

  const statusIcons = {
    ACTIVE: <CheckCircle size={14} />,
    USED: <Users size={14} />,
    EXPIRED: <Clock size={14} />,
    REVOKED: <XCircle size={14} />,
  };

  const statusLabels = {
    ACTIVE: 'نشطة',
    USED: 'مستخدمة',
    EXPIRED: 'منتهية',
    REVOKED: 'ملغاة',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" />
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
              <Key className="text-blue-500" size={28} />
              رموز الدعوات
            </h1>
            <p className="text-gray-500 mt-1">إنشاء وإدارة رموز دعوة الأعضاء الجدد</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={18} />
              إنشاء رمز جديد
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              العودة للوحة التحكم
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="mr-auto text-red-500 hover:text-red-700">
              <X size={18} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700">
            <CheckCircle size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'ACTIVE' ? 'bg-green-500 text-white shadow-lg' : 'bg-white border hover:border-green-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.active}</p>
            <p className="text-sm opacity-80">نشطة</p>
          </button>
          <button
            onClick={() => setFilter('USED')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'USED' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white border hover:border-blue-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.used}</p>
            <p className="text-sm opacity-80">مستخدمة</p>
          </button>
          <button
            onClick={() => setFilter('EXPIRED')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'EXPIRED' ? 'bg-gray-500 text-white shadow-lg' : 'bg-white border hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.expired}</p>
            <p className="text-sm opacity-80">منتهية</p>
          </button>
          <button
            onClick={() => setFilter('REVOKED')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'REVOKED' ? 'bg-red-500 text-white shadow-lg' : 'bg-white border hover:border-red-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.revoked}</p>
            <p className="text-sm opacity-80">ملغاة</p>
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'all' ? 'bg-purple-500 text-white shadow-lg' : 'bg-white border hover:border-purple-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm opacity-80">الكل</p>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالرمز أو اسم العضو المرتبط أو الملاحظات..."
              className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {filteredInvitations.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-700">لا يوجد رموز دعوة</h3>
            <p className="text-gray-500 mt-1">
              {filter === 'ACTIVE' ? 'لا يوجد رموز نشطة حالياً' : 'لا يوجد رموز في هذه الفئة'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus size={18} />
              إنشاء رمز جديد
            </button>
          </div>
        )}

        <div className="space-y-4">
          {filteredInvitations.map(invitation => (
            <div key={invitation.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                      <Key className="text-blue-500" size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-gray-800 text-lg bg-gray-100 px-3 py-1 rounded">
                          {invitation.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(invitation.code)}
                          className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="نسخ الرابط"
                        >
                          <Copy size={16} />
                        </button>
                        <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusColors[invitation.status]}`}>
                          {statusIcons[invitation.status]}
                          {statusLabels[invitation.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                        {invitation.linkedMemberName && (
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {invitation.linkedMemberName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Hash size={14} />
                          {invitation.usedCount} / {invitation.maxUses} استخدام
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          متبقي: {getRemainingTime(invitation.expiresAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left text-sm text-gray-400">
                    {new Date(invitation.createdAt).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User size={16} className="text-gray-400" />
                    <span className="text-gray-500">أنشأه:</span>
                    <span className="font-medium">{invitation.createdByName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-500">ينتهي في:</span>
                    <span className="font-medium">
                      {new Date(invitation.expiresAt).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {invitation.note && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <FileText size={14} />
                      <span>الملاحظات:</span>
                    </div>
                    <p className="text-gray-700">{invitation.note}</p>
                  </div>
                )}

                {invitation.redemptions && invitation.redemptions.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 text-sm mb-2">
                      <Users size={14} />
                      <span>سجل الاستخدام ({invitation.redemptions.length}):</span>
                    </div>
                    <div className="space-y-2">
                      {invitation.redemptions.map(redemption => (
                        <div key={redemption.id} className="flex items-center justify-between text-sm">
                          <span className="text-blue-800">
                            {redemption.userName || redemption.userEmail}
                          </span>
                          <span className="text-blue-600 text-xs">
                            {new Date(redemption.redeemedAt).toLocaleDateString('ar-SA', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {invitation.status === 'ACTIVE' && (
                  <div className="mt-4 pt-4 border-t flex items-center gap-3">
                    <button
                      onClick={() => copyToClipboard(invitation.code)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Copy size={18} />
                      نسخ الرابط
                    </button>
                    <button
                      onClick={() => setShowRevokeModal(invitation)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Trash2 size={18} />
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Plus className="text-blue-500" size={24} />
                    إنشاء رمز دعوة جديد
                  </h2>
                  <button
                    onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ربط بعضو (اختياري)
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="ابحث عن عضو..."
                      className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {selectedMember && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                      <span className="text-blue-800">{selectedMember.fullNameAr || selectedMember.firstName}</span>
                      <button
                        onClick={() => setSelectedMember(null)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {memberSearchQuery && !selectedMember && filteredMembers.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-40 overflow-auto">
                      {filteredMembers.map(member => (
                        <button
                          key={member.id}
                          onClick={() => { setSelectedMember(member); setMemberSearchQuery(''); }}
                          className="w-full text-right px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                        >
                          <span className="font-medium">{member.fullNameAr || member.firstName}</span>
                          {member.branch && (
                            <span className="text-gray-500 text-sm mr-2">({member.branch})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مدة الصلاحية (بالأيام)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                    className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحد الأقصى للاستخدام
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maxUses}
                    onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="أضف ملاحظات حول هذا الرمز..."
                    rows={3}
                    className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={handleCreateInvitation}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                  إنشاء رمز الدعوة
                </button>
                <button
                  onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                  className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {showRevokeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="text-red-500" size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
                  تأكيد إلغاء الرمز
                </h2>
                <p className="text-gray-600 text-center mb-4">
                  هل أنت متأكد من إلغاء رمز الدعوة <span className="font-mono font-bold">{showRevokeModal.code}</span>؟
                </p>
                <p className="text-gray-500 text-sm text-center">
                  لن يتمكن أي شخص من استخدام هذا الرمز بعد الإلغاء.
                </p>
              </div>
              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => handleRevokeInvitation(showRevokeModal)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Trash2 size={18} />
                  )}
                  إلغاء الرمز
                </button>
                <button
                  onClick={() => setShowRevokeModal(null)}
                  className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  تراجع
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
