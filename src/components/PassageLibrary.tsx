import React, { useState } from 'react';
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  PlayCircle,
} from 'lucide-react';
import { Passage, PassageLevel } from '../types/index.ts';
import { segmentKhmerText, formatKhmerDate, toKhmerDigits } from '../lib/khmerSegmentation.ts';

interface PassageLibraryProps {
  passages: Passage[];
  onAddPassage: (data: Omit<Passage, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdatePassage: (id: string, data: Partial<Omit<Passage, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  onDeletePassage: (id: string) => Promise<void>;
  onStartSessionWithPassage: (passageId: string) => void;
}

export const PassageLibrary: React.FC<PassageLibraryProps> = ({
  passages,
  onAddPassage,
  onUpdatePassage,
  onDeletePassage,
  onStartSessionWithPassage,
}) => {
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPassage, setEditingPassage] = useState<Passage | null>(null);
  const [previewPassage, setPreviewPassage] = useState<Passage | null>(null);
  const [deletingPassage, setDeletingPassage] = useState<Passage | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');
  const [level, setLevel] = useState<PassageLevel>('មធ្យម');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredPassages = passages.filter((p) => {
    if (selectedLevel !== 'all' && p.level !== selectedLevel) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase().trim();
      return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
    }
    return true;
  });

  const openAddModal = () => {
    setEditingPassage(null);
    setTitle('');
    setContent('');
    setNote('');
    setLevel('មធ្យម');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (p: Passage) => {
    setEditingPassage(p);
    setTitle(p.title);
    setContent(p.content);
    setNote(p.note || '');
    setLevel(p.level);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setFormError('សូមបញ្ចូលចំណងជើង និងខ្លឹមសារអត្ថបទ');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingPassage) {
        await onUpdatePassage(editingPassage.id, {
          title: title.trim(),
          content: content.trim(),
          note: note.trim(),
          level,
        });
      } else {
        await onAddPassage({
          title: title.trim(),
          content: content.trim(),
          note: note.trim(),
          level,
        });
      }
      setIsFormOpen(false);
    } catch (err: unknown) {
      setFormError((err as Error).message || 'មានបញ្ហាក្នុងការរក្សាទុក');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPassage) return;
    try {
      await onDeletePassage(deletingPassage.id);
      setDeletingPassage(null);
    } catch {
      alert('មិនអាចលុបអត្ថបទបានទេ');
    }
  };

  // Word count helper for manual input
  const previewWords = content ? segmentKhmerText(content).filter((s) => s.isWord) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#2F5BFF]" />
            <span>បណ្ណាល័យអត្ថបទអាន</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            គ្រូបញ្ចូលអត្ថបទដោយដៃផ្ទាល់ (វាយ ឬ Paste) ដើម្បីធានាអក្ខរាវិរុទ្ធខ្មែរត្រឹមត្រូវ
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#254bdb] shadow-xs shadow-[#2F5BFF]/30 transition-all flex items-center gap-1.5 self-start sm:self-auto active:scale-95 cursor-pointer min-h-[44px]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>បញ្ចូលអត្ថបទថ្មីដោយដៃ</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="ស្វែងរកតាមចំណងជើង ឬខ្លឹមសារ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#9CA3AF] shrink-0" />
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full py-2.5 px-3 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all cursor-pointer"
          >
            <option value="all">គ្រប់កម្រិតទាំងអស់ ({passages.length})</option>
            <option value="ស្រួល">កម្រិត ស្រួល</option>
            <option value="មធ្យម">កម្រិត មធ្យម</option>
            <option value="ពិបាក">កម្រិត ពិបាក</option>
          </select>
        </div>
      </div>

      {/* Passages Grid */}
      {filteredPassages.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl py-16 text-center text-[#9CA3AF]">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#2F5BFF]" />
          <p className="text-sm font-medium text-[#6B7280]">មិនមានអត្ថបទត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ</p>
          <button
            onClick={openAddModal}
            className="mt-3 px-4 py-2 text-xs font-semibold text-[#2F5BFF] bg-[#EAF0FF] rounded-xl hover:bg-[#dbe6ff] transition-colors cursor-pointer"
          >
            បញ្ចូលអត្ថបទដំបូងរបស់អ្នក
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPassages.map((p) => {
            const wordList = segmentKhmerText(p.content).filter((s) => s.isWord);
            return (
              <div
                key={p.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#2F5BFF]/40 hover:shadow-sm transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                        p.level === 'ស្រួល'
                          ? 'bg-[#DCFCE7] text-[#16A34A]'
                          : p.level === 'មធ្យម'
                          ? 'bg-[#FEF0D5] text-[#B45309]'
                          : 'bg-[#FEE2E2] text-[#B91C1C]'
                      }`}
                    >
                      កម្រិត{p.level}
                    </span>
                    <span className="text-[11px] text-[#9CA3AF]">
                      {toKhmerDigits(wordList.length)} ពាក្យ
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#111827] line-clamp-1 group-hover:text-[#2F5BFF] transition-colors">
                    {p.title}
                  </h3>

                  <p className="text-xs text-[#6B7280] mt-2 line-clamp-3 leading-relaxed">
                    {p.content}
                  </p>

                  {p.note && (
                    <div className="mt-3 p-2.5 rounded-xl bg-[#F7F8FA] text-[11px] text-[#4B5563] border border-[#E5E7EB] line-clamp-2">
                      <span className="font-semibold text-[#111827]">កំណត់ចំណាំ៖ </span>
                      {p.note}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                  <span className="text-[11px] text-[#9CA3AF]">
                    {formatKhmerDate(p.createdAt)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewPassage(p)}
                      title="មើលជាមុន"
                      className="p-2 text-[#6B7280] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(p)}
                      title="កែសម្រួល"
                      className="p-2 text-[#6B7280] hover:text-[#2F5BFF] rounded-lg hover:bg-[#EAF0FF] transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingPassage(p)}
                      title="លុប"
                      className="p-2 text-[#6B7280] hover:text-[#B91C1C] rounded-lg hover:bg-[#FEE2E2]/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onStartSessionWithPassage(p.id)}
                      title="ចាប់ផ្ដើមអានជាមួយអត្ថបទនេះ"
                      className="ml-1 px-3 py-1.5 rounded-xl bg-[#EAF0FF] text-[#2F5BFF] hover:bg-[#dbe6ff] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer min-h-[36px]"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>អាន</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Passage Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-base sm:text-lg font-bold text-[#111827] flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span>{editingPassage ? 'កែសម្រួលអត្ថបទ' : 'បញ្ចូលអត្ថបទអានថ្មីដោយដៃ'}</span>
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    ចំណងជើងអត្ថបទ
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ឧ. សារៈសំខាន់នៃការអានសៀវភៅ"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    កម្រិតពិបាក
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as PassageLevel)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all cursor-pointer"
                  >
                    <option value="ស្រួល">ស្រួល</option>
                    <option value="មធ្យម">មធ្យម</option>
                    <option value="ពិបាក">ពិបាក</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#374151]">
                    ខ្លឹមសារអត្ថបទ (វាយ ឬ Paste អក្សរខ្មែរនៅទីនេះ)
                  </label>
                  <span className="text-xs text-[#9CA3AF]">
                    {toKhmerDigits(previewWords.length)} ពាក្យ
                  </span>
                </div>
                <textarea
                  required
                  rows={6}
                  placeholder="វាយ ឬ Paste អត្ថបទខ្មែរពេញលេញនៅទីនេះ..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all leading-relaxed font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  កំណត់ចំណាំ (Note សម្រាប់គ្រូ - ជាជម្រើស)
                </label>
                <input
                  type="text"
                  placeholder="ឧ. អត្ថបទសម្រាប់វាស់ស្ទង់ការបញ្ចេញសំឡេងព្យញ្ជនៈ និងស្រៈ..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors cursor-pointer min-h-[44px]"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#254bdb] shadow-xs disabled:opacity-50 transition-colors cursor-pointer min-h-[44px]"
                >
                  {submitting ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកអត្ថបទ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewPassage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] mb-4">
              <div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    previewPassage.level === 'ស្រួល'
                      ? 'bg-[#DCFCE7] text-[#16A34A]'
                      : previewPassage.level === 'មធ្យម'
                      ? 'bg-[#FEF0D5] text-[#B45309]'
                      : 'bg-[#FEE2E2] text-[#B91C1C]'
                  }`}
                >
                  កម្រិត{previewPassage.level}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#111827] mt-1">
                  {previewPassage.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewPassage(null)}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-sm sm:text-base leading-loose text-[#111827]">
              {previewPassage.content}
            </div>

            {previewPassage.note && (
              <div className="mt-4 p-3 rounded-xl bg-[#F7F8FA] text-xs text-[#4B5563] border border-[#E5E7EB]">
                <strong className="text-[#111827]">កំណត់ចំណាំ៖</strong> {previewPassage.note}
              </div>
            )}

            <div className="mt-6 flex justify-between items-center pt-3 border-t border-[#E5E7EB]">
              <span className="text-xs text-[#9CA3AF]">
                ចំនួនសរុប {toKhmerDigits(segmentKhmerText(previewPassage.content).filter((s) => s.isWord).length)} ពាក្យ
              </span>
              <button
                onClick={() => {
                  const id = previewPassage.id;
                  setPreviewPassage(null);
                  onStartSessionWithPassage(id);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#254bdb] shadow-xs flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <PlayCircle className="w-4 h-4" />
                <span>ចាប់ផ្ដើមអានជាមួយអត្ថបទនេះ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingPassage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#111827]">
              តើអ្នកប្រាកដជាចង់លុបអត្ថបទនេះ?
            </h3>
            <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">
              ការលុបអត្ថបទ <strong>«{deletingPassage.title}»</strong> នឹងធ្វើឲ្យបាត់បង់អត្ថបទនេះពីបណ្ណាល័យ។
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setDeletingPassage(null)}
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
