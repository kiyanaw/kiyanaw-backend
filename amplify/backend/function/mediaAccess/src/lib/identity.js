// The /cloudfront/sign route uses AWS_IAM auth (Amplify REST "private" setting): API Gateway
// verifies the SigV4 signature made with Cognito identity-pool credentials and puts the caller in
// requestContext.identity. Only that verified context is used here, never the request body.
//
// cognitoAuthenticationProvider looks like:
//   cognito-idp.<region>.amazonaws.com/<poolId>,cognito-idp.<region>.amazonaws.com/<poolId>:CognitoSignIn:<sub>

/**
 * @param {object} event - API Gateway proxy event
 * @param {string} userPoolId - the only user pool whose users may call this function
 * @returns {{sub: string, identityId: string} | null}
 */
function callerFromEvent(event, userPoolId) {
  const identity = event && event.requestContext && event.requestContext.identity
  if (!identity || identity.cognitoAuthenticationType !== 'authenticated') return null

  const provider = identity.cognitoAuthenticationProvider
  if (typeof provider !== 'string') return null

  const match = /^cognito-idp\.[a-z0-9-]+\.amazonaws\.com\/([^,]+),cognito-idp\.[a-z0-9-]+\.amazonaws\.com\/([^:]+):CognitoSignIn:([0-9a-fA-F-]{36})$/.exec(provider)
  if (!match) return null
  const [, poolA, poolB, sub] = match
  if (poolA !== userPoolId || poolB !== userPoolId) return null

  return { sub, identityId: identity.cognitoIdentityId || '' }
}

module.exports = { callerFromEvent }
