/**
 * Shared staging-only helpers for direct-API e2e specs (no browser UI).
 *
 * Every network call goes through a guard that aborts unless it targets the staging
 * AppSync / Cognito / identity pool / bucket / media API, and each actor's AWS
 * credentials are checked against the staging account via STS before use.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { S3Client } from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool, fromIni } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import type { AwsCredentialIdentity } from '@aws-sdk/types';
import { getEnvName } from '../../playwright/auth-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

// ---------------------------------------------------------------------------
// Staging guard — hard-coded allow-list. Anything else aborts the run.
// ---------------------------------------------------------------------------

export const STAGING = {
  account: '755431179459',
  region: 'us-east-1',
  appsync: 'https://s7y63pndzfdafcioyip2xusprm.appsync-api.us-east-1.amazonaws.com/graphql',
  userPoolId: 'us-east-1_34HOzXIGR',
  clientId: '4j66gon3djsd666rt313lh5dr',
  identityPoolId: 'us-east-1:d0ecfa31-8a04-4728-a371-5361dd5eb7b7',
  bucket: 'kiyanaw-20250708160100-transcriptionsbucket-staging',
  mediaApi: 'https://6eyhhdyc7h.execute-api.us-east-1.amazonaws.com/staging',
} as const;
export const PROD_ACCOUNT = '238287276756';

const ALLOWED_HOSTS = new Set([
  new URL(STAGING.appsync).host,
  new URL(STAGING.mediaApi).host,
  `cognito-idp.${STAGING.region}.amazonaws.com`,
  'sts.amazonaws.com',
]);

export function abort(msg: string): never {
  throw new Error(`[staging-e2e] STAGING GUARD: ${msg} — aborting`);
}

export function assertStagingConfig(): void {
  if (getEnvName() !== 'staging') abort(`env is "${getEnvName()}", expected "staging"`);
  const cfg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../src/amplifyconfiguration.json'), 'utf-8'),
  );
  const checks: [string, unknown, string][] = [
    ['aws_appsync_graphqlEndpoint', cfg.aws_appsync_graphqlEndpoint, STAGING.appsync],
    ['aws_user_pools_id', cfg.aws_user_pools_id, STAGING.userPoolId],
    ['aws_user_pools_web_client_id', cfg.aws_user_pools_web_client_id, STAGING.clientId],
    ['aws_cognito_identity_pool_id', cfg.aws_cognito_identity_pool_id, STAGING.identityPoolId],
    ['aws_user_files_s3_bucket', cfg.aws_user_files_s3_bucket, STAGING.bucket],
  ];
  for (const [k, actual, expected] of checks) {
    if (actual !== expected) abort(`amplifyconfiguration ${k} is not the staging value`);
  }
  const media = (cfg.aws_cloud_logic_custom ?? []).find((a: { name: string }) => a.name === 'media');
  if (media?.endpoint !== STAGING.mediaApi) abort('media API endpoint is not staging');
}

export function assertUrl(url: string): void {
  if (!ALLOWED_HOSTS.has(new URL(url).host)) abort(`host ${new URL(url).host} not allowed`);
}

export function assertBucket(bucket: string): void {
  if (bucket !== STAGING.bucket) abort(`bucket ${bucket} is not staging`);
}

// ---------------------------------------------------------------------------
// Cognito SRP login (the app client only allows SRP; no client changes made)
// ---------------------------------------------------------------------------

const N = BigInt('0x' + crypto.getDiffieHellman('modp15').getPrime('hex')); // RFC 5054 3072-bit
const g = 2n;

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let r = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) r = (r * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return r;
}
function padHex(v: bigint): string {
  let h = v.toString(16);
  if (h.length % 2 === 1) h = '0' + h;
  else if ('89abcdef'.includes(h[0])) h = '00' + h;
  return h;
}
const sha256Hex = (buf: Buffer | string) => crypto.createHash('sha256').update(buf).digest('hex');
const hexHash = (hex: string) => sha256Hex(Buffer.from(hex, 'hex'));

function srpTimestamp(d = new Date()): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = (n: number) => String(n).padStart(2, '0');
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${d.getUTCDate()} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC ${d.getUTCFullYear()}`;
}

async function cognitoCall(target: string, body: unknown): Promise<Record<string, any>> {
  const url = `https://cognito-idp.${STAGING.region}.amazonaws.com/`;
  assertUrl(url);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json() as Record<string, any>;
  if (!res.ok) throw new Error(`Cognito ${target} failed: ${json.__type ?? res.status}`);
  return json;
}

export async function srpLogin(email: string, password: string): Promise<string> {
  const k = BigInt('0x' + hexHash(padHex(N) + padHex(g)));
  let a = 0n, A = 0n;
  while (A % N === 0n) {
    a = BigInt('0x' + crypto.randomBytes(128).toString('hex')) % N;
    A = modPow(g, a, N);
  }
  const init = await cognitoCall('InitiateAuth', {
    AuthFlow: 'USER_SRP_AUTH',
    ClientId: STAGING.clientId,
    AuthParameters: { USERNAME: email, SRP_A: A.toString(16) },
  });
  const cp = init.ChallengeParameters as Record<string, string>;
  const B = BigInt('0x' + cp.SRP_B);
  const salt = BigInt('0x' + cp.SALT);
  const userId = cp.USER_ID_FOR_SRP;
  const poolName = STAGING.userPoolId.split('_')[1];

  const u = BigInt('0x' + hexHash(padHex(A) + padHex(B)));
  const x = BigInt('0x' + hexHash(padHex(salt) + sha256Hex(`${poolName}${userId}:${password}`)));
  const base = (((B - k * modPow(g, x, N)) % N) + N) % N;
  const S = modPow(base, a + u * x, N);

  const prk = crypto.createHmac('sha256', Buffer.from(padHex(u), 'hex')).update(Buffer.from(padHex(S), 'hex')).digest();
  const hkdf = crypto.createHmac('sha256', prk)
    .update(Buffer.concat([Buffer.from('Caldera Derived Key', 'utf8'), Buffer.from([1])]))
    .digest().subarray(0, 16);
  const timestamp = srpTimestamp();
  const signature = crypto.createHmac('sha256', hkdf).update(Buffer.concat([
    Buffer.from(poolName, 'utf8'),
    Buffer.from(userId, 'utf8'),
    Buffer.from(cp.SECRET_BLOCK, 'base64'),
    Buffer.from(timestamp, 'utf8'),
  ])).digest('base64');

  const resp = await cognitoCall('RespondToAuthChallenge', {
    ChallengeName: 'PASSWORD_VERIFIER',
    ClientId: STAGING.clientId,
    ChallengeResponses: {
      USERNAME: userId,
      PASSWORD_CLAIM_SECRET_BLOCK: cp.SECRET_BLOCK,
      TIMESTAMP: timestamp,
      PASSWORD_CLAIM_SIGNATURE: signature,
    },
  });
  const idToken = resp.AuthenticationResult?.IdToken as string | undefined;
  if (!idToken) throw new Error(`SRP login did not return tokens (challenge: ${resp.ChallengeName ?? 'none'})`);
  return idToken;
}

export function jwtPayload(token: string): Record<string, any> {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'));
}

// ---------------------------------------------------------------------------
// Actors
// ---------------------------------------------------------------------------

export type Actor = {
  name: string;
  idToken: string;
  sub: string;
  /** Cognito identity-pool id; the folder under public/originals/ this actor may write. */
  identityId: string;
  creds: AwsCredentialIdentity;
  s3: S3Client;
};

