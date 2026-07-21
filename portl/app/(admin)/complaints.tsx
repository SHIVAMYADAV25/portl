import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/Badge";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useComplaints, useUpdateComplaintStatus } from "@/hooks/useComplaints";
import type { ComplaintStatus } from "@/types";

const nextStatus: Record<ComplaintStatus, ComplaintStatus | null> = {
  open: "assigned",
  assigned: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
  closed: null,
};

const nextLabel: Record<ComplaintStatus, string> = {
  open: "Assign",
  assigned: "Start progress",
  in_progress: "Mark resolved",
  resolved: "Close ticket",
  closed: "Closed",
};

const filters: ("all" | ComplaintStatus)[] = ["all", "open", "assigned", "in_progress", "resolved"];

export default function AdminComplaints() {
  const { data: complaints = [], isLoading, refetch, isRefetching } = useComplaints();
  const updateStatus = useUpdateComplaintStatus();
  const [filter, setFilter] = useState<"all" | ComplaintStatus>("all");

  const filtered = useMemo(
    () => (filter === "all" ? complaints : complaints.filter((c) => c.status === filter)),
    [complaints, filter]
  );

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-5 pt-3 pb-2">
        <Text className="font-display text-2xl text-ink900 mb-1">Tickets</Text>
        <Text className="text-ink400 text-sm">Assign, track and close resident complaints</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 10 }}>
        {filters.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            accessibilityRole="button"
            accessibilityLabel={`Filter: ${f.replace("_", " ")}`}
            accessibilityState={{ selected: filter === f }}
            className={`px-4 py-2 rounded-full ${filter === f ? "bg-ink800" : "bg-paper border border-ink100"}`}
          >
            <Text className={`text-sm font-body-medium capitalize ${filter === f ? "text-white" : "text-ink600"}`}>
              {f.replace("_", " ")}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <LoadingState label="Loading tickets…" />
      ) : filtered.length === 0 ? (
        <EmptyState icon="life-buoy" title="No tickets here" subtitle="Tickets matching this filter will show up here." />
      ) : (
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.ember500} />}
      >
        {filtered.map((c) => (
          <Card key={c.id} className="mb-3">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 pr-2">
                <Text className="font-body-semibold text-ink800">{c.title}</Text>
                <Text className="text-ink400 text-xs mt-0.5">
                  {c.flatLabel} · {c.raisedBy} · {c.category}
                </Text>
              </View>
              <StatusBadge status={c.status} />
            </View>
            <Text className="text-ink500 text-sm mb-3" numberOfLines={2}>{c.description}</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-ink300 text-xs">
                {c.assignedTo ? `Assigned to ${c.assignedTo}` : "Unassigned"}
              </Text>
              {nextStatus[c.status] && (
                <Pressable
                  onPress={() => updateStatus.mutate({ id: c.id, status: nextStatus[c.status]! })}
                  accessibilityRole="button"
                  accessibilityLabel={`${nextLabel[c.status]} for ${c.title}`}
                  className="bg-ember50 px-3.5 py-2 rounded-xl flex-row items-center gap-1.5"
                >
                  <Text className="text-ember600 font-body-semibold text-xs">{nextLabel[c.status]}</Text>
                  <Feather name="arrow-right" size={12} color={colors.ember600} />
                </Pressable>
              )}
            </View>
          </Card>
        ))}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}
