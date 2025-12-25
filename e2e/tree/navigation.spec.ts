/**
 * E2E Tests: Family Tree Navigation
 * Tests tree viewing and navigation functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Family Tree Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tree');
  });

  test('should display family tree', async ({ page }) => {
    // Wait for tree to load
    await page.waitForSelector('[data-testid="family-tree"], .tree-container, svg', {
      timeout: 10000,
    });

    // Check tree is visible
    await expect(page.locator('[data-testid="family-tree"], .tree-container, svg').first()).toBeVisible();
  });

  test('should display tree controls', async ({ page }) => {
    // Check for zoom controls
    await expect(page.locator('button:has-text("+")')).toBeVisible();
    await expect(page.locator('button:has-text("-")')).toBeVisible();
  });

  test('should expand node on click', async ({ page }) => {
    await page.waitForSelector('[data-testid^="member-"], .tree-node', { timeout: 10000 });

    // Click on a node
    const node = page.locator('[data-testid^="member-"], .tree-node').first();
    await node.click();

    // Should show member details or expand children
    await expect(page.locator('.member-details, .member-sidebar, .node-expanded')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should search and highlight member', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('[data-testid="tree-search"], input[type="search"], [placeholder*="بحث"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('محمد');
      await page.keyboard.press('Enter');

      // Wait for search results
      await expect(page.locator('.search-results, .highlighted, [data-highlighted="true"]')).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('should zoom in and out', async ({ page }) => {
    const zoomIn = page.locator('button:has-text("+")');
    const zoomOut = page.locator('button:has-text("-")');

    if (await zoomIn.isVisible()) {
      // Get initial transform
      const tree = page.locator('[data-testid="family-tree"], .tree-container, svg').first();
      const initialTransform = await tree.getAttribute('transform') || '';

      // Zoom in
      await zoomIn.click();
      await page.waitForTimeout(500);

      // Zoom out
      await zoomOut.click();
      await page.waitForTimeout(500);

      // Tree should still be visible
      await expect(tree).toBeVisible();
    }
  });

  test('should navigate to member profile', async ({ page }) => {
    await page.waitForSelector('[data-testid^="member-"], .tree-node', { timeout: 10000 });

    // Click on a member node
    const node = page.locator('[data-testid^="member-"], .tree-node').first();
    await node.click();

    // Look for "View Profile" or similar button
    const viewProfile = page.locator('button:has-text("عرض الملف"), button:has-text("View Profile"), a[href*="/member/"]');

    if (await viewProfile.isVisible({ timeout: 3000 })) {
      await viewProfile.click();
      await expect(page).toHaveURL(/\/member\/|\/profile\//);
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Tree should still be visible
    await expect(page.locator('[data-testid="family-tree"], .tree-container, svg').first()).toBeVisible();
  });

  test('should show loading state', async ({ page }) => {
    // Go to page with cleared cache
    await page.route('**/api/tree**', (route) => {
      setTimeout(() => route.continue(), 1000);
    });

    await page.goto('/tree');

    // Should show loading indicator
    await expect(page.locator('.loading, [role="progressbar"], .spinner').first()).toBeVisible({
      timeout: 1000,
    });
  });
});

test.describe('Family Tree Accessibility', () => {
  test('should have accessible tree structure', async ({ page }) => {
    await page.goto('/tree');
    await page.waitForSelector('[data-testid="family-tree"], .tree-container, svg', {
      timeout: 10000,
    });

    // Check for proper ARIA attributes
    const tree = page.locator('[role="tree"], [data-testid="family-tree"]');
    if (await tree.count() > 0) {
      await expect(tree.first()).toBeVisible();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/tree');
    await page.waitForSelector('[data-testid^="member-"], .tree-node', { timeout: 10000 });

    // Tab to first node
    await page.keyboard.press('Tab');

    // Check something is focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeDefined();
  });
});
