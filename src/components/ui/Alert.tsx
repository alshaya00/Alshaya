import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { forwardRef, HTMLAttributes, ReactNode } from 'react';

/* ============================================
   Alert
   ============================================ */
export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  icon?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantStyles: Record<string, string> = {
  default: 'bg-background text-foreground border-border',
  destructive: 'bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/20 [&>svg]:text-destructive',
  success: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800/50 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400',
  warning: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/50 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400',
  info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-800/50 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400',
};

const defaultIcons: Record<string, ReactNode> = {
  default: <Info size={16} />,
  destructive: <AlertCircle size={16} />,
  success: <CheckCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', icon, dismissible, onDismiss, children, ...props }, ref) => {
    const iconElement = icon !== undefined ? icon : defaultIcons[variant];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4',
          '[&>svg]:absolute [&>svg]:top-4 [&>svg]:start-4',
          '[&>svg+div]:translate-y-[-3px]',
          iconElement ? '[&>svg~*]:ps-7' : '',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {iconElement}
        <div>{children}</div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-3 end-3 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = 'Alert';

/* ============================================
   AlertTitle
   ============================================ */
export const AlertTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
);
AlertTitle.displayName = 'AlertTitle';

/* ============================================
   AlertDescription
   ============================================ */
export const AlertDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';
