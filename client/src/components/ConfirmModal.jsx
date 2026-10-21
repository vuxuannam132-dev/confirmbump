import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function ConfirmModal({ task, isMakeup, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!task) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 15 * 1024 * 1024) {
        setError('Kích thước ảnh tối đa là 15MB');
        return;
      }
      setFile(selected);
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Vui lòng chọn ảnh chụp màn hình bằng chứng bump bài!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('task_id', task.id);
      formData.append('image', file);
      formData.append('note', note);

      const res = await api.post('/confirms/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        onSuccess(res.data.message);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi nộp confirm.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all">
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isMakeup 
            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900' 
            : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900'
        }`}>
          <div className="flex items-center space-x-2">
            {isMakeup ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            ) : (
              <Upload className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <h3 className={`font-bold text-base ${isMakeup ? 'text-amber-900 dark:text-amber-200' : 'text-red-900 dark:text-red-200'}`}>
              {isMakeup ? 'Nộp Confirm Bù (Trong 3 Ngày Gia Hạn)' : 'Nộp Minh Chứng Bump Bài'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Nhiệm vụ:</span>
            <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2 mt-0.5">{task.title}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
              Ảnh chụp màn hình bằng chứng <span className="text-red-500">*</span>
            </label>

            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-blue-400 bg-slate-50 dark:bg-slate-800 p-2 text-center group">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-60 mx-auto rounded-lg object-contain shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 inline-flex items-center"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Đổi ảnh khác
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 rounded-2xl p-6 text-center cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 mx-auto flex items-center justify-center mb-2">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Nhấn vào đây để tải ảnh chụp màn hình</p>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Hỗ trợ định dạng JPG, PNG, WEBP (Tối đa 15MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Optional Note Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Lời nhắn / Ghi chú <span className="text-slate-400 font-normal">(Không bắt buộc)</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Em đã thả tim và chia sẻ bài viết về trang cá nhân rồi ạ..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                isMakeup 
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' 
                  : 'bg-red-600 hover:bg-red-700 shadow-red-200'
              }`}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isMakeup ? 'Gửi Confirm Bù' : 'Gửi Xác Nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
