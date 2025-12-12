import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  fullPage?: boolean;
}

const sizeStyles = {
  sm: 16,
  md: 24,
  lg: 40,
};

export function Spinner({ size = 'md', className, label = 'جاري التحميل...', fullPage = false }: SpinnerProps) {
  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)} role="status">
      <Loader2
        className="animate-spin text-green-600"
        size={sizeStyles[size]}
        aria-hidden="true"
      />
      {label && (
        <span className={cn('text-gray-500', size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm')}>
          {label}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  label?: string;
}

export function LoadingOverlay({ isLoading, children, label }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center rounded-lg z-10">
          <Spinner size="md" label={label} />
        </div>
      )}
    </div>
  );
}
