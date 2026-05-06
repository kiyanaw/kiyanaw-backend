/**
 * E2E tests for the Lakota keyboard layout bug (issue #245).
 *
 * Bug: On macOS with the RCLakota keyboard layout, pressing Shift+6 (the compose
 * key) followed by a letter deletes all text in the region editor instead of
 * inserting the diacritical character (á é í ó ú ŋ ǧ š ȟ ž č).
 *
 * Root cause: Quill's composition module emits COMPOSITION_BEFORE_START when the
 * browser fires compositionstart. Quill's Input module responds by calling
 * handleCompositionStart(), which calls replaceText(range). If the editor has a
 * non-zero selection at that moment (range.length > 0) — which macOS can produce
 * as part of dead-key processing — replaceText calls deleteRange() on it, wiping
 * however much text was selected.
 *
 * These tests reproduce the behaviour by:
 *   1. Using window.debugEditors (exposed by rteService) to set Quill's internal
 *      selection to span the full text, so range.length > 0 when composition fires.
 *   2. Dispatching compositionstart on a CHILD element of .ql-editor, so
 *      scroll.find(event.target) resolves a real blot and Quill processes the event.
 */

import { testWithAccount, expect } from '../../playwright/fixtures';
import { createTestTranscription, deleteTestTranscription, dragRegion, waitForAudioReady } from './helpers';

const LAKOTA_CHARS = ['á', 'é', 'í', 'ó', 'ú', 'ŋ', 'ǧ', 'š', 'ȟ', 'ž', 'č'] as const;

