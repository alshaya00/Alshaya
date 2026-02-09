'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, Image as ImageIcon, X, Loader2, Check } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import type { Crop, PixelCrop } from 'react-image-crop';
import dynamic from 'next/dynamic';

const ReactCrop = dynamic(() => import('react-image-crop').then(mod => mod.default), { ssr: false });

interface MemberProfileAvatarProps {
  memberId: string;
  memberName: string;
  gender: string;
  size?: '2xl' | 'xl' | 'lg';
  linkedMemberId?: string | null;
}

const sizeClasses = {
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-24 h-24',
};

const sizePx = {
  lg: 48,
  xl: 64,
  '2xl': 96,
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const OUTPUT_SIZE = 400;
const COMPRESSION_QUALITY = 0.85;

async function getCenterAspectCrop(mediaWidth: number, mediaHeight: number): Promise<Crop> {
  const { centerCrop, makeAspectCrop } = await import('react-image-crop');
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export default function MemberProfileAvatar({ 
  memberId, 
  memberName, 
  gender, 
  size = '2xl',
  linkedMemberId 
}: MemberProfileAvatarProps) {
  const { isAuthenticated, hasPermission, getAuthHeader, user } = useAuth();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [photos, setPhotos] = useState<Array<{ id: string; thumbnailData: string; isProfilePhoto: boolean }>>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [settingPhotoId, setSettingPhotoId] = useState<string | null>(null);

  const [step, setStep] = useState<'idle' | 'crop' | 'uploading' | 'success' | 'error'>('idle');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [showEnlarged, setShowEnlarged] = useState(false);
  const [fullSizePhoto, setFullSizePhoto] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isAdmin = isAuthenticated && (hasPermission('manage_all_members') || hasPermission('edit_any_member'));
  const isOwner = isAuthenticated && user?.linkedMemberId === memberId;
  const canEdit = isAdmin || isOwner;
  const isMale = gender?.toUpperCase() === 'MALE';
  const defaultAvatar = isMale ? '/avatars/male-avatar.png' : '/avatars/female-avatar.png';

  useEffect(() => {
    loadProfilePhoto();
  }, [memberId]);

  const loadProfilePhoto = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}/profile-photo`);
      const data = await res.json();
      if (data.success && data.photo) {
        setProfilePhoto(data.photo.thumbnailData || data.photo.imageData);
        setFullSizePhoto(data.photo.imageData || data.photo.thumbnailData);
      }
    } catch (error) {
      console.error('Error loading profile photo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showEnlarged) {
        setShowEnlarged(false);
      }
    };
    
    if (showEnlarged) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [showEnlarged]);

  const loadGalleryPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const res = await fetch(`/api/images/member/${memberId}?limit=20`);
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleOpenGalleryPicker = () => {
    setShowOptions(false);
    setShowGalleryPicker(true);
    loadGalleryPhotos();
  };

  const handleSelectPhoto = async (photoId: string) => {
    setSettingPhotoId(photoId);
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
        const selectedPhoto = photos.find(p => p.id === photoId);
        if (selectedPhoto) {
          setProfilePhoto(selectedPhoto.thumbnailData);
        }
        setShowGalleryPicker(false);
      }
    } catch (error) {
      console.error('Error setting profile photo:', error);
    } finally {
      setSettingPhotoId(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('يرجى اختيار ملف صورة فقط');
      setStep('error');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('حجم الملف أكبر من 5 ميجابايت');
      setStep('error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setOriginalImage(reader.result as string);
      setShowOptions(false);
      setStep('crop');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    import('react-image-crop/dist/ReactCrop.css');
  }, []);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    getCenterAspectCrop(width, height).then(setCrop);
  }, []);

  const getCroppedImage = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const image = imgRef.current;
      const canvas = canvasRef.current;

      if (!image || !canvas || !completedCrop) {
        reject(new Error('Missing crop data'));
        return;
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No canvas context'));
        return;
      }

      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      ctx.save();
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();

      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      ctx.restore();

      resolve(canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY));
    });
  }, [completedCrop]);

  const handleConfirmCrop = async () => {
    try {
      setStep('uploading');
      const croppedImage = await getCroppedImage();

      const res = await fetch(`/api/members/${memberId}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          imageData: croppedImage,
          category: 'profile',
          setAsProfile: true,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep('success');
        setProfilePhoto(croppedImage);
        setTimeout(() => {
          resetUploadState();
        }, 1500);
      } else {
        setErrorMessage(data.errorAr || data.error || 'فشل في رفع الصورة');
        setStep('error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage('حدث خطأ أثناء الرفع');
      setStep('error');
    }
  };

  const resetUploadState = () => {
    setStep('idle');
    setOriginalImage(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    resetUploadState();
  };

  if (isLoading) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-white/20 flex items-center justify-center`}>
        <Loader2 className="w-6 h-6 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative group">
        <button
          onClick={() => setShowEnlarged(true)}
          className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 border-white/30 cursor-pointer hover:border-white/50 transition-all hover:scale-105`}
          aria-label={`عرض صورة ${memberName}`}
        >
          {profilePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profilePhoto}
              alt={memberName}
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={defaultAvatar}
              alt={isMale ? 'صورة ذكر' : 'صورة أنثى'}
              width={sizePx[size]}
              height={sizePx[size]}
              className="w-full h-full object-cover"
              priority
            />
          )}
        </button>

        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowOptions(true); }}
            className="absolute -bottom-1 -right-1 p-2 bg-white rounded-full shadow-lg text-gray-700 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Camera size={16} />
          </button>
        )}
      </div>

      {showOptions && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowOptions(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">تغيير صورة الملف الشخصي</h3>
              <button onClick={() => setShowOptions(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Upload className="text-blue-600" size={24} />
                <div className="text-right">
                  <p className="font-medium">رفع صورة جديدة</p>
                  <p className="text-sm text-gray-500">اختر صورة من جهازك</p>
                </div>
              </button>

              <button
                onClick={handleOpenGalleryPicker}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ImageIcon className="text-purple-600" size={24} />
                <div className="text-right">
                  <p className="font-medium">اختيار من المعرض</p>
                  <p className="text-sm text-gray-500">استخدم صورة موجودة</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'crop' && originalImage && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">قص الصورة</h3>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-gray-50">
              <div className="relative flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                  className="max-h-[50vh]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={originalImage}
                    alt="قص الصورة"
                    onLoad={onImageLoad}
                    className="max-h-[50vh] object-contain"
                  />
                </ReactCrop>
              </div>
              <p className="text-center text-sm text-gray-500 mt-3">
                اسحب الإطار لتحديد المنطقة المراد قصها
              </p>
            </div>

            <div className="p-4 flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmCrop}
                className="flex-1 py-3 px-4 bg-[#1E3A5F] text-white rounded-xl hover:bg-[#2d5a8a] transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'uploading' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
            <Loader2 className="w-12 h-12 text-[#1E3A5F] animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">جاري رفع الصورة...</h3>
            <p className="text-gray-500 text-sm">يرجى الانتظار</p>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">تم بنجاح!</h3>
            <p className="text-gray-500 text-sm">تم تحديث صورة الملف الشخصي</p>
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">حدث خطأ</h3>
            <p className="text-gray-500 text-sm mb-4">{errorMessage}</p>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  setStep('idle');
                  setErrorMessage('');
                  fileInputRef.current?.click();
                }}
                className="flex-1 py-2 px-4 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2d5a8a]"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      )}

      {showGalleryPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowGalleryPicker(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">اختر صورة من المعرض</h3>
              <button onClick={() => setShowGalleryPicker(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {loadingPhotos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>لا توجد صور في المعرض</p>
                <p className="text-sm mt-2">قم برفع صورة جديدة أولاً</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => handleSelectPhoto(photo.id)}
                    disabled={settingPhotoId === photo.id}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      photo.isProfilePhoto 
                        ? 'border-blue-500 ring-2 ring-blue-200' 
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbnailData}
                      alt="صورة"
                      className="w-full h-full object-cover"
                    />
                    {settingPhotoId === photo.id && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                    {photo.isProfilePhoto && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
                        الحالية
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showEnlarged && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer" 
          onClick={() => setShowEnlarged(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`صورة ${memberName}`}
        >
          <button
            onClick={() => setShowEnlarged(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            aria-label="إغلاق"
          >
            <X size={24} />
          </button>
          <div className="max-w-md w-full" onClick={e => e.stopPropagation()}>
            {(fullSizePhoto || profilePhoto) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fullSizePhoto || profilePhoto || ''}
                alt={memberName}
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            ) : (
              <Image
                src={defaultAvatar}
                alt={isMale ? 'صورة ذكر' : 'صورة أنثى'}
                width={400}
                height={400}
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            )}
            <p className="text-center text-white/80 mt-4 text-lg font-medium">{memberName}</p>
          </div>
        </div>
      )}
    </>
  );
}
