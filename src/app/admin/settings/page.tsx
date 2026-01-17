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
  Search,
  ArrowUpCircle,
  User,
  Phone,
  Mail,
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
  phone?: string;
  linkedMemberId?: string;
}

interface PromotableUser {
  id: string;
  email: string;
  nameArabic: string;
  nameEnglish?: string;
  phone?: string;
  role: string;
  status: string;
  linkedMemberId?: string;
}

type TabType = 'add-new' | 'promote-existing';

export default function AdminSettingsPage() {
  const { user, isAuthenticated, isLoading: authLoading, getAuthHeader, hasPermission } = useAuth();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TabType>('add-new');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PromotableUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);
  const [selectedRoleForPromotion, setSelectedRoleForPromotion] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');

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

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}&status=ACTIVE`, {
        headers,
      });
      if (!res.ok) {
        throw new Error('Failed to search users');
      }
      const data = await res.json();
      const promotableUsers = (data.users || []).filter((u: PromotableUser) =>
        u.role === 'MEMBER' || u.role === 'EDITOR' || u.role === 'BRANCH_LEADER'
      );
      setSearchResults(promotableUsers);
    } catch (err) {
      console.error('Error searching users:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [headers]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (activeTab === 'promote-existing') {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, activeTab, searchUsers]);

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

  const handlePromoteUser = async (userId: string, targetRole: 'ADMIN' | 'SUPER_ADMIN') => {
    const userToPromote = searchResults.find(u => u.id === userId);
    if (!userToPromote) return;

    const roleLabel = targetRole === 'SUPER_ADMIN' ? 'مدير عام' : 'مدير';
    const confirmed = confirm(`هل أنت متأكد من ترقية "${userToPromote.nameArabic}" إلى ${roleLabel}؟`);
    if (!confirmed) return;

    setPromotingUserId(userId);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          userId: userId,
          role: targetRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.messageAr || 'فشل ترقية المستخدم');
      }

      await loadAdmins();
      setSearchResults(prev => prev.filter(u => u.id !== userId));
      alert(`تم ترقية "${userToPromote.nameArabic}" إلى ${roleLabel} بنجاح`);
    } catch (err) {
      console.error('Error promoting user:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء ترقية المستخدم');
    } finally {
      setPromotingUserId(null);
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'MEMBER': return 'عضو';
      case 'EDITOR': return 'محرر';
      case 'BRANCH_LEADER': return 'قائد فرع';
      case 'ADMIN': return 'مدير';
      case 'SUPER_ADMIN': return 'مدير عام';
      default: return role;
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

  if (!isAuthenticated || !hasPermission('change_user_roles')) {
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
              {editingAdmin ? 'تعديل مشرف' : 'إضافة / ترقية مشرف'}
            </h3>

            {!editingAdmin && (
              <div className="flex border-b mb-6">
                <button
                  onClick={() => setActiveTab('add-new')}
                  className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                    activeTab === 'add-new'
                      ? 'border-b-2 border-[#1E3A5F] text-[#1E3A5F] bg-blue-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <UserPlus className="w-4 h-4 inline-block ml-2" />
                  إضافة مشرف جديد
                </button>
                <button
                  onClick={() => setActiveTab('promote-existing')}
                  className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                    activeTab === 'promote-existing'
                      ? 'border-b-2 border-[#1E3A5F] text-[#1E3A5F] bg-blue-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4 inline-block ml-2" />
                  ترقية مستخدم حالي
                </button>
              </div>
            )}

            {(activeTab === 'add-new' || editingAdmin) && (
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
            )}

            {activeTab === 'promote-existing' && !editingAdmin && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البحث عن مستخدم
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث بالاسم أو البريد الإلكتروني أو رقم الهاتف..."
                      className="w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    سيتم عرض المستخدمين النشطين من الأعضاء والمحررين وقادة الفروع فقط
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الدور المستهدف
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRoleForPromotion('ADMIN')}
                      className={`p-3 border-2 rounded-lg text-center transition-all ${
                        selectedRoleForPromotion === 'ADMIN'
                          ? 'border-[#1E3A5F] bg-[#1E3A5F]/10 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        مدير
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleForPromotion('SUPER_ADMIN')}
                      className={`p-3 border-2 rounded-lg text-center transition-all ${
                        selectedRoleForPromotion === 'SUPER_ADMIN'
                          ? 'border-[#1E3A5F] bg-[#1E3A5F]/10 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                        مدير عام
                      </span>
                    </button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <span className="text-sm font-medium text-gray-600">
                      نتائج البحث ({searchResults.length})
                    </span>
                  </div>
                  
                  {isSearching ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F] mx-auto mb-2" />
                      <p className="text-sm text-gray-500">جاري البحث...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {searchQuery.trim() ? (
                        <>
                          <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>لا يوجد مستخدمين مطابقين</p>
                        </>
                      ) : (
                        <>
                          <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>ابدأ بالبحث للعثور على المستخدمين</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y max-h-64 overflow-auto">
                      {searchResults.map(userItem => (
                        <div key={userItem.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-500" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{userItem.nameArabic}</span>
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                    {getRoleLabel(userItem.role)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                  {userItem.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {userItem.email}
                                    </span>
                                  )}
                                  {userItem.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {userItem.phone}
                                    </span>
                                  )}
                                </div>
                                {userItem.linkedMemberId && (
                                  <div className="text-xs text-green-600 mt-1">
                                    مرتبط بعضو في الشجرة
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handlePromoteUser(userItem.id, selectedRoleForPromotion)}
                              disabled={promotingUserId === userItem.id}
                              className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              {promotingUserId === userItem.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  جاري الترقية...
                                </>
                              ) : (
                                <>
                                  <ArrowUpCircle className="w-4 h-4" />
                                  ترقية إلى {selectedRoleForPromotion === 'SUPER_ADMIN' ? 'مدير عام' : 'مدير'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAdmin(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
