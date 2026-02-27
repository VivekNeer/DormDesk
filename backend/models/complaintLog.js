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

module.exports = { addLog, getLogs };
