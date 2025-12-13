'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Save, Loader2, AlertCircle, CheckCircle, Image as ImageIcon,
  Plus, X, Calendar, MapPin, User, Users, BookOpen, Scroll, Building2,
  Tent, Star, Heart, FileText, Feather, TreePine, Info
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { JOURNAL_CATEGORIES, HISTORICAL_ERAS, type JournalCategoryType } from '@/lib/types';

const categoryIcons: Record<JournalCategoryType, React.ReactNode> = {
  ORAL_HISTORY: <Scroll className="w-5 h-5" />,
  TRADITION: <Building2 className="w-5 h-5" />,
  MIGRATION: <Tent className="w-5 h-5" />,
  ACHIEVEMENT: <Star className="w-5 h-5" />,
  MEMORY: <Heart className="w-5 h-5" />,
  DOCUMENT: <FileText className="w-5 h-5" />,
  POEM: <Feather className="w-5 h-5" />,
  GENEALOGY: <TreePine className="w-5 h-5" />,
};

interface FormData {
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  category: JournalCategoryType;
  era: string;
  yearFrom: string;
  yearTo: string;
  dateDescription: string;
  locationAr: string;
  narrator: string;
  source: string;
  generation: string;
  authorName: string;
  tags: string[];
  coverImageUrl: string;
}

