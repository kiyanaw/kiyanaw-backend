/**
 * Page-reload / generateClient coverage
 *
 * Verifies that generateClient queries (listTranscriptions, getTranscription,
 * listRegions) return data after navigation and hard page reloads, and that
 * shared transcriptions appear in an editor's list after accepting an invite.
 */
import { testWithAccount, expect } from '../../playwright/fixtures';
import { createTestTranscription, deleteTestTranscription, dragRegion, sendInvite, acceptInviteForTranscription, ensureAuthFile } from './helpers';

// ---------------------------------------------------------------------------
// Owner sees their transcription after navigating away and back
// ---------------------------------------------------------------------------
testWithAccount('owner').describe('Transcription list reloads via generateClient', () => {
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

  testWithAccount('owner')('owner sees own transcription on /transcribe-list after navigating away', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/transcribe-list');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/.*transcribe-list.*/);

    // Amplify can fire a "NoSignedUser: No current user" error on fast navigation
    // while the auth session re-hydrates. Click Retry if it appears.
    const retryButton = page.locator('button:has-text("Retry")').first();
    if (await retryButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await retryButton.click();
      await page.waitForTimeout(2000);
    }

    // Use the desktop-layout title link (data-testid avoids matching hidden mobile duplicate)
    const transcriptionLink = page.locator(`[data-testid="transcription-list-item-title"]:has-text("${title}")`).first();
    await expect(transcriptionLink).toBeVisible({ timeout: 30000 });
    console.log(`✅ Transcription "${title}" visible in list after navigation`);
  });
});

// ---------------------------------------------------------------------------
// Owner sees their regions after a hard page reload
// ---------------------------------------------------------------------------
testWithAccount('owner').describe('Region list reloads via generateClient', () => {
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

  testWithAccount('owner')('owner sees regions after hard reload of editor page', async ({ page }) => {
    await dragRegion(page);
    await expect(page.locator('text=Regions (1)').first()).toBeVisible();
    // Extra buffer to ensure the createRegion mutation has been persisted in AppSync
    // before the reload discards in-memory state.
    await page.waitForTimeout(4000);

    // Hard reload — browser discards in-memory state; only persisted data comes back
    await page.reload();
    await page.waitForLoadState('networkidle');
    // Wait for the editor to fully mount before asserting region data
    await expect(page.locator('[data-testid="waveform-container"]')).toBeVisible({ timeout: 30000 });

    await expect(page.locator('text=Regions (1)').first()).toBeVisible({ timeout: 30000 });
    console.log('✅ Region persisted and visible after hard page reload');
  });
});

// ---------------------------------------------------------------------------
// load-shared-transcriptions populates editor's list
// ---------------------------------------------------------------------------
testWithAccount('owner').describe('Shared transcription appears in editor list', () => {
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

  testWithAccount('owner')('shared transcription appears in editor account list after invite-accept', async ({ page, browser }) => {
    const editorEmail = process.env.PLAYWRIGHT_TEST_EMAIL_EDITOR!;
    await sendInvite(page, editorEmail, 'editor');

    const editorContext = await browser.newContext({ storageState: ensureAuthFile('editor') });
    const editorPage = await editorContext.newPage();

    try {
      await acceptInviteForTranscription(editorPage, title);

      await editorPage.goto('/transcribe-list');
      await editorPage.waitForLoadState('networkidle');

      // Shared transcriptions live on the "Shared with Me" tab
      const sharedTab = editorPage.locator('[data-testid="shared-with-me-tab"]');
      await expect(sharedTab).toBeVisible({ timeout: 10000 });
      await sharedTab.click();
      await editorPage.waitForTimeout(1000);

      const sharedLink = editorPage.locator(`[data-testid="transcription-list-item-title"]:has-text("${title}")`).first();
      await expect(sharedLink).toBeVisible({ timeout: 15000 });
      console.log(`✅ Shared transcription "${title}" visible in editor's list after invite accept`);
    } finally {
      await editorContext.close();
    }
  });
});
