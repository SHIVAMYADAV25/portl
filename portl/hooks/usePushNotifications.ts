import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { router } from "expo-router";
import { api, ApiUnreachableError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

// expo-notifications registers a native push-token listener the moment it's imported.
// That listener throws in Expo Go on SDK 53+ (remote push was removed from Expo Go),
// which crashes the JS bundle before anything can render. So we must never statically
// import the module — only require() it lazily, and only outside Expo Go.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function getNotifications() {
  if (isExpoGo) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("expo-notifications") as typeof import("expo-notifications");
}

const Notifications = getNotifications();

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications) return null; // Expo Go: no-op, use a dev build to test push.

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF7A30",
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  try {
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token.data;
  } catch (err) {
    // Common in simulators / dev clients without a configured EAS project — non-fatal.
    console.warn("[push] Could not get Expo push token:", (err as Error).message);
    return null;
  }
}

/** Call once near the app root once a user is logged in. Registers the device for push and
 * wires up tap-to-navigate for visitor-approval notifications. No-ops entirely in Expo Go. */
export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);
  const isBackendLive = useAuthStore((s) => s.isBackendLive);
  const registered = useRef(false);

  useEffect(() => {
    if (!user || registered.current || !Notifications) return;
    registered.current = true;

    (async () => {
      const token = await registerForPushNotifications();
      if (!token || !isBackendLive) return;
      try {
        await api.post("/users/me/push-token", { expoPushToken: token });
      } catch (err) {
        if (!(err instanceof ApiUnreachableError)) console.warn("[push] Failed to register token:", err);
      }
    })();

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      // Foreground notifications are shown automatically by the handler above.
      // Hook in a toast/badge update here if desired.
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { visitorId?: string } | undefined;
      if (data?.visitorId) {
        router.push({ pathname: "/visitor-approval", params: { id: data.visitorId } });
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [user, isBackendLive]);
}