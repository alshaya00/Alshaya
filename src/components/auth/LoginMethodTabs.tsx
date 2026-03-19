'use client';

import React from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';

// ============================================
// Login Method Tabs
// ============================================

export function LoginMethodTabs({
  active,
  onChange,
}: {
  active: 'email' | 'phone';
  onChange: (method: 'email' | 'phone') => void;
}) {
  return (
    <div className="flex flex-row-reverse mb-6 bg-muted rounded-lg p-1">
      {(['phone', 'email'] as const).map((method) => (
        <button
          key={method}
          type="button"
          onClick={() => onChange(method)}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            active === method
              ? 'bg-background text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {method === 'phone' ? 'رقم الجوال' : 'البريد الإلكتروني'}
        </button>
      ))}
    </div>
  );
}

// ============================================
// Invite Code Link
// ============================================

export function InviteLink() {
  return (
    <div className="mt-6 text-center">
      <p className="text-muted-foreground mb-3">لديك رمز دعوة؟</p>
      <Link
        href="/invite"
        className="inline-flex items-center gap-2 px-6 py-2 border border-primary text-primary font-medium rounded-lg hover:bg-primary/5 transition-colors"
      >
        <Mail className="w-5 h-5" />
        استخدام رمز الدعوة
      </Link>
    </div>
  );
}
