import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { Role, User } from "@/types";
import { demoUsers } from "@/services/mockData";
import { api, ApiUnreachableError, setTokens, clearTokens } from "@/services/api";
import { connectSocket, disconnectSocket } from "@/services/socket";

interface AuthState {
  user: User | null;
  hasHydrated: boolean;
  /** True when the current session is backed by a real API call (not the offline mock fallback). */
  isBackendLive: boolean;
  hydrate: () => Promise<void>;
  /** Matches the mobile OTP screen: tries the real backend first, falls back to the mock demo
   *  account for the given role if the backend can't be reached (offline dev / grading without
   *  the backend running). */
  loginWithOtp: (phone: string, otp: string, role: Role) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const USER_STORAGE_KEY = "portl.session.user";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hasHydrated: false,
  isBackendLive: false,

  hydrate: async () => {
    try {
      const saved = await SecureStore.getItemAsync(USER_STORAGE_KEY);
      if (saved) {
        const { user, isBackendLive } = JSON.parse(saved) as { user: User; isBackendLive: boolean };
        set({ user, isBackendLive, hasHydrated: true });
        if (isBackendLive && user.flatLabel) connectSocket(user.flatLabel).catch(() => {});
        return;
      }
    } catch {
      // ignore — secure store may be unavailable (e.g. web) or data malformed
    }
    set({ hasHydrated: true });
  },

  loginWithOtp: async (phone, otp, role) => {
    try {
      const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
        "/auth/verify-otp",
        { phone, otp, role },
        { auth: false }
      );
      await setTokens(res.accessToken, res.refreshToken);
      await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify({ user: res.user, isBackendLive: true }));
      set({ user: res.user, isBackendLive: true });
      if (res.user.flatLabel) connectSocket(res.user.flatLabel).catch(() => {});
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiUnreachableError) {
        // No backend reachable — fall back to the local mock account so the app is still
        // fully demoable. Real OTP check (1234) still applies for a consistent UX.
        if (otp !== "1234") return { ok: false, error: "Incorrect OTP" };
        const user = demoUsers[role];
        await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify({ user, isBackendLive: false }));
        set({ user, isBackendLive: false });
        return { ok: true };
      }
      const message = (err as Error).message || "Something went wrong";
      return { ok: false, error: message.includes("Incorrect OTP") ? "Incorrect OTP" : message };
    }
  },

  logout: async () => {
    set({ user: null, isBackendLive: false });
    await clearTokens();
    try {
      await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
    } catch {
      // ignore
    }
    disconnectSocket();
  },
}));
