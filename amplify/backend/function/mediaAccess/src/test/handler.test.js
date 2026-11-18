const { generateKeyPairSync } = require('crypto')
const { GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')
const { AdminListGroupsForUserCommand } = require('@aws-sdk/client-cognito-identity-provider')
const { GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')
const { createHandler, DEFAULT_EXPIRES_IN_SECONDS, MAX_EXPIRES_IN_SECONDS } = require('../index')

const POOL = 'us-east-1_TESTPOOL'
const OWNER = '11111111-1111-1111-1111-111111111111'
const EDITOR = '22222222-2222-2222-2222-222222222222'
const VIEWER = '33333333-3333-3333-3333-333333333333'
const ADMIN = '44444444-4444-4444-4444-444444444444'
const STRANGER = '55555555-5555-5555-5555-555555555555'
const GROUP_MEMBER = '66666666-6666-6666-6666-666666666666'

const MEDIA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const PUBLIC_MEDIA_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const ORPHAN_MEDIA_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const PRIVATE_T = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const PUBLIC_T = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
const LEGACY_T = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
const NESTED_MEDIA_ID = '12121212-1212-1212-1212-121212121212'
const NESTED_T = '34343434-3434-3434-3434-343434343434'
const IDENTITY = 'us-east-1:56565656-5656-5656-5656-565656565656'
const NESTED_ORIGINAL = `originals/${IDENTITY}/${NESTED_MEDIA_ID}.wav`

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})

const mediaKeys = (id) => ({
  originalKey: `public/originals/${id}.wav`,
  renditionKey: `public/renditions/${id}.mp3`,
  peaksKey: `public/peaks/${id}.json`,
  thumbnailKey: null,
})

const tables = {
  Media: {
    [MEDIA_ID]: { id: MEDIA_ID, owner: OWNER, ...mediaKeys(MEDIA_ID) },
    [PUBLIC_MEDIA_ID]: { id: PUBLIC_MEDIA_ID, owner: OWNER, ...mediaKeys(PUBLIC_MEDIA_ID) },
    [ORPHAN_MEDIA_ID]: { id: ORPHAN_MEDIA_ID, owner: OWNER, viewers: [VIEWER], ...mediaKeys(ORPHAN_MEDIA_ID) },
    [NESTED_MEDIA_ID]: {
      id: NESTED_MEDIA_ID, owner: OWNER, ...mediaKeys(NESTED_MEDIA_ID), originalKey: `public/${NESTED_ORIGINAL}`,
    },
  },
  Transcription: {
    [PRIVATE_T]: {
      id: PRIVATE_T, author: OWNER, editors: [EDITOR], viewers: [VIEWER],
      viewerGroups: ['Elders'], isPrivate: true, mediaId: MEDIA_ID,
    },
    'deleted-public': { id: 'deleted-public', author: STRANGER, isPrivate: false, mediaId: MEDIA_ID, _deleted: true },
    [NESTED_T]: { id: NESTED_T, author: OWNER, viewers: [VIEWER], isPrivate: true, mediaId: NESTED_MEDIA_ID },
    [PUBLIC_T]: { id: PUBLIC_T, author: OWNER, isPrivate: false, mediaId: PUBLIC_MEDIA_ID },
    [LEGACY_T]: {
      id: LEGACY_T, author: OWNER, isPrivate: true,
      source: 'https://bucket-staging.s3.amazonaws.com/public/1600000000-my%20song.mp3',
    },
  },
}
const groupsBySub = { [ADMIN]: ['Admins'], [GROUP_MEMBER]: ['Elders'] }

function fakeClients() {
  const docClient = {
    send: jest.fn(async (cmd) => {
      const table = cmd.input.TableName
      if (cmd instanceof GetCommand) return { Item: tables[table][cmd.input.Key.id] }
      if (cmd instanceof QueryCommand) {
        expect(cmd.input.IndexName).toBe('ByMedia')
        const mediaId = cmd.input.ExpressionAttributeValues[':mediaId']
        return { Items: Object.values(tables[table]).filter((t) => t.mediaId === mediaId) }
      }
      if (cmd instanceof ScanCommand) {
        return {
          Items: Object.values(tables[table]).filter((t) => t.source).map(({ id, source }) => ({ id, source })),
        }
      }
      throw new Error(`unexpected DynamoDB command ${cmd.constructor.name}`)
    }),
  }
  const cognitoClient = {
    send: jest.fn(async (cmd) => {
      expect(cmd).toBeInstanceOf(AdminListGroupsForUserCommand)
      expect(cmd.input.UserPoolId).toBe(POOL)
      return { Groups: (groupsBySub[cmd.input.Username] || []).map((GroupName) => ({ GroupName })) }
    }),
  }
  const secretsClient = {
    send: jest.fn(async (cmd) => {
      expect(cmd).toBeInstanceOf(GetSecretValueCommand)
      return { SecretString: privateKey }
    }),
  }
  return { docClient, cognitoClient, secretsClient }
}

