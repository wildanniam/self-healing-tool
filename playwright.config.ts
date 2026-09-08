import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', timeout: 20000,
  fullyParallel: true, forbidOnly: !!process.env.CI, retries: 0, workers: process.env.CI ? 2 : 3,
  reporter: [['list']], use: { browserName: 'chromium', headless: true, serviceWorkers: 'block' },
});
