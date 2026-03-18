'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import {
  forwardRef,
  HTMLAttributes,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from 'react';

/* ============================================
   Dialog (Modal) Root
   ============================================ */
export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/50 backdrop-blur-sm',
        'animate-fade-in'
      )}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

/* ============================================
   DialogContent
   ============================================ */
export interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  onClose?: () => void;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
};

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, size = 'md', onClose, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative w-full mx-4',
        'bg-background rounded-lg border border-border shadow-lg',
        'animate-scale-in',
        'max-h-[85vh] overflow-y-auto',
        sizeStyles[size],
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {onClose && (
        <button
          onClick={onClose}
          className={cn(
            'absolute top-4 end-4 z-10',
            'rounded-sm opacity-70 ring-offset-background',
            'transition-opacity hover:opacity-100',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:pointer-events-none'
          )}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      )}
      {children}
    </div>
  )
);
DialogContent.displayName = 'DialogContent';

/* ============================================
   DialogHeader
   ============================================ */
export const DialogHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)}
      {...props}
    />
  )
);
DialogHeader.displayName = 'DialogHeader';

/* ============================================
   DialogTitle
   ============================================ */
export const DialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
DialogTitle.displayName = 'DialogTitle';

/* ============================================
   DialogDescription
   ============================================ */
export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

/* ============================================
   DialogBody
   ============================================ */
export const DialogBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
  )
);
DialogBody.displayName = 'DialogBody';

/* ============================================
   DialogFooter
   ============================================ */
export const DialogFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-6 pt-4',
        className
      )}
      {...props}
    />
  )
);
DialogFooter.displayName = 'DialogFooter';
