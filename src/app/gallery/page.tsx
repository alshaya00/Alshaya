'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  Calendar,
  Filter,
  Grid,
  Clock,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import ImageUploadForm from '@/components/ImageUploadForm';

interface Photo {
  id: string;
  imageData?: string;
  thumbnailData?: string;
  category: string;
  title?: string;
  titleAr?: string;
  caption?: string;
  captionAr?: string;
  year?: number;
  memberId?: string;
  isFamilyAlbum?: boolean;
  uploadedByName: string;
  createdAt: string;
}

interface TimelineItem {
  year: number;
  count: number;
  photos: Photo[];
}

interface Stats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalPhotos: number;
  familyAlbumCount: number;
  byCategory: { category: string; count: number }[];
}

type ViewMode = 'gallery' | 'timeline';
type CategoryFilter = 'all' | 'profile' | 'memory' | 'document' | 'historical';

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullImageData, setFullImageData] = useState<string | null>(null);
  const [loadingFullImage, setLoadingFullImage] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    loadGallery();
  }, [viewMode, categoryFilter]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/images/gallery?view=stats');
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadGallery = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('view', viewMode === 'timeline' ? 'timeline' : 'family');
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/images/gallery?${params}`);
      const data = await res.json();

      if (viewMode === 'timeline' && data.timeline) {
        setTimeline(data.timeline);
        setPhotos([]);
      } else {
        setPhotos(data.photos || []);
        setTimeline([]);
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFullImage = async (photoId: string) => {
    setLoadingFullImage(true);
    try {
      const res = await fetch(`/api/images/photo/${photoId}`);
      const data = await res.json();
      if (data.photo) {
        setFullImageData(data.photo.imageData);
      }
    } catch (error) {
      console.error('Error loading full image:', error);
    } finally {
      setLoadingFullImage(false);
    }
  };

  const openPhoto = async (photo: Photo, index: number) => {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
    setFullImageData(null);
    await loadFullImage(photo.id);
  };

  const closePhoto = () => {
    setSelectedPhoto(null);
    setFullImageData(null);
  };

  const allPhotos = viewMode === 'timeline' ? timeline.flatMap((t) => t.photos) : photos;

  const goToNext = () => {
    if (selectedIndex < allPhotos.length - 1) {
      const nextPhoto = allPhotos[selectedIndex + 1];
      openPhoto(nextPhoto, selectedIndex + 1);
    }
  };

  const goToPrev = () => {
    if (selectedIndex > 0) {
      const prevPhoto = allPhotos[selectedIndex - 1];
      openPhoto(prevPhoto, selectedIndex - 1);
    }
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'profile':
        return { label: 'صورة شخصية', color: 'bg-blue-100 text-blue-700' };
      case 'memory':
        return { label: 'ذكرى', color: 'bg-purple-100 text-purple-700' };
      case 'document':
        return { label: 'وثيقة', color: 'bg-amber-100 text-amber-700' };
      case 'historical':
        return { label: 'تاريخية', color: 'bg-emerald-100 text-emerald-700' };
      default:
        return { label: category, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    loadGallery();
    loadStats();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 pb-24 lg:pb-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowRight size={20} />
          العودة للرئيسية
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                <ImageIcon className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">ألبوم العائلة</h1>
                <p className="text-gray-500">ذكريات وصور عائلة آل شايع</p>
              </div>
            </div>

            <button
              onClick={() => setShowUploadForm(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-xl hover:bg-[#2d5a8a] transition-colors"
            >
              <Plus size={20} />
              إضافة صورة
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{stats.totalPhotos}</p>
                <p className="text-sm text-gray-500">إجمالي الصور</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.familyAlbumCount}</p>
                <p className="text-sm text-gray-500">في ألبوم العائلة</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingCount}</p>
                <p className="text-sm text-gray-500">بانتظار الموافقة</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-600">{stats.byCategory?.length || 0}</p>
                <p className="text-sm text-gray-500">تصنيفات</p>
              </div>
            </div>
          )}
        </div>

        {/* Filters & View Toggle */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* View Mode */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('gallery')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'gallery' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                }`}
              >
                <Grid size={18} />
                معرض
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'timeline' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                }`}
              >
                <Clock size={18} />
                زمني
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                className="px-4 py-2 border rounded-lg bg-white"
              >
                <option value="all">كل التصنيفات</option>
                <option value="profile">صور شخصية</option>
                <option value="memory">ذكريات</option>
                <option value="document">وثائق</option>
                <option value="historical">تاريخية</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-500">جاري تحميل الصور...</p>
          </div>
        ) : viewMode === 'timeline' ? (
          /* Timeline View */
          <div className="space-y-8">
            {timeline.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">لا توجد صور بعد</h3>
                <p className="text-gray-400 mb-4">كن أول من يضيف صورة للألبوم!</p>
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="px-6 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2d5a8a]"
                >
                  إضافة صورة
                </button>
              </div>
            ) : (
              timeline.map((item) => (
                <div key={item.year} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl flex items-center justify-center">
                      <span className="text-xl font-bold">{item.year}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">عام {item.year}</h3>
                      <p className="text-sm text-gray-500">{item.count} صورة</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {item.photos.map((photo, idx) => {
                      const globalIndex = timeline
                        .slice(0, timeline.indexOf(item))
                        .reduce((acc, t) => acc + t.photos.length, 0) + idx;
                      return (
                        <div
                          key={photo.id}
                          className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openPhoto(photo, globalIndex)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.thumbnailData || photo.imageData}
                            alt={photo.titleAr || photo.title || 'صورة'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Gallery View */
          <div className="bg-white rounded-xl shadow-sm p-6">
            {photos.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">لا توجد صور بعد</h3>
                <p className="text-gray-400 mb-4">كن أول من يضيف صورة للألبوم!</p>
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="px-6 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2d5a8a]"
                >
                  إضافة صورة
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo, index) => {
                  const categoryInfo = getCategoryInfo(photo.category);
                  return (
                    <div
                      key={photo.id}
                      className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => openPhoto(photo, index)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.thumbnailData || photo.imageData}
                        alt={photo.titleAr || photo.title || 'صورة'}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform">
                        {(photo.titleAr || photo.title) && (
                          <p className="font-medium truncate text-sm">{photo.titleAr || photo.title}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-white/80 mt-1">
                          <span className={`px-1.5 py-0.5 rounded ${categoryInfo.color}`}>
                            {categoryInfo.label}
                          </span>
                          {photo.year && <span>{photo.year}</span>}
                        </div>
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-auto">
              <ImageUploadForm
                onSuccess={handleUploadSuccess}
                onCancel={() => setShowUploadForm(false)}
                isFamilyAlbum={true}
              />
            </div>
          </div>
        )}

        {/* Lightbox Modal */}
        {selectedPhoto && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={closePhoto}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Navigation */}
            {selectedIndex > 0 && (
              <button
                onClick={goToPrev}
                className="absolute left-4 p-2 text-white/80 hover:text-white z-10"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
            )}
            {selectedIndex < allPhotos.length - 1 && (
              <button
                onClick={goToNext}
                className="absolute right-4 p-2 text-white/80 hover:text-white z-10"
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            )}

            {/* Image */}
            <div className="max-w-5xl max-h-[80vh] mx-4">
              {loadingFullImage ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-white" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fullImageData || selectedPhoto.thumbnailData || selectedPhoto.imageData}
                  alt={selectedPhoto.titleAr || selectedPhoto.title || 'صورة'}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              )}
            </div>

            {/* Info Panel */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
              <div className="max-w-5xl mx-auto">
                <div className="flex items-start justify-between">
                  <div>
                    {(selectedPhoto.titleAr || selectedPhoto.title) && (
                      <h3 className="text-xl font-bold mb-1">
                        {selectedPhoto.titleAr || selectedPhoto.title}
                      </h3>
                    )}
                    {(selectedPhoto.captionAr || selectedPhoto.caption) && (
                      <p className="text-white/80 mb-2">
                        {selectedPhoto.captionAr || selectedPhoto.caption}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-white/70">
                      <span className={`px-2 py-0.5 rounded ${getCategoryInfo(selectedPhoto.category).color}`}>
                        {getCategoryInfo(selectedPhoto.category).label}
                      </span>
                      {selectedPhoto.year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {selectedPhoto.year}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {selectedPhoto.uploadedByName}
                      </span>
                    </div>
                  </div>
                  <div className="text-white/60 text-sm">
                    {selectedIndex + 1} / {allPhotos.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