testWithAccount('owner').describe('Lakota Keyboard Layout (issue #245)', () => {
  let createdTranscriptionId: string | null = null;
  let testTitle: string | null = null;

  testWithAccount('owner').beforeEach(async ({ page }) => {
    const result = await createTestTranscription(page);
    createdTranscriptionId = result.transcriptionId;
    testTitle = result.title;
  });

  testWithAccount('owner').afterEach(async ({ page }) => {
    if (!createdTranscriptionId || !testTitle) return;
    await deleteTestTranscription(page, createdTranscriptionId, testTitle);
    createdTranscriptionId = null;
    testTitle = null;
  });

  // ---------------------------------------------------------------------------
  // Helper: open the first region editor and return a locator for .ql-editor
  // ---------------------------------------------------------------------------
  async function openRegionEditor(page: Parameters<typeof dragRegion>[0]) {
    await dragRegion(page);
    await expect(page.locator('text=Regions (1)').first()).toBeVisible({ timeout: 15000 });
    await waitForAudioReady(page);

    const regionItem = page.locator('[data-testid*="regionitem"], [id*="regionitem"]').first();
    await expect(regionItem).toBeVisible();
    await regionItem.click();
    await page.waitForTimeout(500);

    const editor = page.locator('[data-testid="region-editor-main"] .ql-editor').first();
    await expect(editor).toBeVisible();
    return editor;
  }

  // ---------------------------------------------------------------------------
  // Test 1: Typing Lakota diacritical characters should NOT wipe existing text
  //
  // This tests the happy path: characters reached via normal typing (without
  // going through a compose key sequence) must not cause deletion.
  // ---------------------------------------------------------------------------
  testWithAccount('owner')('typing Lakota diacritical characters preserves existing text', async ({ page }) => {
    await expect(page).toHaveURL(/.*transcribe-edit\/.*/);
    const editor = await openRegionEditor(page);

    for (const char of LAKOTA_CHARS) {
      // Fresh slate for each character
      await page.evaluate(() => {
        const key = Object.keys((window as any).debugEditors ?? {}).find((k: string) => k.endsWith(':main'));
        if (key) (window as any).debugEditors[key].setText('hello ');
      });
      await editor.click();

      await page.keyboard.type(char);

      const content = (await editor.textContent()) ?? '';
      expect(content, `Typing "${char}" deleted existing text`).toContain('hello');
    }
  });

  // ---------------------------------------------------------------------------
  // Test 2: compositionstart with a non-zero Quill selection must NOT delete content
  //
  // This is the exact code path triggered by the RCLakota dead key (Shift+6).
  // On macOS, pressing a dead key causes the browser to fire compositionstart
  // while the selection may cover existing text. Quill's handleCompositionStart
  // calls replaceText(range), which calls deleteRange() when text='', wiping
  // the selected content.
  //
  // We use window.debugEditors to set Quill's internal selection (not just the
  // DOM selection), and dispatch compositionstart on a child node so that
  // scroll.find(event.target) resolves a real blot and the event is processed.
  // ---------------------------------------------------------------------------
  testWithAccount('owner')('compositionstart with full-text Quill selection does not delete editor content', async ({ page }) => {
    await expect(page).toHaveURL(/.*transcribe-edit\/.*/);
    const editor = await openRegionEditor(page);

    const initialText = 'wičháša';

    // Seed content and set Quill's selection to span all of it via debugEditors
    const textLength = await page.evaluate((text: string) => {
      const key = Object.keys((window as any).debugEditors ?? {}).find((k: string) => k.endsWith(':main'));
      if (!key) throw new Error('No main editor found in window.debugEditors');
      const quill = (window as any).debugEditors[key];
      quill.setText(text);
      // Select all text — this is what macOS sets up before compositionstart fires
      quill.setSelection(0, text.length);
      return text.length;
    }, initialText);

    expect(textLength).toBeGreaterThan(0);

    // Dispatch compositionstart on a <p> child of .ql-editor so scroll.find()
    // resolves a real blot and Quill's composition module processes the event
    await page.evaluate(() => {
      const editorEl = document.querySelector('[data-testid="region-editor-main"] .ql-editor');
      if (!editorEl) throw new Error('Editor element not found');

      // Target a child node (the <p> paragraph), not the editor root itself.
      // Quill's scroll.find(event.target) must resolve a non-Embed blot for the
      // COMPOSITION_BEFORE_START event to be emitted.
      const target = editorEl.querySelector('p') ?? editorEl.firstChild ?? editorEl;

      target.dispatchEvent(new CompositionEvent('compositionstart', {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: '',
      }));
    });

    await page.waitForTimeout(100);

    const contentAfter = (await editor.textContent()) ?? '';
    expect(
      contentAfter,
      'compositionstart with non-zero selection deleted the editor content (bug #245 reproduced)',
    ).toContain(initialText);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Full compose-key event sequence preserves existing text
  //
  // Simulates the complete RCLakota keyboard flow:
  //   compositionstart → compositionupdate (dead char) →
  //   compositionupdate (final char) → compositionend
  //
  // We set Quill's selection to span existing text first, matching the macOS
  // dead-key scenario where the selection covers the composition context.
  // ---------------------------------------------------------------------------
  testWithAccount('owner')('full composition event sequence (dead key + letter) preserves existing text', async ({ page }) => {
    await expect(page).toHaveURL(/.*transcribe-edit\/.*/);
    const editor = await openRegionEditor(page);

    const initialText = 'tȟatȟáŋka ';

    await page.evaluate((text: string) => {
      const key = Object.keys((window as any).debugEditors ?? {}).find((k: string) => k.endsWith(':main'));
      if (!key) throw new Error('No main editor found in window.debugEditors');
      const quill = (window as any).debugEditors[key];
      quill.setText(text);
      quill.setSelection(text.length, 0); // cursor at end, no selection
    }, initialText);

    // Simulate the full dead-key composition sequence for 'á' (Shift+6 then 'a')
    await page.evaluate(() => {
      const editorEl = document.querySelector('[data-testid="region-editor-main"] .ql-editor');
      if (!editorEl) throw new Error('Editor element not found');
      const target = editorEl.querySelector('p') ?? editorEl.firstChild ?? editorEl;

      const fire = (type: string, init: CompositionEventInit) =>
        target.dispatchEvent(new CompositionEvent(type, { bubbles: true, cancelable: true, composed: true, ...init }));

      // Shift+6 pressed — dead key begins, compositionstart fires
      fire('compositionstart', { data: '' });
      fire('compositionupdate', { data: '^' });
      // 'a' pressed — resolves to 'á'
      fire('compositionupdate', { data: 'á' });
      fire('compositionend', { data: 'á' });
    });

    await page.waitForTimeout(100);

    const finalContent = (await editor.textContent()) ?? '';
    expect(
      finalContent,
      'Composition event sequence deleted existing text (bug #245)',
    ).toContain(initialText.trim());
  });

  // ---------------------------------------------------------------------------
  // Test 4: Shift+6 key press does not delete editor content
  //
  // Playwright fires a real browser keydown event for Shift+6 (key="^"). This
  // guards against any Quill keyboard binding or beforeinput handler that might
  // misinterpret the compose key and delete content.
  // ---------------------------------------------------------------------------
  testWithAccount('owner')('pressing Shift+6 (the compose key) does not delete editor content', async ({ page }) => {
    await expect(page).toHaveURL(/.*transcribe-edit\/.*/);
    const editor = await openRegionEditor(page);

    const initialText = 'čhaŋwápȟe';
    await page.evaluate((text: string) => {
      const key = Object.keys((window as any).debugEditors ?? {}).find((k: string) => k.endsWith(':main'));
      if (!key) throw new Error('No main editor found in window.debugEditors');
      (window as any).debugEditors[key].setText(text);
    }, initialText);

    await editor.click();

    // Press Shift+6 — this is the compose key on the RCLakota keyboard
    await page.keyboard.press('Shift+6');

    await page.waitForTimeout(100);

    const textAfter = (await editor.textContent()) ?? '';
    expect(textAfter, 'Shift+6 deleted editor content').toContain(initialText);
  });
});
