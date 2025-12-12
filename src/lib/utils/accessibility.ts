// Accessibility Utilities
// Al-Shaye Family Tree Application

// ============================================
// FOCUS MANAGEMENT
// ============================================

/**
 * Trap focus within a container element
 * Useful for modals and dialogs
 */
export function trapFocus(container: HTMLElement) {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Restore focus to the previously focused element
 */
export function createFocusRestorer() {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  return () => {
    previouslyFocused?.focus();
  };
}

// ============================================
// SCREEN READER ANNOUNCEMENTS
// ============================================

let announcer: HTMLElement | null = null;

/**
 * Create the announcer element if it doesn't exist
 */
function getAnnouncer(): HTMLElement {
  if (announcer) return announcer;

  announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  document.body.appendChild(announcer);

  return announcer;
}

/**
 * Announce a message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcer = getAnnouncer();
  announcer.setAttribute('aria-live', priority);

  // Clear and set new message to ensure announcement
  announcer.textContent = '';
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
}

// ============================================
// ARIA UTILITIES
// ============================================

/**
 * Generate a unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Common ARIA labels in Arabic and English
 */
export const ARIA_LABELS = {
  close: { ar: 'إغلاق', en: 'Close' },
  menu: { ar: 'القائمة', en: 'Menu' },
  search: { ar: 'بحث', en: 'Search' },
  loading: { ar: 'جاري التحميل...', en: 'Loading...' },
  navigation: { ar: 'التنقل', en: 'Navigation' },
  mainContent: { ar: 'المحتوى الرئيسي', en: 'Main content' },
  sidebar: { ar: 'الشريط الجانبي', en: 'Sidebar' },
  footer: { ar: 'تذييل الصفحة', en: 'Footer' },
  breadcrumb: { ar: 'مسار التنقل', en: 'Breadcrumb' },
  pagination: { ar: 'التنقل بين الصفحات', en: 'Pagination' },
  sortAscending: { ar: 'ترتيب تصاعدي', en: 'Sort ascending' },
  sortDescending: { ar: 'ترتيب تنازلي', en: 'Sort descending' },
  expandAll: { ar: 'توسيع الكل', en: 'Expand all' },
  collapseAll: { ar: 'طي الكل', en: 'Collapse all' },
  previousPage: { ar: 'الصفحة السابقة', en: 'Previous page' },
  nextPage: { ar: 'الصفحة التالية', en: 'Next page' },
  firstPage: { ar: 'الصفحة الأولى', en: 'First page' },
  lastPage: { ar: 'الصفحة الأخيرة', en: 'Last page' },
  required: { ar: 'مطلوب', en: 'Required' },
  optional: { ar: 'اختياري', en: 'Optional' },
  error: { ar: 'خطأ', en: 'Error' },
  success: { ar: 'نجاح', en: 'Success' },
  warning: { ar: 'تحذير', en: 'Warning' },
  info: { ar: 'معلومات', en: 'Information' },
} as const;

/**
 * Get bilingual aria-label
 */
export function getAriaLabel(
  key: keyof typeof ARIA_LABELS,
  lang: 'ar' | 'en' | 'both' = 'both'
): string {
  const label = ARIA_LABELS[key];
  if (lang === 'ar') return label.ar;
  if (lang === 'en') return label.en;
  return `${label.ar} (${label.en})`;
}

// ============================================
// REDUCED MOTION
// ============================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get safe animation duration (0 if reduced motion preferred)
 */
export function getSafeAnimationDuration(duration: number): number {
  return prefersReducedMotion() ? 0 : duration;
}

// ============================================
// COLOR CONTRAST
// ============================================

/**
 * Calculate relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const parseColor = (color: string): [number, number, number] => {
    const hex = color.replace('#', '');
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  };

  const l1 = getLuminance(...parseColor(color1));
  const l2 = getLuminance(...parseColor(color2));

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA (4.5:1 for normal text)
 */
export function meetsWCAGAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA (7:1 for normal text)
 */
export function meetsWCAGAAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 7;
}

// ============================================
// SKIP LINKS
// ============================================

/**
 * Create skip link styles (add to global CSS)
 */
export const skipLinkStyles = `
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #1E3A5F;
    color: white;
    padding: 8px 16px;
    z-index: 100;
    transition: top 0.3s;
  }

  .skip-link:focus {
    top: 0;
  }
`;

// ============================================
// KEYBOARD NAVIGATION HELPERS
// ============================================

/**
 * Handle arrow key navigation in a list
 */
export function handleListNavigation(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
  } = {}
): number {
  const { loop = true, orientation = 'vertical' } = options;

  let nextIndex = currentIndex;

  const isVertical = orientation === 'vertical' || orientation === 'both';
  const isHorizontal = orientation === 'horizontal' || orientation === 'both';

  switch (event.key) {
    case 'ArrowDown':
      if (isVertical) {
        event.preventDefault();
        nextIndex = currentIndex + 1;
        if (nextIndex >= items.length) {
          nextIndex = loop ? 0 : items.length - 1;
        }
      }
      break;
    case 'ArrowUp':
      if (isVertical) {
        event.preventDefault();
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = loop ? items.length - 1 : 0;
        }
      }
      break;
    case 'ArrowRight':
      if (isHorizontal) {
        event.preventDefault();
        nextIndex = currentIndex + 1;
        if (nextIndex >= items.length) {
          nextIndex = loop ? 0 : items.length - 1;
        }
      }
      break;
    case 'ArrowLeft':
      if (isHorizontal) {
        event.preventDefault();
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = loop ? items.length - 1 : 0;
        }
      }
      break;
    case 'Home':
      event.preventDefault();
      nextIndex = 0;
      break;
    case 'End':
      event.preventDefault();
      nextIndex = items.length - 1;
      break;
  }

  if (nextIndex !== currentIndex) {
    items[nextIndex]?.focus();
  }

  return nextIndex;
}
