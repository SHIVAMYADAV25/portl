import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { usePolls, useVotePoll } from "@/hooks/usePolls";

export default function Polls() {
  const { data: polls = [], isLoading } = usePolls();
  const votePoll = useVotePoll();

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color={colors.ink700} />
        </Pressable>
        <Text className="font-display text-xl text-ink900">Community polls</Text>
      </View>

      {isLoading ? (
        <LoadingState label="Loading polls…" />
      ) : polls.length === 0 ? (
        <EmptyState icon="bar-chart-2" title="No polls right now" subtitle="Community polls will show up here when the admin creates one." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {polls.map((p) => {
          const daysLeft = Math.max(0, Math.ceil((new Date(p.closesAt).getTime() - Date.now()) / 86_400_000));
          return (
            <Card key={p.id} className="mb-4">
              <Text className="font-body-semibold text-ink800 text-base mb-3">{p.question}</Text>
              {p.options.map((o) => {
                const pct = p.totalVotes ? Math.round((o.votes / p.totalVotes) * 100) : 0;
                const isMine = p.myVote === o.id;
                return (
                  <Pressable
                    key={o.id}
                    disabled={!!p.myVote}
                    onPress={() => votePoll.mutate({ pollId: p.id, optionId: o.id })}
                    accessibilityRole="button"
                    accessibilityLabel={p.myVote ? `${o.label}, ${pct}% of votes` : `Vote for ${o.label}`}
                    accessibilityState={{ selected: isMine, disabled: !!p.myVote }}
                    className={`mb-2.5 rounded-xl border overflow-hidden ${
                      isMine ? "border-ember500" : "border-ink100"
                    }`}
                  >
                    <View className="relative px-3.5 py-3">
                      {p.myVote ? (
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
                        {p.myVote ? (
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
                  {daysLeft > 0 ? `Closes in ${daysLeft}d` : "Closed"}
                </Text>
              </View>
            </Card>
          );
        })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
