import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DepartmentBadge from './DepartmentBadge';
import NotificationBell from './NotificationBell';
import { 
  CheckSquare, 
  ListOrdered, 
  BarChart3, 
  ShieldCheck, 
  PlusCircle, 
  Users, 
  Settings,
  LogOut, 
  Flame, 
  Menu, 
  X, 
  ChevronRight, 
  Smartphone,
  Sun,
  Moon,
  Megaphone,
  UserCheck
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onOpenInstallAppModal }) {
  const { user, logout, isAdminTong, isAdminCap2, isReviewer, canReview, canTrackProgress } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  if (!user) return null;

  // Role display logic: "CTV" for user, "Người kiểm duyệt" for reviewer, "BCH" for admins
  const roleText = isAdminTong 
    ? 'BCH (Admin Tổng)' 
    : (isAdminCap2 
        ? 'BCH' 
        : (isReviewer ? 'Người kiểm duyệt' : 'CTV'));

  const roleBadgeStyle = isAdminTong
    ? 'bg-red-600 text-white shadow-xs'
    : (isAdminCap2 
        ? 'bg-blue-600 text-white shadow-xs' 
        : (isReviewer ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-700 dark:bg-slate-700 text-white'));

  const navItems = [
    { id: 'tasks', label: 'Nhiệm Vụ', icon: CheckSquare, show: true },
    { id: 'history', label: 'Lịch Sử Cá Nhân', icon: ListOrdered, show: true },
    { 
      id: 'progress', 
      label: (isAdminTong || isReviewer) ? 'Tiến Độ Toàn Đoàn' : `Tiến Độ ${user.department_name || 'Ban'}`, 
      icon: BarChart3, 
      show: canTrackProgress 
    },
    { 
      id: 'review', 
      label: 'Duyệt Confirm', 
      icon: ShieldCheck, 
      show: canReview, 
      badge: isReviewer ? 'Kiểm Duyệt' : 'Admin' 
    },
    { id: 'admin-tasks', label: 'Quản Lý Task', icon: PlusCircle, show: isAdminTong },
    { id: 'broadcast', label: 'Phát Thông Báo', icon: Megaphone, show: isAdminTong },
    { id: 'users', label: 'Thành Viên', icon: Users, show: isAdminTong || isAdminCap2 },
    { id: 'settings', label: 'Cài Đặt', icon: Settings, show: true },
  ];

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setMobileDrawerOpen(false);
  };

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon className="w-4 h-4 text-indigo-400" />;
    return <Sun className="w-4 h-4 text-amber-500" />;
  };

  const getThemeLabel = () => {
    if (theme === 'dark') return 'Giao diện Tối';
    return 'Giao diện Sáng';
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP LEFT SIDEBAR (fixed on large screens) */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 z-40 select-none transition-colors">
        {/* Top Logo & System Brand */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
          <div 
            onClick={() => handleNavClick('tasks')}
            className="cursor-pointer flex items-center space-x-2 group min-w-0 flex-1"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white shadow-md shadow-red-200 dark:shadow-none group-hover:scale-105 transition-transform flex-shrink-0">
              <Flame className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                  ĐOÀN TRƯỜNG
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-400 text-yellow-950 shadow-xs flex-shrink-0">
                  BUMP
                </span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <NotificationBell onNavigateTab={handleNavClick} />
          </div>
        </div>

        {/* User Profile Card */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="flex items-center space-x-3">
            {/* Avatar Circle */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs flex-shrink-0">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="truncate flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white truncate block" title={user.full_name}>
                  {user.full_name}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${roleBadgeStyle}`}>
                  {roleText}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  @{user.username}
                </span>
              </div>
            </div>
          </div>

          {/* Department Badge Slot */}
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Phân ban:</span>
            <DepartmentBadge name={user.department_name} code={user.department_code} size="sm" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.filter(item => item.show).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 active:scale-95 ${
                  isActive 
                    ? 'bg-red-600 text-white shadow-sm shadow-red-200 dark:shadow-none font-extrabold' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions Section */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
          {/* Quick Theme Switcher */}
          <button
            type="button"
            onClick={cycleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Nhấn để đổi Giao diện Sáng / Tối"
          >
            <div className="flex items-center space-x-2.5">
              {getThemeIcon()}
              <span>{getThemeLabel()}</span>
            </div>
            <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {theme.toUpperCase()}
            </span>
          </button>

          {/* Install App Button */}
          {onOpenInstallAppModal && (
            <button
              type="button"
              onClick={onOpenInstallAppModal}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Smartphone className="w-4 h-4 text-red-600" />
              <span>Cài Đặt App / APK</span>
            </button>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng Xuất</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE TOP HEADER (Optimized for iPhone Notch / Dynamic Island) */}
      {/* ========================================================================= */}
      <header 
        className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 transition-colors w-full"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 14px)',
          paddingBottom: '10px',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)'
        }}
      >
        <div className="flex items-center justify-between h-10 w-full">
          <div 
            className="flex items-center space-x-2.5 cursor-pointer active:opacity-80 select-none" 
            onClick={() => handleNavClick('tasks')}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white shadow-xs flex-shrink-0">
              <Flame className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white">
                ĐOÀN TRƯỜNG
              </span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-yellow-400 text-yellow-950 shadow-2xs">
                BUMP
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <NotificationBell onNavigateTab={handleNavClick} />

            {/* Quick Role Pill */}
            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full whitespace-nowrap ${roleBadgeStyle}`}>
              {roleText}
            </span>

            {/* Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 active:scale-95"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. MOBILE SLIDE-OVER DRAWER (Safe-area padded) */}
      {/* ========================================================================= */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div 
            className="relative mr-auto w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between p-5 z-10 animate-in slide-in-from-left duration-200 overflow-y-auto"
            style={{
              paddingTop: 'max(env(safe-area-inset-top, 0px), 20px)',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
              paddingRight: 'max(env(safe-area-inset-right, 0px), 20px)'
            }}
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <Flame className="w-5 h-5 text-red-600" />
                  <span className="font-black text-sm text-slate-900 dark:text-white">Menu Đoàn Trường</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile User Card */}
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                      {user.full_name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400">
                      @{user.username}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${roleBadgeStyle}`}>
                    {roleText}
                  </span>
                  <DepartmentBadge name={user.department_name} code={user.department_code} size="sm" />
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="mt-5 space-y-1.5">
                {navItems.filter(item => item.show).map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 ${
                        isActive 
                          ? 'bg-red-600 text-white shadow-xs font-extrabold' 
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white/80' : 'text-slate-400'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              {/* Theme toggle in mobile */}
              <button
                type="button"
                onClick={cycleTheme}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800"
              >
                <div className="flex items-center space-x-2">
                  {getThemeIcon()}
                  <span>{getThemeLabel()}</span>
                </div>
                <span className="text-[10px] font-bold uppercase">{theme}</span>
              </button>

              {onOpenInstallAppModal && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onOpenInstallAppModal();
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                >
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>Cài đặt App / APK</span>
                </button>
              )}

              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng Xuất Khỏi Hệ Thống</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
