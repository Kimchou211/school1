import { useState, useEffect, useCallback } from 'react';
import { Navbar, NavTab } from './components/Navbar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { Overview } from './components/Overview.tsx';
import { StudentList } from './components/StudentList.tsx';
import { PassageLibrary } from './components/PassageLibrary.tsx';
import { ReadingSessionView } from './components/ReadingSessionView.tsx';
import { ReadingHistory } from './components/ReadingHistory.tsx';
import { RankingsView } from './components/RankingsView.tsx';
import { WordReportView } from './components/WordReportView.tsx';
import { DatabaseSettingsModal } from './components/DatabaseSettingsModal.tsx';
import { DisplayView } from './components/DisplayView.tsx';
import { PendingApprovalScreen } from './components/PendingApprovalScreen.tsx';
import { AdminTeacherManagement } from './components/AdminTeacherManagement.tsx';
import { isDisplayUrl, readDisplayPayload } from './lib/displayLink.ts';
import { api, authStorage } from './lib/api.ts';
import {
  Teacher,
  Student,
  Passage,
  ReadingSession,
  WordFrequencyReport,
  StudentRanking,
  MarkType,
} from './types/index.ts';

export default function App() {
  // Check standalone projector mode and read the payload embedded in a share link.
  const [isStandaloneDisplay] = useState<boolean>(() =>
    isDisplayUrl(window.location.search, window.location.hash)
  );
  const [standaloneDisplayPayload] = useState(() =>
    readDisplayPayload(window.location.search, window.location.hash)
  );

  // Auth state
  const [teacher, setTeacher] = useState<Teacher | null>(() => authStorage.getTeacher());
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [selectedPassageForSession, setSelectedPassageForSession] = useState<string | undefined>();
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);

  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [reports, setReports] = useState<WordFrequencyReport[]>([]);
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // Database status
  const [dbStatus, setDbStatus] = useState<{
    isNeonConnected: boolean;
    hasDatabaseUrl: boolean;
    connectionError: string | null;
  }>({
    isNeonConnected: false,
    hasDatabaseUrl: false,
    connectionError: null,
  });
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Load Database Status
  const loadDbStatus = useCallback(async () => {
    try {
      const status = await api.getStatus();
      setDbStatus(status);
    } catch {
      // ignore
    }
  }, []);

  // Load All User Data
  const loadAllData = useCallback(async () => {
    if (!teacher) return;

    // If teacher is pending, rejected, or suspended, do not load teacher data
    if (teacher.role !== 'admin' && teacher.status !== 'approved') {
      return;
    }

    setLoadingData(true);
    try {
      const [stdList, pasList, sesList, repList, rnkList] = await Promise.all([
        api.getStudents(),
        api.getPassages(),
        api.getSessions(),
        api.getWordFrequencyReport(),
        api.getRankings(),
      ]);
      setStudents(stdList);
      setPassages(pasList);
      setSessions(sesList);
      setReports(repList);
      setRankings(rnkList);

      // If admin, also check pending approval count
      if (teacher.role === 'admin') {
        const stats = await api.getAdminStats();
        setPendingApprovalCount(stats.pendingTeachers);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [teacher]);

  // Initial Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      if (isStandaloneDisplay) {
        setAuthChecking(false);
        return;
      }
      try {
        await loadDbStatus();
        const me = await api.getMe();
        if (me) {
          setTeacher(me);
          authStorage.setTeacher(me);
        } else {
          setTeacher(null);
        }
      } catch {
        setTeacher(null);
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();

    const handleAuthExpired = () => {
      setTeacher(null);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, [isStandaloneDisplay, loadDbStatus]);

  // Load data when teacher is authenticated
  useEffect(() => {
    if (!isStandaloneDisplay && teacher) {
      loadAllData();
    }
  }, [isStandaloneDisplay, teacher, loadAllData]);

  // Standalone Projector Display Mode
  if (isStandaloneDisplay) {
    return (
      <DisplayView
        title={standaloneDisplayPayload.title}
        content={standaloneDisplayPayload.content}
        studentName={standaloneDisplayPayload.studentName}
        standalone={true}
      />
    );
  }

  // Auth Loading Skeleton Screen
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#2F5BFF] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium text-[#6B7280]">កំពុងផ្ទុកប្រព័ន្ធ...</span>
        </div>
      </div>
    );
  }

  // Not Logged In
  if (!teacher) {
    return (
      <AuthModal
        onSuccess={(loggedTeacher) => {
          setTeacher(loggedTeacher);
          authStorage.setTeacher(loggedTeacher);
        }}
      />
    );
  }

  // Check if non-admin user is not approved (pending, rejected, suspended)
  if (teacher.role !== 'admin' && teacher.status !== 'approved') {
    return (
      <PendingApprovalScreen
        teacher={teacher}
        onStatusChanged={(updated) => {
          setTeacher(updated);
          authStorage.setTeacher(updated);
        }}
        onLogout={() => api.logout()}
      />
    );
  }

  // Handlers for Students
  const handleAddStudent = async (data: Omit<Student, 'id' | 'teacherId' | 'createdAt'>) => {
    const newStudent = await api.createStudent(data);
    setStudents((prev) => [...prev, newStudent].sort((a, b) => a.orderNo - b.orderNo));
    const rnk = await api.getRankings();
    setRankings(rnk);
  };

  const handleUpdateStudent = async (id: string, data: Partial<Omit<Student, 'id' | 'teacherId' | 'createdAt'>>) => {
    const updated = await api.updateStudent(id, data);
    setStudents((prev) => prev.map((s) => (s.id === id ? updated : s)));
    const rnk = await api.getRankings();
    setRankings(rnk);
  };

  const handleDeleteStudent = async (id: string) => {
    await api.deleteStudent(id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
    loadAllData();
  };

  // Handlers for Passages
  const handleAddPassage = async (data: Omit<Passage, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>) => {
    const newPassage = await api.createPassage(data);
    setPassages((prev) => [newPassage, ...prev]);
  };

  const handleUpdatePassage = async (id: string, data: Partial<Omit<Passage, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>>) => {
    const updated = await api.updatePassage(id, data);
    setPassages((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const handleDeletePassage = async (id: string) => {
    await api.deletePassage(id);
    setPassages((prev) => prev.filter((p) => p.id !== id));
  };

  // Handler for Saving Session
  const handleSaveSession = async (data: {
    studentId: string;
    passageId: string;
    words: string[];
    score: number;
    maxScore: number;
    comment: string;
    marks: Array<{ wordIndex: number; word: string; markType: MarkType }>;
  }) => {
    const newSession = await api.createSession({
      studentId: data.studentId,
      passageId: data.passageId,
      words: data.words,
    });

    const finished = await api.finishSession(newSession.id, {
      score: data.score,
      maxScore: data.maxScore,
      comment: data.comment,
      marks: data.marks,
    });

    await loadAllData();
    return finished;
  };

  const handleStartSessionWithPassage = (passageId: string) => {
    setSelectedPassageForSession(passageId);
    setCurrentTab('session');
  };

  const handleWordReportFilter = async (filters: { className?: string; passageId?: string }) => {
    try {
      const rep = await api.getWordFrequencyReport(filters);
      setReports(rep);
    } catch {
      // ignore
    }
  };

  return (
    <div className="app-shell min-h-screen flex flex-col text-[#111827]">
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'session') {
            setSelectedPassageForSession(undefined);
          }
          setCurrentTab(tab);
        }}
        teacher={teacher}
        onLogout={() => api.logout()}
        onOpenDbModal={() => {
          if (teacher.role === 'admin') setIsDbModalOpen(true);
        }}
        isNeonConnected={dbStatus.isNeonConnected}
        pendingApprovalCount={pendingApprovalCount}
      />

      {/* Main Content Viewport */}
      <main className="app-main flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20 lg:pb-8">
        {loadingData && (
          <div className="mb-4 p-2 text-center text-xs font-medium text-[#2F5BFF] bg-[#EAF0FF] border border-[#d2e0ff] rounded-xl animate-pulse">
            កំពុងទាញយកទិន្នន័យ...
          </div>
        )}

        {currentTab === 'overview' && (
          <Overview
            students={students}
            passages={passages}
            sessions={sessions}
            onStartSession={() => setCurrentTab('session')}
            onViewAllSessions={() => setCurrentTab('history')}
            onViewSessionDetail={() => setCurrentTab('history')}
            onNavigateToStudents={() => setCurrentTab('students')}
            onNavigateToPassages={() => setCurrentTab('passages')}
          />
        )}

        {currentTab === 'admin' && teacher.role === 'admin' && (
          <AdminTeacherManagement
            currentAdmin={teacher}
            onUpdateCurrentAdmin={(updated) => {
              setTeacher(updated);
              authStorage.setTeacher(updated);
            }}
          />
        )}

        {currentTab === 'students' && (
          <StudentList
            students={students}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
          />
        )}

        {currentTab === 'passages' && (
          <PassageLibrary
            passages={passages}
            onAddPassage={handleAddPassage}
            onUpdatePassage={handleUpdatePassage}
            onDeletePassage={handleDeletePassage}
            onStartSessionWithPassage={handleStartSessionWithPassage}
          />
        )}

        {currentTab === 'session' && (
          <ReadingSessionView
            students={students}
            passages={passages}
            initialPassageId={selectedPassageForSession}
            onSessionFinished={() => {
              setCurrentTab('history');
            }}
            onSaveSession={handleSaveSession}
          />
        )}

        {currentTab === 'history' && (
          <ReadingHistory
            sessions={sessions}
            students={students}
            passages={passages}
          />
        )}

        {currentTab === 'ranking' && (
          <RankingsView
            rankings={rankings}
            sessions={sessions}
            students={students}
          />
        )}

        {currentTab === 'reports' && (
          <WordReportView
            reports={reports}
            students={students}
            passages={passages}
            onFilterChange={handleWordReportFilter}
          />
        )}
      </main>

      {/* Database Settings Modal */}
      <DatabaseSettingsModal
        isOpen={isDbModalOpen && teacher.role === 'admin'}
        onClose={() => setIsDbModalOpen(false)}
        isNeonConnected={dbStatus.isNeonConnected}
        hasDatabaseUrl={dbStatus.hasDatabaseUrl}
        connectionError={dbStatus.connectionError}
        onRefreshStatus={loadDbStatus}
      />
    </div>
  );
}
