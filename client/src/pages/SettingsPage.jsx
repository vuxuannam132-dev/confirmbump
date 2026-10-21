import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import DepartmentBadge from '../components/DepartmentBadge';
import { 
  Settings, 
  Sun, 
  Moon, 
  Sparkles, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Shield, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  KeyRound,
  Cloud,
  Database,
  UploadCloud,
  Check,
  Copy,
  RefreshCw,
  Server
} from 'lucide-react';

export default function SettingsPage() {
  const { user, deleteMyAccount } = useAuth();
  const { theme, setTheme } = useTheme();

  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Delete account state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ImgBB Cloud storage states (Only Admin Tổng)
  const [storageInfo, setStorageInfo] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN_TONG') {
      fetchStorageStatus();
    }
  }, [user]);

  const fetchStorageStatus = async (runTest = false) => {
    try {
      if (runTest) setTestLoading(true);
      else setStorageLoading(true);

      const res = await api.get(`/confirms/storage-status${runTest ? '?test=true' : ''}`);
      if (res.data.success) {
        setStorageInfo(res.data);
      }
    } catch (err) {
      console.warn('Error fetching storage status:', err);
    } finally {
      setStorageLoading(false);
      setTestLoading(false);
    }
  };

  const handleCopyVar = () => {
    navigator.clipboard.writeText('IMGBB_API_KEY');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const roleText = user?.role === 'ADMIN_TONG' 
    ? 'BCH (Admin Tổng)' 
    : (user?.role === 'ADMIN_CAP_2' ? 'BCH' : 'CTV');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdSuccess('');
    setPwdError('');

    if (!currentPassword || !newPassword) {
      setPwdError('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('Mật khẩu mới và mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setPwdLoading(true);
      const res = await api.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });

      if (res.data.success) {
        setPwdSuccess('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdError(res.data.message || 'Đổi mật khẩu thất bại.');
      }
    } catch (err) {
      setPwdError(err.response?.data?.message || err.message || 'Lỗi khi đổi mật khẩu.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (user?.role === 'ADMIN_TONG') {
      alert('Không thể tự xóa tài khoản Admin Tổng.');
      return;
    }

    if (deleteConfirmText !== user?.username) {
      setDeleteError(`Vui lòng nhập chính xác tên đăng nhập "${user?.username}" để xác nhận xóa.`);
      return;
    }

    try {
      setDeleteLoading(true);
      await deleteMyAccount();
    } catch (err) {
      setDeleteError(err.message || 'Lỗi khi xóa tài khoản');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto w-full overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs flex-shrink-0">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 animate-[spin_6s_linear_infinite]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
              Cài Đặt Hệ Thống & Tài Khoản
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              Tùy chỉnh giao diện, đổi mật khẩu và quản lý thông tin
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex-shrink-0">
          {roleText}
        </span>
      </div>

      {/* 1. Giao diện (Theme Selection) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            Giao Diện Hiển Thị (Themes)
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Lựa chọn chế độ màu sắc phù hợp với sở thích của bạn:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Light Theme */}
          <div
            onClick={() => setTheme('light')}
            className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative select-none ${
              theme === 'light'
                ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              {theme === 'light' && (
                <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  Đang dùng
                </span>
              )}
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Chế độ Sáng</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Giao diện tiêu chuẩn, tông trắng tinh gọn thanh lịch.
            </p>
          </div>

          {/* Dark Theme */}
          <div
            onClick={() => setTheme('dark')}
            className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative select-none ${
              theme === 'dark'
                ? 'border-indigo-500 bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-900/60 text-indigo-400 flex items-center justify-center">
                <Moon className="w-5 h-5" />
              </div>
              {theme === 'dark' && (
                <span className="text-[10px] font-black uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                  Đang dùng
                </span>
              )}
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Chế độ Tối</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Êm dịu mắt, tiết kiệm pin khi duyệt web vào ban đêm.
            </p>
          </div>

          {/* RGB Theme */}
          <div
            onClick={() => setTheme('rgb')}
            className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative select-none ${
              theme === 'rgb'
                ? 'border-transparent shadow-xl ring-2 ring-purple-500/40 bg-slate-950 text-white rgb-border rgb-glow'
                : 'border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 bg-white dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-400 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              {theme === 'rgb' && (
                <span className="text-[10px] font-black uppercase bg-gradient-to-r from-pink-500 to-cyan-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                  RGB NEON
                </span>
              )}
            </div>
            <h3 className="font-black text-sm rgb-gradient-text">
              RGB Thanh Niên
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Hiệu ứng viền LED chuyển màu động, phong cách Cyber Gaming!
            </p>
          </div>
        </div>
      </div>

      {/* 2. Đổi mật khẩu (Change Password) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-2">
          <KeyRound className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            Đổi Mật Khẩu Đăng Nhập
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Định kỳ đổi mật khẩu để bảo vệ an toàn cho tài khoản xác nhận bump của bạn:
        </p>

        {pwdSuccess && (
          <div className="p-3.5 bg-green-50 dark:bg-green-950/40 rounded-2xl border border-green-200 dark:border-green-800 flex items-center space-x-2.5 text-xs text-green-800 dark:text-green-200 font-bold">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{pwdSuccess}</span>
          </div>
        )}

        {pwdError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-800 flex items-center space-x-2.5 text-xs text-red-800 dark:text-red-200 font-bold">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{pwdError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3.5 max-w-lg">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Mật khẩu hiện tại:
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu bạn đang dùng"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Mật khẩu mới:
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Xác nhận mật khẩu mới:
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={pwdLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
            >
              {pwdLoading ? 'Đang cập nhật mật khẩu...' : 'Cập Nhật Mật Khẩu'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Thông tin tài khoản */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-2">
          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            Thông Tin Tài Khoản
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Họ và tên:</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 block">{user?.full_name}</span>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Tên đăng nhập:</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 block">@{user?.username}</span>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Email liên hệ:</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{user?.email}</span>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Vai trò:</span>
            <div className="mt-1 flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                {roleText}
              </span>
              <DepartmentBadge name={user?.department_name} code={user?.department_code} size="sm" />
            </div>
          </div>

          {user?.facebook_url && (
            <div className="sm:col-span-2 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 overflow-hidden min-w-0">
              <div className="min-w-0 flex-1 overflow-hidden">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Facebook liên kết:</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate select-all" title={user?.facebook_url}>
                  {user?.facebook_url}
                </p>
              </div>
              <a
                href={user?.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs inline-flex items-center hover:underline border border-blue-200/60 dark:border-blue-800/60 shadow-2xs active:scale-95 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Mở
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 4. Quản lý Lưu Trữ Đám Mây ImgBB (Dành riêng cho Admin Tổng) */}
      {user?.role === 'ADMIN_TONG' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Kho Lưu Trữ Ảnh Đám Mây (ImgBB Cloud)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Lưu trữ vĩnh viễn không giới hạn dung lượng, giải phóng bộ nhớ Database
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchStorageStatus(false)}
              disabled={storageLoading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Làm mới trạng thái"
            >
              <RefreshCw className={`w-4 h-4 ${storageLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          {/* Current Status Box */}
          <div className={`p-4 rounded-2xl border ${
            storageInfo?.hasKey 
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' 
              : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${storageInfo?.hasKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className={`text-xs font-black uppercase ${storageInfo?.hasKey ? 'text-emerald-900 dark:text-emerald-200' : 'text-amber-900 dark:text-amber-200'}`}>
                    {storageInfo?.hasKey ? 'ImgBB Cloud Đang Hoạt Động' : 'Chưa Cấu Hình ImgBB API Key'}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                  Phương thức lưu trữ: <span className="font-bold">{storageInfo?.storageType || 'Đang kiểm tra...'}</span>
                  {storageInfo?.keyMasked && (
                    <span className="ml-2 font-mono text-[11px] bg-white/70 dark:bg-slate-800 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                      Key: {storageInfo.keyMasked}
                    </span>
                  )}
                </p>
              </div>

              {storageInfo?.hasKey && (
                <button
                  type="button"
                  onClick={() => fetchStorageStatus(true)}
                  disabled={testLoading}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center flex-shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${testLoading ? 'animate-spin' : ''}`} />
                  {testLoading ? 'Đang test...' : 'Kiểm Tra Kết Nối'}
                </button>
              )}
            </div>

            {/* Test Result Message */}
            {storageInfo?.testResult && (
              <div className={`mt-3 p-2.5 rounded-xl text-xs font-semibold border ${
                storageInfo.testResult.ok 
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' 
                  : 'bg-white dark:bg-slate-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
              }`}>
                {storageInfo.testResult.ok ? '✅ ' : '❌ '}
                {storageInfo.testResult.message}
                {storageInfo.testResult.sampleUrl && (
                  <a 
                    href={storageInfo.testResult.sampleUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline inline-flex items-center"
                  >
                    Xem ảnh test ↗
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Setup Guide for Admin */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center">
              <UploadCloud className="w-4 h-4 mr-1.5 text-blue-600" />
              Hướng dẫn 3 bước kết nối ImgBB (Miễn phí 100%):
            </h3>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center flex-shrink-0 text-[11px] mt-0.5">
                  1
                </span>
                <p>
                  Truy cập trang API của ImgBB tại{' '}
                  <a 
                    href="https://api.imgbb.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center"
                  >
                    api.imgbb.com <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>{' '}
                  và bấm nút <b>"Get API Key"</b> (Đăng ký tài khoản miễn phí mất 30 giây).
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center flex-shrink-0 text-[11px] mt-0.5">
                  2
                </span>
                <p>
                  Sao chép chuỗi mã <b>API Key</b> (dạng chuỗi ký tự 32 chữ và số).
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center flex-shrink-0 text-[11px] mt-0.5">
                  3
                </span>
                <div className="space-y-1.5 flex-1">
                  <p>
                    Vào <b>Vercel Dashboard</b> &gt; Dự án <b>confirmbump</b> &gt; <b>Settings</b> &gt; <b>Environment Variables</b>:
                  </p>
                  <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500">Tên biến (Key):</span>
                    <code className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                      IMGBB_API_KEY
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyVar}
                      className="ml-auto text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-green-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copiedKey ? 'Đã copy' : 'Copy tên biến'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dán API Key vào ô <b>Value</b> &gt; Bấm <b>Save</b> &gt; Vào tab <b>Deployments</b> bấm <b>Redeploy</b> là hoàn tất!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Vùng nguy hiểm (Danger Zone - Xóa tài khoản) */}
      <div className="bg-red-50/50 dark:bg-red-950/20 rounded-3xl p-4 sm:p-6 border border-red-200 dark:border-red-900/50 shadow-xs space-y-3">
        <div className="flex items-center space-x-2">
          <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h2 className="text-sm sm:text-base font-black text-red-900 dark:text-red-300">
            Vùng Nguy Hiểm: Xóa Tài Khoản
          </h2>
        </div>
        <p className="text-xs text-red-700 dark:text-red-400">
          Khi xóa tài khoản, toàn bộ thông tin tài khoản và lịch sử nộp bump bài của bạn sẽ bị xóa vĩnh viễn khỏi hệ thống.
        </p>

        {user?.role === 'ADMIN_TONG' ? (
          <p className="text-xs italic text-red-500 font-bold pt-1">
            * Tài khoản Admin Tổng quản trị hệ thống không thể tự xóa.
          </p>
        ) : (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
            >
              Yêu Cầu Xóa Tài Khoản Của Tôi
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 dark:border-red-800 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black">Xác Nhận Xóa Vĩnh Viễn</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Hành động này <b>không thể hoàn tác</b>. Toàn bộ lịch sử xác nhận của bạn sẽ bị gỡ bỏ khỏi cơ sở dữ liệu.
            </p>

            {deleteError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 rounded-xl border border-red-200 text-xs text-red-700 font-bold">
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nhập tên đăng nhập <b>{user?.username}</b> để xác nhận:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={user?.username}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError('');
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Đang xóa...' : 'Đồng Ý Xóa Tài Khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
