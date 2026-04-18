/**
 * Security ACL integration tests — direct AppSync GraphQL calls (no browser UI).
 *
 * Verifies that the CDK override pipeline functions (override.ts) correctly
 * enforce parent-Transcription ACL on Region, Issue, and Comment operations
 * when the caller is NOT in the transcription's author/editors/viewers lists.
 *
 * Uses the same JWT-based fetch pattern as playwright/global-teardown.ts.
 * No browser page is needed — each "test" is a raw GraphQL call.
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  extractAuth,
  getEnvName,
  isTokenExpired,
  refreshIdToken,
  type StoredAuth,
} from '../../playwright/auth-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getAppSyncEndpoint(): string {
  const fromEnv = process.env.PLAYWRIGHT_APPSYNC_ENDPOINT;
  if (fromEnv) return fromEnv;
  try {
    const cfg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../src/amplifyconfiguration.json'), 'utf-8'),
    );
    return (cfg.aws_appsync_graphqlEndpoint as string) ?? '';
  } catch {
    return '';
  }
}

function getRegion(): string {
  try {
    const cfg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../src/amplifyconfiguration.json'), 'utf-8'),
    );
    return (cfg.aws_project_region as string) ?? 'us-east-1';
  } catch {
    return 'us-east-1';
  }
}

// ---------------------------------------------------------------------------
// GraphQL helpers
// ---------------------------------------------------------------------------

type GqlResult = { data: Record<string, unknown> | null; errors: { message: string }[] | null };

async function gqlRaw(
  endpoint: string,
  idToken: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<GqlResult> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: idToken },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as { data?: Record<string, unknown>; errors?: { message: string }[] };
  return { data: json.data ?? null, errors: json.errors ?? null };
}

async function gql(
  endpoint: string,
  idToken: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const result = await gqlRaw(endpoint, idToken, query, variables);
  if (result.errors) throw new Error(JSON.stringify(result.errors, null, 2));
  return result.data ?? {};
}

// ---------------------------------------------------------------------------
// Auth loading
// ---------------------------------------------------------------------------

async function loadAuth(role: 'owner' | 'editor'): Promise<{ idToken: string; sub: string }> {
  const authDir = path.join(__dirname, '../../playwright/.auth');
  const envName = getEnvName();
  const authFile = path.join(authDir, `user-${role}-${envName}.json`);

  const auth: StoredAuth | null = extractAuth(authFile);
  if (!auth) throw new Error(`No auth file for ${role} at ${authFile}`);

  let { idToken } = auth;
  const awsRegion = getRegion();
  if (isTokenExpired(idToken)) {
    idToken = await refreshIdToken(auth.clientId, auth.refreshToken, awsRegion);
  }
  return { idToken, sub: auth.sub };
}

// ---------------------------------------------------------------------------
// GraphQL operation strings
// ---------------------------------------------------------------------------

const CREATE_TRANSCRIPTION = /* GraphQL */ `
  mutation CreateTranscription($input: CreateTranscriptionInput!) {
    createTranscription(input: $input) { id _version }
  }
`;

const DELETE_TRANSCRIPTION = /* GraphQL */ `
  mutation DeleteTranscription($input: DeleteTranscriptionInput!) {
    deleteTranscription(input: $input) { id }
  }
`;

const GET_TRANSCRIPTION = /* GraphQL */ `
  query GetTranscription($id: ID!) {
    getTranscription(id: $id) { id _version }
  }
`;

const CREATE_REGION = /* GraphQL */ `
  mutation CreateRegion($input: CreateRegionInput!) {
    createRegion(input: $input) { id _version }
  }
`;

const GET_REGION = /* GraphQL */ `
  query GetRegion($id: ID!) {
    getRegion(id: $id) { id }
  }
`;

const UPDATE_REGION = /* GraphQL */ `
  mutation UpdateRegion($input: UpdateRegionInput!) {
    updateRegion(input: $input) { id }
  }
`;

