const db = require('../config/db');

/**
 * Records a stage change in the audit log.
 * changedBySub + changedByName come from the verified JWT — no users table needed.
 * The name is snapshotted at write time so the audit trail is preserved
 * even if the admin is later removed from Cognito.
 */
async function addLog({ complaintId, changedBySub, changedByName, fromStage, toStage, note }) {
  await db.query(
    `INSERT INTO complaint_logs (complaint_id, changed_by_sub, changed_by_name, from_stage, to_stage, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [complaintId, changedBySub, changedByName, fromStage, toStage, note || null]
  );
}

/**
 * Returns the full audit log for a complaint, ordered oldest → newest.
 * No JOIN to users table needed — changed_by_name is stored inline.
 */
async function getLogs(complaintId) {
  const [rows] = await db.query(
    `SELECT * FROM complaint_logs
     WHERE complaint_id = ?
     ORDER BY changed_at ASC`,
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
