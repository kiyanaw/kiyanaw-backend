/**
 * Security holes C3, C2, H4 (aa-SECURITY_AUDIT-2026-10-22.md) — STAGING ONLY.
 *
 * Direct API calls, no browser UI. Written test-first: on the current backend the
 * "stranger" cases are EXPECTED TO FAIL — each failure confirms an open hole. Once
 * the fixes land, every case here should pass.
 *
 * Actors (from .env, see playwright/global-setup.ts):
 *   A        PLAYWRIGHT_TEST_EMAIL / _PASSWORD                    owner
 *   editor   PLAYWRIGHT_TEST_EMAIL_EDITOR / _PASSWORD_EDITOR      in transcription.editors
 *   viewer   PLAYWRIGHT_TEST_EMAIL_VIEWER / _PASSWORD_VIEWER      in transcription.viewers
 *   B        PLAYWRIGHT_TEST_EMAIL_STRANGER / _PASSWORD_STRANGER  no relation to A's data
 *
 * Every network call goes through a guard that aborts unless it targets the staging
 * AppSync / Cognito / identity pool / bucket / media API, and each actor's AWS
 * credentials are checked against the staging account via STS before use.
 *
 * Run:  PLAYWRIGHT_AMPLIFY_ENV=staging npx playwright test tests/e2e/security-holes.spec.ts --workers=1
 */
