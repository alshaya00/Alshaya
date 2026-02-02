'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { isMale, formatMemberId } from '@/lib/utils';
import {
  ArrowRight,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Merge,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  Check,
  X,
  Filter,
  Loader2,
} from 'lucide-react';
import { findDuplicates, DuplicateMatch } from '@/lib/import-utils';
import type { FamilyMember } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface DuplicatePair {
  member1: FamilyMember;
  member2: FamilyMember;
  score: number;
  reasons: string[];
  status: 'PENDING' | 'CONFIRMED' | 'NOT_DUPLICATE' | 'MERGED';
}

interface ExcludedPair {
  member1Id: string;
  member2Id: string;
  pairKey: string;
  member1Name?: string;
  member2Name?: string;
  resolution?: string;
  resolvedAt?: string;
}

function DuplicatesPageContent() {
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [excludedPairs, setExcludedPairs] = useState<ExcludedPair[]>([]);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        const [membersRes, flagsRes] = await Promise.all([
          fetch('/api/members?limit=2000', {
            headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
          }),
          fetch('/api/admin/duplicate-flags', {
            headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
          })
        ]);
        
        if (membersRes.ok) {
          const data = await membersRes.json();
          setAllMembers(data.data || []);
        }
        
        if (flagsRes.ok) {
          const flagsData = await flagsRes.json();
          setExcludedPairs(flagsData.excludedPairs || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    if (session?.token) {
      fetchData();
    }
  }, [session?.token]);

  const [threshold, setThreshold] = useState(60);
  const [isScanning, setIsScanning] = useState(false);
  const [duplicatePairs, setDuplicatePairs] = useState<DuplicatePair[]>([]);
  const [expandedPairs, setExpandedPairs] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const excludedPairKeys = useMemo(() => {
    return new Set(excludedPairs.map(p => p.pairKey));
  }, [excludedPairs]);

  const scanForDuplicates = () => {
    setIsScanning(true);

    setTimeout(() => {
      const pairs: DuplicatePair[] = [];
      const processedPairs = new Set<string>();

      for (let i = 0; i < allMembers.length; i++) {
        const member = allMembers[i];
        const otherMembers = allMembers.filter(m => m.id !== member.id);
        const matches = findDuplicates(member, otherMembers, threshold);

        for (const match of matches) {
          const pairKey = [member.id, match.existingMember.id].sort().join('-');

          if (!processedPairs.has(pairKey) && !excludedPairKeys.has(pairKey)) {
            processedPairs.add(pairKey);
            pairs.push({
              member1: member,
              member2: match.existingMember,
              score: match.score,
              reasons: match.reasons,
              status: 'PENDING'
            });
          }
        }
      }

      pairs.sort((a, b) => b.score - a.score);
      setDuplicatePairs(pairs);
      setIsScanning(false);
    }, 100);
  };

  const markAsNotDuplicate = async (pair: DuplicatePair) => {
    const pairKey = [pair.member1.id, pair.member2.id].sort().join('-');
    setSavingStatus(pairKey);
    try {
      const res = await fetch('/api/admin/data-cleanup/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}`,
        },
        body: JSON.stringify({
          member1Id: pair.member1.id,
          member2Id: pair.member2.id,
          action: 'mark_not_duplicate',
          reason: 'Verified as different people via duplicate scanner'
        }),
      });

      if (res.ok) {
        const sortedIds = [pair.member1.id, pair.member2.id].sort();
        const pairKey = sortedIds.join('-');
        setExcludedPairs(prev => [...prev, {
          member1Id: sortedIds[0],
          member2Id: sortedIds[1],
          pairKey,
          member1Name: pair.member1.fullNameAr || pair.member1.firstName,
          member2Name: pair.member2.fullNameAr || pair.member2.firstName,
          resolvedAt: new Date().toISOString()
        }]);
        updateStatusByIds(pair.member1.id, pair.member2.id, 'NOT_DUPLICATE');
      } else {
        const error = await res.json();
        alert(error.errorAr || error.error || 'فشل في حفظ القرار');
      }
    } catch (error) {
      console.error('Error marking as not duplicate:', error);
      alert('فشل في حفظ القرار');
    } finally {
      setSavingStatus(null);
    }
  };

  const revertNotDuplicate = async (excludedPair: ExcludedPair) => {
    setSavingStatus(excludedPair.pairKey);
    try {
      const res = await fetch('/api/admin/data-cleanup/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}`,
        },
        body: JSON.stringify({
          member1Id: excludedPair.member1Id,
          member2Id: excludedPair.member2Id,
          action: 'revert'
        }),
      });

      if (res.ok) {
        setExcludedPairs(prev => prev.filter(p => p.pairKey !== excludedPair.pairKey));
        updateStatusByIds(excludedPair.member1Id, excludedPair.member2Id, 'PENDING');
      } else {
        const error = await res.json();
        alert(error.errorAr || error.error || 'فشل في التراجع');
      }
    } catch (error) {
      console.error('Error reverting:', error);
      alert('فشل في التراجع');
    } finally {
      setSavingStatus(null);
    }
  };

  // Toggle expansion
  const togglePair = (index: number) => {
    setExpandedPairs(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  // Update pair status by member IDs (more reliable than index)
  const updateStatusByIds = (member1Id: string, member2Id: string, status: DuplicatePair['status']) => {
    setDuplicatePairs(prev =>
      prev.map(pair => 
        (pair.member1.id === member1Id && pair.member2.id === member2Id) ||
        (pair.member1.id === member2Id && pair.member2.id === member1Id)
          ? { ...pair, status } 
          : pair
      )
    );
  };

  // Legacy update by index (kept for compatibility)
  const updateStatus = (index: number, status: DuplicatePair['status']) => {
    setDuplicatePairs(prev =>
      prev.map((pair, i) => i === index ? { ...pair, status } : pair)
    );
  };

  const [merging, setMerging] = useState<string | null>(null);

  const mergePair = async (pair: DuplicatePair, keepMemberId: string, force: boolean = false): Promise<boolean> => {
    const keepMember = keepMemberId === pair.member1.id ? pair.member1 : pair.member2;
    const removeMember = keepMemberId === pair.member1.id ? pair.member2 : pair.member1;

    setMerging(removeMember.id);

    try {
      const res = await fetch(`/api/members/${removeMember.id}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}`,
        },
        body: JSON.stringify({
          reason: `تم الدمج مع العضو ${keepMember.fullNameAr || keepMember.firstName} (${formatMemberId(keepMember.id)})`,
          mergedIntoId: keepMember.id,
          force,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Use ID-based update for reliable state update
        updateStatusByIds(pair.member1.id, pair.member2.id, 'MERGED');
        setAllMembers(prev => prev.filter(m => m.id !== removeMember.id));
        return true;
      } else if (data.warning && data.hasChildren) {
        const confirmMsg = `${removeMember.fullNameAr || removeMember.firstName} لديه ${data.childrenCount} أبناء:\n${data.childrenNames?.join('، ')}\n\nسيتم نقل الأبناء إلى ${keepMember.fullNameAr || keepMember.firstName}.\n\nهل تريد المتابعة؟`;
        if (confirm(confirmMsg)) {
          return await mergePair(pair, keepMemberId, true);
        }
        return false;
      } else if (data.linkedUser) {
        alert(`لا يمكن حذف هذا العضو لأنه مرتبط بحساب المستخدم "${data.linkedUser.name}".\n\nيجب فك ارتباط الحساب أولاً من صفحة إدارة المستخدمين.`);
        return false;
      } else {
        alert(`فشل الدمج: ${data.messageAr || data.message || 'خطأ غير معروف'}`);
        return false;
      }
    } catch (error) {
      console.error('Error merging:', error);
      alert('حدث خطأ أثناء عملية الدمج');
      return false;
    } finally {
      setMerging(null);
    }
  };

  // Filtered pairs
  const filteredPairs = useMemo(() => {
    if (filterStatus === 'all') return duplicatePairs;
    return duplicatePairs.filter(p => p.status === filterStatus);
  }, [duplicatePairs, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: duplicatePairs.length,
    pending: duplicatePairs.filter(p => p.status === 'PENDING').length,
    confirmed: duplicatePairs.filter(p => p.status === 'CONFIRMED').length,
    notDuplicate: duplicatePairs.filter(p => p.status === 'NOT_DUPLICATE').length,
    merged: duplicatePairs.filter(p => p.status === 'MERGED').length,
    excluded: excludedPairs.length,
  }), [duplicatePairs, excludedPairs]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-red-600 bg-red-100';
    if (score >= 70) return 'text-orange-600 bg-orange-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowRight className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">كشف التكرارات</h1>
                <p className="text-white/80 text-sm">Duplicate Detection & Resolution</p>
              </div>
            </div>
            <Link
              href="/deleted"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <span>المحذوفين مؤخراً</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Scan Controls */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">فحص التكرارات</h2>
              <p className="text-gray-500 text-sm">البحث عن الأعضاء المحتملين أن يكونوا مكررين</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">عتبة التشابه:</label>
                <select
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value={40}>40% (واسع)</option>
                  <option value={50}>50%</option>
                  <option value={60}>60% (متوسط)</option>
                  <option value={70}>70%</option>
                  <option value={80}>80% (دقيق)</option>
                  <option value={90}>90% (صارم)</option>
                </select>
              </div>

              <button
                onClick={scanForDuplicates}
                disabled={isScanning}
                className="flex items-center gap-2 px-6 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    جاري الفحص...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    فحص الآن
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {(duplicatePairs.length > 0 || excludedPairs.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-sm text-gray-500">إجمالي</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-500">قيد المراجعة</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-red-600">{stats.confirmed}</div>
              <div className="text-sm text-gray-500">مؤكد</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-green-600">{stats.notDuplicate}</div>
              <div className="text-sm text-gray-500">ليس تكرار</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{stats.merged}</div>
              <div className="text-sm text-gray-500">تم الدمج</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{stats.excluded}</div>
              <div className="text-sm text-gray-500">تم استبعاده</div>
            </div>
          </div>
        )}

        {/* Excluded Pairs Section */}
        {excludedPairs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">الأزواج المستبعدة</h3>
                <p className="text-sm text-gray-500">هذه الأزواج تم تأكيد أنهم أشخاص مختلفون ولن تظهر في الفحص</p>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {excludedPairs.map((pair) => (
                <div key={pair.pairKey} className="flex items-center justify-between bg-purple-50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-700">
                      {pair.member1Name || pair.member1Id} ↔ {pair.member2Name || pair.member2Id}
                    </span>
                  </div>
                  <button
                    onClick={() => revertNotDuplicate(pair)}
                    disabled={savingStatus === pair.pairKey}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 disabled:opacity-50"
                  >
                    {savingStatus === pair.pairKey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    تراجع
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
        {duplicatePairs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'الكل' },
                  { value: 'PENDING', label: 'قيد المراجعة' },
                  { value: 'CONFIRMED', label: 'مؤكد' },
                  { value: 'NOT_DUPLICATE', label: 'ليس تكرار' },
                  { value: 'MERGED', label: 'تم الدمج' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFilterStatus(value)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      filterStatus === value
                        ? 'bg-[#1E3A5F] text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {duplicatePairs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">لم يتم الفحص بعد</h3>
            <p className="text-gray-500">اضغط على زر الفحص للبحث عن التكرارات المحتملة</p>
          </div>
        ) : filteredPairs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">لا توجد نتائج</h3>
            <p className="text-gray-500">لا توجد تكرارات بهذا الفلتر</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPairs.map((pair, index) => {
              const isExpanded = expandedPairs.includes(index);
              const realIndex = duplicatePairs.indexOf(pair);

              return (
                <div
                  key={`${pair.member1.id}-${pair.member2.id}`}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                    pair.status === 'MERGED' ? 'opacity-60' : ''
                  }`}
                >
                  {/* Pair header */}
                  <button
                    onClick={() => togglePair(index)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(pair.score)}`}>
                        {pair.score}%
                      </span>

                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          isMale(pair.member1.gender) ? 'bg-blue-500' : 'bg-pink-500'
                        }`} />
                        <span className="font-bold">{pair.member1.fullNameAr || pair.member1.firstName}</span>
                        <span className="text-gray-400 text-sm">({formatMemberId(pair.member1.id)})</span>
                      </div>

                      <AlertTriangle className="w-4 h-4 text-yellow-500" />

                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          isMale(pair.member2.gender) ? 'bg-blue-500' : 'bg-pink-500'
                        }`} />
                        <span className="font-bold">{pair.member2.fullNameAr || pair.member2.firstName}</span>
                        <span className="text-gray-400 text-sm">({formatMemberId(pair.member2.id)})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs rounded-lg ${
                        pair.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        pair.status === 'CONFIRMED' ? 'bg-red-100 text-red-700' :
                        pair.status === 'NOT_DUPLICATE' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {pair.status === 'PENDING' ? 'قيد المراجعة' :
                         pair.status === 'CONFIRMED' ? 'تكرار مؤكد' :
                         pair.status === 'NOT_DUPLICATE' ? 'ليس تكرار' : 'تم الدمج'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {/* Pair details */}
                  {isExpanded && (
                    <div className="border-t p-4">
                      {/* Reasons */}
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-gray-500 mb-2">أسباب التشابه:</h4>
                        <div className="flex flex-wrap gap-2">
                          {pair.reasons.map((reason, i) => (
                            <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Side by side comparison */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        {[pair.member1, pair.member2].map((member, mIndex) => (
                          <div
                            key={member.id}
                            className={`p-4 rounded-lg border-2 ${
                              isMale(member.gender) ? 'border-blue-200 bg-blue-50' : 'border-pink-200 bg-pink-50'
                            }`}
                          >
                            <div className="font-bold text-lg mb-2">
                              {member.fullNameAr || member.firstName}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-500">الرقم:</span> {formatMemberId(member.id)}</div>
                              <div><span className="text-gray-500">الجيل:</span> {member.generation}</div>
                              <div><span className="text-gray-500">الفرع:</span> {member.branch || '-'}</div>
                              <div><span className="text-gray-500">سنة الميلاد:</span> {member.birthYear || '-'}</div>
                              <div><span className="text-gray-500">الأب:</span> {member.fatherName || '-'}</div>
                              <div><span className="text-gray-500">الهاتف:</span> {member.phone || '-'}</div>
                              <div><span className="text-gray-500">المدينة:</span> {member.city || '-'}</div>
                              <div><span className="text-gray-500">الحالة:</span> {member.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      {pair.status !== 'MERGED' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => updateStatus(realIndex, 'CONFIRMED')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                              pair.status === 'CONFIRMED'
                                ? 'bg-red-600 text-white'
                                : 'bg-red-100 hover:bg-red-200 text-red-700'
                            }`}
                          >
                            <AlertTriangle className="w-4 h-4" />
                            تأكيد أنه تكرار
                          </button>

                          <button
                            onClick={() => markAsNotDuplicate(pair)}
                            disabled={savingStatus === [pair.member1.id, pair.member2.id].sort().join('-') || pair.status === 'NOT_DUPLICATE'}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                              pair.status === 'NOT_DUPLICATE'
                                ? 'bg-green-600 text-white'
                                : savingStatus === [pair.member1.id, pair.member2.id].sort().join('-')
                                  ? 'bg-gray-400 text-white cursor-not-allowed'
                                  : 'bg-green-100 hover:bg-green-200 text-green-700'
                            }`}
                          >
                            {savingStatus === [pair.member1.id, pair.member2.id].sort().join('-') ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            {pair.status === 'NOT_DUPLICATE' ? 'تم التأكيد' : 'ليس تكرار'}
                          </button>

                          {pair.status === 'CONFIRMED' && (
                            <>
                              <div className="w-px bg-gray-200 mx-2" />
                              <div className="flex flex-col gap-2">
                                <span className="text-sm text-gray-600 font-medium">اختر العضو للاحتفاظ به (العضو الآخر سيحذف):</span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => mergePair(pair, pair.member1.id)}
                                    disabled={merging !== null}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                                  >
                                    {merging === pair.member2.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                    احتفظ بـ {pair.member1.firstName} ({formatMemberId(pair.member1.id)})
                                  </button>
                                  <button
                                    onClick={() => mergePair(pair, pair.member2.id)}
                                    disabled={merging !== null}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                                  >
                                    {merging === pair.member1.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                    احتفظ بـ {pair.member2.firstName} ({formatMemberId(pair.member2.id)})
                                  </button>
                                </div>
                                <span className="text-xs text-gray-500">* يمكن استعادة العضو المحذوف من صفحة &quot;المحذوفين مؤخراً&quot;</span>
                              </div>
                            </>
                          )}

                          <div className="flex-1" />

                          <Link
                            href={`/member/${pair.member1.id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                          >
                            <Eye className="w-4 h-4" />
                            عرض {pair.member1.firstName} ({formatMemberId(pair.member1.id)})
                          </Link>
                          <Link
                            href={`/member/${pair.member2.id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                          >
                            <Eye className="w-4 h-4" />
                            عرض {pair.member2.firstName} ({formatMemberId(pair.member2.id)})
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DuplicatesPage() {
  return (
    <ProtectedRoute redirectTo="/login" requiredRole={['SUPER_ADMIN', 'ADMIN']}>
      <DuplicatesPageContent />
    </ProtectedRoute>
  );
}
