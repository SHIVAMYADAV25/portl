import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Button } from "@/components/Button";
import { colors } from "@/constants/theme";
import { api, ApiUnreachableError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

export default function GuardScan() {
  const [permission, requestPermission] = useCameraPermissions();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; guestName?: string; flatLabel?: string } | null>(null);

  const onScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Codes look like "PORTL-XXXXXX" from the resident's pre-approve screen.
    if (!data.startsWith("PORTL-")) {
      setResult({ ok: false, message: "That doesn't look like a Portl gate pass." });
      return;
    }

    if (!isBackendLive) {
      // No backend running — simulate a successful scan for the demo.
      setResult({ ok: true, message: "Pass verified (offline demo mode)", guestName: "Guest", flatLabel: "A-1005" });
      return;
    }

    try {
      const res = await api.get<{ pass: { guestName: string; flatLabel: string } }>(`/visitors/guest-pass/${data}`);
      setResult({ ok: true, message: "Pass verified — visitor auto-approved", guestName: res.pass.guestName, flatLabel: res.pass.flatLabel });
    } catch (err) {
      if (err instanceof ApiUnreachableError) {
        setResult({ ok: true, message: "Pass verified (offline demo mode)", guestName: "Guest", flatLabel: "A-1005" });
        return;
      }
      setResult({ ok: false, message: (err as Error).message || "This pass is invalid or already used." });
    }
  };

  if (!permission) return <SafeAreaView className="flex-1 bg-ink900" />;

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-ink900 items-center justify-center px-8">
        <Feather name="camera-off" size={32} color="#fff" />
        <Text className="text-white font-body-semibold text-base mt-4 mb-2 text-center">Camera access needed</Text>
        <Text className="text-white/60 text-sm text-center mb-6">
          Portl needs your camera to scan guest QR passes at the gate.
        </Text>
        <Button label="Grant camera access" onPress={requestPermission} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          className="mt-4"
        >
          <Text className="text-white/50 text-sm">Cancel</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {!result ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : onScan}
          />
          <View className="flex-1 items-center justify-center">
            <View className="w-64 h-64 rounded-3xl border-2 border-white/70" />
            <Text className="text-white/80 font-body-medium text-sm mt-6 px-8 text-center">
              Point the camera at the guest's QR pass
            </Text>
          </View>
          <View className="pb-10 px-8">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Cancel scan"
              className="items-center py-3"
            >
              <Text className="text-white/60 font-body-medium text-sm">Cancel</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <View
            className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${result.ok ? "bg-moss500" : "bg-rust500"}`}
          >
            <Feather name={result.ok ? "check" : "x"} size={28} color="#fff" />
          </View>
          <Text className="text-white font-body-semibold text-base text-center mb-1">{result.message}</Text>
          {result.guestName ? (
            <Text className="text-white/60 text-sm text-center">
              {result.guestName} → {result.flatLabel}
            </Text>
          ) : null}
          <View className="flex-row gap-3 mt-8">
            <Button
              label="Scan another"
              variant="outline"
              onPress={() => {
                setScanned(false);
                setResult(null);
              }}
            />
            <Button label="Done" onPress={() => router.back()} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
