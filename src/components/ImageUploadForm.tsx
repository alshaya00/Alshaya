'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  X,
  Image as ImageIcon,
  Calendar,
  Tag,
  User,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Folder as FolderIcon,
  Crop,
  Plus,
  Save,
  Video,
  Play,
} from 'lucide-react';
import { imageCategories as configImageCategories } from '@/config/constants';
import { formatMemberId } from '@/lib/utils';
import ImageCropper from './ImageCropper';
import { useAuth } from '@/contexts/AuthContext';

interface Member {
  id: string;
  firstName: string;
  fullNameAr?: string;
}

interface Folder {
  id: string;
  name: string;
  nameAr: string;
  color: string;
}

interface ImageUploadFormProps {
  memberId?: string;
  memberName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultCategory?: 'profile' | 'memory' | 'document' | 'historical';
  isFamilyAlbum?: boolean;
}

interface FormData {
  imageData: string;
  category: 'profile' | 'memory' | 'document' | 'historical';
  title: string;
  titleAr: string;
  caption: string;
  captionAr: string;
  year: string;
  memberId: string;
  memberName: string;
  folderId: string;
  uploaderName: string;
  uploaderEmail: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for videos
const MAX_DIMENSION = 1200;
const COMPRESSION_QUALITY = 0.8;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export default function ImageUploadForm({
  memberId,
  memberName,
  onSuccess,
  onCancel,
  defaultCategory = 'memory',
  isFamilyAlbum = false,
}: ImageUploadFormProps) {
  const { session } = useAuth();
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';
  
  const [formData, setFormData] = useState<FormData>({
    imageData: '',
    category: defaultCategory,
    title: '',
    titleAr: '',
    caption: '',
    captionAr: '',
    year: '',
    memberId: memberId || '',
    memberName: memberName || '',
    folderId: '',
    uploaderName: '',
    uploaderEmail: '',
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isVideoFile, setIsVideoFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load folders
  useEffect(() => {
    loadFolders();
  }, []);

  // Load members for selection
  useEffect(() => {
    if (!memberId) {
      loadMembers();
    }
  }, [memberId]);

  const loadFolders = async () => {
    try {
      const res = await fetch('/api/images/gallery?view=folders');
      const data = await res.json();
      if (data.folders) {
        setFolders(data.folders);
        // Default to "Memories" folder if available
        const memoriesFolder = data.folders.find((f: Folder) => f.name === 'Memories');
        if (memoriesFolder && !formData.folderId) {
          setFormData(prev => ({ ...prev, folderId: memoriesFolder.id }));
        }
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !session?.token) return;
    
    setIsCreatingFolder(true);
    try {
      const res = await fetch('/api/admin/folders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          nameAr: newFolderName.trim(),
          name: newFolderName.trim(),
          color: '#10b981',
          icon: 'Calendar',
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        await loadFolders();
        if (data.folder?.id) {
          setFormData(prev => ({ ...prev, folderId: data.folder.id }));
        }
        setNewFolderName('');
        setShowNewFolderForm(false);
      } else {
        const error = await res.json();
        setErrorMessage(error.messageAr || 'فشل في إنشاء الألبوم');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      setErrorMessage('حدث خطأ في إنشاء الألبوم');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const loadMembers = async () => {
    try {
      const res = await fetch('/api/members?limit=200');
      const data = await res.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error loading members:', error);
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

          // Calculate new dimensions
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
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    
    if (!isImage && !isVideo) {
      setErrorMessage('يرجى اختيار ملف صورة أو فيديو (PNG, JPG, GIF, MP4, WebM, MOV)');
      return;
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      const maxMB = maxSize / 1024 / 1024;
      setErrorMessage(`حجم الملف أكبر من ${maxMB} ميجابايت`);
      return;
    }

    setErrorMessage('');
    setIsVideoFile(isVideo);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const mediaData = e.target?.result as string;
        
        if (isVideo) {
          // For videos, skip cropping and set preview directly
          setPreview(mediaData);
          setFormData((prev) => ({ ...prev, imageData: mediaData }));
          setSourceImage(null);
        } else {
          // For images, show cropper
          setSourceImage(mediaData);
          setOriginalImage(mediaData);
          setShowCropper(true);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setErrorMessage('فشل في معالجة الملف');
      console.error('Error processing file:', error);
    }
  };

  const handleCropComplete = async (croppedImage: string) => {
    setShowCropper(false);
    setOriginalImage(null);
    setPreview(croppedImage);
    setFormData((prev) => ({ ...prev, imageData: croppedImage }));
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setOriginalImage(null);
    if (!preview && fileInputRef.current) {
      fileInputRef.current.value = '';
      setSourceImage(null);
    }
  };

  const handleReCrop = () => {
    if (sourceImage) {
      setOriginalImage(sourceImage);
      setShowCropper(true);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectMember = (member: Member) => {
    setFormData((prev) => ({
      ...prev,
      memberId: member.id,
      memberName: member.fullNameAr || member.firstName,
    }));
    setSearchQuery(member.fullNameAr || member.firstName);
    setShowMemberDropdown(false);
  };

  const filteredMembers = members.filter(
    (m) =>
      m.firstName.includes(searchQuery) ||
      m.fullNameAr?.includes(searchQuery) ||
      m.id.includes(searchQuery)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.imageData) {
      setErrorMessage('يرجى اختيار صورة');
      return;
    }

    if (!formData.uploaderName.trim()) {
      setErrorMessage('يرجى إدخال اسمك');
      return;
    }

    // Validate year if provided
    if (formData.year) {
      const yearNum = parseInt(formData.year);
      const currentYear = new Date().getFullYear();
      if (isNaN(yearNum) || yearNum < 1800 || yearNum > currentYear) {
        setErrorMessage(`السنة يجب أن تكون بين 1800 و ${currentYear}`);
        return;
      }
    }

    setIsUploading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: formData.imageData,
          category: formData.category,
          title: formData.title || undefined,
          titleAr: formData.titleAr || undefined,
          caption: formData.caption || undefined,
          captionAr: formData.captionAr || undefined,
          year: formData.year ? parseInt(formData.year) : undefined,
          memberId: formData.memberId || undefined,
          memberName: formData.memberName || undefined,
          folderId: formData.folderId || undefined,
          uploaderName: formData.uploaderName,
          uploaderEmail: formData.uploaderEmail || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setUploadStatus('success');
        setTimeout(() => {
          onSuccess?.();
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
    setSourceImage(null);
    setIsVideoFile(false);
    setFormData((prev) => ({ ...prev, imageData: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Use categories from centralized config
  const categories = configImageCategories.map(c => ({
    value: c.value,
    label: c.labelAr,
    description: c.descriptionAr,
  }));

  if (showCropper && originalImage) {
    return (
      <ImageCropper
        imageSrc={originalImage}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
        aspectRatio={formData.category === 'profile' ? 1 : undefined}
        circularCrop={formData.category === 'profile'}
        minDimension={300}
      />
    );
  }

  if (uploadStatus === 'success') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">تم رفع الصورة بنجاح!</h3>
        <p className="text-gray-600 mb-4">
          صورتك قيد المراجعة من قبل المسؤولين وستظهر بعد الموافقة عليها
        </p>
        <button
          onClick={onSuccess}
          className="px-6 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2d5a8a]"
        >
          متابعة
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800">رفع صورة أو فيديو</h3>
        {onCancel && (
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Image Upload Area */}
        <div>
          {!preview ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-[#1E3A5F] bg-blue-50'
                  : 'border-gray-300 hover:border-[#1E3A5F]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">اسحب الصورة أو الفيديو هنا أو اضغط للاختيار</p>
              <p className="text-sm text-gray-400">
                صور: PNG, JPG, GIF (حتى 5 ميجابايت) | فيديو: MP4, WebM, MOV (حتى 50 ميجابايت)
              </p>
            </div>
          ) : (
            <div className="relative">
              {isVideoFile ? (
                <div className="relative">
                  <video
                    src={preview}
                    controls
                    className="w-full h-64 object-contain bg-gray-900 rounded-xl"
                  >
                    متصفحك لا يدعم عرض الفيديو
                  </video>
                  <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    فيديو
                  </div>
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="معاينة"
                    className={`w-full h-64 object-contain bg-gray-100 rounded-xl ${formData.category === 'profile' ? 'rounded-full mx-auto max-w-64' : ''}`}
                  />
                </>
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                {sourceImage && !isVideoFile && (
                  <button
                    type="button"
                    onClick={handleReCrop}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    title="إعادة القص"
                  >
                    <Crop className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={removeImage}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  title="إزالة"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Folder Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FolderIcon className="w-4 h-4" />
            الألبوم
          </label>
          <div className="flex flex-wrap gap-2">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, folderId: folder.id }))}
                className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                  formData.folderId === folder.id
                    ? 'text-white border-transparent'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{
                  backgroundColor: formData.folderId === folder.id ? folder.color : undefined,
                }}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: folder.color }}
                />
                {folder.nameAr}
              </button>
            ))}
            {/* Add New Album Button - Only for Admins */}
            {isAdmin && !showNewFolderForm && (
              <button
                type="button"
                onClick={() => setShowNewFolderForm(true)}
                className="px-4 py-2 rounded-lg border-2 border-dashed border-emerald-300 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                ألبوم جديد
              </button>
            )}
            {isAdmin && showNewFolderForm && (
              <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="اسم الألبوم (مثال: عيد 2024)"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateFolder();
                    } else if (e.key === 'Escape') {
                      setShowNewFolderForm(false);
                      setNewFolderName('');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || isCreatingFolder}
                  className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="حفظ"
                >
                  {isCreatingFolder ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewFolderForm(false);
                    setNewFolderName('');
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="إلغاء"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Category Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Tag className="w-4 h-4" />
            تصنيف الصورة
          </label>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, category: cat.value as FormData['category'] }))}
                className={`p-3 rounded-lg border text-right transition-colors ${
                  formData.category === cat.value
                    ? 'border-[#1E3A5F] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-800">{cat.label}</p>
                <p className="text-xs text-gray-500">{cat.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Member Selection (if not pre-set) */}
        {!memberId && !isFamilyAlbum && (
          <div className="relative">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              العضو المرتبط (اختياري)
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowMemberDropdown(true);
              }}
              onFocus={() => setShowMemberDropdown(true)}
              placeholder="ابحث عن عضو..."
              className="w-full p-3 border rounded-lg"
            />
            {showMemberDropdown && searchQuery && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                {filteredMembers.length === 0 ? (
                  <div className="p-3 text-gray-500 text-sm">لا توجد نتائج</div>
                ) : (
                  filteredMembers.slice(0, 10).map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => selectMember(member)}
                      className="w-full p-3 text-right hover:bg-gray-50"
                    >
                      <p className="font-medium">{member.fullNameAr || member.firstName}</p>
                      <p className="text-xs text-gray-500">{formatMemberId(member.id)}</p>
                    </button>
                  ))
                )}
              </div>
            )}
            {formData.memberId && (
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, memberId: '', memberName: '' }));
                  setSearchQuery('');
                }}
                className="absolute left-3 top-10 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Title */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              العنوان (عربي)
            </label>
            <input
              type="text"
              name="titleAr"
              value={formData.titleAr}
              onChange={handleInputChange}
              placeholder="عنوان الصورة..."
              className="w-full p-3 border rounded-lg"
              dir="rtl"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Title (English)
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Photo title..."
              className="w-full p-3 border rounded-lg"
              dir="ltr"
            />
          </div>
        </div>

        {/* Caption */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            الوصف / القصة
          </label>
          <textarea
            name="captionAr"
            value={formData.captionAr}
            onChange={handleInputChange}
            placeholder="اكتب قصة أو وصف لهذه الصورة..."
            className="w-full p-3 border rounded-lg resize-none h-24"
            dir="rtl"
          />
        </div>

        {/* Year */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            سنة التصوير (اختياري)
          </label>
          <input
            type="number"
            name="year"
            value={formData.year}
            onChange={handleInputChange}
            placeholder="مثال: 1990"
            min="1800"
            max={new Date().getFullYear()}
            className="w-full p-3 border rounded-lg"
          />
        </div>

        {/* Uploader Info */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <h4 className="font-medium text-gray-700">معلومات الراسل</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                اسمك <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="uploaderName"
                value={formData.uploaderName}
                onChange={handleInputChange}
                placeholder="اسمك الكامل"
                required
                className="w-full p-3 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                البريد الإلكتروني (اختياري)
              </label>
              <input
                type="email"
                name="uploaderEmail"
                value={formData.uploaderEmail}
                onChange={handleInputChange}
                placeholder="email@example.com"
                className="w-full p-3 border rounded-lg"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 border rounded-lg text-gray-700 hover:bg-gray-50"
            >
              إلغاء
            </button>
          )}
          <button
            type="submit"
            disabled={isUploading || !formData.imageData}
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

        {/* Note */}
        <p className="text-xs text-gray-500 text-center">
          سيتم مراجعة الصورة من قبل المسؤولين قبل نشرها
        </p>
      </form>
    </div>
  );
}
