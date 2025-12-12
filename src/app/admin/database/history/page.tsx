'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  Search,
  Filter,
  ChevronLeft,
  RefreshCw,
  User,
  Calendar,
  Clock,
  Edit,
  Plus,
  Trash2,
  RotateCcw,
  ChevronDown,
  X,
} from 'lucide-react';

interface ChangeHistoryItem {
  id: string;
  memberId: string;
  memberName?: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changeType: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  batchId: string | null;
  reason: string | null;
}

export default function HistoryPage() {
  const [changes, setChanges] = useState<ChangeHistoryItem[]>([]);
  const [filteredChanges, setFilteredChanges] = useState<ChangeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedChange, setSelectedChange] = useState<ChangeHistoryItem | null>(null);
  const [filters, setFilters] = useState({
    changeType: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [changes, searchQuery, filters]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/history?limit=500');
      const data = await res.json();
      setChanges(data.changes || []);
    } catch (error) {
      console.error('Error loading history:', error);
      // Load from localStorage as fallback
      const stored = localStorage.getItem('alshaye_change_history');
      if (stored) {
        setChanges(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...changes];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.memberId.toLowerCase().includes(query) ||
          c.fieldName.toLowerCase().includes(query) ||
          c.changedByName.toLowerCase().includes(query) ||
          (c.memberName && c.memberName.toLowerCase().includes(query))
      );
    }

    if (filters.changeType) {
      result = result.filter((c) => c.changeType === filters.changeType);
    }

    if (filters.dateFrom) {
      result = result.filter((c) => new Date(c.changedAt) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      result = result.filter((c) => new Date(c.changedAt) <= new Date(filters.dateTo));
    }

    setFilteredChanges(result);
  };

  const getChangeTypeInfo = (type: string) => {
    switch (type) {
      case 'CREATE':
        return { label: 'إضافة', icon: Plus, color: 'bg-green-100 text-green-700' };
      case 'UPDATE':
        return { label: 'تعديل', icon: Edit, color: 'bg-blue-100 text-blue-700' };
      case 'DELETE':
        return { label: 'حذف', icon: Trash2, color: 'bg-red-100 text-red-700' };
      case 'PARENT_CHANGE':
        return { label: 'تغيير الأب', icon: RotateCcw, color: 'bg-purple-100 text-purple-700' };
      case 'RESTORE':
        return { label: 'استعادة', icon: RotateCcw, color: 'bg-orange-100 text-orange-700' };
      default:
        return { label: type, icon: History, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const groupByDate = (items: ChangeHistoryItem[]) => {
    const groups: Record<string, ChangeHistoryItem[]> = {};
    items.forEach((item) => {
      const date = new Date(item.changedAt).toLocaleDateString('ar-SA');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });
    return groups;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل سجل التغييرات...</p>
        </div>
      </div>
    );
  }

  const groupedChanges = groupByDate(filteredChanges);

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">لوحة التحكم</Link>
          <ChevronLeft className="w-4 h-4" />
          <Link href="/admin/database" className="hover:text-gray-700">قاعدة البيانات</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-gray-800">سجل التغييرات</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">سجل التغييرات</h1>
              <p className="text-sm text-gray-500">ChangeHistory - {filteredChanges.length} سجل</p>
            </div>
          </div>
          <button
            onClick={loadHistory}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
            تحديث
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالعضو، الحقل، أو المستخدم..."
              className="w-full pr-10 pl-4 py-2 border rounded-lg"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
              showFilters ? 'bg-purple-50 border-purple-200' : ''
            }`}
          >
            <Filter className="w-5 h-5" />
            الفلاتر
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع التغيير</label>
              <select
                value={filters.changeType}
                onChange={(e) => setFilters({ ...filters, changeType: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">الكل</option>
                <option value="CREATE">إضافة</option>
                <option value="UPDATE">تعديل</option>
                <option value="DELETE">حذف</option>
                <option value="PARENT_CHANGE">تغيير الأب</option>
                <option value="RESTORE">استعادة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {Object.entries(groupedChanges).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600">لا توجد سجلات</h3>
            <p className="text-gray-400">لم يتم العثور على تغييرات مطابقة للبحث</p>
          </div>
        ) : (
          Object.entries(groupedChanges).map(([date, items]) => (
            <div key={date} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="font-bold text-gray-700">{date}</span>
                <span className="text-sm text-gray-500">({items.length} تغيير)</span>
              </div>
              <div className="divide-y">
                {items.map((change) => {
                  const typeInfo = getChangeTypeInfo(change.changeType);
                  const TypeIcon = typeInfo.icon;
                  return (
                    <div
                      key={change.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedChange(change)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.color}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={`px-2 py-0.5 rounded text-xs ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className="mr-2 font-medium text-gray-800">
                                {change.fieldName}
                              </span>
                              <span className="text-gray-500 text-sm">
                                - العضو: {change.memberId}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              {formatDate(change.changedAt)}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            {change.oldValue && (
                              <span className="text-red-600 bg-red-50 px-2 py-1 rounded">
                                - {change.oldValue}
                              </span>
                            )}
                            {change.newValue && (
                              <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                                + {change.newValue}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                            <User className="w-4 h-4" />
                            {change.changedByName}
                            {change.reason && (
                              <span className="text-gray-400">• {change.reason}</span>
                            )}
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">تفاصيل التغيير</h3>
              <button
                onClick={() => setSelectedChange(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">معرف التغيير</label>
                  <p className="font-mono text-sm">{selectedChange.id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">معرف العضو</label>
                  <p className="font-mono text-sm">{selectedChange.memberId}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500">نوع التغيير</label>
                <p className={`inline-block px-2 py-1 rounded text-sm ${getChangeTypeInfo(selectedChange.changeType).color}`}>
                  {getChangeTypeInfo(selectedChange.changeType).label}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-500">الحقل</label>
                <p className="font-medium">{selectedChange.fieldName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">القيمة القديمة</label>
                  <p className="bg-red-50 text-red-700 p-2 rounded text-sm">
                    {selectedChange.oldValue || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">القيمة الجديدة</label>
                  <p className="bg-green-50 text-green-700 p-2 rounded text-sm">
                    {selectedChange.newValue || '-'}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500">بواسطة</label>
                <p>{selectedChange.changedByName}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">التاريخ</label>
                <p>{formatDate(selectedChange.changedAt)}</p>
              </div>

              {selectedChange.reason && (
                <div>
                  <label className="text-sm text-gray-500">السبب</label>
                  <p>{selectedChange.reason}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedChange(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
