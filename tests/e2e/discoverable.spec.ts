/**
 * Discoverable (public) transcription access
 *
 * Validates:
 *  - A non-owner authenticated user can open a transcription marked Discoverable
 *  - A non-owner authenticated user is denied access to a private transcription
 *
 * The Discoverable toggle is gated behind a language selection — tests set a
 * language first before toggling.
 */
import { testWithAccount, expect } from '../../playwright/fixtures';
import { createTestTranscription, deleteTestTranscription, ensureAuthFile } from './helpers';

testWithAccount('owner').describe('Discoverable transcription access', () => {
  let transcriptionId: string;
  let title: string;

  testWithAccount('owner').beforeEach(async ({ page }) => {
    const result = await createTestTranscription(page);
    transcriptionId = result.transcriptionId;
    title = result.title;
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    await deleteTestTranscription(page, transcriptionId, title);
  });

  testWithAccount('owner')('non-owner can open a discoverable transcription', async ({ page, browser }) => {
    // Set a language (required for the Discoverable toggle to render)
    const settingsButton = page.locator('[data-testid="transcription-settings-button"]').first();
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    await page.waitForTimeout(1000);

    const languageSelector = page.locator('#lang');
    await expect(languageSelector).toBeVisible();
    await languageSelector.click();
    const searchInput = page.locator('input[placeholder="Search languages..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Plains Cree');
    const plainsCreeOption = page.locator('button:has-text("Plains Cree Y-dialect")');
    await expect(plainsCreeOption).toBeVisible();
    await plainsCreeOption.click();

    const saveButton = page.locator('button:has-text("Save Changes"), button:has-text("Save")').first();
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    await page.waitForTimeout(2000);

    // Re-open settings and toggle Discoverable on
    await settingsButton.click();
    await page.waitForTimeout(1000);

    const discoverableToggle = page.locator('[data-testid="discoverable-toggle"]');
    await expect(discoverableToggle).toBeVisible();
    await expect(discoverableToggle).toHaveAttribute('aria-checked', 'false');
    await discoverableToggle.click();
    await expect(discoverableToggle).toHaveAttribute('aria-checked', 'true');

    await saveButton.click();
    await page.waitForTimeout(2000);

    console.log(`✅ Owner marked transcription ${transcriptionId} as discoverable`);

    // Uninvited viewer account opens the transcription directly via URL
    const viewerContext = await browser.newContext({ storageState: ensureAuthFile('viewer') });
    const viewerPage = await viewerContext.newPage();

    try {
      await viewerPage.goto(`/transcribe-edit/${transcriptionId}`);

      await Promise.race([
        viewerPage.waitForURL('**/404**', { timeout: 30000 }),
        viewerPage.locator('[data-testid="waveform-container"]').waitFor({ state: 'visible', timeout: 30000 }),
      ]).catch(() => null);

      const waveformVisible = await viewerPage.locator('[data-testid="waveform-container"]').first()
        .isVisible().catch(() => false);
      expect(waveformVisible).toBe(true);

      const is404 = viewerPage.url().includes('/404');
      expect(is404).toBe(false);

      console.log('✅ Non-owner can open discoverable transcription');
    } finally {
      await viewerContext.close().catch(() => {});
    }
  });

  testWithAccount('owner')('non-owner is denied access to a private transcription', async ({ browser }) => {
    // Transcription is private by default — no settings change needed
    const viewerContext = await browser.newContext({ storageState: ensureAuthFile('viewer') });
    const viewerPage = await viewerContext.newPage();

    try {
      await viewerPage.goto(`/transcribe-edit/${transcriptionId}`);

      await Promise.race([
        viewerPage.waitForURL('**/404**', { timeout: 15000 }),
        viewerPage.locator('[data-testid="waveform-container"]').waitFor({ state: 'visible', timeout: 15000 }),
      ]).catch(() => null);

      const waveformVisible = await viewerPage.locator('[data-testid="waveform-container"]').first()
        .isVisible().catch(() => false);
      expect(waveformVisible).toBe(false);

      console.log('✅ Non-owner correctly denied access to private transcription');
    } finally {
      await viewerContext.close().catch(() => {});
    }
  });
});
