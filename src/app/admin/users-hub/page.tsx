'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  UserCheck,
  UserPlus,
  Shield,
  ChevronRight,
  ArrowRight,
  Clock,
  Ban,
  Mail,
  UserX,
  Settings,
  Key,
} from 'lucide-react';

interface UsersStats {
  totalUsers: number;
  pendingUsers: number;
  adminUsers: number;
  blockedUsers: number;
  invitationsSent: number;
  orphanedAccounts: number;
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function UsersHubPage() {
  const { session } = useAuth();
  const [stats, setStats] = useState<UsersStats>({
    totalUsers: 0,
    pendingUsers: 0,
    adminUsers: 0,
    blockedUsers: 0,
    invitationsSent: 0,
    orphanedAccounts: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
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
      const [usersRes, blocklistRes, invitationsRes, orphanedRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/admin/blocklist', { headers }).catch(() => ({ json: () => ({ blocked: [] }) })),
        fetch('/api/admin/invitations', { headers }).catch(() => ({ json: () => ({ invitations: [] }) })),
        fetch('/api/admin/orphaned', { headers }).catch(() => ({ json: () => ({ count: 0 }) })),
      ]);

      const usersData = await usersRes.json().catch(() => ({ users: [] }));
      const blocklistData = await blocklistRes.json().catch(() => ({ blocked: [] }));
      const invitationsData = await invitationsRes.json().catch(() => ({ invitations: [] }));
      const orphanedData = await orphanedRes.json().catch(() => ({ count: 0 }));

      const users = usersData.users || [];
      const adminUsers = users.filter((u: { role: string }) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
      const pendingUsers = users.filter((u: { isVerified: boolean }) => !u.isVerified).length;
      const blockedUsers = blocklistData.blocked?.length || 0;

      setStats({
        totalUsers: users.length,
        pendingUsers,
        adminUsers,
        blockedUsers,
        invitationsSent: invitationsData.invitations?.length || 0,
        orphanedAccounts: orphanedData.count || 0,
      });

      setRecentUsers(users.slice(0, 5).map((u: { id: string; name: string; email: string; role: string; createdAt: string }) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      })));
    } catch (error) {
      console.error('Error loading users hub data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLinks = [
    { href: '/admin/users', label: 'جميع المستخدمين', labelEn: 'All Users', icon: Users, color: 'bg-blue-500', count: stats.totalUsers },
    { href: '/admin/settings', label: 'المشرفين', labelEn: 'Admin Users', icon: Shield, color: 'bg-purple-500', count: stats.adminUsers },
    { href: '/admin/invitations', label: 'الدعوات', labelEn: 'Invitations', icon: Mail, color: 'bg-green-500', count: stats.invitationsSent },
    { href: '/admin/blocklist', label: 'المحظورين', labelEn: 'Blocked', icon: Ban, color: 'bg-red-500', count: stats.blockedUsers },
    { href: '/admin/orphaned', label: 'حسابات يتيمة', labelEn: 'Orphaned', icon: UserX, color: 'bg-gray-500', count: stats.orphanedAccounts },
  ];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'مدير عام';
      case 'ADMIN': return 'مشرف';
      case 'USER': return 'مستخدم';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700';
      case 'ADMIN': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
      <div className="bg-gradient-to-l from-purple-600 to-purple-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-purple-200 hover:text-white mb-4 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة التحكم</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">المستخدمين والصلاحيات</h1>
              <p className="text-purple-200 mt-1">Users Hub - إدارة حسابات المستخدمين والصلاحيات</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">إجمالي المستخدمين</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalUsers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">بانتظار التحقق</p>
                <p className="text-3xl font-bold text-gray-800">{stats.pendingUsers}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">المشرفين</p>
                <p className="text-3xl font-bold text-gray-800">{stats.adminUsers}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">المحظورين</p>
                <p className="text-3xl font-bold text-gray-800">{stats.blockedUsers}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Ban className="w-6 h-6 text-red-500" />
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
                      className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group"
                    >
                      <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center text-white relative`}>
                        <Icon className="w-6 h-6" />
                        {link.count !== undefined && link.count > 0 && (
                          <span className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                            {link.count > 99 ? '99+' : link.count}
                          </span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-800 group-hover:text-purple-600">{link.label}</p>
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
              <h2 className="text-lg font-bold text-gray-800">آخر المستخدمين</h2>
              <Link href="/admin/users" className="text-sm text-purple-600 hover:underline">
                عرض الكل
              </Link>
            </div>
            <div className="space-y-3">
              {recentUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>لا يوجد مستخدمين</p>
                </div>
              ) : (
                recentUsers.map((user) => (
                  <Link
                    key={user.id}
                    href={`/admin/users`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
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