export default function NewJournalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedEra = searchParams.get('era');

  const [formData, setFormData] = useState<FormData>({
    titleAr: '',
    titleEn: '',
    contentAr: '',
    contentEn: '',
    category: 'ORAL_HISTORY',
    era: preselectedEra || '',
    yearFrom: '',
    yearTo: '',
    dateDescription: '',
    locationAr: '',
    narrator: '',
    source: '',
    generation: '',
    authorName: '',
    tags: [],
    coverImageUrl: '',
  });

  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
    // Validation
    if (!formData.titleAr.trim()) {
      setError('الرجاء إدخال عنوان القصة');
      return;
    }
    if (!formData.contentAr.trim()) {
      setError('الرجاء إدخال محتوى القصة');
      return;
    }
    if (!formData.authorName.trim()) {
      setError('الرجاء إدخال اسم الكاتب');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          yearFrom: formData.yearFrom ? parseInt(formData.yearFrom) : null,
          yearTo: formData.yearTo ? parseInt(formData.yearTo) : null,
          generation: formData.generation ? parseInt(formData.generation) : null,
          status,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/journals/${data.data.id}`);
        }, 1500);
      } else {
        setError(data.error || 'فشل في حفظ القصة');
      }
    } catch (err) {
      console.error('Error saving journal:', err);
      setError('حدث خطأ أثناء حفظ القصة');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-amber-50">
        <Navigation />
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">تم حفظ القصة بنجاح!</h2>
          <p className="text-gray-500">جاري التحويل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50">
      <Navigation />

      {/* Header */}
      <div className="bg-gradient-to-l from-amber-600 to-amber-700 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/journals"
              className="flex items-center gap-2 text-amber-200 hover:text-white transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              <span>العودة</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">إضافة قصة جديدة</h1>
              <p className="text-amber-200 text-sm">أضف قصة أو ذكرى من تاريخ العائلة</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-8">
            {/* Basic Information */}
            <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                المعلومات الأساسية
              </h2>

              {/* Category Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  تصنيف القصة <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.entries(JOURNAL_CATEGORIES) as [JournalCategoryType, typeof JOURNAL_CATEGORIES[JournalCategoryType]][]).map(([key, cat]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleChange('category', key)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        formData.category === key
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-gray-200 hover:border-amber-300 text-gray-600'
                      }`}
                    >
                      <span className="text-2xl mb-2 block">{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.nameAr}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عنوان القصة بالعربية <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.titleAr}
                  onChange={(e) => handleChange('titleAr', e.target.value)}
                  placeholder="مثال: قصة هجرة الجد الأول إلى الرياض"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  العنوان بالإنجليزية (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.titleEn}
                  onChange={(e) => handleChange('titleEn', e.target.value)}
                  placeholder="English title (optional)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                  dir="ltr"
                />
              </div>

              {/* Content */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نص القصة بالعربية <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.contentAr}
                  onChange={(e) => handleChange('contentAr', e.target.value)}
                  placeholder="اكتب القصة هنا... يمكنك استخدام فقرات متعددة"
                  rows={12}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all resize-none leading-relaxed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {formData.contentAr.length} حرف
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الترجمة الإنجليزية (اختياري)
                </label>
                <textarea
                  value={formData.contentEn}
                  onChange={(e) => handleChange('contentEn', e.target.value)}
                  placeholder="English translation (optional)"
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all resize-none"
                  dir="ltr"
                />
              </div>

              {/* Author Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline-block ml-1" />
                  اسم الكاتب <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.authorName}
                  onChange={(e) => handleChange('authorName', e.target.value)}
                  placeholder="اسمك أو اسم من كتب القصة"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                />
              </div>
            </section>

            {/* Time & Place */}
            <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                الزمان والمكان
              </h2>

              {/* Era Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  الحقبة الزمنية
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {HISTORICAL_ERAS.map((era) => (
                    <button
                      key={era.key}
                      type="button"
                      onClick={() => handleChange('era', formData.era === era.key ? '' : era.key)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        formData.era === era.key
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-gray-200 hover:border-amber-300 text-gray-600'
                      }`}
                    >
                      <span className="text-sm font-medium block">{era.nameAr}</span>
                      <span className="text-xs text-gray-400">{era.yearRange}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Range */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    من سنة (تقريبي)
                  </label>
                  <input
                    type="number"
                    value={formData.yearFrom}
                    onChange={(e) => handleChange('yearFrom', e.target.value)}
                    placeholder="مثال: 1350"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    إلى سنة (تقريبي)
                  </label>
                  <input
                    type="number"
                    value={formData.yearTo}
                    onChange={(e) => handleChange('yearTo', e.target.value)}
                    placeholder="اتركه فارغاً إذا كانت سنة واحدة"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                  />
                </div>
              </div>

              {/* Date Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  وصف الوقت (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.dateDescription}
                  onChange={(e) => handleChange('dateDescription', e.target.value)}
                  placeholder="مثال: في أوائل الأربعينات الهجرية، قبل توحيد المملكة..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline-block ml-1" />
                  المكان
                </label>
                <input
                  type="text"
                  value={formData.locationAr}
                  onChange={(e) => handleChange('locationAr', e.target.value)}
                  placeholder="مثال: الرياض، نجد، الأحساء..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                />
              </div>
            </section>

            {/* Additional Details */}
            <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-lg font-bold text-gray-800 mb-6"
              >
                <span className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-amber-600" />
                  تفاصيل إضافية
                </span>
                <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {showAdvanced && (
                <div className="space-y-6">
                  {/* Narrator */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      راوي القصة
                    </label>
                    <input
                      type="text"
                      value={formData.narrator}
                      onChange={(e) => handleChange('narrator', e.target.value)}
                      placeholder="من روى هذه القصة؟"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                    />
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المصدر
                    </label>
                    <input
                      type="text"
                      value={formData.source}
                      onChange={(e) => handleChange('source', e.target.value)}
                      placeholder="مثال: رواية شفهية من الجد، وثيقة عائلية..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                    />
                  </div>

                  {/* Generation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="w-4 h-4 inline-block ml-1" />
                      الجيل المرتبط
                    </label>
                    <select
                      value={formData.generation}
                      onChange={(e) => handleChange('generation', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                    >
                      <option value="">اختر الجيل (اختياري)</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((gen) => (
                        <option key={gen} value={gen}>الجيل {gen}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الوسوم
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="أضف وسم..."
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cover Image URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <ImageIcon className="w-4 h-4 inline-block ml-1" />
                      رابط صورة الغلاف (اختياري)
                    </label>
                    <input
                      type="url"
                      value={formData.coverImageUrl}
                      onChange={(e) => handleChange('coverImageUrl', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                type="button"
                onClick={() => handleSubmit('DRAFT')}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                حفظ كمسودة
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('PUBLISHED')}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                نشر القصة
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-20 lg:h-0" />
    </div>
  );
}
