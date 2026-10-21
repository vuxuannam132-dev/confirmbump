import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Flame, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function LoginPage({ onNavigateRegister }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingNotice, setPendingNotice] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    setError('');
    setPendingNotice(null);

    try {
      await login(username, password);
    } catch (err) {
      if (err.response?.data?.status === 'PENDING_APPROVAL') {
        setPendingNotice(err.response.data.message);
      } else {
        setError(err.response?.data?.message || err.message || 'Đăng nhập không thành công.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-red-500 shadow-xl shadow-red-200 mb-3">
            <Flame className="w-10 h-10 text-yellow-300 fill-yellow-300" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            ĐOÀN TRƯỜNG - CONFIRM BUMP
          </h2>
          <p className="mt-1 text-xs uppercase tracking-widest font-bold text-red-600">
            Hệ Thống Theo Dõi Tương Tác Mạng Xã Hội
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {pendingNotice && (
              <div className="p-4 bg-amber-50 text-amber-900 text-xs rounded-xl border border-amber-300 space-y-1">
                <div className="font-bold flex items-center text-amber-800">
                  <AlertCircle className="w-4 h-4 mr-1.5 text-amber-600" />
                  Tài khoản đang chờ phê duyệt:
                </div>
                <p>{pendingNotice}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tên đăng nhập
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none transition-all placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none transition-all placeholder-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg shadow-red-200 active:scale-98 transition-all disabled:opacity-50"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? 'Đang Đăng Nhập...' : 'Đăng Nhập'}
            </button>
          </form>

          {/* Switch to Register */}
          <div className="mt-6 text-center pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Chưa có tài khoản đoàn viên?{' '}
              <button
                onClick={onNavigateRegister}
                className="font-bold text-red-600 hover:text-red-700 hover:underline inline-flex items-center"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Đăng ký tài khoản mới
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
