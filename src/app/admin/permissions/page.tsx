'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute, SuperAdminOnly } from '@/components/auth/ProtectedRoute';
import {
  PermissionMatrix,
  PermissionKey,
  UserRole,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  PERMISSION_CATEGORIES,
  ROLE_LABELS,
  USER_ROLES,
  DEFAULT_PERMISSION_MATRIX,
} from '@/lib/auth/types';

export default function PermissionsPage() {
  const { getAuthHeader } = useAuth();
  const [matrix, setMatrix] = useState<PermissionMatrix>(DEFAULT_PERMISSION_MATRIX);
  const [originalMatrix, setOriginalMatrix] = useState<PermissionMatrix>(DEFAULT_PERMISSION_MATRIX);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  useEffect(() => {
    // Check if matrix has changed
    setHasChanges(JSON.stringify(matrix) !== JSON.stringify(originalMatrix));
  }, [matrix, originalMatrix]);

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings?type=permissions', {
        headers: getAuthHeader(),
      });
      const data = await response.json();

      if (data.success && data.permissions) {
        setMatrix(data.permissions);
        setOriginalMatrix(data.permissions);
      }
    } catch (err) {
      setError('فشل تحميل الصلاحيات');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (role: UserRole, permission: PermissionKey) => {
    // Prevent modifying SUPER_ADMIN permissions (always has all permissions)
    if (role === 'SUPER_ADMIN') return;

    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: !prev[role][permission],
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          type: 'permissions',
          data: matrix,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOriginalMatrix(matrix);
        setSuccess('تم حفظ الصلاحيات بنجاح');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.messageAr || 'فشل حفظ الصلاحيات');
      }
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setMatrix(originalMatrix);
  };

  const handleResetToDefault = () => {
    if (confirm('هل أنت متأكد من إعادة تعيين جميع الصلاحيات للقيم الافتراضية؟')) {
      setMatrix(DEFAULT_PERMISSION_MATRIX);
    }
  };

  // Group permissions by category
  const permissionsByCategory = PERMISSION_KEYS.reduce((acc, key) => {
    const category = PERMISSION_LABELS[key].category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(key);
    return acc;
  }, {} as Record<string, PermissionKey[]>);

  // Roles to display (exclude SUPER_ADMIN from editable columns)
  const editableRoles: UserRole[] = ['ADMIN', 'BRANCH_LEADER', 'MEMBER', 'GUEST'];

  return (
    <ProtectedRoute requiredPermission="manage_permission_matrix">
      <SuperAdminOnly
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">غير مصرح</h2>
              <p className="text-gray-600">هذه الصفحة متاحة للمدير العام فقط</p>
              <Link href="/admin" className="mt-4 inline-block text-emerald-600 hover:text-emerald-800">
                العودة للوحة الإدارة
              </Link>
            </div>
          </div>
        }
      >
        <div className="min-h-screen bg-gray-50" dir="rtl">
          {/* Header */}
          <header className="bg-white shadow sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">إدارة مصفوفة الصلاحيات</h1>
                  <p className="text-gray-600 mt-1">تحكم في صلاحيات كل دور في النظام</p>
                </div>
                <div className="flex gap-3">
                  {hasChanges && (
                    <>
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        إلغاء التغييرات
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleResetToDefault}
                    className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    إعادة للافتراضي
                  </button>
                  <Link
                    href="/admin"
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    العودة
                  </Link>
                </div>
              </div>
            </div>
          </header>

          {/* Messages */}
          {error && (
            <div className="max-w-7xl mx-auto px-4 mt-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {error}
              </div>
            </div>
          )}
          {success && (
            <div className="max-w-7xl mx-auto px-4 mt-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                {success}
              </div>
            </div>
          )}

          {/* Content */}
          <main className="max-w-7xl mx-auto px-4 py-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-r-transparent"></div>
                <p className="mt-4 text-gray-600">جاري تحميل الصلاحيات...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                {/* Legend */}
                <div className="p-4 bg-gray-50 border-b">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                      <span>مسموح</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      <span>غير مسموح</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-500 rounded"></div>
                      <span>المدير العام (كل الصلاحيات)</span>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-right py-3 px-4 font-medium text-gray-700 sticky right-0 bg-gray-100 z-10">
                          الصلاحية
                        </th>
                        <th className="py-3 px-4 font-medium text-purple-700 text-center min-w-[100px]">
                          {ROLE_LABELS.SUPER_ADMIN.ar}
                        </th>
                        {editableRoles.map((role) => (
                          <th key={role} className="py-3 px-4 font-medium text-gray-700 text-center min-w-[100px]">
                            {ROLE_LABELS[role].ar}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                        <React.Fragment key={category}>
                          {/* Category Header */}
                          <tr className="bg-gray-50">
                            <td
                              colSpan={editableRoles.length + 2}
                              className="py-2 px-4 font-semibold text-gray-800"
                            >
                              {PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES]?.ar || category}
                            </td>
                          </tr>
                          {/* Permission Rows */}
                          {permissions.map((permission) => (
                            <tr key={permission} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 sticky right-0 bg-white z-10">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {PERMISSION_LABELS[permission].ar}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {PERMISSION_LABELS[permission].en}
                                  </p>
                                </div>
                              </td>
                              {/* Super Admin (always enabled) */}
                              <td className="py-3 px-4 text-center">
                                <div className="flex justify-center">
                                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              </td>
                              {/* Other Roles */}
                              {editableRoles.map((role) => (
                                <td key={role} className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => handleToggle(role, permission)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                      matrix[role][permission]
                                        ? 'bg-emerald-500 hover:bg-emerald-600'
                                        : 'bg-gray-200 hover:bg-gray-300'
                                    }`}
                                  >
                                    {matrix[role][permission] ? (
                                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    )}
                                  </button>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">ملاحظات مهمة</h3>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>المدير العام لديه جميع الصلاحيات ولا يمكن تعديلها</li>
                <li>مسؤول الفرع يمكنه فقط إدارة أفراد فرعه المعين</li>
                <li>التغييرات تطبق فوراً على جميع المستخدمين بالدور المحدد</li>
                <li>يُنصح بالحذر عند تعديل صلاحيات العرض للزوار</li>
              </ul>
            </div>
          </main>
        </div>
      </SuperAdminOnly>
    </ProtectedRoute>
  );
}
