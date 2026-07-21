import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

export default function CreateSociety() {
  const bootstrapSociety = useAuthStore((s) => s.bootstrapSociety);
  const [societyName, setSocietyName] = useState("");
  const [address, setAddress] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    societyName.trim().length > 1 &&
    adminName.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(adminEmail) &&
    adminPhone.trim().length >= 10 &&
    password.length >= 6 &&
    password === confirmPassword;

  const submit = async () => {
    if (!canSubmit || loading) return;
    setError(null);
    setLoading(true);
    const result = await bootstrapSociety({
      societyName: societyName.trim(),
      address: address.trim() || undefined,
      adminName: adminName.trim(),
      adminEmail: adminEmail.trim().toLowerCase(),
      adminPhone: adminPhone.trim(),
      password,
    });
    setLoading(false);
    if (!result.ok) setError(result.error ?? "Something went wrong");
    // RootLayout's useProtectedRoute redirects to (admin) automatically on success.
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
      <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
        <View className="px-6 pt-4">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Feather name="arrow-left" size={24} color={colors.ink700} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="px-6 pt-6 flex-1">
            <Text className="font-display text-3xl text-ink900">Set up your society</Text>
            <Text className="text-ink400 font-body mt-2 mb-6">
              You'll be the first admin — invite residents, guards and more right after this.
            </Text>

            <Text className="text-ink400 font-body-semibold text-xs uppercase tracking-wide mb-3">Society details</Text>
            <FormField label="Society name" value={societyName} onChangeText={setSocietyName} placeholder="Green Valley Society" />
            <FormField label="Address (optional)" value={address} onChangeText={setAddress} placeholder="Sector 12, Gurugram" />

            <Text className="text-ink400 font-body-semibold text-xs uppercase tracking-wide mb-3 mt-2">Your admin account</Text>
            <FormField label="Full name" value={adminName} onChangeText={setAdminName} placeholder="Your name" />
            <FormField
              label="Email address"
              value={adminEmail}
              onChangeText={setAdminEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FormField label="Phone number" value={adminPhone} onChangeText={setAdminPhone} placeholder="98765 43210" keyboardType="phone-pad" />
            <FormField label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry autoCapitalize="none" />
            <FormField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              secureTextEntry
              autoCapitalize="none"
              error={confirmPassword.length > 0 && confirmPassword !== password ? "Passwords don't match" : undefined}
            />

            {error ? <Text className="text-rust500 text-sm mb-4 font-body-medium">{error}</Text> : null}

            <View className="flex-1" />
            <Button label="Create society & continue" fullWidth size="lg" loading={loading} disabled={!canSubmit || loading} onPress={submit} />
            <View className="h-8" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}