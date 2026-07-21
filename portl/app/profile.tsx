import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

export default function Profile() {
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color={colors.ink700} />
        </Pressable>
        <Text className="font-display text-xl text-ink900">My profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="items-center mb-6">
          <Avatar name={user?.name ?? ""} size={80} />
          <Text className="font-display-medium text-xl text-ink900 mt-3">{user?.name}</Text>
          <Text className="text-ink400 text-sm mt-0.5">{user?.role === "resident" ? "Resident" : user?.role}</Text>
        </View>

        <Card className="mb-4">
          <Row label="Mobile" value={`+91 ${user?.phone}`} icon="phone" />
          <Row label="Flat" value={user?.flatLabel ?? "—"} icon="home" />
          <Row label="Tower" value={user?.towerName ?? "—"} icon="layers" last />
        </Card>

        <Text className="text-ink400 text-xs text-center mt-4">
          This is a demo profile for the Portl hackathon build. Editing isn't wired up yet.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, icon, last }: { label: string; value: string; icon: keyof typeof Feather.glyphMap; last?: boolean }) {
  return (
    <View className={`flex-row items-center py-3 ${last ? "" : "border-b border-ink50"}`}>
      <View className="w-9 h-9 rounded-full bg-ember50 items-center justify-center mr-3">
        <Feather name={icon} size={15} color={colors.ember600} />
      </View>
      <Text className="text-ink400 text-sm flex-1">{label}</Text>
      <Text className="text-ink800 font-body-medium text-sm">{value}</Text>
    </View>
  );
}
