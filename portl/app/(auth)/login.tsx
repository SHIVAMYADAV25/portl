import { useState } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/Button";
import { colors } from "@/constants/theme";
import type { Role } from "@/types";
import { demoUsers } from "@/services/mockData";
import { api, ApiUnreachableError } from "@/services/api";

export default function Login() {
  const { t } = useTranslation();
  const roleLabel: Record<Role, string> = {
    resident: t("welcome.roleResident"),
    guard: t("welcome.roleGuard"),
    admin: t("welcome.roleAdmin"),
  };
  const { role } = useLocalSearchParams<{ role: Role }>();
  const demoPhone = role ? demoUsers[role]?.phone : "";
  const [phone, setPhone] = useState(demoPhone ?? "");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    setLoading(true);
    let demoMode = true;
    try {
      const res = await api.post<{ sent: boolean; demoMode: boolean }>(
        "/auth/request-otp",
        { phone },
        { auth: false }
      );
      demoMode = res.demoMode;
    } catch (err) {
      // ApiUnreachableError (no backend) or a Twilio hiccup — either way, the OTP screen still
      // works via the fixed demo code, so don't block the flow.
      demoMode = true;
    } finally {
      setLoading(false);
    }
    router.push({ pathname: "/(auth)/otp", params: { role, phone, demoMode: demoMode ? "1" : "0" } });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
      <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
        <View className="px-6 pt-4">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Feather name="arrow-left" size={24} color={colors.ink700} />
          </Pressable>
        </View>

        <View className="px-6 pt-8 flex-1">
          <Text className="font-display text-3xl text-ink900">{t("login.signIn")}</Text>
          <Text className="text-ink400 font-body mt-2">
            {t("login.continuingAs")} <Text className="text-ember600 font-body-semibold">{role ? roleLabel[role] : ""}</Text>
          </Text>

          <View className="mt-8">
            <Text className="text-ink500 font-body-medium text-sm mb-2">{t("login.phoneLabel")}</Text>
            <View className="flex-row items-center bg-paper border border-ink100 rounded-2xl px-4 h-14">
              <Text className="text-ink600 font-body-medium mr-2">+91</Text>
              <View className="w-px h-6 bg-ink100 mr-3" />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="98765 43210"
                placeholderTextColor={colors.ink300}
                maxLength={10}
                className="flex-1 text-ink800 font-body-medium text-base"
              />
            </View>
            <Text className="text-ink300 text-xs mt-2">{t("login.otpHint")}</Text>
          </View>

          <View className="flex-1" />

          <Button
            label={t("login.sendOtp")}
            fullWidth
            size="lg"
            loading={loading}
            disabled={phone.length < 10 || loading}
            onPress={sendOtp}
          />
          <View className="h-8" />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
