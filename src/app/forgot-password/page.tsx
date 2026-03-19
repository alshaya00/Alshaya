'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle, Phone, Smartphone, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Alert, AlertDescription } from '@/components/ui';
import AuthPageLayout from '@/components/auth/AuthPageLayout';
import PhoneInput from '@/components/PhoneInput';
import OtpInput from '@/components/OtpInput';

type ResetMethod = 'email' | 'phone';
type PhoneStep = 'form' | 'otp' | 'success';

export default function ForgotPasswordPage() {
  const [method, setMethod] = useState<ResetMethod>('email');

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('form');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (otpExpiresIn > 0) {
      const timer = setTimeout(() => setOtpExpiresIn(otpExpiresIn - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpExpiresIn]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
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

  const getFullPhone = () => {
    if (countryCode === '+966') {
      return `${countryCode}${phone.startsWith('0') ? phone.slice(1) : phone}`;
    }
    return `${countryCode}${phone}`;
  };

  const handlePhoneSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone) {
      setError('رقم الجوال مطلوب');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: getFullPhone(),
          channel: 'sms',
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPhoneStep('otp');
        setOtpExpiresIn(300);
        setResendCooldown(60);
      } else {
        setError(data.messageAr || data.message || 'حدث خطأ أثناء إرسال رمز التحقق');
      }
    } catch {
      setError('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp || otp.length !== 6) {
      setError('رمز التحقق يجب أن يكون 6 أرقام');
      return;
    }

    if (!newPassword) {
      setError('كلمة المرور الجديدة مطلوبة');
      return;
    }

    if (newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError('كلمة المرور يجب أن تحتوي على حرف كبير');
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError('كلمة المرور يجب أن تحتوي على حرف صغير');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError('كلمة المرور يجب أن تحتوي على رقم');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password-otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: getFullPhone(),
          otp,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPhoneStep('success');
      } else {
        setError(data.messageAr || data.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
      }
    } catch {
      setError('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: getFullPhone(),
          channel: 'sms',
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setOtpExpiresIn(300);
        setResendCooldown(60);
        setOtp('');
      } else {
        setError(data.messageAr || data.message || 'حدث خطأ أثناء إعادة إرسال رمز التحقق');
      }
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodChange = (newMethod: ResetMethod) => {
    setMethod(newMethod);
    setError(null);
    setIsSubmitted(false);
    setPhoneStep('form');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePhoneChange = (newPhone: string, newCountryCode: string) => {
    setPhone(newPhone);
    setCountryCode(newCountryCode);
  };

  // Success states
  if ((isSubmitted && method === 'email') || phoneStep === 'success') {
    return (
      <AuthPageLayout
        icon={<CheckCircle className="w-8 h-8 text-emerald-600" />}
        title={method === 'email' ? 'تم إرسال الرابط' : 'تم إعادة تعيين كلمة المرور'}
        subtitle={
          method === 'email'
            ? 'إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور.'
            : 'تم تغيير كلمة المرور بنجاح. سيتم توجيهك لصفحة تسجيل الدخول...'
        }
        headerLink={{ href: '/login', label: 'تسجيل الدخول' }}
      >
        {method === 'email' && (
          <p className="text-sm text-muted-foreground text-center mb-6">
            يرجى التحقق من صندوق الوارد والرسائل غير المرغوب فيها.
          </p>
        )}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-11 px-6 text-base rounded-lg gap-2 font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
          >
            العودة لتسجيل الدخول
          </Link>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      icon={
        method === 'email' ? (
          <Mail className="w-8 h-8 text-primary" />
        ) : (
          <Phone className="w-8 h-8 text-primary" />
        )
      }
      title="نسيت كلمة المرور؟"
      subtitle={
        method === 'email'
          ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين'
          : phoneStep === 'form'
          ? 'أدخل رقم جوالك وسنرسل لك رمز التحقق'
          : 'أدخل رمز التحقق وكلمة المرور الجديدة'
      }
      headerLink={{ href: '/login', label: 'تسجيل الدخول' }}
    >
      {/* Method toggle */}
      <div className="flex mb-6 bg-secondary rounded-lg p-1">
        <button
          type="button"
          onClick={() => handleMethodChange('email')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            method === 'email'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail size={18} />
          البريد الإلكتروني
        </button>
        <button
          type="button"
          onClick={() => handleMethodChange('phone')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            method === 'phone'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Smartphone size={18} />
          رقم الجوال
        </button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {method === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-5">
          <Input
            type="email"
            label="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            autoComplete="email"
            dir="ltr"
            leftIcon={<Mail size={18} />}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
          >
            إرسال رابط إعادة التعيين
          </Button>
        </form>
      ) : phoneStep === 'form' ? (
        <form onSubmit={handlePhoneSendOtp} className="space-y-5">
          <PhoneInput
            value={phone}
            onChange={handlePhoneChange}
            countryCode={countryCode}
            label="رقم الجوال"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
          >
            إرسال رمز التحقق
          </Button>
        </form>
      ) : (
        <form onSubmit={handlePhoneVerifyAndReset} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-3 text-center">
              رمز التحقق
            </label>
            <OtpInput
              value={otp}
              onChange={setOtp}
              disabled={isLoading}
            />
            <div className="mt-3 text-center">
              {otpExpiresIn > 0 ? (
                <p className="text-sm text-muted-foreground">
                  صلاحية الرمز: {formatCountdown(otpExpiresIn)}
                </p>
              ) : (
                <p className="text-sm text-destructive">انتهت صلاحية الرمز</p>
              )}
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
                className="mt-2 text-sm text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
              >
                {resendCooldown > 0
                  ? `إعادة الإرسال بعد ${resendCooldown} ثانية`
                  : 'إعادة إرسال الرمز'}
              </button>
            </div>
          </div>

          <div className="relative">
            <Input
              type={showNewPassword ? 'text' : 'password'}
              label="كلمة المرور الجديدة"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="pointer-events-auto cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
          </div>

          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              label="تأكيد كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
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
          </div>

          {/* Password requirements */}
          <div className="bg-secondary rounded-lg p-4">
            <p className="text-sm text-foreground font-medium mb-2">متطلبات كلمة المرور:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-emerald-600' : ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-emerald-600' : 'bg-muted-foreground/40'}`} />
                8 أحرف على الأقل
              </li>
              <li className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-emerald-600' : ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-emerald-600' : 'bg-muted-foreground/40'}`} />
                حرف كبير واحد على الأقل
              </li>
              <li className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-emerald-600' : ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(newPassword) ? 'bg-emerald-600' : 'bg-muted-foreground/40'}`} />
                حرف صغير واحد على الأقل
              </li>
              <li className={`flex items-center gap-2 ${/[0-9]/.test(newPassword) ? 'text-emerald-600' : ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-emerald-600' : 'bg-muted-foreground/40'}`} />
                رقم واحد على الأقل
              </li>
            </ul>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
          >
            إعادة تعيين كلمة المرور
          </Button>

          <button
            type="button"
            onClick={() => {
              setPhoneStep('form');
              setOtp('');
              setNewPassword('');
              setConfirmPassword('');
              setError(null);
            }}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            تغيير رقم الجوال
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          العودة لتسجيل الدخول
        </Link>
      </div>
    </AuthPageLayout>
  );
}
