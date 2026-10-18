import React, { useState } from 'react';
import {
  BarChart3,
  Filter,
  FileSpreadsheet,
  Printer,
  Lightbulb,
} from 'lucide-react';
import { WordFrequencyReport, Student, Passage } from '../types/index.ts';
import { exportToExcel, triggerPdfPrint } from '../lib/exportUtils.ts';
import { toKhmerDigits } from '../lib/khmerSegmentation.ts';

interface WordReportViewProps {
  reports: WordFrequencyReport[];
  students: Student[];
  passages: Passage[];
  onFilterChange: (filters: { className?: string; passageId?: string }) => void;
}

export const WordReportView: React.FC<WordReportViewProps> = ({
  reports,
  students,
  passages,
  onFilterChange,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedPassageId, setSelectedPassageId] = useState<string>('all');

  const distinctClasses = Array.from(new Set(students.map((s) => s.className))).filter(Boolean);

  const handleClassChange = (c: string) => {
    setSelectedClass(c);
    onFilterChange({ className: c, passageId: selectedPassageId });
  };

  const handlePassageChange = (p: string) => {
    setSelectedPassageId(p);
    onFilterChange({ className: selectedClass, passageId: p });
  };

  const handleExportExcel = () => {
    const exportData = reports.map((r, idx) => ({
      'ល.រ': idx + 1,
      'ពាក្យ': r.word,
      'ចំនួនខុស (ក្រហម)': r.wrongCount,
      'ចំនួនរំលង (ទឹកក្រូច)': r.skippedCount,
      'កំហុសសរុប': r.totalErrors,
      'ចំនួនសិស្សដែលជួបការលំបាក': r.affectedStudentCount,
      'ភាគរយសិស្ស (%)': `${r.studentPercentage}%`,
    }));
    exportToExcel(exportData, `របាយការណ៍ពាក្យដែលសិស្សអានខុស_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    triggerPdfPrint('របាយការណ៍វិភាគពាក្យដែលសិស្សអានខុសញឹកញាប់');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#2F5BFF]" />
            <span>របាយការណ៍ពាក្យដែលសិស្សច្រើនតែអានខុស</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            ជួយគ្រូស្គាល់ពាក្យពិបាកដែលសិស្សអានខុស ឬរំលងញឹកញាប់ ដើម្បីរៀបចំការបង្រៀនបន្ថែម
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

      {/* Filter strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs max-w-xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#9CA3AF] shrink-0" />
          <select
            value={selectedClass}
            onChange={(e) => handleClassChange(e.target.value)}
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

        <div>
          <select
            value={selectedPassageId}
            onChange={(e) => handlePassageChange(e.target.value)}
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

      {/* Insight banner */}
      <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#FEF0D5] text-[#D97706] flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div className="text-xs text-[#4B5563] leading-relaxed">
          <strong className="text-[#111827]">យុទ្ធសាស្ត្រគរុកោសល្យ៖</strong> ពាក្យដែលមានកំហុសសរុបខ្ពស់ខាងក្រោម ជាពាក្យដែលសិស្សជួបការលំបាកខ្លាំងជាងគេ (ភាគច្រើនជាពាក្យផ្សំ មានជើងអក្សរស្មុគស្មាញ ឬពាក្យបាលី-សំស្ក្រឹត)។ គ្រូអាចយកពាក្យទាំងនេះមកសរសេរលើក្តារខៀន និងហាត់ប្រកបជាមួយសិស្សទាំងមូល។
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
        {reports.length === 0 ? (
          <div className="py-16 text-center text-[#9CA3AF]">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#2F5BFF]" />
            <p className="text-sm font-medium text-[#6B7280]">មិនទាន់មានទិន្នន័យពាក្យខុស ឬរំលងនៅឡើយទេ</p>
            <p className="text-xs text-[#9CA3AF] mt-1">
              នៅពេលគ្រូចុចលើពាក្យខុសក្នុងវគ្គអាន ទិន្នន័យនឹងត្រូវវិភាគដោយស្វ័យប្រវត្តិនៅទីនេះ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB] text-[#4B5563] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-14 text-center">ល.រ</th>
                  <th className="py-3.5 px-4">ពាក្យដែលខុសញឹកញាប់</th>
                  <th className="py-3.5 px-4 text-center">អានខុស (ក្រហម)</th>
                  <th className="py-3.5 px-4 text-center">រំលង (ទឹកក្រូច)</th>
                  <th className="py-3.5 px-4 text-center font-extrabold text-[#B91C1C]">
                    កំហុសសរុប
                  </th>
                  <th className="py-3.5 px-4 text-center">ចំនួនសិស្សដែលខុស</th>
                  <th className="py-3.5 px-4 text-right">ភាគរយសិស្ស</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {reports.map((r, idx) => (
                  <tr
                    key={r.word}
                    className="hover:bg-[#F9FAFB] transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-semibold text-[#6B7280] tabular-nums">
                      {toKhmerDigits(idx + 1)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-sm text-[#111827] px-2.5 py-1 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB]">
                        {r.word}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#B91C1C] font-bold tabular-nums">
                      {toKhmerDigits(r.wrongCount)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#B45309] font-bold tabular-nums">
                      {toKhmerDigits(r.skippedCount)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-[#B91C1C] tabular-nums text-sm">
                      {toKhmerDigits(r.totalErrors)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#374151] tabular-nums">
                      {toKhmerDigits(r.affectedStudentCount)} នាក់
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 rounded-full bg-[#E5E7EB] overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-[#2F5BFF] rounded-full"
                            style={{ width: `${Math.min(100, r.studentPercentage)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[#111827] tabular-nums">
                          {toKhmerDigits(r.studentPercentage)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
