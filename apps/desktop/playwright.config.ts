import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests for the vsclaude renderer. Playwright drives the app served by
 * the Vite dev server (the same renderer the native shell loads). Full native
 * window automation additionally needs tauri-driver plus WebdriverIO; these
 * cover the renderer flows that run identically in both.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:1420',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
