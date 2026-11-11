const mysql = require("mysql2");
const { isDemoMode } = require("./runtime");

if (isDemoMode) {
  module.exports = {
    query() {
      throw new Error("Database queries are disabled in local demo mode.");
    },
  };
  return;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Connected to RDS MySQL");
    connection.release();
  }
});

module.exports = pool.promise();
