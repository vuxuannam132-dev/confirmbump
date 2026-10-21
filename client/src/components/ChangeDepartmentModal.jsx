import React, { useState } from 'react';
import { X, RefreshCw, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function ChangeDepartmentModal({ user, departments, onClose, onSuccess }) {
  const [departmentId, setDepartmentId] = useState(user?.department_id || departments[0]?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.put(`/users/${user.id}/change-department`, {
        department_id: departmentId
      });
      if (res.data.success) {
        onSuccess(res.data.message);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi đổi phân ban.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-base">Đổi Phân Ban Thành Viên</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Thành viên:</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">{user.full_name} ({user.username})</p>
            <p className="text-xs text-slate-500 mt-1">
              Phân ban hiện tại: <span className="font-semibold text-blue-600">{user.department_name}</span>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Chọn Phân Ban Mới
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
