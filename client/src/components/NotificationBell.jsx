import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Flame, 
  ShieldCheck, 
  Megaphone, 
  CheckCircle2, 
  XCircle, 
  Smartphone, 
  X,
  Volume2,
  AlertCircle
} from 'lucide-react';
import pushNotificationService from '../services/pushNotificationService';

const CATEGORIES = [
  { id: 'all', label: 'Tất Cả' },
  { id: 'task', label: 'Nhiệm Vụ' },
  { id: 'system', label: 'Hệ Thống' },
  { id: 'work', label: 'Công Việc' },
];

function getCategoryForType(type) {
  if (type === 'NEW_TASK' || type === 'CONFIRM_APPROVED' || type === 'CONFIRM_REJECTED') return 'task';
  if (type === 'NEW_CONFIRM') return 'system';
  if (type === 'ANNOUNCEMENT') return 'work';
  return 'task';
}

function getCategoryAccentClass(type) {
  if (type === 'NEW_TASK') return 'border-l-orange-400';
  if (type === 'NEW_CONFIRM') return 'border-l-emerald-400';
  if (type === 'ANNOUNCEMENT') return 'border-l-blue-400';
  if (type === 'CONFIRM_APPROVED') return 'border-l-green-400';
  if (type === 'CONFIRM_REJECTED') return 'border-l-red-400';
  return 'border-l-slate-300';
}

