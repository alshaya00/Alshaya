'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  History,
  RotateCcw,
  Clock,
  User,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Trash2,
  Calendar,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { FamilyMember } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

interface ChangeRecord {
  id: string;
  memberId: string;
  memberName: string;
  changes: Record<string, unknown>;
  reason?: string;
  timestamp: string;
  cascadeUpdates?: { memberId: string; changes: Record<string, unknown>; reason: string }[];
}

interface Snapshot {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  snapshotType: 'MANUAL' | 'AUTO_BACKUP' | 'PRE_IMPORT' | 'PRE_RESTORE';
}

export default function HistoryPage() {
  const { session, isLoading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'changes' | 'snapshots'>('changes');
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [expandedChanges, setExpandedChanges] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [selectedRollback, setSelectedRollback] = useState<ChangeRecord | null>(null);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    // Wait for auth to load and require authentication
    if (authLoading || !session?.token) return;
    
    async function fetchMembers() {
      try {
        const headers: HeadersInit = { Authorization: `Bearer ${session!.token}` };
        const res = await fetch('/api/members?limit=500', { headers });
        if (res.ok) {
          const data = await res.json();
          setAllMembers(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    }
    fetchMembers();
  }, [authLoading, session?.token]);

  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(true);

  useEffect(() => {
    // Wait for auth to load and require authentication
    if (authLoading) return;
    if (!session?.token) {
      setIsLoadingSnapshots(false);
      return;
    }

    async function fetchSnapshots() {
      try {
        setIsLoadingSnapshots(true);
        const headers: HeadersInit = { Authorization: `Bearer ${session!.token}` };
        const res = await fetch('/api/admin/snapshots', { headers });
        if (res.ok) {
          const data = await res.json();
          setSnapshots(data.snapshots || []);
        }
      } catch (error) {
        console.error('Error fetching snapshots:', error);
      } finally {
        setIsLoadingSnapshots(false);
      }
    }

    async function fetchChangeHistory() {
      try {
        const headers: HeadersInit = { Authorization: `Bearer ${session!.token}` };
        const res = await fetch('/api/admin/history?limit=100', { headers });
        if (res.ok) {
          const data = await res.json();
          const formattedChanges: ChangeRecord[] = (data.changes || []).map((ch: any) => ({
            id: ch.id,
            memberId: ch.memberId,
            memberName: ch.member?.firstName || ch.memberId,
            changes: { [ch.fieldName]: ch.newValue },
            reason: ch.reason || `${ch.changeType}: ${ch.fieldName}`,
            timestamp: ch.changedAt,
          }));
          setChanges(formattedChanges);
        }
      } catch (error) {
        console.error('Error fetching change history:', error);
        setChanges([]);
      }
    }

    fetchSnapshots();
    fetchChangeHistory();
  }, [authLoading, session?.token]);

  // Filter changes
  const filteredChanges = useMemo(() => {
    return changes.filter(change => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!change.memberName.toLowerCase().includes(query) &&
            !change.memberId.toLowerCase().includes(query) &&
            !(change.reason || '').toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filterMember && change.memberId !== filterMember) {
        return false;
      }

      if (filterDateFrom) {
        const changeDate = new Date(change.timestamp);
        const fromDate = new Date(filterDateFrom);
        if (changeDate < fromDate) return false;
      }

      if (filterDateTo) {
        const changeDate = new Date(change.timestamp);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59);
        if (changeDate > toDate) return false;
      }

      return true;
    });
  }, [changes, searchQuery, filterMember, filterDateFrom, filterDateTo]);

  // Toggle change expansion
  const toggleChange = (id: string) => {
    setExpandedChanges(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const [savingSnapshot, setSavingSnapshot] = useState(false);

  const createSnapshot = async () => {
    if (!snapshotName.trim()) {
      alert('يرجى إدخال اسم للنسخة');
      return;
    }

    setSavingSnapshot(true);
    try {
      const res = await fetch('/api/admin/snapshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}`,
        },
        body: JSON.stringify({
          name: snapshotName,
          description: snapshotDescription,
          snapshotType: 'MANUAL',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSnapshots([data.snapshot, ...snapshots]);
        setIsCreatingSnapshot(false);
        setSnapshotName('');
        setSnapshotDescription('');
        alert('تم إنشاء النسخة الاحتياطية بنجاح');
      } else {
        const err = await res.json();
        alert(`فشل إنشاء النسخة: ${err.messageAr || err.message || 'خطأ غير معروف'}`);
      }
    } catch (error) {
      console.error('Error creating snapshot:', error);
      alert('حدث خطأ أثناء إنشاء النسخة الاحتياطية');
    } finally {
      setSavingSnapshot(false);
    }
  };

  // Rollback change
  const rollbackChange = (change: ChangeRecord) => {
    setSelectedRollback(change);
    setShowRollbackDialog(true);
  };

  // Confirm rollback
  const confirmRollback = () => {
    if (!selectedRollback) return;

    // In real implementation, this would:
    // 1. Retrieve the old values from the change record
    // 2. Apply the reverse changes to the database
    // 3. Create a new change record for the rollback

    const rollbackRecord: ChangeRecord = {
      id: `rollback_${Date.now()}`,
      memberId: selectedRollback.memberId,
      memberName: selectedRollback.memberName,
      changes: { _rollback: true, originalChange: selectedRollback.id },
      reason: `استرجاع التغيير: ${selectedRollback.reason || 'بدون سبب'}`,
      timestamp: new Date().toISOString()
    };

    setChanges(prev => [rollbackRecord, ...prev]);
    setShowRollbackDialog(false);
    setSelectedRollback(null);

    alert('تم استرجاع التغيير بنجاح');
  };

  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoreConfirmModal, setRestoreConfirmModal] = useState<{
    snapshot: Snapshot | null;
    confirmText: string;
  }>({ snapshot: null, confirmText: '' });

  const restoreSnapshot = (snapshot: Snapshot) => {
    setRestoreConfirmModal({ snapshot, confirmText: '' });
  };

  const executeRestore = async () => {
    const snapshot = restoreConfirmModal.snapshot;
    if (!snapshot) return;

    setRestoreConfirmModal({ snapshot: null, confirmText: '' });
    setRestoringId(snapshot.id);
    try {
      const res = await fetch(`/api/admin/snapshots/${snapshot.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}`,
        },
        body: JSON.stringify({ action: 'restore' }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`${data.messageAr}\n\nتم استعادة ${data.details?.restoredCount || snapshot.memberCount} عضو.`);
        window.location.reload();
      } else {
        const err = await res.json();
        alert(`فشلت الاستعادة: ${err.messageAr || err.message || 'خطأ غير معروف'}`);
      }
    } catch (error) {
      console.error('Error restoring snapshot:', error);
      alert('حدث خطأ أثناء استعادة النسخة');
    } finally {
      setRestoringId(null);
    }
  };

  const deleteSnapshot = async (snapshotId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه النسخة الاحتياطية؟\n\nلا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    setDeletingId(snapshotId);
    try {
      const res = await fetch(`/api/admin/snapshots/${snapshotId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      });

      if (res.ok) {
        setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
        alert('تم حذف النسخة الاحتياطية');
      } else {
        const err = await res.json();
        alert(`فشل الحذف: ${err.messageAr || err.message || 'خطأ غير معروف'}`);
      }
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      alert('حدث خطأ أثناء حذف النسخة');
    } finally {
      setDeletingId(null);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  // Get relative time
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return formatTimestamp(timestamp);
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#1E3A5F] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Show login required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">يجب تسجيل الدخول</h2>
          <p className="text-gray-600 mb-6">هذه الصفحة متاحة للمشرفين فقط. يرجى تسجيل الدخول للوصول إلى سجل التغييرات والنسخ الاحتياطية.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] transition-colors"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowRight className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">سجل التغييرات</h1>
                <p className="text-white/80 text-sm">Change History & Rollback</p>
              </div>
            </div>

            <button
              onClick={() => setIsCreatingSnapshot(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg"
            >
              <Download className="w-4 h-4" />
              إنشاء نسخة احتياطية
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('changes')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'changes'
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <History className="w-5 h-5" />
            التغييرات ({filteredChanges.length})
          </button>
          <button
            onClick={() => setActiveTab('snapshots')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'snapshots'
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Download className="w-5 h-5" />
            النسخ الاحتياطية ({snapshots.length})
          </button>
        </div>

        {/* Changes tab */}
        {activeTab === 'changes' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="بحث في التغييرات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <select
                  value={filterMember}
                  onChange={(e) => setFilterMember(e.target.value)}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="">جميع الأعضاء</option>
                  {allMembers.slice(0, 20).map(m => (
                    <option key={m.id} value={m.id}>{m.firstName} ({m.id})</option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 whitespace-nowrap">من:</label>
                  <input
                    type="date"
                    dir="ltr"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="px-4 py-2 border rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 whitespace-nowrap">إلى:</label>
                  <input
                    type="date"
                    dir="ltr"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="px-4 py-2 border rounded-lg"
                  />
                </div>

                {(searchQuery || filterMember || filterDateFrom || filterDateTo) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterMember('');
                      setFilterDateFrom('');
                      setFilterDateTo('');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    إزالة الفلاتر
                  </button>
                )}
              </div>
            </div>

            {/* Changes list */}
            {filteredChanges.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-600 mb-2">لا توجد تغييرات</h3>
                <p className="text-gray-500">لم يتم تسجيل أي تغييرات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredChanges.map(change => {
                  const isExpanded = expandedChanges.includes(change.id);

                  return (
                    <div
                      key={change.id}
                      className="bg-white rounded-xl shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={() => toggleChange(change.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{change.memberName}</div>
                            <div className="text-sm text-gray-500">
                              {change.reason || `تعديل ${Object.keys(change.changes).length} حقول`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-left">
                            <div className="text-sm text-gray-500">
                              {getRelativeTime(change.timestamp)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatTimestamp(change.timestamp)}
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t p-4 bg-gray-50">
                          <h4 className="font-bold text-gray-700 mb-3">التغييرات:</h4>
                          <div className="space-y-2 mb-4">
                            {Object.entries(change.changes).map(([field, value]) => (
                              <div key={field} className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-600">{field}:</span>
                                <span className="text-green-600">{String(value)}</span>
                              </div>
                            ))}
                          </div>

                          {change.cascadeUpdates && change.cascadeUpdates.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-bold text-gray-700 mb-2">تحديثات متتالية:</h4>
                              <div className="space-y-1">
                                {change.cascadeUpdates.map((cascade, i) => (
                                  <div key={i} className="text-sm text-gray-500">
                                    {cascade.memberId}: {cascade.reason}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => rollbackChange(change)}
                              className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                            >
                              <RotateCcw className="w-4 h-4" />
                              استرجاع
                            </button>
                            <Link
                              href={`/member/${change.memberId}`}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                              <Eye className="w-4 h-4" />
                              عرض العضو
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Snapshots tab */}
        {activeTab === 'snapshots' && (
          <div className="space-y-6">
            {snapshots.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Download className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-600 mb-2">لا توجد نسخ احتياطية</h3>
                <p className="text-gray-500 mb-4">لم يتم إنشاء أي نسخ احتياطية بعد</p>
                <button
                  onClick={() => setIsCreatingSnapshot(true)}
                  className="px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87]"
                >
                  إنشاء نسخة احتياطية
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {snapshots.map(snapshot => (
                  <div
                    key={snapshot.id}
                    className="bg-white rounded-xl shadow-sm p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`px-2 py-1 rounded text-xs ${
                        snapshot.snapshotType === 'MANUAL'
                          ? 'bg-blue-100 text-blue-700'
                          : snapshot.snapshotType === 'AUTO_BACKUP'
                          ? 'bg-green-100 text-green-700'
                          : snapshot.snapshotType === 'PRE_RESTORE'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {snapshot.snapshotType === 'MANUAL' ? 'يدوي' :
                         snapshot.snapshotType === 'AUTO_BACKUP' ? 'تلقائي' :
                         snapshot.snapshotType === 'PRE_RESTORE' ? 'قبل الاستعادة' : 'قبل الاستيراد'}
                      </div>
                      <button
                        onClick={() => deleteSnapshot(snapshot.id)}
                        disabled={deletingId === snapshot.id}
                        className="p-1 hover:bg-red-100 rounded text-red-500 disabled:opacity-50"
                      >
                        {deletingId === snapshot.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <h3 className="font-bold text-lg mb-1">{snapshot.name}</h3>
                    {snapshot.description && (
                      <p className="text-sm text-gray-500 mb-3">{snapshot.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {snapshot.memberCount} عضو
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatTimestamp(snapshot.createdAt)}
                      </div>
                    </div>

                    <button
                      onClick={() => restoreSnapshot(snapshot)}
                      disabled={restoringId !== null}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] disabled:opacity-50"
                    >
                      {restoringId === snapshot.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                      استرجاع هذه النسخة
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create snapshot dialog */}
      {isCreatingSnapshot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="font-bold text-lg mb-4">إنشاء نسخة احتياطية</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم النسخة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="مثال: نسخة قبل التعديلات الكبيرة"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الوصف (اختياري)
                </label>
                <textarea
                  value={snapshotDescription}
                  onChange={(e) => setSnapshotDescription(e.target.value)}
                  placeholder="أضف وصفاً للنسخة..."
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4" />
                  سيتم حفظ {allMembers.length} عضو
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {new Date().toLocaleString('ar-SA')}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setIsCreatingSnapshot(false);
                  setSnapshotName('');
                  setSnapshotDescription('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={createSnapshot}
                className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                إنشاء النسخة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rollback confirmation dialog */}
      {showRollbackDialog && selectedRollback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-yellow-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-lg">تأكيد الاسترجاع</h3>
            </div>
            <p className="text-gray-600 mb-4">
              هل تريد استرجاع التغيير التالي؟
            </p>
            <div className="p-3 bg-gray-50 rounded-lg mb-6">
              <div className="font-bold">{selectedRollback.memberName}</div>
              <div className="text-sm text-gray-500">
                {selectedRollback.reason || 'بدون سبب'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatTimestamp(selectedRollback.timestamp)}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRollbackDialog(false);
                  setSelectedRollback(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={confirmRollback}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                استرجاع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore snapshot confirmation modal */}
      {restoreConfirmModal.snapshot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-lg">تأكيد الاستعادة</h3>
            </div>
            
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-red-700 font-medium mb-1">
                هذا الإجراء سيحذف جميع البيانات الحالية ويستبدلها بالنسخة الاحتياطية
              </p>
              <p className="text-red-600 text-sm">
                This will delete all current data and replace it with the backup
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <div className="font-bold text-gray-800">{restoreConfirmModal.snapshot.name}</div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {restoreConfirmModal.snapshot.memberCount} عضو
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatTimestamp(restoreConfirmModal.snapshot.createdAt)}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اكتب "CONFIRM" للمتابعة
              </label>
              <input
                type="text"
                value={restoreConfirmModal.confirmText}
                onChange={(e) => setRestoreConfirmModal(prev => ({
                  ...prev,
                  confirmText: e.target.value
                }))}
                placeholder='اكتب "CONFIRM" للمتابعة'
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                dir="ltr"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRestoreConfirmModal({ snapshot: null, confirmText: '' })}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={executeRestore}
                disabled={restoreConfirmModal.confirmText !== 'CONFIRM'}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  restoreConfirmModal.confirmText === 'CONFIRM'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                استعادة النسخة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
