'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { FamilyMember } from '@/lib/types';
import { MatchCandidate } from '@/lib/matching';
import SearchableDropdown from '@/components/SearchableDropdown';
import AddMemberGraph from '@/components/AddMemberGraph';
import { storageKeys } from '@/config/storage-keys';
import { paginationSettings, dbSettings } from '@/config/constants';
import { MatchConfirmation, MatchComparisonGraphs } from '@/components/quick-add';
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
  Search,
  AlertCircle,
  Loader2,
  TreeDeciduous,
  Clock,
} from 'lucide-react';
import { useNameMatch, useSubmitPendingMember } from '@/lib/hooks/useQueries';

interface NewMemberData {
  firstName: string;
  fatherName: string;
  grandfatherName: string;
  greatGrandfatherName: string;
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
  lineagePath: string[];
}

type MatchingState = 'idle' | 'searching' | 'found' | 'multiple' | 'no_match' | 'manual';

const STORAGE_KEY = storageKeys.newMembers;

export default function QuickAddPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [autoFillData, setAutoFillData] = useState<AutoFillData | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string>('');
  const [savedMembers, setSavedMembers] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [prefilledFromLink, setPrefilledFromLink] = useState(false);

  // Matching state
  const [matchingState, setMatchingState] = useState<MatchingState>('idle');
  const [matchResults, setMatchResults] = useState<MatchCandidate[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchCandidate | null>(null);

  const nameMatch = useNameMatch();
  const submitPending = useSubmitPendingMember();

  const [formData, setFormData] = useState<NewMemberData>({
    firstName: '',
    fatherName: '',
    grandfatherName: '',
    greatGrandfatherName: '',
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
        const res = await fetch(`/api/members?limit=${paginationSettings.defaultFetchLimit}`);
        const data = await res.json();
        const members = data.data || [];
        setAllMembers(members);

        if (members.length > 0) {
          const maxId = Math.max(...members.map((m: FamilyMember) => parseInt(m.id.replace(dbSettings.idPrefix, ''))));
          setNewMemberId(`${dbSettings.idPrefix}${String(maxId + 1).padStart(dbSettings.idPadding, '0')}`);
        } else {
          setNewMemberId(`${dbSettings.idPrefix}${'1'.padStart(dbSettings.idPadding, '0')}`);
        }
      } catch (error) {
        console.error('Error loading members:', error);
      }
    };
    loadData();

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const members = JSON.parse(saved);
      setSavedMembers(members.length);
    }
  }, []);

  // Handle URL parameters for pre-filled links
  useEffect(() => {
    const fatherId = searchParams.get('father');
    const branch = searchParams.get('branch');

    if (fatherId && allMembers.length > 0) {
      const father = allMembers.find(m => m.id === fatherId);
      if (father) {
        // Pre-fill with father from URL
        const connector = formData.gender === 'Male' ? 'بن' : 'بنت';
        setAutoFillData({
          fatherName: father.firstName,
          grandfatherName: father.fatherName,
          greatGrandfatherName: father.grandfatherName,
          generation: father.generation + 1,
          branch: father.branch || branch,
          fullNamePreview: `? ${connector} ${father.firstName} ${
            father.fatherName ? `${connector} ${father.fatherName}` : ''
          } آل شايع`,
          lineagePath: father.lineagePath || [],
        });
        setFormData(prev => ({ ...prev, fatherId }));
        setPrefilledFromLink(true);
        // Skip to step 1 (names) but mark matching as done
        setMatchingState('manual');
      }
    }
  }, [searchParams, allMembers, formData.gender]);

  // Update auto-fill data when match is selected
  useEffect(() => {
    if (selectedMatch) {
      const connector = formData.gender === 'Male' ? 'بن' : 'بنت';
      setAutoFillData({
        fatherName: selectedMatch.father.firstName,
        grandfatherName: selectedMatch.grandfather?.firstName || null,
        greatGrandfatherName: selectedMatch.greatGrandfather?.firstName || null,
        generation: selectedMatch.generation,
        branch: selectedMatch.branch,
        fullNamePreview: selectedMatch.fullNamePreview.replace(
          formData.firstName || '?',
          formData.firstName
        ),
        lineagePath: selectedMatch.lineagePath,
      });
      setFormData(prev => ({ ...prev, fatherId: selectedMatch.fatherId }));
    }
  }, [selectedMatch, formData.firstName, formData.gender]);

  const updateField = (field: keyof NewMemberData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      if (!formData.fatherName.trim()) {
        newErrors.fatherName = 'اسم الأب مطلوب';
      }
    }

    if (stepNum === 4) {
      // Birth year is required
      if (!formData.birthYear.trim()) {
        newErrors.birthYear = 'سنة الميلاد مطلوبة';
      } else {
        const year = parseInt(formData.birthYear);
        if (isNaN(year) || year < 1400 || year > new Date().getFullYear()) {
          newErrors.birthYear = 'سنة الميلاد غير صحيحة (يجب أن تكون بين 1400 والسنة الحالية)';
        }
      }
      // Phone is required
      if (!formData.phone.trim()) {
        newErrors.phone = 'رقم الجوال مطلوب';
      } else {
        // Validate phone format (Saudi format or international)
        const phoneClean = formData.phone.replace(/[\s\-\(\)]/g, '');
        if (!/^\+?\d{8,15}$/.test(phoneClean)) {
          newErrors.phone = 'رقم الجوال غير صحيح';
        }
      }
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'البريد الإلكتروني غير صحيح';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = useCallback(async () => {
    if (!validateStep(1)) return;

    setStep(2); // Move to step 2 to show matching results
    setMatchingState('searching');
    setMatchResults([]);
    setSelectedMatch(null);

    try {
      const result = await nameMatch.mutateAsync({
        firstName: formData.firstName,
        fatherName: formData.fatherName,
        grandfatherName: formData.grandfatherName || undefined,
        greatGrandfatherName: formData.greatGrandfatherName || undefined,
      });

      if (result.success && result.data) {
        const allMatches = result.data.allMatches || [];
        setMatchResults(allMatches);

        if (allMatches.length === 0) {
          setMatchingState('no_match');
        } else if (allMatches.length === 1 && allMatches[0].matchScore >= 80) {
          setSelectedMatch(allMatches[0]);
          setMatchingState('found');
        } else {
          setMatchingState('multiple');
        }
      } else {
        setMatchingState('no_match');
      }
    } catch (error) {
      console.error('Matching error:', error);
      setMatchingState('no_match');
    }
  }, [formData.firstName, formData.fatherName, formData.grandfatherName, formData.greatGrandfatherName, nameMatch]);

  const handleSelectMatch = (candidate: MatchCandidate) => {
    setSelectedMatch(candidate);
    setMatchingState('found');
  };

  const handleConfirmMatch = () => {
    if (selectedMatch) {
      setStep(3); // Go to gender step
    }
  };

  const handleManualSelect = () => {
    setMatchingState('manual');
  };

  const handleGraphFatherSelect = (member: FamilyMember | null) => {
    if (member) {
      // Build manual match from selected father
      const connector = formData.gender === 'Male' ? 'بن' : 'بنت';
      setAutoFillData({
        fatherName: member.firstName,
        grandfatherName: member.fatherName,
        greatGrandfatherName: member.grandfatherName,
        generation: member.generation + 1,
        branch: member.branch,
        fullNamePreview: `${formData.firstName} ${connector} ${member.firstName} ${
          member.fatherName ? `${connector} ${member.fatherName}` : ''
        } آل شايع`,
        lineagePath: member.lineagePath || [],
      });
      setFormData(prev => ({ ...prev, fatherId: member.id }));
    } else {
      setAutoFillData(null);
      setFormData(prev => ({ ...prev, fatherId: '' }));
    }
  };

  const nextStep = () => {
    if (step === 1) {
      handleSearch();
      return;
    }
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    if (step === 2 && matchingState !== 'manual') {
      setMatchingState('idle');
      setMatchResults([]);
      setSelectedMatch(null);
    }
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    if (!formData.fatherId && !autoFillData) {
      setSubmitError('يجب اختيار الأب أولاً');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const pendingMember = {
      firstName: formData.firstName,
      fatherName: autoFillData?.fatherName || formData.fatherName || undefined,
      grandfatherName: autoFillData?.grandfatherName || formData.grandfatherName || undefined,
      greatGrandfatherName: autoFillData?.greatGrandfatherName || formData.greatGrandfatherName || undefined,
      familyName: 'آل شايع',
      proposedFatherId: formData.fatherId,
      gender: formData.gender,
      birthYear: formData.birthYear ? parseInt(formData.birthYear) : undefined,
      generation: autoFillData?.generation || 1,
      branch: autoFillData?.branch || undefined,
      fullNameAr: autoFillData?.fullNamePreview || `${formData.firstName} آل شايع`,
      phone: formData.phone || undefined,
      city: formData.city || undefined,
      occupation: formData.occupation || undefined,
      email: formData.email || undefined,
    };

    try {
      // Submit to pending members for admin approval
      await submitPending.mutateAsync(pendingMember);

      // Also save to local storage as backup
      const saved = localStorage.getItem(STORAGE_KEY);
      const members = saved ? JSON.parse(saved) : [];
      members.push({ ...pendingMember, id: newMemberId, status: 'PENDING', savedAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));

      setSubmitted(true);
      setSavedMembers(members.length);

      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          firstName: '',
          fatherName: '',
          grandfatherName: '',
          greatGrandfatherName: '',
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
        setMatchingState('idle');
        setMatchResults([]);
        setSelectedMatch(null);
        setAutoFillData(null);
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
      fatherName: '',
      grandfatherName: '',
      greatGrandfatherName: '',
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
    setMatchingState('idle');
    setMatchResults([]);
    setSelectedMatch(null);
    setAutoFillData(null);
  };

  const steps = [
    { num: 1, title: 'الأسماء', icon: User },
    { num: 2, title: 'المطابقة', icon: Search },
    { num: 3, title: 'الجنس', icon: User },
    { num: 4, title: 'التفاصيل', icon: FileText },
    { num: 5, title: 'المراجعة', icon: Eye },
  ];

  return (
    <div className="min-h-screen py-8 bg-gradient-to-b from-indigo-50 to-white">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full mb-4 shadow-lg">
            <PlusCircle className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">إضافة عضو جديد</h1>
          <p className="text-gray-600 mt-2">Quick Add with Smart Name Matching</p>
          {savedMembers > 0 && (
            <p className="text-sm text-indigo-600 mt-2">
              ✓ تم حفظ {savedMembers} عضو محلياً (في انتظار الموافقة)
            </p>
          )}
        </div>

        {/* Success Message */}
        {submitted && (
          <div className="bg-green-100 border-2 border-green-400 text-green-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <Clock className="text-green-600" size={24} />
            <div>
              <p className="font-bold">تم إرسال طلب الإضافة!</p>
              <p className="text-sm">سيتم مراجعة الطلب من قبل المسؤول وإعلامك بالنتيجة</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle size={24} />
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
              <span className="text-sm font-bold text-indigo-600">{steps[step - 1].title}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
                style={{ width: `${(step / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Desktop Step Indicator */}
          <div className="hidden sm:flex items-center justify-between relative">
            <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 mx-12 z-0">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {steps.map((s) => (
              <button
                key={s.num}
                onClick={() => s.num < step && setStep(s.num)}
                className={`relative z-10 flex flex-col items-center gap-2 transition-all duration-300 ${
                  s.num < step ? 'cursor-pointer' : s.num === step ? '' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    s.num < step
                      ? 'bg-indigo-500 text-white'
                      : s.num === step
                      ? 'bg-indigo-500 text-white ring-4 ring-indigo-200 scale-110'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {s.num < step ? <Check size={20} /> : <s.icon size={20} />}
                </div>
                <span
                  className={`text-sm font-medium ${
                    s.num <= step ? 'text-indigo-600' : 'text-gray-400'
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
          <div className="bg-gradient-to-l from-indigo-500 to-indigo-600 px-6 py-4 text-white">
            <h2 className="text-xl font-bold">
              الخطوة {step}: {steps[step - 1].title}
            </h2>
            <p className="text-indigo-100 text-sm">
              {step === 1 && 'أدخل اسمك واسم أبيك وجدك'}
              {step === 2 && 'تأكيد مكانك في شجرة العائلة'}
              {step === 3 && 'اختر الجنس'}
              {step === 4 && 'أضف تفاصيل إضافية (اختياري)'}
              {step === 5 && 'راجع البيانات قبل الإرسال للموافقة'}
            </p>
          </div>

          <div className="p-6">
            {/* Step 1: Names Input */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100">
                  <p className="text-sm text-gray-600 mb-1">رقم التعريف المتوقع</p>
                  <p className="text-2xl font-bold text-indigo-600">{newMemberId}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                      <User size={18} />
                      الاسم الأول <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl text-lg focus:outline-none transition-all ${
                        errors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-indigo-500 bg-amber-50'
                      }`}
                      placeholder="مثال: أحمد"
                      dir="rtl"
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                    )}
                  </div>

                  {/* Father Name */}
                  <div>
                    <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                      <User size={18} />
                      اسم الأب <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fatherName}
                      onChange={(e) => updateField('fatherName', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl text-lg focus:outline-none transition-all ${
                        errors.fatherName ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-indigo-500'
                      }`}
                      placeholder="مثال: محمد"
                      dir="rtl"
                    />
                    {errors.fatherName && (
                      <p className="text-red-500 text-sm mt-1">{errors.fatherName}</p>
                    )}
                  </div>

                  {/* Grandfather Name */}
                  <div>
                    <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                      <User size={18} />
                      اسم الجد
                      <span className="text-xs text-gray-400 font-normal">(يحسّن دقة البحث)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.grandfatherName}
                      onChange={(e) => updateField('grandfatherName', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder="مثال: حمد"
                      dir="rtl"
                    />
                  </div>

                  {/* Great-Grandfather Name */}
                  <div>
                    <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                      <User size={18} />
                      اسم جد الأب
                      <span className="text-xs text-gray-400 font-normal">(اختياري)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.greatGrandfatherName}
                      onChange={(e) => updateField('greatGrandfatherName', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder="مثال: شايع"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                    <AlertCircle size={18} />
                    ملاحظة مهمة
                  </h4>
                  <p className="text-sm text-amber-700">
                    لا تدخل اسم العائلة (آل شايع) - سيتم إضافته تلقائياً. كلما أدخلت أسماء أكثر، زادت دقة المطابقة.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Matching Results */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Searching State */}
                {matchingState === 'searching' && (
                  <div className="text-center py-12">
                    <Loader2 size={48} className="mx-auto text-indigo-500 animate-spin mb-4" />
                    <p className="text-gray-600 font-medium">جاري البحث عن تطابق...</p>
                    <p className="text-gray-400 text-sm mt-1">
                      نبحث عن &quot;{formData.firstName} بن {formData.fatherName}&quot;
                    </p>
                  </div>
                )}

                {/* Single Match Found */}
                {matchingState === 'found' && selectedMatch && (
                  <MatchConfirmation
                    candidate={selectedMatch}
                    newPersonName={formData.firstName}
                    newPersonGender={formData.gender}
                    onConfirm={handleConfirmMatch}
                    onSelectDifferent={() => setMatchingState('multiple')}
                    onManualSelect={handleManualSelect}
                  />
                )}

                {/* Multiple Matches */}
                {matchingState === 'multiple' && (
                  <MatchComparisonGraphs
                    candidates={matchResults}
                    newPersonName={formData.firstName}
                    newPersonGender={formData.gender}
                    selectedId={selectedMatch?.fatherId}
                    onSelect={handleSelectMatch}
                  />
                )}

                {/* No Match Found */}
                {matchingState === 'no_match' && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle size={40} className="text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">لم يتم العثور على تطابق</h3>
                    <p className="text-gray-600 mb-6">
                      لم نجد &quot;{formData.fatherName}&quot; في قاعدة البيانات. يمكنك البحث يدوياً في الشجرة.
                    </p>
                    <button
                      onClick={handleManualSelect}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <TreeDeciduous size={18} className="inline mr-2" />
                      التنقل في الشجرة يدوياً
                    </button>
                  </div>
                )}

                {/* Manual Selection */}
                {matchingState === 'manual' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <span className="font-medium text-gray-700">اختر الأب من الشجرة</span>
                      <button
                        onClick={() => setMatchingState(matchResults.length > 0 ? 'multiple' : 'no_match')}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        العودة للنتائج
                      </button>
                    </div>

                    <AddMemberGraph
                      members={allMembers}
                      selectedFatherId={formData.fatherId || null}
                      onSelectFather={handleGraphFatherSelect}
                      newMemberPreview={formData.firstName ? {
                        firstName: formData.firstName,
                        gender: formData.gender
                      } : null}
                    />

                    {formData.fatherId && autoFillData && (
                      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Check size={18} className="text-green-600" />
                          <span className="font-bold text-green-800">تم اختيار الأب</span>
                        </div>
                        <p className="text-green-700">{autoFillData.fullNamePreview}</p>
                        <p className="text-sm text-green-600 mt-1">
                          الجيل {autoFillData.generation} • {autoFillData.branch || 'الأصل'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Confirm button for multiple matches */}
                {matchingState === 'multiple' && selectedMatch && (
                  <div className="pt-4 border-t">
                    <button
                      onClick={handleConfirmMatch}
                      className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg"
                    >
                      <Check size={18} className="inline mr-2" />
                      تأكيد الاختيار والمتابعة
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Gender Selection */}
            {step === 3 && (
              <div className="space-y-6">
                {autoFillData && (
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 mb-6">
                    <p className="text-sm text-gray-500 mb-1">الاسم الكامل</p>
                    <p className="text-xl font-bold text-indigo-900">{autoFillData.fullNamePreview}</p>
                  </div>
                )}

                <fieldset>
                  <legend className="font-bold text-gray-700 mb-4 text-lg">اختر الجنس</legend>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => updateField('gender', 'Male')}
                      className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                        formData.gender === 'Male'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="text-5xl">👨</span>
                      <span className="font-bold text-lg">ذكر</span>
                      <span className="text-sm text-gray-500">Male</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('gender', 'Female')}
                      className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                        formData.gender === 'Female'
                          ? 'border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-200'
                          : 'border-gray-200 hover:border-pink-300'
                      }`}
                    >
                      <span className="text-5xl">👩</span>
                      <span className="font-bold text-lg">أنثى</span>
                      <span className="text-sm text-gray-500">Female</span>
                    </button>
                  </div>
                </fieldset>
              </div>
            )}

            {/* Step 4: Details */}
            {step === 4 && (
              <div className="space-y-5">
                <p className="text-gray-500 text-center mb-4">
                  الحقول المميزة بـ <span className="text-red-500">*</span> مطلوبة
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Birth Year - Required */}
                  <div>
                    <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                      <Calendar size={18} />
                      سنة الميلاد
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.birthYear}
                      onChange={(e) => updateField('birthYear', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all ${
                        errors.birthYear ? 'border-red-400' : 'border-gray-200 focus:border-indigo-500'
                      }`}
                      placeholder="مثال: 1990"
                      required
                    />
                    {errors.birthYear && (
                      <p className="text-red-500 text-sm mt-1">{errors.birthYear}</p>
                    )}
                  </div>

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
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
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
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder="مهندس، طبيب..."
                    />
                  </div>

                  {/* Phone - Required */}
                  <div>
                    <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                      <Phone size={18} />
                      رقم الجوال
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all ${
                        errors.phone ? 'border-red-400' : 'border-gray-200 focus:border-indigo-500'
                      }`}
                      placeholder="+966 أو 05xxxxxxxx"
                      dir="ltr"
                      required
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>
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
                      errors.email ? 'border-red-400' : 'border-gray-200 focus:border-indigo-500'
                    }`}
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all resize-none"
                    rows={3}
                    placeholder="أضف نبذة عن نفسك..."
                  />
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <div className="space-y-6">
                {/* Approval Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <Clock size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-800">يتطلب موافقة المسؤول</h4>
                    <p className="text-sm text-amber-700">
                      سيتم إرسال طلب الإضافة للمراجعة. ستتلقى إشعاراً عند الموافقة.
                    </p>
                  </div>
                </div>

                {/* Preview Card */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
                  <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
                      formData.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
                    }`}>
                      {formData.gender === 'Male' ? '👨' : '👩'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        {autoFillData?.fullNamePreview || formData.firstName + ' آل شايع'}
                      </h3>
                      <p className="text-indigo-600">
                        الجيل {autoFillData?.generation || 1} • {autoFillData?.branch || 'الأصل'}
                      </p>
                    </div>
                  </div>

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
                </div>

                {/* Lineage Chain */}
                {autoFillData && (
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                    <h4 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
                      <TreeDeciduous size={18} />
                      سلسلة النسب الكاملة
                    </h4>
                    <p className="text-indigo-700 text-lg font-medium">
                      {autoFillData.fullNamePreview}
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

              {step === 1 && (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={nameMatch.isPending}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-l from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {nameMatch.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      جاري البحث...
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      بحث ومطابقة
                    </>
                  )}
                </button>
              )}

              {step === 2 && matchingState === 'manual' && formData.fatherId && (
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-l from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  المتابعة
                  <ChevronLeft size={20} />
                </button>
              )}

              {step > 2 && step < 5 && (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-l from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  التالي
                  <ChevronLeft size={20} />
                </button>
              )}

              {step === 5 && (
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
                      <Loader2 size={18} className="animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      إرسال للموافقة
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-indigo-50 rounded-xl p-6 border border-indigo-200">
          <h3 className="font-bold text-indigo-800 mb-3">💡 نصائح للإضافة السريعة</h3>
          <ul className="space-y-2 text-sm text-indigo-700">
            <li>• أدخل اسم جدك وجد أبيك للحصول على مطابقة أدق</li>
            <li>• النظام يتعرف على الأسماء العربية بجميع أشكالها (محمد = محمّد = مُحَمَّد)</li>
            <li>• إذا لم تجد تطابقاً، استخدم التنقل اليدوي في الشجرة</li>
            <li>• جميع الإضافات تخضع لمراجعة المسؤول قبل النشر</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
