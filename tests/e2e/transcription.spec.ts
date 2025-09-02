import { test, expect } from '@playwright/test';
import { ensureAuthenticated, skipIfNoCredentials } from './auth-helpers';

// URL of the private transcription
// /transcribe-edit/4391f61d-c77f-4e23-9305-38799f02f59d

test.describe('Transcription Features', () => {
  // Skip all tests if no test credentials are available
  test.beforeAll(() => {
    try {
      skipIfNoCredentials();
    } catch (error) {
      test.skip(true, 'No test credentials available');
    }
  });

  // Ensure user is authenticated before each test
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });
  
  test('should display transcription list', async ({ page }) => {
    await page.goto('/transcribe-list');
    
    await page.waitForLoadState('networkidle');
    
    // Check that H1 says "My transcriptions"
    await expect(page.getByRole('heading', { level: 1, name: 'Transcriptions' })).toBeVisible();
  });

});
