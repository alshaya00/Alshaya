'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Users,
  UserX,
  Link2,
  Unlink,
  AlertTriangle,
  Search,
  Loader2,
  Check,
  X,
  ChevronLeft,
  ChevronDown,
  Plus,
  History,
  RotateCcw,
  Shield,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface OrphanedUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface OrphanedMember {
  id: string;
  nameAr: string | null;
  nameEn: string | null;
  generation: number | null;
  fatherId: string | null;
  reason: 'no_parent' | 'invalid_parent';
}

interface Stats {
  usersWithoutLink: number;
  membersWithoutParent: number;
  invalidLinks: number;
}

interface SearchResult {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  generation: number | null;
}

interface AuditEntry {
  id: string;
  action: string;
  targetName: string | null;
  createdAt: string;
  userName: string;
  changeId?: string;
}

export default function DataRepairPage() {
  const { getAuthHeader } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [stats, setStats] = useState<Stats>({ usersWithoutLink: 0, membersWithoutParent: 0, invalidLinks: 0 });
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([]);
  const [orphanedMembers, setOrphanedMembers] = useState<OrphanedMember[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);

  const [expandedSection, setExpandedSection] = useState<'users' | 'members' | 'history' | null>('users');

  const [linkUserModal, setLinkUserModal] = useState<{ userId: string; userName: string } | null>(null);
  const [createMemberModal, setCreateMemberModal] = useState<{ userId: string; userName: string } | null>(null);
  const [setParentModal, setSetParentModal] = useState<{ memberId: string; memberName: string } | null>(null);
  const [confirmRollback, setConfirmRollback] = useState<{ changeId: string; action: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [newMemberData, setNewMemberData] = useState({
    nameAr: '',
    nameEn: '',
    fatherId: '',
    fatherName: '',
    gender: 'Male' as 'Male' | 'Female',
  });
  const [fatherSearchQuery, setFatherSearchQuery] = useState('');
  const [fatherSearchResults, setFatherSearchResults] = useState<SearchResult[]>([]);
  const [isSearchingFather, setIsSearchingFather] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/orphaned-members', {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (data.success) {
        setOrphanedUsers(data.orphanedUsers || []);
        setOrphanedMembers(data.orphanedMembers || []);
        setStats(data.stats || { usersWithoutLink: 0, membersWithoutParent: 0, invalidLinks: 0 });
      }

      const auditRes = await fetch('/api/admin/audit?action=DATA_REPAIR&limit=20', {
        headers: getAuthHeader(),
      });
      const auditData = await auditRes.json();
      if (auditData.success && auditData.logs) {
        setAuditHistory(auditData.logs.map((log: Record<string, unknown>) => ({
          id: log.id,
          action: log.action,
          targetName: log.targetName,
          createdAt: log.createdAt,
          userName: log.userName,
          changeId: (log.details as Record<string, unknown>)?.changeId as string | undefined,
        })));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const searchMembers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/members?search=${encodeURIComponent(query)}&limit=10`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.members?.slice(0, 10) || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [getAuthHeader]);

  const searchFathers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setFatherSearchResults([]);
      return;
    }
    setIsSearchingFather(true);
    try {
      const res = await fetch(`/api/members?search=${encodeURIComponent(query)}&males=true&limit=10`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (data.success) {
        setFatherSearchResults(data.members?.slice(0, 10) || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearchingFather(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (linkUserModal || setParentModal) {
        searchMembers(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, linkUserModal, setParentModal, searchMembers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (createMemberModal) {
        searchFathers(fatherSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [fatherSearchQuery, createMemberModal, searchFathers]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const handleLinkUserToMember = async (userId: string, memberId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/data-repair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          action: 'link-user-to-member',
          userId,
          memberId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.messageAr || 'تم ربط المستخدم بالعضو بنجاح');
        setLinkUserModal(null);
        setSearchQuery('');
        setSearchResults([]);
        await loadData();
      } else {
        showError(data.messageAr || data.message || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error linking user:', error);
      showError('حدث خطأ أثناء ربط المستخدم');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateMemberForUser = async () => {
    if (!createMemberModal || !newMemberData.nameAr || !newMemberData.fatherId || !newMemberData.gender) {
      showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/data-repair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          action: 'create-member-for-user',
          userId: createMemberModal.userId,
          nameAr: newMemberData.nameAr,
          nameEn: newMemberData.nameEn || undefined,
          fatherId: newMemberData.fatherId,
          gender: newMemberData.gender,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.messageAr || 'تم إنشاء العضو وربطه بنجاح');
        setCreateMemberModal(null);
        setNewMemberData({ nameAr: '', nameEn: '', fatherId: '', fatherName: '', gender: 'Male' });
        setFatherSearchQuery('');
        setFatherSearchResults([]);
        await loadData();
      } else {
        showError(data.messageAr || data.message || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error creating member:', error);
      showError('حدث خطأ أثناء إنشاء العضو');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetMemberParent = async (memberId: string, newFatherId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/data-repair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          action: 'set-member-parent',
          memberId,
          newFatherId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.messageAr || 'تم تحديث والد العضو بنجاح');
        setSetParentModal(null);
        setSearchQuery('');
        setSearchResults([]);
        await loadData();
      } else {
        showError(data.messageAr || data.message || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error setting parent:', error);
      showError('حدث خطأ أثناء تعيين الأب');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRollback = async (changeId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/data-repair', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ changeId }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.messageAr || 'تم التراجع بنجاح');
        setConfirmRollback(null);
        await loadData();
      } else {
        showError(data.messageAr || data.message || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error rolling back:', error);
      showError('حدث خطأ أثناء التراجع');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'DATA_REPAIR_LINK_USER':
        return 'ربط مستخدم';
      case 'DATA_REPAIR_SET_PARENT':
        return 'تعيين أب';
      case 'DATA_REPAIR_CREATE_MEMBER':
        return 'إنشاء عضو';
      case 'DATA_REPAIR_ROLLBACK':
        return 'تراجع';
      default:
        return action;
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'no_parent':
        return 'بدون أب';
      case 'invalid_parent':
        return 'رابط أب غير صالح';
      default:
        return reason;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">إصلاح البيانات</h1>
              <p className="text-gray-500">Data Repair Dashboard</p>
            </div>
          </div>
          <p className="text-gray-600 mt-4">
            إيجاد وإصلاح البيانات اليتيمة: المستخدمين غير المرتبطين بأعضاء، والأعضاء بدون آباء.
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
            <Check size={20} className="text-green-600" />
            <span className="text-green-800">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <X size={20} className="text-red-600" />
            <span className="text-red-800">{errorMessage}</span>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">تنبيه أمان</h3>
              <p className="text-sm text-amber-700 mt-1">
                هذه العمليات تؤثر على البيانات الإنتاجية. يتم تسجيل جميع التغييرات ويمكن التراجع عنها.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.usersWithoutLink}</p>
            <p className="text-sm text-gray-500 mt-1">مستخدمون بدون عضوية</p>
            <p className="text-xs text-gray-400">Users without member link</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Unlink className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.membersWithoutParent}</p>
            <p className="text-sm text-gray-500 mt-1">أعضاء بدون أب</p>
            <p className="text-xs text-gray-400">Members without parent</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.invalidLinks}</p>
            <p className="text-sm text-gray-500 mt-1">روابط آباء غير صالحة</p>
            <p className="text-xs text-gray-400">Invalid parent links</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <button
            onClick={() => setExpandedSection(expandedSection === 'users' ? null : 'users')}
            className="w-full px-6 py-4 bg-gray-50 border-b flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <UserX className="w-5 h-5 text-red-600" />
              <h2 className="font-bold text-gray-800">المستخدمون غير المرتبطين</h2>
              <span className="text-sm text-gray-500">Orphaned Users</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                {orphanedUsers.length}
              </span>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'users' ? 'rotate-180' : ''}`} />
          </button>

          {expandedSection === 'users' && (
            <div className="divide-y">
              {orphanedUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-gray-600">جميع المستخدمين مرتبطين بأعضاء</p>
                </div>
              ) : (
                orphanedUsers.map((user) => (
                  <div key={user.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{user.name || 'بدون اسم'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          تاريخ التسجيل: {formatDate(user.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setLinkUserModal({ userId: user.id, userName: user.name });
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-[#1E3A5F] text-white text-sm rounded-lg hover:bg-[#2d5a8a] transition-colors"
                        >
                          <Link2 size={16} />
                          ربط بعضو
                        </button>
                        <button
                          onClick={() => {
                            setCreateMemberModal({ userId: user.id, userName: user.name });
                            setNewMemberData({ nameAr: user.name, nameEn: '', fatherId: '', fatherName: '', gender: 'Male' });
                            setFatherSearchQuery('');
                            setFatherSearchResults([]);
                          }}
                          className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <UserPlus size={16} />
                          إنشاء عضو
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <button
            onClick={() => setExpandedSection(expandedSection === 'members' ? null : 'members')}
            className="w-full px-6 py-4 bg-gray-50 border-b flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Unlink className="w-5 h-5 text-orange-600" />
              <h2 className="font-bold text-gray-800">الأعضاء اليتامى</h2>
              <span className="text-sm text-gray-500">Orphaned Members</span>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                {orphanedMembers.length}
              </span>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'members' ? 'rotate-180' : ''}`} />
          </button>

          {expandedSection === 'members' && (
            <div className="divide-y">
              {orphanedMembers.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-gray-600">جميع الأعضاء لديهم آباء صالحين</p>
                </div>
              ) : (
                orphanedMembers.map((member) => (
                  <div key={member.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800">{member.nameAr || 'بدون اسم'}</p>
                          {member.nameEn && <span className="text-sm text-gray-500">({member.nameEn})</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {member.generation && (
                            <span className="text-sm text-gray-500">الجيل: {member.generation}</span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            member.reason === 'invalid_parent' 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {getReasonLabel(member.reason)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSetParentModal({ memberId: member.id, memberName: member.nameAr || '' });
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-[#1E3A5F] text-white text-sm rounded-lg hover:bg-[#2d5a8a] transition-colors"
                      >
                        <Link2 size={16} />
                        تعيين الأب
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <button
            onClick={() => setExpandedSection(expandedSection === 'history' ? null : 'history')}
            className="w-full px-6 py-4 bg-gray-50 border-b flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-gray-800">سجل التغييرات</h2>
              <span className="text-sm text-gray-500">Change History</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'history' ? 'rotate-180' : ''}`} />
          </button>

          {expandedSection === 'history' && (
            <div className="divide-y max-h-96 overflow-y-auto">
              {auditHistory.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">لا توجد تغييرات مسجلة</p>
                </div>
              ) : (
                auditHistory.map((entry) => (
                  <div key={entry.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            entry.action.includes('ROLLBACK')
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {getActionLabel(entry.action)}
                          </span>
                          <p className="font-medium text-gray-800">{entry.targetName || '-'}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{entry.userName}</span>
                          <span>•</span>
                          <span>{formatDate(entry.createdAt)}</span>
                        </div>
                      </div>
                      {entry.changeId && !entry.action.includes('ROLLBACK') && (
                        <button
                          onClick={() => setConfirmRollback({ changeId: entry.changeId!, action: entry.action })}
                          disabled={isProcessing}
                          className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-700 text-sm rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <RotateCcw size={16} />
                          تراجع
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-[#1E3A5F] hover:underline"
          >
            <ChevronLeft size={20} />
            العودة للوحة التحكم
          </Link>
        </div>
      </div>

      {linkUserModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">ربط المستخدم بعضو</h3>
              <button onClick={() => setLinkUserModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              ربط المستخدم <span className="font-medium">{linkUserModal.userName}</span> بعضو موجود
            </p>
            
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن عضو بالاسم..."
                className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1E3A5F]"
              />
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {searchResults.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleLinkUserToMember(linkUserModal.userId, member.id)}
                    disabled={isProcessing}
                    className="w-full p-3 text-right hover:bg-gray-50 flex items-center justify-between disabled:opacity-50"
                  >
                    <div>
                      <p className="font-medium">{member.fullNameAr || member.firstName}</p>
                      <p className="text-sm text-gray-500">
                        {member.fullNameEn && <span>{member.fullNameEn} • </span>}
                        الجيل: {member.generation || '-'}
                      </p>
                    </div>
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 size={16} className="text-[#1E3A5F]" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-center text-gray-500 py-4">لم يتم العثور على نتائج</p>
            )}
          </div>
        </div>
      )}

      {createMemberModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">إنشاء عضو جديد</h3>
              <button onClick={() => setCreateMemberModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              إنشاء عضو جديد وربطه بالمستخدم <span className="font-medium">{createMemberModal.userName}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم بالعربي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMemberData.nameAr}
                  onChange={(e) => setNewMemberData({ ...newMemberData, nameAr: e.target.value })}
                  className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  placeholder="أدخل الاسم بالعربي"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم بالإنجليزي
                </label>
                <input
                  type="text"
                  value={newMemberData.nameEn}
                  onChange={(e) => setNewMemberData({ ...newMemberData, nameEn: e.target.value })}
                  className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  placeholder="Enter English name"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الأب <span className="text-red-500">*</span>
                </label>
                {newMemberData.fatherId ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="font-medium">{newMemberData.fatherName}</span>
                    <button
                      onClick={() => setNewMemberData({ ...newMemberData, fatherId: '', fatherName: '' })}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        value={fatherSearchQuery}
                        onChange={(e) => setFatherSearchQuery(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                        placeholder="ابحث عن الأب..."
                      />
                    </div>
                    {isSearchingFather && (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#1E3A5F]" />
                      </div>
                    )}
                    {fatherSearchResults.length > 0 && (
                      <div className="mt-2 border rounded-lg divide-y max-h-40 overflow-y-auto">
                        {fatherSearchResults.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => {
                              setNewMemberData({
                                ...newMemberData,
                                fatherId: member.id,
                                fatherName: member.fullNameAr || member.firstName,
                              });
                              setFatherSearchQuery('');
                              setFatherSearchResults([]);
                            }}
                            className="w-full p-2 text-right hover:bg-gray-50 text-sm"
                          >
                            {member.fullNameAr || member.firstName}
                            {member.generation && <span className="text-gray-500"> (الجيل {member.generation})</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الجنس <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={newMemberData.gender === 'Male'}
                      onChange={() => setNewMemberData({ ...newMemberData, gender: 'Male' })}
                      className="w-4 h-4 text-[#1E3A5F]"
                    />
                    <span>ذكر</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={newMemberData.gender === 'Female'}
                      onChange={() => setNewMemberData({ ...newMemberData, gender: 'Female' })}
                      className="w-4 h-4 text-[#1E3A5F]"
                    />
                    <span>أنثى</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCreateMemberModal(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateMemberForUser}
                disabled={isProcessing || !newMemberData.nameAr || !newMemberData.fatherId}
                className="flex-1 py-2 px-4 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2d5a8a] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
                إنشاء وربط
              </button>
            </div>
          </div>
        </div>
      )}

      {setParentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">تعيين الأب</h3>
              <button onClick={() => setSetParentModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              تعيين أب للعضو <span className="font-medium">{setParentModal.memberName}</span>
            </p>
            
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن الأب بالاسم..."
                className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1E3A5F]"
              />
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {searchResults.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSetMemberParent(setParentModal.memberId, member.id)}
                    disabled={isProcessing}
                    className="w-full p-3 text-right hover:bg-gray-50 flex items-center justify-between disabled:opacity-50"
                  >
                    <div>
                      <p className="font-medium">{member.fullNameAr || member.firstName}</p>
                      <p className="text-sm text-gray-500">
                        {member.fullNameEn && <span>{member.fullNameEn} • </span>}
                        الجيل: {member.generation || '-'}
                      </p>
                    </div>
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 size={16} className="text-[#1E3A5F]" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-center text-gray-500 py-4">لم يتم العثور على نتائج</p>
            )}
          </div>
        </div>
      )}

      {confirmRollback && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <h3 className="text-lg font-bold">تأكيد التراجع</h3>
            </div>
            <p className="text-gray-600 mb-6">
              هل أنت متأكد من التراجع عن هذا التغيير؟ سيتم إعادة البيانات إلى حالتها السابقة.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRollback(null)}
                disabled={isProcessing}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleRollback(confirmRollback.changeId)}
                disabled={isProcessing}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw size={16} />}
                تأكيد التراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
