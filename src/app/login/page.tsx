'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { GuestOnly } from '@/components/auth/ProtectedRoute';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, verify2FA } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'oauth_failed': 'فشل تسجيل الدخول عبر الحساب الخارجي',
        'oauth_denied': 'تم إلغاء تسجيل الدخول',
        'oauth_no_email': 'لم يتم توفير البريد الإلكتروني',
        'oauth_invalid_state': 'جلسة غير صالحة، يرجى المحاولة مرة أخرى',
        'account_pending': 'حسابك بانتظار الموافقة',
        'account_disabled': 'تم تعطيل حسابك',
      };
      setError(errorMessages[errorParam] || 'حدث خطأ');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await login(email, password, rememberMe);

      if (result.success) {
        // Redirect admins to dashboard, others to home
        const isAdmin = result.user?.role === 'SUPER_ADMIN' || result.user?.role === 'ADMIN';
        router.push(isAdmin ? '/admin' : '/');
      } else if (result.requires2FA) {
        setShow2FA(true);
      } else {
        setError(result.error || 'فشل تسجيل الدخول');

        // Extract remaining attempts from error if available
        if (result.error?.includes('attempts')) {
          const match = result.error.match(/(\d+)/);
          if (match) {
            setRemainingAttempts(parseInt(match[1]));
          }
        }
      }
    } catch {
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await verify2FA(email, twoFactorCode, isBackupCode, rememberMe);

      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'رمز التحقق غير صحيح');
      }
    } catch {
      setError('حدث خطأ أثناء التحقق');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'github') => {
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  return (
    <GuestOnly redirectTo="/">
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-teal-100" dir="rtl">
        {/* Header */}
        <header className="py-6 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-emerald-800">
              آل شايع
            </Link>
            <Link
              href="/register"
              className="text-emerald-700 hover:text-emerald-900 font-medium"
            >
              طلب الانضمام
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            {/* Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* Logo/Title */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">تسجيل الدخول</h1>
                <p className="text-gray-600 mt-2">
                  مرحباً بك في شجرة عائلة آل شايع
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-red-600 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-red-800 font-medium">{error}</p>
                      {remainingAttempts !== null && remainingAttempts > 0 && (
                        <p className="text-red-600 text-sm mt-1">
                          المحاولات المتبقية: {remainingAttempts}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {show2FA ? (
                /* 2FA Form */
                <form onSubmit={handle2FASubmit} className="space-y-5">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">المصادقة الثنائية</h2>
                    <p className="text-gray-600 mt-1">أدخل الرمز من تطبيق المصادقة</p>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, isBackupCode ? 8 : 6))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center text-2xl tracking-widest"
                      placeholder={isBackupCode ? 'XXXX-XXXX' : '000000'}
                      maxLength={isBackupCode ? 9 : 6}
                      dir="ltr"
                      autoFocus
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBackupCode}
                      onChange={(e) => {
                        setIsBackupCode(e.target.checked);
                        setTwoFactorCode('');
                      }}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-600">استخدام رمز الاسترداد</span>
                  </label>

                  <button
                    type="submit"
                    disabled={isLoading || twoFactorCode.length < (isBackupCode ? 8 : 6)}
                    className="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? 'جاري التحقق...' : 'تأكيد'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShow2FA(false);
                      setTwoFactorCode('');
                    }}
                    className="w-full py-2 text-gray-600 hover:text-gray-800"
                  >
                    رجوع
                  </button>
                </form>
              ) : (
                /* Login Form */
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      placeholder="example@email.com"
                      required
                      autoComplete="email"
                      dir="ltr"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      كلمة المرور
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      dir="ltr"
                    />
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-600">تذكرني</span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-emerald-600 hover:text-emerald-800"
                    >
                      نسيت كلمة المرور؟
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        جاري تسجيل الدخول...
                      </span>
                    ) : (
                      'تسجيل الدخول'
                    )}
                  </button>
                </form>
              )}

              {/* Invite Code Link */}
              {!show2FA && (
                <div className="text-center">
                  <p className="text-gray-600 mb-3">لديك رمز دعوة؟</p>
                  <Link
                    href="/invite"
                    className="inline-flex items-center gap-2 px-6 py-2 border border-emerald-600 text-emerald-600 font-medium rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    استخدام رمز الدعوة
                  </Link>
                </div>
              )}
            </div>

            {/* Register Link */}
            <p className="text-center mt-6 text-gray-600">
              ليس لديك حساب؟{' '}
              <Link
                href="/register"
                className="text-emerald-600 hover:text-emerald-800 font-medium"
              >
                طلب الانضمام للعائلة
              </Link>
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 text-center text-gray-500 text-sm">
          <p>شجرة عائلة آل شايع - نحفظ إرثنا، نربط أجيالنا</p>
        </footer>
      </div>
    </GuestOnly>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
