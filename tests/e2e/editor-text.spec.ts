/**
 * Editor text & region coverage
 *
 * - ORIG text typed into a region persists after a hard reload
 * - TRAN (translation) text persists after a hard reload
 * - Region merge reduces the region count by 1
 *
 * These are the most central editor flows and were previously untested.
 * All tests are owner-pinned; the transcription is created/deleted per test.
 */
import { testWithAccount, expect } from '../../playwright/fixtures';
import { createTestTranscription, deleteTestTranscription, dragRegion, waitForAudioReady } from './helpers';

testWithAccount('owner').describe('Editor text persistence', () => {
  let transcriptionId: string;
  let title: string;

  testWithAccount('owner').beforeEach(async ({ page }) => {
    const result = await createTestTranscription(page);
    transcriptionId = result.transcriptionId;
    title = result.title;
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    await deleteTestTranscription(page, transcriptionId, title);
    transcriptionId = '';
    title = '';
  });

  testWithAccount('owner')('ORIG text persists after hard reload', async ({ page }) => {
    await expect(page).toHaveURL(/.*transcribe-edit\/.*/);

    // Create a region
    await dragRegion(page);
    await expect(page.locator('text=Regions (1)').first()).toBeVisible({ timeout: 15000 });

    // Wait for audio decode, then select the region
    await waitForAudioReady(page);
    const regionItem = page.locator('[data-testid*="regionitem"]').first();
    await expect(regionItem).toBeVisible();
    await regionItem.click();
    await page.waitForTimeout(1000);

    // Type text in the ORIG Quill editor
    const origEditor = page.locator('[data-testid="region-editor-main"] .ql-editor').first();
    await expect(origEditor).toBeVisible({ timeout: 5000 });
    await origEditor.click();
    const testText = `test orig ${Date.now()}`;
    await page.keyboard.type(testText);

    // Wait for the debounced save (2500 ms debounce + API latency)
    await page.waitForTimeout(6000);

    // Hard reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="waveform-container"]').first()).toBeVisible({ timeout: 30000 });

    // Re-select the region and verify text is present
    const reloadedRegion = page.locator('[data-testid*="regionitem"]').first();
    await expect(reloadedRegion).toBeVisible({ timeout: 15000 });
    await reloadedRegion.click();
    await page.waitForTimeout(1000);

    const reloadedEditor = page.locator('[data-testid="region-editor-main"] .ql-editor').first();
    await expect(reloadedEditor).toBeVisible({ timeout: 5000 });
    await expect(reloadedEditor).toContainText(testText, { timeout: 5000 });
    console.log('✅ ORIG text persisted after hard reload');
  });

  testWithAccount('owner')('TRAN text persists after hard reload', async ({ page }) => {
    await expect(page).toHaveURL(/.*transcribe-edit\/.*/);

    // Create a region
    await dragRegion(page);
    await expect(page.locator('text=Regions (1)').first()).toBeVisible({ timeout: 15000 });

    // Wait for audio decode, then select the region
    await waitForAudioReady(page);
    const regionItem = page.locator('[data-testid*="regionitem"]').first();
    await expect(regionItem).toBeVisible();
    await regionItem.click();
    await page.waitForTimeout(1000);

    // Switch to TRAN tab and type translation text
    const tranTab = page.locator('[data-testid="region-tab-tran"]').first();
    await expect(tranTab).toBeVisible({ timeout: 5000 });
    await tranTab.click();
    await page.waitForTimeout(500);

    const tranEditor = page.locator('[data-testid="region-editor-translation"] .ql-editor').first();
    await expect(tranEditor).toBeVisible({ timeout: 5000 });
    await tranEditor.click();
    const tranText = `test tran ${Date.now()}`;
    await page.keyboard.type(tranText);

    // Wait for the debounced save
    await page.waitForTimeout(6000);

    // Hard reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="waveform-container"]').first()).toBeVisible({ timeout: 30000 });

    // Re-select region, switch to TRAN, verify text
    const reloadedRegion = page.locator('[data-testid*="regionitem"]').first();
    await expect(reloadedRegion).toBeVisible({ timeout: 15000 });
    await reloadedRegion.click();
    await page.waitForTimeout(1000);

    const reloadedTranTab = page.locator('[data-testid="region-tab-tran"]').first();
    await expect(reloadedTranTab).toBeVisible({ timeout: 5000 });
    await reloadedTranTab.click();
    await page.waitForTimeout(500);

    const reloadedTranEditor = page.locator('[data-testid="region-editor-translation"] .ql-editor').first();
    await expect(reloadedTranEditor).toBeVisible({ timeout: 5000 });
    await expect(reloadedTranEditor).toContainText(tranText, { timeout: 5000 });
    console.log('✅ TRAN text persisted after hard reload');
  });
});

testWithAccount('owner').describe('Region merge', () => {
  let transcriptionId: string;
  let title: string;

  testWithAccount('owner').beforeEach(async ({ page }) => {
    const result = await createTestTranscription(page);
    transcriptionId = result.transcriptionId;
    title = result.title;
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    await deleteTestTranscription(page, transcriptionId, title);
    transcriptionId = '';
    title = '';
  });

  testWithAccount('owner')('merging two adjacent regions reduces count to 1', async ({ page }) => {
    await expect(page).toHaveURL(/.*transcribe-edit\/.*/);

    const waveformContainer = page.locator('[data-testid="waveform-container"]');
    await expect(waveformContainer).toBeVisible();
    const box = await waveformContainer.boundingBox();
    if (!box) throw new Error('Could not get waveform bounding box');

    // Drag first region (x+50 to x+150)
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + box.height / 2);
    await page.mouse.up();
    await page.waitForTimeout(2000);

    // Drag second region (x+200 to x+300)
    await page.mouse.move(box.x + 200, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + box.height / 2);
    await page.mouse.up();
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Regions (2)').first()).toBeVisible({ timeout: 15000 });
    console.log('✅ Two regions created');

    // Wait for both create-region API calls to settle in the database before merging
    await waitForAudioReady(page);
    await page.waitForTimeout(5000);
    const firstRegion = page.locator('[data-testid*="regionitem"]').first();
    await expect(firstRegion).toBeVisible();
    await firstRegion.click();
    await page.waitForTimeout(1000);

    // Click merge-next — accept the confirm dialog that fires before the merge
    page.once('dialog', async (dialog) => dialog.accept());
    const mergeButton = page.locator('[data-testid="merge-next-button"]').first();
    await expect(mergeButton).toBeEnabled({ timeout: 5000 });
    await mergeButton.click();
    await page.waitForTimeout(5000);

    await expect(page.locator('text=Regions (1)').first()).toBeVisible({ timeout: 20000 });
    console.log('✅ Merge reduced region count to 1');
  });
});
