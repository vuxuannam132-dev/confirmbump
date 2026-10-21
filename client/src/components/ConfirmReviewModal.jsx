import React, { useState } from 'react';
import { X, CheckCircle, XCircle, ExternalLink, Calendar, User, MessageSquare, Loader2 } from 'lucide-react';
import DepartmentBadge from './DepartmentBadge';

export default function ConfirmReviewModal({ submission, onClose, onReview }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  if (!submission) return null;

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-base">Chi Tiết Minh Chứng Confirm</h3>
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
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Member & Task Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase">Thành viên nộp:</span>
              <p className="font-bold text-sm text-slate-800 flex items-center mt-0.5">
                <User className="w-4 h-4 mr-1.5 text-blue-600" />
                {submission.full_name} ({submission.username})
              </p>
              <div className="mt-1">
                <DepartmentBadge name={submission.department_name} code={submission.department_code} size="sm" />
              </div>
              {submission.facebook_url && (
                <a
                  href={submission.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center mt-1"
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
                Nộp lúc: {new Date(submission.submitted_at).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>

          {/* Optional Note */}
          {submission.note && (
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900">
              <span className="font-bold flex items-center mb-1">
                <MessageSquare className="w-3.5 h-3.5 mr-1 text-blue-600" />
                Lời nhắn từ thành viên:
              </span>
              <p className="italic">"{submission.note}"</p>
            </div>
          )}

          {/* Proof Screenshot Image */}
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase block mb-2">Ảnh chụp màn hình:</span>
            <div className="bg-slate-100 rounded-xl p-2 border border-slate-200 text-center">
              <a href={submission.image_url} target="_blank" rel="noopener noreferrer" title="Bấm để mở ảnh gốc">
                <img
                  src={submission.image_url}
                  alt="Proof screenshot"
                  className="max-h-96 mx-auto rounded-lg object-contain shadow-sm hover:opacity-95 transition-opacity cursor-zoom-in"
                />
              </a>
              <span className="text-[11px] text-slate-400 mt-1 block">Click vào ảnh để phóng to ở tab mới</span>
            </div>
          </div>

          {/* Reject Reason Input (if activated) */}
          {rejectMode && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-3">
              <label className="block text-xs font-bold text-red-900 uppercase">
                Lý do từ chối bằng chứng:
              </label>
              <textarea
                rows={2}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="VD: Ảnh chưa thể hiện đã chia sẻ bài viết công khai, vui lòng chụp lại..."
                className="w-full px-3 py-2 rounded-lg border border-red-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectMode(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Hủy từ chối
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm"
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
    </div>
  );
}
