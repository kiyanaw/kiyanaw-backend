#!/usr/bin/env node

/**
 * CloudFront Cache Invalidation
 *
 * This script invalidates the CloudFront cache for the appropriate distribution
 * based on the current Amplify environment.
 *
 * Only runs for staging (bundle.kiyanaw.dev) and production (bundle.kiyanaw.net).
 */

import {
  CloudFrontClient,
  ListDistributionsCommand,
  CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront';
import { fromIni } from '@aws-sdk/credential-providers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read amplify environment
const amplifyEnvPath = path.join(__dirname, 'amplify-env.json');
if (!fs.existsSync(amplifyEnvPath)) {
  console.error('Error: amplify-env.json not found. Run get-amplify-env.js first.');
  process.exit(1);
}

const amplifyEnv = JSON.parse(fs.readFileSync(amplifyEnvPath, 'utf8'));

// Domain mapping
const cloudFrontDomains = {
  staging: 'bundle.kiyanaw.dev',
  production: 'bundle.kiyanaw.net',
};

const domain = cloudFrontDomains[amplifyEnv.envName];

if (!domain) {
  console.log(`ℹ Skipping CloudFront invalidation (environment: ${amplifyEnv.envName})`);
  process.exit(0);
}

const cloudFrontClient = new CloudFrontClient({
  region: 'us-east-1', // CloudFront is global but API is in us-east-1
  credentials: fromIni({ profile: amplifyEnv.awsProfile }),
});

async function findDistributionByDomain(targetDomain) {
  let marker;

  do {
    const command = new ListDistributionsCommand({
      Marker: marker,
    });

    const response = await cloudFrontClient.send(command);
    const distributions = response.DistributionList?.Items || [];

    for (const dist of distributions) {
      const aliases = dist.Aliases?.Items || [];
      if (aliases.includes(targetDomain)) {
        return dist.Id;
      }
    }

    marker = response.DistributionList?.NextMarker;
  } while (marker);

  return null;
}

async function createInvalidation(distributionId) {
  const command = new CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `invalidation-${Date.now()}`,
      Paths: {
        Quantity: 2,
        Items: ['/*', '/'],
      },
    },
  });

  const response = await cloudFrontClient.send(command);
  return response.Invalidation;
}

async function main() {
  console.log('========================================');
  console.log('🌐 CloudFront Cache Invalidation');
  console.log('========================================\n');

  console.log(`Environment: ${amplifyEnv.envName}`);
  console.log(`Target domain: ${domain}`);

  try {
    // Find distribution
    console.log('\nLooking up CloudFront distribution...');
    const distributionId = await findDistributionByDomain(domain);

    if (!distributionId) {
      console.warn(`\n⚠ Could not find CloudFront distribution for ${domain}`);
      console.warn('Please verify the domain alias is configured in CloudFront.');
      process.exit(1);
    }

    console.log(`Distribution ID: ${distributionId}`);

    // Create invalidation
    console.log('\nCreating invalidation for paths: /*, /');
    const invalidation = await createInvalidation(distributionId);

    console.log(`\n✅ Invalidation created successfully!`);
    console.log(`   Invalidation ID: ${invalidation.Id}`);
    console.log(`   Status: ${invalidation.Status}`);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
