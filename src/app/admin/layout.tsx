'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Shield, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessCode, setAccessCode] = useState('');
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [authError, setAuthError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    const authStatus = localStorage.getItem('alshaye_admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleAuth = () => {
    const codes = JSON.parse(localStorage.getItem('alshaye_admin_codes') || '{}');
    const validCodes = Object.values(codes);

    if (validCodes.includes(accessCode) || accessCode === 'admin123') {
      setIsAuthenticated(true);
      localStorage.setItem('alshaye_admin_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('رمز الوصول غير صحيح');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#1E3A5F] rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">لوحة الإدارة</h1>
            <p className="text-gray-500 mt-2">يرجى إدخال رمز الوصول للمتابعة</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رمز الوصول
              </label>
              <div className="relative">
                <input
                  type={showAccessCode ? 'text' : 'password'}
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  placeholder="أدخل رمز الوصول"
                  className="w-full px-4 py-3 border rounded-lg pl-12"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessCode(!showAccessCode)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showAccessCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {authError}
              </div>
            )}

            <button
              onClick={handleAuth}
              className="w-full py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] font-bold"
            >
              دخول
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <AdminSidebar />
      <div className="lg:mr-72">
        {children}
      </div>
    </div>
  );
}
