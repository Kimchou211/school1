import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, X, ExternalLink, RefreshCw, Key } from 'lucide-react';

interface DatabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNeonConnected: boolean;
  hasDatabaseUrl: boolean;
  connectionError: string | null;
  onRefreshStatus: () => Promise<void>;
}

export const DatabaseSettingsModal: React.FC<DatabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  isNeonConnected,
  hasDatabaseUrl,
  connectionError,
  onRefreshStatus,
}) => {
  const [checking, setChecking] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await onRefreshStatus();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                ស្ថានភាពមូលដ្ឋានទិន្នន័យ (Database Status)
              </h3>
              <p className="text-xs text-[#6B7280]">
                Neon (neon.tech) PostgreSQL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Connection Status Box */}
        <div className={`p-4 rounded-xl border mb-5 ${
          isNeonConnected
            ? 'bg-[#DCFCE7]/60 border-[#BBF7D0] text-[#166534]'
            : 'bg-[#FEF0D5]/70 border-[#FDE68A] text-[#9A3412]'
        }`}>
          <div className="flex items-start gap-3">
            {isNeonConnected ? (
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            )}
            <div className="text-xs leading-relaxed">
              <h4 className="font-bold text-sm mb-0.5">
                {isNeonConnected
                  ? 'បានភ្ជាប់ជាមួយ Neon PostgreSQL ដោយជោគជ័យ'
                  : 'កំពុងប្រើប្រាស់ Local/Built-in Database'}
              </h4>
              <p>
                {isNeonConnected
                  ? 'រាល់ទិន្នន័យសិស្ស អត្ថបទ និងវគ្គអានត្រូវបានរក្សាទុកដោយផ្ទាល់នៅលើ Cloud PostgreSQL (neon.tech)។'
                  : hasDatabaseUrl
                    ? 'បានរកឃើញ DATABASE_URL ប៉ុន្តែមិនអាចភ្ជាប់ Neon បានទេ។ សូមពិនិត្យ Connection String, password និងស្ថានភាព Database។ ទិន្នន័យថ្មីមិនទាន់ត្រូវបានរក្សាទុកក្នុង Neon ទេ។'
                    : 'មិនបានផ្ទុក DATABASE_URL ទេ។ សូមបង្កើតឯកសារ .env នៅជាមួយ package.json ហើយដាក់ Connection String ពិតពី Neon។ ទិន្នន័យដែលបញ្ចូលនៅ Local DB ស្ថិតតែក្នុង memory ហើយមិន sync ទៅ Neon ឬរក្សាទុកក្រោយ server restart ទេ។'}
              </p>
              {connectionError && (
                <p className="mt-2 text-[#B91C1C] font-mono text-[11px] bg-white p-2 rounded-lg border border-[#FECACA]">
                  {connectionError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* How to configure Neon instructions */}
        <div className="space-y-3 text-xs text-[#4B5563] leading-relaxed mb-6">
          <h5 className="font-bold text-[#111827] flex items-center gap-1.5">
            <Key className="w-4 h-4 text-[#2F5BFF]" />
            <span>របៀបភ្ជាប់ Neon PostgreSQL៖</span>
          </h5>
          <ol className="list-decimal list-inside space-y-1.5 pl-1">
            <li>
              បង្កើតគណនី និងគម្រោងឥតគិតថ្លៃនៅលើ{' '}
              <a
                href="https://neon.tech"
                target="_blank"
                rel="noreferrer"
                className="text-[#2F5BFF] underline font-semibold inline-flex items-center gap-0.5"
              >
                neon.tech <ExternalLink className="w-3 h-3 inline" />
              </a>
            </li>
            <li>ចម្លង <strong>Connection String</strong> (ឧ. <code>postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require</code>)</li>
            <li>ដាក់ក្នុងឯកសារ <code>.env</code> ត្រង់ <code>DATABASE_URL="..."</code></li>
            <li>ប្រព័ន្ធនឹងបង្កើតតារាង និង Index ដោយស្វ័យប្រវត្តិ!</li>
          </ol>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-[#E5E7EB]">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] flex items-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>ពិនិត្យការតភ្ជាប់ឡើងវិញ</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F5BFF] hover:bg-[#254bdb] shadow-xs cursor-pointer min-h-[44px]"
          >
            យល់ព្រម
          </button>
        </div>
      </div>
    </div>
  );
};
