import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import DepartmentBadge from '../components/DepartmentBadge';
import ImageLightboxModal from '../components/ImageLightboxModal';
import { 
  ListOrdered, 
  ExternalLink, 
  Eye, 
  Calendar,
  CheckCircle2,
  Clock,
  UserCheck,
  Shield
} from 'lucide-react';

export default function PersonalHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/confirms/my-history');
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const roleText = user.role === 'ADMIN_TONG' 
    ? 'BCH (Admin Tổng)' 
    : (user.role === 'ADMIN_CAP_2' ? 'BCH' : 'CTV');

  const approvedCount = history.filter(h => h.status === 'APPROVED').length;
  const pendingCount = history.filter(h => h.status === 'PENDING').length;
  const rejectedCount = history.filter(h => h.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Lịch Sử Xác Nhận Cá Nhân
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Theo dõi tất cả bài bump đã nộp minh chứng và kết quả phê duyệt
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            {roleText}
          </span>
          <DepartmentBadge name={user.department_name} code={user.department_code} />
        </div>
      </div>

      {/* Account Info & Mini Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* User Card */}
        <div className="col-span-2 sm:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-4 sm:p-6 shadow-md border border-slate-700/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400">
                Tài khoản thành viên
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/10 text-white">
                {roleText}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black mt-1 truncate">{user.full_name}</h2>
            <p className="text-xs text-slate-300 mt-0.5 truncate">
              @{user.username} • {user.email}
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 mt-3 sm:mt-4 flex items-center justify-between text-xs text-slate-300">
            <span className="text-[11px] text-slate-400">Phân ban:</span>
            <span className="text-yellow-300 font-extrabold truncate ml-2">{user.department_name || 'Đoàn Trường'}</span>
          </div>
        </div>

        {/* Stats 1: Approved */}
        <div className="col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Đã Duyệt</span>
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{approvedCount}</span>
            <p className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Hợp lệ</p>
          </div>
        </div>

        {/* Stats 2: In Queue & Rejected */}
        <div className="col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Chờ / Lại</span>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline space-x-2">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold ml-0.5">chờ</span>
            </div>
            {rejectedCount > 0 && (
              <div>
                <span className="text-base sm:text-xl font-black text-red-600 dark:text-red-400">{rejectedCount}</span>
                <span className="text-[9px] sm:text-[11px] text-red-500 font-bold ml-0.5">lại</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submissions History Table/List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Nhật Ký Các Lượt Nộp Confirm ({history.length})
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Toàn bộ lịch sử tài khoản của bạn
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-7 h-7 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400 font-bold">Đang tải lịch sử cá nhân...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-xs">
            Bạn chưa nộp minh chứng bump bài nào. Hãy vào mục <b>"Nhiệm Vụ"</b> để bắt đầu hoàn thành task!
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="sm:hidden space-y-3">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {item.task_title}
                    </div>
                    <StatusBadge status={item.status} isMakeup={item.is_makeup === 1} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                      {new Date(item.submitted_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </span>
                    {item.is_makeup === 1 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                        Nộp bù (3 ngày)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200">
                        Đúng hạn
                      </span>
                    )}
                  </div>

                  {item.status === 'REJECTED' && item.admin_feedback && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 text-xs text-red-900 dark:text-red-200">
                      <span className="font-bold block text-[10px] uppercase text-red-700 dark:text-red-400">Lý do từ chối:</span>
                      <p>{item.admin_feedback}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 gap-2 overflow-hidden">
                    <a
                      href={item.task_post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center font-semibold truncate flex-1 min-w-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                      <span className="truncate">Mở bài đăng {item.task_platform}</span>
                    </a>

                    <button
                      onClick={() => setSelectedProof(item)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs inline-flex items-center shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-600"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Xem ảnh
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Nhiệm Vụ</th>
                    <th className="px-4 py-3">Thời Gian Nộp</th>
                    <th className="px-4 py-3">Loại Nộp</th>
                    <th className="px-4 py-3">Trạng Thái</th>
                    <th className="px-4 py-3">Ảnh Minh Chứng</th>
                    <th className="px-4 py-3">Phản Hồi Từ Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.task_title}</div>
                        <a
                          href={item.task_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center mt-0.5"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" /> Mở bài đăng {item.task_platform}
                        </a>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(item.submitted_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.is_makeup === 1 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                            Nộp bù (3 ngày)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200">
                            Đúng hạn
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={item.status} isMakeup={item.is_makeup === 1} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedProof(item)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold inline-flex items-center text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Xem & Phóng to
                        </button>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        {item.status === 'REJECTED' && item.admin_feedback ? (
                          <span className="text-red-700 dark:text-red-300 font-bold bg-red-50 dark:bg-red-950/50 p-1.5 rounded-lg border border-red-200 dark:border-red-900 block text-[11px]">
                            Lý do: {item.admin_feedback}
                          </span>
                        ) : item.status === 'APPROVED' ? (
                          <span className="text-green-700 dark:text-green-400 font-semibold flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Đã được duyệt hợp lệ
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">Đang chờ Admin duyệt</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Image Lightbox Modal with zoom, rotate, and clean download */}
      <ImageLightboxModal
        isOpen={Boolean(selectedProof)}
        imageUrl={selectedProof?.image_url}
        title={selectedProof ? `Minh chứng nộp: ${selectedProof.task_title}` : ''}
        onClose={() => setSelectedProof(null)}
      />
    </div>
  );
}
