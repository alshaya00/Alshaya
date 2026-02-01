'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import MemberEditModal from '@/components/MemberEditModal';
import GenderAvatar from '@/components/GenderAvatar';
import { formatMemberId } from '@/lib/utils';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Edit,
  Eye,
  Merge,
  Link as LinkIcon,
  UserX,
  AlertCircle,
  XCircle,
  Loader2,
  BarChart3,
  History,
  Download,
  Plus,
  GitBranch,
  Database,
  Trash2,
  Settings,
} from 'lucide-react';

interface DataIssue {
  id: string;
  type: 'DUPLICATE' | 'ORPHANED' | 'MISSING_DATA' | 'INCONSISTENT' | 'PENDING_REVIEW';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  memberId: string;
  memberName: string;
  description: string;
  descriptionEn: string;
  details: Record<string, unknown>;
  suggestedAction?: string;
  relatedMemberId?: string;
  relatedMemberName?: string;
}

interface DataIssueSummary {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}

interface MemberData {
  id: string;
  firstName: string;
  fatherName?: string;
  grandfatherName?: string;
  greatGrandfatherName?: string;
  fullNameAr?: string;
  fatherId?: string;
  gender: string;
  generation: number;
  branch?: string;
  birthYear?: number;
  birthCalendar?: string;
  deathYear?: number;
  deathCalendar?: string;
  status: string;
  phone?: string;
  email?: string;
  city?: string;
  occupation?: string;
  biography?: string;
}

interface Stats {
  totalMembers: number;
  pendingApprovals: number;
  unregisteredMembers: number;
  registeredUsers: number;
  recentChanges: number;
}

type SortField = 'firstName' | 'generation' | 'branch' | 'status' | 'id';
type SortDirection = 'asc' | 'desc';

