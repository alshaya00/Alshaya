/**
 * Playwright Global Setup
 * Runs once before all tests
 */

import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  // Create auth directory if it doesn't exist
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:5000';

  // Set up regular user authentication
  const browser = await chromium.launch();
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();

  try {
    // Navigate to login page
    await userPage.goto(`${baseURL}/login`);

    // Fill in login form
    await userPage.fill('[name="email"]', process.env.E2E_USER_EMAIL || 'testuser@test.com');
    await userPage.fill('[name="password"]', process.env.E2E_USER_PASSWORD || 'TestPassword123');

    // Submit login
    await userPage.click('button[type="submit"]');

    // Wait for navigation to complete
    await userPage.waitForURL(`${baseURL}/`, { timeout: 10000 });

    // Save user auth state
    await userContext.storageState({ path: path.join(authDir, 'user.json') });
  } catch (error) {
    console.log('User login setup skipped or failed:', error);
    // Create empty auth file if login fails (for tests that don't need auth)
    fs.writeFileSync(
      path.join(authDir, 'user.json'),
      JSON.stringify({ cookies: [], origins: [] })
    );
  }

  await userContext.close();

  // Set up admin authentication
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();

  try {
    await adminPage.goto(`${baseURL}/login`);
    await adminPage.fill('[name="email"]', process.env.E2E_ADMIN_EMAIL || 'testadmin@test.com');
    await adminPage.fill('[name="password"]', process.env.E2E_ADMIN_PASSWORD || 'AdminPassword123');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL(`${baseURL}/`, { timeout: 10000 });
    await adminContext.storageState({ path: path.join(authDir, 'admin.json') });
  } catch (error) {
    console.log('Admin login setup skipped or failed:', error);
    fs.writeFileSync(
      path.join(authDir, 'admin.json'),
      JSON.stringify({ cookies: [], origins: [] })
    );
  }

  await adminContext.close();
  await browser.close();
}

export default globalSetup;
