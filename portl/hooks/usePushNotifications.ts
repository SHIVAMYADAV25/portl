import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";
import { api, ApiUnreachableError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null| void> {
  // if (Platform.OS === "android") {
  //   await Notifications.setNotificationChannelAsync("default", {
  //     name: "default",
  //     importance: Notifications.AndroidImportance.MAX,
  //     vibrationPattern: [0, 250, 250, 250],
  //     lightColor: "#FF7A30",
  //   });
  // }

  // const { status: existing } = await Notifications.getPermissionsAsync();
  // let status = existing;
  // if (existing !== "granted") {
  //   const req = await Notifications.requestPermissionsAsync();
  //   status = req.status;
  // }
  // if (status !== "granted") return null;

  // const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  // try {
  //   const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  //   return token.data;
  // } catch (err) {
  //   // Common in simulators / dev clients without a configured EAS project — non-fatal.
  //   console.warn("[push] Could not get Expo push token:", (err as Error).message);
  //   return null;
  // }
}

/** Call once near the app root once a user is logged in. Registers the device for push and
 * wires up tap-to-navigate for visitor-approval notifications. */
export function usePushNotifications() {
  // const user = useAuthStore((s) => s.user);
  // const isBackendLive = useAuthStore((s) => s.isBackendLive);
  // const registered = useRef(false);

  // useEffect(() => {
  //   if (!user || registered.current) return;
  //   registered.current = true;

  //   (async () => {
  //     const token = await registerForPushNotifications();
  //     if (!token || !isBackendLive) return;
  //     try {
  //       await api.post("/users/me/push-token", { expoPushToken: token });
  //     } catch (err) {
  //       if (!(err instanceof ApiUnreachableError)) console.warn("[push] Failed to register token:", err);
  //     }
  //   })();

  //   const receivedSub = Notifications.addNotificationReceivedListener(() => {
  //     // Foreground notifications are shown automatically by the handler above.
  //     // Hook in a toast/badge update here if desired.
  //   });

  //   const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
  //     const data = response.notification.request.content.data as { visitorId?: string } | undefined;
  //     if (data?.visitorId) {
  //       router.push({ pathname: "/visitor-approval", params: { id: data.visitorId } });
  //     }
  //   });

  //   return () => {
  //     receivedSub.remove();
  //     responseSub.remove();
  //   };
  // }, [user, isBackendLive]);
}
