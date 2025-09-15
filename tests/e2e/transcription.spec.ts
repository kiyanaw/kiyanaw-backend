import { testWithAccount, expect } from '../../playwright/fixtures';

const mainTest = testWithAccount('main');

mainTest.describe('Transcription Features', () => {
  mainTest('should access transcription list page with authentication', async ({ page }) => {
    // Navigate to the transcriptions list page (protected route)
    await page.goto('/transcribe-list');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check that we're on the correct page
    await expect(page).toHaveURL(/.*transcribe-list.*/);
    
    // Verify we're authenticated by checking for authenticated elements
    const isAuthenticated = await page.locator('button[aria-label="Profile menu"], button:has-text("Sign out"), [data-testid="authenticator"]').first().isVisible().catch(() => false);
    expect(isAuthenticated).toBeTruthy();
  });

  mainTest('should be able to navigate from home page', async ({ page }) => {
    // Start from the home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the home page or redirected to a protected route
    await expect(page).toHaveURL(/.*\/$|.*transcribe-list.*/);
    
    // Verify we're authenticated
    const isAuthenticated = await page.locator('button[aria-label="Profile menu"], button:has-text("Sign out"), [data-testid="authenticator"]').first().isVisible().catch(() => false);
    expect(isAuthenticated).toBeTruthy();
  });

});
