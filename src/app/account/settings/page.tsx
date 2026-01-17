'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  Phone,
  Mail,
  Lock,
  Key,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  User,
  Eye,
  EyeOff,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PhoneInput from '@/components/PhoneInput';
import OtpInput from '@/components/OtpInput';
import { formatPhoneDisplay } from '@/lib/phone-utils';

type PhoneStep = 'form' | 'otp';
type OtpChannel = 'sms' | 'whatsapp';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, session, isLoading: authLoading, isAuthenticated, refreshUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [newPhone, setNewPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+966');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('form');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpChannel, setOtpChannel] = useState<OtpChannel>('sms');

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

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

  const getAuthHeader = () => {
    return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('جميع الحقول مطلوبة');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('كلمات المرور الجديدة غير متطابقة');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch('/api/account/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setPasswordSuccess(data.messageAr || 'تم تحديث كلمة المرور بنجاح');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.messageAr || 'فشل في تحديث كلمة المرور');
      }
    } catch {
      setPasswordError('حدث خطأ في الاتصال');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setPhoneSuccess(null);

    if (!newPhone) {
      setPhoneError('رقم الجوال مطلوب');
      return;
    }

    const fullPhone = phoneCountryCode === '+966' 
      ? `${phoneCountryCode}${newPhone.startsWith('0') ? newPhone.slice(1) : newPhone}`
      : `${phoneCountryCode}${newPhone}`;

    setPhoneLoading(true);

    try {
      const response = await fetch('/api/account/update-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ newPhone: fullPhone, channel: otpChannel }),
      });

      const data = await response.json();

      if (data.success) {
        setPhoneStep('otp');
        setOtpExpiresIn(data.expiresIn || 600);
        setResendCooldown(60);
        setPhoneSuccess(data.messageAr || 'تم إرسال رمز التحقق');
      } else {
        setPhoneError(data.messageAr || 'فشل في إرسال رمز التحقق');
      }
    } catch {
      setPhoneError('حدث خطأ في الاتصال');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handlePhoneOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setPhoneSuccess(null);

    if (!phoneOtp || phoneOtp.length !== 6) {
      setPhoneError('رمز التحقق يجب أن يكون 6 أرقام');
      return;
    }

    const fullPhone = phoneCountryCode === '+966' 
      ? `${phoneCountryCode}${newPhone.startsWith('0') ? newPhone.slice(1) : newPhone}`
      : `${phoneCountryCode}${newPhone}`;

    setPhoneLoading(true);

    try {
      const response = await fetch('/api/account/update-phone', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ newPhone: fullPhone, otp: phoneOtp }),
      });

      const data = await response.json();

      if (data.success) {
        setPhoneSuccess(data.messageAr || 'تم تحديث رقم الجوال بنجاح');
        setNewPhone('');
        setPhoneOtp('');
        setPhoneStep('form');
        setOtpExpiresIn(0);
        await refreshUser();
      } else {
        setPhoneError(data.messageAr || 'رمز التحقق غير صحيح');
      }
    } catch {
      setPhoneError('حدث خطأ في الاتصال');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    const fullPhone = phoneCountryCode === '+966' 
      ? `${phoneCountryCode}${newPhone.startsWith('0') ? newPhone.slice(1) : newPhone}`
      : `${phoneCountryCode}${newPhone}`;

    setPhoneLoading(true);
    setPhoneError(null);

    try {
      const response = await fetch('/api/account/update-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ newPhone: fullPhone, channel: otpChannel }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpExpiresIn(data.expiresIn || 600);
        setResendCooldown(60);
        setPhoneOtp('');
        setPhoneSuccess('تم إعادة إرسال رمز التحقق');
      } else {
        setPhoneError(data.messageAr || 'فشل في إعادة إرسال الرمز');
      }
    } catch {
      setPhoneError('حدث خطأ في الاتصال');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    if (!newEmail || !emailPassword) {
      setEmailError('البريد الإلكتروني وكلمة المرور مطلوبان');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError('صيغة البريد الإلكتروني غير صحيحة');
      return;
    }

    setEmailLoading(true);

    try {
      const response = await fetch('/api/account/update-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ newEmail, password: emailPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setEmailSuccess(data.messageAr || 'تم تحديث البريد الإلكتروني بنجاح');
        setNewEmail('');
        setEmailPassword('');
        await refreshUser();
      } else {
        setEmailError(data.messageAr || 'فشل في تحديث البريد الإلكتروني');
      }
    } catch {
      setEmailError('حدث خطأ في الاتصال');
    } finally {
      setEmailLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskPhone = (phone: string | null | undefined) => {
    if (!phone) return '-';
    const formatted = formatPhoneDisplay(phone);
    if (formatted === '-') return '-';
    const digits = formatted.replace(/\D/g, '');
    if (digits.length >= 8) {
      return `${formatted.slice(0, 8)}****`;
    }
    return formatted;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-emerald-600" />
              <h1 className="text-xl font-bold text-gray-900">إعدادات الحساب</h1>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <span>العودة للرئيسية</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user?.nameArabic}</h2>
              {user?.nameEnglish && (
                <p className="text-sm text-gray-500">{user.nameEnglish}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{user?.email || '-'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span dir="ltr">{maskPhone(user?.phone)}</span>
            </div>
            {user?.linkedMemberId && (
              <div className="flex items-center gap-2 text-gray-600 sm:col-span-2">
                <User className="w-4 h-4 text-gray-400" />
                <span>مرتبط بالعضو: {user.linkedMemberId}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">تغيير كلمة المرور</h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور الحالية
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="أدخل كلمة المرور الحالية"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="أدخل كلمة المرور الجديدة"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري التحديث...</span>
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  <span>تحديث كلمة المرور</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <Phone className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">رقم الجوال</h2>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              الرقم الحالي: <span dir="ltr" className="font-medium">{maskPhone(user?.phone)}</span>
            </p>
          </div>

          {phoneStep === 'form' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-medium text-gray-700">طريقة الإرسال:</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="otpChannel"
                      value="sms"
                      checked={otpChannel === 'sms'}
                      onChange={() => setOtpChannel('sms')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">رسالة SMS</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="otpChannel"
                      value="whatsapp"
                      checked={otpChannel === 'whatsapp'}
                      onChange={() => setOtpChannel('whatsapp')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">واتساب</span>
                  </label>
                </div>
              </div>

              <PhoneInput
                value={newPhone}
                onChange={(phone, countryCode) => {
                  setNewPhone(phone);
                  setPhoneCountryCode(countryCode);
                }}
                countryCode={phoneCountryCode}
                label="رقم الجوال الجديد"
                placeholder="5XXXXXXXX"
                error={undefined}
              />

              {phoneError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{phoneError}</span>
                </div>
              )}

              {phoneSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{phoneSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={phoneLoading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {phoneLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5" />
                    <span>إرسال رمز التحقق</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePhoneOtpVerify} className="space-y-4">
              <p className="text-sm text-gray-600 text-center mb-4">
                تم إرسال رمز التحقق إلى الرقم{' '}
                <span dir="ltr" className="font-medium">{phoneCountryCode}{newPhone}</span>
              </p>

              <OtpInput
                value={phoneOtp}
                onChange={setPhoneOtp}
                error={undefined}
              />

              {otpExpiresIn > 0 && (
                <p className="text-center text-sm text-gray-500">
                  ينتهي الرمز خلال: <span className="font-medium">{formatCountdown(otpExpiresIn)}</span>
                </p>
              )}

              {phoneError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{phoneError}</span>
                </div>
              )}

              {phoneSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{phoneSuccess}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={phoneLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {phoneLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري التحقق...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>تأكيد</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneStep('form');
                    setPhoneOtp('');
                    setPhoneError(null);
                    setPhoneSuccess(null);
                  }}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
              </div>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || phoneLoading}
                className="w-full text-center text-sm text-emerald-600 hover:text-emerald-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `إعادة الإرسال متاحة بعد ${formatCountdown(resendCooldown)}` : 'إعادة إرسال الرمز'}
              </button>
            </form>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">البريد الإلكتروني</h2>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              البريد الحالي: <span className="font-medium">{user?.email || '-'}</span>
            </p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني الجديد
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور للتأكيد
              </label>
              <div className="relative">
                <input
                  type={showEmailPassword ? 'text' : 'password'}
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="أدخل كلمة المرور"
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPassword(!showEmailPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showEmailPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {emailError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            {emailSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{emailSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={emailLoading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {emailLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري التحديث...</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>تحديث البريد الإلكتروني</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
