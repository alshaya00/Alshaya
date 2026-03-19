'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Check, X, Clock, Mail, Phone, Users, AlertCircle,
  UserPlus, CheckCircle, XCircle, MessageSquare, Search, Info,
  AlertTriangle, Copy
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhoneDisplay } from '@/lib/phone-utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  EmptyState,
} from '@/components/ui';

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

const statusBadgeVariant = {
  PENDING: 'warning' as const,
  APPROVED: 'success' as const,
  REJECTED: 'destructive' as const,
  MORE_INFO: 'info' as const,
};

const statusLabels = {
  PENDING: 'معلقة',
  APPROVED: 'مقبولة',
  REJECTED: 'مرفوضة',
  MORE_INFO: 'بانتظار معلومات',
};

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" label="جاري التحميل..." />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="text-primary" size={28} />
            طلبات الانضمام
          </h1>
          <p className="text-muted-foreground mt-1">راجع وأقر طلبات الانضمام الجديدة</p>
        </div>
        <Link href="/admin">
          <Button variant="outline">العودة للوحة التحكم</Button>
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" dismissible onDismiss={() => setError(null)}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter Stats */}
      <div className="grid grid-cols-5 gap-3">
        {([
          { key: 'PENDING' as const, label: 'معلقة', count: stats.pending, variant: 'warning' as const },
          { key: 'APPROVED' as const, label: 'مقبولة', count: stats.approved, variant: 'success' as const },
          { key: 'REJECTED' as const, label: 'مرفوضة', count: stats.rejected, variant: 'destructive' as const },
          { key: 'MORE_INFO' as const, label: 'معلومات', count: stats.moreInfo, variant: 'info' as const },
          { key: 'all' as const, label: 'الكل', count: stats.total, variant: 'default' as const },
        ]).map(({ key, label, count, variant }) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all text-center ${filter === key ? 'ring-2 ring-primary shadow-md' : 'hover:border-primary/30'}`}
            onClick={() => setFilter(key)}
          >
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <Badge variant={variant} size="sm" className="mt-1">{label}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو البريد الإلكتروني أو رقم الهاتف..."
            leftIcon={<Search size={18} />}
          />
        </CardContent>
      </Card>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="لا يوجد طلبات"
              description={filter === 'PENDING' ? 'لا يوجد طلبات معلقة' : 'لا يوجد طلبات في هذه الفئة'}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(request => (
            <Card key={request.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <UserPlus className="text-primary" size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-lg">{request.nameArabic}</span>
                        {request.nameEnglish && (
                          <span className="text-muted-foreground text-sm">({request.nameEnglish})</span>
                        )}
                        <Badge variant={statusBadgeVariant[request.status]} size="sm">
                          {statusLabels[request.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {request.email}
                        </span>
                        {request.phone && (
                          <span className="flex items-center gap-1" dir="ltr">
                            <Phone size={14} />
                            {formatPhoneDisplay(request.phone)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(request.createdAt).toLocaleDateString('ar-SA', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </div>
                </div>

                {/* Claimed relation & related member */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {request.claimedRelation && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users size={16} />
                      <span>صلة القرابة:</span>
                      <span className="font-medium text-foreground">{request.claimedRelation}</span>
                    </div>
                  )}
                  {request.relatedMember && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users size={16} />
                      <span>العضو المرتبط:</span>
                      <Link href={`/member/${request.relatedMember.id}`} className="font-medium text-primary hover:underline">
                        {request.relatedMember.fullNameAr || request.relatedMember.firstName}
                        {request.relatedMember.generation && (
                          <span className="text-muted-foreground text-xs ms-1">(الجيل {request.relatedMember.generation})</span>
                        )}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Message */}
                {request.message && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <MessageSquare size={14} />
                      <span>الرسالة:</span>
                    </div>
                    <p className="text-foreground">{request.message}</p>
                  </div>
                )}

                {/* Review note */}
                {request.reviewNote && (
                  <Alert variant="warning" className="mt-4">
                    <AlertDescription>
                      <span className="font-medium">ملاحظة المراجعة: </span>
                      {request.reviewNote}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Duplicate warning */}
                {request.duplicateWarning?.hasPotentialDuplicates && (
                  <Alert
                    variant={request.duplicateWarning.isDuplicate ? 'destructive' : 'warning'}
                    className="mt-4"
                  >
                    <AlertTitle className="flex items-center gap-2">
                      <AlertTriangle size={18} />
                      {request.duplicateWarning.isDuplicate
                        ? 'تحذير: تكرار محتمل مؤكد!'
                        : 'تنبيه: تشابه محتمل مع أعضاء موجودين'}
                      <Badge
                        variant={request.duplicateWarning.isDuplicate ? 'destructive' : 'warning'}
                        size="sm"
                      >
                        {request.duplicateWarning.highestScore}% تطابق
                      </Badge>
                    </AlertTitle>
                    <AlertDescription>
                      <div className="space-y-2 mt-2">
                        {request.duplicateWarning.candidates.map((candidate) => (
                          <div key={candidate.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                              <Copy size={16} className="text-muted-foreground" />
                              <div>
                                <Link href={`/member/${candidate.id}`} className="font-medium text-primary hover:underline">
                                  {candidate.fullNameAr || candidate.firstName}
                                </Link>
                                {candidate.fullNameEn && (
                                  <p className="text-xs text-muted-foreground">{candidate.fullNameEn}</p>
                                )}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {candidate.matchReasonsAr.map((reason, idx) => (
                                    <Badge key={idx} variant="secondary" size="sm">{reason}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className={`text-lg font-bold ${candidate.similarityScore >= 80 ? 'text-destructive' : 'text-amber-600'}`}>
                              {candidate.similarityScore}%
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        يرجى التحقق من العضو الموجود قبل الموافقة على هذا الطلب لتجنب التكرار.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                {(request.status === 'PENDING' || request.status === 'MORE_INFO') && (
                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                    <Button
                      variant="success"
                      size="sm"
                      leftIcon={<Check size={16} />}
                      onClick={() => setShowConfirmModal({ type: 'approve', request })}
                      disabled={isProcessing}
                    >
                      قبول
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      leftIcon={<X size={16} />}
                      onClick={() => setShowConfirmModal({ type: 'reject', request })}
                      disabled={isProcessing}
                    >
                      رفض
                    </Button>
                    {request.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<AlertCircle size={16} />}
                        onClick={() => setShowConfirmModal({ type: 'more_info', request })}
                        disabled={isProcessing}
                      >
                        طلب معلومات إضافية
                      </Button>
                    )}
                  </div>
                )}

                {/* Reviewed timestamp */}
                {request.reviewedAt && (
                  <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                    تمت المراجعة في: {new Date(request.reviewedAt).toLocaleDateString('ar-SA', {
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <Dialog open={true} onOpenChange={() => { setShowConfirmModal(null); setRejectionReason(''); setMoreInfoNote(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {showConfirmModal.type === 'approve' && <><CheckCircle className="text-emerald-600" size={20} /> تأكيد الموافقة</>}
                {showConfirmModal.type === 'reject' && <><XCircle className="text-destructive" size={20} /> تأكيد الرفض</>}
                {showConfirmModal.type === 'more_info' && <><AlertCircle className="text-amber-600" size={20} /> طلب معلومات إضافية</>}
              </DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-muted-foreground mb-4">
                {showConfirmModal.type === 'approve' && (
                  <>هل أنت متأكد من الموافقة على طلب <strong className="text-foreground">{showConfirmModal.request.nameArabic}</strong>؟</>
                )}
                {showConfirmModal.type === 'reject' && (
                  <>هل أنت متأكد من رفض طلب <strong className="text-foreground">{showConfirmModal.request.nameArabic}</strong>؟</>
                )}
                {showConfirmModal.type === 'more_info' && (
                  <>أدخل ملاحظة لطلب معلومات إضافية من <strong className="text-foreground">{showConfirmModal.request.nameArabic}</strong>:</>
                )}
              </p>

              {showConfirmModal.type === 'reject' && (
                <div className="mb-4">
                  <label className="block text-sm text-muted-foreground mb-1">سبب الرفض (اختياري):</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    rows={3}
                    placeholder="أدخل سبب الرفض..."
                  />
                </div>
              )}

              {showConfirmModal.type === 'more_info' && (
                <div className="mb-4">
                  <label className="block text-sm text-muted-foreground mb-1">الملاحظة:</label>
                  <textarea
                    value={moreInfoNote}
                    onChange={(e) => setMoreInfoNote(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    rows={3}
                    placeholder="أدخل المعلومات المطلوبة..."
                  />
                </div>
              )}

              {showConfirmModal.type === 'approve' && (
                <Alert variant="info" className="mb-4">
                  <AlertDescription>
                    سيتم إنشاء حساب مستخدم جديد للشخص بناءً على هذا الطلب.
                  </AlertDescription>
                </Alert>
              )}
            </DialogBody>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setShowConfirmModal(null); setRejectionReason(''); setMoreInfoNote(''); }}
                disabled={isProcessing}
              >
                إلغاء
              </Button>
              <Button
                variant={showConfirmModal.type === 'approve' ? 'success' : showConfirmModal.type === 'reject' ? 'destructive' : 'default'}
                isLoading={isProcessing}
                leftIcon={
                  showConfirmModal.type === 'approve' ? <Check size={16} /> :
                  showConfirmModal.type === 'reject' ? <X size={16} /> :
                  <AlertCircle size={16} />
                }
                onClick={() => {
                  if (showConfirmModal.type === 'approve') handleApprove(showConfirmModal.request);
                  else if (showConfirmModal.type === 'reject') handleReject(showConfirmModal.request);
                  else handleRequestMoreInfo(showConfirmModal.request);
                }}
              >
                {showConfirmModal.type === 'approve' ? 'تأكيد الموافقة' :
                 showConfirmModal.type === 'reject' ? 'تأكيد الرفض' : 'إرسال'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