export async function signedFetch(
  creds: AwsCredentialIdentity, service: string, url: string, method: string, body: string, contentType: string,
): Promise<Response> {
  assertUrl(url);
  const u = new URL(url);
  const signer = new SignatureV4({ service, region: STAGING.region, credentials: creds, sha256: Sha256 });
  const signed = await signer.sign({
    method,
    protocol: 'https:',
    hostname: u.hostname,
    path: u.pathname,
    query: {},
    headers: { host: u.hostname, 'content-type': contentType },
    body,
  });
  return fetch(url, { method, headers: signed.headers as Record<string, string>, body });
}

export async function assertStagingAccount(creds: AwsCredentialIdentity, who: string): Promise<void> {
  const res = await signedFetch(
    creds, 'sts', 'https://sts.amazonaws.com/', 'POST',
    'Action=GetCallerIdentity&Version=2011-06-15', 'application/x-www-form-urlencoded; charset=utf-8',
  );
  const text = await res.text();
  const account = /<Account>(\d+)<\/Account>/.exec(text)?.[1];
  if (account === PROD_ACCOUNT) abort(`${who} credentials resolve to PRODUCTION`);
  if (account !== STAGING.account) abort(`${who} credentials are not in the staging account`);
}

export async function makeActor(name: string, emailVar: string, passwordVar: string): Promise<Actor> {
  const email = process.env[emailVar];
  const password = process.env[passwordVar];
  if (!email || !password) throw new Error(`${emailVar}/${passwordVar} missing from .env`);
  const idToken = await srpLogin(email, password);
  const payload = jwtPayload(idToken);
  if (payload.iss !== `https://cognito-idp.${STAGING.region}.amazonaws.com/${STAGING.userPoolId}`) {
    abort(`${name} token issuer is not the staging user pool`);
  }
  const provider = fromCognitoIdentityPool({
    identityPoolId: STAGING.identityPoolId,
    logins: { [`cognito-idp.${STAGING.region}.amazonaws.com/${STAGING.userPoolId}`]: idToken },
    clientConfig: { region: STAGING.region },
  });
  const creds = await provider();
  await assertStagingAccount(creds, name);
  if (!/^us-east-1:[0-9a-f-]{36}$/.test(creds.identityId)) abort(`${name} has an unexpected identity id`);
  const s3 = new S3Client({ region: STAGING.region, credentials: creds });
  return { name, idToken, sub: payload.sub as string, identityId: creds.identityId, creds, s3 };
}

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

