'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserX, UserCheck, Search, Filter, Mail, Phone,
  Loader2, ChevronDown, Link2, Calendar, ArrowUpDown, Check, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhoneDisplay } from '@/lib/phone-utils';

interface SuggestedMember {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  fatherName: string | null;
  generation: number | null;
  branch: string | null;
  lineageBranchName: string | null;
  similarity: number;
}

interface OrphanedUser {
  id: string;
  email: string;
  nameArabic: string;
  nameEnglish: string | null;
  phone: string | null;
  phoneVerified: boolean;
  role: string;
  status: string;
  verificationStatus: string;
  createdAt: string;
  lastLoginAt: string | null;
  suggestedMembers: SuggestedMember[];
}

interface Stats {
  total: number;
  orphaned: number;
  linked: number;
  percentage: number;
}

export default function AdminOrphanedPage() {
  const [users, setUsers] = useState<OrphanedUser[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, orphaned: 0, linked: 0, percentage: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { session } = useAuth();

  const fetchOrphanedUsers = useCallback(async () => {
    if (!session?.token) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const res = await fetch(`/api/admin/orphaned?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setStats(data.stats || { total: 0, orphaned: 0, linked: 0, percentage: 0 });
      }
    } catch (error) {
      console.error('Error fetching orphaned users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.token, searchQuery, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchOrphanedUsers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchOrphanedUsers]);

  const handleLinkUser = async (userId: string, memberId: string) => {
    if (!session?.token) return;
    
    setIsProcessing(true);
    setLinkingUserId(userId);
    setErrorMessage(null);
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/link`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ memberId }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccessMessage('تم ربط المستخدم بالعضو بنجاح');
        await fetchOrphanedUsers();
        setExpandedUser(null);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.messageAr || data.message || 'حدث خطأ');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error linking user:', error);
      setErrorMessage('حدث خطأ أثناء ربط المستخدم');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsProcessing(false);
      setLinkingUserId(null);
    }
  };

  const toggleSort = () => {
    if (sortBy === 'createdAt') {
      setSortBy('name');
    } else {
      setSortBy('createdAt');
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">نشط</span>;
      case 'PENDING':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">معلق</span>;
      case 'DISABLED':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">معطل</span>;
      default:
        return null;
    }
  };

  const getSimilarityBadge = (similarity: number) => {
    if (similarity >= 90) {
      return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">{similarity}% تطابق</span>;
    } else if (similarity >= 75) {
      return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">{similarity}% تطابق</span>;
    } else {
      return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{similarity}% تطابق</span>;
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6" dir="rtl">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <UserX className="text-orange-500" size={28} />
              المستخدمون غير المرتبطين
            </h1>
            <p className="text-gray-500 mt-1">حسابات المستخدمين التي ليس لها عضو مرتبط في شجرة العائلة</p>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
            <Check size={20} className="text-green-600" />
            <span className="text-green-800">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <X size={20} className="text-red-600" />
            <span className="text-red-800">{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-orange-500 text-white text-center shadow-lg">
            <UserX size={24} className="mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.orphaned}</p>
            <p className="text-sm opacity-80">غير مرتبط</p>
          </div>
          <div className="p-4 rounded-xl bg-green-500 text-white text-center shadow-lg">
            <UserCheck size={24} className="mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.linked}</p>
            <p className="text-sm opacity-80">مرتبط</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-500 text-white text-center shadow-lg">
            <Users size={24} className="mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm opacity-80">إجمالي المستخدمين</p>
          </div>
          <div className="p-4 rounded-xl bg-white border text-center">
            <div className="text-2xl font-bold text-gray-800">{stats.percentage}%</div>
            <p className="text-sm text-gray-500">نسبة غير المرتبطين</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو البريد أو رقم الهاتف..."
                className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:outline-none focus:border-green-500"
              />
            </div>

            <button
              onClick={toggleSort}
              className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
            >
              <ArrowUpDown size={18} />
              {sortBy === 'createdAt' ? 'تاريخ التسجيل' : 'الاسم'}
            </button>

            <button
              onClick={toggleSortOrder}
              className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
            >
              {sortOrder === 'desc' ? 'تنازلي' : 'تصاعدي'}
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                showFilters ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter size={18} />
              الفلاتر
              <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {users.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="text-green-500" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-700">جميع المستخدمين مرتبطين</h3>
            <p className="text-gray-500 mt-1">لا يوجد مستخدمين غير مرتبطين بأعضاء في الشجرة</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <p className="text-sm text-gray-600">
                عرض {users.length} مستخدم غير مرتبط
                {isLoading && <Loader2 className="inline-block mr-2 animate-spin" size={14} />}
              </p>
            </div>
            <div className="divide-y">
              {users.map(user => (
                <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserX className="text-orange-500" size={24} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800">
                          {user.nameArabic || user.nameEnglish || 'بدون اسم'}
                        </h3>
                        {getStatusBadge(user.status)}
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                          غير مرتبط
                        </span>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                        {user.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={14} className="text-gray-400" />
                            <span>{user.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-1">
                            <Phone size={14} className="text-gray-400" />
                            <span dir="ltr">{formatPhoneDisplay(user.phone)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar size={14} className="text-gray-400" />
                          <span>مسجل: {formatDate(user.createdAt)}</span>
                        </div>
                      </div>

                      {user.suggestedMembers.length > 0 && (
                        <div className="mt-3">
                          <button
                            onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                            className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                          >
                            <Link2 size={14} />
                            {user.suggestedMembers.length} اقتراحات للربط
                            <ChevronDown 
                              size={14} 
                              className={`transition-transform ${expandedUser === user.id ? 'rotate-180' : ''}`} 
                            />
                          </button>

                          {expandedUser === user.id && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                              <p className="text-xs text-gray-500 mb-2">أعضاء مقترحين للربط:</p>
                              {user.suggestedMembers.map(member => (
                                <div 
                                  key={member.id}
                                  className="flex items-center justify-between p-2 bg-white rounded-lg border hover:border-green-300 transition-colors"
                                >
                                  <div>
                                    <p className="font-medium text-gray-800">
                                      {member.fullNameAr || member.firstName}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      {member.generation && <span>الجيل: {member.generation}</span>}
                                      {member.lineageBranchName && <span>الفرع: {member.lineageBranchName}</span>}
                                      {getSimilarityBadge(member.similarity)}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleLinkUser(user.id, member.id)}
                                    disabled={isProcessing && linkingUserId === user.id}
                                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                                  >
                                    {isProcessing && linkingUserId === user.id ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Link2 size={14} />
                                    )}
                                    ربط
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {user.suggestedMembers.length === 0 && (
                        <p className="mt-2 text-xs text-gray-400">لا توجد اقتراحات - قد يحتاج المستخدم للربط اليدوي</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
