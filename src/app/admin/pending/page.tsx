'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getPendingMembers,
  updatePendingStatus,
  removePendingMember,
  savePendingMembers,
  PendingMember,
  getBranchLinks,
} from '@/lib/branchEntry';
import { getMemberById } from '@/lib/data';
import {
  Check, X, Edit2, Clock, User, Filter,
  ChevronDown, AlertCircle, CheckCircle, XCircle,
  Save, RotateCcw
} from 'lucide-react';
import Link from 'next/link';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminPendingPage() {
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PendingMember>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load pending members
  useEffect(() => {
    const pending = getPendingMembers();
    setMembers(pending);
  }, []);

  // Filter members
  const filteredMembers = useMemo(() => {
    if (filter === 'all') return members;
    return members.filter(m => m.status === filter);
  }, [members, filter]);

  // Group by branch
  const groupedByBranch = useMemo(() => {
    const groups: Record<string, PendingMember[]> = {};
    filteredMembers.forEach(member => {
      const branchName = member.branch || 'غير محدد';
      if (!groups[branchName]) {
        groups[branchName] = [];
      }
      groups[branchName].push(member);
    });
    return groups;
  }, [filteredMembers]);

  // Stats
  const stats = useMemo(() => ({
    total: members.length,
    pending: members.filter(m => m.status === 'pending').length,
    approved: members.filter(m => m.status === 'approved').length,
    rejected: members.filter(m => m.status === 'rejected').length,
  }), [members]);

  const handleApprove = (id: string) => {
    updatePendingStatus(id, 'approved');
    setMembers(prev => prev.map(m =>
      m.id === id ? { ...m, status: 'approved' } : m
    ));
  };

  const handleReject = (id: string) => {
    updatePendingStatus(id, 'rejected');
    setMembers(prev => prev.map(m =>
      m.id === id ? { ...m, status: 'rejected' } : m
    ));
  };

  const handleDelete = (id: string) => {
    if (confirm('هل تريد حذف هذا العضو نهائياً؟')) {
      removePendingMember(id);
      setMembers(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleEdit = (member: PendingMember) => {
    setEditingId(member.id);
    setEditData({
      firstName: member.firstName,
      birthYear: member.birthYear,
      city: member.city,
      occupation: member.occupation,
    });
  };

  const handleSaveEdit = (id: string) => {
    const updatedMembers = members.map(m => {
      if (m.id === id) {
        const connector = m.gender === 'Male' ? 'بن' : 'بنت';
        return {
          ...m,
          ...editData,
          fullNameAr: `${editData.firstName || m.firstName} ${connector} ${m.fatherName} آل شايع`,
        };
      }
      return m;
    });
    setMembers(updatedMembers);
    savePendingMembers(updatedMembers);
    setEditingId(null);
    setEditData({});
  };

  const handleApproveAll = () => {
    if (!confirm(`هل تريد الموافقة على ${stats.pending} عضو؟`)) return;

    const updatedMembers = members.map(m =>
      m.status === 'pending' ? { ...m, status: 'approved' as const } : m
    );
    setMembers(updatedMembers);
    savePendingMembers(updatedMembers);
  };

  const statusColors = {
    pending: 'bg-orange-100 text-orange-700 border-orange-300',
    approved: 'bg-green-100 text-green-700 border-green-300',
    rejected: 'bg-red-100 text-red-700 border-red-300',
  };

  const statusIcons = {
    pending: <Clock size={14} />,
    approved: <CheckCircle size={14} />,
    rejected: <XCircle size={14} />,
  };

  const statusLabels = {
    pending: 'بانتظار المراجعة',
    approved: 'تمت الموافقة',
    rejected: 'مرفوض',
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Clock className="text-orange-500" size={28} />
              مراجعة الأعضاء الجدد
            </h1>
            <p className="text-gray-500 mt-1">راجع وعدّل وأوافق على الإضافات الجديدة</p>
          </div>
          <Link
            href="/branches"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
          >
            إدارة الفروع
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'all' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white border hover:border-blue-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm opacity-80">الكل</p>
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'pending' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border hover:border-orange-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-sm opacity-80">بانتظار</p>
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'approved' ? 'bg-green-500 text-white shadow-lg' : 'bg-white border hover:border-green-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.approved}</p>
            <p className="text-sm opacity-80">موافق عليه</p>
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'rejected' ? 'bg-red-500 text-white shadow-lg' : 'bg-white border hover:border-red-300'
            }`}
          >
            <p className="text-2xl font-bold">{stats.rejected}</p>
            <p className="text-sm opacity-80">مرفوض</p>
          </button>
        </div>

        {/* Bulk Actions */}
        {stats.pending > 0 && filter === 'pending' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-orange-500" size={24} />
              <span className="text-orange-700">
                {stats.pending} عضو بانتظار المراجعة
              </span>
            </div>
            <button
              onClick={handleApproveAll}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Check size={18} />
              الموافقة على الكل
            </button>
          </div>
        )}

        {/* Empty State */}
        {filteredMembers.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-700">لا يوجد أعضاء</h3>
            <p className="text-gray-500 mt-1">
              {filter === 'pending' ? 'لا يوجد أعضاء بانتظار المراجعة' : 'لا يوجد أعضاء في هذه الفئة'}
            </p>
          </div>
        )}

        {/* Members List Grouped by Branch */}
        {Object.entries(groupedByBranch).map(([branch, branchMembers]) => (
          <div key={branch} className="mb-6">
            <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              فرع {branch}
              <span className="text-sm font-normal text-gray-400">({branchMembers.length})</span>
            </h2>

            <div className="space-y-3">
              {branchMembers.map(member => (
                <div
                  key={member.id}
                  className="bg-white rounded-xl shadow-sm border overflow-hidden"
                >
                  {/* Member Row */}
                  <div className="p-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                      member.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
                    }`}>
                      {member.gender === 'Male' ? '👨' : '👩'}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      {editingId === member.id ? (
                        <input
                          type="text"
                          value={editData.firstName || ''}
                          onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                          className="font-bold text-lg border-b-2 border-green-500 focus:outline-none"
                        />
                      ) : (
                        <p className="font-bold text-lg text-gray-800">{member.firstName}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        ابن {member.fatherName} • ج{member.generation}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${statusColors[member.status]}`}>
                      {statusIcons[member.status]}
                      {statusLabels[member.status]}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {editingId === member.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(member.id)}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            title="حفظ"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditData({}); }}
                            className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                            title="إلغاء"
                          >
                            <RotateCcw size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          {member.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(member.id)}
                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                title="موافقة"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => handleReject(member.id)}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                title="رفض"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEdit(member)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                            title="تعديل"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                          >
                            <ChevronDown
                              size={18}
                              className={`transition-transform ${expandedId === member.id ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === member.id && (
                    <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">الاسم الكامل</p>
                          <p className="font-medium">{member.fullNameAr}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">سنة الميلاد</p>
                          <p className="font-medium">{member.birthYear || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">تاريخ الإضافة</p>
                          <p className="font-medium">
                            {new Date(member.submittedAt).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">رقم الأب</p>
                          <p className="font-medium">{member.fatherId}</p>
                        </div>
                      </div>

                      {/* Edit Form */}
                      {editingId === member.id && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">سنة الميلاد</label>
                            <input
                              type="number"
                              value={editData.birthYear || ''}
                              onChange={(e) => setEditData({ ...editData, birthYear: parseInt(e.target.value) || undefined })}
                              className="w-full px-3 py-2 border rounded-lg mt-1"
                              placeholder="1990"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">المدينة</label>
                            <input
                              type="text"
                              value={editData.city || ''}
                              onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg mt-1"
                              placeholder="الرياض"
                            />
                          </div>
                        </div>
                      )}

                      {/* Delete Button */}
                      <div className="mt-4 pt-4 border-t flex justify-end">
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                        >
                          <X size={14} />
                          حذف نهائي
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-bold text-blue-800 mb-3">📋 ملاحظات</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• الأعضاء الموافق عليهم يُضافون تلقائياً للشجرة</li>
            <li>• يمكنك تعديل البيانات قبل الموافقة</li>
            <li>• الأعضاء المرفوضون لا يُحذفون تلقائياً (يمكن مراجعتهم لاحقاً)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
