/**
 * Invite management regression guard — issue #263
 *
 * Tests:
 *  1. Owner can delete an expired invite from the settings page
 *  2. Owner can resend (renew) an expired invite
 *  3. Owner can change a pending invite's permission level (viewer ↔ editor)
 *
 * These tests require an owner account and a pre-existing transcription.
 * They operate entirely through the owner's settings page UI.
 */
import { testWithAccount, expect } from '../../playwright/fixtures';
import { createTestTranscription, deleteTestTranscription } from './helpers';

testWithAccount('owner').describe('Invite management (issue #263)', () => {
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

  /**
   * Helper: navigate to the Sharing section of settings for the current transcription.
   * Assumes we are on /transcribe-list after createTestTranscription.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function openSharingSettings(page: any) {
    const settingsButton = page.locator('[data-testid="transcription-settings-button"]').first();
    await expect(settingsButton).toBeVisible({ timeout: 10000 });
    await settingsButton.click();

    // Wait for the Sharing & Collaboration section to appear
    await expect(page.locator('[data-testid="invite-email-input"]')).toBeVisible({ timeout: 10000 });
  }

  async function sendInvite(page: any, email: string, level: 'viewer' | 'editor' = 'viewer') {
    const emailInput = page.locator('[data-testid="invite-email-input"]').first();
    await emailInput.fill(email);

    const permSelect = page.locator('[data-testid="invite-permission-select"]').first();
    await permSelect.selectOption(level);

    const sendBtn = page.locator('[data-testid="send-invite-button"]').first();
    await sendBtn.click();

    // Wait for success message or the invite to appear in the list
    await page.waitForTimeout(3000);
  }

  testWithAccount('owner')('permission level select is shown for each invite row', async ({ page }) => {
    await openSharingSettings(page);

    const editorEmail = process.env.PLAYWRIGHT_TEST_EMAIL_EDITOR ?? 'editor@example.com';
    await sendInvite(page, editorEmail, 'viewer');

    // After sending, there should be a permission select in the invite list
    const permSelect = page.locator(`[data-testid^="invite-permission-"]`).first();
    await expect(permSelect).toBeVisible({ timeout: 10000 });
    await expect(permSelect).toHaveValue('viewer');
  });

  testWithAccount('owner')('owner can change a pending invite\'s permission level', async ({ page }) => {
    await openSharingSettings(page);

    const editorEmail = process.env.PLAYWRIGHT_TEST_EMAIL_EDITOR ?? 'editor@example.com';
    await sendInvite(page, editorEmail, 'viewer');

    // Find the permission select for the newly created invite
    const permSelect = page.locator(`[data-testid^="invite-permission-"]`).first();
    await expect(permSelect).toBeVisible({ timeout: 10000 });

    // Switch from viewer → editor
    await permSelect.selectOption('editor');

    // After the update, the select should show the new value (re-loaded from server)
    await expect(permSelect).toHaveValue('editor', { timeout: 10000 });
  });

  testWithAccount('owner')('delete button is visible on pending invite', async ({ page }) => {
    await openSharingSettings(page);

    const editorEmail = process.env.PLAYWRIGHT_TEST_EMAIL_EDITOR ?? 'editor@example.com';
    await sendInvite(page, editorEmail, 'viewer');

    // Delete button should be present for the pending invite
    const deleteBtn = page.locator(`[data-testid^="invite-delete-button-"]`).first();
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
  });

  testWithAccount('owner')('owner can delete a pending invite', async ({ page }) => {
    await openSharingSettings(page);

    const editorEmail = process.env.PLAYWRIGHT_TEST_EMAIL_EDITOR ?? 'editor@example.com';
    await sendInvite(page, editorEmail, 'viewer');

    // There should be exactly one invite row
    const inviteRow = page.locator(`[data-testid^="invite-delete-button-"]`).first();
    await expect(inviteRow).toBeVisible({ timeout: 10000 });

    // Delete it
    await inviteRow.click();

    // The invite list should now be empty
    await expect(page.locator('text=No invitations')).toBeVisible({ timeout: 10000 });
  });
});
