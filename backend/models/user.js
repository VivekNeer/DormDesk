const db = require('../config/db');

async function findBySub(sub) {
  const [rows] = await db.query(
    'SELECT * FROM users WHERE cognito_sub = ?',
    [sub]
  );
  return rows[0] || null;
}

/**
 * Creates user if not exists, updates name/email if they changed.
 * Called on every login via POST /api/users/sync
 */
async function upsertUser({ sub, name, email, role }) {
  await db.query(
    `INSERT INTO users (cognito_sub, name, email, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name  = VALUES(name),
       email = VALUES(email),
       role  = VALUES(role)`,
    [sub, name, email, role]
  );
  return findBySub(sub);
}

module.exports = { findBySub, upsertUser };
