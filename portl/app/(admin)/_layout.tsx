import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@/constants/theme";

export default function AdminLayout() {
  const { t } = useTranslation();
  return (
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
        options={{ title: t("tabs.overview"), tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="visitors"
        options={{ title: "Visitors", tabBarIcon: ({ color, size }) => <Feather name="user-check" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="complaints"
        options={{ title: t("tabs.complaints"), tabBarIcon: ({ color, size }) => <Feather name="life-buoy" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="notices"
        options={{ title: t("tabs.notices"), tabBarIcon: ({ color, size }) => <Feather name="bell" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: t("tabs.more"), tabBarIcon: ({ color, size }) => <Feather name="settings" color={color} size={size - 2} /> }}
      />
    </Tabs>
  );
}