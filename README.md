# kiyanaw-backend

## Install NVM

Follow instructions [here](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)

```
nvm use
```

## Install Dependancies
```
npm install
```

## (Optional) Install Docker (for Lambda  C Bindings)

A docker image is provided to build C bindings if needed. Currently needed when pushing the kiyanawlibHfstol lambda layer.

### Install Docker Desktop (for MacOS)
```bash
brew install --cask docker
```

## Setup Spellcheck API Credentials

The spellcheck API requires a key that is environment-specific. After pulling an environment, run:

```
npx amplify env checkout <env>
```

This fetches the `transcribe-<env>` API key from API Gateway and writes `VITE_SPELLCHECK_API_BASE_URL` and `VITE_SPELLCHECK_API_KEY` to `.env.local`. This also runs automatically before `amplify publish`.

## Setup Amplify and Pull `staging`
```
npx amplify pull

? Please choose the profile you want to use: profile
? Which app are you working on? d2vcnct5kwl6za
? Pick a backend environment: staging
? Choose your default editor: Visual Studio Code
✔ Choose the type of app that you're building: javascript
Please tell us about your project
? What javascript framework are you using: react
? Source Directory Path:  src
? Distribution Directory Path: dist
? Build Command:  npm run-script build
? Start Command: npm run-script dev
```

### Compiles and hot-reloads for development
```
npm run dev
```

### Run unit tests
```
npm run test
```

### Watch unit tests
```
npm run test:watch
```

### Run E2E tests

E2E tests use Playwright against a real AWS backend. They require three dedicated test accounts (owner, editor, viewer) and the following environment variables in `.env`:

```
PLAYWRIGHT_BASE_URL=https://bundle.kiyanaw.dev
PLAYWRIGHT_TEST_EMAIL=owner@example.com
PLAYWRIGHT_TEST_PASSWORD=...
PLAYWRIGHT_TEST_EMAIL_EDITOR=editor@example.com
PLAYWRIGHT_TEST_PASSWORD_EDITOR=...
PLAYWRIGHT_TEST_EMAIL_VIEWER=viewer@example.com
PLAYWRIGHT_TEST_PASSWORD_VIEWER=...
```

**Run against the currently checked-out Amplify environment (recommended for local dev):**
```
npm run test:e2e
```
This reads `amplify/.config/local-env-info.json` to determine which environment is active, then looks up the base URL from `playwright/env-config.json`. No `.env` configuration needed.

**Run against a specific environment regardless of which one is checked out:**
```
npm run test:e2e:staging
npm run test:e2e:production
```

**Run with 1 worker (for CI):**
```
npm run test:e2e:ci
```

The default is 2 parallel workers. Override with `PLAYWRIGHT_WORKERS=N npm run test:e2e`.

If you need to add a new environment, add it to `playwright/env-config.json`.

#### Auth files

On the first run, Playwright logs in as each test account and saves auth state to `playwright/.auth/user-{account}-{env}.json`. Auth files are namespaced by environment so staging and production sessions never interfere with each other.

Subsequent runs reuse the stored files. If the idToken has expired (Cognito default: 1 hour), it is refreshed silently using the stored refresh token. If the refresh token has expired (Cognito default: 30 days), the auth file is deleted and a full re-login is performed automatically.

To force a fresh login, delete `playwright/.auth/`.

#### Cleanup

Each test cleans up its own data in `afterEach`. A global teardown also runs after every suite to catch any orphans left by aborted runs — it deletes all transcriptions matching `Test Transcription *` for the three test accounts, cascading to regions, issues, comments, and S3 media via the `onTranscriptionChange` Lambda.

### Run linter
```
npm run lint
```

### Deploy Backend
```
npx amplify push
```

**Note:** Custom Serverless infrastructure will be deployed automatically after `amplify push` via Amplify hooks.

### Deploy Frontend
```
npx amplify publish
```

**Note:** Custom Serverless infrastructure will be deployed automatically after `amplify publish` via Amplify hooks.

### Deploy Custom Infrastructure (Manual)
If needed, you can deploy Serverless infrastructure manually:
```
npm run serverless:deploy
```

**To skip automatic Serverless deployment**, use the `--no-hooks` flag:
```
npx amplify push --no-hooks
npx amplify publish --no-hooks
```

See [Serverless Integration Guide](docs/serverless-integration.md) for more details.

## Building Lambda C Bindings

This project uses Docker to build lambda functions with C bindings in an Amazon Linux environment to ensure compatibility.

### Build Lambda C Bindings
```bash
# Build the Docker image
docker compose build

# Build the C bindings (this will install hfstol with correct target architecture)
docker compose run --rm lambda-builder
```

The container will automatically install the `hfstol` package with the correct target architecture and platform for AWS Lambda. After the build completes, you can deploy normally with `amplify push`.


# Infrastructure

## Overview

 * project built on Amplify
 * DynamoDB in the backend
 * uploaded media processed through Lambda (TODO: this is not modeled)


Whenever changes are made to a region in a transcription, that region's data is streamed from DynamoDB to the `notifyRegionChanges` function, which actually does a couple things:

 * reformat and push the data into the a "neutral" queue that will publish "known words" links
 * send out email notifications to anyone who has an interest in that particular region

## Fresh Deployment Setup

After deploying to a new AWS account, several manual configurations are required to get the system fully operational. See the [Fresh Amplify Deployment Checklist](docs/fresh_amplify_deploy_checklist.md) for detailed step-by-step instructions.

