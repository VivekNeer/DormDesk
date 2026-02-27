/** Gate: only Cognito group "SuperAdmin" can pass (MVP — single admin) */
module.exports = function requireAdmin(req, res, next) {
  if (!req.user?.groups?.includes('SuperAdmin')) {
    return res.status(403).json({ error: 'Access denied: Admin only' });
  }
  next();
};
