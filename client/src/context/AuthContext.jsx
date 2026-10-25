import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data.require2fa) {
      return res.data;
    }
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data;
    }
    throw new Error(res.data.message || 'Đăng nhập thất bại');
  };

  const verify2FA = async (challengeToken, otpCode, trustThisDevice = false) => {
    const res = await api.post('/auth/2fa/verify', {
      challenge_token: challengeToken,
      otp_code: otpCode,
      trustThisDevice
    });
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data;
    }
    throw new Error(res.data.message || 'Xác thực 2FA thất bại');
  };

  const register = async (registerData) => {
    const res = await api.post('/auth/register', registerData);
    return res.data;
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMyAccount = async () => {
    const res = await api.delete('/auth/delete-my-account');
    if (res.data.success) {
      logout();
      return res.data;
    }
    throw new Error(res.data.message);
  };

  const isAdminTong = user?.role === 'ADMIN_TONG';
  const isAdminCap2 = user?.role === 'ADMIN_CAP_2';
  const isReviewer = user?.role === 'KIEM_DUYET' || user?.role === 'MODERATOR';
  const canReview = isAdminTong || isReviewer;
  const canTrackProgress = isAdminTong || isAdminCap2 || isReviewer;
  const isAnyAdmin = isAdminTong || isAdminCap2 || isReviewer;

  const value = {
    user,
    token,
    loading,
    login,
    verify2FA,
    updateUser,
    register,
    logout,
    refreshUser,
    deleteMyAccount,
    isAdminTong,
    isAdminCap2,
    isReviewer,
    canReview,
    canTrackProgress,
    isAnyAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
