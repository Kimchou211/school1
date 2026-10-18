import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  FileSpreadsheet,
  KeyRound,
  Trash2,
  Phone,
  Mail,
  Send,
  Calendar,
  Eye,
  X,
  History,
  Lock,
  FileText,
  Award,
  AlertCircle,
  UserCheck,
  UserX,
  SlidersHorizontal,
} from 'lucide-react';
import { Teacher, TeacherStatus, AdminStats, AdminAuditLog } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { exportToExcel } from '../lib/exportUtils.ts';

interface AdminTeacherManagementProps {
  currentAdmin: Teacher;
  onUpdateCurrentAdmin?: (updated: Teacher) => void;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended';

export const AdminTeacherManagement: React.FC<AdminTeacherManagementProps> = ({ currentAdmin, onUpdateCurrentAdmin }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [currentFilter, setCurrentFilter] = useState<FilterTab>('all');

  // Admin Profile Modal state
  const [isAdminProfileModalOpen, setIsAdminProfileModalOpen] = useState(false);
  const [adminName, setAdminName] = useState(currentAdmin.name);
  const [adminEmail, setAdminEmail] = useState(currentAdmin.email);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState(currentAdmin.phone || '');
  const [adminTelegram, setAdminTelegram] = useState(currentAdmin.telegramUsername || '');
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);
  const [adminProfileError, setAdminProfileError] = useState<string | null>(null);

