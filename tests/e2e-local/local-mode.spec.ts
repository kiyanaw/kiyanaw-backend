import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../../dist');
const AUDIO = path.resolve(__dirname, '../fixtures/test_mp3.mp3');
// Set LOCAL_E2E_BASE_URL (e.g. http://localhost:5199) to smoke-test a running dev server instead of dist/.
const DEV_URL = process.env.LOCAL_E2E_BASE_URL;
const ORIGIN = DEV_URL ? new URL(DEV_URL).origin : 'https://transcribe.local.test';

/**
 * Local mode keeps work in on-device storage, so tests use a real (persistent) browser profile.
 * Ephemeral contexts behave like private windows: WebKit refuses OPFS in them entirely.
 */
const test = base.extend({
  context: async ({ playwright, browserName }, use) => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kiyanaw-local-e2e-'));
    const context = await playwright[browserName].launchPersistentContext(profile, { serviceWorkers: 'block' });
    await use(context);
    await context.close();
    fs.rmSync(profile, { recursive: true, force: true });
  },
  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? (await context.newPage()));
  },
});

/**
 * Serves dist/ (or passes through to the dev server) for ORIGIN and records anything that tries to leave it: requests to other
 * origins (aborted, never sent) and requests the CSP blocked before they were made.
 */
const serveApp = async (context: BrowserContext) => {
  const egress: string[] = [];
  // Glob patterns only (no predicate/catch-all): WebKit sends blob: reads (blob:https://origin/…) through
  // interception, and those must reach the browser untouched. Later routes take precedence.
  for (const pattern of ['http://**', 'https://**']) {
    await context.route(pattern, (route) => {
      egress.push(route.request().url());
      return route.abort();
    });
  }
  await context.route(`${ORIGIN}/**`, (route) => {
    if (DEV_URL) return route.continue();
    const url = new URL(route.request().url());
    const file = path.join(DIST, url.pathname);
    const isAsset = path.extname(url.pathname) !== '' && fs.existsSync(file) && fs.statSync(file).isFile();
    return route.fulfill({ path: isAsset ? file : path.join(DIST, 'index.html') });
  });
  return egress;
};

const watchCsp = (page: Page) => {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (/Content[- ]Security[- ]Policy/i.test(msg.text())) violations.push(msg.text());
  });
  return violations;
};

const createLocalProject = async (page: Page, title: string) => {
  await page.goto(`${ORIGIN}/local`);
  await page.getByTestId('local-file-input').setInputFiles(AUDIO);
  await page.getByTestId('local-title-input').fill(title);
  await page.getByTestId('local-create-button').click();
  await expect(page).toHaveURL(/\/local\/edit\/[0-9a-f-]+$/, { timeout: 30000 });
  await expect(page.getByTestId('waveform-container').first()).toBeVisible({ timeout: 30000 });
  await page.locator('text=Loading audio...').first().waitFor({ state: 'hidden', timeout: 30000 });
};

const expectRecordingLoaded = async (page: Page) => {
  await expect(page.getByTestId('waveform-container').first()).toBeVisible({ timeout: 30000 });
  await page.locator('text=Loading audio...').first().waitFor({ state: 'hidden', timeout: 30000 });
  await expect(page.locator('text=Regions (1)').first()).toBeVisible();
  // Give a late media error time to surface before asserting there is none.
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('waveform-error')).toHaveCount(0);
};

const dragRegion = async (page: Page, fromX: number, toX: number) => {
  const box = await page.getByTestId('waveform-container').boundingBox();
  if (!box) throw new Error('waveform has no bounding box');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + fromX, y);
  await page.mouse.down();
  await page.mouse.move(box.x + toX, y, { steps: 5 });
  await page.mouse.up();
};

test.skip(!DEV_URL && !fs.existsSync(path.join(DIST, 'index.html')), 'Run `npm run build` first');
// One test at a time per browser: several headless WebKit instances playing media at once stall
// each other's audio loading (the app is fine serially and in real Safari).
test.describe.configure({ mode: 'serial' });

