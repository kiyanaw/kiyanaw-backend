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

1. **Create test user accounts**: Create dedicated test users in your AWS Cognito User Pool:
   - **Test user**: Standard permissions for general testing (required)
   - **Viewer user**: Read-only permissions for testing viewer functionality (optional)
   - **Editor user**: Edit permissions for testing editor functionality (optional)

2. **Set up environment variables**: Create a `.env` file in the project root with your test credentials:

```bash
# Test user account (required)
PLAYWRIGHT_TEST_EMAIL=your-test-user@example.com
PLAYWRIGHT_TEST_PASSWORD=your-test-password

# Base URL for testing
PLAYWRIGHT_BASE_URL=http://localhost:5173

# Viewer user account (optional for parallel testing)
# PLAYWRIGHT_TEST_EMAIL_VIEWER=your-viewer-user@example.com
# PLAYWRIGHT_TEST_PASSWORD_VIEWER=your-viewer-password

# Editor user account (optional for parallel testing)
# PLAYWRIGHT_TEST_EMAIL_EDITOR=your-editor-user@example.com
# PLAYWRIGHT_TEST_PASSWORD_EDITOR=your-editor-password
```

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

The tests use Playwright's worker-scoped authentication with environment-defined accounts:

1. **Automatic Authentication**: Each parallel worker gets assigned a test account from the environment variables
2. **Worker-Scoped**: Authentication happens once per worker using fixtures, not per test
3. **State Persistence**: Authentication state is saved to `playwright/.auth/user-{account-name}.json`
4. **Parallel Testing**: Tests run with their assigned account's authentication state

### Account Assignment

- If you have 1 account configured: All workers use the same account
- If you have multiple accounts: Workers are assigned accounts in round-robin fashion
- Account names are derived from the environment variable names (e.g., `PLAYWRIGHT_TEST_EMAIL` → `main`)

This approach allows tests to run in parallel without conflicts, as each worker operates with its own authenticated session.

## Test Structure

- `playwright/fixtures.ts` - Worker-scoped authentication fixtures and account-specific test helpers
- `transcription.spec.ts` - Transcription-related tests (uses default account assignment)
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

### Option 2: Using Environment Variables

```bash
# Run tests with a specific worker index to use a specific account
TEST_PARALLEL_INDEX=1 npm run test:e2e
```

Available account names: `main`, `viewer`, `editor` (based on your environment variables)

## Important Notes

- The `playwright/.auth/` directory and `.env` file are gitignored for security
- Never commit test credentials to version control
- Use dedicated test user accounts, not your personal account
- Authentication state is automatically saved and reused across test runs
- If you have fewer accounts than workers, accounts will be reused (round-robin)
- The setup script (`npm run setup:e2e`) helps create the initial configuration
- Authentication uses simple, reliable selectors that work with AWS Amplify UI
- Tests verify authentication by navigating to protected routes
