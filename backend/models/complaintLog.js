const db = require('../config/db');

async function addLog({ complaintId, changedBy, fromStage, toStage, note }) {
  await db.query(
    `INSERT INTO complaint_logs (complaint_id, changed_by, from_stage, to_stage, note)
     VALUES (?, ?, ?, ?, ?)`,
    [complaintId, changedBy, fromStage, toStage, note || null]
  );
}

async function getLogs(complaintId) {
  const [rows] = await db.query(
    `SELECT cl.*, u.name AS changed_by_name
     FROM complaint_logs cl
     JOIN users u ON cl.changed_by = u.id
     WHERE cl.complaint_id = ?
     ORDER BY cl.changed_at ASC`,
    [complaintId]
  );
  return rows;
}

/**
 * Deletes the most recent log entry for a complaint.
 * Used when reverting a stage — erases the forward transition as if it never happened.
 */
async function deleteLatestLog(complaintId) {
  await db.query(
    `DELETE FROM complaint_logs
     WHERE id = (
       SELECT id FROM (
         SELECT id FROM complaint_logs
         WHERE complaint_id = ?
         ORDER BY changed_at DESC
         LIMIT 1
       ) AS latest
     )`,
    [complaintId]
  );
}

module.exports = { addLog, getLogs, deleteLatestLog };
