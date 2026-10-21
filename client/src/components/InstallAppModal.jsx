import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Share2, 
  PlusSquare, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  Flame,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  ShieldCheck
} from 'lucide-react';

const STORAGE_KEY = 'confirmbump_install_guide_seen_v1';

export default function InstallAppModal({ isOpen, onClose, forceShow = false }) {
  const [activeOs, setActiveOs] = useState('ios');
  const [internalOpen, setInternalOpen] = useState(false);

  useEffect(() => {
    // Detect device OS
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/.test(ua);

    if (isAndroid) {
      setActiveOs('android');
    } else {
      setActiveOs('ios');
    }

    // Check if auto show on first visit
    if (!forceShow) {
      const hasSeen = localStorage.getItem(STORAGE_KEY);
      if (!hasSeen) {
        const timer = setTimeout(() => {
          setInternalOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [forceShow]);

  // Sync with prop isOpen if controlled
  const isVisible = forceShow ? isOpen : (isOpen !== undefined ? isOpen : internalOpen);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setInternalOpen(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-red-600 via-red-600 to-blue-700 p-5 sm:p-6 text-white text-center overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-400/20 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />

          <button
            onClick={handleClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md shadow-md border border-white/20 mb-2">
            <Flame className="w-7 h-7 text-yellow-300 fill-yellow-300" />
          </div>

          <h2 className="text-lg sm:text-xl font-black tracking-tight uppercase">
            Cài Đặt App Màn Hình Chính
          </h2>
          <p className="text-xs text-red-100 mt-1 max-w-xs mx-auto">
            Mở nhanh chỉ 1 chạm • Toàn màn hình mượt mà không vướng thanh địa chỉ trình duyệt
          </p>
        </div>

        {/* OS Tab Selector */}
        <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveOs('ios')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeOs === 'ios'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span className="text-base">🍎</span>
            <span>iPhone / iPad (iOS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveOs('android')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeOs === 'android'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span className="text-base">🤖</span>
            <span>Android / APK</span>
          </button>
        </div>

        {/* Scrollable Guide Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-700 text-xs sm:text-sm">
          {activeOs === 'ios' ? (
            /* iOS Guide */
            <div className="space-y-3.5">
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-blue-900 text-xs flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Thực hiện trên trình duyệt <b>Safari</b> của iPhone:</span>
              </div>

              {/* Step 1 */}
              <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    Bấm nút Chia sẻ (Share) trên Safari
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Nhìn xuống thanh công cụ dưới đáy màn hình Safari, bấm vào biểu tượng <b>hình vuông có mũi tên chỉ lên</b> (📤).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center">
                    Chọn "Thêm vào MH chính" <PlusSquare className="w-4 h-4 ml-1.5 text-slate-700 inline" />
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Cuộn bảng tùy chọn xuống dưới một chút, tìm và nhấn vào dòng <b>"Thêm vào MH chính"</b> (Add to Home Screen).
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    Nhấn "Thêm" (Add) ở góc trên
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Bấm nút <b>Thêm</b> ở góc trên bên phải màn hình. Biểu tượng ngọn lửa Đoàn trường sẽ xuất hiện ngay trên màn hình chính của iPhone!
                  </p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Sau khi thêm, bạn có thể mở web toàn màn hình giống hệt App tải từ App Store!</span>
              </div>
            </div>
          ) : (
            /* Android Guide */
            <div className="space-y-3.5">
              {/* Option 1: Direct PWA WebApp (Recommended) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs sm:text-sm text-slate-900 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-ping" />
                    Cách 1: Thêm vào màn hình (Nhanh nhất - Không cần file)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Khuyên dùng</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  1. Mở trình duyệt Chrome trên Android.<br />
                  2. Bấm vào biểu tượng <b>3 chấm dọc (⋮)</b> ở góc trên bên phải.<br />
                  3. Chọn <b>"Cài đặt ứng dụng"</b> (hoặc <b>"Thêm vào Màn hình chính"</b>).<br />
                  4. Bấm <b>Cài đặt</b>. Ứng dụng sẽ tự động xuất hiện ngoài màn hình chính.
                </p>
              </div>

              {/* Option 2: Download APK */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs sm:text-sm text-emerald-950 flex items-center">
                    <Download className="w-4 h-4 mr-1.5 text-emerald-700" />
                    Cách 2: Tải File Cài Đặt APK (.apk)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">File APK</span>
                </div>

                <p className="text-xs text-emerald-900 leading-relaxed">
                  Tải gói cài đặt APK chính thức dành cho điện thoại Android (Samsung, Xiaomi, Oppo, Realme, Vivo...):
                </p>

                <div className="pt-1">
                  <a
                    href="/downloads/ConfirmBump-DoanTruong.apk"
                    download="ConfirmBump-DoanTruong.apk"
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md shadow-emerald-200 transition-all text-center"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải File ConfirmBump-DoanTruong.apk</span>
                  </a>
                </div>

                <div className="text-[11px] text-emerald-800 bg-white/80 p-2.5 rounded-xl border border-emerald-200 space-y-1">
                  <p className="font-bold flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Hướng dẫn sau khi tải xong:
                  </p>
                  <p>Mở file <b>.apk</b> vừa tải về → Chọn <b>Cài đặt</b> (nếu máy hỏi "Cho phép cài đặt ứng dụng từ nguồn này" thì bấm Cho phép).</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 italic">
            Thông báo này sẽ chỉ hiện 1 lần duy nhất.
          </span>

          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs active:scale-95 shadow-xs transition-all whitespace-nowrap"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
