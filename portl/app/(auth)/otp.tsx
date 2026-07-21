import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/Button";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/services/api";
import type { Role } from "@/types";

const RESEND_COOLDOWN_SECONDS = 30;

export default function Otp() {
  const { t } = useTranslation();
  const { role, phone, demoMode } = useLocalSearchParams<{ role: Role; phone: string; demoMode?: string }>();
  const isDemoMode = demoMode !== "0";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [justResent, setJustResent] = useState(false);
  const loginWithOtp = useAuthStore((s) => s.loginWithOtp);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const verify = async () => {
    if (code.length < 4) return;
    setLoading(true);
    const result = await loginWithOtp(phone, code, role);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }
    // RootLayout's useProtectedRoute redirects to the role home automatically.
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      // Same call login.tsx makes before first navigating here — failing soft to demo mode on
      // any error (unreachable backend, Twilio hiccup) so resend never blocks the flow.
      await api.post("/auth/request-otp", { phone }, { auth: false });
    } catch {
      // no-op — demo code 1234 still works either way
    } finally {
      setResending(false);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setJustResent(true);
      setTimeout(() => setJustResent(false), 3000);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
      <View className="px-6 pt-4">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="arrow-left" size={24} color={colors.ink700} />
        </Pressable>
      </View>

      <View className="px-6 pt-8 flex-1">
        <Text className="font-display text-3xl text-ink900">{t("otp.title")}</Text>
        <Text className="text-ink400 font-body mt-2">
          {isDemoMode ? t("otp.subtitleDemo") : t("otp.subtitleReal")}{" "}
          {!isDemoMode && <Text className="text-ink700 font-body-semibold">+91 {phone}</Text>}
        </Text>

        <View className="mt-8">
          <TextInput
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/[^0-9]/g, "").slice(0, 8));
              setError(null);
            }}
            keyboardType="number-pad"
            placeholder={isDemoMode ? "1234" : t("otp.codePlaceholder")}
            placeholderTextColor={colors.ink300}
            maxLength={8}
            autoFocus
            className={`text-center text-2xl font-body-bold rounded-2xl border py-4 tracking-[8px] ${
              error ? "border-rust500 bg-rust50" : "border-ink100 bg-paper"
            } text-ink800`}
          />
        </View>

        {error ? (
          <Text className="text-rust500 text-sm mt-3 font-body-medium">
            {error}{isDemoMode ? t("otp.errorSuffixDemo") : ""}
          </Text>
        ) : isDemoMode ? (
          <Text className="text-ink300 text-xs mt-3">{t("otp.demoOtpNote")}</Text>
        ) : justResent ? (
          <Text className="text-moss600 text-sm mt-5 font-body-medium">{t("otp.codeResent")}</Text>
        ) : (
          <Pressable
            onPress={resend}
            disabled={cooldown > 0 || resending}
            accessibilityRole="button"
            accessibilityLabel={cooldown > 0 ? t("otp.resendIn", { count: cooldown }) : t("otp.resend")}
            className="mt-5"
          >
            <Text className={`font-body-semibold text-sm ${cooldown > 0 || resending ? "text-ink300" : "text-ember600"}`}>
              {cooldown > 0 ? t("otp.resendIn", { count: cooldown }) : t("otp.resend")}
            </Text>
          </Pressable>
        )}

        <View className="flex-1" />

        <Button
          label={t("otp.verify")}
          fullWidth
          size="lg"
          loading={loading}
          disabled={code.length < 4}
          onPress={verify}
        />
        <View className="h-8" />
      </View>
    </SafeAreaView>
  );
}