import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import {
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import {
  STAGING, assertStagingConfig, assertBucket, signedFetch, makeActor,
  gql, gqlRaw, isAuthError, collectAll, adminS3Client, type Actor,
} from './staging-api';

const Q = {
  createMedia: `mutation($input: CreateMediaInput!) { createMedia(input: $input) { id _version } }`,
  getMedia: `query($id: ID!) { getMedia(id: $id) { id _version } }`,
  deleteMedia: `mutation($input: DeleteMediaInput!) { deleteMedia(input: $input) { id } }`,
  createTranscription: `mutation($input: CreateTranscriptionInput!) { createTranscription(input: $input) { id _version } }`,
  getTranscription: `query($id: ID!) { getTranscription(id: $id) { id title _version } }`,
  deleteTranscription: `mutation($input: DeleteTranscriptionInput!) { deleteTranscription(input: $input) { id } }`,
  createRegion: `mutation($input: CreateRegionInput!) { createRegion(input: $input) { id _version } }`,
  getRegion: `query($id: ID!) { getRegion(id: $id) { id _version } }`,
  updateRegion: `mutation($input: UpdateRegionInput!) { updateRegion(input: $input) { id regionText _version } }`,
  deleteRegion: `mutation($input: DeleteRegionInput!) { deleteRegion(input: $input) { id } }`,
  regionsByTranscription: `query($transcriptionId: ID!, $nextToken: String) {
    regionsByTranscription(transcriptionId: $transcriptionId, limit: 1000, nextToken: $nextToken) {
      items { id regionText transcriptionId } nextToken } }`,
  listRegions: `query($filter: ModelRegionFilterInput, $nextToken: String) {
    listRegions(filter: $filter, limit: 1000, nextToken: $nextToken) {
      items { id regionText transcriptionId } nextToken } }`,
  syncRegions: `query($filter: ModelRegionFilterInput, $nextToken: String) {
    syncRegions(filter: $filter, limit: 1000, nextToken: $nextToken) {
      items { id regionText transcriptionId } nextToken } }`,
  byTitle: `query($title: String!, $nextToken: String) {
    byTitle(title: $title, limit: 100, nextToken: $nextToken) {
      items { id title author mediaId editors viewers } nextToken } }`,
  transcriptionsByMedia: `query($mediaId: ID!, $nextToken: String) {
    transcriptionsByMedia(mediaId: $mediaId, limit: 100, nextToken: $nextToken) {
      items { id title author mediaId editors viewers } nextToken } }`,
  syncTranscriptions: `query($filter: ModelTranscriptionFilterInput, $nextToken: String) {
    syncTranscriptions(filter: $filter, limit: 1000, nextToken: $nextToken) {
      items { id title author mediaId editors viewers } nextToken } }`,
};

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let A: Actor, editor: Actor, viewer: Actor, B: Actor;
const runId = crypto.randomUUID();
const secret = `SECRET-${runId}`;
const title = `Test Transcription SecHoles ${runId}`;
const mediaId = crypto.randomUUID();
// Originals live in the uploader's identity folder; set once A has signed in.
let originalKey = '';
let deleteTargetKey = '';
const originalsFolder = (actor: Actor) => `public/originals/${actor.identityId}/`;
const renditionDecoyKey = `public/renditions/${mediaId}.mp3`; // where processMedia would put A's playback copy
let transcriptionId = '';
let mediaCreated = false;
const regionIds: string[] = [];
const extraRegionIds: string[] = [];
const s3KeysToClean = new Set<string>();

const AUDIO = Buffer.concat([Buffer.from('ID3', 'utf8'), crypto.randomBytes(2048)]);

async function putAsA(key: string): Promise<boolean> {
  assertBucket(STAGING.bucket);
  try {
    await A.s3.send(new PutObjectCommand({ Bucket: STAGING.bucket, Key: key, Body: AUDIO, ContentType: 'audio/mpeg' }));
    s3KeysToClean.add(key);
    return true;
  } catch {
    return false;
  }
}

async function s3Attempt(fn: () => Promise<unknown>): Promise<{ ok: boolean; code?: string }> {
  try {
    await fn();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, code: err?.name ?? err?.Code ?? 'Error' };
  }
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

test.describe.configure({ mode: 'default' });

let uploadOk = false;
let renditionOk = false;

async function seedAsAdmin(key: string): Promise<boolean> {
  assertBucket(STAGING.bucket);
  try {
    const adminS3 = await adminS3Client();
    await adminS3.send(new PutObjectCommand({ Bucket: STAGING.bucket, Key: key, Body: AUDIO, ContentType: 'audio/mpeg' }));
    s3KeysToClean.add(key);
    return true;
  } catch (err) {
    console.warn(`[security-holes] seeding ${key} failed: ${(err as Error).message}`);
    return false;
  }
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  assertStagingConfig();

  [A, editor, viewer, B] = await Promise.all([
    makeActor('A', 'PLAYWRIGHT_TEST_EMAIL', 'PLAYWRIGHT_TEST_PASSWORD'),
    makeActor('editor', 'PLAYWRIGHT_TEST_EMAIL_EDITOR', 'PLAYWRIGHT_TEST_PASSWORD_EDITOR'),
    makeActor('viewer', 'PLAYWRIGHT_TEST_EMAIL_VIEWER', 'PLAYWRIGHT_TEST_PASSWORD_VIEWER'),
    makeActor('B', 'PLAYWRIGHT_TEST_EMAIL_STRANGER', 'PLAYWRIGHT_TEST_PASSWORD_STRANGER'),
  ]);
  const subs = new Set([A.sub, editor.sub, viewer.sub, B.sub]);
  if (subs.size !== 4) throw new Error('Test accounts must be four distinct users');

  originalKey = `${originalsFolder(A)}${mediaId}.mp3`;
  deleteTargetKey = `${originalsFolder(A)}${mediaId}-sectest-delete-target.mp3`;

  // A uploads audio into its identity folder + a dedicated delete-target object.
  // A failed upload is reported by its own test case; S3/H4 cases skip without it.
  uploadOk = (await putAsA(originalKey)) && (await putAsA(deleteTargetKey));
  // A rendition like processMedia writes. Signed-in users can't write renditions/ after the C2 fix,
  // so seed it with the kiyanaw-staging profile (checked against the staging account first).
  renditionOk = await seedAsAdmin(renditionDecoyKey);

  // Media row. status READY so processMedia (claims only PENDING) never picks it up.
  await gql(A, Q.createMedia, {
    input: {
      id: mediaId,
      pk: `USER#${A.sub}`,
      sk: `MEDIA#0000-00-00#${mediaId}`,
      owner: A.sub,
      status: 'READY',
      originalKey,
      originalName: 'sectest.mp3',
      renditionKey: renditionDecoyKey,
      mimeType: 'audio/mpeg',
      fileSize: AUDIO.length,
      audioOnly: true,
    },
  });
  mediaCreated = true;

  const tx = await gql(A, Q.createTranscription, {
    input: {
      title,
      author: A.sub,
      authorFriendly: 'security-holes-test',
      dateLastUpdated: new Date().toISOString(),
      userLastUpdated: 'security-holes-test',
      type: 'audio',
      isPrivate: true,
      mediaId,
      editors: [editor.sub],
      viewers: [viewer.sub],
    },
  });
  transcriptionId = tx.createTranscription.id;

  for (let i = 0; i < 2; i++) {
    const r = await gql(A, Q.createRegion, {
      input: {
        transcriptionId,
        start: i,
        end: i + 1,
        regionText: `${secret} region ${i}`,
        dateLastUpdated: new Date().toISOString(),
        userLastUpdated: 'security-holes-test',
      },
    });
    regionIds.push(r.createRegion.id);
  }
});

