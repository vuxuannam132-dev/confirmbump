import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DepartmentBadge from './DepartmentBadge';
import { 
  LogOut, 
  CheckSquare, 
  ListOrdered, 
  BarChart3, 
  ShieldCheck, 
  PlusCircle, 
  Users, 
  Flame,
  Menu,
  X,
  ChevronRight,
  Shield
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, isAdminTong, isAdminCap2 } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const roleText = isAdminTong 
    ? 'Admin Tổng' 
    : (isAdminCap2 ? `Trưởng ${user.department_name || 'Ban'}` : 'Đoàn Viên');

  const roleBadgeColor = isAdminTong
    ? 'bg-red-600 text-white'
    : (isAdminCap2 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white');

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'tasks', label: 'Nhiệm Vụ', icon: CheckSquare, show: true },
    { id: 'history', label: 'Lịch Sử Cá Nhân', icon: ListOrdered, show: true },
    { id: 'progress', label: isAdminTong ? 'Tiến Độ Toàn Đoàn' : `Tiến Độ ${user.department_name || 'Ban'}`, icon: BarChart3, show: isAdminCap2 || isAdminTong },
    { id: 'review', label: 'Duyệt Confirm', icon: ShieldCheck, show: isAdminTong, badge: 'Admin' },
    { id: 'admin-tasks', label: 'Đăng Task', icon: PlusCircle, show: isAdminTong },
    { id: 'users', label: 'Thành Viên', icon: Users, show: isAdminTong || isAdminCap2 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer select-none group" 
            onClick={() => handleNavClick('tasks')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white shadow-md shadow-red-200 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-yellow-300 fill-yellow-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-sm sm:text-base tracking-tight text-slate-900">
                  ĐOÀN TRƯỜNG
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-400 text-yellow-950 shadow-xs">
                  BUMP
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Hệ thống xác nhận tương tác mạng xã hội
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.filter(item => item.show).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative flex items-center px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-red-50 text-red-700 shadow-xs font-extrabold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-1.5 ${isActive ? 'text-red-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 text-amber-800">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-red-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Section: Desktop User Profile & Hamburger Mobile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Desktop User Info */}
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-slate-800 max-w-[140px] truncate" title={user.full_name}>
                  {user.full_name}
                </span>
                <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${roleBadgeColor}`}>
                  {roleText}
                </span>
              </div>
              <div className="mt-0.5">
                <DepartmentBadge name={user.department_name} code={user.department_code} size="sm" />
              </div>
            </div>

            {/* Desktop Logout Button */}
            <button
              onClick={logout}
              title="Đăng xuất"
              className="hidden sm:flex p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 transition-all border border-slate-200"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-red-600" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-down Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/98 backdrop-blur-lg shadow-xl px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Mobile User Profile Card */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm text-slate-900">{user.full_name}</span>
                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full ${roleBadgeColor}`}>
                  {roleText}
                </span>
              </div>
              <DepartmentBadge name={user.department_name} code={user.department_code} size="sm" />
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold flex items-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Navigation List */}
          <div className="space-y-1">
            {navItems.filter(item => item.show).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-colors ${
                    isActive 
                      ? 'bg-red-600 text-white shadow-sm' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white/80' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
