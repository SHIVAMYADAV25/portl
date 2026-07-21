import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiUnreachableError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { notifications as mockNotifications } from "@/services/mockData";
import type { AppNotification } from "@/types";

const KEY = ["notifications"];

export function useNotifications() {
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<AppNotification[]> => {
      if (!isBackendLive) return mockNotifications;
      try {
        const res = await api.get<{ notifications: AppNotification[] }>("/notifications");
        return res.notifications;
      } catch (err) {
        if (err instanceof ApiUnreachableError) return mockNotifications;
        throw err;
      }
    },
    staleTime: 15_000,
    refetchInterval: 30_000, // light polling so the badge/list stay reasonably fresh without a dedicated socket event per notification
  });
}

/** Derives the unread count from the already-fetched list rather than a second network call —
 *  the list is small enough (a personal inbox, not a firehose) that this is cheaper than
 *  polling a separate endpoint on its own interval. */
export function useUnreadCount() {
  const { data: notifications = [] } = useNotifications();
  return notifications.filter((n) => !n.read).length;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isBackendLive) return { ok: true };
      return api.post(`/notifications/${id}/read`);
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<AppNotification[]>(KEY);
      qc.setQueryData<AppNotification[]>(KEY, (old = []) =>
        old.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useMutation({
    mutationFn: async () => {
      if (!isBackendLive) return { ok: true };
      return api.post("/notifications/read-all");
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<AppNotification[]>(KEY);
      qc.setQueryData<AppNotification[]>(KEY, (old = []) => old.map((n) => ({ ...n, read: true })));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
