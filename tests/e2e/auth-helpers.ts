import { Page, expect } from '@playwright/test';

export interface TestCredentials {
  email: string;
  password: string;
}

// Debug helpers (enable with PW_DEBUG_AUTH=1 or DEBUG=*e2e:auth*)
const DEBUG_AUTH: boolean = process.env.PW_DEBUG_AUTH === '1' || (process.env.DEBUG ? process.env.DEBUG.includes('e2e:auth') : false);

function logAuth(message: string): void {
  if (DEBUG_AUTH) {
    // eslint-disable-next-line no-console
    console.log(`[e2e:auth] ${message}`);
  }
}

async function shot(page: Page, label: string): Promise<void> {
  if (!DEBUG_AUTH) return;
  try {
    await page.screenshot({ path: `test-results/debug-auth-${Date.now()}-${label}.png`, fullPage: true });
  } catch {
    // ignore screenshot errors in debug mode
  }
}

/**
 * Get test credentials from environment variables
 */
export function getTestCredentials(): TestCredentials {
  const email = process.env.TEST_USER_EMAIL || 'editor@kiyanaw.dev';
  const password = process.env.TEST_USER_PASSWORD || 'password';
  
  if (!email || !password) {
    throw new Error(
      'Test credentials not found. Please set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables.'
    );
  }
  
  return { email, password };
}

/**
 * Login using AWS Amplify Authenticator component
 */
export async function login(page: Page, credentials?: TestCredentials): Promise<void> {
  const creds = credentials || getTestCredentials();
  
  // Go to the app root - this should show the Amplify Authenticator if not logged in
  logAuth('login(): navigating to /');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await shot(page, 'after-goto-root');
  
  // Look for Amplify Authenticator login form
  // The Amplify UI uses specific selectors we can target
  const emailInput = page.locator('input[name="username"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const signInButton = page.locator('button[type="submit"]').first();
  
  // Wait for the login form to be visible
  logAuth('login(): waiting for email input to be visible');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  
  // Fill in credentials
  logAuth(`login(): filling email for ${creds.email}`);
  await emailInput.fill(creds.email);
  logAuth('login(): filling password');
  await passwordInput.fill(creds.password);
  
  // Submit the form
  logAuth('login(): clicking Sign in');
  await signInButton.click();
  await shot(page, 'after-click-sign-in');
  
  // Wait for successful authentication - should redirect away from login
  // After login, Amplify typically redirects to the main app
  logAuth('login(): waiting for redirect after sign in');
  await page.waitForFunction(
    () => {
      // Check if we're no longer on a login screen
      const hasEmailInput = document.querySelector('input[name="username"]');
      return !hasEmailInput;
    },
    { timeout: 15000 }
  );
  
  // Additional verification - ensure we're authenticated
  logAuth('login(): authenticated, waiting for network idle');
  await page.waitForLoadState('networkidle');
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  // Look for profile menu button
  const profileButton = page.locator('button[aria-label="Profile menu"]');
  
  if (await profileButton.isVisible()) {
    await profileButton.click();
    
    // Wait for dropdown and click sign out
    const signOutButton = page.locator('button:has-text("Sign out")');
    await expect(signOutButton).toBeVisible();
    await signOutButton.click();
    
    // Wait for logout to complete - should see login form again
    await expect(page.locator('input[type="email"], input[name="username"]')).toBeVisible({ timeout: 10000 });
  }
}

/**
 * Check if user is currently authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    logAuth('isAuthenticated(): checking auth state');
    
    // If login form is visible, we're definitely not authenticated
    const loginForm = page.locator('input[name="username"]');
    if (await loginForm.isVisible({ timeout: 2000 })) {
      logAuth('isAuthenticated(): login form visible, not authenticated');
      return false;
    }
    
    // Look for authenticated state indicators
    const profileButton = page.locator('button[aria-label="Profile menu"]');
    if (await profileButton.isVisible({ timeout: 2000 })) {
      logAuth('isAuthenticated(): profile button visible, authenticated');
      return true;
    }
    
    // No clear indicators - assume not authenticated (safer default)
    logAuth('isAuthenticated(): no clear indicators, assuming not authenticated');
    return false;
  } catch (error) {
    logAuth(`isAuthenticated(): error occurred, assuming not authenticated: ${error}`);
    return false;
  }
}

/**
 * Ensure user is authenticated before running tests
 * This is the main function to use in beforeEach hooks
 */
export async function ensureAuthenticated(page: Page, credentials?: TestCredentials): Promise<void> {
  logAuth('ensureAuthenticated(): start');
  const authenticated = await isAuthenticated(page);
  
  if (!authenticated) {
    logAuth('ensureAuthenticated(): not authenticated, attempting login');
    await login(page, credentials);
  }

  const after = await isAuthenticated(page);
  logAuth(`ensureAuthenticated(): authenticated=${after}`);
}

/**
 * Skip test if credentials are not available
 */
export function skipIfNoCredentials(): void {
  try {
    getTestCredentials();
  } catch {
    // This will cause the test to be skipped
    throw new Error('Skipping test: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables not set');
  }
}
