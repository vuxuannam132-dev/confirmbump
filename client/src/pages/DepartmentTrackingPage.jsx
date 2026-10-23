import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DepartmentBadge from '../components/DepartmentBadge';
import { 
  FileSpreadsheet, 
  Search, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Download,
  BarChart2,
  RefreshCw,
  Loader2,
  CheckCheck,
  UserX,
  Copy,
  Check,
  Clock,
  Calendar,
  Filter,
  Flame,
  MessageCircle
} from 'lucide-react';

export default function DepartmentTrackingPage() {
  const { user, isAdminTong, isAdminCap2, isReviewer } = useAuth();
  const canFilterAllDepts = isAdminTong || isReviewer;

  // View mode: 'SUMMARY' (Tiến độ tổng quan) or 'UNCONFIRMED' (Danh sách chưa confirm)
  const [viewMode, setViewMode] = useState('SUMMARY');

  // Summary state
  const [progressData, setProgressData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters for summary
  const [selectedDept, setSelectedDept] = useState(
    isAdminCap2 ? user.department_id : ''
  );
  const [searchName, setSearchName] = useState('');

  // Unconfirmed state & filters
  const [unconfirmedList, setUnconfirmedList] = useState([]);
  const [unconfirmedLoading, setUnconfirmedLoading] = useState(false);
  const [tasksList, setTasksList] = useState([]);
  const [selectedTaskFilter, setSelectedTaskFilter] = useState('ALL');
  const [unconfirmedDeptFilter, setUnconfirmedDeptFilter] = useState(
    isAdminCap2 ? user.department_id : ''
  );
  const [unconfirmedSearch, setUnconfirmedSearch] = useState('');
  const [copiedReminder, setCopiedReminder] = useState(false);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const promises = [fetchProgress()];

      if (canFilterAllDepts) {
        promises.push(
          api.get('/auth/departments').then(res => {
            if (res.data.success) setDepartments(res.data.departments);
          })
        );
      }

      // Fetch tasks for unconfirmed filtering
      promises.push(
        api.get('/tasks').then(res => {
          if (res.data.success) setTasksList(res.data.tasks || []);
        })
      );

      await Promise.all(promises);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await api.get('/confirms/progress', {
        params: {
          department_id: selectedDept || undefined,
          search: searchName || undefined
        }
      });
      if (res.data.success) {
        setProgressData(res.data.progress);
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  };

  const fetchUnconfirmed = async () => {
    try {
      setUnconfirmedLoading(true);
      const res = await api.get('/confirms/unconfirmed', {
        params: {
          task_id: selectedTaskFilter !== 'ALL' ? selectedTaskFilter : undefined,
          department_id: unconfirmedDeptFilter || undefined,
          search: unconfirmedSearch || undefined
        }
      });
      if (res.data.success) {
        setUnconfirmedList(res.data.unconfirmed || []);
      }
    } catch (err) {
      console.error('Error fetching unconfirmed:', err);
    } finally {
      setUnconfirmedLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [selectedDept, searchName]);

  useEffect(() => {
    if (viewMode === 'UNCONFIRMED') {
      fetchUnconfirmed();
    }
  }, [viewMode, selectedTaskFilter, unconfirmedDeptFilter, unconfirmedSearch]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const targetDept = viewMode === 'UNCONFIRMED' ? unconfirmedDeptFilter : selectedDept;
      const url = `/export/excel${targetDept ? `?department_id=${targetDept}` : ''}`;
      
      const response = await api.get(url, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const deptCode = targetDept 
        ? (departments.find(d => d.id === parseInt(targetDept))?.code || 'Ban') 
        : (isAdminCap2 ? user.department_code : 'Toan-Doan');
      link.setAttribute('download', `Bao-Cao-Confirm-Bump-${deptCode}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Lỗi khi xuất file Excel: ' + (err.message || ''));
    } finally {
      setExporting(false);
    }
  };

  // Copy reminder text for Zalo / Messenger group
  const handleCopyReminderList = () => {
    if (unconfirmedList.length === 0) return;

    let text = `📢 DANH SÁCH NHẮC NHỞ BUMP BÀI CHƯA HOÀN THÀNH:\n`;
    if (selectedTaskFilter !== 'ALL') {
      const currentTask = tasksList.find(t => t.id === parseInt(selectedTaskFilter));
      if (currentTask) {
        text += `📌 Nhiệm vụ: ${currentTask.title}\n`;
        text += `🔗 Link bài viết: ${currentTask.post_url}\n`;
      }
    }
    text += `⏰ Thời gian kiểm tra: ${new Date().toLocaleString('vi-VN')}\n\n`;

    // Group by user to avoid duplicate names if viewing ALL tasks
    const userMap = new Map();
    unconfirmedList.forEach(item => {
      const u = item.user;
      if (!userMap.has(u.id)) {
        userMap.set(u.id, {
          name: u.full_name,
          username: u.username,
          dept: u.department_name,
          tasks: []
        });
      }
      userMap.get(u.id).tasks.push(item.task.title);
    });

    let index = 1;
    userMap.forEach((uData) => {
      text += `${index}. ${uData.name} (@${uData.username}) - ${uData.dept}\n`;
      if (selectedTaskFilter === 'ALL' && uData.tasks.length > 1) {
        text += `   (Chưa nộp ${uData.tasks.length} task)\n`;
      }
      index++;
    });

    text += `\n👉 Các bạn đoàn viên/CTV vui lòng hoàn thành tương tác và nộp ảnh minh chứng sớm nhé!`;

    navigator.clipboard.writeText(text);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2500);
  };

  // Stats calculation for Summary
  const totalMembers = progressData.length;
  const avgCompletion = totalMembers > 0 
    ? Math.round(progressData.reduce((acc, p) => acc + p.completionRate, 0) / totalMembers) 
    : 100;
  const totalOnTime = progressData.reduce((acc, p) => acc + p.approvedOnTime, 0);
  const totalMakeup = progressData.reduce((acc, p) => acc + p.approvedMakeup, 0);
  const totalMissing = progressData.reduce((acc, p) => acc + p.missingCount, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs flex-shrink-0">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {canFilterAllDepts 
                ? 'Tiến Độ Bump Bài Toàn Đoàn & Phân Ban' 
                : `Tiến Độ ${user.department_name || 'Phân Ban'}`}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Theo dõi tỷ lệ hoàn thành, phát hiện thành viên chưa confirm và xuất báo cáo Excel
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Toggle View Mode Button */}
          <button
            onClick={() => {
              const nextMode = viewMode === 'SUMMARY' ? 'UNCONFIRMED' : 'SUMMARY';
              setViewMode(nextMode);
              if (nextMode === 'UNCONFIRMED') fetchUnconfirmed();
            }}
            className={`flex-1 md:flex-initial flex items-center justify-center px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs active:scale-95 ${
              viewMode === 'UNCONFIRMED'
                ? 'bg-blue-600 text-white shadow-blue-200 dark:shadow-none'
                : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/60 hover:bg-red-100'
            }`}
          >
            {viewMode === 'UNCONFIRMED' ? (
              <>
                <BarChart2 className="w-4 h-4 mr-1.5" />
                Về Bảng Tiến Độ
              </>
            ) : (
              <>
                <UserX className="w-4 h-4 mr-1.5" />
                Xem Ai Chưa Confirm
                {totalMissing > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 text-[10px] font-black bg-red-600 text-white rounded-full">
                    {totalMissing}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex-1 md:flex-initial flex items-center justify-center px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1.5" />
            )}
            {canFilterAllDepts && !selectedDept ? 'Xuất Excel 4 Ban' : 'Xuất Excel'}
          </button>
        </div>
      </div>

      {/* View Switcher Tabs Bar */}
      <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl select-none max-w-md">
        <button
          onClick={() => setViewMode('SUMMARY')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            viewMode === 'SUMMARY'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Bảng Tiến Độ Tổng Hợp</span>
        </button>

        <button
          onClick={() => {
            setViewMode('UNCONFIRMED');
            fetchUnconfirmed();
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            viewMode === 'UNCONFIRMED'
              ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UserX className="w-3.5 h-3.5" />
          <span>Danh Sách Chưa Confirm</span>
          {unconfirmedList.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-full font-black">
              {unconfirmedList.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: SUMMARY PROGRESS TABLE & CARDS */}
      {/* ========================================================================= */}
      {viewMode === 'SUMMARY' && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-400">Thành viên</span>
              <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalMembers}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-400">Tỷ lệ hoàn thành</span>
              <p className={`text-xl sm:text-2xl font-black mt-0.5 ${
                avgCompletion >= 80 ? 'text-green-600' : (avgCompletion >= 50 ? 'text-amber-600' : 'text-red-600')
              }`}>
                {avgCompletion}%
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-400">Đúng hạn</span>
              <p className="text-xl sm:text-2xl font-black text-green-600 mt-0.5">{totalOnTime}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-400">Nộp bù (3 ngày)</span>
              <p className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">{totalMakeup}</p>
            </div>
            <div 
              onClick={() => {
                setViewMode('UNCONFIRMED');
                fetchUnconfirmed();
              }}
              className="bg-red-50/60 dark:bg-red-950/30 hover:bg-red-100/80 dark:hover:bg-red-950/50 p-3.5 sm:p-4 rounded-2xl border border-red-200 dark:border-red-900/60 shadow-xs text-center col-span-2 sm:col-span-1 cursor-pointer transition-all group"
              title="Bấm để xem ngay danh sách ai chưa confirm"
            >
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-red-600 dark:text-red-400 flex items-center justify-center">
                Chưa nộp / Quá hạn ↗
              </span>
              <p className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400 mt-0.5 group-hover:scale-105 transition-transform">
                {totalMissing}
              </p>
            </div>
          </div>

          {/* Search & Department Switcher Bar */}
          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm theo họ tên đoàn viên..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Dept Switcher (Only for Admin Tổng & Người kiểm duyệt) */}
            {canFilterAllDepts && (
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Xem phân ban:</span>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Toàn Đoàn (Cả 4 Ban)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Content Area: Mobile Cards & Desktop Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-slate-400 font-bold">Đang tải số liệu tiến độ...</p>
              </div>
            ) : progressData.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Không tìm thấy thành viên nào phù hợp.
              </div>
            ) : (
              <>
                {/* Mobile View: Cards */}
                <div className="sm:hidden space-y-3">
                  {progressData.map((item) => {
                    const u = item.user;
                    const rate = item.completionRate;
                    let rateColor = 'text-green-600 bg-green-50 dark:bg-green-950/60 border-green-200 dark:border-green-800';
                    if (rate < 50) rateColor = 'text-red-600 bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800';
                    else if (rate < 80) rateColor = 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';

                    let roleBadgeText = 'Thành viên';
                    if (u.role === 'ADMIN_CAP_2') roleBadgeText = 'Trưởng Ban';
                    else if (u.role === 'KIEM_DUYET') roleBadgeText = 'Kiểm Duyệt';

                    return (
                      <div key={u.id} className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 space-y-2.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white">{u.full_name}</div>
                            <div className="text-[11px] text-slate-400">@{u.username} • {roleBadgeText}</div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${rateColor}`}>
                            {rate}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <DepartmentBadge name={u.department_name} code={u.department_code} size="sm" />
                          {u.facebook_url && (
                            <a
                              href={u.facebook_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center text-[11px] font-semibold"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" /> FB
                            </a>
                          )}
                        </div>

                        {/* Stats pill list */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1 text-center text-[11px]">
                          <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block">Tổng</span>
                            <b className="text-slate-700 dark:text-slate-200">{item.totalTasks}</b>
                          </div>
                          <div className="bg-green-50 dark:bg-green-950/40 p-1.5 rounded-xl border border-green-200 dark:border-green-800">
                            <span className="text-[10px] text-green-600 dark:text-green-400 block">Đúng hạn</span>
                            <b className="text-green-700 dark:text-green-300">{item.approvedOnTime}</b>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-xl border border-amber-200 dark:border-amber-800">
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block">Bù 3d</span>
                            <b className="text-amber-700 dark:text-amber-300">{item.approvedMakeup}</b>
                          </div>
                          <div className="bg-red-50 dark:bg-red-950/40 p-1.5 rounded-xl border border-red-200 dark:border-red-800">
                            <span className="text-[10px] text-red-600 dark:text-red-400 block">Thiếu</span>
                            <b className="text-red-700 dark:text-red-300">{item.missingCount}</b>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">STT</th>
                        <th className="px-4 py-3">Đoàn viên</th>
                        <th className="px-4 py-3">Phân Ban</th>
                        <th className="px-4 py-3">Facebook</th>
                        <th className="px-4 py-3 text-center">Tổng Task</th>
                        <th className="px-4 py-3 text-center text-green-700 dark:text-green-400">Đúng Hạn</th>
                        <th className="px-4 py-3 text-center text-amber-700 dark:text-amber-400">Nộp Bù (3 ngày)</th>
                        <th className="px-4 py-3 text-center text-red-700 dark:text-red-400">Chưa Nộp</th>
                        <th className="px-4 py-3 text-center">Tỷ Lệ Hoàn Thành</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {progressData.map((item, idx) => {
                        const u = item.user;
                        const rate = item.completionRate;
                        let rateColor = 'text-green-600 bg-green-50 dark:bg-green-950/60 border-green-200 dark:border-green-800';
                        if (rate < 50) rateColor = 'text-red-600 bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800';
                        else if (rate < 80) rateColor = 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';

                        let roleBadgeText = 'Thành viên';
                        if (u.role === 'ADMIN_CAP_2') roleBadgeText = 'Trưởng Ban';
                        else if (u.role === 'KIEM_DUYET') roleBadgeText = 'Kiểm Duyệt';

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3.5 text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-900 dark:text-white">{u.full_name}</div>
                              <div className="text-[11px] text-slate-400">@{u.username} • {roleBadgeText}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <DepartmentBadge name={u.department_name} code={u.department_code} size="sm" />
                            </td>
                            <td className="px-4 py-3.5">
                              {u.facebook_url ? (
                                <a
                                  href={u.facebook_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                                  <span>Xem FB</span>
                                </a>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center font-bold text-slate-700 dark:text-slate-300">{item.totalTasks}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-green-600 dark:text-green-400">{item.approvedOnTime}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-amber-600 dark:text-amber-400">{item.approvedMakeup}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-red-600 dark:text-red-400">{item.missingCount}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold border ${rateColor}`}>
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: DANH SÁCH THÀNH VIÊN CHƯA CONFIRM (THEO TỪNG TASK HOẶC TẤT CẢ TASK) */}
      {/* ========================================================================= */}
      {viewMode === 'UNCONFIRMED' && (
        <div className="space-y-4">
          {/* Controls Bar for Unconfirmed List */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-red-600 dark:text-red-400 flex items-center">
                  <UserX className="w-4 h-4 mr-2" />
                  Danh Sách Đoàn Viên Chưa Confirm
                  <span className="ml-2 text-xs font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-2.5 py-0.5 rounded-full">
                    {unconfirmedList.length} lượt chưa nộp
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Lọc theo từng bài đăng để kiểm tra và nhắc nhở đoàn viên kịp tiến độ
                </p>
              </div>

              {/* Action: Copy reminder list for Zalo / Facebook */}
              <button
                type="button"
                onClick={handleCopyReminderList}
                disabled={unconfirmedList.length === 0}
                className="flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
              >
                {copiedReminder ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-green-300" />
                    Đã Sao Chép Danh Sách Nhắc Nhở!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Sao Chép DS Nhắc Nhở (Gửi Zalo/FB)
                  </>
                )}
              </button>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              {/* 1. Filter by Task */}
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Chọn nhiệm vụ / bài đăng:
                </label>
                <select
                  value={selectedTaskFilter}
                  onChange={(e) => setSelectedTaskFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">Tất cả nhiệm vụ (Tổng hợp)</option>
                  {tasksList.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.platform}] {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Filter by Department (If authorized) */}
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Lọc phân ban:
                </label>
                {canFilterAllDepts ? (
                  <select
                    value={unconfirmedDeptFilter}
                    onChange={(e) => setUnconfirmedDeptFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Toàn Đoàn (Cả 4 Ban)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {user.department_name || 'Ban của bạn'}
                  </div>
                )}
              </div>

              {/* 3. Search Member */}
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Tìm thành viên:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Họ tên, username..."
                    value={unconfirmedSearch}
                    onChange={(e) => setUnconfirmedSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* List of Unconfirmed Members */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            {unconfirmedLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-bold">Đang kiểm tra danh sách chưa confirm...</p>
              </div>
            ) : unconfirmedList.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-950/60 text-green-600 mx-auto flex items-center justify-center">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  Tuyệt vời! Không có ai chưa confirm
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Toàn bộ thành viên theo điều kiện lọc đã nộp đủ minh chứng hoặc không có nhiệm vụ chưa hoàn thành.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="sm:hidden space-y-3">
                  {unconfirmedList.map((item, idx) => {
                    const u = item.user;
                    const t = item.task;
                    const isRejected = item.status === 'REJECTED';

                    return (
                      <div 
                        key={`${u.id}-${t.id}-${idx}`}
                        className="p-4 rounded-2xl border border-red-200/80 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20 space-y-2.5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {u.full_name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              @{u.username} • {u.phone ? u.phone : 'Chưa có SĐT'}
                            </div>
                          </div>

                          {/* Deadline state badge */}
                          {item.taskStatus === 'ON_TIME' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                              Trong hạn
                            </span>
                          )}
                          {item.taskStatus === 'MAKEUP_PERIOD' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                              Nộp bù (3d)
                            </span>
                          )}
                          {item.taskStatus === 'OVERDUE_CLOSED' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300">
                              Đã quá hạn
                            </span>
                          )}
                        </div>

                        {/* Task info */}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Nhiệm vụ chưa nộp:</span>
                          <p className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1 mt-0.5">
                            [{t.platform}] {t.title}
                          </p>
                          {isRejected && (
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block mt-1">
                              ⚠️ Đã nộp nhưng bị từ chối duyệt (Cần nộp lại)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <DepartmentBadge name={u.department_name} code={u.department_code} size="sm" />
                          
                          {u.facebook_url && (
                            <a
                              href={u.facebook_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold inline-flex items-center hover:bg-blue-700 shadow-2xs"
                            >
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Nhắn FB Nhắc Nhở
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">STT</th>
                        <th className="px-4 py-3">Đoàn viên chưa nộp</th>
                        <th className="px-4 py-3">Phân Ban</th>
                        <th className="px-4 py-3">Nhiệm Vụ Chưa Confirm</th>
                        <th className="px-4 py-3">Tình Trạng Hạn Chót</th>
                        <th className="px-4 py-3 text-right">Nhắc Nhở</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {unconfirmedList.map((item, idx) => {
                        const u = item.user;
                        const t = item.task;
                        const isRejected = item.status === 'REJECTED';

                        return (
                          <tr key={`${u.id}-${t.id}-${idx}`} className="hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-colors">
                            <td className="px-4 py-3.5 text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-900 dark:text-white">{u.full_name}</div>
                              <div className="text-[11px] text-slate-400">@{u.username} • {u.email}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <DepartmentBadge name={u.department_name} code={u.department_code} size="sm" />
                            </td>
                            <td className="px-4 py-3.5 max-w-xs">
                              <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                                [{t.platform}] {t.title}
                              </div>
                              {isRejected ? (
                                <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                                  ⚠️ Bị từ chối duyệt (Chưa nộp lại)
                                </span>
                              ) : (
                                <a 
                                  href={t.post_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-blue-600 hover:underline inline-flex items-center"
                                >
                                  Mở bài đăng ↗
                                </a>
                              )}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {item.taskStatus === 'ON_TIME' && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                                  Đang trong hạn chót
                                </span>
                              )}
                              {item.taskStatus === 'MAKEUP_PERIOD' && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                                  Đang nộp bù (3 ngày)
                                </span>
                              )}
                              {item.taskStatus === 'OVERDUE_CLOSED' && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200">
                                  Đã quá hạn khóa nộp
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              {u.facebook_url ? (
                                <a
                                  href={u.facebook_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center shadow-xs transition-colors"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 mr-1" />
                                  Nhắn FB
                                </a>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 text-xs">Không có link FB</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
