'use client';

import React from 'react';
import OtpInput from '@/components/OtpInput';
import { Button } from '@/components/ui/Button';

interface OtpVerificationProps {
  /** Current OTP value */
  otpCode: string;
  /** Called when OTP changes */
  onOtpChange: (code: string) => void;
  /** Submit handler for the form */
  onSubmit: (e: React.FormEvent) => void;
  /** Resend OTP handler */
  onResend: () => void;
  /** Go back handler */
  onBack: () => void;
  /** Countdown in seconds until OTP expires */
  countdown: number;
  /** Cooldown in seconds before resend is allowed */
  resendCooldown: number;
  /** Format seconds to mm:ss */
  formatCountdown: (seconds: number) => string;
  /** Whether a request is in flight */
  isLoading: boolean;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Phone number display (for phone OTP) */
  phoneDisplay?: string;
  /** Label for the back button */
  backLabel: string;
  /** Label for the resend button */
  resendLabel: string;
  /** Label for the resend button during cooldown */
  resendCooldownLabel: string;
}

export function OtpVerification({
  otpCode,
  onOtpChange,
  onSubmit,
  onResend,
  onBack,
  countdown,
  resendCooldown,
  formatCountdown,
  isLoading,
  title,
  description,
  phoneDisplay,
  backLabel,
  resendLabel,
  resendCooldownLabel,
}: OtpVerificationProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
        {phoneDisplay && (
          <p className="text-primary font-medium" dir="ltr">
            {phoneDisplay}
          </p>
        )}
      </div>

      <OtpInput value={otpCode} onChange={onOtpChange} disabled={isLoading} />

      {countdown > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          صالح لمدة {formatCountdown(countdown)}
        </p>
      )}

      <Button
        type="submit"
        disabled={isLoading || otpCode.length < 6}
        isLoading={isLoading}
        fullWidth
        size="lg"
      >
        {isLoading ? 'جاري التحقق...' : 'تأكيد'}
      </Button>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          {backLabel}
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown > 0 || isLoading}
          className="text-primary hover:text-primary/80 text-sm disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
        >
          {resendCooldown > 0
            ? `${resendCooldownLabel} (${formatCountdown(resendCooldown)})`
            : resendLabel}
        </button>
      </div>
    </form>
  );
}
