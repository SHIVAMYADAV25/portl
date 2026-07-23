import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { User } from "@/types";

const KEY = ["admin", "people"];

export function useAdminPeople() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<User[]> => (await api.get<{ people: User[] }>("/admin/people")).people,
    staleTime: 15_000,
  });
}

export function useInviteResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; phone: string; flatId: string; ownerOrTenant: "owner" | "tenant" }) =>
      api.post<{ user: User; activationLink?: string }>("/admin/residents", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useInviteGuard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; phone: string; gate: string; shift: "morning" | "evening" | "night" }) =>
      api.post<{ user: User; activationLink?: string }>("/admin/guards", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useInviteAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; phone: string }) =>
      api.post<{ user: User; activationLink?: string }>("/admin/admins", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useResendInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post<{ ok: boolean; activationLink?: string }>(`/admin/people/${userId}/resend-invite`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useEditResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; name?: string; phone?: string; flatId?: string; ownerOrTenant?: "owner" | "tenant" }) => {
      const { userId, ...body } = input;
      return api.put<{ user: User }>(`/admin/residents/${userId}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useEditGuard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; name?: string; phone?: string; gate?: string; shift?: "morning" | "evening" | "night" }) => {
      const { userId, ...body } = input;
      return api.put<{ user: User }>(`/admin/guards/${userId}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetPersonStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; status: "active" | "disabled" }) =>
      api.put<{ ok: boolean }>(`/admin/people/${input.userId}/status`, { status: input.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}