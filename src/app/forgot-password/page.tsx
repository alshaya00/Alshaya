'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSubmitted(true);
      } else {
        setError(data.messageAr || data.message || 'حدث خطأ أثناء إرسال الطلب');
      }
    } catch {
      setError('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-teal-100" dir="rtl">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-emerald-800">
            آل شايع
          </Link>
          <Link
            href="/login"
            className="text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1"
          >
            <ArrowRight size={18} />
            تسجيل الدخول
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {isSubmitted ? (
              /* Success State */
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">تم إرسال الرابط</h1>
                <p className="text-gray-600 mb-6">
                  إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  يرجى التحقق من صندوق الوارد والرسائل غير المرغوب فيها.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  العودة لتسجيل الدخول
                </Link>
              </div>
            ) : (
              /* Form State */
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">نسيت كلمة المرور؟</h1>
                  <p className="text-gray-600 mt-2">
                    أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
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
                        جاري الإرسال...
                      </span>
                    ) : (
                      'إرسال رابط إعادة التعيين'
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="text-sm text-emerald-600 hover:text-emerald-800"
                  >
                    العودة لتسجيل الدخول
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>شجرة عائلة آل شايع - نحفظ إرثنا، نربط أجيالنا</p>
      </footer>
    </div>
  );
}
