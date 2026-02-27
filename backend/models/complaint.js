const db = require('../config/db');

async function create({ studentId, category, description, priority }) {
  const [result] = await db.query(
    `INSERT INTO complaints (student_id, category, description, priority, stage)
     VALUES (?, ?, ?, ?, 1)`,
    [studentId, category, description, priority]
  );
  return result.insertId;
}

async function findByStudent(studentId) {
  const [rows] = await db.query(
    `SELECT * FROM complaints
     WHERE student_id = ?
     ORDER BY created_at DESC`,
    [studentId]
  );
  return rows;
}

async function findAll({ category, priority, stage } = {}) {
  let query = `
    SELECT c.*, u.name AS student_name, u.email AS student_email
    FROM complaints c
    JOIN users u ON c.student_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (category) { query += ' AND c.category = ?'; params.push(category); }
  if (priority) { query += ' AND c.priority = ?'; params.push(priority); }
  if (stage)    { query += ' AND c.stage = ?';    params.push(Number(stage)); }

  query += ' ORDER BY c.created_at DESC';

  const [rows] = await db.query(query, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT c.*, u.name AS student_name, u.email AS student_email
     FROM complaints c
     JOIN users u ON c.student_id = u.id
     WHERE c.id = ?`,
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
