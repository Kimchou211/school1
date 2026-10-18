import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  User,
} from 'lucide-react';
import { Student, Gender } from '../types/index.ts';
import { exportToExcel, triggerPdfPrint } from '../lib/exportUtils.ts';
import { toKhmerDigits } from '../lib/khmerSegmentation.ts';

interface StudentListProps {
  students: Student[];
  onAddStudent: (data: Omit<Student, 'id' | 'teacherId' | 'createdAt'>) => Promise<void>;
  onUpdateStudent: (id: string, data: Partial<Omit<Student, 'id' | 'teacherId' | 'createdAt'>>) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
}) => {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Form states
  const [orderNo, setOrderNo] = useState<number>(1);
  const [className, setClassName] = useState('ថ្នាក់ទី ៤ក');
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(9);
  const [gender, setGender] = useState<Gender>('ប្រុស');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Distinct classes for filter
  const distinctClasses = Array.from(new Set(students.map((s) => s.className))).filter(Boolean);

  // Filter students
  const filteredStudents = students.filter((s) => {
    if (selectedClass !== 'all' && s.className !== selectedClass) return false;
    if (selectedGender !== 'all' && s.gender !== selectedGender) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase().trim();
      return s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q);
    }
    return true;
  });

  const openAddModal = () => {
    setEditingStudent(null);
    setOrderNo(students.length + 1);
    setClassName(distinctClasses[0] || 'ថ្នាក់ទី ៤ក');
    setName('');
    setAge(9);
    setGender('ប្រុស');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (std: Student) => {
    setEditingStudent(std);
    setOrderNo(std.orderNo);
    setClassName(std.className);
    setName(std.name);
    setAge(std.age);
    setGender(std.gender);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('សូមបញ្ចូលឈ្មោះសិស្ស');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingStudent) {
        await onUpdateStudent(editingStudent.id, {
          orderNo: Number(orderNo),
          className,
          name: name.trim(),
          age: Number(age),
          gender,
        });
      } else {
        await onAddStudent({
          orderNo: Number(orderNo),
          className,
          name: name.trim(),
          age: Number(age),
          gender,
        });
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError((err as Error).message || 'មានបញ្ហាក្នុងការរក្សាទុក');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStudent) return;
    try {
      await onDeleteStudent(deletingStudent.id);
      setDeletingStudent(null);
    } catch {
      alert('មិនអាចលុបសិស្សបានទេ');
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredStudents.map((s) => ({
      'លេខរៀង': s.orderNo,
      'ថ្នាក់': s.className,
      'ឈ្មោះសិស្ស': s.name,
      'អាយុ': s.age,
      'ភេទ': s.gender,
    }));
    exportToExcel(exportData, `បញ្ជីសិស្ស_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    triggerPdfPrint('បញ្ជីឈ្មោះសិស្ស');
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#2F5BFF]" />
            <span>បញ្ជីសិស្ស</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            គ្រប់គ្រងព័ត៌មានសិស្សតាមថ្នាក់ និងមើលព័ត៌មានលម្អិត
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
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#254bdb] shadow-xs shadow-[#2F5BFF]/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span>បន្ថែមសិស្សថ្មី</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="ស្វែងរកតាមឈ្មោះសិស្ស..."
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
            <option value="all">ថ្នាក់ទាំងអស់ ({students.length})</option>
            {distinctClasses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by gender */}
        <div>
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="w-full py-2.5 px-3 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all cursor-pointer"
          >
            <option value="all">ភេទទាំងអស់</option>
            <option value="ប្រុស">ប្រុស</option>
            <option value="ស្រី">ស្រី</option>
          </select>
        </div>
      </div>

      {/* Students Table & Mobile Card List */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-[#9CA3AF]">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#2F5BFF]" />
            <p className="text-sm font-medium text-[#6B7280]">រកមិនឃើញទិន្នន័យសិស្សទេ</p>
            <p className="text-xs text-[#9CA3AF] mt-1">សូមសាកល្បងផ្លាស់ប្ដូរពាក្យស្វែងរក ឬបន្ថែមសិស្សថ្មី</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB] text-[#4B5563] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-16 text-center">លេខរៀង</th>
                    <th className="py-3.5 px-4">ថ្នាក់</th>
                    <th className="py-3.5 px-4">ឈ្មោះសិស្ស</th>
                    <th className="py-3.5 px-4 text-center">អាយុ</th>
                    <th className="py-3.5 px-4 text-center">ភេទ</th>
                    <th className="py-3.5 px-4 text-right no-print">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredStudents.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-[#F9FAFB] transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center font-semibold text-[#6B7280] tabular-nums">
                        {toKhmerDigits(s.orderNo)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#374151]">
                        {s.className}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#111827]">
                        {s.name}
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#4B5563] tabular-nums">
                        {toKhmerDigits(s.age)} ឆ្នាំ
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                            s.gender === 'ស្រី'
                              ? 'bg-[#FCE7F3] text-[#9D174D]'
                              : 'bg-[#E0F2FE] text-[#0369A1]'
                          }`}
                        >
                          {s.gender}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right no-print">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-2 text-[#6B7280] hover:text-[#2F5BFF] rounded-lg hover:bg-[#EAF0FF] transition-colors cursor-pointer"
                            title="កែសម្រួល"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingStudent(s)}
                            className="p-2 text-[#6B7280] hover:text-[#B91C1C] rounded-lg hover:bg-[#FEE2E2]/60 transition-colors cursor-pointer"
                            title="លុប"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< 640px) */}
            <div className="sm:hidden divide-y divide-[#E5E7EB]">
              {filteredStudents.map((s) => (
                <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF0FF] text-[#2F5BFF] font-bold text-xs flex items-center justify-center shrink-0 tabular-nums">
                      {toKhmerDigits(s.orderNo)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#111827]">
                        {s.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#6B7280]">
                        <span>{s.className}</span>
                        <span>·</span>
                        <span>{toKhmerDigits(s.age)} ឆ្នាំ</span>
                        <span>·</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            s.gender === 'ស្រី'
                              ? 'bg-[#FCE7F3] text-[#9D174D]'
                              : 'bg-[#E0F2FE] text-[#0369A1]'
                          }`}
                        >
                          {s.gender}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-2.5 text-[#6B7280] hover:text-[#2F5BFF] rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingStudent(s)}
                      className="p-2.5 text-[#6B7280] hover:text-[#B91C1C] rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-base sm:text-lg font-bold text-[#111827] flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span>{editingStudent ? 'កែសម្រួលព័ត៌មានសិស្ស' : 'បន្ថែមសិស្សថ្មី'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    លេខរៀង (Order No)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={orderNo}
                    onChange={(e) => setOrderNo(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    ថ្នាក់ (Class)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ឧ. ថ្នាក់ទី ៤ក"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  ឈ្មោះសិស្ស
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. ចាន់ សុខា"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    អាយុ (ឆ្នាំ)
                  </label>
                  <input
                    type="number"
                    min={4}
                    max={25}
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    ភេទ
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all cursor-pointer"
                  >
                    <option value="ប្រុស">ប្រុស</option>
                    <option value="ស្រី">ស្រី</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors cursor-pointer min-h-[44px]"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#254bdb] shadow-xs disabled:opacity-50 transition-colors cursor-pointer min-h-[44px]"
                >
                  {submitting ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#111827]">
              តើអ្នកប្រាកដជាចង់លុបសិស្សនេះ?
            </h3>
            <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">
              ការលុបឈ្មោះ <strong>«{deletingStudent.name}»</strong> នឹងលុបទិន្នន័យប្រវត្តិវគ្គអានរបស់សិស្សនេះទាំងអស់ផងដែរ។
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#4B5563] bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors cursor-pointer min-h-[44px]"
              >
                ទេ, មិនលុបទេ
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991b1b] shadow-xs transition-colors cursor-pointer min-h-[44px]"
              >
                យល់ព្រមលុប
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
