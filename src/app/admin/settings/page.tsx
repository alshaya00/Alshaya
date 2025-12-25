'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Users,
  UserPlus,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  type AdminRole,
  ALL_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  CATEGORY_LABELS,
  getPermissionsByCategory,
  getPermissionLabel,
} from '@/lib/permissions';

interface AdminUser {
  id: string;
  email: string;
  nameArabic: string;
  nameEnglish?: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  permissions?: string[];
}

export default function AdminSettingsPage() {
  const { user, isAuthenticated, isLoading: authLoading, getAuthHeader, hasPermission } = useAuth();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EDITOR' as AdminRole,
    permissions: ROLE_DEFAULT_PERMISSIONS['EDITOR'],
  });

  const [expandedCategories, setExpandedCategories] = useState<string[]>(['members', 'data', 'backup', 'audit', 'admin', 'history']);
  const permissionsByCategory = getPermissionsByCategory();

  const headers = getAuthHeader();

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users?role=ADMIN&role=SUPER_ADMIN', {
        headers,
      });
      if (!res.ok) {
        throw new Error('Failed to load admins');
      }
      const data = await res.json();
      const adminUsers = (data.users || []).filter((u: AdminUser) =>
        u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'
      );
      setAdmins(adminUsers);
    } catch (err) {
      console.error('Error loading admins:', err);
      setError('حدث خطأ أثناء تحميل المشرفين');
    } finally {
      setIsLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadAdmins();
    }
  }, [authLoading, isAuthenticated]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          email: newAdmin.email,
          password: newAdmin.password,
          nameArabic: newAdmin.name,
          role: newAdmin.role,
          status: 'ACTIVE',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.messageAr || 'فشل إضافة المشرف');
      }

      await loadAdmins();
      setNewAdmin({
        name: '',
        email: '',
        password: '',
        role: 'EDITOR',
        permissions: ROLE_DEFAULT_PERMISSIONS['EDITOR'],
      });
      setIsAddingAdmin(false);
      alert('تم إضافة المشرف بنجاح');
    } catch (err) {
      console.error('Error adding admin:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة المشرف');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAdmin = async () => {
    if (!editingAdmin) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          userId: editingAdmin.id,
          role: editingAdmin.role,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.messageAr || 'فشل تحديث المشرف');
      }

      await loadAdmins();
      setEditingAdmin(null);
      alert('تم تحديث المشرف بنجاح');
    } catch (err) {
      console.error('Error updating admin:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث المشرف');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAdminStatus = async (adminId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          userId: adminId,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.messageAr || 'فشل تغيير حالة المشرف');
      }

      await loadAdmins();
    } catch (err) {
      console.error('Error toggling admin status:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء تغيير حالة المشرف');
    }
  };

  const deleteAdmin = async (adminId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المشرف؟')) return;

    try {
      const res = await fetch(`/api/users?id=${adminId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.messageAr || 'فشل حذف المشرف');
      }

      await loadAdmins();
      alert('تم حذف المشرف بنجاح');
    } catch (err) {
      console.error('Error deleting admin:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء حذف المشرف');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#1E3A5F] mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !hasPermission('manage_admins')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">غير مصرح</h1>
            <p className="text-gray-500 mt-2">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/admin" className="text-sm text-[#1E3A5F] hover:underline">
              العودة للوحة الإدارة
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={loadAdmins}
            className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87]"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowRight className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">إعدادات المشرفين</h1>
                <p className="text-white/80 text-sm">Admin Settings & Permissions</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddingAdmin(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg"
            >
              <UserPlus className="w-5 h-5" />
              إضافة مشرف
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-[#1E3A5F]">{admins.length}</div>
            <div className="text-sm text-gray-500">إجمالي المشرفين</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {admins.filter(a => a.status === 'ACTIVE').length}
            </div>
            <div className="text-sm text-gray-500">نشط</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-red-600">
              {admins.filter(a => a.role === 'SUPER_ADMIN').length}
            </div>
            <div className="text-sm text-gray-500">مدير عام</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-blue-600">
              {admins.filter(a => a.role === 'ADMIN').length}
            </div>
            <div className="text-sm text-gray-500">مديرين</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              قائمة المشرفين
            </h2>
            <button
              onClick={loadAdmins}
              className="p-2 hover:bg-gray-200 rounded-lg"
              title="تحديث"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="divide-y">
            {admins.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                لا يوجد مشرفين
              </div>
            ) : (
              admins.map(admin => (
                <div
                  key={admin.id}
                  className={`p-4 ${admin.status !== 'ACTIVE' ? 'bg-gray-50 opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        admin.status === 'ACTIVE' ? 'bg-[#1E3A5F]' : 'bg-gray-400'
                      }`}>
                        <span className="text-white font-bold">
                          {admin.nameArabic?.charAt(0) || admin.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{admin.nameArabic || admin.email}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            admin.role === 'SUPER_ADMIN'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {admin.role === 'SUPER_ADMIN' ? 'مدير عام' : 'مدير'}
                          </span>
                          {admin.status !== 'ACTIVE' && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              معطل
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{admin.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAdminStatus(admin.id, admin.status)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title={admin.status === 'ACTIVE' ? 'تعطيل' : 'تفعيل'}
                      >
                        {admin.status === 'ACTIVE' ? (
                          <Lock className="w-4 h-4 text-red-500" />
                        ) : (
                          <Unlock className="w-4 h-4 text-green-500" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingAdmin(admin)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4 text-blue-500" />
                      </button>
                      {admin.role !== 'SUPER_ADMIN' && admin.id !== user?.id && (
                        <button
                          onClick={() => deleteAdmin(admin.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {(isAddingAdmin || editingAdmin) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <h3 className="font-bold text-lg mb-4">
              {editingAdmin ? 'تعديل مشرف' : 'إضافة مشرف جديد'}
            </h3>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الاسم <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingAdmin?.nameArabic || newAdmin.name}
                    onChange={(e) => editingAdmin
                      ? setEditingAdmin({ ...editingAdmin, nameArabic: e.target.value })
                      : setNewAdmin({ ...newAdmin, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                    disabled={!!editingAdmin}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    البريد الإلكتروني <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={editingAdmin?.email || newAdmin.email}
                    onChange={(e) => editingAdmin
                      ? setEditingAdmin({ ...editingAdmin, email: e.target.value })
                      : setNewAdmin({ ...newAdmin, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                    dir="ltr"
                    disabled={!!editingAdmin}
                  />
                </div>
              </div>

              {!editingAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    كلمة المرور <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    dir="ltr"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الدور
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['ADMIN', 'SUPER_ADMIN'] as const).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        if (editingAdmin) {
                          setEditingAdmin({ ...editingAdmin, role });
                        } else {
                          setNewAdmin({ ...newAdmin, role, permissions: ROLE_DEFAULT_PERMISSIONS[role] });
                        }
                      }}
                      className={`p-3 border-2 rounded-lg text-center transition-all ${
                        (editingAdmin?.role || newAdmin.role) === role
                          ? 'border-[#1E3A5F] bg-[#1E3A5F]/10 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`px-3 py-1 rounded text-xs font-medium ${
                        role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {role === 'SUPER_ADMIN' ? 'مدير عام' : 'مدير'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAdmin(false);
                    setEditingAdmin(null);
                  }}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={isSaving}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={editingAdmin ? handleUpdateAdmin : handleAddAdmin}
                  disabled={isSaving}
                  className="flex-1 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingAdmin ? 'حفظ التغييرات' : 'إضافة المشرف'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
