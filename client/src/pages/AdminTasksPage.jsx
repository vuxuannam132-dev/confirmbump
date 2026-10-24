import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DepartmentBadge from '../components/DepartmentBadge';
import TaskDetailModal from '../components/TaskDetailModal';
import { 
  PlusCircle, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  Clock, 
  Share2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  Eye,
  Megaphone,
  Send,
  Bell,
  X
} from 'lucide-react';

const STANDARD_BUMP_TEMPLATE = `📢 [YÊU CẦU BUMP BÀI TIÊU CHUẨN]
━━━━━━━━━━━━━━━━━━━━━━━━━━
❤️ THẢ CẢM XÚC:
   • React bài đăng (Tuyệt đối KHÔNG thả Like 👍, Buồn 😢, Phẫn nộ 😡). Ưu tiên: Thả Tim ❤️, Thương thương 🥰.

💬 BÌNH LUẬN:
   • Để lại ít nhất 3 bình luận có nghĩa, phù hợp nội dung bài viết (KHÔNG spam từ vô nghĩa, KHÔNG chỉ gửi icon).

👥 TAG BẠN BÈ:
   • Tag ít nhất 4 bạn bè không nằm trong danh sách CTV, BCH Đoàn trường.
   • Gắn thẻ Nêu bật (@highlight / @mọi người).

📢 RIÊNG BAN TRUYỀN THÔNG:
   • Tag ít nhất 4 bạn bè + Chia sẻ (up) bài viết lên Story hoặc Trang cá nhân (để chế độ Công khai).

🎯 CHỈ TIÊU KÊU GỌI:
   • Toàn thể CTV, BCH tích cực vận động, kêu gọi thêm 10 bạn bè thả tim và tương tác bài đăng.`;

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('FACEBOOK');
  const [postUrl, setPostUrl] = useState('');
  const [targetDeptId, setTargetDeptId] = useState(''); // '' means Toàn đoàn
  const [deadline, setDeadline] = useState('');

  // Broadcast announcement modal states
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSubmitting, setBroadcastSubmitting] = useState(false);
  const [broadcastAlert, setBroadcastAlert] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, dRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/auth/departments')
      ]);
      if (tRes.data.success) setTasks(tRes.data.tasks);
      if (dRes.data.success) setDepartments(dRes.data.departments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Default deadline: 2 days from now at 23:59
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(23, 59, 0, 0);
    // Format YYYY-MM-DDTHH:mm
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setDeadline(localISOTime);
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title || !postUrl || !deadline) {
      alert('Vui lòng điền đủ tiêu đề, link bài đăng và thời hạn hoàn thành.');
      return;
    }

    setSubmitting(true);
    setAlertMsg(null);

    try {
      const res = await api.post('/tasks', {
        title,
        description,
        platform,
        post_url: postUrl,
        target_department_id: targetDeptId ? parseInt(targetDeptId) : null,
        deadline: new Date(deadline).toISOString()
      });

      if (res.data.success) {
        setAlertMsg({ type: 'success', text: 'Đã tạo và thông báo task mới thành công!' });
        setTitle('');
        setDescription('');
        setPostUrl('');
        loadData();
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi khi tạo task.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Bạn có chắc muốn xóa vĩnh viễn task này cùng toàn bộ các minh chứng đã nộp?')) return;

    try {
      const res = await api.delete(`/tasks/${taskId}`);
      if (res.data.success) {
        setAlertMsg({ type: 'success', text: 'Đã xóa task thành công.' });
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa task');
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setBroadcastAlert({ type: 'error', text: 'Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.' });
      return;
    }

    setBroadcastSubmitting(true);
    setBroadcastAlert(null);

    try {
      const res = await api.post('/notifications/broadcast', {
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim()
      });

      if (res.data.success) {
        setBroadcastAlert({
          type: 'success',
          text: `🎉 ${res.data.message || 'Đã phát thông báo thành công!'}`
        });
        setTimeout(() => {
          setShowBroadcastModal(false);
          setBroadcastTitle('');
          setBroadcastMessage('');
          setBroadcastAlert(null);
        }, 2200);
      }
    } catch (err) {
      setBroadcastAlert({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi khi gửi thông báo công việc.'
      });
    } finally {
      setBroadcastSubmitting(false);
    }
  };

  const applyBroadcastPreset = (titleText, msgText) => {
    setBroadcastTitle(titleText);
    setBroadcastMessage(msgText);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Quản Lý Nhiệm Vụ & Phát Thông Báo
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tạo task bump bài mới và gửi thông báo đẩy trực tiếp về điện thoại toàn đoàn
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowBroadcastModal(true);
            setBroadcastAlert(null);
          }}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-extrabold text-xs shadow-md shadow-red-200 dark:shadow-none transition-all flex items-center justify-center space-x-2 active:scale-95 flex-shrink-0"
        >
          <Megaphone className="w-4 h-4" />
          <span>Phát Thông Báo Toàn Hệ Thống</span>
        </button>
      </div>
      {/* Alert toast */}
      {alertMsg && (
        <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between shadow-sm ${
          alertMsg.type === 'success' 
            ? 'bg-green-50 text-green-800 border-green-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {alertMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span>{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="text-xs hover:underline">
            Đóng
          </button>
        </div>
      )}

      {/* Form Card: Create Task */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Đăng Nhiệm Vụ Bump Bài Mới</h2>
            <p className="text-xs text-slate-500 font-medium">
              Chỉ Admin Tổng có quyền giao task cho Toàn đoàn hoặc từng Phân ban cụ thể
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tiêu đề nhiệm vụ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Bump bài Facebook: Lễ Ra Quân Chiến Dịch Mùa Hè Xanh 2026"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nền tảng mạng xã hội <span className="text-red-500">*</span>
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="FACEBOOK">Facebook</option>
                <option value="TIKTOK">TikTok</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="KHAC">Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Đường link bài đăng (Ấn vào mở ra bài viết) <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://www.facebook.com/... hoặc https://www.tiktok.com/@..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Hướng dẫn tương tác / Yêu cầu cụ thể
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setDescription(STANDARD_BUMP_TEMPLATE)}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors shadow-2xs"
                  title="Điền sẵn mẫu thông báo Bump bài chuẩn của Đoàn trường"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-red-600" />
                  Áp Dụng Mẫu Bump Tiêu Chuẩn (1 Chạm)
                </button>
                {description && (
                  <button
                    type="button"
                    onClick={() => setDescription('')}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 px-1.5 py-0.5 hover:underline"
                  >
                    Xóa trắng
                  </button>
                )}
              </div>
            </div>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Yêu cầu thả tim, để lại 1 bình luận cổ vũ và share công khai kèm hashtag #DoanTruong..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-normal leading-relaxed focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400 italic">
              💡 Bấm nút đỏ ở trên để tự động điền mẫu tiêu chuẩn, sau đó bạn có thể tự do chỉnh sửa thêm bớt tùy ý.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Phân ban nhận task
              </label>
              <select
                value={targetDeptId}
                onChange={(e) => setTargetDeptId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="">Toàn Đoàn (Cả 4 phân ban)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Thời hạn hoàn thành (Deadline) <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
              <span className="text-[11px] text-amber-700 mt-1 block font-medium">
                * Sau thời điểm này, hệ thống sẽ tự động kích hoạt 3 ngày nộp confirm bù.
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center px-6 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Đăng Nhiệm Vụ Mới
            </button>
          </div>
        </form>
      </div>

      {/* Task List Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          Danh Sách Task Đang Hoạt Động ({tasks.length})
        </h3>

        {loading ? (
          <div className="text-center py-10">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Đang tải...</p>
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-8">Chưa có task nào được tạo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nền tảng & Tiêu đề</th>
                  <th className="px-4 py-3">Đối tượng</th>
                  <th className="px-4 py-3">Hạn chót chính thức</th>
                  <th className="px-4 py-3">Hạn bù 3 ngày</th>
                  <th className="px-4 py-3 text-center">Tiến độ</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900 text-white">
                          {task.platform}
                        </span>
                        <a
                          href={task.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <span className="font-bold text-slate-800 line-clamp-1">{task.title}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <DepartmentBadge 
                        name={task.target_department_name} 
                        code={task.target_department_code} 
                        size="sm" 
                      />
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                      {new Date(task.deadline).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3.5 text-amber-700 font-semibold whitespace-nowrap">
                      {new Date(task.makeup_deadline).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className="font-bold text-green-600">{task.approvedCount || 0}</span> duyệt / 
                      <span className="font-bold text-blue-600 ml-1">{task.pendingCount || 0}</span> chờ
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => setSelectedTaskForDetail(task)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Xem chi tiết nội dung task"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTaskForDetail}
        isOpen={!!selectedTaskForDetail}
        onClose={() => setSelectedTaskForDetail(null)}
      />

      {/* Broadcast Announcement Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Phát Thông Báo Công Việc Toàn Đoàn
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Gửi thông báo đẩy về điện thoại và chuông thông báo của toàn bộ đoàn viên
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Templates */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">
                Mẫu soạn nhanh:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyBroadcastPreset(
                    '⏰ Nhắc nhở hạn chót hoàn thành bump bài',
                    'Đề nghị toàn thể CTV và BCH nhanh chóng vào thực hiện tương tác và nộp ảnh minh chứng trước khi hết hạn!'
                  )}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  ⏰ Nhắc hạn chót
                </button>
                <button
                  type="button"
                  onClick={() => applyBroadcastPreset(
                    '🔥 Chiến dịch truyền thông mới - Đẩy mạnh tương tác',
                    'Đoàn trường vừa phát động chiến dịch mới. Đề nghị các phân ban tích cực kêu gọi bạn bè tương tác và chia sẻ.'
                  )}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  🔥 Chiến dịch mới
                </button>
                <button
                  type="button"
                  onClick={() => applyBroadcastPreset(
                    '📢 Thông báo cuộc họp BCH và CTV Đoàn trường',
                    'Đề nghị các đồng chí kiểm tra thông tin và có mặt đúng giờ để tham gia buổi họp triển khai công tác.'
                  )}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  📢 Họp triển khai
                </button>
              </div>
            </div>

            {/* Alert in modal */}
            {broadcastAlert && (
              <div className={`p-3 rounded-xl text-xs font-bold border ${
                broadcastAlert.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300' 
                  : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300'
              }`}>
                {broadcastAlert.text}
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Tiêu đề thông báo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="VD: [KHẨN] Nhắc nhở hạn chót hoàn thành bump bài 20/10"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nội dung thông báo <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Nhập nội dung chi tiết công việc hoặc thông báo cần gửi tới tất cả thành viên..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={broadcastSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-md shadow-red-200 dark:shadow-none flex items-center space-x-2 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{broadcastSubmitting ? 'Đang gửi tới mọi người...' : 'Phát Thông Báo Ngay'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
