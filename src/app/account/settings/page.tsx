'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Phone,
  Mail,
  Lock,
  Key,
  ArrowRight,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PhoneInput from '@/components/PhoneInput';
import OtpInput from '@/components/OtpInput';
import { formatPhoneDisplay } from '@/lib/phone-utils';
import { formatMemberId } from '@/lib/utils';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Avatar, AvatarFallback, getInitials } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { Spinner } from '@/components/ui/Spinner';

type PhoneStep = 'form' | 'otp';

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
        body: JSON.stringify({ newPhone: fullPhone, channel: 'sms' }),
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
        body: JSON.stringify({ newPhone: fullPhone, channel: 'sms' }),
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
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Spinner size="lg" label="جاري التحميل..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div dir="rtl">
      <PageLayout
        title="إعدادات الحساب"
        narrow
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'إعدادات الحساب' },
        ]}
        actions={
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        }
      >
        {/* Profile Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar size="xl" className="bg-primary/10">
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {getInitials(user?.nameArabic || '')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{user?.nameArabic}</h2>
                {user?.nameEnglish && (
                  <p className="text-sm text-muted-foreground">{user.nameEnglish}</p>
                )}
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{user?.email || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span dir="ltr">{maskPhone(user?.phone)}</span>
              </div>
              {user?.linkedMemberId && (
                <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                  <User className="w-4 h-4" />
                  <span>مرتبط بالعضو: </span>
                  <Badge variant="outline" size="sm">{formatMemberId(user.linkedMemberId)}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="password">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="password" className="flex-1">
              <Lock className="w-4 h-4 me-2" />
              كلمة المرور
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex-1">
              <Phone className="w-4 h-4 me-2" />
              رقم الجوال
            </TabsTrigger>
            <TabsTrigger value="email" className="flex-1">
              <Mail className="w-4 h-4 me-2" />
              البريد الإلكتروني
            </TabsTrigger>
          </TabsList>

          {/* Password Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  تغيير كلمة المرور
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="relative">
                    <Input
                      label="كلمة المرور الحالية"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الحالية"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute left-3 top-[38px] text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      label="كلمة المرور الجديدة"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الجديدة"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-[38px] text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      label="تأكيد كلمة المرور الجديدة"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور الجديدة"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-[38px] text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {passwordError && (
                    <Alert variant="destructive">
                      <AlertDescription>{passwordError}</AlertDescription>
                    </Alert>
                  )}

                  {passwordSuccess && (
                    <Alert variant="success">
                      <AlertDescription>{passwordSuccess}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    isLoading={passwordLoading}
                    leftIcon={<Key className="w-5 h-5" />}
                  >
                    تحديث كلمة المرور
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phone Tab */}
          <TabsContent value="phone">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  رقم الجوال
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 rounded-md bg-muted">
                  <p className="text-sm text-muted-foreground">
                    الرقم الحالي: <span dir="ltr" className="font-medium text-foreground">{maskPhone(user?.phone)}</span>
                  </p>
                </div>

                {phoneStep === 'form' ? (
                  <form onSubmit={handlePhoneSubmit} className="space-y-4">
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
                      <Alert variant="destructive">
                        <AlertDescription>{phoneError}</AlertDescription>
                      </Alert>
                    )}

                    {phoneSuccess && (
                      <Alert variant="success">
                        <AlertDescription>{phoneSuccess}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      fullWidth
                      isLoading={phoneLoading}
                      leftIcon={<Phone className="w-5 h-5" />}
                    >
                      إرسال رمز التحقق
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handlePhoneOtpVerify} className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      تم إرسال رمز التحقق إلى الرقم{' '}
                      <span dir="ltr" className="font-medium text-foreground">{phoneCountryCode}{newPhone}</span>
                    </p>

                    <OtpInput
                      value={phoneOtp}
                      onChange={setPhoneOtp}
                      error={undefined}
                    />

                    {otpExpiresIn > 0 && (
                      <p className="text-center text-sm text-muted-foreground">
                        ينتهي الرمز خلال: <span className="font-medium">{formatCountdown(otpExpiresIn)}</span>
                      </p>
                    )}

                    {phoneError && (
                      <Alert variant="destructive">
                        <AlertDescription>{phoneError}</AlertDescription>
                      </Alert>
                    )}

                    {phoneSuccess && (
                      <Alert variant="success">
                        <AlertDescription>{phoneSuccess}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        fullWidth
                        isLoading={phoneLoading}
                        leftIcon={<Key className="w-5 h-5" />}
                      >
                        تأكيد
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setPhoneStep('form');
                          setPhoneOtp('');
                          setPhoneError(null);
                          setPhoneSuccess(null);
                        }}
                      >
                        إلغاء
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="link"
                      fullWidth
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || phoneLoading}
                      className="text-sm"
                    >
                      {resendCooldown > 0 ? `إعادة الإرسال متاحة بعد ${formatCountdown(resendCooldown)}` : 'إعادة إرسال الرمز'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  البريد الإلكتروني
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 rounded-md bg-muted">
                  <p className="text-sm text-muted-foreground">
                    البريد الحالي: <span className="font-medium text-foreground">{user?.email || '-'}</span>
                  </p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <Input
                    label="البريد الإلكتروني الجديد"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="example@email.com"
                    dir="ltr"
                  />

                  <div className="relative">
                    <Input
                      label="كلمة المرور للتأكيد"
                      type={showEmailPassword ? 'text' : 'password'}
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailPassword(!showEmailPassword)}
                      className="absolute left-3 top-[38px] text-muted-foreground hover:text-foreground"
                    >
                      {showEmailPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {emailError && (
                    <Alert variant="destructive">
                      <AlertDescription>{emailError}</AlertDescription>
                    </Alert>
                  )}

                  {emailSuccess && (
                    <Alert variant="success">
                      <AlertDescription>{emailSuccess}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    isLoading={emailLoading}
                    leftIcon={<Mail className="w-5 h-5" />}
                  >
                    تحديث البريد الإلكتروني
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageLayout>
    </div>
  );
}
