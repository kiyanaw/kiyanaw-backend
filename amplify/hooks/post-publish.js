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
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read hook input from stdin
let input = '';
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input);

    // Check if the publish was successful
    if (hookData.error) {
      console.log('Amplify publish encountered an error. Skipping Serverless deployment.');
      process.exit(0);
    }

    console.log('\n========================================');
    console.log('🚀 Post-Publish Hook: Deploying Serverless Infrastructure');
    console.log('========================================\n');

    // Get the project root (two levels up from amplify/hooks/)
    const projectRoot = path.resolve(__dirname, '..', '..');

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
    console.log('📦 Deploying Serverless stack...\n');
    execSync('npx serverless deploy', {
      cwd: projectRoot,
      stdio: 'inherit',
    });

    console.log('\n========================================');
    console.log('✅ Serverless deployment completed successfully!');
    console.log('========================================\n');

    // Attach VPC and EFS to Lambda functions
    console.log('🔗 Attaching VPC and EFS to Lambda functions...\n');
    try {
      execSync('node scripts/serverless/attach-lambda-vpc-efs.js', {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    } catch (attachError) {
      console.warn('\n⚠ Warning: Could not attach VPC/EFS to Lambda functions.');
      console.warn('This is normal if the Lambdas are being updated or don\'t exist yet.');
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
      console.warn('\n⚠ Warning: CloudFront invalidation failed.');
      console.warn('You can manually run: node scripts/serverless/invalidate-cloudfront.js\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error in post-publish hook:', error.message);
    console.error('\nServerless deployment failed. Your Amplify changes were deployed successfully,');
    console.error('but you may need to manually run: npm run serverless:deploy\n');

    // Exit with 0 to not block the Amplify CLI
    // Change to process.exit(1) if you want to fail the entire publish on Serverless errors
    process.exit(0);
  }
});
