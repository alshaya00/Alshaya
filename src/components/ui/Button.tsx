import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<string, string> = {
  default:
    'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
  outline:
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost:
    'hover:bg-accent hover:text-accent-foreground',
  link:
    'text-primary underline-offset-4 hover:underline',
  success:
    'bg-success text-success-foreground hover:bg-success/90 shadow-sm',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-9 px-3 text-sm rounded-md gap-1.5',
  md: 'h-10 px-4 py-2 text-sm rounded-md gap-2',
  lg: 'h-11 px-6 text-base rounded-lg gap-2',
  icon: 'h-10 w-10 rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap font-medium',
          'transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50',
          'active:scale-[0.98]',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2
              className="animate-spin"
              size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16}
              aria-hidden="true"
            />
            {children && <span className="sr-only">Loading...</span>}
            {children && <span aria-hidden="true">{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
