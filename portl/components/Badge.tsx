import { View, Text } from "react-native";
import { statusColor } from "@/constants/theme";

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusColor[status] ?? { bg: "#EDE9E5", text: "#362E27", label: status };
  return (
    <View style={{ backgroundColor: cfg.bg }} className="px-2.5 py-1 rounded-full self-start">
      <Text style={{ color: cfg.text }} className="text-xs font-body-semibold">
        {cfg.label}
      </Text>
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Text
      onPress={onPress}
      className={`px-3.5 py-2 rounded-full text-sm font-body-medium overflow-hidden ${
        active ? "bg-ink800 text-white" : "bg-ink50 text-ink600"
      }`}
    >
      {label}
    </Text>
  );
}
