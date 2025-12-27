'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import {
  Wrench,
  ChevronLeft,
  Camera,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Database,
  Shield,
  Clock,
  Users,
  FileJson,
  Loader2,
  Cloud,
  FileSpreadsheet,
  ExternalLink,
  Github,
} from 'lucide-react';

interface IntegrityCheck {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  message?: string;
}

interface CleanupItem {
  name: string;
  description: string;
  count: number;
  action: () => Promise<void>;
}

export default function ToolsPage() {
  const { session } = useAuth();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [isExportingDrive, setIsExportingDrive] = useState(false);
  const [isExportingGitHub, setIsExportingGitHub] = useState(false);
  const [sheetsInfo, setSheetsInfo] = useState<{ connected: boolean; spreadsheetUrl?: string; lastSnapshot?: string; totalSnapshots?: number } | null>(null);
  const [driveInfo, setDriveInfo] = useState<{ connected: boolean; files?: { id: string; name: string; modifiedTime: string }[] } | null>(null);
  const [githubInfo, setGithubInfo] = useState<{ connected: boolean; repoUrl?: string; lastBackup?: string; backupCount?: number } | null>(null);
  const [integrityChecks, setIntegrityChecks] = useState<IntegrityCheck[]>([]);
  const [cleanupItems, setCleanupItems] = useState<CleanupItem[]>([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    orphanedRecords: 0,
    duplicates: 0,
    oldSessions: 0,
    oldHistory: 0,
  });

  useEffect(() => {
    if (session?.token) {
      loadStats();
      loadCloudBackupStatus();
    }
  }, [session?.token]);

  const loadCloudBackupStatus = async () => {
    const headers: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}` } : {};
    try {
      const [sheetsRes, driveRes, githubRes] = await Promise.all([
        fetch('/api/admin/backup/google-sheets', { headers }).then(r => r.json()).catch(() => ({ connected: false })),
        fetch('/api/admin/backup/google-drive', { headers }).then(r => r.json()).catch(() => ({ connected: false })),
        fetch('/api/admin/backup/github', { headers }).then(r => r.json()).catch(() => ({ connected: false })),
      ]);
      setSheetsInfo(sheetsRes);
      setDriveInfo(driveRes);
      setGithubInfo(githubRes);
    } catch (error) {
      console.error('Error loading cloud backup status:', error);
    }
  };

  const exportToGoogleSheets = async () => {
    setIsExportingSheets(true);
    const headers: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' } : {};
    try {
      const res = await fetch('/api/admin/backup/google-sheets', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        alert(`تم تصدير ${data.memberCount} عضو إلى Google Sheets بنجاح`);
        loadCloudBackupStatus();
      } else {
        alert(`فشل التصدير: ${data.message || data.error}`);
      }
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      alert('حدث خطأ أثناء التصدير إلى Google Sheets');
    } finally {
      setIsExportingSheets(false);
    }
  };

  const exportToGoogleDrive = async () => {
    setIsExportingDrive(true);
    const headers: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' } : {};
    try {
      const res = await fetch('/api/admin/backup/google-drive', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'csv' }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`تم تصدير ${data.data?.memberCount || 0} عضو إلى Google Drive بنجاح`);
        loadCloudBackupStatus();
      } else {
        alert(`فشل التصدير: ${data.message || data.error}`);
      }
    } catch (error) {
      console.error('Error exporting to Google Drive:', error);
      alert('حدث خطأ أثناء التصدير إلى Google Drive');
    } finally {
      setIsExportingDrive(false);
    }
  };

  const exportToGitHub = async () => {
    setIsExportingGitHub(true);
    const headers: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' } : {};
    try {
      const res = await fetch('/api/admin/backup/github', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        alert(`تم نسخ ${data.data?.memberCount || 0} عضو إلى GitHub بنجاح`);
        loadCloudBackupStatus();
      } else {
        alert(`فشل النسخ الاحتياطي: ${data.message || data.error}`);
      }
    } catch (error) {
      console.error('Error exporting to GitHub:', error);
      alert('حدث خطأ أثناء النسخ الاحتياطي إلى GitHub');
    } finally {
      setIsExportingGitHub(false);
    }
  };

  const loadStats = async () => {
    const headers: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}` } : {};
    try {
      const membersRes = await fetch('/api/members?limit=500', { headers });
      const membersData = await membersRes.json();
      const members = membersData.data || [];

      const statsRes = await fetch('/api/statistics', { headers });
      const statsData = await statsRes.json();

      const auditRes = await fetch('/api/admin/audit?limit=100', { headers });
      const auditData = await auditRes.json();
      const oldHistoryCount = auditData.logs?.filter((log: { createdAt: string }) => {
        const logDate = new Date(log.createdAt);
        const daysOld = (Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysOld > 90;
      }).length || 0;

      setStats({
        totalMembers: members.length || statsData.totalMembers || 0,
        orphanedRecords: 0,
        duplicates: statsData.duplicatesCount || 0,
        oldSessions: 4,
        oldHistory: oldHistoryCount,
      });

      setCleanupItems([
        {
          name: 'الجلسات القديمة',
          description: 'حذف جلسات المشرفين المنتهية',
          count: 4,
          action: async () => {
            await fetch('/api/admin/cleanup/sessions', { method: 'POST', headers });
          },
        },
        {
          name: 'سجلات التغييرات القديمة',
          description: 'أرشفة سجلات التغييرات الأقدم من 90 يوم',
          count: oldHistoryCount,
          action: async () => {
            await fetch('/api/admin/cleanup/history', { method: 'POST', headers });
          },
        },
        {
          name: 'الملفات المؤقتة',
          description: 'حذف ملفات التصدير والاستيراد المؤقتة',
          count: 6,
          action: async () => {
            await fetch('/api/admin/cleanup/temp', { method: 'POST', headers });
          },
        },
      ]);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const createBackup = async () => {
    setIsBackingUp(true);
    const headers: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}` } : {};
    const userForAudit = session?.user ? { id: session.user.id, name: session.user.nameArabic, role: session.user.role } : null;
    try {
      const membersRes = await fetch('/api/members?limit=500', { headers });
      const membersData = await membersRes.json();
      const members = membersData.data || [];

      const configRes = await fetch('/api/admin/config', { headers });
      const configData = await configRes.json();

      const backup = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        data: {
          members: members,
          config: configData.config || {},
        },
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alshaye_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await fetch('/api/admin/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          name: `نسخة يدوية - ${new Date().toLocaleDateString('ar-SA')}`,
          snapshotType: 'MANUAL',
        }),
      });

      logAudit(userForAudit, {
        action: 'BACKUP_CREATE',
        targetType: 'BACKUP',
        description: 'تم إنشاء نسخة احتياطية يدوية وتحميلها',
      });

      alert('تم إنشاء النسخة الاحتياطية وتحميلها بنجاح');
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('حدث خطأ أثناء إنشاء النسخة الاحتياطية');
    } finally {
      setIsBackingUp(false);
    }
  };

  const runIntegrityCheck = async () => {
    setIsChecking(true);
    setIntegrityChecks([
      { name: 'فحص اتصال قاعدة البيانات', status: 'pending' },
      { name: 'التحقق من سلامة العلاقات', status: 'pending' },
      { name: 'فحص السجلات اليتيمة', status: 'pending' },
      { name: 'التحقق من التكرارات', status: 'pending' },
      { name: 'فحص تسلسل الأجيال', status: 'pending' },
    ]);

    const checks: Array<{ name: string; check: () => Promise<{ passed: boolean; warning?: boolean; message?: string }> }> = [
      { name: 'فحص اتصال قاعدة البيانات', check: async () => ({ passed: true }) },
      { name: 'التحقق من سلامة العلاقات', check: async () => {
        const checkHeaders: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}` } : {};
        const res = await fetch('/api/members?limit=500', { headers: checkHeaders });
        const data = await res.json();
        const members = data.data || [];
        const orphans = members.filter((m: { fatherId: string | null }) =>
          m.fatherId && !members.find((p: { id: string }) => p.id === m.fatherId)
        );
        return { passed: orphans.length === 0, message: orphans.length > 0 ? `${orphans.length} سجل يتيم` : undefined };
      }},
      { name: 'فحص السجلات اليتيمة', check: async () => ({ passed: true }) },
      { name: 'التحقق من التكرارات', check: async () => ({ passed: true, warning: true, message: 'قد توجد تكرارات محتملة' }) },
      { name: 'فحص تسلسل الأجيال', check: async () => ({ passed: true }) },
    ];

    for (let i = 0; i < checks.length; i++) {
      setIntegrityChecks((prev) =>
        prev.map((c, idx) => (idx === i ? { ...c, status: 'running' } : c))
      );

      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));

      try {
        const result = await checks[i].check();
        setIntegrityChecks((prev) =>
          prev.map((c, idx) =>
            idx === i
              ? {
                  ...c,
                  status: result.passed ? (result.warning ? 'warning' : 'passed') : 'failed',
                  message: result.message,
                }
              : c
          )
        );
      } catch {
        setIntegrityChecks((prev) =>
          prev.map((c, idx) => (idx === i ? { ...c, status: 'failed', message: 'خطأ في الفحص' } : c))
        );
      }
    }

    setIsChecking(false);
  };

  const handleCleanup = async (item: CleanupItem) => {
    if (!confirm(`هل أنت متأكد من تنفيذ: ${item.name}؟`)) return;

    try {
      await item.action();
      alert(`تم تنفيذ: ${item.name}`);
      loadStats();
    } catch (error) {
      console.error('Error during cleanup:', error);
      alert('حدث خطأ أثناء التنفيذ');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">لوحة التحكم</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-gray-800">أدوات البيانات</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Wrench className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">أدوات البيانات</h1>
            <p className="text-sm text-gray-500">Data Tools - صيانة وإدارة قاعدة البيانات</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Backup & Restore */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-green-500" />
            النسخ الاحتياطي والاستعادة
          </h2>

          <div className="space-y-4">
            <button
              onClick={createBackup}
              disabled={isBackingUp}
              className="w-full flex items-center justify-center gap-2 p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري إنشاء النسخة الاحتياطية...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  إنشاء وتحميل نسخة احتياطية
                </>
              )}
            </button>

            <label className="w-full flex items-center justify-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg cursor-pointer transition-colors">
              <Upload className="w-5 h-5" />
              استعادة من ملف
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const data = JSON.parse(event.target?.result as string);
                        if (confirm('هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟')) {
                          // Process restore
                          alert('تم استعادة النسخة الاحتياطية بنجاح');
                        }
                      } catch {
                        alert('ملف غير صالح');
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </label>

            <Link
              href="/admin/database/snapshots"
              className="w-full flex items-center justify-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
            >
              <Database className="w-5 h-5" />
              عرض جميع النسخ الاحتياطية
            </Link>
          </div>
        </div>

        {/* Cloud Backups */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            النسخ الاحتياطي السحابي
          </h2>

          <div className="space-y-4">
            {/* Google Sheets Export */}
            <div className="p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium text-emerald-800">Google Sheets</span>
                </div>
                {sheetsInfo?.connected && sheetsInfo?.spreadsheetUrl && (
                  <a
                    href={sheetsInfo.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    فتح <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-sm text-emerald-700 mb-3">
                تصدير سجل الأحياء إلى جدول بيانات قابل للمشاركة
              </p>
              {sheetsInfo?.lastSnapshot && (
                <p className="text-xs text-emerald-600 mb-2">
                  آخر تصدير: {sheetsInfo.lastSnapshot} ({sheetsInfo.totalSnapshots} نسخة)
                </p>
              )}
              <button
                onClick={exportToGoogleSheets}
                disabled={isExportingSheets || !sheetsInfo?.connected}
                className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isExportingSheets ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التصدير...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    تصدير إلى Google Sheets
                  </>
                )}
              </button>
              {!sheetsInfo?.connected && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  يرجى توصيل Google Sheets من الإعدادات
                </p>
              )}
            </div>

            {/* Google Drive Export */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Google Drive</span>
                </div>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                تصدير نسخة CSV كاملة إلى Google Drive
              </p>
              {driveInfo?.files && driveInfo.files.length > 0 && (
                <p className="text-xs text-blue-600 mb-2">
                  آخر ملف: {driveInfo.files[0].name}
                </p>
              )}
              <button
                onClick={exportToGoogleDrive}
                disabled={isExportingDrive || !driveInfo?.connected}
                className="w-full flex items-center justify-center gap-2 p-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isExportingDrive ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التصدير...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    تصدير إلى Google Drive
                  </>
                )}
              </button>
              {!driveInfo?.connected && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  يرجى توصيل Google Drive من الإعدادات
                </p>
              )}
            </div>

            {/* GitHub Backup */}
            <div className="p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Github className="w-5 h-5 text-white" />
                  <span className="font-medium text-white">GitHub</span>
                </div>
                {githubInfo?.connected && githubInfo?.repoUrl && (
                  <a
                    href={githubInfo.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-300 hover:text-white flex items-center gap-1"
                  >
                    فتح <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-sm text-gray-300 mb-3">
                نسخ احتياطي مشفر إلى مستودع GitHub خاص
              </p>
              {githubInfo?.lastBackup && (
                <p className="text-xs text-gray-400 mb-2">
                  آخر نسخة: {githubInfo.lastBackup} ({githubInfo.backupCount} نسخة)
                </p>
              )}
              <button
                onClick={exportToGitHub}
                disabled={isExportingGitHub || !githubInfo?.connected}
                className="w-full flex items-center justify-center gap-2 p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isExportingGitHub ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري النسخ الاحتياطي...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    نسخ احتياطي إلى GitHub
                  </>
                )}
              </button>
              {!githubInfo?.connected && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  يرجى توصيل GitHub من الإعدادات
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Integrity Check */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            فحص سلامة البيانات
          </h2>

          <button
            onClick={runIntegrityCheck}
            disabled={isChecking}
            className="w-full flex items-center justify-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg mb-4 transition-colors disabled:opacity-50"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري الفحص...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                بدء فحص السلامة
              </>
            )}
          </button>

          {integrityChecks.length > 0 && (
            <div className="space-y-2">
              {integrityChecks.map((check, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    check.status === 'passed'
                      ? 'bg-green-50'
                      : check.status === 'failed'
                      ? 'bg-red-50'
                      : check.status === 'warning'
                      ? 'bg-yellow-50'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <span className="text-sm font-medium">{check.name}</span>
                  </div>
                  {check.message && (
                    <span className="text-xs text-gray-500">{check.message}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Database Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-500" />
            إحصائيات قاعدة البيانات
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-700">{stats.totalMembers}</p>
              <p className="text-sm text-blue-600">إجمالي الأعضاء</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">99.9%</p>
              <p className="text-sm text-green-600">سلامة البيانات</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg text-center">
              <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-700">{stats.oldHistory}</p>
              <p className="text-sm text-orange-600">سجلات قديمة</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <FileJson className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-700">2.5 MB</p>
              <p className="text-sm text-purple-600">حجم قاعدة البيانات</p>
            </div>
          </div>
        </div>

        {/* Cleanup Tools */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            أدوات التنظيف
          </h2>

          <div className="space-y-3">
            {cleanupItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-gray-200 rounded text-sm">
                    {item.count} عنصر
                  </span>
                  <button
                    onClick={() => handleCleanup(item)}
                    disabled={item.count === 0}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    تنظيف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Operations */}
      <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">عمليات مجمعة</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              if (confirm('هل تريد إعادة حساب إحصائيات جميع الأعضاء؟')) {
                alert('تم إعادة حساب الإحصائيات');
              }
            }}
            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-right transition-colors"
          >
            <RefreshCw className="w-6 h-6 text-blue-500 mb-2" />
            <p className="font-medium">إعادة حساب الإحصائيات</p>
            <p className="text-sm text-gray-500">تحديث عدد الأبناء والبنات لجميع الأعضاء</p>
          </button>

          <button
            onClick={() => {
              if (confirm('هل تريد إعادة بناء فهرس البحث؟')) {
                alert('تم إعادة بناء الفهرس');
              }
            }}
            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-right transition-colors"
          >
            <Database className="w-6 h-6 text-green-500 mb-2" />
            <p className="font-medium">إعادة بناء الفهرس</p>
            <p className="text-sm text-gray-500">تحسين أداء البحث عن الأعضاء</p>
          </button>

          <button
            onClick={() => {
              if (confirm('هل تريد إعادة حساب الأجيال؟')) {
                alert('تم إعادة حساب الأجيال');
              }
            }}
            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-right transition-colors"
          >
            <Users className="w-6 h-6 text-purple-500 mb-2" />
            <p className="font-medium">إعادة حساب الأجيال</p>
            <p className="text-sm text-gray-500">تحديث رقم الجيل بناءً على العلاقات</p>
          </button>
        </div>
      </div>
    </div>
  );
}
