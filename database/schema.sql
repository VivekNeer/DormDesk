-- DormDesk Database Schema
-- Fully Cognito-native: no users table, no integer FKs to users.
-- Identity comes straight from the JWT (cognito_sub = Cognito's unique UUID).
--
-- Apply with: mysql -h <rds-endpoint> -u admin -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS dormdesk;
USE dormdesk;

-- ╔══════════════════════════════════════════════════════╗
-- ║              PHASE 1 — MVP TABLES                   ║
-- ╚══════════════════════════════════════════════════════╝

-- ──────────────────────────────────────────────────────
-- COMPLAINTS TABLE
-- student_sub: Cognito sub of the student who filed it (from JWT, never stored in users table)
-- assigned_to_sub: Cognito sub of the admin handling it (NULL until assigned, Phase 2 mainly)
-- stage values: 1=received, 2=acknowledged, 3=in-progress, 4=resolved
-- ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  student_sub     VARCHAR(255) NOT NULL,       -- Cognito sub of the student
  student_email   VARCHAR(150) NOT NULL,       -- Stored at submit time for display; no FK needed
  student_name    VARCHAR(100) NOT NULL,       -- Same: stored at submit time
  category        ENUM('food', 'water', 'room', 'electrical', 'cleaning', 'other') NOT NULL,
  description     TEXT NOT NULL,
  priority        ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  stage           TINYINT NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 4),
  assigned_to_sub VARCHAR(255) NULL,          -- Cognito sub of the admin (Phase 2)
  admin_notes     TEXT NULL,                  -- Optional notes from the admin
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ──────────────────────────────────────────────────────
-- COMPLAINT_LOGS TABLE
-- Audit trail: every stage change is recorded with the admin's cognito_sub.
-- changed_by_sub: Cognito sub of the admin who made the change
-- changed_by_name: Stored at write time so history is preserved even if admin is removed from Cognito
-- ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id    INT NOT NULL,
  changed_by_sub  VARCHAR(255) NOT NULL,      -- Cognito sub of the admin
  changed_by_name VARCHAR(100) NOT NULL,      -- Snapshot of admin name at time of change
  from_stage      TINYINT NOT NULL,
  to_stage        TINYINT NOT NULL,
  note            TEXT NULL,                  -- Optional note explaining the stage change
  changed_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────────────────
-- INDEXES (Phase 1)
-- ──────────────────────────────────────────────────────
CREATE INDEX idx_complaints_student_sub    ON complaints(student_sub);
CREATE INDEX idx_complaints_category       ON complaints(category);
CREATE INDEX idx_complaints_stage          ON complaints(stage);
CREATE INDEX idx_complaint_logs_complaint  ON complaint_logs(complaint_id);


-- ╔══════════════════════════════════════════════════════╗
-- ║         PHASE 2 TABLES (Run only in Phase 2)        ║
-- ║         Uncomment and run these manually             ║
-- ╚══════════════════════════════════════════════════════╝

-- -- NOTIFICATIONS TABLE
-- -- Tracks all email notifications sent (for audit and dedup)
-- CREATE TABLE IF NOT EXISTS notifications (
--   id              INT AUTO_INCREMENT PRIMARY KEY,
--   complaint_id    INT NOT NULL,
--   sent_to_sub     VARCHAR(255) NOT NULL,
--   sent_to_email   VARCHAR(150) NOT NULL,
--   type            ENUM('email', 'pdf_email') NOT NULL DEFAULT 'email',
--   status          ENUM('sent', 'failed') NOT NULL DEFAULT 'sent',
--   sent_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
-- );

-- -- ADMIN_CATEGORY_CONFIG TABLE
-- -- Maps complaint category → the category admin's Cognito sub (for SES)
-- CREATE TABLE IF NOT EXISTS admin_category_config (
--   id            INT AUTO_INCREMENT PRIMARY KEY,
--   category      ENUM('food','water','room','electrical','cleaning','other') NOT NULL UNIQUE,
--   admin_sub     VARCHAR(255) NOT NULL,
--   admin_email   VARCHAR(150) NOT NULL,
--   updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
-- );

-- ╔══════════════════════════════════════════════════════╗
-- ║                   SEED DATA                         ║
-- ║  None needed — all admin identity comes from        ║
-- ║  Cognito groups in the JWT. No users table exists.  ║
-- ╚══════════════════════════════════════════════════════╝
