'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  ChevronLeft,
  Save,
  RefreshCw,
  Shield,
  Globe,
  Bell,
  Database,
  Lock,
  Eye,
  ToggleRight,
  ToggleLeft,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface SystemConfig {
  // Display Settings
  defaultLanguage: 'ar' | 'en';
  dateFormat: string;
  treeDisplayMode: 'vertical' | 'horizontal';
  showDeceasedMembers: boolean;

  // Validation Rules
  minBirthYear: number;
  maxBirthYear: number;
  requirePhone: boolean;
  requireEmail: boolean;
  allowDuplicateNames: boolean;

  // Security Settings
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireStrongAccessCode: boolean;

  // Feature Toggles
  enableBranchEntries: boolean;
  enablePublicRegistry: boolean;
  enableExport: boolean;
  enableImport: boolean;
  autoBackup: boolean;
  autoBackupInterval: number;
}

const defaultConfig: SystemConfig = {
  defaultLanguage: 'ar',
  dateFormat: 'DD/MM/YYYY',
  treeDisplayMode: 'vertical',
  showDeceasedMembers: true,
  minBirthYear: 1900,
  maxBirthYear: new Date().getFullYear(),
  requirePhone: false,
  requireEmail: false,
  allowDuplicateNames: true,
  sessionTimeout: 60,
  maxLoginAttempts: 5,
  requireStrongAccessCode: false,
  enableBranchEntries: true,
  enablePublicRegistry: true,
  enableExport: true,
  enableImport: true,
  autoBackup: true,
  autoBackupInterval: 24,
};

