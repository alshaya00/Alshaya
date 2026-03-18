'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

/* ============================================
   Breadcrumb
   ============================================ */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronLeft size={14} className="text-muted-foreground/50 rtl:rotate-0 ltr:rotate-180" aria-hidden="true" />
            )}
            {item.href && index < items.length - 1 ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(index === items.length - 1 && 'text-foreground font-medium')}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ============================================
   PageLayout
   ============================================ */
export interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  /** Page title */
  title?: string;
  /** Page description */
  description?: string;
  /** Breadcrumb items */
  breadcrumbs?: BreadcrumbItem[];
  /** Action buttons for the header */
  actions?: ReactNode;
  /** Whether to use narrow/centered layout */
  narrow?: boolean;
  /** Whether to add padding */
  padded?: boolean;
}

export function PageLayout({
  children,
  className,
  title,
  description,
  breadcrumbs,
  actions,
  narrow = false,
  padded = true,
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        'min-h-full',
        padded && 'px-4 py-6 lg:px-6 lg:py-8',
        className
      )}
    >
      <div className={cn('mx-auto w-full', narrow ? 'max-w-3xl' : 'max-w-7xl')}>
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb items={breadcrumbs} className="mb-4" />
        )}

        {/* Page Header */}
        {(title || actions) && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              {title && (
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                  {title}
                </h1>
              )}
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 shrink-0">{actions}</div>
            )}
          </div>
        )}

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}

/* ============================================
   PageSection - for grouping content sections
   ============================================ */
export interface PageSectionProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageSection({
  children,
  className,
  title,
  description,
  actions,
}: PageSectionProps) {
  return (
    <section className={cn('mb-8', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
