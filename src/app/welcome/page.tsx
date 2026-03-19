'use client';

import Link from 'next/link';
import { CheckCircle, TreeDeciduous, Users, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import AuthPageLayout from '@/components/auth/AuthPageLayout';

export default function WelcomePage() {
  return (
    <AuthPageLayout
      icon={<CheckCircle className="w-10 h-10 text-emerald-600" />}
      title="مرحباً بك في عائلة آل شايع"
      subtitle="تم تسجيل طلبك بنجاح وهو قيد المراجعة من قبل إدارة الموقع. سيتم إعلامك عبر البريد الإلكتروني عند الموافقة على طلبك."
      showCard={false}
      maxWidth="max-w-2xl"
    >
      {/* Info Card */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
            ماذا يمكنك فعله بعد الموافقة؟
          </h2>

          <div className="grid md:grid-cols-3 gap-6 text-start">
            <div className="p-4 rounded-xl bg-primary/5">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <TreeDeciduous className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">استكشاف الشجرة</h3>
              <p className="text-sm text-muted-foreground">
                تصفح شجرة العائلة الكاملة واكتشف روابط القرابة
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">التواصل مع الأقارب</h3>
              <p className="text-sm text-muted-foreground">
                تواصل مع أفراد العائلة وتعرف على أقاربك
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">البحث المتقدم</h3>
              <p className="text-sm text-muted-foreground">
                ابحث عن أي فرد من أفراد العائلة بسهولة
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center h-11 px-6 text-base rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
        >
          الذهاب للصفحة الرئيسية
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center h-11 px-6 text-base rounded-lg font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          تسجيل الدخول
        </Link>
      </div>
    </AuthPageLayout>
  );
}
