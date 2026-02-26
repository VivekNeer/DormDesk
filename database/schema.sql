-- DormDesk Database Schema v2
-- Includes: Cognito auth, complaint stages, admin categories, audit log, notifications
-- Apply with: mysql -h <rds-endpoint> -u admin -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS dormdesk;
USE dormdesk;

-- ============================================================
-- USERS TABLE
-- Linked to AWS Cognito via cognito_sub (Cognito's unique user ID)
-- Role and admin_category are derived from Cognito Groups
-- but stored here for query efficiency
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  cognito_sub    VARCHAR(255) NOT NULL UNIQUE,     -- Cognito User Pool sub (UUID)
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  role           ENUM('student', 'category_admin', 'super_admin') NOT NULL DEFAULT 'student',
  admin_category ENUM('food', 'water', 'room', 'electrical', 'cleaning', 'other') NULL,
  -- admin_category is only set for category_admin role
  -- NULL for students and super_admin
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- COMPLAINTS TABLE
-- core complaint record with 4-stage lifecycle
-- ============================================================
CREATE TABLE IF NOT EXISTS complaints (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  student_id       INT NOT NULL,                   -- FK → users.id (student)
  category         ENUM('food', 'water', 'room', 'electrical', 'cleaning', 'other') NOT NULL,
  description      TEXT NOT NULL,
  priority         ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',

  -- Stage lifecycle
  -- 1: received | 2: acknowledged | 3: in-progress | 4: resolved
  stage            TINYINT NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 4),

  -- Admin who is currently handling this complaint (category admin or super admin)
  assigned_to      INT NULL,                       -- FK → users.id (admin)

  -- Editable fields (admin can modify before Stage 3)
  admin_notes      TEXT NULL,                      -- Admin's internal notes

  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- COMPLAINT_LOGS TABLE
-- Audit trail: records every stage change, who made it, when
-- ============================================================
CREATE TABLE IF NOT EXISTS complaint_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id    INT NOT NULL,
  changed_by      INT NOT NULL,                    -- FK → users.id (admin who acted)
  from_stage      TINYINT NOT NULL,
  to_stage        TINYINT NOT NULL,
  note            TEXT NULL,                       -- Optional note on the action
  changed_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by)   REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- Tracks all email notifications sent (for audit and dedup)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id    INT NOT NULL,
  sent_to_user_id INT NOT NULL,                    -- FK → users.id (category admin)
  sent_to_email   VARCHAR(150) NOT NULL,
  type            ENUM('email', 'pdf_email') NOT NULL DEFAULT 'email',
  status          ENUM('sent', 'failed') NOT NULL DEFAULT 'sent',
  sent_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (complaint_id)    REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (sent_to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- ADMIN_CATEGORY_CONFIG TABLE
-- Maps complaint category → category admin email for SES
-- This can also be derived from users table, but this gives
-- an easily editable config without touching user records
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_category_config (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  category        ENUM('food', 'water', 'room', 'electrical', 'cleaning', 'other') NOT NULL UNIQUE,
  admin_user_id   INT NOT NULL,                    -- FK → users.id (the category admin)
  admin_email     VARCHAR(150) NOT NULL,           -- Email to receive SES notifications
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (admin_user_id) REFERENCES users(id)
);

-- ============================================================
-- INDEXES for query performance
-- ============================================================
CREATE INDEX idx_complaints_student_id  ON complaints(student_id);
CREATE INDEX idx_complaints_category    ON complaints(category);
CREATE INDEX idx_complaints_stage       ON complaints(stage);
CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to);
CREATE INDEX idx_complaint_logs_complaint_id ON complaint_logs(complaint_id);
CREATE INDEX idx_notifications_complaint_id  ON notifications(complaint_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- NOTE: In the real system, users are created via Cognito first.
-- The cognito_sub values below are placeholders.
-- Replace with actual Cognito subs after creating accounts in User Pool.

-- Super Admin
INSERT IGNORE INTO users (cognito_sub, name, email, role, admin_category)
VALUES ('REPLACE_WITH_COGNITO_SUB_SUPERADMIN', 'Super Admin', 'superadmin@dormdesk.com', 'super_admin', NULL);

-- Category Admins
INSERT IGNORE INTO users (cognito_sub, name, email, role, admin_category) VALUES
  ('REPLACE_WITH_COGNITO_SUB_FOOD',     'Food Admin',        'food@dormdesk.com',        'category_admin', 'food'),
  ('REPLACE_WITH_COGNITO_SUB_WATER',    'Water Admin',       'water@dormdesk.com',       'category_admin', 'water'),
  ('REPLACE_WITH_COGNITO_SUB_ROOM',     'Room Admin',        'room@dormdesk.com',        'category_admin', 'room'),
  ('REPLACE_WITH_COGNITO_SUB_ELEC',     'Electrical Admin',  'electrical@dormdesk.com',  'category_admin', 'electrical'),
  ('REPLACE_WITH_COGNITO_SUB_CLEANING', 'Cleaning Admin',    'cleaning@dormdesk.com',    'category_admin', 'cleaning');

-- Admin Category Config (links category → admin email for SES notifications)
-- Run AFTER inserting users, replace user_ids with actual IDs
-- INSERT INTO admin_category_config (category, admin_user_id, admin_email) VALUES
--   ('food',        2, 'food@dormdesk.com'),
--   ('water',       3, 'water@dormdesk.com'),
--   ('room',        4, 'room@dormdesk.com'),
--   ('electrical',  5, 'electrical@dormdesk.com'),
--   ('cleaning',    6, 'cleaning@dormdesk.com');