test('local transcription works end to end and never leaves the device', async ({ context, page }) => {
  const egress = await serveApp(context);
  const cspViolations = watchCsp(page);

  await createLocalProject(page, 'Local e2e');
  await expect(page.getByTestId('local-mode-badge')).toBeVisible();
  // CSP is in place before the app does anything.
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);

  // Region + text
  await dragRegion(page, 100, 220);
  await expect(page.locator('text=Regions (1)').first()).toBeVisible({ timeout: 15000 });
  await page.locator('[data-testid*="regionitem"]').first().click();
  const editor = page.locator('[data-testid="region-editor-main"] .ql-editor').first();
  await editor.click();
  await page.keyboard.type('tânisi kiyânaw');

  // Issue: flag the text, then resolve it
  await page.keyboard.press('ControlOrMeta+a');
  await expect(page.getByTestId('create-issue-button')).toBeEnabled();
  await page.getByTestId('create-issue-button').click();
  await expect(page.locator('text=Issues (1)').first()).toBeVisible({ timeout: 10000 });
  await page.getByTestId('issue-item-open-dialog').first().click();
  await expect(page.getByText('Created by me')).toBeVisible();
  await page.getByTestId('issue-resolve-toggle').first().click();
  await expect(page.locator('text=RESOLVED').first()).toBeVisible({ timeout: 5000 });
  await page.keyboard.press('Escape');

  await page.locator('[data-testid="region-editor-main"] .ql-editor').first().click();
  await page.locator('[data-testid="region-tab-tran"]').first().click();
  const translation = page.locator('[data-testid="region-editor-translation"] .ql-editor').first();
  await translation.click();
  await page.keyboard.type('hello friend');
  // Debounced autosave (3 s)
  await page.waitForTimeout(4500);

  // Reload: everything comes back from this device's storage
  await page.reload();
  await expect(page.getByTestId('waveform-container').first()).toBeVisible({ timeout: 30000 });
  await page.locator('[data-testid*="regionitem"]').first().click();
  await expect(page.locator('[data-testid="region-editor-main"] .ql-editor').first()).toContainText('tânisi kiyânaw');
  await page.locator('[data-testid="region-tab-tran"]').first().click();
  await expect(page.locator('[data-testid="region-editor-translation"] .ql-editor').first()).toContainText('hello friend');
  // The resolved issue came back from this device too
  await expect(page.locator('text=Show resolved issues (1)').first()).toBeVisible({ timeout: 10000 });

  // Export SRT
  await page.getByTestId('transcription-settings-button').click();
  await page.getByTestId('local-export-button').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.srt$/);
  const srt = fs.readFileSync(await download.path(), 'utf-8');
  expect(srt).toMatch(/^1\n\d\d:\d\d:\d\d,\d{3} --> \d\d:\d\d:\d\d,\d{3}\ntânisi kiyânaw\nhello friend/);

  // Navigate away and back (in-app link, then browser back/forward): the recording must load every time.
  await page.getByRole('link', { name: 'My local transcriptions' }).click();
  await expect(page.getByTestId('local-project-list')).toContainText('Local e2e');
  await page.getByTestId('local-project-list').getByRole('link', { name: /Local e2e/ }).click();
  await expectRecordingLoaded(page);
  await page.goBack();
  await expect(page.getByTestId('local-project-list')).toBeVisible();
  await page.goForward();
  await expectRecordingLoaded(page);

  expect(egress, 'requests to other origins').toEqual([]);
  expect(cspViolations, 'requests blocked by the CSP').toEqual([]);
});

test('sign-in page offers local mode, and points to local transcriptions once they exist', async ({ context, page }) => {
  await serveApp(context);

  await page.goto(`${ORIGIN}/`);
  await expect(page.getByTestId('local-mode-entry')).toHaveText(/Work offline/, { timeout: 30000 });

  await page.getByTestId('local-mode-entry').click();
  await expect(page).toHaveURL(`${ORIGIN}/local`);
  await createLocalProject(page, 'From sign-in');

  await page.goto(`${ORIGIN}/`);
  await expect(page.getByTestId('local-mode-entry')).toHaveText(/My local transcriptions \(1\)/, { timeout: 30000 });
});

test('in local mode the browser itself refuses requests to other origins', async ({ context, page }) => {
  const egress = await serveApp(context);
  await page.goto(`${ORIGIN}/local`);
  await expect(page.getByTestId('local-file-input')).toBeVisible();

  const result = await page.evaluate(() =>
    fetch('https://example.com/should-never-be-sent').then(
      () => 'sent',
      () => 'blocked'
    )
  );
  expect(result).toBe('blocked');
  // Blocked by the CSP before it reached the network at all.
  expect(egress).toEqual([]);
});

const localMediaNames = (page: Page) =>
  page.evaluate(async () => {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('local-media', { create: true });
    const names: string[] = [];
    for await (const name of dir.keys()) names.push(name);
    return names;
  });

test('media left by an open that never finished (e.g. a reload) is cleaned up', async ({ context, page }) => {
  await serveApp(context);
  await createLocalProject(page, 'Keep me');
  const projectId = page.url().split('/').pop();

  // What a reload in the middle of storing the media leaves behind: a file with no project.
  await page.evaluate(async () => {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('local-media', { create: true });
    const writable = await (await dir.getFileHandle('unfinished-open', { create: true })).createWritable();
    await writable.write('partial');
    await writable.close();
  });

  await page.goto(`${ORIGIN}/local`);
  await expect(page.getByTestId('local-project-list')).toContainText('Keep me');
  await expect.poll(() => localMediaNames(page)).toEqual([projectId]);
});
