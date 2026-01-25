'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Archive, 
  UserPlus, 
  ChevronLeft,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface ArchivedPage {
  href: string;
  label: string;
  labelEn: string;
  description: string;
  reason: string;
}

const archivedPages: ArchivedPage[] = [
  {
    href: '/admin/access-requests',
    label: 'طلبات الانضمام',
    labelEn: 'Access Requests',
    description: 'صفحة مراجعة طلبات الانضمام للمستخدمين الجدد',
    reason: 'تم استبدالها بنظام التحقق عبر OTP - المستخدمون يسجلون مباشرة الآن',
  },
];

export default function ArchivePage() {
  const [showWarning, setShowWarning] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Archive className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">الأرشيف</h1>
              <p className="text-gray-500">Archive</p>
            </div>
          </div>
          <p className="text-gray-600 mt-4">
            صفحات قديمة تم استبدالها بأنظمة جديدة. هذه الصفحات لا تزال تعمل للوصول إلى البيانات القديمة.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">تنبيه</h3>
              <p className="text-sm text-amber-700 mt-1">
                هذه الصفحات محفوظة للرجوع إليها عند الحاجة. البيانات القديمة لا تزال موجودة ويمكن الوصول إليها.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {archivedPages.map((page) => (
            <div 
              key={page.href}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="w-5 h-5 text-gray-400" />
                    <h3 className="font-bold text-gray-800">{page.label}</h3>
                    <span className="text-sm text-gray-500">({page.labelEn})</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{page.description}</p>
                  <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium text-gray-700">سبب الأرشفة: </span>
                    <span className="text-gray-600">{page.reason}</span>
                  </div>
                </div>
                <Link
                  href={page.href}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <span>فتح</span>
                  <ExternalLink size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {archivedPages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Archive className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>لا توجد صفحات مؤرشفة</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-[#1E3A5F] hover:underline"
          >
            <ChevronLeft size={20} />
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  );
}
