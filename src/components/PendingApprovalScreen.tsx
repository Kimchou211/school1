import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  ShieldAlert,
  ShieldX,
  RefreshCw,
  LogOut,
  Mail,
  Phone,
  Send,
  Calendar,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { Teacher } from '../types/index.ts';
import { api, authStorage } from '../lib/api.ts';

interface PendingApprovalScreenProps {
  teacher: Teacher;
  onStatusChanged: (updatedTeacher: Teacher) => void;
  onLogout: () => void;
}

export const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({
  teacher,
  onStatusChanged,
  onLogout,
}) => {
  const [checking, setChecking] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleRefresh = async () => {
    setChecking(true);
    setFeedbackMsg(null);
    try {
      const fresh = await api.getMe();
      if (fresh) {
        authStorage.setTeacher(fresh);
        if (fresh.status === 'approved') {
          onStatusChanged(fresh);
        } else {
          setFeedbackMsg(
            fresh.status === 'pending'
              ? 'គណនីរបស់អ្នកនៅតែស្ថិតក្នុងស្ថានភាពរង់ចាំការអនុម័តនៅឡើយ។'
              : `គណនីរបស់អ្នកស្ថិតក្នុងស្ថានភាព៖ ${fresh.status}`
          );
        }
      }
    } catch {
      setFeedbackMsg('មិនអាចភ្ជាប់ទៅកាន់ប្រព័ន្ធបានទេ សូមព្យាយាមម្ដងទៀត។');
    } finally {
      setChecking(false);
    }
  };

  const status = teacher.status;

  return (
    <div className="app-shell pending-shell min-h-screen bg-[#F7F8FA] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Simple Bar */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#2F5BFF] flex items-center justify-center text-white shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#111827]">ប្រព័ន្ធតាមដានការអានរបស់សិស្ស</h1>
            <p className="text-[11px] text-[#6B7280]">Khmer Reading Assessment System</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4B5563] hover:text-[#B91C1C] hover:bg-white rounded-lg border border-transparent hover:border-[#E5E7EB] transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>ចាកចេញ</span>
        </button>
      </div>

      {/* Main Status Card */}
      <div className="max-w-xl w-full mx-auto my-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="pending-card bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 sm:p-8 text-center"
        >
          {/* Status Icon */}
          <div className="flex justify-center mb-5">
            {status === 'pending' && (
              <div className="w-16 h-16 rounded-2xl bg-[#FEF0D5] flex items-center justify-center text-[#B45309] shadow-sm">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
            )}
            {status === 'rejected' && (
              <div className="w-16 h-16 rounded-2xl bg-[#FEE2E2] flex items-center justify-center text-[#B91C1C] shadow-sm">
                <ShieldX className="w-8 h-8" />
              </div>
            )}
            {status === 'suspended' && (
              <div className="w-16 h-16 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#4B5563] shadow-sm">
                <ShieldAlert className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="inline-block mb-3">
            {status === 'pending' && (
              <span className="px-3 py-1 text-xs font-semibold text-[#B45309] bg-[#FEF0D5] border border-[#FDE68A] rounded-full">
                ស្ថានភាព៖ រង់ចាំការអនុម័ត (Pending)
              </span>
            )}
            {status === 'rejected' && (
              <span className="px-3 py-1 text-xs font-semibold text-[#B91C1C] bg-[#FEE2E2] border border-[#FECACA] rounded-full">
                ស្ថានភាព៖ ត្រូវបានបដិសេធ (Rejected)
              </span>
            )}
            {status === 'suspended' && (
              <span className="px-3 py-1 text-xs font-semibold text-[#4B5563] bg-[#F3F4F6] border border-[#E5E7EB] rounded-full">
                ស្ថានភាព៖ ត្រូវបានផ្អាកជាបណ្ដោះអាសន្ន (Suspended)
              </span>
            )}
          </div>

          {/* Heading and Description */}
          <h2 className="text-xl font-bold text-[#111827] mb-2">
            {status === 'pending' && 'គណនីរបស់អ្នកកំពុងរង់ចាំការអនុម័ត'}
            {status === 'rejected' && 'គណនីត្រូវបានបដិសេធដោយអ្នកគ្រប់គ្រង'}
            {status === 'suspended' && 'គណនីត្រូវបានផ្អាកជាបណ្ដោះអាសន្ន'}
          </h2>

          <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed max-w-md mx-auto mb-6">
            {status === 'pending' &&
              'សូមអរគុណដែលបានចុះឈ្មោះជាគ្រូបង្រៀន! ដើម្បីធានាសុវត្ថិភាពទិន្នន័យសិស្សានុសិស្ស អ្នកគ្រប់គ្រងសាលា (Admin) ត្រូវពិនិត្យផ្ទៀងផ្ទាត់ និងអនុម័តគណនីរបស់អ្នកជាមុនសិន ទើបអាចចូលប្រើប្រាស់មុខងារបង្រៀនបាន។'}
            {status === 'rejected' &&
              'ការចុះឈ្មោះរបស់អ្នកមិនត្រូវបានអនុម័តដោយអ្នកគ្រប់គ្រងប្រព័ន្ធឡើយ។ ប្រសិនបើមានការភាន់ច្រឡំ សូមទាក់ទងអ្នកគ្រប់គ្រងសាលា។'}
            {status === 'suspended' &&
              'គណនីនេះត្រូវបានផ្អាកការប្រើប្រាស់ជាបណ្ដោះអាសន្ន។ សូមទាក់ទងអ្នកគ្រប់គ្រងសាលាដើម្បីបើកដំណើរការឡើងវិញ។'}
          </p>

          {/* Reason Note (if any) */}
          {teacher.statusNote && (
            <div className="mb-6 p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-left">
              <span className="text-xs font-bold text-[#92400E] block mb-1">
                កំណត់សម្គាល់ពីអ្នកគ្រប់គ្រង៖
              </span>
              <p className="text-xs text-[#78350F] leading-relaxed">{teacher.statusNote}</p>
            </div>
          )}

          {/* User Details Summary Box */}
          <div className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl p-4 text-left mb-6 space-y-2.5">
            <div className="text-xs font-semibold text-[#111827] border-b border-[#E5E7EB] pb-2 flex items-center justify-between">
              <span>ព័ត៌មានគណនីដែលបានចុះឈ្មោះ</span>
              <span className="text-[11px] font-normal text-[#6B7280]">
                {new Date(teacher.createdAt).toLocaleDateString('km-KH')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#6B7280] block text-[11px]">ឈ្មោះគ្រូ៖</span>
                <span className="font-medium text-[#111827]">{teacher.name}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block text-[11px]">អ៊ីមែល៖</span>
                <span className="font-medium text-[#111827] flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 text-[#6B7280] shrink-0" />
                  <span className="truncate">{teacher.email}</span>
                </span>
              </div>
              {teacher.phone && (
                <div>
                  <span className="text-[#6B7280] block text-[11px]">លេខទូរស័ព្ទ៖</span>
                  <span className="font-medium text-[#111827] flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#6B7280]" />
                    <span>{teacher.phone}</span>
                  </span>
                </div>
              )}
              {teacher.telegramUsername && (
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Telegram៖</span>
                  <span className="font-medium text-[#111827] flex items-center gap-1">
                    <Send className="w-3 h-3 text-[#6B7280]" />
                    <span>{teacher.telegramUsername}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Message if checked */}
          {feedbackMsg && (
            <div className="mb-4 p-2.5 bg-[#EAF0FF] border border-[#d2e0ff] rounded-xl text-xs text-[#2F5BFF] flex items-center justify-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={checking}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2F5BFF] hover:bg-[#2548cc] text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'កំពុងពិនិត្យ...' : 'ពិនិត្យស្ថានភាពឡើងវិញ'}</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-[#F3F4F6] text-[#4B5563] text-xs font-semibold rounded-xl border border-[#E5E7EB] transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ចាកចេញពីគណនី</span>
            </button>
          </div>

          {/* Admin Contact info helper */}
          <div className="mt-6 pt-5 border-t border-[#E5E7EB] text-left">
            <p className="text-[11px] text-[#6B7280] mb-2 font-medium">ទំនាក់ទំនងអ្នកគ្រប់គ្រងសាលា (School Admin)៖</p>
            <div className="flex flex-wrap gap-3 text-xs text-[#4B5563]">
              <div className="flex items-center gap-1.5 bg-[#F7F8FA] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
                <Send className="w-3 h-3 text-[#2F5BFF]" />
                <span>Telegram: @admin_reading</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#F7F8FA] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
                <Phone className="w-3 h-3 text-[#10B981]" />
                <span>ទូរស័ព្ទ: 012 888 999</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer Notice */}
      <div className="max-w-xl w-full mx-auto text-center pt-4">
        <p className="text-[11px] text-[#9CA3AF]">
          ប្រព័ន្ធតាមដានការអានរបស់សិស្ស &bull; ការពារសុវត្ថិភាពទិន្នន័យ &bull; សម្រាប់តែគ្រូបង្រៀនដែលបានអនុម័ត
        </p>
      </div>
    </div>
  );
};
