'use client';

import React from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface EmailLoginFormProps {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  rememberMe: boolean;
  onRememberMeChange: (checked: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function EmailLoginForm({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  rememberMe,
  onRememberMeChange,
  onSubmit,
  isLoading,
}: EmailLoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Input
        type="email"
        label="البريد الإلكتروني"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="example@email.com"
        required
        autoComplete="email"
        dir="ltr"
        className="h-12"
      />

      <Input
        type="password"
        label="كلمة المرور"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        placeholder="••••••••"
        required
        autoComplete="current-password"
        dir="ltr"
        className="h-12"
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => onRememberMeChange(e.target.checked)}
            className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">تذكرني</span>
        </label>
        <Link
          href="/forgot-password"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          نسيت كلمة المرور؟
        </Link>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        isLoading={isLoading}
        fullWidth
        size="lg"
      >
        {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
      </Button>
    </form>
  );
}
