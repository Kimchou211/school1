import { Teacher, Student, Passage, ReadingSession, WordMark } from '../types/index.ts';

export const SEED_ADMIN: Teacher = {
  id: 'admin-demo-01',
  name: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)',
  email: 'admin@school.edu.kh',
  role: 'admin',
  status: 'approved',
  phone: '012 888 999',
  telegramUsername: '@admin_reading',
  createdAt: new Date('2026-01-01').toISOString(),
};

export const SEED_TEACHER: Teacher = {
  id: 'teacher-demo-01',
  name: 'លោកគ្រូ សុវណ្ណ គឹមសាន',
  email: 'teacher@school.edu.kh',
  role: 'teacher',
  status: 'approved',
  phone: '012 345 678',
  telegramUsername: '@sovann_kimsan',
  approvedAt: new Date('2026-08-01').toISOString(),
  approvedBy: 'admin-demo-01',
  createdAt: new Date('2026-08-01').toISOString(),
};

export const SEED_PENDING_TEACHER: Teacher = {
  id: 'teacher-pending-01',
  name: 'អ្នកគ្រូ ចាន់ ស្រីមុំ (រង់ចាំអនុម័ត)',
  email: 'pending@school.edu.kh',
  role: 'teacher',
  status: 'pending',
  phone: '098 765 432',
  telegramUsername: '@sreymom_chan',
  createdAt: new Date('2026-10-15T08:00:00').toISOString(),
};

// Default password hash for '123456'
// bcrypt hash for '123456'
export const SEED_PASSWORD_HASH = '$2b$10$1Hy..TtTacFavC9fO9/63OOdFG/hq42Iimgm6zhqOJf1qBcTEAeQK';

export const SEED_STUDENTS: Student[] = [
  {
    id: 'std-001',
    teacherId: 'teacher-demo-01',
    orderNo: 1,
    className: 'ថ្នាក់ទី ៤ក',
    name: 'ចាន់ សុខា',
    age: 9,
    gender: 'ប្រុស',
    createdAt: new Date('2026-09-01').toISOString(),
  },
  {
    id: 'std-002',
    teacherId: 'teacher-demo-01',
    orderNo: 2,
    className: 'ថ្នាក់ទី ៤ក',
    name: 'មាស ពិសិដ្ឋ',
    age: 9,
    gender: 'ប្រុស',
    createdAt: new Date('2026-09-01').toISOString(),
  },
  {
    id: 'std-003',
    teacherId: 'teacher-demo-01',
    orderNo: 3,
    className: 'ថ្នាក់ទី ៤ក',
    name: 'កែវ កល្យាណ',
    age: 10,
    gender: 'ស្រី',
    createdAt: new Date('2026-09-01').toISOString(),
  },
  {
    id: 'std-004',
    teacherId: 'teacher-demo-01',
    orderNo: 4,
    className: 'ថ្នាក់ទី ៤ក',
    name: 'ឈិត រតនា',
    age: 9,
    gender: 'ស្រី',
    createdAt: new Date('2026-09-01').toISOString(),
  },
  {
    id: 'std-005',
    teacherId: 'teacher-demo-01',
    orderNo: 5,
    className: 'ថ្នាក់ទី ៤ខ',
    name: 'សេង ប៊ុនធឿន',
    age: 10,
    gender: 'ប្រុស',
    createdAt: new Date('2026-09-02').toISOString(),
  },
  {
    id: 'std-006',
    teacherId: 'teacher-demo-01',
    orderNo: 6,
    className: 'ថ្នាក់ទី ៤ខ',
    name: 'លឹម សុជាតា',
    age: 9,
    gender: 'ស្រី',
    createdAt: new Date('2026-09-02').toISOString(),
  },
];

