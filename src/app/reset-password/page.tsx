'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Alert, AlertDescription, Spinner } from '@/components/ui';
import AuthPageLayout from '@/components/auth/AuthPageLayout';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('رابط إعادة التعيين غير صالح أو منتهي الصلاحية');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setError(data.messageAr || data.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
      }
    } catch {
      setError('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthPageLayout
        icon={<CheckCircle className="w-8 h-8 text-emerald-600" />}
        title="تم تغيير كلمة المرور"
        subtitle="تم تغيير كلمة المرور بنجاح. سيتم تحويلك لصفحة تسجيل الدخول..."
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

  if (!token) {
    return (
      <AuthPageLayout
        icon={<XCircle className="w-8 h-8 text-destructive" />}
        title="رابط غير صالح"
        subtitle="رابط إعادة التعيين غير صالح أو منتهي الصلاحية."
      >
        <div className="text-center">
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center h-11 px-6 text-base rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
          >
            طلب رابط جديد
          </Link>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      icon={<Lock className="w-8 h-8 text-primary" />}
      title="إعادة تعيين كلمة المرور"
      subtitle="أدخل كلمة المرور الجديدة"
    >
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          type={showPassword ? 'text' : 'password'}
          label="كلمة المرور الجديدة"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          dir="ltr"
          leftIcon={<Lock size={18} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="pointer-events-auto cursor-pointer text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <Input
          type={showConfirmPassword ? 'text' : 'password'}
          label="تأكيد كلمة المرور"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
          dir="ltr"
          leftIcon={<Lock size={18} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="pointer-events-auto cursor-pointer text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
        >
          تعيين كلمة المرور
        </Button>
      </form>
    </AuthPageLayout>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </Suspense>
  );
}