export default function MembersHubPage() {
  const { session } = useAuth();
  const [activeView, setActiveView] = useState<'overview' | 'members' | 'issues'>('overview');
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    pendingApprovals: 0,
    unregisteredMembers: 0,
    registeredUsers: 0,
    recentChanges: 0,
  });
  const [issues, setIssues] = useState<DataIssue[]>([]);
  const [issuesSummary, setIssuesSummary] = useState<DataIssueSummary | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberData | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('firstName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    gender: '',
    generation: '',
    status: '',
    branch: '',
    hasIssues: '',
  });
  const [issueFilter, setIssueFilter] = useState<string>('');

  const headers: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}` } : {};

  useEffect(() => {
    if (session?.token) {
      loadData();
    }
  }, [session?.token]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, membersRes, pendingRes, issuesRes] = await Promise.all([
        fetch('/api/statistics', { headers }),
        fetch('/api/members?limit=500', { headers }),
        fetch('/api/admin/pending', { headers }),
        fetch('/api/admin/data-issues?limit=200', { headers }),
      ]);

      const statsData = await statsRes.json().catch(() => ({}));
      const membersData = await membersRes.json().catch(() => ({ data: [] }));
      const pendingData = await pendingRes.json().catch(() => ({ pending: [] }));
      const issuesData = await issuesRes.json().catch(() => ({ issues: [], summary: null }));

      const pendingCount = pendingData.pending?.filter(
        (p: { reviewStatus: string }) => p.reviewStatus === 'PENDING'
      ).length || 0;

      setStats({
        totalMembers: statsData.totalMembers || 0,
        pendingApprovals: pendingCount,
        unregisteredMembers: statsData.unregisteredMembers || 0,
        registeredUsers: statsData.registeredUsers || 0,
        recentChanges: 0,
      });

      setMembers(membersData.data || []);
      setIssues(issuesData.issues || []);
      setIssuesSummary(issuesData.summary || null);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshIssues = async () => {
    setIsLoadingIssues(true);
    try {
      const res = await fetch('/api/admin/data-issues', { headers });
      const data = await res.json();
      setIssues(data.issues || []);
      setIssuesSummary(data.summary || null);
    } catch (error) {
      console.error('Error refreshing issues:', error);
    } finally {
      setIsLoadingIssues(false);
    }
  };

  const memberIssuesMap = useMemo(() => {
    const map = new Map<string, DataIssue[]>();
    for (const issue of issues) {
      if (!map.has(issue.memberId)) {
        map.set(issue.memberId, []);
      }
      map.get(issue.memberId)!.push(issue);
    }
    return map;
  }, [issues]);

  const filteredMembers = useMemo(() => {
    let result = [...members];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const normalizedQuery = formatMemberId(query).toLowerCase();
      result = result.filter(
        (m) => {
          const normalizedId = formatMemberId(m.id).toLowerCase();
          return normalizedId.includes(normalizedQuery) ||
            m.id.toLowerCase().includes(query) ||
            m.firstName.toLowerCase().includes(query) ||
            (m.fullNameAr && m.fullNameAr.toLowerCase().includes(query)) ||
            (m.phone && m.phone.includes(query));
        }
      );
    }

    if (filters.gender) result = result.filter((m) => m.gender === filters.gender);
    if (filters.generation) result = result.filter((m) => m.generation === parseInt(filters.generation));
    if (filters.status) result = result.filter((m) => m.status === filters.status);
    if (filters.branch) result = result.filter((m) => m.branch === filters.branch);
    if (filters.hasIssues === 'yes') result = result.filter((m) => memberIssuesMap.has(m.id));
    if (filters.hasIssues === 'no') result = result.filter((m) => !memberIssuesMap.has(m.id));

    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal, 'ar') : bVal.localeCompare(aVal, 'ar');
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [members, searchQuery, filters, sortField, sortDirection, memberIssuesMap]);

  const filteredIssues = useMemo(() => {
    if (!issueFilter) return issues;
    return issues.filter((i) => i.type === issueFilter);
  }, [issues, issueFilter]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(start, start + itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  const generations = [...new Set(members.map((m) => m.generation))].sort();
  const branches = [...new Set(members.map((m) => m.branch).filter(Boolean))];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSaveMember = async (updatedMember: MemberData) => {
    const res = await fetch(`/api/members/${updatedMember.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(updatedMember),
    });
    if (!res.ok) throw new Error('Failed to save');
    await loadData();
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'DUPLICATE': return <Merge className="w-5 h-5 text-red-500" />;
      case 'ORPHANED': return <UserX className="w-5 h-5 text-orange-500" />;
      case 'MISSING_DATA': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'INCONSISTENT': return <XCircle className="w-5 h-5 text-purple-500" />;
      case 'PENDING_REVIEW': return <Clock className="w-5 h-5 text-blue-500" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getIssueBadgeColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 text-red-700 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'LOW': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getIssueActionButton = (issue: DataIssue) => {
    switch (issue.suggestedAction) {
      case 'MERGE':
        return (
          <Link
            href={`/admin/merge?source=${issue.memberId}&target=${issue.relatedMemberId}`}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
          >
            دمج
          </Link>
        );
      case 'SET_PARENT':
        return (
          <Link
            href={`/admin/data-repair?member=${issue.memberId}`}
            className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200"
          >
            تعيين الأب
          </Link>
        );
      case 'EDIT':
        return (
          <button
            onClick={() => {
              const member = members.find((m) => m.id === issue.memberId);
              if (member) setEditingMember(member);
            }}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
          >
            تعديل
          </button>
        );
      case 'FIX_GENERATION':
        return (
          <button
            onClick={() => {
              const member = members.find((m) => m.id === issue.memberId);
              if (member) {
                const expectedGen = (issue.details as { expectedGeneration?: number })?.expectedGeneration;
                if (expectedGen && window.confirm(`هل تريد تصحيح الجيل إلى ${expectedGen}؟`)) {
                  handleSaveMember({ ...member, generation: expectedGen });
                }
              }
            }}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200"
          >
            تصحيح الجيل
          </button>
        );
      case 'REVIEW':
        return (
          <Link
            href="/admin/pending"
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200"
          >
            مراجعة
          </Link>
        );
      default:
        return null;
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/admin" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة التحكم</span>
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Database className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">مركز إدارة الأعضاء</h1>
                <p className="text-blue-200 mt-1">Members CRM - نظام إدارة بيانات متكامل</p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              تحديث
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-2 shadow-sm">
          <button
            onClick={() => setActiveView('overview')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeView === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-5 h-5 inline ml-2" />
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveView('members')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeView === 'members' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-5 h-5 inline ml-2" />
            جدول الأعضاء
          </button>
          <button
            onClick={() => setActiveView('issues')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors relative ${
              activeView === 'issues' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="w-5 h-5 inline ml-2" />
            المشاكل المكتشفة
            {issuesSummary && issuesSummary.total > 0 && (
              <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {issuesSummary.total > 99 ? '99+' : issuesSummary.total}
              </span>
            )}
          </button>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-5 border-r-4 border-blue-500">
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

              <div className="bg-white rounded-xl shadow-sm p-5 border-r-4 border-orange-500">
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

              <div className="bg-white rounded-xl shadow-sm p-5 border-r-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">مشاكل مكتشفة</p>
                    <p className="text-3xl font-bold text-gray-800">{issuesSummary?.total || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border-r-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">مستخدمين مسجلين</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.registeredUsers}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </div>
            </div>

            {issuesSummary && issuesSummary.total > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    تنبيهات ذكية
                  </h2>
                  <button
                    onClick={() => setActiveView('issues')}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    عرض الكل
                  </button>
                </div>
                <div className="grid md:grid-cols-5 gap-3">
                  {[
                    { type: 'DUPLICATE', label: 'مكررين', icon: Merge, color: 'red' },
                    { type: 'ORPHANED', label: 'بدون أب', icon: UserX, color: 'orange' },
                    { type: 'MISSING_DATA', label: 'بيانات ناقصة', icon: AlertCircle, color: 'yellow' },
                    { type: 'INCONSISTENT', label: 'تناقضات', icon: XCircle, color: 'purple' },
                    { type: 'PENDING_REVIEW', label: 'بانتظار المراجعة', icon: Clock, color: 'blue' },
                  ].map(({ type, label, icon: Icon, color }) => {
                    const count = issuesSummary.byType[type] || 0;
                    if (count === 0) return null;
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setIssueFilter(type);
                          setActiveView('issues');
                        }}
                        className={`p-4 rounded-xl border-2 border-${color}-200 bg-${color}-50 hover:border-${color}-400 transition-colors text-right`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`w-6 h-6 text-${color}-500`} />
                          <span className={`text-2xl font-bold text-${color}-700`}>{count}</span>
                        </div>
                        <p className="text-sm text-gray-700">{label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">روابط سريعة</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { href: '/admin/pending', label: 'الطلبات المعلقة', icon: Clock, color: 'orange', count: stats.pendingApprovals },
                  { href: '/admin/merge', label: 'دمج المكررات', icon: Merge, color: 'yellow' },
                  { href: '/admin/unregistered', label: 'غير المسجلين', icon: UserX, color: 'gray' },
                  { href: '/admin/data-repair', label: 'إصلاح البيانات', icon: Settings, color: 'purple' },
                  { href: '/admin/database/branches', label: 'إدارة الفروع', icon: GitBranch, color: 'green' },
                  { href: '/admin/data-cleanup', label: 'تنظيف البيانات', icon: Trash2, color: 'red' },
                  { href: '/admin/audit', label: 'سجل التغييرات', icon: History, color: 'blue' },
                  { href: '/quick-add', label: 'إضافة عضو', icon: Plus, color: 'green' },
                ].map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all"
                    >
                      <div className={`w-10 h-10 bg-${link.color}-100 rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 text-${link.color}-600`} />
                      </div>
                      <span className="font-medium text-gray-800">{link.label}</span>
                      {link.count !== undefined && link.count > 0 && (
                        <span className="mr-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {link.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeView === 'members' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="البحث بالاسم، المعرف، أو الهاتف..."
                    className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${showFilters ? 'bg-blue-50 border-blue-200' : ''}`}
                >
                  <Filter className="w-5 h-5" />
                  الفلاتر
                  {Object.values(filters).filter(Boolean).length > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {Object.values(filters).filter(Boolean).length}
                    </span>
                  )}
                </button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                    <select value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="">الكل</option>
                      <option value="Male">ذكر</option>
                      <option value="Female">أنثى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الجيل</label>
                    <select value={filters.generation} onChange={(e) => setFilters({ ...filters, generation: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="">الكل</option>
                      {generations.map((g) => (<option key={g} value={g}>الجيل {g}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="">الكل</option>
                      <option value="Living">حي</option>
                      <option value="Deceased">متوفى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
                    <select value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="">الكل</option>
                      {branches.map((b) => (<option key={b} value={b!}>{b}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">حالة البيانات</label>
                    <select value={filters.hasIssues} onChange={(e) => setFilters({ ...filters, hasIssues: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="">الكل</option>
                      <option value="yes">بها مشاكل</option>
                      <option value="no">بدون مشاكل</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('firstName')}>
                        <div className="flex items-center gap-1">العضو <SortIcon field="firstName" /></div>
                      </th>
                      <th className="p-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('generation')}>
                        <div className="flex items-center gap-1">الجيل <SortIcon field="generation" /></div>
                      </th>
                      <th className="p-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('branch')}>
                        <div className="flex items-center gap-1">الفرع <SortIcon field="branch" /></div>
                      </th>
                      <th className="p-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-1">الحالة <SortIcon field="status" /></div>
                      </th>
                      <th className="p-3 text-right">حالة البيانات</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedMembers.map((member) => {
                      const memberIssues = memberIssuesMap.get(member.id) || [];
                      const hasHighSeverity = memberIssues.some((i) => i.severity === 'HIGH');
                      const hasMediumSeverity = memberIssues.some((i) => i.severity === 'MEDIUM');
                      
                      return (
                        <tr key={member.id} className={`hover:bg-gray-50 ${hasHighSeverity ? 'bg-red-50/50' : hasMediumSeverity ? 'bg-yellow-50/50' : ''}`}>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <GenderAvatar gender={member.gender} size="sm" />
                              <div>
                                <p className="font-medium text-gray-800">{member.firstName}</p>
                                <p className="text-xs text-gray-500">{member.fullNameAr}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-gray-100 rounded text-sm">الجيل {member.generation}</span>
                          </td>
                          <td className="p-3 text-sm text-gray-600">{member.branch || '-'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${member.status === 'Living' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                              {member.status === 'Living' ? 'حي' : 'متوفى'}
                            </span>
                          </td>
                          <td className="p-3">
                            {memberIssues.length === 0 ? (
                              <span className="flex items-center gap-1 text-green-600 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                سليم
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {memberIssues.slice(0, 2).map((issue) => (
                                  <span key={issue.id} className={`px-2 py-0.5 rounded text-xs border ${getIssueBadgeColor(issue.severity)}`}>
                                    {issue.type === 'DUPLICATE' && 'مكرر'}
                                    {issue.type === 'ORPHANED' && 'بدون أب'}
                                    {issue.type === 'MISSING_DATA' && 'ناقص'}
                                    {issue.type === 'INCONSISTENT' && 'تناقض'}
                                  </span>
                                ))}
                                {memberIssues.length > 2 && (
                                  <span className="px-2 py-0.5 rounded text-xs bg-gray-100">+{memberIssues.length - 2}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/member/${member.id}`} className="p-2 hover:bg-gray-100 rounded-lg" title="عرض">
                                <Eye className="w-4 h-4 text-gray-500" />
                              </Link>
                              <button onClick={() => setEditingMember(member)} className="p-2 hover:bg-gray-100 rounded-lg" title="تعديل">
                                <Edit className="w-4 h-4 text-blue-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    عرض {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredMembers.length)} من {filteredMembers.length}
                  </span>
                  <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
                    <option value={20}>20 لكل صفحة</option>
                    <option value={50}>50 لكل صفحة</option>
                    <option value={100}>100 لكل صفحة</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 bg-white border rounded-lg">{currentPage} / {totalPages || 1}</span>
                  <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'issues' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-gray-800">المشاكل المكتشفة تلقائياً</h2>
                  <select
                    value={issueFilter}
                    onChange={(e) => setIssueFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2"
                  >
                    <option value="">الكل ({issues.length})</option>
                    <option value="DUPLICATE">مكررين ({issuesSummary?.byType.DUPLICATE || 0})</option>
                    <option value="ORPHANED">بدون أب ({issuesSummary?.byType.ORPHANED || 0})</option>
                    <option value="MISSING_DATA">بيانات ناقصة ({issuesSummary?.byType.MISSING_DATA || 0})</option>
                    <option value="INCONSISTENT">تناقضات ({issuesSummary?.byType.INCONSISTENT || 0})</option>
                    <option value="PENDING_REVIEW">بانتظار المراجعة ({issuesSummary?.byType.PENDING_REVIEW || 0})</option>
                  </select>
                </div>
                <button
                  onClick={refreshIssues}
                  disabled={isLoadingIssues}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoadingIssues ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  فحص الآن
                </button>
              </div>
            </div>

            {filteredIssues.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد مشاكل!</h3>
                <p className="text-gray-600">جميع البيانات سليمة ومتسقة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIssues.map((issue) => (
                  <div key={issue.id} className={`bg-white rounded-xl shadow-sm p-4 border-r-4 ${
                    issue.severity === 'HIGH' ? 'border-red-500' : issue.severity === 'MEDIUM' ? 'border-yellow-500' : 'border-gray-300'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">{getIssueIcon(issue.type)}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-800">{issue.memberName}</span>
                            <span className={`px-2 py-0.5 rounded text-xs border ${getIssueBadgeColor(issue.severity)}`}>
                              {issue.severity === 'HIGH' ? 'عالي' : issue.severity === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                            </span>
                          </div>
                          <p className="text-gray-600">{issue.description}</p>
                          {issue.relatedMemberName && (
                            <p className="text-sm text-gray-500 mt-1">مرتبط بـ: {issue.relatedMemberName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getIssueActionButton(issue)}
                        <button
                          onClick={() => {
                            const member = members.find((m) => m.id === issue.memberId);
                            if (member) setEditingMember(member);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {editingMember && (
        <MemberEditModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={handleSaveMember}
          authToken={session?.token}
        />
      )}
    </div>
  );
}
