import { View, Text, Pressable, ViewProps } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

export function Card({ children, className = "", ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-paper rounded-xl2 p-4 border border-ink100 ${className}`}
      style={{
        shadowColor: "#251F1A",
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
      }}
      {...rest}
    >
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between mb-3 px-1">
      <Text className="font-display-medium text-lg text-ink800">{title}</Text>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          className="flex-row items-center gap-1"
        >
          <Text className="text-ember600 font-body-semibold text-sm">{actionLabel}</Text>
          <Feather name="chevron-right" size={16} color={colors.ember600} />
        </Pressable>
      ) : null}
    </View>
  );
}
