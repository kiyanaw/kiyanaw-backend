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

# Owner user account
PLAYWRIGHT_TEST_EMAIL=owner@kiyanaw.dev
PLAYWRIGHT_TEST_PASSWORD=

# Editor user account
PLAYWRIGHT_TEST_EMAIL_EDITOR=editor@kiyanaw.dev
PLAYWRIGHT_TEST_PASSWORD_EDITOR=

# Viewer user account
PLAYWRIGHT_TEST_EMAIL_VIEWER=viewer@kiyanaw.dev
PLAYWRIGHT_TEST_PASSWORD_VIEWER=

# Base URL for testing
PLAYWRIGHT_BASE_URL=http://localhost:5173

`;

console.log('🎭 Setting up Playwright E2E testing environment...\n');

// Check if .env file already exists
if (fs.existsSync(envFile)) {
  console.log('⚠️  .env file already exists. Please update it manually with your test credentials.');
  console.log('   Required variables (all must be set):');
  console.log('   - PLAYWRIGHT_TEST_EMAIL');
  console.log('   - PLAYWRIGHT_TEST_PASSWORD');
  console.log('   - PLAYWRIGHT_TEST_EMAIL_EDITOR');
  console.log('   - PLAYWRIGHT_TEST_PASSWORD_EDITOR');
  console.log('   - PLAYWRIGHT_TEST_EMAIL_VIEWER');
  console.log('   - PLAYWRIGHT_TEST_PASSWORD_VIEWER');
  console.log('   - PLAYWRIGHT_BASE_URL\n');
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

console.log('📚 For more information, see tests/README.md');
