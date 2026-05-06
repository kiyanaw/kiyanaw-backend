/**
 * Shared helpers for Playwright E2E tests.
 * Extracted from transcription.spec.ts so all specs can reuse core flows.
 */
import type { Page } from '@playwright/test';

import { expect, ensureAuthFile } from '../../playwright/fixtures';
export { ensureAuthFile };

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TEST_AUDIO_PATH = path.join(__dirname, '../fixtures/test_mp3.mp3');

// ---------------------------------------------------------------------------
// Transcription lifecycle
// ---------------------------------------------------------------------------

export async function createTestTranscription(page: Page): Promise<{ transcriptionId: string; title: string }> {
  await page.goto('/transcribe-list');
  await page.waitForLoadState('networkidle');

  const addButton = page.locator('a:has-text("Add New"), button:has-text("Add New")').first();
  await expect(addButton).toBeVisible({ timeout: 15000 });
  await addButton.click();

  const title = `Test Transcription ${Date.now()}`;
  const titleInput = page.locator('input#title, input[name="title"]').first();
  await expect(titleInput).toBeVisible();
  await titleInput.fill(title);

  const fileInput = page.locator('input#file, input[type="file"]');
  await expect(fileInput).toBeVisible();
  await fileInput.setInputFiles(TEST_AUDIO_PATH);

  const uploadButton = page.locator('button:has-text("Upload")').first();
  await expect(uploadButton).toBeEnabled();
  await uploadButton.click();

  await expect(page).toHaveURL(/.*transcribe-edit\/.*/, { timeout: 120000 });

  const editorUrl = page.url();
  const urlMatch = editorUrl.match(/\/transcribe-edit\/([^/?]+)/);
  if (!urlMatch) throw new Error(`Could not extract transcription ID from URL: ${editorUrl}`);
  const transcriptionId = urlMatch[1];

  await expect(page.locator('[data-testid="waveform-container"]').first()).toBeVisible({ timeout: 30000 });

  return { transcriptionId, title };
}

export async function deleteTestTranscription(page: Page, transcriptionId: string, title: string): Promise<void> {
  try {
    await page.goto(`/transcribe-edit/${transcriptionId}`);
    await page.waitForLoadState('networkidle');

    const settingsButton = page.locator('[data-testid="transcription-settings-button"]').first();
    if (!(await settingsButton.isVisible({ timeout: 5000 }).catch(() => false))) return;
    await settingsButton.click();
    await page.waitForTimeout(1000);

    const deleteButton = page.locator('[data-testid="delete-transcription-button"]').first();
    if (!(await deleteButton.isVisible({ timeout: 5000 }).catch(() => false))) return;
    await deleteButton.click();
    await page.waitForTimeout(1000);

    const confirmInput = page.locator('[data-testid="delete-confirm-input"]').first();
    if (!(await confirmInput.isVisible({ timeout: 5000 }).catch(() => false))) return;
    await confirmInput.fill('delete forever');
    await page.waitForTimeout(500);

    const deleteForeverButton = page.locator('[data-testid="delete-forever-button"]').first();
    if (!(await deleteForeverButton.isVisible({ timeout: 5000 }).catch(() => false))) return;
    await deleteForeverButton.click();
    await page.waitForTimeout(2000);

    await page.goto('/transcribe-list');
    await page.waitForLoadState('networkidle');
    const isStillVisible = await page.locator(`a:has-text("${title}")`).first().isVisible({ timeout: 5000 }).catch(() => false);
    if (isStillVisible) {
      console.warn(`⚠️ Transcription "${title}" may still be visible after deletion`);
    }
  } catch (error) {
    console.warn(`⚠️ Failed to clean up transcription ${transcriptionId}:`, error);
  }
}

// ---------------------------------------------------------------------------
// Region helpers
// ---------------------------------------------------------------------------

/**
 * Creates a region by clicking and dragging on the waveform container.
 * Assumes the caller is already on the editor page with the waveform loaded.
 */
export async function dragRegion(page: Page): Promise<void> {
  const waveformContainer = page.locator('[data-testid="waveform-container"]');
  await expect(waveformContainer).toBeVisible();

  const box = await waveformContainer.boundingBox();
  if (!box) throw new Error('Could not get waveform container bounding box');

  const startX = box.x + 100;
  const centerY = box.y + box.height / 2;
  const endX = box.x + 200;

  await page.mouse.move(startX, centerY);
  await page.mouse.down();
  await page.mouse.move(endX, centerY);
  await page.mouse.up();

  await page.waitForTimeout(2000);
}

/**
 * Waits for the "Loading audio..." overlay to disappear, meaning wavesurfer has
 * finished decoding audio and region items are interactive (not disabled).
 */
export async function waitForAudioReady(page: Page, timeout = 20000): Promise<void> {
  await page.locator('text=Loading audio...').first().waitFor({ state: 'hidden', timeout });
}

// ---------------------------------------------------------------------------
// Sharing helpers
// ---------------------------------------------------------------------------

export type PermissionLevel = 'editor' | 'viewer';

/**
 * Opens the transcription settings and sends an invite to the given email.
 * Caller must already be on the editor page for the transcription.
 */
export async function sendInvite(page: Page, email: string, permission: PermissionLevel = 'editor'): Promise<void> {
  const settingsButton = page.locator('[data-testid="transcription-settings-button"]').first();
  await expect(settingsButton).toBeVisible();
  await settingsButton.click();
  await page.waitForTimeout(1000);

  const emailInput = page.locator('[data-testid="invite-email-input"]').first();
  await expect(emailInput).toBeVisible();
  await emailInput.fill(email);

  const permissionSelect = page.locator('[data-testid="invite-permission-select"]').first();
  if (await permissionSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await permissionSelect.selectOption(permission);
  }

  const sendButton = page.locator('[data-testid="send-invite-button"]').first();
  await expect(sendButton).toBeVisible();
  await sendButton.click();
  await page.waitForTimeout(2000);
}

/**
 * Navigates to InvitationsPage and accepts the pending invite for a specific transcription title.
 * Caller must already be authenticated as the invitee.
 *
 * Uses data-testid="invite-row" with data-transcription-title attribute to find the correct row,
 * then clicks "View Details" to open the dialog and "Accept Invitation" to accept.
 */
export async function acceptInviteForTranscription(page: Page, transcriptionTitle: string): Promise<void> {
  await page.goto('/invitations');
  await page.waitForLoadState('networkidle');

  const inviteRow = page.locator(`[data-testid="invite-row"][data-transcription-title="${transcriptionTitle}"]`).first();
  await expect(inviteRow).toBeVisible({ timeout: 15000 });
  await inviteRow.locator('[data-testid="view-details-button"]').click();

  const acceptButton = page.locator('[data-testid="accept-invitation-button"]');
  await expect(acceptButton).toBeVisible({ timeout: 10000 });
  await acceptButton.click();
  await page.waitForTimeout(2000);
}
