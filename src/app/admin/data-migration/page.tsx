'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Database, 
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  Info,
  Clock,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MigrationTask {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  canRevert: boolean;
  affectedRecords?: number;
  error?: string;
}

interface MigrationLog {
  id: string;
  taskId: string;
  taskName: string;
  action: 'execute';
  status: 'success' | 'failed';
  affectedRecords: number;
  executedAt: string;
  executedBy: string;
  details?: string;
}

export default function DataMigrationPage() {
  const { getAuthHeader } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [tasks, setTasks] = useState<MigrationTask[]>([]);
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadMigrationData();
  }, []);

  const loadMigrationData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/data-migration', {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading migration data:', error);
      setTasks(getDefaultTasks());
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultTasks = (): MigrationTask[] => [
    {
      id: 'activate-pending-users',
      name: 'تفعيل المستخدمين المعلقين',
      nameEn: 'Activate Pending Users',
      description: 'تغيير حالة جميع المستخدمين المعلقين إلى نشط (بعد تفعيل ميزة الدخول المباشر)',
      status: 'pending',
      canRevert: false,
    },
    {
      id: 'migrate-access-requests',
      name: 'ترحيل طلبات الانضمام',
      nameEn: 'Migrate Access Requests',
      description: 'نقل بيانات طلبات الانضمام المعلقة إلى جدول المستخدمين',
      status: 'pending',
      canRevert: false,
    },
  ];

  const executeMigration = async (taskId: string) => {
    setIsRunning(true);
    setShowConfirm(null);
    
    try {
      const res = await fetch('/api/admin/data-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ action: 'execute', taskId }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: 'completed', affectedRecords: data.affectedRecords }
            : t
        ));
        await loadMigrationData();
      } else {
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: 'failed', error: data.error }
            : t
        ));
      }
    } catch (error) {
      console.error('Migration error:', error);
    } finally {
      setIsRunning(false);
    }
  };


  const getStatusIcon = (status: MigrationTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'skipped':
        return <Info className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusLabel = (status: MigrationTask['status']) => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'failed':
        return 'فشل';
      case 'running':
        return 'جاري التنفيذ';
      case 'skipped':
        return 'تم تخطيه';
      default:
        return 'في الانتظار';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">ترحيل وإصلاح البيانات</h1>
              <p className="text-gray-500">Data Migration & Repair</p>
            </div>
          </div>
          <p className="text-gray-600 mt-4">
            أدوات لترحيل البيانات وإصلاح المشاكل الإنتاجية.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">تنبيه أمان</h3>
              <p className="text-sm text-amber-700 mt-1">
                هذه العمليات تؤثر على البيانات الإنتاجية. يتم تسجيل جميع التغييرات في سجل المراجعة.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="font-bold text-gray-800">مهام الترحيل المتاحة</h2>
          </div>
          
          <div className="divide-y">
            {tasks.map((task) => (
              <div key={task.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(task.status)}
                      <h3 className="font-bold text-gray-800">{task.name}</h3>
                      <span className="text-sm text-gray-500">({task.nameEn})</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`px-2 py-1 rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-700' :
                        task.status === 'failed' ? 'bg-red-100 text-red-700' :
                        task.status === 'running' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {getStatusLabel(task.status)}
                      </span>
                      
                      {task.affectedRecords !== undefined && (
                        <span className="text-gray-500">
                          السجلات المتأثرة: {task.affectedRecords}
                        </span>
                      )}
                      
                    </div>
                    
                    {task.error && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {task.error}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mr-4">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => setShowConfirm(task.id)}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2d5a8a] disabled:opacity-50 transition-colors"
                      >
                        <Play size={16} />
                        تنفيذ
                      </button>
                    )}
                    
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {logs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h2 className="font-bold text-gray-800">سجل العمليات</h2>
            </div>
            
            <div className="divide-y max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {log.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <div>
                      <span className="font-medium">{log.taskName}</span>
                      <span className="text-gray-500 text-sm mx-2">
                        (تنفيذ)
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span>{log.affectedRecords} سجل</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(log.executedAt).toLocaleString('ar-SA')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-[#1E3A5F] hover:underline"
          >
            <ChevronLeft size={20} />
            العودة للوحة التحكم
          </Link>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <h3 className="text-lg font-bold">تأكيد التنفيذ</h3>
            </div>
            <p className="text-gray-600 mb-6">
              هل أنت متأكد من تنفيذ هذه المهمة؟ سيتم تسجيل جميع التغييرات.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => executeMigration(showConfirm)}
                className="flex-1 py-2 px-4 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2d5a8a]"
              >
                تأكيد التنفيذ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
