import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, ApiUnreachableError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { amenities as mockAmenities, bookings as mockBookings } from "@/services/mockData";
import type { Amenity, Booking } from "@/types";

export function useAmenities() {
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useQuery({
    queryKey: ["amenities"],
    queryFn: async (): Promise<Amenity[]> => {
      if (!isBackendLive) return mockAmenities;
      try {
        const res = await api.get<{ amenities: Amenity[] }>("/amenities");
        return res.amenities;
      } catch (err) {
        if (err instanceof ApiUnreachableError) return mockAmenities;
        throw err;
      }
    },
    staleTime: 60_000,
  });
}

export function useBookings(amenityId?: string) {
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useQuery({
    queryKey: ["bookings", amenityId],
    queryFn: async (): Promise<Booking[]> => {
      if (!isBackendLive) return amenityId ? mockBookings.filter((b) => b.amenityId === amenityId) : mockBookings;
      try {
        const qs = amenityId ? `?amenityId=${amenityId}` : "";
        const res = await api.get<{ bookings: Booking[] }>(`/bookings${qs}`);
        return res.bookings;
      } catch (err) {
        if (err instanceof ApiUnreachableError) return mockBookings;
        throw err;
      }
    },
    staleTime: 10_000,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  return useMutation({
    mutationFn: async (input: { amenityId: string; date: string; startTime: string; endTime: string }) => {
      if (!isBackendLive) return { ok: true };
      try {
        return await api.post("/bookings", input);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          throw new Error("This slot was just taken. Please pick another.");
        }
        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}
