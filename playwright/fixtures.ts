import { test as base, expect, type Page, type Browser } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Account = {
  email: string;
  password: string;
  name: string;
};

// Accounts available for testing
const accounts: Account[] = [
  {
    email: process.env.PLAYWRIGHT_TEST_EMAIL!,
    password: process.env.PLAYWRIGHT_TEST_PASSWORD!,
    name: 'owner'
  },
  {
    email: process.env.PLAYWRIGHT_TEST_EMAIL_VIEWER!,
    password: process.env.PLAYWRIGHT_TEST_PASSWORD_VIEWER!,
    name: 'viewer'
  },
  {
    email: process.env.PLAYWRIGHT_TEST_EMAIL_EDITOR!,
    password: process.env.PLAYWRIGHT_TEST_PASSWORD_EDITOR!,
    name: 'editor'
  }
];

// Validate that all required environment variables are set
const requiredEnvVars = [
  'PLAYWRIGHT_TEST_EMAIL',
  'PLAYWRIGHT_TEST_PASSWORD',
  'PLAYWRIGHT_TEST_EMAIL_VIEWER',
  'PLAYWRIGHT_TEST_PASSWORD_VIEWER',
  'PLAYWRIGHT_TEST_EMAIL_EDITOR',
  'PLAYWRIGHT_TEST_PASSWORD_EDITOR'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}\nPlease set all test account credentials in your .env file.`);
}

async function authFileExists(authFile: string): Promise<boolean> {
  const fs = await import('fs');
  return fs.promises.access(authFile).then(() => true).catch(() => false);
}

async function authenticateAccount(page: Page, account: Account): Promise<void> {
  // Check if we're already authenticated (no login form visible)
  const loginForm = page.locator('input[name="username"]');
  const isAlreadyAuthenticated = !(await loginForm.isVisible({ timeout: 2000 }).catch(() => false));
  
  if (!isAlreadyAuthenticated) {
    // Look for Amplify Authenticator login form using the selectors from auth-helpers.ts
    const emailInput = page.locator('input[name="username"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const signInButton = page.locator('button[type="submit"]').first();
    
    // Wait for the login form to be visible
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    
    // Fill in credentials
    await emailInput.fill(account.email!);
    await passwordInput.fill(account.password!);
    
    // Submit the form
    await signInButton.click();
    
    // Wait for successful authentication - should redirect away from login
    await page.waitForFunction(
      () => {
        // Check if we're no longer on a login screen
        const hasEmailInput = document.querySelector('input[name="username"]');
        return !hasEmailInput;
      },
      { timeout: 15000 }
    );
    
    // Additional verification - ensure we're authenticated
    await page.waitForLoadState('networkidle');
  }
}

async function verifyAuthentication(page: Page, account: Account, baseURL: string): Promise<void> {
  // If login form is visible, we're definitely not authenticated
  const loginForm = page.locator('input[name="username"]');
  const loginFormVisible = await loginForm.isVisible({ timeout: 2000 }).catch(() => false);
  if (loginFormVisible) {
    throw new Error(`Authentication failed for account ${account.name} (${account.email}) - login form still visible. Current URL: ${page.url()}`);
  }
  
  // Navigate to a protected route to verify authentication
  await page.goto(`${baseURL}/transcribe-list`);
  await page.waitForLoadState('networkidle');
  
  // Check if we're redirected back to login (indicating auth failure)
  const currentUrl = page.url();
  if (currentUrl.includes('/login') || currentUrl.includes('/auth') || currentUrl === baseURL) {
    throw new Error(`Authentication failed for account ${account.name} (${account.email}) - redirected to login. Current URL: ${currentUrl}`);
  }
  
  // Look for authenticated state indicators on the protected route
  const profileButton = page.locator('button[aria-label="Profile menu"]');
  const isAuthenticated = await profileButton.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (!isAuthenticated) {
    throw new Error(`Authentication failed for account ${account.name} (${account.email}) - no authenticated indicators found on protected route. Current URL: ${currentUrl}`);
  }
}

async function createAuthContext(browser: Browser, account: Account, authFile: string): Promise<string> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL;
  
  // Create a new context and page for authentication
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the app root - this should show the Amplify Authenticator if not logged in
    await page.goto(baseURL!);
    await page.waitForLoadState('networkidle');
    
    // Perform authentication
    await authenticateAccount(page, account);
    
    // Verify authentication
    await verifyAuthentication(page, account, baseURL!);
    
    // Save the authentication state
    await page.context().storageState({ path: authFile });
    
    return authFile;
    
  } finally {
    await context.close();
  }
}

// Main test fixture with automatic account assignment
const test = base.extend<{ workerStorageState: string }, { workerStorageState: string }>({
  // Use a unique storage state for each worker
  // eslint-disable-next-line react-hooks/rules-of-hooks
  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  // Set up authentication for each worker
  workerStorageState: [async ({ browser }: { browser: Browser }, use: (value: string) => Promise<void>) => {
    // Get the worker index to assign a unique account
    const workerIndex = process.env.TEST_PARALLEL_INDEX ? parseInt(process.env.TEST_PARALLEL_INDEX) : 0;
    const account = accounts[workerIndex % accounts.length];
    
    const authFile = path.join(__dirname, '.auth', `user-${account.name}.json`);
    
    // Check if authentication file already exists
    if (await authFileExists(authFile)) {
      // Use existing authentication state
      await use(authFile);
      return;
    }
    
    // Create authentication context and perform authentication
    const resultAuthFile = await createAuthContext(browser, account as Account, authFile);
    await use(resultAuthFile);
    // @ts-expect-error - Playwright scope type issue
  }, { scope: 'worker' }],
});

// Custom fixture for specific account testing
const testWithAccount = (accountName: 'owner' | 'viewer' | 'editor') => {
  return base.extend<{ workerStorageState: string }, { workerStorageState: string }>({
    // Use a unique storage state for each worker
    // eslint-disable-next-line react-hooks/rules-of-hooks
    storageState: ({ workerStorageState }, use) => use(workerStorageState),

    // Set up authentication for the specific account
    workerStorageState: [async ({ browser }: { browser: Browser }, use: (value: string) => Promise<void>) => {
      // Find the specific account
      const specificAccount = accounts.find(acc => acc.name === accountName);
      if (!specificAccount || !specificAccount.email || !specificAccount.password) {
        throw new Error(`Account '${accountName}' not found or missing credentials. Available accounts: ${accounts.map(acc => acc.name).join(', ')}`);
      }
      
      const authFile = path.join(__dirname, '.auth', `user-${specificAccount.name}.json`);
      
      // Check if authentication file already exists
      if (await authFileExists(authFile)) {
        // Use existing authentication state
        await use(authFile);
        return;
      }
      
      // Create authentication context and perform authentication
      const resultAuthFile = await createAuthContext(browser, specificAccount as Account, authFile);
      await use(resultAuthFile);
    // @ts-expect-error - Playwright scope type issue
    }, { scope: 'worker' }],
  });
};

export { test, testWithAccount, expect };
