import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiUnreachableError } from "@/services/api";
import { enqueue } from "@/services/offlineQueue";
import { useAuthStore } from "@/store/authStore";
import { visitors as mockVisitors } from "@/services/mockData";
import type { Visitor, VisitorCategory } from "@/types";

const KEY = ["visitors"];

export function useVisitors(filters?: { status?: string }) {
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async (): Promise<Visitor[]> => {
      if (!isBackendLive) return applyFilter(mockVisitors, filters);
      try {
        const qs = filters?.status ? `?status=${filters.status}` : "";
        const res = await api.get<{ visitors: Array<Visitor & { approvedByUserId?: string }> }>(`/visitors${qs}`);
        return res.visitors.map((v) => ({ ...v, approvedBy: v.approvedBy ?? (v.approvedByUserId ? "You" : undefined) }));
      } catch (err) {
        if (err instanceof ApiUnreachableError) return applyFilter(mockVisitors, filters);
        throw err;
      }
    },
    staleTime: 15_000,
  });
}

function applyFilter(list: Visitor[], filters?: { status?: string }) {
  if (!filters?.status) return list;
  return list.filter((v) => v.status === filters.status);
}

/** Guard registers a visitor. If the backend is unreachable mid-session (not just "mock mode"),
 *  the request is queued to the offline outbox and synced automatically once back online — this
 *  is the "Guard app works offline" requirement from the PRD. */
export function useRegisterVisitor() {
  const qc = useQueryClient();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useMutation({
    mutationFn: async (input: { name: string; category: VisitorCategory; company?: string; purpose?: string; flatLabel: string }) => {
      if (!isBackendLive) return { ...input, id: `local-${Date.now()}`, status: "pending" as const, requestedAt: new Date().toISOString() };
      try {
        const res = await api.post<{ visitor: Visitor }>("/visitors", input);
        return res.visitor;
      } catch (err) {
        if (err instanceof ApiUnreachableError) {
          await enqueue({ endpoint: "/visitors", method: "POST", body: input, label: `Register ${input.name}${input.company ? ` — ${input.company}` : ""}` });
          return { ...input, id: `queued-${Date.now()}`, status: "pending" as const, requestedAt: new Date().toISOString() };
        }
        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useVisitorAction() {
  const qc = useQueryClient();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" | "entry" | "exit" }) => {
      if (!isBackendLive) return { ok: true };
      try {
        return await api.post(`/visitors/${id}/${action}`);
      } catch (err) {
        if (err instanceof ApiUnreachableError) {
          await enqueue({ endpoint: `/visitors/${id}/${action}`, method: "POST", label: `Mark ${action} — visitor ${id.slice(0, 6)}` });
          return { ok: true, queued: true };
        }
        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useGenerateGuestPass() {
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useMutation({
    mutationFn: async (input: { guestName: string; note?: string; validHours: number; flatLabel: string }) => {
      if (!isBackendLive) {
        const code = "PORTL-" + Math.random().toString(36).slice(2, 8).toUpperCase();
        return { id: `local-${Date.now()}`, code, ...input };
      }
      const res = await api.post<{ pass: { id: string; code: string; guestName: string; validFrom: string; validTo: string } }>(
        "/visitors/guest-pass",
        input
      );
      return res.pass;
    },
  });
}
