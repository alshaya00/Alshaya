'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Check, X, Clock, Eye, Trash2, Search, FileText,
  CheckCircle, XCircle, Loader2, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

type FilterStatus = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface Journal {
  id: string;
  titleAr: string;
  titleEn: string | null;
  category: string;
  authorName: string;
  status: string;
  reviewStatus: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

const categoryLabels: Record<string, string> = {
  'ORAL_HISTORY': 'تاريخ شفهي',
  'BIOGRAPHY': 'سيرة ذاتية',
  'EVENT': 'حدث تاريخي',
  'TRADITION': 'تقاليد وعادات',
  'MEMORY': 'ذكريات',
  'OTHER': 'أخرى'
};

export default function AdminJournalsPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    type: 'approve' | 'reject' | 'delete';
    journal: Journal;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { session } = useAuth();

  const fetchJournals = useCallback(async () => {
    if (!session?.token) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/journals', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJournals(data.data || []);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'فشل في جلب القصص');
      }
    } catch (err) {
      console.error('Error fetching journals:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    }
  }, [session?.token]);

  useEffect(() => {
    async function fetchData() {
      if (!session?.token) return;
      setIsLoading(true);
      await fetchJournals();
      setIsLoading(false);
    }
    fetchData();
  }, [session?.token, fetchJournals]);

  const filteredJournals = useMemo(() => {
    let result = journals;

    if (filter !== 'all') {
      result = result.filter(j => j.reviewStatus === filter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(j =>
        j.titleAr.toLowerCase().includes(query) ||
        (j.titleEn && j.titleEn.toLowerCase().includes(query)) ||
        j.authorName.toLowerCase().includes(query)
      );
    }

    return result;
  }, [journals, filter, searchQuery]);

  const stats = useMemo(() => ({
    total: journals.length,
    pending: journals.filter(j => j.reviewStatus === 'PENDING').length,
    approved: journals.filter(j => j.reviewStatus === 'APPROVED').length,
    rejected: journals.filter(j => j.reviewStatus === 'REJECTED').length,
  }), [journals]);

  const handleApprove = async (journal: Journal) => {
    if (!session?.token) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/journals/${journal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (res.ok) {
        await fetchJournals();
        setShowConfirmModal(null);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'فشل في الموافقة على القصة');
      }
    } catch (err) {
      console.error('Error approving journal:', err);
      setError('حدث خطأ في الموافقة على القصة');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (journal: Journal) => {
    if (!session?.token) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/journals/${journal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ action: 'reject', reviewNotes: rejectReason }),
      });
      if (res.ok) {
        await fetchJournals();
        setShowConfirmModal(null);
        setRejectReason('');
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'فشل في رفض القصة');
      }
    } catch (err) {
      console.error('Error rejecting journal:', err);
      setError('حدث خطأ في رفض القصة');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (journal: Journal) => {
    if (!session?.token) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/journals/${journal.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      if (res.ok) {
        await fetchJournals();
        setShowConfirmModal(null);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'فشل في حذف القصة');
      }
    } catch (err) {
      console.error('Error deleting journal:', err);
      setError('حدث خطأ في حذف القصة');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (reviewStatus: string) => {
    switch (reviewStatus) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            <Clock className="w-3 h-3" />
            قيد المراجعة
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            <CheckCircle className="w-3 h-3" />
            مُعتمد
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            <XCircle className="w-3 h-3" />
            مرفوض
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-[#1E3A5F]" />
            موافقات القصص
          </h1>
          <p className="text-gray-500 mt-1">مراجعة وإدارة قصص العائلة المقدمة</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="mr-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">إجمالي القصص</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-200 bg-yellow-50">
          <div className="text-3xl font-bold text-yellow-700">{stats.pending}</div>
          <div className="text-sm text-yellow-600">قيد المراجعة</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200 bg-green-50">
          <div className="text-3xl font-bold text-green-700">{stats.approved}</div>
          <div className="text-sm text-green-600">مُعتمد</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-200 bg-red-50">
          <div className="text-3xl font-bold text-red-700">{stats.rejected}</div>
          <div className="text-sm text-red-600">مرفوض</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن قصة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'الكل' },
              { value: 'PENDING', label: 'قيد المراجعة' },
              { value: 'APPROVED', label: 'مُعتمد' },
              { value: 'REJECTED', label: 'مرفوض' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as FilterStatus)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === option.value
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {filteredJournals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>لا توجد قصص مطابقة للفلتر المحدد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">العنوان</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الكاتب</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الفئة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">التاريخ</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredJournals.map((journal) => (
                  <tr key={journal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{journal.titleAr}</div>
                      {journal.titleEn && (
                        <div className="text-sm text-gray-500">{journal.titleEn}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{journal.authorName}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {categoryLabels[journal.category] || journal.category}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {formatDate(journal.createdAt)}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(journal.reviewStatus)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/journals/${journal.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="عرض"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {journal.reviewStatus === 'PENDING' && (
                          <>
                            <button
                              onClick={() => setShowConfirmModal({ type: 'approve', journal })}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="موافقة"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowConfirmModal({ type: 'reject', journal })}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="رفض"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setShowConfirmModal({ type: 'delete', journal })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            {showConfirmModal.type === 'approve' && (
              <>
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle className="w-8 h-8" />
                  <h3 className="text-lg font-bold">تأكيد الموافقة</h3>
                </div>
                <p className="text-gray-600">
                  هل تريد الموافقة على القصة &quot;{showConfirmModal.journal.titleAr}&quot; ونشرها؟
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowConfirmModal(null)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    disabled={isProcessing}
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => handleApprove(showConfirmModal.journal)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                    موافقة ونشر
                  </button>
                </div>
              </>
            )}

            {showConfirmModal.type === 'reject' && (
              <>
                <div className="flex items-center gap-3 text-orange-600">
                  <XCircle className="w-8 h-8" />
                  <h3 className="text-lg font-bold">رفض القصة</h3>
                </div>
                <p className="text-gray-600">
                  هل تريد رفض القصة &quot;{showConfirmModal.journal.titleAr}&quot;؟
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="سبب الرفض (اختياري)"
                  className="w-full p-3 border rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowConfirmModal(null);
                      setRejectReason('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    disabled={isProcessing}
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => handleReject(showConfirmModal.journal)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                    رفض
                  </button>
                </div>
              </>
            )}

            {showConfirmModal.type === 'delete' && (
              <>
                <div className="flex items-center gap-3 text-red-600">
                  <AlertTriangle className="w-8 h-8" />
                  <h3 className="text-lg font-bold">تأكيد الحذف</h3>
                </div>
                <p className="text-gray-600">
                  هل تريد حذف القصة &quot;{showConfirmModal.journal.titleAr}&quot; نهائياً؟
                  <br />
                  <span className="text-red-600 text-sm">هذا الإجراء لا يمكن التراجع عنه.</span>
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowConfirmModal(null)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    disabled={isProcessing}
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => handleDelete(showConfirmModal.journal)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                    حذف نهائياً
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
