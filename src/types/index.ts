export type UserRole = 'admin' | 'teacher';
export type TeacherStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Teacher {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: TeacherStatus;
  phone?: string | null;
  telegramUsername?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  statusNote?: string | null;
  createdAt: string;
  // Stats for admin display
  studentCount?: number;
  sessionCount?: number;
}

export type Gender = 'ប្រុស' | 'ស្រី';
export type PassageLevel = 'ស្រួល' | 'មធ្យម' | 'ពិបាក';

export interface Student {
  id: string;
  teacherId: string;
  orderNo: number;
  className: string;
  name: string;
  age: number;
  gender: Gender;
  createdAt: string;
  teacherName?: string;
}

export interface Passage {
  id: string;
  teacherId: string;
  title: string;
  content: string;
  note?: string;
  level: PassageLevel;
  createdAt: string;
  updatedAt: string;
  teacherName?: string;
}

export type MarkType = 'wrong' | 'skipped';

export interface WordMark {
  id: string;
  sessionId: string;
  wordIndex: number;
  word: string;
  markType: MarkType;
}

export type SessionStatus = 'in_progress' | 'completed';

export interface ReadingSession {
  id: string;
  teacherId: string;
  studentId: string;
  passageId: string;
  words: string[];
  status: SessionStatus;
  score: number | null;
  maxScore: number | null;
  comment: string | null;
  startedAt: string;
  finishedAt: string | null;

  // Joined display attributes
  studentName?: string;
  className?: string;
  studentAge?: number;
  studentGender?: Gender;
  passageTitle?: string;
  passageContent?: string;
  passageLevel?: PassageLevel;
  teacherName?: string;
  marks?: WordMark[];
}

export interface WordFrequencyReport {
  word: string;
  wrongCount: number;
  skippedCount: number;
  totalErrors: number;
  affectedStudentCount: number;
  studentPercentage: number;
}

export interface StudentRanking {
  studentId: string;
  studentName: string;
  className: string;
  gender: Gender;
  age: number;
  totalSessions: number;
  averageScorePercentage: number;
  averageScore: number;
  averageMaxScore: number;
  lastSessionDate: string;
  teacherName?: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminName?: string;
  action: string;
  targetTeacherId?: string | null;
  targetTeacherName?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface AdminStats {
  totalTeachers: number;
  pendingTeachers: number;
  approvedTeachers: number;
  rejectedTeachers: number;
  suspendedTeachers: number;
  totalStudents: number;
  totalPassages: number;
  totalSessions: number;
}
