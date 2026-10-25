import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api, { getClientDeviceId, getClientDeviceName } from '../services/api';
import pushNotificationService from '../services/pushNotificationService';
import DepartmentBadge from '../components/DepartmentBadge';
import UserAvatar, { AVATAR_PRESETS, renderPresetIcon } from '../components/UserAvatar';
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
  ShieldCheck,
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
  Server,
  Bell,
  Smartphone,
  Laptop,
  Monitor,
  Globe,
  MapPin,
  Clock,
  Camera,
  Image as ImageIcon,
  Flame,
  Star,
  Trophy,
  Crown,
  Heart,
  Zap,
  Compass,
  Info,
  LogOut,
  Sliders
} from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser, deleteMyAccount } = useAuth();
  const { theme, setTheme } = useTheme();

  // Avatar States
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_url || 'icon:flame:#EF4444');
  const [avatarTab, setAvatarTab] = useState(
    user?.avatar_url && !user.avatar_url.startsWith('icon:') ? 'custom' : 'preset'
  );
  const [customAvatarUrl, setCustomAvatarUrl] = useState(
    user?.avatar_url && !user.avatar_url.startsWith('icon:') ? user.avatar_url : ''
  );
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState(null);

  // Device Sessions States
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionActionId, setSessionActionId] = useState(null);
  const [sessionMsg, setSessionMsg] = useState(null);

  // 2FA States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    user?.two_factor_enabled === 1 || user?.two_factor_enabled === true
  );
  const [twoFactorMethod, setTwoFactorMethod] = useState(user?.two_factor_method || 'EMAIL');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorMsg, setTwoFactorMsg] = useState(null);

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

  // Push Notification States
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState(null);
  const [testingPush, setTestingPush] = useState(false);

  const currentDeviceId = getClientDeviceId();
  const isPushSupported = pushNotificationService.isSupported();

  useEffect(() => {
    checkPushStatus();
    fetchSessions();

    const checkFocus = () => {
      const params = new URLSearchParams(window.location.search);
      const focus = params.get('focus');
      const hash = window.location.hash;
      if (focus === 'security' || hash === '#security' || focus === 'devices') {
        setTimeout(() => {
          const target = document.getElementById('device-tracking-section') || document.getElementById('security-section');
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('ring-4', 'ring-red-500/60', 'transition-all');
            setTimeout(() => target.classList.remove('ring-4', 'ring-red-500/60'), 3500);
          }
        }, 350);
      }
    };

    checkFocus();
    window.addEventListener('hashchange', checkFocus);
    return () => window.removeEventListener('hashchange', checkFocus);
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN_TONG') {
      fetchStorageStatus();
    }
  }, [user]);

  const checkPushStatus = async () => {
    if (!isPushSupported) return;
    try {
      const sub = await pushNotificationService.isSubscribed();
      setIsPushSubscribed(sub);
    } catch (e) {
      setIsPushSubscribed(false);
    }
  };

  const handleTogglePush = async () => {
    setPushLoading(true);
    setPushMessage(null);
    try {
      if (isPushSubscribed) {
        await pushNotificationService.unsubscribe();
        setIsPushSubscribed(false);
        setPushMessage({ type: 'success', text: 'Đã hủy nhận thông báo đẩy trên thiết bị này.' });
      } else {
        await pushNotificationService.subscribe();
        setIsPushSubscribed(true);
        setPushMessage({ type: 'success', text: '🎉 Tuyệt vời! Thiết bị này đã sẵn sàng nhận thông báo đẩy. Một thông báo thử nghiệm đã được gửi tới máy bạn.' });
      }
    } catch (err) {
      setPushMessage({ type: 'error', text: err.message || 'Lỗi khi cài đặt thông báo.' });
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    setPushMessage(null);
    try {
      const res = await pushNotificationService.testMyDevice();
      if (res.success) {
        setPushMessage({
          type: 'success',
          text: '🔔 Đã bắn thông báo thử nghiệm tới điện thoại! Trên iPhone, nếu bạn đang mở app hãy khoá màn hình hoặc chuyển sang ứng dụng khác trong 3 giây để thấy biểu ngữ thông báo xuất hiện.'
        });
      } else {
        setPushMessage({ type: 'error', text: res.message || 'Không gửi được thông báo.' });
      }
    } catch (err) {
      setPushMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setTestingPush(false);
    }
  };

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

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await api.get('/auth/sessions');
      if (res.data.success) {
        setSessions(res.data.sessions || []);
      }
    } catch (e) {
      console.warn('Error fetching sessions:', e);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleTrustSession = async (session) => {
    setSessionActionId(session.id);
    setSessionMsg(null);
    try {
      const res = await api.post('/auth/sessions/trust', { session_id: session.id, device_id: session.device_id });
      if (res.data.success) {
        setSessionMsg({ type: 'success', text: `Đã đánh dấu "${session.device_name}" là thiết bị tin cậy!` });
        fetchSessions();
      }
    } catch (err) {
      setSessionMsg({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSessionActionId(null);
    }
  };

  const handleRevokeSession = async (session) => {
    if (!window.confirm(`Bạn có chắc muốn thu hồi phiên đăng nhập trên "${session.device_name}"?`)) return;
    setSessionActionId(session.id);
    setSessionMsg(null);
    try {
      const res = await api.post('/auth/sessions/revoke', { session_id: session.id, device_id: session.device_id });
      if (res.data.success) {
        setSessionMsg({ type: 'success', text: 'Đã thu hồi phiên đăng nhập thành công!' });
        fetchSessions();
      }
    } catch (err) {
      setSessionMsg({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSessionActionId(null);
    }
  };

  const handleToggle2FA = async (newEnabled, newMethod = twoFactorMethod) => {
    setTwoFactorLoading(true);
    setTwoFactorMsg(null);
    try {
      const res = await api.post('/auth/2fa/toggle', { enabled: newEnabled, method: newMethod });
      if (res.data.success) {
        setTwoFactorEnabled(newEnabled);
        setTwoFactorMethod(newMethod);
        if (updateUser) {
          updateUser({ two_factor_enabled: newEnabled ? 1 : 0, two_factor_method: newMethod });
        }
        setTwoFactorMsg({ type: 'success', text: res.data.message });
      }
    } catch (err) {
      setTwoFactorMsg({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleSaveAvatar = async () => {
    const avatarToSave = avatarTab === 'preset' ? selectedAvatar : customAvatarUrl.trim();
    if (!avatarToSave) {
      setAvatarMsg({ type: 'error', text: 'Vui lòng chọn hoặc tải ảnh đại diện hợp lệ.' });
      return;
    }
    setAvatarLoading(true);
    setAvatarMsg(null);
    try {
      const res = await api.post('/auth/update-avatar', { avatar_url: avatarToSave });
      if (res.data.success) {
        if (updateUser) {
          updateUser({ avatar_url: avatarToSave });
        }
        setAvatarMsg({ type: 'success', text: '🎉 Cập nhật ảnh đại diện thành công!' });
      }
    } catch (err) {
      setAvatarMsg({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleFileUploadAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setAvatarMsg({ type: 'error', text: 'Ảnh tải lên vượt quá 4MB. Vui lòng chọn ảnh nhỏ hơn.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (base64) {
        setCustomAvatarUrl(base64);
        setSelectedAvatar(base64);
        setAvatarTab('custom');
      }
    };
    reader.readAsDataURL(file);
  };

  const getDeviceIcon = (osName = '', browserName = '') => {
    const lower = (osName + ' ' + browserName).toLowerCase();
    if (lower.includes('ios') || lower.includes('iphone') || lower.includes('android')) {
      return <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
    if (lower.includes('mac') || lower.includes('laptop')) {
      return <Laptop className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    }
    return <Monitor className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
  };

  const formatSessionDate = (dateStr) => {
    if (!dateStr) return 'Vừa mới đây';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const roleText = user?.role === 'ADMIN_TONG' 
    ? 'BCH (Admin Tổng)' 
    : (user?.role === 'ADMIN_CAP_2' ? 'BCH' : (user?.role === 'KIEM_DUYET' ? 'Người kiểm duyệt' : 'CTV'));

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
    <div className="space-y-6 max-w-4xl mx-auto w-full select-none">
      {/* Facebook-style Profile Header */}
      <div className="-mx-3 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-8 mb-6">
        {/* Cover Banner */}
        <div className="relative h-40 sm:h-52 overflow-hidden">
          <img 
            src={user?.cover_url || '/anhnen.jpg'} 
            alt="Ảnh bìa" 
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = '/anhnen.jpg'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
        </div>
        
        {/* Avatar overlapping banner */}
        <div className="relative px-4 sm:px-6">
          <div className="-mt-14 sm:-mt-16 mb-3 flex items-end justify-between">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 overflow-hidden shadow-xl">
                <UserAvatar user={user} size="xl" className="w-full h-full" />
              </div>
            </div>
          </div>
          
          {/* Name, username, role */}
          <div className="mt-1">
            <h1 className="text-xl font-black text-slate-900 dark:text-white">{user?.full_name || 'Tên thành viên'}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">@{user?.username}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                user?.role === 'ADMIN_TONG' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400' :
                user?.role === 'ADMIN_CAP_2' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400' :
                user?.role === 'KIEM_DUYET' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400' :
                'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
              }`}>
                {user?.role === 'ADMIN_TONG' ? '👑 Admin Tổng' :
                 user?.role === 'ADMIN_CAP_2' ? '🛡️ BCH' :
                 user?.role === 'KIEM_DUYET' ? '🔍 Kiểm Duyệt' : '🌟 CTV'}
              </span>
              {user?.department_name && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  📌 {user.department_name}
                </span>
              )}
            </div>
            
            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => document.getElementById('edit-profile-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
              >
                <span>✏️ Chỉnh sửa trang cá nhân</span>
              </button>
              <button
                onClick={() => document.getElementById('security-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-sm font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all"
              >
                <span>🔐 Bảo mật & 2FA</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs flex-shrink-0">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
              Cài Đặt Hệ Thống & Bảo Mật
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              Avatar, xác thực 2FA, theo dõi thiết bị đăng nhập và đổi mật khẩu
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex-shrink-0">
          {roleText}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 1. HỒ SƠ & ẢNH ĐẠI DIỆN (AVATAR SYSTEM) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Ảnh Đại Diện (Avatar Cá Nhân)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Chọn biểu tượng sắc màu đặc trưng hoặc tải ảnh chân dung tùy thích
              </p>
            </div>
          </div>
        </div>

        {avatarMsg && (
          <div className={`p-3 rounded-2xl text-xs font-bold border animate-in fade-in ${
            avatarMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300'
          }`}>
            {avatarMsg.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
          {/* Preview Current Avatar */}
          <div className="flex flex-col items-center space-y-2 flex-shrink-0">
            <div className="relative group">
              <UserAvatar 
                user={{ ...user, avatar_url: avatarTab === 'preset' ? selectedAvatar : (customAvatarUrl || user?.avatar_url) }} 
                size="xl" 
                className="ring-4 ring-slate-100 dark:ring-slate-800 shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-slate-800 rounded-full shadow-md text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Xem trước
            </span>
          </div>

          {/* Controls */}
          <div className="flex-1 w-full space-y-3">
            {/* Tabs: Preset vs Custom */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl max-w-sm">
              <button
                type="button"
                onClick={() => setAvatarTab('preset')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all ${
                  avatarTab === 'preset'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                ✨ Biểu Tượng Sắc Màu
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab('custom')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all ${
                  avatarTab === 'custom'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                🖼️ Tải Ảnh Lên / Link
              </button>
            </div>

            {/* Mode 1: Presets Picker */}
            {avatarTab === 'preset' ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Chọn biểu tượng phù hợp với phong cách của bạn trong Đoàn:
                </p>
                <div className="grid grid-cols-5 sm:grid-cols-5 gap-2.5 max-w-md">
                  {AVATAR_PRESETS.map((preset) => {
                    const isSelected = selectedAvatar === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedAvatar(preset.id)}
                        className={`flex flex-col items-center p-2 rounded-2xl border-2 transition-all active:scale-95 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                        }`}
                        title={preset.name}
                      >
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs mb-1"
                          style={{ backgroundColor: preset.color }}
                        >
                          {renderPresetIcon(preset.icon, 'w-5 h-5 text-white fill-white/20')}
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate w-full text-center">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Mode 2: Custom upload / URL */
              <div className="space-y-3 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Tải ảnh từ máy tính / điện thoại:
                  </label>
                  <label className="flex items-center justify-center space-x-2 px-4 py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:border-blue-500 cursor-pointer bg-slate-50 dark:bg-slate-800/50 transition-colors">
                    <UploadCloud className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Chọn file ảnh từ thiết bị
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileUploadAvatar}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Hoặc dán URL ảnh trực tiếp:
                  </label>
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => {
                      setCustomAvatarUrl(e.target.value);
                      setSelectedAvatar(e.target.value);
                    }}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveAvatar}
                disabled={avatarLoading}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 inline-flex items-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{avatarLoading ? 'Đang lưu...' : 'Lưu Ảnh Đại Diện'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BẢO MẬT & XÁC THỰC 2 LỚP (2FA) */}
      {/* ========================================================================= */}
      <div id="security-section" className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Xác Thực 2 Lớp Bảo Mật (2FA)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Bảo vệ tài khoản an toàn tuyệt đối khi đăng nhập từ thiết bị lạ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
              twoFactorEnabled 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' 
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {twoFactorEnabled ? '🛡️ 2FA Đang Bật' : '⚠️ 2FA Đang Tắt'}
            </span>

            <button
              type="button"
              onClick={() => handleToggle2FA(!twoFactorEnabled)}
              disabled={twoFactorLoading}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50 ${
                twoFactorEnabled
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
            >
              {twoFactorLoading ? 'Đang cập nhật...' : (twoFactorEnabled ? 'Tắt 2FA' : 'Kích Hoạt 2FA Ngay')}
            </button>
          </div>
        </div>

        {twoFactorMsg && (
          <div className={`p-3 rounded-2xl text-xs font-bold border animate-in fade-in ${
            twoFactorMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300'
          }`}>
            {twoFactorMsg.text}
          </div>
        )}

        {/* 2FA Method Selector */}
        <div className="space-y-3 pt-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
            Phương thức xác minh danh tính khi có đăng nhập mới:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Method 1: Email 9-digit OTP */}
            <div
              onClick={() => {
                if (twoFactorEnabled) handleToggle2FA(true, 'EMAIL');
                else setTwoFactorMethod('EMAIL');
              }}
              className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                twoFactorMethod === 'EMAIL'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                  Khuyên Dùng
                </span>
              </div>
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                Mã OTP 9 số qua Email
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Gửi mã xác thực 9 số ngẫu nhiên về email đã đăng ký của bạn ({user?.email}) mỗi khi phát hiện thiết bị lạ.
              </p>
            </div>

            {/* Method 2: Trusted Device Prompt */}
            <div
              onClick={() => {
                if (twoFactorEnabled) handleToggle2FA(true, 'TRUSTED_DEVICE');
                else setTwoFactorMethod('TRUSTED_DEVICE');
              }}
              className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                twoFactorMethod === 'TRUSTED_DEVICE'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-full">
                  Tiện Lợi
                </span>
              </div>
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                Xác Thực Qua Thiết Bị Tin Cậy
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Chỉ điện thoại / máy tính được đánh dấu là "Thiết bị tin cậy" mới đăng nhập được ngay mà không cần chờ OTP.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. THEO DÕI THIẾT BỊ & LỊCH SỬ ĐĂNG NHẬP */}
      {/* ========================================================================= */}
      <div id="device-tracking-section" className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 scroll-mt-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Theo Dõi Thiết Bị & Lịch Sử Đăng Nhập
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quản lý các máy đang truy cập, đánh dấu thiết bị tin cậy hoặc thu hồi quyền truy cập
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchSessions}
            disabled={sessionsLoading}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Làm mới danh sách thiết bị"
          >
            <RefreshCw className={`w-4 h-4 ${sessionsLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

        {sessionMsg && (
          <div className={`p-3 rounded-2xl text-xs font-bold border animate-in fade-in ${
            sessionMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300'
          }`}>
            {sessionMsg.text}
          </div>
        )}

        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {sessionsLoading ? 'Đang tải danh sách thiết bị...' : 'Chưa có thông tin phiên đăng nhập nào.'}
            </div>
          ) : (
            sessions.map((session) => {
              const isCurrent = session.device_id === currentDeviceId;
              const isTrusted = session.is_trusted === 1 || session.is_trusted === true;
              const isActing = sessionActionId === session.id;

              return (
                <div 
                  key={session.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                    isCurrent 
                      ? 'border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20' 
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                      {getDeviceIcon(session.os_name, session.browser_name)}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                          {session.device_name || `${session.browser_name} trên ${session.os_name}`}
                        </span>

                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-600 text-white">
                            Thiết bị này
                          </span>
                        )}

                        {isTrusted ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 inline-flex items-center">
                            <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Tin cậy
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                            Chưa tin cậy
                          </span>
                        )}

                        <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Online</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center">
                          <Globe className="w-3 h-3 mr-1 text-slate-400" />
                          IP: <code className="font-mono ml-1 font-bold text-slate-700 dark:text-slate-300">{session.ip_address || '127.0.0.1'}</code>
                        </span>
                        <span className="inline-flex items-center">
                          <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                          {session.location_text || 'Việt Nam'}
                        </span>
                        <span className="inline-flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-slate-400" />
                          {formatSessionDate(session.last_seen)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Session Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                    {!isTrusted && (
                      <button
                        type="button"
                        onClick={() => handleTrustSession(session)}
                        disabled={isActing}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800 transition-all active:scale-95 disabled:opacity-50"
                      >
                        Đặt Tin Cậy
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRevokeSession(session)}
                      disabled={isActing}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 transition-all active:scale-95 disabled:opacity-50 inline-flex items-center space-x-1"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>{isCurrent ? 'Đăng Xuất' : 'Thu Hồi'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. GIAO DIỆN HIỂN THỊ (LIGHT / DARK THEMES) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            Giao Diện Hiển Thị (Themes)
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Lựa chọn chế độ màu sắc sáng hoặc tối tùy theo nhu cầu sử dụng của bạn:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ĐỔI MẬT KHẨU ĐĂNG NHẬP */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 6. THÔNG BÁO ĐẨY ĐIỆN THOẠI (WEB PUSH) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Thông Báo Đẩy Điện Thoại (Push Notifications)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nhận chuông và rung thông báo trực tiếp về màn hình khoá như một ứng dụng di động thật
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
              isPushSubscribed 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' 
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {isPushSubscribed ? '🔔 Đang Bật' : '🔕 Đang Tắt'}
            </span>

            {isPushSubscribed && (
              <button
                type="button"
                onClick={handleTestPush}
                disabled={testingPush}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/80 hover:bg-red-200 border border-red-300 dark:border-red-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {testingPush ? 'Đang gửi...' : 'Gửi Thử Nghiệm Tới Máy'}
              </button>
            )}

            <button
              type="button"
              onClick={handleTogglePush}
              disabled={pushLoading}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50 ${
                isPushSubscribed
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                  : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
              }`}
            >
              {pushLoading ? 'Đang xử lý...' : (isPushSubscribed ? 'Tắt Trên Thiết Bị Này' : 'Bật Thông Báo Ngay')}
            </button>
          </div>
        </div>

        {pushMessage && (
          <div className={`p-3 rounded-2xl text-xs font-bold border ${
            pushMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300'
          }`}>
            {pushMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Quyền lợi nhận thông báo của bạn:</span>
            <p className="text-slate-700 dark:text-slate-300 mt-1 font-medium leading-relaxed">
              {user?.role === 'ADMIN_TONG' && (
                <>⭐ <b>BCH (Admin Tổng):</b> Nhận thông báo ngay khi có đoàn viên nộp minh chứng bump bài để vào duyệt, cảnh báo đăng nhập thiết bị mới và có quyền phát thông báo toàn đoàn.</>
              )}
              {user?.role === 'KIEM_DUYET' && (
                <>⭐ <b>Người kiểm duyệt:</b> Nhận thông báo tức thì khi có đoàn viên nộp minh chứng bump bài (cả 4 ban), và nhận thông báo khi có nhiệm vụ mới.</>
              )}
              {user?.role === 'ADMIN_CAP_2' && (
                <>⭐ <b>BCH:</b> Nhận thông báo khi có nhiệm vụ bump bài mới cho ban mình / toàn đoàn, và thông báo công việc chung.</>
              )}
              {user?.role === 'USER' && (
                <>⭐ <b>CTV:</b> Nhận thông báo ngay khi Admin đăng task bump bài mới và nhận thông báo khi bài nộp của bạn được Duyệt hoặc Từ chối.</>
              )}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Hướng dẫn trên iPhone & Android:</span>
            <div className="mt-1 space-y-1.5 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              <p>
                📱 <b>iPhone/iPad (iOS 16.4+):</b> Mở Safari &rarr; bấm nút <b>Chia sẻ (Share ⬆️)</b> &rarr; chọn <b>"Thêm vào Màn hình chính"</b>. Sau đó mở app từ màn hình chính để nhận thông báo đẩy.
              </p>
              <p>
                🔒 <b>Cơ chế thông báo iOS:</b> Khi bạn đang mở app, iOS sẽ không hiện biểu ngữ che màn hình. Hãy <b>khoá màn hình</b> hoặc <b>thoát app</b> trong 3 giây để thấy thông báo xuất hiện trên màn hình khoá!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. THÔNG TIN TÀI KHOẢN */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 8. KHO LƯU TRỮ ẢNH ĐÁM MÂY (IMGBB CLOUD) - CHỈ ADMIN TỔNG */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 9. VÙNG NGUY HIỂM: XÓA TÀI KHOẢN */}
      {/* ========================================================================= */}
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
