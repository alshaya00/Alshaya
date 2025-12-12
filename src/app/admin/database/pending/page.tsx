'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  ChevronLeft,
  RefreshCw,
  Check,
  X,
  Eye,
  Edit,
  Calendar,
  User,
  MapPin,
  Phone,
} from 'lucide-react';
import type { PendingMember } from '@/lib/types';

export default function PendingPage() {
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPending, setSelectedPending] = useState<PendingMember | null>(null);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/pending');
      const data = await res.json();
      setPending(data.pending || []);
    } catch (error) {
      console.error('Error loading pending:', error);
      // Load from localStorage as fallback
      const stored = localStorage.getItem('alshaye_pending_members');
      if (stored) {
        setPending(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/admin/pending/${id}/approve`, { method: 'POST' }).catch(() => {
        // Fallback
        const stored = JSON.parse(localStorage.getItem('alshaye_pending_members') || '[]');
        const updated = stored.map((p: PendingMember) =>
          p.id === id ? { ...p, reviewStatus: 'APPROVED', reviewedAt: new Date().toISOString() } : p
        );
        localStorage.setItem('alshaye_pending_members', JSON.stringify(updated));
      });

      setPending((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, reviewStatus: 'APPROVED' as const, reviewedAt: new Date() } : p
        )
      );
      alert('تمت الموافقة على الطلب');
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('سبب الرفض (اختياري):');
    try {
      await fetch(`/api/admin/pending/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }).catch(() => {
        // Fallback
        const stored = JSON.parse(localStorage.getItem('alshaye_pending_members') || '[]');
        const updated = stored.map((p: PendingMember) =>
          p.id === id ? { ...p, reviewStatus: 'REJECTED', reviewNotes: reason, reviewedAt: new Date().toISOString() } : p
        );
        localStorage.setItem('alshaye_pending_members', JSON.stringify(updated));
      });

      setPending((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, reviewStatus: 'REJECTED' as const, reviewNotes: reason, reviewedAt: new Date() } : p
        )
      );
      alert('تم رفض الطلب');
    } catch (error) {
      console.error('Error rejecting:', error);
    }
  };

  const filteredPending = filter === 'all' ? pending : pending.filter((p) => p.reviewStatus === filter);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: 'معلق', color: 'bg-yellow-100 text-yellow-700' };
      case 'APPROVED':
        return { label: 'موافق عليه', color: 'bg-green-100 text-green-700' };
      case 'REJECTED':
        return { label: 'مرفوض', color: 'bg-red-100 text-red-700' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل الطلبات المعلقة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">لوحة التحكم</Link>
          <ChevronLeft className="w-4 h-4" />
          <Link href="/admin/database" className="hover:text-gray-700">قاعدة البيانات</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-gray-800">الطلبات المعلقة</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">الطلبات المعلقة</h1>
              <p className="text-sm text-gray-500">PendingMember - {pending.length} طلب</p>
            </div>
          </div>
          <button
            onClick={loadPending}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
            تحديث
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === f
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'الكل' : getStatusInfo(f).label}
            <span className="mr-2 text-sm opacity-70">
              ({f === 'all' ? pending.length : pending.filter((p) => p.reviewStatus === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {filteredPending.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">لا توجد طلبات</h3>
          <p className="text-gray-400">لم يتم العثور على طلبات مطابقة</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPending.map((item) => {
            const statusInfo = getStatusInfo(item.reviewStatus);
            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      item.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
                    }`}>
                      <span className="text-xl">
                        {item.gender === 'Male' ? '👨' : '👩'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800">{item.firstName}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{item.fullNameAr}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(item.submittedAt)}
                        </span>
                        {item.branch && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {item.branch}
                          </span>
                        )}
                        {item.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {item.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPending(item)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="عرض التفاصيل"
                    >
                      <Eye className="w-5 h-5 text-gray-500" />
                    </button>
                    {item.reviewStatus === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="p-2 hover:bg-green-100 rounded-lg"
                          title="موافقة"
                        >
                          <Check className="w-5 h-5 text-green-500" />
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          className="p-2 hover:bg-red-100 rounded-lg"
                          title="رفض"
                        >
                          <X className="w-5 h-5 text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {item.reviewNotes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                    <span className="text-gray-500">ملاحظات المراجعة: </span>
                    {item.reviewNotes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">تفاصيل الطلب</h3>
              <button
                onClick={() => setSelectedPending(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">الاسم الأول</label>
                  <p className="font-medium">{selectedPending.firstName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">الجنس</label>
                  <p>{selectedPending.gender === 'Male' ? 'ذكر' : 'أنثى'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">الجيل</label>
                  <p>الجيل {selectedPending.generation}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">الفرع</label>
                  <p>{selectedPending.branch || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">سنة الميلاد</label>
                  <p>{selectedPending.birthYear || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">الحالة</label>
                  <p>{selectedPending.status}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">الهاتف</label>
                  <p dir="ltr">{selectedPending.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">البريد</label>
                  <p dir="ltr">{selectedPending.email || '-'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500">الاسم الكامل</label>
                <p>{selectedPending.fullNameAr || '-'}</p>
              </div>

              <div className="pt-4 border-t">
                <label className="text-sm text-gray-500">تاريخ التقديم</label>
                <p>{formatDate(selectedPending.submittedAt)}</p>
              </div>

              {selectedPending.submittedVia && (
                <div>
                  <label className="text-sm text-gray-500">طريقة التقديم</label>
                  <p>{selectedPending.submittedVia}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedPending(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                إغلاق
              </button>
              {selectedPending.reviewStatus === 'PENDING' && (
                <>
                  <button
                    onClick={() => {
                      handleReject(selectedPending.id);
                      setSelectedPending(null);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    رفض
                  </button>
                  <button
                    onClick={() => {
                      handleApprove(selectedPending.id);
                      setSelectedPending(null);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    موافقة
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
