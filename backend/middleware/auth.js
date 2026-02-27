const verifier = require('../config/cognito');

/**
 * Verifies the Cognito ID token from Authorization header.
 * Injects req.user = { sub, email, name, groups } on success.
 */
module.exports = async function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifier.verify(token);
    req.user = {
      sub:    payload.sub,
      email:  payload.email,
      name:   payload.name,
      groups: payload['cognito:groups'] || [],
    };
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
