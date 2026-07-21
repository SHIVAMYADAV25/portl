import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { Avatar, EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useStaffDirectory } from "@/hooks/useStaff";

export default function StaffDirectory() {
  const { data: staffDirectory = [], isLoading } = useStaffDirectory();

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color={colors.ink700} />
        </Pressable>
        <Text className="font-display text-xl text-ink900">Staff & services</Text>
      </View>

      {isLoading ? (
        <LoadingState label="Loading directory…" />
      ) : staffDirectory.length === 0 ? (
        <EmptyState icon="users" title="No staff listed yet" subtitle="Society staff and service providers will show up here." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {staffDirectory.map((s) => (
            <Card key={s.id} className="mb-3 flex-row items-center">
              <Avatar name={s.name} size={46} uri={s.photoUrl} />
              <View className="flex-1 ml-3">
                <Text className="font-body-semibold text-ink800">{s.name}</Text>
                <Text className="text-ink400 text-xs mt-0.5">{s.role}</Text>
                {s.rating ? (
                  <View className="flex-row items-center gap-1 mt-1">
                    <Feather name="star" size={11} color={colors.gold500} />
                    <Text className="text-ink400 text-xs">{s.rating.toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={() => Linking.openURL(`tel:${s.phone}`)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${s.name}`}
                className="w-10 h-10 rounded-full bg-moss50 items-center justify-center"
              >
                <Feather name="phone" size={16} color={colors.moss500} />
              </Pressable>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
