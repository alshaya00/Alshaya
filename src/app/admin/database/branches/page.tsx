'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Link2,
  ChevronLeft,
  RefreshCw,
  Plus,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Calendar,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { BranchEntryLink } from '@/lib/types';
import { storageKeys } from '@/config/storage-keys';
import { tokenConfig } from '@/config/admin-config';

export default function BranchLinksPage() {
  const [links, setLinks] = useState<BranchEntryLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLink, setNewLink] = useState({
    branchName: '',
    branchHeadId: '',
    branchHeadName: '',
    maxUses: '',
  });

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/branch-links');
      const data = await res.json();
      setLinks(data.links || []);
    } catch (error) {
      console.error('Error loading links:', error);
      // Load from localStorage as fallback
      const stored = localStorage.getItem(storageKeys.branchLinks);
      if (stored) {
        setLinks(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateToken = () => {
    const chars = tokenConfig.codeCharacters;
    let token = '';
    for (let i = 0; i < tokenConfig.branchTokenLength; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const createLink = async () => {
    if (!newLink.branchName || !newLink.branchHeadName) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const link: BranchEntryLink = {
      id: `link_${Date.now()}`,
      token: generateToken(),
      branchName: newLink.branchName,
      branchHeadId: newLink.branchHeadId || `P${Date.now()}`,
      branchHeadName: newLink.branchHeadName,
      isActive: true,
      maxUses: newLink.maxUses ? parseInt(newLink.maxUses) : null,
      useCount: 0,
      createdBy: 'admin',
      createdAt: new Date(),
    };

    try {
      await fetch('/api/admin/branch-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(link),
      }).catch(() => {
        // Fallback to localStorage
        const stored = JSON.parse(localStorage.getItem(storageKeys.branchLinks) || '[]');
        stored.push(link);
        localStorage.setItem(storageKeys.branchLinks, JSON.stringify(stored));
      });

      setLinks((prev) => [...prev, link]);
      setShowCreateModal(false);
      setNewLink({ branchName: '', branchHeadId: '', branchHeadName: '', maxUses: '' });
    } catch (error) {
      console.error('Error creating link:', error);
    }
  };

  const toggleLink = async (id: string) => {
    const link = links.find((l) => l.id === id);
    if (!link) return;

    try {
      await fetch(`/api/admin/branch-links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !link.isActive }),
      }).catch(() => {
        // Fallback
        const stored = JSON.parse(localStorage.getItem(storageKeys.branchLinks) || '[]');
        const updated = stored.map((l: BranchEntryLink) =>
          l.id === id ? { ...l, isActive: !l.isActive } : l
        );
        localStorage.setItem(storageKeys.branchLinks, JSON.stringify(updated));
      });

      setLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, isActive: !l.isActive } : l))
      );
    } catch (error) {
      console.error('Error toggling link:', error);
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرابط؟')) return;

    try {
      await fetch(`/api/admin/branch-links/${id}`, { method: 'DELETE' }).catch(() => {
        // Fallback
        const stored = JSON.parse(localStorage.getItem(storageKeys.branchLinks) || '[]');
        localStorage.setItem(
          storageKeys.branchLinks,
          JSON.stringify(stored.filter((l: BranchEntryLink) => l.id !== id))
        );
      });

      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/add-branch/${token}`;
    navigator.clipboard.writeText(url);
    alert('تم نسخ الرابط');
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل روابط الفروع...</p>
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
          <span className="text-gray-800">روابط الفروع</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Link2 className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">روابط الفروع</h1>
              <p className="text-sm text-gray-500">BranchEntryLink - {links.length} رابط</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLinks}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
            >
              <Plus className="w-5 h-5" />
              إنشاء رابط
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
        <p className="text-orange-800">
          روابط الفروع تسمح لأفراد الفروع بإضافة أعضاء جدد مباشرة.
          كل رابط خاص بفرع معين ويمكن تحديد عدد مرات الاستخدام.
        </p>
      </div>

      {/* Quick Add Link Generator Card */}
      <Link
        href="/quick-add/link"
        className="block mb-6 bg-gradient-to-l from-emerald-500 to-emerald-600 rounded-xl p-5 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">مولد رابط الإضافة السريعة</h3>
            <p className="text-emerald-100 text-sm mt-1">
              أنشئ رابطاً سريعاً مع مطابقة ذكية للأسماء العربية - بدون تسجيل دخول
            </p>
          </div>
          <ChevronLeft size={24} className="text-white/70" />
        </div>
      </Link>

      {/* Links List */}
      {links.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Link2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">لا توجد روابط</h3>
          <p className="text-gray-400 mb-6">لم يتم إنشاء أي روابط بعد</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
          >
            إنشاء أول رابط
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div key={link.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    link.isActive ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Link2 className={`w-6 h-6 ${link.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{link.branchName}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        link.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {link.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      رئيس الفرع: {link.branchHeadName}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(link.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {link.useCount} استخدام
                        {link.maxUses && ` / ${link.maxUses}`}
                      </span>
                    </div>
                    <div className="mt-2 p-2 bg-gray-50 rounded font-mono text-sm text-gray-600">
                      /add-branch/{link.token}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(link.token)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="نسخ الرابط"
                  >
                    <Copy className="w-5 h-5 text-gray-500" />
                  </button>
                  <a
                    href={`/add-branch/${link.token}`}
                    target="_blank"
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="فتح الرابط"
                  >
                    <ExternalLink className="w-5 h-5 text-blue-500" />
                  </a>
                  <button
                    onClick={() => toggleLink(link.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title={link.isActive ? 'تعطيل' : 'تفعيل'}
                  >
                    {link.isActive ? (
                      <ToggleRight className="w-5 h-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteLink(link.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="حذف"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">إنشاء رابط فرع</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم الفرع <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newLink.branchName}
                  onChange={(e) => setNewLink({ ...newLink, branchName: e.target.value })}
                  placeholder="مثال: الفرع 1"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم رئيس الفرع <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newLink.branchHeadName}
                  onChange={(e) => setNewLink({ ...newLink, branchHeadName: e.target.value })}
                  placeholder="اسم رئيس الفرع"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الحد الأقصى للاستخدام (اختياري)
                </label>
                <input
                  type="number"
                  value={newLink.maxUses}
                  onChange={(e) => setNewLink({ ...newLink, maxUses: e.target.value })}
                  placeholder="اتركه فارغاً لعدم التحديد"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={createLink}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إنشاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
