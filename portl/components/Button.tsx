import { Pressable, Text, ActivityIndicator, PressableProps } from "react-native";
import * as Haptics from "expo-haptics";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-ember500 active:bg-ember600",
  secondary: "bg-ink800 active:bg-ink900",
  outline: "bg-transparent border border-ink200 active:bg-ink50",
  danger: "bg-rust500 active:bg-rust600",
  ghost: "bg-transparent active:bg-ink50",
};

const textVariantClasses: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-white",
  outline: "text-ink700",
  danger: "text-white",
  ghost: "text-ink700",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-2 rounded-xl",
  md: "px-5 py-3.5 rounded-2xl",
  lg: "px-6 py-4 rounded-2xl",
};

const textSizeClasses: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-base",
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading,
  icon,
  fullWidth,
  disabled,
  onPress,
  ...rest
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      className={`flex-row items-center justify-center gap-2 ${variantClasses[variant]} ${sizeClasses[size]} ${
        fullWidth ? "w-full" : ""
      } ${disabled ? "opacity-40" : ""}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" || variant === "ghost" ? "#362E27" : "#fff"} />
      ) : (
        <>
          {icon}
          <Text className={`font-body-semibold ${textSizeClasses[size]} ${textVariantClasses[variant]}`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
