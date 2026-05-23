#!/usr/bin/env node

/**
 * Amplify Pre-Publish Hook
 *
 * Before `amplify publish` builds the frontend, this hook:
 *   1. Sends a deploy-start notification to Slack and records a timestamp for duration tracking.
 *   2. Fetches the spellcheck API key from API Gateway and writes VITE_SPELLCHECK_API_BASE_URL
 *      and VITE_SPELLCHECK_API_KEY to .env.local so Vite bakes them into the build.
 *
 * The API key is looked up by name: transcribe-<envName> (e.g. transcribe-staging)
 * Base URL is derived from the env: staging → api.kiyanaw.dev, production → api.kiyanaw.net
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { getAmplifyEnv, getGitContext, getSystemContext, writeStartFile, projectRoot } from './lib/deploy-context.js';
import { getWebhookUrl, postToSlack, buildStartMessage } from './lib/slack.js';

function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

const BASE_URLS = {
  staging: 'https://api.kiyanaw.dev',
  production: 'https://api.kiyanaw.net',
};

// Read hook input from stdin
let input = '';
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', async () => {
  try {
    const hookData = JSON.parse(input);

    if (hookData.error) {
      console.log('Amplify encountered an error before pre-publish. Skipping spellcheck env setup.');
      process.exit(0);
    }

    // Send deploy start notification and record timestamp for duration tracking
    try {
      const { envName, awsProfile } = getAmplifyEnv();
      const git = getGitContext();
      const sys = getSystemContext();
      const lifecycle = hookData.data?.amplify?.command ?? 'publish';
      writeStartFile(envName, { startedAt: Date.now(), lifecycle, ...git, ...sys });
      const webhookUrl = getWebhookUrl(awsProfile, envName);
      if (webhookUrl) {
        await postToSlack(webhookUrl, buildStartMessage({ envName, lifecycle, ...git, ...sys }));
      } else {
        console.log('Slack deploy-webhook not configured for this environment, skipping start notification.');
      }
    } catch (notifyErr) {
      console.warn('Warning: Slack start notification failed:', notifyErr.message);
    }

    console.log('\n========================================');
    console.log('Pre-Publish Hook: Setting up spellcheck API env');
    console.log('========================================\n');

    // Determine current Amplify environment and AWS profile
    const localEnvInfo = readJsonFile(path.join(projectRoot, 'amplify', '.config', 'local-env-info.json'));
    const envName = localEnvInfo.envName;

    const localAwsInfo = readJsonFile(path.join(projectRoot, 'amplify', '.config', 'local-aws-info.json'));
    const awsProfile = localAwsInfo[envName]?.profileName || 'default';

    console.log(`Environment: ${envName}`);
    console.log(`AWS Profile: ${awsProfile}`);

    const baseUrl = BASE_URLS[envName];
    if (!baseUrl) {
      console.warn(`Warning: No spellcheck base URL configured for env "${envName}". Skipping.`);
      process.exit(0);
    }

    // Fetch the API key value from API Gateway by name
    const keyName = `transcribe-${envName}`;
    console.log(`\nFetching API key "${keyName}" from API Gateway...`);

    const apiKeyJson = execSync(
      `aws apigateway get-api-keys --name-query "${keyName}" --include-values --query 'items[0].value' --output text --profile ${awsProfile} --region us-east-1`,
      { cwd: projectRoot }
    ).toString().trim();

    if (!apiKeyJson || apiKeyJson === 'None') {
      console.error(`Error: API key "${keyName}" not found in API Gateway.`);
      process.exit(1);
    }

    // Write .env.local
    const envLocalPath = path.join(projectRoot, '.env.local');
    let existing = '';
    try {
      existing = readFileSync(envLocalPath, 'utf8');
    } catch {
      // File doesn't exist yet, start fresh
    }

    // Replace or append each variable
    function setEnvVar(content, key, value) {
      const line = `${key}=${value}`;
      const regex = new RegExp(`^${key}=.*$`, 'm');
      return regex.test(content) ? content.replace(regex, line) : content + (content.endsWith('\n') || content === '' ? '' : '\n') + line + '\n';
    }

    let updated = existing;
    updated = setEnvVar(updated, 'VITE_SPELLCHECK_API_BASE_URL', baseUrl);
    updated = setEnvVar(updated, 'VITE_SPELLCHECK_API_KEY', apiKeyJson);

    writeFileSync(envLocalPath, updated);

    console.log(`\nWrote to .env.local:`);
    console.log(`  VITE_SPELLCHECK_API_BASE_URL=${baseUrl}`);
    console.log(`  VITE_SPELLCHECK_API_KEY=<redacted>`);

    console.log('\n========================================');
    console.log('Spellcheck env setup complete.');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\nError in pre-publish hook:', error.message);
    process.exit(1);
  }
});
