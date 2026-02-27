const db = require('../config/db');

/**
 * Creates a new complaint.
 * student_sub, student_email, student_name come straight from the verified JWT —
 * no users table lookup needed.
 */
async function create({ studentSub, studentEmail, studentName, category, description, priority }) {
  const [result] = await db.query(
    `INSERT INTO complaints (student_sub, student_email, student_name, category, description, priority, stage)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [studentSub, studentEmail, studentName, category, description, priority]
  );
  return result.insertId;
}

/**
 * Returns all complaints filed by a specific student (matched by Cognito sub).
 */
async function findByStudent(studentSub) {
  const [rows] = await db.query(
    `SELECT * FROM complaints
     WHERE student_sub = ?
     ORDER BY created_at DESC`,
    [studentSub]
  );
  return rows;
}

/**
 * Returns complaints for admin view with optional filters.
 * adminCategory: null = SuperAdmin sees all; 'food'/'water'/etc = category admin scoped view.
 */
async function findAll({ category, priority, stage, adminCategory } = {}) {
  let query = `SELECT * FROM complaints WHERE 1=1`;
  const params = [];

  // Category admin scoping: auto-filter to their category
  if (adminCategory)    { query += ' AND category = ?'; params.push(adminCategory); }
  // Manual category filter (SuperAdmin can filter further)
  else if (category)    { query += ' AND category = ?'; params.push(category); }

  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  if (stage)    { query += ' AND stage = ?';    params.push(Number(stage)); }

  query += ' ORDER BY created_at DESC';

  const [rows] = await db.query(query, params);
  return rows;
}

/**
 * Returns a single complaint by ID.
 */
async function findById(id) {
  const [rows] = await db.query(
    `SELECT * FROM complaints WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function updateDetails(id, { category, description, priority, adminNotes }) {
  await db.query(
    `UPDATE complaints
     SET category = ?, description = ?, priority = ?, admin_notes = ?, updated_at = NOW()
     WHERE id = ?`,
    [category, description, priority, adminNotes || null, id]
  );
}

async function updateStage(id, stage) {
  await db.query(
    `UPDATE complaints SET stage = ?, updated_at = NOW() WHERE id = ?`,
    [stage, id]
  );
}

module.exports = { create, findByStudent, findAll, findById, updateDetails, updateStage };
