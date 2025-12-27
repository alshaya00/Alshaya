'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function SyncDataPage() {
  const { user, token } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, [token]);

  const checkStatus = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/sync-data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to check status:', err);
    }
    setLoading(false);
  };

  const syncData = async () => {
    if (!token) return;
    
    setSyncing(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/sync-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ confirm: true })
      });
      const data = await res.json();
      setResult(data);
      await checkStatus();
    } catch (err: any) {
      setResult({ error: err.message });
    }
    setSyncing(false);
  };

  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">غير مصرح</h1>
        <p className="mt-2 text-gray-600">هذه الصفحة للمسؤولين فقط</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">مزامنة البيانات</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">حالة قاعدة البيانات</h2>
        
        {loading ? (
          <p className="text-gray-500">جاري التحميل...</p>
        ) : status ? (
          <div className="space-y-2">
            <p>
              <span className="font-medium">عدد الأعضاء الحالي:</span>{' '}
              <span className="text-2xl font-bold text-blue-600">{status.currentMembers}</span>
            </p>
            <p>
              <span className="font-medium">عدد الأعضاء المتوقع:</span>{' '}
              <span className="text-2xl font-bold text-green-600">{status.expectedMembers}</span>
            </p>
            {status.needsSync ? (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium">
                  ⚠️ البيانات تحتاج مزامنة - يوجد {status.expectedMembers - status.currentMembers} عضو مفقود
                </p>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">✅ البيانات متزامنة</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-red-500">فشل في جلب الحالة</p>
        )}
      </div>

      {status?.needsSync && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">مزامنة البيانات</h2>
          <p className="text-gray-600 mb-4">
            سيتم استبدال جميع بيانات الأعضاء بالبيانات المصدرة من بيئة التطوير.
          </p>
          <button
            onClick={syncData}
            disabled={syncing}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? 'جاري المزامنة...' : 'بدء المزامنة'}
          </button>
        </div>
      )}

      {result && (
        <div className={`rounded-lg shadow-md p-6 ${result.error ? 'bg-red-50' : 'bg-green-50'}`}>
          <h2 className="text-xl font-semibold mb-2">
            {result.error ? '❌ فشل' : '✅ نجاح'}
          </h2>
          {result.error ? (
            <p className="text-red-600">{result.error}</p>
          ) : (
            <div className="space-y-1">
              <p>العدد السابق: {result.previousCount}</p>
              <p>العدد الجديد: {result.newCount}</p>
              <p className="text-green-700 font-medium">{result.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
