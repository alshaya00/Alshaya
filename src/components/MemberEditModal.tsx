'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Save,
  History,
  RotateCcw,
  AlertTriangle,
  Check,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  FileText,
  ChevronRight,
  Loader2,
  Users,
  Eye,
} from 'lucide-react';
import GenderAvatar from '@/components/GenderAvatar';

interface ChangeHistoryItem {
  id: string;
  timestamp: string;
  action: string;
  userName: string;
  description: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
}

interface MemberData {
  id: string;
  firstName: string;
  fatherName?: string;
  grandfatherName?: string;
  greatGrandfatherName?: string;
  fullNameAr?: string;
  fatherId?: string;
  gender: string;
  generation: number;
  branch?: string;
  birthYear?: number;
  birthCalendar?: string;
  deathYear?: number;
  deathCalendar?: string;
  status: string;
  phone?: string;
  email?: string;
  city?: string;
  occupation?: string;
  biography?: string;
}

interface MemberEditModalProps {
  member: MemberData;
  onClose: () => void;
  onSave: (updatedMember: MemberData) => Promise<void>;
  authToken?: string;
}

export default function MemberEditModal({
  member,
  onClose,
  onSave,
  authToken,
}: MemberEditModalProps) {
  const [activeTab, setActiveTab] = useState<'data' | 'history'>('data');
  const [editedMember, setEditedMember] = useState<MemberData>({ ...member });
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<ChangeHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [showNamePreview, setShowNamePreview] = useState(false);
  const [namePreview, setNamePreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    const changed = JSON.stringify(member) !== JSON.stringify(editedMember);
    setHasChanges(changed);
  }, [member, editedMember]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    if (!authToken) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/members/${member.id}/history`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    const nameAffectingFields = ['firstName', 'gender', 'fatherId'];
    const hasNameChanges = nameAffectingFields.some(
      (field) => editedMember[field as keyof MemberData] !== member[field as keyof MemberData]
    );

    if (hasNameChanges && !showNamePreview) {
      setIsLoadingPreview(true);
      try {
        const res = await fetch(`/api/members/${member.id}/name-preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            firstName: editedMember.firstName,
            gender: editedMember.gender,
            fatherId: editedMember.fatherId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setNamePreview(data.preview);
          setShowNamePreview(true);
        } else {
          await performSave();
        }
      } catch (error) {
        console.error('Error loading preview:', error);
        await performSave();
      } finally {
        setIsLoadingPreview(false);
      }
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    setIsSaving(true);
    setShowNamePreview(false);
    setNamePreview(null);
    try {
      await onSave(editedMember);
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = async (historyItem: ChangeHistoryItem) => {
    if (!historyItem.previousState) {
      alert('لا توجد حالة سابقة للتراجع إليها');
      return;
    }

    setRevertingId(historyItem.id);
    
    try {
      const checkRes = await fetch(`/api/members/${member.id}/revert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          changeId: historyItem.id,
          checkOnly: true,
        }),
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        
        if (checkData.hasConflicts && checkData.affectedChanges?.length > 0) {
          const affectedList = checkData.affectedChanges
            .slice(0, 5)
            .map((c: { fieldName: string; changedByName: string }) => 
              `- ${c.fieldName} بواسطة ${c.changedByName}`
            )
            .join('\n');
          
          const confirmMsg = `تنبيه: هذا التراجع قد يؤثر على ${checkData.affectedChanges.length} تغيير(ات) لاحقة:\n\n${affectedList}\n\nهل تريد المتابعة؟`;
          
          if (!window.confirm(confirmMsg)) {
            setRevertingId(null);
            return;
          }
        } else {
          if (!window.confirm(`هل تريد التراجع عن هذا التغيير؟\n${historyItem.description}`)) {
            setRevertingId(null);
            return;
          }
        }
      }

      const revertData = { ...editedMember };
      for (const [key, value] of Object.entries(historyItem.previousState)) {
        if (key in revertData) {
          (revertData as Record<string, unknown>)[key] = value;
        }
      }
      
      const revertRes = await fetch(`/api/members/${member.id}/revert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          changeId: historyItem.id,
          revertData: historyItem.previousState,
        }),
      });

      if (!revertRes.ok) {
        throw new Error('Failed to revert');
      }

      setEditedMember(revertData);
      await loadHistory();
    } catch (error) {
      console.error('Error reverting:', error);
      alert('حدث خطأ أثناء التراجع');
    } finally {
      setRevertingId(null);
    }
  };

  const handleBatchRevert = async (batchId: string) => {
    try {
      const previewRes = await fetch('/api/members/batch-revert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ batchId, preview: true }),
      });

      if (!previewRes.ok) throw new Error('Preview failed');
      const previewData = await previewRes.json();

      const confirmMsg = `هل تريد التراجع عن التغيير المجموعي؟\n\nسيتم تراجع التغييرات على ${previewData.revertedMembers} عضو (${previewData.revertedFields} حقل):\n${previewData.details.map((d: any) => `- ${d.firstName}: ${d.fields.join(', ')}`).join('\n')}`;

      if (!window.confirm(confirmMsg)) return;

      const revertRes = await fetch('/api/members/batch-revert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ batchId, preview: false }),
      });

      if (!revertRes.ok) throw new Error('Revert failed');

      alert('تم التراجع بنجاح');
      await loadHistory();
    } catch (error) {
      console.error('Batch revert error:', error);
      alert('حدث خطأ أثناء التراجع');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderFieldChange = (prev: unknown, next: unknown, field: string) => {
    const fieldNames: Record<string, string> = {
      firstName: 'الاسم الأول',
      fatherName: 'اسم الأب',
      gender: 'الجنس',
      generation: 'الجيل',
      branch: 'الفرع',
      birthYear: 'سنة الميلاد',
      birthCalendar: 'تقويم الميلاد',
      deathYear: 'سنة الوفاة',
      deathCalendar: 'تقويم الوفاة',
      status: 'الحالة',
      phone: 'الهاتف',
      email: 'البريد',
      city: 'المدينة',
      occupation: 'المهنة',
      biography: 'السيرة الذاتية',
    };

    return (
      <div key={field} className="flex items-center gap-2 text-sm bg-gray-50 px-2 py-1 rounded">
        <span className="text-gray-600">{fieldNames[field] || field}:</span>
        <span className="text-red-600 line-through">{String(prev || '-')}</span>
        <ChevronRight className="w-3 h-3 text-gray-400" />
        <span className="text-green-600">{String(next || '-')}</span>
      </div>
    );
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-l from-blue-600 to-blue-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <GenderAvatar gender={member.gender} size="md" />
            <div>
              <h2 className="text-xl font-bold">{member.fullNameAr || member.firstName}</h2>
              <p className="text-blue-200 text-sm">تعديل بيانات العضو</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-colors ${
              activeTab === 'data'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <User className="w-5 h-5" />
            البيانات الأساسية
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <History className="w-5 h-5" />
            سجل التغييرات
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'data' ? (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline ml-1" />
                    الاسم الأول
                  </label>
                  <input
                    type="text"
                    value={editedMember.firstName}
                    onChange={(e) =>
                      setEditedMember({ ...editedMember, firstName: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الأب</label>
                  <input
                    type="text"
                    value={editedMember.fatherName || ''}
                    onChange={(e) =>
                      setEditedMember({ ...editedMember, fatherName: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                  <select
                    value={editedMember.gender}
                    onChange={(e) =>
                      setEditedMember({ ...editedMember, gender: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Male">ذكر</option>
                    <option value="Female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الجيل</label>
                  <input
                    type="number"
                    value={editedMember.generation}
                    onChange={(e) =>
                      setEditedMember({
                        ...editedMember,
                        generation: parseInt(e.target.value) || 1,
                      })
                    }
                    min={1}
                    max={15}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select
                    value={editedMember.status}
                    onChange={(e) =>
                      setEditedMember({ ...editedMember, status: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Living">على قيد الحياة</option>
                    <option value="Deceased">متوفى</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
                  <input
                    type="text"
                    value={editedMember.branch || ''}
                    onChange={(e) =>
                      setEditedMember({ ...editedMember, branch: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  معلومات التاريخ
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <h4 className="font-medium text-blue-800 mb-3">الميلاد</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">السنة</label>
                        <input
                          type="number"
                          value={editedMember.birthYear || ''}
                          onChange={(e) =>
                            setEditedMember({
                              ...editedMember,
                              birthYear: e.target.value ? parseInt(e.target.value) : undefined,
                            })
                          }
                          placeholder="1400"
                          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">التقويم</label>
                        <select
                          value={editedMember.birthCalendar || 'GREGORIAN'}
                          onChange={(e) =>
                            setEditedMember({ ...editedMember, birthCalendar: e.target.value })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="HIJRI">هجري</option>
                          <option value="GREGORIAN">ميلادي</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {editedMember.status === 'Deceased' && (
                    <div className="bg-gray-100 p-4 rounded-xl">
                      <h4 className="font-medium text-gray-800 mb-3">الوفاة</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">السنة</label>
                          <input
                            type="number"
                            value={editedMember.deathYear || ''}
                            onChange={(e) =>
                              setEditedMember({
                                ...editedMember,
                                deathYear: e.target.value ? parseInt(e.target.value) : undefined,
                              })
                            }
                            placeholder="1445"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">التقويم</label>
                          <select
                            value={editedMember.deathCalendar || 'GREGORIAN'}
                            onChange={(e) =>
                              setEditedMember({ ...editedMember, deathCalendar: e.target.value })
                            }
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="HIJRI">هجري</option>
                            <option value="GREGORIAN">ميلادي</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  معلومات التواصل
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone className="w-4 h-4 inline ml-1" />
                      الهاتف
                    </label>
                    <input
                      type="tel"
                      value={editedMember.phone || ''}
                      onChange={(e) =>
                        setEditedMember({ ...editedMember, phone: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Mail className="w-4 h-4 inline ml-1" />
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      value={editedMember.email || ''}
                      onChange={(e) =>
                        setEditedMember({ ...editedMember, email: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MapPin className="w-4 h-4 inline ml-1" />
                      المدينة
                    </label>
                    <input
                      type="text"
                      value={editedMember.city || ''}
                      onChange={(e) =>
                        setEditedMember({ ...editedMember, city: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Briefcase className="w-4 h-4 inline ml-1" />
                      المهنة
                    </label>
                    <input
                      type="text"
                      value={editedMember.occupation || ''}
                      onChange={(e) =>
                        setEditedMember({ ...editedMember, occupation: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  السيرة الذاتية
                </h3>
                <textarea
                  value={editedMember.biography || ''}
                  onChange={(e) =>
                    setEditedMember({ ...editedMember, biography: e.target.value })
                  }
                  rows={4}
                  placeholder="أدخل نبذة عن العضو..."
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>لا توجد تغييرات مسجلة</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-800">{item.description}</p>
                        <p className="text-sm text-gray-500">
                          بواسطة {item.userName} • {formatDate(item.timestamp)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.previousState && (
                          <button
                            onClick={() => handleRevert(item)}
                            disabled={revertingId === item.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
                          >
                            {revertingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                            تراجع
                          </button>
                        )}
                        {item.details && (item.details as any).batchId && (
                          <button
                            onClick={() => handleBatchRevert((item.details as any).batchId)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                            تراجع مجموعي
                          </button>
                        )}
                      </div>
                    </div>
                    {item.previousState && item.newState && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.keys(item.newState).map((key) => {
                          const prev = (item.previousState as Record<string, unknown>)?.[key];
                          const next = (item.newState as Record<string, unknown>)?.[key];
                          if (prev !== next) {
                            return renderFieldChange(prev, next, key);
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {hasChanges && (
              <span className="flex items-center gap-1 text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                توجد تغييرات غير محفوظة
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || isLoadingPreview}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving || isLoadingPreview ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isLoadingPreview ? 'جاري معاينة التأثيرات...' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>
      </div>
    </div>
    {showNamePreview && namePreview && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-l from-amber-500 to-amber-600 text-white px-6 py-4">
            <div className="flex items-center gap-3">
              <Eye className="w-6 h-6" />
              <div>
                <h3 className="text-lg font-bold">معاينة تأثير التغييرات</h3>
                <p className="text-amber-100 text-sm">
                  {namePreview.totalAffected > 1
                    ? `سيتأثر ${namePreview.totalAffected} عضو بهذا التغيير`
                    : 'سيتأثر عضو واحد بهذا التغيير'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                التغييرات على العضو: {namePreview.member.firstName}
              </h4>
              <div className="space-y-2">
                {Object.entries(namePreview.member.changes).map(([field, change]: [string, any]) => {
                  if (!change || change.old === change.new) return null;
                  const fieldLabels: Record<string, string> = {
                    fullNameAr: 'الاسم الكامل (عربي)',
                    fullNameEn: 'الاسم الكامل (إنجليزي)',
                    fatherName: 'اسم الأب',
                    grandfatherName: 'اسم الجد',
                    greatGrandfatherName: 'اسم الجد الأعلى',
                  };
                  return (
                    <div key={field} className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg">
                      <span className="text-gray-600 font-medium min-w-[120px]">{fieldLabels[field] || field}:</span>
                      <span className="text-red-600 line-through">{change.old || '-'}</span>
                      <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="text-green-600 font-medium">{change.new || '-'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {namePreview.affectedDescendants && namePreview.affectedDescendants.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  الأعضاء المتأثرون ({namePreview.affectedDescendants.length})
                </h4>
                <div className="space-y-3 max-h-[300px] overflow-auto">
                  {namePreview.affectedDescendants.map((desc: any) => (
                    <div key={desc.id} className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-800">{desc.firstName}</span>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          {desc.relationship}
                        </span>
                        <span className="text-xs text-gray-500">الجيل {desc.generation}</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(desc.changes).map(([field, change]: [string, any]) => {
                          if (!change || change.old === change.new) return null;
                          const fieldLabels: Record<string, string> = {
                            fullNameAr: 'الاسم الكامل (عربي)',
                            fullNameEn: 'الاسم الكامل (إنجليزي)',
                            fatherName: 'اسم الأب',
                            grandfatherName: 'اسم الجد',
                            greatGrandfatherName: 'اسم الجد الأعلى',
                          };
                          return (
                            <div key={field} className="flex items-center gap-2 text-xs bg-gray-50 px-2 py-1 rounded">
                              <span className="text-gray-500 min-w-[100px]">{fieldLabels[field] || field}:</span>
                              <span className="text-red-500 line-through">{change.old || '-'}</span>
                              <ChevronRight className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
                              <span className="text-green-600">{change.new || '-'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">يمكنك التراجع عن هذه التغييرات لاحقاً من سجل التغييرات</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowNamePreview(false); setNamePreview(null); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                رجوع
              </button>
              <button
                onClick={performSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                تأكيد وحفظ
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
