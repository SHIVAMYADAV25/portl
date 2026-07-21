import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/Badge";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useVisitors } from "@/hooks/useVisitors";

export default function History() {
  const [query, setQuery] = useState("");
  const { data: visitors = [], isLoading } = useVisitors();

  const filtered = visitors.filter(
    (v) =>
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.flatLabel.toLowerCase().includes(query.toLowerCase()) ||
      (v.company ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-5 pt-3 pb-2">
        <Text className="font-display text-2xl text-ink900 mb-3">Entry & exit log</Text>
        <View className="flex-row items-center bg-paper border border-ink100 rounded-2xl px-4 h-12">
          <Feather name="search" size={16} color={colors.ink300} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or flat"
            placeholderTextColor={colors.ink300}
            className="flex-1 ml-2.5 text-ink800 font-body"
          />
        </View>
      </View>

      {isLoading ? (
        <LoadingState label="Loading log…" />
      ) : filtered.length === 0 ? (
        query ? (
          <EmptyState icon="search" title="No matches" subtitle="Try a different name or flat number." />
        ) : (
          <EmptyState icon="clock" title="No visitor activity yet" subtitle="Entries and exits you log will show up here." />
        )
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
          {filtered.map((v) => (
            <Card key={v.id} className="mb-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="font-body-semibold text-ink800">{v.name}</Text>
                <StatusBadge status={v.status} />
              </View>
              <Text className="text-ink400 text-xs mb-1">
                {v.company ?? v.purpose} · For {v.flatLabel}, {v.towerName}
              </Text>
              <Text className="text-ink300 text-xs">
                {new Date(v.requestedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </Text>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
