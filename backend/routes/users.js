const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { upsertUser } = require('../models/user');
const { GROUP_TO_CATEGORY, CATEGORY_ADMIN_GROUPS } = require('../middleware/requireAdmin');

/**
 * POST /api/users/sync
 * Called by the frontend immediately after every login.
 * Reads the Cognito JWT (already verified by auth middleware),
 * creates or updates the user record in MySQL.
 * Detects category admin groups and sets role + admin_category accordingly.
 */
router.post('/sync', auth, async (req, res) => {
  try {
    const { sub, email, name, groups } = req.user;

    let role = 'student';
    let adminCategory = null;

    if (groups.includes('SuperAdmin')) {
      role = 'admin';
    } else {
      const catGroup = groups.find(g => CATEGORY_ADMIN_GROUPS.includes(g));
      if (catGroup) {
        role = 'admin';
        adminCategory = GROUP_TO_CATEGORY[catGroup];
      }
    }

    const user = await upsertUser({ sub, name, email, role, adminCategory });
    res.json({ user });
  } catch (err) {
    console.error('User sync error:', err);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

module.exports = router;
