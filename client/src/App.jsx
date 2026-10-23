import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminTasksPage from './pages/AdminTasksPage';
import AdminReviewPage from './pages/AdminReviewPage';
import DepartmentTrackingPage from './pages/DepartmentTrackingPage';
import AdminUsersPage from './pages/AdminUsersPage';
import PersonalHistoryPage from './pages/PersonalHistoryPage';
import SettingsPage from './pages/SettingsPage';
import InstallAppModal from './components/InstallAppModal';
import { Smartphone } from 'lucide-react';

function AppContent() {
  const { user, loading, isAdminTong, isAdminCap2, isReviewer, canReview, canTrackProgress } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'history', 'progress', 'review', 'admin-tasks', 'users', 'settings'
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors">
      <div>
        {/* Modern Left Sidebar & Responsive Mobile Drawer */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onOpenInstallAppModal={() => setShowInstallGuide(true)} 
        />

        {/* Main Content Area (padded on left for desktop sidebar) */}
        <div className="lg:pl-64 flex flex-col min-h-screen">
          <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-10 flex-1">
            {activeTab === 'tasks' && <DashboardPage />}
            {activeTab === 'history' && <PersonalHistoryPage />}
            {activeTab === 'progress' && canTrackProgress && <DepartmentTrackingPage />}
            {activeTab === 'review' && canReview && <AdminReviewPage />}
            {activeTab === 'admin-tasks' && isAdminTong && <AdminTasksPage />}
            {activeTab === 'users' && (isAdminTong || isAdminCap2) && <AdminUsersPage />}
            {activeTab === 'settings' && <SettingsPage />}
          </main>

          {/* Footer credit: Dev by Xuân Nam-quả trứng tròn vo */}
          <footer className="w-full py-3.5 px-4 text-center border-t border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xs select-none">
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-wide inline-flex items-center justify-center space-x-1.5">
              <span>Dev by</span>
              <span className="font-extrabold text-slate-700 dark:text-slate-200">Xuân Nam</span>
              <span>-</span>
              <span className="text-amber-500 dark:text-amber-400 font-bold">quả trứng tròn vo</span>
              <span className="inline-block text-xs">🥚</span>
            </p>
          </footer>
        </div>
      </div>

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
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
