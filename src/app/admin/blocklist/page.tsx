'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Ban,
  Phone,
  Mail,
  Loader2,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Search,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface BlocklistItem {
  id: string;
  type: 'PHONE' | 'EMAIL';
  value: string;
  reason: string | null;
  blockedAt: string;
  blockedBy: string | null;
  blockedByName: string | null;
  relatedUserId: string | null;
  relatedUserName: string | null;
}

type FilterType = 'all' | 'PHONE' | 'EMAIL';

export default function AdminBlocklistPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<BlocklistItem[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<BlocklistItem | null>(null);

  const [newType, setNewType] = useState<'PHONE' | 'EMAIL'>('PHONE');
  const [newValue, setNewValue] = useState('');
  const [newReason, setNewReason] = useState('');

  const fetchItems = useCallback(async () => {
    if (!session?.token) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('type', filter);
      }

      const res = await fetch(`/api/admin/blocklist?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في جلب القائمة السوداء');
      }
    } catch (err) {
      console.error('Error fetching blocklist:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token, filter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddBlock = async () => {
    if (!session?.token || !newValue.trim()) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/blocklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          type: newType,
          value: newValue.trim(),
          reason: newReason.trim() || null,
        }),
      });

      if (res.ok) {
        setSuccessMessage('تم الإضافة للقائمة السوداء بنجاح');
        setShowAddModal(false);
        setNewValue('');
        setNewReason('');
        setNewType('PHONE');
        await fetchItems();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في الإضافة للقائمة السوداء');
      }
    } catch (err) {
      console.error('Error adding to blocklist:', err);
      setError('حدث خطأ في الإضافة للقائمة السوداء');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (item: BlocklistItem) => {
    if (!session?.token) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/blocklist?id=${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (res.ok) {
        setSuccessMessage('تم الإزالة من القائمة السوداء بنجاح');
        setShowDeleteModal(null);
        await fetchItems();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.messageAr || 'فشل في الإزالة من القائمة السوداء');
      }
    } catch (err) {
      console.error('Error removing from blocklist:', err);
      setError('حدث خطأ في الإزالة من القائمة السوداء');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTypeBadge = (type: 'PHONE' | 'EMAIL') => {
    if (type === 'PHONE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <Phone className="w-3 h-3" />
          رقم جوال
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Mail className="w-3 h-3" />
        بريد إلكتروني
      </span>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Ban className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">القائمة السوداء</h1>
              <p className="text-white/80">
                إجمالي {total} عنصر محظور
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            إضافة جديد
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilter('PHONE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'PHONE'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Phone className="w-4 h-4" />
            أرقام الجوال
          </button>
          <button
            onClick={() => setFilter('EMAIL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'EMAIL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            البريد الإلكتروني
          </button>
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

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Ban className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">لا توجد عناصر محظورة</p>
            <p className="text-sm">القائمة السوداء فارغة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">النوع</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">القيمة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">السبب</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المستخدم المرتبط</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">تاريخ الحظر</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">من قام بالحظر</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {getTypeBadge(item.type)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900 font-medium" dir="ltr">
                        {item.value}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 text-sm">
                        {item.reason || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 text-sm">
                        {item.relatedUserName || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(item.blockedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 text-sm">
                        {item.blockedByName || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setShowDeleteModal(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="إزالة من القائمة السوداء"
                      >
                        <Trash2 className="w-4 h-4" />
                        إزالة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">إضافة للقائمة السوداء</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewValue('');
                  setNewReason('');
                  setNewType('PHONE');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  النوع
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'PHONE' | 'EMAIL')}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="PHONE">رقم جوال</option>
                  <option value="EMAIL">بريد إلكتروني</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  القيمة
                </label>
                <input
                  type={newType === 'EMAIL' ? 'email' : 'tel'}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={newType === 'EMAIL' ? 'example@email.com' : '+966xxxxxxxxx'}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  السبب (اختياري)
                </label>
                <textarea
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="سبب الحظر..."
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={handleAddBlock}
                disabled={isProcessing || !newValue.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                إضافة للقائمة السوداء
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewValue('');
                  setNewReason('');
                  setNewType('PHONE');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">تأكيد الإزالة</h2>
              <button
                onClick={() => setShowDeleteModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-600">
                هل أنت متأكد من إزالة{' '}
                <span className="font-medium text-gray-900" dir="ltr">
                  {showDeleteModal.value}
                </span>{' '}
                من القائمة السوداء؟
              </p>
              <p className="text-sm text-gray-500 mt-2">
                سيتمكن هذا {showDeleteModal.type === 'PHONE' ? 'الرقم' : 'البريد'} من التسجيل مرة أخرى.
              </p>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => handleDelete(showDeleteModal)}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                نعم، إزالة
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
