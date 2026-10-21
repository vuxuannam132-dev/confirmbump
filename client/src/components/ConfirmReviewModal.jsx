import React, { useState } from 'react';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Calendar, 
  User, 
  MessageSquare, 
  Loader2, 
  Maximize2, 
  ExternalLink as ExtIcon,
  ChevronLeft,
  ChevronRight,
  Images
} from 'lucide-react';
import DepartmentBadge from './DepartmentBadge';
import ImageLightboxModal, { openImageInNewTab } from './ImageLightboxModal';

export default function ConfirmReviewModal({ submission, onClose, onReview }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (!submission) return null;

  // Extract all images
  const imageUrls = Array.isArray(submission.image_urls) && submission.image_urls.length > 0 
    ? submission.image_urls 
    : (submission.image_url ? [submission.image_url] : []);

  const currentImage = imageUrls[activeImageIdx] || imageUrls[0] || '';

  const handleApprove = async () => {
    setLoading(true);
    await onReview(submission.id, 'APPROVED', '');
    setLoading(false);
    onClose();
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) {
      alert('Vui lòng nhập lý do từ chối để thành viên biết và nộp lại.');
      return;
    }
    setLoading(true);
    await onReview(submission.id, 'REJECTED', feedback);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-base">Chi Tiết Minh Chứng Confirm</h3>
            {imageUrls.length > 1 && (
              <span className="text-[11px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center">
                <Images className="w-3 h-3 mr-1" /> {imageUrls.length} ảnh
              </span>
            )}
            {submission.is_makeup === 1 ? (
              <span className="text-[11px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                Nộp bù (3 ngày)
              </span>
            ) : (
              <span className="text-[11px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">
                Đúng hạn
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Member & Task Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase">Thành viên nộp:</span>
              <p className="font-bold text-sm text-slate-800 flex items-center mt-0.5">
                <User className="w-4 h-4 mr-1.5 text-blue-600 flex-shrink-0" />
                <span className="truncate">{submission.full_name} ({submission.username})</span>
              </p>
              <div className="mt-1.5">
                <DepartmentBadge name={submission.department_name} code={submission.department_code} size="sm" />
              </div>
              {submission.facebook_url && (
                <a
                  href={submission.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center mt-1 font-medium"
                >
                  <ExternalLink className="w-3 h-3 mr-1" /> Trang Facebook cá nhân
                </a>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase">Task tương ứng:</span>
              <p className="font-bold text-sm text-slate-800 mt-0.5 line-clamp-2">{submission.task_title}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Nộp: {new Date(submission.submitted_at).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>

          {/* Optional Note */}
          {submission.note && (
            <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs text-blue-900">
              <span className="font-bold flex items-center mb-1">
                <MessageSquare className="w-3.5 h-3.5 mr-1 text-blue-600" />
                Lời nhắn từ thành viên:
              </span>
              <p className="italic">"{submission.note}"</p>
            </div>
          )}

          {/* Proof Screenshot Image Viewer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-700 font-bold uppercase block">
                  Ảnh chụp minh chứng:
                </span>
                {imageUrls.length > 1 && (
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    Ảnh {activeImageIdx + 1} / {imageUrls.length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLightbox(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2.5 py-1 rounded-xl"
                >
                  <Maximize2 className="w-3.5 h-3.5 mr-1" /> Phóng to chi tiết
                </button>
                <button
                  type="button"
                  onClick={() => openImageInNewTab(currentImage)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center bg-slate-100 px-2.5 py-1 rounded-xl"
                  title="Mở ảnh tab mới"
                >
                  <ExtIcon className="w-3.5 h-3.5 mr-1" /> Tab mới
                </button>
              </div>
            </div>

            {/* Main Image Display Box */}
            <div className="relative bg-slate-100 rounded-2xl p-2 border border-slate-200 text-center group overflow-hidden">
              <div 
                className="cursor-zoom-in"
                onClick={() => setShowLightbox(true)}
              >
                <img
                  src={currentImage}
                  alt={`Proof screenshot ${activeImageIdx + 1}`}
                  className="max-h-96 mx-auto rounded-xl object-contain shadow-sm group-hover:scale-[1.01] transition-transform"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold rounded-2xl pointer-events-none">
                  <Maximize2 className="w-4 h-4 mr-1.5" /> Bấm để mở trình soi phóng to
                </div>
              </div>

              {/* Prev/Next buttons on main preview if multi-images */}
              {imageUrls.length > 1 && (
                <>
                  {activeImageIdx > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx(i => i - 1);
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white shadow-md transition-all active:scale-95"
                      title="Ảnh trước"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {activeImageIdx < imageUrls.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx(i => i + 1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white shadow-md transition-all active:scale-95"
                      title="Ảnh tiếp theo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Thumbnail Strip below preview */}
            {imageUrls.length > 1 && (
              <div className="flex items-center space-x-2 mt-2.5 overflow-x-auto py-1 px-1 custom-scrollbar">
                {imageUrls.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                      activeImageIdx === idx
                        ? 'border-blue-600 scale-105 shadow-md shadow-blue-500/20'
                        : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-[9px] text-white font-bold px-1 rounded">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <span className="text-[11px] text-slate-400 mt-1.5 block text-center">
              {imageUrls.length > 1 ? `Bộ ${imageUrls.length} ảnh minh chứng • ` : ''}
              Bấm trực tiếp vào ảnh để mở trình soi phóng to, xoay ảnh và tải về
            </span>
          </div>

          {/* Reject Reason Input (if activated) */}
          {rejectMode && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-3">
              <label className="block text-xs font-bold text-red-900 uppercase">
                Lý do từ chối bằng chứng:
              </label>
              <textarea
                rows={2}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="VD: Chưa chụp màn hình cmt đủ 3 lần hoặc chưa tag đủ 4 bạn bè, vui lòng chụp lại..."
                className="w-full px-3.5 py-2 rounded-xl border border-red-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectMode(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Hủy từ chối
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin inline" />}
                  Xác nhận Từ Chối
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!rejectMode && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Đóng
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setRejectMode(true)}
                disabled={loading}
                className="flex items-center px-4 py-2 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Từ Chối
              </button>

              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex items-center px-5 py-2 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-200 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
                Chấp Nhận Duyệt
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={showLightbox}
        images={imageUrls}
        initialIndex={activeImageIdx}
        title={`Minh chứng: ${submission.full_name} (@${submission.username}) - ${submission.task_title}`}
        onClose={() => setShowLightbox(false)}
      />
    </div>
  );
}
