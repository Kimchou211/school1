import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  TrendingUp,
  Filter,
  FileSpreadsheet,
  Printer,
  Sparkles,
} from 'lucide-react';
import { StudentRanking, ReadingSession, Student } from '../types/index.ts';
import { exportToExcel, triggerPdfPrint } from '../lib/exportUtils.ts';
import { toKhmerDigits, formatKhmerDate } from '../lib/khmerSegmentation.ts';

interface RankingsViewProps {
  rankings: StudentRanking[];
  sessions: ReadingSession[];
  students: Student[];
}

export const RankingsView: React.FC<RankingsViewProps> = ({
  rankings,
  sessions,
  students,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [chartStudentId, setChartStudentId] = useState<string>(rankings[0]?.studentId || '');

  const distinctClasses = Array.from(new Set(students.map((s) => s.className))).filter(Boolean);

  const filteredRankings = rankings.filter((r) => {
    if (selectedClass !== 'all' && r.className !== selectedClass) return false;
    return true;
  });

  const top1 = filteredRankings[0];
  const top2 = filteredRankings[1];
  const top3 = filteredRankings[2];

  // Sessions for score progress chart of selected student
  const chartStudent = students.find((s) => s.id === (chartStudentId || filteredRankings[0]?.studentId));
  const studentSessions = sessions
    .filter((s) => s.studentId === chartStudent?.id && s.status === 'completed' && s.score !== null)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  const handleExportExcel = () => {
    const exportData = filteredRankings.map((r, idx) => ({
      'ចំណាត់ថ្នាក់': idx + 1,
      'ឈ្មោះសិស្ស': r.studentName,
      'ថ្នាក់': r.className,
      'ភេទ': r.gender,
      'ចំនួនវគ្គអាន': r.totalSessions,
      'ពិន្ទុមធ្យម': r.averageScore,
      'ភាគរយមធ្យម': `${r.averageScorePercentage}%`,
    }));
    exportToExcel(exportData, `ចំណាត់ថ្នាក់សមត្ថភាពសិស្ស_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    triggerPdfPrint('ចំណាត់ថ្នាក់សមត្ថភាពសិស្ស');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#D97706]" />
            <span>ការវាស់ស្ទង់សមត្ថភាពសិស្ស (Student Rankings)</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            ចំណាត់ថ្នាក់គណនាផ្អែកលើពិន្ទុដែលគ្រូបានផ្ដល់ដោយដៃផ្ទាល់ប៉ុណ្ណោះ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white text-[#111827] hover:bg-[#F9FAFB] border border-[#E5E7EB] shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white text-[#111827] hover:bg-[#F9FAFB] border border-[#E5E7EB] shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <Printer className="w-4 h-4 text-[#6B7280]" />
            <span>Export PDF / បោះពុម្ព</span>
          </button>
        </div>
      </div>

      {/* Class filter */}
      <div className="flex items-center gap-2 bg-white p-3.5 rounded-2xl border border-[#E5E7EB] w-full sm:w-72 shadow-xs">
        <Filter className="w-4 h-4 text-[#9CA3AF] shrink-0" />
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full py-1 text-xs rounded-lg bg-transparent text-[#111827] focus:outline-none cursor-pointer"
        >
          <option value="all">ថ្នាក់ទាំងអស់</option>
          {distinctClasses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Top 3 Podium Cards */}
      {filteredRankings.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#D97706] bg-[#FEF0D5] px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>សិស្សឆ្នើមទាំង ៣ រូប (Top 3 Performers)</span>
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-[#111827] mt-2">
              វេទិកាកិត្តិយសសមត្ថភាពការអាន
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto items-end pt-2">
            {/* Rank 2 (Silver) */}
            {top2 ? (
              <div className="order-2 md:order-1 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-[#F3F4F6] text-[#4B5563] flex items-center justify-center font-bold text-xl border border-[#E5E7EB] mb-3 relative shadow-xs">
                  <Medal className="w-8 h-8 text-[#4B5563]" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#4B5563] text-white text-xs flex items-center justify-center font-bold shadow-xs">
                    ២
                  </span>
                </div>
                <h4 className="font-bold text-[#111827] text-sm">
                  {top2.studentName}
                </h4>
                <p className="text-xs text-[#6B7280] mt-0.5">{top2.className}</p>
                <div className="mt-3 p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] w-full text-center">
                  <span className="text-lg font-black text-[#111827] tabular-nums">
                    {top2.averageScorePercentage}%
                  </span>
                  <p className="text-[11px] text-[#6B7280]">
                    អាន {toKhmerDigits(top2.totalSessions)} លើក
                  </p>
                </div>
              </div>
            ) : <div className="order-2 md:order-1" />}

            {/* Rank 1 (Gold) */}
            {top1 ? (
              <div className="order-1 md:order-2 flex flex-col items-center md:-translate-y-3">
                <div className="w-20 h-20 rounded-2xl bg-[#FEF0D5] text-[#D97706] flex items-center justify-center font-bold text-2xl border border-[#FDE68A] mb-3 relative shadow-xs">
                  <Trophy className="w-10 h-10 text-[#D97706]" />
                  <span className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-[#D97706] text-white text-xs flex items-center justify-center font-extrabold shadow-xs">
                    ១
                  </span>
                </div>
                <h4 className="font-extrabold text-[#111827] text-base">
                  {top1.studentName}
                </h4>
                <p className="text-xs font-semibold text-[#D97706] mt-0.5">{top1.className}</p>
                <div className="mt-3 p-4 rounded-xl bg-[#FEF0D5]/50 border border-[#FDE68A] w-full text-center">
                  <span className="text-2xl font-black text-[#D97706] tabular-nums">
                    {top1.averageScorePercentage}%
                  </span>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    ពិន្ទុមធ្យម {toKhmerDigits(top1.averageScore)}/{toKhmerDigits(top1.averageMaxScore)} ({toKhmerDigits(top1.totalSessions)} លើក)
                  </p>
                </div>
              </div>
            ) : <div className="order-1 md:order-2" />}

            {/* Rank 3 (Bronze) */}
            {top3 ? (
              <div className="order-3 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-[#FFEDD5] text-[#B45309] flex items-center justify-center font-bold text-xl border border-[#FED7AA] mb-3 relative shadow-xs">
                  <Medal className="w-8 h-8 text-[#B45309]" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#B45309] text-white text-xs flex items-center justify-center font-bold shadow-xs">
                    ៣
                  </span>
                </div>
                <h4 className="font-bold text-[#111827] text-sm">
                  {top3.studentName}
                </h4>
                <p className="text-xs text-[#6B7280] mt-0.5">{top3.className}</p>
                <div className="mt-3 p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] w-full text-center">
                  <span className="text-lg font-black text-[#111827] tabular-nums">
                    {top3.averageScorePercentage}%
                  </span>
                  <p className="text-[11px] text-[#6B7280]">
                    អាន {toKhmerDigits(top3.totalSessions)} លើក
                  </p>
                </div>
              </div>
            ) : <div className="order-3" />}
          </div>
        </div>
      )}

      {/* Progress Chart & Rankings Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Full Rankings Table (2 Columns) */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB]">
            <h4 className="font-bold text-sm text-[#111827]">
              តារាងចំណាត់ថ្នាក់សិស្សទាំងអស់
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F8FA] text-[#4B5563] font-bold uppercase tracking-wider border-b border-[#E5E7EB]">
                <tr>
                  <th className="py-3.5 px-4 w-14 text-center">លេខ</th>
                  <th className="py-3.5 px-4">ឈ្មោះសិស្ស</th>
                  <th className="py-3.5 px-4">ថ្នាក់</th>
                  <th className="py-3.5 px-4 text-center">វគ្គអាន</th>
                  <th className="py-3.5 px-4 text-center">ពិន្ទុមធ្យម</th>
                  <th className="py-3.5 px-4 text-right">ភាគរយ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredRankings.map((r, idx) => (
                  <tr
                    key={r.studentId}
                    onClick={() => setChartStudentId(r.studentId)}
                    className={`hover:bg-[#F9FAFB] transition-colors cursor-pointer ${
                      chartStudentId === r.studentId ? 'bg-[#EAF0FF]/50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-bold text-[#6B7280] tabular-nums">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : toKhmerDigits(idx + 1)}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#111827]">
                      {r.studentName}
                    </td>
                    <td className="py-3 px-4 text-[#4B5563]">{r.className}</td>
                    <td className="py-3 px-4 text-center tabular-nums text-[#4B5563]">
                      {toKhmerDigits(r.totalSessions)}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-[#111827] tabular-nums">
                      {toKhmerDigits(r.averageScore)}/{toKhmerDigits(r.averageMaxScore)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-extrabold text-[#2F5BFF] tabular-nums">
                        {r.averageScorePercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Progress Chart for Selected Student */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#E5E7EB]">
              <div className="w-8 h-8 rounded-lg bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-[#111827]">
                វឌ្ឍនភាពពិន្ទុតាមពេលវេលា
              </h4>
            </div>

            {chartStudent && (
              <p className="text-xs text-[#6B7280] mb-4">
                សិស្ស៖ <strong className="text-[#111827]">{chartStudent.name}</strong> ({chartStudent.className})
              </p>
            )}

            {studentSessions.length === 0 ? (
              <div className="py-12 text-center text-[#9CA3AF] text-xs">
                សិស្សនេះមិនទាន់មានទិន្នន័យវគ្គអាននៅឡើយទេ
              </div>
            ) : (
              <div className="space-y-4">
                {/* Clean Bar Progress Chart */}
                <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-[#E5E7EB]">
                  {studentSessions.map((s, idx) => {
                    const pct = Math.round(((s.score || 0) / (s.maxScore || 10)) * 100);
                    return (
                      <div key={s.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <span className="text-[10px] font-bold text-[#2F5BFF] opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                          {pct}%
                        </span>
                        <div
                          className="w-full bg-[#2F5BFF] hover:bg-[#254bdb] rounded-t-lg transition-all min-h-[8px]"
                          style={{ height: `${Math.max(8, pct * 1.2)}px` }}
                        />
                        <span className="text-[10px] text-[#9CA3AF] tabular-nums">
                          វគ្គ{toKhmerDigits(idx + 1)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Score Log Details */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {studentSessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-xs flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-[#111827] line-clamp-1">
                          {s.passageTitle}
                        </p>
                        <p className="text-[11px] text-[#9CA3AF]">
                          {formatKhmerDate(s.finishedAt || s.startedAt)}
                        </p>
                      </div>
                      <span className="font-bold text-[#2F5BFF] tabular-nums">
                        {toKhmerDigits(s.score)}/{toKhmerDigits(s.maxScore || 10)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
