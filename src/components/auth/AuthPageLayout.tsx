'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

interface AuthPageLayoutProps {
  children: ReactNode;
  /** Icon element displayed above the title */
  icon?: ReactNode;
  /** Main heading */
  title?: string;
  /** Subtitle / description text */
  subtitle?: string;
  /** Back link URL */
  backHref?: string;
  /** Back link label */
  backLabel?: string;
  /** Show the brand header with logo (default: true) */
  showHeader?: boolean;
  /** Right-side header link */
  headerLink?: { href: string; label: string };
  /** Footer text (default: tagline) */
  footerText?: string;
  /** Max width class for the card container (default: "max-w-md") */
  maxWidth?: string;
  /** Show card wrapper (default: true). Set false for custom layouts like welcome page */
  showCard?: boolean;
  /** Extra className on the card */
  cardClassName?: string;
}

/**
 * AuthPageLayout
 * Shared centered-card layout used across all authentication pages.
 * RTL-first with logical CSS properties. Uses design system Card component.
 */
export default function AuthPageLayout({
  children,
  icon,
  title,
  subtitle,
  backHref,
  backLabel,
  showHeader = true,
  headerLink,
  footerText = 'شجرة عائلة آل شايع - نحفظ إرثنا، نربط أجيالنا',
  maxWidth = 'max-w-md',
  showCard = true,
  cardClassName,
}: AuthPageLayoutProps) {
  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-teal-100"
      dir="rtl"
    >
      {/* Header */}
      {showHeader && (
        <header className="py-6 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link
              href="/"
              className="text-2xl font-bold text-primary"
            >
              آل شايع
            </Link>
            {headerLink && (
              <Link
                href={headerLink.href}
                className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
              >
                <ArrowRight size={18} />
                {headerLink.label}
              </Link>
            )}
          </div>
        </header>
      )}

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className={`w-full ${maxWidth}`}>
          {showCard ? (
            <Card className={cardClassName}>
              <CardContent className="p-8">
                {/* Back link */}
                {backHref && backLabel && (
                  <Link
                    href={backHref}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
                  >
                    <ArrowRight size={16} />
                    {backLabel}
                  </Link>
                )}

                {/* Icon / Title / Subtitle */}
                {(icon || title || subtitle) && (
                  <div className="text-center mb-6">
                    {icon && (
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        {icon}
                      </div>
                    )}
                    {title && (
                      <h1 className="text-2xl font-bold text-foreground">
                        {title}
                      </h1>
                    )}
                    {subtitle && (
                      <p className="text-muted-foreground mt-2">{subtitle}</p>
                    )}
                  </div>
                )}

                {children}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* No-card layout for pages like welcome */}
              {(icon || title || subtitle) && (
                <div className="text-center mb-6">
                  {icon && (
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                      {icon}
                    </div>
                  )}
                  {title && (
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-lg text-muted-foreground mb-8">
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
              {children}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-muted-foreground text-sm">
        <p>{footerText}</p>
      </footer>
    </div>
  );
}
