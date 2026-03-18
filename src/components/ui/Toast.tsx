'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

/* ============================================
   TYPES
   ============================================ */
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  messageAr?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, messageAr?: string) => void;
  error: (message: string, messageAr?: string) => void;
  info: (message: string, messageAr?: string) => void;
  warning: (message: string, messageAr?: string) => void;
}

/* ============================================
   CONTEXT
   ============================================ */
const ToastContext = createContext<ToastContextType | null>(null);

/* ============================================
   TOAST PROVIDER
   ============================================ */
interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = toast.duration ?? 4000;
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, messageAr?: string) => addToast({ type: 'success', message, messageAr }),
    [addToast]
  );
  const error = useCallback(
    (message: string, messageAr?: string) => addToast({ type: 'error', message, messageAr, duration: 6000 }),
    [addToast]
  );
  const info = useCallback(
    (message: string, messageAr?: string) => addToast({ type: 'info', message, messageAr }),
    [addToast]
  );
  const warning = useCallback(
    (message: string, messageAr?: string) => addToast({ type: 'warning', message, messageAr, duration: 5000 }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

/* ============================================
   TOAST CONTAINER
   ============================================ */
function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 lg:bottom-6 start-4 end-4 lg:start-auto lg:end-6 z-[100] flex flex-col gap-2 lg:w-96"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

/* ============================================
   TOAST ITEM
   ============================================ */
const toastConfig = {
  success: {
    icon: CheckCircle,
    containerClass: 'border-emerald-200 dark:border-emerald-800/50',
    iconClass: 'text-emerald-500 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/50',
  },
  error: {
    icon: AlertCircle,
    containerClass: 'border-red-200 dark:border-red-800/50',
    iconClass: 'text-red-500 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-950/50',
  },
  info: {
    icon: Info,
    containerClass: 'border-blue-200 dark:border-blue-800/50',
    iconClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-950/50',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'border-amber-200 dark:border-amber-800/50',
    iconClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/50',
  },
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'border rounded-lg shadow-lg p-4 flex items-start gap-3',
        'animate-slide-up',
        'text-foreground',
        config.bgClass,
        config.containerClass
      )}
      role="alert"
    >
      <Icon className={cn('shrink-0 mt-0.5', config.iconClass)} size={20} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{toast.messageAr || toast.message}</p>
        {toast.messageAr && toast.message && (
          <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        aria-label="Close notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ============================================
   HOOK
   ============================================ */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
