const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { isDemoMode } = require("./runtime");

if (isDemoMode) {
  module.exports = {
    async verify() {
      throw new Error("Cognito verification is disabled in local demo mode.");
    },
  };
  return;
}

// Verifies Cognito ID tokens
// Fetches + caches the Cognito JWKS public keys automatically
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID,
});

module.exports = verifier;
