'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  Search,
  AlertTriangle,
  Check,
  X,
  Users,
  ChevronLeft,
  Loader2,
  RefreshCw,
  GitMerge,
  Clock,
  History,
  ScanSearch,
  Shield,
  Trash2,
  RotateCcw,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { formatMemberId } from '@/lib/utils';

interface MemberData {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  fatherId: string | null;
  gender: string;
  generation: number;
  branch: string | null;
  birthYear: number | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  status: string;
  photoUrl: string | null;
  occupation: string | null;
  biography: string | null;
}

interface DuplicatePair {
  memberA: MemberData;
  memberB: MemberData;
  score: number;
  level: 'EXACT' | 'SUSPICIOUS' | 'POTENTIAL';
  reasons: string[];
  reasonsAr: string[];
}

interface ScanStats {
  total: number;
  exact: number;
  suspicious: number;
  potential: number;
  membersScanned: number;
}

interface ScanResults {
  stats: ScanStats;
  duplicates: {
    exact: DuplicatePair[];
    suspicious: DuplicatePair[];
    potential: DuplicatePair[];
  };
}

interface DuplicateFlag {
  id: string;
  sourceMemberId: string;
  targetMemberId: string;
  matchScore: number;
  matchReasons: string;
  status: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  detectedAt: string;
  sourceMember: { id: string; firstName: string; fullNameAr: string | null };
  targetMember: { id: string; firstName: string; fullNameAr: string | null };
}

interface MergePreview {
  source: {
    id: string;
    firstName: string;
    fullNameAr: string | null;
    fullNameEn: string | null;
    generation: number;
    branch: string | null;
    birthYear: number | null;
    gender: string;
  };
  target: {
    id: string;
    firstName: string;
    fullNameAr: string | null;
    fullNameEn: string | null;
    generation: number;
    branch: string | null;
    birthYear: number | null;
    gender: string;
  };
  conflicts: {
    field: string;
    fieldAr: string;
    sourceValue: string | number | null;
    targetValue: string | number | null;
    recommendation: string;
  }[];
  impactedChildren: { id: string; firstName: string }[];
  impactedPhotos: number;
  impactedJournals: number;
  warnings: string[];
  warningsAr: string[];
  hasCriticalGenerationMismatch?: boolean;
  generationDifference?: number;
  hasDifferentFather?: boolean;
}

type TabType = 'scan' | 'pending' | 'history';

function countNonNullFields(member: MemberData): number {
  const fields: (keyof MemberData)[] = ['firstName', 'fullNameAr', 'fullNameEn', 'birthYear', 'phone', 'email', 'city', 'photoUrl', 'occupation', 'biography', 'branch'];
  return fields.filter(f => member[f] !== null && member[f] !== undefined && member[f] !== '').length;
}

function getFieldColor(valA: unknown, valB: unknown): string {
  if (valA && valB && valA === valB) return 'bg-green-50 border-green-200';
  if (valA && valB && valA !== valB) return 'bg-red-50 border-red-200';
  if ((!valA && valB) || (valA && !valB)) return 'bg-yellow-50 border-yellow-200';
  return 'bg-gray-50 border-gray-200';
}

function ComparisonRow({ label, valA, valB }: { label: string; valA: unknown; valB: unknown }) {
  const color = getFieldColor(valA, valB);
  return (
    <div className={`grid grid-cols-3 text-sm border rounded-md ${color}`}>
      <div className="px-3 py-2 font-medium text-gray-700 border-l">{label}</div>
      <div className="px-3 py-2 border-l text-gray-900">{valA != null && valA !== '' ? String(valA) : <span className="text-gray-400">—</span>}</div>
      <div className="px-3 py-2 text-gray-900">{valB != null && valB !== '' ? String(valB) : <span className="text-gray-400">—</span>}</div>
    </div>
  );
}

