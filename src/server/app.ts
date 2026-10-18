import express, { Response } from 'express';
import { z } from 'zod';
import { dbManager } from './db.ts';
import {
  hashPassword,
  comparePassword,
  generateToken,
  requireAuth,
  requireApprovedTeacher,
  requireAdmin,
  AuthenticatedRequest,
} from './auth.ts';

const app = express();

app.use(express.json());

if (process.env.CLOUDFLARE_WORKER === 'true') {
  app.use((req, res, next) => {
    let requestPool;
    try {
      requestPool = dbManager.createRequestPool();
    } catch (error) {
      console.error('Could not create request-scoped Neon connection:', error);
      res.status(503).json({ error: 'មិនអាចភ្ជាប់ Neon Database បានទេ។ សូមពិនិត្យ Cloudflare Hyperdrive។' });
      return;
    }

    let completed = false;
    const responseFinished = new Promise<void>((resolve) => {
      const finish = () => {
        if (completed) return;
        completed = true;
        resolve();
      };
      res.once('finish', finish);
      res.once('close', finish);
    });

    void dbManager.runWithRequestPool(requestPool, () => {
      next();
      return responseFinished;
    }).catch((error) => {
      console.error('Request-scoped Neon connection failed:', error);
      if (!res.headersSent) {
        res.status(503).json({ error: 'សេវា Database មិនទាន់រួចរាល់។ សូមសាកល្បងម្ដងទៀត។' });
      } else if (!res.writableEnded) {
        res.end();
      }
    });
  });
}

// --- HEALTH & STATUS ---
app.get('/api/status', (_req, res) => {
  res.json(dbManager.getStatus());
});

// --- AUTH VALIDATION SCHEMAS ---
const RegisterSchema = z.object({
  name: z.string().min(2, 'ឈ្មោះត្រូវមានយ៉ាងតិច ២ តួអក្សរ'),
  email: z.string().email('អ៊ីមែលមិនត្រឹមត្រូវ'),
  password: z.string().min(6, 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  telegramUsername: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'ពាក្យសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នា',
  path: ['confirmPassword'],
});

const LoginSchema = z.object({
  email: z.string().email('អ៊ីមែលមិនត្រឹមត្រូវ'),
  password: z.string().min(1, 'សូមបញ្ចូលពាក្យសម្ងាត់'),
});

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res: Response): Promise<void> => {
  try {
    const parse = RegisterSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message || 'ទិន្នន័យមិនត្រឹមត្រូវ' });
      return;
    }

    const { name, email, password, phone, telegramUsername } = parse.data;
    const existing = await dbManager.findTeacherByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'អ៊ីមែលនេះមានក្នុងប្រព័ន្ធរួចហើយ' });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const teacher = await dbManager.createTeacher(name, email, hashedPassword, phone, telegramUsername);
    const token = generateToken({
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      role: teacher.role,
      status: teacher.status,
    });

    res.status(201).json({ teacher, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'មានបញ្ហាបច្ចេកទេសក្នុងការចុះឈ្មោះ' });
  }
});

app.post('/api/auth/login', async (req, res: Response): Promise<void> => {
  try {
    const parse = LoginSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message || 'ទិន្នន័យមិនត្រឹមត្រូវ' });
      return;
    }

    const { email, password } = parse.data;
    const teacher = await dbManager.findTeacherByEmail(email);
    if (!teacher) {
      res.status(401).json({ error: 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ' });
      return;
    }

    const isMatch = await comparePassword(password, teacher.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ' });
      return;
    }

    const token = generateToken({
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      role: teacher.role,
      status: teacher.status,
    });

    res.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        status: teacher.status,
        phone: teacher.phone,
        telegramUsername: teacher.telegramUsername,
        approvedAt: teacher.approvedAt,
        approvedBy: teacher.approvedBy,
        statusNote: teacher.statusNote,
        createdAt: teacher.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'មានបញ្ហាបច្ចេកទេសក្នុងការចូលប្រើប្រាស់' });
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const teacher = await dbManager.findTeacherById(req.teacher!.id);
  res.json({ teacher: teacher || req.teacher });
});

// --- ADMIN ROUTES (Protected by requireAuth + requireAdmin) ---
app.get('/api/admin/stats', requireAuth, requireAdmin, async (_req, res: Response) => {
  try {
    const stats = await dbManager.getAdminStats();
    res.json({ stats });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យស្ថិតិ Admin បានទេ' });
  }
});