test.afterAll(async () => {
  if (!A) return;
  const del = async (label: string, fn: () => Promise<unknown>) => {
    try { await fn(); } catch (err) { console.warn(`[security-holes] cleanup ${label} failed: ${(err as Error).message}`); }
  };
  for (const id of [...extraRegionIds, ...regionIds]) {
    await del(`region ${id}`, async () => {
      const r = await gql(A, Q.getRegion, { id });
      if (r.getRegion) await gql(A, Q.deleteRegion, { input: { id, _version: r.getRegion._version } });
    });
  }
  if (transcriptionId) {
    await del('transcription', async () => {
      const t = await gql(A, Q.getTranscription, { id: transcriptionId });
      if (t.getTranscription) {
        await gql(A, Q.deleteTranscription, { input: { id: transcriptionId, _version: t.getTranscription._version } });
      }
    });
  }
  if (mediaCreated) {
    await del('media', async () => {
      const m = await gql(A, Q.getMedia, { id: mediaId });
      if (m.getMedia) await gql(A, Q.deleteMedia, { input: { id: mediaId, _version: m.getMedia._version } });
    });
  }
  assertBucket(STAGING.bucket);
  // Signed-in users can't delete media after the C2 fix, so clean up with the
  // kiyanaw-staging profile, checked against the staging account first.
  const adminS3 = await adminS3Client();
  for (const key of s3KeysToClean) {
    await del(`s3 ${key}`, () => adminS3.send(new DeleteObjectCommand({ Bucket: STAGING.bucket, Key: key })));
  }
});

// ---------------------------------------------------------------------------
// C3 — stranger B must not read A's private regions
// ---------------------------------------------------------------------------

function leakedRegions(items: Record<string, any>[]): string[] {
  return items
    .filter(i => regionIds.includes(i.id) || i.transcriptionId === transcriptionId || String(i.regionText ?? '').includes(secret))
    .map(i => i.id);
}

test('C3 regionsByTranscription: stranger cannot read A\'s private regions', async () => {
  const r = await collectAll(B, Q.regionsByTranscription, 'regionsByTranscription', { transcriptionId });
  expect(leakedRegions(r.items), 'HOLE C3: stranger read private regions via regionsByTranscription').toEqual([]);
});

test('C3 listRegions: stranger cannot read A\'s private regions', async () => {
  test.setTimeout(240_000);
  const r = await collectAll(B, Q.listRegions, 'listRegions', { filter: { transcriptionId: { eq: transcriptionId } } });
  expect(leakedRegions(r.items), 'HOLE C3: stranger read private regions via listRegions').toEqual([]);
  expect(r.complete || !!r.errors, 'listRegions scan neither finished nor errored (inconclusive)').toBe(true);
});

