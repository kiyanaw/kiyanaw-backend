const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');
const { getSignedUrl } = require('@aws-sdk/cloudfront-signer');
const { createRecords } = require('./lib/records');
const { createAuthorizer } = require('./lib/access');
const { callerFromEvent } = require('./lib/identity');

const KEY_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_EXPIRES_IN_SECONDS = 60 * 60; // 1 hour
const MAX_EXPIRES_IN_SECONDS = 4 * 60 * 60; // 4 hours

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

const respond = (statusCode, body) => ({ statusCode, headers: HEADERS, body: JSON.stringify(body) });

/**
 * Reads a required environment variable.
 * @param {string} name
 * @returns {string}
 */
function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable not set`);
  return value;
}

/**
 * Resolves the requested lifetime: default 1h, capped at 4h.
 * @param {unknown} requested - expiresInSeconds from the request body
 * @returns {number|null} seconds, or null when the value is invalid
 */
function resolveExpiresIn(requested) {
  if (requested === undefined || requested === null) return DEFAULT_EXPIRES_IN_SECONDS;
  if (typeof requested !== 'number' || !Number.isFinite(requested) || requested <= 0) return null;
  return Math.min(Math.floor(requested), MAX_EXPIRES_IN_SECONDS);
}

/**
 * Generates a CloudFront signed URL for an already-normalized, decoded key ("public/...").
 * @returns {{signedUrl: string, expiresAt: number}} expiresAt in milliseconds
 */
function generateCloudFrontSignedUrl({ objectKey, privateKey, expiresInSeconds, cdnDomain, keyPairId }) {
  const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/');
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const signedUrl = getSignedUrl({
    url: `https://${cdnDomain}/${encodedKey}`,
    keyPairId,
    privateKey,
    dateLessThan: new Date(expiresAt * 1000).toISOString()
  });

  return { signedUrl, expiresAt: expiresAt * 1000 };
}

/**
 * Builds the handler from injected clients so tests can mock every AWS call.
 * @param {object} deps
 * @param {{send: Function}} deps.docClient
 * @param {{send: Function}} deps.cognitoClient
 * @param {{send: Function}} deps.secretsClient
 * @param {{transcriptionTable: string, mediaTable: string, userPoolId: string,
 *   privateKeySecret: string, cdnDomain: string, keyPairId: string}} deps.config
 * @param {(line: string) => void} [deps.log]
 */
function createHandler({ docClient, cognitoClient, secretsClient, config, log = console.log }) {
  const authorize = createAuthorizer(createRecords({ docClient, cognitoClient, config }));
  let cachedPrivateKey = null;
  let cacheTimestamp = 0;

  async function getPrivateKey() {
    const now = Date.now();
    if (cachedPrivateKey && now - cacheTimestamp < KEY_CACHE_TTL_MS) return cachedPrivateKey;

    const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: config.privateKeySecret }));
    if (!response.SecretString) throw new Error('Secret value is empty');

    cachedPrivateKey = response.SecretString;
    cacheTimestamp = now;
    return cachedPrivateKey;
  }

  const audit = (fields) => log(JSON.stringify({ route: 'mediaAccess', ...fields }));

  return async function handler(event) {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

    const caller = callerFromEvent(event, config.userPoolId);
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      audit({ callerSub: caller && caller.sub, key: null, decision: 'deny', reason: 'bad-body' });
      return respond(400, { error: 'Invalid JSON body' });
    }
    const rawKey = body.s3Key;

    if (!caller) {
      audit({ callerSub: null, key: rawKey, decision: 'deny', reason: 'no-identity' });
      return respond(403, { error: 'Forbidden' });
    }
    if (!rawKey) {
      audit({ callerSub: caller.sub, key: null, decision: 'deny', reason: 'missing-key' });
      return respond(400, { error: 's3Key is required' });
    }
    const expiresInSeconds = resolveExpiresIn(body.expiresInSeconds);
    if (expiresInSeconds === null) {
      audit({ callerSub: caller.sub, key: rawKey, decision: 'deny', reason: 'bad-expiry' });
      return respond(400, { error: 'expiresInSeconds must be a positive number' });
    }

    try {
      const decision = await authorize({ rawKey, sub: caller.sub });
      audit({
        callerSub: caller.sub,
        key: rawKey,
        decision: decision.allowed ? 'allow' : 'deny',
        reason: decision.reason,
        expiresInSeconds: decision.allowed ? expiresInSeconds : undefined
      });
      if (!decision.allowed) return respond(403, { error: 'Forbidden' });

      const privateKey = await getPrivateKey();
      const result = generateCloudFrontSignedUrl({
        objectKey: decision.objectKey,
        privateKey,
        expiresInSeconds,
        cdnDomain: config.cdnDomain,
        keyPairId: config.keyPairId
      });
      return respond(200, result);
    } catch (error) {
      audit({ callerSub: caller.sub, key: rawKey, decision: 'error', reason: error.name || 'Error' });
      console.error('Error generating signed URL:', error);
      return respond(500, { error: 'Failed to generate signed URL' });
    }
  };
}

let defaultHandler = null;

/**
 * Lambda entry point (API Gateway, AWS_IAM auth).
 */
exports.handler = async (event) => {
  if (!defaultHandler) {
    const region = requireEnv('REGION');
    defaultHandler = createHandler({
      docClient: DynamoDBDocumentClient.from(new DynamoDBClient({ region })),
      cognitoClient: new CognitoIdentityProviderClient({ region }),
      secretsClient: new SecretsManagerClient({ region }),
      config: {
        transcriptionTable: requireEnv('API_KIYANAW_TRANSCRIPTIONTABLE_NAME'),
        mediaTable: requireEnv('API_KIYANAW_MEDIATABLE_NAME'),
        userPoolId: requireEnv('AUTH_KIYANAW4007D1974007D197_USERPOOLID'),
        privateKeySecret: requireEnv('CLOUDFRONT_PRIVATE_KEY_SECRET'),
        cdnDomain: requireEnv('CLOUDFRONT_DOMAIN'),
        keyPairId: requireEnv('CLOUDFRONT_KEY_PAIR_ID')
      }
    });
  }
  return defaultHandler(event);
};

exports.createHandler = createHandler;
exports.DEFAULT_EXPIRES_IN_SECONDS = DEFAULT_EXPIRES_IN_SECONDS;
exports.MAX_EXPIRES_IN_SECONDS = MAX_EXPIRES_IN_SECONDS;
