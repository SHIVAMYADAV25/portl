import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Avatar } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const menu: { section: string; items: { label: string; icon: keyof typeof Feather.glyphMap; route: string }[] }[] = [
  {
    section: "Society structure",
    items: [
      { label: "Towers & flats", icon: "layers", route: "/staff-directory" },
      { label: "Residents", icon: "users", route: "/staff-directory" },
      { label: "Staff & vendors", icon: "briefcase", route: "/staff-directory" },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Amenities config", icon: "calendar", route: "/(resident)/amenities" },
      { label: "Polls", icon: "bar-chart-2", route: "/polls" },
      { label: "Billing & payments", icon: "credit-card", route: "/payments" },
      { label: "Visitor logs", icon: "clock", route: "/(guard)/history" },
    ],
  },
  {
    section: "Account",
    items: [{ label: "My profile", icon: "user", route: "/profile" }],
  },
];

export default function AdminMore() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-3 pb-5 flex-row items-center gap-4">
          <Avatar name={user?.name ?? ""} size={56} />
          <View>
            <Text className="font-display-medium text-xl text-ink900">{user?.name}</Text>
            <Text className="text-ink400 text-sm mt-0.5">{t("welcome.roleAdmin")} · {user?.towerName}</Text>
          </View>
        </View>

        {menu.map((section) => (
          <View key={section.section} className="mb-5 px-5">
            <Text className="text-ink400 font-body-semibold text-xs uppercase tracking-wide mb-2 px-1">
              {section.section}
            </Text>
            <View className="bg-paper rounded-xl2 border border-ink100 overflow-hidden">
              {section.items.map((item, i) => (
                <Pressable
                  key={item.label}
                  onPress={() => router.push(item.route as never)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  className={`flex-row items-center px-4 py-3.5 ${i < section.items.length - 1 ? "border-b border-ink50" : ""}`}
                >
                  <View className="w-9 h-9 rounded-full bg-ember50 items-center justify-center mr-3">
                    <Feather name={item.icon} size={16} color={colors.ember600} />
                  </View>
                  <Text className="flex-1 text-ink700 font-body-medium">{item.label}</Text>
                  <Feather name="chevron-right" size={18} color={colors.ink300} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <LanguageSwitcher />

        <View className="px-5">
          <Pressable
            onPress={() =>
              Alert.alert(t("common.logOutConfirmTitle"), t("common.logOutConfirmBody"), [
                { text: t("common.cancel"), style: "cancel" },
                { text: t("common.logOut"), style: "destructive", onPress: () => logout() },
              ])
            }
            accessibilityRole="button"
            accessibilityLabel={t("common.logOut")}
            className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl2 bg-rust50"
          >
            <Feather name="log-out" size={16} color={colors.rust500} />
            <Text className="text-rust500 font-body-semibold">{t("common.logOut")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
