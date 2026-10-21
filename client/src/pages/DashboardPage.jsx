import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import TaskCard from '../components/TaskCard';
import ConfirmModal from '../components/ConfirmModal';
import { 
  CheckSquare, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Search,
  RefreshCw,
  Flame,
  Layers,
  CheckCheck
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isAdminTong } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('ALL'); // ALL, NEED_SUBMIT, PENDING, MAKEUP, COMPLETED
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [selectedTask, setSelectedTask] = useState(null);
  const [isMakeupModal, setIsMakeupModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks');
      if (res.data.success) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleOpenSubmitModal = (task, isMakeup) => {
    setSelectedTask(task);
    setIsMakeupModal(isMakeup);
  };

  const handleModalSuccess = (msg) => {
    setAlertMessage({ type: 'success', text: msg });
    fetchTasks();
    setTimeout(() => setAlertMessage(null), 5000);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa task này?')) return;
    try {
      const res = await api.delete(`/tasks/${taskId}`);
      if (res.data.success) {
        setAlertMessage({ type: 'success', text: 'Đã xóa task thành công.' });
        fetchTasks();
        setTimeout(() => setAlertMessage(null), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa task');
    }
  };

  // Compute summary stats
  const totalTasks = tasks.length;
  const completedCount = tasks.filter(t => t.myStatus === 'DA_HOAN_THANH' || t.myStatus === 'HOAN_THANH_BU').length;
  const pendingCount = tasks.filter(t => t.myStatus === 'CHO_DUYET').length;
  const makeupNeedCount = tasks.filter(t => t.myStatus === 'QUA_HAN_CHO_NOP_BU').length;
  const openCount = tasks.filter(t => t.myStatus === 'CHUA_NOP' || t.myStatus === 'BI_TU_CHOI').length;

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterTab === 'NEED_SUBMIT') {
      if (task.myStatus !== 'CHUA_NOP' && task.myStatus !== 'QUA_HAN_CHO_NOP_BU' && task.myStatus !== 'BI_TU_CHOI') return false;
    } else if (filterTab === 'PENDING') {
      if (task.myStatus !== 'CHO_DUYET') return false;
    } else if (filterTab === 'MAKEUP') {
      if (task.myStatus !== 'QUA_HAN_CHO_NOP_BU' && task.myStatus !== 'HOAN_THANH_BU') return false;
    } else if (filterTab === 'COMPLETED') {
      if (task.myStatus !== 'DA_HOAN_THANH' && task.myStatus !== 'HOAN_THANH_BU') return false;
    }

    if (platformFilter !== 'ALL' && task.platform !== platformFilter) {
      return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return task.title.toLowerCase().includes(q) || (task.description && task.description.toLowerCase().includes(q));
    }

    return true;
  });

  // Clean greeting without duplicating "đồng chí"
  const formattedGreeting = user.full_name?.startsWith('Đồng chí') 
    ? user.full_name 
    : `đồng chí ${user.full_name}`;

  return (
    <div className="space-y-6">
      {/* Alert toast */}
      {alertMessage && (
        <div className="p-4 bg-green-50 text-green-800 rounded-2xl border border-green-200 shadow-sm flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{alertMessage.text}</span>
          </div>
          <button onClick={() => setAlertMessage(null)} className="text-xs text-green-600 hover:underline">
            Đóng
          </button>
        </div>
      )}

      {/* Hero Banner: Premium Youth Union Design */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-600 to-blue-700 rounded-3xl p-5 sm:p-7 text-white shadow-xl shadow-red-200/40">
        {/* Subtle decorative glow shapes */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-yellow-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-extrabold text-yellow-300 border border-white/20">
              <Flame className="w-3.5 h-3.5 mr-1 text-yellow-300 fill-yellow-300" />
              <span>Đoàn Trường • {user.department_name}</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">
              Xin chào, {formattedGreeting}!
            </h1>

            <p className="text-red-100 text-xs sm:text-sm max-w-xl font-medium">
              Kiểm tra các bài viết mới cần bump tương tác mạng xã hội và tải lên ảnh minh chứng.
            </p>
          </div>

          <button
            onClick={fetchTasks}
            className="flex items-center px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold transition-all border border-white/20 backdrop-blur-sm self-end md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {/* 4 KPI Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mt-6 pt-5 border-t border-white/20">
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/15 transition-colors">
            <p className="text-[11px] sm:text-xs text-red-100 font-semibold">Cần Nộp / Chưa Xong</p>
            <p className="text-xl sm:text-2xl font-black mt-1 text-white">{openCount}</p>
          </div>

          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/15 transition-colors">
            <p className="text-[11px] sm:text-xs text-red-100 font-semibold">Đang Chờ Duyệt</p>
            <p className="text-xl sm:text-2xl font-black mt-1 text-white">{pendingCount}</p>
          </div>

          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/15 transition-colors">
            <p className="text-[11px] sm:text-xs text-yellow-200 font-semibold">Quá Hạn Bù (3 Ngày)</p>
            <p className="text-xl sm:text-2xl font-black mt-1 text-yellow-300">{makeupNeedCount}</p>
          </div>

          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/15 transition-colors">
            <p className="text-[11px] sm:text-xs text-red-100 font-semibold">Đã Hoàn Thành</p>
            <p className="text-xl sm:text-2xl font-black mt-1 text-white">{completedCount}/{totalTasks}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Horizontal Scrollable Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterTab === 'ALL' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất Cả ({totalTasks})
          </button>

          <button
            onClick={() => setFilterTab('NEED_SUBMIT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterTab === 'NEED_SUBMIT' 
                ? 'bg-red-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cần Nộp ({openCount + makeupNeedCount})
          </button>

          <button
            onClick={() => setFilterTab('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterTab === 'PENDING' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Chờ Duyệt ({pendingCount})
          </button>

          <button
            onClick={() => setFilterTab('MAKEUP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterTab === 'MAKEUP' 
                ? 'bg-amber-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Hạn Bù 3 Ngày ({makeupNeedCount})
          </button>

          <button
            onClick={() => setFilterTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterTab === 'COMPLETED' 
                ? 'bg-green-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Đã Xong ({completedCount})
          </button>
        </div>

        {/* Search & Platform Filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">Tất cả MXH</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="TIKTOK">TikTok</option>
            <option value="INSTAGRAM">Instagram</option>
          </select>
        </div>
      </div>

      {/* Task List Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-slate-500">Đang tải nhiệm vụ...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">Không tìm thấy task nào</h3>
          <p className="text-xs text-slate-400 mt-1">Không có nhiệm vụ nào phù hợp với bộ lọc đã chọn.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpenSubmitModal={handleOpenSubmitModal}
              onDeleteTask={handleDeleteTask}
              isAdminTong={isAdminTong}
            />
          ))}
        </div>
      )}

      {/* Confirm Submission Modal */}
      {selectedTask && (
        <ConfirmModal
          task={selectedTask}
          isMakeup={isMakeupModal}
          onClose={() => setSelectedTask(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
