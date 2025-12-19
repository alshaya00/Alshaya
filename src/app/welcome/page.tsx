'use client';

import Link from 'next/link';
import { CheckCircle, TreeDeciduous, Users, Search } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-teal-100" dir="rtl">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold text-emerald-800">
            آل شايع
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          {/* Welcome Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            مرحباً بك في عائلة آل شايع
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            تم تسجيل طلبك بنجاح وهو قيد المراجعة من قبل إدارة الموقع.
            سيتم إعلامك عبر البريد الإلكتروني عند الموافقة على طلبك.
          </p>

          {/* Info Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">ماذا يمكنك فعله بعد الموافقة؟</h2>

            <div className="grid md:grid-cols-3 gap-6 text-right">
              <div className="p-4 rounded-xl bg-emerald-50">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <TreeDeciduous className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">استكشاف الشجرة</h3>
                <p className="text-sm text-gray-600">
                  تصفح شجرة العائلة الكاملة واكتشف روابط القرابة
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">التواصل مع الأقارب</h3>
                <p className="text-sm text-gray-600">
                  تواصل مع أفراد العائلة وتعرف على أقاربك
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                  <Search className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">البحث المتقدم</h3>
                <p className="text-sm text-gray-600">
                  ابحث عن أي فرد من أفراد العائلة بسهولة
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              الذهاب للصفحة الرئيسية
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-emerald-600 text-emerald-600 font-medium rounded-lg hover:bg-emerald-50 transition-colors"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>شجرة عائلة آل شايع - نحفظ إرثنا، نربط أجيالنا</p>
      </footer>
    </div>
  );
}
