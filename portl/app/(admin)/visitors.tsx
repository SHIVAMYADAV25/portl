import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/Badge";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useAdminVisitorOverview, useAdminVisitorSearch } from "@/hooks/useVisitors";

type SearchField = "name" | "phone" | "vehicle" | "date";

export default function AdminVisitors() {
  const { data: overview, isLoading: overviewLoading } = useAdminVisitorOverview();

  const [field, setField] = useState<SearchField>("name");
  const [query, setQuery] = useState("");
  const filters = { [field]: query } as Record<SearchField, string>;
  const { data: results = [], isLoading: searchLoading, isFetching } = useAdminVisitorSearch(filters);

  const kpis = [
    { label: "Visitors today", value: overview?.visitorsToday ?? "—", icon: "user-check" as const, color: colors.teal500 },
    { label: "Currently inside", value: overview?.visitorsInside ?? "—", icon: "log-in" as const, color: colors.moss500 },
    { label: "Pending requests", value: overview?.pendingRequests ?? "—", icon: "clock" as const, color: colors.gold500 },
    { label: "Rejected today", value: overview?.rejectedToday ?? "—", icon: "x-circle" as const, color: colors.rust500 },
  ];

  const fieldOptions: { id: SearchField; label: string; placeholder: string }[] = [
    { id: "name", label: "Name", placeholder: "Search by visitor name" },
    { id: "phone", label: "Phone", placeholder: "Search by phone number" },
    { id: "vehicle", label: "Vehicle", placeholder: "Search by vehicle number" },
    { id: "date", label: "Date", placeholder: "YYYY-MM-DD" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-5 pt-3 pb-2">
        <Text className="font-display text-2xl text-ink900 mb-1">Visitors</Text>
        <Text className="text-ink400 text-sm">The guard manages entries — you monitor the system</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {overviewLoading ? (
          <LoadingState label="Loading overview…" />
        ) : (
          <View className="px-5 flex-row flex-wrap gap-3 mb-6">
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
        )}

        <View className="px-5">
          <Text className="font-display-medium text-lg text-ink800 mb-3">Search visitor history</Text>

          <View className="flex-row gap-2 mb-3">
            {fieldOptions.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => {
                  setField(f.id);
                  setQuery("");
                }}
                accessibilityRole="button"
                accessibilityLabel={`Search by ${f.label}`}
                accessibilityState={{ selected: field === f.id }}
                className={`px-3.5 py-2 rounded-full ${field === f.id ? "bg-ink800" : "bg-paper border border-ink100"}`}
              >
                <Text className={`text-xs font-body-medium ${field === f.id ? "text-white" : "text-ink600"}`}>{f.label}</Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-row items-center bg-paper border border-ink100 rounded-2xl px-4 mb-4">
            <Feather name="search" size={16} color={colors.ink300} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={fieldOptions.find((f) => f.id === field)?.placeholder}
              placeholderTextColor={colors.ink300}
              autoCapitalize={field === "vehicle" ? "characters" : "none"}
              className="flex-1 text-ink800 font-body py-3.5 ml-2"
            />
            {isFetching && query ? <Feather name="loader" size={14} color={colors.ink300} /> : null}
          </View>

          {!query.trim() ? (
            <Text className="text-ink300 text-xs px-1">
              Search by name, phone, vehicle, or date to look up a specific visitor — full history isn't browsable here by design.
            </Text>
          ) : searchLoading ? (
            <LoadingState label="Searching…" />
          ) : results.length === 0 ? (
            <EmptyState icon="search" title="No matches" subtitle="Try a different name, phone, vehicle number, or date." />
          ) : (
            results.map((v) => (
              <Card key={v.id} className="mb-2.5">
                <View className="flex-row items-start justify-between mb-1.5">
                  <View className="flex-1 pr-2">
                    <Text className="font-body-semibold text-ink800 text-sm">{v.name}</Text>
                    <Text className="text-ink400 text-xs mt-0.5">
                      {v.flatLabel} · {v.category}
                      {v.vehicleNumber ? ` · ${v.vehicleNumber}` : ""}
                      {v.phone ? ` · ${v.phone}` : ""}
                    </Text>
                  </View>
                  <StatusBadge status={v.status} />
                </View>
                <Text className="text-ink300 text-xs">{new Date(v.requestedAt).toLocaleString()}</Text>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}