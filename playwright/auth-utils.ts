/**
 * Shared auth utilities for global-setup and global-teardown.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Returns the Amplify environment name to use for this test run.
 *
 * Resolution order:
 *  1. PLAYWRIGHT_AMPLIFY_ENV env var (set by test:e2e:staging / test:e2e:production scripts)
 *  2. amplify/.config/local-env-info.json (whichever env is currently checked out)
 *  3. Falls back to "local"
 */
export function getEnvName(): string {
  if (process.env.PLAYWRIGHT_AMPLIFY_ENV) return process.env.PLAYWRIGHT_AMPLIFY_ENV;
  try {
    const info = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../amplify/.config/local-env-info.json'), 'utf-8'),
    );
    return info.envName as string;
  } catch {
    return 'local';
  }
}

/**
 * Returns the base URL for the current test environment.
 * Falls back to PLAYWRIGHT_BASE_URL if set (backwards-compatible).
 */
export function getBaseURL(): string {
  if (process.env.PLAYWRIGHT_BASE_URL) return process.env.PLAYWRIGHT_BASE_URL;
  try {
    const cfg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, 'env-config.json'), 'utf-8'),
    );
    return (cfg[getEnvName()]?.baseURL as string) ?? '';
  } catch {
    return '';
  }
}

export type StoredAuth = {
  idToken: string;
  refreshToken: string;
  clientId: string;
  sub: string;
};

export function isTokenExpired(token: string): boolean {
  try {
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'));
    return (payload.exp as number) * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function extractAuth(authFile: string): StoredAuth | null {
  try {
    const state = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    const storage: { name: string; value: string }[] = state?.origins?.[0]?.localStorage ?? [];

    const idEntry = storage.find(e => e.name.endsWith('.idToken'));
    const refreshEntry = storage.find(e => e.name.endsWith('.refreshToken'));
    if (!idEntry || !refreshEntry) return null;

    // Key format: CognitoIdentityServiceProvider.{clientId}.{sub}.idToken
    const clientId = idEntry.name.split('.')[1];
    const [, payloadB64] = idEntry.value.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'));

    return { idToken: idEntry.value, refreshToken: refreshEntry.value, clientId, sub: payload.sub as string };
  } catch {
    return null;
  }
}

export async function refreshIdToken(clientId: string, refreshToken: string, region: string): Promise<string> {
  const res = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: clientId,
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    }),
  });
  const json = await res.json() as { AuthenticationResult?: { IdToken?: string } };
  const idToken = json.AuthenticationResult?.IdToken;
  if (!idToken) throw new Error(`Token refresh failed: ${JSON.stringify(json)}`);
  return idToken;
}

/**
 * Updates the idToken entry in a stored auth JSON file.
 */
export function updateIdTokenInFile(authFile: string, newIdToken: string): void {
  const state = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
  const storage: { name: string; value: string }[] = state?.origins?.[0]?.localStorage ?? [];
  const entry = storage.find(e => e.name.endsWith('.idToken'));
  if (entry) entry.value = newIdToken;
  fs.writeFileSync(authFile, JSON.stringify(state, null, 2));
}
