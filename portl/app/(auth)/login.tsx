import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (loading || !email || !password) return;
    setError(null);
    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }
    // RootLayout's useProtectedRoute redirects to the right role dashboard automatically —
    // the frontend never asks which role the person is; the backend already knows.
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
      <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
        <View className="px-6 pt-4">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Feather name="arrow-left" size={24} color={colors.ink700} />
          </Pressable>
        </View>

        <View className="px-6 pt-8 flex-1">
          <Text className="font-display text-3xl text-ink900">Sign in</Text>
          <Text className="text-ink400 font-body mt-2">Use the email your admin invited you with.</Text>

          <View className="mt-8">
            <FormField
              label="Email address"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@email.com"
            />
            <FormField
              label="Password"
              value={password}
              onChangeText={(v) => { setPassword(v); setError(null); }}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Your password"
              error={error ?? undefined}
            />
          </View>

          <View className="flex-1" />

          <Button label="Sign in" fullWidth size="lg" loading={loading} disabled={!email || !password || loading} onPress={submit} />
          <View className="h-8" />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}