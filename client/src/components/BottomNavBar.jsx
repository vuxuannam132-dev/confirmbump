import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Clock, LogOut, FileText, Settings, Sun, Moon, AlertTriangle } from 'lucide-react';

export default function BottomNavBar({ activeTab, setActiveTab }) {
  const { logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      {/* Logout Confirmation Modal for Mobile */}
      {showLogoutConfirm && (
        <div className="lg:hidden fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-xs shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="font-black text-base text-slate-900 dark:text-white">Đăng Xuất</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản trên thiết bị này không?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-red-600 text-white active:scale-95 transition-all shadow-md shadow-red-500/20"
              >
                Đăng Xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liquid Glass Bottom Navigation Bar */}
      <nav 
        aria-label="Thanh điều hướng nhanh"
        className="fixed bottom-0 inset-x-0 w-full z-30 lg:hidden select-none"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        }}
      >
        <div className="relative w-full bg-white/75 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-white/50 dark:border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.4)] before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/70 dark:before:via-blue-400/30 before:to-transparent">
          <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
            
            {/* 1. Bên trái: Lịch Sử */}
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-150 active:scale-90 ${
                activeTab === 'history'
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${activeTab === 'history' ? 'bg-blue-100/60 dark:bg-blue-950/60' : ''}`}>
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Lịch sử</span>
            </button>

            {/* 2. Bên trái: Đăng Xuất */}
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 font-medium hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 active:scale-90"
              title="Đăng xuất"
            >
              <div className="p-1 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-all">
                <LogOut className="w-5 h-5 text-red-500 dark:text-red-400" />
              </div>
              <span className="text-[10px] tracking-tight text-red-500 dark:text-red-400 font-bold mt-0.5">Đăng xuất</span>
            </button>

            {/* 3. Ở GIỮA: NHIỆM VỤ (Nổi bật màu xanh, FAB nhô cao) */}
            <div className="relative -mt-6 px-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-200 active:scale-90 ${
                  activeTab === 'tasks'
                    ? 'bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 text-white shadow-blue-500/50 ring-4 ring-blue-500/30'
                    : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-600/40 hover:brightness-110'
                } border-4 border-slate-50 dark:border-slate-950`}
                title="Trang Nhiệm Vụ"
              >
                <FileText className="w-6 h-6 stroke-[2.4]" />
              </button>
              <span className="block text-center text-[10px] font-black text-blue-600 dark:text-blue-400 mt-1">
                Nhiệm vụ
              </span>
            </div>

            {/* 4. Bên phải: Cài Đặt */}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-150 active:scale-90 ${
                activeTab === 'settings'
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-blue-100/60 dark:bg-blue-950/60' : ''}`}>
                <Settings className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Cài đặt</span>
            </button>

            {/* 5. Bên phải: Giao diện Tối/Sáng */}
            <button
              type="button"
              onClick={cycleTheme}
              className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 font-medium hover:text-amber-500 dark:hover:text-amber-400 transition-all duration-150 active:scale-90"
              title="Đổi Giao diện Sáng / Tối"
            >
              <div className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-500" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">
                {theme === 'dark' ? 'Sáng' : 'Tối'}
              </span>
            </button>

          </div>
        </div>
      </nav>
    </>
  );
}
