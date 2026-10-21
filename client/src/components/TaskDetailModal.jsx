import React, { useState } from 'react';
import DepartmentBadge from './DepartmentBadge';
import StatusBadge from './StatusBadge';
import ImageLightboxModal, { openImageInNewTab } from './ImageLightboxModal';
import { 
  X, 
  ExternalLink, 
  Upload, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Share2, 
  Eye, 
  FileText,
  Users
} from 'lucide-react';

export default function TaskDetailModal({ task, isOpen, onClose, onOpenSubmitModal }) {
  const [showProofLightbox, setShowProofLightbox] = useState(false);
  if (!isOpen || !task) return null;

  // Platform info
  let platformBg = 'bg-[#1877F2] text-white';
  let platformLabel = 'Facebook';
  let platformIcon = '📘';

  if (task.platform === 'TIKTOK') {
    platformBg = 'bg-black text-white';
    platformLabel = 'TikTok';
    platformIcon = '🎵';
  } else if (task.platform === 'INSTAGRAM') {
    platformBg = 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white';
    platformLabel = 'Instagram';
    platformIcon = '📷';
  }

  const deadlineDate = new Date(task.deadline);
  const makeupDeadlineDate = new Date(task.makeup_deadline);
  const now = new Date();

  const isPastDeadline = now > deadlineDate;
  const isPastMakeup = now > makeupDeadlineDate;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center shadow-2xs ${platformBg}`}>
                <span className="mr-1.5">{platformIcon}</span>
                {platformLabel}
              </span>
              <DepartmentBadge 
                name={task.target_department_name} 
                code={task.target_department_code} 
                size="md" 
              />
            </div>
            <StatusBadge status={task.myStatus} isMakeup={task.mySubmission?.is_makeup === 1} />
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 divide-y divide-slate-100">
          {/* Title */}
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              {task.title}
            </h2>
            <div className="mt-2 text-xs text-slate-400 flex items-center space-x-2">
              <span>Mã task: #{task.id}</span>
              <span>•</span>
              <span>Đăng lúc: {new Date(task.created_at).toLocaleString('vi-VN')}</span>
            </div>
          </div>

          {/* Social Media Link */}
          <div className="pt-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Liên kết bài viết cần bump:
            </label>
            <a
              href={task.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-700 hover:bg-blue-100/80 transition-all font-bold text-xs sm:text-sm group"
            >
              <span className="flex items-center truncate mr-2">
                <Share2 className="w-4 h-4 mr-2.5 flex-shrink-0 text-blue-600 group-hover:rotate-12 transition-transform" />
                <span className="truncate">Truy cập bài đăng {platformLabel} để tương tác</span>
              </span>
              <ExternalLink className="w-4 h-4 flex-shrink-0 text-blue-600" />
            </a>
          </div>

          {/* Requirements & Description */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-red-600" />
                Yêu cầu & Hướng dẫn chi tiết:
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Đọc kỹ để thực hiện đúng</span>
            </div>
            
            {task.description ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal select-text max-h-72 overflow-y-auto custom-scrollbar">
                {task.description}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                Không có yêu cầu bằng văn bản. Đoàn viên vui lòng tương tác like/thả tim, comment tích cực và tag bạn bè.
              </p>
            )}
          </div>

          {/* Rejection Note (if rejected) */}
          {task.myStatus === 'BI_TU_CHOI' && task.mySubmission?.admin_feedback && (
            <div className="pt-4">
              <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-900 space-y-1">
                <div className="font-extrabold flex items-center text-red-700">
                  <AlertCircle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                  Lý do bị từ chối duyệt:
                </div>
                <p className="leading-relaxed pl-5 font-medium">{task.mySubmission.admin_feedback}</p>
                <p className="text-[11px] text-red-600 pl-5 italic mt-1">
                  Vui lòng thực hiện lại tương tác theo đúng yêu cầu và gửi ảnh xác nhận mới.
                </p>
              </div>
            </div>
          )}

          {/* Submitted Proof (if already submitted) */}
          {task.mySubmission && (
            <div className="pt-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                <Eye className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Minh chứng bạn đã nộp:
              </label>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 truncate">
                  <img 
                    src={task.mySubmission.image_url} 
                    alt="Proof" 
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs cursor-pointer hover:opacity-90"
                    onClick={() => setShowProofLightbox(true)}
                  />
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-800">
                      Nộp lúc: {new Date(task.mySubmission.submitted_at).toLocaleString('vi-VN')}
                    </p>
                    {task.mySubmission.note && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Lời nhắn: "{task.mySubmission.note}"
                      </p>
                    )}
                    <span 
                      className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline inline-flex items-center mt-1" 
                      onClick={() => setShowProofLightbox(true)}
                    >
                      Bấm phóng to xem ảnh đầy đủ ↗
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deadlines Block */}
          <div className="pt-4 space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Thời hạn hoàn thành:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Official Deadline */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Hạn chót ban đầu</p>
                  <p className={`text-xs font-black ${isPastDeadline ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {deadlineDate.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Makeup Deadline */}
              <div className={`p-3 rounded-2xl border flex items-center space-x-3 ${
                isPastDeadline && !isPastMakeup
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isPastDeadline && !isPastMakeup 
                    ? 'bg-amber-200 text-amber-800' 
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Hạn nộp bù (3 ngày)</p>
                  <p className={`text-xs font-black ${
                    isPastDeadline && !isPastMakeup ? 'text-amber-800' : 'text-slate-700'
                  }`}>
                    {makeupDeadlineDate.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors"
          >
            Đóng
          </button>

          {task.canSubmit ? (
            <button
              onClick={() => {
                onClose();
                onOpenSubmitModal(task, task.isMakeupPeriod);
              }}
              className={`flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-black text-white active:scale-95 shadow-md transition-all ${
                task.isMakeupPeriod 
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' 
                  : 'bg-red-600 hover:bg-red-700 shadow-red-200'
              }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              {task.myStatus === 'BI_TU_CHOI' 
                ? 'Nộp Lại Minh Chứng' 
                : (task.isMakeupPeriod ? 'Nộp Bù Minh Chứng (3 Ngày)' : 'Gửi Ảnh Confirm')}
            </button>
          ) : (
            <div className="text-xs font-bold text-slate-500 py-2">
              {task.myStatus === 'CHO_DUYET' && '⏳ Minh chứng của bạn đang chờ Admin duyệt'}
              {(task.myStatus === 'DA_HOAN_THANH' || task.myStatus === 'HOAN_THANH_BU') && (
                <span className="text-green-600 flex items-center font-extrabold">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Đã hoàn thành nhiệm vụ
                </span>
              )}
              {task.myStatus === 'QUA_HAN_DA_DONG' && '✕ Đã quá thời hạn nộp bù, task đã đóng'}
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Lightbox Modal */}
      <ImageLightboxModal
        isOpen={showProofLightbox}
        imageUrl={task.mySubmission?.image_url}
        title={`Minh chứng nộp: ${task.title}`}
        onClose={() => setShowProofLightbox(false)}
      />
    </div>
  );
}
