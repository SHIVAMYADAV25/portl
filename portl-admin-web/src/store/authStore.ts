import { create } from "zustand";
import { api, setToken, clearToken, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

const USER_KEY = "portl.admin.user";

interface AuthState {
  user: User | null;
  hasHydrated: boolean;
  hydrate: () => void;
  login: (phone: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hasHydrated: false,

  hydrate: () => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      if (saved) set({ user: JSON.parse(saved), hasHydrated: true });
      else set({ hasHydrated: true });
    } catch {
      set({ hasHydrated: true });
    }
  },

  login: async (phone, password) => {
    try {
      const res = await api.post<{ user: User; accessToken: string }>("/auth/login", { phone, password }, { auth: false });
      if (res.user.role !== "admin") {
        return { ok: false, error: "This account isn't a Society Admin account." };
      }
      setToken(res.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      set({ user: res.user });
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiError) return { ok: false, error: "Invalid phone or password." };
      return { ok: false, error: "Could not reach the Portl backend. Is it running?" };
    }
  },

  logout: () => {
    clearToken();
    localStorage.removeItem(USER_KEY);
    set({ user: null });
  },
}));
