'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

interface TwoFactorFormProps {
  twoFactorCode: string;
  onCodeChange: (code: string) => void;
  isBackupCode: boolean;
  onToggleBackupCode: (checked: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function TwoFactorForm({
  twoFactorCode,
  onCodeChange,
  isBackupCode,
  onToggleBackupCode,
  onSubmit,
  onBack,
  isLoading,
}: TwoFactorFormProps) {
  const codeLength = isBackupCode ? 8 : 6;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          المصادقة الثنائية
        </h2>
        <p className="text-muted-foreground mt-1">
          أدخل الرمز من تطبيق المصادقة
        </p>
      </div>

      <div>
        <input
          type="text"
          value={twoFactorCode}
          onChange={(e) =>
            onCodeChange(
              e.target.value.replace(/\D/g, '').slice(0, codeLength)
            )
          }
          className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring text-center text-2xl tracking-widest transition-colors"
          placeholder={isBackupCode ? 'XXXX-XXXX' : '000000'}
          maxLength={isBackupCode ? 9 : 6}
          dir="ltr"
          autoFocus
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isBackupCode}
          onChange={(e) => onToggleBackupCode(e.target.checked)}
          className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
        />
        <span className="text-sm text-muted-foreground">
          استخدام رمز الاسترداد
        </span>
      </label>

      <Button
        type="submit"
        disabled={isLoading || twoFactorCode.length < codeLength}
        isLoading={isLoading}
        fullWidth
        size="lg"
      >
        {isLoading ? 'جاري التحقق...' : 'تأكيد'}
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        fullWidth
      >
        رجوع
      </Button>
    </form>
  );
}
