'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  Plus,
  Calendar,
  Bell,
  RefreshCw,
  Clock,
  Send,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Trash2,
  Edit,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react';

type BroadcastType = 'MEETING' | 'ANNOUNCEMENT' | 'REMINDER' | 'UPDATE';
type BroadcastStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED';

interface Broadcast {
  id: string;
  titleAr: string;
  titleEn?: string;
  type: BroadcastType;
  status: BroadcastStatus;
  meetingDate?: string;
  scheduledAt?: string;
  sentAt?: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  rsvpYesCount: number;
  rsvpNoCount: number;
  rsvpMaybeCount: number;
  createdByName: string;
  createdAt: string;
  _count?: { recipients: number };
}

const typeLabels: Record<BroadcastType, { ar: string; en: string; color: string; bgColor: string }> = {
  MEETING: { ar: 'اجتماع', en: 'Meeting', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  ANNOUNCEMENT: { ar: 'إعلان', en: 'Announcement', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  REMINDER: { ar: 'تذكير', en: 'Reminder', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  UPDATE: { ar: 'تحديث', en: 'Update', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
};

const statusLabels: Record<BroadcastStatus, { ar: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  DRAFT: { ar: 'مسودة', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: <Edit className="w-4 h-4" /> },
  SCHEDULED: { ar: 'مجدول', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: <Clock className="w-4 h-4" /> },
  SENDING: { ar: 'جاري الإرسال', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: <RefreshCw className="w-4 h-4 animate-spin" /> },
  SENT: { ar: 'تم الإرسال', color: 'text-green-700', bgColor: 'bg-green-100', icon: <CheckCircle className="w-4 h-4" /> },
  CANCELLED: { ar: 'ملغي', color: 'text-red-700', bgColor: 'bg-red-100', icon: <XCircle className="w-4 h-4" /> },
};

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<BroadcastStatus | ''>('');
  const [filterType, setFilterType] = useState<BroadcastType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    titleAr: '',
    titleEn: '',
    contentAr: '',
    contentEn: '',
    type: 'ANNOUNCEMENT' as BroadcastType,
    meetingDate: '',
    meetingLocation: '',
    meetingUrl: '',
    rsvpRequired: false,
    rsvpDeadline: '',
    targetAudience: 'ALL' as 'ALL' | 'BRANCH' | 'GENERATION' | 'CUSTOM',
    targetBranch: '',
    targetGeneration: '',
    scheduledAt: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadBroadcasts();
  }, [filterStatus, filterType]);

  const loadBroadcasts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('type', filterType);

      const res = await fetch(`/api/broadcasts?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setBroadcasts(data.data);
      }
    } catch (error) {
      console.error('Error loading broadcasts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          meetingDate: formData.meetingDate || undefined,
          rsvpDeadline: formData.rsvpDeadline || undefined,
          scheduledAt: formData.scheduledAt || undefined,
          targetGeneration: formData.targetGeneration ? parseInt(formData.targetGeneration) : undefined,
          createdBy: 'admin',
          createdByName: 'مدير النظام',
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowCreateForm(false);
        setFormData({
          titleAr: '',
          titleEn: '',
          contentAr: '',
          contentEn: '',
          type: 'ANNOUNCEMENT',
          meetingDate: '',
          meetingLocation: '',
          meetingUrl: '',
          rsvpRequired: false,
          rsvpDeadline: '',
          targetAudience: 'ALL',
          targetBranch: '',
          targetGeneration: '',
          scheduledAt: '',
        });
        loadBroadcasts();
      } else {
        setFormError(data.error || 'حدث خطأ أثناء إنشاء البث');
      }
    } catch {
      setFormError('حدث خطأ أثناء إنشاء البث');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendBroadcast = async (id: string) => {
    if (!confirm('هل أنت متأكد من إرسال هذا البث؟')) return;

    try {
      const res = await fetch(`/api/broadcasts/${id}/send`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        alert(`تم إرسال البث بنجاح إلى ${data.data.sentCount} مستلم`);
        loadBroadcasts();
      } else {
        alert(data.error || 'فشل إرسال البث');
      }
    } catch {
      alert('حدث خطأ أثناء إرسال البث');
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا البث؟')) return;

    try {
      const res = await fetch(`/api/broadcasts/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        loadBroadcasts();
      } else {
        alert(data.error || 'فشل حذف البث');
      }
    } catch {
      alert('حدث خطأ أثناء حذف البث');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  const filteredBroadcasts = broadcasts.filter((b) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        b.titleAr.toLowerCase().includes(query) ||
        b.titleEn?.toLowerCase().includes(query) ||
        b.createdByName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل البثات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">البث البريدي</h1>
          <p className="text-gray-500 mt-1">Email Broadcasts - إرسال رسائل جماعية للعائلة</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>إنشاء بث جديد</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{broadcasts.length}</p>
              <p className="text-sm text-gray-500">إجمالي البثات</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {broadcasts.filter((b) => b.status === 'SENT').length}
              </p>
              <p className="text-sm text-gray-500">تم الإرسال</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {broadcasts.filter((b) => b.status === 'SCHEDULED').length}
              </p>
              <p className="text-sm text-gray-500">مجدولة</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Edit className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {broadcasts.filter((b) => b.status === 'DRAFT').length}
              </p>
              <p className="text-sm text-gray-500">مسودات</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في البثات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as BroadcastStatus | '')}
                className="pr-10 pl-4 py-2 border rounded-lg appearance-none bg-white"
              >
                <option value="">كل الحالات</option>
                <option value="DRAFT">مسودة</option>
                <option value="SCHEDULED">مجدول</option>
                <option value="SENT">تم الإرسال</option>
                <option value="CANCELLED">ملغي</option>
              </select>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as BroadcastType | '')}
              className="px-4 py-2 border rounded-lg appearance-none bg-white"
            >
              <option value="">كل الأنواع</option>
              <option value="MEETING">اجتماع</option>
              <option value="ANNOUNCEMENT">إعلان</option>
              <option value="REMINDER">تذكير</option>
              <option value="UPDATE">تحديث</option>
            </select>
          </div>
        </div>
      </div>

      {/* Broadcasts List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredBroadcasts.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">لا توجد بثات</h3>
            <p className="text-gray-500 mb-6">ابدأ بإنشاء بث جديد لإرسال رسائل للعائلة</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87]"
            >
              <Plus className="w-5 h-5" />
              <span>إنشاء بث جديد</span>
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredBroadcasts.map((broadcast) => (
              <div
                key={broadcast.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${typeLabels[broadcast.type].bgColor} ${typeLabels[broadcast.type].color}`}>
                        {typeLabels[broadcast.type].ar}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${statusLabels[broadcast.status].bgColor} ${statusLabels[broadcast.status].color}`}>
                        {statusLabels[broadcast.status].icon}
                        {statusLabels[broadcast.status].ar}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{broadcast.titleAr}</h3>
                    {broadcast.titleEn && (
                      <p className="text-sm text-gray-500 mb-2">{broadcast.titleEn}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(broadcast.createdAt)}
                      </span>
                      {broadcast.meetingDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          موعد الاجتماع: {formatDate(broadcast.meetingDate)}
                        </span>
                      )}
                      {broadcast.status === 'SENT' && (
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {broadcast.sentCount}/{broadcast.totalRecipients} مستلم
                        </span>
                      )}
                    </div>
                    {broadcast.status === 'SENT' && broadcast.type === 'MEETING' && (
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-sm text-green-600">
                          سيحضر: {broadcast.rsvpYesCount}
                        </span>
                        <span className="text-sm text-red-600">
                          لن يحضر: {broadcast.rsvpNoCount}
                        </span>
                        <span className="text-sm text-amber-600">
                          ربما: {broadcast.rsvpMaybeCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/broadcasts/${broadcast.id}`}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="عرض التفاصيل"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                    {broadcast.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handleSendBroadcast(broadcast.id)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="إرسال الآن"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBroadcast(broadcast.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Broadcast Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">إنشاء بث جديد</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} className="p-6 space-y-6">
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {formError}
                </div>
              )}

              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع البث</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(typeLabels).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: key as BroadcastType })}
                      className={`p-3 rounded-lg border-2 text-right transition-colors ${
                        formData.type === key
                          ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`${formData.type === key ? 'text-[#1E3A5F] font-bold' : 'text-gray-700'}`}>
                        {label.ar}
                      </span>
                      <span className="text-xs text-gray-500 block">{label.en}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    العنوان بالعربي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.titleAr}
                    onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                    required
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="عنوان البث بالعربي"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    العنوان بالإنجليزي
                  </label>
                  <input
                    type="text"
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="English title (optional)"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المحتوى بالعربي <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.contentAr}
                  onChange={(e) => setFormData({ ...formData, contentAr: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="محتوى الرسالة بالعربي"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المحتوى بالإنجليزي
                </label>
                <textarea
                  value={formData.contentEn}
                  onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="English content (optional)"
                  dir="ltr"
                />
              </div>

              {/* Meeting Fields */}
              {formData.type === 'MEETING' && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                  <h3 className="font-bold text-blue-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    تفاصيل الاجتماع
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ ووقت الاجتماع <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.meetingDate}
                        onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                        required={formData.type === 'MEETING'}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">المكان</label>
                      <input
                        type="text"
                        value={formData.meetingLocation}
                        onChange={(e) => setFormData({ ...formData, meetingLocation: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="موقع الاجتماع"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">رابط الاجتماع (Zoom/Meet)</label>
                      <input
                        type="url"
                        value={formData.meetingUrl}
                        onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="https://zoom.us/j/..."
                        dir="ltr"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.rsvpRequired}
                          onChange={(e) => setFormData({ ...formData, rsvpRequired: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">طلب تأكيد الحضور (RSVP)</span>
                      </label>
                    </div>
                    {formData.rsvpRequired && (
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">آخر موعد للرد</label>
                        <input
                          type="datetime-local"
                          value={formData.rsvpDeadline}
                          onChange={(e) => setFormData({ ...formData, rsvpDeadline: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الجمهور المستهدف</label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as typeof formData.targetAudience })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="ALL">جميع أفراد العائلة</option>
                  <option value="BRANCH">فرع محدد</option>
                  <option value="GENERATION">جيل محدد</option>
                </select>
              </div>

              {formData.targetAudience === 'BRANCH' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
                  <input
                    type="text"
                    value={formData.targetBranch}
                    onChange={(e) => setFormData({ ...formData, targetBranch: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="اسم الفرع"
                  />
                </div>
              )}

              {formData.targetAudience === 'GENERATION' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الجيل</label>
                  <input
                    type="number"
                    value={formData.targetGeneration}
                    onChange={(e) => setFormData({ ...formData, targetGeneration: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="رقم الجيل (1-8)"
                    min="1"
                    max="10"
                  />
                </div>
              )}

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">جدولة الإرسال (اختياري)</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">اتركه فارغاً للحفظ كمسودة</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      إنشاء البث
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
