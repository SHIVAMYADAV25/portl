import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/Badge";
import { Avatar, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useVisitors, useVisitorAction } from "@/hooks/useVisitors";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useTranslation } from "react-i18next";

export default function GuardHome() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: visitors = [], isLoading, refetch, isRefetching } = useVisitors();
  const unreadCount = useUnreadCount();
  const visitorAction = useVisitorAction();

  const pending = visitors.filter((v) => v.status === "pending");
  const inSociety = visitors.filter((v) => v.status === "arrived" || v.status === "approved");
  const today = visitors.length;

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.ember500} />}
      >
        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
          <View className="flex-row items-center gap-3">
            <Avatar name={user?.name ?? "G"} size={44} />
            <View>
              <Text className="text-ink400 text-xs font-body-medium">{user?.towerName}</Text>
              <Text className="text-ink900 font-display-medium text-lg">{t("guardHome.greeting", { name: user?.name?.split(" ")[0] })}</Text>
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

        <View className="flex-row gap-3 px-5 mb-5">
          <Card className="flex-1 items-center py-4">
            <Text className="font-display text-2xl text-ember600">{pending.length}</Text>
            <Text className="text-ink400 text-xs mt-1 font-body-medium">{t("guardHome.pending")}</Text>
          </Card>
          <Card className="flex-1 items-center py-4">
            <Text className="font-display text-2xl text-teal500">{inSociety.length}</Text>
            <Text className="text-ink400 text-xs mt-1 font-body-medium">{t("guardHome.inSociety")}</Text>
          </Card>
          <Card className="flex-1 items-center py-4">
            <Text className="font-display text-2xl text-ink800">{today}</Text>
            <Text className="text-ink400 text-xs mt-1 font-body-medium">{t("guardHome.todayTotal")}</Text>
          </Card>
        </View>

        <View className="px-5 mb-5">
          <Pressable
            onPress={() => router.push("/(guard)/register")}
            accessibilityRole="button"
            accessibilityLabel="Register new visitor"
            className="bg-ember500 rounded-xl2 p-5 flex-row items-center justify-between"
            style={{ shadowColor: "#F0611A", shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
          >
            <View>
              <Text className="text-white font-body-semibold text-base">{t("guardHome.registerNewVisitor")}</Text>
              <Text className="text-white/80 text-xs mt-0.5">{t("guardHome.registerSubtitle")}</Text>
            </View>
            <View className="w-11 h-11 rounded-full bg-white/20 items-center justify-center">
              <Feather name="plus" size={20} color="#fff" />
            </View>
          </Pressable>
        </View>

        <View className="px-5">
          <Text className="font-display-medium text-lg text-ink800 mb-3">{t("guardHome.pendingApproval")}</Text>
          {isLoading ? (
            <LoadingState />
          ) : pending.length === 0 ? (
            <Card className="items-center py-8">
              <Feather name="check-circle" size={22} color={colors.moss500} />
              <Text className="text-ink500 text-sm mt-2 font-body-medium">{t("guardHome.allCaughtUp")}</Text>
            </Card>
          ) : (
            pending.map((v) => (
              <Card key={v.id} className="mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="w-10 h-10 rounded-full bg-gold50 items-center justify-center">
                      <Feather name={v.category === "delivery" ? "package" : "user"} size={17} color={colors.gold500} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-body-semibold text-ink800">{v.name}</Text>
                      <Text className="text-ink400 text-xs">
                        {v.company ?? v.purpose} · {t("visitorApproval.forFlat", { flat: v.flatLabel })}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge status={v.status} />
                </View>
                <View className="bg-ink50 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5">
                  <Feather name="phone" size={13} color={colors.ink600} />
                  <Text className="text-ink600 font-body-semibold text-xs">{t("guardHome.waitingOnResident", { flat: v.flatLabel })}</Text>
                </View>
              </Card>
            ))
          )}
        </View>

        <View className="px-5 mt-5">
          <Text className="font-display-medium text-lg text-ink800 mb-3">{t("guardHome.currentlyInSociety")}</Text>
          {isLoading ? (
            <LoadingState />
          ) : inSociety.length === 0 ? (
            <Card className="items-center py-6">
              <Text className="text-ink400 text-sm">{t("guardHome.noVisitorsInside")}</Text>
            </Card>
          ) : (
            inSociety.map((v) => (
              <Card key={v.id} className="mb-3 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-body-semibold text-ink800">{v.name}</Text>
                  <Text className="text-ink400 text-xs">{v.company ?? v.purpose} · {v.flatLabel}</Text>
                </View>
                <Pressable
                  onPress={() => visitorAction.mutate({ id: v.id, action: v.status === "approved" ? "entry" : "exit" })}
                  accessibilityRole="button"
                  accessibilityLabel={`${v.status === "approved" ? t("guardHome.markEntry") : t("guardHome.markExit")} — ${v.name}`}
                  className={`px-3.5 py-2 rounded-xl ${v.status === "approved" ? "bg-teal50" : "bg-rust50"}`}
                >
                  <Text className={`font-body-semibold text-xs ${v.status === "approved" ? "text-teal500" : "text-rust500"}`}>
                    {v.status === "approved" ? t("guardHome.markEntry") : t("guardHome.markExit")}
                  </Text>
                </Pressable>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
