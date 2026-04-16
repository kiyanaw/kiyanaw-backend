import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

/**
 * Resolve the base URL for this test run.
 *
 * Resolution order:
 *  1. PLAYWRIGHT_BASE_URL env var (backwards-compatible, or set explicitly in .env)
 *  2. playwright/env-config.json looked up by PLAYWRIGHT_AMPLIFY_ENV
 *  3. playwright/env-config.json looked up by amplify/.config/local-env-info.json (current checkout)
 */
function resolveBaseURL() {
  if (process.env.PLAYWRIGHT_BASE_URL) return process.env.PLAYWRIGHT_BASE_URL;
  try {
    const envName = process.env.PLAYWRIGHT_AMPLIFY_ENV
      ?? JSON.parse(fs.readFileSync(path.resolve(__dirname, 'amplify/.config/local-env-info.json'), 'utf-8')).envName;
    const cfg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'playwright/env-config.json'), 'utf-8'));
    return cfg[envName]?.baseURL ?? '';
  } catch {
    return '';
  }
}

const baseURL = resolveBaseURL();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  globalSetup: './playwright/global-setup.ts',
  globalTeardown: './playwright/global-teardown.ts',
  testDir: './tests/e2e',
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  workers: process.env.PLAYWRIGHT_WORKERS ? parseInt(process.env.PLAYWRIGHT_WORKERS) : 2,
  /* Global test timeout — multi-context tests (sharing/issues) and reload tests make
     multiple real AWS API calls and need generous headroom including afterEach cleanup.
     B1/B3/B4 beforeEach (setupSharedTranscription + region create) alone takes ~90s. */
  timeout: 240000,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', {
      open: 'never',
      outputFolder: 'playwright-report'
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure with full page */
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: baseURL.includes('localhost') ? {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  } : undefined,
});
