'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  ChevronLeft,
  RefreshCw,
  Check,
  X,
  Eye,
  Calendar,
  User,
  Tag,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
} from 'lucide-react';

interface PendingImage {
  id: string;
  imageData: string;
  thumbnailData?: string;
  category: string;
  title?: string;
  titleAr?: string;
  caption?: string;
  captionAr?: string;
  year?: number;
  memberId?: string;
  memberName?: string;
  uploadedByName: string;
  uploadedByEmail?: string;
  uploadedAt: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

interface Stats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalPhotos: number;
  familyAlbumCount: number;
  byCategory: { category: string; count: number }[];
}

export default function AdminImagesPage() {
  const [images, setImages] = useState<PendingImage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<PendingImage | null>(null);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadImages();
  }, [filter, categoryFilter]);

  const loadImages = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      params.set('includeStats', 'true');
      params.set('limit', '50');

      const res = await fetch(`/api/images/pending?${params}`);
      const data = await res.json();
      setImages(data.images || []);
      if (data.stats) setStats(data.stats);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/images/pending/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          reviewedBy: 'admin', // In real app, get from auth context
          reviewedByName: 'المسؤول',
        }),
      });

      if (res.ok) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === id ? { ...img, reviewStatus: 'APPROVED' as const } : img
          )
        );
        if (stats) {
          setStats({
            ...stats,
            pendingCount: stats.pendingCount - 1,
            approvedCount: stats.approvedCount + 1,
            totalPhotos: stats.totalPhotos + 1,
          });
        }
        alert('تمت الموافقة على الصورة بنجاح');
      } else {
        const error = await res.json();
        alert(error.errorAr || error.error || 'فشل في الموافقة');
      }
    } catch (error) {
      console.error('Error approving:', error);
      alert('حدث خطأ أثناء الموافقة');
    } finally {
      setProcessingId(null);
      setSelectedImage(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      alert('يرجى إدخال سبب الرفض');
      return;
    }

    setProcessingId(id);
    try {
      const res = await fetch(`/api/images/pending/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reviewedBy: 'admin',
          reviewedByName: 'المسؤول',
          reviewNotes: rejectReason,
        }),
      });

      if (res.ok) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === id ? { ...img, reviewStatus: 'REJECTED' as const, reviewNotes: rejectReason } : img
          )
        );
        if (stats) {
          setStats({
            ...stats,
            pendingCount: stats.pendingCount - 1,
            rejectedCount: stats.rejectedCount + 1,
          });
        }
        setRejectReason('');
        setShowRejectModal(false);
        alert('تم رفض الصورة');
      } else {
        const error = await res.json();
        alert(error.errorAr || error.error || 'فشل في الرفض');
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('حدث خطأ أثناء الرفض');
    } finally {
      setProcessingId(null);
      setSelectedImage(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصورة؟')) return;

    setProcessingId(id);
    try {
      const res = await fetch(`/api/images/pending/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== id));
        alert('تم حذف الصورة');
      }
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'profile':
        return { label: 'صورة شخصية', labelEn: 'Profile', color: 'bg-blue-100 text-blue-700' };
      case 'memory':
        return { label: 'ذكرى', labelEn: 'Memory', color: 'bg-purple-100 text-purple-700' };
      case 'document':
        return { label: 'وثيقة', labelEn: 'Document', color: 'bg-amber-100 text-amber-700' };
      case 'historical':
        return { label: 'تاريخية', labelEn: 'Historical', color: 'bg-emerald-100 text-emerald-700' };
      default:
        return { label: category, labelEn: category, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: 'معلق', icon: Clock, color: 'bg-yellow-100 text-yellow-700' };
      case 'APPROVED':
        return { label: 'موافق عليه', icon: CheckCircle, color: 'bg-green-100 text-green-700' };
      case 'REJECTED':
        return { label: 'مرفوض', icon: XCircle, color: 'bg-red-100 text-red-700' };
      default:
        return { label: status, icon: Clock, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل الصور...</p>
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
          <span className="text-gray-800">إدارة الصور</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">إدارة الصور</h1>
              <p className="text-sm text-gray-500">مراجعة واعتماد الصور المرفوعة</p>
            </div>
          </div>
          <button
            onClick={loadImages}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
            تحديث
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.pendingCount}</p>
                <p className="text-sm text-gray-500">معلقة</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalPhotos}</p>
                <p className="text-sm text-gray-500">معتمدة</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.rejectedCount}</p>
                <p className="text-sm text-gray-500">مرفوضة</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.familyAlbumCount}</p>
                <p className="text-sm text-gray-500">ألبوم العائلة</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">الحالة:</span>
          {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border'
              }`}
            >
              {f === 'all' ? 'الكل' : getStatusInfo(f).label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">التصنيف:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border bg-white text-sm"
          >
            <option value="all">الكل</option>
            <option value="profile">صورة شخصية</option>
            <option value="memory">ذكرى</option>
            <option value="document">وثيقة</option>
            <option value="historical">تاريخية</option>
          </select>
        </div>
      </div>

      {/* Images Grid */}
      {images.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">لا توجد صور</h3>
          <p className="text-gray-400">لم يتم العثور على صور مطابقة للفلتر المحدد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => {
            const statusInfo = getStatusInfo(image.reviewStatus);
            const categoryInfo = getCategoryInfo(image.category);
            const StatusIcon = statusInfo.icon;

            return (
              <div key={image.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Image Preview */}
                <div
                  className="relative h-48 bg-gray-100 cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.thumbnailData || image.imageData}
                    alt={image.title || 'صورة معلقة'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <span className={`px-2 py-1 rounded-lg text-xs ${categoryInfo.color}`}>
                      {categoryInfo.label}
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${statusInfo.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                  </div>
                  {image.year && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                      {image.year}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-800 truncate">
                    {image.titleAr || image.title || 'بدون عنوان'}
                  </h3>
                  {image.memberName && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <User className="w-4 h-4" />
                      {image.memberName}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(image.uploadedAt)}
                    </span>
                    <span>بواسطة: {image.uploadedByName}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <button
                      onClick={() => setSelectedImage(image)}
                      className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      عرض
                    </button>
                    {image.reviewStatus === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(image.id)}
                          disabled={processingId === image.id}
                          className="flex-1 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          موافقة
                        </button>
                        <button
                          onClick={() => {
                            setSelectedImage(image);
                            setShowRejectModal(true);
                          }}
                          disabled={processingId === image.id}
                          className="flex-1 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          رفض
                        </button>
                      </>
                    )}
                    {image.reviewStatus !== 'PENDING' && (
                      <button
                        onClick={() => handleDelete(image.id)}
                        disabled={processingId === image.id}
                        className="flex-1 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Detail Modal */}
      {selectedImage && !showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">تفاصيل الصورة</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {/* Full Image */}
              <div className="bg-gray-100 rounded-xl overflow-hidden mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage.imageData}
                  alt={selectedImage.title || 'صورة'}
                  className="w-full h-auto max-h-[50vh] object-contain"
                />
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">العنوان</label>
                  <p className="font-medium">{selectedImage.titleAr || selectedImage.title || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">التصنيف</label>
                  <p>
                    <span className={`px-2 py-0.5 rounded text-sm ${getCategoryInfo(selectedImage.category).color}`}>
                      {getCategoryInfo(selectedImage.category).label}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">العضو المرتبط</label>
                  <p>{selectedImage.memberName || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">السنة</label>
                  <p>{selectedImage.year || '-'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-500">الوصف</label>
                  <p>{selectedImage.captionAr || selectedImage.caption || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">رفعها</label>
                  <p>{selectedImage.uploadedByName}</p>
                  {selectedImage.uploadedByEmail && (
                    <p className="text-sm text-gray-400">{selectedImage.uploadedByEmail}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">تاريخ الرفع</label>
                  <p>{formatDate(selectedImage.uploadedAt)}</p>
                </div>
                {selectedImage.reviewNotes && (
                  <div className="col-span-2 p-3 bg-red-50 rounded-lg">
                    <label className="text-sm text-red-600">سبب الرفض</label>
                    <p>{selectedImage.reviewNotes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3">
              <button
                onClick={() => setSelectedImage(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                إغلاق
              </button>
              {selectedImage.reviewStatus === 'PENDING' && (
                <>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    رفض
                  </button>
                  <button
                    onClick={() => handleApprove(selectedImage.id)}
                    disabled={processingId === selectedImage.id}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {processingId === selectedImage.id ? 'جاري...' : 'موافقة'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b">
              <h3 className="text-xl font-bold">رفض الصورة</h3>
            </div>
            <div className="p-4">
              <p className="text-gray-600 mb-4">يرجى إدخال سبب رفض هذه الصورة:</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="سبب الرفض..."
                className="w-full p-3 border rounded-lg resize-none h-32"
                dir="rtl"
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleReject(selectedImage.id)}
                disabled={!rejectReason.trim() || processingId === selectedImage.id}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {processingId === selectedImage.id ? 'جاري...' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
