import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getClientDeviceId, getClientDeviceName } from '../services/api';
import { 
  Flame, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Send, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  ShieldCheck,
  Mail,
  Smartphone,
  Check
} from 'lucide-react';

export default function LoginPage({ onNavigateRegister }) {
  const { login, verify2FA } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingNotice, setPendingNotice] = useState(null);
  const [revokedNotice, setRevokedNotice] = useState(() => {
    const reason = sessionStorage.getItem('auth_logout_reason');
    if (reason) {
      sessionStorage.removeItem('auth_logout_reason');
      return reason;
    }
    return null;
  });

  // 2FA Challenge State
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null);
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [trustThisDevice, setTrustThisDevice] = useState(true);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');

  // Trusted Device 2FA states
  const [trustedDeviceChallenge, setTrustedDeviceChallenge] = useState(null); // { challenge_token, device_info, no_trusted_devices, setup_token }
  const [trustedDevicePolling, setTrustedDevicePolling] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState('WAITING'); // 'WAITING' | 'APPROVED' | 'EXPIRED'

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [sendingForgotOtp, setSendingForgotOtp] = useState(false);
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const [forgotSuccess, setForgotSuccess] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Countdown timer for forgot OTP
  useEffect(() => {
    let timer;
    if (forgotCountdown > 0) {
      timer = setTimeout(() => setForgotCountdown(forgotCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [forgotCountdown]);

  // Polling for Trusted Device Approval
  useEffect(() => {
    if (!trustedDevicePolling || !trustedDeviceChallenge?.challenge_token) return;

    let pollCount = 0;
    const maxPolls = 150; // 5 minutes @ 2s interval

    const pollInterval = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(pollInterval);
        setApprovalStatus('EXPIRED');
        setTrustedDevicePolling(false);
        return;
      }

      try {
        const res = await api.get(`/auth/2fa/status?token=${trustedDeviceChallenge.challenge_token}`);
        if (res.data.status === 'APPROVED') {
          clearInterval(pollInterval);
          setApprovalStatus('APPROVED');
          setTrustedDevicePolling(false);
          if (res.data.token && res.data.user) {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('authToken', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            window.location.reload();
          }
        } else if (res.data.status === 'EXPIRED') {
          clearInterval(pollInterval);
          setApprovalStatus('EXPIRED');
          setTrustedDevicePolling(false);
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [trustedDevicePolling, trustedDeviceChallenge]);

  const handleSetFirstTrusted = async () => {
    try {
      setLoading(true);
      const res = await api.post('/auth/2fa/set-first-trusted', {
        setup_token: trustedDeviceChallenge.setup_token,
        device_id: getClientDeviceId(),
        device_name: getClientDeviceName()
      });

      if (res.data.success && res.data.token && res.data.user) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('authToken', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        window.location.reload();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi đăng ký thiết bị.');
    } finally {
      setLoading(false);
    }
  };

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
      const res = await login(username, password);
      if (res && res.require2fa) {
        if (res.method === 'TRUSTED_DEVICE') {
          setTrustedDeviceChallenge(res);
          if (!res.no_trusted_devices) {
            // Start polling for approval
            setTrustedDevicePolling(true);
            setApprovalStatus('WAITING');
          }
        } else {
          setTwoFactorChallenge(res);
          setTwoFactorOtp('');
          setTwoFactorError('');
          setTrustThisDevice(true);
        }
      }
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

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    const cleanOtp = twoFactorOtp.replace(/\s+/g, '');
    if (!cleanOtp || cleanOtp.length !== 9) {
      setTwoFactorError('Vui lòng nhập đúng và đủ mã xác thực 9 số.');
      return;
    }

    setTwoFactorLoading(true);
    setTwoFactorError('');

    try {
      await verify2FA(twoFactorChallenge.challenge_token, cleanOtp, trustThisDevice);
    } catch (err) {
      setTwoFactorError(err.response?.data?.message || err.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleSendForgotOtp = async () => {
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Vui lòng nhập email hợp lệ.');
      return;
    }

    setSendingForgotOtp(true);
    setForgotError('');

    try {
      const res = await api.post('/auth/forgot-password/send-otp', { email: forgotEmail });
      if (res.data.success) {
        setForgotOtpSent(true);
        setForgotCountdown(60);
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Lỗi gửi mã xác nhận.');
    } finally {
      setSendingForgotOtp(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotOtp || !newPassword) {
      setForgotError('Vui lòng điền đủ email, mã OTP và mật khẩu mới.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (newPassword.length < 6) {
      setForgotError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      const res = await api.post('/auth/forgot-password/reset', {
        email: forgotEmail,
        otp_code: forgotOtp,
        new_password: newPassword
      });

      if (res.data.success) {
        setForgotSuccess(res.data.message);
        setTimeout(() => {
          setIsForgotPassword(false);
          setForgotSuccess(null);
          setForgotOtpSent(false);
          setForgotEmail('');
          setForgotOtp('');
          setNewPassword('');
          setConfirmNewPassword('');
        }, 3000);
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Lỗi khi đặt lại mật khẩu.');
    } finally {
      setForgotLoading(false);
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
          {trustedDeviceChallenge && trustedDeviceChallenge.no_trusted_devices ? (
            /* Case 1: Chưa có thiết bị tin cậy nào -> Đăng ký thiết bị hiện tại */
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 mb-3">
                  <ShieldCheck className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Thiết Lập 2FA - Thiết Bị Tin Cậy</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Bạn đang dùng xác thực qua thiết bị tin cậy nhưng chưa đăng ký thiết bị nào.
                  Đăng ký thiết bị này làm thiết bị tin cậy đầu tiên để tiếp tục.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">📱 Thiết bị hiện tại sẽ được đăng ký:</p>
                <p className="text-sm text-blue-800 dark:text-blue-300 break-all">{navigator.userAgent.slice(0, 60)}...</p>
              </div>

              <button
                type="button"
                onClick={handleSetFirstTrusted}
                disabled={loading}
                className="w-full py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Đang đăng ký...' : '🛡️ Đặt thiết bị này làm thiết bị tin cậy'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTrustedDeviceChallenge(null);
                  setError('');
                }}
                className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ← Quay lại đăng nhập
              </button>
            </div>
          ) : trustedDeviceChallenge && !trustedDeviceChallenge.no_trusted_devices ? (
            /* Case 2: Đã có thiết bị tin cậy -> Đang chờ phê duyệt */
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950 mb-3">
                {approvalStatus === 'WAITING' ? (
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : approvalStatus === 'APPROVED' ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {approvalStatus === 'WAITING' ? '⏳ Đang chờ phê duyệt...' :
                 approvalStatus === 'APPROVED' ? '✅ Đã được chấp thuận!' :
                 '⏰ Yêu cầu đã hết hạn'}
              </h3>
              {approvalStatus === 'WAITING' && (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Một thông báo đã được gửi đến thiết bị tin cậy của bạn.<br />
                    Hãy mở thông báo đó và ấn <strong>"Chấp thuận"</strong> để đăng nhập.
                  </p>
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 text-left">
                    🖥️ Thiết bị: <strong>{trustedDeviceChallenge.device_info?.device_name || 'Thiết bị hiện tại'}</strong><br />
                    🌐 IP: <strong>{trustedDeviceChallenge.device_info?.ip_address || 'N/A'}</strong>
                  </div>
                </>
              )}
              {approvalStatus === 'EXPIRED' && (
                <button
                  type="button"
                  onClick={() => { setTrustedDeviceChallenge(null); setApprovalStatus('WAITING'); }}
                  className="w-full py-3 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all"
                >
                  Thử lại
                </button>
              )}
              <button
                type="button"
                onClick={() => { setTrustedDeviceChallenge(null); setTrustedDevicePolling(false); }}
                className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ← Quay lại đăng nhập
              </button>
            </div>
          ) : twoFactorChallenge ? (
            /* 2FA Challenge Form */
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-blue-200">
                  <ShieldCheck className="w-6 h-6 text-yellow-300" />
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Xác Thực 2 Lớp (2FA)
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Bảo vệ đăng nhập tài khoản Đoàn trường
                </p>
              </div>

              {twoFactorError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{twoFactorError}</span>
                </div>
              )}

              <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs space-y-2">
                <div className="flex items-start space-x-2 text-blue-900 font-bold">
                  <Mail className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Mã OTP 9 số đã được gửi qua email:</span>
                </div>
                <p className="text-blue-800 font-mono font-bold text-center py-1 bg-white/80 rounded-lg border border-blue-200">
                  {twoFactorChallenge.email_masked}
                </p>
                <p className="text-[11px] text-blue-600">
                  💡 Vui lòng kiểm tra Hộp thư đến (hoặc hòm thư Rác / Spam). Mã có hiệu lực trong 5 phút.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nhập mã xác thực 9 số
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={9}
                  required
                  autoFocus
                  value={twoFactorOtp}
                  onChange={(e) => setTwoFactorOtp(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="000000000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xl font-mono font-black text-center tracking-[0.2em] text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                />
              </div>

              <div className="flex items-center space-x-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <input
                  type="checkbox"
                  id="trustDeviceCheck"
                  checked={trustThisDevice}
                  onChange={(e) => setTrustThisDevice(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="trustDeviceCheck" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                  Đặt thiết bị này làm <b>Thiết bị tin cậy</b> (không hỏi lại mã ở lần sau)
                </label>
              </div>

              <button
                type="submit"
                disabled={twoFactorLoading || twoFactorOtp.length !== 9}
                className="w-full flex items-center justify-center px-5 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 active:scale-98 transition-all disabled:opacity-50"
              >
                {twoFactorLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    <span>Xác Thực & Đăng Nhập</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTwoFactorChallenge(null);
                  setTwoFactorOtp('');
                  setTwoFactorError('');
                }}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center pt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Quay lại đăng nhập
              </button>
            </form>
          ) : !isForgotPassword ? (
            /* Standard Login Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {revokedNotice && (
                <div className="p-3.5 bg-red-50 text-red-800 text-xs rounded-2xl border border-red-200 flex items-start space-x-2 font-bold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{revokedNotice}</span>
                </div>
              )}

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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError('');
                    }}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none transition-all placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
          ) : (
            /* Forgot Password Form */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <KeyRound className="w-5 h-5 text-red-600" />
                <h3 className="font-extrabold text-base text-slate-900">Khôi Phục Mật Khẩu</h3>
              </div>

              {forgotError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-4 bg-green-50 text-green-800 text-xs rounded-xl border border-green-200 flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {forgotOtpSent && (
                <div className="p-3 bg-blue-50 text-blue-900 text-xs rounded-xl border border-blue-200 flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Mã xác thực gồm 6 số đã được gửi đến email <b>{forgotEmail}</b>. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư Spam) để lấy mã và nhập vào bên dưới.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Địa chỉ Email tài khoản
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="email.doanvien@gmail.com"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={sendingForgotOtp || forgotCountdown > 0}
                    className="px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex items-center whitespace-nowrap"
                  >
                    {sendingForgotOtp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Send className="w-3.5 h-3.5 mr-1" />
                    )}
                    {forgotCountdown > 0 ? `${forgotCountdown}s` : 'Gửi mã'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mã xác minh Email (6 số)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập mã 6 chữ số"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tracking-widest font-bold focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full mt-2 flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 active:scale-98 transition-all disabled:opacity-50"
              >
                {forgotLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Xác Nhận Đổi Mật Khẩu
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setForgotError('');
                }}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center pt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Quay lại đăng nhập
              </button>
            </form>
          )}

          {/* Switch to Register */}
          {!isForgotPassword && (
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
          )}
        </div>
      </div>
    </div>
  );
}
