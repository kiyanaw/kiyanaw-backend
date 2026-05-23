import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = path.resolve(__dirname, '..', '..', '..');

function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function getAmplifyEnv() {
  const localEnvInfo = readJsonFile(path.join(projectRoot, 'amplify', '.config', 'local-env-info.json'));
  const envName = localEnvInfo.envName;
  const localAwsInfo = readJsonFile(path.join(projectRoot, 'amplify', '.config', 'local-aws-info.json'));
  const awsProfile = localAwsInfo[envName]?.profileName || 'default';
  return { envName, awsProfile };
}

export function getGitContext() {
  const run = (cmd) => execSync(cmd, { encoding: 'utf8', cwd: projectRoot }).trim();
  return {
    sha: run('git rev-parse --short HEAD'),
    branch: run('git rev-parse --abbrev-ref HEAD'),
    gitUser: run('git config user.name'),
  };
}

export function getSystemContext() {
  return { gitUser: os.userInfo().username };
}

function startFilePath(envName) {
  return path.join(os.tmpdir(), `kiyanaw-deploy-start-${envName}.json`);
}

export function writeStartFile(envName, data) {
  writeFileSync(startFilePath(envName), JSON.stringify(data));
}

export function readStartFile(envName) {
  try {
    return JSON.parse(readFileSync(startFilePath(envName), 'utf8'));
  } catch {
    return null;
  }
}

export function deleteStartFile(envName) {
  try {
    unlinkSync(startFilePath(envName));
  } catch {}
}
