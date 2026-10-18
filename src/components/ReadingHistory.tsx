import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  Eye,
  X,
} from 'lucide-react';
import { ReadingSession, Student, Passage } from '../types/index.ts';
import { exportToExcel, triggerPdfPrint } from '../lib/exportUtils.ts';
import { formatKhmerDate, toKhmerDigits } from '../lib/khmerSegmentation.ts';

interface ReadingHistoryProps {
  sessions: ReadingSession[];
  students: Student[];
  passages: Passage[];
  onOpenSessionModal?: (session: ReadingSession) => void;
}

export const ReadingHistory: React.FC<ReadingHistoryProps> = ({
  sessions,
  students,
  passages,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedPassageId, setSelectedPassageId] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [detailSession, setDetailSession] = useState<ReadingSession | null>(null);

  const distinctClasses = Array.from(new Set(students.map((s) => s.className))).filter(Boolean);

  const completedSessions = sessions.filter((s) => s.status === 'completed');

  const filteredSessions = completedSessions.filter((s) => {
    if (selectedClass !== 'all' && s.className !== selectedClass) return false;
    if (selectedStudentId !== 'all' && s.studentId !== selectedStudentId) return false;
    if (selectedPassageId !== 'all' && s.passageId !== selectedPassageId) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase().trim();
      const matchName = s.studentName?.toLowerCase().includes(q);
      const matchPassage = s.passageTitle?.toLowerCase().includes(q);
      return matchName || matchPassage;
    }
    return true;
  });

  const handleExportExcel = () => {
    const exportData = filteredSessions.map((s, idx) => ({
      'លេខរៀង': idx + 1,
      'ថ្នាក់': s.className || '',
      'ឈ្មោះសិស្ស': s.studentName || '',
      'អាយុ': s.studentAge || '',
      'ភេទ': s.studentGender || '',
      'ចំណងជើងអត្ថបទដែលបានអាន': s.passageTitle || '',
      'ពិន្ទុ': s.score ?? '',
      'ពិន្ទុពេញ': s.maxScore || 10,
      'ភាគរយ': s.score !== null ? `${Math.round(((s.score || 0) / (s.maxScore || 10)) * 100)}%` : '',
      'កាលបរិច្ឆេទ': formatKhmerDate(s.finishedAt || s.startedAt),
      'មតិយោបល់': s.comment || '',
    }));
    exportToExcel(exportData, `ប្រវត្តិការអានរបស់សិស្ស_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    triggerPdfPrint('ប្រវត្តិការអានរបស់សិស្ស');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] flex items-center gap-2">
            <History className="w-6 h-6 text-[#2F5BFF]" />
            <span>ប្រវត្តិការអានរបស់សិស្ស</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            ពិនិត្យមើលលទ្ធផលវគ្គអាននីមួយៗ និងផ្ទៀងផ្ទាត់ពាក្យដែលសិស្សបានអានខុស ឬរំលង
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

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="ស្វែងរកតាមឈ្មោះ ឬអត្ថបទ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
          />
        </div>

        {/* Filter by class */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#9CA3AF] shrink-0" />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full py-2.5 px-3 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all cursor-pointer"
          >
            <option value="all">ថ្នាក់ទាំងអស់</option>
            {distinctClasses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by student */}
        <div>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full py-2.5 px-3 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all cursor-pointer"
          >
            <option value="all">សិស្សទាំងអស់</option>
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.className})
              </option>
            ))}
          </select>
        </div>

        {/* Filter by passage */}
        <div>
          <select
            value={selectedPassageId}
            onChange={(e) => setSelectedPassageId(e.target.value)}
            className="w-full py-2.5 px-3 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all cursor-pointer"
          >
            <option value="all">អត្ថបទទាំងអស់</option>
            {passages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
        {filteredSessions.length === 0 ? (
          <div className="py-16 text-center text-[#9CA3AF]">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#2F5BFF]" />
            <p className="text-sm font-medium text-[#6B7280]">មិនមានប្រវត្តិវគ្គអានត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB] text-[#4B5563] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-14 text-center">លេខរៀង</th>
                  <th className="py-3.5 px-4">ថ្នាក់</th>
                  <th className="py-3.5 px-4">ឈ្មោះសិស្ស</th>
                  <th className="py-3.5 px-4 text-center">អាយុ</th>
                  <th className="py-3.5 px-4 text-center">ភេទ</th>
                  <th className="py-3.5 px-4">ចំណងជើងអត្ថបទដែលសិស្សបានអាន</th>
                  <th className="py-3.5 px-4 text-center">ពិន្ទុសរុប</th>
                  <th className="py-3.5 px-4">កាលបរិច្ឆេទ</th>
                  <th className="py-3.5 px-4 text-right no-print">លម្អិត</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredSessions.map((s, idx) => (
                  <tr
                    key={s.id}
                    onClick={() => setDetailSession(s)}
                    className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 text-center font-semibold text-[#6B7280] tabular-nums">
                      {toKhmerDigits(idx + 1)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#374151]">
                      {s.className}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#111827]">
                      {s.studentName}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#4B5563] tabular-nums">
                      {toKhmerDigits(s.studentAge)} ឆ្នាំ
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                          s.studentGender === 'ស្រី'
                            ? 'bg-[#FCE7F3] text-[#9D174D]'
                            : 'bg-[#E0F2FE] text-[#0369A1]'
                        }`}
                      >
                        {s.studentGender}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#2F5BFF]">
                      {s.passageTitle}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-sm text-[#111827] tabular-nums">
                        {toKhmerDigits(s.score)}
                      </span>
                      <span className="text-[#9CA3AF]">/{toKhmerDigits(s.maxScore || 10)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#6B7280]">
                      {formatKhmerDate(s.finishedAt || s.startedAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right no-print">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailSession(s);
                        }}
                        className="p-2 text-[#6B7280] hover:text-[#2F5BFF] rounded-lg hover:bg-[#EAF0FF] transition-colors cursor-pointer"
                        title="មើលការសម្គាល់ពាក្យ និងមតិយោបល់"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session Detail Modal */}
      {detailSession && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <span className="text-xs font-bold text-[#2F5BFF]">
                  ព័ត៌មានលម្អិតវគ្គអាន
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#111827] mt-0.5">
                  សិស្ស៖ {detailSession.studentName} ({detailSession.className})
                </h3>
              </div>
              <button
                onClick={() => setDetailSession(null)}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score & Summary strip */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-center">
              <div>
                <p className="text-xs text-[#6B7280]">ពិន្ទុដែលគ្រូផ្ដល់</p>
                <p className="text-xl font-black text-[#2F5BFF] tabular-nums">
                  {toKhmerDigits(detailSession.score)} <span className="text-xs font-normal text-[#9CA3AF]">/{toKhmerDigits(detailSession.maxScore || 10)}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-[#B91C1C]">ពាក្យអានខុស</p>
                <p className="text-xl font-black text-[#B91C1C] tabular-nums">
                  {toKhmerDigits(detailSession.marks?.filter((m) => m.markType === 'wrong').length || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#B45309]">ពាក្យរំលង</p>
                <p className="text-xl font-black text-[#B45309] tabular-nums">
                  {toKhmerDigits(detailSession.marks?.filter((m) => m.markType === 'skipped').length || 0)}
                </p>
              </div>
            </div>

            {/* Marked Passage Content */}
            <div>
              <h4 className="text-xs font-bold text-[#374151] mb-2">
                អត្ថបទ៖ «{detailSession.passageTitle}» (បង្ហាញពណ៌តាមការចុចរបស់គ្រូ)
              </h4>
              <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-sm sm:text-base leading-loose flex flex-wrap gap-1.5 items-center">
                {detailSession.words && detailSession.words.length > 0 ? (
                  detailSession.words.map((word, idx) => {
                    const mark = detailSession.marks?.find((m) => m.wordIndex === idx);
                    let badgeClass = 'text-[#111827]';
                    if (mark?.markType === 'wrong') {
                      badgeClass = 'bg-[#FEE2E2] text-[#B91C1C] font-bold px-2 py-0.5 rounded-lg border border-[#FECACA]';
                    } else if (mark?.markType === 'skipped') {
                      badgeClass = 'bg-[#FEF0D5] text-[#B45309] font-bold px-2 py-0.5 rounded-lg border border-[#FDE68A]';
                    }
                    return (
                      <span key={idx} className={badgeClass}>
                        {word}
                      </span>
                    );
                  })
                ) : (
                  <span>{detailSession.passageContent}</span>
                )}
              </div>
            </div>

            {/* Teacher comment */}
            {detailSession.comment && (
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB]">
                <h5 className="text-xs font-bold text-[#374151] mb-1">
                  មតិយោបល់របស់គ្រូ៖
                </h5>
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  {detailSession.comment}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-[#E5E7EB]">
              <span className="text-xs text-[#9CA3AF]">
                កាលបរិច្ឆេទ៖ {formatKhmerDate(detailSession.finishedAt || detailSession.startedAt)}
              </span>
              <button
                onClick={() => setDetailSession(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#111827] hover:bg-[#1f2937] cursor-pointer min-h-[40px]"
              >
                បិទផ្ទាំង
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
