#!/usr/bin/env node

/**
 * Discover Default VPC Information
 *
 * This script discovers the default VPC, subnets, security groups, and route tables
 * and saves them to vpc-info.json for use by Serverless Framework.
 */

import { EC2Client, DescribeVpcsCommand, DescribeSubnetsCommand, DescribeSecurityGroupsCommand, DescribeRouteTablesCommand } from '@aws-sdk/client-ec2';
import { fromIni } from '@aws-sdk/credential-providers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..', '..');

// Read amplify environment to get region and profile (in same directory as this script)
const amplifyEnvPath = path.join(__dirname, 'amplify-env.json');
if (!fs.existsSync(amplifyEnvPath)) {
  console.error('Error: amplify-env.json not found. Run get-amplify-env.js first.');
  process.exit(1);
}

const amplifyEnv = JSON.parse(fs.readFileSync(amplifyEnvPath, 'utf8'));

const ec2Client = new EC2Client({
  region: amplifyEnv.region,
  credentials: fromIni({ profile: amplifyEnv.awsProfile }),
});

async function getVpcInfo() {
  try {
    // Get default VPC
    const vpcsResponse = await ec2Client.send(
      new DescribeVpcsCommand({
        Filters: [{ Name: 'isDefault', Values: ['true'] }],
      })
    );

    if (!vpcsResponse.Vpcs || vpcsResponse.Vpcs.length === 0) {
      throw new Error('No default VPC found in this region');
    }

    const vpcId = vpcsResponse.Vpcs[0].VpcId;
    console.log(`Found default VPC: ${vpcId}`);

    // Get subnets in default VPC
    const subnetsResponse = await ec2Client.send(
      new DescribeSubnetsCommand({
        Filters: [{ Name: 'vpc-id', Values: [vpcId] }],
      })
    );

    const subnetIds = subnetsResponse.Subnets.map((s) => s.SubnetId);
    console.log(`Found ${subnetIds.length} subnets:`, subnetIds.join(', '));

    // Get default security group
    const securityGroupsResponse = await ec2Client.send(
      new DescribeSecurityGroupsCommand({
        Filters: [
          { Name: 'vpc-id', Values: [vpcId] },
          { Name: 'group-name', Values: ['default'] },
        ],
      })
    );

    const securityGroupId = securityGroupsResponse.SecurityGroups?.[0]?.GroupId;
    console.log(`Found default security group: ${securityGroupId}`);

    // Get main route table
    const routeTablesResponse = await ec2Client.send(
      new DescribeRouteTablesCommand({
        Filters: [
          { Name: 'vpc-id', Values: [vpcId] },
          { Name: 'association.main', Values: ['true'] },
        ],
      })
    );

    const routeTableId = routeTablesResponse.RouteTables?.[0]?.RouteTableId;
    console.log(`Found main route table: ${routeTableId}`);

    // Build output object
    const vpcInfo = {
      vpcId,
      subnetIds,
      // Individual subnets for CloudFormation (avoids Fn::Split issues)
      subnet1: subnetIds[0] || '',
      subnet2: subnetIds[1] || '',
      securityGroupId,
      routeTableId,
      region: amplifyEnv.region,
      discoveredAt: new Date().toISOString(),
    };

    // Write to file (in same directory as this script)
    const outputPath = path.join(__dirname, 'vpc-info.json');
    fs.writeFileSync(outputPath, JSON.stringify(vpcInfo, null, 2));

    console.log('\nVPC information written to scripts/serverless/vpc-info.json');
    return vpcInfo;
  } catch (error) {
    console.error('Error discovering VPC information:', error.message);
    process.exit(1);
  }
}

getVpcInfo();
