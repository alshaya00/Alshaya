'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Image as ImageIcon, Plus, Star, Loader2, Check, Camera, Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import PhotoGallery from './PhotoGallery';
import ImageUploadForm from './ImageUploadForm';
import { useAuth } from '@/contexts/AuthContext';

interface Photo {
  id: string;
  thumbnailData?: string;
  imageData?: string;
  category: string;
  title?: string;
  titleAr?: string;
  caption?: string;
  captionAr?: string;
  year?: number;
  uploadedByName: string;
  createdAt: string;
  isProfilePhoto?: boolean;
}

interface MemberPhotoSectionProps {
  memberId: string;
  memberName: string;
  onProfilePhotoChange?: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DIMENSION = 1200;
const COMPRESSION_QUALITY = 0.8;

export default function MemberPhotoSection({ memberId, memberName, onProfilePhotoChange }: MemberPhotoSectionProps) {
  const { isAuthenticated, hasPermission, getAuthHeader, user } = useAuth();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settingProfileId, setSettingProfileId] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string>('');
  const [setAsProfile, setSetAsProfile] = useState(false);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<'profile' | 'memory' | 'document' | 'historical'>('memory');
  const [year, setYear] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryOptions = [
    { value: 'memory', label: 'ذكريات', labelEn: 'Memory' },
    { value: 'profile', label: 'صورة شخصية', labelEn: 'Profile' },
    { value: 'document', label: 'وثيقة', labelEn: 'Document' },
    { value: 'historical', label: 'تاريخية', labelEn: 'Historical' },
  ];

  const isAdmin = isAuthenticated && (hasPermission('manage_all_members') || hasPermission('edit_any_member'));
  const isOwner = isAuthenticated && user?.linkedMemberId === memberId;
  const canSetProfilePhoto = isAdmin || isOwner;

  useEffect(() => {
    loadPhotos();
  }, [memberId, refreshKey]);

