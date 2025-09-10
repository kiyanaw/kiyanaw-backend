#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lambdaFunctions = [
  'createPeaksFile',
  'indexRegionData', 
  'inviteHandler',
  'onTranscriptionChange'
];

console.log('Installing lambda function dependencies...');

lambdaFunctions.forEach(lambdaName => {
  const lambdaPath = path.join(__dirname, '..', 'amplify', 'backend', 'function', lambdaName, 'src');
  
  console.log(`Installing dependencies for ${lambdaName}...`);
  
  try {
    execSync('npm install', { 
      cwd: lambdaPath, 
      stdio: 'inherit' 
    });
    console.log(`✅ ${lambdaName} dependencies installed successfully`);
  } catch (error) {
    console.error(`❌ Failed to install dependencies for ${lambdaName}:`, error.message);
    process.exit(1);
  }
});

console.log('All lambda function dependencies installed successfully!');
