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
  CheckCheck
} from 'lucide-react';

export default function DepartmentTrackingPage() {
  const { user, isAdminTong, isAdminCap2 } = useAuth();
  const [progressData, setProgressData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [selectedDept, setSelectedDept] = useState(
    isAdminCap2 ? user.department_id : ''
  );
  const [searchName, setSearchName] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      if (isAdminTong) {
        const dRes = await api.get('/auth/departments');
        if (dRes.data.success) setDepartments(dRes.data.departments);
      }

      await fetchProgress();
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [selectedDept, searchName]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const url = `/export/excel${selectedDept ? `?department_id=${selectedDept}` : ''}`;
      
      const response = await api.get(url, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const deptCode = selectedDept 
        ? (departments.find(d => d.id === parseInt(selectedDept))?.code || 'Ban') 
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

  // Stats calculation
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
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              {isAdminTong 
                ? 'Tiến Độ Bump Bài Toàn Đoàn & Phân Ban' 
                : `Tiến Độ ${user.department_name}`}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Kiểm tra tỷ lệ hoàn thành, làm đúng hạn, làm bù 3 ngày và xuất báo cáo Excel
            </p>
          </div>
        </div>

        {/* Export Excel Button */}
        <button
          onClick={handleExportExcel}
          disabled={exporting}
          className="w-full md:w-auto flex items-center justify-center px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isAdminTong && !selectedDept ? 'Xuất Excel Toàn Hệ Thống' : 'Xuất Excel Phân Ban'}
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-400">Thành viên</span>
          <p className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{totalMembers}</p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-400">Tỷ lệ hoàn thành</span>
          <p className={`text-xl sm:text-2xl font-black mt-0.5 ${
            avgCompletion >= 80 ? 'text-green-600' : (avgCompletion >= 50 ? 'text-amber-600' : 'text-red-600')
          }`}>
            {avgCompletion}%
          </p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-400">Đúng hạn</span>
          <p className="text-xl sm:text-2xl font-black text-green-600 mt-0.5">{totalOnTime}</p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-400">Nộp bù (3 ngày)</span>
          <p className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">{totalMakeup}</p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-400">Chưa nộp / Quá hạn</span>
          <p className="text-xl sm:text-2xl font-black text-red-600 mt-0.5">{totalMissing}</p>
        </div>
      </div>

      {/* Search & Department Switcher Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Tìm theo họ tên đoàn viên..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Dept Switcher (Only for Admin Tổng) */}
        {isAdminTong && (
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Xem phân ban:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Toàn Đoàn (Tất cả)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content Area: Mobile Cards & Desktop Table */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs">
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
              {progressData.map((item, idx) => {
                const u = item.user;
                const rate = item.completionRate;
                let rateColor = 'text-green-600 bg-green-50 border-green-200';
                if (rate < 50) rateColor = 'text-red-600 bg-red-50 border-red-200';
                else if (rate < 80) rateColor = 'text-amber-600 bg-amber-50 border-amber-200';

                return (
                  <div key={u.id} className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-extrabold text-sm text-slate-900">{u.full_name}</div>
                        <div className="text-[11px] text-slate-400">@{u.username} • {u.role === 'ADMIN_CAP_2' ? 'Trưởng Ban' : 'Thành viên'}</div>
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
                          className="text-blue-600 hover:underline inline-flex items-center text-[11px] font-semibold"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" /> FB
                        </a>
                      )}
                    </div>

                    {/* Stats pill list */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1 text-center text-[11px]">
                      <div className="bg-white p-1.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Tổng</span>
                        <b className="text-slate-700">{item.totalTasks}</b>
                      </div>
                      <div className="bg-green-50 p-1.5 rounded-xl border border-green-200">
                        <span className="text-[10px] text-green-600 block">Đúng hạn</span>
                        <b className="text-green-700">{item.approvedOnTime}</b>
                      </div>
                      <div className="bg-amber-50 p-1.5 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-amber-600 block">Bù 3d</span>
                        <b className="text-amber-700">{item.approvedMakeup}</b>
                      </div>
                      <div className="bg-red-50 p-1.5 rounded-xl border border-red-200">
                        <span className="text-[10px] text-red-600 block">Thiếu</span>
                        <b className="text-red-700">{item.missingCount}</b>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">STT</th>
                    <th className="px-4 py-3">Đoàn viên</th>
                    <th className="px-4 py-3">Phân Ban</th>
                    <th className="px-4 py-3">Facebook</th>
                    <th className="px-4 py-3 text-center">Tổng Task</th>
                    <th className="px-4 py-3 text-center text-green-700">Đúng Hạn</th>
                    <th className="px-4 py-3 text-center text-amber-700">Nộp Bù (3 ngày)</th>
                    <th className="px-4 py-3 text-center text-red-700">Chưa Nộp</th>
                    <th className="px-4 py-3 text-center">Tỷ Lệ Hoàn Thành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {progressData.map((item, idx) => {
                    const u = item.user;
                    const rate = item.completionRate;
                    let rateColor = 'text-green-600 bg-green-50 border-green-200';
                    if (rate < 50) rateColor = 'text-red-600 bg-red-50 border-red-200';
                    else if (rate < 80) rateColor = 'text-amber-600 bg-amber-50 border-amber-200';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{u.full_name}</div>
                          <div className="text-[11px] text-slate-400">@{u.username} • {u.role === 'ADMIN_CAP_2' ? 'Trưởng Ban' : 'Thành viên'}</div>
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
                              className="text-blue-600 hover:underline inline-flex items-center"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                              <span>Xem FB</span>
                            </a>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-700">{item.totalTasks}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-green-600">{item.approvedOnTime}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-amber-600">{item.approvedMakeup}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-red-600">{item.missingCount}</td>
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
    </div>
  );
}
