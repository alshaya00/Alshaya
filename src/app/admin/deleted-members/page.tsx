'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Trash2, 
  RotateCcw,
  ChevronLeft,
  Search,
  Calendar,
  User,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  GitMerge
} from 'lucide-react';
import Link from 'next/link';

interface DeletedMember {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  gender: string;
  generation: number | null;
  branch: string | null;
  birthYear: number | null;
  status: string;
  deletedAt: string;
  deletedBy: string | null;
  deletedReason: string | null;
  fatherId: string | null;
  fatherName: string | null;
}

type FilterPeriod = 'all' | '7days' | '30days' | '90days';

export default function DeletedMembersPage() {
  const { session } = useAuth();
  const [members, setMembers] = useState<DeletedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDeletedMembers();
  }, [session?.token]);

  const fetchDeletedMembers = async () => {
    if (!session?.token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/admin/deleted-members', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMembers(data.members);
      } else {
        setError(data.message || 'فشل في جلب البيانات');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const isMergedMember = (reason: string | null): boolean => {
    if (!reason) return false;
    return reason.includes('تم الدمج') || reason.includes('Merged into') || reason.includes('merged into');
  };

  const restoreMember = async (memberId: string, memberName: string) => {
    if (!session?.token) return;
    
    const confirmed = confirm(`هل أنت متأكد من استعادة العضو "${memberName}"؟\n\nسيعود العضو إلى قائمة الأعضاء النشطين.`);
    if (!confirmed) return;
    
    setRestoring(memberId);
    
    try {
      const res = await fetch(`/api/members/${memberId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
        setSuccessMessage(`تم استعادة "${memberName}" بنجاح`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        alert(`فشل الاستعادة: ${data.messageAr || data.message}`);
      }
    } catch (err) {
      alert('حدث خطأ أثناء الاستعادة');
    } finally {
      setRestoring(null);
    }
  };

  const undoMerge = async (memberId: string, memberName: string) => {
    if (!session?.token) return;
    
    const confirmed = confirm(`هل أنت متأكد من التراجع عن دمج العضو "${memberName}"؟\n\nسيتم استعادة العضو وإرجاع الأبناء إليه إن أمكن.`);
    if (!confirmed) return;
    
    setRestoring(memberId);
    
    try {
      const res = await fetch('/api/admin/undo-merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ memberId }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
        const childrenMsg = data.childrenRestored > 0 ? ` (تم إرجاع ${data.childrenRestored} أبناء)` : '';
        setSuccessMessage(`تم التراجع عن دمج "${memberName}" بنجاح${childrenMsg}`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        alert(`فشل التراجع عن الدمج: ${data.messageAr || data.message}`);
      }
    } catch (err) {
      alert('حدث خطأ أثناء التراجع عن الدمج');
    } finally {
      setRestoring(null);
    }
  };

  const getDaysAgo = (dateStr: string): number => {
    const deleted = new Date(dateStr);
    const now = new Date();
    const diffTime = now.getTime() - deleted.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const normalizeArabic = (text: string | null): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/[\u064B-\u0652]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ـ/g, '');
  };

  const filteredMembers = members.filter(member => {
    const normalizedSearch = normalizeArabic(searchTerm);
    const matchesSearch = !searchTerm || 
      normalizeArabic(member.firstName).includes(normalizedSearch) ||
      normalizeArabic(member.fullNameAr).includes(normalizedSearch) ||
      normalizeArabic(member.deletedReason).includes(normalizedSearch) ||
      member.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterPeriod === 'all') return true;
    
    const daysAgo = getDaysAgo(member.deletedAt);
    switch (filterPeriod) {
      case '7days': return daysAgo <= 7;
      case '30days': return daysAgo <= 30;
      case '90days': return daysAgo <= 90;
      default: return true;
    }
  });

  const totalMerged = members.filter(m => isMergedMember(m.deletedReason)).length;
  const totalOtherDeleted = members.filter(m => !isMergedMember(m.deletedReason)).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/admin" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ChevronLeft size={20} />
            <span>العودة للوحة التحكم</span>
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">الأعضاء المحذوفين</h1>
              <p className="text-gray-500">Deleted Members</p>
            </div>
          </div>
          <p className="text-gray-600 mt-2">
            عرض الأعضاء المحذوفين أو المدمجين مع إمكانية استعادتهم
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-green-800">{successMessage}</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث بالاسم أو المعرف أو سبب الحذف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value as FilterPeriod)}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">كل الفترات</option>
                <option value="7days">آخر 7 أيام</option>
                <option value="30days">آخر 30 يوم</option>
                <option value="90days">آخر 90 يوم</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-800">{members.length}</div>
            <div className="text-gray-600 text-sm">إجمالي المحذوفين</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-blue-600">{totalMerged}</div>
            <div className="text-gray-600 text-sm">تم دمجهم</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-red-600">{totalOtherDeleted}</div>
            <div className="text-gray-600 text-sm">حذف مباشر</div>
          </div>
          {(searchTerm || filterPeriod !== 'all') && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-3xl font-bold text-purple-600">{filteredMembers.length}</div>
              <div className="text-gray-600 text-sm">نتائج البحث</div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchDeletedMembers}
              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">لا يوجد أعضاء محذوفين</p>
            {members.length > 0 && searchTerm && (
              <p className="text-gray-400 mt-2">لا توجد نتائج للبحث "{searchTerm}"</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => {
              const daysAgo = getDaysAgo(member.deletedAt);
              const isMerged = isMergedMember(member.deletedReason);
              
              return (
                <div 
                  key={member.id}
                  className={`bg-white rounded-xl border ${isMerged ? 'border-blue-200' : 'border-gray-200'} p-4 hover:shadow-md transition-shadow`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5 text-gray-400" />
                        <h3 className="font-bold text-gray-800">
                          {member.fullNameAr || member.firstName}
                        </h3>
                        <span className="text-xs text-gray-400 font-mono">{member.id}</span>
                        {isMerged && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                            <GitMerge className="w-3 h-3" />
                            دمج
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        {member.fatherName && (
                          <p>الأب: {member.fatherName}</p>
                        )}
                        {member.generation && (
                          <p>الجيل: {member.generation}</p>
                        )}
                        {member.branch && (
                          <p>الفرع: {member.branch}</p>
                        )}
                      </div>
                      
                      {member.deletedReason && (
                        <div className={`mt-2 p-2 rounded-lg text-sm ${isMerged ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
                          <span className="font-medium">السبب: </span>
                          {member.deletedReason}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-left min-w-[200px]">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(member.deletedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mb-3">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className={daysAgo <= 7 ? 'text-green-600' : daysAgo <= 30 ? 'text-yellow-600' : 'text-gray-500'}>
                          منذ {daysAgo} يوم
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        {isMerged ? (
                          <button
                            onClick={() => undoMerge(member.id, member.fullNameAr || member.firstName)}
                            disabled={restoring === member.id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                          >
                            {restoring === member.id ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>جاري التراجع...</span>
                              </>
                            ) : (
                              <>
                                <GitMerge className="w-4 h-4" />
                                <span>تراجع عن الدمج</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => restoreMember(member.id, member.fullNameAr || member.firstName)}
                            disabled={restoring === member.id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                          >
                            {restoring === member.id ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>جاري الاستعادة...</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-4 h-4" />
                                <span>استعادة</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">ملاحظة هامة</h3>
              <p className="text-sm text-amber-700 mt-1">
                الأعضاء المحذوفين يبقون في النظام ولا يُحذفون نهائياً. يمكنك استعادة أي عضو في أي وقت.
                عند التراجع عن دمج عضو، سيتم إرجاع الأبناء تلقائياً إن أمكن. قد تحتاج إلى مراجعة الصور والمدونات يدوياً.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
