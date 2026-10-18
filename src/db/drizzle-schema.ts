import { pgTable, varchar, text, integer, numeric, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const teachers = pgTable('teachers', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('teacher'), // 'admin' | 'teacher'
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'suspended'
  phone: varchar('phone', { length: 50 }),
  telegramUsername: varchar('telegram_username', { length: 50 }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedBy: varchar('approved_by', { length: 64 }),
  statusNote: text('status_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table: any) => ({
  statusIdx: index('idx_teachers_status').on(table.status),
  roleIdx: index('idx_teachers_role').on(table.role),
  phoneUniqueIdx: uniqueIndex('idx_teachers_phone_unique').on(table.phone),
  telegramUniqueIdx: uniqueIndex('idx_teachers_telegram_unique').on(table.telegramUsername),
}));

export const students = pgTable('students', {
  id: varchar('id', { length: 64 }).primaryKey(),
  teacherId: varchar('teacher_id', { length: 64 }).notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  orderNo: integer('order_no').notNull(),
  className: varchar('class_name', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  age: integer('age').notNull(),
  gender: varchar('gender', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table: any) => ({
  teacherClassIdx: index('idx_students_teacher_class').on(table.teacherId, table.className),
}));

export const passages = pgTable('passages', {
  id: varchar('id', { length: 64 }).primaryKey(),
  teacherId: varchar('teacher_id', { length: 64 }).notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  note: text('note'),
  level: varchar('level', { length: 50 }).default('មធ្យម'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table: any) => ({
  teacherIdx: index('idx_passages_teacher').on(table.teacherId),
}));

export const readingSessions = pgTable('reading_sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  teacherId: varchar('teacher_id', { length: 64 }).notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  studentId: varchar('student_id', { length: 64 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  passageId: varchar('passage_id', { length: 64 }).notNull().references(() => passages.id, { onDelete: 'cascade' }),
  words: jsonb('words').notNull().default([]),
  status: varchar('status', { length: 50 }).notNull().default('in_progress'),
  score: numeric('score', { precision: 5, scale: 2 }),
  maxScore: numeric('max_score', { precision: 5, scale: 2 }).default('10'),
  comment: text('comment'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
}, (table: any) => ({
  studentIdx: index('idx_reading_sessions_student_id').on(table.studentId),
  teacherIdx: index('idx_reading_sessions_teacher').on(table.teacherId),
}));

export const wordMarks = pgTable('word_marks', {
  id: varchar('id', { length: 64 }).primaryKey(),
  sessionId: varchar('session_id', { length: 64 }).notNull().references(() => readingSessions.id, { onDelete: 'cascade' }),
  wordIndex: integer('word_index').notNull(),
  word: varchar('word', { length: 255 }).notNull(),
  markType: varchar('mark_type', { length: 50 }).notNull(), // 'wrong' | 'skipped'
}, (table: any) => ({
  wordIdx: index('idx_word_marks_word').on(table.word),
}));

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  adminId: varchar('admin_id', { length: 64 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  targetTeacherId: varchar('target_teacher_id', { length: 64 }),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table: any) => ({
  createdAtIdx: index('idx_admin_audit_logs_created_at').on(table.createdAt),
  targetIdx: index('idx_admin_audit_logs_target').on(table.targetTeacherId),
}));
