'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GuestOnly } from '@/components/auth/ProtectedRoute';
import type { FamilyMember } from '@/lib/types';
import {
  Mail, UserPlus, Eye, ChevronLeft, ChevronRight, Check, Shield,
  Users, Lock, ArrowRight, Loader2, X, Search
} from 'lucide-react';
import { relationshipTypes } from '@/config/constants';
import { useAuth } from '@/contexts/AuthContext';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  nameArabic: string;
  nameEnglish: string;
  phone: string;
  claimedRelation: string;
  relatedMemberId: string;
  relationshipType: string;
  message: string;
}

type JoinPath = 'invite' | 'request' | 'browse' | null;

const RELATIONSHIP_TYPES = relationshipTypes;

export default function RegisterPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [joinPath, setJoinPath] = useState<JoinPath>(null);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    nameArabic: '',
    nameEnglish: '',
    phone: '',
    claimedRelation: '',
    relatedMemberId: '',
    relationshipType: '',
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/members/public?limit=500');
        if (res.ok) {
          const data = await res.json();
          setAllMembers(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    }
    fetchMembers();
  }, []);

  const filteredMembers = allMembers.filter((m) => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    return (
      m.firstName.toLowerCase().includes(query) ||
      m.fullNameAr?.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query)
    );
  }).slice(0, 10);

  const selectedMember = formData.relatedMemberId
    ? allMembers.find((m) => m.id === formData.relatedMemberId)
    : null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMemberSelect = (memberId: string) => {
    const member = allMembers.find((m) => m.id === memberId);
    setFormData({
      ...formData,
      relatedMemberId: memberId,
      claimedRelation: member
        ? `قريب ${member.fullNameAr || member.firstName}`
        : formData.claimedRelation,
    });
    setSearchQuery('');
    setShowMemberDropdown(false);
  };

  const validateForm = (): string | null => {
    if (!formData.email) return 'البريد الإلكتروني مطلوب';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'صيغة البريد الإلكتروني غير صحيحة';
    }
    if (!formData.password) return 'كلمة المرور مطلوبة';
    if (formData.password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    if (!/[A-Z]/.test(formData.password)) return 'كلمة المرور يجب أن تحتوي على حرف كبير';
    if (!/[a-z]/.test(formData.password)) return 'كلمة المرور يجب أن تحتوي على حرف صغير';
    if (!/[0-9]/.test(formData.password)) return 'كلمة المرور يجب أن تحتوي على رقم';
    if (formData.password !== formData.confirmPassword) return 'كلمتا المرور غير متطابقتين';
    if (!formData.nameArabic) return 'الاسم بالعربي مطلوب';
    if (!formData.phone) return 'رقم الاتصال مطلوب';
    if (!/^[\d\s+()-]{9,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      return 'صيغة رقم الاتصال غير صحيحة';
    }
    if (!formData.claimedRelation && !formData.relatedMemberId) {
      return 'يرجى تحديد صلة القرابة أو اختيار أحد أفراد العائلة';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.messageAr || data.message || 'فشل التسجيل');
        return;
      }

      setSuccess(true);
      setRequestId(data.requestId);
    } catch {
      setError('حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMemberDropdown(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ============================================
  // SUCCESS STATE
  // ============================================
  if (success) {
    return (
      <GuestOnly redirectTo="/">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              تم تقديم طلبك بنجاح!
            </h2>
            <p className="text-gray-600 mb-6">
              شكراً لك على طلب الانضمام لشجرة عائلة آل شايع. سيتم مراجعة طلبك من قبل
              إدارة الموقع وستتلقى إشعاراً عند الموافقة.
            </p>
            {requestId && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">رقم الطلب</p>
                <p className="font-mono text-gray-900">{requestId}</p>
              </div>
            )}
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full py-3 px-4 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
              >
                العودة لتسجيل الدخول
              </Link>
              <Link
                href="/"
                className="block w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                الصفحة الرئيسية
              </Link>
            </div>
          </div>
        </div>
      </GuestOnly>
    );
  }

  // ============================================
  // STEP 1: CHOOSE PATH (Fix #5: 3-Path Signup)
  // ============================================
  if (!joinPath) {
    return (
      <GuestOnly redirectTo="/">
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100" dir="rtl">
          {/* Header */}
          <header className="py-6 px-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">🌳</span>
                <span className="text-xl font-bold text-green-800">آل شايع</span>
              </Link>
              <Link
                href="/login"
                className="text-green-700 hover:text-green-900 font-medium"
              >
                تسجيل الدخول
              </Link>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-2xl mx-auto px-4 py-12">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-3xl mb-6">
                <Users className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                انضم إلى العائلة
              </h1>
              <p className="text-gray-600 text-lg">
                كيف تود الانضمام لشجرة آل شايع؟
              </p>
            </div>

            {/* Three Paths */}
            <div className="space-y-4">
              {/* Path 1: Invitation */}
              <button
                onClick={() => router.push('/invite')}
                className="w-full bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-green-500 p-6 text-right transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-green-500 transition-colors">
                    <Mail className="w-7 h-7 text-green-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      لدي دعوة
                    </h3>
                    <p className="text-sm text-gray-500">I have an invitation</p>
                    <p className="text-gray-600 mt-2">
                      استلمت رمز دعوة أو رابط من أحد أفراد العائلة
                    </p>
                  </div>
                  <ChevronLeft className="w-6 h-6 text-gray-400 group-hover:text-green-500 transition-colors" />
                </div>
              </button>

              {/* Path 2: Request Access */}
              <button
                onClick={() => setJoinPath('request')}
                className="w-full bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 p-6 text-right transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-500 transition-colors">
                    <UserPlus className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      أنا من العائلة
                    </h3>
                    <p className="text-sm text-gray-500">I&apos;m a family member</p>
                    <p className="text-gray-600 mt-2">
                      أرغب في طلب الانضمام وسيتم مراجعة طلبي
                    </p>
                  </div>
                  <ChevronLeft className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </button>

              {/* Path 3: Browse */}
              <button
                onClick={() => router.push('/tree')}
                className="w-full bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-gray-400 p-6 text-right transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-gray-500 transition-colors">
                    <Eye className="w-7 h-7 text-gray-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      أتصفح فقط
                    </h3>
                    <p className="text-sm text-gray-500">Just browsing</p>
                    <p className="text-gray-600 mt-2">
                      أريد استكشاف الشجرة أولاً قبل الانضمام
                    </p>
                  </div>
                  <ChevronLeft className="w-6 h-6 text-gray-400 group-hover:text-gray-500 transition-colors" />
                </div>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="mt-10 p-6 bg-white/50 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-800">خصوصيتك محمية</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>فقط أفراد العائلة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>لا مشاركة للبيانات</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>تحكم كامل بمعلوماتك</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>إدارة موثوقة</span>
                </div>
              </div>
            </div>

            {/* Already have account */}
            <p className="text-center mt-8 text-gray-600">
              لديك حساب بالفعل؟{' '}
              <Link href="/login" className="text-green-600 hover:text-green-800 font-medium">
                تسجيل الدخول
              </Link>
            </p>
          </main>
        </div>
      </GuestOnly>
    );
  }

  // ============================================
  // STEP 2: REQUEST ACCESS FORM
  // ============================================
  return (
    <GuestOnly redirectTo="/">
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100" dir="rtl">
        {/* Header */}
        <header className="py-6 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🌳</span>
              <span className="text-xl font-bold text-green-800">آل شايع</span>
            </Link>
            <Link
              href="/login"
              className="text-green-700 hover:text-green-900 font-medium"
            >
              تسجيل الدخول
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            {/* Back Button */}
            <button
              onClick={() => setJoinPath(null)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
            >
              <ChevronRight className="w-5 h-5" />
              رجوع
            </button>

            {/* Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
                <UserPlus className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">طلب الانضمام للعائلة</h1>
              <p className="text-gray-600 mt-2">
                سيتم مراجعة طلبك من قبل إدارة العائلة
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Find yourself in the family tree */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-sm font-bold text-green-600">1</span>
                  ابحث عن اسمك في شجرة العائلة
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  ابحث عن اسمك في الشجرة لتسهيل عملية التحقق من هويتك
                </p>

                {/* Member Search with improved styling */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowMemberDropdown(true);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMemberDropdown(true);
                      }}
                      className="w-full pr-11 pl-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                      placeholder="ابحث بالاسم الأول أو اسم العائلة..."
                    />
                  </div>
                  {showMemberDropdown && filteredMembers.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-72 overflow-auto">
                      {filteredMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMemberSelect(member.id);
                            setFormData({
                              ...formData,
                              relatedMemberId: member.id,
                              nameArabic: member.fullNameAr || member.firstName,
                              nameEnglish: member.fullNameEn || '',
                              claimedRelation: `أنا ${member.fullNameAr || member.firstName}`,
                              relationshipType: 'self',
                            });
                          }}
                          className="w-full px-4 py-4 text-right hover:bg-green-50 border-b border-gray-100 last:border-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-gray-900">
                                {member.fullNameAr || member.firstName}
                              </span>
                              {member.fullNameEn && (
                                <span className="text-sm text-gray-500 mr-2" dir="ltr">
                                  ({member.fullNameEn})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              الجيل {member.generation}
                            </div>
                          </div>
                          {member.branch && (
                            <p className="text-sm text-gray-500 mt-1">
                              فرع: {member.branch}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery && filteredMembers.length === 0 && showMemberDropdown && (
                    <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl p-4 text-center text-gray-500">
                      لم يتم العثور على نتائج. يمكنك إدخال اسمك يدوياً أدناه.
                    </div>
                  )}
                </div>

                {/* Selected Member Card */}
                {selectedMember && (
                  <div className="mt-4 p-4 bg-gradient-to-l from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-green-900 text-lg">
                            {selectedMember.fullNameAr || selectedMember.firstName}
                          </p>
                          <p className="text-sm text-green-700">
                            الجيل {selectedMember.generation} {selectedMember.branch ? `- فرع ${selectedMember.branch}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ 
                            ...formData, 
                            relatedMemberId: '', 
                            claimedRelation: '',
                            nameArabic: '',
                            nameEnglish: '',
                            relationshipType: '',
                          });
                        }}
                        className="text-green-600 hover:text-green-800 p-2 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Personal Info Section - Only show if member not selected */}
              {!selectedMember && (
                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600">أو</span>
                    أدخل معلوماتك يدوياً
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الاسم بالعربي <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="nameArabic"
                        value={formData.nameArabic}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="أحمد محمد آل شايع"
                        required={!selectedMember}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الاسم بالإنجليزي
                      </label>
                      <input
                        type="text"
                        name="nameEnglish"
                        value={formData.nameEnglish}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Ahmed Mohammed Al-Shaye"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-sm font-bold text-green-600">2</span>
                  معلومات التواصل
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الاتصال <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="+966 5XX XXX XXXX"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              {/* Account Info Section */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-sm font-bold text-green-600">3</span>
                  معلومات الحساب
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      البريد الإلكتروني <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="example@email.com"
                      required
                      dir="ltr"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        كلمة المرور <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="••••••••"
                        required
                        dir="ltr"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        تأكيد كلمة المرور <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="••••••••"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Family Relation Section - Only show if not claiming self */}
              {!selectedMember && (
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-sm font-bold text-green-600">4</span>
                  صلة القرابة
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  إذا لم تجد اسمك في الشجرة، يرجى وصف صلة قرابتك بالعائلة
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    وصف صلة القرابة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="claimedRelation"
                    value={formData.claimedRelation}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="مثال: ابن محمد أحمد آل شايع"
                    required={!selectedMember}
                  />
                </div>
              </div>
              )}

              {/* Additional Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رسالة إضافية (اختياري)
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="أي معلومات إضافية تود مشاركتها..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-4 bg-green-600 text-white font-bold text-lg rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري إرسال الطلب...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    تقديم طلب الانضمام
                  </>
                )}
              </button>
            </form>

            {/* Already have account */}
            <p className="text-center mt-6 text-gray-600">
              لديك حساب بالفعل؟{' '}
              <Link href="/login" className="text-green-600 hover:text-green-800 font-medium">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </main>
      </div>
    </GuestOnly>
  );
}
