import React, { useState } from 'react';
import {
  BookOpen,
  Users,
  FileText,
  PlayCircle,
  History,
  Trophy,
  BarChart3,
  LogOut,
  Database,
  Menu,
  X,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Teacher } from '../types/index.ts';

export type NavTab =
  | 'overview'
  | 'students'
  | 'passages'
  | 'session'
  | 'history'
  | 'ranking'
  | 'reports'
  | 'admin';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  teacher: Teacher | null;
  onLogout: () => void;
  onOpenDbModal: () => void;
  isNeonConnected: boolean;
  pendingApprovalCount?: number;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  teacher,
  onLogout,
  onOpenDbModal,
  isNeonConnected,
  pendingApprovalCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const baseNavItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'ទំព័រដើម', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'session', label: 'វគ្គអានថ្មី', icon: <PlayCircle className="w-4 h-4" /> },
    { id: 'students', label: 'បញ្ជីសិស្ស', icon: <Users className="w-4 h-4" /> },
    { id: 'passages', label: 'បណ្ណាល័យអត្ថបទ', icon: <FileText className="w-4 h-4" /> },
    { id: 'history', label: 'ប្រវត្តិការអាន', icon: <History className="w-4 h-4" /> },
    { id: 'ranking', label: 'ចំណាត់ថ្នាក់', icon: <Trophy className="w-4 h-4" /> },
    { id: 'reports', label: 'របាយការណ៍', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  // If Admin, insert Admin Management Tab
  const navItems = teacher?.role === 'admin'
    ? [
        ...baseNavItems,
        {
          id: 'admin' as NavTab,
          label: 'គ្រប់គ្រងគ្រូ & Admin',
          icon: <ShieldCheck className="w-4 h-4 text-[#2F5BFF]" />,
          badge: pendingApprovalCount,
        },
      ]
    : baseNavItems;

  return (
    <>
      {/* Top Header */}
      <header className="app-header sticky top-0 z-40 bg-white border-b border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSelectTab('overview')}
                className="flex items-center gap-3 text-left focus:outline-none cursor-pointer group"
              >
                <div className="brand-mark w-10 h-10 rounded-xl bg-[#2F5BFF] flex items-center justify-center text-white shadow-sm shadow-[#2F5BFF]/30 transition-transform group-hover:scale-105">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-base text-[#111827] tracking-tight leading-tight block">
                    ប្រព័ន្ធតាមដានការអាន
                  </span>
                  <span className="text-xs text-[#6B7280] block -mt-0.5">
                    Reading Assessment System
                  </span>
                </div>
              </button>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`nav-link relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive ? 'nav-link-active' : ''} ${
                      isActive
                        ? 'bg-[#EAF0FF] text-[#2F5BFF]'
                        : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 bg-[#D97706] text-white text-[10px] font-bold rounded-full animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Action Zone */}
            <div className="flex items-center gap-2.5">
              {/* Database indicator button */}
              <button
                onClick={() => {
                  if (teacher?.role === 'admin') onOpenDbModal();
                }}
                disabled={teacher?.role !== 'admin'}
                aria-disabled={teacher?.role !== 'admin'}
                title={teacher?.role === 'admin'
                  ? 'ស្ថានភាពមូលដ្ឋានទិន្នន័យ (Database Status)'
                  : 'មានតែ Admin ប៉ុណ្ណោះដែលអាចមើល Database Status បាន'}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#374151] shadow-xs cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <Database className={`w-3.5 h-3.5 ${isNeonConnected ? 'text-[#16A34A]' : 'text-[#D97706]'}`} />
                <span className="hidden sm:inline">
                  {isNeonConnected ? 'Neon DB' : 'Local DB'}
                </span>
                <span className={`w-2 h-2 rounded-full ${isNeonConnected ? 'bg-[#16A34A]' : 'bg-[#D97706]'}`} />
              </button>

              {/* Teacher Profile & Logout */}
              {teacher && (
                <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#E5E7EB]">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div className="w-8 h-8 rounded-full bg-[#EAF0FF] text-[#2F5BFF] flex items-center justify-center font-bold text-xs">
                      {teacher.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className="text-left text-xs leading-tight hidden xl:block">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-[#111827] truncate max-w-[130px]">
                          {teacher.name}
                        </p>
                        {teacher.role === 'admin' ? (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold text-[#2F5BFF] bg-[#EAF0FF] rounded">
                            Admin
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 text-[9px] font-medium text-[#15803D] bg-[#DCFCE7] rounded">
                            គ្រូ
                          </span>
                        )}
                      </div>
                      <p className="text-[#6B7280] text-[11px] truncate max-w-[140px]">
                        {teacher.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onLogout}
                    title="ចាកចេញ (Logout)"
                    className="p-2 text-[#6B7280] hover:text-[#B91C1C] rounded-xl hover:bg-[#FEE2E2]/50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Mobile menu drawer toggle button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] cursor-pointer"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-[#E5E7EB] px-4 pt-2 pb-4 space-y-1 shadow-md">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`nav-mobile-link w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer min-h-[44px] ${isActive ? 'nav-link-active' : ''} ${
                    isActive
                      ? 'bg-[#EAF0FF] text-[#2F5BFF] font-semibold'
                      : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 bg-[#D97706] text-white text-xs font-bold rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
            {teacher && (
              <div className="pt-3 mt-2 border-t border-[#E5E7EB] flex items-center justify-between px-2">
                <div>
                  <span className="text-xs font-semibold text-[#111827] block truncate">
                    {teacher.name}
                  </span>
                  <span className="text-[11px] text-[#6B7280]">{teacher.email}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 text-xs text-[#B91C1C] font-semibold py-1.5 px-3 rounded-xl hover:bg-[#FEE2E2]/60 cursor-pointer min-h-[44px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ចាកចេញ</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] px-2 py-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] no-print">
        <div className="flex items-center justify-around">
          {navItems.slice(0, 5).map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] min-h-[44px] cursor-pointer transition-colors ${
                  isActive
                    ? 'text-[#2F5BFF] font-bold'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-[#EAF0FF]' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#D97706]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
