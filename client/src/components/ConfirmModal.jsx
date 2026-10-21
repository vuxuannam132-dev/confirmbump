import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, CheckCircle, AlertTriangle, Loader2, Plus, Trash2, Sparkles } from 'lucide-react';
import api from '../services/api';
import { compressImage, formatBytes } from '../utils/imageCompressor';

export default function ConfirmModal({ task, isMakeup, onClose, onSuccess }) {
  const [imageList, setImageList] = useState([]); // [{ id, file, previewUrl, originalSize, compressedSize, isCompressing }]
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!task) return null;

  const handleFilesSelected = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    if (imageList.length + rawFiles.length > 10) {
      setError('Hệ thống hỗ trợ tải lên tối đa 10 ảnh minh chứng cùng lúc.');
      return;
    }

    setError('');

    // Generate preliminary items with temporary preview
    const newItems = rawFiles.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      originalSize: file.size,
      compressedSize: file.size,
      isCompressing: true
    }));

    // Append to list immediately so user sees loading indicators
    setImageList(prev => [...prev, ...newItems]);

    // Reset input so user can pick again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Asynchronously compress each image in background
    for (const item of newItems) {
      try {
        const compressed = await compressImage(item.file, {
          maxWidth: 1440,
          maxHeight: 1440,
          quality: 0.78
        });

        const newPreviewUrl = URL.createObjectURL(compressed);

        setImageList(prev => prev.map(p => {
          if (p.id === item.id) {
            return {
              ...p,
              file: compressed,
              previewUrl: newPreviewUrl,
              compressedSize: compressed.size,
              isCompressing: false
            };
          }
          return p;
        }));
      } catch (compErr) {
        console.warn('Compression fallback:', compErr);
        setImageList(prev => prev.map(p => p.id === item.id ? { ...p, isCompressing: false } : p));
      }
    }
  };

  const handleRemoveImage = (idToRemove) => {
    setImageList(prev => {
      const target = prev.find(item => item.id === idToRemove);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(item => item.id !== idToRemove);
    });
  };

  const totalRawSize = imageList.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalCompressedSize = imageList.reduce((acc, curr) => acc + curr.compressedSize, 0);
  const isAnyCompressing = imageList.some(item => item.isCompressing);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (imageList.length === 0) {
      setError('Vui lòng chọn ít nhất 1 ảnh chụp màn hình bằng chứng bump bài!');
      return;
    }

    if (isAnyCompressing) {
      setError('Hệ thống đang hoàn tất tối ưu nén ảnh, vui lòng đợi vài giây rồi bấm gửi lại.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('task_id', task.id);
      formData.append('note', note);

      // Append all images
      imageList.forEach((item) => {
        formData.append('images', item.file);
      });
      // Also append first image under legacy 'image' key for backwards compatibility
      if (imageList[0]) {
        formData.append('image', imageList[0].file);
      }

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all my-8">
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Nhiệm vụ:</span>
            <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2 mt-0.5">{task.title}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-800 font-medium">
              {error}
            </div>
          )}

          {/* Multi-Image Upload Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center">
                Ảnh chụp màn hình minh chứng <span className="text-red-500 ml-0.5">*</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {imageList.length}/10 ảnh
              </span>
            </div>

            {/* Hidden file input supporting multiple selection */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />

            {imageList.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 rounded-2xl p-6 text-center cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 mx-auto flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Nhấn để chọn ảnh chụp màn hình
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                  💡 Hỗ trợ chọn cùng lúc nhiều ảnh (Like, 3 CMT, Tag, Story...)
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Tự động tối ưu dung lượng siêu nhẹ, gửi tức thì
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Images Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1 custom-scrollbar">
                  {imageList.map((item, index) => (
                    <div
                      key={item.id}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-square flex items-center justify-center shadow-xs"
                    >
                      <img
                        src={item.previewUrl}
                        alt={`Ảnh ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Badge order */}
                      <span className="absolute top-1 left-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                        #{index + 1}
                      </span>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(item.id);
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity shadow-xs"
                        title="Xóa ảnh này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Compression indicator */}
                      {item.isCompressing ? (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-[10px] font-bold p-1 text-center">
                          <Loader2 className="w-4 h-4 animate-spin mb-1 text-blue-400" />
                          <span>Đang nén...</span>
                        </div>
                      ) : (
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-medium px-1 rounded backdrop-blur-xs">
                          {formatBytes(item.compressedSize)}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add more button if < 10 */}
                  {imageList.length < 10 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 aspect-square flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                      title="Thêm ảnh minh chứng khác"
                    >
                      <Plus className="w-6 h-6 mb-1" />
                      <span className="text-[11px] font-bold">Thêm ảnh</span>
                    </button>
                  )}
                </div>

                {/* Compression Savings Summary Badge */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs">
                  <div className="flex items-center space-x-1.5 text-blue-700 dark:text-blue-300 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span>Đã chọn {imageList.length} ảnh</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="line-through text-slate-400 mr-1.5">{formatBytes(totalRawSize)}</span>
                    <span className="font-bold text-green-600 dark:text-green-400">~{formatBytes(totalCompressedSize)}</span>
                    <span className="text-slate-400 text-[10px] ml-1">(tiết kiệm {totalRawSize > 0 ? Math.round((1 - totalCompressedSize / totalRawSize) * 100) : 0}%)</span>
                  </div>
                </div>
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
              placeholder="VD: Em đã thả tim, cmt 3 lần và tag đủ 4 bạn bè theo yêu cầu..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || isAnyCompressing || imageList.length === 0}
              className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                isMakeup 
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' 
                  : 'bg-red-600 hover:bg-red-700 shadow-red-200'
              }`}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isMakeup 
                ? `Gửi ${imageList.length > 0 ? imageList.length + ' ' : ''}Confirm Bù` 
                : `Gửi ${imageList.length > 0 ? imageList.length + ' ' : ''}Xác Nhận`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
