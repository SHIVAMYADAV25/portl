import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiUnreachableError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { bills as mockBills } from "@/services/mockData";
import type { Bill } from "@/types";

const KEY = ["bills"];

export function useBills() {
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Bill[]> => {
      if (!isBackendLive) return mockBills;
      try {
        const res = await api.get<{ bills: Bill[] }>("/bills");
        return res.bills;
      } catch (err) {
        if (err instanceof ApiUnreachableError) return mockBills;
        throw err;
      }
    },
    staleTime: 15_000,
  });
}

/** Pays without a real Razorpay checkout — hits /bills/:id/pay/mock server-side, or just
 *  flips local state when the backend isn't reachable. Wire up real Razorpay checkout
 *  (react-native-razorpay) in the payments screen when you're ready to test with real test keys. */
export function useMockPayBill() {
  const qc = useQueryClient();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useMutation({
    mutationFn: async (billId: string) => {
      if (!isBackendLive) return { ok: true };
      return api.post(`/bills/${billId}/pay/mock`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
