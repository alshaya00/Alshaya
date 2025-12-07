'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  FileText,
  ChevronDown,
  ChevronUp,
  History,
  RefreshCw,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { familyMembers, getMemberById } from '@/lib/data';
import {
  validateEdit,
  validateParentChange,
  generateFullName,
  calculateCascadeUpdates,
  CascadeUpdate,
} from '@/lib/edit-utils';
import { FamilyMember, ValidationError } from '@/lib/types';

type EditSection = 'identity' | 'family' | 'personal' | 'contact';

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  // Original member data
  const originalMember = useMemo(() => getMemberById(memberId), [memberId]);

  // Form state
  const [formData, setFormData] = useState<Partial<FamilyMember>>({});
  const [expandedSections, setExpandedSections] = useState<EditSection[]>(['identity', 'family']);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<{ field: string; message: string; suggestion?: string }[]>([]);
  const [cascadeUpdates, setCascadeUpdates] = useState<CascadeUpdate[]>([]);
  const [showCascadePreview, setShowCascadePreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  // Initialize form with member data
  useEffect(() => {
    if (originalMember) {
      setFormData({ ...originalMember });
    }
  }, [originalMember]);

  // Get all potential fathers (males)
  const potentialFathers = useMemo(() => {
    return familyMembers.filter(m =>
      m.gender === 'Male' && m.id !== memberId
    ).sort((a, b) => a.generation - b.generation);
  }, [memberId]);

  // Track which fields have changed
  const changedFields = useMemo(() => {
    if (!originalMember) return [];
    const changed: string[] = [];
    const originalRecord = originalMember as unknown as Record<string, unknown>;
    for (const key of Object.keys(formData)) {
      const formValue = formData[key as keyof FamilyMember];
      const originalValue = originalRecord[key];
      if (formValue !== originalValue) {
        changed.push(key);
      }
    }
    return changed;
  }, [formData, originalMember]);

  // Validate on form change
  useEffect(() => {
    if (!originalMember || changedFields.length === 0) {
      setErrors([]);
      setWarnings([]);
      setCascadeUpdates([]);
      return;
    }

    const changes: Partial<FamilyMember> = {};
    for (const field of changedFields) {
      (changes as any)[field] = formData[field as keyof FamilyMember];
    }

    // Validate
    const validation = validateEdit(memberId, changes, familyMembers);
    setErrors(validation.errors);
    setWarnings(validation.warnings);

    // Calculate cascade updates
    const cascades = calculateCascadeUpdates(memberId, changes, familyMembers);
    setCascadeUpdates(cascades);
  }, [formData, originalMember, changedFields, memberId]);

  // Update form field
  const updateField = (field: keyof FamilyMember, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  // Toggle section
  const toggleSection = (section: EditSection) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Handle parent change
  const handleParentChange = (newParentId: string | null) => {
    const validation = validateParentChange(memberId, newParentId, familyMembers);

    if (!validation.valid) {
      alert(validation.errors.join('\n'));
      return;
    }

    if (validation.wouldCreateCycle) {
      alert('هذا التغيير سيخلق دورة في الشجرة ولا يمكن تطبيقه');
      return;
    }

    updateField('fatherId', newParentId);

    // Update related fields
    if (newParentId) {
      const newParent = familyMembers.find(m => m.id === newParentId);
      if (newParent) {
        updateField('fatherName', newParent.firstName);
        updateField('generation', newParent.generation + 1);
        updateField('branch', newParent.branch);

        // Update ancestor names
        const grandparent = familyMembers.find(m => m.id === newParent.fatherId);
        if (grandparent) {
          updateField('grandfatherName', grandparent.firstName);
          const greatGrandparent = familyMembers.find(m => m.id === grandparent.fatherId);
          if (greatGrandparent) {
            updateField('greatGrandfatherName', greatGrandparent.firstName);
          }
        }
      }
    } else {
      updateField('fatherName', null);
      updateField('generation', 1);
    }
  };

  // Regenerate full name
  const regenerateFullName = () => {
    const names = generateFullName(formData, familyMembers);
    updateField('fullNameAr', names.fullNameAr);
    updateField('fullNameEn', names.fullNameEn);
  };

  // Save changes
  const handleSave = async () => {
    if (errors.length > 0) {
      alert('يرجى تصحيح الأخطاء قبل الحفظ');
      return;
    }

    setIsSaving(true);

    try {
      // In real implementation, this would call an API
      // For now, save to localStorage

      const changes = changedFields.reduce((acc, field) => {
        acc[field] = formData[field as keyof FamilyMember];
        return acc;
      }, {} as Record<string, unknown>);

      // Save edit history
      const editHistory = JSON.parse(localStorage.getItem('alshaye_edit_history') || '[]');
      editHistory.push({
        memberId,
        memberName: originalMember?.fullNameAr || originalMember?.firstName,
        changes,
        reason: changeReason,
        timestamp: new Date().toISOString(),
        cascadeUpdates: cascadeUpdates.length > 0 ? cascadeUpdates : undefined
      });
      localStorage.setItem('alshaye_edit_history', JSON.stringify(editHistory));

      // Update member data in localStorage
      const storedMembers = JSON.parse(localStorage.getItem('alshaye_edited_members') || '{}');
      storedMembers[memberId] = {
        ...originalMember,
        ...formData,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('alshaye_edited_members', JSON.stringify(storedMembers));

      setSaveSuccess(true);
      setTimeout(() => {
        router.push(`/member/${memberId}`);
      }, 1500);
    } catch (error) {
      console.error('Save failed:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form
  const handleReset = () => {
    if (originalMember) {
      setFormData({ ...originalMember });
    }
    setChangeReason('');
    setSaveSuccess(false);
  };

  if (!originalMember) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">العضو غير موجود</h2>
          <Link href="/tree" className="text-blue-600 hover:underline">
            العودة للشجرة
          </Link>
        </div>
      </div>
    );
  }

  const sections: { key: EditSection; title: string; icon: React.ElementType }[] = [
    { key: 'identity', title: 'الهوية', icon: User },
    { key: 'family', title: 'العائلة', icon: Users },
    { key: 'personal', title: 'شخصي', icon: Calendar },
    { key: 'contact', title: 'التواصل', icon: Phone },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/member/${memberId}`}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowRight className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">تعديل العضو</h1>
                <p className="text-white/80 text-sm">
                  {originalMember.fullNameAr || originalMember.firstName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {changedFields.length > 0 && (
                <span className="px-3 py-1 bg-yellow-500/20 rounded-lg text-sm">
                  {changedFields.length} تغييرات
                </span>
              )}
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة تعيين
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || errors.length > 0 || changedFields.length === 0}
                className="px-6 py-2 bg-white text-[#1E3A5F] rounded-lg flex items-center gap-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'جاري الحفظ...' : saveSuccess ? 'تم الحفظ!' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Errors & Warnings */}
            {(errors.length > 0 || warnings.length > 0) && (
              <div className="space-y-3">
                {errors.map((error, i) => (
                  <div
                    key={i}
                    className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span><strong>{error.field}:</strong> {error.message}</span>
                  </div>
                ))}
                {warnings.map((warning, i) => (
                  <div
                    key={i}
                    className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3 text-yellow-700"
                  >
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <span><strong>{warning.field}:</strong> {warning.message}</span>
                      {warning.suggestion && (
                        <p className="text-sm text-yellow-600 mt-1">{warning.suggestion}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Form sections */}
            {sections.map(({ key, title, icon: Icon }) => {
              const isExpanded = expandedSections.includes(key);

              return (
                <div key={key} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-[#1E3A5F]" />
                      <span className="font-bold text-gray-800">{title}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  {isExpanded && (
                    <div className="p-6 border-t space-y-4">
                      {/* Identity Section */}
                      {key === 'identity' && (
                        <>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                الرقم التعريفي
                              </label>
                              <input
                                type="text"
                                value={formData.id || ''}
                                disabled
                                className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                الاسم الأول <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={formData.firstName || ''}
                                onChange={(e) => updateField('firstName', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent ${
                                  changedFields.includes('firstName') ? 'border-yellow-400 bg-yellow-50' : ''
                                }`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              الجنس <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-4">
                              {(['Male', 'Female'] as const).map(gender => (
                                <label
                                  key={gender}
                                  className={`flex-1 p-3 border rounded-lg cursor-pointer transition-colors ${
                                    formData.gender === gender
                                      ? gender === 'Male'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-pink-500 bg-pink-50'
                                      : 'hover:bg-gray-50'
                                  } ${changedFields.includes('gender') ? 'ring-2 ring-yellow-400' : ''}`}
                                >
                                  <input
                                    type="radio"
                                    name="gender"
                                    value={gender}
                                    checked={formData.gender === gender}
                                    onChange={(e) => updateField('gender', e.target.value)}
                                    className="sr-only"
                                  />
                                  <span className="font-medium">
                                    {gender === 'Male' ? 'ذكر' : 'أنثى'}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                الاسم الكامل (عربي)
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={formData.fullNameAr || ''}
                                  onChange={(e) => updateField('fullNameAr', e.target.value)}
                                  className={`flex-1 px-4 py-2 border rounded-lg ${
                                    changedFields.includes('fullNameAr') ? 'border-yellow-400 bg-yellow-50' : ''
                                  }`}
                                />
                                <button
                                  onClick={regenerateFullName}
                                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                  title="إنشاء تلقائي"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                الاسم الكامل (إنجليزي)
                              </label>
                              <input
                                type="text"
                                value={formData.fullNameEn || ''}
                                onChange={(e) => updateField('fullNameEn', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg ${
                                  changedFields.includes('fullNameEn') ? 'border-yellow-400 bg-yellow-50' : ''
                                }`}
                                dir="ltr"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Family Section */}
                      {key === 'family' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              الأب
                            </label>
                            <select
                              value={formData.fatherId || ''}
                              onChange={(e) => handleParentChange(e.target.value || null)}
                              className={`w-full px-4 py-2 border rounded-lg ${
                                changedFields.includes('fatherId') ? 'border-yellow-400 bg-yellow-50' : ''
                              }`}
                            >
                              <option value="">بدون أب (جذر)</option>
                              {potentialFathers.map(father => (
                                <option key={father.id} value={father.id}>
                                  {father.fullNameAr || father.firstName} ({father.id}) - الجيل {father.generation}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                الجيل
                              </label>
                              <input
                                type="number"
                                value={formData.generation || 1}
                                onChange={(e) => updateField('generation', parseInt(e.target.value))}
                                min={1}
                                max={20}
                                className={`w-full px-4 py-2 border rounded-lg ${
                                  changedFields.includes('generation') ? 'border-yellow-400 bg-yellow-50' : ''
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                الفرع
                              </label>
                              <input
                                type="text"
                                value={formData.branch || ''}
                                onChange={(e) => updateField('branch', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg ${
                                  changedFields.includes('branch') ? 'border-yellow-400 bg-yellow-50' : ''
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                اسم العائلة
                              </label>
                              <input
                                type="text"
                                value={formData.familyName || 'آل شايع'}
                                onChange={(e) => updateField('familyName', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg ${
                                  changedFields.includes('familyName') ? 'border-yellow-400 bg-yellow-50' : ''
                                }`}
                              />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                عدد الأبناء
                              </label>
                              <input
                                type="number"
                                value={formData.sonsCount || 0}
                                onChange={(e) => updateField('sonsCount', parseInt(e.target.value))}
                                min={0}
                                className={`w-full px-4 py-2 border rounded-lg ${
                                  changedFields.includes('sonsCount') ? 'border-yellow-400 bg-yellow-50' : ''
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                عدد البنات
                              </label>
                              <input
                                type="number"
                                value={formData.daughtersCount || 0}
                                onChange={(e) => updateField('daughtersCount', parseInt(e.target.value))}
                                min={0}
                                className={`w-full px-4 py-2 border rounded-lg ${
                                  changedFields.includes('daughtersCount') ? 'border-yellow-400 bg-yellow-50' : ''
                                }`}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Personal Section */}
                      {key === 'personal' && (
                        <>
                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                سنة الميلاد
                              </label>
                              <input
                                type="number"
                                value={formData.birthYear || ''}
                                onChange={(e) => updateField('birthYear', e.target.value ? parseInt(e.target.value) : null)}
                                className={`w-full px-4 py-2 border rounded-lg ${
                                  changedFields.includes('birthYear') ? 'border-yellow-400 bg-yellow-50' : ''
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                سنة الوفاة
                              </label>
                              <input
                                type="number"
                                value={formData.deathYear || ''}
                                onChange={(e) => updateField('deathYear', e.target.value ? parseInt(e.target.value) : null)}
                                className={`w-full px-4 py-2 border rounded-lg ${
                                  changedFields.includes('deathYear') ? 'border-yellow-400 bg-yellow-50' : ''
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                الحالة
                              </label>
                              <select
                                value={formData.status || 'Living'}
                                onChange={(e) => updateField('status', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg ${
                                  changedFields.includes('status') ? 'border-yellow-400 bg-yellow-50' : ''
                                }`}
                              >
                                <option value="Living">على قيد الحياة</option>
                                <option value="Deceased">متوفى</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              المهنة
                            </label>
                            <input
                              type="text"
                              value={formData.occupation || ''}
                              onChange={(e) => updateField('occupation', e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg ${
                                changedFields.includes('occupation') ? 'border-yellow-400 bg-yellow-50' : ''
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              السيرة
                            </label>
                            <textarea
                              value={formData.biography || ''}
                              onChange={(e) => updateField('biography', e.target.value)}
                              rows={4}
                              className={`w-full px-4 py-2 border rounded-lg ${
                                changedFields.includes('biography') ? 'border-yellow-400 bg-yellow-50' : ''
                              }`}
                            />
                          </div>
                        </>
                      )}

                      {/* Contact Section */}
                      {key === 'contact' && (
                        <>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                الهاتف
                              </label>
                              <input
                                type="tel"
                                value={formData.phone || ''}
                                onChange={(e) => updateField('phone', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg ${
                                  changedFields.includes('phone') ? 'border-yellow-400 bg-yellow-50' : ''
                                }`}
                                dir="ltr"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                البريد الإلكتروني
                              </label>
                              <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => updateField('email', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg ${
                                  changedFields.includes('email') ? 'border-yellow-400 bg-yellow-50' : ''
                                }`}
                                dir="ltr"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              المدينة
                            </label>
                            <input
                              type="text"
                              value={formData.city || ''}
                              onChange={(e) => updateField('city', e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg ${
                                changedFields.includes('city') ? 'border-yellow-400 bg-yellow-50' : ''
                              }`}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Change reason */}
            {changedFields.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  سبب التعديل (اختياري)
                </label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="أدخل سبب التعديل للتوثيق..."
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                معاينة
              </h3>
              <div className={`p-4 rounded-lg border-r-4 ${
                formData.gender === 'Male' ? 'border-blue-500 bg-blue-50' : 'border-pink-500 bg-pink-50'
              }`}>
                <div className="font-bold text-lg mb-2">
                  {formData.fullNameAr || formData.firstName || 'بدون اسم'}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>الرقم: {formData.id}</div>
                  <div>الجيل: {formData.generation}</div>
                  <div>الفرع: {formData.branch || '-'}</div>
                  <div>الحالة: {formData.status === 'Living' ? 'حي' : 'متوفى'}</div>
                </div>
              </div>
            </div>

            {/* Changed fields summary */}
            {changedFields.length > 0 && (
              <div className="bg-yellow-50 rounded-xl shadow-sm p-6 border border-yellow-200">
                <h3 className="font-bold text-yellow-800 mb-4 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  التغييرات ({changedFields.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {changedFields.map(field => {
                    const originalRecord = originalMember as unknown as Record<string, unknown>;
                    const formRecord = formData as unknown as Record<string, unknown>;
                    return (
                      <div key={field} className="text-sm">
                        <span className="font-medium text-gray-700">{field}:</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-red-600 line-through">
                            {String(originalRecord[field] ?? '-')}
                          </span>
                          <span>→</span>
                          <span className="text-green-600">
                            {String(formRecord[field] ?? '-')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cascade updates preview */}
            {cascadeUpdates.length > 0 && (
              <div className="bg-blue-50 rounded-xl shadow-sm p-6 border border-blue-200">
                <button
                  onClick={() => setShowCascadePreview(!showCascadePreview)}
                  className="w-full flex items-center justify-between"
                >
                  <h3 className="font-bold text-blue-800 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    تحديثات متتالية ({cascadeUpdates.length})
                  </h3>
                  {showCascadePreview ? <ChevronUp /> : <ChevronDown />}
                </button>
                {showCascadePreview && (
                  <div className="mt-4 space-y-2 max-h-40 overflow-auto">
                    {cascadeUpdates.map((update, i) => {
                      const member = familyMembers.find(m => m.id === update.memberId);
                      return (
                        <div key={i} className="text-sm bg-white p-2 rounded-lg">
                          <span className="font-medium">{member?.firstName || update.memberId}</span>
                          <p className="text-xs text-gray-500">{update.reason}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
