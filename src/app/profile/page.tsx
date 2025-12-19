'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLE_LABELS, STATUS_LABELS } from '@/lib/auth/types';
import { User, Mail, Phone, Shield, Calendar, GitBranch } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">الملف الشخصي</h1>
            <p className="text-gray-600 mt-1">معلومات حسابك في شجرة العائلة</p>
          </div>

          {user && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header Banner */}
                <div className="bg-gradient-to-l from-green-600 to-green-700 h-24" />

                {/* Avatar & Name */}
                <div className="px-6 pb-6">
                  <div className="-mt-12 flex items-end gap-4 mb-6">
                    <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-green-600">
                      <User size={40} />
                    </div>
                    <div className="pb-2">
                      <h2 className="text-xl font-bold text-gray-900">{user.nameArabic}</h2>
                      {user.nameEnglish && (
                        <p className="text-gray-500" dir="ltr">{user.nameEnglish}</p>
                      )}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid gap-4">
                    {/* Email */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <Mail size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                        <p className="font-medium text-gray-900" dir="ltr">{user.email}</p>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Shield size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">الدور</p>
                        <p className="font-medium text-gray-900">
                          {ROLE_LABELS[user.role].ar}
                          <span className="text-gray-400 text-sm mr-2">({ROLE_LABELS[user.role].en})</span>
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">حالة الحساب</p>
                        <p className="font-medium text-gray-900">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm ${
                            user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                            user.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'ACTIVE' ? 'bg-green-500' :
                              user.status === 'PENDING' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                            {STATUS_LABELS[user.status].ar}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Branch (if assigned) */}
                    {user.assignedBranch && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                          <GitBranch size={20} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">الفرع المسؤول عنه</p>
                          <p className="font-medium text-gray-900">{user.assignedBranch}</p>
                        </div>
                      </div>
                    )}

                    {/* Linked Member */}
                    {user.linkedMemberId && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">مرتبط بعضو في الشجرة</p>
                          <Link
                            href={`/member/${user.linkedMemberId}`}
                            className="font-medium text-green-600 hover:text-green-700"
                          >
                            عرض الملف الشخصي في الشجرة
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">إجراءات الحساب</h3>
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    لتعديل معلومات حسابك أو تغيير كلمة المرور، يرجى التواصل مع مدير النظام.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
