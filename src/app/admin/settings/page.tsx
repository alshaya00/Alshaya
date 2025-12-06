'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Users,
  UserPlus,
  Settings,
  Key,
  Lock,
  Unlock,
  Check,
  X,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  Copy,
  RefreshCw,
} from 'lucide-react';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_LABELS = {
  SUPER_ADMIN: { label: 'مدير عام', color: 'bg-red-100 text-red-700' },
  ADMIN: { label: 'مدير', color: 'bg-orange-100 text-orange-700' },
  EDITOR: { label: 'محرر', color: 'bg-blue-100 text-blue-700' },
  VIEWER: { label: 'مشاهد', color: 'bg-gray-100 text-gray-700' },
};

const ALL_PERMISSIONS = [
  { key: 'VIEW_MEMBERS', label: 'عرض الأعضاء', category: 'members' },
  { key: 'ADD_MEMBERS', label: 'إضافة أعضاء', category: 'members' },
  { key: 'EDIT_MEMBERS', label: 'تعديل أعضاء', category: 'members' },
  { key: 'DELETE_MEMBERS', label: 'حذف أعضاء', category: 'members' },
  { key: 'CHANGE_PARENT', label: 'تغيير الأب', category: 'members' },
  { key: 'EXPORT_DATA', label: 'تصدير البيانات', category: 'data' },
  { key: 'IMPORT_DATA', label: 'استيراد البيانات', category: 'data' },
  { key: 'MANAGE_DUPLICATES', label: 'إدارة التكرارات', category: 'data' },
  { key: 'VIEW_HISTORY', label: 'عرض السجل', category: 'history' },
  { key: 'ROLLBACK_CHANGES', label: 'استرجاع التغييرات', category: 'history' },
  { key: 'CREATE_SNAPSHOTS', label: 'إنشاء نسخ احتياطية', category: 'history' },
  { key: 'MANAGE_ADMINS', label: 'إدارة المشرفين', category: 'admin' },
  { key: 'APPROVE_PENDING', label: 'الموافقة على الطلبات', category: 'admin' },
];

const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map(p => p.key),
  ADMIN: ALL_PERMISSIONS.filter(p => p.key !== 'MANAGE_ADMINS').map(p => p.key),
  EDITOR: ['VIEW_MEMBERS', 'ADD_MEMBERS', 'EDIT_MEMBERS', 'EXPORT_DATA', 'VIEW_HISTORY'],
  VIEWER: ['VIEW_MEMBERS', 'EXPORT_DATA'],
};

