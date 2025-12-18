'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Mail,
  Calendar,
  Clock,
  Users,
  Send,
  CheckCircle,
  XCircle,
  HelpCircle,
  MapPin,
  Link as LinkIcon,
  RefreshCw,
  Trash2,
  Edit,
  AlertTriangle,
  User,
} from 'lucide-react';

type BroadcastType = 'MEETING' | 'ANNOUNCEMENT' | 'REMINDER' | 'UPDATE';
type BroadcastStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED';
type RSVPResponse = 'YES' | 'NO' | 'MAYBE';

interface Recipient {
  id: string;
  memberId?: string;
  memberName: string;
  email: string;
  status: string;
  sentAt?: string;
  openedAt?: string;
  rsvpResponse?: RSVPResponse;
  rsvpRespondedAt?: string;
  rsvpNote?: string;
  errorMessage?: string;
}

interface Broadcast {
  id: string;
  titleAr: string;
  titleEn?: string;
  contentAr: string;
  contentEn?: string;
  type: BroadcastType;
  status: BroadcastStatus;
  meetingDate?: string;
  meetingLocation?: string;
  meetingUrl?: string;
  rsvpRequired: boolean;
  rsvpDeadline?: string;
  targetAudience: string;
  targetBranch?: string;
  targetGeneration?: number;
  scheduledAt?: string;
  sentAt?: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  openCount: number;
  rsvpYesCount: number;
  rsvpNoCount: number;
  rsvpMaybeCount: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  recipients: Recipient[];
}

interface RSVPSummary {
  summary: {
    yesCount: number;
    noCount: number;
    maybeCount: number;
    noResponseCount: number;
    totalCount: number;
  };
  recipients: {
    yes: Array<{ memberName: string; email: string; rsvpRespondedAt?: string; rsvpNote?: string }>;
    no: Array<{ memberName: string; email: string; rsvpRespondedAt?: string; rsvpNote?: string }>;
    maybe: Array<{ memberName: string; email: string; rsvpRespondedAt?: string; rsvpNote?: string }>;
    noResponse: Array<{ memberName: string; email: string }>;
  };
}

