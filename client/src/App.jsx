import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminTasksPage from './pages/AdminTasksPage';
import AdminReviewPage from './pages/AdminReviewPage';
import DepartmentTrackingPage from './pages/DepartmentTrackingPage';
import AdminUsersPage from './pages/AdminUsersPage';
import PersonalHistoryPage from './pages/PersonalHistoryPage';
import InstallAppModal from './components/InstallAppModal';
import { Smartphone } from 'lucide-react';

function AppContent() {
  const { user, loading, isAdminTong, isAdminCap2 } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'history', 'progress', 'review', 'admin-tasks', 'users'
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Đang khởi động hệ thống Đoàn trường...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <>
        {authView === 'register' ? (
          <RegisterPage onNavigateLogin={() => setAuthView('login')} />
        ) : (
          <LoginPage onNavigateRegister={() => setAuthView('register')} />
        )}
        <InstallAppModal />
      </>
    );
  }

  // Logged in
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <div>
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onOpenInstallAppModal={() => setShowInstallGuide(true)} 
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'tasks' && <DashboardPage />}
          {activeTab === 'history' && <PersonalHistoryPage />}
          {activeTab === 'progress' && (isAdminCap2 || isAdminTong) && <DepartmentTrackingPage />}
          {activeTab === 'review' && isAdminTong && <AdminReviewPage />}
          {activeTab === 'admin-tasks' && isAdminTong && <AdminTasksPage />}
          {activeTab === 'users' && (isAdminTong || isAdminCap2) && <AdminUsersPage />}
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-red-600">ĐOÀN TRƯỜNG</span>
            <span>•</span>
            <span>Hệ Thống Xác Nhận Bump Bài (Facebook • Instagram • TikTok)</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowInstallGuide(true)}
              className="inline-flex items-center space-x-1 text-slate-600 hover:text-red-600 font-bold transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-red-600" />
              <span>Cài đặt App / Tải APK</span>
            </button>
            <span className="text-slate-300">•</span>
            <p className="text-[11px] text-slate-400">
              4 Phân ban: Truyền thông • Thiết kế • Nhân sự • Hậu cần
            </p>
          </div>
        </div>
      </footer>

      {/* Install App / Add to Home Screen Guide Modal */}
      <InstallAppModal 
        isOpen={showInstallGuide} 
        onClose={() => setShowInstallGuide(false)} 
        forceShow={showInstallGuide} 
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
