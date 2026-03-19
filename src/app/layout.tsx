import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { ToastProvider } from '@/components/ui/Toast';

// ============================================
// Fonts
// ============================================

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ibm-plex-arabic',
});

// ============================================
// Metadata
// ============================================

export const metadata: Metadata = {
  title: {
    default: 'شجرة عائلة آل شايع | Al-Shaya Family Tree',
    template: '%s | آل شايع',
  },
  description:
    'منصة رقمية متكاملة لتوثيق وحفظ تاريخ عائلة آل شايع وربط أفرادها عبر الأجيال - A digital platform for documenting and preserving the Al-Shaya family history',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  applicationName: 'Al-Shaya Family Tree',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1a' },
  ],
};

// ============================================
// Inline script to prevent dark-mode flash (FOUC)
// Runs before React hydrates so the correct class is on <html> immediately.
// ============================================

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('alshaya-theme');
    var d = (t === 'dark') || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (d) document.documentElement.classList.add('dark');
  } catch(e){}
})();
`;

// ============================================
// Root Layout
// ============================================

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${inter.variable} ${ibmPlexArabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <QueryProvider>
          <AuthProvider>
            <FeatureFlagsProvider>
              <ThemeProvider>
                <ToastProvider>
                  <AuthenticatedLayout>{children}</AuthenticatedLayout>
                </ToastProvider>
              </ThemeProvider>
            </FeatureFlagsProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
