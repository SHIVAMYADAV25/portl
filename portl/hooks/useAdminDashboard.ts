import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface AdminDashboardKpis {
  totalResidents: number;
  totalGuards: number;
  visitorsToday: number;
  visitorsInside: number;
  pendingComplaints: number;
  todaysBookings: number;
}

export interface ActivityEvent {
  id: string;
  type: "visitor" | "complaint" | "invite" | "notice";
  text: string;
  at: string;
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => (await api.get<{ kpis: AdminDashboardKpis; recentActivity: ActivityEvent[] }>("/admin/dashboard")),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}