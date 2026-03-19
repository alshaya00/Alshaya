'use client';

import React from 'react';
import PhoneInput from '@/components/PhoneInput';
import { Button } from '@/components/ui/Button';
import { OtpVerification } from './OtpVerification';

interface PhoneLoginFormProps {
  // Phone step
  phoneStep: 'phone' | 'otp';
  phone: string;
  onPhoneChange: (phone: string, countryCode: string) => void;
  countryCode: string;
  rememberMe: boolean;
  onRememberMeChange: (checked: boolean) => void;
  onSendOtp: (e: React.FormEvent) => void;

  // OTP step
  otpCode: string;
  onOtpChange: (code: string) => void;
  onVerifyOtp: (e: React.FormEvent) => void;
  onResendOtp: () => void;
  onBackFromOtp: () => void;
  countdown: number;
  resendCooldown: number;
  formatCountdown: (seconds: number) => string;

  isLoading: boolean;
}

export function PhoneLoginForm({
  phoneStep,
  phone,
  onPhoneChange,
  countryCode,
  rememberMe,
  onRememberMeChange,
  onSendOtp,
  otpCode,
  onOtpChange,
  onVerifyOtp,
  onResendOtp,
  onBackFromOtp,
  countdown,
  resendCooldown,
  formatCountdown,
  isLoading,
}: PhoneLoginFormProps) {
  if (phoneStep === 'otp') {
    return (
      <OtpVerification
        otpCode={otpCode}
        onOtpChange={onOtpChange}
        onSubmit={onVerifyOtp}
        onResend={onResendOtp}
        onBack={onBackFromOtp}
        countdown={countdown}
        resendCooldown={resendCooldown}
        formatCountdown={formatCountdown}
        isLoading={isLoading}
        title="أدخل رمز التحقق"
        description="تم إرسال رمز مكون من 6 أرقام إلى"
        phoneDisplay={`${countryCode} ${phone}`}
        backLabel="تغيير الرقم"
        resendLabel="إعادة إرسال الرمز"
        resendCooldownLabel="إعادة الإرسال"
      />
    );
  }

  return (
    <form onSubmit={onSendOtp} className="space-y-5">
      <PhoneInput
        value={phone}
        onChange={(p, c) => onPhoneChange(p, c)}
        countryCode={countryCode}
        required
      />

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => onRememberMeChange(e.target.checked)}
          className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
        />
        <span className="text-sm text-muted-foreground">تذكرني</span>
      </label>

      <Button
        type="submit"
        disabled={isLoading || !phone}
        isLoading={isLoading}
        fullWidth
        size="lg"
      >
        {isLoading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
      </Button>
    </form>
  );
}
