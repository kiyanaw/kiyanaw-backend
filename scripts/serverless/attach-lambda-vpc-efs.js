#!/usr/bin/env node

/**
 * Attach VPC and EFS to Amplify Lambda Functions
 *
 * This script automatically attaches VPC configuration and EFS file systems
 * to the createPeaksFile and spellcheck Lambda functions if not already attached.
 */

import { LambdaClient, GetFunctionConfigurationCommand, UpdateFunctionConfigurationCommand } from '@aws-sdk/client-lambda';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { fromIni } from '@aws-sdk/credential-providers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Read environment files (in same directory as this script)
const amplifyEnvPath = path.join(__dirname, 'amplify-env.json');
const vpcInfoPath = path.join(__dirname, 'vpc-info.json');

if (!fs.existsSync(amplifyEnvPath)) {
  console.error('Error: amplify-env.json not found. Run get-amplify-env.js first.');
  process.exit(1);
}

if (!fs.existsSync(vpcInfoPath)) {
  console.error('Error: vpc-info.json not found. Run get-vpc-info.js first.');
  process.exit(1);
}

const amplifyEnv = JSON.parse(fs.readFileSync(amplifyEnvPath, 'utf8'));
const vpcInfo = JSON.parse(fs.readFileSync(vpcInfoPath, 'utf8'));

const credentials = fromIni({ profile: amplifyEnv.awsProfile });

const lambdaClient = new LambdaClient({
  region: amplifyEnv.region,
  credentials,
});

const cfnClient = new CloudFormationClient({
  region: amplifyEnv.region,
  credentials,
});

// Get Serverless stack outputs
async function getServerlessOutputs() {
  try {
    const stackName = `kiyanaw-serverless-${amplifyEnv.envName}`;
    const response = await cfnClient.send(
      new DescribeStacksCommand({ StackName: stackName })
    );

    const outputs = {};
    response.Stacks[0].Outputs.forEach((output) => {
      outputs[output.OutputKey] = output.OutputValue;
    });

    return outputs;
  } catch (error) {
    console.error('Error getting Serverless stack outputs:', error.message);
    console.error('Make sure the Serverless stack is deployed first.');
    process.exit(1);
  }
}

// Check if Lambda already has VPC config
function hasVpcConfig(config) {
  return config.VpcConfig && config.VpcConfig.VpcId && config.VpcConfig.VpcId !== '';
}

// Check if Lambda already has EFS mounted
function hasEfsMounted(config, mountPath) {
  if (!config.FileSystemConfigs || config.FileSystemConfigs.length === 0) {
    return false;
  }
  return config.FileSystemConfigs.some((fs) => fs.LocalMountPath === mountPath);
}

// Attach VPC and EFS to a Lambda function
async function attachVpcAndEfs(functionName, efsAccessPointArn, mountPath) {
  try {
    console.log(`\nChecking ${functionName}...`);

    // Get current Lambda configuration
    const getConfigResponse = await lambdaClient.send(
      new GetFunctionConfigurationCommand({ FunctionName: functionName })
    );

    const hasVpc = hasVpcConfig(getConfigResponse);
    const hasEfs = hasEfsMounted(getConfigResponse, mountPath);

    if (hasVpc && hasEfs) {
      console.log(`✓ ${functionName} already has VPC and EFS configured`);
      return;
    }

    console.log(`Updating ${functionName}...`);

    const updateParams = {
      FunctionName: functionName,
    };

    // Add VPC config if not present
    if (!hasVpc) {
      console.log(`  - Adding VPC configuration`);
      updateParams.VpcConfig = {
        SubnetIds: vpcInfo.subnetIds.slice(0, 2), // Use first 2 subnets
        SecurityGroupIds: [vpcInfo.securityGroupId],
      };
    }

    // Add EFS if not present
    if (!hasEfs) {
      console.log(`  - Adding EFS mount at ${mountPath}`);
      updateParams.FileSystemConfigs = [
        ...(getConfigResponse.FileSystemConfigs || []),
        {
          Arn: efsAccessPointArn,
          LocalMountPath: mountPath,
        },
      ];
    }

    // Only update if there are changes
    if (updateParams.VpcConfig || updateParams.FileSystemConfigs) {
      await lambdaClient.send(new UpdateFunctionConfigurationCommand(updateParams));
      console.log(`✓ ${functionName} updated successfully`);

      // Wait a bit for the update to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.error(`✗ Lambda function ${functionName} not found`);
    } else if (error.name === 'ResourceConflictException') {
      console.log(`⚠ ${functionName} is being updated, skipping...`);
    } else {
      console.error(`✗ Error updating ${functionName}:`, error.message);
    }
  }
}

async function main() {
  try {
    console.log('========================================');
    console.log('Attaching VPC and EFS to Lambda Functions');
    console.log('========================================');

    // Get Serverless stack outputs
    console.log('\nGetting Serverless stack outputs...');
    const outputs = await getServerlessOutputs();

    // Attach VPC and EFS to createPeaksFile
    await attachVpcAndEfs(
      `createPeaksFile-${amplifyEnv.envName}`,
      outputs.CreatePeaksFileEFSAccessPointArn,
      '/mnt/temp'
    );

    console.log('\n========================================');
    console.log('✅ Lambda VPC/EFS attachment complete!');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
