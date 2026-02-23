const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { getSignedUrl } = require('@aws-sdk/cloudfront-signer');

// Cache for private key (Lambda instance reuse)
let cachedPrivateKey = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

/**
 * Retrieves the CloudFront private key from Secrets Manager with caching
 * @returns {Promise<string>} The private key PEM string
 */
async function getPrivateKey() {
  const now = Date.now();

  // Return cached key if still valid
  if (cachedPrivateKey && (now - cacheTimestamp) < CACHE_TTL_MS) {
    console.log('Using cached private key');
    return cachedPrivateKey;
  }

  const secretName = process.env.CLOUDFRONT_PRIVATE_KEY_SECRET;
  if (!secretName) {
    throw new Error('CLOUDFRONT_PRIVATE_KEY_SECRET environment variable not set');
  }

  console.log('Fetching private key from Secrets Manager:', secretName);

  const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );

  if (!response.SecretString) {
    throw new Error('Secret value is empty');
  }

  cachedPrivateKey = response.SecretString;
  cacheTimestamp = now;

  return cachedPrivateKey;
}

/**
 * Generates a CloudFront signed URL for the given S3 key
 * @param {string} s3Key - The S3 object key
 * @param {string} privateKey - The CloudFront private key PEM
 * @param {number} expiresInSeconds - URL validity duration in seconds
 * @returns {{signedUrl: string, expiresAt: number}} The signed URL and expiration timestamp
 */
function generateCloudFrontSignedUrl(s3Key, privateKey, expiresInSeconds) {
  const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;

  if (!cdnDomain) {
    throw new Error('CLOUDFRONT_DOMAIN environment variable not set');
  }
  if (!keyPairId) {
    throw new Error('CLOUDFRONT_KEY_PAIR_ID environment variable not set');
  }

  // Ensure key starts with correct prefix for S3 bucket structure
  const normalizedKey = s3Key.startsWith('public/') ? s3Key : `public/${s3Key}`;

  const url = `https://${cdnDomain}/${normalizedKey}`;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const signedUrl = getSignedUrl({
    url,
    keyPairId,
    privateKey,
    dateLessThan: new Date(expiresAt * 1000).toISOString()
  });

  return {
    signedUrl,
    expiresAt: expiresAt * 1000 // Return milliseconds for frontend consistency
  };
}

/**
 * Lambda handler for CloudFront URL signing
 * @param {object} event - API Gateway event
 * @returns {Promise<object>} API Gateway response
 */
exports.handler = async (event) => {
  console.log('CloudFront Signer invoked:', JSON.stringify({
    httpMethod: event.httpMethod,
    path: event.path,
    hasBody: !!event.body
  }));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: ''
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    if (!body.s3Key) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ error: 's3Key is required' })
      };
    }

    // Default 24 hours (86400 seconds), max 7 days (604800 seconds)
    const expiresInSeconds = Math.min(
      body.expiresInSeconds || 86400,
      604800
    );

    const privateKey = await getPrivateKey();
    const result = generateCloudFrontSignedUrl(
      body.s3Key,
      privateKey,
      expiresInSeconds
    );

    console.log('Generated signed URL for:', body.s3Key, 'expires in:', expiresInSeconds, 'seconds');

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Error generating signed URL:', error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        error: 'Failed to generate signed URL',
        message: error.message
      })
    };
  }
};
