import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { ToastProvider } from '@/components/ui/Toast';
import { QueryProvider } from '@/lib/providers/QueryProvider';

export const metadata: Metadata = {
  title: 'شجرة عائلة آل شايع | Al-Shaye Family Tree',
  description: 'تطبيق شجرة العائلة لآل شايع - Family Tree Application for Al-Shaye family',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-gray-50">
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              <AuthenticatedLayout>{children}</AuthenticatedLayout>
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
