/**
 * E2E Tests: Login Flow
 * Tests the complete login user journey
 */

import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
  });

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');

    // Check page title and heading
    await expect(page).toHaveTitle(/تسجيل الدخول|Login/);

    // Check form elements exist
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill invalid credentials
    await page.fill('[name="email"]', 'invalid@test.com');
    await page.fill('[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Expect error message
    await expect(page.locator('.error-message, [role="alert"]')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('should show validation error for empty fields', async ({ page }) => {
    await page.goto('/login');

    // Submit empty form
    await page.click('button[type="submit"]');

    // Expect validation errors
    await expect(page.locator('text=/البريد الإلكتروني مطلوب|Email is required/i')).toBeVisible();
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'not-an-email');
    await page.fill('[name="password"]', 'Password123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/بريد إلكتروني غير صالح|Invalid email/i')).toBeVisible();
  });

  test('should redirect to home page after successful login', async ({ page }) => {
    await page.goto('/login');

    // Use test credentials (should be set up in the database)
    await page.fill('[name="email"]', process.env.E2E_USER_EMAIL || 'testuser@test.com');
    await page.fill('[name="password"]', process.env.E2E_USER_PASSWORD || 'TestPassword123');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page).toHaveURL('/');
  });

  test('should have remember me option', async ({ page }) => {
    await page.goto('/login');

    // Check remember me checkbox exists
    const rememberMe = page.locator('[name="rememberMe"], [type="checkbox"]');
    await expect(rememberMe).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');

    // Click register link
    await page.click('text=/إنشاء حساب|Register|Sign up/i');

    await expect(page).toHaveURL(/register|signup/);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');

    // Click forgot password link
    await page.click('text=/نسيت كلمة المرور|Forgot password/i');

    await expect(page).toHaveURL(/forgot-password|reset-password/);
  });

  test('should be accessible', async ({ page }) => {
    await page.goto('/login');

    // Check for proper form labels
    await expect(page.locator('label[for="email"], label:has-text("البريد الإلكتروني")')).toBeVisible();
    await expect(page.locator('label[for="password"], label:has-text("كلمة المرور")')).toBeVisible();

    // Check for proper heading structure
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login');

    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[name="email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[name="password"]')).toBeFocused();

    await page.keyboard.press('Tab');
    // Should focus on remember me or submit button
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    // Check elements are still visible and functional
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

test.describe('Login RTL Support', () => {
  test('should display in RTL layout for Arabic', async ({ page }) => {
    await page.goto('/login');

    // Check if page has RTL direction
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });

  test('should have Arabic text', async ({ page }) => {
    await page.goto('/login');

    // Check for Arabic content
    const arabicContent = page.locator('text=/تسجيل الدخول|البريد الإلكتروني|كلمة المرور/');
    await expect(arabicContent.first()).toBeVisible();
  });
});
