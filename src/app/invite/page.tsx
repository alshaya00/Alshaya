'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GuestOnly } from '@/components/auth/ProtectedRoute';
import { Key, Check, X, Mail, Lock, User, Phone, Loader2, Eye, EyeOff } from 'lucide-react';

interface LinkedMemberInfo {
  id: string;
  name: string;
  fullNameAr?: string;
  fullNameEn?: string;
  generation?: number;
  branch?: string;
}

interface ValidatedInvitation {
  id: string;
  code: string;
  remainingUses: number;
  expiresAt: string;
}

function InvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code');

  const [code, setCode] = useState(codeParam || '');
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [validatedInvitation, setValidatedInvitation] = useState<ValidatedInvitation | null>(null);
  const [linkedMemberInfo, setLinkedMemberInfo] = useState<LinkedMemberInfo | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameArabic, setNameArabic] = useState('');
  const [nameEnglish, setNameEnglish] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (codeParam) {
      validateCode(codeParam);
    }
  }, [codeParam]);

  const validateCode = async (inviteCode: string) => {
    setIsValidating(true);
    setError(null);
    setValidatedInvitation(null);
    setLinkedMemberInfo(null);

    try {
      const response = await fetch('/api/invitations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.messageAr || data.message || 'فشل التحقق من رمز الدعوة');
        return;
      }

      if (!data.valid) {
        setError(data.messageAr || data.message || 'رمز الدعوة غير صالح');
        return;
      }

      setValidatedInvitation(data.invitation);
      setLinkedMemberInfo(data.linkedMemberInfo || null);

      if (data.linkedMemberInfo?.name) {
        setNameArabic(data.linkedMemberInfo.name);
      }
    } catch {
      setError('فشل التحقق من رمز الدعوة');
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidateCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      validateCode(code.trim());
    }
  };

  const validateForm = (): string | null => {
    if (!email) return 'البريد الإلكتروني مطلوب';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'صيغة البريد الإلكتروني غير صحيحة';
    }
    if (!password) return 'كلمة المرور مطلوبة';
    if (password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    if (!/[A-Z]/.test(password)) return 'كلمة المرور يجب أن تحتوي على حرف كبير';
    if (!/[a-z]/.test(password)) return 'كلمة المرور يجب أن تحتوي على حرف صغير';
    if (!/[0-9]/.test(password)) return 'كلمة المرور يجب أن تحتوي على رقم';
    if (password !== confirmPassword) return 'كلمتا المرور غير متطابقتين';
    if (!nameArabic) return 'الاسم بالعربي مطلوب';
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register-with-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          email,
          password,
          nameArabic,
          nameEnglish,
          phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.messageAr || data.message || 'فشل إنشاء الحساب');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 3000);
    } catch {
      setError('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <GuestOnly redirectTo="/">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              تم إنشاء حسابك بنجاح!
            </h2>
            <p className="text-gray-600 mb-6">
              مرحباً بك في شجرة عائلة آل شايع. سيتم توجيهك لصفحة تسجيل الدخول.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              تسجيل الدخول الآن
            </Link>
          </div>
        </div>
      </GuestOnly>
    );
  }

  return (
    <GuestOnly redirectTo="/">
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100" dir="rtl">
        <header className="py-6 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-emerald-800">
              آل شايع
            </Link>
            <Link href="/login" className="text-emerald-700 hover:text-emerald-900 font-medium">
              تسجيل الدخول
            </Link>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <Key className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">الانضمام بدعوة</h1>
              <p className="text-gray-600 mt-2">
                {validatedInvitation ? 'أكمل إنشاء حسابك' : 'أدخل رمز الدعوة للانضمام'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {!validatedInvitation && (
              <form onSubmit={handleValidateCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رمز الدعوة
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center font-mono text-lg tracking-wider"
                    placeholder="XXXXX"
                    dir="ltr"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isValidating || !code.trim()}
                  className="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري التحقق...
                    </>
                  ) : (
                    'تحقق من الرمز'
                  )}
                </button>
              </form>
            )}

            {validatedInvitation && (
              <>
                {linkedMemberInfo && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <h3 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      العضو المرتبط
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-gray-600">الاسم:</span>{' '}
                        <span className="font-medium">{linkedMemberInfo.name}</span>
                      </p>
                      {linkedMemberInfo.branch && (
                        <p>
                          <span className="text-gray-600">الفرع:</span>{' '}
                          <span className="font-medium">{linkedMemberInfo.branch}</span>
                        </p>
                      )}
                      {linkedMemberInfo.generation && (
                        <p>
                          <span className="text-gray-600">الجيل:</span>{' '}
                          <span className="font-medium">{linkedMemberInfo.generation}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Check className="w-4 h-4" />
                    <span>رمز الدعوة صالح - الاستخدامات المتبقية: {validatedInvitation.remainingUses}</span>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline ml-1" />
                      البريد الإلكتروني <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="example@email.com"
                      dir="ltr"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline ml-1" />
                      الاسم بالعربي <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nameArabic}
                      onChange={(e) => setNameArabic(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="أحمد محمد آل شايع"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم بالإنجليزي (اختياري)
                    </label>
                    <input
                      type="text"
                      value={nameEnglish}
                      onChange={(e) => setNameEnglish(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Ahmed Al-Shaye"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline ml-1" />
                      رقم الهاتف (اختياري)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="+966 5XX XXX XXXX"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Lock className="w-4 h-4 inline ml-1" />
                      كلمة المرور <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pl-12"
                        placeholder="••••••••"
                        dir="ltr"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Lock className="w-4 h-4 inline ml-1" />
                      تأكيد كلمة المرور <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pl-12"
                        placeholder="••••••••"
                        dir="ltr"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        جاري إنشاء الحساب...
                      </>
                    ) : (
                      'إنشاء الحساب'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setValidatedInvitation(null);
                      setLinkedMemberInfo(null);
                      setCode('');
                      setError(null);
                      setEmail('');
                      setPassword('');
                      setConfirmPassword('');
                      setNameArabic('');
                      setNameEnglish('');
                      setPhone('');
                    }}
                    className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    استخدام رمز مختلف
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="text-center mt-6 space-y-2">
            <p className="text-gray-600">
              ليس لديك رمز دعوة؟{' '}
              <Link href="/register" className="text-emerald-600 hover:text-emerald-800 font-medium">
                طلب الانضمام
              </Link>
            </p>
            <p className="text-gray-600">
              لديك حساب؟{' '}
              <Link href="/login" className="text-emerald-600 hover:text-emerald-800 font-medium">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </main>
      </div>
    </GuestOnly>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  );
}