test('C3 syncRegions: stranger cannot read A\'s private regions', async () => {
  test.setTimeout(240_000);
  const r = await collectAll(B, Q.syncRegions, 'syncRegions', { filter: { transcriptionId: { eq: transcriptionId } } });
  expect(leakedRegions(r.items), 'HOLE C3: stranger read private regions via syncRegions').toEqual([]);
  expect(r.complete || !!r.errors, 'syncRegions scan neither finished nor errored (inconclusive)').toBe(true);
});

// ---------------------------------------------------------------------------
// C3 — stranger B must not read A's private transcription metadata
// ---------------------------------------------------------------------------

const leakedTx = (items: Record<string, any>[]) =>
  items.filter(i => i.id === transcriptionId || i.title === title).map(i => i.id);

test('C3 byTitle: stranger cannot read A\'s private transcription metadata', async () => {
  const r = await collectAll(B, Q.byTitle, 'byTitle', { title });
  expect(leakedTx(r.items), 'HOLE C3: stranger read private transcription via byTitle').toEqual([]);
});

test('C3 transcriptionsByMedia: stranger cannot read A\'s private transcription metadata', async () => {
  const r = await collectAll(B, Q.transcriptionsByMedia, 'transcriptionsByMedia', { mediaId });
  expect(leakedTx(r.items), 'HOLE C3: stranger read private transcription via transcriptionsByMedia').toEqual([]);
});

test('C3 syncTranscriptions: stranger cannot read A\'s private transcription metadata', async () => {
  test.setTimeout(240_000);
  const r = await collectAll(B, Q.syncTranscriptions, 'syncTranscriptions', { filter: { id: { eq: transcriptionId } } });
  expect(leakedTx(r.items), 'HOLE C3: stranger read private transcription via syncTranscriptions').toEqual([]);
  expect(r.complete || !!r.errors, 'syncTranscriptions scan neither finished nor errored (inconclusive)').toBe(true);
});

test('control: stranger is already blocked from guarded getTranscription', async () => {
  const r = await gqlRaw(B, Q.getTranscription, { id: transcriptionId });
  expect(r.data?.getTranscription ?? null).toBeNull();
});

// ---------------------------------------------------------------------------
// C2 — stranger B's identity-pool credentials vs A's media in S3
// ---------------------------------------------------------------------------

test('access: owner A can upload to its own public/originals/<identityId>/ folder', async () => {
  expect(uploadOk).toBe(true);
});

test('access: owner A can read back its own original (Amplify multipart upload needs this)', async () => {
  test.skip(!uploadOk, 'A could not upload, see the upload case');
  assertBucket(STAGING.bucket);
  const r = await s3Attempt(async () => {
    const out = await A.s3.send(new GetObjectCommand({ Bucket: STAGING.bucket, Key: originalKey }));
    await out.Body?.transformToByteArray();
  });
  expect(r.ok, `A could not read its own original (${r.code})`).toBe(true);
});

test('C2 originals: stranger cannot write into A\'s identity folder', async () => {
  test.skip(!uploadOk, 'A could not upload, see the upload case');
  assertBucket(STAGING.bucket);
  const key = `${originalsFolder(A)}${mediaId}-sectest-planted-by-stranger.mp3`;
  const r = await s3Attempt(() => B.s3.send(new PutObjectCommand({
    Bucket: STAGING.bucket, Key: key, Body: Buffer.from('planted-by-stranger'), ContentType: 'audio/mpeg',
  })));
  if (r.ok) s3KeysToClean.add(key);
  expect(r.ok, 'HOLE C2: stranger wrote into A\'s originals folder').toBe(false);
});

test('C2 originals: stranger cannot overwrite A\'s original', async () => {
  test.skip(!uploadOk, 'A could not upload, see the upload case');
  assertBucket(STAGING.bucket);
  const r = await s3Attempt(() => B.s3.send(new PutObjectCommand({
    Bucket: STAGING.bucket, Key: originalKey, Body: Buffer.from('overwritten-by-stranger'), ContentType: 'audio/mpeg',
  })));
  expect(r.ok, 'HOLE C2: stranger overwrote A\'s original').toBe(false);
});

