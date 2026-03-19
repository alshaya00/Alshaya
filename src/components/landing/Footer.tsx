'use client';

import Link from 'next/link';
import { familyInfo } from '@/config/constants';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10">
      <div className="container mx-auto px-4 text-center">
        <p className="text-white font-bold text-lg mb-1">{familyInfo.fullNameAr}</p>
        <p className="text-sm mb-6">{familyInfo.taglineAr}</p>

        <div className="flex items-center justify-center gap-6 mb-6">
          <Link href="/login" className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">
            تسجيل الدخول
          </Link>
          <span className="text-gray-600">|</span>
          <Link href="/register" className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">
            انضم للعائلة
          </Link>
          <span className="text-gray-600">|</span>
          <Link href="/contributors" className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">
            المساهمون
          </Link>
        </div>

        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} {familyInfo.fullNameEn}
        </p>
      </div>
    </footer>
  );
}
