'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  ChevronLeft,
  Save,
  RefreshCw,
  ToggleRight,
  ToggleLeft,
  Layers,
  TreePine,
  Users,
  BookOpen,
  Image,
  Calendar,
  BarChart3,
  Search,
  GitBranch,
  PlusCircle,
  Upload,
  Download,
  Edit,
  Copy,
  History,
  UserPlus,
  Mail,
  UserCheck,
  User,
  Heart,
  Link2,
  HelpCircle,
  Camera,
  FileText,
  ClipboardList,
  Server,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  FeatureFlags,
  FeatureKey,
  featureList,
  categoryLabels,
  getFeaturesByCategory,
} from '@/contexts/FeatureFlagsContext';

// Icon mapping for features
const featureIcons: Record<FeatureKey, React.ElementType> = {
  familyTree: TreePine,
  registry: Users,
  journals: BookOpen,
  gallery: Image,
  gatherings: Calendar,
  dashboard: BarChart3,
  search: Search,
  branches: GitBranch,
  quickAdd: PlusCircle,
  importData: Upload,
  exportData: Download,
  treeEditor: Edit,
  duplicates: Copy,
  changeHistory: History,
  registration: UserPlus,
  invitations: Mail,
  accessRequests: UserCheck,
  profiles: User,
  breastfeeding: Heart,
  branchEntries: Link2,
  onboarding: HelpCircle,
  imageModeration: Camera,
  broadcasts: Mail,
  reports: FileText,
  audit: ClipboardList,
  apiServices: Server,
};

// Default feature flags
const defaultFlags: FeatureFlags = {
  familyTree: true,
  registry: true,
  journals: true,
  gallery: true,
  gatherings: true,
  dashboard: true,
  search: true,
  branches: true,
  quickAdd: true,
  importData: true,
  exportData: true,
  treeEditor: true,
  duplicates: true,
  changeHistory: true,
  registration: true,
  invitations: true,
  accessRequests: true,
  profiles: true,
  breastfeeding: true,
  branchEntries: true,
  onboarding: true,
  imageModeration: true,
  broadcasts: true,
  reports: true,
  audit: true,
  apiServices: true,
};

