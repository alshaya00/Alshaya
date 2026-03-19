'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Shield } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner, Card, CardContent, Button } from '@/components/ui';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, hasPermission } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || hasPermission('change_user_roles');
        setIsAuthorized(isAdmin);
      } else {
        setIsAuthorized(false);
      }
    }
  }, [isLoading, isAuthenticated, user, hasPermission]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Spinner size="lg" label="جاري التحميل..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">لوحة الإدارة</h1>
              <p className="text-muted-foreground mt-2">يرجى تسجيل الدخول للوصول إلى لوحة الإدارة</p>
            </div>

            <div className="space-y-4">
              <Button
                fullWidth
                size="lg"
                onClick={() => router.push('/login?redirect=/admin')}
              >
                تسجيل الدخول
              </Button>
            </div>

            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                العودة للرئيسية
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">غير مصرح</h1>
              <p className="text-muted-foreground mt-2">ليس لديك صلاحية للوصول إلى لوحة الإدارة</p>
            </div>

            <div className="space-y-4">
              <Link href="/">
                <Button fullWidth size="lg">
                  العودة للرئيسية
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <AdminSidebar />
      <div className="lg:me-64 transition-all duration-300">
        {children}
      </div>
    </div>
  );
}
