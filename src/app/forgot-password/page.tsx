'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, CheckCircle, Phone, Smartphone, Eye, EyeOff, Loader2 } from 'lucide-react';
import PhoneInput from '@/components/PhoneInput';
import OtpInput from '@/components/OtpInput';

type ResetMethod = 'email' | 'phone';
type PhoneStep = 'form' | 'otp' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
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
        setTimeout(() => {
          router.push('/login');
        }, 3000);
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-teal-100" dir="rtl">
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

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {(isSubmitted && method === 'email') || phoneStep === 'success' ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                {method === 'email' ? (
                  <>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">تم إرسال الرابط</h1>
                    <p className="text-gray-600 mb-6">
                      إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور.
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                      يرجى التحقق من صندوق الوارد والرسائل غير المرغوب فيها.
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">تم إعادة تعيين كلمة المرور</h1>
                    <p className="text-gray-600 mb-6">
                      تم تغيير كلمة المرور بنجاح. سيتم توجيهك لصفحة تسجيل الدخول...
                    </p>
                  </>
                )}
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  العودة لتسجيل الدخول
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                    {method === 'email' ? (
                      <Mail className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <Phone className="w-8 h-8 text-emerald-600" />
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">نسيت كلمة المرور؟</h1>
                  <p className="text-gray-600 mt-2">
                    {method === 'email'
                      ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين'
                      : phoneStep === 'form'
                      ? 'أدخل رقم جوالك وسنرسل لك رمز التحقق'
                      : 'أدخل رمز التحقق وكلمة المرور الجديدة'}
                  </p>
                </div>

                <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => handleMethodChange('email')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                      method === 'email'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
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
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Smartphone size={18} />
                    رقم الجوال
                  </button>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                {method === 'email' ? (
                  <form onSubmit={handleEmailSubmit} className="space-y-5">
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
                          <Loader2 className="w-5 h-5 animate-spin" />
                          جاري الإرسال...
                        </span>
                      ) : (
                        'إرسال رابط إعادة التعيين'
                      )}
                    </button>
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

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          جاري الإرسال...
                        </span>
                      ) : (
                        'إرسال رمز التحقق'
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handlePhoneVerifyAndReset} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                        رمز التحقق
                      </label>
                      <OtpInput
                        value={otp}
                        onChange={setOtp}
                        disabled={isLoading}
                      />
                      <div className="mt-3 text-center">
                        {otpExpiresIn > 0 ? (
                          <p className="text-sm text-gray-500">
                            صلاحية الرمز: {formatCountdown(otpExpiresIn)}
                          </p>
                        ) : (
                          <p className="text-sm text-red-500">انتهت صلاحية الرمز</p>
                        )}
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={resendCooldown > 0 || isLoading}
                          className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          {resendCooldown > 0
                            ? `إعادة الإرسال بعد ${resendCooldown} ثانية`
                            : 'إعادة إرسال الرمز'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="newPassword"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        كلمة المرور الجديدة
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          id="newPassword"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          placeholder="••••••••"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        تأكيد كلمة المرور
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          id="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          placeholder="••••••••"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 font-medium mb-2">متطلبات كلمة المرور:</p>
                      <ul className="text-sm text-gray-500 space-y-1">
                        <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                          8 أحرف على الأقل
                        </li>
                        <li className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                          حرف كبير واحد على الأقل
                        </li>
                        <li className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                          حرف صغير واحد على الأقل
                        </li>
                        <li className={`flex items-center gap-2 ${/[0-9]/.test(newPassword) ? 'text-green-600' : ''}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                          رقم واحد على الأقل
                        </li>
                      </ul>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          جاري إعادة التعيين...
                        </span>
                      ) : (
                        'إعادة تعيين كلمة المرور'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPhoneStep('form');
                        setOtp('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setError(null);
                      }}
                      className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      تغيير رقم الجوال
                    </button>
                  </form>
                )}

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

      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>شجرة عائلة آل شايع - نحفظ إرثنا، نربط أجيالنا</p>
      </footer>
    </div>
  );
}