export const SEED_PASSAGES: Passage[] = [
  {
    id: 'pas-001',
    teacherId: 'teacher-demo-01',
    title: 'សារៈសំខាន់នៃការអានសៀវភៅ',
    content: 'ការអានសៀវភៅ គឺជាការបើកទ្វារទៅកាន់ពិភពនៃចំណេះដឹង និងការយល់ដឹងថ្មីៗ។ នៅពេលយើងអាន យើងបានរៀនពាក្យពេចន៍ល្អៗ បង្កើនការគិតពិចារណា និងចេះដោះស្រាយបញ្ហាផ្សេងៗក្នុងជីវិត។ សៀវភៅប្រៀបដូចជាមិត្តដ៏ល្អដែលតែងតែចែករំលែកបទពិសោធន៍មានតម្លៃដល់យើង។ ដូច្នេះ ចូរយើងបណ្តុះទម្លាប់អានជារៀងរាល់ថ្ងៃ ទោះបីជាបន្តិចបន្តួចក៏ដោយ ដើម្បីអភិវឌ្ឍខ្លួនយើងឲ្យកាន់តែប្រសើរ។',
    note: 'អត្ថបទសម្រាប់វាស់ស្ទង់ការបញ្ចេញសំឡេងព្យញ្ជនៈ ស្រៈ និងការផ្ដាច់ពាក្យ',
    level: 'ស្រួល',
    createdAt: new Date('2026-09-05').toISOString(),
    updatedAt: new Date('2026-09-05').toISOString(),
  },
  {
    id: 'pas-002',
    teacherId: 'teacher-demo-01',
    title: 'មិត្តភាពរវាងសត្វព្រាប និងស្រមោច',
    content: 'ថ្ងៃមួយ ស្រមោចតូចមួយក្បាលបានធ្លាក់ចូលទៅក្នុងទឹកស្ទឹងដ៏ជ្រៅ។ វាបានស្រែកហៅរកជំនួយយ៉ាងអស់សង្ឃឹម។ សត្វព្រាបសមួយក្បាលដែលទំលើមែកឈើក្បែរនោះបានឃើញ ក៏បេះស្លឹកឈើមួយទម្លាក់ទៅក្នុងទឹក។ ស្រមោចបានតោងឡើងលើស្លឹកឈើ ហើយរសាត់ទៅដល់ច្រាំងដោយសុវត្ថិភាព។ ក្រោយមក ព្រានព្រៃម្នាក់បានតម្រង់ធ្នូបាញ់សត្វព្រាប។ ស្រមោចបានឃើញ ក៏ខាំជើងព្រានព្រៃមួយទំហឹង ធ្វើឲ្យព្រានព្រៃភ្លាត់ស្នៀត ហើយព្រាបក៏ហើរគេចខ្លួនផុត។',
    note: 'រឿងនិទានប្រកបដោយគតិបណ្ឌិត មានពាក្យផ្សំ និងជើងអក្សរស្មុគស្មាញ',
    level: 'មធ្យម',
    createdAt: new Date('2026-09-08').toISOString(),
    updatedAt: new Date('2026-09-08').toISOString(),
  },
  {
    id: 'pas-003',
    teacherId: 'teacher-demo-01',
    title: 'ដំណើរទស្សនកិច្ចប្រាសាទអង្គរវត្ត',
    content: 'ប្រាសាទអង្គរវត្ត គឺជាបេតិកភណ្ឌពិភពលោកដ៏ល្បីល្បាញនៃព្រះរាជាណាចក្រកម្ពុជា។ ប្រាសាទនេះត្រូវបានសាងសង់ឡើងក្នុងសតវត្សរ៍ទីដប់ពីរ ដោយព្រះបាទសូរ្យវរ្ម័នទីពីរ។ ក្បូរក្បាច់រចនា និងរូបចម្លាក់អប្សរាលើជញ្ជាំងថ្មឆ្លុះបញ្ចាំងពីភាពរុងរឿងនៃអរិយធម៌ខ្មែរបុរាណ។ ភ្ញៀវទេសចរមកពីគ្រប់ទិសទីជុំវិញពិភពលោក តែងតែមកទស្សនា និងកោតសរសើរមិនដាច់ពីមាត់នូវស្នាដៃស្ថាបត្យកម្មដ៏មហស្ចារ្យមិនអាចកាត់ថ្លៃបាននេះ។',
    note: 'អត្ថបទប្រវត្តិសាស្ត្រ មានពាក្យបាលី-សំស្ក្រឹត និងពាក្យបច្ចេកទេស',
    level: 'ពិបាក',
    createdAt: new Date('2026-09-12').toISOString(),
    updatedAt: new Date('2026-09-12').toISOString(),
  },
];

