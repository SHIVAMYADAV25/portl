import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiUnreachableError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { complaints as mockComplaints } from "@/services/mockData";
import type { Complaint } from "@/types";

const KEY = ["complaints"];

export function useComplaints() {
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Complaint[]> => {
      if (!isBackendLive) return mockComplaints;
      try {
        const res = await api.get<{ complaints: Array<Complaint & { raisedByUserId?: string }> }>("/complaints");
        return res.complaints.map((c) => ({ ...c, raisedBy: c.raisedBy ?? "You" }));
      } catch (err) {
        if (err instanceof ApiUnreachableError) return mockComplaints;
        throw err;
      }
    },
    staleTime: 15_000,
  });
}

export function useCreateComplaint() {
  const qc = useQueryClient();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useMutation({
    mutationFn: async (input: { title: string; category: Complaint["category"]; description?: string }) => {
      if (!isBackendLive) {
        return {
          id: `local-${Date.now()}`,
          ...input,
          status: "open" as const,
          raisedBy: "You",
          flatLabel: "A-1005",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      const res = await api.post<{ complaint: Complaint }>("/complaints", input);
      return res.complaint;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface ComplaintComment {
  id: string;
  complaintId: string;
  authorUserId: string;
  authorName: string;
  authorRole: "resident" | "guard" | "admin";
  body: string;
  createdAt: string;
}

export function useComplaintComments(complaintId: string | null) {
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useQuery({
    queryKey: ["complaints", complaintId, "comments"],
    queryFn: async (): Promise<ComplaintComment[]> => {
      if (!isBackendLive || !complaintId) return [];
      try {
        return (await api.get<{ comments: ComplaintComment[] }>(`/complaints/${complaintId}/comments`)).comments;
      } catch (err) {
        if (err instanceof ApiUnreachableError) return [];
        throw err;
      }
    },
    enabled: !!complaintId,
    staleTime: 10_000,
  });
}

export function useAddComplaintComment() {
  const qc = useQueryClient();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useMutation({
    mutationFn: async ({ complaintId, body }: { complaintId: string; body: string }) => {
      if (!isBackendLive) return { ok: true };
      return api.post<{ comment: ComplaintComment }>(`/complaints/${complaintId}/comments`, { body });
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["complaints", vars.complaintId, "comments"] }),
  });
}

export function useUpdateComplaintStatus() {
  const qc = useQueryClient();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Complaint["status"] }) => {
      if (!isBackendLive) return { ok: true };
      return api.put(`/complaints/${id}`, { status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}