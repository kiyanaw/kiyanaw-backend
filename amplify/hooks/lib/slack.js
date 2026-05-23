import { execSync } from 'child_process';
import https from 'https';

export function getWebhookUrl(awsProfile, envName) {
  try {
    const url = execSync(
      `aws ssm get-parameter --name /kiyanaw/slack/${envName}/deploy-webhook-url --with-decryption --query 'Parameter.Value' --output text --profile ${awsProfile} --region us-east-1`,
      { encoding: 'utf8' }
    ).trim();
    return url && url !== 'None' ? url : null;
  } catch {
    return null;
  }
}

export function postToSlack(webhookUrl, text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ text });
    const url = new URL(webhookUrl);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        res.resume();
        res.on('end', resolve);
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function formatDuration(ms) {
  const totalSecs = Math.round(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function buildStartMessage({ envName, lifecycle, user, host, branch, sha, commitSubject }) {
  return [
    `:rocket: *Deployment started* — kiyânaw Transcribe (\`${envName}\`)`,
    `*Lifecycle:* ${lifecycle}`,
    `*Triggered by:* ${user}@${host}`,
    `*Branch:* ${branch} @ \`${sha}\``,
    `*Commit:* ${commitSubject}`,
  ].join('\n');
}

export function buildFinishMessage({ envName, lifecycle, user, host, branch, sha, success, stage, error, durationMs }) {
  const icon = success ? ':white_check_mark:' : ':x:';
  const status = success ? 'succeeded' : 'failed';
  const lines = [
    `${icon} *Deployment ${status}* — kiyânaw Transcribe (\`${envName}\`)`,
    `*Lifecycle:* ${lifecycle}`,
    `*Triggered by:* ${user}@${host}`,
    `*Branch:* ${branch} @ \`${sha}\``,
  ];
  if (durationMs != null) lines.push(`*Duration:* ${formatDuration(durationMs)}`);
  if (!success && stage) lines.push(`*Stage:* ${stage}`);
  if (!success && error) lines.push(`*Error:* \`\`\`${String(error).slice(0, 500)}\`\`\``);
  return lines.join('\n');
}
