import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { usePolls, useVotePoll, useCreatePoll, useClosePoll } from "@/hooks/usePolls";
import { useAuthStore } from "@/store/authStore";
import { ApiError } from "@/services/api";

export default function Polls() {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "admin";
  const { data: polls = [], isLoading } = usePolls();
  const votePoll = useVotePoll();
  const createPoll = useCreatePoll();
  const closePoll = useClosePoll();

  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [daysOpen, setDaysOpen] = useState("7");

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setDaysOpen("7");
  };

  const addOption = () => setOptions((o) => [...o, ""]);
  const updateOption = (i: number, value: string) => setOptions((o) => o.map((opt, idx) => (idx === i ? value : opt)));
  const removeOption = (i: number) => setOptions((o) => o.filter((_, idx) => idx !== i));

  const canCreate = question.trim().length > 2 && options.filter((o) => o.trim()).length >= 2;

  const submitPoll = async () => {
    if (!canCreate) return;
    const closesAt = new Date(Date.now() + Number(daysOpen || "7") * 86_400_000).toISOString();
    try {
      await createPoll.mutateAsync({ question: question.trim(), options: options.map((o) => o.trim()).filter(Boolean), closesAt });
      resetForm();
      setCreating(false);
    } catch (err) {
      Alert.alert("Couldn't create poll", err instanceof ApiError ? err.message.replace(/^"|"$/g, "") : "Something went wrong");
    }
  };

  const confirmClose = (pollId: string, question: string) => {
    Alert.alert(`Close "${question}"?`, "Voting will stop immediately. Results stay visible to everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close poll",
        style: "destructive",
        onPress: async () => {
          try {
            await closePoll.mutateAsync(pollId);
          } catch (err) {
            Alert.alert("Couldn't close poll", err instanceof ApiError ? err.message.replace(/^"|"$/g, "") : "Something went wrong");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Feather name="arrow-left" size={22} color={colors.ink700} />
          </Pressable>
          <Text className="font-display text-xl text-ink900">Community polls</Text>
        </View>
        {isAdmin ? (
          <Pressable
            onPress={() => setCreating(true)}
            accessibilityRole="button"
            accessibilityLabel="Create poll"
            className="w-10 h-10 rounded-full bg-ember500 items-center justify-center"
          >
            <Feather name="plus" size={18} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <LoadingState label="Loading polls…" />
      ) : polls.length === 0 ? (
        <EmptyState icon="bar-chart-2" title="No polls right now" subtitle="Community polls will show up here when the admin creates one." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {polls.map((p) => {
          const closed = p.status === "closed" || new Date(p.closesAt).getTime() <= Date.now();
          const daysLeft = Math.max(0, Math.ceil((new Date(p.closesAt).getTime() - Date.now()) / 86_400_000));
          return (
            <Card key={p.id} className="mb-4">
              <View className="flex-row items-start justify-between mb-3">
                <Text className="font-body-semibold text-ink800 text-base flex-1 pr-2">{p.question}</Text>
                {closed ? (
                  <View className="bg-ink50 px-2.5 py-1 rounded-full">
                    <Text className="text-ink400 text-[10px] font-body-semibold">CLOSED</Text>
                  </View>
                ) : null}
              </View>
              {p.options.map((o) => {
                const pct = p.totalVotes ? Math.round((o.votes / p.totalVotes) * 100) : 0;
                const isMine = p.myVote === o.id;
                return (
                  <Pressable
                    key={o.id}
                    disabled={!!p.myVote || closed}
                    onPress={() => votePoll.mutate({ pollId: p.id, optionId: o.id })}
                    accessibilityRole="button"
                    accessibilityLabel={p.myVote ? `${o.label}, ${pct}% of votes` : `Vote for ${o.label}`}
                    accessibilityState={{ selected: isMine, disabled: !!p.myVote || closed }}
                    className={`mb-2.5 rounded-xl border overflow-hidden ${
                      isMine ? "border-ember500" : "border-ink100"
                    }`}
                  >
                    <View className="relative px-3.5 py-3">
                      {p.myVote || closed ? (
                        <View
                          style={{ width: `${pct}%` }}
                          className={`absolute left-0 top-0 bottom-0 ${isMine ? "bg-ember50" : "bg-ink50"}`}
                        />
                      ) : null}
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          {isMine ? <Feather name="check-circle" size={14} color={colors.ember600} /> : null}
                          <Text className={`font-body-medium text-sm ${isMine ? "text-ember700" : "text-ink700"}`}>
                            {o.label}
                          </Text>
                        </View>
                        {p.myVote || closed ? (
                          <Text className="text-ink400 text-xs font-body-semibold">{pct}%</Text>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-ink300 text-xs">{p.totalVotes} votes</Text>
                <Text className="text-ink300 text-xs">
                  {closed ? "Closed" : `Closes in ${daysLeft}d`}
                </Text>
              </View>
              {isAdmin && !closed ? (
                <Pressable
                  onPress={() => confirmClose(p.id, p.question)}
                  accessibilityRole="button"
                  accessibilityLabel="Close this poll"
                  className="mt-3 self-start"
                >
                  <Text className="text-rust500 font-body-semibold text-xs">Close poll now</Text>
                </Pressable>
              ) : null}
            </Card>
          );
        })}
        </ScrollView>
      )}

      <Modal visible={creating} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreating(false)}>
        <SafeAreaView className="flex-1 bg-cream">
          <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
            <Text className="font-display text-xl text-ink900">Create poll</Text>
            <Pressable onPress={() => setCreating(false)} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={colors.ink700} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text className="text-ink500 font-body-medium text-sm mb-2">Question</Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="e.g. Should we organize a Diwali event?"
              placeholderTextColor={colors.ink300}
              multiline
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
            />

            <Text className="text-ink500 font-body-medium text-sm mb-2">Options</Text>
            {options.map((opt, i) => (
              <View key={i} className="flex-row items-center gap-2 mb-2.5">
                <TextInput
                  value={opt}
                  onChangeText={(v) => updateOption(i, v)}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={colors.ink300}
                  className="flex-1 bg-paper border border-ink100 rounded-2xl px-4 py-3 text-ink800 font-body"
                />
                {options.length > 2 ? (
                  <Pressable onPress={() => removeOption(i)} accessibilityRole="button" accessibilityLabel={`Remove option ${i + 1}`} hitSlop={8}>
                    <Feather name="x-circle" size={18} color={colors.ink300} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Pressable onPress={addOption} accessibilityRole="button" accessibilityLabel="Add another option" className="flex-row items-center gap-1.5 mb-6 mt-1">
              <Feather name="plus-circle" size={14} color={colors.ember600} />
              <Text className="text-ember600 font-body-semibold text-sm">Add option</Text>
            </Pressable>

            <Text className="text-ink500 font-body-medium text-sm mb-2">Open for (days)</Text>
            <TextInput
              value={daysOpen}
              onChangeText={setDaysOpen}
              keyboardType="number-pad"
              placeholderTextColor={colors.ink300}
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-6"
            />

            <Button label="Publish poll" fullWidth size="lg" disabled={!canCreate || createPoll.isPending} loading={createPoll.isPending} onPress={submitPoll} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}