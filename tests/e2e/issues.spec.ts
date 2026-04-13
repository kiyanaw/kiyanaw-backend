/**
 * Issues + Comments coverage
 *
 * Validates Phase 4 of the security remediation:
 *  - Owner creates issue on a region → visible in IssuesPanel after reload
 *  - Issue visible to shared editor in IssuesPanel
 *  - Comment round-trip on an issue via IssueDetailsDialog
 *
 * NOTE: IssueBrowserPage (/issue-browser) is a dev tool with hardcoded mock data.
 * These tests exercise the real UI paths in the editor's IssuesPanel instead.
 *
 * Creating an issue requires:
 *   1. Drag a region on the waveform
 *   2. Click the region item to open the RegionEditor
 *   3. Type text in the Quill editor (data-testid="region-editor-main" .ql-editor)
 *   4. Select all text (Ctrl+A)
 *   5. Click data-testid="create-issue-button" (enabled when text is selected)
 *
 * IMPORTANT: The app currently filters with `_deleted: { ne: true }` in issueService.ts.
 * After Phase 1d this field is removed — if these tests go red after that phase, check for
 * `_deleted` references in issueService.ts / commentService.ts first.
 */
import { testWithAccount, expect } from '../../playwright/fixtures';
import { createTestTranscription, deleteTestTranscription, dragRegion, sendInvite, acceptInviteForTranscription, ensureAuthFile } from './helpers';
import type { Browser, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared helper: create region + issue
// Caller must already be on the editor page for the transcription.
// ---------------------------------------------------------------------------
async function createRegionAndIssue(page: Page): Promise<void> {
  // 1. Create region via waveform drag
  await dragRegion(page);
  await expect(page.locator('text=Regions (1)').first()).toBeVisible();

  // 2. Click the region item to open the RegionEditor
  const regionItem = page.locator('[data-testid*="regionitem"]').first();
  await expect(regionItem).toBeVisible();
  await regionItem.click();
  await page.waitForTimeout(1000);

  // 3. Type text in the Quill editor
  const quillEditor = page.locator('[data-testid="region-editor-main"] .ql-editor').first();
  await expect(quillEditor).toBeVisible({ timeout: 5000 });
  await quillEditor.click();
  await page.keyboard.type('test issue text');
  await page.waitForTimeout(500);

  // 4. Select all text so the create-issue button becomes enabled
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(500);

  // 5. Click the create-issue button (AlertTriangle icon, enabled when text is selected)
  const createIssueButton = page.locator('[data-testid="create-issue-button"]');
  await expect(createIssueButton).toBeEnabled({ timeout: 5000 });
  await createIssueButton.click();
  await page.waitForTimeout(2000);
}

// ---------------------------------------------------------------------------
// Shared helper: set up a transcription shared with editor and accepted
// ---------------------------------------------------------------------------
async function setupSharedWithEditor(
  ownerPage: Page,
  browser: Browser,
): Promise<{ transcriptionId: string; title: string; editorContext: Awaited<ReturnType<Browser['newContext']>> }> {
  const result = await createTestTranscription(ownerPage);
  await sendInvite(ownerPage, process.env.PLAYWRIGHT_TEST_EMAIL_EDITOR!, 'editor');

  const editorContext = await browser.newContext({ storageState: ensureAuthFile('editor') });
  const editorPage = await editorContext.newPage();
  await acceptInviteForTranscription(editorPage, result.title);
  await editorPage.close();

  return { transcriptionId: result.transcriptionId, title: result.title, editorContext };
}

// ---------------------------------------------------------------------------
// Owner creates issue, sees it in IssuesPanel after reload
// ---------------------------------------------------------------------------
testWithAccount('owner').describe('Owner issue visible in IssuesPanel after reload', () => {
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

  testWithAccount('owner')('owner creates an issue and sees it in the IssuesPanel after reload', async ({ page }) => {
    await createRegionAndIssue(page);

    // IssuesPanel header shows "Issues (1)"
    await expect(page.locator('text=Issues (1)').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Issue visible in IssuesPanel immediately after creation');

    // Hard reload — issue should persist via listIssues/issuesByTranscription resolver
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Re-select the region to see the issues panel
    const regionItem = page.locator('[data-testid*="regionitem"]').first();
    await expect(regionItem).toBeVisible({ timeout: 15000 });
    await regionItem.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Issues (1)').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Issue persisted and visible in IssuesPanel after hard reload');
  });
});

// ---------------------------------------------------------------------------
// Issue visible to editor on shared transcription
// ---------------------------------------------------------------------------
testWithAccount('owner').describe('Issue visible to editor on shared transcription', () => {
  let transcriptionId: string;
  let title: string;
  let editorContext: Awaited<ReturnType<Browser['newContext']>>;

  testWithAccount('owner').beforeEach(async ({ page, browser }) => {
    const setup = await setupSharedWithEditor(page, browser);
    transcriptionId = setup.transcriptionId;
    title = setup.title;
    editorContext = setup.editorContext;
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    await deleteTestTranscription(page, transcriptionId, title);
    if (editorContext) await editorContext.close().catch(() => {});
  });

  testWithAccount('owner')('editor sees issue created by owner in IssuesPanel', async ({ page }) => {
    // Owner creates region + issue
    await page.goto(`/transcribe-edit/${transcriptionId}`);
    await page.waitForLoadState('networkidle');
    await createRegionAndIssue(page);
    await expect(page.locator('text=Issues (1)').first()).toBeVisible({ timeout: 10000 });

    // Editor opens the transcription — wait past the "Loading transcription..." spinner
    const editorPage = await editorContext.newPage();
    await editorPage.goto(`/transcribe-edit/${transcriptionId}`);
    await editorPage.waitForLoadState('networkidle');
    await expect(editorPage.locator('[data-testid="waveform-container"]')).toBeVisible({ timeout: 30000 });

    // Editor sees the region
    await expect(editorPage.locator('text=Regions (1)').first()).toBeVisible({ timeout: 20000 });

    // Editor selects the region to see the IssuesPanel
    const regionItem = editorPage.locator('[data-testid*="regionitem"]').first();
    await expect(regionItem).toBeVisible();
    await regionItem.click();
    await editorPage.waitForTimeout(1000);

    // Editor should see Issues (1) in the IssuesPanel
    await expect(editorPage.locator('text=Issues (1)').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Issue created by owner is visible to editor in IssuesPanel');

    await editorPage.close();
  });
});

// ---------------------------------------------------------------------------
// Comment round-trip on an issue
// ---------------------------------------------------------------------------
testWithAccount('owner').describe('Comment round-trip on an issue', () => {
  let transcriptionId: string;
  let title: string;
  let editorContext: Awaited<ReturnType<Browser['newContext']>>;

  testWithAccount('owner').beforeEach(async ({ page, browser }) => {
    const setup = await setupSharedWithEditor(page, browser);
    transcriptionId = setup.transcriptionId;
    title = setup.title;
    editorContext = setup.editorContext;
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    await deleteTestTranscription(page, transcriptionId, title);
    if (editorContext) await editorContext.close().catch(() => {});
  });

  testWithAccount('owner')('owner posts comment; editor sees it after reload', async ({ page }) => {
    // Owner creates region + issue
    await page.goto(`/transcribe-edit/${transcriptionId}`);
    await page.waitForLoadState('networkidle');
    await createRegionAndIssue(page);
    await expect(page.locator('text=Issues (1)').first()).toBeVisible({ timeout: 10000 });

    // Owner opens the issue details dialog by clicking the issue item
    const issueItem = page.locator('[data-testid="issue-item-open-dialog"]').first();
    await expect(issueItem).toBeVisible();
    await issueItem.click();
    await page.waitForTimeout(1000);

    // Owner posts a comment
    const commentInput = page.locator('[data-testid="comment-input"]').first();
    await expect(commentInput).toBeVisible({ timeout: 5000 });
    const commentText = `Test comment ${Date.now()}`;
    await commentInput.fill(commentText);

    const submitButton = page.locator('[data-testid="submit-comment"]').first();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Owner sees comment immediately
    await expect(page.locator(`[data-testid="comment-item"]:has-text("${commentText}")`).first())
      .toBeVisible({ timeout: 5000 });
    console.log('✅ Owner comment visible immediately after posting');

    // Editor opens the transcription — wait past the "Loading transcription..." spinner
    const editorPage = await editorContext.newPage();
    await editorPage.goto(`/transcribe-edit/${transcriptionId}`);
    await editorPage.waitForLoadState('networkidle');
    await expect(editorPage.locator('[data-testid="waveform-container"]')).toBeVisible({ timeout: 30000 });

    await expect(editorPage.locator('text=Regions (1)').first()).toBeVisible({ timeout: 20000 });
    const regionItem = editorPage.locator('[data-testid*="regionitem"]').first();
    await expect(regionItem).toBeVisible();
    await regionItem.click();
    await editorPage.waitForTimeout(1000);

    await expect(editorPage.locator('text=Issues (1)').first()).toBeVisible({ timeout: 10000 });
    const issueItemEditor = editorPage.locator('[data-testid="issue-item-open-dialog"]').first();
    await expect(issueItemEditor).toBeVisible();
    await issueItemEditor.click();
    await editorPage.waitForTimeout(1000);

    // Editor sees the comment posted by owner
    await expect(editorPage.locator(`[data-testid="comment-item"]:has-text("${commentText}")`).first())
      .toBeVisible({ timeout: 20000 });
    console.log('✅ Owner comment visible to editor via commentsByTranscription / listComments resolver');

    await editorPage.close();
  });
});