  // Modals state
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | 'reset-pwd' | 'delete' | null>(null);
  const [actionNote, setActionNote] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Audit Logs Modal
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  // Load Data
  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [adminStats, teacherList] = await Promise.all([
        api.getAdminStats(),
        api.getAdminTeachers(),
      ]);
      setStats(adminStats);
      setTeachers(teacherList);
    } catch (err: unknown) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Load Audit logs on demand
  const handleOpenAuditLogs = async () => {
    setIsAuditModalOpen(true);
    setLoadingAudit(true);
    try {
      const logs = await api.getAdminAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Toast Helper
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (currentFilter !== 'all' && t.status !== currentFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.phone && t.phone.toLowerCase().includes(q)) ||
        (t.telegramUsername && t.telegramUsername.toLowerCase().includes(q))
      );
    });
  }, [teachers, currentFilter, search]);

  // Status Action Handlers
  const handleExecuteStatusChange = async (targetStatus: TeacherStatus) => {
    if (!selectedTeacher) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const updated = await api.updateTeacherStatus(selectedTeacher.id, targetStatus, actionNote);
      setTeachers((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      showToast(
        targetStatus === 'approved'
          ? `បានអនុម័តគណនី ${selectedTeacher.name} ជោគជ័យ!`
          : targetStatus === 'rejected'
          ? `បានបដិសេធគណនី ${selectedTeacher.name}!`
          : `បានផ្អាកគណនី ${selectedTeacher.name}!`
      );
      // reload stats
      const newStats = await api.getAdminStats();
      setStats(newStats);
      closeModal();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'មានបញ្ហាក្នុងការកែប្រែស្ថានភាព');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteResetPassword = async () => {
    if (!selectedTeacher || !newPassword) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.resetTeacherPassword(selectedTeacher.id, newPassword);
      showToast(`បានប្តូរពាក្យសម្ងាត់សម្រាប់ ${selectedTeacher.name} ជោគជ័យ!`);
      closeModal();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'មិនអាចប្តូរពាក្យសម្ងាត់បានទេ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!selectedTeacher) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.deleteTeacher(selectedTeacher.id);
      setTeachers((prev) => prev.filter((t) => t.id !== selectedTeacher.id));
      showToast(`បានលុបគណនី ${selectedTeacher.name} ចេញពីប្រព័ន្ធ!`);
      const newStats = await api.getAdminStats();
      setStats(newStats);
      closeModal();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'មិនអាចលុបគណនីបានទេ');
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedTeacher(null);
    setActionType(null);
    setActionNote('');
    setNewPassword('');
    setErrorMsg(null);
  };

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminProfileError(null);
    if (adminNewPassword && adminNewPassword.length < 6) {
      setAdminProfileError('ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៦ តួអក្សរ');
      return;
    }
    if (adminNewPassword && adminNewPassword !== adminConfirmPassword) {
      setAdminProfileError('ពាក្យសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ');
      return;
    }
    setSavingAdminProfile(true);
    try {
      const res = await api.updateAdminProfile({
        name: adminName,
        email: adminEmail,
        newPassword: adminNewPassword || undefined,
        phone: adminPhone || undefined,
        telegramUsername: adminTelegram || undefined,
      });
      showToast('បានកែប្រែព័ត៌មានគណនី Admin ដោយជោគជ័យ!');
      onUpdateCurrentAdmin?.(res.teacher);
      setIsAdminProfileModalOpen(false);
      loadAdminData();
    } catch (err: unknown) {
      setAdminProfileError((err as Error).message || 'មានបញ្ហាក្នុងការកែប្រែ');
    } finally {
      setSavingAdminProfile(false);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const data = filteredTeachers.map((t, idx) => ({
      'ល.រ': idx + 1,
      'ឈ្មោះគ្រូ': t.name,
      'អ៊ីមែល': t.email,
      'តួនាទី': t.role === 'admin' ? 'អ្នកគ្រប់គ្រង (Admin)' : 'គ្រូបង្រៀន',
      'ស្ថានភាព':
        t.status === 'approved'
          ? 'បានអនុម័ត'
          : t.status === 'pending'
          ? 'រង់ចាំអនុម័ត'
          : t.status === 'rejected'
          ? 'បានបដិសេធ'
          : 'បានផ្អាក',
      'លេខទូរស័ព្ទ': t.phone || '-',
      'Telegram': t.telegramUsername || '-',
      'ចំនួនសិស្ស': t.studentCount || 0,
      'ចំនួនវគ្គអាន': t.sessionCount || 0,
      'កាលបរិច្ឆេទចុះឈ្មោះ': new Date(t.createdAt).toLocaleDateString('km-KH'),
      'កាលបរិច្ឆេទអនុម័ត': t.approvedAt ? new Date(t.approvedAt).toLocaleDateString('km-KH') : '-',
      'កំណត់សម្គាល់': t.statusNote || '-',
    }));
    exportToExcel(data, `បញ្ជីគ្រូបង្រៀន_${new Date().toISOString().slice(0, 10)}`, 'គ្រូបង្រៀន');
  };

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-[#15803D] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-2 rounded-xl bg-[#EAF0FF] text-[#2F5BFF]">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#111827]">ផ្ទាំងគ្រប់គ្រង Admin & គ្រូបង្រៀន</h1>
          </div>
          <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
            គ្រប់គ្រងការអនុម័តគ្រូថ្មី ផ្ទៀងផ្ទាត់គណនី កំណត់ពាក្យសម្ងាត់ និងតាមដានសកម្មភាពទូទាំងសាលា
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setAdminName(currentAdmin.name);
              setAdminEmail(currentAdmin.email);
              setAdminPhone(currentAdmin.phone || '');
              setAdminTelegram(currentAdmin.telegramUsername || '');
              setAdminNewPassword('');
              setAdminConfirmPassword('');
              setAdminProfileError(null);
              setIsAdminProfileModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#111827] bg-[#F7F8FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] rounded-xl shadow-xs transition-all cursor-pointer"
            title="ផ្លាស់ប្តូរ Gmail និង Password របស់ Admin"
          >
            <KeyRound className="w-4 h-4 text-[#2F5BFF]" />
            <span>កែប្រែគណនី Admin (Gmail & Password)</span>
          </button>

          <button
            onClick={handleOpenAuditLogs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#4B5563] bg-white hover:bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <History className="w-4 h-4 text-[#6B7280]" />
            <span>កំណត់ត្រាសវនកម្ម</span>
          </button>

          <button
            onClick={loadAdminData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#2F5BFF] bg-[#EAF0FF] hover:bg-[#d9e4ff] rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>ផ្ទុកឡើងវិញ</span>
          </button>
        </div>
      </div>

      {/* Attention alert for pending approvals */}
      {stats && stats.pendingTeachers > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF0D5] text-[#B45309] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#92400E]">
                មានគ្រូចំនួន {stats.pendingTeachers} នាក់កំពុងរង់ចាំការអនុម័ត!
              </h2>
              <p className="text-xs text-[#78350F]">
                សូមពិនិត្យព័ត៌មានទំនាក់ទំនងរបស់គ្រូ និងចុច «អនុម័ត» ដើម្បីអនុញ្ញាតឲ្យពួកគាត់ចាប់ផ្ដើមប្រើប្រព័ន្ធ។
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setCurrentFilter('pending');
              setSearch('');
            }}
            className="self-start sm:self-auto px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            ពិនិត្យមើលបញ្ជីរង់ចាំឥឡូវនេះ
          </button>
        </motion.div>
      )}

      {/* Statistics Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Teachers */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-medium">សរុបគ្រូទាំងអស់</span>
            <Users className="w-4 h-4 text-[#2F5BFF]" />
          </div>
          <div className="text-2xl font-bold text-[#111827]">{stats?.totalTeachers ?? 0}</div>
          <span className="text-[11px] text-[#6B7280]">គណនីក្នុងប្រព័ន្ធ</span>
        </div>

        {/* Pending Approval */}
        <div
          onClick={() => setCurrentFilter('pending')}
          className={`bg-white p-4 rounded-2xl border shadow-[0_2px_8px_rgba(0,0,0,0.02)] cursor-pointer transition-all ${
            currentFilter === 'pending' ? 'border-[#D97706] ring-2 ring-[#FEF0D5]' : 'border-[#E5E7EB] hover:border-[#D97706]'
          }`}
        >
          <div className="flex items-center justify-between text-[#B45309] mb-2">
            <span className="text-xs font-medium">រង់ចាំអនុម័ត</span>
            <Clock className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-bold text-[#D97706] flex items-center gap-2">
            <span>{stats?.pendingTeachers ?? 0}</span>
            {(stats?.pendingTeachers ?? 0) > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] animate-ping" />
            )}
          </div>
          <span className="text-[11px] text-[#B45309]">គ្រូថ្មីចុះឈ្មោះ</span>
        </div>

        {/* Approved Teachers */}
        <div
          onClick={() => setCurrentFilter('approved')}
          className={`bg-white p-4 rounded-2xl border shadow-[0_2px_8px_rgba(0,0,0,0.02)] cursor-pointer transition-all ${
            currentFilter === 'approved' ? 'border-[#15803D] ring-2 ring-[#DCFCE7]' : 'border-[#E5E7EB] hover:border-[#15803D]'
          }`}
        >
          <div className="flex items-center justify-between text-[#15803D] mb-2">
            <span className="text-xs font-medium">បានអនុម័ត</span>
            <CheckCircle className="w-4 h-4 text-[#15803D]" />
          </div>
          <div className="text-2xl font-bold text-[#15803D]">{stats?.approvedTeachers ?? 0}</div>
          <span className="text-[11px] text-[#15803D]">កំពុងសកម្ម</span>
        </div>

        {/* Rejected or Suspended */}
        <div
          onClick={() => setCurrentFilter('suspended')}
          className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] cursor-pointer hover:border-[#B91C1C]"
        >
          <div className="flex items-center justify-between text-[#B91C1C] mb-2">
            <span className="text-xs font-medium">បដិសេធ / ផ្អាក</span>
            <XCircle className="w-4 h-4 text-[#B91C1C]" />
          </div>
          <div className="text-2xl font-bold text-[#B91C1C]">
            {(stats?.rejectedTeachers ?? 0) + (stats?.suspendedTeachers ?? 0)}
          </div>
          <span className="text-[11px] text-[#6B7280]">
            {stats?.rejectedTeachers ?? 0} បដិសេធ, {stats?.suspendedTeachers ?? 0} ផ្អាក
          </span>
        </div>

        {/* Total Students */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-medium">សរុបសិស្សទាំងអស់</span>
            <Award className="w-4 h-4 text-[#2F5BFF]" />
          </div>
          <div className="text-2xl font-bold text-[#111827]">{stats?.totalStudents ?? 0}</div>
          <span className="text-[11px] text-[#6B7280]">ទូទាំងប្រព័ន្ធ</span>
        </div>

        {/* Total Sessions */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-medium">សរុបវគ្គអាន</span>
            <FileText className="w-4 h-4 text-[#2F5BFF]" />
          </div>
          <div className="text-2xl font-bold text-[#111827]">{stats?.totalSessions ?? 0}</div>
          <span className="text-[11px] text-[#6B7280]">ការវាយតម្លៃ</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] space-y-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setCurrentFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                currentFilter === 'all'
                  ? 'bg-[#2F5BFF] text-white shadow-xs'
                  : 'bg-[#F7F8FA] text-[#4B5563] hover:bg-[#E5E7EB]'
              }`}
            >
              ទាំងអស់ ({teachers.length})
            </button>

            <button
              onClick={() => setCurrentFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                currentFilter === 'pending'
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'bg-[#FEF0D5] text-[#B45309] hover:bg-[#FDE68A]'
              }`}
            >
              <span>រង់ចាំអនុម័ត</span>
              <span className="px-1.5 py-0.2 bg-white/30 rounded-full text-[10px]">
                {teachers.filter((t) => t.status === 'pending').length}
              </span>
            </button>

            <button
              onClick={() => setCurrentFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                currentFilter === 'approved'
                  ? 'bg-[#15803D] text-white shadow-xs'
                  : 'bg-[#F7F8FA] text-[#4B5563] hover:bg-[#E5E7EB]'
              }`}
            >
              បានអនុម័ត ({teachers.filter((t) => t.status === 'approved').length})
            </button>

            <button
              onClick={() => setCurrentFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                currentFilter === 'rejected'
                  ? 'bg-[#B91C1C] text-white shadow-xs'
                  : 'bg-[#F7F8FA] text-[#4B5563] hover:bg-[#E5E7EB]'
              }`}
            >
              បានបដិសេធ ({teachers.filter((t) => t.status === 'rejected').length})
            </button>

            <button
              onClick={() => setCurrentFilter('suspended')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                currentFilter === 'suspended'
                  ? 'bg-[#4B5563] text-white shadow-xs'
                  : 'bg-[#F7F8FA] text-[#4B5563] hover:bg-[#E5E7EB]'
              }`}
            >
              បានផ្អាក ({teachers.filter((t) => t.status === 'suspended').length})
            </button>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ស្វែងរកតាមឈ្មោះ, អ៊ីមែល, លេខទូរស័ព្ទ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#2F5BFF] focus:bg-white transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#15803D] bg-[#DCFCE7] hover:bg-[#bbf7d0] rounded-xl transition-all cursor-pointer"
                title="ទាញយកជា Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F8FA] border-b border-[#E5E7EB] text-[#4B5563] font-semibold">
                <th className="py-3 px-4">គ្រូបង្រៀន</th>
                <th className="py-3 px-4">ទំនាក់ទំនង (Contact)</th>
                <th className="py-3 px-4">កាលបរិច្ឆេទ</th>
                <th className="py-3 px-4 text-center">សិស្ស / វគ្គអាន</th>
                <th className="py-3 px-4 text-center">ស្ថានភាព</th>
                <th className="py-3 px-4 text-right">សកម្មភាព (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7280]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-[#2F5BFF] border-t-transparent rounded-full animate-spin" />
                      <span>កំពុងទាញយកទិន្នន័យគ្រូបង្រៀន...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7280]">
                    <div className="flex flex-col items-center gap-1.5">
                      <Users className="w-8 h-8 text-[#9CA3AF] stroke-[1.5]" />
                      <span className="font-semibold text-sm text-[#111827]">រកមិនឃើញគ្រូបង្រៀនទេ</span>
                      <span className="text-xs text-[#6B7280]">សាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬផ្ទាំងចម្រោះ</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t) => {
                  const isCurrentAdmin = t.id === currentAdmin.id;
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-[#F9FAFB] transition-colors ${
                        t.status === 'pending' ? 'bg-[#FFFDF5]' : ''
                      }`}
                    >
                      {/* Teacher Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              t.role === 'admin'
                                ? 'bg-[#EEF2FF] text-[#2F5BFF] border border-[#d2e0ff]'
                                : t.status === 'pending'
                                ? 'bg-[#FEF0D5] text-[#B45309] border border-[#FDE68A]'
                                : 'bg-[#F3F4F6] text-[#4B5563]'
                            }`}
                          >
                            {t.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-[#111827] flex items-center gap-1.5">
                              <span>{t.name}</span>
                              {t.role === 'admin' && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold text-[#2F5BFF] bg-[#EAF0FF] rounded-md">
                                  Admin
                                </span>
                              )}
                              {isCurrentAdmin && (
                                <span className="text-[10px] text-[#6B7280] font-normal">(អ្នក)</span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                              <Mail className="w-3 h-3 text-[#9CA3AF]" />
                              <span>{t.email}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 text-[11px]">
                          {t.phone ? (
                            <div className="flex items-center gap-1 text-[#111827]">
                              <Phone className="w-3 h-3 text-[#10B981]" />
                              <span>{t.phone}</span>
                            </div>
                          ) : (
                            <span className="text-[#9CA3AF]">-</span>
                          )}
                          {t.telegramUsername && (
                            <div className="flex items-center gap-1 text-[#2F5BFF]">
                              <Send className="w-3 h-3" />
                              <span>{t.telegramUsername}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] space-y-0.5">
                          <div className="text-[#111827]">
                            <span className="text-[#6B7280]">ចុះឈ្មោះ៖ </span>
                            {new Date(t.createdAt).toLocaleDateString('km-KH')}
                          </div>
                          {t.approvedAt && (
                            <div className="text-[#15803D]">
                              <span className="text-[#6B7280]">អនុម័ត៖ </span>
                              {new Date(t.approvedAt).toLocaleDateString('km-KH')}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Student & Session count */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2 bg-[#F7F8FA] px-2.5 py-1 rounded-lg border border-[#E5E7EB] text-[11px]">
                          <span className="font-semibold text-[#111827]">{t.studentCount ?? 0} សិស្ស</span>
                          <span className="text-[#9CA3AF]">&bull;</span>
                          <span className="text-[#4B5563]">{t.sessionCount ?? 0} វគ្គអាន</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {t.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] border border-[#BBF7D0] rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            <span>បានអនុម័ត</span>
                          </span>
                        )}
                        {t.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#B45309] bg-[#FEF0D5] border border-[#FDE68A] rounded-full animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>រង់ចាំអនុម័ត</span>
                          </span>
                        )}
                        {t.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#B91C1C] bg-[#FEE2E2] border border-[#FECACA] rounded-full">
                            <XCircle className="w-3 h-3" />
                            <span>បានបដិសេធ</span>
                          </span>
                        )}
                        {t.status === 'suspended' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#4B5563] bg-[#F3F4F6] border border-[#E5E7EB] rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            <span>បានផ្អាក</span>
                          </span>
                        )}
                      </td>

                      {/* Actions Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If Pending: Quick Approve and Reject */}
                          {t.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedTeacher(t);
                                  setActionType('approve');
                                }}
                                className="px-2.5 py-1.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                                title="អនុម័តគណនីគ្រូ"
                              >
                                អនុម័ត
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTeacher(t);
                                  setActionType('reject');
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] rounded-lg font-semibold text-[11px] transition-all cursor-pointer"
                                title="បដិសេធ"
                              >
                                បដិសេធ
                              </button>
                            </>
                          )}

                          {/* If Approved: Option to Suspend */}
                          {t.status === 'approved' && !isCurrentAdmin && (
                            <button
                              onClick={() => {
                                setSelectedTeacher(t);
                                setActionType('suspend');
                              }}
                              className="px-2 py-1.5 text-[#4B5563] hover:text-[#B91C1C] hover:bg-[#FEE2E2] rounded-lg transition-all text-[11px] font-medium cursor-pointer"
                              title="ផ្អាកគណនី"
                            >
                              ផ្អាក
                            </button>
                          )}

                          {/* If Suspended or Rejected: Option to Re-approve */}
                          {(t.status === 'suspended' || t.status === 'rejected') && (
                            <button
                              onClick={() => {
                                setSelectedTeacher(t);
                                setActionType('approve');
                              }}
                              className="px-2.5 py-1.5 bg-[#2F5BFF] hover:bg-[#2548cc] text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                              title="បើកដំណើរការឡើងវិញ"
                            >
                              បើកឡើងវិញ
                            </button>
                          )}

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setSelectedTeacher(t);
                              setActionType('reset-pwd');
                            }}
                            className="p-1.5 text-[#6B7280] hover:text-[#2F5BFF] hover:bg-[#EAF0FF] rounded-lg transition-all cursor-pointer"
                            title="ប្តូរពាក្យសម្ងាត់"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete (Cannot delete self) */}
                          {!isCurrentAdmin && (
                            <button
                              onClick={() => {
                                setSelectedTeacher(t);
                                setActionType('delete');
                              }}
                              className="p-1.5 text-[#6B7280] hover:text-[#B91C1C] hover:bg-[#FEE2E2] rounded-lg transition-all cursor-pointer"
                              title="លុបគណនី"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation & Action Modal */}
      <AnimatePresence>
        {selectedTeacher && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xl max-w-md w-full p-6 text-left"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] mb-4">
                <div className="flex items-center gap-2">
                  {actionType === 'approve' && (
                    <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  )}
                  {actionType === 'reject' && (
                    <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center">
                      <UserX className="w-4 h-4" />
                    </div>
                  )}
                  {actionType === 'suspend' && (
                    <div className="w-8 h-8 rounded-lg bg-[#FEF0D5] text-[#B45309] flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  )}
                  {actionType === 'reset-pwd' && (
                    <div className="w-8 h-8 rounded-lg bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center">
                      <KeyRound className="w-4 h-4" />
                    </div>
                  )}
                  {actionType === 'delete' && (
                    <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </div>
                  )}
                  <h3 className="font-bold text-sm text-[#111827]">
                    {actionType === 'approve' && 'អនុម័តគណនីគ្រូបង្រៀន'}
                    {actionType === 'reject' && 'បដិសេធការចុះឈ្មោះ'}
                    {actionType === 'suspend' && 'ផ្អាកដំណើរការគណនី'}
                    {actionType === 'reset-pwd' && 'កំណត់ពាក្យសម្ងាត់ឡើងវិញ'}
                    {actionType === 'delete' && 'លុបគណនីគ្រូបង្រៀន'}
                  </h3>
                </div>
                <button
                  onClick={closeModal}
                  className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target Teacher Summary */}
              <div className="bg-[#F7F8FA] p-3 rounded-xl border border-[#E5E7EB] mb-4 text-xs">
                <div className="font-bold text-[#111827]">{selectedTeacher.name}</div>
                <div className="text-[#6B7280]">{selectedTeacher.email}</div>
                {selectedTeacher.phone && (
                  <div className="text-[#6B7280]">ទូរស័ព្ទ៖ {selectedTeacher.phone}</div>
                )}
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="mb-4 p-2.5 bg-[#FEE2E2] text-[#B91C1C] text-xs rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Body depending on action */}
              {actionType === 'approve' && (
                <div className="space-y-3 mb-5">
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    តើអ្នកពិតជាចង់អនុម័តគណនីរបស់ <strong>{selectedTeacher.name}</strong> មែនទេ?
                    ក្រោយពេលអនុម័ត គ្រូអាចចូលប្រើប្រាស់មុខងារបង្រៀនបានពេញលេញភ្លាមៗ។
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-[#4B5563] mb-1">
                      កំណត់សម្គាល់បន្ថែម (ស្រេចចិត្ត)៖
                    </label>
                    <input
                      type="text"
                      placeholder="ឧ. គ្រូថ្នាក់ទី ៤, បានផ្ទៀងផ្ទាត់រួចរាល់..."
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2F5BFF] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {actionType === 'reject' && (
                <div className="space-y-3 mb-5">
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    សូមបញ្ជាក់មូលហេតុនៃការបដិសេធ។ មូលហេតុនេះនឹងបង្ហាញជូនគ្រូនៅលើអេក្រង់របស់គាត់៖
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-[#4B5563] mb-1">
                      មូលហេតុនៃការបដិសេធ (Reason) *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="ឧ. មិនមែនជាគ្រូបង្រៀនក្នុងសាលា ឬព័ត៌មានមិនត្រឹមត្រូវ..."
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#B91C1C] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {actionType === 'suspend' && (
                <div className="space-y-3 mb-5">
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    ការផ្អាកនឹងធ្វើឲ្យគ្រូមិនអាចចូលប្រើមុខងារបង្រៀន និងសិស្សបានជាបណ្ដោះអាសន្ន។
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-[#4B5563] mb-1">
                      មូលហេតុនៃការផ្អាក៖
                    </label>
                    <textarea
                      rows={3}
                      placeholder="ឧ. ឈប់សម្រាកមួយរយៈ ឬពិនិត្យព័ត៌មានឡើងវិញ..."
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2F5BFF] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {actionType === 'reset-pwd' && (
                <div className="space-y-3 mb-5">
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    បញ្ចូលពាក្យសម្ងាត់ថ្មីសម្រាប់គ្រូបង្រៀនរូបនេះ៖
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-[#4B5563] mb-1">
                      ពាក្យសម្ងាត់ថ្មី (យ៉ាងតិច ៦ តួអក្សរ) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="បញ្ចូលពាក្យសម្ងាត់ថ្មី..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2F5BFF] focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setNewPassword(Math.random().toString(36).slice(-8) + 'Aa1!')}
                        className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#EAF0FF] text-[#2F5BFF] rounded-xl hover:bg-[#d9e4ff] cursor-pointer"
                      >
                        បង្កើតស្វ័យប្រវត្តិ
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {actionType === 'delete' && (
                <div className="space-y-3 mb-5">
                  <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-xl text-xs text-[#B91C1C]">
                    <span className="font-bold block mb-1">ការព្រមាន៖</span>
                    ការលុបនេះនឹងលុបគណនីគ្រូ បញ្ជីសិស្ស អត្ថបទ និងវគ្គអានទាំងអស់ដែលជាកម្មសិទ្ធិរបស់គ្រូនេះចេញពីប្រព័ន្ធទាំងស្រុង។
                  </div>
                  <p className="text-xs text-[#4B5563]">
                    តើអ្នកពិតជាចង់លុប <strong>{selectedTeacher.name}</strong> មែនទេ?
                  </p>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E7EB]">
                <button
                  onClick={closeModal}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6] rounded-xl transition-all cursor-pointer"
                >
                  បោះបង់
                </button>

                {actionType === 'approve' && (
                  <button
                    onClick={() => handleExecuteStatusChange('approved')}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#15803D] hover:bg-[#166534] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? 'កំពុងអនុម័ត...' : 'យល់ព្រមអនុម័ត'}
                  </button>
                )}

                {actionType === 'reject' && (
                  <button
                    onClick={() => handleExecuteStatusChange('rejected')}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991b1b] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? 'កំពុងបដិសេធ...' : 'បញ្ជាក់ការបដិសេធ'}
                  </button>
                )}

                {actionType === 'suspend' && (
                  <button
                    onClick={() => handleExecuteStatusChange('suspended')}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#D97706] hover:bg-[#B45309] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? 'កំពុងផ្អាក...' : 'បញ្ជាក់ការផ្អាក'}
                  </button>
                )}

                {actionType === 'reset-pwd' && (
                  <button
                    onClick={handleExecuteResetPassword}
                    disabled={actionLoading || newPassword.length < 6}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#2548cc] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? 'កំពុងរក្សាទុក...' : 'ប្តូរពាក្យសម្ងាត់'}
                  </button>
                )}

                {actionType === 'delete' && (
                  <button
                    onClick={handleExecuteDelete}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991b1b] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? 'កំពុងលុប...' : 'លុបគណនីជាស្ថាពរ'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Audit Logs Modal */}
      <AnimatePresence>
        {isAuditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#111827]">កំណត់ត្រាសវនកម្ម Admin (Audit Logs)</h3>
                    <p className="text-[11px] text-[#6B7280]">ប្រវត្តិនៃការអនុម័ត បដិសេធ ផ្អាក និងកំណត់ពាក្យសម្ងាត់</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="p-1 text-[#9CA3AF] hover:text-[#111827] rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Logs Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-[#E5E7EB]">
                {loadingAudit ? (
                  <div className="py-12 text-center text-[#6B7280] text-xs">
                    កំពុងផ្ទុកកំណត់ត្រា...
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-12 text-center text-[#6B7280] text-xs">
                    មិនទាន់មានកំណត់ត្រាសវនកម្មនៅឡើយទេ
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="py-3 text-xs flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#111827] flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action.includes('APPROVE')
                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                : log.action.includes('REJECT')
                                ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                : log.action.includes('SUSPEND')
                                ? 'bg-[#FEF0D5] text-[#B45309]'
                                : 'bg-[#EAF0FF] text-[#2F5BFF]'
                            }`}
                          >
                            {log.action}
                          </span>
                          <span>{log.targetTeacherName || log.targetTeacherId}</span>
                        </div>
                        {log.note && (
                          <p className="text-[11px] text-[#4B5563] mt-1 italic">
                            «{log.note}»
                          </p>
                        )}
                        <span className="text-[10px] text-[#9CA3AF] mt-1 block">
                          ដោយ {log.adminName || 'Admin'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#9CA3AF] shrink-0 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('km-KH')}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-[#E5E7EB] bg-[#F7F8FA] text-right">
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="px-4 py-1.5 bg-white border border-[#E5E7EB] text-xs font-semibold text-[#4B5563] rounded-xl hover:bg-[#F3F4F6] cursor-pointer"
                >
                  បិទ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Profile & Password Edit Modal */}
      <AnimatePresence>
        {isAdminProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#111827]">កែប្រែព័ត៌មានគណនី Admin</h3>
                    <p className="text-[11px] text-[#6B7280]">ផ្លាស់ប្តូរឈ្មោះ អ៊ីមែល (Gmail) និងពាក្យសម្ងាត់</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdminProfileModalOpen(false)}
                  className="p-1 text-[#9CA3AF] hover:text-[#111827] rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAdminProfile} className="p-5 space-y-3.5 text-xs">
                {adminProfileError && (
                  <div className="p-2.5 bg-[#FEE2E2] text-[#B91C1C] rounded-xl flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{adminProfileError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-[#374151] mb-1">
                    ឈ្មោះអ្នកគ្រប់គ្រង *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2F5BFF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#374151] mb-1">
                    អ៊ីមែល / Gmail សម្រាប់ចូលប្រព័ន្ធ *
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2F5BFF] focus:bg-white"
                  />
                  <p className="text-[10px] text-[#6B7280] mt-1">
                    * អាចប្រើ Gmail ផ្ទាល់ខ្លួនរបស់អ្នក (ឧ. yourname@gmail.com)
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E5E7EB]">
                  <span className="font-bold text-[#111827] block mb-2">
                    ប្តូរពាក្យសម្ងាត់ (ទុកទំនេរប្រសិនបើមិនចង់ប្តូរ)៖
                  </span>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-[#4B5563] mb-1">
                        ពាក្យសម្ងាត់ថ្មី (យ៉ាងតិច ៦ តួអក្សរ)
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={adminNewPassword}
                        onChange={(e) => setAdminNewPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2F5BFF] focus:bg-white"
                      />
                    </div>

                    {adminNewPassword && (
                      <div>
                        <label className="block text-[11px] font-medium text-[#4B5563] mb-1">
                          ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ថ្មី
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={adminConfirmPassword}
                          onChange={(e) => setAdminConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2F5BFF] focus:bg-white"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#E5E7EB]">
                  <div>
                    <label className="block text-[11px] font-medium text-[#4B5563] mb-1">
                      លេខទូរស័ព្ទ
                    </label>
                    <input
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="012 345 678"
                      className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2F5BFF] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#4B5563] mb-1">
                      Telegram Username
                    </label>
                    <input
                      type="text"
                      value={adminTelegram}
                      onChange={(e) => setAdminTelegram(e.target.value)}
                      placeholder="@username"
                      className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2F5BFF] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={() => setIsAdminProfileModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6] rounded-xl cursor-pointer"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    disabled={savingAdminProfile}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#2548cc] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingAdminProfile ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការផ្លាស់ប្តូរ'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
