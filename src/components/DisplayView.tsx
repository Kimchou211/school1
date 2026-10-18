import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, BookOpen, Printer } from 'lucide-react';
import { triggerPdfPrint } from '../lib/exportUtils.ts';

interface DisplayViewProps {
  title: string;
  content: string;
  studentName?: string;
  onClose?: () => void;
  standalone?: boolean;
}

export const DisplayView: React.FC<DisplayViewProps> = ({
  title: initialTitle,
  content: initialContent,
  studentName: initialStudentName,
  onClose,
  standalone = false,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [studentName, setStudentName] = useState(initialStudentName);
  const [fontSize, setFontSize] = useState<number>(30); // large font for projector
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync via BroadcastChannel
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('reading_assessment_channel');
      channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'UPDATE_SESSION') {
          if (payload.title) setTitle(payload.title);
          if (payload.content) setContent(payload.content);
          if (payload.studentName) setStudentName(payload.studentName);
        } else if (type === 'CHANGE_FONT_SIZE') {
          if (payload.fontSize) setFontSize(payload.fontSize);
        }
      };
      return () => {
        channel.close();
      };
    } catch {
      // BroadcastChannel fallback
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`app-shell display-shell min-h-screen bg-[#F7F8FA] text-[#111827] flex flex-col ${standalone ? '' : 'fixed inset-0 z-50'}`}>
      {/* Top Bar for Projector */}
      <div className="display-topbar no-print bg-white border-b border-[#E5E7EB] px-6 py-3.5 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-[#111827] leading-tight">
              ផ្ទាំងបញ្ចាំងសម្រាប់សិស្សអាន (Display / Projector View)
            </h1>
            <p className="text-xs text-[#6B7280]">
              {studentName ? `សិស្ស៖ ${studentName}` : 'អានឮៗតាមសម្រួល'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Font size adjuster */}
          <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-xl p-1 border border-[#E5E7EB]">
            <button
              onClick={() => setFontSize((s) => Math.max(20, s - 2))}
              className="p-1.5 rounded-lg text-[#4B5563] hover:bg-white hover:text-[#111827] cursor-pointer"
              title="បង្រួមអក្សរ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 tabular-nums text-[#111827]">
              {fontSize}px
            </span>
            <button
              onClick={() => setFontSize((s) => Math.min(52, s + 2))}
              className="p-1.5 rounded-lg text-[#4B5563] hover:bg-white hover:text-[#111827] cursor-pointer"
              title="ពង្រីកអក្សរ"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => triggerPdfPrint(`អត្ថបទអាន_${title}`)}
            className="p-2.5 rounded-xl bg-white text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB] border border-[#E5E7EB] shadow-xs cursor-pointer"
            title="បោះពុម្ពអត្ថបទ (Print)"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB] border border-[#E5E7EB] shadow-xs cursor-pointer"
            title="ពេញអេក្រង់ (Fullscreen)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#111827] text-white text-xs font-bold hover:bg-[#1f2937] transition-colors ml-2 cursor-pointer min-h-[40px]"
            >
              បិទផ្ទាំងនេះ
            </button>
          )}
        </div>
      </div>

      {/* Main Reading Canvas for Student (Clean White Surface, Black Text, No Error Marks!) */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-6 sm:p-12 md:p-16 flex flex-col justify-center">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            {title}
          </h2>
          <div className="w-16 h-1 bg-[#2F5BFF] rounded-full mx-auto mt-4" />
        </div>

        <div
          className="display-reading-card bg-white rounded-2xl p-8 sm:p-14 shadow-sm border border-[#E5E7EB] font-sans text-[#111827] transition-all"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: 2.3,
            letterSpacing: '0.02em',
          }}
        >
          {content}
        </div>

        <div className="mt-8 text-center text-xs sm:text-sm text-[#9CA3AF] no-print">
          សូមអានតាមសម្រួល មិនមានការវាស់ពេលវេលាឡើយ
        </div>
      </div>
    </div>
  );
};
