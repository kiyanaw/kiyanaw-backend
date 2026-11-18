/**
 * Transcription.extra (AWSJSON) round-trip and ACL — STAGING ONLY.
 *
 * Direct API calls, no browser UI. Uses the same staging guards as
 * security-holes.spec.ts (see ./staging-api.ts).
 *
 * Actors (from .env):
 *   A        PLAYWRIGHT_TEST_EMAIL / _PASSWORD                    owner
 *   editor   PLAYWRIGHT_TEST_EMAIL_EDITOR / _PASSWORD_EDITOR      in transcription.editors
 *   viewer   PLAYWRIGHT_TEST_EMAIL_VIEWER / _PASSWORD_VIEWER      in transcription.viewers
 *   B        PLAYWRIGHT_TEST_EMAIL_STRANGER / _PASSWORD_STRANGER  no relation to A's data
 *
 * Run:  PLAYWRIGHT_AMPLIFY_ENV=staging npx playwright test tests/e2e/transcription-extra.spec.ts --workers=1
 */
import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import {
  assertStagingConfig, makeActor, gql, gqlRaw, isAuthError, collectAll, type Actor,
} from './staging-api';

const TX_FIELDS = 'id title author extra _version';
const Q = {
  createTranscription: `mutation($input: CreateTranscriptionInput!) { createTranscription(input: $input) { ${TX_FIELDS} } }`,
  updateTranscription: `mutation($input: UpdateTranscriptionInput!) { updateTranscription(input: $input) { ${TX_FIELDS} } }`,
  getTranscription: `query($id: ID!) { getTranscription(id: $id) { ${TX_FIELDS} } }`,
  deleteTranscription: `mutation($input: DeleteTranscriptionInput!) { deleteTranscription(input: $input) { id } }`,
  transcriptionsByAuthor: `query($author: String!, $filter: ModelTranscriptionFilterInput, $nextToken: String) {
    transcriptionsByAuthor(author: $author, filter: $filter, limit: 1000, nextToken: $nextToken) {
      items { ${TX_FIELDS} } nextToken } }`,
  listTranscriptions: `query($filter: ModelTranscriptionFilterInput, $nextToken: String) {
    listTranscriptions(filter: $filter, limit: 1000, nextToken: $nextToken) {
      items { ${TX_FIELDS} } nextToken } }`,
};

const EXTRA_1 = { source: 'mentor' };
const EXTRA_2 = { source: 'mentor', importedToMentor: { at: '2026-11-17' } };
const EXTRA_EDITOR = { source: 'mentor', importedToMentor: { at: '2026-11-17' }, editedBy: 'editor' };

let A: Actor, editor: Actor, viewer: Actor, B: Actor;
const runId = crypto.randomUUID();
const title = `Test Transcription Extra ${runId}`;
let txId = '';
let plainTxId = '';

/** AWSJSON comes back as a JSON string; parse it so key order/whitespace don't matter. */
const parseExtra = (v: unknown) => (v == null ? null : JSON.parse(v as string));

function baseInput(label: string) {
  return {
    title: `${title} ${label}`,
    author: A.sub,
    authorFriendly: 'transcription-extra-test',
    dateLastUpdated: new Date().toISOString(),
    userLastUpdated: 'transcription-extra-test',
    type: 'audio',
    isPrivate: true,
    editors: [editor.sub],
    viewers: [viewer.sub],
  };
}

async function current(id: string): Promise<Record<string, any>> {
  return (await gql(A, Q.getTranscription, { id })).getTranscription;
}

test.describe.configure({ mode: 'default' });

test.beforeAll(async () => {
  test.setTimeout(180_000);
  assertStagingConfig();
  [A, editor, viewer, B] = await Promise.all([
    makeActor('A', 'PLAYWRIGHT_TEST_EMAIL', 'PLAYWRIGHT_TEST_PASSWORD'),
    makeActor('editor', 'PLAYWRIGHT_TEST_EMAIL_EDITOR', 'PLAYWRIGHT_TEST_PASSWORD_EDITOR'),
    makeActor('viewer', 'PLAYWRIGHT_TEST_EMAIL_VIEWER', 'PLAYWRIGHT_TEST_PASSWORD_VIEWER'),
    makeActor('B', 'PLAYWRIGHT_TEST_EMAIL_STRANGER', 'PLAYWRIGHT_TEST_PASSWORD_STRANGER'),
  ]);
  if (new Set([A.sub, editor.sub, viewer.sub, B.sub]).size !== 4) {
    throw new Error('Test accounts must be four distinct users');
  }
});

