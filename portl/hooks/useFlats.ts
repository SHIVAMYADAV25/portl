import { useQuery } from "@tanstack/react-query";
import { api, ApiUnreachableError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { flats as mockFlats } from "@/services/mockData";
import type { Flat } from "@/types";

/** All flats in the society. Small dataset (a few hundred flats at most for a real society), so
 *  fetched once and filtered client-side for the register-visitor autocomplete rather than
 *  hitting the backend's `?q=` search on every keystroke. */
export function useFlats() {
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useQuery({
    queryKey: ["flats"],
    queryFn: async (): Promise<Flat[]> => {
      if (!isBackendLive) return mockFlats;
      try {
        const res = await api.get<{ flats: Flat[] }>("/flats");
        return res.flats;
      } catch (err) {
        if (err instanceof ApiUnreachableError) return mockFlats;
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // flat list rarely changes mid-shift
  });
}