export type GqlResult = { data: Record<string, any> | null; errors: { message: string; errorType?: string }[] | null };

export async function gqlRaw(actor: Actor, query: string, variables: Record<string, unknown> = {}): Promise<GqlResult> {
  assertUrl(STAGING.appsync);
  const res = await fetch(STAGING.appsync, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: actor.idToken },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as { data?: Record<string, any>; errors?: { message: string }[] };
  return { data: json.data ?? null, errors: json.errors?.length ? json.errors : null };
}

export async function gql(actor: Actor, query: string, variables: Record<string, unknown> = {}): Promise<Record<string, any>> {
  const r = await gqlRaw(actor, query, variables);
  if (r.errors) throw new Error(`${actor.name}: ${r.errors.map(e => e.message).join('; ')}`);
  return r.data ?? {};
}

export const isAuthError = (r: GqlResult) =>
  !!r.errors?.some(e => /not authorized|unauthorized|access denied/i.test(`${e.errorType ?? ''} ${e.message}`));

/**
 * Pages through a list/sync/index query and collects every item returned.
 * Stops on an error page (recorded) or when the scan is exhausted.
 */
export async function collectAll(
  actor: Actor, query: string, field: string, variables: Record<string, unknown>, maxPages = 400,
): Promise<{ items: Record<string, any>[]; errors: GqlResult['errors']; pages: number; complete: boolean }> {
  const items: Record<string, any>[] = [];
  let nextToken: string | null = null;
  let pages = 0;
  do {
    const r = await gqlRaw(actor, query, { ...variables, nextToken });
    pages++;
    const conn = r.data?.[field];
    if (conn?.items) items.push(...conn.items.filter(Boolean));
    if (r.errors) return { items, errors: r.errors, pages, complete: false };
    nextToken = conn?.nextToken ?? null;
  } while (nextToken && pages < maxPages);
  return { items, errors: null, pages, complete: !nextToken };
}

export async function adminS3Client(): Promise<S3Client> {
  const adminCreds = await fromIni({ profile: 'kiyanaw-staging' })();
  await assertStagingAccount(adminCreds, 'kiyanaw-staging profile');
  return new S3Client({ region: STAGING.region, credentials: adminCreds });
}
