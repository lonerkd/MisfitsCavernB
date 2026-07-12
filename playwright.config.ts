import { defineConfig, devices } from '@playwright/test';

// Default: test the branch under a locally built/served instance, started by
// webServer below. PLAYWRIGHT_BASE_URL overrides this to point at a deployed
// URL (e.g. a Vercel preview or production) for a manual smoke check — that
// override skips webServer entirely, so it never double-starts a server
// against a URL that's already live.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    // Escape hatch for local machines whose installed Playwright browser
    // doesn't match the pinned headless-shell build (e.g. only a full
    // Chromium binary is available). Unset by default; CI never sets it.
    launchOptions: process.env.MC_LOCAL_CHROMIUM ? { executablePath: process.env.MC_LOCAL_CHROMIUM } : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run start',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
