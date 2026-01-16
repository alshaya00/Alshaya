'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Ban,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  Shield,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Check,
  UserX,
  UserCheck,
  Link2Off,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhoneDisplay } from '@/lib/phone-utils';

interface LinkedMember {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
}

interface UserData {
  id: string;
  email: string;
  nameArabic: string;
  nameEnglish: string | null;
  phone: string | null;
  phoneVerified: boolean;
  role: string;
  status: 'ACTIVE' | 'PENDING' | 'DISABLED';
  createdAt: string;
  lastLoginAt: string | null;
  linkedMemberId: string | null;
  linkedMember: LinkedMember | null;
}

type FilterStatus = 'all' | 'ACTIVE' | 'PENDING' | 'DISABLED';

export default function AdminUsersPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ total: 0, ACTIVE: 0, PENDING: 0, DISABLED: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    type: 'block' | 'unblock' | 'unlink';
    user: UserData;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = useCallback(async () => {
    if (!session?.token) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', limit.toString());

      if (filter !== 'all') {
        params.set('status', filter);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.counts) {
          setCounts(data.counts);
        }
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في جلب المستخدمين');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token, currentPage, filter, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleBlockUnblock = async (user: UserData, action: 'block' | 'unblock') => {
    if (!session?.token) return;
    setIsProcessing(true);

    try {
      const newStatus = action === 'block' ? 'DISABLED' : 'ACTIVE';
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await fetchUsers();
        setShowConfirmModal(null);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في تحديث المستخدم');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setError('حدث خطأ في تحديث المستخدم');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlink = async (user: UserData) => {
    if (!session?.token) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ userId: user.id, linkedMemberId: null }),
      });

      if (res.ok) {
        setSuccessMessage('تم فك ارتباط الحساب بالعضو بنجاح');
        await fetchUsers();
        setShowConfirmModal(null);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في فك ارتباط المستخدم');
      }
    } catch (err) {
      console.error('Error unlinking user:', err);
      setError('حدث خطأ في فك ارتباط المستخدم');
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = useMemo(() => ({
    total: counts.total,
    active: counts.ACTIVE,
    pending: counts.PENDING,
    disabled: counts.DISABLED,
  }), [counts]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            نشط
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            معلق
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <Ban className="w-3 h-3" />
            محظور
          </span>
        );
      default:
        return <span className="text-gray-500">{status}</span>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
            <Shield className="w-3 h-3" />
            مدير أعلى
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
            <Shield className="w-3 h-3" />
            مدير
          </span>
        );
      case 'EDITOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
            محرر
          </span>
        );
      case 'MEMBER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
            <User className="w-3 h-3" />
            عضو
          </span>
        );
      default:
        return <span className="text-gray-500">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
            <p className="text-white/80">
              إجمالي {total} مستخدم مسجل في النظام
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-sm text-gray-500">إجمالي المستخدمين</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-500">نشط</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">معلق</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.disabled}</p>
              <p className="text-sm text-gray-500">محظور</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد أو رقم الجوال..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as FilterStatus);
                setCurrentPage(1);
              }}
              className="border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">الكل</option>
              <option value="ACTIVE">نشط</option>
              <option value="PENDING">معلق</option>
              <option value="DISABLED">محظور</option>
            </select>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="mr-auto text-green-500 hover:text-green-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mr-auto text-red-500 hover:text-red-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Users className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">لا يوجد مستخدمين</p>
            <p className="text-sm">لم يتم العثور على أي مستخدمين مطابقين للبحث</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">البريد الإلكتروني</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">رقم الجوال</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الصلاحية</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الحالة</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">آخر دخول</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">تاريخ التسجيل</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{user.nameArabic}</p>
                          {user.nameEnglish && (
                            <p className="text-sm text-gray-500">{user.nameEnglish}</p>
                          )}
                          {user.linkedMember && (
                            <p className="text-xs text-blue-600 mt-1">
                              مرتبط بـ: {user.linkedMember.fullNameAr || user.linkedMember.firstName}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 text-sm" dir="ltr">{user.email}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3">
                        {user.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 text-sm" dir="ltr">
                              {formatPhoneDisplay(user.phone)}
                            </span>
                            {user.phoneVerified && (
                              <span className="text-green-500" title="موثق">
                                <Check className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {getStatusBadge(user.status)}
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateTime(user.lastLoginAt)}
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {user.role !== 'SUPER_ADMIN' && (
                            <>
                              {user.linkedMemberId && (
                                <button
                                  onClick={() => setShowConfirmModal({ type: 'unlink', user })}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="فك الارتباط"
                                >
                                  <Link2Off className="w-4 h-4" />
                                  فك الارتباط
                                </button>
                              )}
                              {user.status === 'ACTIVE' && (
                                <button
                                  onClick={() => setShowConfirmModal({ type: 'block', user })}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                  title="حظر المستخدم"
                                >
                                  <UserX className="w-4 h-4" />
                                  حظر
                                </button>
                              )}
                              {user.status === 'DISABLED' && (
                                <button
                                  onClick={() => setShowConfirmModal({ type: 'unblock', user })}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                  title="إلغاء الحظر"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  إلغاء الحظر
                                </button>
                              )}
                              {user.status === 'PENDING' && (
                                <span className="text-gray-400 text-sm">بانتظار التفعيل</span>
                              )}
                            </>
                          )}
                          {user.role === 'SUPER_ADMIN' && (
                            <span className="text-gray-400 text-sm">لا يمكن التعديل</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <p className="text-sm text-gray-600">
                  صفحة {currentPage} من {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                showConfirmModal.type === 'block' ? 'bg-red-100' : 
                showConfirmModal.type === 'unlink' ? 'bg-orange-100' : 'bg-green-100'
              }`}>
                {showConfirmModal.type === 'block' ? (
                  <UserX className="w-6 h-6 text-red-600" />
                ) : showConfirmModal.type === 'unlink' ? (
                  <Link2Off className="w-6 h-6 text-orange-600" />
                ) : (
                  <UserCheck className="w-6 h-6 text-green-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {showConfirmModal.type === 'block' ? 'حظر المستخدم' : 
                   showConfirmModal.type === 'unlink' ? 'فك ارتباط الحساب' : 'إلغاء حظر المستخدم'}
                </h3>
                <p className="text-gray-500">{showConfirmModal.user.nameArabic}</p>
              </div>
            </div>

            <p className="text-gray-600 mb-2">
              {showConfirmModal.type === 'block'
                ? 'هل أنت متأكد من حظر هذا المستخدم؟ لن يتمكن من تسجيل الدخول إلى حسابه.'
                : showConfirmModal.type === 'unlink'
                ? 'هل تريد فك ارتباط هذا الحساب بالعضو؟'
                : 'هل أنت متأكد من إلغاء حظر هذا المستخدم؟ سيتمكن من تسجيل الدخول مرة أخرى.'}
            </p>
            {showConfirmModal.type === 'unlink' && (
              <p className="text-gray-500 text-sm mb-4" dir="ltr">
                Unlink this account from the family member?
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 px-4 py-2.5 border rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isProcessing}
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (showConfirmModal.type === 'unlink') {
                    handleUnlink(showConfirmModal.user);
                  } else {
                    handleBlockUnblock(showConfirmModal.user, showConfirmModal.type);
                  }
                }}
                disabled={isProcessing}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 ${
                  showConfirmModal.type === 'block'
                    ? 'bg-red-600 hover:bg-red-700'
                    : showConfirmModal.type === 'unlink'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {showConfirmModal.type === 'block' ? (
                      <>
                        <UserX className="w-5 h-5" />
                        حظر
                      </>
                    ) : showConfirmModal.type === 'unlink' ? (
                      <>
                        <Link2Off className="w-5 h-5" />
                        فك الارتباط
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-5 h-5" />
                        إلغاء الحظر
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
