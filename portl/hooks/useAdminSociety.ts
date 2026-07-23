import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface Society {
  id: string;
  name: string;
  address?: string;
  logoUrl?: string;
}

const KEY = ["admin", "society"];

export function useAdminSociety() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Society> => (await api.get<{ society: Society }>("/admin/society")).society,
    staleTime: 60_000,
  });
}

export function useUpdateSociety() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; address?: string; logoUrl?: string }) =>
      api.put<{ society: Society }>("/admin/society", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}