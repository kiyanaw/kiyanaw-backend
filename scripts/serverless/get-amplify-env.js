#!/usr/bin/env node

/**
 * Extract Amplify environment configuration and make it available to Serverless Framework
 *
 * This script reads the current Amplify environment from:
 * - amplify/.config/local-env-info.json (current environment)
 * - amplify/.config/local-aws-info.json (AWS profile)
 * - amplify/team-provider-info.json (environment details)
 *
 * And outputs a JSON file (amplify-env.json) that Serverless can use.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..', '..');

// Read Amplify config files
const localEnvInfoPath = path.join(projectRoot, 'amplify', '.config', 'local-env-info.json');
const localAwsInfoPath = path.join(projectRoot, 'amplify', '.config', 'local-aws-info.json');
const teamProviderInfoPath = path.join(projectRoot, 'amplify', 'team-provider-info.json');

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Get current Amplify environment
const localEnvInfo = readJsonFile(localEnvInfoPath);
const currentEnv = localEnvInfo.envName;

if (!currentEnv) {
  console.error('Could not determine current Amplify environment');
  process.exit(1);
}

// Get AWS profile for this environment
const localAwsInfo = readJsonFile(localAwsInfoPath);
const awsProfile = localAwsInfo[currentEnv]?.profileName || 'default';

// Get environment details
const teamProviderInfo = readJsonFile(teamProviderInfoPath);
const envInfo = teamProviderInfo[currentEnv];

if (!envInfo) {
  console.error(`Environment "${currentEnv}" not found in team-provider-info.json`);
  process.exit(1);
}

const awsCloudFormation = envInfo.awscloudformation;

// Build the output object
const amplifyEnv = {
  envName: currentEnv,
  region: awsCloudFormation.Region,
  awsProfile: awsProfile,
  deploymentBucket: awsCloudFormation.DeploymentBucketName,
  amplifyAppId: awsCloudFormation.AmplifyAppId,
  stackName: awsCloudFormation.StackName,
  authRoleName: awsCloudFormation.AuthRoleName,
  unauthRoleName: awsCloudFormation.UnauthRoleName,
};

// Write to amplify-env.json in the same directory as this script
const outputPath = path.join(__dirname, 'amplify-env.json');
fs.writeFileSync(outputPath, JSON.stringify(amplifyEnv, null, 2));

console.log(`Amplify environment context written to scripts/serverless/amplify-env.json:`);
console.log(`  Environment: ${amplifyEnv.envName}`);
console.log(`  Region: ${amplifyEnv.region}`);
console.log(`  AWS Profile: ${amplifyEnv.awsProfile}`);
console.log(`  Deployment Bucket: ${amplifyEnv.deploymentBucket}`);
