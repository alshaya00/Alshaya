'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAllMembers, getMemberById, FamilyMember } from '@/lib/data';
import {
  getBranchLinks,
  createBranchLink,
  buildEntryUrl,
  getPendingCountByBranch,
  getTotalPendingCount,
  BranchEntryLink,
} from '@/lib/branchEntry';
import {
  GitBranch, Link2, Copy, Check, Users, ChevronDown,
  ChevronRight, ExternalLink, Bell, Share2, MessageCircle
} from 'lucide-react';
import Link from 'next/link';

interface BranchData {
  head: FamilyMember;
  totalMembers: number;
  generations: number[];
  children: FamilyMember[];
  link?: BranchEntryLink;
  pendingCount: number;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [totalPending, setTotalPending] = useState(0);

  const allMembers = getAllMembers();

  // Find main branches (children of root P001)
  useEffect(() => {
    const root = getMemberById('P001');
    if (!root) return;

    // Get all direct children of root (Generation 2) - these are branch heads
    const branchHeads = allMembers.filter(m => m.fatherId === 'P001' && m.gender === 'Male');

    // Also get Generation 3+ branch heads for more granular control
    const gen3Heads = allMembers.filter(m => m.generation >= 3 && m.gender === 'Male' && m.sonsCount > 0);

    // Combine and dedupe
    const allBranchHeads = [...branchHeads, ...gen3Heads];

    const links = getBranchLinks();

    const branchData: BranchData[] = allBranchHeads.map(head => {
      // Count all descendants
      const descendants = getDescendants(head.id, allMembers);
      const generations = [...new Set(descendants.map(d => d.generation))];
      const directChildren = allMembers.filter(m => m.fatherId === head.id);
      const link = links.find(l => l.branchHeadId === head.id && l.isActive);
      const pendingCount = getPendingCountByBranch(head.id);

      return {
        head,
        totalMembers: descendants.length + 1, // +1 for head
        generations,
        children: directChildren,
        link,
        pendingCount,
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
    setTotalPending(getTotalPendingCount());
  }, [allMembers]);

  // Get all descendants of a member
  function getDescendants(memberId: string, members: FamilyMember[]): FamilyMember[] {
    const children = members.filter(m => m.fatherId === memberId);
    let descendants = [...children];
    children.forEach(child => {
      descendants = [...descendants, ...getDescendants(child.id, members)];
    });
    return descendants;
  }

  const handleGenerateLink = (branch: BranchData) => {
    const link = createBranchLink(branch.head.id, branch.head.firstName);
    // Update state
    setBranches(prev => prev.map(b =>
      b.head.id === branch.head.id ? { ...b, link } : b
    ));
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
    const text = `السلام عليكم\n\nأرجو منك إضافة أفراد عائلتك في شجرة آل شايع:\n\n${url}\n\nشكراً لمساهمتك 🌳`;
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
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
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
        <div className="grid grid-cols-3 gap-4 mb-6">
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
          <Link
            href="/admin/pending"
            className="bg-white rounded-xl p-4 text-center shadow-sm border hover:border-orange-300 transition-colors"
          >
            <p className="text-3xl font-bold text-orange-600">{totalPending}</p>
            <p className="text-sm text-gray-500">بانتظار المراجعة</p>
          </Link>
        </div>

        {/* Pending Alert */}
        {totalPending > 0 && (
          <Link
            href="/admin/pending"
            className="block mb-6 bg-orange-50 border-2 border-orange-200 rounded-xl p-4 hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <Bell className="text-white" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-orange-800">
                  {totalPending} عضو جديد بانتظار المراجعة
                </p>
                <p className="text-sm text-orange-600">اضغط هنا للمراجعة والموافقة</p>
              </div>
              <ChevronRight className="text-orange-400" size={24} />
            </div>
          </Link>
        )}

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
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl border-2 border-blue-300">
                    👨
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-gray-800">
                        {branch.head.firstName}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white ${generationColors[branch.head.generation]}`}>
                        ج{branch.head.generation}
                      </span>
                      {branch.pendingCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500 text-white">
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
                    <div className="flex items-center gap-2">
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
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg flex items-center gap-1 transition-colors"
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
                      {branch.children.map(child => (
                        <span
                          key={child.id}
                          className={`px-3 py-1 rounded-full text-sm ${
                            child.gender === 'Male'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-pink-100 text-pink-700'
                          }`}
                        >
                          {child.firstName}
                        </span>
                      ))}
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
            <li>راجع الإضافات الجديدة من صفحة "بانتظار المراجعة"</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
