import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';

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
        <Navigation />
        <main className="pb-8">{children}</main>
        <footer className="bg-gray-800 text-white py-6 mt-auto">
          <div className="container mx-auto px-4 text-center">
            <p className="text-lg font-semibold mb-2">شجرة عائلة آل شايع</p>
            <p className="text-sm text-gray-400">
              Al-Shaye Family Tree Application &copy; {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
