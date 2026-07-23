import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface Tower { id: string; societyId: string; name: string; }
export interface Flat { id: string; towerId: string; number: string; label: string; ownerName?: string; }

const TOWERS_KEY = ["towers"];
const flatsKey = (towerId?: string) => ["flats", towerId ?? "all"];

export function useTowers() {
  return useQuery({
    queryKey: TOWERS_KEY,
    queryFn: async (): Promise<Tower[]> => (await api.get<{ towers: Tower[] }>("/towers")).towers,
    staleTime: 60_000,
  });
}

export function useFlats(towerId?: string) {
  return useQuery({
    queryKey: flatsKey(towerId),
    queryFn: async (): Promise<Flat[]> => (await api.get<{ flats: Flat[] }>(`/flats${towerId ? `?towerId=${towerId}` : ""}`)).flats,
    enabled: !!towerId,
    staleTime: 30_000,
  });
}

/** All flats across every tower — used by the admin's Society Setup screen, which shows the
 *  whole structure at once rather than one tower's flats at a time like the invite-resident flow. */
export function useAllFlats(towerIds: string[]) {
  return useQuery({
    queryKey: ["flats", "byTowers", towerIds.slice().sort()],
    queryFn: async (): Promise<Flat[]> => {
      const results = await Promise.all(towerIds.map((id) => api.get<{ flats: Flat[] }>(`/flats?towerId=${id}`)));
      return results.flatMap((r) => r.flats);
    },
    enabled: towerIds.length > 0,
    staleTime: 30_000,
  });
}

export function useCreateTower() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) => api.post<{ id: string }>("/towers", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: TOWERS_KEY }),
  });
}

export function useUpdateTower() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) => api.put<{ ok: boolean }>(`/towers/${input.id}`, { name: input.name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TOWERS_KEY }),
  });
}

export function useDeleteTower() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/towers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: TOWERS_KEY }),
  });
}

export function useCreateFlat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { towerId: string; number: string; label: string; ownerName?: string }) =>
      api.post<{ id: string }>("/flats", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flats"] }),
  });
}

export function useUpdateFlat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; number?: string; label?: string; ownerName?: string }) =>
      api.put<{ ok: boolean }>(`/flats/${input.id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flats"] }),
  });
}

export function useDeleteFlat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/flats/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flats"] }),
  });
}