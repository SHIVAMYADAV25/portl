import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/useNotifications";
import type { AppNotification } from "@/types";

const typeIcon: Record<AppNotification["type"], keyof typeof Feather.glyphMap> = {
  visitor: "user-check",
  notice: "bell",
  complaint: "life-buoy",
  poll: "bar-chart-2",
  general: "info",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Notifications() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const openNotification = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);

    switch (n.type) {
      case "visitor":
        if (n.meta?.visitorId) {
          router.push({ pathname: "/visitor-approval", params: { id: String(n.meta.visitorId) } });
        }
        return;
      case "notice":
        router.push("/notices");
        return;
      case "poll":
        router.push("/polls");
        return;
      default:
        return; // "complaint"/"general" — nothing to deep-link to yet, just mark read in place
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Feather name="arrow-left" size={22} color={colors.ink700} />
          </Pressable>
          <Text className="font-display text-xl text-ink900">Notifications</Text>
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
          >
            <Text className="text-ember600 font-body-semibold text-sm">Mark all read</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <LoadingState label="Loading notifications…" />
      ) : notifications.length === 0 ? (
        <EmptyState icon="bell" title="No notifications yet" subtitle="Visitor requests, notices, and updates will show up here." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => openNotification(n)}
              accessibilityRole="button"
              accessibilityLabel={`${n.read ? "" : "Unread. "}${n.title}`}
            >
              <Card className={`mb-3 flex-row ${n.read ? "" : "border-ember200 bg-ember50/40"}`}>
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    n.read ? "bg-ink50" : "bg-ember100"
                  }`}
                >
                  <Feather name={typeIcon[n.type]} size={16} color={n.read ? colors.ink400 : colors.ember600} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-start justify-between">
                    <Text
                      className={`flex-1 pr-2 text-[15px] ${n.read ? "text-ink600 font-body-medium" : "text-ink900 font-body-semibold"}`}
                    >
                      {n.title}
                    </Text>
                    {!n.read && <View className="w-2 h-2 rounded-full bg-ember500 mt-1.5" />}
                  </View>
                  <Text className="text-ink400 text-sm mt-0.5" numberOfLines={2}>{n.body}</Text>
                  <Text className="text-ink300 text-xs mt-1.5">{timeAgo(n.createdAt)}</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
