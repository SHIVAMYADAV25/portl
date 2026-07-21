import { View, Text, Image, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

export function EmptyState({
  icon = "inbox",
  title,
  subtitle,
}: {
  icon?: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="items-center justify-center py-14 px-6">
      <View className="w-16 h-16 rounded-full bg-ember50 items-center justify-center mb-4">
        <Feather name={icon} size={26} color={colors.ember500} />
      </View>
      <Text className="font-body-semibold text-ink700 text-base mb-1 text-center">{title}</Text>
      {subtitle ? <Text className="text-ink400 text-sm text-center">{subtitle}</Text> : null}
    </View>
  );
}

/** First-load spinner, shown while a screen's initial query has no cached data yet. Use as:
 *  `!hasData && isLoading ? <LoadingState /> : hasData ? <EmptyState .../> : <ActualContent />`
 *  so a slow network shows a spinner instead of a blank screen that looks identical to "empty". */
export function LoadingState({ label }: { label?: string }) {
  return (
    <View className="items-center justify-center py-14 px-6">
      <ActivityIndicator size="small" color={colors.ember500} />
      {label ? <Text className="text-ink400 text-sm mt-3 text-center">{label}</Text> : null}
    </View>
  );
}

export function Avatar({ name, size = 40, uri }: { name: string; size?: number; uri?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-ember100 items-center justify-center"
    >
      <Text style={{ fontSize: size * 0.38 }} className="text-ember700 font-body-bold">
        {initials}
      </Text>
    </View>
  );
}