const DELETE_REGION = /* GraphQL */ `
  mutation DeleteRegion($input: DeleteRegionInput!) {
    deleteRegion(input: $input) { id }
  }
`;

const CREATE_ISSUE = /* GraphQL */ `
  mutation CreateIssue($input: CreateIssueInput!) {
    createIssue(input: $input) { id _version }
  }
`;

const CREATE_COMMENT = /* GraphQL */ `
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) { id _version }
  }
`;

const ISSUES_BY_TRANSCRIPTION = /* GraphQL */ `
  query IssuesByTranscription($transcriptionId: ID!) {
    issuesByTranscription(transcriptionId: $transcriptionId) {
      items { id }
    }
  }
`;

const COMMENTS_BY_TRANSCRIPTION = /* GraphQL */ `
  query CommentsByTranscription($transcriptionId: ID!) {
    commentsByTranscription(transcriptionId: $transcriptionId) {
      items { id }
    }
  }
`;

// ---------------------------------------------------------------------------
// Test state shared across the suite
// ---------------------------------------------------------------------------

let endpoint = '';
let ownerToken = '';
let ownerSub = '';
let editorToken = '';
let transcriptionId = '';
let transcriptionVersion = 0;
let regionId = '';
let regionVersion = 0;
let issueId = '';
let commentId = '';

// ---------------------------------------------------------------------------
// Suite setup / teardown
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  endpoint = getAppSyncEndpoint();
  if (!endpoint) throw new Error('No AppSync endpoint configured');

  const [ownerAuth, editorAuth] = await Promise.all([loadAuth('owner'), loadAuth('editor')]);
  ownerToken = ownerAuth.idToken;
  ownerSub = ownerAuth.sub;
  editorToken = editorAuth.idToken;

  // Owner creates a private transcription (author must be the caller's real sub)
  const now = Date.now();
  const txData = await gql(endpoint, ownerToken, CREATE_TRANSCRIPTION, {
    input: {
      title: `Test Transcription ACL ${now}`,
      author: ownerSub,
      authorFriendly: 'security-acl-test',
      dateLastUpdated: new Date().toISOString(),
      userLastUpdated: 'security-acl-test',
      type: 'audio',
      isPrivate: true,
    },
  }) as { createTranscription: { id: string; _version: number } };

  transcriptionId = txData.createTranscription.id;
  transcriptionVersion = txData.createTranscription._version;

  // Owner creates a region under that transcription
  const regionData = await gql(endpoint, ownerToken, CREATE_REGION, {
    input: {
      transcriptionId,
      start: 0.0,
      end: 1.0,
      dateLastUpdated: new Date().toISOString(),
      userLastUpdated: 'security-acl-test',
    },
  }) as { createRegion: { id: string; _version: number } };

  regionId = regionData.createRegion.id;
  regionVersion = regionData.createRegion._version;

  // Owner creates an issue
  const issueData = await gql(endpoint, ownerToken, CREATE_ISSUE, {
    input: {
      transcriptionId,
      regionId,
      text: 'ACL test issue',
      owner: ownerSub,
      ownerFriendly: 'security-acl-test',
      index: 0,
      type: 'general',
      dateLastUpdated: new Date().toISOString(),
      userLastUpdated: 'security-acl-test',
    },
  }) as { createIssue: { id: string; _version: number } };
  issueId = issueData.createIssue.id;
  void issueId;

  // Owner creates a comment
  const commentData = await gql(endpoint, ownerToken, CREATE_COMMENT, {
    input: {
      transcriptionId,
      text: 'ACL test comment',
      author: ownerSub,
      authorFriendly: 'security-acl-test',
      entityType: 'transcription',
      entityId: transcriptionId,
    },
  }) as { createComment: { id: string; _version: number } };
  commentId = commentData.createComment.id;
  void commentId;
});

