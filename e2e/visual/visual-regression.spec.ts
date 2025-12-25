/**
 * Visual Regression Testing with Playwright
 * Captures and compares screenshots for visual consistency
 */

import { test, expect } from '@playwright/test';

// Configure visual comparison options
const visualConfig = {
  maxDiffPixels: 100, // Allow small differences for anti-aliasing
  maxDiffPixelRatio: 0.01, // 1% difference threshold
  threshold: 0.2, // Pixel difference threshold
  animations: 'disabled' as const, // Disable animations for consistent snapshots
};

test.describe('Visual Regression Tests', () => {
  test.describe('Homepage', () => {
    test('should match homepage visual snapshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait for any lazy-loaded content
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('homepage.png', visualConfig);
    });

    test('should match homepage mobile visual snapshot', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('homepage-mobile.png', visualConfig);
    });

    test('should match homepage tablet visual snapshot', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('homepage-tablet.png', visualConfig);
    });
  });

  test.describe('Login Page', () => {
    test('should match login page visual snapshot', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('login-page.png', visualConfig);
    });

    test('should match login page with error visual snapshot', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Fill form with invalid data
      await page.fill('[name="email"]', 'invalid@test.com');
      await page.fill('[name="password"]', 'wrong');
      await page.click('button[type="submit"]');

      // Wait for error message
      await page.waitForSelector('.error-message, [role="alert"]', { timeout: 5000 }).catch(() => {});

      await expect(page).toHaveScreenshot('login-page-error.png', visualConfig);
    });

    test('should match login page focused state', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Focus on email input
      await page.click('[name="email"]');

      await expect(page).toHaveScreenshot('login-page-focused.png', visualConfig);
    });
  });

  test.describe('Family Tree', () => {
    test('should match tree page visual snapshot', async ({ page }) => {
      await page.goto('/tree');
      await page.waitForLoadState('networkidle');

      // Wait for tree to render
      await page.waitForSelector('[data-testid="family-tree"], .tree-container, svg', {
        timeout: 10000,
      }).catch(() => {});

      // Additional wait for animations
      await page.waitForTimeout(2000);

      await expect(page).toHaveScreenshot('tree-page.png', {
        ...visualConfig,
        maxDiffPixelRatio: 0.05, // More lenient for tree visualization
      });
    });

    test('should match tree controls visual snapshot', async ({ page }) => {
      await page.goto('/tree');
      await page.waitForLoadState('networkidle');

      // Focus on tree controls area
      const controls = page.locator('.tree-controls, [data-testid="tree-controls"]').first();

      if (await controls.isVisible()) {
        await expect(controls).toHaveScreenshot('tree-controls.png', visualConfig);
      }
    });
  });

  test.describe('Components', () => {
    test('should match button variants', async ({ page }) => {
      // Create a test page with all button variants
      await page.setContent(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <link href="/globals.css" rel="stylesheet" />
            <style>
              body { padding: 20px; background: #f9fafb; }
              .button-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
              .button { padding: 8px 16px; border-radius: 8px; font-weight: 500; cursor: pointer; border: none; }
              .button-primary { background: linear-gradient(to left, #22c55e, #16a34a); color: white; }
              .button-secondary { background: #f3f4f6; color: #374151; }
              .button-outline { border: 2px solid #22c55e; color: #16a34a; background: transparent; }
              .button-danger { background: #ef4444; color: white; }
            </style>
          </head>
          <body>
            <div class="button-grid">
              <button class="button button-primary">زر أساسي</button>
              <button class="button button-secondary">زر ثانوي</button>
              <button class="button button-outline">زر محدد</button>
              <button class="button button-danger">زر خطر</button>
              <button class="button button-primary" disabled>معطل</button>
            </div>
          </body>
        </html>
      `);

      await expect(page).toHaveScreenshot('button-variants.png', visualConfig);
    });

    test('should match card component', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <style>
              body { padding: 20px; background: #f9fafb; font-family: system-ui; }
              .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); padding: 24px; max-width: 400px; }
              .card-title { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 8px; }
              .card-description { font-size: 14px; color: #6b7280; margin-bottom: 16px; }
              .card-content { color: #374151; }
            </style>
          </head>
          <body>
            <div class="card">
              <h3 class="card-title">عنوان البطاقة</h3>
              <p class="card-description">وصف قصير للبطاقة</p>
              <div class="card-content">
                محتوى البطاقة الرئيسي يظهر هنا
              </div>
            </div>
          </body>
        </html>
      `);

      await expect(page).toHaveScreenshot('card-component.png', visualConfig);
    });

    test('should match spinner component', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <style>
              body { padding: 40px; background: #f9fafb; font-family: system-ui; display: flex; gap: 40px; }
              .spinner-container { display: flex; flex-direction: column; align-items: center; gap: 8px; }
              .spinner { animation: spin 1s linear infinite; }
              .spinner-sm { width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #16a34a; border-radius: 50%; }
              .spinner-md { width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #16a34a; border-radius: 50%; }
              .spinner-lg { width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #16a34a; border-radius: 50%; }
              .label { font-size: 14px; color: #6b7280; }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="spinner-container">
              <div class="spinner spinner-sm"></div>
              <span class="label">صغير</span>
            </div>
            <div class="spinner-container">
              <div class="spinner spinner-md"></div>
              <span class="label">متوسط</span>
            </div>
            <div class="spinner-container">
              <div class="spinner spinner-lg"></div>
              <span class="label">كبير</span>
            </div>
          </body>
        </html>
      `, { waitUntil: 'domcontentloaded' });

      // Pause animations for consistent snapshot
      await page.evaluate(() => {
        document.querySelectorAll('*').forEach((el) => {
          (el as HTMLElement).style.animationPlayState = 'paused';
        });
      });

      await expect(page).toHaveScreenshot('spinner-component.png', visualConfig);
    });
  });

  test.describe('RTL Layout', () => {
    test('should match RTL text alignment', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <style>
              body { padding: 20px; font-family: system-ui; }
              h1 { font-size: 24px; color: #1f2937; margin-bottom: 16px; }
              p { color: #4b5563; line-height: 1.6; margin-bottom: 12px; }
              .highlight { background: #fef3c7; padding: 4px 8px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>شجرة آل شايع</h1>
            <p>
              مرحباً بكم في موقع شجرة عائلة آل شايع. هذا الموقع يحتوي على
              <span class="highlight">معلومات تاريخية</span>
              عن العائلة وأفرادها.
            </p>
            <p>
              يمكنكم تصفح الشجرة والبحث عن الأعضاء والتعرف على تاريخ العائلة العريق.
            </p>
          </body>
        </html>
      `);

      await expect(page).toHaveScreenshot('rtl-layout.png', visualConfig);
    });
  });

  test.describe('Dark Mode (if implemented)', () => {
    test('should match dark mode homepage', async ({ page }) => {
      await page.goto('/');

      // Try to enable dark mode if toggle exists
      const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"], .dark-mode-toggle');

      if (await darkModeToggle.isVisible()) {
        await darkModeToggle.click();
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('homepage-dark.png', visualConfig);
      }
    });
  });

  test.describe('Form Elements', () => {
    test('should match form inputs', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <style>
              body { padding: 20px; background: #f9fafb; font-family: system-ui; }
              .form-group { margin-bottom: 16px; }
              label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px; }
              input { width: 100%; max-width: 300px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
              input:focus { outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1); }
              .error-input { border-color: #ef4444; }
              .error-message { font-size: 12px; color: #ef4444; margin-top: 4px; }
            </style>
          </head>
          <body>
            <form>
              <div class="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" placeholder="example@email.com" />
              </div>
              <div class="form-group">
                <label>حقل مع خطأ</label>
                <input type="text" class="error-input" value="قيمة غير صالحة" />
                <p class="error-message">هذا الحقل غير صالح</p>
              </div>
              <div class="form-group">
                <label>حقل معطل</label>
                <input type="text" disabled value="غير قابل للتعديل" />
              </div>
            </form>
          </body>
        </html>
      `);

      await expect(page).toHaveScreenshot('form-inputs.png', visualConfig);
    });
  });

  test.describe('Navigation', () => {
    test('should match navigation bar', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const nav = page.locator('nav, header, [role="navigation"]').first();

      if (await nav.isVisible()) {
        await expect(nav).toHaveScreenshot('navigation-bar.png', visualConfig);
      }
    });

    test('should match mobile navigation menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Try to open mobile menu
      const menuButton = page.locator('[data-testid="mobile-menu"], .hamburger, button[aria-label*="menu"]').first();

      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('mobile-menu-open.png', visualConfig);
      }
    });
  });
});