app.get('/api/admin/teachers', requireAuth, requireAdmin, async (req, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const teachers = await dbManager.getAllTeachers({
      status: status as any,
      search,
    });
    res.json({ teachers });
  } catch (err) {
    console.error('Admin teachers list error:', err);
    res.status(500).json({ error: 'មិនអាចទាញយកបញ្ជីគ្រូបង្រៀនបានទេ' });
  }
});

const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
  note: z.string().optional(),
});

app.put('/api/admin/teachers/:id/status', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parse = UpdateStatusSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message || 'ទិន្នន័យស្ថានភាពមិនត្រឹមត្រូវ' });
      return;
    }

    const { status, note } = parse.data;
    const adminId = req.teacher!.id;
    const updated = await dbManager.updateTeacherStatus(req.params.id, adminId, status, note);
    if (!updated) {
      res.status(404).json({ error: 'រកមិនឃើញគណនីគ្រូនេះទេ' });
      return;
    }
    res.json({ teacher: updated });
  } catch (err) {
    console.error('Update teacher status error:', err);
    res.status(500).json({ error: 'មានបញ្ហាក្នុងការកែប្រែស្ថានភាពគ្រូ' });
  }
});

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៦ តួអក្សរ'),
});

app.put('/api/admin/teachers/:id/reset-password', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parse = ResetPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message || 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ' });
      return;
    }

    const adminId = req.teacher!.id;
    const hashedPassword = await hashPassword(parse.data.newPassword);
    const success = await dbManager.resetTeacherPassword(req.params.id, adminId, hashedPassword);
    if (!success) {
      res.status(404).json({ error: 'រកមិនឃើញគណនីគ្រូនេះទេ' });
      return;
    }
    res.json({ success: true, message: 'ពាក្យសម្ងាត់ត្រូវបានប្តូរជោគជ័យ' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'មានបញ្ហាក្នុងការប្តូរពាក្យសម្ងាត់' });
  }
});

app.delete('/api/admin/teachers/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.teacher!.id;
    if (req.params.id === adminId) {
      res.status(400).json({ error: 'មិនអាចលុបគណនី Admin ផ្ទាល់ខ្លួនបានទេ' });
      return;
    }

    const success = await dbManager.deleteTeacher(req.params.id, adminId);
    if (!success) {
      res.status(404).json({ error: 'រកមិនឃើញគណនីគ្រូនេះទេ' });
      return;
    }
    res.json({ success: true, message: 'បានលុបគណនីគ្រូជោគជ័យ' });
  } catch (err) {
    console.error('Delete teacher error:', err);
    res.status(500).json({ error: 'មានបញ្ហាក្នុងការលុបគណនីគ្រូ' });
  }
});

const UpdateAdminProfileSchema = z.object({
  name: z.string().min(2, 'ឈ្មោះត្រូវមានយ៉ាងតិច ២ តួអក្សរ').optional(),
  email: z.string().email('អ៊ីមែលមិនត្រឹមត្រូវ').optional(),
  newPassword: z.string().min(6, 'ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៦ តួអក្សរ').optional(),
  phone: z.string().optional(),
  telegramUsername: z.string().optional(),
});

app.put('/api/admin/profile', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parse = UpdateAdminProfileSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message || 'ទិន្នន័យមិនត្រឹមត្រូវ' });
      return;
    }

    const adminId = req.teacher!.id;
    const { name, email, newPassword, phone, telegramUsername } = parse.data;

    // If changing email, check uniqueness
    if (email && email.toLowerCase().trim() !== req.teacher!.email.toLowerCase().trim()) {
      const existing = await dbManager.findTeacherByEmail(email);
      if (existing && existing.id !== adminId) {
        res.status(400).json({ error: 'អ៊ីមែលនេះមានក្នុងប្រព័ន្ធរួចហើយ' });
        return;
      }
    }

    let passwordHash: string | undefined;
    if (newPassword && newPassword.trim() !== '') {
      passwordHash = await hashPassword(newPassword);
    }

    const updated = await dbManager.updateAdminProfile(adminId, {
      name,
      email,
      passwordHash,
      phone,
      telegramUsername,
    });

    if (!updated) {
      res.status(404).json({ error: 'រកមិនឃើញគណនី Admin នេះទេ' });
      return;
    }

    const token = generateToken({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      status: updated.status,
    });

    res.json({
      teacher: updated,
      token,
      message: 'បានកែប្រែព័ត៌មានគណនី Admin ដោយជោគជ័យ',
    });
  } catch (err) {
    console.error('Update admin profile error:', err);
    res.status(500).json({ error: 'មានបញ្ហាក្នុងការកែប្រែព័ត៌មាន Admin' });
  }
});

