'use client';

import { useState, useEffect, useMemo } from 'react';
import type { FamilyMember } from '@/lib/types';
import {
  getBranchLinks,
  createBranchLink,
  buildEntryUrl,
  BranchEntryLink,
} from '@/lib/branchEntry';
import {
  GitBranch, Link2, Copy, Check, Users, ChevronDown,
  ChevronRight, ExternalLink, Bell, Share2, MessageCircle,
  TreePine, Eye, QrCode, UserPlus, Zap, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import GenderAvatar from '@/components/GenderAvatar';
import { isMale } from '@/lib/utils';

interface BranchData {
  head: FamilyMember;
  totalMembers: number;
  generations: number[];
  children: FamilyMember[];
  link?: BranchEntryLink;
  pendingCount: number;
  fullName: string;
}

function getFullLineageName(member: FamilyMember, allMembers: FamilyMember[], maxDepth: number = 4): string {
  const names: string[] = [member.firstName];
  let current = member;
  let depth = 0;

  while (current.fatherId && depth < maxDepth) {
    const father = allMembers.find(m => m.id === current.fatherId);
    if (father) {
      names.push(father.firstName);
      current = father;
      depth++;
    } else {
      break;
    }
  }

  if (names.length > 1) {
    return names.join(' بن ') + ' آل شايع';
  }
  return member.firstName + ' آل شايع';
}

interface PendingMemberApi {
  id: string;
  proposedFatherId: string | null;
  branch: string | null;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

function BranchesPageContent() {
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [totalPending, setTotalPending] = useState(0);
  const [showLinkModal, setShowLinkModal] = useState<BranchData | null>(null);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMemberApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session, user } = useAuth();
  
  // Check if user is admin (can view pending section)
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/members?limit=500', {
          headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setAllMembers(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setIsLoading(false);
      }
    }
    if (session?.token) {
      fetchMembers();
    }
  }, [session?.token]);

  useEffect(() => {
    async function fetchPendingMembers() {
      if (!session?.token) return;
      try {
        const res = await fetch('/api/admin/pending', {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPendingMembers(data.pending || []);
        }
      } catch (error) {
        console.error('Error fetching pending members:', error);
      }
    }
    fetchPendingMembers();
  }, [session?.token]);

  const getMemberById = (id: string): FamilyMember | undefined => {
    return allMembers.find(m => m.id === id);
  };

  // Find main branches (children of root P001)
  useEffect(() => {
    async function loadBranches() {
      const root = getMemberById('P001');
      if (!root) return;

      // Get all direct children of root (Generation 2) - these are branch heads
      const branchHeads = allMembers.filter(m => m.fatherId === 'P001' && isMale(m.gender));

      // Also get Generation 3+ branch heads for more granular control
      const gen3Heads = allMembers.filter(m => m.generation >= 3 && isMale(m.gender) && m.sonsCount > 0);

      // Combine and dedupe
      const allBranchHeads = [...branchHeads, ...gen3Heads];

      const links = await getBranchLinks();

      // Filter pending members with PENDING status
      const activePending = pendingMembers.filter(p => p.reviewStatus === 'PENDING');

      const branchData: BranchData[] = allBranchHeads.map(head => {
        // Count all descendants
        const descendants = getDescendants(head.id, allMembers);
        const descendantIds = new Set([head.id, ...descendants.map(d => d.id)]);
        const generations = [...new Set(descendants.map(d => d.generation))];
        const directChildren = allMembers.filter(m => m.fatherId === head.id);
        const link = links.find(l => l.branchHeadId === head.id && l.isActive);
        const pendingCount = activePending.filter(p => 
          p.proposedFatherId && descendantIds.has(p.proposedFatherId)
        ).length;
        const fullName = getFullLineageName(head, allMembers, 4);

        return {
          head,
          totalMembers: descendants.length + 1, // +1 for head
          generations,
          children: directChildren,
          link,
          pendingCount,
          fullName,
        };
      });

      // Sort by generation, then by member count
      branchData.sort((a, b) => {
        if (a.head.generation !== b.head.generation) {
          return a.head.generation - b.head.generation;
        }
        return b.totalMembers - a.totalMembers;
      });

      setBranches(branchData);
      setTotalPending(activePending.length);
    }
    loadBranches();
  }, [allMembers, pendingMembers]);

  // Get all descendants of a member
  function getDescendants(memberId: string, members: FamilyMember[]): FamilyMember[] {
    const children = members.filter(m => m.fatherId === memberId);
    let descendants = [...children];
    children.forEach(child => {
      descendants = [...descendants, ...getDescendants(child.id, members)];
    });
    return descendants;
  }

  const handleGenerateLink = async (branch: BranchData) => {
    const link = await createBranchLink(branch.head.id, branch.head.firstName);
    if (!link) return;
    // Update state
    setBranches(prev => prev.map(b =>
      b.head.id === branch.head.id ? { ...b, link } : b
    ));
    // Show link modal
    setShowLinkModal({ ...branch, link });
  };

  const handleCopyLink = async (token: string) => {
    const url = buildEntryUrl(token);
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleShareWhatsApp = (branch: BranchData) => {
    if (!branch.link) return;
    const url = buildEntryUrl(branch.link.token);
    const fullName = branch.fullName;
    const text = `السلام عليكم ورحمة الله وبركاته

أخي الكريم / أختي الكريمة

نرجو منكم المساهمة في تحديث شجرة العائلة بإضافة أفراد فرعكم:

📌 الفرع: ${fullName}
📌 الجيل: ${branch.head.generation}

🔗 رابط الإضافة:
${url}

✅ يمكنك إضافة الأبناء والأحفاد
✅ البيانات ستُراجع قبل الإضافة النهائية
✅ الرابط آمن وخاص بفرعكم فقط

شكراً لمساهمتكم في إثراء شجرة آل شايع 🌳`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const generationColors: Record<number, string> = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-amber-500',
    4: 'bg-green-500',
    5: 'bg-teal-500',
    6: 'bg-blue-500',
    7: 'bg-indigo-500',
    8: 'bg-purple-500',
    9: 'bg-pink-500',
    10: 'bg-cyan-500',
    11: 'bg-lime-500',
    12: 'bg-rose-500',
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 pb-24 lg:pb-6">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <GitBranch className="text-green-600" size={32} />
            إدارة الفروع
          </h1>
          <p className="text-gray-500 mt-2">
            أنشئ روابط لأفراد العائلة لإضافة أعضاء فروعهم
          </p>
        </div>

        {/* Stats Bar */}
        <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-4 mb-6`}>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border">
            <p className="text-3xl font-bold text-green-600">{branches.length}</p>
            <p className="text-sm text-gray-500">فرع</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border">
            <p className="text-3xl font-bold text-blue-600">
              {branches.filter(b => b.link).length}
            </p>
            <p className="text-sm text-gray-500">رابط نشط</p>
          </div>
          {isAdmin && (
            <Link
              href="/admin/pending"
              className="bg-white rounded-xl p-4 text-center shadow-sm border hover:border-orange-300 transition-colors"
            >
              <p className="text-3xl font-bold text-orange-600">{totalPending}</p>
              <p className="text-sm text-gray-500">بانتظار المراجعة</p>
            </Link>
          )}
        </div>

        {/* Quick Add Link Generator */}
        <Link
          href="/quick-add/link"
          className="block mb-6 bg-gradient-to-l from-emerald-500 to-emerald-600 rounded-xl p-5 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap size={28} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserPlus size={20} />
                مولد رابط الإضافة السريعة
              </h3>
              <p className="text-emerald-100 text-sm mt-1">
                أنشئ رابطاً سريعاً لإضافة أعضاء جدد مع مطابقة ذكية للأسماء العربية
              </p>
            </div>
            <ChevronRight size={24} className="text-white/70" />
          </div>
        </Link>

        {/* Note: Pending approval notifications are shown in admin dashboard only */}

        {/* Branches List */}
        <div className="space-y-3">
          {branches.map(branch => (
            <div
              key={branch.head.id}
              className="bg-white rounded-xl shadow-sm border overflow-hidden"
            >
              {/* Branch Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedBranch(
                  expandedBranch === branch.head.id ? null : branch.head.id
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Expand Icon */}
                  <div className="text-gray-400">
                    {expandedBranch === branch.head.id ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </div>

                  {/* Avatar */}
                  <GenderAvatar gender="Male" size="lg" className="flex-shrink-0" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg text-gray-800 truncate">
                        {branch.fullName}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white ${generationColors[branch.head.generation]} flex-shrink-0`}>
                        ج{branch.head.generation}
                      </span>
                      {isAdmin && branch.pendingCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500 text-white flex-shrink-0">
                          {branch.pendingCount} جديد
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {branch.head.id} • {branch.totalMembers} عضو • {branch.children.length} أبناء مباشرين
                    </p>
                  </div>

                  {/* Link Status */}
                  {branch.link ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        رابط نشط
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateLink(branch);
                      }}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg flex items-center gap-1 transition-colors flex-shrink-0"
                    >
                      <Link2 size={14} />
                      إنشاء رابط
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedBranch === branch.head.id && (
                <div className="border-t bg-gray-50 p-4">
                  {/* Link Section */}
                  {branch.link ? (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">رابط الإدخال:</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={buildEntryUrl(branch.link.token)}
                          className="flex-1 px-3 py-2 bg-white border rounded-lg text-sm text-gray-600"
                          dir="ltr"
                        />
                        <button
                          onClick={() => handleCopyLink(branch.link!.token)}
                          className={`p-2 rounded-lg transition-colors ${
                            copiedToken === branch.link.token
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                          }`}
                        >
                          {copiedToken === branch.link.token ? (
                            <Check size={18} />
                          ) : (
                            <Copy size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(branch)}
                          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                          title="مشاركة عبر واتساب"
                        >
                          <MessageCircle size={18} />
                        </button>
                        <Link
                          href={`/add-branch/${branch.link.token}`}
                          target="_blank"
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                          title="فتح الرابط"
                        >
                          <ExternalLink size={18} />
                        </Link>
                      </div>

                      {/* Link Details Card */}
                      <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                          <Share2 size={16} />
                          تفاصيل الرابط
                        </h4>
                        <div className="text-sm text-blue-700 space-y-1">
                          <p><strong>الفرع:</strong> {branch.fullName}</p>
                          <p><strong>الجيل:</strong> {branch.head.generation}</p>
                          <p><strong>تاريخ الإنشاء:</strong> {new Date(branch.link.createdAt).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <p className="text-xs text-blue-500 mt-2">
                          عند مشاركة هذا الرابط، سيتمكن المستلم من إضافة أفراد تحت هذا الفرع فقط
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                      <p className="text-yellow-700 mb-2">لم يتم إنشاء رابط لهذا الفرع بعد</p>
                      <button
                        onClick={() => handleGenerateLink(branch)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 mx-auto transition-colors"
                      >
                        <Link2 size={16} />
                        إنشاء رابط الآن
                      </button>
                    </div>
                  )}

                  {/* Direct Children */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      الأبناء المباشرين ({branch.children.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {branch.children.map(child => {
                        const childFullName = getFullLineageName(child, allMembers, 1);
                        return (
                          <span
                            key={child.id}
                            className={`px-3 py-1.5 rounded-lg text-sm ${
                              isMale(child.gender)
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-pink-100 text-pink-700'
                            }`}
                            title={childFullName}
                          >
                            {child.firstName}
                            <span className="text-xs opacity-70 mr-1">ج{child.generation}</span>
                          </span>
                        );
                      })}
                      {branch.children.length === 0 && (
                        <span className="text-gray-400 text-sm">لا يوجد أبناء مسجلين</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
            <Share2 size={20} />
            كيفية استخدام الروابط
          </h3>
          <ol className="space-y-2 text-sm text-blue-700 list-decimal list-inside">
            <li>اختر الفرع المراد إضافة أعضاء له</li>
            <li>أنشئ رابط الإدخال للفرع</li>
            <li>شارك الرابط مع مسؤول الفرع (عبر واتساب أو نسخ الرابط)</li>
            <li>سيتمكن من إضافة أفراد عائلته تحت هذا الفرع فقط</li>
            <li>راجع الإضافات الجديدة من صفحة &ldquo;بانتظار المراجعة&rdquo;</li>
          </ol>
        </div>

        {/* What Family Members See */}
        <div className="mt-4 bg-green-50 rounded-xl p-6 border border-green-200">
          <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
            <Eye size={20} />
            ماذا يرى فرد العائلة عند فتح الرابط؟
          </h3>
          <ul className="space-y-2 text-sm text-green-700">
            <li className="flex items-start gap-2">
              <TreePine size={16} className="mt-0.5 flex-shrink-0" />
              <span>صفحة ترحيبية توضح الفرع والجيل المراد تحديثه</span>
            </li>
            <li className="flex items-start gap-2">
              <TreePine size={16} className="mt-0.5 flex-shrink-0" />
              <span>شجرة مرئية تُظهر الفرع الحالي وتتحدث تلقائياً عند الإضافة</span>
            </li>
            <li className="flex items-start gap-2">
              <TreePine size={16} className="mt-0.5 flex-shrink-0" />
              <span>نموذج سهل لإضافة الأبناء والأحفاد</span>
            </li>
            <li className="flex items-start gap-2">
              <TreePine size={16} className="mt-0.5 flex-shrink-0" />
              <span>صفحة مراجعة وتأكيد قبل الإرسال</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Link Share Modal */}
      {showLinkModal && showLinkModal.link && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-l from-green-500 to-green-600 px-6 py-4 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Link2 size={24} />
                <div>
                  <h3 className="font-bold text-lg">تم إنشاء الرابط!</h3>
                  <p className="text-green-100 text-sm">شارك الرابط مع مسؤول الفرع</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Branch Info */}
              <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">الفرع:</p>
                <p className="font-bold text-blue-800">{showLinkModal.fullName}</p>
                <p className="text-xs text-blue-500 mt-1">
                  الجيل {showLinkModal.head.generation} • {showLinkModal.totalMembers} عضو
                </p>
              </div>

              {/* Link Input */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">الرابط:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={buildEntryUrl(showLinkModal.link.token)}
                    className="flex-1 px-3 py-2 bg-gray-100 border rounded-lg text-sm text-gray-600"
                    dir="ltr"
                  />
                  <button
                    onClick={() => handleCopyLink(showLinkModal.link!.token)}
                    className={`p-2 rounded-lg transition-colors ${
                      copiedToken === showLinkModal.link!.token
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                    }`}
                  >
                    {copiedToken === showLinkModal.link!.token ? (
                      <Check size={18} />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => handleShareWhatsApp(showLinkModal)}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle size={20} />
                  مشاركة عبر واتساب
                </button>
                <Link
                  href={`/add-branch/${showLinkModal.link.token}`}
                  target="_blank"
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink size={20} />
                  فتح الرابط للمعاينة
                </Link>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowLinkModal(null)}
                className="w-full py-3 border-2 border-gray-300 text-gray-600 font-medium rounded-xl hover:bg-gray-50"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BranchesPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <BranchesPageContent />
    </ProtectedRoute>
  );
}
