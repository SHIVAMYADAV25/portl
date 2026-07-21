import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface Tower { id: string; societyId: string; name: string; }
export interface Flat { id: string; towerId: string; number: string; label: string; ownerName?: string; }

export function useTowers() {
  return useQuery({
    queryKey: ["towers"],
    queryFn: async (): Promise<Tower[]> => (await api.get<{ towers: Tower[] }>("/towers")).towers,
    staleTime: 60_000,
  });
}

export function useFlats(towerId?: string) {
  return useQuery({
    queryKey: ["flats", towerId],
    queryFn: async (): Promise<Flat[]> => (await api.get<{ flats: Flat[] }>(`/flats${towerId ? `?towerId=${towerId}` : ""}`)).flats,
    enabled: !!towerId,
    staleTime: 30_000,
  });
}