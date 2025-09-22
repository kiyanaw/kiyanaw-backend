# GitHub Workflow Setup for Deploy and E2E Tests

This document explains how to set up the GitHub workflow for automated deployment and end-to-end testing across staging and production environments.

## Overview

The workflow (`staging-deploy-and-test.yml`) performs the following steps:

1. **Determine Environment**: 
   - Automatically detects whether to deploy to staging or production
   - Sets appropriate environment variables and URLs

2. **Deploy**: 
   - Deploys the Amplify backend using `amplify push`
   - Builds and deploys the frontend using `amplify publish`
   - Verifies the deployment is accessible

3. **Run E2E Tests**:
   - Runs Playwright tests against the deployed site
   - Uploads test results and reports as artifacts

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository settings for each environment:

### AWS Credentials (environment-specific)
- `AWS_ACCESS_KEY_ID`: AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for deployment

### Amplify Configuration (environment-specific)
- `AMPLIFY_APP_ID`: The Amplify App ID for the respective environment (from `team-provider-info.json`)

### E2E Test Credentials (environment-specific)
- `PLAYWRIGHT_TEST_EMAIL`: Email for the owner test account
- `PLAYWRIGHT_TEST_PASSWORD`: Password for the owner test account
- `PLAYWRIGHT_TEST_EMAIL_EDITOR`: Email for the editor test account
- `PLAYWRIGHT_TEST_PASSWORD_EDITOR`: Password for the editor test account
- `PLAYWRIGHT_TEST_EMAIL_VIEWER`: Email for the viewer test account
- `PLAYWRIGHT_TEST_PASSWORD_VIEWER`: Password for the viewer test account

### Environment Variables (environment-specific)
- `AMPLIFY_ENV`: The Amplify environment name (e.g., `staging`, `production`)
- `BASE_URL`: The base URL for the deployed application (e.g., `https://bundle.kiyanaw.dev`, `https://bundle.kiyanaw.net`)

## How to Add Secrets and Variables

### Adding Secrets
1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with the exact name and value

### Adding Environment Variables
1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click the **Variables** tab
5. Click **New repository variable**
6. Add each variable with the exact name and value

### Environment-Specific Configuration
For each environment (staging/production), you need to:
1. Create the environment in GitHub (Settings → Environments)
2. Configure environment-specific secrets and variables
3. Set the appropriate values for each environment

## Finding the Amplify App ID

The Amplify App ID can be found in `amplify/team-provider-info.json`:

```json
{
  "staging": {
    "awscloudformation": {
      "AmplifyAppId": "******"  // <-- This is your AMPLIFY_APP_ID
    }
  }
}
```

## Test User Accounts

You need to create dedicated test user accounts in your staging environment:

1. **Owner account**: Full permissions for testing owner-specific features
2. **Editor account**: Editor permissions for testing editor-specific features  
3. **Viewer account**: Viewer permissions for testing viewer-specific features

These should be separate from your personal development accounts.

## Workflow Triggers

The workflow runs on:
- **Push to staging branch**: Automatic deployment to staging and testing
- **Pull request to staging branch**: Deploy to staging and test
- **Release published**: Automatic deployment to production and testing

## Environment Detection

The workflow automatically determines the target environment:

- **Staging**: Triggered by pushes or pull requests to the `staging` branch
- **Production**: Triggered by creating a new release (published event)

## Workflow Jobs

### 1. determine-environment
- Detects whether to deploy to staging or production
- Runs first to provide context for other jobs

### 2. deploy
- Installs dependencies and Amplify CLI
- Configures AWS credentials for the target environment
- Uses environment variables for Amplify environment and base URL
- Deploys backend with `amplify push`
- Builds and deploys frontend with `amplify publish`
- Verifies deployment is accessible

### 3. e2e-tests
- Runs after successful deployment
- Installs Playwright browsers
- Sets up test environment
- Runs E2E tests against the deployed site (staging or production)
- Uploads test results and reports

### 4. notify-completion
- Provides final status summary
- Fails the workflow if any step failed

## Artifacts

The workflow creates several artifacts:
- `playwright-report`: HTML test report
- `test-results-json`: JSON test results
- `test-results-junit`: JUnit XML test results

These are available for download from the GitHub Actions run page.

## Troubleshooting

### Common Issues

1. **AWS Credentials Error**: Verify the AWS secrets are correctly set and have the necessary permissions
2. **Amplify Deployment Fails**: Check that the Amplify App ID is correct and the environment exists
3. **E2E Tests Fail**: Verify the test user credentials are correct and the accounts exist in staging
4. **Docker Build Fails**: The workflow includes Docker for C bindings - ensure Docker is available in the runner

### Debugging

- Check the workflow logs in the GitHub Actions tab
- Download and review the test artifacts
- Verify the staging site is accessible manually
- Check that all required secrets are properly configured

## Environment URLs

- **Staging**: https://bundle.kiyanaw.dev
- **Production**: https://bundle.kiyanaw.net

The workflow is configured to test against the staging environment.
