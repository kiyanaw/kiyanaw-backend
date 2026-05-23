#!/usr/bin/env node

/**
 * Amplify Post-Publish Hook
 *
 * This hook runs automatically after `amplify publish` completes successfully.
 * It deploys the Serverless Framework stack to ensure custom infrastructure
 * stays in sync with the current Amplify environment.
 *
 * Note: `amplify publish` internally runs `amplify push` first, so this hook
 * will run after both the backend push and frontend publish are complete.
 *
 * To skip this hook, use: amplify publish --no-hooks
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { getAmplifyEnv, getGitContext, projectRoot, readStartFile, deleteStartFile } from './lib/deploy-context.js';
import { getWebhookUrl, postToSlack, buildFinishMessage } from './lib/slack.js';

let input = '';
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', async () => {
  const notifyFinish = async ({ success, stage = null, error = null }) => {
    try {
      const { envName, awsProfile } = getAmplifyEnv();
      const webhookUrl = getWebhookUrl(awsProfile, envName);
      if (!webhookUrl) return;
      const startData = readStartFile(envName);
      const durationMs = startData ? Date.now() - startData.startedAt : null;
      const ctx = startData ?? { lifecycle: 'publish', ...getGitContext() };
      await postToSlack(
        webhookUrl,
        buildFinishMessage({ ...ctx, envName, success, stage, error, durationMs })
      );
      deleteStartFile(envName);
    } catch (notifyErr) {
      console.warn('Warning: Slack finish notification failed:', notifyErr.message);
    }
  };

  try {
    const hookData = JSON.parse(input);

    if (hookData.error) {
      console.log('Amplify publish encountered an error. Skipping Serverless deployment.');
      await notifyFinish({ success: false, stage: 'amplify publish', error: String(hookData.error) });
      process.exit(0);
    }

    console.log('\n========================================');
    console.log('🚀 Post-Publish Hook: Deploying Serverless Infrastructure');
    console.log('========================================\n');

    // Sync Amplify environment context
    console.log('📋 Syncing Amplify environment context...');
    execSync('node scripts/serverless/get-amplify-env.js', {
      cwd: projectRoot,
      stdio: 'inherit',
    });

    // Read the synced environment to show what we're deploying to
    const amplifyEnvPath = path.join(projectRoot, 'scripts', 'serverless', 'amplify-env.json');
    const amplifyEnv = JSON.parse(readFileSync(amplifyEnvPath, 'utf8'));
    console.log(`\n✓ Environment: ${amplifyEnv.envName}`);
    console.log(`✓ Region: ${amplifyEnv.region}`);
    console.log(`✓ Profile: ${amplifyEnv.awsProfile}\n`);

    // Discover VPC information
    console.log('🔍 Discovering VPC configuration...');
    execSync('node scripts/serverless/get-vpc-info.js', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    console.log('');

    // Deploy Serverless stack
    let deploySuccess = true;
    let failedStage = null;
    let failedError = null;

    console.log('📦 Deploying Serverless stack...\n');
    try {
      execSync('npx serverless deploy', {
        cwd: projectRoot,
        stdio: 'inherit',
      });
      console.log('\n========================================');
      console.log('✅ Serverless deployment completed successfully!');
      console.log('========================================\n');
    } catch (slsError) {
      deploySuccess = false;
      failedStage = 'serverless deploy';
      failedError = slsError.message;
      console.error('\n❌ Serverless deployment failed:', slsError.message);
      console.error('You may need to manually run: npm run serverless:deploy\n');
    }

    // Attach VPC and EFS to Lambda functions
    console.log('🔗 Attaching VPC and EFS to Lambda functions...\n');
    try {
      execSync('node scripts/serverless/attach-lambda-vpc-efs.js', {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    } catch (attachError) {
      console.warn('\n⚠ Warning: Could not attach VPC/EFS to Lambda functions.');
      console.warn("This is normal if the Lambdas are being updated or don't exist yet.");
      console.warn('You can manually run: node scripts/serverless/attach-lambda-vpc-efs.js\n');
    }

    // CloudFront cache invalidation (only for staging and production)
    console.log('\n');
    try {
      execSync('node scripts/serverless/invalidate-cloudfront.js', {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    } catch (cfError) {
      if (deploySuccess) {
        deploySuccess = false;
        failedStage = 'cloudfront invalidation';
        failedError = cfError.message;
      }
      console.warn('\n⚠ Warning: CloudFront invalidation failed.');
      console.warn('You can manually run: node scripts/serverless/invalidate-cloudfront.js\n');
    }

    await notifyFinish({ success: deploySuccess, stage: failedStage, error: failedError });
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error in post-publish hook:', error.message);
    console.error('\nServerless deployment failed. Your Amplify changes were deployed successfully,');
    console.error('but you may need to manually run: npm run serverless:deploy\n');
    await notifyFinish({ success: false, stage: 'serverless deploy', error: error.message });

    // Exit with 0 to not block the Amplify CLI
    // Change to process.exit(1) if you want to fail the entire publish on Serverless errors
    process.exit(0);
  }
});
