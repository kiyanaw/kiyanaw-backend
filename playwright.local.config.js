import { defineConfig, devices } from '@playwright/test';

/**
 * Local-mode e2e: runs against the production build in `dist/` (run `npm run build` first).
 * The build is served through request interception, so no server and no backend are involved.
 */
export default defineConfig({
  testDir: './tests/e2e-local',
  fullyParallel: true,
  timeout: 120000,
  reporter: [['list']],
  use: {
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
