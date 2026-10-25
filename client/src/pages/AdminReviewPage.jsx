import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DepartmentBadge from '../components/DepartmentBadge';
import StatusBadge from '../components/StatusBadge';
import ConfirmReviewModal from '../components/ConfirmReviewModal';
import UserAvatar from '../components/UserAvatar';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Clock, 
  Calendar,
  ExternalLink,
  RefreshCw,
  Images,
  FileText,
  MessageSquare
} from 'lucide-react';

export default function AdminReviewPage() {
  const [submissions, setSubmissions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('PENDING'); // Default to PENDING queue
  const [searchQuery, setSearchQuery] = useState('');

  // Active modal
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dRes, tRes] = await Promise.all([
        api.get('/auth/departments'),
        api.get('/tasks')
      ]);
      if (dRes.data.success) setDepartments(dRes.data.departments);
      if (tRes.data.success) setTasks(tRes.data.tasks);

      await fetchSubmissions();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await api.get('/confirms/review-queue', {
        params: {
          department_id: selectedDept || undefined,
          task_id: selectedTask || undefined,
          status: selectedStatus || undefined,
          search: searchQuery || undefined
        }
      });
      if (res.data.success) {
        setSubmissions(res.data.submissions);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [selectedDept, selectedTask, selectedStatus, searchQuery]);

  const handleReview = async (id, status, feedback) => {
    try {
      const res = await api.put(`/confirms/${id}/review`, {
        status,
        admin_feedback: feedback
      });
      if (res.data.success) {
        setToastMsg(res.data.message);
        fetchSubmissions();
        setTimeout(() => setToastMsg(null), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi duyệt confirm.');
    }
  };

  const pendingCount = submissions.filter(s => s.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="p-4 bg-green-50 text-green-800 rounded-2xl border border-green-200 text-sm font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-xs text-green-600 hover:underline">
            Đóng
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Duyệt Minh Chứng Xác Nhận (Admin Tổng)
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Chỉ Admin Tổng có thẩm quyền phê duyệt hoặc từ chối ảnh chụp màn hình confirm của thành viên
            </p>
          </div>
        </div>

        <button
          onClick={fetchSubmissions}
          className="flex items-center px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Làm mới
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Status */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Trạng thái duyệt</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="PENDING">Chờ duyệt (Cần xử lý)</option>
            <option value="APPROVED">Đã chấp nhận duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
            <option value="ALL">Tất cả trạng thái</option>
          </select>
        </div>

        {/* Department */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Lọc theo Phân ban</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Tất cả phân ban</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Task */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Lọc theo Task</label>
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none truncate"
          >
            <option value="">Tất cả nhiệm vụ</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tìm thành viên</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tên, tài khoản..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {submissions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Không có minh chứng nào phù hợp</h3>
          <p className="text-xs text-slate-400 mt-1">Danh sách duyệt hiện đang trống hoặc chưa có nộp mới.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                sub.status === 'PENDING' 
                  ? 'border-blue-400/80 dark:border-blue-500/80 ring-2 ring-blue-500/10' 
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                {/* 1. Header: Avatar + Full Name, Username, Department + Status Badges */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: User Avatar & Info */}
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="relative flex-shrink-0">
                        <UserAvatar 
                          user={{ full_name: sub.full_name, avatar_url: sub.avatar_url, username: sub.username }} 
                          size="md" 
                          className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-md object-cover ring-2 ring-blue-500/20"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {sub.full_name}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">@{sub.username}</span>
                          <span>•</span>
                          <DepartmentBadge name={sub.department_name} code={sub.department_code} size="xs" />
                        </div>
                      </div>
                    </div>

                    {/* Right: Badges */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusBadge status={sub.status} isMakeup={sub.is_makeup === 1} />
                      {sub.is_makeup === 1 ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Nộp bù (3 ngày)
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          Đúng hạn
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Member & Task detail */}
                <div className="p-4 space-y-3">
                  {/* Task detail */}
                  <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/60 text-xs">
                    <div className="flex items-center space-x-1.5 text-blue-700 dark:text-blue-400 font-bold uppercase text-[10px] tracking-wider mb-0.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Nhiệm vụ</span>
                    </div>
                    <p className="font-black text-slate-900 dark:text-white line-clamp-2 leading-relaxed">
                      {sub.task_title}
                    </p>
                  </div>

                  {/* Lời nhắn (nếu có) */}
                  {sub.note && (
                    <div className="p-2.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-xs">
                      <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-400 font-bold uppercase text-[10px] tracking-wider mb-0.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Lời nhắn</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 italic line-clamp-2 leading-relaxed">
                        "{sub.note}"
                      </p>
                    </div>
                  )}

                  {/* Ảnh minh chứng Thumbnail */}
                  <div
                    onClick={() => setActiveSubmission(sub)}
                    className="relative cursor-pointer group rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 aspect-video flex items-center justify-center shadow-xs"
                  >
                    <img
                      src={sub.image_url}
                      alt="Ảnh minh chứng"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {sub.image_urls && sub.image_urls.length > 1 && (
                      <span className="absolute top-2.5 right-2.5 bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center shadow-lg border border-white/20 z-10">
                        <Images className="w-3.5 h-3.5 mr-1 text-yellow-400" /> {sub.image_urls.length} ảnh
                      </span>
                    )}
                    <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black backdrop-blur-2xs">
                      <Eye className="w-4 h-4 mr-1.5 text-blue-400" /> Bấm để xem toàn bộ ảnh & duyệt
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Actions Footer */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
                  {new Date(sub.submitted_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(sub.submitted_at).toLocaleDateString('vi-VN')}
                </span>

                <button
                  type="button"
                  onClick={() => setActiveSubmission(sub)}
                  className="px-4 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 flex items-center space-x-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem & Duyệt</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {activeSubmission && (
        <ConfirmReviewModal
          submission={activeSubmission}
          onClose={() => setActiveSubmission(null)}
          onReview={handleReview}
        />
      )}
    </div>
  );
}
