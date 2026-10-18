import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  PlayCircle,
  Undo2,
  Redo2,
  CheckCircle,
  Monitor,
  Printer,
  ZoomIn,
  ZoomOut,
  Sparkles,
  ArrowRight,
  Split,
  Combine,
  RefreshCw,
  X,
  Link2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Student, Passage, ReadingSession, MarkType } from '../types/index.ts';
import {
  segmentKhmerText,
  SegmentItem,
  toKhmerDigits,
} from '../lib/khmerSegmentation.ts';
import { triggerPdfPrint } from '../lib/exportUtils.ts';
import { createDisplayUrl } from '../lib/displayLink.ts';

interface ReadingSessionViewProps {
  students: Student[];
  passages: Passage[];
  initialPassageId?: string;
  onSessionFinished: (session: ReadingSession) => void;
  onSaveSession: (data: {
    studentId: string;
    passageId: string;
    words: string[];
    score: number;
    maxScore: number;
    comment: string;
    marks: Array<{ wordIndex: number; word: string; markType: MarkType }>;
  }) => Promise<ReadingSession>;
}

type Step = 'select' | 'segment_review' | 'active_reading' | 'finish_modal';

export const ReadingSessionView: React.FC<ReadingSessionViewProps> = ({
  students,
  passages,
  initialPassageId,
  onSessionFinished,
  onSaveSession,
}) => {
  // Setup selections
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [selectedPassageId, setSelectedPassageId] = useState<string>(initialPassageId || passages[0]?.id || '');
  const [step, setStep] = useState<Step>('select');

  // Segments state
  const [segments, setSegments] = useState<SegmentItem[]>([]);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const [splitModalSegment, setSplitModalSegment] = useState<SegmentItem | null>(null);
  const [splitIndex, setSplitIndex] = useState<number>(1);

  // Active Reading Marks state: wordIndex -> 'wrong' | 'skipped'
  const [marks, setMarks] = useState<Record<number, MarkType>>({});
  const [history, setHistory] = useState<Array<Record<number, MarkType>>>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Teacher View Font Size
  const [fontSize, setFontSize] = useState<number>(24);

  // Projector / Display View and student-share link state
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const [displayShareUrl, setDisplayShareUrl] = useState('');
  const [displayLinkCopied, setDisplayLinkCopied] = useState(false);
  const [displayLinkMessage, setDisplayLinkMessage] = useState('');
  const displayLinkInputRef = useRef<HTMLInputElement | null>(null);

  // Scoring Modal state
  const [scoreInput, setScoreInput] = useState<string>('8.5');
  const [maxScoreInput, setMaxScoreInput] = useState<string>('10');
  const [commentInput, setCommentInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentStudent = students.find((s) => s.id === selectedStudentId);
  const currentPassage = passages.find((p) => p.id === selectedPassageId);

  const buildDisplayUrl = (includeStudentName = false) => {
    if (!currentPassage) return '';
    return createDisplayUrl({
      title: currentPassage.title,
      content: currentPassage.content,
      ...(includeStudentName && currentStudent?.name ? { studentName: currentStudent.name } : {}),
    });
  };

  const handleOpenProjectorPage = () => {
    const displayUrl = buildDisplayUrl(true);
    if (displayUrl) window.open(displayUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCreateStudentDisplayLink = () => {
    const displayUrl = buildDisplayUrl(false);
    if (!displayUrl) return;
    setDisplayShareUrl(displayUrl);
    setDisplayLinkCopied(false);
    setDisplayLinkMessage('តំណរួចរាល់ហើយ។ ចម្លងវា ហើយផ្ញើទៅសិស្សតាម Telegram ឬកម្មវិធីផ្ញើសារ។');
  };

  const handleCopyStudentDisplayLink = async () => {
    if (!displayShareUrl) return;
    try {
      await navigator.clipboard.writeText(displayShareUrl);
      setDisplayLinkCopied(true);
      setDisplayLinkMessage('បានចម្លង Link រួចរាល់!');
    } catch {
      displayLinkInputRef.current?.focus();
      displayLinkInputRef.current?.select();
      setDisplayLinkCopied(false);
      setDisplayLinkMessage('កម្មវិធីរុករកមិនអនុញ្ញាតឲ្យចម្លងដោយស្វ័យប្រវត្តិទេ។ សូមចុច Ctrl+C ដើម្បីចម្លង Link។');
    }
  };

  // Initialize BroadcastChannel
  useEffect(() => {
    try {
      broadcastChannelRef.current = new BroadcastChannel('reading_assessment_channel');
    } catch {
      // ignore
    }
    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

  // Broadcast updates when passage or student changes
  const broadcastSessionUpdate = () => {
    if (broadcastChannelRef.current && currentPassage) {
      broadcastChannelRef.current.postMessage({
        type: 'UPDATE_SESSION',
        payload: {
          title: currentPassage.title,
          content: currentPassage.content,
          studentName: currentStudent?.name,
        },
      });
    }
  };

  // Broadcast font size change
  const broadcastFontSize = (size: number) => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'CHANGE_FONT_SIZE',
        payload: { fontSize: size },
      });
    }
  };

  // When step changes to segment_review, segment passage text
  const handleProceedToSegmentation = () => {
    if (!currentPassage) return;
    const initialSegments = segmentKhmerText(currentPassage.content);
    setSegments(initialSegments);
    setStep('segment_review');
  };

  // Merge selected adjacent words
  const handleMergeSegments = () => {
    if (selectedSegmentIds.length !== 2) return;
    const [id1, id2] = selectedSegmentIds;
    const idx1 = segments.findIndex((s) => s.id === id1);
    const idx2 = segments.findIndex((s) => s.id === id2);

    if (idx1 === -1 || idx2 === -1 || Math.abs(idx1 - idx2) !== 1) {
      alert('សូមជ្រើសរើសពាក្យពីរដែលនៅជាប់គ្នាដើម្បីបញ្ចូលគ្នា');
      return;
    }

    const firstIdx = Math.min(idx1, idx2);
    const secondIdx = Math.max(idx1, idx2);

    const mergedText = segments[firstIdx].text + segments[secondIdx].text;
    const newSegments = [...segments];
    newSegments.splice(firstIdx, 2, {
      id: `seg-merged-${Date.now()}`,
      text: mergedText,
      isWord: true,
    });

    // Re-index words
    let wordCount = 0;
    const reindexed = newSegments.map((s) => {
      if (s.isWord) {
        return { ...s, wordIndex: wordCount++ };
      }
      return { ...s, wordIndex: undefined };
    });

    setSegments(reindexed);
    setSelectedSegmentIds([]);
  };

  // Split selected word
  const handleConfirmSplit = () => {
    if (!splitModalSegment) return;
    const wordText = splitModalSegment.text;
    if (splitIndex <= 0 || splitIndex >= wordText.length) return;

    const part1 = wordText.substring(0, splitIndex);
    const part2 = wordText.substring(splitIndex);

    const targetIdx = segments.findIndex((s) => s.id === splitModalSegment.id);
    if (targetIdx === -1) return;

    const newSegments = [...segments];
    newSegments.splice(
      targetIdx,
      1,
      { id: `seg-split-${Date.now()}-1`, text: part1, isWord: true },
      { id: `seg-split-${Date.now()}-2`, text: part2, isWord: true }
    );

    // Re-index words
    let wordCount = 0;
    const reindexed = newSegments.map((s) => {
      if (s.isWord) {
        return { ...s, wordIndex: wordCount++ };
      }
      return { ...s, wordIndex: undefined };
    });

    setSegments(reindexed);
    setSplitModalSegment(null);
  };

  // Start reading session
  const handleStartActiveReading = () => {
    setMarks({});
    setHistory([{}]);
    setHistoryIndex(0);
    setStep('active_reading');
    broadcastSessionUpdate();
  };

  // Click on word logic: 1 click -> wrong (red #FEE2E2 / text #B91C1C), 2 clicks -> skipped (orange #FEF0D5 / text #B45309), 3 clicks -> normal
  const handleWordClick = (wordIndex: number) => {
    const currentMark = marks[wordIndex];
    let nextMark: MarkType | undefined;

    if (!currentMark) {
      nextMark = 'wrong'; // 1st click: wrong
    } else if (currentMark === 'wrong') {
      nextMark = 'skipped'; // 2nd click: skipped
    } else {
      nextMark = undefined; // 3rd click: normal
    }

    const nextMarks = { ...marks };
    if (nextMark) {
      nextMarks[wordIndex] = nextMark;
    } else {
      delete nextMarks[wordIndex];
    }

    // Push to history for Undo/Redo
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(nextMarks);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setMarks(nextMarks);

    // Auto-save to localStorage
    try {
      localStorage.setItem(
        `reading_marks_${selectedStudentId}_${selectedPassageId}`,
        JSON.stringify(nextMarks)
      );
    } catch {
      // ignore
    }
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevMarks = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setMarks(prevMarks);
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextMarks = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setMarks(nextMarks);
    }
  };

  // Reset marks
  const handleResetMarks = () => {
    if (window.confirm('តើអ្នកចង់សម្អាតការចុះសម្គាល់ទាំងអស់ឡើងវិញឬ?')) {
      setMarks({});
      setHistory([{}]);
      setHistoryIndex(0);
    }
  };

  // Word list array
  const clickableWords = segments.filter((s) => s.isWord);
  const wrongCount = Object.values(marks).filter((m) => m === 'wrong').length;
  const skippedCount = Object.values(marks).filter((m) => m === 'skipped').length;
  const totalWords = clickableWords.length;

  // Open Score Modal
  const handleOpenFinishModal = () => {
    if (!commentInput) {
      if (wrongCount === 0 && skippedCount === 0) {
        setCommentInput('សិស្សអានបានយ៉ាងស្ទាត់ជំនាញ ត្រឹមត្រូវគ្រប់ពាក្យ។');
      } else {
        setCommentInput(
          `សិស្សអានបានល្អ មានទាក់ទើរត្រង់ពាក្យខុស ${toKhmerDigits(wrongCount)} ពាក្យ និងរំលង ${toKhmerDigits(skippedCount)} ពាក្យ។`
        );
      }
    }
    setStep('finish_modal');
  };

  // Save Session
  const handleSaveSession = async () => {
    const score = parseFloat(scoreInput);
    const maxScore = parseFloat(maxScoreInput);

    if (isNaN(score) || isNaN(maxScore) || maxScore <= 0) {
      setSaveError('សូមបញ្ចូលពិន្ទុ និងពិន្ទុពេញឲ្យបានត្រឹមត្រូវ');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const marksPayload = Object.entries(marks).map(([indexStr, markType]) => {
        const idx = parseInt(indexStr, 10);
        const word = clickableWords[idx]?.text || '';
        return {
          wordIndex: idx,
          word,
          markType,
        };
      });

      const session = await onSaveSession({
        studentId: selectedStudentId,
        passageId: selectedPassageId,
        words: clickableWords.map((w) => w.text),
        score,
        maxScore,
        comment: commentInput.trim(),
        marks: marksPayload,
      });

      // Celebration Confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      onSessionFinished(session);
    } catch (err: unknown) {
      setSaveError((err as Error).message || 'មានបញ្ហាក្នុងការរក្សាទុក');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Selection Screen */}
      {step === 'select' && (
        <div className="max-w-2xl mx-auto bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center mx-auto mb-3">
              <PlayCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">
              ចាប់ផ្ដើមវគ្គអានថ្មី (New Reading Session)
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
              សូមជ្រើសរើសសិស្ស និងអត្ថបទដែលត្រូវអាន
            </p>
          </div>

          <div className="space-y-5">
            {/* Choose Student */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                ជ្រើសរើសសិស្ស
              </label>
              {students.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#FEF0D5] text-[#B45309] text-xs">
                  មិនទាន់មានសិស្សទេ សូមបញ្ចូលសិស្សជាមុនសិន។
                </div>
              ) : (
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full py-3 px-4 text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all cursor-pointer"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.className} - {s.name} ({s.gender}, {s.age} ឆ្នាំ)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Choose Passage */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                ជ្រើសរើសអត្ថបទអាន
              </label>
              {passages.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#FEF0D5] text-[#B45309] text-xs">
                  មិនទាន់មានអត្ថបទទេ សូមបញ្ចូលអត្ថបទជាមុនសិន។
                </div>
              ) : (
                <select
                  value={selectedPassageId}
                  onChange={(e) => setSelectedPassageId(e.target.value)}
                  className="w-full py-3 px-4 text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all cursor-pointer"
                >
                  {passages.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.level}] {p.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Preview Selected Passage Box */}
            {currentPassage && (
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#111827]">
                    {currentPassage.title}
                  </span>
                  <span className="text-[11px] font-semibold text-[#2F5BFF]">
                    កម្រិត {currentPassage.level}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] line-clamp-3 leading-relaxed">
                  {currentPassage.content}
                </p>
              </div>
            )}

            <button
              onClick={handleProceedToSegmentation}
              disabled={!selectedStudentId || !selectedPassageId}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-[#2F5BFF] hover:bg-[#254bdb] shadow-xs shadow-[#2F5BFF]/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer min-h-[44px]"
            >
              <span>ពិនិត្យការបំបែកពាក្យ និងចាប់ផ្ដើម</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Pre-session Word Segmentation Review & Adjustment */}
      {step === 'segment_review' && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E7EB] gap-4">
            <div>
              <span className="text-xs font-bold text-[#2F5BFF]">
                ជំហានត្រួតពិនិត្យការបំបែកពាក្យ (Word Segmentation Review)
              </span>
              <h3 className="text-lg font-bold text-[#111827] mt-0.5">
                {currentPassage?.title}
              </h3>
              <p className="text-xs text-[#6B7280] mt-1">
                ប្រព័ន្ធប្រើ Intl.Segmenter។ ប្រសិនបើពាក្យណាដាច់មិនត្រូវ អ្នកអាចចុចជ្រើសរើសពាក្យពីរដើម្បី <strong>បញ្ចូលគ្នា (Merge)</strong> ឬចុចលើពាក្យមួយដើម្បី <strong>បំបែក (Split)</strong>។
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep('select')}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#4B5563] bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] cursor-pointer min-h-[44px]"
              >
                ត្រឡប់ក្រោយ
              </button>
              <button
                onClick={handleStartActiveReading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#254bdb] shadow-xs flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>ពាក្យត្រឹមត្រូវហើយ, ចាប់ផ្ដើមអាន!</span>
              </button>
            </div>
          </div>

          {/* Merge Toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB] text-xs">
            <span className="font-semibold text-[#374151]">
              ឧបករណ៍កែសម្រួល៖
            </span>
            <button
              onClick={handleMergeSegments}
              disabled={selectedSegmentIds.length !== 2}
              className="px-3.5 py-2 rounded-lg bg-[#2F5BFF] text-white font-medium hover:bg-[#254bdb] disabled:opacity-40 flex items-center gap-1 cursor-pointer min-h-[36px]"
            >
              <Combine className="w-3.5 h-3.5" />
              <span>បញ្ចូលពាក្យទាំងពីរ (Merge)</span>
            </button>
            <span className="text-[#6B7280]">
              (បានជ្រើសរើស {toKhmerDigits(selectedSegmentIds.length)}/២ ពាក្យ)
            </span>
          </div>

          {/* Word Segmentation Interactive Canvas */}
          <div className="p-6 rounded-2xl border border-[#E5E7EB] bg-white flex flex-wrap gap-x-1.5 gap-y-2.5 items-center leading-loose font-sans text-base">
            {segments.map((seg) => {
              if (!seg.isWord) {
                return (
                  <span key={seg.id} className="text-[#6B7280] select-none">
                    {seg.text}
                  </span>
                );
              }

              const isSelectedForMerge = selectedSegmentIds.includes(seg.id);

              return (
                <div key={seg.id} className="inline-flex items-center gap-0.5 group">
                  <button
                    onClick={() => {
                      if (selectedSegmentIds.includes(seg.id)) {
                        setSelectedSegmentIds(selectedSegmentIds.filter((id) => id !== seg.id));
                      } else {
                        if (selectedSegmentIds.length >= 2) {
                          setSelectedSegmentIds([selectedSegmentIds[1], seg.id]);
                        } else {
                          setSelectedSegmentIds([...selectedSegmentIds, seg.id]);
                        }
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      isSelectedForMerge
                        ? 'bg-[#2F5BFF] text-white ring-2 ring-[#2F5BFF]/30'
                        : 'bg-white text-[#111827] border border-[#E5E7EB] hover:border-[#2F5BFF]'
                    }`}
                  >
                    {seg.text}
                  </button>

                  {/* Split Button on hover */}
                  <button
                    onClick={() => {
                      setSplitModalSegment(seg);
                      setSplitIndex(Math.floor(seg.text.length / 2) || 1);
                    }}
                    title="បំបែកពាក្យនេះ"
                    className="p-1 rounded text-[#9CA3AF] hover:text-[#2F5BFF] hover:bg-[#EAF0FF] opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Split className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Active Teacher-led Reading Session */}
      {step === 'active_reading' && (
        <div className="space-y-4">
          {/* Top Bar for Teacher Session */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAF0FF] text-[#2F5BFF] font-bold flex items-center justify-center">
                {currentStudent?.name.charAt(0) || 'ស'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-[#111827]">
                    សិស្ស៖ {currentStudent?.name}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#4B5563]">
                    {currentStudent?.className}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  អត្ថបទ៖ «{currentPassage?.title}» (គ្មានកំណត់ពេលវេលាទេ)
                </p>
              </div>
            </div>

            {/* Teacher Controls Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Undo / Redo */}
              <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-xl p-1 border border-[#E5E7EB]">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-2 rounded-lg text-[#4B5563] hover:bg-white hover:text-[#111827] disabled:opacity-30 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Undo (ដកថយការចុចចុងក្រោយ)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-2 rounded-lg text-[#4B5563] hover:bg-white hover:text-[#111827] disabled:opacity-30 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Redo (ធ្វើឡើងវិញ)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              {/* Font Size Adjuster */}
              <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-xl p-1 border border-[#E5E7EB]">
                <button
                  onClick={() => {
                    const next = Math.max(16, fontSize - 2);
                    setFontSize(next);
                    broadcastFontSize(next);
                  }}
                  className="p-2 rounded-lg text-[#4B5563] hover:bg-white hover:text-[#111827] cursor-pointer"
                  title="បង្រួមអក្សរ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold px-2 tabular-nums text-[#111827]">
                  {fontSize}px
                </span>
                <button
                  onClick={() => {
                    const next = Math.min(42, fontSize + 2);
                    setFontSize(next);
                    broadcastFontSize(next);
                  }}
                  className="p-2 rounded-lg text-[#4B5563] hover:bg-white hover:text-[#111827] cursor-pointer"
                  title="ពង្រីកអក្សរ"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* Projector / Display View opens as a separate page */}
              <button
                onClick={handleOpenProjectorPage}
                disabled={!currentPassage}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white text-[#111827] hover:bg-[#F9FAFB] border border-[#E5E7EB] shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                title="បើកផ្ទាំង Projector ជាទំព័រថ្មី"
              >
                <Monitor className="w-4 h-4 text-[#2F5BFF]" />
                <span>ផ្ទាំង Projector</span>
                <ExternalLink className="w-3 h-3 text-[#6B7280]" />
              </button>

              {/* Create a shareable standalone reading link for students */}
              <button
                onClick={handleCreateStudentDisplayLink}
                disabled={!currentPassage}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#EAF0FF] text-[#2446C7] hover:bg-[#DCE7FF] border border-[#C8D7FF] shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                title="បង្កើត Link សម្រាប់ឲ្យសិស្សបើកអាន"
              >
                <Link2 className="w-4 h-4" />
                <span>Link សម្រាប់សិស្ស</span>
              </button>

              {/* Print passage */}
              <button
                onClick={() => triggerPdfPrint(`អត្ថបទអាន_${currentPassage?.title}`)}
                className="p-2.5 rounded-xl text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB] bg-white border border-[#E5E7EB] shadow-xs cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="បោះពុម្ពអត្ថបទ (Print)"
              >
                <Printer className="w-4 h-4" />
              </button>

              {/* Clear marks */}
              <button
                onClick={handleResetMarks}
                className="p-2.5 rounded-xl text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="សម្អាតឡើងវិញ"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Finish Reading Session Button */}
              <button
                onClick={handleOpenFinishModal}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#254bdb] shadow-xs shadow-[#2F5BFF]/30 flex items-center gap-1.5 active:scale-95 cursor-pointer min-h-[44px]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>ចប់ការអាន (ដាក់ពិន្ទុ)</span>
              </button>
            </div>
          </div>

          {/* Live Counter & Legend Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="text-[#6B7280]">
                ពាក្យសរុប៖ <strong className="text-[#111827] tabular-nums">{toKhmerDigits(totalWords)}</strong>
              </span>
              <span className="text-[#B91C1C]">
                ខុស (ក្រហម)៖ <strong className="tabular-nums">{toKhmerDigits(wrongCount)}</strong>
              </span>
              <span className="text-[#B45309]">
                រំលង (ទឹកក្រូច)៖ <strong className="tabular-nums">{toKhmerDigits(skippedCount)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#6B7280]">
              <span className="inline-flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded-md bg-[#FEE2E2] border border-[#FECACA] inline-block" /> ចុច ១ ដង = ខុស
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded-md bg-[#FEF0D5] border border-[#FDE68A] inline-block" /> ចុច ២ ដង = រំលង
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded-md bg-white border border-[#E5E7EB] inline-block" /> ចុច ៣ ដង = ធម្មតា
              </span>
            </div>
          </div>

          {/* Interactive Teacher Reading Passage Box */}
          <div
            className="p-8 sm:p-12 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs leading-loose font-sans text-[#111827] flex flex-wrap gap-x-2 gap-y-3 items-center"
            style={{ fontSize: `${fontSize}px`, lineHeight: 2.2 }}
          >
            {segments.map((seg) => {
              if (!seg.isWord || seg.wordIndex === undefined) {
                return (
                  <span key={seg.id} className="text-[#9CA3AF] select-none">
                    {seg.text}
                  </span>
                );
              }

              const wordIdx = seg.wordIndex;
              const mark = marks[wordIdx];

              // Design rule: Red (bg #FEE2E2, text #B91C1C), Orange (bg #FEF0D5, text #B45309), Normal (white)
              let markStyle = 'bg-white text-[#111827] border border-[#E5E7EB] hover:border-[#2F5BFF]/50 shadow-xs';
              if (mark === 'wrong') {
                markStyle = 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] font-bold shadow-xs';
              } else if (mark === 'skipped') {
                markStyle = 'bg-[#FEF0D5] text-[#B45309] border border-[#FDE68A] font-bold shadow-xs';
              }

              return (
                <motion.button
                  key={seg.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleWordClick(wordIdx)}
                  className={`px-3 py-1 rounded-xl transition-all select-none cursor-pointer ${markStyle}`}
                  title={`${seg.text} (${mark === 'wrong' ? 'ខុស' : mark === 'skipped' ? 'រំលង' : 'ធម្មតា'})`}
                >
                  {seg.text}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Split Modal */}
      {splitModalSegment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-[#111827] mb-2">
              បំបែកពាក្យ៖ «{splitModalSegment.text}»
            </h3>
            <p className="text-xs text-[#6B7280] mb-4">
              សូមជ្រើសរើសទីតាំងកាត់ពាក្យ៖
            </p>

            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-center font-bold text-lg mb-4">
              <span className="text-[#2F5BFF]">
                {splitModalSegment.text.substring(0, splitIndex)}
              </span>
              <span className="text-[#B91C1C] px-1">|</span>
              <span className="text-[#111827]">
                {splitModalSegment.text.substring(splitIndex)}
              </span>
            </div>

            <input
              type="range"
              min={1}
              max={splitModalSegment.text.length - 1}
              value={splitIndex}
              onChange={(e) => setSplitIndex(Number(e.target.value))}
              className="w-full mb-6 accent-[#2F5BFF]"
            />

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setSplitModalSegment(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#4B5563] bg-[#F3F4F6] hover:bg-[#E5E7EB] cursor-pointer min-h-[44px]"
              >
                បោះបង់
              </button>
              <button
                onClick={handleConfirmSplit}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#254bdb] shadow-xs cursor-pointer min-h-[44px]"
              >
                យល់ព្រមបំបែក
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Scoring Modal (Manual Teacher Input) */}
      {step === 'finish_modal' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#111827]">
                ដាក់ពិន្ទុ និងមតិយោបល់ការអាន
              </h3>
              <p className="text-xs text-[#6B7280] mt-1">
                សិស្ស៖ <strong>{currentStudent?.name}</strong> · ថ្នាក់ {currentStudent?.className}
              </p>
            </div>

            {/* Error message */}
            {saveError && (
              <div className="mb-4 p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-xs">
                {saveError}
              </div>
            )}

            {/* Context Summary Box */}
            <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-center mb-5">
              <div>
                <p className="text-[11px] text-[#6B7280]">ពាក្យសរុប</p>
                <p className="text-base font-bold text-[#111827] tabular-nums">
                  {toKhmerDigits(totalWords)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#B91C1C]">អានខុស</p>
                <p className="text-base font-bold text-[#B91C1C] tabular-nums">
                  {toKhmerDigits(wrongCount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#B45309]">រំលង</p>
                <p className="text-base font-bold text-[#B45309] tabular-nums">
                  {toKhmerDigits(skippedCount)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Score Input (Teacher manual) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    ពិន្ទុដែលគ្រូផ្ដល់ (Score)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base font-bold rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    ពិន្ទុពេញ (Max Score)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={maxScoreInput}
                    onChange={(e) => setMaxScoreInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base font-bold rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all tabular-nums"
                  />
                </div>
              </div>

              {/* Teacher Comment */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  មតិយោបល់ និងការណែនាំរបស់គ្រូ
                </label>
                <textarea
                  rows={3}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="ឧ. សិស្សអានបានល្អ រលូន ត្រូវហាត់បញ្ចេញសូរស័ព្ទពាក្យ..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setStep('active_reading')}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#4B5563] bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors cursor-pointer min-h-[44px]"
                >
                  ត្រឡប់ទៅពិនិត្យអត្ថបទ
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveSession}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#254bdb] shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកលទ្ធផល'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student share-link dialog */}
      {displayShareUrl && (
        <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-display-link-title"
            className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 w-full max-w-xl shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center shrink-0">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="student-display-link-title" className="text-base font-bold text-[#111827]">
                    Link សម្រាប់សិស្សអាន
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                    សិស្សអាចបើក Link នេះលើទូរស័ព្ទ ឬកុំព្យូទ័រ ដើម្បីមើលអត្ថបទអានដោយមិនចាំបាច់ចូលគណនីគ្រូ។
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDisplayShareUrl('')}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] cursor-pointer"
                aria-label="បិទផ្ទាំង Link"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label htmlFor="student-display-link" className="block text-xs font-semibold text-[#374151] mb-1.5">
              Link សម្រាប់ចែករំលែក
            </label>
            <input
              id="student-display-link"
              ref={displayLinkInputRef}
              readOnly
              value={displayShareUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3 py-3 text-xs text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2F5BFF]"
            />
            <p className={`mt-2 text-xs leading-relaxed ${displayLinkCopied ? 'text-[#15803D]' : 'text-[#6B7280]'}`}>
              {displayLinkMessage}
            </p>

            <div className="flex flex-wrap justify-end gap-2 mt-5 pt-4 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => window.open(displayShareUrl, '_blank', 'noopener,noreferrer')}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB] flex items-center gap-1.5 cursor-pointer min-h-[42px]"
              >
                <ExternalLink className="w-4 h-4" />
                សាកបើក Link
              </button>
              <button
                type="button"
                onClick={handleCopyStudentDisplayLink}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#254bdb] flex items-center gap-1.5 cursor-pointer min-h-[42px]"
              >
                {displayLinkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {displayLinkCopied ? 'បានចម្លង Link' : 'ចម្លង Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
