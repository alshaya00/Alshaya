'use client';

import { useState, useEffect } from 'react';
import { Camera, Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import ImageUploadForm from './ImageUploadForm';

interface MemberProfileAvatarProps {
  memberId: string;
  memberName: string;
  gender: string;
  size?: '2xl' | 'xl' | 'lg';
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

export default function MemberProfileAvatar({ memberId, memberName, gender, size = '2xl' }: MemberProfileAvatarProps) {
  const { isAuthenticated, hasPermission, getAuthHeader } = useAuth();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [photos, setPhotos] = useState<Array<{ id: string; thumbnailData: string; isProfilePhoto: boolean }>>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [settingPhotoId, setSettingPhotoId] = useState<string | null>(null);

  const isAdmin = isAuthenticated && (hasPermission('manage_all_members') || hasPermission('edit_any_member'));
  const isMale = gender === 'Male';
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
      }
    } catch (error) {
      console.error('Error loading profile photo:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    loadProfilePhoto();
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
      <div className="relative group">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 border-white/30`}>
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
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowOptions(true)}
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
                onClick={() => {
                  setShowOptions(false);
                  setShowUploadForm(true);
                }}
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

      {showUploadForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUploadForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">رفع صورة الملف الشخصي</h3>
              <button onClick={() => setShowUploadForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <ImageUploadForm
              memberId={memberId}
              memberName={memberName}
              onSuccess={handleUploadSuccess}
              onCancel={() => setShowUploadForm(false)}
              defaultCategory="profile"
            />
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
    </>
  );
}
