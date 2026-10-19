import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: { baseURL },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'iphone', use: { ...devices['iPhone 14'], browserName: 'chromium' } },
  ],
  // Tests run against the local server unless BASE_URL points at a deployment.
  webServer: process.env.BASE_URL ? undefined : {
    command: 'node scripts/serve.mjs',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
