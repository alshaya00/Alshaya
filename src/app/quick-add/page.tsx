'use client';

import { useState, useEffect } from 'react';
import { FamilyMember } from '@/lib/data';
import SearchableDropdown from '@/components/SearchableDropdown';
import AddMemberGraph from '@/components/AddMemberGraph';
import {
  PlusCircle,
  Check,
  User,
  Calendar,
  MapPin,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  FileText,
  Eye,
  Save,
  RotateCcw,
  GitBranch,
  List,
} from 'lucide-react';

interface NewMemberData {
  firstName: string;
  fatherId: string;
  gender: 'Male' | 'Female';
  birthYear: string;
  city: string;
  occupation: string;
  phone: string;
  email: string;
  biography: string;
}

interface AutoFillData {
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  generation: number;
  branch: string | null;
  fullNamePreview: string;
}

const STORAGE_KEY = 'alshaye_new_members';

export default function QuickAddPage() {
  const [step, setStep] = useState(1);
  const [fathers, setFathers] = useState<FamilyMember[]>([]);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [autoFillData, setAutoFillData] = useState<AutoFillData | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string>('');
  const [savedMembers, setSavedMembers] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'dropdown' | 'graph'>('graph');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitWarning, setSubmitWarning] = useState<string | null>(null);

  const [formData, setFormData] = useState<NewMemberData>({
    firstName: '',
    fatherId: '',
    gender: 'Male',
    birthYear: '',
    city: '',
    occupation: '',
    phone: '',
    email: '',
    biography: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof NewMemberData, string>>>({});

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch all members from API
        const res = await fetch('/api/members?limit=500');
        const data = await res.json();
        const members = data.data || [];

        setAllMembers(members);
        setFathers(members.filter((m: FamilyMember) => m.gender === 'Male'));

        // Generate next ID based on max existing ID
        if (members.length > 0) {
          const maxId = Math.max(...members.map((m: FamilyMember) => parseInt(m.id.replace('P', ''))));
          setNewMemberId(`P${String(maxId + 1).padStart(3, '0')}`);
        } else {
          setNewMemberId('P001');
        }
      } catch (error) {
        console.error('Error loading members:', error);
      }
    };
    loadData();

    // Load saved members count from local storage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const members = JSON.parse(saved);
      setSavedMembers(members.length);
    }
  }, []);

  // Auto-fill data when father or name changes
  useEffect(() => {
    if (formData.fatherId && formData.firstName) {
      const father = fathers.find((f) => f.id === formData.fatherId);
      if (father) {
        const connector = formData.gender === 'Male' ? 'بن' : 'بنت';
        setAutoFillData({
          fatherName: father.firstName,
          grandfatherName: father.fatherName,
          greatGrandfatherName: father.grandfatherName,
          generation: father.generation + 1,
          branch: father.branch,
          fullNamePreview: `${formData.firstName} ${connector} ${father.firstName} ${
            father.fatherName ? `${connector} ${father.fatherName}` : ''
          } آل شايع`,
        });
      }
    } else if (formData.firstName) {
      setAutoFillData({
        fatherName: null,
        grandfatherName: null,
        greatGrandfatherName: null,
        generation: 1,
        branch: 'الأصل',
        fullNamePreview: `${formData.firstName} آل شايع`,
      });
    } else {
      setAutoFillData(null);
    }
  }, [formData.fatherId, formData.firstName, formData.gender, fathers]);

  const updateField = (field: keyof NewMemberData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (stepNum: number): boolean => {
    const newErrors: Partial<Record<keyof NewMemberData, string>> = {};

    if (stepNum === 1) {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'الاسم الأول مطلوب';
      }
    }

    if (stepNum === 3) {
      if (formData.birthYear) {
        const year = parseInt(formData.birthYear);
        if (isNaN(year) || year < 1500 || year > new Date().getFullYear()) {
          newErrors.birthYear = 'سنة الميلاد غير صحيحة';
        }
      }
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'البريد الإلكتروني غير صحيح';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitWarning(null);

    // Create new member object
    const newMember = {
      id: newMemberId,
      firstName: formData.firstName,
      fatherId: formData.fatherId || null,
      gender: formData.gender,
      birthYear: formData.birthYear ? parseInt(formData.birthYear) : null,
      city: formData.city || null,
      occupation: formData.occupation || null,
      phone: formData.phone || null,
      email: formData.email || null,
      biography: formData.biography || null,
      fatherName: autoFillData?.fatherName || null,
      grandfatherName: autoFillData?.grandfatherName || null,
      greatGrandfatherName: autoFillData?.greatGrandfatherName || null,
      generation: autoFillData?.generation || 1,
      branch: autoFillData?.branch || 'الأصل',
      fullNameAr: autoFillData?.fullNamePreview || `${formData.firstName} آل شايع`,
      familyName: 'آل شايع',
      status: 'Living',
      sonsCount: 0,
      daughtersCount: 0,
    };

    try {
      // Call the API to persist the member
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMember),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create member');
      }

      // Also save to local storage as backup
      const saved = localStorage.getItem(STORAGE_KEY);
      const members = saved ? JSON.parse(saved) : [];
      members.push({ ...newMember, apiSaved: true, savedAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));

      console.log('New member saved:', result.data);

      // Check if there's a warning (database unavailable)
      if (result.warning) {
        setSubmitWarning(result.warning);
      }

      setSubmitted(true);
      setSavedMembers(members.length);

      setTimeout(() => {
        setSubmitted(false);
        setSubmitWarning(null);
        setFormData({
          firstName: '',
          fatherId: '',
          gender: 'Male',
          birthYear: '',
          city: '',
          occupation: '',
          phone: '',
          email: '',
          biography: '',
        });
        setStep(1);
        setNewMemberId(getNextId());
      }, 3000);
    } catch (error) {
      console.error('Error saving member:', error);
      setSubmitError(error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ العضو');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      fatherId: '',
      gender: 'Male',
      birthYear: '',
      city: '',
      occupation: '',
      phone: '',
      email: '',
      biography: '',
    });
    setStep(1);
    setErrors({});
  };

  // Handle father selection from graph
  const handleGraphFatherSelect = (member: FamilyMember | null) => {
    updateField('fatherId', member?.id || '');
  };

  const steps = [
    { num: 1, title: 'الهوية', icon: User },
    { num: 2, title: 'النسب', icon: User },
    { num: 3, title: 'التفاصيل', icon: FileText },
    { num: 4, title: 'المراجعة', icon: Eye },
  ];

  return (
    <div className="min-h-screen py-8 bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4 shadow-lg">
            <PlusCircle className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">إضافة عضو جديد</h1>
          <p className="text-gray-600 mt-2">Add New Family Member</p>
          {savedMembers > 0 && (
            <p className="text-sm text-green-600 mt-2">
              ✓ تم حفظ {savedMembers} عضو جديد محلياً
            </p>
          )}
        </div>

        {/* Success Message */}
        {submitted && (
          <div className="bg-green-100 border-2 border-green-400 text-green-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3 animate-pulse">
            <Check className="text-green-600" size={24} />
            <div>
              <p className="font-bold">تمت الإضافة بنجاح!</p>
              <p className="text-sm">تم حفظ العضو الجديد في قاعدة البيانات</p>
            </div>
          </div>
        )}

        {/* Warning Message (database unavailable) */}
        {submitWarning && (
          <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold">تنبيه</p>
              <p className="text-sm">تم حفظ العضو محلياً فقط - قاعدة البيانات غير متاحة</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <p className="font-bold">خطأ في الحفظ</p>
              <p className="text-sm">{submitError}</p>
            </div>
          </div>
        )}

        {/* Step Progress */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          {/* Mobile Step Indicator */}
          <div className="sm:hidden mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">الخطوة {step} من {steps.length}</span>
              <span className="text-sm font-bold text-green-600">{steps[step - 1].title}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500 rounded-full"
                style={{ width: `${(step / steps.length) * 100}%` }}
                role="progressbar"
                aria-valuenow={step}
                aria-valuemin={1}
                aria-valuemax={steps.length}
                aria-label={`الخطوة ${step} من ${steps.length}`}
              />
            </div>
            <div className="flex justify-between mt-2">
              {steps.map((s) => (
                <div
                  key={s.num}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    s.num < step
                      ? 'bg-green-500 text-white'
                      : s.num === step
                      ? 'bg-green-500 text-white ring-2 ring-green-200'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {s.num < step ? <Check size={14} /> : s.num}
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Step Indicator */}
          <div className="hidden sm:flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 mx-12 z-0">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {steps.map((s) => (
              <button
                key={s.num}
                onClick={() => s.num < step && setStep(s.num)}
                aria-label={`${s.title} - الخطوة ${s.num}`}
                aria-current={s.num === step ? 'step' : undefined}
                className={`relative z-10 flex flex-col items-center gap-2 transition-all duration-300 ${
                  s.num < step ? 'cursor-pointer' : s.num === step ? '' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    s.num < step
                      ? 'bg-green-500 text-white'
                      : s.num === step
                      ? 'bg-green-500 text-white ring-4 ring-green-200 scale-110'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {s.num < step ? <Check size={20} aria-hidden="true" /> : <s.icon size={20} aria-hidden="true" />}
                </div>
                <span
                  className={`text-sm font-medium ${
                    s.num <= step ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {s.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Step Header */}
          <div className="bg-gradient-to-l from-green-500 to-green-600 px-6 py-4 text-white">
            <h2 className="text-xl font-bold">
              الخطوة {step}: {steps[step - 1].title}
            </h2>
            <p className="text-green-100 text-sm">
              {step === 1 && 'أدخل الاسم الأول والجنس'}
              {step === 2 && 'اختر الأب من شجرة العائلة'}
              {step === 3 && 'أضف تفاصيل إضافية (اختياري)'}
              {step === 4 && 'راجع البيانات قبل الحفظ'}
            </p>
          </div>

          <div className="p-6">
            {/* Step 1: Identity */}
            {step === 1 && (
              <div className="space-y-6">
                {/* New ID Display */}
                <div className="bg-gradient-to-l from-green-100 to-green-50 rounded-xl p-4 text-center border border-green-200">
                  <p className="text-sm text-gray-500">رقم التعريف الجديد</p>
                  <p className="text-3xl font-bold text-green-600">{newMemberId}</p>
                </div>

                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                    <User size={18} aria-hidden="true" />
                    الاسم الأول <span className="text-red-500" aria-hidden="true">*</span>
                    <span className="sr-only">(مطلوب)</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-lg bg-yellow-50 focus:bg-yellow-100 focus:outline-none transition-all ${
                      errors.firstName ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-500'
                    }`}
                    placeholder="أدخل الاسم الأول فقط..."
                    dir="rtl"
                    aria-required="true"
                    aria-invalid={!!errors.firstName}
                    aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                  />
                  {errors.firstName && (
                    <p id="firstName-error" className="text-red-500 text-sm mt-1" role="alert">{errors.firstName}</p>
                  )}
                </div>

                {/* Gender */}
                <fieldset>
                  <legend className="font-bold text-gray-700 mb-3">الجنس <span className="text-red-500" aria-hidden="true">*</span></legend>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => updateField('gender', 'Male')}
                      aria-pressed={formData.gender === 'Male'}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                        formData.gender === 'Male'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="text-3xl" role="img" aria-label="ذكر">👨</span>
                      <span className="font-semibold">ذكر / Male</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('gender', 'Female')}
                      aria-pressed={formData.gender === 'Female'}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                        formData.gender === 'Female'
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-200 hover:border-pink-300'
                      }`}
                    >
                      <span className="text-3xl" role="img" aria-label="أنثى">👩</span>
                      <span className="font-semibold">أنثى / Female</span>
                    </button>
                  </div>
                </fieldset>
              </div>
            )}

            {/* Step 2: Lineage */}
            {step === 2 && (
              <div className="space-y-6">
                {/* View Mode Toggle */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <label className="flex items-center gap-2 font-bold text-gray-700">
                    <User size={18} />
                    اختر الأب من شجرة العائلة
                  </label>
                  <div className="flex items-center gap-1 bg-white rounded-lg p-1 border shadow-sm">
                    <button
                      type="button"
                      onClick={() => setViewMode('graph')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'graph'
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <GitBranch size={16} />
                      الشجرة
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('dropdown')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'dropdown'
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <List size={16} />
                      القائمة
                    </button>
                  </div>
                </div>

                {/* Graph View */}
                {viewMode === 'graph' && (
                  <div className="space-y-4">
                    <AddMemberGraph
                      members={allMembers}
                      selectedFatherId={formData.fatherId || null}
                      onSelectFather={handleGraphFatherSelect}
                      newMemberPreview={formData.firstName ? {
                        firstName: formData.firstName,
                        gender: formData.gender
                      } : null}
                    />
                    {formData.fatherId && (
                      <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-xl py-3">
                        <Check size={20} />
                        <span className="font-medium">
                          تم اختيار: {fathers.find(f => f.id === formData.fatherId)?.firstName || formData.fatherId}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateField('fatherId', '')}
                          className="text-gray-400 hover:text-red-500 mr-2"
                          title="إلغاء الاختيار"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {!formData.fatherId && (
                      <p className="text-center text-gray-500 text-sm">
                        انقر على أي ذكر في الشجرة لاختياره كأب للعضو الجديد
                      </p>
                    )}
                  </div>
                )}

                {/* Dropdown View */}
                {viewMode === 'dropdown' && (
                  <SearchableDropdown
                    options={fathers}
                    value={formData.fatherId}
                    onChange={(value) => updateField('fatherId', value)}
                    placeholder="ابحث واختر الأب..."
                    allowEmpty={true}
                    emptyLabel="-- إضافة كجذر جديد (بدون أب) --"
                  />
                )}

                {/* Auto-filled Data Preview */}
                {autoFillData && (
                  <div className="bg-blue-50 rounded-xl p-5 border-2 border-blue-200">
                    <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                      <span className="text-xl">🔄</span>
                      البيانات المُحسوبة تلقائياً
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-gray-500 text-sm">اسم الأب</span>
                        <p className="font-bold text-lg">{autoFillData.fatherName || '—'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-gray-500 text-sm">اسم الجد</span>
                        <p className="font-bold text-lg">{autoFillData.grandfatherName || '—'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-gray-500 text-sm">الجيل</span>
                        <p className="font-bold text-lg text-green-600">الجيل {autoFillData.generation}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-gray-500 text-sm">الفرع</span>
                        <p className="font-bold text-lg">{autoFillData.branch || '—'}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <span className="text-gray-500 text-sm">الاسم الكامل</span>
                      <p className="font-bold text-xl text-blue-900">{autoFillData.fullNamePreview}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Details */}
            {step === 3 && (
              <div className="space-y-5">
                <p className="text-gray-500 text-center mb-4">
                  جميع الحقول اختيارية - يمكنك تخطي هذه الخطوة
                </p>

                {/* Birth Year */}
                <div>
                  <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                    <Calendar size={18} />
                    سنة الميلاد
                  </label>
                  <input
                    type="number"
                    value={formData.birthYear}
                    onChange={(e) => updateField('birthYear', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all ${
                      errors.birthYear ? 'border-red-400' : 'border-gray-200 focus:border-green-500'
                    }`}
                    placeholder="مثال: 1990"
                  />
                  {errors.birthYear && (
                    <p className="text-red-500 text-sm mt-1">{errors.birthYear}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* City */}
                  <div>
                    <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                      <MapPin size={18} />
                      المدينة
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all"
                      placeholder="الرياض، جدة..."
                    />
                  </div>

                  {/* Occupation */}
                  <div>
                    <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                      <Briefcase size={18} />
                      المهنة
                    </label>
                    <input
                      type="text"
                      value={formData.occupation}
                      onChange={(e) => updateField('occupation', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all"
                      placeholder="مهندس، طبيب..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Phone */}
                  <div>
                    <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                      <Phone size={18} />
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all"
                      placeholder="+966..."
                      dir="ltr"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                      <Mail size={18} />
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all ${
                        errors.email ? 'border-red-400' : 'border-gray-200 focus:border-green-500'
                      }`}
                      placeholder="email@example.com"
                      dir="ltr"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Biography */}
                <div>
                  <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                    <FileText size={18} />
                    نبذة مختصرة
                  </label>
                  <textarea
                    value={formData.biography}
                    onChange={(e) => updateField('biography', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all resize-none"
                    rows={3}
                    placeholder="أضف نبذة عن العضو..."
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Preview Card */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
                      formData.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
                    }`}>
                      {formData.gender === 'Male' ? '👨' : '👩'}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">رقم التعريف: {newMemberId}</p>
                      <h3 className="text-xl font-bold text-gray-800">
                        {autoFillData?.fullNamePreview || formData.firstName + ' آل شايع'}
                      </h3>
                      <p className="text-green-600">
                        الجيل {autoFillData?.generation || 1} • {autoFillData?.branch || 'الأصل'}
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="text-gray-400" size={16} />
                      <span className="text-gray-500">الجنس:</span>
                      <span className="font-semibold">{formData.gender === 'Male' ? 'ذكر' : 'أنثى'}</span>
                    </div>

                    {formData.birthYear && (
                      <div className="flex items-center gap-2">
                        <Calendar className="text-gray-400" size={16} />
                        <span className="text-gray-500">الميلاد:</span>
                        <span className="font-semibold">{formData.birthYear}</span>
                      </div>
                    )}

                    {formData.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="text-gray-400" size={16} />
                        <span className="text-gray-500">المدينة:</span>
                        <span className="font-semibold">{formData.city}</span>
                      </div>
                    )}

                    {formData.occupation && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="text-gray-400" size={16} />
                        <span className="text-gray-500">المهنة:</span>
                        <span className="font-semibold">{formData.occupation}</span>
                      </div>
                    )}

                    {formData.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="text-gray-400" size={16} />
                        <span className="text-gray-500">الهاتف:</span>
                        <span className="font-semibold" dir="ltr">{formData.phone}</span>
                      </div>
                    )}

                    {formData.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="text-gray-400" size={16} />
                        <span className="text-gray-500">البريد:</span>
                        <span className="font-semibold" dir="ltr">{formData.email}</span>
                      </div>
                    )}
                  </div>

                  {formData.biography && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-gray-500 text-sm mb-1">نبذة:</p>
                      <p className="text-gray-700">{formData.biography}</p>
                    </div>
                  )}
                </div>

                {/* Lineage Info */}
                {autoFillData && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <h4 className="font-bold text-green-800 mb-2">سلسلة النسب</h4>
                    <p className="text-green-700">
                      {formData.firstName}
                      {autoFillData.fatherName && <span> ← {autoFillData.fatherName}</span>}
                      {autoFillData.grandfatherName && <span> ← {autoFillData.grandfatherName}</span>}
                      {autoFillData.greatGrandfatherName && <span> ← {autoFillData.greatGrandfatherName}</span>}
                      <span> ← آل شايع</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <ChevronRight size={20} />
                  السابق
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center gap-2 px-6 py-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <RotateCcw size={18} />
                  إعادة تعيين
                </button>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-l from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  التالي
                  <ChevronLeft size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-8 py-3 font-bold rounded-xl transition-all shadow-md ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-l from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-lg'
                  } text-white`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      حفظ العضو
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-yellow-50 rounded-xl p-6 border border-yellow-200">
          <h3 className="font-bold text-yellow-800 mb-3">💡 نصائح للإضافة</h3>
          <ul className="space-y-2 text-sm text-yellow-700">
            <li>• استخدم البحث في خطوة النسب للعثور على الأب بسرعة</li>
            <li>• الحقول الاختيارية يمكن تعبئتها لاحقاً من صفحة العضو</li>
            <li>• البيانات تُحفظ محلياً في المتصفح حتى يتم ربط قاعدة البيانات</li>
            <li>• يمكنك العودة للخطوات السابقة لتعديل البيانات</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
