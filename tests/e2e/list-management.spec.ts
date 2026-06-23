/**
 * Transcription list management coverage
 *
 * - Title search/filter shows only matching rows and clears correctly
 * - Sort select can be changed without breaking the list
 * - Delete via the list trash button removes the row from the list
 *
 * All tests are owner-pinned; a transcription is created in beforeEach
 * and cleaned up in afterEach as a safety net (delete test handles its own cleanup).
 */
import { testWithAccount, expect } from '../../playwright/fixtures';
import { createTestTranscription, deleteTestTranscription } from './helpers';

testWithAccount('owner').describe('Transcription list management', () => {
  let transcriptionId: string;
  let title: string;

  testWithAccount('owner').beforeEach(async ({ page }) => {
    const result = await createTestTranscription(page);
    transcriptionId = result.transcriptionId;
    title = result.title;
    // Navigate to the list after creation
    await page.goto('/transcribe-list');
    await page.waitForLoadState('networkidle');
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    if (transcriptionId && title) {
      await deleteTestTranscription(page, transcriptionId, title);
    }
    transcriptionId = '';
    title = '';
  });

  testWithAccount('owner')('search filter shows only matching rows and clears correctly', async ({ page }) => {
    // The transcription created in beforeEach should be visible
    const titleRow = page.locator('[data-testid="transcription-list-item-title-row"]').filter({ hasText: title }).first();
    await expect(titleRow).toBeVisible({ timeout: 15000 });

    // Type the unique title into the search input
    const searchInput = page.locator('[data-testid="transcription-search-input"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill(title);
    await page.waitForTimeout(500);

    // The matching row should still be visible
    await expect(titleRow).toBeVisible();

    // The results count text should confirm 1 match
    await expect(page.locator('text=1 transcription').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Search filter shows 1 matching result');

    // Clear the search — the row should still be visible and count recovers
    await searchInput.clear();
    await page.waitForTimeout(500);
    await expect(titleRow).toBeVisible();
    console.log('✅ Search cleared; row visible again');
  });

  testWithAccount('owner')('sort select can be changed without breaking the list', async ({ page }) => {
    const sortSelect = page.locator('[data-testid="transcription-sort-select"]').first();
    await expect(sortSelect).toBeVisible();

    // Change to title descending and assert list still renders
    await sortSelect.selectOption('title-desc');
    await page.waitForTimeout(500);
    const titleRow = page.locator('[data-testid="transcription-list-item-title-row"]').first();
    await expect(titleRow).toBeVisible({ timeout: 5000 });
    console.log('✅ Sort changed to title-desc; list still renders');

    // Change to title ascending
    await sortSelect.selectOption('title-asc');
    await page.waitForTimeout(500);
    await expect(titleRow).toBeVisible({ timeout: 5000 });
    console.log('✅ Sort changed to title-asc; list still renders');
  });

  testWithAccount('owner')('delete via list trash button removes the row', async ({ page }) => {
    const titleRow = page.locator('[data-testid="transcription-list-item-title-row"]').filter({ hasText: title }).first();
    await expect(titleRow).toBeVisible({ timeout: 15000 });

    // Click the trash icon in the desktop row
    const deleteBtn = titleRow.locator('[data-testid="transcription-delete-button"]').first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    await page.waitForTimeout(500);

    // Fill the confirmation input and confirm
    const confirmInput = page.locator('[data-testid="delete-confirm-input"]').first();
    await expect(confirmInput).toBeVisible({ timeout: 5000 });
    await confirmInput.fill('delete forever');

    const deleteForeverBtn = page.locator('[data-testid="delete-forever-button"]').first();
    await expect(deleteForeverBtn).toBeVisible();
    await deleteForeverBtn.click();
    await page.waitForTimeout(3000);

    // Row should no longer be visible
    await expect(
      page.locator('[data-testid="transcription-list-item-title-row"]').filter({ hasText: title })
    ).toHaveCount(0, { timeout: 10000 });
    console.log('✅ Transcription row removed from list after deletion');

    // Mark as cleaned up so afterEach skips
    transcriptionId = '';
    title = '';
  });
});
