import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

export type NotificationType =
  | "task_assigned"
  | "qa_rejected"
  | "qa_passed"
  | "fine_issued"
  | "pcloud_missing"
  | "deadline_warning"
  | "episode_verified"
  | "payroll_ready"
  | "new_employee"
  | "role_assigned";

export type NotificationCategory = "tasks" | "qa" | "fines" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export const NOTIFICATION_CATEGORY_MAP: Record<NotificationType, NotificationCategory> = {
  task_assigned: "tasks",
  qa_rejected: "qa",
  qa_passed: "qa",
  fine_issued: "fines",
  pcloud_missing: "system",
  deadline_warning: "tasks",
  episode_verified: "system",
  payroll_ready: "system",
  new_employee: "system",
  role_assigned: "system",
};

interface PaginatedResponse {
  data: Notification[];
  total: number;
  page: number;
  hasMore: boolean;
}

const POLL_INTERVAL = 60_000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchNotifications = useCallback(async (p = 1, append = false) => {
    try {
      const res = await api.get<PaginatedResponse>(`/api/notifications?page=${p}&limit=20`);
      setNotifications(prev => append ? [...prev, ...res.data] : res.data);
      setHasMore(res.hasMore);
      setUnreadCount(res.data.filter(n => !n.read).length + (append ? unreadCount : 0));
    } catch {
      // silent — don't toast on poll failures
    } finally {
      setLoading(false);
    }
  }, []);

  /* Poll for unread count only */
  const pollCount = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>("/api/notifications?countOnly=true");
      setUnreadCount(res.count);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1);
    intervalRef.current = setInterval(pollCount, POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchNotifications, pollCount]);

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchNotifications(next, true);
  }, [page, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.post(`/api/notifications/read/${id}`);
    } catch { /* silent */ }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.post("/api/notifications/read-all");
    } catch { /* silent */ }
  }, []);

  const refresh = useCallback(() => {
    setPage(1);
    fetchNotifications(1);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    markAsRead,
    markAllRead,
    loadMore,
    refresh,
  };
}
