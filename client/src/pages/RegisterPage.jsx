import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Flame, Mail, Send, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

export default function RegisterPage({ onNavigateLogin }) {
  const { register } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // OTP State
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState(null);

  // Load departments
  useEffect(() => {
    api.get('/auth/departments')
      .then((res) => {
        if (res.data.success) {
          setDepartments(res.data.departments);
          if (res.data.departments.length > 0) {
            setDepartmentId(res.data.departments[0].id);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ trước khi gửi mã xác nhận.');
      return;
    }

    setSendingOtp(true);
    setError('');
    setDevOtpHint(null);

    try {
      const res = await api.post('/auth/send-otp', { email });
      if (res.data.success) {
        setOtpSent(true);
        setOtpCountdown(60);
        if (res.data.devOtp) {
          setDevOtpHint(res.data.devOtp);
          setOtpCode(res.data.devOtp); // Auto-fill for ultra smooth testing on localhost!
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi mã xác nhận.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !otpCode || !facebookUrl || !departmentId || !username || !password) {
      setError('Vui lòng điền đầy đủ tất cả các trường thông tin.');
      return;
    }

    if (otpCode.length !== 6) {
      setError('Mã xác minh phải gồm đúng 6 chữ số.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await register({
        full_name: fullName,
        email,
        otp_code: otpCode,
        facebook_url: facebookUrl,
        department_id: parseInt(departmentId),
        username,
        password
      });

      if (res.success) {
        const selectedDept = departments.find(d => d.id === parseInt(departmentId));
        setSuccessNotice({
          message: res.message,
          deptName: selectedDept ? selectedDept.name : 'Phân ban đã chọn'
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đăng ký không thành công.');
    } finally {
      setLoading(false);
    }
  };

  if (successNotice) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full mx-auto bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-xl font-black text-slate-900">Đăng Ký Thành Công!</h2>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-xs text-blue-900 leading-relaxed text-left">
            <p className="font-bold mb-1">Thông báo trạng thái:</p>
            <p>
              Tài khoản của bạn đã được ghi nhận và đang chờ <b>Admin Tổng</b> phê duyệt chính thức vào <b>{successNotice.deptName}</b>.
            </p>
            <p className="mt-2 text-slate-600">
              * Sau khi được duyệt, bạn sẽ đăng nhập bình thường và nhận các task bump bài của phân ban.
            </p>
          </div>

          <button
            onClick={onNavigateLogin}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
          >
            Quay Về Trang Đăng Nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-red-500 shadow-xl shadow-red-200 mb-2">
            <Flame className="w-8 h-8 text-yellow-300 fill-yellow-300" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            ĐĂNG KÝ THÀNH VIÊN ĐOÀN TRƯỜNG
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Nhận mã OTP qua Email • Đăng ký vào 1 trong 4 phân ban
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Dev OTP Hint */}
            {devOtpHint && (
              <div className="p-3 bg-emerald-50 text-emerald-900 text-xs rounded-xl border border-emerald-300 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Mã OTP Localhost: <b className="text-sm font-mono tracking-widest text-emerald-700">{devOtpHint}</b></span>
                </div>
                <span className="text-[10px] bg-emerald-200 px-2 py-0.5 rounded-full font-bold text-emerald-800">Đã tự điền</span>
              </div>
            )}

            {/* Họ và tên */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Họ và tên đoàn viên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn An"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Email & Send OTP */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Địa chỉ Email nhận mã xác nhận <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="an.nguyen@gmail.com"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || otpCountdown > 0}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex items-center whitespace-nowrap"
                >
                  {sendingOtp ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <Send className="w-3.5 h-3.5 mr-1" />
                  )}
                  {otpCountdown > 0 ? `${otpCountdown}s` : 'Gửi mã OTP'}
                </button>
              </div>
            </div>

            {/* Mã OTP 6 số */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mã xác minh Email (6 số) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Nhập 6 số ngẫu nhiên (VD: 682914)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm tracking-widest font-mono font-bold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Mã có hiệu lực trong 5 phút kể từ lúc gửi.
              </span>
            </div>

            {/* Link Facebook cá nhân */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Link Facebook cá nhân <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Dùng để Admin Tổng xác minh danh tính đoàn viên khi phê duyệt.
              </span>
            </div>

            {/* Phân ban */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Đăng ký vào Phân Ban <span className="text-red-500">*</span>
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tên đăng nhập & Mật khẩu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tên đăng nhập <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="an_nguyen"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg shadow-red-200 active:scale-98 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Đăng Ký Tài Khoản
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={onNavigateLogin}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Đã có tài khoản? Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
