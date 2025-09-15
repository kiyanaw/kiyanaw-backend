#!/usr/bin/env node

/**
 * Setup script for E2E testing environment
 * This script helps create the necessary environment file for Playwright tests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const envFile = path.join(projectRoot, '.env');

const envTemplate = `# Playwright E2E Test Credentials
# These should be dedicated test user accounts, not your personal account
# Configure 3 accounts with different roles for parallel testing

# Test user account (required)
PLAYWRIGHT_TEST_EMAIL=your-test-user@example.com
PLAYWRIGHT_TEST_PASSWORD=your-test-password

# Base URL for testing
PLAYWRIGHT_BASE_URL=http://localhost:5173

# Viewer user account (optional)
# PLAYWRIGHT_TEST_EMAIL_VIEWER=your-viewer-user@example.com
# PLAYWRIGHT_TEST_PASSWORD_VIEWER=your-viewer-password

# Editor user account (optional)
# PLAYWRIGHT_TEST_EMAIL_EDITOR=your-editor-user@example.com
# PLAYWRIGHT_TEST_PASSWORD_EDITOR=your-editor-password

`;

console.log('🎭 Setting up Playwright E2E testing environment...\n');

// Check if .env file already exists
if (fs.existsSync(envFile)) {
  console.log('⚠️  .env file already exists. Please update it manually with your test credentials.');
  console.log('   Required variables:');
  console.log('   - PLAYWRIGHT_TEST_EMAIL');
  console.log('   - PLAYWRIGHT_TEST_PASSWORD');
  console.log('   Optional for parallel testing:');
  console.log('   - PLAYWRIGHT_TEST_EMAIL_VIEWER / PLAYWRIGHT_TEST_PASSWORD_VIEWER');
  console.log('   - PLAYWRIGHT_TEST_EMAIL_EDITOR / PLAYWRIGHT_TEST_PASSWORD_EDITOR\n');
} else {
  // Create .env file from template
  fs.writeFileSync(envFile, envTemplate);
  console.log('✅ Created .env file with template');
  console.log('📝 Please edit .env and add your test user credentials\n');
}

// Create .auth directory
const authDir = path.join(projectRoot, 'playwright', '.auth');
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
  console.log('✅ Created playwright/.auth directory for authentication state\n');
}

console.log('🚀 Next steps:');
console.log('1. Edit .env file and add your test user credentials');
console.log('2. Create 3 test users in your AWS Cognito User Pool:');
console.log('   - Test user (standard permissions)');
console.log('   - Viewer user (read-only permissions)');
console.log('   - Editor user (edit permissions)');
console.log('3. Run: npm run test:e2e\n');
console.log('💡 Tip: Each parallel worker will use a different role-based account');

console.log('📚 For more information, see tests/README.md');
