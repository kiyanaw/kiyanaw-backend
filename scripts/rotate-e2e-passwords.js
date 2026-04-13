#!/usr/bin/env node

/**
 * E2E test-user password rotation tool
 *
 * Generates strong random passwords for the 3 staging Playwright test users,
 * sets them in Cognito (--permanent so no forced-change challenge), and stores
 * them in AWS SSM Parameter Store as SecureString values under:
 *
 *   /kiyanaw/e2e/staging/owner-password
 *   /kiyanaw/e2e/staging/editor-password
 *   /kiyanaw/e2e/staging/viewer-password
 *
 * Run:  npm run rotate:e2e-passwords
 *
 * After rotation, run `npm run setup:e2e` to pull the new passwords into .env.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

/**
 * Generate a 24-character password that satisfies the default Cognito password policy:
 * at least one uppercase, one lowercase, one digit, one symbol.
 * Characters drawn from a safe set (no shell-special chars that need quoting).
 */
function generatePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#%^&*()-_=+';
  const all = upper + lower + digits + symbols;

  // Guarantee at least one of each required class
  const pick = (pool) => pool[randomBytes(1)[0] % pool.length];
  const guaranteed = [pick(upper), pick(lower), pick(digits), pick(symbols)];

  const remaining = Array.from({ length: 20 }, () => pick(all));
  const chars = [...guaranteed, ...remaining];

  // Fisher-Yates shuffle so the guaranteed chars aren't always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

function exec(cmd) {
  return execSync(cmd, { cwd: projectRoot, stdio: ['pipe', 'pipe', 'inherit'] }).toString().trim();
}

console.log('\n========================================');
console.log('rotate-e2e-passwords: Rotating Cognito + SSM credentials');
console.log('========================================\n');

// --- 1. Resolve environment and profile ---
const localEnvInfo = readJsonFile(path.join(projectRoot, 'amplify', '.config', 'local-env-info.json'));
const envName = localEnvInfo.envName;

if (envName !== 'staging') {
  console.error(`ERROR: This script only operates against the "staging" Amplify environment.`);
  console.error(`       Current environment is "${envName}". Check out the staging env first:`);
  console.error(`       amplify env checkout staging`);
  process.exit(1);
}

const localAwsInfo = readJsonFile(path.join(projectRoot, 'amplify', '.config', 'local-aws-info.json'));
const awsProfile = localAwsInfo[envName]?.profileName || 'default';
const region = 'us-east-1';

console.log(`Amplify env : ${envName}`);
console.log(`AWS profile : ${awsProfile}`);
console.log(`Region      : ${region}\n`);

// --- 2. Resolve the staging Cognito User Pool ID from amplify-meta.json ---
const amplifyMetaPath = path.join(projectRoot, 'amplify', 'backend', 'amplify-meta.json');
let amplifyMeta;
try {
  amplifyMeta = readJsonFile(amplifyMetaPath);
} catch {
  console.error(`ERROR: Could not read ${amplifyMetaPath}`);
  console.error('Make sure you have run `amplify pull` or `amplify push` at least once.');
  process.exit(1);
}

const authResources = amplifyMeta?.auth || {};
const authKeys = Object.keys(authResources);
const poolIds = authKeys
  .map((k) => authResources[k]?.output?.UserPoolId)
  .filter(Boolean);

if (poolIds.length === 0) {
  console.error('ERROR: No UserPoolId found in amplify/backend/amplify-meta.json.');
  console.error('Make sure you have run `amplify pull` or `amplify push` so the file is populated.');
  process.exit(1);
}
if (poolIds.length > 1) {
  console.error('ERROR: Multiple UserPoolIds found in amplify-meta.json:');
  poolIds.forEach((id) => console.error(`  ${id}`));
  console.error('Cannot determine which pool to use. Aborting.');
  process.exit(1);
}

const userPoolId = poolIds[0];
console.log(`User Pool ID: ${userPoolId}\n`);

// --- 3. Rotate each user ---
const users = [
  { role: 'owner',  email: 'owner@kiyanaw.dev' },
  { role: 'editor', email: 'editor@kiyanaw.dev' },
  { role: 'viewer', email: 'viewer@kiyanaw.dev' },
];

const ssmBase = '/kiyanaw/e2e/staging';

for (const { role, email } of users) {
  console.log(`Rotating ${role} (${email})...`);

  const password = generatePassword();
  const paramName = `${ssmBase}/${role}-password`;

  // Set password in Cognito (--permanent avoids forced-change challenge)
  exec(
    `aws cognito-idp admin-set-user-password` +
    ` --user-pool-id ${userPoolId}` +
    ` --username ${email}` +
    ` --password '${password}'` +
    ` --permanent` +
    ` --profile ${awsProfile} --region ${region}`
  );

  // Store in SSM as SecureString
  exec(
    `aws ssm put-parameter` +
    ` --name ${paramName}` +
    ` --type SecureString` +
    ` --value '${password}'` +
    ` --overwrite` +
    ` --profile ${awsProfile} --region ${region}` +
    ` --output json`
  );

  console.log(`  ✓ Cognito password set`);
  console.log(`  ✓ SSM parameter written: ${paramName}`);
}

console.log('\n========================================');
console.log('All 3 users rotated successfully.');
console.log(`Passwords are stored at ${ssmBase}/<role>-password`);
console.log('Run `npm run setup:e2e` to pull them into your .env file.');
console.log('========================================\n');