export const SEED_SESSIONS: ReadingSession[] = [
  {
    id: 'ses-001',
    teacherId: 'teacher-demo-01',
    studentId: 'std-001',
    passageId: 'pas-001',
    words: ['ការអាន', 'សៀវភៅ', 'គឺជា', 'ការបើកទ្វារ', 'ទៅកាន់', 'ពិភព', 'នៃ', 'ចំណេះដឹង', 'និង', 'ការយល់ដឹង', 'ថ្មីៗ'],
    status: 'completed',
    score: 8.5,
    maxScore: 10,
    comment: 'សិស្សអានបានល្អ មានទំនុកចិត្ត ខុសត្រង់ពាក្យ «ចំណេះដឹង» និងរំលងពាក្យ «នៃ»។',
    startedAt: new Date('2026-10-01T08:30:00').toISOString(),
    finishedAt: new Date('2026-10-01T08:35:00').toISOString(),
  },
  {
    id: 'ses-002',
    teacherId: 'teacher-demo-01',
    studentId: 'std-003',
    passageId: 'pas-001',
    words: ['ការអាន', 'សៀវភៅ', 'គឺជា', 'ការបើកទ្វារ', 'ទៅកាន់', 'ពិភព', 'នៃ', 'ចំណេះដឹង', 'និង', 'ការយល់ដឹង', 'ថ្មីៗ'],
    status: 'completed',
    score: 9.5,
    maxScore: 10,
    comment: 'អានរលូនល្អណាស់ បញ្ចេញសូរស័ព្ទត្រឹមត្រូវច្បាស់ៗ។',
    startedAt: new Date('2026-10-02T09:15:00').toISOString(),
    finishedAt: new Date('2026-10-02T09:19:00').toISOString(),
  },
  {
    id: 'ses-003',
    teacherId: 'teacher-demo-01',
    studentId: 'std-002',
    passageId: 'pas-002',
    words: ['ថ្ងៃមួយ', 'ស្រមោច', 'តូច', 'មួយក្បាល', 'បានធ្លាក់', 'ចូលទៅក្នុង', 'ទឹកស្ទឹង', 'ដ៏ជ្រៅ'],
    status: 'completed',
    score: 7.0,
    maxScore: 10,
    comment: 'មានការទាក់ទើរត្រង់ពាក្យដែលមានជើងអក្សរ គួរហាត់អានបន្ថែមនៅផ្ទះ។',
    startedAt: new Date('2026-10-03T10:00:00').toISOString(),
    finishedAt: new Date('2026-10-03T10:06:00').toISOString(),
  },
];

export const SEED_WORD_MARKS: WordMark[] = [
  { id: 'wm-001', sessionId: 'ses-001', wordIndex: 7, word: 'ចំណេះដឹង', markType: 'wrong' },
  { id: 'wm-002', sessionId: 'ses-001', wordIndex: 6, word: 'នៃ', markType: 'skipped' },
  { id: 'wm-003', sessionId: 'ses-003', wordIndex: 1, word: 'ស្រមោច', markType: 'wrong' },
  { id: 'wm-004', sessionId: 'ses-003', wordIndex: 6, word: 'ទឹកស្ទឹង', markType: 'wrong' },
];
