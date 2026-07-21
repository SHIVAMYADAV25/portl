import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiUnreachableError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { polls as mockPolls } from "@/services/mockData";
import type { Poll } from "@/types";

const KEY = ["polls"];

export function usePolls() {
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Poll[]> => {
      if (!isBackendLive) return mockPolls;
      try {
        const res = await api.get<{ polls: Poll[] }>("/polls");
        return res.polls;
      } catch (err) {
        if (err instanceof ApiUnreachableError) return mockPolls;
        throw err;
      }
    },
    staleTime: 15_000,
  });
}

export function useVotePoll() {
  const qc = useQueryClient();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      if (!isBackendLive) return { ok: true };
      return api.post(`/polls/${pollId}/vote`, { optionId });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