export default function FeaturesPage() {
  const { getAuthHeader } = useAuth();
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);
  const [originalFlags, setOriginalFlags] = useState<FeatureFlags>(defaultFlags);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'core' | 'data' | 'user' | 'special' | 'admin'>('all');

  useEffect(() => {
    loadFlags();
  }, []);

  useEffect(() => {
    setHasChanges(JSON.stringify(flags) !== JSON.stringify(originalFlags));
  }, [flags, originalFlags]);

  const loadFlags = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/features', {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (data.flags) {
        setFlags(data.flags);
        setOriginalFlags(data.flags);
      }
    } catch (error) {
      console.error('Failed to load feature flags:', error);
      // Try localStorage fallback
      const stored = localStorage.getItem('alshaye_feature_flags');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setFlags(parsed);
          setOriginalFlags(parsed);
        } catch {
          // Use defaults
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveFlags = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/admin/features', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(flags),
      });

      const data = await res.json();

      if (data.success) {
        setOriginalFlags(flags);
        setSaveMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
        // Also save to localStorage as backup
        localStorage.setItem('alshaye_feature_flags', JSON.stringify(flags));
      } else {
        setSaveMessage({ type: 'error', text: data.messageAr || 'حدث خطأ أثناء الحفظ' });
      }
    } catch (error) {
      console.error('Error saving feature flags:', error);
      // Fallback to localStorage
      localStorage.setItem('alshaye_feature_flags', JSON.stringify(flags));
      setSaveMessage({ type: 'success', text: 'تم الحفظ محلياً' });
      setOriginalFlags(flags);
    } finally {
      setIsSaving(false);
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const toggleFeature = (key: FeatureKey) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const enableAll = () => {
    setFlags(defaultFlags);
  };

  const disableAll = () => {
    const allDisabled: FeatureFlags = {
      familyTree: false,
      registry: false,
      journals: false,
      gallery: false,
      gatherings: false,
      dashboard: false,
      search: false,
      branches: false,
      quickAdd: false,
      importData: false,
      exportData: false,
      treeEditor: false,
      duplicates: false,
      changeHistory: false,
      registration: false,
      invitations: false,
      accessRequests: false,
      profiles: false,
      breastfeeding: false,
      branchEntries: false,
      onboarding: false,
      imageModeration: false,
      broadcasts: false,
      reports: false,
      audit: false,
      apiServices: false,
    };
    setFlags(allDisabled);
  };

  const resetFlags = () => {
    setFlags(originalFlags);
  };

  const getCategoryStats = (category: 'core' | 'data' | 'user' | 'special' | 'admin') => {
    const categoryFeatures = getFeaturesByCategory(category);
    const enabled = categoryFeatures.filter(f => flags[f.key]).length;
    return { enabled, total: categoryFeatures.length };
  };

  const getTotalStats = () => {
    const total = Object.keys(flags).length;
    const enabled = Object.values(flags).filter(Boolean).length;
    return { enabled, total };
  };

  const categories: Array<'all' | 'core' | 'data' | 'user' | 'special' | 'admin'> = [
    'all', 'core', 'data', 'user', 'special', 'admin'
  ];

  const filteredFeatures = activeCategory === 'all'
    ? featureList
    : getFeaturesByCategory(activeCategory);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل إعدادات الميزات...</p>
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
          <span className="text-gray-800">معاينة الميزات</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">معاينة الميزات</h1>
              <p className="text-sm text-gray-500">Feature Preview - إخفاء أو إظهار ميزات التطبيق</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={enableAll}
              className="px-3 py-2 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4 inline-block ml-1" />
              إظهار الكل
            </button>
            <button
              onClick={disableAll}
              className="px-3 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
            >
              <EyeOff className="w-4 h-4 inline-block ml-1" />
              إخفاء الكل
            </button>
            <button
              onClick={resetFlags}
              disabled={!hasChanges}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline-block ml-1" />
              إعادة تعيين
            </button>
            <button
              onClick={saveFlags}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {categories.map((cat) => {
          const stats = cat === 'all' ? getTotalStats() : getCategoryStats(cat as 'core' | 'data' | 'user' | 'special' | 'admin');
          const label = cat === 'all'
            ? { ar: 'جميع الميزات', en: 'All Features' }
            : categoryLabels[cat as keyof typeof categoryLabels];
          const isActive = activeCategory === cat;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`p-4 rounded-xl transition-all ${
                isActive
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'bg-white hover:bg-gray-50 shadow-sm'
              }`}
            >
              <div className="text-right">
                <span className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-gray-800'}`}>
                  {stats.enabled}/{stats.total}
                </span>
                <p className={`text-sm mt-1 ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                  {label.ar}
                </p>
                <p className={`text-xs ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                  {label.en}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <p className="text-yellow-800">لديك تغييرات غير محفوظة. تأكد من حفظ الإعدادات قبل المغادرة.</p>
        </div>
      )}

      {/* Save Message */}
      {saveMessage && (
        <div className={`rounded-xl p-4 mb-6 flex items-center gap-3 ${
          saveMessage.type === 'success'
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          {saveMessage.type === 'success' ? (
            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <X className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          <p className={saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {saveMessage.text}
          </p>
        </div>
      )}

      {/* Features Grid */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-bold text-gray-800">
            {activeCategory === 'all'
              ? 'جميع الميزات'
              : categoryLabels[activeCategory as keyof typeof categoryLabels].ar}
          </h2>
          <p className="text-sm text-gray-500">
            {activeCategory === 'all'
              ? 'All Features'
              : categoryLabels[activeCategory as keyof typeof categoryLabels].en}
          </p>
        </div>

        <div className="divide-y">
          {filteredFeatures.map((feature) => {
            const Icon = featureIcons[feature.key] || Layers;
            const isEnabled = flags[feature.key];

            return (
              <div
                key={feature.key}
                className={`flex items-center justify-between p-4 transition-colors ${
                  isEnabled ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isEnabled ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${isEnabled ? 'text-gray-800' : 'text-gray-400'}`}>
                        {feature.labelAr}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        isEnabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {isEnabled ? 'مفعّل' : 'معطّل'}
                      </span>
                    </div>
                    <p className={`text-sm ${isEnabled ? 'text-gray-500' : 'text-gray-400'}`}>
                      {feature.labelEn}
                    </p>
                    <p className={`text-xs mt-1 ${isEnabled ? 'text-gray-400' : 'text-gray-300'}`}>
                      {feature.descriptionAr}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleFeature(feature.key)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {isEnabled ? (
                    <ToggleRight className="w-10 h-10 text-purple-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-300" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-bold text-blue-800 mb-2">كيفية عمل معاينة الميزات</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• الميزات المعطلة ستختفي من قوائم التنقل ولن يتمكن المستخدمون من الوصول إليها</li>
          <li>• التغييرات تطبق فوراً على جميع المستخدمين بعد الحفظ</li>
          <li>• يمكنك إخفاء الميزات مؤقتاً أثناء الصيانة أو التطوير</li>
          <li>• الميزات الإدارية تؤثر فقط على لوحة التحكم</li>
        </ul>
      </div>
    </div>
  );
}
