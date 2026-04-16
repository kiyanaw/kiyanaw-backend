# E2E Testing with Playwright

This directory contains end-to-end tests for the Kiyânaw application using Playwright.

## Quick Setup

Test-user credentials are stored in AWS SSM Parameter Store. You need the `kiyanaw-staging` AWS profile configured locally.

**First time only** (or whenever passwords need to be rotated):

```bash
npm run rotate:e2e-passwords
```

This generates strong random passwords for the 3 test users, sets them in the staging Cognito User Pool, and stores them in SSM at `/kiyanaw/e2e/staging/<role>-password`.

**Every developer, every machine:**

```bash
npm run setup:e2e
```

This pulls the passwords from SSM and writes a populated `.env` file — no manual credential hunting needed. Safe to re-run at any time.

## Running Tests

```bash
# Run tests against staging environment
npm run test:e2e:staging

# Run tests against local development server
npm run test:e2e

# Run tests against production environment
npm run test:e2e:production
```

```bash
# Run tests against local development server
npm run test:e2e

# Run tests against staging environment
npm run test:e2e:staging

# Run tests against production environment
npm run test:e2e:production
```

## Authentication

The tests use Playwright's worker-scoped authentication with 3 predefined accounts:

1. **Automatic Authentication**: Each parallel worker gets assigned a test account from the 3 available accounts
2. **Worker-Scoped**: Authentication happens once per worker using fixtures, not per test
3. **State Persistence**: Authentication state is saved to `playwright/.auth/user-{account-name}.json`
4. **Parallel Testing**: Tests run with their assigned account's authentication state
5. **Error Handling**: Tests fail fast with clear error messages if any required environment variables are missing

### Account Assignment

- **3 accounts available**: `owner`, `viewer`, `editor`
- **Round-robin assignment**: Workers are assigned accounts in round-robin fashion
- **All accounts required**: Missing any account credentials will cause tests to fail immediately
- **Account-specific tests**: Use `testWithAccount('accountName')` to run tests with specific accounts

This approach allows tests to run in parallel without conflicts, as each worker operates with its own authenticated session.

## Test Structure

- `playwright/fixtures.ts` - Worker-scoped authentication fixtures and account-specific test helpers
- `transcription.spec.ts` - Transcription-related tests (runs for all 3 accounts)
- `playwright/.auth/` - Directory containing saved authentication states (gitignored)

## Writing Tests with Specific Accounts

You can write tests that use specific accounts in two ways:

### Option 1: Using the `testWithAccount` Fixture

```typescript
import { testWithAccount, expect } from '../../playwright/fixtures';

// Always use the editor account
const test = testWithAccount('editor');

test.describe('Editor-Specific Tests', () => {
  test('should have editor permissions', async ({ page }) => {
    // Your test code here
  });
});
```

### Option 2: Testing All Accounts

```typescript
import { testWithAccount, expect } from '../../playwright/fixtures';

// Test all 3 accounts
const accounts = ['owner', 'viewer', 'editor'] as const;

accounts.forEach(accountName => {
  const accountTest = testWithAccount(accountName);

  accountTest.describe(`Feature Tests - ${accountName}`, () => {
    accountTest('should work for this account', async ({ page }) => {
      // Your test code here
    });
  });
});
```

### Option 3: Using Environment Variables

```bash
# Run tests with a specific worker index to use a specific account
TEST_PARALLEL_INDEX=1 npm run test:e2e
```

Available account names: `owner`, `viewer`, `editor`

## Important Notes

- The `playwright/.auth/` directory and `.env` file are gitignored for security
- Never commit test credentials to version control
- **All 3 accounts are required** - tests will fail if any environment variables are missing
- Authentication state is automatically saved and reused across test runs
- Tests run for all 3 accounts by default
- Authentication uses simple, reliable selectors that work with AWS Amplify UI
- Tests verify authentication by navigating to protected routes
- Account names are: `owner`, `viewer`, `editor`