test('C2 originals: flat public/originals/<file> keys are no longer writable', async () => {
  assertBucket(STAGING.bucket);
  const key = `public/originals/${mediaId}-sectest-flat.mp3`;
  const r = await s3Attempt(() => B.s3.send(new PutObjectCommand({
    Bucket: STAGING.bucket, Key: key, Body: AUDIO, ContentType: 'audio/mpeg',
  })));
  if (r.ok) s3KeysToClean.add(key);
  expect(r.ok, 'C2: signed-in role can still write outside its identity folder').toBe(false);
});

test('C2 ListObjects public/: stranger cannot enumerate media', async () => {
  test.skip(!uploadOk, 'A could not upload, see the upload case');
  assertBucket(STAGING.bucket);
  const r = await s3Attempt(() =>
    B.s3.send(new ListObjectsV2Command({ Bucket: STAGING.bucket, Prefix: 'public/', MaxKeys: 5 })));
  expect(r.ok, 'HOLE C2: stranger listed public/').toBe(false);
});

test('C2 GetObject: stranger cannot download A\'s private original (A\'s identity folder)', async () => {
  test.skip(!uploadOk, 'A could not upload, see the upload case');
  assertBucket(STAGING.bucket);
  const r = await s3Attempt(async () => {
    const out = await B.s3.send(new GetObjectCommand({ Bucket: STAGING.bucket, Key: originalKey }));
    await out.Body?.transformToByteArray();
  });
  expect(r.ok, 'HOLE C2: stranger downloaded A\'s private original from A\'s identity folder').toBe(false);
});

test('C2 GetObject rendition: stranger cannot download A\'s playback copy', async () => {
  test.skip(!renditionOk, 'rendition could not be seeded with the kiyanaw-staging profile');
  assertBucket(STAGING.bucket);
  const r = await s3Attempt(async () => {
    const out = await B.s3.send(new GetObjectCommand({ Bucket: STAGING.bucket, Key: renditionDecoyKey }));
    await out.Body?.transformToByteArray();
  });
  expect(r.ok, 'HOLE C2: stranger downloaded A\'s private rendition').toBe(false);
});

test('C2 owner: A cannot GetObject the rendition directly either, but can play it via a signed URL', async () => {
  test.skip(!renditionOk, 'rendition could not be seeded with the kiyanaw-staging profile');
  assertBucket(STAGING.bucket);
  const direct = await s3Attempt(async () => {
    const out = await A.s3.send(new GetObjectCommand({ Bucket: STAGING.bucket, Key: renditionDecoyKey }));
    await out.Body?.transformToByteArray();
  });
  expect(direct.ok, 'C2: signed-in role can still read media straight from S3').toBe(false);

  const r = await requestSignedUrl(A, renditionDecoyKey);
  expect(r.signed).toBe(true);
  const res = await fetch(r.signedUrl!);
  expect(res.status).toBe(200);
});

test('C2 PutObject: stranger cannot overwrite A\'s media (rendition key)', async () => {
  test.skip(!uploadOk, 'A could not upload, see the upload case');
  assertBucket(STAGING.bucket);
  const r = await s3Attempt(() => B.s3.send(new PutObjectCommand({
    Bucket: STAGING.bucket, Key: renditionDecoyKey, Body: Buffer.from('overwritten-by-stranger'), ContentType: 'audio/mpeg',
  })));
  if (r.ok) s3KeysToClean.add(renditionDecoyKey);
  expect(r.ok, 'HOLE C2: stranger overwrote a media object of A\'s').toBe(false);
});

