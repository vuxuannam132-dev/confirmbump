import React, { useState } from 'react';
import { X, Shield, User, Search, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function ChangeRoleModal({ user, onClose, onSuccess }) {
  const [selectedRole, setSelectedRole] = useState(user?.role || 'USER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const roleOptions = [
    {
      id: 'USER',
      name: 'CTV (Cộng tác viên)',
      badge: 'CTV',
      color: 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60',
      badgeColor: 'bg-slate-700 text-white',
      icon: User,
      desc: 'Quyền thành viên tiêu chuẩn: Làm task, nộp minh chứng confirm bài viết, xem lịch sử cá nhân.'
    },
    {
      id: 'KIEM_DUYET',
      name: 'Người kiểm duyệt (Moderator)',
      badge: 'Kiểm Duyệt',
      color: 'border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/30',
      badgeColor: 'bg-teal-600 text-white',
      icon: Search,
      desc: 'Quyền kiểm duyệt: Duyệt confirm cả 4 phân ban, xem ai chưa confirm, xuất Excel 4 ban, vẫn phải làm task.'
    },
    {
      id: 'ADMIN_CAP_2',
      name: 'BCH (Admin Cấp 2 / Trưởng Ban)',
      badge: 'BCH',
      color: 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30',
      badgeColor: 'bg-blue-600 text-white',
      icon: Shield,
      desc: 'Quyền quản trị ban: Quản lý & duyệt thành viên trong ban, xem tiến độ & ai chưa confirm, xuất Excel ban mình, vẫn phải làm task.'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedRole === user.role) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.put(`/users/${user.id}/change-role`, { role: selectedRole });
      if (res.data.success) {
        onSuccess(res.data.message);
        onClose();
      } else {
        setError(res.data.message || 'Không thể đổi vai trò.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi đổi vai trò.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all my-6">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Phân Quyền Vai Trò Thành Viên
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Target user details */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Thành viên:</span>
              <p className="font-bold text-sm text-slate-900 dark:text-white">{user.full_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">@{user.username} • {user.department_name}</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              Hiện tại: {user.role === 'ADMIN_CAP_2' ? 'BCH' : (user.role === 'KIEM_DUYET' ? 'Kiểm duyệt' : 'CTV')}
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-800 font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Options */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">
              Chọn vai trò phân bổ:
            </label>

            {roleOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedRole === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedRole(opt.id)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-purple-600 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 shadow-sm ring-1 ring-purple-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {opt.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${opt.badgeColor}`}>
                        {opt.badge}
                      </span>
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedRole(opt.id)}
                        className="text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-9 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Xác Nhận Đổi Quyền
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
