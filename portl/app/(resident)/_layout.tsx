import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@/constants/theme";

export default function ResidentLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ember600,
        tabBarInactiveTintColor: colors.ink300,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 11 },
        tabBarStyle: {
          borderTopColor: colors.ink100,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          title: t("tabs.visitors"),
          tabBarIcon: ({ color, size }) => <Feather name="user-check" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="amenities"
        options={{
          title: t("tabs.amenities"),
          tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="helpdesk"
        options={{
          title: t("tabs.helpdesk"),
          tabBarIcon: ({ color, size }) => <Feather name="life-buoy" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t("tabs.more"),
          tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
