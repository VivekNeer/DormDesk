const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { upsertUser } = require('../models/user');

/**
 * POST /api/users/sync
 * Called by the frontend immediately after every login.
 * Reads the Cognito JWT (already verified by auth middleware),
 * creates or updates the user record in MySQL.
 */
router.post('/sync', auth, async (req, res) => {
  try {
    const { sub, email, name, groups } = req.user;
    const role = groups.includes('SuperAdmin') ? 'admin' : 'student';

    const user = await upsertUser({ sub, name, email, role });
    res.json({ user });
  } catch (err) {
    console.error('User sync error:', err);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

module.exports = router;
