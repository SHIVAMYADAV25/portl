import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card, SectionHeader } from "@/components/Card";
import { Avatar, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useComplaints } from "@/hooks/useComplaints";
import { useVisitors } from "@/hooks/useVisitors";
import { useBookings } from "@/hooks/useAmenities";
import { useBills } from "@/hooks/useBills";
import { useUnreadCount } from "@/hooks/useNotifications";

export default function AdminHome() {
  const user = useAuthStore((s) => s.user);
  const { data: complaints = [], isLoading: complaintsLoading } = useComplaints();
  const { data: visitors = [], isLoading: visitorsLoading } = useVisitors();
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings();
  const { data: bills = [], isLoading: billsLoading } = useBills();
  const unreadCount = useUnreadCount();
  const isLoading = complaintsLoading || visitorsLoading || bookingsLoading || billsLoading;

  const openTickets = complaints.filter((c) => c.status === "open" || c.status === "assigned").length;
  const visitorsToday = visitors.length;
  const collected = bills.filter((b) => b.status === "paid").length;
  const totalBills = bills.length;

  const kpis = [
    { label: "Open tickets", value: openTickets, icon: "life-buoy" as const, color: colors.rust500 },
    { label: "Visitors today", value: visitorsToday, icon: "user-check" as const, color: colors.teal500 },
    { label: "Bookings today", value: bookings.filter((b) => b.status === "confirmed").length, icon: "calendar" as const, color: colors.gold500 },
    { label: "Dues collected", value: `${collected}/${totalBills}`, icon: "credit-card" as const, color: colors.moss500 },
  ];

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
          <SectionHeader title="Recent tickets" actionLabel="View queue" onAction={() => router.push("/(admin)/complaints")} />
          {complaints.length === 0 ? (
            <Card className="items-center py-6">
              <Text className="text-ink400 text-sm">No tickets yet</Text>
            </Card>
          ) : (
            complaints.slice(0, 3).map((c) => (
              <Card key={c.id} className="mb-2.5 flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="font-body-semibold text-ink800 text-sm" numberOfLines={1}>{c.title}</Text>
                  <Text className="text-ink400 text-xs mt-0.5">{c.flatLabel} · {c.category}</Text>
                </View>
                <View className="bg-ink50 px-2.5 py-1 rounded-full">
                  <Text className="text-ink600 text-[11px] font-body-semibold capitalize">{c.status.replace("_", " ")}</Text>
                </View>
              </Card>
            ))
          )}
        </View>

        <View className="px-5">
          <SectionHeader title="Manage" />
          <View className="flex-row flex-wrap gap-3">
            {[
              // Note: these are read-mostly "peek" shortcuts into screens the mobile app already
              // has, for admin oversight on the go. Full CRUD management (residents, billing,
              // towers/flats) lives in the separate admin web dashboard — see its README.
              { label: "Staff & services", icon: "users" as const, route: "/staff-directory" },
              { label: "Amenities", icon: "calendar" as const, route: "/(resident)/amenities" },
              { label: "Polls", icon: "bar-chart-2" as const, route: "/polls" },
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
