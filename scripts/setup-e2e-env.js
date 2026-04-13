#!/usr/bin/env node

/**
 * Setup script for E2E testing environment
 *
 * Fetches Playwright test-user passwords from AWS SSM Parameter Store and
 * writes a populated .env file. Safe to re-run — existing keys are updated
 * in-place without clobbering unrelated entries.
 *
 * Requires the SSM parameters to exist first. If they don't, run:
 *   npm run rotate:e2e-passwords
 *
 * SSM parameter paths:
 *   /kiyanaw/e2e/staging/owner-password
 *   /kiyanaw/e2e/staging/editor-password
 *   /kiyanaw/e2e/staging/viewer-password
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const envFile = path.join(projectRoot, '.env');

function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function exec(cmd) {
  return execSync(cmd, { cwd: projectRoot, stdio: ['pipe', 'pipe', 'inherit'] }).toString().trim();
}

/** Upsert a KEY=value line in an env-file string without touching other keys. */
function setEnvVar(content, key, value) {
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, 'm');
  return regex.test(content)
    ? content.replace(regex, line)
    : content + (content.endsWith('\n') || content === '' ? '' : '\n') + line + '\n';
}

/** Fetch a single SSM SecureString parameter value. Returns null on missing param. */
function getSsmParam(name, profile, region) {
  try {
    return exec(
      `aws ssm get-parameter` +
      ` --name ${name}` +
      ` --with-decryption` +
      ` --query Parameter.Value --output text` +
      ` --profile ${profile} --region ${region}`
    );
  } catch (err) {
    return null;
  }
}

console.log('\n========================================');
console.log('setup-e2e: Configuring Playwright environment');
console.log('========================================\n');

// --- Resolve AWS profile and region ---
const localEnvInfo = readJsonFile(path.join(projectRoot, 'amplify', '.config', 'local-env-info.json'));
const envName = localEnvInfo.envName;

const localAwsInfo = readJsonFile(path.join(projectRoot, 'amplify', '.config', 'local-aws-info.json'));
const awsProfile = localAwsInfo[envName]?.profileName || 'default';
const region = 'us-east-1';

console.log(`Amplify env : ${envName}`);
console.log(`AWS profile : ${awsProfile}\n`);

// --- Fetch passwords from SSM ---
const ssmBase = '/kiyanaw/e2e/staging';
const roles = [
  { role: 'owner',  paramSuffix: 'owner-password' },
  { role: 'editor', paramSuffix: 'editor-password' },
  { role: 'viewer', paramSuffix: 'viewer-password' },
];

const passwords = {};
const missing = [];

for (const { role, paramSuffix } of roles) {
  const paramName = `${ssmBase}/${paramSuffix}`;
  process.stdout.write(`Fetching ${paramName} ... `);
  const value = getSsmParam(paramName, awsProfile, region);
  if (value === null) {
    console.log('NOT FOUND');
    missing.push(paramName);
  } else {
    console.log('OK');
    passwords[role] = value;
  }
}

if (missing.length > 0) {
  console.error('\nERROR: The following SSM parameters were not found:');
  missing.forEach((p) => console.error(`  ${p}`));
  console.error('\nPlease run `npm run rotate:e2e-passwords` to create them, then retry.');
  process.exit(1);
}

// --- Write .env ---
let content = '';
try {
  content = readFileSync(envFile, 'utf8');
} catch {
  // File doesn't exist yet — start fresh
}

content = setEnvVar(content, 'PLAYWRIGHT_TEST_EMAIL',          'owner@kiyanaw.dev');
content = setEnvVar(content, 'PLAYWRIGHT_TEST_PASSWORD',        passwords.owner);
content = setEnvVar(content, 'PLAYWRIGHT_TEST_EMAIL_EDITOR',    'editor@kiyanaw.dev');
content = setEnvVar(content, 'PLAYWRIGHT_TEST_PASSWORD_EDITOR', passwords.editor);
content = setEnvVar(content, 'PLAYWRIGHT_TEST_EMAIL_VIEWER',    'viewer@kiyanaw.dev');
content = setEnvVar(content, 'PLAYWRIGHT_TEST_PASSWORD_VIEWER', passwords.viewer);

// Only set PLAYWRIGHT_BASE_URL if it isn't already in the file (preserve overrides)
if (!/^PLAYWRIGHT_BASE_URL=/m.test(content)) {
  content = setEnvVar(content, 'PLAYWRIGHT_BASE_URL', 'http://localhost:5173');
}

writeFileSync(envFile, content);
console.log('\n✓ .env written (passwords redacted):');
console.log('  PLAYWRIGHT_TEST_EMAIL=owner@kiyanaw.dev');
console.log('  PLAYWRIGHT_TEST_PASSWORD=<redacted>');
console.log('  PLAYWRIGHT_TEST_EMAIL_EDITOR=editor@kiyanaw.dev');
console.log('  PLAYWRIGHT_TEST_PASSWORD_EDITOR=<redacted>');
console.log('  PLAYWRIGHT_TEST_EMAIL_VIEWER=viewer@kiyanaw.dev');
console.log('  PLAYWRIGHT_TEST_PASSWORD_VIEWER=<redacted>');

// --- Ensure playwright/.auth directory exists ---
const authDir = path.join(projectRoot, 'playwright', '.auth');
if (!existsSync(authDir)) {
  mkdirSync(authDir, { recursive: true });
  console.log('\n✓ Created playwright/.auth directory for authentication state');
}

console.log('\n========================================');
console.log('E2E environment ready. Run `npm run test:e2e:staging` to test against staging.');
console.log('========================================\n');
