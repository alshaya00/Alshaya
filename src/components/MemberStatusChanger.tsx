'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Loader2, X, Check } from 'lucide-react';

interface MemberStatusChangerProps {
  memberId: string;
  currentStatus: string;
  currentDeathYear: number | null;
  birthCalendar: string | null;
}

export default function MemberStatusChanger({
  memberId,
  currentStatus,
  currentDeathYear,
  birthCalendar,
}: MemberStatusChangerProps) {
  const { session } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [deathYear, setDeathYear] = useState<string>(currentDeathYear?.toString() || '');
  const [deathCalendar, setDeathCalendar] = useState<string>(birthCalendar || 'HIJRI');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';

  if (!isAdmin) return null;

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}`,
        },
        body: JSON.stringify({
          status,
          deathYear: status === 'Deceased' ? (deathYear ? parseInt(deathYear) : null) : null,
          deathCalendar: status === 'Deceased' ? deathCalendar : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.messageAr || data.message || 'فشل في تحديث الحالة');
      }

      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        title="تغيير حالة العضو"
      >
        <Heart size={14} />
        تغيير الحالة
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-l from-blue-500 to-blue-600 p-4 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">تغيير حالة العضو</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <Check size={18} />
                  تم تحديث الحالة بنجاح
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الحالة
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('Living')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                      status === 'Living'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg mb-1">💚</span>
                    <p className="font-medium">على قيد الحياة</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('Deceased')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                      status === 'Deceased'
                        ? 'border-gray-500 bg-gray-50 text-gray-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg mb-1">🕊️</span>
                    <p className="font-medium">متوفى</p>
                  </button>
                </div>
              </div>

              {status === 'Deceased' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      سنة الوفاة (اختياري)
                    </label>
                    <input
                      type="number"
                      value={deathYear}
                      onChange={(e) => setDeathYear(e.target.value)}
                      placeholder="مثال: 1445"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      التقويم
                    </label>
                    <select
                      value={deathCalendar}
                      onChange={(e) => setDeathCalendar(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="HIJRI">هجري</option>
                      <option value="GREGORIAN">ميلادي</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || success}
                className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ التغييرات'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
