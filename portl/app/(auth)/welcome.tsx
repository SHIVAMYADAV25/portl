import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@/constants/theme";
import type { Role } from "@/types";

export default function Welcome() {
  const { t } = useTranslation();

  const roles: { role: Role; title: string; blurb: string; icon: keyof typeof Feather.glyphMap }[] = [
    { role: "resident", title: t("welcome.roleResident"), blurb: t("welcome.roleResidentBlurb"), icon: "home" },
    { role: "guard", title: t("welcome.roleGuard"), blurb: t("welcome.roleGuardBlurb"), icon: "shield" },
    { role: "admin", title: t("welcome.roleAdmin"), blurb: t("welcome.roleAdminBlurb"), icon: "grid" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-10 pb-6">
          <View className="w-14 h-14 rounded-2xl bg-ember500 items-center justify-center mb-6">
            <Feather name="aperture" size={26} color="#fff" />
          </View>
          <Text className="font-display text-4xl text-ink900 leading-[42px]">{t("welcome.title")}</Text>
          <Text className="text-ink400 font-body text-base mt-3 leading-6">{t("welcome.subtitle")}</Text>
        </View>

        <View className="px-6 gap-3 mt-4">
          <Text className="text-ink400 font-body-semibold text-xs uppercase tracking-wider mb-1">
            {t("welcome.continueAs")}
          </Text>
          {roles.map((r) => (
            <Pressable
              key={r.role}
              onPress={() => router.push({ pathname: "/(auth)/login", params: { role: r.role } })}
              accessibilityRole="button"
              accessibilityLabel={`Continue as ${r.title}`}
              className="flex-row items-center bg-paper border border-ink100 rounded-xl2 p-4 active:bg-ember50"
              style={{
                shadowColor: "#251F1A",
                shadowOpacity: 0.03,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
              }}
            >
              <View className="w-11 h-11 rounded-full bg-ember50 items-center justify-center mr-4">
                <Feather name={r.icon} size={20} color={colors.ember600} />
              </View>
              <View className="flex-1">
                <Text className="font-body-semibold text-ink800 text-[15px]">{r.title}</Text>
                <Text className="text-ink400 text-[13px] mt-0.5">{r.blurb}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.ink300} />
            </Pressable>
          ))}
        </View>

        <View className="flex-1" />
        <Text className="text-center text-ink300 text-xs pb-6 px-6">{t("welcome.terms")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
