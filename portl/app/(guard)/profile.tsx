import { View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Avatar } from "@/components/Misc";
import { Card } from "@/components/Card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "react-i18next";

export default function GuardProfile() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-5 pt-6 items-center">
        <Avatar name={user?.name ?? ""} size={80} />
        <Text className="font-display-medium text-xl text-ink900 mt-3">{user?.name}</Text>
        <Text className="text-ink400 text-sm mt-0.5">{t("welcome.roleGuard")} · {user?.towerName}</Text>
      </View>

      <View className="px-5 mt-6">
        <Card className="mb-4">
          <Row icon="phone" label="Mobile" value={`+91 ${user?.phone}`} last />
        </Card>
      </View>

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
    </SafeAreaView>
  );
}

function Row({ label, value, icon, last }: { label: string; value: string; icon: keyof typeof Feather.glyphMap; last?: boolean }) {
  return (
    <View className={`flex-row items-center py-1 ${last ? "" : "border-b border-ink50"}`}>
      <View className="w-9 h-9 rounded-full bg-ember50 items-center justify-center mr-3">
        <Feather name={icon} size={15} color={colors.ember600} />
      </View>
      <Text className="text-ink400 text-sm flex-1">{label}</Text>
      <Text className="text-ink800 font-body-medium text-sm">{value}</Text>
    </View>
  );
}
