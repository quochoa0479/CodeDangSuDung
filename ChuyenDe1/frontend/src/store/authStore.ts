import { create } from 'zustand';
import { authApi } from '../api/authApi';
import type { LoginRequest, LoginResponse } from '../types/auth';

interface AuthState {
  user: LoginResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('auth_token'),
  isAuthenticated: !!localStorage.getItem('auth_token'),
  isLoading: false,

  initialize: () => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (token && storedUser) {
      try {
        set({
          token,
          user: JSON.parse(storedUser),
          isAuthenticated: true,
        });
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
  },

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true });
    try {
      const res = await authApi.login(credentials);
      if (res.success && res.data) {
        localStorage.setItem('auth_token', res.data.token);
        localStorage.setItem('auth_user', JSON.stringify(res.data));
        set({
          user: res.data,
          token: res.data.token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error(res.message || 'Đăng nhập thất bại');
      }
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },
}));