test.afterAll(async () => {
  if (!A) return;
  for (const id of [txId, plainTxId].filter(Boolean)) {
    try {
      const t = await current(id);
      if (t) await gql(A, Q.deleteTranscription, { input: { id, _version: t._version } });
    } catch (err) {
      console.warn(`[transcription-extra] cleanup ${id} failed: ${(err as Error).message}`);
    }
  }
});

test('create with extra: getTranscription returns it equal', async () => {
  const c = await gql(A, Q.createTranscription, {
    input: { ...baseInput('with-extra'), extra: JSON.stringify(EXTRA_1) },
  });
  txId = c.createTranscription.id;
  expect(parseExtra(c.createTranscription.extra)).toEqual(EXTRA_1);
  const t = await current(txId);
  expect(t.id).toBe(txId);
  expect(parseExtra(t.extra)).toEqual(EXTRA_1);
});

test('transcriptionsByAuthor and listTranscriptions return extra intact', async () => {
  test.setTimeout(240_000);
  test.skip(!txId, 'create case failed');
  const byAuthor = await collectAll(A, Q.transcriptionsByAuthor, 'transcriptionsByAuthor', {
    author: A.sub, filter: { id: { eq: txId } },
  });
  expect(byAuthor.errors).toBeNull();
  const a = byAuthor.items.find(i => i.id === txId);
  expect(a, 'item missing from transcriptionsByAuthor').toBeTruthy();
  expect(parseExtra(a!.extra)).toEqual(EXTRA_1);

  const list = await collectAll(A, Q.listTranscriptions, 'listTranscriptions', { filter: { id: { eq: txId } } });
  expect(list.errors).toBeNull();
  const l = list.items.find(i => i.id === txId);
  expect(l, 'item missing from listTranscriptions').toBeTruthy();
  expect(parseExtra(l!.extra)).toEqual(EXTRA_1);
});

test('owner updates extra: read back equals', async () => {
  test.skip(!txId, 'create case failed');
  const cur = await current(txId);
  const u = await gql(A, Q.updateTranscription, {
    input: { id: txId, _version: cur._version, extra: JSON.stringify(EXTRA_2) },
  });
  expect(parseExtra(u.updateTranscription.extra)).toEqual(EXTRA_2);
  expect(parseExtra((await current(txId)).extra)).toEqual(EXTRA_2);
});

test('editor can update extra', async () => {
  test.skip(!txId, 'create case failed');
  const cur = await current(txId);
  const u = await gql(editor, Q.updateTranscription, {
    input: { id: txId, _version: cur._version, extra: JSON.stringify(EXTRA_EDITOR) },
  });
  expect(parseExtra(u.updateTranscription.extra)).toEqual(EXTRA_EDITOR);
  expect(parseExtra((await current(txId)).extra)).toEqual(EXTRA_EDITOR);
});

test('viewer cannot update extra', async () => {
  test.skip(!txId, 'create case failed');
  const before = await current(txId);
  const r = await gqlRaw(viewer, Q.updateTranscription, {
    input: { id: txId, _version: before._version, extra: JSON.stringify({ hackedBy: 'viewer' }) },
  });
  expect(isAuthError(r), 'viewer updateTranscription was not rejected').toBe(true);
  expect(parseExtra((await current(txId)).extra)).toEqual(parseExtra(before.extra));
});

test('stranger cannot read the transcription or its extra', async () => {
  test.skip(!txId, 'create case failed');
  const r = await gqlRaw(B, Q.getTranscription, { id: txId });
  expect(r.data?.getTranscription ?? null).toBeNull();
});

test('extra is optional: created without it reads back null', async () => {
  const c = await gql(A, Q.createTranscription, { input: baseInput('no-extra') });
  plainTxId = c.createTranscription.id;
  const t = await current(plainTxId);
  expect(t.id).toBe(plainTxId);
  expect(t.extra).toBeNull();
});
