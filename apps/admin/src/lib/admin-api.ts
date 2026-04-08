const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api';
const ADMIN_SECRET_KEY = 'yinjie_admin_secret';

export function getAdminSecret(): string {
  return localStorage.getItem(ADMIN_SECRET_KEY) ?? '';
}

export function setAdminSecret(secret: string) {
  localStorage.setItem(ADMIN_SECRET_KEY, secret);
}

export function clearAdminSecret() {
  localStorage.removeItem(ADMIN_SECRET_KEY);
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/admin${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Secret': getAdminSecret(),
      ...options?.headers,
    },
    ...options,
  });
  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    throw new Error(`Admin API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export type AdminStats = {
  userCount: number;
  characterCount: number;
  totalMessages: number;
  aiMessages: number;
};

export type AdminUser = {
  id: string;
  username: string;
  onboardingCompleted: boolean;
  createdAt: string;
  avatar?: string;
};

export type AdminUsersResult = {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
};

export type AdminSystemInfo = {
  version: string;
  nodeVersion: string;
  uptimeSeconds: number;
  dbSizeBytes: number;
  dbPath: string;
};

export const adminApi = {
  getStats: () => adminFetch<AdminStats>('/stats'),
  getUsers: (page = 1) => adminFetch<AdminUsersResult>(`/users?page=${page}`),
  deleteUser: (id: string) => adminFetch<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),
  getSystem: () => adminFetch<AdminSystemInfo>('/system'),
  getConfig: () => adminFetch<Record<string, string>>('/config'),
  setConfig: (key: string, value: string) =>
    adminFetch<{ success: boolean }>('/config', { method: 'PATCH', body: JSON.stringify({ key, value }) }),
};
