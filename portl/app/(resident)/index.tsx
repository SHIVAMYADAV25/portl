import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card, SectionHeader } from "@/components/Card";
import { Avatar } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useVisitors, useVisitorAction } from "@/hooks/useVisitors";
import { useNotices } from "@/hooks/useNotices";
import { usePolls, useVotePoll } from "@/hooks/usePolls";
import { useBills } from "@/hooks/useBills";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useTranslation } from "react-i18next";

export default function ResidentHome() {
  const { t } = useTranslation();
  const quickActions: { label: string; icon: keyof typeof Feather.glyphMap; route: string; isNew?: boolean }[] = [
    { label: t("residentHome.quickActionPreapprove"), icon: "user-plus", route: "/visitor-preapprove" },
    { label: t("residentHome.quickActionAmenities"), icon: "calendar", route: "/(resident)/amenities" },
    { label: t("residentHome.quickActionPayments"), icon: "credit-card", route: "/payments" },
    { label: t("residentHome.quickActionHelpdesk"), icon: "life-buoy", route: "/(resident)/helpdesk" },
    { label: t("residentHome.quickActionDirectory"), icon: "users", route: "/staff-directory", isNew: true },
    { label: t("residentHome.quickActionPolls"), icon: "bar-chart-2", route: "/polls" },
  ];
  const unreadCount = useUnreadCount();
  const user = useAuthStore((s) => s.user);
  const { data: visitors = [] } = useVisitors();
  const { data: notices = [] } = useNotices();
  const { data: polls = [] } = usePolls();
  const { data: bills = [] } = useBills();
  const visitorAction = useVisitorAction();
  const votePoll = useVotePoll();

  const pending = visitors.filter((v) => v.status === "pending");
  const dues = bills.find((b) => b.status === "unpaid");
  const notice = notices[0];
  const poll = polls[0];

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
          <Pressable
            onPress={() => router.push("/(resident)/more")}
            accessibilityRole="button"
            accessibilityLabel="Open profile and settings"
            className="flex-row items-center gap-3"
          >
            <Avatar name={user?.name ?? "R"} size={44} />
            <View>
              <Text className="text-ink400 text-xs font-body-medium">
                {user?.towerName} · {user?.flatLabel}
              </Text>
              <Text className="text-ink900 font-display-medium text-lg">{t("residentHome.greeting", { name: user?.name?.split(" ")[0] })}</Text>
            </View>
          </Pressable>
          <View className="flex-row gap-2">
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
        </View>

        {/* Pending approvals */}
        {pending.length > 0 && (
          <View className="mb-5">
            <SectionHeader title={t("residentHome.waitingForApproval")} actionLabel={t("common.seeAll")} onAction={() => router.push("/(resident)/visitors")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {pending.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => router.push({ pathname: "/visitor-approval", params: { id: v.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Review visitor request from ${v.name}`}
                  className="w-64 bg-paper border border-ember200 rounded-xl2 p-4"
                  style={{ shadowColor: "#251F1A", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
                >
                  <View className="flex-row items-center gap-3 mb-3">
                    <View className="w-10 h-10 rounded-full bg-gold50 items-center justify-center">
                      <Feather
                        name={v.category === "delivery" ? "package" : v.category === "cab" ? "navigation" : "user"}
                        size={18}
                        color={colors.gold500}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-body-semibold text-ink800" numberOfLines={1}>{v.name}</Text>
                      <Text className="text-ink400 text-xs">{v.company ?? v.purpose ?? t("visitorPreapprove.guestFallback")}</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => visitorAction.mutate({ id: v.id, action: "reject" })}
                      accessibilityRole="button"
                      accessibilityLabel={`Deny ${v.name}`}
                      className="flex-1 bg-ink50 py-2 rounded-xl items-center"
                    >
                      <Text className="text-ink600 font-body-semibold text-xs">{t("visitorApproval.deny")}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => visitorAction.mutate({ id: v.id, action: "approve" })}
                      accessibilityRole="button"
                      accessibilityLabel={`Approve ${v.name}`}
                      className="flex-1 bg-moss500 py-2 rounded-xl items-center"
                    >
                      <Text className="text-white font-body-semibold text-xs">{t("visitorApproval.approve")}</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick actions */}
        <View className="px-5 mb-5">
          <SectionHeader title={t("residentHome.quickActions")} />
          <View className="flex-row flex-wrap gap-3">
            {quickActions.map((a) => (
              <Pressable
                key={a.label}
                onPress={() => router.push(a.route as never)}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                className="items-center"
                style={{ width: "30%" }}
              >
                <View className="w-14 h-14 rounded-2xl bg-paper border border-ink100 items-center justify-center mb-1.5">
                  <Feather name={a.icon} size={20} color={colors.ember600} />
                  {a.isNew && (
                    <View className="absolute -top-1.5 -right-1.5 bg-ember500 px-1.5 py-0.5 rounded-full">
                      <Text className="text-white text-[9px] font-body-bold">NEW</Text>
                    </View>
                  )}
                </View>
                <Text className="text-ink600 text-xs font-body-medium text-center">{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Dues */}
        {dues && (
          <View className="px-5 mb-5">
            <Pressable
              onPress={() => router.push("/payments")}
              accessibilityRole="button"
              accessibilityLabel={`Pay ${dues.title}, due ${dues.dueDate}`}
            >
              <Card className="flex-row items-center justify-between bg-ink900 border-0">
                <View className="flex-1">
                  <Text className="text-ember300 text-xs font-body-semibold mb-1">DUE {dues.dueDate}</Text>
                  <Text className="text-white font-display-medium text-xl">₹{dues.amount.toLocaleString("en-IN")}</Text>
                  <Text className="text-ink300 text-xs mt-0.5">{dues.title}</Text>
                </View>
                <View className="bg-ember500 px-4 py-2.5 rounded-xl">
                  <Text className="text-white font-body-semibold text-sm">{t("residentHome.payNow")}</Text>
                </View>
              </Card>
            </Pressable>
          </View>
        )}

        {/* Notice */}
        {notice && (
          <View className="px-5 mb-5">
            <SectionHeader title={t("residentHome.latestNotice")} actionLabel={t("common.viewAll")} onAction={() => router.push("/notices")} />
            <Card>
              <View className="flex-row items-center gap-2 mb-2">
                <View className="bg-gold50 px-2 py-0.5 rounded-full">
                  <Text className="text-gold500 text-[10px] font-body-bold">{notice.category.toUpperCase()}</Text>
                </View>
              </View>
              <Text className="font-body-semibold text-ink800 mb-1">{notice.title}</Text>
              <Text className="text-ink400 text-sm leading-5" numberOfLines={2}>{notice.body}</Text>
            </Card>
          </View>
        )}

        {/* Poll */}
        {poll && (
          <View className="px-5">
            <SectionHeader title={t("residentHome.communityPoll")} actionLabel={t("common.vote")} onAction={() => router.push("/polls")} />
            <Card>
              <Text className="font-body-semibold text-ink800 mb-3">{poll.question}</Text>
              {poll.options.slice(0, 2).map((o) => {
                const pct = poll.totalVotes ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
                return (
                  <Pressable
                    key={o.id}
                    disabled={!!poll.myVote}
                    onPress={() => votePoll.mutate({ pollId: poll.id, optionId: o.id })}
                    accessibilityRole="button"
                    accessibilityLabel={poll.myVote ? `${o.label}, ${pct}% of votes` : `Vote for ${o.label}`}
                    accessibilityState={{ disabled: !!poll.myVote }}
                    className="mb-2"
                  >
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-ink600 text-xs font-body-medium">{o.label}</Text>
                      <Text className="text-ink400 text-xs">{pct}%</Text>
                    </View>
                    <View className="h-2 bg-ink50 rounded-full overflow-hidden">
                      <View style={{ width: `${pct}%` }} className="h-2 bg-ember400 rounded-full" />
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
