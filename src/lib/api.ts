const API_BASE = 'http://localhost:3001/api';

function getToken(): string | null {
  return localStorage.getItem('rycode_token');
}

export function setToken(token: string): void {
  localStorage.setItem('rycode_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('rycode_token');
  localStorage.removeItem('rycode_user');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ── Auth ────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string, username: string) =>
    request<{ token: string; user: AppUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: AppUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: AppUser }>('/auth/me'),
};

// ── Settings ────────────────────────────────────────────────
export const settingsApi = {
  getApiKeys: () =>
    request<{ apiKeys: ApiKeyInfo[] }>('/settings/apikeys'),

  saveApiKey: (provider: string, apiKey: string, defaultModel?: string, baseUrl?: string, customName?: string) =>
    request<{ success: boolean }>('/settings/apikeys', {
      method: 'PUT',
      body: JSON.stringify({ provider, apiKey, defaultModel, baseUrl, customName }),
    }),

  deleteApiKey: (provider: string) =>
    request<{ success: boolean }>(`/settings/apikeys/${provider}`, { method: 'DELETE' }),

  getProfile: () =>
    request<{ settings: UserSettingsData }>('/settings/profile'),

  saveProfile: (theme: string, language: string) =>
    request<{ settings: UserSettingsData }>('/settings/profile', {
      method: 'PUT',
      body: JSON.stringify({ theme, language }),
    }),
};

// ── Courses ────────────────────────────────────────────────
export const coursesApi = {
  list: () => request<{ textbooks: any[] }>('/courses'),
  get: (id: string) => request<{ textbook: any }>(`/courses/${id}`),
  delete: (id: string) => request<{ success: boolean }>(`/courses/${id}`, { method: 'DELETE' }),
};

// ── Progress ────────────────────────────────────────────────
export const progressApi = {
  get: () => request<ProgressResponse>('/progress'),
  post: (data: ProgressUpdate) =>
    request<{ progress: any }>('/progress', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── Types ──────────────────────────────────────────────────
export interface AppUser {
  id: string;
  email: string;
  username: string;
  createdAt?: string;
}

export interface ApiKeyInfo {
  provider: string;
  defaultModel: string | null;
  baseUrl: string | null;
  customName: string | null;
  isActive: boolean;
  hasKey: boolean;
  updatedAt: string;
}

export interface UserSettingsData {
  theme: string;
  language: string;
}

export interface ProgressResponse {
  progress: any[];
  stats: {
    completedLessons: number;
    totalAttempts: number;
    averageScore: number;
    chartData: { date: string; score: number }[];
  };
  weakPoints: { topic: string; count: number }[];
}

export interface ProgressUpdate {
  lessonId: string;
  textbookId: string;
  score?: number;
  completed?: boolean;
  weakPoints?: string[];
}
