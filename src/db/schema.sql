-- PostgreSQL Schema for "ប្រព័ន្ធតាមដានការអានរបស់សិស្ស (Reading Assessment System)"
-- Compatible with Neon PostgreSQL (neon.tech)

CREATE TABLE IF NOT EXISTS teachers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'teacher', -- 'admin' | 'teacher'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'suspended'
  phone VARCHAR(50),
  telegram_username VARCHAR(50),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by VARCHAR(64),
  status_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(64) PRIMARY KEY,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  order_no INT NOT NULL,
  class_name VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  age INT NOT NULL,
  gender VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS passages (
  id VARCHAR(64) PRIMARY KEY,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  note TEXT,
  level VARCHAR(50) DEFAULT 'មធ្យម',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reading_sessions (
  id VARCHAR(64) PRIMARY KEY,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  passage_id VARCHAR(64) NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
  score NUMERIC(5, 2),
  max_score NUMERIC(5, 2) DEFAULT 10,
  comment TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS word_marks (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
  word_index INT NOT NULL,
  word VARCHAR(255) NOT NULL,
  mark_type VARCHAR(50) NOT NULL -- 'wrong' | 'skipped'
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  admin_id VARCHAR(64) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_teacher_id VARCHAR(64),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Essential Performance & Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_phone_unique ON teachers (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_telegram_unique ON teachers (telegram_username) WHERE telegram_username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers (status);
CREATE INDEX IF NOT EXISTS idx_teachers_role ON teachers (role);
CREATE INDEX IF NOT EXISTS idx_word_marks_word ON word_marks(word);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_student_id ON reading_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_students_teacher_class ON students(teacher_id, class_name);
CREATE INDEX IF NOT EXISTS idx_passages_teacher ON passages(teacher_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_teacher ON reading_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs (created_at DESC);
