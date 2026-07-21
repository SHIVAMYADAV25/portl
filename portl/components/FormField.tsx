import { View, Text, TextInput, TextInputProps } from "react-native";
import { colors } from "@/constants/theme";

export function FormField({ label, error, ...rest }: TextInputProps & { label: string; error?: string }) {
  return (
    <View className="mb-5">
      <Text className="text-ink500 font-body-medium text-sm mb-2">{label}</Text>
      <View className={`bg-paper border rounded-2xl px-4 h-14 justify-center ${error ? "border-rust500" : "border-ink100"}`}>
        <TextInput placeholderTextColor={colors.ink300} className="text-ink800 font-body-medium text-base" {...rest} />
      </View>
      {error ? <Text className="text-rust500 text-sm mt-2 font-body-medium">{error}</Text> : null}
    </View>
  );
}