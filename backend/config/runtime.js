const isDemoMode =
  process.env.DEMO_MODE === "true" ||
  !process.env.DB_HOST ||
  !process.env.COGNITO_USER_POOL_ID ||
  !process.env.COGNITO_CLIENT_ID;

module.exports = {
  isDemoMode,
};
