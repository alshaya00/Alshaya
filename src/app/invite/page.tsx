'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GuestOnly } from '@/components/auth/ProtectedRoute';
import { ROLE_LABELS, UserRole } from '@/lib/auth/types';

interface InviteInfo {
  email: string;
  role: UserRole;
  branch?: string;
  expiresAt: string;
  message?: string;
}

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code');

  const [code, setCode] = useState(codeParam || '');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form data
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameArabic, setNameArabic] = useState('');
  const [nameEnglish, setNameEnglish] = useState('');
  const [phone, setPhone] = useState('');

  // Validate code when provided
  useEffect(() => {
    if (codeParam) {
      validateCode(codeParam);
    }
  }, [codeParam]);

  const validateCode = async (inviteCode: string) => {
    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/invite?code=${inviteCode}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.messageAr || data.message || 'رمز الدعوة غير صالح');
        setInviteInfo(null);
        return;
      }

      setInviteInfo(data.invite);
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

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!password || password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (!nameArabic) {
      setError('الاسم بالعربي مطلوب');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
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
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      setError('حدث خطأ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <GuestOnly redirectTo="/">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              تم إنشاء حسابك بنجاح!
            </h2>
            <p className="text-gray-600 mb-6">
              مرحباً بك في شجرة عائلة آل شايع. سيتم توجيهك لصفحة تسجيل الدخول.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
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
        {/* Header */}
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

        {/* Main Content */}
        <main className="max-w-lg mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">قبول الدعوة</h1>
              <p className="text-gray-600 mt-2">
                {inviteInfo ? 'أكمل إنشاء حسابك' : 'أدخل رمز الدعوة للانضمام'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Step 1: Enter Code */}
            {!inviteInfo && (
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
                    placeholder="ALSHAYE-XXXX-XXXX"
                    dir="ltr"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isValidating || !code.trim()}
                  className="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isValidating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      جاري التحقق...
                    </span>
                  ) : (
                    'التحقق من الرمز'
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Complete Registration */}
            {inviteInfo && (
              <>
                {/* Invite Details */}
                <div className="mb-6 p-4 bg-emerald-50 rounded-lg">
                  <h3 className="font-semibold text-emerald-800 mb-2">تفاصيل الدعوة</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-gray-600">البريد الإلكتروني:</span>{' '}
                      <span className="font-medium" dir="ltr">{inviteInfo.email}</span>
                    </p>
                    <p>
                      <span className="text-gray-600">الدور:</span>{' '}
                      <span className="font-medium">{ROLE_LABELS[inviteInfo.role].ar}</span>
                    </p>
                    {inviteInfo.branch && (
                      <p>
                        <span className="text-gray-600">الفرع:</span>{' '}
                        <span className="font-medium">{inviteInfo.branch}</span>
                      </p>
                    )}
                    {inviteInfo.message && (
                      <p className="text-emerald-700 mt-2 italic">&quot;{inviteInfo.message}&quot;</p>
                    )}
                  </div>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleAcceptInvite} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      الاسم بالإنجليزي
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
                      رقم الهاتف
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
                      كلمة المرور <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="••••••••"
                      dir="ltr"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">8 أحرف على الأقل</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تأكيد كلمة المرور <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="••••••••"
                      dir="ltr"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        جاري إنشاء الحساب...
                      </span>
                    ) : (
                      'إنشاء الحساب'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInviteInfo(null);
                      setCode('');
                      setError(null);
                    }}
                    className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    استخدام رمز مختلف
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Links */}
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
