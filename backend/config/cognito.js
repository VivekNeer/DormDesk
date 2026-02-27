const { CognitoJwtVerifier } = require('aws-jwt-verify');

// Verifies Cognito ID tokens
// Fetches + caches the Cognito JWKS public keys automatically
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID,
});

module.exports = verifier;
