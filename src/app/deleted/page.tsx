'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Trash2,
  RotateCcw,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Users,
  Search,
} from 'lucide-react';
import type { FamilyMember } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface DeletedMember extends FamilyMember {
  deletedAt: string;
  deletedBy: string | null;
  deletedReason: string | null;
}

function DeletedMembersContent() {
  const [deletedMembers, setDeletedMembers] = useState<DeletedMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    async function fetchDeletedMembers() {
      try {
        const res = await fetch('/api/members/deleted', {
          headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setDeletedMembers(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching deleted members:', error);
      } finally {
        setIsLoading(false);
      }
    }
    if (session?.token) {
      fetchDeletedMembers();
    }
  }, [session?.token]);

  const restoreMember = async (memberId: string) => {
    setRestoring(memberId);
    setMessage(null);

    try {
      const res = await fetch(`/api/members/${memberId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}`,
        },
      });

      if (res.ok) {
        setDeletedMembers(prev => prev.filter(m => m.id !== memberId));
        setMessage({ type: 'success', text: 'تمت استعادة العضو بنجاح' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: `فشلت الاستعادة: ${err.error || 'خطأ غير معروف'}` });
      }
    } catch (error) {
      console.error('Error restoring member:', error);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الاستعادة' });
    } finally {
      setRestoring(null);
    }
  };

  const filteredMembers = deletedMembers.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.firstName?.toLowerCase().includes(query) ||
      member.fullNameAr?.toLowerCase().includes(query) ||
      member.id.includes(query) ||
      member.deletedReason?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-gradient-to-l from-red-700 to-red-500 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/duplicates"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowRight className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Trash2 className="w-7 h-7" />
                  المحذوفين مؤخراً
                </h1>
                <p className="text-white/80 text-sm">Recently Deleted Members</p>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-2">
              <span className="text-lg font-bold">{deletedMembers.length}</span>
              <span className="text-white/80 text-sm mr-2">عضو محذوف</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث بالاسم أو الرقم أو السبب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">جاري التحميل...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">
              {deletedMembers.length === 0 ? 'لا يوجد أعضاء محذوفين' : 'لا توجد نتائج'}
            </h3>
            <p className="text-gray-500">
              {deletedMembers.length === 0
                ? 'جميع الأعضاء نشطين في النظام'
                : 'لا يوجد أعضاء مطابقين لعملية البحث'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          member.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
                        }`}
                      >
                        <User
                          className={`w-6 h-6 ${
                            member.gender === 'Male' ? 'text-blue-600' : 'text-pink-600'
                          }`}
                        />
                      </div>

                      <div>
                        <h3 className="font-bold text-lg text-gray-800">
                          {member.fullNameAr || member.firstName}
                        </h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                          <span>رقم: {member.id}</span>
                          <span>الجيل: {member.generation}</span>
                          {member.branch && <span>الفرع: {member.branch}</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => restoreMember(member.id)}
                      disabled={restoring !== null}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {restoring === member.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                      استعادة
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">تاريخ الحذف:</span>
                        <span>{formatDate(member.deletedAt)}</span>
                      </div>

                      {member.deletedReason && (
                        <div className="flex items-start gap-2 text-gray-600">
                          <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span className="text-gray-500">السبب:</span>
                          <span className="text-red-600">{member.deletedReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {deletedMembers.length > 0 && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-bold text-yellow-800">ملاحظة مهمة</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  الأعضاء المحذوفين لا يظهرون في شجرة العائلة أو في نتائج البحث.
                  يمكنك استعادتهم في أي وقت بالضغط على زر &quot;استعادة&quot;.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DeletedMembersPage() {
  return (
    <ProtectedRoute redirectTo="/login" requiredRole={['SUPER_ADMIN', 'ADMIN']}>
      <DeletedMembersContent />
    </ProtectedRoute>
  );
}
