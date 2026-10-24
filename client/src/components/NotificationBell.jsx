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
  ExternalLink,
  X,
  Volume2,
  AlertCircle
} from 'lucide-react';
import pushNotificationService from '../services/pushNotificationService';

export default function NotificationBell({ onNavigateTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState('');
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
    return () => clearInterval(interval);
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
        setPushStatusMessage('🎉 Thành công! Thiết bị sẽ nhận được thông báo đẩy.');
      }
    } catch (err) {
      setPushStatusMessage(`⚠️ ${err.message || 'Không thể bật thông báo.'}`);
    } finally {
      setSubscribing(false);
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
      if (notif.type === 'NEW_TASK') onNavigateTab('tasks');
      else if (notif.type === 'NEW_CONFIRM') onNavigateTab('review');
      else if (notif.type === 'CONFIRM_APPROVED' || notif.type === 'CONFIRM_REJECTED') onNavigateTab('history');
      else onNavigateTab('tasks');
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

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 active:scale-95"
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
          className="fixed inset-x-2 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-red-600" />
              <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Thông Báo Đoàn Trường
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc hết</span>
              </button>
            )}
          </div>

          {/* Web Push Prompt / Toggle Banner */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-red-50/60 to-amber-50/60 dark:from-red-950/20 dark:to-amber-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 pr-2">
                <Smartphone className="w-4 h-4 text-red-600 flex-shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {isSubscribed ? '🔔 Đã bật thông báo trên điện thoại' : 'Nhận thông báo như ứng dụng'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    {isSubscribed 
                      ? 'Thiết bị sẽ rung/chuông khi có task hoặc duyệt mới.' 
                      : (deviceEnv.isIOS && !deviceEnv.isStandalone 
                          ? 'Cần Thêm vào MH chính trên iPhone để bật' 
                          : 'Bật để không bỏ lỡ hạn chót nộp')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTogglePush}
                disabled={subscribing}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black tracking-tight transition-all active:scale-95 flex-shrink-0 ${
                  isSubscribed 
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300' 
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-xs'
                }`}
              >
                {subscribing ? 'Đang xử lý...' : (isSubscribed ? 'Tắt' : 'Bật Ngay')}
              </button>
            </div>
            {pushStatusMessage && (
              <p className="mt-1.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 animate-in fade-in">
                {pushStatusMessage}
              </p>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {notifications.length === 0 ? (
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
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 transition-colors cursor-pointer flex items-start space-x-3 select-none ${
                    notif.is_read === 0 
                      ? 'bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs truncate pr-1 ${notif.is_read === 0 ? 'font-black text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
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
                    <span className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0 mt-1.5 shadow-xs animate-pulse" />
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
  );
}