app.get('/api/admin/audit-logs', requireAuth, requireAdmin, async (_req, res: Response) => {
  try {
    const logs = await dbManager.getAuditLogs();
    res.json({ logs });
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: 'មិនអាចទាញយកកំណត់ត្រាសវនកម្មបានទេ' });
  }
});

// --- STUDENT VALIDATION & ROUTES (Protected by requireAuth + requireApprovedTeacher) ---
const StudentSchema = z.object({
  orderNo: z.coerce.number().min(1, 'លេខរៀងត្រូវធំជាង ០'),
  className: z.string().min(1, 'សូមជ្រើសរើស ឬបញ្ចូលថ្នាក់'),
  name: z.string().min(2, 'ឈ្មោះសិស្សត្រូវមានយ៉ាងតិច ២ តួអក្សរ'),
  age: z.coerce.number().min(3).max(25, 'អាយុត្រូវចន្លោះពី ៣ ដល់ ២៥ ឆ្នាំ'),
  gender: z.enum(['ប្រុស', 'ស្រី'], { message: 'ភេទត្រូវតែជា ប្រុស ឬ ស្រី' }),
});

app.get('/api/students', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const teacherId = req.teacher!.id;
  const className = req.query.className as string | undefined;
  const search = req.query.search as string | undefined;
  const students = await dbManager.getStudents(teacherId, className, search);
  res.json({ students });
});

app.post('/api/students', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parse = StudentSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'ទិន្នន័យមិនត្រឹមត្រូវ' });
    return;
  }
  const teacherId = req.teacher!.id;
  const newStudent = await dbManager.createStudent({
    ...parse.data,
    teacherId,
  });
  res.status(201).json({ student: newStudent });
});

app.put('/api/students/:id', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parse = StudentSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'ទិន្នន័យមិនត្រឹមត្រូវ' });
    return;
  }
  const teacherId = req.teacher!.id;
  const updated = await dbManager.updateStudent(req.params.id, teacherId, parse.data);
  if (!updated) {
    res.status(404).json({ error: 'រកមិនឃើញសិស្សនេះ' });
    return;
  }
  res.json({ student: updated });
});

app.delete('/api/students/:id', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const teacherId = req.teacher!.id;
  const success = await dbManager.deleteStudent(req.params.id, teacherId);
  if (!success) {
    res.status(404).json({ error: 'រកមិនឃើញសិស្សនេះ' });
    return;
  }
  res.json({ success: true });
});

// --- PASSAGE VALIDATION & ROUTES (Protected by requireAuth + requireApprovedTeacher) ---
const PassageSchema = z.object({
  title: z.string().min(2, 'ចំណងជើងត្រូវមានយ៉ាងតិច ២ តួអក្សរ'),
  content: z.string().min(10, 'ខ្លឹមសារអត្ថបទត្រូវមានយ៉ាងតិច ១០ តួអក្សរ'),
  note: z.string().optional(),
  level: z.enum(['ស្រួល', 'មធ្យម', 'ពិបាក']),
});

app.get('/api/passages', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const teacherId = req.teacher!.id;
  const level = req.query.level as string | undefined;
  const search = req.query.search as string | undefined;
  const passages = await dbManager.getPassages(teacherId, level, search);
  res.json({ passages });
});

app.post('/api/passages', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parse = PassageSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'ទិន្នន័យមិនត្រឹមត្រូវ' });
    return;
  }
  const teacherId = req.teacher!.id;
  const newPassage = await dbManager.createPassage({
    ...parse.data,
    teacherId,
  });
  res.status(201).json({ passage: newPassage });
});

app.put('/api/passages/:id', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parse = PassageSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'ទិន្នន័យមិនត្រឹមត្រូវ' });
    return;
  }
  const teacherId = req.teacher!.id;
  const updated = await dbManager.updatePassage(req.params.id, teacherId, parse.data);
  if (!updated) {
    res.status(404).json({ error: 'រកមិនឃើញអត្ថបទនេះ' });
    return;
  }
  res.json({ passage: updated });
});

