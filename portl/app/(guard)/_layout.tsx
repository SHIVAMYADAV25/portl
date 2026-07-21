import { View, Text } from "react-native";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@/constants/theme";
import { useOfflineSync } from "@/hooks/useOfflineSync";

function OfflineBanner() {
  const { t } = useTranslation();
  const { isOnline, pending, syncing } = useOfflineSync();

  if (isOnline && pending === 0) return null;

  return (
    <View
      className={`flex-row items-center justify-center gap-2 py-2 px-4 ${isOnline ? "bg-teal50" : "bg-gold50"}`}
      style={{ paddingTop: 6 }}
    >
      <Feather
        name={isOnline ? "refresh-cw" : "cloud-off"}
        size={13}
        color={isOnline ? colors.teal500 : colors.gold500}
      />
      <Text className={`text-xs font-body-semibold ${isOnline ? "text-teal500" : "text-gold500"}`}>
        {!isOnline
          ? t("offline.willSync", { count: pending })
          : syncing
          ? t("offline.syncing")
          : t("offline.queuedSyncing", { count: pending })}
      </Text>
    </View>
  );
}

export default function GuardLayout() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.ember600,
          tabBarInactiveTintColor: colors.ink300,
          tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 11 },
          tabBarStyle: { borderTopColor: colors.ink100, height: 62, paddingBottom: 8, paddingTop: 8 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: t("tabs.gate"), tabBarIcon: ({ color, size }) => <Feather name="shield" color={color} size={size - 2} /> }}
        />
        <Tabs.Screen
          name="register"
          options={{ title: t("tabs.register"), tabBarIcon: ({ color, size }) => <Feather name="user-plus" color={color} size={size - 2} /> }}
        />
        <Tabs.Screen
          name="history"
          options={{ title: t("tabs.history"), tabBarIcon: ({ color, size }) => <Feather name="clock" color={color} size={size - 2} /> }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: t("tabs.profile"), tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size - 2} /> }}
        />
      </Tabs>
    </View>
  );
}
