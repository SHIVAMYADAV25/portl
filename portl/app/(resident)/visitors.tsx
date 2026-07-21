import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, SectionList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/Badge";
import { EmptyState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useVisitors, useVisitorAction } from "@/hooks/useVisitors";
import type { Visitor } from "@/types";

const categoryIcon: Record<Visitor["category"], keyof typeof Feather.glyphMap> = {
  delivery: "package",
  guest: "user",
  cab: "navigation",
  service: "tool",
  other: "help-circle",
};

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function Visitors() {
  const [filter, setFilter] = useState<"all" | "pending" | "past">("all");
  const { data: allVisitors = [], isLoading, refetch, isRefetching } = useVisitors();
  const visitorAction = useVisitorAction();

  const filtered = useMemo(() => {
    if (filter === "pending") return allVisitors.filter((v) => v.status === "pending" || v.status === "approved");
    if (filter === "past") return allVisitors.filter((v) => v.status === "exited" || v.status === "rejected");
    return allVisitors;
  }, [filter, allVisitors]);

  const sections = useMemo(() => {
    const groups: Record<string, Visitor[]> = {};
    filtered.forEach((v) => {
      const label = dayLabel(v.requestedAt);
      groups[label] = groups[label] ?? [];
      groups[label].push(v);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filtered]);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-5 pt-3 pb-2">
        <Text className="font-display text-2xl text-ink900 mb-1">Visitor activity</Text>
        <Text className="text-ink400 text-sm">Approvals, deliveries and entry logs for {"A-1005"}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 10 }}>
        {(["all", "pending", "past"] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            accessibilityRole="button"
            accessibilityLabel={`Filter: ${f === "all" ? "All" : f === "pending" ? "Active" : "Past"}`}
            accessibilityState={{ selected: filter === f }}
            className={`px-4 py-2 rounded-full ${filter === f ? "bg-ink800" : "bg-paper border border-ink100"}`}
          >
            <Text className={`text-sm font-body-medium ${filter === f ? "text-white" : "text-ink600"}`}>
              {f === "all" ? "All" : f === "pending" ? "Active" : "Past"}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {!isLoading && sections.length === 0 ? (
        <EmptyState icon="user-x" title="No visitor activity yet" subtitle="Approved visitors and deliveries will show up here." />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 4 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.ember500} />}
          renderSectionHeader={({ section }) => (
            <Text className="text-ink400 font-body-medium text-xs uppercase tracking-wide mt-4 mb-2">
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                item.status === "pending"
                  ? router.push({ pathname: "/visitor-approval", params: { id: item.id } })
                  : undefined
              }
              accessibilityRole={item.status === "pending" ? "button" : undefined}
              accessibilityLabel={item.status === "pending" ? `Review visitor request from ${item.name}` : undefined}
            >
              <Card className="mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="w-10 h-10 rounded-full bg-ember50 items-center justify-center">
                      <Feather name={categoryIcon[item.category]} size={17} color={colors.ember600} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-body-semibold text-ink800">{item.company ?? item.name}</Text>
                      {item.company ? (
                        <Text className="text-ink400 text-xs">{item.name}</Text>
                      ) : null}
                    </View>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
                {item.purpose ? <Text className="text-ink500 text-sm mb-1">{item.purpose}</Text> : null}
                <Text className="text-ink300 text-xs">
                  {new Date(item.requestedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  {item.approvedBy ? ` · Approved by ${item.approvedBy}` : ""}
                </Text>

                {item.status === "pending" && (
                  <View className="flex-row gap-2 mt-3">
                    <Pressable
                      onPress={() => visitorAction.mutate({ id: item.id, action: "reject" })}
                      accessibilityRole="button"
                      accessibilityLabel={`Deny ${item.name}`}
                      className="flex-1 bg-ink50 py-2.5 rounded-xl items-center"
                    >
                      <Text className="text-ink600 font-body-semibold text-xs">Deny</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push({ pathname: "/visitor-approval", params: { id: item.id } })}
                      accessibilityRole="button"
                      accessibilityLabel={`Approve ${item.name}`}
                      className="flex-1 bg-moss500 py-2.5 rounded-xl items-center"
                    >
                      <Text className="text-white font-body-semibold text-xs">Approve</Text>
                    </Pressable>
                  </View>
                )}
                {(item.status === "approved" || item.status === "arrived") && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${item.name}`}
                    className="flex-row items-center justify-center gap-1.5 mt-3 bg-teal50 py-2.5 rounded-xl"
                  >
                    <Feather name="phone" size={14} color={colors.teal500} />
                    <Text className="text-teal500 font-body-semibold text-xs">Call visitor</Text>
                  </Pressable>
                )}
              </Card>
            </Pressable>
          )}
        />
      )}

      <Pressable
        onPress={() => router.push("/visitor-preapprove")}
        accessibilityRole="button"
        accessibilityLabel="Pre-approve a guest"
        className="absolute bottom-6 right-5 bg-ember500 px-5 py-4 rounded-2xl flex-row items-center gap-2"
        style={{ shadowColor: "#F0611A", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
      >
        <Feather name="user-plus" size={18} color="#fff" />
        <Text className="text-white font-body-semibold">Pre-approve guest</Text>
      </Pressable>
    </SafeAreaView>
  );
}
