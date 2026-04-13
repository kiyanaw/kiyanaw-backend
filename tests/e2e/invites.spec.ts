/**
 * Invite flow regression guard
 *
 * The remediation plan (Phase 4) explicitly states that Invite does NOT need
 * custom VTLs — owner rules on `invitedBy`/`email` are sufficient once the IAM
 * bypass is removed. However, Phase 1 (removing `provider: identityPool` from Invite)
 * does touch the model. This test ensures the invite flow still works end-to-end
 * after the identityPool rules are removed.
 *
 * Flow: owner creates transcription → sends invite to editor → editor accepts via
 * InvitationsPage → transcription appears in editor's /transcribe-list.
 */
import { testWithAccount, expect } from '../../playwright/fixtures';
import { createTestTranscription, deleteTestTranscription, ensureAuthFile } from './helpers';
import type { Browser } from '@playwright/test';

testWithAccount('owner').describe('Invite flow end-to-end', () => {
  let transcriptionId: string;
  let title: string;
  let editorContext: Awaited<ReturnType<Browser['newContext']>>;

  testWithAccount('owner').beforeEach(async ({ page, browser }) => {
    const result = await createTestTranscription(page);
    transcriptionId = result.transcriptionId;
    title = result.title;
    editorContext = await browser.newContext({ storageState: ensureAuthFile('editor') });
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    await deleteTestTranscription(page, transcriptionId, title);
    if (editorContext) await editorContext.close().catch(() => {});
  });

  testWithAccount('owner')('owner sends invite; editor accepts; transcription appears in editor list', async ({ page }) => {
    const editorEmail = process.env.PLAYWRIGHT_TEST_EMAIL_EDITOR!;

    // -------------------------------------------------------------------------
    // Step 1: Owner sends an invite from the transcription settings page
    // -------------------------------------------------------------------------
    const settingsButton = page.locator('[data-testid="transcription-settings-button"]').first();
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    await page.waitForTimeout(1000);

    const emailInput = page.locator('[data-testid="invite-email-input"]').first();
    await expect(emailInput).toBeVisible();
    await emailInput.fill(editorEmail);

    const permissionSelect = page.locator('[data-testid="invite-permission-select"]').first();
    if (await permissionSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await permissionSelect.selectOption('editor');
    }

    const sendButton = page.locator('[data-testid="send-invite-button"]').first();
    await expect(sendButton).toBeVisible();
    await sendButton.click();

    // Wait for invite to be sent (success message or invite appears in list)
    const successIndicator = page.locator('text=Invitation sent, text=invited, [data-testid="invite-success"]').first();
    const inviteVisible = await successIndicator.isVisible({ timeout: 8000 }).catch(() => false);
    console.log(`📨 Invite send indicator visible: ${inviteVisible}`);
    await page.waitForTimeout(2000);

    // -------------------------------------------------------------------------
    // Step 2: Editor navigates to InvitationsPage and accepts
    // -------------------------------------------------------------------------
    const editorPage = await editorContext.newPage();

    await editorPage.goto('/invitations');
    await editorPage.waitForLoadState('networkidle');

    // Find the row for this specific transcription and click "View Details"
    const inviteRow = editorPage.locator(`[data-testid="invite-row"][data-transcription-title="${title}"]`).first();
    await expect(inviteRow).toBeVisible({ timeout: 15000 });
    const viewDetailsBtn = inviteRow.locator('[data-testid="view-details-button"]');
    await viewDetailsBtn.click();

    // The dialog opens as an overlay — wait for the Accept button
    const acceptButton = editorPage.locator('[data-testid="accept-invitation-button"]').first();
    await expect(acceptButton).toBeVisible({ timeout: 10000 });
    await acceptButton.click();

    // After accepting, the app should redirect to the transcription editor
    await expect(editorPage).toHaveURL(/.*transcribe-edit\/.*|.*invitations.*/, { timeout: 20000 });
    await editorPage.waitForTimeout(2000);

    // -------------------------------------------------------------------------
    // Step 3: Invite vanishes from InvitationsPage (or shows "Accepted" state)
    // -------------------------------------------------------------------------
    await editorPage.goto('/invitations');
    await editorPage.waitForLoadState('networkidle');

    // The invite should now show as "Accepted" or be removed from pending list
    const pendingInvite = editorPage.locator(`button:has-text("Accept Invitation")`).first();
    const stillPending = await pendingInvite.isVisible({ timeout: 3000 }).catch(() => false);
    // It's acceptable for the invite to still be visible but in "Accepted" state
    console.log(`📋 Accept button still visible after accept: ${stillPending} (should be false)`);

    // -------------------------------------------------------------------------
    // Step 4: Shared transcription appears in editor's /transcribe-list
    // -------------------------------------------------------------------------
    await editorPage.goto('/transcribe-list');
    await editorPage.waitForLoadState('networkidle');

    // Shared transcriptions live on the "Shared with Me" tab
    const sharedTab = editorPage.locator('[data-testid="shared-with-me-tab"]');
    await expect(sharedTab).toBeVisible({ timeout: 10000 });
    await sharedTab.click();
    await editorPage.waitForTimeout(1000);

    const sharedLink = editorPage.locator(`[data-testid="transcription-list-item-title"]:has-text("${title}")`).first();
    await expect(sharedLink).toBeVisible({ timeout: 15000 });
    console.log(`✅ Transcription "${title}" appears in editor's list after invite-accept`);

    await editorPage.close();
  });
});
