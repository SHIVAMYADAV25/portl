import { useEffect, useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { LoadingState, EmptyState } from "@/components/Misc";
import { useAuthStore } from "@/store/authStore";

type Preview = { name: string; email: string; role: string; societyName: string };
const roleLabel: Record<string, string> = { resident: "Resident", guard: "Security Guard", admin: "Society Admin" };

export default function Activate() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const fetchInvitation = useAuthStore((s) => s.fetchInvitation);
  const activateInvitation = useAuthStore((s) => s.activateInvitation);

  const [loadingPreview, setLoadingPreview] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchInvitation(token).then((result) => {
      setLoadingPreview(false);
      if (result.ok) setPreview(result);
      else setPreviewError(result.error);
    });
  }, [token]);

  const canSubmit = password.length >= 6 && password === confirmPassword;

  const submit = async () => {
    if (!canSubmit || submitting || !token) return;
    setFormError(null);
    setSubmitting(true);
    const result = await activateInvitation(token, password);
    setSubmitting(false);
    if (!result.ok) setFormError(result.error ?? "Something went wrong");
    // RootLayout's useProtectedRoute redirects to the right role dashboard automatically.
  };

  if (loadingPreview) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center">
        <LoadingState label="Checking your invitation…" />
      </SafeAreaView>
    );
  }

  if (previewError || !preview) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center px-6">
        <EmptyState icon="alert-triangle" title="This invitation isn't valid" subtitle={previewError ?? "Ask your society admin to send you a new invite."} />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
      <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="px-6 pt-10 flex-1">
            <Text className="font-display text-3xl text-ink900">Welcome, {preview.name.split(" ")[0]}</Text>
            <Text className="text-ink400 font-body mt-2">
              You've been invited as a{" "}
              <Text className="text-ember600 font-body-semibold">{roleLabel[preview.role] ?? preview.role}</Text> for{" "}
              <Text className="text-ink700 font-body-semibold">{preview.societyName}</Text>.
            </Text>
            <Text className="text-ink300 text-sm mt-1">{preview.email}</Text>

            <View className="mt-8">
              <FormField label="Create a password" value={password} onChangeText={(v) => { setPassword(v); setFormError(null); }} secureTextEntry autoCapitalize="none" placeholder="At least 6 characters" />
              <FormField
                label="Confirm password"
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setFormError(null); }}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Re-enter password"
                error={formError ?? undefined}
              />
            </View>

            <View className="flex-1" />
            <Button label="Activate account" fullWidth size="lg" loading={submitting} disabled={!canSubmit || submitting} onPress={submit} />
            <View className="h-8" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}