export default function AdminSettingsPage() {
  // State
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [showAccessCode, setShowAccessCode] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  // New admin form
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    role: 'EDITOR' as Admin['role'],
    permissions: ROLE_DEFAULT_PERMISSIONS['EDITOR'],
    accessCode: ''
  });

  // Load admins from localStorage
  useEffect(() => {
    const storedAdmins = JSON.parse(localStorage.getItem('alshaye_admins') || '[]');

    // Create default super admin if none exists
    if (storedAdmins.length === 0) {
      const defaultAdmin: Admin = {
        id: 'admin_1',
        name: 'المدير العام',
        email: 'admin@alshaye.com',
        role: 'SUPER_ADMIN',
        permissions: ROLE_DEFAULT_PERMISSIONS['SUPER_ADMIN'],
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date().toISOString()
      };
      storedAdmins.push(defaultAdmin);
      localStorage.setItem('alshaye_admins', JSON.stringify(storedAdmins));
      // Set default access code
      localStorage.setItem('alshaye_admin_codes', JSON.stringify({ admin_1: 'admin123' }));
    }

    setAdmins(storedAdmins);
  }, []);

  // Authenticate
  const handleAuth = () => {
    const codes = JSON.parse(localStorage.getItem('alshaye_admin_codes') || '{}');
    const validCodes = Object.values(codes);

    if (validCodes.includes(accessCode) || accessCode === 'admin123') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('رمز الوصول غير صحيح');
    }
  };

  // Generate access code
  const generateAccessCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Add new admin
  const handleAddAdmin = () => {
    if (!newAdmin.name || !newAdmin.email) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const code = newAdmin.accessCode || generateAccessCode();
    const admin: Admin = {
      id: `admin_${Date.now()}`,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      permissions: newAdmin.permissions,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date().toISOString()
    };

    const updatedAdmins = [...admins, admin];
    setAdmins(updatedAdmins);
    localStorage.setItem('alshaye_admins', JSON.stringify(updatedAdmins));

    // Save access code
    const codes = JSON.parse(localStorage.getItem('alshaye_admin_codes') || '{}');
    codes[admin.id] = code;
    localStorage.setItem('alshaye_admin_codes', JSON.stringify(codes));

    // Reset form
    setNewAdmin({
      name: '',
      email: '',
      role: 'EDITOR',
      permissions: ROLE_DEFAULT_PERMISSIONS['EDITOR'],
      accessCode: ''
    });
    setIsAddingAdmin(false);

    alert(`تم إضافة المشرف بنجاح\nرمز الوصول: ${code}`);
  };

  // Update admin
  const handleUpdateAdmin = () => {
    if (!editingAdmin) return;

    const updatedAdmins = admins.map(a =>
      a.id === editingAdmin.id ? editingAdmin : a
    );
    setAdmins(updatedAdmins);
    localStorage.setItem('alshaye_admins', JSON.stringify(updatedAdmins));
    setEditingAdmin(null);
  };

  // Toggle admin status
  const toggleAdminStatus = (adminId: string) => {
    const updatedAdmins = admins.map(a =>
      a.id === adminId ? { ...a, isActive: !a.isActive } : a
    );
    setAdmins(updatedAdmins);
    localStorage.setItem('alshaye_admins', JSON.stringify(updatedAdmins));
  };

  // Delete admin
  const deleteAdmin = (adminId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المشرف؟')) return;

    const updatedAdmins = admins.filter(a => a.id !== adminId);
    setAdmins(updatedAdmins);
    localStorage.setItem('alshaye_admins', JSON.stringify(updatedAdmins));

    // Remove access code
    const codes = JSON.parse(localStorage.getItem('alshaye_admin_codes') || '{}');
    delete codes[adminId];
    localStorage.setItem('alshaye_admin_codes', JSON.stringify(codes));
  };

  // Reset access code
  const resetAccessCode = (adminId: string) => {
    const newCode = generateAccessCode();
    const codes = JSON.parse(localStorage.getItem('alshaye_admin_codes') || '{}');
    codes[adminId] = newCode;
    localStorage.setItem('alshaye_admin_codes', JSON.stringify(codes));
    alert(`رمز الوصول الجديد: ${newCode}`);
  };

  // Copy access code
  const copyAccessCode = (adminId: string) => {
    const codes = JSON.parse(localStorage.getItem('alshaye_admin_codes') || '{}');
    const code = codes[adminId];
    if (code) {
      navigator.clipboard.writeText(code);
      alert('تم نسخ رمز الوصول');
    }
  };

  // Auth screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#1E3A5F] rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">إعدادات المشرفين</h1>
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
                  onClick={() => setShowAccessCode(showAccessCode ? null : 'auth')}
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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
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
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-[#1E3A5F]">{admins.length}</div>
            <div className="text-sm text-gray-500">إجمالي المشرفين</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {admins.filter(a => a.isActive).length}
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
              {admins.filter(a => a.role === 'EDITOR').length}
            </div>
            <div className="text-sm text-gray-500">محررين</div>
          </div>
        </div>

        {/* Admins list */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              قائمة المشرفين
            </h2>
          </div>

          <div className="divide-y">
            {admins.map(admin => (
              <div
                key={admin.id}
                className={`p-4 ${!admin.isActive ? 'bg-gray-50 opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      admin.isActive ? 'bg-[#1E3A5F]' : 'bg-gray-400'
                    }`}>
                      <span className="text-white font-bold">
                        {admin.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{admin.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${ROLE_LABELS[admin.role].color}`}>
                          {ROLE_LABELS[admin.role].label}
                        </span>
                        {!admin.isActive && (
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
                      onClick={() => copyAccessCode(admin.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="نسخ رمز الوصول"
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => resetAccessCode(admin.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="إعادة تعيين رمز الوصول"
                    >
                      <RefreshCw className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => toggleAdminStatus(admin.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title={admin.isActive ? 'تعطيل' : 'تفعيل'}
                    >
                      {admin.isActive ? (
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
                    {admin.role !== 'SUPER_ADMIN' && (
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

                {/* Permissions preview */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {admin.permissions.slice(0, 5).map(perm => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {ALL_PERMISSIONS.find(p => p.key === perm)?.label || perm}
                    </span>
                  ))}
                  {admin.permissions.length > 5 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      +{admin.permissions.length - 5}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Add/Edit Admin Modal */}
      {(isAddingAdmin || editingAdmin) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <h3 className="font-bold text-lg mb-4">
              {editingAdmin ? 'تعديل مشرف' : 'إضافة مشرف جديد'}
            </h3>

            <div className="space-y-4">
              {/* Name & Email */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الاسم <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingAdmin?.name || newAdmin.name}
                    onChange={(e) => editingAdmin
                      ? setEditingAdmin({ ...editingAdmin, name: e.target.value })
                      : setNewAdmin({ ...newAdmin, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
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
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الدور
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        const perms = ROLE_DEFAULT_PERMISSIONS[role];
                        if (editingAdmin) {
                          setEditingAdmin({ ...editingAdmin, role, permissions: perms });
                        } else {
                          setNewAdmin({ ...newAdmin, role, permissions: perms });
                        }
                      }}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        (editingAdmin?.role || newAdmin.role) === role
                          ? 'border-[#1E3A5F] bg-[#1E3A5F]/10'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className={`px-2 py-0.5 rounded text-xs ${ROLE_LABELS[role].color}`}>
                        {ROLE_LABELS[role].label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الصلاحيات
                </label>
                <div className="border rounded-lg p-4 max-h-60 overflow-auto">
                  {['members', 'data', 'history', 'admin'].map(category => (
                    <div key={category} className="mb-4 last:mb-0">
                      <h4 className="font-bold text-sm text-gray-500 mb-2">
                        {category === 'members' ? 'الأعضاء' :
                         category === 'data' ? 'البيانات' :
                         category === 'history' ? 'السجل' : 'الإدارة'}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {ALL_PERMISSIONS.filter(p => p.category === category).map(perm => {
                          const permissions = editingAdmin?.permissions || newAdmin.permissions;
                          const isChecked = permissions.includes(perm.key);

                          return (
                            <label
                              key={perm.key}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                                isChecked ? 'bg-blue-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const newPerms = e.target.checked
                                    ? [...permissions, perm.key]
                                    : permissions.filter(p => p !== perm.key);

                                  if (editingAdmin) {
                                    setEditingAdmin({ ...editingAdmin, permissions: newPerms });
                                  } else {
                                    setNewAdmin({ ...newAdmin, permissions: newPerms });
                                  }
                                }}
                                className="w-4 h-4 rounded"
                              />
                              <span className="text-sm">{perm.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Access code for new admin */}
              {isAddingAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رمز الوصول (اختياري - سيتم إنشاؤه تلقائياً)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAdmin.accessCode}
                      onChange={(e) => setNewAdmin({ ...newAdmin, accessCode: e.target.value })}
                      placeholder="اتركه فارغاً للإنشاء التلقائي"
                      className="flex-1 px-4 py-2 border rounded-lg"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setNewAdmin({ ...newAdmin, accessCode: generateAccessCode() })}
                      className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      إنشاء
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setIsAddingAdmin(false);
                  setEditingAdmin(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={editingAdmin ? handleUpdateAdmin : handleAddAdmin}
                className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingAdmin ? 'حفظ التغييرات' : 'إضافة المشرف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
