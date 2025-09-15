# E2E Testing with Playwright

This directory contains end-to-end tests for the Kiyânaw application using Playwright.

## Quick Setup

Run the setup script to get started:

```bash
npm run setup:e2e
```

This will:
- Create a `.env` file template with the required environment variables
- Create the `playwright/.auth/` directory for authentication state
- Provide instructions for the next steps

## Manual Setup

If you prefer to set up manually or need to update your configuration:

1. **Create test user accounts**: Create 3 dedicated test users in your AWS Cognito User Pool:
   - **Owner user** (`owner@kiyanaw.dev`): Full permissions for testing owner functionality
   - **Viewer user** (`viewer@kiyanaw.dev`): Read-only permissions for testing viewer functionality  
   - **Editor user** (`editor@kiyanaw.dev`): Edit permissions for testing editor functionality

2. **Set up environment variables**: Create a `.env` file in the project root with your test credentials:

```bash
# Owner user account
PLAYWRIGHT_TEST_EMAIL=owner@kiyanaw.dev
PLAYWRIGHT_TEST_PASSWORD=your-owner-password

# Editor user account
PLAYWRIGHT_TEST_EMAIL_EDITOR=editor@kiyanaw.dev
PLAYWRIGHT_TEST_PASSWORD_EDITOR=your-editor-password

# Viewer user account
PLAYWRIGHT_TEST_EMAIL_VIEWER=viewer@kiyanaw.dev
PLAYWRIGHT_TEST_PASSWORD_VIEWER=your-viewer-password

# Base URL for testing
PLAYWRIGHT_BASE_URL=http://localhost:5173
```

**Important**: All 6 environment variables are required. The tests will fail with a clear error message if any are missing.

3. **Run the tests**:

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
- Use dedicated test user accounts, not your personal account
- **All 3 accounts are required** - tests will fail if any environment variables are missing
- Authentication state is automatically saved and reused across test runs
- Tests run for all 3 accounts by default (6 tests total: 2 tests × 3 accounts)
- The setup script (`npm run setup:e2e`) helps create the initial configuration
- Authentication uses simple, reliable selectors that work with AWS Amplify UI
- Tests verify authentication by navigating to protected routes
- Account names are: `owner`, `viewer`, `editor` (not `main` anymore)
