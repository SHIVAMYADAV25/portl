import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiUnreachableError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { notices as mockNotices } from "@/services/mockData";
import type { Notice } from "@/types";

const KEY = ["notices"];

export function useNotices() {
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Notice[]> => {
      if (!isBackendLive) return mockNotices;
      try {
        const res = await api.get<{ notices: Array<Notice & { createdByUserId?: string }> }>("/notices");
        return res.notices.map((n) => ({ ...n, createdBy: n.createdBy ?? "Society Admin" }));
      } catch (err) {
        if (err instanceof ApiUnreachableError) return mockNotices;
        throw err;
      }
    },
    staleTime: 30_000,
  });
}

export function useUpdateNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; title?: string; body?: string; category?: Notice["category"] }) => {
      const { id, ...body } = input;
      return api.put<{ notice: Notice }>(`/notices/${id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/notices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateNotice() {
  const qc = useQueryClient();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useMutation({
    mutationFn: async (input: { title: string; body: string; category: Notice["category"] }) => {
      if (!isBackendLive) {
        return { id: `local-${Date.now()}`, ...input, createdBy: "You", createdAt: new Date().toISOString() };
      }
      const res = await api.post<{ notice: Notice }>("/notices", input);
      return res.notice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}