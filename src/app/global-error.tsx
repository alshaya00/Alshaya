'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-gray-50">
        <div className="min-h-screen flex items-center justify-center" dir="rtl">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-800">حدث خطأ</h1>
              <p className="text-gray-500 mt-2">عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] font-bold transition-colors"
              >
                إعادة المحاولة
              </button>
              <a
                href="/"
                className="block w-full py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-bold text-center transition-colors"
              >
                العودة للرئيسية
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
