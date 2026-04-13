import { getToken, setToken, getRefreshToken, clearSession } from "./auth";

// ─── Base URL ────────────────────────────────────────────────
export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "https://api.dailyvertex.io";
export const API_BASE = `${API_ORIGIN}/api`;

// ─── Structured API Error ────────────────────────────────────
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// ─── Token refresh mutex (prevent parallel refreshes) ────────
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_ORIGIN}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const token = data.accessToken || data.token;
    if (token) {
      setToken(token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function refreshTokenOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = attemptRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ─── Core fetch wrapper ──────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // 401 → try refresh once
  if (res.status === 401 && !_isRetry) {
    const refreshed = await refreshTokenOnce();
    if (refreshed) {
      return request<T>(path, options, true);
    }
    clearSession();
    window.location.href = "/login?session=expired";
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message || `Request failed (${res.status})`, data.code);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Public helpers ──────────────────────────────────────────
function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
  });
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    request<T>(`${path}${buildQuery(params)}`),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),

  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};


// ─── Endpoint constants ──────────────────────────────────────
export const ENDPOINTS = {
  // Auth (use API_ORIGIN, not API_BASE)
  AUTH_LOGIN: "/auth/login",
  AUTH_REFRESH: "/auth/refresh",
  AUTH_SLACK_CALLBACK: "/auth/slack/callback",
  AUTH_LOGOUT: "/auth/logout",
  AUTH_ME: "/auth/me",
  AUTH_SET_PASSWORD: "/auth/set-password",

  // Shows
  SHOWS: "/shows",
  SHOW: (id: string) => `/shows/${id}`,
  SHOW_STATS: (id: string) => `/shows/${id}/stats`,
  SHOW_ASSIGN: (id: string) => `/shows/${id}/assign`,
  SHOW_UNASSIGN: (id: string, empId: string) => `/shows/${id}/assign/${empId}`,

  // Episodes
  EPISODES: "/episodes",
  EPISODES_TODAY: "/episodes/today",
  EPISODE: (id: string) => `/episodes/${id}`,
  EPISODE_NOTES: (id: string) => `/episodes/${id}/notes`,
  EPISODE_QA: (id: string) => `/episodes/${id}/qa`,
  EPISODE_PCLOUD: (id: string) => `/episodes/${id}/pcloud-check`,
  EPISODE_VERIFY: (id: string) => `/episodes/${id}/verify`,

  // Tasks
  TASKS: "/tasks",
  TASKS_MY: "/tasks/my",
  TASK: (id: string) => `/tasks/${id}`,
  TASK_COMPLETE: (id: string) => `/tasks/${id}/complete`,
  TASK_STAGE: (id: string) => `/tasks/${id}/stage`,
  TASK_ESCALATE: (id: string) => `/tasks/${id}/escalate`,

  // Employees
  EMPLOYEES: "/employees",
  EMPLOYEE: (id: string) => `/employees/${id}`,
  EMPLOYEE_PERFORMANCE: (id: string) => `/employees/${id}/performance`,
  EMPLOYEE_INVITE: "/employees/invite",

  // Attendance
  ATTENDANCE: "/attendance",
  ATTENDANCE_SUMMARY: "/attendance/summary",
  ATTENDANCE_CLOCK_IN: "/attendance/clock-in",
  ATTENDANCE_CLOCK_OUT: "/attendance/clock-out",
  ATTENDANCE_EXPORT: "/attendance/export",

  // Payroll
  PAYROLL: "/payroll",
  PAYROLL_RUN: "/payroll/run",
  PAYROLL_MARK_PAID: (id: string) => `/payroll/${id}/mark-paid`,

  // Fines
  FINES: "/fines",

  // Leaves
  LEAVES: "/leaves",

  // Analytics
  ANALYTICS_SUMMARY: "/analytics/summary",
  ANALYTICS_WEEKLY: "/analytics/weekly",
  ANALYTICS_SHOWS: "/analytics/shows",
  ANALYTICS_TEAM: "/analytics/team",
  ANALYTICS_SNAPCHAT: "/analytics/snapchat",
  ANALYTICS_EXPORT: "/analytics/export",

  // Admin
  ADMIN_SETTINGS: "/admin/settings",
  ADMIN_FINE_REASONS: "/admin/fine-reasons",
  ADMIN_AUDIT_LOG: "/admin/audit-log",

  // Notifications
  NOTIFICATIONS: "/notifications",
  NOTIFICATION_READ: (id: string) => `/notifications/read/${id}`,
  NOTIFICATIONS_READ_ALL: "/notifications/read-all",

  // Search
  SEARCH: "/search",

  // pCloud
  PCLOUD_TEST: "/pcloud/test",
} as const;

// ─── React Query stale-time presets ──────────────────────────
export const STALE_TIMES = {
  ANALYTICS: 2 * 60 * 1000,   // 2 minutes
  TASKS: 30 * 1000,           // 30 seconds
  EPISODES: 30 * 1000,        // 30 seconds
  NOTIFICATIONS: 0,           // always refetch
  DEFAULT: 60 * 1000,         // 1 minute
} as const;
