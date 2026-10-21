import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import DepartmentBadge from '../components/DepartmentBadge';
import { 
  ListOrdered, 
  ExternalLink, 
  Trash2, 
  Eye, 
  X,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function PersonalHistoryPage() {
  const { user, deleteMyAccount } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewImage, setViewImage] = useState(null);

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

  const handleDeleteAccount = async () => {
    if (user.role === 'ADMIN_TONG') {
      alert('Không thể tự xóa tài khoản Admin Tổng.');
      return;
    }

    if (!window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của mình khỏi hệ thống Đoàn trường?')) return;
    if (!window.confirm('Hành động này không thể hoàn tác. Toàn bộ lịch sử nhiệm vụ của bạn sẽ bị xóa. Bạn vẫn muốn tiếp tục?')) return;

    try {
      await deleteMyAccount();
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa tài khoản');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-xs">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              Lịch Sử Xác Nhận Cá Nhân
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Theo dõi tất cả các bài bump đã gửi minh chứng và phản hồi từ Admin Tổng
            </p>
          </div>
        </div>

        <DepartmentBadge name={user.department_name} code={user.department_code} />
      </div>

      {/* Account Info Box */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-yellow-400">
              Thông tin đoàn viên
            </span>
            <h2 className="text-base sm:text-lg font-black">{user.full_name} (@{user.username})</h2>
            <p className="text-xs text-slate-300">
              Email: {user.email} • Phân ban: <span className="text-yellow-300 font-bold">{user.department_name}</span>
            </p>
            <p className="text-[11px] text-slate-400 italic pt-1">
              * Để đổi sang phân ban khác, vui lòng liên hệ trực tiếp với <b>Admin Tổng</b>.
            </p>
          </div>

          {user.role !== 'ADMIN_TONG' && (
            <button
              onClick={handleDeleteAccount}
              className="flex items-center px-4 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-white hover:bg-red-600/80 border border-red-500/30 transition-all active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Xóa tài khoản của tôi
            </button>
          )}
        </div>
      </div>

      {/* Submissions History */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-4">
          Nhật Ký Các Lượt Nộp Confirm ({history.length})
        </h3>

        {loading ? (
          <div className="text-center py-10">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400 font-bold">Đang tải lịch sử...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Bạn chưa nộp minh chứng bump bài nào. Hãy vào mục <b>"Nhiệm Vụ"</b> để bắt đầu hoàn thành task!
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="sm:hidden space-y-3">
              {history.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-extrabold text-sm text-slate-900 line-clamp-1">{item.task_title}</div>
                    <StatusBadge status={item.status} isMakeup={item.is_makeup === 1} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                      {new Date(item.submitted_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </span>
                    {item.is_makeup === 1 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                        Nộp bù (3 ngày)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-800">
                        Đúng hạn
                      </span>
                    )}
                  </div>

                  {item.status === 'REJECTED' && item.admin_feedback && (
                    <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900">
                      <span className="font-bold block text-[10px] uppercase text-red-700">Lý do từ chối:</span>
                      <p>{item.admin_feedback}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href={item.task_post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline inline-flex items-center font-semibold"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Mở bài đăng {item.task_platform}
                    </a>

                    <button
                      onClick={() => setViewImage(item.image_url)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs inline-flex items-center shadow-2xs"
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
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Nhiệm Vụ</th>
                    <th className="px-4 py-3">Thời Gian Nộp</th>
                    <th className="px-4 py-3">Loại Nộp</th>
                    <th className="px-4 py-3">Trạng Thái</th>
                    <th className="px-4 py-3">Ảnh Bằng Chứng</th>
                    <th className="px-4 py-3">Phản Hồi Từ Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-bold text-slate-900 line-clamp-1">{item.task_title}</div>
                        <a
                          href={item.task_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 hover:underline inline-flex items-center mt-0.5"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" /> Mở bài đăng {item.task_platform}
                        </a>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                        {new Date(item.submitted_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.is_makeup === 1 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Nộp bù (3 ngày)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                            Đúng hạn
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={item.status} isMakeup={item.is_makeup === 1} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => setViewImage(item.image_url)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold inline-flex items-center text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Xem ảnh
                        </button>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        {item.status === 'REJECTED' && item.admin_feedback ? (
                          <span className="text-red-700 font-bold bg-red-50 p-1.5 rounded-lg border border-red-200 block text-[11px]">
                            Lý do: {item.admin_feedback}
                          </span>
                        ) : item.status === 'APPROVED' ? (
                          <span className="text-green-700 font-semibold">Đã được phê duyệt hợp lệ</span>
                        ) : (
                          <span className="text-slate-400 italic">Đang trong hàng đợi kiểm tra</span>
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

      {/* Image Preview Modal */}
      {viewImage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative">
            <button
              onClick={() => setViewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-slate-800 mb-3">Ảnh minh chứng đã nộp</h4>
            <img
              src={viewImage}
              alt="Proof"
              className="max-h-[75vh] mx-auto rounded-2xl object-contain border border-slate-200"
            />
          </div>
        </div>
      )}
    </div>
  );
}
