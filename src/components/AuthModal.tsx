import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2, Phone, Send, ShieldCheck, Clock } from 'lucide-react';
import { api } from '../lib/api.ts';
import { Teacher } from '../types/index.ts';

interface AuthModalProps {
  onSuccess: (teacher: Teacher) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        onSuccess(res.teacher);
      } else {
        if (password !== confirmPassword) {
          throw new Error('ពាក្យសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នា');
        }
        const res = await api.register({
          name,
          email,
          password,
          confirmPassword,
          phone: phone.trim() ? phone.trim() : undefined,
          telegramUsername: telegramUsername.trim() ? telegramUsername.trim() : undefined,
        });
        onSuccess(res.teacher);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'មានបញ្ហាបច្ចេកទេស');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
    setError(null);
  };

  return (
    <div className="app-shell auth-shell min-h-screen flex items-center justify-center p-4 bg-[#F7F8FA]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="auth-card w-full max-w-md bg-white rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.05)] border border-[#E5E7EB] p-6 sm:p-8"
      >
        <div className="text-center mb-6 sm:mb-8">
          <div className="auth-mark inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#EAF0FF] text-[#2F5BFF] mb-3">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
            ប្រព័ន្ធតាមដានការអានរបស់សិស្ស
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Reading Assessment System សម្រាប់គ្រូបង្រៀន
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#F3F4F6] p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            ចូលប្រើប្រាស់ (Login)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            ចុះឈ្មោះគ្រូថ្មី (Register)
          </button>
        </div>

        {/* Error notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#B91C1C]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                ឈ្មោះគ្រូបង្រៀន *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-[#9CA3AF]" />
                <input
                  type="text"
                  required
                  placeholder="ឧ. លោកគ្រូ សុវណ្ណ គឹមសាន"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111827] text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">
              អ៊ីមែល (Email) *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#9CA3AF]" />
              <input
                type="email"
                required
                placeholder="teacher@school.edu.kh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111827] text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  លេខទូរស័ព្ទ (ស្រេចចិត្ត)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3 text-[#9CA3AF]" />
                  <input
                    type="tel"
                    placeholder="012 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111827] text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Telegram Username (ស្រេចចិត្ត)
                </label>
                <div className="relative">
                  <Send className="w-4 h-4 absolute left-3.5 top-3 text-[#9CA3AF]" />
                  <input
                    type="text"
                    placeholder="@username"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111827] text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">
              ពាក្យសម្ងាត់ (Password) *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#9CA3AF]" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111827] text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                បញ្ជាក់ពាក្យសម្ងាត់ *
              </label>
              <div className="relative">
                <CheckCircle2 className="w-4 h-4 absolute left-3.5 top-3 text-[#9CA3AF]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111827] text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5BFF] focus:border-[#2F5BFF] transition-all"
                />
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1.5 italic">
                * ចំណាំ៖ គណនីគ្រូថ្មីដែលបានចុះឈ្មោះ នឹងត្រូវរង់ចាំការអនុម័តពី Admin ជាមុនសិន។
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm text-white bg-[#2F5BFF] hover:bg-[#254bdb] shadow-sm shadow-[#2F5BFF]/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer min-h-[44px]"
          >
            <span>{loading ? 'កំពុងដំណើរការ...' : mode === 'login' ? 'ចូលប្រព័ន្ធ' : 'បង្កើតគណនីគ្រូថ្មី'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Demo Accounts Shortcut Buttons */}
        {mode === 'login' && !import.meta.env.PROD && (
          <div className="mt-6 pt-5 border-t border-[#E5E7EB] text-center">
            <p className="text-[11px] text-[#6B7280] mb-2.5 font-medium">
              ជ្រើសរើសគណនីសាកល្បងភ្លាមៗ (លេខសម្ងាត់: 123456)៖
            </p>
            <div className="flex flex-col gap-1.5 text-left">
              <button
                type="button"
                onClick={() => handleFillDemo('teacher@school.edu.kh')}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#EAF0FF] border border-[#E5E7EB] text-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center text-[10px] font-bold">
                    គ្រូ
                  </div>
                  <div>
                    <span className="font-semibold text-[#111827] block">គ្រូស្រាប់ (Approved)</span>
                    <span className="text-[10px] text-[#6B7280]">teacher@school.edu.kh</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#2F5BFF]">ជ្រើសរើស</span>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('admin@school.edu.kh')}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#EAF0FF] border border-[#E5E7EB] text-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center text-[10px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#111827] block">អ្នកគ្រប់គ្រង (Admin)</span>
                    <span className="text-[10px] text-[#6B7280]">admin@school.edu.kh</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#2F5BFF]">ជ្រើសរើស</span>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('pending@school.edu.kh')}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#FEF0D5] border border-[#E5E7EB] text-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#FEF0D5] text-[#B45309] flex items-center justify-center text-[10px] font-bold">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#111827] block">គ្រូថ្មី (Pending Approval)</span>
                    <span className="text-[10px] text-[#6B7280]">pending@school.edu.kh</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#D97706]">ជ្រើសរើស</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
