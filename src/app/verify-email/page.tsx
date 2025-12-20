'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setIsLoading(false);
      setError('رابط التحقق غير صالح');
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      const res = await fetch(`/api/auth/verify-email?token=${token}`);
      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setError(data.messageAr || data.message || 'فشل التحقق من البريد الإلكتروني');
      }
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">جاري التحقق...</h1>
        <p className="text-gray-600">يرجى الانتظار</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">تم التحقق بنجاح!</h1>
        <p className="text-gray-600 mb-6">
          تم تأكيد بريدك الإلكتروني. سيتم تحويلك لصفحة تسجيل الدخول...
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
        <XCircle className="w-8 h-8 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">فشل التحقق</h1>
      <p className="text-gray-600 mb-6">{error}</p>
      <div className="space-y-3">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          تسجيل الدخول
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-teal-100" dir="rtl">
      <header className="py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold text-emerald-800">
            آل شايع
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <Suspense
              fallback={
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" />
                </div>
              }
            >
              <VerifyEmailContent />
            </Suspense>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>شجرة عائلة آل شايع - نحفظ إرثنا، نربط أجيالنا</p>
      </footer>
    </div>
  );
}
