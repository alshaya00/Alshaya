'use client';

import { useState } from 'react';
import { Image as ImageIcon, Plus } from 'lucide-react';
import PhotoGallery from './PhotoGallery';
import ImageUploadForm from './ImageUploadForm';

interface MemberPhotoSectionProps {
  memberId: string;
  memberName: string;
}

export default function MemberPhotoSection({ memberId, memberName }: MemberPhotoSectionProps) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="bg-gray-50 rounded-xl p-5">
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
        <PhotoGallery
          key={refreshKey}
          memberId={memberId}
          view="gallery"
          showUploadButton={false}
          compact={false}
          limit={8}
        />
      )}

      {/* Upload Note */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        الصور المرفوعة تحتاج موافقة المسؤول قبل ظهورها
      </p>
    </div>
  );
}
