import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/Button";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useGenerateGuestPass } from "@/hooks/useVisitors";

export default function VisitorPreapprove() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const generatePass = useGenerateGuestPass();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [hours, setHours] = useState(4);
  const [pass, setPass] = useState<{ code: string } | null>(null);

  const generate = () => {
    if (!name.trim()) return;
    generatePass.mutate(
      { guestName: name.trim(), note: note.trim() || undefined, validHours: hours, flatLabel: user?.flatLabel ?? "A-1005" },
      { onSuccess: (result) => setPass({ code: result.code }) }
    );
  };

  if (pass) {
    return (
      <SafeAreaView className="flex-1 bg-cream">
        <View className="px-5 pt-4 flex-row justify-end">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("common.close")}>
            <Feather name="x" size={22} color={colors.ink700} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="p-5 rounded-3xl bg-paper border border-ink100 items-center justify-center mb-6">
            <QRCode value={pass.code} size={210} color={colors.ink900} backgroundColor="#fff" />
          </View>
          <Text className="font-display-medium text-2xl text-ink900 mb-1">{name || t("visitorPreapprove.guestFallback")}</Text>
          <Text className="text-ink400 text-sm mb-1">{t("visitorPreapprove.validForHours", { count: hours })}</Text>
          <View className="bg-ember50 px-3 py-1.5 rounded-full mt-2">
            <Text className="text-ember600 font-body-bold text-sm tracking-wider">{pass.code}</Text>
          </View>
          <Text className="text-ink300 text-xs text-center mt-6 px-6">{t("visitorPreapprove.shareCode")}</Text>
        </View>
        <View className="px-6 pb-8">
          <Button label={t("common.done")} fullWidth size="lg" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <Text className="font-display text-xl text-ink900">{t("visitorPreapprove.title")}</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("common.close")}>
          <Feather name="x" size={22} color={colors.ink700} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-ink500 font-body-medium text-sm mb-2">{t("visitorPreapprove.guestName")}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("visitorPreapprove.guestNamePlaceholder")}
          placeholderTextColor={colors.ink300}
          className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
        />

        <Text className="text-ink500 font-body-medium text-sm mb-2">{t("visitorPreapprove.validFor")}</Text>
        <View className="flex-row gap-2 mb-5">
          {[2, 4, 8, 24].map((h) => (
            <Pressable
              key={h}
              onPress={() => setHours(h)}
              accessibilityRole="button"
              accessibilityLabel={t("visitorPreapprove.validForHours", { count: h })}
              accessibilityState={{ selected: hours === h }}
              className={`flex-1 py-3 rounded-xl border items-center ${
                hours === h ? "bg-ember500 border-ember500" : "bg-paper border-ink100"
              }`}
            >
              <Text className={`font-body-semibold text-sm ${hours === h ? "text-white" : "text-ink600"}`}>
                {t("visitorPreapprove.hoursShort", { count: h })}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-ink500 font-body-medium text-sm mb-2">{t("visitorPreapprove.note")}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t("visitorPreapprove.notePlaceholder")}
          placeholderTextColor={colors.ink300}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-8 h-24"
        />

        <Button
          label={t("visitorPreapprove.generatePass")}
          fullWidth
          size="lg"
          disabled={!name.trim() || generatePass.isPending}
          loading={generatePass.isPending}
          onPress={generate}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