function PairCard({
  pair,
  onMerge,
  onNotDuplicate,
  onSkip,
  isProcessing,
}: {
  pair: DuplicatePair;
  onMerge: (pair: DuplicatePair) => void;
  onNotDuplicate: (pair: DuplicatePair) => void;
  onSkip?: (pair: DuplicatePair) => void;
  isProcessing: boolean;
}) {
  const { memberA, memberB, score, level, reasonsAr } = pair;
  const [expanded, setExpanded] = useState(false);
  const dataA = countNonNullFields(memberA);
  const dataB = countNonNullFields(memberB);

  const levelConfig = {
    EXACT: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: '🔴', label: 'تكرار مؤكد' },
    SUSPICIOUS: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '🟡', label: 'مشتبه' },
    POTENTIAL: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: '🟢', label: 'محتمل' },
  };
  const cfg = levelConfig[level];

  return (
    <div className={`border rounded-lg ${cfg.border} overflow-hidden`}>
      <div className={`${cfg.bg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-lg">{cfg.icon}</span>
          <span className={`font-bold ${cfg.text}`}>{cfg.label}</span>
          <span className={`text-sm ${cfg.text} font-medium`}>({score}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(!expanded)} className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`p-3 rounded-lg border ${dataA >= dataB ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">العضو A</span>
              {dataA >= dataB && <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">أكثر بيانات</span>}
            </div>
            <p className="font-bold text-gray-900">{memberA.fullNameAr || memberA.firstName}</p>
            <p className="text-sm text-gray-500">{formatMemberId(memberA.id)}</p>
            <p className="text-xs text-gray-400 mt-1">الجيل {memberA.generation} {memberA.branch ? `• ${memberA.branch}` : ''}</p>
          </div>
          <div className={`p-3 rounded-lg border ${dataB > dataA ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">العضو B</span>
              {dataB > dataA && <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">أكثر بيانات</span>}
            </div>
            <p className="font-bold text-gray-900">{memberB.fullNameAr || memberB.firstName}</p>
            <p className="text-sm text-gray-500">{formatMemberId(memberB.id)}</p>
            <p className="text-xs text-gray-400 mt-1">الجيل {memberB.generation} {memberB.branch ? `• ${memberB.branch}` : ''}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {reasonsAr.map((r, i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{r}</span>
          ))}
        </div>

        {expanded && (
          <div className="space-y-1 mb-4">
            <div className="grid grid-cols-3 text-xs font-bold text-gray-500 px-3 py-1">
              <div>الحقل</div>
              <div>العضو A</div>
              <div>العضو B</div>
            </div>
            <ComparisonRow label="المعرف" valA={formatMemberId(memberA.id)} valB={formatMemberId(memberB.id)} />
            <ComparisonRow label="الاسم الأول" valA={memberA.firstName} valB={memberB.firstName} />
            <ComparisonRow label="الاسم الكامل" valA={memberA.fullNameAr} valB={memberB.fullNameAr} />
            <ComparisonRow label="الجيل" valA={memberA.generation} valB={memberB.generation} />
            <ComparisonRow label="الفرع" valA={memberA.branch} valB={memberB.branch} />
            <ComparisonRow label="سنة الميلاد" valA={memberA.birthYear} valB={memberB.birthYear} />
            <ComparisonRow label="الجنس" valA={memberA.gender === 'MALE' ? 'ذكر' : 'أنثى'} valB={memberB.gender === 'MALE' ? 'ذكر' : 'أنثى'} />
            <ComparisonRow label="الهاتف" valA={memberA.phone} valB={memberB.phone} />
            <ComparisonRow label="البريد" valA={memberA.email} valB={memberB.email} />
            <ComparisonRow label="المدينة" valA={memberA.city} valB={memberB.city} />
            <ComparisonRow label="الحالة" valA={memberA.status} valB={memberB.status} />
          </div>
        )}

        <div className="flex gap-2 justify-end">
          {onSkip && (
            <button
              onClick={() => onSkip(pair)}
              disabled={isProcessing}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Clock className="w-4 h-4 inline-block ml-1" />
              تحقق لاحقاً
            </button>
          )}
          <button
            onClick={() => onNotDuplicate(pair)}
            disabled={isProcessing}
            className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4 inline-block ml-1" />
            ليس تكرار
          </button>
          <button
            onClick={() => onMerge(pair)}
            disabled={isProcessing}
            className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <GitMerge className="w-4 h-4 inline-block ml-1" />
            دمج
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DuplicateScannerPage() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('scan');

  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hiddenPairs, setHiddenPairs] = useState<Set<string>>(new Set());

  const [pendingFlags, setPendingFlags] = useState<DuplicateFlag[]>([]);
  const [isPendingLoading, setIsPendingLoading] = useState(false);

  const [historyFlags, setHistoryFlags] = useState<DuplicateFlag[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState<string>('');
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [isMergeLoading, setIsMergeLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 5000);
  }, []);

  const runScan = async () => {
    if (!session?.token) return;
    setIsScanning(true);
    setScanError(null);
    setHiddenPairs(new Set());

    try {
      const res = await fetch('/api/admin/duplicate-scan', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error('فشل في الفحص');

      const data = await res.json();
      if (data.success) {
        setScanResults(data);
      } else {
        throw new Error(data.messageAr || data.message || 'فشل في الفحص');
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setIsScanning(false);
    }
  };

  const fetchPending = useCallback(async () => {
    if (!session?.token) return;
    setIsPendingLoading(true);

    try {
      const [pendingRes, confirmedRes] = await Promise.all([
        fetch('/api/admin/duplicates?status=PENDING', {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch('/api/admin/duplicates?status=CONFIRMED_DUPLICATE', {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
      ]);

      const pendingData = await pendingRes.json();
      const confirmedData = await confirmedRes.json();

      setPendingFlags([...(pendingData.duplicates || []), ...(confirmedData.duplicates || [])]);
    } catch {
      setErrorMessage('فشل في جلب التكرارات المعلقة');
      clearMessages();
    } finally {
      setIsPendingLoading(false);
    }
  }, [session?.token, clearMessages]);

  const fetchHistory = useCallback(async () => {
    if (!session?.token) return;
    setIsHistoryLoading(true);

    try {
      const res = await fetch('/api/admin/duplicates', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      setHistoryFlags(data.duplicates || []);
    } catch {
      setErrorMessage('فشل في جلب السجل');
      clearMessages();
    } finally {
      setIsHistoryLoading(false);
    }
  }, [session?.token, clearMessages]);

  useEffect(() => {
    if (activeTab === 'pending') fetchPending();
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchPending, fetchHistory]);

  const handleMerge = async (pair: DuplicatePair) => {
    if (!session?.token) return;
    setIsMergeLoading(true);
    setShowMergeModal(true);

    const dataA = countNonNullFields(pair.memberA);
    const dataB = countNonNullFields(pair.memberB);

    const sourceId = dataA <= dataB ? pair.memberA.id : pair.memberB.id;
    const targetId = dataA <= dataB ? pair.memberB.id : pair.memberA.id;
    setMergeSourceId(sourceId);
    setMergeTargetId(targetId);

    try {
      const res = await fetch('/api/admin/merge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'preview', sourceId, targetId }),
      });

      const data = await res.json();
      if (data.success) {
        setMergePreview(data.preview);
      } else {
        setErrorMessage(data.messageAr || data.message || 'فشل في تحميل المعاينة');
        clearMessages();
        setShowMergeModal(false);
      }
    } catch {
      setErrorMessage('فشل في تحميل معاينة الدمج');
      clearMessages();
      setShowMergeModal(false);
    } finally {
      setIsMergeLoading(false);
    }
  };

  const handleMergePending = async (flag: DuplicateFlag) => {
    if (!session?.token) return;
    setIsMergeLoading(true);
    setShowMergeModal(true);
    setMergeSourceId(flag.sourceMemberId);
    setMergeTargetId(flag.targetMemberId);

    try {
      const res = await fetch('/api/admin/merge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'preview', sourceId: flag.sourceMemberId, targetId: flag.targetMemberId }),
      });

      const data = await res.json();
      if (data.success) {
        setMergePreview(data.preview);
      } else {
        setErrorMessage(data.messageAr || 'فشل في تحميل المعاينة');
        clearMessages();
        setShowMergeModal(false);
      }
    } catch {
      setErrorMessage('فشل في تحميل معاينة الدمج');
      clearMessages();
      setShowMergeModal(false);
    } finally {
      setIsMergeLoading(false);
    }
  };

  const confirmMerge = async () => {
    if (!session?.token || !mergeSourceId || !mergeTargetId) return;
    setIsMerging(true);

    try {
      const res = await fetch('/api/admin/merge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'merge',
          sourceId: mergeSourceId,
          targetId: mergeTargetId,
          reason: 'Duplicate profile merge via scanner',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('تم الدمج بنجاح ✅');
        clearMessages();
        setShowMergeModal(false);
        setMergePreview(null);

        if (activeTab === 'scan' && scanResults) {
          const removedId = mergeSourceId;
          const filterPair = (p: DuplicatePair) => p.memberA.id !== removedId && p.memberB.id !== removedId;
          setScanResults({
            ...scanResults,
            duplicates: {
              exact: scanResults.duplicates.exact.filter(filterPair),
              suspicious: scanResults.duplicates.suspicious.filter(filterPair),
              potential: scanResults.duplicates.potential.filter(filterPair),
            },
          });
        }
        if (activeTab === 'pending') fetchPending();
      } else {
        setErrorMessage(data.messageAr || data.message || 'فشل في الدمج');
        clearMessages();
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء الدمج');
      clearMessages();
    } finally {
      setIsMerging(false);
    }
  };

  const handleNotDuplicate = async (pair: DuplicatePair) => {
    if (!session?.token) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/admin/duplicates', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceMemberId: pair.memberA.id,
          targetMemberId: pair.memberB.id,
          matchScore: pair.score,
          matchReasons: pair.reasonsAr,
        }),
      });

      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      if (data.duplicate?.id) {
        await fetch(`/api/admin/duplicates/${data.duplicate.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'NOT_DUPLICATE' }),
        });
      }

      const pairKey = [pair.memberA.id, pair.memberB.id].sort().join(':');
      setHiddenPairs(prev => new Set(prev).add(pairKey));
      setSuccessMessage('تم التعليم كـ "ليس تكرار" ✅');
      clearMessages();
    } catch {
      setErrorMessage('فشل في تعليم الزوج');
      clearMessages();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = (pair: DuplicatePair) => {
    const pairKey = [pair.memberA.id, pair.memberB.id].sort().join(':');
    setHiddenPairs(prev => new Set(prev).add(pairKey));
  };

  const handleDismissPending = async (flag: DuplicateFlag) => {
    if (!session?.token) return;
    setIsProcessing(true);

    try {
      await fetch(`/api/admin/duplicates/${flag.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'NOT_DUPLICATE' }),
      });

      setSuccessMessage('تم الرفض ✅');
      clearMessages();
      fetchPending();
    } catch {
      setErrorMessage('فشل في الرفض');
      clearMessages();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevertHistory = async (flag: DuplicateFlag) => {
    if (!session?.token) return;
    setIsProcessing(true);

    try {
      await fetch(`/api/admin/duplicates/${flag.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });

      setSuccessMessage('تم التراجع ✅');
      clearMessages();
      fetchHistory();
    } catch {
      setErrorMessage('فشل في التراجع');
      clearMessages();
    } finally {
      setIsProcessing(false);
    }
  };

  const filterVisiblePairs = (pairs: DuplicatePair[]) =>
    pairs.filter(p => !hiddenPairs.has([p.memberA.id, p.memberB.id].sort().join(':')));

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'scan', label: 'فحص التكرارات', icon: <ScanSearch className="w-4 h-4" /> },
    { key: 'pending', label: 'المعلقة', icon: <Clock className="w-4 h-4" /> },
    { key: 'history', label: 'السجل', icon: <History className="w-4 h-4" /> },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">معلق</span>;
      case 'CONFIRMED_DUPLICATE': return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">تكرار مؤكد</span>;
      case 'NOT_DUPLICATE':
      case 'VERIFIED_DIFFERENT': return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">ليس تكرار</span>;
      case 'MERGED': return <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">تم الدمج</span>;
      default: return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-l from-purple-700 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin" className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="w-7 h-7" />
                أداة كشف ودمج التكرارات
              </h1>
              <p className="text-purple-200 text-sm mt-1">فحص شامل للأعضاء المكررين مع إمكانية الدمج</p>
            </div>
          </div>

          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-purple-700'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.key === 'pending' && pendingFlags.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingFlags.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            {errorMessage}
          </div>
        )}

        {activeTab === 'scan' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">فحص التكرارات</h2>
              <button
                onClick={runScan}
                disabled={isScanning}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {isScanning ? 'جاري الفحص...' : 'بدء الفحص'}
              </button>
            </div>

            {scanError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {scanError}
              </div>
            )}

            {isScanning && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
                <p className="text-gray-600 text-lg">جاري فحص جميع الأعضاء...</p>
                <p className="text-gray-400 text-sm mt-1">قد يستغرق هذا بضع ثوانٍ</p>
              </div>
            )}

            {scanResults && !isScanning && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <p className="text-sm text-gray-500">تم فحص</p>
                    <p className="text-2xl font-bold text-gray-800">{scanResults.stats.membersScanned}</p>
                    <p className="text-xs text-gray-400">عضو</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <p className="text-sm text-gray-500">إجمالي التكرارات</p>
                    <p className="text-2xl font-bold text-gray-800">{scanResults.stats.total}</p>
                    <p className="text-xs text-gray-400">زوج</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 shadow-sm">
                    <p className="text-sm text-red-600">🔴 مؤكد</p>
                    <p className="text-2xl font-bold text-red-700">{scanResults.stats.exact}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 shadow-sm">
                    <p className="text-sm text-yellow-600">🟡 مشتبه</p>
                    <p className="text-2xl font-bold text-yellow-700">{scanResults.stats.suspicious}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 shadow-sm">
                    <p className="text-sm text-green-600">🟢 محتمل</p>
                    <p className="text-2xl font-bold text-green-700">{scanResults.stats.potential}</p>
                  </div>
                </div>

                {scanResults.stats.total === 0 && (
                  <div className="text-center py-16 bg-white rounded-lg border">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-xl font-bold text-gray-800">لا توجد تكرارات!</p>
                    <p className="text-gray-500 mt-2">جميع الأعضاء فريدون ولا يوجد تكرارات مكتشفة</p>
                  </div>
                )}

                {filterVisiblePairs(scanResults.duplicates.exact).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
                      🔴 تكرارات مؤكدة ({filterVisiblePairs(scanResults.duplicates.exact).length})
                    </h3>
                    <div className="space-y-4">
                      {filterVisiblePairs(scanResults.duplicates.exact).map((pair, i) => (
                        <PairCard
                          key={`exact-${i}`}
                          pair={pair}
                          onMerge={handleMerge}
                          onNotDuplicate={handleNotDuplicate}
                          onSkip={handleSkip}
                          isProcessing={isProcessing}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {filterVisiblePairs(scanResults.duplicates.suspicious).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-yellow-700 mb-3 flex items-center gap-2">
                      🟡 مشتبه بها ({filterVisiblePairs(scanResults.duplicates.suspicious).length})
                    </h3>
                    <div className="space-y-4">
                      {filterVisiblePairs(scanResults.duplicates.suspicious).map((pair, i) => (
                        <PairCard
                          key={`suspicious-${i}`}
                          pair={pair}
                          onMerge={handleMerge}
                          onNotDuplicate={handleNotDuplicate}
                          onSkip={handleSkip}
                          isProcessing={isProcessing}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {filterVisiblePairs(scanResults.duplicates.potential).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2">
                      🟢 تكرارات محتملة ({filterVisiblePairs(scanResults.duplicates.potential).length})
                    </h3>
                    <div className="space-y-4">
                      {filterVisiblePairs(scanResults.duplicates.potential).map((pair, i) => (
                        <PairCard
                          key={`potential-${i}`}
                          pair={pair}
                          onMerge={handleMerge}
                          onNotDuplicate={handleNotDuplicate}
                          onSkip={handleSkip}
                          isProcessing={isProcessing}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!scanResults && !isScanning && !scanError && (
              <div className="text-center py-20 bg-white rounded-lg border">
                <ScanSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">اضغط &quot;بدء الفحص&quot; لفحص جميع الأعضاء</p>
                <p className="text-gray-400 text-sm mt-2">سيتم فحص جميع الأعضاء النشطين ومقارنة الأسماء والبيانات</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">التكرارات المعلقة</h2>
              <button
                onClick={fetchPending}
                disabled={isPendingLoading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isPendingLoading ? 'animate-spin' : ''}`} />
                تحديث
              </button>
            </div>

            {isPendingLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
              </div>
            )}

            {!isPendingLoading && pendingFlags.length === 0 && (
              <div className="text-center py-16 bg-white rounded-lg border">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-xl font-bold text-gray-800">لا توجد تكرارات معلقة</p>
                <p className="text-gray-500 mt-2">جميع التكرارات المبلغ عنها تم معالجتها</p>
              </div>
            )}

            {!isPendingLoading && pendingFlags.length > 0 && (
              <div className="space-y-4">
                {pendingFlags.map(flag => (
                  <div key={flag.id} className="bg-white border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(flag.status)}
                        <span className="text-sm text-gray-500">نسبة التطابق: {Math.round(flag.matchScore)}%</span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(flag.detectedAt).toLocaleDateString('ar-SA')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        <p className="text-xs text-gray-500 mb-1">المصدر</p>
                        <p className="font-bold">{flag.sourceMember?.fullNameAr || flag.sourceMember?.firstName}</p>
                        <p className="text-sm text-gray-500">{formatMemberId(flag.sourceMemberId)}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        <p className="text-xs text-gray-500 mb-1">الهدف</p>
                        <p className="font-bold">{flag.targetMember?.fullNameAr || flag.targetMember?.firstName}</p>
                        <p className="text-sm text-gray-500">{formatMemberId(flag.targetMemberId)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleDismissPending(flag)}
                        disabled={isProcessing}
                        className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4 inline-block ml-1" />
                        ليس تكرار
                      </button>
                      <button
                        onClick={() => handleMergePending(flag)}
                        disabled={isProcessing}
                        className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        <GitMerge className="w-4 h-4 inline-block ml-1" />
                        دمج
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">سجل التكرارات</h2>
              <button
                onClick={fetchHistory}
                disabled={isHistoryLoading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isHistoryLoading ? 'animate-spin' : ''}`} />
                تحديث
              </button>
            </div>

            {isHistoryLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
              </div>
            )}

            {!isHistoryLoading && historyFlags.length === 0 && (
              <div className="text-center py-16 bg-white rounded-lg border">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl font-bold text-gray-800">لا يوجد سجل</p>
                <p className="text-gray-500 mt-2">لم يتم معالجة أي تكرارات بعد</p>
              </div>
            )}

            {!isHistoryLoading && historyFlags.length > 0 && (
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">المصدر</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الهدف</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">النسبة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historyFlags.map(flag => (
                      <tr key={flag.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{flag.sourceMember?.fullNameAr || flag.sourceMember?.firstName || '—'}</p>
                          <p className="text-xs text-gray-400">{formatMemberId(flag.sourceMemberId)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{flag.targetMember?.fullNameAr || flag.targetMember?.firstName || '—'}</p>
                          <p className="text-xs text-gray-400">{formatMemberId(flag.targetMemberId)}</p>
                        </td>
                        <td className="px-4 py-3">{Math.round(flag.matchScore)}%</td>
                        <td className="px-4 py-3">{getStatusBadge(flag.status)}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {flag.resolvedAt ? new Date(flag.resolvedAt).toLocaleDateString('ar-SA') : new Date(flag.detectedAt).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="px-4 py-3">
                          {(flag.status === 'NOT_DUPLICATE' || flag.status === 'VERIFIED_DIFFERENT') && (
                            <button
                              onClick={() => handleRevertHistory(flag)}
                              disabled={isProcessing}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              تراجع
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowMergeModal(false); setMergePreview(null); }}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-purple-600" />
                معاينة الدمج
              </h3>
              <button onClick={() => { setShowMergeModal(false); setMergePreview(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {isMergeLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-4" />
                  <p className="text-gray-500">جاري تحميل المعاينة...</p>
                </div>
              )}

              {mergePreview && !isMergeLoading && (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-medium text-red-600 mb-2">سيتم حذفه (المصدر)</p>
                      <p className="font-bold text-gray-900">{mergePreview.source.fullNameAr || mergePreview.source.firstName}</p>
                      <p className="text-sm text-gray-500">{formatMemberId(mergePreview.source.id)}</p>
                      <p className="text-xs text-gray-400 mt-1">الجيل {mergePreview.source.generation}</p>
                    </div>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-medium text-green-600 mb-2">سيتم الاحتفاظ به (الهدف)</p>
                      <p className="font-bold text-gray-900">{mergePreview.target.fullNameAr || mergePreview.target.firstName}</p>
                      <p className="text-sm text-gray-500">{formatMemberId(mergePreview.target.id)}</p>
                      <p className="text-xs text-gray-400 mt-1">الجيل {mergePreview.target.generation}</p>
                    </div>
                  </div>

                  {mergePreview.warningsAr && mergePreview.warningsAr.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        تحذيرات
                      </h4>
                      <div className="space-y-2">
                        {mergePreview.warningsAr.map((w, i) => (
                          <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{w}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {mergePreview.conflicts && mergePreview.conflicts.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        تعارضات ({mergePreview.conflicts.length})
                      </h4>
                      <div className="space-y-1">
                        {mergePreview.conflicts.map((c, i) => (
                          <div key={i} className="grid grid-cols-3 text-sm border rounded-md bg-orange-50 border-orange-200">
                            <div className="px-3 py-2 font-medium text-gray-700 border-l">{c.fieldAr}</div>
                            <div className="px-3 py-2 border-l text-red-600">{c.sourceValue != null ? String(c.sourceValue) : '—'}</div>
                            <div className="px-3 py-2 text-green-600">{c.targetValue != null ? String(c.targetValue) : '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-blue-700">{mergePreview.impactedChildren?.length || 0}</p>
                      <p className="text-xs text-blue-600">أبناء سيتم نقلهم</p>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <p className="text-lg font-bold text-blue-700">{mergePreview.impactedPhotos || 0}</p>
                      <p className="text-xs text-blue-600">صور سيتم نقلها</p>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <p className="text-lg font-bold text-blue-700">{mergePreview.impactedJournals || 0}</p>
                      <p className="text-xs text-blue-600">يوميات سيتم نقلها</p>
                    </div>
                  </div>

                  {mergePreview.impactedChildren && mergePreview.impactedChildren.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-700 mb-2">الأبناء الذين سيتم نقلهم:</h4>
                      <div className="flex flex-wrap gap-2">
                        {mergePreview.impactedChildren.map(child => (
                          <span key={child.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {child.firstName} ({formatMemberId(child.id)})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-4 border-t">
                    <button
                      onClick={() => { setShowMergeModal(false); setMergePreview(null); }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={confirmMerge}
                      disabled={isMerging || mergePreview.hasDifferentFather}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {isMerging ? 'جاري الدمج...' : 'تأكيد الدمج'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
