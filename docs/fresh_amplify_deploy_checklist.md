# Fresh Amplify Deployment Checklist

This document outlines the steps required after deploying the Kiyanaw backend to a new AWS account using Amplify CLI.

## Prerequisites

- AWS account with appropriate permissions
- Amplify CLI installed and configured
- Node.js v22+ and npm installed

## Post-Deployment Steps

The `indexRegionData` Lambda function requires manual permission configuration in the OpenSearch dashboard to write data to the domain.

#### Steps:

1. **Access OpenSearch Dashboard**
   - Go to AWS OpenSearch Service console
   - Find domain: `kiyanaw-stats` (production) or `kiyanaw-staging-stats` (staging)
   - Click on the **OpenSearch Dashboards URL**
   - Login with admin credentials

2. **Create OpenSearch Role**
   - Navigate to **Security** → **Roles**
   - Click **Create role**
   - **Role name:** `lambda_crud`
   - **Cluster permissions:**
     - `cluster_composite_ops_ro`
     - `indices:data/write/index`
     - `indices:data/write/bulk`
   - **Index permissions:**
     - **Index pattern:** `knownwords-*`
     - **Permissions:** `crud`
   - **Backend roles:** Add the ARN of the `indexRegionData-{env}` Lambda execution role
     - Find the role ARN in Lambda console → Configuration → Permissions → Execution role
     - Format: `arn:aws:iam::{account-id}:role/{lambda-role-name}`
   - Click **Create**