app.delete('/api/passages/:id', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const teacherId = req.teacher!.id;
  const success = await dbManager.deletePassage(req.params.id, teacherId);
  if (!success) {
    res.status(404).json({ error: 'រកមិនឃើញអត្ថបទនេះ' });
    return;
  }
  res.json({ success: true });
});

// --- READING SESSIONS ROUTES (Protected by requireAuth + requireApprovedTeacher) ---
const CreateSessionSchema = z.object({
  studentId: z.string().min(1, 'សូមជ្រើសរើសសិស្ស'),
  passageId: z.string().min(1, 'សូមជ្រើសរើសអត្ថបទ'),
  words: z.array(z.string()).min(1, 'អត្ថបទត្រូវមានពាក្យយ៉ាងតិច ១'),
});

app.get('/api/sessions', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const teacherId = req.teacher!.id;
  const studentId = req.query.studentId as string | undefined;
  const passageId = req.query.passageId as string | undefined;
  const className = req.query.className as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const sessions = await dbManager.getSessions(teacherId, {
    studentId,
    passageId,
    className,
    startDate,
    endDate,
  });
  res.json({ sessions });
});

app.get('/api/sessions/:id', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const teacherId = req.teacher!.id;
  const session = await dbManager.getSessionById(req.params.id, teacherId);
  if (!session) {
    res.status(404).json({ error: 'រកមិនឃើញវគ្គអាននេះ' });
    return;
  }
  res.json({ session });
});

// Display view endpoint that allows student/projector view lookup (public/unauthenticated)
app.get('/api/public/sessions/:id', async (req, res: Response): Promise<void> => {
  // Return just the session passage and words without errors/marks for safe display
  const session = await dbManager.getSessionById(req.params.id, 'all');
  if (!session) {
    const all = await dbManager.getSessions('teacher-demo-01');
    const matched = all.find((s) => s.id === req.params.id);
    if (!matched) {
      res.status(404).json({ error: 'រកមិនឃើញវគ្គអាននេះ' });
      return;
    }
    res.json({
      passageTitle: matched.passageTitle,
      passageContent: matched.passageContent,
      words: matched.words,
      studentName: matched.studentName,
    });
    return;
  }
  res.json({
    passageTitle: session.passageTitle,
    passageContent: session.passageContent,
    words: session.words,
    studentName: session.studentName,
  });
});

app.post('/api/sessions', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parse = CreateSessionSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'ទិន្នន័យមិនត្រឹមត្រូវ' });
    return;
  }
  const teacherId = req.teacher!.id;
  const newSession = await dbManager.createSession(
    teacherId,
    parse.data.studentId,
    parse.data.passageId,
    parse.data.words
  );
  res.status(201).json({ session: newSession });
});

const FinishSessionSchema = z.object({
  score: z.coerce.number().min(0, 'ពិន្ទុមិនអាចតូចជាង ០'),
  maxScore: z.coerce.number().min(1, 'ពិន្ទុពេញត្រូវធំជាង ០'),
  comment: z.string().default(''),
  marks: z.array(
    z.object({
      wordIndex: z.number(),
      word: z.string(),
      markType: z.enum(['wrong', 'skipped']),
    })
  ),
});

app.put('/api/sessions/:id/finish', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parse = FinishSessionSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'ទិន្នន័យមិនត្រឹមត្រូវ' });
    return;
  }
  const teacherId = req.teacher!.id;
  const session = await dbManager.finishSession(req.params.id, teacherId, parse.data);
  if (!session) {
    res.status(404).json({ error: 'រកមិនឃើញវគ្គអាននេះ' });
    return;
  }
  res.json({ session });
});

// --- REPORTS & RANKINGS ---
app.get('/api/reports/word-frequency', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const teacherId = req.teacher!.id;
  const className = req.query.className as string | undefined;
  const passageId = req.query.passageId as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const report = await dbManager.getWordFrequencyReport(teacherId, {
    className,
    passageId,
    startDate,
    endDate,
  });
  res.json({ report });
});

app.get('/api/reports/rankings', requireAuth, requireApprovedTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const teacherId = req.teacher!.id;
  const className = req.query.className as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const rankings = await dbManager.getStudentRankings(teacherId, {
    className,
    startDate,
    endDate,
  });
  res.json({ rankings });
});


export { app, dbManager };
