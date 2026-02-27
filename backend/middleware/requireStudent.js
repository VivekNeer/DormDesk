const ADMIN_GROUPS = ['SuperAdmin', 'FoodAdmin', 'WaterAdmin', 'RoomAdmin', 'ElectricalAdmin', 'CleaningAdmin'];

/**
 * Gate: allows any authenticated user who isn't an admin.
 * Self-registered students aren't auto-placed in the 'Students' Cognito group,
 * so we can't require it — we just block anyone who IS an admin instead.
 */
module.exports = function requireStudent(req, res, next) {
  const groups = req.user?.groups || [];
  const isAdmin = groups.some(g => ADMIN_GROUPS.includes(g));
  if (isAdmin) {
    return res.status(403).json({ error: 'Access denied: Students only' });
  }
  next();
};
