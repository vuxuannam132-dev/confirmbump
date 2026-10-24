import React, { useState } from 'react';
import api from '../services/api';
import { Megaphone, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function BroadcastPage() {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const applyPreset = (titleText, msgText) => {
    setBroadcastTitle(titleText);
    setBroadcastMessage(msgText);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setAlert({ type: 'error', text: 'Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.' });
      return;
    }

    setSubmitting(true);
    setAlert(null);

    try {
      const res = await api.post('/notifications/broadcast', {
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim()
      });

      if (res.data.success) {
        setAlert({
          type: 'success',
          text: `🎉 ${res.data.message || 'Đã phát thông báo thành công!'}`
        });
        setBroadcastTitle('');
        setBroadcastMessage('');
      }
    } catch (err) {
      setAlert({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi khi gửi thông báo công việc.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-3 mb-1">
          <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              📢 Phát Thông Báo Công Việc Toàn Đoàn
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gửi thông báo đẩy tức thì về điện thoại của toàn bộ thành viên
            </p>
          </div>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between shadow-sm ${
          alert.type === 'success'
            ? 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {alert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <span>{alert.text}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-xs hover:underline ml-3 flex-shrink-0">
            Đóng
          </button>
        </div>
      )}

      {/* Quick Presets */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-3">
          Mẫu soạn nhanh:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPreset(
              '⏰ Nhắc nhở hạn chót hoàn thành bump bài',
              'Đề nghị toàn thể CTV và BCH nhanh chóng vào thực hiện tương tác và nộp ảnh minh chứng trước khi hết hạn!'
            )}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all active:scale-95"
          >
            ⏰ Nhắc hạn chót
          </button>
          <button
            type="button"
            onClick={() => applyPreset(
              '🔥 Chiến dịch truyền thông mới - Đẩy mạnh tương tác',
              'Đoàn trường vừa phát động chiến dịch mới. Đề nghị các phân ban tích cực kêu gọi bạn bè tương tác và chia sẻ.'
            )}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all active:scale-95"
          >
            🔥 Chiến dịch mới
          </button>
          <button
            type="button"
            onClick={() => applyPreset(
              '📢 Thông báo cuộc họp BCH và CTV Đoàn trường',
              'Đề nghị các đồng chí kiểm tra thông tin và có mặt đúng giờ để tham gia buổi họp triển khai công tác.'
            )}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all active:scale-95"
          >
            📢 Họp triển khai
          </button>
        </div>
      </div>

      {/* Broadcast Form */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
              Tiêu đề thông báo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="VD: [KHẨN] Nhắc nhở hạn chót hoàn thành bump bài 20/10"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
              Nội dung thông báo <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Nhập nội dung chi tiết công việc hoặc thông báo cần gửi tới tất cả thành viên..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors leading-relaxed"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{submitting ? 'Đang gửi tới mọi người...' : 'Phát Thông Báo Ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
