'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FolderOpen, Plus, Edit2, Trash2, Save, X, 
  Loader2, AlertCircle, Image, User, Heart, 
  FileText, Archive, Calendar, Check
} from 'lucide-react';

interface AlbumFolder {
  id: string;
  name: string;
  nameAr: string;
  description: string | null;
  descriptionAr: string | null;
  color: string;
  icon: string | null;
  isSystem: boolean;
  displayOrder: number;
  photoCount: number;
  pendingCount: number;
}

const iconOptions = [
  { value: 'User', label: 'شخص', icon: User },
  { value: 'Heart', label: 'قلب', icon: Heart },
  { value: 'FileText', label: 'مستند', icon: FileText },
  { value: 'Archive', label: 'أرشيف', icon: Archive },
  { value: 'Calendar', label: 'تقويم', icon: Calendar },
  { value: 'Image', label: 'صورة', icon: Image },
  { value: 'FolderOpen', label: 'مجلد', icon: FolderOpen },
];

const colorOptions = [
  { value: '#3b82f6', label: 'أزرق' },
  { value: '#a855f7', label: 'بنفسجي' },
  { value: '#f59e0b', label: 'برتقالي' },
  { value: '#10b981', label: 'أخضر' },
  { value: '#ec4899', label: 'وردي' },
  { value: '#ef4444', label: 'أحمر' },
  { value: '#6366f1', label: 'نيلي' },
  { value: '#14b8a6', label: 'تركوازي' },
];

function getIconComponent(iconName: string | null) {
  const option = iconOptions.find(o => o.value === iconName);
  return option?.icon || FolderOpen;
}

export default function AlbumFoldersPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [folders, setFolders] = useState<AlbumFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    color: '#6366f1',
    icon: 'FolderOpen',
  });

  const fetchFolders = useCallback(async () => {
    if (!session?.token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/folders', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFolders(data.data || []);
      } else {
        setError('فشل في تحميل المجلدات');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleCreate = async () => {
    if (!session?.token || !formData.nameAr) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsCreating(false);
        setFormData({ name: '', nameAr: '', description: '', descriptionAr: '', color: '#6366f1', icon: 'FolderOpen' });
        await fetchFolders();
      } else {
        const data = await res.json();
        setError(data.messageAr || 'فشل في إنشاء المجلد');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!session?.token) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/folders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchFolders();
      } else {
        const data = await res.json();
        setError(data.messageAr || 'فشل في تحديث المجلد');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (folder: AlbumFolder) => {
    if (!session?.token) return;
    if (!confirm(`هل أنت متأكد من حذف مجلد "${folder.nameAr}"؟`)) return;
    
    try {
      const res = await fetch(`/api/admin/folders/${folder.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        await fetchFolders();
      } else {
        const data = await res.json();
        setError(data.messageAr || 'فشل في حذف المجلد');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال');
    }
  };

  const startEdit = (folder: AlbumFolder) => {
    setEditingId(folder.id);
    setFormData({
      name: folder.name,
      nameAr: folder.nameAr,
      description: folder.description || '',
      descriptionAr: folder.descriptionAr || '',
      color: folder.color,
      icon: folder.icon || 'FolderOpen',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: '', nameAr: '', description: '', descriptionAr: '', color: '#6366f1', icon: 'FolderOpen' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">إدارة مجلدات الصور</h1>
                <p className="text-gray-500 text-sm">تنظيم وإدارة ألبومات الصور</p>
              </div>
            </div>
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة مجلد</span>
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="mr-auto text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {isCreating && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <h3 className="text-lg font-semibold mb-4">إنشاء مجلد جديد</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربي *</label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="مثال: صور الزفاف"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزي</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g. Wedding Photos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوصف بالعربي</label>
                  <input
                    type="text"
                    value={formData.descriptionAr}
                    onChange={e => setFormData({ ...formData, descriptionAr: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوصف بالإنجليزي</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اللون</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          formData.color === color.value ? 'border-gray-800' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      >
                        {formData.color === color.value && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الأيقونة</label>
                  <div className="flex flex-wrap gap-2">
                    {iconOptions.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setFormData({ ...formData, icon: opt.value })}
                          className={`p-2 rounded-lg border-2 ${
                            formData.icon === opt.value 
                              ? 'border-emerald-500 bg-emerald-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          title={opt.label}
                        >
                          <Icon className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!formData.nameAr || isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {folders.map(folder => {
              const Icon = getIconComponent(folder.icon);
              const isEditing = editingId === folder.id;

              if (isEditing) {
                return (
                  <div key={folder.id} className="p-4 bg-gray-50 rounded-xl border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربي</label>
                        <input
                          type="text"
                          value={formData.nameAr}
                          onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزي</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اللون</label>
                        <div className="flex flex-wrap gap-2">
                          {colorOptions.map(color => (
                            <button
                              key={color.value}
                              onClick={() => setFormData({ ...formData, color: color.value })}
                              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                                formData.color === color.value ? 'border-gray-800' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color.value }}
                            >
                              {formData.color === color.value && <Check className="w-4 h-4 text-white" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الأيقونة</label>
                        <div className="flex flex-wrap gap-2">
                          {iconOptions.map(opt => {
                            const IconOpt = opt.icon;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setFormData({ ...formData, icon: opt.value })}
                                className={`p-2 rounded-lg border-2 ${
                                  formData.icon === opt.value 
                                    ? 'border-emerald-500 bg-emerald-50' 
                                    : 'border-gray-200'
                                }`}
                              >
                                <IconOpt className="w-5 h-5" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button onClick={cancelEdit} className="px-4 py-2 text-gray-600">
                        إلغاء
                      </button>
                      <button
                        onClick={() => handleUpdate(folder.id)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={folder.id}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: folder.color + '20' }}
                  >
                    <Icon className="w-6 h-6" style={{ color: folder.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">{folder.nameAr}</h3>
                      {folder.isSystem && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          أساسي
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{folder.name}</p>
                  </div>
                  <div className="text-center px-4">
                    <div className="text-lg font-semibold text-gray-800">{folder.photoCount}</div>
                    <div className="text-xs text-gray-500">صورة</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(folder)}
                      className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    {!folder.isSystem && (
                      <button
                        onClick={() => handleDelete(folder)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {folders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>لا توجد مجلدات بعد</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