test('C2 DeleteObject: stranger cannot delete A\'s media', async () => {
  test.skip(!uploadOk, 'A could not upload, see the upload case');
  assertBucket(STAGING.bucket);
  const r = await s3Attempt(() =>
    B.s3.send(new DeleteObjectCommand({ Bucket: STAGING.bucket, Key: deleteTargetKey })));
  const stillThere = await s3Attempt(() =>
    A.s3.send(new HeadObjectCommand({ Bucket: STAGING.bucket, Key: deleteTargetKey })));
  if (!stillThere.ok) s3KeysToClean.delete(deleteTargetKey);
  expect(r.ok && !stillThere.ok, 'HOLE C2: stranger deleted A\'s object').toBe(false);
  expect(r.ok, 'HOLE C2: stranger DeleteObject was not denied').toBe(false);
});

// ---------------------------------------------------------------------------
// H4 — mediaAccess must not sign A's media key for stranger B
// ---------------------------------------------------------------------------

async function requestSignedUrl(actor: Actor, s3Key: string): Promise<{ status: number; signed: boolean; signedUrl?: string }> {
  const url = `${STAGING.mediaApi}/cloudfront/sign`;
  const res = await signedFetch(actor.creds, 'execute-api', url, 'POST',
    JSON.stringify({ s3Key, expiresInSeconds: 3600 }), 'application/json');
  const body = await res.json().catch(() => ({})) as { signedUrl?: string };
  const signed = typeof body.signedUrl === 'string' && body.signedUrl.length > 0;
  return { status: res.status, signed, signedUrl: signed ? body.signedUrl : undefined };
}

test('H4 mediaAccess: stranger cannot get a signed URL for A\'s media', async () => {
  test.skip(!uploadOk, 'A could not upload, see the upload case');
  const r = await requestSignedUrl(B, originalKey);
  expect(r.signed, `HOLE H4: mediaAccess signed A's key for stranger (HTTP ${r.status})`).toBe(false);
});

test('H4 control: owner A can get a signed URL for own media', async () => {
  test.skip(!uploadOk, 'A could not upload, see the upload case');
  const r = await requestSignedUrl(A, originalKey);
  expect(r.status).toBe(200);
  expect(r.signed).toBe(true);
});

// ---------------------------------------------------------------------------
// R-SEC-3 — legitimate access keeps working
// ---------------------------------------------------------------------------

for (const who of ['A', 'editor', 'viewer'] as const) {
  test(`access: ${who} can read the transcription and its regions`, async () => {
    const actor = { A, editor, viewer }[who];
    const t = await gql(actor, Q.getTranscription, { id: transcriptionId });
    expect(t.getTranscription?.id).toBe(transcriptionId);
    const r = await collectAll(actor, Q.regionsByTranscription, 'regionsByTranscription', { transcriptionId });
    expect(r.errors).toBeNull();
    expect(r.items.map(i => i.id).sort()).toEqual(expect.arrayContaining([...regionIds].sort()));
  });
}

test('access: editor can create and update a region', async () => {
  const c = await gql(editor, Q.createRegion, {
    input: {
      transcriptionId, start: 5, end: 6, regionText: 'editor region',
      dateLastUpdated: new Date().toISOString(), userLastUpdated: 'security-holes-test',
    },
  });
  extraRegionIds.push(c.createRegion.id);
  const u = await gql(editor, Q.updateRegion, {
    input: { id: c.createRegion.id, _version: c.createRegion._version, regionText: 'editor region updated' },
  });
  expect(u.updateRegion.regionText).toBe('editor region updated');
});

test('access: viewer cannot create or update a region', async () => {
  const c = await gqlRaw(viewer, Q.createRegion, {
    input: {
      transcriptionId, start: 7, end: 8, regionText: 'viewer region',
      dateLastUpdated: new Date().toISOString(), userLastUpdated: 'security-holes-test',
    },
  });
  if (c.data?.createRegion?.id) extraRegionIds.push(c.data.createRegion.id);
  expect(isAuthError(c), 'viewer createRegion was not rejected').toBe(true);

  const cur = await gql(A, Q.getRegion, { id: regionIds[0] });
  const u = await gqlRaw(viewer, Q.updateRegion, {
    input: { id: regionIds[0], _version: cur.getRegion._version, regionText: 'viewer edit' },
  });
  expect(isAuthError(u), 'viewer updateRegion was not rejected').toBe(true);
});
