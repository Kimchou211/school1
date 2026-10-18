import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import {
  Teacher,
  Student,
  Passage,
  ReadingSession,
  WordMark,
  WordFrequencyReport,
  StudentRanking,
  Gender,
  PassageLevel,
  MarkType,
  TeacherStatus,
  UserRole,
  AdminAuditLog,
  AdminStats,
} from '../types/index.ts';
import {
  SEED_ADMIN,
  SEED_TEACHER,
  SEED_PENDING_TEACHER,
  SEED_PASSWORD_HASH,
  SEED_STUDENTS,
  SEED_PASSAGES,
  SEED_SESSIONS,
  SEED_WORD_MARKS,
} from '../db/seed-data.ts';

const { Pool } = pg;

interface TeacherWithHash extends Teacher {
  passwordHash: string;
}

class DatabaseManager {
  private basePool: pg.Pool | null = null;
  private readonly requestPoolStorage = new AsyncLocalStorage<pg.Pool>();
  private initialization: Promise<void>;

  // Cloudflare Workers must use request-scoped driver connections. Hyperdrive pools the
  // upstream database connections, while AsyncLocalStorage isolates each request's client pool.
  private get pool(): pg.Pool | null {
    const activePool = this.requestPoolStorage.getStore() ?? this.basePool;
    // Never allow hosted requests to silently fall back to the in-memory store if a
    // request-scoped Hyperdrive connection is missing. Local development may still fallback.
    if (process.env.REQUIRE_DATABASE === 'true' && this.isNeonConnected && !activePool) {
      throw new Error('Production database access requires an active request-scoped Neon/Hyperdrive connection.');
    }
    return activePool;
  }

  private set pool(value: pg.Pool | null) {
    this.basePool = value;
  }