  const loadPhotos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/images/member/${memberId}?limit=8`);
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    setPreview(null);
    setImageData('');
    setSetAsProfile(false);
    setTitle('');
    setCaption('');
    setCategory('memory');
    setYear('');
    setUploadStatus('idle');
    setRefreshKey((k) => k + 1);
    if (setAsProfile) {
      onProfilePhotoChange?.();
    }
  };

  const handleSetAsProfile = async (photoId: string) => {
    if (!canSetProfilePhoto) return;
    
    setSettingProfileId(photoId);
    try {
      const res = await fetch(`/api/members/${memberId}/profile-photo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ photoId }),
      });

      if (res.ok) {
        setPhotos(photos.map(p => ({
          ...p,
          isProfilePhoto: p.id === photoId,
        })));
        onProfilePhotoChange?.();
      } else {
        const data = await res.json();
        console.error('Error setting profile photo:', data.message || data.error);
      }
    } catch (error) {
      console.error('Error setting profile photo:', error);
    } finally {
      setSettingProfileId(null);
    }
  };

  const resizeImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > height && width > MAX_DIMENSION) {
            height = (height * MAX_DIMENSION) / width;
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = (width * MAX_DIMENSION) / height;
            height = MAX_DIMENSION;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('يرجى اختيار ملف صورة فقط');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('حجم الملف أكبر من 5 ميجابايت');
      return;
    }

    setErrorMessage('');

    try {
      const resizedImage = await resizeImage(file);
      setPreview(resizedImage);
      setImageData(resizedImage);
    } catch (error) {
      setErrorMessage('فشل في معالجة الصورة');
      console.error('Error processing image:', error);
    }
  };

  const handleOwnerUpload = async () => {
    if (!imageData) {
      setErrorMessage('يرجى اختيار صورة');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/members/${memberId}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          imageData,
          category,
          title: title || undefined,
          caption: caption || undefined,
          year: year ? parseInt(year, 10) : undefined,
          setAsProfile,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setUploadStatus('success');
        setTimeout(() => {
          handleUploadSuccess();
        }, 2000);
      } else {
        setUploadStatus('error');
        setErrorMessage(data.errorAr || data.error || 'فشل في رفع الصورة');
      }
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage('حدث خطأ أثناء الرفع');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setPreview(null);
    setImageData('');
    setTitle('');
    setCaption('');
    setCategory('memory');
    setYear('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderOwnerUploadForm = () => {
    if (uploadStatus === 'success') {
      return (
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">تم رفع الصورة بنجاح!</h3>
          <p className="text-gray-600 mb-4">
            تم إضافة الصورة إلى ملفك الشخصي
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">رفع صورة</h3>
          <button onClick={() => { setShowUploadForm(false); removeImage(); }} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!preview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors border-gray-300 hover:border-[#1E3A5F]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
            />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">اضغط لاختيار صورة</p>
            <p className="text-sm text-gray-400">PNG, JPG, GIF حتى 5 ميجابايت</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="معاينة"
                className="w-full h-64 object-contain bg-gray-100 rounded-xl"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  العنوان (اختياري)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="عنوان الصورة"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  التصنيف
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as 'profile' | 'memory' | 'document' | 'historical')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
                  dir="rtl"
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الوصف (اختياري)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="وصف الصورة"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  السنة (اختياري)
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="مثال: 1990"
                  min="1800"
                  max={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
                  dir="ltr"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={setAsProfile}
                onChange={(e) => setSetAsProfile(e.target.checked)}
                className="w-4 h-4 text-[#1E3A5F] rounded"
              />
              <span className="text-sm text-gray-700">تعيين كصورة رئيسية للملف الشخصي</span>
            </label>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg mt-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {preview && (
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => { setShowUploadForm(false); removeImage(); }}
              className="flex-1 py-3 px-4 border rounded-lg text-gray-700 hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleOwnerUpload}
              disabled={isUploading || !imageData}
              className="flex-1 py-3 px-4 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2d5a8a] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  رفع الصورة
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <ImageIcon className="text-purple-600" size={20} />
          معرض الصور
        </h2>
        <button
          onClick={() => setShowUploadForm(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2d5a8a] transition-colors"
        >
          <Plus size={16} />
          إضافة صورة
        </button>
      </div>

      {showUploadForm ? (
        isOwner ? (
          renderOwnerUploadForm()
        ) : (
          <ImageUploadForm
            memberId={memberId}
            memberName={memberName}
            onSuccess={handleUploadSuccess}
            onCancel={() => setShowUploadForm(false)}
            defaultCategory="memory"
          />
        )
      ) : (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>لا توجد صور</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-gray-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnailData || photo.imageData}
                    alt={photo.titleAr || photo.title || 'صورة'}
                    className="w-full h-full object-cover"
                  />
                  
                  {photo.isProfilePhoto && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded flex items-center gap-1">
                      <Star size={12} fill="white" />
                      الصورة الرئيسية
                    </div>
                  )}

                  {canSetProfilePhoto && !photo.isProfilePhoto && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetAsProfile(photo.id);
                        }}
                        disabled={settingProfileId === photo.id}
                        className="flex items-center gap-2 px-3 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                      >
                        {settingProfileId === photo.id ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            جاري التعيين...
                          </>
                        ) : (
                          <>
                            <Camera size={14} />
                            تعيين كصورة رئيسية
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {canSetProfilePhoto && photo.isProfilePhoto && (
                    <div className="absolute bottom-2 right-2">
                      <Check size={20} className="text-white bg-green-500 rounded-full p-0.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p className="text-xs text-gray-500 mt-4 text-center">
        {isOwner 
          ? 'يمكنك رفع صور مباشرة إلى ملفك الشخصي'
          : 'الصور المرفوعة تحتاج موافقة المسؤول قبل ظهورها'
        }
      </p>
    </div>
  );
}
