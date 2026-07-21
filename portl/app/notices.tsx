import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useNotices } from "@/hooks/useNotices";

const categoryStyle: Record<string, { chip: string; text: string }> = {
  Maintenance: { chip: "bg-gold50", text: "text-gold500" },
  Event: { chip: "bg-teal50", text: "text-teal500" },
  Alert: { chip: "bg-rust50", text: "text-rust500" },
  General: { chip: "bg-ember50", text: "text-ember600" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Notices() {
  const { data: notices = [], isLoading } = useNotices();

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color={colors.ink700} />
        </Pressable>
        <Text className="font-display text-xl text-ink900">Notices</Text>
      </View>

      {isLoading ? (
        <LoadingState label="Loading notices…" />
      ) : notices.length === 0 ? (
        <EmptyState icon="bell" title="No notices yet" subtitle="Society announcements will show up here." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {notices.map((n) => (
            <Card key={n.id} className="mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <View className={`${categoryStyle[n.category].chip} px-2.5 py-1 rounded-full`}>
                  <Text className={`${categoryStyle[n.category].text} text-[10px] font-body-bold`}>
                    {n.category.toUpperCase()}
                  </Text>
                </View>
                {n.pinned ? <Feather name="bookmark" size={14} color={colors.ember500} /> : null}
              </View>
              <Text className="font-body-semibold text-ink800 text-[15px] mb-1.5">{n.title}</Text>
              <Text className="text-ink500 text-sm leading-5 mb-3">{n.body}</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-ink300 text-xs">{n.createdBy} · {timeAgo(n.createdAt)}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Listen to notice: ${n.title}`} className="flex-row items-center gap-1">
                  <Feather name="volume-2" size={13} color={colors.ink400} />
                  <Text className="text-ink400 text-xs font-body-medium">Listen</Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
