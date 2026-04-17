import { test as base, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnvName } from './auth-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required env vars
const requiredEnvVars = [
  'PLAYWRIGHT_TEST_EMAIL',
  'PLAYWRIGHT_TEST_PASSWORD',
  'PLAYWRIGHT_TEST_EMAIL_VIEWER',
  'PLAYWRIGHT_TEST_PASSWORD_VIEWER',
  'PLAYWRIGHT_TEST_EMAIL_EDITOR',
  'PLAYWRIGHT_TEST_PASSWORD_EDITOR'
];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}\nPlease set all test account credentials in your .env file.`);
}

/**
 * Returns the path to the pre-created auth file for the given account.
 * Auth files are created by globalSetup (playwright/global-setup.ts) before
 * any tests run — each account is authenticated in a completely isolated
 * browser process, so there is no cross-account session leakage.
 */
function authFilePath(accountName: 'owner' | 'viewer' | 'editor' | 'admin'): string {
  return path.join(__dirname, '.auth', `user-${accountName}-${getEnvName()}.json`);
}

/**
 * Returns the auth file path for use in secondary browser contexts created
 * inside tests (e.g. a sharing test that needs both owner and editor pages).
 * Global setup guarantees the file exists before tests start.
 */
function ensureAuthFile(accountName: 'owner' | 'viewer' | 'editor' | 'admin'): string {
  return authFilePath(accountName);
}

// Main test fixture — assigns accounts round-robin by worker index
const test = base.extend<{ workerStorageState: string }, { workerStorageState: string }>({
  // eslint-disable-next-line react-hooks/rules-of-hooks
  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  // eslint-disable-next-line no-empty-pattern
  workerStorageState: [async ({}: object, use: (value: string) => Promise<void>) => {
    const accountNames = ['owner', 'viewer', 'editor'] as const;
    const workerIndex = process.env.TEST_PARALLEL_INDEX ? parseInt(process.env.TEST_PARALLEL_INDEX) : 0;
    const accountName = accountNames[workerIndex % accountNames.length];
    await use(authFilePath(accountName));
  // @ts-expect-error - Playwright scope type issue
  }, { scope: 'worker' }],
});

// Custom fixture for tests that require a specific account
const testWithAccount = (accountName: 'owner' | 'viewer' | 'editor' | 'admin') => {
  return base.extend<{ workerStorageState: string }, { workerStorageState: string }>({
    // eslint-disable-next-line react-hooks/rules-of-hooks
    storageState: ({ workerStorageState }, use) => use(workerStorageState),

    // eslint-disable-next-line no-empty-pattern
    workerStorageState: [async ({}: object, use: (value: string) => Promise<void>) => {
      await use(authFilePath(accountName));
    // @ts-expect-error - Playwright scope type issue
    }, { scope: 'worker' }],
  });
};

export { test, testWithAccount, ensureAuthFile, expect };
