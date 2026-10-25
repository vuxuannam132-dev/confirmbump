import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  Smartphone, 
  Volume2, 
  Sparkles, 
  Send, 
  ShieldCheck, 
  Flame,
  ArrowRight
} from 'lucide-react';
import pushNotificationService from '../services/pushNotificationService';

const STORAGE_KEY = 'confirmbump_notify_permission_seen_v1';

export default function NotifyPermissionModal({ isOpen, onClose, forceShow = false }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('info'); // info, success, error

  const deviceEnv = pushNotificationService.getDeviceEnvironment();
  const isSupported = pushNotificationService.isSupported();

  useEffect(() => {
    // Check subscription status
    if (isSupported) {
      pushNotificationService.isSubscribed().then(sub => {
        setIsSubscribed(sub);
      }).catch(() => {});
    }

    if (!forceShow) {
      const hasSeen = localStorage.getItem(STORAGE_KEY);
      if (!hasSeen) {
        // Wait until install modal is seen/closed, or prompt after delay
        const checkGuideAndPrompt = () => {
          const installGuideSeen = localStorage.getItem('confirmbump_install_guide_seen_v1');
          if (installGuideSeen) {
            setInternalOpen(true);
          } else {
            // Re-check periodically
            timer = setTimeout(checkGuideAndPrompt, 1000);
          }
        };
        let timer = setTimeout(checkGuideAndPrompt, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [forceShow, isSupported]);

  const isVisible = forceShow ? isOpen : (isOpen !== undefined ? isOpen : internalOpen);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setInternalOpen(false);
    if (onClose) onClose();
  };

  const handleEnablePush = async () => {
    setSubscribing(true);
    setStatusMsg('');
    try {
      await pushNotificationService.subscribe();
      setIsSubscribed(true);
      setStatusType('success');
      setStatusMsg('🎉 Bật thông báo thành công! Một thông báo thử nghiệm đã được gửi tới máy bạn.');
    } catch (err) {
      setStatusType('error');
      setStatusMsg(err.message || 'Không thể bật thông báo. Vui lòng kiểm tra quyền trong cài đặt thiết bị.');
    } finally {
      setSubscribing(false);
    }
  };

  const handleTestPush = async () => {
    setTesting(true);
    setStatusMsg('');
    try {
      const res = await pushNotificationService.testMyDevice();
      if (res && res.success) {
        setStatusType('success');
        setStatusMsg('🔔 Đã bắn thông báo thử nghiệm! Nếu bạn đang mở app, hãy khoá màn hình hoặc thoát app trong 3 giây để thấy biểu ngữ trên iPhone/Android.');
      } else {
        setStatusType('error');
        setStatusMsg(res?.message || 'Không gửi được thông báo.');
      }
    } catch (err) {
      setStatusType('error');
      setStatusMsg(err.response?.data?.message || err.message || 'Lỗi gửi thử nghiệm.');
    } finally {
      setTesting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-5 sm:p-6 text-white text-center overflow-hidden">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-yellow-400/20 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-white/20 rounded-full blur-xl pointer-events-none" />

          <button
            onClick={handleClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all duration-150 active:scale-95"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md shadow-md border border-white/30 mb-2">
            <Bell className="w-6 h-6 text-yellow-300 animate-bounce" />
          </div>

          <h3 className="text-lg font-black tracking-tight">
            Nhận Thông Báo Đoàn Trường
          </h3>
          <p className="text-xs text-blue-100 font-medium mt-1">
            Không bỏ lỡ hạn chót nộp bump bài và kết quả phê duyệt
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Benefit items */}
          <div className="space-y-2.5">
            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
              <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Flame className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-100">Báo ngay khi có Task mới</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Điện thoại rung & chuông khi Admin vừa đăng bài để bạn vào tương tác kịp thời.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-100">Báo kết quả duyệt minh chứng</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Biết ngay ảnh confirm của bạn đã được chấp nhận hay cần nộp lại.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-100">Cảnh báo bảo mật tài khoản</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Báo về máy khi có ai đó cố gắng đăng nhập trên thiết bị lạ.
                </p>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div className={`p-3 rounded-2xl text-xs font-semibold border leading-relaxed animate-in fade-in ${
              statusType === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
            }`}>
              {statusMsg}
            </div>
          )}

          {/* iOS Note if needed */}
          {deviceEnv.isIOS && !deviceEnv.isStandalone && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
              📱 <b>Lưu ý trên iPhone:</b> Hãy thêm ứng dụng vào Màn hình chính (PWA) để nhận thông báo đẩy như app thật.
            </p>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            {!isSubscribed ? (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={subscribing}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md shadow-blue-200 dark:shadow-none transition-all duration-150 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Bell className="w-4 h-4" />
                <span>{subscribing ? 'Đang kích hoạt...' : 'Bật Thông Báo Ngay'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTestPush}
                disabled={testing}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-200 dark:shadow-none transition-all duration-150 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{testing ? 'Đang gửi thử...' : 'Gửi Thử Thông Báo Về Máy'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-all duration-150 active:scale-95"
            >
              Để Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
