'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Star, Loader2, Check, Camera } from 'lucide-react';
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

export default function MemberPhotoSection({ memberId, memberName, onProfilePhotoChange }: MemberPhotoSectionProps) {
  const { isAuthenticated, hasPermission, getAuthHeader } = useAuth();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settingProfileId, setSettingProfileId] = useState<string | null>(null);

  const isAdmin = isAuthenticated && (hasPermission('manage_all_members') || hasPermission('edit_any_member'));

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
    setRefreshKey((k) => k + 1);
  };

  const handleSetAsProfile = async (photoId: string) => {
    if (!isAdmin) return;
    
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
      }
    } catch (error) {
      console.error('Error setting profile photo:', error);
    } finally {
      setSettingProfileId(null);
    }
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
        <ImageUploadForm
          memberId={memberId}
          memberName={memberName}
          onSuccess={handleUploadSuccess}
          onCancel={() => setShowUploadForm(false)}
          defaultCategory="memory"
        />
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

                  {isAdmin && !photo.isProfilePhoto && (
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

                  {isAdmin && photo.isProfilePhoto && (
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
        الصور المرفوعة تحتاج موافقة المسؤول قبل ظهورها
      </p>
    </div>
  );
}
