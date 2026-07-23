import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card, SectionHeader } from "@/components/Card";
import { Avatar, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useAdminDashboard, type ActivityEvent } from "@/hooks/useAdminDashboard";
import { useUnreadCount } from "@/hooks/useNotifications";

const activityIcon: Record<ActivityEvent["type"], keyof typeof Feather.glyphMap> = {
  visitor: "user-check",
  complaint: "life-buoy",
  invite: "user-plus",
  notice: "bell",
};

export default function AdminHome() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useAdminDashboard();
  const unreadCount = useUnreadCount();

  const kpis = data
    ? [
        { label: "Total residents", value: data.kpis.totalResidents, icon: "users" as const, color: colors.teal500 },
        { label: "Total guards", value: data.kpis.totalGuards, icon: "shield" as const, color: colors.moss500 },
        { label: "Visitors today", value: data.kpis.visitorsToday, icon: "user-check" as const, color: colors.gold500 },
        { label: "Currently inside", value: data.kpis.visitorsInside, icon: "log-in" as const, color: colors.ember500 },
        { label: "Pending complaints", value: data.kpis.pendingComplaints, icon: "life-buoy" as const, color: colors.rust500 },
        { label: "Today's bookings", value: data.kpis.todaysBookings, icon: "calendar" as const, color: colors.teal500 },
      ]
    : [];

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
          <View className="flex-row items-center gap-3">
            <Avatar name={user?.name ?? "A"} size={44} />
            <View>
              <Text className="text-ink400 text-xs font-body-medium">Society Admin</Text>
              <Text className="text-ink900 font-display-medium text-lg">{user?.name}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            className="w-11 h-11 rounded-full bg-paper border border-ink100 items-center justify-center"
          >
            <Feather name="bell" size={19} color={colors.ink700} />
            {unreadCount > 0 && (
              <View className="min-w-[16px] h-4 px-1 rounded-full bg-rust500 absolute top-1.5 right-1.5 items-center justify-center">
                <Text className="text-white text-[9px] font-body-bold">{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {isLoading ? (
          <LoadingState label="Loading overview…" />
        ) : (
          <>
            <View className="px-5 flex-row flex-wrap gap-3 mb-5">
              {kpis.map((k) => (
                <Card key={k.label} style={{ width: "47%" }}>
                  <View className="w-9 h-9 rounded-full items-center justify-center mb-3" style={{ backgroundColor: `${k.color}1A` }}>
                    <Feather name={k.icon} size={16} color={k.color} />
                  </View>
                  <Text className="font-display text-2xl text-ink900">{k.value}</Text>
                  <Text className="text-ink400 text-xs mt-1 font-body-medium">{k.label}</Text>
                </Card>
              ))}
            </View>

            <View className="px-5 mb-5">
              <SectionHeader title="Recent activity" />
              {!data?.recentActivity.length ? (
                <Card className="items-center py-6">
                  <Text className="text-ink400 text-sm">Nothing to show yet</Text>
                </Card>
              ) : (
                data.recentActivity.map((event) => (
                  <Card key={event.id} className="mb-2.5 flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-ink50 items-center justify-center mr-3">
                      <Feather name={activityIcon[event.type]} size={14} color={colors.ink500} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-ink700 text-sm font-body-medium" numberOfLines={1}>{event.text}</Text>
                      <Text className="text-ink300 text-xs mt-0.5">{new Date(event.at).toLocaleString()}</Text>
                    </View>
                  </Card>
                ))
              )}
            </View>

            <View className="px-5">
              <SectionHeader title="Manage" />
              <View className="flex-row flex-wrap gap-3">
                {[
                  { label: "Residents & guards", icon: "users" as const, route: "/people" },
                  { label: "Towers & flats", icon: "layers" as const, route: "/society-setup" },
                  { label: "Amenities", icon: "calendar" as const, route: "/admin-amenities" },
                  { label: "Staff & services", icon: "briefcase" as const, route: "/staff-directory" },
                  { label: "Polls", icon: "bar-chart-2" as const, route: "/polls" },
                  { label: "Society settings", icon: "settings" as const, route: "/admin-settings" },
                ].map((m) => (
                  <Pressable
                    key={m.label}
                    onPress={() => router.push(m.route as never)}
                    accessibilityRole="button"
                    accessibilityLabel={m.label}
                    className="bg-paper border border-ink100 rounded-xl2 p-4 items-center"
                    style={{ width: "47%" }}
                  >
                    <Feather name={m.icon} size={20} color={colors.ember600} />
                    <Text className="text-ink700 font-body-medium text-sm mt-2">{m.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}