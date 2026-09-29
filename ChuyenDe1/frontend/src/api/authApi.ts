import axiosClient from './axiosClient';
import type { ApiResponse, LoginRequest, LoginResponse } from '../types/auth';

export const authApi = {
  login: (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return axiosClient.post('/auth/login', data);
  },
  getMe: (username = 'admin'): Promise<ApiResponse<LoginResponse>> => {
    return axiosClient.get(`/auth/me?username=${username}`);
  },
};
