/**
 * Maps Cognito group names to complaint category values.
 * SuperAdmin has null (access to all categories).
 */
const GROUP_TO_CATEGORY = {
  FoodAdmin: 'food',
  WaterAdmin: 'water',
  RoomAdmin: 'room',
  ElectricalAdmin: 'electrical',
  CleaningAdmin: 'cleaning',
};

const CATEGORY_ADMIN_GROUPS = Object.keys(GROUP_TO_CATEGORY);

/**
 * Gate: allows SuperAdmin OR any category admin group.
 * Injects req.adminCategory:
 *   - null for SuperAdmin (sees everything)
 *   - 'food' / 'water' / etc. for category admins
 */
module.exports = function requireAdmin(req, res, next) {
  const groups = req.user?.groups || [];

  if (groups.includes('SuperAdmin')) {
    req.adminCategory = null; // full access
    return next();
  }

  const catGroup = groups.find(g => CATEGORY_ADMIN_GROUPS.includes(g));
  if (catGroup) {
    req.adminCategory = GROUP_TO_CATEGORY[catGroup];
    return next();
  }

  return res.status(403).json({ error: 'Access denied: Admin only' });
};

// Export the mapping for use in other files (e.g., user sync)
module.exports.GROUP_TO_CATEGORY = GROUP_TO_CATEGORY;
module.exports.CATEGORY_ADMIN_GROUPS = CATEGORY_ADMIN_GROUPS;
