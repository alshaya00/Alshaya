'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GuestOnly } from '@/components/auth/ProtectedRoute';
import { Key, Check, X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Alert, AlertDescription, Spinner, Card, CardContent } from '@/components/ui';
import AuthPageLayout from '@/components/auth/AuthPageLayout';
import PhoneInput from '@/components/PhoneInput';

interface LinkedMemberInfo {
  id: string;
  name: string;
  fullNameAr?: string;
  fullNameEn?: string;
  generation?: number;
  branch?: string;
}

interface ValidatedInvitation {
  id: string;
  code: string;
  remainingUses: number;
  expiresAt: string;
}

function InvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code');

  const [code, setCode] = useState(codeParam || '');
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [validatedInvitation, setValidatedInvitation] = useState<ValidatedInvitation | null>(null);
  const [linkedMemberInfo, setLinkedMemberInfo] = useState<LinkedMemberInfo | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameArabic, setNameArabic] = useState('');
  const [nameEnglish, setNameEnglish] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (codeParam) {
      validateCode(codeParam);
    }
  }, [codeParam]);

  const validateCode = async (inviteCode: string) => {
    setIsValidating(true);
    setError(null);
    setValidatedInvitation(null);
    setLinkedMemberInfo(null);

    try {
      const response = await fetch('/api/invitations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.messageAr || data.message || 'فشل التحقق من رمز الدعوة');
        return;
      }

      if (!data.valid) {
        setError(data.messageAr || data.message || 'رمز الدعوة غير صالح');
        return;
      }

      setValidatedInvitation(data.invitation);
      setLinkedMemberInfo(data.linkedMemberInfo || null);

      if (data.linkedMemberInfo?.name) {
        setNameArabic(data.linkedMemberInfo.name);
      }
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

  const validateForm = (): string | null => {
    if (!email) return 'البريد الإلكتروني مطلوب';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'صيغة البريد الإلكتروني غير صحيحة';
    }
    if (!password) return 'كلمة المرور مطلوبة';
    if (password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    if (!/[A-Z]/.test(password)) return 'كلمة المرور يجب أن تحتوي على حرف كبير';
    if (!/[a-z]/.test(password)) return 'كلمة المرور يجب أن تحتوي على حرف صغير';
    if (!/[0-9]/.test(password)) return 'كلمة المرور يجب أن تحتوي على رقم';
    if (password !== confirmPassword) return 'كلمتا المرور غير متطابقتين';
    if (!nameArabic) return 'الاسم بالعربي مطلوب';
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register-with-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          email,
          password,
          nameArabic,
          nameEnglish,
          phone: phone ? `${countryCode}${phone}` : '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.messageAr || data.message || 'فشل إنشاء الحساب');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 3000);
    } catch {
      setError('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <GuestOnly redirectTo="/">
        <AuthPageLayout
          icon={<Check className="w-10 h-10 text-primary" />}
          title="تم إنشاء حسابك بنجاح!"
          subtitle="مرحباً بك في شجرة عائلة آل شايع. سيتم توجيهك لصفحة تسجيل الدخول."
        >
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-11 px-6 text-base rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
            >
              تسجيل الدخول الآن
            </Link>
          </div>
        </AuthPageLayout>
      </GuestOnly>
    );
  }

  return (
    <GuestOnly redirectTo="/">
      <AuthPageLayout
        icon={<Key className="w-8 h-8 text-primary" />}
        title="الانضمام بدعوة"
        subtitle={validatedInvitation ? 'أكمل إنشاء حسابك' : 'أدخل رمز الدعوة للانضمام'}
        headerLink={{ href: '/login', label: 'تسجيل الدخول' }}
        maxWidth="max-w-lg"
      >
        {error && (
          <Alert variant="destructive" className="mb-6" dismissible onDismiss={() => setError(null)}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!validatedInvitation && (
          <form onSubmit={handleValidateCode} className="space-y-4">
            <Input
              label="رمز الدعوة"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="text-center font-mono text-lg tracking-wider"
              placeholder="XXXXX"
              dir="ltr"
              autoFocus
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isValidating}
              disabled={!code.trim()}
            >
              تحقق من الرمز
            </Button>
          </form>
        )}

        {validatedInvitation && (
          <>
            {linkedMemberInfo && (
              <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    العضو المرتبط
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">الاسم:</span>{' '}
                      <span className="font-medium">{linkedMemberInfo.name}</span>
                    </p>
                    {linkedMemberInfo.branch && (
                      <p>
                        <span className="text-muted-foreground">الفرع:</span>{' '}
                        <span className="font-medium">{linkedMemberInfo.branch}</span>
                      </p>
                    )}
                    {linkedMemberInfo.generation && (
                      <p>
                        <span className="text-muted-foreground">الجيل:</span>{' '}
                        <span className="font-medium">{linkedMemberInfo.generation}</span>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Alert variant="info" className="mb-6">
              <AlertDescription>
                رمز الدعوة صالح - الاستخدامات المتبقية: {validatedInvitation.remainingUses}
              </AlertDescription>
            </Alert>

            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                type="email"
                label="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                dir="ltr"
                required
                leftIcon={<Mail size={16} />}
              />

              <Input
                label="الاسم بالعربي"
                value={nameArabic}
                onChange={(e) => setNameArabic(e.target.value)}
                placeholder="أحمد محمد آل شايع"
                required
                leftIcon={<User size={16} />}
              />

              <Input
                label="الاسم بالإنجليزي (اختياري)"
                value={nameEnglish}
                onChange={(e) => setNameEnglish(e.target.value)}
                placeholder="Ahmed Al-Shaya"
                dir="ltr"
              />

              <PhoneInput
                value={phone}
                onChange={(newPhone, newCountryCode) => {
                  setPhone(newPhone);
                  setCountryCode(newCountryCode);
                }}
                countryCode={countryCode}
                label="رقم الهاتف (اختياري)"
              />

              <Input
                type={showPassword ? 'text' : 'password'}
                label="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                required
                helperText="8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم"
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pointer-events-auto cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                label="تأكيد كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                required
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="pointer-events-auto cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
              >
                إنشاء الحساب
              </Button>

              <button
                type="button"
                onClick={() => {
                  setValidatedInvitation(null);
                  setLinkedMemberInfo(null);
                  setCode('');
                  setError(null);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setNameArabic('');
                  setNameEnglish('');
                  setPhone('');
                  setCountryCode('+966');
                }}
                className="w-full py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                استخدام رمز مختلف
              </button>
            </form>
          </>
        )}

        <div className="text-center mt-6 space-y-2">
          <p className="text-muted-foreground">
            ليس لديك رمز دعوة؟{' '}
            <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              طلب الانضمام
            </Link>
          </p>
          <p className="text-muted-foreground">
            لديك حساب؟{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </AuthPageLayout>
    </GuestOnly>
  );
}

export default function InvitePage() {
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
      <InvitePageContent />
    </Suspense>
  );
}