test.afterAll(async () => {
  if (!transcriptionId) return;
  try {
    const vd = await gql(endpoint, ownerToken, GET_TRANSCRIPTION, { id: transcriptionId }) as {
      getTranscription: { id: string; _version: number } | null;
    };
    const v = vd.getTranscription?._version ?? transcriptionVersion;
    await gql(endpoint, ownerToken, DELETE_TRANSCRIPTION, { input: { id: transcriptionId, _version: v } });
  } catch (err) {
    console.warn('[security-acl] afterAll cleanup failed:', err);
  }
});

// ---------------------------------------------------------------------------
// Negative tests — editor (not invited) must be rejected
// ---------------------------------------------------------------------------

test('getRegion: uninvited editor is rejected', async () => {
  const result = await gqlRaw(endpoint, editorToken, GET_REGION, { id: regionId });
  expect(result.errors).not.toBeNull();
  const msg = result.errors!.map(e => e.message).join(' ');
  expect(msg).toMatch(/unauthorized/i);
});

test('issuesByTranscription: uninvited editor is rejected', async () => {
  const result = await gqlRaw(endpoint, editorToken, ISSUES_BY_TRANSCRIPTION, { transcriptionId });
  expect(result.errors).not.toBeNull();
  const msg = result.errors!.map(e => e.message).join(' ');
  expect(msg).toMatch(/unauthorized/i);
});

test('commentsByTranscription: uninvited editor is rejected', async () => {
  const result = await gqlRaw(endpoint, editorToken, COMMENTS_BY_TRANSCRIPTION, { transcriptionId });
  expect(result.errors).not.toBeNull();
  const msg = result.errors!.map(e => e.message).join(' ');
  expect(msg).toMatch(/unauthorized/i);
});

test('createRegion: uninvited editor is rejected', async () => {
  const result = await gqlRaw(endpoint, editorToken, CREATE_REGION, {
    input: {
      transcriptionId,
      start: 2.0,
      end: 3.0,
      dateLastUpdated: new Date().toISOString(),
      userLastUpdated: 'security-acl-test',
    },
  });
  expect(result.errors).not.toBeNull();
  const msg = result.errors!.map(e => e.message).join(' ');
  expect(msg).toMatch(/unauthorized/i);
});

test('updateRegion: uninvited editor is rejected', async () => {
  const result = await gqlRaw(endpoint, editorToken, UPDATE_REGION, {
    input: { id: regionId, _version: regionVersion, regionText: 'hacked' },
  });
  expect(result.errors).not.toBeNull();
  const msg = result.errors!.map(e => e.message).join(' ');
  expect(msg).toMatch(/unauthorized/i);
});

test('deleteRegion: uninvited editor is rejected', async () => {
  const result = await gqlRaw(endpoint, editorToken, DELETE_REGION, {
    input: { id: regionId, _version: regionVersion },
  });
  expect(result.errors).not.toBeNull();
  const msg = result.errors!.map(e => e.message).join(' ');
  expect(msg).toMatch(/unauthorized/i);
});

// ---------------------------------------------------------------------------
// Positive tests — owner retains full access
// ---------------------------------------------------------------------------

test('owner can getRegion on their private transcription', async () => {
  const data = await gql(endpoint, ownerToken, GET_REGION, { id: regionId }) as {
    getRegion: { id: string } | null;
  };
  expect(data.getRegion?.id).toBe(regionId);
});

test('owner can list issuesByTranscription on their private transcription', async () => {
  const data = await gql(endpoint, ownerToken, ISSUES_BY_TRANSCRIPTION, { transcriptionId }) as {
    issuesByTranscription: { items: { id: string }[] };
  };
  expect(data.issuesByTranscription.items.length).toBeGreaterThan(0);
});

test('owner can list commentsByTranscription on their private transcription', async () => {
  const data = await gql(endpoint, ownerToken, COMMENTS_BY_TRANSCRIPTION, { transcriptionId }) as {
    commentsByTranscription: { items: { id: string }[] };
  };
  expect(data.commentsByTranscription.items.length).toBeGreaterThan(0);
});
