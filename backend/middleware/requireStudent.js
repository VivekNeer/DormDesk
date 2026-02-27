/** Gate: only Cognito group "Students" can pass */
module.exports = function requireStudent(req, res, next) {
  if (!req.user?.groups?.includes('Students')) {
    return res.status(403).json({ error: 'Access denied: Students only' });
  }
  next();
};