  public createRequestPool(): pg.Pool {
    if (!this.isNeonConnected || !process.env.DATABASE_URL) {
      throw new Error('Neon database is not ready for this request.');
    }
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.CLOUDFLARE_WORKER === 'true' ? undefined : { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 0,
    });
  }

  public async runWithRequestPool<T>(pool: pg.Pool, operation: () => Promise<T>): Promise<T> {
    try {
      return await this.requestPoolStorage.run(pool, operation);
    } finally {
      await pool.end().catch(() => undefined);
    }
  }
  public isNeonConnected: boolean = false;
  public connectionError: string | null = null;

  // In-memory / Fallback Store
  private teachers: TeacherWithHash[] = [
    { ...SEED_ADMIN, passwordHash: SEED_PASSWORD_HASH },
    { ...SEED_TEACHER, passwordHash: SEED_PASSWORD_HASH },
    { ...SEED_PENDING_TEACHER, passwordHash: SEED_PASSWORD_HASH },
  ];
  private students: Student[] = [...SEED_STUDENTS];
  private passages: Passage[] = [...SEED_PASSAGES];
  private sessions: ReadingSession[] = [...SEED_SESSIONS];
  private wordMarks: WordMark[] = [...SEED_WORD_MARKS];
  private auditLogs: AdminAuditLog[] = [
    {
      id: 'log-001',
      adminId: 'admin-demo-01',
      adminName: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)',
      action: 'APPROVE',
      targetTeacherId: 'teacher-demo-01',
      targetTeacherName: 'លោកគ្រូ សុវណ្ណ គឹមសាន',
      note: 'អនុម័តគណនីគ្រូចាស់ក្នុងប្រព័ន្ធ',
      createdAt: new Date('2026-08-01').toISOString(),
    },
  ];

  constructor() {
    this.initialization = this.initDatabase();
  }

  /** Wait for initialization; retry a failed cold-start connection on a later production request. */
  public async waitUntilInitialized(): Promise<void> {
    try {
      await this.initialization;
    } catch (error) {
      if (process.env.REQUIRE_DATABASE !== 'true') throw error;
      this.initialization = this.initDatabase();
      await this.initialization;
    }
  }

  private async initDatabase() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && dbUrl.trim() !== '') {
      try {
        this.pool = new Pool({
          connectionString: dbUrl,
          ssl: process.env.CLOUDFLARE_WORKER === 'true' ? undefined : { rejectUnauthorized: false },
        });

        // Test connection & initialize schema
        const client = await this.pool.connect();
        try {
          await this.createTablesIfNotExist(client);
          this.isNeonConnected = true;
          this.connectionError = null;
          console.log('✅ Connected to Neon PostgreSQL database successfully.');
          await this.seedNeonDatabaseIfEmpty(client);
        } finally {
          client.release();
        }
        if (process.env.CLOUDFLARE_WORKER === 'true' && this.pool) {
          await this.pool.end();
          this.pool = null;
        }
      } catch (err: unknown) {
        this.isNeonConnected = false;
        this.connectionError = (err as Error).message || 'Neon connection failed';
        console.error('⚠️ Neon PostgreSQL connection failed:', this.connectionError);
        if (process.env.REQUIRE_DATABASE === 'true') {
          await this.pool?.end().catch(() => undefined);
          this.pool = null;
          throw new Error('Neon PostgreSQL is required in production; refusing to use in-memory fallback. ' + this.connectionError);
        }
        console.warn('Falling back to in-memory store only for local development.');
      }
    } else {
      this.connectionError = 'DATABASE_URL is not configured';
      console.warn('⚠️ DATABASE_URL not set. Running with in-memory fallback data only; writes will not appear in Neon and will be lost when the server restarts.');
      if (process.env.REQUIRE_DATABASE === 'true') {
        throw new Error('Neon PostgreSQL is required in production, but DATABASE_URL is not configured.');
      }
    }
  }

  private async createTablesIfNotExist(client: pg.PoolClient) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'teacher',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        phone VARCHAR(50),
        telegram_username VARCHAR(100),
        approved_at TIMESTAMP WITH TIME ZONE,
        approved_by VARCHAR(64),
        status_note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Schema Migration: Add missing columns if teachers table previously existed
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'teacher';
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100);
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS approved_by VARCHAR(64);
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS status_note TEXT;

      -- One-time backfill for existing teachers: set status to 'approved' if null or empty
      UPDATE teachers SET status = 'approved' WHERE status IS NULL;
      UPDATE teachers SET role = 'teacher' WHERE role IS NULL;

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
        mark_type VARCHAR(50) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        admin_id VARCHAR(64) NOT NULL,
        admin_name VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        target_teacher_id VARCHAR(64),
        target_teacher_name VARCHAR(255),
        note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Internal, versioned setup markers (e.g. first hosted Admin bootstrap).
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(120) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);
      CREATE INDEX IF NOT EXISTS idx_teachers_role ON teachers(role);
      CREATE INDEX IF NOT EXISTS idx_word_marks_word ON word_marks(word);
      CREATE INDEX IF NOT EXISTS idx_reading_sessions_student_id ON reading_sessions(student_id);
      CREATE INDEX IF NOT EXISTS idx_students_teacher_class ON students(teacher_id, class_name);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
    `);
  }

  private async seedNeonDatabaseIfEmpty(client: pg.PoolClient) {
    const res = await client.query('SELECT COUNT(*) FROM teachers');
    const count = parseInt(res.rows[0].count, 10);
    const productionMode = process.env.REQUIRE_DATABASE === 'true';
    const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const configuredAdminPassword = process.env.ADMIN_PASSWORD;

    if (productionMode && (!configuredAdminEmail || !configuredAdminPassword || configuredAdminPassword.length < 12)) {
      throw new Error('Production setup requires ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) before the first database connection.');
    }

    // In production, never create the public demo admin with the well-known 123456 password.
    const adminEmail = configuredAdminEmail || SEED_ADMIN.email;
    const adminPasswordHash = configuredAdminPassword
      ? bcrypt.hashSync(configuredAdminPassword, 10)
      : SEED_PASSWORD_HASH;

    const adminCheck = await client.query('SELECT id, email FROM teachers WHERE role = $1 LIMIT 1', ['admin']);

    if (productionMode) {
      const bootstrapCheck = await client.query(
        'SELECT value FROM system_config WHERE key = $1',
        ['admin_bootstrap_v1'],
      );

      if (adminCheck.rows.length === 0) {
        // If an Admin row was removed, restore the account from the configured secrets.
        await client.query(
          'INSERT INTO teachers (id, name, email, password_hash, role, status, phone, telegram_username, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [SEED_ADMIN.id, SEED_ADMIN.name, adminEmail, adminPasswordHash, 'admin', 'approved', SEED_ADMIN.phone, SEED_ADMIN.telegramUsername, SEED_ADMIN.createdAt]
        );
      } else if (bootstrapCheck.rows.length === 0) {
        // One-time migration from older development seeds: make the first hosted Admin use
        // the deployment secrets, then remember completion so cold starts never reset UI edits.
        await client.query(
          'UPDATE teachers SET email = $1, password_hash = $2, role = $3, status = $4 WHERE id = $5',
          [adminEmail, adminPasswordHash, 'admin', 'approved', adminCheck.rows[0].id],
        );
      } else {
        // Preserve credentials edited later in the Admin UI across Worker cold starts.
        console.log('ℹ️ Existing Admin account preserved; bootstrap Admin secrets are not reapplied.');
      }

      await client.query(
        `INSERT INTO system_config (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        ['admin_bootstrap_v1', 'completed'],
      );

      // Neutralize old demo credentials if this Neon database was previously used for local testing.
      // Keep the rows (and any related data) intact, but prevent login with the well-known 123456 password.
      const disabledDemoPasswordHash = bcrypt.hashSync(randomBytes(48).toString('hex'), 10);
      await client.query(
        'UPDATE teachers SET password_hash = $1, status = $2 WHERE email = ANY($3::text[]) AND role <> $4',
        [disabledDemoPasswordHash, 'suspended', [SEED_TEACHER.email, SEED_PENDING_TEACHER.email], 'admin']
      );
      console.log('✅ Production setup: configured Admin is ready; demo accounts are disabled and demo records were not seeded.');
      return;
    }

    // Local development can use explicit seed credentials. Hosted Admin bootstrap is
    // handled above and is persisted in system_config.
    if (adminCheck.rows.length === 0) {
      await client.query(
        'INSERT INTO teachers (id, name, email, password_hash, role, status, phone, telegram_username, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [SEED_ADMIN.id, SEED_ADMIN.name, adminEmail, adminPasswordHash, 'admin', 'approved', SEED_ADMIN.phone, SEED_ADMIN.telegramUsername, SEED_ADMIN.createdAt]
      );
    } else if (process.env.ADMIN_EMAIL || process.env.ADMIN_PASSWORD) {
      await client.query(
        'UPDATE teachers SET email = $1, password_hash = $2, role = $3, status = $4 WHERE id = $5',
        [adminEmail, adminPasswordHash, 'admin', 'approved', adminCheck.rows[0].id],
      );
    }

    // Always ensure SEED_TEACHER has valid password hash and is approved
    const teacherCheck = await client.query('SELECT id FROM teachers WHERE email = $1', [SEED_TEACHER.email]);
    if (teacherCheck.rows.length === 0) {
      await client.query(
        'INSERT INTO teachers (id, name, email, password_hash, role, status, phone, telegram_username, approved_at, approved_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [SEED_TEACHER.id, SEED_TEACHER.name, SEED_TEACHER.email, SEED_PASSWORD_HASH, 'teacher', 'approved', SEED_TEACHER.phone, SEED_TEACHER.telegramUsername, SEED_TEACHER.approvedAt, SEED_TEACHER.approvedBy, SEED_TEACHER.createdAt]
      );
    } else {
      await client.query('UPDATE teachers SET password_hash = $1, role = \'teacher\', status = \'approved\' WHERE email = $2', [
        SEED_PASSWORD_HASH,
        SEED_TEACHER.email,
      ]);
    }

    // Always ensure SEED_PENDING_TEACHER exists for demo approval testing
    const pendingCheck = await client.query('SELECT id FROM teachers WHERE email = $1', [SEED_PENDING_TEACHER.email]);
    if (pendingCheck.rows.length === 0) {
      await client.query(
        'INSERT INTO teachers (id, name, email, password_hash, role, status, phone, telegram_username, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [SEED_PENDING_TEACHER.id, SEED_PENDING_TEACHER.name, SEED_PENDING_TEACHER.email, SEED_PASSWORD_HASH, 'teacher', 'pending', SEED_PENDING_TEACHER.phone, SEED_PENDING_TEACHER.telegramUsername, SEED_PENDING_TEACHER.createdAt]
      );
    }

    if (count === 0) {
      console.log('🌱 Seeding Neon PostgreSQL with Khmer sample data and accounts...');
      for (const std of SEED_STUDENTS) {
        await client.query(
          'INSERT INTO students (id, teacher_id, order_no, class_name, name, age, gender) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [std.id, std.teacherId, std.orderNo, std.className, std.name, std.age, std.gender]
        );
      }
      for (const pas of SEED_PASSAGES) {
        await client.query(
          'INSERT INTO passages (id, teacher_id, title, content, note, level) VALUES ($1, $2, $3, $4, $5, $6)',
          [pas.id, pas.teacherId, pas.title, pas.content, pas.note || '', pas.level]
        );
      }
      for (const ses of SEED_SESSIONS) {
        await client.query(
          'INSERT INTO reading_sessions (id, teacher_id, student_id, passage_id, words, status, score, max_score, comment, started_at, finished_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
          [
            ses.id,
            ses.teacherId,
            ses.studentId,
            ses.passageId,
            JSON.stringify(ses.words),
            ses.status,
            ses.score,
            ses.maxScore,
            ses.comment,
            ses.startedAt,
            ses.finishedAt,
          ]
        );
      }
      for (const wm of SEED_WORD_MARKS) {
        await client.query(
          'INSERT INTO word_marks (id, session_id, word_index, word, mark_type) VALUES ($1, $2, $3, $4, $5)',
          [wm.id, wm.sessionId, wm.wordIndex, wm.word, wm.markType]
        );
      }
      console.log('🌱 Neon PostgreSQL seeding completed.');
    }
  }

  public getStatus() {
    return {
      isNeonConnected: this.isNeonConnected,
      connectionError: this.connectionError,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''),
    };
  }

  // --- TEACHERS ---
  public async findTeacherByEmail(email: string): Promise<TeacherWithHash | null> {
    if (this.isNeonConnected && this.pool) {
      const res = await this.pool.query('SELECT * FROM teachers WHERE email = $1', [email.toLowerCase().trim()]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        passwordHash: r.password_hash,
        role: (r.role || 'teacher') as UserRole,
        status: (r.status || 'pending') as TeacherStatus,
        phone: r.phone || null,
        telegramUsername: r.telegram_username || null,
        approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : null,
        approvedBy: r.approved_by || null,
        statusNote: r.status_note || null,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      };
    }
    const teacher = this.teachers.find((t) => t.email.toLowerCase() === email.toLowerCase().trim());
    return teacher ? { ...teacher } : null;
  }

  public async findTeacherById(id: string): Promise<Teacher | null> {
    if (this.isNeonConnected && this.pool) {
      const res = await this.pool.query('SELECT * FROM teachers WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        role: (r.role || 'teacher') as UserRole,
        status: (r.status || 'pending') as TeacherStatus,
        phone: r.phone || null,
        telegramUsername: r.telegram_username || null,
        approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : null,
        approvedBy: r.approved_by || null,
        statusNote: r.status_note || null,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      };
    }
    const t = this.teachers.find((teacher) => teacher.id === id);
    if (!t) return null;
    return {
      id: t.id,
      name: t.name,
      email: t.email,
      role: t.role,
      status: t.status,
      phone: t.phone,
      telegramUsername: t.telegramUsername,
      approvedAt: t.approvedAt,
      approvedBy: t.approvedBy,
      statusNote: t.statusNote,
      createdAt: t.createdAt,
    };
  }

  public async createTeacher(
    name: string,
    email: string,
    passwordHash: string,
    phone?: string,
    telegramUsername?: string
  ): Promise<Teacher> {
    const id = `t-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();
    const role: UserRole = 'teacher';
    // New teachers default to 'pending' as required
    const status: TeacherStatus = 'pending';

    if (this.isNeonConnected && this.pool) {
      await this.pool.query(
        'INSERT INTO teachers (id, name, email, password_hash, role, status, phone, telegram_username, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [id, name, email.toLowerCase().trim(), passwordHash, role, status, phone || null, telegramUsername || null, createdAt]
      );
      return { id, name, email: email.toLowerCase().trim(), role, status, phone, telegramUsername, createdAt };
    }

    const newTeacher: TeacherWithHash = {
      id,
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      status,
      phone: phone || null,
      telegramUsername: telegramUsername || null,
      createdAt,
    };
    this.teachers.push(newTeacher);
    return { id, name, email: email.toLowerCase().trim(), role, status, phone, telegramUsername, createdAt };
  }

  // --- ADMIN METHODS ---
  public async getAdminStats(): Promise<AdminStats> {
    if (this.isNeonConnected && this.pool) {
      const [tRes, sRes, pRes, sesRes] = await Promise.all([
        this.pool.query('SELECT status, COUNT(*) FROM teachers GROUP BY status'),
        this.pool.query('SELECT COUNT(*) FROM students'),
        this.pool.query('SELECT COUNT(*) FROM passages'),
        this.pool.query('SELECT COUNT(*) FROM reading_sessions'),
      ]);

      let pending = 0;
      let approved = 0;
      let rejected = 0;
      let suspended = 0;
      let totalTeachers = 0;

      for (const row of tRes.rows) {
        const count = parseInt(row.count, 10);
        totalTeachers += count;
        if (row.status === 'pending') pending = count;
        else if (row.status === 'approved') approved = count;
        else if (row.status === 'rejected') rejected = count;
        else if (row.status === 'suspended') suspended = count;
      }

      return {
        totalTeachers,
        pendingTeachers: pending,
        approvedTeachers: approved,
        rejectedTeachers: rejected,
        suspendedTeachers: suspended,
        totalStudents: parseInt(sRes.rows[0].count, 10),
        totalPassages: parseInt(pRes.rows[0].count, 10),
        totalSessions: parseInt(sesRes.rows[0].count, 10),
      };
    }

    const pending = this.teachers.filter((t) => t.status === 'pending').length;
    const approved = this.teachers.filter((t) => t.status === 'approved').length;
    const rejected = this.teachers.filter((t) => t.status === 'rejected').length;
    const suspended = this.teachers.filter((t) => t.status === 'suspended').length;

    return {
      totalTeachers: this.teachers.length,
      pendingTeachers: pending,
      approvedTeachers: approved,
      rejectedTeachers: rejected,
      suspendedTeachers: suspended,
      totalStudents: this.students.length,
      totalPassages: this.passages.length,
      totalSessions: this.sessions.length,
    };
  }

  public async getAllTeachers(filters?: { status?: TeacherStatus | 'all'; search?: string }): Promise<Teacher[]> {
    if (this.isNeonConnected && this.pool) {
      let query = `
        SELECT t.*,
          (SELECT COUNT(*) FROM students s WHERE s.teacher_id = t.id) as student_count,
          (SELECT COUNT(*) FROM reading_sessions rs WHERE rs.teacher_id = t.id) as session_count
        FROM teachers t
        WHERE 1=1
      `;
      const params: unknown[] = [];

      if (filters?.status && filters.status !== 'all') {
        params.push(filters.status);
        query += ` AND t.status = $${params.length}`;
      }

      if (filters?.search && filters.search.trim() !== '') {
        params.push(`%${filters.search.trim()}%`);
        query += ` AND (t.name ILIKE $${params.length} OR t.email ILIKE $${params.length} OR t.phone ILIKE $${params.length} OR t.telegram_username ILIKE $${params.length})`;
      }

      query += ' ORDER BY CASE WHEN t.status = \'pending\' THEN 0 ELSE 1 END, t.created_at DESC';

      const res = await this.pool.query(query, params);
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: (r.role || 'teacher') as UserRole,
        status: (r.status || 'pending') as TeacherStatus,
        phone: r.phone || null,
        telegramUsername: r.telegram_username || null,
        approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : null,
        approvedBy: r.approved_by || null,
        statusNote: r.status_note || null,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        studentCount: parseInt(r.student_count || '0', 10),
        sessionCount: parseInt(r.session_count || '0', 10),
      }));
    }

    return this.teachers
      .filter((t) => (!filters?.status || filters.status === 'all' ? true : t.status === filters.status))
      .filter((t) => {
        if (!filters?.search || filters.search.trim() === '') return true;
        const q = filters.search.toLowerCase().trim();
        return (
          t.name.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          (t.phone && t.phone.toLowerCase().includes(q)) ||
          (t.telegramUsername && t.telegramUsername.toLowerCase().includes(q))
        );
      })
      .map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        role: t.role,
        status: t.status,
        phone: t.phone,
        telegramUsername: t.telegramUsername,
        approvedAt: t.approvedAt,
        approvedBy: t.approvedBy,
        statusNote: t.statusNote,
        createdAt: t.createdAt,
        studentCount: this.students.filter((s) => s.teacherId === t.id).length,
        sessionCount: this.sessions.filter((ses) => ses.teacherId === t.id).length,
      }))
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  public async updateTeacherStatus(
    teacherId: string,
    adminId: string,
    status: TeacherStatus,
    note?: string
  ): Promise<Teacher | null> {
    const admin = await this.findTeacherById(adminId);
    const approvedAt = status === 'approved' ? new Date().toISOString() : null;

    if (this.isNeonConnected && this.pool) {
      const res = await this.pool.query(
        `UPDATE teachers
         SET status = $1, approved_at = COALESCE($2, approved_at), approved_by = COALESCE($3, approved_by), status_note = $4
         WHERE id = $5
         RETURNING *`,
        [status, approvedAt, status === 'approved' ? adminId : null, note || null, teacherId]
      );
      if (res.rows.length === 0) return null;
      const r = res.rows[0];

      // Audit log
      await this.addAuditLog(
        adminId,
        admin?.name || 'Admin',
        `UPDATE_STATUS_${status.toUpperCase()}`,
        teacherId,
        r.name,
        note || `ប្តូរស្ថានភាពទៅជា ${status}`
      );

      return {
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role as UserRole,
        status: r.status as TeacherStatus,
        phone: r.phone || null,
        telegramUsername: r.telegram_username || null,
        approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : null,
        approvedBy: r.approved_by || null,
        statusNote: r.status_note || null,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      };
    }

    const t = this.teachers.find((teacher) => teacher.id === teacherId);
    if (!t) return null;

    t.status = status;
    if (status === 'approved') {
      t.approvedAt = new Date().toISOString();
      t.approvedBy = adminId;
    }
    t.statusNote = note || null;

    await this.addAuditLog(
      adminId,
      admin?.name || 'Admin',
      `UPDATE_STATUS_${status.toUpperCase()}`,
      teacherId,
      t.name,
      note || `ប្តូរស្ថានភាពទៅជា ${status}`
    );

    return { ...t };
  }

  public async resetTeacherPassword(teacherId: string, adminId: string, newPasswordHash: string): Promise<boolean> {
    const admin = await this.findTeacherById(adminId);
    const target = await this.findTeacherById(teacherId);
    if (!target) return false;

    if (this.isNeonConnected && this.pool) {
      await this.pool.query('UPDATE teachers SET password_hash = $1 WHERE id = $2', [newPasswordHash, teacherId]);
      await this.addAuditLog(
        adminId,
        admin?.name || 'Admin',
        'RESET_PASSWORD',
        teacherId,
        target.name,
        'កំណត់ពាក្យសម្ងាត់ឡើងវិញដោយ Admin'
      );
      return true;
    }

    const t = this.teachers.find((teacher) => teacher.id === teacherId);
    if (!t) return false;
    t.passwordHash = newPasswordHash;
    await this.addAuditLog(
      adminId,
      admin?.name || 'Admin',
      'RESET_PASSWORD',
      teacherId,
      target.name,
      'កំណត់ពាក្យសម្ងាត់ឡើងវិញដោយ Admin'
    );
    return true;
  }

  public async updateAdminProfile(
    adminId: string,
    data: { name?: string; email?: string; passwordHash?: string; phone?: string; telegramUsername?: string }
  ): Promise<Teacher | null> {
    if (this.isNeonConnected && this.pool) {
      const setClauses: string[] = [];
      const params: unknown[] = [adminId];

      if (data.name !== undefined) {
        params.push(data.name);
        setClauses.push(`name = $${params.length}`);
      }
      if (data.email !== undefined) {
        params.push(data.email.toLowerCase().trim());
        setClauses.push(`email = $${params.length}`);
      }
      if (data.passwordHash !== undefined) {
        params.push(data.passwordHash);
        setClauses.push(`password_hash = $${params.length}`);
      }
      if (data.phone !== undefined) {
        params.push(data.phone || null);
        setClauses.push(`phone = $${params.length}`);
      }
      if (data.telegramUsername !== undefined) {
        params.push(data.telegramUsername || null);
        setClauses.push(`telegram_username = $${params.length}`);
      }

      if (setClauses.length > 0) {
        const query = `UPDATE teachers SET ${setClauses.join(', ')} WHERE id = $1 AND role = 'admin' RETURNING *`;
        const res = await this.pool.query(query, params);
        if (res.rows.length === 0) return null;
        const r = res.rows[0];
        await this.addAuditLog(adminId, r.name, 'UPDATE_ADMIN_PROFILE', adminId, r.name, 'បានកែប្រែព័ត៌មានគណនី Admin');
        return {
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role as UserRole,
          status: r.status as TeacherStatus,
          phone: r.phone || null,
          telegramUsername: r.telegram_username || null,
          approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : null,
          approvedBy: r.approved_by || null,
          statusNote: r.status_note || null,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        };
      }
    }

    const t = this.teachers.find((teacher) => teacher.id === adminId && teacher.role === 'admin');
    if (!t) return null;
    if (data.name !== undefined) t.name = data.name;
    if (data.email !== undefined) t.email = data.email.toLowerCase().trim();
    if (data.passwordHash !== undefined) t.passwordHash = data.passwordHash;
    if (data.phone !== undefined) t.phone = data.phone;
    if (data.telegramUsername !== undefined) t.telegramUsername = data.telegramUsername;
    await this.addAuditLog(adminId, t.name, 'UPDATE_ADMIN_PROFILE', adminId, t.name, 'បានកែប្រែព័ត៌មានគណនី Admin');
    return { ...t };
  }

  public async deleteTeacher(teacherId: string, adminId: string): Promise<boolean> {
    const admin = await this.findTeacherById(adminId);
    const target = await this.findTeacherById(teacherId);
    if (!target) return false;

    if (this.isNeonConnected && this.pool) {
      await this.pool.query('DELETE FROM teachers WHERE id = $1', [teacherId]);
      await this.addAuditLog(
        adminId,
        admin?.name || 'Admin',
        'DELETE_TEACHER',
        teacherId,
        target.name,
        'លុបគណនីគ្រូចេញពីប្រព័ន្ធ'
      );
      return true;
    }

    this.teachers = this.teachers.filter((t) => t.id !== teacherId);
    this.students = this.students.filter((s) => s.teacherId !== teacherId);
    this.passages = this.passages.filter((p) => p.teacherId !== teacherId);
    this.sessions = this.sessions.filter((ses) => ses.teacherId !== teacherId);

    await this.addAuditLog(
      adminId,
      admin?.name || 'Admin',
      'DELETE_TEACHER',
      teacherId,
      target.name,
      'លុបគណនីគ្រូចេញពីប្រព័ន្ធ'
    );
    return true;
  }

  public async addAuditLog(
    adminId: string,
    adminName: string,
    action: string,
    targetTeacherId?: string,
    targetTeacherName?: string,
    note?: string
  ): Promise<void> {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    if (this.isNeonConnected && this.pool) {
      await this.pool.query(
        'INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, target_teacher_id, target_teacher_name, note, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, adminId, adminName, action, targetTeacherId || null, targetTeacherName || null, note || null, createdAt]
      );
      return;
    }

    this.auditLogs.unshift({
      id,
      adminId,
      adminName,
      action,
      targetTeacherId,
      targetTeacherName,
      note,
      createdAt,
    });
  }

  public async getAuditLogs(): Promise<AdminAuditLog[]> {
    if (this.isNeonConnected && this.pool) {
      const res = await this.pool.query('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100');
      return res.rows.map((r) => ({
        id: r.id,
        adminId: r.admin_id,
        adminName: r.admin_name || 'Admin',
        action: r.action,
        targetTeacherId: r.target_teacher_id || null,
        targetTeacherName: r.target_teacher_name || null,
        note: r.note || null,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }
    return [...this.auditLogs];
  }

  // --- STUDENTS ---
  public async getStudents(teacherId: string, className?: string, search?: string): Promise<Student[]> {
    if (this.isNeonConnected && this.pool) {
      let query = 'SELECT * FROM students WHERE teacher_id = $1';
      const params: unknown[] = [teacherId];

      if (className && className !== 'all') {
        params.push(className);
        query += ` AND class_name = $${params.length}`;
      }
      if (search && search.trim() !== '') {
        params.push(`%${search.trim()}%`);
        query += ` AND name ILIKE $${params.length}`;
      }
      query += ' ORDER BY class_name ASC, order_no ASC, name ASC';

      const res = await this.pool.query(query, params);
      return res.rows.map((r) => ({
        id: r.id,
        teacherId: r.teacher_id,
        orderNo: r.order_no,
        className: r.class_name,
        name: r.name,
        age: r.age,
        gender: r.gender as Gender,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    return this.students
      .filter((s) => s.teacherId === teacherId)
      .filter((s) => (!className || className === 'all' ? true : s.className === className))
      .filter((s) => (!search || search.trim() === '' ? true : s.name.toLowerCase().includes(search.toLowerCase().trim())))
      .sort((a, b) => a.orderNo - b.orderNo);
  }

  public async createStudent(data: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
    const id = `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    if (this.isNeonConnected && this.pool) {
      await this.pool.query(
        'INSERT INTO students (id, teacher_id, order_no, class_name, name, age, gender, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, data.teacherId, data.orderNo, data.className, data.name, data.age, data.gender, createdAt]
      );
      return { id, ...data, createdAt };
    }

    const newStudent: Student = { id, ...data, createdAt };
    this.students.push(newStudent);
    return newStudent;
  }

  public async updateStudent(id: string, teacherId: string, data: Partial<Omit<Student, 'id' | 'teacherId' | 'createdAt'>>): Promise<Student | null> {
    if (this.isNeonConnected && this.pool) {
      const keys = Object.keys(data);
      if (keys.length === 0) return null;

      const setClauses: string[] = [];
      const params: unknown[] = [id, teacherId];

      if (data.orderNo !== undefined) {
        params.push(data.orderNo);
        setClauses.push(`order_no = $${params.length}`);
      }
      if (data.className !== undefined) {
        params.push(data.className);
        setClauses.push(`class_name = $${params.length}`);
      }
      if (data.name !== undefined) {
        params.push(data.name);
        setClauses.push(`name = $${params.length}`);
      }
      if (data.age !== undefined) {
        params.push(data.age);
        setClauses.push(`age = $${params.length}`);
      }
      if (data.gender !== undefined) {
        params.push(data.gender);
        setClauses.push(`gender = $${params.length}`);
      }

      if (setClauses.length === 0) return null;

      const query = `UPDATE students SET ${setClauses.join(', ')} WHERE id = $1 AND teacher_id = $2 RETURNING *`;
      const res = await this.pool.query(query, params);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        teacherId: r.teacher_id,
        orderNo: r.order_no,
        className: r.class_name,
        name: r.name,
        age: r.age,
        gender: r.gender as Gender,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      };
    }

    const idx = this.students.findIndex((s) => s.id === id && s.teacherId === teacherId);
    if (idx === -1) return null;

    this.students[idx] = {
      ...this.students[idx],
      ...data,
    };
    return { ...this.students[idx] };
  }

  public async deleteStudent(id: string, teacherId: string): Promise<boolean> {
    if (this.isNeonConnected && this.pool) {
      const res = await this.pool.query('DELETE FROM students WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
      return (res.rowCount ?? 0) > 0;
    }

    const initialLen = this.students.length;
    this.students = this.students.filter((s) => !(s.id === id && s.teacherId === teacherId));
    // Also remove their sessions
    this.sessions = this.sessions.filter((ses) => ses.studentId !== id);
    return this.students.length < initialLen;
  }

  // --- PASSAGES ---
  public async getPassages(teacherId: string, level?: string, search?: string): Promise<Passage[]> {
    if (this.isNeonConnected && this.pool) {
      let query = 'SELECT * FROM passages WHERE teacher_id = $1';
      const params: unknown[] = [teacherId];

      if (level && level !== 'all') {
        params.push(level);
        query += ` AND level = $${params.length}`;
      }
      if (search && search.trim() !== '') {
        params.push(`%${search.trim()}%`);
        query += ` AND (title ILIKE $${params.length} OR content ILIKE $${params.length})`;
      }
      query += ' ORDER BY created_at DESC';

      const res = await this.pool.query(query, params);
      return res.rows.map((r) => ({
        id: r.id,
        teacherId: r.teacher_id,
        title: r.title,
        content: r.content,
        note: r.note || '',
        level: r.level as PassageLevel,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      }));
    }

    return this.passages
      .filter((p) => p.teacherId === teacherId)
      .filter((p) => (!level || level === 'all' ? true : p.level === level))
      .filter((p) => {
        if (!search || search.trim() === '') return true;
        const q = search.toLowerCase().trim();
        return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getPassageById(id: string, teacherId: string): Promise<Passage | null> {
    if (this.isNeonConnected && this.pool) {
      const res = await this.pool.query('SELECT * FROM passages WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        teacherId: r.teacher_id,
        title: r.title,
        content: r.content,
        note: r.note || '',
        level: r.level as PassageLevel,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      };
    }
    const p = this.passages.find((passage) => passage.id === id && passage.teacherId === teacherId);
    return p ? { ...p } : null;
  }

  public async createPassage(data: Omit<Passage, 'id' | 'createdAt' | 'updatedAt'>): Promise<Passage> {
    const id = `pas-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    if (this.isNeonConnected && this.pool) {
      await this.pool.query(
        'INSERT INTO passages (id, teacher_id, title, content, note, level, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, data.teacherId, data.title, data.content, data.note || '', data.level, now, now]
      );
      return { id, ...data, createdAt: now, updatedAt: now };
    }

    const newPassage: Passage = { id, ...data, createdAt: now, updatedAt: now };
    this.passages.unshift(newPassage);
    return newPassage;
  }

  public async updatePassage(
    id: string,
    teacherId: string,
    data: Partial<Omit<Passage, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Passage | null> {
    const now = new Date().toISOString();

    if (this.isNeonConnected && this.pool) {
      const keys = Object.keys(data);
      if (keys.length === 0) return null;

      const setClauses: string[] = ['updated_at = $3'];
      const params: unknown[] = [id, teacherId, now];

      if (data.title !== undefined) {
        params.push(data.title);
        setClauses.push(`title = $${params.length}`);
      }
      if (data.content !== undefined) {
        params.push(data.content);
        setClauses.push(`content = $${params.length}`);
      }
      if (data.note !== undefined) {
        params.push(data.note);
        setClauses.push(`note = $${params.length}`);
      }
      if (data.level !== undefined) {
        params.push(data.level);
        setClauses.push(`level = $${params.length}`);
      }

      const query = `UPDATE passages SET ${setClauses.join(', ')} WHERE id = $1 AND teacher_id = $2 RETURNING *`;
      const res = await this.pool.query(query, params);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        teacherId: r.teacher_id,
        title: r.title,
        content: r.content,
        note: r.note || '',
        level: r.level as PassageLevel,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      };
    }

    const idx = this.passages.findIndex((p) => p.id === id && p.teacherId === teacherId);
    if (idx === -1) return null;

    this.passages[idx] = {
      ...this.passages[idx],
      ...data,
      updatedAt: now,
    };
    return { ...this.passages[idx] };
  }

  public async deletePassage(id: string, teacherId: string): Promise<boolean> {
    if (this.isNeonConnected && this.pool) {
      const res = await this.pool.query('DELETE FROM passages WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
      return (res.rowCount ?? 0) > 0;
    }

    const initialLen = this.passages.length;
    this.passages = this.passages.filter((p) => !(p.id === id && p.teacherId === teacherId));
    return this.passages.length < initialLen;
  }

  // --- READING SESSIONS ---
  public async getSessions(
    teacherId: string,
    filters?: {
      studentId?: string;
      passageId?: string;
      className?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ReadingSession[]> {
    if (this.isNeonConnected && this.pool) {
      let query = `
        SELECT rs.*,
          s.name as student_name, s.class_name, s.age as student_age, s.gender as student_gender,
          p.title as passage_title, p.content as passage_content, p.level as passage_level
        FROM reading_sessions rs
        JOIN students s ON rs.student_id = s.id
        JOIN passages p ON rs.passage_id = p.id
        WHERE rs.teacher_id = $1
      `;
      const params: unknown[] = [teacherId];

      if (filters?.studentId && filters.studentId !== 'all') {
        params.push(filters.studentId);
        query += ` AND rs.student_id = $${params.length}`;
      }
      if (filters?.passageId && filters.passageId !== 'all') {
        params.push(filters.passageId);
        query += ` AND rs.passage_id = $${params.length}`;
      }
      if (filters?.className && filters.className !== 'all') {
        params.push(filters.className);
        query += ` AND s.class_name = $${params.length}`;
      }
      if (filters?.startDate) {
        params.push(filters.startDate);
        query += ` AND rs.started_at >= $${params.length}`;
      }
      if (filters?.endDate) {
        params.push(filters.endDate);
        query += ` AND rs.started_at <= $${params.length}`;
      }

      query += ' ORDER BY rs.started_at DESC';

      const res = await this.pool.query(query, params);
      const sessionIds = res.rows.map((r) => r.id);

      // Fetch marks
      let marksMap: Record<string, WordMark[]> = {};
      if (sessionIds.length > 0) {
        const marksRes = await this.pool.query(
          'SELECT * FROM word_marks WHERE session_id = ANY($1::varchar[])',
          [sessionIds]
        );
        for (const m of marksRes.rows) {
          if (!marksMap[m.session_id]) marksMap[m.session_id] = [];
          marksMap[m.session_id].push({
            id: m.id,
            sessionId: m.session_id,
            wordIndex: m.word_index,
            word: m.word,
            markType: m.mark_type as MarkType,
          });
        }
      }

      return res.rows.map((r) => ({
        id: r.id,
        teacherId: r.teacher_id,
        studentId: r.student_id,
        passageId: r.passage_id,
        words: r.words || [],
        status: r.status,
        score: r.score !== null ? parseFloat(r.score) : null,
        maxScore: r.max_score !== null ? parseFloat(r.max_score) : 10,
        comment: r.comment,
        startedAt: r.started_at ? new Date(r.started_at).toISOString() : new Date().toISOString(),
        finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
        studentName: r.student_name,
        className: r.class_name,
        studentAge: r.student_age,
        studentGender: r.student_gender,
        passageTitle: r.passage_title,
        passageContent: r.passage_content,
        passageLevel: r.passage_level,
        marks: marksMap[r.id] || [],
      }));
    }

    return this.sessions
      .filter((s) => s.teacherId === teacherId)
      .filter((s) => (!filters?.studentId || filters.studentId === 'all' ? true : s.studentId === filters.studentId))
      .filter((s) => (!filters?.passageId || filters.passageId === 'all' ? true : s.passageId === filters.passageId))
      .filter((s) => {
        if (!filters?.className || filters.className === 'all') return true;
        const student = this.students.find((std) => std.id === s.studentId);
        return student?.className === filters.className;
      })
      .filter((s) => {
        if (!filters?.startDate) return true;
        return new Date(s.startedAt) >= new Date(filters.startDate);
      })
      .filter((s) => {
        if (!filters?.endDate) return true;
        return new Date(s.startedAt) <= new Date(filters.endDate);
      })
      .map((s) => {
        const student = this.students.find((std) => std.id === s.studentId);
        const passage = this.passages.find((pas) => pas.id === s.passageId);
        const marks = this.wordMarks.filter((m) => m.sessionId === s.id);
        return {
          ...s,
          studentName: student?.name,
          className: student?.className,
          studentAge: student?.age,
          studentGender: student?.gender,
          passageTitle: passage?.title,
          passageContent: passage?.content,
          passageLevel: passage?.level,
          marks,
        };
      })
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  public async getSessionById(sessionId: string, teacherId: string): Promise<ReadingSession | null> {
    const list = await this.getSessions(teacherId);
    return list.find((s) => s.id === sessionId) || null;
  }

  public async createSession(
    teacherId: string,
    studentId: string,
    passageId: string,
    words: string[]
  ): Promise<ReadingSession> {
    const id = `ses-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const startedAt = new Date().toISOString();

    if (this.isNeonConnected && this.pool) {
      await this.pool.query(
        'INSERT INTO reading_sessions (id, teacher_id, student_id, passage_id, words, status, started_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id, teacherId, studentId, passageId, JSON.stringify(words), 'in_progress', startedAt]
      );
      const student = await this.pool.query('SELECT name, class_name, age, gender FROM students WHERE id = $1', [studentId]);
      const passage = await this.pool.query('SELECT title, content, level FROM passages WHERE id = $1', [passageId]);

      return {
        id,
        teacherId,
        studentId,
        passageId,
        words,
        status: 'in_progress',
        score: null,
        maxScore: 10,
        comment: null,
        startedAt,
        finishedAt: null,
        studentName: student.rows[0]?.name,
        className: student.rows[0]?.class_name,
        studentAge: student.rows[0]?.age,
        studentGender: student.rows[0]?.gender,
        passageTitle: passage.rows[0]?.title,
        passageContent: passage.rows[0]?.content,
        passageLevel: passage.rows[0]?.level,
        marks: [],
      };
    }

    const student = this.students.find((s) => s.id === studentId);
    const passage = this.passages.find((p) => p.id === passageId);

    const newSession: ReadingSession = {
      id,
      teacherId,
      studentId,
      passageId,
      words,
      status: 'in_progress',
      score: null,
      maxScore: 10,
      comment: null,
      startedAt,
      finishedAt: null,
      studentName: student?.name,
      className: student?.className,
      studentAge: student?.age,
      studentGender: student?.gender,
      passageTitle: passage?.title,
      passageContent: passage?.content,
      passageLevel: passage?.level,
      marks: [],
    };
    this.sessions.push(newSession);
    return newSession;
  }

  public async finishSession(
    sessionId: string,
    teacherId: string,
    data: {
      score: number;
      maxScore: number;
      comment: string;
      marks: Array<{ wordIndex: number; word: string; markType: MarkType }>;
    }
  ): Promise<ReadingSession | null> {
    const finishedAt = new Date().toISOString();

    if (this.isNeonConnected && this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const updateRes = await client.query(
          'UPDATE reading_sessions SET status = $1, score = $2, max_score = $3, comment = $4, finished_at = $5 WHERE id = $6 AND teacher_id = $7',
          ['completed', data.score, data.maxScore, data.comment, finishedAt, sessionId, teacherId]
        );
        if ((updateRes.rowCount ?? 0) === 0) {
          await client.query('ROLLBACK');
          return null;
        }

        // replace marks
        await client.query('DELETE FROM word_marks WHERE session_id = $1', [sessionId]);
        for (const m of data.marks) {
          const markId = `wm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          await client.query(
            'INSERT INTO word_marks (id, session_id, word_index, word, mark_type) VALUES ($1, $2, $3, $4, $5)',
            [markId, sessionId, m.wordIndex, m.word, m.markType]
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }

      return this.getSessionById(sessionId, teacherId);
    }

    const idx = this.sessions.findIndex((s) => s.id === sessionId && s.teacherId === teacherId);
    if (idx === -1) return null;

    this.sessions[idx] = {
      ...this.sessions[idx],
      status: 'completed',
      score: data.score,
      maxScore: data.maxScore,
      comment: data.comment,
      finishedAt,
    };

    // Remove old marks
    this.wordMarks = this.wordMarks.filter((m) => m.sessionId !== sessionId);
    // Add new marks
    for (const m of data.marks) {
      this.wordMarks.push({
        id: `wm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sessionId,
        wordIndex: m.wordIndex,
        word: m.word,
        markType: m.markType,
      });
    }

    return this.getSessionById(sessionId, teacherId);
  }

  // --- WORD FREQUENCY REPORT ---
  public async getWordFrequencyReport(
    teacherId: string,
    filters?: { className?: string; passageId?: string; startDate?: string; endDate?: string }
  ): Promise<WordFrequencyReport[]> {
    const sessions = await this.getSessions(teacherId, filters);
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    const totalStudentsInCohort = new Set(completedSessions.map((s) => s.studentId)).size || 1;

    const wordStats: Record<
      string,
      { wrongCount: number; skippedCount: number; studentIds: Set<string> }
    > = {};

    for (const s of completedSessions) {
      if (!s.marks) continue;
      for (const m of s.marks) {
        if (!wordStats[m.word]) {
          wordStats[m.word] = { wrongCount: 0, skippedCount: 0, studentIds: new Set() };
        }
        if (m.markType === 'wrong') {
          wordStats[m.word].wrongCount++;
        } else if (m.markType === 'skipped') {
          wordStats[m.word].skippedCount++;
        }
        wordStats[m.word].studentIds.add(s.studentId);
      }
    }

    const reports: WordFrequencyReport[] = Object.entries(wordStats).map(([word, stat]) => {
      const totalErrors = stat.wrongCount + stat.skippedCount;
      const affectedStudentCount = stat.studentIds.size;
      const studentPercentage = Math.round((affectedStudentCount / totalStudentsInCohort) * 100);
      return {
        word,
        wrongCount: stat.wrongCount,
        skippedCount: stat.skippedCount,
        totalErrors,
        affectedStudentCount,
        studentPercentage,
      };
    });

    return reports.sort((a, b) => b.totalErrors - a.totalErrors || b.wrongCount - a.wrongCount);
  }

  // --- STUDENT RANKING ---
  public async getStudentRankings(
    teacherId: string,
    filters?: { className?: string; startDate?: string; endDate?: string }
  ): Promise<StudentRanking[]> {
    const students = await this.getStudents(teacherId, filters?.className);
    const sessions = await this.getSessions(teacherId, {
      className: filters?.className,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    });
    const completedSessions = sessions.filter((s) => s.status === 'completed' && s.score !== null);

    const rankings: StudentRanking[] = [];

    for (const student of students) {
      const studentSessions = completedSessions.filter((s) => s.studentId === student.id);
      if (studentSessions.length === 0) {
        rankings.push({
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          gender: student.gender,
          age: student.age,
          totalSessions: 0,
          averageScorePercentage: 0,
          averageScore: 0,
          averageMaxScore: 10,
          lastSessionDate: '-',
        });
        continue;
      }

      let totalPercentage = 0;
      let sumScore = 0;
      let sumMaxScore = 0;
      let latestDate = '';

      for (const ses of studentSessions) {
        const score = ses.score || 0;
        const maxScore = ses.maxScore || 10;
        sumScore += score;
        sumMaxScore += maxScore;
        totalPercentage += (score / maxScore) * 100;
        if (!latestDate || new Date(ses.startedAt) > new Date(latestDate)) {
          latestDate = ses.startedAt;
        }
      }

      const count = studentSessions.length;
      const averageScorePercentage = Math.round((totalPercentage / count) * 10) / 10;
      const averageScore = Math.round((sumScore / count) * 10) / 10;
      const averageMaxScore = Math.round((sumMaxScore / count) * 10) / 10;

      rankings.push({
        studentId: student.id,
        studentName: student.name,
        className: student.className,
        gender: student.gender,
        age: student.age,
        totalSessions: count,
        averageScorePercentage,
        averageScore,
        averageMaxScore,
        lastSessionDate: latestDate,
      });
    }

    return rankings.sort(
      (a, b) =>
        b.averageScorePercentage - a.averageScorePercentage ||
        b.totalSessions - a.totalSessions ||
        a.studentName.localeCompare(b.studentName)
    );
  }
}

export const dbManager = new DatabaseManager();
