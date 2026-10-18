import {
  Teacher,
  Student,
  Passage,
  ReadingSession,
  WordFrequencyReport,
  StudentRanking,
  MarkType,
  AdminStats,
  AdminAuditLog,
  TeacherStatus,
} from '../types/index.ts';

const TOKEN_KEY = 'reading_assessment_token';
const TEACHER_KEY = 'reading_assessment_teacher';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  getTeacher(): Teacher | null {
    const raw = localStorage.getItem(TEACHER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setTeacher(teacher: Teacher) {
    localStorage.setItem(TEACHER_KEY, JSON.stringify(teacher));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TEACHER_KEY);
  },
};

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    authStorage.clear();
    window.dispatchEvent(new CustomEvent('auth-expired'));
  }
  return res;
}

export const api = {
  // DB Status
  async getStatus() {
    const res = await fetch('/api/status');
    return res.json() as Promise<{ isNeonConnected: boolean; connectionError: string | null; hasDatabaseUrl: boolean }>;
  },

  // Auth
  async register(data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone?: string;
    telegramUsername?: string;
  }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'ការចុះឈ្មោះបរាជ័យ');
    authStorage.setToken(json.token);
    authStorage.setTeacher(json.teacher);
    return json;
  },

  async login(data: { email: string; password: string }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'ការចូលប្រើប្រាស់បរាជ័យ');
    authStorage.setToken(json.token);
    authStorage.setTeacher(json.teacher);
    return json;
  },

  async getMe(): Promise<Teacher | null> {
    const res = await fetchWithAuth('/api/auth/me');
    if (!res.ok) return null;
    const json = await res.json();
    return json.teacher as Teacher;
  },

  logout() {
    authStorage.clear();
    window.location.reload();
  },

  // --- ADMIN APIs ---
  async updateAdminProfile(data: {
    name?: string;
    email?: string;
    newPassword?: string;
    phone?: string;
    telegramUsername?: string;
  }): Promise<{ teacher: Teacher; token: string }> {
    const res = await fetchWithAuth('/api/admin/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'មិនអាចកែប្រែព័ត៌មាន Admin បានទេ');
    if (json.token) authStorage.setToken(json.token);
    if (json.teacher) authStorage.setTeacher(json.teacher);
    return json;
  },

  async getAdminStats(): Promise<AdminStats> {
    const res = await fetchWithAuth('/api/admin/stats');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'មិនអាចទាញយកស្ថិតិ Admin បានទេ');
    return json.stats;
  },

  async getAdminTeachers(filters?: { status?: string; search?: string }): Promise<Teacher[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    const res = await fetchWithAuth(`/api/admin/teachers?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'មិនអាចទាញយកបញ្ជីគ្រូបង្រៀនបានទេ');
    return json.teachers;
  },

  async updateTeacherStatus(id: string, status: TeacherStatus, note?: string): Promise<Teacher> {
    const res = await fetchWithAuth(`/api/admin/teachers/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'មិនអាចកែប្រែស្ថានភាពគ្រូបានទេ');
    return json.teacher;
  },

  async resetTeacherPassword(id: string, newPassword: string): Promise<void> {
    const res = await fetchWithAuth(`/api/admin/teachers/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'មិនអាចប្តូរពាក្យសម្ងាត់បានទេ');
  },

  async deleteTeacher(id: string): Promise<void> {
    const res = await fetchWithAuth(`/api/admin/teachers/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'មិនអាចលុបគណនីគ្រូបានទេ');
  },

  async getAdminAuditLogs(): Promise<AdminAuditLog[]> {
    const res = await fetchWithAuth('/api/admin/audit-logs');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'មិនអាចទាញយកកំណត់ត្រាសវនកម្មបានទេ');
    return json.logs;
  },

  // --- Students ---
  async getStudents(filters?: { className?: string; search?: string }): Promise<Student[]> {
    const params = new URLSearchParams();
    if (filters?.className && filters.className !== 'all') params.set('className', filters.className);
    if (filters?.search) params.set('search', filters.search);
    const res = await fetchWithAuth(`/api/students?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.students;
  },

  async createStudent(data: Omit<Student, 'id' | 'teacherId' | 'createdAt'>): Promise<Student> {
    const res = await fetchWithAuth('/api/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.student;
  },

  async updateStudent(id: string, data: Partial<Omit<Student, 'id' | 'teacherId' | 'createdAt'>>): Promise<Student> {
    const res = await fetchWithAuth(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.student;
  },

  async deleteStudent(id: string): Promise<void> {
    const res = await fetchWithAuth(`/api/students/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
  },

  // --- Passages ---
  async getPassages(filters?: { level?: string; search?: string }): Promise<Passage[]> {
    const params = new URLSearchParams();
    if (filters?.level && filters.level !== 'all') params.set('level', filters.level);
    if (filters?.search) params.set('search', filters.search);
    const res = await fetchWithAuth(`/api/passages?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.passages;
  },

  async createPassage(data: Omit<Passage, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>): Promise<Passage> {
    const res = await fetchWithAuth('/api/passages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.passage;
  },

  async updatePassage(id: string, data: Partial<Omit<Passage, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>>): Promise<Passage> {
    const res = await fetchWithAuth(`/api/passages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.passage;
  },

  async deletePassage(id: string): Promise<void> {
    const res = await fetchWithAuth(`/api/passages/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
  },

  // --- Sessions ---
  async getSessions(filters?: {
    studentId?: string;
    passageId?: string;
    className?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ReadingSession[]> {
    const params = new URLSearchParams();
    if (filters?.studentId && filters.studentId !== 'all') params.set('studentId', filters.studentId);
    if (filters?.passageId && filters.passageId !== 'all') params.set('passageId', filters.passageId);
    if (filters?.className && filters.className !== 'all') params.set('className', filters.className);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);

    const res = await fetchWithAuth(`/api/sessions?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.sessions;
  },

  async getSessionById(id: string): Promise<ReadingSession> {
    const res = await fetchWithAuth(`/api/sessions/${id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.session;
  },

  async createSession(data: { studentId: string; passageId: string; words: string[] }): Promise<ReadingSession> {
    const res = await fetchWithAuth('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.session;
  },

  async finishSession(
    id: string,
    data: {
      score: number;
      maxScore: number;
      comment: string;
      marks: Array<{ wordIndex: number; word: string; markType: MarkType }>;
    }
  ): Promise<ReadingSession> {
    const res = await fetchWithAuth(`/api/sessions/${id}/finish`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.session;
  },

  // --- Reports & Rankings ---
  async getWordFrequencyReport(filters?: {
    className?: string;
    passageId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WordFrequencyReport[]> {
    const params = new URLSearchParams();
    if (filters?.className && filters.className !== 'all') params.set('className', filters.className);
    if (filters?.passageId && filters.passageId !== 'all') params.set('passageId', filters.passageId);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);

    const res = await fetchWithAuth(`/api/reports/word-frequency?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.report;
  },

  async getRankings(filters?: {
    className?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StudentRanking[]> {
    const params = new URLSearchParams();
    if (filters?.className && filters.className !== 'all') params.set('className', filters.className);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);

    const res = await fetchWithAuth(`/api/reports/rankings?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.rankings;
  },
};
