import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DepartmentBadge from '../components/DepartmentBadge';
import CreateUserModal from '../components/CreateUserModal';
import ChangeDepartmentModal from '../components/ChangeDepartmentModal';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  Search, 
  Shield, 
  CheckCircle2, 
  XCircle,
  AlertCircle
} from 'lucide-react';

export default function AdminUsersPage() {
  const { user, isAdminTong, isAdminCap2 } = useAuth();
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState(isAdminTong ? 'PENDING' : 'ACTIVE'); // PENDING or ACTIVE
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [changeDeptUser, setChangeDeptUser] = useState(null);
  const [alertMsg, setAlertMsg] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dRes, uRes, pRes] = await Promise.all([
        api.get('/auth/departments'),
        api.get('/users?status=ACTIVE'),
        isAdminTong ? api.get('/users?status=PENDING_APPROVAL') : Promise.resolve({ data: { users: [] } })
      ]);

      if (dRes.data.success) setDepartments(dRes.data.departments);
      if (uRes.data.success) setUsers(uRes.data.users);
      if (pRes.data.success) setPendingUsers(pRes.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (userId) => {
    try {
      const res = await api.put(`/users/${userId}/approve`);
      if (res.data.success) {
        setAlertMsg({ type: 'success', text: 'Đã duyệt kích hoạt tài khoản thành công!' });
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi duyệt.');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn từ chối đăng ký này?')) return;
    try {
      const res = await api.put(`/users/${userId}/reject`);
      if (res.data.success) {
        setAlertMsg({ type: 'success', text: 'Đã từ chối đăng ký.' });
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi từ chối.');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) return;
    try {
      const res = await api.delete(`/users/${userId}`);
      if (res.data.success) {
        setAlertMsg({ type: 'success', text: 'Đã xóa tài khoản thành công.' });
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi xóa.');
    }
  };

  const filteredActiveUsers = users.filter((u) => {
    if (deptFilter && u.department_id !== parseInt(deptFilter)) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return u.full_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Alert toast */}
      {alertMsg && (
        <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between shadow-sm ${
          alertMsg.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="text-xs hover:underline">
            Đóng
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Quản Trị Thành Viên Đoàn Trường
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isAdminTong 
                ? 'Duyệt đăng ký mới, cấp tài khoản Admin 2 & User, đổi phân ban, xóa tài khoản' 
                : `Quản lý thành viên ${user.department_name}`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {isAdminTong ? 'Cấp Tài Khoản Mới' : 'Thêm Thành Viên Ban'}
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        {isAdminTong && (
          <button
            onClick={() => setActiveSubTab('PENDING')}
            className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'PENDING'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-4 h-4 mr-1.5" />
            Duyệt Đăng Ký Mới
            {pendingUsers.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-amber-700">
                {pendingUsers.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('ACTIVE')}
          className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'ACTIVE'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 mr-1.5" />
          Thành Viên Hoạt Động ({users.length})
        </button>
      </div>

      {/* TAB 1: PENDING APPROVAL (ONLY ADMIN TỔNG) */}
      {isAdminTong && activeSubTab === 'PENDING' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Danh Sách Đăng Ký Chờ Admin Tổng Phê Duyệt ({pendingUsers.length})
            </h3>
            <button onClick={loadData} className="text-xs text-blue-600 hover:underline flex items-center">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Tải lại
            </button>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Hiện không có tài khoản nào đang chờ phê duyệt.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Họ và tên</th>
                    <th className="px-4 py-3">Tài khoản & Email</th>
                    <th className="px-4 py-3">Phân Ban Đăng Ký</th>
                    <th className="px-4 py-3">Link Facebook Thẩm Định</th>
                    <th className="px-4 py-3 text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pendingUsers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 text-sm block">{p.full_name}</span>
                        <span className="text-[11px] text-slate-400">Đăng ký ngày {new Date(p.created_at).toLocaleDateString('vi-VN')}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-700">@{p.username}</span>
                        <span className="block text-slate-500 text-[11px]">{p.email}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <DepartmentBadge name={p.department_name} code={p.department_code} size="sm" />
                      </td>
                      <td className="px-4 py-3.5">
                        <a
                          href={p.facebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 inline-flex items-center text-xs font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Mở Facebook đối chiếu
                        </a>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleReject(p.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() => handleApprove(p.id)}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 shadow-sm shadow-green-200 transition-colors"
                        >
                          Duyệt Vào Ban
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE MEMBERS */}
      {activeSubTab === 'ACTIVE' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          {/* Search & Dept Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm tên, tài khoản, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {isAdminTong && (
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Lọc ban:</span>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Tất cả phân ban</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3">Tài khoản & Email</th>
                  <th className="px-4 py-3">Vai Trò</th>
                  <th className="px-4 py-3">Phân Ban</th>
                  <th className="px-4 py-3">Facebook</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredActiveUsers.map((u) => {
                  const roleBadge = u.role === 'ADMIN_TONG'
                    ? 'bg-red-600 text-white'
                    : (u.role === 'ADMIN_CAP_2' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700');

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block">{u.full_name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-700">@{u.username}</span>
                        <span className="block text-slate-500 text-[11px]">{u.email}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${roleBadge}`}>
                          {u.role === 'ADMIN_TONG' ? 'BCH (Admin Tổng)' : (u.role === 'ADMIN_CAP_2' ? 'BCH' : 'CTV')}
                        </span>
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
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            Xem FB
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                        {/* Only Admin Tổng can change department */}
                        {isAdminTong && u.role !== 'ADMIN_TONG' && (
                          <button
                            onClick={() => setChangeDeptUser(u)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                          >
                            Đổi Ban
                          </button>
                        )}

                        {/* Delete user */}
                        {u.role !== 'ADMIN_TONG' && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          departments={departments}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(msg) => {
            setAlertMsg({ type: 'success', text: msg });
            loadData();
          }}
        />
      )}

      {/* Change Department Modal */}
      {changeDeptUser && (
        <ChangeDepartmentModal
          user={changeDeptUser}
          departments={departments}
          onClose={() => setChangeDeptUser(null)}
          onSuccess={(msg) => {
            setAlertMsg({ type: 'success', text: msg });
            loadData();
          }}
        />
      )}
    </div>
  );
}
