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
} from 'lucide-react';
import { imageCategories as configImageCategories } from '@/config/constants';

interface Member {
  id: string;
  firstName: string;
  fullNameAr?: string;
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
  uploaderName: string;
  uploaderEmail: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 1200;
const COMPRESSION_QUALITY = 0.8;

export default function ImageUploadForm({
  memberId,
  memberName,
  onSuccess,
  onCancel,
  defaultCategory = 'memory',
  isFamilyAlbum = false,
}: ImageUploadFormProps) {
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
    uploaderName: '',
    uploaderEmail: '',
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load members for selection
  useEffect(() => {
    if (!memberId) {
      loadMembers();
    }
  }, [memberId]);

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
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('يرجى اختيار ملف صورة فقط');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('حجم الملف أكبر من 5 ميجابايت');
      return;
    }

    setErrorMessage('');

    try {
      const resizedImage = await resizeImage(file);
      setPreview(resizedImage);
      setFormData((prev) => ({ ...prev, imageData: resizedImage }));
    } catch (error) {
      setErrorMessage('فشل في معالجة الصورة');
      console.error('Error processing image:', error);
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
        <h3 className="text-xl font-bold text-gray-800">رفع صورة جديدة</h3>
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
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">اسحب الصورة هنا أو اضغط للاختيار</p>
              <p className="text-sm text-gray-400">
                PNG, JPG, GIF حتى 5 ميجابايت
              </p>
            </div>
          ) : (
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
          )}
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
                      <p className="text-xs text-gray-500">{member.id}</p>
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
