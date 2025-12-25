'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Shield } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, hasPermission } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || hasPermission('manage_admins');
        setIsAuthorized(isAdmin);
      } else {
        setIsAuthorized(false);
      }
    }
  }, [isLoading, isAuthenticated, user, hasPermission]);

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
            <p className="text-gray-500 mt-2">يرجى تسجيل الدخول للوصول إلى لوحة الإدارة</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => router.push('/login?redirect=/admin')}
              className="w-full py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] font-bold"
            >
              تسجيل الدخول
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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">غير مصرح</h1>
            <p className="text-gray-500 mt-2">ليس لديك صلاحية للوصول إلى لوحة الإدارة</p>
          </div>

          <div className="space-y-4">
            <Link
              href="/"
              className="block w-full py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] font-bold text-center"
            >
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
