import React, { useState } from 'react';
import DepartmentBadge from './DepartmentBadge';
import StatusBadge from './StatusBadge';
import TaskDetailModal from './TaskDetailModal';
import { 
  ExternalLink, 
  Upload, 
  Calendar, 
  Trash2,
  AlertTriangle,
  AlertCircle,
  Share2,
  CheckCircle2,
  Clock,
  Eye
} from 'lucide-react';

export default function TaskCard({ task, onOpenSubmitModal, onDeleteTask, isAdminTong }) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  // Platform configuration
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
    <div className={`bg-white rounded-3xl border transition-all duration-200 shadow-xs hover:shadow-md overflow-hidden flex flex-col justify-between ${
      task.myStatus === 'QUA_HAN_CHO_NOP_BU' 
        ? 'border-amber-300 ring-2 ring-amber-100/60' 
        : (task.myStatus === 'DA_HOAN_THANH' || task.myStatus === 'HOAN_THANH_BU'
          ? 'border-green-200'
          : 'border-slate-200')
    }`}>
      <div>
        {/* Top Header Row */}
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2 mb-3">
            {/* Left: Platform & Department */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center shadow-2xs ${platformBg}`}>
                <span className="mr-1">{platformIcon}</span>
                {platformLabel}
              </span>
              <DepartmentBadge 
                name={task.target_department_name} 
                code={task.target_department_code} 
                size="sm" 
              />
            </div>

            {/* Right: Trash button for Admin Tổng */}
            {isAdminTong && (
              <button
                onClick={() => onDeleteTask(task.id)}
                title="Xóa nhiệm vụ này"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors -mr-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Badge in its own clean row */}
          <div className="mb-2.5">
            <StatusBadge status={task.myStatus} isMakeup={task.mySubmission?.is_makeup === 1} />
          </div>

          {/* Task Title */}
          <h3 
            onClick={() => setShowDetailModal(true)}
            className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug line-clamp-2 cursor-pointer hover:text-red-600 transition-colors"
            title="Bấm để xem chi tiết task"
          >
            {task.title}
          </h3>

          {/* Task Description with scrollbar and view detail trigger */}
          {task.description && (
            <div className="mt-2.5">
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80 whitespace-pre-line max-h-36 overflow-y-auto select-text">
                {task.description}
              </div>
              <div className="flex items-center justify-between mt-1 px-1">
                <span className="text-[10px] text-slate-400 italic">Cuộn ô trên để xem thêm</span>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(true)}
                  className="text-[11px] font-extrabold text-red-600 hover:text-red-700 flex items-center space-x-1 hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem đầy đủ ↗</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Body: Direct Link & Deadlines */}
        <div className="p-4 sm:p-5 space-y-3 bg-slate-50/40">
          {/* Xem Chi Tiết Button */}
          <button
            type="button"
            onClick={() => setShowDetailModal(true)}
            className="w-full flex items-center justify-center py-2 px-3 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 font-bold text-xs transition-all shadow-2xs group"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-400 group-hover:text-red-600" />
            Xem Chi Tiết Nhiệm Vụ
          </button>

          {/* Action Button to Open Social Media */}
          <a
            href={task.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-blue-600 hover:text-blue-700 hover:border-blue-300 hover:shadow-xs font-bold text-xs sm:text-sm transition-all group"
          >
            <span className="flex items-center truncate">
              <Share2 className="w-4 h-4 mr-2 flex-shrink-0 text-blue-500 group-hover:rotate-12 transition-transform" />
              <span className="truncate">Mở bài đăng {platformLabel}</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5 ml-2 flex-shrink-0 text-slate-400 group-hover:text-blue-600" />
          </a>

          {/* Rejection Feedback Note (if rejected) */}
          {task.myStatus === 'BI_TU_CHOI' && task.mySubmission?.admin_feedback && (
            <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-900">
              <div className="font-bold flex items-center mb-0.5 text-red-700">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Lý do từ chối:
              </div>
              <p className="leading-relaxed">{task.mySubmission.admin_feedback}</p>
            </div>
          )}

          {/* Deadlines Block */}
          <div className="text-xs space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center text-[11px]">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Hạn chót ban đầu:
              </span>
              <span className={`font-semibold text-[11px] ${isPastDeadline ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {deadlineDate.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
              </span>
            </div>

            {/* Makeup grace period indicator */}
            {isPastDeadline && !isPastMakeup && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <span className="flex items-center text-[11px] font-bold text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 flex-shrink-0" />
                  Hạn nộp bù (3 ngày):
                </span>
                <span className="font-extrabold text-[11px] text-amber-700">
                  {makeupDeadlineDate.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                </span>
              </div>
            )}

            {isPastMakeup && (
              <div className="text-right text-[11px] text-slate-400 italic">
                Đã hết thời hạn 3 ngày cho nộp bù.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Bottom Action */}
      <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500 whitespace-nowrap">
          <b className="text-slate-800 font-bold">{task.approvedCount || 0}</b> đã hoàn thành
        </span>

        {task.canSubmit ? (
          task.isMakeupPeriod ? (
            <button
              onClick={() => onOpenSubmitModal(task, true)}
              className="flex items-center justify-center px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 shadow-sm shadow-amber-200 transition-all whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Nộp Bù (3 Ngày)
            </button>
          ) : (
            <button
              onClick={() => onOpenSubmitModal(task, false)}
              className="flex items-center justify-center px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-sm shadow-red-200 transition-all whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {task.myStatus === 'BI_TU_CHOI' ? 'Nộp Lại Minh Chứng' : 'Gửi Ảnh Confirm'}
            </button>
          )
        ) : (
          <div className="text-xs font-bold text-slate-400 py-1.5">
            {task.myStatus === 'CHO_DUYET' && 'Đang chờ Admin duyệt'}
            {(task.myStatus === 'DA_HOAN_THANH' || task.myStatus === 'HOAN_THANH_BU') && (
              <span className="text-green-600 flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Đã xong
              </span>
            )}
            {task.myStatus === 'QUA_HAN_DA_DONG' && '✕ Đã đóng'}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={task}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onOpenSubmitModal={onOpenSubmitModal}
      />
    </div>
  );
}
