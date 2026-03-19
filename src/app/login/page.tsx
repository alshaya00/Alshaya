'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { GuestOnly } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useLogin } from '@/hooks/useLogin';
import { EmailLoginForm } from '@/components/auth/EmailLoginForm';
import { PhoneLoginForm } from '@/components/auth/PhoneLoginForm';
import { TwoFactorForm } from '@/components/auth/TwoFactorForm';
import { LoginMethodTabs, InviteLink } from '@/components/auth/LoginMethodTabs';

function LoginForm() {
  const h = useLogin();
  const showTabs = h.authStep === 'login' && h.phoneStep === 'phone';

  return (
    <GuestOnly redirectTo="/">
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-teal-100" dir="rtl">
        <header className="py-6 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-primary">آل شايع</Link>
            <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              طلب الانضمام
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <Card className="shadow-xl rounded-2xl">
              <CardHeader className="text-center pb-2">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">تسجيل الدخول</h1>
                <p className="text-muted-foreground mt-2">مرحباً بك في شجرة عائلة آل شايع</p>
              </CardHeader>

              <CardContent>
                {h.error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>
                      <p className="font-medium">{h.error}</p>
                      {h.remainingAttempts !== null && h.remainingAttempts > 0 && (
                        <p className="text-sm mt-1">المحاولات المتبقية: {h.remainingAttempts}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {h.successMessage && (
                  <Alert variant="success" className="mb-6">
                    <AlertDescription>
                      <p className="font-medium">{h.successMessage}</p>
                    </AlertDescription>
                  </Alert>
                )}

                {h.authStep === '2fa' ? (
                  <TwoFactorForm
                    twoFactorCode={h.twoFactorCode}
                    onCodeChange={h.setTwoFactorCode}
                    isBackupCode={h.isBackupCode}
                    onToggleBackupCode={h.toggleBackupCode}
                    onSubmit={h.handle2FASubmit}
                    onBack={h.goBackFrom2FA}
                    isLoading={h.isLoading}
                  />
                ) : (
                  <>
                    {showTabs && <LoginMethodTabs active={h.loginMethod} onChange={h.switchLoginMethod} />}

                    {h.loginMethod === 'email' ? (
                      <EmailLoginForm
                        email={h.email} onEmailChange={h.setEmail}
                        password={h.password} onPasswordChange={h.setPassword}
                        rememberMe={h.rememberMe} onRememberMeChange={h.setRememberMe}
                        onSubmit={h.handleEmailSubmit} isLoading={h.isLoading}
                      />
                    ) : (
                      <PhoneLoginForm
                        phoneStep={h.phoneStep} phone={h.phone} countryCode={h.countryCode}
                        onPhoneChange={(p, c) => { h.setPhone(p); h.setCountryCode(c); }}
                        rememberMe={h.rememberMe} onRememberMeChange={h.setRememberMe}
                        onSendOtp={h.handleSendOtp} otpCode={h.otpCode} onOtpChange={h.setOtpCode}
                        onVerifyOtp={h.handleVerifyOtp} onResendOtp={h.handleResendOtp}
                        onBackFromOtp={h.goBackFromOtp}
                        countdown={h.countdown} resendCooldown={h.resendCooldown}
                        formatCountdown={h.formatCountdown} isLoading={h.isLoading}
                      />
                    )}

                    {showTabs && <InviteLink />}
                  </>
                )}
              </CardContent>
            </Card>

            <p className="text-center mt-6 text-muted-foreground">
              ليس لديك حساب؟{' '}
              <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
                طلب الانضمام للعائلة
              </Link>
            </p>
          </div>
        </main>

        <footer className="py-6 text-center text-muted-foreground text-sm">
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
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
