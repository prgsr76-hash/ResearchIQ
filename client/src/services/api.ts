import axios from 'axios';
import type {
  AuthResponse,
  User,
  Paper,
  PaperSummary,
  ChatSession,
  ComparisonResult,
  LitReview,
  GapAnalysis,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('riq_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('riq_token');
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register' && path !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== Auth ====================
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  getMe: () => api.get<{ user: User }>('/auth/me'),
};

// ==================== Papers ====================
export const paperApi = {
  upload: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/papers/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
  },

  list: () => api.get('/papers'),

  getById: (id: string) => api.get(`/papers/${id}`),

  delete: (id: string) => api.delete(`/papers/${id}`),

  getSummary: (id: string) => api.get(`/papers/${id}/summary`),
};

// Alias for backward compat
export const papersApi = paperApi;

// ==================== Chat ====================
export const chatApi = {
  query: (query: string, sessionId?: string, paperId?: string) =>
    api.post('/chat/query', {
      query,
      sessionId,
      paperIds: paperId ? [paperId] : undefined,
    }),

  listSessions: () => api.get('/chat/sessions'),

  getSession: (id: string) => api.get(`/chat/sessions/${id}`),

  deleteSession: (id: string) => api.delete(`/chat/sessions/${id}`),
};

// ==================== Compare ====================
export const compareApi = {
  compare: (paperIds: string[]) =>
    api.post('/compare', { paperIds }),
};

// ==================== Review ====================
export const reviewApi = {
  generate: (topic: string, paperIds?: string[]) =>
    api.post('/review/generate', { topic, paperIds }),

  getById: (id: string) => api.get(`/review/${id}`),
};

// ==================== Gaps ====================
export const gapApi = {
  analyze: (paperIds?: string[]) =>
    api.post('/gaps/analyze', { paperIds }),
};

// Alias
export const gapsApi = gapApi;

export default api;
