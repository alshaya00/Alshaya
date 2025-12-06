'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getAllMembers, getMemberById, FamilyMember } from '@/lib/data';
import {
  getLinkByToken,
  addPendingMember,
  getPendingMembers,
  BranchEntryLink,
  PendingMember,
} from '@/lib/branchEntry';
import {
  User, Plus, Check, ChevronDown, Search,
  TreePine, Clock, AlertCircle, X
} from 'lucide-react';

export default function BranchEntryPage() {
  const params = useParams();
  const token = params.token as string;

  const [link, setLink] = useState<BranchEntryLink | null>(null);
  const [branchHead, setBranchHead] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [fatherId, setFatherId] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [birthYear, setBirthYear] = useState('');

  // UI state
  const [showFatherDropdown, setShowFatherDropdown] = useState(false);
  const [fatherSearch, setFatherSearch] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<PendingMember[]>([]);
  const [justAdded, setJustAdded] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const allMembers = getAllMembers();

  // Load link and branch head
  useEffect(() => {
    const foundLink = getLinkByToken(token);
    if (!foundLink) {
      setError('الرابط غير صالح أو منتهي الصلاحية');
      setLoading(false);
      return;
    }

    const head = getMemberById(foundLink.branchHeadId);
    if (!head) {
      setError('لم يتم العثور على رأس الفرع');
      setLoading(false);
      return;
    }

    setLink(foundLink);
    setBranchHead(head);
    setFatherId(head.id); // Default father is branch head
    setLoading(false);

    // Load recently added from this session
    const pending = getPendingMembers();
    const fromThisLink = pending.filter(p => p.submittedVia === token);
    setRecentlyAdded(fromThisLink.slice(-10).reverse());
    setSessionCount(fromThisLink.length);
  }, [token]);

  // Get branch members (head + all descendants) for father selection
  const branchMembers = useMemo(() => {
    if (!branchHead) return [];

    const getDescendants = (memberId: string): FamilyMember[] => {
      const children = allMembers.filter(m => m.fatherId === memberId);
      let descendants = [...children];
      children.forEach(child => {
        descendants = [...descendants, ...getDescendants(child.id)];
      });
      return descendants;
    };

    // Include branch head + all descendants + pending members converted to FamilyMember format
    const descendants = getDescendants(branchHead.id);
    const pending = getPendingMembers()
      .filter(p => p.submittedVia === token && p.status === 'pending' && p.gender === 'Male')
      .map(p => ({
        id: p.tempId,
        firstName: p.firstName,
        fatherId: p.fatherId,
        generation: p.generation,
        gender: p.gender,
        fullNameAr: p.fullNameAr,
        branch: p.branch,
        sonsCount: 0,
        daughtersCount: 0,
        isPending: true,
      } as FamilyMember & { isPending?: boolean }));

    return [branchHead, ...descendants, ...pending].filter(m => m.gender === 'Male');
  }, [branchHead, allMembers, token]);

  // Filter fathers by search
  const filteredFathers = useMemo(() => {
    if (!fatherSearch) return branchMembers;
    const search = fatherSearch.toLowerCase();
    return branchMembers.filter(m =>
      m.firstName.toLowerCase().includes(search) ||
      m.id.toLowerCase().includes(search)
    );
  }, [branchMembers, fatherSearch]);

  // Get selected father info
  const selectedFather = useMemo(() => {
    if (!fatherId) return null;
    // Check in branch members first
    const found = branchMembers.find(m => m.id === fatherId);
    if (found) return found;
    // Check in pending
    const pending = getPendingMembers().find(p => p.tempId === fatherId);
    if (pending) return {
      id: pending.tempId,
      firstName: pending.firstName,
      generation: pending.generation,
    };
    return null;
  }, [fatherId, branchMembers]);

  // Calculate auto-filled data
  const autoFill = useMemo(() => {
    if (!selectedFather || !firstName) return null;

    const connector = gender === 'Male' ? 'بن' : 'بنت';
    const generation = (selectedFather.generation || 1) + 1;

    return {
      generation,
      branch: branchHead?.branch || branchHead?.firstName || 'الأصل',
      fullNameAr: `${firstName} ${connector} ${selectedFather.firstName} آل شايع`,
      fatherName: selectedFather.firstName,
    };
  }, [selectedFather, firstName, gender, branchHead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      nameInputRef.current?.focus();
      return;
    }

    if (!fatherId || !autoFill || !link) return;

    // Add to pending
    const newMember = addPendingMember({
      firstName: firstName.trim(),
      fatherId,
      fatherName: autoFill.fatherName,
      gender,
      birthYear: birthYear ? parseInt(birthYear) : undefined,
      generation: autoFill.generation,
      branch: autoFill.branch,
      fullNameAr: autoFill.fullNameAr,
      submittedVia: token,
      branchHeadId: link.branchHeadId,
    });

    // Update UI
    setRecentlyAdded(prev => [newMember, ...prev].slice(0, 10));
    setSessionCount(prev => prev + 1);
    setJustAdded(true);

    // Reset form for next entry
    setFirstName('');
    setBirthYear('');
    // Keep same father selected for quick sibling entry

    // Focus name input for next entry
    setTimeout(() => {
      setJustAdded(false);
      nameInputRef.current?.focus();
    }, 800);
  };

  const handleRemoveRecent = (id: string) => {
    // Remove from local state
    setRecentlyAdded(prev => prev.filter(m => m.id !== id));
    setSessionCount(prev => prev - 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">رابط غير صالح</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-100 py-6 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-3">
            <TreePine className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">إضافة أفراد العائلة</h1>
          <p className="text-gray-500 mt-1">
            فرع: <span className="font-bold text-green-600">{branchHead?.firstName}</span>
          </p>
        </div>

        {/* Session Counter */}
        {sessionCount > 0 && (
          <div className="bg-green-100 border border-green-300 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="text-green-600" size={20} />
              <span className="text-green-800 font-medium">
                تمت إضافة {sessionCount} عضو في هذه الجلسة
              </span>
            </div>
            <Clock className="text-green-500" size={18} />
          </div>
        )}

        {/* Success Flash */}
        {justAdded && (
          <div className="bg-green-500 text-white rounded-xl p-4 mb-4 flex items-center gap-3 animate-pulse">
            <Check size={24} />
            <span className="font-bold">تمت الإضافة بنجاح! أضف المزيد...</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-l from-green-500 to-green-600 px-5 py-4 text-white">
            <h2 className="font-bold text-lg">إضافة عضو جديد</h2>
            <p className="text-green-100 text-sm">أدخل البيانات واضغط إضافة</p>
          </div>

          <div className="p-5 space-y-4">
            {/* Name Input - MOST IMPORTANT */}
            <div>
              <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                <User size={18} />
                الاسم الأول <span className="text-red-500">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:border-green-500 focus:outline-none bg-yellow-50"
                placeholder="أدخل الاسم الأول..."
                autoFocus
                autoComplete="off"
              />
            </div>

            {/* Father Selection */}
            <div className="relative">
              <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                <User size={18} />
                الأب
              </label>
              <button
                type="button"
                onClick={() => setShowFatherDropdown(!showFatherDropdown)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-right flex items-center justify-between bg-green-50 hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">
                    👨
                  </div>
                  <span className="font-medium">
                    {selectedFather?.firstName || 'اختر الأب'}
                  </span>
                  {selectedFather && (
                    <span className="text-xs text-gray-400">
                      ج{selectedFather.generation}
                    </span>
                  )}
                </div>
                <ChevronDown size={20} className={`text-gray-400 transition-transform ${showFatherDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Father Dropdown */}
              {showFatherDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-64 overflow-hidden">
                  {/* Search */}
                  <div className="p-2 border-b sticky top-0 bg-white">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        value={fatherSearch}
                        onChange={(e) => setFatherSearch(e.target.value)}
                        placeholder="ابحث..."
                        className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredFathers.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setFatherId(member.id);
                          setShowFatherDropdown(false);
                          setFatherSearch('');
                        }}
                        className={`w-full px-4 py-2 text-right flex items-center gap-3 hover:bg-green-50 border-b last:border-0 ${
                          fatherId === member.id ? 'bg-green-100' : ''
                        }`}
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">
                          {(member as any).isPending ? '⏳' : '👨'}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">{member.firstName}</span>
                          <span className="text-xs text-gray-400 mr-2">ج{member.generation}</span>
                          {(member as any).isPending && (
                            <span className="text-xs text-orange-500 mr-1">(جديد)</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Gender Selection */}
            <div>
              <label className="font-bold text-gray-700 mb-2 block">الجنس</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('Male')}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                    gender === 'Male'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <span className="text-2xl">👨</span>
                  <span className="font-medium">ذكر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGender('Female')}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                    gender === 'Female'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <span className="text-2xl">👩</span>
                  <span className="font-medium">أنثى</span>
                </button>
              </div>
            </div>

            {/* Birth Year (Optional) */}
            <div>
              <label className="font-bold text-gray-700 mb-2 block">
                سنة الميلاد <span className="text-gray-400 font-normal text-sm">(اختياري)</span>
              </label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                placeholder="مثال: 1990"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>

            {/* Auto-fill Preview */}
            {autoFill && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">الاسم الكامل:</p>
                <p className="font-bold text-blue-800">{autoFill.fullNameAr}</p>
                <p className="text-xs text-blue-500 mt-1">
                  الجيل {autoFill.generation} • فرع {autoFill.branch}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!firstName.trim() || !fatherId}
              className="w-full py-4 bg-gradient-to-l from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              <Plus size={24} />
              إضافة العضو
            </button>
          </div>
        </form>

        {/* Recently Added */}
        {recentlyAdded.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-700">المضافين حديثاً</h3>
              <span className="text-sm text-gray-400">{recentlyAdded.length} عضو</span>
            </div>
            <div className="divide-y max-h-64 overflow-y-auto">
              {recentlyAdded.map(member => (
                <div key={member.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    member.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
                  }`}>
                    {member.gender === 'Male' ? '👨' : '👩'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{member.firstName}</p>
                    <p className="text-xs text-gray-400">
                      ابن {member.fatherName} • ج{member.generation}
                    </p>
                  </div>
                  <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded">
                    بانتظار المراجعة
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <h4 className="font-bold text-yellow-800 mb-2">💡 للإضافة السريعة:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• اختر الأب مرة واحدة ثم أضف جميع أبنائه</li>
            <li>• الأعضاء الجدد يظهرون في قائمة الآباء فوراً</li>
            <li>• البيانات تُراجع من المسؤول قبل الإضافة النهائية</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
