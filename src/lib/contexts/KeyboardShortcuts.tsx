'use client';

import { createContext, useContext, useEffect, useCallback, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  descriptionAr: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'search' | 'accessibility';
}

interface KeyboardShortcutsContextType {
  shortcuts: Shortcut[];
  registerShortcut: (shortcut: Shortcut) => () => void;
  unregisterShortcut: (key: string) => void;
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

// Default shortcuts
const getDefaultShortcuts = (router: ReturnType<typeof useRouter>): Shortcut[] => [
  {
    key: '/',
    description: 'Focus search',
    descriptionAr: 'التركيز على البحث',
    action: () => {
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="بحث"], input[placeholder*="search"]') as HTMLInputElement;
      searchInput?.focus();
    },
    category: 'search',
  },
  {
    key: 'h',
    description: 'Go to home',
    descriptionAr: 'الذهاب للرئيسية',
    action: () => router.push('/'),
    category: 'navigation',
  },
  {
    key: 't',
    description: 'Go to tree view',
    descriptionAr: 'عرض الشجرة',
    action: () => router.push('/tree'),
    category: 'navigation',
  },
  {
    key: 'r',
    description: 'Go to registry',
    descriptionAr: 'السجل',
    action: () => router.push('/registry'),
    category: 'navigation',
  },
  {
    key: 'd',
    description: 'Go to dashboard',
    descriptionAr: 'لوحة المعلومات',
    action: () => router.push('/dashboard'),
    category: 'navigation',
  },
  {
    key: 'a',
    ctrlKey: true,
    description: 'Go to admin panel',
    descriptionAr: 'لوحة الإدارة',
    action: () => router.push('/admin'),
    category: 'navigation',
  },
  {
    key: 'Escape',
    description: 'Close modal/menu',
    descriptionAr: 'إغلاق النافذة',
    action: () => {
      // Close any open modals
      const closeButton = document.querySelector('[data-close-modal], [aria-label="Close"], .modal-close') as HTMLButtonElement;
      closeButton?.click();
    },
    category: 'actions',
  },
  {
    key: '?',
    shiftKey: true,
    description: 'Show keyboard shortcuts',
    descriptionAr: 'عرض اختصارات لوحة المفاتيح',
    action: () => {
      // This will be handled by the context
    },
    category: 'accessibility',
  },
];

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  // Initialize default shortcuts
  useEffect(() => {
    setShortcuts(getDefaultShortcuts(router));
  }, [router]);

  // Register a new shortcut
  const registerShortcut = useCallback((shortcut: Shortcut) => {
    setShortcuts((prev) => {
      // Check if shortcut already exists
      const exists = prev.some(
        (s) =>
          s.key === shortcut.key &&
          s.ctrlKey === shortcut.ctrlKey &&
          s.metaKey === shortcut.metaKey &&
          s.shiftKey === shortcut.shiftKey &&
          s.altKey === shortcut.altKey
      );

      if (exists) {
        return prev.map((s) =>
          s.key === shortcut.key &&
          s.ctrlKey === shortcut.ctrlKey &&
          s.metaKey === shortcut.metaKey &&
          s.shiftKey === shortcut.shiftKey &&
          s.altKey === shortcut.altKey
            ? shortcut
            : s
        );
      }

      return [...prev, shortcut];
    });

    // Return unregister function
    return () => {
      setShortcuts((prev) =>
        prev.filter(
          (s) =>
            !(
              s.key === shortcut.key &&
              s.ctrlKey === shortcut.ctrlKey &&
              s.metaKey === shortcut.metaKey &&
              s.shiftKey === shortcut.shiftKey &&
              s.altKey === shortcut.altKey
            )
        )
      );
    };
  }, []);

  // Unregister a shortcut
  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts((prev) => prev.filter((s) => s.key !== key));
  }, []);

  // Handle keyboard events
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Only allow Escape in inputs
        if (event.key !== 'Escape') return;
      }

      // Find matching shortcut
      const shortcut = shortcuts.find(
        (s) =>
          s.key.toLowerCase() === event.key.toLowerCase() &&
          !!s.ctrlKey === event.ctrlKey &&
          !!s.metaKey === event.metaKey &&
          !!s.shiftKey === event.shiftKey &&
          !!s.altKey === event.altKey
      );

      if (shortcut) {
        event.preventDefault();

        // Special case for help
        if (shortcut.key === '?' && shortcut.shiftKey) {
          setShowHelp((prev) => !prev);
        } else {
          shortcut.action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, isEnabled]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        shortcuts,
        registerShortcut,
        unregisterShortcut,
        showHelp,
        setShowHelp,
        isEnabled,
        setIsEnabled,
      }}
    >
      {children}
      {/* Keyboard Shortcuts Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                اختصارات لوحة المفاتيح
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Keyboard Shortcuts
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Group by category */}
              {(['navigation', 'search', 'actions', 'accessibility'] as const).map((category) => {
                const categoryShortcuts = shortcuts.filter((s) => s.category === category);
                if (categoryShortcuts.length === 0) return null;

                const categoryLabels = {
                  navigation: { ar: 'التنقل', en: 'Navigation' },
                  search: { ar: 'البحث', en: 'Search' },
                  actions: { ar: 'الإجراءات', en: 'Actions' },
                  accessibility: { ar: 'إمكانية الوصول', en: 'Accessibility' },
                };

                return (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      {categoryLabels[category].ar} ({categoryLabels[category].en})
                    </h3>
                    <div className="space-y-2">
                      {categoryShortcuts.map((shortcut) => (
                        <div
                          key={`${shortcut.key}-${shortcut.ctrlKey}-${shortcut.shiftKey}`}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            {shortcut.descriptionAr}
                          </span>
                          <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm font-mono">
                            {shortcut.ctrlKey && 'Ctrl+'}
                            {shortcut.metaKey && '⌘+'}
                            {shortcut.shiftKey && 'Shift+'}
                            {shortcut.altKey && 'Alt+'}
                            {shortcut.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 p-4 text-center">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87]"
              >
                إغلاق (Escape)
              </button>
            </div>
          </div>
        </div>
      )}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (context === undefined) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
}

// Custom hook to register a shortcut from a component
export function useShortcut(shortcut: Omit<Shortcut, 'action'>, action: () => void) {
  const { registerShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    const unregister = registerShortcut({ ...shortcut, action });
    return unregister;
  }, [shortcut, action, registerShortcut]);
}
