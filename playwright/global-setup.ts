/**
 * Playwright global setup — authenticates all test accounts before any tests run.
 *
 * Each account gets its own isolated BrowserContext (no shared state between them).
 * Auth files are saved to playwright/.auth/ and loaded per-test via the storageState
 * fixture in playwright/fixtures.ts.
 *
 * Run order: globalSetup → tests → globalTeardown (none defined)
 */
import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

type AccountSetup = {
  name: string;
  email: string;
  password: string;
};

const accounts: AccountSetup[] = [
  { name: 'owner',  email: process.env.PLAYWRIGHT_TEST_EMAIL!,        password: process.env.PLAYWRIGHT_TEST_PASSWORD! },
  { name: 'editor', email: process.env.PLAYWRIGHT_TEST_EMAIL_EDITOR!,  password: process.env.PLAYWRIGHT_TEST_PASSWORD_EDITOR! },
  { name: 'viewer', email: process.env.PLAYWRIGHT_TEST_EMAIL_VIEWER!,  password: process.env.PLAYWRIGHT_TEST_PASSWORD_VIEWER! },
  ...(process.env.PLAYWRIGHT_TEST_EMAIL_ADMIN ? [{
    name: 'admin',
    email: process.env.PLAYWRIGHT_TEST_EMAIL_ADMIN,
    password: process.env.PLAYWRIGHT_TEST_PASSWORD_ADMIN!,
  }] : []),
];

async function authenticateAccount(config: FullConfig, account: AccountSetup): Promise<void> {
  const authDir = path.join(__dirname, '.auth');
  fs.mkdirSync(authDir, { recursive: true });
  const authFile = path.join(authDir, `user-${account.name}.json`);

  // Skip if already authenticated (delete files to force re-auth)
  if (fs.existsSync(authFile)) {
    console.log(`[global-setup] Skipping ${account.name} — auth file already exists`);
    return;
  }

  const baseURL = process.env.PLAYWRIGHT_BASE_URL!;
  console.log(`[global-setup] Authenticating ${account.name} (${account.email})...`);

  // Launch a completely fresh browser with no shared state
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(baseURL);

    // Wait for the Amplify Authenticator login form
    const emailInput = page.locator('input[name="username"]').first();
    const profileButton = page.locator('button[aria-label="Profile menu"]').first();

    const which = await Promise.race([
      emailInput.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'login'),
      profileButton.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'authenticated'),
    ]).catch(() => 'timeout');

    if (which === 'authenticated') {
      // Should not happen in a fresh browser — log and save anyway
      console.warn(`[global-setup] WARNING: ${account.name} context appears already authenticated`);
    } else if (which === 'timeout') {
      throw new Error(`[global-setup] Timed out waiting for login form for ${account.name} at ${page.url()}`);
    } else {
      // Fill in credentials
      const passwordInput = page.locator('input[type="password"]').first();
      const signInButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(account.email);
      await passwordInput.fill(account.password);
      await signInButton.click();

      // Capture what the page looks like 3s after submit to diagnose failures
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(authDir, `debug-${account.name}-after-submit.png`), fullPage: true });

      // Wait for the login form to disappear
      await emailInput.waitFor({ state: 'hidden', timeout: 30000 });
      await page.waitForLoadState('networkidle');
    }

    // Verify we landed on a real authenticated page
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      throw new Error(`[global-setup] Login may have failed for ${account.name} — URL: ${currentUrl}`);
    }

    await context.storageState({ path: authFile });
    console.log(`[global-setup] Saved auth for ${account.name} → ${authFile}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const missing = ['PLAYWRIGHT_BASE_URL', 'PLAYWRIGHT_TEST_EMAIL', 'PLAYWRIGHT_TEST_PASSWORD',
    'PLAYWRIGHT_TEST_EMAIL_EDITOR', 'PLAYWRIGHT_TEST_PASSWORD_EDITOR',
    'PLAYWRIGHT_TEST_EMAIL_VIEWER', 'PLAYWRIGHT_TEST_PASSWORD_VIEWER',
  ].filter(v => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`[global-setup] Missing env vars: ${missing.join(', ')}`);
  }

  // Authenticate each account sequentially (avoid any chance of shared browser state)
  for (const account of accounts) {
    await authenticateAccount(config, account);
  }
}
