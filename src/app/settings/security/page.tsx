'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Smartphone, Key, CheckCircle, AlertTriangle, Copy, Eye, EyeOff } from 'lucide-react';

export default function SecuritySettingsPage() {
  const { user, session } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; uri: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [disableCode, setDisableCode] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    if (!session?.token) return;

    try {
      const res = await fetch('/api/auth/2fa/setup', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      setTwoFactorEnabled(data.enabled === true);
    } catch {
      // Ignore error, assume not enabled
    }
  };

  const startSetup = async () => {
    if (!session?.token) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/setup', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setSetupData({ secret: data.secret, uri: data.uri });
        setShowSetup(true);
      } else {
        setError(data.messageAr || data.message);
      }
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!session?.token) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await res.json();

      if (res.ok) {
        setTwoFactorEnabled(true);
        setBackupCodes(data.backupCodes || []);
        setShowBackupCodes(true);
        setShowSetup(false);
        setSuccess('تم تفعيل المصادقة الثنائية بنجاح');
      } else {
        setError(data.messageAr || data.message);
      }
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!session?.token) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ code: disableCode }),
      });
      const data = await res.json();

      if (res.ok) {
        setTwoFactorEnabled(false);
        setShowDisable(false);
        setDisableCode('');
        setSuccess('تم تعطيل المصادقة الثنائية');
      } else {
        setError(data.messageAr || data.message);
      }
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('تم النسخ للحافظة');
    setTimeout(() => setSuccess(null), 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">يرجى تسجيل الدخول</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">إعدادات الأمان</h1>
          <Link href="/settings" className="text-emerald-600 hover:text-emerald-800">
            رجوع
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* 2FA Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">المصادقة الثنائية (2FA)</h2>
              <p className="text-gray-600 mt-1">
                أضف طبقة أمان إضافية لحسابك باستخدام تطبيق المصادقة
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              twoFactorEnabled
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {twoFactorEnabled ? 'مفعّل' : 'غير مفعّل'}
            </div>
          </div>

          {!twoFactorEnabled && !showSetup && (
            <button
              onClick={startSetup}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'جاري التحميل...' : 'تفعيل المصادقة الثنائية'}
            </button>
          )}

          {showSetup && setupData && (
            <div className="space-y-6">
              {/* Step 1: QR Code */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  الخطوة 1: امسح رمز QR
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  افتح تطبيق المصادقة (Google Authenticator أو Authy) وامسح الرمز
                </p>
                <div className="bg-white p-4 rounded-lg inline-block">
                  {/* QR Code placeholder - in production, use a QR code library */}
                  <div className="w-48 h-48 bg-gray-200 flex items-center justify-center rounded">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(setupData.uri)}`}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">أو أدخل الرمز يدوياً:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono" dir="ltr">
                      {setupData.secret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(setupData.secret)}
                      className="p-2 text-gray-500 hover:text-gray-700"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: Verify */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  الخطوة 2: أدخل رمز التحقق
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    dir="ltr"
                  />
                  <button
                    onClick={verifyAndEnable}
                    disabled={isLoading || verificationCode.length !== 6}
                    className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? 'جاري التحقق...' : 'تأكيد'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowSetup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                إلغاء
              </button>
            </div>
          )}

          {twoFactorEnabled && !showDisable && (
            <button
              onClick={() => setShowDisable(true)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              تعطيل المصادقة الثنائية
            </button>
          )}

          {showDisable && (
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-900 mb-3">تعطيل المصادقة الثنائية</h3>
              <p className="text-sm text-red-700 mb-4">
                أدخل رمز المصادقة لتأكيد تعطيل 2FA
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  dir="ltr"
                />
                <button
                  onClick={disable2FA}
                  disabled={isLoading || disableCode.length !== 6}
                  className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'جاري التعطيل...' : 'تعطيل'}
                </button>
              </div>
              <button
                onClick={() => setShowDisable(false)}
                className="mt-3 text-gray-500 hover:text-gray-700 text-sm"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>

        {/* Backup Codes Modal */}
        {showBackupCodes && backupCodes.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                  <Key className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">رموز الاسترداد</h2>
                <p className="text-gray-600 mt-2">
                  احفظ هذه الرموز في مكان آمن. يمكنك استخدامها للدخول إذا فقدت الوصول لتطبيق المصادقة.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-2" dir="ltr">
                  {backupCodes.map((code, index) => (
                    <code key={index} className="text-center py-2 bg-white rounded border font-mono text-sm">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => copyToClipboard(backupCodes.join('\n'))}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  نسخ الرموز
                </button>
                <button
                  onClick={() => setShowBackupCodes(false)}
                  className="flex-1 py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
                >
                  تم الحفظ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Verification Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">التحقق من البريد الإلكتروني</h2>
              <p className="text-gray-600 mt-1">{user.email}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              user.emailVerifiedAt
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {user.emailVerifiedAt ? 'مُتحقق منه' : 'غير مُتحقق'}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Lucide icon component for Mail
function Mail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
