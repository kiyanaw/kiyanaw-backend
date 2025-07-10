# Fresh Amplify Deployment Checklist

This document outlines the manual steps required after deploying the Kiyanaw backend to a new AWS account using Amplify CLI.

## Prerequisites

- AWS account with appropriate permissions
- Amplify CLI installed and configured
- Project successfully deployed with `amplify push`

## Post-Deployment Manual Steps

### 1. `enqueueRegionChanges` Lambda Trigger Configuration

The `enqueueRegionChanges` SQS queue needs to be manually connected to the `indexRegionData` lambda function as a trigger.

#### Steps:
1. **Navigate to AWS Lambda Console**
   - Go to AWS Lambda service in your AWS account
   - Find the `indexRegionData-{env}` function

2. **Add SQS Trigger**
   - Click on the function name to open its details
   - Go to the **Configuration** tab
   - Click **Triggers** in the left sidebar
   - Click **Add trigger**

3. **Configure SQS Event Source**
   - Select **SQS** as the source type
   - Choose the queue: `enqueueRegionChanges-{env}`
   - Set **Batch size** to `1`
   - Set **Batch window** to `0` seconds (immediate processing)
   - Click **Add**

### 2. `createPeaksFile` Lambda Configuration

The `createPeaksFile` lambda requires VPC and EFS configuration to process audio/video files.

#### A. VPC Configuration

1. **Navigate to Lambda Function**
   - Go to AWS Lambda service
   - Find the `createPeaksFile-{env}` function

2. **Configure VPC**
   - Click on the function name
   - Go to **Configuration** tab
   - Click **VPC** in the left sidebar
   - Click **Edit**

3. **Select VPC Settings**
   - Choose **Default VPC** from the dropdown
   - Select the following subnets:
     - `us-east-1a` subnet
     - `us-east-1b` subnet
   - Select **Default security group**
   - Click **Save**

#### B. EFS File System Configuration

1. **Create EFS File System**
   - Go to AWS EFS service
   - Click **Create file system**
   - Choose **Customize** for advanced settings

2. **Configure File System**
   - **Name**: `createPeaksFileFS-{env}`
   - **VPC**: Select the same VPC as the Lambda function
   - **Availability and durability**: Regional
   - **Performance mode**: General Purpose
   - **Throughput mode**: Bursting

3. **Configure Mount Targets**
   - Select the same subnets as your Lambda function
   - Use the default security group
   - Click **Next** and complete the creation

4. **Add EFS to Lambda Function**
   - Go back to the `createPeaksFile-{env}` Lambda function
   - Go to **Configuration** tab
   - Click **File system** in the left sidebar
   - Click **Add file system**

5. **Configure File System Access**
   - **EFS file system**: Select the EFS file system you created
   - **Local mount path**: `/mnt/temp` (This mount path is hardcoded in the lambda)
   - **Access point**: Create a new access point
   - Click **Save**
