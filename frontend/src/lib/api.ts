const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('histeeria_token');
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export const auth = {
  sendOTP: (data: any) => apiFetch('/auth/send-otp', { method: 'POST', body: JSON.stringify(data) }),
  verifyOTP: (data: any) => apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }),
  google: (data: any) => apiFetch('/auth/google', { method: 'POST', body: JSON.stringify(data) }),
  signout: () => { localStorage.removeItem('histeeria_token'); window.location.href = '/auth/login'; },
};

export const memories = {
  create: (data: any) => apiFetch('/memories', { method: 'POST', body: JSON.stringify(data) }),
  list: () => apiFetch('/memories'),
  get: (id: string) => apiFetch(`/memories/${id}`),
  update: (id: string, data: any) => apiFetch(`/memories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/memories/${id}`, { method: 'DELETE' }),
  search: (q: string) => apiFetch(`/memories/search?q=${encodeURIComponent(q)}`),
};

export const ask = {
  question: (data: any) => apiFetch('/ask', { method: 'POST', body: JSON.stringify(data) }),
};

export const reminders = {
  create: (data: any) => apiFetch('/reminders', { method: 'POST', body: JSON.stringify(data) }),
  list: () => apiFetch('/reminders'),
  upcoming: () => apiFetch('/reminders/upcoming'),
  overdue: () => apiFetch('/reminders/overdue'),
  completed: () => apiFetch('/reminders/completed'),
  complete: (id: string) => apiFetch(`/reminders/${id}/complete`, { method: 'PUT' }),
  delete: (id: string) => apiFetch(`/reminders/${id}`, { method: 'DELETE' }),
};

export const profile = {
  get: () => apiFetch('/profile'),
  update: (data: any) => apiFetch('/profile', { method: 'PUT', body: JSON.stringify(data) }),
};
