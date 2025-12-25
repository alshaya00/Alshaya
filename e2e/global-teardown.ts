/**
 * Playwright Global Teardown
 * Runs once after all tests
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // Clean up any resources created during tests
  console.log('E2E tests completed. Cleaning up...');

  // Add any cleanup logic here
  // For example: clearing test data from database, closing connections, etc.
}

export default globalTeardown;
