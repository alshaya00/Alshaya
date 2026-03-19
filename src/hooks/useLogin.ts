'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// Types
// ============================================

export type LoginMethod = 'email' | 'phone';
export type PhoneStep = 'phone' | 'otp';
export type AuthStep = 'login' | '2fa';

// ============================================
// URL Error Messages (Arabic / English bilingual)
// ============================================

const URL_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: 'فشل تسجيل الدخول عبر الحساب الخارجي',
  oauth_denied: 'تم إلغاء تسجيل الدخول',
  oauth_no_email: 'لم يتم توفير البريد الإلكتروني',
  oauth_invalid_state: 'جلسة غير صالحة، يرجى المحاولة مرة أخرى',
  account_pending: 'حسابك بانتظار الموافقة',
  account_disabled: 'تم تعطيل حسابك',
};

// ============================================
// Hook
// ============================================

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, verify2FA, setSessionFromOAuth } = useAuth();

  // --- Auth step state ---
  const [authStep, setAuthStep] = useState<AuthStep>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone');

  // --- Form fields ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [otpCode, setOtpCode] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // --- UI state ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ============================================
  // URL param error detection
  // ============================================

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const timeoutParam = searchParams.get('timeout');

    if (timeoutParam === 'true') {
      setError('انتهت جلستك بسبب عدم النشاط. يرجى تسجيل الدخول مرة أخرى');
    } else if (errorParam) {
      setError(URL_ERROR_MESSAGES[errorParam] || 'حدث خطأ');
    }
  }, [searchParams]);

  // ============================================
  // Countdown timers
  // ============================================

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // ============================================
  // Helpers
  // ============================================

  const formatCountdown = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const redirectAfterLogin = useCallback(
    (role?: string) => {
      const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
      router.push(isAdmin ? '/admin' : '/');
    },
    [router]
  );

  // ============================================
  // Email login
  // ============================================

  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      try {
        const result = await login(email, password, rememberMe);

        if (result.success) {
          redirectAfterLogin(result.user?.role);
        } else if (result.requires2FA) {
          setAuthStep('2fa');
        } else {
          setError(result.error || 'فشل تسجيل الدخول');
          if (result.error?.includes('attempts')) {
            const match = result.error.match(/(\d+)/);
            if (match) setRemainingAttempts(parseInt(match[1]));
          }
        }
      } catch {
        setError('حدث خطأ أثناء تسجيل الدخول');
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, rememberMe, login, redirectAfterLogin]
  );

  // ============================================
  // Phone OTP: send
  // ============================================

  const handleSendOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccessMessage(null);
      setIsLoading(true);

      try {
        const response = await fetch('/api/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, countryCode, purpose: 'LOGIN' }),
        });
        const data = await response.json();

        if (data.success) {
          setSuccessMessage('تم إرسال رمز التحقق إلى جوالك');
          setPhoneStep('otp');
          setCountdown(data.expiresIn || 600);
          setResendCooldown(60);
        } else {
          setError(data.error || 'فشل في إرسال رمز التحقق');
        }
      } catch {
        setError('حدث خطأ في إرسال رمز التحقق');
      } finally {
        setIsLoading(false);
      }
    },
    [phone, countryCode]
  );

  // ============================================
  // Phone OTP: verify
  // ============================================

  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      try {
        const response = await fetch('/api/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, countryCode, code: otpCode, purpose: 'LOGIN', rememberMe }),
        });
        const data = await response.json();

        if (data.success && data.user && data.token) {
          const expiresAt = rememberMe
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          setSessionFromOAuth({
            user: {
              id: data.user.id,
              email: data.user.email || '',
              nameArabic: data.user.nameArabic,
              nameEnglish: data.user.nameEnglish || '',
              phone: data.user.phone,
              role: data.user.role,
              status: 'ACTIVE',
              linkedMemberId: data.user.linkedMemberId,
            },
            token: data.token,
            expiresAt,
          });

          redirectAfterLogin(data.user?.role);
        } else {
          setError(data.error || 'رمز التحقق غير صحيح');
        }
      } catch {
        setError('حدث خطأ في التحقق');
      } finally {
        setIsLoading(false);
      }
    },
    [phone, countryCode, otpCode, rememberMe, setSessionFromOAuth, redirectAfterLogin]
  );

  // ============================================
  // Phone OTP: resend
  // ============================================

  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, countryCode, purpose: 'LOGIN' }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage('تم إعادة إرسال رمز التحقق');
        setCountdown(data.expiresIn || 600);
        setResendCooldown(60);
        setOtpCode('');
      } else {
        setError(data.error || 'فشل في إعادة إرسال الرمز');
      }
    } catch {
      setError('حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  }, [phone, countryCode, resendCooldown]);

  // ============================================
  // 2FA verification
  // ============================================

  const handle2FASubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      try {
        const result = await verify2FA(email, twoFactorCode, isBackupCode, rememberMe);

        if (result.success) {
          router.push('/');
        } else {
          setError(result.error || 'رمز التحقق غير صحيح');
        }
      } catch {
        setError('حدث خطأ أثناء التحقق');
      } finally {
        setIsLoading(false);
      }
    },
    [email, twoFactorCode, isBackupCode, rememberMe, verify2FA, router]
  );

  // ============================================
  // Navigation callbacks
  // ============================================

  const goBackFrom2FA = useCallback(() => {
    setAuthStep('login');
    setTwoFactorCode('');
    setError(null);
  }, []);

  const goBackFromOtp = useCallback(() => {
    setPhoneStep('phone');
    setOtpCode('');
    setError(null);
    setSuccessMessage(null);
  }, []);

  const switchLoginMethod = useCallback(
    (method: LoginMethod) => {
      setLoginMethod(method);
      setError(null);
      setSuccessMessage(null);
    },
    []
  );

  const toggleBackupCode = useCallback((checked: boolean) => {
    setIsBackupCode(checked);
    setTwoFactorCode('');
  }, []);

  // ============================================
  // Return
  // ============================================

  return {
    // Current step
    authStep,
    loginMethod,
    phoneStep,

    // Form fields
    email,
    setEmail,
    password,
    setPassword,
    phone,
    setPhone,
    countryCode,
    setCountryCode,
    otpCode,
    setOtpCode,
    twoFactorCode,
    setTwoFactorCode,
    isBackupCode,
    rememberMe,
    setRememberMe,

    // UI state
    isLoading,
    error,
    successMessage,
    remainingAttempts,
    countdown,
    resendCooldown,

    // Actions
    handleEmailSubmit,
    handleSendOtp,
    handleVerifyOtp,
    handleResendOtp,
    handle2FASubmit,

    // Navigation
    switchLoginMethod,
    goBackFrom2FA,
    goBackFromOtp,
    toggleBackupCode,

    // Helpers
    formatCountdown,
    clearError,
  };
}
