import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'driveelite_token';
const USER_KEY = 'driveelite_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setInitialized(true);
        return;
      }
      try {
        const { data } = await authAPI.getProfile();
        if (data.success) {
          setUser(data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setToken(null);
      } finally {
        setInitialized(true);
      }
    };
    verify();
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email, password });
      if (data.success) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return {
          success: true,
          user: data.user,
          requireVerification: data.requireVerification,
          email_otp_hint: data.email_otp_hint,
          phone_otp_hint: data.phone_otp_hint,
        };
      }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password, phone) => {
    setLoading(true);
    try {
      const { data } = await authAPI.register({ name, email, password, phone });
      if (data.success) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return {
          success: true,
          user: data.user,
          requireVerification: data.requireVerification,
          email_otp_hint: data.email_otp_hint,
          phone_otp_hint: data.phone_otp_hint,
        };
      }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (otp) => {
    setLoading(true);
    try {
      const { data } = await authAPI.verifyEmail({ otp });
      if (data.success) {
        const updatedUser = { ...user, email_verified: true, phone_verified: data.phone_verified };
        setUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        return { success: true, message: data.message };
      }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Verification failed.' };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const verifyPhone = useCallback(async (otp) => {
    setLoading(true);
    try {
      const { data } = await authAPI.verifyPhone({ otp });
      if (data.success) {
        const updatedUser = { ...user, email_verified: data.email_verified, phone_verified: true };
        setUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        return { success: true, message: data.message };
      }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Verification failed.' };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const resendOTP = useCallback(async (type) => {
    try {
      const { data } = await authAPI.resendOTP({ type });
      return {
        success: true,
        message: data.message,
        email_otp_hint: data.email_otp_hint,
        phone_otp_hint: data.phone_otp_hint
      };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Resend failed.' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    initialized,
    isAuthenticated: !!token && !!user,
    isVerified: !!user?.email_verified && !!user?.phone_verified,
    isEmailVerified: !!user?.email_verified,
    isPhoneVerified: !!user?.phone_verified,
    isAdmin: user?.role === 'admin',
    login,
    register,
    verifyEmail,
    verifyPhone,
    resendOTP,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth error');
  return context;
}
