'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Settings,
  Save,
  TestTube,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Server,
  Key,
  Send,
  Smartphone,
} from 'lucide-react';
import { emailProviders, otpProviders } from '@/config/constants';

interface ApiConfig {
  emailProvider: string;
  emailApiKey: string | null;
  emailFromAddress: string | null;
  emailFromName: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpSecure: boolean;
  otpProvider: string;
  otpApiKey: string | null;
  otpApiSecret: string | null;
  otpFromNumber: string | null;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  testMode: boolean;
}

// Use providers from centralized config
const EMAIL_PROVIDERS = emailProviders.map(p => ({ ...p, label: p.labelAr }));
const OTP_PROVIDERS = otpProviders.map(p => ({ ...p, label: p.labelAr }));

export default function ApiServicesPage() {
  const [config, setConfig] = useState<ApiConfig>({
    emailProvider: 'none',
    emailApiKey: null,
    emailFromAddress: null,
    emailFromName: null,
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    smtpPassword: null,
    smtpSecure: true,
    otpProvider: 'none',
    otpApiKey: null,
    otpApiSecret: null,
    otpFromNumber: null,
    enableEmailNotifications: false,
    enableSMSNotifications: false,
    testMode: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState<'email' | 'sms' | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email');

  // Load configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/services');
      const data = await response.json();
      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      setMessage({ type: 'error', text: 'فشل في تحميل الإعدادات' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
        if (data.data) {
          setConfig(data.data);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'فشل في حفظ الإعدادات' });
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      setMessage({ type: 'error', text: 'فشل في حفظ الإعدادات' });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (type: 'email' | 'sms') => {
    const to = type === 'email' ? testEmail : testPhone;

    if (!to) {
      setMessage({ type: 'error', text: type === 'email' ? 'يرجى إدخال البريد الإلكتروني' : 'يرجى إدخال رقم الهاتف' });
      return;
    }

    setIsTesting(type);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, to }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.message || data.error });
      }
    } catch (error) {
      console.error('Test failed:', error);
      setMessage({ type: 'error', text: 'فشل في الاختبار' });
    } finally {
      setIsTesting(null);
    }
  };

  const toggleShowKey = (key: string) => {
    setShowApiKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateConfig = (key: keyof ApiConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#1E3A5F] mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] text-white py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">إعدادات الخدمات الخارجية</h1>
              <p className="text-white/80 text-sm">API Services Configuration</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 flex-shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {/* Test Mode Warning */}
        {config.testMode && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3 text-yellow-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <strong>وضع الاختبار مفعل</strong> - لن يتم إرسال رسائل فعلية. يتم تسجيل الرسائل في وحدة التحكم فقط.
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'email'
                ? 'bg-[#1E3A5F] text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Mail className="w-5 h-5" />
            البريد الإلكتروني
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'sms'
                ? 'bg-[#1E3A5F] text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            الرسائل النصية (OTP)
          </button>
        </div>

        {/* Email Configuration */}
        {activeTab === 'email' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-l from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">إعدادات البريد الإلكتروني</h2>
                  <p className="text-sm text-gray-500">Email Configuration</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مزود الخدمة
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {EMAIL_PROVIDERS.map(provider => (
                    <button
                      key={provider.value}
                      type="button"
                      onClick={() => updateConfig('emailProvider', provider.value)}
                      className={`p-3 border-2 rounded-lg text-center transition-all ${
                        config.emailProvider === provider.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="block font-medium">{provider.label}</span>
                      <span className="block text-xs text-gray-500">{provider.labelEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              {config.emailProvider !== 'none' && config.emailProvider !== 'smtp' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Key className="w-4 h-4 inline-block ml-1" />
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKeys.emailApiKey ? 'text' : 'password'}
                      value={config.emailApiKey || ''}
                      onChange={(e) => updateConfig('emailApiKey', e.target.value)}
                      placeholder="أدخل مفتاح API"
                      className="w-full px-4 py-3 border rounded-lg pl-12"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey('emailApiKey')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showApiKeys.emailApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* SMTP Configuration */}
              {config.emailProvider === 'smtp' && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h3 className="font-medium text-gray-700">إعدادات SMTP</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">الخادم (Host)</label>
                      <input
                        type="text"
                        value={config.smtpHost || ''}
                        onChange={(e) => updateConfig('smtpHost', e.target.value)}
                        placeholder="smtp.example.com"
                        className="w-full px-4 py-2 border rounded-lg"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">المنفذ (Port)</label>
                      <input
                        type="number"
                        value={config.smtpPort || ''}
                        onChange={(e) => updateConfig('smtpPort', parseInt(e.target.value) || null)}
                        placeholder="587"
                        className="w-full px-4 py-2 border rounded-lg"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">اسم المستخدم</label>
                      <input
                        type="text"
                        value={config.smtpUser || ''}
                        onChange={(e) => updateConfig('smtpUser', e.target.value)}
                        placeholder="username"
                        className="w-full px-4 py-2 border rounded-lg"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">كلمة المرور</label>
                      <div className="relative">
                        <input
                          type={showApiKeys.smtpPassword ? 'text' : 'password'}
                          value={config.smtpPassword || ''}
                          onChange={(e) => updateConfig('smtpPassword', e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-2 border rounded-lg pl-10"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey('smtpPassword')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showApiKeys.smtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.smtpSecure}
                      onChange={(e) => updateConfig('smtpSecure', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-600">استخدام SSL/TLS</span>
                  </label>
                </div>
              )}

              {/* From Address & Name */}
              {config.emailProvider !== 'none' && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      عنوان المرسل
                    </label>
                    <input
                      type="email"
                      value={config.emailFromAddress || ''}
                      onChange={(e) => updateConfig('emailFromAddress', e.target.value)}
                      placeholder="noreply@example.com"
                      className="w-full px-4 py-3 border rounded-lg"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم المرسل
                    </label>
                    <input
                      type="text"
                      value={config.emailFromName || ''}
                      onChange={(e) => updateConfig('emailFromName', e.target.value)}
                      placeholder="شجرة عائلة آل شايع"
                      className="w-full px-4 py-3 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Enable Notifications */}
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={config.enableEmailNotifications}
                  onChange={(e) => updateConfig('enableEmailNotifications', e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600"
                />
                <div>
                  <span className="font-medium block">تفعيل إشعارات البريد الإلكتروني</span>
                  <span className="text-sm text-gray-500">إرسال إشعارات للمستخدمين عبر البريد</span>
                </div>
              </label>

              {/* Test Email */}
              {config.emailProvider !== 'none' && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-700 mb-3">اختبار الإعدادات</h3>
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      className="flex-1 px-4 py-2 border rounded-lg"
                      dir="ltr"
                    />
                    <button
                      onClick={() => testConnection('email')}
                      disabled={isTesting === 'email'}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isTesting === 'email' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      إرسال اختبار
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SMS/OTP Configuration */}
        {activeTab === 'sms' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-l from-green-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">إعدادات الرسائل النصية (OTP)</h2>
                  <p className="text-sm text-gray-500">SMS & OTP Configuration</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مزود الخدمة
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {OTP_PROVIDERS.map(provider => (
                    <button
                      key={provider.value}
                      type="button"
                      onClick={() => updateConfig('otpProvider', provider.value)}
                      className={`p-3 border-2 rounded-lg text-center transition-all ${
                        config.otpProvider === provider.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="block font-medium">{provider.label}</span>
                      <span className="block text-xs text-gray-500">{provider.labelEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Credentials */}
              {config.otpProvider !== 'none' && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Key className="w-4 h-4 inline-block ml-1" />
                        {config.otpProvider === 'twilio' ? 'Account SID' : 'API Key'}
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeys.otpApiKey ? 'text' : 'password'}
                          value={config.otpApiKey || ''}
                          onChange={(e) => updateConfig('otpApiKey', e.target.value)}
                          placeholder="أدخل المفتاح"
                          className="w-full px-4 py-3 border rounded-lg pl-12"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey('otpApiKey')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showApiKeys.otpApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Key className="w-4 h-4 inline-block ml-1" />
                        {config.otpProvider === 'twilio' ? 'Auth Token' : 'API Secret'}
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeys.otpApiSecret ? 'text' : 'password'}
                          value={config.otpApiSecret || ''}
                          onChange={(e) => updateConfig('otpApiSecret', e.target.value)}
                          placeholder="أدخل السر"
                          className="w-full px-4 py-3 border rounded-lg pl-12"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey('otpApiSecret')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showApiKeys.otpApiSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      رقم المرسل
                    </label>
                    <input
                      type="text"
                      value={config.otpFromNumber || ''}
                      onChange={(e) => updateConfig('otpFromNumber', e.target.value)}
                      placeholder="+966500000000"
                      className="w-full px-4 py-3 border rounded-lg"
                      dir="ltr"
                    />
                  </div>
                </>
              )}

              {/* Enable SMS Notifications */}
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={config.enableSMSNotifications}
                  onChange={(e) => updateConfig('enableSMSNotifications', e.target.checked)}
                  className="w-5 h-5 rounded text-green-600"
                />
                <div>
                  <span className="font-medium block">تفعيل الرسائل النصية</span>
                  <span className="text-sm text-gray-500">إرسال رموز التحقق (OTP) للمستخدمين</span>
                </div>
              </label>

              {/* Test SMS */}
              {config.otpProvider !== 'none' && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-700 mb-3">اختبار الإعدادات</h3>
                  <div className="flex gap-3">
                    <input
                      type="tel"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="+966500000000"
                      className="flex-1 px-4 py-2 border rounded-lg"
                      dir="ltr"
                    />
                    <button
                      onClick={() => testConnection('sms')}
                      disabled={isTesting === 'sms'}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isTesting === 'sms' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      إرسال اختبار
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* General Settings */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
          <div className="p-6 border-b bg-gradient-to-l from-purple-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">إعدادات عامة</h2>
                <p className="text-sm text-gray-500">General Settings</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <label className="flex items-center gap-3 cursor-pointer p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <input
                type="checkbox"
                checked={config.testMode}
                onChange={(e) => updateConfig('testMode', e.target.checked)}
                className="w-5 h-5 rounded text-yellow-600"
              />
              <div>
                <span className="font-medium block text-yellow-800">وضع الاختبار (Test Mode)</span>
                <span className="text-sm text-yellow-700">
                  عند التفعيل، لن يتم إرسال رسائل فعلية - مفيد للتطوير والاختبار
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={loadConfig}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-5 h-5" />
            إعادة تحميل
          </button>
          <button
            onClick={saveConfig}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            حفظ الإعدادات
          </button>
        </div>
      </main>
    </div>
  );
}