export default function ConfigPage() {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'display' | 'validation' | 'security' | 'features'>('display');

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
  }, [config, originalConfig]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        setOriginalConfig(data.config);
      }
    } catch (error) {
      // Load from localStorage as fallback
      const stored = localStorage.getItem('alshaye_system_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        setConfig(parsed);
        setOriginalConfig(parsed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }).catch(() => {
        // Fallback to localStorage
        localStorage.setItem('alshaye_system_config', JSON.stringify(config));
      });

      setOriginalConfig(config);
      alert('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const resetConfig = () => {
    if (confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات إلى القيم الافتراضية؟')) {
      setConfig(defaultConfig);
    }
  };

  const tabs = [
    { id: 'display', label: 'العرض', icon: Globe },
    { id: 'validation', label: 'التحقق', icon: Shield },
    { id: 'security', label: 'الأمان', icon: Lock },
    { id: 'features', label: 'الميزات', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل الإعدادات...</p>
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
          <span className="text-gray-800">إعدادات النظام</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">إعدادات النظام</h1>
              <p className="text-sm text-gray-500">System Configuration - تخصيص سلوك التطبيق</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetConfig}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              إعادة تعيين
            </button>
            <button
              onClick={saveConfig}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <p className="text-yellow-800">لديك تغييرات غير محفوظة. تأكد من حفظ الإعدادات قبل المغادرة.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {/* Display Settings */}
        {activeTab === 'display' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">إعدادات العرض</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اللغة الافتراضية</label>
                <select
                  value={config.defaultLanguage}
                  onChange={(e) => setConfig({ ...config, defaultLanguage: e.target.value as 'ar' | 'en' })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تنسيق التاريخ</label>
                <select
                  value={config.dateFormat}
                  onChange={(e) => setConfig({ ...config, dateFormat: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">طريقة عرض الشجرة</label>
                <select
                  value={config.treeDisplayMode}
                  onChange={(e) => setConfig({ ...config, treeDisplayMode: e.target.value as 'vertical' | 'horizontal' })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="vertical">عمودي</option>
                  <option value="horizontal">أفقي</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="font-medium text-gray-700">عرض المتوفين</label>
                  <p className="text-sm text-gray-500">إظهار الأعضاء المتوفين في الشجرة</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, showDeceasedMembers: !config.showDeceasedMembers })}
                  className="text-2xl"
                >
                  {config.showDeceasedMembers ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Validation Settings */}
        {activeTab === 'validation' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">قواعد التحقق</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">أدنى سنة ميلاد</label>
                <input
                  type="number"
                  value={config.minBirthYear}
                  onChange={(e) => setConfig({ ...config, minBirthYear: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">أقصى سنة ميلاد</label>
                <input
                  type="number"
                  value={config.maxBirthYear}
                  onChange={(e) => setConfig({ ...config, maxBirthYear: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="font-medium text-gray-700">إلزام رقم الهاتف</label>
                  <p className="text-sm text-gray-500">جعل رقم الهاتف حقلاً إلزامياً</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, requirePhone: !config.requirePhone })}
                >
                  {config.requirePhone ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="font-medium text-gray-700">إلزام البريد الإلكتروني</label>
                  <p className="text-sm text-gray-500">جعل البريد الإلكتروني حقلاً إلزامياً</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, requireEmail: !config.requireEmail })}
                >
                  {config.requireEmail ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg md:col-span-2">
                <div>
                  <label className="font-medium text-gray-700">السماح بالأسماء المكررة</label>
                  <p className="text-sm text-gray-500">السماح بإضافة أعضاء بنفس الاسم</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, allowDuplicateNames: !config.allowDuplicateNames })}
                >
                  {config.allowDuplicateNames ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">إعدادات الأمان</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مهلة انتهاء الجلسة (دقيقة)
                </label>
                <input
                  type="number"
                  value={config.sessionTimeout}
                  onChange={(e) => setConfig({ ...config, sessionTimeout: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الحد الأقصى لمحاولات تسجيل الدخول
                </label>
                <input
                  type="number"
                  value={config.maxLoginAttempts}
                  onChange={(e) => setConfig({ ...config, maxLoginAttempts: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg md:col-span-2">
                <div>
                  <label className="font-medium text-gray-700">رمز وصول قوي</label>
                  <p className="text-sm text-gray-500">
                    إلزام استخدام رموز وصول قوية (8 أحرف على الأقل، حروف وأرقام)
                  </p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, requireStrongAccessCode: !config.requireStrongAccessCode })}
                >
                  {config.requireStrongAccessCode ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature Toggles */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">تبديل الميزات</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="font-medium text-gray-700">روابط الفروع</label>
                  <p className="text-sm text-gray-500">تمكين نظام روابط إدخال الفروع</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, enableBranchEntries: !config.enableBranchEntries })}
                >
                  {config.enableBranchEntries ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="font-medium text-gray-700">السجل العام</label>
                  <p className="text-sm text-gray-500">السماح بعرض سجل العائلة للجميع</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, enablePublicRegistry: !config.enablePublicRegistry })}
                >
                  {config.enablePublicRegistry ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="font-medium text-gray-700">تصدير البيانات</label>
                  <p className="text-sm text-gray-500">تمكين ميزة تصدير البيانات</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, enableExport: !config.enableExport })}
                >
                  {config.enableExport ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="font-medium text-gray-700">استيراد البيانات</label>
                  <p className="text-sm text-gray-500">تمكين ميزة استيراد البيانات</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, enableImport: !config.enableImport })}
                >
                  {config.enableImport ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="font-medium text-gray-700">النسخ الاحتياطي التلقائي</label>
                  <p className="text-sm text-gray-500">إنشاء نسخ احتياطية تلقائية بشكل دوري</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, autoBackup: !config.autoBackup })}
                >
                  {config.autoBackup ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              {config.autoBackup && (
                <div className="mr-8">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    فترة النسخ الاحتياطي (ساعة)
                  </label>
                  <input
                    type="number"
                    value={config.autoBackupInterval}
                    onChange={(e) => setConfig({ ...config, autoBackupInterval: parseInt(e.target.value) })}
                    className="w-full max-w-xs border rounded-lg px-3 py-2"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
