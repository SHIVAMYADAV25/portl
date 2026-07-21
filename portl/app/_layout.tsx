import "../global.css";
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts as useInterFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useAuthStore } from "@/store/authStore";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { initI18n } from "@/localization/i18n";
import { View } from "react-native";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function useProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    } else if (user && inAuthGroup) {
      router.replace(`/(${user.role})` as never);
    }
  }, [user, hasHydrated, segments]);
}

export default function RootLayout() {
  const [fontsLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const hydrate = useAuthStore((s) => s.hydrate);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    hydrate();
    initI18n().then(() => setI18nReady(true));
  }, []);

  const ready = fontsLoaded && hasHydrated && i18nReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useProtectedRoute();
  usePushNotifications();

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(resident)" />
            <Stack.Screen name="(guard)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="visitor-approval" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
            <Stack.Screen name="visitor-preapprove" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
            <Stack.Screen name="guard-scan" options={{ presentation: "fullScreenModal", animation: "fade" }} />
            <Stack.Screen name="razorpay-checkout" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
            <Stack.Screen name="notices" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="polls" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="payments" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="staff-directory" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="profile" options={{ animation: "slide_from_right" }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}