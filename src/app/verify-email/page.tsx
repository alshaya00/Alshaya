'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/ui';
import AuthPageLayout from '@/components/auth/AuthPageLayout';

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
      <AuthPageLayout
        icon={<RefreshCw className="w-8 h-8 text-primary animate-spin" />}
        title="جاري التحقق..."
        subtitle="يرجى الانتظار"
      >
        <div className="flex justify-center">
          <Spinner size="md" label="" />
        </div>
      </AuthPageLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthPageLayout
        icon={<CheckCircle className="w-8 h-8 text-emerald-600" />}
        title="تم التحقق بنجاح!"
        subtitle="تم تأكيد بريدك الإلكتروني. سيتم تحويلك لصفحة تسجيل الدخول..."
      >
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-11 px-6 text-base rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
          >
            تسجيل الدخول
          </Link>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      icon={<XCircle className="w-8 h-8 text-destructive" />}
      title="فشل التحقق"
      subtitle={error || undefined}
    >
      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center justify-center h-11 px-6 text-base rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
        >
          تسجيل الدخول
        </Link>
      </div>
    </AuthPageLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthPageLayout>
          <div className="flex justify-center py-8">
            <Spinner size="lg" label="جاري التحميل..." />
          </div>
        </AuthPageLayout>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