function setup() {
  const clients = fakeClients()
  const lines = []
  const handler = createHandler({
    ...clients,
    config: {
      transcriptionTable: 'Transcription',
      mediaTable: 'Media',
      userPoolId: POOL,
      privateKeySecret: 'kiyanaw/cloudfront/test/private-key',
      cdnDomain: 'cdn.example.test',
      keyPairId: 'KTESTKEYPAIR',
    },
    log: (line) => lines.push(JSON.parse(line)),
  })
  return { handler, clients, lines }
}

const provider = (sub, pool = POOL) =>
  `cognito-idp.us-east-1.amazonaws.com/${pool},cognito-idp.us-east-1.amazonaws.com/${pool}:CognitoSignIn:${sub}`

function event(sub, body, identityOverrides = {}) {
  return {
    httpMethod: 'POST',
    path: '/cloudfront/sign',
    body: JSON.stringify(body),
    requestContext: {
      identity: {
        cognitoAuthenticationType: 'authenticated',
        cognitoIdentityId: 'us-east-1:identity',
        cognitoAuthenticationProvider: provider(sub),
        ...identityOverrides,
      },
    },
  }
}

const sign = async (sub, s3Key, extra = {}) => {
  const ctx = setup()
  const res = await ctx.handler(event(sub, { s3Key, ...extra }))
  return { ...ctx, res, body: JSON.parse(res.body) }
}

describe('mediaAccess authorization (private media)', () => {
  const rendition = `renditions/${MEDIA_ID}.mp3`

  it.each([
    ['owner', OWNER],
    ['editor', EDITOR],
    ['viewer', VIEWER],
    ['Admin', ADMIN],
    ['viewerGroups member', GROUP_MEMBER],
  ])('allows the %s', async (_label, sub) => {
    const { res, body, lines } = await sign(sub, rendition)
    expect(res.statusCode).toBe(200)
    expect(body.signedUrl).toContain(`https://cdn.example.test/public/renditions/${MEDIA_ID}.mp3?`)
    expect(lines).toEqual([expect.objectContaining({ callerSub: sub, key: rendition, decision: 'allow' })])
  })

  it('denies a stranger and logs the denial (a soft-deleted public transcription does not count)', async () => {
    const { res, lines, clients } = await sign(STRANGER, rendition)
    expect(res.statusCode).toBe(403)
    expect(lines).toEqual([{ route: 'mediaAccess', callerSub: STRANGER, key: rendition, decision: 'deny', reason: 'private' }])
    expect(clients.secretsClient.send).not.toHaveBeenCalled()
  })

  it('only looks up groups when the sub alone does not grant access', async () => {
    const { clients } = await sign(OWNER, rendition)
    expect(clients.cognitoClient.send).not.toHaveBeenCalled()
  })

  it('allows peaks and originals keys given with the public/ prefix', async () => {
    expect((await sign(VIEWER, `public/peaks/${MEDIA_ID}.json`)).res.statusCode).toBe(200)
    expect((await sign(VIEWER, `public/originals/${MEDIA_ID}.wav`)).res.statusCode).toBe(200)
  })

  it('uses the Media ACL when no transcription references the media', async () => {
    expect((await sign(VIEWER, `renditions/${ORPHAN_MEDIA_ID}.mp3`)).res.statusCode).toBe(200)
    expect((await sign(STRANGER, `renditions/${ORPHAN_MEDIA_ID}.mp3`)).res.statusCode).toBe(403)
  })
})

describe('mediaAccess originals in identity folders', () => {
  it('allows the ACL on the nested key, raw or percent-encoded, and signs that exact object', async () => {
    const { res, body } = await sign(VIEWER, `public/${NESTED_ORIGINAL}`)
    expect(res.statusCode).toBe(200)
    expect(body.signedUrl).toContain(`/public/originals/${encodeURIComponent(IDENTITY)}/${NESTED_MEDIA_ID}.wav?`)
    expect((await sign(OWNER, NESTED_ORIGINAL.replace(':', '%3A'))).res.statusCode).toBe(200)
  })

  it('denies a stranger on the nested key', async () => {
    expect((await sign(STRANGER, NESTED_ORIGINAL)).res.statusCode).toBe(403)
  })

  it.each([
    ['the flat key of a nested original', `originals/${NESTED_MEDIA_ID}.wav`],
    ['a nested key for a flat original', `originals/${IDENTITY}/${MEDIA_ID}.wav`],
    ['another identity folder', `originals/us-east-1:78787878-7878-7878-7878-787878787878/${NESTED_MEDIA_ID}.wav`],
    ['a malformed identity folder', `originals/not-an-identity/${NESTED_MEDIA_ID}.wav`],
    ['an identity folder without region', `originals/56565656-5656-5656-5656-565656565656/${NESTED_MEDIA_ID}.wav`],
    ['traversal out of the identity folder', `originals/${IDENTITY}/../${NESTED_MEDIA_ID}.wav`],
    ['two folder levels', `originals/${IDENTITY}/x/${NESTED_MEDIA_ID}.wav`],
    ['an identity folder on renditions', `renditions/${IDENTITY}/${NESTED_MEDIA_ID}.mp3`],
  ])('denies %s even to an Admin', async (_label, key) => {
    const { res, clients } = await sign(ADMIN, key)
    expect(res.statusCode).toBe(403)
    expect(clients.secretsClient.send).not.toHaveBeenCalled()
  })
})

