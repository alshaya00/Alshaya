'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Save,
  ArrowRight,
} from 'lucide-react';
import type { FamilyMember } from '@/lib/types';

type SortField = keyof FamilyMember;
type SortDirection = 'asc' | 'desc';

export default function MembersTablePage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    gender: '',
    generation: '',
    status: '',
    branch: '',
  });

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [members, searchQuery, sortField, sortDirection, filters]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...members];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.id.toLowerCase().includes(query) ||
          m.firstName.toLowerCase().includes(query) ||
          (m.fullNameAr && m.fullNameAr.toLowerCase().includes(query)) ||
          (m.phone && m.phone.includes(query)) ||
          (m.email && m.email.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters.gender) {
      result = result.filter((m) => m.gender === filters.gender);
    }
    if (filters.generation) {
      result = result.filter((m) => m.generation === parseInt(filters.generation));
    }
    if (filters.status) {
      result = result.filter((m) => m.status === filters.status);
    }
    if (filters.branch) {
      result = result.filter((m) => m.branch === filters.branch);
    }

    // Apply sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'ar')
          : bVal.localeCompare(aVal, 'ar');
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    setFilteredMembers(result);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === paginatedMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(paginatedMembers.map((m) => m.id));
    }
  };

  const handleSelectMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`هل أنت متأكد من حذف ${selectedMembers.length} عضو؟`)) return;

    for (const id of selectedMembers) {
      try {
        await fetch(`/api/members/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.error(`Error deleting member ${id}:`, error);
      }
    }

    setSelectedMembers([]);
    loadMembers();
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    try {
      await fetch(`/api/members/${editingMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMember),
      });
      setEditingMember(null);
      loadMembers();
    } catch (error) {
      console.error('Error updating member:', error);
      alert('حدث خطأ أثناء تحديث العضو');
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(start, start + itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  // Get unique values for filters
  const generations = [...new Set(members.map((m) => m.generation))].sort();
  const branches = [...new Set(members.map((m) => m.branch).filter(Boolean))];

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل بيانات الأعضاء...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">لوحة التحكم</Link>
          <ChevronLeft className="w-4 h-4" />
          <Link href="/admin/database" className="hover:text-gray-700">قاعدة البيانات</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-gray-800">الأعضاء</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">جدول الأعضاء</h1>
              <p className="text-sm text-gray-500">FamilyMember - {filteredMembers.length} سجل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadMembers}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              title="تحديث"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <Link
              href="/export"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <Download className="w-5 h-5" />
              تصدير
            </Link>
            <Link
              href="/quick-add"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              <Plus className="w-5 h-5" />
              إضافة عضو
            </Link>
          </div>
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
              placeholder="البحث بالاسم، المعرف، الهاتف، أو البريد..."
              className="w-full pr-10 pl-4 py-2 border rounded-lg"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
              showFilters ? 'bg-blue-50 border-blue-200' : ''
            }`}
          >
            <Filter className="w-5 h-5" />
            الفلاتر
            {Object.values(filters).filter(Boolean).length > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">الكل</option>
                <option value="Male">ذكر</option>
                <option value="Female">أنثى</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الجيل</label>
              <select
                value={filters.generation}
                onChange={(e) => setFilters({ ...filters, generation: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">الكل</option>
                {generations.map((g) => (
                  <option key={g} value={g}>الجيل {g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">الكل</option>
                <option value="Living">على قيد الحياة</option>
                <option value="Deceased">متوفى</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
              <select
                value={filters.branch}
                onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">الكل</option>
                {branches.map((b) => (
                  <option key={b} value={b!}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedMembers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <span className="font-medium text-blue-800">
            تم تحديد {selectedMembers.length} عضو
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMembers([])}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              إلغاء التحديد
            </button>
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              حذف المحدد
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-right">
                  <input
                    type="checkbox"
                    checked={selectedMembers.length === paginatedMembers.length && paginatedMembers.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-1">
                    المعرف <SortIcon field="id" />
                  </div>
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('firstName')}
                >
                  <div className="flex items-center gap-1">
                    الاسم <SortIcon field="firstName" />
                  </div>
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('gender')}
                >
                  <div className="flex items-center gap-1">
                    الجنس <SortIcon field="gender" />
                  </div>
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('generation')}
                >
                  <div className="flex items-center gap-1">
                    الجيل <SortIcon field="generation" />
                  </div>
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('branch')}
                >
                  <div className="flex items-center gap-1">
                    الفرع <SortIcon field="branch" />
                  </div>
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    الحالة <SortIcon field="status" />
                  </div>
                </th>
                <th className="p-3 text-right">الهاتف</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => handleSelectMember(member.id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="p-3 font-mono text-sm text-gray-600">{member.id}</td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium text-gray-800">{member.firstName}</p>
                      <p className="text-xs text-gray-500">{member.fullNameAr}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      member.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                    }`}>
                      {member.gender === 'Male' ? 'ذكر' : 'أنثى'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      الجيل {member.generation}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-600">{member.branch || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      member.status === 'Living' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {member.status === 'Living' ? 'حي' : 'متوفى'}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-600 font-mono" dir="ltr">
                    {member.phone || '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/member/${member.id}`}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="عرض"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </Link>
                      <button
                        onClick={() => setEditingMember(member)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        onClick={() => handleSelectMember(member.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMembers.length)} من {filteredMembers.length}
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={10}>10 لكل صفحة</option>
              <option value={20}>20 لكل صفحة</option>
              <option value={50}>50 لكل صفحة</option>
              <option value={100}>100 لكل صفحة</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 bg-white border rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">تعديل العضو</h3>
              <button
                onClick={() => setEditingMember(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الأول</label>
                <input
                  type="text"
                  value={editingMember.firstName}
                  onChange={(e) => setEditingMember({ ...editingMember, firstName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الأب</label>
                <input
                  type="text"
                  value={editingMember.fatherName || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, fatherName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                <select
                  value={editingMember.gender}
                  onChange={(e) => setEditingMember({ ...editingMember, gender: e.target.value as 'Male' | 'Female' })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="Male">ذكر</option>
                  <option value="Female">أنثى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الجيل</label>
                <input
                  type="number"
                  value={editingMember.generation}
                  onChange={(e) => setEditingMember({ ...editingMember, generation: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
                <input
                  type="text"
                  value={editingMember.branch || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, branch: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <select
                  value={editingMember.status}
                  onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="Living">على قيد الحياة</option>
                  <option value="Deceased">متوفى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سنة الميلاد</label>
                <input
                  type="number"
                  value={editingMember.birthYear || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, birthYear: parseInt(e.target.value) || null })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                <input
                  type="text"
                  value={editingMember.phone || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={editingMember.email || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
                <input
                  type="text"
                  value={editingMember.city || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, city: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">المهنة</label>
                <input
                  type="text"
                  value={editingMember.occupation || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, occupation: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={handleUpdateMember}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
