import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  FileText,
  PlayCircle,
  Award,
  ChevronRight,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Student, Passage, ReadingSession } from '../types/index.ts';
import { formatKhmerDate, toKhmerDigits } from '../lib/khmerSegmentation.ts';

interface OverviewProps {
  students: Student[];
  passages: Passage[];
  sessions: ReadingSession[];
  onStartSession: () => void;
  onViewAllSessions: () => void;
  onViewSessionDetail: (session: ReadingSession) => void;
  onNavigateToStudents: () => void;
  onNavigateToPassages: () => void;
}

// Animated count-up component
const CountUpNumber: React.FC<{ end: number; duration?: number }> = ({ end, duration = 0.8 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [end, duration]);

  return <>{toKhmerDigits(count)}</>;
};

export const Overview: React.FC<OverviewProps> = ({
  students,
  passages,
  sessions,
  onStartSession,
  onViewAllSessions,
  onViewSessionDetail,
  onNavigateToStudents,
  onNavigateToPassages,
}) => {
  const completedSessions = sessions.filter((s) => s.status === 'completed' && s.score !== null);

  // Calculate overall average score percentage
  const avgPercentage = completedSessions.length > 0
    ? Math.round(
        (completedSessions.reduce((acc, s) => acc + ((s.score || 0) / (s.maxScore || 10)) * 100, 0) /
          completedSessions.length) *
          10
      ) / 10
    : 0;

  const recentSessions = completedSessions.slice(0, 5);

  const stats = [
    {
      label: 'ចំនួនសិស្សសរុប',
      numericValue: students.length,
      isPercentage: false,
      unit: 'នាក់',
      icon: <Users className="w-5 h-5 text-[#2F5BFF]" />,
      action: onNavigateToStudents,
    },
    {
      label: 'ចំនួនអត្ថបទក្នុងបណ្ណាល័យ',
      numericValue: passages.length,
      isPercentage: false,
      unit: 'អត្ថបទ',
      icon: <FileText className="w-5 h-5 text-[#2F5BFF]" />,
      action: onNavigateToPassages,
    },
    {
      label: 'វគ្គអានដែលបានបញ្ចប់',
      numericValue: completedSessions.length,
      isPercentage: false,
      unit: 'លើក',
      icon: <PlayCircle className="w-5 h-5 text-[#16A34A]" />,
      action: onViewAllSessions,
    },
    {
      label: 'ពិន្ទុមធ្យមសរុប',
      numericValue: Math.round(avgPercentage),
      isPercentage: true,
      unit: 'មធ្យមភាគ',
      icon: <Award className="w-5 h-5 text-[#D97706]" />,
      action: onViewAllSessions,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Action Card (Clean White Surface with Blue Accent) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="ui-hero bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden"
      >
        <div className="max-w-2xl">
          <div className="ui-hero-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF0FF] text-xs font-semibold text-[#2F5BFF] mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ប្រព័ន្ធវាយតម្លៃការអានឮៗតាមដានផ្ទាល់</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight leading-snug">
            តាមដានសមត្ថភាពអានរបស់សិស្សយ៉ាងងាយស្រួល និងសុក្រឹត
          </h2>
          <p className="mt-2 text-[#6B7280] text-xs sm:text-sm leading-relaxed">
            ស្ដាប់សិស្សអានអត្ថបទឮៗ ចុចសម្គាល់ពាក្យខុស ឬរំលងដោយផ្ទាល់ គ្មានការរំខានសិស្សជាមួយ Projector View និងទទួលបានរបាយការណ៍វិភាគពាក្យភ្លាមៗ។
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onStartSession}
              className="ui-hero-primary px-5 py-3 rounded-xl bg-[#2F5BFF] hover:bg-[#254bdb] text-white font-semibold text-xs sm:text-sm shadow-sm shadow-[#2F5BFF]/30 transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              <PlayCircle className="w-4 h-4" />
              <span>ចាប់ផ្ដើមវគ្គអានថ្មីឥឡូវនេះ</span>
            </button>
            <button
              onClick={onNavigateToPassages}
              className="ui-hero-secondary px-4 py-3 rounded-xl bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              <FileText className="w-4 h-4 text-[#6B7280]" />
              <span>បញ្ចូលអត្ថបទថ្មី</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* 4 Stat Cards with Count-up animation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={item.action}
            className="ui-stat-card bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs cursor-pointer hover:border-[#2F5BFF]/40 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#F7F8FA] flex items-center justify-center border border-[#E5E7EB]">
                {item.icon}
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#2F5BFF] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-xs font-medium text-[#6B7280]">
              {item.label}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#111827] tabular-nums">
                <CountUpNumber end={item.numericValue} />
                {item.isPercentage ? '%' : ''}
              </span>
              <span className="text-xs text-[#9CA3AF]">
                {item.unit}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Sessions & Quick Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sessions (2 columns) */}
        <div className="ui-panel lg:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827]">
                បញ្ជីវគ្គអានចុងក្រោយ
              </h3>
            </div>
            <button
              onClick={onViewAllSessions}
              className="text-xs font-semibold text-[#2F5BFF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>មើលទាំងអស់</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentSessions.length === 0 ? (
            <div className="py-12 text-center text-[#9CA3AF]">
              <p className="text-xs sm:text-sm">មិនទាន់មានវគ្គអានណាមួយត្រូវបានបញ្ចប់នៅឡើយទេ</p>
              <button
                onClick={onStartSession}
                className="mt-3 px-4 py-2 text-xs font-semibold text-[#2F5BFF] bg-[#EAF0FF] rounded-xl hover:bg-[#dbe6ff] transition-colors cursor-pointer"
              >
                ចាប់ផ្ដើមវគ្គអានដំបូង
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => {
                const marksCount = session.marks?.length || 0;
                const wrongCount = session.marks?.filter((m) => m.markType === 'wrong').length || 0;
                const skippedCount = session.marks?.filter((m) => m.markType === 'skipped').length || 0;

                return (
                  <div
                    key={session.id}
                    onClick={() => onViewSessionDetail(session)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[#E5E7EB] hover:border-[#2F5BFF]/30 hover:bg-[#F9FAFB] transition-all cursor-pointer gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#EAF0FF] text-[#2F5BFF] font-bold flex items-center justify-center shrink-0 text-xs sm:text-sm">
                        {session.studentName?.charAt(0) || 'ស'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[#111827]">
                            {session.studentName}
                          </h4>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#4B5563] font-medium">
                            {session.className}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280] mt-0.5 truncate max-w-xs">
                          {session.passageTitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                      {/* Mark indicators */}
                      <div className="flex items-center gap-2">
                        {marksCount > 0 ? (
                          <>
                            {wrongCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#B91C1C] font-semibold text-[11px]">
                                ខុស {toKhmerDigits(wrongCount)}
                              </span>
                            )}
                            {skippedCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-[#FEF0D5] text-[#B45309] font-semibold text-[11px]">
                                រំលង {toKhmerDigits(skippedCount)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#16A34A] font-semibold text-[11px]">
                            គ្មានកំហុស
                          </span>
                        )}
                      </div>

                      {/* Manual Score */}
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-[#2F5BFF] tabular-nums">
                          {toKhmerDigits(session.score)}
                        </span>
                        <span className="text-[#9CA3AF]">/{toKhmerDigits(session.maxScore || 10)}</span>
                        <p className="text-[11px] text-[#9CA3AF]">
                          {formatKhmerDate(session.finishedAt || session.startedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Tips */}
        <div className="ui-panel bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5E7EB]">
              <div className="w-8 h-8 rounded-lg bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827]">
                ការណែនាំរហ័ស
              </h3>
            </div>
            <ul className="space-y-3.5 text-xs text-[#4B5563] leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  ១
                </span>
                <span>
                  <strong className="text-[#111827]">បញ្ចូលអត្ថបទដោយដៃ</strong> ក្នុងបណ្ណាល័យ ដើម្បីធានាអក្ខរាវិរុទ្ធត្រឹមត្រូវ។
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  ២
                </span>
                <span>
                  <strong className="text-[#111827]">កែសម្រួលការបំបែកពាក្យ (Merge/Split)</strong> មុនចាប់ផ្ដើមអាន ករណីចង់បញ្ចូលឬកាត់ពាក្យ។
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  ៣
                </span>
                <span>
                  <strong className="text-[#111827]">ចុច ១ ដង = ក្រហម (ខុស)</strong>, <strong className="text-[#111827]">ចុច ២ ដង = ទឹកក្រូច (រំលង)</strong>, <strong className="text-[#111827]">ចុច ៣ ដង = ធម្មតា</strong>។
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  ៤
                </span>
                <span>
                  <strong className="text-[#111827]">បើកផ្ទាំង Projector / Display View</strong> ដាក់លើក្តារខៀន ដោយមិនបង្ហាញពណ៌ក្រហមឲ្យសិស្សភ័យឡើយ។
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={onStartSession}
              className="w-full py-2.5 rounded-xl bg-[#EAF0FF] hover:bg-[#dbe6ff] text-[#2F5BFF] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <PlayCircle className="w-4 h-4" />
              <span>សាកល្បងវគ្គអានឥឡូវនេះ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
