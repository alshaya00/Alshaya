/**
 * Accessibility Testing Suite
 * Tests for WCAG 2.1 compliance using jest-axe
 */

import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Import components to test
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Spinner, LoadingOverlay } from '@/components/ui/Spinner';

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader-icon" className={className} role="img" aria-label="Loading">
      Loading...
    </span>
  ),
}));

describe('Accessibility Tests', () => {
  describe('Button Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Button>Accessible Button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with loading state', async () => {
      const { container } = render(<Button isLoading>Loading</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with icons', async () => {
      const { container } = render(
        <Button
          leftIcon={<span aria-hidden="true">←</span>}
          rightIcon={<span aria-hidden="true">→</span>}
        >
          With Icons
        </Button>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations when disabled', async () => {
      const { container } = render(<Button disabled>Disabled</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with aria-label', async () => {
      const { container } = render(
        <Button aria-label="Close dialog" size="icon">×</Button>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations for all variants', async () => {
      const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success'] as const;

      for (const variant of variants) {
        const { container } = render(<Button variant={variant}>{variant} Button</Button>);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }
    });
  });

  describe('Card Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <Card>
          <CardContent>Card content</CardContent>
        </Card>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with full composition', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description text</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <Button>Action</Button>
          </CardFooter>
        </Card>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with proper heading levels', async () => {
      const { container } = render(
        <main>
          <h1>Page Title</h1>
          <Card>
            <CardHeader>
              <CardTitle as="h2">Section Title</CardTitle>
            </CardHeader>
            <CardContent>Content</CardContent>
          </Card>
        </main>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Spinner Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Spinner />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with custom label', async () => {
      const { container } = render(<Spinner label="Loading data..." />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations in full page mode', async () => {
      const { container } = render(<Spinner fullPage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('LoadingOverlay Component', () => {
    it('should have no accessibility violations when not loading', async () => {
      const { container } = render(
        <LoadingOverlay isLoading={false}>
          <div>Content</div>
        </LoadingOverlay>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations when loading', async () => {
      const { container } = render(
        <LoadingOverlay isLoading={true}>
          <div>Content being loaded</div>
        </LoadingOverlay>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Accessibility', () => {
    it('should have no violations with properly labeled form', async () => {
      const { container } = render(
        <form aria-labelledby="form-title">
          <h2 id="form-title">تسجيل الدخول</h2>
          <div>
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              type="email"
              id="email"
              name="email"
              aria-describedby="email-help"
              required
            />
            <span id="email-help">أدخل بريدك الإلكتروني</span>
          </div>
          <div>
            <label htmlFor="password">كلمة المرور</label>
            <input
              type="password"
              id="password"
              name="password"
              required
            />
          </div>
          <Button type="submit">تسجيل الدخول</Button>
        </form>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with error states', async () => {
      const { container } = render(
        <form>
          <div>
            <label htmlFor="email-error">البريد الإلكتروني</label>
            <input
              type="email"
              id="email-error"
              name="email"
              aria-invalid="true"
              aria-describedby="email-error-msg"
            />
            <span id="email-error-msg" role="alert">
              البريد الإلكتروني غير صالح
            </span>
          </div>
        </form>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Navigation Accessibility', () => {
    it('should have no violations with proper navigation structure', async () => {
      const { container } = render(
        <nav aria-label="القائمة الرئيسية">
          <ul>
            <li><a href="/">الرئيسية</a></li>
            <li><a href="/tree">شجرة العائلة</a></li>
            <li><a href="/members">الأعضاء</a></li>
            <li><a href="/settings" aria-current="page">الإعدادات</a></li>
          </ul>
        </nav>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with skip links', async () => {
      const { container } = render(
        <div>
          <a href="#main-content" className="sr-only focus:not-sr-only">
            تخطي إلى المحتوى الرئيسي
          </a>
          <nav aria-label="التنقل">
            <a href="/">الرئيسية</a>
          </nav>
          <main id="main-content" tabIndex={-1}>
            Main content
          </main>
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('RTL (Right-to-Left) Support', () => {
    it('should have no violations with RTL layout', async () => {
      const { container } = render(
        <div dir="rtl" lang="ar">
          <h1>شجرة آل شايع</h1>
          <Card>
            <CardHeader>
              <CardTitle>معلومات العائلة</CardTitle>
            </CardHeader>
            <CardContent>
              <p>محتوى باللغة العربية</p>
            </CardContent>
          </Card>
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Modal/Dialog Accessibility', () => {
    it('should have no violations with proper dialog structure', async () => {
      const { container } = render(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-desc"
        >
          <h2 id="dialog-title">تأكيد الحذف</h2>
          <p id="dialog-desc">هل أنت متأكد من حذف هذا العنصر؟</p>
          <div>
            <Button variant="danger">حذف</Button>
            <Button variant="secondary">إلغاء</Button>
          </div>
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Table Accessibility', () => {
    it('should have no violations with proper table structure', async () => {
      const { container } = render(
        <table>
          <caption>قائمة أعضاء العائلة</caption>
          <thead>
            <tr>
              <th scope="col">الاسم</th>
              <th scope="col">الجيل</th>
              <th scope="col">الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">محمد</th>
              <td>الأول</td>
              <td>نشط</td>
            </tr>
            <tr>
              <th scope="row">أحمد</th>
              <td>الثاني</td>
              <td>نشط</td>
            </tr>
          </tbody>
        </table>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Image Accessibility', () => {
    it('should have no violations with alt text', async () => {
      const { container } = render(
        <figure>
          <img
            src="/placeholder.jpg"
            alt="صورة عضو العائلة محمد آل شايع"
          />
          <figcaption>محمد آل شايع - الجيل الأول</figcaption>
        </figure>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with decorative images', async () => {
      const { container } = render(
        <div>
          <img src="/decoration.jpg" alt="" role="presentation" />
          <p>محتوى مهم</p>
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
