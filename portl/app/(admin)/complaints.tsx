import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/Badge";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useComplaints, useUpdateComplaintStatus, useComplaintComments, useAddComplaintComment } from "@/hooks/useComplaints";
import type { Complaint, ComplaintStatus } from "@/types";

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
  const [thread, setThread] = useState<Complaint | null>(null);

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
          <Pressable key={c.id} onPress={() => setThread(c)} accessibilityRole="button" accessibilityLabel={`Open ${c.title}`}>
            <Card className="mb-3">
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
                <View className="flex-row items-center gap-3">
                  <Text className="text-ink300 text-xs">
                    {c.assignedTo ? `Assigned to ${c.assignedTo}` : "Unassigned"}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Feather name="message-circle" size={12} color={colors.ink300} />
                    <Text className="text-ink300 text-xs">Comments</Text>
                  </View>
                </View>
                {nextStatus[c.status] && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      updateStatus.mutate({ id: c.id, status: nextStatus[c.status]! });
                    }}
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
          </Pressable>
        ))}
      </ScrollView>
      )}

      <CommentThreadModal complaint={thread} onClose={() => setThread(null)} />
    </SafeAreaView>
  );
}

function CommentThreadModal({ complaint, onClose }: { complaint: Complaint | null; onClose: () => void }) {
  const { data: comments = [], isLoading } = useComplaintComments(complaint?.id ?? null);
  const addComment = useAddComplaintComment();
  const [body, setBody] = useState("");

  const send = async () => {
    if (!complaint || !body.trim()) return;
    const text = body.trim();
    setBody("");
    try {
      await addComment.mutateAsync({ complaintId: complaint.id, body: text });
    } catch {
      setBody(text);
    }
  };

  return (
    <Modal visible={!!complaint} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <SafeAreaView className="flex-1 bg-cream">
          <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="font-display text-lg text-ink900" numberOfLines={1}>{complaint?.title}</Text>
              <Text className="text-ink400 text-xs mt-0.5">{complaint?.flatLabel} · {complaint?.raisedBy}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={colors.ink700} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            {complaint ? (
              <Card className="mb-4">
                <Text className="text-ink600 text-sm">{complaint.description}</Text>
              </Card>
            ) : null}

            {isLoading ? (
              <LoadingState label="Loading comments…" />
            ) : comments.length === 0 ? (
              <Text className="text-ink300 text-sm text-center mt-4">No comments yet — add a note for the record.</Text>
            ) : (
              comments.map((cm) => (
                <View key={cm.id} className="mb-3.5">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-ink800 font-body-semibold text-sm">{cm.authorName}</Text>
                    <View className="bg-ink50 px-1.5 py-0.5 rounded-full">
                      <Text className="text-ink400 text-[10px] font-body-medium capitalize">{cm.authorRole}</Text>
                    </View>
                  </View>
                  <Text className="text-ink600 text-sm">{cm.body}</Text>
                  <Text className="text-ink300 text-[10px] mt-1">{new Date(cm.createdAt).toLocaleString()}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View className="flex-row items-center gap-2 px-5 pb-4 pt-2 border-t border-ink50">
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Add a comment…"
              placeholderTextColor={colors.ink300}
              className="flex-1 bg-paper border border-ink100 rounded-2xl px-4 py-3 text-ink800 font-body"
            />
            <Pressable
              onPress={send}
              disabled={!body.trim() || addComment.isPending}
              accessibilityRole="button"
              accessibilityLabel="Send comment"
              className={`w-11 h-11 rounded-full items-center justify-center ${body.trim() ? "bg-ember500" : "bg-ink100"}`}
            >
              <Feather name="arrow-up" size={18} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}