const typeLabels: Record<BroadcastType, { ar: string; color: string; bgColor: string }> = {
  MEETING: { ar: 'اجتماع', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  ANNOUNCEMENT: { ar: 'إعلان', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  REMINDER: { ar: 'تذكير', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  UPDATE: { ar: 'تحديث', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
};

const statusLabels: Record<BroadcastStatus, { ar: string; color: string; bgColor: string }> = {
  DRAFT: { ar: 'مسودة', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  SCHEDULED: { ar: 'مجدول', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  SENDING: { ar: 'جاري الإرسال', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  SENT: { ar: 'تم الإرسال', color: 'text-green-700', bgColor: 'bg-green-100' },
  CANCELLED: { ar: 'ملغي', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export default function BroadcastDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [rsvpSummary, setRsvpSummary] = useState<RSVPSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'recipients' | 'rsvp'>('details');

  useEffect(() => {
    loadBroadcast();
    loadRSVPSummary();
  }, [id]);

  const loadBroadcast = async () => {
    try {
      const res = await fetch(`/api/broadcasts/${id}`);
      const data = await res.json();
      if (data.success) {
        setBroadcast(data.data);
      }
    } catch (error) {
      console.error('Error loading broadcast:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRSVPSummary = async () => {
    try {
      const res = await fetch(`/api/broadcasts/${id}/recipients`);
      const data = await res.json();
      if (data.success) {
        setRsvpSummary(data.data);
      }
    } catch (error) {
      console.error('Error loading RSVP summary:', error);
    }
  };

  const handleSendBroadcast = async () => {
    if (!confirm('هل أنت متأكد من إرسال هذا البث؟')) return;

    try {
      const res = await fetch(`/api/broadcasts/${id}/send`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        alert(`تم إرسال البث بنجاح إلى ${data.data.sentCount} مستلم`);
        loadBroadcast();
        loadRSVPSummary();
      } else {
        alert(data.error || 'فشل إرسال البث');
      }
    } catch {
      alert('حدث خطأ أثناء إرسال البث');
    }
  };

  const handleDeleteBroadcast = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا البث؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    try {
      const res = await fetch(`/api/broadcasts/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        router.push('/admin/broadcasts');
      } else {
        alert(data.error || 'فشل حذف البث');
      }
    } catch {
      alert('حدث خطأ أثناء حذف البث');
    }
  };

  const handleCancelBroadcast = async () => {
    if (!confirm('هل أنت متأكد من إلغاء هذا البث؟')) return;

    try {
      const res = await fetch(`/api/broadcasts/${id}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        loadBroadcast();
      } else {
        alert(data.error || 'فشل إلغاء البث');
      }
    } catch {
      alert('حدث خطأ أثناء إلغاء البث');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل البث...</p>
        </div>
      </div>
    );
  }

  if (!broadcast) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">البث غير موجود</h2>
        <Link href="/admin/broadcasts" className="text-blue-600 hover:underline">
          العودة للقائمة
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/broadcasts"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للبثات
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeLabels[broadcast.type].bgColor} ${typeLabels[broadcast.type].color}`}>
                {typeLabels[broadcast.type].ar}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[broadcast.status].bgColor} ${statusLabels[broadcast.status].color}`}>
                {statusLabels[broadcast.status].ar}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">{broadcast.titleAr}</h1>
            {broadcast.titleEn && (
              <p className="text-lg text-gray-500 mt-1">{broadcast.titleEn}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {broadcast.status === 'DRAFT' && (
              <>
                <button
                  onClick={handleSendBroadcast}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Send className="w-4 h-4" />
                  إرسال الآن
                </button>
                <button
                  onClick={handleDeleteBroadcast}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
              </>
            )}
            {broadcast.status === 'SCHEDULED' && (
              <button
                onClick={handleCancelBroadcast}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <XCircle className="w-4 h-4" />
                إلغاء
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {broadcast.status === 'SENT' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{broadcast.totalRecipients}</p>
                <p className="text-sm text-gray-500">المستلمين</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{broadcast.sentCount}</p>
                <p className="text-sm text-gray-500">تم الإرسال</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{broadcast.failedCount}</p>
                <p className="text-sm text-gray-500">فشل</p>
              </div>
            </div>
          </div>
          {broadcast.type === 'MEETING' && broadcast.rsvpRequired && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {broadcast.rsvpYesCount}/{broadcast.totalRecipients}
                  </p>
                  <p className="text-sm text-gray-500">سيحضر</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-[#1E3A5F] text-[#1E3A5F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              التفاصيل
            </button>
            <button
              onClick={() => setActiveTab('recipients')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'recipients'
                  ? 'border-[#1E3A5F] text-[#1E3A5F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              المستلمين ({broadcast.recipients?.length || 0})
            </button>
            {broadcast.type === 'MEETING' && broadcast.rsvpRequired && (
              <button
                onClick={() => setActiveTab('rsvp')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'rsvp'
                    ? 'border-[#1E3A5F] text-[#1E3A5F]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                الحضور (RSVP)
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Content */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">محتوى الرسالة</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: broadcast.contentAr }}
                  />
                  {broadcast.contentEn && (
                    <div className="mt-4 pt-4 border-t">
                      <div
                        className="prose prose-sm max-w-none text-gray-500"
                        dir="ltr"
                        dangerouslySetInnerHTML={{ __html: broadcast.contentEn }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Meeting Details */}
              {broadcast.type === 'MEETING' && broadcast.meetingDate && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">تفاصيل الاجتماع</h3>
                  <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span className="text-gray-700">{formatDate(broadcast.meetingDate)}</span>
                    </div>
                    {broadcast.meetingLocation && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <span className="text-gray-700">{broadcast.meetingLocation}</span>
                      </div>
                    )}
                    {broadcast.meetingUrl && (
                      <div className="flex items-center gap-3">
                        <LinkIcon className="w-5 h-5 text-blue-600" />
                        <a
                          href={broadcast.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {broadcast.meetingUrl}
                        </a>
                      </div>
                    )}
                    {broadcast.rsvpDeadline && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <span className="text-gray-700">
                          آخر موعد للرد: {formatDate(broadcast.rsvpDeadline)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">المنشئ</h4>
                  <p className="text-gray-800">{broadcast.createdByName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">تاريخ الإنشاء</h4>
                  <p className="text-gray-800">{formatDate(broadcast.createdAt)}</p>
                </div>
                {broadcast.sentAt && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">تاريخ الإرسال</h4>
                    <p className="text-gray-800">{formatDate(broadcast.sentAt)}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">الجمهور المستهدف</h4>
                  <p className="text-gray-800">
                    {broadcast.targetAudience === 'ALL' && 'جميع أفراد العائلة'}
                    {broadcast.targetAudience === 'BRANCH' && `فرع: ${broadcast.targetBranch}`}
                    {broadcast.targetAudience === 'GENERATION' && `الجيل ${broadcast.targetGeneration}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recipients Tab */}
          {activeTab === 'recipients' && (
            <div>
              {broadcast.recipients?.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا يوجد مستلمين بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-3 px-4 font-medium text-gray-600">الاسم</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">البريد</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">الحالة</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">تاريخ الإرسال</th>
                      </tr>
                    </thead>
                    <tbody>
                      {broadcast.recipients?.map((recipient) => (
                        <tr key={recipient.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-500" />
                              </div>
                              <span className="font-medium text-gray-800">{recipient.memberName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600" dir="ltr">
                            {recipient.email}
                          </td>
                          <td className="py-3 px-4">
                            {recipient.status === 'SENT' && (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                تم الإرسال
                              </span>
                            )}
                            {recipient.status === 'FAILED' && (
                              <span className="inline-flex items-center gap-1 text-red-600" title={recipient.errorMessage}>
                                <XCircle className="w-4 h-4" />
                                فشل
                              </span>
                            )}
                            {recipient.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 text-gray-500">
                                <Clock className="w-4 h-4" />
                                قيد الانتظار
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-sm">
                            {recipient.sentAt ? formatDate(recipient.sentAt) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* RSVP Tab */}
          {activeTab === 'rsvp' && rsvpSummary && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">{rsvpSummary.summary.yesCount}</p>
                  <p className="text-sm text-green-600">سيحضر</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700">{rsvpSummary.summary.noCount}</p>
                  <p className="text-sm text-red-600">لن يحضر</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <HelpCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-700">{rsvpSummary.summary.maybeCount}</p>
                  <p className="text-sm text-amber-600">ربما</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-700">{rsvpSummary.summary.noResponseCount}</p>
                  <p className="text-sm text-gray-600">لم يرد</p>
                </div>
              </div>

              {/* Attending List */}
              {rsvpSummary.recipients.yes.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    سيحضر ({rsvpSummary.recipients.yes.length})
                  </h3>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="space-y-2">
                      {rsvpSummary.recipients.yes.map((r, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-800">{r.memberName}</span>
                            <span className="text-gray-500 text-sm mr-2">({r.email})</span>
                          </div>
                          {r.rsvpNote && (
                            <span className="text-sm text-gray-600 italic">"{r.rsvpNote}"</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Not Attending List */}
              {rsvpSummary.recipients.no.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    لن يحضر ({rsvpSummary.recipients.no.length})
                  </h3>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="space-y-2">
                      {rsvpSummary.recipients.no.map((r, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-800">{r.memberName}</span>
                            <span className="text-gray-500 text-sm mr-2">({r.email})</span>
                          </div>
                          {r.rsvpNote && (
                            <span className="text-sm text-gray-600 italic">"{r.rsvpNote}"</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Maybe List */}
              {rsvpSummary.recipients.maybe.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-amber-700 mb-3 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    ربما ({rsvpSummary.recipients.maybe.length})
                  </h3>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="space-y-2">
                      {rsvpSummary.recipients.maybe.map((r, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-800">{r.memberName}</span>
                            <span className="text-gray-500 text-sm mr-2">({r.email})</span>
                          </div>
                          {r.rsvpNote && (
                            <span className="text-sm text-gray-600 italic">"{r.rsvpNote}"</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* No Response List */}
              {rsvpSummary.recipients.noResponse.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    لم يرد بعد ({rsvpSummary.recipients.noResponse.length})
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {rsvpSummary.recipients.noResponse.map((r, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-white rounded-full text-sm text-gray-600 border"
                        >
                          {r.memberName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
