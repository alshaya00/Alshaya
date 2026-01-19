'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { FamilyMember } from '@/lib/types';
import {
  getLinkByToken,
  BranchEntryLink,
  PendingMember,
  generateTempId,
} from '@/lib/branchEntry';
import BranchAddMemberGraph from '@/components/BranchAddMemberGraph';
import BranchTreeViewer from '@/components/BranchTreeViewer';
import {
  User, Plus, Check, ChevronDown, Search, ArrowRight, ArrowLeft,
  TreePine, Clock, AlertCircle, X, Eye, Send, Edit2, Trash2,
  CheckCircle, Users, GitBranch, Info, List, Maximize2, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import GenderAvatar from '@/components/GenderAvatar';
import { getYearRange, CalendarType } from '@/lib/utils/hijri-calendar';

// Step definitions
type Step = 'info' | 'add' | 'review' | 'submitted';

// Build full lineage name - searches in both regular members and pending session members
function getFullLineageName(
  member: FamilyMember | (FamilyMember & { isPending?: boolean }),
  allMembers: FamilyMember[],
  maxDepth: number = 4,
  sessionMembers: PendingMember[] = []
): string {
  const names: string[] = [member.firstName];
  let currentFatherId = member.fatherId;
  let depth = 0;

  while (currentFatherId && depth < maxDepth) {
    // First search in regular members
    let father = allMembers.find(m => m.id === currentFatherId);

    // If not found, search in session/pending members (by tempId)
    if (!father) {
      const pendingFather = sessionMembers.find(p => p.tempId === currentFatherId);
      if (pendingFather) {
        names.push(pendingFather.firstName);
        currentFatherId = pendingFather.fatherId;
        depth++;
        continue;
      } else {
        break;
      }
    }

    names.push(father.firstName);
    currentFatherId = father.fatherId || null;
    depth++;
  }

  if (names.length > 1) {
    return names.join(' بن ') + ' آل شايع';
  }
  return member.firstName + ' آل شايع';
}

// Mini Tree Node Component for regular members
function TreeNode({
  member,
  allMembers,
  pendingMembers,
  level = 0,
  isHighlighted = false,
  highlightedIds = new Set<string>()
}: {
  member: FamilyMember;
  allMembers: FamilyMember[];
  pendingMembers: PendingMember[];
  level?: number;
  isHighlighted?: boolean;
  highlightedIds?: Set<string>;
}) {
  const children = allMembers.filter(m => m.fatherId === member.id);
  const pendingChildren = pendingMembers.filter(p => p.fatherId === member.id && p.status === 'pending');
  const isNodeHighlighted = highlightedIds.has(member.id);

  return (
    <div className="relative">
      {/* Node */}
      <div className={`flex items-center gap-2 py-1 px-2 rounded-lg transition-all ${
        isNodeHighlighted
          ? 'bg-green-100 border-2 border-green-500'
          : 'bg-gray-50 border border-gray-200'
      }`}>
        <GenderAvatar gender={member.gender} size="sm" />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isNodeHighlighted ? 'text-green-700' : 'text-gray-700'}`}>
            {member.firstName}
          </p>
          <p className="text-xs text-gray-400">ج{member.generation}</p>
        </div>
      </div>

      {/* Children */}
      {(children.length > 0 || pendingChildren.length > 0) && (
        <div className="mr-4 mt-1 border-r-2 border-gray-200 pr-3 space-y-1">
          {children.map(child => (
            <TreeNode
              key={child.id}
              member={child}
              allMembers={allMembers}
              pendingMembers={pendingMembers}
              level={level + 1}
              highlightedIds={highlightedIds}
            />
          ))}
          {pendingChildren.map(pending => (
            <PendingTreeNode
              key={pending.id}
              pending={pending}
              allMembers={allMembers}
              pendingMembers={pendingMembers}
              level={level + 1}
              highlightedIds={highlightedIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Tree Node for pending/temporary members - supports showing their children too
function PendingTreeNode({
  pending,
  allMembers,
  pendingMembers,
  level = 0,
  highlightedIds = new Set<string>()
}: {
  pending: PendingMember;
  allMembers: FamilyMember[];
  pendingMembers: PendingMember[];
  level?: number;
  highlightedIds?: Set<string>;
}) {
  // Find children of this pending member (they reference the tempId as fatherId)
  const pendingChildrenOfPending = pendingMembers.filter(
    p => p.fatherId === pending.tempId && p.status === 'pending' && p.id !== pending.id
  );

  return (
    <div className="relative">
      {/* Pending Node */}
      <div className="flex items-center gap-2 py-1 px-2 rounded-lg bg-yellow-50 border-2 border-yellow-400 border-dashed">
        <GenderAvatar gender={pending.gender} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-yellow-700">
            {pending.firstName}
            <span className="text-xs text-yellow-500 mr-1">(جديد)</span>
          </p>
          <p className="text-xs text-yellow-500">ج{pending.generation}</p>
        </div>
      </div>

      {/* Children of pending member */}
      {pendingChildrenOfPending.length > 0 && (
        <div className="mr-4 mt-1 border-r-2 border-yellow-300 pr-3 space-y-1">
          {pendingChildrenOfPending.map(child => (
            <PendingTreeNode
              key={child.id}
              pending={child}
              allMembers={allMembers}
              pendingMembers={pendingMembers}
              level={level + 1}
              highlightedIds={highlightedIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BranchEntryPage() {
  const { session } = useAuth();
  const params = useParams();
  const token = params.token as string;

  const [link, setLink] = useState<BranchEntryLink | null>(null);
  const [branchHead, setBranchHead] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('info');

  // Form state
  const [firstName, setFirstName] = useState('');
  const [fatherId, setFatherId] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [birthYear, setBirthYear] = useState('');
  const [birthCalendar, setBirthCalendar] = useState<CalendarType>('HIJRI');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  // UI state
  const [showFatherDropdown, setShowFatherDropdown] = useState(false);
  const [fatherSearch, setFatherSearch] = useState('');
  const [sessionMembers, setSessionMembers] = useState<PendingMember[]>([]);
  const [justAdded, setJustAdded] = useState(false);
  const [editingMember, setEditingMember] = useState<PendingMember | null>(null);
  const [submitterName, setSubmitterName] = useState('');
  const [submitterPhone, setSubmitterPhone] = useState('');
  const [viewMode, setViewMode] = useState<'graph' | 'dropdown'>('graph');
  const [showTreeViewer, setShowTreeViewer] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const headers: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}` } : {};
        const res = await fetch('/api/members?limit=500', { headers });
        if (res.ok) {
          const data = await res.json();
          setAllMembers(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching members:', err);
      }
    }
    fetchData();
  }, [session?.token]);

  useEffect(() => {
    if (allMembers.length === 0) return;

    async function initializeBranchData() {
      const foundLink = await getLinkByToken(token);
      if (!foundLink) {
        setError('الرابط غير صالح أو منتهي الصلاحية');
        setLoading(false);
        return;
      }

      const head = allMembers.find(m => m.id === foundLink.branchHeadId);
      if (!head) {
        setError('لم يتم العثور على رأس الفرع');
        setLoading(false);
        return;
      }

      setLink(foundLink);
      setBranchHead(head);
      setFatherId(head.id);
      setLoading(false);

      // Fetch pending members from database API
      try {
        const res = await fetch(`/api/admin/pending?submittedVia=${token}`);
        if (res.ok) {
          const data = await res.json();
          // Map database format to local PendingMember format
          const mappedMembers: PendingMember[] = (data.pending || []).map((p: any) => ({
            id: p.id,
            tempId: p.id, // Use database id as tempId for consistency
            firstName: p.firstName,
            fatherId: p.proposedFatherId || '',
            fatherName: p.fatherName || '',
            gender: p.gender as 'Male' | 'Female',
            birthYear: p.birthYear,
            city: p.city,
            occupation: p.occupation,
            phone: p.phone,
            generation: p.generation,
            branch: p.branch,
            fullNameAr: p.fullNameAr || p.firstName,
            submittedAt: p.submittedAt,
            submittedVia: p.submittedVia,
            branchHeadId: foundLink.branchHeadId,
            status: 'pending' as const,
          }));
          setSessionMembers(mappedMembers);
        }
      } catch (err) {
        console.error('Error fetching pending members:', err);
      }
    }
    initializeBranchData();
  }, [token, allMembers]);

  // Get branch members for father selection
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

    const descendants = getDescendants(branchHead.id);

    // Include pending members as potential fathers
    const pendingAsFathers = sessionMembers
      .filter(p => p.gender?.toUpperCase() === 'MALE')
      .map(p => ({
        id: p.tempId,
        firstName: p.firstName,
        fatherId: p.fatherId,
        generation: p.generation,
        gender: p.gender as 'Male' | 'Female',
        fullNameAr: p.fullNameAr,
        branch: p.branch,
        sonsCount: 0,
        daughtersCount: 0,
        isPending: true,
      } as FamilyMember & { isPending?: boolean }));

    return [branchHead, ...descendants, ...pendingAsFathers].filter(m => m.gender?.toUpperCase() === 'MALE');
  }, [branchHead, allMembers, sessionMembers]);

  // Filter fathers by search
  const filteredFathers = useMemo(() => {
    if (!fatherSearch) return branchMembers;
    const search = fatherSearch.toLowerCase();
    return branchMembers.filter(m => {
      const fullName = getFullLineageName(m, allMembers, 3, sessionMembers);
      return m.firstName.toLowerCase().includes(search) ||
             fullName.toLowerCase().includes(search) ||
             m.id.toLowerCase().includes(search);
    });
  }, [branchMembers, fatherSearch, allMembers, sessionMembers]);

  // Get selected father info
  const selectedFather = useMemo(() => {
    if (!fatherId) return null;
    return branchMembers.find(m => m.id === fatherId || (m as any).id === fatherId) || null;
  }, [fatherId, branchMembers]);

  // Calculate auto-filled data - builds full lineage through temporary members
  const autoFill = useMemo(() => {
    if (!selectedFather || !firstName) return null;

    const connector = gender?.toUpperCase() === 'MALE' ? 'بن' : 'بنت';
    const generation = (selectedFather.generation || 1) + 1;
    const fatherFullName = getFullLineageName(selectedFather, allMembers, 2, sessionMembers);

    // Build the full name including ancestor chain through temporary members
    const fatherLineage = getFullLineageName(selectedFather, allMembers, 3, sessionMembers);
    // Remove the family name suffix to get just the lineage names
    const lineageWithoutSuffix = fatherLineage.replace(' آل شايع', '');
    const fullNameAr = `${firstName} ${connector} ${lineageWithoutSuffix} آل شايع`;

    return {
      generation,
      branch: branchHead?.branch || branchHead?.firstName || 'الأصل',
      fullNameAr,
      fatherName: selectedFather.firstName,
      fatherFullName,
    };
  }, [selectedFather, firstName, gender, branchHead, allMembers, sessionMembers]);

  // Get highlighted IDs for tree visualization - traverses through both regular and pending members
  const highlightedIds = useMemo(() => {
    const ids = new Set<string>();
    sessionMembers.forEach(m => {
      ids.add(m.tempId);
      // Also highlight the path to root (through both regular and pending members)
      let currentId = m.fatherId;
      while (currentId) {
        ids.add(currentId);
        // First try to find in regular members
        const parent = allMembers.find(p => p.id === currentId);
        if (parent) {
          currentId = parent.fatherId || '';
        } else {
          // If not found, try to find in pending members (by tempId)
          const pendingParent = sessionMembers.find(p => p.tempId === currentId);
          if (pendingParent) {
            currentId = pendingParent.fatherId;
          } else {
            break;
          }
        }
      }
    });
    return ids;
  }, [sessionMembers, allMembers]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      nameInputRef.current?.focus();
      return;
    }

    if (!fatherId || !autoFill || !link || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // POST to database API
      const response = await fetch('/api/admin/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          fatherName: autoFill.fatherName,
          familyName: 'آل شايع',
          proposedFatherId: fatherId,
          gender,
          birthYear: birthYear ? parseInt(birthYear) : undefined,
          birthCalendar,
          generation: autoFill.generation,
          branch: autoFill.branch,
          fullNameAr: autoFill.fullNameAr,
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
          status: 'Living',
          submittedVia: token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add pending member');
      }

      const data = await response.json();
      const pending = data.pending;

      // Map to local PendingMember format
      const newMember: PendingMember = {
        id: pending.id,
        tempId: pending.id,
        firstName: pending.firstName,
        fatherId: pending.proposedFatherId || fatherId,
        fatherName: autoFill.fatherName,
        gender,
        birthYear: birthYear ? parseInt(birthYear) : undefined,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        generation: autoFill.generation,
        branch: autoFill.branch,
        fullNameAr: autoFill.fullNameAr,
        submittedAt: pending.submittedAt || new Date().toISOString(),
        submittedVia: token,
        branchHeadId: link.branchHeadId,
        status: 'pending',
      };

      setSessionMembers(prev => [...prev, newMember]);
      setJustAdded(true);

      // Reset form
      setFirstName('');
      setBirthYear('');
      setBirthCalendar('GREGORIAN');
      setPhone('');
      setCity('');

      setTimeout(() => {
        setJustAdded(false);
        nameInputRef.current?.focus();
      }, 800);
    } catch (error) {
      console.error('Error adding pending member:', error);
      alert('حدث خطأ أثناء إضافة العضو. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    try {
      // DELETE from database API with token verification
      const response = await fetch(`/api/admin/pending/${id}?submittedVia=${token}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to delete pending member:', data);
        // Still remove from local state if it fails (member might already be deleted)
      }

      setSessionMembers(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error deleting pending member:', error);
      // Remove from local state anyway
      setSessionMembers(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleEditMember = (member: PendingMember) => {
    setEditingMember(member);
    setFirstName(member.firstName);
    setFatherId(member.fatherId);
    setGender(member.gender);
    setBirthYear(member.birthYear?.toString() || '');
    setBirthCalendar((member as any).birthCalendar || 'GREGORIAN');
    setPhone(member.phone || '');
    setCity(member.city || '');
  };

  const handleUpdateMember = async () => {
    if (!editingMember || !firstName.trim() || !autoFill || !link || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Delete the old pending member and create a new one with updated data
      await fetch(`/api/admin/pending/${editingMember.id}?submittedVia=${token}`, {
        method: 'DELETE',
      });

      // Create new pending member with updated data
      const response = await fetch('/api/admin/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          fatherName: autoFill.fatherName,
          familyName: 'آل شايع',
          proposedFatherId: fatherId,
          gender,
          birthYear: birthYear ? parseInt(birthYear) : undefined,
          birthCalendar,
          generation: autoFill.generation,
          branch: autoFill.branch,
          fullNameAr: autoFill.fullNameAr,
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
          status: 'Living',
          submittedVia: token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update pending member');
      }

      const data = await response.json();
      const pending = data.pending;

      // Map to local PendingMember format
      const updatedMember: PendingMember = {
        id: pending.id,
        tempId: pending.id,
        firstName: pending.firstName,
        fatherId: pending.proposedFatherId || fatherId,
        fatherName: autoFill.fatherName,
        gender,
        birthYear: birthYear ? parseInt(birthYear) : undefined,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        generation: autoFill.generation,
        branch: autoFill.branch,
        fullNameAr: autoFill.fullNameAr,
        submittedAt: pending.submittedAt || new Date().toISOString(),
        submittedVia: token,
        branchHeadId: link.branchHeadId,
        status: 'pending',
      };

      // Update local state: remove old, add new
      setSessionMembers(prev => {
        const filtered = prev.filter(m => m.id !== editingMember.id);
        return [...filtered, updatedMember];
      });

      setEditingMember(null);
      setFirstName('');
      setBirthYear('');
      setBirthCalendar('GREGORIAN');
      setPhone('');
      setCity('');
    } catch (error) {
      console.error('Error updating pending member:', error);
      alert('حدث خطأ أثناء تحديث العضو. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = () => {
    // Mark all as ready for review (they already are pending, this just moves to submitted state)
    setCurrentStep('submitted');
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

  // Step 1: Info/Instructions
  if (currentStep === 'info') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-100 py-6 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4 shadow-lg">
              <TreePine className="text-white" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">شجرة آل شايع</h1>
            <p className="text-gray-500 mt-1">إضافة أفراد العائلة</p>
          </div>

          {/* Branch Info Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <div className="bg-gradient-to-l from-green-500 to-green-600 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <GitBranch size={24} />
                <div>
                  <p className="text-green-100 text-sm">تحديث فرع</p>
                  <h2 className="font-bold text-lg">
                    فرع {branchHead?.firstName} - الجيل {branchHead?.generation}
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-5">
              {/* Full Name Display */}
              {branchHead && (
                <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">رأس الفرع:</p>
                  <p className="font-bold text-blue-800 text-lg">
                    {getFullLineageName(branchHead, allMembers, 4, sessionMembers)}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    الجيل {branchHead.generation} • {branchHead.sonsCount} أبناء
                  </p>
                </div>
              )}

              {/* Current Branch Tree Preview with Graph Toggle */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Eye size={16} />
                    معاينة الفرع الحالي:
                  </p>
                  <button
                    onClick={() => setShowTreeViewer(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded-lg transition-colors"
                  >
                    <Maximize2 size={14} />
                    عرض الشجرة كاملة
                  </button>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto border">
                  {branchHead && (
                    <TreeNode
                      member={branchHead}
                      allMembers={allMembers}
                      pendingMembers={sessionMembers}
                      highlightedIds={highlightedIds}
                    />
                  )}
                </div>
                <p className="text-xs text-center text-gray-400 mt-2">
                  انقر &ldquo;عرض الشجرة كاملة&rdquo; لرؤية الشجرة التفاعلية
                </p>
              </div>

              {/* Instructions */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Info size={18} className="text-green-600" />
                  كيفية الإضافة:
                </h3>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>أضف أسماء أفراد عائلتك (الأبناء والأحفاد)</li>
                  <li>اختر الأب لكل فرد من الشجرة التفاعلية</li>
                  <li>راجع جميع الإضافات قبل الإرسال</li>
                  <li>سيقوم المسؤول بمراجعة الإضافات والموافقة عليها</li>
                </ol>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-5 pt-0 space-y-3">
              <button
                onClick={() => setCurrentStep('add')}
                className="w-full py-4 bg-gradient-to-l from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus size={24} />
                ابدأ الإضافة
              </button>
              <button
                onClick={() => setShowTreeViewer(true)}
                className="w-full py-3 border-2 border-green-500 text-green-600 font-medium rounded-xl hover:bg-green-50 transition-all flex items-center justify-center gap-2"
              >
                <Eye size={20} />
                عرض شجرة الفرع
              </button>
            </div>
          </div>

          {/* Already added indicator */}
          {sessionMembers.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Clock className="text-orange-500" size={20} />
                <div>
                  <p className="font-medium text-orange-800">
                    لديك {sessionMembers.length} عضو بانتظار المراجعة
                  </p>
                  <button
                    onClick={() => setCurrentStep('review')}
                    className="text-sm text-orange-600 underline"
                  >
                    عرض ومراجعة الإضافات
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tree Viewer Modal */}
        {branchHead && (
          <BranchTreeViewer
            branchHead={branchHead}
            allMembers={allMembers}
            pendingMembers={sessionMembers}
            isOpen={showTreeViewer}
            onClose={() => setShowTreeViewer(false)}
          />
        )}
      </div>
    );
  }

  // Step 2: Add Members
  if (currentStep === 'add') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-100 py-6 px-4 pb-32">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentStep('info')}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <ArrowRight size={20} />
              رجوع
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-800">إضافة أفراد</h1>
              <p className="text-sm text-gray-500">فرع {branchHead?.firstName}</p>
            </div>
            <button
              onClick={() => setShowTreeViewer(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded-lg transition-colors"
              title="عرض الشجرة كاملة"
            >
              <Eye size={14} />
              الشجرة
            </button>
          </div>

          {/* Session Counter */}
          {sessionMembers.length > 0 && (
            <div className="bg-green-100 border border-green-300 rounded-xl p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="text-green-600" size={20} />
                <span className="text-green-800 font-medium">
                  تمت إضافة {sessionMembers.length} عضو
                </span>
              </div>
              <button
                onClick={() => setCurrentStep('review')}
                className="text-sm text-green-600 underline font-medium"
              >
                مراجعة
              </button>
            </div>
          )}

          {/* Success Flash */}
          {justAdded && (
            <div className="bg-green-500 text-white rounded-xl p-4 mb-4 flex items-center gap-3 animate-pulse">
              <CheckCircle size={24} />
              <span className="font-bold">تمت الإضافة بنجاح!</span>
            </div>
          )}

          {/* View Mode Toggle & Graph/Tree View */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-4">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <TreePine size={16} className="text-green-600" />
                اختر الأب من الشجرة
              </p>
              <div className="flex items-center gap-1 bg-white rounded-lg p-1 border shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('graph')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'graph'
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <GitBranch size={14} />
                  الشجرة
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('dropdown')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'dropdown'
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <List size={14} />
                  القائمة
                </button>
              </div>
            </div>

            {/* Graph View */}
            {viewMode === 'graph' && branchHead && (
              <div className="p-3">
                <BranchAddMemberGraph
                  branchHead={branchHead}
                  branchMembers={branchMembers.filter(m => !('isPending' in m))}
                  pendingMembers={sessionMembers}
                  selectedFatherId={fatherId}
                  onSelectFather={(id) => setFatherId(id)}
                  newMemberPreview={firstName ? {
                    firstName: firstName,
                    gender: gender
                  } : null}
                />
                {fatherId && (
                  <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-xl py-2.5 mt-3">
                    <Check size={18} />
                    <span className="font-medium text-sm">
                      تم اختيار: {selectedFather?.firstName || fatherId}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFatherId('')}
                      className="text-gray-400 hover:text-red-500 mr-2"
                      title="إلغاء الاختيار"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Simple Tree View (for dropdown mode) */}
            {viewMode === 'dropdown' && (
              <div className="p-4">
                <div className="bg-gray-50 rounded-xl p-3 max-h-56 overflow-y-auto border mb-3">
                  {branchHead && (
                    <TreeNode
                      member={branchHead}
                      allMembers={allMembers}
                      pendingMembers={sessionMembers}
                      highlightedIds={highlightedIds}
                    />
                  )}
                </div>
                <p className="text-xs text-gray-400 text-center">
                  الأعضاء الجدد يظهرون بإطار أصفر منقط
                </p>
              </div>
            )}
          </div>

          {/* Main Form */}
          <form onSubmit={editingMember ? (e) => { e.preventDefault(); handleUpdateMember(); } : handleSubmit} className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Form Header */}
            <div className={`px-5 py-4 text-white ${editingMember ? 'bg-gradient-to-l from-orange-500 to-orange-600' : 'bg-gradient-to-l from-green-500 to-green-600'}`}>
              <h2 className="font-bold text-lg">
                {editingMember ? 'تعديل عضو' : 'إضافة عضو جديد'}
              </h2>
              <p className="text-sm opacity-80">
                {editingMember ? 'قم بتعديل البيانات ثم اضغط حفظ' : 'أدخل البيانات واضغط إضافة'}
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Name Input */}
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
                  placeholder="مثال: محمد"
                  autoFocus
                  autoComplete="off"
                />
              </div>

              {/* Father Selection - Only show in dropdown mode */}
              {viewMode === 'dropdown' && (
                <div className="relative">
                  <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                    <User size={18} />
                    الأب <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFatherDropdown(!showFatherDropdown)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-right bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <GenderAvatar gender="Male" size="md" className="flex-shrink-0" />
                        <div className="flex-1 min-w-0 text-right">
                          {selectedFather ? (
                            <>
                              <p className="font-bold text-gray-800 truncate">
                                {getFullLineageName(selectedFather, allMembers, 2, sessionMembers)}
                              </p>
                              <p className="text-xs text-gray-500">
                                الجيل {selectedFather.generation} • {selectedFather.id}
                              </p>
                            </>
                          ) : (
                            <span className="text-gray-400">اختر الأب</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown size={20} className={`text-gray-400 transition-transform flex-shrink-0 mr-2 ${showFatherDropdown ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Father Dropdown */}
                  {showFatherDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-72 overflow-hidden">
                      {/* Search */}
                      <div className="p-3 border-b sticky top-0 bg-white">
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            value={fatherSearch}
                            onChange={(e) => setFatherSearch(e.target.value)}
                            placeholder="ابحث بالاسم..."
                            className="w-full pr-10 pl-3 py-2.5 border rounded-lg focus:outline-none focus:border-green-500"
                          />
                        </div>
                      </div>

                      {/* Options */}
                      <div className="max-h-52 overflow-y-auto">
                        {filteredFathers.map(member => {
                          const fullName = getFullLineageName(member, allMembers, 2, sessionMembers);
                          const isPending = (member as any).isPending;

                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => {
                                setFatherId(member.id);
                                setShowFatherDropdown(false);
                                setFatherSearch('');
                              }}
                              className={`w-full px-4 py-3 text-right flex items-center gap-3 hover:bg-green-50 border-b last:border-0 transition-colors ${
                                fatherId === member.id ? 'bg-green-100' : ''
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                                {isPending ? '⏳' : <GenderAvatar gender="Male" size="md" />}
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <p className="font-medium text-gray-800">
                                  {fullName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  الجيل {member.generation}
                                  {isPending && <span className="text-orange-500 mr-2">(جديد - مضاف هذه الجلسة)</span>}
                                </p>
                              </div>
                              {fatherId === member.id && (
                                <Check size={18} className="text-green-600 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                        {filteredFathers.length === 0 && (
                          <p className="text-center text-gray-400 py-4">لا توجد نتائج</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Father Display - For graph mode */}
              {viewMode === 'graph' && selectedFather && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3">
                  <label className="text-xs text-green-600 mb-1 block">الأب المختار من الشجرة:</label>
                  <p className="font-bold text-green-800">
                    {getFullLineageName(selectedFather, allMembers, 2, sessionMembers)}
                  </p>
                </div>
              )}

              {viewMode === 'graph' && !selectedFather && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3">
                  <p className="text-yellow-700 text-sm text-center">
                    👆 انقر على أي ذكر في الشجرة أعلاه لاختياره كأب
                  </p>
                </div>
              )}

              {/* Gender Selection */}
              <div>
                <label className="font-bold text-gray-700 mb-2 block">الجنس</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGender('Male')}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                      gender?.toUpperCase() === 'MALE'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <GenderAvatar gender="Male" size="lg" />
                    <span className="font-medium">ذكر</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('Female')}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                      gender?.toUpperCase() === 'FEMALE'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <GenderAvatar gender="Female" size="lg" />
                    <span className="font-medium">أنثى</span>
                  </button>
                </div>
              </div>

              {/* Optional Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">
                    سنة الميلاد <span className="text-gray-400">(اختياري)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      className="flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                      placeholder={birthCalendar === 'HIJRI' ? '1410' : '1990'}
                      min={getYearRange(birthCalendar).min}
                      max={getYearRange(birthCalendar).max}
                    />
                    <select
                      value={birthCalendar}
                      onChange={(e) => setBirthCalendar(e.target.value as CalendarType)}
                      className="px-2 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none bg-white"
                      title="نوع التقويم"
                    >
                      <option value="HIJRI">هجري</option>
                      <option value="GREGORIAN">ميلادي</option>
                    </select>
                  </div>
                  {/* Smart calendar detection warning */}
                  {birthYear && (() => {
                    const year = parseInt(birthYear);
                    if (!isNaN(year)) {
                      if (birthCalendar === 'HIJRI' && year >= 1900 && year <= 2030) {
                        return (
                          <p className="text-amber-600 text-xs mt-1 col-span-2">
                            ⚠️ هل تقصد السنة الميلادية؟ {year} تبدو ميلادية
                          </p>
                        );
                      }
                      if (birthCalendar === 'GREGORIAN' && year >= 1300 && year <= 1500) {
                        return (
                          <p className="text-amber-600 text-xs mt-1 col-span-2">
                            ⚠️ هل تقصد السنة الهجرية؟ {year} تبدو هجرية
                          </p>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">
                    رقم الجوال <span className="text-gray-400">(اختياري)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Auto-fill Preview */}
              {autoFill && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">الاسم الكامل:</p>
                  <p className="font-bold text-blue-800 text-lg">{autoFill.fullNameAr}</p>
                  <p className="text-xs text-blue-500 mt-1">
                    الجيل {autoFill.generation} • فرع {autoFill.branch}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!firstName.trim() || !fatherId}
                className={`w-full py-4 font-bold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${
                  editingMember
                    ? 'bg-gradient-to-l from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                    : 'bg-gradient-to-l from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                }`}
              >
                {editingMember ? (
                  <>
                    <Check size={24} />
                    حفظ التعديلات
                  </>
                ) : (
                  <>
                    <Plus size={24} />
                    إضافة العضو
                  </>
                )}
              </button>

              {editingMember && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMember(null);
                    setFirstName('');
                    setBirthYear('');
                    setPhone('');
                    setCity('');
                  }}
                  className="w-full py-3 border-2 border-gray-300 text-gray-600 font-medium rounded-xl hover:bg-gray-50"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>
          </form>

          {/* Recently Added Preview */}
          {sessionMembers.length > 0 && (
            <div className="mt-6 bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <Users size={18} />
                  المضافين ({sessionMembers.length})
                </h3>
              </div>
              <div className="divide-y max-h-48 overflow-y-auto">
                {sessionMembers.slice(-5).reverse().map(member => (
                  <div key={member.id} className="px-5 py-3 flex items-center gap-3">
                    <GenderAvatar gender={member.gender} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">{member.fullNameAr}</p>
                      <p className="text-xs text-gray-400">
                        ج{member.generation} • ابن {member.fatherName}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditMember(member)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        {sessionMembers.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
            <div className="max-w-lg mx-auto flex items-center gap-3">
              <div className="flex-1">
                <p className="font-bold text-gray-800">{sessionMembers.length} عضو جاهز</p>
                <p className="text-xs text-gray-500">اضغط للمراجعة والإرسال</p>
              </div>
              <button
                onClick={() => setCurrentStep('review')}
                className="px-6 py-3 bg-gradient-to-l from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg"
              >
                مراجعة وإرسال
                <ArrowLeft size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Tree Viewer Modal */}
        {branchHead && (
          <BranchTreeViewer
            branchHead={branchHead}
            allMembers={allMembers}
            pendingMembers={sessionMembers}
            isOpen={showTreeViewer}
            onClose={() => setShowTreeViewer(false)}
          />
        )}
      </div>
    );
  }

  // Step 3: Review and Confirm
  if (currentStep === 'review') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 py-6 px-4 pb-32">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentStep('add')}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <ArrowRight size={20} />
              رجوع
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-800">مراجعة الإضافات</h1>
              <p className="text-sm text-gray-500">تأكد من صحة البيانات</p>
            </div>
            <button
              onClick={() => setShowTreeViewer(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded-lg transition-colors"
              title="عرض الشجرة كاملة"
            >
              <Eye size={14} />
              الشجرة
            </button>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <div className="bg-gradient-to-l from-blue-500 to-blue-600 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <Users size={24} />
                <div>
                  <h2 className="font-bold text-lg">ملخص الإضافات</h2>
                  <p className="text-blue-100 text-sm">
                    {sessionMembers.length} عضو جديد • فرع {branchHead?.firstName}
                  </p>
                </div>
              </div>
            </div>

            {/* Tree Preview */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <TreePine size={16} className="text-green-600" />
                  شكل الشجرة بعد الإضافة:
                </p>
                <button
                  onClick={() => setShowTreeViewer(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded-lg transition-colors"
                >
                  <Maximize2 size={14} />
                  عرض كاملة
                </button>
              </div>
              <div className="bg-green-50 rounded-xl p-3 max-h-64 overflow-y-auto border border-green-200">
                {branchHead && (
                  <TreeNode
                    member={branchHead}
                    allMembers={allMembers}
                    pendingMembers={sessionMembers}
                    highlightedIds={highlightedIds}
                  />
                )}
              </div>
            </div>

            {/* Members List */}
            <div className="divide-y">
              {sessionMembers.map((member, idx) => (
                <div key={member.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{member.fullNameAr}</p>
                      <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                        <p>الجيل: {member.generation}</p>
                        <p>الأب: {member.fatherName}</p>
                        <p>الجنس: {member.gender?.toUpperCase() === 'MALE' ? 'ذكر' : 'أنثى'}</p>
                        {member.birthYear && <p>سنة الميلاد: {member.birthYear}</p>}
                        {member.phone && <p>الجوال: {member.phone}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          handleEditMember(member);
                          setCurrentStep('add');
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                        title="تعديل"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submitter Info */}
          <div className="bg-white rounded-xl shadow-lg p-5 mb-6">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <User size={18} />
              بيانات المرسل (اختياري)
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="اسمك"
              />
              <input
                type="tel"
                value={submitterPhone}
                onChange={(e) => setSubmitterPhone(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="رقم جوالك للتواصل"
                dir="ltr"
              />
            </div>
          </div>

          {/* Add More Button */}
          <button
            onClick={() => setCurrentStep('add')}
            className="w-full py-3 border-2 border-green-500 text-green-600 font-bold rounded-xl hover:bg-green-50 flex items-center justify-center gap-2 mb-4"
          >
            <Plus size={20} />
            إضافة المزيد
          </button>

          {/* Confirmation Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
              <div className="text-sm text-yellow-700">
                <p className="font-medium mb-1">ملاحظة مهمة:</p>
                <p>بعد الإرسال، ستتم مراجعة الإضافات من قبل المسؤول قبل إضافتها للشجرة الرسمية.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Submit Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleFinalSubmit}
              className="w-full py-4 bg-gradient-to-l from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 shadow-lg"
            >
              <Send size={24} />
              إرسال للمراجعة ({sessionMembers.length} عضو)
            </button>
          </div>
        </div>

        {/* Tree Viewer Modal */}
        {branchHead && (
          <BranchTreeViewer
            branchHead={branchHead}
            allMembers={allMembers}
            pendingMembers={sessionMembers}
            isOpen={showTreeViewer}
            onClose={() => setShowTreeViewer(false)}
          />
        )}
      </div>
    );
  }

  // Step 4: Submitted
  if (currentStep === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-100 py-6 px-4 flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="text-white" size={48} />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">تم الإرسال بنجاح!</h1>
          <p className="text-gray-500 mb-6">
            شكراً لمساهمتك في إثراء شجرة آل شايع
          </p>

          {/* Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 text-right">
            <h3 className="font-bold text-gray-800 mb-3">ملخص الإرسال:</h3>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">عدد الأعضاء:</span>
                <span className="font-bold text-green-600">{sessionMembers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الفرع:</span>
                <span className="font-medium">{branchHead?.firstName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الحالة:</span>
                <span className="text-orange-600 font-medium">بانتظار المراجعة</span>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-right border border-blue-200">
            <h4 className="font-bold text-blue-800 mb-2">ماذا بعد؟</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• سيقوم المسؤول بمراجعة الإضافات</li>
              <li>• بعد الموافقة، ستظهر في الشجرة الرسمية</li>
              <li>• يمكنك إضافة المزيد من الأفراد في أي وقت</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => {
                setSessionMembers([]);
                setCurrentStep('info');
              }}
              className="w-full py-4 bg-gradient-to-l from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              إضافة المزيد من الأفراد
            </button>
            <a
              href="/"
              className="block w-full py-3 border-2 border-gray-300 text-gray-600 font-medium rounded-xl hover:bg-gray-50"
            >
              العودة للرئيسية
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
