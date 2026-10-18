-- Migration: 001_add_admin_approval.sql
-- Purpose: Add role, status, phone, telegram_username, approval tracking to teachers table,
-- and create admin_audit_logs table.
-- Safety: Idempotent - safe to run multiple times without locking out existing teachers.
-- WARNING: Always backup your database before running migrations in production.

DO $$
BEGIN
  -- 1. Add columns as nullable first
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teachers' AND column_name='role') THEN
    ALTER TABLE teachers ADD COLUMN role VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teachers' AND column_name='status') THEN
    ALTER TABLE teachers ADD COLUMN status VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teachers' AND column_name='phone') THEN
    ALTER TABLE teachers ADD COLUMN phone VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teachers' AND column_name='telegram_username') THEN
    ALTER TABLE teachers ADD COLUMN telegram_username VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teachers' AND column_name='approved_at') THEN
    ALTER TABLE teachers ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teachers' AND column_name='approved_by') THEN
    ALTER TABLE teachers ADD COLUMN approved_by VARCHAR(64);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teachers' AND column_name='status_note') THEN
    ALTER TABLE teachers ADD COLUMN status_note TEXT;
  END IF;

  -- 2. One-time backfill: ensure all existing teachers who have null status are marked as 'approved' and 'teacher'
  UPDATE teachers
  SET
    role = COALESCE(role, 'teacher'),
    status = COALESCE(status, 'approved'),
    approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP)
  WHERE status IS NULL OR role IS NULL;

  -- 3. Set NOT NULL and default values for future teachers
  ALTER TABLE teachers ALTER COLUMN role SET DEFAULT 'teacher';
  ALTER TABLE teachers ALTER COLUMN status SET DEFAULT 'pending';
  ALTER TABLE teachers ALTER COLUMN role SET NOT NULL;
  ALTER TABLE teachers ALTER COLUMN status SET NOT NULL;

END $$;

-- 4. Unique indexes on phone and telegram_username (Postgres allows multiple NULL values in UNIQUE index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_phone_unique ON teachers (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_telegram_unique ON teachers (telegram_username) WHERE telegram_username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers (status);
CREATE INDEX IF NOT EXISTS idx_teachers_role ON teachers (role);

-- 5. Create admin_audit_logs table if not exists
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  admin_id VARCHAR(64) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_teacher_id VARCHAR(64),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs (target_teacher_id);
