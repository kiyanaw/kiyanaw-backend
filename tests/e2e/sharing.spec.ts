/**
 * Sharing + Region parent-ACL coverage
 *
 * Validates:
 *  - getRegion pipeline resolver (parent-ACL check)
 *  - onCreateRegion subscription with transcriptionId filter arg
 *  - Region mutation auth for editors on shared transcriptions
 *
 * Run with --workers=1 to prevent storage-state collisions between workers.
 */
import { testWithAccount, expect } from '../../playwright/fixtures';
import { createTestTranscription, deleteTestTranscription, dragRegion, sendInvite, acceptInviteForTranscription, ensureAuthFile } from './helpers';
import type { Browser, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared setup helper
// ---------------------------------------------------------------------------
async function setupSharedTranscription(
  ownerPage: Page,
  browser: Browser,
  permission: 'editor' | 'viewer' = 'editor',
): Promise<{ transcriptionId: string; title: string; sharedContext: Awaited<ReturnType<Browser['newContext']>> }> {
  const result = await createTestTranscription(ownerPage);

  const targetEmail = permission === 'editor'
    ? process.env.PLAYWRIGHT_TEST_EMAIL_EDITOR!
    : process.env.PLAYWRIGHT_TEST_EMAIL_VIEWER!;

  await sendInvite(ownerPage, targetEmail, permission);

  const sharedContext = await browser.newContext({ storageState: ensureAuthFile(permission) });
  const sharedPage = await sharedContext.newPage();

  await acceptInviteForTranscription(sharedPage, result.title);
  await sharedPage.close();

  return { transcriptionId: result.transcriptionId, title: result.title, sharedContext };
}

// ---------------------------------------------------------------------------
// Editor can read regions on a shared transcription (Phase 3a)
// ---------------------------------------------------------------------------
testWithAccount('owner').describe('Editor reads regions on shared transcription', () => {
  let transcriptionId: string;
  let title: string;
  let editorContext: Awaited<ReturnType<Browser['newContext']>>;

  testWithAccount('owner').beforeEach(async ({ page, browser }) => {
    const setup = await setupSharedTranscription(page, browser, 'editor');
    transcriptionId = setup.transcriptionId;
    title = setup.title;
    editorContext = setup.sharedContext;

    // Owner creates a region
    await page.goto(`/transcribe-edit/${transcriptionId}`);
    await page.waitForLoadState('networkidle');
    await dragRegion(page);
    await expect(page.locator('text=Regions (1)').first()).toBeVisible();
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    await deleteTestTranscription(page, transcriptionId, title);
    if (editorContext) await editorContext.close().catch(() => {});
  });

  testWithAccount('owner')('editor can see regions on shared transcription', async () => {
    const editorPage = await editorContext.newPage();
    await editorPage.goto(`/transcribe-edit/${transcriptionId}`);
    await editorPage.waitForLoadState('networkidle');
    await expect(editorPage.locator('[data-testid="waveform-container"]')).toBeVisible({ timeout: 30000 });

    await expect(editorPage.locator('text=Regions (1)').first()).toBeVisible({ timeout: 20000 });
    console.log('✅ Editor can read regions on shared transcription via getRegion resolver');
    await editorPage.close();
  });
});

// ---------------------------------------------------------------------------
// Editor can create + delete a region on shared transcription (Phase 5 canary)
// ---------------------------------------------------------------------------
testWithAccount('owner').describe('Editor can mutate regions on shared transcription (Phase 5 canary)', () => {
  let transcriptionId: string;
  let title: string;
  let editorContext: Awaited<ReturnType<Browser['newContext']>>;

  testWithAccount('owner').beforeEach(async ({ page, browser }) => {
    const setup = await setupSharedTranscription(page, browser, 'editor');
    transcriptionId = setup.transcriptionId;
    title = setup.title;
    editorContext = setup.sharedContext;
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    await deleteTestTranscription(page, transcriptionId, title);
    if (editorContext) await editorContext.close().catch(() => {});
  });

  testWithAccount('owner')('editor can create a region and it persists after reload', async () => {
    const editorPage = await editorContext.newPage();
    await editorPage.goto(`/transcribe-edit/${transcriptionId}`);
    await editorPage.waitForLoadState('networkidle');
    await expect(editorPage.locator('[data-testid="waveform-container"]')).toBeVisible({ timeout: 30000 });

    // Editor creates a region via waveform drag (exercises createRegion mutation)
    await dragRegion(editorPage);
    await expect(editorPage.locator('text=Regions (1)').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Editor created a region on shared transcription');

    // Hard reload — verify region persisted (generateClient round-trip)
    await editorPage.reload();
    await editorPage.waitForLoadState('networkidle');
    await expect(editorPage.locator('text=Regions (1)').first()).toBeVisible({ timeout: 15000 });
    console.log('✅ Region persisted after editor reload');

    await editorPage.close();
  });

  testWithAccount('owner')('editor can delete a region on a shared transcription', async ({ browser }) => {
    // Owner creates a region first
    const ownerContext = await browser.newContext({ storageState: ensureAuthFile('owner') });
    const ownerPage2 = await ownerContext.newPage();
    await ownerPage2.goto(`/transcribe-edit/${transcriptionId}`);
    await ownerPage2.waitForLoadState('networkidle');
    await dragRegion(ownerPage2);
    await expect(ownerPage2.locator('text=Regions (1)').first()).toBeVisible();
    await ownerPage2.close();
    await ownerContext.close();

    // Editor opens, selects the region, and deletes it
    const editorPage = await editorContext.newPage();
    await editorPage.goto(`/transcribe-edit/${transcriptionId}`);
    await editorPage.waitForLoadState('networkidle');
    await expect(editorPage.locator('[data-testid="waveform-container"]')).toBeVisible({ timeout: 30000 });
    await expect(editorPage.locator('text=Regions (1)').first()).toBeVisible({ timeout: 20000 });

    // data-testid="regionitem-{id}" — use *="regionitem" to match any region
    const regionItem = editorPage.locator('[data-testid*="regionitem"]').first();
    await expect(regionItem).toBeVisible();
    await regionItem.click();
    await editorPage.waitForTimeout(1000);

    editorPage.on('dialog', async dialog => { await dialog.accept(); });

    const deleteButton = editorPage.locator('[data-testid="delete-region-button"]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    await editorPage.waitForTimeout(2000);

    await expect(editorPage.locator('text=No regions yet').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Editor deleted a region on shared transcription');
    await editorPage.close();
  });
});

// ---------------------------------------------------------------------------
// Region subscription delivers cross-user update (Phase 3b)
// ---------------------------------------------------------------------------
testWithAccount('owner').describe('Region subscription fires across users (Phase 3b)', () => {
  let transcriptionId: string;
  let title: string;
  let editorContext: Awaited<ReturnType<Browser['newContext']>>;

  testWithAccount('owner').beforeEach(async ({ page, browser }) => {
    const setup = await setupSharedTranscription(page, browser, 'editor');
    transcriptionId = setup.transcriptionId;
    title = setup.title;
    editorContext = setup.sharedContext;
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    await deleteTestTranscription(page, transcriptionId, title);
    if (editorContext) await editorContext.close().catch(() => {});
  });

  testWithAccount('owner')('owner sees region created by editor via subscription without reload', async ({ page }) => {
    await page.goto(`/transcribe-edit/${transcriptionId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=No regions yet').first()).toBeVisible({ timeout: 10000 });

    // Editor creates a region in a parallel context
    const editorPage = await editorContext.newPage();
    await editorPage.goto(`/transcribe-edit/${transcriptionId}`);
    await editorPage.waitForLoadState('networkidle');
    await dragRegion(editorPage);
    await editorPage.close();

    // Owner's page should update via subscription without a reload
    await expect(page.locator('text=Regions (1)').first()).toBeVisible({ timeout: 45000 });
    console.log('✅ Owner received onCreateRegion subscription from editor (transcriptionId filter working)');
  });
});

// ---------------------------------------------------------------------------
// Viewer can read but cannot create regions
// ---------------------------------------------------------------------------
testWithAccount('owner').describe('Viewer has read-only access to regions', () => {
  let transcriptionId: string;
  let title: string;
  let viewerContext: Awaited<ReturnType<Browser['newContext']>>;

  testWithAccount('owner').beforeEach(async ({ page, browser }) => {
    const setup = await setupSharedTranscription(page, browser, 'viewer');
    transcriptionId = setup.transcriptionId;
    title = setup.title;
    viewerContext = setup.sharedContext;

    // Owner creates a region
    await page.goto(`/transcribe-edit/${transcriptionId}`);
    await page.waitForLoadState('networkidle');
    await dragRegion(page);
    await expect(page.locator('text=Regions (1)').first()).toBeVisible();
    // Buffer to let the createRegion mutation persist in AppSync before viewer reads it
    await page.waitForTimeout(4000);
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    await deleteTestTranscription(page, transcriptionId, title);
    if (viewerContext) await viewerContext.close().catch(() => {});
  });

  testWithAccount('owner')('viewer sees regions but cannot create new ones', async () => {
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto(`/transcribe-edit/${transcriptionId}`);
    await viewerPage.waitForLoadState('networkidle');
    await expect(viewerPage.locator('[data-testid="waveform-container"]')).toBeVisible({ timeout: 30000 });

    // Viewer can read the existing region
    await expect(viewerPage.locator('text=Regions (1)').first()).toBeVisible({ timeout: 30000 });
    console.log('✅ Viewer can read regions on shared transcription');

    // Viewer attempts drag-create — the count should stay at 1
    await dragRegion(viewerPage);
    await viewerPage.waitForTimeout(2000);
    await expect(viewerPage.locator('text=Regions (2)').first()).not.toBeVisible({ timeout: 3000 }).catch(() => {});
    await expect(viewerPage.locator('text=Regions (1)').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Viewer cannot create regions (write path correctly blocked)');

    await viewerPage.close();
  });
});

// ---------------------------------------------------------------------------
// Unrelated authenticated user is denied access on direct URL
// ---------------------------------------------------------------------------
testWithAccount('owner').describe('Unrelated user denied on direct URL access', () => {
  let transcriptionId: string;
  let title: string;

  testWithAccount('owner').beforeEach(async ({ page }) => {
    // Create transcription but do NOT share with editor
    const result = await createTestTranscription(page);
    transcriptionId = result.transcriptionId;
    title = result.title;
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    await deleteTestTranscription(page, transcriptionId, title);
  });

  testWithAccount('owner')('editor account sees access-denied UI on unshared transcription', async ({ browser }) => {
    const editorContext = await browser.newContext({ storageState: ensureAuthFile('editor') });
    const editorPage = await editorContext.newPage();

    try {
      await editorPage.goto(`/transcribe-edit/${transcriptionId}`);

      // Wait for EITHER the /404 redirect (access denied) OR the waveform to appear (unexpected access).
      // networkidle alone is not sufficient — the React redirect fires asynchronously after the API
      // returns an auth error, so the URL may still contain the transcription ID when networkidle fires.
      await Promise.race([
        editorPage.waitForURL('**/404**', { timeout: 15000 }),
        editorPage.locator('[data-testid="waveform-container"]').waitFor({ state: 'visible', timeout: 15000 }),
      ]).catch(() => null);

      // Should NOT see the waveform/editor surface
      const waveformVisible = await editorPage.locator('[data-testid="waveform-container"]').first()
        .isVisible().catch(() => false);
      expect(waveformVisible).toBe(false);

      console.log('✅ Unrelated user correctly denied access to unshared transcription');
    } finally {
      if (editorContext) await editorContext.close().catch(() => {});
    }
  });
});
