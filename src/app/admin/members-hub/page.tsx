'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  UserCheck,
  UserPlus,
  GitBranch,
  ChevronRight,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Link as LinkIcon,
  Merge,
  Database,
  UserX,
} from 'lucide-react';

interface MembersStats {
  totalMembers: number;
  pendingApprovals: number;
  unregisteredMembers: number;
  branchLinks: number;
  recentAdditions: number;
  duplicatesCount: number;
}

interface PendingMember {
  id: string;
  nameAr: string;
  nameEn: string;
  createdAt: string;
  reviewStatus: string;
}

export default function MembersHubPage() {
  const { session } = useAuth();
  const [stats, setStats] = useState<MembersStats>({
    totalMembers: 0,
    pendingApprovals: 0,
    unregisteredMembers: 0,
    branchLinks: 0,
    recentAdditions: 0,
    duplicatesCount: 0,
  });
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.token) {
      loadData();
    }
  }, [session?.token]);

  const loadData = async () => {
    setIsLoading(true);
    const headers: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}` } : {};
    
    try {
      const [statsRes, pendingRes, branchLinksRes, duplicatesRes, unregisteredRes] = await Promise.all([
        fetch('/api/statistics', { headers }),
        fetch('/api/admin/pending', { headers }),
        fetch('/api/admin/branch-links', { headers }),
        fetch('/api/admin/duplicates', { headers }),
        fetch('/api/admin/unregistered', { headers }).catch(() => ({ json: () => ({ count: 0 }) })),
      ]);

      const statsData = await statsRes.json().catch(() => ({}));
      const pendingData = await pendingRes.json().catch(() => ({ pending: [] }));
      const branchLinksData = await branchLinksRes.json().catch(() => ({ links: [] }));
      const duplicatesData = await duplicatesRes.json().catch(() => ({ duplicates: [] }));
      const unregisteredData = await unregisteredRes.json().catch(() => ({ count: 0 }));

      const pendingApprovals = pendingData.pending?.filter((p: { reviewStatus: string }) => p.reviewStatus === 'PENDING').length || 0;
      const activeLinks = branchLinksData.links?.filter((l: { isActive: boolean }) => l.isActive).length || 0;
      const duplicatesCount = duplicatesData.duplicates?.filter((d: { status: string }) => d.status === 'PENDING').length || 0;

      setStats({
        totalMembers: statsData.totalMembers || 0,
        pendingApprovals,
        unregisteredMembers: unregisteredData.count || 0,
        branchLinks: activeLinks,
        recentAdditions: pendingData.pending?.length || 0,
        duplicatesCount,
      });

      setPendingMembers(pendingData.pending?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error loading members hub data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLinks = [
    { href: '/admin/pending', label: 'الطلبات المعلقة', labelEn: 'Pending Approvals', icon: Clock, color: 'bg-orange-500', count: stats.pendingApprovals },
    { href: '/admin/database/members', label: 'جدول الأعضاء', labelEn: 'Members Table', icon: Database, color: 'bg-blue-500' },
    { href: '/admin/unregistered', label: 'غير المسجلين', labelEn: 'Unregistered', icon: UserX, color: 'bg-gray-500', count: stats.unregisteredMembers },
    { href: '/admin/database/branches', label: 'إدارة الفروع', labelEn: 'Branches', icon: GitBranch, color: 'bg-green-500' },
    { href: '/admin/merge', label: 'دمج التكرارات', labelEn: 'Merge Duplicates', icon: Merge, color: 'bg-yellow-500', count: stats.duplicatesCount },
    { href: '/admin/data-cleanup', label: 'تنظيف البيانات', labelEn: 'Data Cleanup', icon: Trash2, color: 'bg-red-500' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة التحكم</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">إدارة الأعضاء</h1>
              <p className="text-blue-200 mt-1">Members Hub - إدارة بيانات أعضاء العائلة</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">إجمالي الأعضاء</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalMembers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">بانتظار الموافقة</p>
                <p className="text-3xl font-bold text-gray-800">{stats.pendingApprovals}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">غير مسجلين</p>
                <p className="text-3xl font-bold text-gray-800">{stats.unregisteredMembers}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <UserX className="w-6 h-6 text-gray-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">روابط الفروع</p>
                <p className="text-3xl font-bold text-gray-800">{stats.branchLinks}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">روابط سريعة</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group"
                    >
                      <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center text-white relative`}>
                        <Icon className="w-6 h-6" />
                        {link.count !== undefined && link.count > 0 && (
                          <span className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                            {link.count}
                          </span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-800 group-hover:text-blue-600">{link.label}</p>
                        <p className="text-xs text-gray-500">{link.labelEn}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">طلبات حديثة</h2>
              <Link href="/admin/pending" className="text-sm text-blue-600 hover:underline">
                عرض الكل
              </Link>
            </div>
            <div className="space-y-3">
              {pendingMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>لا توجد طلبات معلقة</p>
                </div>
              ) : (
                pendingMembers.map((member) => (
                  <Link
                    key={member.id}
                    href={`/admin/pending`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{member.nameAr}</p>
                      <p className="text-xs text-gray-500">{member.nameEn}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
