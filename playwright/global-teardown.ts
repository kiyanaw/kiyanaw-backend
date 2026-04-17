/**
 * Playwright global teardown — deletes orphaned test transcriptions.
 *
 * Runs after every `npm run test:e2e` suite. Each test's afterEach already
 * deletes its own transcription, so this only catches orphans left by
 * aborted or mid-failure runs.
 *
 * Strategy:
 *  1. Read each test account's stored auth token from playwright/.auth/
 *  2. If the idToken is expired, refresh it via the Cognito token endpoint
 *  3. Decode the JWT to get the Cognito sub (= `author` field on Transcription)
 *  4. Call transcriptionsByAuthor to list all transcriptions for that user
 *  5. Delete any whose title starts with "Test Transcription"
 *     (the naming convention used by createTestTranscription in helpers.ts)
 *
 * The app's onTranscriptionChange Lambda cascades the delete to regions,
 * issues, comments, and S3 media — so one delete call is sufficient.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { extractAuth, getEnvName, isTokenExpired, refreshIdToken } from './auth-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

// ---------------------------------------------------------------------------
// GraphQL query / mutation strings (inline to avoid importing the app bundle)
// ---------------------------------------------------------------------------

const LIST_BY_AUTHOR = /* GraphQL */ `
  query TranscriptionsByAuthor($author: String!, $nextToken: String) {
    transcriptionsByAuthor(
      author: $author
      filter: { _deleted: { ne: true } }
      limit: 100
      nextToken: $nextToken
    ) {
      items { id title _version }
      nextToken
    }
  }
`;

const GET_VERSION = /* GraphQL */ `
  query GetTranscription($id: ID!) {
    getTranscription(id: $id) { id _version }
  }
`;

const DELETE_TRANSCRIPTION = /* GraphQL */ `
  mutation DeleteTranscription($input: DeleteTranscriptionInput!) {
    deleteTranscription(input: $input) { id }
  }
`;

const LIST_INVITES = /* GraphQL */ `
  query ListInvites($invitedBy: String!, $nextToken: String) {
    listInvites(
      filter: { invitedBy: { eq: $invitedBy }, _deleted: { ne: true } }
      limit: 100
      nextToken: $nextToken
    ) {
      items { id transcriptionTitle _version }
      nextToken
    }
  }
`;

const DELETE_INVITE = /* GraphQL */ `
  mutation DeleteInvite($input: DeleteInviteInput!) {
    deleteInvite(input: $input) { id }
  }
`;

// ---------------------------------------------------------------------------
// GraphQL helper
// ---------------------------------------------------------------------------

async function gql(
  endpoint: string,
  idToken: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: idToken },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as { data?: Record<string, unknown>; errors?: unknown[] };
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data ?? {};
}

// ---------------------------------------------------------------------------
// Per-account cleanup
// ---------------------------------------------------------------------------

async function cleanupAccount(
  name: string,
  authFile: string,
  endpoint: string,
  region: string,
): Promise<void> {
  const auth = extractAuth(authFile);
  if (!auth) {
    console.log(`[teardown] ${name}: no auth file — skipping`);
    return;
  }

  // Refresh the idToken if expired (Cognito default TTL is 1 hour)
  let { idToken } = auth;
  if (isTokenExpired(idToken)) {
    console.log(`[teardown] ${name}: idToken expired — refreshing…`);
    idToken = await refreshIdToken(auth.clientId, auth.refreshToken, region);
  }

  // Collect all test transcriptions across pages
  const toDelete: { id: string }[] = [];
  let nextToken: string | undefined;

  do {
    const data = await gql(endpoint, idToken, LIST_BY_AUTHOR, {
      author: auth.sub,
      ...(nextToken ? { nextToken } : {}),
    }) as {
      transcriptionsByAuthor?: {
        items: { id: string; title: string; _version: number }[];
        nextToken?: string;
      };
    };

    const page = data.transcriptionsByAuthor;
    for (const item of page?.items ?? []) {
      if (item.title?.startsWith('Test Transcription')) {
        toDelete.push({ id: item.id });
      }
    }
    nextToken = page?.nextToken;
  } while (nextToken);

  if (toDelete.length === 0) {
    console.log(`[teardown] ${name}: no orphaned test transcriptions`);
    return;
  }

  console.log(`[teardown] ${name}: deleting ${toDelete.length} orphaned transcription(s)…`);

  let deleted = 0;
  for (const { id } of toDelete) {
    try {
      const versionData = await gql(endpoint, idToken, GET_VERSION, { id }) as {
        getTranscription?: { id: string; _version: number } | null;
      };
      const _version = versionData.getTranscription?._version;
      if (_version == null) continue; // already deleted

      await gql(endpoint, idToken, DELETE_TRANSCRIPTION, { input: { id, _version } });
      deleted++;
    } catch (err) {
      console.warn(`[teardown] ${name}: failed to delete ${id}:`, err);
    }
  }

  console.log(`[teardown] ${name}: deleted ${deleted}/${toDelete.length}`);

  // Clean up any invites this account sent for test transcriptions
  const invitesToDelete: { id: string; _version: number }[] = [];
  let inviteNextToken: string | undefined;

  do {
    const data = await gql(endpoint, idToken, LIST_INVITES, {
      invitedBy: auth.sub,
      ...(inviteNextToken ? { nextToken: inviteNextToken } : {}),
    }) as {
      listInvites?: {
        items: { id: string; transcriptionTitle: string; _version: number }[];
        nextToken?: string;
      };
    };

    const invitePage = data.listInvites;
    for (const item of invitePage?.items ?? []) {
      if (item.transcriptionTitle?.startsWith('Test Transcription')) {
        invitesToDelete.push({ id: item.id, _version: item._version });
      }
    }
    inviteNextToken = invitePage?.nextToken;
  } while (inviteNextToken);

  if (invitesToDelete.length > 0) {
    console.log(`[teardown] ${name}: deleting ${invitesToDelete.length} orphaned invite(s)…`);
    let deletedInvites = 0;
    for (const { id, _version } of invitesToDelete) {
      try {
        await gql(endpoint, idToken, DELETE_INVITE, { input: { id, _version } });
        deletedInvites++;
      } catch (err) {
        console.warn(`[teardown] ${name}: failed to delete invite ${id}:`, err);
      }
    }
    console.log(`[teardown] ${name}: deleted ${deletedInvites}/${invitesToDelete.length} invite(s)`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export default async function globalTeardown(): Promise<void> {
  const amplifyCfg = (() => {
    try {
      return JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../src/amplifyconfiguration.json'), 'utf-8'),
      );
    } catch { return {}; }
  })();

  const endpoint: string = process.env.PLAYWRIGHT_APPSYNC_ENDPOINT ?? amplifyCfg.aws_appsync_graphqlEndpoint ?? '';
  const region: string = amplifyCfg.aws_project_region ?? 'us-east-1';

  if (!endpoint) {
    console.warn('[teardown] No AppSync endpoint found — skipping cleanup');
    return;
  }

  const authDir = path.join(__dirname, '.auth');
  const accounts = ['owner', 'editor', 'viewer'];
  const envName = getEnvName();

  for (const name of accounts) {
    const authFile = path.join(authDir, `user-${name}-${envName}.json`);
    await cleanupAccount(name, authFile, endpoint, region).catch(err => {
      console.warn(`[teardown] ${name}: cleanup error —`, err);
    });
  }
}
