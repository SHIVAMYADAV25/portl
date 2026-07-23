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

export function useCreateAmenity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; icon?: string; location?: string; openTime?: string; closeTime?: string; slotMinutes?: number }) =>
      api.post<{ id: string }>("/amenities", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["amenities"] }),
  });
}

export function useUpdateAmenity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name?: string; icon?: string; location?: string; openTime?: string; closeTime?: string; slotMinutes?: number }) => {
      const { id, ...body } = input;
      return api.put<{ amenity: Amenity }>(`/amenities/${id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["amenities"] }),
  });
}

export function useDeleteAmenity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/amenities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["amenities"] }),
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