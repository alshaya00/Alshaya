'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle } from 'lucide-react';

function OAuthSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setSessionFromOAuth } = useAuth();

  useEffect(() => {
    const data = searchParams.get('data');
    const redirect = searchParams.get('redirect') || '/';

    if (data) {
      try {
        const sessionData = JSON.parse(decodeURIComponent(data));

        // Store session data
        if (sessionData.token && sessionData.user) {
          setSessionFromOAuth(sessionData);

          // Redirect after a short delay
          setTimeout(() => {
            router.push(redirect);
          }, 1500);
        } else {
          router.push('/login?error=oauth_failed');
        }
      } catch (e) {
        console.error('Failed to parse OAuth data:', e);
        router.push('/login?error=oauth_failed');
      }
    } else {
      router.push('/login?error=oauth_failed');
    }
  }, [searchParams, router, setSessionFromOAuth]);

  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">تم تسجيل الدخول بنجاح!</h1>
      <p className="text-gray-600">جاري التحويل...</p>
      <div className="mt-6">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" />
      </div>
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-teal-100" dir="rtl">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <Suspense
              fallback={
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" />
                </div>
              }
            >
              <OAuthSuccessContent />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
