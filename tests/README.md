# Playwright E2E Testing

This directory contains end-to-end tests for the Kiyanaw transcription application using Playwright.

## Setup

### Installation

Playwright is already installed as a dev dependency. To install browsers:

```bash
npx playwright install
```

### Configuration

The Playwright configuration is in `playwright.config.ts` at the project root. Key features:

- **Configurable Base URL**: Set via `PLAYWRIGHT_BASE_URL` environment variable
- **Multiple Browsers**: Chrome, Firefox, Safari, and mobile variants
- **Automatic Screenshots**: On test failures
- **Video Recording**: On test failures
- **Test Reports**: HTML, JSON, and JUnit formats

## Running Tests

### Basic Commands

```bash
# Run all tests (defaults to production URL)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests step by step
npm run test:e2e:debug
```

### Environment-Specific Commands

```bash
# Test against local development server
npm run test:e2e:local

# Test against staging environment
npm run test:e2e:staging

# Test against production environment
npm run test:e2e:prod
```

### Custom URL

You can test against any URL by setting the environment variable:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
```

## Environment Configuration

### Using Environment Variables

Set these environment variables to customize test behavior:

```bash
# Target URL (required)
export PLAYWRIGHT_BASE_URL=https://transcribe.kiyanaw.dev

# Test credentials (for authenticated tests)
export TEST_USER_EMAIL=test@example.com
export TEST_USER_PASSWORD=testpassword
```

### Using .env File

Copy `playwright.env.example` to `.env` and customize:

```bash
cp playwright.env.example .env
```

## Test Structure

### Directory Layout

```
tests/
├── e2e/
│   ├── example.spec.ts      # Basic application tests
│   ├── auth.spec.ts         # Authentication flow tests
│   └── transcription.spec.ts # Transcription feature tests
└── README.md               # This file
```

### Test Categories

1. **Basic Tests** (`example.spec.ts`)
   - Homepage loading
   - Navigation functionality
   - 404 error handling

2. **Authentication Tests** (`auth.spec.ts`)
   - Login page display
   - Protected route access
   - Login flow (when credentials available)

3. **Transcription Tests** (`transcription.spec.ts`)
   - Transcription list display
   - Creating new transcriptions
   - Editor functionality
   - Waveform player

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    
    // Your test code here
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Wait for network idle** on page loads: `await page.waitForLoadState('networkidle')`
3. **Use descriptive test names** that explain the expected behavior
4. **Group related tests** using `test.describe()`
5. **Skip tests** that require authentication until test users are set up

### Authentication Setup

Authentication is now fully set up with helper utilities in `auth-helpers.ts`. Tests requiring authentication automatically handle login/logout.

#### Environment Variables

Set these environment variables for authenticated tests:

```bash
export TEST_USER_EMAIL=your-test-user@example.com
export TEST_USER_PASSWORD=your-test-password
```

#### Using Authentication in Tests

```typescript
import { ensureAuthenticated, login, logout } from './auth-helpers';

test.describe('Authenticated Features', () => {
  // Automatically login before each test
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('should access protected feature', async ({ page }) => {
    // Test authenticated functionality - user is already logged in
    await page.goto('/transcriptions');
    // ... test code
  });
});
```

#### Available Authentication Helpers

- `ensureAuthenticated(page)` - Ensures user is logged in (main function to use)
- `login(page, credentials?)` - Performs login with AWS Amplify Authenticator
- `logout(page)` - Logs out the current user
- `isAuthenticated(page)` - Checks if user is currently authenticated
- `getTestCredentials()` - Gets credentials from environment variables
- `skipIfNoCredentials()` - Skips test if credentials not available

#### Automatic Test Skipping

Tests that require authentication will automatically skip if `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are not set, with a helpful message explaining why.

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run Playwright tests
  run: npm run test:e2e
  env:
    PLAYWRIGHT_BASE_URL: https://staging.transcribe.kiyanaw.dev

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Debugging

### Debug Mode

Run tests in debug mode to step through them:

```bash
npm run test:e2e:debug
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots (in `test-results/`)
- Videos (in `test-results/`)
- Traces (viewable with `npx playwright show-trace`)

### Viewing Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout in `playwright.config.ts`
2. **Elements not found**: Use `data-testid` attributes or wait for elements
3. **Authentication failures**: Verify test credentials and login flow
4. **Local server not starting**: Check if dev server is already running

### Useful Commands

```bash
# Check Playwright installation
npx playwright --version

# Update browsers
npx playwright install

# Generate test code
npx playwright codegen https://transcribe.kiyanaw.dev
```
