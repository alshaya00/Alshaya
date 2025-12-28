'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Check, X, Clock, Mail, Phone, Users, AlertCircle,
  UserPlus, CheckCircle, XCircle, Loader2, MessageSquare, Search, Info,
  AlertTriangle, Copy
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

type FilterStatus = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO';

interface RelatedMember {
  id: string;
  firstName: string;
  fatherName: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  generation: number;
  branch: string | null;
}

interface DuplicateCandidate {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  similarityScore: number;
  matchReasons: string[];
  matchReasonsAr: string[];
}

interface DuplicateWarning {
  hasPotentialDuplicates: boolean;
  highestScore: number;
  isDuplicate: boolean;
  candidates: DuplicateCandidate[];
}

interface AccessRequest {
  id: string;
  nameArabic: string;
  nameEnglish: string | null;
  email: string;
  phone: string | null;
  claimedRelation: string | null;
  relatedMemberId: string | null;
  relatedMember: RelatedMember | null;
  message: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO';
  createdAt: string;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewNote: string | null;
  duplicateWarning?: DuplicateWarning | null;
}

export default function AdminAccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    type: 'approve' | 'reject' | 'more_info';
    request: AccessRequest;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [moreInfoNote, setMoreInfoNote] = useState('');
  const { session } = useAuth();

  const fetchAccessRequests = useCallback(async () => {
    if (!session?.token) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/access-requests', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.accessRequests || []);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في جلب الطلبات');
      }
    } catch (err) {
      console.error('Error fetching access requests:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    }
  }, [session?.token]);

  useEffect(() => {
    async function fetchData() {
      if (!session?.token) return;
      setIsLoading(true);
      await fetchAccessRequests();
      setIsLoading(false);
    }
    fetchData();
  }, [session?.token, fetchAccessRequests]);

  const filteredRequests = useMemo(() => {
    let result = requests;

    if (filter !== 'all') {
      result = result.filter(r => r.status === filter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.nameArabic.toLowerCase().includes(query) ||
        (r.nameEnglish && r.nameEnglish.toLowerCase().includes(query)) ||
        r.email.toLowerCase().includes(query) ||
        (r.phone && r.phone.includes(query))
      );
    }

    return result;
  }, [requests, filter, searchQuery]);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
    moreInfo: requests.filter(r => r.status === 'MORE_INFO').length,
  }), [requests]);

  const handleApprove = async (request: AccessRequest) => {
    if (!session?.token) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/access-requests/${request.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchAccessRequests();
        setShowConfirmModal(null);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في الموافقة على الطلب');
      }
    } catch (err) {
      console.error('Error approving request:', err);
      setError('حدث خطأ في الموافقة على الطلب');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (request: AccessRequest) => {
    if (!session?.token) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/access-requests/${request.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (res.ok) {
        await fetchAccessRequests();
        setShowConfirmModal(null);
        setRejectionReason('');
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في رفض الطلب');
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError('حدث خطأ في رفض الطلب');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestMoreInfo = async (request: AccessRequest) => {
    if (!session?.token) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/access-requests/${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ status: 'MORE_INFO', reviewNote: moreInfoNote }),
      });
      if (res.ok) {
        await fetchAccessRequests();
        setShowConfirmModal(null);
        setMoreInfoNote('');
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في تحديث الطلب');
      }
    } catch (err) {
      console.error('Error updating request:', err);
      setError('حدث خطأ في تحديث الطلب');
    } finally {
      setIsProcessing(false);
    }
  };

  const statusColors = {
    PENDING: 'bg-orange-100 text-orange-700 border-orange-300',
    APPROVED: 'bg-green-100 text-green-700 border-green-300',
    REJECTED: 'bg-red-100 text-red-700 border-red-300',
    MORE_INFO: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  };

  const statusIcons = {
    PENDING: <Clock size={14} />,
    APPROVED: <CheckCircle size={14} />,
    REJECTED: <XCircle size={14} />,
    MORE_INFO: <AlertCircle size={14} />,
  };

  const statusLabels = {
    PENDING: 'معلقة',
    APPROVED: 'مقبولة',
    REJECTED: 'مرفوضة',
    MORE_INFO: 'بانتظار معلومات',
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
              <UserPlus className="text-blue-500" size={28} />
              طلبات الانضمام
            </h1>
            <p className="text-gray-500 mt-1">راجع وأقر طلبات الانضمام الجديدة</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            العودة للوحة التحكم
          </Link>
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

        <div className="grid grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setFilter('PENDING')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'PENDING' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border hover:border-orange-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-sm opacity-80">معلقة</p>
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'APPROVED' ? 'bg-green-500 text-white shadow-lg' : 'bg-white border hover:border-green-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.approved}</p>
            <p className="text-sm opacity-80">مقبولة</p>
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'REJECTED' ? 'bg-red-500 text-white shadow-lg' : 'bg-white border hover:border-red-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.rejected}</p>
            <p className="text-sm opacity-80">مرفوضة</p>
          </button>
          <button
            onClick={() => setFilter('MORE_INFO')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'MORE_INFO' ? 'bg-yellow-500 text-white shadow-lg' : 'bg-white border hover:border-yellow-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.moreInfo}</p>
            <p className="text-sm opacity-80">معلومات</p>
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
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو البريد الإلكتروني أو رقم الهاتف..."
              className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {filteredRequests.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-700">لا يوجد طلبات</h3>
            <p className="text-gray-500 mt-1">
              {filter === 'PENDING' ? 'لا يوجد طلبات معلقة' : 'لا يوجد طلبات في هذه الفئة'}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {filteredRequests.map(request => (
            <div key={request.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                      <UserPlus className="text-blue-500" size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800 text-lg">
                          {request.nameArabic}
                        </span>
                        {request.nameEnglish && (
                          <span className="text-gray-500 text-sm">
                            ({request.nameEnglish})
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusColors[request.status]}`}>
                          {statusIcons[request.status]}
                          {statusLabels[request.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {request.email}
                        </span>
                        {request.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={14} />
                            {request.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-left text-sm text-gray-400">
                    {new Date(request.createdAt).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {request.claimedRelation && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users size={16} className="text-gray-400" />
                      <span className="text-gray-500">صلة القرابة:</span>
                      <span className="font-medium">{request.claimedRelation}</span>
                    </div>
                  )}
                  {request.relatedMember && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users size={16} className="text-gray-400" />
                      <span className="text-gray-500">العضو المرتبط:</span>
                      <Link
                        href={`/member/${request.relatedMember.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {request.relatedMember.fullNameAr || request.relatedMember.firstName}
                        {request.relatedMember.generation && (
                          <span className="text-gray-400 text-xs mr-1">
                            (الجيل {request.relatedMember.generation})
                          </span>
                        )}
                      </Link>
                    </div>
                  )}
                </div>

                {request.message && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <MessageSquare size={14} />
                      <span>الرسالة:</span>
                    </div>
                    <p className="text-gray-700">{request.message}</p>
                  </div>
                )}

                {request.reviewNote && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-700 text-sm mb-1">
                      <Info size={14} />
                      <span>ملاحظة المراجعة:</span>
                    </div>
                    <p className="text-yellow-800">{request.reviewNote}</p>
                  </div>
                )}

                {request.duplicateWarning?.hasPotentialDuplicates && (
                  <div className={`mt-4 p-4 rounded-lg border-2 ${
                    request.duplicateWarning.isDuplicate 
                      ? 'bg-red-50 border-red-300' 
                      : 'bg-orange-50 border-orange-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className={`${
                        request.duplicateWarning.isDuplicate ? 'text-red-500' : 'text-orange-500'
                      }`} size={20} />
                      <span className={`font-bold ${
                        request.duplicateWarning.isDuplicate ? 'text-red-700' : 'text-orange-700'
                      }`}>
                        {request.duplicateWarning.isDuplicate 
                          ? '⚠️ تحذير: تكرار محتمل مؤكد!' 
                          : '⚠️ تنبيه: تشابه محتمل مع أعضاء موجودين'}
                      </span>
                      <span className={`text-sm px-2 py-0.5 rounded-full ${
                        request.duplicateWarning.isDuplicate 
                          ? 'bg-red-200 text-red-700' 
                          : 'bg-orange-200 text-orange-700'
                      }`}>
                        {request.duplicateWarning.highestScore}% تطابق
                      </span>
                    </div>
                    <div className="space-y-2">
                      {request.duplicateWarning.candidates.map((candidate) => (
                        <div key={candidate.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div className="flex items-center gap-3">
                            <Copy size={16} className="text-gray-400" />
                            <div>
                              <Link 
                                href={`/member/${candidate.id}`}
                                className="font-medium text-blue-600 hover:underline"
                              >
                                {candidate.fullNameAr || candidate.firstName}
                              </Link>
                              {candidate.fullNameEn && (
                                <p className="text-xs text-gray-500">{candidate.fullNameEn}</p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {candidate.matchReasonsAr.map((reason, idx) => (
                                  <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className={`text-lg font-bold ${
                            candidate.similarityScore >= 80 ? 'text-red-600' : 'text-orange-600'
                          }`}>
                            {candidate.similarityScore}%
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-gray-600">
                      يرجى التحقق من العضو الموجود قبل الموافقة على هذا الطلب لتجنب التكرار.
                    </p>
                  </div>
                )}

                {request.status === 'PENDING' && (
                  <div className="mt-4 pt-4 border-t flex items-center gap-3">
                    <button
                      onClick={() => setShowConfirmModal({ type: 'approve', request })}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                      disabled={isProcessing}
                    >
                      <Check size={18} />
                      قبول
                    </button>
                    <button
                      onClick={() => setShowConfirmModal({ type: 'reject', request })}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                      disabled={isProcessing}
                    >
                      <X size={18} />
                      رفض
                    </button>
                    <button
                      onClick={() => setShowConfirmModal({ type: 'more_info', request })}
                      className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                      disabled={isProcessing}
                    >
                      <AlertCircle size={18} />
                      طلب معلومات إضافية
                    </button>
                  </div>
                )}

                {request.status === 'MORE_INFO' && (
                  <div className="mt-4 pt-4 border-t flex items-center gap-3">
                    <button
                      onClick={() => setShowConfirmModal({ type: 'approve', request })}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                      disabled={isProcessing}
                    >
                      <Check size={18} />
                      قبول
                    </button>
                    <button
                      onClick={() => setShowConfirmModal({ type: 'reject', request })}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                      disabled={isProcessing}
                    >
                      <X size={18} />
                      رفض
                    </button>
                  </div>
                )}

                {request.reviewedAt && (
                  <div className="mt-4 pt-4 border-t text-sm text-gray-400">
                    تمت المراجعة في: {new Date(request.reviewedAt).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className={`p-4 border-b ${
              showConfirmModal.type === 'approve' ? 'bg-green-50' :
              showConfirmModal.type === 'reject' ? 'bg-red-50' : 'bg-yellow-50'
            }`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 ${
                showConfirmModal.type === 'approve' ? 'text-green-700' :
                showConfirmModal.type === 'reject' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {showConfirmModal.type === 'approve' && <Check size={20} />}
                {showConfirmModal.type === 'reject' && <X size={20} />}
                {showConfirmModal.type === 'more_info' && <AlertCircle size={20} />}
                {showConfirmModal.type === 'approve' ? 'تأكيد الموافقة' :
                 showConfirmModal.type === 'reject' ? 'تأكيد الرفض' : 'طلب معلومات إضافية'}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {showConfirmModal.type === 'approve' && (
                  <>هل أنت متأكد من الموافقة على طلب <strong>{showConfirmModal.request.nameArabic}</strong>؟</>
                )}
                {showConfirmModal.type === 'reject' && (
                  <>هل أنت متأكد من رفض طلب <strong>{showConfirmModal.request.nameArabic}</strong>؟</>
                )}
                {showConfirmModal.type === 'more_info' && (
                  <>أدخل ملاحظة لطلب معلومات إضافية من <strong>{showConfirmModal.request.nameArabic}</strong>:</>
                )}
              </p>

              {showConfirmModal.type === 'reject' && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-1">سبب الرفض (اختياري):</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-red-500"
                    rows={3}
                    placeholder="أدخل سبب الرفض..."
                  />
                </div>
              )}

              {showConfirmModal.type === 'more_info' && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-1">الملاحظة:</label>
                  <textarea
                    value={moreInfoNote}
                    onChange={(e) => setMoreInfoNote(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-yellow-500"
                    rows={3}
                    placeholder="أدخل المعلومات المطلوبة..."
                  />
                </div>
              )}

              {showConfirmModal.type === 'approve' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4 text-sm text-blue-700">
                  <Info size={16} className="inline ml-1" />
                  سيتم إنشاء حساب مستخدم جديد للشخص بناءً على هذا الطلب.
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(null);
                    setRejectionReason('');
                    setMoreInfoNote('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isProcessing}
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    if (showConfirmModal.type === 'approve') {
                      handleApprove(showConfirmModal.request);
                    } else if (showConfirmModal.type === 'reject') {
                      handleReject(showConfirmModal.request);
                    } else {
                      handleRequestMoreInfo(showConfirmModal.request);
                    }
                  }}
                  className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 transition-colors ${
                    showConfirmModal.type === 'approve' ? 'bg-green-500 hover:bg-green-600' :
                    showConfirmModal.type === 'reject' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'
                  }`}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      {showConfirmModal.type === 'approve' && <Check size={18} />}
                      {showConfirmModal.type === 'reject' && <X size={18} />}
                      {showConfirmModal.type === 'more_info' && <AlertCircle size={18} />}
                    </>
                  )}
                  {showConfirmModal.type === 'approve' ? 'تأكيد الموافقة' :
                   showConfirmModal.type === 'reject' ? 'تأكيد الرفض' : 'إرسال'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
