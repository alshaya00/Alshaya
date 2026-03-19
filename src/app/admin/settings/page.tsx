'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Users,
  UserPlus,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  Search,
  ArrowUpCircle,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  type AdminRole,
  ROLE_DEFAULT_PERMISSIONS,
} from '@/lib/permissions';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Input,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  EmptyState,
  Alert,
  AlertDescription,
} from '@/components/ui';

interface AdminUser {
  id: string;
  email: string;
  nameArabic: string;
  nameEnglish?: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  permissions?: string[];
  phone?: string;
  linkedMemberId?: string;
}

interface PromotableUser {
  id: string;
  email: string;
  nameArabic: string;
  nameEnglish?: string;
  phone?: string;
  role: string;
  status: string;
  linkedMemberId?: string;
}

export default function AdminSettingsPage() {
  const { user, isAuthenticated, isLoading: authLoading, getAuthHeader, hasPermission } = useAuth();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PromotableUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);
  const [selectedRoleForPromotion, setSelectedRoleForPromotion] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');

  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EDITOR' as AdminRole,
    permissions: ROLE_DEFAULT_PERMISSIONS['EDITOR'],
  });

  const headers = getAuthHeader();

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users?role=ADMIN&role=SUPER_ADMIN', { headers });
      if (!res.ok) throw new Error('Failed to load admins');
      const data = await res.json();
      const adminUsers = (data.users || []).filter((u: AdminUser) =>
        u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'
      );
      setAdmins(adminUsers);
    } catch (err) {
      console.error('Error loading admins:', err);
      setError('حدث خطأ أثناء تحميل المشرفين');
    } finally {
      setIsLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadAdmins();
    }
  }, [authLoading, isAuthenticated]);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}&status=ACTIVE`, { headers });
      if (!res.ok) throw new Error('Failed to search users');
      const data = await res.json();
      const promotableUsers = (data.users || []).filter((u: PromotableUser) =>
        u.role === 'MEMBER' || u.role === 'EDITOR' || u.role === 'BRANCH_LEADER'
      );
      setSearchResults(promotableUsers);
    } catch (err) {
      console.error('Error searching users:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [headers]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => { searchUsers(searchQuery); }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchUsers]);

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          email: newAdmin.email,
          password: newAdmin.password,
          nameArabic: newAdmin.name,
          role: newAdmin.role,
          status: 'ACTIVE',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.messageAr || 'فشل إضافة المشرف');
      }
      await loadAdmins();
      setNewAdmin({ name: '', email: '', password: '', role: 'EDITOR', permissions: ROLE_DEFAULT_PERMISSIONS['EDITOR'] });
      setIsAddingAdmin(false);
      alert('تم إضافة المشرف بنجاح');
    } catch (err) {
      console.error('Error adding admin:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة المشرف');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAdmin = async () => {
    if (!editingAdmin) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ userId: editingAdmin.id, role: editingAdmin.role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.messageAr || 'فشل تحديث المشرف');
      }
      await loadAdmins();
      setEditingAdmin(null);
      alert('تم تحديث المشرف بنجاح');
    } catch (err) {
      console.error('Error updating admin:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث المشرف');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromoteUser = async (userId: string, targetRole: 'ADMIN' | 'SUPER_ADMIN') => {
    const userToPromote = searchResults.find(u => u.id === userId);
    if (!userToPromote) return;
    const roleLabel = targetRole === 'SUPER_ADMIN' ? 'مدير عام' : 'مدير';
    const confirmed = confirm(`هل أنت متأكد من ترقية "${userToPromote.nameArabic}" إلى ${roleLabel}؟`);
    if (!confirmed) return;

    setPromotingUserId(userId);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ userId, role: targetRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.messageAr || 'فشل ترقية المستخدم');
      }
      await loadAdmins();
      setSearchResults(prev => prev.filter(u => u.id !== userId));
      alert(`تم ترقية "${userToPromote.nameArabic}" إلى ${roleLabel} بنجاح`);
    } catch (err) {
      console.error('Error promoting user:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء ترقية المستخدم');
    } finally {
      setPromotingUserId(null);
    }
  };

  const toggleAdminStatus = async (adminId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ userId: adminId, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.messageAr || 'فشل تغيير حالة المشرف');
      }
      await loadAdmins();
    } catch (err) {
      console.error('Error toggling admin status:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء تغيير حالة المشرف');
    }
  };

  const deleteAdmin = async (adminId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المشرف؟')) return;
    try {
      const res = await fetch(`/api/users?id=${adminId}`, { method: 'DELETE', headers });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.messageAr || 'فشل حذف المشرف');
      }
      await loadAdmins();
      alert('تم حذف المشرف بنجاح');
    } catch (err) {
      console.error('Error deleting admin:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء حذف المشرف');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'MEMBER': return 'عضو';
      case 'EDITOR': return 'محرر';
      case 'BRANCH_LEADER': return 'قائد فرع';
      case 'ADMIN': return 'مدير';
      case 'SUPER_ADMIN': return 'مدير عام';
      default: return role;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" label="جاري التحميل..." />
      </div>
    );
  }

  if (!isAuthenticated || !hasPermission('change_user_roles')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">غير مصرح</h1>
            <p className="text-muted-foreground mt-2 mb-6">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
            <Link href="/admin">
              <Button variant="outline">العودة للوحة الإدارة</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={loadAdmins}>إعادة المحاولة</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">إعدادات المشرفين</h1>
            <p className="text-muted-foreground text-sm">Admin Settings & Permissions</p>
          </div>
        </div>
        <Button
          leftIcon={<UserPlus className="w-5 h-5" />}
          onClick={() => setIsAddingAdmin(true)}
        >
          إضافة مشرف
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-bold text-foreground">{admins.length}</p>
            <p className="text-sm text-muted-foreground">إجمالي المشرفين</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-bold text-emerald-600">{admins.filter(a => a.status === 'ACTIVE').length}</p>
            <Badge variant="success" size="sm" className="mt-1">نشط</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-bold text-destructive">{admins.filter(a => a.role === 'SUPER_ADMIN').length}</p>
            <Badge variant="destructive" size="sm" className="mt-1">مدير عام</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-bold text-primary">{admins.filter(a => a.role === 'ADMIN').length}</p>
            <Badge variant="info" size="sm" className="mt-1">مديرين</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Admin List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              قائمة المشرفين
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={loadAdmins} title="تحديث">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="لا يوجد مشرفين"
              description="قم بإضافة مشرفين جدد للبدء"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المشرف</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map(admin => (
                  <TableRow key={admin.id} className={admin.status !== 'ACTIVE' ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${admin.status === 'ACTIVE' ? 'bg-primary' : 'bg-muted'}`}>
                          <span className="text-primary-foreground font-bold text-sm">
                            {admin.nameArabic?.charAt(0) || admin.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-foreground">{admin.nameArabic || admin.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.role === 'SUPER_ADMIN' ? 'destructive' : 'info'} size="sm">
                        {admin.role === 'SUPER_ADMIN' ? 'مدير عام' : 'مدير'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.status === 'ACTIVE' ? 'success' : 'secondary'} size="sm">
                        {admin.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{admin.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleAdminStatus(admin.id, admin.status)}
                          title={admin.status === 'ACTIVE' ? 'تعطيل' : 'تفعيل'}
                        >
                          {admin.status === 'ACTIVE' ? (
                            <Lock className="w-4 h-4 text-destructive" />
                          ) : (
                            <Unlock className="w-4 h-4 text-emerald-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingAdmin(admin)}
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4 text-primary" />
                        </Button>
                        {admin.role !== 'SUPER_ADMIN' && admin.id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAdmin(admin.id)}
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Admin Dialog */}
      {(isAddingAdmin || editingAdmin) && (
        <Dialog open={true} onOpenChange={() => { setIsAddingAdmin(false); setEditingAdmin(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAdmin ? 'تعديل مشرف' : 'إضافة / ترقية مشرف'}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              {!editingAdmin ? (
                <Tabs defaultValue="add-new">
                  <TabsList className="mb-4">
                    <TabsTrigger value="add-new">
                      <UserPlus className="w-4 h-4 me-2" />
                      إضافة مشرف جديد
                    </TabsTrigger>
                    <TabsTrigger value="promote-existing">
                      <ArrowUpCircle className="w-4 h-4 me-2" />
                      ترقية مستخدم حالي
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="add-new">
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <Input
                          label="الاسم"
                          required
                          value={newAdmin.name}
                          onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                        />
                        <Input
                          label="البريد الإلكتروني"
                          required
                          type="email"
                          value={newAdmin.email}
                          onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                          dir="ltr"
                        />
                      </div>
                      <Input
                        label="كلمة المرور"
                        required
                        type="password"
                        value={newAdmin.password}
                        onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                        dir="ltr"
                      />
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">الدور</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['ADMIN', 'SUPER_ADMIN'] as const).map(role => (
                            <Card
                              key={role}
                              className={`cursor-pointer text-center p-3 transition-all ${
                                newAdmin.role === role ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/30'
                              }`}
                              onClick={() => setNewAdmin({ ...newAdmin, role, permissions: ROLE_DEFAULT_PERMISSIONS[role] })}
                            >
                              <Badge variant={role === 'SUPER_ADMIN' ? 'destructive' : 'info'} size="sm">
                                {role === 'SUPER_ADMIN' ? 'مدير عام' : 'مدير'}
                              </Badge>
                            </Card>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button variant="outline" fullWidth onClick={() => setIsAddingAdmin(false)} disabled={isSaving}>
                          إلغاء
                        </Button>
                        <Button fullWidth isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />} onClick={handleAddAdmin}>
                          إضافة المشرف
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="promote-existing">
                    <div className="space-y-4">
                      <Input
                        label="البحث عن مستخدم"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث بالاسم أو البريد الإلكتروني أو رقم الهاتف..."
                        leftIcon={<Search className="w-4 h-4" />}
                        helperText="سيتم عرض المستخدمين النشطين من الأعضاء والمحررين وقادة الفروع فقط"
                      />

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">الدور المستهدف</label>
                        <div className="grid grid-cols-2 gap-2">
                          <Card
                            className={`cursor-pointer text-center p-3 transition-all ${
                              selectedRoleForPromotion === 'ADMIN' ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/30'
                            }`}
                            onClick={() => setSelectedRoleForPromotion('ADMIN')}
                          >
                            <Badge variant="info" size="sm">مدير</Badge>
                          </Card>
                          <Card
                            className={`cursor-pointer text-center p-3 transition-all ${
                              selectedRoleForPromotion === 'SUPER_ADMIN' ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/30'
                            }`}
                            onClick={() => setSelectedRoleForPromotion('SUPER_ADMIN')}
                          >
                            <Badge variant="destructive" size="sm">مدير عام</Badge>
                          </Card>
                        </div>
                      </div>

                      <Card>
                        <CardHeader className="py-2">
                          <CardTitle className="text-sm">نتائج البحث ({searchResults.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {isSearching ? (
                            <div className="py-8"><Spinner label="جاري البحث..." /></div>
                          ) : searchResults.length === 0 ? (
                            <EmptyState
                              icon={searchQuery.trim() ? <User className="w-10 h-10" /> : <Search className="w-10 h-10" />}
                              title={searchQuery.trim() ? 'لا يوجد مستخدمين مطابقين' : 'ابدأ بالبحث للعثور على المستخدمين'}
                            />
                          ) : (
                            <div className="divide-y divide-border max-h-64 overflow-auto">
                              {searchResults.map(userItem => (
                                <div key={userItem.id} className="p-3 hover:bg-muted/50 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                      <User className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground">{userItem.nameArabic}</span>
                                        <Badge variant="secondary" size="sm">{getRoleLabel(userItem.role)}</Badge>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                        {userItem.email && (
                                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{userItem.email}</span>
                                        )}
                                        {userItem.phone && (
                                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{userItem.phone}</span>
                                        )}
                                      </div>
                                      {userItem.linkedMemberId && (
                                        <Badge variant="success" size="sm" className="mt-1">مرتبط بعضو في الشجرة</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    leftIcon={<ArrowUpCircle className="w-4 h-4" />}
                                    isLoading={promotingUserId === userItem.id}
                                    onClick={() => handlePromoteUser(userItem.id, selectedRoleForPromotion)}
                                  >
                                    ترقية إلى {selectedRoleForPromotion === 'SUPER_ADMIN' ? 'مدير عام' : 'مدير'}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Button variant="outline" fullWidth onClick={() => { setIsAddingAdmin(false); setSearchQuery(''); setSearchResults([]); }}>
                        إغلاق
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                /* Editing Admin */
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="الاسم"
                      value={editingAdmin.nameArabic}
                      disabled
                    />
                    <Input
                      label="البريد الإلكتروني"
                      value={editingAdmin.email}
                      disabled
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">الدور</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['ADMIN', 'SUPER_ADMIN'] as const).map(role => (
                        <Card
                          key={role}
                          className={`cursor-pointer text-center p-3 transition-all ${
                            editingAdmin.role === role ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/30'
                          }`}
                          onClick={() => setEditingAdmin({ ...editingAdmin, role })}
                        >
                          <Badge variant={role === 'SUPER_ADMIN' ? 'destructive' : 'info'} size="sm">
                            {role === 'SUPER_ADMIN' ? 'مدير عام' : 'مدير'}
                          </Badge>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" fullWidth onClick={() => setEditingAdmin(null)} disabled={isSaving}>
                      إلغاء
                    </Button>
                    <Button fullWidth isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />} onClick={handleUpdateAdmin}>
                      حفظ التغييرات
                    </Button>
                  </div>
                </div>
              )}
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
