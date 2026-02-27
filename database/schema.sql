-- DormDesk Database Schema
-- Phase 1 (MVP):  users, complaints, complaint_logs
-- Phase 2 (later): notifications, admin_category_config
--
-- Apply with: mysql -h <rds-endpoint> -u admin -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS dormdesk;
USE dormdesk;

-- ╔══════════════════════════════════════════════════════╗
-- ║              PHASE 1 — MVP TABLES                   ║
-- ╚══════════════════════════════════════════════════════╝

-- ──────────────────────────────────────────────────────
-- USERS TABLE
-- Linked to AWS Cognito via cognito_sub (Cognito's unique user UUID)
-- role: 'student' or 'admin' (MVP — only 2 roles)
-- admin_category: NULL in MVP; populated in Phase 2 for category admins
-- ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  cognito_sub    VARCHAR(255) NOT NULL UNIQUE,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  role           ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  admin_category ENUM('food', 'water', 'room', 'electrical', 'cleaning', 'other') NULL,
  -- admin_category is NULL in MVP.
  -- In Phase 2: set this to the category the admin is responsible for.
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ──────────────────────────────────────────────────────
-- COMPLAINTS TABLE
-- Core complaint record with 4-stage lifecycle.
-- stage values: 1=received, 2=acknowledged, 3=in-progress, 4=resolved
-- ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  category      ENUM('food', 'water', 'room', 'electrical', 'cleaning', 'other') NOT NULL,
  description   TEXT NOT NULL,
  priority      ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  stage         TINYINT NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 4),
  assigned_to   INT NULL,            -- FK to users.id (admin handling it, Phase 2 mainly)
  admin_notes   TEXT NULL,           -- Optional notes from the admin
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (student_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- ──────────────────────────────────────────────────────
-- COMPLAINT_LOGS TABLE
-- Audit trail: every stage change, who made it, when.
-- Included in MVP — cheap to implement from day 1, valuable for viva.
-- ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  changed_by   INT NOT NULL,         -- FK to users.id (admin who made the change)
  from_stage   TINYINT NOT NULL,
  to_stage     TINYINT NOT NULL,
  note         TEXT NULL,            -- Optional note explaining the stage change
  changed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by)   REFERENCES users(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────────────────
-- INDEXES (Phase 1)
-- ──────────────────────────────────────────────────────
CREATE INDEX idx_complaints_student_id    ON complaints(student_id);
CREATE INDEX idx_complaints_category      ON complaints(category);
CREATE INDEX idx_complaints_stage         ON complaints(stage);
CREATE INDEX idx_complaint_logs_complaint ON complaint_logs(complaint_id);


-- ╔══════════════════════════════════════════════════════╗
-- ║         PHASE 2 TABLES (Run only in Phase 2)        ║
-- ║         Uncomment and run these manually             ║
-- ╚══════════════════════════════════════════════════════╝

-- -- NOTIFICATIONS TABLE
-- -- Tracks all email notifications sent (for audit and dedup)
-- CREATE TABLE IF NOT EXISTS notifications (
--   id              INT AUTO_INCREMENT PRIMARY KEY,
--   complaint_id    INT NOT NULL,
--   sent_to_user_id INT NOT NULL,
--   sent_to_email   VARCHAR(150) NOT NULL,
--   type            ENUM('email', 'pdf_email') NOT NULL DEFAULT 'email',
--   status          ENUM('sent', 'failed') NOT NULL DEFAULT 'sent',
--   sent_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (complaint_id)    REFERENCES complaints(id) ON DELETE CASCADE,
--   FOREIGN KEY (sent_to_user_id) REFERENCES users(id) ON DELETE CASCADE
-- );

-- -- ADMIN_CATEGORY_CONFIG TABLE
-- -- Maps complaint category → the category admin's email (for SES)
-- CREATE TABLE IF NOT EXISTS admin_category_config (
--   id            INT AUTO_INCREMENT PRIMARY KEY,
--   category      ENUM('food','water','room','electrical','cleaning','other') NOT NULL UNIQUE,
--   admin_user_id INT NOT NULL,
--   admin_email   VARCHAR(150) NOT NULL,
--   updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   FOREIGN KEY (admin_user_id) REFERENCES users(id)
-- );


-- ╔══════════════════════════════════════════════════════╗
-- ║                   SEED DATA                         ║
-- ╚══════════════════════════════════════════════════════╝

-- NOTE: Users are created first in AWS Cognito.
-- After creating the Cognito accounts, note each user's `sub` (UUID)
-- and replace the placeholder below with the actual sub.

-- Super Admin (Phase 1 — the only admin account in MVP)
-- Replace 'REPLACE_WITH_COGNITO_SUB_SUPERADMIN' with actual Cognito sub
INSERT IGNORE INTO users (cognito_sub, name, email, role, admin_category)
VALUES ('31d3fd9a-00b1-70af-ecd2-4dc7a9ffc8fd', 'Super Admin', 'admin@gmail.com', 'admin', NULL);

-- ── Phase 2 seeds (uncomment when doing Phase 2) ──────
-- INSERT IGNORE INTO users (cognito_sub, name, email, role, admin_category) VALUES
--   ('REPLACE_FOOD_SUB',     'Food Admin',       'food@dormdesk.com',        'admin', 'food'),
--   ('REPLACE_WATER_SUB',    'Water Admin',      'water@dormdesk.com',       'admin', 'water'),
--   ('REPLACE_ROOM_SUB',     'Room Admin',       'room@dormdesk.com',        'admin', 'room'),
--   ('REPLACE_ELEC_SUB',     'Electrical Admin', 'electrical@dormdesk.com',  'admin', 'electrical'),
--   ('REPLACE_CLEAN_SUB',    'Cleaning Admin',   'cleaning@dormdesk.com',    'admin', 'cleaning');
