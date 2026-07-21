import { useQuery } from "@tanstack/react-query";
import { api, ApiUnreachableError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { staffDirectory as mockStaff } from "@/services/mockData";
import type { StaffMember } from "@/types";

export function useStaffDirectory() {
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useQuery({
    queryKey: ["staff"],
    queryFn: async (): Promise<StaffMember[]> => {
      if (!isBackendLive) return mockStaff;
      try {
        const res = await api.get<{ staff: StaffMember[] }>("/staff");
        return res.staff;
      } catch (err) {
        if (err instanceof ApiUnreachableError) return mockStaff;
        throw err;
      }
    },
    staleTime: 60_000,
  });
}
