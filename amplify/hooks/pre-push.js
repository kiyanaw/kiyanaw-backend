#!/usr/bin/env node

/**
 * Amplify Pre-Push Hook
 *
 * Fires before both `amplify push` and `amplify publish`. Sends a "deployment
 * started" notification to Slack and writes a timestamp file so post-hooks can
 * compute duration.
 *
 * To skip this hook, use: amplify push --no-hooks
 */

import { getAmplifyEnv, getGitContext, getSystemContext, writeStartFile } from './lib/deploy-context.js';
import { getWebhookUrl, postToSlack, buildStartMessage } from './lib/slack.js';

let input = '';
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', async () => {
  try {
    const hookData = JSON.parse(input);
    if (hookData.error) {
      process.exit(0);
    }

    const { envName, awsProfile } = getAmplifyEnv();
    const lifecycle = hookData.data?.amplify?.command ?? 'push';
    const git = getGitContext();
    const sys = getSystemContext();

    writeStartFile(envName, { startedAt: Date.now(), lifecycle, ...git, ...sys });

    const webhookUrl = getWebhookUrl(awsProfile, envName);
    if (!webhookUrl) {
      console.log('Slack deploy-webhook not configured for this environment, skipping start notification.');
      process.exit(0);
    }

    await postToSlack(webhookUrl, buildStartMessage({ envName, lifecycle, ...git, ...sys }));
  } catch (err) {
    console.warn('Warning: Slack start notification failed:', err.message);
  }

  process.exit(0);
});
