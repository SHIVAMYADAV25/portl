import { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useVisitors, useVisitorAction } from "@/hooks/useVisitors";

const categoryIcon: Record<string, keyof typeof Feather.glyphMap> = {
  delivery: "package",
  guest: "user",
  cab: "navigation",
  service: "tool",
  other: "help-circle",
};

export default function VisitorApproval() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: visitors = [] } = useVisitors();
  const visitorAction = useVisitorAction();
  const visitor = useMemo(() => visitors.find((v) => v.id === id) ?? visitors[0], [id, visitors]);
  const [resolution, setResolution] = useState<"approved" | "rejected" | "left" | null>(null);

  const act = (r: "approved" | "rejected" | "left") => {
    Haptics.notificationAsync(
      r === "approved" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    ).catch(() => {});
    setResolution(r);
    if (visitor && (r === "approved" || r === "rejected")) {
      visitorAction.mutate({ id: visitor.id, action: r === "approved" ? "approve" : "reject" });
    }
    setTimeout(() => router.back(), 900);
  };

  if (!visitor) {
    return (
      <SafeAreaView className="flex-1 bg-ink900 items-center justify-center">
        <Text className="text-white/60 font-body-medium">{t("visitorApproval.noVisitorFound")}</Text>
      </SafeAreaView>
    );
  }

  if (resolution) {
    const cfg = {
      approved: { icon: "check-circle" as const, color: colors.moss500, text: t("visitorApproval.approved") },
      rejected: { icon: "x-circle" as const, color: colors.rust500, text: t("visitorApproval.denied") },
      left: { icon: "package" as const, color: colors.gold500, text: t("visitorApproval.leftAtGate") },
    }[resolution];
    return (
      <SafeAreaView className="flex-1 bg-ink900 items-center justify-center">
        <Feather name={cfg.icon} size={56} color={cfg.color} />
        <Text className="text-white font-body-semibold text-lg mt-4">{cfg.text}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ink900">
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-16 h-16 rounded-full bg-ember500/20 items-center justify-center mb-6">
          <Feather name={categoryIcon[visitor.category]} size={26} color={colors.ember400} />
        </View>

        <Text className="text-white/70 font-body-medium text-base text-center mb-8">
          {t("visitorApproval.waitingAtGate", { category: t(`visitorCategories.${visitor.category}`) })}
        </Text>

        <Avatar name={visitor.name} size={88} />
        <Text className="text-white font-display-medium text-2xl mt-4">{visitor.name}</Text>
        {visitor.company ? (
          <View className="flex-row items-center gap-2 mt-2">
            <View className="bg-white/10 px-2.5 py-1 rounded-full">
              <Text className="text-white/80 text-xs font-body-semibold">{visitor.company}</Text>
            </View>
          </View>
        ) : null}
        {visitor.purpose ? <Text className="text-white/50 text-sm mt-2">{visitor.purpose}</Text> : null}
        <Text className="text-white/40 text-xs mt-1">{t("visitorApproval.forFlat", { flat: visitor.flatLabel })}</Text>
      </View>

      <View className="pb-10 px-8">
        <View className="flex-row justify-between mb-8">
          <Pressable
            onPress={() => act("rejected")}
            accessibilityRole="button"
            accessibilityLabel={`Deny ${visitor.name}`}
            className="items-center gap-2"
          >
            <View className="w-16 h-16 rounded-full bg-rust500/15 items-center justify-center">
              <Feather name="x" size={26} color={colors.rust400} />
            </View>
            <Text className="text-white/70 text-xs font-body-medium">{t("visitorApproval.deny")}</Text>
          </Pressable>

          <Pressable
            onPress={() => act("left")}
            accessibilityRole="button"
            accessibilityLabel={`Leave ${visitor.name} at the gate`}
            className="items-center gap-2"
          >
            <View className="w-16 h-16 rounded-full bg-white/10 items-center justify-center">
              <Feather name="briefcase" size={24} color="#fff" />
            </View>
            <Text className="text-white/70 text-xs font-body-medium">{t("visitorApproval.leaveAtGate")}</Text>
          </Pressable>

          <Pressable
            onPress={() => act("approved")}
            accessibilityRole="button"
            accessibilityLabel={`Approve ${visitor.name}`}
            className="items-center gap-2"
          >
            <View className="w-16 h-16 rounded-full bg-moss500 items-center justify-center">
              <Feather name="check" size={26} color="#fff" />
            </View>
            <Text className="text-white/70 text-xs font-body-medium">{t("visitorApproval.approve")}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Call the guard instead"
          className="flex-row items-center justify-center gap-2 py-3"
        >
          <Feather name="phone" size={14} color="rgba(255,255,255,0.5)" />
          <Text className="text-white/50 text-sm font-body-medium">{t("visitorApproval.callGuard")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
