'use client';

import { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Tag,
  Download,
  ZoomIn,
  Loader2,
} from 'lucide-react';

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
  isProfilePhoto?: boolean;
}

interface PhotoGalleryProps {
  memberId?: string;
  view?: 'gallery' | 'timeline' | 'family';
  showUploadButton?: boolean;
  onUploadClick?: () => void;
  limit?: number;
  compact?: boolean;
}

interface TimelineItem {
  year: number;
  count: number;
  photos: Photo[];
}

export default function PhotoGallery({
  memberId,
  view = 'gallery',
  showUploadButton = true,
  onUploadClick,
  limit,
  compact = false,
}: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullImageData, setFullImageData] = useState<string | null>(null);
  const [loadingFullImage, setLoadingFullImage] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [memberId, view]);

  const loadPhotos = async () => {
    setIsLoading(true);
    try {
      let url: string;
      const params = new URLSearchParams();
      if (limit) params.set('limit', limit.toString());

      if (memberId) {
        if (view === 'timeline') {
          params.set('view', 'timeline');
        }
        url = `/api/images/member/${memberId}?${params}`;
      } else if (view === 'family') {
        params.set('view', 'family');
        url = `/api/images/gallery?${params}`;
      } else if (view === 'timeline') {
        params.set('view', 'timeline');
        url = `/api/images/gallery?${params}`;
      } else {
        url = `/api/images/gallery?${params}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (view === 'timeline' && data.timeline) {
        setTimeline(data.timeline);
      } else {
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
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
    // Load full resolution image
    await loadFullImage(photo.id);
  };

  const closePhoto = () => {
    setSelectedPhoto(null);
    setFullImageData(null);
  };

  const goToNext = () => {
    if (selectedIndex < photos.length - 1) {
      const nextPhoto = photos[selectedIndex + 1];
      openPhoto(nextPhoto, selectedIndex + 1);
    }
  };

  const goToPrev = () => {
    if (selectedIndex > 0) {
      const prevPhoto = photos[selectedIndex - 1];
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F] mx-auto mb-2" />
          <p className="text-sm text-gray-500">جاري تحميل الصور...</p>
        </div>
      </div>
    );
  }

  // Timeline View
  if (view === 'timeline') {
    return (
      <div className="space-y-8">
        {showUploadButton && onUploadClick && (
          <button
            onClick={onUploadClick}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors flex items-center justify-center gap-2"
          >
            <ImageIcon className="w-5 h-5" />
            إضافة صورة جديدة
          </button>
        )}

        {timeline.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>لا توجد صور بعد</p>
          </div>
        ) : (
          timeline.map((item) => (
            <div key={item.year} className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-[#1E3A5F] text-white rounded-xl flex items-center justify-center">
                  <span className="text-lg font-bold">{item.year}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{item.count} صورة</p>
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mr-20">
                {item.photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openPhoto(photo, idx)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbnailData || photo.imageData}
                      alt={photo.titleAr || photo.title || 'صورة'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // Gallery View (view is 'gallery' or 'family' at this point since 'timeline' returns early)
  const allPhotos = photos;

  return (
    <div>
      {showUploadButton && onUploadClick && !compact && (
        <button
          onClick={onUploadClick}
          className="w-full py-3 mb-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors flex items-center justify-center gap-2"
        >
          <ImageIcon className="w-5 h-5" />
          إضافة صورة جديدة
        </button>
      )}

      {allPhotos.length === 0 ? (
        <div className={`text-center ${compact ? 'py-4' : 'py-12'} text-gray-500`}>
          <ImageIcon className={`${compact ? 'w-8 h-8' : 'w-16 h-16'} mx-auto mb-2 text-gray-300`} />
          <p className={compact ? 'text-sm' : ''}>لا توجد صور</p>
          {showUploadButton && onUploadClick && (
            <button
              onClick={onUploadClick}
              className="mt-2 text-sm text-[#1E3A5F] hover:underline"
            >
              أضف أول صورة
            </button>
          )}
        </div>
      ) : (
        <div className={`grid gap-${compact ? '2' : '4'} ${
          compact
            ? 'grid-cols-4'
            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        }`}>
          {allPhotos.map((photo, index) => {
            const categoryInfo = getCategoryInfo(photo.category);
            return (
              <div
                key={photo.id}
                className={`group relative rounded-xl overflow-hidden cursor-pointer ${
                  compact ? 'aspect-square' : 'aspect-[4/3]'
                }`}
                onClick={() => openPhoto(photo, index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbnailData || photo.imageData}
                  alt={photo.titleAr || photo.title || 'صورة'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {!compact && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform">
                      {(photo.titleAr || photo.title) && (
                        <p className="font-medium truncate">{photo.titleAr || photo.title}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-white/80 mt-1">
                        <span className={`px-1.5 py-0.5 rounded ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                        {photo.year && <span>{photo.year}</span>}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white">
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
                {photo.isProfilePhoto && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
                    الصورة الرئيسية
                  </div>
                )}
              </div>
            );
          })}
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
          {selectedIndex < photos.length - 1 && (
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
                  {selectedIndex + 1} / {photos.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
