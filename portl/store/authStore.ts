import { create } from "zustand";
import * as Storage from "@/services/secureStorage";
import type { User } from "@/types";
import { api, ApiError, ApiUnreachableError, setTokens, clearTokens } from "@/services/api";
import { connectSocket, disconnectSocket } from "@/services/socket";

interface AuthState {
  user: User | null;
  hasHydrated: boolean;
  isBackendLive: boolean;
  hydrate: () => Promise<void>;
  /** Step 1: the very first person to use Portl — creates the society + becomes its admin. */
  bootstrapSociety: (input: {
    societyName: string;
    address?: string;
    adminName: string;
    adminEmail: string;
    adminPhone: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  /** Step 6/8/10: the one login screen every role shares — no role picker. */
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; code?: string }>;
  /** Preview an invitation before showing the "set a password" form. */
  fetchInvitation: (
    token: string
  ) => Promise<{ ok: true; name: string; email: string; role: string; societyName: string } | { ok: false; error: string }>;
  /** Set a password and activate — logs the person straight in. */
  activateInvitation: (token: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  /** Merges partial fields into the current user (e.g. after a profile edit) and re-persists the
   *  session, so the header/dashboard reflect the change immediately without a full re-login. */
  updateUser: (patch: Partial<User>) => void;
}

const USER_STORAGE_KEY = "portl.session.user";

async function persistSession(user: User) {
  try {
    await Storage.setItemAsync(USER_STORAGE_KEY, JSON.stringify({ user }));
  } catch {
    // ignore — secure store unavailable
  }
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiUnreachableError) return "Can't reach the Portl server. Check your connection.";
  if (err instanceof ApiError) {
    try {
      const parsed = JSON.parse(err.message);
      return typeof parsed === "string" ? parsed : parsed?.error ?? err.message;
    } catch {
      return err.message.replace(/^"|"$/g, "");
    }
  }
  return "Something went wrong";
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hasHydrated: false,
  isBackendLive: false,

  hydrate: async () => {
    try {
      const saved = await Storage.getItemAsync(USER_STORAGE_KEY);
      if (saved) {
        const { user } = JSON.parse(saved) as { user: User };
        set({ user, isBackendLive: true, hasHydrated: true });
        if (user.flatLabel) connectSocket(user.flatLabel).catch(() => {});
        return;
      }
    } catch {
      // ignore — secure store may be unavailable (e.g. web) or data malformed
    }
    set({ hasHydrated: true });
  },

  bootstrapSociety: async (input) => {
    try {
      const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
        "/auth/society/bootstrap",
        input,
        { auth: false }
      );
      await setTokens(res.accessToken, res.refreshToken);
      await persistSession(res.user);
      set({ user: res.user, isBackendLive: true });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: extractErrorMessage(err) };
    }
  },

  login: async (email, password) => {
    try {
      const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
        "/auth/login",
        { email, password },
        { auth: false }
      );
      await setTokens(res.accessToken, res.refreshToken);
      await persistSession(res.user);
      set({ user: res.user, isBackendLive: true });
      if (res.user.flatLabel) connectSocket(res.user.flatLabel).catch(() => {});
      return { ok: true };
    } catch (err) {
      let code: string | undefined;
      if (err instanceof ApiError) {
        try {
          code = JSON.parse(err.message)?.code;
        } catch {
          // plain string error — no code
        }
      }
      return { ok: false, error: extractErrorMessage(err), code };
    }
  },

  fetchInvitation: async (token) => {
    try {
      const res = await api.get<{ name: string; email: string; role: string; societyName: string }>(
        `/auth/invitations/${token}`,
        { auth: false }
      );
      return { ok: true, ...res };
    } catch (err) {
      return { ok: false, error: extractErrorMessage(err) };
    }
  },

  activateInvitation: async (token, password) => {
    try {
      const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
        `/auth/invitations/${token}/activate`,
        { password },
        { auth: false }
      );
      await setTokens(res.accessToken, res.refreshToken);
      await persistSession(res.user);
      set({ user: res.user, isBackendLive: true });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: extractErrorMessage(err) };
    }
  },

  logout: async () => {
    set({ user: null, isBackendLive: false });
    await clearTokens();
    try {
      await Storage.deleteItemAsync(USER_STORAGE_KEY);
    } catch {
      // ignore
    }
    disconnectSocket();
  },

  updateUser: (patch) => {
    const current = get().user;
    if (!current) return;
    const next = { ...current, ...patch };
    set({ user: next });
    void persistSession(next);
  },
}));