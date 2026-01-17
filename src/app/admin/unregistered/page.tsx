'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  UserX,
  UserCheck,
  Mail,
  Phone,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Send,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhoneDisplay } from '@/lib/phone-utils';
import Link from 'next/link';

interface MemberData {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  phone: string | null;
  email: string | null;
  generation: number;
  branch: string | null;
  gender: string;
  status: string;
  city: string | null;
}

interface Stats {
  totalMembers: number;
  registeredMembers: number;
  unregisteredMembers: number;
}

interface Filters {
  branches: string[];
  generations: number[];
}

export default function AdminUnregisteredPage() {
  const { session } = useAuth();
  const [members, setMembers] = useState<MemberData[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>({ totalMembers: 0, registeredMembers: 0, unregisteredMembers: 0 });
  const [filters, setFilters] = useState<Filters>({ branches: [], generations: [] });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchMembers = useCallback(async () => {
    if (!session?.token) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', limit.toString());

      if (selectedBranch) {
        params.set('branch', selectedBranch);
      }

      if (selectedGeneration) {
        params.set('generation', selectedGeneration);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const res = await fetch(`/api/admin/unregistered?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.filters) {
          setFilters(data.filters);
        }
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في جلب الأعضاء');
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token, currentPage, selectedBranch, selectedGeneration, debouncedSearch]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const registrationRate = useMemo(() => {
    if (stats.totalMembers === 0) return 0;
    return Math.round((stats.registeredMembers / stats.totalMembers) * 100);
  }, [stats]);

  const getDisplayName = (member: MemberData) => {
    return member.fullNameAr || member.firstName || 'غير محدد';
  };

  const getEnglishName = (member: MemberData) => {
    return member.fullNameEn || '';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الأعضاء غير المسجلين</h1>
            <p className="text-white/80">
              أعضاء العائلة الذين ليس لديهم حساب مستخدم مرتبط
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
              <p className="text-sm text-gray-500">إجمالي الأعضاء</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.registeredMembers}</p>
              <p className="text-sm text-gray-500">مسجلين</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <UserX className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.unregisteredMembers}</p>
              <p className="text-sm text-gray-500">غير مسجلين</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-bold text-sm">{registrationRate}%</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{registrationRate}%</p>
              <p className="text-sm text-gray-500">نسبة التسجيل</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="البحث بالاسم أو الهاتف أو البريد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
                showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span>فلترة</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">جميع الفروع</option>
                  {filters.branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الجيل</label>
                <select
                  value={selectedGeneration}
                  onChange={(e) => {
                    setSelectedGeneration(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">جميع الأجيال</option>
                  {filters.generations.map((gen) => (
                    <option key={gen} value={gen.toString()}>
                      الجيل {gen}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-500">جاري التحميل...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">لا يوجد أعضاء غير مسجلين</h3>
            <p className="text-gray-500">جميع الأعضاء لديهم حسابات مستخدمين مرتبطة</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الاسم</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الهاتف</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">البريد</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الجيل</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الفرع</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <Link
                            href={`/member/${member.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600"
                          >
                            {getDisplayName(member)}
                          </Link>
                          {getEnglishName(member) && (
                            <p className="text-sm text-gray-500">{getEnglishName(member)}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {member.phone ? (
                          <div className="flex items-center gap-1 text-gray-700">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span dir="ltr">{formatPhoneDisplay(member.phone)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {member.email ? (
                          <div className="flex items-center gap-1 text-gray-700">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{member.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          الجيل {member.generation}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {member.branch ? (
                          <span className="text-gray-700">{member.branch}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/invitations?email=${encodeURIComponent(member.email || '')}&name=${encodeURIComponent(getDisplayName(member))}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Send className="w-4 h-4" />
                            <span>إرسال دعوة</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  عرض {(currentPage - 1) * limit + 1} إلى {Math.min(currentPage * limit, total)} من {total} عضو
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 text-sm">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
