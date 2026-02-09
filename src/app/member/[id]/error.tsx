'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

export default function MemberError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Member page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen py-8 bg-gray-100" dir="rtl">
      <div className="container mx-auto px-4 max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            حدث خطأ في تحميل الصفحة
          </h2>
          <p className="text-gray-500 mb-6">
            عذراً، لم نتمكن من تحميل بيانات هذا العضو. يرجى المحاولة مرة أخرى.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            >
              <RefreshCw size={18} />
              إعادة المحاولة
            </button>
            <Link
              href="/registry"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <ArrowRight size={18} />
              العودة إلى السجل
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
