'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Award,
  Star,
  BookOpen,
  Code,
  Heart,
  Sparkles,
  Users,
  Camera,
  Loader2,
  Plus,
  Trash2,
  Edit,
  X,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Home,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CreditsCategory {
  id: string;
  nameAr: string;
  nameEn: string | null;
  descriptionAr: string;
  descriptionEn: string | null;
  category: string;
  icon: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
}

const CATEGORY_OPTIONS = [
  { value: 'founder', label: 'المؤسسون', color: 'bg-purple-100 text-purple-700' },
  { value: 'data', label: 'البيانات', color: 'bg-blue-100 text-blue-700' },
  { value: 'technical', label: 'التقني', color: 'bg-green-100 text-green-700' },
  { value: 'support', label: 'الدعم', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'special', label: 'مميز', color: 'bg-pink-100 text-pink-700' },
];

const ICON_OPTIONS = [
  { value: 'Star', label: 'نجمة', icon: Star },
  { value: 'BookOpen', label: 'كتاب', icon: BookOpen },
  { value: 'Code', label: 'كود', icon: Code },
  { value: 'Heart', label: 'قلب', icon: Heart },
  { value: 'Sparkles', label: 'بريق', icon: Sparkles },
  { value: 'Award', label: 'جائزة', icon: Award },
  { value: 'Users', label: 'مستخدمون', icon: Users },
  { value: 'Camera', label: 'كاميرا', icon: Camera },
];

const getIconComponent = (iconName: string) => {
  const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
  return iconOption?.icon || BookOpen;
};

export default function AdminCreditsPage() {
  const { session } = useAuth();
  const [categories, setCategories] = useState<CreditsCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CreditsCategory | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<CreditsCategory | null>(null);

  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    category: '',
    icon: 'BookOpen',
    imageUrl: '',
    sortOrder: 0,
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      category: '',
      icon: 'BookOpen',
      imageUrl: '',
      sortOrder: 0,
      isActive: true,
    });
    setEditingCategory(null);
  };

  const fetchCategories = useCallback(async () => {
    if (!session?.token) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/credits-categories', {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في جلب فئات الشكر والتقدير');
      }
    } catch (err) {
      console.error('Error fetching credits categories:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (category: CreditsCategory) => {
    setEditingCategory(category);
    setFormData({
      nameAr: category.nameAr,
      nameEn: category.nameEn || '',
      descriptionAr: category.descriptionAr,
      descriptionEn: category.descriptionEn || '',
      category: category.category,
      icon: category.icon,
      imageUrl: category.imageUrl || '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!session?.token || !formData.nameAr.trim() || !formData.descriptionAr.trim()) return;
    setIsProcessing(true);
    setError(null);

    try {
      const url = editingCategory
        ? `/api/admin/credits-categories/${editingCategory.id}`
        : '/api/admin/credits-categories';
      const method = editingCategory ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          nameAr: formData.nameAr.trim(),
          nameEn: formData.nameEn.trim() || null,
          descriptionAr: formData.descriptionAr.trim(),
          descriptionEn: formData.descriptionEn.trim() || null,
          category: formData.category.trim(),
          icon: formData.icon,
          imageUrl: formData.imageUrl.trim() || null,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
        }),
      });

      if (res.ok) {
        setSuccessMessage(editingCategory ? 'تم تحديث الفئة بنجاح' : 'تم إضافة الفئة بنجاح');
        handleCloseModal();
        await fetchCategories();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في حفظ الفئة');
      }
    } catch (err) {
      console.error('Error saving category:', err);
      setError('حدث خطأ في حفظ الفئة');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (category: CreditsCategory) => {
    if (!session?.token) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/credits-categories/${category.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (res.ok) {
        setSuccessMessage('تم حذف الفئة بنجاح');
        setShowDeleteModal(null);
        await fetchCategories();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في حذف الفئة');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('حدث خطأ في حذف الفئة');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryBadge = (categoryValue: string) => {
    const option = CATEGORY_OPTIONS.find(opt => opt.value === categoryValue);
    if (!option) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {categoryValue}
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${option.color}`}>
        {option.label}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          نشط
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        غير نشط
      </span>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/admin" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <Home className="w-4 h-4" />
          لوحة التحكم
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">إدارة فئات الشكر والتقدير</span>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">إدارة فئات الشكر والتقدير</h1>
              <p className="text-white/80">
                إجمالي {categories.length} فئة
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            إضافة فئة جديدة
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="mr-auto text-green-500 hover:text-green-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mr-auto text-red-500 hover:text-red-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Award className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">لا توجد فئات</p>
            <p className="text-sm">قم بإضافة فئة جديدة للشكر والتقدير</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الصورة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الوصف</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الفئة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الترتيب</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories.map((category) => {
                  const IconComponent = getIconComponent(category.icon);
                  return (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {category.imageUrl ? (
                          <img 
                            src={category.imageUrl} 
                            alt={category.nameAr}
                            className="w-10 h-10 object-cover rounded-lg border"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-900 font-medium">{category.nameAr}</span>
                        {category.nameEn && (
                          <span className="block text-sm text-gray-500">{category.nameEn}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600 text-sm line-clamp-2">{category.descriptionAr}</span>
                      </td>
                      <td className="px-4 py-3">
                        {getCategoryBadge(category.category)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-600">{category.sortOrder}</span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(category.isActive)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(category)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                            تعديل
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(category)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم بالعربي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  placeholder="مثال: جمع البيانات"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم بالإنجليزي
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="Data Collection"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الوصف بالعربي <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.descriptionAr}
                  onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                  placeholder="وصف الفئة..."
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الوصف بالإنجليزي
                </label>
                <textarea
                  value={formData.descriptionEn}
                  onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                  placeholder="Category description..."
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الفئة (اكتب أي اسم تريده)
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="مثال: المؤسسون، البيانات، الدعم..."
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الصورة (اختياري)
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                        <Camera className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">اختر صورة من جهازك</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              setError('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData({ ...formData, imageUrl: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {formData.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        title="إزالة الصورة"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div className="text-center text-xs text-gray-400">أو</div>
                  <input
                    type="url"
                    value={formData.imageUrl?.startsWith('data:') ? '' : formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="أو أدخل رابط الصورة: https://example.com/image.jpg"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    dir="ltr"
                  />
                </div>
                {formData.imageUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <img 
                      src={formData.imageUrl} 
                      alt="معاينة" 
                      className="w-20 h-20 object-cover rounded-lg border shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="text-xs text-green-600">✓ الصورة جاهزة</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الأيقونة
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {ICON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الترتيب
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer mt-6">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">نشط</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={handleSubmit}
                disabled={isProcessing || !formData.nameAr.trim() || !formData.descriptionAr.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingCategory ? (
                  <Edit className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {editingCategory ? 'حفظ التعديلات' : 'إضافة الفئة'}
              </button>
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">تأكيد الحذف</h2>
              <button
                onClick={() => setShowDeleteModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-600">
                هل أنت متأكد من حذف فئة{' '}
                <span className="font-medium text-gray-900">
                  {showDeleteModal.nameAr}
                </span>
                ؟
              </p>
              <p className="text-sm text-gray-500 mt-2">
                لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => handleDelete(showDeleteModal)}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                نعم، حذف
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