export default function NotificationBell({ onNavigateTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState('');
  const [foregroundToast, setForegroundToast] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const dropdownRef = useRef(null);

  const deviceEnv = pushNotificationService.getDeviceEnvironment();
  const isSupported = pushNotificationService.isSupported();

  // Load notifications from server
  const fetchNotifications = async () => {
    try {
      const data = await pushNotificationService.getNotifications();
      if (data && data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Không tải được thông báo:', err.message);
    }
  };

  // Check device push subscription status
  const checkPush = async () => {
    if (!isSupported) return;
    try {
      const sub = await pushNotificationService.isSubscribed();
      setIsSubscribed(sub);
    } catch (e) {
      setIsSubscribed(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    checkPush();

    // Auto poll notifications every 35 seconds
    const interval = setInterval(fetchNotifications, 35000);

    // Listen for push notifications when app is active in foreground
    const handleSwMessage = (event) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED') {
        setForegroundToast({
          title: event.data.title,
          body: event.data.body,
          url: event.data.url
        });
        fetchNotifications();
        setTimeout(() => setForegroundToast(null), 7000);
      }
    };

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle subscribe to Web Push
  const handleTogglePush = async () => {
    setSubscribing(true);
    setPushStatusMessage('');
    try {
      if (isSubscribed) {
        await pushNotificationService.unsubscribe();
        setIsSubscribed(false);
        setPushStatusMessage('Đã tắt nhận thông báo đẩy trên thiết bị này.');
      } else {
        await pushNotificationService.subscribe();
        setIsSubscribed(true);
        setPushStatusMessage('🎉 Thành công! Một thông báo thử nghiệm đã được gửi tới máy bạn.');
      }
    } catch (err) {
      setPushStatusMessage(`⚠️ ${err.message || 'Không thể bật thông báo.'}`);
    } finally {
      setSubscribing(false);
    }
  };

  // Test push notification directly to this device
  const handleTestPush = async () => {
    setTestingPush(true);
    setPushStatusMessage('');
    try {
      const res = await pushNotificationService.testMyDevice();
      if (res.success) {
        setPushStatusMessage('🔔 Đã bắn thông báo tới điện thoại! Trên iPhone, nếu đang mở app hãy khoá màn hình hoặc chuyển sang app khác trong 3 giây để thấy banner.');
      } else {
        setPushStatusMessage(`⚠️ ${res.message || 'Chưa gửi được thông báo.'}`);
      }
    } catch (err) {
      setPushStatusMessage(`⚠️ ${err.response?.data?.message || err.message}`);
    } finally {
      setTestingPush(false);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await pushNotificationService.markAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Mark single notification as read & handle link
  const handleNotificationClick = async (notif) => {
    if (notif.is_read === 0) {
      try {
        await pushNotificationService.markAsRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) {}
    }

    setIsOpen(false);

    if (onNavigateTab) {
      if (notif.type === 'NEW_TASK') {
        onNavigateTab('tasks');
      } else if (notif.type === 'NEW_CONFIRM') {
        onNavigateTab('review');
      } else if (notif.type === 'CONFIRM_APPROVED' || notif.type === 'CONFIRM_REJECTED') {
        onNavigateTab('history');
      } else if (
        notif.type === 'NEW_DEVICE_LOGIN' || 
        notif.type === '2FA_PROMPT' || 
        notif.type === 'LOGIN_SUCCESS' ||
        notif.link?.includes('tab=settings') ||
        notif.link?.includes('security')
      ) {
        onNavigateTab('settings');
        setTimeout(() => {
          const el = document.getElementById('device-tracking-section') || document.getElementById('security-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-red-500/60', 'transition-all');
            setTimeout(() => el.classList.remove('ring-4', 'ring-red-500/60'), 3000);
          }
        }, 350);
      } else {
        onNavigateTab('tasks');
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'NEW_TASK':
        return <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />;
      case 'NEW_CONFIRM':
        return <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-4 h-4 text-blue-500 flex-shrink-0" />;
      case 'CONFIRM_APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />;
      case 'CONFIRM_REJECTED':
        return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
      case 'NEW_DEVICE_LOGIN':
        return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
      case '2FA_PROMPT':
        return <ShieldCheck className="w-4 h-4 text-purple-500 flex-shrink-0" />;
      case 'LOGIN_SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500 flex-shrink-0" />;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffMin < 1) return 'Vừa xong';
      if (diffMin < 60) return `${diffMin} phút trước`;
      if (diffHour < 24) return `${diffHour} giờ trước`;
      if (diffDay < 7) return `${diffDay} ngày trước`;
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  // Compute unread counts per category
  const categoryUnread = (catId) => {
    if (catId === 'all') return unreadCount;
    return notifications.filter(n => getCategoryForType(n.type) === catId && n.is_read === 0).length;
  };

  // Filtered notifications
  const filteredNotifications = activeCategory === 'all'
    ? notifications
    : notifications.filter(n => getCategoryForType(n.type) === activeCategory);

  return (
    <>
      {/* Foreground Toast Notification Banner for active app viewing */}
      {foregroundToast && (
        <div 
          onClick={() => {
            const url = foregroundToast.url || '';
            const isSecurity = foregroundToast.title?.includes('Đăng nhập') || foregroundToast.title?.includes('2FA') || url.includes('settings');
            if (onNavigateTab) {
              if (isSecurity) {
                onNavigateTab('settings');
                setTimeout(() => {
                  const el = document.getElementById('device-tracking-section') || document.getElementById('security-section');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-4', 'ring-red-500/60', 'transition-all');
                    setTimeout(() => el.classList.remove('ring-4', 'ring-red-500/60'), 3000);
                  }
                }, 350);
              } else {
                onNavigateTab('tasks');
              }
            }
            setForegroundToast(null);
          }}
          className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-[70] p-3.5 bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-blue-500/60 backdrop-blur-md flex items-start space-x-3 cursor-pointer animate-in slide-in-from-top duration-300 select-none"
        >
          <div className="p-2 bg-blue-600 rounded-xl flex-shrink-0">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Thông báo mới</span>
              <span className="text-[9px] text-slate-400">Vừa xong</span>
            </div>
            <h4 className="text-xs font-black text-white truncate mt-0.5">{foregroundToast.title}</h4>
            <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">{foregroundToast.body}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setForegroundToast(null);
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="relative inline-block" ref={dropdownRef}>
        {/* Bell Trigger Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) fetchNotifications();
          }}
          className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 border border-slate-200 dark:border-slate-700 active:scale-95"
          title="Thông báo hệ thống"
          aria-label="Thông báo"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce shadow-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Popover / Dropdown Menu */}
        {isOpen && (
          <div 
            className="fixed inset-x-2 top-14 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-1 w-auto sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Blue Header */}
            <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-white" />
                <span className="font-extrabold text-xs text-white uppercase tracking-wider">
                  Thông Báo
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white whitespace-nowrap">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-blue-100 hover:text-white flex items-center space-x-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Đọc hết</span>
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-2 pt-2 gap-1 overflow-x-auto no-scrollbar">
              {CATEGORIES.map(cat => {
                const count = cat.id !== 'all' ? categoryUnread(cat.id) : 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-t-lg text-[11px] font-bold whitespace-nowrap transition-all duration-150 active:scale-95 flex-shrink-0 ${
                      activeCategory === cat.id
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>{cat.label}</span>
                    {count > 0 && (
                      <span className="px-1 py-0.5 rounded-full text-[9px] font-black bg-red-500 text-white leading-none">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Web Push Prompt / Toggle Banner */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <div className="text-[10px] leading-tight min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {isSubscribed ? '🔔 Đã bật thông báo điện thoại' : 'Nhận thông báo như ứng dụng'}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 block truncate">
                      {isSubscribed 
                        ? 'Rung/chuông khi có task hoặc duyệt mới'
                        : (deviceEnv.isIOS && !deviceEnv.isStandalone 
                            ? 'Cần Thêm vào MH chính trên iPhone' 
                            : 'Bật để không bỏ lỡ hạn chót')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {isSubscribed && (
                    <button
                      type="button"
                      onClick={handleTestPush}
                      disabled={testingPush}
                      className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 hover:bg-blue-200 border border-blue-300 dark:border-blue-800 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {testingPush ? '...' : 'Thử'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleTogglePush}
                    disabled={subscribing}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tight transition-all active:scale-95 ${
                      isSubscribed 
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                    }`}
                  >
                    {subscribing ? '...' : (isSubscribed ? 'Tắt' : 'Bật')}
                  </button>
                </div>
              </div>
              {pushStatusMessage && (
                <p className="mt-1.5 p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 text-[10px] font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 animate-in fade-in leading-relaxed">
                  {pushStatusMessage}
                </p>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Chưa có thông báo nào
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Các thông báo task mới, duyệt confirm sẽ hiển thị ở đây
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 pl-3.5 transition-colors cursor-pointer flex items-start space-x-2.5 select-none border-l-4 ${getCategoryAccentClass(notif.type)} ${
                      notif.is_read === 0 
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex-shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs truncate ${notif.is_read === 0 ? 'font-black text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0">
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.body}
                      </p>
                    </div>
                    {notif.is_read === 0 && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5 shadow-xs animate-pulse" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Đoàn Trường Đại Học - Hệ thống tương tác MXH
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