describe('mediaAccess authorization (public, export, legacy)', () => {
  it('allows any signed-in user on a non-private transcription', async () => {
    const { res, lines } = await sign(STRANGER, `renditions/${PUBLIC_MEDIA_ID}.mp3`)
    expect(res.statusCode).toBe(200)
    expect(lines[0]).toMatchObject({ decision: 'allow', reason: 'public' })
  })

  it('applies the transcription ACL to export zips', async () => {
    expect((await sign(OWNER, `public/exports/${PRIVATE_T}.zip`)).res.statusCode).toBe(200)
    expect((await sign(STRANGER, `public/exports/${PRIVATE_T}.zip`)).res.statusCode).toBe(403)
  })

  it('resolves legacy source keys and their peaks file', async () => {
    expect((await sign(OWNER, '1600000000-my%20song.mp3')).res.statusCode).toBe(200)
    expect((await sign(OWNER, '1600000000-my%20song.mp3.json')).res.statusCode).toBe(200)
    expect((await sign(STRANGER, '1600000000-my%20song.mp3')).res.statusCode).toBe(403)
  })
})

describe('mediaAccess unknown keys', () => {
  it.each([
    ['a key with no record', `renditions/${'9'.repeat(8)}-9999-9999-9999-${'9'.repeat(12)}.mp3`],
    ['a key that is not the record key', `renditions/${MEDIA_ID}.mp4`],
    ['a region clip', `region-clips/${PRIVATE_T}/x.mp3`],
    ['path traversal', `renditions/../originals/${MEDIA_ID}.wav`],
    ['a legacy key with no transcription', 'nothing-here.mp3'],
    ['a non-string key', 42],
  ])('denies %s', async (_label, key) => {
    const { res, clients } = await sign(ADMIN, key)
    expect(res.statusCode).toBe(403)
    expect(clients.secretsClient.send).not.toHaveBeenCalled()
  })
})

describe('mediaAccess TTL', () => {
  const key = `renditions/${MEDIA_ID}.mp3`
  const ttlOf = (body) => Math.round((body.expiresAt - Date.now()) / 1000)

  it('defaults to 1 hour', async () => {
    const { body } = await sign(OWNER, key)
    expect(DEFAULT_EXPIRES_IN_SECONDS).toBe(3600)
    expect(ttlOf(body)).toBeGreaterThan(3590)
    expect(ttlOf(body)).toBeLessThanOrEqual(3600)
  })

  it('caps the 24h the app asks for at 4 hours', async () => {
    const { body, lines } = await sign(OWNER, key, { expiresInSeconds: 86400 })
    expect(MAX_EXPIRES_IN_SECONDS).toBe(14400)
    expect(ttlOf(body)).toBeLessThanOrEqual(14400)
    expect(ttlOf(body)).toBeGreaterThan(14390)
    expect(lines[0].expiresInSeconds).toBe(14400)
  })

  it('honours shorter requests and rejects invalid ones', async () => {
    expect(ttlOf((await sign(OWNER, key, { expiresInSeconds: 600 })).body)).toBeLessThanOrEqual(600)
    expect((await sign(OWNER, key, { expiresInSeconds: -1 })).res.statusCode).toBe(400)
    expect((await sign(OWNER, key, { expiresInSeconds: '86400' })).res.statusCode).toBe(400)
  })
})

describe('mediaAccess caller identity', () => {
  const key = `renditions/${MEDIA_ID}.mp3`

  it('ignores identity claims in the body', async () => {
    const { handler } = setup()
    const res = await handler(event(STRANGER, { s3Key: key, sub: OWNER, author: OWNER }))
    expect(res.statusCode).toBe(403)
  })

  it.each([
    ['no requestContext identity', { requestContext: {} }],
    ['an unauthenticated identity', { requestContext: { identity: { cognitoAuthenticationType: 'unauthenticated', cognitoAuthenticationProvider: provider(OWNER) } } }],
    ['another user pool', { requestContext: { identity: { cognitoAuthenticationType: 'authenticated', cognitoAuthenticationProvider: provider(OWNER, 'us-east-1_OTHER') } } }],
  ])('denies %s', async (_label, overrides) => {
    const { handler, lines } = setup()
    const res = await handler({ ...event(OWNER, { s3Key: key }), ...overrides })
    expect(res.statusCode).toBe(403)
    expect(lines[0]).toMatchObject({ callerSub: null, decision: 'deny', reason: 'no-identity' })
  })

  it('answers CORS preflight without auth', async () => {
    const { handler } = setup()
    expect((await handler({ httpMethod: 'OPTIONS' })).statusCode).toBe(200)
  })
})
